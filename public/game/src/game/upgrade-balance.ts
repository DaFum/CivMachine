interface UpgradeOverride {
  base_cost?: number;
  growth: number;
  description: string;
  cost_ladder?: readonly number[];
}

/**
 * Reality Lattice prices its own levels instead of inheriting a growth factor.
 *
 * The first level stays at 60 on purpose: the design has always been that a first weak run, even one
 * that collapses, can afford one real survival improvement. Everything after it is steeply
 * progressive, because Containment is the one stat that lengthens the run and a longer run buys more
 * of everything -- so cheap repeat Containment compounds into itself. Measured on v1.19, a single
 * controlled Depth 8 run bought six levels at once and took a fresh save from Containment 0 to 10.
 *
 * The ladder is also what makes the other three Containment modules a real choice: at 180 the second
 * Lattice level is dearer than a first Awareness Scrubber at 150, so from the second purchase onward
 * the survival build has to be assembled rather than stacked.
 */
const REALITY_LATTICE_LADDER = [60, 600, 1800, 4500, 11000, 26000, 60000, 140000] as const;

/**
 * The other three Containment modules are laddered for the same reason and one more: without it,
 * pricing Reality Lattice progressively would simply move the stacking one module to the left.
 * Containment is fungible -- the pressure curve reads the sum -- so the escalation has to be a
 * property of Containment rather than of any single module, or the cheapest module is always the
 * right answer and the "choice" between them is arithmetic.
 *
 * They stay dearer at level 1 than Reality Lattice's opening 60 and cheaper than its 180 second rung,
 * which is what keeps the intended opening shape: the first survival purchase is Lattice, the second
 * is a real decision between four modules that no longer have an obvious winner.
 */
const AWARENESS_SCRUBBER_LADDER = [520, 1650, 4200, 10000, 24000] as const;
const SANITY_PROTOCOL_LADDER = [560, 1750, 4400, 10500, 25000] as const;
const COSMIC_MUFFLING_LADDER = [520, 1650, 4200, 10000, 24000] as const;

const MACHINE_OVERRIDES: Readonly<Record<string, UpgradeOverride>> = {
  reality_lattice: { base_cost: 60, growth: 1.9, cost_ladder: REALITY_LATTICE_LADDER, description: '+1 Containment per level, which slows Entropy in every era. +10 starting and maximum Reality Stability per level. Each level costs sharply more than the last.' },
  prediction_core: { base_cost: 90, growth: 1.60, description: 'Probing an intervention softens what it costs, by 12% per level. Higher levels also make Probe reports increasingly exact.' },
  cultivation_accelerator: { base_cost: 120, growth: 1.68, description: '+12% civilization development speed per level.' },
  historical_compressor: { base_cost: 120, growth: 1.68, description: '+12% Causal Mass per level. Level 3 adds +2.5% Harvest Grade yield.' },
  cognitive_extractor: { base_cost: 120, growth: 1.68, description: '+12% Cognition per level. Level 3 adds +2.5% Harvest Grade yield.' },
  paradox_sieve: { base_cost: 110, growth: 1.68, description: '+15% Paradox per level. Level 3 adds +2.5% Harvest Grade yield.' },
  existence_furnace: { base_cost: 130, growth: 1.70, description: '+12% Existence per level. Level 3 adds +2.5% Harvest Grade yield.' },
  awareness_scrubber: { base_cost: 150, growth: 2.2, cost_ladder: AWARENESS_SCRUBBER_LADDER, description: '+1 Containment per level. Reduces Machine Awareness gain by 8% per level. Each level costs sharply more than the last.' },
  sanity_protocol: { base_cost: 165, growth: 2.2, cost_ladder: SANITY_PROTOCOL_LADDER, description: '+1 Containment per level. Reduces Collective Sanity losses by 8% per level. Each level costs sharply more than the last.' },
  cosmic_muffling: { base_cost: 150, growth: 2.2, cost_ladder: COSMIC_MUFFLING_LADDER, description: '+1 Containment per level. Reduces Cosmic Attention gain by 8% per level. Each level costs sharply more than the last.' },
  contingency_vat: { base_cost: 210, growth: 1.75, description: 'Improves non-Paradox rewards from chaotic harvests and retains one-run mutations.' },
  temporal_injector: { base_cost: 220, growth: 1.75, description: 'Each level injects more years and more Development into a Temporal Injection. Simulation speed is earned with Machine Insight instead.' },
};

const UNIVERSE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  stable_constants: '+1 Containment per level, stacking with every machine containment module.',
  wide_lattice: 'Preserves this many Reality Lattice levels through Universe consumption.',
  bureaucracy_of_gods: 'Restores +1 additional Control after interventions; at level 3 it restores the full capacity.',
};

/**
 * The two Universe upgrades that buy Containment have to be priced against the Machine ladder they
 * short-circuit, or the Universe layer answers the survival question for free.
 *
 * Wide Lattice carries Reality Lattice levels through a prestige. Once those levels cost 60, 600,
 * 1800 and 4500 Causal Mass, six preserved levels are worth over forty thousand Causal Mass -- and at
 * the frozen catalog's 2/4/6/11/19/33 the whole ladder cost 75 Universal Residue, roughly two
 * Universes. Every other Universe upgrade was then a rounding error, which is exactly the failure
 * mode the rebalance mandate names.
 *
 * Stable Constants is the same trade in permanent form: +1 Containment for good, against a Machine
 * module that charges 600 and then 1800 for the same point and loses it at every prestige. Both are
 * meant to be the long arc of the Universe layer -- a level per few Universes, not a level per
 * Universe -- so the residue that is not spent on them can go to Twin Harvest, Paradox Rights,
 * Bureaucracy or the Refinery and have those be real choices.
 */
const WIDE_LATTICE_LADDER = [5, 14, 34, 75, 155, 320] as const;
const STABLE_CONSTANTS_LADDER = [6, 18, 45, 100, 210] as const;

const UNIVERSE_LADDERS: Readonly<Record<string, readonly number[]>> = {
  wide_lattice: WIDE_LATTICE_LADDER,
  stable_constants: STABLE_CONSTANTS_LADDER,
};

export function balancedMachineUpgrades<T extends { id: string; base_cost: number; growth: number; description?: string }>(catalog: readonly T[]): Array<T & { cost_ladder?: readonly number[] }> {
  return catalog.map(definition => {
    const override = MACHINE_OVERRIDES[definition.id];
    return override ? { ...definition, ...override } : { ...definition, growth: Math.max(1.45, Math.min(1.65, Number(definition.growth))) };
  });
}

export function balancedUniverseUpgrades<T extends { id: string; growth: number; description?: string }>(catalog: readonly T[]): Array<T & { cost_ladder?: readonly number[] }> {
  return catalog.map(definition => ({
    ...definition,
    growth: Math.min(1.75, Number(definition.growth)),
    description: UNIVERSE_DESCRIPTIONS[definition.id] ?? definition.description,
    ...(UNIVERSE_LADDERS[definition.id] ? { cost_ladder: UNIVERSE_LADDERS[definition.id] } : {}),
  }));
}

export function balancedAxiomUpgrades<T extends { growth: number }>(catalog: readonly T[]): T[] {
  return catalog.map(definition => ({ ...definition, growth: Math.max(2.15, Number(definition.growth)) }));
}

/**
 * The early Directive pool has to offer three different bets, not one correct answer and two taxes.
 *
 * Accelerated Development is the one that needed the work: it multiplied Development, then asked for
 * Development, and paid a yield multiplier plus a Cultivation Credit for arriving. Its Attention
 * surcharge was the only counterweight and 1.2x of a stat that starts at zero is not a counterweight.
 * The Directive keeps its identity -- it is still the fast, loud, fragile option -- but now pays for
 * the speed in the currency that decides run length, so choosing it commits the player to a shorter,
 * hotter run instead of simply handing them a better one.
 *
 * Stable Cultivation's yield penalty eased in exchange, because its objective got stricter, and
 * Cognitive Extraction gained the Awareness push its objective actually asks for.
 */
const DIRECTIVE_EFFECT_OVERRIDES: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  accelerated_development: { development_mult: 1.15, attention_gain_mult: 1.4, stability_decay_mult: 1.25 },
  stable_cultivation: { stability_decay_mult: 0.72, all_harvest_mult: 0.95 },
  cognitive_extraction: { cognition_mult: 1.55, awareness_gain_mult: 1.25, sanity_loss_mult: 1.15 },
};

export function balancedDirectives<T extends { id: string; effects?: Record<string, unknown> }>(catalog: readonly T[]): T[] {
  return catalog.map(definition => {
    const override = DIRECTIVE_EFFECT_OVERRIDES[definition.id];
    return override ? { ...definition, effects: { ...definition.effects, ...override } } : definition;
  });
}
