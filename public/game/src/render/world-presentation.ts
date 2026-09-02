import type { Civilization } from '../game/types.js';
import { developmentStage, worldSnapshot } from './world-model.js';
import { mixColor as mix, pathAccentFor } from './primitives.js';
import { speciesProfile } from './species.js';
import { factionSignature } from './factions.js';
import { settlementClassSignature } from './settlements.js';
import { identitySignature } from './identity.js';
import { worldMemorySignature } from './world-memory.js';

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const band = (value: number): number => value < 25 ? 0 : value < 50 ? 1 : value < 75 ? 2 : 3;

export function worldPresentation(civ: Civilization) {
  const stability = clamp01(civ.stats.stability / Math.max(1, civ.stats.stabilityMax));
  const danger = clamp01((55 - civ.stats.stability) / 55);
  const sanityDistortion = clamp01((60 - civ.stats.sanity) / 60);
  const awareness = clamp01(civ.stats.awareness / 100);
  const attention = clamp01(civ.stats.attention / 100);
  const entropy = clamp01(civ.tactical.entropy / 100);
  const accent = pathAccentFor(civ.pathState.dominantPath);
  const eraLight = clamp01((civ.era + developmentStage(civ) * .35) / 4.4);

  return {
    accent,
    danger,
    sanityDistortion,
    awareness,
    attention,
    entropy,
    stability,
    // One named channel per authoritative state, so every one of them owns a distinct visual role
    // instead of several sharing a full-screen colour wash. Bounded to 0..1 and deliberately kept out
    // of `structuralWorldKey`: these follow live values, and keying on them would rebuild 60x/s.
    signals: {
      structuralStrain: danger,
      motionIrregularity: sanityDistortion,
      outwardObservation: awareness,
      observerPressure: attention,
      realityFailure: entropy,
      activity: clamp01((developmentStage(civ) + Math.min(1, civ.development / 560)) / 5),
    },
    bands: {
      stability: band(civ.stats.stability),
      sanity: band(civ.stats.sanity),
      awareness: band(civ.stats.awareness),
      attention: band(civ.stats.attention),
      entropy: band(civ.tactical.entropy),
    },
    // Urban light output: how lit the world reads at night. It follows the same activity the
    // agents do, so a developed world is a brighter one without any state needing its own wash.
    lightLevel: clamp01(.22 + developmentStage(civ) * .14 + Math.min(.24, civ.development / 2400) + civ.era * .04),
    colors: {
      // Entropy and danger own the sky, the haze and the terrain -- the surfaces a player reads at a
      // glance. They are deliberately weaker on `settlement` and `window`: tinting every building and
      // every lit window the same red turned one state into a full-screen colour filter, which is the
      // one thing this palette must not do. Entropy stays legible through the ember light, the
      // fracture lines and the sky instead.
      skyTop: mix(mix(0x050815, danger > .45 ? 0x250711 : 0x091a2d, Math.max(eraLight * .45, danger * .6)), 0x290705, entropy * .62),
      skyBottom: mix(mix(0x10263a, danger > .45 ? 0x6a1d29 : accent, .16 + attention * .2 + eraLight * .12), 0x7d2c18, entropy * .48),
      // The band just above the ridgeline, brighter and warmer than the sky above it, so the
      // silhouettes have something to sit against.
      skyHorizon: mix(mix(0x2c4256, danger > .45 ? 0x7d2733 : accent, .22 + attention * .18 + eraLight * .16), 0x8f3a1c, entropy * .5),
      farTerrain: mix(mix(0x142738, accent, .08 + awareness * .12), 0x52251d, entropy * .38),
      // One ridge per parallax band rather than one terrain colour: the mid ridge is resolved here
      // instead of being mixed at the draw site, so the three silhouettes keep a fixed contrast order.
      midTerrain: mix(mix(0x0f1e2c, accent, .07 + awareness * .09), 0x4a1e18, entropy * .42),
      nearTerrain: mix(mix(0x0a121c, danger > .5 ? 0x35121b : accent, .08 + danger * .16), 0x43120e, entropy * .5),
      // The ground plane the settlements stand on, and the foreground bank below the road. Separate
      // colours because a single flat fill for both is what made the lower third read as dead space.
      groundNear: mix(mix(0x0c141d, danger > .5 ? 0x2a0f16 : accent, .06 + danger * .12), 0x381009, entropy * .44),
      groundDeep: mix(0x05080d, danger > .5 ? 0x1a0710 : 0x07131b, .35 + danger * .2),
      settlement: mix(mix(0x16283a, accent, .1 + awareness * .1), 0x5e261a, entropy * .16),
      window: mix(mix(0xf2cd7b, accent, attention * .36), 0xff6f43, entropy * .22),
      // Light leaving the city: warmer and weaker than a window, and the colour the settlement glow,
      // the streetlamps and the road reflections all share, so the lighting reads as one system.
      lightSpill: mix(mix(0xffb457, accent, .3 + attention * .2), 0xff5a2a, entropy * .45),
      haze: mix(mix(0x5ca9bc, accent, .35), 0xd65432, entropy * .55),
      // Entropy's own light: embers over the world when reality is failing, unused below its band.
      ember: mix(0xff8244, 0xffd8a0, Math.max(0, .55 - entropy * .4)),
    },
  };
}

export function structuralWorldKey(civ: Civilization, viewportWidth: number): string {
  const snapshot = worldSnapshot(civ, viewportWidth);
  const presentation = worldPresentation(civ);
  return [
    civ.seed,
    civ.terminal ? 'terminal' : 'normal',
    Math.round(viewportWidth / 80),
    civ.era,
    snapshot.stage,
    snapshot.buildingCount,
    Math.trunc(civ.development / 25),
    identitySignature(civ),
    worldMemorySignature(civ.visualMemory),
    presentation.bands.stability,
    presentation.bands.sanity,
    presentation.bands.awareness,
    presentation.bands.attention,
    presentation.bands.entropy,
    speciesProfile(civ).archetype,
    factionSignature(civ),
    settlementClassSignature(civ, snapshot),
  ].join('|');
}
