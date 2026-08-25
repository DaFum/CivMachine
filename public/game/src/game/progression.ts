import { evaluateMilestones } from './milestones.js';
import { directiveCopy, fill, matrixCopy, milestoneCopy, resourceName, text, upgradeCopy } from '../data/i18n.js';
import type { GameState, Layer } from './types.js';

const MACHINE: Record<string,{insight:number;resource?:string}> = {
  reality_lattice:{insight:0}, historical_compressor:{insight:0}, temporal_injector:{insight:0}, prediction_core:{insight:1,resource:'cognition'}, cognitive_extractor:{insight:4,resource:'cognition'}, paradox_sieve:{insight:5,resource:'paradox'}, awareness_scrubber:{insight:4,resource:'cognition'}, sanity_protocol:{insight:5,resource:'cognition'}, cosmic_muffling:{insight:6,resource:'paradox'}, contingency_vat:{insight:8,resource:'paradox'}, cultivation_accelerator:{insight:9,resource:'existence'}, existence_furnace:{insight:10,resource:'existence'}
};
const UNIVERSE: Record<string,{insight:number}> = { wide_lattice:{insight:7}, twin_harvest:{insight:8}, stable_constants:{insight:10}, archive_of_screams:{insight:11}, paradox_rights:{insight:12}, bureaucracy_of_gods:{insight:13}, residue_refinery:{insight:14}, inherited_time:{insight:15} };
const AXIOM: Record<string,{insight:number}> = { axiom_stability:{insight:18}, axiom_recursive_memory:{insight:19}, axiom_paradox_food:{insight:20}, axiom_compassionate_accounting:{insight:21}, axiom_impossible_birth:{insight:22}, axiom_multiple_choice:{insight:23} };
export const DIRECTIVE_INSIGHT:Record<string,number>={accelerated_development:3,cognitive_extraction:3,stable_cultivation:3,paradox_prospecting:8,quiet_machine:10,temporal_pressure:12};
export const MATRIX_INSIGHT:Record<string,number>={neural_bloom:7,industrial_genome:7,adaptive_aberration:7,museum_seed:11,lunar_synapse:13,post_causal_spore:15};
export const AXIOM_KNOWLEDGE:Record<string,number>={axiom_stability:18,axiom_recursive_memory:19,axiom_paradox_food:20,axiom_compassionate_accounting:21,axiom_impossible_birth:22,axiom_multiple_choice:23};

export class Progression {
  static machineInsight(state:GameState){ return state.meta.progression.machineInsight; }
  static systemUnlocked(state:GameState,id:string){ return state.meta.progression.unlockedSystems.includes(id); }
  static resourceDiscovered(state:GameState,id:string){ return state.meta.progression.discoveredResources.includes(id); }
  static canUseUpgrade(state:GameState,layer:Layer,id:string):boolean {
    const rules: Record<string,{insight:number;resource?:string}> = layer==='machine'?MACHINE:layer==='universe'?UNIVERSE:AXIOM; const rule=rules[id]; if(!rule)return false;
    if(layer==='universe'&&!this.systemUnlocked(state,'universe_upgrades'))return false;
    if(layer==='axiom'&&!this.systemUnlocked(state,'axioms'))return false;
    if(this.machineInsight(state)<rule.insight)return false;
    if('resource' in rule && rule.resource && !this.resourceDiscovered(state,rule.resource))return false;
    return true;
  }
  private static announce(state:GameState,id:string,msg:string,out:string[]){ if(state.meta.progression.announcedUnlocks.includes(id))return; state.meta.progression.announcedUnlocks.push(id); out.push(msg); }
  // `name` is the canonical English fallback; the announcement itself is read from the catalog, so a
  // resource identified in one language is not re-announced in another -- `announcedUnlocks` records
  // the id, never the sentence.
  private static discover(state:GameState,id:string,name:string,out:string[]){ if(this.resourceDiscovered(state,id))return; state.meta.progression.discoveredResources.push(id); this.announce(state,`resource:${id}`,fill(text().reports.progression.newResourceIdentified,{name:resourceName(id)??name}),out); }
  private static unlockSystem(state:GameState,id:string,out:string[]){ if(this.systemUnlocked(state,id))return; state.meta.progression.unlockedSystems.push(id); this.announce(state,`system:${id}`,fill(text().reports.progression.newSystemUnlocked,{name:this.systemName(id)}),out); }
  private static systemName(id:string){ const names:Readonly<Record<string,string>>=text().reports.progression.unlockSystemNames; return names[id]??id.replaceAll('_',' ').toUpperCase(); }
  // An unlocked option is announced by its name, not by its id spelled out: a matrix is a "Neural
  // Bloom Matrix" and an axiom has a full sentence for a name, neither of which survives being
  // reconstructed from the key. The humanized id remains the fallback.
  private static optionName(storage:'knownDirectives'|'knownBreedingMatrices'|'knownAxioms',id:string){
    const copy=storage==='knownDirectives'?directiveCopy(id):storage==='knownBreedingMatrices'?matrixCopy(id):upgradeCopy(id);
    return copy?.name??id.replaceAll('_',' ').toUpperCase();
  }
  private static refreshKnown(state:GameState,system:string,thresholds:Record<string,number>,storage:'knownDirectives'|'knownBreedingMatrices'|'knownAxioms',out:string[]){ if(!this.systemUnlocked(state,system))return; const known=state.meta.progression[storage]; for(const [id,need] of Object.entries(thresholds)) if(this.machineInsight(state)>=need&&!known.includes(id)){known.push(id);this.announce(state,`option:${id}`,fill(text().reports.progression.newOptionUnlocked,{name:this.optionName(storage,id)}),out);} }
  static refresh(state:GameState,out:string[]=[]){ const p=state.meta.progression; const insight=this.machineInsight(state); if(p.controlledHarvestsTotal>=2&&insight>=3)this.unlockSystem(state,'directives',out); if(state.machine.civilizationsTotal>=4||insight>=6)this.unlockSystem(state,'universe_prestige',out); if(state.meta.universesTotal>=1){this.unlockSystem(state,'universe_upgrades',out);if(insight>=7)this.unlockSystem(state,'breeding_matrices',out);} if(state.meta.universesTotal>=2)this.unlockSystem(state,'multiverse_prestige',out); if(state.meta.multiversesConsumed>=1&&insight>=18)this.unlockSystem(state,'axioms',out); this.refreshKnown(state,'directives',DIRECTIVE_INSIGHT,'knownDirectives',out); this.refreshKnown(state,'breeding_matrices',MATRIX_INSIGHT,'knownBreedingMatrices',out); this.refreshKnown(state,'axioms',AXIOM_KNOWLEDGE,'knownAxioms',out); return out; }
  static recordMilestones(state:GameState,convergenceUnlocked:boolean,out:string[]=[]){ const result=evaluateMilestones(state,convergenceUnlocked); for(const milestone of result.newlyCompleted) if(milestone.insight) out.push(fill(text().reports.progression.machineInsightAwarded,{amount:milestone.insight,title:milestoneCopy(milestone.id)?.title??milestone.title})); return this.refresh(state,out); }
  static recordCivilizationProgress(state:GameState,civ:{development:number;era:number;stats:{awareness:number}}){ const out:string[]=[]; if(civ.development>=70)this.discover(state,'cognition','Cognition',out); return this.recordMilestones(state,false,out); }
  static recordHarvest(state:GameState,record:any){ const out:string[]=[]; if(record.chaotic) state.meta.progression.chaoticHarvestsTotal++; else {state.meta.progression.controlledHarvestsTotal++; if(state.meta.progression.controlledHarvestsTotal>=1)this.discover(state,'paradox','Paradox',out);} if(Number(record.development??0)>=180)this.discover(state,'paradox','Paradox',out); return this.recordMilestones(state,false,out); }
  static recordUniverse(state:GameState){const out:string[]=[];if(state.meta.universesTotal>1){state.meta.progression.machineInsight++;out.push(fill(text().reports.progression.machineInsightAwarded,{amount:1,title:text().reports.progression.repeatedUniverseConsumption}));}this.discover(state,'existence','Existence',out);this.discover(state,'universal_residue','Universal Residue',out);return this.recordMilestones(state,false,out);}
  static recordMultiverse(state:GameState){const out:string[]=[];this.discover(state,'axioms','Axioms',out);return this.recordMilestones(state,false,out);}
  static visibleResourceKeys(state:GameState){return state.meta.progression.discoveredResources.slice();}
}

export interface VisibleUpgradeEntry { definition:any; status:'available'|'locked'; reason:string; }

export function progressionRulesForLayer(layer:Layer): Record<string,{insight:number;resource?:string}> {
  return layer==='machine'?MACHINE:layer==='universe'?UNIVERSE:AXIOM;
}

export function upgradeUnlockReason(state:GameState,layer:Layer,id:string):string {
  const copy=text().reports.progression;
  const rules=progressionRulesForLayer(layer); const rule=rules[id]; if(!rule)return copy.unknownProgressionRequirement;
  if(layer==='universe'&&!Progression.systemUnlocked(state,'universe_upgrades'))return copy.consumeFirstUniverse;
  if(layer==='axiom'&&!Progression.systemUnlocked(state,'axioms'))return copy.unlockAxiomaticManipulation;
  const req:string[]=[]; if(Progression.machineInsight(state)<rule.insight) req.push(fill(copy.machineInsightRequirement,{amount:rule.insight}));
  if(rule.resource&&!Progression.resourceDiscovered(state,rule.resource)) req.push(fill(copy.discoverResource,{resource:resourceName(rule.resource)??rule.resource.replaceAll('_',' ')}));
  return req.length?req.join(copy.requirementJoiner):copy.availableAfterRefresh;
}

export function visibleUpgradeEntries(state:GameState,layer:Layer,catalog:readonly any[]):VisibleUpgradeEntry[] {
  if(layer==='universe'&&!Progression.systemUnlocked(state,'universe_upgrades'))return [];
  if(layer==='axiom'&&!Progression.systemUnlocked(state,'axioms'))return [];
  const available:VisibleUpgradeEntry[]=[]; const locked:Array<VisibleUpgradeEntry&{threshold:number}>=[];
  const rules=progressionRulesForLayer(layer);
  for(const definition of catalog){const id=String(definition.id); if(Progression.canUseUpgrade(state,layer,id)) available.push({definition,status:'available',reason:''}); else locked.push({definition,status:'locked',reason:upgradeUnlockReason(state,layer,id),threshold:rules[id]?.insight??999});}
  locked.sort((a,b)=>a.threshold-b.threshold); available.push(...locked.slice(0,2).map(({threshold:_t,...entry})=>entry)); return available;
}

export function nextSystemPreviews(state:GameState):Array<{id:string;name:string;condition:string}> {
  const systems=text().reports.progression.systems;
  const candidates=[
    ['directives',3],['universe_prestige',6],['universe_upgrades',7],
    ['breeding_matrices',7],['multiverse_prestige',16],['axioms',18],
  ] as const;
  return candidates.filter(([id])=>!Progression.systemUnlocked(state,id)).sort((a,b)=>a[1]-b[1]).slice(0,2)
    .map(([id])=>({id,name:systems[id].name,condition:systems[id].condition}));
}
