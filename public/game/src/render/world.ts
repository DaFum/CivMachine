import type { GameEngine } from '../game/engine.js';
import type { Civilization, DecisionFeedback } from '../game/types.js';
import { CivilizationPaths } from '../game/paths.js';
import { civilizationDramaPhase } from '../game/drama.js';
import { applyQualityToLiveSample, liveWorldSample, worldSnapshot } from './world-model.js';
import { qualityFactors, RenderQualityController, type RenderQualityTier } from './quality.js';
import { structuralWorldKey, worldPresentation } from './world-presentation.js';
import { drawConsequenceImpact, drawPhaseTransitionImpact } from './consequence-presentation.js';
import { hash01, mixColor } from './primitives.js';
import { CachedCanvasSurface, canvasSurface, type DrawSurface } from './draw-surface.js';
import { settlementLayout, structureEffectiveGround, type Settlement, type Structure } from './settlements.js';
import { bannerGeometry, drawBanner, drawStructure, settlementCrown } from './structures.js';
import { casteFor, drawCreature, speciesProfile, type SpeciesProfile } from './species.js';
import { agentPlan, type AgentPlan } from './agents.js';
import { CONSTRUCTION_MS, CONSTRUCTION_REDUCED_MS, ConstructionTracker } from './construction.js';
import { factionRoster, UNALIGNED_COLOR, type Faction } from './factions.js';
import { drawWorldMemoryAccents, drawWorldMemoryScenery } from './world-memory.js';
import { drawIdentityLandmarks, drawPathAmbience, pathIdentity } from './identity.js';

export interface RenderStats { sceneRebuilds: number; staticRedraws: number; sceneryFullRedraws: number; sceneryStripRedraws: number; qualityTier: RenderQualityTier; }
export interface WorldController { nudge(direction: number): void; destroy(): void; stats(): RenderStats; }

/**
 * Dynamic layer frame throttling interval (~30 FPS).
 *
 * Performance rationale: The dynamic layer contains transient particles, inhabitants,
 * traffic, and atmospheric effects. Throttling the dynamic repaint rate to ~30 FPS (33 ms)
 * reduces GPU/CPU draw overhead and thermal/power consumption on low-end and mobile devices,
 * while keeping UI interaction, scrolling, and presentation responsive.
 */
const DYNAMIC_FRAME_MS = 33;
function getDevicePixelRatio(): number {
  return Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
}
let currentReducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
let currentConstructionDuration = currentReducedMotion ? CONSTRUCTION_REDUCED_MS : CONSTRUCTION_MS;
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

function fastPrimitiveKey(civ: Civilization, width: number, height: number): string {
  const vm = civ.visualMemory;
  const memSeq = vm ? `${vm.sequence}:${vm.marks?.length || 0}:${vm.scars?.length || 0}` : '0';
  const aff = civ.pathState?.affinity;
  const affKey = aff ? Object.values(aff).join(',') : '';
  const instKey = civ.institutions ? civ.institutions.join(',') : '';
  const traitsKey = civ.traits ? civ.traits.join(',') : '';
  return `${civ.seed}|${civ.terminal ? 1 : 0}|${width}|${height}|${civ.era}|${(civ.development / 25) | 0}|${traitsKey}|${instKey}|${civ.eventChoices || 0}|${civ.pathState?.dominantPath || ''}|${civ.pathState?.completedEvents?.length || 0}|${memSeq}|${affKey}|${(civ.stats?.stability / 25) | 0}|${(civ.stats?.sanity / 25) | 0}|${(civ.stats?.awareness / 25) | 0}|${(civ.stats?.attention / 25) | 0}|${(civ.tactical?.entropy / 25) | 0}`;
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

  // Multi-stop vertical sky gradient
  const midColor = mixColor(presentation.colors.skyTop, presentation.colors.skyBottom, 0.55);
  surface.fillLinearGradientRect(view.from, 0, span, height * 0.72, [
    { offset: 0, color: presentation.colors.skyTop, alpha: 1 },
    { offset: 0.5, color: midColor, alpha: 1 },
    { offset: 1, color: presentation.colors.skyBottom, alpha: 1 }
  ], view.from, 0, view.from, height * 0.72);

  // Horizon illumination light field
  const horizonY = height * 0.68;
  const glowColor = mixColor(presentation.colors.skyBottom, presentation.accent, 0.35 + presentation.awareness * 0.25);
  surface.fillLinearGradientRect(view.from, horizonY - height * 0.25, span, height * 0.28, [
    { offset: 0, color: glowColor, alpha: 0 },
    { offset: 0.7, color: glowColor, alpha: 0.12 + presentation.attention * 0.08 },
    { offset: 1, color: glowColor, alpha: 0.22 + presentation.awareness * 0.12 }
  ], view.from, horizonY - height * 0.25, view.from, horizonY + height * 0.03);

  // Soft atmospheric haze bands
  for (let band = 0; band < 5; band++) {
    surface.fillStyle(presentation.colors.haze, 0.02 + presentation.attention * 0.015)
      .fillRect(view.from, height * (0.22 + band * 0.085), span, height * 0.08);
  }

  // Observer presence: enhanced radial glow field
  if (civ.stats.attention >= 50) {
    const observerX = worldWidth * (0.72 + hash01(civ.seed) * 0.12);
    if (observerX >= view.from - 120 && observerX <= view.to + 120) {
      const radius = 95 + presentation.attention * 35;
      surface.fillRadialGlow(observerX, height * 0.18, 0, radius, [
        { offset: 0, color: presentation.accent, alpha: 0.12 + presentation.attention * 0.12 },
        { offset: 0.45, color: presentation.accent, alpha: 0.05 + presentation.attention * 0.04 },
        { offset: 1, color: presentation.accent, alpha: 0 }
      ]);
      surface.lineStyle(1.5, presentation.accent, 0.14 + presentation.attention * 0.18)
        .strokeCircle(observerX, height * 0.18, 42);
      if (civ.stats.attention >= 75) {
        surface.lineStyle(1, presentation.accent, 0.1 + presentation.attention * 0.12)
          .strokeCircle(observerX, height * 0.18, 68);
      }
    }
  }
}

function drawTerrainContent(surface: DrawSurface, scene: WorldScene, height: number, view: WorldBand): void {
  const { civ, snapshot, presentation } = scene;
  const worldWidth = snapshot.worldWidth;
  const horizon = height * .69;
  const span = view.to - view.from;
  if (span <= 0) return;

  // Far ridge: continuous seeded polygon silhouette, low contrast, large geological forms
  const farStep = 130;
  const farFirst = Math.max(0, Math.floor(view.from / farStep));
  const farLast = Math.min(Math.ceil(worldWidth / farStep), Math.ceil(view.to / farStep));
  if (farLast >= farFirst) {
    const farPoints: Array<readonly [number, number]> = [];
    const startX = Math.max(0, farFirst * farStep);
    const endX = Math.min(worldWidth, farLast * farStep);
    farPoints.push([startX, horizon]);
    for (let i = farFirst; i <= farLast; i++) {
      const x = Math.min(worldWidth, Math.max(0, i * farStep));
      const h = 35 + hash01(civ.seed * 3 + i * 17) * 55 + Math.sin(i * 0.85 + civ.seed * 0.1) * 22;
      farPoints.push([x, horizon - Math.max(10, h)]);
    }
    farPoints.push([endX, horizon]);
    surface.fillStyle(presentation.colors.farTerrain, 0.78).fillPoly(farPoints);
  }

  // Mid ridge: continuous seeded polygon silhouette, tighter detail, stronger contrast
  const midColor = mixColor(presentation.colors.farTerrain, presentation.colors.nearTerrain, 0.55);
  const midStep = 85;
  const midFirst = Math.max(0, Math.floor(view.from / midStep));
  const midLast = Math.min(Math.ceil(worldWidth / midStep), Math.ceil(view.to / midStep));
  if (midLast >= midFirst) {
    const midPoints: Array<readonly [number, number]> = [];
    const startX = Math.max(0, midFirst * midStep);
    const endX = Math.min(worldWidth, midLast * midStep);
    midPoints.push([startX, horizon]);
    for (let i = midFirst; i <= midLast; i++) {
      const x = Math.min(worldWidth, Math.max(0, i * midStep));
      const h = 20 + hash01(civ.seed * 7 + i * 31) * 38 + Math.cos(i * 1.25 + civ.seed * 0.2) * 14;
      midPoints.push([x, horizon - Math.max(8, h)]);
    }
    midPoints.push([endX, horizon]);
    surface.fillStyle(midColor, 0.88).fillPoly(midPoints);
  }

  // Near terrain: base ground fill
  surface.fillStyle(presentation.colors.nearTerrain, 0.95).fillRect(view.from, horizon, span, height - horizon);
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

  // The capital silhouette and institution landmarks are permanent structures, so they belong here
  // beside the buildings rather than being repainted 30x/s.
  drawIdentityLandmarks(surface, civ, settlements, ground, presentation.accent, view);

  // Saved marks and scars are persistent world geometry, so they belong on this cached layer rather
  // than being repainted every frame. Each is culled by the same band as everything else here.
  drawWorldMemoryScenery(surface, civ, worldWidth, ground, settlements, presentation.accent, view);
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
  const span = view.to - view.from;
  if (span <= 0) return;

  // Multi-zone atmospheric wash: sky zone, horizon transition zone, and near terrain zone
  const horizonY = height * 0.68;
  const skySpan = horizonY;
  const groundSpan = height - horizonY;

  surface.fillStyle(live.colors.skyBottom, drift * 0.18).fillRect(view.from, 0, span, skySpan * 0.6);
  surface.fillStyle(live.accent, drift * 0.12).fillRect(view.from, skySpan * 0.6, span, skySpan * 0.4);
  surface.fillStyle(live.colors.nearTerrain, drift * 0.25).fillRect(view.from, horizonY, span, groundSpan);
}

function drawParticles(surface: DrawSurface, civ: Civilization, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, height: number, view: WorldBand, time: number, reducedMotion: boolean): void {
  const worldWidth = snapshot.worldWidth;
  const loopTime = reducedMotion ? 0 : time;
  const particleCount = snapshot.particleCount;
  for (let i = 0; i < particleCount; i++) {
    const baseX = hash01(civ.seed + i * 17) * worldWidth;
    const driftX = (baseX + (reducedMotion ? 0 : Math.sin(loopTime * 0.0003 + i * 11) * 15)) % worldWidth;
    const posX = driftX < 0 ? driftX + worldWidth : driftX;
    if (posX < view.from || posX > view.to) continue;

    const baseY = hash01(civ.seed + i * 31) * height * .58;
    const driftY = baseY + (reducedMotion ? 0 : Math.cos(loopTime * 0.0004 + i * 7) * 8);
    const twinkle = reducedMotion ? 1.0 : 0.75 + Math.sin(loopTime * 0.002 + i * 13) * 0.25;
    const alpha = (.18 + hash01(i * 41) * (.38 + presentation.awareness * .22)) * twinkle;
    const radius = (.55 + hash01(i * 7) * 1.7) * (i % 5 === 0 ? 1.25 : 1.0);

    surface.fillStyle(i % 9 === 0 ? presentation.accent : 0xc9e1ff, alpha)
      .fillCircle(posX, driftY, radius);
  }
}

export function drawHazeBands(surface: DrawSurface, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, width: number, height: number, animationTime: number, view: WorldBand, reducedMotion: boolean): void {
  const worldWidth = snapshot.worldWidth;
  const hazeBands = snapshot.hazeBands;
  const bandSpacing = worldWidth / Math.max(1, hazeBands);

  for (let i = 0; i < hazeBands; i++) {
    const speed = 0.015 + (i % 3) * 0.008;
    const rawX = (i * bandSpacing + (reducedMotion ? 0 : animationTime * speed)) % worldWidth;
    const bandWidth = Math.min(worldWidth * 0.35, 450 + (i % 3) * 80);
    const y = height * (0.24 + (i % 4) * 0.08) + (reducedMotion ? 0 : Math.sin(animationTime * 0.0006 + i) * 5);
    const h = 24 + (i % 3) * 6;

    // Draw haze band using layered translucent rect primitives to eliminate dynamic CanvasGradient allocations per frame
    for (const offset of [0, -worldWidth, worldWidth]) {
      const bx = rawX + offset;
      const bFrom = Math.max(view.from, bx);
      const bTo = Math.min(view.to, bx + bandWidth);
      if (bTo > bFrom) {
        const opacity = 0.022 + presentation.sanityDistortion * 0.025 + (i % 2) * 0.008;
        // Outer soft haze boundary
        surface.fillStyle(presentation.colors.haze, opacity * 0.45).fillRect(bFrom, y, bTo - bFrom, h);
        // Inner dense haze core
        const coreFrom = Math.max(bFrom, bx + bandWidth * 0.25);
        const coreTo = Math.min(bTo, bx + bandWidth * 0.75);
        if (coreTo > coreFrom) {
          surface.fillStyle(presentation.colors.haze, opacity * 0.55).fillRect(coreFrom, y + 2, coreTo - coreFrom, h - 4);
        }
      }
    }
  }
}

function drawLitWindows(surface: DrawSurface, scene: WorldScene, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, ground: number, animationTime: number, view: WorldBand): void {
  const civ = scene.civ;
  for (let i = 0; i < Math.min(scene.structures.length, 46); i++) {
    const structure = scene.structures[i]!;
    if (structure.x + structure.width < view.from || structure.x - structure.width > view.to) continue;
    if (snapshot.stage === 0) continue;

    const activityCycle = currentReducedMotion ? 0.75 : 0.5 + 0.5 * Math.sin(animationTime * 0.001 + i * 1.3);
    if (hash01(civ.seed + i * 73) > 0.15 + activityCycle * 0.6) continue;

    const effGround = structureEffectiveGround(ground, structure.depthLane);
    const rows = Math.max(2, Math.min(10, Math.trunc(structure.height / 18)));
    const intensity = 0.35 + activityCycle * 0.45;
    surface.fillStyle(presentation.colors.window, intensity)
      .fillRect(structure.x - structure.width * .28 + (i % 3) * 5, effGround - structure.height + 8 + (i % rows) * 13, 2.5 + snapshot.stage * .28, 3);
  }
}

/** A stable prefix, so shedding agents thins the crowd rather than reshuffling who is in it. */
function cosmeticAgents<T>(agents: ReadonlyArray<T>, fraction: number): ReadonlyArray<T> {
  if (fraction >= 1) return agents;
  return agents.slice(0, Math.ceil(agents.length * Math.max(0, fraction)));
}

// `agentFraction` is the adaptive-quality lever: a slow device draws fewer cosmetic inhabitants,
// never fewer fractures, beacons, landmarks, scars or construction cues.
function drawInhabitants(surface: DrawSurface, scene: WorldScene, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, ground: number, animationTime: number, view: WorldBand, agentFraction: number, reducedMotion: boolean): void {
  const { settlements, plan, species } = scene;
  const maxPedestrians = Math.ceil(plan.pedestrians.length * Math.max(0, agentFraction));
  for (let i = 0; i < maxPedestrians && i < plan.pedestrians.length; i++) {
    const pedestrian = plan.pedestrians[i]!;
    const settlement = settlements[pedestrian.settlementIndex];
    if (!settlement) continue;
    const travel = reducedMotion ? pedestrian.offset : (pedestrian.offset + animationTime * .000045 * pedestrian.speed) % 1;
    // Sanity's own channel: low Sanity makes the crowd move irregularly rather than merely tinting
    // the screen. The offset is a deterministic hash stepped every 600 ms, so it is a stagger rather
    // than jitter, and reduced motion keeps a smaller version instead of losing the signal.
    const irregular = (hash01(pedestrian.seed + Math.trunc(animationTime / 600)) - .5) * 12 * presentation.signals.motionIrregularity;
    const x = settlement.centerX - settlement.radius + travel * settlement.radius * 2 + (reducedMotion ? irregular * .35 : irregular);
    if (x < view.from || x > view.to) continue;
    const phase = reducedMotion ? 0 : (animationTime % species.gaitPeriod) / species.gaitPeriod;
    drawCreature(surface, species, casteFor(settlement.settlementClass), x, ground + 2 + pedestrian.lane * 3, .8 + snapshot.stage * .12, phase, presentation.accent);
  }
}

function drawTraffic(surface: DrawSurface, scene: WorldScene, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, ground: number, height: number, animationTime: number, view: WorldBand, agentFraction: number, reducedMotion: boolean): void {
  const { civ, plan } = scene;
  const worldWidth = snapshot.worldWidth;

  // Road traffic.
  const maxVehicles = Math.ceil(plan.vehicles.length * Math.max(0, agentFraction));
  for (let i = 0; i < maxVehicles && i < plan.vehicles.length; i++) {
    const vehicle = plan.vehicles[i]!;
    const travel = reducedMotion ? vehicle.phase : (vehicle.phase + animationTime * .00002 * vehicle.speed) % 1;
    const x = vehicle.fromX + (vehicle.toX - vehicle.fromX) * travel;
    if (x < view.from || x > view.to) continue;
    const length = 5 + snapshot.stage * 1.5;
    const y = ground + 10 + vehicle.lane * 7;
    surface.fillStyle(vehicle.seed % 2 ? presentation.accent : presentation.colors.window, .72).fillRect(x, y, length, 2.5);
    if (civ.era >= 2) surface.fillStyle(presentation.accent, .22).fillRect(x - length * .5, y + .8, length * .5, 1);
  }

  // Air corridors.
  const maxAircraft = Math.ceil(plan.aircraft.length * Math.max(0, agentFraction));
  for (let i = 0; i < maxAircraft && i < plan.aircraft.length; i++) {
    const aircraft = plan.aircraft[i]!;
    const travel = reducedMotion ? aircraft.phase : (aircraft.phase + animationTime * .00032 * aircraft.speed) % 1;
    const x = aircraft.fromX + (aircraft.toX - aircraft.fromX) * travel;
    if (x < view.from - 10 || x > view.to + 10) continue;
    const y = height * aircraft.altitude;
    surface.lineStyle(1.5, presentation.accent, .62).line(x - 10, y, x + 10, y);
    surface.fillStyle(0xffffff, .82).fillCircle(x, y, 1.5);
  }

  const maxOrbital = Math.ceil(plan.orbital.length * Math.max(0, agentFraction));
  for (let i = 0; i < maxOrbital && i < plan.orbital.length; i++) {
    const orbital = plan.orbital[i]!;
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

function drawBannersAndConstruction(surface: DrawSurface, scene: WorldScene, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, ground: number, height: number, time: number, tracker: ConstructionTracker, animationTime: number, view: WorldBand, reducedMotion: boolean): void {
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
      const effGround = structureEffectiveGround(ground, structure.depthLane);
      const progress = tracker.progress(structure.id, time);
      const top = effGround - structure.height;
      const buildY = effGround - structure.height * progress;
      surface.fillStyle(presentation.colors.skyBottom, .88).fillRect(structure.x - structure.width / 2 - 1, top, structure.width + 2, Math.max(0, buildY - top));
      surface.lineStyle(1.4, 0xf2cd7b, .7).line(structure.x - structure.width * .7, buildY, structure.x + structure.width * .7, buildY);
      surface.lineStyle(1, 0xf2cd7b, .34).line(structure.x - structure.width * .6, effGround, structure.x - structure.width * .6, top);
      surface.lineStyle(1, 0xf2cd7b, .34).line(structure.x + structure.width * .6, effGround, structure.x + structure.width * .6, top);
      for (let spark = 0; spark < 3; spark++) {
        surface.fillStyle(0xffd9a0, .6).fillCircle(structure.x + (hash01(spark * 31 + Math.trunc(animationTime / 90)) - .5) * structure.width, buildY + hash01(spark * 17 + Math.trunc(animationTime / 90)) * 6, 1.1);
      }
    }
  }
}

function drawAnomalies(surface: DrawSurface, scene: WorldScene, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, ground: number, height: number, animationTime: number, view: WorldBand, reducedMotion: boolean): void {
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

function drawDynamicContent(surface: DrawSurface, scene: WorldScene, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, width: number, height: number, time: number, tracker: ConstructionTracker, view: WorldBand, tier: RenderQualityTier): void {
  const { agentFraction } = qualityFactors(tier);
  const animationTime = currentReducedMotion ? 0 : time;
  const ground = height * GROUND_RATIO;

  // 1. Broad mood wash (underneath fine atmospheric particles and haze)
  drawMoodWash(surface, scene, presentation, view, height);

  // 2. Animated haze bands
  drawHazeBands(surface, snapshot, presentation, width, height, animationTime, view, currentReducedMotion);

  // 3. Environmental particles
  drawParticles(surface, scene.civ, snapshot, presentation, height, view, animationTime, currentReducedMotion);

  // Lit windows keep flickering across the settlement skyline.
  drawLitWindows(surface, scene, snapshot, presentation, ground, animationTime, view);

  // Stability's own channel: visible strain on the buildings themselves. Bounded to twelve visible
  // structures so a low-Stability world costs a fixed handful of lines rather than one per building.
  if (presentation.signals.structuralStrain > .18) {
    let drawn = 0;
    for (const structure of scene.structures) {
      if (drawn >= 12) break;
      if (structure.x < view.from - 20 || structure.x > view.to + 20) continue;
      const effGround = structureEffectiveGround(ground, structure.depthLane);
      const top = effGround - structure.height;
      surface.lineStyle(1, 0xee6973, .08 + presentation.signals.structuralStrain * .18)
        .line(structure.x - structure.width * .18, top + structure.height * .25, structure.x + structure.width * .12, top + structure.height * .42);
      drawn++;
    }
  }

  // Inhabitants.
  drawInhabitants(surface, scene, snapshot, presentation, ground, animationTime, view, agentFraction, currentReducedMotion);

  // Road traffic, air corridors, orbital, launches.
  drawTraffic(surface, scene, snapshot, presentation, ground, height, animationTime, view, agentFraction, currentReducedMotion);

  // Banners and construction.
  drawBannersAndConstruction(surface, scene, snapshot, presentation, ground, height, time, tracker, animationTime, view, currentReducedMotion);

  // Fractures, beacons, sanity distortion.
  drawAnomalies(surface, scene, snapshot, presentation, ground, height, animationTime, view, currentReducedMotion);

  drawPathAmbience(surface, scene.civ, snapshot.worldWidth, height, ground, animationTime, presentation.accent, view, pathIdentity(scene.civ).tier, qualityFactors(tier).ambientLoopFraction);

  // Only the halo over a scar animates; the scar geometry itself stays on the cached scenery layer.
  drawWorldMemoryAccents(surface, scene.civ, snapshot.worldWidth, ground, scene.settlements, presentation.accent, view, animationTime, currentReducedMotion);
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
  };

  private onPointerUp = () => { this.dragging = false; };
  private onPointerCancel = () => { this.dragging = false; };

  nudge(direction: number): void {
    this.scroll += direction * Math.max(220, this.getWidth() * .65);
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

  private staticSurface: CachedCanvasSurface;
  private scenerySurface: CachedCanvasSurface;
  private dynamicSurface: CachedCanvasSurface;

  width = 0;
  height = 0;
  dpr = getDevicePixelRatio();
  staticRedraws = 0;
  sceneryFullRedraws = 0;
  sceneryStripRedraws = 0;

  /** The scroll the scenery canvas currently shows, or NaN when its content cannot be reused. */
  private sceneryScroll = Number.NaN;
  private feedbackSequence = 0;
  private feedbackStartTime = 0;

  constructor(private host: HTMLElement, private onContextRestoredCallback?: () => void) {
    this.staticCanvas = document.createElement('canvas');
    this.sceneryCanvas = document.createElement('canvas');
    this.dynamicCanvas = document.createElement('canvas');
    this.staticCanvas.className = 'fallback-canvas fallback-static';
    this.sceneryCanvas.className = 'fallback-canvas fallback-scenery';
    this.dynamicCanvas.className = 'fallback-canvas fallback-dynamic';
    // Three unlabelled canvases would each present as an empty node. The host carries the name and
    // the world strip carries the numbers, so these are decoration to a screen reader.
    for (const canvas of [this.staticCanvas, this.sceneryCanvas, this.dynamicCanvas]) {
      canvas.setAttribute('aria-hidden', 'true');
      canvas.addEventListener?.('contextlost', this.handleContextLost);
      canvas.addEventListener?.('contextrestored', this.handleContextRestored);
    }
    this.staticContext = this.staticCanvas.getContext('2d')!;
    this.sceneryContext = this.sceneryCanvas.getContext('2d')!;
    this.dynamicContext = this.dynamicCanvas.getContext('2d')!;

    const colorFn = (value: number, alpha = 1) => this.color(value, alpha);
    this.staticSurface = new CachedCanvasSurface(this.staticContext, colorFn);
    this.scenerySurface = new CachedCanvasSurface(this.sceneryContext, colorFn);
    this.dynamicSurface = new CachedCanvasSurface(this.dynamicContext, colorFn);

    host.appendChild(this.staticCanvas);
    host.appendChild(this.sceneryCanvas);
    host.appendChild(this.dynamicCanvas);
  }

  private handleContextLost = (event: Event) => {
    event.preventDefault();
  };

  private handleContextRestored = () => {
    this.staticSurface.resetState();
    this.scenerySurface.resetState();
    this.dynamicSurface.resetState();
    this.invalidateScenery();
    this.onContextRestoredCallback?.();
  };

  setDpr(dpr: number): void {
    if (this.dpr === dpr) return;
    this.dpr = dpr;
    this.resize(this.width, this.height);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.resizeCanvas(this.staticCanvas);
    this.resizeCanvas(this.sceneryCanvas);
    this.resizeCanvas(this.dynamicCanvas);
    this.staticSurface.resetState();
    this.scenerySurface.resetState();
    this.dynamicSurface.resetState();
    this.invalidateScenery();
  }

  /** Drops the reuse of the scenery canvas: the next paint redraws the whole visible slice. */
  invalidateScenery(): void { this.sceneryScroll = Number.NaN; }

  private resizeCanvas(canvas: HTMLCanvasElement): void {
    canvas.width = Math.max(1, Math.round(this.width * this.dpr));
    canvas.height = Math.max(1, Math.round(this.height * this.dpr));
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
    if (context === this.staticContext) return this.staticSurface;
    if (context === this.sceneryContext) return this.scenerySurface;
    if (context === this.dynamicContext) return this.dynamicSurface;
    return canvasSurface(context, (value, alpha = 1) => this.color(value, alpha));
  }

  /** The two slow parallax layers. Small enough that a scroll simply repaints them. */
  drawStatic(scene: WorldScene, scroll: number): void {
    const context = this.staticContext;
    const surface = this.surface(context);
    const worldWidth = scene.snapshot.worldWidth;
    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    context.clearRect(0, 0, this.width, this.height);
    // Each layer paints only the slice its own parallax puts on screen.
    context.setTransform(this.dpr, 0, 0, this.dpr, -scroll * SKY_PARALLAX * this.dpr, 0);
    drawSkyContent(surface, scene, this.height, visibleBand(worldWidth, this.width, scroll, SKY_PARALLAX));
    context.setTransform(this.dpr, 0, 0, this.dpr, -scroll * TERRAIN_PARALLAX * this.dpr, 0);
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
    const shift = Number.isFinite(this.sceneryScroll) ? Math.round((this.sceneryScroll - scroll) * this.dpr) : Number.NaN;
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
      const exposedFrom = shift > 0 ? 0 : this.width + shift / this.dpr;
      const exposedSpan = Math.abs(shift) / this.dpr;
      band = {
        from: Math.max(0, scroll + exposedFrom - SCENERY_SLACK),
        to: Math.min(worldWidth, scroll + exposedFrom + exposedSpan + SCENERY_SLACK),
      };
      context.save();
      context.beginPath();
      context.rect(exposedFrom * this.dpr, 0, exposedSpan * this.dpr, deviceHeight);
      context.clip();
      this.sceneryStripRedraws++;
    }
    context.setTransform(this.dpr, 0, 0, this.dpr, -scroll * this.dpr, 0);
    drawSettlementContent(surface, scene, this.height, band);
    context.setTransform(1, 0, 0, 1, 0, 0);
  if (reusable) {
    context.restore();
    this.scenerySurface.resetState();
  }
    this.sceneryScroll = scroll;
  }

  drawDynamic(time: number, scene: WorldScene, civ: Civilization, scroll: number, tracker: ConstructionTracker, engine: GameEngine, tier: RenderQualityTier, phase: { from: number; to: number; start: number }): void {
    const context = this.dynamicContext;
    const surface = this.surface(context);
    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    context.clearRect(0, 0, this.width, this.height);
    // Only the stat-driven counts are resampled per frame; the structural geometry is whatever the
    // cached scene already resolved, so a frame no longer rebuilds settlement and agent budgets.
    const dynamicSnapshot = applyQualityToLiveSample({ ...scene.snapshot, ...liveWorldSample(civ, scene.snapshot.stage) }, tier);
    const dynamicPresentation = worldPresentation(civ);
    context.setTransform(this.dpr, 0, 0, this.dpr, -scroll * this.dpr, 0);
    drawDynamicContent(surface, scene, dynamicSnapshot, dynamicPresentation, this.width, this.height, time, tracker, visibleBand(scene.snapshot.worldWidth, this.width, scroll, 1), tier);
    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    drawPhaseTransitionImpact(surface, phase.from, phase.to, phase.start, time, this.width, this.height, dynamicPresentation.accent, currentReducedMotion);
    const feedback = engine.worldImpulse;
    if (feedback && feedback.sequence !== this.feedbackSequence) {
      this.feedbackSequence = feedback.sequence;
      this.feedbackStartTime = time;
    }
    if (feedback && this.feedbackStartTime > 0) {
      drawConsequenceImpact(surface, feedback, this.feedbackStartTime, time, this.width, this.height, dynamicPresentation.accent, currentReducedMotion, scroll, scene.snapshot.worldWidth, scene.settlements);
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
  }

  destroy(): void {
    for (const canvas of [this.staticCanvas, this.sceneryCanvas, this.dynamicCanvas]) {
      canvas.removeEventListener?.('contextlost', this.handleContextLost);
      canvas.removeEventListener?.('contextrestored', this.handleContextRestored);
    }
    this.staticCanvas.remove();
    this.sceneryCanvas.remove();
    this.dynamicCanvas.remove();
  }
}

class CanvasWorld implements WorldController {
  private input: WorldInput;
  private renderer: WorldRenderer;
  private mediaQueryList: MediaQueryList | null = null;
  private unsubscribeEngine: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private hostWidth = 0;
  private hostHeight = 0;
  private engineDirty = true;
  private lastFastKey = '';
  private raf = 0;
  private lastFrame = 0;
  private lastStructuralKey = '';
  private scene: WorldScene | null = null;
  private tracker = new ConstructionTracker(currentConstructionDuration);
  private quality = new RenderQualityController();
  private lastDramaPhaseId = -1;
  private phaseTransitionFrom = -1;
  private phaseTransitionTo = -1;
  private phaseTransitionStart = 0;
  private sceneRebuilds = 0;

  constructor(private engine: GameEngine, private host: HTMLElement) {
    this.renderer = new WorldRenderer(host, () => {
      this.lastStructuralKey = '';
      this.lastFastKey = '';
      this.input.lastStaticScroll = Number.NaN;
    });
    // The topmost canvas that still takes pointer events; the dynamic layer above it is inert.
    this.input = new WorldInput(this.renderer.sceneryCanvas, () => this.renderer.width);

    this.unsubscribeEngine = this.engine.onChange(() => { this.engineDirty = true; });

    this.mediaQueryList = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
    if (this.mediaQueryList) {
      currentReducedMotion = this.mediaQueryList.matches;
      currentConstructionDuration = currentReducedMotion ? CONSTRUCTION_REDUCED_MS : CONSTRUCTION_MS;
      this.tracker.setDuration(currentConstructionDuration);
      if (this.mediaQueryList.addEventListener) {
        this.mediaQueryList.addEventListener('change', this.onReducedMotionChange);
      }
    }

    if (globalThis.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const rect = entry.contentRect || entry.target.getBoundingClientRect();
          this.hostWidth = rect.width;
          this.hostHeight = rect.height;
        }
      });
      this.resizeObserver.observe(host);
    }
    const initialRect = host.getBoundingClientRect();
    this.hostWidth = initialRect.width;
    this.hostHeight = initialRect.height;

    this.loop(0);
  }

  private onReducedMotionChange = (e: MediaQueryListEvent) => {
    currentReducedMotion = e.matches;
    currentConstructionDuration = currentReducedMotion ? CONSTRUCTION_REDUCED_MS : CONSTRUCTION_MS;
    this.tracker.setDuration(currentConstructionDuration);
  };

  nudge(direction: number): void { this.input.nudge(direction); }

  stats(): RenderStats {
    return {
      sceneRebuilds: this.sceneRebuilds,
      staticRedraws: this.renderer.staticRedraws,
      sceneryFullRedraws: this.renderer.sceneryFullRedraws,
      sceneryStripRedraws: this.renderer.sceneryStripRedraws,
      qualityTier: this.quality.tier,
    };
  }

  private loop = (time: number): void => {
    this.raf = requestAnimationFrame(this.loop);
    if (time - this.lastFrame < (currentReducedMotion ? 180 : DYNAMIC_FRAME_MS)) return;
    this.lastFrame = time;

    const currentDpr = getDevicePixelRatio();
    if (currentDpr !== this.renderer.dpr) {
      this.renderer.setDpr(currentDpr);
      this.lastStructuralKey = '';
      this.lastFastKey = '';
      this.input.lastStaticScroll = Number.NaN;
    }

    let width = this.hostWidth;
    let height = this.hostHeight;
    // Reveal check: if recorded dimensions were zero or host changed from zero to visible
    if (width === 0 || height === 0 || this.renderer.width === 0 || this.renderer.height === 0) {
      const rect = this.host.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      this.hostWidth = width;
      this.hostHeight = height;
    }

    const resized = width !== this.renderer.width || height !== this.renderer.height;
    if (resized) {
      this.renderer.resize(Math.max(1, width), Math.max(1, height));
      this.lastStructuralKey = '';
      this.lastFastKey = '';
    }
    const civ = this.engine.state.civilization;
    if (!civ) return;

    const fastKey = fastPrimitiveKey(civ, this.renderer.width, this.renderer.height);
    if (!this.scene || fastKey !== this.lastFastKey || (this.engineDirty && fastKey !== this.lastFastKey)) {
      this.engineDirty = false;
      this.lastFastKey = fastKey;
      const key = `${structuralWorldKey(civ, this.renderer.width)}|${Math.round(this.renderer.height / 40)}|${civ.traits.join(',')}`;

      if (key !== this.lastStructuralKey) {
        this.lastStructuralKey = key;
        this.scene = buildScene(civ, this.renderer.width, this.renderer.height);
        // Read off the scene the rebuild just resolved, so the cue and the world it describes belong to
        // the same frame. Nothing is written back to the engine: a phase reached by surviving is
        // presented, never recorded.
        const nextPhase = this.scene.snapshot.stage ?? civilizationDramaPhase(civ).id;
        if (this.lastDramaPhaseId >= 0 && nextPhase !== this.lastDramaPhaseId) {
          this.phaseTransitionFrom = this.lastDramaPhaseId;
          this.phaseTransitionTo = nextPhase;
          this.phaseTransitionStart = time;
        }
        this.lastDramaPhaseId = nextPhase;
        this.tracker.sync(this.scene.structures, time);
        this.sceneRebuilds++;
        this.input.lastStaticScroll = Number.NaN;
        this.renderer.invalidateScenery();
      }
    }
    if (!this.scene) return;

    this.input.scroll = Math.max(0, Math.min(this.scene.snapshot.worldWidth - this.renderer.width, this.input.scroll));
    // Every layer paints at the same device-pixel-aligned scroll: the scenery layer moves by copying
    // itself, and a fractional move would resample -- and blur -- it once per drag frame.
    const dpr = this.renderer.dpr;
    const scroll = Math.round(this.input.scroll * dpr) / dpr;
    if (scroll !== this.input.lastStaticScroll) {
      this.input.lastStaticScroll = scroll;
      this.renderer.drawStatic(this.scene, scroll);
      this.renderer.drawScenery(this.scene, scroll);
    }
    this.tracker.prune(time);
    // Measured around the dynamic draw only: the cached layers repaint on scroll, not per frame, so
    // folding them in would read a drag as a slow device.
    const drawStart = globalThis.performance?.now?.() ?? time;
    this.renderer.drawDynamic(time, this.scene, civ, scroll, this.tracker, this.engine, this.quality.tier, { from: this.phaseTransitionFrom, to: this.phaseTransitionTo, start: this.phaseTransitionStart });
    const drawEnd = globalThis.performance?.now?.() ?? drawStart;
    this.quality.update(Math.max(0, drawEnd - drawStart), time);
  };

  destroy(): void {
    cancelAnimationFrame(this.raf);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.mediaQueryList?.removeEventListener) {
      this.mediaQueryList.removeEventListener('change', this.onReducedMotionChange);
    }
    if (this.unsubscribeEngine) {
      this.unsubscribeEngine();
      this.unsubscribeEngine = null;
    }
    this.tracker.reset();
    this.quality.reset();
    this.lastDramaPhaseId = -1;
    this.phaseTransitionFrom = -1;
    this.phaseTransitionTo = -1;
    this.phaseTransitionStart = 0;
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
    stats() { return world?.stats() ?? { sceneRebuilds: 0, staticRedraws: 0, sceneryFullRedraws: 0, sceneryStripRedraws: 0, qualityTier: 0 }; },
    destroy() { unsubscribe(); world?.destroy(); world = null; host.replaceChildren(); },
  };
}
