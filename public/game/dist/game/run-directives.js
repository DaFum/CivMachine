function nextRandom(state) {
    let next = state >>> 0 || 0x6d2b79f5;
    next ^= next << 13;
    next ^= next >>> 17;
    next ^= next << 5;
    next >>>= 0;
    return { state: next, value: next / 4294967296 };
}
/**
 * Placeholder docstring for buildDirectiveOffers.
 */
export function buildDirectiveOffers(knownIds, seed, count = 3) {
    const pool = [...new Set(knownIds.map(String))].sort();
    let state = seed >>> 0 || 0x52434531;
    for (let index = pool.length - 1; index > 0; index--) {
        const roll = nextRandom(state);
        state = roll.state;
        const swapIndex = Math.floor(roll.value * (index + 1));
        [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
    }
    return pool.slice(0, Math.max(0, Math.min(pool.length, Math.trunc(count))));
}
export const DIRECTIVE_OBJECTIVES = {
    accelerated_development: {
        id: 'objective_accelerated_development',
        directiveId: 'accelerated_development',
        title: 'Compressed Maturity',
        description: 'Reach Development 260 before harvest.',
        isComplete: civ => civ.development >= 260,
    },
    cognitive_extraction: {
        id: 'objective_cognitive_extraction',
        directiveId: 'cognitive_extraction',
        title: 'Lucid Yield',
        description: 'Reach Awareness 45 while keeping Sanity at 45 or higher.',
        isComplete: civ => civ.stats.awareness >= 45 && civ.stats.sanity >= 45,
    },
    stable_cultivation: {
        id: 'objective_stable_cultivation',
        directiveId: 'stable_cultivation',
        title: 'Untorn Harvest',
        description: 'Harvest with at least 75 Stability and less than 75 Entropy.',
        isComplete: civ => civ.stats.stability >= 75 && civ.tactical.entropy < 75,
    },
    paradox_prospecting: {
        id: 'objective_paradox_prospecting',
        directiveId: 'paradox_prospecting',
        title: 'Productive Contradiction',
        description: 'Reach 50 Entropy while keeping Stability above zero.',
        isComplete: civ => civ.tactical.entropy >= 50 && civ.stats.stability > 0,
    },
    quiet_machine: {
        id: 'objective_quiet_machine',
        directiveId: 'quiet_machine',
        title: 'Unobserved Transcendence',
        description: 'Reach Transcendence below 45 Awareness and 45 Cosmic Attention.',
        isComplete: civ => civ.era >= 2 && civ.stats.awareness < 45 && civ.stats.attention < 45,
    },
    temporal_pressure: {
        id: 'objective_temporal_pressure',
        directiveId: 'temporal_pressure',
        title: 'Deadline Civilization',
        description: 'Reach Transcendence within 300 seconds after resolving at least eight interventions.',
        isComplete: civ => civ.era >= 2 && civ.elapsedSeconds <= 300 && civ.eventChoices >= 8,
    },
};
/**
 * Placeholder docstring for objectiveForDirective.
 */
export function objectiveForDirective(directiveId) {
    return DIRECTIVE_OBJECTIVES[directiveId] ?? null;
}
/**
 * Placeholder docstring for evaluateDirectiveObjective.
 */
export function evaluateDirectiveObjective(civ) {
    const objective = objectiveForDirective(civ.directiveId);
    return Boolean(objective?.isComplete(civ));
}
//# sourceMappingURL=run-directives.js.map