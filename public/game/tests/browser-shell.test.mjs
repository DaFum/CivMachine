import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LOCALIZATION } from '../dist/data/localization.js';

// Player-facing copy lives in the localization catalog, so a surface assertion has two halves: the
// module reads the catalog key, and the catalog's English says what the surface is supposed to say.
// Matching a literal in the source again would only prove nobody had localized it yet.
const APP = LOCALIZATION.en.ui.app;
function saysThrough(source, key, expected) {
  assert.match(source, new RegExp(`\\bt\\.${key}\\b|\\bcopy\\.${key}\\b|ui\\.app\\.${key}\\b`), `the surface must read ui.app.${key} from the catalog`);
  assert.equal(APP[key], expected, `ui.app.${key} must still read "${expected}"`);
}

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
  assert.match(world, /const animationTime\s*=\s*reducedMotion\s*\?\s*0\s*:\s*time|const animationTime\s*=\s*currentReducedMotion\s*\?\s*0\s*:\s*time/);
  assert.match(world, /drawPathAmbience\([^;]+animationTime/);
  // The decision impact moved into its own module, so reduced motion is now a parameter world.ts
  // forwards rather than a branch it owns.
  assert.match(world, /drawConsequenceImpact\([^;]+currentReducedMotion/);
  const impact = await readFile(new URL('../src/render/consequence-presentation.ts', import.meta.url), 'utf8');
  assert.match(impact, /staticOnly: reducedMotion/);
  assert.match(impact, /impact\.staticOnly \? 0 :/);
});

test('renderer recovers correctly when a previously hidden host becomes visible', async () => {
  const world = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  assert.match(world, /getBoundingClientRect\(\)|ResizeObserver/);
  assert.match(world, /rect\.width !== this\.renderer\.width \|\| rect\.height !== this\.renderer\.height|width !== this\.renderer\.width/);
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
  saysThrough(app, 'noMeasurableStateChange', 'No measurable state change.');
  assert.match(app, /metricTone/);
});

test('intervention UI explains locked predictions without hiding unique actions', async () => {
  const app = await readFile(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  saysThrough(app, 'predictionCoreOffline', APP.predictionCoreOffline);
  assert.match(APP.predictionCoreOffline, /Prediction Core offline/i);
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
  saysThrough(app, 'tacticalActions', 'TACTICAL ACTIONS');
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
  saysThrough(readout, 'harvestGrade', 'HARVEST GRADE');
  assert.match(readout, /data-live="depth"/);
  assert.match(readout, /data-live="harvest-summary"/);
  assert.match(readout, /data-live="harvest-meter"/);
  assert.match(readout, /t\.nextBand/, 'the next depth band and its yield must be named');
  assert.match(APP.nextBand, /^NEXT \{grade\} AT DEPTH \{depth\} FOR ×\{multiplier\}$/);
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
  assert.ok(at('run-controls') < at('t.strategicOverview'), 'the rails come before the run context');
  assert.ok(at('t.strategicOverview') < at('<details>'), 'reference material comes last');

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
  assert.match(app, /\$\{esc\(copy\.keys\)\} \$\{keys\}/);
  assert.equal(APP.keys, 'KEYS');
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
  saysThrough(app, 'nextCivilization', 'NEXT CIVILIZATION');
  saysThrough(app, 'directiveObjective', 'DIRECTIVE OBJECTIVE');
  saysThrough(app, 'startCivilization', 'START CIVILIZATION');
  assert.match(app, /previewTraits/);
  assert.ok(app.indexOf('previewTraits') < app.indexOf('t.startCivilization'));
});

test('Harvest projection names grade, credits, and Directive objective bonus', async () => {
  const app = await readFile(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  saysThrough(app, 'harvestGrade', 'HARVEST GRADE');
  assert.match(APP.harvestSummaryOne, /Cultivation Credit/);
  assert.match(APP.objectiveBonus, /OBJECTIVE BONUS/);
  assert.match(app, /t\.harvestSummaryOne|t\.harvestSummaryMany/);
  assert.match(app, /t\.objectiveBonus\b/);
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

// A declaration is code; a comment about one is not. These guards scan the stylesheet as text, so a
// comment that quotes a property -- `font:inherit`, or a note recording that a size used to be 16px --
// used to fail them for describing exactly the thing they enforce. Strip comments before scanning.
const declarationsOf = css => css.replace(/\/\*[\s\S]*?\*\//g, ' ');

// --- The design system ---------------------------------------------------------------------------
// Radius and type are the two scales that make a dozen unrelated panel types read as one UI. Both
// collapsed to a single source in v1.13.0, and both are trivial to un-collapse by hand later, so
// each one is pinned as an invariant rather than as a list of expected values.

test('one --radius drives every corner in the shell', async () => {
  const styles = declarationsOf(await readFile(new URL('../styles.css', import.meta.url), 'utf8'));
  assert.match(styles, /--radius:\s*\d/, 'the scale must have a single numeric root');
  for (const step of ['xs', 'sm', 'md', 'lg']) {
    assert.match(
      styles,
      new RegExp(`--radius-${step}:[^;]*(var\\(--radius\\)|calc\\()`),
      `--radius-${step} must derive from --radius rather than restate a literal`,
    );
  }
  // Any literal corner is a step that escaped the scale. 50% is a circle, not a radius step, and
  // `inherit` is how a meter fill follows its track.
  const literals = [...styles.matchAll(/border-radius:\s*([^;}!]+)/g)]
    .map(match => match[1].trim())
    .filter(value => !value.startsWith('var(') && value !== '50%' && value !== 'inherit');
  assert.deepEqual(literals, [], 'every corner must come from the --radius scale');
});

test('every font size in the shell is fluid', async () => {
  const sheets = Object.fromEntries(await Promise.all(
    ['styles.css', 'mobile.css'].map(async name =>
      [name, declarationsOf(await readFile(new URL(`../${name}`, import.meta.url), 'utf8'))]),
  ));
  const scale = [...sheets['styles.css'].matchAll(/--text-[\w-]+:\s*([^;]+)/g)].map(match => match[1].trim());
  assert.ok(scale.length >= 9, `the type scale has only ${scale.length} steps`);
  for (const step of scale) {
    assert.ok(step.startsWith('clamp('), `type step "${step}" is not a clamp`);
  }
  // Both stylesheets, because mobile.css overrides sizes at exactly the widths where the fluid floor
  // matters most -- three literals hid there while this test read only styles.css.
  const LENGTH = /[\d.]+(?:rem|em|px|pt|ch|ex|vw|vh)/;
  for (const [name, css] of Object.entries(sheets)) {
    // An em is not a free pass. Nothing between these rules and the root sets a font-size, so an em
    // resolves against the browser default and is every bit as fixed as a px.
    const sizes = [...css.matchAll(/font-size:\s*([^;}!]+)/g)]
      .map(match => match[1].trim())
      .filter(value => !value.startsWith('var('));
    assert.deepEqual(sizes, [], `${name}: every font size must come from the fluid type scale`);
    // The `font:` shorthand carries a size too, and grepping for `font-size:` never saw it.
    const shorthands = [...css.matchAll(/(?<![-\w])font:\s*([^;}!]+)/g)]
      .map(match => match[1].trim())
      .filter(value => LENGTH.test(value));
    assert.deepEqual(shorthands, [], `${name}: a font shorthand must not carry a literal size`);
    // And a shorthand may not end in `inherit`: a CSS-wide keyword is not a legal <family-name>, so
    // the browser drops the whole declaration and the rule silently styles nothing. That is exactly
    // how `font:700 .72rem inherit` sat here doing nothing at all.
    for (const value of [...css.matchAll(/(?<![-\w])font:\s*([^;}!]+)/g)].map(match => match[1].trim())) {
      assert.ok(
        value === 'inherit' || !/\b(inherit|initial|unset|revert)\b/.test(value),
        `${name}: "font: ${value}" is dropped as invalid -- use longhands`,
      );
    }
  }
});

test('the elements that inherit a size from outside the scale name a tier', async () => {
  const styles = declarationsOf(await readFile(new URL('../styles.css', import.meta.url), 'utf8'));
  // The guard above can only see sizes that are declared, which is exactly why these two escaped it:
  // neither declared anything. `small` carries a UA default of 0.8333em and held 17 elements at a
  // flat 13.33px; a button takes the root size through the `font` shorthand and held 40 labels at a
  // flat 16px. Both are fixed px that ignore the clamps, so on a phone a detail line rendered larger
  // than the label above it. Declared at the element, not at the call sites -- patching the six
  // selectors that happened to exist would have left the seventh inheriting the default again.
  for (const [element, rule] of [['small', /(?<![-\w])small\{([^}]*)\}/], ['button', /(?<![-\w])button\{([^}]*)\}/]]) {
    const match = styles.match(rule);
    assert.ok(match, `${element} must carry a base rule`);
    assert.match(
      match[1],
      /font-size:var\(--text-/,
      `${element} must name a type tier -- without one it silently takes a fixed size from the UA`,
    );
  }
});

test('running prose is capped by one --measure token', async () => {
  const styles = declarationsOf(await readFile(new URL('../styles.css', import.meta.url), 'utf8'));
  assert.match(styles, /--measure:\s*\d+ch/, 'measure must have a single root in ch, not px');
  // The shell is monospace, so a pixel cap says nothing about how many characters land on a line:
  // .machine-hero p was capped at 780px and still ran 109 characters. Every prose block that carries
  // a cap must take it from the token.
  // A `ch` cap is a measure decision and belongs to the token; a px or % cap is a container
  // decision -- #app-shell's 1500px and the world chip's 58% are not prose and keep their own
  // values. The lookbehind is what separates a declaration from a media feature, which is spelled
  // the same way and is not a cap at all.
  const caps = [...styles.matchAll(/(?<!\()max-width:\s*([^;}!]+)/g)]
    .map(match => match[1].trim())
    .filter(value => /(?<![\w.-])\d*\.?\d+ch/.test(value));
  assert.deepEqual(caps, [], 'a measure must come from --measure rather than a literal ch width');
  // And the running-prose blocks must actually carry it, or the token caps nothing.
  for (const selector of ['.panel p', '.panel-note', '.upgrade p', '.machine-hero p']) {
    const rule = styles.match(new RegExp(`${selector.replace('.', '\\.')}\\{([^}]*)\\}`));
    assert.ok(rule, `${selector} must carry a rule`);
    assert.match(rule[1], /max-width:var\(--measure\)/, `${selector} must take its measure from the token`);
  }
});

test('panel reveals are driven by scroll position, never by a clock', async () => {
  const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  // This is the whole reason the reveal is safe here. `replaceIfChanged` rebuilds a panel's HTML
  // whenever one of its numbers moves, so a time-based entrance would restart on every rebuild and
  // the panel would flicker for the entire run. A view() timeline reads its progress from layout, so
  // a replaced panel that is already on screen renders at 100% with no flash.
  assert.match(styles, /@supports \(animation-timeline:view\(\)\)/, 'the reveal must be a progressive enhancement');
  const supports = styles.slice(styles.indexOf('@supports (animation-timeline:view())'));
  assert.match(supports, /animation-timeline:view\(\)/);
  assert.match(supports, /animation-range:/, 'the reveal must declare the range it plays over');
  assert.match(styles, /@keyframes silk-reveal\{/);
  // The world host must never be revealed: it holds three canvases, and a transform on it would move
  // and resample them.
  const reveal = supports.slice(0, supports.indexOf('}\n}'));
  assert.ok(!reveal.includes('.world-shell'), 'the world host must not animate');
});

test('one --space scale drives every gap in the shell', async () => {
  const sheets = Object.fromEntries(await Promise.all(
    ['styles.css', 'mobile.css'].map(async name =>
      [name, declarationsOf(await readFile(new URL(`../${name}`, import.meta.url), 'utf8'))]),
  ));
  const scale = [...sheets['styles.css'].matchAll(/--space-[\w-]+:\s*([^;]+)/g)].map(match => match[1].trim());
  // The exact ten steps, not a floor: a scale that can quietly grow an eleventh step is the thing
  // this test exists to prevent. Adding one is fine -- it just has to be a deliberate edit here too.
  assert.deepEqual(
    [...sheets['styles.css'].matchAll(/--space-([\w-]+):/g)].map(match => match[1]),
    ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'],
    'the --space scale must be exactly the ten declared steps',
  );

  // Padding, margin and gap only. A rem inside `height`, `min-width` or `flex-basis` is a container
  // decision, not a spacing step, and must keep its own value.
  // The logical longhands are here for the day someone reaches for them: `margin-inline-start` is
  // not matched by a pattern that stops at `margin-inline`, so the guard would quietly stop covering
  // the property that replaced the one it was watching.
  const PROP = /(?<![-\w])((?:padding|margin)(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?|(?:row-|column-)?gap)\s*:\s*([^;}!]+)/g;
  // Every unit, not just rem: `gap:3px` and `margin:1em` are literals the rem-only pattern waved
  // through, and the type test beside this one has always checked the full set.
  const LENGTH = /(?<![\w.-])\d*\.?\d+(?:rem|em|px|pt|ch|ex|vw|vh|vmin|vmax)/;
  // Strip what is exempt out of the value and check what is left, rather than letting one exempt
  // part excuse the whole declaration. Doing it per-declaration is what made this guard nearly
  // blind: `var(--space-3xs)` contains `-3`, so the negative-offset exemption matched every one of
  // the 53 declarations that reference a numbered token, and any literal beside it went unseen.
  const remainder = value => value
    // Token references and the nested calc() they sit in are the whole point of the scale.
    .replace(/\bvar\([^()]*(?:\([^()]*\)[^()]*)*\)/g, ' ')
    // A clamp is a layout allowance -- the same exemption the world viewport's height already has.
    .replace(/\bclamp\([^()]*(?:\([^()]*\)[^()]*)*\)/g, ' ')
    // A negative offset is not a spacing step: `margin:-1px` belongs to the visually-hidden idiom,
    // where the value is dictated by the clip rect rather than by the rhythm.
    .replace(/-\d*\.?\d+[a-z%]*/g, ' ');
  for (const [name, css] of Object.entries(sheets)) {
    const literals = [...css.matchAll(PROP)]
      .filter(match => LENGTH.test(remainder(match[2].trim())))
      .map(match => `${match[1]}:${match[2].trim()}`);
    assert.deepEqual(literals, [], `${name}: every gap must come from the --space scale`);
  }
  // A guard that detects nothing passes exactly like a guard that has nothing to find, and this one
  // spent a commit in that state. These must still be caught beside an exempt component.
  for (const bad of ['padding:var(--space-3xs) 1px', 'margin:clamp(1rem,2vw,3rem) 4px',
                     'gap:var(--space-sm) -1px 2em', 'padding-inline-start:8px']) {
    const match = [...bad.matchAll(PROP)][0];
    assert.ok(match && LENGTH.test(remainder(match[2].trim())), `the guard must still flag "${bad}"`);
  }
  for (const good of ['padding:var(--space-lg) var(--space-xl)', 'margin:-1px',
                      'padding-bottom:clamp(14rem,32dvh,22rem)', 'margin:var(--space-2xs) 0',
                      'padding-bottom:calc(var(--space-4xl) * 1.5)']) {
    const match = [...good.matchAll(PROP)][0];
    assert.ok(match && !LENGTH.test(remainder(match[2].trim())), `the guard must not flag "${good}"`);
  }
});

test('every dark surface in the shell comes from a declared tier', async () => {
  const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const root = styles.slice(0, styles.indexOf('}'));
  for (const tier of ['surface-sunken', 'surface-inset', 'surface-1', 'surface-translucent', 'surface-raised']) {
    assert.match(root, new RegExp(`--${tier}:`), `--${tier} must be declared`);
    assert.ok(
      styles.slice(root.length).includes(`var(--${tier})`),
      `--${tier} is declared but never used -- that is how ten near-identical darks accumulated`,
    );
  }
  // The specific darks that were doing the tiers' jobs by hand. Any of them reappearing means a new
  // surface invented its own hex instead of taking the tier one step above or below it.
  const body = styles.slice(root.length);
  for (const literal of ['#0b141b', '#0b141a', '#0b151b', '#0a1218', '#0c151c', '#081218',
    '#070d12', '#080e13', '#080f14', '#12202a', '#13202a']) {
    assert.ok(!body.toLowerCase().includes(literal), `${literal} must come from a --surface tier`);
  }
});

test('reduced motion silences every decorative animation the shell adds', async () => {
  const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const reduced = styles.slice(styles.lastIndexOf('@media(prefers-reduced-motion:reduce)'));
  for (const surface of ['.background-noise::after', '.primary::after']) {
    assert.ok(reduced.includes(surface), `${surface} must be silenced under reduced motion`);
  }
  assert.match(reduced, /animation:none/, 'the reveal and the drift must both stop');
  // And the drift never runs on a phone at all: the world canvas already owns that frame budget.
  assert.match(
    styles,
    /@media\(prefers-reduced-motion:no-preference\) and \(min-width:761px\)\{\s*\.background-noise::after\{animation:silk-aurora/,
    'the ambient drift must be gated to pointer-width viewports',
  );
});
