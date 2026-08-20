import { civilizationDramaPhase } from '../game/drama.js';
import { qualityFactors } from './quality.js';
// The hard ceilings the whole renderer is budgeted against. Exported so the tests can state the
// budget rather than repeat the literals, and so adaptive quality can only ever stay under them.
export const MAX_PARTICLES = 150;
export const MAX_HAZE_BANDS = 9;
export const MAX_FRACTURES = 12;
export const MAX_BEACONS = 10;
export function developmentStage(civ) {
    return civilizationDramaPhase(civ).id;
}
export function worldWidthMultiplier(civ) {
    return [1.5, 1.9, 2.5, 3.2, 4.0][developmentStage(civ)] ?? 1.5;
}
/**
 * The counts that follow continuously ticking stats -- attention, awareness, stability, entropy --
 * rather than the structural bands the cached scene is keyed on. The dynamic layer samples these
 * every frame; everything else in `worldSnapshot` comes from the scene and must not be recomputed.
 * `stage` is a parameter so a caller holding a cached scene pays nothing to pass it in.
 */
export function liveWorldSample(civ, stage = developmentStage(civ)) {
    const entropy = Math.max(0, Math.min(100, civ.tactical.entropy));
    const entropyBand = Math.min(4, Math.floor(entropy / 25));
    return {
        particleCount: Math.max(18, Math.min(MAX_PARTICLES, 18 + stage * 12 + Math.trunc(civ.stats.attention / 3) + Math.trunc(civ.stats.awareness / 5) + entropyBand * 7)),
        hazeBands: Math.max(2, Math.min(MAX_HAZE_BANDS, 2 + civ.era + Math.trunc(civ.stats.attention / 35) + entropyBand)),
        fractureCount: Math.min(MAX_FRACTURES, Math.max(civ.stats.stability < 55 ? Math.ceil((55 - civ.stats.stability) / 5) : 0, entropyBand * 2)),
        beaconCount: civ.stats.awareness >= 35 ? Math.max(1, Math.min(MAX_BEACONS, Math.trunc(civ.stats.awareness / 12))) : 0,
        entropyBand,
    };
}
/**
 * Sheds cosmetics only. Fractures and beacons are how Stability and Awareness are read off the
 * world, so a tier never reduces them -- a player must not lose a signal because their device is
 * slow.
 */
export function applyQualityToLiveSample(sample, tier) {
    const factors = qualityFactors(tier);
    return {
        ...sample,
        particleCount: Math.max(4, Math.min(MAX_PARTICLES, Math.floor(sample.particleCount * factors.particleFraction))),
        hazeBands: Math.max(2, Math.min(MAX_HAZE_BANDS, Math.ceil(sample.hazeBands * factors.hazeFraction))),
        fractureCount: Math.min(MAX_FRACTURES, sample.fractureCount),
        beaconCount: Math.min(MAX_BEACONS, sample.beaconCount),
    };
}
export function worldSnapshot(civ, viewportWidth) {
    const stage = developmentStage(civ);
    const institutionCount = civ.institutions.length;
    const development = civ.development;
    let buildingCount = 3;
    if (stage === 0)
        buildingCount = Math.max(3, Math.min(8, 3 + institutionCount + Math.trunc(development / 120)));
    else if (stage === 1)
        buildingCount = Math.max(7, Math.min(18, 7 + civ.era * 2 + institutionCount * 2 + Math.trunc(development / 55)));
    else if (stage === 2)
        buildingCount = Math.max(13, Math.min(30, 13 + civ.era * 3 + institutionCount * 2 + Math.trunc(development / 36)));
    else if (stage === 3)
        buildingCount = Math.max(22, Math.min(52, 22 + civ.era * 4 + institutionCount * 3 + Math.trunc(development / 24)));
    else
        buildingCount = Math.max(34, Math.min(84, 34 + civ.era * 5 + institutionCount * 4 + Math.trunc(development / 16)));
    const settlementCount = Math.max(1, Math.min(9, 1 + stage * 2 + Math.trunc(civ.era / 2)));
    const agentBudget = {
        pedestrians: Math.max(4, Math.min(60, 4 + stage * 8 + Math.trunc(development / 26) + civ.era * 6)),
        vehicles: stage >= 1 ? Math.max(2, Math.min(34, stage * 4 + Math.trunc(development / 45) + civ.era * 3)) : 0,
        aircraft: stage >= 2 && civ.era >= 1 ? Math.max(1, Math.min(14, (stage - 1) * 2 + civ.era + Math.trunc(development / 220))) : 0,
        orbital: stage >= 3 && civ.era >= 1 ? Math.max(1, Math.min(8, stage - 2 + Math.trunc(development / 320))) : 0,
        launches: stage >= 3 && civ.era >= 2 ? Math.max(1, Math.min(4, stage - 2)) : 0,
    };
    return {
        stage,
        settlementCount,
        agentBudget,
        worldWidth: Math.max(viewportWidth, Math.round(viewportWidth * worldWidthMultiplier(civ))),
        buildingCount,
        ...liveWorldSample(civ, stage),
    };
}
//# sourceMappingURL=world-model.js.map