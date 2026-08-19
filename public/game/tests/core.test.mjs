import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewState, calculateHarvest, upgradeCost, eraForYears, ERA_YEAR_THRESHOLDS } from '../dist/game/rules.js';
import { CivilizationPaths } from '../dist/game/paths.js';
import { Progression, progressionRulesForLayer } from '../dist/game/progression.js';
import { GameEngine, ERA_NAMES } from '../dist/game/engine.js';
import { CONTENT } from '../dist/data/content.generated.js';
import { applyInterventionCopy, INTERVENTION_COPY } from '../dist/data/intervention-copy.js';
import { ENTROPY_CRISES } from '../dist/data/entropy-crises.js';
import {
  buildInterventionPool,
  chooseWeightedIntervention,
  eventDelayWindow,
  recordRecentIntervention,
} from '../dist/game/intervention-scheduler.js';
import { buildDecisionFeedback, captureDecisionSnapshot } from '../dist/game/decision-feedback.js';
import { advancePressure, cascadeDecay, entropyRate, pressureMultiplier, secondsToCascade } from '../dist/game/pressure.js';
import { calculateCultivationCredits, evaluateHarvestQuality } from '../dist/game/harvest-quality.js';
import { buildDirectiveOffers } from '../dist/game/run-directives.js';
import { balancedAxiomUpgrades, balancedMachineUpgrades, balancedUniverseUpgrades } from '../dist/game/upgrade-balance.js';
import { TACTICAL_ACTIONS } from '../dist/game/tactical-actions.js';

function freshEngine() {
  return new GameEngine({
    autosave: false,
    storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  });
}

function safestChoiceIndex(event) {
  let best = 0;
  let bestScore = -Infinity;
  for (let index = 0; index < event.choices.length; index++) {
    const effects = event.choices[index].effects ?? {};
    const score = Number(effects.stability ?? 0) * 3
      + Number(effects.sanity ?? 0) * 2
      - Number(effects.awareness ?? 0) * 1.25
      - Number(effects.attention ?? 0) * 1.5
      - Number(effects.entropy ?? 0) * 2
      + Number(effects.development ?? 0) * 0.04;
    if (score > bestScore) { best = index; bestScore = score; }
  }
  return best;
}

function simulatedSurvival(seed, containmentBuild = false) {
  const engine = freshEngine();
  if (containmentBuild) {
    engine.state.machine.upgradeLevels = {
      reality_lattice: 1,
      awareness_scrubber: 1,
      sanity_protocol: 1,
      cosmic_muffling: 1,
    };
  }
  engine.startCivilization(seed);
  let elapsed = 0;
  while (engine.state.phase === 'civilization' && elapsed < 600) {
    const event = engine.currentEvent();
    if (event) {
      engine.chooseEvent(safestChoiceIndex(event));
      continue;
    }
    engine.tick(0.25);
    elapsed += 0.25;
  }
  return elapsed;
}

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
    if (!collapse && civ.era >= 1 && civ.eventChoices >= 3) break;
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
  });

  assert.deepEqual(pool.map(item => item.event.id), ['event_g']);
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
  for (const event of CONTENT.events) {
    if (!['routine_compliance_audit', 'dreams_of_gears'].includes(event.id)) {
      civ.eventCounts[event.id] = Number(event.max_count ?? 2);
    }
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
  assert.deepEqual(feedback.additions, [{ kind: 'path_flag', label: 'machine faith devout' }]);
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

test('new saves initialize the tactical v3 civilization contract', () => {
  const state = createNewState();
  assert.equal(state.saveVersion, 3);
  assert.equal(state.machine.cultivationCreditsThisUniverse, 0);
  assert.deepEqual(state.machine.runBuild.directiveOfferIds, []);
  assert.equal(state.machine.runBuild.nextCivilizationSeed, 0);

  const civ = GameEngine.createCivilizationForTest(41);
  assert.deepEqual(civ.tactical, {
    entropy: 0,
    controlCapacity: 3,
    triggeredCrises: [],
    probedEventId: '',
    actionUsage: { stabilize: 0, accelerate: 0, probe: 0 },
  });
  assert.equal(civ.directiveId, '');
});

test('v3 intentionally ignores the legacy v1 save key', () => {
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
  assert.equal(engine.state.saveVersion, 3);
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

test('deterministic pressure keeps unupgraded runs short and rewards Containment builds', () => {
  const seeds = Array.from({ length: 60 }, (_, index) => 10_000 + index * 97);
  const noUpgrade = seeds.map(seed => simulatedSurvival(seed, false));
  const containment = seeds.map(seed => simulatedSurvival(seed, true));
  const noUpgradeMedian = percentile(noUpgrade, 0.5);
  const noUpgradeP95 = percentile(noUpgrade, 0.95);
  const containmentMedian = percentile(containment, 0.5);
  assert.ok(noUpgradeMedian >= 150 && noUpgradeMedian <= 240, `no-upgrade median ${noUpgradeMedian}s`);
  assert.ok(noUpgradeP95 < 300, `no-upgrade p95 ${noUpgradeP95}s`);
  assert.ok(containmentMedian >= 300 && containmentMedian <= 480, `Containment median ${containmentMedian}s`);
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

test('qualified grades award two, three, or four Cultivation Credits', () => {
  const civ = GameEngine.createCivilizationForTest(82);
  civ.eventChoices = 4;
  civ.era = 1;
  assert.deepEqual(evaluateHarvestQuality(civ, false), { grade: 'established', multiplier: .75, credits: 2 });
  civ.era = 2;
  assert.equal(evaluateHarvestQuality(civ, false).credits, 3);
  civ.pathState.endgameState = 'endgame_machine_faith';
  assert.equal(evaluateHarvestQuality(civ, false).credits, 4);
});

test('chaotic harvests lose exactly one qualified Cultivation Credit', () => {
  const qualities = [
    { grade: 'premature', multiplier: 0.2, credits: 0 },
    { grade: 'established', multiplier: 0.75, credits: 2 },
    { grade: 'transcendent', multiplier: 1, credits: 3 },
    { grade: 'ascendant', multiplier: 1.2, credits: 4 },
  ];

  assert.deepEqual(qualities.map(quality => [
    calculateCultivationCredits(quality, false, false),
    calculateCultivationCredits(quality, true, false),
  ]), [[0, 0], [2, 1], [3, 2], [4, 3]]);

  assert.deepEqual(qualities.map(quality => [
    calculateCultivationCredits(quality, false, true),
    calculateCultivationCredits(quality, true, true),
  ]), [[0, 0], [3, 2], [4, 3], [5, 4]]);
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
  civ.stats.stability = 90;
  civ.tactical.entropy = 40;
  const preview = engine.previewHarvestDetails(false);
  assert.equal(preview.objectiveCompleted, true);
  assert.equal(preview.credits, 3);
  assert.equal(preview.rewardMultiplier, 0.75 * 1.15);
  engine.harvest(false);
  assert.equal(engine.state.machine.lastHarvest.objective_completed, true);
  assert.equal(engine.state.machine.cultivationCreditsThisUniverse, 3);
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
  civ.stats.stability = 90;
  civ.tactical.entropy = 40;

  assert.equal(engine.previewHarvestDetails(false).credits, 3);
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
    reality_lattice: [60, 1.55],
    prediction_core: [90, 1.60],
    cultivation_accelerator: [120, 1.68],
    historical_compressor: [120, 1.68],
    cognitive_extractor: [120, 1.68],
    paradox_sieve: [110, 1.68],
    existence_furnace: [130, 1.70],
    awareness_scrubber: [150, 1.68],
    sanity_protocol: [165, 1.70],
    cosmic_muffling: [150, 1.70],
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
  assert.ok(runs.every(run => run.harvest.grade === 'established'));
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
  assert.equal(bonuses.accelerateYears, 450);
  assert.equal(bonuses.accelerateTimer, 16);
  assert.equal(bonuses.eventDelay, 0);
  assert.equal(bonuses.containmentRating, 2);
  assert.equal(bonuses.controlRecharge, 3);
});

test('a normal first run can afford at least one available machine upgrade', () => {
  const engine = freshEngine();
  engine.startCivilization(20260819);
  while (engine.state.phase === 'civilization') {
    const civ = engine.state.civilization;
    if (civ.era >= 1 && civ.eventChoices >= 3) break;
    const event = engine.currentEvent();
    if (event) engine.chooseEvent(safestChoiceIndex(event));
    else engine.tick(0.25);
  }
  engine.harvest(false);
  assert.ok(engine.visibleUpgradeEntries('machine').some(entry => entry.status === 'available' && engine.canPurchaseUpgrade('machine', entry.definition.id)));
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

test('Reality Lattice is reachable from the first cascade harvest', () => {
  const engine = freshEngine();
  const lattice = engine.upgradeById('machine', 'reality_lattice');
  assert.equal(lattice.base_cost, 60);
  assert.equal(lattice.growth, 1.55);
  assert.deepEqual(
    [0, 1, 2, 3].map(level => upgradeCost(lattice.base_cost, lattice.growth, level)),
    [60, 93, 144, 223],
  );
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
