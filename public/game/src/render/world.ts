import type { GameEngine } from '../game/engine.js';
import type { Civilization, DecisionFeedback } from '../game/types.js';
import { CivilizationPaths } from '../game/paths.js';
import { liveWorldSample, worldSnapshot } from './world-model.js';
import { decisionImpulseKind, entropyThresholdColor, structuralWorldKey, worldPresentation } from './world-presentation.js';
import { hash01, mixColor } from './primitives.js';
import { canvasSurface, type DrawSurface } from './draw-surface.js';
import { settlementLayout, type Settlement, type Structure } from './settlements.js';
import { bannerGeometry, drawBanner, drawStructure, settlementCrown } from './structures.js';
import { casteFor, drawCreature, speciesProfile, type SpeciesProfile } from './species.js';
import { agentPlan, type AgentPlan } from './agents.js';
import { CONSTRUCTION_MS, CONSTRUCTION_REDUCED_MS, ConstructionTracker } from './construction.js';
import { factionRoster, UNALIGNED_COLOR, type Faction } from './factions.js';

export interface RenderStats { sceneRebuilds: number; staticRedraws: number; sceneryFullRedraws: number; sceneryStripRedraws: number; }
export interface WorldController { nudge(direction: number): void; destroy(): void; stats(): RenderStats; }

const DYNAMIC_FRAME_MS = 33;
const devicePixelRatio = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const CONSTRUCTION_DURATION = reducedMotion ? CONSTRUCTION_REDUCED_MS : CONSTRUCTION_MS;
// Ground sits low enough that the strip below it stays a framed foreground band rather than
// a quarter of the viewport filled with nothing.
const GROUND_RATIO = .78;
// Parallax factors of the three cached layers, in the order they are painted.
const SKY_PARALLAX = .1;
const TERRAIN_PARALLAX = .52;
// Widest single primitive any static layer draws. Exported so the cull test can state its ceiling in
// terms of the design instead of a magic number.
export const WIDEST_STATIC_PRIMITIVE = 230;
// Slack on each side of the visible slice, so an element anchored just off screen still paints the
// part that reaches into view.
export const CULL_MARGIN = 320;
// Half the width of a banner's cloth plus its pole, so one anchored at the band edge still paints.
const BANNER_SLACK = 40;
// Widest path motif: the bureaucratic filing cabinet at 28 px plus its rings.
const MOTIF_SLACK = 60;
// Slack added around the strip a scroll exposes. `drawSettlementContent` already culls every
// settlement by its radius and every structure by its own width, so a narrow band is as correct as a
// wide one; this margin only absorbs the few marks drawn slightly beyond a declared extent. The
// strip redraw is checked against a full redraw of the same slice in the render tests, which is what
// keeps this number honest.
const SCENERY_SLACK = 48;

/** The slice of world a layer actually shows, in world px. */
interface WorldBand { from: number; to: number }

/**
 * A layer at parallax `f` is drawn under `translate(-scroll * f)`, so the world coordinates on screen
 * run from `scroll * f` to `scroll * f + width`. Everything outside that, plus a margin, is invisible.
 *
 * Culling matters because `drawStatic` runs on every scrolled pixel and each layer spans
 * `snapshot.worldWidth` -- up to four viewports at stage 4, of which one is on screen. Caching the
 * layers into offscreen canvases instead was measured and rejected: a 1440x760 viewport at stage 4
 * needs 11520x1520 device px per layer, about 70 MB, and three of those exceed what a mobile browser
 * will hand out.
 */
function visibleBand(worldWidth: number, width: number, scroll: number, parallax: number): WorldBand {
  const offset = scroll * parallax;
  return {
    from: Math.max(0, offset - CULL_MARGIN),
    to: Math.min(worldWidth, offset + width + CULL_MARGIN),
  };
}


interface WorldScene {
  civ: Civilization;
  snapshot: ReturnType<typeof worldSnapshot>;
  presentation: ReturnType<typeof worldPresentation>;
  settlements: Settlement[];
  structures: Structure[];
  plan: AgentPlan;
  species: SpeciesProfile;
  roster: Faction[];
}

function buildScene(civ: Civilization, width: number, height: number): WorldScene {
  const snapshot = worldSnapshot(civ, width);
  const presentation = worldPresentation(civ);
  const settlements = settlementLayout(civ, snapshot.worldWidth, height, snapshot);
  const structures = settlements.flatMap(settlement => settlement.structures);
  return { civ, snapshot, presentation, settlements, structures, plan: agentPlan(civ, snapshot, settlements), species: speciesProfile(civ), roster: factionRoster(civ) };
}

function factionColor(scene: WorldScene, settlement: Settlement): number {
  return settlement.factionIndex >= 0 ? (scene.roster[settlement.factionIndex]?.color ?? UNALIGNED_COLOR) : UNALIGNED_COLOR;
}

function drawSkyContent(surface: DrawSurface, scene: WorldScene, height: number, view: WorldBand): void {
  const { civ, snapshot, presentation } = scene;
  const worldWidth = snapshot.worldWidth;
  const span = view.to - view.from;
  if (span <= 0) return;
  surface.fillStyle(presentation.colors.skyTop, 1).fillRect(view.from, 0, span, height * .48);
  surface.fillStyle(presentation.colors.skyBottom, 1).fillRect(view.from, height * .48, span, height * .52);
  for (let band = 0; band < 5; band++) {
    surface.fillStyle(presentation.colors.haze, .025 + presentation.attention * .018).fillRect(view.from, height * (.24 + band * .085), span, height * .08);
  }
  if (civ.stats.attention >= 60) {
    const observerX = worldWidth * (.72 + hash01(civ.seed) * .12);
    if (observerX >= view.from && observerX <= view.to) {
      surface.fillStyle(presentation.accent, .035 + presentation.attention * .05).fillCircle(observerX, height * .18, 78);
      surface.lineStyle(1.5, presentation.accent, .12 + presentation.attention * .16).strokeCircle(observerX, height * .18, 42);
    }
  }
}

function drawTerrainContent(surface: DrawSurface, scene: WorldScene, height: number, view: WorldBand): void {
  const { civ, snapshot, presentation } = scene;
  const worldWidth = snapshot.worldWidth;
  const horizon = height * .69;
  const span = view.to - view.from;
  if (span <= 0) return;
  // Triangles sit on a 160 px lattice at x = i * 160 - 80 and span 230 px, so the visible indices
  // follow from the band directly instead of walking the whole world.
  const last = Math.ceil(worldWidth / 160);
  // A triangle at index i spans [i * 160 - 80, i * 160 + 150], so it is visible when its right edge
  // clears view.from and its left edge lands before view.to. The lower bound ceils and the upper one
  // floors; rounding either the other way draws a whole triangle nobody can see.
  const firstIndex = Math.max(0, Math.ceil((view.from - WIDEST_STATIC_PRIMITIVE + 80) / 160));
  const lastIndex = Math.min(last, Math.floor((view.to + 80) / 160));
  for (let i = firstIndex; i <= lastIndex; i++) {
    const x = i * 160 - 80;
    surface.fillStyle(presentation.colors.farTerrain, .82).fillTriangle(x, horizon, x + 110, horizon - 60 - hash01(civ.seed * 3 + i * 29) * 100, x + 230, horizon);
  }
  surface.fillStyle(presentation.colors.nearTerrain, .82).fillRect(view.from, horizon, span, height - horizon);
}

function drawSettlementContent(surface: DrawSurface, scene: WorldScene, height: number, view: WorldBand): void {
  const { civ, snapshot, presentation, settlements } = scene;
  const worldWidth = snapshot.worldWidth;
  const stage = snapshot.stage;
  const ground = height * GROUND_RATIO;
  const span = view.to - view.from;
  if (span <= 0) return;
  surface.fillStyle(presentation.colors.nearTerrain, 1).fillRect(view.from, ground, span, height - ground);

  // Roads connect settlement centers rather than banding the whole world.
  if (stage > 0) {
    for (let i = 0; i < settlements.length; i++) {
      const from = settlements[i]!;
      const to = settlements[i + 1] ?? null;
      const left = to ? from.centerX : from.centerX - from.radius;
      const right = to ? to.centerX : from.centerX + from.radius;
      const start = Math.min(left, right); const roadSpan = Math.abs(right - left);
      if (start > view.to || start + roadSpan < view.from) continue;
      surface.fillStyle(0x11191f, .98).fillRect(start, ground + 4, roadSpan, 12 + stage * 3);
      // Dashes sit on a 42 px lattice inside the road; dash d spans [start + 42d + 10, +18], so it
      // shows once its right edge clears view.from. Ceil, or the run starts one dash too early.
      const firstDash = Math.max(0, Math.ceil((view.from - start - 28) / 42));
      for (let dash = firstDash; dash * 42 < roadSpan; dash++) {
        const dashX = start + dash * 42 + 10;
        if (dashX > view.to) break;
        surface.fillStyle(presentation.colors.window, .18).fillRect(dashX, ground + 10 + stage, 18, 2);
      }
    }
    if (stage >= 2) surface.lineStyle(2, presentation.accent, .24).line(view.from, ground - 9, view.to, ground - 9);
    if (stage >= 4) surface.lineStyle(2, presentation.accent, .4).line(view.from, ground - 18, view.to, ground - 18);
  } else {
    surface.fillStyle(0x493821, .98).fillRect(view.from, ground + 4, span, 11);
  }

  for (const settlement of settlements) {
    // The settlement footprint is the cheap first cut, but a wide settlement straddling the band edge
    // still holds structures far outside it, so each structure is checked too. Its own width is the
    // slack, which covers the annexes and crowns drawn around the anchor.
    if (settlement.centerX - settlement.radius > view.to || settlement.centerX + settlement.radius < view.from) continue;
    for (const structure of settlement.structures) {
      if (structure.x + structure.width < view.from || structure.x - structure.width > view.to) continue;
      drawStructure(surface, structure, ground, presentation.colors.settlement, presentation.accent, presentation.colors.window, civ.seed);
    }
    // A faction-colored plinth marks who holds the settlement even in the cached layer.
    if (stage > 0) {
      surface.fillStyle(factionColor(scene, settlement), .5).fillRect(settlement.centerX - settlement.radius * .22, ground - 3, settlement.radius * .44, 3);
    }
  }

  // Foreground bank: without it the strip below the road was flat, empty fill.
  const bankTop = height - Math.max(14, (height - ground) * .34);
  const bankColor = mixColor(presentation.colors.nearTerrain, 0x000000, .5);
  surface.fillStyle(bankColor, 1).fillRect(view.from, bankTop, span, height - bankTop);
  // Bank triangle i spans [i * 96, i * 96 + 96], so it shows once its right edge clears view.from.
  const firstBank = Math.max(0, Math.ceil((view.from - 96) / 96));
  for (let i = firstBank; i * 96 < worldWidth; i++) {
    const x = i * 96;
    if (x > view.to) break;
    surface.fillStyle(bankColor, 1).fillTriangle(x, bankTop + 2, x + 48, bankTop - 5 - hash01(civ.seed + i * 7) * 12, x + 96, bankTop + 2);
  }
  surface.lineStyle(1, presentation.accent, .12).line(view.from, bankTop, view.to, bankTop);
}

function drawPathMotif(surface: DrawSurface, civ: Civilization, worldWidth: number, height: number, ground: number, time: number, accent: number, view: WorldBand): void {
  const path = CivilizationPaths.ensure(civ).dominantPath;
  if (!path) return;
  // Every motif scatters a handful of marks across the whole world. Each is small, so one slack
  // covers them all, and the guard keeps the dominant path from being the one thing still painted
  // world-wide on the layer that repaints every frame.
  const shows = (x: number): boolean => x >= view.from - MOTIF_SLACK && x <= view.to + MOTIF_SLACK;
  switch (path) {
    case 'machine_faith':
      for (let i = 0; i < 8; i++) {
        const x = worldWidth * (.08 + i * .12);
        if (!shows(x)) continue;
        surface.lineStyle(2, accent, .32).line(x, ground - 35, x, ground - 90 - (i % 3) * 18);
        surface.fillStyle(accent, .42).fillCircle(x, ground - 95 - (i % 3) * 18, 4);
      }
      break;
    case 'collective_mind': {
      const points = Array.from({ length: 12 }, (_, i) => ({ x: worldWidth * (.05 + hash01(civ.seed + i) * .9), y: ground - 40 - hash01(i * 17) * 100 }));
      surface.lineStyle(1, accent, .22);
      // A segment survives if either end shows, or the chain would break at the band edge.
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1]!, b = points[i]!;
        if (!shows(a.x) && !shows(b.x)) continue;
        surface.line(a.x, a.y, b.x, b.y);
      }
      for (const point of points) if (shows(point.x)) surface.fillStyle(accent, .5).fillCircle(point.x, point.y, 3);
      break;
    }
    case 'temporal_dominion':
      for (let i = 0; i < 7; i++) {
        const x = worldWidth * (.1 + i * .13); const y = height * .22 + (i % 2) * 30;
        if (!shows(x)) continue;
        surface.lineStyle(2, accent, .3).strokeCircle(x, y, 12 + i * 2);
        surface.lineStyle(1, accent, .45).line(x, y, x + Math.cos(time * .001 + i) * 10, y + Math.sin(time * .001 + i) * 10);
      }
      break;
    case 'reality_engineering':
      for (let i = 0; i < 9; i++) {
        const x = worldWidth * (.08 + i * .105); const y = ground - 50 - (i % 3) * 35;
        if (!shows(x)) continue;
        surface.lineStyle(2, accent, .3).line(x - 12, y + 12, x, y - 12).line(x, y - 12, x + 12, y + 12).line(x + 12, y + 12, x - 12, y + 12);
      }
      break;
    case 'biological_transcendence':
      for (let i = 0; i < 18; i++) { const x = worldWidth * hash01(civ.seed + i * 13); if (!shows(x)) continue; surface.fillStyle(accent, .14).fillCircle(x, ground - 10 - hash01(i * 29) * 80, 8 + hash01(i) * 14); }
      break;
    case 'cosmic_resistance':
      for (let i = 0; i < 12; i++) {
        const x = worldWidth * (.03 + i * .085);
        if (!shows(x)) continue;
        surface.fillStyle(accent, .38).fillTriangle(x, ground - 48, x + 16, ground - 43, x, ground - 36);
        surface.lineStyle(1, 0xe5e5e5, .35).line(x, ground - 48, x, ground - 26);
      }
      break;
    case 'bureaucratic_singularity':
      for (let i = 0; i < 10; i++) {
        const x = worldWidth * (.06 + i * .095); const y = ground - 70 - (i % 2) * 28;
        if (!shows(x)) continue;
        surface.lineStyle(1, accent, .25).strokeRect(x, y, 28, 20);
        surface.lineStyle(1, accent, .18).line(x + 4, y + 6, x + 23, y + 6);
      }
      break;
    case 'post_mortal_civilization':
      for (let i = 0; i < 9; i++) {
        const x = worldWidth * (.07 + i * .11); const y = ground - 55 - (i % 3) * 20;
        if (!shows(x)) continue;
        surface.fillStyle(accent, .11).fillCircle(x, y, 11);
        surface.lineStyle(1, accent, .34).strokeCircle(x, y, 7);
      }
      break;
    case 'void_communion':
      for (let i = 0; i < 7; i++) {
        const x = worldWidth * (.1 + i * .13); const y = height * .18 + (i % 3) * 24;
        if (!shows(x)) continue;
        surface.fillStyle(accent, .12).fillCircle(x, y, 26 + Math.sin(time * .001 + i) * 3);
        surface.lineStyle(2, accent, .28).strokeCircle(x, y, 9);
      }
      break;
    case 'recursive_simulation':
      for (let i = 0; i < 8; i++) {
        const x = worldWidth * (.07 + i * .115); const y = ground - 75 - (i % 2) * 35;
        if (!shows(x)) continue;
        for (let ring = 0; ring < 3; ring++) surface.lineStyle(1, accent, .18 + .06 * ring).strokeRect(x - ring * 5, y - ring * 5, 22 + ring * 10, 14 + ring * 10);
      }
      break;
  }
}

/**
 * Reads `snapshot` and `presentation` live, so continuously changing state (entropy, danger,
 * awareness) keeps showing while the cached structural layers stay untouched. Geometry comes
 * from the cached `scene`.
 */
/**
 * Difference between the live palette and the one baked into the cached layers, painted as a wash so
 * the two never drift more than a band apart. The strength is the distance the live values have
 * travelled inside their current band, which is zero right after a rebuild and grows until the next
 * one -- so the seam where the cached layer catches up is never visible as a jump.
 */
function drawMoodWash(surface: DrawSurface, scene: WorldScene, live: ReturnType<typeof worldPresentation>, view: WorldBand, height: number): void {
  const cached = scene.presentation;
  const drift = Math.min(1, Math.abs(live.entropy - cached.entropy) + Math.abs(live.danger - cached.danger)
    + Math.abs(live.attention - cached.attention) + Math.abs(live.sanityDistortion - cached.sanityDistortion));
  if (drift < .002) return;
  // Culled like the static layers. This runs on every dynamic frame, so a wash across the whole world
  // would hand back the cost the culling just removed.
  const span = view.to - view.from;
  if (span <= 0) return;
  surface.fillStyle(live.colors.skyBottom, drift * .32).fillRect(view.from, 0, span, height * .7);
  surface.fillStyle(live.colors.nearTerrain, drift * .34).fillRect(view.from, height * .7, span, height * .3);
}


function drawParticles(surface: DrawSurface, civ: Civilization, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, height: number, view: WorldBand): void {
  const worldWidth = snapshot.worldWidth;
  for (let i = 0; i < snapshot.particleCount; i++) {
    const x = hash01(civ.seed + i * 17) * worldWidth;
    if (x < view.from || x > view.to) continue;
    surface.fillStyle(i % 9 === 0 ? presentation.accent : 0xc9e1ff, .18 + hash01(i * 41) * (.38 + presentation.awareness * .22))
      .fillCircle(x, hash01(civ.seed + i * 31) * height * .58, .55 + hash01(i * 7) * 1.7);
  }
}

function drawHazeBands(surface: DrawSurface, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, width: number, height: number, animationTime: number, view: WorldBand): void {
  const worldWidth = snapshot.worldWidth;
  for (let i = 0; i < snapshot.hazeBands; i++) {
    const drift = (animationTime * (.002 + i * .00035)) % (width * .6);
    const y = height * (.28 + i * .07) + Math.sin(animationTime * .0005 + i) * (reducedMotion ? 0 : 4);
    const from = Math.max(view.from, drift - width * .3);
    const to = Math.min(view.to, drift - width * .3 + worldWidth * .34);
    if (to > from) surface.fillStyle(presentation.colors.haze, .02 + presentation.sanityDistortion * .025).fillRect(from, y, to - from, 22 + i * 4);
  }
}

function drawLitWindows(surface: DrawSurface, scene: WorldScene, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, ground: number, animationTime: number, view: WorldBand): void {
  const civ = scene.civ;
  for (let i = 0; i < Math.min(scene.structures.length, 46); i++) {
    const structure = scene.structures[i]!;
    if (structure.x + structure.width < view.from || structure.x - structure.width > view.to) continue;
    if (snapshot.stage === 0 || hash01(civ.seed + i * 73 + Math.trunc(animationTime / 850)) < .42) continue;
    const rows = Math.max(2, Math.min(10, Math.trunc(structure.height / 18)));
    surface.fillStyle(presentation.colors.window, .45 + hash01(i * 9) * .32)
      .fillRect(structure.x - structure.width * .28 + (i % 3) * 5, ground - structure.height + 8 + (i % rows) * 13, 2.5 + snapshot.stage * .28, 3);
  }
}

function drawInhabitants(surface: DrawSurface, scene: WorldScene, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, ground: number, animationTime: number, view: WorldBand): void {
  const { settlements, plan, species } = scene;
  for (const pedestrian of plan.pedestrians) {
    const settlement = settlements[pedestrian.settlementIndex];
    if (!settlement) continue;
    const travel = reducedMotion ? pedestrian.offset : (pedestrian.offset + animationTime * .000045 * pedestrian.speed) % 1;
    const x = settlement.centerX - settlement.radius + travel * settlement.radius * 2;
    if (x < view.from || x > view.to) continue;
    const phase = reducedMotion ? 0 : (animationTime % species.gaitPeriod) / species.gaitPeriod;
    drawCreature(surface, species, casteFor(settlement.settlementClass), x, ground + 2 + pedestrian.lane * 3, .8 + snapshot.stage * .12, phase, presentation.accent);
  }
}

function drawTraffic(surface: DrawSurface, scene: WorldScene, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, ground: number, height: number, animationTime: number, view: WorldBand): void {
  const { civ, plan } = scene;
  const worldWidth = snapshot.worldWidth;

  // Road traffic.
  for (const vehicle of plan.vehicles) {
    const travel = reducedMotion ? vehicle.phase : (vehicle.phase + animationTime * .00002 * vehicle.speed) % 1;
    const x = vehicle.fromX + (vehicle.toX - vehicle.fromX) * travel;
    if (x < view.from || x > view.to) continue;
    const length = 5 + snapshot.stage * 1.5;
    const y = ground + 10 + vehicle.lane * 7;
    surface.fillStyle(vehicle.seed % 2 ? presentation.accent : presentation.colors.window, .72).fillRect(x, y, length, 2.5);
    if (civ.era >= 2) surface.fillStyle(presentation.accent, .22).fillRect(x - length * .5, y + .8, length * .5, 1);
  }

  // Air corridors.
  for (const aircraft of plan.aircraft) {
    const travel = reducedMotion ? aircraft.phase : (aircraft.phase + animationTime * .00032 * aircraft.speed) % 1;
    const x = aircraft.fromX + (aircraft.toX - aircraft.fromX) * travel;
    if (x < view.from - 10 || x > view.to + 10) continue;
    const y = height * aircraft.altitude;
    surface.lineStyle(1.5, presentation.accent, .62).line(x - 10, y, x + 10, y);
    surface.fillStyle(0xffffff, .82).fillCircle(x, y, 1.5);
  }

  for (const orbital of plan.orbital) {
    const x = ((orbital.phase + animationTime * .000003 * (1 + orbital.speed)) % 1) * worldWidth;
    if (x < view.from || x > view.to) continue;
    surface.lineStyle(1, presentation.accent, .44).strokeRect(x - 3, height * orbital.altitude - 2, 6, 4);
  }

  // Launches rise from an actual pad.
  for (const launch of plan.launches) {
    const cycle = ((animationTime + launch.offset) % launch.period) / launch.period;
    if (cycle > .42 || launch.x < view.from || launch.x > view.to) continue;
    const rise = cycle / .42;
    const y = ground - rise * height * .78;
    surface.fillStyle(presentation.accent, .9).fillRect(launch.x - 1.6, y, 3.2, 9);
    surface.fillStyle(0xffd9a0, .5 * (1 - rise)).fillTriangle(launch.x - 3, y + 9, launch.x, y + 9 + 16 * (1 - rise), launch.x + 3, y + 9);
  }
}

function drawBannersAndConstruction(surface: DrawSurface, scene: WorldScene, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, ground: number, height: number, time: number, tracker: ConstructionTracker, animationTime: number, view: WorldBand): void {
  const { settlements } = scene;
  for (const settlement of settlements) {
    if (snapshot.stage === 0) continue;
    // Footprint first as the cheap cut, then the banner and each scaffolded structure on their own
    // positions: a settlement radius reaches up to 18% of the world, so its footprint overlapping the
    // band says almost nothing about where its banner stands.
    if (settlement.centerX - settlement.radius > view.to || settlement.centerX + settlement.radius < view.from) continue;
    const banner = bannerGeometry(settlement, ground, height);
    if (banner.x >= view.from - BANNER_SLACK && banner.x <= view.to + BANNER_SLACK) {
      const owner = settlement.factionIndex >= 0 ? scene.roster[settlement.factionIndex] : null;
      drawBanner(surface, banner.x, banner.topY, banner.poleHeight, owner?.color ?? UNALIGNED_COLOR, owner?.sigil ?? 'node', reducedMotion ? 0 : (animationTime % 2600) / 2600);
    }
    for (const structure of settlement.structures) {
      if (structure.x + structure.width < view.from || structure.x - structure.width > view.to) continue;
      if (!tracker.isBuilding(structure.id, time)) continue;
      const progress = tracker.progress(structure.id, time);
      const top = ground - structure.height;
      const buildY = ground - structure.height * progress;
      surface.fillStyle(presentation.colors.skyBottom, .88).fillRect(structure.x - structure.width / 2 - 1, top, structure.width + 2, Math.max(0, buildY - top));
      surface.lineStyle(1.4, 0xf2cd7b, .7).line(structure.x - structure.width * .7, buildY, structure.x + structure.width * .7, buildY);
      surface.lineStyle(1, 0xf2cd7b, .34).line(structure.x - structure.width * .6, ground, structure.x - structure.width * .6, top);
      surface.lineStyle(1, 0xf2cd7b, .34).line(structure.x + structure.width * .6, ground, structure.x + structure.width * .6, top);
      for (let spark = 0; spark < 3; spark++) {
        surface.fillStyle(0xffd9a0, .6).fillCircle(structure.x + (hash01(spark * 31 + Math.trunc(animationTime / 90)) - .5) * structure.width, buildY + hash01(spark * 17 + Math.trunc(animationTime / 90)) * 6, 1.1);
      }
    }
  }
}

function drawAnomalies(surface: DrawSurface, scene: WorldScene, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, ground: number, height: number, animationTime: number, view: WorldBand): void {
  const { civ } = scene;
  const worldWidth = snapshot.worldWidth;
  for (let i = 0; i < snapshot.fractureCount; i++) {
    const x = worldWidth * hash01(civ.seed + i * 61);
    if (x < view.from - 46 || x > view.to + 46) continue;
    surface.lineStyle(1.4, 0xee6973, .24 + presentation.danger * .42).line(x, ground + 2, x + (hash01(i * 11) - .5) * 46, ground + 24 + hash01(i * 17) * 34);
  }
  for (let i = 0; i < snapshot.beaconCount; i++) {
    const x = worldWidth * (.08 + hash01(civ.seed + i * 97) * .84);
    if (x < view.from - 18 || x > view.to + 18) continue;
    const pulse = reducedMotion ? 1 : .7 + Math.sin(animationTime * .003 + i) * .3;
    surface.lineStyle(1, presentation.accent, .16 + presentation.awareness * .25 * pulse).strokeCircle(x, ground - 55 - (i % 3) * 28, 10 + pulse * 8);
  }
  if (presentation.sanityDistortion > .18) {
    for (let i = 0; i < 3; i++) {
      const wobble = reducedMotion ? 0 : Math.sin(animationTime * .0014 + i) * 9 * presentation.sanityDistortion;
      surface.lineStyle(1, 0xb68cff, .08 + presentation.sanityDistortion * .13).strokeCircle(worldWidth * (.22 + i * .29) + wobble, height * (.28 + i * .04), 35 + i * 17);
    }
  }
}

function drawDynamicContent(surface: DrawSurface, scene: WorldScene, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, width: number, height: number, time: number, tracker: ConstructionTracker, view: WorldBand): void {
  const animationTime = reducedMotion ? 0 : time;
  const ground = height * GROUND_RATIO;

  // The hash decides where a particle lands, so the loop still visits every index; only the draw is
  // skipped. Iterating is free next to filling a circle.
  drawParticles(surface, scene.civ, snapshot, presentation, height, view);

  // The cached layers below hold the palette frozen at the last structural key change, and that key
  // reads Stability, Sanity, Awareness, Attention and Entropy as 25-point bands. So the world's base
  // mood changed in four hard steps while the overlays glided. This pass closes the gap: one tinted
  // wash mixed from the *live* presentation, drawn over the cached scenery, so the world keeps
  // sliding between the steps. Structure stays cached; only the mood moves.
  drawMoodWash(surface, scene, presentation, view, height);

  drawHazeBands(surface, snapshot, presentation, width, height, animationTime, view);

  // Lit windows keep flickering across the settlement skyline.
  drawLitWindows(surface, scene, snapshot, presentation, ground, animationTime, view);

  // Inhabitants.
  drawInhabitants(surface, scene, snapshot, presentation, ground, animationTime, view);

  // Road traffic, air corridors, orbital, launches.
  drawTraffic(surface, scene, snapshot, presentation, ground, height, animationTime, view);

  // Banners and construction.
  drawBannersAndConstruction(surface, scene, snapshot, presentation, ground, height, time, tracker, animationTime, view);

  // Fractures, beacons, sanity distortion.
  drawAnomalies(surface, scene, snapshot, presentation, ground, height, animationTime, view);

  drawPathMotif(surface, scene.civ, snapshot.worldWidth, height, ground, animationTime, presentation.accent, view);
}


function impulseColor(feedback:DecisionFeedback,kind:ReturnType<typeof decisionImpulseKind>):number {
  if(kind==='containment')return 0x73e6bd;
  if(kind==='time-streak')return 0xf2bd63;
  if(kind==='scan')return 0x6bdcf6;
  if(kind==='fracture')return entropyThresholdColor(feedback.eventId);
  return feedback.tone === 'positive' ? 0x73e6bd : feedback.tone === 'negative' ? 0xee6973 : 0xb68cff;
}

/** Drawn identically on both backends; the caller owns clearing its layer. */
function drawDecisionImpulse(surface: DrawSurface, feedback: DecisionFeedback | null, startTime: number, time: number, width: number, height: number): void {
  if (!feedback || startTime <= 0) return;
  const kind=decisionImpulseKind(feedback.eventId);
  const color=impulseColor(feedback,kind);
  if (reducedMotion) {
    if (time - startTime >= 1400) return;
    const radius = Math.min(width, height) * .2;
    if(kind==='time-streak')for(let i=0;i<4;i++)surface.lineStyle(2,color,.42).line(width*.18,height*(.38+i*.1),width*.82,height*(.38+i*.1));
    else if(kind==='scan'){surface.lineStyle(2,color,.48).line(width*.16,height*.5,width*.84,height*.5);surface.lineStyle(1,color,.4).strokeCircle(width*.5,height*.5,radius);}
    else if(kind==='fracture')for(let i=0;i<6;i++)surface.lineStyle(2,color,.44).line(width*(.3+i*.07),height*.3,width*(.34+i*.06),height*.72);
    else {surface.lineStyle(kind==='containment'?4:2,color,.48).strokeCircle(width*.5,height*.54,radius);surface.fillStyle(color,.06).fillCircle(width*.5,height*.54,radius*.72);}
    return;
  }
  const progress = Math.min(1, Math.max(0, (time - startTime) / 1800));
  if (progress >= 1) return;
  const alpha = (1 - progress) * .62;
  const radius = 34 + progress * Math.min(width, height) * .56;
  if(kind==='containment'){
    for(let ring=0;ring<3;ring++)surface.lineStyle(4-ring, color, alpha*(1-ring*.18)).strokeCircle(width*.5,height*.54,radius*(.58+ring*.2));
    surface.fillStyle(color,alpha*.08).fillCircle(width*.5,height*.54,radius*.5);
  }else if(kind==='time-streak'){
    for(let i=0;i<9;i++){const y=height*(.2+i*.075);const inset=((i%3)*36+progress*width*.18)%Math.max(1,width*.28);surface.lineStyle(1.2+(i%2),color,alpha*(.45+(i%3)*.15)).line(-width*.08+inset,y,width*(.7+progress*.35)+inset,y);}
  }else if(kind==='scan'){
    const y=height*(.16+progress*.68);surface.lineStyle(2,color,alpha).line(width*.12,y,width*.88,y);surface.lineStyle(1,color,alpha*.75).strokeCircle(width*.5,height*.52,radius*.48);surface.line(width*.5-radius*.62,height*.52,width*.5+radius*.62,height*.52);surface.line(width*.5,height*.52-radius*.62,width*.5,height*.52+radius*.62);
  }else if(kind==='fracture'){
    for(let i=0;i<10;i++){const x=width*(.16+i*.075);const bend=(hash01(i*31+feedback.sequence)-.5)*width*.08;surface.lineStyle(1.2+(i%3),color,alpha).line(x,height*.18,x+bend,height*(.42+progress*.2));surface.line(x+bend,height*(.42+progress*.2),x-bend*.35,height*.84);}
  }else{
    surface.lineStyle(3-progress*2,color,alpha).strokeCircle(width*.5,height*.54,radius);surface.lineStyle(1,0xffffff,alpha*.5).strokeCircle(width*.5,height*.54,radius*.72);surface.fillStyle(color,alpha*.07).fillCircle(width*.5,height*.54,radius*.45);
  }
}


class WorldInput {
  scroll = 0;
  lastStaticScroll = Number.NaN;
  private dragging = false;
  private lastX = 0;

  constructor(private target: HTMLElement, private getWidth: () => number) {
    target.addEventListener('pointerdown', this.onPointerDown);
    target.addEventListener('pointermove', this.onPointerMove);
    target.addEventListener('pointerup', this.onPointerUp);
    target.addEventListener('pointercancel', this.onPointerCancel);
  }

  private onPointerDown = (event: PointerEvent) => {
    this.dragging = true;
    this.lastX = event.clientX;
    this.target.setPointerCapture?.(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.dragging) return;
    this.scroll -= event.clientX - this.lastX;
    this.lastX = event.clientX;
    this.lastStaticScroll = Number.NaN;
  };

  private onPointerUp = () => { this.dragging = false; };
  private onPointerCancel = () => { this.dragging = false; };

  nudge(direction: number): void {
    this.scroll += direction * Math.max(220, this.getWidth() * .65);
    this.lastStaticScroll = Number.NaN;
  }

  destroy(): void {
    this.target.removeEventListener?.('pointerdown', this.onPointerDown);
    this.target.removeEventListener?.('pointermove', this.onPointerMove);
    this.target.removeEventListener?.('pointerup', this.onPointerUp);
    this.target.removeEventListener?.('pointercancel', this.onPointerCancel);
  }
}


/**
 * Three stacked canvases, back to front:
 *
 * - `staticCanvas` holds the two slow parallax layers. They are cheap -- under a hundred primitives
 *   for the whole viewport -- so they are simply repainted whenever the scroll moves.
 * - `sceneryCanvas` holds the settlement layer, which is over 90% of the static drawing cost and the
 *   only one that moves 1:1 with the scroll. Because it does, a scroll is a translation of what is
 *   already painted: the layer is blitted onto itself and only the strip the move exposed is redrawn.
 * - `dynamicCanvas` holds everything that animates, repainted every throttled frame.
 *
 * Splitting the settlement layer onto its own canvas is what makes that blit possible at all -- on a
 * shared canvas the slow layers would be dragged along at the wrong rate and the parallax would die.
 */
class WorldRenderer {
  readonly staticCanvas: HTMLCanvasElement;
  readonly sceneryCanvas: HTMLCanvasElement;
  readonly dynamicCanvas: HTMLCanvasElement;
  private staticContext: CanvasRenderingContext2D;
  private sceneryContext: CanvasRenderingContext2D;
  private dynamicContext: CanvasRenderingContext2D;

  width = 0;
  height = 0;
  staticRedraws = 0;
  sceneryFullRedraws = 0;
  sceneryStripRedraws = 0;

  /** The scroll the scenery canvas currently shows, or NaN when its content cannot be reused. */
  private sceneryScroll = Number.NaN;
  private feedbackSequence = 0;
  private feedbackStartTime = 0;

  constructor(private host: HTMLElement) {
    this.staticCanvas = document.createElement('canvas');
    this.sceneryCanvas = document.createElement('canvas');
    this.dynamicCanvas = document.createElement('canvas');
    this.staticCanvas.className = 'fallback-canvas fallback-static';
    this.sceneryCanvas.className = 'fallback-canvas fallback-scenery';
    this.dynamicCanvas.className = 'fallback-canvas fallback-dynamic';
    this.staticContext = this.staticCanvas.getContext('2d')!;
    this.sceneryContext = this.sceneryCanvas.getContext('2d')!;
    this.dynamicContext = this.dynamicCanvas.getContext('2d')!;
    host.appendChild(this.staticCanvas);
    host.appendChild(this.sceneryCanvas);
    host.appendChild(this.dynamicCanvas);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.resizeCanvas(this.staticCanvas);
    this.resizeCanvas(this.sceneryCanvas);
    this.resizeCanvas(this.dynamicCanvas);
    this.invalidateScenery();
  }

  /** Drops the reuse of the scenery canvas: the next paint redraws the whole visible slice. */
  invalidateScenery(): void { this.sceneryScroll = Number.NaN; }

  private resizeCanvas(canvas: HTMLCanvasElement): void {
    canvas.width = Math.max(1, Math.round(this.width * devicePixelRatio));
    canvas.height = Math.max(1, Math.round(this.height * devicePixelRatio));
    canvas.style.width = `${this.width}px`;
    canvas.style.height = `${this.height}px`;
  }

  private color(value: number, alpha = 1): string {
    const red = value >> 16 & 0xff;
    const green = value >> 8 & 0xff;
    const blue = value & 0xff;
    return `rgba(${red},${green},${blue},${alpha})`;
  }

  private surface(context: CanvasRenderingContext2D): DrawSurface {
    return canvasSurface(context, (value, alpha = 1) => this.color(value, alpha));
  }

  /** The two slow parallax layers. Small enough that a scroll simply repaints them. */
  drawStatic(scene: WorldScene, scroll: number): void {
    const context = this.staticContext;
    const surface = this.surface(context);
    const worldWidth = scene.snapshot.worldWidth;
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    context.clearRect(0, 0, this.width, this.height);
    // Each layer paints only the slice its own parallax puts on screen.
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, -scroll * SKY_PARALLAX * devicePixelRatio, 0);
    drawSkyContent(surface, scene, this.height, visibleBand(worldWidth, this.width, scroll, SKY_PARALLAX));
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, -scroll * TERRAIN_PARALLAX * devicePixelRatio, 0);
    drawTerrainContent(surface, scene, this.height, visibleBand(worldWidth, this.width, scroll, TERRAIN_PARALLAX));
    context.setTransform(1, 0, 0, 1, 0, 0);
    this.staticRedraws++;
  }

  /**
   * The settlement layer. It moves 1:1 with the scroll, so a scroll of d pixels leaves every painted
   * pixel valid at a position d to the side: the canvas is copied onto itself and only the strip the
   * move exposed is repainted, clipped so the copy cannot be damaged.
   *
   * `scroll` must be device-pixel aligned. The caller aligns it for every layer, so the copy is an
   * integer pixel move -- otherwise each drag frame would resample the layer and blur it.
   */
  drawScenery(scene: WorldScene, scroll: number): void {
    const context = this.sceneryContext;
    const surface = this.surface(context);
    const worldWidth = scene.snapshot.worldWidth;
    const deviceWidth = this.sceneryCanvas.width;
    const deviceHeight = this.sceneryCanvas.height;
    const shift = Number.isFinite(this.sceneryScroll) ? Math.round((this.sceneryScroll - scroll) * devicePixelRatio) : Number.NaN;
    const reusable = Number.isFinite(shift) && Math.abs(shift) < deviceWidth;
    if (reusable && shift === 0) return;

    context.setTransform(1, 0, 0, 1, 0, 0);
    let band: WorldBand;
    if (!reusable) {
      context.clearRect(0, 0, deviceWidth, deviceHeight);
      band = visibleBand(worldWidth, this.width, scroll, 1);
      this.sceneryFullRedraws++;
    } else {
      // 'copy' rather than 'source-over': the strip the move exposes must end up transparent, not
      // holding the pixels that used to be there.
      context.globalCompositeOperation = 'copy';
      context.drawImage(this.sceneryCanvas, shift, 0);
      context.globalCompositeOperation = 'source-over';
      const exposedFrom = shift > 0 ? 0 : this.width + shift / devicePixelRatio;
      const exposedSpan = Math.abs(shift) / devicePixelRatio;
      band = {
        from: Math.max(0, scroll + exposedFrom - SCENERY_SLACK),
        to: Math.min(worldWidth, scroll + exposedFrom + exposedSpan + SCENERY_SLACK),
      };
      context.save();
      context.beginPath();
      context.rect(exposedFrom * devicePixelRatio, 0, exposedSpan * devicePixelRatio, deviceHeight);
      context.clip();
      this.sceneryStripRedraws++;
    }
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, -scroll * devicePixelRatio, 0);
    drawSettlementContent(surface, scene, this.height, band);
    context.setTransform(1, 0, 0, 1, 0, 0);
    if (reusable) context.restore();
    this.sceneryScroll = scroll;
  }

  drawDynamic(time: number, scene: WorldScene, civ: Civilization, scroll: number, tracker: ConstructionTracker, engine: GameEngine): void {
    const context = this.dynamicContext;
    const surface = this.surface(context);
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    context.clearRect(0, 0, this.width, this.height);
    // Only the stat-driven counts are resampled per frame; the structural geometry is whatever the
    // cached scene already resolved, so a frame no longer rebuilds settlement and agent budgets.
    const dynamicSnapshot = { ...scene.snapshot, ...liveWorldSample(civ, scene.snapshot.stage) };
    const dynamicPresentation = worldPresentation(civ);
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, -scroll * devicePixelRatio, 0);
    drawDynamicContent(surface, scene, dynamicSnapshot, dynamicPresentation, this.width, this.height, time, tracker, visibleBand(scene.snapshot.worldWidth, this.width, scroll, 1));
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    const feedback = engine.worldImpulse;
    if (feedback && feedback.sequence !== this.feedbackSequence) {
      this.feedbackSequence = feedback.sequence;
      this.feedbackStartTime = time;
    }
    if (feedback && this.feedbackStartTime > 0) {
      drawDecisionImpulse(surface, feedback, this.feedbackStartTime, time, this.width, this.height);
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
  }

  destroy(): void {
    this.staticCanvas.remove();
    this.sceneryCanvas.remove();
    this.dynamicCanvas.remove();
  }
}

class CanvasWorld implements WorldController {
  private input: WorldInput;
  private renderer: WorldRenderer;
  private raf = 0;
  private lastFrame = 0;
  private lastStructuralKey = '';
  private scene: WorldScene | null = null;
  private tracker = new ConstructionTracker(CONSTRUCTION_DURATION);
  private sceneRebuilds = 0;

  constructor(private engine: GameEngine, private host: HTMLElement) {
    this.renderer = new WorldRenderer(host);
    // The topmost canvas that still takes pointer events; the dynamic layer above it is inert.
    this.input = new WorldInput(this.renderer.sceneryCanvas, () => this.renderer.width);
    this.loop(0);
  }

  nudge(direction: number): void { this.input.nudge(direction); }

  stats(): RenderStats {
    return {
      sceneRebuilds: this.sceneRebuilds,
      staticRedraws: this.renderer.staticRedraws,
      sceneryFullRedraws: this.renderer.sceneryFullRedraws,
      sceneryStripRedraws: this.renderer.sceneryStripRedraws,
    };
  }

  private loop = (time: number): void => {
    this.raf = requestAnimationFrame(this.loop);
    if (time - this.lastFrame < (reducedMotion ? 180 : DYNAMIC_FRAME_MS)) return;
    this.lastFrame = time;
    const rect = this.host.getBoundingClientRect();
    const resized = rect.width !== this.renderer.width || rect.height !== this.renderer.height;
    if (resized) {
      this.renderer.resize(Math.max(1, rect.width), Math.max(1, rect.height));
      this.lastStructuralKey = '';
    }
    const civ = this.engine.state.civilization;
    if (!civ) return;
    const key = `${structuralWorldKey(civ, this.renderer.width)}|${Math.round(this.renderer.height / 40)}|${civ.traits.join(',')}`;

    if (key !== this.lastStructuralKey) {
      this.lastStructuralKey = key;
      this.scene = buildScene(civ, this.renderer.width, this.renderer.height);
      this.tracker.sync(this.scene.structures, time);
      this.sceneRebuilds++;
      this.input.lastStaticScroll = Number.NaN;
      this.renderer.invalidateScenery();
    }
    if (!this.scene) return;

    this.input.scroll = Math.max(0, Math.min(this.scene.snapshot.worldWidth - this.renderer.width, this.input.scroll));
    // Every layer paints at the same device-pixel-aligned scroll: the scenery layer moves by copying
    // itself, and a fractional move would resample -- and blur -- it once per drag frame.
    const scroll = Math.round(this.input.scroll * devicePixelRatio) / devicePixelRatio;
    if (scroll !== this.input.lastStaticScroll) {
      this.input.lastStaticScroll = scroll;
      this.renderer.drawStatic(this.scene, scroll);
      this.renderer.drawScenery(this.scene, scroll);
    }
    this.tracker.prune(time);
    this.renderer.drawDynamic(time, this.scene, civ, scroll, this.tracker, this.engine);
  };

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.tracker.reset();
    this.input.destroy();
    this.renderer.destroy();
  }
}

export function startWorldRenderer(engine: GameEngine, host: HTMLElement): WorldController {
  let world: CanvasWorld | null = null;

  const ensure = (): void => {
    const active = engine.state.phase === 'civilization' && !!engine.state.civilization;
    if (active && !world) world = new CanvasWorld(engine, host);
    else if (!active && world) { world.destroy(); world = null; host.replaceChildren(); }
  };
  const unsubscribe = engine.onChange(ensure);
  ensure();

  return {
    nudge(direction: number) { world?.nudge(direction); },
    stats() { return world?.stats() ?? { sceneRebuilds: 0, staticRedraws: 0, sceneryFullRedraws: 0, sceneryStripRedraws: 0 }; },
    destroy() { unsubscribe(); world?.destroy(); world = null; host.replaceChildren(); },
  };
}
