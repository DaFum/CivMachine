# Terrain Substrate and Atmospheric Lens Design

**Status:** Approved for implementation on 2026-09-03
**Release target:** Reality Consumption Engine Browser v1.27.0
**Scope:** `public/game/src/render/**` plus the world shell's CSS — no engine, rules, or save changes
**Save policy:** No `GameState` shape change, no `SAVE_VERSION` bump
**Product language:** English (player-facing world copy) — this work adds no copy at all

## Problem

Three things about the ground and the frame as a whole.

1. **Two thirds of the ground substrate was invisible.** The shelves that recede from the settlement
   plane toward the ridges were placed across `height - horizon`, and the scenery layer fills the
   settlement plane opaquely from `GROUND_RATIO` (78% of the frame) down. Shelves 1 and 2 stood
   entirely underneath that fill — their polygons, their mist bands and their crest lights were
   emitted on every scrolled pixel and never once seen. What did show was one crest at the seam.
2. **The terrain was lit by convention, not by direction.** Every shelf had a rim light on top and a
   mist band pooled evenly beneath it. Nothing in the renderer stated where the light comes from, so
   the ground read as shaded rather than as standing in light.
3. **Every boundary was a clean vector edge.** A ridge, a shelf and a plane all end on a 1 px stroke
   or a gradient stop. That is what makes a procedural world read as vector art: real ground has a
   boundary that breaks up.

And one about the frame: there was no lens. The world is a flat rectangle of equal weight from edge
to edge, so nothing draws the eye to the middle of it.

## Goals

- Compose the ground substrate inside the band that is actually visible, and make that band read as
  receding land rather than as a graded fill.
- State the light direction once, and light the terrain from it.
- Dissolve the boundary closest to the eye into a raster rather than a line.
- Put a lens over the frame at no per-frame cost.

## Non-goals

- No off-screen scene or glow buffer, and no `ctx.filter`. See "Declined" below.
- No full-screen colour grading pass. See "Declined" below.
- No new gameplay state; nothing here is readable by progression, pressure, harvest or the scheduler.
- No `Math.random()`, and no per-frame DOM or style writes.

## Decisions taken

| Question | Decision | Rationale |
| --- | --- | --- |
| Where the substrate composes | `horizon + 12 … GROUND_RATIO − 6`, with relief scaled to that band | It is the only part of this layer that is not painted over. About a ninth of the viewport, so the relief has to be a fraction of the band rather than a pixel constant, or a phone loses the nearer steps out of the frame. |
| Light direction | One shared `LIGHT_FROM_X`/`LIGHT_FROM_Y` in `substrate.ts`, upper left | It is the direction the 2.5D solids already imply by lighting their tops and left faces. Stated once and scaled per elevation, so a taller formation casts further without each site inventing numbers. |
| Contour lines | One per shelf, on a lattice twice as coarse as the silhouette | A contour describes the form; the crest carries the edge detail. At the silhouette's own resolution it would nearly double a shelf's cost for a line drawn at a tenth of its alpha — on the layer repainted per scrolled pixel. |
| Ordered dithering | `bayerThreshold` in `primitives.ts`, drawn as explicit cells | `CanvasPattern`, `ImageData` and per-pixel loops are all outside the `DrawSurface` vocabulary, and a recording test cannot see any of them. The Bayer matrix as geometry is the same effect in the idiom the renderer already has: it joins `hash01` (point), `valueNoise` (smooth) and `spreadPosition` (spread) as the *ordered* form. |
| How much dithering | 64 cells of 8 px, on one shelf, strided across the band | An ordered dither is O(area): a 4 px raster over a stage-4 world's visible band is thousands of rectangles against a layer with a few hundred primitives of headroom. So it is an ordered *stipple* along the edge closest to the eye — the honest version of the effect at this budget, not the pattern fill a sketch assumes. |
| The lens | A CSS overlay above all three canvases, strength written on a band change | The three canvases are separate elements, so a `multiply` pass inside one cannot reach the others: a vignette painted on the dynamic layer darkens only that layer's own content. As CSS it costs nothing per frame, composites over everything, and sits below the HUD so the chips stay legible. |
| What drives the lens | The Attention band | Attention's third role, beside the sky's colour and the observer's light field: the frame closing in as the world is watched. Written inside the structural-rebuild branch, so a ticking value never touches the DOM. |

## Architecture

### `render/substrate.ts` (new)

Owns the ground substrate: `ridgePoints` (moved out of `world.ts`, where it was a private helper for
every terrain profile) and `drawGroundShelves`. `world.ts` keeps only the two facts it has: where the
ground begins and where the settlement plane covers it.

Per shelf, in paint order:

1. **The mist it stands in**, offset away from the light, clamped to the plane.
2. **The cast band** — the same shape again, darker, offset twice as far, and clipped to the distance
   to the plane. This is what separates "there is mist here" from "something stands here".
3. **The fill**, a vertical gradient from crest colour to foot colour.
4. **The contour**, following the same profile at .46 of the local relief on the coarse lattice.
5. **The crest rim light**, displaced *toward* the light.
6. **The crest dissolve**, on the nearest shelf only: cells above the crest kept or dropped by
   `bayerThreshold` against a coverage that falls off with height, quantized to the world lattice.

### `primitives.ts`

Gains `bayerThreshold(cellX, cellY)` — the 4×4 ordered matrix normalized to 0..1, periodic in both
axes and safe for negative cells. It is the only member of the sampling vocabulary that takes no
seed: it answers by lattice cell, which is exactly what a cached layer's strip redraw needs.

### The lens

`.world-surface::after` is a radial gradient at `z-index: 2` — above the three canvases, below
`#world-hud` — driven by `--world-vignette`. `CanvasWorld.applyVignette` writes that property from
`presentation.bands.attention`, inside the branch that rebuilds the scene. It is skipped entirely
under `prefers-reduced-transparency`.

## Declined, with reasons

- **The dual-buffer scene/glow pipeline.** Off-screen layer caches were measured and rejected in this
  renderer already, and the three canvases exist because they repaint at three different cadences: a
  scroll blits the scenery layer onto itself and repaints only the exposed strip, and the static
  layer is cheap enough to simply repaint. Collapsing them into one composited scene buffer discards
  both optimizations to buy a blit. `ctx.filter = 'blur(8px)'` per frame is the exact cost mistake
  `render/AGENTS.md` warns about, and it is unsupported or slow on the platforms adaptive quality
  exists for.
- **Bloom from a downscaled glow buffer.** The layered-falloff form of the same effect is already how
  this renderer draws emissive light: a wide dim stroke under a narrow bright one for a fissure, two
  discs for a lit building, a core plus a falloff for a beacon and a flow mark. A second, global
  system would duplicate that at the cost of a per-frame upscale blit.
- **Full-screen colour grading.** `worldPresentation.colors` *is* the grade — sky, haze, terrain,
  ground, settlement, window and spill are each resolved from era, Entropy, danger and Attention, in
  bands. The design note beside it is explicit that tinting everything one state's hue is the one
  thing that palette must not become, and a `multiply`/`color-burn` wash over the frame is that. A
  wash also cannot work from a canvas here: it would reach only one of the three layers.

## Budgets

The static layer measures **651 primitives at 1440×900** for the busiest world (586 before), against
its pinned ceiling of 900 — the substrate's additions are the contour per shelf, one cast band per
shelf, and at most 64 stipple cells. The animated layer is untouched. The lens costs nothing per
frame and one style write per structural rebuild.

## Tests

`presentation.test.mjs`

- `bayerThreshold`: sixteen distinct thresholds, monotone in coverage (a sixteenth of coverage lights
  exactly one more cell), spread across every row and column at half coverage, periodic in both axes,
  and stable for negative and fractional cells.
- Every primitive the substrate emits stays inside its band — above the settlement plane and below a
  ceiling set by the foothills' own amplitude — at three viewport heights.
- The substrate is deterministic in the seed and differs between seeds; the stipple stays inside its
  budget, sits on the world lattice, and does not move when the band narrows; the contour stays
  inside the form; the light direction is upper-left and the two offsets take opposite signs.
- The ridge sampler emits the same points for a narrow band as for a wide one over their overlap.

`render-smoke.test.mjs`

- The vignette is written exactly once for the first scene, not at all across three frames of a
  ticking Attention inside one band, and exactly once more when the band changes — deeper than before.
- The static layer stays under its 900-primitive ceiling with the substrate in place.
