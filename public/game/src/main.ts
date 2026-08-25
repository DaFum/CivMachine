import { GameEngine } from './game/engine.js';
import { SAVE_VERSION } from './game/rules.js';
import { startWorldRenderer } from './render/world.js';
import { createGameUI } from './ui/app.js';
import { SUPPORTED_LOCALES, fill, text } from './data/i18n.js';

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

// The static chrome in index.html is English, because it has to say something before any module
// runs. Everything in it that a player reads is rewritten from the catalog here -- on boot and again
// on every locale change, which is why this is a function rather than a one-time pass.
const localeSelect = document.querySelector('#locale-select') as HTMLSelectElement | null;
function applyShellText(){
  const shell = text().ui.shell;
  document.title = shell.documentTitle;
  document.documentElement.lang = engine.locale();
  const set = (selector:string, value:string) => {
    const element = document.querySelector(selector);
    if(element) element.textContent = value;
  };
  set('.brand b', shell.brandName);
  set('.brand small', shell.brandNode);
  set('.machine-log .panel-kicker', shell.machineRecord);
  const version = (document.querySelector('#footer-version') as HTMLElement|null)?.dataset.version ?? '';
  set('#footer-version', fill(shell.footerVersion, { version }));
  set('#footer-tech', fill(shell.footerTech, { saveVersion: SAVE_VERSION }));
  const world = document.querySelector('#world-surface');
  world?.setAttribute('aria-label', shell.worldVisualizationAria);
  // The explain button's *title* is the live one -- the UI rewrites it on every render to say whether
  // explain mode is on -- so only its accessible name belongs to the shell.
  document.querySelector('#explain-toggle')?.setAttribute('aria-label', shell.explainAria);
  if(localeSelect){
    localeSelect.title = shell.languageLabel;
    localeSelect.setAttribute('aria-label', shell.languageLabel);
  }
  disarmReset();
}
if(localeSelect){
  localeSelect.replaceChildren(...SUPPORTED_LOCALES.map(locale => {
    const option = document.createElement('option');
    option.value = locale.code; option.textContent = locale.label;
    return option;
  }));
  localeSelect.value = engine.locale();
  // The engine owns the switch: it persists the preference and notifies every surface at once. The
  // shell is not one of its listeners, so it is re-applied here, next to the change that caused it.
  localeSelect.addEventListener('change', () => {
    if(engine.setLocale(localeSelect.value)) applyShellText();
    else localeSelect.value = engine.locale();
  });
}

// Confirmation happens inside the page: confirm() is suppressed in fullscreen, in the installed
// fullscreen PWA and in embedded frames, which silently turned the reset into a no-op there.
const resetButton = document.querySelector('#reset-save') as HTMLButtonElement;
const RESET_ARM_MS = 4000;
let resetArmTimer = 0;
// The armed state is announced through a live region rather than by rewriting aria-label. Mutating
// the label of an element that already has focus is not reliably re-announced, so the one warning
// that matters -- that the next click erases everything -- could pass unheard.
const resetAnnouncer = (():HTMLElement=>{
  const existing = document.querySelector('#reset-announcer') as HTMLElement|null;
  if(existing) return existing;
  const region = document.createElement('p');
  region.id = 'reset-announcer';
  region.className = 'visually-hidden';
  region.setAttribute('role','status');
  region.setAttribute('aria-live','assertive');
  resetButton.parentElement?.appendChild(region) ?? document.body.appendChild(region);
  return region;
})();
// Disarming also restores the resting label, so this is what puts the button back into the current
// language after a locale switch -- armed or not.
function disarmReset(){
  const copy = text().ui.resetSave;
  resetButton.textContent = '⌫';
  resetButton.title = copy.defaultTitle;
  resetButton.setAttribute('aria-label', copy.defaultTitle);
  if(!resetArmTimer)return;
  clearTimeout(resetArmTimer); resetArmTimer = 0;
  resetButton.classList.remove('is-armed');
  resetAnnouncer.textContent = '';
}
resetButton.addEventListener('click', () => {
  if(resetArmTimer){ disarmReset(); engine.deleteSave(); return; }
  const copy = text().ui.resetSave;
  resetButton.classList.add('is-armed');
  resetButton.textContent = copy.armedLabel;
  resetButton.title = copy.armedTitle;
  resetButton.setAttribute('aria-label', copy.armedAria);
  resetAnnouncer.textContent = fill(copy.armedAnnouncement, { seconds: RESET_ARM_MS / 1000 });
  resetArmTimer = setTimeout(disarmReset, RESET_ARM_MS) as unknown as number;
});
resetButton.addEventListener('blur', disarmReset);

// The loop exists to advance a civilization and to persist the seconds it accumulates. Outside the
// civilization phase there is nothing to advance and every mutating call already saves, so the loop
// stops instead of waking the device 60x a second to tick nothing and rewrite an unchanged save.
let previous = performance.now();
let accumulator = 0;
let looping = false;
function frame(now:number){
  const delta = Math.min(.25, (now - previous) / 1000); previous = now;
  if (engine.state.phase !== 'civilization'){ looping = false; return; }
  engine.tick(delta);
  accumulator += delta;
  if (accumulator >= 5){ accumulator = 0; engine.save(); }
  requestAnimationFrame(frame);
}
function ensureLoop(){
  if (looping || engine.state.phase !== 'civilization') return;
  looping = true; accumulator = 0; previous = performance.now();
  requestAnimationFrame(frame);
}
engine.onChange(ensureLoop);
ensureLoop();
applyShellText();

window.addEventListener('beforeunload',()=>engine.save());
window.addEventListener('pagehide',()=>engine.save());
document.addEventListener('visibilitychange',()=>{
  if(document.hidden) engine.save();
});
(window as any).RCE = engine;
