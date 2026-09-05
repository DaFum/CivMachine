import type { Civilization } from '../game/types.js';
import { hash01 } from './primitives.js';
import { factionRoster } from './factions.js';
import { structureKindsForEra } from './structures.js';
import { worldWidthMultiplier, type worldSnapshot } from './world-model.js';

type Snapshot = ReturnType<typeof worldSnapshot>;

export type SettlementClass = 'camp' | 'village' | 'town' | 'city' | 'metropolis' | 'arcology';
export type StructureKind = 'dwelling' | 'farm' | 'temple' | 'monument' | 'industry' | 'academy' | 'reactor' | 'spaceport' | 'orbital_anchor';

export const CLASS_ORDER: readonly SettlementClass[] = ['camp', 'village', 'town', 'city', 'metropolis', 'arcology'];

export type DepthLane = 'back' | 'mid' | 'front';
/** Where inside its settlement a structure stands. Drives composition, material and detail. */
export type District = 'core' | 'inner' | 'edge';

export function depthLaneYOffset(lane?: DepthLane): number {
  if (lane === 'back') return -8;
  if (lane === 'front') return 8;
  return 0;
}

export function structureEffectiveGround(groundY: number, lane?: DepthLane): number {
  return groundY + depthLaneYOffset(lane);
}

/**
 * The skyline ceiling, applied as a knee rather than as a wall. A hard `Math.min` against the budget
 * put 26% of a portrait world's structures -- and 18% of a desktop one's -- at *exactly* the same
 * height: every tall building in the city piled onto one horizontal line and the skyline read as a
 * plateau with a flat top, which is the opposite of the hierarchy the district composition is for.
 *
 * Below the knee nothing changes. Above it the height approaches the ceiling without ever reaching
 * it, so the budget is still guaranteed -- and because the curve is strictly increasing, the tallest
 * plot is still the tallest structure. The clamp only stops being a collision.
 */
export function skylineCompress(height: number, ceiling: number): number {
  if (!(ceiling > 0)) return 0;
  const knee = ceiling * .62;
  if (height <= knee) return height;
  const range = ceiling - knee;
  return ceiling - range / (1 + (height - knee) / range);
}

/**
 * How many times taller than it is wide a structure may be. The same tall plots that hit the ceiling
 * were also the narrowest -- a 37 px wide, 558 px tall slab reads as a mast, not as a building --
 * and height is what carries the composition, so the floor widens rather than shortens: a structure
 * keeps the height its plot earned and gains the footprint that height implies.
 */
export const MAX_STRUCTURE_ASPECT = 9;

export interface Structure {
  id: string;
  x: number;
  width: number;
  height: number;
  kind: StructureKind;
  level: number;
  depthLane?: DepthLane;
  district?: District;
  /**
   * A fixed 0..1 offset into the building's own lighting cycle. Windows used to switch on a single
   * world-wide sine, so every building in the world blinked together; a per-structure phase decided
   * once, deterministically, is what turns that into a city where districts wake at their own pace.
   */
  lightPhase?: number;
}
export interface Settlement {
  id: string;
  centerX: number;
  radius: number;
  settlementClass: SettlementClass;
  factionIndex: number;
  structures: Structure[];
  /** The settlement's own lighting phase, so two neighbouring towns are never in step. */
  lightPhase: number;
}

export function settlementClassFor(structureCount: number, stage: number, era: number): SettlementClass {
  if (stage === 0) return structureCount >= 4 ? 'village' : 'camp';
  const score = structureCount + stage * 2 + era;
  if (score < 7) return 'village';
  if (score < 11) return 'town';
  if (score < 16) return 'city';
  if (score < 22) return 'metropolis';
  return 'arcology';
}

// The capital is weighted heavily so a developed world always contains one large settlement.
export function settlementSizes(civ: Civilization, snapshot: Snapshot): number[] {
  const count = snapshot.settlementCount;
  const weights = Array.from({ length: count }, (_, i) => i === 0 ? 1.9 : .55 + hash01(civ.seed * 29 + i * 13) * .9);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const sizes = weights.map(weight => Math.max(1, Math.floor(snapshot.buildingCount * weight / totalWeight)));
  let remainder = snapshot.buildingCount - sizes.reduce((sum, size) => sum + size, 0);
  for (let i = 0; remainder > 0; i = (i + 1) % count) { sizes[i]! += 1; remainder--; }
  for (let i = count - 1; remainder < 0 && i >= 0; i--) {
    const reducible = Math.min(sizes[i]! - 1, -remainder);
    sizes[i]! -= reducible; remainder += reducible;
  }
  return sizes;
}

export function settlementClassSignature(civ: Civilization, snapshot: Snapshot): string {
  const counts = new Map<SettlementClass, number>();
  for (const size of settlementSizes(civ, snapshot)) {
    const settlementClass = settlementClassFor(size, snapshot.stage, civ.era);
    counts.set(settlementClass, (counts.get(settlementClass) ?? 0) + 1);
  }
  return CLASS_ORDER.filter(name => counts.has(name)).map(name => `${name}:${counts.get(name)}`).join('/');
}

// Every candidate is filtered through the era gate, so structureKindsForEra stays the single
// authority on what an era may contain and the two cannot drift apart.
function kindFor(index: number, count: number, settlementClass: SettlementClass, stage: number, seed: number, allowed: ReadonlySet<StructureKind>, distance: number): StructureKind {
  const rank = CLASS_ORDER.indexOf(settlementClass);
  const mid = Math.floor(count / 2);
  const pick = (kind: StructureKind): StructureKind => allowed.has(kind) ? kind : 'dwelling';
  if (stage === 0) return count >= 3 && index === count - 1 ? pick('farm') : 'dwelling';
  if (rank >= 4 && index === 0 && allowed.has('orbital_anchor')) return 'orbital_anchor';
  if (rank >= 3 && index === count - 1 && allowed.has('spaceport')) return 'spaceport';
  if (count >= 10 && index === mid - 1 && allowed.has('reactor')) return 'reactor';
  if (count >= 3 && index === mid) return pick('temple');
  if (count >= 6 && index === mid + 1 && allowed.has('academy')) return 'academy';
  if (stage >= 2 && count >= 8 && index === 1) return pick('monument');
  // The distance the caller passes is the structure's real offset from the settlement centre, not
  // its index: with clustered composition the two diverge, and it is the position that decides
  // whether a plot is agricultural outskirt or industrial edge.
  if (distance > .7) return pick('farm');
  if (distance > .5 && allowed.has('industry') && hash01(seed + index * 37) > .45) return 'industry';
  return 'dwelling';
}

/**
 * How a settlement's structures are grouped along its width. An evenly spaced row of buildings is
 * what made a city read as a bar chart, so the plots are gathered into neighbourhoods separated by
 * deliberate gaps: one dominant core in the middle, secondary districts beside it, and the
 * outskirts at the ends. Deterministic in the seed, and every returned position stays inside
 * `0..1` so the caller's radius culling remains exact.
 */
function districtPlots(count: number, rank: number, seed: number): Array<{ u: number; district: District; coreOfCluster: boolean }> {
  const clusterTarget = count <= 3 ? 1 : count <= 7 ? 2 : rank >= 4 ? 4 : 3;
  const clusters = Math.max(1, Math.min(clusterTarget, count));
  const coreIndex = clusters <= 1 ? 0 : Math.floor(clusters / 2);

  // Weights first, then whole plots, so the core always ends up the densest neighbourhood.
  const weights = Array.from({ length: clusters }, (_, i) => i === coreIndex ? 2.4 : .6 + hash01(seed * 19 + i * 41) * .7);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const counts = weights.map(weight => Math.max(1, Math.floor(count * weight / totalWeight)));
  let remainder = count - counts.reduce((sum, value) => sum + value, 0);
  for (let i = coreIndex; remainder > 0; i = (i + 1) % clusters) { counts[i]! += 1; remainder--; }
  for (let i = clusters - 1; remainder < 0 && i >= 0; i--) {
    const reducible = Math.min(counts[i]! - 1, -remainder);
    counts[i]! -= reducible; remainder += reducible;
  }

  const gap = clusters > 1 ? Math.min(.09, .3 / clusters) : 0;
  const usable = 1 - gap * (clusters - 1);
  const plots: Array<{ u: number; district: District; coreOfCluster: boolean }> = [];
  let cursor = 0;
  for (let c = 0; c < clusters; c++) {
    const size = counts[c]!;
    const width = usable * size / count;
    const peak = Math.floor(size / 2);
    for (let j = 0; j < size; j++) {
      // Half-step spacing inside the cluster plus a bounded jitter, so a neighbourhood is irregular
      // without a plot ever leaving its own cluster.
      const jitter = (hash01(seed * 7 + plots.length * 53) - .5) * (width / size) * .5;
      const u = Math.max(0, Math.min(1, cursor + width * (j + .5) / size + jitter));
      const district: District = c === coreIndex ? 'core' : (c === 0 || c === clusters - 1) ? 'edge' : 'inner';
      plots.push({ u, district, coreOfCluster: j === peak });
    }
    cursor += width + gap;
  }
  return plots;
}

export function settlementLayout(civ: Civilization, worldWidth: number, height: number, snapshot: Snapshot): Settlement[] {
  const stage = snapshot.stage;
  const sizes = settlementSizes(civ, snapshot);
  const roster = factionRoster(civ);
  const scale = [.24, .46, .7, .96, 1.28][stage] ?? .24;
  const viewportWidth = worldWidth / worldWidthMultiplier(civ);
  // Two scales, not one. A narrow viewport needs *wider* structures -- a 14 px tower is a hairline on
  // a phone -- but the same multiplier applied to height filled a portrait screen with skyline and
  // left no sky, no ridges and no atmosphere at all. Height shrinks where width grows.
  const widthScale = viewportWidth < 800 ? 1.25 : (viewportWidth < 1200 ? 1.12 : 1.0);
  const heightScale = viewportWidth < 800 ? .74 : (viewportWidth < 1200 ? .88 : 1.0);
  // And a hard skyline budget from the aspect ratio, so the tallest structure can never eat the sky:
  // a portrait viewport keeps well over half its height above the roofline.
  const aspect = viewportWidth / Math.max(1, height);
  const skylineBudget = height * (aspect < 1 ? .40 : aspect < 1.5 ? .52 : .62);
  const allowed = new Set<StructureKind>(structureKindsForEra(civ.era, stage));
  const settlements: Settlement[] = [];
  let globalIndex = 0;

  for (let index = 0; index < sizes.length; index++) {
    const count = sizes[index]!;
    const settlementClass = settlementClassFor(count, stage, civ.era);
    const rank = CLASS_ORDER.indexOf(settlementClass);
    // Settlements reach nearer the world edges than they used to: at full scroll the last quarter of
    // a stage-4 world was empty ground, because nothing was ever placed past 94% of its width.
    const centerX = Math.max(0, Math.min(worldWidth, worldWidth * (.045 + (index + .5) / sizes.length * .915) + (hash01(civ.seed * 11 + index * 23) - .5) * worldWidth * .035));
    // Bounded by the room a settlement actually has. Without the slot term nine settlements on a
    // phone-sized world each claimed a radius wider than the gap to their neighbour, and the whole
    // world became one continuous wall of buildings with no gaps, no outskirts and no silhouette.
    const slot = worldWidth * .915 / sizes.length;
    const radius = Math.max(24, Math.min(worldWidth * .18, Math.max(0, slot - worldWidth * .035) * .46, 20 + count * (7 + stage * 2.6)));
    const structures: Structure[] = [];
    const plots = districtPlots(count, rank, civ.seed * 3 + index * 29);
    for (let i = 0; i < count; i++) {
      const plot = plots[i]!;
      const level = stage === 0
        ? (hash01(civ.seed * 37 + globalIndex * 7) < .82 ? 0 : 1)
        : Math.min(6, Math.max(1, stage - 1 + Math.trunc(civ.development / 180) + civ.era + Math.trunc(hash01(civ.seed * 13 + globalIndex * 19) * 1.6)));

      // Deterministic depth lane, nudged by where the plot stands: the outskirts sit further back or
      // further forward than the core, which is what keeps a skyline from collapsing onto one line.
      const laneVal = hash01(civ.seed * 41 + globalIndex * 17) * .78 + (plot.district === 'core' ? .11 : plot.district === 'edge' ? (hash01(globalIndex * 13) < .5 ? 0 : .22) : .11);
      const depthLane: DepthLane = laneVal < 0.28 ? 'back' : laneVal > 0.72 ? 'front' : 'mid';
      const laneScale = depthLane === 'back' ? 0.85 : depthLane === 'front' ? 1.12 : 1.0;

      const distFromCenter = Math.abs(plot.u - .5) * 2;

      let classScale = 1.0;
      if (settlementClass === 'camp') classScale = 0.5;
      else if (settlementClass === 'village') classScale = 0.7;
      else if (settlementClass === 'town') classScale = 0.9;
      else if (settlementClass === 'city') classScale = 1.15;
      else if (settlementClass === 'metropolis') classScale = 1.35;
      else if (settlementClass === 'arcology') classScale = distFromCenter < 0.25 ? 1.85 : 0.85;

      // Skyline hierarchy: tall in the core, falling away to the outskirts, with one dominant
      // structure per neighbourhood so each district reads as a place rather than as a queue.
      const dominance = plot.coreOfCluster ? (plot.district === 'core' ? 1.45 : 1.22) : .92 + hash01(civ.seed * 61 + globalIndex * 23) * .2;
      const heightDensityMult = Math.max(0.42, (1.25 - distFromCenter * 0.62) * classScale * dominance);

      const baseWidth = (14 + hash01(civ.seed * 17 + globalIndex * 29) * 30 + level * 3) * (stage === 0 ? .7 : 1 + stage * .08) * laneScale * widthScale;
      const baseHeight = (26 + hash01(civ.seed * 53 + globalIndex * 13) * 120 + level * 22) * scale * heightDensityMult * laneScale * heightScale;
      const kind = kindFor(i, count, settlementClass, stage, civ.seed + index * 101, allowed, distFromCenter);
      // Profile by use, so a class is legible from its silhouette alone: farms lie along the ground,
      // industry keeps a heavy low mass under its chimneys, a monument is a landmark rather than a
      // second tower, and only the civic and residential structures compete for the skyline.
      const kindProfile = kind === 'farm' ? .4 : kind === 'industry' ? .72 : kind === 'monument' ? .58 : 1;
      const structureHeight = Math.max(18, skylineCompress(baseHeight * kindProfile, skylineBudget));
      // The footprint the height implies. A tether and a mast are meant to be slender, so they keep
      // their own proportion; everything else widens rather than standing as a hairline slab.
      const slender = kind === 'orbital_anchor' || kind === 'spaceport';
      const width = slender ? baseWidth : Math.max(baseWidth, structureHeight / MAX_STRUCTURE_ASPECT);

      structures.push({
        id: `s${index}:${i}`,
        x: centerX - radius + radius * 2 * plot.u,
        width, height: structureHeight,
        kind,
        level,
        depthLane,
        district: plot.district,
        lightPhase: hash01(civ.seed * 97 + globalIndex * 31),
      });
      globalIndex++;
    }

    // Sort structures deterministically by depth lane (back -> mid -> front) so front buildings overlap back buildings cleanly
    const laneWeight: Record<DepthLane, number> = { back: 0, mid: 1, front: 2 };
    structures.sort((a, b) => (laneWeight[a.depthLane || 'mid'] - laneWeight[b.depthLane || 'mid']) || (a.x - b.x));
    settlements.push({ id: `s${index}`, centerX, radius, settlementClass, factionIndex: -1, structures, lightPhase: hash01(civ.seed * 71 + index * 137) });
  }

  if (roster.length) {
    const order = [...settlements].sort((a, b) => b.structures.length - a.structures.length);
    let cursor = 0;
    for (let f = 0; f < roster.length && cursor < order.length; f++) {
      const quota = f === roster.length - 1
        ? order.length - cursor
        : Math.max(1, Math.round(roster[f]!.share * order.length));
      for (let taken = 0; taken < quota && cursor < order.length; taken++) order[cursor++]!.factionIndex = f;
    }
    for (const settlement of order) if (settlement.factionIndex < 0) settlement.factionIndex = 0;
  }

  return settlements;
}

/**
 * The land between settlements. Scrolled to the far end of a stage-4 world the ground was simply
 * empty, so a run's own outskirts are placed here: worked fields near a settlement, pylons following
 * the road, rocks and the ruins of what the world already outgrew. Persistent geometry, deterministic
 * in the seed, and each prop is small enough that the caller's per-prop culling stays exact.
 */
export type OutskirtKind = 'field' | 'pylon' | 'rocks' | 'ruin' | 'grove';
export interface Outskirt { x: number; kind: OutskirtKind; scale: number; seed: number }

export const OUTSKIRT_SPACING = 210;
export const MAX_OUTSKIRTS = 64;
/** Widest prop, so the renderer can state its cull slack in terms of the design. */
export const OUTSKIRT_WIDTH = 74;

export function worldOutskirts(civ: Civilization, worldWidth: number, snapshot: Snapshot, settlements: ReadonlyArray<Settlement>): Outskirt[] {
  const stage = snapshot.stage;
  const cells = Math.min(MAX_OUTSKIRTS, Math.max(0, Math.floor(worldWidth / OUTSKIRT_SPACING)));
  const props: Outskirt[] = [];
  for (let cell = 0; cell < cells; cell++) {
    const roll = hash01(civ.seed * 13 + cell * 71);
    // Two thirds of the cells stay empty: the point is to break the emptiness, not to tile the world.
    if (roll > .62) continue;
    const x = (cell + .5) * OUTSKIRT_SPACING + (hash01(civ.seed * 29 + cell * 17) - .5) * OUTSKIRT_SPACING * .5;
    if (x < 0 || x > worldWidth) continue;
    // How far the nearest settlement is decides what stands here: fields and groves belong to a
    // civilization's edge, rocks and ruins to the ground it never took.
    let nearest = Number.POSITIVE_INFINITY;
    for (const settlement of settlements) nearest = Math.min(nearest, Math.abs(settlement.centerX - x) - settlement.radius);
    const pick = hash01(civ.seed * 53 + cell * 37);
    let kind: OutskirtKind;
    if (nearest < 60) kind = pick < .55 ? 'field' : 'grove';
    else if (stage >= 2 && pick < .3) kind = 'pylon';
    else if (stage >= 3 && pick < .45) kind = 'ruin';
    else kind = pick < .72 ? 'rocks' : 'grove';
    props.push({ x, kind, scale: .7 + hash01(civ.seed * 41 + cell * 13) * .6, seed: civ.seed + cell * 101 });
  }
  return props;
}
