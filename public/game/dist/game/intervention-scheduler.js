const PHASE_WEIGHTS = [
    { impulse: 1.5, reinforcement: 1.2, conflict: 0.75, consolidation: 0.5, endgame: 0.2 },
    { impulse: 0.75, reinforcement: 1, conflict: 1.4, consolidation: 1.25, endgame: 0.6 },
    { impulse: 0.5, reinforcement: 0.75, conflict: 1.1, consolidation: 1.35, endgame: 1.55 },
];
export function recentEventIds(civ) {
    if (!Array.isArray(civ.recentEventIds))
        civ.recentEventIds = [];
    return civ.recentEventIds;
}
export function recordRecentIntervention(civ, id) {
    const recent = recentEventIds(civ);
    const priorIndex = recent.indexOf(id);
    if (priorIndex >= 0)
        recent.splice(priorIndex, 1);
    recent.push(id);
    while (recent.length > 6)
        recent.shift();
}
function phaseMultiplier(event, civ) {
    if (!event.path_phase)
        return 1;
    return PHASE_WEIGHTS[Math.max(0, Math.min(2, civ.era))]?.[event.path_phase] ?? 1;
}
function buildPool(events, civ, options, excludeRecent) {
    const recent = new Set(recentEventIds(civ));
    const pool = [];
    for (const event of events) {
        if (excludeRecent && recent.has(event.id))
            continue;
        const base = Math.max(0.01, Number(event.weight ?? 1));
        const path = Math.max(0, options.pathMultiplier(event, civ));
        const state = Math.max(0, options.stateMultiplier(event, civ));
        if (path <= 0 || state <= 0)
            continue;
        const timesSeen = Math.max(0, Number(civ.eventCounts[event.id] ?? 0));
        const freshness = 1 / (1 + timesSeen * 0.55);
        const weight = base * path * state * phaseMultiplier(event, civ) * freshness;
        if (weight > 0)
            pool.push({ event, weight });
    }
    return pool;
}
export function buildInterventionPool(events, civ, options) {
    const fresh = buildPool(events, civ, options, true);
    return fresh.length ? fresh : buildPool(events, civ, options, false);
}
export function chooseWeightedIntervention(pool, roll01) {
    const total = pool.reduce((sum, item) => sum + item.weight, 0);
    if (!pool.length || total <= 0)
        return null;
    let cursor = Math.max(0, Math.min(0.999999999, roll01)) * total;
    for (const item of pool) {
        cursor -= item.weight;
        if (cursor <= 0)
            return item.event;
    }
    return pool[pool.length - 1].event;
}
export function eventDelayWindow(civ) {
    return [
        { min: 10, max: 14 },
        { min: 8, max: 11 },
        { min: 7, max: 10 },
    ][Math.max(0, Math.min(2, civ.era))];
}
//# sourceMappingURL=intervention-scheduler.js.map