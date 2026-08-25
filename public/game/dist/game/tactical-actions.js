import { CivilizationPaths } from './paths.js';
import { fill, tacticalActionCopy, text } from '../data/i18n.js';
export const CONTROL_CAPACITY_MAX = 3;
export const VENT_ENTROPY_RELIEF = 18;
export const VENT_MIN_ENTROPY = 6;
export const VENT_STABILITY_COST = 10;
export const VENT_ATTENTION_COST = 4;
export const ACCELERATE_ENTROPY_BASE = 3;
export const ACCELERATE_ENTROPY_PER_ERA = 3;
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
        risk: '-4 Stability · +3 Entropy, +3 more per era',
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
    vent: {
        id: 'vent',
        title: 'Entropy Vent',
        label: 'Vent accumulated entropy into Paradox',
        summary: '-18 Entropy · yields Paradox at harvest',
        risk: '-10 Stability · +4 Attention',
        cost: 1,
        shortcut: '4',
    },
};
const ACTION_PATHS = {
    stabilize: ['cosmic_resistance', 'bureaucratic_singularity'],
    accelerate: ['temporal_dominion', 'reality_engineering'],
    probe: ['recursive_simulation', 'machine_faith'],
    vent: ['void_communion', 'post_mortal_civilization'],
};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
/**
 * Accelerate is meant to be front-loaded: worth taking while a civilization is still cheap to push,
 * and dominated by simply waiting once it is deep enough to run itself. At a flat +5 Entropy it was
 * dominated everywhere instead -- headless policy runs over five seeds put accelerating whenever
 * available at 2.0 Cultivation Credits against 4.8 for touching nothing at containment 8, and even
 * one use in Emergence lost ground. Charging the Entropy by era restores the asymmetry the design
 * asks for: Emergence is cheap, Apotheosis is punitive.
 */
export function accelerateEntropyCost(era) {
    return ACCELERATE_ENTROPY_BASE + ACCELERATE_ENTROPY_PER_ERA * clamp(Math.trunc(Number(era) || 0), 0, 3);
}
// `TACTICAL_ACTIONS` above stays the canonical English definition -- costs, shortcuts and path
// affinities are rules -- and this is the copy a rail prints for one action.
export function tacticalActionText(id) {
    const definition = TACTICAL_ACTIONS[id];
    const copy = tacticalActionCopy(id);
    return {
        title: copy?.title ?? definition.title,
        label: copy?.label ?? definition.label,
        summary: copy?.summary ?? definition.summary,
    };
}
/** The risk line as it stands for this civilization, so the rail can name the price actually charged. */
export function tacticalRisk(civ, id) {
    if (id !== 'accelerate')
        return tacticalActionCopy(id)?.risk ?? TACTICAL_ACTIONS[id].risk;
    return fill(text().tacticalActions.reasons.accelerateRisk, { entropy: accelerateEntropyCost(civ.era) });
}
export function tacticalAvailability(civ, id) {
    const definition = TACTICAL_ACTIONS[id];
    const reasons = text().tacticalActions.reasons;
    if (civ.tactical.controlCapacity < definition.cost) {
        return { enabled: false, reason: fill(reasons.requiresControl, { cost: definition.cost }), cost: definition.cost };
    }
    if (id === 'stabilize' && civ.stats.stability >= civ.stats.stabilityMax) {
        return { enabled: false, reason: reasons.stabilityAtMaximum, cost: definition.cost };
    }
    if (id === 'accelerate' && civ.pendingEvent) {
        return { enabled: false, reason: reasons.resolveInterventionFirst, cost: definition.cost };
    }
    if (id === 'probe' && !civ.pendingEvent) {
        return { enabled: false, reason: reasons.probeRequiresIntervention, cost: definition.cost };
    }
    if (id === 'probe' && civ.tactical.probedEventId === civ.pendingEvent) {
        return { enabled: false, reason: reasons.alreadyProbed, cost: definition.cost };
    }
    if (id === 'vent' && civ.tactical.entropy < VENT_MIN_ENTROPY) {
        return { enabled: false, reason: reasons.entropyTooLowToVent, cost: definition.cost };
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
        civ.injectedYears = Math.max(0, Number(civ.injectedYears) || 0) + bonuses.accelerateYears;
        civ.development += 6 * Math.max(0.2, civ.developmentMultiplier) * (1 + civ.era * 0.2);
        civ.eventTimer = Math.max(0, civ.eventTimer - bonuses.accelerateTimer);
        civ.stats.stability = clamp(civ.stats.stability - 4, 0, civ.stats.stabilityMax);
        civ.tactical.entropy = clamp(civ.tactical.entropy + accelerateEntropyCost(civ.era), 0, 100);
    }
    else if (id === 'vent') {
        const removed = Math.min(VENT_ENTROPY_RELIEF, civ.tactical.entropy);
        civ.tactical.entropy = clamp(civ.tactical.entropy - removed, 0, 100);
        civ.harvestBonus.paradox += removed * (0.4 + 0.2 * Math.max(0, Math.min(3, Math.trunc(civ.era))));
        civ.stats.stability = clamp(civ.stats.stability - VENT_STABILITY_COST, 0, civ.stats.stabilityMax);
        civ.stats.attention = clamp(civ.stats.attention + VENT_ATTENTION_COST * bonuses.attentionGainMult, 0, 100);
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
    const copy = tacticalActionText(id);
    return { id, title: copy.title, label: copy.label };
}
//# sourceMappingURL=tactical-actions.js.map