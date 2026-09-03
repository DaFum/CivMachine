import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../dist/game/engine.js';

// Drives the renderer end to end against recording stubs, so a change that stops the world from
// actually drawing creatures, banners or structures fails here rather than in a browser.
// The canvas doubles carry `setAttribute` because the renderer marks its three layers aria-hidden:
// the host element owns the accessible name, so the layers themselves are decoration.

const DOM_KEYS = ['window', 'document', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'devicePixelRatio', 'matchMedia'];

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
    // A light field is bounded by its outer radius, so it is held to the same extents as a circle.
    fillRadialGlow: (cx, cy, _inner, outer) => calls.push(['fillRadialGlow', cx, cy, outer]),
  };

  const sampleFeedbacks = [
    { sequence: 42, eventId: 'tactical:stabilize', consequence: { significance: 'turning_point', tags: ['containment'], signatureProfile: 'containment' } },
    { sequence: 43, eventId: 'tactical:probe', consequence: { significance: 'turning_point', tags: ['scan'], signatureProfile: 'scan' } },
    { sequence: 44, eventId: 'crisis:fracture', consequence: { significance: 'turning_point', tags: ['reality_damage'], signatureProfile: 'fracture' } },
    { sequence: 45, eventId: 'growth:urban', consequence: { significance: 'turning_point', tags: ['urban_growth'], signatureProfile: 'growth' } },
    { sequence: 46, eventId: 'identity:shift', consequence: { significance: 'turning_point', tags: ['religious_shift'], signatureProfile: 'identity' } },
    { sequence: 47, eventId: 'unrest:protest', consequence: { significance: 'turning_point', tags: ['civil_unrest'], signatureProfile: 'unrest' } },
  ];

  const settlements = [{ centerX: 1200, structures: [] }, { centerX: 2800, structures: [] }];
  const VIEWPORT_WIDTH = 900;
  const VIEWPORT_HEIGHT = 520;
  const WORLD_WIDTH = 3600;

  for (const feedback of sampleFeedbacks) {
    const profile = feedback.consequence.signatureProfile;
    // Test panning across a 3600px wide world
    for (const scroll of [0, 800, 1600, 2400]) {
      calls.length = 0;
      drawConsequenceImpact(surface, feedback, 100, 200, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, 0x00ff00, false, scroll, WORLD_WIDTH, settlements);
      assert.ok(calls.length > 0, `consequence impact profile '${profile}' must draw primitives`);
      assertFiniteGeometry(calls, `consequence profile '${profile}' scroll ${scroll}`);

      let visibleCount = 0;
      for (const [name, ...args] of calls) {
        let minX = Number.NaN, maxX = Number.NaN;
        if (name === 'line') {
          const [x1, , x2] = args;
          minX = Math.min(x1, x2);
          maxX = Math.max(x1, x2);
        } else if (name === 'strokeCircle' || name === 'fillCircle' || name === 'fillRadialGlow') {
          const [cx, , radius] = args;
          assert.ok(Number.isFinite(radius) && radius > 0, `profile '${profile}' scroll ${scroll}: ${name} radius=${radius} invalid`);
          minX = cx - radius;
          maxX = cx + radius;
        } else if (name === 'fillRect' || name === 'strokeRect') {
          const [x, , w] = args;
          minX = x;
          maxX = x + w;
        } else if (name === 'fillTriangle') {
          const [x1, , x2, , x3] = args;
          minX = Math.min(x1, x2, x3);
          maxX = Math.max(x1, x2, x3);
        }
        if (Number.isFinite(minX) && Number.isFinite(maxX)) {
          // Check each primitive stays near the viewport canvas boundary (within slack margin)
          assert.ok(minX >= -VIEWPORT_WIDTH * 0.5 && maxX <= VIEWPORT_WIDTH * 1.5, `profile '${profile}' scroll ${scroll}: ${name} extent [${minX}, ${maxX}] placed far outside viewport`);
          if (maxX >= 0 && minX <= VIEWPORT_WIDTH) {
            visibleCount++;
          }
        }
      }
      assert.ok(visibleCount > 0, `profile '${profile}' scroll ${scroll}: impact must have at least one visible primitive inside viewport [0, ${VIEWPORT_WIDTH}]`);
    }
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

test('haze coverage spans world start, middle, and far end on a broad stage-4 world', async () => {
  const { drawHazeBands } = await import('../dist/render/world.js');
  const { applyQualityToLiveSample, worldSnapshot } = await import('../dist/render/world-model.js');
  const { worldPresentation } = await import('../dist/render/world-presentation.js');

  const stage4Civ = developedCivilization(404);
  stage4Civ.development = 900;
  stage4Civ.era = 4;

  const snap = worldSnapshot(stage4Civ, 900);
  const pres = worldPresentation(stage4Civ);
  const worldWidth = snap.worldWidth;
  assert.ok(worldWidth >= 3200, 'stage-4 world must be broad');

  function recordHaze(snapshot, presentation, width, height, time, view, reducedMotion) {
    const hazeRects = [];
    const surface = {
      fillStyle: () => surface,
      lineStyle: () => surface,
      fillRect: (x, y, w, h) => hazeRects.push({ x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, w: Math.round(w * 100) / 100, h: Math.round(h * 100) / 100 }),
      line: () => surface,
      strokeCircle: () => surface,
      fillCircle: () => surface,
      strokeRect: () => surface,
      fillTriangle: () => surface,
      fillPoly: () => surface,
    };
    drawHazeBands(surface, snapshot, presentation, width, height, time, view, reducedMotion);
    return hazeRects;
  }

  // 1. World Start (scroll 0)
  const startRects = recordHaze(snap, pres, 900, 520, 1000, { from: 0, to: 900 }, false);
  assert.ok(startRects.length > 0, 'start of world must have visible haze bands');

  // 2. Middle (scroll worldWidth / 2)
  const midScroll = Math.floor((worldWidth - 900) / 2);
  const midRects = recordHaze(snap, pres, 900, 520, 1000, { from: midScroll, to: midScroll + 900 }, false);
  assert.ok(midRects.length > 0, 'middle of world must have visible haze bands');

  // 3. Far End (scroll worldWidth - 900)
  const endScroll = worldWidth - 900;
  const endRects = recordHaze(snap, pres, 900, 520, 1000, { from: endScroll, to: endScroll + 900 }, false);
  assert.ok(endRects.length > 0, 'far end of world must have visible haze bands');

  // 4. Tier 3 vs Tier 0 quality degradation
  const snapTier0 = applyQualityToLiveSample(snap, 0);
  const snapTier3 = applyQualityToLiveSample(snap, 3);
  const fullView = { from: 0, to: worldWidth };
  const tier0Rects = recordHaze(snapTier0, pres, worldWidth, 520, 1000, fullView, false);
  const tier3Rects = recordHaze(snapTier3, pres, worldWidth, 520, 1000, fullView, false);
  assert.ok(tier3Rects.length < tier0Rects.length, 'Tier 3 must render fewer haze bands than Tier 0');
  assert.ok(tier3Rects.length > 0, 'Tier 3 must still maintain haze coverage');

  // 5. Reduced Motion freezes movement while preserving coverage
  const rmRects1 = recordHaze(snap, pres, 900, 520, 1000, { from: 0, to: 900 }, true);
  const rmRects2 = recordHaze(snap, pres, 900, 520, 5000, { from: 0, to: 900 }, true);
  assert.ok(rmRects1.length > 0, 'Reduced motion must preserve haze coverage');
  assert.deepEqual(rmRects1, rmRects2, 'Reduced motion must freeze haze movement across animation time');
});

test('continuous terrain polygon ridgelines render deterministically without NaNs', async () => {
  const renderTerrainForSeed = async (seed, tag) => {
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
      const engine = { state: { phase: 'civilization', civilization: developedCivilization(seed) }, worldImpulse: null, onChange: () => () => {} };
      const { startWorldRenderer } = await import(`../dist/render/world.js?terrain-${tag}=${Date.now()}`);
      const controller = startWorldRenderer(engine, host);
      frame(100);
      controller.destroy();
    });
    return staticCalls;
  };

  const run1 = await renderTerrainForSeed(1234, 'seed1234-a');
  const run2 = await renderTerrainForSeed(1234, 'seed1234-b');
  const runOther = await renderTerrainForSeed(5678, 'seed5678');

  assert.ok(run1.length > 0, 'static layer must render terrain');
  assertFiniteGeometry(run1, 'terrain static layer');

  // Verify same seed produces identical drawing calls
  assert.deepEqual(run1, run2, 'identical seeds must produce identical terrain calls');

  // Verify different seed produces different drawing calls
  assert.notDeepEqual(run1, runOther, 'different seeds must produce different terrain calls');

  // Verify ridgelines are rendered using multi-vertex polygon path calls (> 3 lineTo calls between beginPath and closePath)
  let maxLineToInPoly = 0;
  let currentLineToCount = 0;
  let inPath = false;
  for (const [name] of run1) {
    if (name === 'beginPath') {
      inPath = true;
      currentLineToCount = 0;
    } else if (name === 'closePath') {
      if (inPath && currentLineToCount > maxLineToInPoly) {
        maxLineToInPoly = currentLineToCount;
      }
      inPath = false;
    } else if (inPath && name === 'lineTo') {
      currentLineToCount++;
    }
  }
  assert.ok(maxLineToInPoly > 3, `terrain polygon ridge must have > 3 lineTo calls per polygon, found max ${maxLineToInPoly}`);
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


test('haze covers a four-viewport world with no gap, however few bands the tier allows', async () => {
  // The coverage bug this pins: band width used to be a fixed 450 px whatever the world measured, so
  // a stage-4 world -- four viewports across -- carrying the two bands the lowest tier allows had
  // atmosphere over about a quarter of itself and bare sky over the rest.
  const { drawHazeBands } = await import('../dist/render/world.js');
  const { applyQualityToLiveSample, worldSnapshot } = await import('../dist/render/world-model.js');
  const { worldPresentation } = await import('../dist/render/world-presentation.js');

  const civ = developedCivilization(404);
  civ.development = 900;
  civ.era = 4;
  const snapshot = worldSnapshot(civ, 900);
  const presentation = worldPresentation(civ);
  const worldWidth = snapshot.worldWidth;
  assert.ok(worldWidth >= 3600, `stage-4 world was only ${worldWidth}px`);

  const coverage = (sample, time) => {
    const spans = [];
    const surface = new Proxy({}, { get: (_t, name) => (...args) => {
      if (name === 'fillRect') spans.push([args[0], args[0] + args[2]]);
      return surface;
    } });
    drawHazeBands(surface, sample, presentation, 900, 520, time, { from: 0, to: worldWidth }, false);
    spans.sort((a, b) => a[0] - b[0]);
    let covered = 0, widestGap = 0, cursor = 0;
    for (const [from, to] of spans) {
      const start = Math.max(cursor, Math.max(0, from));
      if (start > cursor) widestGap = Math.max(widestGap, start - cursor);
      if (to > cursor) { covered += Math.max(0, Math.min(worldWidth, to) - start); cursor = Math.min(worldWidth, to); }
    }
    if (cursor < worldWidth) widestGap = Math.max(widestGap, worldWidth - cursor);
    return { covered: covered / worldWidth, widestGap, bands: spans.length };
  };

  // Every tier, and several points in the drift cycle, so a band's wrap cannot hide a gap.
  for (const tier of [0, 1, 2, 3]) {
    const sample = applyQualityToLiveSample(snapshot, tier);
    for (const time of [0, 4000, 26000, 120000]) {
      const { covered, widestGap, bands } = coverage(sample, time);
      assert.ok(bands > 0, `tier ${tier} drew no haze at all`);
      assert.ok(covered > .9, `tier ${tier} at t=${time} covered only ${(covered * 100).toFixed(1)}% of the world`);
      assert.ok(widestGap < 500, `tier ${tier} at t=${time} left a ${Math.round(widestGap)}px hole in the atmosphere`);
    }
  }

  // The far end of a broad world is the section the old fixed width abandoned first.
  const farView = { from: worldWidth - 900, to: worldWidth };
  const farSpans = [];
  const farSurface = new Proxy({}, { get: (_t, name) => (...args) => { if (name === 'fillRect') farSpans.push(args[0]); return farSurface; } });
  drawHazeBands(farSurface, applyQualityToLiveSample(snapshot, 3), presentation, 900, 520, 9000, farView, false);
  assert.ok(farSpans.length > 0, 'the last viewport of the world must still have haze');
});

// One dynamic frame for a civilization, positioned in screen coordinates, with reduced motion on or
// off. Used to prove that reduced motion freezes the layer without emptying it.
async function dynamicFrameAt(seed, time, reducedMotion, tag) {
  const dynamicCalls = [];
  let frame = null;
  await withStubbedDom(() => {
    const contexts = [trackingContext([]), trackingContext([]), trackingContext(dynamicCalls)];
    let created = 0;
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    globalThis.matchMedia = query => ({ matches: reducedMotion && query.includes('reduced-motion'), addEventListener: () => {}, removeEventListener: () => {} });
    globalThis.document = { createElement: () => { const context = contexts[created++] ?? trackingContext([]); return { className: '', style: {}, width: 0, height: 0, getContext: () => context, addEventListener: () => {}, setPointerCapture: () => {}, setAttribute: () => {}, remove: () => {} }; } };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
    globalThis.cancelAnimationFrame = () => {};
  }, async () => {
    const host = { appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: 900, height: 520 }) };
    const engine = { state: { phase: 'civilization', civilization: developedCivilization(seed) }, worldImpulse: null, onChange: () => () => {} };
    const { startWorldRenderer } = await import(`../dist/render/world.js?${tag}=${Date.now()}`);
    const controller = startWorldRenderer(engine, host);
    frame(100);
    dynamicCalls.length = 0;
    frame(time);
    controller.destroy();
  });
  return dynamicCalls;
}

test('reduced motion freezes the animated layer without dropping any of it', async () => {
  const early = await dynamicFrameAt(2121, 4000, true, 'rm-a');
  const later = await dynamicFrameAt(2121, 40000, true, 'rm-b');
  assert.ok(early.length > 100, `a reduced-motion frame drew only ${early.length} primitives`);
  assert.deepEqual(early, later, 'reduced motion must not move anything as time passes');

  // And the same world with motion allowed is not frozen -- otherwise the assertion above would
  // pass for a renderer that had simply stopped drawing.
  const moving = await dynamicFrameAt(2121, 40000, false, 'rm-c');
  assert.notDeepEqual(await dynamicFrameAt(2121, 4000, false, 'rm-d'), moving, 'the animated layer must animate');
  assert.ok(moving.length > 100);
});

test('the animated layer is a pure function of the world and the clock', async () => {
  const first = await dynamicFrameAt(3131, 5000, false, 'det-a');
  const second = await dynamicFrameAt(3131, 5000, false, 'det-b');
  assert.deepEqual(first, second, 'the same world at the same time must draw the same frame');
  const other = await dynamicFrameAt(3132, 5000, false, 'det-c');
  assert.notDeepEqual(first, other, 'a different seed must draw a different world');
});


test('a strip redraw paints a settlement glow that reaches in from outside its own footprint', async () => {
  // The bug this pins: the settlement loop culled by the footprint *before* checking the glow, and a
  // tall settlement's light spill reaches tens of pixels past its own radius. A narrow strip whose
  // band the glow overlaps but the footprint does not therefore dropped the glow, while a full redraw
  // of the same slice painted it -- so the cached scenery layer disagreed with a full repaint until
  // the next invalidation. Every settlement in this fixture has that gap, so the scenario is not
  // hypothetical; it just never fell inside the windows the other equivalence tests compare.
  const { worldSnapshot } = await import('../dist/render/world-model.js');
  const { settlementLayout } = await import('../dist/render/settlements.js');
  const { settlementCrown } = await import('../dist/render/structures.js');
  const { SPILL_MAX_RADIUS, SPILL_MIN_RADIUS, SPILL_CROWN_FACTOR, GROUND_RATIO, SCENERY_SLACK } = await import('../dist/render/world.js');

  const WIDTH = 900, HEIGHT = 520, SEED = 404, NUDGE = 12;
  const civ = developedCivilization(SEED);
  const snapshot = worldSnapshot(civ, WIDTH);
  const settlements = settlementLayout(civ, snapshot.worldWidth, HEIGHT, snapshot);
  const ground = HEIGHT * GROUND_RATIO;

  // Pick the settlement whose glow overhangs its footprint by the most, and place the viewport so
  // that overhang is the only thing reaching the exposed strip.
  const reach = settlements.map(settlement => {
    const crown = settlementCrown(settlement, ground);
    const spill = Math.min(SPILL_MAX_RADIUS, Math.max(SPILL_MIN_RADIUS, crown * SPILL_CROWN_FACTOR));
    return { settlement, spill, overhang: spill - settlement.radius };
  }).sort((a, b) => b.overhang - a.overhang)[0];
  assert.ok(reach.overhang > SCENERY_SLACK, `no settlement's glow overhangs its footprint (best ${reach.overhang.toFixed(0)}px)`);

  // Screen x of the settlement centre must put its footprint clear of the strip band (the window plus
  // the band's own slack) while the glow still reaches into the window.
  const target = WIDTH + SCENERY_SLACK + reach.settlement.radius + (reach.overhang - SCENERY_SLACK) * 0.5;
  const scroll = Math.round(Math.max(NUDGE, Math.min(snapshot.worldWidth - WIDTH, reach.settlement.centerX - target)));
  const onScreen = reach.settlement.centerX - scroll;
  assert.ok(onScreen - reach.settlement.radius > WIDTH + SCENERY_SLACK,
    `the footprint still reaches the strip band: left edge at ${(onScreen - reach.settlement.radius).toFixed(0)}`);
  assert.ok(onScreen - reach.spill <= WIDTH,
    `the glow does not reach the viewport: left edge at ${(onScreen - reach.spill).toFixed(0)}`);

  const viaStrip = await sceneryAfterDrags(SEED, [scroll - NUDGE, NUDGE], 'glow-strip');
  const viaFull = await sceneryAfterDrags(SEED, [scroll], 'glow-reference');
  const lip = WIDTH - NUDGE;
  const exposed = calls => calls
    .filter(call => call.to >= lip && call.from <= WIDTH)
    .map(call => ({ name: call.name, from: Math.max(lip, call.from), to: Math.min(WIDTH, call.to) }));

  assert.ok(exposed(viaFull).length > 0, 'the reference redraw must paint something in the window');
  assert.deepEqual(exposed(viaStrip), exposed(viaFull),
    'the strip redraw dropped geometry reaching in from a settlement whose footprint sits outside the strip');
});


const LAYER_HEIGHT = 520;

/**
 * Records one layer's primitives *with their styles*, which `bucketsForCivilization` deliberately
 * does not: `trackingContext` answers "where was this drawn", and some invariants need "and in what
 * colour". The renderer creates its three canvases in painting order, so layer 0 is sky and terrain,
 * 1 the settlements and 2 the animated one.
 */
async function layerCalls(civ, tag, layerIndex = 0, scroll = 0) {
  const calls = [];
  let frame = null;
  await withStubbedDom(() => {
    let created = 0;
    globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
    globalThis.document = { createElement: () => { const target = created++ === layerIndex ? calls : [];
      return { className: '', style: {}, width: 0, height: 0, getContext: () => recordingContext(target), addEventListener: () => {}, setPointerCapture: () => {}, setAttribute: () => {}, remove: () => {} }; } };
    globalThis.ResizeObserver = class { observe() {} disconnect() {} };
    globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
    globalThis.cancelAnimationFrame = () => {};
  }, async () => {
    const host = { appendChild: () => {}, replaceChildren: () => {}, getBoundingClientRect: () => ({ width: 900, height: LAYER_HEIGHT }) };
    const engine = { state: { phase: 'civilization', civilization: civ }, worldImpulse: null, onChange: () => () => {} };
    const { startWorldRenderer } = await import(`../dist/render/world.js?layer-${tag}=${Date.now()}`);
    const controller = startWorldRenderer(engine, host);
    frame(100);
    if (scroll > 0) { controller.nudge(1); calls.length = 0; frame(200); }
    controller.destroy();
  });
  return calls;
}

/** The sky-and-terrain layer, which is the one most of these invariants are about. */
const staticLayerCalls = (civ, tag, scroll = 0) => layerCalls(civ, tag, 0, scroll);

test('a parallax layer only anchors world geometry inside the slice it can reach', async () => {
  const { layerReach, SKY_PARALLAX, TERRAIN_PARALLAX } = await import('../dist/render/world.js');
  const { worldSnapshot } = await import('../dist/render/world-model.js');
  const WIDTH = 900;
  const snapshot = worldSnapshot(developedCivilization(404), WIDTH);
  // The bug this pins: the sky is drawn under a tenth of the scroll, so it never exposes more than a
  // third of a stage-4 world -- and anything placed across the whole world width, as the celestial
  // body and the observer's light field once were, simply is not there to be seen.
  const skyReach = layerReach(snapshot.worldWidth, WIDTH, SKY_PARALLAX);
  assert.ok(skyReach < snapshot.worldWidth * .5, 'the sky must reach far less of the world than the settlements do');
  assert.ok(skyReach >= WIDTH, 'a layer always reaches at least one viewport');
  assert.ok(layerReach(snapshot.worldWidth, WIDTH, TERRAIN_PARALLAX) > skyReach, 'a nearer layer must reach further');
  assert.equal(layerReach(WIDTH, WIDTH, SKY_PARALLAX), WIDTH, 'a world one viewport wide has one viewport of reach');
});

test('the observer light field is actually drawn when Attention is high', async () => {
  // High Attention is a state the player has to be able to read off the sky. Anchored across the
  // whole world it was never once visible; the invariant is that raising it adds work to the sky.
  const watched = developedCivilization(404);
  watched.stats.attention = 92;
  const unwatched = developedCivilization(404);
  unwatched.stats.attention = 8;
  const withObserver = await staticLayerCalls(watched, 'observer-on');
  const withoutObserver = await staticLayerCalls(unwatched, 'observer-off');
  const arcs = calls => calls.filter(([name]) => name === 'arc').length;
  assert.ok(arcs(withObserver) > arcs(withoutObserver),
    `an observed world drew ${arcs(withObserver)} sky arcs, an unobserved one ${arcs(withoutObserver)}`);
  assertFiniteGeometry(withObserver, 'static/observer');
});

test('entropy is written into the terrain, not only into the palette', async () => {
  const failing = developedCivilization(404);
  failing.tactical.entropy = 95;
  const stable = developedCivilization(404);
  stable.tactical.entropy = 4;
  const emberOf = async (civ, tag) => {
    const { worldPresentation } = await import('../dist/render/world-presentation.js');
    const ember = worldPresentation(civ).colors.ember;
    const prefix = `rgba(${ember >> 16 & 0xff},${ember >> 8 & 0xff},${ember & 0xff},`;
    const calls = await staticLayerCalls(civ, tag);
    return calls.filter(([name, value]) => name === 'strokeStyle' && typeof value === 'string' && value.startsWith(prefix)).length;
  };
  assert.ok(await emberOf(failing, 'entropy-high') > 0, 'a failing world must split its own land open');
  assert.equal(await emberOf(stable, 'entropy-low'), 0, 'a stable world must not be cracked');
});

test('the cached sky and terrain are a pure function of the world', async () => {
  const first = await staticLayerCalls(developedCivilization(717), 'sky-det-a');
  const second = await staticLayerCalls(developedCivilization(717), 'sky-det-b');
  assert.ok(first.length > 40, `the static layer drew only ${first.length} primitives`);
  assert.deepEqual(first, second, 'the same world must paint the same sky and terrain');
  assert.notDeepEqual(first, await staticLayerCalls(developedCivilization(718), 'sky-det-c'), 'a different seed must paint a different world');
});

test('fillEllipseGlow flattens the light without moving it sideways', async () => {
  const { CachedCanvasSurface } = await import('../dist/render/draw-surface.js');
  const record = [];
  const gradient = { addColorStop: (offset, color) => record.push(['stop', offset, color]) };
  const context = {
    set fillStyle(value) { record.push(['fillStyle', value === gradient ? 'gradient' : value]); },
    createRadialGradient: (...args) => { record.push(['createRadialGradient', ...args]); return gradient; },
    transform: (...args) => record.push(['transform', ...args]),
    save: () => record.push(['save']),
    restore: () => record.push(['restore']),
    beginPath: () => {}, arc: (...args) => record.push(['arc', ...args]), fill: () => record.push(['fill']),
  };
  const surface = new CachedCanvasSurface(context, (value, alpha = 1) => `rgba(${value},${alpha})`);
  surface.fillEllipseGlow(200, 100, 80, 20, [{ offset: 0, color: 0xffffff, alpha: .5 }, { offset: 1, color: 0xffffff, alpha: 0 }]);

  const arc = record.find(([name]) => name === 'arc');
  assert.ok(arc, 'the glow must paint');
  // The squash is vertical only, so the horizontal extent is exactly the radius the caller culled by.
  assert.deepEqual([arc[1], arc[3]], [200, 80], 'the glow must keep its centre and its horizontal radius');
  const squash = record.find(([name]) => name === 'transform');
  assert.deepEqual(squash, ['transform', 1, 0, 0, .25, 0, 75], 'the squash must scale y about the centre and leave x alone');
  assert.ok(record.indexOf(squash) > record.findIndex(([name]) => name === 'save'), 'the squash must be inside a save');
  assert.equal(record[record.length - 1][0], 'restore', 'the squash must not outlive the call');
  for (const [, ...args] of record) for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value));
});

test('a context that cannot squash still gets the light, as a circle', async () => {
  const { CachedCanvasSurface } = await import('../dist/render/draw-surface.js');
  const record = [];
  const surface = new CachedCanvasSurface({
    set fillStyle(value) {}, beginPath: () => {}, arc: (...args) => record.push(args), fill: () => {},
  }, () => 'rgba(0,0,0,1)');
  surface.fillEllipseGlow(200, 100, 80, 20, [{ offset: 0, color: 0xffffff, alpha: .5 }]);
  assert.equal(record.length, 1, 'the fallback must still paint exactly one light');
  assert.deepEqual(record[0].slice(0, 3), [200, 100, 80], 'the fallback keeps the horizontal radius');
});

test('the cached sky and terrain stay cheap enough to repaint on every scrolled pixel', async () => {
  // The whole reason sky and terrain are simply repainted rather than blitted is that they are
  // small. Clouds, a distant skyline, ground shelves and entropy fissures all live here now, and
  // each of them is bounded by a count -- so the layer as a whole has to stay bounded too.
  const busiest = developedCivilization(404);
  busiest.era = 4;
  busiest.development = 1600;
  busiest.stats.attention = 95;
  busiest.stats.awareness = 95;
  busiest.tactical.entropy = 95;
  for (const scroll of [0, 1]) {
    const calls = await staticLayerCalls(busiest, `static-budget-${scroll}`, scroll);
    assert.ok(calls.length > 60, `the static layer drew only ${calls.length} primitives`);
    assert.ok(calls.length < 900, `the static layer drew ${calls.length} primitives, over its budget`);
    assertFiniteGeometry(calls, `static/budget-${scroll}`);
  }
});

test('a cue keeps its place when the count around it changes', async () => {
  const { spreadPosition } = await import('../dist/render/primitives.js');
  const SPAN = 3600, OFFSET = .37;
  const at = count => Array.from({ length: count }, (_, i) => spreadPosition(SPAN, i, OFFSET));

  // The bug this pins: fractures and beacons are laid out on the dynamic layer and their counts
  // follow Stability, Entropy and Awareness, so a count changes while the player is watching. A
  // lattice sized by the count moved every existing mark the moment one more appeared -- two
  // fractures at the quarters of the world jumped to the sixths as the third arrived.
  for (const count of [2, 3, 4, 7, 12]) {
    assert.deepEqual(at(count), at(12).slice(0, count), `the first ${count} marks must not move when there are 12`);
  }

  // And it still has to spread: every prefix covers the world rather than clustering in one corner.
  for (const count of [2, 3, 5, 8, 12]) {
    const sorted = at(count).slice().sort((a, b) => a - b);
    const gaps = sorted.map((value, index) => (index === 0 ? value + SPAN - sorted[sorted.length - 1] : value - sorted[index - 1]));
    assert.ok(Math.max(...gaps) <= SPAN * (1.6 / count), `${count} marks left a ${Math.round(Math.max(...gaps))}px gap in a ${SPAN}px world`);
    for (const value of sorted) assert.ok(value >= 0 && value < SPAN, 'a mark must stay inside the world');
  }
});

test('fractures stay put as Stability ticks another one into existence', async () => {
  // Read off the animated layer the renderer actually paints, never by recomputing the placement the
  // renderer uses: a test that calls `spreadPosition` itself passes whatever `drawAnomalies` does,
  // including drawing no fractures at all.
  const { GROUND_RATIO } = await import('../dist/render/world.js');
  const { worldSnapshot } = await import('../dist/render/world-model.js');
  // A fracture's mouth is the one circle in the world filled in the fracture red and sitting on the
  // ground line; the strain lines that share its colour only ever stroke.
  const FRACTURE_FILL = 'rgba(238,105,115,';
  const mouthY = LAYER_HEIGHT * GROUND_RATIO + 3;

  const drawnAt = async (stability, tag) => {
    const civ = developedCivilization(404);
    civ.stats.stability = stability;
    civ.tactical.entropy = 0;
    const calls = await layerCalls(civ, tag, 2);
    const mouths = [];
    let fill = '';
    for (const [name, ...args] of calls) {
      if (name === 'fillStyle') fill = String(args[0]);
      else if (name === 'arc' && fill.startsWith(FRACTURE_FILL) && Math.abs(args[1] - mouthY) < 1) mouths.push(args[0]);
    }
    return { count: worldSnapshot(civ, 900).fractureCount, mouths };
  };

  const fewer = await drawnAt(45, 'fracture-fewer');
  const more = await drawnAt(15, 'fracture-more');
  assert.ok(more.count > fewer.count, `lower Stability must open more fractures (${fewer.count} then ${more.count})`);
  assert.ok(fewer.mouths.length > 0, 'the renderer must actually paint the fractures it counts');
  assert.ok(more.mouths.length > fewer.mouths.length, `more fractures must reach the viewport (${fewer.mouths.length} then ${more.mouths.length})`);
  for (const mouth of fewer.mouths) {
    assert.ok(more.mouths.some(other => Math.abs(other - mouth) < 1e-6),
      `the fracture at ${mouth.toFixed(1)} moved when another one opened; now ${more.mouths.map(v => v.toFixed(1)).join(', ')}`);
  }
});

test('the cached entropy cues are gated on the band the scene is keyed on', async () => {
  // The bug this pins: `structuralWorldKey` rebuilds the cached layers on the entropy *band*, so a
  // threshold sitting inside a band -- 45, or 55 -- is crossed with nothing keying on the crossing,
  // and the cue stays absent until an unrelated rebuild wanders past.
  const { worldPresentation } = await import('../dist/render/world-presentation.js');
  const emberStrokes = async (entropy, tag) => {
    const civ = developedCivilization(404);
    civ.tactical.entropy = entropy;
    const ember = worldPresentation(civ).colors.ember;
    const prefix = `rgba(${ember >> 16 & 0xff},${ember >> 8 & 0xff},${ember & 0xff},`;
    const calls = await staticLayerCalls(civ, tag);
    return calls.filter(([name, value]) => name === 'strokeStyle' && typeof value === 'string' && value.startsWith(prefix)).length;
  };
  const quiet = await emberStrokes(30, 'band-1');
  const cracked = await emberStrokes(60, 'band-2');
  const torn = await emberStrokes(90, 'band-3');
  assert.equal(quiet, 0, 'below the second band the land must be whole');
  assert.ok(cracked > 0, 'the second band must crack the land');
  assert.ok(torn > cracked, 'the top band must shear the ridgeline as well as crack the land');

  // And the cue must not depend on anything finer than the band, or it changes without a rebuild.
  for (const [low, high, band] of [[50, 74, 'second'], [75, 99, 'top']]) {
    assert.equal(await emberStrokes(low, `flat-${low}`), await emberStrokes(high, `flat-${high}`),
      `the ${band} band must draw the same land at ${low} and at ${high}`);
  }
});
