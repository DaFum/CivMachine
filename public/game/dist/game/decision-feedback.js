import { CivilizationPaths } from './paths.js';
const METRICS = [
    { key: 'stability', label: 'Stability' },
    { key: 'stabilityMax', label: 'Maximum Stability' },
    { key: 'awareness', label: 'Awareness', inverse: true },
    { key: 'sanity', label: 'Sanity' },
    { key: 'attention', label: 'Cosmic Attention', inverse: true },
    { key: 'years', label: 'Civilization Years' },
    { key: 'development', label: 'Development' },
    { key: 'eventTimer', label: 'Intervention Timer', inverse: true },
    { key: 'entropy', label: 'Entropy', inverse: true },
    { key: 'controlCapacity', label: 'Control Capacity' },
];
function humanize(id) { return id.replaceAll('_', ' '); }
function additions(after, before, kind) {
    const known = new Set(before);
    return after.filter(id => !known.has(id)).map(id => ({ kind, label: humanize(id) }));
}
export function captureDecisionSnapshot(civ) {
    return {
        metrics: {
            stability: civ.stats.stability,
            stabilityMax: civ.stats.stabilityMax,
            awareness: civ.stats.awareness,
            sanity: civ.stats.sanity,
            attention: civ.stats.attention,
            years: civ.years,
            development: civ.development,
            eventTimer: civ.eventTimer,
            entropy: civ.tactical.entropy,
            controlCapacity: civ.tactical.controlCapacity,
        },
        affinities: { ...civ.pathState.affinity },
        traits: [...civ.traits],
        institutions: [...civ.institutions],
        flags: [...civ.flags],
        pathFlags: [...civ.pathState.choiceFlags],
    };
}
export function buildDecisionFeedback(sequence, event, choice, before, after) {
    const metrics = [];
    let positive = false, negative = false;
    for (const definition of METRICS) {
        const prior = before.metrics[definition.key] ?? 0, current = after.metrics[definition.key] ?? 0, delta = current - prior;
        if (Math.abs(delta) < .0001)
            continue;
        metrics.push({ key: definition.key, label: definition.label, before: prior, after: current, delta });
        const beneficial = definition.inverse ? delta < 0 : delta > 0;
        if (beneficial)
            positive = true;
        else
            negative = true;
    }
    const affinityIds = new Set([...Object.keys(before.affinities), ...Object.keys(after.affinities)]);
    const affinities = [...affinityIds].map(pathId => ({ pathId, label: CivilizationPaths.displayName(pathId), delta: (after.affinities[pathId] ?? 0) - (before.affinities[pathId] ?? 0) })).filter(item => Math.abs(item.delta) >= .0001);
    const additionsList = [
        ...additions(after.traits, before.traits, 'trait'),
        ...additions(after.institutions, before.institutions, 'institution'),
        ...additions(after.flags, before.flags, 'flag'),
        ...additions(after.pathFlags, before.pathFlags, 'path_flag'),
    ];
    if (additionsList.some(item => item.kind === 'trait' || item.kind === 'institution'))
        positive = true;
    return {
        sequence,
        eventId: event.id,
        eventTitle: event.title,
        choiceLabel: choice.label,
        tone: positive && negative ? 'mixed' : negative ? 'negative' : positive ? 'positive' : 'mixed',
        metrics,
        affinities,
        additions: additionsList,
    };
}
//# sourceMappingURL=decision-feedback.js.map