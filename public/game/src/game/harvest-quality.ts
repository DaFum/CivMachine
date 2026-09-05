import { RESOURCE_KEYS } from './rules.js';
import { VENT_STABILITY_COST } from './tactical-actions.js';
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
// Half a Universe, and not one credit more. The v1.19 cap of 20 sat above the 18 a Universe costs,
// so a single run that simply lasted long enough paid for a whole prestige -- measured at 20 credits
// from one 1697 s run on a fresh save. Capping below the requirement makes two successful runs the
// arithmetic floor for a Universe at every stage of the game, which is what the roguelite cadence
// was always specified to be.
export const DEPTH_CREDIT_CAP = 10;
export const DEPTH_YIELD_BASE = 0.25;
export const DEPTH_YIELD_RATE = 0.22;
/**
 * Where the yield multiplier stops paying full rate. Below the knee `depthYieldMultiplier` is the
 * v1.19 straight line to within a few percent; above it the curve is logarithmic.
 *
 * This is the single most load-bearing number in the rebalance. Raw harvest value already grows with
 * Development, and Development grows with run length, so multiplying it by a multiplier that also
 * grew linearly with Development made a run's worth quadratic in its own duration: the measured
 * second run of a fresh save banked 2480 Causal Mass and could buy 21 Machine levels at once. A
 * concave multiplier keeps a deep run clearly better than a shallow one without making it worth more
 * than the several shorter runs it displaces.
 */
export const DEPTH_YIELD_KNEE = 6;
export const PREMATURE_MULTIPLIER = 0.2;
export const CHAOTIC_CREDIT_RETENTION = 0.6;

/** The Depth that buys the n-th Cultivation Credit, inverted from `credits = floor(rate * depth)`. */
export function depthForCredit(credit: number): number {
  return Math.max(0, credit) / DEPTH_CREDIT_RATE;
}

/**
 * The reward multiplier a Harvest Grade is worth, as a concave function of Cultivation Depth.
 *
 * `log1p` is what makes the early game survive the rebalance untouched: for the Depth 1.7 to 3 an
 * opening run reaches, this is within 8% of the old straight line, so the published first-run economy
 * still holds. At Depth 33 -- reachable on run three of the old curve -- it pays 2.7x less.
 */
export function depthYieldMultiplier(depth: number): number {
  const safe = Math.max(0, Number(depth) || 0);
  return DEPTH_YIELD_BASE + DEPTH_YIELD_RATE * DEPTH_YIELD_KNEE * Math.log1p(safe / DEPTH_YIELD_KNEE);
}

/**
 * Grade boundaries sit exactly on Cultivation Credit steps, so a Grade change *is* an economic
 * event. Until v1.20 the two curves were independent and disagreed by design: a run 0.4 Depth from
 * TRANSCENDENT was still 1.4 Depth from its next Credit, which made the louder of the two signals the
 * less valuable one. Deriving the bands from `DEPTH_CREDIT_RATE` removes the disagreement at the
 * source rather than papering over it in the interface, and gives the top band a real meaning:
 * SINGULAR is exactly the Depth at which Credits cap.
 */
export const DEPTH_BANDS: ReadonlyArray<{ grade: HarvestGrade; minDepth: number; credits: number }> = [
  { grade: 'premature', minDepth: 0, credits: 0 },
  { grade: 'established', minDepth: depthForCredit(1), credits: 1 },
  { grade: 'transcendent', minDepth: depthForCredit(3), credits: 3 },
  { grade: 'ascendant', minDepth: depthForCredit(6), credits: 6 },
  { grade: 'singular', minDepth: depthForCredit(DEPTH_CREDIT_CAP), credits: DEPTH_CREDIT_CAP },
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

export function evaluateHarvestQuality(civ: Civilization): HarvestQuality {
  const depth = cultivationDepth(civ);
  const grade = civ.eventChoices < 3 || civ.era <= 0 ? 'premature' : depthBand(depth);
  if (grade === 'premature') return { grade, multiplier: PREMATURE_MULTIPLIER, credits: 0, depth };
  return {
    grade,
    multiplier: depthYieldMultiplier(depth),
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
  ventCostEscalation?: number;
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
  'secondsToCascade' | 'entropyRate' | 'stability' | 'controlCapacity' | 'ventEntropyRelief' | 'ventStabilityCost' | 'ventCostEscalation'>): number {
  const floor = Math.max(0, input.secondsToCascade);
  const rate = Math.max(0, input.entropyRate);
  const cost = Math.max(0, input.ventStabilityCost);
  const relief = Math.max(0, input.ventEntropyRelief);
  if (rate <= 0) return Number.POSITIVE_INFINITY;
  if (cost <= 0 || relief <= 0) return floor;
  // Vents get dearer as a run spends them, so the horizon has to walk the ladder rather than divide
  // by one price: `ventStabilityCost` is the price of the *next* vent, and `ventCostEscalation` is
  // what each one after it adds.
  const escalation = Math.max(0, input.ventCostEscalation ?? 0) * VENT_STABILITY_COST;
  let budget = Math.max(0, input.stability);
  let vents = 0;
  for (let next = cost; vents < input.controlCapacity && budget >= next; next += escalation) {
    budget -= next;
    vents++;
  }
  return floor + vents * relief / rate;
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
  const depthNeeded = depthForCredit(nextCredit);
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
