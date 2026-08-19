import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../dist/game/engine.js';
import { buildViewModel, civilizationRenderKey } from '../dist/ui/view-model.js';
import { developmentStage, worldWidthMultiplier, worldSnapshot } from '../dist/render/world-model.js';
import { decisionImpulseKind, entropyThresholdColor, structuralWorldKey, worldPresentation } from '../dist/render/world-presentation.js';
import { PATH_IDS } from '../dist/game/paths.js';
import { hash01, mixColor, PATH_ACCENTS, DEFAULT_ACCENT, pathAccentFor, FACTION_SIGILS } from '../dist/render/primitives.js';

test('world expands from sparse camps to an arcology world', () => {
  const civ = GameEngine.createCivilizationForTest(11);
  assert.equal(developmentStage(civ), 0);
  assert.equal(worldWidthMultiplier(civ), 1.5);
  civ.development = 600;
  civ.era = 2;
  civ.institutions.push('Consensus Lattice', 'Reality Works Authority');
  civ.eventChoices = 15;
  assert.equal(developmentStage(civ), 4);
  assert.equal(worldWidthMultiplier(civ), 4.0);
  const snap = worldSnapshot(civ, 800);
  assert.ok(snap.worldWidth >= 3200);
  assert.ok(snap.buildingCount >= 34);
  assert.ok(snap.particleCount > 0);
  assert.ok(snap.hazeBands >= 2);
});

test('presentation palette reacts to every strategic world state', () => {
  const civ = GameEngine.createCivilizationForTest(11);
  const stable = worldPresentation(civ);
  civ.stats.stability = 20;
  const unstable = worldPresentation(civ);
  civ.stats.sanity = 25;
  const strained = worldPresentation(civ);
  civ.stats.awareness = 80;
  const aware = worldPresentation(civ);
  civ.stats.attention = 85;
  const observed = worldPresentation(civ);
  civ.pathState.dominantPath = 'void_communion';
  const aligned = worldPresentation(civ);

  assert.ok(unstable.danger > stable.danger);
  assert.ok(strained.sanityDistortion > unstable.sanityDistortion);
  assert.ok(aware.awareness > strained.awareness);
  assert.ok(observed.attention > aware.attention);
  assert.notEqual(aligned.accent, observed.accent);
});

test('structural world key ignores tiny ticks but changes for meaningful state bands', () => {
  const civ = GameEngine.createCivilizationForTest(12);
  const original = structuralWorldKey(civ, 800);
  civ.development += 0.1;
  assert.equal(structuralWorldKey(civ, 800), original);
  civ.era = 1;
  const eraKey = structuralWorldKey(civ, 800);
  assert.notEqual(eraKey, original);
  civ.pathState.dominantPath = 'machine_faith';
  const pathKey = structuralWorldKey(civ, 800);
  assert.notEqual(pathKey, eraKey);
  civ.stats.attention = 80;
  assert.notEqual(structuralWorldKey(civ, 800), pathKey);
});

test('view model hides unknown resources and exposes event choices', () => {
  const storage = new Map();
  const engine = new GameEngine({ storage: { getItem:k=>storage.get(k)??null, setItem:(k,v)=>storage.set(k,v), removeItem:k=>storage.delete(k) } });
  let vm = buildViewModel(engine);
  assert.deepEqual(vm.resources.map(x=>x.id), ['causal_mass']);
  engine.startCivilization(99);
  engine.forceEvent('routine_compliance_audit');
  vm = buildViewModel(engine);
  assert.equal(vm.phase, 'civilization');
  assert.equal(vm.event?.choices.length, 2);
  assert.ok(vm.civilization?.traits.length >= 2);
});

test('Prediction Core controls whether intervention consequences are revealed', () => {
  const engine = new GameEngine({
    autosave: false,
    storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  });
  engine.startCivilization(73);
  engine.forceEvent('synthetic_saint');
  let vm = buildViewModel(engine);
  assert.equal(vm.event?.predictionLocked, true);
  assert.ok(vm.event?.choices.every(choice => choice.prediction === ''));

  engine.state.civilization.predictionLevel = 1;
  vm = buildViewModel(engine);
  assert.equal(vm.event?.predictionLocked, false);
  assert.ok(vm.event?.choices.every(choice => choice.prediction.length > 20));
});

test('Probe precision advances from directions through ranges to exact resolved vectors', () => {
  const engine = new GameEngine({
    autosave: false,
    storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  });
  engine.startCivilization(731);
  engine.forceEvent('synthetic_saint');
  engine.useTacticalAction('probe');

  engine.state.civilization.predictionLevel = 0;
  let prediction = buildViewModel(engine).event?.choices[0].prediction ?? '';
  assert.match(prediction, /Awareness ↑/);
  assert.doesNotMatch(prediction, /Awareness \+6/);

  engine.state.civilization.predictionLevel = 2;
  prediction = buildViewModel(engine).event?.choices[0].prediction ?? '';
  assert.match(prediction, /Awareness range/);

  engine.state.civilization.predictionLevel = 5;
  prediction = buildViewModel(engine).event?.choices[0].prediction ?? '';
  assert.match(prediction, /Awareness \+6/);
});

test('Probe vectors include secondary-path effects instead of raw choice data', () => {
  const engine = new GameEngine({
    autosave: false,
    storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  });
  engine.startCivilization(732);
  engine.state.civilization.pathState.affinity.bureaucratic_singularity = 4;
  engine.state.civilization.predictionLevel = 5;
  engine.forceEvent('impossible_district');
  engine.useTacticalAction('probe');
  const prediction = buildViewModel(engine).event?.choices[0].prediction ?? '';
  assert.match(prediction, /Stability -1/);
  assert.doesNotMatch(prediction, /Stability -6/);
});

test('civilization render key ignores live tick values but changes for an intervention', () => {
  const storage = new Map();
  const engine = new GameEngine({ storage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key)
  }});
  engine.startCivilization(31415);
  const before = civilizationRenderKey(buildViewModel(engine));

  engine.tick(0.25);
  const afterTick = civilizationRenderKey(buildViewModel(engine));
  assert.equal(afterTick, before);

  engine.forceEvent('routine_compliance_audit');
  const duringEvent = civilizationRenderKey(buildViewModel(engine));
  assert.notEqual(duringEvent, before);
});

test('view model exposes decision feedback and changes the structural key once', () => {
  const engine = new GameEngine({
    autosave: false,
    storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  });
  engine.startCivilization(2026);
  engine.forceEvent('synthetic_saint');
  const eventKey = civilizationRenderKey(buildViewModel(engine));
  engine.chooseEvent(0);
  const vm = buildViewModel(engine);

  assert.equal(vm.feedback?.eventId, 'synthetic_saint');
  assert.equal(vm.feedback?.choiceLabel, 'Recognize the miracle');
  assert.notEqual(civilizationRenderKey(vm), eventKey);
});

test('Entropy changes presentation in stable structural bands', () => {
  const civ = GameEngine.createCivilizationForTest(101);
  const stable = worldPresentation(civ);
  const stableKey = structuralWorldKey(civ, 800);
  civ.tactical.entropy = 24.9;
  assert.equal(structuralWorldKey(civ, 800), stableKey);
  civ.tactical.entropy = 76;
  const critical = worldPresentation(civ);
  assert.notEqual(stable.bands.entropy, critical.bands.entropy);
  assert.ok(critical.entropy > stable.entropy);
  assert.notEqual(structuralWorldKey(civ, 800), stableKey);
});

test('tactical decisions and crises select distinct world impulse kinds', () => {
  assert.equal(decisionImpulseKind('tactical:stabilize'), 'containment');
  assert.equal(decisionImpulseKind('tactical:accelerate'), 'time-streak');
  assert.equal(decisionImpulseKind('tactical:probe'), 'scan');
  assert.equal(decisionImpulseKind('entropy_crisis_50'), 'fracture');
  assert.equal(decisionImpulseKind('synthetic_saint'), 'decision');
  assert.notEqual(entropyThresholdColor('entropy_crisis_25'), entropyThresholdColor('entropy_crisis_50'));
  assert.notEqual(entropyThresholdColor('entropy_crisis_50'), entropyThresholdColor('entropy_crisis_75'));
});

test('render primitives are deterministic and cover every path', () => {
  assert.equal(hash01(42), hash01(42));
  assert.ok(hash01(42) >= 0 && hash01(42) < 1);
  assert.notEqual(hash01(42), hash01(43));
  assert.equal(mixColor(0x000000, 0xffffff, 0), 0x000000);
  assert.equal(mixColor(0x000000, 0xffffff, 1), 0xffffff);
  assert.equal(mixColor(0x000000, 0xffffff, .5), 0x808080);
  assert.equal(mixColor(0x000000, 0xffffff, 5), 0xffffff, 'amount is clamped');
  assert.equal(pathAccentFor('machine_faith'), 0xf0ca6f);
  assert.equal(pathAccentFor(''), DEFAULT_ACCENT);
  assert.equal(pathAccentFor('not_a_path'), DEFAULT_ACCENT);
  for (const id of PATH_IDS) {
    assert.ok(id in PATH_ACCENTS, `${id} needs an accent color`);
    assert.ok(id in FACTION_SIGILS, `${id} needs a sigil`);
  }
});
