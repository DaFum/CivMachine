# Victory and Milestones — Design (v1.6.0)

Date: 2026-08-19
Status: approved for planning

## Problem

The game has no win condition. `GameState` carries no completion flag, and the highest
layer — six Axiom upgrades — is followed by an unbounded repetition of the same prestige
loop. Four nested progress loops exist (run → universe → multiverse → axioms), but only
their near-term counters are communicated.

Two concrete gaps drive this design:

1. **Machine Insight is an invisible objective function.** It gates every unlock, yet the
   eleven milestones that award it live only in `progression.ts` and are never shown. A
   player cannot plan toward them.
2. **Guidance collapses after the first multiverse.** `nextSystemPreviews` filters out
   unlocked systems, so once all six are unlocked the "Next Discoveries" card disappears
   and nothing replaces it.

## Goals

- One explicit, playable victory: **the Great Convergence**.
- A visible milestone register that makes Machine Insight plannable.
- A repeatable endgame so the objective horizon never empties again.
- First victory reachable in roughly 8–12 hours of active play.

## Non-goals

- No new intervention content. `data/content.generated.ts` stays frozen.
- No second renderer, no offline progression, no save migration path.
- No rebalancing of the v1.5.0 pressure or depth curves.

## The Great Convergence

### Stage 1 — Meta gate

A button `INITIATE GREAT CONVERGENCE` appears in the machine view when all four
conditions hold. `n` is the number of convergences already achieved.

| Condition | First convergence | Repeat scaling |
| --- | --- | --- |
| Milestones completed | 21 of 28 | `min(28, 21 + 3n)` |
| Multiverses collapsed | 2 | `2 + 2n` |
| Axiom upgrades | all six at level ≥ 1 | level ≥ `min(max_level, 1 + n)` |
| Best harvest recorded | Ascendant or better | unchanged |

The gate counts **milestones**, not a Machine Insight threshold. Insight is a reward
currency whose total shifts whenever the catalog grows; a fixed Insight number would be
mis-calibrated by the very milestones this design adds. `axiom_impossible_birth` has
`max_level: 1`, so the axiom condition is clamped per upgrade rather than globally.

### Stage 2 — The terminal run

Started only through the convergence button, only from the `machine` phase. It differs
from every normal run:

- starts in **APOTHEOSIS**: era 3, `years = 14000`, `development = 340`
- entropy rate multiplied by **1.6**; all machine, universe and axiom bonuses apply normally
- pays **no** Cultivation Credits and **no** resources on harvest — it is a test, not a farm
- still counts toward `civilizationsTotal`, milestone evaluation and the statistics fields
  (`bestDepth`, `bestGrade`, `maxDevelopment`, `longestRunSeconds`, `maxEndgamesInRun`,
  `seenDominantPaths`) — a terminal run can therefore complete ordinary milestones

The run is marked by `Civilization.terminal = true`. Era 3 is set directly, bypassing the
`Math.min(2, startingEra)` clamp in `startCivilization`.

### Stage 3 — Victory or failure

**Victory** is a *controlled* harvest at Cultivation Depth ≥ **14** (scaling: `14 + 4n`).
The run starts at depth 4.25 (`340/80 + 0` endgames) and needs roughly development 640
plus three to four path endgame states to clear the bar.

**Failure** is a cascade (stability reaching 0, forcing a chaotic harvest) or a voluntary
harvest below the target depth. On failure the game posts `CONVERGENCE FAILED`, keeps the
unlock, and allows an immediate retry. No progress is lost.

On victory the game enters a new `victory` phase showing seed, years, era, achieved depth,
dominant paths, endgame states and the convergence count, with a `CONTINUE` button that
returns to the machine view. Per convergence, permanently and stackably:

- `allHarvestMult × (1 + 0.25n)`
- `containmentRating + 2n`

The save continues; the next convergence is immediately visible as the new objective.

## The milestone register

A catalog of 28 milestones in `game/milestones.ts`. Each entry carries `id`, `title`,
`description`, `group`, a pure predicate over a state snapshot, a `current/target`
progress pair and an Insight reward.

The **eleven existing hidden milestones migrate unchanged**, keeping their IDs and their
award amounts, so the v1.5.0 progression curve is preserved exactly. They become visible;
nothing about them changes.

Groups and contents (existing IDs in brackets; everything else is new):

- **CULTIVATION**, 10 — development 70 / 180 / 340 [`development_70`, `development_180`,
  `development_340`], development 600 / 1000, era 1 / 2 / 3 [`era_expansion`,
  `era_transcendence`, `era_apotheosis`], awareness 50 [`awareness_50`], survive 900 s in
  one run
- **HARVEST**, 7 — first controlled harvest [`controlled_harvest_1`], two controlled
  harvests [`controlled_harvest_2`], first Transcendent, first Ascendant and first
  Singular harvest, ten controlled harvests, five completed directive objectives
- **PATHS**, 4 — 3 / 6 / 10 distinct paths seen as dominant, 4 endgame states in one run
- **PRESTIGE**, 5 — first universe [`first_universe`], first multiverse
  [`first_multiverse`], second multiverse, all four resources discovered, all six axioms
  at level 1
- **CONVERGENCE**, 2 — convergence gate reached, first victory

That is 28 entries: the 11 migrated plus 17 new. Grade ordering for the "best harvest"
comparisons is the existing `DEPTH_BANDS` order: premature < established < transcendent <
ascendant < singular.

**Balance rule for the seventeen new entries:** early-reachable milestones award 0–1
Insight; the large awards (+3, +4) sit behind Apotheosis, a Singular harvest and the
second multiverse. Otherwise the existing unlock thresholds (directives at 3, axioms at
18–23) would move forward and the v1.5.0 curve would break. Early-game Insight totals stay
unchanged.

The evaluator examines only *open* milestones, reads a pre-built numeric snapshot, and
allocates nothing in the common case where nothing completes. It therefore runs inside
`tick` without violating the per-frame cost invariant.

## Architecture

Two new pure modules, inside the existing `data/ → game/ → ui/ + render/` layering:

```text
game/milestones.ts    MILESTONE_CATALOG (declarative)
                      evaluateMilestones(state) -> { newlyCompleted[], insightAwarded }
                      milestoneProgress(state)  -> display data

game/convergence.ts   convergenceRequirements(state) -> four conditions with is/target
                      convergenceUnlocked(state)
                      terminalCivilizationSetup(bonuses) -> starting values
                      evaluateConvergence(civ, depth, chaotic) -> 'won' | 'failed'
                      convergenceBonuses(convergences) -> { allHarvestMult, containment }
```

`progression.ts` keeps the Insight bookkeeping and the unlock rules and delegates
milestone evaluation to `milestones.ts`. The engine calls them at the points where it
already calls `Progression.record*` — `tick`, `harvest`, `consumeUniverse`,
`consumeMultiverse` — and additionally refreshes the convergence gate wherever a gate
input can change: after a harvest records a new best grade, after an Axiom purchase, and
on entry to `startConvergenceRun`. Otherwise the `convergence_gate` milestone and its
Insight would be withheld until the next prestige. Two new engine methods are added:
`startConvergenceRun()` and `acknowledgeVictory()`.

## State changes

```text
Phase                 + 'victory'
Civilization          + terminal: boolean
ProgressionState      + seenDominantPaths: string[]
                      + bestDepth: number
                      + bestGrade: HarvestGrade | ''
                      + maxDevelopment: number
                      + maxEra: number
                      + objectivesCompleted: number
                      + longestRunSeconds: number
                      + maxEndgamesInRun: number
GameState.meta        + convergences: number
                      + victories: VictoryRecord[]   (most recent 5)
```

The statistics fields exist because several milestones need best-ever values across the
save, which cannot be reconstructed from current state — and because without them a
milestone's progress bar would read zero whenever no civilization is running. They are
written in `harvest` and in the path-choice handler, never per frame.

`SAVE_VERSION` goes to **4**. Every existing save is discarded on load and all players
start over. This is a deliberate, approved trade: no migration code, clean shape. It is
documented in both READMEs so it does not read as a bug.

`main.ts` still ticks only in the `civilization` phase, so `victory` is a static screen
with no change to the frame loop.

## UI

Two new cards in the machine view, built with the existing `card()` helper:

- **`MILESTONE REGISTER`** — grouped, open entries first with a progress bar and
  `MACHINE INSIGHT +n`, completed entries collapsed to one line. This is the answer to
  "Insight is unplannable".
- **`GREAT CONVERGENCE`** — directly above the prestige row; the four conditions with
  is/target and check marks, and the start button carrying its blocking reason when
  disabled. The card appears only after the first multiverse collapse.

The meta bar gains `Milestones 12/28` and, from the first victory onward, `Convergences n`.

During a terminal run the civilization view shows a banner
`TERMINAL CULTIVATION // TARGET DEPTH 14.0 — CURRENT 8.3`, and the harvest button replaces
its credit readout with `CONVERGENCE READY` or `INSUFFICIENT DEPTH`. The victory screen is
a separate render path in `app.ts`.

Structural keys: `civilizationRenderKey` gains `terminal` and a boolean
`convergenceReady`, each of which flips at most once per run. Live depth is **not** in the
key; it updates through `data-live` like entropy and stability. `structuralWorldKey` gains
only `terminal`, giving the terminal run its own cached scenery layer. All output goes
through `esc()`. Player-facing copy is English.

## Testing

`public/game/tests/core.test.mjs`:

- every milestone triggers individually; no double award; catalog Insight total is asserted
- the eleven migrated milestones award exactly their previous amounts (regression guard
  for the v1.5.0 curve)
- the convergence gate: each of the four conditions blocks on its own
- the terminal run starts in era 3, pays neither credits nor resources, has entropy ×1.6
- a controlled harvest at or above target depth wins; below target and chaotic do not
- failure preserves the unlock
- bonus and requirement scaling across three convergences

`public/game/tests/presentation.test.mjs`:

- both new cards and the victory screen render
- `civilizationRenderKey` is stable under pure depth change and flips on `convergenceReady`
- the new `dist/` modules are listed in `APP_ASSETS`

Performance invariant: a tick with the full catalog writes no `localStorage` and rebuilds
no interactive controls.

## Release obligations

- run `tsc -p public/game/tsconfig.json`; `dist/` is committed and is what the browser loads
- add the new `dist/` modules to `APP_ASSETS` in `public/sw.js`
- bump `CACHE_NAME` in `public/sw.js`
- bump version **1.6.0** in `package.json`, `public/game/package.json`, the footer of
  `public/game/index.html`, and both READMEs
- note the save-version 4 wipe in both READMEs

## Risks

- **Depth 14 may be too strict or too loose.** It is a single constant in
  `convergence.ts`; the balance harness (`public/game/tests/balance-harness.mjs`) can
  measure achieved depth across seeds before the number is fixed.
- **Seventeen new Insight sources shift the mid-game curve.** Mitigated by the balance rule
  above and by the regression test on the migrated eleven.
- **The save wipe is user-visible.** Accepted; documented rather than mitigated.
