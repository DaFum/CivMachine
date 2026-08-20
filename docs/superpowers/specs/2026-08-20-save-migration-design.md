# Save Migration Design

**Status:** Approved for implementation on 2026-08-20
**Release target:** Reality Consumption Engine Browser v1.11.0
**Scope:** `game/save-migration.ts` (new), `game/rules.ts`, `game/engine.ts`, `public/sw.js`
**Save policy:** No `SAVE_VERSION` bump. This *is* the bump policy: from here on a bump migrates
rather than wipes.
**Product language:** English (player-facing game copy), per existing convention

## Problem

`GameEngine.load()` compared the stored `saveVersion` against `SAVE_VERSION` and returned `null` on
any mismatch. The engine then started a new game and the first autosave — five seconds into the next
civilization, or the next click in the Machine — overwrote the old payload. The consequences:

- **A version bump erased every player's progress.** Machine Insight, unlocks, milestones, Universe
  and Axiom levels, victories: all of it, silently, with no message and no way back.
- **The bump therefore could not be used.** Any additive change to `GameState` had to be modelled as
  an optional field instead (`Civilization.injectedYears`, `Civilization.visualMemory`), each one
  carrying a comment explaining that it exists in that shape only to avoid the wipe. The workaround
  is sound for additions and cannot express a rename, a rescale or a split.
- **A damaged save was indistinguishable from no save.** A truncated write, a single non-finite
  number, a `localStorage` entry mangled by another tool — all landed in the same `catch` and became
  a new game.
- **A save written by a newer build was destroyed by an older one.** The service worker serves
  cache-first, so a player whose cache has not yet updated runs the old build against the new save.

## Design

Loading becomes two passes over the stored payload.

**Pass 1 — the version chain.** `SAVE_MIGRATIONS` holds one declared step per version boundary,
contiguous from the oldest supported save up to `SAVE_VERSION`. `migrateSaveState` walks the steps
from the payload's declared version upward. A step owns exactly one boundary and is responsible only
for fields whose *meaning* changed there: a rename, a rescale, a split, a merge. v1–v3 predate this
repository's history, so their steps are declarations that keep the chain walkable; nothing about
those shapes can be reconstructed to reinterpret.

**Pass 2 — the structural pass.** The result is rebuilt field by field against a live
`createNewState()` and, for a run, `createCivilizationTemplate()`. The template's own shape decides
the expected type of each field, so:

| Payload | Result |
| --- | --- |
| field missing (added since the save) | current default, logged as a repair |
| field present, right type | kept verbatim |
| field present, wrong type or non-finite | current default, logged as a repair |
| typed-array item of the wrong type | dropped, not defaulted — an invented id reads as owned content |
| field not in the template (removed, or from a newer build) | carried along if JSON-safe |
| `__proto__`, `constructor`, `prototype` | dropped |

Pass 2 is what makes a bump cheap: a purely additive `GameState` change needs **no step at all**,
because a missing field is already back-filled. This is the same guarantee the optional-field
workaround provided, generalised to every field and to removals.

**The run is separable from the Machine.** A `Civilization` is only restored when it can still be
simulated, which means it must carry the `seed` its entire event stream derives from. A run that
cannot be restored is dropped alone — `civilization: null`, `phase: 'machine'` — and the Machine
progress behind it survives. Losing one civilization beats losing every unlock that produced it.
`era` is raised to `eraForYears(years)` when the two disagree, because the era-gated intervention
pool and the harvest formula must not read different runs.

**Nothing is overwritten before it is preserved.** Whenever the loader changed anything, the original
bytes are copied verbatim to `SAVE_BACKUP_KEY` before the migrated state is written back.
`engine.restoreBackup()` puts them back; `engine.deleteSave()` removes them, because an explicit
erase must erase. The migrated shape is written back immediately, so the next load is an ordinary
current-version load rather than a repeat of the migration.

**Statuses and what the player is told.** `current` (loaded verbatim, no message, no backup, no
write), `repaired`, `migrated`, `ahead`, `unreadable`, `empty`. Every status but `current` and `empty`
posts one line to the Machine record, so a migration is visible rather than silent. A save from a
newer build is loaded in compatibility mode with its unknown fields intact rather than refused: the
alternative is a wipe, which is the failure this design exists to remove.

A `localStorage` write that is rejected — quota, private-mode storage — no longer propagates out of
`save()` into the frame loop. It reports itself once and the session continues in memory.

## Non-goals

- **No offline progression.** The save still records only what was played.
- **No downgrade guarantee.** A newer build's fields survive a round trip through an older one, but
  a field the older build actively reinterprets is reinterpreted.
- **No second storage backend.** One `localStorage` entry plus one backup entry.

## What a future `SAVE_VERSION` bump costs

1. Bump `SAVE_VERSION` in `game/rules.ts`.
2. Append the matching step to `SAVE_MIGRATIONS` — a no-op step when the change is purely additive,
   otherwise the field reinterpretation for that one boundary.
3. Update the `v4 save` string in `public/game/index.html` and the assertion in
   `tests/game-release.test.mjs`.

`save-migration.test.mjs` fails the build if the chain has a gap, so step 2 cannot be forgotten.

## Tests

`public/game/tests/save-migration.test.mjs` pins: chain contiguity; a current save loading
byte-for-byte with no backup and no write; a v3, a v1 and an unversioned save keeping every progress
field; back-filled additions; carried-along removals; repaired non-finite and mistyped values; the
dropped-run case; the era correction; a newer-version save keeping its unknown fields; unreadable and
empty payloads; prototype pollution; the engine-level backup, restore and erase behaviour; a rejected
write reporting once; and an in-progress run still ticking after a migrating load.
