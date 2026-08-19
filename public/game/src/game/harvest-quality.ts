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

/**
 * Placeholder docstring for endgameStatesReached.
 */
export function endgameStatesReached(civ: Civilization): number {
  const states = civ.pathState?.endgameStates;
  if (Array.isArray(states)) return states.length;
  return civ.pathState?.endgameState ? 1 : 0;
}

/**
 * Placeholder docstring for cultivationDepth.
 */
export function cultivationDepth(civ: Civilization): number {
  return Math.max(0, civ.development) / DEPTH_DEVELOPMENT_SCALE + DEPTH_ENDGAME_BONUS * endgameStatesReached(civ);
}

/**
 * Placeholder docstring for depthBand.
 */
export function depthBand(depth: number): HarvestGrade {
  let grade: HarvestGrade = 'premature';
  for (const band of DEPTH_BANDS) if (depth >= band.minDepth) grade = band.grade;
  return grade;
}

/**
 * Placeholder docstring for evaluateHarvestQuality.
 */
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

/**
 * Placeholder docstring for calculateCultivationCredits.
 */
export function calculateCultivationCredits(
  quality: HarvestQuality,
  chaotic = false,
  objectiveCompleted = false,
): number {
  if (quality.grade === 'premature') return 0;
  const base = quality.credits + (objectiveCompleted ? 1 : 0);
  return Math.max(0, chaotic ? Math.floor(base * CHAOTIC_CREDIT_RETENTION) : base);
}

/**
 * Placeholder docstring for applyHarvestQuality.
 */
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

/**
 * Placeholder docstring for gradeIndex.
 */
export function gradeIndex(grade: HarvestGrade | ''): number {
  return grade ? HARVEST_GRADE_ORDER.indexOf(grade) : -1;
}
