import test from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { GameEngine } from '../dist/game/engine.js';
import { buildViewModel, civilizationRenderKey } from '../dist/ui/view-model.js';
import { developmentStage, liveWorldSample, worldWidthMultiplier, worldSnapshot } from '../dist/render/world-model.js';
import { structuralWorldKey, worldPresentation } from '../dist/render/world-presentation.js';
import { consequenceImpact, drawConsequenceImpact, drawPhaseTransitionImpact } from '../dist/render/consequence-presentation.js';
import { CivilizationPaths, PATH_IDS } from '../dist/game/paths.js';
import { LOCALIZATION } from '../dist/data/localization.js';
import { hash01, mixColor, PATH_ACCENTS, DEFAULT_ACCENT, pathAccentFor, FACTION_SIGILS, valueNoise, ridgeNoise, shade, tint } from '../dist/render/primitives.js';
import { canvasSurface } from '../dist/render/draw-surface.js';
import { speciesProfile, casteFor, drawCreature } from '../dist/render/species.js';
import { factionRoster, factionSignature } from '../dist/render/factions.js';
import { settlementSizes, settlementClassFor, settlementClassSignature, settlementLayout, CLASS_ORDER, worldOutskirts, MAX_OUTSKIRTS, OUTSKIRT_WIDTH } from '../dist/render/settlements.js';
import { structureKindsForEra, drawStructure, drawBanner, bannerGeometry, settlementCrown, BANNER_POLE_MIN } from '../dist/render/structures.js';
import { agentPlan, agentPlanTotal } from '../dist/render/agents.js';
import { ConstructionTracker, CONSTRUCTION_MS, CONSTRUCTION_REDUCED_MS, MAX_CONCURRENT_BUILDS } from '../dist/render/construction.js';
import { RenderQualityController, qualityFactors, dynamicFrameIntervalMs, DYNAMIC_FRAME_MS, DYNAMIC_FRAME_MS_SMOOTH, REDUCED_MOTION_FRAME_MS } from '../dist/render/quality.js';
import { applyQualityToLiveSample, MAX_PARTICLES, MAX_HAZE_BANDS, MAX_FRACTURES, MAX_BEACONS } from '../dist/render/world-model.js';
import { worldMemorySignature } from '../dist/render/world-memory.js';
import { institutionLandmarks, pathIdentity, identitySignature } from '../dist/render/identity.js';
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

test('the snapshot carries no field the renderer never draws', () => {
  const civ = GameEngine.createCivilizationForTest(11);
  civ.development = 600;
  civ.era = 2;
  const snapshot = worldSnapshot(civ, 800);
  // These four were computed on every frame and drawn nowhere. `agentBudget` is the living source
  // for inhabitants, traffic, aircraft and orbitals; nothing may reintroduce a parallel count.
  for (const dead of ['populationDots', 'trafficCount', 'aircraftCount', 'satelliteCount']) {
    assert.equal(dead in snapshot, false, `${dead} is dead weight in the per-frame path`);
  }
  assert.ok(snapshot.agentBudget.pedestrians > 0);
});

test('the live sample holds exactly the stat-driven counts and is reused by the snapshot', () => {
  const civ = GameEngine.createCivilizationForTest(11);
  civ.development = 600;
  civ.era = 2;
  const live = liveWorldSample(civ, developmentStage(civ));
  assert.deepEqual(
    Object.keys(live).sort(),
    ['beaconCount', 'entropyBand', 'fractureCount', 'hazeBands', 'particleCount'],
  );
  const snapshot = worldSnapshot(civ, 800);
  for (const key of Object.keys(live)) assert.equal(snapshot[key], live[key], `${key} must have one definition`);

  // Ticking stats move the live sample without touching structural geometry.
  const before = liveWorldSample(civ, developmentStage(civ));
  civ.stats.attention = 90;
  civ.stats.stability = 30;
  civ.tactical.entropy = 80;
  const after = liveWorldSample(civ, developmentStage(civ));
  assert.ok(after.particleCount > before.particleCount);
  assert.ok(after.fractureCount > before.fractureCount);
  assert.equal(worldSnapshot(civ, 800).buildingCount, snapshot.buildingCount);
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
  const impulse = (eventId, consequence = { significance:'routine', tags:[], transitions:{}, signatureProfile:'' }) =>
    consequenceImpact({ sequence:1, eventId, eventTitle:'', choiceLabel:'', tone:'mixed', metrics:[], affinities:[], additions:[], consequence }, false);
  assert.equal(impulse('tactical:stabilize').kind, 'containment');
  assert.equal(impulse('tactical:accelerate').kind, 'time_streak');
  assert.equal(impulse('tactical:probe').kind, 'scan');
  assert.equal(impulse('tactical:vent').kind, 'vent');
  assert.equal(impulse('entropy_crisis_50').kind, 'fracture');
  assert.equal(impulse('synthetic_saint').kind, 'generic');
  // The three crisis thresholds stay distinguishable, now by signature variant rather than by colour.
  const variants = ['crisis:entropy_25','crisis:entropy_50','crisis:entropy_75'].map(signatureProfile =>
    impulse('entropy_crisis', { significance:'turning_point', tags:['reality_damage'], transitions:{}, signatureProfile }).variant);
  assert.equal(new Set(variants).size, 3);
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
    set globalCompositeOperation(value) { canvasCalls.push(['globalCompositeOperation', value]); },
    fillRect: (...args) => canvasCalls.push(['fillRect', ...args]),
    beginPath: () => canvasCalls.push(['beginPath']),
    moveTo: (...args) => canvasCalls.push(['moveTo', ...args]),
    lineTo: (...args) => canvasCalls.push(['lineTo', ...args]),
    arc: (...args) => canvasCalls.push(['arc', ...args]),
    fill: () => canvasCalls.push(['fill']),
    stroke: () => canvasCalls.push(['stroke']),
    closePath: () => canvasCalls.push(['closePath']),
    createLinearGradient: (...args) => {
      canvasCalls.push(['createLinearGradient', ...args]);
      return { addColorStop: (off, col) => canvasCalls.push(['addColorStop', off, col]) };
    },
    createRadialGradient: (...args) => {
      canvasCalls.push(['createRadialGradient', ...args]);
      return { addColorStop: (off, col) => canvasCalls.push(['addColorStop', off, col]) };
    },
  };
  const toColor = (value, alpha = 1) => `#${value.toString(16)}@${alpha}`;
  canvasSurface(context, toColor)
    .fillStyle(0x112233, .5)
    .fillRect(1, 2, 3, 4)
    .line(5, 6, 7, 8)
    .fillLinearGradientRect(0, 0, 10, 20, [{ offset: 0, color: 0xff0000 }, { offset: 1, color: 0x000011 }])
    .fillRadialGlow(50, 50, 0, 30, [{ offset: 0, color: 0xffffff, alpha: 0.5 }])
    .setCompositeOperation('lighter');

  assert.ok(canvasCalls.length >= 17);
  assert.deepEqual(canvasCalls[0], ['fillStyle', '#112233@0.5']);
  assert.deepEqual(canvasCalls[1], ['fillRect', 1, 2, 3, 4]);
  assert.deepEqual(canvasCalls[2], ['beginPath']);
  assert.deepEqual(canvasCalls[3], ['moveTo', 5, 6]);
  assert.deepEqual(canvasCalls[4], ['lineTo', 7, 8]);
  assert.deepEqual(canvasCalls[5], ['stroke']);
  assert.deepEqual(canvasCalls[6], ['createLinearGradient', 0, 0, 0, 20]);
  assert.deepEqual(canvasCalls[7], ['addColorStop', 0, '#ff0000@1']);
  assert.deepEqual(canvasCalls[8], ['addColorStop', 1, '#11@1']);
  assert.equal(canvasCalls[9][0], 'fillStyle');
  assert.deepEqual(canvasCalls[10], ['fillRect', 0, 0, 10, 20]);
  assert.deepEqual(canvasCalls[11], ['createRadialGradient', 50, 50, 0, 50, 50, 30]);
  assert.deepEqual(canvasCalls[12], ['addColorStop', 0, '#ffffff@0.5']);
  assert.equal(canvasCalls[13][0], 'fillStyle');
  assert.deepEqual(canvasCalls[14], ['beginPath']);
  assert.deepEqual(canvasCalls[15], ['arc', 50, 50, 30, 0, Math.PI * 2]);
  assert.deepEqual(canvasCalls[canvasCalls.length - 1], ['globalCompositeOperation', 'lighter']);
});

test('canvas surface resetState restores context globalCompositeOperation and clears cache', () => {
  const canvasCalls = [];
  const context = {
    set fillStyle(value) { canvasCalls.push(['fillStyle', value]); },
    set strokeStyle(value) { canvasCalls.push(['strokeStyle', value]); },
    set lineWidth(value) { canvasCalls.push(['lineWidth', value]); },
    set globalCompositeOperation(value) { canvasCalls.push(['globalCompositeOperation', value]); },
  };
  const toColor = (value, alpha = 1) => `#${value.toString(16)}@${alpha}`;
  const surface = canvasSurface(context, toColor);
  surface.setCompositeOperation('lighter');
  assert.deepEqual(canvasCalls[canvasCalls.length - 1], ['globalCompositeOperation', 'lighter']);

  surface.resetState();
  assert.deepEqual(canvasCalls[canvasCalls.length - 1], ['globalCompositeOperation', 'source-over']);

  // Setting source-over after resetState should trigger context update because resetState set both cache and context
  canvasCalls.length = 0;
  surface.setCompositeOperation('source-over');
  assert.equal(canvasCalls.length, 0, 'setting source-over after resetState requires no additional context change');

  surface.setCompositeOperation('lighter');
  assert.deepEqual(canvasCalls[0], ['globalCompositeOperation', 'lighter']);
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
  const modules = ['primitives', 'draw-surface', 'species', 'factions', 'settlements', 'structures', 'agents', 'construction', 'world', 'world-model', 'world-presentation', 'identity', 'world-memory', 'consequence-presentation', 'quality'];
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
  assert.equal(vm.harvest.nextBand.depthNeeded, 10);
  // The forecast names the Credit the band pays: since v1.20.0 a grade boundary is a credit step, so
  // the player is never told a band is close while the money is not.
  assert.equal(vm.harvest.nextBand.credits, 6);
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

test('the service worker precaches every compiled game module', async () => {
  const source = await readFile(new URL('../../sw.js', import.meta.url), 'utf8');
  // Derived from disk rather than from a hand-kept list: the precache list is hand-maintained and a
  // module missing from it silently fails to load for every returning player. A literal list here
  // only guards the modules someone remembered to add to it, which is the same bug one level up.
  for (const directory of ['game', 'ui', 'render', 'data']) {
    const compiled = (await readdir(new URL(`../dist/${directory}`, import.meta.url)))
      .filter(name => name.endsWith('.js'));
    assert.ok(compiled.length > 0, `dist/${directory} must be compiled before this runs`);
    for (const name of compiled) {
      assert.ok(source.includes(`'/game/dist/${directory}/${name}'`), `sw.js must precache ${directory}/${name}`);
    }
  }
  assert.ok(source.includes("'/game/dist/main.js'"), 'sw.js must precache the entrypoint');
  // Pinned to the shipped version rather than merely "present": a stale cache name is how a release
  // ships to nobody, because the old cache is served first and never revalidated.
  const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.ok(source.includes(`const CACHE_NAME = 'rce-app-v${version}'`), `CACHE_NAME must be bumped to ${version}`);
});

test('a structure that appears animates, and the first sighting of the world does not', () => {
  const tracker = new ConstructionTracker(1000);
  // Loading a save must not put the whole world under scaffolding, so the first sync is silent.
  tracker.sync([{ id: 's0:0', level: 1 }, { id: 's0:1', level: 1 }], 0);
  assert.equal(tracker.activeCount, 0, 'the first sighting establishes a baseline only');

  // Growth mostly arrives as new ids rather than higher levels, because buildingCount climbs with
  // Development. That was silent before and is the common case.
  tracker.sync([{ id: 's0:0', level: 1 }, { id: 's0:1', level: 1 }, { id: 's0:2', level: 1 }], 10);
  assert.equal(tracker.isBuilding('s0:2', 20), true, 'a structure that appears must be seen to arrive');
  assert.equal(tracker.isBuilding('s0:0', 20), false, 'its neighbours must not animate with it');
  assert.equal(tracker.activeCount, 1);
});

test('concurrent construction is capped so a new settlement is growth, not a glitch', () => {
  const tracker = new ConstructionTracker(1000);
  tracker.sync([{ id: 's0:0', level: 1 }], 0);
  // A settlement count change can bring a dozen structures at once.
  const flood = [{ id: 's0:0', level: 1 }, ...Array.from({ length: 20 }, (_, i) => ({ id: `s1:${i}`, level: 1 }))];
  tracker.sync(flood, 10);
  assert.equal(tracker.activeCount, MAX_CONCURRENT_BUILDS);
  // The budget goes to the first arrivals in document order, which is the layout's own order, so the
  // choice is deterministic rather than dependent on Map iteration.
  for (let i = 0; i < MAX_CONCURRENT_BUILDS; i++) assert.equal(tracker.isBuilding(`s1:${i}`, 20), true, `s1:${i} must animate`);
  assert.equal(tracker.isBuilding(`s1:${MAX_CONCURRENT_BUILDS}`, 20), false, 'past the cap, arrivals are silent');

  // Once the wave finishes the budget frees up again.
  tracker.prune(1500);
  assert.equal(tracker.activeCount, 0);
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
  // The warning itself is catalog copy now; arming must fill it, and the catalog must still say it.
  assert.match(main, /resetAnnouncer\.textContent = fill\(copy\.armedAnnouncement/, 'arming must write the warning');
  assert.match(LOCALIZATION.en.ui.resetSave.armedAnnouncement, /^Erase save armed\./);
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

test('index.html hosts the victory view and the machine cards render', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('id="victory-view"'));
  const app = await readFile(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  // The card titles are catalog keys now, so the panel is identified by the key it reads and the
  // catalog is what pins the words.
  const APP = LOCALIZATION.en.ui.app;
  assert.ok(app.includes('t.milestoneRegister'));
  assert.equal(APP.milestoneRegister, 'MILESTONE REGISTER');
  assert.ok(app.includes('t.greatConvergence'));
  assert.equal(APP.greatConvergence, 'GREAT CONVERGENCE');
  assert.ok(app.includes('data-action="convergence"'));
  assert.ok(app.includes('data-action="acknowledge-victory"'));
  assert.ok(app.includes('t.terminalCultivation'));
  assert.equal(APP.terminalCultivation, 'TERMINAL CULTIVATION');
  // Every interpolated player value stays escaped.
  assert.ok(!app.includes('${vm.convergence.reason}'));
  assert.ok(app.includes('esc(vm.convergence.reason)'));
});

test('the victory screen names the dominant path instead of its identifier', async () => {
  const app = await readFile(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  assert.ok(app.includes('CivilizationPaths.displayName(record.dominantPath)'));
  assert.notEqual(CivilizationPaths.displayName('machine_faith'), 'machine_faith');
});

test('all ten paths expose distinct dominant silhouette identities', () => {
  const descriptors = new Set();
  for (const pathId of PATH_IDS) {
    const civ = GameEngine.createCivilizationForTest(14000 + descriptors.size);
    civ.pathState.affinity[pathId] = 8;
    civ.pathState.dominantPath = pathId;
    const identity = pathIdentity(civ);
    assert.equal(identity.pathId, pathId);
    assert.equal(identity.tier, 2);
    descriptors.add(`${identity.landmark}|${identity.motif}|${identity.crown}`);
  }
  assert.equal(descriptors.size, 10);
});

test('signature consolidation or endgame upgrades dominant identity to tier 3', () => {
  const civ = GameEngine.createCivilizationForTest(14011);
  civ.pathState.dominantPath = 'machine_faith'; civ.pathState.affinity.machine_faith = 8;
  assert.equal(pathIdentity(civ).tier, 2);
  civ.pathState.completedEvents.push('synod_of_the_second_engine');
  assert.equal(pathIdentity(civ).tier, 3);
});

test('the three current institutions expose distinct landmark descriptors', () => {
  const civ = GameEngine.createCivilizationForTest(14012);
  civ.institutions.push('Lunar Ministry','Ministry Of Sanity','Consensus Office');
  const landmarks = institutionLandmarks(civ);
  assert.equal(landmarks.length, 3);
  assert.equal(new Set(landmarks.map(item => item.kind)).size, 3);
});

test('identity entrenchment rebuilds the structural key while live values inside a band do not', () => {
  const civ = lateCiv(14013);
  civ.pathState.dominantPath = 'machine_faith'; civ.pathState.affinity.machine_faith = 8;
  const tierTwo = structuralWorldKey(civ, 800);
  assert.equal(pathIdentity(civ).tier, 2);
  civ.pathState.completedEvents.push('synod_of_the_second_engine');
  assert.equal(pathIdentity(civ).tier, 3);
  assert.notEqual(structuralWorldKey(civ, 800), tierTwo, 'entrenched identity must rebuild the cached world');
  const tierThree = structuralWorldKey(civ, 800);
  civ.stats.stability = Math.trunc(civ.stats.stability / 25) * 25 + 3;
  const shifted = structuralWorldKey(civ, 800);
  civ.stats.stability += 4;
  assert.equal(structuralWorldKey(civ, 800), shifted, 'a live stat inside one band must not rebuild the world');
  assert.equal(identitySignature(civ).startsWith('machine_faith:3:'), true);
  assert.ok(tierThree.length > 0);
});

test('world memory signatures change only for saved structural memory', () => {
  const civ = lateCiv(15001);
  const before = structuralWorldKey(civ, 800);
  civ.visualMemory = { version:1, sequence:1, marks:[{domain:'social',motif:'unrest',strength:2,sourceEventId:'x',createdAtSequence:1,anchor01:.3,repairable:true}], scars:[] };
  const after = structuralWorldKey(civ, 800);
  assert.notEqual(after, before);
  const signature = worldMemorySignature(civ.visualMemory);
  civ.visualMemory.sequence = 99;
  assert.equal(worldMemorySignature(civ.visualMemory), signature, 'sequence alone is not structural');
  assert.equal(structuralWorldKey(civ, 800), after, 'a bumped sequence alone must not rebuild the world');
});

test('semantic consequence presentation distinguishes tactical actions and significance', () => {
  const base = {
    sequence:1, eventTitle:'', choiceLabel:'', tone:'mixed', metrics:[], affinities:[], additions:[],
    consequence:{ significance:'routine', tags:[], transitions:{}, signatureProfile:'' },
  };
  assert.equal(consequenceImpact({ ...base, eventId:'tactical:stabilize' }, false).kind, 'containment');
  assert.equal(consequenceImpact({ ...base, eventId:'tactical:accelerate' }, false).kind, 'time_streak');
  assert.equal(consequenceImpact({ ...base, eventId:'tactical:probe' }, false).kind, 'scan');
  assert.equal(consequenceImpact({ ...base, eventId:'tactical:vent' }, false).kind, 'vent');
  const major = consequenceImpact({ ...base, eventId:'x', consequence:{ significance:'major', tags:['civil_unrest'], transitions:{}, signatureProfile:'' } }, false);
  const turning = consequenceImpact({ ...base, eventId:'x', consequence:{ significance:'turning_point', tags:['civil_unrest'], transitions:{}, signatureProfile:'' } }, false);
  assert.equal(major.kind, 'unrest');
  assert.ok(turning.intensity > major.intensity);
});

test('reduced motion shortens impacts without deleting semantic information', () => {
  const feedback = {
    sequence:2, eventId:'entropy_crisis_50', eventTitle:'', choiceLabel:'', tone:'negative', metrics:[], affinities:[], additions:[],
    consequence:{ significance:'turning_point', tags:['reality_damage'], transitions:{}, signatureProfile:'crisis:entropy_50' },
  };
  const full = consequenceImpact(feedback, false);
  const reduced = consequenceImpact(feedback, true);
  assert.equal(reduced.kind, full.kind);
  assert.equal(reduced.variant, full.variant);
  assert.ok(reduced.durationMs >= 250 && reduced.durationMs <= 400);
  assert.ok(full.durationMs >= 900 && full.durationMs <= 1800);
  assert.equal(reduced.staticOnly, true);
});

test('the obsolete impulse helpers are gone from the presentation module', async () => {
  const source = await readFile(new URL('../src/render/world-presentation.ts', import.meta.url), 'utf8');
  assert.ok(!source.includes('decisionImpulseKind'), 'impulse kinds now come from consequence-presentation.ts');
  assert.ok(!source.includes('entropyThresholdColor'), 'crisis colours now come from consequence-presentation.ts');
  const world = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  assert.ok(!world.includes('function drawDecisionImpulse'), 'world.ts must orchestrate, not own impact drawing');
  assert.ok(!world.includes('function impulseColor'), 'impact colour belongs to the impact module');
});

test('adaptive quality degrades after 30 hot frames and recovers only after 180 cool frames', () => {
  const controller = new RenderQualityController();
  let now = 6000;
  for (let i=0;i<29;i++) controller.update(25, now += 34);
  assert.equal(controller.tier, 0);
  controller.update(25, now += 34);
  assert.equal(controller.tier, 1);
  now += 5001;
  for (let i=0;i<180;i++) controller.update(10, now += 34);
  assert.equal(controller.tier, 0);
});

test('quality tiers reduce only cosmetic sample work and preserve fracture/beacon signals', () => {
  const sample = { particleCount:150, hazeBands:9, fractureCount:12, beaconCount:10, entropyBand:4 };
  const heavy = applyQualityToLiveSample(sample, 3);
  assert.ok(heavy.particleCount <= 60);
  assert.ok(heavy.hazeBands < 9);
  assert.equal(heavy.fractureCount, 12);
  assert.equal(heavy.beaconCount, 10);
  assert.equal(MAX_PARTICLES,150); assert.equal(MAX_HAZE_BANDS,9); assert.equal(MAX_FRACTURES,12); assert.equal(MAX_BEACONS,10);
  assert.equal(qualityFactors(3).agentFraction, .5);
});

test('live presentation exposes distinct primary signals for every authoritative visual state', () => {
  const civ = GameEngine.createCivilizationForTest(17001);
  civ.development = 120;
  const base = worldPresentation(civ).signals;
  const mutate = (fn) => { const copy = structuredClone(civ); fn(copy); return worldPresentation(copy).signals; };
  assert.notEqual(mutate(c=>c.stats.stability=35).structuralStrain, base.structuralStrain);
  assert.notEqual(mutate(c=>c.stats.sanity=35).motionIrregularity, base.motionIrregularity);
  assert.notEqual(mutate(c=>c.stats.awareness=70).outwardObservation, base.outwardObservation);
  assert.notEqual(mutate(c=>c.stats.attention=70).observerPressure, base.observerPressure);
  assert.notEqual(mutate(c=>c.tactical.entropy=70).realityFailure, base.realityFailure);
  assert.notEqual(mutate(c=>c.development=420).activity, base.activity);
});

test('named live signals stay bounded and never enter the structural key', () => {
  const civ = lateCiv(17002);
  const key = structuralWorldKey(civ, 800);
  for (const [name, value] of Object.entries(worldPresentation(civ).signals)) {
    assert.ok(value >= 0 && value <= 1, `${name} left the 0..1 range at ${value}`);
  }
  civ.stats.stability = Math.trunc(civ.stats.stability / 25) * 25 + 1;
  const banded = structuralWorldKey(civ, 800);
  civ.stats.stability += 3;
  assert.equal(structuralWorldKey(civ, 800), banded, 'a raw signal value must not be a structural factor');
  assert.ok(key.length > 0);
});

test('path ambience moved into the identity module and scales with the identity tier', async () => {
  const world = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  assert.ok(!world.includes('function drawPathMotif'), 'path ambience belongs to identity.ts');
  assert.match(world, /drawPathAmbience\(/);
  const identity = await readFile(new URL('../src/render/identity.ts', import.meta.url), 'utf8');
  assert.match(identity, /export function drawPathAmbience/);
  assert.match(identity, /export function drawIdentityLandmarks/);
});

test('the passive phase-transition cue is small, transient and reduced-motion safe', () => {
  const draw = (from, to, time, reduced) => {
    const calls = [];
    drawPhaseTransitionImpact(recordingSurface(calls), from, to, 1000, time, 900, 520, 0x6bdcf6, reduced);
    return calls;
  };
  // A phase change draws a handful of rows plus one ring -- never a full-screen wash.
  const during = draw(1, 2, 1200, false);
  assert.ok(during.length > 0, 'a phase change must be acknowledged');
  const strokes = during.filter(([name]) => name === 'line' || name === 'strokeCircle');
  assert.ok(strokes.length <= 8, `the cue drew ${strokes.length} strokes`);
  assert.equal(during.filter(([name]) => name === 'fillRect').length, 0, 'no full-screen wash');
  // The same guarantee, restated for the gradient primitives: a graded rectangle over the frame is
  // still a wash, and would flatten every layer under the cue for as long as it runs.
  assert.equal(during.filter(([name]) => name === 'fillLinearGradientRect').length, 0, 'no graded full-screen wash either');
  // The cue is allowed exactly one light field, and it must be the horizon's.
  assert.equal(during.filter(([name]) => name === 'fillRadialGlow').length, 1, 'the horizon light field is the cue\'s one glow');
  // Fixed cost: the deepest phase must not buy more strokes than the shallowest.
  const deep = draw(3, 4, 1200, false).filter(([name]) => name === 'line' || name === 'strokeCircle');
  assert.equal(deep.length, strokes.length, 'the cue costs the same at every phase');

  // Transient: nothing after the 1500 ms window, and nothing at all without a real transition.
  assert.equal(draw(1, 2, 2600, false).length, 0, 'the cue must expire');
  assert.equal(draw(2, 2, 1200, false).length, 0, 'an unchanged phase draws nothing');
  assert.equal(draw(-1, -1, 0, false).length, 0, 'no transition has been seen yet');

  // Reduced motion keeps the cue but freezes it: same shape, shorter window.
  assert.ok(draw(1, 2, 1200, true).length > 0);
  assert.equal(draw(1, 2, 1400, true).length, 0, 'reduced motion ends the cue inside 320 ms');
});


test('value noise is deterministic, bounded and smooth between lattice points', () => {
  assert.equal(valueNoise(4.25, 9), valueNoise(4.25, 9));
  assert.notEqual(valueNoise(4.25, 9), valueNoise(4.25, 10));
  for (const x of [0, .5, 1.75, 12.4, 118.9]) {
    const value = ridgeNoise(x, 77);
    assert.ok(value >= 0 && value <= 1, `ridgeNoise left 0..1 at ${x}: ${value}`);
  }
  // Smoothness is the whole point: a ridge built on hash01 alone steps, which is what made the old
  // terrain read as a row of identical triangles.
  let maxStep = 0;
  let previous = valueNoise(0, 5);
  for (let i = 1; i <= 200; i++) {
    const value = valueNoise(i * .05, 5);
    maxStep = Math.max(maxStep, Math.abs(value - previous));
    previous = value;
  }
  assert.ok(maxStep < .12, `value noise jumped by ${maxStep} over a 0.05 step`);
  assert.equal(shade(0xffffff, 1), 0x000000);
  assert.equal(tint(0x000000, 1), 0xffffff);
});

test('the drawing vocabulary carries gradient polygons and open polylines', () => {
  const calls = [];
  const context = {
    set fillStyle(value) { calls.push(['fillStyle', typeof value === 'object' ? 'gradient' : value]); },
    set strokeStyle(value) { calls.push(['strokeStyle', value]); },
    set lineWidth(value) {},
    fillRect: () => calls.push(['fillRect']),
    beginPath: () => calls.push(['beginPath']),
    moveTo: (...args) => calls.push(['moveTo', ...args]),
    lineTo: (...args) => calls.push(['lineTo', ...args]),
    closePath: () => calls.push(['closePath']),
    fill: () => calls.push(['fill']),
    stroke: () => calls.push(['stroke']),
    arc: () => calls.push(['arc']),
    createLinearGradient: (...args) => { calls.push(['createLinearGradient', ...args]); return { addColorStop: (o, c) => calls.push(['addColorStop', o, c]) }; },
  };
  const surface = canvasSurface(context, (value, alpha = 1) => `#${value.toString(16)}@${alpha}`);
  const ridge = [[0, 100], [10, 60], [20, 80], [30, 100]];
  surface.fillLinearGradientPoly(ridge, [{ offset: 0, color: 0x102030 }, { offset: 1, color: 0x405060, alpha: .5 }], 0, 60, 0, 100);
  assert.deepEqual(calls[0], ['createLinearGradient', 0, 60, 0, 100]);
  assert.deepEqual(calls[1], ['addColorStop', 0, '#102030@1']);
  assert.deepEqual(calls[2], ['addColorStop', 1, '#405060@0.5']);
  assert.deepEqual(calls[3], ['fillStyle', 'gradient']);
  assert.deepEqual(calls[4], ['beginPath']);
  assert.deepEqual(calls[5], ['moveTo', 0, 100]);
  assert.equal(calls.filter(([name]) => name === 'lineTo').length, 3);
  assert.deepEqual(calls[calls.length - 2], ['closePath']);
  assert.deepEqual(calls[calls.length - 1], ['fill']);

  // A rim light is one open path, not one stroke per segment.
  calls.length = 0;
  surface.strokePoly(ridge);
  assert.deepEqual(calls.filter(([name]) => name === 'beginPath').length, 1);
  assert.deepEqual(calls[calls.length - 1], ['stroke']);
  assert.equal(calls.filter(([name]) => name === 'closePath').length, 0, 'a rim light must not close its path');

  // Degenerate input draws nothing rather than emitting a broken path.
  calls.length = 0;
  surface.strokePoly([[1, 1]]);
  surface.fillLinearGradientPoly([[1, 1]], [{ offset: 0, color: 0 }], 0, 0, 0, 1);
  assert.equal(calls.length, 0);
});

test('frame pacing keeps 30 FPS as the floor and earns more only from measured cost', () => {
  assert.equal(DYNAMIC_FRAME_MS, 33);
  // Reduced motion wins outright: nothing is moving, so nothing needs repainting quickly.
  assert.equal(dynamicFrameIntervalMs(0, 1, true), REDUCED_MOTION_FRAME_MS);
  assert.equal(dynamicFrameIntervalMs(3, 1, true), REDUCED_MOTION_FRAME_MS);
  // An unmeasured renderer starts at 30 FPS rather than assuming the device can afford more.
  assert.equal(dynamicFrameIntervalMs(0, 0, false), DYNAMIC_FRAME_MS);
  assert.equal(dynamicFrameIntervalMs(0, 2.5, false), DYNAMIC_FRAME_MS_SMOOTH);
  // Below one display interval, or the throttle drops every second frame and 30 FPS is all a device
  // can ever reach however cheap its frames are.
  assert.ok(DYNAMIC_FRAME_MS_SMOOTH < 1000 / 60, `${DYNAMIC_FRAME_MS_SMOOTH} ms cannot exceed 30 FPS on a 60 Hz display`);
  // A frame that costs real time, or any degraded tier, is held to 30 FPS.
  assert.equal(dynamicFrameIntervalMs(0, 12, false), DYNAMIC_FRAME_MS);
  for (const tier of [1, 2, 3]) assert.equal(dynamicFrameIntervalMs(tier, 1, false), DYNAMIC_FRAME_MS);
});

test('quality tiers shed the new lighting cosmetics monotonically and never all of them', () => {
  let previousWindows = Infinity;
  let previousGlow = Infinity;
  for (const tier of [0, 1, 2, 3]) {
    const factors = qualityFactors(tier);
    assert.ok(factors.windowFraction > 0, `tier ${tier} switched the city off`);
    assert.ok(factors.windowFraction <= previousWindows, `tier ${tier} animates more windows than tier ${tier - 1}`);
    assert.ok(factors.glowDetail <= previousGlow, `tier ${tier} draws more glow than tier ${tier - 1}`);
    previousWindows = factors.windowFraction;
    previousGlow = factors.glowDetail;
  }
  assert.equal(qualityFactors(0).windowFraction, 1);
  assert.equal(qualityFactors(0).glowDetail, 1);
  assert.equal(qualityFactors(3).glowDetail, 0, 'the lowest tier keeps the light and drops its falloff');
});

test('outskirts fill the land between settlements deterministically and stay bounded', () => {
  const civ = lateCiv(6101);
  civ.development = 900; civ.era = 4;
  const snapshot = worldSnapshot(civ, 900);
  const settlements = settlementLayout(civ, snapshot.worldWidth, 520, snapshot);
  const first = worldOutskirts(civ, snapshot.worldWidth, snapshot, settlements);
  const second = worldOutskirts(civ, snapshot.worldWidth, snapshot, settlements);
  assert.deepEqual(first, second, 'the same world must produce the same outskirts');
  assert.ok(first.length > 0, 'a four-viewport world must not be empty ground');
  assert.ok(first.length <= MAX_OUTSKIRTS, `outskirts exceeded their budget at ${first.length}`);
  for (const prop of first) {
    assert.ok(prop.x >= 0 && prop.x <= snapshot.worldWidth, `prop left the world at ${prop.x}`);
    assert.ok(['field', 'pylon', 'rocks', 'ruin', 'grove'].includes(prop.kind), `unknown prop ${prop.kind}`);
    assert.ok(prop.scale > 0 && prop.scale <= 1.4);
  }
  // Props reach the far end of the world, which is the emptiness they exist to close.
  const farthest = first.reduce((max, prop) => Math.max(max, prop.x), 0);
  assert.ok(farthest > snapshot.worldWidth * .7, `nothing stands past ${Math.round(farthest)} of ${snapshot.worldWidth}`);
  assert.ok(OUTSKIRT_WIDTH > 0);
  // A different seed lays out a different land.
  const other = worldOutskirts(lateCiv(6102), snapshot.worldWidth, snapshot, settlements);
  assert.notDeepEqual(first, other);
});

test('settlements compose into districts with gaps instead of an evenly spaced row', () => {
  const civ = lateCiv(6201);
  civ.development = 900; civ.era = 4;
  const snapshot = worldSnapshot(civ, 1440);
  const settlements = settlementLayout(civ, snapshot.worldWidth, 800, snapshot);
  const capital = [...settlements].sort((a, b) => b.structures.length - a.structures.length)[0];
  assert.ok(capital.structures.length >= 8, 'the fixture needs a settlement big enough to have districts');

  const xs = capital.structures.map(structure => structure.x).sort((a, b) => a - b);
  const gaps = xs.slice(1).map((x, i) => x - xs[i]);
  const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  const widest = Math.max(...gaps);
  assert.ok(widest > mean * 1.8, `the widest gap ${widest.toFixed(1)} is no bigger than the mean ${mean.toFixed(1)}: the row is still evenly spaced`);

  // Skyline hierarchy: the core is taller than the outskirts, and every district is represented.
  const districts = new Set(capital.structures.map(structure => structure.district));
  assert.ok(districts.has('core'), 'a settlement must have a core');
  const average = list => list.reduce((sum, structure) => sum + structure.height, 0) / Math.max(1, list.length);
  const core = capital.structures.filter(structure => structure.district === 'core');
  const edge = capital.structures.filter(structure => structure.district === 'edge');
  if (edge.length) assert.ok(average(core) > average(edge), 'the core must dominate the skyline');

  // Every structure carries the two fields the lighting and the material depend on.
  for (const structure of capital.structures) {
    assert.ok(structure.lightPhase >= 0 && structure.lightPhase < 1, 'a structure needs its own lighting phase');
    assert.ok(['back', 'mid', 'front'].includes(structure.depthLane));
    assert.ok(Math.abs(structure.x - capital.centerX) <= capital.radius + 1, 'a plot must stay inside its settlement');
  }
  assert.ok(settlements[0].lightPhase >= 0 && settlements[0].lightPhase < 1);
});

test('use decides silhouette: farms lie low, industry keeps its mass, the core builds high', () => {
  const civ = lateCiv(6301);
  civ.development = 900; civ.era = 4;
  const snapshot = worldSnapshot(civ, 1440);
  const structures = settlementLayout(civ, snapshot.worldWidth, 800, snapshot).flatMap(settlement => settlement.structures);
  const tallest = kind => structures.filter(structure => structure.kind === kind).reduce((max, structure) => Math.max(max, structure.height), 0);
  const dwellings = tallest('dwelling');
  assert.ok(dwellings > 0, 'the fixture must contain dwellings');
  if (tallest('farm') > 0) assert.ok(tallest('farm') < dwellings * .8, 'a farm must not compete with the skyline');
  if (tallest('industry') > 0) assert.ok(tallest('industry') < dwellings, 'industry keeps a low heavy mass');
});

test('a portrait viewport keeps its sky: the skyline is budgeted from the aspect ratio', () => {
  const civ = lateCiv(6401);
  civ.development = 900; civ.era = 4;
  // A phone in portrait: 390 x 844. The world is derived from the viewport, so the layout is asked
  // for the same world the renderer would build.
  const portraitSnapshot = worldSnapshot(civ, 390);
  const portrait = settlementLayout(civ, portraitSnapshot.worldWidth, 844, portraitSnapshot);
  const portraitCrown = portrait.flatMap(s => s.structures).reduce((max, structure) => Math.max(max, structure.height), 0);
  assert.ok(portraitCrown <= 844 * .41, `a portrait skyline reached ${Math.round(portraitCrown)} of 844`);

  const desktopSnapshot = worldSnapshot(civ, 1440);
  const desktop = settlementLayout(civ, desktopSnapshot.worldWidth, 800, desktopSnapshot);
  const desktopCrown = desktop.flatMap(s => s.structures).reduce((max, structure) => Math.max(max, structure.height), 0);
  assert.ok(desktopCrown / 800 > portraitCrown / 844, 'a desktop viewport may spend more of its height on skyline');

  // And settlements keep room between them however narrow the world gets, or the whole world becomes
  // one unbroken wall of buildings.
  for (let i = 1; i < portrait.length; i++) {
    const gap = portrait[i].centerX - portrait[i - 1].centerX;
    assert.ok(portrait[i].radius + portrait[i - 1].radius < gap * 1.15, `settlements ${i - 1} and ${i} overlap completely`);
  }
});

test('a consequence is shaped by the settlement it happens to, not by the middle of the screen', () => {
  const calls = [];
  const surface = new Proxy({}, { get: (_t, name) => (...args) => { calls.push([name, ...args]); return surface; } });
  const feedback = { sequence: 5, eventId: 'growth:urban', tone: 'positive', consequence: { significance: 'turning_point', tags: ['urban_growth'], signatureProfile: 'growth' } };
  const draw = anchor => {
    calls.length = 0;
    drawConsequenceImpact(surface, feedback, 100, 200, 900, 520, 0x6fe7e1, false, 0, 3600, anchor);
    return calls.filter(([name]) => name === 'line').map(([, x1, y1]) => ({ x: x1, y: y1 }));
  };

  // Growth rises out of the plots the settlement actually stands on.
  const plots = [{ centerX: 400, radius: 160, structures: [{ x: 330, width: 20, height: 120 }, { x: 470, width: 20, height: 90 }] }];
  const onPlots = draw(plots);
  assert.ok(onPlots.some(point => Math.abs(point.x - 330) < 1), 'growth must stand on a real plot');
  assert.ok(onPlots.some(point => Math.abs(point.x - 470) < 1));

  // With no structures to stand on it still lands on the settlement rather than mid-screen.
  const bare = draw([{ centerX: 400 }]);
  assert.ok(bare.length > 0);
  assert.ok(bare.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
  assert.ok(bare.some(point => Math.abs(point.x - 400) < 200), 'the impact must sit on the settlement');

  // A taller skyline lifts the cue with it.
  const shortSkyline = { centerX: 400, radius: 120, structures: [{ x: 400, width: 20, height: 60 }] };
  const tallSkyline = { centerX: 400, radius: 120, structures: [{ x: 400, width: 20, height: 200 }] };
  const identity = { sequence: 6, eventId: 'identity:shift', tone: 'neutral', consequence: { significance: 'turning_point', tags: ['religious_shift'], signatureProfile: 'identity' } };
  const ringY = anchor => {
    calls.length = 0;
    drawConsequenceImpact(surface, identity, 100, 200, 900, 520, 0x6fe7e1, false, 0, 3600, [anchor]);
    return calls.find(([name]) => name === 'strokeCircle')[2];
  };
  assert.ok(ringY(tallSkyline) < ringY(shortSkyline), 'a taller settlement carries its consequence higher');
});


test('every light a structure emits comes from the world\'s shared light colour', async () => {
  // The rule this pins lives in render/AGENTS.md: window glow, street lamps, road reflections and a
  // settlement's glow in the air all share `colors.lightSpill`, so a chimney's heat and a launch
  // pad's floods must be derived from it too. A hard-coded warm hex here is a building lit by a
  // different night from the street it stands on, and it drifts further with every palette change.
  const emissive = (kind, lightColor) => {
    const calls = [];
    drawStructure(recordingSurface(calls), { id: 'x', x: 200, width: 40, height: 120, kind, level: 4, depthLane: 'mid' },
      400, 0x182b39, 0x6fe7e1, 0xf2cd7b, 7, { lightLevel: .8, lightColor });
    // Every colour the structure emits as light: radial-glow stops plus filled emissive panels.
    const colors = [];
    for (const [name, ...args] of calls) {
      if (name === 'fillRadialGlow') for (const stop of args[4]) colors.push(stop.color);
      if (name === 'fillStyle') colors.push(args[0]);
    }
    return colors;
  };

  for (const kind of ['industry', 'spaceport']) {
    const warm = emissive(kind, 0xffb457);
    const cold = emissive(kind, 0x66ccff);
    assert.ok(warm.length > 0, `${kind} emitted no light at all`);
    assert.equal(warm.length, cold.length, `${kind} changed its geometry with the light colour`);
    assert.notDeepEqual(warm, cold, `${kind} ignores the world's light colour: its emission is hard-coded`);
    // And specifically: no channel of the emission may be a constant the palette cannot move.
    const moved = warm.filter((color, i) => color !== cold[i]).length;
    assert.ok(moved >= 2, `${kind} moved only ${moved} colour(s) with the shared light`);
  }

  // And the wiring, not only the capability: the settlement layer must actually hand the shared
  // light down, or every structure quietly falls back to the window colour.
  const world = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  assert.match(world, /lightColor:\s*colors\.lightSpill/, 'the settlement layer must pass the shared light to drawStructure');

  // Path-identity energy is deliberately *not* the city's light: a reactor core and a temple crown
  // follow the accent, so they stay the dominant path's colour whatever the street lamps do.
  const reactorWarm = emissive('reactor', 0xffb457);
  const reactorCold = emissive('reactor', 0x66ccff);
  assert.deepEqual(reactorWarm, reactorCold, 'a reactor core is identity energy and must follow the accent');
});

test('a consequence clamped into view brings the geometry it belongs to with it', () => {
  const calls = [];
  const surface = new Proxy({}, { get: (_t, name) => (...args) => { calls.push([name, ...args]); return surface; } });
  const WIDTH = 900, HEIGHT = 520;
  const feedback = { sequence: 5, eventId: 'growth:urban', tone: 'positive', consequence: { significance: 'turning_point', tags: ['urban_growth'], signatureProfile: 'growth' } };
  // A settlement well past the right edge of the viewport: the impact clamps on screen so the player
  // still sees it, and the scaffolds standing on that settlement's plots have to travel with it.
  const far = { centerX: 2000, radius: 140, structures: [{ x: 1930, width: 20, height: 160 }, { x: 2070, width: 20, height: 120 }] };
  drawConsequenceImpact(surface, feedback, 100, 200, WIDTH, HEIGHT, 0x6fe7e1, false, 0, 3600, [far]);

  const glow = calls.find(([name]) => name === 'fillRadialGlow');
  assert.ok(glow, 'growth must paint its light field');
  const anchorX = glow[1];
  assert.ok(anchorX >= 0 && anchorX <= WIDTH, `the clamped anchor left the viewport at ${anchorX}`);

  const scaffolds = calls.filter(([name]) => name === 'line').map(([, x1]) => x1);
  assert.ok(scaffolds.length > 0, 'growth must raise scaffolding');
  for (const x of scaffolds) {
    assert.ok(Number.isFinite(x), 'a scaffold got a non-finite position');
    assert.ok(x >= 0 && x <= WIDTH, `a scaffold stayed off screen at ${x} while the anchor was clamped to ${anchorX}`);
  }
  // Still standing on real plots relative to each other -- the clamp translates them, it does not
  // collapse them onto the anchor.
  const spread = Math.max(...scaffolds) - Math.min(...scaffolds);
  assert.ok(spread > 60, `the plots collapsed onto the anchor: spread ${spread}`);
  assert.ok(Math.abs((Math.min(...scaffolds) + Math.max(...scaffolds)) / 2 - anchorX) < 120, 'the scaffolds and the light field parted company');
});
