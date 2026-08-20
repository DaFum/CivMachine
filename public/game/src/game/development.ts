import { CivilizationPaths } from './paths.js';
import type { Civilization } from './types.js';

export const DEVELOPMENT_BASE_RATE = .75;
export const DEVELOPMENT_ERA_BONUS = .2;
export const ENTROPY_DRAG_MAX = .5;

/**
 * What Entropy costs below the cascade threshold. Until v1.6.0 the answer was nothing: `cascadeDecay`
 * only fires at 100, and the three threshold crises move Entropy by -2 to +4, so the four bands the
 * interface names -- CONTAINED, STRAINED, FRACTURED, CRITICAL -- were free. Measured, that taught the
 * wrong play: venting on the interface's alarm cost 69 seconds of run and 2 Cultivation Credits
 * against venting only at the cascade edge.
 *
 * The drag is quadratic so the band names map onto real costs: -3% at 25, -12.5% at 50, -28% at 75,
 * -50% at 100. Low Entropy stays cheap to carry, high Entropy has to be answered, and the two clocks
 * the v1.5.0 design wanted -- Stability spent on venting against yield lost to pressure -- finally
 * both tick.
 */
export function entropyDrag(entropy: number): number {
  const share = Math.max(0, Math.min(100, Number(entropy) || 0)) / 100;
  return 1 - ENTROPY_DRAG_MAX * share * share;
}

/**
 * Development gained per simulation second. Owned here rather than inline in `GameEngine.tick` so the
 * interface can forecast the next Cultivation Depth band from the same expression the tick applies;
 * a second copy would drift and the forecast would quietly lie.
 */
export function developmentGrowthPerSecond(civ: Civilization, paradoxFoodLevel = 0): number {
  const low = Math.max(0, Math.min(1, (100 - civ.stats.stability) / 100));
  const paradoxGrowth = 1 + low * .35 * Math.max(0, paradoxFoodLevel);
  const institution = civ.institutions.includes('Consensus Office') ? 1.05 : 1;
  return DEVELOPMENT_BASE_RATE
    * (1 + DEVELOPMENT_ERA_BONUS * civ.era)
    * Math.max(.2, civ.developmentMultiplier)
    * paradoxGrowth
    * institution
    * CivilizationPaths.simulationModifier(civ, 'development')
    * entropyDrag(civ.tactical.entropy);
}
