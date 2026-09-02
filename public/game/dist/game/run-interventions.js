import { cultivationDepth } from './harvest-quality.js';
export const RUN_INTERVENTION_COST_GROWTH = 3;
export const RUN_INTERVENTION_DEPTH_SCALE = 4;
export const CONTAINMENT_PULSE_RELIEF = 25;
export const EMERGENCY_LATTICE_FLOOR = 0.6;
export const TEMPORAL_GRAFT_YEARS = 600;
export const TEMPORAL_GRAFT_DEVELOPMENT = 30;
export const RUN_INTERVENTIONS = [
    { id: 'containment_pulse', title: 'Containment Pulse', label: 'Fire a containment pulse', summary: '-25 Entropy', currency: 'causal_mass', baseCost: 180, maxUses: 3, insight: 4 },
    { id: 'emergency_lattice', title: 'Emergency Lattice', label: 'Force the lattice back up', summary: 'Stability to 60% of maximum', currency: 'cognition', baseCost: 200, maxUses: 3, insight: 6 },
    { id: 'temporal_graft', title: 'Temporal Graft', label: 'Graft borrowed centuries', summary: '+600 years and +30 Development', currency: 'existence', baseCost: 220, maxUses: 3, insight: 9 },
];
const RUN_INTERVENTIONS_BY_ID = new Map(RUN_INTERVENTIONS.map(definition => [definition.id, definition]));
export function runInterventionById(id) {
    return RUN_INTERVENTIONS_BY_ID.get(id) ?? null;
}
export function runInterventionUses(civ, id) {
    if (!civ.runInterventionUses)
        civ.runInterventionUses = {};
    return Math.max(0, Number(civ.runInterventionUses[id] ?? 0));
}
// Spending banked resources to survive longer produces more resources, which is a positive feedback
// loop. Escalation alone does not close it, so the price also rises with how deep the civilization
// already is. The depth term predates v1.20.0, when yield really was quadratic in depth; the yield
// curve is concave now, and the term is kept because the loop it closes is the spending one -- a deep
// run has more banked to spend and more to gain by spending it -- not the yield one.
export function runInterventionCost(definition, uses, depth) {
    const escalation = Math.pow(RUN_INTERVENTION_COST_GROWTH, Math.max(0, uses));
    const depthFactor = 1 + Math.max(0, depth) / RUN_INTERVENTION_DEPTH_SCALE;
    return Math.round(definition.baseCost * escalation * depthFactor);
}
export function applyRunIntervention(civ, definition) {
    if (definition.id === 'containment_pulse') {
        civ.tactical.entropy = Math.max(0, civ.tactical.entropy - CONTAINMENT_PULSE_RELIEF);
    }
    else if (definition.id === 'emergency_lattice') {
        const floorValue = civ.stats.stabilityMax * EMERGENCY_LATTICE_FLOOR;
        if (civ.stats.stability < floorValue)
            civ.stats.stability = floorValue;
    }
    else if (definition.id === 'temporal_graft') {
        civ.years += TEMPORAL_GRAFT_YEARS;
        civ.development += TEMPORAL_GRAFT_DEVELOPMENT;
    }
    civ.runInterventionUses[definition.id] = runInterventionUses(civ, definition.id) + 1;
    return definition.label;
}
export function runInterventionDepth(civ) {
    return cultivationDepth(civ);
}
//# sourceMappingURL=run-interventions.js.map