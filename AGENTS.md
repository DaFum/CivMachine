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

## Saves

`SAVE_KEY` in `game/engine.ts` writes one `localStorage` entry, gated on `SAVE_VERSION` in
`game/rules.ts`. A mismatch **silently discards the save**. Changing `GameState`'s shape therefore
means choosing between a version bump, which wipes every player's progress, and a
backward-compatible optional field. There is no migration path and no offline progression.

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
- Player-facing game copy is English; the Next shell's UI strings are German.
- **TypeScript stays on 6.x** (TS 7 makes lint fail outright) and **ESLint stays on 9.x** (ESLint 10
  breaks the bundled `eslint-plugin-react`). `@types/node` tracks the Node major in use, not latest.
- Read the matching document in `docs/superpowers/specs/` before changing balance or progression —
  the numbers the tests pin come from there.
