import { RESOURCE_KEYS } from './rules.js';
export const HARVEST_GRADE_LABELS = {
    premature: 'Premature',
    established: 'Established',
    transcendent: 'Transcendent',
    ascendant: 'Ascendant',
};
export function evaluateHarvestQuality(civ, _chaotic = false) {
    if (civ.pathState.endgameState)
        return { grade: 'ascendant', multiplier: 1.2, credits: 4 };
    if (civ.eventChoices < 3 || civ.era <= 0)
        return { grade: 'premature', multiplier: 0.2, credits: 0 };
    if (civ.era === 1)
        return { grade: 'established', multiplier: 0.75, credits: 2 };
    return { grade: 'transcendent', multiplier: 1, credits: 3 };
}
export function calculateCultivationCredits(quality, chaotic = false, objectiveCompleted = false) {
    if (quality.grade === 'premature')
        return 0;
    return Math.max(0, quality.credits + (objectiveCompleted ? 1 : 0) - (chaotic ? 1 : 0));
}
export function applyHarvestQuality(rawRewards, quality, options = {}) {
    const rewardMultiplier = quality.multiplier
        * Math.max(0.1, options.gradeRewardMult ?? 1)
        * Math.max(1, options.objectiveMultiplier ?? 1);
    const rewards = {};
    for (const key of RESOURCE_KEYS)
        rewards[key] = Math.max(0, Math.round(rawRewards[key] * rewardMultiplier));
    if (options.collapsed && quality.grade === 'premature')
        rewards.causal_mass = Math.max(8, rewards.causal_mass);
    return { rewards, rewardMultiplier };
}
//# sourceMappingURL=harvest-quality.js.map