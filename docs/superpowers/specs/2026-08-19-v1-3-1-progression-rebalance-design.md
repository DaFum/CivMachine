# v1.3.1 Progression Rebalance Design

**Status:** Approved for implementation on 2026-08-19
**Release target:** Reality Consumption Engine Browser v1.3.1
**Balance profile:** Option A — balanced
**Product language:** English
**Save policy:** Preserve the existing v2 save; no migration or reset

## Problem

The v1.3.0 tactical loop is active, but its economy makes the strongest shortcut self-sustaining. `Accelerate` costs one Control and every resolved intervention restores at least one Control, so a player can accelerate after every decision without creating an opportunity cost. At the same time, the v1.3.0 machine-upgrade overrides are inexpensive enough that one Established run can buy several levels across multiple currencies. A forced chaotic collapse retains 55% of normal resources, multiplies Paradox by 1.85, keeps the same Cultivation Credits as a Controlled Harvest, and grants a Mutation. That combination can make failure more efficient than deliberate cultivation.

The reported run demonstrates the issue precisely: 149 Causal Mass, 152 Cognition, and 238 Paradox paid for two Reality Lattice levels, two Prediction Core levels, and two Paradox Sieve levels, leaving 10/2/58. All six purchases were legal under the v1.3.0 costs; this was not a duplicate-purchase display defect.

## Baseline evidence

Deterministic sweeps across 80 seeds produced the following v1.3.0 baseline:

| Policy | Median elapsed time | Median affordable machine levels | Accelerate success |
| --- | ---: | ---: | ---: |
| Earliest Established, no Accelerate | 100 s | 3 | — |
| Earliest Established, Accelerate after every intervention | 36 s | 3 | 622 / 622 attempts |
| No-upgrade collapse, no Accelerate | 205.5 s | 6 | — |
| No-upgrade collapse, Accelerate after every intervention | 63.75 s | 5 | 1,179 / 1,179 attempts |

The mechanical cause is deterministic: a one-Control action followed by a one-Control recharge has zero long-term Control cost.

## Goals

- Make `Accelerate` a tactical commitment, not a mandatory free click.
- Preserve the faster, interactive v1.3.0 Civilization cadence.
- Let a normal first qualified run buy one or two meaningful machine levels, with no more than three at the 90th percentile across the deterministic seed suite.
- Keep every qualified run economically useful while restoring several-run incremental progression.
- Make Controlled Harvest the default progression route and chaotic collapse a salvage/Mutation route.
- Put a normal Universe cycle in the six-to-nine successful-run range.
- Preserve exact decision feedback, deterministic simulation, dirty rendering, mobile usability, English copy, and the current v2 save contract.

## Non-goals

- No save migration, storage-key change, reset, or schema change.
- No change to the 18-Cultivation-Credit Universe requirement.
- No new tactical action, cooldown state, timer, event content, layout redesign, or renderer rewrite.
- No reduction of the existing intervention cadence or Entropy pressure.
- No removal of the chaotic Mutation reward.

## Tactical action economy

`Accelerate` costs **2 Control** in v1.3.1. Its effects remain unchanged:

- +200 years at Temporal Injector level 0
- intervention timer advanced by 8 seconds at level 0
- development advanced by the existing formula
- −4 Stability
- +7 Entropy

The Civilization still starts at 3 Control and a normal intervention still restores 1. Therefore:

1. the first Accelerate leaves 1 Control;
2. the next resolved intervention restores Control to 2;
3. a second Accelerate leaves 0;
4. the following resolved intervention restores only 1, so Accelerate is unavailable;
5. one additional intervention is required before the next use.

This creates a recurring two-intervention opportunity cost without introducing a separate cooldown. Universe upgrade `Bureaucracy of Gods` deliberately relaxes that constraint later by improving Control recharge. The tactical rail, shortcut, exact feedback, and disabled reason already derive from the action definition and therefore display `COST 2` and `Requires 2 Control.` without parallel UI state.

## Machine-upgrade curve

v1.3.1 replaces the v1.3.0 overrides with this exact catalog:

| Upgrade | Currency | Base cost | Growth | Insight gate |
| --- | --- | ---: | ---: | ---: |
| Reality Lattice | Causal Mass | 90 | 1.62 | 0 |
| Prediction Core | Cognition | 90 | 1.60 | 1 + Cognition discovered |
| Historical Compressor | Causal Mass | 120 | 1.68 | 0 |
| Cognitive Extractor | Cognition | 120 | 1.68 | 4 + Cognition discovered |
| Paradox Sieve | Paradox | 110 | 1.68 | 5 + Paradox discovered |
| Cultivation Accelerator | Existence | 120 | 1.68 | 9 + Existence discovered |
| Existence Furnace | Existence | 130 | 1.70 | 10 + Existence discovered |
| Awareness Scrubber | Cognition | 150 | 1.68 | 4 + Cognition discovered |
| Sanity Compliance Protocol | Cognition | 165 | 1.70 | 5 + Cognition discovered |
| Cosmic Muffling | Paradox | 150 | 1.70 | 6 + Paradox discovered |
| Contingency Vat | Paradox | 210 | 1.75 | 8 + Paradox discovered |
| Temporal Injector | Causal Mass | 220 | 1.75 | 0 |

All benefit formulas, maximum levels, currencies, and descriptions remain unchanged. The balance is achieved through price, growth, and two targeted early unlock gates rather than by weakening upgrades after purchase.

The first-run constraint works across currencies, not only in aggregate. A representative Established sweep produces roughly 149 Causal Mass and 113 Cognition at the median. That can buy one Causal upgrade and one Cognition upgrade, but the increased second-level prices and delayed Cognitive Extractor/Paradox Sieve prevent the six-level opening observed in v1.3.0.

## Chaotic harvest curve

Chaotic harvest remains a valid emergency and Mutation strategy, with three changes:

1. non-Paradox retention starts at **40%** instead of 55%;
2. the Paradox multiplier is **1.50** instead of 1.85;
3. a qualified Chaotic Harvest awards exactly **one fewer Cultivation Credit** than an otherwise identical Controlled Harvest.

The Contingency Vat and Compassionate Accounting bonuses continue to increase non-Paradox retention from the new 40% base. The existing 95% cap remains. Paradox remains the characteristic chaotic reward, but its lower multiplier plus delayed Paradox Sieve gate prevents a single collapse from funding a deep Paradox build.

### Cultivation Credit formula

Harvest grade is evaluated independently of harvest mode. Credits are then calculated in one pure function:

`max(0, gradeCredits + objectiveBonus - chaoticPenalty)`

where:

- `objectiveBonus = 1` only for a completed objective on a qualified harvest;
- `chaoticPenalty = 1` for a Chaotic Harvest and `0` for Controlled;
- Premature always returns 0, even if a Directive predicate happens to be true.

This yields:

| Grade | Controlled | Chaotic | Controlled + objective | Chaotic + objective |
| --- | ---: | ---: | ---: | ---: |
| Premature | 0 | 0 | 0 | 0 |
| Established | 2 | 1 | 3 | 2 |
| Transcendent | 3 | 2 | 4 | 3 |
| Ascendant | 4 | 3 | 5 | 4 |

At the unchanged 18-credit threshold, ordinary Controlled Established runs require nine successes, Controlled Transcendent runs require six, and objective completion or mixed grades moves a normal cycle within the approved six-to-nine range. Chaotic Established farming requires eighteen runs without objectives and therefore cannot be the fastest default route.

## Architecture

Simulation remains independent of presentation.

- `game/tactical-actions.ts` owns the authoritative Accelerate cost.
- `game/upgrade-balance.ts` owns the exact machine cost/growth overrides.
- `game/progression.ts` owns the Cognitive Extractor and Paradox Sieve Insight gates.
- `game/harvest-quality.ts` owns grade evaluation and the new authoritative Cultivation Credit calculation.
- `game/rules.ts` owns chaotic resource retention/multipliers.
- `GameEngine.runtimeBonuses()` supplies the new 40% retention base.
- `GameEngine.previewHarvestDetails()` uses the same credit helper that the committed harvest record uses, keeping preview, log, HUD, bank, and persistence identical.

No renderer or save objects gain balance-only state. This preserves dirty updates and avoids migration work.

## Failure handling and invariants

- Failed tactical actions do not spend Control or alter simulation state.
- `Accelerate` is unavailable below 2 Control and its reason names the exact requirement.
- Controlled and chaotic previews must match the eventual harvest record exactly.
- Premature harvests grant zero Credits in every Directive state.
- Chaotic qualified Credits are exactly one below the equivalent Controlled value, never below zero.
- Current v2 saves load with the new rules; no state field is added or rewritten.
- Universe and Axiom upgrade growth curves remain unchanged.
- Existing crisis queueing after discrete Entropy jumps remains covered to prevent skipped thresholds.

## Verification strategy

### Focused rule tests

- Assert the authoritative Accelerate cost is 2.
- Resolve a deterministic sequence and prove Accelerate cannot be used after every intervention with base recharge.
- Assert the exact 12 machine base costs/growth factors and the two revised Insight gates.
- Assert the full Controlled/Chaotic Credit matrix, including objective and Premature cases.
- Assert 40% base chaotic retention and the 1.50 Paradox multiplier against a fixed Civilization state.

### Deterministic balance tests

Use a fixed 80-seed suite and a declared safety-choice policy.

- Earliest Controlled Established harvest: median affordable machine levels 1–2; p90 no greater than 3.
- Accelerate-at-every-opportunity policy: at least one post-intervention attempt is rejected because Control is below 2; successful uses remain fewer than resolved interventions.
- Forced chaotic-collapse policy: median affordable machine levels no greater than 2; p90 no greater than 3.
- Credit math proves six Transcendent or nine Established Controlled runs reach 18 Credits, while six Established runs do not.

Purchase-capacity tests simulate legal progression gates and choose the maximum count of affordable levels across independent currency pools. They do not assume a specific UI purchase order.

### Release verification

- TypeScript compile and all Node tests pass.
- Production build succeeds.
- Browser playtest verifies English `COST 2`, exact disabled feedback, Control recovery, harvest previews, responsive layout, and no console errors.
- Release metadata, footer, service-worker cache, README, deployed checkpoint, and ZIP all identify v1.3.1.

## Acceptance criteria

- Base `Accelerate` costs 2 Control and is not self-funding per intervention.
- A deterministic 80-seed first-run sweep meets the 1–2 median / ≤3 p90 purchase envelope.
- Chaotic resource multipliers and Credit penalty match the exact table above.
- The common Universe route requires six-to-nine qualified Controlled runs.
- Existing v2 saves remain loadable with no migration or reset.
- Game text remains English.
- All exact-feedback, Entropy-crisis, deterministic-scheduler, dirty-rendering, responsive, release, and offline tests pass.
- The deployed Site and downloadable source ZIP are built from the same committed v1.3.1 revision.
