import { buildDecisionConsequence } from './decision-consequences.js';
import { civilizationDramaPhase } from './drama.js';
import { CivilizationPaths } from './paths.js';
import { eventCopy, flagLabel, institutionName, interventionCopy, pathFlagLabel, tacticalActionCopy, text, traitCopy } from '../data/i18n.js';
import type { Civilization, DecisionFeedback, DecisionMetricDelta, DramaPhaseId } from './types.js';

export interface DecisionSnapshot {
  metrics: Record<string, number>;
  affinities: Record<string, number>;
  traits: string[];
  institutions: string[];
  flags: string[];
  pathFlags: string[];
  dramaPhaseId: DramaPhaseId;
  era: number;
  dominantPath: string;
  endgameStates: string[];
  entropyBand: number;
}

// `label` here is the canonical English and the fallback; which metric is `inverse` is a rule, so the
// table itself stays a constant and only the label is read from the catalog at build time.
const METRICS: ReadonlyArray<Readonly<{ key:string; label:string; inverse?:boolean }>> = [
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

function humanize(id:string):string{return id.replaceAll('_',' ');}
// What the player gained, named the way the catalog names it: a trait and an institution by their own
// name, a flag by the decision that set it. The snake_case id is the last resort, not the label.
function additionLabel(id:string,kind:'trait'|'institution'|'flag'|'path_flag'):string{
  if(kind==='trait')return traitCopy(id)?.name??humanize(id);
  if(kind==='institution')return institutionName(id)??humanize(id);
  if(kind==='flag')return flagLabel(id)??humanize(id);
  return pathFlagLabel(id)??humanize(id);
}
function additions(after:string[],before:string[],kind:'trait'|'institution'|'flag'|'path_flag'){
  const known=new Set(before);
  const kinds:Readonly<Record<string,string>>=text().reports.decisionFeedback.additionKinds;
  return after.filter(id=>!known.has(id)).map(id=>({kind,id,kindLabel:kinds[kind]??humanize(kind),label:additionLabel(id,kind)}));
}

export function captureDecisionSnapshot(civ:Civilization):DecisionSnapshot {
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
    dramaPhaseId: civilizationDramaPhase(civ).id,
    era: civ.era,
    dominantPath: civ.pathState.dominantPath,
    endgameStates: [...(civ.pathState.endgameStates ?? [])],
    entropyBand: Math.min(4, Math.floor(Math.max(0, Math.min(100, civ.tactical.entropy)) / 25)),
  };
}

// Feedback is written when a decision resolves and read for as long as its card is on screen, which
// can outlive a locale switch. So the ids travel with it and the copy is resolved again on the way
// out: `metrics` from their keys, `affinities` from their path ids, `additions` from theirs, and the
// heading from the event id plus, for a real intervention, the index of the choice that was taken.
// The three synthetic decisions -- a tactical action, a reserve commitment and a queued Entropy
// crisis -- name themselves through the same ids the engine built them from.
export function localizeDecisionFeedback(feedback:DecisionFeedback):DecisionFeedback {
  const kinds:Readonly<Record<string,string>>=text().reports.decisionFeedback.additionKinds;
  const metricLabels:Readonly<Record<string,string>>=text().reports.decisionFeedback.metrics;
  const event=eventCopy(feedback.eventId);
  const tactical=feedback.eventId.startsWith('tactical:')?tacticalActionCopy(feedback.eventId.slice('tactical:'.length)):undefined;
  const reserve=feedback.eventId.startsWith('reserve:')?interventionCopy(feedback.eventId.slice('reserve:'.length)):undefined;
  const choiceLabel=typeof feedback.choiceIndex==='number'
    ? event?.choices[feedback.choiceIndex]?.label
    : tactical?.label ?? reserve?.label;
  return {
    ...feedback,
    eventTitle:event?.title??tactical?.title??reserve?.title??feedback.eventTitle,
    choiceLabel:choiceLabel??feedback.choiceLabel,
    metrics:feedback.metrics.map(item=>({...item,label:metricLabels[item.key]??item.label})),
    affinities:feedback.affinities.map(item=>({...item,label:CivilizationPaths.displayName(item.pathId)})),
    additions:feedback.additions.map(item=>({
      ...item,
      kindLabel:kinds[item.kind]??item.kindLabel,
      label:additionLabel(item.id,item.kind),
    })),
  };
}

export function buildDecisionFeedback(
  sequence:number,
  event:{id:string;title:string},
  choice:{label:string;index?:number},
  before:DecisionSnapshot,
  after:DecisionSnapshot,
):DecisionFeedback {
  const metrics:DecisionMetricDelta[]=[];
  const metricLabels:Readonly<Record<string,string>>=text().reports.decisionFeedback.metrics;
  let positive=false,negative=false;
  for(const definition of METRICS){
    const prior=before.metrics[definition.key]??0,current=after.metrics[definition.key]??0,delta=current-prior;
    if(Math.abs(delta)<.0001)continue;
    metrics.push({key:definition.key,label:metricLabels[definition.key]??definition.label,before:prior,after:current,delta});
    const beneficial=definition.inverse?delta<0:delta>0;
    if(beneficial)positive=true;else negative=true;
  }
  const affinityIds=new Set([...Object.keys(before.affinities),...Object.keys(after.affinities)]);
  const affinities=[...affinityIds].map(pathId=>({pathId,label:CivilizationPaths.displayName(pathId),delta:(after.affinities[pathId]??0)-(before.affinities[pathId]??0)})).filter(item=>Math.abs(item.delta)>=.0001);
  const additionsList=[
    ...additions(after.traits,before.traits,'trait'),
    ...additions(after.institutions,before.institutions,'institution'),
    ...additions(after.flags,before.flags,'flag'),
    ...additions(after.pathFlags,before.pathFlags,'path_flag'),
  ];
  if(additionsList.some(item=>item.kind==='trait'||item.kind==='institution'))positive=true;
  const consequence=buildDecisionConsequence(event.id,before,after,additionsList);
  return {
    sequence,
    eventId:event.id,
    choiceIndex:choice.index,
    eventTitle:event.title,
    choiceLabel:choice.label,
    tone:positive&&negative?'mixed':negative?'negative':positive?'positive':'mixed',
    metrics,
    affinities,
    additions:additionsList,
    consequence,
  };
}
