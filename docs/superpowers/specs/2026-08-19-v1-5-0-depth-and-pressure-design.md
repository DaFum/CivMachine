# v1.5.0 Cultivation Depth and Continuous Pressure Design

**Status:** Approved for implementation on 2026-08-19
**Release target:** Reality Consumption Engine Browser v1.5.0
**Product language:** English
**Save policy:** New v3 save; no migration from v2 saves

## Problem

The v1.3.1 economy is internally consistent but produces a flat game. Headless simulation of the committed engine shows three structural defects.

**Survival is a switch, not a curve.** The only real cause of death is Entropy reaching 100, which triggers `cascadeDecay` at 7 Stability per second. Ordinary Stability decay is irrelevant: 100 Stability survives 5,556 seconds in Emergence and 2,646 seconds in Transcendence. Entropy resistance comes from `containmentRating`, which counts *installed modules* rather than levels, so it has exactly five states. A run with no upgrades cascades at 205 seconds; `reality_lattice` level 1, costing 90 Causal Mass, is enough to reach Transcendence and harvest at 260 seconds with roughly ten times the yield. The first, doomed run already produces 131 Causal Mass. One purchase therefore resolves the entire survival problem permanently, and levels 2 through 8 of the same module contribute nothing to survival.

**Run duration is a constant.** Harvest grade is capped at `transcendent`, reached with Era 2 at 6,500 years, which arrives at 260 seconds at 1x speed. No build has any reason to stay longer, so every run after the second lasts exactly 260 seconds regardless of investment. The v1.3.0 target of five to eight minutes for a developed build is unreachable by construction.

**The incremental loop never accelerates.** Cultivation Credits are capped at 3 per Controlled Transcendent run and 4 for a path endgame, against an unchanged requirement of 18, so a Universe always takes five to six runs. Simulation across four Universes: 6 runs and 25.1 minutes, 6 runs and 25.4 minutes, 6 runs and 25.4 minutes, 6 runs and 16.0 minutes. `universeResidueAward` returns 4 or 5 residue per Universe because its `civilizations^1.15 / 2.6` term is pinned by the credit cap; the `stable_constants` ladder alone costs 124 residue and the full Universe catalog roughly 900, which is about 180 Universes. Machine upgrades cost `1.62^n` to `1.75^n` while their benefit is additive at 12% per level, and every Universe wipes them, so Universe 2 replays Universe 1 verbatim, including a guaranteed throwaway first run.

Two smaller defects compound this. Paradox is produced by low Stability, high Attention and low Sanity, so the credit-optimal Controlled Transcendent run yields about 50 Paradox against 600 of every other resource; the campaign simulation held 4 to 8 Paradox throughout, making `paradox_sieve`, `cosmic_muffling` and `contingency_vat` unbuyable. And Control Capacity is not a resource: the cap is 3, every resolved intervention restores 1, and a run resolves 21 interventions, so the surplus is discarded and the budget never binds.

## Baseline evidence

Measured against the committed v1.4.0 engine with a fixed safety-choice policy, seed `0x52434531`, 1x speed.

| Build | Containment modules | Outcome | Elapsed | Grade | Credits |
| --- | ---: | --- | ---: | --- | ---: |
| No upgrades | 0 | Cascade in Era 1 | 205.7 s | established | 1 |
| `reality_lattice` 1 | 1 | Harvest in Era 2 | 260.0 s | transcendent | 3 |
| Four containment modules | 4 | Harvest in Era 2 | 322.3 s | transcendent | 3 |

Entropy seconds to cascade if held in a single era, current formula:

| Containment | Emergence | Expansion | Transcendence |
| ---: | ---: | ---: | ---: |
| 0 | 313 | 123 | 58 |
| 1 | 422 | 208 | 91 |
| 4 | 750 | 500 | 333 |

Interventions per run: 21, one decision every 12.4 seconds. Era 2 admits 73 eligible interventions and 1,093 total draws, so content is not the constraint on longer runs.

## Goals

- Replace binary survival with a continuous containment curve in which every level is measurable.
- Put a no-upgrade run at roughly 2.5 to 3 minutes and a fully developed run at roughly 15 minutes at 1x speed.
- Make the decision to stay or harvest the central roguelite choice, with real loss on failure.
- Let Cultivation Credits scale with run depth so Universe cadence accelerates with investment.
- Give Paradox a source inside the credit-optimal playstyle.
- Fill the interval between interventions with cost-bearing decisions, without requiring reflexes.
- Connect the two layers: banked resources become a tactical reserve during a run.
- Preserve deterministic simulation, exact decision feedback, dirty rendering, per-frame cheapness, mobile usability, reduced-motion support and English game copy.

## Non-goals

- No fourth era. Every intervention declares `max_era` 2 or lower, so Era 3 would collapse the pool to the fallback event.
- No edit to `data/content.generated.ts`. All catalog changes are layered through `game/upgrade-balance.ts`.
- No save migration and no offline progression.
- No reflex minigame, no failure timer while an intervention is open, no clickable world zones, no renderer rewrite.
- No reduction of the existing intervention cadence.
- No reintroduction of a self-funding `Accelerate`. Its cost stays at 2 Control, as decided in v1.3.1.

## Continuous pressure and containment

`requiredContainment` and the deficit term are removed. `game/pressure.ts` exposes one rate:

```
entropyRate(years, containment) = 0.48 * (1 + years / 6500) / (1 + 0.4 * containment)
```

The pressure term doubles on entering Transcendence at 6,500 years and keeps growing after it, so depth always costs more. `containmentRating` sums **upgrade levels** instead of installed modules:

| Module | Layer | Max level |
| --- | --- | ---: |
| `reality_lattice` | machine | 8 |
| `awareness_scrubber` | machine | 5 |
| `sanity_protocol` | machine | 5 |
| `cosmic_muffling` | machine | 5 |
| `stable_constants` | universe | 5 |

Maximum containment inside one Universe is 28. `stable_constants` changes from a multiplicative `entropyGainMult` of `0.88^n` with a floor of 0.4 to **+1 containment per level**, so there is exactly one damping dial; the previous two multiplied and pushed the ceiling past 25 minutes. `entropyGainMult` is removed from `RuntimeBonuses` and from the `advancePressure` signature rather than kept as a constant.

Resulting survival curve, integrating the rate from year 0 to Entropy 100:

| Containment | Cascade year | Elapsed at 1x |
| ---: | ---: | ---: |
| 0 | 3,985 | 159 s |
| 1 | 5,206 | 208 s |
| 2 | 6,309 | 252 s |
| 4 | 8,274 | 331 s |
| 8 | 11,573 | 463 s |
| 14 | 15,613 | 625 s |
| 20 | 19,027 | 761 s |
| 28 | 23,024 | 921 s |

`cascadeDecay` becomes **7% of `stabilityMax` per second** instead of a flat 7, changing its signature from `cascadeDecay(entropy)` to `cascadeDecay(entropy, stabilityMax)`. At the current ceiling of 425 maximum Stability, the flat value granted 60 seconds of grace instead of 14; the proportional rule holds the cascade at 14.3 seconds for every build.

`pressure.ts` also exposes the closed-form estimate the interface needs:

```
secondsToCascade(years, entropy, containment):
  b = 1 + years / 6500
  c = (1 + 0.4 * containment) * (100 - entropy) / 0.48
  k = 25 / 13000
  return (-b + sqrt(b * b + 4 * k * c)) / (2 * k)
```

This is exact for the pressure model, not a linear extrapolation of the current rate. It deliberately assumes no further player intervention, so it is a floor: venting or a containment pulse extends it. The interface must label it as an estimate at the current course.

## Cultivation Depth

`game/harvest-quality.ts` replaces the four-step grade function with a continuous scale. `development` already integrates era multipliers, `cultivation_accelerator`, directives, matrices and `Accelerate`, so it is the natural progress measure.

```
depth       = development / 80
yieldMult   = 0.25 + 0.22 * depth
credits     = min(20, floor(0.6 * depth))
```

The four existing grade names survive as display bands over `depth`, matching the band convention already used for Entropy and Stability:

| Band | Depth | Typical run |
| --- | ---: | --- |
| `premature` | < 1.5 | abandoned or Era 0 |
| `established` | < 4 | no-upgrade cascade |
| `transcendent` | < 9 | early developed run |
| `ascendant` | < 16 | mid developed run |
| `singular` | >= 16 | deep run |

The anti-cheese floor is retained: fewer than 3 resolved interventions, or Era 0, forces `premature` with the existing 0.2 multiplier and zero credits regardless of depth.

Because the raw harvest in `rules.ts` is already linear in `development`, total yield grows quadratically with depth. That gradient is what carries the stay-or-harvest decision.

A chaotic harvest keeps **60% of the credits, floored**, replacing the flat minus one of v1.3.1, which is superseded. Resource retention stays at `chaoticRetention`. A deep run that cascades therefore loses a visible amount, which is the point: failure must cost something proportional to what was at stake.

Expected credit outcomes: a no-upgrade run at 159 seconds reaches depth 2.3 and 1 credit; a containment-4 run at 331 seconds reaches depth 5.5 and 3 credits; a containment-28 run at 921 seconds with a developed multiplier stack reaches depth 24 and 14 credits. The unchanged 18-credit Universe requirement therefore costs six runs early and two runs late.

To keep the first purchase reachable under the new curve, `reality_lattice` moves to base cost **60** with growth **1.55** (60, 93, 144, 223, 346, 536, 831, 1,288). The first cascade run yields about 86 Causal Mass after chaotic retention, which must fund the first containment level; at the old base of 90 it did not.

## Entropy Vent

A fourth tactical action in `game/tactical-actions.ts`, shortcut key `4`.

- Cost: 1 Control, −10 Stability, +4 Attention
- Effect: removes `min(18, entropy)` Entropy and adds `removed * (0.4 + 0.2 * era)` to `harvestBonus.paradox`
- Availability: Entropy of at least 6, so venting near zero cannot farm free Paradox
- Path tendency after repeated use: Void Communion and Post-Causal Civilization

This resolves three problems with one mechanic. Entropy becomes a managed resource instead of a read-only gauge. Paradox gains a source inside the credit-optimal Controlled playstyle, which makes `paradox_sieve`, `cosmic_muffling` and `contingency_vat` reachable for the first time. And `Stabilize` stops being a trap: it is now the fuel for venting, since the chain of Stabilize followed by Vent nets +4 Stability and −10 Entropy for 3 Control.

Venting is deliberately not dominant. Venting on every intervention cycle costs about 0.83 Stability per second and consumes the entire Control income, which forgoes `Stabilize`; a no-upgrade build that vents on every cycle dies of Stability at roughly 120 seconds instead of Entropy at 159. Two competing clocks replace one.

`Accelerate` keeps its cost of 2 Control and its Entropy surcharge drops from 7 to 5. It remains intentionally front-loaded: its value is reaching Expansion and Transcendence sooner for the development multiplier and the deeper intervention pool, and it is correctly dominated by waiting once containment is high. That asymmetry is a design choice, not a defect to remove.

## Machine interventions during a run

New module `game/run-interventions.ts`. Banked resources become a tactical reserve, which is the first mechanical connection between the two layers.

| Id | Currency | Base cost | Effect | Max uses per run | Insight gate |
| --- | --- | ---: | --- | ---: | ---: |
| `containment_pulse` | causal_mass | 180 | −25 Entropy | 3 | 4 |
| `emergency_lattice` | cognition | 200 | Stability to 60% of maximum, only when below it | 3 | 6 |
| `temporal_graft` | existence | 220 | +600 years, +30 Development | 3 | 9 |

```
cost(id, usesThisRun, depth) = round(base * 3^usesThisRun * (1 + depth / 4))
```

The depth factor is essential. Spending resources to survive longer produces more resources, which is a positive feedback loop; escalation alone does not close it because yield grows quadratically with depth. At depth 20 the three `containment_pulse` uses cost 1,080, 3,240 and 9,720 Causal Mass, well above the yield the removed 75 Entropy can buy. At depth 3 a player can afford at most one. The Insight gates keep the first runs uncluttered.

This is the highest-risk part of the design and is therefore written as a testable invariant rather than a hope: see the anti-self-funding test below.

## Prestige economy

```
universeResidueAward(credits, bank, multiplier) = floor((credits^1.15 / 1.2 + sqrt(bank) / 10) * multiplier)
multiverseAxiomAward(universes, universeLevels) = floor(universes^1.1 / 2 + universeLevels / 3)
```

The residue award drops the civilization count, which the credit cap had pinned at six, in favour of credits actually earned. At 18 credits and a bank of 8,000 it returns 32 residue against 5 today. The universe growth floor in `balancedUniverseUpgrades` drops from 1.9 to **1.75**, which brings the `stable_constants` ladder from 124 to 81 residue and the full catalog from about 900 to about 550, so the Universe layer becomes meaningfully complete in ten to fifteen Universes instead of 180.

Two Universe upgrades are repurposed through `UNIVERSE_DESCRIPTIONS` in `game/upgrade-balance.ts`, since the generated catalog is frozen:

- `stable_constants`: +1 containment per level, as above.
- `wide_lattice`: preserves `min(reality_lattice level, wide_lattice level)` levels of `reality_lattice` through Universe consumption, so its six levels carry up to six containment levels into the next Universe. This replaces +20 maximum Stability per level, which the corrected proportional cascade rule makes worthless.

`wide_lattice` is what ends the guaranteed throwaway run at the start of every Universe, which the campaign simulation showed as runs 1, 7 and 13 dying identically.

## Interface and feedback

Push-your-luck without a forecast is a blind guess, so `ui/view-model.ts` gains the readouts the decision requires.

- `tactical.entropyRate`, `tactical.pressureMultiplier` and `tactical.secondsToCascade` from the closed form above.
- `harvest.depth`, `harvest.depthBand` and `harvest.nextBand` with the label, the depth required, the estimated seconds away and the yield multiplier at that band.
- `machineReserve`: the three run interventions with current escalated cost, affordability and uses remaining.
- `tactical.actions` gains Vent with its availability reason.

Rendering discipline is unchanged and load-bearing. `secondsToCascade`, `entropyRate` and `depth` are continuous and must render through existing `data-live` elements. Only the depth **band** and the boolean affordability flags of the three reserve actions may enter `civilizationRenderKey`; no continuous value may. `structuralWorldKey` gains the depth band only.

## Architecture

The one-directional layering is preserved and every new rule lands in a pure, separately testable module.

- `game/pressure.ts` owns the rate, the containment sum contract, `secondsToCascade` and the proportional cascade decay.
- `game/harvest-quality.ts` owns depth, bands, the yield multiplier and the credit curve, including the chaotic factor.
- `game/tactical-actions.ts` owns Vent and the revised `Accelerate` surcharge.
- `game/run-interventions.ts` is new and owns the three reserve actions, the cost escalation and the per-run use limits.
- `game/rules.ts` owns the two prestige award formulas and `reality_lattice` bootstrap reachability.
- `game/upgrade-balance.ts` owns the repurposed Universe descriptions and the 1.75 growth floor.
- `game/engine.ts` composes them, sums containment from levels, and preserves `wide_lattice` levels in `resetMachineLayer()`.
- `ui/view-model.ts` and `ui/app.ts` present them; no simulation rule moves into presentation.

## Save policy

`SAVE_VERSION` becomes 3. `Civilization` gains `runInterventionUses: Record<string, number>` and `tactical.actionUsage` gains a `vent` key, so the state shape changes and a v2 save cannot be loaded. Existing saves are silently discarded by the current version gate, which is the intended behaviour. There is no migration path.

## Failure handling and invariants

- A failed tactical action or reserve intervention spends nothing and alters no simulation state; its reason names the exact requirement.
- Vent below 6 Entropy is unavailable and grants no Paradox.
- A reserve intervention the player cannot afford is unavailable and does not increment its use counter.
- Controlled and chaotic harvest previews match the committed harvest record exactly, including depth, band, yield multiplier and credits.
- `premature` grants zero credits in every Directive and depth state.
- Chaotic credits are `floor(credits * 0.6)` and never negative.
- Entropy crisis thresholds at 25, 50 and 75 still queue exactly once each, including after a discrete jump past two thresholds and after a Vent drops Entropy back below a threshold already triggered.
- Ticking writes no `localStorage` and rebuilds no interactive controls; notifications stay batched.
- Structural keys change on bands and interventions only, never on a continuously ticking number.

## Verification strategy

### Focused rule tests

- Exact `entropyRate` values for containment 0, 1, 4, 8 and 28 at years 0, 6,500 and 20,000.
- `secondsToCascade` agrees with numeric integration of the rate within 1%.
- `cascadeDecay` returns 7% of `stabilityMax` and zero below Entropy 100.
- Containment sums levels, not modules: `reality_lattice` 3 alone yields 3.
- Depth band boundaries, the yield multiplier at each boundary, the credit curve including the cap at 20, the chaotic 0.6 factor and the `premature` floor.
- Vent: availability threshold, Paradox grant of `removed * (0.4 + 0.2 * era)`, Control and Stability costs, no state change when unavailable.
- Reserve interventions: the cost formula at three depths and three use counts, the per-run cap of 3, the Insight gates.
- Both prestige award formulas at declared inputs, including 32 residue at 18 credits and a bank of 8,000.
- `wide_lattice` preserves exactly `min(reality_lattice, wide_lattice)` levels across `resetMachineLayer()`.

### Deterministic balance tests

A headless harness drives the compiled engine with fixed seeds and declared policies. The harness built for this analysis is committed as a test helper under `public/game/tests/`.

- No-upgrade run under the safety policy cascades between 150 and 185 seconds.
- Containment 4 reaches between 300 and 360 seconds; containment 28 between 870 and 960 seconds.
- **No tactical-action policy extends a no-upgrade run past 240 seconds**, including Vent spam, Stabilize spam, Accelerate spam and every combination. This is the acceptance test for the requirement that survival without upgrades is not possible for long.
- A no-upgrade run that additionally spends every reserve intervention does not exceed **420 seconds**, and ends with strictly fewer net resources than the same run without them. Three `emergency_lattice` uses restore about 180 Stability, which is the only way to stretch a containment-free run past the tactical bound; escalation and the depth factor make it a losing trade, and the ceiling stays far below the 921 seconds a fully contained build reaches. Containment upgrades remain the only route to depth.
- 18 credits are reachable in at most six runs at containment 4 and in two runs at containment 28.
- **Anti-self-funding:** for a deep run, a policy that uses every reserve intervention at every opportunity ends with strictly fewer net resources than the same run without them.
- A Universe cycle after the first is strictly shorter than the first, proving `wide_lattice` removed the throwaway run.

### Release verification

- `tsc -p public/game/tsconfig.json` and all Node test suites pass.
- `npm run build`, `npm run lint` and `npm run typecheck` pass.
- `public/sw.js` lists every new `dist/` module in `APP_ASSETS` and `CACHE_NAME` is bumped.
- Version 1.5.0 appears in both `package.json` files, the `public/game/index.html` footer, `CACHE_NAME` and both READMEs.
- Browser playtest confirms the Vent control and key 4, the reserve panel with escalated costs, the cascade estimate, the depth readout, responsive layout and no console errors.

## Acceptance criteria

- `entropyRate` matches the published formula and the survival table within test tolerance for containment 0 through 28.
- A no-upgrade run cannot be extended past 240 seconds by any tactical-action policy, nor past 420 seconds even with full reserve spending, against 921 seconds for a fully contained build.
- Every containment level measurably changes survival time; no level is a no-op.
- A fully developed build sustains a run of roughly 15 minutes at 1x speed and is rewarded for it by a continuous depth curve.
- Cultivation Credits scale from 1 to 20 with depth, and Universe cadence drops from six runs to two as investment grows.
- A cascade after a deep run loses 60% of resources at the base `chaoticRetention` of 0.4 and 40% of credits.
- Paradox is produced by the credit-optimal playstyle, and the three Paradox-priced machine upgrades are affordable in normal progression.
- Reserve interventions are never net-positive on resources.
- The first Universe consumption returns about 32 residue, and the Universe catalog is substantially completable within fifteen Universes.
- The first run of a new Universe is no longer a guaranteed loss once `wide_lattice` is owned.
- Per-frame cheapness and structural-key stability tests still pass; no continuous value enters a structural key.
- `SAVE_VERSION` is 3, v2 saves are discarded without error, and game copy stays English.
