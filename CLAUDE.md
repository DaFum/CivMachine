# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project shape

Two independent tiers, deployed as one Next.js app on Vercel:

- `app/` — a thin Next.js App Router shell (~150 lines): registers the service worker, offers PWA install, toggles fullscreen, and embeds the game in an `<iframe src="/game/index.html">`. It contains no game logic.
- `public/game/` — the actual game: a self-contained, framework-free TypeScript bundle with its own `tsconfig.json`, its own `package.json`, its own test suites, and a **committed** `dist/`. Next serves it verbatim as static assets; no bundler touches it.

That separation is deliberate — the game survives shell/platform rewrites untouched. Do not move game code into the Next build graph.

## Commands

```bash
npm run dev          # Next dev server
npm run build        # next build (also runs tsc over app/)
npm test             # compiles public/game/src, then runs both test suites (251 tests)
npm run lint         # eslint (public/game/** is intentionally excluded)
npm run typecheck    # tsc --noEmit over the shell
```

Game-only workflows:

```bash
tsc -p public/game/tsconfig.json                 # compile public/game/src -> public/game/dist
node public/game/server.mjs                      # serve the game alone, no dependencies needed
node --test public/game/tests/core.test.mjs      # one test file
node --test --test-name-pattern="harvest math" public/game/tests/core.test.mjs   # one test
```

`npm test` uses quoted globs (`node --test "tests/**/*.test.mjs" …`) because Node 24 rejects bare directory arguments.

## The build step you must not forget

`public/game/dist/` is what the browser loads and it is checked into git. Editing `public/game/src/**` changes nothing until you run `tsc -p public/game/tsconfig.json` — `npm test` does this, so run it before claiming a game change works.

## Game architecture

Strict one-directional layering under `public/game/src/`:

`data/` → `game/` → `ui/` + `render/`, wired together by `main.ts`.

- **`game/engine.ts`** is the single source of truth. `GameEngine` holds all mutable `state`, exposes `onChange(fn)` for subscribers, and delegates every rule to a small pure module: `rules.ts` (harvest/cost math), `progression.ts` (unlocks, Machine Insight), `paths.ts` (path affinity), `pressure.ts` (Entropy/cascade), `stat-drift.ts` (per-second Stability/Awareness/Attention/Sanity rates), `tactical-actions.ts`, `intervention-scheduler.ts` (seeded weighted draw, one serving per intervention per run), `harvest-quality.ts`, `run-directives.ts`, `decision-feedback.ts`. Keep new rules in such modules — they are what the tests target.
- **`main.ts`** owns the `requestAnimationFrame` loop. The loop only exists during the `civilization` phase: it stops on any other phase and is restarted from `engine.onChange`, so an idle machine layer wakes nothing and rewrites no save. Inside it, the engine ticks and autosaves every 5 s; `beforeunload`/`pagehide`/`visibilitychange` save independently. It also binds keys 1/2/3/4 (digit row and numpad) to the four tactical actions — Stabilize, Accelerate, Probe, Vent.
- **`ui/view-model.ts`** turns engine state into presentation data (labels, bands, redaction by Prediction Core level). **`ui/app.ts`** renders it into the static DOM from `index.html` using template strings plus `replaceIfChanged` (innerHTML comparison). All escaping goes through `esc()`.
- **`render/world.ts`** owns the renderer lifecycle and a deterministic Canvas 2D world on three stacked canvases: `staticCanvas` (sky and terrain, the slow parallax layers — under 100 primitives, so a scroll simply repaints them), `sceneryCanvas` (settlements, over 90% of the static cost and the only layer that moves 1:1 with the scroll, so a scroll copies the canvas onto itself and repaints only the strip the move exposed), and `dynamicCanvas` (everything animated, repainted every throttled frame). All three paint at a device-pixel-aligned scroll — a fractional copy would resample the scenery layer once per drag frame. `render-smoke.test.mjs` pins the strip redraw against a full redraw of the same slice; that equivalence is what allows `SCENERY_SLACK` to stay small. All drawing goes through the `DrawSurface` interface in `render/draw-surface.ts`, which keeps the drawing code free of canvas transform bookkeeping and lets tests record primitives. Visuals must derive from `render/world-model.ts` (`worldSnapshot`, `developmentStage`) and `render/world-presentation.ts` (`worldPresentation`, `structuralWorldKey`). There is no second renderer — tests assert no Phaser naming survives.

### Two invariants the tests enforce

1. **Per-frame work must stay cheap.** Ticking must not write `localStorage` every frame and must not rebuild interactive controls every frame. Notifications are batched.
2. **Structural keys must ignore live values.** `civilizationRenderKey` (ui) and `structuralWorldKey` (render) decide when DOM and cached world layers are rebuilt. They must change on meaningful state bands and interventions, never on continuously ticking numbers — otherwise the game rebuilds itself 60×/s.

### Content data

`data/content.generated.ts` (~4.6k lines: 75 interventions, 10 paths, traits, upgrade catalogs, directives) is machine-generated bulk data — the generator has been removed, so treat the file as a frozen catalog and do not hand-edit it. Layer changes instead:

- `data/intervention-copy.ts` — action labels and consequence texts
- `data/entropy-crises.ts` — extra crisis events appended to the pool
- `data/apotheosis-events.ts` — twelve interventions that exist only in the fourth era
- `data/expanded-interventions.ts` — 36 pathless interventions, three era bands
- `data/expanded-path-interventions.ts` — a second affinity-gated chain per path (40) plus one dominance-gated consolidation per path (10)
- `data/event-chains.ts` — three branching chains: a root plus the two scheduled-only consequences its branches lead to
- `game/upgrade-balance.ts` — price/growth overrides

The engine composes these over the generated catalogs in its field initializers.

**A run must never repeat an intervention.** `interventionExhausted` in `game/intervention-scheduler.ts` allows exactly one draw per intervention per run (`INTERVENTION_ALLOWANCE_PER_RUN`); the `max_count` in the frozen catalog is ignored. That only holds because the catalog is large enough: 185 interventions, up to about 145 of them eligible inside a single run against roughly 100 draws in the longest naturally ending run. Adding content to a layered file is therefore also how the guarantee is maintained — and new content has to be written to the frozen catalog's numeric scale, because the survival-curve and first-run-economy tests in `public/game/tests/core.test.mjs` pin the medians the specs derive (`bare`/`four`/`full` at 182 s / 360 s / 972 s, a median of two purchasable Machine levels after a first run). A layered file also has to declare `max_era: 3` itself when its interventions should survive into APOTHEOSIS: `applyEraCeiling` only raises the generated catalog.

## Saves

`localStorage` key `reality_consumption_engine_browser_save_v2`, gated on `SAVE_VERSION` in `game/rules.ts`. A mismatch silently discards the save. Changing the shape of `GameState` therefore means deciding between a version bump (wipes every player's progress) or a backward-compatible addition. There is no offline progression and no migration path.

## Service worker

`public/sw.js` precaches a **hand-maintained** path list (`APP_ASSETS`) and serves cache-first with no revalidation. Consequences:

- Adding or renaming a module under `public/game/dist/` requires adding it to `APP_ASSETS`. `public/game/tests/presentation.test.mjs` asserts that all eleven `dist/render/*.js` modules are listed.
- Any release requires bumping `CACHE_NAME`, or returning players keep the old files forever.
- Source maps are deliberately **not** precached; `tests/game-release.test.mjs` fails if one reappears in the list.

## Version coupling

The current version (`1.9.0`) appears in `package.json`, `public/game/package.json`, the footer of `public/game/index.html`, `CACHE_NAME` in `public/sw.js`, and the title plus a release-notes heading in both READMEs.

`tests/game-release.test.mjs` reads the version from the root `package.json`, asserts it once explicitly, and derives every other check from it — so a release is two edits (that assertion and `package.json`) and the test then insists on the rest. It fails on a stale `CACHE_NAME`, a stale README title, a missing `## vX.Y.Z` release-notes heading, or a drifted game package version. `CACHE_NAME` is the one that actually delivers a release: the service worker serves cache-first with no revalidation, so without a bump returning players keep the old files forever.

## Conventions

- Game code (`public/game/src`) is deliberately dense — multiple statements per line, minimal whitespace. Match the surrounding file rather than reformatting it.
- Game modules are plain ESM compiled by `tsc` with no bundler, so **relative imports must carry the `.js` extension** (`./engine.js`), even from `.ts` files. `moduleResolution: Node16` in the game's tsconfig enforces this at compile time (`TS2835`).
- Player-facing game copy is English; the Next shell's UI strings are German (`lang="de"`).
- `next.config.ts` pins `turbopack.root` because a stray `package-lock.json` in a parent directory otherwise makes Turbopack infer the wrong workspace root.

## Dependency ceilings

Two dependencies are deliberately held below their latest major, because the toolchain bundled inside `eslint-config-next` cannot handle them. Verify before bumping:

- **TypeScript stays on 6.x.** TS 7 makes lint fail outright with `typescript-eslint does not support TS 7.0`.
- **ESLint stays on 9.x.** ESLint 10 breaks the bundled `eslint-plugin-react` (`contextOrFilename.getFilename is not a function`).
- `@types/node` tracks the Node major actually in use (24.x), not the newest published types.

Everything else is pinned to an exact latest version; `npm audit` reports zero vulnerabilities.

## Design docs

`docs/superpowers/specs/` holds design documents and `docs/superpowers/plans/` the corresponding implementation plans, newest dated `2026-08-20` (continuous entropy cost and harvest signal specification, and the v1.4.0 civilization visualization before it). Read the matching spec before changing balance or progression — the numbers in the tests come from there.
