# render/ — Agent Instructions

Three stacked canvases, and putting work on the wrong one is the mistake to avoid:

- `staticCanvas` — sky and terrain. Cheap enough that a scroll just repaints it.
- `sceneryCanvas` — settlements, outskirts, landmarks, memory marks and scars. **Persistent geometry
  only.** It moves 1:1 with the scroll, so a scroll copies the canvas onto itself and repaints only
  the exposed strip; `render-smoke.test.mjs` pins that strip against a full redraw of the same slice.
- `dynamicCanvas` — everything animated, plus transient impacts. Repainted every throttled frame.

All drawing goes through the `DrawSurface` interface in `draw-surface.ts`, never a raw 2D context, so
tests can record primitives. Visuals must derive from `world-model.ts` and `world-presentation.ts`;
`world.ts` stays orchestration.

Hard budgets the tests enforce: 150 particles, 9 haze bands, 12 fractures, 10 beacons, 120 planned
agents, 6 concurrent construction animations, 6 memory marks, 3 scars, 64 outskirt props, 12 cloud
banks, 3 reality shears, 5 entropy fissures, and device pixel ratio capped at 2. The sky-and-
terrain layer as a whole is held under 900 primitives, because it is repainted on every scrolled
pixel. `quality.ts` may shed cosmetics only — never fractures, beacons, landmarks,
scars or the current impact — and must never touch `GameState` or `simulationSpeed`.

No `Math.random()`: every visual choice is seeded or hashed so a world is reproducible. `hash01` is
the point sample and `valueNoise`/`ridgeNoise` in `primitives.ts` are its smooth form — a terrain
profile is built from those, never from a noise library.

## A layer only reaches as far as its parallax takes it

A layer at parallax `f` shows world coordinates `scroll * f` to `scroll * f + width`, and the scroll
itself stops at `worldWidth - width` — so the sky, at a tenth of the scroll, never exposes more than
about a third of a stage-4 world. Anything anchored to a *single* world position on a slow layer has
to be placed inside `layerReach(worldWidth, width, parallax)` or it is simply never seen: the
celestial body was visible for about a fifth of the seeds, and the observer's light field, anchored
at 72% of the world, for none of them. Anything placed on a lattice across the visible band — stars,
cloud cells, the distant skyline, the ground shelves — needs no such care, because the band already
*is* the slice that shows.

The same reasoning governs a state cue on any layer. A fracture, a beacon or a sanity ring scattered
by a hash across four viewports leaves most of the world without it, so each of those is placed on a
lattice sized by its own count: a cue whose visibility depends on where the player happened to
scroll is not a cue.

## Everything culls by its own extent

A layer paints only the world slice its parallax puts on screen, so every primitive is checked
against the band before it is emitted — and by *its own* extent, not by its owner's. A settlement's
radius reaches 18% of the world, so its light spill and its faction plinth are culled separately
from the settlement itself. `render-smoke.test.mjs` fails anything drawn entirely beyond
`CULL_MARGIN + WIDEST_STATIC_PRIMITIVE`, which is also the ceiling on how wide a single primitive
may be: keep a glow radius or a prop's reach inside it rather than raising the constant.

## Cost lives in the dynamic layer

The cached layers repaint on a scroll; the dynamic layer repaints every frame, so that is where a
cost mistake is paid 60 times a second. Two rules follow. A `CanvasGradient` is allocated per call,
so `fillLinearGradientRect`, `fillLinearGradientPoly`, `fillRadialGlow` and `fillEllipseGlow` belong
on the cached layers and in the bounded per-frame cues (a reactor core, one horizon field) — the haze bands and
the window lights build their softness out of layered rectangles and circles instead.
`fillEllipseGlow` is the flattened light field — a city's glow over its own skyline, a cloud's lit
underside, the seam of a reality shear — and it squashes the *context* vertically rather than the
gradient, so its horizontal extent is exactly the radius the caller culls by. It costs one
`save`/`restore` on top of a radial glow, which is why it belongs beside the other gradients rather
than in a per-frame loop. And per-frame
work stays bounded by a count, never by the world: twelve strain lines, twelve embers, a window
budget, not one primitive per structure in a stage-4 world.

## Frame pacing is measured, not chosen

`dynamicFrameIntervalMs` in `quality.ts` owns it. 33 ms (~30 FPS) is the floor and the architecture;
`DYNAMIC_FRAME_MS_SMOOTH` is granted only to a tier-0 renderer whose measured average draw cost is a
fraction of the budget, and it sits below one display interval on purpose — any threshold above that
drops every second animation frame and lands back on 30 FPS. Reduced motion and every degraded tier
keep the 30 FPS interval.

## Light is one system

`presentation.colors.lightSpill` is the colour everything the civilization emits shares — window
glow, street lamps, road reflections, the settlement's glow in the air — and `presentation.lightLevel`
is how lit the world is. A new light source reads from those rather than picking its own warm yellow,
which is what keeps a settlement looking like one place. State that must stay legible (fractures,
beacons, scars, impacts) keeps its own role colour and is never dimmed by the light level.
