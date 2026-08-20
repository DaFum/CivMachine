# Reality Consumption Engine — App Edition v1.11.0

An installable, offline-capable browser incremental roguelite. Version 1.9.0 ships a scheduler
that allows each intervention one draw per run, and a catalog large enough that no naturally
ending run runs out of unseen ones.

## Included

- 185 production interventions and 10 Civilization paths, no repeats while unseen eligible ones remain
- 389 individually written English action labels and consequence texts
- deterministic weighted scheduling: one draw per intervention per run while unseen eligible
  interventions remain, then freshness-weighted repeats; six-event recency window throughout
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
- local browser saves without offline progression, migrated forward across versions

## v1.11.0 a save that survives the next version

v1.11.0 replaces the version gate that silently discarded a mismatched save with a migration path.
A stored save is now brought forward in two passes: a declared step per version boundary, and a
structural pass that rebuilds every field against the current defaults. A field added since the save
was written gets its default, a field that no longer exists is carried along untouched, and a
non-finite or wrongly typed value is repaired instead of poisoning the run.

- an older save is migrated and re-written in the current shape, keeping currencies, upgrade levels,
  Machine Insight, unlocks, milestones, victories and the in-progress civilization
- a save written by a *newer* build loads in compatibility mode, with its unknown fields preserved
- a save that cannot be read at all no longer disappears: the original bytes are copied to a backup
  slot before anything overwrites them, and `RCE.restoreBackup()` puts them back
- a run that can no longer be simulated (a missing seed) is dropped on its own, so the Machine
  behind it survives
- a rejected `localStorage` write reports itself once instead of taking the running game down
- the loader reports what it did in the Machine record, so a migration is visible rather than silent

Balance, content and rendering are unchanged: `SAVE_VERSION` stays at 4 and no rule module moved.

## v1.10.0 a civilization that remembers what you did

v1.10.0 adds the Civilization Drama Arc without moving the v1.9.1 balance curve. Emergence,
Expansion, Division, Transformation and Crisis are derived from the existing Development/era/
institution/choice stage score, so stronger machines reach later chapters by surviving longer rather
than by crossing a wall-clock gate.

Decisions now emit deterministic semantic consequence tags and one of 28 high-signal signature
profiles. Major consequences can transform up to six persistent world-memory domains and three
evolving scar domains. Dominant paths and the three current institutions gain distinct procedural
landmark language, while Stability, Sanity, Awareness, Attention, Entropy and Development retain
separate readable visual channels.

The world renderer still uses the same three Canvas layers and exposed-strip scenery redraw. A new
renderer-local quality controller sheds particles, haze and cosmetic agents before any gameplay
signal, preserves reduced-motion semantics, and never changes simulation speed, rewards, cadence or
save version.

## v1.9.1 baseline synchronization

v1.9.1 is the current balance/content baseline used by the Civilization Drama Arc work. This
maintenance release keeps the v1.9.0 185-intervention catalog and measured survival curve intact;
the release surfaces are synchronized to the package/cache version before v1.10.0 feature work.

## v1.9.0 a catalog that outlasts the run

v1.9.0 is a content release. A run used to serve about a third of its interventions twice. It
now repeats one only after every eligible intervention has been served, which no naturally ending
run reaches.

**The catalog grew from 90 interventions to 185.** 36 pathless interventions across three era
bands, a second four-step chain for each of the ten Civilization paths (impulse, reinforcement,
conflict, consolidation, gated on path affinity alone rather than on dominance), one extra
dominance-gated consolidation per path that does not require the 460 Development the frozen
endgames do, and three branching chains of three interventions each. Every one of the 389 choices
has its own action label and consequence text; the generated catalog in `data/content.generated.ts`
is untouched, and the new content is layered on top of it the way the Entropy crises and the
Apotheosis events already were.

**Three branching chains.** A root intervention now schedules a different consequence depending on
how it was resolved, using the `follow_up` mechanism the frozen catalog already had: the monetization
of absence (enforce a patent on empty space, or declare nothing open-source), chronological liver
failure (ban next Tuesday's parties, or drink through the paradox), and a lunar labor dispute that
only a civilization with a sentient moon ever sees. The six consequences are scheduled-only and
single-choice: the decision happened one intervention earlier, and this is the bill.

**One draw per intervention per run.** The scheduler used to allow two or three, and the one
catalog event that declared `max_count: 999` as a fallback dominated long runs. The declared
`max_count` is now ignored: an intervention already served this run is out of the pool. Up to 145
of the 185 are eligible inside a single run, and the longest naturally ending run draws about 100,
so the guarantee holds with room to spare. A run stretched far past its natural length -- Vent can
keep a Civilization alive for roughly three times as long -- eventually exhausts even that, and
from there the freshness weighting spreads the repeats instead of concentrating them: measured over
a 240-intervention marathon, no single intervention took more than 3% of the run.

**The balance curve did not move.** The new interventions were written to the frozen catalog's
numeric scale and then measured against it: median survival 182 s with no upgrades, 360 s at
Containment 4, 972 s at Containment 28, against 181 s / 360 s / 971 s before. First-run and
chaotic-collapse harvests still fund a median of two Machine levels.

## v1.8.0 a layer that scrolls instead of repainting, a loop that stops, and a front-loaded Accelerate

v1.8.0 is an optimization release. Nothing about the run changes except one price that was
measurably wrong.

**Panning costs about a fifth of what it did.** The settlement layer -- over 90% of the static
drawing and the only layer that moves 1:1 with the scroll -- now lives on its own canvas. A
scroll copies what is already painted and repaints only the strip the move exposed, clipped so
the copy cannot be damaged. Measured on a 1440x760 viewport at device pixel ratio 2, a stage-4
world, dragging at 12 px per frame: 1140 static drawing primitives per frame before, 242 after.
Sky and terrain, at 14 and 80 primitives, are still simply repainted. A render test replays the
same scroll reached two different ways and requires the strip to paint the exposed slice exactly
as a full redraw does.

**The frame loop stops when there is nothing to cultivate.** It used to run at 60 Hz in the
machine layer, ticking nothing and rewriting an unchanged save every five seconds. Measured in
the browser: 62 callbacks per half second during cultivation, 0 in the machine layer.

**Accelerate is front-loaded instead of dominated.** Its Entropy surcharge was flat at +5, which
made the action worse than doing nothing at every containment level -- measured over five seeds,
2.0 Cultivation Credits against 4.8 for touching nothing at containment 8. It now costs 3 Entropy
in Emergence and 3 more per era after, so an early push is affordable and a late one is not. The
documented v1.3.1 progression envelope is unchanged.

**The civilization view is ordered by what it asks of the player.** The intervention -- the one
thing a run demands an answer to -- now sits directly under the world it is about, instead of below
a block of status readouts. The old rail answered three questions at once; it is two now: `TACTICAL
ACTIONS` (Control, the four actions as a 2x2, simulation speed) and `PRESSURE & HARVEST` (Entropy,
the harvest forecast, and the harvest buttons directly under it). Run context follows, reference
material last. The mislabelled `Intervention Control` accordion, which held nothing but the speed
control, is gone; `Cosmic Conditions` is a line in `Strategic Overview`, next to the bars it
describes.

**Smaller things.** The stat drift -- how fast Stability, Awareness, Attention and Sanity move --
moved out of the tick into `game/stat-drift.ts`, where it can be addressed by tests like every
other rule. The service worker no longer precaches source maps, which were six of the thirty-five
maps and pure download weight. The game's heaviest modules are preloaded, so the first visit does
not discover them one import at a time.

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

Version 1.11.0 migrates a stored save forward instead of discarding it. A v1, v2 or v3 payload is
brought up to the current v4 shape with its progress intact, a save written by a newer build loads in
compatibility mode, and anything the loader had to change is preserved verbatim in a backup entry
first. Saves use `localStorage`; no offline progress is simulated while the app is closed.

Historically — up to v1.10.0 — a version gate discarded every payload whose `saveVersion` did not
match, so the v1.5.0 move to the v3 format erased existing v2 progress. That gate is gone.
