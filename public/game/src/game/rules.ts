import type { Civilization, GameState, ResourceKey, RuntimeBonuses } from './types.js';

export const RESOURCE_KEYS: ResourceKey[] = ['causal_mass', 'cognition', 'paradox', 'existence'];
export const SAVE_VERSION = 4;
export const ERA_YEAR_THRESHOLDS = [0, 2500, 6500, 14000] as const;

export function eraForYears(years: number): number {
  const safe = Math.max(0, Number(years) || 0);
  for (let era = ERA_YEAR_THRESHOLDS.length - 1; era > 0; era--) if (safe >= ERA_YEAR_THRESHOLDS[era]!) return era;
  return 0;
}

export function createNewState(): GameState {
  return {
    saveVersion: SAVE_VERSION,
    phase: 'machine',
    simulationSpeed: 1,
    machine: {
      currencies: { causal_mass: 0, cognition: 0, paradox: 0, existence: 0 },
      upgradeLevels: {}, activeMutations: [], civilizationsTotal: 0, civilizationsThisUniverse: 0,
      cultivationCreditsThisUniverse: 0, lastHarvest: {},
      runBuild: {
        selectedDirective: '', selectedBreedingMatrix: '', directiveLocked: false, matrixLocked: false,
        directiveOfferIds: [], nextCivilizationSeed: 0, previewTraitIds: []
      }
    },
    meta: {
      universalResidue: 0, universeUpgradeLevels: {}, universesTotal: 0, universesThisMultiverse: 0,
      axioms: 0, axiomLevels: {}, multiversesConsumed: 0, convergences: 0, victories: [],
      progression: {
        machineInsight: 0,
        unlockedSystems: ['machine_upgrades', 'civilization', 'controlled_harvest'],
        discoveredResources: ['causal_mass'],
        knownDirectives: [], knownBreedingMatrices: [], knownAxioms: [], milestones: {}, announcedUnlocks: [],
        controlledHarvestsTotal: 0, chaoticHarvestsTotal: 0,
        seenDominantPaths: [], bestDepth: 0, bestGrade: '', maxDevelopment: 0, maxEra: 0,
        objectivesCompleted: 0, longestRunSeconds: 0, maxEndgamesInRun: 0
      }
    },
    civilization: null
  };
}

export function upgradeCost(baseCost: number, growth: number, level: number): number {
  return Math.max(1, Math.round(baseCost * Math.pow(Math.max(1, growth), Math.max(0, level))));
}

export function calculateHarvest(civ: Civilization, chaotic: boolean, bonuses: RuntimeBonuses): Record<ResourceKey, number> {
  const years = Math.max(0, civ.years);
  const development = Math.max(1, civ.development);
  const era = Math.max(0, Math.min(3, civ.era));
  const eventChoices = Math.max(0, civ.eventChoices);
  const { stability, awareness, sanity, attention } = civ.stats;
  const raw: Record<ResourceKey, number> = {
    causal_mass: years / 70 + development * 0.95 + eventChoices * 4,
    cognition: development * 1.25 + awareness * 0.9 + eventChoices * 2.5,
    paradox: (100 - stability) * 1.15 + attention * 0.75 + (100 - sanity) * 0.5 + era * 18,
    existence: development * 0.82 + years / 115 + era * 55
  };
  const result = {} as Record<ResourceKey, number>;
  for (const key of RESOURCE_KEYS) {
    let value = (raw[key] + (civ.harvestBonus[key] ?? 0)) * (civ.harvestMult[key] ?? 1) * Math.max(0.05, bonuses.allHarvestMult);
    if (chaotic) value *= key === 'paradox' ? 1.50 : Math.max(0.1, Math.min(1, bonuses.chaoticRetention));
    result[key] = Math.max(0, Math.round(value));
  }
  return result;
}

export function universeResidueAward(credits: number, bank: number, multiplier: number): number {
  const creditTerm = Math.pow(Math.max(0, credits), 1.15) / 1.2;
  const bankTerm = Math.sqrt(Math.max(0, bank)) / 10;
  return Math.max(1, Math.floor((creditTerm + bankTerm) * Math.max(0.1, multiplier)));
}

export function multiverseAxiomAward(universes: number, universalLevels: number): number {
  return Math.max(1, Math.floor(Math.pow(Math.max(0, universes), 1.1) / 2 + Math.max(0, universalLevels) / 3));
}
