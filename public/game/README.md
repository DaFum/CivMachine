# Reality Consumption Engine — App Edition v1.16.0

A complete browser port of the Godot/Android prototype. The game runs as a static web application with a deterministic Canvas civilization renderer and a responsive DOM management layer. Version 1.9.0 expands the intervention catalog to 185, enough that a naturally ending run never has to repeat one.

## Run locally

No `npm install` is required for the prebuilt release.

### Node.js

```bash
node server.mjs
```

Then open:

```text
http://localhost:8080
```

To use another port:

```bash
PORT=4173 node server.mjs
```

### Any static web server

You can also serve the extracted folder with any static web server. The precompiled JavaScript is already in `dist/`.

Do not rely on double-clicking `index.html`; ES modules are intended to be served over HTTP(S).

## Build from TypeScript source

The release includes all TypeScript sources in `src/`. If `tsc` is installed:

```bash
npm run build
```

Run the regression suite with:

```bash
npm test
```

## Browser architecture

- `src/game/` — deterministic simulation, progression, prestige, saves, intervention paths
- `src/render/` — deterministic Canvas civilization renderer
- `src/ui/` — responsive DOM HUD, panels, controls, intervention choices
- `src/data/` — generated content ported from the Godot catalogs
- `dist/` — precompiled browser JavaScript
- `tests/` — Node regression tests

## v1.16.0 the game speaks German

v1.16.0 makes every player-facing string in the game a catalog lookup, and adds German as the second
locale. `SAVE_VERSION` stays at 4, no balance number moved, and English output is unchanged — the
wiring was checked against the existing suite rather than against a re-read of the copy.

`src/data/localization.ts` is the catalog: one entry per locale, keyed by the ids the runtime already
uses — event, intervention, trait, mutation, upgrade, directive, milestone, help-topic and tutorial
ids. `src/data/i18n.ts` beside it holds the one mutable thing about it, which locale is active, plus
the placeholder filler and the by-id readers. Nothing captures a string at import time, so a switch is
one assignment and one re-render.

- a language selector in the top bar, next to EXPLAIN; the choice is stored under its own
  `localStorage` key, so erasing a save does not erase the language
- the locale is read *before* the save is parsed, so a migration notice arrives in the player's
  language rather than the build's
- the active locale is a band in `civilizationRenderKey`, because otherwise a switch mid-run would
  leave the whole panel column in the language the run started in
- canonical names stay English in both locales — events, interventions, upgrades, directives, paths,
  traits, mutations and the generated lore word lists — so a seed-generated civilization cannot end up
  with two names
- ids stayed ids: effects, costs, anchors, gating facts and CSS hooks are rules, and a localized
  lookup that misses falls back to the English the source already carries

One English string did change on purpose. Decision feedback used to name a gained flag by humanizing
its id (`machine faith devout`); it now names it the way the catalog does — by the decision that set
it (`Recognize the miracle`) — and prints the localized kind beside it.

## v1.15.0 measure, the type floor, and a coach card that stops covering its own lesson

v1.15.0 is presentation and accessibility only. `SAVE_VERSION` stays at 4, no rule module moved, and
the renderer draws exactly what it drew before. It closes an eight-finding frontend audit of the
shipped build, measured in a browser rather than read off the stylesheets.

Three of the four scales were already single sources. **Measure was the one still missing**, and it
is the one that decides whether a wide display reads as designed: the shell is monospace, so
`.panel-note` ran 171 characters per line at 1440px and 177 at 1920px, `.upgrade-list` never left a
single 1374px column, and each upgrade row put 338px of dead panel between a description and the
button that acts on it.

- `--measure` caps running prose at 68ch; the panels stay full width, only the text inside them stops
- the upgrade list and the milestone register go multi-column, like the option grid already did
- the type scale's bottom half moves up together: `--text-3xs` resolved to 9.29px on a phone, and
  what sat on it was the sentence explaining why a tactical action is refused
- 57 elements were off the scale entirely -- five `small` selectors took the browser default 13.33px
  and every button label took a flat 16px through `font:inherit`; both now name a tier
- the guided run docks to its own rail above 1000px and the shell gives up that width, so the card
  can no longer sit on the situation banner's DO line; below that width the anchored panel is
  scrolled clear once, when the step changes
- `HIDE` and `SKIP` were 46x22px on a pointer -- under WCAG 2.2 2.5.8, and the only controls that
  clear the card off the text underneath it
- the world host takes `role="img"` so its label is exposed at all (a bare `div` is `role=generic`,
  which prohibits naming) and its three canvases are hidden from the tree
- the machine record takes `role="log"` with live updates explicitly off, so it does not talk over
  the situation banner
- the footer line was the shell's one contrast failure at 3.59:1; it takes `--muted` at 5.74:1

Reduced motion, focus visibility, reflow, control naming, touch targets and per-frame cost were all
checked and all held: the render-key gate keeps the sanitiser at 0.08% of wall clock across a run.

## v1.14.0 the last two scales, and a decision sized to what it asks

v1.14.0 is presentation only, like the release before it. No rule module, balance number or content
entry moved, `SAVE_VERSION` stays at 4, and the renderer draws exactly what it drew before — every
change is in the two stylesheets.

v1.13.0 collapsed radius and type to single sources and left the other two scales alone. Colour and
spacing were still literals: 224 hard-coded hexes, and 197 gaps across 24 distinct values, so
`.65`/`.7`/`.75`/`.8rem` all did the same job on adjacent cards. The tokens meant to prevent exactly
that — `--surface-1/2/3`, `--line-soft`, `--line-strong` — had been declared in v1.13.0 and then used
zero times.

- **Five surface tiers instead of ten near-identical darks.** `#0b141b`, `#0b141a`, `#0b151b`,
  `#0a1218`, `#0c151c`, `#081218`, `#070d12`, `#080e13` and `#080f14` were doing five jobs between
  them, which is what made a dozen panel types read as a dozen designs. They are `--surface-sunken`,
  `--surface-inset`, `--surface-1`, `--surface-translucent` and `--surface-raised` now, ordered by
  elevation, plus the two gradient pairs the panels and rails are built from.
- **One `--space` scale drives every gap.** Ten steps on a 2px grid, snapped from the values already
  in use, so nothing moved more than 1.6px and the rhythm is even for the first time.
- **The decision is sized to what it asks.** A choice button was a flat 92px box holding 19px of
  text — 79% dead space, because the consequence line does not exist until Probe is spent. It sizes
  to its content now and grows with its pair when predictions are revealed; on a 1440×900 desktop
  that lifts the whole pressure rail, harvest buttons included, above the fold.
- **The gauges connect their labels to their numbers.** Entropy and Harvest Grade are right-aligned
  so the two read as a column, which on a wide rail left the label 700px from its own value. A leader
  carries the eye across without moving the number off its alignment.
- **Meters read as instruments.** Each track is a channel cut into the surface rather than a
  near-invisible hairline, and a non-zero value is always visible instead of rounding to nothing.
- **A phone gets its viewport back.** The header reserved `100% - 50px` for the one icon button that
  existed when the rule was written; there are two, so the pair wrapped to a row of their own and the
  resource bar to a third — 188px of an 844px screen spent before the world appeared. And
  `.tutorial-foot` let the waiting sentence crush `CONTINUE` from 106px to 65px, so the first control
  a new player is asked to press rendered as `CONTI`.

Two tests pin the new scales the way the radius and type tests already do: a literal gap in either
stylesheet, or any of the retired darks reappearing, fails the build rather than shipping.

## v1.13.0 a shell that reads as built

v1.13.0 is presentation only. No rule module, balance number or content entry moved, `SAVE_VERSION`
stays at 4, and the renderer draws exactly what it drew before -- every change is in the two
stylesheets and the shell's own CSS.

The shell had accumulated seven different literal corner radii, thirty distinct hard-coded font
sizes, and no radius at all on its panels while its cards were rounded. That mismatch, not any single
missing effect, is what made a dense instrument UI read as unfinished.

- **One `--radius` drives every corner.** `--radius-xs/sm/md/lg` derive from it by `calc`, so
  re-rounding the entire UI is now a one-line edit. Panels, rails and the world viewport are rounded
  for the first time; the accordion clips itself so its edge-to-edge summary follows the corner.
- **Every font size is fluid.** A ten-step `clamp()` scale replaces the thirty literals, across both
  stylesheets. Desktop sizes land within a hair of the old ones, a phone gets a readable floor
  instead of `0.55rem` labels, and a large display stops looking sparse. Three places needed more
  than a swap: `mobile.css` was overriding three sizes with literals at exactly the widths where the
  floor matters most; the two `em` sizes looked relative but were not, because nothing between them
  and the root sets a font-size, so they resolved against the browser default and were as fixed as a
  px; and `.tactical-action-wrap kbd` carried `font:700 .72rem inherit`, which the browser drops
  whole -- a CSS-wide keyword is not a legal family name -- so that keycap had never been styled by
  it at all. It is longhands now, and the shortcut caps finally use the app's own mono face.
- **Panels reveal as they scroll into view**, driven by an `animation-timeline: view()` timeline
  rather than a clock. That distinction is load-bearing: `replaceIfChanged` rebuilds a panel whenever
  one of its numbers moves, so a time-based entrance would restart on every rebuild and flicker for
  the whole run. A layout-derived timeline renders a rebuilt panel at its correct progress instead.
  Where the timeline is unsupported, or the page does not scroll, the keyframes never apply and the
  panels simply render.
- **Ambient depth behind the shell.** The noise overlay keeps its grid and gains three blurred blobs
  that drift on a fixed, composited layer. Desktop only, and off under reduced motion: a phone is
  already spending its frame budget on the world canvas.
- **Hover and focus became one system.** One lift, one ring, one glow across every card type, a light
  sweep across the buttons that commit a decision, and themed thin scrollbars on all five scroll
  surfaces. None of it costs anything at rest -- nothing here animates unless a pointer is on it.

Reduced motion silences the drift, the sweep and the reveals; the shell's ambient blobs stop
outright rather than resting on their end keyframe. Four new tests pin the invariants rather than the
values: a literal radius, a literal font size in either stylesheet, a literal size or a dropped
`inherit` inside a `font:` shorthand, a time-based reveal, or a reveal that reaches the canvas host
all fail the build.

## v1.12.0 a game that explains itself

v1.12.0 answers the one complaint the mechanics could not: players could not tell where, what or why
anything was happening. Nothing about balance, content or rendering moved -- `SAVE_VERSION` stays at
4 and no rule module changed its numbers. What changed is that the game now says what it is doing.

**An interactive first run.** A new Machine opens on a twelve-step guided run that walks one
civilization from `START CIVILIZATION` to its harvest and then to its report. Every step answers the
same three questions -- what this is, where it is on screen, why it decides anything -- and a step
that teaches a move is cleared by *making* the move, not by clicking past it. The card is a coach
mark, never a modal: ignoring it entirely still plays a normal game, it collapses to one line, and
SKIP is one click. A save that has already harvested never sees it, and `REPLAY GUIDED RUN` in the
Machine view brings it back at any time.

**A run report after every run.** Ending a civilization -- controlled, forced, collapsed, abandoned,
or a Convergence attempt -- now produces a report at the top of the Machine view: how the run
developed as an inline Development/Entropy/Stability curve plus its era and phase transitions with
the second each happened at, why it ended in the words of the numbers that ended it, exactly which
resources it farmed and each one's share of the yield, and a set of lessons derived from that run's
own figures rather than from a table of tips. An abandoned run reports zeros, because zero is what it
paid.

**A live situation line.** Every run carries one sentence saying what is happening, one saying why,
and one naming the single move it suggests -- recomputed from the live run through a priority ladder,
so it stays true outside the tutorial too. Cascade, imminent collapse, an open decision, critical
Entropy, the harvest window, Attention, Awareness, Sanity, a Premature run, the credit cap, a closing
window and an open Directive objective each resolve to their own reading. The Machine view has its
own version for what to do between runs.

**A permanent explanation layer.** `FIELD MANUAL` in the Machine view explains all six systems and
every term in them -- what it is, where it is on screen, why it matters -- and is readable from the
first second with nothing to unlock. The `?` button next to the resource bar toggles EXPLAIN, which
annotates every panel in both views with what it is for, and expands the world strip's abbreviations
inline for touch devices that have no pointer to reveal a title with. Each strip column also carries
its full name as a title.

The per-frame contract is unchanged. The run trace samples on an interval and self-downsamples to a
fixed budget, so a long run keeps its whole shape at a coarser resolution instead of losing its
beginning. The guided step and the EXPLAIN toggle are discrete bands in the structural render keys.
The situation stays out of them: it is selected in part by the harvest call, whose two sides both move
continuously, so its severity and its sentences ride the live refresh instead — exactly like the
harvest call itself, and for the same reason. The guided run's highlight is rendered into the panel's own class list rather than added
to the DOM afterwards, so it cannot read as a diff and rebuild the column on every pass.

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

## Ported game systems

- 185 production interventions: 75 in the frozen generated catalog, three scheduled Entropy crises,
  twelve Apotheosis events, 36 pathless interventions, a second four-step chain for each of the ten
  paths, one extra dominance-gated consolidation per path, and three branching chains whose
  consequences are scheduled by the branch the player took
- 389 individually written choice actions and consequence descriptions
- deterministic weighted scheduling: one draw per intervention per run while unseen eligible
  interventions remain, then freshness-weighted repeats; six-event recency window throughout
- exact before/after decision feedback and state-reactive visual impulses
- shared Control Capacity with Stabilize, Accelerate, Probe, and Entropy Vent tactical actions
- keyboard shortcuts 1/2/3/4 plus touch-safe action controls
- escalating Entropy, Containment requirements, and collapse pressure
- deterministic per-Civilization Directive offers, objectives, and Trait previews
- Premature, Established, Transcendent, Ascendant, and Singular Harvest Grades as bands over Cultivation Depth
- Cultivation Credits with an 18-credit Universe consumption requirement
- 10 civilization paths with dominant and secondary tendencies
- 12 traits
- 12 Machine upgrades
- 8 Universe upgrades
- 6 Axiom upgrades
- 6 Directives
- 6 Breeding Matrices
- layered Machine Insight progression and resource unlocks
- Controlled and Chaotic Harvest
- Universe and Multiverse prestige
- layered parallax civilization world that grows from tent camps to arcology-scale cities
- cached structural scenery with throttled atmospheric and settlement animation
- path- and trait-reactive civilization visuals
- local browser saves through `localStorage`
- offline play after the first successful load through the app service worker
- touch-safe portrait and landscape layouts with safe-area support
- device-pixel-ratio cap of 2 for the Canvas renderer
- no offline progression

## v1.5.0 balance curve

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

## Renderer behavior

The production boot uses the built-in deterministic Canvas renderer. Structural scenery is cached and rebuilt only when meaningful state bands change; atmosphere, settlement lights, traffic, and decision impulses update independently. There is no second renderer and no game framework: the Civilization world is drawn entirely with Canvas 2D.

## Save data

Version 1.11.0 writes the v4 save format and migrates what it finds. The `localStorage` key is unchanged, and a v1, v2 or v3 payload is brought forward with its progress intact rather than discarded; a save from a newer build loads in compatibility mode; a payload the loader could not read at all is preserved in a backup entry instead of being overwritten. Godot saves remain unsupported. The game has no offline progression.

Historically — up to v1.10.0 — a version gate discarded every payload whose `saveVersion` did not match, so the v1.5.0 move to the v3 format erased existing v2 progress. That gate is gone.
