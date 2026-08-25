# CivMachine — Agent Instructions

Scoped rules live next to the code they govern: `app/`, `public/game/dist/`, `public/game/tests/`,
and `public/game/src/{data,game,render}/` each carry their own `AGENTS.md`.

## The build step you must not forget

`public/game/dist/` is what the browser loads and it is **committed to git**. Editing
`public/game/src/**` changes nothing until `tsc -p public/game/tsconfig.json` runs. `npm test` does
this, so run it before claiming a game change works.

`npm run lint` intentionally excludes `public/game/**`. Don't "simplify" the quoted globs in the
`test` script — Node 24 rejects bare directory arguments.

## Hard constraints

- Game code must not move into the Next build graph. `public/game/` is framework-free and
  self-contained on purpose, so it survives shell rewrites untouched.
- Layering under `public/game/src/` is one-directional: `data/` → `game/` → `ui/` + `render/`.
- **Structural keys must ignore live values.** `civilizationRenderKey` (ui) and `structuralWorldKey`
  (render) decide when DOM and cached world layers rebuild. They may change on state *bands* and
  interventions, never on continuously ticking numbers — otherwise the game rebuilds itself 60×/s.
- **Per-frame work must stay cheap.** Ticking must not write `localStorage` or rebuild interactive
  controls every frame.
- **Explanation is presentation, and presentation is one-directional.** `state.tutorial`, `state.help`,
  `machine.lastRunReport` and `Civilization.trace` exist so the player can see what happened and why.
  No progression, pressure, harvest or scheduler rule may read any of them —
  `docs/superpowers/specs/2026-08-21-onboarding-and-run-report-design.md` has the whole contract.

## Saves

`SAVE_KEY` in `game/engine.ts` writes one `localStorage` entry, versioned by `SAVE_VERSION` in
`game/rules.ts`. A mismatch is **migrated, not discarded** — `game/save-migration.ts` owns that path
and `docs/superpowers/specs/2026-08-20-save-migration-design.md` explains it.

Changing `GameState`'s shape means:

- **adding or removing a field** — nothing else to do. The structural pass rebuilds a stored save
  against `createNewState()` / `createCivilizationTemplate()`, so a new field arrives with its
  default and a removed one is carried along untouched.
- **reinterpreting a field** (rename, rescale, split, merge) — bump `SAVE_VERSION` and append the
  matching step to `SAVE_MIGRATIONS`. The chain must stay contiguous; `save-migration.test.mjs` fails
  the build otherwise.

`createCivilizationTemplate` in `game/rules.ts` is the one place a run's field defaults are declared —
the engine builds a new run on top of it and the migrator rebuilds a stored one against it, so a
field added in only one of the two cannot happen.

Still no offline progression: the save records what was played, nothing more.

## Releases

`public/sw.js` precaches a hand-maintained `APP_ASSETS` list and serves cache-first with no
revalidation. So a new `dist/` module has to be added there, and `CACHE_NAME` has to be bumped or
returning players keep the old files forever. Source maps are deliberately not precached.

A release is three edits — the version in `package.json`, the version in `public/game/package.json`
(`npm version` writes each package and its lockfile separately), and the single explicit assertion in
`tests/game-release.test.mjs` — after which that test insists on every other surface itself.

## Conventions

- Game code (`public/game/src`) is deliberately dense: multiple statements per line, minimal
  whitespace. Match the surrounding file rather than reformatting it.
- Relative imports in game modules need the `.js` extension (`./engine.js`), even from `.ts` files.
- Player-facing game copy is localized through the game localization catalog; English is the default/source locale and German is the second supported locale. The Next shell's UI strings are German.
- **TypeScript stays on 6.x** (TS 7 makes lint fail outright) and **ESLint stays on 9.x** (ESLint 10
  breaks the bundled `eslint-plugin-react`). `@types/node` tracks the Node major in use, not latest.
- Read the matching document in `docs/superpowers/specs/` before changing balance or progression —
  the numbers the tests pin come from there.
- Player-facing explanation lives in `data/help-topics.ts` and `game/tutorial.ts`, and both are pinned
  by `public/game/tests/onboarding.test.mjs` against the surfaces they describe: a new world-strip
  column, a new `EXPLAIN_NOTES` entry or a tutorial step with no anchor fails the build rather than
  shipping unexplained.
