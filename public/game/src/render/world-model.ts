import type { Civilization } from '../game/types.js';

/**
 * Placeholder docstring for developmentStage.
 */
export function developmentStage(civ: Civilization): number {
  const score = civ.development + civ.era * 120 + civ.institutions.length * 30 + civ.eventChoices * 6;
  if (score < 70) return 0;
  if (score < 180) return 1;
  if (score < 340) return 2;
  if (score < 560) return 3;
  return 4;
}

/**
 * Placeholder docstring for worldWidthMultiplier.
 */
export function worldWidthMultiplier(civ: Civilization): number {
  return [1.5, 1.9, 2.5, 3.2, 4.0][developmentStage(civ)] ?? 1.5;
}

/**
 * Placeholder docstring for worldSnapshot.
 */
export function worldSnapshot(civ: Civilization, viewportWidth: number) {
  const stage = developmentStage(civ);
  const institutionCount = civ.institutions.length;
  const development = civ.development;
  const entropy = Math.max(0, Math.min(100, civ.tactical.entropy));
  const entropyBand = Math.min(4, Math.floor(entropy / 25));
  let buildingCount = 3;
  if (stage === 0) buildingCount = Math.max(3, Math.min(8, 3 + institutionCount + Math.trunc(development / 120)));
  else if (stage === 1) buildingCount = Math.max(7, Math.min(18, 7 + civ.era * 2 + institutionCount * 2 + Math.trunc(development / 55)));
  else if (stage === 2) buildingCount = Math.max(13, Math.min(30, 13 + civ.era * 3 + institutionCount * 2 + Math.trunc(development / 36)));
  else if (stage === 3) buildingCount = Math.max(22, Math.min(52, 22 + civ.era * 4 + institutionCount * 3 + Math.trunc(development / 24)));
  else buildingCount = Math.max(34, Math.min(84, 34 + civ.era * 5 + institutionCount * 4 + Math.trunc(development / 16)));
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
    populationDots: Math.max(8, Math.min(230, 8 + stage * 12 + Math.trunc(development / 12) + civ.era * 18)),
    trafficCount: stage >= 1 ? Math.max(3, Math.min(72, stage * 5 + Math.trunc(development / 30) + civ.era * 4)) : 0,
    aircraftCount: stage >= 2 && civ.era >= 1 ? Math.max(1, Math.min(18, 1 + (stage - 1) * 2 + civ.era + Math.trunc(development / 180))) : 0,
    satelliteCount: stage >= 3 && civ.era >= 1 ? Math.max(1, Math.min(8, 1 + stage - 2 + Math.trunc(development / 320))) : 0,
    particleCount: Math.max(18, Math.min(150, 18 + stage * 12 + Math.trunc(civ.stats.attention / 3) + Math.trunc(civ.stats.awareness / 5) + entropyBand * 7)),
    hazeBands: Math.max(2, Math.min(9, 2 + civ.era + Math.trunc(civ.stats.attention / 35) + entropyBand)),
    fractureCount: Math.max(civ.stats.stability < 55 ? Math.ceil((55 - civ.stats.stability) / 5) : 0, entropyBand * 2),
    beaconCount: civ.stats.awareness >= 35 ? Math.max(1, Math.min(10, Math.trunc(civ.stats.awareness / 12))) : 0,
    entropyBand,
  };
}
