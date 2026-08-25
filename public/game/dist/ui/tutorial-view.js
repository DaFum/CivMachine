import { esc } from './format.js';
import { fill, text } from '../data/i18n.js';
// The guided run's one piece of UI: a coach card pinned over the layout, never a modal. It must not
// be able to block a decision -- a player who ignores it entirely still plays a normal game, and the
// step advances the moment they do the thing it asked for.
export function tutorialOverlay(view) {
    const step = view.step;
    if (!view.visible || !step)
        return '';
    const copy = text().ui.tutorialView;
    if (view.collapsed) {
        return `<div class="tutorial-card is-collapsed" role="region" aria-label="${esc(copy.guidedRunAria)}">
      <button class="tutorial-expand" data-action="tutorial-collapse" data-collapsed="0" aria-expanded="false">${esc(copy.guidedRun)} ${step.index}/${step.total} · ${esc(step.title)} <b>${esc(copy.show)}</b></button>
    </div>`;
    }
    const progress = `<div class="tutorial-progress" aria-hidden="true">${Array.from({ length: step.total }, (_unused, index) => `<i class="${index < step.index ? 'done' : ''}"></i>`).join('')}</div>`;
    // A step gated on an action gets a waiting hint instead of a CONTINUE button: clicking past the
    // only part that teaches would leave the player exactly where they started. A reading step keeps
    // its CONTINUE, but an off-phase one still has to say where to go -- otherwise its WHERE points at
    // a panel that is not on screen and nothing on the card admits it.
    // The DO paragraph below is the only place `action` is printed. The foot says what is being waited
    // *on* -- where to go when the step belongs to the other phase, and otherwise just that the card is
    // waiting -- because repeating the action verbatim under it printed the same sentence twice.
    const hint = (message) => `<p class="tutorial-waiting" role="status">${esc(message)}</p>`;
    const waiting = step.offPhaseHint || copy.waiting;
    const foot = step.canAcknowledge
        ? `${step.offPhaseHint ? hint(step.offPhaseHint) : ''}<button class="primary" data-action="tutorial-next">${esc(copy.continue)}</button>`
        : hint(waiting);
    const action = step.canAcknowledge || !step.action ? '' : `<p class="tutorial-action"><b>${esc(copy.do)}</b>${esc(step.action)}</p>`;
    return `<div class="tutorial-card" role="region" aria-label="${esc(copy.guidedRunAria)}">
    <div class="tutorial-head">
      <span class="panel-kicker">${esc(fill(copy.stepOf, { index: step.index, total: step.total }))}</span>
      <div class="tutorial-head-buttons">
        <button class="ghost" data-action="tutorial-collapse" data-collapsed="1" aria-expanded="true" title="${esc(copy.collapseTitle)}">${esc(copy.hide)}</button>
        <button class="ghost" data-action="tutorial-skip" title="${esc(copy.dismissTitle)}">${esc(copy.skip)}</button>
      </div>
    </div>
    ${progress}
    <h4>${esc(step.title)}</h4>
    <p class="tutorial-what"><b>${esc(copy.what)}</b>${esc(step.what)}</p>
    <p class="tutorial-where"><b>${esc(copy.where)}</b>${esc(step.where)}</p>
    <p class="tutorial-why"><b>${esc(copy.why)}</b>${esc(step.why)}</p>
    ${action}
    <div class="tutorial-foot">${foot}</div>
  </div>`;
}
// Offered in the Machine view whenever the guided run is not running, so a player who skipped it or
// finished it a week ago can get it back without touching their save.
export function tutorialReplay(view) {
    if (!view.replayable)
        return '';
    const copy = text().ui.tutorialView;
    const label = view.status === 'completed' ? copy.replayGuidedRun : copy.startGuidedRun;
    const note = view.status === 'completed' ? copy.replayFinished : copy.replaySkipped;
    return `<div class="tutorial-replay"><span>${esc(note)}</span><button class="ghost" data-action="tutorial-restart">${label}</button></div>`;
}
//# sourceMappingURL=tutorial-view.js.map