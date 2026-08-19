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
