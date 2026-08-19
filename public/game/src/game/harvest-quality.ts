import { RESOURCE_KEYS } from './rules.js';
import type { Civilization, HarvestGrade, ResourceKey } from './types.js';

export interface HarvestQuality {
  grade: HarvestGrade;
  multiplier: number;
  credits: number;
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
};

export function evaluateHarvestQuality(civ: Civilization, _chaotic = false): HarvestQuality {
  if (civ.pathState.endgameState) return { grade: 'ascendant', multiplier: 1.2, credits: 4 };
  if (civ.eventChoices < 3 || civ.era <= 0) return { grade: 'premature', multiplier: 0.2, credits: 0 };
  if (civ.era === 1) return { grade: 'established', multiplier: 0.75, credits: 2 };
  return { grade: 'transcendent', multiplier: 1, credits: 3 };
}

export function calculateCultivationCredits(
  quality: HarvestQuality,
  chaotic = false,
  objectiveCompleted = false,
): number {
  if (quality.grade === 'premature') return 0;
  return Math.max(0, quality.credits + (objectiveCompleted ? 1 : 0) - (chaotic ? 1 : 0));
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
