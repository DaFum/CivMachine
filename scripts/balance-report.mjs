#!/usr/bin/env node
// Campaign balance report.
//
//   npm run balance        -- the default sweep, about a minute
//   npm run balance:full   -- a wider seed set for deeper verification
//
// This drives the compiled engine exactly the way `public/game/tests/campaign.test.mjs` does, so a
// number that moves here is a number that moved in the game. Nothing here reaches a network or a
// browser, and every campaign is deterministic in (strategy, seed).
//
// Read it as: are the bands still where the design put them? The campaign test asserts that; this
// prints it, so a balance change can be looked at before it is argued about.
import {
  STRATEGIES, percentile, runCampaign, summarize,
} from '../public/game/tests/campaign-harness.mjs';

const full = process.argv.slice(2).includes('--full');
const WIDE = full ? 40 : 16;
const DEEP = full ? 20 : 8;
const SEEDS = count => Array.from({ length: count }, (_, index) => 1 + index * 13);

const STRATEGY_IDS = Object.keys(STRATEGIES);
const PURCHASE_TILTS = ['survival_first', 'defensive_spread', 'lattice_rush', 'development_first', 'yield_first', 'utility_first', 'balanced'];

const num = (value, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '-');
const L = (value, width) => String(value).padEnd(width);
const R = (value, width) => String(value).padStart(width);
const band = (values, digits = 1) => {
  const s = summarize(values);
  return `${num(s.p10, digits)} / ${num(s.median, digits)} / ${num(s.p90, digits)}`;
};
const section = title => console.log(`\n${'-'.repeat(96)}\n${title}\n${'-'.repeat(96)}`);

const started = Date.now();
console.log(`CivMachine campaign balance report -- ${full ? 'full' : 'default'} sweep`);
console.log(`${STRATEGY_IDS.length} strategies, ${WIDE} seeds to the first Universe, ${DEEP} seeds to the fourth.`);
console.log('Bands are p10 / median / p90 across seeds.');

const toFirstUniverse = new Map(STRATEGY_IDS.map(strategy =>
  [strategy, SEEDS(WIDE).map(seed => runCampaign({ seed, strategy, stop: 'first_universe' }))]));
const toFourthUniverse = new Map(STRATEGY_IDS.map(strategy =>
  [strategy, SEEDS(DEEP).map(seed => runCampaign({ seed, strategy, stop: 'universes:4' }))]));

// ---------------------------------------------------------------- 1
section('1. First run  -- short and dangerous, and worth exactly one real purchase');
console.log(L('strategy', 22) + R('seconds', 22) + R('depth', 24) + R('credits', 16) + R('affordable levels', 22));
for (const strategy of STRATEGY_IDS) {
  const first = toFirstUniverse.get(strategy).map(campaign => campaign.runs[0]).filter(Boolean);
  console.log(L(strategy, 22)
    + R(band(first.map(r => r.elapsed), 0), 22)
    + R(band(first.map(r => r.depth), 2), 24)
    + R(band(first.map(r => r.credits), 0), 16)
    + R(band(first.map(r => r.affordableLevels), 0), 22));
}

// ---------------------------------------------------------------- 2
section('2. Machine power per run  -- Containment is the stat that compounds');
console.log(L('strategy', 22) + R('Containment/run', 22) + R('Lattice levels/run', 24) + R('Containment by run 6', 26));
for (const strategy of STRATEGY_IDS) {
  const runs = toFirstUniverse.get(strategy).flatMap(campaign => campaign.runs);
  const sixth = toFourthUniverse.get(strategy).map(campaign => campaign.runs[5]?.containment ?? 0);
  console.log(L(strategy, 22)
    + R(band(runs.map(r => r.containmentGained), 1), 22)
    + R(band(runs.map(r => r.latticeGained), 1), 24)
    + R(band(sixth, 1), 26));
}

// ---------------------------------------------------------------- 3
section('3. Prestige cadence  -- Civilizations consumed per Universe');
console.log(L('strategy', 22) + R('to U1', 18) + R('U2', 8) + R('U3', 8) + R('U4', 8) + R('sim min to U1', 24));
for (const strategy of STRATEGY_IDS) {
  const wide = toFirstUniverse.get(strategy);
  const deep = toFourthUniverse.get(strategy);
  const at = index => num(percentile(deep.map(c => c.universes[index]?.runsThisUniverse ?? NaN).filter(Number.isFinite), 0.5), 1);
  console.log(L(strategy, 22)
    + R(band(wide.map(c => c.firstUniverseRun), 0), 18)
    + R(at(1), 8) + R(at(2), 8) + R(at(3), 8)
    + R(band(wide.map(c => c.firstUniverseSeconds / 60), 1), 24));
}

// ---------------------------------------------------------------- 4
section('4. Run depth over a campaign  -- median depth and seconds by run index');
console.log(L('strategy', 22) + [1, 3, 6, 9, 12].map(n => R(`run ${n}`, 14)).join(''));
for (const strategy of STRATEGY_IDS) {
  const deep = toFourthUniverse.get(strategy);
  const cell = n => {
    const runs = deep.map(c => c.runs[n - 1]).filter(Boolean);
    if (!runs.length) return '-';
    return `${num(percentile(runs.map(r => r.depth), 0.5), 1)}@${num(percentile(runs.map(r => r.elapsed), 0.5), 0)}s`;
  };
  console.log(L(strategy, 22) + [1, 3, 6, 9, 12].map(n => R(cell(n), 14)).join(''));
}

// ---------------------------------------------------------------- 5
section('5. Universe economy  -- residue paid and what it bought');
console.log(L('strategy', 22) + R('U1 residue', 20) + R('U4 residue', 20) + R('upgrade levels by U4', 26) + R('distinct upgrades', 22));
for (const strategy of STRATEGY_IDS) {
  const deep = toFourthUniverse.get(strategy);
  const residue = index => band(deep.map(c => c.universes[index]?.residueAward ?? 0), 0);
  const levels = deep.map(c => c.universes.reduce((sum, u) => sum + u.universeUpgrades.length, 0));
  const distinct = deep.map(c => new Set(c.universes.flatMap(u => u.universeUpgrades)).size);
  console.log(L(strategy, 22) + R(residue(0), 20) + R(residue(3), 20) + R(band(levels, 0), 26) + R(band(distinct, 0), 22));
}

// ---------------------------------------------------------------- 6
section('6. Multiverse horizon  -- reached inside the four-Universe sweep');
console.log(L('strategy', 22) + R('runs to MV1', 20) + R('sim minutes to MV1', 26) + R('Machine Insight', 22));
for (const strategy of STRATEGY_IDS) {
  const reached = toFourthUniverse.get(strategy).filter(c => c.firstMultiverseRun > 0);
  if (!reached.length) { console.log(L(strategy, 22) + 'no Multiverse inside four Universes'); continue; }
  console.log(L(strategy, 22)
    + R(band(reached.map(c => c.firstMultiverseRun), 0), 20)
    + R(band(reached.map(c => c.firstMultiverseSeconds / 60), 0), 26)
    + R(band(reached.map(c => c.insight), 0), 22));
}

// ---------------------------------------------------------------- 7
section('7. Unlock pacing  -- systems revealed in the first-Universe step');
for (const strategy of PURCHASE_TILTS) {
  const counts = toFirstUniverse.get(strategy).map(campaign =>
    campaign.unlockTimeline.filter(entry => entry.universe === 1 && entry.run === campaign.firstUniverseRun).length);
  console.log(L(strategy, 22) + R(band(counts, 0), 16) + '   (target: no more than two new concepts at once)');
}

// ---------------------------------------------------------------- 8
section('8. Build diversity  -- Civilizations to the first Universe, best first');
const ranked = STRATEGY_IDS
  .map(strategy => [strategy, percentile(toFirstUniverse.get(strategy).map(c => c.firstUniverseRun), 0.5),
    percentile(toFirstUniverse.get(strategy).map(c => c.simulatedSeconds / 60), 0.5)])
  .sort((a, b) => a[1] - b[1]);
console.log(L('strategy', 22) + R('runs', 8) + R('sim minutes', 16));
for (const [strategy, runs, minutes] of ranked) console.log(L(strategy, 22) + R(runs, 8) + R(num(minutes, 1), 16));

const tilts = ranked.filter(([strategy]) => PURCHASE_TILTS.includes(strategy));
const fewestRuns = ranked[0];
const leastTime = [...ranked].sort((a, b) => a[2] - b[2])[0];
console.log('');
console.log(`purchase tilts span ${tilts[0][1]} to ${tilts[tilts.length - 1][1]} runs `
  + `(${num(tilts[tilts.length - 1][1] / Math.max(1, tilts[0][1]), 2)}x)`);
console.log(`fewest Civilizations: ${fewestRuns[0]} (${fewestRuns[1]} runs)`);
console.log(`least simulated time: ${leastTime[0]} (${num(leastTime[2], 1)} min)`);
console.log(fewestRuns[0] === leastTime[0]
  ? 'WARNING: one strategy is fastest by both measures -- check for a dominant line.'
  : 'No strategy is fastest by both measures.');

// ---------------------------------------------------------------- 9
if (full) {
  section('9. Great Convergence horizon  -- a whole campaign, from an empty save to the gate');
  const convergence = SEEDS(6).map(seed => runCampaign({ seed, strategy: 'balanced', stop: 'convergence', maxRuns: 600 }));
  console.log(L('measure', 26) + R('p10 / median / p90', 26));
  console.log(L('civilizations', 26) + R(band(convergence.map(c => c.totalRuns), 0), 26));
  console.log(L('universes', 26) + R(band(convergence.map(c => c.universesTotal), 0), 26));
  console.log(L('multiverses', 26) + R(band(convergence.map(c => c.multiverses), 0), 26));
  console.log(L('machine insight', 26) + R(band(convergence.map(c => c.insight), 0), 26));
  console.log(L('simulated hours', 26) + R(band(convergence.map(c => c.simulatedSeconds / 3600), 2), 26));
  console.log('\nSimulated hours are 1x cultivation time only -- the player also spends real time on');
  console.log('interventions and purchases, and can run at 2x or 4x once Machine Insight allows it.');
}

console.log(`\ndone in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
