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
import { settlementSizes, settlementClassFor, settlementClassSignature, settlementLayout, CLASS_ORDER } from '../dist/render/settlements.js';
import { structureKindsForEra, drawStructure, drawBanner } from '../dist/render/structures.js';
import { agentPlan, agentPlanTotal } from '../dist/render/agents.js';
import { ConstructionTracker, CONSTRUCTION_MS, CONSTRUCTION_REDUCED_MS } from '../dist/render/construction.js';

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

function lateCiv(seed = 51) {
  const civ = GameEngine.createCivilizationForTest(seed);
  civ.development = 600; civ.era = 2; civ.eventChoices = 15;
  civ.institutions.push('Consensus Lattice', 'Reality Works Authority');
  return civ;
}

test('settlement sizes account for every structure in the snapshot', () => {
  for (const civ of [GameEngine.createCivilizationForTest(51), lateCiv()]) {
    const snapshot = worldSnapshot(civ, 900);
    const sizes = settlementSizes(civ, snapshot);
    assert.equal(sizes.length, snapshot.settlementCount);
    assert.equal(sizes.reduce((a, b) => a + b, 0), snapshot.buildingCount);
    assert.ok(sizes.every(size => size >= 1), 'no settlement may be empty');
  }
});

test('early worlds are camps and villages, late worlds reach metropolis scale', () => {
  const early = GameEngine.createCivilizationForTest(52);
  const earlySnapshot = worldSnapshot(early, 900);
  const earlyClasses = settlementLayout(early, earlySnapshot.worldWidth, 400, earlySnapshot).map(s => s.settlementClass);
  assert.ok(earlyClasses.every(c => c === 'camp' || c === 'village'), `got ${earlyClasses.join(',')}`);

  const late = lateCiv(52);
  const lateSnapshot = worldSnapshot(late, 900);
  const lateClasses = settlementLayout(late, lateSnapshot.worldWidth, 400, lateSnapshot).map(s => s.settlementClass);
  assert.ok(lateClasses.some(c => c === 'metropolis' || c === 'arcology'), `got ${lateClasses.join(',')}`);
});

test('settlement layout is deterministic and geometrically sane', () => {
  const civ = lateCiv(53);
  const snapshot = worldSnapshot(civ, 900);
  const first = settlementLayout(civ, snapshot.worldWidth, 400, snapshot);
  const second = settlementLayout(civ, snapshot.worldWidth, 400, snapshot);
  assert.deepEqual(first, second);
  const totalStructures = first.reduce((sum, s) => sum + s.structures.length, 0);
  assert.equal(totalStructures, snapshot.buildingCount);
  const ids = new Set(first.flatMap(s => s.structures.map(st => st.id)));
  assert.equal(ids.size, totalStructures, 'structure ids must be unique');
  for (const settlement of first) {
    assert.ok(settlement.centerX >= 0 && settlement.centerX <= snapshot.worldWidth);
    assert.ok(settlement.radius > 0);
    for (const structure of settlement.structures) {
      assert.ok(structure.width > 0 && structure.height > 0);
      assert.ok(Number.isFinite(structure.x));
    }
  }
});

test('settlements are assigned to factions proportionally to affinity share', () => {
  const civ = lateCiv(54);
  civ.pathState.affinity.machine_faith = 9;
  civ.pathState.affinity.void_communion = 1;
  const snapshot = worldSnapshot(civ, 900);
  const layout = settlementLayout(civ, snapshot.worldWidth, 400, snapshot);
  const leaderHeld = layout.filter(s => s.factionIndex === 0).length;
  assert.ok(leaderHeld > layout.length / 2, `leader held ${leaderHeld} of ${layout.length}`);
  assert.ok(layout.every(s => s.factionIndex >= 0));

  const unaligned = lateCiv(54);
  const unalignedLayout = settlementLayout(unaligned, snapshot.worldWidth, 400, worldSnapshot(unaligned, 900));
  assert.ok(unalignedLayout.every(s => s.factionIndex === -1), 'no affinity means no banner owner');
});

test('settlement class signature is discrete and reflects the class mix', () => {
  const civ = lateCiv(55);
  const snapshot = worldSnapshot(civ, 900);
  const base = settlementClassSignature(civ, snapshot);
  civ.development += 1;
  assert.equal(settlementClassSignature(civ, worldSnapshot(civ, 900)), base, 'a one-point tick must not churn the signature');
  civ.era = 4; civ.development = 3000;
  assert.notEqual(settlementClassSignature(civ, worldSnapshot(civ, 900)), base);
});

test('settlement classes are ordered from camp to arcology', () => {
  assert.deepEqual([...CLASS_ORDER], ['camp', 'village', 'town', 'city', 'metropolis', 'arcology']);
  assert.equal(settlementClassFor(2, 0, 0), 'camp');
  assert.equal(settlementClassFor(6, 0, 0), 'village');
  assert.equal(settlementClassFor(30, 4, 4), 'arcology');
});

test('structure kinds unlock by era', () => {
  assert.deepEqual(structureKindsForEra(0, 1), ['dwelling', 'farm', 'temple', 'monument']);
  const era1 = structureKindsForEra(1, 1);
  assert.ok(era1.includes('industry') && era1.includes('academy'));
  assert.ok(!era1.includes('spaceport'), 'spaceport must not exist before era 2');
  assert.ok(!structureKindsForEra(0, 1).includes('spaceport'));
  const era2 = structureKindsForEra(2, 2);
  assert.ok(era2.includes('spaceport') && era2.includes('reactor'));
  assert.ok(!era2.includes('orbital_anchor'), 'orbital anchor must not exist before era 3');
  assert.ok(structureKindsForEra(3, 3).includes('orbital_anchor'));
  assert.deepEqual(structureKindsForEra(4, 0), ['dwelling', 'farm'], 'stage 0 stays pre-urban regardless of era');
});

test('every structure kind draws distinct geometry', () => {
  const signatures = new Map();
  for (const kind of ['dwelling', 'farm', 'temple', 'monument', 'industry', 'academy', 'reactor', 'spaceport', 'orbital_anchor']) {
    const calls = [];
    drawStructure(recordingSurface(calls), { id: 'x', x: 120, width: 30, height: 80, kind, level: 3 }, 300, 0x182b39, 0x6fe7e1, 0xf2cd7b, 7);
    assert.ok(calls.length >= 2, `${kind} drew ${calls.length} primitives`);
    assert.ok(calls.every(([, ...args]) => args.every(value => typeof value !== 'number' || Number.isFinite(value))), `${kind} emitted a non-finite coordinate`);
    signatures.set(kind, JSON.stringify(calls));
  }
  assert.equal(new Set(signatures.values()).size, signatures.size, 'two kinds produced identical geometry');
});

test('banners draw a pole and a sigil for every faction sigil', () => {
  for (const sigil of ['spire', 'node', 'ring', 'prism', 'spiral', 'chevron', 'grid', 'halo', 'void', 'nest']) {
    const calls = [];
    drawBanner(recordingSurface(calls), 200, 140, 40, 0xf0ca6f, sigil, .5);
    assert.ok(calls.some(([name]) => name === 'line'), `${sigil} drew no pole`);
    assert.ok(calls.length >= 4, `${sigil} drew ${calls.length} primitives`);
  }
});

test('agent plan respects the budget and binds agents to real places', () => {
  const civ = lateCiv(61);
  civ.era = 4; civ.development = 4000;
  const snapshot = worldSnapshot(civ, 900);
  const settlements = settlementLayout(civ, snapshot.worldWidth, 400, snapshot);
  const plan = agentPlan(civ, snapshot, settlements);
  assert.ok(agentPlanTotal(plan) <= 120, `total was ${agentPlanTotal(plan)}`);
  assert.equal(plan.pedestrians.length, snapshot.agentBudget.pedestrians);
  assert.ok(plan.pedestrians.every(p => p.settlementIndex >= 0 && p.settlementIndex < settlements.length));
  assert.ok(plan.vehicles.every(v => Number.isFinite(v.fromX) && Number.isFinite(v.toX) && v.fromX !== v.toX));
  assert.ok(plan.aircraft.every(a => a.altitude > 0));
  assert.deepEqual(agentPlan(civ, snapshot, settlements), plan, 'plans are deterministic');
});

test('agent plan produces nothing that the world cannot support yet', () => {
  const early = GameEngine.createCivilizationForTest(62);
  const snapshot = worldSnapshot(early, 900);
  const plan = agentPlan(early, snapshot, settlementLayout(early, snapshot.worldWidth, 400, snapshot));
  assert.equal(plan.vehicles.length, 0, 'stage 0 has no traffic');
  assert.equal(plan.aircraft.length, 0);
  assert.equal(plan.orbital.length, 0);
  assert.equal(plan.launches.length, 0);
  assert.ok(plan.pedestrians.length > 0, 'even a camp is inhabited');
});

test('launches only exist where a spaceport was actually built', () => {
  const civ = lateCiv(63);
  civ.era = 4; civ.development = 4000;
  const snapshot = worldSnapshot(civ, 900);
  const settlements = settlementLayout(civ, snapshot.worldWidth, 400, snapshot);
  const spaceportX = new Set(settlements.flatMap(s => s.structures.filter(st => st.kind === 'spaceport' || st.kind === 'orbital_anchor').map(st => st.x)));
  const plan = agentPlan(civ, snapshot, settlements);
  assert.ok(plan.launches.length <= 4);
  for (const launch of plan.launches) assert.ok(spaceportX.has(launch.x), `launch at ${launch.x} has no pad`);
});

test('construction tracker only animates actual level increases', () => {
  const tracker = new ConstructionTracker(1800);
  tracker.sync([{ id: 'a', level: 1 }, { id: 'b', level: 2 }], 0);
  assert.equal(tracker.activeCount, 0, 'the first observation must not animate the whole world');

  tracker.sync([{ id: 'a', level: 1 }, { id: 'b', level: 2 }], 100);
  assert.equal(tracker.activeCount, 0, 'an unchanged level must not animate');

  tracker.sync([{ id: 'a', level: 3 }, { id: 'b', level: 2 }], 200);
  assert.equal(tracker.activeCount, 1);
  assert.ok(tracker.isBuilding('a', 200));
  assert.ok(!tracker.isBuilding('b', 200));
  assert.equal(tracker.progress('a', 200), 0);
  assert.ok(Math.abs(tracker.progress('a', 1100) - .5) < 1e-9);
  assert.equal(tracker.progress('b', 200), 1, 'idle structures report finished');

  tracker.sync([{ id: 'a', level: 2 }], 300);
  assert.equal(tracker.activeCount, 1, 'a level decrease must not open a window');

  tracker.prune(1999);
  assert.equal(tracker.activeCount, 1);
  tracker.prune(2001);
  assert.equal(tracker.activeCount, 0);
  assert.equal(tracker.progress('a', 2001), 1);
});

test('construction tracker resets cleanly', () => {
  assert.equal(CONSTRUCTION_MS, 1800);
  assert.equal(CONSTRUCTION_REDUCED_MS, 400);
  const tracker = new ConstructionTracker(1800);
  tracker.sync([{ id: 'a', level: 1 }], 0);
  tracker.sync([{ id: 'a', level: 4 }], 10);
  assert.equal(tracker.activeCount, 1);
  tracker.reset();
  assert.equal(tracker.activeCount, 0);
  tracker.sync([{ id: 'a', level: 9 }], 20);
  assert.equal(tracker.activeCount, 0, 'after a reset the next observation is a fresh baseline');
});

test('structural key reacts to species, factions and settlement classes but not to ticks', () => {
  const civ = lateCiv(71);
  const base = structuralWorldKey(civ, 800);
  civ.development += 1;
  assert.equal(structuralWorldKey(civ, 800), base, 'a one-point development tick must not rebuild the world');
  civ.elapsedSeconds += 12; civ.years += 40;
  assert.equal(structuralWorldKey(civ, 800), base, 'elapsed time must not rebuild the world');

  const withSpecies = lateCiv(71);
  withSpecies.traits.push('fungal_consensus');
  assert.notEqual(structuralWorldKey(withSpecies, 800), base, 'a different species must rebuild the world');

  const withFaction = lateCiv(71);
  withFaction.pathState.affinity.machine_faith = 7;
  withFaction.pathState.affinity.void_communion = 1;
  assert.notEqual(structuralWorldKey(withFaction, 800), base, 'a faction split must rebuild the world');

  const grown = lateCiv(71);
  grown.era = 4; grown.development = 3000;
  assert.notEqual(structuralWorldKey(grown, 800), base);
});

test('settlement layout never emits a structure kind the era forbids', () => {
  for (const era of [0, 1, 2, 3, 4]) {
    for (const development of [1, 200, 600, 3000]) {
      const civ = GameEngine.createCivilizationForTest(81 + era);
      civ.era = era; civ.development = development; civ.eventChoices = 15;
      civ.institutions.push('Consensus Lattice', 'Reality Works Authority');
      const snapshot = worldSnapshot(civ, 900);
      const allowed = new Set(structureKindsForEra(era, snapshot.stage));
      for (const settlement of settlementLayout(civ, snapshot.worldWidth, 400, snapshot)) {
        for (const structure of settlement.structures) {
          assert.ok(allowed.has(structure.kind), `era ${era} stage ${snapshot.stage} produced ${structure.kind}`);
        }
      }
    }
  }
});
