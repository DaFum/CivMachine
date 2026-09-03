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
banks, 3 reality shears, 5 entropy fissures, 8 trade routes, 18 route flow marks, 48 settlement
micro-lights, 3 animated identity frames, and device pixel ratio capped at 2. The sky-and-
terrain layer as a whole is held under 900 primitives, because it is repainted on every scrolled
pixel, and the animated layer under 1100 — measured at 836 for the reference developed world, which
leaves room for another cue of that size and none at all for a loop over a stage-4 world's
structures. `quality.ts` may shed cosmetics only — never fractures, beacons, landmarks,
scars or the current impact — and must never touch `GameState` or `simulationSpeed`.

No `Math.random()`: every visual choice is seeded or hashed so a world is reproducible. `hash01` is
the point sample, `valueNoise`/`ridgeNoise` in `primitives.ts` are its smooth form — a terrain
profile is built from those, never from a noise library — and `spreadPosition` beside them is its
spread form, for a run of marks that has to cover the world without moving when there are more of
them.

A cue on a **cached** layer is gated on a *band*, never on a raw stat. `structuralWorldKey` rebuilds
those layers on the bands, so a threshold sitting inside one — entropy at 55, say, inside the 50–74
band — is crossed with nothing keying on the crossing, and the cue stays absent until an unrelated
rebuild wanders past. The gate, the count and anything else that decides whether a shape exists at
all have to be functions of what the key tracks. A continuously drifting *colour* is the exception
the mood wash exists to cover; a shape appearing is not.

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
by a hash across four viewports leaves most of the world without it — a cue whose visibility depends
on where the player happened to scroll is not a cue. But a lattice sized by the count is not the
answer either: those counts follow live stats, so the frame Stability opens a third fracture, a
lattice moves the other two from the quarters of the world to its sixths and every mark on screen
jumps. `spreadPosition` in `primitives.ts` is the placement that is both — every prefix of it is
spread evenly, and mark `i` sits where it sat however many marks there turn out to be.

## Everything culls by its own extent

A layer paints only the world slice its parallax puts on screen, so every primitive is checked
against the band before it is emitted — and by *its own* extent, not by its owner's. A settlement's
radius reaches 18% of the world, so its light spill and its faction plinth are culled separately
from the settlement itself. `render-smoke.test.mjs` fails anything drawn entirely beyond
`CULL_MARGIN + WIDEST_STATIC_PRIMITIVE`, which is also the ceiling on how wide a single primitive
may be: keep a glow radius or a prop's reach inside it rather than raising the constant.

## A budget is a knee, not a wall

`skylineCompress` in `settlements.ts` is why. The skyline budget used to be a hard `Math.min`, and a
hard ceiling on a distribution is a *collision*: 26% of a portrait world's structures and 18% of a
desktop one's came out at exactly the same height, so the tallest quarter of the city sat on one
horizontal line and the skyline read as a plateau. The compression is continuous below the knee,
strictly increasing above it and asymptotic to the ceiling, so the budget is still guaranteed and the
tallest plot is still the tallest building. Any other ceiling over a spread of values wants the same
treatment.

`MAX_STRUCTURE_ASPECT` beside it is the other half: the plots that reached the ceiling were also the
narrowest, and a 37 px wide, 558 px tall slab is a mast rather than a building. The floor widens
rather than shortening — height is what carries the composition — and only a tether and a launch
mast are exempt. One consequence is worth remembering: **a light sized off `width` alone is now sized
off a footprint that follows height.** A temple's crown, a reactor's core and a monument's ring are
scaled by `emblem` — the *shorter* of the two dimensions — or a landscape phone, where every solid
is short and wide, fills with lit discs half a building across.

## A path is not a hue

`identity.ts` owns which path builds which way and `structures.ts` knows how to draw it. The capital
motif and the ambient marks were never enough on their own: two dominant paths rendered the same
skyline in a different accent, and the design says an identity must not be reducible to a colour. The
`crown` on `PathIdentityDescriptor` is that identity written into the buildings themselves — every
tall civic and residential solid ends the way its civilization ends things. It is restricted to
`dwelling` and `academy` above `CROWN_MIN_HEIGHT` so the signature reads as the city's architecture
rather than as a stamp on every shed, and `presentation.test.mjs` compares the ten paths' geometry
with the colour stripped out, so a shared crown cannot slip back in.

`frame` on the same descriptor is that identity one scale up: the mass a whole settlement is built
inside, drawn behind its own skyline on the cached layer. There are three grammars rather than ten —
a membrane with no straight edge anywhere, an orthogonal stack of volumes with nothing but straight
edges, and a mass that is not touching the ground — because this reads at settlement scale and ten
silhouettes at that scale would be ten variations of nothing. It is gated on the identity tier, a
band `structuralWorldKey` already tracks, and every primitive it paints stays inside
`settlementFrameReach`, which is the extent the caller culls the whole frame by: the light-spill bug
in a new place, and `presentation.test.mjs` measures the frames' geometry against that reach.

**Height and use decide whether a crown exists; the depth lane decides only how strongly it is
drawn.** The two are easy to confuse, because `detail` carries the lane's contrast and reads like a
convenient gate — but gating on it dropped the crown from 24.5% of the eligible skyline, back-lane
towers included, and the tallest of those stood within 3% of the tallest building in the world. A
back-lane solid is further away, not a different civilization. This is the general rule for anything
the aerial perspective touches: fade it with `detail`, never gate it on `detail`.

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

## A per-frame budget is shared, not spent left to right

A single counter walking the world in order is a bug wearing a budget's clothes: the window budget
and the strain lines both did it, so the leftmost settlement on screen took everything and the right
half of the viewport stayed dark and unstrained. It is worst at a degraded tier, where the whole
budget is fourteen windows. Share the budget over what is *on screen* and stride inside each of them,
so shedding thins the cue everywhere rather than truncating it after the first few plots.

The same rule reaches the transient cues. The phase-transition cue is anchored to the settlements the
renderer resolves into screen space, and takes exactly three of them — anchoring replaces the fixed
fractions rather than adding to them, because that cue's stroke count is fixed by design and pinned.

## A repeated cell is visible; a sampled profile is not

Two shapes in this renderer were built as one trough and one spike per cell on a fixed lattice: the
old triangle terrain and the foreground bank. That is a sawtooth however the spike height is hashed,
and the bank's was on the plane closest to the eye. Both are now a two-octave ridge sampled on a
finer lattice and filled as one polygon — long swells carrying short detail, with no forced return to
the baseline between them. The lattice stays fixed in world space, so a scenery strip redraw emits
exactly the points a full redraw does.

The sky's atmospheric front is the same lesson from the other side: the variation is in the front's
*shape*, never in a per-column alpha. A stepped alpha has to step somewhere, and open sky is the one
surface in the frame with nothing to break a vertical seam up.

`routes.ts` is the third shape built this way, and it carries the rule that makes such a shape
affordable on a cached layer. A trade route is a cubic Bézier bowed off its own chord, and its two
control points sit at exactly a third and two thirds of the span so the Bernstein sum in x collapses
to `fromX + span * t` — a world x therefore maps to a curve parameter in closed form, and the curve
is sampled on a lattice anchored to the *route*, never to the viewport. That is what keeps a strip
redraw emitting exactly the points a full redraw of the same slice does. The polyline also reaches a
step past the band on each side, so the primitive that opens the path is never the first point
*inside* the exposed strip. Whatever rides a route — the roadbed, the lane markings, the flow marks,
the vehicles — reads its position off `routeOffsetAt`, because traffic interpolated along the chord
drives visibly beside its own road the moment the road bends.

## Light is one system

`presentation.colors.lightSpill` is the colour everything the civilization emits shares — window
glow, street lamps, road reflections, the settlement's glow in the air — and `presentation.lightLevel`
is how lit the world is. A new light source reads from those rather than picking its own warm yellow,
which is what keeps a settlement looking like one place. State that must stay legible (fractures,
beacons, scars, impacts) keeps its own role colour and is never dimmed by the light level.
