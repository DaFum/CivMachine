import type { DrawSurface } from './draw-surface.js';
import { bayerThreshold, mixColor, ridgeNoise, shade } from './primitives.js';
import type { worldPresentation } from './world-presentation.js';

type Presentation = ReturnType<typeof worldPresentation>;
interface Band { from: number; to: number }

/**
 * The ground substrate: the sampler every terrain profile in this renderer is built from, and the
 * shelves of land that recede from the settlement plane toward the ridges. Split out of `world.ts`
 * because it is a self-contained pass over one band of the frame, and because it is where the two
 * things the terrain was missing now live -- a stated light direction, and a boundary that is not a
 * clean vector edge.
 */

/**
 * Where the light comes from, once, for the whole terrain. The renderer had no answer to this: every
 * solid picked its own `shade`/`tint` and the ground had a rim light on top and mist below, which is
 * lighting by convention rather than by direction. North-west, so a crest is lit on its upper left
 * and casts to its lower right -- the same direction the 2.5D structures already imply by lighting
 * their tops and left faces. Stated as a unit-ish offset and scaled per elevation by the caller, so
 * a taller formation casts further without every site inventing its own numbers.
 */
export const LIGHT_FROM_X = -1;
export const LIGHT_FROM_Y = -1;

/** How many shelves recede toward the ridges. Bounded, like everything else on this layer. */
export const SHELF_COUNT = 3;
/** The lattice a shelf's silhouette is sampled on, in world px. */
export const SHELF_STEP = 68;
/**
 * The lattice the contour lines are sampled on. Deliberately coarser than the silhouette: a contour
 * describes the *form* of the land rather than its edge, and the crest is the one line that has to
 * carry the fine detail. The static layer is repainted on every scrolled pixel, so a contour at the
 * silhouette's own resolution would nearly double what a shelf costs for a line drawn at a tenth of
 * its alpha.
 */
export const CONTOUR_STEP = SHELF_STEP * 2;
/**
 * How many dither cells the crest dissolve may emit, over all shelves and the whole visible band.
 *
 * This is the honest ceiling on the effect rather than the effect a pattern fill would give. An
 * ordered dither is O(area): a 4 px raster over a stage-4 world's visible band is several thousand
 * rectangles, and this layer has a few hundred primitives of headroom in total. So the dissolve is
 * an ordered *stipple* along the one edge closest to the eye -- coarse cells, a fixed count, strided
 * across the band so it thins everywhere instead of covering the left third and stopping.
 */
export const MAX_DITHER_CELLS = 64;
/** The cell the stipple is quantized to, in world px. Coarse, for the reason above. */
export const DITHER_CELL = 8;

/** One ridge profile, sampled on a fixed world lattice so a scroll never shifts the mountains. */
export function ridgePoints(view: Band, worldWidth: number, baseY: number, step: number, amplitude: number, wavelength: number, seed: number, detail: number): Array<readonly [number, number]> {
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

/** The height of a shelf's land above its own base at a world x, from the same sampler. */
function shelfHeightAt(x: number, amplitude: number, wavelength: number, seed: number): number {
  return amplitude * (.35 + ridgeNoise(x / wavelength, seed, .38) * .65);
}

/**
 * The land between the settlement plane and the ridges: `SHELF_COUNT` low crests, each standing in
 * the air of its own distance, each lit from one direction and each ending on a boundary that breaks
 * up rather than on a clean vector edge.
 *
 * Three things beyond the silhouette, and each is one line of reasoning:
 *
 * - **A contour line inside the form.** A shelf used to be a filled polygon with a lit rim, which
 *   reads as a cut-out however good the profile is. One contour following the same profile at a
 *   fraction of its height is what makes it read as a *surface* with relief -- the topographic map's
 *   trick, and it costs a polyline on a coarse lattice.
 * - **A cast shadow with a direction.** The mist band under a crest was ambient: it pooled evenly
 *   under everything. Offsetting the dark band toward `LIGHT_FROM` and the rim light away from it is
 *   what states that the light comes from somewhere, and the offset scales with the shelf's own
 *   elevation so the nearest, tallest step casts furthest.
 * - **A boundary that is not a vector edge.** See `MAX_DITHER_CELLS`.
 */
export function drawGroundShelves(surface: DrawSurface, presentation: Presentation, seed: number, worldWidth: number, horizon: number, plane: number, view: Band, nominalSpan: number): void {
  const span = view.to - view.from;
  if (span <= 0) return;
  const colors = presentation.colors;
  // The band that actually shows. This used to be measured to the bottom of the frame, and the
  // bottom of the frame is not where this layer ends: the scenery layer paints the settlement plane
  // over it opaquely from `plane` down, so two of the three shelves stood entirely underneath an
  // opaque fill -- their crests, their mist and their fills were emitted on every scrolled pixel and
  // nobody ever saw them. The ground between the ridge feet and the city is a ninth of the viewport,
  // and that is the space the shelves have to compose in.
  const top = horizon + 12;
  const shelfSpan = plane - top;
  if (shelfSpan <= 6) return;

  // The stipple is spent on the nearest shelf only -- the one closest to the eye, with the most
  // contrast against the plane behind it -- and its share is decided before the loop, so the count
  // cannot grow with the number of shelves or with the width of the world.
  const stippleShelf = SHELF_COUNT - 1;

  for (let shelf = 0; shelf < SHELF_COUNT; shelf++) {
    // Bases spread across the visible band and relief scaled to it, so the composition is the same
    // on a phone as on a desktop instead of the nearer steps falling out of the frame.
    const shelfBase = top + shelfSpan * (.3 + shelf * .3);
    const shelfHeight = Math.max(4, shelfSpan * (.42 + shelf * .16));
    const wavelength = 520 - shelf * 150;
    const shelfSeed = seed * 23 + shelf * 71;
    const shelfPoints = ridgePoints(view, worldWidth, shelfBase, SHELF_STEP, shelfHeight, wavelength, shelfSeed, .38);
    if (shelfPoints.length <= 2) continue;
    // Elevation level: the near shelf stands highest above the plane behind it, so it casts furthest.
    const level = 1 + shelf;

    // The mist the shelf stands in, laid down first so the crest rises out of it -- offset *away*
    // from the light, so the pooled shadow sits on the shaded side of the crest rather than
    // symmetrically under it.
    const shadowShift = -LIGHT_FROM_X * level * 1.5;
    const mistRise = shelfHeight * .6;
    // Clamped to the plane, like the cast band below: nothing this pass paints may reach under the
    // settlement ground, or it is emitted on every scrolled pixel for nobody.
    const mistBottom = Math.min(shelfBase + 2, plane);
    surface.fillLinearGradientRect(view.from + shadowShift, shelfBase - shelfHeight - mistRise, span, mistBottom - (shelfBase - shelfHeight - mistRise), [
      { offset: 0, color: colors.haze, alpha: 0 },
      { offset: 1, color: colors.haze, alpha: (.09 - shelf * .022) + presentation.sanityDistortion * .04 },
    ], view.from, shelfBase - shelfHeight - mistRise, view.from, mistBottom);
    // And the shadow the step itself casts onto the ground behind it: the same band again, darker
    // and offset further, which is what separates "there is mist here" from "something stands here".
    const castDepth = Math.min(shelfHeight * .5 + level * 1.5, Math.max(2, plane - shelfBase));
    surface.fillLinearGradientRect(view.from + shadowShift * 2, shelfBase - shelfHeight * .5, span, shelfHeight * .5 + castDepth, [
      { offset: 0, color: shade(colors.groundNear, .5), alpha: 0 },
      { offset: 1, color: shade(colors.groundNear, .5), alpha: .1 + level * .03 },
    ], view.from, shelfBase - shelfHeight * .5, view.from, shelfBase + castDepth);

    const crestColor = mixColor(colors.nearTerrain, colors.skyHorizon, .2 - shelf * .06);
    const footColor = shade(mixColor(colors.nearTerrain, colors.groundNear, .45 + shelf * .25), shelf * .12);
    surface.fillLinearGradientPoly(shelfPoints, [
      { offset: 0, color: crestColor, alpha: .95 },
      { offset: 1, color: footColor, alpha: .95 },
    ], view.from, shelfBase - shelfHeight, view.from, shelfBase + 6);

    // The contour inside the form, on its own coarse lattice.
    const contour: Array<readonly [number, number]> = [];
    const firstContour = Math.max(0, Math.floor(view.from / CONTOUR_STEP) - 1);
    for (let cell = firstContour; cell * CONTOUR_STEP <= view.to + CONTOUR_STEP; cell++) {
      const x = cell * CONTOUR_STEP;
      if (x > worldWidth) break;
      // At .46 of the local relief: high enough to follow the crest's shape, low enough that it
      // never reads as a second, fainter crest.
      contour.push([x, shelfBase - shelfHeightAt(x, shelfHeight, wavelength, shelfSeed) * .46]);
    }
    if (contour.length > 1) {
      surface.lineStyle(1, mixColor(footColor, colors.skyHorizon, .3), .07 + (SHELF_COUNT - shelf) * .015).strokePoly(contour);
    }

    // The crest catching the light, displaced *toward* it: the lit edge of the step. This is the
    // whole of what turns a graded band into receding ground, and the offset is what says the light
    // has a direction rather than being ambient.
    surface.lineStyle(1, mixColor(colors.skyHorizon, colors.groundNear, .35 + shelf * .2), .2 - shelf * .045)
      .strokePoly(shelfPoints.slice(1, -1).map(([x, y]) => [x + LIGHT_FROM_X * .5, y + LIGHT_FROM_Y * .5] as const));

    if (shelf !== stippleShelf) continue;
    // The crest dissolve: cells above the crest, kept or dropped by the ordered threshold against a
    // coverage that falls off with height, so the edge breaks up into a raster that thins upward
    // instead of ending on a line.
    //
    // Both halves of the selection are anchored in **world** coordinates, and the difference
    // matters more than it looks. Quantizing a cell's x to the lattice is not enough: walking the
    // stride from `view.from` picks the columns *relative to the viewport*, so a scroll of one cell
    // moves every chosen column by one cell -- and this layer repaints on every scrolled pixel, so
    // the stipple would crawl along a ridge that is itself world-anchored. The comb below runs on
    // absolute lattice indices instead, and its period comes from `nominalSpan` -- the band's width
    // before it is clipped at the world's ends -- so the period is a function of the viewport, which
    // changes only on a resize, and never of where the player has scrolled to.
    const rows = Math.max(1, Math.min(3, Math.floor(shelfHeight / DITHER_CELL)));
    const nominalColumns = Math.max(1, Math.floor(Math.max(span, nominalSpan) / DITHER_CELL));
    const stride = Math.max(1, Math.ceil((nominalColumns * rows) / MAX_DITHER_CELLS));
    const firstCell = Math.max(0, Math.floor(view.from / DITHER_CELL));
    const lastCell = Math.min(Math.floor(worldWidth / DITHER_CELL), Math.ceil(view.to / DITHER_CELL));
    let drawn = 0;
    for (let cell = firstCell; cell <= lastCell && drawn < MAX_DITHER_CELLS; cell++) {
      const x = cell * DITHER_CELL;
      for (let row = 0; row < rows && drawn < MAX_DITHER_CELLS; row++) {
        // One diagonal comb through the lattice: a cell belongs to it or it does not, whatever band
        // it is asked for. The row skew keeps the three rows from all choosing the same columns.
        if ((cell + row) % stride !== 0) continue;
        const crestY = shelfBase - shelfHeightAt(x, shelfHeight, wavelength, shelfSeed);
        const y = crestY - (row + 1) * DITHER_CELL;
        // Coverage: near solid against the crest, thinning to a third at the top of the band, so no
        // row of the comb is spent on cells the threshold can never keep.
        const coverage = 1 - row / rows;
        if (bayerThreshold(cell, Math.floor(y / DITHER_CELL)) > coverage) continue;
        surface.fillStyle(crestColor, .5).fillRect(x, y, DITHER_CELL, DITHER_CELL);
        drawn++;
      }
    }
  }
}
