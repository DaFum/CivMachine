# v1.20.0 — the campaign curve

The numbers the v1.20.0 balance tests pin come from here. `public/game/tests/campaign.test.mjs`
asserts the bands; `npm run balance` prints them; this document says why they are where they are.

## The problem

Every earlier balance pass measured one Civilization. v1.5.0 gave the run a continuous pressure curve,
v1.6.0 gave Entropy a cost below the cascade, v1.3.1 bounded what a first run could buy. All of those
held. The loop *above* the run did not, and one run at a time could not show it.

Measured on v1.19.0 from an empty save, with a player who resolves interventions safely, vents when
Entropy threatens the run, and harvests when the interface's own harvest call says the next
Cultivation Credit no longer fits. This is one seed followed run by run, so its first run is 146 s;
the 130 s quoted in the release notes is the median across sixty seeds of that same first run.

| Run | Duration | Depth | Grade | Credits | Machine levels affordable | Containment after |
| --- | ---: | ---: | --- | ---: | ---: | ---: |
| 1 | 146 s | 1.67 | ESTABLISHED | 1 | 3 | 2 |
| 2 | 512 s | 8.43 | TRANSCENDENT | 5 | **21** | 10 |
| 3 | 1697 s | 33.33 | SINGULAR | **20** | 49 | 23 |

The first Universe fell out on run three, of the eighteen Cultivation Credits it costs, twenty-six
were banked. Across ten strategies and twenty-four seeds the median was three runs for every
containment-buying line, and the strongest line — riding every run into the cascade — took two.

## Why it compounded

Four multiplications sat in series, and each fed the next:

1. Raw harvest value scales with Development.
2. Development scales with run length.
3. The Harvest Grade yield multiplier was `0.25 + 0.22 × Depth`, and Depth is Development / 80 — so
   the multiplier *also* scaled with run length. A run's worth was therefore quadratic in its own
   duration.
4. Run length scales with Containment, and Containment was cheap: four Reality Lattice levels cost 520
   Causal Mass together, which one ordinary early run paid in full.

A fifth term made the fourth worse. The published survival curve — 159 s at Containment 0, 292 s at 3,
919 s at 28 — is the *floor*, the horizon assuming no further player intervention. A run that keeps
resolving interventions keeps being handed Stability and Control back, and an Entropy Vent cost a flat
10 Stability, so both converted directly into more run. Measured, runs at Containment 3 finished
anywhere between 300 s and 900 s: the same build, a 3x spread, decoupled from the curve that was
supposed to govern it.

And the Cultivation Credit cap was 20, above the 18 a Universe costs. So a run that merely lasted long
enough paid for a prestige on its own.

## The five corrections

Deliberately small, and deliberately at the sources rather than at the symptoms.

### 1. The yield multiplier is concave

```text
multiplier = 0.25 + 0.22 × 6 × ln(1 + Depth / 6)
```

`DEPTH_YIELD_KNEE = 6` is the load-bearing number. Below it this is the v1.19.0 straight line to
within a few percent, so the published first-run economy survives untouched. Above it, it flattens.

| Depth | v1.19.0 | v1.20.0 |
| ---: | ---: | ---: |
| 1.67 | 0.62 | 0.57 |
| 5 | 1.35 | 1.05 |
| 10 | 2.45 | 1.54 |
| 16.7 | 3.92 | 2.01 |
| 33 | 7.51 | 2.72 |

A deeper run is still clearly better than a shallow one. It is no longer worth more than the several
shorter runs it displaces, which is what made "one mega-run" the correct play.

### 2. Cultivation Credits cap at 10

A Universe costs 18. `DEPTH_CREDIT_CAP + 1 < 18` — the `+1` is the Directive objective's bonus credit
— makes two successful Civilizations the arithmetic floor for a prestige at every stage of the game,
which is what the roguelite cadence was always specified to be. The cap also gives the run a natural
end: a mature build reaches it at about twelve minutes, which is the deep-run horizon the design asks
for.

### 3. Grade boundaries are credit steps

`DEPTH_BANDS` is derived from `DEPTH_CREDIT_RATE` rather than authored beside it:

| Grade | Depth | Credit |
| --- | ---: | ---: |
| PREMATURE | 0 | 0 |
| ESTABLISHED | 1.67 | 1 |
| TRANSCENDENT | 5 | 3 |
| ASCENDANT | 10 | 6 |
| SINGULAR | 16.67 | 10 (the cap) |

Before this the two curves were independent by design, and disagreed: a run 0.4 Depth from
TRANSCENDENT was still 1.4 Depth from its next Credit. The louder of the two signals was the less
valuable one. Deriving the bands removes the disagreement at the source rather than papering over it
in the interface — and gives the top band a meaning it did not have, since SINGULAR is now exactly the
Depth at which Credits cap. The live rail and the run report both name the credit a band pays.

### 4. Containment is priced as the stat that compounds

Containment lengthens the run, and a longer run buys more of everything, so cheap repeat Containment
compounds into itself. All four modules now carry explicit cost ladders instead of a growth factor,
because Containment is fungible — the pressure curve reads the sum — so escalation has to be a
property of Containment rather than of any single module.

| Module | Currency | Ladder |
| --- | --- | --- |
| Reality Lattice | Causal Mass | 60, 600, 1800, 4500, 11000, 26000, 60000, 140000 |
| Awareness Scrubber | Cognition | 520, 1650, 4200, 10000, 24000 |
| Sanity Compliance Protocol | Cognition | 560, 1750, 4400, 10500, 25000 |
| Cosmic Muffling | Paradox | 520, 1650, 4200, 10000, 24000 |

The opening 60 is the design promise the ladder exists to keep: a first weak run, even one that
collapses, affords one real survival improvement. The shape after it is what creates the decision —
each secondary module's first level undercuts a second Reality Lattice level, and its second level
costs more, so breadth beats depth early and the survival build has to be assembled.

The two Universe upgrades that buy Containment are priced against the same ladder, or the Universe
layer would answer the survival question for free: Wide Lattice at 5, 14, 34, 75, 155, 320 and Stable
Constants at 6, 18, 45, 100, 210. At the frozen catalog's 2/4/6/11/19/33, six preserved Reality Lattice
levels would have cost roughly two Universes and been worth over forty thousand Causal Mass.

### 5. Entropy Vents escalate

`ventStabilityCost(uses) = 10 × (1 + 0.35 × uses)`, and the Paradox payout scales with the same
factor. The growth is linear in the base cost, not compounding on the previous vent: 10, 13.5, 17,
20.5 — each vent costs 3.5 more than the one before, which is 35% *of the base*, not 35% more than the
last one paid. Venting becomes a finite budget rather than a renewable one, which puts run length back under
the curve Containment governs, and gives Containment a second job: a slower Entropy rate is now worth
vents as well as seconds. Tying the payout to the price keeps Paradox-per-Stability flat, so what the
escalation rations is run length, not the Paradox economy — without that, a venting run measured 250
Paradox against 256 for never venting at all.

## Traps that became decisions

- **Simulation speed** is permanent progression: 2x at Machine Insight 3, 4x at 10. It was sold by
  Temporal Injector, a Machine upgrade, which meant re-buying the same fast-forward button after every
  Universe — the one purchase whose value evaporated at each prestige. Speed is a comfort, not power,
  so it belongs where it is kept for good.
- **Temporal Injector** keeps the mechanic it is named after. `ACCELERATE_YEARS` runs
  200/420/720/1150 and `ACCELERATE_DEVELOPMENT` 6/16/30/48, against 200/260/340/450 and a flat 6. The
  old +6 Development was why an Accelerate-heavy line measured as a trap: two Control and up to twelve
  Entropy bought a fourteenth of a Cultivation Credit.
- **Prediction Core** pays out. A probed intervention lands 12% softer per level, capped at 50%. The
  module still does nothing until you Probe, which is its identity; what changed is that foresight is
  now worth something to a player who was going to pick the safe branch anyway.
- **Accelerated Development** asked for Development while multiplying Development. The objective now
  requires Development 400 *in the Transcendence era* — the half the Directive cannot buy for the
  player. On a bare Machine it clears no runs at all; with three Containment it clears reliably.

## Unlock pacing

The first Universe used to unlock Universe upgrades *and* Breeding Matrices, reveal Existence *and*
Universal Residue, and pay the four Machine Insight that opened the next tier of Machine modules — four
independent systems in the step the player is least equipped to read.

| Step | Unlocks |
| --- | --- |
| 2 controlled harvests, Insight 3 | Directives |
| 4 Civilizations or Insight 6 | Universe prestige |
| Transcendence reached | Existence identified |
| Universe 1 | Universe upgrades |
| Universe 2, Insight 7 | Breeding Matrices |
| Universe 3 | Multiverse prestige |
| Multiverse 1, Insight 18 | Axioms |

Multiverse prestige at three Universes is still one Universe ahead of the four it needs, so nothing is
gated behind knowledge the player does not have.

## The curve this produces

Measured across sixteen seeds and eleven strategies.

| Build | Containment | Run length | Depth | Credits | Grade |
| --- | ---: | ---: | ---: | ---: | --- |
| bare Machine | 0 | 2.1 min | 1.7 | 1 | ESTABLISHED |
| early | 2 | 5.8 min | 5.1 | 3 | TRANSCENDENT |
| mid | 4 | 9.1 min | 10.0 | 6 | ASCENDANT |
| mature | 8 | 11.7 min | 16.7 | 10 | SINGULAR |

Prestige cadence, in Civilizations consumed: 5-7 for the first Universe, then 3 each for the second,
third and fourth on a survival- or balance-tilted build, before the Multiverse resets the Universe
layer and the shape repeats.

Yield- and utility-tilted builds need more Civilizations — 19 to 21 to the first Multiverse against 15
to 16 — but not more *time*: every tilt arrives within 27 to 30 wall-clock minutes of cultivation,
because their runs are shorter. Measured on the four axes the mandate names, at the first Multiverse:

| Tilt | Civilizations | Wall-clock min | Credits/min | Resources/min |
| --- | ---: | ---: | ---: | ---: |
| defensive_spread | 15 | 32 | 2.92 | 5772 |
| survival_first | 16 | 31 | 2.95 | 6122 |
| lattice_rush | 16 | 30 | 2.96 | 5666 |
| balanced | 17 | 30 | 2.93 | 5381 |
| development_first | 18 | 29 | 3.03 | 5791 |
| yield_first | 18 | 30 | 2.77 | 5941 |
| utility_first | 19 | 30 | 2.92 | 5287 |

No tilt Pareto-dominates another: for every pair, whichever is ahead on one axis is behind on
another. `campaign.test.mjs` checks every ordered pair of the six tilts the harness can measure --
thirty comparisons, or fifteen unordered pairs -- rather than merely asking whether one tilt holds
every axis at once, which is the weaker question and passes far too easily. `utility_first` is the
seventh tilt and is held to a separate, weaker bar for the reason below.

Two honest caveats, both of which cost real calibration attempts to establish.

**Containment is the compounding stat, and that bounds how distinct a tilt can be.** The opening
Reality Lattice rung costs 60 Causal Mass and lengthens the run by 31%, which is 31% of *every*
resource; a yield module costs 120 for +12% of *one of four*, about 3% of the total. Containment is
therefore roughly twenty times more resource-efficient per unit spent at the point where ordering
matters — so a policy that actively defers it is dominated on every axis, including the resource axis
it was meant to own. An earlier version of the harness weighted Containment at 1.3 against yield at
0.5 and measured exactly that; it was measuring a caricature rather than a build. The tilts now prefer
their axis without refusing Containment, and `yield_first` leads resources per minute — but only by
about 3%, which is close to the noise floor of an eight-seed median.

Three attempts to widen that lead all failed for the same reason and are recorded here so they are not
tried again: raising the grade-module bonus from 2.5% to 9% and 14%, raising the yield multipliers from
12% to 16%, and weighting banked resources more heavily in `universeResidueAward`. Every Machine
upgrade is affordable within a Universe, so every build ends each Universe owning all four yield
modules at level 6 — measured, `yield_first`, `survival_first` and `development_first` reach Universe 3
with near-identical Machine levels. Strengthening the modules lifts every build, and the build whose
runs are longest still converts the lift best. Making the resource axis genuinely belong to a yield
build would need a mechanic that survival cannot also buy, which is a design change rather than a
number, and it is not in this release.

**Prediction Core cannot be valued by this harness at all.** The modelled player takes the safest
branch of every intervention, so there is little for foresight to soften; a run with Prediction Core 5
is byte-identical to the same run with none, which the test asserts before excluding `utility_first`
from the strict pairwise check. Modelling the player probing anyway was tried and measured *worse* --
a Probe that costs Control competes with the vent keeping the run alive -- and that is a finding about
the module rather than the build, which is why Prediction Core now makes a Probe free from level 2.
The utility row is a floor on that build; it is held to "not a trap" (within 1.5x on Civilizations and
1.3x on wall-clock), not to non-dominance it has no way to demonstrate.

## What must not regress

- The published survival curve. Containment still sets the cascade horizon, and
  `core.test.mjs` still pins 159 s at 0 and 919 s at 28.
- The first weak run affording Reality Lattice level 1.
- `DEPTH_CREDIT_CAP + 1 < 18`.
- Grade boundaries staying derived from `DEPTH_CREDIT_RATE` rather than authored.
- No purchase tilt more than 1.8x slower than the fastest to the first Universe.
