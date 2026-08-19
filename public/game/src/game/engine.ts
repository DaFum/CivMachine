import { CONTENT } from '../data/content.generated.js';
import { applyInterventionCopy } from '../data/intervention-copy.js';
import { ENTROPY_CRISES } from '../data/entropy-crises.js';
import { CivilizationPaths } from './paths.js';
import { Progression, nextSystemPreviews, visibleUpgradeEntries } from './progression.js';
import { ERA_YEAR_THRESHOLDS, RESOURCE_KEYS, SAVE_VERSION, calculateHarvest, createNewState, eraForYears, multiverseAxiomAward, universeResidueAward, upgradeCost } from './rules.js';
import { buildInterventionPool, chooseWeightedIntervention, eventDelayWindow, recentEventIds, recordRecentIntervention } from './intervention-scheduler.js';
import { buildDecisionFeedback, captureDecisionSnapshot } from './decision-feedback.js';
import { advancePressure, cascadeDecay } from './pressure.js';
import { TACTICAL_ACTIONS, applyTacticalAction, tacticalAvailability } from './tactical-actions.js';
import { applyHarvestQuality, calculateCultivationCredits, evaluateHarvestQuality } from './harvest-quality.js';
import { buildDirectiveOffers, evaluateDirectiveObjective, objectiveForDirective } from './run-directives.js';
import { balancedAxiomUpgrades, balancedMachineUpgrades, balancedUniverseUpgrades } from './upgrade-balance.js';
import type { Civilization, DecisionFeedback, GameState, Layer, ResourceKey, RuntimeBonuses, StorageLike, TacticalActionId } from './types.js';

export const ERA_NAMES=['EMERGENCE','EXPANSION','TRANSCENDENCE','APOTHEOSIS'];
const SAVE_KEY='reality_consumption_engine_browser_save_v2';
const C:any=CONTENT;

function mixSeed(value:number):number{
  let mixed=value>>>0||0x52434531;
  mixed=Math.imul(mixed^(mixed>>>16),0x7feb352d);
  mixed=Math.imul(mixed^(mixed>>>15),0x846ca68b);
  return (mixed^(mixed>>>16))>>>0||0x6d2b79f5;
}

class SeededRng {
  state:number;
  constructor(seed:number){this.state=(seed>>>0)||0x6d2b79f5;}
  next(){let t=this.state+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
  range(min:number,max:number){return min+(max-min)*this.next();}
  int(min:number,max:number){return Math.floor(this.range(min,max+1));}
}

export interface EngineOptions { storage?: StorageLike; autosave?: boolean; }
export class GameEngine {
  state:GameState;
  storage:StorageLike;
  autosave:boolean;
  messages:string[]=[];
  decisionFeedback:DecisionFeedback|null=null;
  worldImpulse:DecisionFeedback|null=null;
  lastActionFailure='';
  private listeners=new Set<()=>void>();
  private tickEmitAccumulator=0;
  private feedbackSequence=0;
  private traits:any[]=C.traits; private events:any[]=[...applyInterventionCopy(C.events),...ENTROPY_CRISES]; private machineUpgrades:any[]=balancedMachineUpgrades(C.machine_upgrades); private universeUpgrades:any[]=balancedUniverseUpgrades(C.universe_upgrades); private axiomUpgrades:any[]=balancedAxiomUpgrades(C.axiom_upgrades); private directives:any[]=C.directives; private matrices:any[]=C.breeding_matrices; private mutations:any[]=C.mutations;
  constructor(options:EngineOptions={}){
    this.storage=options.storage ?? (globalThis.localStorage as StorageLike);
    this.autosave=options.autosave ?? true;
    this.state=this.load() ?? createNewState();
    if(this.state.civilization)recentEventIds(this.state.civilization);
    Progression.refresh(this.state,this.messages);
    if(this.state.phase==='machine'&&this.state.machine.runBuild.nextCivilizationSeed===0)this.prepareNextRun(0,false);
  }
  onChange(fn:()=>void){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  private emit(){for(const fn of this.listeners)fn();}
  private post(msg:string){this.messages.unshift(msg);this.messages=this.messages.slice(0,80);}
  save(){if(!this.autosave)return;this.state.saveVersion=SAVE_VERSION;this.storage.setItem(SAVE_KEY,JSON.stringify(this.state));}
  load():GameState|null{try{const raw=this.storage?.getItem(SAVE_KEY);if(!raw)return null;const parsed=JSON.parse(raw);if(parsed?.saveVersion!==SAVE_VERSION)return null;return parsed as GameState;}catch{return null;}}
  deleteSave(){this.storage.removeItem(SAVE_KEY);this.state=createNewState();this.messages=[];this.decisionFeedback=null;this.worldImpulse=null;this.prepareNextRun(0,false);this.save();this.emit();}
  reset(){this.state=createNewState();this.messages=[];this.decisionFeedback=null;this.worldImpulse=null;this.prepareNextRun(0,false);this.save();this.emit();}
  static baseBonuses():RuntimeBonuses{return {stabilityMax:100,predictionLevel:0,developmentMult:1,causal_massMult:1,cognitionMult:1,paradoxMult:1,existenceMult:1,awarenessGainMult:1,sanityLossMult:1,attentionGainMult:1,stabilityLossMult:1,stabilityDecayMult:1,eventDelay:0,startingEra:0,extraTraits:0,allHarvestMult:1,chaoticRetention:.4,containmentRating:0,controlRecharge:1,accelerateYears:200,accelerateTimer:8,gradeRewardMult:1};}
  static createCivilizationForTest(seed:number):Civilization {return {seed,rngState:seed,elapsedSeconds:0,years:0,era:0,development:1,developmentMultiplier:1,eventTimer:4,pendingEvent:'',lastEvent:'',eventCounts:{},recentEventIds:[],eventChoices:0,traits:[],institutions:[],flags:[],scheduledEvents:[],history:[],stats:{stability:100,stabilityMax:100,awareness:0,sanity:100,attention:0},harvestBonus:{causal_mass:0,cognition:0,paradox:0,existence:0},harvestMult:{causal_mass:1,cognition:1,paradox:1,existence:1},stabilityDecayMult:1,eventDelayBonus:0,predictionLevel:0,pathState:CivilizationPaths.newState(),tactical:{entropy:0,controlCapacity:3,triggeredCrises:[],probedEventId:'',actionUsage:{stabilize:0,accelerate:0,probe:0}},directiveId:'',directiveObjective:{id:'',completed:false}};}
  currentCivilization(){return this.state.civilization;}
  tacticalAvailability(id:TacticalActionId){const civ=this.state.civilization;return civ?tacticalAvailability(civ,id):{enabled:false,reason:'Start a civilization first.',cost:TACTICAL_ACTIONS[id].cost};}
  eventById(id:string){return this.events.find(e=>e.id===id)??null;}
  traitById(id:string){return this.traits.find(t=>t.id===id)??null;}
  upgradeById(layer:Layer,id:string){return this.catalog(layer).find((u:any)=>u.id===id)??null;}
  catalog(layer:Layer){return layer==='machine'?this.machineUpgrades:layer==='universe'?this.universeUpgrades:this.axiomUpgrades;}
  levels(layer:Layer){return layer==='machine'?this.state.machine.upgradeLevels:layer==='universe'?this.state.meta.universeUpgradeLevels:this.state.meta.axiomLevels;}
  upgradeLevel(layer:Layer,id:string){return Math.max(0,Number(this.levels(layer)[id]??0));}
  upgradeCost(layer:Layer,id:string){const d=this.upgradeById(layer,id);return d?upgradeCost(Number(d.base_cost),Number(d.growth),this.upgradeLevel(layer,id)):0;}
  currencyAmount(currency:string){if((RESOURCE_KEYS as string[]).includes(currency))return this.state.machine.currencies[currency as ResourceKey];if(currency==='universal_residue')return this.state.meta.universalResidue;if(currency==='axioms')return this.state.meta.axioms;return 0;}
  spendCurrency(currency:string,amount:number){if((RESOURCE_KEYS as string[]).includes(currency))this.state.machine.currencies[currency as ResourceKey]-=amount;else if(currency==='universal_residue')this.state.meta.universalResidue-=amount;else if(currency==='axioms')this.state.meta.axioms-=amount;}
  canPurchaseUpgrade(layer:Layer,id:string){const d=this.upgradeById(layer,id);if(!d||!Progression.canUseUpgrade(this.state,layer,id))return false;return this.upgradeLevel(layer,id)<Number(d.max_level)&&this.currencyAmount(String(d.currency))>=this.upgradeCost(layer,id);}
  purchaseUpgrade(layer:Layer,id:string){if(!this.canPurchaseUpgrade(layer,id))return false;const d=this.upgradeById(layer,id);const cost=this.upgradeCost(layer,id);this.spendCurrency(String(d.currency),cost);this.levels(layer)[id]=this.upgradeLevel(layer,id)+1;this.post(`Modification authorized: ${d.name} level ${this.levels(layer)[id]}.`);this.save();this.emit();return true;}
  visibleUpgradeEntries(layer:Layer){return visibleUpgradeEntries(this.state,layer,this.catalog(layer));}
  visibleResources(){return Progression.visibleResourceKeys(this.state);}
  nextPreviews(){return nextSystemPreviews(this.state);}
  systemUnlocked(id:string){return Progression.systemUnlocked(this.state,id);}
  resourceDiscovered(id:string){return Progression.resourceDiscovered(this.state,id);}
  machineInsight(){return Progression.machineInsight(this.state);}
  availableDirectives(){return this.directives.filter((d:any)=>this.state.machine.runBuild.directiveOfferIds.includes(d.id));}
  availableMatrices(){return this.matrices.filter((d:any)=>this.state.meta.progression.knownBreedingMatrices.includes(d.id));}
  selectDirective(id:string){const r=this.state.machine.runBuild;if(!this.systemUnlocked('directives')||r.directiveLocked||!r.directiveOfferIds.includes(id))return false;const d=this.directives.find((x:any)=>x.id===id);if(!d)return false;r.selectedDirective=id;r.directiveLocked=true;this.post(`DIRECTIVE LOCKED FOR THE NEXT CIVILIZATION: ${d.name}`);this.save();this.emit();return true;}
  selectBreedingMatrix(id:string){const r=this.state.machine.runBuild;if(!this.systemUnlocked('breeding_matrices')||r.matrixLocked||!this.state.meta.progression.knownBreedingMatrices.includes(id))return false;const d=this.matrices.find((x:any)=>x.id===id);if(!d)return false;r.selectedBreedingMatrix=id;r.matrixLocked=true;r.previewTraitIds=this.buildTraitSelection(r.nextCivilizationSeed).ids;this.post(`BREEDING MATRIX LOCKED FOR THIS UNIVERSE: ${d.name}`);this.save();this.emit();return true;}
  prepareNextRun(seed=0,notify=true){
    const r=this.state.machine.runBuild;
    if(!seed&&r.nextCivilizationSeed&&r.previewTraitIds.length)return true;
    const basis=seed||mixSeed(0x52434531+this.state.machine.civilizationsTotal*0x9e3779b9+this.state.meta.universesTotal*97);
    r.nextCivilizationSeed=basis>>>0||0x52434531;
    r.directiveOfferIds=buildDirectiveOffers(this.state.meta.progression.knownDirectives,r.nextCivilizationSeed,3);
    r.selectedDirective='';r.directiveLocked=false;
    r.previewTraitIds=this.buildTraitSelection(r.nextCivilizationSeed).ids;
    if(notify){this.save();this.emit();}
    return true;
  }
  runtimeBonuses():RuntimeBonuses {
    const l=(layer:Layer,id:string)=>this.upgradeLevel(layer,id);
    const containmentRating=['reality_lattice','awareness_scrubber','sanity_protocol','cosmic_muffling'].reduce((sum,id)=>sum+l('machine',id),0)+l('universe','stable_constants');
    const temporalLevel=Math.max(0,Math.min(3,l('machine','temporal_injector')));
    const bureaucracyLevel=l('universe','bureaucracy_of_gods');
    const gradeModules=['historical_compressor','cognitive_extractor','paradox_sieve','existence_furnace'].filter(id=>l('machine',id)>=3).length;
    const b:RuntimeBonuses={stabilityMax:100+10*l('machine','reality_lattice')+20*l('universe','wide_lattice')+25*l('axiom','axiom_stability'),predictionLevel:l('machine','prediction_core'),developmentMult:1+.12*l('machine','cultivation_accelerator'),causal_massMult:1+.12*l('machine','historical_compressor'),cognitionMult:1+.12*l('machine','cognitive_extractor'),paradoxMult:(1+.15*l('machine','paradox_sieve'))*(1+.25*l('universe','paradox_rights')),existenceMult:1+.12*l('machine','existence_furnace'),awarenessGainMult:Math.max(.45,1-.08*l('machine','awareness_scrubber')),sanityLossMult:Math.max(.45,1-.08*l('machine','sanity_protocol')),attentionGainMult:Math.max(.45,1-.08*l('machine','cosmic_muffling')),stabilityLossMult:1,stabilityDecayMult:1,eventDelay:0,startingEra:l('universe','inherited_time'),extraTraits:l('universe','archive_of_screams'),allHarvestMult:(1+.10*l('universe','twin_harvest'))*(1+.15*l('axiom','axiom_recursive_memory')),chaoticRetention:Math.min(.95,.4+.08*l('machine','contingency_vat')+.10*l('axiom','axiom_compassionate_accounting')),containmentRating,controlRecharge:1+(bureaucracyLevel>=1?1:0)+(bureaucracyLevel>=3?1:0),accelerateYears:[200,260,340,450][temporalLevel]!,accelerateTimer:[8,10,13,16][temporalLevel]!,gradeRewardMult:1+gradeModules*.025};
    const selected=[this.state.machine.runBuild.selectedDirective,this.state.machine.runBuild.selectedBreedingMatrix];
    for(const id of selected){if(!id)continue;const def=this.directives.find((x:any)=>x.id===id)??this.matrices.find((x:any)=>x.id===id);for(const [key,val] of Object.entries(def?.effects??{})){if(key==='trait_bias')continue;const map:Record<string,keyof RuntimeBonuses>={development_mult:'developmentMult',causal_mass_mult:'causal_massMult',cognition_mult:'cognitionMult',paradox_mult:'paradoxMult',existence_mult:'existenceMult',awareness_gain_mult:'awarenessGainMult',sanity_loss_mult:'sanityLossMult',attention_gain_mult:'attentionGainMult',stability_decay_mult:'stabilityDecayMult',all_harvest_mult:'allHarvestMult'};const target=map[key];if(target)(b[target] as number)=(b[target] as number)*Number(val);}}
    return b;
  }
  traitWeight(id:string){const matrixId=this.state.machine.runBuild.selectedBreedingMatrix;if(!matrixId)return 1;const matrix=this.matrices.find((x:any)=>x.id===matrixId);return (matrix?.effects?.trait_bias??[]).includes(id)?3:1;}
  startCivilization(requestedSeed=0){if(this.state.phase!=='machine')return false;const run=this.state.machine.runBuild;if(this.systemUnlocked('directives')&&run.directiveOfferIds.length&&!run.selectedDirective){this.lastActionFailure='Select one Directive before starting the Civilization.';this.emit();return false;}this.decisionFeedback=null;this.worldImpulse=null;this.lastActionFailure='';const seed=requestedSeed||run.nextCivilizationSeed||mixSeed(Date.now());const selection=this.buildTraitSelection(seed);const usePreview=seed===run.nextCivilizationSeed&&run.previewTraitIds.length>0;const traitIds=usePreview?[...run.previewTraitIds]:selection.ids;const bonuses=this.runtimeBonuses();const era=Math.max(0,Math.min(2,Math.trunc(bonuses.startingEra)));const civ=GameEngine.createCivilizationForTest(seed);civ.rngState=selection.rngState;civ.years=ERA_YEAR_THRESHOLDS[era]!;civ.era=era;civ.development=1+era*80;civ.developmentMultiplier=bonuses.developmentMult;civ.eventTimer=4;civ.stats.stability=bonuses.stabilityMax;civ.stats.stabilityMax=bonuses.stabilityMax;civ.harvestMult={causal_mass:bonuses.causal_massMult,cognition:bonuses.cognitionMult,paradox:bonuses.paradoxMult,existence:bonuses.existenceMult};civ.stabilityDecayMult=bonuses.stabilityDecayMult;civ.eventDelayBonus=bonuses.eventDelay;civ.predictionLevel=bonuses.predictionLevel;civ.directiveId=run.selectedDirective;const objective=objectiveForDirective(civ.directiveId);civ.directiveObjective={id:objective?.id??'',completed:false};
    for(const id of traitIds){const trait=this.traitById(id);if(!trait)continue;civ.traits.push(id);this.applyEffects(civ,trait.effects,false);}
    for(const id of this.state.machine.activeMutations){const m=this.mutations.find((x:any)=>x.id===id);if(m)this.applyEffects(civ,m.effects,false);}this.state.machine.activeMutations=[];this.appendHistory(civ,`YEAR ${Math.trunc(civ.years)}: Cultivation begins. Traits: ${civ.traits.map(id=>this.traitById(id)?.name??id).join(', ')}`);this.state.civilization=civ;this.state.phase='civilization';this.state.simulationSpeed=1;this.post(`Cultivation link established for civilization seed ${seed}.`);this.save();this.emit();return true;}
  tick(delta:number){
    const civ=this.state.civilization;
    if(!civ||civ.pendingEvent)return;
    const dt=Math.min(delta,.25)*Math.max(1,Math.min(this.maxSimulationSpeed(),this.state.simulationSpeed));
    const b=this.runtimeBonuses();
    this.tickEmitAccumulator+=dt;
    civ.elapsedSeconds+=dt;
    civ.years+=25*dt;
    const pressureBefore=captureDecisionSnapshot(civ);
    const pressure=advancePressure(civ,b,dt);
    if(pressure.queuedCrises.length){
      for(const id of pressure.queuedCrises)if(!civ.scheduledEvents.includes(id))civ.scheduledEvents.push(id);
      const thresholdId=pressure.queuedCrises.at(-1)!;
      this.worldImpulse=buildDecisionFeedback(++this.feedbackSequence,{id:thresholdId,title:'Entropy Threshold Breach'},{label:'Containment fracture detected'},pressureBefore,captureDecisionSnapshot(civ));
      this.post(`ENTROPY THRESHOLD: ${Math.trunc(civ.tactical.entropy)} // containment crisis queued.`);
      this.save();
    }
    const newEra=eraForYears(civ.years);
    if(newEra!==civ.era)this.enterEra(civ,newEra);
    const s=civ.stats;
    const low=Math.max(0,Math.min(1,(100-s.stability)/100));
    const paradoxGrowth=1+low*.35*this.upgradeLevel('axiom','axiom_paradox_food');
    const institution=civ.institutions.includes('Consensus Office')?1.05:1;
    const growth=.75*(1+.2*civ.era)*civ.developmentMultiplier*paradoxGrowth*institution*CivilizationPaths.simulationModifier(civ,'development')*dt;
    civ.development+=growth;
    let decay=.018*(1+.55*civ.era)*(1+s.attention/140)*(1+s.awareness/180)*civ.stabilityDecayMult;
    if(civ.flags.includes('impossible_tax'))decay*=.95;
    if(civ.flags.includes('resistance'))decay*=1.2;
    decay*=CivilizationPaths.simulationModifier(civ,'stability');
    decay+=cascadeDecay(civ.tactical.entropy,s.stabilityMax);
    s.stability-=decay*dt;
    let awareness=.006*civ.era;
    if(civ.flags.includes('machine_cult'))awareness*=1.35;
    if(civ.flags.includes('planetary_mind'))awareness*=1.2;
    awareness*=CivilizationPaths.simulationModifier(civ,'awareness');
    s.awareness+=awareness*b.awarenessGainMult*dt;
    s.attention+=.004*civ.era*b.attentionGainMult*CivilizationPaths.simulationModifier(civ,'attention')*dt;
    let sanity=.003*civ.era*(1+s.attention/60);
    if(civ.institutions.includes('Ministry Of Sanity'))sanity*=.72;
    sanity*=CivilizationPaths.simulationModifier(civ,'sanity');
    s.sanity-=sanity*b.sanityLossMult*dt;
    this.clampStats(civ);
    for(const m of Progression.recordCivilizationProgress(this.state,civ))this.post(m);
    if(s.stability<=0){this.harvest(true);return;}
    civ.eventTimer-=dt;
    if(civ.eventTimer<=0){
      this.tickEmitAccumulator=0;
      this.presentNextEvent(civ);
      return;
    }
    if(this.tickEmitAccumulator+1e-9>=.5){
      this.tickEmitAccumulator%=.5;
      this.emit();
    }
  }
  previewEventChoiceEffects(choice:any){const civ=this.state.civilization;if(!civ)return {};const effects=structuredClone(CivilizationPaths.mergedChoiceEffects(civ,choice));const b=this.runtimeBonuses();for(const key of ['stability','awareness','sanity','attention']){if(effects[key]==null)continue;let amount=Number(effects[key]);if(key==='stability'&&amount<0)amount*=b.stabilityLossMult;else if(key==='awareness'&&amount>0)amount*=b.awarenessGainMult;else if(key==='sanity'&&amount<0)amount*=b.sanityLossMult;else if(key==='attention'&&amount>0)amount*=b.attentionGainMult;effects[key]=amount;}return effects;}
  previewHarvestDetails(chaotic=false){const civ=this.state.civilization;if(!civ)return {grade:'premature' as const,multiplier:.2,credits:0,depth:0,rewardMultiplier:.2,objectiveCompleted:false,rewards:{causal_mass:0,cognition:0,paradox:0,existence:0}};const bonuses=this.runtimeBonuses();const quality=evaluateHarvestQuality(civ,chaotic);const objectiveCompleted=quality.grade!=='premature'&&evaluateDirectiveObjective(civ);const applied=applyHarvestQuality(calculateHarvest(civ,chaotic,bonuses),quality,{collapsed:chaotic,gradeRewardMult:bonuses.gradeRewardMult,objectiveMultiplier:objectiveCompleted?1.15:1});return {...quality,credits:calculateCultivationCredits(quality,chaotic,objectiveCompleted),objectiveCompleted,...applied};}
  previewHarvest(chaotic=false){return this.previewHarvestDetails(chaotic).rewards;}
  returnToMachineWithoutReward(){const priorSeed=this.state.civilization?.seed??this.state.machine.runBuild.nextCivilizationSeed;this.state.civilization=null;this.state.phase='machine';this.state.simulationSpeed=1;this.decisionFeedback=null;this.worldImpulse=null;this.prepareNextRun(mixSeed(priorSeed+1),false);this.save();this.emit();}
  currentEvent(){const civ=this.state.civilization;return civ?.pendingEvent?this.eventById(civ.pendingEvent):null;}
  forceEvent(id:string){const civ=this.state.civilization;const e=this.eventById(id);if(!civ||!e)return false;this.decisionFeedback=null;this.lastActionFailure='';civ.tactical.probedEventId='';civ.pendingEvent=id;civ.eventTimer=0;recordRecentIntervention(civ,id);CivilizationPaths.recordSelectedEvent(civ,e);this.save();this.emit();return true;}
  useTacticalAction(id:TacticalActionId){
    const civ=this.state.civilization;
    if(!civ){this.lastActionFailure='Start a civilization first.';this.emit();return false;}
    const availability=tacticalAvailability(civ,id);
    if(!availability.enabled){this.lastActionFailure=availability.reason;this.emit();return false;}
    const before=captureDecisionSnapshot(civ);
    const outcome=applyTacticalAction(civ,id,this.runtimeBonuses());
    if(!outcome){this.lastActionFailure='The tactical action could not be resolved.';this.emit();return false;}
    const newEra=eraForYears(civ.years);
    if(newEra!==civ.era)this.enterEra(civ,newEra);
    const dominant=CivilizationPaths.resolveDominance(civ);
    if(dominant)this.post(`DOMINANT CIVILIZATION PATH: ${CivilizationPaths.displayName(dominant).toUpperCase()}`);
    this.lastActionFailure='';
    this.decisionFeedback=buildDecisionFeedback(++this.feedbackSequence,{id:`tactical:${id}`,title:outcome.title},{label:outcome.label},before,captureDecisionSnapshot(civ));
    this.worldImpulse=this.decisionFeedback;
    this.appendHistory(civ,`YEAR ${Math.trunc(civ.years)}: Tactical action -> ${outcome.label}`);
    if(civ.stats.stability<=0){this.harvest(true);return true;}
    this.save();this.emit();return true;
  }
  chooseEvent(index:number){
    const civ=this.state.civilization,event=this.currentEvent();
    if(!civ||!event)return false;
    const choice=event.choices?.[index];
    if(!choice)return false;
    const before=captureDecisionSnapshot(civ);
    this.applyEffects(civ,this.previewEventChoiceEffects(choice),false);
    const pr=CivilizationPaths.applyChoice(civ,event,choice);
    if(pr.newDominantPath){
      this.applyEffects(civ,CivilizationPaths.dominanceEffects(pr.newDominantPath),false);
      this.appendHistory(civ,`YEAR ${Math.trunc(civ.years)}: ${CivilizationPaths.displayName(pr.newDominantPath)} became the dominant civilization path.`);
      this.post(`DOMINANT CIVILIZATION PATH: ${CivilizationPaths.displayName(pr.newDominantPath).toUpperCase()}`);
    }
    if(pr.history)this.appendHistory(civ,`YEAR ${Math.trunc(civ.years)}: ${pr.history}`);
    if(pr.endgameState)this.appendHistory(civ,`YEAR ${Math.trunc(civ.years)}: Civilization reached path end-state ${pr.endgameState.replace('endgame_','').replaceAll('_',' ')}.`);
    civ.eventCounts[event.id]=(civ.eventCounts[event.id]??0)+1;
    civ.eventChoices++;
    civ.lastEvent=event.id;
    if(choice.follow_up)civ.scheduledEvents.push(choice.follow_up);
    this.appendHistory(civ,`YEAR ${Math.trunc(civ.years)}: ${event.title} -> ${choice.label}`);
    civ.pendingEvent='';
    civ.tactical.probedEventId='';
    civ.tactical.controlCapacity=Math.min(3,civ.tactical.controlCapacity+Math.max(1,Math.trunc(this.runtimeBonuses().controlRecharge)));
    civ.eventTimer=this.rollEventDelay(civ);
    this.clampStats(civ);
    this.decisionFeedback=buildDecisionFeedback(++this.feedbackSequence,event,choice,before,captureDecisionSnapshot(civ));
    this.worldImpulse=this.decisionFeedback;
    if(civ.stats.stability<=0){this.harvest(true);return true;}
    this.save();this.emit();return true;
  }
  rerollEvent(){const level=this.upgradeLevel('axiom','axiom_multiple_choice'),civ=this.state.civilization;if(level<=0||!civ?.pendingEvent)return false;const cost=Math.max(2,10-level*2);if(this.state.machine.currencies.paradox<cost)return false;this.state.machine.currencies.paradox-=cost;civ.lastEvent=civ.pendingEvent;civ.pendingEvent='';civ.tactical.probedEventId='';this.presentNextEvent(civ);this.post(`Reality rewound at a cost of ${cost} Paradox.`);this.save();this.emit();return true;}
  harvest(chaotic=false){const civ=this.state.civilization;if(!civ)return {causal_mass:0,cognition:0,paradox:0,existence:0};const details=this.previewHarvestDetails(chaotic);civ.directiveObjective.completed=details.objectiveCompleted;const rewards=details.rewards;for(const k of RESOURCE_KEYS)this.state.machine.currencies[k]+=rewards[k];let mutationId='';if(chaotic&&this.mutations.length){const rng=new SeededRng(civ.rngState);mutationId=this.mutations[rng.int(0,this.mutations.length-1)].id;civ.rngState=rng.state;if(!this.state.machine.activeMutations.includes(mutationId))this.state.machine.activeMutations.push(mutationId);}this.state.machine.civilizationsTotal++;this.state.machine.civilizationsThisUniverse++;this.state.machine.cultivationCreditsThisUniverse+=details.credits;const record={chaotic,rewards:{...rewards},mutation_id:mutationId,seed:civ.seed,years:Math.trunc(civ.years),era:civ.era,development:civ.development,traits:[...civ.traits],directive_id:civ.directiveId,grade:details.grade,depth:details.depth,credits:details.credits,objective_completed:details.objectiveCompleted,reward_multiplier:details.rewardMultiplier};this.state.machine.lastHarvest=record;for(const m of Progression.recordHarvest(this.state,record))this.post(m);this.state.civilization=null;this.state.phase='machine';this.state.simulationSpeed=1;this.decisionFeedback=null;this.worldImpulse=null;this.prepareNextRun(mixSeed(civ.seed+this.state.machine.civilizationsTotal),false);this.post(`${chaotic?'CHAOTIC':'CONTROLLED'} ${details.grade.toUpperCase()} HARVEST complete. +${details.credits} Cultivation Credits.`);if(details.objectiveCompleted)this.post('DIRECTIVE OBJECTIVE COMPLETE: rewards ×1.15 and +1 Cultivation Credit.');this.post(`Yield: Causal ${rewards.causal_mass}, Cognition ${rewards.cognition}, Paradox ${rewards.paradox}, Existence ${rewards.existence}.`);if(mutationId)this.post(`Machine mutation acquired: ${this.mutations.find((x:any)=>x.id===mutationId)?.name??mutationId}.`);this.save();this.emit();return rewards;}
  canConsumeUniverse(){return this.state.phase==='machine'&&this.state.machine.cultivationCreditsThisUniverse>=18&&this.systemUnlocked('universe_prestige');}
  consumeUniverse(){if(!this.canConsumeUniverse())return false;const bank=RESOURCE_KEYS.reduce((s,k)=>s+this.state.machine.currencies[k],0);const award=universeResidueAward(this.state.machine.cultivationCreditsThisUniverse,bank,1+.2*this.upgradeLevel('universe','residue_refinery'));this.state.meta.universalResidue+=award;this.state.meta.universesTotal++;this.state.meta.universesThisMultiverse++;for(const m of Progression.recordUniverse(this.state))this.post(m);this.resetMachineLayer();this.post(`UNIVERSE CONSUMED. ${award} Universal Residue recovered.`);this.save();this.emit();return true;}
  canConsumeMultiverse(){return this.state.phase==='machine'&&this.state.meta.universesThisMultiverse>=4&&this.systemUnlocked('multiverse_prestige');}
  consumeMultiverse(){if(!this.canConsumeMultiverse())return false;const totalLevels=Object.values(this.state.meta.universeUpgradeLevels).reduce((a,b)=>a+Number(b),0);const award=multiverseAxiomAward(this.state.meta.universesThisMultiverse,totalLevels);this.state.meta.axioms+=award;this.state.meta.multiversesConsumed++;for(const m of Progression.recordMultiverse(this.state))this.post(m);this.state.meta.universalResidue=0;this.state.meta.universeUpgradeLevels={};this.state.meta.universesThisMultiverse=0;this.resetMachineLayer();this.post(`MULTIVERSE COLLAPSED. ${award} Axiom units extracted.`);this.save();this.emit();return true;}
  maxSimulationSpeed(){const x=this.upgradeLevel('machine','temporal_injector');return x>=3?4:x>=1?2:1;}
  setSimulationSpeed(n:number){this.state.simulationSpeed=Math.max(1,Math.min(this.maxSimulationSpeed(),Math.trunc(n)));this.save();this.emit();}
  private resetMachineLayer(){const inheritedLattice=Math.min(this.upgradeLevel('machine','reality_lattice'),this.upgradeLevel('universe','wide_lattice'));this.state.machine.currencies={causal_mass:0,cognition:0,paradox:0,existence:0};this.state.machine.upgradeLevels=inheritedLattice>0?{reality_lattice:inheritedLattice}:{};this.state.machine.activeMutations=[];this.state.machine.civilizationsThisUniverse=0;this.state.machine.cultivationCreditsThisUniverse=0;this.state.machine.lastHarvest={};this.state.machine.runBuild={selectedDirective:'',selectedBreedingMatrix:'',directiveLocked:false,matrixLocked:false,directiveOfferIds:[],nextCivilizationSeed:0,previewTraitIds:[]};this.state.civilization=null;this.state.phase='machine';this.state.simulationSpeed=1;this.decisionFeedback=null;this.worldImpulse=null;this.prepareNextRun(0,false);}
  private presentNextEvent(civ:Civilization){this.decisionFeedback=null;this.lastActionFailure='';civ.tactical.probedEventId='';const e=this.selectEvent(civ)??this.eventById('routine_compliance_audit');if(!e)return;civ.pendingEvent=e.id;civ.eventTimer=0;this.save();this.emit();}
  private selectEvent(civ:Civilization){
    if(civ.scheduledEvents.length){
      const id=civ.scheduledEvents.shift()!;
      const scheduled=this.eventById(id);
      if(scheduled){recordRecentIntervention(civ,scheduled.id);CivilizationPaths.recordSelectedEvent(civ,scheduled);return scheduled;}
    }
    const eligible=this.events.filter((event:any)=>this.eventEligible(event,civ));
    const stateMultiplier=(event:any)=>{const s=civ.stats,id=event.id;let weight=1;if(s.sanity<50&&['first_machine_cult','probability_strike','ministry_of_sanity','reality_unionizes'].includes(id))weight*=1.8;if(s.attention>50&&['entity_audit','cosmic_predator','sky_inventory'].includes(id))weight*=2;if(s.awareness>50&&['machine_signal','civilization_resists','final_question'].includes(id))weight*=2;if(s.stability<45&&['sun_goes_missing','reality_unionizes','edge_of_simulation'].includes(id))weight*=2;return weight;};
    const pool=buildInterventionPool(eligible,civ,{pathMultiplier:(event:any)=>CivilizationPaths.eventWeightMultiplier(event,civ),stateMultiplier});
    const rng=new SeededRng(civ.rngState);
    const selected=chooseWeightedIntervention(pool,rng.next())??this.eventById('routine_compliance_audit');
    civ.rngState=rng.state;
    if(selected){recordRecentIntervention(civ,selected.id);CivilizationPaths.recordSelectedEvent(civ,selected);}
    return selected;
  }
  private eventEligible(e:any,civ:Civilization){if(civ.era<Number(e.min_era??0)||civ.era>Number(e.max_era??2))return false;const r=e.requirements??{};if(r.scheduled_only)return false;if((civ.eventCounts[e.id]??0)>=Number(e.max_count??2))return false;if(!CivilizationPaths.eventIsEligible(e,civ))return false;const s=civ.stats;if(r.min_attention!=null&&s.attention<Number(r.min_attention))return false;if(r.max_attention!=null&&s.attention>Number(r.max_attention))return false;if(r.min_awareness!=null&&s.awareness<Number(r.min_awareness))return false;if(r.max_awareness!=null&&s.awareness>Number(r.max_awareness))return false;if(r.max_sanity!=null&&s.sanity>Number(r.max_sanity))return false;if(r.min_sanity!=null&&s.sanity<Number(r.min_sanity))return false;if(r.max_stability!=null&&s.stability>Number(r.max_stability))return false;if(r.requires_trait&&!civ.traits.includes(String(r.requires_trait)))return false;if(r.requires_flag&&!civ.flags.includes(String(r.requires_flag)))return false;if(r.required_institution&&!civ.institutions.includes(String(r.required_institution)))return false;if(r.excluded_flag&&civ.flags.includes(String(r.excluded_flag)))return false;if(r.min_development!=null&&civ.development<Number(r.min_development))return false;return true;}
  private applyEffects(civ:Civilization,effects:any,resilience:boolean){if(!effects||typeof effects!=='object')return;const b=this.runtimeBonuses();for(const [key,val] of Object.entries(effects)){let value=val as any;if(['stability','awareness','sanity','attention'].includes(key)){let amount=Number(value);if(resilience){if(key==='stability'&&amount<0)amount*=b.stabilityLossMult;else if(key==='awareness'&&amount>0)amount*=b.awarenessGainMult;else if(key==='sanity'&&amount<0)amount*=b.sanityLossMult;else if(key==='attention'&&amount>0)amount*=b.attentionGainMult;}(civ.stats as any)[key]+=amount;}else if(key==='entropy')civ.tactical.entropy=Math.max(0,Math.min(100,civ.tactical.entropy+Number(value)));else if(key==='control_capacity')civ.tactical.controlCapacity=Math.max(0,Math.min(3,civ.tactical.controlCapacity+Number(value)));else if(key==='stability_max'){civ.stats.stabilityMax=Math.max(1,civ.stats.stabilityMax+Number(value));civ.stats.stability=Math.min(civ.stats.stability,civ.stats.stabilityMax);}else if(key==='development')civ.development=Math.max(1,civ.development+Number(value));else if(key==='development_mult')civ.developmentMultiplier=Math.max(.2,civ.developmentMultiplier+Number(value));else if(key==='event_delay')civ.eventDelayBonus+=Number(value);else if(key==='stability_decay_mult')civ.stabilityDecayMult=Math.max(.1,civ.stabilityDecayMult*Number(value));else if(key==='flag_add'){const id=String(value);if(!civ.flags.includes(id))civ.flags.push(id);}else if(key==='institution_add'){const id=String(value);if(!civ.institutions.includes(id))civ.institutions.push(id);}else if(key==='flags_add'&&Array.isArray(value)){for(const id of value.map(String))if(!civ.flags.includes(id))civ.flags.push(id);}else if(key==='institutions_add'&&Array.isArray(value)){for(const id of value.map(String))if(!civ.institutions.includes(id))civ.institutions.push(id);}else if(key==='trait_add'){const id=String(value);if(id&&!civ.traits.includes(id))civ.traits.push(id);}else if(key.startsWith('harvest_mult_')){const rk=key.slice(13) as ResourceKey;if(rk in civ.harvestMult)civ.harvestMult[rk]*=Number(value);}else if(key.startsWith('harvest_')){const rk=key.slice(8) as ResourceKey;if(rk in civ.harvestBonus)civ.harvestBonus[rk]+=Number(value);}}
    this.clampStats(civ);
  }
  private clampStats(civ:Civilization){const s=civ.stats;s.stability=Math.max(0,Math.min(s.stabilityMax,s.stability));s.awareness=Math.max(0,Math.min(100,s.awareness));s.sanity=Math.max(0,Math.min(100,s.sanity));s.attention=Math.max(0,Math.min(100,s.attention));}
  private rollEventDelay(civ:Civilization){const rng=new SeededRng(civ.rngState);const window=eventDelayWindow(civ);const d=rng.range(window.min,window.max)+civ.eventDelayBonus;civ.rngState=rng.state;return Math.max(5,d);}
  private buildTraitSelection(seed:number){const rng=new SeededRng(seed);const bonuses=this.runtimeBonuses();const allowed=this.traits.filter((t:any)=>!t.impossible||this.upgradeLevel('axiom','axiom_impossible_birth')>0).slice();const count=Math.min(allowed.length,2+Math.trunc(bonuses.extraTraits));const ids:string[]=[];for(let i=0;i<count;i++){const total=allowed.reduce((sum:number,trait:any)=>sum+this.traitWeight(trait.id),0);const roll=rng.range(0,total);let cursor=0,pick=allowed.length-1;for(let j=0;j<allowed.length;j++){cursor+=this.traitWeight(allowed[j].id);if(roll<=cursor){pick=j;break;}}const [trait]=allowed.splice(pick,1);ids.push(trait.id);}return {ids,rngState:rng.state};}
  private enterEra(civ:Civilization,newEra:number){civ.era=newEra;civ.tactical.controlCapacity=Math.min(3,civ.tactical.controlCapacity+1);this.appendHistory(civ,`YEAR ${Math.trunc(civ.years)}: Civilization enters ${ERA_NAMES[newEra]}.`);this.post(`Civilization entered ${ERA_NAMES[newEra]}. Control Capacity +1.`);}
  private appendHistory(civ:Civilization,msg:string){civ.history.unshift(msg);civ.history=civ.history.slice(0,80);}
}
