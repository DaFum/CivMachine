import { RESOURCE_KEYS } from './rules.js';
import type { Civilization, HarvestGrade, ResourceKey } from './types.js';

export interface HarvestQuality {
  grade: HarvestGrade;
  multiplier: number;
  credits: number;
  depth: number;
}

export interface HarvestApplication {
  rewards: Record<ResourceKey, number>;
  rewardMultiplier: number;
}

export const HARVEST_GRADE_LABELS: Readonly<Record<HarvestGrade, string>> = {
  premature: 'Premature',
  established: 'Established',
  transcendent: 'Transcendent',
  ascendant: 'Ascendant',
  singular: 'Singular',
};

export const DEPTH_DEVELOPMENT_SCALE = 80;
export const DEPTH_ENDGAME_BONUS = 1.5;
export const DEPTH_CREDIT_RATE = 0.6;
export const DEPTH_CREDIT_CAP = 20;
export const DEPTH_YIELD_BASE = 0.25;
export const DEPTH_YIELD_RATE = 0.22;
export const PREMATURE_MULTIPLIER = 0.2;
export const CHAOTIC_CREDIT_RETENTION = 0.6;

export const DEPTH_BANDS: ReadonlyArray<{ grade: HarvestGrade; minDepth: number }> = [
  { grade: 'premature', minDepth: 0 },
  { grade: 'established', minDepth: 1.5 },
  { grade: 'transcendent', minDepth: 4 },
  { grade: 'ascendant', minDepth: 9 },
  { grade: 'singular', minDepth: 16 },
];

export function endgameStatesReached(civ: Civilization): number {
  const states = civ.pathState?.endgameStates;
  if (Array.isArray(states)) return states.length;
  return civ.pathState?.endgameState ? 1 : 0;
}

export function cultivationDepth(civ: Civilization): number {
  return Math.max(0, civ.development) / DEPTH_DEVELOPMENT_SCALE + DEPTH_ENDGAME_BONUS * endgameStatesReached(civ);
}

export function depthBand(depth: number): HarvestGrade {
  let grade: HarvestGrade = 'premature';
  for (const band of DEPTH_BANDS) if (depth >= band.minDepth) grade = band.grade;
  return grade;
}

export function evaluateHarvestQuality(civ: Civilization, _chaotic = false): HarvestQuality {
  const depth = cultivationDepth(civ);
  const grade = civ.eventChoices < 3 || civ.era <= 0 ? 'premature' : depthBand(depth);
  if (grade === 'premature') return { grade, multiplier: PREMATURE_MULTIPLIER, credits: 0, depth };
  return {
    grade,
    multiplier: DEPTH_YIELD_BASE + DEPTH_YIELD_RATE * depth,
    credits: Math.min(DEPTH_CREDIT_CAP, Math.floor(DEPTH_CREDIT_RATE * depth)),
    depth,
  };
}

export function calculateCultivationCredits(
  quality: HarvestQuality,
  chaotic = false,
  objectiveCompleted = false,
): number {
  if (quality.grade === 'premature') return 0;
  const base = quality.credits + (objectiveCompleted ? 1 : 0);
  // Rounded, not floored. The v1.5.0 design asked for a loss "proportional to what was at stake",
  // but flooring is harshest exactly where the stakes are smallest: 3 credits became 1, a 67% cut,
  // while 14 became 8, a 43% cut. Rounding makes the 60% retention mean 60% at every scale.
  return Math.max(0, chaotic ? Math.round(base * CHAOTIC_CREDIT_RETENTION) : base);
}

export type HarvestUrgency = 'building' | 'closing' | 'harvest' | 'cascading' | 'capped';

export interface HarvestUrgencyInput {
  depth: number;
  credits: number;
  developmentRate: number;
  secondsToCascade: number;
  entropy: number;
  entropyRate: number;
  stability: number;
  controlCapacity: number;
  ventEntropyRelief: number;
  ventStabilityCost: number;
  premature: boolean;
}

export interface HarvestUrgencyView {
  state: HarvestUrgency;
  secondsToNextCredit: number;
  secondsOfRunLeft: number;
  nextCredit: number;
}

/**
 * How long the run can actually last, as opposed to how long it lasts if the player stops playing.
 * `secondsToCascade` is documented as a floor that "deliberately assumes no further player
 * intervention", which makes it useless as a horizon over the minutes a credit step takes: measured
 * in the browser, comparing against it called HARVEST NOW at 100 s on a run that went on to 276 s and
 * banked the credit anyway.
 *
 * Venting is what extends the run, and Stability is what pays for it, so the reachable horizon is the
 * cascade floor plus the time the affordable vents buy. That makes Stability the terminal constraint,
 * which is what it already is in practice.
 */
export function reachableRunSeconds(input: Pick<HarvestUrgencyInput,
  'secondsToCascade' | 'entropyRate' | 'stability' | 'controlCapacity' | 'ventEntropyRelief' | 'ventStabilityCost'>): number {
  const floor = Math.max(0, input.secondsToCascade);
  const rate = Math.max(0, input.entropyRate);
  const cost = Math.max(0, input.ventStabilityCost);
  const relief = Math.max(0, input.ventEntropyRelief);
  if (rate <= 0) return Number.POSITIVE_INFINITY;
  if (cost <= 0 || relief <= 0) return floor;
  const ventsAffordable = Math.min(input.controlCapacity, Math.max(0, Math.floor(Math.max(0, input.stability) / cost)));
  return floor + ventsAffordable * relief / rate;
}

/**
 * The stay-or-harvest call, computed instead of guessed. `secondsToCascade` already tells the player
 * how long the run has; what was missing is whether the next Cultivation Credit still fits inside
 * that window. Measured on the committed engine, a controlled harvest 11 seconds before the cascade
 * paid 3 credits and 1056 Causal Mass while the cascade itself paid 1 and 458 -- and nothing on
 * screen marked the difference.
 */
export function harvestUrgency(input: HarvestUrgencyInput): HarvestUrgencyView {
  const credits = Math.max(0, Math.trunc(input.credits));
  const nextCredit = Math.min(DEPTH_CREDIT_CAP, credits + 1);
  const capped = credits >= DEPTH_CREDIT_CAP;
  // The depth at which the credit step lands, inverted from credits = floor(rate * depth).
  const depthNeeded = nextCredit / DEPTH_CREDIT_RATE;
  const developmentNeeded = Math.max(0, (depthNeeded - input.depth) * DEPTH_DEVELOPMENT_SCALE);
  const rate = Math.max(0, input.developmentRate);
  const secondsToNextCredit = rate <= 0 ? Number.POSITIVE_INFINITY : developmentNeeded / rate;
  const secondsOfRunLeft = reachableRunSeconds(input);
  const view = { secondsToNextCredit, secondsOfRunLeft, nextCredit };
  if (input.entropy >= 100) return { state: 'cascading', ...view };
  if (capped) return { state: 'capped', ...view };
  // A premature run has nothing banked yet, so "harvest now" is never the answer -- it must first
  // clear the anti-cheese floor, whatever the clock says.
  if (input.premature) return { state: 'building', ...view };
  if (secondsToNextCredit > secondsOfRunLeft) return { state: 'harvest', ...view };
  if (secondsToNextCredit > secondsOfRunLeft * .7) return { state: 'closing', ...view };
  return { state: 'building', ...view };
}

export function applyHarvestQuality(
  rawRewards: Record<ResourceKey, number>,
  quality: HarvestQuality,
  options: { collapsed?: boolean; gradeRewardMult?: number; objectiveMultiplier?: number } = {},
): HarvestApplication {
  const rewardMultiplier = quality.multiplier
    * Math.max(0.1, options.gradeRewardMult ?? 1)
    * Math.max(1, options.objectiveMultiplier ?? 1);
  const rewards = {} as Record<ResourceKey, number>;
  for (const key of RESOURCE_KEYS) rewards[key] = Math.max(0, Math.round(rawRewards[key] * rewardMultiplier));
  if (options.collapsed && quality.grade === 'premature') rewards.causal_mass = Math.max(8, rewards.causal_mass);
  return { rewards, rewardMultiplier };
}

export const HARVEST_GRADE_ORDER: ReadonlyArray<HarvestGrade> = DEPTH_BANDS.map(band => band.grade);

export function gradeIndex(grade: HarvestGrade | ''): number {
  return grade ? HARVEST_GRADE_ORDER.indexOf(grade) : -1;
}
