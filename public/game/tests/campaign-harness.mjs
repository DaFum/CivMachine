// Campaign-level balance simulation.
//
// `balance-harness.mjs` measures one Civilization. This measures the meta-economy above it: a fresh
// save played forward through many runs, Machine purchases, Universes, Multiverses and Axioms, under
// a named purchase policy. Everything here is deterministic -- a (policy, seed) pair always produces
// the same campaign -- so a balance change shows up as a moved number rather than as a feeling.
import { GameEngine } from '../dist/game/engine.js';
import { Progression } from '../dist/game/progression.js';
import { upgradeCost } from '../dist/game/rules.js';
import { cultivationDepth, harvestUrgency } from '../dist/game/harvest-quality.js';
import { entropyRate, pressureYears, secondsToCascade } from '../dist/game/pressure.js';
import { VENT_COST_ESCALATION, VENT_ENTROPY_RELIEF, ventStabilityCost } from '../dist/game/tactical-actions.js';
import { safestChoiceIndex } from './balance-harness.mjs';

export const RESOURCE_KEYS = ['causal_mass', 'cognition', 'paradox', 'existence'];

export function freshCampaignEngine() {
  return new GameEngine({
    autosave: false,
    storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  });
}

export function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))];
}

export function median(values) { return percentile(values, 0.5); }

export function summarize(values) {
  return {
    n: values.length,
    p10: percentile(values, 0.1),
    median: percentile(values, 0.5),
    p90: percentile(values, 0.9),
    min: values.length ? Math.min(...values) : 0,
    max: values.length ? Math.max(...values) : 0,
    mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0,
  };
}

/**
 * The player's read on the run, computed the way the interface computes it. A campaign policy that
 * guessed at "when to harvest" would measure the guess rather than the game, so this reuses the very
 * `harvestUrgency` the live rail shows.
 */
export function runUrgency(engine) {
  const civ = engine.state.civilization;
  if (!civ) return null;
  const bonuses = engine.runtimeBonuses();
  const controlled = engine.previewHarvestDetails(false);
  return harvestUrgency({
    depth: cultivationDepth(civ),
    credits: controlled.credits,
    developmentRate: engine.developmentRate(),
    secondsToCascade: secondsToCascade(pressureYears(civ), civ.tactical.entropy, bonuses.containmentRating, civ.terminal),
    entropyRate: entropyRate(pressureYears(civ), bonuses.containmentRating, civ.terminal),
    stability: civ.stats.stability,
    controlCapacity: civ.tactical.controlCapacity,
    ventEntropyRelief: VENT_ENTROPY_RELIEF,
    ventStabilityCost: ventStabilityCost(civ.tactical.actionUsage.vent),
    ventCostEscalation: VENT_COST_ESCALATION,
    entropy: civ.tactical.entropy,
    premature: controlled.grade === 'premature',
  });
}

/**
 * The Directive-optimizing player: someone who picked an objective and is steering for it.
 *
 * `safestChoiceIndex` models the opposite -- a player minimising risk -- and it is the right default,
 * but it is the wrong lens for judging whether a Directive objective is achievable. Cognitive
 * Extraction asks for Awareness 45, and a safety-first policy finishes runs at Awareness 1, so
 * measuring that Directive with the safe policy measures the policy. This scores each branch by how
 * far it moves the active objective and keeps safety as the tie-breaker.
 */
const OBJECTIVE_WEIGHTS = {
  accelerated_development: { development: 0.5, stability: 1.5, entropy: -1.5 },
  cognitive_extraction: { awareness: 6, sanity: 3, stability: 0.5 },
  stable_cultivation: { stability: 5, entropy: -4, sanity: 1 },
  paradox_prospecting: { entropy: 4, stability: 2 },
  quiet_machine: { awareness: -4, attention: -4, development: 0.3 },
  temporal_pressure: { development: 0.6, stability: 1, entropy: -1 },
};

export function objectiveChoiceIndex(event, directiveId) {
  const weights = OBJECTIVE_WEIGHTS[directiveId];
  if (!weights) return safestChoiceIndex(event);
  let best = 0;
  let bestScore = -Infinity;
  for (let index = 0; index < event.choices.length; index++) {
    const effects = event.choices[index].effects ?? {};
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) score += Number(effects[key] ?? 0) * weight;
    // Safety still breaks ties: an objective is worth nothing on a run that collapsed before harvest.
    score += Number(effects.stability ?? 0) * 0.4 - Number(effects.entropy ?? 0) * 0.4;
    if (score > bestScore) { bestScore = score; best = index; }
  }
  return best;
}

const HARVEST_TRIGGERS = {
  // Harvest the moment the next Cultivation Credit stops fitting in the reachable run. This is what
  // the interface tells the player to do, so it is the default model of competent play.
  urgent: state => state === 'harvest' || state === 'capped',
  // Bank early and start the next run sooner. Trades depth for wall-clock throughput.
  cautious: state => state === 'harvest' || state === 'closing' || state === 'capped',
  // Never harvest voluntarily: ride the run into the cascade and take the chaotic penalty. This is
  // the deliberately deep-run strategy, and it is meant to be a real trade rather than a trap.
  cascade: state => state === 'capped',
};

/**
 * One Civilization, played to a harvest. The tactical layer is modelled rather than scripted: vents
 * are spent when Entropy actually threatens the run and Stability can still pay for them, which is
 * the decision the tactical rail exists to prompt.
 */
export function playRun(engine, { seed = 0, trigger = 'urgent', accelerate = false, chase = false, dt = 0.25, maxSeconds = 1800 } = {}) {
  const runBuild = engine.state.machine.runBuild;
  if (engine.systemUnlocked('directives') && runBuild.directiveOfferIds.length && !runBuild.selectedDirective) {
    engine.selectDirective(runBuild.directiveOfferIds[0]);
  }
  if (!engine.startCivilization(seed)) throw new Error(`startCivilization failed: ${engine.lastActionFailure}`);
  const shouldHarvest = HARVEST_TRIGGERS[trigger] ?? HARVEST_TRIGGERS.urgent;
  const directiveId = engine.state.civilization.directiveId;
  let elapsed = 0;
  let interventions = 0;
  let iterations = 0;
  const maxIterations = Math.ceil(maxSeconds / dt) * 4;

  while (engine.state.phase === 'civilization' && elapsed < maxSeconds) {
    if (++iterations > maxIterations) throw new Error('playRun did not terminate');
    const civ = engine.state.civilization;
    const event = engine.currentEvent();
    if (event) {
      interventions++;
      engine.chooseEvent(chase ? objectiveChoiceIndex(event, civ.directiveId) : safestChoiceIndex(event));
      continue;
    }
    // Venting is the run-extending move and Stability is what pays for it. Spend it only once
    // Entropy is genuinely pressing, and never below the Stability floor that keeps the run alive.
    if (civ.tactical.entropy >= 55 && civ.stats.stability > 25 + ventStabilityCost(civ.tactical.actionUsage.vent) && engine.tacticalAvailability('vent').enabled) {
      engine.useTacticalAction('vent');
      continue;
    }
    if (civ.stats.stability < 30 && engine.tacticalAvailability('stabilize').enabled) {
      engine.useTacticalAction('stabilize');
      continue;
    }
    if (accelerate && engine.tacticalAvailability('accelerate').enabled) {
      engine.useTacticalAction('accelerate');
      continue;
    }
    const urgency = runUrgency(engine);
    if (urgency && shouldHarvest(urgency.state)) { engine.harvest(false); break; }
    engine.tick(dt);
    elapsed += dt;
  }
  if (engine.state.phase === 'civilization') engine.harvest(false);

  const harvest = engine.state.machine.lastHarvest ?? {};
  return {
    elapsed,
    interventions,
    directiveId,
    depth: Number(harvest.depth ?? 0),
    grade: String(harvest.grade ?? ''),
    credits: Number(harvest.credits ?? 0),
    development: Number(harvest.development ?? 0),
    era: Number(harvest.era ?? 0),
    chaotic: Boolean(harvest.chaotic),
    objectiveCompleted: Boolean(harvest.objective_completed),
    rewards: { ...(harvest.rewards ?? {}) },
  };
}

const CONTAINMENT_MODULES = ['reality_lattice', 'awareness_scrubber', 'sanity_protocol', 'cosmic_muffling'];
const YIELD_MODULES = ['historical_compressor', 'cognitive_extractor', 'paradox_sieve', 'existence_furnace'];
const DEVELOPMENT_MODULES = ['cultivation_accelerator'];
const UTILITY_MODULES = ['prediction_core', 'temporal_injector', 'contingency_vat'];

export const MODULE_CATEGORY = new Map([
  ...CONTAINMENT_MODULES.map(id => [id, 'containment']),
  ...YIELD_MODULES.map(id => [id, 'yield']),
  ...DEVELOPMENT_MODULES.map(id => [id, 'development']),
  ...UTILITY_MODULES.map(id => [id, 'utility']),
]);

const machineLevel = (engine, id) => engine.upgradeLevel('machine', id);

/**
 * A build is a tilt, not a script.
 *
 * Ordered preference lists produced policies no player has: "yield first" meant *never* buying
 * Containment, because a yield module was always affordable and the list never reached the survival
 * entry. That measures the list, not the build. A weight scales the price a policy is willing to see,
 * so a yield-tilted player still buys survival when survival is what the bank can reach -- which is
 * what makes the dominance comparison in section 11 of the rebalance mandate meaningful.
 */
function weighted(weights) {
  return engine => {
    let best = '';
    let bestScore = Infinity;
    for (const definition of engine.catalog('machine')) {
      const id = String(definition.id);
      if (!engine.canPurchaseUpgrade('machine', id)) continue;
      const weight = weights[MODULE_CATEGORY.get(id) ?? 'yield'] ?? 1;
      const score = engine.upgradeCost('machine', id) * weight;
      if (score < bestScore) { bestScore = score; best = id; }
    }
    return best;
  };
}

// Spread evenly instead of deepening one module: among Containment modules prefer the one that is
// behind, and only then compare price.
function spreadContainment(weights) {
  const fallback = weighted(weights);
  return engine => {
    let best = '';
    let bestKey = [Infinity, Infinity];
    for (const id of CONTAINMENT_MODULES) {
      if (!engine.canPurchaseUpgrade('machine', id)) continue;
      const key = [machineLevel(engine, id), engine.upgradeCost('machine', id)];
      if (key[0] < bestKey[0] || (key[0] === bestKey[0] && key[1] < bestKey[1])) { bestKey = key; best = id; }
    }
    return best || fallback(engine);
  };
}

// Always buy maximum Reality Lattice before anything else. Kept as a literal script rather than a
// tilt: this is the dominant-purchase-script the rebalance has to defeat, so it must be measured at
// full strength.
function latticeRush(weights) {
  const fallback = weighted(weights);
  return engine => (engine.canPurchaseUpgrade('machine', 'reality_lattice') ? 'reality_lattice' : fallback(engine));
}

export const MACHINE_POLICIES = {
  survival_first: weighted({ containment: 0.5, yield: 1.5, development: 1.6, utility: 2.5 }),
  defensive_spread: spreadContainment({ containment: 0.6, yield: 1.5, development: 1.6, utility: 2.5 }),
  lattice_rush: latticeRush({ containment: 0.6, yield: 1.5, development: 1.6, utility: 2.5 }),
  development_first: weighted({ development: 0.4, containment: 1.2, yield: 1.5, utility: 2.0 }),
  yield_first: weighted({ yield: 0.5, containment: 1.3, development: 1.5, utility: 2.5 }),
  utility_first: weighted({ utility: 0.4, containment: 1.3, yield: 1.5, development: 1.5 }),
  balanced: weighted({ containment: 1, yield: 1, development: 1, utility: 1 }),
};

export const UNIVERSE_PREFERENCE = {
  lattice_rush: ['wide_lattice', 'stable_constants', 'twin_harvest', 'bureaucracy_of_gods', 'inherited_time', 'archive_of_screams', 'paradox_rights', 'residue_refinery'],
  survival_first: ['stable_constants', 'wide_lattice', 'twin_harvest', 'bureaucracy_of_gods', 'inherited_time', 'archive_of_screams', 'paradox_rights', 'residue_refinery'],
  defensive_spread: ['stable_constants', 'wide_lattice', 'bureaucracy_of_gods', 'twin_harvest', 'inherited_time', 'archive_of_screams', 'paradox_rights', 'residue_refinery'],
  development_first: ['inherited_time', 'twin_harvest', 'wide_lattice', 'archive_of_screams', 'stable_constants', 'bureaucracy_of_gods', 'paradox_rights', 'residue_refinery'],
  yield_first: ['twin_harvest', 'residue_refinery', 'paradox_rights', 'wide_lattice', 'stable_constants', 'inherited_time', 'archive_of_screams', 'bureaucracy_of_gods'],
  utility_first: ['bureaucracy_of_gods', 'inherited_time', 'archive_of_screams', 'wide_lattice', 'twin_harvest', 'stable_constants', 'paradox_rights', 'residue_refinery'],
  balanced: ['wide_lattice', 'twin_harvest', 'stable_constants', 'inherited_time', 'bureaucracy_of_gods', 'archive_of_screams', 'paradox_rights', 'residue_refinery'],
};

export function spendMachineCurrencies(engine, policyId) {
  const choose = MACHINE_POLICIES[policyId] ?? MACHINE_POLICIES.balanced;
  const purchased = [];
  for (let guard = 0; guard < 400; guard++) {
    const id = choose(engine);
    if (!id || !engine.purchaseUpgrade('machine', id)) break;
    purchased.push(id);
  }
  return purchased;
}

export function spendResidue(engine, policyId) {
  const preference = UNIVERSE_PREFERENCE[policyId] ?? UNIVERSE_PREFERENCE.balanced;
  const purchased = [];
  for (let guard = 0; guard < 200; guard++) {
    let bought = false;
    for (const id of preference) {
      if (!engine.canPurchaseUpgrade('universe', id)) continue;
      if (!engine.purchaseUpgrade('universe', id)) continue;
      purchased.push(id);
      bought = true;
      break;
    }
    if (!bought) break;
  }
  return purchased;
}

export function spendAxioms(engine) {
  const purchased = [];
  for (let guard = 0; guard < 200; guard++) {
    let bought = false;
    // Axioms are gated by Machine Insight one at a time, so cheapest-first keeps every unlocked
    // Axiom moving -- which is also what the Convergence gate asks for.
    const candidates = engine.catalog('axiom')
      .map(d => String(d.id))
      .filter(id => engine.canPurchaseUpgrade('axiom', id))
      .sort((a, b) => engine.upgradeCost('axiom', a) - engine.upgradeCost('axiom', b));
    for (const id of candidates) {
      if (!engine.purchaseUpgrade('axiom', id)) continue;
      purchased.push(id);
      bought = true;
      break;
    }
    if (!bought) break;
  }
  return purchased;
}

/**
 * The most Machine levels the current bank could buy if it were spent perfectly, per currency. This
 * is the "purchase power" the first-run economy tests bound, and the campaign report reuses it so
 * one number means one thing everywhere.
 */
export function maximumPurchasableMachineLevels(engine) {
  const groups = new Map();
  for (const definition of engine.catalog('machine')) {
    if (!Progression.canUseUpgrade(engine.state, 'machine', definition.id)) continue;
    const currency = String(definition.currency);
    groups.set(currency, [...(groups.get(currency) ?? []), definition]);
  }
  const maximize = (definitions, index, remaining) => {
    if (index >= definitions.length) return 0;
    const definition = definitions[index];
    let best = 0;
    let spent = 0;
    for (let levels = 0; levels <= Number(definition.max_level); levels++) {
      if (spent > remaining) break;
      best = Math.max(best, levels + maximize(definitions, index + 1, remaining - spent));
      spent += upgradeCost(Number(definition.base_cost), Number(definition.growth), levels + machineLevel(engine, definition.id));
    }
    return best;
  };
  let total = 0;
  for (const [currency, definitions] of groups) total += maximize(definitions, 0, engine.currencyAmount(currency));
  return total;
}

export function containmentRating(engine) { return engine.runtimeBonuses().containmentRating; }

export function unlockedSystemCount(engine) { return engine.state.meta.progression.unlockedSystems.length; }

const STRATEGY_DEFAULTS = { trigger: 'urgent', accelerate: false };

export const STRATEGIES = {
  survival_first: { machine: 'survival_first', ...STRATEGY_DEFAULTS },
  development_first: { machine: 'development_first', ...STRATEGY_DEFAULTS },
  yield_first: { machine: 'yield_first', ...STRATEGY_DEFAULTS },
  utility_first: { machine: 'utility_first', ...STRATEGY_DEFAULTS },
  balanced: { machine: 'balanced', ...STRATEGY_DEFAULTS },
  lattice_rush: { machine: 'lattice_rush', ...STRATEGY_DEFAULTS },
  defensive_spread: { machine: 'defensive_spread', ...STRATEGY_DEFAULTS },
  // Aggressive Accelerate: spend Control on Temporal Injection at every opportunity.
  aggressive_accelerate: { machine: 'development_first', trigger: 'urgent', accelerate: true },
  // Conservative safe play: bank the credit early rather than reach for the next one.
  conservative: { machine: 'survival_first', trigger: 'cautious', accelerate: false },
  // Deliberately deep: ride every run to the cascade and eat the chaotic penalty.
  deep_run: { machine: 'balanced', trigger: 'cascade', accelerate: false },
  // Directive-optimizing: steer every intervention toward the selected objective's bonus credit and
  // yield multiplier rather than toward the safest branch.
  directive_chaser: { machine: 'balanced', trigger: 'urgent', accelerate: false, chase: true },
};

/**
 * A whole save, played forward. `stop` decides how far: 'first_universe', 'universes:<n>',
 * 'first_multiverse' or 'runs:<n>'. Returns the per-run trace plus the meta-layer timeline, which is
 * what the campaign regression tests and `npm run balance` both read.
 */
export function runCampaign({ seed = 1, strategy = 'balanced', stop = 'first_universe', maxRuns = 400 } = {}) {
  const plan = STRATEGIES[strategy] ?? STRATEGIES.balanced;
  const engine = freshCampaignEngine();
  const runs = [];
  const universes = [];
  const unlockTimeline = [];
  let seenSystems = new Set(engine.state.meta.progression.unlockedSystems);
  let multiverses = 0;
  let firstUniverseRun = 0;
  let firstUniverseSeconds = 0;
  let firstMultiverseRun = 0;
  let firstMultiverseSeconds = 0;
  let runIndex = 0;
  let simulatedSeconds = 0;
  let lastMultiverseRun = 0;
  const multiverseRuns = [];

  const stopReached = () => {
    if (stop === 'first_universe') return engine.state.meta.universesTotal >= 1;
    if (stop === 'first_multiverse') return engine.state.meta.multiversesConsumed >= 1;
    // The end of the campaign: every Great Convergence requirement met, so the run that wins the game
    // is authorized. What the horizon measures is getting here, not the terminal run itself.
    if (stop === 'convergence') return engine.convergenceUnlocked();
    if (stop.startsWith('universes:')) return engine.state.meta.universesTotal >= Number(stop.slice(10));
    if (stop.startsWith('multiverses:')) return engine.state.meta.multiversesConsumed >= Number(stop.slice(12));
    if (stop.startsWith('runs:')) return runIndex >= Number(stop.slice(5));
    return true;
  };

  while (!stopReached() && runIndex < maxRuns) {
    const runSeed = (seed * 7919 + runIndex * 104729) >>> 0 || 1;
    const result = playRun(engine, { seed: runSeed, trigger: plan.trigger, accelerate: plan.accelerate, chase: plan.chase });
    runIndex++;
    simulatedSeconds += result.elapsed;
    const affordableBefore = maximumPurchasableMachineLevels(engine);
    const containmentBefore = containmentRating(engine);
    const purchased = spendMachineCurrencies(engine, plan.machine);
    const containmentAfter = containmentRating(engine);
    runs.push({
      index: runIndex,
      ...result,
      affordableLevels: affordableBefore,
      purchased,
      purchasedCount: purchased.length,
      latticeLevel: machineLevel(engine, 'reality_lattice'),
      containment: containmentAfter,
      // The rebalance mandate's "meaningful Machine power levels": Containment is the stat that
      // lengthens the run, and a longer run buys more of everything, so it is the one axis whose
      // per-run growth decides whether the curve compounds or climbs.
      containmentGained: containmentAfter - containmentBefore,
      latticeGained: purchased.filter(id => id === 'reality_lattice').length,
      insight: engine.machineInsight(),
      creditsBanked: engine.state.machine.cultivationCreditsThisUniverse,
      universeIndex: engine.state.meta.universesTotal,
    });

    if (engine.canConsumeUniverse()) {
      const runsThisUniverse = engine.state.machine.civilizationsThisUniverse;
      const creditsAtConsumption = engine.state.machine.cultivationCreditsThisUniverse;
      const residueBefore = engine.state.meta.universalResidue;
      engine.consumeUniverse();
      const award = engine.state.meta.universalResidue - residueBefore;
      const bought = spendResidue(engine, plan.machine);
      universes.push({
        index: engine.state.meta.universesTotal,
        runsThisUniverse,
        creditsAtConsumption,
        residueAward: award,
        residueBanked: engine.state.meta.universalResidue,
        universeUpgrades: bought,
        insight: engine.machineInsight(),
        totalRuns: runIndex,
      });
      if (!firstUniverseRun) { firstUniverseRun = runIndex; firstUniverseSeconds = simulatedSeconds; }
      const now = new Set(engine.state.meta.progression.unlockedSystems);
      for (const id of now) if (!seenSystems.has(id)) unlockTimeline.push({ run: runIndex, universe: engine.state.meta.universesTotal, system: id });
      seenSystems = now;
    }
    if (engine.canConsumeMultiverse()) {
      multiverseRuns.push(runIndex - lastMultiverseRun);
      lastMultiverseRun = runIndex;
      engine.consumeMultiverse();
      multiverses = engine.state.meta.multiversesConsumed;
      if (!firstMultiverseRun) { firstMultiverseRun = runIndex; firstMultiverseSeconds = simulatedSeconds; }
      spendAxioms(engine);
      spendResidue(engine, plan.machine);
    }
    const now = new Set(engine.state.meta.progression.unlockedSystems);
    for (const id of now) if (!seenSystems.has(id)) unlockTimeline.push({ run: runIndex, universe: engine.state.meta.universesTotal, system: id });
    seenSystems = now;
  }

  return {
    seed, strategy, runs, universes, unlockTimeline, multiverseRuns,
    convergenceUnlocked: engine.convergenceUnlocked(),
    convergenceRequirements: engine.convergenceRequirements(),
    milestonesCompleted: Object.keys(engine.state.meta.progression.milestones).length,
    totalRuns: runIndex,
    firstUniverseRun, firstUniverseSeconds,
    firstMultiverseRun, firstMultiverseSeconds,
    universesTotal: engine.state.meta.universesTotal,
    multiverses,
    insight: engine.machineInsight(),
    bestDepth: Math.max(0, ...runs.map(run => run.depth)),
    simulatedSeconds,
    engine,
  };
}
