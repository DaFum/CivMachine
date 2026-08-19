# Civilization Visualization Expansion Design

**Status:** Approved for implementation on 2026-08-19
**Release target:** Reality Consumption Engine Browser (next minor after v1.3.1)
**Scope:** `public/game/src/render/**` only — no engine, rules, or save changes
**Save policy:** No `GameState` shape change, no `SAVE_VERSION` bump
**Product language:** English (player-facing world copy), per existing convention

## Problem

The Civilization world view communicates development almost entirely through **counts and color**. `worldSnapshot` emits `buildingCount`, `populationDots`, `trafficCount`, `aircraftCount`, `satelliteCount`, and `worldPresentation` shifts a palette. The renderer then draws undifferentiated rectangles: `buildingLayout` assigns `kind: i % 5`, but `kind` is read exactly once in the whole codebase — a lean-to annex on stage-0 huts in the Phaser path (`world.ts:96`). No stage ≥ 1 structure and nothing in the Canvas path varies by kind. `populationDots` is computed in `world-model.ts:32` and referenced nowhere else — it is never rendered at all.

Consequences:

- A stage-4 arcology world and a stage-2 town world differ in *how many* rectangles there are and *what color* they are — not in what the rectangles *represent*. Growth reads as zoom, not as civilization.
- There are no inhabitants. The player cultivates a species for an entire run and never sees one.
- The ten Paths change one accent color and one background motif. Path dominance — the central strategic axis — is nearly invisible on the map.
- Traits and Breeding Matrices have zero visual expression.

There is also a structural cause that will make any expansion expensive if left alone: **every visual element is implemented twice**, once against Phaser `Graphics` (`drawSky`, `drawTerrain`, `drawSettlement`, `drawAtmosphere`, `drawPathMotif`) and once against `CanvasRenderingContext2D` (`drawStatic`, `drawDynamic`, `drawFallbackPath`). The two have already diverged: the Canvas path omits window rows on far buildings, satellites, sanity-distortion rings, and reduces the ten path motifs to four generic shapes. CLAUDE.md requires the two paths to stay in agreement. Adding creatures, typed structures, banners, and traffic to both by hand would multiply this divergence.

## Goals

- Make development stage legible from silhouette and content, not only from count and color.
- Show the cultivated species as visible inhabitants, derived from the run's Traits.
- Make Path dominance visible on the map as territorial control (banners over settlements).
- Give each Era a distinct built environment (farms, industry, temples, spaceports).
- Animate structural upgrades so progression is felt at the moment it happens.
- Eliminate the dual-implementation cost so the Phaser and Canvas paths cannot drift.
- Hold the two rendering invariants: no per-frame `localStorage` writes or control rebuilds; structural keys change on bands and interventions, never on ticking numbers.

## Non-goals

- No save migration, storage-key change, or `GameState` schema change.
- No external art assets, sprite sheets, or image files. All visuals stay procedural, so the offline Canvas fallback keeps parity and the service worker precache stays small.
- No new gameplay mechanics. Factions and species are **derived views** of existing state, never new authoritative state.
- No hand-edits to `data/content.generated.ts`.
- No adaptive/runtime-scaled quality budget. Budgets stay fixed so tests can assert them.

## Decisions taken

| Question | Decision | Rationale |
| --- | --- | --- |
| Species source | `civ.traits` + seed fallback | The Breeding Matrix lives on `state.machine.runBuild`, not on `Civilization`, and resets on universe reset while the civ persists. Its only mechanism is `trait_bias` (`engine.ts:112`), so **traits already encode the matrix**. Deriving from traits keeps every render function pure over `civ` and needs no plumbing or save change. |
| Detail budget | Fixed ceiling of 120 animated agents | Keeps the 30 fps dynamic layer affordable on mobile in the Canvas fallback, and stays deterministic so a test can assert the cap. |
| Upgrade presentation | Animated construction | A level change should be felt. Rendered wholly in the dynamic layer so the cached static layer is untouched. |
| Faction source | Path affinities | Affinities are competitive and zero-sum in attention; institutions are purely cumulative and would produce growth without conflict. Banner colors already exist as `PATH_ACCENTS`. |

## Architecture

### The shared drawing surface

New module `render/draw-surface.ts` defines the minimal drawing vocabulary both backends already use:

```ts
export interface DrawSurface {
  fillStyle(color: number, alpha?: number): DrawSurface;
  lineStyle(width: number, color: number, alpha?: number): DrawSurface;
  fillRect(x: number, y: number, w: number, h: number): DrawSurface;
  strokeRect(x: number, y: number, w: number, h: number): DrawSurface;
  fillCircle(x: number, y: number, r: number): DrawSurface;
  strokeCircle(x: number, y: number, r: number): DrawSurface;
  fillTriangle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): DrawSurface;
  line(x1: number, y1: number, x2: number, y2: number): DrawSurface;
  fillPoly(points: ReadonlyArray<readonly [number, number]>): DrawSurface;
}
```

Two adapters: `phaserSurface(graphics)` (a thin pass-through — the interface is modelled on Phaser's `Graphics` API) and `canvasSurface(context, toColor)` (translates to `CanvasRenderingContext2D` calls, reusing the existing `color()` helper). Every new drawing routine is written **once** against `DrawSurface`.

Existing draw functions are migrated onto `DrawSurface` as part of this work, which is what removes the current Phaser/Canvas divergence. `drawDecisionImpulse` and `drawCanvasDecisionImpulse` collapse into one function.

### Module layout

All new modules live under `public/game/src/render/` and preserve the one-directional layering (`data/ → game/ → ui/ + render/`). They are pure functions over `Civilization` plus geometry, with one exception noted below.

| Module | Exports | Purity |
| --- | --- | --- |
| `draw-surface.ts` | `DrawSurface`, `phaserSurface`, `canvasSurface` | Adapter |
| `species.ts` | `speciesProfile(civ)`, `casteFor(settlementClass)`, `drawCreature(surface, …)` | Pure |
| `factions.ts` | `factionRoster(civ)`, `factionSignature(civ)` | Pure |
| `settlements.ts` | `settlementLayout(civ, worldWidth, height, snapshot)` | Pure |
| `structures.ts` | `structureKindsForEra(era, stage)`, `drawStructure(…)`, `drawBanner(…)` | Pure |
| `agents.ts` | `agentPlan(civ, snapshot, settlements)` | Pure |
| `construction.ts` | `ConstructionTracker` | Stateful (renderer-local, see below) |

`world.ts` retains only: renderer lifecycle, Phaser/Canvas selection and failure fallback, camera and drag/wheel input, layer composition, and the frame loop. It shrinks from 629 lines to roughly 380. `buildingLayout` and `BuildingShape` are removed, replaced by `settlementLayout`.

`world-model.ts` gains the agent budget and settlement counts. `world-presentation.ts` gains species and faction contributions to `structuralWorldKey`. Neither changes shape for existing consumers.

## Species

### Derivation

`speciesProfile(civ)` walks a **priority-ordered** table of the twelve catalog traits and takes the first archetype whose trait is present in `civ.traits`. Iteration order is the table's, not `civ.traits`', so the result is deterministic regardless of the order traits were granted.

| Trait | Archetype | Silhouette |
| --- | --- | --- |
| `fungal_consensus` | `mycelic` | Squat body, broad cap head, spore glow |
| `liquid_mathematics` | `fluidic` | Legless, serpentine, gliding gait |
| `telepathic_species` | `cerebral` | Narrow frame, oversized cranium, antenna arc |
| `physics_optional` | `phasic` | Flickering alpha, offset limbs |
| `sentient_moon` | `lithic` | Heavy mass, crystalline shoulders |
| `recurring_nightmare` | `umbral` | Dark silhouette, trailing smoke |
| `ritual_engineering` | `chitinous` | Four limbs, insectoid stance |
| `born_after_end` | `revenant` | Hollow torso, glowing eyes |
| `last_species` | `attenuated` | Thin, sparse, low density |

`museum_planet`, `chronically_lucky`, and `extreme_bureaucracy` carry no bodily implication and are skipped. If no trait matches, the archetype is chosen from `civ.seed` among `bipedal`, `tripodal`, `swarm`.

The returned profile carries: `id`, `archetype`, `limbs`, `heightRatio`, `bodyColor`, `glow`, `gaitPeriod`, and `features` (a small flag set: `antenna`, `cap`, `smoke`, `crystal`, `hollow`). `bodyColor` mixes the archetype's base hue toward the Path accent so species and Path read as one civilization.

### Castes

Settlement class modulates the profile into a caste, so one species reads as socially stratified rather than as a set of unrelated creatures:

| Settlement class | Caste | Modulation |
| --- | --- | --- |
| `camp`, `village` | `labourer` | Smaller scale, carried tool, no glow |
| `town`, `city` | `citizen` | Full scale, cloak, upright posture |
| `metropolis`, `arcology` | `augmented` | Accent glow, one additional limb, halo ring |

`drawCreature(surface, profile, caste, x, y, scale, phase, accent)` renders at 6–10 px. `phase` drives a two-frame gait derived from `gaitPeriod`; `reducedMotion` pins it to a single frame.

## Factions

`factionRoster(civ)` reads `CivilizationPaths.ensure(civ).affinity`, keeps paths with affinity `> 0`, sorts descending, and returns entries of `{ pathId, label, color, share, sigil }` where `color` is the existing `PATH_ACCENTS` value and `share` is the normalized affinity fraction. The dominant path, when set, is forced to the head of the roster.

`sigil` is a small enum (`spire`, `node`, `ring`, `prism`, `spiral`, `chevron`, `grid`, `halo`, `void`, `nest`) mapped one-to-one from the ten path ids, drawn on the banner cloth.

Settlements are assigned factions by walking the roster and consuming settlements proportional to `share`, largest settlement first — so the leading path visibly holds the largest cities. With an empty roster (no affinity yet) all settlements are unaligned and render a neutral grey banner.

`factionSignature(civ)` returns a discrete string for the structural key: the top three path ids plus each share quantized to quarters. Continuous affinity drift inside a quarter does not rebuild the world.

## World map

### Settlements

`settlementLayout` replaces `buildingLayout`. It partitions the world width into seeded clusters and returns `Settlement[]`:

```ts
interface Settlement {
  id: string; centerX: number; radius: number;
  settlementClass: SettlementClass; factionIndex: number;
  structures: Structure[];
}
interface Structure {
  id: string; x: number; width: number; height: number;
  kind: StructureKind; level: number;
}
```

`SettlementClass` is `camp | village | town | city | metropolis | arcology`, derived from `snapshot.stage`, `civ.era`, and the cluster's structure count. The total structure count across all settlements equals `snapshot.buildingCount`, so the existing count-growth tests remain meaningful.

### Structures per Era

`structureKindsForEra(era, stage)` gates the available `StructureKind` set:

| Era | Adds |
| --- | --- |
| 0 | `dwelling`, `farm`, `temple`, `monument` |
| 1 | `industry`, `academy` |
| 2 | `reactor`, `spaceport` |
| 3+ | `orbital_anchor` |

Placement within a cluster is role-driven, not random: farms occupy the cluster's outer edge, industry sits at one flank with stacks, temple and academy take the center, and `spaceport` / `orbital_anchor` appear only on `city` or larger. Each kind has a distinct silhouette drawn by `drawStructure` — pitched roofs and field rows for farms, stacks for industry, a stepped tower and dome for temples, a launch cradle for spaceports.

### Traffic

Roads are drawn as bands connecting settlement centers rather than a single ground stripe. Vehicles travel on 2–3 lanes with an Era-dependent silhouette (cart → wheeled vehicle → glider) and are bound to a road segment, so traffic flows between places instead of drifting across the whole width.

Air traffic follows corridors between settlement pairs. Settlements with a `spaceport` emit a periodic rocket launch: an ascending body with an exhaust plume, on a seeded interval per spaceport.

### Banners

Each settlement carries a banner at its center: mast drawn in the static layer, cloth in the dynamic layer with a wave derived from `time` and the settlement's seed. Cloth color is the faction color; the faction sigil is drawn on the cloth. Under `reducedMotion` the cloth renders in a fixed pose.

### Agent budget

Fixed ceilings, exposed on the snapshot as `agentBudget` so tests can assert them:

| Agent | Ceiling |
| --- | --- |
| Pedestrians | 60 |
| Ground vehicles | 34 |
| Aircraft | 14 |
| Orbital | 8 |
| Launches | 4 |
| **Total** | **120** |

Counts scale with stage, era, development, and institutions below these ceilings, following the existing `worldSnapshot` idiom. `populationDots` — currently computed and never drawn — is repurposed as the pedestrian input and finally becomes visible.

## Construction animation

`ConstructionTracker` is the one stateful piece and is owned by the renderer, not by `GameEngine` — it holds presentation timing, never game state, and is discarded on renderer teardown.

It maps `Structure.id` to the last observed `level` and a `startedAt` timestamp. On each structural rebuild it diffs incoming levels against the map; a level increase records `startedAt = now`. Entries older than the 1800 ms animation window are pruned.

Rendering is confined to the **dynamic layer**:

1. The static layer draws the structure at its final level, as usual, and stays cached.
2. For each structure inside its animation window, the dynamic layer overlays: scaffold posts flanking the structure, a horizontal build line rising from ground to full height over the window, a sky-colored wash over the region *above* the build line, and sparks along the line.

The wash reads as "not yet built" without requiring a static redraw, so the no-rebuild-per-frame invariant holds. Under `reducedMotion` the window is shortened to a single 400 ms flash with no moving line.

## Structural key

`structuralWorldKey` gains three discrete contributions:

- `speciesProfile(civ).id`
- `factionSignature(civ)` — top three paths with quarter-quantized shares
- settlement class distribution — the count per class, joined

All three are discrete by construction. The existing entries are unchanged. The invariant test — that a small `development` tick does not change the key, while an era change, path change, or band crossing does — continues to apply and is extended to the new contributions.

## Testing

New assertions in `public/game/tests/presentation.test.mjs`, against `dist/render/*` as the existing tests do:

1. **Species determinism** — same `civ` yields the same profile across calls; profile is independent of `civ.traits` ordering.
2. **Species trait coupling** — a civ with `fungal_consensus` yields `mycelic`; a civ with only `chronically_lucky` falls back to a seed archetype; two different seeds with no bodily trait yield differing archetypes.
3. **Faction roster** — shares sum to 1 within epsilon, ordering is descending, the dominant path heads the roster, an empty affinity map yields an empty roster.
4. **Faction signature banding** — an affinity change inside a quarter leaves the signature unchanged; crossing a quarter changes it.
5. **Era gating** — `structureKindsForEra` excludes `spaceport` at era 0 and 1 and includes it from era 2; `orbital_anchor` only from era 3.
6. **Settlement classes** — a stage-0 civ yields only `camp` / `village`; a stage-4 civ yields at least one `metropolis` or `arcology`; total structures equal `snapshot.buildingCount`.
7. **Agent budget** — across a sweep of stages, eras, and development values, every component stays at or below its ceiling and the sum never exceeds 120.
8. **Construction tracker** — a level increase opens a window; the same level twice does not; an entry past the window is pruned.
9. **Structural key** — unchanged behaviour for ticks; changes when the species archetype changes, when the faction signature changes, and when the settlement class distribution changes.

The existing render tests (Canvas fallback exists, caps at 2× device pixels, world expands from camps to arcology) must continue to pass unmodified.

## Release checklist

- Compile: `tsc -p public/game/tsconfig.json` — `dist/` is committed and is what the browser loads.
- Add the seven new `dist/render/*.js` paths to `APP_ASSETS` in `public/sw.js`. Omitting them means returning players never receive the new modules.
- Bump `CACHE_NAME` in `public/sw.js`; the cache is cache-first with no revalidation.
- Bump the version in `package.json`, `public/game/package.json`, the footer of `public/game/index.html`, `CACHE_NAME`, and both READMEs together — `tests/game-release.test.mjs` asserts the two `package.json` versions match.
- `npm test` (compiles, then runs both suites), `npm run lint`, `npm run typecheck`.

## Risks

- **Canvas fallback cost.** The fallback runs the same agent budget without GPU batching. Mitigation: the fixed 120 ceiling, the existing 33 ms dynamic frame gate, and the 2× device-pixel cap. If profiling shows the fallback missing 30 fps on mobile, the pedestrian ceiling is the first lever to lower — it is a single constant.
- **Structural key churn.** Adding three contributions raises the chance of a rebuild storm if any of them is accidentally continuous. Mitigation: all three are discrete by construction, and test 9 asserts tick-invariance directly.
- **Scope of the `DrawSurface` migration.** Migrating the existing draw functions touches every visual in the game at once. Mitigation: the migration is mechanical (the interface is modelled on the Phaser API already in use), and the existing render tests plus visual comparison in both renderers gate it.
