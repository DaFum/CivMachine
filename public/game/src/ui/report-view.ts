import { duration, esc, fmt, pct } from './format.js';
import { explainNote } from './guide-view.js';
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
export function runCurve(samples: RunTraceSample[]): string {
  if (samples.length < 2) return '';
  const width = 100;
  const height = 34;
  const span = Math.max(1e-6, samples[samples.length - 1]!.second - samples[0]!.second);
  const peakDevelopment = Math.max(1, ...samples.map(sample => sample.development));
  const peakStability = Math.max(1, ...samples.map(sample => sample.stability));
  const project = (pick: (sample: RunTraceSample) => number, max: number): string => samples
    .map(sample => {
      const x = (sample.second - samples[0]!.second) / span * width;
      const y = height - Math.max(0, Math.min(1, pick(sample) / max)) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  const series: Series[] = [
    { id: 'development', label: 'Development', points: project(sample => sample.development, peakDevelopment) },
    { id: 'entropy', label: 'Entropy', points: project(sample => sample.entropy, 100) },
    { id: 'stability', label: 'Stability', points: project(sample => sample.stability, peakStability) },
  ];
  const lines = series.map(entry => `<polyline class="curve-${entry.id}" points="${entry.points}" fill="none" vector-effect="non-scaling-stroke"></polyline>`).join('');
  const legend = series.map(entry => `<span class="curve-key curve-${entry.id}">${esc(entry.label)}</span>`).join('');
  return `<div class="report-curve">
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Development, Entropy and Stability over the run">${lines}</svg>
    <div class="curve-legend">${legend}<small>${esc(duration(samples[0]!.second))} → ${esc(duration(samples[samples.length - 1]!.second))}, ${samples.length} samples</small></div>
  </div>`;
}

function figure(label: string, value: string, hint = ''): string {
  return `<article><span>${esc(label)}</span><b>${esc(value)}</b>${hint ? `<small>${esc(hint)}</small>` : ''}</article>`;
}

export function runReportPanel(report: RunReport | null, explain = false): string {
  if (!report) return '';
  const paid = report.resourceTotal > 0;
  const resources = report.resources.map(entry => `
    <div class="report-resource">
      <span>${esc(entry.label)}</span>
      <b>${fmt(entry.amount)}</b>
      <div class="meter"><i style="width:${pct(entry.share)}"></i></div>
      <small>${entry.share.toFixed(1)}% of the yield</small>
    </div>`).join('');
  const arc = report.arc.length
    ? report.arc.map(entry => `<li><b>${esc(entry.label)}</b><span>${esc(duration(entry.second))}</span><small>${esc(entry.detail)}</small></li>`).join('')
    : '<li><b>No phase change recorded</b><small>The run ended inside the state it started in.</small></li>';
  const timeline = report.timeline.length
    ? report.timeline.map(entry => `<li>${esc(entry)}</li>`).join('')
    : '<li>No recorded history.</li>';
  const chips = [
    ...report.traits.map(trait => ({ kind: 'trait', label: trait })),
    ...report.institutions.map(institution => ({ kind: 'institution', label: institution })),
    ...report.endgameStates.map(state => ({ kind: 'endgame', label: state.replace('endgame_', '').replaceAll('_', ' ') })),
  ].map(chip => `<span class="chip-${chip.kind}">${esc(chip.label)}</span>`).join('');
  const objective = report.objectiveTitle
    ? `<p class="report-objective ${report.objectiveCompleted ? 'met' : 'missed'}">DIRECTIVE OBJECTIVE // ${esc(report.objectiveTitle)} — ${report.objectiveCompleted ? 'MET, ×1.15 and +1 Cultivation Credit' : 'NOT MET'}</p>`
    : '';
  return `<section class="panel run-report reason-${esc(report.reason)}">
    <!-- The seed is an identifier, not a magnitude: abbreviating it to 885.18M makes it unusable
         for the one thing a player wants it for, which is recognising the run again. -->
    <div class="panel-kicker">RUN REPORT // CIVILIZATION ${esc(report.seed)}${report.terminal ? ' // TERMINAL' : ''}</div>
    <div class="report-head">
      <div class="report-reason"><h2>${esc(report.reasonTitle)}</h2><p>${esc(report.reasonDetail)}</p></div>
      <div class="report-grade"><span>HARVEST GRADE</span><b>${esc(report.gradeLabel)}</b><small>DEPTH ${report.depth.toFixed(1)} · ×${report.rewardMultiplier.toFixed(2)} yield · ${report.credits} Cultivation Credit${report.credits === 1 ? '' : 's'}</small></div>
    </div>
    ${explainNote('run_report', explain)}
    ${objective}
    <div class="report-figures">
      ${figure('LASTED', duration(report.elapsedSeconds), `${fmt(report.years)} civilization years`)}
      ${figure('ENDED IN', report.eraName, `${esc(report.dramaPhase)} phase`)}
      ${figure('DEVELOPMENT', fmt(report.development), `peak ${fmt(report.peakDevelopment)}`)}
      ${figure('DEPTH', report.depth.toFixed(1), `peak ${report.peakDepth.toFixed(1)}`)}
      ${figure('INTERVENTIONS', `${report.interventions}`, report.dominantPath ? `path: ${report.dominantPath}` : 'no dominant path')}
      ${figure('ENTROPY AT END', report.entropy.toFixed(0), `peak ${report.peakEntropy.toFixed(0)} of 100`)}
      ${figure('STABILITY AT END', report.stats.stability.toFixed(0), `of ${report.stats.stabilityMax.toFixed(0)}`)}
      ${figure('SANITY / AWARENESS / ATTENTION', `${report.stats.sanity.toFixed(0)} / ${report.stats.awareness.toFixed(0)} / ${report.stats.attention.toFixed(0)}`)}
    </div>
    ${runCurve(report.trace)}
    <div class="report-columns">
      <div class="report-block">
        <span class="panel-kicker">RESOURCES FARMED</span>
        ${paid ? `<div class="report-resources">${resources}</div><small class="report-total">${fmt(report.resourceTotal)} units banked in total.</small>` : '<p class="report-empty">Nothing was banked. This run paid no resources at all.</p>'}
      </div>
      <div class="report-block">
        <span class="panel-kicker">HOW IT DEVELOPED</span>
        <ol class="report-arc">${arc}</ol>
      </div>
    </div>
    <div class="report-lessons">
      <span class="panel-kicker">WHAT THIS RUN SUGGESTS</span>
      <ul>${report.lessons.map(lesson => `<li>${esc(lesson)}</li>`).join('')}</ul>
    </div>
    ${chips ? `<div class="report-chips">${chips}</div>` : ''}
    <details class="report-record"><summary>Civilization record</summary><ol class="history">${timeline}</ol></details>
    <button class="ghost" data-action="dismiss-report">DISMISS REPORT</button>
  </section>`;
}
