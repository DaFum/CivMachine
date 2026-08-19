interface UpgradeOverride {
  base_cost?: number;
  growth: number;
  description: string;
}

const MACHINE_OVERRIDES: Readonly<Record<string, UpgradeOverride>> = {
  reality_lattice: { base_cost: 90, growth: 1.62, description: 'Containment +1 once installed. +10 starting and maximum Reality Stability per level.' },
  prediction_core: { base_cost: 90, growth: 1.60, description: 'Reveals intervention outcomes; higher levels make tactical Probe reports increasingly exact.' },
  cultivation_accelerator: { base_cost: 120, growth: 1.68, description: '+12% civilization development speed per level.' },
  historical_compressor: { base_cost: 120, growth: 1.68, description: '+12% Causal Mass per level. Level 3 adds +2.5% Harvest Grade yield.' },
  cognitive_extractor: { base_cost: 120, growth: 1.68, description: '+12% Cognition per level. Level 3 adds +2.5% Harvest Grade yield.' },
  paradox_sieve: { base_cost: 110, growth: 1.68, description: '+15% Paradox per level. Level 3 adds +2.5% Harvest Grade yield.' },
  existence_furnace: { base_cost: 130, growth: 1.70, description: '+12% Existence per level. Level 3 adds +2.5% Harvest Grade yield.' },
  awareness_scrubber: { base_cost: 150, growth: 1.68, description: 'Containment +1 once installed. Reduces Machine Awareness gain by 8% per level.' },
  sanity_protocol: { base_cost: 165, growth: 1.70, description: 'Containment +1 once installed. Reduces Collective Sanity losses by 8% per level.' },
  cosmic_muffling: { base_cost: 150, growth: 1.70, description: 'Containment +1 once installed. Reduces Cosmic Attention gain by 8% per level.' },
  contingency_vat: { base_cost: 210, growth: 1.75, description: 'Improves non-Paradox rewards from chaotic harvests and retains one-run mutations.' },
  temporal_injector: { base_cost: 220, growth: 1.75, description: 'Unlocks 2× simulation speed, then 4× at level 3; each level strengthens Accelerate.' },
};

const UNIVERSE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  stable_constants: 'Reduces Entropy gain by 12% per level without slowing intervention cadence.',
  bureaucracy_of_gods: 'Restores +1 additional Control after interventions; at level 3 it restores the full capacity.',
};

export function balancedMachineUpgrades<T extends { id: string; base_cost: number; growth: number; description: string }>(catalog: readonly T[]): T[] {
  return catalog.map(definition => {
    const override = MACHINE_OVERRIDES[definition.id];
    return override ? { ...definition, ...override } : { ...definition, growth: Math.max(1.45, Math.min(1.65, Number(definition.growth))) };
  });
}

export function balancedUniverseUpgrades<T extends { id: string; growth: number; description: string }>(catalog: readonly T[]): T[] {
  return catalog.map(definition => ({
    ...definition,
    growth: Math.max(1.9, Number(definition.growth)),
    description: UNIVERSE_DESCRIPTIONS[definition.id] ?? definition.description,
  }));
}

export function balancedAxiomUpgrades<T extends { growth: number }>(catalog: readonly T[]): T[] {
  return catalog.map(definition => ({ ...definition, growth: Math.max(2.15, Number(definition.growth)) }));
}
