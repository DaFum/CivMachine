import { GameEngine } from './game/engine.js';
import { startWorldRenderer } from './render/world.js';
import { createGameUI } from './ui/app.js';

const engine = new GameEngine();
const worldHost = document.querySelector('#world-surface') as HTMLElement;
const world = startWorldRenderer(engine, worldHost);
createGameUI(engine, world);

const tacticalKeys:Readonly<Record<string,'stabilize'|'accelerate'|'probe'|'vent'>>={
  Digit1:'stabilize',Numpad1:'stabilize',
  Digit2:'accelerate',Numpad2:'accelerate',
  Digit3:'probe',Numpad3:'probe',
  Digit4:'vent',Numpad4:'vent',
};
window.addEventListener('keydown',(event:KeyboardEvent)=>{
  const action=tacticalKeys[event.code];
  const target=event.target as HTMLElement|null;
  if(!action||event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
  if(target?.isContentEditable||target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement||target instanceof HTMLSelectElement)return;
  if(engine.state.phase!=='civilization')return;
  event.preventDefault();
  engine.useTacticalAction(action);
});

// Confirmation happens inside the page: confirm() is suppressed in fullscreen, in the installed
// fullscreen PWA and in embedded frames, which silently turned the reset into a no-op there.
const resetButton = document.querySelector('#reset-save') as HTMLButtonElement;
const RESET_ARM_MS = 4000;
let resetArmTimer = 0;
function disarmReset(){
  if(!resetArmTimer)return;
  clearTimeout(resetArmTimer); resetArmTimer = 0;
  resetButton.classList.remove('is-armed');
  resetButton.textContent = '⌫';
  resetButton.title = 'Reset browser save';
  resetButton.setAttribute('aria-label', 'Reset browser save');
}
resetButton.addEventListener('click', () => {
  if(resetArmTimer){ disarmReset(); engine.deleteSave(); return; }
  resetButton.classList.add('is-armed');
  resetButton.textContent = 'ERASE SAVE?';
  resetButton.title = 'Click again to erase the browser save and reset all progress';
  resetButton.setAttribute('aria-label', 'Confirm: erase the browser save and reset all Machine Insight, unlocks and progress');
  resetArmTimer = setTimeout(disarmReset, RESET_ARM_MS) as unknown as number;
});
resetButton.addEventListener('blur', disarmReset);

let previous = performance.now();
let accumulator = 0;
function frame(now:number){
  const delta = Math.min(.25, (now - previous) / 1000); previous = now;
  if (engine.state.phase === 'civilization') engine.tick(delta);
  accumulator += delta;
  if (accumulator >= 5){ accumulator = 0; engine.save(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.addEventListener('beforeunload',()=>engine.save());
window.addEventListener('pagehide',()=>engine.save());
document.addEventListener('visibilitychange',()=>{
  if(document.hidden) engine.save();
});
(window as any).RCE = engine;
