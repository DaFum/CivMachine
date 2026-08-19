export const RESOURCE_KEYS = ['causal_mass', 'cognition', 'paradox', 'existence'];
export const SAVE_VERSION = 2;
export function createNewState() {
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
            axioms: 0, axiomLevels: {}, multiversesConsumed: 0,
            progression: {
                machineInsight: 0,
                unlockedSystems: ['machine_upgrades', 'civilization', 'controlled_harvest'],
                discoveredResources: ['causal_mass'],
                knownDirectives: [], knownBreedingMatrices: [], knownAxioms: [], milestones: {}, announcedUnlocks: [],
                controlledHarvestsTotal: 0, chaoticHarvestsTotal: 0
            }
        },
        civilization: null
    };
}
export function upgradeCost(baseCost, growth, level) {
    return Math.max(1, Math.round(baseCost * Math.pow(Math.max(1, growth), Math.max(0, level))));
}
export function calculateHarvest(civ, chaotic, bonuses) {
    const years = Math.max(0, civ.years);
    const development = Math.max(1, civ.development);
    const era = Math.max(0, Math.min(2, civ.era));
    const eventChoices = Math.max(0, civ.eventChoices);
    const { stability, awareness, sanity, attention } = civ.stats;
    const raw = {
        causal_mass: years / 70 + development * 0.95 + eventChoices * 4,
        cognition: development * 1.25 + awareness * 0.9 + eventChoices * 2.5,
        paradox: (100 - stability) * 1.15 + attention * 0.75 + (100 - sanity) * 0.5 + era * 18,
        existence: development * 0.82 + years / 115 + era * 55
    };
    const result = {};
    for (const key of RESOURCE_KEYS) {
        let value = (raw[key] + (civ.harvestBonus[key] ?? 0)) * (civ.harvestMult[key] ?? 1) * Math.max(0.05, bonuses.allHarvestMult);
        if (chaotic)
            value *= key === 'paradox' ? 1.50 : Math.max(0.1, Math.min(1, bonuses.chaoticRetention));
        result[key] = Math.max(0, Math.round(value));
    }
    return result;
}
export function universeResidueAward(civilizations, bank, multiplier) {
    const civTerm = Math.pow(Math.max(0, civilizations), 1.15) / 2.6;
    const bankTerm = Math.sqrt(Math.max(0, bank)) / 35;
    return Math.max(1, Math.floor((civTerm + bankTerm) * Math.max(0.1, multiplier)));
}
export function multiverseAxiomAward(universes, universalLevels) {
    const universeTerm = Math.sqrt(Math.max(0, universes)) / 1.6;
    const upgradeTerm = Math.max(0, universalLevels) / 4;
    return Math.max(1, Math.floor(universeTerm + upgradeTerm));
}
//# sourceMappingURL=rules.js.map