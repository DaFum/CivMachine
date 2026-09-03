# Organic Geometry and Kinetic World Design

**Status:** Approved for implementation on 2026-09-03
**Release target:** Reality Consumption Engine Browser v1.26.0
**Scope:** `public/game/src/render/**` only — no engine, rules, or save changes
**Save policy:** No `GameState` shape change, no `SAVE_VERSION` bump
**Product language:** English (player-facing world copy) — this work adds no copy at all

## Problem

The world reads as *placed* rather than as *grown*, and three shapes are why.

1. **The network is a set of rectangles.** `drawSettlementContent` drew one `fillRect` from each
   settlement centre to the next. A straight bar between two points announces that the settlements
   sit on a number line, and the traffic on it — interpolated along the same chord — confirmed it.
2. **A settlement has no mass of its own.** Path identity was written into the *buildings* (the
   `crown`), the capital (`landmark`) and the world's ambient marks (`motif`). At the scale of a
   whole settlement, every civilization in the game built the same shape: a row of solids on a flat
   plane. Two worlds a hundred turns apart in commitment were distinguishable only building by
   building.
3. **Night is a handful of lit windows.** The window budget is 46 for the whole visible world, which
   is the right budget for *animated, per-structure* lighting and the wrong one for density: a
   metropolis at night showed a dozen bright rectangles and nothing between them.

Two smaller ones sit beside those: the atmospheric motes each retraced one clean sine arc, so 150 of
them read as a mechanism rather than as suspended dust, and the generic consequence ring expanded at
a constant rate, which reads as a growing circle rather than as a release of energy.

## Goals

- Make the network read as a trace worn into the landscape, and put what travels on it *on* it.
- Give a settled civilization a silhouette at settlement scale, not only building by building.
- Make a developed world's night read as density, at a fixed per-frame cost.
- Keep every one of those inside the renderer's existing invariants: seeded, band-gated, culled by
  its own extent, bounded by a count, and identical under a strip redraw.

## Non-goals

- No new gameplay state, and nothing here is readable by progression, pressure, harvest or the
  scheduler. Every value is derived from `Civilization` and the clock.
- No new drawing primitive. `DrawSurface` gains nothing — in particular no dash state, see below.
- No mutable per-frame simulation state (no particle pools, no spawn/despawn queues). The animated
  layer stays a pure function of the world and the clock, which `render-smoke.test.mjs` pins.
- No `Math.random()`, anywhere, for anything.

## Decisions taken

| Question | Decision | Rationale |
| --- | --- | --- |
| Route geometry | Cubic Bézier bowed perpendicular to its own chord, in a new `render/routes.ts` | Both ends of a route sit on the same ground line, so the perpendicular is vertical and the deflection is a bow toward and away from the eye — a road that bends in the depth plane, which is what a side-on view can show. |
| Control point spacing | Exactly a third and two thirds of the span | With the x components evenly spaced the Bernstein sum in x collapses to `fromX + span * t`, so a world x maps to a curve parameter in closed form. That is what lets the curve be sampled on a lattice fixed in world space, which the cached scenery layer requires. |
| Flow direction cue | A bounded run of marks placed *on* the curve, each with a bright leading end | `lineDashOffset` is the canvas idiom and the wrong tool here: `DrawSurface` has no dash state by design, and a dashed stroke puts the whole route's pattern into every frame however little of it is on screen. A mark with a lit head also carries direction in a single frame, which a dash pattern does not. |
| Settlement silhouette | Three building grammars (`organic`, `industrial`, `transcendent`) on `PathIdentityDescriptor.frame` | Ten silhouettes at settlement scale would be ten variations of nothing; the ten paths stay distinguishable by landmark, crown and ambient marks. `identity.ts` stays the single authority on which path builds which way. |
| Frame gating | Identity tier ≥ 2, i.e. a settled dominant path | A leading affinity is not yet an architecture — the same threshold the crown uses. The tier is a band `structuralWorldKey` already tracks, so the cached layer rebuilds when it changes. |
| Night density | A second, separate micro-light budget, shared over the settlements on screen | The window budget animates *structures* and carries the state; density is a cosmetic on top of it, so it gets its own count and sheds with `windowFraction`. |
| Particle wander | Two frequencies beaten against each other per axis | A random walk needs accumulated velocity, and accumulated velocity is state the purity test forbids. Beating a slow drift against a faster one gives each mote a wandering path that is still a closed-form function of the clock. |
| Shockwaves | Ease the *existing* impact front rather than add a burst system | `drawConsequenceImpact` and `drawPhaseTransitionImpact` already own transient event feedback, anchored to real settlements and pinned by tests. A second system would duplicate them and reintroduce per-frame state. |

## Architecture

### `render/routes.ts` (new)

Pure geometry over the settlement layout. `tradeRoutes(civ, settlements, snapshot)` returns at most
`MAX_TRADE_ROUTES` (8) links in world order — one per consecutive pair, or one across its own
footprint for a lone settlement. Each carries its two ends, the two control-point deflections
(bounded by `ROUTE_MAX_BOW`, 15 px), a `flow` in 0..1 read off how much is built at either end, and
a `direction`.

- `routeOffsetAt(route, x)` — the perpendicular offset at a world x. Zero at both ends by
  construction, so a route always meets both settlements exactly on the ground line.
- `routePointAt(route, t)` — where a traveller `t` of the way along stands.
- `routePolyline(route, from, to)` — the route clipped to a band, sampled on the `ROUTE_STEP` (32 px)
  world lattice, reaching one step past the band on each side so the primitive that *opens* the path
  is never the first point inside an exposed strip.
- `routeInBand(route, from, to)` — the cull, by the route's own extent.

The bend direction comes from `valueNoise` sampled at the route's own midpoint — the same smooth
noise the terrain profile is built from — beaten against one `hash01` of the route seed, so two
routes crossing the same land lean the same way and no route moves when something unrelated changes.

### What rides a route

`agents.ts` gains `routeIndex` on `VehicleSpec`, and `world.ts` reads a vehicle's y off
`routeOffsetAt`. One curve is therefore the authority for the roadbed, the lane markings, the flow
marks and the traffic. The failure this removes is specific: traffic interpolated along the chord
drives visibly beside its own road as soon as the road bends.

`roadbedHeight` and `roadLaneOffset` beside them are the only statement of the bed's depth and of
where a lane rides in it. Those two facts were stated separately — a bed of `12 + stage * 3` px under
a 4 px verge, and lanes on a fixed 7 px pitch — so lane 2 rode at `ground + 24` against a bed that
ends at `ground + 19` at stage 1: the outer lane drove on the verge at every stage but the last. A
lane is now a fraction of the bed's usable depth with the vehicle's own height taken off it, so an
early road crowds its lanes rather than spilling them.

### Settlement frames

`identity.ts` gains `SettlementFrame` on the descriptor, `drawSettlementFrame` (cached scenery
layer, persistent geometry) and `drawSettlementFrameAccent` (dynamic layer, one animated cue).

| Frame | Paths | Geometry |
| --- | --- | --- |
| `organic` | `collective_mind`, `biological_transcendence` | A membrane dome over the settlement, its radius modulated at two frequencies so no lobe repeats, with cell walls inside it. Breathes on the dynamic layer. |
| `industrial` | `machine_faith`, `reality_engineering`, `cosmic_resistance`, `bureaucratic_singularity` | Orthogonal volumes stepping up behind the skyline and two tapered stacks. The furnaces under the stacks burn out of phase on the dynamic layer. |
| `transcendent` | `temporal_dominion`, `post_mortal_civilization`, `void_communion`, `recursive_simulation` | A stele of light standing in the settlement and the shadow of what floats above it. The monolith levitates on the dynamic layer, its ground shadow shrinking as it rises. |

`settlementFrameReach(radius)` is capped at `FRAME_MAX_REACH` (120 px) and every primitive either
function paints stays inside it — including the membrane's wobble, which is why the contour's base
radius is `MEMBRANE_FIT` of the reach rather than all of it. That reach is the extent the renderer
culls the whole frame by, so a strip redraw and a full redraw of the same slice agree; the light
spill taught this lesson once already.

### Night density

`drawCityLights` gains a micro-light pass: `MAX_SETTLEMENT_LIGHTS` (48) shared over the settlements
on screen, positioned from `hash01` inside each settlement's footprint with a *quadratic* bias toward
the ground — a city is lit at street level first, and a uniform column up a settlement's full height
reads as a lit grid. Each light flickers on its own phase and speed, and a light whose phase has it
switched off this cycle is simply skipped, which is what keeps the field from reading as a static
texture. Colours come from `lightSpill`, the path accent and the window colour — light is one system.
Reduced motion keeps every light and freezes it.

## Budgets

Per animated frame, on top of what the layer already spent: at most 18 route flow marks, 48
micro-lights (shared over the settlements on screen), and 3 frame accents (strided over the
settlements on screen). Measured cost of the whole animated layer: **816–848 primitives across the
pinned reference worlds, up from 746** — pinned under 1100 in `render-smoke.test.mjs`, which leaves
room for one more cue of this size and none for a loop over a stage-4 world's structures.

The flow budget is shared *weighted by flow* rather than equally, with a floor of one mark per
visible route: flow already sets a mark's speed and length, and an equal split would leave a trunk
route and a spur looking identically busy — capacity would be the one thing the cue could not show.
The floor moves the budget (`Math.max(count, MAX_ROUTE_FLOW_MARKS)`) rather than truncating the list,
the same resolution the window budget uses, so the total is an identity. Inside one route the marks
are spread by index with a single hashed offset for the whole route; a hash per mark would overwrite
that spacing, cluster the marks and leave stretches of the route empty.

The cached scenery layer gains one polygon, one polyline and the existing lane markings per route,
plus one frame per settled settlement. The 12 px reference strip redraw stays under its pinned 320
primitives.

## Tests

`presentation.test.mjs`

- Routes bow off their chord, meet both settlements exactly, stay inside `ROUTE_MAX_BOW`, are
  deterministic in the seed, differ between seeds, and do not exist at stage 0.
- The sample lattice is fixed in world space: a narrow band and a wide one agree on every point
  inside their overlap, and the polyline starts and ends outside the band it was asked for.
- The road network paints a curved bed, not a rectangle: at least one bed spans more than the road's
  own height, and no bed leaves the ground plane by more than the bow allows.
- All ten paths build one of the three frames, an unaligned civilization builds none, tier 1 builds
  none, and the three frames' geometry differs with the colour stripped out — the comparison the
  crowns are held to.
- Every primitive a frame paints stays inside `settlementFrameReach`, at four settlement radii.
- Micro-lights stay inside their budget and inside the city, are denser at street level than near the
  crowns, are deterministic, and are never dropped by reduced motion.

`render-smoke.test.mjs`

- The animated layer stays under 1100 primitives with finite geometry at two clock times.
- The network carries something and it moves between two frames seconds apart — asserted on the
  flow's own recorded primitives, each checked against its route's curve to the pixel, rather than on
  "some stroke was drawn on the layer", which the ambience and the strain lines could satisfy on
  their own.

Every traffic lane keeps its whole body inside the bed at every stage, the lanes stay ordered and
distinct, a deeper road spreads them further apart, and an out-of-range lane clamps instead of
leaving the road.

And for the budget itself, back in `presentation.test.mjs`: no visible route carries nothing, the
total stays inside the budget, a busier link never carries fewer marks than a quieter one, and every
mark on a route sits at the same place inside its own slot — even spacing, with the per-route offset
differing between routes.
