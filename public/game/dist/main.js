import { GameEngine } from './game/engine.js';
import { startWorldRenderer } from './render/world.js';
import { createGameUI } from './ui/app.js';
const engine = new GameEngine();
const worldHost = document.querySelector('#world-surface');
const world = startWorldRenderer(engine, worldHost);
createGameUI(engine, world);
const tacticalKeys = {
    Digit1: 'stabilize', Numpad1: 'stabilize',
    Digit2: 'accelerate', Numpad2: 'accelerate',
    Digit3: 'probe', Numpad3: 'probe',
    Digit4: 'vent', Numpad4: 'vent',
};
window.addEventListener('keydown', (event) => {
    const action = tacticalKeys[event.code];
    const target = event.target;
    if (!action || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey)
        return;
    if (target?.isContentEditable || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)
        return;
    if (engine.state.phase !== 'civilization')
        return;
    event.preventDefault();
    engine.useTacticalAction(action);
});
// Confirmation happens inside the page: confirm() is suppressed in fullscreen, in the installed
// fullscreen PWA and in embedded frames, which silently turned the reset into a no-op there.
const resetButton = document.querySelector('#reset-save');
const RESET_ARM_MS = 4000;
let resetArmTimer = 0;
// The armed state is announced through a live region rather than by rewriting aria-label. Mutating
// the label of an element that already has focus is not reliably re-announced, so the one warning
// that matters -- that the next click erases everything -- could pass unheard.
const resetAnnouncer = (() => {
    const existing = document.querySelector('#reset-announcer');
    if (existing)
        return existing;
    const region = document.createElement('p');
    region.id = 'reset-announcer';
    region.className = 'visually-hidden';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'assertive');
    resetButton.parentElement?.appendChild(region) ?? document.body.appendChild(region);
    return region;
})();
function disarmReset() {
    if (!resetArmTimer)
        return;
    clearTimeout(resetArmTimer);
    resetArmTimer = 0;
    resetButton.classList.remove('is-armed');
    resetButton.textContent = '⌫';
    resetButton.title = 'Reset browser save';
    resetButton.setAttribute('aria-label', 'Reset browser save');
    resetAnnouncer.textContent = '';
}
resetButton.addEventListener('click', () => {
    if (resetArmTimer) {
        disarmReset();
        engine.deleteSave();
        return;
    }
    resetButton.classList.add('is-armed');
    resetButton.textContent = 'ERASE SAVE?';
    resetButton.title = 'Click again to erase the browser save and reset all progress';
    resetButton.setAttribute('aria-label', 'Confirm: erase the browser save and reset all Machine Insight, unlocks and progress');
    resetAnnouncer.textContent = `Erase save armed. Click again within ${RESET_ARM_MS / 1000} seconds to erase the browser save and reset all Machine Insight, unlocks and progress.`;
    resetArmTimer = setTimeout(disarmReset, RESET_ARM_MS);
});
resetButton.addEventListener('blur', disarmReset);
let previous = performance.now();
let accumulator = 0;
function frame(now) {
    const delta = Math.min(.25, (now - previous) / 1000);
    previous = now;
    if (engine.state.phase === 'civilization')
        engine.tick(delta);
    accumulator += delta;
    if (accumulator >= 5) {
        accumulator = 0;
        engine.save();
    }
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.addEventListener('beforeunload', () => engine.save());
window.addEventListener('pagehide', () => engine.save());
document.addEventListener('visibilitychange', () => {
    if (document.hidden)
        engine.save();
});
window.RCE = engine;
//# sourceMappingURL=main.js.map