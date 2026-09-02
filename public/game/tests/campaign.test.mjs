// Campaign-level balance regressions.
//
// `core.test.mjs` pins one run at a time. These pin the meta-economy above it -- the loop the v1.20.0
// rebalance was written for -- because every failure that rebalance fixed was invisible one run at a
// time. A fresh save reaching its first Universe in three runs is not a bad run; it is a bad economy,
// and only a campaign shows it.
//
// Everything here is a *range*, not a value. Balance is allowed to move; what is not allowed is for
// it to leave the band the design asks for. When one of these fails, the fix is usually a constant in
// `harvest-quality.ts`, `upgrade-balance.ts` or `pressure.ts` -- not a wider band.
//
// Seeds are deterministic and the default set is sized for CI. `npm run balance:full` sweeps wider.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEPTH_BANDS, DEPTH_CREDIT_CAP, DEPTH_CREDIT_RATE, depthForCredit, evaluateHarvestQuality,
} from '../dist/game/harvest-quality.js';
import { GameEngine } from '../dist/game/engine.js';
import { Progression } from '../dist/game/progression.js';
import {
  MACHINE_POLICIES, STRATEGIES, freshCampaignEngine, maximumPurchasableMachineLevels,
  percentile, playRun, runCampaign,
} from './campaign-harness.mjs';

const UNIVERSE_CREDIT_REQUIREMENT = 18;

const seeds = (count, step = 13) => Array.from({ length: count }, (_, index) => 1 + index * step);

// One campaign is a few hundred milliseconds, and half these tests want the same campaigns, so the
// sweeps are computed once and shared.
const cache = new Map();
function campaigns(strategy, stop, count) {
  const key = `${strategy}|${stop}|${count}`;
  if (!cache.has(key)) cache.set(key, seeds(count).map(seed => runCampaign({ seed, strategy, stop })));
  return cache.get(key);
}

const PURCHASE_POLICIES = Object.keys(MACHINE_POLICIES);
const REPRESENTATIVE = ['balanced', 'survival_first', 'yield_first', 'utility_first'];

// ---------------------------------------------------------------- first-run economy

test('campaign: the first run is short, dangerous, and funds one real purchase', () => {
  const runs = seeds(80, 97).map(seed => {
    const engine = freshCampaignEngine();
    const result = playRun(engine, { seed });
    return { ...result, affordable: maximumPurchasableMachineLevels(engine), engine };
  });

  const durations = runs.map(run => run.elapsed);
  assert.ok(percentile(durations, 0.5) < 240, `first runs must stay under four minutes, median ${percentile(durations, 0.5)}s`);
  assert.ok(percentile(durations, 0.9) < 420, `first-run p90 ${percentile(durations, 0.9)}s`);

  // The design promise the Reality Lattice ladder exists to keep: a first weak run affords the first
  // real survival improvement.
  const fundedLattice = runs.filter(run => run.engine.canPurchaseUpgrade('machine', 'reality_lattice')).length;
  assert.ok(fundedLattice >= runs.length * 0.9, `only ${fundedLattice}/${runs.length} first runs could buy Reality Lattice`);

  // ...and no more than that. A first run that could buy four levels is the v1.19 power cliff.
  const affordable = runs.map(run => run.affordable);
  assert.ok(percentile(affordable, 0.5) <= 3, `first-run purchase power median ${percentile(affordable, 0.5)}`);
  assert.ok(percentile(affordable, 0.9) <= 4, `first-run purchase power p90 ${percentile(affordable, 0.9)}`);
});

test('campaign: no early run buys more than two Reality Lattice levels at once', () => {
  const all = PURCHASE_POLICIES.flatMap(strategy => campaigns(strategy, 'first_universe', 8));
  const latticeSteps = all.flatMap(campaign => campaign.runs.map(run => run.latticeGained));
  const worst = Math.max(...latticeSteps);
  assert.ok(worst <= 2, `one run bought ${worst} Reality Lattice levels`);

  // Containment is the compounding stat: it lengthens the run, and a longer run buys more of
  // everything. One point per run, give or take, is what keeps the curve a climb instead of a cliff.
  const gains = all.flatMap(campaign => campaign.runs.map(run => run.containmentGained));
  assert.ok(percentile(gains, 0.5) <= 2, `Containment gained per run median ${percentile(gains, 0.5)}`);
  assert.ok(percentile(gains, 0.9) <= 4, `Containment gained per run p90 ${percentile(gains, 0.9)}`);
});

// ---------------------------------------------------------------- run depth progression

test('campaign: no-upgrade, early, mid and mature builds occupy different run bands', () => {
  const tiers = [
    ['bare', {}],
    ['early', { reality_lattice: 1, awareness_scrubber: 1 }],
    ['mid', { reality_lattice: 2, awareness_scrubber: 2, sanity_protocol: 1, cultivation_accelerator: 2 }],
    ['mature', { reality_lattice: 4, awareness_scrubber: 3, sanity_protocol: 3, cosmic_muffling: 2, cultivation_accelerator: 4 }],
  ];
  const measured = tiers.map(([name, levels]) => {
    const results = seeds(10, 211).map(seed => {
      const engine = freshCampaignEngine();
      engine.state.meta.progression.machineInsight = 30;
      Object.assign(engine.state.machine.upgradeLevels, levels);
      return playRun(engine, { seed });
    });
    return {
      name,
      seconds: percentile(results.map(run => run.elapsed), 0.5),
      depth: percentile(results.map(run => run.depth), 0.5),
      credits: percentile(results.map(run => run.credits), 0.5),
    };
  });

  for (let index = 1; index < measured.length; index++) {
    assert.ok(measured[index].seconds > measured[index - 1].seconds,
      `${measured[index].name} runs (${measured[index].seconds}s) must outlast ${measured[index - 1].name} (${measured[index - 1].seconds}s)`);
    assert.ok(measured[index].depth >= measured[index - 1].depth,
      `${measured[index].name} depth ${measured[index].depth} must not regress`);
  }

  // The lifecycle the design asks for: a couple of minutes when the Machine is bare, and a deep run
  // in the twelve-to-fifteen-minute band once it is not.
  const bare = measured[0];
  const mature = measured[3];
  assert.ok(bare.seconds >= 60 && bare.seconds <= 240, `bare run median ${bare.seconds}s`);
  assert.ok(mature.seconds >= 420, `mature run median ${mature.seconds}s is not a deep run`);
  assert.ok(mature.seconds <= 1200, `mature run median ${mature.seconds}s runs past the design horizon`);
  assert.ok(mature.credits > bare.credits, 'a mature run must bank more than a bare one');
});

// ---------------------------------------------------------------- prestige cadence

test('campaign: the first Universe takes several successful civilizations', () => {
  for (const strategy of REPRESENTATIVE) {
    const runs = campaigns(strategy, 'first_universe', 10).map(campaign => campaign.firstUniverseRun);
    const median = percentile(runs, 0.5);
    const p90 = percentile(runs, 0.9);
    assert.ok(median >= 4 && median <= 8, `${strategy}: first Universe at ${median} runs`);
    assert.ok(p90 <= 12, `${strategy}: first-Universe p90 ${p90} runs is a grind`);
    assert.ok(Math.min(...runs) >= 3, `${strategy}: a Universe fell out in ${Math.min(...runs)} runs`);
  }
});

test('campaign: a single run can never fund a Universe, at any depth', () => {
  // The arithmetic guarantee, independent of any simulation: the credit cap sits below the Universe
  // requirement even with a completed Directive objective's bonus credit on top.
  assert.ok(DEPTH_CREDIT_CAP + 1 < UNIVERSE_CREDIT_REQUIREMENT);

  const all = PURCHASE_POLICIES.flatMap(strategy => campaigns(strategy, 'first_universe', 8));
  const worst = Math.max(...all.flatMap(campaign => campaign.runs.map(run => run.credits)));
  assert.ok(worst <= DEPTH_CREDIT_CAP + 1, `one run banked ${worst} credits`);
});

test('campaign: later Universes arrive faster than the first', () => {
  for (const strategy of ['balanced', 'survival_first']) {
    const sweep = campaigns(strategy, 'universes:4', 6);
    const at = index => percentile(sweep.map(campaign => campaign.universes[index]?.runsThisUniverse ?? 99), 0.5);
    const [first, , , fourth] = [at(0), at(1), at(2), at(3)];
    assert.ok(fourth < first, `${strategy}: Universe 4 took ${fourth} runs against ${first} for Universe 1`);
    assert.ok(fourth <= 4, `${strategy}: a developed Universe still takes ${fourth} runs`);
    assert.ok(fourth >= 2, `${strategy}: Universe 4 fell out in ${fourth} runs`);
  }
});

test('campaign: a Multiverse is several Universes of work and the Axiom layer follows it', () => {
  const sweep = campaigns('balanced', 'universes:4', 6);
  for (const campaign of sweep) {
    assert.equal(campaign.universesTotal, 4);
    assert.ok(campaign.multiverses >= 1, 'four Universes must reach the first Multiverse');
  }
  const runsToMultiverse = sweep.map(campaign => campaign.firstMultiverseRun).filter(Boolean);
  const median = percentile(runsToMultiverse, 0.5);
  assert.ok(median >= 10 && median <= 30, `first Multiverse at ${median} runs`);
});

// ---------------------------------------------------------------- build diversity

test('campaign: no purchase policy dominates the early game', () => {
  const ranked = PURCHASE_POLICIES
    .map(strategy => [strategy, percentile(campaigns(strategy, 'first_universe', 8).map(c => c.firstUniverseRun), 0.5)])
    .sort((a, b) => a[1] - b[1]);
  const best = ranked[0][1];
  const worst = ranked[ranked.length - 1][1];

  // Every tilt has to be playable. A policy twice as slow as another is a trap, not a build.
  assert.ok(worst / best <= 1.8, `${ranked[ranked.length - 1][0]} needs ${worst} runs against ${ranked[0][0]}'s ${best}`);
  // ...and no tilt may be so far ahead that the others are decoration.
  const secondBest = ranked[1][1];
  assert.ok(secondBest <= best * 1.5, `${ranked[0][0]} at ${best} runs is alone at the front`);
});

test('campaign: utility and yield builds are slower, not broken', () => {
  const reference = percentile(campaigns('survival_first', 'first_universe', 8).map(c => c.firstUniverseRun), 0.5);
  for (const strategy of ['utility_first', 'yield_first', 'development_first']) {
    const median = percentile(campaigns(strategy, 'first_universe', 8).map(c => c.firstUniverseRun), 0.5);
    assert.ok(median <= reference * 1.8, `${strategy} at ${median} runs against survival_first's ${reference} is a progression trap`);
  }
});

// ---------------------------------------------------------------- Directive balance

test('campaign: the three early Directives set genuinely different goals', () => {
  const EARLY = ['accelerated_development', 'cognitive_extraction', 'stable_cultivation'];
  const measure = (directiveId, levels) => {
    const results = seeds(20, 37).map(seed => {
      const engine = freshCampaignEngine();
      engine.state.meta.progression.machineInsight = 6;
      engine.state.meta.progression.unlockedSystems.push('directives');
      engine.state.meta.progression.knownDirectives = [directiveId];
      Object.assign(engine.state.machine.upgradeLevels, levels);
      engine.prepareNextRun(seed);
      engine.selectDirective(directiveId);
      return playRun(engine, { seed, chase: true });
    });
    return {
      completion: results.filter(run => run.objectiveCompleted).length / results.length,
      creditsPerSecond: percentile(results.map(run => run.credits / Math.max(1, run.elapsed)), 0.5),
      seconds: percentile(results.map(run => run.elapsed), 0.5),
    };
  };

  const bare = Object.fromEntries(EARLY.map(id => [id, measure(id, {})]));
  const built = Object.fromEntries(EARLY.map(id => [id, measure(id, { reality_lattice: 2, awareness_scrubber: 1 })]));

  // Accelerated Development must not solve its own objective. It multiplies Development and then asks
  // for Development, so the era half of the objective is what stops it being free -- and on a bare
  // Machine, reaching Transcendence is exactly what a bare Machine cannot do.
  assert.ok(bare.accelerated_development.completion <= 0.35,
    `Accelerated Development clears ${bare.accelerated_development.completion * 100}% of bare runs`);

  // The other two reward the play they name, and a player who steers for them gets there.
  assert.ok(bare.stable_cultivation.completion >= 0.6, 'Stable Cultivation must reward risk control');
  assert.ok(bare.cognitive_extraction.completion >= 0.6, 'Cognitive Extraction must reward Awareness management');

  // Different bets, comparable payoffs. Credits are the currency prestige is bought in, so that is
  // the axis on which no Directive may run away with the game.
  for (const stage of [bare, built]) {
    const rates = EARLY.map(id => stage[id].creditsPerSecond);
    assert.ok(Math.max(...rates) / Math.max(1e-9, Math.min(...rates)) <= 2,
      `Directive credit throughput spread ${(Math.max(...rates) / Math.min(...rates)).toFixed(2)}x`);
  }

  // And each is a different shape of run rather than three names for the same one.
  const durations = EARLY.map(id => built[id].seconds);
  assert.ok(Math.max(...durations) / Math.min(...durations) >= 1.2, 'the Directives must produce differently shaped runs');
});

// ---------------------------------------------------------------- unlock pacing

test('campaign: a prestige reveals a decision, not a catalog', () => {
  // Counting `unlockedSystems` is not enough and once hid the whole problem. Systems were staggered
  // while the eight Universe upgrades behind them were gated on Machine Insight a player has long
  // since passed, so the first Universe opened one system, one currency and the entire layer at once:
  // ten new things, reported as one. This counts everything the player can newly act on.
  const deep = ['balanced', 'survival_first'].flatMap(strategy => campaigns(strategy, 'universes:4', 6));
  for (const campaign of deep) {
    for (const universe of campaign.universes) {
      const added = universe.surfaceAdded ?? [];
      assert.ok(added.length <= 4,
        `${campaign.strategy} seed ${campaign.seed}: Universe ${universe.index} revealed ${added.length} things at once (${added.join(', ')})`);
    }
    // ...and every Universe has to reveal *something*, or the layer stops being a reason to prestige.
    for (const universe of campaign.universes.slice(0, 4)) {
      assert.ok((universe.surfaceAdded ?? []).length >= 1,
        `${campaign.strategy}: Universe ${universe.index} revealed nothing`);
    }
  }

  const all = REPRESENTATIVE.flatMap(strategy => campaigns(strategy, 'first_universe', 8));
  for (const campaign of all) {
    const atFirstUniverse = campaign.unlockTimeline
      .filter(entry => entry.universe === 1 && entry.run === campaign.firstUniverseRun).length;
    assert.ok(atFirstUniverse <= 2,
      `seed ${campaign.seed} (${campaign.strategy}) unlocked ${atFirstUniverse} systems in the first-Universe step`);
  }

  // Breeding Matrices deliberately wait for the second Universe and Multiverse prestige for the
  // third, so the player meets one idea at a time.
  const engine = freshCampaignEngine();
  engine.state.meta.progression.machineInsight = 30;
  engine.state.meta.universesTotal = 1;
  engine.state.meta.progression.unlockedSystems = ['machine_upgrades', 'civilization', 'controlled_harvest'];
  engine.state.meta.progression.announcedUnlocks = [];
  engine.refreshConvergenceMilestones();
  assert.equal(engine.systemUnlocked('universe_upgrades'), true, 'the first Universe unlocks its upgrades');
  assert.equal(engine.systemUnlocked('breeding_matrices'), false, 'Matrices must wait for the second Universe');
  assert.equal(engine.systemUnlocked('multiverse_prestige'), false, 'Multiverse prestige must wait for the third');
});

// ---------------------------------------------------------------- Grade / Credit contract

test('campaign: every Harvest Grade boundary pays a Cultivation Credit', () => {
  // The v1.20.0 contract, asserted at the source rather than through a simulation: a player is never
  // told a grade is 0.4 Depth away while the next credit is 1.4 Depth away, because the two are the
  // same event.
  for (const band of DEPTH_BANDS) {
    assert.equal(band.minDepth, depthForCredit(band.credits), `${band.grade} boundary must be a credit step`);
    const civ = GameEngine.createCivilizationForTest(9001);
    civ.eventChoices = 5;
    civ.era = 2;
    civ.development = band.minDepth * 80;
    const quality = evaluateHarvestQuality(civ, false);
    assert.equal(quality.credits, band.credits);
  }
  assert.equal(DEPTH_BANDS[DEPTH_BANDS.length - 1].credits, DEPTH_CREDIT_CAP, 'SINGULAR is the credit cap');
  assert.equal(Number((DEPTH_CREDIT_RATE * depthForCredit(1)).toFixed(6)), 1);
});

// ---------------------------------------------------------------- meta-economy sanity

test('campaign: the Universe layer keeps paying for something new', () => {
  for (const campaign of campaigns('balanced', 'universes:4', 6)) {
    for (const universe of campaign.universes) {
      assert.ok(universe.residueAward >= 8, `Universe ${universe.index} paid only ${universe.residueAward} residue`);
      assert.ok(universe.universeUpgrades.length >= 1,
        `Universe ${universe.index} could not afford a single permanent improvement`);
    }
    // No single Universe upgrade may absorb the whole layer.
    const bought = campaign.universes.flatMap(universe => universe.universeUpgrades);
    const counts = new Map();
    for (const id of bought) counts.set(id, (counts.get(id) ?? 0) + 1);
    const dominant = Math.max(...counts.values());
    assert.ok(dominant <= bought.length * 0.6,
      `one Universe upgrade took ${dominant} of ${bought.length} purchases`);
    assert.ok(counts.size >= 3, `only ${counts.size} distinct Universe upgrades were worth buying`);
  }
});

test('campaign: spending everything on one axis still leaves the others reachable', () => {
  // A policy that pours a whole campaign into Reality Lattice must not end up with a Machine that can
  // do nothing else -- the ladder is meant to price the axis, not to close it.
  const campaign = runCampaign({ seed: 5, strategy: 'lattice_rush', stop: 'universes:2' });
  const engine = campaign.engine;
  const reachable = engine.catalog('machine')
    .map(definition => String(definition.id))
    .filter(id => Progression.canUseUpgrade(engine.state, 'machine', id));
  assert.ok(reachable.length >= 8, `only ${reachable.length} Machine upgrades stayed reachable`);
  assert.ok(campaign.runs.some(run => run.purchased.some(id => id !== 'reality_lattice')),
    'even a Lattice rush must find something else worth buying');
});

test('campaign: no purchase tilt is Pareto-dominated by another', () => {
  // The four axes the rebalance mandate names, measured where the campaign has actually developed --
  // the first Multiverse -- and in wall-clock rather than simulated time, because wall-clock is what
  // the player spends. "Nobody holds every axis at once" is too weak a bar: a tilt that is no worse on
  // any axis and better on one is dominant over its neighbour whether or not it leads the table.
  const sum = run => Object.values(run.rewards).reduce((total, value) => total + value, 0);
  const finite = values => values.filter(Number.isFinite);
  const mean = values => (values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0);
  const measure = strategy => {
    // Eight seeds, not six. Measured, the resources-per-minute median is unstable at six -- yield_first
    // and development_first swap the axis depending on which seeds land -- and stable from eight on.
    // The margins between tilts on that axis are genuinely thin, so the sample has to be wide enough
    // to see past the noise rather than wide enough to get the answer.
    const sweep = campaigns(strategy, 'universes:4', 8);
    return {
      strategy,
      // The mean, not the median, and for a reason the other three axes do not have: this one is an
      // integer between 14 and 19, so a median over it moves in steps of one Civilization -- about 6%
      // -- and two neighbouring tilts land on the same value constantly. A tie there let the axis
      // count as "no worse" and handed the whole four-axis verdict to the remaining three.
      // Measured: `survival_first` and `defensive_spread` sat at means of 15.75 and 15.25 before the
      // v1.20.1 Existence fix and 15.75 and 15.38 after it -- an unchanged relationship -- while
      // `survival_first`'s *median* stepped 16 -> 15 because one seed crossed the boundary, and that
      // alone reported a domination. The bar is unchanged; the axis now has the resolution to judge it.
      civilizations: mean(finite(sweep.map(c => c.firstMultiverseRun))),
      wallMinutes: percentile(finite(sweep.map(c => c.firstMultiverseWallClock / 60)), 0.5),
      creditsPerMinute: percentile(finite(sweep.map(c => c.runs.reduce((t, r) => t + r.credits, 0) / (c.wallClockSeconds / 60))), 0.5),
      resourcesPerMinute: percentile(finite(sweep.map(c => c.runs.reduce((t, r) => t + sum(r), 0) / (c.wallClockSeconds / 60))), 0.5),
    };
  };

  // Prediction Core is the one Machine module this harness cannot value. The modelled player takes the
  // safest branch of every intervention, so there is little left for foresight to soften and no reason
  // to spend Control looking -- and a build tilted toward it is therefore measured spending resources
  // on nothing. That is asserted here rather than asserted *about* here, so the exclusion below is
  // earned by a check instead of by a comment. An exclusion is only worth what its proof is worth, so
  // it runs over twelve seeds and compares every field this harness records -- the nine in `COMPARED`
  // plus all four harvest rewards. That is the run's whole outcome; it is deliberately not a claim
  // about engine state the harness never looks at.
  const buildFor = predictionLevel => {
    const engine = freshCampaignEngine();
    engine.state.meta.progression.machineInsight = 30;
    Object.assign(engine.state.machine.upgradeLevels, { reality_lattice: 2, awareness_scrubber: 1 });
    if (predictionLevel) engine.state.machine.upgradeLevels.prediction_core = predictionLevel;
    return engine;
  };
  const COMPARED = ['elapsed', 'waited', 'credits', 'depth', 'grade', 'objectiveCompleted', 'era', 'development', 'interventions'];
  for (let index = 0; index < 12; index++) {
    const seed = 3000 + index * 97;
    const bare = playRun(buildFor(0), { seed });
    const cored = playRun(buildFor(5), { seed });
    for (const field of COMPARED) {
      assert.deepEqual(cored[field], bare[field],
        `Prediction Core changed ${field} on seed ${seed} -- it now matters to this policy, so drop the exclusion below`);
    }
    assert.deepEqual(cored.rewards, bare.rewards, `Prediction Core changed the harvest on seed ${seed}`);
  }

  const rows = PURCHASE_POLICIES.map(measure);
  for (const row of rows) {
    assert.ok(row.civilizations > 0, `${row.strategy} never reached a Multiverse`);
    assert.ok(row.wallMinutes > 0 && Number.isFinite(row.creditsPerMinute), `${row.strategy} produced no throughput`);
  }

  const dominates = (a, b) => a.civilizations <= b.civilizations
    && a.wallMinutes <= b.wallMinutes
    && a.creditsPerMinute >= b.creditsPerMinute
    && a.resourcesPerMinute >= b.resourcesPerMinute
    && (a.civilizations < b.civilizations || a.wallMinutes < b.wallMinutes
      || a.creditsPerMinute > b.creditsPerMinute || a.resourcesPerMinute > b.resourcesPerMinute);

  const measurable = rows.filter(row => row.strategy !== 'utility_first');
  const dominated = [];
  for (const a of measurable) for (const b of measurable) if (a !== b && dominates(a, b)) dominated.push(`${b.strategy} is dominated by ${a.strategy}`);
  assert.deepEqual(dominated, [], dominated.join(' | '));

  // Utility is held to the weaker bar its measurement supports: not a trap. It buys a module worth
  // exactly nothing here, so it should still land close, and if it ever falls far behind that is a
  // real problem rather than an artefact.
  const utility = rows.find(row => row.strategy === 'utility_first');
  const bestCivilizations = Math.min(...measurable.map(row => row.civilizations));
  const bestWall = Math.min(...measurable.map(row => row.wallMinutes));
  assert.ok(utility.civilizations <= bestCivilizations * 1.5,
    `utility_first needs ${utility.civilizations} Civilizations against a best of ${bestCivilizations}`);
  assert.ok(utility.wallMinutes <= bestWall * 1.3,
    `utility_first spends ${utility.wallMinutes} minutes against a best of ${bestWall}`);

  // And the axes a player feels have to stay close across every tilt.
  const spread = values => Math.max(...values) / Math.min(...values);
  assert.ok(spread(rows.map(r => r.wallMinutes)) <= 1.5, `wall-clock spans ${spread(rows.map(r => r.wallMinutes)).toFixed(2)}x`);
  assert.ok(spread(rows.map(r => r.creditsPerMinute)) <= 1.5, `credits per minute span ${spread(rows.map(r => r.creditsPerMinute)).toFixed(2)}x`);
  assert.ok(spread(rows.map(r => r.resourcesPerMinute)) <= 1.8, `resources per minute span ${spread(rows.map(r => r.resourcesPerMinute)).toFixed(2)}x`);
  assert.ok(spread(rows.map(r => r.civilizations)) <= 2, `Civilizations span ${spread(rows.map(r => r.civilizations)).toFixed(2)}x`);
});

test('campaign: the strategy table has no universally dominant entry', () => {
  const names = Object.keys(STRATEGIES);
  assert.ok(names.length >= 8, 'the comparison needs a real spread of strategies');
  const results = names.map(strategy => {
    const sweep = campaigns(strategy, 'first_universe', 6);
    return {
      strategy,
      runs: percentile(sweep.map(c => c.firstUniverseRun), 0.5),
      minutes: percentile(sweep.map(c => c.simulatedSeconds / 60), 0.5),
    };
  });
  const fewestRuns = results.reduce((best, entry) => (entry.runs < best.runs ? entry : best));
  const leastTime = results.reduce((best, entry) => (entry.minutes < best.minutes ? entry : best));
  // The strategy that needs the fewest Civilizations and the one that needs the least simulated time
  // must not be the same strategy, or one line is simply better at everything.
  assert.notEqual(fewestRuns.strategy, leastTime.strategy,
    `${fewestRuns.strategy} is fastest by both runs and time`);
});
