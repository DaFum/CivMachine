import { CivilizationPaths } from './paths.js';
export const CONTROL_CAPACITY_MAX = 3;
export const TACTICAL_ACTIONS = {
    stabilize: {
        id: 'stabilize',
        title: 'Stability Override',
        label: 'Stabilize the reality lattice',
        summary: '+14 Stability',
        risk: '+6 Attention · +8 Entropy',
        cost: 2,
        shortcut: '1',
    },
    accelerate: {
        id: 'accelerate',
        title: 'Temporal Injection',
        label: 'Accelerate historical throughput',
        summary: '+200 years · advance Development',
        risk: '-4 Stability · +7 Entropy',
        cost: 2,
        shortcut: '2',
    },
    probe: {
        id: 'probe',
        title: 'Prediction Probe',
        label: 'Probe the active intervention',
        summary: 'Reveal choice risk directions',
        risk: '+3 Awareness · +2 Entropy',
        cost: 1,
        shortcut: '3',
    },
};
const ACTION_PATHS = {
    stabilize: ['cosmic_resistance', 'bureaucratic_singularity'],
    accelerate: ['temporal_dominion', 'reality_engineering'],
    probe: ['recursive_simulation', 'machine_faith'],
};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function tacticalAvailability(civ, id) {
    const definition = TACTICAL_ACTIONS[id];
    if (civ.tactical.controlCapacity < definition.cost) {
        return { enabled: false, reason: `Requires ${definition.cost} Control.`, cost: definition.cost };
    }
    if (id === 'stabilize' && civ.stats.stability >= civ.stats.stabilityMax) {
        return { enabled: false, reason: 'Reality Stability is already at maximum.', cost: definition.cost };
    }
    if (id === 'accelerate' && civ.pendingEvent) {
        return { enabled: false, reason: 'Resolve the active intervention before accelerating.', cost: definition.cost };
    }
    if (id === 'probe' && !civ.pendingEvent) {
        return { enabled: false, reason: 'Probe requires an active intervention.', cost: definition.cost };
    }
    if (id === 'probe' && civ.tactical.probedEventId === civ.pendingEvent) {
        return { enabled: false, reason: 'This intervention has already been probed.', cost: definition.cost };
    }
    return { enabled: true, reason: '', cost: definition.cost };
}
export function applyTacticalAction(civ, id, bonuses) {
    const availability = tacticalAvailability(civ, id);
    if (!availability.enabled)
        return null;
    if (id === 'stabilize') {
        civ.stats.stability = clamp(civ.stats.stability + 14, 0, civ.stats.stabilityMax);
        civ.stats.attention = clamp(civ.stats.attention + 6 * bonuses.attentionGainMult, 0, 100);
        civ.tactical.entropy = clamp(civ.tactical.entropy + 8, 0, 100);
    }
    else if (id === 'accelerate') {
        civ.years += bonuses.accelerateYears;
        civ.development += 6 * Math.max(0.2, civ.developmentMultiplier) * (1 + civ.era * 0.2);
        civ.eventTimer = Math.max(0, civ.eventTimer - bonuses.accelerateTimer);
        civ.stats.stability = clamp(civ.stats.stability - 4, 0, civ.stats.stabilityMax);
        civ.tactical.entropy = clamp(civ.tactical.entropy + 7, 0, 100);
    }
    else {
        civ.stats.awareness = clamp(civ.stats.awareness + 3 * bonuses.awarenessGainMult, 0, 100);
        civ.tactical.entropy = clamp(civ.tactical.entropy + 2, 0, 100);
        civ.tactical.probedEventId = civ.pendingEvent;
    }
    civ.tactical.controlCapacity = clamp(civ.tactical.controlCapacity - availability.cost, 0, CONTROL_CAPACITY_MAX);
    civ.tactical.actionUsage[id] += 1;
    if (civ.tactical.actionUsage[id] % 3 === 0) {
        const pathState = CivilizationPaths.ensure(civ);
        for (const pathId of ACTION_PATHS[id])
            pathState.affinity[pathId] = (pathState.affinity[pathId] ?? 0) + 1;
    }
    const definition = TACTICAL_ACTIONS[id];
    return { id, title: definition.title, label: definition.label };
}
//# sourceMappingURL=tactical-actions.js.map