import type { GameEngine } from '../game/engine.js';
import type { Civilization, DecisionFeedback } from '../game/types.js';
import { CivilizationPaths } from '../game/paths.js';
import { civilizationDramaPhase } from '../game/drama.js';
import { applyQualityToLiveSample, liveWorldSample, worldSnapshot } from './world-model.js';
import { dynamicFrameIntervalMs, qualityFactors, RenderQualityController, type RenderQualityTier } from './quality.js';
import { structuralWorldKey, worldPresentation } from './world-presentation.js';
import { drawConsequenceImpact, drawPhaseTransitionImpact } from './consequence-presentation.js';
import { hash01, mixColor, ridgeNoise, shade, spreadPosition, tint } from './primitives.js';
import { CachedCanvasSurface, canvasSurface, type DrawSurface } from './draw-surface.js';
import { settlementLayout, structureEffectiveGround, worldOutskirts, type Outskirt, type Settlement, type Structure } from './settlements.js';
import { bannerGeometry, drawBanner, drawStructure, settlementCrown } from './structures.js';
import { casteFor, drawCreature, speciesProfile, type SpeciesProfile } from './species.js';
import { agentPlan, type AgentPlan } from './agents.js';
import { CONSTRUCTION_MS, CONSTRUCTION_REDUCED_MS, ConstructionTracker } from './construction.js';
import { factionRoster, UNALIGNED_COLOR, type Faction } from './factions.js';
import { drawWorldMemoryAccents, drawWorldMemoryScenery } from './world-memory.js';
import { drawIdentityLandmarks, drawPathAmbience, drawSettlementFrame, drawSettlementFrameAccent, FRAME_MAX_REACH, pathIdentity, settlementFrameReach } from './identity.js';
import { MAX_ROUTE_FLOW_MARKS, routeInBand, routeOffsetAt, routePointAt, routePolyline, tradeRoutes, type TradeRoute } from './routes.js';

export interface RenderStats { sceneRebuilds: number; staticRedraws: number; sceneryFullRedraws: number; sceneryStripRedraws: number; qualityTier: RenderQualityTier; }
export interface WorldController { nudge(direction: number): void; destroy(): void; stats(): RenderStats; }

function getDevicePixelRatio(): number {
  return Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
}
let currentReducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
let currentConstructionDuration = currentReducedMotion ? CONSTRUCTION_REDUCED_MS : CONSTRUCTION_MS;
// Ground sits low enough that the strip below it stays a framed foreground band rather than
// a quarter of the viewport filled with nothing.
export const GROUND_RATIO = .78;
// Where the distant terrain meets the sky. Shared, because the sky's horizon light field and the
// ridgelines it sits behind have to agree on it or the two layers show a seam.
const HORIZON_RATIO = .69;
// Parallax factors of the three cached layers, in the order they are painted. Exported so a test can
// state the reach of a layer in terms of the design rather than repeating the numbers.
export const SKY_PARALLAX = .1;
export const TERRAIN_PARALLAX = .52;
// How far past the band edge that culled it a single primitive may still reach. Exported so the cull
// test can state its ceiling in terms of the design instead of a magic number. Every wide light
// field -- the celestial glow, the observer's, a settlement's light spill -- is culled by its own
// radius rather than by a flat slack, so what actually shows up here is a memory mark or an outskirt
// prop reaching past the fixed slack its kind is culled by.
export const WIDEST_STATIC_PRIMITIVE = 230;
// Slack on each side of the visible slice, so an element anchored just off screen still paints the
// part that reaches into view.
export const CULL_MARGIN = 320;
// Half the width of a banner's cloth plus its pole, so one anchored at the band edge still paints.
const BANNER_SLACK = 40;
// Slack added around the strip a scroll exposes. `drawSettlementContent` already culls every
// settlement by its radius and every structure by its own width, so a narrow band is as correct as a
// wide one; this margin only absorbs the few marks drawn slightly beyond a declared extent. The
// strip redraw is checked against a full redraw of the same slice in the render tests, which is what
// keeps this number honest.
export const SCENERY_SLACK = 48;
// Half the widest outskirt prop plus the reach of a pylon's cable, so a prop anchored beyond the band
// edge still paints the part that reaches into it.
const OUTSKIRT_SLACK = 100;
// Ceiling on a settlement's light spill radius. A settlement's radius reaches 18% of the world, and a
// glow that wide would emit a primitive broader than the cull margin covers.
export const SPILL_MAX_RADIUS = 190;
export const SPILL_MIN_RADIUS = 50;
export const SPILL_CROWN_FACTOR = .8;
// The lattice the near field's furrows and props sit on.
const FIELD_CELL = 84;
// The lattice the foreground bank's profile is sampled on. Fine enough that the crest reads as a
// landform rather than as a repeated shape, coarse enough that a scenery strip redraw stays cheap.
const BANK_STEP = 32;

/** The slice of world a layer actually shows, in world px. */
interface WorldBand { from: number; to: number }

/**
 * How far into the world a parallax layer can ever be scrolled. A layer at factor `f` shows world
 * coordinates `scroll * f` to `scroll * f + width`, and the scroll itself stops at
 * `worldWidth - width` -- so the sky, at a tenth of the scroll, only ever exposes about a third of a
 * stage-4 world. Anything the sky places *on the world lattice* has to be placed inside this reach
 * or it is simply never seen: the celestial body was visible for roughly a fifth of the seeds at
 * stage 4 and the observer's own light field, anchored at 72% of the world, was visible at no stage
 * at all.
 */
export function layerReach(worldWidth: number, width: number, parallax: number): number {
  return Math.max(width, Math.max(0, worldWidth - width) * parallax + width);
}

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
  outskirts: Outskirt[];
  routes: TradeRoute[];
  plan: AgentPlan;
  species: SpeciesProfile;
  roster: Faction[];
}

function buildScene(civ: Civilization, width: number, height: number): WorldScene {
  const snapshot = worldSnapshot(civ, width);
  const presentation = worldPresentation(civ);
  const settlements = settlementLayout(civ, snapshot.worldWidth, height, snapshot);
  const structures = settlements.flatMap(settlement => settlement.structures);
  // The route network is resolved before the agents, because a vehicle rides a route rather than a
  // straight line between two centres: one curve is the authority for both the trace and the traffic.
  const routes = tradeRoutes(civ, settlements, snapshot);
  return {
    civ, snapshot, presentation, settlements, structures, routes,
    outskirts: worldOutskirts(civ, snapshot.worldWidth, snapshot, settlements),
    plan: agentPlan(civ, snapshot, settlements, routes), species: speciesProfile(civ), roster: factionRoster(civ),
  };
}

function factionColor(scene: WorldScene, settlement: Settlement): number {
  return settlement.factionIndex >= 0 ? (scene.roster[settlement.factionIndex]?.color ?? UNALIGNED_COLOR) : UNALIGNED_COLOR;
}

// Cloud banks are bounded by a count, not by the world: whatever the viewport and however wide the
// world, one sky repaint emits at most this many silhouettes and this many lit undersides.
const MAX_CLOUD_BANKS = 12;
/**
 * The settlement micro-light budget: the small, unresolved lights that make a night city read as
 * density rather than as a handful of lit windows. Bounded by a count and shared over the
 * settlements on screen, because this is per-frame work -- and shed by `windowFraction`, since a
 * micro-light is a cosmetic on top of the window lighting that already carries the state.
 */
export const MAX_SETTLEMENT_LIGHTS = 48;
/** Widest bank, so the sky's culling can be stated in terms of the design. */
const CLOUD_MAX_WIDTH = 300;
// The lattice the sky's atmospheric front is sampled on. Coarse enough that the whole front is one
// polygon of a couple of dozen points however wide the viewport, fine enough that its edge reads as
// a curve rather than as a run of straight segments.
const AIR_FRONT_STEP = 110;

/**
 * Cloud strata: three decks of soft, wide silhouette between the zenith and the ridgeline. This is
 * the layer the sky was missing -- a four-stop gradient with stars in it is a beautiful *surface*,
 * and what makes it read as air instead is something hanging in it at a known distance.
 *
 * Each bank is one tapered polygon under one vertical gradient plus one flattened light field along
 * its base, so a deck costs two primitives rather than a blur. It lives on the cached sky layer,
 * where that gradient is paid once per scroll instead of once per frame, and the decks are placed on
 * the world lattice so a scroll reveals new sky rather than sliding the same clouds along.
 */
function drawCloudStrata(surface: DrawSurface, scene: WorldScene, height: number, view: WorldBand, skyReach: number): void {
  const { civ, presentation } = scene;
  const colors = presentation.colors;
  const horizon = height * HORIZON_RATIO;
  // [centre as a fraction of the horizon, deck height, cell width, alpha]. The lower the deck the
  // thinner, the tighter and the more strongly lit from beneath it is -- which is the whole of the
  // aerial perspective the sky had none of.
  const decks: ReadonlyArray<readonly [number, number, number, number]> = [
    [.24, .052, 300, .10],
    [.44, .040, 232, .13],
    [.62, .026, 176, .17],
  ];
  let drawn = 0;
  for (let deck = 0; deck < decks.length && drawn < MAX_CLOUD_BANKS; deck++) {
    const [yFraction, heightFraction, cell, alpha] = decks[deck]!;
    const bankHeight = Math.max(6, horizon * heightFraction);
    const base = horizon * yFraction + bankHeight;
    // Lit from the horizon and from the city under it, dark against the sky it hangs in.
    const lit = mixColor(mixColor(colors.skyHorizon, colors.haze, .3), colors.lightSpill, .08 + deck * .1 * presentation.signals.activity);
    const dark = mixColor(colors.skyTop, colors.skyBottom, .3 + deck * .22);
    const first = Math.max(0, Math.floor(view.from / cell) - 1);
    const last = Math.ceil(view.to / cell) + 1;
    for (let index = first; index <= last && drawn < MAX_CLOUD_BANKS; index++) {
      // Most cells stay open sky. Awareness thickens the deck; entropy tears it open, so a failing
      // world loses its cloud cover instead of merely turning red. Read off the bands rather than
      // the raw stats for the same reason the entropy cues are: this deck is cached, and a threshold
      // that moves inside a band decides whether a cell holds cloud without anything keying on it.
      if (hash01(civ.seed * 3 + deck * 137 + index * 61) > .36 + deck * .06 + presentation.bands.awareness * .053 - presentation.bands.entropy * .08) continue;
      const anchor = (index + hash01(deck * 29 + index * 17)) * cell;
      if (anchor > skyReach) continue;
      const halfWidth = Math.min(CLOUD_MAX_WIDTH, cell * (.62 + hash01(index * 13 + deck * 7) * .5)) * .5;
      if (anchor + halfWidth < view.from || anchor - halfWidth > view.to) continue;
      const steps = 8;
      const outline: Array<readonly [number, number]> = [[anchor - halfWidth, base]];
      for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        // Tapered at both ends, so a bank thins into the sky instead of ending on a vertical edge.
        const lift = bankHeight * (.22 + ridgeNoise(t * 3.4 + index * .7, civ.seed + deck * 91, .5) * .95) * Math.sin(Math.PI * t);
        outline.push([anchor - halfWidth + halfWidth * 2 * t, base - lift]);
      }
      outline.push([anchor + halfWidth, base]);
      surface.fillLinearGradientPoly(outline, [
        { offset: 0, color: dark, alpha: alpha * .55 },
        { offset: .58, color: mixColor(dark, lit, .5), alpha },
        { offset: 1, color: lit, alpha: alpha * 1.3 },
      ], anchor, base - bankHeight, anchor, base + 2);
      surface.fillEllipseGlow(anchor, base, halfWidth * .92, bankHeight * .85, [
        { offset: 0, color: lit, alpha: alpha * (.45 + presentation.signals.activity * .5) },
        { offset: .55, color: lit, alpha: alpha * .2 },
        { offset: 1, color: lit, alpha: 0 },
      ]);
      drawn++;
    }
  }
}

/**
 * The sky half of the cached static layer: the gradient, the atmospheric falloff, the star field,
 * one celestial body, the cloud decks, the horizon light and the observer's own field, in that
 * order. It is repainted on every scrolled pixel, so everything here is either bounded by a count or
 * a handful of primitives wide. Drawn at `SKY_PARALLAX`, which is why `width` is a parameter:
 * anything anchored to a single world position has to be placed inside this layer's own reach.
 */
function drawSkyContent(surface: DrawSurface, scene: WorldScene, width: number, height: number, view: WorldBand): void {
  const { civ, snapshot, presentation } = scene;
  const worldWidth = snapshot.worldWidth;
  const span = view.to - view.from;
  if (span <= 0) return;
  const horizon = height * HORIZON_RATIO;
  const colors = presentation.colors;
  // Everything the sky anchors to the world lattice is placed inside the slice the sky's own
  // parallax can actually reach, never across the whole world.
  const skyReach = layerReach(worldWidth, width, SKY_PARALLAX);

  // 1. The sky itself: four stops, so the zenith, the upper air, the band the ridges sit against and
  // the horizon each get their own colour instead of one linear ramp between two.
  const upper = mixColor(colors.skyTop, colors.skyBottom, .34);
  surface.fillLinearGradientRect(view.from, 0, span, horizon + 2, [
    { offset: 0, color: colors.skyTop },
    { offset: .42, color: upper },
    { offset: .78, color: colors.skyBottom },
    { offset: 1, color: colors.skyHorizon },
  ], view.from, 0, view.from, horizon + 2);

  // 2. Atmospheric falloff toward the top of the frame. Environmental rather than a UI vignette: it
  // is the air thinning with altitude, so it darkens only downward from the very top and never
  // touches the edges of the screen.
  surface.fillLinearGradientRect(view.from, 0, span, height * .3, [
    { offset: 0, color: shade(colors.skyTop, .55), alpha: .5 },
    { offset: 1, color: shade(colors.skyTop, .55), alpha: 0 },
  ], view.from, 0, view.from, height * .3);

  // 2b. Weather across the world, rather than one sky repeated along it. The gradient above is
  // identical at every world position, so panning four viewports showed exactly the same air. This is
  // a slow atmospheric front laid over it, and the variation is deliberately in the front's *shape*:
  // a per-column alpha would have to step somewhere, and the open sky is the one surface in the frame
  // with nothing to break a vertical seam up. One polygon under one vertical gradient, its upper edge
  // a low-frequency ridge on the world lattice, so a scroll moves through the weather rather than
  // carrying it along.
  const frontBase = horizon - height * .02;
  const frontFloor = height * .1;
  const frontColor = mixColor(colors.haze, colors.skyHorizon, .5 + presentation.signals.activity * .2);
  const firstFront = Math.floor(view.from / AIR_FRONT_STEP) - 1;
  const lastFront = Math.ceil(view.to / AIR_FRONT_STEP) + 1;
  const frontEdge: Array<readonly [number, number]> = [[firstFront * AIR_FRONT_STEP, frontBase]];
  for (let i = firstFront; i <= lastFront; i++) {
    const x = i * AIR_FRONT_STEP;
    const lift = ridgeNoise(x / 780, civ.seed * 19 + 3, .32);
    frontEdge.push([x, frontBase - (frontBase - frontFloor) * (.2 + lift * .74)]);
  }
  frontEdge.push([lastFront * AIR_FRONT_STEP, frontBase]);
  surface.fillLinearGradientPoly(frontEdge, [
    { offset: 0, color: frontColor, alpha: 0 },
    { offset: .5, color: frontColor, alpha: .022 + presentation.sanityDistortion * .012 },
    { offset: 1, color: frontColor, alpha: .05 + presentation.entropy * .02 },
  ], view.from, frontFloor, view.from, frontBase);

  // 3. A deterministic star field. Placed on the world lattice rather than on screen, so it drifts
  // with the sky's parallax and a scroll reveals new sky instead of the same stars.
  const starCells = Math.max(0, Math.floor((view.to - view.from) / 46) + 1);
  const firstCell = Math.floor(view.from / 46);
  const starDensity = .34 + presentation.awareness * .3 - presentation.entropy * .18;
  for (let cell = 0; cell < starCells; cell++) {
    const index = firstCell + cell;
    const roll = hash01(civ.seed * 5 + index * 23);
    if (roll > starDensity) continue;
    const x = (index + hash01(index * 31 + civ.seed)) * 46;
    if (x < view.from || x > view.to) continue;
    const y = height * (.02 + hash01(index * 47 + civ.seed * 3) * .52);
    const bright = .18 + hash01(index * 13) * .4;
    surface.fillStyle(index % 7 === 0 ? presentation.accent : 0xdce9ff, bright).fillCircle(x, y, .5 + hash01(index * 71) * .8);
  }

  // 4. One celestial body, low and hazed, giving the whole scene a light direction.
  // Kept to the near half of the reachable sky, with the observer's own field confined to the far
  // half below: two light sources of that size landing on top of each other read as one artefact.
  const bodyX = skyReach * (.1 + hash01(civ.seed * 3 + 7) * .38);
  const bodyY = height * (.16 + hash01(civ.seed * 11) * .18);
  const bodyRadius = 16 + hash01(civ.seed * 17) * 12;
  const bodyGlow = bodyRadius * 4.5;
  // Culled by the glow's own reach, so the widest thing the sky can emit never lands further past
  // the band than its own extent -- which is what keeps `WIDEST_STATIC_PRIMITIVE` honest.
  if (bodyX + bodyGlow >= view.from && bodyX - bodyGlow <= view.to) {
    const bodyColor = mixColor(0xffe9c4, colors.skyHorizon, .35 + presentation.entropy * .4);
    surface.fillRadialGlow(bodyX, bodyY, 0, bodyGlow, [
      { offset: 0, color: bodyColor, alpha: .2 },
      { offset: .22, color: bodyColor, alpha: .07 },
      { offset: 1, color: bodyColor, alpha: 0 },
    ]);
    surface.fillStyle(bodyColor, .5).fillCircle(bodyX, bodyY, bodyRadius);
    surface.fillStyle(tint(bodyColor, .35), .3).fillCircle(bodyX - bodyRadius * .22, bodyY - bodyRadius * .22, bodyRadius * .68);
  }

  // 4b. The decks hanging between the body and the ridgeline.
  drawCloudStrata(surface, scene, height, view, skyReach);

  // 5. Horizon illumination: the light field that separates sky, distant terrain and skyline. Its
  // strength follows how developed and how observed the civilization is.
  const glowColor = mixColor(colors.skyHorizon, presentation.accent, .28 + presentation.awareness * .22);
  const glowTop = horizon - height * .3;
  surface.fillLinearGradientRect(view.from, glowTop, span, horizon - glowTop + 2, [
    { offset: 0, color: glowColor, alpha: 0 },
    { offset: .62, color: glowColor, alpha: .1 + presentation.attention * .07 + presentation.signals.activity * .06 },
    { offset: 1, color: glowColor, alpha: .26 + presentation.awareness * .12 + presentation.signals.activity * .1 },
  ], view.from, glowTop, view.from, horizon + 2);

  // 6. Observer presence. A light field with rings inside it rather than rings on their own, so high
  // Attention reads as something looking at the world instead of as decoration in the sky.
  if (civ.stats.attention >= 50) {
    const observerX = skyReach * (.62 + hash01(civ.seed) * .28);
    const radius = 95 + presentation.attention * 45;
    if (observerX + radius >= view.from && observerX - radius <= view.to) {
      const observerY = height * .18;
      surface.fillRadialGlow(observerX, observerY, 0, radius, [
        { offset: 0, color: presentation.accent, alpha: .13 + presentation.attention * .13 },
        { offset: .45, color: presentation.accent, alpha: .05 + presentation.attention * .04 },
        { offset: 1, color: presentation.accent, alpha: 0 },
      ]);
      surface.lineStyle(1.5, presentation.accent, .14 + presentation.attention * .18).strokeCircle(observerX, observerY, 42);
      if (civ.stats.attention >= 75) {
        surface.lineStyle(1, presentation.accent, .1 + presentation.attention * .12).strokeCircle(observerX, observerY, 68);
        // Spatial distortion under the gaze: the sky's own gradient bent into a lens, bounded so it
        // stays a pressure cue and never a full-screen effect.
        surface.fillRadialGlow(observerX, observerY, radius * .3, radius * .62, [
          { offset: 0, color: shade(colors.skyTop, .3), alpha: .14 * presentation.attention },
          { offset: 1, color: shade(colors.skyTop, .3), alpha: 0 },
        ]);
      }
    }
  }
}

/** One ridge profile, sampled on a fixed world lattice so a scroll never shifts the mountains. */
function ridgePoints(view: WorldBand, worldWidth: number, baseY: number, step: number, amplitude: number, wavelength: number, seed: number, detail: number): Array<readonly [number, number]> {
  const first = Math.max(0, Math.floor(view.from / step) - 1);
  const last = Math.min(Math.ceil(worldWidth / step) + 1, Math.ceil(view.to / step) + 1);
  if (last < first) return [];
  const points: Array<readonly [number, number]> = [];
  const startX = Math.max(0, first * step);
  points.push([startX, baseY]);
  for (let i = first; i <= last; i++) {
    const x = Math.min(worldWidth, Math.max(0, i * step));
    const h = amplitude * (.35 + ridgeNoise((i * step) / wavelength, seed, detail) * .65);
    points.push([x, baseY - h]);
  }
  points.push([Math.min(worldWidth, Math.max(0, last * step)), baseY]);
  return points;
}

/**
 * The terrain half of the cached static layer, back to front: three ridge profiles with the air
 * between them, the distant skyline standing on the mid ridge, the ground plane, the shelves
 * receding toward it, and -- from the second entropy band up -- the fissures and the reality shear.
 * Drawn at `TERRAIN_PARALLAX`, so `width` is here for the same reason it is in `drawSkyContent`.
 */
function drawTerrainContent(surface: DrawSurface, scene: WorldScene, width: number, height: number, view: WorldBand): void {
  const { civ, snapshot, presentation } = scene;
  const worldWidth = snapshot.worldWidth;
  // Same rule as the sky: anything this layer anchors to a single world position rather than to a
  // lattice across the visible band has to be placed inside the slice its parallax can reach.
  const terrainReach = layerReach(worldWidth, width, TERRAIN_PARALLAX);
  // The band, not the value: this layer is cached and only rebuilt when the band changes.
  const entropyBand = presentation.bands.entropy;
  const horizon = height * HORIZON_RATIO;
  const span = view.to - view.from;
  if (span <= 0) return;
  const colors = presentation.colors;

  // Three profiles, not one repeated shape. Each is a value-noise ridge on its own wavelength: the
  // far range carries the large geological forms, the mid range the detail, the foothills the
  // silhouette the settlements stand against. Amplitudes are fractions of the viewport, so a phone
  // gets the same composition rather than a strip of hills.
  const farAmplitude = Math.min(height * .2, 130);
  const midAmplitude = Math.min(height * .13, 84);
  const nearAmplitude = Math.min(height * .07, 46);

  // Far range: lowest contrast, fading into the horizon light at its own base.
  const far = ridgePoints(view, worldWidth, horizon + 2, 58, farAmplitude, 620, civ.seed * 3 + 11, .3);
  if (far.length > 2) {
    surface.fillLinearGradientPoly(far, [
      { offset: 0, color: mixColor(colors.farTerrain, colors.skyHorizon, .12), alpha: .92 },
      { offset: 1, color: mixColor(colors.farTerrain, colors.skyHorizon, .62), alpha: .92 },
    ], view.from, horizon - farAmplitude, view.from, horizon + 2);
  }

  // The air between the ranges. This band is what actually produces depth: without it the two
  // silhouettes touch and read as one cut-out.
  surface.fillLinearGradientRect(view.from, horizon - midAmplitude * 1.2, span, midAmplitude * 1.2, [
    { offset: 0, color: colors.haze, alpha: 0 },
    { offset: 1, color: colors.haze, alpha: .1 + presentation.sanityDistortion * .06 },
  ], view.from, horizon - midAmplitude * 1.2, view.from, horizon);

  // Mid range: stronger contrast, tighter forms, and a rim light where the horizon catches its edge.
  const midBase = horizon + 6;
  const midSeed = civ.seed * 7 + 29;
  const mid = ridgePoints(view, worldWidth, midBase, 40, midAmplitude, 330, midSeed, .5);
  if (mid.length > 2) {
    surface.fillLinearGradientPoly(mid, [
      { offset: 0, color: mixColor(colors.midTerrain, colors.skyHorizon, .1), alpha: .96 },
      { offset: 1, color: colors.midTerrain, alpha: .96 },
    ], view.from, horizon - midAmplitude, view.from, midBase);
    surface.lineStyle(1, mixColor(colors.skyHorizon, 0xffffff, .2), .16 + presentation.signals.activity * .1).strokePoly(mid.slice(1, -1));
  }

  // Reality shear. In the top entropy band the ridgeline itself stops being continuous: a slice of
  // it stands displaced from the land on either side, with the split lit from inside. Entropy had no
  // silhouette of its own before this -- it was a red sky, and a red sky is a palette, not a world
  // coming apart. Bounded to three slices, each one polygon and two seams.
  //
  // Both entropy cues are gated on the *band*, never on the raw value. This layer is cached and
  // `structuralWorldKey` rebuilds it on the band, so a threshold at 55 would sit inside the 50-74
  // band: the state would cross it, nothing would key on the crossing, and the shear would stay
  // absent until some unrelated rebuild happened to come along. Both the gate and the count have to
  // be functions of what the key tracks, or the cue is only as current as the last rebuild.
  if (entropyBand >= 3) {
    const shears = 3;
    for (let i = 0; i < shears; i++) {
      const centre = spreadPosition(terrainReach, i, hash01(civ.seed * 43 + 5));
      const halfWidth = 80 + hash01(civ.seed + i * 61) * 70;
      const from = Math.max(0, centre - halfWidth);
      const to = Math.min(worldWidth, centre + halfWidth);
      if (to < view.from || from > view.to) continue;
      const lift = 12 + hash01(i * 37) * 26;
      // The same ridge, sampled over the slice and displaced: the crest lifts, the base does not, so
      // the slice overpaints its own piece of the range instead of leaving a hole under it.
      const slice = ridgePoints({ from, to }, worldWidth, midBase, 40, midAmplitude, 330, midSeed, .5);
      if (slice.length <= 2) continue;
      const displaced: Array<readonly [number, number]> = [[from, midBase]];
      for (let point = 1; point < slice.length - 1; point++) displaced.push([slice[point]![0], slice[point]![1] - lift]);
      displaced.push([to, midBase]);
      surface.fillLinearGradientPoly(displaced, [
        { offset: 0, color: mixColor(colors.midTerrain, colors.skyHorizon, .16), alpha: .97 },
        { offset: 1, color: shade(colors.midTerrain, .2), alpha: .97 },
      ], from, horizon - midAmplitude - lift, from, midBase);
      const seam = .62;
      for (const edge of [from, to]) {
        surface.lineStyle(1.6, colors.ember, seam).line(edge, midBase, edge, midBase - midAmplitude * .55 - lift);
      }
      surface.fillEllipseGlow(centre, midBase - lift * .5, halfWidth * 1.1, lift * 2.2, [
        { offset: 0, color: colors.ember, alpha: seam * .2 },
        { offset: 1, color: colors.ember, alpha: 0 },
      ]);
    }
  }

  // The civilization continuing past the horizon: a distant skyline standing on the mid ridge, in
  // near-total aerial fade with a few lights in it. It is the one thing that makes the band between
  // the ridges and the settlement plane read as distance rather than as empty ground, and it grows
  // with the civilization instead of being scenery.
  drawDistantSkyline(surface, scene, height, view);

  // Foothills: the strongest silhouette, sitting below the horizon line and closing the distance to
  // the settlement plane.
  const near = ridgePoints(view, worldWidth, horizon + 18, 30, nearAmplitude, 190, civ.seed * 13 + 47, .62);
  if (near.length > 2) {
    surface.fillLinearGradientPoly(near, [
      { offset: 0, color: mixColor(colors.nearTerrain, colors.midTerrain, .35) },
      { offset: 1, color: colors.nearTerrain },
    ], view.from, horizon - nearAmplitude, view.from, horizon + 18);
  }

  // The ground plane behind the settlements, graded away from the light at the horizon rather than
  // filled flat -- the flat fill is what made the lower third of the frame read as dead space.
  surface.fillLinearGradientRect(view.from, horizon + 14, span, height - horizon - 14, [
    { offset: 0, color: mixColor(colors.nearTerrain, colors.skyHorizon, .14) },
    { offset: .45, color: colors.nearTerrain },
    { offset: 1, color: colors.groundNear },
  ], view.from, horizon + 14, view.from, height);

  // Three shelves of land receding toward the ridges, each with the air of its own distance pooled
  // along its foot. A graded fill still reads as one surface; low crests with mist between them are
  // what turn the same band into ground with distance in it, and they cost a polygon each.
  const groundSpan = height - horizon - 14;
  for (let shelf = 0; shelf < 3; shelf++) {
    const shelfBase = horizon + 16 + groundSpan * (.2 + shelf * .27);
    const shelfHeight = 10 + shelf * 9;
    const shelfPoints = ridgePoints(view, worldWidth, shelfBase, 68, shelfHeight, 520 - shelf * 150, civ.seed * 23 + shelf * 71, .38);
    if (shelfPoints.length <= 2) continue;
    // The mist the shelf stands in, laid down first so the crest rises out of it.
    surface.fillLinearGradientRect(view.from, shelfBase - shelfHeight - 10, span, shelfHeight + 12, [
      { offset: 0, color: colors.haze, alpha: 0 },
      { offset: 1, color: colors.haze, alpha: (.09 - shelf * .022) + presentation.sanityDistortion * .04 },
    ], view.from, shelfBase - shelfHeight - 10, view.from, shelfBase + 2);
    surface.fillLinearGradientPoly(shelfPoints, [
      { offset: 0, color: mixColor(colors.nearTerrain, colors.skyHorizon, .2 - shelf * .06), alpha: .95 },
      { offset: 1, color: shade(mixColor(colors.nearTerrain, colors.groundNear, .45 + shelf * .25), shelf * .12), alpha: .95 },
    ], view.from, shelfBase - shelfHeight, view.from, shelfBase + 6);
    // The crest catching the horizon, so each shelf ends on an edge instead of dissolving into the
    // one behind it. This is the whole of what turns a graded band into receding ground.
    surface.lineStyle(1, mixColor(colors.skyHorizon, colors.groundNear, .35 + shelf * .2), .2 - shelf * .045)
      .strokePoly(shelfPoints.slice(1, -1));
  }

  // Entropy crossing the land itself. Reality failing is a state the sky already carries as colour;
  // this is the same state written into the ground, so a collapsing world is legible from its
  // terrain and not only from its palette. Bounded to five, and only above the second entropy band.
  if (entropyBand >= 2) {
    const cracks = entropyBand >= 3 ? 5 : 3;
    for (let i = 0; i < cracks; i++) {
      const x = spreadPosition(terrainReach, i, hash01(civ.seed * 31 + 9));
      if (x + FISSURE_REACH < view.from || x - FISSURE_REACH > view.to) continue;
      // Up through the ridges and down to the edge of the settlement plane. Below that the scenery
      // layer's own ground is painted over this one, so a crack drawn to the bottom of the frame
      // spent most of its length under an opaque fill and read as a scratch above the horizon.
      const topY = horizon - 34 - hash01(i * 13) * 78;
      const bottomY = horizon + 54 + hash01(i * 41) * 14;
      const lean = (hash01(civ.seed + i * 53) - .5) * 90;
      const mid = topY + (bottomY - topY) * .55;
      const glow = entropyBand >= 3 ? .56 : .36;
      // The land split open and lit from inside it: a wide dim seam under a narrow bright one, plus
      // a branch off the elbow. Three strokes per crack, five cracks -- the cost of a state cue, not
      // of a weather system.
      surface.lineStyle(entropyBand >= 3 ? 8 : 5, colors.ember, glow * .22)
        .strokePoly([[x, topY], [x + lean * .35, mid], [x + lean, bottomY]]);
      surface.lineStyle(entropyBand >= 3 ? 2.6 : 1.8, colors.ember, glow)
        .strokePoly([[x, topY], [x + lean * .35, mid], [x + lean, bottomY]]);
      surface.lineStyle(1, colors.ember, glow * .5)
        .strokePoly([[x + lean * .35, mid], [x + lean * .35 - 34, bottomY]]);
      // The light the split puts on the land around it, flattened along the seam.
      surface.fillEllipseGlow(x + lean * .35, mid, 46, 26, [
        { offset: 0, color: colors.ember, alpha: glow * .16 },
        { offset: 1, color: colors.ember, alpha: 0 },
      ]);
    }
  }
}

// Half the widest distant tower plus the lean of an entropy fissure, so the terrain layer can state
// its own culling slack rather than borrowing the settlement layer's.
const FISSURE_REACH = 60;
const DISTANT_TOWER_CELL = 34;

/**
 * The far side of the same civilization: a low skyline standing on the mid ridge, faded almost into
 * the horizon light and carrying a handful of window lights. It appears once a world has towns to be
 * seen from a distance, thickens with development, and is drawn between the mid ridge and the
 * foothills so the near silhouette closes over its feet.
 */
function drawDistantSkyline(surface: DrawSurface, scene: WorldScene, height: number, view: WorldBand): void {
  const { civ, snapshot, presentation } = scene;
  if (snapshot.stage < 2) return;
  const colors = presentation.colors;
  const horizon = height * HORIZON_RATIO;
  // Deep aerial perspective: the distant city is mostly the air in front of it.
  const body = mixColor(mixColor(colors.midTerrain, colors.settlement, .34), colors.skyHorizon, .34);
  const density = .24 + Math.min(.3, snapshot.buildingCount / 220) + (snapshot.stage - 2) * .07;
  const first = Math.max(0, Math.floor(view.from / DISTANT_TOWER_CELL) - 1);
  const last = Math.ceil(view.to / DISTANT_TOWER_CELL) + 1;
  // On the mid ridge, not on the ground: the foothills are painted after this and close over the
  // feet of it, which is what puts the distant city genuinely behind them rather than in front.
  const baseY = horizon + 7;
  for (let index = first; index <= last; index++) {
    const roll = hash01(civ.seed * 17 + index * 37);
    if (roll > density) continue;
    const x = index * DISTANT_TOWER_CELL + hash01(index * 71) * DISTANT_TOWER_CELL * .6;
    if (x < view.from - DISTANT_TOWER_CELL || x > view.to + DISTANT_TOWER_CELL) continue;
    const towerWidth = 4 + hash01(index * 29) * 9;
    const towerHeight = (10 + hash01(index * 53) * 32) * (.7 + (snapshot.stage - 2) * .2);
    surface.fillStyle(body, .88).fillRect(x, baseY - towerHeight, towerWidth, towerHeight);
    // One lit window per lit tower, at the world's own light level: enough to say the distance is
    // inhabited, never enough to compete with the settlements in front of it.
    if (hash01(index * 97) < .38) {
      surface.fillStyle(colors.lightSpill, .14 + presentation.lightLevel * .3)
        .fillRect(x + towerWidth * .3, baseY - towerHeight * (.35 + hash01(index * 11) * .4), Math.max(1, towerWidth * .34), 1.8);
    }
  }
  // The haze the distant skyline stands in, closing it back into the horizon light.
  surface.fillLinearGradientRect(view.from, baseY - 42, view.to - view.from, 48, [
    { offset: 0, color: colors.haze, alpha: 0 },
    { offset: 1, color: colors.haze, alpha: .13 + presentation.signals.activity * .06 },
  ], view.from, baseY - 42, view.from, baseY + 6);
}

/** The props that fill the land between settlements. Small, cheap and culled one by one. */
function drawOutskirt(surface: DrawSurface, prop: Outskirt, ground: number, presentation: ReturnType<typeof worldPresentation>): void {
  const colors = presentation.colors;
  const scale = prop.scale;
  const x = prop.x;
  if (prop.kind === 'field') {
    const width = 46 * scale;
    surface.fillStyle(mixColor(colors.groundNear, 0x3f4c28, .3), .5).fillRect(x - width, ground + 2, width * 2, 9 * scale);
    for (let row = 0; row < 3; row++) surface.lineStyle(1, mixColor(colors.groundNear, 0x6f9c55, .3), .18).line(x - width, ground + 3 + row * 3 * scale, x + width, ground + 3 + row * 3 * scale);
  } else if (prop.kind === 'grove') {
    for (let i = 0; i < 3; i++) {
      const treeX = x + (i - 1) * 13 * scale;
      const treeHeight = (12 + hash01(prop.seed + i * 19) * 12) * scale;
      surface.fillStyle(shade(mixColor(colors.nearTerrain, 0x2f4a2c, .34), .18), .92).fillTriangle(treeX - 5 * scale, ground, treeX, ground - treeHeight, treeX + 5 * scale, ground);
    }
  } else if (prop.kind === 'pylon') {
    const poleHeight = (34 + hash01(prop.seed) * 26) * scale;
    surface.lineStyle(1.4, shade(colors.settlement, .2), .8).line(x, ground, x, ground - poleHeight);
    surface.lineStyle(1, shade(colors.settlement, .1), .6).line(x - 7 * scale, ground - poleHeight * .78, x + 7 * scale, ground - poleHeight * .78);
    // A short span of cable each side, not a wire across the world: the prop has to stay inside the
    // slack the caller culls it by.
    surface.lineStyle(1, colors.haze, .16).line(x - 92, ground - poleHeight * .62, x, ground - poleHeight * .78);
    surface.lineStyle(1, colors.haze, .16).line(x, ground - poleHeight * .78, x + 92, ground - poleHeight * .62);
  } else if (prop.kind === 'ruin') {
    for (let i = 0; i < 2; i++) {
      const w = (10 + hash01(prop.seed + i * 7) * 12) * scale;
      const h = (14 + hash01(prop.seed + i * 23) * 22) * scale;
      surface.fillStyle(shade(colors.settlement, .55), .9).fillRect(x - 14 * scale + i * 18 * scale, ground - h, w, h);
      surface.lineStyle(1, shade(colors.settlement, .25), .4).line(x - 14 * scale + i * 18 * scale, ground - h, x - 14 * scale + i * 18 * scale + w, ground - h * .78);
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const rockX = x + (i - 1) * 9 * scale;
      const size = (3 + hash01(prop.seed + i * 13) * 5) * scale;
      surface.fillStyle(shade(colors.nearTerrain, .3), .9).fillTriangle(rockX - size, ground + 2, rockX, ground - size, rockX + size, ground + 2);
    }
  }
}

/**
 * The whole of the cached scenery layer: the settlement plane, the outskirts, the roads, every
 * settlement's light spill and structures, the near field, the foreground bank, the identity
 * landmarks and the world's saved marks. It moves 1:1 with the scroll, so a scroll copies the canvas
 * onto itself and repaints only the exposed strip -- which is why every primitive here is culled by
 * its own extent rather than by its owner's, and why nothing in it may animate.
 */
export function drawSettlementContent(surface: DrawSurface, scene: WorldScene, height: number, view: WorldBand): void {
  const { civ, snapshot, presentation, settlements, outskirts } = scene;
  const worldWidth = snapshot.worldWidth;
  const stage = snapshot.stage;
  const ground = height * GROUND_RATIO;
  const span = view.to - view.from;
  if (span <= 0) return;
  const colors = presentation.colors;
  const lightLevel = presentation.lightLevel;
  // What the dominant path builds with. Read once for the whole layer, and only from a path the
  // civilization has actually settled into: a leading affinity is not yet an architecture.
  const identity = pathIdentity(civ);
  const skylineCrown = identity.tier >= 2 && identity.crown !== 'none' ? identity.crown : undefined;

  // The settlement plane, graded rather than flat, with the verge right under the buildings catching
  // the light the city puts out.
  surface.fillLinearGradientRect(view.from, ground - 6, span, height - ground + 6, [
    { offset: 0, color: mixColor(colors.groundNear, colors.lightSpill, .1 * lightLevel) },
    { offset: .35, color: colors.groundNear },
    { offset: 1, color: colors.groundDeep },
  ], view.from, ground - 6, view.from, height);

  // The land between the settlements, before the roads and the buildings that stand on it.
  for (const prop of outskirts) {
    if (prop.x + OUTSKIRT_SLACK < view.from || prop.x - OUTSKIRT_SLACK > view.to) continue;
    drawOutskirt(surface, prop, ground, presentation);
  }

  // The trade network, as the traces it wore into the ground rather than as rectangles between
  // centres. `routes.ts` owns the geometry and the lattice it is sampled on; this turns one curve
  // into a roadbed, the lit curb along its near edge and the lane markings that follow it. Every
  // point comes off a lattice fixed in world space, so a strip redraw emits exactly what a full
  // redraw of the same slice does.
  if (stage > 0) {
    const roadHeight = 12 + stage * 3;
    for (const route of scene.routes) {
      if (!routeInBand(route, view.from, view.to)) continue;
      const spine = routePolyline(route, view.from, view.to);
      if (spine.length < 2) continue;
      const near: Array<readonly [number, number]> = spine.map(([x, offset]) => [x, ground + 4 + offset] as const);
      const bed: Array<readonly [number, number]> = [...near];
      for (let i = spine.length - 1; i >= 0; i--) bed.push([spine[i]![0], ground + 4 + roadHeight + spine[i]![1]]);
      surface.fillStyle(0x11191f, .98).fillPoly(bed);
      // A lit curb along the near edge: the road is the one surface that reflects the city, and a
      // busier route reflects more of it.
      surface.lineStyle(1, colors.lightSpill, .12 + lightLevel * .12 + route.flow * .08).strokePoly(near);
      // Lane markings on a 42 px lattice inside the road, riding the bed rather than ruling a
      // straight line through it; dash d spans [fromX + 42d + 10, +18], so it shows once its right
      // edge clears view.from. Ceil, or the run starts one dash too early.
      const firstDash = Math.max(0, Math.ceil((view.from - route.fromX - 28) / 42));
      for (let dash = firstDash; dash * 42 < route.span; dash++) {
        const dashX = route.fromX + dash * 42 + 10;
        if (dashX > view.to) break;
        surface.fillStyle(colors.window, .18).fillRect(dashX, ground + 10 + stage + routeOffsetAt(route, dashX), 18, 2);
      }
    }
    if (stage >= 2) surface.lineStyle(2, presentation.accent, .24).line(view.from, ground - 9, view.to, ground - 9);
    if (stage >= 4) surface.lineStyle(2, presentation.accent, .4).line(view.from, ground - 18, view.to, ground - 18);
  } else {
    // A track rather than a highway: it only exists where the camp is, so an empty stage-0 world is
    // not crossed by a full-width brown band.
    for (const settlement of settlements) {
      const trackFrom = settlement.centerX - settlement.radius * 1.6;
      const trackSpan = settlement.radius * 3.2;
      if (trackFrom > view.to || trackFrom + trackSpan < view.from) continue;
      surface.fillStyle(mixColor(0x493821, colors.groundNear, .45), .85).fillRect(trackFrom, ground + 4, trackSpan, 9);
    }
  }

  for (const settlement of settlements) {
    // Light spill: the glow a settlement puts into the air above itself, painted behind its own
    // skyline and shaped by it -- it rises with the tallest structure instead of sitting on the
    // ground as a patch of fog, and is capped at SPILL_MAX_RADIUS.
    const crown = settlementCrown(settlement, ground);
    const spillRadius = Math.min(SPILL_MAX_RADIUS, Math.max(SPILL_MIN_RADIUS, crown * SPILL_CROWN_FACTOR));
    // The first cut has to be the *widest* thing this settlement paints, not its footprint. A tall
    // settlement's glow reaches tens of pixels past its own radius, so a footprint-first guard drops
    // that glow from a narrow strip redraw while a full redraw of the same slice paints it -- and the
    // cached layer then differs from a full repaint until the next invalidation. Structures and the
    // glow are still each checked by their own extent below; this only decides whether anything
    // belonging to this settlement can reach the band at all.
    const reach = Math.max(settlement.radius, spillRadius);
    if (settlement.centerX - reach > view.to || settlement.centerX + reach < view.from) continue;
    if (stage > 0 && settlement.centerX + spillRadius >= view.from && settlement.centerX - spillRadius <= view.to) {
      const spillStrength = lightLevel * (settlement.settlementClass === 'camp' ? .3 : settlement.settlementClass === 'village' ? .5 : 1);
      // Flattened, because a city's glow is: it spreads along the skyline and thins quickly upward.
      // A circle of the same horizontal reach climbed a quarter of the sky and read as weather.
      surface.fillEllipseGlow(settlement.centerX, ground - crown * .42, spillRadius, spillRadius * .74, [
        { offset: 0, color: colors.lightSpill, alpha: .1 * spillStrength },
        { offset: .5, color: colors.lightSpill, alpha: .045 * spillStrength },
        { offset: 1, color: colors.lightSpill, alpha: 0 },
      ]);
    }
    // The archetype mass this civilization builds inside, behind its own skyline. Culled by its own
    // reach, which `settlementFrameReach` bounds well inside the settlement's radius -- the frame is
    // a silhouette around the city, and a mass as wide as a settlement's full radius would read as
    // weather rather than as architecture.
    if (identity.frame !== 'none' && identity.tier >= 2) {
      const frameReach = settlementFrameReach(settlement.radius);
      if (settlement.centerX + frameReach >= view.from && settlement.centerX - frameReach <= view.to) {
        drawSettlementFrame(surface, identity.frame, { centerX: settlement.centerX, radius: settlement.radius, crown, seed: settlement.lightPhase * Math.PI * 2 },
          ground, presentation.accent, identity.tier, colors.lightSpill);
      }
    }
    for (const structure of settlement.structures) {
      if (structure.x + structure.width < view.from || structure.x - structure.width > view.to) continue;
      drawStructure(surface, structure, ground, colors.settlement, presentation.accent, colors.window, civ.seed, {
        // Aerial perspective is measured against the air the ridges fade into, so a back-lane
        // building and a distant ridge agree about how much atmosphere is between them and the eye.
        fadeColor: mixColor(colors.skyHorizon, colors.haze, .4),
        fade: 1,
        lightLevel,
        // The same light the spill, the lamps and the road reflections use, so a chimney and a
        // launch pad belong to this settlement's night rather than to a palette of their own.
        lightColor: colors.lightSpill,
        crown: skylineCrown,
      });
    }
    // A faction-colored plinth marks who holds the settlement even in the cached layer.
    const plinthHalf = settlement.radius * .22;
    if (stage > 0 && settlement.centerX + plinthHalf >= view.from && settlement.centerX - plinthHalf <= view.to) {
      surface.fillStyle(factionColor(scene, settlement), .5).fillRect(settlement.centerX - plinthHalf, ground - 3, plinthHalf * 2, 3);
    }
  }

  // The near field: the strip between the road and the foreground bank. It used to be flat fill, and
  // an eighth of every frame was dead space because of it. Worked ground and foreground growth on a
  // fixed lattice, so a scroll reveals more of the same land rather than sliding a texture across it.
  // This is the plane closest to the eye, so its detail is the highest-contrast in the world.
  const fieldTop = ground + 20 + stage * 3;
  const fieldSpan = Math.max(0, height - Math.max(14, (height - ground) * .34) - fieldTop);
  if (fieldSpan > 8) {
    const furrowColor = mixColor(colors.groundNear, colors.groundDeep, .55);
    const growthColor = shade(colors.groundDeep, .45);
    const firstCell = Math.max(0, Math.floor(view.from / FIELD_CELL));
    for (let cell = firstCell; cell * FIELD_CELL <= view.to; cell++) {
      const x = cell * FIELD_CELL;
      if (x + FIELD_CELL < view.from) continue;
      const roll = hash01(civ.seed * 7 + cell * 43);
      const depth = hash01(cell * 61 + civ.seed);
      // A furrow band per cell, following the ground rather than ruling a straight line across it.
      surface.lineStyle(1, furrowColor, .6)
        .line(x, fieldTop + fieldSpan * (.18 + roll * .5), x + FIELD_CELL, fieldTop + fieldSpan * (.22 + roll * .5));
      if (roll < .42) {
        // Foreground growth: a clump of three, the nearest one largest, in near-silhouette.
        const clumpX = x + FIELD_CELL * (.15 + roll);
        const clumpY = fieldTop + fieldSpan * (.42 + depth * .5);
        const size = 5 + depth * 9;
        for (let i = 0; i < 3; i++) {
          const bladeX = clumpX + (i - 1) * size * .55;
          const bladeH = size * (i === 1 ? 1 : .62);
          surface.fillStyle(growthColor, .82).fillTriangle(bladeX - size * .34, clumpY + size * .3, bladeX, clumpY - bladeH, bladeX + size * .34, clumpY + size * .3);
        }
      } else if (roll > .58 && stage >= 1) {
        // A fence line running with the road, catching the same light the lamps put out.
        const postY = fieldTop + fieldSpan * (.32 + depth * .3);
        surface.lineStyle(1, growthColor, .7).line(x + FIELD_CELL * .2, postY, x + FIELD_CELL * .2, postY + 7 + depth * 5);
        surface.lineStyle(1, mixColor(growthColor, colors.lightSpill, .25), .3 + lightLevel * .2).line(x + FIELD_CELL * .2, postY + 2, x + FIELD_CELL * 1.2, postY + 3);
      }
      if (depth > .82 && stage >= 2) {
        // A service track catching the same light the road does.
        surface.fillStyle(colors.lightSpill, .05 + lightLevel * .05).fillRect(x + FIELD_CELL * .2, fieldTop + fieldSpan * .74, FIELD_CELL * .5, 1.6);
      }
    }
  }

  // Foreground bank: the plane closest to the eye, and the one that used to be a black slab across
  // the bottom eighth of every frame. It is now a graded bank with a lit crest, a continuous crest
  // line rather than a row of separate triangles, and a handful of near-silhouette props standing on
  // it -- so the strip below the road frames the world instead of cutting a hole in it.
  const bankTop = height - Math.max(14, (height - ground) * .34);
  const bankColor = mixColor(colors.groundDeep, 0x000000, .18);
  surface.fillLinearGradientRect(view.from, bankTop - 4, span, height - bankTop + 4, [
    { offset: 0, color: mixColor(bankColor, colors.groundNear, .5) },
    { offset: .3, color: mixColor(bankColor, colors.groundNear, .18) },
    { offset: 1, color: bankColor },
  ], view.from, bankTop - 4, view.from, height);
  // A sampled profile rather than one trough and one spike per cell. The previous crest alternated
  // those two on a fixed 96 px lattice, which is a sawtooth however the spike height is hashed -- and
  // it was the most obviously repeated shape left in the frame, on the plane closest to the eye.
  // Sampling a two-octave ridge on a finer lattice makes the same two polygons a landform instead:
  // long swells carrying short detail, with no forced return to the baseline between them. The
  // lattice is fixed in world space, so a strip redraw emits exactly the points a full redraw does.
  const bankProfile = (index: number): number => {
    const worldX = index * BANK_STEP;
    const swell = ridgeNoise(worldX / 430, civ.seed * 5 + 13, .22);
    const detail = ridgeNoise(worldX / 116 + 7.3, civ.seed * 9 + 41, .55);
    return 3 + swell * 22 + detail * 11;
  };
  const firstBank = Math.max(0, Math.floor((view.from - BANK_STEP) / BANK_STEP) - 1);
  const crestLine: Array<readonly [number, number]> = [];
  const backCrest: Array<readonly [number, number]> = [];
  for (let i = firstBank; i * BANK_STEP < worldWidth + BANK_STEP; i++) {
    const x = i * BANK_STEP;
    if (x > view.to + BANK_STEP * 2) break;
    if (!crestLine.length) { crestLine.push([x, height]); backCrest.push([x, height]); }
    crestLine.push([x, bankTop - bankProfile(i)]);
    // The back row is the same landform seen from further away: half the relief, a step behind, and
    // sampled half a cell across so its crests never line up with the ones in front of them.
    backCrest.push([x, bankTop + 6 - bankProfile(i + 1) * .45]);
  }
  if (crestLine.length > 2) {
    const last = crestLine[crestLine.length - 1]![0];
    backCrest.push([last, height]);
    // The second, lower row of crests behind the first, offset half a cell, so the bank has a back.
    surface.fillStyle(shade(bankColor, .45), 1).fillPoly(backCrest);
    crestLine.push([last, height]);
    surface.fillStyle(bankColor, 1).fillPoly(crestLine);
    // The rim light where the crest catches the city behind it. Weak and following the crest: a
    // strong one turned the bank into an outlined shape rather than a landform in shadow.
    surface.lineStyle(1, mixColor(presentation.accent, colors.lightSpill, .5), .05 + lightLevel * .07)
      .strokePoly(crestLine.slice(1, -1));
  }
  // Foreground growth on the bank itself: large, near-black and sparse, so the nearest plane in the
  // world has a scale of its own instead of being an empty gradient.
  const firstTuft = Math.max(0, Math.floor(view.from / 148));
  for (let tuft = firstTuft; tuft * 148 <= view.to + 148; tuft++) {
    const roll = hash01(civ.seed * 19 + tuft * 83);
    if (roll > .5) continue;
    const x = tuft * 148 + hash01(tuft * 41) * 110;
    if (x < view.from - 40 || x > view.to + 40) continue;
    const size = 12 + roll * 26;
    const rootY = bankTop + 4 + hash01(tuft * 13) * 8;
    for (let blade = 0; blade < 3; blade++) {
      const bladeX = x + (blade - 1) * size * .42;
      const bladeHeight = size * (blade === 1 ? 1 : .6 + hash01(tuft * 7 + blade) * .3);
      surface.fillStyle(shade(bankColor, .6), 1).fillTriangle(bladeX - size * .16, rootY, bladeX + (hash01(tuft + blade) - .5) * size * .4, rootY - bladeHeight, bladeX + size * .16, rootY);
    }
    surface.lineStyle(1, mixColor(colors.lightSpill, bankColor, .55), .1 + lightLevel * .1).line(x - size * .3, rootY - size * .55, x + size * .3, rootY - size * .75);
  }

  // The capital silhouette and the institution landmarks are permanent structures, so they belong here
  // beside the buildings rather than being repainted 30x/s.
  drawIdentityLandmarks(surface, civ, settlements, ground, presentation.accent, view);

  // Saved marks and scars are persistent world geometry, so they belong on this cached layer rather
  // than being repainted every frame. Each is culled by the same band as everything else here.
  drawWorldMemoryScenery(surface, civ, worldWidth, ground, settlements, presentation.accent, view);
}

/**
 * Difference between the live palette and the one baked into the cached layers, painted as a wash so
 * the two never drift more than a band apart. Read live -- so continuously changing state keeps
 * showing while the cached structural layers stay untouched -- with the geometry coming from `scene`. The strength is the distance the live values have
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

  // A graded correction rather than three flat washes: the sky half and the ground half of the frame
  // catch up separately, and the seam between them is a gradient so the catch-up is never a visible
  // horizontal edge. Painted first in the frame, so nothing above it is flattened by it.
  const horizonY = height * HORIZON_RATIO;
  surface.fillLinearGradientRect(view.from, 0, span, horizonY, [
    { offset: 0, color: live.colors.skyTop, alpha: drift * .16 },
    { offset: .8, color: live.colors.skyBottom, alpha: drift * .14 },
    { offset: 1, color: live.colors.skyHorizon, alpha: drift * .1 },
  ], view.from, 0, view.from, horizonY);
  surface.fillLinearGradientRect(view.from, horizonY, span, height - horizonY, [
    { offset: 0, color: live.colors.nearTerrain, alpha: drift * .12 },
    { offset: 1, color: live.colors.groundNear, alpha: drift * .22 },
  ], view.from, horizonY, view.from, height);
}

/**
 * The air itself: three strata of drifting mote, and above the entropy the embers rising off the
 * settlements. Both counts come from the live sample and are shed by adaptive quality; reduced
 * motion keeps every particle and freezes its drift, because the state is in how many there are and
 * not in whether they move.
 */
function drawParticles(surface: DrawSurface, scene: WorldScene, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, height: number, view: WorldBand, time: number, reducedMotion: boolean): void {
  const civ = scene.civ;
  const worldWidth = snapshot.worldWidth;
  const loopTime = reducedMotion ? 0 : time;
  const particleCount = snapshot.particleCount;
  for (let i = 0; i < particleCount; i++) {
    // Three strata: motes close to the eye are larger, brighter and drift faster than the dust far
    // back in the scene, which is what makes the same count read as atmosphere rather than as noise.
    const stratum = i % 3;
    const depth = .45 + stratum * .275;
    const baseX = hash01(civ.seed + i * 17) * worldWidth;
    // Two frequencies per axis rather than one. A single sine is a pendulum: every mote in a stratum
    // retraces the same arc, and at 150 of them the air reads as a mechanism. Beating a slow drift
    // against a faster one gives each mote a wandering path -- which is what suspended dust does --
    // and it stays a pure function of the clock, so the layer is still reproducible frame for frame.
    const wanderX = Math.sin(loopTime * .00022 * depth + i * 11) * 22 * depth + Math.sin(loopTime * .00007 + i * 3.7) * 15 * depth;
    const driftX = (baseX + (reducedMotion ? 0 : wanderX)) % worldWidth;
    const posX = driftX < 0 ? driftX + worldWidth : driftX;
    if (posX < view.from || posX > view.to) continue;

    const baseY = hash01(civ.seed + i * 31) * height * (.32 + stratum * .13);
    // The vertical wander carries a slow thermal rise with it, so the strata lift and settle rather
    // than only swinging: the same bounded excursion, but the air has an up.
    const wanderY = Math.cos(loopTime * .00026 + i * 7) * 6 * depth + Math.sin(loopTime * .00009 + i * 5.3) * 7 * depth;
    const driftY = baseY + (reducedMotion ? 0 : wanderY);
    // A slow, per-particle twinkle: the phase comes from the index, so no two are ever in step.
    const twinkle = reducedMotion ? 1 : .72 + Math.sin(loopTime * .0013 + i * 13) * .28;
    const alpha = (.1 + hash01(i * 41) * (.24 + presentation.awareness * .2)) * depth * twinkle;
    const radius = (.45 + hash01(i * 7) * 1.3) * depth;

    surface.fillStyle(i % 9 === 0 ? presentation.accent : 0xc9e1ff, alpha).fillCircle(posX, driftY, radius);
  }
  // Entropy's own airborne signal: embers rising off the civilization itself. Bounded to twelve, and
  // anchored to the settlements rather than scattered across the world -- spread over four viewports
  // a twelve-ember budget put two or three anywhere the player was looking, and reality failing read
  // as nothing but a red sky.
  const embers = Math.min(12, Math.round(presentation.entropy * 14));
  const anchors = scene.settlements;
  for (let i = 0; i < embers; i++) {
    const anchor = anchors.length ? anchors[i % anchors.length]! : null;
    const spread = anchor ? anchor.radius * 1.5 : worldWidth * .5;
    const x = (anchor ? anchor.centerX : worldWidth * .5) + (hash01(civ.seed * 3 + i * 53) - .5) * spread * 2;
    if (x < view.from || x > view.to) continue;
    const rise = reducedMotion ? hash01(i * 19) : ((loopTime * .00004 + hash01(i * 19)) % 1);
    const y = height * (GROUND_RATIO - rise * .5);
    const drift = Math.sin(rise * 6 + i) * 6;
    surface.fillStyle(presentation.colors.ember, (.62 - rise * .5) * presentation.entropy).fillCircle(x + drift, y, 1.3 + (1 - rise) * 1.4);
    // A short trail behind the ember, so a rising point of light reads as heat leaving the ground.
    surface.lineStyle(1, presentation.colors.ember, (.22 - rise * .18) * presentation.entropy).line(x + drift, y, x + drift * .6, y + 9 + rise * 12);
  }
}

export function drawHazeBands(surface: DrawSurface, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, width: number, height: number, animationTime: number, view: WorldBand, reducedMotion: boolean): void {
  const worldWidth = snapshot.worldWidth;
  const hazeBands = snapshot.hazeBands;
  const bandSpacing = worldWidth / Math.max(1, hazeBands);
  // The coverage fix: a band is wide relative to the gap it has to close, never a fixed 450 px. A
  // stage-4 world is four viewports across and may carry as few as two bands, where fixed-width
  // bands left most of the world with no atmosphere at all; at 135% of the spacing consecutive bands
  // always overlap, whatever the world's width and however many the quality tier allows.
  const bandWidth = Math.min(worldWidth, Math.max(360, bandSpacing * 1.35));
  // Rectangles rather than a gradient per band: a CanvasGradient allocated per band per frame was
  // measured as the single most expensive thing on this layer. Instead each band is four vertical
  // strata, each tapering horizontally at both ends -- soft in both axes at a fraction of the cost,
  // and without the hard edge a single translucent rectangle drew across the whole sky.
  // Four strata weighted toward the band's lower half: the more steps the alpha climbs in, the less
  // the outermost one differs from the sky behind it, which is what stops a translucent rectangle
  // from banding visibly across a smooth gradient.
  const strata: ReadonlyArray<readonly [number, number, number]> = [[0, .22, .28], [.22, .5, .72], [.5, .78, 1], [.78, 1, .46]];
  const taperSteps = 2;
  // One shared drift plus a bounded per-band wobble. Per-band *speeds* were the second half of the
  // coverage bug: over a couple of minutes the faster bands caught up with the slower ones, the
  // whole set bunched together, and half the world lost its atmosphere again. The wobble is capped
  // well inside the overlap the band width guarantees, so the layers still move against each other
  // and the coverage cannot open up however long the run lasts.
  const drift = reducedMotion ? 0 : animationTime * .014;

  for (let i = 0; i < hazeBands; i++) {
    const wobble = reducedMotion ? 0 : Math.sin(animationTime * .00007 + i * 1.3) * bandSpacing * .12;
    const rawX = ((i * bandSpacing + drift + wobble) % worldWidth + worldWidth) % worldWidth;
    // Haze lies low, over the ridges and the skyline rather than across the clean upper sky: that is
    // both where it belongs and where the terrain and the buildings break up its edges.
    const y = height * (.29 + (i % 5) * .07) + (reducedMotion ? 0 : Math.sin(animationTime * .00045 + i * 1.7) * 7);
    const h = 36 + (i % 4) * 13;
    const opacity = .015 + presentation.sanityDistortion * .014 + (i % 2) * .004;

    for (const offset of [0, -worldWidth, worldWidth]) {
      const bx = rawX + offset;
      if (bx > view.to || bx + bandWidth < view.from) continue;
      const taperWidth = bandWidth * .24 / taperSteps;
      for (const [from, to, weight] of strata) {
        const sy = y + h * from;
        const sh = Math.max(1.5, h * (to - from));
        const coreFrom = Math.max(view.from, bx + bandWidth * .24);
        const coreTo = Math.min(view.to, bx + bandWidth * .76);
        if (coreTo > coreFrom) surface.fillStyle(presentation.colors.haze, opacity * weight).fillRect(coreFrom, sy, coreTo - coreFrom, sh);
        for (let step = 0; step < taperSteps; step++) {
          const alpha = opacity * weight * (.66 - step * .3);
          const leftFrom = Math.max(view.from, bx + taperWidth * step);
          const leftTo = Math.min(view.to, bx + taperWidth * (step + 1));
          if (leftTo > leftFrom) surface.fillStyle(presentation.colors.haze, alpha).fillRect(leftFrom, sy, leftTo - leftFrom, sh);
          const rightFrom = Math.max(view.from, bx + bandWidth - taperWidth * (step + 1));
          const rightTo = Math.min(view.to, bx + bandWidth - taperWidth * step);
          if (rightTo > rightFrom) surface.fillStyle(presentation.colors.haze, alpha).fillRect(rightFrom, sy, rightTo - rightFrom, sh);
        }
      }
    }
  }
}

/**
 * The city's own light: windows waking and sleeping on their own phases, and the lamps along the
 * road. `windowFraction` is the adaptive-quality lever -- a slow device animates fewer windows and
 * keeps every one of them lit, because a dark city is a different world, not a cheaper one.
 */
export function drawCityLights(surface: DrawSurface, scene: WorldScene, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, ground: number, animationTime: number, view: WorldBand, windowFraction: number, glowDetail: number, reducedMotion: boolean): void {
  if (snapshot.stage === 0) return;
  const { civ, settlements } = scene;
  const lightLevel = presentation.lightLevel;
  const windowColor = presentation.colors.window;
  const spill = presentation.colors.lightSpill;
  // The budget is shared out over the settlements actually on screen, and strided inside each one,
  // rather than spent by a single counter walking the world from left to right. That counter made
  // the lighting a function of where a settlement sat in the world: the leftmost one on screen took
  // the whole budget and everything to the right of it stayed dark, which at a degraded tier -- where
  // the budget is fourteen windows -- left most of the visible city unlit. The stride is what keeps
  // the share spread across a settlement instead of crowding into its first few plots.
  const onScreen = settlements.filter(settlement =>
    settlement.centerX - settlement.radius <= view.to && settlement.centerX + settlement.radius >= view.from);
  // Two invariants that have to hold together: no visible settlement goes dark, and the whole layer
  // stays inside its budget. A per-settlement floor above 1 cannot deliver both -- nine settlements
  // at two windows each is eighteen against a budget whose own floor was six -- so the floor moves
  // to the budget instead. Sized never below the number of settlements it has to cover, `share` is
  // at least 1 and `share * onScreen.length <= budget` is an identity rather than an approximation.
  const budget = Math.max(onScreen.length, Math.round(46 * Math.max(.2, windowFraction)));
  const share = Math.max(1, Math.floor(budget / Math.max(1, onScreen.length)));

  for (const settlement of onScreen) {
    const inView = settlement.structures.filter(structure =>
      structure.x + structure.width >= view.from && structure.x - structure.width <= view.to);
    if (!inView.length) continue;
    const stride = Math.max(1, Math.ceil(inView.length / share));
    let lit = 0;
    for (let index = 0; index < inView.length; index += stride) {
      const structure = inView[index]!;
      if (lit >= share) break;
      const effGround = structureEffectiveGround(ground, structure.depthLane);
      const phase = (structure.lightPhase ?? hash01(civ.seed + structure.x)) + settlement.lightPhase;
      // A slow sine on a per-structure phase, interpolated rather than switched: no two buildings
      // are in step and none of them blinks. About a fourteen-second cycle.
      const cycle = reducedMotion ? .62 : .5 + .5 * Math.sin(animationTime * .00045 + phase * Math.PI * 2);
      const activity = .25 + cycle * .75;
      // How much of this building is awake, from its own activity and the world's light level.
      const windows = Math.max(1, Math.min(3, Math.round((.6 + lightLevel * 2.1) * activity)));
      const rows = Math.max(2, Math.min(8, Math.trunc(structure.height / 18)));
      for (let w = 0; w < windows; w++) {
        const slot = Math.trunc(hash01(civ.seed + structure.x * 3 + w * 61) * rows);
        const column = hash01(civ.seed + structure.x * 7 + w * 29);
        const intensity = Math.min(.92, (.3 + activity * .5) * (.55 + lightLevel * .7));
        surface.fillStyle(windowColor, intensity).fillRect(
          structure.x - structure.width * .34 + column * structure.width * .56,
          effGround - structure.height + 6 + slot * (structure.height * .78 / rows),
          Math.max(1.6, 2.2 + snapshot.stage * .3), Math.max(2, 3 + snapshot.stage * .2));
      }
      // The brightest buildings put light back into the air around them. Two circles rather than a
      // gradient: this runs per frame, and a CanvasGradient per building is not worth the softness.
      if (glowDetail > 0 && activity > .78 && structure.height > 60) {
        const glowRadius = Math.min(34, structure.width * .8) * glowDetail;
        surface.fillStyle(spill, .035 * lightLevel * glowDetail).fillCircle(structure.x, effGround - structure.height * .62, glowRadius);
        surface.fillStyle(spill, .03 * lightLevel * glowDetail).fillCircle(structure.x, effGround - structure.height * .62, glowRadius * .55);
      }
      lit++;
    }
  }

  // Micro-lights: everything a city emits that is too small to resolve into a window. Distributed
  // with a quadratic bias toward the ground, so the light is dense where the streets are and thins
  // out toward the crowns, and each one flickers on its own phase and speed -- a light whose phase
  // has it switched off this cycle is simply skipped, which is what keeps the field from reading as
  // a static texture. The budget is shared over the settlements on screen and strided inside each,
  // for the same reason the window budget is.
  const microBudget = Math.round(MAX_SETTLEMENT_LIGHTS * Math.max(.2, windowFraction));
  const microShare = Math.max(1, Math.floor(microBudget / Math.max(1, onScreen.length)));
  for (const settlement of onScreen) {
    const crown = settlementCrown(settlement, ground);
    if (crown <= 0) continue;
    const lightSeed = civ.seed * 17 + settlement.centerX;
    for (let i = 0; i < microShare; i++) {
      const x = settlement.centerX + (hash01(lightSeed + i * 17) - .5) * settlement.radius * 1.84;
      if (x < view.from || x > view.to) continue;
      // Quadratic, not uniform: a city has far more lit windows at street level than at its crown,
      // and a uniform column of lights up a settlement's full height reads as a lit grid instead.
      const rise = Math.pow(hash01(lightSeed + i * 29), 2);
      const y = ground - 2 - rise * crown * .82;
      const flicker = reducedMotion ? 1 : Math.sin(animationTime * .001 * (1.5 + hash01(lightSeed + i * 7) * 3.5) + hash01(lightSeed + i * 13) * Math.PI * 2);
      if (flicker < -.2) continue;
      const alpha = (.12 + .48 * Math.max(0, flicker)) * lightLevel;
      const hue = hash01(lightSeed + i * 53);
      surface.fillStyle(hue < .62 ? spill : hue < .86 ? presentation.accent : windowColor, alpha).fillRect(x, y, 1.4, 1.4);
    }
  }

  // Street lamps on the road lattice: the light that ties the settlements to the ground plane.
  if (snapshot.stage >= 1) {
    const firstLamp = Math.max(0, Math.floor(view.from / 118));
    for (let lamp = firstLamp; lamp * 118 <= view.to; lamp++) {
      const x = lamp * 118 + 22;
      if (x < view.from || x > view.to) continue;
      // Only where the civilization actually is: a lamp needs a settlement within reach.
      let near = false;
      for (const settlement of settlements) if (Math.abs(settlement.centerX - x) < settlement.radius + 90) { near = true; break; }
      if (!near) continue;
      const flicker = reducedMotion ? 1 : .88 + Math.sin(animationTime * .0009 + lamp * 2.3) * .12;
      surface.fillStyle(spill, .5 * flicker).fillCircle(x, ground + 1, 1.5);
      surface.fillStyle(spill, .08 * lightLevel * flicker * (glowDetail > 0 ? 1 : .5)).fillCircle(x, ground + 1, 6 + lightLevel * 4);
      surface.lineStyle(1, shade(spill, .55), .45).line(x, ground + 2, x, ground - 9);
    }
  }
}

/**
 * The kinetic half of the route network: what is moving along it, and which way. A dash pattern
 * offset over time is the canvas idiom for this, and it is the wrong one here -- `DrawSurface` has
 * no dash state by design, and a dashed stroke would put the whole route's worth of pattern into
 * every frame however little of it is on screen. A bounded run of marks placed *on* the curve costs
 * a fixed handful of primitives instead, and carries something a dash pattern cannot: each mark has
 * a bright leading end, so the direction of the flow is legible from a single frame.
 *
 * The budget is shared over the routes on screen rather than spent along the first one, for the same
 * reason the window budget is: otherwise the leftmost route takes it all and the rest of the network
 * looks abandoned.
 */
function drawRouteFlow(surface: DrawSurface, scene: WorldScene, presentation: ReturnType<typeof worldPresentation>, ground: number, animationTime: number, view: WorldBand, reducedMotion: boolean, glowDetail: number): void {
  const visible = scene.routes.filter(route => routeInBand(route, view.from, view.to));
  if (!visible.length) return;
  const share = Math.max(1, Math.floor(MAX_ROUTE_FLOW_MARKS / visible.length));
  const color = mixColor(presentation.colors.lightSpill, presentation.accent, .4);
  for (const route of visible) {
    // A busier route moves its goods faster as well as more of them, and the whole run of marks on
    // one route stays evenly spaced whatever that speed is.
    const speed = .000028 * (.6 + route.flow);
    const length = .05 + route.flow * .03;
    for (let mark = 0; mark < share; mark++) {
      const phase = mark / share + hash01(route.seed + mark * 31);
      const head = reducedMotion ? phase % 1 : ((phase + animationTime * speed) % 1 + 1) % 1;
      const t = route.direction === 1 ? head : 1 - head;
      const from = routePointAt(route, t - route.direction * length);
      const to = routePointAt(route, t);
      if (Math.max(from.x, to.x) < view.from || Math.min(from.x, to.x) > view.to) continue;
      const alpha = .16 + route.flow * .26;
      surface.lineStyle(1.6, color, alpha).line(from.x, ground + 7 + from.offset, to.x, ground + 7 + to.offset);
      // The leading end, brighter than the trail: the direction of the flow in one frame.
      if (glowDetail > 0) surface.fillStyle(color, Math.min(.9, alpha + .3)).fillCircle(to.x, ground + 7 + to.offset, 1.4);
    }
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
    // On the route's own bed, not on a straight line through it: as soon as the road bends, traffic
    // interpolated between two centres drives visibly beside its own road.
    const route = vehicle.routeIndex >= 0 ? scene.routes[vehicle.routeIndex] : undefined;
    const y = ground + 10 + vehicle.lane * 7 + (route ? routeOffsetAt(route, x) : 0);
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
    if (x < view.from - 24 || x > view.to) continue;
    // A hull with a lit face and the track behind it. An empty 6x4 outline read as a stray pixel in
    // the sky rather than as something in orbit -- the one mark in the frame that looked like damage.
    const y = height * orbital.altitude;
    surface.fillStyle(shade(presentation.accent, .4), .66).fillRect(x - 4, y - 1.5, 8, 3);
    surface.fillStyle(tint(presentation.accent, .45), .85).fillRect(x + 2, y - 1.5, 2, 3);
    surface.lineStyle(1, presentation.accent, .16).line(x - 22, y, x - 5, y);
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

/**
 * The three state cues that adaptive quality may never shed: fractures for Stability, beacons for
 * Awareness and the distortion rings for Sanity. All three are placed with `spreadPosition` or on a
 * fixed lattice rather than by a hash, so the state can be read wherever the world is being looked
 * at, and so a cue does not move when the stat behind it opens another one.
 */
function drawAnomalies(surface: DrawSurface, scene: WorldScene, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, ground: number, height: number, animationTime: number, view: WorldBand, reducedMotion: boolean, glowDetail: number): void {
  const { civ } = scene;
  const worldWidth = snapshot.worldWidth;
  // Spread across the world rather than hashed over it: scattered freely across four viewports the
  // same budget clustered, and Stability could be read or not depending only on where the player had
  // scrolled to. `spreadPosition` is what makes that spread affordable -- the count follows
  // Stability and Entropy and changes while the player watches, and a lattice sized by the count
  // would move every existing fracture each time one more appeared.
  for (let i = 0; i < snapshot.fractureCount; i++) {
    const x = spreadPosition(worldWidth, i, hash01(civ.seed * 61));
    if (x < view.from - 60 || x > view.to + 60) continue;
    // A fracture belongs to the world, not to the ground line: it opens in the earth and continues
    // up through the air the settlement stands in, so low Stability is legible in the skyline too.
    const drop = 24 + hash01(i * 17) * 34;
    const lean = (hash01(i * 11) - .5) * 46;
    const strength = .24 + presentation.danger * .42;
    // The mouth: a thin wedge of opened ground rather than a line drawn on top of it, plus the light
    // coming out of it. Three points and one circle, so twelve fractures stay twelve cheap cues.
    surface.fillStyle(0xee6973, strength * .3).fillTriangle(x - 3 - drop * .06, ground + 2, x + lean, ground + drop, x + 3 + drop * .06, ground + 2);
    surface.fillStyle(0xee6973, strength * .16).fillCircle(x, ground + 3, 4 + drop * .09);
    surface.lineStyle(1.4, 0xee6973, strength).line(x, ground + 2, x + lean, ground + drop);
    surface.lineStyle(1, 0xee6973, (.1 + presentation.danger * .26) * (reducedMotion ? 1 : .75 + Math.sin(animationTime * .0016 + i) * .25))
      .line(x, ground + 2, x - lean * .6, ground - 30 - hash01(i * 23) * 70);
  }
  // Beacons, spread the same way and for the same two reasons: Awareness has to be readable wherever
  // the world is being looked at, and a beacon must not jump across the world the moment Awareness
  // ticks the next one into existence.
  for (let i = 0; i < snapshot.beaconCount; i++) {
    const x = spreadPosition(worldWidth, i, hash01(civ.seed * 97 + 3));
    if (x < view.from - 30 || x > view.to + 30) continue;
    const pulse = reducedMotion ? 1 : .7 + Math.sin(animationTime * .003 + i) * .3;
    const y = ground - 55 - (i % 3) * 28;
    // A beacon now has a light source at its centre rather than being a bare ring in mid-air.
    if (glowDetail > 0) {
      surface.fillStyle(presentation.accent, .12 * presentation.awareness * pulse * glowDetail).fillCircle(x, y, 9 + pulse * 5);
    }
    surface.fillStyle(presentation.accent, .35 + presentation.awareness * .3 * pulse).fillCircle(x, y, 1.8);
    surface.lineStyle(1, presentation.accent, .16 + presentation.awareness * .25 * pulse).strokeCircle(x, y, 10 + pulse * 8);
  }
  // Sanity's distortion in the air. On a world lattice rather than at three fixed fractions of the
  // world: three rings spread over four viewports meant a player could scroll to where the state was
  // not drawn at all, and a state cue that depends on where you are looking is not a state cue.
  if (presentation.sanityDistortion > .18) {
    const spacing = 460;
    const firstRing = Math.max(0, Math.floor(view.from / spacing) - 1);
    for (let i = firstRing; i * spacing <= view.to + spacing; i++) {
      const wobble = reducedMotion ? 0 : Math.sin(animationTime * .0014 + i) * 9 * presentation.sanityDistortion;
      const x = i * spacing + hash01(civ.seed * 7 + i * 43) * spacing * .6;
      if (x + 90 < view.from || x - 90 > view.to) continue;
      const radius = 35 + hash01(i * 17) * 34;
      surface.lineStyle(1, 0xb68cff, .08 + presentation.sanityDistortion * .13).strokeCircle(x + wobble, height * (.26 + hash01(i * 29) * .1), radius);
    }
  }
}

/**
 * The animated layer, in one pass back to front. This is the composition order itself: the two broad
 * washes first and everything that has to stay crisp above them, so nothing translucent is ever
 * painted over fine detail. It repaints every throttled frame, so every step below is bounded by a
 * count rather than by the world.
 */
function drawDynamicContent(surface: DrawSurface, scene: WorldScene, snapshot: ReturnType<typeof worldSnapshot>, presentation: ReturnType<typeof worldPresentation>, width: number, height: number, time: number, tracker: ConstructionTracker, view: WorldBand, tier: RenderQualityTier): void {
  const { agentFraction, windowFraction, glowDetail } = qualityFactors(tier);
  const animationTime = currentReducedMotion ? 0 : time;
  const ground = height * GROUND_RATIO;

  // The composition, back to front. The rule the order encodes: nothing broad and translucent may be
  // painted over fine detail, so the two washes come first and everything that has to stay crisp --
  // inhabitants, landmarks, impacts -- sits above the atmosphere rather than under it.
  // 1. The live-versus-cached state wash.
  drawMoodWash(surface, scene, presentation, view, height);

  // 2. The city's own light, which belongs to the settlements beneath the atmosphere.
  drawCityLights(surface, scene, snapshot, presentation, ground, animationTime, view, windowFraction, glowDetail, currentReducedMotion);

  // Stability's own channel: visible strain on the buildings themselves. Bounded to twelve visible
  // structures so a low-Stability world costs a fixed handful of lines rather than one per building.
  if (presentation.signals.structuralStrain > .18) {
    // Strided across what is on screen, not the first twelve of it. Walking the world in order put
    // every strain line on the leftmost buildings and left the right half of the viewport looking
    // sound, so low Stability was legible or not depending on where the player had scrolled to.
    const strained = scene.structures.filter(structure => structure.x >= view.from - 20 && structure.x <= view.to + 20);
    const stride = Math.max(1, Math.ceil(strained.length / 12));
    for (let index = 0, drawn = 0; index < strained.length && drawn < 12; index += stride, drawn++) {
      const structure = strained[index]!;
      const effGround = structureEffectiveGround(ground, structure.depthLane);
      const top = effGround - structure.height;
      surface.lineStyle(1, 0xee6973, .08 + presentation.signals.structuralStrain * .18)
        .line(structure.x - structure.width * .18, top + structure.height * .25, structure.x + structure.width * .12, top + structure.height * .42);
    }
  }

  // 2b. What the network is carrying, and the one animated cue each identity frame owns. Both belong
  // to the settlements and the ground between them, so they sit under the atmosphere with the city
  // lights rather than over it.
  drawRouteFlow(surface, scene, presentation, ground, animationTime, view, currentReducedMotion, glowDetail);
  const identity = pathIdentity(scene.civ);
  if (identity.frame !== 'none' && identity.tier >= 2) {
    // Three of them, strided over what is on screen: the frame's geometry is already legible on the
    // cached layer, so its motion is a fixed-cost cosmetic rather than one cue per settlement.
    const framed = scene.settlements.filter(settlement =>
      settlement.centerX + FRAME_MAX_REACH >= view.from && settlement.centerX - FRAME_MAX_REACH <= view.to);
    const stride = Math.max(1, Math.ceil(framed.length / 3));
    for (let index = 0, drawn = 0; index < framed.length && drawn < 3; index += stride, drawn++) {
      const settlement = framed[index]!;
      drawSettlementFrameAccent(surface, identity.frame, {
        centerX: settlement.centerX, radius: settlement.radius,
        crown: settlementCrown(settlement, ground), seed: settlement.lightPhase * Math.PI * 2,
      }, ground, presentation.accent, presentation.colors.lightSpill, animationTime, currentReducedMotion);
    }
  }

  // 3. Haze, drifting between the city and the eye.
  drawHazeBands(surface, snapshot, presentation, width, height, animationTime, view, currentReducedMotion);

  // 4. Environmental particles and embers, in front of the haze.
  drawParticles(surface, scene, snapshot, presentation, height, view, animationTime, currentReducedMotion);

  // 5. Inhabitants and traffic.
  drawInhabitants(surface, scene, snapshot, presentation, ground, animationTime, view, agentFraction, currentReducedMotion);
  drawTraffic(surface, scene, snapshot, presentation, ground, height, animationTime, view, agentFraction, currentReducedMotion);

  // 6. Banners and construction: what the civilization is doing right now.
  drawBannersAndConstruction(surface, scene, snapshot, presentation, ground, height, time, tracker, animationTime, view, currentReducedMotion);

  // 7. Landmarks and the ambient marks of the dominant path.
  drawPathAmbience(surface, scene.civ, snapshot.worldWidth, height, ground, animationTime, presentation.accent, view, identity.tier, qualityFactors(tier).ambientLoopFraction);

  // 8. Fractures, beacons and sanity distortion: the state cues that must never be shed.
  drawAnomalies(surface, scene, snapshot, presentation, ground, height, animationTime, view, currentReducedMotion, glowDetail);

  // 9. World memory. Only the halo over a scar animates; the geometry stays on the cached layer.
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
    drawSkyContent(surface, scene, this.width, this.height, visibleBand(worldWidth, this.width, scroll, SKY_PARALLAX));
    context.setTransform(this.dpr, 0, 0, this.dpr, -scroll * TERRAIN_PARALLAX * this.dpr, 0);
    drawTerrainContent(surface, scene, this.width, this.height, visibleBand(worldWidth, this.width, scroll, TERRAIN_PARALLAX));
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
    // The cue is drawn in screen space, so the settlements it acknowledges are handed over already
    // resolved there: a phase change lights the city that is actually on screen rather than three
    // bars at fixed fractions of the frame.
    const ground = this.height * GROUND_RATIO;
    const anchors: Array<{ x: number; crown: number }> = [];
    for (const settlement of scene.settlements) {
      const x = settlement.centerX - scroll;
      if (x < -80 || x > this.width + 80) continue;
      anchors.push({ x, crown: settlementCrown(settlement, ground) });
      if (anchors.length >= 3) break;
    }
    drawPhaseTransitionImpact(surface, phase.from, phase.to, phase.start, time, this.width, this.height, dynamicPresentation.accent, currentReducedMotion, anchors);
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
    // Measured, not assumed: a device only earns the smoother interval once its own average draw
    // cost has proven it can afford one, and a degraded tier or reduced motion takes it straight back.
    if (time - this.lastFrame < dynamicFrameIntervalMs(this.quality.tier, this.quality.averageCostMs, currentReducedMotion)) return;
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
