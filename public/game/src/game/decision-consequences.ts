import { consequenceProfileFor } from './consequence-profiles.js';
import type { ConsequenceTag, DecisionAddition, DecisionConsequence, DecisionSignificance, DecisionTransition } from './types.js';
import type { DecisionSnapshot } from './decision-feedback.js';

const metricDelta = (before: DecisionSnapshot, after: DecisionSnapshot, key: string): number => (after.metrics[key] ?? 0) - (before.metrics[key] ?? 0);
const addUnique = (tags: ConsequenceTag[], tag: ConsequenceTag): void => { if (!tags.includes(tag)) tags.push(tag); };

function transitions(before: DecisionSnapshot, after: DecisionSnapshot): DecisionTransition {
  const result: DecisionTransition = {};
  if (before.dramaPhaseId !== after.dramaPhaseId) result.dramaPhase = { from: before.dramaPhaseId, to: after.dramaPhaseId };
  if (before.era !== after.era) result.era = { from: before.era, to: after.era };
  if (before.dominantPath !== after.dominantPath) result.dominantPath = { from: before.dominantPath, to: after.dominantPath };
  const beforeEndgames = new Set(before.endgameStates);
  const addedEndgame = after.endgameStates.find(id => !beforeEndgames.has(id));
  if (addedEndgame) result.endgameStateAdded = addedEndgame;
  if (before.entropyBand !== after.entropyBand) result.entropyBand = { from: before.entropyBand, to: after.entropyBand };
  return result;
}

function affinityMovement(before: DecisionSnapshot, after: DecisionSnapshot): number {
  return [...new Set([...Object.keys(before.affinities), ...Object.keys(after.affinities)])]
    .reduce((sum, id) => sum + Math.abs((after.affinities[id] ?? 0) - (before.affinities[id] ?? 0)), 0);
}

function genericTags(before: DecisionSnapshot, after: DecisionSnapshot, additions: ReadonlyArray<DecisionAddition>): ConsequenceTag[] {
  const tags: ConsequenceTag[] = [];
  const development = metricDelta(before, after, 'development');
  const stability = metricDelta(before, after, 'stability');
  const sanity = metricDelta(before, after, 'sanity');
  const awareness = metricDelta(before, after, 'awareness');
  const attention = metricDelta(before, after, 'attention');
  const entropy = metricDelta(before, after, 'entropy');
  const affinityTotal = affinityMovement(before, after);
  if (development >= 10) addUnique(tags, 'urban_growth');
  if (development >= 18 && after.dramaPhaseId >= 2) addUnique(tags, 'technological_growth');
  if (development <= -10) addUnique(tags, 'urban_decline');
  if (stability <= -8 || sanity <= -8) addUnique(tags, 'civil_unrest');
  if (entropy >= 3) addUnique(tags, 'reality_damage');
  if (entropy <= -6) addUnique(tags, 'containment');
  if (awareness >= 8 || attention >= 8) addUnique(tags, 'surveillance');
  if (stability >= 8) addUnique(tags, 'stabilization');
  if (additions.some(addition => addition.kind === 'institution')) addUnique(tags, 'institution_growth');
  if (affinityTotal >= 2) addUnique(tags, 'path_shift');
  if (after.dominantPath === 'machine_faith' && before.dominantPath !== 'machine_faith') addUnique(tags, 'religious_shift');
  return tags;
}

function significance(eventId: string, before: DecisionSnapshot, after: DecisionSnapshot, additions: ReadonlyArray<DecisionAddition>, explicit?: DecisionSignificance): DecisionSignificance {
  const t = transitions(before, after);
  if (explicit === 'turning_point' || t.dramaPhase || t.era || t.dominantPath || t.endgameStateAdded || ['entropy_crisis_25','entropy_crisis_50','entropy_crisis_75'].includes(eventId)) return 'turning_point';
  if (explicit === 'major') return 'major';
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

export function buildDecisionConsequence(eventId: string, before: DecisionSnapshot, after: DecisionSnapshot, additions: ReadonlyArray<DecisionAddition>): DecisionConsequence {
  const profile = consequenceProfileFor(eventId, additions);
  const tags = genericTags(before, after, additions);
  for (const tag of profile?.tags ?? []) addUnique(tags, tag);
  return {
    significance: significance(eventId, before, after, additions, profile?.significance),
    tags,
    transitions: transitions(before, after),
    signatureProfile: profile?.id ?? '',
  };
}
