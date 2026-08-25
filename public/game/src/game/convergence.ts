import { ERA_YEAR_THRESHOLDS } from './rules.js';
import { fill, text } from '../data/i18n.js';

export const CONVERGENCE_BASE_MILESTONES=21;
export const CONVERGENCE_MILESTONE_STEP=3;
export const CONVERGENCE_BASE_MULTIVERSES=2;
export const CONVERGENCE_MULTIVERSE_STEP=2;
export const CONVERGENCE_BASE_DEPTH=14;
export const CONVERGENCE_DEPTH_STEP=4;
export const CONVERGENCE_HARVEST_BONUS=.25;
export const CONVERGENCE_CONTAINMENT_BONUS=2;
export const TERMINAL_ERA=3;
export const TERMINAL_DEVELOPMENT=340;
// Index of 'ascendant' in HARVEST_GRADE_ORDER. Held as a constant rather than imported so this
// module stays free of the harvest catalog and can be reasoned about on its own.
export const CONVERGENCE_ASCENDANT_INDEX=3;

export interface AxiomLevelInput { id:string; level:number; maxLevel:number; }
export interface ConvergenceInput {
  milestonesCompleted:number; milestonesTotal:number; multiverses:number;
  axioms:ReadonlyArray<AxiomLevelInput>; bestGradeIndex:number; convergences:number;
}
export interface ConvergenceRequirement { id:string; label:string; current:number; target:number; met:boolean; }

const count=(value:number)=>Math.max(0,Math.trunc(Number(value)||0));

export function convergenceTargets(convergences:number){
  const n=count(convergences);
  return {
    milestones:CONVERGENCE_BASE_MILESTONES+CONVERGENCE_MILESTONE_STEP*n,
    multiverses:CONVERGENCE_BASE_MULTIVERSES+CONVERGENCE_MULTIVERSE_STEP*n,
    axiomLevel:1+n,
    depth:CONVERGENCE_BASE_DEPTH+CONVERGENCE_DEPTH_STEP*n,
  };
}

export function convergenceRequirements(input:ConvergenceInput):ConvergenceRequirement[]{
  const targets=convergenceTargets(input.convergences);
  const milestoneTarget=Math.min(input.milestonesTotal,targets.milestones);
  const axiomsMet=input.axioms.filter(a=>a.level>=Math.min(a.maxLevel,targets.axiomLevel)).length;
  const requirements=text().reports.convergence.requirements;
  const entries:ConvergenceRequirement[]=[
    {id:'milestones',label:requirements.milestones,current:count(input.milestonesCompleted),target:milestoneTarget,met:false},
    {id:'multiverses',label:requirements.multiverses,current:count(input.multiverses),target:targets.multiverses,met:false},
    {id:'axioms',label:fill(requirements.axioms,{level:targets.axiomLevel}),current:axiomsMet,target:input.axioms.length,met:false},
    {id:'grade',label:requirements.grade,current:Math.max(0,input.bestGradeIndex+1),target:CONVERGENCE_ASCENDANT_INDEX+1,met:false},
  ];
  for(const entry of entries)entry.met=entry.current>=entry.target;
  return entries;
}

export function convergenceUnlocked(input:ConvergenceInput):boolean{
  return convergenceRequirements(input).every(entry=>entry.met);
}

export function terminalCivilizationSetup(){
  return {era:TERMINAL_ERA,years:ERA_YEAR_THRESHOLDS[TERMINAL_ERA],development:TERMINAL_DEVELOPMENT};
}

export function evaluateConvergence(depth:number,chaotic:boolean,convergences:number):'won'|'failed'{
  if(chaotic)return 'failed';
  return (Number(depth)||0)>=convergenceTargets(convergences).depth?'won':'failed';
}

export function convergenceBonuses(convergences:number){
  const n=count(convergences);
  return {allHarvestMult:1+CONVERGENCE_HARVEST_BONUS*n,containment:CONVERGENCE_CONTAINMENT_BONUS*n};
}
