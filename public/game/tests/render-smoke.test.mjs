import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../dist/game/engine.js';

// Drives the renderer end to end against recording stubs, so a change that stops the world from
// actually drawing creatures, banners or structures fails here rather than in a browser.
// The canvas doubles carry `setAttribute` because the renderer marks its three layers aria-hidden:
// the host element owns the accessible name, so the layers themselves are decoration.

const DOM_KEYS = ['window', 'document', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'devicePixelRatio'];

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
      return { className: '', style: {}, width: 0, height: 0, getContext: () => trackingContext(calls), addEventListener: () => {}, setPointerCapture: () => {}, setAttribute: () => {}, remove: () => {} }; } };
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
    globalThis.document = { createElement: () => { const context = contexts[created++] ?? recordingContext([]); return { className: '', style: {}, width: 0, height: 0, getContext: () => context, addEventListener: () => {}, setPointerCapture: () => {}, setAttribute: () => {}, remove: () => {} }; } };
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
    globalThis.document = { createElement: () => ({ className: '', style: {}, width: 0, height: 0, getContext: () => recordingContext([]), addEventListener: () => {}, setPointerCapture: () => {}, setAttribute: () => {}, remove: () => {} }) };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => { globalThis.__frame = callback; return 1; };
    globalThis.cancelAnimationFrame = () => {};
  }, async () => {
    const host = { clientWidth: 900, clientHeight: 520, appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: 900, height: 520 }) };
    const engine = { state: { phase: 'civilization', civilization: developedCivilization(707) }, worldImpulse: null, onChange: () => () => {} };
    const { startWorldRenderer } = await import(`../dist/render/world.js?pan=${Date.now()}`);
    const controller = startWorldRenderer(engine, host);
    const frame = time => globalThis.__frame(time);

    const first = { sceneRebuilds: 1, staticRedraws: 1, sceneryFullRedraws: 1, sceneryStripRedraws: 0, qualityTier: 0 };
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
        removeEventListener: () => {}, setPointerCapture: () => {}, setAttribute: () => {}, remove: () => {} }; } };
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

test('depth lanes provide spatial Y-offsets and deterministic ordering', async () => {
  const { depthLaneYOffset, structureEffectiveGround } = await import('../dist/render/settlements.js');
  assert.equal(depthLaneYOffset('back'), -8);
  assert.equal(depthLaneYOffset('mid'), 0);
  assert.equal(depthLaneYOffset('front'), 8);

  const ground = 400;
  assert.equal(structureEffectiveGround(ground, 'back'), 392);
  assert.equal(structureEffectiveGround(ground, 'mid'), 400);
  assert.equal(structureEffectiveGround(ground, 'front'), 408);
});

test('consequence impacts remain bounded, visible, and finite when panning', async () => {
  const { drawConsequenceImpact } = await import('../dist/render/consequence-presentation.js');
  const calls = [];
  const surface = {
    lineStyle: () => surface,
    fillStyle: () => surface,
    line: (...args) => calls.push(['line', ...args]),
    strokeCircle: (...args) => calls.push(['strokeCircle', ...args]),
    fillCircle: (...args) => calls.push(['fillCircle', ...args]),
    fillRect: (...args) => calls.push(['fillRect', ...args]),
    strokeRect: (...args) => calls.push(['strokeRect', ...args]),
    fillTriangle: (...args) => calls.push(['fillTriangle', ...args]),
  };

  const feedback = {
    sequence: 42,
    eventId: 'tactical:stabilize',
    consequence: { significance: 'turning_point', tags: ['containment'], signatureProfile: 'containment' },
  };

  const settlements = [{ centerX: 1200, structures: [] }];
  // Test panning across a 3600px wide world
  for (const scroll of [0, 800, 1600, 2400]) {
    calls.length = 0;
    drawConsequenceImpact(surface, feedback, 100, 200, 900, 520, 0x00ff00, false, scroll, 3600, settlements);
    assert.ok(calls.length > 0, 'consequence impact must draw primitives');
    assertFiniteGeometry(calls, `consequence scroll ${scroll}`);
  }
});

// Replays a drag script against a fresh renderer and returns the settlement-layer primitives of the
// last frame, positioned in screen coordinates.
async function sceneryAfterDrags(seed, drags, tag, { makeCiv = developedCivilization, viewport = { width: 900, height: 520 } } = {}) {
  const calls = [];
  const listeners = new Map();
  let frame = null;
  await withStubbedDom(() => {
    const contexts = [trackingContext([]), trackingContext(calls), trackingContext([])];
    let created = 0;
    if (viewport.dpr !== undefined) globalThis.devicePixelRatio = viewport.dpr;
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    globalThis.document = { createElement: () => { const context = contexts[created++] ?? trackingContext([]);
      return { className: '', style: {}, width: 0, height: 0, getContext: () => context,
        addEventListener: (name, handler) => { if (context === contexts[1]) listeners.set(name, handler); },
        removeEventListener: () => {}, setPointerCapture: () => {}, setAttribute: () => {}, remove: () => {} }; } };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
    globalThis.cancelAnimationFrame = () => {};
  }, async () => {
    const host = { appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: viewport.width, height: viewport.height }) };
    const engine = { state: { phase: 'civilization', civilization: makeCiv(seed) }, worldImpulse: null, onChange: () => () => {} };
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

test('continuous terrain polygon ridgelines render deterministically without NaNs', async () => {
  const staticCalls = [];
  let frame = null;
  await withStubbedDom(() => {
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    globalThis.document = { createElement: () => ({ className: '', style: {}, width: 0, height: 0, getContext: () => recordingContext(staticCalls), addEventListener: () => {}, setPointerCapture: () => {}, setAttribute: () => {}, remove: () => {} }) };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
    globalThis.cancelAnimationFrame = () => {};
  }, async () => {
    const host = { clientWidth: 900, clientHeight: 520, appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: 900, height: 520 }) };
    const engine = { state: { phase: 'civilization', civilization: developedCivilization(1234) }, worldImpulse: null, onChange: () => () => {} };
    const { startWorldRenderer } = await import(`../dist/render/world.js?terrain=${Date.now()}`);
    const controller = startWorldRenderer(engine, host);
    frame(100);
    assert.ok(staticCalls.length > 0, 'static layer must render terrain');
    assertFiniteGeometry(staticCalls, 'terrain static layer');
    controller.destroy();
  });
});

test('subpixel and boundary pointer drag does not trigger unnecessary static redraws', async () => {
  const listeners = new Map();
  let frame = null;
  await withStubbedDom(() => {
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    globalThis.document = { createElement: () => {
      return { className: '', style: {}, width: 0, height: 0, getContext: () => recordingContext([]),
        addEventListener: (name, handler) => { listeners.set(name, handler); },
        removeEventListener: () => {}, setPointerCapture: () => {}, setAttribute: () => {}, remove: () => {} }; } };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
    globalThis.cancelAnimationFrame = () => {};
  }, async () => {
    const host = { appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: 900, height: 520 }) };
    const engine = { state: { phase: 'civilization', civilization: developedCivilization(333) }, worldImpulse: null, onChange: () => () => {} };
    const { startWorldRenderer } = await import(`../dist/render/world.js?subpixel=${Date.now()}`);
    const controller = startWorldRenderer(engine, host);

    frame(100);
    const initialStats = controller.stats();
    assert.equal(initialStats.staticRedraws, 1);

    // Subpixel move < 1/DPR (0.1px) at scroll limit 0
    listeners.get('pointerdown')({ clientX: 100, pointerId: 1 });
    listeners.get('pointermove')({ clientX: 100.1, pointerId: 1 });
    listeners.get('pointerup')({});
    frame(200);

    const afterSubpixel = controller.stats();
    assert.equal(afterSubpixel.staticRedraws, 1, 'subpixel move beyond boundary should not trigger static redraw');

    controller.destroy();
  });
});

test('secondary path affinity change rebuilds the scene correctly', async () => {
  let frame = null;
  await withStubbedDom(() => {
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    globalThis.document = { createElement: () => ({ className: '', style: {}, width: 0, height: 0, getContext: () => recordingContext([]), addEventListener: () => {}, setPointerCapture: () => {}, setAttribute: () => {}, remove: () => {} }) };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
    globalThis.cancelAnimationFrame = () => {};
  }, async () => {
    const host = { appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: 900, height: 520 }) };
    const civ = developedCivilization(888);
    const engine = { state: { phase: 'civilization', civilization: civ }, worldImpulse: null, onChange: fn => { globalThis.__onChange = fn; return () => {}; } };
    const { startWorldRenderer } = await import(`../dist/render/world.js?affinitychange=${Date.now()}`);
    const controller = startWorldRenderer(engine, host);

    frame(100);
    assert.equal(controller.stats().sceneRebuilds, 1);

    // Modify a secondary path affinity (e.g. recursive_simulation) which alters faction roster shares
    civ.pathState.affinity.recursive_simulation = 8;
    globalThis.__onChange();
    frame(200);

    assert.equal(controller.stats().sceneRebuilds, 2, 'secondary path affinity change must trigger scene rebuild');

    controller.destroy();
  });
});

test('context loss and restoration invalidates static and scenery caches', async () => {
  const canvasElements = [];
  let frame = null;
  await withStubbedDom(() => {
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    globalThis.document = { createElement: () => {
      const listeners = new Map();
      const el = {
        className: '', style: {}, width: 0, height: 0,
        getContext: () => recordingContext([]),
        addEventListener: (name, handler) => listeners.set(name, handler),
        removeEventListener: (name) => listeners.delete(name),
        setAttribute: () => {}, remove: () => {},
        _listeners: listeners,
      };
      canvasElements.push(el);
      return el;
    } };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
    globalThis.cancelAnimationFrame = () => {};
  }, async () => {
    const host = { appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: 900, height: 520 }) };
    const engine = { state: { phase: 'civilization', civilization: developedCivilization(444) }, worldImpulse: null, onChange: () => () => {} };
    const { startWorldRenderer } = await import(`../dist/render/world.js?contextrestore=${Date.now()}`);
    const controller = startWorldRenderer(engine, host);

    frame(100);
    assert.equal(controller.stats().sceneryFullRedraws, 1);

    // Simulate context loss and restoration on scenery canvas
    const sceneryCanvas = canvasElements[1];
    const lostHandler = sceneryCanvas._listeners.get('contextlost');
    const restoredHandler = sceneryCanvas._listeners.get('contextrestored');
    assert.ok(lostHandler && restoredHandler, 'context loss handlers must be registered');

    let prevented = false;
    lostHandler({ preventDefault: () => { prevented = true; } });
    assert.ok(prevented, 'contextlost event must call preventDefault');

    restoredHandler();
    frame(200);

    assert.equal(controller.stats().sceneRebuilds, 2, 'context restore must trigger scene rebuild and full redraw');
    assert.equal(controller.stats().sceneryFullRedraws, 2, 'scenery must do a full redraw after context restore');

    controller.destroy();
  });
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
    globalThis.document = { createElement: () => { const context = contexts[created++] ?? trackingContext([]); return { className: '', style: {}, width: 0, height: 0, getContext: () => context, addEventListener: () => {}, setPointerCapture: () => {}, setAttribute: () => {}, remove: () => {} }; } };
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

// Renders one frame for a civilization and returns the three positioned primitive buckets.
async function bucketsForCivilization(civ, tag) {
  const staticCalls = [], sceneryCalls = [], dynamicCalls = [];
  let frame = null;
  await withStubbedDom(() => {
    const contexts = [trackingContext(staticCalls), trackingContext(sceneryCalls), trackingContext(dynamicCalls)];
    let created = 0;
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    globalThis.document = { createElement: () => { const context = contexts[created++] ?? trackingContext([]); return { className: '', style: {}, width: 0, height: 0, getContext: () => context, addEventListener: () => {}, setPointerCapture: () => {}, setAttribute: () => {}, remove: () => {} }; } };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
    globalThis.cancelAnimationFrame = () => {};
  }, async () => {
    const host = { appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: 900, height: 520 }) };
    const engine = { state: { phase: 'civilization', civilization: civ }, worldImpulse: null, onChange: () => () => {} };
    const { startWorldRenderer } = await import(`../dist/render/world.js?${tag}=${Date.now()}`);
    const controller = startWorldRenderer(engine, host);
    frame(100);
    controller.destroy();
  });
  return { staticCalls, sceneryCalls, dynamicCalls };
}

test('persistent marks and scars paint on the cached scenery layer, never on the static layer', async () => {
  const bare = await bucketsForCivilization(developedCivilization(616), 'memory-bare');
  const remembered = developedCivilization(616);
  remembered.visualMemory = {
    version: 1, sequence: 4,
    marks: [{ domain:'social', motif:'unrest', strength:3, sourceEventId:'damage', createdAtSequence:1, anchor01:.08, repairable:true }],
    scars: [{ domain:'reality', motif:'breach', strength:3, sourceEventId:'crisis', createdAtSequence:2, anchor01:.05, evolution:2 }],
  };
  const withMemory = await bucketsForCivilization(remembered, 'memory-drawn');

  assert.ok(withMemory.sceneryCalls.length > bare.sceneryCalls.length, 'saved memory must add persistent scenery geometry');
  assert.equal(withMemory.staticCalls.length, bare.staticCalls.length, 'memory must never touch the sky/terrain layer');
  for (const [label, calls] of [['scenery', withMemory.sceneryCalls], ['accents', withMemory.dynamicCalls]]) {
    for (const call of calls) assert.ok(Number.isFinite(call.from) && Number.isFinite(call.to), `memory ${label}: ${call.name} produced a non-finite extent`);
  }
});

test('a world impulse paints only on the dynamic layer and never forces a scenery redraw', async () => {
  const staticCalls = [], sceneryCalls = [], dynamicCalls = [];
  let frame = null;
  await withStubbedDom(() => {
    const contexts = [trackingContext(staticCalls), trackingContext(sceneryCalls), trackingContext(dynamicCalls)];
    let created = 0;
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    globalThis.document = { createElement: () => { const context = contexts[created++] ?? trackingContext([]); return { className: '', style: {}, width: 0, height: 0, getContext: () => context, addEventListener: () => {}, setPointerCapture: () => {}, setAttribute: () => {}, remove: () => {} }; } };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
    globalThis.cancelAnimationFrame = () => {};
  }, async () => {
    const host = { appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: 900, height: 520 }) };
    const engine = { state: { phase: 'civilization', civilization: developedCivilization(717) }, worldImpulse: null, onChange: () => () => {} };
    const { startWorldRenderer } = await import(`../dist/render/world.js?impulse=${Date.now()}`);
    const controller = startWorldRenderer(engine, host);
    frame(100);
    const quiet = { scenery: controller.stats().sceneryFullRedraws + controller.stats().sceneryStripRedraws, rebuilds: controller.stats().sceneRebuilds };
    sceneryCalls.length = 0; staticCalls.length = 0; dynamicCalls.length = 0;

    engine.worldImpulse = {
      sequence: 7, eventId: 'entropy_crisis_50', eventTitle: 'Desynchronization', choiceLabel: 'Contain', tone: 'negative',
      metrics: [], affinities: [], additions: [],
      consequence: { significance: 'turning_point', tags: ['reality_damage'], transitions: {}, signatureProfile: 'crisis:entropy_50' },
    };
    frame(400);

    assert.ok(dynamicCalls.length > 0, 'the impact must paint on the dynamic layer');
    assert.equal(sceneryCalls.length, 0, 'a transient impact must not repaint cached scenery');
    assert.equal(staticCalls.length, 0, 'a transient impact must not repaint the static layers');
    assert.equal(controller.stats().sceneryFullRedraws + controller.stats().sceneryStripRedraws, quiet.scenery);
    assert.equal(controller.stats().sceneRebuilds, quiet.rebuilds, 'an impulse alone is not a structural change');

    controller.destroy();
  });
});

// Drives the renderer with a synthetic frame cost, so a quality tier can be reached without needing
// a genuinely slow machine.
async function bucketsAtQualityTier(seed, costMs, tag) {
  const staticCalls = [], sceneryCalls = [], dynamicCalls = [];
  let frame = null;
  let controllerStats = null;
  await withStubbedDom(() => {
    const contexts = [trackingContext(staticCalls), trackingContext(sceneryCalls), trackingContext(dynamicCalls)];
    let created = 0;
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    globalThis.document = { createElement: () => { const context = contexts[created++] ?? trackingContext([]); return { className: '', style: {}, width: 0, height: 0, getContext: () => context, addEventListener: () => {}, setPointerCapture: () => {}, setAttribute: () => {}, remove: () => {} }; } };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
    globalThis.cancelAnimationFrame = () => {};
  }, async () => {
    const host = { appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: 900, height: 520 }) };
    const engine = { state: { phase: 'civilization', civilization: developedCivilization(seed) }, worldImpulse: null, onChange: () => () => {} };
    const { startWorldRenderer } = await import(`../dist/render/world.js?${tag}=${Date.now()}`);
    // performance.now() is what the renderer measures its own draw cost with, so a clock that jumps
    // by `costMs` across each draw makes the frame look exactly that expensive.
    const realPerformance = globalThis.performance;
    let clock = 0;
    globalThis.performance = { now: () => { clock += costMs; return clock; } };
    try {
      const controller = startWorldRenderer(engine, host);
      let time = 100;
      // Three degradation steps, each needing 30 hot frames plus the 5 s cooldown between changes.
      for (let step = 0; step < 3; step++) {
        for (let i = 0; i < 31; i++) { time += 40; frame(time); }
        time += 5200;
        frame(time);
      }
      staticCalls.length = 0; sceneryCalls.length = 0; dynamicCalls.length = 0;
      time += 40; frame(time);
      controllerStats = controller.stats();
      controller.destroy();
      controllerStats.afterDestroy = controller.stats().qualityTier;
    } finally {
      if (realPerformance === undefined) delete globalThis.performance; else globalThis.performance = realPerformance;
    }
  });
  return { staticCalls, sceneryCalls, dynamicCalls, stats: controllerStats };
}

test('a Tier-3 frame sheds cosmetics but still paints every gameplay signal', async () => {
  const tierZero = await bucketsAtQualityTier(818, 0, 'tier0');
  const tierThree = await bucketsAtQualityTier(818, 40, 'tier3');

  assert.equal(tierZero.stats.qualityTier, 0, 'a cheap frame must never degrade');
  assert.equal(tierThree.stats.qualityTier, 3, 'a 40 ms draw must reach the lowest tier');
  assert.ok(tierThree.dynamicCalls.length < tierZero.dynamicCalls.length,
    `Tier 3 drew ${tierThree.dynamicCalls.length} primitives against ${tierZero.dynamicCalls.length} at Tier 0`);
  // Cosmetics only: the cached layers carry landmarks, marks and scars and must be untouched.
  assert.equal(tierThree.sceneryCalls.length, tierZero.sceneryCalls.length, 'quality must not thin persistent scenery');
  assert.ok(tierThree.dynamicCalls.length > 0, 'a degraded frame still draws the world');
  assert.equal(tierThree.stats.afterDestroy, 0, 'teardown must return the tier to 0');
});

test('a Tier-3 frame keeps drawing the current decision impact', async () => {
  const withImpact = [];
  let frame = null;
  await withStubbedDom(() => {
    const contexts = [trackingContext([]), trackingContext([]), trackingContext(withImpact)];
    let created = 0;
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    globalThis.document = { createElement: () => { const context = contexts[created++] ?? trackingContext([]); return { className: '', style: {}, width: 0, height: 0, getContext: () => context, addEventListener: () => {}, setPointerCapture: () => {}, setAttribute: () => {}, remove: () => {} }; } };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
    globalThis.cancelAnimationFrame = () => {};
  }, async () => {
    const host = { appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: 900, height: 520 }) };
    const civ = developedCivilization(819);
    civ.visualMemory = {
      version: 1, sequence: 3,
      marks: [{ domain:'reality', motif:'fracture', strength:3, sourceEventId:'crisis', createdAtSequence:1, anchor01:.04, repairable:true }],
      scars: [{ domain:'reality', motif:'breach', strength:3, sourceEventId:'crisis', createdAtSequence:2, anchor01:.04, evolution:2 }],
    };
    const engine = { state: { phase: 'civilization', civilization: civ }, worldImpulse: null, onChange: () => () => {} };
    const { startWorldRenderer } = await import(`../dist/render/world.js?tier3impact=${Date.now()}`);
    const realPerformance = globalThis.performance;
    let clock = 0;
    globalThis.performance = { now: () => { clock += 40; return clock; } };
    try {
      const controller = startWorldRenderer(engine, host);
      let time = 100;
      for (let step = 0; step < 3; step++) {
        for (let i = 0; i < 31; i++) { time += 40; frame(time); }
        time += 5200;
        frame(time);
      }
      assert.equal(controller.stats().qualityTier, 3);
      withImpact.length = 0;
      const quiet = (time += 40, frame(time), withImpact.length);
      withImpact.length = 0;
      engine.worldImpulse = {
        sequence: 11, eventId: 'entropy_crisis_75', eventTitle: 'Observation', choiceLabel: 'Endure', tone: 'negative',
        metrics: [], affinities: [], additions: [],
        consequence: { significance: 'turning_point', tags: ['reality_damage','surveillance'], transitions: {}, signatureProfile: 'crisis:entropy_75' },
      };
      time += 40; frame(time);
      assert.ok(withImpact.length > quiet, `Tier 3 dropped the decision impact: ${withImpact.length} vs ${quiet}`);
      controller.destroy();
    } finally {
      if (realPerformance === undefined) delete globalThis.performance; else globalThis.performance = realPerformance;
    }
  });
});

test('a dominant identity and its institutions draw distinct scenery, not just a different colour', async () => {
  function identityCiv(pathId, consolidation) {
    const civ = developedCivilization(919);
    civ.pathState.affinity = { ...civ.pathState.affinity, machine_faith: 0, void_communion: 0 };
    civ.pathState.affinity[pathId] = 9;
    civ.pathState.dominantPath = pathId;
    civ.pathState.completedEvents.push(consolidation);
    civ.institutions.push('Lunar Ministry', 'Ministry Of Sanity', 'Consensus Office');
    return civ;
  }
  const plain = developedCivilization(919);
  plain.pathState.dominantPath = '';
  plain.pathState.affinity = Object.fromEntries(Object.keys(plain.pathState.affinity).map(id => [id, 0]));

  const bare = await bucketsForCivilization(plain, 'identity-bare');
  const faith = await bucketsForCivilization(identityCiv('machine_faith', 'synod_of_the_second_engine'), 'identity-faith');
  const void_ = await bucketsForCivilization(identityCiv('void_communion', 'embassy_at_the_edge'), 'identity-void');

  assert.ok(faith.sceneryCalls.length > bare.sceneryCalls.length, 'a capital plus three institutions must add scenery geometry');
  // Geometry, not palette: the two capitals must differ in the primitives they emit, which a
  // trackingContext records without recording colour at all.
  const shape = calls => calls.map(call => `${call.name}:${Math.round(call.to - call.from)}`).join(',');
  assert.notEqual(shape(faith.sceneryCalls), shape(void_.sceneryCalls), 'two dominant paths must differ in silhouette, not only in accent colour');
  assert.equal(faith.staticCalls.length, bare.staticCalls.length, 'identity must not touch the sky/terrain layer');
});

test('a Drama Phase reached by surviving draws a bounded cue and writes no gameplay state', async () => {
  const dynamicCalls = [];
  let frame = null;
  await withStubbedDom(() => {
    const contexts = [trackingContext([]), trackingContext([]), trackingContext(dynamicCalls)];
    let created = 0;
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    globalThis.document = { createElement: () => { const context = contexts[created++] ?? trackingContext([]); return { className: '', style: {}, width: 0, height: 0, getContext: () => context, addEventListener: () => {}, setPointerCapture: () => {}, setAttribute: () => {}, remove: () => {} }; } };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
    globalThis.cancelAnimationFrame = () => {};
  }, async () => {
    const host = { appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: 900, height: 520 }) };
    // Emergence: nothing but a little Development, no era, no institutions, no choices.
    const civ = GameEngine.createCivilizationForTest(1010);
    civ.development = 40;
    const engine = { state: { phase: 'civilization', civilization: civ }, worldImpulse: null, onChange: () => () => {} };
    const { civilizationDramaPhase } = await import('../dist/game/drama.js');
    const { startWorldRenderer } = await import(`../dist/render/world.js?phase=${Date.now()}`);
    const controller = startWorldRenderer(engine, host);

    frame(100);
    assert.equal(civilizationDramaPhase(civ).name, 'emergence');
    dynamicCalls.length = 0;
    frame(200);
    const baselineDynamicCalls = dynamicCalls.slice();

    // Passive Development only -- no decision, no tactical action, no engine call at all.
    civ.development = 150;
    assert.equal(civilizationDramaPhase(civ).name, 'expansion');
    dynamicCalls.length = 0;
    frame(300);

    assert.equal(engine.state.civilization.visualMemory, undefined, 'renderer-local phase feedback must not write gameplay state');
    assert.ok(dynamicCalls.length > baselineDynamicCalls.length, 'phase transition should add a bounded dynamic cue');
    // Bounded: a transition cue is a handful of lines and one ring, not a new world.
    const duringTransition = dynamicCalls.length;
    assert.ok(duringTransition - baselineDynamicCalls.length < 400,
      `the cue added ${duringTransition - baselineDynamicCalls.length} primitives`);

    // The growth above could come from the larger stage alone, so let the 1500 ms cue expire and
    // draw the same world again: what disappears is the cue, and only the cue.
    dynamicCalls.length = 0;
    frame(2200);
    // Only directionality is asserted here: ambient agents and particles also differ between the two
    // frames, so the exact cue size is pinned by the unit test in presentation.test.mjs instead.
    assert.ok(dynamicCalls.length < duringTransition, 'the cue must be transient, not a permanent overlay');

    controller.destroy();
  });
});

// The reference desktop case: a 1440x760 viewport at DPR 2 carrying the full memory budget -- six
// marks, three scars, an entrenched capital and all three institution landmarks. Both the pinned
// ceiling and the strip/full equivalence render this same fixture, so the equivalence actually
// covers the memory and identity geometry rather than a bare civilization.
const REFERENCE_VIEWPORT = { width: 1440, height: 760, dpr: 2 };

function referenceCivilization(seed) {
  const civ = developedCivilization(seed);
  civ.pathState.completedEvents.push('synod_of_the_second_engine');
  civ.institutions.push('Lunar Ministry', 'Ministry Of Sanity', 'Consensus Office');
  civ.visualMemory = {
    version: 1, sequence: 12,
    marks: [
      { domain:'built_environment', motif:'advanced_district', strength:2, sourceEventId:'a', createdAtSequence:1, anchor01:.10, repairable:false },
      { domain:'identity', motif:'engine_shrine', strength:3, sourceEventId:'b', createdAtSequence:2, anchor01:.21, repairable:false },
      { domain:'control', motif:'surveillance', strength:2, sourceEventId:'c', createdAtSequence:3, anchor01:.38, repairable:true },
      { domain:'social', motif:'unrest', strength:3, sourceEventId:'d', createdAtSequence:4, anchor01:.51, repairable:true },
      { domain:'ecology', motif:'blight', strength:2, sourceEventId:'e', createdAtSequence:5, anchor01:.71, repairable:true },
      { domain:'reality', motif:'fracture', strength:3, sourceEventId:'f', createdAtSequence:6, anchor01:.88, repairable:true },
    ],
    scars: [
      { domain:'reality', motif:'breach', strength:3, sourceEventId:'g', createdAtSequence:7, anchor01:.10, evolution:3 },
      { domain:'civilization', motif:'futures_ruins', strength:3, sourceEventId:'h', createdAtSequence:8, anchor01:.51, evolution:1 },
      { domain:'identity', motif:'replacement_monument', strength:3, sourceEventId:'i', createdAtSequence:9, anchor01:.81, evolution:2 },
    ],
  };
  return civ;
}

// A 1440x760 viewport at DPR 2 -- the reference desktop case -- carrying the full memory budget: six
// marks, three scars, an entrenched capital and all three institution landmarks. This is the ceiling
// the whole cache design rests on, so it is pinned as a number rather than only as an equivalence.
async function referenceStripRedraw(nudgePx) {
  const calls = [];
  const listeners = new Map();
  let frame = null;
  let full = 0;
  await withStubbedDom(() => {
    const contexts = [trackingContext([]), trackingContext(calls), trackingContext([])];
    let created = 0;
    globalThis.devicePixelRatio = REFERENCE_VIEWPORT.dpr;
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    globalThis.document = { createElement: () => { const context = contexts[created++] ?? trackingContext([]);
      return { className: '', style: {}, width: 0, height: 0, getContext: () => context,
        addEventListener: (name, handler) => { if (context === contexts[1]) listeners.set(name, handler); },
        removeEventListener: () => {}, setPointerCapture: () => {}, setAttribute: () => {}, remove: () => {} }; } };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
    globalThis.cancelAnimationFrame = () => {};
  }, async () => {
    const host = { appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: REFERENCE_VIEWPORT.width, height: REFERENCE_VIEWPORT.height }) };
    const civ = referenceCivilization(1212);
    const engine = { state: { phase: 'civilization', civilization: civ }, worldImpulse: null, onChange: () => () => {} };
    const { startWorldRenderer } = await import(`../dist/render/world.js?ceiling=${nudgePx}-${Date.now()}`);
    const controller = startWorldRenderer(engine, host);
    frame(100);
    full = calls.length;
    calls.length = 0;
    listeners.get('pointerdown')({ clientX: 700, pointerId: 1 });
    listeners.get('pointermove')({ clientX: 700 - nudgePx, pointerId: 1 });
    listeners.get('pointerup')({});
    frame(200);
    controller.destroy();
  });
  return { strip: calls, full };
}

test('memory and identity scenery keep the reference strip redraw under its ceiling', async () => {
  const { strip, full } = await referenceStripRedraw(12);
  assert.ok(full > 400, `the reference full paint drew only ${full} primitives`);
  const stripPrimitiveCount = strip.length;
  assert.ok(stripPrimitiveCount <= 320, `memory/identity scenery regressed strip redraw to ${stripPrimitiveCount} primitives`);

  // The equivalence that makes the narrow strip legitimate in the first place, re-checked with the
  // full memory budget in place: reaching the same scroll by a drag too wide to reuse anything gives
  // the reference painting of the same slice.
  // Same fixture and same viewport, but deliberately at DPR 1: `trackingContext` records the
  // transform's horizontal component, which the renderer sets in device pixels, so `from`/`to` only
  // share units with a primitive's CSS-pixel x at DPR 1. The pinned ceiling above covers DPR 2,
  // where it counts primitives instead of comparing their positions.
  // Same fixture and viewport as the ceiling, but deliberately at DPR 1: `trackingContext` records
  // the transform's horizontal component, which the renderer sets in device pixels, so `from`/`to`
  // only share units with a primitive's CSS-pixel x at DPR 1. The ceiling above covers DPR 2, where
  // it counts primitives rather than comparing their positions.
  const viewport = { width: REFERENCE_VIEWPORT.width, height: REFERENCE_VIEWPORT.height };
  const fixture = { makeCiv: referenceCivilization, viewport };
  // A 120 px nudge landing on the settlement that carries the mid-world mark and scar, rather than a
  // 12 px sliver in the gap between two settlements -- memory snaps to settlement centres, so a
  // window in a gap would compare an empty strip and pass while covering none of this geometry.
  const NUDGE = 120, SCROLL = 1572;
  const viaStrip = await sceneryAfterDrags(1212, [SCROLL - NUDGE, NUDGE], 'ceiling-strip', fixture);
  const viaFull = await sceneryAfterDrags(1212, [SCROLL], 'ceiling-reference', fixture);
  const edge = viewport.width, lip = edge - NUDGE;
  const exposed = calls => calls
    .filter(call => call.to >= lip && call.from <= edge)
    .map(call => ({ name: call.name, from: Math.max(lip, call.from), to: Math.min(edge, call.to) }));

  // The comparison is only worth making if the fixture's memory and identity geometry actually falls
  // inside the window. Pin that against a bare civilization, so a future layout change cannot quietly
  // move the marks out and leave this test comparing plain settlements.
  const bare = await sceneryAfterDrags(1212, [SCROLL], 'ceiling-bare', { viewport });
  assert.ok(exposed(viaFull).length > exposed(bare).length,
    `the window must contain memory/identity primitives: ${exposed(viaFull).length} with memory vs ${exposed(bare).length} without`);
  assert.ok(exposed(viaFull).length > 0, 'the reference redraw must paint something in the strip');
  assert.deepEqual(exposed(viaStrip), exposed(viaFull), 'the strip redraw dropped or moved primitives the full redraw paints');
});
