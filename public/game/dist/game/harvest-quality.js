import { RESOURCE_KEYS } from './rules.js';
export const HARVEST_GRADE_LABELS = {
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
export const DEPTH_BANDS = [
    { grade: 'premature', minDepth: 0 },
    { grade: 'established', minDepth: 1.5 },
    { grade: 'transcendent', minDepth: 4 },
    { grade: 'ascendant', minDepth: 9 },
    { grade: 'singular', minDepth: 16 },
];
export function endgameStatesReached(civ) {
    const states = civ.pathState?.endgameStates;
    if (Array.isArray(states))
        return states.length;
    return civ.pathState?.endgameState ? 1 : 0;
}
export function cultivationDepth(civ) {
    return Math.max(0, civ.development) / DEPTH_DEVELOPMENT_SCALE + DEPTH_ENDGAME_BONUS * endgameStatesReached(civ);
}
export function depthBand(depth) {
    let grade = 'premature';
    for (const band of DEPTH_BANDS)
        if (depth >= band.minDepth)
            grade = band.grade;
    return grade;
}
export function evaluateHarvestQuality(civ, _chaotic = false) {
    const depth = cultivationDepth(civ);
    const grade = civ.eventChoices < 3 || civ.era <= 0 ? 'premature' : depthBand(depth);
    if (grade === 'premature')
        return { grade, multiplier: PREMATURE_MULTIPLIER, credits: 0, depth };
    return {
        grade,
        multiplier: DEPTH_YIELD_BASE + DEPTH_YIELD_RATE * depth,
        credits: Math.min(DEPTH_CREDIT_CAP, Math.floor(DEPTH_CREDIT_RATE * depth)),
        depth,
    };
}
export function calculateCultivationCredits(quality, chaotic = false, objectiveCompleted = false) {
    if (quality.grade === 'premature')
        return 0;
    const base = quality.credits + (objectiveCompleted ? 1 : 0);
    return Math.max(0, chaotic ? Math.floor(base * CHAOTIC_CREDIT_RETENTION) : base);
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