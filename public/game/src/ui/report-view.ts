import { duration, esc, fmt, pct } from './format.js';
import { explainNote } from './guide-view.js';
import { disclosureAttr } from './disclosure.js';
import { endgameStateLabel, fill, institutionName, text } from '../data/i18n.js';
import type { RunReport, RunTraceSample } from '../game/types.js';

// The post-run account. It answers four questions in this order, because that is the order a player
// asks them: how did it develop, why did it stop, what did it pay, and what should change.
//
// Everything it prints was computed by `game/run-report.ts` at the moment the run ended, so the panel
// is pure formatting -- it cannot disagree with what was banked.

interface Series {
  id: string;
  label: string;
  points: string;
}

// Three normalized polylines over the same box: Development against its own peak (the run's growth),
// Entropy against 100 (the clock), Stability against its maximum (what pays for the clock). Inline
// SVG, no library, no external asset -- the service worker precaches nothing extra for it.
//
// Stability is scaled by the run's declared maximum, not by the highest value the samples happened to
// reach: normalizing to the observed peak drew a run that never rose above 60 as though 60 were full,
// next to an Entropy line already drawn against a fixed 100.
export function runCurve(samples: RunTraceSample[], stabilityMax = 100): string {
  if (samples.length < 2) return '';
  const width = 100;
  const height = 34;
  const span = Math.max(1e-6, samples[samples.length - 1]!.second - samples[0]!.second);
  const peakDevelopment = Math.max(1, ...samples.map(sample => sample.development));
  const stabilityScale = Math.max(1, stabilityMax);
  const project = (pick: (sample: RunTraceSample) => number, max: number): string => samples
    .map(sample => {
      const x = (sample.second - samples[0]!.second) / span * width;
      const y = height - Math.max(0, Math.min(1, pick(sample) / max)) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  const copy = text().ui.reportView;
  const series: Series[] = [
    { id: 'development', label: copy.development, points: project(sample => sample.development, peakDevelopment) },
    { id: 'entropy', label: copy.entropy, points: project(sample => sample.entropy, 100) },
    { id: 'stability', label: copy.stability, points: project(sample => sample.stability, stabilityScale) },
  ];
  const lines = series.map(entry => `<polyline class="curve-${entry.id}" points="${entry.points}" fill="none" vector-effect="non-scaling-stroke"></polyline>`).join('');
  const legend = series.map(entry => `<span class="curve-key curve-${entry.id}">${esc(entry.label)}</span>`).join('');
  return `<div class="report-curve">
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="${esc(copy.curveAria)}">${lines}</svg>
    <div class="curve-legend">${legend}<small>${esc(duration(samples[0]!.second))} → ${esc(duration(samples[samples.length - 1]!.second))}, ${esc(fill(copy.samples, { count: samples.length }))}</small></div>
  </div>`;
}

function figure(label: string, value: string, hint = ''): string {
  return `<article><span>${esc(label)}</span><b>${esc(value)}</b>${hint ? `<small>${esc(hint)}</small>` : ''}</article>`;
}

// `focus` is the guided run's highlight, rendered into the panel's own class list like every other
// anchored surface -- a class added to the DOM afterwards would read as a diff to `replaceIfChanged`.
export function runReportPanel(report: RunReport | null, explain = false, focus = ''): string {
  if (!report) return '';
  const copy = text().ui.reportView;
  const paid = report.resourceTotal > 0;
  // Two clocks, and they are not the same number: SIMULATION TIME is accelerated in-game seconds, so
  // at 4x a five-minute run cost the player well under two. A run recorded before the wall-clock
  // existed reports 0 and the figure is omitted rather than filled with a measurement never taken.
  const realSeconds = Math.max(0, Number(report.realSeconds) || 0);
  const resources = report.resources.map(entry => `
    <div class="report-resource">
      <span>${esc(entry.label)}</span>
      <b>${fmt(entry.amount)}</b>
      <div class="meter"><i style="width:${pct(entry.share)}"></i></div>
      <small>${esc(fill(copy.percentOfYield, { share: entry.share.toFixed(1) }))}</small>
    </div>`).join('');
  const arc = report.arc.length
    ? report.arc.map(entry => `<li><b>${esc(entry.label)}</b><span>${esc(duration(entry.second))}</span><small>${esc(entry.detail)}</small></li>`).join('')
    : `<li><b>${esc(copy.noPhaseChange)}</b><small>${esc(copy.endedInsideStartState)}</small></li>`;
  const timeline = report.timeline.length
    ? report.timeline.map(entry => `<li>${esc(entry)}</li>`).join('')
    : `<li>${esc(copy.noRecordedHistory)}</li>`;
  // Traits arrive already localized in the report; institutions and end-states are stored as ids, so
  // they are named here rather than being humanized into snake_case on screen.
  const chips = [
    ...report.traits.map(trait => ({ kind: 'trait', label: trait })),
    ...report.institutions.map(institution => ({ kind: 'institution', label: institutionName(institution) ?? institution.replaceAll('_', ' ') })),
    ...report.endgameStates.map(state => ({ kind: 'endgame', label: endgameStateLabel(state) ?? state.replace('endgame_', '').replaceAll('_', ' ') })),
  ].map(chip => `<span class="chip-${chip.kind}">${esc(chip.label)}</span>`).join('');
  const objective = report.objectiveTitle
    ? `<p class="report-objective ${report.objectiveCompleted ? 'met' : 'missed'}">${esc(text().ui.app.directiveObjective)} // ${esc(report.objectiveTitle)} — ${esc(report.objectiveCompleted ? copy.objectiveMet : copy.objectiveNotMet)}</p>`
    : '';
  return `<section class="panel run-report reason-${esc(report.reason)}${focus}">
    <!-- The seed is an identifier, not a magnitude: abbreviating it to 885.18M makes it unusable
         for the one thing a player wants it for, which is recognising the run again. -->
    <div class="panel-kicker">${esc(fill(copy.runReportCivilization, { seed: report.seed }))}${report.terminal ? esc(copy.terminalSuffix) : ''}</div>
    <div class="report-head">
      <div class="report-reason"><h2>${esc(report.reasonTitle)}</h2><p>${esc(report.reasonDetail)}</p></div>
      <div class="report-grade"><span>${esc(copy.harvestGrade)}</span><b>${esc(report.gradeLabel)}</b><small>${esc(fill(report.credits === 1 ? copy.harvestSummaryOne : copy.harvestSummaryMany, { depth: report.depth.toFixed(1), multiplier: report.rewardMultiplier.toFixed(2), credits: report.credits }))}</small></div>
    </div>
    ${explainNote('run_report', explain)}
    ${objective}
    <div class="report-figures">
      ${figure(copy.simulationTime, duration(report.elapsedSeconds), fill(copy.civilizationYears, { years: fmt(report.years) }))}
      ${realSeconds > 0 ? figure(copy.activeRealTime, duration(realSeconds), copy.activeRealTimeHint) : ''}
      ${figure(copy.endedIn, report.eraName, fill(copy.phase, { phase: report.dramaPhase }))}
      ${figure(copy.development.toUpperCase(), fmt(report.development), fill(copy.peak, { value: fmt(report.peakDevelopment) }))}
      ${figure(text().ui.app.depth, report.depth.toFixed(1), fill(copy.peak, { value: report.peakDepth.toFixed(1) }))}
      ${figure(copy.interventions, `${report.interventions}`, report.dominantPath ? fill(copy.path, { path: report.dominantPath }) : copy.noDominantPath)}
      ${figure(copy.entropyAtEnd, report.entropy.toFixed(0), fill(copy.peakOf100, { value: report.peakEntropy.toFixed(0) }))}
      ${figure(copy.stabilityAtEnd, report.stats.stability.toFixed(0), fill(copy.ofMax, { max: report.stats.stabilityMax.toFixed(0) }))}
      ${figure(copy.sanityAwarenessAttention, `${report.stats.sanity.toFixed(0)} / ${report.stats.awareness.toFixed(0)} / ${report.stats.attention.toFixed(0)}`)}
    </div>
    ${runCurve(report.trace, report.stats.stabilityMax)}
    <div class="report-columns">
      <div class="report-block">
        <span class="panel-kicker">${esc(copy.resourcesFarmed)}</span>
        ${paid ? `<div class="report-resources">${resources}</div><small class="report-total">${esc(fill(copy.unitsBanked, { units: fmt(report.resourceTotal) }))}</small>` : `<p class="report-empty">${esc(copy.nothingBanked)}</p>`}
      </div>
      <div class="report-block">
        <span class="panel-kicker">${esc(copy.howItDeveloped)}</span>
        <ol class="report-arc">${arc}</ol>
      </div>
    </div>
    <div class="report-lessons">
      <span class="panel-kicker">${esc(copy.whatThisRunSuggests)}</span>
      <ul>${report.lessons.map(lesson => `<li>${esc(lesson)}</li>`).join('')}</ul>
    </div>
    ${chips ? `<div class="report-chips">${chips}</div>` : ''}
    <details class="report-record" data-disclosure="report-record"${disclosureAttr('report-record')}><summary>${esc(copy.civilizationRecord)}</summary><ol class="history">${timeline}</ol></details>
    <button class="ghost" data-action="dismiss-report">${esc(copy.dismissReport)}</button>
  </section>`;
}
