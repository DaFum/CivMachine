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
    // The scenery layer scrolls by copying itself and clipping the redraw to the exposed strip.
    set globalCompositeOperation(value) { calls.push(['globalCompositeOperation', value]); },
    drawImage: (_source, dx) => calls.push(['drawImage', dx]),
    save: () => calls.push(['save']),
    restore: () => calls.push(['restore']),
    rect: (...args) => calls.push(['rect', ...args]),
    clip: () => calls.push(['clip']),
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
    // Blit bookkeeping, not world drawing: it addresses the canvas in device pixels, so recording it
    // as a positioned primitive would be meaningless.
    set globalCompositeOperation(value) {},
    drawImage: () => {}, save: () => {}, restore: () => {}, rect: () => {}, clip: () => {},
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
    const buckets = [[], [], []];
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
    const [staticCalls, sceneryCalls, dynamicCalls] = globalThis.__buckets;
    for (const step of [0, 1, 2, 4]) {
      if (step > 0) controller.nudge(1);
      staticCalls.length = 0;
      sceneryCalls.length = 0;
      dynamicCalls.length = 0;
      globalThis.__frame(100 + step * 100);
      assert.ok(staticCalls.length > 0, 'static layer drew nothing');
      assert.ok(sceneryCalls.length > 0, 'scenery layer drew nothing');
      assert.ok(dynamicCalls.length > 0, 'dynamic layer drew nothing');
      // The dynamic layer repaints every throttled frame, so an unculled draw there costs more than
      // one on the static layer. All three are held to the same ceiling.
      perScroll.push(staticCalls.concat(sceneryCalls, dynamicCalls));
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
  const sceneryCalls = [];
  const dynamicCalls = [];
  let frame = null;
  await withStubbedDom(() => {
    const contexts = [recordingContext(staticCalls), recordingContext(sceneryCalls), recordingContext(dynamicCalls)];
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

  // Sky and terrain are deliberately cheap -- that is why they may be repainted on every scrolled
  // pixel -- while the settlements they sit behind are the bulk of the static drawing.
  assert.ok(staticCalls.length > 20, `static layer drew only ${staticCalls.length} primitives`);
  assert.ok(sceneryCalls.length > 400, `scenery layer drew only ${sceneryCalls.length} primitives`);
  assert.ok(dynamicCalls.length > 200, `dynamic layer drew only ${dynamicCalls.length} primitives`);
  assert.ok(sceneryCalls.some(([name]) => name === 'fillRect'), 'structures must fill');
  assert.ok(dynamicCalls.some(([name]) => name === 'arc'), 'creatures and beacons must draw arcs');
  assert.ok(dynamicCalls.some(([name]) => name === 'closePath'), 'banner cloth and creature bodies must close paths');
  assertFiniteGeometry(staticCalls, 'static');
  assertFiniteGeometry(sceneryCalls, 'scenery');
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

    const first = { sceneRebuilds: 1, staticRedraws: 1, sceneryFullRedraws: 1, sceneryStripRedraws: 0 };
    frame(100);
    assert.deepEqual(controller.stats(), first, 'the first real frame builds and paints once');

    frame(200);
    assert.deepEqual(controller.stats(), first, 'an unchanged frame must neither rebuild nor repaint');

    controller.nudge(1);
    frame(300);
    const panned = controller.stats();
    assert.equal(panned.sceneRebuilds, 1, 'panning must not rebuild the scene');
    assert.equal(panned.staticRedraws, 2, 'panning must repaint the cached static layer exactly once');
    // The settlement layer moves with the scroll, so panning reuses what it already painted.
    assert.equal(panned.sceneryFullRedraws, 1, 'panning must not repaint the whole settlement layer');
    assert.equal(panned.sceneryStripRedraws, 1, 'panning must repaint the exposed strip exactly once');

    frame(400);
    assert.deepEqual(controller.stats(), panned, 'a frame after the pan settles must be free again');

    // A structural change is the only thing that may rebuild.
    engine.state.civilization.institutions.push('Ministry Of Sanity');
    frame(500);
    const structural = controller.stats();
    assert.equal(structural.sceneRebuilds, 2, 'a structural change must rebuild once');
    assert.equal(structural.staticRedraws, 3, 'a rebuild must repaint the static layer once');
    assert.equal(structural.sceneryFullRedraws, 2, 'a rebuild invalidates the settlement layer, so it repaints whole');

    controller.destroy();
    delete globalThis.__frame;
  });
});

test('dragging repaints only the strip the scroll exposed', async () => {
  // The settlement layer is over 90% of the static drawing cost and moves 1:1 with the scroll, so a
  // drag must copy what is already painted and repaint only what the copy left uncovered. Without
  // that, every drag frame repaints a whole viewport of settlements.
  const sceneryCalls = [];
  const listeners = new Map();
  let frame = null;
  await withStubbedDom(() => {
    const contexts = [recordingContext([]), recordingContext(sceneryCalls), recordingContext([])];
    let created = 0;
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    globalThis.document = { createElement: () => { const context = contexts[created++] ?? recordingContext([]);
      return { className: '', style: {}, width: 0, height: 0, getContext: () => context,
        addEventListener: (name, handler) => { if (context === contexts[1]) listeners.set(name, handler); },
        removeEventListener: () => {}, setPointerCapture: () => {}, remove: () => {} }; } };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
    globalThis.cancelAnimationFrame = () => {};
  }, async () => {
    const host = { appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: 900, height: 520 }) };
    const engine = { state: { phase: 'civilization', civilization: developedCivilization(511) }, worldImpulse: null, onChange: () => () => {} };
    const { startWorldRenderer } = await import(`../dist/render/world.js?drag=${Date.now()}`);
    const controller = startWorldRenderer(engine, host);

    frame(100);
    const full = sceneryCalls.length;
    assert.ok(full > 400, `the first paint must draw the whole visible slice, drew ${full}`);
    assert.ok(listeners.has('pointerdown'), 'the scenery canvas is the layer that takes pointer input');

    sceneryCalls.length = 0;
    listeners.get('pointerdown')({ clientX: 500, pointerId: 1 });
    listeners.get('pointermove')({ clientX: 488, pointerId: 1 });
    frame(200);

    const stats = controller.stats();
    assert.equal(stats.sceneryFullRedraws, 1, 'a drag must not repaint the whole settlement layer');
    assert.equal(stats.sceneryStripRedraws, 1, 'a drag must repaint the exposed strip once');
    assert.equal(stats.sceneRebuilds, 1, 'a drag must not rebuild the scene');

    // The copy moves the painted layer by exactly the dragged distance, in whole device pixels.
    const blits = sceneryCalls.filter(([name]) => name === 'drawImage');
    assert.deepEqual(blits, [['drawImage', -12]], 'the layer must be copied by the dragged distance');

    // 12 px of new world plus the slack that covers primitives reaching in from outside it, against
    // a 900 px viewport plus its cull margins. A regression to a full repaint fails here.
    assert.ok(sceneryCalls.length < full * 0.6, `a 12 px drag redrew ${sceneryCalls.length} of ${full} primitives`);

    controller.destroy();
  });
});

// Replays a drag script against a fresh renderer and returns the settlement-layer primitives of the
// last frame, positioned in screen coordinates.
async function sceneryAfterDrags(seed, drags, tag) {
  const calls = [];
  const listeners = new Map();
  let frame = null;
  await withStubbedDom(() => {
    const contexts = [trackingContext([]), trackingContext(calls), trackingContext([])];
    let created = 0;
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    globalThis.document = { createElement: () => { const context = contexts[created++] ?? trackingContext([]);
      return { className: '', style: {}, width: 0, height: 0, getContext: () => context,
        addEventListener: (name, handler) => { if (context === contexts[1]) listeners.set(name, handler); },
        removeEventListener: () => {}, setPointerCapture: () => {}, remove: () => {} }; } };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
    globalThis.cancelAnimationFrame = () => {};
  }, async () => {
    const host = { appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: 900, height: 520 }) };
    const engine = { state: { phase: 'civilization', civilization: developedCivilization(seed) }, worldImpulse: null, onChange: () => () => {} };
    const { startWorldRenderer } = await import(`../dist/render/world.js?${tag}=${Date.now()}`);
    const controller = startWorldRenderer(engine, host);
    frame(100);
    let time = 200;
    for (const distance of drags) {
      calls.length = 0;
      listeners.get('pointerdown')({ clientX: 500, pointerId: 1 });
      listeners.get('pointermove')({ clientX: 500 - distance, pointerId: 1 });
      listeners.get('pointerup')({});
      frame(time);
      time += 100;
    }
    controller.destroy();
  });
  return calls;
}

test('a strip redraw paints the exposed slice exactly as a full redraw would', async () => {
  // This is what allows the strip band to be narrow. `drawSettlementContent` culls every settlement
  // by its radius and every structure by its own width, so the strip needs no wide slack -- but only
  // as long as that stays true. Reaching the same scroll by a drag too wide to reuse anything gives
  // the reference painting of the same slice; the strip must match it inside the exposed region.
  const viaStrip = await sceneryAfterDrags(511, [900, 12], 'strip');
  const viaFull = await sceneryAfterDrags(511, [912], 'reference');
  // Clamped to the exposed region, because the primitives that span the whole band -- the ground and
  // the foreground bank -- legitimately span a narrower band in the strip redraw while covering the
  // exposed pixels identically. This compares extents, not colors.
  const exposed = calls => calls
    .filter(call => call.to >= 888 && call.from <= 900)
    .map(call => ({ name: call.name, from: Math.max(888, call.from), to: Math.min(900, call.to) }));

  assert.ok(exposed(viaFull).length > 0, 'the reference redraw must paint something in the strip');
  assert.deepEqual(exposed(viaStrip), exposed(viaFull), 'the strip redraw dropped or moved primitives the full redraw paints');
});

test('live stats control dynamic rendering without rebuilding the static scene', async () => {
  const staticCalls = [];
  const sceneryCalls = [];
  const dynamicCalls = [];
  let frame = null;
  await withStubbedDom(() => {
    const contexts = [trackingContext(staticCalls), trackingContext(sceneryCalls), trackingContext(dynamicCalls)];
    let created = 0;
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    globalThis.document = { createElement: () => { const context = contexts[created++] ?? trackingContext([]); return { className: '', style: {}, width: 0, height: 0, getContext: () => context, addEventListener: () => {}, setPointerCapture: () => {}, remove: () => {} }; } };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
    globalThis.cancelAnimationFrame = () => {};
  }, async () => {
    const host = { clientWidth: 900, clientHeight: 520, appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: 900, height: 520 }) };
    const engine = { state: { phase: 'civilization', civilization: developedCivilization() }, worldImpulse: null, onChange: () => () => {} };
    const { startWorldRenderer } = await import(`../dist/render/world.js?dynamic=${Date.now()}`);
    const controller = startWorldRenderer(engine, host);

    assert.ok(frame, 'the fallback must schedule a frame');
    frame(100);

    staticCalls.length = 0;
    dynamicCalls.length = 0;

    // Change attention slightly to stay in the same structural band (band 2 is 50-74).
    // Original was 70. Change to 71 to alter particle generation hash but keep band same.
    engine.state.civilization.stats.attention = 71;
    // Advance time by more than throttle (180ms)
    frame(300);

    assert.ok(dynamicCalls.length > 0, 'dynamic layer should react to live stat change');
    assert.equal(controller.stats().sceneRebuilds, 1, 'static scene should not be rebuilt on live stat change');
    assert.equal(controller.stats().staticRedraws, 1, 'static scene should not be redrawn on live stat change');

    controller.destroy();
  });
});
