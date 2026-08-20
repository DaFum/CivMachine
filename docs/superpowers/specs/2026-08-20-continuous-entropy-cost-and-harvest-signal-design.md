# Continuous Entropy Cost and the Harvest Signal Design

**Status:** Approved for implementation on 2026-08-20
**Release target:** Reality Consumption Engine Browser, next minor after v1.6.0
**Scope:** `game/pressure.ts`, `game/development.ts` (new), `game/harvest-quality.ts`, `game/tactical-actions.ts`, `ui/**`
**Save policy:** No `SAVE_VERSION` bump. One optional field is added to `Civilization`, defaulted so a
v4 save loads with unchanged behaviour.
**Product language:** English (player-facing game copy), per existing convention

## Problem

v1.5.0 replaced binary survival with a continuous containment curve and made Cultivation Depth the
progress measure. Headless simulation of the committed v1.6.0 engine shows three places where the
implementation does not reach the design's own goals.

**Entropy is still a switch, one level down.** The containment *dial* is continuous, but Entropy's
*consequence* is not: `cascadeDecay` fires only at 100, and the three threshold crises at 25, 50 and
75 are ordinary two-choice interventions whose Entropy effects run from −2 to +4 — two of their six
options *raise* it. Below 100, Entropy costs nothing at all. The interface nonetheless names four
alarm bands over it and tints the whole tactical rail. Measured at containment 0: a policy that vents
on the interface's alarm at Entropy 60 ended the run at 197 s with 1 Cultivation Credit, against 266 s
and 3 credits for venting only at the cascade edge. Obeying the interface cost 69 seconds and 2
credits. The "two competing clocks" the v1.5.0 design describes never both ticked; only Stability did.

**The stay-or-harvest decision has no readout.** The design calls it "the central roguelite choice",
but nothing on screen says when to take it. `secondsToCascade` tells the player how long the run has;
nothing tells them whether the next credit still fits inside that window. Measured at containment 0,
seed 12345: a controlled harvest at 255 s paid 3 credits and 1056 Causal Mass, the forced cascade 11
seconds later paid 1 and 458. Every measured tactical policy — passive, stabilize-heavy,
accelerate-heavy, vent-at-the-edge — ended in a *forced* chaotic harvest. The choice was never taken
because its timing was not observable.

**`Accelerate` is dominated at every containment level.** The v1.5.0 design states it "remains
intentionally front-loaded … and it is correctly dominated by waiting once containment is high. That
asymmetry is a design choice, not a defect to remove." The asymmetry does not exist. Measured over
five seeds, best controlled harvest reachable at any second of the run:

| Containment | never | accelerate in Era 0 only | accelerate whenever available |
| ---: | ---: | ---: | ---: |
| 0 | **3.40 cr / 1297 CM** | 2.60 cr / 839 CM | 1.60 cr / 541 CM |
| 8 | **9.60 cr / 7480 CM** | 9.00 cr / 6371 CM | 5.40 cr / 2621 CM |

Waiting wins at low containment too, which is where the design expected the action to pay. It also
wins on the era-gated Directive objectives that look like its natural niche: on `quiet_machine`,
accelerating *lowered* the objective hit rate from 71% to 43%, because the run died before reaching
Era 2 with Awareness and Attention still low.

One structural cause is identifiable and is fixed here. `Accelerate` adds 200 years, and years drive
`pressureMultiplier = 1 + years / 6500`. A single use therefore raises the Entropy rate by 3.1% for
the entire remaining run, to buy +6 Development. A one-off action charges a permanent tax.

## Goals

- Give Entropy a continuous, legible cost below 100, so the four bands the interface names describe
  something real and the design's two competing clocks both tick.
- Make the stay-or-harvest moment observable, computed from the values the view model already holds.
- Make a chaotic harvest's credit loss proportional at every scale, as v1.5.0 intended.
- Charge `Accelerate` a one-off price for a one-off effect.
- Change no documented survival number: the containment-to-cascade table stands untouched.

## Non-goals

- No `SAVE_VERSION` bump and no migration. Progress is not wiped for a rebalance.
- No change to `entropyRate`, `secondsToCascade`, `cascadeDecay` or the containment ladder. The
  survival curve and its asserted table are correct and stay as they are.
- No rebalance of `Accelerate`'s direct costs (2 Control, −4 Stability, +5 Entropy). See the open
  decision below.
- No edit to `data/content.generated.ts`.
- No new tactical action, no new resource, no reflex demand.

## Continuous Entropy cost

New module `game/development.ts` owns the Development growth expression, moved out of
`GameEngine.tick`, and applies a drag term:

```
entropyDrag(entropy) = 1 - 0.5 * (clamp(entropy, 0, 100) / 100)^2
```

Quadratic, so the drag maps onto the band names the interface already uses:

| Entropy | Band | Development growth retained |
| ---: | --- | ---: |
| 0 | CONTAINED | 1.000 |
| 25 | STRAINED | 0.969 |
| 50 | FRACTURED | 0.875 |
| 75 | CRITICAL | 0.719 |
| 100 | CASCADE | 0.500 |

Low Entropy stays cheap to carry, high Entropy has to be answered. The drag reduces yield without
shortening runs, so the survival curve is untouched: at containment 8 the run length moved from 580 s
to 589 s while depth moved from 17.04 to 15.70.

Development growth is exposed as `GameEngine.developmentRate()` from the same function the tick
applies, because the harvest signal below forecasts against it and a second copy would drift.

### Measured effect

Best controlled harvest reachable, five seeds, vent at the cascade edge:

| Containment | Before | After | Yield change |
| ---: | ---: | ---: | ---: |
| 0 | 3.40 cr / 1297 CM | 2.80 cr / 991 CM | −24% |
| 8 | 9.60 cr / 7480 CM | 8.80 cr / 6532 CM | −13% |

The vent-threshold optimum at containment 0 moves from 97 to about 90, and the penalty for venting at
the CRITICAL alarm (75) falls from 2 credits to roughly none: thresholds 75, 90 and 97 now all reach
2.80 credits, against a clear 3-credit advantage for 97 alone before. Venting at STRAINED (25) or
FRACTURED (50) is still worse play, which is intended — those bands mean "this is costing you", not
"vent now".

The top of the curve still lands on the v1.5.0 target. That design predicted "a containment-28 run …
reaches depth 24 and 14 credits"; measured after this change, containment 28 reaches depth 24.37 and
exactly 14.00 credits over seven seeds.

## The harvest signal

`harvestUrgency` in `game/harvest-quality.ts` is a pure function over the values the view model
already carries. It inverts the credit curve to find the Development still needed for the next credit,
divides by the exposed Development rate, and compares that against how long the run can *actually*
last.

That second term is the part worth stating carefully. The obvious horizon, `secondsToCascade`, is the
wrong one: v1.5.0 documents it as a floor that "deliberately assumes no further player intervention".
Over the minutes a credit step takes, that assumption is badly wrong, and it misfired exactly as you
would expect. Traced in the browser against the shipped build, comparing to the cascade floor called
HARVEST NOW at 100 s on a run that went on to 276 s and banked the credit anyway — advice that would
have cost the player a credit for following it.

`reachableRunSeconds` supplies the honest horizon. Venting is what extends a run and Stability is what
pays for it, so:

```
ventsAffordable = floor(stability / ventStabilityCost)
reachable       = secondsToCascade + ventsAffordable * ventEntropyRelief / entropyRate
```

This makes Stability the terminal constraint, which is what it already is in practice. Re-traced with
the corrected horizon, the same run first called HARVEST NOW at 172 s, stating that credit 3 needed
184 s against a reachable 172 s; the run ended at 276 s having banked 2 credits, so credit 3 was
indeed unreachable and the call was correct. A player who obeyed it would have taken those 2 credits
as a *controlled* harvest instead of losing one to the cascade.

Known behaviour, not smoothed over: the call is reactive, so venting can move a run from `harvest`
back to `closing` — at 176 s in the same trace, a vent dropped Entropy from 87.5 to 72.8 and did
genuinely restore the horizon. Both numbers are on screen in the message, so the player can see what
their own action bought. The state is out of the render key, so the flip costs no rebuild.

The thresholds:

| State | Condition | Interface |
| --- | --- | --- |
| `cascading` | Entropy ≥ 100 | CASCADE UNDER WAY // harvest now or lose 40% of the credits |
| `harvest` | next credit needs more time than the run can reach | HARVEST NOW // credit N needs Ms, the run can reach Ms |
| `closing` | next credit needs more than 70% of the reachable run | CLOSING // credit N in Ms, the run can reach Ms |
| `building` | otherwise, or the run is still Premature | BUILDING // credit N in Ms |

A Premature run always reads `building`: it has nothing banked, so harvesting is never the answer
whatever the clock says. At the credit cap the call is `harvest`, because there is no next step to
wait for.

The state is written through the live refresh and **must not enter `civilizationRenderKey`**. Both
sides of its threshold move continuously, so a run sitting near a boundary would rebuild the panel
frame after frame — the exact failure the second rendering invariant exists to prevent.

## Proportional credit loss on a cascade

`calculateCultivationCredits` rounds the chaotic retention instead of flooring it. v1.5.0 specified
"60% of the credits, floored" with the rationale that failure must cost "something proportional to
what was at stake". Flooring is not proportional: it bit hardest where the stakes were smallest.

| Credits at stake | Floored | Rounded | Loss floored | Loss rounded |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 0 | 1 | 100% | 0% |
| 3 | 1 | 2 | 67% | 33% |
| 5 | 3 | 3 | 40% | 40% |
| 14 | 8 | 8 | 43% | 43% |

The one-credit run is the deliberate exception: 60% of 1 rounds back to 1, so a cascade costs it no
credit. The alternative costs it everything, which is the opposite of proportional, and the resource
side still bites — `chaoticRetention` keeps 40% of everything else — so the failure is never free.

## `Accelerate` pays once

`Civilization` gains `injectedYears?: number`. `Accelerate` adds its years to both `years` and
`injectedYears`; `pressure.ts` exposes `pressureYears(civ) = max(0, years - injectedYears)`, and every
pressure caller reads that instead of `years`. Era, Development and the era-scaled growth bonus still
see the full year count, so nothing about the action's *benefit* changes.

The field is optional and defaults to 0, which is why no `SAVE_VERSION` bump is needed: an
in-progress run loaded from a v4 save keeps counting its already-injected years as pressure, exactly
as it did when it was written. The default fails safe in the only direction that matters.

### Measured effect

Accelerating in Era 0 only, five seeds:

| Containment | Charged (before) | Excluded (after) |
| ---: | ---: | ---: |
| 0 | 196 s, 839 CM, depth 4.95 | 208 s, 929 CM, depth 5.18 |
| 8 | 500 s, 6371 CM, depth 15.64 | 528 s, 6923 CM, depth 16.40 |

Runs that never accelerate are bit-for-bit unchanged, which is the correctness signal: the change
touches only the builds that use the action.

`temporal_graft` keeps its +600 years charged to the pressure curve. It is a purchased effect whose
price already escalates by `3^uses * (1 + depth/4)`, and that escalation is the guard the
anti-self-funding invariant tests. Relaxing its pressure cost in the same change would weaken the
one part of v1.5.0 its own design calls "the highest-risk".

## Open decision — `Accelerate`'s direct costs

The pressure fix improves accelerating builds by 9–11% and is correct on its own terms, but it does
**not** make `Accelerate` competitive: `never` still wins at every containment level, and the residual
gap is its direct costs. Five uses spend 10 Control, 20 Stability and 25 Entropy — at containment 0
that Entropy alone is about 50 seconds of run — to buy 1,000 years and 30 Development.

Three options, none taken here because each sets a balance target this document has no mandate to set:

1. Drop the Entropy surcharge from 5 to 0 and keep the Stability cost. The action becomes a pure
   Control-for-time trade.
2. Halve the injected years and halve the costs. The action stays marginal but stops being a trap.
3. Accept that `Accelerate` is for Directive objectives and path affinity rather than for yield, and
   say so in its own tooltip instead of in a spec.

Option 1 is closest to the design's stated intent and is the smallest change. It needs its own
measurement pass against the self-funding non-goal before it ships.

## What the tests assert

- `entropyDrag` at every band boundary, monotonicity across the range, and clamping outside it.
- The tick and `developmentRate()` land on the same number, so the forecast cannot drift from the
  simulation.
- `Accelerate` records `injectedYears`, leaves the Entropy rate unmoved on injection, and still lets
  lived years raise it.
- `pressureYears` defaults to the full year count for a record written without the field.
- `harvestUrgency` transitions at the documented thresholds, and its state is absent from
  `civilizationRenderKey`.
- `reachableRunSeconds` counts only whole affordable vents, returns the bare cascade floor at zero
  Stability, and shrinks as the Entropy rate rises.
- The chaotic retention keeps at most 60% plus half a credit at every scale, always costs a credit
  from two upward, and the one-credit exception is asserted explicitly rather than left to rounding.
