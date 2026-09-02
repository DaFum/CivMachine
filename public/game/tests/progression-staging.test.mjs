// Progression staging regressions.
//
// `campaign.test.mjs` pins the *curve* -- how many Civilizations a Universe costs, how long a run
// lasts. These pin the *staging*: what becomes available at which moment, what the interface promises
// about it, and what it is allowed to name before the player has been shown it.
//
// Every failure recorded here was found by playing, not by a number moving: a prestige that emptied
// the Breeding Matrix catalog in one step, a currency that banked silently for an hour before the
// game admitted it existed, a preview that promised a requirement the runtime had already moved, and
// a crisis log that reported the Entropy on the clock instead of the threshold that was crossed.
import test from 'node:test';
import assert from 'node:assert/strict';

import { GameEngine } from '../dist/game/engine.js';
import {
  MATRIX_RULES, Progression, SYSTEM_RULES, nextSystemPreviews, systemConditionText, systemRuleMet,
} from '../dist/game/progression.js';
import { advancePressure, ENTROPY_THRESHOLDS } from '../dist/game/pressure.js';
import { milestoneProgress } from '../dist/game/milestones.js';
import { SIMULATION_SPEED_INSIGHT, effectiveMaxSimulationSpeed } from '../dist/game/tactical-actions.js';
import { LOCALIZATION } from '../dist/data/localization.js';
import { activeLocale, setActiveLocale } from '../dist/data/i18n.js';
import { freshEngine } from './balance-harness.mjs';
import { MANUAL_PLAYTHROUGH_SEEDS, STRATEGIES, playRun, runCampaign } from './campaign-harness.mjs';

const withLocale = (locale, body) => {
  const previous = activeLocale();
  setActiveLocale(locale);
  try { return body(); } finally { setActiveLocale(previous); }
};

// A save parked exactly where a rule wants it, without playing to get there. The staging rules read
// only these fields, so setting them is the whole fixture.
function stagedSave({ insight = 0, universes = 0, multiverses = 0, harvests = 0, civilizations = 0 } = {}) {
  const engine = freshEngine();
  const p = engine.state.meta.progression;
  p.machineInsight = insight;
  p.controlledHarvestsTotal = harvests;
  engine.state.meta.universesTotal = universes;
  engine.state.meta.multiversesConsumed = multiverses;
  engine.state.machine.civilizationsTotal = civilizations;
  Progression.refresh(engine.state, []);
  return engine;
}

// ------------------------------------------------------------------ P1: Breeding Matrix staging

test('staging: Breeding Matrices arrive two per Universe, never as a catalog', () => {
  // The condition that produced the bug: Machine Insight is already past every matrix gate -- measured
  // at 17 before the first Universe -- so Insight cannot pace this layer at all.
  const insight = 20;
  assert.ok(insight >= Math.max(...Object.values(MATRIX_RULES).map(rule => rule.insight)),
    'the fixture must clear every insight gate, or it is not testing the Universe gate');

  const known = universes => {
    const engine = stagedSave({ insight, universes });
    return [...engine.state.meta.progression.knownBreedingMatrices];
  };

  assert.deepEqual(known(0), [], 'no Universe consumed: the system is not even unlocked');
  assert.deepEqual(known(1), [], 'the first Universe pays Universe upgrades, not Matrices');
  assert.deepEqual(known(2), ['neural_bloom', 'industrial_genome']);
  assert.deepEqual(known(3), ['neural_bloom', 'industrial_genome', 'adaptive_aberration', 'museum_seed']);
  assert.deepEqual(known(4), Object.keys(MATRIX_RULES), 'the fourth Universe completes the catalog');

  // ...and walked forward on one save rather than sampled, because what must never happen is a step
  // that hands over more than one new decision at a time -- or takes one back.
  const engine = stagedSave({ insight });
  let previous = [];
  const perStep = [];
  for (let universes = 1; universes <= 4; universes++) {
    engine.state.meta.universesTotal = universes;
    Progression.refresh(engine.state, []);
    const now = [...engine.state.meta.progression.knownBreedingMatrices];
    for (const id of previous) assert.ok(now.includes(id), `${id} disappeared at Universe ${universes}`);
    perStep.push(now.length - previous.length);
    previous = now;
  }
  assert.deepEqual(perStep, [0, 2, 2, 2], 'each Universe from the second reveals exactly two Matrices');
});

test('staging: Machine Insight alone can never open the Matrix catalog', () => {
  // The pre-v1.20.1 rule in one assertion: enormous Insight, no Universes, everything unlocked.
  const engine = stagedSave({ insight: 99, universes: 1 });
  assert.equal(engine.state.meta.progression.knownBreedingMatrices.length, 0);
  assert.equal(engine.availableMatrices().length, 0);
});

test('staging: a save that already knows its Matrices never loses one', () => {
  // Migration behaviour, and the reason no `SAVE_VERSION` bump was needed: `refreshKnown` only ever
  // adds. A stored save that legitimately knew all six keeps all six even at Universe 2, where the
  // new rule would only have granted two.
  const engine = stagedSave({ insight: 20, universes: 2 });
  engine.state.meta.progression.knownBreedingMatrices = Object.keys(MATRIX_RULES).slice();
  Progression.refresh(engine.state, []);
  assert.deepEqual(engine.state.meta.progression.knownBreedingMatrices.sort(), Object.keys(MATRIX_RULES).sort());
});

test('staging: the Matrix stagger does not stall the layer it gates', () => {
  // The staging is only acceptable if the Universes it asks for actually arrive. Four Universes is
  // where the catalog completes and four is also what a Multiverse costs, so the last Matrix pair can
  // never sit behind a wall the campaign does not reach anyway.
  const campaign = runCampaign({ seed: 3, strategy: 'balanced', stop: 'universes:4' });
  assert.equal(campaign.universesTotal, 4);
  assert.deepEqual(
    campaign.engine.state.meta.progression.knownBreedingMatrices.sort(),
    Object.keys(MATRIX_RULES).sort(),
    'a campaign that reaches four Universes must own the whole Matrix catalog',
  );
  const atSecond = campaign.universes.find(entry => entry.index === 2);
  assert.ok(atSecond, 'the sweep has to pass through a second Universe');
});

// ------------------------------------------------------------- P2: Existence before its discovery

test('staging: no harvest banks a resource the Machine has not identified', () => {
  const engine = freshEngine();
  // Two ordinary Expansion runs, well before anything reveals Existence.
  for (const seed of [4242, 8181]) playRun(engine, { seed });
  const progression = engine.state.meta.progression;
  assert.equal(progression.discoveredResources.includes('existence'), false,
    'the fixture must stop short of Transcendence, or it proves nothing');

  assert.equal(engine.state.machine.currencies.existence, 0, 'Existence was banked before it was named');
  assert.equal(engine.state.machine.lastHarvest.rewards.existence, 0);
  assert.equal(engine.visibleResources().includes('existence'), false);

  // ...and it is not named anywhere either. The report lists what was banked; the record says what was
  // paid; neither may mention a currency the player has not been shown.
  const report = engine.lastRunReport();
  assert.deepEqual(report.resources.map(entry => entry.key), engine.visibleResources());
  assert.equal(report.resources.some(entry => /Existence/i.test(entry.label)), false);
  assert.equal(engine.messages.some(message => /Existence/i.test(message)), false,
    `the Machine Record named Existence before identifying it: ${engine.messages.join(' | ')}`);

  // The resources it *has* identified are paid in full -- including Paradox, which the first
  // controlled harvest identifies and which therefore has to be paid by the run that reveals it.
  assert.ok(progression.discoveredResources.includes('paradox'));
  assert.ok(engine.state.machine.currencies.paradox > 0, 'the harvest that identifies Paradox must still pay it');
  assert.ok(engine.state.machine.currencies.causal_mass > 0);

  // Full Spectrum is three of four until the fourth resource is real.
  const spectrum = milestoneProgress(engine.state, false).find(entry => entry.id === 'all_resources');
  assert.equal(spectrum.current, 3);
  assert.equal(spectrum.completed, false);
});

test('staging: the run that reaches Transcendence is the run that is paid Existence', () => {
  const engine = freshEngine();
  const civ = engine.startCivilization(31337);
  assert.ok(civ);
  // Carried into Transcendence, which is what identifies Existence.
  engine.state.civilization.years = 7000;
  engine.state.civilization.era = 2;
  engine.state.civilization.development = 420;
  engine.state.civilization.eventChoices = 4;
  engine.tick(0.25);
  assert.ok(Progression.resourceDiscovered(engine.state, 'existence'),
    'carrying a civilization into Transcendence identifies Existence');

  engine.harvest(false);
  assert.ok(engine.state.machine.currencies.existence > 0,
    'the discovery run pays Existence -- the reveal is not retroactive, but it is not empty either');
  assert.equal(engine.state.machine.currencies.existence, engine.state.machine.lastHarvest.rewards.existence,
    'nothing was carried forward from the runs before the discovery');
  const report = engine.lastRunReport();
  assert.ok(report.resources.some(entry => entry.key === 'existence' && entry.amount > 0));
  const spectrum = milestoneProgress(engine.state, false).find(entry => entry.id === 'all_resources');
  assert.equal(spectrum.completed, true, 'Full Spectrum completes at the Transcendence that names the fourth resource');
});

test('staging: removing the hidden bank does not stall the early game', () => {
  // The risk the fix carries: the early game was quietly funded by a currency it could not spend, and
  // taking it away could have starved the opening. It could not -- Existence buys nothing until it is
  // discovered, so nothing that was reachable before became unreachable.
  const engine = freshEngine();
  const first = playRun(engine, { seed: 1234 });
  assert.equal(first.grade === 'premature', false, 'the opening run still clears the anti-cheese floor');
  assert.ok(engine.canPurchaseUpgrade('machine', 'reality_lattice'),
    'a first weak run still affords the first real survival improvement');
  // And the campaign still reaches its first Universe inside the design corridor.
  const campaign = runCampaign({ seed: 1, strategy: 'balanced', stop: 'first_universe' });
  assert.ok(campaign.firstUniverseRun >= 4 && campaign.firstUniverseRun <= 9,
    `first Universe took ${campaign.firstUniverseRun} Civilizations`);
});

// ------------------------------------------------------- P2: what the first Transcendence hands over

test('staging: the first Transcendence is measured, so a future catalog dump is visible', () => {
  // Not a bar on how much may arrive -- the moment is genuinely a big one and the milestone rewards
  // behind it are deliberate. What this pins is that the *shape* of it stays known: if a change ever
  // pours another catalog into this single step, the numbers here move and someone has to look.
  const engine = freshEngine();
  const surface = () => {
    const p = engine.state.meta.progression;
    const entries = new Set();
    for (const id of p.unlockedSystems) entries.add(`system:${id}`);
    for (const id of p.discoveredResources) entries.add(`resource:${id}`);
    for (const id of p.knownDirectives) entries.add(`directive:${id}`);
    for (const id of p.knownBreedingMatrices) entries.add(`matrix:${id}`);
    for (const layer of ['machine', 'universe', 'axiom']) {
      for (const definition of engine.catalog(layer)) {
        if (Progression.canUseUpgrade(engine.state, layer, String(definition.id))) entries.add(`${layer}:${definition.id}`);
      }
    }
    entries.add(`speed:${engine.maxSimulationSpeed()}`);
    return entries;
  };

  let before = null;
  let after = null;
  let insightBefore = 0;
  let insightAfter = 0;
  let affordable = 0;
  for (let index = 0; index < 20 && !after; index++) {
    const snapshot = surface();
    const insight = engine.machineInsight();
    const result = playRun(engine, { seed: (7 * 7919 + index * 104729) >>> 0 || 1, accelerate: true, chase: true });
    if (result.era < 2) {
      // A bare Machine never reaches Transcendence, so the fixture has to play like a player: spend
      // the harvest before starting the next run.
      for (let guard = 0; guard < 200; guard++) {
        const id = engine.catalog('machine').map(d => String(d.id))
          .filter(candidate => engine.canPurchaseUpgrade('machine', candidate))
          .sort((a, b) => engine.upgradeCost('machine', a) - engine.upgradeCost('machine', b))[0];
        if (!id || !engine.purchaseUpgrade('machine', id)) break;
      }
    } else {
      before = snapshot;
      after = surface();
      insightBefore = insight;
      insightAfter = engine.machineInsight();
      // Every new Machine level the harvest just paid for could buy in one go.
      for (let guard = 0; guard < 200; guard++) {
        const id = engine.catalog('machine').map(d => String(d.id))
          .filter(candidate => engine.canPurchaseUpgrade('machine', candidate))
          .sort((a, b) => engine.upgradeCost('machine', a) - engine.upgradeCost('machine', b))[0];
        if (!id || !engine.purchaseUpgrade('machine', id)) break;
        affordable++;
      }
    }
  }
  assert.ok(after, 'the fixture never reached Transcendence');

  const added = [...after].filter(entry => !before.has(entry));
  const resources = added.filter(entry => entry.startsWith('resource:'));
  const machine = added.filter(entry => entry.startsWith('machine:'));
  const speeds = added.filter(entry => entry.startsWith('speed:'));

  assert.deepEqual(resources, ['resource:existence'], 'Transcendence names exactly one new resource');
  assert.ok(added.length <= 6, `the first Transcendence opened ${added.length} things at once: ${added.join(', ')}`);
  assert.ok(machine.length <= 2, `it opened ${machine.length} Machine modules: ${machine.join(', ')}`);
  assert.ok(speeds.length <= 1, 'at most one simulation-speed step may arrive with it');
  assert.ok(insightAfter - insightBefore <= 8,
    `Machine Insight jumped ${insightAfter - insightBefore} in one step`);
  // The purchasing burst the reveal funds. Before the hidden bank was removed this was nine levels,
  // seven of them Existence modules bought with three runs of income the player had never seen.
  assert.ok(affordable <= 7, `the Transcendence harvest funded ${affordable} Machine levels at once`);

  // And the whole thing is announced rather than appearing silently.
  const announced = engine.state.meta.progression.announcedUnlocks;
  assert.ok(announced.includes('resource:existence'));
});

// ------------------------------------------------- P2: the preview cannot promise a moved requirement

test('staging: every Next Discovery states the requirement the runtime actually checks', () => {
  // One source of truth, proved by construction rather than by comparing two strings: for each system,
  // a save parked one short of each requirement must not have it, and a save meeting every requirement
  // must. If the preview and the rule could disagree, this would need two tables to check.
  const fieldFor = {
    insight: 'insight', universes: 'universes', multiverses: 'multiverses',
    controlledHarvests: 'harvests', civilizations: 'civilizations',
  };
  for (const [id, rule] of Object.entries(SYSTEM_RULES)) {
    const met = {};
    for (const req of [...(rule.all ?? []), ...(rule.any ?? [])]) met[fieldFor[req.kind]] = req.amount;
    const satisfied = stagedSave(met);
    assert.ok(Progression.systemUnlocked(satisfied.state, id), `${id} did not unlock on its own stated requirements`);

    for (const req of rule.all ?? []) {
      const short = { ...met, [fieldFor[req.kind]]: req.amount - 1 };
      assert.equal(systemRuleMet(stagedSave(short).state, rule), false,
        `${id} unlocked one short of ${req.kind} ${req.amount}`);
    }
    // An `any` group is an alternative route: dropping the whole group must close the system, and each
    // single member on its own must open it.
    if (rule.any?.length) {
      const none = { ...met };
      for (const req of rule.any) none[fieldFor[req.kind]] = req.amount - 1;
      assert.equal(systemRuleMet(stagedSave(none).state, rule), false, `${id} unlocked with no route met`);
      for (const req of rule.any) {
        const only = { ...none, [fieldFor[req.kind]]: req.amount };
        assert.ok(systemRuleMet(stagedSave(only).state, rule), `${id} ignored its ${req.kind} route`);
      }
    }
  }
});

test('staging: a moved requirement moves the sentence with it', () => {
  // The specific pair that was wrong, and the mechanism that made it possible. The condition is
  // composed from the rule, so it cannot be edited independently of it -- the numbers below are read
  // out of `SYSTEM_RULES`, not typed here.
  const engine = stagedSave({ insight: 9, harvests: 5, civilizations: 5 });
  const previews = nextSystemPreviews(engine.state);
  const matrices = previews.find(entry => entry.id === 'breeding_matrices')
    ?? { condition: systemConditionText(SYSTEM_RULES.breeding_matrices) };
  assert.match(matrices.condition, /consume 2 Universes/i,
    `the Matrix preview must state the two Universes the runtime asks for: ${matrices.condition}`);
  assert.equal(/first Universe/i.test(matrices.condition), false,
    'the pre-v1.20.1 sentence promised the first Universe while the rule asked for the second');
  assert.match(systemConditionText(SYSTEM_RULES.multiverse_prestige), /consume 3 Universes/i);

  // Both locales compose from the same rule, so neither can drift from it or from the other.
  withLocale('de', () => {
    assert.match(systemConditionText(SYSTEM_RULES.breeding_matrices), /2 Universes verbrauchen/);
    assert.match(systemConditionText(SYSTEM_RULES.multiverse_prestige), /3 Universes verbrauchen/);
  });

  // The alternative route reads as one, rather than as two separate demands.
  const prestige = systemConditionText(SYSTEM_RULES.universe_prestige);
  assert.match(prestige, / or /, `an either/or requirement must read as one: ${prestige}`);

  // No condition may be a leftover id or an empty promise.
  for (const rule of Object.values(SYSTEM_RULES)) {
    const condition = systemConditionText(rule);
    assert.ok(condition.trim().length > 0);
    assert.equal(/_/.test(condition), false, `an id reached a preview: ${condition}`);
  }
});

// ------------------------------------------------------------------- P2: Entropy threshold logging

test('staging: a crossed Entropy threshold is logged as the threshold, not as the clock', () => {
  for (const threshold of ENTROPY_THRESHOLDS) {
    const engine = freshEngine();
    // 4x on a long-lived run is what makes a single tick step several Entropy at once, which is the
    // condition that produced 27 and 29 for the 25 crisis and 51 and 54 for the 50 -- a small tick
    // would land inside the same integer as the threshold and prove nothing either way.
    engine.state.meta.progression.machineInsight = SIMULATION_SPEED_INSIGHT.quadruple;
    engine.startCivilization(900 + threshold);
    engine.setSimulationSpeed(4);
    const civ = engine.state.civilization;
    civ.tactical.entropy = threshold - 0.1;
    // The lower thresholds are behind this run already, so the tick crosses exactly the one under
    // test. Crossing several at once is covered by the test below, which asserts all of them appear.
    civ.tactical.triggeredCrises = ENTROPY_THRESHOLDS.filter(entry => entry < threshold);
    civ.years = 40000;
    civ.pendingEvent = '';
    engine.tick(0.25);

    const overshoot = Math.trunc(civ.tactical.entropy);
    assert.ok(overshoot > threshold,
      `the fixture must overshoot into the next whole number to reproduce the bug, got ${civ.tactical.entropy}`);

    const logged = engine.messages.filter(message => /ENTROPY THRESHOLD/i.test(message));
    assert.equal(logged.length, 1, `expected one threshold line, got ${logged.length}: ${logged.join(' | ')}`);
    assert.match(logged[0], new RegExp(`\\b${threshold}\\b`),
      `the record reported the Entropy on the clock rather than the threshold ${threshold}: ${logged[0]}`);
    assert.equal(new RegExp(`\\b${overshoot}\\b`).test(logged[0]), false,
      `the record still names the overshoot ${overshoot} instead of the threshold ${threshold}: ${logged[0]}`);
  }
});

test('staging: each threshold is reported once per run, and every crossing is reported', () => {
  const engine = freshEngine();
  engine.startCivilization(4711);
  const civ = engine.state.civilization;
  civ.years = 40000;

  // One tick that leaps from 0 past two thresholds at once: both crises queue, and both are reported.
  civ.tactical.entropy = 24.9;
  const jumped = advancePressure({ ...civ, tactical: { ...civ.tactical, entropy: 24.9, triggeredCrises: [] } },
    { containmentRating: 0 }, 400);
  assert.deepEqual(jumped.crises.map(entry => entry.threshold), [25, 50, 75]);
  assert.deepEqual(jumped.queuedCrises, ['entropy_crisis_25', 'entropy_crisis_50', 'entropy_crisis_75']);

  // Through the engine: every threshold reported exactly once across a whole run.
  for (let step = 0; step < 400 && engine.state.phase === 'civilization'; step++) {
    civ.pendingEvent = '';
    engine.tick(0.25);
  }
  for (const threshold of ENTROPY_THRESHOLDS) {
    if (civ.tactical.entropy < threshold) continue;
    const lines = engine.messages.filter(message => /ENTROPY THRESHOLD/i.test(message) && new RegExp(`\\b${threshold}\\b`).test(message));
    assert.equal(lines.length, 1, `threshold ${threshold} was reported ${lines.length} times`);
  }
});

// --------------------------------------------------------------- P2/P3: simulation speed as a step

test('staging: each simulation speed is a permanent capability, announced once', () => {
  const engine = freshEngine();
  const announcements = [];

  engine.state.meta.progression.machineInsight = SIMULATION_SPEED_INSIGHT.double - 1;
  Progression.refresh(engine.state, announcements);
  assert.equal(engine.maxSimulationSpeed(), 1);
  assert.equal(announcements.length, 0);

  engine.state.meta.progression.machineInsight = SIMULATION_SPEED_INSIGHT.double;
  Progression.refresh(engine.state, announcements);
  assert.equal(engine.maxSimulationSpeed(), 2);
  const doubled = announcements.filter(message => /PERMANENT CAPABILITY/.test(message));
  assert.equal(doubled.length, 1, `expected one 2x announcement: ${announcements.join(' | ')}`);
  assert.match(doubled[0], /2×/);
  assert.match(doubled[0], /survives prestige/i, 'the announcement has to say the capability is permanent');

  // Refreshing again -- which happens on every milestone, harvest and tick -- may not repeat it.
  const repeat = [];
  Progression.refresh(engine.state, repeat);
  Progression.refresh(engine.state, repeat);
  assert.deepEqual(repeat, []);

  engine.state.meta.progression.machineInsight = SIMULATION_SPEED_INSIGHT.quadruple;
  const quad = [];
  Progression.refresh(engine.state, quad);
  assert.equal(engine.maxSimulationSpeed(), 4);
  assert.equal(quad.filter(message => /PERMANENT CAPABILITY/.test(message)).length, 1);
  assert.match(quad.find(message => /PERMANENT CAPABILITY/.test(message)), /4×/);

  // The rail draws every step from the first run, locked ones priced in the Insight they cost.
  const fresh = freshEngine();
  assert.deepEqual(fresh.simulationSpeedOptions(), [
    { speed: 1, unlocked: true, insight: 0 },
    { speed: 2, unlocked: false, insight: SIMULATION_SPEED_INSIGHT.double },
    { speed: 4, unlocked: false, insight: SIMULATION_SPEED_INSIGHT.quadruple },
  ]);
});

test('staging: a grandfathered speed is kept and is not announced as news', () => {
  // A v4 save that bought 4x from Temporal Injector owns the speed without the Insight. It keeps it,
  // and the migration records the capability as already known so the player is not told about
  // something they have been using for a version.
  const engine = freshEngine();
  const p = engine.state.meta.progression;
  p.machineInsight = 0;
  p.simulationSpeedUnlocked = 4;
  p.announcedUnlocks.push('capability:simulation_speed_2', 'capability:simulation_speed_4');
  const out = [];
  Progression.refresh(engine.state, out);
  assert.equal(engine.maxSimulationSpeed(), 4, 'the grandfathered floor never decreases');
  assert.equal(out.filter(message => /PERMANENT CAPABILITY/.test(message)).length, 0);

  assert.equal(effectiveMaxSimulationSpeed(0, 4), 4);
  assert.equal(effectiveMaxSimulationSpeed(SIMULATION_SPEED_INSIGHT.quadruple, 1), 4);
  assert.equal(effectiveMaxSimulationSpeed(0, 1), 1);
});

// ------------------------------------------------------------------- P2: what the report says it is

test('staging: the report names its two clocks and never calls simulated time elapsed', () => {
  const engine = freshEngine();
  engine.state.meta.progression.machineInsight = SIMULATION_SPEED_INSIGHT.quadruple;
  engine.startCivilization(2468);
  engine.setSimulationSpeed(4);
  for (let step = 0; step < 40; step++) {
    engine.state.civilization.pendingEvent = '';
    engine.tick(0.25);
  }
  const civ = engine.state.civilization;
  assert.ok(civ.elapsedSeconds > civ.realSeconds * 3.5,
    `at 4x, simulation time must outrun wall-clock: ${civ.elapsedSeconds} vs ${civ.realSeconds}`);
  engine.harvest(false);

  const report = engine.lastRunReport();
  assert.ok(report.realSeconds > 0, 'the report carries the wall-clock it measured');
  assert.ok(report.elapsedSeconds > report.realSeconds, 'the two clocks are not the same number');

  // The label is the point: LASTED read as wall-clock and was not.
  for (const locale of ['en', 'de']) {
    const copy = LOCALIZATION[locale].ui.reportView;
    assert.equal('lasted' in copy, false, 'the ambiguous label must be gone from both locales');
    assert.ok(copy.simulationTime.trim().length > 0);
    assert.ok(copy.activeRealTime.trim().length > 0);
  }
  assert.equal(LOCALIZATION.en.ui.reportView.simulationTime, 'SIMULATION TIME');
  assert.equal(LOCALIZATION.de.ui.reportView.simulationTime, 'SIMULATIONSZEIT');
});

test('staging: a paused intervention advances neither clock', () => {
  const engine = freshEngine();
  engine.startCivilization(1357);
  const civ = engine.state.civilization;
  while (!civ.pendingEvent && civ.elapsedSeconds < 60) engine.tick(0.25);
  assert.ok(civ.pendingEvent, 'the fixture needs an open intervention');
  const elapsed = civ.elapsedSeconds;
  const real = civ.realSeconds;
  engine.tick(0.25);
  engine.tick(0.25);
  assert.equal(civ.elapsedSeconds, elapsed);
  assert.equal(civ.realSeconds, real, 'a run waiting on the player is not running');
});

// ------------------------------------------------------------------ P2: the Directive reward, exact

test('staging: an unmet Directive objective is explained with the rewards it actually pays', () => {
  const engine = freshEngine();
  const lessonFor = seed => {
    const local = freshEngine();
    local.state.meta.progression.machineInsight = 6;
    local.state.meta.progression.controlledHarvestsTotal = 2;
    Progression.refresh(local.state, []);
    local.prepareNextRunForTest?.();
    const offers = local.state.machine.runBuild.directiveOfferIds;
    if (offers.length) local.selectDirective(offers[0]);
    local.startCivilization(seed);
    local.state.civilization.years = 6000;
    local.state.civilization.era = 1;
    local.state.civilization.development = 300;
    local.state.civilization.eventChoices = 5;
    local.harvest(false);
    return local.lastRunReport();
  };
  // A low-credit run and a high-credit run: the old sentence scaled an invented "about N credits" with
  // the harvest, so the two disagreed about a reward that is a flat +1.
  for (const seed of [321, 654]) {
    const report = lessonFor(seed);
    if (!report.objectiveTitle || report.objectiveCompleted) continue;
    const lesson = report.lessons.find(entry => entry.includes(report.objectiveTitle));
    assert.ok(lesson, `no lesson explained the unmet objective: ${report.lessons.join(' | ')}`);
    assert.match(lesson, /\+15% harvest resources/);
    assert.match(lesson, /exactly \+1 Cultivation Credit/);
    assert.equal(/about \d+ credit/i.test(lesson), false, 'the estimated credit equivalence must be gone');
  }
  for (const locale of ['en', 'de']) {
    const copy = LOCALIZATION[locale].reports.runReport.lessons;
    assert.equal('directiveOneCredit' in copy, false);
    assert.equal('directiveManyCredits' in copy, false);
    assert.ok(copy.directiveNotMet.includes('15'), 'both locales state the same multiplier');
    assert.ok(/\+1/.test(copy.directiveNotMet), 'both locales state the same flat credit');
  }
});

// ------------------------------------------------------------------------- P3: milestone semantics

test('staging: an ordinal milestone names its state, a tally still counts', () => {
  const engine = freshEngine();
  engine.state.meta.progression.maxEra = 2;
  engine.state.meta.progression.bestGrade = 'transcendent';
  engine.state.meta.progression.controlledHarvestsTotal = 3;
  engine.state.meta.progression.seenDominantPaths = ['a', 'b', 'c', 'd'];
  const entries = milestoneProgress(engine.state, false);
  const byId = id => entries.find(entry => entry.id === id);

  // An era milestone says where the save is and where it is going, not "2 of 3".
  const era = byId('era_apotheosis');
  assert.equal(era.display, 'era');
  assert.equal(era.currentLabel, 'TRANSCENDENCE');
  assert.equal(era.targetLabel, 'APOTHEOSIS');
  assert.equal(era.currentTerm, 'CURRENT');
  assert.equal(era.targetTerm, 'TARGET');

  // A grade milestone reports the best grade recorded, not a fraction of a task.
  const grade = byId('harvest_ascendant');
  assert.equal(grade.display, 'grade');
  assert.equal(grade.currentLabel, 'TRANSCENDENT');
  assert.equal(grade.targetLabel, 'ASCENDANT');
  assert.equal(grade.currentTerm, 'BEST');

  // A save that has never harvested says so rather than naming the bottom grade.
  const fresh = milestoneProgress(freshEngine().state, false).find(entry => entry.id === 'harvest_transcendent');
  assert.equal(fresh.currentLabel, LOCALIZATION.en.ui.app.milestoneNoGradeYet);

  // Real tallies are untouched: they are counts and they still print as counts.
  for (const id of ['controlled_harvest_10', 'paths_seen_6', 'development_340', 'all_resources']) {
    const entry = byId(id);
    assert.equal(entry.display, 'count', `${id} is a tally, not an ordinal`);
    assert.equal(entry.currentLabel, '');
  }
  assert.equal(byId('controlled_harvest_10').current, 3);
  assert.equal(byId('controlled_harvest_10').target, 10);
  assert.equal(byId('paths_seen_6').current, 4);

  // The rewards themselves are unchanged -- this is presentation only.
  assert.equal(byId('era_apotheosis').insight, 2);
  assert.equal(byId('harvest_singular').insight, 4);

  withLocale('de', () => {
    const german = milestoneProgress(engine.state, false).find(entry => entry.id === 'era_apotheosis');
    assert.equal(german.currentTerm, 'AKTUELL');
    assert.equal(german.targetTerm, 'ZIEL');
  });
});

// ---------------------------------------------------------------- P3: run phase versus era, by name

test('staging: the narrative phase cannot be mistaken for the Era', () => {
  // One report used to carry "Expansion phase" and "Entered EXPANSION" about two unrelated systems.
  const eraNames = Object.values(LOCALIZATION.en.content.eras).map(entry => entry.name.toLowerCase());
  for (const locale of ['en', 'de']) {
    const phases = Object.values(LOCALIZATION[locale].reports.runReport.dramaPhases).map(value => value.toLowerCase());
    for (const phase of phases) {
      assert.equal(eraNames.includes(phase), false, `${locale}: the run phase "${phase}" is also an Era name`);
    }
    // ...and the figure that prints it says which axis it is.
    assert.match(LOCALIZATION[locale].ui.reportView.phase, /\{phase\}/);
  }
  assert.equal(LOCALIZATION.en.reports.runReport.dramaPhases.expansion, 'Growth');
  // The id is structure and did not move with the label.
  assert.ok('expansion' in LOCALIZATION.de.reports.runReport.dramaPhases);
});

// -------------------------------------------------------------------- P3: the aggressive human line

test('campaign: the aggressive Accelerate-and-Directive line is a real strategy, not a trap', () => {
  assert.ok(STRATEGIES.aggressive_human, 'the policy has to exist to be measured');
  assert.ok(STRATEGIES.aggressive_accelerate, 'and it must not have replaced the one beside it');
  assert.equal(STRATEGIES.aggressive_human.accelerate, true);
  assert.equal(STRATEGIES.aggressive_human.chase, true);

  // Played on the worlds the manual v1.20 playthrough actually saw. Not a replay of it: the choice
  // sequence was never recorded, so the policy decides every intervention itself.
  const runs = MANUAL_PLAYTHROUGH_SEEDS.map(seed => {
    const engine = freshEngine();
    return playRun(engine, { seed, accelerate: true, chase: true });
  });
  for (const run of runs) {
    assert.equal(run.chaotic, false, 'the aggressive line still harvests deliberately rather than collapsing');
    assert.ok(run.elapsed > 0);
  }
  assert.ok(runs.filter(run => run.grade !== 'premature').length >= 4,
    `${runs.filter(run => run.grade === 'premature').length} of 5 opening runs were premature`);

  // And across a campaign it reaches the first Universe without being either dominant or a dead end.
  const sweep = [1, 14, 27, 40].map(seed => runCampaign({ seed, strategy: 'aggressive_human', stop: 'first_universe' }));
  for (const campaign of sweep) {
    assert.equal(campaign.universesTotal, 1);
    assert.ok(campaign.firstUniverseRun >= 4,
      `the aggressive line rushed the first Universe in ${campaign.firstUniverseRun} Civilizations`);
    assert.ok(campaign.firstUniverseRun <= 14,
      `the aggressive line stalled at ${campaign.firstUniverseRun} Civilizations`);
  }
});

// ------------------------------------------------------------------------- EN/DE staging copy sync

test('staging: every new staging surface is populated in both locales', () => {
  for (const locale of ['en', 'de']) {
    const progression = LOCALIZATION[locale].reports.progression;
    // Composed conditions replaced the hand-written ones, so no system may carry a stale sentence.
    for (const [id, entry] of Object.entries(progression.systems)) {
      assert.equal('condition' in entry, false, `${locale}.${id} still carries a hand-written condition`);
      assert.ok(entry.name.trim().length > 0);
    }
    for (const kind of ['insight', 'universes', 'multiverses', 'controlledHarvests', 'civilizations']) {
      const clause = progression.requirementClauses[kind];
      assert.match(clause.one, /\{amount\}/, `${locale}.${kind}.one must state the amount`);
      assert.match(clause.many, /\{amount\}/, `${locale}.${kind}.many must state the amount`);
    }
    assert.match(progression.newCapabilityUnlocked, /\{name\}/);
    assert.match(progression.newCapabilityUnlocked, /\{note\}/);
    assert.match(progression.capabilities.simulationSpeed, /\{speed\}/);
    assert.ok(progression.capabilityNotes.simulationSpeed.trim().length > 0);
    const app = LOCALIZATION[locale].ui.app;
    for (const key of ['milestoneCurrent', 'milestoneBest', 'milestoneTarget', 'milestoneNoGradeYet']) {
      assert.ok(app[key].trim().length > 0, `${locale}.ui.app.${key} is empty`);
    }
    assert.match(app.simulationSpeedLocked, /\{insight\}/);
    assert.match(LOCALIZATION[locale].reports.engine.yield, /\{entries\}/);
    assert.match(LOCALIZATION[locale].reports.engine.yieldEntry, /\{name\}/);
  }
  // English and German say the same thing about the same numbers.
  assert.notEqual(LOCALIZATION.en.reports.progression.requirementClauses.universes.many,
    LOCALIZATION.de.reports.progression.requirementClauses.universes.many);
});

// -------------------------------------------------------------- the Civilization Record, verified

test('staging: the Civilization Record never prints the same line twice in a row', () => {
  // Reproduced before it was fixed: 103 of the catalog's 310 `path_history` entries are authored as
  // "<title> -> <label>", which is word for word what the automatic choice line already writes, so a
  // third of the interventions carrying path copy logged their sentence twice. The engine drops the
  // path line where it duplicates, which is why this holds without editing 103 content entries -- and
  // in both locales, because both sentences are composed from the same localized title and label.
  for (const locale of ['en', 'de']) {
    withLocale(locale, () => {
      const seen = [];
      for (const seed of [1357, 24680, 909, 5150]) {
        const engine = freshEngine();
        engine.startCivilization(seed);
        const civ = engine.state.civilization;
        for (let guard = 0; guard < 4000 && engine.state.phase === 'civilization'; guard++) {
          if (engine.currentEvent()) { engine.chooseEvent(0); continue; }
          if (civ.elapsedSeconds > 400) break;
          engine.tick(0.25);
        }
        seen.push(...civ.history);
        const adjacent = civ.history.filter((line, index) => index > 0 && line === civ.history[index - 1]);
        assert.deepEqual(adjacent, [], `${locale} seed ${seed} logged a line twice in a row: ${adjacent.join(' | ')}`);
        // And nothing empty, unfilled or spelled out from an id reached the record either.
        for (const line of civ.history) {
          assert.ok(line.trim().length > 0, `${locale} seed ${seed} logged an empty record entry`);
          assert.equal(/undefined|NaN|\{[A-Za-z]/.test(line), false, `${locale} unrendered record entry: ${line}`);
        }
      }
      assert.ok(seen.length > 12, 'the fixture has to actually fill a record');
    });
  }
});

test('staging: an intervention whose path copy says something new still says it', () => {
  // The fix drops a duplicate, never a distinct line: a `path_history` that carries real narrative is
  // still recorded beside the choice line.
  const engine = freshEngine();
  engine.startCivilization(1357);
  const civ = engine.state.civilization;
  for (let guard = 0; guard < 4000 && engine.state.phase === 'civilization'; guard++) {
    if (engine.currentEvent()) { engine.chooseEvent(0); continue; }
    if (civ.elapsedSeconds > 400) break;
    engine.tick(0.25);
  }
  const choiceLines = civ.history.filter(line => / -> /.test(line));
  const pathLines = civ.history.filter(line => !/ -> /.test(line) && /:/.test(line));
  assert.ok(choiceLines.length > 0, 'the run resolved interventions');
  assert.ok(pathLines.length > 0, 'distinct path copy is still written to the record');
});
