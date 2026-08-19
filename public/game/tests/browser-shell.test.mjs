import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('browser shell has persistent Phaser host and DOM HUD surfaces', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="phaser-world"/);
  assert.match(html, /id="world-hud"/);
  assert.match(html, /id="machine-view"/);
  assert.match(html, /id="civilization-view"/);
});

test('browser entrypoint wires game engine, DOM UI and world renderer', async () => {
  const source = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(source, /new GameEngine/);
  assert.match(source, /createGameUI/);
  assert.match(source, /startWorldRenderer/);
  assert.match(source, /requestAnimationFrame/);
});

test('production boot keeps the Canvas renderer independent from optional Phaser code', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const world = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /<script[^>]+src="https?:\/\//);
  assert.match(world, /class FallbackWorld/);
  assert.match(world, /fallback\s*=\s*new FallbackWorld/);
});

test('production shell keeps the deterministic Canvas renderer instead of an unverified Phaser handoff', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /vendor\/phaser\.min\.js/);
  assert.doesNotMatch(html, /phaser-ready/);
});

test('world renderer separates cached scenery from throttled atmosphere and decision impulses', async () => {
  const world = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  assert.match(world, /structuralWorldKey/);
  assert.match(world, /skyLayer/);
  assert.match(world, /terrainLayer/);
  assert.match(world, /settlementLayer/);
  assert.match(world, /atmosphereLayer/);
  assert.match(world, /impulseLayer/);
  assert.match(world, /DYNAMIC_FRAME_MS\s*=\s*33/);
  assert.match(world, /prefers-reduced-motion/);
  assert.match(world, /worldImpulse/);
});

test('dynamic world state is sampled independently from cached structural scenery', async () => {
  const world = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  assert.match(world, /const dynamicSnapshot\s*=\s*worldSnapshot\(civ,\s*width\)/);
  assert.match(world, /const dynamicPresentation\s*=\s*worldPresentation\(civ\)/);
  assert.match(world, /drawDynamicContent\([^;]+dynamicSnapshot,\s*dynamicPresentation/);
});

test('reduced-motion mode freezes ambient movement and uses a static decision signal', async () => {
  const world = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  assert.match(world, /const animationTime\s*=\s*reducedMotion\s*\?\s*0\s*:\s*time/);
  assert.match(world, /drawPathMotif\([^;]+animationTime/);
  assert.match(world, /function drawDecisionImpulse[\s\S]{0,700}if \(reducedMotion\)/);
});

test('Phaser resizes after its previously hidden host becomes visible', async () => {
  const world = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  assert.match(world, /create\(this:\s*any\)[\s\S]{0,1200}this\.scale\.resize\(Math\.max\(320, host\.clientWidth\)/);
});

test('renderer falls back to Canvas when Phaser construction fails', async () => {
  const originals = Object.fromEntries(['window','document','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','Phaser'].map(key => [key, globalThis[key]]));
  const context = {};
  const canvases = [];
  const canvas = () => ({ className:'', style:{}, getContext:()=>context, addEventListener:()=>{}, setPointerCapture:()=>{}, remove:()=>{} });
  globalThis.window = { addEventListener:()=>{}, removeEventListener:()=>{} };
  globalThis.document = { createElement:()=>canvas() };
  globalThis.ResizeObserver = class { observe(){} disconnect(){} };
  globalThis.requestAnimationFrame = () => 7;
  globalThis.cancelAnimationFrame = () => {};
  globalThis.Phaser = { Game: class { constructor(){ throw new Error('WebGL unavailable'); } }, AUTO:0, Scale:{RESIZE:0,CENTER_BOTH:0} };
  const host = { clientWidth:640, clientHeight:480, appendChild:node=>{canvases.push(node);}, replaceChildren:()=>{}, getBoundingClientRect:()=>({width:640,height:480}) };
  const engine = { state:{phase:'civilization',civilization:{}}, onChange:()=>()=>{} };
  try {
    const { startWorldRenderer } = await import(`../dist/render/world.js?fallback-test=${Date.now()}`);
    const controller = startWorldRenderer(engine,host);
    assert.deepEqual(canvases.map(node=>node.className), ['fallback-canvas fallback-static','fallback-canvas fallback-dynamic']);
    controller.destroy();
  } finally {
    for (const [key,value] of Object.entries(originals)) value===undefined ? delete globalThis[key] : globalThis[key]=value;
  }
});

test('renderer contains delayed Phaser scene failures and activates fallback', async () => {
  const world = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  assert.match(world, /const activateFallback/);
  assert.match(world, /create\(this:\s*any\)\s*\{[\s\S]{0,220}try\s*\{/);
  assert.match(world, /update\(this:\s*any,\s*time:\s*number\)\s*\{[\s\S]{0,220}try\s*\{/);
  assert.match(world, /queueMicrotask\(activateFallback\)/);
});

test('renderer clears per-civilization caches and impulses on teardown', async () => {
  const world = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  assert.match(world, /function resetRenderState|const resetRenderState/);
  assert.match(world, /lastStage\s*=\s*-1/);
  assert.match(world, /activeFeedback\s*=\s*null/);
  assert.match(world, /feedbackStartTime\s*=\s*0/);
  assert.match(world, /fallback\?\.destroy\(\);[\s\S]{0,160}resetRenderState\(\)/);
});

test('Canvas fallback keeps cached scenery separate from reactive effects', async () => {
  const world = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  assert.match(world, /private staticCanvas:\s*HTMLCanvasElement/);
  assert.match(world, /private dynamicCanvas:\s*HTMLCanvasElement/);
  assert.match(world, /private drawStatic/);
  assert.match(world, /private drawDynamic/);
  assert.match(world, /structuralWorldKey\(civ,\s*this\.width\)/);
  assert.match(world, /fallback-dynamic/);
});

test('civilization UI renders exact decision deltas in a polite live region', async () => {
  const app = await readFile(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  assert.match(app, /decision-feedback/);
  assert.match(app, /aria-live="polite"/);
  assert.match(app, /feedback\.metrics/);
  assert.match(app, /feedback\.affinities/);
  assert.match(app, /feedback\.additions/);
  assert.match(app, /replaceIfChanged/);
  assert.match(app, /No measurable state change\./);
  assert.match(app, /metricTone/);
});

test('intervention UI explains locked predictions without hiding unique actions', async () => {
  const app = await readFile(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  assert.match(app, /Prediction Core offline/i);
  assert.match(app, /predictionLocked/);
});

test('world HUD state values refresh during monitoring without rebuilding the surface', async () => {
  const app = await readFile(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  for (const field of ['world-era','world-development','world-stability','world-sanity','world-awareness','world-attention']) {
    assert.match(app, new RegExp(`data-live=["']${field}["']`));
  }
  assert.match(app, /worldHud\.querySelector/);
});

test('world surface is larger across desktop, portrait and landscape layouts', async () => {
  const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const mobile = await readFile(new URL('../mobile.css', import.meta.url), 'utf8');
  assert.match(styles, /height:\s*clamp\(520px,\s*66vh,\s*760px\)/);
  assert.match(styles, /decision-impact/);
  assert.match(styles, /tone-positive/);
  assert.match(styles, /tone-negative/);
  assert.match(mobile, /62dvh/);
  assert.match(mobile, /74dvh/);
  assert.match(mobile, /orientation:\s*landscape\)[\s\S]{0,180}min-height:\s*360px/);
});

test('tactical action rail exposes Entropy, Control, disabled reasons, and exact shortcuts before details', async () => {
  const app = await readFile(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  const viewModel = await readFile(new URL('../src/ui/view-model.ts', import.meta.url), 'utf8');
  assert.match(app, /class="tactical-rail/);
  assert.match(app, /aria-live="polite"/);
  assert.match(app, /control-pips/);
  assert.match(app, /data-action="tactical"/);
  assert.match(app, /aria-describedby/);
  assert.match(app, /TACTICAL ACTIONS/);
  assert.ok(app.indexOf('tacticalRail') < app.indexOf('<details>'));
  assert.match(viewModel, /requiredContainment/);
  assert.match(viewModel, /containmentRating/);
  assert.match(viewModel, /entropyBand/);
});

test('keyboard map binds 1, 2, and 3 once while ignoring editable and modified input', async () => {
  const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /Digit1/);
  assert.match(main, /Numpad3/);
  assert.match(main, /useTacticalAction/);
  assert.match(main, /event\.repeat/);
  assert.match(main, /isContentEditable/);
  assert.match(main, /ctrlKey/);
});

test('Machine phase drafts per-run Directives and previews starting traits above start', async () => {
  const app = await readFile(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  assert.match(app, /NEXT CIVILIZATION/);
  assert.match(app, /DIRECTIVE OBJECTIVE/);
  assert.match(app, /START CIVILIZATION/);
  assert.match(app, /previewTraits/);
  assert.ok(app.indexOf('previewTraits') < app.indexOf('START CIVILIZATION'));
});

test('Harvest projection names grade, credits, and Directive objective bonus', async () => {
  const app = await readFile(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  assert.match(app, /HARVEST GRADE/);
  assert.match(app, /Cultivation Credit/);
  assert.match(app, /OBJECTIVE BONUS/);
});

test('save reset never depends on a native modal dialog', async () => {
  const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  // confirm() is suppressed in fullscreen, in installed fullscreen PWAs and in embedded frames,
  // which are exactly the contexts this app ships in. The reset must confirm inside the page.
  assert.doesNotMatch(main, /confirm\s*\(/);
  assert.doesNotMatch(main, /alert\s*\(/);
  assert.doesNotMatch(main, /prompt\s*\(/);
  assert.match(main, /#reset-save/);
  assert.match(main, /deleteSave\(\)/);
  assert.match(main, /armed/i, 'reset must require a second, explicit in-page confirmation');
});
