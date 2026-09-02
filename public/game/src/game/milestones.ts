import { gradeIndex, HARVEST_GRADE_LABELS, HARVEST_GRADE_ORDER } from './harvest-quality.js';
import { eraName, harvestGradeLabel, milestoneCopy, text } from '../data/i18n.js';
import { ERA_IDS } from './rules.js';
import type { GameState } from './types.js';

export type MilestoneGroup = 'CULTIVATION' | 'HARVEST' | 'PATHS' | 'PRESTIGE' | 'CONVERGENCE';

/**
 * How a milestone's progress reads.
 *
 * `count` is a real tally -- three of ten controlled harvests, four of six paths -- and prints as
 * `3 / 10`. The other two are ordinals wearing a counter's clothes: `era_transcendence` has target 2
 * because Transcendence *is* era 2, and `harvest_ascendant` has target 3 because Ascendant is the
 * fourth grade. Printed as `current / target` those read as "2 of 3 tasks done", which is neither
 * what they mean nor something a player can act on. An ordinal milestone names the state the save is
 * on and the state it is reaching for instead.
 */
export type MilestoneDisplay = 'count' | 'era' | 'grade';

export interface MilestoneSnapshot {
  development:number; era:number; awareness:number; runSeconds:number; endgamesInRun:number;
  controlledHarvests:number; bestGradeIndex:number; objectivesCompleted:number;
  seenPaths:number; universes:number; multiverses:number; resources:number; axiomsAtLevelOne:number;
  convergenceUnlocked:number; convergences:number;
}

export interface MilestoneDefinition {
  id:string; title:string; description:string; group:MilestoneGroup; insight:number; target:number;
  current(snapshot:MilestoneSnapshot):number;
  /** Defaults to 'count'. Only the era and harvest-grade ladders are ordinals. */
  display?:MilestoneDisplay;
}

export interface MilestoneView {
  id:string; title:string; description:string; group:MilestoneGroup; insight:number;
  current:number; target:number; completed:boolean;
  display:MilestoneDisplay;
  /** For an ordinal milestone: the state the save is on, and the state the milestone asks for. */
  currentLabel:string; targetLabel:string;
  /** The word that introduces `currentLabel` -- CURRENT for an era, BEST for a harvest grade. */
  currentTerm:string; targetTerm:string;
}

const RESOURCE_IDS=['causal_mass','cognition','paradox','existence'];

export const MILESTONE_CATALOG:ReadonlyArray<MilestoneDefinition>=[
  {id:'development_70',title:'First Complexity',description:'Bring a civilization to Development 70.',group:'CULTIVATION',insight:1,target:70,current:s=>s.development},
  {id:'development_180',title:'Industrial Depth',description:'Bring a civilization to Development 180.',group:'CULTIVATION',insight:1,target:180,current:s=>s.development},
  {id:'development_340',title:'Post-Scarcity Yield',description:'Bring a civilization to Development 340.',group:'CULTIVATION',insight:2,target:340,current:s=>s.development},
  {id:'development_600',title:'Runaway Cultivation',description:'Bring a civilization to Development 600.',group:'CULTIVATION',insight:2,target:600,current:s=>s.development},
  {id:'development_1000',title:'Terminal Complexity',description:'Bring a civilization to Development 1000.',group:'CULTIVATION',insight:3,target:1000,current:s=>s.development},
  {id:'era_expansion',title:'Expansion Reached',description:'Carry a civilization into the Expansion era.',group:'CULTIVATION',insight:1,target:1,current:s=>s.era,display:'era'},
  {id:'era_transcendence',title:'Transcendence Reached',description:'Carry a civilization into the Transcendence era.',group:'CULTIVATION',insight:2,target:2,current:s=>s.era,display:'era'},
  {id:'era_apotheosis',title:'Apotheosis Reached',description:'Carry a civilization into the Apotheosis era.',group:'CULTIVATION',insight:2,target:3,current:s=>s.era,display:'era'},
  {id:'awareness_50',title:'The Crop Looks Up',description:'Let Machine Awareness reach 50 in a single run.',group:'CULTIVATION',insight:1,target:50,current:s=>s.awareness},
  {id:'endurance_900',title:'Held Together',description:'Keep one civilization alive for 900 seconds.',group:'CULTIVATION',insight:2,target:900,current:s=>s.runSeconds},
  {id:'controlled_harvest_1',title:'First Controlled Harvest',description:'Complete one controlled harvest.',group:'HARVEST',insight:2,target:1,current:s=>s.controlledHarvests},
  {id:'controlled_harvest_2',title:'Repeatable Yield',description:'Complete two controlled harvests.',group:'HARVEST',insight:2,target:2,current:s=>s.controlledHarvests},
  {id:'controlled_harvest_10',title:'Standing Practice',description:'Complete ten controlled harvests.',group:'HARVEST',insight:1,target:10,current:s=>s.controlledHarvests},
  {id:'harvest_transcendent',title:'Transcendent Harvest',description:'Record a Transcendent harvest grade.',group:'HARVEST',insight:1,target:2,current:s=>s.bestGradeIndex,display:'grade'},
  {id:'harvest_ascendant',title:'Ascendant Harvest',description:'Record an Ascendant harvest grade.',group:'HARVEST',insight:2,target:3,current:s=>s.bestGradeIndex,display:'grade'},
  {id:'harvest_singular',title:'Singular Harvest',description:'Record a Singular harvest grade.',group:'HARVEST',insight:4,target:4,current:s=>s.bestGradeIndex,display:'grade'},
  {id:'directive_objectives_5',title:'Compliant Cultivator',description:'Complete five Directive objectives.',group:'HARVEST',insight:1,target:5,current:s=>s.objectivesCompleted},
  {id:'paths_seen_3',title:'Three Doctrines',description:'See three different civilization paths become dominant.',group:'PATHS',insight:1,target:3,current:s=>s.seenPaths},
  {id:'paths_seen_6',title:'Six Doctrines',description:'See six different civilization paths become dominant.',group:'PATHS',insight:1,target:6,current:s=>s.seenPaths},
  {id:'paths_seen_10',title:'Every Doctrine',description:'See all ten civilization paths become dominant.',group:'PATHS',insight:4,target:10,current:s=>s.seenPaths},
  {id:'endgames_in_run_4',title:'Fourfold End-State',description:'Reach four path end-states inside one run.',group:'PATHS',insight:3,target:4,current:s=>s.endgamesInRun},
  {id:'first_universe',title:'First Universe Consumed',description:'Consume a Universe.',group:'PRESTIGE',insight:4,target:1,current:s=>s.universes},
  {id:'first_multiverse',title:'First Multiverse Collapsed',description:'Collapse a Multiverse.',group:'PRESTIGE',insight:6,target:1,current:s=>s.multiverses},
  {id:'second_multiverse',title:'Second Multiverse Collapsed',description:'Collapse a second Multiverse.',group:'PRESTIGE',insight:3,target:2,current:s=>s.multiverses},
  {id:'all_resources',title:'Full Spectrum',description:'Identify all four harvest resources.',group:'PRESTIGE',insight:1,target:4,current:s=>s.resources},
  {id:'axioms_all_level_1',title:'Axiomatic Command',description:'Install every Axiom upgrade at least once.',group:'PRESTIGE',insight:3,target:6,current:s=>s.axiomsAtLevelOne},
  {id:'convergence_gate',title:'Convergence Authorized',description:'Meet every requirement of the Great Convergence.',group:'CONVERGENCE',insight:3,target:1,current:s=>s.convergenceUnlocked},
  {id:'first_convergence',title:'The Great Convergence',description:'Win the Great Convergence.',group:'CONVERGENCE',insight:5,target:1,current:s=>s.convergences},
];

export function milestoneSnapshot(state:GameState,convergenceUnlocked:boolean):MilestoneSnapshot{
  const p=state.meta.progression; const civ=state.civilization;
  const endgames=civ?.pathState?.endgameStates?.length??0;
  return {
    development:Math.max(p.maxDevelopment,civ?.development??0),
    era:Math.max(p.maxEra,civ?.era??0),
    awareness:civ?.stats.awareness??0,
    runSeconds:Math.max(p.longestRunSeconds,civ?.elapsedSeconds??0),
    endgamesInRun:Math.max(p.maxEndgamesInRun,endgames),
    controlledHarvests:p.controlledHarvestsTotal,
    bestGradeIndex:gradeIndex(p.bestGrade),
    objectivesCompleted:p.objectivesCompleted,
    seenPaths:p.seenDominantPaths.length,
    universes:state.meta.universesTotal,
    multiverses:state.meta.multiversesConsumed,
    resources:RESOURCE_IDS.filter(id=>p.discoveredResources.includes(id)).length,
    axiomsAtLevelOne:Object.values(state.meta.axiomLevels).filter(level=>Number(level)>=1).length,
    convergenceUnlocked:convergenceUnlocked?1:0,
    convergences:state.meta.convergences,
  };
}

// Called from the tick path, so it walks only the open milestones and allocates the snapshot only
// once something is still open. A save with every milestone recorded does no work at all.
export function evaluateMilestones(state:GameState,convergenceUnlocked:boolean):{newlyCompleted:MilestoneDefinition[];insightAwarded:number}{
  const done=state.meta.progression.milestones;
  let snapshot:MilestoneSnapshot|null=null;
  const newlyCompleted:MilestoneDefinition[]=[]; let insightAwarded=0;
  for(const milestone of MILESTONE_CATALOG){
    if(done[milestone.id])continue;
    if(!snapshot)snapshot=milestoneSnapshot(state,convergenceUnlocked);
    if(milestone.current(snapshot)<milestone.target)continue;
    done[milestone.id]=true; state.meta.progression.machineInsight+=milestone.insight;
    insightAwarded+=milestone.insight; newlyCompleted.push(milestone);
  }
  return {newlyCompleted,insightAwarded};
}

// Ordinal ladders, named. An era ordinal *is* an index into `ERA_IDS` and a grade ordinal an index
// into `HARVEST_GRADE_ORDER`, so each label is a lookup into the ladder the rule already uses rather
// than a second table beside it that can drift from it.
function eraOrdinalLabel(index:number):string{
  const id=ERA_IDS[Math.max(0,Math.min(ERA_IDS.length-1,Math.trunc(index)))]!;
  return (eraName(id)??id).toUpperCase();
}
function gradeOrdinalLabel(index:number):string{
  if(index<0)return text().ui.app.milestoneNoGradeYet;
  const grade=HARVEST_GRADE_ORDER[Math.min(HARVEST_GRADE_ORDER.length-1,Math.max(0,Math.trunc(index)))]!;
  return (harvestGradeLabel(grade)??HARVEST_GRADE_LABELS[grade]).toUpperCase();
}

export function milestoneProgress(state:GameState,convergenceUnlocked:boolean):MilestoneView[]{
  const snapshot=milestoneSnapshot(state,convergenceUnlocked); const done=state.meta.progression.milestones;
  const app=text().ui.app;
  return MILESTONE_CATALOG.map(milestone=>{
    const completed=Boolean(done[milestone.id]);
    const raw=completed?milestone.target:milestone.current(snapshot);
    const current=Math.max(0,Math.min(milestone.target,Math.floor(raw)));
    const copy=milestoneCopy(milestone.id);
    const display=milestone.display??'count';
    return {
      id:milestone.id,title:copy?.title??milestone.title,description:copy?.description??milestone.description,
      group:milestone.group,insight:milestone.insight,current,target:milestone.target,completed,display,
      currentLabel:display==='era'?eraOrdinalLabel(raw):display==='grade'?gradeOrdinalLabel(Math.floor(raw)):'',
      targetLabel:display==='era'?eraOrdinalLabel(milestone.target):display==='grade'?gradeOrdinalLabel(milestone.target):'',
      currentTerm:display==='grade'?app.milestoneBest:app.milestoneCurrent,
      targetTerm:app.milestoneTarget,
    };
  });
}

export function completedMilestoneCount(state:GameState):number{
  const done=state.meta.progression.milestones;
  return MILESTONE_CATALOG.filter(m => done[m.id]).length;
}
