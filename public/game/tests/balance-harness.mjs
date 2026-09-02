import { GameEngine } from '../dist/game/engine.js';
import { ventStabilityCost } from '../dist/game/tactical-actions.js';
import { Progression } from '../dist/game/progression.js';
import { upgradeCost } from '../dist/game/rules.js';

export function freshEngine() {
  return new GameEngine({
    autosave: false,
    storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  });
}

export function safestChoiceIndex(event) {
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
    if (score > bestScore) { bestScore = score; best = index; }
  }
  return best;
}

export function withUpgrades(engine, machineLevels = {}, universeLevels = {}) {
  engine.state.meta.progression.machineInsight = 30;
  if (Object.keys(universeLevels).length && !engine.systemUnlocked('universe_upgrades')) {
    engine.state.meta.progression.unlockedSystems.push('universe_upgrades');
  }
  Object.assign(engine.state.machine.upgradeLevels, machineLevels);
  Object.assign(engine.state.meta.universeUpgradeLevels, universeLevels);
  return engine;
}

// policy: 'safe' resolves interventions only. 'vent', 'stabilize', 'accelerate' and
// 'reserve' additionally spend the named action at every opportunity.
//
// 'manage' is the one that models a player rather than a stress test: it vents when Entropy actually
// threatens the run and Stability can still pay the next -- escalating -- vent. Since v1.20.0 vents
// are a finite budget, so 'vent' means "spend the whole budget immediately", which is a legitimate
// Paradox-farming line but is no longer how a long run is played.
export function runCivilization(engine, { seed = 0, policy = ['safe'], harvestAt = 'never', dt = 0.25, maxSeconds = 2400 } = {}) {
  const runBuild = engine.state.machine.runBuild;
  if (engine.systemUnlocked('directives') && runBuild.directiveOfferIds.length && !runBuild.selectedDirective) {
    engine.selectDirective(runBuild.directiveOfferIds[0]);
  }
  if (!engine.startCivilization(seed)) throw new Error(`startCivilization failed: ${engine.lastActionFailure}`);
  const eventIds = [];
  let elapsed = 0;
  let interventions = 0;
  // The intervention branch continues without advancing elapsed, so the elapsed guard cannot bound
  // it. An event whose choice never resolves would spin forever and hang the suite instead of
  // failing it, so the loop carries a hard iteration cap as well.
  let iterations = 0;
  const maxIterations = Math.ceil(maxSeconds / dt) * 4;
  while (engine.state.phase === 'civilization' && elapsed < maxSeconds) {
    if (++iterations > maxIterations) throw new Error(`runCivilization did not terminate after ${iterations} iterations`);
    const civ = engine.state.civilization;
    const event = engine.currentEvent();
    if (event) {
      eventIds.push(event.id);
      interventions++;
      engine.chooseEvent(safestChoiceIndex(event));
      continue;
    }
    if (policy.includes('vent')) engine.useTacticalAction('vent');
    if (policy.includes('manage')) {
      const nextVent = ventStabilityCost(civ.tactical.actionUsage.vent);
      if (civ.tactical.entropy >= 55 && civ.stats.stability > 25 + nextVent) engine.useTacticalAction('vent');
      else if (civ.stats.stability < 30) engine.useTacticalAction('stabilize');
    }
    if (policy.includes('stabilize')) engine.useTacticalAction('stabilize');
    if (policy.includes('accelerate')) engine.useTacticalAction('accelerate');
    if (policy.includes('reserve') && typeof engine.runInterventions === 'function') {
      for (const definition of engine.runInterventions()) engine.useRunIntervention(definition.id);
    }
    if (harvestAt === 'transcendent' && civ.era >= 2) { engine.harvest(false); break; }
    engine.tick(dt);
    elapsed += dt;
  }
  return {
    elapsed,
    cascaded: Boolean(engine.state.machine.lastHarvest?.chaotic),
    interventions,
    eventIds,
    harvest: { ...engine.state.machine.lastHarvest },
  };
}

// The most Machine levels the current bank could buy if it were spent perfectly, per currency.
//
// Two things this has to get right, and both were once wrong. It prices through `cost_ladder`, because
// a module that authors its own rungs is charged those rungs -- pricing Reality Lattice geometrically
// read 60/114/217 where the game charges 60/600/1800 and overstated purchase power accordingly. And it
// counts only levels the Machine does not already own: `max_level` is a ceiling, not an allowance.
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
    const owned = engine.upgradeLevel('machine', definition.id);
    const headroom = Math.max(0, Number(definition.max_level) - owned);
    const ladder = Array.isArray(definition.cost_ladder) ? definition.cost_ladder : undefined;
    let best = 0;
    let spent = 0;
    for (let levels = 0; levels <= headroom; levels++) {
      if (spent > remaining) break;
      best = Math.max(best, levels + maximize(definitions, index + 1, remaining - spent));
      spent += upgradeCost(Number(definition.base_cost), Number(definition.growth), owned + levels, ladder);
    }
    return best;
  };

  let total = 0;
  for (const [currency, definitions] of groups) total += maximize(definitions, 0, engine.currencyAmount(currency));
  return total;
}
