import type { HarvestGrade } from './types.js';
import type { HarvestUrgency } from './harvest-quality.js';
import { DEPTH_BANDS, DEPTH_CREDIT_CAP } from './harvest-quality.js';
import { fill, harvestGradeLabel, text } from '../data/i18n.js';

// Both numbers below are balance constants the guidance quotes, so it reads them rather than
// restating them: the Established boundary has already moved once, and the credit cap with it.
const ESTABLISHED_DEPTH = DEPTH_BANDS[1]!.minDepth;

// The one-line answer to "what is happening and why". It is a priority ladder over the run's live
// state, not a script: the highest-severity condition that currently holds wins, and every sentence
// is built from the numbers that made it win, so the reading is always checkable against the panels.
//
// Pure and total: every input combination resolves to exactly one report, and the default branch is
// a real state ('building') rather than a fallback.

export type SituationSeverity = 'calm' | 'watch' | 'urgent' | 'critical';

export interface SituationReport {
  id: string;
  severity: SituationSeverity;
  // What is happening, in the fewest words that stay specific.
  headline: string;
  // Why it is happening -- the mechanism, with the number behind it.
  cause: string;
  // The move it suggests. Never more than one.
  advice: string;
}

export interface CivilizationSituationInput {
  pendingEventTitle: string;
  entropy: number;
  secondsToCascade: number;
  entropyRate: number;
  stability: number;
  stabilityMax: number;
  sanity: number;
  awareness: number;
  attention: number;
  grade: HarvestGrade;
  depth: number;
  credits: number;
  urgency: HarvestUrgency;
  secondsToNextCredit: number;
  secondsOfRunLeft: number;
  controlCapacity: number;
  eventChoices: number;
  era: number;
  eraName: string;
  development: number;
  terminal: boolean;
  convergenceReady: boolean;
  convergenceTargetDepth: number;
  objectiveTitle: string;
  objectiveCompleted: boolean;
}

// Every number that reaches a sentence goes through one of these. The ladder is documented as total,
// which has to include the formatting: a single raw interpolation is all it takes to print `NaN` at
// the player, and these sentences are the surface that is supposed to make the panels checkable.
const round = (value: number): string => `${Math.round(Number.isFinite(value) ? value : 0)}`;
const one = (value: number): string => (Number.isFinite(value) ? value : 0).toFixed(1);
const two = (value: number): string => (Number.isFinite(value) ? value : 0).toFixed(2);
const seconds = (value: number): string => (Number.isFinite(value) ? `${Math.max(0, Math.round(value))}s` : text().ui.app.noLimit);
// Credits are counted, so the plural has to agree with the number that was printed, not with a raw
// input that may not be one.
const count = (value: number): number => (Number.isFinite(value) ? Math.round(value) : 0);

export function civilizationSituation(input: CivilizationSituationInput): SituationReport {
  const copy = text().guidance.civilization;
  // The grade is an id on the way in and a word on the way out, so it is resolved once here rather
  // than interpolated raw into the three sentences that name it.
  const grade = harvestGradeLabel(input.grade) ?? input.grade;
  if (input.entropy >= 100) {
    return { id: 'cascade', severity: 'critical', ...copy.cascade };
  }
  if (input.stability < 25) {
    return {
      id: 'collapse_imminent',
      severity: 'critical',
      headline: fill(copy.collapse_imminent.headline, { stability: one(input.stability) }),
      cause: copy.collapse_imminent.cause,
      advice: input.controlCapacity >= 2
        ? copy.collapse_imminent.adviceWithControl
        : copy.collapse_imminent.adviceWithoutControl,
    };
  }
  // Below the two branches that end the run and above everything else: an open decision freezes the
  // clock, so it can wait, but a cascade or a collapse that is already underway may not be hidden
  // behind it -- the highest severity that holds has to win.
  if (input.pendingEventTitle) {
    return {
      id: 'decision_pending',
      severity: 'watch',
      headline: fill(copy.decision_pending.headline, { eventTitle: input.pendingEventTitle }),
      cause: copy.decision_pending.cause,
      advice: copy.decision_pending.advice,
    };
  }
  if (input.terminal) {
    return input.convergenceReady
      ? {
        id: 'convergence_ready',
        severity: 'watch',
        headline: fill(copy.convergence_ready.headline, { depth: one(input.depth) }),
        cause: fill(copy.convergence_ready.cause, { targetDepth: one(input.convergenceTargetDepth) }),
        advice: copy.convergence_ready.advice,
      }
      : {
        id: 'convergence_short',
        severity: 'urgent',
        headline: fill(copy.convergence_short.headline, { depth: one(input.depth), targetDepth: one(input.convergenceTargetDepth) }),
        cause: copy.convergence_short.cause,
        advice: fill(copy.convergence_short.advice, { secondsToCascade: seconds(input.secondsToCascade) }),
      };
  }
  if (input.entropy >= 75) {
    return {
      id: 'entropy_critical',
      severity: 'urgent',
      headline: fill(copy.entropy_critical.headline, { entropy: one(input.entropy), secondsToCascade: seconds(input.secondsToCascade) }),
      cause: fill(copy.entropy_critical.cause, { entropyRate: two(input.entropyRate) }),
      advice: copy.entropy_critical.advice,
    };
  }
  if (input.urgency === 'harvest') {
    return {
      id: 'harvest_window',
      severity: 'urgent',
      headline: fill(copy.harvest_window.headline, { nextCredit: count(input.credits) + 1 }),
      cause: fill(copy.harvest_window.cause, {
        secondsToNextCredit: seconds(input.secondsToNextCredit),
        secondsOfRunLeft: seconds(input.secondsOfRunLeft),
      }),
      advice: fill(count(input.credits) === 1 ? copy.harvest_window.adviceOneCredit : copy.harvest_window.adviceManyCredits,
        { credits: count(input.credits), grade }),
    };
  }
  if (input.attention > 65) {
    return {
      id: 'cosmic_attention',
      severity: 'urgent',
      headline: fill(copy.cosmic_attention.headline, { attention: one(input.attention) }),
      cause: copy.cosmic_attention.cause,
      advice: copy.cosmic_attention.advice,
    };
  }
  if (input.awareness > 65) {
    return {
      id: 'civilization_awareness',
      severity: 'urgent',
      headline: fill(copy.civilization_awareness.headline, { awareness: one(input.awareness) }),
      cause: copy.civilization_awareness.cause,
      advice: copy.civilization_awareness.advice,
    };
  }
  if (input.sanity < 35) {
    return {
      id: 'sanity_failing',
      severity: 'watch',
      headline: fill(copy.sanity_failing.headline, { sanity: one(input.sanity) }),
      cause: copy.sanity_failing.cause,
      advice: copy.sanity_failing.advice,
    };
  }
  if (input.grade === 'premature') {
    return {
      id: 'premature',
      severity: 'watch',
      headline: copy.premature.headline,
      cause: input.eventChoices < 3
        ? fill(copy.premature.causeInterventions, { eventChoices: count(input.eventChoices) })
        : input.era <= 0
          ? fill(copy.premature.causeEra, { eraName: input.eraName })
          : fill(copy.premature.causeDepth, { depth: one(input.depth), established: one(ESTABLISHED_DEPTH) }),
      advice: copy.premature.advice,
    };
  }
  if (input.urgency === 'capped') {
    return {
      id: 'credit_cap',
      severity: 'watch',
      headline: fill(copy.credit_cap.headline, { credits: count(input.credits) }),
      cause: fill(copy.credit_cap.cause, { cap: count(DEPTH_CREDIT_CAP) }),
      advice: copy.credit_cap.advice,
    };
  }
  if (input.urgency === 'closing') {
    return {
      id: 'closing',
      severity: 'watch',
      headline: fill(copy.closing.headline, {
        nextCredit: count(input.credits) + 1,
        secondsToNextCredit: seconds(input.secondsToNextCredit),
        secondsOfRunLeft: seconds(input.secondsOfRunLeft),
      }),
      cause: copy.closing.cause,
      advice: copy.closing.advice,
    };
  }
  if (input.objectiveTitle && !input.objectiveCompleted) {
    return {
      id: 'objective_open',
      severity: 'calm',
      headline: fill(copy.objective_open.headline, { objectiveTitle: input.objectiveTitle }),
      cause: fill(copy.objective_open.cause, {
        depth: one(input.depth), grade, secondsToCascade: seconds(input.secondsToCascade),
      }),
      advice: copy.objective_open.advice,
    };
  }
  return {
    id: 'building',
    severity: 'calm',
    headline: fill(count(input.credits) === 1 ? copy.building.headlineOneCredit : copy.building.headlineManyCredits,
      { depth: one(input.depth), grade, credits: round(input.credits) }),
    cause: fill(copy.building.cause, { entropy: one(input.entropy), secondsToCascade: seconds(input.secondsToCascade) }),
    advice: fill(copy.building.advice, {
      nextCredit: count(input.credits) + 1, secondsToNextCredit: seconds(input.secondsToNextCredit),
    }),
  };
}

export interface MachineSituationInput {
  hasReport: boolean;
  needsDirective: boolean;
  canStart: boolean;
  affordableUpgrades: number;
  credits: number;
  creditsRequired: number;
  canConsumeUniverse: boolean;
  canConsumeMultiverse: boolean;
  convergenceUnlocked: boolean;
  openMilestone: string;
  runsTotal: number;
}

export function machineSituation(input: MachineSituationInput): SituationReport {
  const copy = text().guidance.machine;
  if (input.needsDirective) {
    return { id: 'pick_directive', severity: 'watch', ...copy.pick_directive };
  }
  if (input.canConsumeMultiverse) {
    return { id: 'collapse_multiverse', severity: 'watch', ...copy.collapse_multiverse };
  }
  if (input.canConsumeUniverse) {
    return {
      id: 'consume_universe',
      severity: 'watch',
      headline: fill(copy.consume_universe.headline, { credits: round(input.credits) }),
      cause: fill(copy.consume_universe.cause, { creditsRequired: round(input.creditsRequired) }),
      advice: copy.consume_universe.advice,
    };
  }
  if (input.hasReport) {
    return { id: 'read_report', severity: 'calm', ...copy.read_report };
  }
  if (input.affordableUpgrades > 0) {
    return {
      id: 'spend_bank',
      severity: 'calm',
      headline: fill(count(input.affordableUpgrades) === 1 ? copy.spend_bank.headlineOneUpgrade : copy.spend_bank.headlineManyUpgrades,
        { count: count(input.affordableUpgrades) }),
      cause: copy.spend_bank.cause,
      advice: copy.spend_bank.advice,
    };
  }
  if (input.runsTotal === 0) {
    return { id: 'first_run', severity: 'calm', ...copy.first_run };
  }
  return {
    id: 'start_run',
    severity: 'calm',
    headline: input.openMilestone ? fill(copy.start_run.headlineMilestone, { milestone: input.openMilestone }) : copy.start_run.headlineIdle,
    cause: input.canStart ? copy.start_run.causeReady : copy.start_run.causeNotReady,
    advice: input.canStart ? copy.start_run.adviceReady : copy.start_run.adviceNotReady,
  };
}
