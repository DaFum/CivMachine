import { GameEngine } from './game/engine.js';
import { startWorldRenderer } from './render/world.js';
import { createGameUI } from './ui/app.js';
const engine = new GameEngine();
const worldHost = document.querySelector('#phaser-world');
const world = startWorldRenderer(engine, worldHost);
createGameUI(engine, world);
const tacticalKeys = {
    Digit1: 'stabilize', Numpad1: 'stabilize',
    Digit2: 'accelerate', Numpad2: 'accelerate',
    Digit3: 'probe', Numpad3: 'probe',
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
document.querySelector('#reset-save').addEventListener('click', () => {
    if (confirm('Erase the browser save and reset all Machine Insight, unlocks, and progress?'))
        engine.deleteSave();
});
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