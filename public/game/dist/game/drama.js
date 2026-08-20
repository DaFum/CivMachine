const PHASES = [
    { id: 0, name: 'emergence', label: 'Emergence' },
    { id: 1, name: 'expansion', label: 'Expansion' },
    { id: 2, name: 'division', label: 'Division' },
    { id: 3, name: 'transformation', label: 'Transformation' },
    { id: 4, name: 'crisis', label: 'Crisis' },
];
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