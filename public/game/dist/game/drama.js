import { dramaPhaseLabel as localizedDramaPhase } from '../data/i18n.js';
const PHASES = [
    { id: 0, name: 'emergence', label: 'Emergence' },
    { id: 1, name: 'expansion', label: 'Expansion' },
    { id: 2, name: 'division', label: 'Division' },
    { id: 3, name: 'transformation', label: 'Transformation' },
    { id: 4, name: 'crisis', label: 'Crisis' },
];
// `label` above is the canonical English; this is what a surface prints. The phase itself stays a
// plain constant because its `id` is written into every trace sample and its `name` is the catalog
// key -- only the label is copy.
export function dramaPhaseLabel(phase) {
    return localizedDramaPhase(phase.name) ?? phase.label;
}
export function civilizationDramaScore(civ) {
    return civ.development + civ.era * 120 + civ.institutions.length * 30 + civ.eventChoices * 6;
}
export function civilizationDramaPhase(civ) {
    const score = civilizationDramaScore(civ);
    if (score < 70)
        return PHASES[0];
    if (score < 180)
        return PHASES[1];
    if (score < 340)
        return PHASES[2];
    if (score < 560)
        return PHASES[3];
    return PHASES[4];
}
//# sourceMappingURL=drama.js.map