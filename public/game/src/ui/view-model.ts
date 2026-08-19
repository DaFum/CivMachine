import { CivilizationPaths } from '../game/paths.js';
import { factionProfile, speciesProfile } from '../game/lore.js';
import { objectiveForDirective } from '../game/run-directives.js';
import { entropyRate, pressureMultiplier, secondsToCascade } from '../game/pressure.js';
import { DEPTH_BANDS, DEPTH_YIELD_BASE, DEPTH_YIELD_RATE, HARVEST_GRADE_LABELS, cultivationDepth, depthBand } from '../game/harvest-quality.js';
import { TACTICAL_ACTIONS } from '../game/tactical-actions.js';
import type { GameEngine } from '../game/engine.js';

const RESOURCE_NAMES: Record<string,string> = {
  causal_mass:'Causal Mass', cognition:'Cognition', paradox:'Paradox', existence:'Existence', universal_residue:'Universal Residue', axioms:'Axioms'
};

const EFFECT_LABELS: Record<string,string> = {
  stability:'Stability', awareness:'Awareness', sanity:'Sanity', attention:'Attention',
  development:'Development', entropy:'Entropy', stability_max:'Maximum Stability',
};

function amountLabel(value:number):string {
  const rounded=Math.round(value*10)/10;
  return `${rounded>0?'+':''}${Number.isInteger(rounded)?rounded.toFixed(0):rounded.toFixed(1)}`;
}

function riskVector(effects:any, precisionLevel:number):string {
  const vectors=Object.entries(effects).filter(([key,value])=>key in EFFECT_LABELS&&Number(value)!==0).map(([key,value])=>{
    const amount=Number(value);
    if(precisionLevel>=5)return `${EFFECT_LABELS[key]} ${amountLabel(amount)}`;
    if(precisionLevel>=2){
      const spread=precisionLevel===2?3:precisionLevel===3?2:1;
      const lower=amount>0?Math.max(.1,amount-spread):amount-spread;
      const upper=amount<0?Math.min(-.1,amount+spread):amount+spread;
      return `${EFFECT_LABELS[key]} range ${amountLabel(lower)} to ${amountLabel(upper)}`;
    }
    return `${EFFECT_LABELS[key]} ${amount>0?'↑':'↓'}`;
  });
  return vectors.length?vectors.join(' · '):'No direct metric vector detected';
}

function entropyBand(value:number):{index:number;id:string;label:string}{
  if(value>=100)return {index:4,id:'cascade',label:'CASCADE'};
  if(value>=75)return {index:3,id:'critical',label:'CRITICAL'};
  if(value>=50)return {index:2,id:'fractured',label:'FRACTURED'};
  if(value>=25)return {index:1,id:'strained',label:'STRAINED'};
  return {index:0,id:'contained',label:'CONTAINED'};
}

// The stay-or-harvest decision is a blind guess without a forecast, so the view model carries the
// next band the run can reach and what it is worth.
function nextDepthBand(depth: number) {
  const upcoming = DEPTH_BANDS.find(band => band.minDepth > depth);
  if (!upcoming) return null;
  return {
    grade: upcoming.grade,
    label: HARVEST_GRADE_LABELS[upcoming.grade],
    depthNeeded: upcoming.minDepth,
    yieldMultiplier: DEPTH_YIELD_BASE + DEPTH_YIELD_RATE * upcoming.minDepth,
  };
}

export function buildViewModel(engine: GameEngine) {
  const state = engine.state;
  const resources = engine.visibleResources().map(id => ({
    id,
    name: RESOURCE_NAMES[id] ?? id,
    amount: id === 'universal_residue' ? state.meta.universalResidue : id === 'axioms' ? state.meta.axioms : (state.machine.currencies as any)[id] ?? 0,
  }));
  const civ = state.civilization;
  const event = engine.currentEvent();
  const predictionsUnlocked = Boolean(civ && civ.predictionLevel > 0);
  const probed = Boolean(civ && event && civ.tactical.probedEventId === event.id);
  const bonuses = engine.runtimeBonuses();
  const controlledHarvest = civ ? engine.previewHarvestDetails(false) : null;
  const chaoticHarvest = civ ? engine.previewHarvestDetails(true) : null;
  const activeObjective = civ ? objectiveForDirective(civ.directiveId) : null;
  const directiveRequired = engine.systemUnlocked('directives') && state.machine.runBuild.directiveOfferIds.length > 0;
  return {
    phase: state.phase,
    machineInsight: engine.machineInsight(),
    resources,
    simulationSpeed: state.simulationSpeed,
    maxSimulationSpeed: engine.maxSimulationSpeed(),
    civilizationsThisUniverse: state.machine.civilizationsThisUniverse,
    cultivationCreditsThisUniverse: state.machine.cultivationCreditsThisUniverse,
    universeRequirement: 18,
    universesThisMultiverse: state.meta.universesThisMultiverse,
    multiverseRequirement: 4,
    previews: engine.nextPreviews(),
    runBuild: { ...state.machine.runBuild },
    directives: engine.availableDirectives().map((directive:any)=>({ ...directive, objective: objectiveForDirective(directive.id) })),
    matrices: engine.availableMatrices(),
    previewTraits: state.machine.runBuild.previewTraitIds.map(id=>({id,name:engine.traitById(id)?.name??id})),
    canStartCivilization: !directiveRequired || Boolean(state.machine.runBuild.selectedDirective),
    startReason: directiveRequired&&!state.machine.runBuild.selectedDirective?'Select one offered Directive for this Civilization.':'',
    machineUpgrades: engine.visibleUpgradeEntries('machine'),
    universeUpgrades: engine.visibleUpgradeEntries('universe'),
    axiomUpgrades: engine.visibleUpgradeEntries('axiom'),
    canConsumeUniverse: engine.canConsumeUniverse(),
    canConsumeMultiverse: engine.canConsumeMultiverse(),
    systems: {
      directives: engine.systemUnlocked('directives'),
      breedingMatrices: engine.systemUnlocked('breeding_matrices'),
      universePrestige: engine.systemUnlocked('universe_prestige'),
      universeUpgrades: engine.systemUnlocked('universe_upgrades'),
      multiversePrestige: engine.systemUnlocked('multiverse_prestige'),
      axioms: engine.systemUnlocked('axioms'),
    },
    event: event ? {
      id: event.id,
      title: event.title,
      body: event.body,
      predictionLocked: !predictionsUnlocked && !probed,
      probed,
      choices: (event.choices ?? []).map((choice:any, index:number) => {
        const vector=probed?riskVector(engine.previewEventChoiceEffects(choice),civ?.predictionLevel??0):'';
        return {
          index,
          label: choice.label,
          prediction: predictionsUnlocked
            ? `${choice.prediction}${probed?` Probe vector: ${vector}.`:''}`
            : probed?`Probe vector: ${vector}.`:'',
        };
      }),
    } : null,
    feedback: engine.decisionFeedback ? structuredClone(engine.decisionFeedback) : null,
    lastActionFailure: engine.lastActionFailure,
    tactical: civ ? {
      entropy: civ.tactical.entropy,
      entropyBand: entropyBand(civ.tactical.entropy),
      entropyRate: entropyRate(civ.years, bonuses.containmentRating),
      pressureMultiplier: pressureMultiplier(civ.years),
      secondsToCascade: secondsToCascade(civ.years, civ.tactical.entropy, bonuses.containmentRating),
      controlCapacity: civ.tactical.controlCapacity,
      controlMax: 3,
      containmentRating: bonuses.containmentRating,
      actions: (Object.keys(TACTICAL_ACTIONS) as Array<keyof typeof TACTICAL_ACTIONS>).map(id=>({
        ...TACTICAL_ACTIONS[id],
        ...engine.tacticalAvailability(id),
      })),
    } : null,
    harvest: civ ? {
      controlled: controlledHarvest,
      chaotic: chaoticHarvest,
      depth: cultivationDepth(civ),
      depthBand: depthBand(cultivationDepth(civ)),
      nextBand: nextDepthBand(cultivationDepth(civ)),
    } : null,
    machineReserve: civ ? engine.runInterventions() : [],
    directiveObjective: activeObjective ? {
      id: activeObjective.id,
      title: activeObjective.title,
      description: activeObjective.description,
      completed: Boolean(controlledHarvest?.objectiveCompleted),
    } : null,
    lastHarvest: { ...state.machine.lastHarvest },
    civilization: civ ? {
      seed: civ.seed,
      years: civ.years,
      era: civ.era,
      development: civ.development,
      traits: civ.traits.map(id => ({ id, name: engine.traitById(id)?.name ?? id })),
      institutions: [...civ.institutions],
      flags: [...civ.flags],
      stats: { ...civ.stats },
      path: CivilizationPaths.summary(civ),
      species: speciesProfile(civ),
      faction: factionProfile(civ),
      history: civ.history.slice(0, 30),
      eventTimer: civ.eventTimer,
      directiveId: civ.directiveId,
    } : null,
    messages: engine.messages.slice(0, 30),
  };
}

export function civilizationRenderKey(vm: ReturnType<typeof buildViewModel>): string {
  const civilization = vm.civilization;
  if (vm.phase !== 'civilization' || !civilization) return vm.phase;

  const cosmicCondition = civilization.stats.attention > 65
    ? 'attention'
    : civilization.stats.awareness > 65
      ? 'awareness'
      : 'stable';

  return [
    vm.phase,
    civilization.seed,
    civilization.era,
    vm.event?.id ?? 'monitoring',
    civilization.path.dominantId ?? '',
    civilization.path.endgameState ?? '',
    civilization.stats.stability < 25 ? 'danger' : 'normal',
    cosmicCondition,
    vm.simulationSpeed,
    vm.maxSimulationSpeed,
    civilization.traits.map(trait => trait.id).join(','),
    civilization.institutions.join(','),
    vm.feedback?.sequence ?? 0,
    vm.tactical?.entropyBand.index ?? 0,
    vm.tactical?.controlCapacity ?? 0,
    vm.directiveObjective?.completed ? 'objective-complete' : 'objective-open',
    vm.harvest?.controlled?.grade ?? '',
    vm.harvest?.depthBand ?? '',
    vm.machineReserve.map(entry => (entry.enabled ? '1' : '0')).join(''),
    vm.lastActionFailure,
  ].join('|');
}
