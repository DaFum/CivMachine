import type { Civilization } from '../game/types.js';
import type { DrawSurface } from './draw-surface.js';
import { hash01, mixColor, pathAccentFor } from './primitives.js';

export type SpeciesArchetype = 'mycelic' | 'fluidic' | 'cerebral' | 'phasic' | 'lithic' | 'umbral' | 'chitinous' | 'revenant' | 'attenuated' | 'bipedal' | 'tripodal' | 'swarm';
export type SpeciesFeature = 'antenna' | 'cap' | 'smoke' | 'crystal' | 'hollow';
export type Caste = 'labourer' | 'citizen' | 'augmented';

export interface SpeciesProfile {
  id: string; archetype: SpeciesArchetype; limbs: number; heightRatio: number;
  bodyColor: number; glow: number; gaitPeriod: number; features: SpeciesFeature[];
}

interface ArchetypeSpec { archetype: SpeciesArchetype; limbs: number; heightRatio: number; baseColor: number; glow: number; gaitPeriod: number; features: SpeciesFeature[]; }

// Priority order decides the archetype, so the result never depends on the order traits were granted.
const TRAIT_ARCHETYPES: ReadonlyArray<readonly [string, ArchetypeSpec]> = [
  ['fungal_consensus', { archetype: 'mycelic', limbs: 2, heightRatio: .72, baseColor: 0xb6d98a, glow: .18, gaitPeriod: 920, features: ['cap'] }],
  ['liquid_mathematics', { archetype: 'fluidic', limbs: 0, heightRatio: .86, baseColor: 0x7fd7e8, glow: .3, gaitPeriod: 1400, features: [] }],
  ['telepathic_species', { archetype: 'cerebral', limbs: 2, heightRatio: 1.12, baseColor: 0xc7b4f0, glow: .34, gaitPeriod: 1050, features: ['antenna'] }],
  ['physics_optional', { archetype: 'phasic', limbs: 3, heightRatio: 1, baseColor: 0x9fe4d4, glow: .42, gaitPeriod: 760, features: [] }],
  ['sentient_moon', { archetype: 'lithic', limbs: 2, heightRatio: .9, baseColor: 0x9aa6b8, glow: .12, gaitPeriod: 1250, features: ['crystal'] }],
  ['recurring_nightmare', { archetype: 'umbral', limbs: 2, heightRatio: 1.04, baseColor: 0x3b3350, glow: .22, gaitPeriod: 880, features: ['smoke'] }],
  ['ritual_engineering', { archetype: 'chitinous', limbs: 4, heightRatio: .8, baseColor: 0xc98f5a, glow: .1, gaitPeriod: 640, features: [] }],
  ['born_after_end', { archetype: 'revenant', limbs: 2, heightRatio: 1.06, baseColor: 0x6f7d94, glow: .38, gaitPeriod: 1150, features: ['hollow'] }],
  ['last_species', { archetype: 'attenuated', limbs: 2, heightRatio: 1.18, baseColor: 0xd6cdb4, glow: .08, gaitPeriod: 1320, features: [] }],
];

// museum_planet, chronically_lucky and extreme_bureaucracy carry no bodily implication.
const SEED_ARCHETYPES: ReadonlyArray<ArchetypeSpec> = [
  { archetype: 'bipedal', limbs: 2, heightRatio: 1, baseColor: 0xd8b892, glow: .1, gaitPeriod: 900, features: [] },
  { archetype: 'tripodal', limbs: 3, heightRatio: .94, baseColor: 0xa8c6a0, glow: .14, gaitPeriod: 800, features: [] },
  { archetype: 'swarm', limbs: 2, heightRatio: .66, baseColor: 0xe0c46a, glow: .2, gaitPeriod: 520, features: [] },
];

const CASTES: Record<string, Caste> = { camp: 'labourer', village: 'labourer', town: 'citizen', city: 'citizen', metropolis: 'augmented', arcology: 'augmented' };

/**
 * Placeholder docstring for casteFor.
 */
export function casteFor(settlementClass: string): Caste { return CASTES[settlementClass] ?? 'citizen'; }

/**
 * Placeholder docstring for speciesProfile.
 */
export function speciesProfile(civ: Civilization): SpeciesProfile {
  const traits = new Set(civ.traits);
  let spec: ArchetypeSpec | undefined;
  for (const [traitId, candidate] of TRAIT_ARCHETYPES) if (traits.has(traitId)) { spec = candidate; break; }
  if (!spec) spec = SEED_ARCHETYPES[Math.min(SEED_ARCHETYPES.length - 1, Math.trunc(hash01(civ.seed * 7 + 3) * SEED_ARCHETYPES.length))]!;
  const accent = pathAccentFor(civ.pathState?.dominantPath ?? '');
  return {
    id: spec.archetype,
    archetype: spec.archetype,
    limbs: spec.limbs,
    heightRatio: spec.heightRatio,
    bodyColor: mixColor(spec.baseColor, accent, .28),
    glow: spec.glow,
    gaitPeriod: spec.gaitPeriod,
    features: [...spec.features],
  };
}

const CASTE_SCALE: Record<Caste, number> = { labourer: .82, citizen: 1, augmented: 1.14 };

/**
 * Placeholder docstring for drawCreature.
 */
export function drawCreature(surface: DrawSurface, profile: SpeciesProfile, caste: Caste, x: number, groundY: number, scale: number, phase: number, accent: number): void {
  const size = Math.max(3, 7 * scale * CASTE_SCALE[caste] * profile.heightRatio);
  const swing = Math.sin(phase * Math.PI * 2) * size * .22;
  const bodyTop = groundY - size;
  const bodyWidth = Math.max(2, size * (profile.archetype === 'lithic' || profile.archetype === 'mycelic' ? .52 : .36));
  const outline = mixColor(profile.bodyColor, 0x000000, .55);

  // Contact shadow first: it anchors the figure to the ground and separates it from the road.
  surface.fillStyle(0x000000, .28).fillCircle(x, groundY, bodyWidth * .62);
  // The aura stays inside the silhouette. A wider glow washed the body out at real display size.
  if (caste === 'augmented' || profile.glow > .3) surface.fillStyle(accent, .08 + profile.glow * .1).fillCircle(x, bodyTop + size * .45, size * .42);

  if (profile.archetype === 'fluidic') {
    surface.fillStyle(profile.bodyColor, .94).fillPoly([
      [x - bodyWidth, groundY], [x - bodyWidth * .3 + swing, bodyTop + size * .4],
      [x + bodyWidth * .3 + swing, bodyTop], [x + bodyWidth, groundY],
    ]);
  } else {
    const legs = Math.max(2, profile.limbs);
    for (let leg = 0; leg < legs; leg++) {
      const spread = (leg - (legs - 1) / 2) * bodyWidth * .7;
      surface.lineStyle(Math.max(1.2, size * .15), outline, .9).line(x + spread * .4, groundY - size * .34, x + spread + (leg % 2 ? swing : -swing), groundY);
    }
    surface.fillStyle(profile.bodyColor, profile.archetype === 'phasic' ? .78 : 1).fillRect(x - bodyWidth / 2, bodyTop + size * .3, bodyWidth, size * .7);
    surface.lineStyle(1, outline, .7).strokeRect(x - bodyWidth / 2, bodyTop + size * .3, bodyWidth, size * .7);
  }

  const headRadius = size * (profile.archetype === 'cerebral' ? .34 : .26);
  surface.fillStyle(outline, .9).fillCircle(x, bodyTop + headRadius * .6, headRadius * 1.14);
  surface.fillStyle(profile.bodyColor, 1).fillCircle(x, bodyTop + headRadius * .6, headRadius);

  if (profile.features.includes('cap')) surface.fillStyle(mixColor(profile.bodyColor, 0xffffff, .3), .95).fillTriangle(x - size * .42, bodyTop + headRadius, x, bodyTop - size * .18, x + size * .42, bodyTop + headRadius);
  if (profile.features.includes('antenna')) surface.lineStyle(Math.max(1, size * .1), accent, .8).line(x, bodyTop, x + swing * .6, bodyTop - size * .5);
  if (profile.features.includes('crystal')) surface.fillStyle(accent, .6).fillTriangle(x - bodyWidth * .7, bodyTop + size * .34, x - bodyWidth * .2, bodyTop - size * .1, x + bodyWidth * .3, bodyTop + size * .34);
  if (profile.features.includes('smoke')) surface.fillStyle(profile.bodyColor, .22).fillCircle(x - swing, bodyTop - size * .3, size * .34);
  if (profile.features.includes('hollow')) surface.fillStyle(accent, .85).fillCircle(x, bodyTop + headRadius * .6, headRadius * .38);
  // The halo only reads above ~7px; below that it collapsed into a blob around the head.
  if (caste === 'augmented' && size >= 7) surface.lineStyle(1, accent, .6).strokeCircle(x, bodyTop - size * .16, headRadius * .95);
  if (caste === 'labourer') surface.lineStyle(Math.max(1, size * .1), outline, .85).line(x + bodyWidth * .6, groundY - size * .5, x + bodyWidth * .6, groundY);
}
