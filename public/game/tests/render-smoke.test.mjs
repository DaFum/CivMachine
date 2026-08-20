import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../dist/game/engine.js';

// Drives the renderer end to end against recording stubs, so a change that stops the world from
// actually drawing creatures, banners or structures fails here rather than in a browser.

const DOM_KEYS = ['window', 'document', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame'];

function developedCivilization(seed = 404) {
  const civ = GameEngine.createCivilizationForTest(seed);
  civ.era = 3;
  civ.development = 900;
  civ.eventChoices = 20;
  civ.institutions.push('Consensus Lattice', 'Reality Works Authority', 'Continuity Bureau');
  civ.traits.push('fungal_consensus');
  civ.pathState.affinity.machine_faith = 9;
  civ.pathState.affinity.void_communion = 3;
  civ.pathState.dominantPath = 'machine_faith';
  civ.stats.awareness = 62;
  civ.stats.attention = 70;
  civ.tactical.entropy = 40;
  return civ;
}

function recordingContext(calls) {
  return {
    set fillStyle(value) { calls.push(['fillStyle', value]); },
    set strokeStyle(value) { calls.push(['strokeStyle', value]); },
    set lineWidth(value) { calls.push(['lineWidth', value]); },
    setTransform: () => calls.push(['setTransform']),
    clearRect: () => calls.push(['clearRect']),
    fillRect: (...args) => calls.push(['fillRect', ...args]),
    beginPath: () => calls.push(['beginPath']),
    moveTo: (...args) => calls.push(['moveTo', ...args]),
    lineTo: (...args) => calls.push(['lineTo', ...args]),
    arc: (...args) => calls.push(['arc', ...args]),
    closePath: () => calls.push(['closePath']),
    fill: () => calls.push(['fill']),
    stroke: () => calls.push(['stroke']),
  };
}

async function withStubbedDom(setup, body) {
  const originals = Object.fromEntries(DOM_KEYS.map(key => [key, globalThis[key]]));
  try {
    setup();
    return await body();
  } finally {
    for (const [key, value] of Object.entries(originals)) value === undefined ? delete globalThis[key] : globalThis[key] = value;
  }
}

function assertFiniteGeometry(calls, label) {
  for (const [name, ...args] of calls) {
    for (const value of args) {
      if (typeof value === 'number') assert.ok(Number.isFinite(value), `${label}: ${name} received ${value}`);
    }
  }
}

// Records the transform alongside each primitive, so a primitive's screen position is known and
// off-screen work can be told apart from on-screen work.
function trackingContext(calls) {
  let tx = 0;
  return {
    set fillStyle(value) {}, set strokeStyle(value) {}, set lineWidth(value) {},
    setTransform: (...args) => { tx = args.length >= 5 ? args[4] : 0; },
    clearRect: () => {},
    fillRect: (x, y, w, h) => calls.push({ name: 'fillRect', from: x + tx, to: x + tx + w }),
    beginPath: () => {}, closePath: () => {}, fill: () => {}, stroke: () => {},
    moveTo: (x) => calls.push({ name: 'moveTo', from: x + tx, to: x + tx }),
    lineTo: (x) => calls.push({ name: 'lineTo', from: x + tx, to: x + tx }),
    arc: (x, y, r) => calls.push({ name: 'arc', from: x + tx - r, to: x + tx + r }),
  };
}

test('both layers paint the visible slice instead of the whole world', async () => {
  const WIDTH = 900, HEIGHT = 520;
  // A stage-4 world is four viewports wide and drawStatic runs on every scrolled pixel, so drawing
  // the whole width is roughly four times the necessary work on the one operation the player uses to
  // explore. Offscreen layer caches were measured and rejected: three of them at this size need
  // hundreds of megabytes on a phone.
  const perScroll = [];
  const cullConstants = await import(`../dist/render/world.js?constants=${Date.now()}`);
  await withStubbedDom(() => {
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    let created = 0;
    const buckets = [[], []];
    globalThis.__buckets = buckets;
    globalThis.document = { createElement: () => { const calls = buckets[created++] ?? [];
      return { className: '', style: {}, width: 0, height: 0, getContext: () => trackingContext(calls), addEventListener: () => {}, setPointerCapture: () => {}, remove: () => {} }; } };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => { globalThis.__frame = callback; return 1; };
    globalThis.cancelAnimationFrame = () => {};
  }, async () => {
    const host = { appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: WIDTH, height: HEIGHT }) };
    const engine = { state: { phase: 'civilization', civilization: developedCivilization(909) }, worldImpulse: null, onChange: () => () => {} };
    const { startWorldRenderer } = await import(`../dist/render/world.js?cull=${Date.now()}`);
    const controller = startWorldRenderer(engine, host);
    const [staticCalls, dynamicCalls] = globalThis.__buckets;
    for (const step of [0, 1, 2, 4]) {
      if (step > 0) controller.nudge(1);
      staticCalls.length = 0;
      dynamicCalls.length = 0;
      globalThis.__frame(100 + step * 100);
      // The dynamic layer repaints every throttled frame, so an unculled draw there costs more than
      // one on the static layer. Both are held to the same ceiling.
      perScroll.push(staticCalls.concat(dynamicCalls));
    }
    controller.destroy();
    delete globalThis.__frame;
    delete globalThis.__buckets;
  });

  for (const [index, calls] of perScroll.entries()) {
    assert.ok(calls.length > 60, `scroll ${index} drew only ${calls.length} primitives`);
    // Nothing may be emitted whose whole extent lies beyond the viewport plus the cull margin. The
    // margin has to be generous enough for the widest primitive, so this is a ceiling, not equality.
    const { CULL_MARGIN, WIDEST_STATIC_PRIMITIVE } = cullConstants;
    // The band already reaches CULL_MARGIN past the viewport, and a primitive anchored at that edge
    // may extend by its own width. Anything beyond that is work nobody can see.
    const limit = CULL_MARGIN + WIDEST_STATIC_PRIMITIVE;
    const stray = calls.filter(call => call.to < -limit || call.from > WIDTH + limit);
    assert.equal(stray.length, 0, `scroll ${index} drew ${stray.length} primitives beyond the cull ceiling of ${limit}px, e.g. ${JSON.stringify(stray[0])}`);
    // And something must actually be on screen, or the cull ate the world.
    assert.ok(calls.some(call => call.to >= 0 && call.from <= WIDTH), `scroll ${index} drew nothing inside the viewport`);
  }
});



test('the renderer actually draws a populated world', async () => {
  const staticCalls = [];
  const dynamicCalls = [];
  let frame = null;
  await withStubbedDom(() => {
    const contexts = [recordingContext(staticCalls), recordingContext(dynamicCalls)];
    let created = 0;
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    globalThis.document = { createElement: () => { const context = contexts[created++] ?? recordingContext([]); return { className: '', style: {}, width: 0, height: 0, getContext: () => context, addEventListener: () => {}, setPointerCapture: () => {}, remove: () => {} }; } };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
    globalThis.cancelAnimationFrame = () => {};
  }, async () => {
    const host = { clientWidth: 900, clientHeight: 520, appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: 900, height: 520 }) };
    const engine = { state: { phase: 'civilization', civilization: developedCivilization() }, worldImpulse: null, onChange: () => () => {} };
    const { startWorldRenderer } = await import(`../dist/render/world.js?smoke-canvas=${Date.now()}`);
    const controller = startWorldRenderer(engine, host);
    assert.ok(frame, 'the fallback must schedule a frame');
    frame(100);
    controller.destroy();
  });

  assert.ok(staticCalls.length > 400, `static layer drew only ${staticCalls.length} primitives`);
  assert.ok(dynamicCalls.length > 200, `dynamic layer drew only ${dynamicCalls.length} primitives`);
  assert.ok(staticCalls.some(([name]) => name === 'fillRect'), 'structures must fill');
  assert.ok(dynamicCalls.some(([name]) => name === 'arc'), 'creatures and beacons must draw arcs');
  assert.ok(dynamicCalls.some(([name]) => name === 'closePath'), 'banner cloth and creature bodies must close paths');
  assertFiniteGeometry(staticCalls, 'static');
  assertFiniteGeometry(dynamicCalls, 'dynamic');
});

test('panning repaints the cached static layer without rebuilding the scene', async () => {
  await withStubbedDom(() => {
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    globalThis.document = { createElement: () => ({ className: '', style: {}, width: 0, height: 0, getContext: () => recordingContext([]), addEventListener: () => {}, setPointerCapture: () => {}, remove: () => {} }) };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => { globalThis.__frame = callback; return 1; };
    globalThis.cancelAnimationFrame = () => {};
  }, async () => {
    const host = { clientWidth: 900, clientHeight: 520, appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: 900, height: 520 }) };
    const engine = { state: { phase: 'civilization', civilization: developedCivilization(707) }, worldImpulse: null, onChange: () => () => {} };
    const { startWorldRenderer } = await import(`../dist/render/world.js?pan=${Date.now()}`);
    const controller = startWorldRenderer(engine, host);
    const frame = time => globalThis.__frame(time);

    frame(100);
    assert.deepEqual(controller.stats(), { sceneRebuilds: 1, staticRedraws: 1 }, 'the first real frame builds and paints once');

    frame(200);
    assert.deepEqual(controller.stats(), { sceneRebuilds: 1, staticRedraws: 1 }, 'an unchanged frame must neither rebuild nor repaint');

    controller.nudge(1);
    frame(300);
    const panned = controller.stats();
    assert.equal(panned.sceneRebuilds, 1, 'panning must not rebuild the scene');
    assert.equal(panned.staticRedraws, 2, 'panning must repaint the cached static layer exactly once');

    frame(400);
    assert.deepEqual(controller.stats(), panned, 'a frame after the pan settles must be free again');

    // A structural change is the only thing that may rebuild.
    engine.state.civilization.institutions.push('Ministry Of Sanity');
    frame(500);
    const structural = controller.stats();
    assert.equal(structural.sceneRebuilds, 2, 'a structural change must rebuild once');
    assert.equal(structural.staticRedraws, 3, 'a rebuild must repaint the static layer once');

    controller.destroy();
    delete globalThis.__frame;
  });
});
