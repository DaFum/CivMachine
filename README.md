# Reality Consumption Engine — App Edition v1.20.1

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
- an interactive twelve-step guided first run, skippable and replayable
- a post-run report: the run's curve, why it ended, what it farmed, and what to change
- a live situation line and a permanent Field Manual with an EXPLAIN mode on every panel

## v1.20.1 one-phase progression staging

v1.20.0 fixed the campaign curve and a manual five-run playthrough confirmed it: the first Universe
arrives after five to seven meaningful Civilizations, a bare Machine is clearly weaker than a built
one, and no single run pays for a prestige. v1.20.1 changes none of that. It fixes what that
playthrough exposed *beside* the curve -- moments where the game handed over a whole catalog at once,
or named something it had not revealed, or reported a number that was not the number.

**A prestige reveals a decision, not a catalog.** Breeding Matrices unlock as a system at the second
Universe, but the six matrices behind it were gated on Machine Insight alone -- and Insight passes 17
before the first Universe is consumed. Every gate was therefore already clear when the system opened,
so the prestige meant to introduce one new choice emptied all six at once. They are staggered over
Universes now, two at the second, third and fourth, with the Insight numbers kept as a floor. The
same reasoning already applies to the Universe upgrade layer.

**Existence is no longer banked before it exists.** Every harvest credited all four currencies from
the first run, so Existence accumulated invisibly through the whole Expansion game -- measured, 1714
units were already in the bank when Transcendence finally named it, and the reveal arrived with
several runs of purchasing power attached. A resource the Machine has not identified now pays nothing,
is not listed in the run report, and is not named in the Machine Record. The run that carries a
civilization into Transcendence is paid its Existence in full; the runs before it are not paid
retroactively. Measured on the same seeds, the Machine levels affordable in that single step fell from
**9 to 5**, and the Existence upgrade levels bought in it from **7 to 3**. No global yield was reduced
to get there, and the Existence Furnace kept its gate: three levels across two families is what an
ordinary run of that era already funds, and moving the Furnace behind the first Universe was measured
and rejected because it made the first-Universe step busier rather than the Transcendence step
quieter.

**A harvest's own discoveries are settled before it is paid.** Paradox is identified *by* the first
controlled harvest, so gating the payout on identification without ordering the two would have made
the run that reveals Paradox the one run not paid for it.

**Next Discoveries reads the rules it describes.** The runtime requirements were an `if` chain and the
sentences on screen were hand-written strings beside it, so the preview promised Breeding Matrices
after "your first Universe" while the rule asked for two, and Multiverse prestige had moved to three
Universes while its preview still said two. Both now come from one table of structured requirements:
the runtime checks it and the interface composes its sentence from it, in either language.

**An Entropy threshold is logged as the threshold.** A tick advances Entropy past the line before the
crossing is noticed, and the record printed the Entropy on the clock -- 27 and 29 for the 25 crisis,
51 and 54 for the 50. The pressure system returns the threshold it actually crossed, and every
crossing in a tick is reported rather than only the last.

**Two clocks, both named.** `LASTED` was simulation time presented as though it were wall-clock, which
at 4x understated nothing and overstated everything. The report shows `SIMULATION TIME` (accelerated
in-game seconds) and, when it was measured, `ACTIVE REAL TIME` -- the wall-clock the simulation
actually ran for. Neither advances while an intervention waits on the player.

**Simulation speed is announced as the progression it is.** 2x at Machine Insight 3 and 4x at 10 are
unchanged and still survive prestige. Both steps are now visible in the rail from the first run with
the Insight they cost, and each is announced once when it unlocks. A v4 save that bought its speed
from Temporal Injector keeps it and is not told about it as news.

**A reward explanation names the reward.** An unmet Directive objective was described as worth "about
N credits", computed as `round(credits * 0.15) + 1` -- a quantity the game computes nowhere. It now
states the two rewards it pays: +15% harvest resources and exactly +1 Cultivation Credit.

**An ordinal is not a tally.** `Transcendence Reached 1 / 2` and `Ascendant Harvest 2 / 3` read as
partly-finished checklists; the numbers were era and grade indices. Those milestones name their state
now -- `CURRENT: TRANSCENDENCE / TARGET: APOTHEOSIS`, `BEST: TRANSCENDENT / TARGET: ASCENDANT` -- while
real counts like `3 / 10 controlled harvests` stay counts. No milestone reward changed.

**The run phase no longer borrows an Era's name.** Drama phases 0 and 1 were called Emergence and
Expansion against Eras EMERGENCE and EXPANSION, so a single report could discuss two unrelated systems
in the same words. They are Founding and Growth; the ids and trace values are untouched.

**The Civilization Record no longer prints the same line twice.** 103 of the catalog's 310
`path_history` entries are authored as `"<title> -> <label>"`, which is word for word what the record's
automatic choice line already writes -- so a third of the interventions carrying path copy logged their
sentence twice in a row. The duplicate is dropped where the two sentences meet rather than rewritten in
103 content entries and their translations: the duplication is a property of the pair, it holds in both
locales because both sides are composed from the same localized title and label, and it cannot return
with new content. Path copy that says something new is still recorded.

`aggressive_human` joins the campaign strategy table: Accelerate at every opportunity, the Development
purchase tilt, and every intervention steered toward the Directive objective -- the combination the
manual playthrough used and no existing row modelled. It is added beside `aggressive_accelerate` and
`directive_chaser`, not in place of either.

### Measured, before and after

`npm run balance` prints the full table; the campaign regressions assert the bands.

| Measure | v1.20.0 | v1.20.1 | Target |
| --- | ---: | ---: | ---: |
| Civilizations to the first Universe (purchase tilts) | 5-6 | 5-6 | 5-7 |
| Systems unlocked in the first-Universe step | 1 | 1 | 1-2 |
| Breeding Matrices unlocked at the second Universe | 6 | 2 | <=2 |
| Breeding Matrices at U2 / U3 / U4 | 6 / 6 / 6 | 2 / 4 / 6 | staggered |
| Existence in the bank when it is first revealed | 1714 | 608 | earned this run |
| Machine levels affordable at the first Transcendence | 9 | 5 | <=7 |
| Existence upgrade levels bought in that step | 7 | 3 | <=4 |
| Machine Insight gained at the first Transcendence | 3 | 3 | unchanged |
| Cultivation Credits from one run, worst | 10 | 10 | < 18 |
| Reality Lattice levels bought in one step, worst | 2 | 2 | <=2 |
| Civilizations to the first Multiverse (survival_first) | 15.75 | 15.75 | unchanged |
| `path_history` entries duplicating the choice line | 103 of 310 | 0 shown | none |
| Tests | 435 | 458 | -- |

## v1.20.0 the campaign curve

v1.20.0 rebalances the meta-economy above the run. The individual run was healthy; the loop above it
was not. Measured on v1.19.0 from an empty save, a competent player reached the first Universe in
**three runs**, and the second of those banked 2480 Causal Mass -- enough to buy 21 Machine levels in
one purchase step and to take a fresh Machine from Containment 0 to Containment 10.

Five changes close that loop, and a new campaign-level test suite holds it closed.

**Depth pays less the deeper it goes.** Raw harvest value already scales with Development, and
Development scales with run length, so multiplying it by a yield multiplier that *also* rose linearly
with Depth made a run quadratic in its own duration. The multiplier is now concave: within a few
percent of the old straight line for the Depth an opening run reaches, and 2.7x lower at the Depth
v1.19.0 reached on run three.

**Cultivation Credits cap at 10, not 20.** A Universe costs 18. The old cap sat above it, so a single
long run paid for a whole prestige; two successful Civilizations are now the arithmetic floor for a
Universe at every stage of the game.

**Every Harvest Grade boundary is a Cultivation Credit step.** Grades and credits used to be
independent curves that disagreed by design -- a run 0.4 Depth from TRANSCENDENT was still 1.4 Depth
from its next Credit, so the louder signal was the less valuable one. ESTABLISHED, TRANSCENDENT,
ASCENDANT and SINGULAR now sit exactly on credits 1, 3, 6 and 10, and the live rail and the run report
name the credit a band pays.

**Containment is priced as the compounding stat it is.** Reality Lattice still opens at 60 Causal
Mass, because a first weak run has to afford one real survival improvement -- but the ladder then
climbs 600, 1800, 4500 rather than 93, 144, 223, and the other three Containment modules are laddered
with it so that pricing one does not simply move the stacking to the next. From the second purchase
onward the survival build is assembled rather than stacked.

**Entropy Vents get dearer as a run spends them.** Containment sets the cascade horizon, but a run
that kept resolving interventions kept being handed Stability and Control back, and a flat-priced vent
turned both straight into more run: at Containment 3, runs finished anywhere between 300 s and 900 s.
Each vent now costs 3.5 Stability more than the one before it -- 10, 13.5, 17, 20.5, linear in the
base cost rather than compounding -- and pays proportionally more Paradox, so what the escalation
rations is run length, not the Paradox economy. A vent the run cannot pay for in full is refused
rather than part-paid.

Alongside those, three systems that were traps became decisions:

- **Simulation speed is permanent progression.** 2x at Machine Insight 3, 4x at 10. It used to be sold
  by Temporal Injector, a Machine upgrade -- which meant re-buying the same fast-forward button after
  every Universe. Temporal Injector now buys what it is named after: a Temporal Injection worth 1150
  years and 48 Development at level 3, against 450 and 6 before. Saves that had already bought 2x or
  4x keep it; see the save note below.
- **Prediction Core pays out.** An intervention you spent Control probing lands 12% softer per level,
  to a maximum of 50%. The module still does nothing at all until you Probe, which is its identity.
- **Accelerated Development no longer solves its own objective.** It multiplied Development and then
  asked for Development; the objective now asks for Development 400 *in the Transcendence era*, which
  is the half the Directive cannot buy for the player. On a bare Machine it clears no runs at all.

The first Universe also stopped arriving as an avalanche: it unlocks Universe upgrades and nothing
else. Breeding Matrices wait for the second Universe, Multiverse prestige for the third, and Existence
is now identified when a civilization first reaches Transcendence rather than in the same step.

### Measured, before and after

Same modelled player, same seeds, both engines. `npm run balance` prints the full table.

| Measure | v1.19.0 | v1.20.0 | Target |
| --- | ---: | ---: | ---: |
| First run, seconds (median of 60 seeds) | 130 | 130 | unchanged |
| First run, affordable Machine levels | 3 | 2 | 1-2 |
| Containment gained per run, median / p90 | 5 / 15 | 1 / 3 | 1-2 / <=3 |
| Reality Lattice levels bought in one step, worst | 6 | 2 | <=2 |
| Cultivation Credits from one run, worst | 20 | 10 | < 18 |
| Civilizations to the first Universe | 3 | 5 | 5-7 |
| Civilizations per Universe, U2 / U3 / U4 | 2 / 2 / 1 | 3 / 3 / 3 | 3-4 then ~2 |
| Systems unlocked in the first-Universe step | 2 | 1 | 1-2 |
| Deep run at a mature build, minutes | 27+ | 11.5-13.1 | 12-15 |
| Civilizations to the first Multiverse | 8 | 15 | measured |
| Civilizations to Great Convergence readiness | 27 | 83 | measured |
| Simulated hours to Convergence readiness | 6.0 | 7.7 | measured |
| Cultivation actually waited through | 6.0 | 2.0 | measured |
| Strongest line to the first Universe | deep_run, 2 runs | survival_first, 5 runs | no runaway |
| Spread across the seven purchase tilts | 1.33x | 1.40x | no dominant build |

The run lifecycle the curve now produces, measured by build:

| Build | Containment | Run length | Depth | Credits | Grade |
| --- | ---: | ---: | ---: | ---: | --- |
| bare Machine | 0 | 2.1 min | 1.7 | 1 | ESTABLISHED |
| early | 2 | 5.8 min | 5.1 | 3 | TRANSCENDENT |
| mid | 4 | 9.1 min | 10.0 | 6 | ASCENDANT |
| mature | 8 | 11.7 min | 16.7 | 10 | SINGULAR |

### How long the campaign is

The earlier draft of these notes said 6.2 simulated hours and assumed a player's decision time closed
the gap to the 8-12 hour reference. That was an assumption wearing a number, and this release is the
one that makes it wrong: simulation speed is permanent progression now, so a player runs at 4x for
most of a campaign and does *not* sit through simulated time at all.

Measured to Great Convergence readiness, balanced tilt:

| | |
| --- | ---: |
| Civilizations | 83 |
| Universes / Multiverses | 20 / 5 |
| Simulated cultivation | 7.7 h |
| **Cultivation actually waited through, at the speeds the player has earned** | **2.0 h** |
| Intervention decisions | ~2,500 |
| Purchase phases | 83 |

So the campaign's length is not waiting; it is roughly 2 hours of cultivation plus about 2,500
decisions. Wall-clock is charged per tick rather than per run, because Machine Insight can cross a
speed threshold mid-run and billing the whole run at the speed it ended on would credit the player
with seconds they did sit through. Whether that totals 8-12 hours depends entirely on how long a decision takes, which is the
one quantity a simulation cannot measure -- at 5 seconds each it is under 5 hours, at 12 seconds each
it is over 10. The harness reports the two halves separately and does not multiply them together into
a single confident figure.

No grind was added to reach a target. If the number wants to move, the honest levers are the decision
count and the Convergence gate, not the clock.

### Saves

`SAVE_VERSION` is 5. Balance changes alone never invalidate a save, and nothing here deletes earned
value: purchased levels, Machine Insight, milestones, Universes and Axioms all carry forward
untouched. The one reinterpretation is Temporal Injector, which no longer means "2x simulation speed",
so the v4 -> v5 step records the speed a save had already unlocked and the engine keeps honouring it
whatever Machine Insight says. A recorded Harvest Grade is likewise kept, even where the new bands
would place the same Depth one band lower.

### Balance tooling

`npm run balance` simulates whole campaigns -- an empty save played forward through Machine purchases,
Universes, Multiverses and Axioms under eleven named strategies -- and prints the curve.
`npm run balance:full` widens the seed set and adds the Great Convergence horizon.
`public/game/tests/campaign.test.mjs` asserts the bands in CI.

## v1.19.0 mobile UX & game-focus pass

v1.19.0 improves CivMachine's mobile player experience with enlarged, readable typography, responsive single-line HUDs, a consolidated situation and decision surface, 1-column tactical actions with touch targets, enhanced settlement visibility, and grouped secondary records.

## v1.18.0 visual renderer release

v1.18.0 synchronizes release metadata, package versions, service worker cache, and documentation for the visual renderer release.

## v1.17.0 fewer lookups per tick, and a sanitizer that cannot be clobbered

v1.17.0 is security and performance only. `SAVE_VERSION` stays at 4, `rules.ts` and `types.ts` are
untouched, no balance number moved, and every player-facing string reads exactly as it did in
v1.16.0. What changed is how often the engine walks a list, and what the panel sanitizer trusts.

The sanitizer in `ui/app.ts` read `node.tagName`, `node.attributes` and `node.removeAttribute` off
each element it was inspecting. Those are the names a DOM-clobbering payload can shadow: an element
that carries `name="tagName"` hands the sanitizer its own attribute node instead of the tag name, and
the `SCRIPT` comparison quietly stops matching. All three now come from `Element.prototype` --
the two getters captured with `getOwnPropertyDescriptor`, `removeAttribute` called through `.call()`
-- so what the sanitizer checks is the element's real tag and the element's real attributes, whatever
the markup calls itself.

Four lookups that ran on the hot path became indexed:

- events are indexed by id at construction, so `eventById` is a `Map.get` rather than a scan of 75
  events -- and the run report resolves every event it names through it
- events are also bucketed by the eras they are valid in, so event selection filters the bucket for
  the civilization's era instead of the whole catalog and the per-event era check disappears from
  `eventEligible` (the bucket already answers it)
- the runtime bonus key map was rebuilt inside the effect loop, once per effect per contributor, on
  every recalculation; it is a module constant now
- `PATH_IDS.includes` in the path membership checks is a `Set.has`, and `completedEvents` /
  `choiceFlags` are checked through cached `Set`s rather than `Array.includes`, which is what
  `eventIsEligible` spends its time on when a run has accumulated a few dozen of each

Those two `Set`s live in a `WeakMap` keyed on the path state, not on the path state itself. That is
the point: a cache stored on the state would be serialized into the save, and the save is meant to
record what was played and nothing else. Keyed weakly, it is rebuilt when the array it mirrors is
replaced -- which is also what makes a restored save arrive with a cold cache and no stale entries.

`mergedChoiceEffects` copied the choice's effects with `structuredClone` and now spreads them. All
478 effect entries in the shipped catalog are scalars, and the merge writes numbers, so the shallow
copy leaves the catalog as untouched as the deep one did.

The bundled dev server (`server.mjs`, which serves the folder locally and ships no code to the
browser) got the same treatment twice. It joined the request path onto the root and compared the
result as a string, so `..` segments were the only escape it could see; the root is resolved once and
the target is resolved again immediately before the read, so a symlink inside the served tree
pointing out of it is refused like any other escape.

The suite grew with the change rather than after it: `applyEffects`, `clampStats`, the consequence
profile accessors, `evaluateDirectiveObjective` and `objectiveForDirective` now have direct coverage,
and the engine's locale restore has a test for the storage-error path it always handled.

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

A few English strings did change, all for the same reason: an id had been standing in for a name.

- decision feedback named a gained flag by humanizing its id (`machine faith devout`) and now names it
  the way the catalog does, by the decision that set it (`Recognize the miracle`), with the localized
  kind beside it
- `NEW OPTION UNLOCKED` spelled the option's key out in capitals; it now uses the option's own name, so
  a matrix is a `Neural Bloom Matrix` rather than `NEURAL BLOOM` and an axiom keeps its whole name
- currencies and harvest grades are named from the catalog instead of humanized from their key, so
  `causal mass` reads `Causal Mass` and `at premature grade` reads `at Premature grade`

Two localization bugs found in review are fixed here too. `fmt` abbreviated large numbers with
`toFixed`, which always writes a decimal point, so a German player read `1.5K` next to a `1.234`
further down the same panel; all three branches go through the number locale now. And the *running*
Directive objective was read straight from the definition while only the drafted offers were
localized, so its card stayed English.

Decision feedback is written when a decision resolves but read for as long as its card is on screen,
which can outlive a locale switch. The ids travel with it now and the copy is resolved again on the
way out, so the card follows the language like every other live surface.

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

v1.14.0 is presentation only, like the release before it. `SAVE_VERSION` stays at 4, no rule module
moved, and the renderer draws exactly what it drew before -- every change is in the two stylesheets.

v1.13.0 collapsed radius and type to single sources and left the other two scales alone: colour and
spacing were still 224 literal hexes and 197 gaps across 24 distinct values, and the surface tokens
meant to prevent exactly that had been declared and then never used.

- five declared surface tiers replace ten near-identical darks, so a dozen panel types stop reading
  as a dozen designs
- one `--space` scale drives every gap, snapped from the values already in use
- a choice button was 92px holding 19px of text; sized to its content, it lifts the whole pressure
  rail above the fold
- the Entropy and Harvest gauges connect their labels to their right-aligned values with a leader
- meter tracks read as channels cut into the surface instead of near-invisible hairlines
- a phone gets 23px of viewport back, and `CONTINUE` stops rendering as `CONTI`

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
