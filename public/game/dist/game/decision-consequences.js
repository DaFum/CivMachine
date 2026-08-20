import { consequenceProfileFor } from './consequence-profiles.js';
const metricDelta = (before, after, key) => (after.metrics[key] ?? 0) - (before.metrics[key] ?? 0);
const addUnique = (tags, tag) => { if (!tags.includes(tag))
    tags.push(tag); };
function transitions(before, after) {
    const result = {};
    if (before.dramaPhaseId !== after.dramaPhaseId)
        result.dramaPhase = { from: before.dramaPhaseId, to: after.dramaPhaseId };
    if (before.era !== after.era)
        result.era = { from: before.era, to: after.era };
    if (before.dominantPath !== after.dominantPath)
        result.dominantPath = { from: before.dominantPath, to: after.dominantPath };
    const addedEndgame = after.endgameStates.find(id => !before.endgameStates.includes(id));
    if (addedEndgame)
        result.endgameStateAdded = addedEndgame;
    if (before.entropyBand !== after.entropyBand)
        result.entropyBand = { from: before.entropyBand, to: after.entropyBand };
    return result;
}
function affinityMovement(before, after) {
    return [...new Set([...Object.keys(before.affinities), ...Object.keys(after.affinities)])]
        .reduce((sum, id) => sum + Math.abs((after.affinities[id] ?? 0) - (before.affinities[id] ?? 0)), 0);
}
function genericTags(before, after, additions) {
    const tags = [];
    const development = metricDelta(before, after, 'development');
    const stability = metricDelta(before, after, 'stability');
    const sanity = metricDelta(before, after, 'sanity');
    const awareness = metricDelta(before, after, 'awareness');
    const attention = metricDelta(before, after, 'attention');
    const entropy = metricDelta(before, after, 'entropy');
    const affinityTotal = affinityMovement(before, after);
    if (development >= 10)
        addUnique(tags, 'urban_growth');
    if (development >= 18 && after.dramaPhaseId >= 2)
        addUnique(tags, 'technological_growth');
    if (development <= -10)
        addUnique(tags, 'urban_decline');
    if (stability <= -8 || sanity <= -8)
        addUnique(tags, 'civil_unrest');
    if (entropy >= 3)
        addUnique(tags, 'reality_damage');
    if (entropy <= -6)
        addUnique(tags, 'containment');
    if (awareness >= 8 || attention >= 8)
        addUnique(tags, 'surveillance');
    if (stability >= 8)
        addUnique(tags, 'stabilization');
    if (additions.some(addition => addition.kind === 'institution'))
        addUnique(tags, 'institution_growth');
    if (affinityTotal >= 2)
        addUnique(tags, 'path_shift');
    if (after.dominantPath === 'machine_faith' && before.dominantPath !== 'machine_faith')
        addUnique(tags, 'religious_shift');
    return tags;
}
function significance(eventId, before, after, additions, explicit) {
    const t = transitions(before, after);
    if (explicit === 'turning_point' || t.dramaPhase || t.era || t.dominantPath || t.endgameStateAdded || ['entropy_crisis_25', 'entropy_crisis_50', 'entropy_crisis_75'].includes(eventId))
        return 'turning_point';
    if (explicit === 'major')
        return 'major';
    const isMajor = Math.abs(metricDelta(before, after, 'development')) >= 15
        || Math.abs(metricDelta(before, after, 'stability')) >= 8
        || Math.abs(metricDelta(before, after, 'sanity')) >= 8
        || Math.abs(metricDelta(before, after, 'awareness')) >= 10
        || Math.abs(metricDelta(before, after, 'attention')) >= 10
        || Math.abs(metricDelta(before, after, 'entropy')) >= 5
        || affinityMovement(before, after) >= 3
        || additions.some(addition => addition.kind === 'trait' || addition.kind === 'institution');
    return isMajor ? 'major' : 'routine';
}
export function buildDecisionConsequence(eventId, before, after, additions) {
    const profile = consequenceProfileFor(eventId, additions);
    const tags = genericTags(before, after, additions);
    for (const tag of profile?.tags ?? [])
        addUnique(tags, tag);
    return {
        significance: significance(eventId, before, after, additions, profile?.significance),
        tags,
        transitions: transitions(before, after),
        signatureProfile: profile?.id ?? '',
    };
}
//# sourceMappingURL=decision-consequences.js.map