import type { GameState, TutorialFact, TutorialState, TutorialStatus } from './types.js';

// The guided first run. It is a cursor over an ordered, declarative step list -- no timers, no
// scripted state, no branching. A step is cleared either because the player acknowledged it or
// because a monotonic *fact* about their play was recorded, which is what keeps it honest: the
// tutorial can only ever be ahead of the player by one step, and it cannot strand itself on a step
// whose run has already ended.
//
// Presentation-only, like `visualMemory`: no progression, pressure, harvest or scheduler rule reads
// `state.tutorial`.

// The facts a step may be gated on, as data, so a stored save can be filtered against the set this
// build actually declares.
export const TUTORIAL_FACTS: ReadonlyArray<TutorialFact> =
  ['run_started', 'intervention_resolved', 'tactical_used', 'harvest_completed'];

export interface TutorialStep {
  id: string;
  title: string;
  // The three questions every step answers, in the order a confused player asks them.
  what: string;
  where: string;
  why: string;
  // The move that clears the step, or '' when reading it is the whole move.
  action: string;
  // A CSS selector the UI highlights while the step is current. '' means the step is about the game
  // rather than about a surface.
  anchor: string;
  // Which phase the step is written for, so the UI can say "go back to the Machine" instead of
  // silently pointing at a panel that is not on screen.
  phase: 'machine' | 'civilization';
  // '' makes the step acknowledge-only; otherwise the fact that clears it.
  requires: TutorialFact | '';
}

export const TUTORIAL_STEPS: ReadonlyArray<TutorialStep> = [
  {
    id: 'overview',
    title: 'You are the Machine',
    what: 'This is an engine that grows civilizations in order to consume them. One civilization at a time; one attempt is called a run.',
    where: 'You are in the Machine view. It is where you spend what the last run paid and decide what the next one is.',
    why: 'Nothing accumulates in this view. Every resource in the game comes out of a run that you ended deliberately.',
    action: '',
    anchor: '.machine-hero',
    phase: 'machine',
    requires: '',
  },
  {
    id: 'run_build',
    title: 'Build the run before you start it',
    what: 'The next civilization already exists as a seed, so its starting traits can be shown exactly rather than promised.',
    where: 'The NEXT CIVILIZATION panel. Once Directives unlock, three drafted offers appear here too.',
    why: 'A run cannot be edited once it starts. This panel is the only place its shape is still yours to choose.',
    action: 'Press START CIVILIZATION.',
    anchor: '.run-preparation',
    phase: 'machine',
    requires: 'run_started',
  },
  {
    id: 'world_read',
    title: 'The world is the state',
    what: 'The canvas draws the civilization from its live numbers -- settlements, factions and damage are all read from the same state the panels show.',
    where: 'The strip over the world: ERA, DEV, STB, SAN, AWR, ATT, ENT. Drag the world to look around it.',
    why: 'It means nothing on screen is decoration. If the world changes, a number changed, and the strip says which.',
    action: '',
    anchor: '.world-state-strip',
    phase: 'civilization',
    requires: '',
  },
  {
    id: 'situation',
    title: 'What is happening, and why',
    what: 'The SITUATION line states the run’s current dominant pressure, the cause behind it, and the move it suggests.',
    where: 'Directly under the world, above everything else in the run.',
    why: 'It is recomputed from the live run rather than scripted, so it stays true for the whole game, not only this tutorial.',
    action: '',
    anchor: '.situation-banner',
    phase: 'civilization',
    requires: '',
  },
  {
    id: 'intervention',
    title: 'Interventions are the decisions',
    what: 'Every so often the civilization forces a decision. The simulation is paused while one is open -- years, Development and Entropy all stop.',
    where: 'The CURRENT INTERVENTION panel. Each choice carries a prediction of what it will do.',
    why: 'Choices are what push the civilization down a path, and a run needs three resolved interventions before it can pay anything at all.',
    action: 'Resolve the first intervention by taking one of its choices.',
    anchor: '.intervention',
    phase: 'civilization',
    requires: 'intervention_resolved',
  },
  {
    id: 'feedback',
    title: 'Every decision reports itself',
    what: 'The panel that just appeared lists the exact before and after of every metric the choice moved, plus anything it added.',
    where: 'DECISION RESOLVED, immediately under the intervention.',
    why: 'This is the answer to "what did that do". It is exact, so a run can be understood instead of guessed at.',
    action: '',
    anchor: '.decision-feedback',
    phase: 'civilization',
    requires: '',
  },
  {
    id: 'tactical',
    title: 'Four moves, three charges',
    what: 'Stabilize, Accelerate, Probe and Entropy Vent, on keys 1 to 4. Each costs Control Capacity, and each charges Entropy for what it gives you.',
    where: 'The TACTICAL ACTIONS rail. The pips at its top are the Control you have left.',
    why: 'Control Capacity is the hard budget on steering a run. It refills only when the civilization enters a new Era.',
    action: 'Spend one tactical action. Probe (3) is the cheapest at 1 Control, but it needs an open intervention; Accelerate (2) works any time.',
    anchor: '.command-rail',
    phase: 'civilization',
    requires: 'tactical_used',
  },
  {
    id: 'pressure',
    title: 'Entropy is the clock',
    what: 'Entropy only rises, and it rises faster the more years the civilization has lived. At 25, 50 and 75 it forces a containment crisis; at 100 the run cascades.',
    where: 'The ENTROPY readout in the PRESSURE & HARVEST rail, with CASCADE IN Xs under it.',
    why: 'That number is the deadline every other decision is measured against. Only Entropy Vent and Containment upgrades push it back.',
    action: '',
    anchor: '.pressure-rail',
    phase: 'civilization',
    requires: '',
  },
  {
    id: 'depth',
    title: 'Depth is the payout',
    what: 'Cultivation Depth is Development / 80 plus 1.5 per endgame state. It sets the Harvest Grade and the yield multiplier.',
    where: 'The HARVEST GRADE readout, with the next band and the computed stay-or-harvest call under it.',
    why: 'Premature pays a flat 0.2 and no Cultivation Credits. Leaving Premature is the first real goal of every run.',
    action: '',
    anchor: '.harvest-readout',
    phase: 'civilization',
    requires: '',
  },
  {
    id: 'harvest',
    title: 'Stopping is the skill',
    what: 'A controlled harvest banks the full grade. A cascade or a collapse takes it anyway, at about 40% fewer credits.',
    where: 'The three buttons at the bottom of the PRESSURE & HARVEST rail.',
    why: 'The harvest call above them compares the seconds to your next credit against the seconds the run can still reach. When it says HARVEST NOW, the next credit provably does not fit.',
    action: 'End this run with CONTROLLED HARVEST when you are ready.',
    anchor: '.harvest-actions',
    phase: 'civilization',
    requires: 'harvest_completed',
  },
  {
    id: 'report',
    title: 'Read the run back',
    what: 'The RUN REPORT states how the run developed, why it ended, what it paid, and what its own numbers suggest doing differently.',
    where: 'At the top of the Machine view after every run. It stays until you dismiss it.',
    why: 'It is where a run turns into a decision about the next one instead of a number that scrolled past.',
    action: '',
    anchor: '.run-report',
    phase: 'machine',
    requires: '',
  },
  {
    id: 'manual',
    title: 'Nothing here is hidden',
    what: 'The FIELD MANUAL explains every term in the game, and EXPLAIN in the top bar annotates every panel with what it is for.',
    where: 'The FIELD MANUAL panel in the Machine view; the EXPLAIN button next to the resource bar, on every screen.',
    why: 'Both are permanent. You never have to remember what a number meant -- you can ask the screen it is on.',
    action: '',
    anchor: '.field-manual',
    phase: 'machine',
    requires: '',
  },
];

const STEP_INDEX: Readonly<Record<string, number>> = Object.fromEntries(TUTORIAL_STEPS.map((step, index) => [step.id, index]));

export function tutorialStepById(id: string): TutorialStep | null {
  const index = STEP_INDEX[id];
  return index === undefined ? null : TUTORIAL_STEPS[index]!;
}

export function newTutorialState(status: TutorialStatus = 'pending'): TutorialState {
  return { version: 1, status, stepId: '', acknowledged: [], observed: [], collapsed: false };
}

// A stored tutorial that no longer describes anything real -- an unknown step id, a status this
// build does not know -- is reset rather than trusted. It costs the player nothing: the worst case
// is being offered the guided run again, which is always skippable in one click.
export function normalizeTutorialState(state: TutorialState | null | undefined): TutorialState {
  const raw = state ?? newTutorialState();
  const status: TutorialStatus = raw.status === 'active' || raw.status === 'completed' || raw.status === 'skipped' ? raw.status : 'pending';
  const stepId = tutorialStepById(raw.stepId) ? raw.stepId : '';
  return {
    version: 1,
    status,
    stepId,
    acknowledged: Array.isArray(raw.acknowledged) ? raw.acknowledged.filter(id => Boolean(tutorialStepById(id))) : [],
    // Facts are filtered the same way step ids are: a fact this build no longer declares would ride
    // along in the save forever, and a step gated on a renamed one would never clear.
    observed: Array.isArray(raw.observed) ? [...new Set(raw.observed.filter(fact => TUTORIAL_FACTS.includes(fact)))] : [],
    collapsed: Boolean(raw.collapsed),
  };
}

export function recordTutorialFact(state: TutorialState, fact: TutorialFact): boolean {
  if (state.observed.includes(fact)) return false;
  state.observed.push(fact);
  return true;
}

/**
 * The facts a *currently running* civilization already proves. A replay starts from the top, but it
 * must not ask for something the current phase cannot deliver -- "resolve your first intervention"
 * is unanswerable ten interventions into a run. Deliberately says nothing about finished runs: a
 * player who asked to see the guided run again wants to be walked through a harvest, not past it.
 */
export function liveTutorialFacts(civ: { eventChoices: number; tactical: { actionUsage: Record<string, number> } } | null): TutorialFact[] {
  if (!civ) return [];
  const facts: TutorialFact[] = ['run_started'];
  if (civ.eventChoices > 0) facts.push('intervention_resolved');
  if (Object.values(civ.tactical.actionUsage ?? {}).some(count => (Number(count) || 0) > 0)) facts.push('tactical_used');
  return facts;
}

export function stepCleared(state: TutorialState, step: TutorialStep): boolean {
  return step.requires ? state.observed.includes(step.requires) : state.acknowledged.includes(step.id);
}

export function currentStep(state: TutorialState): TutorialStep | null {
  if (state.status !== 'active') return null;
  return tutorialStepById(state.stepId) ?? TUTORIAL_STEPS[0]!;
}

/**
 * Walk the cursor past every step the player has already satisfied. Returns true when anything
 * moved, which is the engine's cue to persist -- a step change is rare, so it is a cheap save,
 * unlike the per-frame writes the root instructions forbid.
 */
export function advanceTutorial(state: TutorialState): boolean {
  if (state.status !== 'active') return false;
  let index = STEP_INDEX[state.stepId] ?? 0;
  const startedAt = index;
  while (index < TUTORIAL_STEPS.length && stepCleared(state, TUTORIAL_STEPS[index]!)) index++;
  if (index >= TUTORIAL_STEPS.length) {
    state.status = 'completed';
    state.stepId = '';
    return true;
  }
  if (index === startedAt && state.stepId === TUTORIAL_STEPS[index]!.id) return false;
  state.stepId = TUTORIAL_STEPS[index]!.id;
  return true;
}

export function acknowledgeStep(state: TutorialState): boolean {
  const step = currentStep(state);
  // A step gated on a fact is not something the player can dismiss: the CONTINUE button is not
  // offered for one, and clicking through anyway would skip the only part that teaches.
  if (!step || step.requires) return false;
  if (!state.acknowledged.includes(step.id)) state.acknowledged.push(step.id);
  advanceTutorial(state);
  return true;
}

export interface TutorialStepView {
  id: string;
  index: number;
  total: number;
  title: string;
  what: string;
  where: string;
  why: string;
  action: string;
  anchor: string;
  phase: 'machine' | 'civilization';
  // True when reading is the whole step, so the UI shows CONTINUE rather than a waiting hint.
  canAcknowledge: boolean;
  // Set when the step belongs to the other phase, so the card can say where to go instead of
  // pointing at a panel that is not rendered.
  offPhaseHint: string;
}

export interface TutorialView {
  status: TutorialStatus;
  visible: boolean;
  collapsed: boolean;
  // Offered in the Machine view whenever the guided run is not currently running.
  replayable: boolean;
  step: TutorialStepView | null;
}

export function tutorialView(state: TutorialState, phase: GameState['phase']): TutorialView {
  const step = currentStep(state);
  const index = step ? STEP_INDEX[step.id]! : TUTORIAL_STEPS.length;
  const offPhase = step && step.phase !== phase;
  return {
    status: state.status,
    visible: state.status === 'active' && Boolean(step),
    collapsed: state.collapsed,
    replayable: state.status !== 'active' && phase === 'machine',
    step: step ? {
      id: step.id,
      index: index + 1,
      total: TUTORIAL_STEPS.length,
      title: step.title,
      what: step.what,
      where: step.where,
      why: step.why,
      action: step.action,
      anchor: offPhase ? '' : step.anchor,
      phase: step.phase,
      canAcknowledge: !step.requires,
      offPhaseHint: offPhase
        ? step.phase === 'machine'
          ? 'This step is about the Machine view. End or abandon the run to get back to it.'
          : 'This step is about a running civilization. Start one to continue.'
        : '',
    } : null,
  };
}
