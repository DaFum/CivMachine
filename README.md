# Reality Consumption Engine — App Edition v1.7.0

An installable, offline-capable browser incremental roguelite. Version 1.7.0 gives
Entropy a cost before it kills you, computes the stay-or-harvest moment instead of
leaving it to be guessed, and paints only the slice of the world that is on screen.

## Included

- 90 production interventions and 10 Civilization paths
- 192 individually written English action labels and consequence texts
- deterministic weighted scheduling with six-event repetition protection
- Stabilize, Accelerate, Probe, and Entropy Vent actions on keys 1, 2, 3, and 4
- shared Control Capacity, Containment Rating, Entropy crises, and cascade pressure
- exact before/after feedback and action-specific world impulses
- deterministic Directive drafts, objective bonuses, and starting-trait previews
- five Harvest Grades and an 18-Cultivation-Credit Universe requirement
- a computed harvest call: whether the next Cultivation Credit fits in the run that is left
- 12 Traits, 12 Machine, 8 Universe, and 6 Axiom upgrades
- state-reactive parallax world with cached scenery and throttled animation
- touch-safe portrait and landscape layouts
- PWA installation, offline cache, and user-triggered fullscreen
- local browser saves without offline progression

## v1.7.0 pressure with a cost, a harvest signal, and a world that paints only what it shows

v1.7.0 closes three gaps between the v1.5.0 design and the shipped engine, and takes the
renderer off drawing the parts of the world nobody can see.

**Entropy now costs something below 100.** It used to cost nothing at all: `cascadeDecay`
fires only at the threshold, so the four alarm bands the interface names were free, and
obeying them measured as 69 seconds of run and 2 Cultivation Credits worse than ignoring
them. Development growth now keeps 1.000 / 0.969 / 0.875 / 0.719 / 0.500 of its rate at
Entropy 0 / 25 / 50 / 75 / 100. Runs are not shorter, only shallower, and the survival curve
is untouched.

**The stay-or-harvest moment is computed and shown.** The tactical rail carries the harvest
grade, Cultivation Depth, the next depth band and the yield, and states in words whether the
next credit still fits in the run — measured against how long the run can actually last,
which counts the vents Stability can still pay for, not the bare cascade floor. A chaotic
harvest now keeps 60% of its credits rounded rather than floored, so a cascade costs a
3-credit run a third of them instead of two thirds.

**Accelerate pays a one-off price.** The years it injects no longer inflate the Entropy rate
for the rest of the run. Accelerating builds gain 9-11% yield; runs that never accelerate are
unchanged. Waiting still wins at every containment level, so the action's direct costs remain
an open balance question.

**The world paints its visible slice.** Both canvas layers used to draw the full world width —
four viewports at stage 4, of which one is on screen — on every scrolled pixel and, for the
dynamic layer, thirty times a second. Draw work is down 55-62% on the cached layer and 51-68%
on the animated one, with the number of visible primitives identical at every scroll position.
The world's mood also glides now instead of stepping in four jumps, new structures are seen to
arrive rather than appearing between blinks, and on phones the tactical actions sit in a 2x2
grid with the cascade clock and harvest call moved onto the world itself.

**Saves from v1.6.0 are carried over.** `SAVE_VERSION` stays 4; the fields added to a
running Civilization in v1.7.0 are optional and default cleanly, so an in-progress run
behaves exactly as it did when it was written.

## v1.6.0 victory and milestones (Historical)

v1.6.0 gives the game an explicit win condition. Meta progress unlocks the **Great
Convergence**: a terminal cultivation that starts in APOTHEOSIS, runs at 1.6x Entropy, pays
no Cultivation Credits and no resources, and is won by a controlled harvest at Cultivation
Depth 14 or deeper. Failing it costs nothing but the run.

A 28-entry **Milestone Register** is now visible in the machine view. It holds the eleven
milestones that previously awarded Machine Insight invisibly, plus seventeen new ones, each
with its progress and its award.

Every convergence is permanent and stacks: x1.25 harvest yield and +2 Containment per
victory, with the next convergence demanding three more milestones, two more multiverses,
one more level on every Axiom and four more Cultivation Depth.

**Saves from v1.5.0 and earlier are not carried over.** `SAVE_VERSION` is now 4 and older
saves are discarded on load.

Median of nine seeds in the terminal run under the safety choice policy with Vent and Stabilize:

| Build | Median depth reached | Range | Median run |
| --- | ---: | ---: | ---: |
| Four modules at level 1 | 6.2 | 4.6 - 9.3 | 141 s |
| Deep machine build | 18.6 | 14.8 - 24.6 | 525 s |
| Maximum with Stable Constants | 53.9 | 41.6 - 68.2 | 1627 s |

A shallow build cannot clear Depth 14, a deep build clears it with little margin, and a maximal
build clears the scaled targets of several further convergences. The target is a single constant,
`CONVERGENCE_BASE_DEPTH` in `public/game/src/game/convergence.ts`.

## v1.5.0 balance curve (Historical)

v1.5.0 replaces binary survival with a continuous containment curve, replaces the capped harvest
grade with a continuous Cultivation Depth, and adds an Entropy Vent plus three mid-run machine
interventions. Median of nine seeds under the safety choice policy at 1x speed:

| Build | Containment | Median run |
| --- | ---: | ---: |
| No upgrades | 0 | 181 s |
| Four modules at level 1 | 4 | 360 s |
| Deep machine build | 14 | 654 s |
| Maximum with Stable Constants | 28 | 988 s |

- `entropyRate` is `0.48 * (1 + years / 6500) / (1 + 0.4 * containment)`, and containment sums
  upgrade **levels** across Reality Lattice, Awareness Scrubber, Sanity Protocol, Cosmic Muffling
  and the Universe upgrade Stable Constants. Every level is measurable; nothing is binary.
- Cascade decay is 7% of maximum Stability per second, so it lasts about 14 seconds for any build.
- Cultivation Depth is `development / 80 + 1.5` per completed path arc. Yield multiplier and credits
  scale off it, so staying deeper is the central roguelite decision. The four harvest grades become
  display bands over depth, joined by a fifth, **Singular**, from depth 16. A chaotic harvest keeps
  60% of its credits and 40% of its resources.
- Accelerate still costs 2 Control; only its Entropy surcharge dropped from 7 to 5. Entropy Vent
  costs 1 Control and 10 Stability, removes up to 18 Entropy and pays the removed amount into the
  harvest as Paradox.
- The three machine reserve interventions cost `base * 3^usesThisRun * (1 + depth / 4)`, capped at
  three uses each, which keeps them a net loss on resources.
- APOTHEOSIS is a fourth era from 14,000 years, reachable only by developed builds, with twelve new
  interventions and its own cadence.
- Universe residue scales with credits earned: 32 at 18 credits and a bank of 8,000, against 5
  before. Universe upgrade growth is capped at 1.75, bringing the full catalog to 567 residue.

## Run locally

```bash
npm install
npm run dev
```

Open the displayed local URL. For a production build:

```bash
npm run build
```

## Tests

```bash
npm test
```

This compiles the game's TypeScript sources and runs both regression suites.
`npm run lint` and `npm run typecheck` cover the Next.js shell.

The standalone game release lives in `public/game/` and can be served without
installing dependencies through `node public/game/server.mjs`.

## Deployment

The project is a standard Next.js App Router application and deploys to Vercel
without extra configuration: import the repository, keep the detected Next.js
preset, and Vercel runs `npm install` and `npm run build`. The game itself is
static content under `public/game/`, so it is served straight from the CDN.

## Project structure

- `app/` — installable shell and fullscreen/install controls
- `public/game/` — complete game, source, compiled release, and regression tests
- `public/sw.js` — offline service worker
- `tests/` — integrity and release tests
- `docs/superpowers/` — design and implementation documentation

## Save policy

Version 1.5.0 introduces the v3 browser save. Existing v2 saves are discarded by the
version gate; there is no migration path, and earlier v1 saves remain ignored. Saves use `localStorage`; no offline progress is
simulated while the app is closed.
