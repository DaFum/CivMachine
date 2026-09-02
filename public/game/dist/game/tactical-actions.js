import { CivilizationPaths } from './paths.js';
import { fill, tacticalActionCopy, text } from '../data/i18n.js';
export const CONTROL_CAPACITY_MAX = 3;
export const VENT_ENTROPY_RELIEF = 18;
export const VENT_MIN_ENTROPY = 6;
export const VENT_STABILITY_COST = 10;
export const VENT_ATTENTION_COST = 4;
/**
 * Each vent tears the lattice a little wider than the last one did.
 *
 * At a flat 10 Stability the vent was the hole in the survival curve. Containment sets the Entropy
 * rate and therefore the published cascade horizon -- 159 s at Containment 0, 292 s at 3 -- but a run
 * that keeps resolving interventions keeps being handed Stability and Control back, and a flat-priced
 * vent turns both straight into more run. Measured across the campaign harness, runs at Containment 3
 * finished anywhere between 300 s and 900 s: the same build, a 3x spread, and the top of that spread
 * reached the Cultivation Credit cap on the third run of a fresh save.
 *
 * Escalating the price makes venting a finite budget rather than a renewable one, which puts run
 * length back under the curve Containment actually governs -- and gives Containment its second job,
 * since a slower Entropy rate is now worth vents as well as seconds.
 *
 * The growth is linear in the base cost rather than compounding on the previous vent: 10, 13.5, 17,
 * 20.5, each one 3.5 dearer than the last. `tacticalAvailability` refuses a vent the run cannot pay
 * for in full, because the Paradox payout scales with this price and a part-paid vent would hand over
 * the whole escalated yield for whatever Stability happened to be left.
 */
export const VENT_COST_ESCALATION = 0.35;
// Paradox is the scarcest of the four harvests and venting is the only action that deliberately
// produces it, so the rate rose with the price: a rationed vent has to be worth planning a run around.
export const VENT_PARADOX_BASE = 0.75;
export const VENT_PARADOX_PER_ERA = 0.3;
/** What the next Entropy Vent costs in Stability, given how many this run has already spent. */
export function ventStabilityCost(uses) {
    return VENT_STABILITY_COST * (1 + VENT_COST_ESCALATION * Math.max(0, Math.trunc(Number(uses) || 0)));
}
/**
 * How much of a probed intervention's damage foresight removes, per Prediction Core level.
 *
 * Prediction Core used to sell only the accuracy of a Probe report, which is worth exactly nothing to
 * a player who was going to pick the safest branch anyway -- and measurably nothing to the balance
 * harness, which is why an information-tilted build was a progression trap rather than a strategy.
 * Foresight now pays out: an intervention you spent Control looking at lands softer, because you saw
 * it coming. The identity is unchanged -- the module still does nothing at all until you Probe.
 */
export const PREDICTION_MITIGATION_PER_LEVEL = 0.12;
export const PREDICTION_MITIGATION_MAX = 0.5;
export function predictionMitigation(level) {
    return Math.min(PREDICTION_MITIGATION_MAX, PREDICTION_MITIGATION_PER_LEVEL * Math.max(0, Number(level) || 0));
}
/**
 * What a Probe costs a Machine that has a Prediction Core, in Control.
 *
 * Softening a probed intervention was not enough on its own. Measured across the campaign harness, a
 * player who probed every intervention finished *behind* one who never probed: the safest branch is
 * already the one being taken, so there is little damage left to mitigate, while the Probe itself
 * spent the Control a vent needed. Information that costs the run is not information the player wants.
 *
 * So the module buys the looking as well as the seeing: at level 2 a Probe is free, and the Core stops
 * competing with the tactical budget it is supposed to inform.
 */
export function probeControlCost(predictionLevel) {
    const level = Math.max(0, Math.trunc(Number(predictionLevel) || 0));
    return Math.max(0, TACTICAL_ACTIONS.probe.cost - Math.max(0, level - 1));
}
export const ACCELERATE_ENTROPY_BASE = 3;
export const ACCELERATE_ENTROPY_PER_ERA = 3;
/**
 * What a Temporal Injector level actually buys, now that it no longer sells wall-clock speed.
 *
 * Until v1.20 the module's headline was "unlocks 2x simulation speed", which made it the one purchase
 * whose value evaporated at every Universe -- the Machine layer resets, so a player bought the same
 * fast-forward button once per prestige. Simulation speed is a comfort, not power, so it moved to
 * Machine Insight where it is kept for good; the module keeps the mechanic it is named after.
 *
 * The old +6 Development per use was the reason an Accelerate-heavy policy measured as a trap: 2
 * Control and up to 12 Entropy bought a fourteenth of a Cultivation Credit. Scaling the injection with
 * the module makes the aggressive line a real trade -- Entropy, and therefore run length, exchanged
 * for Depth right now.
 */
export const ACCELERATE_YEARS = [200, 420, 720, 1150];
export const ACCELERATE_DEVELOPMENT = [6, 16, 30, 48];
/** Simulation speed is permanent progression: earned once with Machine Insight, never re-bought. */
export const SIMULATION_SPEED_INSIGHT = { double: 3, quadruple: 10 };
export function maxSimulationSpeed(machineInsight) {
    const insight = Math.max(0, Number(machineInsight) || 0);
    if (insight >= SIMULATION_SPEED_INSIGHT.quadruple)
        return 4;
    return insight >= SIMULATION_SPEED_INSIGHT.double ? 2 : 1;
}
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
        summary: '+{years} years · +{development} Development',
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
/**
 * The summary line as it stands for this Machine. Only Accelerate needs it: its payout is the whole
 * point of Temporal Injector, and a rail that says "+200 years" at every level hides the upgrade.
 */
export function tacticalSummary(id, bonuses) {
    const copy = tacticalActionText(id);
    if (id !== 'accelerate')
        return copy.summary;
    return fill(copy.summary, {
        years: Math.round(bonuses.accelerateYears),
        development: Math.round(bonuses.accelerateDevelopment),
    });
}
/** The risk line as it stands for this civilization, so the rail can name the price actually charged. */
export function tacticalRisk(civ, id) {
    const reasons = text().tacticalActions.reasons;
    if (id === 'accelerate')
        return fill(reasons.accelerateRisk, { entropy: accelerateEntropyCost(civ.era) });
    // The vent's price is the one that moves during a run, so the rail has to name the price actually
    // charged rather than the price the catalog was written with.
    if (id === 'vent')
        return fill(reasons.ventRisk, { stability: Math.round(ventStabilityCost(civ.tactical.actionUsage.vent)) });
    return tacticalActionCopy(id)?.risk ?? TACTICAL_ACTIONS[id].risk;
}
export function tacticalAvailability(civ, id) {
    const base = TACTICAL_ACTIONS[id];
    // Probe is the one action whose price a Machine upgrade moves, so the cost the rail shows and the
    // cost `applyTacticalAction` deducts both come from here rather than from the catalog.
    const definition = id === 'probe'
        ? { ...base, cost: probeControlCost(civ.predictionLevel) }
        : base;
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
    // A vent has to be paid for in full, because since v1.20.0 its Paradox payout scales with its
    // price. Without this, venting at 3 Stability against a 31 Stability price banked the whole 3.1x
    // payout for a tenth of the cost and then collapsed the run -- which is exactly the flat
    // Paradox-per-Stability the escalation was introduced to preserve, inverted.
    if (id === 'vent' && civ.stats.stability < ventStabilityCost(civ.tactical.actionUsage.vent)) {
        return {
            enabled: false,
            reason: fill(reasons.ventTooExpensive, { stability: Math.round(ventStabilityCost(civ.tactical.actionUsage.vent)) }),
            cost: definition.cost,
        };
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
        civ.development += bonuses.accelerateDevelopment * Math.max(0.2, civ.developmentMultiplier) * (1 + civ.era * 0.2);
        civ.eventTimer = Math.max(0, civ.eventTimer - bonuses.accelerateTimer);
        civ.stats.stability = clamp(civ.stats.stability - 4, 0, civ.stats.stabilityMax);
        civ.tactical.entropy = clamp(civ.tactical.entropy + accelerateEntropyCost(civ.era), 0, 100);
    }
    else if (id === 'vent') {
        const removed = Math.min(VENT_ENTROPY_RELIEF, civ.tactical.entropy);
        const price = ventStabilityCost(civ.tactical.actionUsage.vent);
        civ.tactical.entropy = clamp(civ.tactical.entropy - removed, 0, 100);
        // The payout escalates with the price. Venting is the game's only deliberate Paradox source, and
        // charging more Stability for each vent without paying more for it turned a venting run into a
        // strictly worse one -- measured at 250 Paradox against 256 for never venting at all. Tying the
        // yield to the price keeps Paradox-per-Stability flat, so what the escalation actually rations is
        // run length, which is what it was introduced to ration.
        civ.harvestBonus.paradox += removed * (VENT_PARADOX_BASE + VENT_PARADOX_PER_ERA * Math.max(0, Math.min(3, Math.trunc(civ.era))))
            * (price / VENT_STABILITY_COST);
        civ.stats.stability = clamp(civ.stats.stability - price, 0, civ.stats.stabilityMax);
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