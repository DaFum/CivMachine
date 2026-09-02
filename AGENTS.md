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
  The active locale *is* such a band: it is in `civilizationRenderKey` because every label in the
  panel column is read from the catalog, and it is deliberately not in `structuralWorldKey` because
  the canvases draw no text.
- **Per-frame work must stay cheap.** Ticking must not write `localStorage` or rebuild interactive
  controls every frame.
- **Explanation is presentation, and presentation is one-directional.** `state.tutorial`, `state.help`,
  `machine.lastRunReport` and `Civilization.trace` exist so the player can see what happened and why.
  No progression, pressure, harvest or scheduler rule may read any of them —
  `docs/superpowers/specs/2026-08-21-onboarding-and-run-report-design.md` has the whole contract.

## Saves

`SAVE_KEY` in `game/engine.ts` writes the save as one `localStorage` entry, versioned by
`SAVE_VERSION` in `game/rules.ts`. The only other entry the game writes is `LOCALE_KEY` beside it —
the chosen language is a device preference, not run state, so it survives `deleteSave()` and is read
*before* the save is parsed, or a migration notice would come out in the wrong language. A mismatch is **migrated, not discarded** — `game/save-migration.ts` owns that path
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

## Localization

`data/localization.ts` is the catalog — pure data, one entry per locale, keyed by the stable IDs the
runtime already uses. `data/i18n.ts` beside it is the only mutable thing about it, and three rules
keep a locale switch honest:

- **Read through `text()` at the point of use.** No module may capture a catalog string in a
  module-level constant: a constant is filled once, at import time, and would keep the language the
  page booted in. A constant that holds an *id* (`ERA_NAMES`, `TACTICAL_ACTIONS`, `MILESTONE_CATALOG`)
  stays a constant — it is the English source and the fallback, and the copy is read beside it.
- **Ids are structure, copy is copy.** Effects, costs, anchors, gating facts, CSS hooks and render-key
  bands are rules and are never translated. A localized lookup that misses falls back to the English
  the source already carries; localization must never delete copy.
- **Canonical names stay English in every locale** — events, interventions, upgrades, directives,
  paths, traits, mutations and the generated lore word lists. `tests/localization.test.mjs` fails the
  build if a German entry renames one, because a seed-generated civilization must not have two names.

Player-facing strings the engine composes are localized *at write time*, so `machine.lastRunReport`
and a run's `history` keep the language they were written in. That is deliberate: the record says what
was said at the time. Only live surfaces re-read the catalog.

`index.html` carries the English shell as its first paint; `main.ts` rewrites every `ui.shell` string
from the catalog on boot and on each switch, and the localization test fails if the two drift.

## Conventions

- Game code (`public/game/src`) is deliberately dense: multiple statements per line, minimal
  whitespace. Match the surrounding file rather than reformatting it.
- Relative imports in game modules need the `.js` extension (`./engine.js`), even from `.ts` files.
- Player-facing game copy is localized through the game localization catalog; English is the
  default/source locale and German is the second supported locale. The Next shell's UI strings are
  German.
- **TypeScript stays on 6.x** (TS 7 makes lint fail outright) and **ESLint stays on 9.x** (ESLint 10
  breaks the bundled `eslint-plugin-react`). `@types/node` tracks the Node major in use, not latest.
- Read the matching document in `docs/superpowers/specs/` before changing balance or progression —
  the numbers the tests pin come from there. Balance above the single run lives in
  `public/game/tests/campaign-harness.mjs`; measure a change with `npm run balance` before arguing
  about it, and expect `campaign.test.mjs` to fail if the curve leaves its band.
- Player-facing explanation lives in `data/help-topics.ts` and `game/tutorial.ts`, and both are pinned
  by `public/game/tests/onboarding.test.mjs` against the surfaces they describe: a new world-strip
  column, a new `EXPLAIN_NOTES` entry or a tutorial step with no anchor fails the build rather than
  shipping unexplained.
