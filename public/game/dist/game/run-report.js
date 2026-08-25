import { civilizationDramaPhase, dramaPhaseLabel } from './drama.js';
import { cultivationDepth, DEPTH_BANDS, DEPTH_CREDIT_CAP, HARVEST_GRADE_LABELS } from './harvest-quality.js';
import { RESOURCE_KEYS } from './rules.js';
import { eraName, fill, harvestGradeLabel, text } from '../data/i18n.js';
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
export function newRunTrace() {
    return { version: 1, intervalSeconds: TRACE_BASE_INTERVAL_SECONDS, nextSampleAt: 0, samples: [] };
}
const SAMPLE_NUMBERS = [
    'second', 'years', 'era', 'development', 'depth', 'entropy',
    'stability', 'sanity', 'awareness', 'attention', 'choices', 'dramaPhase',
];
// Every sample is read positionally by the report -- `runArc` reaches into `sample.era`, the curve
// maps `sample.development` -- so a single null or half-written entry is a crash at the moment a run
// ends, which is the worst possible moment for one. Checked here rather than at each reader.
function validRunTraceSample(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return false;
    const raw = value;
    return SAMPLE_NUMBERS.every(key => typeof raw[key] === 'number' && Number.isFinite(raw[key]));
}
export function validRunTrace(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return false;
    const raw = value;
    // The interval has to be positive, not merely finite: a stored 0 makes every tick due for a sample
    // and doubling it cannot recover, which turns the trace into exactly the per-frame work the engine
    // is not allowed to do.
    return raw.version === 1 && typeof raw.intervalSeconds === 'number' && Number.isFinite(raw.intervalSeconds)
        && raw.intervalSeconds > 0
        && typeof raw.nextSampleAt === 'number' && Number.isFinite(raw.nextSampleAt)
        // A malformed sample invalidates the whole trace rather than being filtered out of it. Dropping
        // entries would leave a curve with a hole in it presented as the run's shape, and the rule this
        // module already states is that a trace that cannot be read is discarded, never repaired.
        && Array.isArray(raw.samples) && raw.samples.every(validRunTraceSample);
}
export function traceSample(civ) {
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
export function recordRunTrace(civ) {
    const trace = validRunTrace(civ.trace) ? civ.trace : (civ.trace = newRunTrace());
    if (civ.elapsedSeconds + 1e-9 < trace.nextSampleAt)
        return false;
    trace.samples.push(traceSample(civ));
    if (trace.samples.length > TRACE_MAX_SAMPLES) {
        trace.samples = trace.samples.filter((_sample, index) => index % 2 === 0);
        trace.intervalSeconds *= 2;
    }
    trace.nextSampleAt = civ.elapsedSeconds + trace.intervalSeconds;
    return true;
}
export function traceSamples(civ) {
    return validRunTrace(civ.trace) ? [...civ.trace.samples] : [];
}
function reasonDetail(reason, civ, gradeId, credits, depth) {
    const year = Math.trunc(civ.years);
    const entropy = civ.tactical.entropy.toFixed(0);
    const copy = text().reports.runReport.reasonDetails;
    // `HarvestGrade` stays the identifier the callers switch on; what a sentence prints is its name.
    const grade = harvestGradeLabel(gradeId) ?? HARVEST_GRADE_LABELS[gradeId];
    switch (reason) {
        case 'controlled_harvest':
            return fill(credits === 1 ? copy.controlledOneCredit : copy.controlledManyCredits, { year, depth: depth.toFixed(1), grade, credits });
        case 'forced_chaotic_harvest':
            return fill(copy.forcedChaotic, { year, entropy });
        case 'stability_collapse':
            return fill(copy.stabilityCollapse, { year, entropy });
        case 'abandoned':
            return fill(copy.abandoned, { year, grade });
        case 'convergence_won':
            return fill(copy.convergenceWon, { depth: depth.toFixed(1), year });
        case 'convergence_failed':
            return fill(copy.convergenceFailed, { year, depth: depth.toFixed(1) });
    }
}
// How the run developed: every era and drama-phase transition the trace saw, in the order they
// happened, each stamped with the second it happened at and what the run looked like then.
export function runArc(samples, eraNames, dramaLabels) {
    const arc = [];
    let era = -1;
    let phase = -1;
    const copy = text().reports.runReport.arc;
    for (const sample of samples) {
        const detail = fill(copy.detail, {
            development: sample.development.toFixed(0), depth: sample.depth.toFixed(1),
            entropy: sample.entropy.toFixed(0), stability: sample.stability.toFixed(0),
        });
        if (sample.era !== era) {
            era = sample.era;
            const name = eraNames[era] ?? fill(copy.eraFallback, { era });
            arc.push({ second: sample.second, label: fill(arc.length ? copy.enteredEra : copy.beganEra, { era: name }), detail });
            phase = sample.dramaPhase;
            continue;
        }
        if (sample.dramaPhase !== phase) {
            phase = sample.dramaPhase;
            arc.push({ second: sample.second, label: fill(copy.phase, { phase: dramaLabels[phase] ?? fill(copy.phaseFallback, { phase }) }), detail });
        }
    }
    return arc;
}
/**
 * What to do differently, derived from this run's own numbers rather than from a table of tips. Each
 * entry names the mechanism and the threshold it missed, so it is checkable rather than advisory.
 */
export function runLessons(civ, context, depth, credits) {
    const lessons = [];
    const copy = text().reports.runReport.lessons;
    const grade = context.details.grade;
    const nextBand = DEPTH_BANDS.find(band => band.minDepth > depth);
    if (context.reason === 'abandoned') {
        lessons.push(copy.abandoned);
    }
    if (grade === 'premature') {
        lessons.push(civ.eventChoices < 3
            ? fill(civ.eventChoices === 1 ? copy.prematureOneIntervention : copy.prematureManyInterventions, { eventChoices: civ.eventChoices })
            : civ.era <= 0
                ? fill(copy.prematureEra, { era: context.eraNames[0] ?? eraName('emergence') ?? '' })
                : fill(copy.prematureDepth, { depth: depth.toFixed(1) }));
    }
    if (context.reason === 'stability_collapse') {
        lessons.push(fill(copy.stabilityCollapse, { entropy: civ.tactical.entropy.toFixed(0) }));
    }
    if (civ.tactical.entropy >= 100 && context.reason !== 'stability_collapse') {
        lessons.push(copy.entropyCascade);
    }
    const unusedControl = civ.tactical.controlCapacity;
    const totalActions = Object.values(civ.tactical.actionUsage ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
    if (unusedControl >= 2 && context.reason !== 'controlled_harvest') {
        lessons.push(fill(totalActions === 1 ? copy.unusedControlOneAction : copy.unusedControlManyActions, { control: unusedControl, actions: totalActions }));
    }
    if (context.objectiveTitle && !context.details.objectiveCompleted && grade !== 'premature') {
        const objectiveCredits = Math.max(1, Math.round(credits * 0.15) + 1);
        lessons.push(fill(objectiveCredits === 1 ? copy.directiveOneCredit : copy.directiveManyCredits, { objectiveTitle: context.objectiveTitle, credits: objectiveCredits }));
    }
    if (nextBand && grade !== 'premature' && context.reason === 'controlled_harvest') {
        lessons.push(fill(copy.nextBand, {
            grade: harvestGradeLabel(nextBand.grade) ?? HARVEST_GRADE_LABELS[nextBand.grade],
            minDepth: nextBand.minDepth,
            distance: (nextBand.minDepth - depth).toFixed(1),
        }));
    }
    if (credits >= DEPTH_CREDIT_CAP) {
        lessons.push(fill(copy.creditCap, { cap: DEPTH_CREDIT_CAP }));
    }
    if (!lessons.length) {
        lessons.push(fill(credits === 1 ? copy.cleanOneCredit : copy.cleanManyCredits, { grade: harvestGradeLabel(grade) ?? HARVEST_GRADE_LABELS[grade], depth: depth.toFixed(1), credits }));
    }
    return lessons;
}
export function buildRunReport(civ, context) {
    const samples = traceSamples(civ);
    // The run ended between samples, so its final state is appended rather than left to the last
    // periodic one -- otherwise the report's own totals disagree with its curve.
    const final = traceSample(civ);
    const curve = samples.length && samples[samples.length - 1].second >= final.second ? samples : [...samples, final];
    const depth = context.details.depth;
    const credits = context.details.credits;
    const rewards = context.details.rewards;
    const resourceTotal = RESOURCE_KEYS.reduce((sum, key) => sum + Math.max(0, rewards[key] ?? 0), 0);
    const resources = RESOURCE_KEYS.map(key => {
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
        reasonTitle: text().reports.runReport.reasonTitles[context.reason],
        reasonDetail: reasonDetail(context.reason, civ, context.details.grade, credits, depth),
        chaotic: context.chaotic,
        terminal: Boolean(civ.terminal),
        elapsedSeconds: Math.round(Math.max(0, civ.elapsedSeconds) * 10) / 10,
        years: Math.trunc(Math.max(0, civ.years)),
        era: civ.era,
        eraName: context.eraNames[civ.era] ?? fill(text().reports.runReport.arc.eraFallback, { era: civ.era }),
        development: Math.round(civ.development * 10) / 10,
        depth: Math.round(depth * 100) / 100,
        grade: context.details.grade,
        gradeLabel: harvestGradeLabel(context.details.grade) ?? HARVEST_GRADE_LABELS[context.details.grade],
        credits,
        rewardMultiplier: Math.round(context.details.rewardMultiplier * 1000) / 1000,
        objectiveTitle: context.objectiveTitle,
        objectiveCompleted: Boolean(context.details.objectiveCompleted),
        interventions: civ.eventChoices,
        traits: [...context.traitNames],
        institutions: [...civ.institutions],
        dominantPath: context.pathName,
        endgameStates: [...(civ.pathState.endgameStates ?? [])],
        dramaPhase: dramaPhaseLabel(civilizationDramaPhase(civ)),
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
//# sourceMappingURL=run-report.js.map