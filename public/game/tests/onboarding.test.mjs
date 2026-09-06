import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GameEngine } from '../dist/game/engine.js';
import { buildViewModel, civilizationRenderKey } from '../dist/ui/view-model.js';
import {
  TUTORIAL_STEPS, acknowledgeStep, advanceTutorial, newTutorialState,
  normalizeTutorialState, recordTutorialFact, tutorialView,
  tutorialStepById, stepCleared, currentStep, liveTutorialFacts,
} from '../dist/game/tutorial.js';
import {
  REPORT_TIMELINE_ENTRIES, TRACE_BASE_INTERVAL_SECONDS, TRACE_MAX_SAMPLES,
  buildRunReport, recordRunTrace, runArc, runLessons, validRunTrace,
} from '../dist/game/run-report.js';
import { civilizationSituation, machineSituation } from '../dist/game/guidance.js';
import { EXPLAIN_NOTES, HELP_ABBREVIATIONS, HELP_SECTIONS } from '../dist/data/help-topics.js';
import { LOCALIZATION } from '../dist/data/localization.js';
import { runReportPanel, runCurve } from '../dist/ui/report-view.js';
import { tutorialOverlay, tutorialReplay } from '../dist/ui/tutorial-view.js';
import { fieldManual, explainNote, abbreviationLegend } from '../dist/ui/guide-view.js';
import { freshEngine, safestChoiceIndex } from './balance-harness.mjs';

const ERA_NAMES = ['EMERGENCE', 'EXPANSION', 'TRANSCENDENCE', 'APOTHEOSIS'];
const DRAMA_LABELS = ['Emergence', 'Expansion', 'Division', 'Transformation', 'Crisis'];

// A run that is deliberately kept alive until it can pay, then ended by the player. The report tests
// need a *controlled* harvest specifically, and the shared harness's policies let the run collapse.
function playToControlledHarvest(engine, seed, { minChoices = 4, maxSeconds = 900 } = {}) {
  assert.equal(engine.startCivilization(seed), true, engine.lastActionFailure);
  let elapsed = 0;
  while (engine.state.phase === 'civilization' && elapsed < maxSeconds) {
    const event = engine.currentEvent();
    if (event) { engine.chooseEvent(safestChoiceIndex(event)); continue; }
    const civ = engine.state.civilization;
    if (civ.era >= 1 && civ.eventChoices >= minChoices) { engine.harvest(false); break; }
    if (civ.tactical.entropy > 55) engine.useTacticalAction('vent');
    if (civ.stats.stability < 55) engine.useTacticalAction('stabilize');
    engine.tick(0.25);
    elapsed += 0.25;
  }
  assert.equal(engine.state.phase, 'machine', 'the run must have ended');
  return engine.lastRunReport();
}

// --- the guided run ------------------------------------------------------------------------------

test('a fresh Machine opens on the first guided step, a played one never sees it', () => {
  const fresh = freshEngine();
  const view = fresh.tutorialView();
  assert.equal(view.status, 'active');
  assert.equal(view.visible, true);
  assert.equal(view.step.id, TUTORIAL_STEPS[0].id);
  assert.equal(view.step.index, 1);
  assert.equal(view.step.total, TUTORIAL_STEPS.length);

  // A save that already harvested gains `tutorial` through the structural migration pass. Offering
  // onboarding to that player would be the opposite of clarity, so it is marked skipped instead.
  const stored = freshEngine();
  stored.state.machine.civilizationsTotal = 4;
  delete stored.state.tutorial;
  const returning = new GameEngine({
    autosave: false,
    storage: { getItem: () => JSON.stringify(stored.state), setItem: () => {}, removeItem: () => {} },
  });
  assert.equal(returning.tutorialView().status, 'skipped');
  assert.equal(returning.tutorialView().visible, false);
});

test('every step answers what, where and why, and names an action when it waits for one', () => {
  assert.ok(TUTORIAL_STEPS.length >= 10, 'the guided run must cover a whole first run');
  const ids = new Set();
  for (const step of TUTORIAL_STEPS) {
    assert.equal(ids.has(step.id), false, `duplicate step id ${step.id}`);
    ids.add(step.id);
    for (const field of ['title', 'what', 'where', 'why']) {
      assert.ok(step[field].length > 12, `${step.id}.${field} must actually explain something`);
    }
    assert.ok(['machine', 'civilization'].includes(step.phase));
    // A step gated on a fact has to say what to do; an acknowledge-only step must not pretend to.
    if (step.requires) assert.ok(step.action.length > 8, `${step.id} waits on ${step.requires} but names no action`);
    else assert.equal(step.action, '');
  }
  // The first step is readable before anything exists, and the run-start step is the second, so the
  // player is never asked to act before they have been told what the game is.
  assert.equal(TUTORIAL_STEPS[0].requires, '');
  assert.equal(TUTORIAL_STEPS[1].requires, 'run_started');
});

test('tutorialStepById returns matching step for valid ID and null for invalid ID', () => {
  assert.equal(tutorialStepById('overview')?.title, 'You are the Machine');
  assert.equal(tutorialStepById('harvest')?.id, 'harvest');
  assert.equal(tutorialStepById('non_existent_step_id'), null);
  assert.equal(tutorialStepById(''), null);
});

test('stepCleared correctly evaluates fact-gated vs acknowledge-gated steps', () => {
  const state = newTutorialState('active');
  const factGatedStep = TUTORIAL_STEPS.find(s => s.requires !== '');
  const ackGatedStep = TUTORIAL_STEPS.find(s => s.requires === '');

  assert.equal(stepCleared(state, factGatedStep), false);
  assert.equal(stepCleared(state, ackGatedStep), false);

  state.observed.push(factGatedStep.requires);
  state.acknowledged.push(ackGatedStep.id);

  assert.equal(stepCleared(state, factGatedStep), true);
  assert.equal(stepCleared(state, ackGatedStep), true);
});

test('currentStep returns active step or null depending on tutorial state', () => {
  const state = newTutorialState('active');
  state.stepId = 'world_read';
  assert.equal(currentStep(state)?.id, 'world_read');

  state.stepId = '';
  assert.equal(currentStep(state)?.id, 'overview');

  state.status = 'skipped';
  assert.equal(currentStep(state), null);

  state.status = 'completed';
  assert.equal(currentStep(state), null);
});

test('liveTutorialFacts derives facts correctly from civilization state', () => {
  assert.deepEqual(liveTutorialFacts(null), []);

  const emptyCiv = { eventChoices: 0, tactical: { actionUsage: {} } };
  assert.deepEqual(liveTutorialFacts(emptyCiv), ['run_started']);

  const activeCiv = { eventChoices: 2, tactical: { actionUsage: { probe: 1 } } };
  assert.deepEqual(liveTutorialFacts(activeCiv), ['run_started', 'intervention_resolved', 'tactical_used']);
});

test('a fact clears its step and an acknowledge-only step cannot be cleared by one', () => {
  const state = newTutorialState('active');
  advanceTutorial(state);
  assert.equal(state.stepId, 'overview');

  // A fact for a later step does not skip the reading step in front of it.
  recordTutorialFact(state, 'run_started');
  advanceTutorial(state);
  assert.equal(state.stepId, 'overview');

  assert.equal(acknowledgeStep(state), true);
  assert.equal(state.stepId, 'world_read', 'run_started was already observed, so its step is behind us');

  // The intervention step waits on a fact, so CONTINUE is neither offered nor honoured.
  state.stepId = 'intervention';
  assert.equal(tutorialView(state, 'civilization').step.canAcknowledge, false);
  assert.equal(acknowledgeStep(state), false);
  assert.equal(state.stepId, 'intervention');
  recordTutorialFact(state, 'intervention_resolved');
  advanceTutorial(state);
  assert.equal(state.stepId, 'feedback');
});

test('the cursor completes rather than stranding when every step is cleared', () => {
  const state = newTutorialState('active');
  for (const step of TUTORIAL_STEPS) {
    if (step.requires) recordTutorialFact(state, step.requires);
    else state.acknowledged.push(step.id);
  }
  advanceTutorial(state);
  assert.equal(state.status, 'completed');
  assert.equal(state.stepId, '');
  assert.equal(tutorialView(state, 'machine').visible, false);
  assert.equal(tutorialView(state, 'machine').replayable, true);
});

test('a stored tutorial pointing at a step this build no longer has is reset, not trusted', () => {
  const normalized = normalizeTutorialState({
    version: 1, status: 'weird', stepId: 'a_step_from_the_future',
    acknowledged: ['overview', 'not_a_step'], observed: ['run_started', 'run_started'], collapsed: 'yes',
  });
  assert.equal(normalized.status, 'pending');
  assert.equal(normalized.stepId, '');
  assert.deepEqual(normalized.acknowledged, ['overview']);
  assert.deepEqual(normalized.observed, ['run_started']);
  assert.equal(normalized.collapsed, true);
});

test('the guided run walks a real first run from start to report', () => {
  const engine = freshEngine();
  assert.equal(engine.tutorialView().step.id, 'overview');
  engine.acknowledgeTutorialStep();
  assert.equal(engine.tutorialView().step.id, 'run_build');

  assert.equal(engine.startCivilization(4242), true);
  assert.equal(engine.tutorialView().step.id, 'world_read', 'starting the run must clear its own step');
  engine.acknowledgeTutorialStep();
  assert.equal(engine.tutorialView().step.id, 'situation');
  engine.acknowledgeTutorialStep();
  assert.equal(engine.tutorialView().step.id, 'intervention');

  // Ticking to the first intervention and resolving it is what clears the step -- nothing else does.
  let guard = 0;
  while (!engine.currentEvent() && guard++ < 400) engine.tick(0.25);
  assert.ok(engine.currentEvent(), 'a first intervention must arrive');
  assert.equal(engine.tutorialView().step.id, 'intervention');
  engine.chooseEvent(safestChoiceIndex(engine.currentEvent()));
  assert.equal(engine.tutorialView().step.id, 'feedback');
  engine.acknowledgeTutorialStep();

  assert.equal(engine.tutorialView().step.id, 'tactical');
  // Whichever action is available right now clears the step; the step names more than one for exactly
  // this reason (Probe needs an open intervention, Stabilize needs Stability below its maximum).
  assert.ok(
    ['probe', 'accelerate', 'stabilize', 'vent'].some(id => engine.useTacticalAction(id)),
    'at least one tactical action must be available after an intervention',
  );
  assert.equal(engine.tutorialView().step.id, 'pressure');
  engine.acknowledgeTutorialStep();
  assert.equal(engine.tutorialView().step.id, 'depth');
  engine.acknowledgeTutorialStep();
  assert.equal(engine.tutorialView().step.id, 'harvest');

  engine.harvest(false);
  assert.equal(engine.state.phase, 'machine');
  assert.equal(engine.tutorialView().step.id, 'report');
  engine.acknowledgeTutorialStep();
  assert.equal(engine.tutorialView().step.id, 'manual');
  engine.acknowledgeTutorialStep();
  assert.equal(engine.tutorialView().status, 'completed');
});

test('skipping is one click, and a replay keeps the facts the player already proved', () => {
  const engine = freshEngine();
  assert.equal(engine.skipTutorial(), true);
  assert.equal(engine.tutorialView().visible, false);
  assert.equal(engine.skipTutorial(), false, 'skipping twice must not resurrect it');
  assert.match(engine.messages[0], /FIELD MANUAL/);

  engine.startCivilization(7);
  engine.harvest(false);
  engine.restartTutorial();
  // A replay walks the whole thing again: the player asked to be shown the run, not past it.
  assert.equal(engine.tutorialView().status, 'active');
  assert.equal(engine.tutorialView().step.id, 'overview');
  engine.acknowledgeTutorialStep();
  assert.equal(engine.tutorialView().step.id, 'run_build');
});

test('a replay started mid-run never asks for something the current run already did', () => {
  const engine = freshEngine();
  engine.skipTutorial();
  engine.startCivilization(8);
  let guard = 0;
  while (!engine.currentEvent() && guard++ < 400) engine.tick(0.25);
  engine.chooseEvent(safestChoiceIndex(engine.currentEvent()));
  engine.restartTutorial();
  assert.equal(engine.tutorialView().step.id, 'overview');
  engine.acknowledgeTutorialStep();
  // run_started and intervention_resolved are already true of the run on screen, so the replay walks
  // straight to the reading steps rather than asking for a first intervention ten years too late.
  assert.equal(engine.tutorialView().step.id, 'world_read');
  engine.acknowledgeTutorialStep();
  engine.acknowledgeTutorialStep();
  engine.acknowledgeTutorialStep();
  assert.equal(engine.tutorialView().step.id, 'tactical', 'a resolved intervention is not demanded twice');
});

test('a step for the other phase says where to go instead of pointing at nothing', () => {
  const state = newTutorialState('active');
  state.stepId = 'harvest';
  const offPhase = tutorialView(state, 'machine').step;
  assert.equal(offPhase.anchor, '', 'no highlight may be requested for a panel that is not rendered');
  assert.match(offPhase.offPhaseHint, /Start one to continue/);
  assert.equal(tutorialView(state, 'civilization').step.offPhaseHint, '');
  assert.equal(tutorialView(state, 'civilization').step.anchor, '.harvest-actions');
});

// --- the run trace and the report ---------------------------------------------------------------

test('the trace samples on an interval and self-downsamples instead of losing the start', () => {
  const civ = GameEngine.createCivilizationForTest(31);
  assert.equal(recordRunTrace(civ), true, 'the first sample is the run\'s starting line');
  assert.equal(civ.trace.samples.length, 1);
  assert.equal(recordRunTrace(civ), false, 'a second call inside the interval must not sample');

  for (let second = 0; second <= 60 * TRACE_BASE_INTERVAL_SECONDS; second += 1) {
    civ.elapsedSeconds = second;
    civ.development += 3;
    recordRunTrace(civ);
  }
  assert.ok(civ.trace.samples.length <= TRACE_MAX_SAMPLES, 'the sample budget is a hard cap');
  assert.ok(civ.trace.intervalSeconds > TRACE_BASE_INTERVAL_SECONDS, 'the interval must have doubled');
  assert.equal(civ.trace.samples[0].second, 0, 'the beginning of the run survives downsampling');
  const seconds = civ.trace.samples.map(sample => sample.second);
  assert.deepEqual([...seconds].sort((a, b) => a - b), seconds, 'samples stay in order');
});

test('a malformed stored trace is rejected rather than read as a run that never happened', () => {
  assert.equal(validRunTrace(null), false);
  assert.equal(validRunTrace({ version: 2, intervalSeconds: 5, nextSampleAt: 0, samples: [] }), false);
  assert.equal(validRunTrace({ version: 1, intervalSeconds: 5, nextSampleAt: 0, samples: {} }), false);
  assert.equal(validRunTrace({ version: 1, intervalSeconds: 5, nextSampleAt: 0, samples: [] }), true);

  const civ = GameEngine.createCivilizationForTest(9);
  civ.trace = { version: 1, intervalSeconds: 'soon', nextSampleAt: 0, samples: [] };
  recordRunTrace(civ);
  assert.equal(validRunTrace(civ.trace), true, 'an unusable trace is replaced by a fresh one');
});

test('every run exit publishes a report that names why it ended and what it paid', () => {
  const controlled = freshEngine();
  const report = playToControlledHarvest(controlled, 1234);
  assert.ok(report, 'a harvest must leave a report');
  assert.equal(report.reason, 'controlled_harvest');
  assert.match(report.reasonTitle, /Controlled harvest/);
  assert.match(report.reasonDetail, /You ended it yourself/);
  assert.equal(report.resourceTotal, report.resources.reduce((sum, entry) => sum + entry.amount, 0));
  assert.ok(report.resourceTotal > 0, 'a controlled harvest banks something');
  assert.ok(report.resources.every(entry => entry.share >= 0 && entry.share <= 100));
  assert.ok(report.trace.length >= 2, 'the report carries the curve it draws');
  assert.ok(report.lessons.length >= 1, 'a report always says something actionable');
  assert.ok(report.timeline.length <= REPORT_TIMELINE_ENTRIES);
  // The report cannot disagree with the payout: both come from the same harvest details.
  assert.equal(report.grade, controlled.state.machine.lastHarvest.grade);
  assert.equal(report.credits, controlled.state.machine.lastHarvest.credits);
  // The report lists exactly the resources the Machine has identified, in key order, and exactly what
  // each of them banked. An undiscovered resource is not a zero row -- it is not a row, and it is not
  // a payout either, which is what keeps Existence out of every report before Transcendence names it.
  const discovered = controlled.visibleResources();
  assert.deepEqual(report.resources.map(entry => entry.key), discovered);
  assert.deepEqual(
    report.resources.map(entry => entry.amount),
    discovered.map(key => controlled.state.machine.lastHarvest.rewards[key]),
  );
  for (const key of ['causal_mass', 'cognition', 'paradox', 'existence']) {
    if (discovered.includes(key)) continue;
    assert.equal(controlled.state.machine.lastHarvest.rewards[key], 0, `${key} was banked before it was identified`);
    assert.equal(controlled.state.machine.currencies[key], 0, `${key} reached the bank before it was identified`);
  }

  const forced = freshEngine();
  forced.startCivilization(55);
  forced.harvest(true);
  assert.equal(forced.lastRunReport().reason, 'forced_chaotic_harvest');
  assert.match(forced.lastRunReport().reasonDetail, /You forced the collapse/);

  const abandoned = freshEngine();
  abandoned.startCivilization(56);
  abandoned.returnToMachineWithoutReward();
  const abandonedReport = abandoned.lastRunReport();
  assert.equal(abandonedReport.reason, 'abandoned');
  assert.equal(abandonedReport.resourceTotal, 0, 'abandoning banks nothing, and the report says so');
  assert.ok(abandonedReport.lessons.some(lesson => /salvage floor/.test(lesson)));

  const collapsed = freshEngine();
  collapsed.startCivilization(57);
  collapsed.state.civilization.stats.stability = 0.0001;
  collapsed.tick(0.25);
  assert.equal(collapsed.state.phase, 'machine');
  const collapsedReport = collapsed.lastRunReport();
  assert.equal(collapsedReport.reason, 'stability_collapse');
  assert.match(collapsedReport.reasonDetail, /Stability reached zero/);
  assert.ok(collapsedReport.lessons.some(lesson => /Stability, not Entropy/.test(lesson)));
});

test('the report is cleared by the player, by a prestige, and never by the next run alone', () => {
  const engine = freshEngine();
  engine.startCivilization(88);
  engine.harvest(false);
  assert.ok(engine.lastRunReport());
  engine.startCivilization(89);
  assert.ok(engine.lastRunReport(), 'the previous report stays readable until it is dismissed');
  engine.harvest(false);
  assert.equal(engine.lastRunReport().seed, 89, 'the newest run replaces it');
  assert.equal(engine.dismissRunReport(), true);
  assert.equal(engine.lastRunReport(), null);
  assert.equal(engine.dismissRunReport(), false);
});

test('the arc records era and phase transitions with the second they happened at', () => {
  const samples = [
    { second: 0, era: 0, dramaPhase: 0, development: 1, depth: 0, entropy: 0, stability: 100 },
    { second: 5, era: 0, dramaPhase: 0, development: 30, depth: 0.4, entropy: 2, stability: 98 },
    { second: 10, era: 0, dramaPhase: 1, development: 90, depth: 1.1, entropy: 5, stability: 95 },
    { second: 15, era: 1, dramaPhase: 1, development: 150, depth: 1.9, entropy: 8, stability: 92 },
  ];
  const arc = runArc(samples, ERA_NAMES, DRAMA_LABELS);
  assert.deepEqual(arc.map(entry => [entry.second, entry.label]), [
    [0, 'Began in EMERGENCE'],
    [10, 'Expansion phase'],
    [15, 'Entered EXPANSION'],
  ]);
  assert.ok(arc.every(entry => /Development \d+ · Depth/.test(entry.detail)));
});

test('the lessons are derived from the run rather than picked from a list of tips', () => {
  const civ = GameEngine.createCivilizationForTest(77);
  civ.eventChoices = 1;
  const premature = runLessons(civ, {
    reason: 'controlled_harvest', chaotic: false, eraNames: ERA_NAMES, dramaLabels: DRAMA_LABELS,
    resourceLabels: {}, traitNames: [], pathName: '', objectiveTitle: '',
    details: { grade: 'premature', depth: 0.1, credits: 0, rewardMultiplier: 0.2, objectiveCompleted: false, rewards: {} },
  }, 0.1, 0);
  assert.ok(premature.some(lesson => /resolved 1 intervention\b/.test(lesson)), premature.join(' | '));

  civ.eventChoices = 9;
  civ.era = 2;
  const missedObjective = runLessons(civ, {
    reason: 'controlled_harvest', chaotic: false, eraNames: ERA_NAMES, dramaLabels: DRAMA_LABELS,
    resourceLabels: {}, traitNames: [], pathName: '', objectiveTitle: 'Reach Transcendence',
    details: { grade: 'established', depth: 2, credits: 1, rewardMultiplier: 0.69, objectiveCompleted: false, rewards: {} },
  }, 2, 1);
  assert.ok(missedObjective.some(lesson => /Reach Transcendence/.test(lesson)));
  assert.ok(missedObjective.some(lesson => /Transcendent begins at Depth 5/.test(lesson)));
  // and says what arriving there is worth, in the currency the player is actually saving up.
  assert.ok(missedObjective.some(lesson => /Cultivation Credit 3/.test(lesson)), missedObjective.join(' | '));
});

test('the report is built from the same numbers the payout used', () => {
  const civ = GameEngine.createCivilizationForTest(101);
  civ.elapsedSeconds = 42.5;
  civ.years = 3000;
  civ.era = 1;
  civ.development = 260;
  civ.eventChoices = 6;
  civ.institutions.push('Consensus Lattice');
  civ.tactical.entropy = 44;
  recordRunTrace(civ);
  const report = buildRunReport(civ, {
    reason: 'controlled_harvest', chaotic: false, eraNames: ERA_NAMES, dramaLabels: DRAMA_LABELS,
    resourceLabels: { causal_mass: 'Causal Mass', cognition: 'Cognition', paradox: 'Paradox', existence: 'Existence' },
    discoveredResources: ['causal_mass', 'cognition', 'paradox', 'existence'],
    traitNames: ['Telepathic Species'], pathName: 'Machine Faith', objectiveTitle: 'Reach Transcendence',
    details: {
      grade: 'established', depth: 3.25, credits: 1, rewardMultiplier: 0.965, objectiveCompleted: true,
      rewards: { causal_mass: 400, cognition: 300, paradox: 200, existence: 100 },
    },
  });
  assert.equal(report.version, 1);
  assert.equal(report.eraName, 'EXPANSION');
  assert.equal(report.years, 3000);
  assert.equal(report.interventions, 6);
  assert.equal(report.resourceTotal, 1000);
  assert.deepEqual(report.resources.map(entry => entry.share), [40, 30, 20, 10]);
  assert.deepEqual(report.institutions, ['Consensus Lattice']);
  assert.deepEqual(report.traits, ['Telepathic Species']);
  assert.equal(report.dominantPath, 'Machine Faith');
  assert.equal(report.objectiveCompleted, true);
  assert.ok(report.peakDevelopment >= report.development);
  assert.ok(report.peakEntropy >= report.entropy);
  // The final state is appended, so the curve ends where the report's own totals are.
  assert.equal(report.trace[report.trace.length - 1].development, report.development);
});

// --- the live situation line ---------------------------------------------------------------------

const situation = overrides => civilizationSituation({
  pendingEventTitle: '', entropy: 10, secondsToCascade: 300, entropyRate: 0.5,
  stability: 90, stabilityMax: 100, sanity: 90, awareness: 10, attention: 10,
  grade: 'established', depth: 3, credits: 1, urgency: 'building',
  secondsToNextCredit: 40, secondsOfRunLeft: 300, controlCapacity: 3, eventChoices: 5,
  era: 1, eraName: 'EXPANSION', development: 240, terminal: false,
  convergenceReady: false, convergenceTargetDepth: 12, objectiveTitle: '', objectiveCompleted: false,
  ...overrides,
});

test('the situation line resolves one condition at a time, worst first', () => {
  assert.equal(situation({ pendingEventTitle: 'The Fracture' }).id, 'decision_pending');
  assert.equal(situation({ entropy: 100 }).id, 'cascade');
  assert.equal(situation({ stability: 12, entropy: 80 }).id, 'collapse_imminent');
  assert.equal(situation({ entropy: 82 }).id, 'entropy_critical');
  assert.equal(situation({ urgency: 'harvest' }).id, 'harvest_window');
  assert.equal(situation({ attention: 80 }).id, 'cosmic_attention');
  assert.equal(situation({ awareness: 80 }).id, 'civilization_awareness');
  assert.equal(situation({ sanity: 20 }).id, 'sanity_failing');
  assert.equal(situation({ grade: 'premature' }).id, 'premature');
  assert.equal(situation({ urgency: 'capped', credits: 20 }).id, 'credit_cap');
  assert.equal(situation({ urgency: 'closing' }).id, 'closing');
  assert.equal(situation({ objectiveTitle: 'Reach Transcendence' }).id, 'objective_open');
  assert.equal(situation({}).id, 'building');
  // A terminal run is measured against its target Depth, not against yield it does not pay.
  assert.equal(situation({ terminal: true }).id, 'convergence_short');
  assert.equal(situation({ terminal: true, convergenceReady: true }).id, 'convergence_ready');
});

test('every situation states what, why and one thing to do, with severity ordered', () => {
  const cases = [
    situation({}), situation({ entropy: 100 }), situation({ stability: 5 }), situation({ urgency: 'closing' }),
    situation({ grade: 'premature', eventChoices: 1 }), situation({ pendingEventTitle: 'X' }),
    machineSituation({ hasReport: true, needsDirective: false, canStart: true, affordableUpgrades: 0, credits: 3, creditsRequired: 18, canConsumeUniverse: false, canConsumeMultiverse: false, convergenceUnlocked: false, openMilestone: '', runsTotal: 2 }),
    machineSituation({ hasReport: false, needsDirective: true, canStart: false, affordableUpgrades: 2, credits: 3, creditsRequired: 18, canConsumeUniverse: false, canConsumeMultiverse: false, convergenceUnlocked: false, openMilestone: 'First harvest', runsTotal: 0 }),
  ];
  for (const report of cases) {
    assert.ok(report.id, 'every situation has an id the render key can band on');
    assert.ok(['calm', 'watch', 'urgent', 'critical'].includes(report.severity));
    for (const field of ['headline', 'cause', 'advice']) {
      assert.ok(report[field].length > 12, `${report.id}.${field} must say something`);
      assert.doesNotMatch(report[field], /undefined|NaN|Infinity/, `${report.id}.${field} leaks a raw value`);
    }
  }
});

test('a premature situation names the exact floor the run has not cleared', () => {
  assert.match(situation({ grade: 'premature', eventChoices: 1 }).cause, /1 of the 3 interventions/);
  assert.match(situation({ grade: 'premature', eventChoices: 5, era: 0, eraName: 'EMERGENCE' }).cause, /still in EMERGENCE/);
  assert.match(situation({ grade: 'premature', eventChoices: 5, era: 1, depth: 0.8 }).cause, /Depth is 0\.8/);
});

test('the machine situation puts the open decision ahead of housekeeping', () => {
  const base = { hasReport: true, needsDirective: false, canStart: true, affordableUpgrades: 3, credits: 18, creditsRequired: 18, canConsumeUniverse: false, canConsumeMultiverse: false, convergenceUnlocked: false, openMilestone: '', runsTotal: 5 };
  assert.equal(machineSituation({ ...base, needsDirective: true }).id, 'pick_directive');
  assert.equal(machineSituation({ ...base, canConsumeMultiverse: true }).id, 'collapse_multiverse');
  assert.equal(machineSituation({ ...base, canConsumeUniverse: true }).id, 'consume_universe');
  assert.equal(machineSituation(base).id, 'read_report');
  assert.equal(machineSituation({ ...base, hasReport: false }).id, 'spend_bank');
  assert.equal(machineSituation({ ...base, hasReport: false, affordableUpgrades: 0, runsTotal: 0 }).id, 'first_run');
  assert.equal(machineSituation({ ...base, hasReport: false, affordableUpgrades: 0 }).id, 'start_run');
});

// --- the permanent explanation layer -------------------------------------------------------------

test('the field manual explains every term with what, where and why', () => {
  assert.ok(HELP_SECTIONS.length >= 5);
  const ids = new Set();
  let topics = 0;
  for (const section of HELP_SECTIONS) {
    assert.ok(section.summary.length > 20, `${section.id} needs a summary`);
    for (const topic of section.topics) {
      topics++;
      const key = `${section.id}.${topic.id}`;
      assert.equal(ids.has(key), false, `duplicate topic ${key}`);
      ids.add(key);
      assert.ok(topic.term.length > 3, `${key}.term must name something`);
      for (const field of ['what', 'where', 'why']) {
        assert.ok(topic[field].length > 20, `${key}.${field} must actually explain something`);
      }
    }
  }
  assert.ok(topics >= 25, `only ${topics} terms are explained`);
});

test('the English catalog and the manual source say the same thing', () => {
  // `help-topics.ts` is the English source *and* the fallback a missed localized lookup lands on, and
  // `LOCALIZATION.en` carries a copy of every one of its strings. Two copies of the same sentence
  // means one can be updated and the other not, and nothing here noticed: moving the prestige
  // buttons up the Machine view left both copies of "at the bottom of the Machine view" in place,
  // and moving the Breeding Matrix into the run-preparation card left both copies of a note that
  // described two things and said "Both". A reviewer caught them; this test is so the next one does.
  const en = LOCALIZATION.en.help;
  let compared = 0;
  for (const [id, note] of Object.entries(EXPLAIN_NOTES)) {
    assert.equal(en.explainNotes?.[id], note, `explain note ${id} differs between the source and the English catalog`);
    compared += 1;
  }
  for (const section of HELP_SECTIONS) {
    const localized = en.sections?.[section.id];
    assert.ok(localized, `section ${section.id} is missing from the English catalog`);
    assert.equal(localized.title, section.title, `${section.id}.title differs`);
    assert.equal(localized.summary, section.summary, `${section.id}.summary differs`);
    compared += 2;
    for (const topic of section.topics) {
      const localizedTopic = localized.topics?.[topic.id];
      assert.ok(localizedTopic, `topic ${section.id}.${topic.id} is missing from the English catalog`);
      for (const field of ['term', 'what', 'where', 'why']) {
        assert.equal(localizedTopic[field], topic[field], `${section.id}.${topic.id}.${field} differs`);
        compared += 1;
      }
    }
  }
  for (const [key, expansion] of Object.entries(HELP_ABBREVIATIONS)) {
    assert.equal(en.abbreviations?.[key], expansion, `abbreviation ${key} differs`);
    compared += 1;
  }
  assert.ok(compared >= 130, `only ${compared} strings compared`);
});

test('every abbreviation on the world strip is expanded somewhere the player can read it', async () => {
  const app = await readFile(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  const strip = app.slice(app.indexOf('world-status-strip'), app.indexOf('const eventCard='));
  const abbreviations = [...strip.matchAll(/>([A-Z]{3}) <b/g)].map(match => match[1]);
  assert.ok(abbreviations.length >= 7, `only ${abbreviations.length} strip columns found`);
  for (const abbreviation of abbreviations) {
    assert.ok(HELP_ABBREVIATIONS[abbreviation], `${abbreviation} on the world strip is never expanded`);
  }
  // Each column also carries its expansion as a title, so a pointer reveals it without explain mode.
  for (const abbreviation of abbreviations) {
    assert.ok(strip.includes(`abbreviationTitle('${abbreviation}')`), `${abbreviation} carries no title`);
  }
});

test('explain mode annotates panels and is off by default', () => {
  const engine = freshEngine();
  assert.equal(engine.explainMode(), false);
  assert.equal(explainNote('situation', false), '', 'nothing is rendered while explain mode is off');
  assert.match(explainNote('situation', true), /class="explain-note"/);
  assert.equal(explainNote('not_a_panel', true), '', 'an unknown panel gets no empty box');
  assert.equal(abbreviationLegend(false), '');
  assert.match(abbreviationLegend(true), /abbreviation-legend/);

  engine.toggleExplainMode();
  assert.equal(engine.explainMode(), true);
  assert.equal(buildViewModel(engine).explain, true);
  engine.setExplainMode(false);
  assert.equal(engine.explainMode(), false);
});

test('every explain note names a panel the UI actually renders', async () => {
  const app = await readFile(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  const guide = await readFile(new URL('../src/ui/guide-view.ts', import.meta.url), 'utf8');
  const report = await readFile(new URL('../src/ui/report-view.ts', import.meta.url), 'utf8');
  const rendered = `${app}${guide}${report}`;
  for (const id of Object.keys(EXPLAIN_NOTES)) {
    assert.ok(rendered.includes(`explainNote('${id}'`), `EXPLAIN_NOTES.${id} is never rendered`);
  }
});

// --- rendering ------------------------------------------------------------------------------------

test('the coach card is a region with a progress trail, never a modal', () => {
  const state = newTutorialState('active');
  advanceTutorial(state);
  const html = tutorialOverlay(tutorialView(state, 'machine'));
  assert.match(html, /class="tutorial-card"/);
  assert.match(html, /role="region"/);
  assert.doesNotMatch(html, /role="dialog"|aria-modal/, 'the guided run must never block the game');
  assert.match(html, /GUIDED RUN \/\/ STEP 1 OF /);
  assert.match(html, /data-action="tutorial-next"/);
  assert.match(html, /data-action="tutorial-skip"/);
  assert.match(html, /data-action="tutorial-collapse"/);
  assert.match(html, /tutorial-progress/);

  state.collapsed = true;
  const collapsed = tutorialOverlay(tutorialView(state, 'machine'));
  assert.match(collapsed, /is-collapsed/);
  assert.match(collapsed, /data-collapsed="0"/, 'the collapsed card must be able to reopen');

  // A step waiting on an action offers no CONTINUE, so the player cannot click past the teaching.
  state.collapsed = false;
  state.stepId = 'intervention';
  const waiting = tutorialOverlay(tutorialView(state, 'civilization'));
  assert.doesNotMatch(waiting, /data-action="tutorial-next"/);
  assert.match(waiting, /tutorial-waiting/);

  assert.equal(tutorialOverlay(tutorialView(newTutorialState('skipped'), 'machine')), '');
  assert.match(tutorialReplay(tutorialView(newTutorialState('skipped'), 'machine')), /data-action="tutorial-restart"/);
  assert.equal(tutorialReplay(tutorialView(newTutorialState('active'), 'machine')), '');
});

test('the report panel answers why, how, what it paid and what to change', () => {
  const engine = freshEngine();
  playToControlledHarvest(engine, 909);
  const html = runReportPanel(engine.lastRunReport(), true);
  assert.match(html, /class="panel run-report/);
  assert.match(html, /RUN REPORT \/\/ CIVILIZATION/);
  assert.match(html, /HARVEST GRADE/);
  assert.match(html, /RESOURCES FARMED/);
  assert.match(html, /HOW IT DEVELOPED/);
  assert.match(html, /WHAT THIS RUN SUGGESTS/);
  assert.match(html, /data-action="dismiss-report"/);
  assert.match(html, /class="explain-note"/, 'explain mode reaches the report too');
  assert.match(html, /<svg viewBox="0 0 100 34"/, 'the report draws the run curve inline');
  assert.equal(runReportPanel(null), '', 'no report, no panel');
  // Player-derived text is escaped rather than interpolated raw.
  const injected = { ...engine.lastRunReport(), dominantPath: '<img src=x>', lessons: ['<script>x</script>'] };
  const escaped = runReportPanel(injected, false);
  assert.doesNotMatch(escaped, /<img|<script/);
});

test('the run curve needs two points and normalizes each series to its own scale', () => {
  assert.equal(runCurve([]), '');
  assert.equal(runCurve([{ second: 0, development: 1, entropy: 0, stability: 100 }]), '');
  const html = runCurve([
    { second: 0, development: 1, entropy: 0, stability: 100 },
    { second: 10, development: 200, entropy: 50, stability: 50 },
  ]);
  assert.match(html, /curve-development/);
  assert.match(html, /curve-entropy/);
  assert.match(html, /curve-stability/);
  assert.doesNotMatch(html, /NaN|Infinity/);
  // Entropy is drawn against its own fixed ceiling of 100, so 50 lands at half height.
  assert.match(html, /class="curve-entropy" points="0\.00,34\.00 100\.00,17\.00"/);
});

test('the field manual renders every section and stays escaped', () => {
  const html = fieldManual(true);
  assert.match(html, /class="panel field-manual/);
  // Titles are escaped on the way in, so "Pressure & Time" is looked up the way it is rendered.
  for (const section of HELP_SECTIONS) {
    assert.ok(html.includes(section.title.replaceAll('&', '&amp;')), `${section.id} is missing`);
  }
  assert.match(html, /WHAT/);
  assert.match(html, /WHERE/);
  assert.match(html, /WHY/);
  assert.doesNotMatch(html, /<script/);
  assert.match(fieldManual(false, ' tutorial-focus'), /field-manual tutorial-focus/);
});

// --- the render-key contract ----------------------------------------------------------------------

test('the onboarding bands enter the render key and the ticking numbers stay out', () => {
  const engine = freshEngine();
  engine.startCivilization(2024);
  const before = civilizationRenderKey(buildViewModel(engine));

  // A ticking second changes Development, Depth, Entropy and the cascade clock. None of them may
  // rebuild the panel column, and neither may the situation sentences that quote them.
  for (let index = 0; index < 8; index++) engine.tick(0.25);
  assert.equal(civilizationRenderKey(buildViewModel(engine)), before, 'a tick must not rebuild the DOM');

  // A step change, the explain toggle and a new situation are all discrete states, so each one does.
  engine.acknowledgeTutorialStep();
  const afterStep = civilizationRenderKey(buildViewModel(engine));
  assert.notEqual(afterStep, before);
  engine.toggleExplainMode();
  const afterExplain = civilizationRenderKey(buildViewModel(engine));
  assert.notEqual(afterExplain, afterStep);
  engine.setTutorialCollapsed(true);
  assert.notEqual(civilizationRenderKey(buildViewModel(engine)), afterExplain);
});

test('the situation sentences are refreshed live rather than through the structural key', async () => {
  const app = await readFile(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  const refresh = app.slice(app.indexOf('function refreshCivilizationLive'));
  for (const hook of ['situation-headline', 'situation-cause', 'situation-advice']) {
    assert.match(app, new RegExp(`data-live="${hook}"`), `${hook} needs a live hook`);
    assert.ok(refresh.includes(`[data-live="${hook}"]`), `${hook} must be rewritten by the live refresh`);
  }
});

test('the guided run highlight is rendered into the panel, never bolted on afterwards', async () => {
  const app = await readFile(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  // `replaceIfChanged` compares against the built HTML, so a class added to the DOM after the fact
  // would read as a diff and rebuild the panel on every pass.
  assert.match(app, /const focusClass=/);
  assert.doesNotMatch(app, /classList\.add\(['"]tutorial-focus/);
  const anchors = new Set(TUTORIAL_STEPS.map(step => step.anchor).filter(Boolean));
  for (const anchor of anchors) {
    assert.ok(
      app.includes(`focusClass(vm,'${anchor}')`),
      `no panel renders the highlight for ${anchor}`,
    );
  }
  const report = await readFile(new URL('../src/ui/report-view.ts', import.meta.url), 'utf8');
  assert.match(report, /class="panel run-report/, 'the report step anchors on the report panel itself');
});

test('the tutorial persists across a reload and the save carries the run trace', () => {
  const slot = {};
  const storage = {
    getItem: key => slot[key] ?? null,
    setItem: (key, value) => { slot[key] = value; },
    removeItem: key => { delete slot[key]; },
  };
  const first = new GameEngine({ storage });
  first.acknowledgeTutorialStep();
  first.startCivilization(4711);
  for (let index = 0; index < 40; index++) first.tick(0.25);
  first.save();

  const second = new GameEngine({ storage });
  assert.equal(second.tutorialView().status, 'active');
  assert.equal(second.tutorialView().step.id, first.tutorialView().step.id);
  assert.ok(validRunTrace(second.state.civilization.trace));
  assert.ok(second.state.civilization.trace.samples.length >= 1);
});

test('the view model exposes the report, the guided run and the situation together', () => {
  const engine = freshEngine();
  const machineView = buildViewModel(engine);
  assert.equal(machineView.runReport, null);
  assert.equal(machineView.tutorial.visible, true);
  assert.equal(machineView.situation.id, 'first_run');
  engine.startCivilization(31337);
  const runView = buildViewModel(engine);
  assert.ok(runView.situation.headline.length > 12);
  assert.equal(runView.explain, false);
  engine.harvest(false);
  assert.ok(buildViewModel(engine).runReport, 'the report reaches the view model');
});
