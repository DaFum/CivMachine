import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('browser shell has a persistent world host and DOM HUD surfaces', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="world-surface"/);
  assert.doesNotMatch(html, /phaser/i, 'Phaser was removed; no naming may survive it');
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

test('the frame loop runs only while a civilization is being cultivated', async () => {
  const source = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  // Outside the civilization phase there is nothing to advance and every mutating call already saves,
  // so the loop stops rather than waking the device sixty times a second to tick nothing.
  assert.match(source, /phase !== 'civilization'\)\{ looping = false; return; \}/);
  assert.match(source, /engine\.onChange\(ensureLoop\)/, 'starting a civilization must restart the loop');
  // The periodic save lives inside the loop, so an idle machine layer cannot rewrite an unchanged save.
  const loopBody = source.slice(source.indexOf('function frame'), source.indexOf('function ensureLoop'));
  assert.match(loopBody, /accumulator >= 5\)\{ accumulator = 0; engine\.save\(\); \}/);
});

test('the Canvas renderer is the only renderer and loads no remote code', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const world = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /<script[^>]+src="https?:\/\//);
  assert.match(world, /class CanvasWorld/);
  assert.match(world, /world\s*=\s*new CanvasWorld/);
  assert.doesNotMatch(world, /phaser/i, 'the Phaser branch must be gone, not merely unused');
});

test('world renderer separates cached scenery from throttled atmosphere and decision impulses', async () => {
  const world = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  assert.match(world, /structuralWorldKey/);
  // Cached scenery lives on the static canvas and is redrawn only on a structural key change.
  assert.match(world, /readonly staticCanvas/);
  assert.match(world, /readonly sceneryCanvas/);
  assert.match(world, /readonly dynamicCanvas/);
  assert.match(world, /drawSkyContent/);
  assert.match(world, /drawTerrainContent/);
  assert.match(world, /drawSettlementContent/);
  // Atmosphere and impulses are redrawn every throttled frame instead.
  assert.match(world, /drawDynamicContent/);
  assert.match(world, /drawConsequenceImpact/);
  assert.match(world, /DYNAMIC_FRAME_MS\s*=\s*33/);
  assert.match(world, /prefers-reduced-motion/);
  assert.match(world, /worldImpulse/);
});

test('dynamic world state is sampled independently from cached structural scenery', async () => {
  const world = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  // The per-frame sample carries only the stat-driven counts; structural geometry is reused from the
  // cached scene, so a frame must not rebuild settlement, building or agent budgets.
  assert.match(world, /const dynamicSnapshot\s*=\s*applyQualityToLiveSample\(\{\s*\.\.\.scene\.snapshot,\s*\.\.\.liveWorldSample\(civ,\s*scene\.snapshot\.stage\)\s*\},\s*tier\)/);
  assert.match(world, /const dynamicPresentation\s*=\s*worldPresentation\(civ\)/);
  assert.match(world, /drawDynamicContent\([^;]+dynamicSnapshot,\s*dynamicPresentation/);
  assert.doesNotMatch(world, /worldSnapshot\(civ,\s*this\.width\)/, 'the dynamic layer must not rebuild the structural snapshot per frame');
});

test('reduced-motion mode freezes ambient movement and uses a static decision signal', async () => {
  const world = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  assert.match(world, /const animationTime\s*=\s*reducedMotion\s*\?\s*0\s*:\s*time/);
  assert.match(world, /drawPathMotif\([^;]+animationTime/);
  // The decision impact moved into its own module, so reduced motion is now a parameter world.ts
  // forwards rather than a branch it owns.
  assert.match(world, /drawConsequenceImpact\([^;]+reducedMotion\)/);
  const impact = await readFile(new URL('../src/render/consequence-presentation.ts', import.meta.url), 'utf8');
  assert.match(impact, /staticOnly: reducedMotion/);
  assert.match(impact, /impact\.staticOnly \? 0 :/);
});

test('renderer re-measures its host every frame so a hidden host recovers when shown', async () => {
  const world = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  assert.match(world, /private loop[\s\S]{0,400}getBoundingClientRect\(\)/);
  assert.match(world, /rect\.width !== this\.renderer\.width \|\| rect\.height !== this\.renderer\.height/);
});

test('renderer tears down its canvases and timing state when the civilization ends', async () => {
  const world = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  assert.match(world, /destroy\(\):\s*void\s*\{[\s\S]{0,220}cancelAnimationFrame/);
  assert.match(world, /this\.tracker\.reset\(\)/);
  assert.match(world, /host\.replaceChildren\(\)/);
});

test('Canvas fallback keeps cached scenery separate from reactive effects', async () => {
  const world = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  assert.match(world, /readonly staticCanvas:\s*HTMLCanvasElement/);
  assert.match(world, /readonly dynamicCanvas:\s*HTMLCanvasElement/);
  assert.match(world, /drawStatic/);
  assert.match(world, /drawDynamic/);
  assert.match(world, /structuralWorldKey\(civ,\s*this\.renderer\.width\)/);
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
  // Both rails are rendered before the first accordion: what the run asks of the player is never
  // behind a summary they have to open mid-run.
  const panels = app.slice(app.indexOf('replaceIfChanged(civPanels,'));
  assert.ok(panels.indexOf('commandRail(vm)') < panels.indexOf('<details>'));
  assert.ok(panels.indexOf('pressureRail(vm)') < panels.indexOf('<details>'));
  assert.match(viewModel, /containmentRating/);
  assert.match(viewModel, /containmentRating/);
  assert.match(viewModel, /entropyBand/);
});

test('the tactical rail carries the harvest decision instead of a collapsed panel', async () => {
  const app = await readFile(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  const viewModel = await readFile(new URL('../src/ui/view-model.ts', import.meta.url), 'utf8');
  // Stay-or-harvest and CASCADE IN Xs answer the same question, so grade, depth, the band meter and
  // the yield must live in the rail -- not behind a summary the player has to open mid-run.
  assert.match(app, /class="harvest-readout /);
  const rail = app.slice(app.indexOf('const pressureRail='), app.indexOf('function renderCivilization'));
  assert.match(rail, /harvestReadout\(vm\)/, 'the pressure rail must render the harvest readout');
  // And the buttons that end the run sit in the same rail as the readout that says whether to press
  // them, instead of at the bottom of the view behind every accordion.
  assert.match(rail, /data-action="harvest"/);
  assert.match(rail, /data-action="chaos"/);
  const readout = app.slice(app.indexOf('const harvestReadout='), app.indexOf('const speedRow='));
  assert.match(readout, /HARVEST GRADE/);
  assert.match(readout, /data-live="depth"/);
  assert.match(readout, /data-live="harvest-summary"/);
  assert.match(readout, /data-live="harvest-meter"/);
  assert.match(readout, /NEXT <b>/, 'the next depth band and its yield must be named');
  assert.match(viewModel, /bandProgress/);
  const refresh = app.slice(app.indexOf('function refreshCivilizationLive'));
  assert.match(refresh, /\[data-live="harvest-meter"\][\s\S]{0,120}vm\.harvest\.bandProgress/);

  // The stay-or-harvest call is computed from the development rate against seconds to cascade, and
  // it is written through the live refresh -- never through the structural key, because both sides
  // of its threshold move continuously.
  assert.match(app, /data-live="harvest-call"/);
  assert.match(refresh, /\[data-live="harvest-call"\]/);
  assert.match(refresh, /urgency-\$\{state\}/);
  assert.doesNotMatch(viewModel.slice(viewModel.indexOf('export function civilizationRenderKey')), /urgency/);
});

test('the civilization view is ordered by what it asks of the player', async () => {
  const app = await readFile(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  const panels = app.slice(app.indexOf('replaceIfChanged(civPanels,'));
  const at = fragment => {
    const index = panels.indexOf(fragment);
    assert.ok(index >= 0, `the civilization panel column must contain ${fragment}`);
    return index;
  };

  // The intervention is the one thing the run asks the player to answer, so it sits directly under
  // the world it is asking about -- ahead of every readout, control and accordion.
  assert.match(panels, /\$\{terminalBanner\}\$\{eventCard\}/);
  assert.ok(at('${eventCard}') < at('run-controls'), 'the intervention comes before the rails');
  assert.ok(at('run-controls') < at("card('Strategic Overview'"), 'the rails come before the run context');
  assert.ok(at("card('Strategic Overview'") < at('<details>'), 'reference material comes last');

  // Simulation speed is a pacing control used mid-run; it belongs with the actions, not behind an
  // accordion that was misleadingly called Intervention Control next to the actual interventions.
  assert.doesNotMatch(app, /Intervention Control/);
  const command = app.slice(app.indexOf('const commandRail='), app.indexOf('const pressureRail='));
  assert.match(command, /speedRow\(vm\)/);
});

test('the rail names its keyboard shortcuts once for every bound action', async () => {
  const app = await readFile(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(app, /class="rail-keys"/);
  assert.match(app, /KEYS \$\{keys\}/);
  // The legend is generated from the same action list the buttons use, so a fifth action cannot
  // ship with a stale legend -- and main.ts must actually bind every shortcut it advertises.
  assert.match(app, /const keys=t\.actions\.map/);
  for (const digit of ['Digit1', 'Digit2', 'Digit3', 'Digit4']) assert.match(main, new RegExp(digit));
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
