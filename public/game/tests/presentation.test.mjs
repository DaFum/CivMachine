import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../dist/game/engine.js';
import { buildViewModel, civilizationRenderKey } from '../dist/ui/view-model.js';
import { developmentStage, worldWidthMultiplier, worldSnapshot } from '../dist/render/world-model.js';
import { decisionImpulseKind, entropyThresholdColor, structuralWorldKey, worldPresentation } from '../dist/render/world-presentation.js';
import { PATH_IDS } from '../dist/game/paths.js';
import { hash01, mixColor, PATH_ACCENTS, DEFAULT_ACCENT, pathAccentFor, FACTION_SIGILS } from '../dist/render/primitives.js';
import { phaserSurface, canvasSurface } from '../dist/render/draw-surface.js';
import { speciesProfile, casteFor, drawCreature } from '../dist/render/species.js';
import { factionRoster, factionSignature } from '../dist/render/factions.js';

function recordingSurface(calls) {
  const surface = new Proxy({}, { get: (_t, name) => (...args) => { calls.push([name, ...args]); return surface; } });
  return surface;
}

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

test('draw surface adapters emit the same primitive sequence on both backends', () => {
  const phaserCalls = [];
  const graphics = new Proxy({}, { get: (_t, name) => (...args) => { phaserCalls.push([name, ...args]); } });
  phaserSurface(graphics).fillStyle(0x112233, .5).fillRect(1, 2, 3, 4).line(5, 6, 7, 8).fillCircle(9, 10, 11);
  assert.deepEqual(phaserCalls, [
    ['fillStyle', 0x112233, .5],
    ['fillRect', 1, 2, 3, 4],
    ['lineBetween', 5, 6, 7, 8],
    ['fillCircle', 9, 10, 11],
  ]);

  const canvasCalls = [];
  const context = {
    set fillStyle(value) { canvasCalls.push(['fillStyle', value]); },
    set strokeStyle(value) { canvasCalls.push(['strokeStyle', value]); },
    set lineWidth(value) { canvasCalls.push(['lineWidth', value]); },
    fillRect: (...args) => canvasCalls.push(['fillRect', ...args]),
    beginPath: () => canvasCalls.push(['beginPath']),
    moveTo: (...args) => canvasCalls.push(['moveTo', ...args]),
    lineTo: (...args) => canvasCalls.push(['lineTo', ...args]),
    arc: (...args) => canvasCalls.push(['arc', ...args]),
    fill: () => canvasCalls.push(['fill']),
    stroke: () => canvasCalls.push(['stroke']),
    closePath: () => canvasCalls.push(['closePath']),
  };
  const toColor = (value, alpha = 1) => `#${value.toString(16)}@${alpha}`;
  canvasSurface(context, toColor).fillStyle(0x112233, .5).fillRect(1, 2, 3, 4).line(5, 6, 7, 8);
  assert.deepEqual(canvasCalls, [
    ['fillStyle', '#112233@0.5'],
    ['fillRect', 1, 2, 3, 4],
    ['beginPath'], ['moveTo', 5, 6], ['lineTo', 7, 8], ['stroke'],
  ]);
});

test('canvas surface never emits a negative radius', () => {
  const radii = [];
  const context = {
    set fillStyle(_v) {}, set strokeStyle(_v) {}, set lineWidth(_v) {},
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, stroke() {}, fillRect() {},
    arc: (_x, _y, r) => radii.push(r),
  };
  canvasSurface(context, () => '#000').fillCircle(0, 0, -5).strokeCircle(0, 0, -1);
  assert.deepEqual(radii, [0, 0]);
});

test('species profile is deterministic and independent of trait order', () => {
  const a = GameEngine.createCivilizationForTest(11);
  a.traits.push('chronically_lucky', 'fungal_consensus', 'museum_planet');
  const b = GameEngine.createCivilizationForTest(11);
  b.traits.push('museum_planet', 'fungal_consensus', 'chronically_lucky');
  assert.equal(speciesProfile(a).archetype, 'mycelic');
  assert.deepEqual(speciesProfile(a), speciesProfile(b));
  assert.deepEqual(speciesProfile(a), speciesProfile(a));
});

test('species archetype follows the trait priority table', () => {
  const cases = [
    ['fungal_consensus', 'mycelic'], ['liquid_mathematics', 'fluidic'], ['telepathic_species', 'cerebral'],
    ['physics_optional', 'phasic'], ['sentient_moon', 'lithic'], ['recurring_nightmare', 'umbral'],
    ['ritual_engineering', 'chitinous'], ['born_after_end', 'revenant'], ['last_species', 'attenuated'],
  ];
  for (const [trait, archetype] of cases) {
    const civ = GameEngine.createCivilizationForTest(5);
    civ.traits.push(trait);
    assert.equal(speciesProfile(civ).archetype, archetype, `${trait} should yield ${archetype}`);
  }
  const higher = GameEngine.createCivilizationForTest(5);
  higher.traits.push('last_species', 'fungal_consensus');
  assert.equal(speciesProfile(higher).archetype, 'mycelic', 'table order wins over trait order');
});

test('species falls back to a seed archetype when no trait implies a body', () => {
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
  const archetypes = new Set();
  for (const seed of seeds) {
    const civ = GameEngine.createCivilizationForTest(seed);
    civ.traits.push('chronically_lucky', 'extreme_bureaucracy', 'museum_planet');
    const profile = speciesProfile(civ);
    assert.ok(['bipedal', 'tripodal', 'swarm'].includes(profile.archetype));
    archetypes.add(profile.archetype);
  }
  assert.ok(archetypes.size > 1, 'different seeds must not all collapse to one archetype');
});

test('species body color bends toward the dominant path accent', () => {
  const neutral = GameEngine.createCivilizationForTest(9);
  neutral.traits.push('sentient_moon');
  const aligned = GameEngine.createCivilizationForTest(9);
  aligned.traits.push('sentient_moon');
  aligned.pathState.dominantPath = 'cosmic_resistance';
  assert.notEqual(speciesProfile(aligned).bodyColor, speciesProfile(neutral).bodyColor);
  assert.equal(speciesProfile(aligned).archetype, speciesProfile(neutral).archetype);
});

test('castes are assigned by settlement class', () => {
  assert.equal(casteFor('camp'), 'labourer');
  assert.equal(casteFor('village'), 'labourer');
  assert.equal(casteFor('town'), 'citizen');
  assert.equal(casteFor('city'), 'citizen');
  assert.equal(casteFor('metropolis'), 'augmented');
  assert.equal(casteFor('arcology'), 'augmented');
  assert.equal(casteFor('unknown'), 'citizen');
});

test('drawCreature emits geometry for every archetype and caste', () => {
  for (const trait of ['fungal_consensus', 'liquid_mathematics', 'telepathic_species', 'physics_optional', 'sentient_moon', 'recurring_nightmare', 'ritual_engineering', 'born_after_end', 'last_species', 'museum_planet']) {
    const civ = GameEngine.createCivilizationForTest(3);
    civ.traits.push(trait);
    const profile = speciesProfile(civ);
    for (const caste of ['labourer', 'citizen', 'augmented']) {
      const calls = [];
      const surface = recordingSurface(calls);
      drawCreature(surface, profile, caste, 100, 200, 1, .5, 0x6fe7e1);
      assert.ok(calls.length >= 3, `${trait}/${caste} drew ${calls.length} primitives`);
      assert.ok(calls.every(([, ...args]) => args.every(value => typeof value !== 'number' || Number.isFinite(value))), `${trait}/${caste} emitted a non-finite coordinate`);
    }
  }
});

test('faction roster ranks paths by affinity and normalizes shares', () => {
  const civ = GameEngine.createCivilizationForTest(21);
  civ.pathState.affinity.machine_faith = 6;
  civ.pathState.affinity.void_communion = 3;
  civ.pathState.affinity.collective_mind = 1;
  const roster = factionRoster(civ);
  assert.equal(roster.length, 3);
  assert.deepEqual(roster.map(f => f.pathId), ['machine_faith', 'void_communion', 'collective_mind']);
  assert.ok(Math.abs(roster.reduce((sum, f) => sum + f.share, 0) - 1) < 1e-9);
  assert.equal(roster[0].color, 0xf0ca6f);
  assert.equal(roster[0].sigil, 'spire');
  assert.ok(roster[0].label.length > 0);
});

test('faction roster puts the dominant path first even below the leader', () => {
  const civ = GameEngine.createCivilizationForTest(22);
  civ.pathState.affinity.machine_faith = 8;
  civ.pathState.affinity.void_communion = 2;
  civ.pathState.dominantPath = 'void_communion';
  assert.equal(factionRoster(civ)[0].pathId, 'void_communion');
});

test('faction roster is empty before any affinity exists', () => {
  assert.deepEqual(factionRoster(GameEngine.createCivilizationForTest(23)), []);
  assert.equal(factionSignature(GameEngine.createCivilizationForTest(23)), 'unaligned');
});

test('faction signature bands shares into quarters', () => {
  const civ = GameEngine.createCivilizationForTest(24);
  civ.pathState.affinity.machine_faith = 8;
  civ.pathState.affinity.void_communion = 2;
  const base = factionSignature(civ);
  civ.pathState.affinity.machine_faith = 8.2;
  assert.equal(factionSignature(civ), base, 'a share change inside a quarter must not churn the key');
  civ.pathState.affinity.machine_faith = 2;
  civ.pathState.affinity.void_communion = 8;
  assert.notEqual(factionSignature(civ), base, 'crossing quarters must change the key');
});

test('agent budget never exceeds its per-class or total ceiling', () => {
  let maxTotal = 0;
  for (const era of [0, 1, 2, 3, 4]) {
    for (const development of [1, 60, 200, 600, 2000, 9000]) {
      for (const institutions of [0, 3, 9]) {
        const civ = GameEngine.createCivilizationForTest(31 + era);
        civ.era = era; civ.development = development; civ.eventChoices = institutions * 3;
        for (let i = 0; i < institutions; i++) civ.institutions.push(`Institution ${i}`);
        const budget = worldSnapshot(civ, 900).agentBudget;
        assert.ok(budget.pedestrians <= 60, `pedestrians ${budget.pedestrians}`);
        assert.ok(budget.vehicles <= 34, `vehicles ${budget.vehicles}`);
        assert.ok(budget.aircraft <= 14, `aircraft ${budget.aircraft}`);
        assert.ok(budget.orbital <= 8, `orbital ${budget.orbital}`);
        assert.ok(budget.launches <= 4, `launches ${budget.launches}`);
        const total = budget.pedestrians + budget.vehicles + budget.aircraft + budget.orbital + budget.launches;
        assert.ok(total <= 120, `total ${total}`);
        maxTotal = Math.max(maxTotal, total);
      }
    }
  }
  assert.ok(maxTotal > 60, 'a fully developed world should actually use the budget');
});

test('settlement count grows with development stage and stays bounded', () => {
  const early = GameEngine.createCivilizationForTest(41);
  assert.equal(worldSnapshot(early, 900).settlementCount, 1);
  const late = GameEngine.createCivilizationForTest(41);
  late.development = 600; late.era = 4; late.eventChoices = 15;
  late.institutions.push('Consensus Lattice', 'Reality Works Authority');
  const count = worldSnapshot(late, 900).settlementCount;
  assert.ok(count >= 6 && count <= 9, `settlementCount was ${count}`);
});
