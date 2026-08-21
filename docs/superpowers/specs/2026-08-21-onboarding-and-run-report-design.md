# Onboarding, live guidance and the post-run report — v1.12.0 design

## The problem

The game was legible only to someone who already understood it. Every number on screen was correct
and most of them were even labelled, but nothing on any surface answered the three questions a new
player actually has:

- **where** am I, and which of these panels is the one I am supposed to be looking at;
- **what** is this number, and what is it a number *of*;
- **why** did that just happen, and why does it matter to what I do next.

The v1.7.0 harvest call and the v1.10.0 decision feedback each solved one instance of the third
question. Neither generalised, and neither helped a player in their first ninety seconds, which is
where the game was being abandoned.

This release adds no mechanics. `SAVE_VERSION` stays at 4, no rule module changed a number, and the
survival-curve and first-run-economy medians in `core.test.mjs` are untouched. Everything below is
presentation.

## What ships

### 1. A guided first run — `game/tutorial.ts`

Twelve ordered steps covering one civilization from `START CIVILIZATION` to its report. Each step
carries `what`, `where`, `why` and, when it teaches a move, the `action` that clears it.

The step list is **declarative data, not a script**: a step is cleared either by acknowledgement or
by one monotonic `TutorialFact` — `run_started`, `intervention_resolved`, `feedback_seen`,
`tactical_used`, `harvest_completed` — recorded when the player performs the action. Two properties
follow from that, and both matter more than they look:

- **A gated step cannot be clicked past.** No CONTINUE button is rendered for one, and
  `acknowledgeStep` refuses it. Clicking through the only part that teaches would leave the player
  exactly where they started.
- **A step cannot strand the tutorial.** Facts are monotonic and persistent, so a step whose run has
  already ended is behind the cursor rather than blocking it. `advanceTutorial` is a pure walk over
  the list; it cannot loop and it terminates in `completed`.

A step written for the other phase reports an `offPhaseHint` and drops its anchor, so the card says
"start a run to continue" instead of highlighting a panel that is not rendered.

**Who sees it.** `createNewState` starts at `pending`; the engine promotes it to `active` on a Machine
that has never harvested and to `skipped` otherwise. A returning player gains the field through the
structural migration pass and is never dropped into an onboarding they finished a version ago.
`REPLAY GUIDED RUN` restarts it from the top, pre-observing only the facts the *currently running*
civilization already proves (`liveTutorialFacts`) — a replay should walk you through a harvest, not
past it, but it must not ask for a first intervention ten interventions into a run.

**The card is never a modal.** It is a coach mark: `role="region"`, no `aria-modal`, collapsible to one
line, skippable in one click. Ignoring it entirely plays a normal game.

### 2. A live situation line — `game/guidance.ts`

One sentence for what is happening, one for why, one for the single move it suggests. It is a total
priority ladder over the live run, not a script, so it stays true long after the tutorial ends:

    cascade → collapse imminent → open decision → terminal target → critical Entropy →
    harvest window → Attention → Awareness → Sanity → Premature → credit cap → closing →
    open objective → building

Each branch builds its sentences from the numbers that selected it, which makes every reading
checkable against the panels below it. `machineSituation` is the between-runs counterpart, ordered by
what is actually blocked: a Directive draft first, then a prestige that is available, then the report,
then an unspent bank.

### 3. A post-run report — `game/run-report.ts`

**The trace.** `recordRunTrace` is one comparison per tick and one push every `intervalSeconds`. When
the sample budget (40) fills, every second sample is dropped and the interval doubles — a long run
keeps its whole shape at a coarser resolution instead of losing its beginning to a sliding window.
`Civilization.trace` is optional and presentation-only, on exactly the same contract as
`visualMemory`: `tick()` writes it, the report reads it, no rule module may.

**The report.** Built once, at the moment a run ends, from the *same* `previewHarvestDetails` result
the payout used — so the report cannot disagree with what was banked. Every exit publishes one:
controlled, forced chaotic, stability collapse, abandoned, and both Convergence outcomes.

It answers four questions in the order they get asked:

1. **Why did it stop** — `reasonTitle` plus a `reasonDetail` quoting the year, Entropy and grade that
   ended it.
2. **How did it develop** — the inline Development/Entropy/Stability curve, and `runArc`: every era
   and drama-phase transition the trace saw, stamped with the second it happened at.
3. **What did it pay** — each resource with its share of the yield, and the total.
4. **What should change** — `runLessons`, derived from this run's figures: the exact Premature floor it
   missed, whether Stability or Entropy ended it, Control left unspent, an unmet Directive objective
   priced in credits, the distance to the next depth band, the credit cap.

An **abandoned run reports zeros.** The projection is what the run *would* have paid; printing it
anyway would be the one place the game lied about a number. The grade is kept, because it is what
makes the lesson ("a chaotic harvest would have paid something") checkable.

### 4. A permanent explanation layer — `data/help-topics.ts`

`FIELD MANUAL` explains all six systems and every term in them, in the same what/where/why shape,
readable from the first second with nothing to unlock. `EXPLAIN` (the `?` button) annotates every
panel in both views with what it is for, and expands the world strip's abbreviations inline for touch
devices that have no pointer to reveal a `title` with. Each strip column also carries its full name as
a `title`. `HELP_ABBREVIATIONS` and `EXPLAIN_NOTES` are both pinned by tests against the surfaces they
describe, so a new strip column or an unrendered note fails the build.

## The per-frame contract

The root instructions forbid two things, and this design respects both by construction:

- **Structural keys may not move on ticking numbers.** The guided step id, the collapsed flag, the
  EXPLAIN toggle and the situation *id* are all discrete bands, and they enter
  `civilizationRenderKey`. The situation *sentences* quote live seconds and metric values, so they
  ride the live refresh through `data-live` hooks — exactly like the v1.7.0 harvest call, and for the
  same reason.
- **Ticking may not write `localStorage` or rebuild controls.** `advanceTutorial` runs in `emit()`
  because every mutation that could record a fact ends in an emit; it is a pure array walk and it
  persists only on the rare pass where the step actually changed, which happens a dozen times per
  playthrough.

One further trap, found while building it: the guided run's highlight is **rendered into the panel's
own class list** via `focusClass`, never added to the DOM afterwards. `replaceIfChanged` compares
against the built HTML, so a class bolted on after the fact reads as a diff and rebuilds the column on
every pass — in the Machine view, that is a full rebuild twice a second.

## Save compatibility

`GameState` gains `tutorial`, `help` and `machine.lastRunReport`; `Civilization` gains an optional
`trace`. All four are additive, so no `SAVE_VERSION` bump and no migration step: the structural pass
back-fills them from `createNewState()`. `save-migration.ts` additionally rebuilds the tutorial
against this build's step list (`normalizeTutorialState`) and drops a malformed trace rather than
repairing it into a run that never happened — the same rule `visualMemory` already follows.
