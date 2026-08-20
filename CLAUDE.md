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
npm test             # compiles public/game/src, then runs both test suites (97 tests)
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

- **`game/engine.ts`** is the single source of truth. `GameEngine` holds all mutable `state`, exposes `onChange(fn)` for subscribers, and delegates every rule to a small pure module: `rules.ts` (harvest/cost math), `progression.ts` (unlocks, Machine Insight), `paths.ts` (path affinity), `pressure.ts` (Entropy/cascade), `tactical-actions.ts`, `intervention-scheduler.ts` (seeded weighted draw with repetition protection), `harvest-quality.ts`, `run-directives.ts`, `decision-feedback.ts`. Keep new rules in such modules — they are what the tests target.
- **`main.ts`** owns the `requestAnimationFrame` loop, ticks the engine only in the `civilization` phase, autosaves every 5 s plus on `beforeunload`/`pagehide`/`visibilitychange`, and binds keys 1/2/3/4 (digit row and numpad) to the four tactical actions — Stabilize, Accelerate, Probe, Vent.
- **`ui/view-model.ts`** turns engine state into presentation data (labels, bands, redaction by Prediction Core level). **`ui/app.ts`** renders it into the static DOM from `index.html` using template strings plus `replaceIfChanged` (innerHTML comparison). All escaping goes through `esc()`.
- **`render/world.ts`** owns the renderer lifecycle and a deterministic Canvas 2D world on two stacked canvases: a cached static layer (sky, terrain, settlements) redrawn only when `structuralWorldKey` changes, and a dynamic layer redrawn every throttled frame. All drawing goes through the `DrawSurface` interface in `render/draw-surface.ts`, which keeps the drawing code free of canvas transform bookkeeping and lets tests record primitives. Visuals must derive from `render/world-model.ts` (`worldSnapshot`, `developmentStage`) and `render/world-presentation.ts` (`worldPresentation`, `structuralWorldKey`). There is no second renderer — tests assert no Phaser naming survives.

### Two invariants the tests enforce

1. **Per-frame work must stay cheap.** Ticking must not write `localStorage` every frame and must not rebuild interactive controls every frame. Notifications are batched.
2. **Structural keys must ignore live values.** `civilizationRenderKey` (ui) and `structuralWorldKey` (render) decide when DOM and cached world layers are rebuilt. They must change on meaningful state bands and interventions, never on continuously ticking numbers — otherwise the game rebuilds itself 60×/s.

### Content data

`data/content.generated.ts` (~4.6k lines: 75 interventions, 10 paths, traits, upgrade catalogs, directives) is machine-generated bulk data — the generator has been removed, so treat the file as a frozen catalog and do not hand-edit it. Layer changes instead:

- `data/intervention-copy.ts` — action labels and consequence texts
- `data/entropy-crises.ts` — extra crisis events appended to the pool
- `game/upgrade-balance.ts` — price/growth overrides

The engine composes these over the generated catalogs in its field initializers.

## Saves

`localStorage` key `reality_consumption_engine_browser_save_v2`, gated on `SAVE_VERSION` in `game/rules.ts`. A mismatch silently discards the save. Changing the shape of `GameState` therefore means deciding between a version bump (wipes every player's progress) or a backward-compatible addition. There is no offline progression and no migration path.

## Service worker

`public/sw.js` precaches a **hand-maintained** path list (`APP_ASSETS`) and serves cache-first with no revalidation. Consequences:

- Adding or renaming a module under `public/game/dist/` requires adding it to `APP_ASSETS`. `public/game/tests/presentation.test.mjs` asserts that all eleven `dist/render/*.js` modules are listed.
- Any release requires bumping `CACHE_NAME`, or returning players keep the old files forever.

## Version coupling

The current version (`1.7.0`) appears in `package.json`, `public/game/package.json`, the footer of `public/game/index.html`, `CACHE_NAME` in `public/sw.js`, and the title plus a release-notes heading in both READMEs.

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
