import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../dist/game/engine.js';

// Drives both renderer backends end to end against recording stubs, so a change that stops the
// world from actually drawing creatures, banners or structures fails here rather than in a browser.

const DOM_KEYS = ['window', 'document', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'Phaser'];

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

test('Canvas fallback actually draws a populated world', async () => {
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
    delete globalThis.Phaser;
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

test('Phaser path draws the same world through the shared surface', async () => {
  const perLayer = new Map();
  await withStubbedDom(() => {
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    globalThis.document = { createElement: () => ({ className: '', style: {}, getContext: () => ({}), addEventListener: () => {}, setPointerCapture: () => {}, remove: () => {} }) };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = () => 1;
    globalThis.cancelAnimationFrame = () => {};

    let layerIndex = 0;
    const graphics = () => {
      const calls = [];
      perLayer.set(`layer${layerIndex++}`, calls);
      const api = new Proxy({}, { get: (_target, name) => (...args) => { if (name !== 'then') calls.push([String(name), ...args]); return api; } });
      return api;
    };
    const sceneStub = {
      scale: { resize: () => {}, width: 900, height: 520 },
      add: { graphics },
      input: { on: () => {} },
      cameras: { main: { setBounds: () => {}, centerOn: () => {}, getBounds: () => ({ width: 2000 }), scrollX: 0 } },
    };
    globalThis.Phaser = {
      AUTO: 0,
      Scale: { RESIZE: 0, CENTER_BOTH: 0 },
      Game: class {
        constructor(config) { this.config = config; config.scene.create.call(sceneStub); Object.assign(sceneStub, { __config: config }); this.sceneStub = sceneStub; }
        destroy() {}
      },
    };
    globalThis.__sceneStub = sceneStub;
  }, async () => {
    const host = { clientWidth: 900, clientHeight: 520, appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: 900, height: 520 }) };
    const engine = { state: { phase: 'civilization', civilization: developedCivilization() }, worldImpulse: null, onChange: () => () => {} };
    const { startWorldRenderer } = await import(`../dist/render/world.js?smoke-phaser=${Date.now()}`);
    const controller = startWorldRenderer(engine, host);
    const sceneStub = globalThis.__sceneStub;
    sceneStub.__config.scene.update.call(sceneStub, 100);
    controller.destroy();
    delete globalThis.__sceneStub;
  });

  // layer0 sky, layer1 terrain, layer2 settlement, layer3 atmosphere, layer4 impulse.
  const settlement = perLayer.get('layer2') ?? [];
  const atmosphere = perLayer.get('layer3') ?? [];
  assert.ok(settlement.length > 200, `settlement layer drew only ${settlement.length} primitives`);
  assert.ok(atmosphere.length > 200, `atmosphere layer drew only ${atmosphere.length} primitives`);
  assert.ok(atmosphere.some(([name]) => name === 'fillPoints'), 'faction banner cloth must reach Phaser as a polygon');
  assert.ok(settlement.some(([name]) => name === 'fillTriangle'), 'typed structures must draw triangles');
  for (const [name, calls] of perLayer) assertFiniteGeometry(calls, name);
});
