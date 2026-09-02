import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewState, calculateHarvest, upgradeCost, eraForYears, multiverseAxiomAward, universeResidueAward, ERA_YEAR_THRESHOLDS, SAVE_VERSION } from '../dist/game/rules.js';
import { CivilizationPaths, PATH_IDS, SUCCESSION_MAX } from '../dist/game/paths.js';
import { Progression, progressionRulesForLayer } from '../dist/game/progression.js';
import { clampStats } from '../dist/game/effects.js';
import { GameEngine, ERA_NAMES } from '../dist/game/engine.js';
import { CONTENT } from '../dist/data/content.generated.js';
import { applyEraCeiling, applyInterventionCopy, INTERVENTION_COPY } from '../dist/data/intervention-copy.js';
import { APOTHEOSIS_EVENTS } from '../dist/data/apotheosis-events.js';
import { ENTROPY_CRISES } from '../dist/data/entropy-crises.js';
import { EXPANDED_INTERVENTIONS } from '../dist/data/expanded-interventions.js';
import { EXPANDED_DOMINANT_INTERVENTIONS, EXPANDED_PATH_INTERVENTIONS } from '../dist/data/expanded-path-interventions.js';
import { EVENT_CHAINS } from '../dist/data/event-chains.js';
import {
  buildInterventionPool,
  chooseWeightedIntervention,
  eventDelayWindow,
  interventionExhausted,
  recordRecentIntervention,
  INTERVENTION_ALLOWANCE_PER_RUN,
} from '../dist/game/intervention-scheduler.js';
import { buildDecisionFeedback, captureDecisionSnapshot } from '../dist/game/decision-feedback.js';
import { advancePressure, cascadeDecay, entropyRate, pressureMultiplier, pressureYears, secondsToCascade } from '../dist/game/pressure.js';
import { calculateCultivationCredits, cultivationDepth, depthBand, depthForCredit, depthYieldMultiplier, evaluateHarvestQuality, harvestUrgency, reachableRunSeconds, DEPTH_BANDS, DEPTH_CREDIT_CAP, DEPTH_DEVELOPMENT_SCALE, HARVEST_GRADE_LABELS } from '../dist/game/harvest-quality.js';
import { developmentGrowthPerSecond, entropyDrag, ENTROPY_DRAG_MAX } from '../dist/game/development.js';
import { buildDirectiveOffers, evaluateDirectiveObjective, objectiveForDirective } from '../dist/game/run-directives.js';
import { balancedAxiomUpgrades, balancedMachineUpgrades, balancedUniverseUpgrades } from '../dist/game/upgrade-balance.js';
import { TACTICAL_ACTIONS, VENT_COST_ESCALATION, VENT_PARADOX_BASE, VENT_PARADOX_PER_ERA, VENT_STABILITY_COST, accelerateEntropyCost, maxSimulationSpeed, tacticalRisk, ventStabilityCost } from '../dist/game/tactical-actions.js';
import { runInterventionById, runInterventionCost, runInterventionUses, RUN_INTERVENTIONS } from '../dist/game/run-interventions.js';
import { MILESTONE_CATALOG, completedMilestoneCount, evaluateMilestones, milestoneProgress, milestoneSnapshot } from '../dist/game/milestones.js';
import { attentionGainPerSecond, awarenessGainPerSecond, sanityLossPerSecond, stabilityDecayPerSecond, statDrift } from '../dist/game/stat-drift.js';
import { gradeIndex, HARVEST_GRADE_ORDER } from '../dist/game/harvest-quality.js';
import { convergenceBonuses, convergenceRequirements, convergenceTargets, convergenceUnlocked, evaluateConvergence, terminalCivilizationSetup, CONVERGENCE_ASCENDANT_INDEX } from '../dist/game/convergence.js';
import { TERMINAL_ENTROPY_MULTIPLIER } from '../dist/game/pressure.js';
import { applyWorldMemory, emptyWorldMemory, sanitizeWorldMemory } from '../dist/game/world-memory.js';
import { CONSEQUENCE_PROFILES, consequenceProfileFor, consequenceProfileById } from '../dist/game/consequence-profiles.js';
import { buildDecisionConsequence } from '../dist/game/decision-consequences.js';
import { civilizationDramaScore, civilizationDramaPhase } from '../dist/game/drama.js';
import { developmentStage } from '../dist/render/world-model.js';
import { freshEngine, runCivilization, safestChoiceIndex, withUpgrades } from './balance-harness.mjs';

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))];
}

function maximumPurchasableMachineLevels(engine) {
  const groups = new Map();
  for (const definition of engine.catalog('machine')) {
    if (!Progression.canUseUpgrade(engine.state, 'machine', definition.id)) continue;
    const currency = String(definition.currency);
    groups.set(currency, [...(groups.get(currency) ?? []), definition]);
  }

  const maximizeCurrency = (definitions, index, remaining) => {
    if (index >= definitions.length) return 0;
    const definition = definitions[index];
    let best = 0;
    let spent = 0;
    for (let levels = 0; levels <= Number(definition.max_level); levels++) {
      if (spent > remaining) break;
      best = Math.max(best, levels + maximizeCurrency(definitions, index + 1, remaining - spent));
      spent += upgradeCost(Number(definition.base_cost), Number(definition.growth), levels);
    }
    return best;
  };

  let total = 0;
  for (const [currency, definitions] of groups) {
    total += maximizeCurrency(definitions, 0, engine.currencyAmount(currency));
  }
  return total;
}

function simulatedBalanceRun(seed, { accelerateWheneverAvailable = false, collapse = false } = {}) {
  const engine = freshEngine();
  engine.startCivilization(seed);
  let elapsed = 0;
  let resolvedInterventions = 0;
  let successfulAccelerates = 0;
  let blockedAccelerates = 0;

  if (accelerateWheneverAvailable && engine.useTacticalAction('accelerate')) successfulAccelerates++;

  while (engine.state.phase === 'civilization' && elapsed < 600) {
    const civ = engine.state.civilization;
    if (!collapse && civ.eventChoices >= 3 && evaluateHarvestQuality(civ, false).grade !== 'premature') break;
    const event = engine.currentEvent();
    if (event) {
      engine.chooseEvent(safestChoiceIndex(event));
      resolvedInterventions++;
      if (engine.state.phase === 'civilization' && accelerateWheneverAvailable) {
        if (engine.useTacticalAction('accelerate')) successfulAccelerates++;
        else if (engine.lastActionFailure === 'Requires 2 Control.') blockedAccelerates++;
      }
      continue;
    }
    engine.tick(0.25);
    elapsed += 0.25;
  }

  if (engine.state.phase === 'civilization') engine.harvest(collapse);
  return {
    elapsed,
    resolvedInterventions,
    successfulAccelerates,
    blockedAccelerates,
    purchasableLevels: maximumPurchasableMachineLevels(engine),
    harvest: engine.state.machine.lastHarvest,
  };
}

test('ported content keeps the complete Godot catalog', () => {
  assert.equal(CONTENT.traits.length, 12);
  assert.equal(CONTENT.machine_upgrades.length, 12);
  assert.equal(CONTENT.universe_upgrades.length, 8);
  assert.equal(CONTENT.axiom_upgrades.length, 6);
  assert.equal(CONTENT.directives.length, 6);
  assert.equal(CONTENT.breeding_matrices.length, 6);
  assert.equal(CONTENT.events.length, 75);
  assert.equal(Object.keys(CONTENT.path_definitions).length, 10);
});

test('each branching chain schedules the follow-up its branch earned', () => {
  assert.equal(EVENT_CHAINS.length, 9);
  const engine = freshEngine();
  engine.startCivilization(4242);
  const roots = EVENT_CHAINS.filter(event => event.choices.some(choice => choice.follow_up));
  assert.equal(roots.length, 3, 'three roots, one per chain');

  const targets = new Set();
  for (const root of roots) {
    // Every branch of a root must lead somewhere, or the branch is a dead end the player cannot see.
    assert.equal(root.choices.length, 2, `${root.id} must branch`);
    for (const [index, choice] of root.choices.entries()) {
      const followUp = engine.eventById(String(choice.follow_up));
      assert.ok(followUp, `${root.id} choice ${index} points at a missing follow-up`);
      // Scheduled-only, so a consequence can never be drawn before the decision that causes it.
      assert.equal(followUp.requirements.scheduled_only, true, `${followUp.id} must be scheduled only`);
      assert.equal(followUp.choices.length, 1, `${followUp.id} is a consequence, not a decision`);
      targets.add(followUp.id);

      engine.forceEvent(root.id);
      engine.chooseEvent(index);
      const civ = engine.state.civilization;
      civ.eventTimer = 0;
      engine.tick(0.25);
      assert.equal(engine.currentEvent()?.id, followUp.id, `${root.id} branch ${index} must serve its follow-up next`);
      engine.chooseEvent(0);
    }
  }
  assert.equal(targets.size, 6, 'the six follow-ups must be distinct');
  // And the scheduled-only events are exactly those six: nothing in a chain is reachable at random.
  assert.deepEqual(
    EVENT_CHAINS.filter(event => event.requirements.scheduled_only).map(event => event.id).sort(),
    [...targets].sort(),
  );
});

test('the expanded catalog is what makes a run repetition-free', () => {
  // A naturally ending run draws up to about a hundred interventions. The frozen catalog offers
  // roughly sixty eligible ones per run, which is why a third of every run used to be a repeat.
  assert.equal(EXPANDED_INTERVENTIONS.length, 36);
  assert.equal(EXPANDED_PATH_INTERVENTIONS.length, 40);
  assert.equal(EXPANDED_DOMINANT_INTERVENTIONS.length, 10);

  // The pathless thirty-six carry the guarantee: they are eligible in every run whatever path it
  // takes, so none of them may declare a path or a dominance requirement.
  for (const event of EXPANDED_INTERVENTIONS) {
    assert.equal(event.path_id, undefined, `${event.id} must stay pathless`);
    assert.equal(event.requirements.min_path_affinity, undefined, `${event.id} must not gate on affinity`);
  }

  // The parallel chains gate on affinity alone, one phase per step, so a path a run merely leans
  // into still has four interventions of its own to serve.
  const PHASE_AFFINITY = { impulse: 1, reinforcement: 2, conflict: 3, consolidation: 4 };
  const byPath = new Map();
  for (const event of EXPANDED_PATH_INTERVENTIONS) {
    assert.equal(event.kind, 'path');
    assert.equal(event.requirements.requires_dominant_path, undefined, `${event.id} must not need dominance`);
    assert.equal(
      event.requirements.min_path_affinity,
      PHASE_AFFINITY[event.path_phase],
      `${event.id} affinity gate must match its phase`,
    );
    byPath.set(event.path_id, [...(byPath.get(event.path_id) ?? []), event.path_phase]);
  }
  assert.equal(byPath.size, PATH_IDS.length);
  for (const [pathId, phases] of byPath) {
    assert.deepEqual([...phases].sort(), Object.keys(PHASE_AFFINITY).sort(), `${pathId} chain is incomplete`);
  }

  // One dominant-path consolidation each, and never an endgame: end-states belong to the frozen
  // catalog, whose endgames are the ones gated behind 460 Development.
  assert.deepEqual(
    EXPANDED_DOMINANT_INTERVENTIONS.map(event => event.path_id).sort(),
    [...PATH_IDS].sort(),
  );
  for (const event of EXPANDED_DOMINANT_INTERVENTIONS) {
    assert.equal(event.kind, 'dominant_path');
    assert.equal(event.path_phase, 'consolidation', `${event.id} must not award an end-state`);
    assert.equal(event.requirements.requires_dominant_path, event.path_id);
  }
});

test('every expanded intervention is drawable, single-use and era-explicit', () => {
  const expanded = [...EXPANDED_INTERVENTIONS, ...EXPANDED_PATH_INTERVENTIONS, ...EXPANDED_DOMINANT_INTERVENTIONS];
  const engine = freshEngine();

  for (const event of expanded) {
    assert.equal(engine.eventById(event.id)?.title, event.title, `${event.id} is not in the pool`);
    // applyEraCeiling() only raises the frozen catalog, so a layered event that should survive into
    // APOTHEOSIS has to say max_era 3 itself or it silently stops being eligible in the last era.
    assert.equal(event.max_era, 3, `${event.id} must declare its own APOTHEOSIS ceiling`);
    assert.ok(event.min_era >= 0 && event.min_era <= 2, `${event.id} era floor`);
    // One draw per run is enforced in the scheduler; the data must not claim otherwise.
    assert.equal(event.max_count, 1, `${event.id} must be single-use`);
    assert.ok(event.weight > 0, `${event.id} weight`);
    assert.ok(event.body.length > 40, `${event.id} needs a body`);
    assert.ok(event.choices.length >= 2, `${event.id} needs a decision`);
    for (const choice of event.choices) {
      assert.ok(Object.keys(choice.effects).length > 0, `${event.id} choice ${choice.label} does nothing`);
      assert.ok(choice.prediction.length > 40, `${event.id} choice ${choice.label} needs a prediction`);
      for (const pathId of Object.keys(choice.path_affinity ?? {})) {
        assert.ok(PATH_IDS.includes(pathId), `${event.id} names unknown path ${pathId}`);
      }
    }
  }
});

test('the whole intervention catalog states every action and consequence exactly once', () => {
  const events = [
    ...applyInterventionCopy(CONTENT.events),
    ...ENTROPY_CRISES,
    ...APOTHEOSIS_EVENTS,
    ...EXPANDED_INTERVENTIONS,
    ...EXPANDED_PATH_INTERVENTIONS,
    ...EXPANDED_DOMINANT_INTERVENTIONS,
    ...EVENT_CHAINS,
  ];
  const choices = events.flatMap(event => event.choices);
  const normalized = values => values.map(value => value.trim().toLowerCase());

  assert.equal(events.length, 185);
  assert.equal(choices.length, 389);
  assert.equal(new Set(normalized(events.map(event => event.id))).size, 185);
  assert.equal(new Set(normalized(events.map(event => event.title))).size, 185);
  assert.equal(new Set(normalized(events.map(event => event.body))).size, 185);
  assert.equal(new Set(normalized(choices.map(choice => choice.label))).size, 389);
  assert.equal(new Set(normalized(choices.map(choice => choice.prediction))).size, 389);
});

test('all 163 production choices use unique action and consequence copy', () => {
  const events = [...applyInterventionCopy(CONTENT.events), ...ENTROPY_CRISES];
  const choices = events.flatMap(event => event.choices);
  const normalized = values => values.map(value => value.trim().toLowerCase());

  assert.equal(events.length, 78);
  assert.equal(choices.length, 163);
  assert.equal(Object.keys(INTERVENTION_COPY).length, 50);
  assert.equal(new Set(normalized(choices.map(choice => choice.label))).size, 163);
  assert.equal(new Set(normalized(choices.map(choice => choice.prediction))).size, 163);
});

test('engine presents the enhanced event-specific path copy', () => {
  const engine = new GameEngine({
    autosave: false,
    storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  });
  engine.startCivilization(20260818);
  engine.forceEvent('synthetic_saint');

  const event = engine.currentEvent();
  assert.equal(event?.choices[0].label, 'Recognize the miracle');
  assert.equal(event?.choices[1].label, 'Register it as medical equipment');
});

test('scheduler excludes the six most recent interventions', () => {
  const civ = GameEngine.createCivilizationForTest(77);
  for (const id of ['event_a', 'event_b', 'event_c', 'event_d', 'event_e', 'event_f']) {
    recordRecentIntervention(civ, id);
  }
  const events = 'abcdefg'.split('').map(letter => ({ id: `event_${letter}`, weight: 1 }));
  const pool = buildInterventionPool(events, civ, {
    pathMultiplier: () => 1,
    stateMultiplier: () => 1,
    exhausted: () => false,
  });

  assert.deepEqual(pool.map(item => item.event.id), ['event_g']);
});

test('the scheduler allows each intervention exactly one draw per run', () => {
  const civ = GameEngine.createCivilizationForTest(78);
  // The frozen catalog still declares max_count 2 and one event declares 999. Both are ignored: the
  // allowance is one draw per run, which is what keeps a run repetition-free.
  assert.equal(INTERVENTION_ALLOWANCE_PER_RUN, 1);
  const fallback = { id: 'routine_compliance_audit', weight: 1, max_count: 999 };
  const ordinary = { id: 'dreams_of_gears', weight: 1, max_count: 2 };
  assert.equal(interventionExhausted(fallback, civ), false);
  civ.eventCounts = { routine_compliance_audit: 1, dreams_of_gears: 1 };
  assert.equal(interventionExhausted(fallback, civ), true);
  assert.equal(interventionExhausted(ordinary, civ), true);

  const options = {
    pathMultiplier: () => 1,
    stateMultiplier: () => 1,
    exhausted: event => interventionExhausted(event, civ),
  };
  // Anything already served is out of the pool while something unseen is left.
  const fresh = buildInterventionPool([fallback, { ...ordinary, id: 'unseen_event' }], civ, options);
  assert.deepEqual(fresh.map(entry => entry.event.id), ['unseen_event']);

  // Exhausted is not unreachable: with nothing fresh left the saturation stage returns the spent
  // events anyway, so a run stretched past the catalog still gets an intervention. They are not
  // ordered -- buildPool weights each one down by how often it has already been served.
  const saturated = buildInterventionPool([fallback, ordinary], civ, options);
  assert.deepEqual(saturated.map(entry => entry.event.id).sort(), ['dreams_of_gears', 'routine_compliance_audit']);
  civ.eventCounts.dreams_of_gears = 4;
  const weights = new Map(buildInterventionPool([fallback, ordinary], civ, options).map(entry => [entry.event.id, entry.weight]));
  assert.ok(weights.get('routine_compliance_audit') > weights.get('dreams_of_gears') * 2);

  // The recency window still applies in that third stage: the last thing served stays excluded even
  // when every candidate is spent, which is what keeps a saturated run from repeating back to back.
  recordRecentIntervention(civ, 'routine_compliance_audit');
  const afterRecent = buildInterventionPool([fallback, ordinary], civ, options);
  assert.deepEqual(afterRecent.map(entry => entry.event.id), ['dreams_of_gears']);
});

test('scheduler makes a deterministic weighted selection for an identical roll', () => {
  const civ = GameEngine.createCivilizationForTest(88);
  const events = [
    { id: 'neutral_event', weight: 1 },
    { id: 'aligned_event', weight: 1, path_id: 'machine_faith' },
    { id: 'rare_event', weight: 0.5 },
  ];
  const options = {
    pathMultiplier: event => event.id === 'aligned_event' ? 4.5 : 1,
    stateMultiplier: () => 1,
    exhausted: () => false,
  };
  const firstPool = buildInterventionPool(events, civ, options);
  const secondPool = buildInterventionPool(events, civ, options);

  assert.ok(firstPool.find(item => item.event.id === 'aligned_event').weight > firstPool[0].weight);
  assert.equal(chooseWeightedIntervention(firstPool, 0.42)?.id, chooseWeightedIntervention(secondPool, 0.42)?.id);
});

test('cadence stages intervention windows by era', () => {
  const civ = GameEngine.createCivilizationForTest(99);
  assert.deepEqual(eventDelayWindow(civ), { min: 10, max: 14 });
  civ.era = 1;
  civ.eventChoices = 4;
  assert.deepEqual(eventDelayWindow(civ), { min: 8, max: 11 });
  civ.era = 2;
  civ.eventChoices = 10;
  assert.deepEqual(eventDelayWindow(civ), { min: 7, max: 10 });
  civ.stats.stability = 20;
  assert.deepEqual(eventDelayWindow(civ), { min: 7, max: 10 });
});

test('engine scheduler excludes a recent event when a fresh eligible event exists', () => {
  const engine = new GameEngine({
    autosave: false,
    storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  });
  engine.startCivilization(7);
  const civ = engine.state.civilization;
  // The whole pool, not just the frozen catalog: with the layered catalogs left fresh the scheduler
  // would have plenty to choose from and the recency rule would never be exercised.
  const pool = [
    ...CONTENT.events,
    ...ENTROPY_CRISES,
    ...APOTHEOSIS_EVENTS,
    ...EXPANDED_INTERVENTIONS,
    ...EXPANDED_PATH_INTERVENTIONS,
    ...EXPANDED_DOMINANT_INTERVENTIONS,
    ...EVENT_CHAINS,
  ];
  for (const event of pool) {
    if (!['routine_compliance_audit', 'dreams_of_gears'].includes(event.id)) civ.eventCounts[event.id] = 1;
  }
  civ.recentEventIds = ['routine_compliance_audit'];
  civ.eventTimer = 0;
  engine.tick(0.25);

  assert.equal(engine.currentEvent()?.id, 'dreams_of_gears');
});

test('engine uses the staged cadence after resolving a mature transcendence event', () => {
  const engine = new GameEngine({
    autosave: false,
    storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  });
  engine.startCivilization(456);
  const civ = engine.state.civilization;
  civ.era = 2;
  civ.eventChoices = 9;
  engine.forceEvent('routine_compliance_audit');
  engine.chooseEvent(0);

  assert.ok(civ.eventTimer >= 7 && civ.eventTimer <= 10);
});

test('decision feedback reports exact metric, affinity, and addition deltas', () => {
  const civ = GameEngine.createCivilizationForTest(818);
  const before = captureDecisionSnapshot(civ);
  civ.stats.awareness += 6;
  civ.development += 12;
  civ.pathState.affinity.machine_faith += 2;
  civ.pathState.choiceFlags.push('machine_faith_devout');
  const after = captureDecisionSnapshot(civ);
  const feedback = buildDecisionFeedback(
    4,
    { id: 'synthetic_saint', title: 'The First Synthetic Saint' },
    { label: 'Recognize the miracle' },
    before,
    after,
  );

  assert.equal(feedback.sequence, 4);
  assert.equal(feedback.tone, 'mixed');
  assert.equal(feedback.metrics.find(delta => delta.key === 'awareness')?.delta, 6);
  assert.equal(feedback.metrics.find(delta => delta.key === 'development')?.delta, 12);
  assert.equal(feedback.affinities.find(delta => delta.pathId === 'machine_faith')?.delta, 2);
  // The addition is named the way the localization catalog names it -- the decision that set the flag
  // -- rather than by humanizing its id, and it carries the localized kind beside it.
  assert.deepEqual(feedback.additions, [{ kind: 'path_flag', id: 'machine_faith_devout', kindLabel: 'path flag', label: 'Recognize the miracle' }]);
});

test('engine publishes exact feedback after a choice and clears it for the next intervention', () => {
  const engine = new GameEngine({
    autosave: false,
    storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  });
  engine.startCivilization(919);
  engine.forceEvent('synthetic_saint');
  engine.chooseEvent(0);

  const feedback = engine.decisionFeedback;
  assert.equal(feedback?.eventId, 'synthetic_saint');
  assert.equal(feedback?.choiceLabel, 'Recognize the miracle');
  assert.equal(feedback?.metrics.find(delta => delta.key === 'awareness')?.delta, 6);
  assert.equal(feedback?.metrics.find(delta => delta.key === 'development')?.delta, 12);
  assert.equal(feedback?.affinities.find(delta => delta.pathId === 'machine_faith')?.delta, 2);

  engine.forceEvent('routine_compliance_audit');
  assert.equal(engine.decisionFeedback, null);
});

test('new browser save starts with layered progression', () => {
  const state = createNewState();
  assert.deepEqual(state.meta.progression.discoveredResources, ['causal_mass']);
  assert.equal(state.meta.progression.machineInsight, 0);
  assert.equal(Progression.canUseUpgrade(state, 'machine', 'reality_lattice'), true);
  assert.equal(Progression.canUseUpgrade(state, 'machine', 'prediction_core'), false);
});

test('new saves initialize the tactical civilization contract at the current save version', () => {
  const state = createNewState();
  assert.equal(state.saveVersion, SAVE_VERSION);
  assert.equal(state.machine.cultivationCreditsThisUniverse, 0);
  assert.deepEqual(state.machine.runBuild.directiveOfferIds, []);
  assert.equal(state.machine.runBuild.nextCivilizationSeed, 0);

  const civ = GameEngine.createCivilizationForTest(41);
  assert.deepEqual(civ.tactical, {
    entropy: 0,
    controlCapacity: 3,
    triggeredCrises: [],
    probedEventId: '',
    actionUsage: { stabilize: 0, accelerate: 0, probe: 0, vent: 0 },
  });
  assert.equal(civ.directiveId, '');
});

test('v4 intentionally ignores the legacy v1 save key', () => {
  const legacy = createNewState();
  legacy.saveVersion = 1;
  const storage = new Map([
    ['reality_consumption_engine_browser_save_v1', JSON.stringify(legacy)],
  ]);
  const engine = new GameEngine({ storage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  }});
  assert.equal(engine.state.saveVersion, SAVE_VERSION);
  assert.equal(engine.state.machine.civilizationsTotal, 0);
});

test('the entropy rate rises with years and falls with containment levels', () => {
  assert.equal(Number(entropyRate(0, 0).toFixed(4)), 0.48);
  assert.equal(Number(entropyRate(6500, 0).toFixed(4)), 0.96);
  assert.equal(Number(entropyRate(0, 4).toFixed(4)), 0.1846);
  assert.equal(Number(entropyRate(6500, 28).toFixed(4)), 0.0787);
  assert.equal(Number(pressureMultiplier(6500).toFixed(4)), 2);
  assert.ok(entropyRate(20000, 28) < entropyRate(20000, 14));
  for (let containment = 0; containment < 28; containment++) {
    assert.ok(entropyRate(6500, containment + 1) < entropyRate(6500, containment), `level ${containment + 1} must matter`);
  }
});

test('secondsToCascade matches numeric integration of the rate', () => {
  for (const containment of [0, 1, 4, 8, 14, 20, 28]) {
    const closed = secondsToCascade(0, 0, containment);
    let entropy = 0;
    let years = 0;
    let elapsed = 0;
    const step = 0.05;
    while (entropy < 100 && elapsed < 4000) {
      entropy += entropyRate(years, containment) * step;
      years += 25 * step;
      elapsed += step;
    }
    assert.ok(Math.abs(closed - elapsed) / elapsed < 0.01, `containment ${containment}: closed ${closed} vs numeric ${elapsed}`);
  }
});

test('the survival curve hits the published targets', () => {
  const expected = [[0, 159.4], [1, 208.3], [2, 252.4], [4, 331.0], [8, 462.9], [14, 624.6], [20, 761.1], [28, 918.7]];
  for (const [containment, target] of expected) {
    const actual = secondsToCascade(0, 0, containment);
    assert.ok(Math.abs(actual - target) <= 0.5, `containment ${containment}: ${actual}s, expected ${target}s`);
  }
});

test('cascade decay is proportional to maximum Stability', () => {
  assert.equal(cascadeDecay(99.9, 100), 0);
  assert.equal(Number(cascadeDecay(100, 100).toFixed(4)), 7);
  assert.equal(Number(cascadeDecay(100, 425).toFixed(2)), 29.75);
  assert.equal(100 / cascadeDecay(100, 100), 425 / cascadeDecay(100, 425));
});

test('pressure queues every crossed crisis exactly once', () => {
  const civ = GameEngine.createCivilizationForTest(52);
  civ.tactical.entropy = 24.9;
  const first = advancePressure(civ, { containmentRating: 0, entropyGainMult: 1 }, 1);
  const second = advancePressure(civ, { containmentRating: 0, entropyGainMult: 1 }, 1);
  assert.deepEqual(first.queuedCrises, ['entropy_crisis_25']);
  assert.deepEqual(second.queuedCrises, []);
  assert.deepEqual(civ.tactical.triggeredCrises, [25]);
});

test('a tactical Entropy jump still queues every newly reached crisis', () => {
  const engine = freshEngine();
  engine.startCivilization(521);
  const civ = engine.state.civilization;
  civ.stats.stability = 60;
  civ.tactical.entropy = 20;
  civ.eventTimer = 100;
  engine.useTacticalAction('stabilize');
  engine.tick(0.25);
  assert.deepEqual(civ.tactical.triggeredCrises, [25]);
  assert.ok(civ.scheduledEvents.includes('entropy_crisis_25'));
  assert.equal(engine.worldImpulse?.eventId, 'entropy_crisis_25');
});

test('entropy remains bounded at cascade pressure', () => {
  const civ = GameEngine.createCivilizationForTest(53);
  civ.tactical.entropy = 99.9;
  advancePressure(civ, { containmentRating: 0, entropyGainMult: 4 }, 10);
  assert.equal(civ.tactical.entropy, 100);
});

test('Stabilize spends two Control for Stability, Attention, and Entropy', () => {
  const engine = freshEngine();
  engine.startCivilization(61);
  const civ = engine.state.civilization;
  civ.stats.stability = 60;
  assert.equal(engine.useTacticalAction('stabilize'), true);
  assert.equal(civ.tactical.controlCapacity, 1);
  assert.equal(civ.stats.stability, 74);
  assert.equal(civ.stats.attention, 6);
  assert.equal(civ.tactical.entropy, 8);
});

test('protective upgrades mitigate Stabilize Attention and Probe Awareness exposure', () => {
  const engine = freshEngine();
  engine.state.machine.upgradeLevels.cosmic_muffling = 2;
  engine.state.machine.upgradeLevels.awareness_scrubber = 3;
  engine.startCivilization(611);
  const civ = engine.state.civilization;
  civ.stats.stability = 60;
  const attentionBefore = civ.stats.attention;
  engine.useTacticalAction('stabilize');
  assert.ok(Math.abs((civ.stats.attention - attentionBefore) - 6 * engine.runtimeBonuses().attentionGainMult) < 1e-9);

  civ.tactical.controlCapacity = 3;
  engine.forceEvent('dreams_of_gears');
  const awarenessBefore = civ.stats.awareness;
  engine.useTacticalAction('probe');
  assert.ok(Math.abs((civ.stats.awareness - awarenessBefore) - 3 * engine.runtimeBonuses().awarenessGainMult) < 1e-9);
});

test('Accelerate advances the run and cannot fire while an event is open', () => {
  const engine = freshEngine();
  engine.startCivilization(62);
  const civ = engine.state.civilization;
  const before = { years: civ.years, timer: civ.eventTimer };
  assert.equal(engine.useTacticalAction('accelerate'), true);
  assert.equal(civ.years, before.years + 200);
  assert.equal(civ.eventTimer, Math.max(0, before.timer - 8));
  engine.forceEvent('routine_compliance_audit');
  assert.equal(engine.useTacticalAction('accelerate'), false);
});

test('Accelerate costs two Control and cannot self-fund after every intervention', () => {
  const engine = freshEngine();
  engine.startCivilization(620);
  const civ = engine.state.civilization;

  assert.equal(TACTICAL_ACTIONS.accelerate.cost, 2);
  assert.equal(engine.useTacticalAction('accelerate'), true);
  assert.equal(civ.tactical.controlCapacity, 1);

  engine.forceEvent('routine_compliance_audit');
  engine.chooseEvent(safestChoiceIndex(engine.currentEvent()));
  assert.equal(civ.tactical.controlCapacity, 2);
  assert.equal(engine.useTacticalAction('accelerate'), true);
  assert.equal(civ.tactical.controlCapacity, 0);

  engine.forceEvent('dreams_of_gears');
  engine.chooseEvent(safestChoiceIndex(engine.currentEvent()));
  assert.equal(civ.tactical.controlCapacity, 1);
  assert.deepEqual(engine.tacticalAvailability('accelerate'), {
    enabled: false,
    reason: 'Requires 2 Control.',
    cost: 2,
  });

  const beforeBlockedAttempt = {
    years: civ.years,
    entropy: civ.tactical.entropy,
    control: civ.tactical.controlCapacity,
  };
  assert.equal(engine.useTacticalAction('accelerate'), false);
  assert.deepEqual({
    years: civ.years,
    entropy: civ.tactical.entropy,
    control: civ.tactical.controlCapacity,
  }, beforeBlockedAttempt);
});

test('Accelerate exact feedback includes years and intervention timer', () => {
  const engine = freshEngine();
  engine.startCivilization(621);
  engine.useTacticalAction('accelerate');
  assert.equal(engine.decisionFeedback?.metrics.find(delta => delta.key === 'years')?.delta, 200);
  assert.equal(engine.decisionFeedback?.metrics.find(delta => delta.key === 'eventTimer')?.delta, -4);
});

test('Probe charges once and reveals only the current event', () => {
  const engine = freshEngine();
  engine.startCivilization(63);
  engine.forceEvent('dreams_of_gears');
  assert.equal(engine.useTacticalAction('probe'), true);
  assert.equal(engine.state.civilization.tactical.probedEventId, 'dreams_of_gears');
  assert.equal(engine.useTacticalAction('probe'), false);
});

test('Probe previews the mitigated merged choice effects that resolution will apply', () => {
  const engine = freshEngine();
  engine.state.machine.upgradeLevels.awareness_scrubber = 2;
  engine.startCivilization(631);
  const civ = engine.state.civilization;
  civ.pathState.affinity.bureaucratic_singularity = 4;
  engine.forceEvent('impossible_district');
  const stabilityChoice = engine.currentEvent().choices[0];
  assert.equal(engine.previewEventChoiceEffects(stabilityChoice).stability, -1);

  engine.forceEvent('synthetic_saint');
  const awarenessChoice = engine.currentEvent().choices[0];
  const expectedAwareness = 6 * engine.runtimeBonuses().awarenessGainMult;
  assert.equal(engine.previewEventChoiceEffects(awarenessChoice).awareness, expectedAwareness);
  const before = civ.stats.awareness;
  engine.chooseEvent(0);
  assert.equal(civ.stats.awareness - before, expectedAwareness);
});

test('every third tactical action reinforces the approved paired paths', () => {
  const expected = {
    stabilize: ['cosmic_resistance', 'bureaucratic_singularity'],
    accelerate: ['temporal_dominion', 'reality_engineering'],
    probe: ['recursive_simulation', 'machine_faith'],
  };
  for (const [action, paths] of Object.entries(expected)) {
    const engine = freshEngine();
    engine.startCivilization(640 + paths.length);
    const civ = engine.state.civilization;
    civ.stats.stability = 50;
    for (let use = 0; use < 3; use++) {
      civ.tactical.controlCapacity = 3;
      if (action === 'probe') engine.forceEvent(use % 2 ? 'dreams_of_gears' : 'routine_compliance_audit');
      assert.equal(engine.useTacticalAction(action), true);
    }
    assert.equal(civ.pathState.affinity[paths[0]], 1);
    assert.equal(civ.pathState.affinity[paths[1]], 1);
  }
});

test('resolved interventions restore Control and clear the Probe lock', () => {
  const engine = freshEngine();
  engine.startCivilization(64);
  engine.forceEvent('dreams_of_gears');
  engine.useTacticalAction('probe');
  assert.equal(engine.state.civilization.tactical.controlCapacity, 2);
  engine.chooseEvent(0);
  assert.equal(engine.state.civilization.tactical.controlCapacity, 3);
  assert.equal(engine.state.civilization.tactical.probedEventId, '');
});

test('new civilizations reach the first intervention after four seconds', () => {
  const engine = freshEngine();
  engine.startCivilization(71);
  assert.equal(engine.state.civilization.eventTimer, 4);
});

test('active cadence stays fast across eras', () => {
  const civ = GameEngine.createCivilizationForTest(72);
  assert.deepEqual(eventDelayWindow(civ), { min: 10, max: 14 });
  civ.era = 1;
  assert.deepEqual(eventDelayWindow(civ), { min: 8, max: 11 });
  civ.era = 2;
  assert.deepEqual(eventDelayWindow(civ), { min: 7, max: 10 });
});

test('the survival curve separates no-upgrade runs from contained builds', () => {
  const seeds = Array.from({ length: 24 }, (_, index) => 10_000 + index * 97);
  const measure = (machineLevels, universeLevels) => percentile(
    seeds.map(seed => runCivilization(withUpgrades(freshEngine(), machineLevels, universeLevels), { seed }).elapsed),
    0.5,
  );
  const bare = measure({}, {});
  const four = measure({ reality_lattice: 1, awareness_scrubber: 1, sanity_protocol: 1, cosmic_muffling: 1 }, {});
  const full = measure(
    { reality_lattice: 8, awareness_scrubber: 5, sanity_protocol: 5, cosmic_muffling: 5 },
    { stable_constants: 5 },
  );
  assert.ok(bare >= 150 && bare <= 185, `no-upgrade median ${bare}s`);
  assert.ok(four >= 300 && four <= 360, `containment 4 median ${four}s`);
  // The analytic curve puts containment 28 at 918.7s. The safety policy prefers choices with a
  // negative entropy effect, which buys roughly 5% more, so the band tops out above the integral.
  assert.ok(full >= 900 && full <= 1020, `containment 28 median ${full}s`);
});

test('premature harvest gives reduced resources and zero credits', () => {
  const engine = freshEngine();
  engine.startCivilization(81);
  const raw = calculateHarvest(engine.state.civilization, false, engine.runtimeBonuses());
  const result = engine.harvest(false);
  assert.equal(engine.state.machine.lastHarvest.grade, 'premature');
  assert.equal(engine.state.machine.lastHarvest.credits, 0);
  assert.equal(engine.state.machine.cultivationCreditsThisUniverse, 0);
  assert.ok(result.causal_mass <= raw.causal_mass);
});

test('a Directive cannot turn a Premature harvest into a credited harvest', () => {
  const engine = freshEngine();
  engine.state.meta.progression.unlockedSystems.push('directives');
  engine.state.meta.progression.knownDirectives = ['stable_cultivation'];
  engine.prepareNextRun(811);
  engine.selectDirective('stable_cultivation');
  engine.startCivilization();

  const preview = engine.previewHarvestDetails(false);
  assert.equal(preview.grade, 'premature');
  assert.equal(preview.objectiveCompleted, false);
  assert.equal(preview.credits, 0);

  engine.harvest(false);
  assert.equal(engine.state.machine.lastHarvest.objective_completed, false);
  assert.equal(engine.state.machine.lastHarvest.credits, 0);
  assert.equal(engine.state.machine.cultivationCreditsThisUniverse, 0);
});

test('cultivation depth derives from development and completed path arcs', () => {
  const civ = GameEngine.createCivilizationForTest(82);
  civ.development = 80;
  assert.equal(cultivationDepth(civ), 1);
  civ.development = 400;
  assert.equal(cultivationDepth(civ), 5);
  civ.pathState.endgameStates = ['endgame_machine_faith', 'endgame_void_communion'];
  assert.equal(cultivationDepth(civ), 8);
});

test('v1.20.0 every grade boundary is a Cultivation Credit step', () => {
  assert.equal(depthBand(0), 'premature');
  assert.equal(depthBand(1.66), 'premature');
  assert.equal(depthBand(depthForCredit(1)), 'established');
  assert.equal(depthBand(4.99), 'established');
  assert.equal(depthBand(depthForCredit(3)), 'transcendent');
  assert.equal(depthBand(9.99), 'transcendent');
  assert.equal(depthBand(depthForCredit(6)), 'ascendant');
  assert.equal(depthBand(16.66), 'ascendant');
  assert.equal(depthBand(depthForCredit(DEPTH_CREDIT_CAP)), 'singular');
  assert.equal(depthBand(40), 'singular');
  assert.equal(HARVEST_GRADE_LABELS.singular, 'Singular');

  // The whole point of the v1.20.0 realignment: arriving at a band is arriving at a Credit, so the
  // loud signal and the valuable one are the same signal. A band whose minimum did not pay its own
  // Credit is the bug this test exists to catch.
  for (const band of DEPTH_BANDS) {
    const civ = GameEngine.createCivilizationForTest(4242);
    civ.eventChoices = 4;
    civ.era = 1;
    civ.development = band.minDepth * DEPTH_DEVELOPMENT_SCALE;
    const quality = evaluateHarvestQuality(civ, false);
    assert.equal(quality.credits, band.credits, band.grade + ' must pay its own credits');
    if (band.grade !== 'premature') assert.equal(quality.grade, band.grade);
  }
});

test('v1.20.0 harvest quality scales concavely with depth', () => {
  const civ = GameEngine.createCivilizationForTest(83);
  civ.eventChoices = 4;
  civ.era = 1;
  civ.development = 400;
  const quality = evaluateHarvestQuality(civ, false);
  assert.equal(quality.grade, 'transcendent');
  assert.equal(quality.depth, 5);
  assert.equal(quality.credits, 3);
  assert.equal(Number(quality.multiplier.toFixed(4)), Number(depthYieldMultiplier(5).toFixed(4)));

  civ.development = 1920;
  const deep = evaluateHarvestQuality(civ, false);
  assert.equal(deep.grade, 'singular');
  assert.equal(deep.credits, DEPTH_CREDIT_CAP);

  // Concave, and measurably so. A run nearly five times as deep must be worth clearly less than five
  // times as much, or a run is quadratic in its own duration and the meta-economy compounds -- which
  // is exactly what v1.19 did.
  assert.ok(deep.multiplier > quality.multiplier, 'deeper must still pay more');
  assert.ok(deep.multiplier < quality.multiplier * 2.5, 'depth 24 must not pay 4.8x depth 5');
  let previousSlope = Infinity;
  for (const depth of [2, 4, 8, 16, 32]) {
    const slope = depthYieldMultiplier(depth + 1) - depthYieldMultiplier(depth);
    assert.ok(slope > 0, 'the curve must keep rising at depth ' + depth);
    assert.ok(slope < previousSlope, 'the curve must keep flattening at depth ' + depth);
    previousSlope = slope;
  }
});

test('v1.20.0 no single run can bank more than half a Universe', () => {
  const civ = GameEngine.createCivilizationForTest(84);
  civ.eventChoices = 9;
  civ.era = 3;
  civ.development = 100_000;
  assert.equal(evaluateHarvestQuality(civ, false).credits, DEPTH_CREDIT_CAP);
  assert.equal(DEPTH_CREDIT_CAP, 10);
  // A Universe costs 18. The cap is what makes two successful runs the arithmetic floor for a
  // prestige at every stage of the game -- including a completed Directive objective's extra credit.
  assert.ok(DEPTH_CREDIT_CAP + 1 < 18, 'one run must never fund a Universe');
  assert.ok(DEPTH_CREDIT_CAP * 2 >= 18, 'two perfect runs must be able to');
});

test('a premature harvest stays premature at any depth', () => {
  const civ = GameEngine.createCivilizationForTest(85);
  civ.development = 4000;
  civ.era = 0;
  civ.eventChoices = 9;
  const zeroEra = evaluateHarvestQuality(civ, false);
  assert.equal(zeroEra.grade, 'premature');
  assert.equal(zeroEra.multiplier, 0.2);
  assert.equal(zeroEra.credits, 0);
  civ.era = 2;
  civ.eventChoices = 2;
  assert.equal(evaluateHarvestQuality(civ, false).grade, 'premature');
});

test('Entropy costs yield continuously below the cascade threshold', () => {
  // Until this change Entropy did nothing at all below 100: cascadeDecay only fires there, and the
  // three threshold crises move Entropy by -2 to +4. The interface named four alarm bands over a
  // number that was free, which measured as a 69-second and 2-credit penalty for obeying it.
  assert.equal(entropyDrag(0), 1);
  assert.equal(Number(entropyDrag(25).toFixed(4)), 0.9688);
  assert.equal(Number(entropyDrag(50).toFixed(4)), 0.875);
  assert.equal(Number(entropyDrag(75).toFixed(4)), 0.7188);
  assert.equal(entropyDrag(100), 1 - ENTROPY_DRAG_MAX);

  // Monotone, and clamped outside the band so a stray value cannot invert growth.
  for (let entropy = 0; entropy < 100; entropy += 5) assert.ok(entropyDrag(entropy) > entropyDrag(entropy + 5));
  assert.equal(entropyDrag(-40), 1);
  assert.equal(entropyDrag(400), 1 - ENTROPY_DRAG_MAX);
  assert.equal(entropyDrag(Number.NaN), 1);
});

test('the tick and the interface forecast share one development formula', () => {
  const engine = freshEngine();
  engine.startCivilization(9101);
  const civ = engine.state.civilization;
  civ.years = 3000;
  civ.era = 1;
  civ.development = 200;

  // The forecast the rail draws must be the rate the tick actually applies, or the "credit in Ns"
  // call quietly lies. tick() clamps its delta to 0.25 s, and advancePressure runs before the
  // development line inside the same tick, so the applied growth uses an Entropy a fraction of a
  // point higher than the sampled rate -- hence a relative tolerance rather than an exact equality.
  // A drifted formula would miss by percent, not by 1e-5.
  const rate = engine.developmentRate();
  const before = civ.development;
  engine.tick(0.25);
  const applied = engine.state.civilization.development - before;
  assert.ok(Math.abs(applied - rate * 0.25) / (rate * 0.25) < 1e-5, `applied ${applied} against ${rate * 0.25}`);

  // And the rate has to answer to Entropy.
  civ.tactical.entropy = 0;
  const clean = engine.developmentRate();
  civ.tactical.entropy = 100;
  assert.ok(Math.abs(engine.developmentRate() - clean * (1 - ENTROPY_DRAG_MAX)) < 1e-9);
  assert.equal(developmentGrowthPerSecond(civ, 0), engine.developmentRate());
});

test('Accelerate pays a one-off price instead of a permanent pressure surcharge', () => {
  const engine = freshEngine();
  engine.startCivilization(9102);
  const civ = engine.state.civilization;
  const rateBefore = entropyRate(pressureYears(civ), 0);

  assert.equal(engine.useTacticalAction('accelerate'), true);
  assert.equal(civ.years, 200, 'Era and Development still see the injected years');
  assert.equal(civ.injectedYears, 200);
  // The years Accelerate injected are excluded from the pressure curve: measured across five seeds
  // and three containment levels, charging them made Accelerate strictly dominated at every level,
  // because +200 years inflates the rate for the whole remaining run to buy +6 Development.
  assert.equal(pressureYears(civ), 0);
  assert.equal(entropyRate(pressureYears(civ), 0), rateBefore, 'the rate must not move on an injection');

  // Lived years still count, in full. Accelerate also pulls the intervention timer to zero, so the
  // next tick opens an event and every later tick returns early until it is resolved.
  engine.tick(0.25);
  const opened = engine.currentEvent();
  if (opened) engine.chooseEvent(safestChoiceIndex(opened));
  // tick() clamps its delta to 0.25 s, so four ticks are one simulation second.
  for (let i = 0; i < 4; i++) engine.tick(0.25);
  const lived = engine.state.civilization;
  assert.equal(Number(pressureYears(lived).toFixed(2)), 31.25);
  assert.equal(Number(lived.years.toFixed(2)), 231.25);
  assert.equal(lived.injectedYears, 200, 'the injection is recorded once and never grows on its own');
  assert.ok(entropyRate(pressureYears(engine.state.civilization), 0) > rateBefore);
});

test('pressure years default to the full year count for a save written before the split', () => {
  // The field is an optional addition rather than a SAVE_VERSION bump, so an in-progress run from an
  // older save must keep counting its already-injected years as pressure -- exactly what it did when
  // it was saved. Failing safe here means no behaviour change at all for that run.
  assert.equal(pressureYears({ years: 4000 }), 4000);
  assert.equal(pressureYears({ years: 4000, injectedYears: undefined }), 4000);
  assert.equal(pressureYears({ years: 4000, injectedYears: 600 }), 3400);
  assert.equal(pressureYears({ years: 400, injectedYears: 9000 }), 0, 'never negative');
});

test('the reachable horizon counts the vents Stability can still pay for', () => {
  // secondsToCascade is documented as a floor that assumes the player stops playing. Over the minutes
  // a credit step takes, that assumption is what made the call misfire in the browser: HARVEST NOW at
  // 100 s on a run that reached 276 s and banked the credit anyway.
  const base = { secondsToCascade: 60, entropyRate: 0.5, stability: 100, controlCapacity: 15, ventEntropyRelief: 18, ventStabilityCost: 10 };
  // 100 Stability buys 10 vents, each worth 18 Entropy at 0.5/s, so 36 s apiece. Capacity is 15.
  assert.equal(reachableRunSeconds(base), 60 + 10 * 36);
  assert.equal(reachableRunSeconds({ ...base, stability: 25 }), 60 + 2 * 36, 'partial vents do not count');
  assert.equal(reachableRunSeconds({ ...base, controlCapacity: 2 }), 60 + 2 * 36, 'vents capped by control capacity');
  assert.equal(reachableRunSeconds({ ...base, stability: 0 }), 60, 'no Stability, no extension');
  assert.equal(reachableRunSeconds({ ...base, entropyRate: 0 }), Number.POSITIVE_INFINITY);
  // A higher rate shortens what each vent buys, so the horizon shrinks as pressure rises.
  assert.ok(reachableRunSeconds({ ...base, entropyRate: 1 }) < reachableRunSeconds(base));
});

test('the harvest call fires when the next credit stops fitting in the reachable run', () => {
  // No Stability to vent with, so the horizon is the cascade floor and the arithmetic is legible.
  const base = { depth: 5, credits: 3, developmentRate: 1, entropy: 40, premature: false,
    entropyRate: 0.5, stability: 0, controlCapacity: 3, ventEntropyRelief: 18, ventStabilityCost: 10 };
  // Credit 4 lands at depth 6.667, so 133.3 Development, so 133.3 s at rate 1.
  assert.equal(harvestUrgency({ ...base, secondsToCascade: 400 }).state, 'building');
  assert.equal(harvestUrgency({ ...base, secondsToCascade: 180 }).state, 'closing');
  assert.equal(harvestUrgency({ ...base, secondsToCascade: 100 }).state, 'harvest');
  assert.equal(Math.round(harvestUrgency({ ...base, secondsToCascade: 400 }).secondsToNextCredit), 133);
  assert.equal(harvestUrgency({ ...base, secondsToCascade: 400 }).nextCredit, 4);

  // The same instant with Stability in hand is not urgent: the vents it pays for reach the credit.
  assert.equal(harvestUrgency({ ...base, secondsToCascade: 100, stability: 100 }).state, 'building');

  // A cascade already under way overrides everything, and a stalled rate means the credit never lands.
  assert.equal(harvestUrgency({ ...base, secondsToCascade: 400, entropy: 100 }).state, 'cascading');
  assert.equal(harvestUrgency({ ...base, secondsToCascade: 400, developmentRate: 0 }).state, 'harvest');

  // A premature run has nothing banked, so "harvest now" is never the answer whatever the clock says.
  assert.equal(harvestUrgency({ ...base, secondsToCascade: 1, premature: true }).state, 'building');

  // At the credit cap there is no next step to wait for, so the call is to harvest. (Now capped)
  assert.equal(harvestUrgency({ ...base, credits: 20, secondsToCascade: 4000 }).state, 'capped');
});

test('a chaotic harvest keeps sixty percent of its credits, rounded at every scale', () => {
  const quality = { grade: 'singular', multiplier: 5.53, credits: 14, depth: 24 };
  assert.equal(calculateCultivationCredits(quality, false, false), 14);
  assert.equal(calculateCultivationCredits(quality, true, false), 8);
  assert.equal(calculateCultivationCredits(quality, false, true), 15);
  assert.equal(calculateCultivationCredits(quality, true, true), 9);
  const premature = { grade: 'premature', multiplier: 0.2, credits: 0, depth: 0.4 };
  assert.equal(calculateCultivationCredits(premature, false, true), 0);

  // Rounded, not floored. Flooring bit hardest where the stakes were smallest -- a 3-credit
  // run lost 67% of its credits to a cascade while a 14-credit run lost 43% -- which inverts the
  // "loss proportional to what was at stake" the v1.5.0 design asked for.
  const shallow = { grade: 'established', multiplier: 0.63, credits: 1, depth: 1.7 };
  assert.equal(calculateCultivationCredits(shallow, true, false), 1);
  const three = { grade: 'transcendent', multiplier: 1.49, credits: 3, depth: 5.65 };
  assert.equal(calculateCultivationCredits(three, true, false), 2);

  // Never more than 60% survives, and always within half a credit of exactly 60%.
  for (const credits of [1, 2, 3, 5, 8, 14, 20]) {
    const kept = calculateCultivationCredits({ grade: 'singular', multiplier: 1, credits, depth: 20 }, true, false);
    assert.ok(kept <= credits, `a cascade must never pay more than a controlled harvest (${credits} -> ${kept})`);
    assert.ok(kept <= credits * 0.6 + 0.5, `${credits} credits kept ${kept}`);
  }
  // From two credits up the cascade always costs at least one.
  for (const credits of [2, 3, 5, 8, 14, 20]) {
    const kept = calculateCultivationCredits({ grade: 'singular', multiplier: 1, credits, depth: 20 }, true, false);
    assert.ok(kept < credits, `a cascade must cost credits (${credits} -> ${kept})`);
  }
  // The one-credit run is the deliberate exception: 60% of 1 rounds back to 1, so a cascade costs it
  // no credit. Flooring would cost it 100%, which is the opposite of proportional. The resource side
  // still bites -- chaoticRetention keeps 40% of everything else -- so the failure is never free.
  assert.equal(calculateCultivationCredits({ grade: 'established', multiplier: 1, credits: 1, depth: 1.7 }, true, false), 1);
});

test('chaotic resource yield uses forty percent retention and a 1.50 Paradox multiplier', () => {
  const civ = GameEngine.createCivilizationForTest(821);
  civ.development = 100;
  civ.stats.stability = 80;
  const bonuses = GameEngine.baseBonuses();
  const controlled = calculateHarvest(civ, false, bonuses);
  const chaotic = calculateHarvest(civ, true, bonuses);

  assert.equal(bonuses.chaoticRetention, 0.4);
  assert.deepEqual(controlled, {
    causal_mass: 95,
    cognition: 125,
    paradox: 23,
    existence: 82,
  });
  assert.deepEqual(chaotic, {
    causal_mass: 38,
    cognition: 50,
    paradox: 35,
    existence: 33,
  });
});

test('Universe consumption requires eighteen Cultivation Credits', () => {
  const engine = freshEngine();
  engine.state.meta.progression.unlockedSystems.push('universe_prestige');
  engine.state.machine.cultivationCreditsThisUniverse = 17;
  assert.equal(engine.canConsumeUniverse(), false);
  engine.state.machine.cultivationCreditsThisUniverse = 18;
  assert.equal(engine.canConsumeUniverse(), true);
});

test('six immediate harvests cannot unlock Universe consumption', () => {
  const engine = freshEngine();
  engine.state.meta.progression.unlockedSystems.push('universe_prestige');
  for (let run = 0; run < 6; run++) {
    engine.startCivilization(900 + run);
    engine.harvest(false);
  }
  assert.equal(engine.state.machine.cultivationCreditsThisUniverse, 0);
  assert.equal(engine.canConsumeUniverse(), false);
});

test('Directive offers are deterministic per prepared run', () => {
  const ids = CONTENT.directives.map(item => item.id);
  assert.deepEqual(buildDirectiveOffers(ids, 12345, 3), buildDirectiveOffers(ids, 12345, 3));
  assert.equal(new Set(buildDirectiveOffers(ids, 12345, 3)).size, 3);
});

test('a Directive locks only for one Civilization', () => {
  const engine = freshEngine();
  engine.state.meta.progression.unlockedSystems.push('directives');
  engine.state.meta.progression.knownDirectives = CONTENT.directives.map(item => item.id);
  engine.prepareNextRun(777);
  const selected = engine.state.machine.runBuild.directiveOfferIds[0];
  assert.equal(engine.selectDirective(selected), true);
  engine.startCivilization(91);
  assert.equal(engine.state.civilization.directiveId, selected);
  engine.harvest(false);
  assert.equal(engine.state.machine.runBuild.selectedDirective, '');
  assert.equal(engine.state.machine.runBuild.directiveLocked, false);
  assert.notEqual(engine.state.machine.runBuild.nextCivilizationSeed, 777);
});

test('Directive completion boosts rewards by fifteen percent and grants one credit', () => {
  const engine = freshEngine();
  engine.state.meta.progression.unlockedSystems.push('directives');
  engine.state.meta.progression.knownDirectives = ['stable_cultivation'];
  engine.prepareNextRun(778);
  engine.selectDirective('stable_cultivation');
  engine.startCivilization();
  const civ = engine.state.civilization;
  civ.era = 1;
  civ.eventChoices = 3;
  civ.development = 400;
  civ.stats.stability = 90;
  civ.tactical.entropy = 40;
  const preview = engine.previewHarvestDetails(false);
  assert.equal(preview.objectiveCompleted, true);
  assert.equal(preview.depth, 5);
  assert.equal(preview.credits, 4);
  assert.equal(Number(preview.rewardMultiplier.toFixed(6)), Number((depthYieldMultiplier(5) * 1.15).toFixed(6)));
  engine.harvest(false);
  assert.equal(engine.state.machine.lastHarvest.objective_completed, true);
  assert.equal(engine.state.machine.cultivationCreditsThisUniverse, 4);
});

test('chaotic Credit penalty is identical in harvest preview and committed record', () => {
  const engine = freshEngine();
  engine.state.meta.progression.unlockedSystems.push('directives');
  engine.state.meta.progression.knownDirectives = ['stable_cultivation'];
  engine.prepareNextRun(7781);
  engine.selectDirective('stable_cultivation');
  engine.startCivilization();
  const civ = engine.state.civilization;
  civ.era = 1;
  civ.eventChoices = 3;
  civ.development = 400;
  civ.stats.stability = 90;
  civ.tactical.entropy = 40;

  assert.equal(engine.previewHarvestDetails(false).credits, 4);
  assert.equal(engine.previewHarvestDetails(true).credits, 2);
  engine.harvest(true);
  assert.equal(engine.state.machine.lastHarvest.credits, 2);
  assert.equal(engine.state.machine.cultivationCreditsThisUniverse, 2);
});

test('prepared trait previews survive reload and match the started Civilization', () => {
  const storage = new Map();
  const adapter = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  };
  const first = new GameEngine({ storage: adapter });
  first.prepareNextRun(779);
  const preview = [...first.state.machine.runBuild.previewTraitIds];
  first.save();
  const second = new GameEngine({ storage: adapter });
  assert.deepEqual(second.state.machine.runBuild.previewTraitIds, preview);
  second.startCivilization();
  assert.deepEqual(second.state.civilization.traits, preview);
});

test('v1.3.1 machine curve uses the approved balanced prices and growth', () => {
  const actual = Object.fromEntries(balancedMachineUpgrades(CONTENT.machine_upgrades)
    .map(definition => [definition.id, [definition.base_cost, definition.growth]]));
  assert.deepEqual(actual, {
    reality_lattice: [60, 1.9],
    prediction_core: [90, 1.60],
    cultivation_accelerator: [120, 1.68],
    historical_compressor: [120, 1.68],
    cognitive_extractor: [120, 1.68],
    paradox_sieve: [110, 1.68],
    existence_furnace: [130, 1.70],
    awareness_scrubber: [150, 2.2],
    sanity_protocol: [165, 2.2],
    cosmic_muffling: [150, 2.2],
    contingency_vat: [210, 1.75],
    temporal_injector: [220, 1.75],
  });

  assert.ok(balancedUniverseUpgrades(CONTENT.universe_upgrades).every(definition => definition.growth === 1.75));
  assert.ok(balancedAxiomUpgrades(CONTENT.axiom_upgrades).every(definition => definition.growth >= 2.15));
});

test('v1.3.1 delays early yield extractors behind earned Machine Insight', () => {
  const machineRules = progressionRulesForLayer('machine');
  assert.equal(machineRules.cognitive_extractor.insight, 4);
  assert.equal(machineRules.paradox_sieve.insight, 5);
});

test('v1.3.1 first-run curve funds one or two levels at the median and at most three at p90', () => {
  const runs = Array.from({ length: 80 }, (_, index) => simulatedBalanceRun(10_000 + index * 97));
  const median = percentile(runs.map(run => run.purchasableLevels), 0.5);
  const p90 = percentile(runs.map(run => run.purchasableLevels), 0.9);

  assert.ok(median >= 1 && median <= 2, `first-run purchasable-level median ${median}`);
  assert.ok(p90 <= 3, `first-run purchasable-level p90 ${p90}`);
  // A run that collapses short of the first Cultivation Credit stays Premature -- the grade bands are
  // credit steps now, so "established" means "banked something", not "survived a while".
  assert.ok(runs.every(run => run.harvest.grade === 'established' || run.harvest.chaotic));
  assert.ok(runs.filter(run => run.harvest.grade === 'established').length >= runs.length * 0.9);
});

test('v1.3.1 Accelerate policy has blocked turns instead of self-funding every intervention', () => {
  const runs = Array.from({ length: 80 }, (_, index) => simulatedBalanceRun(10_000 + index * 97, {
    accelerateWheneverAvailable: true,
  }));
  const medianElapsed = percentile(runs.map(run => run.elapsed), 0.5);

  assert.ok(runs.every(run => run.blockedAccelerates > 0));
  assert.ok(runs.every(run => run.successfulAccelerates < run.resolvedInterventions));
  assert.ok(medianElapsed >= 50 && medianElapsed <= 85, `Accelerated Established median ${medianElapsed}s`);
});

test('v1.3.1 chaotic collapse stays within the two-level median and three-level p90 envelope', () => {
  const runs = Array.from({ length: 80 }, (_, index) => simulatedBalanceRun(10_000 + index * 97, {
    accelerateWheneverAvailable: true,
    collapse: true,
  }));
  const median = percentile(runs.map(run => run.purchasableLevels), 0.5);
  const p90 = percentile(runs.map(run => run.purchasableLevels), 0.9);

  assert.ok(median <= 2, `chaotic-collapse purchasable-level median ${median}`);
  assert.ok(p90 <= 3, `chaotic-collapse purchasable-level p90 ${p90}`);
  assert.ok(runs.every(run => run.harvest.chaotic === true));
});

test('v1.3.1 common Controlled routes consume a Universe in six to nine successful runs', () => {
  const established = { grade: 'established', multiplier: 0.75, credits: 2 };
  const transcendent = { grade: 'transcendent', multiplier: 1, credits: 3 };

  assert.equal(calculateCultivationCredits(established, false, false) * 9, 18);
  assert.equal(calculateCultivationCredits(transcendent, false, false) * 6, 18);
  assert.ok(calculateCultivationCredits(established, false, false) * 6 < 18);
  assert.ok(calculateCultivationCredits(established, true, false) * 9 < 18);
  assert.equal(calculateCultivationCredits(established, false, true) * 6, 18);
});

test('protective upgrades produce visible Containment Rating', () => {
  const engine = freshEngine();
  engine.state.machine.upgradeLevels = {
    reality_lattice: 1,
    awareness_scrubber: 1,
    sanity_protocol: 1,
    cosmic_muffling: 1,
  };
  assert.equal(engine.runtimeBonuses().containmentRating, 4);
});

test('Temporal Injector improves Accelerate while Stable Constants and Bureaucracy improve pressure control', () => {
  const engine = freshEngine();
  engine.state.machine.upgradeLevels.temporal_injector = 3;
  engine.state.meta.universeUpgradeLevels.stable_constants = 2;
  engine.state.meta.universeUpgradeLevels.bureaucracy_of_gods = 3;
  const bonuses = engine.runtimeBonuses();
  assert.equal(bonuses.accelerateYears, 1150);
  assert.equal(bonuses.accelerateDevelopment, 48);
  assert.equal(bonuses.accelerateTimer, 18);
  assert.equal(bonuses.eventDelay, 0);
  assert.equal(bonuses.containmentRating, 2);
  assert.equal(bonuses.controlRecharge, 3);
});

test('a first run played to its cascade funds at least one machine upgrade', () => {
  const engine = freshEngine();
  runCivilization(engine, { seed: 20260819 });
  assert.equal(engine.state.machine.lastHarvest.grade, 'established');
  assert.ok(engine.visibleUpgradeEntries('machine').some(entry => entry.status === 'available' && engine.canPurchaseUpgrade('machine', entry.definition.id)));
  assert.equal(engine.canPurchaseUpgrade('machine', 'reality_lattice'), true);
});

test('harvesting the instant Expansion begins is worse than playing the run out', () => {
  const rush = freshEngine();
  rush.startCivilization(20260819);
  while (rush.state.phase === 'civilization') {
    const civ = rush.state.civilization;
    if (civ.era >= 1 && civ.eventChoices >= 3) break;
    const event = rush.currentEvent();
    if (event) rush.chooseEvent(safestChoiceIndex(event));
    else rush.tick(0.25);
  }
  rush.harvest(false);
  const played = freshEngine();
  runCivilization(played, { seed: 20260819 });
  assert.equal(rush.state.machine.lastHarvest.grade, 'premature');
  assert.ok(
    rush.state.machine.lastHarvest.rewards.causal_mass < played.state.machine.lastHarvest.rewards.causal_mass,
    'the rush must yield less than the completed run',
  );
  assert.equal(rush.canPurchaseUpgrade('machine', 'reality_lattice'), false);
});

test('path dominance requires five affinity and a two-point lead', () => {
  const civ = GameEngine.createCivilizationForTest(42);
  civ.pathState.affinity.machine_faith = 5;
  civ.pathState.affinity.collective_mind = 4;
  assert.equal(CivilizationPaths.resolveDominance(civ), '');
  civ.pathState.affinity.collective_mind = 3;
  assert.equal(CivilizationPaths.resolveDominance(civ), 'machine_faith');
});

test('harvest math and upgrade costs preserve Godot formulas', () => {
  assert.equal(upgradeCost(90, 1.7, 0), 90);
  const civ = GameEngine.createCivilizationForTest(7);
  civ.years = 3500;
  civ.development = 240;
  civ.era = 1;
  civ.eventChoices = 4;
  civ.stats.stability = 70;
  const result = calculateHarvest(civ, false, GameEngine.baseBonuses());
  assert.ok(result.causal_mass > 200);
  assert.ok(result.cognition > result.paradox);
});

test('engine can start a civilization, resolve an event, harvest, and persist', () => {
  const storage = new Map();
  const engine = new GameEngine({ storage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key)
  }});
  assert.equal(engine.startCivilization(12345), true);
  const civ = engine.state.civilization;
  assert.ok(civ);
  engine.forceEvent('routine_compliance_audit');
  assert.equal(engine.chooseEvent(0), true);
  const rewards = engine.harvest(false);
  assert.ok(rewards.causal_mass >= 0);
  assert.equal(engine.state.phase, 'machine');
  engine.save();
  const second = new GameEngine({ storage: engine.storage });
  assert.equal(second.state.machine.civilizationsTotal, 1);
});

test('simulation ticks do not write localStorage every animation frame', () => {
  let writes = 0;
  const storage = new Map();
  const adapter = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => { writes++; storage.set(key, value); },
    removeItem: key => storage.delete(key)
  };
  const engine = new GameEngine({ storage: adapter });
  engine.startCivilization(2468);
  writes = 0;
  engine.tick(1 / 60);
  assert.equal(writes, 0);
  engine.save();
  assert.equal(writes, 1);
});

test('simulation batches UI notifications instead of replacing controls every frame', () => {
  const storage = new Map();
  const engine = new GameEngine({ storage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key)
  }});
  engine.startCivilization(8642);
  let notifications = 0;
  engine.onChange(() => { notifications++; });

  for (let frame = 0; frame < 29; frame++) engine.tick(1 / 60);
  assert.equal(notifications, 0);
  engine.tick(1 / 60);
  assert.equal(notifications, 1);
});

test('eraForYears is the single source of truth for the four eras', () => {
  assert.equal(eraForYears(0), 0);
  assert.equal(eraForYears(2499), 0);
  assert.equal(eraForYears(2500), 1);
  assert.equal(eraForYears(6499), 1);
  assert.equal(eraForYears(6500), 2);
  assert.equal(eraForYears(13999), 2);
  assert.equal(eraForYears(14000), 3);
  assert.equal(eraForYears(999999), 3);
  assert.equal(eraForYears(-50), 0);
  assert.deepEqual([...ERA_YEAR_THRESHOLDS], [0, 2500, 6500, 14000]);
  assert.equal(ERA_NAMES.length, 4);
  assert.equal(ERA_NAMES[3], 'APOTHEOSIS');
});

test('containment sums upgrade levels across both layers', () => {
  const engine = freshEngine();
  assert.equal(engine.runtimeBonuses().containmentRating, 0);
  engine.state.machine.upgradeLevels.reality_lattice = 3;
  assert.equal(engine.runtimeBonuses().containmentRating, 3);
  engine.state.machine.upgradeLevels.awareness_scrubber = 2;
  engine.state.machine.upgradeLevels.sanity_protocol = 1;
  engine.state.machine.upgradeLevels.cosmic_muffling = 1;
  engine.state.meta.universeUpgradeLevels.stable_constants = 5;
  assert.equal(engine.runtimeBonuses().containmentRating, 12);
  assert.equal(engine.runtimeBonuses().entropyGainMult, undefined);
});

test('v1.20.0 Reality Lattice opens at 60 and then climbs steeply', () => {
  const engine = freshEngine();
  const lattice = engine.upgradeById('machine', 'reality_lattice');
  // The opening rung is the design promise the ladder exists to keep: a first weak run affords the
  // first real survival improvement.
  assert.equal(engine.upgradeCost('machine', 'reality_lattice'), 60);
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6, 7].map(level => upgradeCost(lattice.base_cost, lattice.growth, level, lattice.cost_ladder)),
    [60, 600, 1800, 4500, 11000, 26000, 60000, 140000],
  );

  // From the second rung on, Reality Lattice must not simply be the cheapest Containment: the other
  // three modules have to be a live alternative or the survival build has no decisions in it.
  const secondLattice = upgradeCost(lattice.base_cost, lattice.growth, 1, lattice.cost_ladder);
  for (const id of ['awareness_scrubber', 'sanity_protocol', 'cosmic_muffling']) {
    const module = engine.upgradeById('machine', id);
    const first = upgradeCost(module.base_cost, module.growth, 0, module.cost_ladder);
    assert.ok(first < secondLattice, id + ' must undercut a second Lattice level');
    assert.ok(first > 60, id + ' must not undercut the opening Lattice rung');
    // Deepening one module has to lose to broadening across them, or "spread your Containment" is
    // advice the price list contradicts.
    assert.ok(upgradeCost(module.base_cost, module.growth, 1, module.cost_ladder) > secondLattice, id + ' level 2 must cost more than a second Lattice');
  }

  // Beyond the authored rungs the curve continues geometrically rather than falling off a cliff.
  assert.equal(upgradeCost(lattice.base_cost, lattice.growth, 8, lattice.cost_ladder), Math.round(140000 * 1.9));
});

test('Wide Lattice preserves Reality Lattice levels through Universe consumption', () => {
  const engine = freshEngine();
  engine.state.machine.upgradeLevels.reality_lattice = 5;
  engine.state.machine.upgradeLevels.awareness_scrubber = 3;
  engine.state.meta.universeUpgradeLevels.wide_lattice = 2;
  engine.state.meta.progression.unlockedSystems.push('universe_prestige');
  engine.state.machine.cultivationCreditsThisUniverse = 18;
  assert.equal(engine.consumeUniverse(), true);
  assert.equal(engine.state.machine.upgradeLevels.reality_lattice, 2);
  assert.equal(engine.state.machine.upgradeLevels.awareness_scrubber, undefined);
});

test('the universe upgrade growth floor leaves the ladder walkable', () => {
  const engine = freshEngine();
  const stable = engine.upgradeById('universe', 'stable_constants');
  assert.equal(stable.growth, 1.75);
  const ladder = [0, 1, 2, 3, 4].map(level => upgradeCost(stable.base_cost, stable.growth, level));
  assert.deepEqual(ladder, [4, 7, 12, 21, 38]);
  assert.equal(ladder.reduce((sum, cost) => sum + cost, 0), 82);
});

test('the residue award scales with credits earned, not civilization count', () => {
  assert.equal(universeResidueAward(18, 8000, 1), 32);
  assert.ok(universeResidueAward(36, 8000, 1) > universeResidueAward(18, 8000, 1));
  assert.equal(universeResidueAward(0, 0, 1), 1);
  assert.ok(universeResidueAward(18, 8000, 1.8) > universeResidueAward(18, 8000, 1));
});

test('the axiom award rewards universe investment', () => {
  assert.equal(multiverseAxiomAward(4, 24), 10);
  assert.ok(multiverseAxiomAward(4, 48) > multiverseAxiomAward(4, 24));
  assert.equal(multiverseAxiomAward(0, 0), 1);
});

test('the harvest record carries the depth that produced it', () => {
  const engine = withUpgrades(freshEngine(), { reality_lattice: 4 }, {});
  runCivilization(engine, { seed: 4242, harvestAt: 'transcendent' });
  const record = engine.state.machine.lastHarvest;
  assert.equal(typeof record.depth, 'number');
  assert.ok(record.depth > 0);
  assert.equal(record.grade, depthBand(record.depth));
  assert.ok(record.credits >= 1);
});

test('a Universe consumed with more credits returns more residue', () => {
  const consume = credits => {
    const engine = freshEngine();
    engine.state.meta.progression.unlockedSystems.push('universe_prestige');
    engine.state.machine.cultivationCreditsThisUniverse = credits;
    engine.state.machine.currencies.causal_mass = 8000;
    engine.consumeUniverse();
    return engine.state.meta.universalResidue;
  };
  assert.equal(consume(18), universeResidueAward(18, 8000, 1));
  assert.ok(consume(36) > consume(18));
});

test('the harvest era term extends into Apotheosis', () => {
  const civ = GameEngine.createCivilizationForTest(861);
  civ.development = 500;
  civ.era = 2;
  const bonuses = GameEngine.baseBonuses();
  const transcendence = calculateHarvest(civ, false, bonuses);
  civ.era = 3;
  const apotheosis = calculateHarvest(civ, false, bonuses);
  assert.ok(apotheosis.existence > transcendence.existence, 'Existence must keep scaling in Apotheosis');
  assert.ok(apotheosis.paradox > transcendence.paradox, 'Paradox must keep scaling in Apotheosis');
});

test('the pool falls back to seen events before it falls back to one event', () => {
  const civ = GameEngine.createCivilizationForTest(310);
  const events = [
    { id: 'a', weight: 1 },
    { id: 'b', weight: 1 },
    { id: 'c', weight: 1 },
  ];
  const options = {
    pathMultiplier: () => 1,
    stateMultiplier: () => 1,
    exhausted: event => (civ.eventCounts[event.id] ?? 0) >= 1,
  };
  assert.equal(buildInterventionPool(events, civ, options).length, 3);
  civ.eventCounts = { a: 1, b: 1, c: 1 };
  const saturated = buildInterventionPool(events, civ, options);
  assert.equal(saturated.length, 3, 'every exhausted event must return once nothing fresh is left');
  recordRecentIntervention(civ, 'a');
  const withoutRecent = buildInterventionPool(events, civ, options);
  assert.deepEqual(withoutRecent.map(entry => entry.event.id).sort(), ['b', 'c'], 'the most recent event must stay excluded');
});

test('freshness spreads saturated repetition instead of concentrating it', () => {
  const civ = GameEngine.createCivilizationForTest(311);
  civ.eventCounts = { often: 6, rarely: 1 };
  const options = { pathMultiplier: () => 1, stateMultiplier: () => 1, exhausted: () => true };
  const pool = buildInterventionPool([{ id: 'often', weight: 1 }, { id: 'rarely', weight: 1 }], civ, options);
  const weights = new Map(pool.map(entry => [entry.event.id, entry.weight]));
  assert.ok(weights.get('rarely') > weights.get('often') * 2);
});

test('Apotheosis has its own cadence and phase weighting', () => {
  const civ = GameEngine.createCivilizationForTest(320);
  civ.era = 3;
  assert.deepEqual(eventDelayWindow(civ), { min: 6, max: 9 });
  const endgame = { id: 'x', weight: 1, path_id: 'machine_faith', path_phase: 'endgame' };
  const impulse = { id: 'y', weight: 1, path_id: 'machine_faith', path_phase: 'impulse' };
  const options = { pathMultiplier: () => 1, stateMultiplier: () => 1, exhausted: () => false };
  const pool = new Map(buildInterventionPool([endgame, impulse], civ, options).map(e => [e.event.id, e.weight]));
  assert.ok(pool.get('x') > pool.get('y') * 5, 'Apotheosis must favour endgame phases');
});

test('the era ceiling keeps the catalog eligible in Apotheosis', () => {
  const raised = applyEraCeiling(CONTENT.events);
  assert.equal(raised.length, CONTENT.events.length);
  for (let index = 0; index < raised.length; index++) {
    const original = Number(CONTENT.events[index].max_era ?? 2);
    const expected = original === 2 ? 3 : original;
    assert.equal(Number(raised[index].max_era), expected, `${raised[index].id} ceiling`);
  }
  assert.ok(raised.some(event => Number(event.max_era) === 3));
});

test('a civilization in Apotheosis still has an eligible pool', () => {
  const engine = freshEngine();
  engine.startCivilization(321);
  const civ = engine.state.civilization;
  civ.era = 3;
  civ.years = 15000;
  civ.eventChoices = 12;
  civ.pendingEvent = '';
  civ.eventTimer = 0;
  engine.tick(0.25);
  assert.ok(civ.pendingEvent, 'an intervention must be presented in Apotheosis');
  assert.notEqual(civ.pendingEvent, 'routine_compliance_audit');
});

test('the Apotheosis event module meets its content contract', () => {
  assert.equal(APOTHEOSIS_EVENTS.length, 12);
  let entropyEffects = 0;
  let harvestEffects = 0;
  for (const event of APOTHEOSIS_EVENTS) {
    assert.equal(Number(event.min_era), 3, `${event.id} must be Apotheosis-only`);
    assert.ok(event.title && event.body, `${event.id} needs copy`);
    assert.ok(event.choices.length >= 2, `${event.id} needs at least two choices`);
    for (const choice of event.choices) {
      assert.ok(choice.label, `${event.id} choice needs a label`);
      assert.ok(choice.prediction, `${event.id} choice needs a prediction`);
      assert.ok(choice.effects && Object.keys(choice.effects).length, `${event.id} choice needs effects`);
    }
    if (event.choices.some(choice => 'entropy' in (choice.effects ?? {}))) entropyEffects++;
    if (event.choices.some(choice => Object.keys(choice.effects ?? {}).some(key => key.startsWith('harvest_mult_')))) harvestEffects++;
  }
  assert.ok(entropyEffects >= 4, `only ${entropyEffects} events touch Entropy`);
  assert.ok(harvestEffects >= 2, `only ${harvestEffects} events touch harvest multipliers`);
  const ids = new Set(APOTHEOSIS_EVENTS.map(event => event.id));
  assert.equal(ids.size, 12);
  for (const event of CONTENT.events) assert.ok(!ids.has(event.id), `${event.id} collides with the catalog`);
});

test('reaching Apotheosis awards Machine Insight', () => {
  const engine = freshEngine();
  engine.startCivilization(322);
  const civ = engine.state.civilization;
  civ.era = 3;
  civ.development = 400;
  civ.stats.awareness = 60;
  Progression.recordCivilizationProgress(engine.state, civ);
  assert.equal(engine.state.meta.progression.milestones.era_apotheosis, true);
});

test('dominance succeeds only from Transcendence and only under its guards', () => {
  const civ = GameEngine.createCivilizationForTest(330);
  const paths = CivilizationPaths.ensure(civ);
  paths.affinity.machine_faith = 6;
  assert.equal(CivilizationPaths.resolveDominance(civ), 'machine_faith');
  assert.equal(paths.dominantPath, 'machine_faith');
  assert.equal(paths.successions, 0);

  paths.affinity.void_communion = 9;
  civ.era = 1;
  assert.equal(CivilizationPaths.resolveDominance(civ), '', 'no succession below Transcendence');

  civ.era = 2;
  civ.eventChoices = 2;
  assert.equal(CivilizationPaths.resolveDominance(civ), '', 'no succession inside the interval');

  civ.eventChoices = 8;
  assert.equal(CivilizationPaths.resolveDominance(civ), 'void_communion');
  assert.equal(paths.dominantPath, 'void_communion');
  assert.equal(paths.successions, 1);
});

test('succession stops after three changes', () => {
  const civ = GameEngine.createCivilizationForTest(331);
  const paths = CivilizationPaths.ensure(civ);
  civ.era = 2;
  const order = ['machine_faith', 'void_communion', 'temporal_dominion', 'reality_engineering', 'collective_mind'];
  order.forEach((id, index) => {
    paths.affinity[id] = 6 + index * 4;
    civ.eventChoices = index * 5;
    CivilizationPaths.resolveDominance(civ);
  });
  assert.equal(paths.successions, SUCCESSION_MAX);
  assert.equal(paths.dominantPath, order[SUCCESSION_MAX]);
});

test('every reached end-state is recorded once and deepens the harvest', () => {
  const civ = GameEngine.createCivilizationForTest(332);
  const paths = CivilizationPaths.ensure(civ);
  paths.dominantPath = 'machine_faith';
  civ.development = 400;
  const before = cultivationDepth(civ);
  CivilizationPaths.applyChoice(
    civ,
    { id: 'e1', path_id: 'machine_faith', path_phase: 'endgame' },
    { label: 'finish', effects: {} },
  );
  assert.equal(paths.endgameStates.length, 1);
  assert.equal(cultivationDepth(civ), before + 1.5);
  CivilizationPaths.applyChoice(
    civ,
    { id: 'e1b', path_id: 'machine_faith', path_phase: 'endgame' },
    { label: 'finish again', effects: {} },
  );
  assert.equal(paths.endgameStates.length, 1, 'the same end-state must not count twice');
});

test('a long run never serves the same intervention twice', () => {
  const engine = withUpgrades(
    freshEngine(),
    { reality_lattice: 8, awareness_scrubber: 5, sanity_protocol: 5, cosmic_muffling: 5 },
    { stable_constants: 5 },
  );
  const result = runCivilization(engine, { seed: 7777 });
  const counts = new Map();
  for (const id of result.eventIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  const worst = Math.max(...counts.values());
  // Well past the sixty-odd interventions the frozen catalog can offer a single run, which is the
  // point: the run stays repetition-free because the catalog outlasts it, not because it is short.
  assert.ok(result.interventions >= 80, `only ${result.interventions} interventions`);
  assert.equal(counts.size, result.interventions, 'every intervention in a run must be a different one');
  assert.equal(worst, 1, `one event appeared ${worst} times`);
  assert.ok((counts.get('routine_compliance_audit') ?? 0) <= 1, 'the fallback must stay exceptional');
});

// Not one seed: a run's eligible pool depends on which paths it leans into, and a run that spreads
// its affinity thin reaches fewer path chains. Twelve seeds cover the spread, and the assertion is
// on the whole set so a single unlucky pool shows up as a failure rather than as flakiness.
test('no seed serves a repeated intervention in a naturally ending run', () => {
  const repeats = [];
  let shortest = Infinity;
  for (let index = 1; index <= 12; index++) {
    const seed = index * 977;
    const engine = withUpgrades(
      freshEngine(),
      { reality_lattice: 8, awareness_scrubber: 5, sanity_protocol: 5, cosmic_muffling: 5, contingency_vat: 4 },
      { stable_constants: 5 },
    );
    const result = runCivilization(engine, { seed });
    const seen = new Set();
    for (const id of result.eventIds) {
      if (seen.has(id)) repeats.push(`${seed}:${id}`);
      seen.add(id);
    }
    shortest = Math.min(shortest, result.interventions);
  }
  assert.deepEqual(repeats, []);
  assert.ok(shortest >= 40, `a run served only ${shortest} interventions`);
});

// The guarantee above is a content guarantee, and content is finite: Vent can keep a Civilization
// alive for roughly three times its natural length, and past the run-eligible pool the scheduler has
// nothing unseen left. What it must not do there is fall back onto one event, which is what the
// unbounded max_count of routine_compliance_audit used to cause.
test('a run stretched past the catalog spreads its repeats instead of concentrating them', () => {
  const engine = withUpgrades(
    freshEngine(),
    { reality_lattice: 8, awareness_scrubber: 5, sanity_protocol: 5, cosmic_muffling: 5, contingency_vat: 4 },
    { stable_constants: 5 },
  );
  const result = runCivilization(engine, { seed: 11, policy: ['safe', 'manage'], maxSeconds: 9000 });
  const counts = new Map();
  for (const id of result.eventIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  // The drawable catalog is 185 interventions and each may be drawn once per run, so anything above
  // it proves the run entered a second pass -- which is what the spread assertions below are about.
  assert.ok(result.interventions >= 190, `only ${result.interventions} interventions`);
  assert.ok(counts.size >= 125, `only ${counts.size} distinct events`);
  // No single intervention may take more than a twentieth of the run: the whole catalog is served
  // once before anything repeats, so a second pass is spread, not concentrated.
  const worst = Math.max(...counts.values());
  assert.ok(worst <= result.interventions * 0.05, `one event took ${worst} of ${result.interventions} interventions`);
  for (let index = 1; index < result.eventIds.length; index++) {
    assert.notEqual(result.eventIds[index], result.eventIds[index - 1], 'no intervention may repeat back to back');
  }
});

test('Vent trades Stability for Entropy relief and harvestable Paradox', () => {
  const engine = freshEngine();
  engine.startCivilization(410);
  const civ = engine.state.civilization;
  civ.tactical.entropy = 40;
  // years must agree with the era: the engine re-derives it and entering an era refunds Control.
  civ.years = 7000;
  civ.era = 2;
  assert.equal(engine.useTacticalAction('vent'), true);
  assert.equal(civ.tactical.entropy, 22);
  assert.equal(civ.stats.stability, civ.stats.stabilityMax - VENT_STABILITY_COST);
  assert.equal(civ.stats.attention, 4);
  assert.equal(civ.tactical.controlCapacity, 2);
  // 18 Entropy removed at the Transcendence rate, at the first vent's price.
  assert.equal(Number(civ.harvestBonus.paradox.toFixed(2)), 18 * (VENT_PARADOX_BASE + VENT_PARADOX_PER_ERA * 2));

  // The second vent of a run costs more and pays proportionally more, so Paradox per Stability is
  // flat and what the escalation rations is run length rather than the Paradox economy.
  civ.tactical.entropy = 40;
  civ.tactical.controlCapacity = 3;
  const paradoxAfterFirst = civ.harvestBonus.paradox;
  const stabilityBeforeSecond = civ.stats.stability;
  assert.equal(engine.useTacticalAction('vent'), true);
  const secondPrice = VENT_STABILITY_COST * (1 + VENT_COST_ESCALATION);
  assert.equal(Number((stabilityBeforeSecond - civ.stats.stability).toFixed(2)), secondPrice);
  assert.equal(
    Number(((civ.harvestBonus.paradox - paradoxAfterFirst) / paradoxAfterFirst).toFixed(4)),
    Number((secondPrice / VENT_STABILITY_COST).toFixed(4)),
  );
});

test('Vent removes only the Entropy that exists and pays out accordingly', () => {
  const engine = freshEngine();
  engine.startCivilization(411);
  const civ = engine.state.civilization;
  civ.tactical.entropy = 10;
  civ.era = 0;
  assert.equal(engine.useTacticalAction('vent'), true);
  assert.equal(civ.tactical.entropy, 0);
  assert.equal(Number(civ.harvestBonus.paradox.toFixed(2)), 10 * VENT_PARADOX_BASE);
});

test('Vent is unavailable below the minimum Entropy and changes nothing', () => {
  const engine = freshEngine();
  engine.startCivilization(412);
  const civ = engine.state.civilization;
  civ.tactical.entropy = 5;
  const snapshot = JSON.stringify(civ);
  assert.equal(engine.useTacticalAction('vent'), false);
  assert.equal(engine.lastActionFailure, 'Entropy is too low to vent.');
  assert.equal(JSON.stringify(civ), snapshot);
});

test('Vent gives the credit-optimal playstyle a Paradox source', () => {
  const build = () => withUpgrades(freshEngine(), { reality_lattice: 4 }, {});
  const without = build();
  runCivilization(without, { seed: 4141 });
  const venting = build();
  runCivilization(venting, { seed: 4141, policy: ['safe', 'vent'] });
  const vented = venting.state.machine.lastHarvest.rewards;
  const plain = without.state.machine.lastHarvest.rewards;
  assert.ok(vented.paradox > plain.paradox * 1.4, `venting must lift Paradox: ${vented.paradox} vs ${plain.paradox}`);
  // Venting now costs run length as well as Stability, so the trade has to be visible in both
  // directions: more Paradox, and a shallower run for it.
  assert.ok(vented.causal_mass < plain.causal_mass, 'venting every opportunity must cost run depth');
  const share = resources => resources.paradox / (resources.causal_mass + resources.cognition + resources.existence);
  assert.ok(share(vented) > share(plain), 'venting must raise the Paradox share of a harvest');
});

test('Accelerate keeps its two-Control cost and charges Entropy by era', () => {
  assert.equal(TACTICAL_ACTIONS.accelerate.cost, 2);
  assert.match(TACTICAL_ACTIONS.accelerate.risk, /\+3 Entropy/, 'the advertised risk must name the Emergence price');
  assert.equal(TACTICAL_ACTIONS.vent.cost, 1);
  assert.equal(TACTICAL_ACTIONS.vent.shortcut, '4');
  const engine = freshEngine();
  engine.startCivilization(413);
  const civ = engine.state.civilization;
  civ.eventTimer = 100;
  civ.pendingEvent = '';
  assert.equal(engine.useTacticalAction('accelerate'), true);
  assert.equal(civ.tactical.entropy, 3);
});

test('the Accelerate surcharge is front-loaded: cheap in Emergence, punitive in Apotheosis', () => {
  // A flat surcharge made the action dominated at every containment level -- measured over five
  // seeds, accelerating whenever available reached 2.0 Cultivation Credits against 4.8 for touching
  // nothing. The price now rises with the era, so an early push is affordable and a late one is not.
  assert.deepEqual([0, 1, 2, 3].map(accelerateEntropyCost), [3, 6, 9, 12]);
  assert.equal(accelerateEntropyCost(9), accelerateEntropyCost(3), 'the surcharge stops at the last era');
  assert.equal(accelerateEntropyCost(-1), accelerateEntropyCost(0), 'and never falls below the first');

  const engine = freshEngine();
  engine.startCivilization(414);
  const civ = engine.state.civilization;
  civ.eventTimer = 100; civ.pendingEvent = ''; civ.era = 2;
  // The rail must name the price actually charged, not the one the catalog was written with.
  assert.equal(tacticalRisk(civ, 'accelerate'), '-4 Stability · +9 Entropy');
  assert.equal(tacticalRisk(civ, 'vent'), TACTICAL_ACTIONS.vent.risk);
  assert.equal(engine.useTacticalAction('accelerate'), true);
  assert.equal(civ.tactical.entropy, 9);
});

test('no tactical policy stretches a no-upgrade run past four minutes', () => {
  const policies = [['safe'], ['safe', 'vent'], ['safe', 'stabilize'], ['safe', 'accelerate'], ['safe', 'vent', 'stabilize'], ['safe', 'vent', 'stabilize', 'accelerate']];
  for (const policy of policies) {
    const result = runCivilization(freshEngine(), { seed: 4321, policy });
    assert.ok(result.elapsed <= 240, `policy ${policy.join('+')} survived ${result.elapsed}s`);
  }
});

test('run intervention cost escalates with use and with depth', () => {
  const pulse = runInterventionById('containment_pulse');
  assert.equal(pulse.baseCost, 180);
  assert.equal(RUN_INTERVENTIONS.length, 3);
  assert.equal(runInterventionCost(pulse, 0, 0), 180);
  assert.equal(runInterventionCost(pulse, 1, 0), 540);
  assert.equal(runInterventionCost(pulse, 2, 0), 1620);
  assert.equal(runInterventionCost(pulse, 0, 20), 1080);
  assert.equal(runInterventionCost(pulse, 1, 20), 3240);
  assert.equal(runInterventionCost(pulse, 2, 20), 9720);
});

test('a containment pulse removes Entropy and consumes a use', () => {
  const engine = freshEngine();
  engine.state.meta.progression.machineInsight = 30;
  engine.state.machine.currencies.causal_mass = 5000;
  engine.startCivilization(420);
  const civ = engine.state.civilization;
  civ.tactical.entropy = 60;
  // The depth factor applies from the first use, so the quoted price already exceeds the base cost.
  const quoted = engine.runInterventions().find(view => view.id === 'containment_pulse').cost;
  assert.equal(quoted, runInterventionCost(runInterventionById('containment_pulse'), 0, civ.development / 80));
  assert.ok(quoted >= 180);
  assert.equal(engine.useRunIntervention('containment_pulse'), true);
  assert.equal(civ.tactical.entropy, 35);
  assert.equal(engine.state.machine.currencies.causal_mass, 5000 - quoted);
  assert.equal(runInterventionUses(civ, 'containment_pulse'), 1);
});

test('run interventions stop at three uses per run', () => {
  const engine = freshEngine();
  engine.state.meta.progression.machineInsight = 30;
  engine.state.machine.currencies.causal_mass = 1_000_000;
  engine.startCivilization(421);
  const civ = engine.state.civilization;
  for (let index = 0; index < 3; index++) {
    civ.tactical.entropy = 90;
    assert.equal(engine.useRunIntervention('containment_pulse'), true);
  }
  civ.tactical.entropy = 90;
  assert.equal(engine.useRunIntervention('containment_pulse'), false);
  assert.equal(engine.lastActionFailure, 'Containment Pulse is exhausted for this civilization.');
  assert.equal(civ.tactical.entropy, 90);
});

test('an unaffordable run intervention changes nothing', () => {
  const engine = freshEngine();
  engine.state.meta.progression.machineInsight = 30;
  engine.state.machine.currencies.causal_mass = 10;
  engine.startCivilization(422);
  const civ = engine.state.civilization;
  civ.tactical.entropy = 60;
  const snapshot = JSON.stringify(civ);
  assert.equal(engine.useRunIntervention('containment_pulse'), false);
  assert.equal(JSON.stringify(civ), snapshot);
  assert.equal(engine.state.machine.currencies.causal_mass, 10);
});

test('run interventions stay locked behind their Insight gates', () => {
  const engine = freshEngine();
  engine.state.machine.currencies.causal_mass = 100_000;
  engine.state.machine.currencies.cognition = 100_000;
  engine.startCivilization(423);
  const views = new Map(engine.runInterventions().map(view => [view.id, view]));
  assert.equal(views.get('containment_pulse').enabled, false);
  assert.match(views.get('containment_pulse').reason, /Machine Insight 4/);
  engine.state.meta.progression.machineInsight = 4;
  assert.equal(engine.runInterventions().find(view => view.id === 'containment_pulse').enabled, true);
  assert.equal(engine.runInterventions().find(view => view.id === 'emergency_lattice').enabled, false);
});

test('spending every reserve intervention is a losing trade', () => {
  const build = () => withUpgrades(
    freshEngine(),
    { reality_lattice: 8, awareness_scrubber: 5, sanity_protocol: 5, cosmic_muffling: 5 },
    { stable_constants: 5 },
  );
  const bank = 200_000;
  const seed = 4242;
  const keys = ['causal_mass', 'cognition', 'paradox', 'existence'];
  const without = build();
  for (const key of keys) without.state.machine.currencies[key] = bank;
  runCivilization(without, { seed });
  const withReserve = build();
  for (const key of keys) withReserve.state.machine.currencies[key] = bank;
  runCivilization(withReserve, { seed, policy: ['safe', 'reserve'] });
  const total = engine => keys.reduce((sum, key) => sum + engine.state.machine.currencies[key], 0);
  assert.ok(total(withReserve) < total(without), `reserve spending must not pay for itself: ${total(withReserve)} vs ${total(without)}`);
});

test('a no-upgrade run with full reserve spending stays under seven minutes', () => {
  const engine = freshEngine();
  engine.state.meta.progression.machineInsight = 30;
  for (const key of ['causal_mass', 'cognition', 'existence']) engine.state.machine.currencies[key] = 200_000;
  const result = runCivilization(engine, { seed: 4324, policy: ['safe', 'vent', 'reserve'] });
  assert.ok(result.elapsed <= 420, `survived ${result.elapsed}s`);
});

test('new state carries convergence and milestone statistics fields', () => {
  const state = createNewState();
  assert.equal(state.saveVersion, SAVE_VERSION);
  assert.equal(state.meta.convergences, 0);
  assert.deepEqual(state.meta.victories, []);
  const p = state.meta.progression;
  assert.deepEqual(p.seenDominantPaths, []);
  assert.equal(p.bestDepth, 0);
  assert.equal(p.bestGrade, '');
  assert.equal(p.maxDevelopment, 0);
  assert.equal(p.maxEra, 0);
  assert.equal(p.objectivesCompleted, 0);
  assert.equal(p.longestRunSeconds, 0);
  assert.equal(p.maxEndgamesInRun, 0);
  assert.equal(GameEngine.createCivilizationForTest(7).terminal, false);
});

// A version bump used to wipe every player's progress. It now migrates instead -- the whole path is
// exercised in save-migration.test.mjs; this pins the engine-level guarantee.
test('a save written under the previous version is migrated, not discarded', () => {
  const previous = { ...createNewState(), saveVersion: 3 };
  previous.meta.convergences = 5;
  previous.meta.progression.machineInsight = 12;
  const stored = JSON.stringify(previous);
  const engine = new GameEngine({
    autosave: false,
    storage: { getItem: () => stored, setItem: () => {}, removeItem: () => {} },
  });
  assert.equal(engine.state.meta.convergences, 5);
  assert.equal(engine.state.meta.progression.machineInsight, 12);
  assert.equal(engine.saveMigration.status, 'migrated');
  assert.equal(engine.state.saveVersion, SAVE_VERSION);
});

const MIGRATED_MILESTONE_AWARDS = {
  development_70: 1, development_180: 1, development_340: 2,
  era_expansion: 1, era_transcendence: 2, era_apotheosis: 2, awareness_50: 1,
  controlled_harvest_1: 2, controlled_harvest_2: 2,
  first_universe: 4, first_multiverse: 6,
};

// Awards above 1 must sit behind Apotheosis, a deep harvest or the prestige layers, or the
// existing unlock thresholds (directives at 3, axioms at 18-23) would move forward.
const ALLOWED_LARGE_AWARDS = new Set([
  ...Object.keys(MIGRATED_MILESTONE_AWARDS),
  'development_600', 'development_1000', 'endurance_900',
  'harvest_ascendant', 'harvest_singular',
  'paths_seen_10', 'endgames_in_run_4',
  'second_multiverse', 'axioms_all_level_1',
  'convergence_gate', 'first_convergence',
]);

test('the milestone catalog has 28 entries with unique ids', () => {
  assert.equal(MILESTONE_CATALOG.length, 28);
  assert.equal(new Set(MILESTONE_CATALOG.map(m => m.id)).size, 28);
  for (const milestone of MILESTONE_CATALOG) {
    assert.ok(milestone.target > 0, `${milestone.id} needs a positive target`);
    assert.ok(milestone.title.length > 0 && milestone.description.length > 0);
  }
});

test('migrated milestones keep their identifiers and award amounts', () => {
  for (const [id, insight] of Object.entries(MIGRATED_MILESTONE_AWARDS)) {
    const milestone = MILESTONE_CATALOG.find(m => m.id === id);
    assert.ok(milestone, `${id} is missing from the catalog`);
    assert.equal(milestone.insight, insight, `${id} award changed`);
  }
});

test('only late milestones award more than one Machine Insight', () => {
  for (const milestone of MILESTONE_CATALOG) {
    if (milestone.insight <= 1) continue;
    assert.ok(ALLOWED_LARGE_AWARDS.has(milestone.id), `${milestone.id} awards ${milestone.insight} too early`);
  }
});

test('harvest grades have a total order', () => {
  assert.deepEqual([...HARVEST_GRADE_ORDER], ['premature', 'established', 'transcendent', 'ascendant', 'singular']);
  assert.equal(gradeIndex(''), -1);
  assert.equal(gradeIndex('ascendant'), 3);
  assert.ok(gradeIndex('singular') > gradeIndex('ascendant'));
});

test('each milestone completes exactly once and pays its award once', () => {
  const state = createNewState();
  state.meta.progression.maxDevelopment = 2000;
  state.meta.progression.maxEra = 3;
  state.meta.progression.longestRunSeconds = 1200;
  state.meta.progression.maxEndgamesInRun = 4;
  state.meta.progression.controlledHarvestsTotal = 30;
  state.meta.progression.bestGrade = 'singular';
  state.meta.progression.objectivesCompleted = 9;
  state.meta.progression.seenDominantPaths = [
    'machine_faith', 'collective_mind', 'temporal_dominion', 'reality_engineering', 'biological_transcendence',
    'cosmic_resistance', 'bureaucratic_singularity', 'post_mortal_civilization', 'void_communion', 'recursive_simulation',
  ];
  state.meta.progression.discoveredResources = ['causal_mass', 'cognition', 'paradox', 'existence'];
  state.meta.universesTotal = 3;
  state.meta.multiversesConsumed = 2;
  state.meta.axiomLevels = {
    axiom_stability: 1, axiom_recursive_memory: 1, axiom_paradox_food: 1,
    axiom_compassionate_accounting: 1, axiom_impossible_birth: 1, axiom_multiple_choice: 1,
  };
  state.meta.convergences = 1;
  state.civilization = { ...GameEngine.createCivilizationForTest(3), development: 2000, era: 3, elapsedSeconds: 1200 };
  state.civilization.stats.awareness = 90;

  const first = evaluateMilestones(state, true);
  assert.equal(first.newlyCompleted.length, 28);
  const total = MILESTONE_CATALOG.reduce((sum, m) => sum + m.insight, 0);
  assert.equal(first.insightAwarded, total);
  assert.equal(completedMilestoneCount(state), 28);

  const second = evaluateMilestones(state, true);
  assert.equal(second.newlyCompleted.length, 0);
  assert.equal(second.insightAwarded, 0);
});

test('completedMilestoneCount ignores obsolete and false entries', () => {
  const state = createNewState();
  state.meta.progression.milestones = {
    development_70: true,
    era_expansion: false, // Valid ID, but false
    obsolete_milestone: true, // Obsolete ID
  };
  assert.equal(completedMilestoneCount(state), 1);
});

test('milestone progress reports current and target for open entries', () => {
  const state = createNewState();
  state.meta.progression.controlledHarvestsTotal = 4;
  const view = milestoneProgress(state, false).find(m => m.id === 'controlled_harvest_10');
  assert.equal(view.current, 4);
  assert.equal(view.target, 10);
  assert.equal(view.completed, false);
  assert.equal(view.group, 'HARVEST');
});

test('the snapshot takes the better of live and recorded values', () => {
  const state = createNewState();
  state.meta.progression.maxDevelopment = 500;
  state.civilization = { ...GameEngine.createCivilizationForTest(5), development: 120 };
  assert.equal(milestoneSnapshot(state, false).development, 500);
  state.civilization.development = 900;
  assert.equal(milestoneSnapshot(state, false).development, 900);
});

test('a controlled harvest records the statistics milestones read', () => {
  const engine = freshEngine();
  const civ = GameEngine.createCivilizationForTest(21);
  civ.development = 420; civ.era = 2; civ.eventChoices = 6; civ.elapsedSeconds = 310;
  civ.pathState.endgameStates = ['endgame_a', 'endgame_b'];
  engine.state.civilization = civ;
  engine.state.phase = 'civilization';
  engine.harvest(false);
  const p = engine.state.meta.progression;
  assert.equal(p.maxDevelopment >= 420, true);
  assert.equal(p.maxEra, 2);
  assert.equal(p.longestRunSeconds, 310);
  assert.equal(p.maxEndgamesInRun, 2);
  assert.equal(p.bestGrade, 'transcendent');
  assert.ok(p.bestDepth > 5);
  assert.equal(p.milestones.development_340, true);
  assert.equal(p.milestones.harvest_transcendent, true);
});

test('dominant paths are recorded once each across runs', () => {
  const engine = freshEngine();
  engine.recordDominantPath('machine_faith');
  engine.recordDominantPath('machine_faith');
  engine.recordDominantPath('void_communion');
  engine.recordDominantPath('');
  assert.deepEqual(engine.state.meta.progression.seenDominantPaths, ['machine_faith', 'void_communion']);
});

function convergenceInput(overrides = {}) {
  return {
    milestonesCompleted: 21,
    milestonesTotal: 28,
    multiverses: 2,
    axioms: [
      { id: 'axiom_stability', level: 1, maxLevel: 5 },
      { id: 'axiom_paradox_food', level: 1, maxLevel: 4 },
      { id: 'axiom_recursive_memory', level: 1, maxLevel: 5 },
      { id: 'axiom_impossible_birth', level: 1, maxLevel: 1 },
      { id: 'axiom_compassionate_accounting', level: 1, maxLevel: 4 },
      { id: 'axiom_multiple_choice', level: 1, maxLevel: 3 },
    ],
    bestGradeIndex: CONVERGENCE_ASCENDANT_INDEX,
    convergences: 0,
    ...overrides,
  };
}

test('the convergence gate opens only when all four requirements are met', () => {
  assert.equal(convergenceUnlocked(convergenceInput()), true);
  assert.equal(convergenceUnlocked(convergenceInput({ milestonesCompleted: 20 })), false);
  assert.equal(convergenceUnlocked(convergenceInput({ multiverses: 1 })), false);
  assert.equal(convergenceUnlocked(convergenceInput({ bestGradeIndex: 2 })), false);
  const shallowAxioms = convergenceInput().axioms.map((a, index) => (index === 0 ? { ...a, level: 0 } : a));
  assert.equal(convergenceUnlocked(convergenceInput({ axioms: shallowAxioms })), false);
});

test('requirements expose current and target for the UI', () => {
  const requirements = convergenceRequirements(convergenceInput({ milestonesCompleted: 19 }));
  assert.equal(requirements.length, 4);
  const milestones = requirements.find(r => r.id === 'milestones');
  assert.equal(milestones.current, 19);
  assert.equal(milestones.target, 21);
  assert.equal(milestones.met, false);
  assert.ok(milestones.label.length > 0);
});

test('convergence targets scale with each victory and clamp to the catalog', () => {
  assert.deepEqual(convergenceTargets(0), { milestones: 21, multiverses: 2, axiomLevel: 1, depth: 14 });
  assert.deepEqual(convergenceTargets(1), { milestones: 24, multiverses: 4, axiomLevel: 2, depth: 18 });
  assert.deepEqual(convergenceTargets(3), { milestones: 30, multiverses: 8, axiomLevel: 4, depth: 26 });
  const clamped = convergenceRequirements(convergenceInput({ convergences: 3, milestonesCompleted: 28 }));
  assert.equal(clamped.find(r => r.id === 'milestones').target, 28);
});

test('the axiom requirement clamps per upgrade at its own maximum level', () => {
  const axioms = convergenceInput().axioms.map(a => ({ ...a, level: 2 }));
  const requirements = convergenceRequirements(convergenceInput({ convergences: 1, axioms, multiverses: 4, milestonesCompleted: 24 }));
  assert.equal(requirements.find(r => r.id === 'axioms').met, true);
});

test('only a controlled harvest at target depth wins', () => {
  assert.equal(evaluateConvergence(14, false, 0), 'won');
  assert.equal(evaluateConvergence(13.9, false, 0), 'failed');
  assert.equal(evaluateConvergence(40, true, 0), 'failed');
  assert.equal(evaluateConvergence(14, false, 1), 'failed');
  assert.equal(evaluateConvergence(18, false, 1), 'won');
});

test('the terminal run starts in Apotheosis and convergence bonuses stack', () => {
  const setup = terminalCivilizationSetup();
  assert.equal(setup.era, 3);
  assert.equal(setup.years, ERA_YEAR_THRESHOLDS[3]);
  assert.equal(setup.development, 340);
  assert.equal(TERMINAL_ENTROPY_MULTIPLIER, 1.6);
  assert.deepEqual(convergenceBonuses(0), { allHarvestMult: 1, containment: 0 });
  assert.deepEqual(convergenceBonuses(2), { allHarvestMult: 1.5, containment: 4 });
});

test('the terminal entropy multiplier feeds the displayed rate', () => {
  const plain = entropyRate(14000, 0, false);
  assert.ok(Math.abs(entropyRate(14000, 0, true) - plain * 1.6) < 1e-9);
  assert.ok(secondsToCascade(14000, 0, 0, true) < secondsToCascade(14000, 0, 0, false));
});

function unlockedConvergenceEngine() {
  const engine = freshEngine();
  const p = engine.state.meta.progression;
  for (const milestone of MILESTONE_CATALOG.slice(0, 21)) p.milestones[milestone.id] = true;
  p.bestGrade = 'ascendant';
  p.unlockedSystems.push('universe_prestige', 'universe_upgrades', 'multiverse_prestige', 'axioms');
  engine.state.meta.multiversesConsumed = 2;
  engine.state.meta.axiomLevels = {
    axiom_stability: 1, axiom_paradox_food: 1, axiom_recursive_memory: 1,
    axiom_impossible_birth: 1, axiom_compassionate_accounting: 1, axiom_multiple_choice: 1,
  };
  return engine;
}

test('the convergence run can only start once the gate is open', () => {
  const blocked = freshEngine();
  assert.equal(blocked.convergenceUnlocked(), false);
  assert.equal(blocked.startConvergenceRun(4), false);
  assert.equal(blocked.state.phase, 'machine');

  const engine = unlockedConvergenceEngine();
  assert.equal(engine.convergenceUnlocked(), true);
  assert.equal(engine.startConvergenceRun(4), true);
  assert.equal(engine.state.phase, 'civilization');
  const civ = engine.state.civilization;
  assert.equal(civ.terminal, true);
  assert.equal(civ.era, 3);
  assert.equal(civ.years, ERA_YEAR_THRESHOLDS[3]);
  assert.equal(civ.development, 340);
});

test('the terminal run pays no credits and no resources', () => {
  const engine = unlockedConvergenceEngine();
  engine.startConvergenceRun(5);
  engine.state.civilization.development = 400;
  engine.state.machine.cultivationCreditsThisUniverse = 7;
  engine.state.machine.currencies.causal_mass = 250;
  const before = { ...engine.state.machine.currencies };
  engine.harvest(false);
  assert.deepEqual(engine.state.machine.currencies, before);
  assert.equal(engine.state.machine.cultivationCreditsThisUniverse, 7);
  assert.equal(engine.state.phase, 'machine');
  assert.equal(engine.state.meta.convergences, 0);
  assert.equal(engine.convergenceUnlocked(), true);
});

test('a deep controlled harvest in the terminal run wins and pays a stacking bonus', () => {
  const engine = unlockedConvergenceEngine();
  engine.startConvergenceRun(6);
  const civ = engine.state.civilization;
  civ.development = 1200;
  civ.eventChoices = 5;
  civ.pathState.dominantPath = 'machine_faith';
  civ.pathState.endgameStates = ['endgame_a', 'endgame_b'];
  const baseHarvestMult = engine.runtimeBonuses().allHarvestMult;
  engine.harvest(false);
  assert.equal(engine.state.phase, 'victory');
  assert.equal(engine.state.meta.convergences, 1);
  assert.equal(engine.state.meta.victories.length, 1);
  assert.equal(engine.lastVictory().dominantPath, 'machine_faith');
  assert.equal(engine.state.meta.progression.milestones.first_convergence, true);
  assert.ok(engine.runtimeBonuses().allHarvestMult > baseHarvestMult);
  assert.equal(engine.runtimeBonuses().containmentRating, 2);

  engine.acknowledgeVictory();
  assert.equal(engine.state.phase, 'machine');
  assert.equal(engine.convergenceTargetDepth(), 18);
});

test('a cascade in the terminal run fails without losing the unlock', () => {
  const engine = unlockedConvergenceEngine();
  engine.startConvergenceRun(7);
  const civ = engine.state.civilization;
  // Depth alone would win; only the cascade must decide the outcome, and it has to arrive through
  // the tick path rather than a hand-called harvest.
  civ.development = 1200;
  civ.eventChoices = 5;
  civ.stats.stability = 1;
  civ.tactical.entropy = 100;
  let guard = 0;
  while (engine.state.phase === 'civilization') {
    if (++guard > 4000) throw new Error('the cascade never resolved');
    engine.tick(0.25);
  }
  assert.equal(engine.state.phase, 'machine');
  assert.equal(engine.state.machine.lastHarvest.chaotic, true);
  assert.equal(engine.state.meta.convergences, 0);
  assert.equal(engine.convergenceUnlocked(), true);
});

test('reaching the gate completes the convergence_gate milestone', () => {
  const engine = unlockedConvergenceEngine();
  engine.refreshConvergenceMilestones();
  assert.equal(engine.state.meta.progression.milestones.convergence_gate, true);
});

test('a dominance change from a tactical action counts toward the path milestones', () => {
  const engine = freshEngine();
  const civ = GameEngine.createCivilizationForTest(53);
  engine.state.civilization = civ;
  engine.state.phase = 'civilization';
  civ.pathState.affinity.void_communion = 9;
  civ.stats.stability = 40; // Stabilize is refused at full Reality Stability.
  assert.equal(engine.useTacticalAction('stabilize'), true, engine.lastActionFailure);
  assert.deepEqual(engine.state.meta.progression.seenDominantPaths, ['void_communion']);
});

test('the convergence gate milestone is awarded before the terminal run starts', () => {
  const engine = unlockedConvergenceEngine();
  assert.notEqual(engine.state.meta.progression.milestones.convergence_gate, true);
  engine.startConvergenceRun(9);
  assert.equal(engine.state.meta.progression.milestones.convergence_gate, true);
});

test('a normal harvest that opens the gate awards it without waiting for a prestige', () => {
  const engine = unlockedConvergenceEngine();
  engine.state.meta.progression.bestGrade = '';
  assert.equal(engine.convergenceUnlocked(), false);
  const civ = GameEngine.createCivilizationForTest(61);
  civ.development = 800; civ.era = 2; civ.eventChoices = 5;
  engine.state.civilization = civ;
  engine.state.phase = 'civilization';
  engine.harvest(false);
  assert.equal(engine.state.meta.progression.bestGrade, 'ascendant');
  assert.equal(engine.convergenceUnlocked(), true);
  assert.equal(engine.state.meta.progression.milestones.convergence_gate, true);
});

test('installing the last Axiom opens the gate on the spot', () => {
  const engine = unlockedConvergenceEngine();
  engine.state.meta.progression.machineInsight = 40;
  delete engine.state.meta.axiomLevels.axiom_multiple_choice;
  assert.equal(engine.convergenceUnlocked(), false);
  engine.state.meta.axioms = 50;
  assert.equal(engine.purchaseUpgrade('axiom', 'axiom_multiple_choice'), true);
  assert.equal(engine.convergenceUnlocked(), true);
  assert.equal(engine.state.meta.progression.milestones.convergence_gate, true);
});

test('stability decay grows with era, attention and awareness', () => {
  const calm = GameEngine.createCivilizationForTest(31);
  const base = stabilityDecayPerSecond(calm);
  assert.ok(base > 0, 'a civilization always drifts');

  const later = GameEngine.createCivilizationForTest(31);
  later.era = 2;
  assert.ok(stabilityDecayPerSecond(later) > base, 'a later era decays faster');

  const watched = GameEngine.createCivilizationForTest(31);
  watched.stats.attention = 70;
  watched.stats.awareness = 90;
  assert.ok(stabilityDecayPerSecond(watched) > base, 'attention and awareness both accelerate the slip');
});

test('entropy adds its cascade on top of the ordinary decay', () => {
  const civ = GameEngine.createCivilizationForTest(32);
  const quiet = stabilityDecayPerSecond(civ);
  // At the cascade edge, where cascadeDecay actually contributes -- below 100 it is zero, so a
  // milder Entropy would make this comparison true without proving anything.
  civ.tactical.entropy = 100;
  const cascade = cascadeDecay(100, civ.stats.stabilityMax);
  assert.ok(cascade > 0, 'the cascade must cost something at the edge');
  assert.equal(
    Number(stabilityDecayPerSecond(civ).toFixed(10)),
    Number((quiet + cascade).toFixed(10)),
    'the cascade is added to the decay, not multiplied into it',
  );
});

test('flags and institutions bend the drift the way their copy claims', () => {
  const drift = civ => statDrift(civ, GameEngine.baseBonuses());

  const taxed = GameEngine.createCivilizationForTest(33);
  taxed.flags.push('impossible_tax');
  const resisting = GameEngine.createCivilizationForTest(33);
  resisting.flags.push('resistance');
  const plain = GameEngine.createCivilizationForTest(33);
  assert.ok(drift(taxed).stabilityDecay < drift(plain).stabilityDecay, 'an impossible tax is quieter than none');
  assert.ok(drift(resisting).stabilityDecay > drift(plain).stabilityDecay, 'open resistance costs stability');

  const cult = GameEngine.createCivilizationForTest(33);
  cult.era = 2; cult.flags.push('machine_cult');
  const uncultured = GameEngine.createCivilizationForTest(33);
  uncultured.era = 2;
  assert.ok(awarenessGainPerSecond(cult, GameEngine.baseBonuses()) > awarenessGainPerSecond(uncultured, GameEngine.baseBonuses()), 'a machine cult looks up sooner');

  const ministry = GameEngine.createCivilizationForTest(33);
  ministry.era = 2; ministry.institutions.push('Ministry Of Sanity');
  assert.ok(sanityLossPerSecond(ministry, GameEngine.baseBonuses()) < sanityLossPerSecond(uncultured, GameEngine.baseBonuses()), 'the Ministry slows the sanity loss');
});

test('the drift stands still in the first era except for stability', () => {
  // Awareness, attention and sanity are all scaled by the era, so an Emergence-era civilization only
  // loses stability. That is what makes the first minutes of a run readable.
  const civ = GameEngine.createCivilizationForTest(34);
  const drift = statDrift(civ, GameEngine.baseBonuses());
  assert.ok(drift.stabilityDecay > 0);
  assert.equal(drift.awarenessGain, 0);
  assert.equal(drift.attentionGain, 0);
  assert.equal(drift.sanityLoss, 0);
  assert.equal(attentionGainPerSecond(civ, GameEngine.baseBonuses()), 0);
});

test('the engine integrates exactly the rates stat-drift states', () => {
  const engine = freshEngine();
  engine.startCivilization(35);
  const civ = engine.state.civilization;
  // Set the era through the years, or the tick's own era check resets it under the test.
  civ.years = ERA_YEAR_THRESHOLDS[2] + 10; civ.era = 2; civ.pendingEvent = ''; civ.eventTimer = 1e9;
  const before = structuredClone(civ);
  // Below the tick's own 0.25 s clamp, so the frame integrates the full delta it was given.
  const dt = 0.2;
  engine.tick(dt);
  // The tick advances Entropy before it integrates the drift, and the cascade rides on Entropy, so
  // the rates the engine used are the ones the pre-tick stats produce at the post-tick Entropy.
  const seen = structuredClone(before);
  seen.tactical.entropy = civ.tactical.entropy;
  const rates = statDrift(seen, engine.runtimeBonuses());
  assert.ok(Math.abs((before.stats.stability - civ.stats.stability) - rates.stabilityDecay * dt) < 1e-9, 'stability');
  assert.ok(Math.abs((civ.stats.awareness - before.stats.awareness) - rates.awarenessGain * dt) < 1e-9, 'awareness');
  assert.ok(Math.abs((civ.stats.attention - before.stats.attention) - rates.attentionGain * dt) < 1e-9, 'attention');
  assert.ok(Math.abs((before.stats.sanity - civ.stats.sanity) - rates.sanityLoss * dt) < 1e-9, 'sanity');
});

test('Civilization Drama score preserves the v1.9.1 stage expression', () => {
  const civ = GameEngine.createCivilizationForTest(11001);
  civ.development = 123;
  civ.era = 2;
  civ.institutions.push('Consensus Office', 'Ministry Of Sanity');
  civ.eventChoices = 7;
  assert.equal(civilizationDramaScore(civ), 123 + 2 * 120 + 2 * 30 + 7 * 6);
});

test('Civilization Drama phase uses the exact legacy stage boundaries', () => {
  const civ = GameEngine.createCivilizationForTest(11002);
  const cases = [
    [69, 0, 'emergence'], [70, 1, 'expansion'],
    [179, 1, 'expansion'], [180, 2, 'division'],
    [339, 2, 'division'], [340, 3, 'transformation'],
    [559, 3, 'transformation'], [560, 4, 'crisis'],
  ];
  for (const [score, id, name] of cases) {
    civ.development = score;
    civ.era = 0;
    civ.institutions.length = 0;
    civ.eventChoices = 0;
    assert.equal(civilizationDramaPhase(civ).id, id);
    assert.equal(civilizationDramaPhase(civ).name, name);
    assert.equal(developmentStage(civ), id, `render stage drifted at score ${score}`);
  }
});

test('the signature catalog contains exactly the required 28 profiles', () => {
  const ids = CONSEQUENCE_PROFILES.map(profile => profile.eventId);
  const required = [
    'synod_of_the_second_engine','unanimous_afternoon','sovereign_hour','department_of_permitted_physics',
    'pollinators_of_the_state','blackout_doctrine','ministry_of_final_forms','immortal_electorate',
    'embassy_at_the_edge','recursion_registry','entropy_crisis_25','entropy_crisis_50','entropy_crisis_75',
    'moon_resigns','ministry_of_sanity','planetary_mind',
    'apotheosis_ledger_of_the_cultivator','apotheosis_the_yield_census','apotheosis_observatory_of_the_hand',
    'apotheosis_terms_of_cultivation','apotheosis_the_counteroffer','apotheosis_arbitration_of_scales',
    'apotheosis_currency_of_unhappened','apotheosis_debt_to_the_unborn','apotheosis_futures_market_in_ruins',
    'apotheosis_maintenance_window','apotheosis_the_replacement_part','apotheosis_recursive_audit',
  ];
  assert.equal(CONSEQUENCE_PROFILES.length, 28);
  assert.deepEqual([...new Set(ids)].sort(), [...required].sort());
});

test('consequence profiles can be retrieved by id or event and conditions', () => {
  // consequenceProfileById
  assert.equal(consequenceProfileById('institution:lunar_ministry')?.id, 'institution:lunar_ministry');
  assert.equal(consequenceProfileById('path:machine_faith')?.eventId, 'synod_of_the_second_engine');
  assert.equal(consequenceProfileById('invalid_id'), null);

  // consequenceProfileFor (with additions required)
  assert.equal(consequenceProfileFor('moon_resigns', [{ kind: 'institution', label: 'Lunar Ministry' }])?.id, 'institution:lunar_ministry');
  assert.equal(consequenceProfileFor('moon_resigns', []), null);
  assert.equal(consequenceProfileFor('moon_resigns', [{ kind: 'trait', label: 'Lunar Ministry' }]), null); // Wrong kind
  assert.equal(consequenceProfileFor('moon_resigns', [{ kind: 'institution', label: 'Wrong Label' }]), null); // Wrong label

  // consequenceProfileFor (without additions required)
  assert.equal(consequenceProfileFor('synod_of_the_second_engine', [])?.id, 'path:machine_faith');

  // consequenceProfileFor (non-existent)
  assert.equal(consequenceProfileFor('invalid_event_id', []), null);
});

test('generic consequence thresholds are deterministic, deduplicated, and ordered by precedence', () => {
  const before = {
    metrics: { stability: 80, stabilityMax: 100, awareness: 10, sanity: 80, attention: 10, years: 0, development: 100, eventTimer: 5, entropy: 20, controlCapacity: 3 },
    affinities: { machine_faith: 0 }, traits: [], institutions: [], flags: [], pathFlags: [],
    dramaPhaseId: 1, era: 0, dominantPath: '', endgameStates: [], entropyBand: 0,
  };
  const after = structuredClone(before);
  after.metrics.development = 120;
  after.metrics.stability = 70;
  after.metrics.awareness = 20;
  after.metrics.entropy = 25;
  after.affinities.machine_faith = 3;
  after.dramaPhaseId = 2;
  after.entropyBand = 1;
  const result = buildDecisionConsequence('neutral_event', before, after, []);
  assert.equal(result.significance, 'turning_point');
  assert.deepEqual(result.tags, ['urban_growth','technological_growth','civil_unrest','reality_damage','surveillance','path_shift']);
  assert.deepEqual(result.transitions.dramaPhase, { from: 1, to: 2 });
  assert.deepEqual(result.transitions.entropyBand, { from: 0, to: 1 });
});

test('major and turning-point significance rules cover raw deltas and structural transitions', () => {
  const base = {
    metrics: { stability: 80, stabilityMax: 100, awareness: 10, sanity: 80, attention: 10, years: 0, development: 100, eventTimer: 5, entropy: 20, controlCapacity: 3 },
    affinities: { machine_faith: 0 }, traits: [], institutions: [], flags: [], pathFlags: [],
    dramaPhaseId: 1, era: 0, dominantPath: '', endgameStates: [], entropyBand: 0,
  };
  const major = structuredClone(base); major.metrics.stability = 72;
  assert.equal(buildDecisionConsequence('neutral_event', base, major, []).significance, 'major');
  const dominance = structuredClone(base); dominance.dominantPath = 'machine_faith';
  assert.equal(buildDecisionConsequence('neutral_event', base, dominance, []).significance, 'turning_point');
  const endgame = structuredClone(base); endgame.endgameStates = ['endgame_machine_faith'];
  assert.equal(buildDecisionConsequence('neutral_event', base, endgame, []).significance, 'turning_point');
  for (const id of ['entropy_crisis_25','entropy_crisis_50','entropy_crisis_75']) {
    assert.equal(buildDecisionConsequence(id, base, base, []).significance, 'turning_point');
  }
});

function feedbackForMemory({ sequence = 1, eventId = 'neutral', significance = 'major', tags = ['urban_growth'], signatureProfile = '' } = {}) {
  return {
    sequence, eventId, eventTitle: eventId, choiceLabel: 'Resolve', tone: 'mixed', metrics: [], affinities: [], additions: [],
    consequence: { significance, tags, transitions: {}, signatureProfile },
  };
}

test('old or malformed visual memory sanitizes without touching the civilization', () => {
  assert.deepEqual(sanitizeWorldMemory(undefined), emptyWorldMemory());
  const malformed = { version: 99, sequence: -4, marks: 'bad', scars: [{ domain: 'reality', motif: '', strength: 99 }] };
  assert.deepEqual(sanitizeWorldMemory(malformed), emptyWorldMemory());
  const civ = GameEngine.createCivilizationForTest(12001);
  civ.stats.stability = 73;
  const before = structuredClone(civ);
  civ.visualMemory = sanitizeWorldMemory({ version: 1, sequence: 3, marks: [{ domain:'social',motif:'unrest',strength:2,sourceEventId:'x',createdAtSequence:2,anchor01:1.7,repairable:true }], scars: [] });
  assert.equal(civ.stats.stability, before.stats.stability);
  assert.equal(civ.visualMemory.marks[0].anchor01, 1);
});

test('world memory coalesces six mark domains and three scar domains deterministically', () => {
  const seed = 12002;
  let memory = emptyWorldMemory();
  const cases = [
    ['urban_growth','built_environment'], ['religious_shift','identity'], ['surveillance','control'],
    ['civil_unrest','social'], ['ecological_damage','ecology'], ['reality_damage','reality'],
  ];
  for (const [tag, domain] of cases) {
    memory = applyWorldMemory(seed, memory, feedbackForMemory({ eventId:`event:${tag}`, tags:[tag] }));
    assert.ok(memory.marks.some(mark => mark.domain === domain));
  }
  assert.equal(memory.marks.length, 6);
  const anchor = memory.marks.find(mark => mark.domain === 'built_environment').anchor01;
  memory = applyWorldMemory(seed, memory, feedbackForMemory({ eventId:'event:growth-2', tags:['technological_growth'] }));
  assert.equal(memory.marks.length, 6);
  assert.equal(memory.marks.find(mark => mark.domain === 'built_environment').anchor01, anchor, 'same-domain transformations preserve their anchor');

  for (const [eventId, profile] of [
    ['entropy_crisis_25','crisis:entropy_25'],
    ['apotheosis_debt_to_the_unborn','apotheosis:debt'],
    ['apotheosis_the_replacement_part','apotheosis:replacement'],
  ]) memory = applyWorldMemory(seed, memory, feedbackForMemory({ eventId, significance:'turning_point', tags:['reality_damage'], signatureProfile:profile }));
  assert.equal(memory.scars.length, 3);
  assert.equal(new Set(memory.scars.map(scar => scar.domain)).size, 3);
});

test('same-domain scars evolve and Stabilize repairs at most one non-scar mark', () => {
  const seed = 12003;
  let memory = emptyWorldMemory();
  memory = applyWorldMemory(seed, memory, feedbackForMemory({ eventId:'entropy_crisis_25', significance:'turning_point', tags:['reality_damage'], signatureProfile:'crisis:entropy_25' }));
  const firstScar = structuredClone(memory.scars[0]);
  memory = applyWorldMemory(seed, memory, feedbackForMemory({ eventId:'entropy_crisis_50', significance:'turning_point', tags:['reality_damage'], signatureProfile:'crisis:entropy_50' }));
  assert.equal(memory.scars.length, 1);
  assert.equal(memory.scars[0].domain, 'reality');
  assert.equal(memory.scars[0].anchor01, firstScar.anchor01);
  assert.equal(memory.scars[0].evolution, firstScar.evolution + 1);

  memory = applyWorldMemory(seed, memory, feedbackForMemory({ eventId:'damage', tags:['civil_unrest'] }));
  const beforeMarks = memory.marks.length;
  const scarsBefore = structuredClone(memory.scars);
  memory = applyWorldMemory(seed, memory, feedbackForMemory({ eventId:'tactical:stabilize', tags:['stabilization','containment'] }), { repair: true });
  assert.ok(memory.marks.length >= beforeMarks - 1 && memory.marks.length <= beforeMarks);
  assert.deepEqual(memory.scars, scarsBefore, 'Stabilize must never erase or weaken scars');
});

test('visual memory cannot change harvest, depth, or progression calculations', () => {
  const civ = GameEngine.createCivilizationForTest(12004);
  civ.development = 420; civ.era = 2; civ.eventChoices = 8; civ.stats.stability = 64; civ.tactical.entropy = 43;
  const beforeHarvest = calculateHarvest(civ, false, GameEngine.baseBonuses());
  const beforeDepth = cultivationDepth(civ);
  civ.visualMemory = {
    version:1, sequence:99,
    marks:[{domain:'reality',motif:'fracture',strength:3,sourceEventId:'x',createdAtSequence:1,anchor01:.5,repairable:true}],
    scars:[{domain:'reality',motif:'breach',strength:3,sourceEventId:'y',createdAtSequence:2,anchor01:.7,evolution:4}],
  };
  assert.deepEqual(calculateHarvest(civ, false, GameEngine.baseBonuses()), beforeHarvest);
  assert.equal(cultivationDepth(civ), beforeDepth);
});

test('completed decisions advance visual-memory sequence while pressure-only feedback does not', () => {
  const engine = freshEngine();
  engine.startCivilization(13001);
  const civ = engine.state.civilization;
  assert.equal(civ.visualMemory, undefined);
  engine.forceEvent('synthetic_saint');
  engine.chooseEvent(0);
  assert.equal(civ.visualMemory.sequence, 1);
  const sequenceAfterChoice = civ.visualMemory.sequence;
  civ.tactical.entropy = 24.9;
  engine.tick(1);
  // Prove the threshold actually fired before reading anything into the sequence standing still: a
  // tick that queued no crisis would leave the sequence untouched for the wrong reason and the
  // assertion below would pass while testing nothing.
  assert.equal(engine.worldImpulse?.eventId, 'entropy_crisis_25', 'the tick did not publish pressure feedback');
  assert.ok(civ.scheduledEvents.includes('entropy_crisis_25'), 'the threshold did not queue its crisis');
  assert.equal(civ.visualMemory.sequence, sequenceAfterChoice, 'pressure threshold feedback is not a completed player decision');
});

test('reserve and tactical actions use the same visual-memory reducer, and Stabilize repairs one mark', () => {
  const engine = freshEngine();
  engine.startCivilization(13002);
  const civ = engine.state.civilization;
  civ.visualMemory = {
    version:1, sequence:4,
    marks:[{domain:'social',motif:'unrest',strength:2,sourceEventId:'damage',createdAtSequence:3,anchor01:.4,repairable:true}],
    scars:[{domain:'reality',motif:'breach',strength:2,sourceEventId:'crisis',createdAtSequence:2,anchor01:.6,evolution:1}],
  };
  civ.stats.stability = 60; civ.stats.attention = 30; civ.tactical.entropy = 30; civ.tactical.controlCapacity = 3;
  const scars = structuredClone(civ.visualMemory.scars);
  assert.equal(engine.useTacticalAction('stabilize'), true);
  assert.equal(civ.visualMemory.sequence, 5);
  assert.equal(civ.visualMemory.marks[0].strength, 1);
  assert.deepEqual(civ.visualMemory.scars, scars);
});

test('an old v4 save without visualMemory remains loadable and gains memory only after the next decision', () => {
  const seedEngine = freshEngine(); seedEngine.startCivilization(13003);
  const oldState = structuredClone(seedEngine.state); delete oldState.civilization.visualMemory;
  const storage = { value: JSON.stringify(oldState), getItem(){ return this.value; }, setItem(_k,v){ this.value=v; }, removeItem(){ this.value=''; } };
  const engine = new GameEngine({ storage, autosave: true });
  assert.equal(engine.state.civilization.visualMemory, undefined);
  engine.forceEvent('synthetic_saint'); engine.chooseEvent(0);
  assert.equal(engine.state.civilization.visualMemory.version, 1);
  assert.equal(engine.state.saveVersion, oldState.saveVersion);
});

test('objectiveForDirective and evaluateDirectiveObjective resolve correctly', () => {
  const engine = freshEngine();
  engine.state.meta.progression.unlockedSystems.push('directives');
  engine.startCivilization(1);
  const civ = engine.state.civilization;

  // Unknown directive id
  assert.equal(objectiveForDirective('unknown_directive_id'), null);
  civ.directiveId = 'unknown_directive_id';
  assert.equal(evaluateDirectiveObjective(civ), false);

  // accelerated_development
  const accelDev = objectiveForDirective('accelerated_development');
  assert.ok(accelDev);
  assert.equal(accelDev.id, 'objective_accelerated_development');

  civ.directiveId = 'accelerated_development';
  civ.era = 2;
  civ.development = 399;
  assert.equal(evaluateDirectiveObjective(civ), false);
  civ.development = 400;
  assert.equal(evaluateDirectiveObjective(civ), true);
  // The era half of the objective is the half the Directive cannot buy for the player.
  civ.era = 1;
  assert.equal(evaluateDirectiveObjective(civ), false);
  civ.era = 2;

  // cognitive_extraction
  assert.ok(objectiveForDirective('cognitive_extraction'));
  civ.directiveId = 'cognitive_extraction';
  civ.stats.awareness = 44;
  civ.stats.sanity = 45;
  assert.equal(evaluateDirectiveObjective(civ), false);
  civ.stats.awareness = 45;
  civ.stats.sanity = 44;
  assert.equal(evaluateDirectiveObjective(civ), false);
  civ.stats.awareness = 45;
  civ.stats.sanity = 45;
  assert.equal(evaluateDirectiveObjective(civ), true);

  // stable_cultivation
  assert.ok(objectiveForDirective('stable_cultivation'));
  civ.directiveId = 'stable_cultivation';
  civ.stats.stability = 79;
  civ.tactical.entropy = 69;
  assert.equal(evaluateDirectiveObjective(civ), false);
  civ.stats.stability = 80;
  civ.tactical.entropy = 70;
  assert.equal(evaluateDirectiveObjective(civ), false);
  civ.stats.stability = 80;
  civ.tactical.entropy = 69;
  assert.equal(evaluateDirectiveObjective(civ), true);

  // paradox_prospecting
  assert.ok(objectiveForDirective('paradox_prospecting'));
  civ.directiveId = 'paradox_prospecting';
  civ.tactical.entropy = 49;
  civ.stats.stability = 1;
  assert.equal(evaluateDirectiveObjective(civ), false);
  civ.tactical.entropy = 50;
  civ.stats.stability = 0;
  assert.equal(evaluateDirectiveObjective(civ), false);
  civ.tactical.entropy = 50;
  civ.stats.stability = 1;
  assert.equal(evaluateDirectiveObjective(civ), true);

  // quiet_machine
  assert.ok(objectiveForDirective('quiet_machine'));
  civ.directiveId = 'quiet_machine';
  civ.era = 1;
  civ.stats.awareness = 44;
  civ.stats.attention = 44;
  assert.equal(evaluateDirectiveObjective(civ), false);
  civ.era = 2;
  civ.stats.awareness = 45;
  civ.stats.attention = 44;
  assert.equal(evaluateDirectiveObjective(civ), false);
  civ.era = 2;
  civ.stats.awareness = 44;
  civ.stats.attention = 45;
  assert.equal(evaluateDirectiveObjective(civ), false);
  civ.era = 2;
  civ.stats.awareness = 44;
  civ.stats.attention = 44;
  assert.equal(evaluateDirectiveObjective(civ), true);

  // temporal_pressure
  assert.ok(objectiveForDirective('temporal_pressure'));
  civ.directiveId = 'temporal_pressure';
  civ.era = 1;
  civ.elapsedSeconds = 300;
  civ.eventChoices = 8;
  assert.equal(evaluateDirectiveObjective(civ), false);
  civ.era = 2;
  civ.elapsedSeconds = 301;
  civ.eventChoices = 8;
  assert.equal(evaluateDirectiveObjective(civ), false);
  civ.era = 2;
  civ.elapsedSeconds = 300;
  civ.eventChoices = 7;
  assert.equal(evaluateDirectiveObjective(civ), false);
  civ.era = 2;
  civ.elapsedSeconds = 300;
  civ.eventChoices = 8;
  assert.equal(evaluateDirectiveObjective(civ), true);
});

test('clampStats enforces boundaries on civilization stats', () => {
  const engine = freshEngine();
  engine.startCivilization(42);
  const civ = engine.state.civilization;
  civ.stats.stabilityMax = 100;

  // Below bounds
  civ.stats.stability = -10;
  civ.stats.awareness = -20;
  civ.stats.sanity = -30;
  civ.stats.attention = -40;
  clampStats(civ);
  assert.equal(civ.stats.stability, 0);
  assert.equal(civ.stats.awareness, 0);
  assert.equal(civ.stats.sanity, 0);
  assert.equal(civ.stats.attention, 0);

  // Above bounds
  civ.stats.stability = 150;
  civ.stats.awareness = 150;
  civ.stats.sanity = 150;
  civ.stats.attention = 150;
  clampStats(civ);
  assert.equal(civ.stats.stability, 100);
  assert.equal(civ.stats.awareness, 100);
  assert.equal(civ.stats.sanity, 100);
  assert.equal(civ.stats.attention, 100);

  // Within bounds
  civ.stats.stability = 50;
  civ.stats.awareness = 50;
  civ.stats.sanity = 50;
  civ.stats.attention = 50;
  clampStats(civ);
  assert.equal(civ.stats.stability, 50);
  assert.equal(civ.stats.awareness, 50);
  assert.equal(civ.stats.sanity, 50);
  assert.equal(civ.stats.attention, 50);

  // stabilityMax dynamically changes the cap
  civ.stats.stabilityMax = 120;
  civ.stats.stability = 130;
  clampStats(civ);
  assert.equal(civ.stats.stability, 120);
});
