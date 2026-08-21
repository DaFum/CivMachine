import { esc } from './format.js';
import type { TutorialView } from '../game/tutorial.js';

// The guided run's one piece of UI: a coach card pinned over the layout, never a modal. It must not
// be able to block a decision -- a player who ignores it entirely still plays a normal game, and the
// step advances the moment they do the thing it asked for.

export function tutorialOverlay(view: TutorialView): string {
  const step = view.step;
  if (!view.visible || !step) return '';
  if (view.collapsed) {
    return `<div class="tutorial-card is-collapsed" role="region" aria-label="Guided run">
      <button class="tutorial-expand" data-action="tutorial-collapse" data-collapsed="0" aria-expanded="false">GUIDED RUN ${step.index}/${step.total} · ${esc(step.title)} <b>SHOW</b></button>
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
  const hint = (text: string) => `<p class="tutorial-waiting" role="status">${esc(text)}</p>`;
  const waiting = step.offPhaseHint || 'Waiting for you to make the move above.';
  const foot = step.canAcknowledge
    ? `${step.offPhaseHint ? hint(step.offPhaseHint) : ''}<button class="primary" data-action="tutorial-next">CONTINUE</button>`
    : hint(waiting);
  const action = step.canAcknowledge || !step.action ? '' : `<p class="tutorial-action"><b>DO</b>${esc(step.action)}</p>`;
  return `<div class="tutorial-card" role="region" aria-label="Guided run">
    <div class="tutorial-head">
      <span class="panel-kicker">GUIDED RUN // STEP ${step.index} OF ${step.total}</span>
      <div class="tutorial-head-buttons">
        <button class="ghost" data-action="tutorial-collapse" data-collapsed="1" aria-expanded="true" title="Collapse the guided run card">HIDE</button>
        <button class="ghost" data-action="tutorial-skip" title="Dismiss the guided run; the Field Manual stays available">SKIP</button>
      </div>
    </div>
    ${progress}
    <h4>${esc(step.title)}</h4>
    <p class="tutorial-what"><b>WHAT</b>${esc(step.what)}</p>
    <p class="tutorial-where"><b>WHERE</b>${esc(step.where)}</p>
    <p class="tutorial-why"><b>WHY</b>${esc(step.why)}</p>
    ${action}
    <div class="tutorial-foot">${foot}</div>
  </div>`;
}

// Offered in the Machine view whenever the guided run is not running, so a player who skipped it or
// finished it a week ago can get it back without touching their save.
export function tutorialReplay(view: TutorialView): string {
  if (!view.replayable) return '';
  const label = view.status === 'completed' ? 'REPLAY GUIDED RUN' : 'START GUIDED RUN';
  const note = view.status === 'completed'
    ? 'The guided run is finished. Replaying it changes nothing about your progress.'
    : 'The guided run was skipped. It walks through one civilization from start to harvest.';
  return `<div class="tutorial-replay"><span>${esc(note)}</span><button class="ghost" data-action="tutorial-restart">${label}</button></div>`;
}
