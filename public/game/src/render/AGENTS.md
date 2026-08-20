# render/ — Agent Instructions

Three stacked canvases, and putting work on the wrong one is the mistake to avoid:

- `staticCanvas` — sky and terrain. Cheap enough that a scroll just repaints it.
- `sceneryCanvas` — settlements, landmarks, memory marks and scars. **Persistent geometry only.** It
  moves 1:1 with the scroll, so a scroll copies the canvas onto itself and repaints only the exposed
  strip; `render-smoke.test.mjs` pins that strip against a full redraw of the same slice.
- `dynamicCanvas` — everything animated, plus transient impacts. Repainted every throttled frame.

All drawing goes through the `DrawSurface` interface in `draw-surface.ts`, never a raw 2D context, so
tests can record primitives. Visuals must derive from `world-model.ts` and `world-presentation.ts`;
`world.ts` stays orchestration.

Hard budgets the tests enforce: 150 particles, 9 haze bands, 12 fractures, 10 beacons, 120 planned
agents, 6 concurrent construction animations, 6 memory marks, 3 scars, and device pixel ratio capped
at 2. `quality.ts` may shed cosmetics only — never fractures, beacons, landmarks, scars or the
current impact — and must never touch `GameState` or `simulationSpeed`.

No `Math.random()`: every visual choice is seeded or hashed so a world is reproducible.
