import { evaluateMilestones } from './milestones.js';
import { effectiveMaxSimulationSpeed, simulationSpeedInsightFor, SIMULATION_SPEED_STEPS } from './tactical-actions.js';
import { directiveCopy, fill, matrixCopy, milestoneCopy, resourceName, text, upgradeCopy } from '../data/i18n.js';
import type { GameState, Layer, ResourceKey } from './types.js';

const MACHINE: Record<string,{insight:number;resource?:string;universes?:number}> = {
  reality_lattice:{insight:0}, historical_compressor:{insight:0}, temporal_injector:{insight:0}, prediction_core:{insight:1,resource:'cognition'}, cognitive_extractor:{insight:4,resource:'cognition'}, paradox_sieve:{insight:5,resource:'paradox'}, awareness_scrubber:{insight:4,resource:'cognition'}, sanity_protocol:{insight:5,resource:'cognition'}, cosmic_muffling:{insight:6,resource:'paradox'}, contingency_vat:{insight:8,resource:'paradox'},
  // The two Existence modules are deliberately one progression step apart. Identifying Existence used
  // to open both in the same instant, and the Machine's whole Existence economy -- two families, six
  // levels between them -- became purchasable in the step that also revealed the currency. The
  // Accelerator arrives with the reveal because a new currency needs something to buy; the Furnace
  // waits for the first Universe, which is the next thing the player was already working toward.
  cultivation_accelerator:{insight:9,resource:'existence'}, existence_furnace:{insight:10,resource:'existence'}
};
// Machine Insight cannot pace the Universe layer, because a player who has earned a Universe has long
// since cleared every insight gate in it: measured, consuming the first Universe revealed one system,
// one currency and all eight upgrades in the same step. Universes consumed is the clock that actually
// ticks at this layer, so each Universe reveals two upgrades and the layer takes four to open. The
// insight numbers stay as a floor -- they are what stops a fast prestige from outrunning the Machine.
const UNIVERSE: Record<string,{insight:number;universes:number}> = {
  wide_lattice:{insight:7,universes:1}, twin_harvest:{insight:8,universes:1},
  stable_constants:{insight:10,universes:2}, archive_of_screams:{insight:11,universes:2},
  bureaucracy_of_gods:{insight:13,universes:3}, paradox_rights:{insight:12,universes:3},
  residue_refinery:{insight:14,universes:4}, inherited_time:{insight:15,universes:4},
};
const AXIOM: Record<string,{insight:number;universes?:number}> = { axiom_stability:{insight:18}, axiom_recursive_memory:{insight:19}, axiom_paradox_food:{insight:20}, axiom_compassionate_accounting:{insight:21}, axiom_impossible_birth:{insight:22}, axiom_multiple_choice:{insight:23} };

/** What one option inside an unlocked system asks for before the player may pick it. */
export interface OptionRule { insight:number; universes?:number }

export const DIRECTIVE_RULES:Readonly<Record<string,OptionRule>>={accelerated_development:{insight:3},cognitive_extraction:{insight:3},stable_cultivation:{insight:3},paradox_prospecting:{insight:8},quiet_machine:{insight:10},temporal_pressure:{insight:12}};
// Breeding Matrices are staggered over Universes for the same reason the Universe upgrades are.
// Machine Insight cannot pace them: measured on a fresh save, Insight passed 17 before the first
// Universe was consumed, so all six insight gates were already clear when the *system* unlocked at
// the second Universe -- the prestige that was meant to open one new decision emptied the whole
// catalog. Two per Universe from the second to the fourth; the insight numbers stay as a floor.
export const MATRIX_RULES:Readonly<Record<string,OptionRule>>={
  neural_bloom:{insight:7,universes:2}, industrial_genome:{insight:7,universes:2},
  adaptive_aberration:{insight:7,universes:3}, museum_seed:{insight:11,universes:3},
  lunar_synapse:{insight:13,universes:4}, post_causal_spore:{insight:15,universes:4},
};
export const AXIOM_RULES:Readonly<Record<string,OptionRule>>={axiom_stability:{insight:18},axiom_recursive_memory:{insight:19},axiom_paradox_food:{insight:20},axiom_compassionate_accounting:{insight:21},axiom_impossible_birth:{insight:22},axiom_multiple_choice:{insight:23}};

/**
 * A system's runtime requirement, as data.
 *
 * Until v1.20.1 the rules were an `if` chain in `refresh` and the sentences the interface showed were
 * hand-written strings in the catalog beside them, which is two sources of truth for one fact: the
 * preview promised Breeding Matrices after "your first Universe" while the chain asked for two, and
 * Multiverse prestige had moved to three Universes while its preview still said two. `refresh` and
 * `nextSystemPreviews` now read the same table, so a moved requirement cannot leave a stale promise
 * on screen -- the sentence is composed from the numbers the runtime checks.
 */
export type SystemRequirementKind = 'insight'|'universes'|'multiverses'|'controlledHarvests'|'civilizations';
export interface SystemRequirement { kind:SystemRequirementKind; amount:number }
export interface SystemRule {
  /** Where the system sits in the unlock ladder. The preview shows the next two by this order. */
  order:number;
  /** Every one of these must hold. */
  all?:readonly SystemRequirement[];
  /** At least one of these must hold. Empty means "no alternative route". */
  any?:readonly SystemRequirement[];
}

// The unlock ladder, staggered so that no prestige lands more than one new concept at a time.
// Until v1.20 the first Universe unlocked Universe upgrades *and* Breeding Matrices, revealed
// Existence *and* Universal Residue, and paid the four Machine Insight that made the next tier of
// Machine modules purchasable -- four independent systems in the step the player is least equipped
// to read. Universe upgrades are the reward for the first Universe and now arrive alone; Matrices
// wait for the second, and Multiverse prestige for the third, where it is still two Universes ahead
// of the four it needs.
export const SYSTEM_RULES:Readonly<Record<string,SystemRule>>={
  directives:{order:1,all:[{kind:'controlledHarvests',amount:2},{kind:'insight',amount:3}]},
  universe_prestige:{order:2,any:[{kind:'civilizations',amount:4},{kind:'insight',amount:6}]},
  universe_upgrades:{order:3,all:[{kind:'universes',amount:1}]},
  breeding_matrices:{order:4,all:[{kind:'universes',amount:2},{kind:'insight',amount:7}]},
  multiverse_prestige:{order:5,all:[{kind:'universes',amount:3}]},
  axioms:{order:6,all:[{kind:'multiverses',amount:1},{kind:'insight',amount:18}]},
};

export function systemRequirementValue(state:GameState,kind:SystemRequirementKind):number {
  switch(kind){
    case 'insight': return state.meta.progression.machineInsight;
    case 'universes': return state.meta.universesTotal;
    case 'multiverses': return state.meta.multiversesConsumed;
    case 'controlledHarvests': return state.meta.progression.controlledHarvestsTotal;
    case 'civilizations': return state.machine.civilizationsTotal;
  }
}

export function systemRuleMet(state:GameState,rule:SystemRule):boolean {
  if((rule.all??[]).some(req=>systemRequirementValue(state,req.kind)<req.amount))return false;
  const any=rule.any??[];
  return any.length===0||any.some(req=>systemRequirementValue(state,req.kind)>=req.amount);
}

/** The clause a requirement reads as, in the active locale. Ids are structure; this is copy. */
export function systemRequirementText(req:SystemRequirement):string {
  const clauses=text().reports.progression.requirementClauses[req.kind];
  return fill(req.amount===1?clauses.one:clauses.many,{amount:req.amount});
}

export function systemConditionText(rule:SystemRule):string {
  const copy=text().reports.progression;
  const parts=(rule.all??[]).map(systemRequirementText);
  const any=rule.any??[];
  if(any.length)parts.push(any.map(systemRequirementText).join(copy.requirementAnyJoiner));
  if(!parts.length)return copy.availableAfterRefresh;
  // The clauses are written to be joined mid-sentence, so the composed sentence capitalizes its own
  // first letter rather than each clause carrying a second, sentence-initial form of itself. A clause
  // that already starts with a digit -- "2 Universes verbrauchen" -- is unaffected.
  const sentence=fill(copy.requirementSentence,{requirements:parts.join(copy.requirementAllJoiner)});
  return sentence.charAt(0).toLocaleUpperCase()+sentence.slice(1);
}

export class Progression {
  static machineInsight(state:GameState){ return state.meta.progression.machineInsight; }
  static systemUnlocked(state:GameState,id:string){ return state.meta.progression.unlockedSystems.includes(id); }
  static resourceDiscovered(state:GameState,id:string){ return state.meta.progression.discoveredResources.includes(id); }
  /**
   * What a harvest is allowed to bank: a resource the Machine has not identified yet pays nothing.
   *
   * Until v1.20.1 every harvest credited all four currencies from the first run, so Existence
   * accumulated silently for the whole Expansion game -- measured, 1714 units were already in the
   * bank when Transcendence finally named it, and the reveal came with several runs of purchasing
   * power attached. The rewards the report prints are the gated ones, so the account and the bank
   * still cannot disagree.
   */
  static payableRewards(state:GameState,rewards:Record<ResourceKey,number>):Record<ResourceKey,number>{
    const out={} as Record<ResourceKey,number>;
    for(const key of Object.keys(rewards) as ResourceKey[]) out[key]=this.resourceDiscovered(state,key)?rewards[key]:0;
    return out;
  }
  static canUseUpgrade(state:GameState,layer:Layer,id:string):boolean {
    const rules: Record<string,ProgressionRule> = layer==='machine'?MACHINE:layer==='universe'?UNIVERSE:AXIOM; const rule=rules[id]; if(!rule)return false;
    if(layer==='universe'&&!this.systemUnlocked(state,'universe_upgrades'))return false;
    if(layer==='axiom'&&!this.systemUnlocked(state,'axioms'))return false;
    if(this.machineInsight(state)<rule.insight)return false;
    if(rule.universes!==undefined&&state.meta.universesTotal<rule.universes)return false;
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
  private static refreshKnown(state:GameState,system:string,rules:Readonly<Record<string,OptionRule>>,storage:'knownDirectives'|'knownBreedingMatrices'|'knownAxioms',out:string[]){ if(!this.systemUnlocked(state,system))return; const known=state.meta.progression[storage]; const knownSet=new Set(known); for(const [id,rule] of Object.entries(rules)){ if(knownSet.has(id))continue; if(this.machineInsight(state)<rule.insight)continue; if(rule.universes!==undefined&&state.meta.universesTotal<rule.universes)continue; known.push(id); knownSet.add(id); this.announce(state,`option:${id}`,fill(text().reports.progression.newOptionUnlocked,{name:this.optionName(storage,id)}),out); } }
  /**
   * The permanent capabilities Machine Insight buys outright.
   *
   * Simulation speed is progression, not an upgrade, so nothing announces it: the 2x and 4x buttons
   * simply appeared in the rail the moment the insight gate was cleared, which reads as an accident
   * rather than as something earned. Announced once per step, by the same `announcedUnlocks` ledger
   * every other unlock uses, and measured against the speed the save can actually run at -- a v4 save
   * that bought its speed from Temporal Injector owns it without having earned the insight.
   */
  private static refreshCapabilities(state:GameState,out:string[]){
    const copy=text().reports.progression;
    const speed=effectiveMaxSimulationSpeed(this.machineInsight(state),state.meta.progression.simulationSpeedUnlocked??1);
    for(const step of SIMULATION_SPEED_STEPS){
      if(simulationSpeedInsightFor(step)===0||speed<step)continue;
      this.announce(state,`capability:simulation_speed_${step}`,fill(copy.newCapabilityUnlocked,{name:fill(copy.capabilities.simulationSpeed,{speed:step}),note:copy.capabilityNotes.simulationSpeed}),out);
    }
  }
  static refresh(state:GameState,out:string[]=[]){ for(const [id,rule] of this.orderedSystems()) if(systemRuleMet(state,rule)) this.unlockSystem(state,id,out); this.refreshKnown(state,'directives',DIRECTIVE_RULES,'knownDirectives',out); this.refreshKnown(state,'breeding_matrices',MATRIX_RULES,'knownBreedingMatrices',out); this.refreshKnown(state,'axioms',AXIOM_RULES,'knownAxioms',out); this.refreshCapabilities(state,out); return out; }
  private static orderedSystems():Array<[string,SystemRule]>{ return Object.entries(SYSTEM_RULES).sort((a,b)=>a[1].order-b[1].order); }
  static recordMilestones(state:GameState,convergenceUnlocked:boolean,out:string[]=[]){ const result=evaluateMilestones(state,convergenceUnlocked); for(const milestone of result.newlyCompleted) if(milestone.insight) out.push(fill(text().reports.progression.machineInsightAwarded,{amount:milestone.insight,title:milestoneCopy(milestone.id)?.title??milestone.title})); return this.refresh(state,out); }
  // Existence is earned by every harvest long before it is named, so naming it at the first Universe
  // spent a reveal the player had already paid for -- inside the busiest step in the game. Carrying a
  // civilization into Transcendence is its own moment and now carries its own resource.
  static recordCivilizationProgress(state:GameState,civ:{development:number;era:number;stats:{awareness:number}}){ const out:string[]=[]; if(civ.development>=70)this.discover(state,'cognition','Cognition',out); if(civ.era>=2)this.discover(state,'existence','Existence',out); return this.recordMilestones(state,false,out); }
  static recordHarvest(state:GameState,record:any){ const out:string[]=[]; if(record.chaotic) state.meta.progression.chaoticHarvestsTotal++; else {state.meta.progression.controlledHarvestsTotal++; if(state.meta.progression.controlledHarvestsTotal>=1)this.discover(state,'paradox','Paradox',out);} if(Number(record.development??0)>=180)this.discover(state,'paradox','Paradox',out); return this.recordMilestones(state,false,out); }
  static recordUniverse(state:GameState){const out:string[]=[];if(state.meta.universesTotal>1){state.meta.progression.machineInsight++;out.push(fill(text().reports.progression.machineInsightAwarded,{amount:1,title:text().reports.progression.repeatedUniverseConsumption}));}this.discover(state,'existence','Existence',out);this.discover(state,'universal_residue','Universal Residue',out);return this.recordMilestones(state,false,out);}
  static recordMultiverse(state:GameState){const out:string[]=[];this.discover(state,'axioms','Axioms',out);return this.recordMilestones(state,false,out);}
  static visibleResourceKeys(state:GameState){return state.meta.progression.discoveredResources.slice();}
}

export interface VisibleUpgradeEntry { definition:any; status:'available'|'locked'; reason:string; }

export interface ProgressionRule { insight:number; resource?:string; universes?:number; }

export function progressionRulesForLayer(layer:Layer): Record<string,ProgressionRule> {
  return layer==='machine'?MACHINE:layer==='universe'?UNIVERSE:AXIOM;
}

export function upgradeUnlockReason(state:GameState,layer:Layer,id:string):string {
  const copy=text().reports.progression;
  const rules=progressionRulesForLayer(layer); const rule=rules[id]; if(!rule)return copy.unknownProgressionRequirement;
  if(layer==='universe'&&!Progression.systemUnlocked(state,'universe_upgrades'))return copy.consumeFirstUniverse;
  if(layer==='axiom'&&!Progression.systemUnlocked(state,'axioms'))return copy.unlockAxiomaticManipulation;
  const req:string[]=[]; if(Progression.machineInsight(state)<rule.insight) req.push(fill(copy.machineInsightRequirement,{amount:rule.insight}));
  if(rule.universes!==undefined&&state.meta.universesTotal<rule.universes) req.push(fill(copy.universesRequirement,{amount:rule.universes}));
  if(rule.resource&&!Progression.resourceDiscovered(state,rule.resource)) req.push(fill(copy.discoverResource,{resource:resourceName(rule.resource)??rule.resource.replaceAll('_',' ')}));
  return req.length?req.join(copy.requirementJoiner):copy.availableAfterRefresh;
}

function createUpgradeEntry(definition: any, status: 'available'|'locked', reason: string): VisibleUpgradeEntry {
  const copy = upgradeCopy(String(definition.id));
  const localizedDefinition = copy
    ? { ...definition, name: copy.name, description: copy.description }
    : definition;
  return { definition: localizedDefinition, status, reason };
}

export function visibleUpgradeEntries(state:GameState,layer:Layer,catalog:readonly any[]):VisibleUpgradeEntry[] {
  if(layer==='universe'&&!Progression.systemUnlocked(state,'universe_upgrades'))return [];
  if(layer==='axiom'&&!Progression.systemUnlocked(state,'axioms'))return [];
  const available:VisibleUpgradeEntry[]=[]; const locked:Array<{entry:VisibleUpgradeEntry;threshold:number}>=[];
  const rules=progressionRulesForLayer(layer);
  for(const definition of catalog){
    const id=String(definition.id);
    if(Progression.canUseUpgrade(state,layer,id)) {
      available.push(createUpgradeEntry(definition, 'available', ''));
    } else {
      const entry = createUpgradeEntry(definition, 'locked', upgradeUnlockReason(state,layer,id));
      locked.push({ entry, threshold: rules[id]?.insight??999 });
    }
  }
  locked.sort((a,b)=>a.threshold-b.threshold);
  const count = Math.min(locked.length, 2);
  for(let i=0; i<count; i++){
    available.push(locked[i]!.entry);
  }
  return available;
}

// The conditions are composed from `SYSTEM_RULES`, never authored beside them: what the panel
// promises is what `refresh` checks, by construction.
export function nextSystemPreviews(state:GameState):Array<{id:string;name:string;condition:string}> {
  const systems:Readonly<Record<string,{name:string}>>=text().reports.progression.systems;
  return Object.entries(SYSTEM_RULES)
    .filter(([id])=>!Progression.systemUnlocked(state,id))
    .sort((a,b)=>a[1].order-b[1].order).slice(0,2)
    .map(([id,rule])=>({id,name:systems[id].name,condition:systemConditionText(rule)}));
}
