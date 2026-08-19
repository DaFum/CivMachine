import test from 'node:test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { GameEngine } from '../dist/game/engine.js';
import { buildViewModel, civilizationRenderKey } from '../dist/ui/view-model.js';
import { developmentStage, worldWidthMultiplier, worldSnapshot } from '../dist/render/world-model.js';
import { decisionImpulseKind, entropyThresholdColor, structuralWorldKey, worldPresentation } from '../dist/render/world-presentation.js';
import { PATH_IDS } from '../dist/game/paths.js';
import { hash01, mixColor, PATH_ACCENTS, DEFAULT_ACCENT, pathAccentFor, FACTION_SIGILS } from '../dist/render/primitives.js';
import { canvasSurface } from '../dist/render/draw-surface.js';
import { speciesProfile, casteFor, drawCreature } from '../dist/render/species.js';
import { factionRoster, factionSignature } from '../dist/render/factions.js';
import { settlementSizes, settlementClassFor, settlementClassSignature, settlementLayout, CLASS_ORDER } from '../dist/render/settlements.js';
import { structureKindsForEra, drawStructure, drawBanner, bannerGeometry, settlementCrown, BANNER_POLE_MIN } from '../dist/render/structures.js';
import { agentPlan, agentPlanTotal } from '../dist/render/agents.js';
import { ConstructionTracker, CONSTRUCTION_MS, CONSTRUCTION_REDUCED_MS } from '../dist/render/construction.js';
import { freshEngine } from './balance-harness.mjs';

const NEWLINE = String.fromCharCode(10);

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

test('canvas surface translates the drawing vocabulary into 2D context calls', () => {
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

test('world module no longer carries its own layout or hash helpers', async () => {
  const source = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  assert.ok(!source.includes('function buildingLayout'), 'buildingLayout must move to settlements.ts');
  assert.ok(!source.includes('function hash01'), 'hash01 must move to primitives.ts');
  assert.ok(!source.includes('interface BuildingShape'), 'BuildingShape is replaced by Structure');
  assert.ok(!source.includes('drawCanvasDecisionImpulse'), 'the impulse renderer must be unified via DrawSurface');
  assert.ok(source.includes('canvasSurface('), 'drawing must go through DrawSurface');
  assert.ok(source.includes('drawCreature('), 'inhabitants must be rendered');
  assert.ok(source.includes('drawBanner('), 'faction banners must be rendered');
  assert.ok(source.includes('ConstructionTracker'), 'construction animation must be wired in');
});

test('every render module is precached by the service worker', async () => {
  const source = await readFile(new URL('../../sw.js', import.meta.url), 'utf8');
  const modules = ['primitives', 'draw-surface', 'species', 'factions', 'settlements', 'structures', 'agents', 'construction', 'world', 'world-model', 'world-presentation'];
  for (const name of modules) {
    assert.ok(source.includes(`'/game/dist/render/${name}.js'`), `sw.js must precache render/${name}.js`);
  }
  assert.ok(!source.includes("'rce-app-v1.3.1'"), 'CACHE_NAME must be bumped for this release');
});

test('banners stay inside the viewport however tall the skyline gets', () => {
  const settlement = (crown, centerX = 300) => ({ id: 's0', centerX, radius: 40, settlementClass: 'city', factionIndex: 0, structures: [{ id: 'a', x: centerX, width: 20, height: crown, kind: 'dwelling', level: 3 }] });
  const height = 520;
  const ground = height * .78;

  const low = bannerGeometry(settlement(60), ground, height);
  assert.equal(low.topY, ground - 60 - 34, 'a short settlement keeps the full clearance');
  assert.equal(low.poleHeight, 34);

  for (const crown of [60, 200, 340, ground - 4, ground + 200]) {
    const banner = bannerGeometry(settlement(crown), ground, height);
    assert.ok(banner.topY >= height * .04, `crown ${crown} pushed the banner to ${banner.topY}`);
    assert.ok(banner.topY + banner.poleHeight <= ground + 1, `crown ${crown} put the pole below ground`);
    assert.ok(banner.poleHeight >= BANNER_POLE_MIN, `crown ${crown} collapsed the pole to ${banner.poleHeight}`);
    assert.equal(banner.x, 300);
  }
});

test('settlement crown is the tallest structure', () => {
  assert.equal(settlementCrown({ structures: [{ height: 10 }, { height: 42 }, { height: 7 }] }), 42);
  assert.equal(settlementCrown({ structures: [] }), 0);
});

test('the view model forecasts the cascade and the next depth band', () => {
  const engine = freshEngine();
  engine.state.machine.upgradeLevels.reality_lattice = 4;
  engine.startCivilization(510);
  const civ = engine.state.civilization;
  civ.eventChoices = 4;
  civ.years = 3000;
  civ.era = 1;
  civ.development = 400;
  civ.tactical.entropy = 20;
  const vm = buildViewModel(engine);
  assert.equal(vm.tactical.containmentRating, 4);
  assert.ok(vm.tactical.entropyRate > 0);
  assert.ok(vm.tactical.secondsToCascade > 0);
  assert.equal(Number(vm.tactical.pressureMultiplier.toFixed(4)), Number((1 + 3000 / 6500).toFixed(4)));
  assert.equal(vm.harvest.depth, 5);
  assert.equal(vm.harvest.depthBand, 'transcendent');
  assert.equal(vm.harvest.nextBand.grade, 'ascendant');
  assert.equal(vm.harvest.nextBand.depthNeeded, 9);
  assert.ok(vm.harvest.nextBand.yieldMultiplier > vm.harvest.controlled.multiplier);
});

test('the deepest band reports no next band', () => {
  const engine = freshEngine();
  engine.startCivilization(511);
  const civ = engine.state.civilization;
  civ.eventChoices = 4;
  civ.years = 7000;
  civ.era = 2;
  civ.development = 4000;
  assert.equal(buildViewModel(engine).harvest.nextBand, null);
  assert.equal(buildViewModel(engine).harvest.depthBand, 'singular');
});

test('the machine reserve is presented with its escalated cost and reason', () => {
  const engine = freshEngine();
  engine.startCivilization(512);
  const reserve = buildViewModel(engine).machineReserve;
  assert.equal(reserve.length, 3);
  assert.equal(reserve[0].id, 'containment_pulse');
  assert.equal(reserve[0].enabled, false);
  assert.ok(reserve[0].reason.length > 0);
  assert.equal(reserve[0].usesLeft, 3);
});

test('the render key tracks reserve affordability as a boolean, not a balance', () => {
  const engine = freshEngine();
  engine.state.meta.progression.machineInsight = 30;
  engine.state.machine.currencies.causal_mass = 5000;
  engine.startCivilization(513);
  const before = civilizationRenderKey(buildViewModel(engine));
  engine.state.machine.currencies.causal_mass = 5001;
  assert.equal(civilizationRenderKey(buildViewModel(engine)), before);
  engine.state.machine.currencies.causal_mass = 1;
  assert.notEqual(civilizationRenderKey(buildViewModel(engine)), before);
});

test('the render key tracks the depth band, never the depth itself', () => {
  const engine = freshEngine();
  engine.startCivilization(514);
  const civ = engine.state.civilization;
  civ.eventChoices = 4;
  civ.years = 3000;
  civ.era = 1;
  civ.development = 400;
  const before = civilizationRenderKey(buildViewModel(engine));
  civ.development = 401;
  assert.equal(civilizationRenderKey(buildViewModel(engine)), before, 'a ticking development must not change the key');
  civ.development = 1600;
  assert.notEqual(civilizationRenderKey(buildViewModel(engine)), before, 'crossing a band must change the key');
});

test('the service worker precaches every new game module', async () => {
  const source = await readFile(new URL('../../sw.js', import.meta.url), 'utf8');
  for (const name of ['run-interventions', 'pressure', 'harvest-quality', 'paths', 'rules', 'intervention-scheduler']) {
    assert.ok(source.includes(`'/game/dist/game/${name}.js'`), `sw.js must precache game/${name}.js`);
  }
  assert.ok(source.includes("'/game/dist/data/apotheosis-events.js'"), 'sw.js must precache the Apotheosis events');
  assert.ok(source.includes("const CACHE_NAME = 'rce-app-v1.5.0'"), 'CACHE_NAME must be bumped');
});

test('the construction tracker forgets structures the world no longer contains', () => {
  const tracker = new ConstructionTracker(1000);
  tracker.sync([{ id: 'a', level: 1 }, { id: 'b', level: 1 }], 0);
  tracker.sync([{ id: 'a', level: 2 }, { id: 'b', level: 1 }], 10);
  assert.equal(tracker.activeCount, 1, 'a raised level animates');
  assert.equal(tracker.isBuilding('a', 20), true);

  // 'a' leaves the world: its animation and its baseline must both go with it.
  tracker.sync([{ id: 'b', level: 1 }], 30);
  assert.equal(tracker.activeCount, 0, 'a departed structure must stop animating');
  assert.equal(tracker.isBuilding('a', 40), false);

  // 'a' returns at a higher level. Its stale baseline is gone, so this is a first sighting and
  // establishes a baseline instead of animating a build that never happened.
  tracker.sync([{ id: 'a', level: 9 }, { id: 'b', level: 1 }], 50);
  assert.equal(tracker.isBuilding('a', 60), false, 'a returning structure must not replay a build');
  assert.equal(tracker.activeCount, 0);

  // From that baseline a genuine upgrade animates again.
  tracker.sync([{ id: 'a', level: 10 }, { id: 'b', level: 1 }], 70);
  assert.equal(tracker.isBuilding('a', 80), true);
});

test('volatile reserve and harvest figures are refreshed live, not only on a structural render', async () => {
  const app = await readFile(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  const refresh = app.slice(app.indexOf('function refreshCivilizationLive'));
  assert.ok(refresh.length > 0, 'the live refresh must exist');

  // Reserve cost rises with depth on every tick and usesLeft drops on use, while the render key
  // tracks only affordability. Both must therefore be written by the live refresh.
  assert.match(app, /data-reserve-cost="\$\{esc\(entry\.id\)\}"/, 'the reserve cost line needs a live hook');
  assert.match(app, /data-reserve-reason="\$\{esc\(entry\.id\)\}"/, 'the reserve reason needs a live hook');
  assert.ok(refresh.includes('[data-reserve-cost="${entry.id}"]'), 'the live refresh must rewrite the reserve cost');
  assert.ok(refresh.includes('[data-reserve-reason="${entry.id}"]'), 'the live refresh must rewrite the reserve reason');
  assert.ok(refresh.includes('button.disabled=!entry.enabled'), 'the live refresh must resync reserve availability');

  // Harvest yield and credits move continuously inside one depth band.
  assert.match(app, /data-live="harvest-summary"/, 'the harvest summary needs a live hook');
  assert.ok(refresh.includes("setText('[data-live=\"harvest-summary\"]',harvestSummaryText(vm.harvest.controlled))"), 'the live refresh must rewrite the harvest summary');
  assert.ok(refresh.includes('[data-live="harvest-controlled-${key}"]'), 'controlled rewards must refresh');
  assert.ok(refresh.includes('[data-live="harvest-chaotic-${key}"]'), 'chaotic rewards must refresh');

  // One builder per figure, so the structural render and the live refresh cannot drift apart.
  for (const builder of ['reserveCostText', 'harvestSummaryText', 'rewardText']) {
    assert.ok(app.includes(`const ${builder}=`), `${builder} must have a single definition`);
    assert.ok(app.split(`${builder}(`).length - 1 >= 2, `${builder} must be called by both the render and the refresh`);
  }
});

test('no volatile figure leaks into the civilization render key', () => {
  const engine = freshEngine();
  engine.state.meta.progression.machineInsight = 30;
  engine.state.machine.currencies.causal_mass = 500_000;
  engine.state.machine.currencies.cognition = 500_000;
  engine.state.machine.currencies.existence = 500_000;
  engine.startCivilization(9202);
  const civ = engine.state.civilization;
  civ.eventChoices = 4;
  civ.years = 3000;
  civ.era = 1;
  civ.development = 400;

  const before = civilizationRenderKey(buildViewModel(engine));
  const reserveBefore = buildViewModel(engine).machineReserve[0].cost;

  // Depth growth inside a band raises every reserve price and the harvest yield.
  civ.development = 500;
  const after = buildViewModel(engine);
  assert.ok(after.machineReserve[0].cost > reserveBefore, 'the reserve price must track depth');
  assert.equal(after.harvest.depthBand, 'transcendent', 'still the same band');
  assert.equal(civilizationRenderKey(after), before, 'a rising price must not rebuild the DOM');

  // Spending a use is different: it emits decision feedback, and the feedback sequence IS part of
  // the key, so that one does rebuild. usesLeft is therefore never the stale half of this bug -- the
  // price is. The live refresh covers both regardless.
  assert.equal(engine.useRunIntervention('containment_pulse'), true);
  const spent = buildViewModel(engine);
  assert.equal(spent.machineReserve[0].usesLeft, 2);
  assert.equal(spent.machineReserve[0].enabled, true);
  assert.notEqual(civilizationRenderKey(spent), before, 'a use emits feedback, which legitimately rebuilds');
});

test('the armed reset announces itself through a live region, not a relabelled button', async () => {
  const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /aria-live['"],\s*['"]assertive['"]/, 'the announcer must be an assertive live region');
  assert.match(main, /role['"],\s*['"]status['"]/, 'the announcer must carry a status role');
  assert.match(main, /className = 'visually-hidden'/, 'the announcer must be visually hidden');
  assert.match(main, /resetAnnouncer\.textContent = `Erase save armed\./, 'arming must write the warning');
  assert.match(main, /resetAnnouncer\.textContent = '';/, 'disarming must clear the warning');

  const disarm = main.slice(main.indexOf('function disarmReset()'), main.indexOf('resetButton.addEventListener(\'click\''));
  assert.ok(disarm.includes("resetAnnouncer.textContent = ''"), 'disarmReset itself must clear the region');

  const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(styles, /\.visually-hidden\{[^}]*clip-path:inset\(50%\)/, 'the stylesheet must define the hidden utility');
  assert.match(styles, /\.visually-hidden\{[^}]*position:absolute/, 'the hidden utility must be taken out of flow');
});

test('reduced motion freezes decorative animation but not build progress', async () => {
  const renderer = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  const lines = renderer.split(NEWLINE);

  const sparkLine = lines.find(line => line.includes('hash01(spark'));
  assert.ok(sparkLine, 'the construction spark line must exist');
  assert.ok(sparkLine.includes('animationTime / 90'), 'construction sparks must seed from animationTime');
  assert.ok(!sparkLine.includes('(time / 90'), 'no spark seed may still read the raw clock');

  const trackerLines = lines.filter(line => line.includes('tracker.isBuilding(') || line.includes('tracker.progress('));
  assert.ok(trackerLines.length >= 2, 'the tracker calls must exist');
  for (const line of trackerLines) {
    assert.ok(!line.includes('animationTime'), 'build progress must keep advancing on real time');
  }

  const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const reduced = styles.slice(styles.indexOf('@media(prefers-reduced-motion:reduce)'));
  assert.ok(reduced.includes('.icon-button.is-armed{animation:none}'), 'the armed reset button must stop pulsing');
});

test('every precached game asset actually exists on disk', async () => {
  const worker = await readFile(new URL('../../sw.js', import.meta.url), 'utf8');
  const listed = [...worker.matchAll(/'(\/game\/dist\/[^']+)'/g)].map(match => match[1]);
  assert.ok(listed.length >= 25, `only ${listed.length} dist assets are precached`);
  for (const path of listed) {
    const onDisk = new URL(`..${path.replace('/game', '')}`, import.meta.url);
    await assert.doesNotReject(readFile(onDisk), `sw.js precaches ${path}, which is not committed`);
  }
});

test('the view model reports milestone progress and the convergence gate', () => {
  const engine = freshEngine();
  const vm = buildViewModel(engine);
  assert.equal(vm.milestones.total, 28);
  assert.equal(vm.milestones.completed, 0);
  assert.equal(vm.milestones.entries.length, 28);
  assert.equal(vm.convergence.visible, false);
  assert.equal(vm.convergence.unlocked, false);
  assert.equal(vm.convergence.requirements.length, 4);
  assert.equal(vm.convergence.targetDepth, 14);
  assert.ok(vm.convergence.reason.length > 0);
  assert.equal(vm.victory, null);
});

test('the convergence card becomes visible after the first multiverse', () => {
  const engine = freshEngine();
  engine.state.meta.multiversesConsumed = 1;
  assert.equal(buildViewModel(engine).convergence.visible, true);
});

test('the render key ignores live depth but tracks convergence readiness', () => {
  const engine = freshEngine();
  const civ = GameEngine.createCivilizationForTest(77);
  civ.terminal = true;
  civ.development = 400;
  engine.state.civilization = civ;
  engine.state.phase = 'civilization';
  const before = civilizationRenderKey(buildViewModel(engine));
  civ.development = 460;
  assert.equal(civilizationRenderKey(buildViewModel(engine)), before);
  civ.development = 2000;
  civ.pathState.endgameStates = ['a', 'b', 'c', 'd'];
  assert.notEqual(civilizationRenderKey(buildViewModel(engine)), before);
});

test('a terminal run gets its own cached world layer', () => {
  const plain = GameEngine.createCivilizationForTest(78);
  const terminal = { ...GameEngine.createCivilizationForTest(78), terminal: true };
  assert.notEqual(structuralWorldKey(terminal, 800), structuralWorldKey(plain, 800));
});

test('the tactical rail shows the terminal run its real entropy pressure', () => {
  const engine = freshEngine();
  const civ = GameEngine.createCivilizationForTest(79);
  civ.years = 14000;
  engine.state.civilization = civ;
  engine.state.phase = 'civilization';
  const normal = buildViewModel(engine).tactical;
  civ.terminal = true;
  const terminal = buildViewModel(engine).tactical;
  assert.ok(Math.abs(terminal.entropyRate - normal.entropyRate * 1.6) < 1e-9);
  assert.ok(terminal.secondsToCascade < normal.secondsToCascade);
});
