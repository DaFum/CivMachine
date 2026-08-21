import { civilizationDramaPhase } from './drama.js';
import { cultivationDepth, DEPTH_BANDS, DEPTH_CREDIT_CAP, HARVEST_GRADE_LABELS } from './harvest-quality.js';
import { RESOURCE_KEYS } from './rules.js';
import type {
  Civilization, HarvestGrade, ResourceKey, RunEndReason, RunReport, RunReportArcEntry,
  RunReportResource, RunTraceSample, RunTraceState,
} from './types.js';

// What a finished run says about itself. Two halves:
//
//   1. the trace -- a bounded, self-downsampling curve sampled during the run, so the report can
//      show how it *developed* rather than only how it ended;
//   2. the report -- built once, at the moment the run ends, from the civilization plus the harvest
//      details the engine already computed for the payout.
//
// Presentation-only, exactly like `visualMemory`: the trace is written by `tick()` and read by the
// report; no progression, pressure, harvest or scheduler rule may read either.

export const TRACE_MAX_SAMPLES = 40;
export const TRACE_BASE_INTERVAL_SECONDS = 5;
export const REPORT_TIMELINE_ENTRIES = 12;

export function newRunTrace(): RunTraceState {
  return { version: 1, intervalSeconds: TRACE_BASE_INTERVAL_SECONDS, nextSampleAt: 0, samples: [] };
}

export function validRunTrace(value: unknown): value is RunTraceState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const raw = value as Partial<RunTraceState>;
  return raw.version === 1 && typeof raw.intervalSeconds === 'number' && Number.isFinite(raw.intervalSeconds)
    && typeof raw.nextSampleAt === 'number' && Number.isFinite(raw.nextSampleAt) && Array.isArray(raw.samples);
}

export function traceSample(civ: Civilization): RunTraceSample {
  return {
    second: Math.round(Math.max(0, civ.elapsedSeconds) * 10) / 10,
    years: Math.trunc(Math.max(0, civ.years)),
    era: civ.era,
    development: Math.round(civ.development * 10) / 10,
    depth: Math.round(cultivationDepth(civ) * 100) / 100,
    entropy: Math.round(civ.tactical.entropy * 10) / 10,
    stability: Math.round(civ.stats.stability * 10) / 10,
    sanity: Math.round(civ.stats.sanity * 10) / 10,
    awareness: Math.round(civ.stats.awareness * 10) / 10,
    attention: Math.round(civ.stats.attention * 10) / 10,
    choices: civ.eventChoices,
    dramaPhase: civilizationDramaPhase(civ).id,
  };
}

/**
 * One comparison per tick in the common case, one push every `intervalSeconds`. When the sample
 * budget fills, every second sample is dropped and the interval doubles, so a long run keeps its
 * whole shape at a coarser resolution instead of losing its beginning to a sliding window.
 */
export function recordRunTrace(civ: Civilization): boolean {
  const trace = validRunTrace(civ.trace) ? civ.trace! : (civ.trace = newRunTrace());
  if (civ.elapsedSeconds + 1e-9 < trace.nextSampleAt) return false;
  trace.samples.push(traceSample(civ));
  if (trace.samples.length > TRACE_MAX_SAMPLES) {
    trace.samples = trace.samples.filter((_sample, index) => index % 2 === 0);
    trace.intervalSeconds *= 2;
  }
  trace.nextSampleAt = civ.elapsedSeconds + trace.intervalSeconds;
  return true;
}

export function traceSamples(civ: Civilization): RunTraceSample[] {
  return validRunTrace(civ.trace) ? [...civ.trace!.samples] : [];
}

const REASON_TITLES: Readonly<Record<RunEndReason, string>> = {
  controlled_harvest: 'Controlled harvest',
  forced_chaotic_harvest: 'Chaotic harvest, forced by you',
  stability_collapse: 'Reality collapse',
  abandoned: 'Abandoned without a harvest',
  convergence_won: 'Great Convergence achieved',
  convergence_failed: 'Great Convergence failed',
};

function reasonDetail(reason: RunEndReason, civ: Civilization, grade: HarvestGrade, credits: number, depth: number): string {
  const year = Math.trunc(civ.years);
  const entropy = civ.tactical.entropy.toFixed(0);
  switch (reason) {
    case 'controlled_harvest':
      return `You ended it yourself in year ${year}, at Cultivation Depth ${depth.toFixed(1)} and ${grade} grade. A controlled harvest banks the full grade multiplier and all ${credits} Cultivation Credit${credits === 1 ? '' : 's'}.`;
    case 'forced_chaotic_harvest':
      return `You forced the collapse in year ${year} with Entropy at ${entropy}. Paradox yield rose by half, every other resource was cut to the Contingency retention, and the credits were rounded down to 60%.`;
    case 'stability_collapse':
      return `Stability reached zero in year ${year}, with Entropy at ${entropy}. The harvest was taken automatically as a chaotic one, so it paid the reduced yield rather than nothing.`;
    case 'abandoned':
      return `The run was released in year ${year} without a harvest, so it paid nothing. A chaotic harvest would have paid something even at ${grade} grade.`;
    case 'convergence_won':
      return `A controlled harvest at Cultivation Depth ${depth.toFixed(1)} closed the terminal run in year ${year}. The Convergence bonus is permanent.`;
    case 'convergence_failed':
      return `The terminal run ended in year ${year} at Cultivation Depth ${depth.toFixed(1)}, short of the target. Convergence authorization is retained, so it can be attempted again at no cost.`;
  }
}

// How the run developed: every era and drama-phase transition the trace saw, in the order they
// happened, each stamped with the second it happened at and what the run looked like then.
export function runArc(samples: RunTraceSample[], eraNames: ReadonlyArray<string>, dramaLabels: ReadonlyArray<string>): RunReportArcEntry[] {
  const arc: RunReportArcEntry[] = [];
  let era = -1;
  let phase = -1;
  for (const sample of samples) {
    const detail = `Development ${sample.development.toFixed(0)} · Depth ${sample.depth.toFixed(1)} · Entropy ${sample.entropy.toFixed(0)} · Stability ${sample.stability.toFixed(0)}`;
    if (sample.era !== era) {
      era = sample.era;
      arc.push({ second: sample.second, label: arc.length ? `Entered ${eraNames[era] ?? `Era ${era}`}` : `Began in ${eraNames[era] ?? `Era ${era}`}`, detail });
      phase = sample.dramaPhase;
      continue;
    }
    if (sample.dramaPhase !== phase) {
      phase = sample.dramaPhase;
      arc.push({ second: sample.second, label: `${dramaLabels[phase] ?? `Phase ${phase}`} phase`, detail });
    }
  }
  return arc;
}

export interface RunReportHarvestDetails {
  grade: HarvestGrade;
  depth: number;
  credits: number;
  rewardMultiplier: number;
  objectiveCompleted: boolean;
  rewards: Record<ResourceKey, number>;
}

export interface RunReportContext {
  reason: RunEndReason;
  chaotic: boolean;
  details: RunReportHarvestDetails;
  eraNames: ReadonlyArray<string>;
  dramaLabels: ReadonlyArray<string>;
  resourceLabels: Readonly<Record<string, string>>;
  traitNames: string[];
  pathName: string;
  objectiveTitle: string;
}

/**
 * What to do differently, derived from this run's own numbers rather than from a table of tips. Each
 * entry names the mechanism and the threshold it missed, so it is checkable rather than advisory.
 */
export function runLessons(civ: Civilization, context: RunReportContext, depth: number, credits: number): string[] {
  const lessons: string[] = [];
  const grade = context.details.grade;
  const nextBand = DEPTH_BANDS.find(band => band.minDepth > depth);
  if (context.reason === 'abandoned') {
    lessons.push('Abandoning banks nothing. Even a Premature chaotic harvest returns a salvage floor of 8 Causal Mass, so there is never a reason to release a run instead of collapsing it.');
  }
  if (grade === 'premature') {
    lessons.push(civ.eventChoices < 3
      ? `The run resolved ${civ.eventChoices} intervention${civ.eventChoices === 1 ? '' : 's'}. Three plus Expansion era is the floor a harvest has to clear before it pays any Cultivation Credits.`
      : civ.era <= 0
        ? `The run never left ${context.eraNames[0] ?? 'Emergence'}. A payout needs Expansion, which is 2,500 years — Accelerate (2) buys 200 of them per use.`
        : `Cultivation Depth finished at ${depth.toFixed(1)}; Established starts at 1.5, which is Development 120.`);
  }
  if (context.reason === 'stability_collapse') {
    lessons.push(`Stability, not Entropy, ended this run — it hit zero with Entropy at ${civ.tactical.entropy.toFixed(0)}. Stabilize (1) is +14 for 2 Control, and every Entropy Vent charges 10 of the same number.`);
  }
  if (civ.tactical.entropy >= 100 && context.reason !== 'stability_collapse') {
    lessons.push('Entropy reached 100 and the cascade took the rest. Containment upgrades divide the rate permanently; Entropy Vent (4) only removes 18 at a time.');
  }
  const unusedControl = civ.tactical.controlCapacity;
  const totalActions = Object.values(civ.tactical.actionUsage ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  if (unusedControl >= 2 && context.reason !== 'controlled_harvest') {
    lessons.push(`The run ended with ${unusedControl} Control unspent after ${totalActions} tactical action${totalActions === 1 ? '' : 's'}. Control does not carry over — an unspent charge is a discarded one.`);
  }
  if (context.objectiveTitle && !context.details.objectiveCompleted && grade !== 'premature') {
    lessons.push(`The Directive objective "${context.objectiveTitle}" was not met. It is worth ×1.15 on the whole harvest plus one Cultivation Credit, which at this depth was about ${Math.max(1, Math.round(credits * 0.15) + 1)} credit${Math.max(1, Math.round(credits * 0.15) + 1) === 1 ? '' : 's'}.`);
  }
  if (nextBand && grade !== 'premature' && context.reason === 'controlled_harvest') {
    lessons.push(`${HARVEST_GRADE_LABELS[nextBand.grade]} begins at Depth ${nextBand.minDepth}, which was ${(nextBand.minDepth - depth).toFixed(1)} away. The harvest call in the pressure rail says when that distance stops being reachable.`);
  }
  if (credits >= DEPTH_CREDIT_CAP) {
    lessons.push(`Cultivation Credits are capped at ${DEPTH_CREDIT_CAP} and this run hit the cap. Past it only raw resource yield grows, so staying longer buys upgrades rather than prestige.`);
  }
  if (!lessons.length) {
    lessons.push(`Nothing went wrong: ${grade} grade at Depth ${depth.toFixed(1)} for ${credits} Cultivation Credit${credits === 1 ? '' : 's'}. Spend the harvest on Containment for a longer next run, or on the harvest modules for more out of the same one.`);
  }
  return lessons;
}

export function buildRunReport(civ: Civilization, context: RunReportContext): RunReport {
  const samples = traceSamples(civ);
  // The run ended between samples, so its final state is appended rather than left to the last
  // periodic one -- otherwise the report's own totals disagree with its curve.
  const final = traceSample(civ);
  const curve = samples.length && samples[samples.length - 1]!.second >= final.second ? samples : [...samples, final];
  const depth = context.details.depth;
  const credits = context.details.credits;
  const rewards = context.details.rewards;
  const resourceTotal = RESOURCE_KEYS.reduce((sum, key) => sum + Math.max(0, rewards[key] ?? 0), 0);
  const resources: RunReportResource[] = RESOURCE_KEYS.map(key => {
    const amount = Math.max(0, rewards[key] ?? 0);
    return {
      key,
      label: context.resourceLabels[key] ?? key,
      amount,
      share: resourceTotal > 0 ? Math.round(amount / resourceTotal * 1000) / 10 : 0,
    };
  });
  return {
    version: 1,
    seed: civ.seed,
    reason: context.reason,
    reasonTitle: REASON_TITLES[context.reason],
    reasonDetail: reasonDetail(context.reason, civ, context.details.grade, credits, depth),
    chaotic: context.chaotic,
    terminal: Boolean(civ.terminal),
    elapsedSeconds: Math.round(Math.max(0, civ.elapsedSeconds) * 10) / 10,
    years: Math.trunc(Math.max(0, civ.years)),
    era: civ.era,
    eraName: context.eraNames[civ.era] ?? `Era ${civ.era}`,
    development: Math.round(civ.development * 10) / 10,
    depth: Math.round(depth * 100) / 100,
    grade: context.details.grade,
    gradeLabel: HARVEST_GRADE_LABELS[context.details.grade],
    credits,
    rewardMultiplier: Math.round(context.details.rewardMultiplier * 1000) / 1000,
    objectiveTitle: context.objectiveTitle,
    objectiveCompleted: Boolean(context.details.objectiveCompleted),
    interventions: civ.eventChoices,
    traits: [...context.traitNames],
    institutions: [...civ.institutions],
    dominantPath: context.pathName,
    endgameStates: [...(civ.pathState.endgameStates ?? [])],
    dramaPhase: civilizationDramaPhase(civ).label,
    entropy: Math.round(civ.tactical.entropy * 10) / 10,
    stats: { ...civ.stats },
    peakDevelopment: Math.max(...curve.map(sample => sample.development), civ.development),
    peakDepth: Math.round(Math.max(...curve.map(sample => sample.depth), depth) * 100) / 100,
    peakEntropy: Math.max(...curve.map(sample => sample.entropy), civ.tactical.entropy),
    resources,
    resourceTotal,
    arc: runArc(curve, context.eraNames, context.dramaLabels),
    timeline: civ.history.slice(0, REPORT_TIMELINE_ENTRIES),
    lessons: runLessons(civ, context, depth, credits),
    trace: curve,
  };
}
