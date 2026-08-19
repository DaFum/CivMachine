# Civilization Visualization Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Civilization world view show *what* it contains — species inhabitants, typed era-gated structures, faction banners, settlement classes, road and air traffic, animated construction — instead of only how many rectangles it has and what color they are.

**Architecture:** Eight new pure modules under `public/game/src/render/` carry all derivation and drawing. A `DrawSurface` adapter interface lets every new drawing routine be written once and execute identically on Phaser `Graphics` and `CanvasRenderingContext2D`, which removes the existing duplication between the two backends. `world.ts` keeps only renderer lifecycle, camera, layer composition, and the frame loop. Nothing is added to `GameState`; species and factions are derived views of `civ.traits` and `civ.pathState.affinity`.

**Tech Stack:** TypeScript 6.x compiled by `tsc` with `moduleResolution: Node16` (no bundler), Phaser 3 (vendored, optional), Canvas 2D fallback, `node:test` + `node:assert/strict`.

## Global Constraints

- **Relative imports MUST carry the `.js` extension** (`./primitives.js`) even from `.ts` files. `moduleResolution: Node16` fails the build otherwise (`TS2835`).
- **`public/game/dist/` is what the browser loads and is committed to git.** Editing `src/**` changes nothing until `tsc -p public/game/tsconfig.json` runs. `npm test` runs it first.
- **No `GameState` shape change and no `SAVE_VERSION` bump.** Species and factions are derived, never stored.
- **No external art assets.** All visuals are procedural so the offline Canvas fallback keeps parity.
- **No hand-edits to `public/game/src/data/content.generated.ts`.** It is a frozen catalog.
- **Game code style is deliberately dense** — multiple statements per line, minimal whitespace. Match the surrounding file; do not reformat existing code.
- **Player-facing game copy is English.** (The Next shell's German strings are out of scope.)
- **Invariant 1:** per-frame work stays cheap — no `localStorage` writes per frame, no rebuilding interactive controls per frame.
- **Invariant 2:** `structuralWorldKey` must change on meaningful state *bands* and interventions, never on continuously ticking numbers.
- **Agent budget ceiling is fixed at 120 total** — pedestrians 60, vehicles 34, aircraft 14, orbital 8, launches 4.
- **Tests live in `public/game/tests/*.test.mjs` and import from `../dist/…`,** never from `../src/…`.
- Run `npm test` from the repo root (`C:\Users\andre.oswald\Code\CivMachine`).

## Deviation from the spec

The spec lists seven new modules. This plan creates **eight**: it adds `render/primitives.ts` to hold `hash01`, `mixColor`, `PATH_ACCENTS`, `pathAccentFor`, and `FACTION_SIGILS`. Without it, `species.ts` and `world-presentation.ts` would both need the path accent table, and `world-presentation.ts` already imports `species.ts` for the structural key — a circular import. `primitives.ts` has no render-layer dependencies and breaks the cycle. The service-worker asset list in Task 12 accounts for eight files.

## File structure

| File | Responsibility | Task |
| --- | --- | --- |
| `public/game/src/render/primitives.ts` | **Create.** Deterministic hash, color mixing, path accent + sigil tables. No render deps. | 1 |
| `public/game/src/render/draw-surface.ts` | **Create.** `DrawSurface` interface, `phaserSurface`, `canvasSurface`. | 2 |
| `public/game/src/render/species.ts` | **Create.** `speciesProfile`, `casteFor`, `drawCreature`. | 3 |
| `public/game/src/render/factions.ts` | **Create.** `factionRoster`, `factionSignature`. | 4 |
| `public/game/src/render/world-model.ts` | **Modify.** Add `agentBudget`, `settlementCount`. | 5 |
| `public/game/src/render/settlements.ts` | **Create.** `settlementSizes`, `settlementClassFor`, `settlementClassSignature`, `settlementLayout`. | 6 |
| `public/game/src/render/structures.ts` | **Create.** `structureKindsForEra`, `drawStructure`, `drawBanner`. | 7 |
| `public/game/src/render/agents.ts` | **Create.** `agentPlan`. | 8 |
| `public/game/src/render/construction.ts` | **Create.** `ConstructionTracker`. | 9 |
| `public/game/src/render/world-presentation.ts` | **Modify.** Use `primitives`, extend `structuralWorldKey`. | 10 |
| `public/game/src/render/world.ts` | **Modify.** Migrate to `DrawSurface`, wire in every new module, drop `buildingLayout`. | 11 |
| `public/sw.js` | **Modify.** Add eight dist paths, bump `CACHE_NAME`. | 12 |
| `public/game/tests/presentation.test.mjs` | **Modify.** New assertions in Tasks 1–10. | 1–10 |

Dependency direction (acyclic): `primitives → {draw-surface, species, factions, settlements, structures, agents, world-presentation}`, `world-model → {settlements, agents, world-presentation}`, `factions → {settlements, structures, world-presentation}`, `species → {structures, world-presentation, world}`, `settlements → {agents, construction, world-presentation, world}`.

---

### Task 1: Shared render primitives

**Files:**
- Create: `public/game/src/render/primitives.ts`
- Test: `public/game/tests/presentation.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `hash01(n: number): number`, `mixColor(from: number, to: number, amount: number): number`, `PATH_ACCENTS: Record<string, number>`, `DEFAULT_ACCENT: number`, `pathAccentFor(pathId: string): number`, `FACTION_SIGILS: Record<string, FactionSigil>`, `type FactionSigil`.

- [ ] **Step 1: Write the failing test**

Append to `public/game/tests/presentation.test.mjs`:

```javascript
test('render primitives are deterministic and cover every path', () => {
  assert.equal(hash01(42), hash01(42));
  assert.ok(hash01(42) >= 0 && hash01(42) < 1);
  assert.notEqual(hash01(42), hash01(43));
  assert.equal(mixColor(0x000000, 0xffffff, 0), 0x000000);
  assert.equal(mixColor(0x000000, 0xffffff, 1), 0xffffff);
  assert.equal(mixColor(0x000000, 0xffffff, .5), 0x808080);
  assert.equal(mixColor(0x000000, 0xffffff, 5), 0xffffff, 'amount is clamped');
  assert.equal(pathAccentFor('machine_faith'), 0xf0ca6f);
  assert.equal(pathAccentFor(''), DEFAULT_ACCENT);
  assert.equal(pathAccentFor('not_a_path'), DEFAULT_ACCENT);
  for (const id of PATH_IDS) {
    assert.ok(id in PATH_ACCENTS, `${id} needs an accent color`);
    assert.ok(id in FACTION_SIGILS, `${id} needs a sigil`);
  }
});
```

Add these imports to the top of the file, below the existing imports:

```javascript
import { PATH_IDS } from '../dist/game/paths.js';
import { hash01, mixColor, PATH_ACCENTS, DEFAULT_ACCENT, pathAccentFor, FACTION_SIGILS } from '../dist/render/primitives.js';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../dist/render/primitives.js'`.

- [ ] **Step 3: Write the implementation**

Create `public/game/src/render/primitives.ts`:

```typescript
export type FactionSigil = 'spire' | 'node' | 'ring' | 'prism' | 'spiral' | 'chevron' | 'grid' | 'halo' | 'void' | 'nest';

export const DEFAULT_ACCENT = 0x6fe7e1;

export const PATH_ACCENTS: Record<string, number> = {
  machine_faith: 0xf0ca6f,
  collective_mind: 0x77e3ff,
  temporal_dominion: 0xffa45f,
  reality_engineering: 0x68f0c5,
  biological_transcendence: 0x8ee66b,
  cosmic_resistance: 0xff6b7f,
  bureaucratic_singularity: 0xe3b76f,
  post_mortal_civilization: 0xdca4ff,
  void_communion: 0xa86cf0,
  recursive_simulation: 0x5ce1e6,
};

export const FACTION_SIGILS: Record<string, FactionSigil> = {
  machine_faith: 'spire',
  collective_mind: 'node',
  temporal_dominion: 'ring',
  reality_engineering: 'prism',
  biological_transcendence: 'nest',
  cosmic_resistance: 'chevron',
  bureaucratic_singularity: 'grid',
  post_mortal_civilization: 'halo',
  void_communion: 'void',
  recursive_simulation: 'spiral',
};

export function pathAccentFor(pathId: string): number { return PATH_ACCENTS[pathId] ?? DEFAULT_ACCENT; }

export function hash01(n: number): number {
  const value = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function mixColor(from: number, to: number, amount: number): number {
  const t = Math.max(0, Math.min(1, amount));
  const channel = (shift: number): number => Math.round(((from >> shift) & 0xff) * (1 - t) + ((to >> shift) & 0xff) * t);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS, all previously passing tests still green.

- [ ] **Step 5: Commit**

```bash
git add public/game/src/render/primitives.ts public/game/dist/render/primitives.js public/game/tests/presentation.test.mjs
git commit -m "feat(render): add shared render primitives"
```

---

### Task 2: DrawSurface adapters

**Files:**
- Create: `public/game/src/render/draw-surface.ts`
- Test: `public/game/tests/presentation.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `interface DrawSurface`, `phaserSurface(graphics: any): DrawSurface`, `canvasSurface(context: any, toColor: (value: number, alpha?: number) => string): DrawSurface`.

`DrawSurface` is deliberately modelled on Phaser's `Graphics` API so `phaserSurface` is a thin pass-through. Every method returns the surface so calls chain like the existing Phaser code does.

- [ ] **Step 1: Write the failing test**

Append to `public/game/tests/presentation.test.mjs`:

```javascript
test('draw surface adapters emit the same primitive sequence on both backends', () => {
  const phaserCalls = [];
  const graphics = new Proxy({}, { get: (_t, name) => (...args) => { phaserCalls.push([name, ...args]); } });
  phaserSurface(graphics).fillStyle(0x112233, .5).fillRect(1, 2, 3, 4).line(5, 6, 7, 8).fillCircle(9, 10, 11);
  assert.deepEqual(phaserCalls, [
    ['fillStyle', 0x112233, .5],
    ['fillRect', 1, 2, 3, 4],
    ['lineBetween', 5, 6, 7, 8],
    ['fillCircle', 9, 10, 11],
  ]);

  const canvasCalls = [];
  const context = {
    set fillStyle(value) { canvasCalls.push(['fillStyle', value]); },
    set strokeStyle(value) { canvasCalls.push(['strokeStyle', value]); },
    set lineWidth(value) { canvasCalls.push(['lineWidth', value]); },
    fillRect: (...args) => canvasCalls.push(['fillRect', ...args]),
    beginPath: () => canvasCalls.push(['beginPath']),
    moveTo: (...args) => canvasCalls.push(['moveTo', ...args]),
    lineTo: (...args) => canvasCalls.push(['lineTo', ...args]),
    arc: (...args) => canvasCalls.push(['arc', ...args]),
    fill: () => canvasCalls.push(['fill']),
    stroke: () => canvasCalls.push(['stroke']),
    closePath: () => canvasCalls.push(['closePath']),
  };
  const toColor = (value, alpha = 1) => `#${value.toString(16)}@${alpha}`;
  canvasSurface(context, toColor).fillStyle(0x112233, .5).fillRect(1, 2, 3, 4).line(5, 6, 7, 8);
  assert.deepEqual(canvasCalls, [
    ['fillStyle', '#112233@0.5'],
    ['fillRect', 1, 2, 3, 4],
    ['beginPath'], ['moveTo', 5, 6], ['lineTo', 7, 8], ['stroke'],
  ]);
});

test('canvas surface never emits a negative radius', () => {
  const radii = [];
  const context = {
    set fillStyle(_v) {}, set strokeStyle(_v) {}, set lineWidth(_v) {},
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, stroke() {}, fillRect() {},
    arc: (_x, _y, r) => radii.push(r),
  };
  canvasSurface(context, () => '#000').fillCircle(0, 0, -5).strokeCircle(0, 0, -1);
  assert.deepEqual(radii, [0, 0]);
});
```

Add to the imports:

```javascript
import { phaserSurface, canvasSurface } from '../dist/render/draw-surface.js';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../dist/render/draw-surface.js'`.

- [ ] **Step 3: Write the implementation**

Create `public/game/src/render/draw-surface.ts`:

```typescript
export interface DrawSurface {
  fillStyle(color: number, alpha?: number): DrawSurface;
  lineStyle(width: number, color: number, alpha?: number): DrawSurface;
  fillRect(x: number, y: number, width: number, height: number): DrawSurface;
  strokeRect(x: number, y: number, width: number, height: number): DrawSurface;
  fillCircle(x: number, y: number, radius: number): DrawSurface;
  strokeCircle(x: number, y: number, radius: number): DrawSurface;
  fillTriangle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): DrawSurface;
  line(x1: number, y1: number, x2: number, y2: number): DrawSurface;
  fillPoly(points: ReadonlyArray<readonly [number, number]>): DrawSurface;
}

export function phaserSurface(graphics: any): DrawSurface {
  const surface: DrawSurface = {
    fillStyle(color, alpha = 1) { graphics.fillStyle(color, alpha); return surface; },
    lineStyle(width, color, alpha = 1) { graphics.lineStyle(width, color, alpha); return surface; },
    fillRect(x, y, width, height) { graphics.fillRect(x, y, width, height); return surface; },
    strokeRect(x, y, width, height) { graphics.strokeRect(x, y, width, height); return surface; },
    fillCircle(x, y, radius) { graphics.fillCircle(x, y, Math.max(0, radius)); return surface; },
    strokeCircle(x, y, radius) { graphics.strokeCircle(x, y, Math.max(0, radius)); return surface; },
    fillTriangle(ax, ay, bx, by, cx, cy) { graphics.fillTriangle(ax, ay, bx, by, cx, cy); return surface; },
    line(x1, y1, x2, y2) { graphics.lineBetween(x1, y1, x2, y2); return surface; },
    fillPoly(points) { graphics.fillPoints(points.map(([x, y]) => ({ x, y })), true, true); return surface; },
  };
  return surface;
}

export function canvasSurface(context: any, toColor: (value: number, alpha?: number) => string): DrawSurface {
  const surface: DrawSurface = {
    fillStyle(color, alpha = 1) { context.fillStyle = toColor(color, alpha); return surface; },
    lineStyle(width, color, alpha = 1) { context.lineWidth = width; context.strokeStyle = toColor(color, alpha); return surface; },
    fillRect(x, y, width, height) { context.fillRect(x, y, width, height); return surface; },
    strokeRect(x, y, width, height) { context.beginPath(); context.moveTo(x, y); context.lineTo(x + width, y); context.lineTo(x + width, y + height); context.lineTo(x, y + height); context.closePath(); context.stroke(); return surface; },
    fillCircle(x, y, radius) { context.beginPath(); context.arc(x, y, Math.max(0, radius), 0, Math.PI * 2); context.fill(); return surface; },
    strokeCircle(x, y, radius) { context.beginPath(); context.arc(x, y, Math.max(0, radius), 0, Math.PI * 2); context.stroke(); return surface; },
    fillTriangle(ax, ay, bx, by, cx, cy) { context.beginPath(); context.moveTo(ax, ay); context.lineTo(bx, by); context.lineTo(cx, cy); context.closePath(); context.fill(); return surface; },
    line(x1, y1, x2, y2) { context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke(); return surface; },
    fillPoly(points) {
      if (!points.length) return surface;
      context.beginPath(); context.moveTo(points[0]![0], points[0]![1]);
      for (let i = 1; i < points.length; i++) context.lineTo(points[i]![0], points[i]![1]);
      context.closePath(); context.fill(); return surface;
    },
  };
  return surface;
}
```

Note: `strokeRect` is expanded into an explicit path on the Canvas side rather than calling `context.strokeRect`, so a caller's `lineStyle` alpha and width apply identically on both backends.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/game/src/render/draw-surface.ts public/game/dist/render/draw-surface.js public/game/tests/presentation.test.mjs
git commit -m "feat(render): add DrawSurface adapters for Phaser and Canvas"
```

---

### Task 3: Species profiles and creature drawing

**Files:**
- Create: `public/game/src/render/species.ts`
- Test: `public/game/tests/presentation.test.mjs`

**Interfaces:**
- Consumes: `hash01`, `mixColor`, `pathAccentFor` from `./primitives.js`; `DrawSurface` from `./draw-surface.js`.
- Produces: `type SpeciesArchetype`, `type SpeciesFeature`, `type Caste`, `interface SpeciesProfile { id: string; archetype: SpeciesArchetype; limbs: number; heightRatio: number; bodyColor: number; glow: number; gaitPeriod: number; features: SpeciesFeature[] }`, `speciesProfile(civ: Civilization): SpeciesProfile`, `casteFor(settlementClass: string): Caste`, `drawCreature(surface: DrawSurface, profile: SpeciesProfile, caste: Caste, x: number, groundY: number, scale: number, phase: number, accent: number): void`.

`casteFor` takes a plain `string` rather than `SettlementClass` so `species.ts` does not have to import `settlements.ts` (which would create a cycle through `factions.ts`).

- [ ] **Step 1: Write the failing test**

Append to `public/game/tests/presentation.test.mjs`:

```javascript
test('species profile is deterministic and independent of trait order', () => {
  const a = GameEngine.createCivilizationForTest(11);
  a.traits.push('chronically_lucky', 'fungal_consensus', 'museum_planet');
  const b = GameEngine.createCivilizationForTest(11);
  b.traits.push('museum_planet', 'fungal_consensus', 'chronically_lucky');
  assert.equal(speciesProfile(a).archetype, 'mycelic');
  assert.deepEqual(speciesProfile(a), speciesProfile(b));
  assert.deepEqual(speciesProfile(a), speciesProfile(a));
});

test('species archetype follows the trait priority table', () => {
  const cases = [
    ['fungal_consensus', 'mycelic'], ['liquid_mathematics', 'fluidic'], ['telepathic_species', 'cerebral'],
    ['physics_optional', 'phasic'], ['sentient_moon', 'lithic'], ['recurring_nightmare', 'umbral'],
    ['ritual_engineering', 'chitinous'], ['born_after_end', 'revenant'], ['last_species', 'attenuated'],
  ];
  for (const [trait, archetype] of cases) {
    const civ = GameEngine.createCivilizationForTest(5);
    civ.traits.push(trait);
    assert.equal(speciesProfile(civ).archetype, archetype, `${trait} should yield ${archetype}`);
  }
  const higher = GameEngine.createCivilizationForTest(5);
  higher.traits.push('last_species', 'fungal_consensus');
  assert.equal(speciesProfile(higher).archetype, 'mycelic', 'table order wins over trait order');
});

test('species falls back to a seed archetype when no trait implies a body', () => {
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
  const archetypes = new Set();
  for (const seed of seeds) {
    const civ = GameEngine.createCivilizationForTest(seed);
    civ.traits.push('chronically_lucky', 'extreme_bureaucracy', 'museum_planet');
    const profile = speciesProfile(civ);
    assert.ok(['bipedal', 'tripodal', 'swarm'].includes(profile.archetype));
    archetypes.add(profile.archetype);
  }
  assert.ok(archetypes.size > 1, 'different seeds must not all collapse to one archetype');
});

test('species body color bends toward the dominant path accent', () => {
  const neutral = GameEngine.createCivilizationForTest(9);
  neutral.traits.push('sentient_moon');
  const aligned = GameEngine.createCivilizationForTest(9);
  aligned.traits.push('sentient_moon');
  aligned.pathState.dominantPath = 'cosmic_resistance';
  assert.notEqual(speciesProfile(aligned).bodyColor, speciesProfile(neutral).bodyColor);
  assert.equal(speciesProfile(aligned).archetype, speciesProfile(neutral).archetype);
});

test('castes are assigned by settlement class', () => {
  assert.equal(casteFor('camp'), 'labourer');
  assert.equal(casteFor('village'), 'labourer');
  assert.equal(casteFor('town'), 'citizen');
  assert.equal(casteFor('city'), 'citizen');
  assert.equal(casteFor('metropolis'), 'augmented');
  assert.equal(casteFor('arcology'), 'augmented');
  assert.equal(casteFor('unknown'), 'citizen');
});

test('drawCreature emits geometry for every archetype and caste', () => {
  for (const trait of ['fungal_consensus', 'liquid_mathematics', 'telepathic_species', 'physics_optional', 'sentient_moon', 'recurring_nightmare', 'ritual_engineering', 'born_after_end', 'last_species', 'museum_planet']) {
    const civ = GameEngine.createCivilizationForTest(3);
    civ.traits.push(trait);
    const profile = speciesProfile(civ);
    for (const caste of ['labourer', 'citizen', 'augmented']) {
      const calls = [];
      const surface = recordingSurface(calls);
      drawCreature(surface, profile, caste, 100, 200, 1, .5, 0x6fe7e1);
      assert.ok(calls.length >= 3, `${trait}/${caste} drew ${calls.length} primitives`);
      assert.ok(calls.every(([, ...args]) => args.every(value => typeof value !== 'number' || Number.isFinite(value))), `${trait}/${caste} emitted a non-finite coordinate`);
    }
  }
});
```

Add to the imports and add the shared `recordingSurface` helper directly below them:

```javascript
import { speciesProfile, casteFor, drawCreature } from '../dist/render/species.js';

function recordingSurface(calls) {
  const surface = new Proxy({}, { get: (_t, name) => (...args) => { calls.push([name, ...args]); return surface; } });
  return surface;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../dist/render/species.js'`.

- [ ] **Step 3: Write the implementation**

Create `public/game/src/render/species.ts`:

```typescript
import type { Civilization } from '../game/types.js';
import type { DrawSurface } from './draw-surface.js';
import { hash01, mixColor, pathAccentFor } from './primitives.js';

export type SpeciesArchetype = 'mycelic' | 'fluidic' | 'cerebral' | 'phasic' | 'lithic' | 'umbral' | 'chitinous' | 'revenant' | 'attenuated' | 'bipedal' | 'tripodal' | 'swarm';
export type SpeciesFeature = 'antenna' | 'cap' | 'smoke' | 'crystal' | 'hollow';
export type Caste = 'labourer' | 'citizen' | 'augmented';

export interface SpeciesProfile {
  id: string; archetype: SpeciesArchetype; limbs: number; heightRatio: number;
  bodyColor: number; glow: number; gaitPeriod: number; features: SpeciesFeature[];
}

interface ArchetypeSpec { archetype: SpeciesArchetype; limbs: number; heightRatio: number; baseColor: number; glow: number; gaitPeriod: number; features: SpeciesFeature[]; }

// Priority order decides the archetype, so the result never depends on the order traits were granted.
const TRAIT_ARCHETYPES: ReadonlyArray<readonly [string, ArchetypeSpec]> = [
  ['fungal_consensus', { archetype: 'mycelic', limbs: 2, heightRatio: .72, baseColor: 0xb6d98a, glow: .18, gaitPeriod: 920, features: ['cap'] }],
  ['liquid_mathematics', { archetype: 'fluidic', limbs: 0, heightRatio: .86, baseColor: 0x7fd7e8, glow: .3, gaitPeriod: 1400, features: [] }],
  ['telepathic_species', { archetype: 'cerebral', limbs: 2, heightRatio: 1.12, baseColor: 0xc7b4f0, glow: .34, gaitPeriod: 1050, features: ['antenna'] }],
  ['physics_optional', { archetype: 'phasic', limbs: 3, heightRatio: 1, baseColor: 0x9fe4d4, glow: .42, gaitPeriod: 760, features: [] }],
  ['sentient_moon', { archetype: 'lithic', limbs: 2, heightRatio: .9, baseColor: 0x9aa6b8, glow: .12, gaitPeriod: 1250, features: ['crystal'] }],
  ['recurring_nightmare', { archetype: 'umbral', limbs: 2, heightRatio: 1.04, baseColor: 0x3b3350, glow: .22, gaitPeriod: 880, features: ['smoke'] }],
  ['ritual_engineering', { archetype: 'chitinous', limbs: 4, heightRatio: .8, baseColor: 0xc98f5a, glow: .1, gaitPeriod: 640, features: [] }],
  ['born_after_end', { archetype: 'revenant', limbs: 2, heightRatio: 1.06, baseColor: 0x6f7d94, glow: .38, gaitPeriod: 1150, features: ['hollow'] }],
  ['last_species', { archetype: 'attenuated', limbs: 2, heightRatio: 1.18, baseColor: 0xd6cdb4, glow: .08, gaitPeriod: 1320, features: [] }],
];

// museum_planet, chronically_lucky and extreme_bureaucracy carry no bodily implication.
const SEED_ARCHETYPES: ReadonlyArray<ArchetypeSpec> = [
  { archetype: 'bipedal', limbs: 2, heightRatio: 1, baseColor: 0xd8b892, glow: .1, gaitPeriod: 900, features: [] },
  { archetype: 'tripodal', limbs: 3, heightRatio: .94, baseColor: 0xa8c6a0, glow: .14, gaitPeriod: 800, features: [] },
  { archetype: 'swarm', limbs: 2, heightRatio: .66, baseColor: 0xe0c46a, glow: .2, gaitPeriod: 520, features: [] },
];

const CASTES: Record<string, Caste> = { camp: 'labourer', village: 'labourer', town: 'citizen', city: 'citizen', metropolis: 'augmented', arcology: 'augmented' };

export function casteFor(settlementClass: string): Caste { return CASTES[settlementClass] ?? 'citizen'; }

export function speciesProfile(civ: Civilization): SpeciesProfile {
  const traits = new Set(civ.traits);
  let spec: ArchetypeSpec | undefined;
  for (const [traitId, candidate] of TRAIT_ARCHETYPES) if (traits.has(traitId)) { spec = candidate; break; }
  if (!spec) spec = SEED_ARCHETYPES[Math.min(SEED_ARCHETYPES.length - 1, Math.trunc(hash01(civ.seed * 7 + 3) * SEED_ARCHETYPES.length))]!;
  const accent = pathAccentFor(civ.pathState?.dominantPath ?? '');
  return {
    id: spec.archetype,
    archetype: spec.archetype,
    limbs: spec.limbs,
    heightRatio: spec.heightRatio,
    bodyColor: mixColor(spec.baseColor, accent, .28),
    glow: spec.glow,
    gaitPeriod: spec.gaitPeriod,
    features: [...spec.features],
  };
}

const CASTE_SCALE: Record<Caste, number> = { labourer: .82, citizen: 1, augmented: 1.14 };

export function drawCreature(surface: DrawSurface, profile: SpeciesProfile, caste: Caste, x: number, groundY: number, scale: number, phase: number, accent: number): void {
  const size = Math.max(3, 7 * scale * CASTE_SCALE[caste] * profile.heightRatio);
  const swing = Math.sin(phase * Math.PI * 2) * size * .22;
  const bodyTop = groundY - size;
  const bodyWidth = Math.max(1.4, size * (profile.archetype === 'lithic' || profile.archetype === 'mycelic' ? .52 : .34));

  if (caste === 'augmented' || profile.glow > .3) surface.fillStyle(accent, .12 + profile.glow * .16).fillCircle(x, bodyTop + size * .4, size * .78);

  if (profile.archetype === 'fluidic') {
    surface.fillStyle(profile.bodyColor, .92).fillPoly([
      [x - bodyWidth, groundY], [x - bodyWidth * .3 + swing, bodyTop + size * .4],
      [x + bodyWidth * .3 + swing, bodyTop], [x + bodyWidth, groundY],
    ]);
  } else {
    surface.fillStyle(profile.bodyColor, profile.archetype === 'phasic' ? .62 : .94).fillRect(x - bodyWidth / 2, bodyTop + size * .3, bodyWidth, size * .7);
    const legs = Math.max(2, profile.limbs);
    for (let leg = 0; leg < legs; leg++) {
      const spread = (leg - (legs - 1) / 2) * bodyWidth * .7;
      surface.lineStyle(Math.max(1, size * .13), profile.bodyColor, .88).line(x + spread * .4, groundY - size * .34, x + spread + (leg % 2 ? swing : -swing), groundY);
    }
  }

  const headRadius = size * (profile.archetype === 'cerebral' ? .34 : .24);
  surface.fillStyle(profile.bodyColor, .96).fillCircle(x, bodyTop + headRadius * .6, headRadius);

  if (profile.features.includes('cap')) surface.fillStyle(mixColor(profile.bodyColor, 0xffffff, .3), .9).fillTriangle(x - size * .42, bodyTop + headRadius, x, bodyTop - size * .18, x + size * .42, bodyTop + headRadius);
  if (profile.features.includes('antenna')) surface.lineStyle(Math.max(1, size * .1), accent, .7).line(x, bodyTop, x + swing * .6, bodyTop - size * .5);
  if (profile.features.includes('crystal')) surface.fillStyle(accent, .5).fillTriangle(x - bodyWidth * .7, bodyTop + size * .34, x - bodyWidth * .2, bodyTop - size * .1, x + bodyWidth * .3, bodyTop + size * .34);
  if (profile.features.includes('smoke')) surface.fillStyle(profile.bodyColor, .2).fillCircle(x - swing, bodyTop - size * .3, size * .4);
  if (profile.features.includes('hollow')) surface.fillStyle(accent, .75).fillCircle(x, bodyTop + headRadius * .6, headRadius * .34);
  if (caste === 'augmented') surface.lineStyle(Math.max(1, size * .08), accent, .55).strokeCircle(x, bodyTop - size * .12, headRadius * 1.5);
  if (caste === 'labourer') surface.lineStyle(Math.max(1, size * .1), mixColor(profile.bodyColor, 0x000000, .35), .8).line(x + bodyWidth * .6, groundY - size * .5, x + bodyWidth * .6, groundY);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/game/src/render/species.ts public/game/dist/render/species.js public/game/tests/presentation.test.mjs
git commit -m "feat(render): derive species profiles from civilization traits"
```

---

### Task 4: Faction roster and signature

**Files:**
- Create: `public/game/src/render/factions.ts`
- Test: `public/game/tests/presentation.test.mjs`

**Interfaces:**
- Consumes: `CivilizationPaths` from `../game/paths.js`; `pathAccentFor`, `FACTION_SIGILS`, `DEFAULT_ACCENT`, `type FactionSigil` from `./primitives.js`.
- Produces: `interface Faction { pathId: string; label: string; color: number; share: number; sigil: FactionSigil }`, `factionRoster(civ: Civilization): Faction[]`, `factionSignature(civ: Civilization): string`, `UNALIGNED_COLOR: number`.

- [ ] **Step 1: Write the failing test**

Append to `public/game/tests/presentation.test.mjs`:

```javascript
test('faction roster ranks paths by affinity and normalizes shares', () => {
  const civ = GameEngine.createCivilizationForTest(21);
  civ.pathState.affinity.machine_faith = 6;
  civ.pathState.affinity.void_communion = 3;
  civ.pathState.affinity.collective_mind = 1;
  const roster = factionRoster(civ);
  assert.equal(roster.length, 3);
  assert.deepEqual(roster.map(f => f.pathId), ['machine_faith', 'void_communion', 'collective_mind']);
  assert.ok(Math.abs(roster.reduce((sum, f) => sum + f.share, 0) - 1) < 1e-9);
  assert.equal(roster[0].color, 0xf0ca6f);
  assert.equal(roster[0].sigil, 'spire');
  assert.ok(roster[0].label.length > 0);
});

test('faction roster puts the dominant path first even below the leader', () => {
  const civ = GameEngine.createCivilizationForTest(22);
  civ.pathState.affinity.machine_faith = 8;
  civ.pathState.affinity.void_communion = 2;
  civ.pathState.dominantPath = 'void_communion';
  assert.equal(factionRoster(civ)[0].pathId, 'void_communion');
});

test('faction roster is empty before any affinity exists', () => {
  assert.deepEqual(factionRoster(GameEngine.createCivilizationForTest(23)), []);
  assert.equal(factionSignature(GameEngine.createCivilizationForTest(23)), 'unaligned');
});

test('faction signature bands shares into quarters', () => {
  const civ = GameEngine.createCivilizationForTest(24);
  civ.pathState.affinity.machine_faith = 8;
  civ.pathState.affinity.void_communion = 2;
  const base = factionSignature(civ);
  civ.pathState.affinity.machine_faith = 8.2;
  assert.equal(factionSignature(civ), base, 'a share change inside a quarter must not churn the key');
  civ.pathState.affinity.machine_faith = 2;
  civ.pathState.affinity.void_communion = 8;
  assert.notEqual(factionSignature(civ), base, 'crossing quarters must change the key');
});
```

Add to the imports:

```javascript
import { factionRoster, factionSignature } from '../dist/render/factions.js';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../dist/render/factions.js'`.

- [ ] **Step 3: Write the implementation**

Create `public/game/src/render/factions.ts`:

```typescript
import type { Civilization } from '../game/types.js';
import { CivilizationPaths } from '../game/paths.js';
import { DEFAULT_ACCENT, FACTION_SIGILS, pathAccentFor, type FactionSigil } from './primitives.js';

export const UNALIGNED_COLOR = 0x71808f;

export interface Faction { pathId: string; label: string; color: number; share: number; sigil: FactionSigil; }

export function factionRoster(civ: Civilization): Faction[] {
  const state = CivilizationPaths.ensure(civ);
  const ranked = CivilizationPaths.ranked(civ, 10);
  if (!ranked.length) return [];
  const ordered = state.dominantPath && ranked.includes(state.dominantPath)
    ? [state.dominantPath, ...ranked.filter(id => id !== state.dominantPath)]
    : ranked;
  const total = ordered.reduce((sum, id) => sum + CivilizationPaths.affinity(civ, id), 0);
  return ordered.map(id => ({
    pathId: id,
    label: CivilizationPaths.displayName(id),
    color: pathAccentFor(id) || DEFAULT_ACCENT,
    share: total > 0 ? CivilizationPaths.affinity(civ, id) / total : 0,
    sigil: FACTION_SIGILS[id] ?? 'node',
  }));
}

export function factionSignature(civ: Civilization): string {
  const roster = factionRoster(civ);
  if (!roster.length) return 'unaligned';
  return roster.slice(0, 3).map(faction => `${faction.pathId}:${Math.trunc(faction.share * 4)}`).join('/');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/game/src/render/factions.ts public/game/dist/render/factions.js public/game/tests/presentation.test.mjs
git commit -m "feat(render): derive factions from path affinities"
```

---

### Task 5: Snapshot gains agent budget and settlement count

**Files:**
- Modify: `public/game/src/render/world-model.ts:16-42`
- Test: `public/game/tests/presentation.test.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: `worldSnapshot(...)` return type gains `settlementCount: number` and `agentBudget: { pedestrians: number; vehicles: number; aircraft: number; orbital: number; launches: number }`. Existing fields are unchanged, so every current consumer keeps working.

- [ ] **Step 1: Write the failing test**

Append to `public/game/tests/presentation.test.mjs`:

```javascript
test('agent budget never exceeds its per-class or total ceiling', () => {
  let maxTotal = 0;
  for (const era of [0, 1, 2, 3, 4]) {
    for (const development of [1, 60, 200, 600, 2000, 9000]) {
      for (const institutions of [0, 3, 9]) {
        const civ = GameEngine.createCivilizationForTest(31 + era);
        civ.era = era; civ.development = development; civ.eventChoices = institutions * 3;
        for (let i = 0; i < institutions; i++) civ.institutions.push(`Institution ${i}`);
        const budget = worldSnapshot(civ, 900).agentBudget;
        assert.ok(budget.pedestrians <= 60, `pedestrians ${budget.pedestrians}`);
        assert.ok(budget.vehicles <= 34, `vehicles ${budget.vehicles}`);
        assert.ok(budget.aircraft <= 14, `aircraft ${budget.aircraft}`);
        assert.ok(budget.orbital <= 8, `orbital ${budget.orbital}`);
        assert.ok(budget.launches <= 4, `launches ${budget.launches}`);
        const total = budget.pedestrians + budget.vehicles + budget.aircraft + budget.orbital + budget.launches;
        assert.ok(total <= 120, `total ${total}`);
        maxTotal = Math.max(maxTotal, total);
      }
    }
  }
  assert.ok(maxTotal > 60, 'a fully developed world should actually use the budget');
});

test('settlement count grows with development stage and stays bounded', () => {
  const early = GameEngine.createCivilizationForTest(41);
  assert.equal(worldSnapshot(early, 900).settlementCount, 1);
  const late = GameEngine.createCivilizationForTest(41);
  late.development = 600; late.era = 4; late.eventChoices = 15;
  late.institutions.push('Consensus Lattice', 'Reality Works Authority');
  const count = worldSnapshot(late, 900).settlementCount;
  assert.ok(count >= 6 && count <= 9, `settlementCount was ${count}`);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot read properties of undefined (reading 'pedestrians')`.

- [ ] **Step 3: Write the implementation**

In `public/game/src/render/world-model.ts`, inside `worldSnapshot`, add these two lines directly above the `return {` statement:

```typescript
  const settlementCount = Math.max(1, Math.min(9, 1 + stage * 2 + Math.trunc(civ.era / 2)));
  const agentBudget = {
    pedestrians: Math.max(4, Math.min(60, 4 + stage * 8 + Math.trunc(development / 26) + civ.era * 6)),
    vehicles: stage >= 1 ? Math.max(2, Math.min(34, stage * 4 + Math.trunc(development / 45) + civ.era * 3)) : 0,
    aircraft: stage >= 2 && civ.era >= 1 ? Math.max(1, Math.min(14, (stage - 1) * 2 + civ.era + Math.trunc(development / 220))) : 0,
    orbital: stage >= 3 && civ.era >= 1 ? Math.max(1, Math.min(8, stage - 2 + Math.trunc(development / 320))) : 0,
    launches: stage >= 3 && civ.era >= 2 ? Math.max(1, Math.min(4, stage - 2)) : 0,
  };
```

Then add both to the returned object, directly after the `stage,` line:

```typescript
    settlementCount,
    agentBudget,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS. The existing `world expands from sparse camps to an arcology world` test must still pass — the added fields do not touch any existing one.

- [ ] **Step 5: Commit**

```bash
git add public/game/src/render/world-model.ts public/game/dist/render/world-model.js public/game/tests/presentation.test.mjs
git commit -m "feat(render): add agent budget and settlement count to the world snapshot"
```

---

### Task 6: Settlement layout and classes

**Files:**
- Create: `public/game/src/render/settlements.ts`
- Test: `public/game/tests/presentation.test.mjs`

**Interfaces:**
- Consumes: `hash01` from `./primitives.js`; the `worldSnapshot` return type from `./world-model.js`; `factionRoster` from `./factions.js`. It does **not** import `structures.ts`: per-structure kind assignment lives here (it needs the settlement's own index, count and class), while `structures.ts` owns only the era gate and the drawing. Task 7 depends on this task's `StructureKind` union, not the other way round.
- Produces: `type SettlementClass = 'camp'|'village'|'town'|'city'|'metropolis'|'arcology'`, `type StructureKind = 'dwelling'|'farm'|'temple'|'monument'|'industry'|'academy'|'reactor'|'spaceport'|'orbital_anchor'`, `CLASS_ORDER: readonly SettlementClass[]`, `interface Structure { id: string; x: number; width: number; height: number; kind: StructureKind; level: number }`, `interface Settlement { id: string; centerX: number; radius: number; settlementClass: SettlementClass; factionIndex: number; structures: Structure[] }`, `settlementSizes(civ, snapshot): number[]`, `settlementClassFor(structureCount: number, stage: number, era: number): SettlementClass`, `settlementClassSignature(civ, snapshot): string`, `settlementLayout(civ, worldWidth, height, snapshot): Settlement[]`.

`snapshot` is always `ReturnType<typeof worldSnapshot>`.

- [ ] **Step 1: Write the failing test**

Append to `public/game/tests/presentation.test.mjs`:

```javascript
function lateCiv(seed = 51) {
  const civ = GameEngine.createCivilizationForTest(seed);
  civ.development = 600; civ.era = 2; civ.eventChoices = 15;
  civ.institutions.push('Consensus Lattice', 'Reality Works Authority');
  return civ;
}

test('settlement sizes account for every structure in the snapshot', () => {
  for (const civ of [GameEngine.createCivilizationForTest(51), lateCiv()]) {
    const snapshot = worldSnapshot(civ, 900);
    const sizes = settlementSizes(civ, snapshot);
    assert.equal(sizes.length, snapshot.settlementCount);
    assert.equal(sizes.reduce((a, b) => a + b, 0), snapshot.buildingCount);
    assert.ok(sizes.every(size => size >= 1), 'no settlement may be empty');
  }
});

test('early worlds are camps and villages, late worlds reach metropolis scale', () => {
  const early = GameEngine.createCivilizationForTest(52);
  const earlySnapshot = worldSnapshot(early, 900);
  const earlyClasses = settlementLayout(early, earlySnapshot.worldWidth, 400, earlySnapshot).map(s => s.settlementClass);
  assert.ok(earlyClasses.every(c => c === 'camp' || c === 'village'), `got ${earlyClasses.join(',')}`);

  const late = lateCiv(52);
  const lateSnapshot = worldSnapshot(late, 900);
  const lateClasses = settlementLayout(late, lateSnapshot.worldWidth, 400, lateSnapshot).map(s => s.settlementClass);
  assert.ok(lateClasses.some(c => c === 'metropolis' || c === 'arcology'), `got ${lateClasses.join(',')}`);
});

test('settlement layout is deterministic and geometrically sane', () => {
  const civ = lateCiv(53);
  const snapshot = worldSnapshot(civ, 900);
  const first = settlementLayout(civ, snapshot.worldWidth, 400, snapshot);
  const second = settlementLayout(civ, snapshot.worldWidth, 400, snapshot);
  assert.deepEqual(first, second);
  const totalStructures = first.reduce((sum, s) => sum + s.structures.length, 0);
  assert.equal(totalStructures, snapshot.buildingCount);
  const ids = new Set(first.flatMap(s => s.structures.map(st => st.id)));
  assert.equal(ids.size, totalStructures, 'structure ids must be unique');
  for (const settlement of first) {
    assert.ok(settlement.centerX >= 0 && settlement.centerX <= snapshot.worldWidth);
    assert.ok(settlement.radius > 0);
    for (const structure of settlement.structures) {
      assert.ok(structure.width > 0 && structure.height > 0);
      assert.ok(Number.isFinite(structure.x));
    }
  }
});

test('settlements are assigned to factions proportionally to affinity share', () => {
  const civ = lateCiv(54);
  civ.pathState.affinity.machine_faith = 9;
  civ.pathState.affinity.void_communion = 1;
  const snapshot = worldSnapshot(civ, 900);
  const layout = settlementLayout(civ, snapshot.worldWidth, 400, snapshot);
  const leaderHeld = layout.filter(s => s.factionIndex === 0).length;
  assert.ok(leaderHeld > layout.length / 2, `leader held ${leaderHeld} of ${layout.length}`);
  assert.ok(layout.every(s => s.factionIndex >= 0));

  const unaligned = lateCiv(54);
  const unalignedLayout = settlementLayout(unaligned, snapshot.worldWidth, 400, worldSnapshot(unaligned, 900));
  assert.ok(unalignedLayout.every(s => s.factionIndex === -1), 'no affinity means no banner owner');
});

test('settlement class signature is discrete and reflects the class mix', () => {
  const civ = lateCiv(55);
  const snapshot = worldSnapshot(civ, 900);
  const base = settlementClassSignature(civ, snapshot);
  civ.development += 1;
  assert.equal(settlementClassSignature(civ, worldSnapshot(civ, 900)), base, 'a one-point tick must not churn the signature');
  civ.era = 4; civ.development = 3000;
  assert.notEqual(settlementClassSignature(civ, worldSnapshot(civ, 900)), base);
});

test('settlement classes are ordered from camp to arcology', () => {
  assert.deepEqual([...CLASS_ORDER], ['camp', 'village', 'town', 'city', 'metropolis', 'arcology']);
  assert.equal(settlementClassFor(2, 0, 0), 'camp');
  assert.equal(settlementClassFor(6, 0, 0), 'village');
  assert.equal(settlementClassFor(30, 4, 4), 'arcology');
});
```

Add to the imports:

```javascript
import { settlementSizes, settlementClassFor, settlementClassSignature, settlementLayout, CLASS_ORDER } from '../dist/render/settlements.js';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../dist/render/settlements.js'`.

- [ ] **Step 3: Write the implementation**

Create `public/game/src/render/settlements.ts`:

```typescript
import type { Civilization } from '../game/types.js';
import { hash01 } from './primitives.js';
import { factionRoster } from './factions.js';
import type { worldSnapshot } from './world-model.js';

type Snapshot = ReturnType<typeof worldSnapshot>;

export type SettlementClass = 'camp' | 'village' | 'town' | 'city' | 'metropolis' | 'arcology';
export type StructureKind = 'dwelling' | 'farm' | 'temple' | 'monument' | 'industry' | 'academy' | 'reactor' | 'spaceport' | 'orbital_anchor';

export const CLASS_ORDER: readonly SettlementClass[] = ['camp', 'village', 'town', 'city', 'metropolis', 'arcology'];

export interface Structure { id: string; x: number; width: number; height: number; kind: StructureKind; level: number; }
export interface Settlement { id: string; centerX: number; radius: number; settlementClass: SettlementClass; factionIndex: number; structures: Structure[]; }

export function settlementClassFor(structureCount: number, stage: number, era: number): SettlementClass {
  if (stage === 0) return structureCount >= 4 ? 'village' : 'camp';
  const score = structureCount + stage * 2 + era;
  if (score < 7) return 'village';
  if (score < 11) return 'town';
  if (score < 16) return 'city';
  if (score < 22) return 'metropolis';
  return 'arcology';
}

// The capital is weighted heavily so a developed world always contains one large settlement.
export function settlementSizes(civ: Civilization, snapshot: Snapshot): number[] {
  const count = snapshot.settlementCount;
  const weights = Array.from({ length: count }, (_, i) => i === 0 ? 1.9 : .55 + hash01(civ.seed * 29 + i * 13) * .9);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const sizes = weights.map(weight => Math.max(1, Math.floor(snapshot.buildingCount * weight / totalWeight)));
  let remainder = snapshot.buildingCount - sizes.reduce((sum, size) => sum + size, 0);
  for (let i = 0; remainder > 0; i = (i + 1) % count) { sizes[i]! += 1; remainder--; }
  for (let i = count - 1; remainder < 0 && i >= 0; i--) {
    const reducible = Math.min(sizes[i]! - 1, -remainder);
    sizes[i]! -= reducible; remainder += reducible;
  }
  return sizes;
}

export function settlementClassSignature(civ: Civilization, snapshot: Snapshot): string {
  const counts = new Map<SettlementClass, number>();
  for (const size of settlementSizes(civ, snapshot)) {
    const settlementClass = settlementClassFor(size, snapshot.stage, civ.era);
    counts.set(settlementClass, (counts.get(settlementClass) ?? 0) + 1);
  }
  return CLASS_ORDER.filter(name => counts.has(name)).map(name => `${name}:${counts.get(name)}`).join('/');
}

function kindFor(index: number, count: number, settlementClass: SettlementClass, era: number, stage: number, seed: number): StructureKind {
  const rank = CLASS_ORDER.indexOf(settlementClass);
  const mid = Math.floor(count / 2);
  if (stage === 0) return count >= 3 && index === count - 1 ? 'farm' : 'dwelling';
  if (era >= 3 && rank >= 4 && index === 0) return 'orbital_anchor';
  if (era >= 2 && rank >= 3 && index === count - 1) return 'spaceport';
  if (era >= 2 && count >= 10 && index === mid - 1) return 'reactor';
  if (count >= 3 && index === mid) return 'temple';
  if (era >= 1 && count >= 6 && index === mid + 1) return 'academy';
  if (stage >= 2 && count >= 8 && index === 1) return 'monument';
  const distance = count <= 1 ? 0 : Math.abs((index + .5) / count - .5) * 2;
  if (distance > .7) return 'farm';
  if (era >= 1 && distance > .5 && hash01(seed + index * 37) > .45) return 'industry';
  return 'dwelling';
}

export function settlementLayout(civ: Civilization, worldWidth: number, height: number, snapshot: Snapshot): Settlement[] {
  const stage = snapshot.stage;
  const sizes = settlementSizes(civ, snapshot);
  const roster = factionRoster(civ);
  const scale = [.24, .46, .7, .96, 1.28][stage] ?? .24;
  const settlements: Settlement[] = [];
  let globalIndex = 0;

  for (let index = 0; index < sizes.length; index++) {
    const count = sizes[index]!;
    const settlementClass = settlementClassFor(count, stage, civ.era);
    const centerX = Math.max(0, Math.min(worldWidth, worldWidth * (.06 + (index + .5) / sizes.length * .88) + (hash01(civ.seed * 11 + index * 23) - .5) * worldWidth * .04));
    const radius = Math.max(24, Math.min(worldWidth * .18, 20 + count * (7 + stage * 2.6)));
    const structures: Structure[] = [];
    for (let i = 0; i < count; i++) {
      const level = stage === 0
        ? (hash01(civ.seed * 37 + globalIndex * 7) < .82 ? 0 : 1)
        : Math.min(6, Math.max(1, stage - 1 + Math.trunc(civ.development / 180) + civ.era + Math.trunc(hash01(civ.seed * 13 + globalIndex * 19) * 1.6)));
      const width = (14 + hash01(civ.seed * 17 + globalIndex * 29) * 30 + level * 3) * (stage === 0 ? .7 : 1 + stage * .08);
      const structureHeight = Math.max(18, Math.min(height * .64, (26 + hash01(civ.seed * 53 + globalIndex * 13) * 120 + level * 22) * scale));
      structures.push({
        id: `s${index}:${i}`,
        x: centerX - radius + radius * 2 * (i + .5) / count,
        width, height: structureHeight,
        kind: kindFor(i, count, settlementClass, civ.era, stage, civ.seed + index * 101),
        level,
      });
      globalIndex++;
    }
    settlements.push({ id: `s${index}`, centerX, radius, settlementClass, factionIndex: -1, structures });
  }

  if (roster.length) {
    const order = [...settlements].sort((a, b) => b.structures.length - a.structures.length);
    let cursor = 0;
    for (let f = 0; f < roster.length && cursor < order.length; f++) {
      const quota = f === roster.length - 1
        ? order.length - cursor
        : Math.max(1, Math.round(roster[f]!.share * order.length));
      for (let taken = 0; taken < quota && cursor < order.length; taken++) order[cursor++]!.factionIndex = f;
    }
    for (const settlement of order) if (settlement.factionIndex < 0) settlement.factionIndex = 0;
  }

  return settlements;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/game/src/render/settlements.ts public/game/dist/render/settlements.js public/game/tests/presentation.test.mjs
git commit -m "feat(render): lay out settlements with classes, typed structures and faction owners"
```

---

### Task 7: Structure silhouettes and faction banners

**Files:**
- Create: `public/game/src/render/structures.ts`
- Test: `public/game/tests/presentation.test.mjs`

**Interfaces:**
- Consumes: `DrawSurface` from `./draw-surface.js`; `hash01`, `mixColor`, `type FactionSigil` from `./primitives.js`; `type Structure`, `type StructureKind` from `./settlements.js`.
- Produces: `structureKindsForEra(era: number, stage: number): StructureKind[]`, `drawStructure(surface: DrawSurface, structure: Structure, groundY: number, bodyColor: number, accent: number, windowColor: number, seed: number): void`, `drawBanner(surface: DrawSurface, x: number, topY: number, poleHeight: number, color: number, sigil: FactionSigil, wave: number): void`.

- [ ] **Step 1: Write the failing test**

Append to `public/game/tests/presentation.test.mjs`:

```javascript
test('structure kinds unlock by era', () => {
  assert.deepEqual(structureKindsForEra(0, 1), ['dwelling', 'farm', 'temple', 'monument']);
  const era1 = structureKindsForEra(1, 1);
  assert.ok(era1.includes('industry') && era1.includes('academy'));
  assert.ok(!era1.includes('spaceport'), 'spaceport must not exist before era 2');
  assert.ok(!structureKindsForEra(0, 1).includes('spaceport'));
  const era2 = structureKindsForEra(2, 2);
  assert.ok(era2.includes('spaceport') && era2.includes('reactor'));
  assert.ok(!era2.includes('orbital_anchor'), 'orbital anchor must not exist before era 3');
  assert.ok(structureKindsForEra(3, 3).includes('orbital_anchor'));
  assert.deepEqual(structureKindsForEra(4, 0), ['dwelling', 'farm'], 'stage 0 stays pre-urban regardless of era');
});

test('every structure kind draws distinct geometry', () => {
  const signatures = new Map();
  for (const kind of ['dwelling', 'farm', 'temple', 'monument', 'industry', 'academy', 'reactor', 'spaceport', 'orbital_anchor']) {
    const calls = [];
    drawStructure(recordingSurface(calls), { id: 'x', x: 120, width: 30, height: 80, kind, level: 3 }, 300, 0x182b39, 0x6fe7e1, 0xf2cd7b, 7);
    assert.ok(calls.length >= 2, `${kind} drew ${calls.length} primitives`);
    assert.ok(calls.every(([, ...args]) => args.every(value => typeof value !== 'number' || Number.isFinite(value))), `${kind} emitted a non-finite coordinate`);
    signatures.set(kind, JSON.stringify(calls));
  }
  assert.equal(new Set(signatures.values()).size, signatures.size, 'two kinds produced identical geometry');
});

test('banners draw a pole and a sigil for every faction sigil', () => {
  for (const sigil of ['spire', 'node', 'ring', 'prism', 'spiral', 'chevron', 'grid', 'halo', 'void', 'nest']) {
    const calls = [];
    drawBanner(recordingSurface(calls), 200, 140, 40, 0xf0ca6f, sigil, .5);
    assert.ok(calls.some(([name]) => name === 'line'), `${sigil} drew no pole`);
    assert.ok(calls.length >= 4, `${sigil} drew ${calls.length} primitives`);
  }
});
```

Add to the imports:

```javascript
import { structureKindsForEra, drawStructure, drawBanner } from '../dist/render/structures.js';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../dist/render/structures.js'`.

- [ ] **Step 3: Write the implementation**

Create `public/game/src/render/structures.ts`:

```typescript
import type { DrawSurface } from './draw-surface.js';
import { hash01, mixColor, type FactionSigil } from './primitives.js';
import type { Structure, StructureKind } from './settlements.js';

export function structureKindsForEra(era: number, stage: number): StructureKind[] {
  if (stage === 0) return ['dwelling', 'farm'];
  const kinds: StructureKind[] = ['dwelling', 'farm', 'temple', 'monument'];
  if (era >= 1) kinds.push('industry', 'academy');
  if (era >= 2) kinds.push('reactor', 'spaceport');
  if (era >= 3) kinds.push('orbital_anchor');
  return kinds;
}

export function drawStructure(surface: DrawSurface, structure: Structure, groundY: number, bodyColor: number, accent: number, windowColor: number, seed: number): void {
  const left = structure.x - structure.width / 2;
  const top = groundY - structure.height;
  const width = structure.width;
  const height = structure.height;

  switch (structure.kind) {
    case 'farm':
      surface.fillStyle(mixColor(bodyColor, 0x6d8a45, .6), .95).fillRect(left, groundY - height * .34, width, height * .34);
      surface.fillStyle(mixColor(bodyColor, 0x2f3a1c, .55), .95).fillTriangle(left - width * .12, groundY - height * .34, structure.x, groundY - height * .62, left + width * 1.12, groundY - height * .34);
      for (let row = 0; row < 4; row++) surface.lineStyle(1, mixColor(accent, 0x8ee66b, .7), .28).line(left - width * .3, groundY + 3 + row * 4, left + width * 1.3, groundY + 3 + row * 4);
      break;
    case 'industry':
      surface.fillStyle(mixColor(bodyColor, 0x000000, .25), .97).fillRect(left, groundY - height * .58, width, height * .58);
      for (let stack = 0; stack < 2; stack++) {
        const stackX = left + width * (.24 + stack * .46);
        surface.fillStyle(mixColor(bodyColor, 0x000000, .45), .97).fillRect(stackX, top, width * .16, height);
        surface.fillStyle(0x8f9aa6, .16).fillCircle(stackX + width * .08, top - height * .1, width * .22);
      }
      break;
    case 'temple':
      surface.fillStyle(mixColor(bodyColor, accent, .3), .97).fillRect(left, groundY - height * .72, width, height * .72);
      surface.fillStyle(mixColor(bodyColor, accent, .55), .95).fillRect(left + width * .16, top, width * .68, height * .3);
      surface.fillStyle(accent, .34).fillCircle(structure.x, top - width * .1, width * .3);
      surface.lineStyle(1.5, accent, .5).line(structure.x, top - width * .4, structure.x, top - width * .1);
      break;
    case 'academy':
      surface.fillStyle(mixColor(bodyColor, accent, .18), .97).fillRect(left, top, width, height);
      surface.lineStyle(1, accent, .42).strokeRect(left + width * .12, top + height * .12, width * .76, height * .5);
      for (let column = 0; column < 3; column++) surface.lineStyle(1.4, accent, .34).line(left + width * (.2 + column * .3), groundY - height * .3, left + width * (.2 + column * .3), groundY);
      break;
    case 'reactor':
      surface.fillStyle(mixColor(bodyColor, 0x000000, .18), .97).fillRect(left, groundY - height * .5, width, height * .5);
      surface.fillStyle(mixColor(bodyColor, accent, .4), .9).fillCircle(structure.x, groundY - height * .62, width * .46);
      surface.lineStyle(2, accent, .5).strokeCircle(structure.x, groundY - height * .62, width * .62);
      break;
    case 'spaceport':
      surface.fillStyle(mixColor(bodyColor, 0x000000, .3), .97).fillRect(left, groundY - height * .22, width * 1.3, height * .22);
      surface.lineStyle(2, accent, .55).line(structure.x, groundY - height * .22, structure.x, top);
      surface.lineStyle(1.4, accent, .4).line(left, groundY - height * .22, structure.x, top - height * .1);
      surface.lineStyle(1.4, accent, .4).line(left + width * 1.3, groundY - height * .22, structure.x, top - height * .1);
      surface.fillStyle(accent, .28).fillTriangle(structure.x - width * .18, top, structure.x, top - height * .3, structure.x + width * .18, top);
      break;
    case 'orbital_anchor':
      surface.fillStyle(mixColor(bodyColor, accent, .45), .95).fillRect(structure.x - width * .16, top - height * .6, width * .32, height * 1.6);
      surface.lineStyle(1.2, accent, .5).line(structure.x, top - height * .9, structure.x, groundY);
      for (let ring = 0; ring < 3; ring++) surface.lineStyle(1, accent, .3).strokeCircle(structure.x, top - height * .1 + ring * height * .34, width * (.7 - ring * .16));
      break;
    case 'monument':
      surface.fillStyle(mixColor(bodyColor, accent, .5), .96).fillTriangle(left + width * .1, groundY, structure.x, top - height * .25, left + width * .9, groundY);
      surface.lineStyle(1.4, accent, .45).strokeCircle(structure.x, top - height * .3, width * .22);
      break;
    default:
      surface.fillStyle(bodyColor, .98).fillRect(left, top, width, height);
      surface.lineStyle(1, accent, .28).strokeRect(left, top, width, height);
      if (structure.level >= 3) surface.fillStyle(mixColor(bodyColor, accent, .35), .9).fillRect(left + width * .18, top - height * .12, width * .64, height * .12);
      break;
  }

  const rows = Math.max(1, Math.min(6, Math.trunc(structure.height / 22)));
  for (let row = 0; row < rows; row++) {
    if (hash01(seed + structure.x + row * 17) < .38) continue;
    surface.fillStyle(windowColor, .3 + hash01(seed + row * 31) * .28).fillRect(left + width * .24, top + height * .18 + row * (height * .62 / rows), Math.max(1.5, width * .16), 2.4);
  }
}

const SIGIL_DRAW: Record<FactionSigil, (surface: DrawSurface, x: number, y: number, size: number, color: number) => void> = {
  spire: (s, x, y, size, color) => { s.fillStyle(color, .85).fillTriangle(x - size * .3, y + size * .4, x, y - size * .5, x + size * .3, y + size * .4); },
  node: (s, x, y, size, color) => { s.fillStyle(color, .85).fillCircle(x, y, size * .3); s.lineStyle(1, color, .7).line(x - size * .5, y, x + size * .5, y); },
  ring: (s, x, y, size, color) => { s.lineStyle(1.6, color, .85).strokeCircle(x, y, size * .42); },
  prism: (s, x, y, size, color) => { s.lineStyle(1.4, color, .85).line(x - size * .4, y + size * .35, x, y - size * .45).line(x, y - size * .45, x + size * .4, y + size * .35).line(x + size * .4, y + size * .35, x - size * .4, y + size * .35); },
  spiral: (s, x, y, size, color) => { for (let i = 0; i < 3; i++) s.lineStyle(1, color, .8 - i * .18).strokeCircle(x, y, size * (.16 + i * .14)); },
  chevron: (s, x, y, size, color) => { s.lineStyle(1.6, color, .85).line(x - size * .4, y + size * .2, x, y - size * .3).line(x, y - size * .3, x + size * .4, y + size * .2); },
  grid: (s, x, y, size, color) => { s.lineStyle(1, color, .8).line(x - size * .4, y - size * .12, x + size * .4, y - size * .12).line(x - size * .4, y + size * .18, x + size * .4, y + size * .18).line(x, y - size * .4, x, y + size * .4); },
  halo: (s, x, y, size, color) => { s.lineStyle(1.4, color, .85).strokeCircle(x, y - size * .1, size * .34); s.fillStyle(color, .3).fillCircle(x, y + size * .28, size * .16); },
  void: (s, x, y, size, color) => { s.fillStyle(color, .22).fillCircle(x, y, size * .46); s.lineStyle(1.4, color, .85).strokeCircle(x, y, size * .2); },
  nest: (s, x, y, size, color) => { for (let i = 0; i < 4; i++) s.fillStyle(color, .7 - i * .12).fillCircle(x + (i % 2 ? size * .22 : -size * .22), y + (i < 2 ? -size * .16 : size * .16), size * .15); },
};

export function drawBanner(surface: DrawSurface, x: number, topY: number, poleHeight: number, color: number, sigil: FactionSigil, wave: number): void {
  const bottomY = topY + poleHeight;
  surface.lineStyle(1.6, mixColor(color, 0x000000, .45), .9).line(x, topY, x, bottomY);
  const clothWidth = Math.max(9, poleHeight * .46);
  const clothHeight = Math.max(7, poleHeight * .36);
  const sway = Math.sin(wave * Math.PI * 2) * clothWidth * .16;
  surface.fillStyle(color, .82).fillPoly([
    [x, topY + 1],
    [x + clothWidth + sway, topY + 1 + sway * .4],
    [x + clothWidth + sway * .5, topY + clothHeight + sway * .4],
    [x, topY + clothHeight],
  ]);
  SIGIL_DRAW[sigil](surface, x + clothWidth * .52 + sway * .5, topY + clothHeight * .5, clothHeight, mixColor(color, 0x08111a, .7));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/game/src/render/structures.ts public/game/dist/render/structures.js public/game/tests/presentation.test.mjs
git commit -m "feat(render): draw era-gated structure silhouettes and faction banners"
```

---

### Task 8: Agent plan

**Files:**
- Create: `public/game/src/render/agents.ts`
- Test: `public/game/tests/presentation.test.mjs`

**Interfaces:**
- Consumes: `hash01` from `./primitives.js`; `type Settlement` from `./settlements.js`; `worldSnapshot` type from `./world-model.js`.
- Produces: `interface PedestrianSpec { settlementIndex: number; offset: number; speed: number; lane: number; seed: number }`, `interface VehicleSpec { fromX: number; toX: number; lane: number; speed: number; phase: number; seed: number }`, `interface AircraftSpec { fromX: number; toX: number; altitude: number; speed: number; phase: number }`, `interface OrbitalSpec { altitude: number; speed: number; phase: number }`, `interface LaunchSpec { x: number; period: number; offset: number }`, `interface AgentPlan { pedestrians: PedestrianSpec[]; vehicles: VehicleSpec[]; aircraft: AircraftSpec[]; orbital: OrbitalSpec[]; launches: LaunchSpec[] }`, `agentPlan(civ, snapshot, settlements): AgentPlan`, `agentPlanTotal(plan: AgentPlan): number`.

- [ ] **Step 1: Write the failing test**

Append to `public/game/tests/presentation.test.mjs`:

```javascript
test('agent plan respects the budget and binds agents to real places', () => {
  const civ = lateCiv(61);
  civ.era = 4; civ.development = 4000;
  const snapshot = worldSnapshot(civ, 900);
  const settlements = settlementLayout(civ, snapshot.worldWidth, 400, snapshot);
  const plan = agentPlan(civ, snapshot, settlements);
  assert.ok(agentPlanTotal(plan) <= 120, `total was ${agentPlanTotal(plan)}`);
  assert.equal(plan.pedestrians.length, snapshot.agentBudget.pedestrians);
  assert.ok(plan.pedestrians.every(p => p.settlementIndex >= 0 && p.settlementIndex < settlements.length));
  assert.ok(plan.vehicles.every(v => Number.isFinite(v.fromX) && Number.isFinite(v.toX) && v.fromX !== v.toX));
  assert.ok(plan.aircraft.every(a => a.altitude > 0));
  assert.deepEqual(agentPlan(civ, snapshot, settlements), plan, 'plans are deterministic');
});

test('agent plan produces nothing that the world cannot support yet', () => {
  const early = GameEngine.createCivilizationForTest(62);
  const snapshot = worldSnapshot(early, 900);
  const plan = agentPlan(early, snapshot, settlementLayout(early, snapshot.worldWidth, 400, snapshot));
  assert.equal(plan.vehicles.length, 0, 'stage 0 has no traffic');
  assert.equal(plan.aircraft.length, 0);
  assert.equal(plan.orbital.length, 0);
  assert.equal(plan.launches.length, 0);
  assert.ok(plan.pedestrians.length > 0, 'even a camp is inhabited');
});

test('launches only exist where a spaceport was actually built', () => {
  const civ = lateCiv(63);
  civ.era = 4; civ.development = 4000;
  const snapshot = worldSnapshot(civ, 900);
  const settlements = settlementLayout(civ, snapshot.worldWidth, 400, snapshot);
  const spaceportX = new Set(settlements.flatMap(s => s.structures.filter(st => st.kind === 'spaceport' || st.kind === 'orbital_anchor').map(st => st.x)));
  const plan = agentPlan(civ, snapshot, settlements);
  assert.ok(plan.launches.length <= 4);
  for (const launch of plan.launches) assert.ok(spaceportX.has(launch.x), `launch at ${launch.x} has no pad`);
});
```

Add to the imports:

```javascript
import { agentPlan, agentPlanTotal } from '../dist/render/agents.js';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../dist/render/agents.js'`.

- [ ] **Step 3: Write the implementation**

Create `public/game/src/render/agents.ts`:

```typescript
import type { Civilization } from '../game/types.js';
import { hash01 } from './primitives.js';
import type { Settlement } from './settlements.js';
import type { worldSnapshot } from './world-model.js';

type Snapshot = ReturnType<typeof worldSnapshot>;

export interface PedestrianSpec { settlementIndex: number; offset: number; speed: number; lane: number; seed: number; }
export interface VehicleSpec { fromX: number; toX: number; lane: number; speed: number; phase: number; seed: number; }
export interface AircraftSpec { fromX: number; toX: number; altitude: number; speed: number; phase: number; }
export interface OrbitalSpec { altitude: number; speed: number; phase: number; }
export interface LaunchSpec { x: number; period: number; offset: number; }
export interface AgentPlan { pedestrians: PedestrianSpec[]; vehicles: VehicleSpec[]; aircraft: AircraftSpec[]; orbital: OrbitalSpec[]; launches: LaunchSpec[]; }

export function agentPlanTotal(plan: AgentPlan): number {
  return plan.pedestrians.length + plan.vehicles.length + plan.aircraft.length + plan.orbital.length + plan.launches.length;
}

export function agentPlan(civ: Civilization, snapshot: Snapshot, settlements: Settlement[]): AgentPlan {
  const budget = snapshot.agentBudget;
  const seed = civ.seed;
  const plan: AgentPlan = { pedestrians: [], vehicles: [], aircraft: [], orbital: [], launches: [] };
  if (!settlements.length) return plan;

  // Pedestrians are distributed across settlements proportionally to how much is built there.
  const totalStructures = settlements.reduce((sum, settlement) => sum + settlement.structures.length, 0) || 1;
  for (let i = 0; i < budget.pedestrians; i++) {
    let target = (i / budget.pedestrians) * totalStructures;
    let settlementIndex = settlements.length - 1;
    for (let s = 0; s < settlements.length; s++) {
      target -= settlements[s]!.structures.length;
      if (target < 0) { settlementIndex = s; break; }
    }
    plan.pedestrians.push({
      settlementIndex,
      offset: hash01(seed + i * 13 + 5),
      speed: .35 + hash01(seed + i * 29) * .8,
      lane: i % 3,
      seed: seed + i * 7,
    });
  }

  // Vehicles ride the road between two settlement centers, so traffic connects places.
  for (let i = 0; i < budget.vehicles; i++) {
    const from = settlements[i % settlements.length]!;
    const to = settlements[(i + 1) % settlements.length]!;
    const same = settlements.length < 2;
    plan.vehicles.push({
      fromX: same ? from.centerX - from.radius : from.centerX,
      toX: same ? from.centerX + from.radius : to.centerX,
      lane: i % 3,
      speed: .5 + hash01(seed + i * 47) * .9,
      phase: hash01(seed + i * 31),
      seed: seed + i * 19,
    });
  }

  for (let i = 0; i < budget.aircraft; i++) {
    const from = settlements[i % settlements.length]!;
    const to = settlements[(i + settlements.length - 1) % settlements.length]!;
    plan.aircraft.push({
      fromX: from.centerX,
      toX: settlements.length < 2 ? from.centerX + from.radius * 4 : to.centerX,
      altitude: .16 + hash01(seed + i * 23) * .2,
      speed: .25 + hash01(seed + i * 5) * .5,
      phase: hash01(seed + i * 71),
    });
  }

  for (let i = 0; i < budget.orbital; i++) {
    plan.orbital.push({ altitude: .06 + hash01(seed + i * 11) * .1, speed: .08 + hash01(seed + i * 101) * .12, phase: hash01(seed + i * 61) });
  }

  const pads = settlements.flatMap(settlement => settlement.structures.filter(structure => structure.kind === 'spaceport' || structure.kind === 'orbital_anchor'));
  for (let i = 0; i < Math.min(budget.launches, pads.length); i++) {
    plan.launches.push({ x: pads[i]!.x, period: 9000 + hash01(seed + i * 83) * 7000, offset: hash01(seed + i * 37) * 9000 });
  }

  return plan;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/game/src/render/agents.ts public/game/dist/render/agents.js public/game/tests/presentation.test.mjs
git commit -m "feat(render): plan pedestrians, road traffic, air corridors and launches"
```

---

### Task 9: Construction tracker

**Files:**
- Create: `public/game/src/render/construction.ts`
- Test: `public/game/tests/presentation.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `CONSTRUCTION_MS: 1800`, `CONSTRUCTION_REDUCED_MS: 400`, `class ConstructionTracker` with `constructor(duration?: number)`, `sync(structures: ReadonlyArray<{ id: string; level: number }>, now: number): void`, `prune(now: number): void`, `isBuilding(id: string, now: number): boolean`, `progress(id: string, now: number): number`, `get activeCount(): number`, `reset(): void`.

`progress` returns `1` for anything not currently building, so callers can treat "finished" and "never started" identically.

- [ ] **Step 1: Write the failing test**

Append to `public/game/tests/presentation.test.mjs`:

```javascript
test('construction tracker only animates actual level increases', () => {
  const tracker = new ConstructionTracker(1800);
  tracker.sync([{ id: 'a', level: 1 }, { id: 'b', level: 2 }], 0);
  assert.equal(tracker.activeCount, 0, 'the first observation must not animate the whole world');

  tracker.sync([{ id: 'a', level: 1 }, { id: 'b', level: 2 }], 100);
  assert.equal(tracker.activeCount, 0, 'an unchanged level must not animate');

  tracker.sync([{ id: 'a', level: 3 }, { id: 'b', level: 2 }], 200);
  assert.equal(tracker.activeCount, 1);
  assert.ok(tracker.isBuilding('a', 200));
  assert.ok(!tracker.isBuilding('b', 200));
  assert.equal(tracker.progress('a', 200), 0);
  assert.ok(Math.abs(tracker.progress('a', 1100) - .5) < 1e-9);
  assert.equal(tracker.progress('b', 200), 1, 'idle structures report finished');

  tracker.sync([{ id: 'a', level: 2 }], 300);
  assert.equal(tracker.activeCount, 1, 'a level decrease must not open a window');

  tracker.prune(1999);
  assert.equal(tracker.activeCount, 1);
  tracker.prune(2001);
  assert.equal(tracker.activeCount, 0);
  assert.equal(tracker.progress('a', 2001), 1);
});

test('construction tracker resets cleanly', () => {
  const tracker = new ConstructionTracker(1800);
  tracker.sync([{ id: 'a', level: 1 }], 0);
  tracker.sync([{ id: 'a', level: 4 }], 10);
  assert.equal(tracker.activeCount, 1);
  tracker.reset();
  assert.equal(tracker.activeCount, 0);
  tracker.sync([{ id: 'a', level: 9 }], 20);
  assert.equal(tracker.activeCount, 0, 'after a reset the next observation is a fresh baseline');
});
```

Add to the imports:

```javascript
import { ConstructionTracker, CONSTRUCTION_MS, CONSTRUCTION_REDUCED_MS } from '../dist/render/construction.js';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../dist/render/construction.js'`.

- [ ] **Step 3: Write the implementation**

Create `public/game/src/render/construction.ts`:

```typescript
export const CONSTRUCTION_MS = 1800;
export const CONSTRUCTION_REDUCED_MS = 400;

/**
 * Presentation-only timing for structure upgrades. Owned by the renderer, discarded on teardown,
 * never part of GameState. The first observation of a structure establishes a baseline without
 * animating, so loading a save does not put the entire world under scaffolding.
 */
export class ConstructionTracker {
  private levels = new Map<string, number>();
  private active = new Map<string, number>();

  constructor(private duration: number = CONSTRUCTION_MS) {}

  sync(structures: ReadonlyArray<{ id: string; level: number }>, now: number): void {
    for (const structure of structures) {
      const previous = this.levels.get(structure.id);
      if (previous !== undefined && structure.level > previous) this.active.set(structure.id, now);
      this.levels.set(structure.id, structure.level);
    }
  }

  prune(now: number): void {
    for (const [id, startedAt] of this.active) if (now - startedAt >= this.duration) this.active.delete(id);
  }

  isBuilding(id: string, now: number): boolean {
    const startedAt = this.active.get(id);
    return startedAt !== undefined && now - startedAt < this.duration;
  }

  progress(id: string, now: number): number {
    const startedAt = this.active.get(id);
    if (startedAt === undefined || now - startedAt >= this.duration) return 1;
    return Math.max(0, (now - startedAt) / this.duration);
  }

  get activeCount(): number { return this.active.size; }

  reset(): void { this.levels.clear(); this.active.clear(); }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/game/src/render/construction.ts public/game/dist/render/construction.js public/game/tests/presentation.test.mjs
git commit -m "feat(render): track structure upgrades for construction animation"
```

---

### Task 10: Structural key covers species, factions and settlement classes

**Files:**
- Modify: `public/game/src/render/world-presentation.ts:1-97`
- Test: `public/game/tests/presentation.test.mjs`

**Interfaces:**
- Consumes: `mixColor`, `pathAccentFor` from `./primitives.js`; `speciesProfile` from `./species.js`; `factionSignature` from `./factions.js`; `settlementClassSignature` from `./settlements.js`.
- Produces: unchanged public API. `worldPresentation` and `structuralWorldKey` keep their signatures; the key string gains three trailing segments.

- [ ] **Step 1: Write the failing test**

Append to `public/game/tests/presentation.test.mjs`:

```javascript
test('structural key reacts to species, factions and settlement classes but not to ticks', () => {
  const civ = lateCiv(71);
  const base = structuralWorldKey(civ, 800);
  civ.development += 1;
  assert.equal(structuralWorldKey(civ, 800), base, 'a one-point development tick must not rebuild the world');
  civ.elapsedSeconds += 12; civ.years += 40;
  assert.equal(structuralWorldKey(civ, 800), base, 'elapsed time must not rebuild the world');

  const withSpecies = lateCiv(71);
  withSpecies.traits.push('fungal_consensus');
  assert.notEqual(structuralWorldKey(withSpecies, 800), base, 'a different species must rebuild the world');

  const withFaction = lateCiv(71);
  withFaction.pathState.affinity.machine_faith = 7;
  withFaction.pathState.affinity.void_communion = 1;
  assert.notEqual(structuralWorldKey(withFaction, 800), base, 'a faction split must rebuild the world');

  const grown = lateCiv(71);
  grown.era = 4; grown.development = 3000;
  assert.notEqual(structuralWorldKey(grown, 800), base);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL on the "a different species must rebuild the world" assertion — the current key ignores traits entirely.

- [ ] **Step 3: Write the implementation**

In `public/game/src/render/world-presentation.ts`:

1. Delete the local `PATH_ACCENTS` constant (lines 4-15) and the local `mix` function, and replace the import block at the top with:

```typescript
import type { Civilization } from '../game/types.js';
import { developmentStage, worldSnapshot } from './world-model.js';
import { mixColor as mix, pathAccentFor } from './primitives.js';
import { speciesProfile } from './species.js';
import { factionSignature } from './factions.js';
import { settlementClassSignature } from './settlements.js';
```

2. In `worldPresentation`, replace the accent line with:

```typescript
  const accent = pathAccentFor(civ.pathState.dominantPath);
```

3. In `structuralWorldKey`, append three entries to the array, after `presentation.bands.entropy`:

```typescript
    speciesProfile(civ).archetype,
    factionSignature(civ),
    settlementClassSignature(civ, snapshot),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS. The existing tests `structural world key ignores tiny ticks but changes for meaningful state bands`, `presentation palette reacts to every strategic world state`, and `Entropy changes presentation in stable structural bands` must all still pass unchanged.

- [ ] **Step 5: Commit**

```bash
git add public/game/src/render/world-presentation.ts public/game/dist/render/world-presentation.js public/game/tests/presentation.test.mjs
git commit -m "feat(render): fold species, factions and settlement classes into the structural key"
```

---

### Task 11: Wire the renderer onto the new systems

**Files:**
- Modify: `public/game/src/render/world.ts` (whole file)
- Test: `public/game/tests/presentation.test.mjs`, `public/game/tests/browser-shell.test.mjs`

**Interfaces:**
- Consumes: everything produced by Tasks 1–10.
- Produces: unchanged public API — `startWorldRenderer(engine, host): WorldController` with `nudge(direction)` and `destroy()`. `buildingLayout` and `interface BuildingShape` are deleted.

This is the integration task. It is large, so work through the sub-steps in order and run `npm test` after each commit point.

- [ ] **Step 1: Write the failing test**

Append to `public/game/tests/presentation.test.mjs`:

```javascript
test('world module no longer carries its own layout or hash helpers', async () => {
  const source = await readFile(new URL('../src/render/world.ts', import.meta.url), 'utf8');
  assert.ok(!source.includes('function buildingLayout'), 'buildingLayout must move to settlements.ts');
  assert.ok(!source.includes('function hash01'), 'hash01 must move to primitives.ts');
  assert.ok(!source.includes('interface BuildingShape'), 'BuildingShape is replaced by Structure');
  assert.ok(!source.includes('drawCanvasDecisionImpulse'), 'the impulse renderer must be unified via DrawSurface');
  assert.ok(source.includes('canvasSurface('), 'the Canvas path must draw through DrawSurface');
  assert.ok(source.includes('phaserSurface('), 'the Phaser path must draw through DrawSurface');
  assert.ok(source.includes('drawCreature('), 'inhabitants must be rendered');
  assert.ok(source.includes('drawBanner('), 'faction banners must be rendered');
  assert.ok(source.includes('ConstructionTracker'), 'construction animation must be wired in');
});
```

Add to the imports at the top of the test file:

```javascript
import { readFile } from 'node:fs/promises';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `buildingLayout must move to settlements.ts`.

- [ ] **Step 3a: Replace the module header**

In `public/game/src/render/world.ts`, replace lines 1-40 (everything from the first `import` down to and including the closing brace of `buildingLayout`) with:

```typescript
import type { GameEngine } from '../game/engine.js';
import type { Civilization, DecisionFeedback } from '../game/types.js';
import { CivilizationPaths } from '../game/paths.js';
import { developmentStage, worldSnapshot } from './world-model.js';
import { decisionImpulseKind, entropyThresholdColor, structuralWorldKey, worldPresentation } from './world-presentation.js';
import { hash01, mixColor } from './primitives.js';
import { canvasSurface, phaserSurface, type DrawSurface } from './draw-surface.js';
import { settlementLayout, type Settlement, type Structure } from './settlements.js';
import { drawBanner, drawStructure } from './structures.js';
import { casteFor, drawCreature, speciesProfile, type SpeciesProfile } from './species.js';
import { agentPlan, type AgentPlan } from './agents.js';
import { CONSTRUCTION_MS, CONSTRUCTION_REDUCED_MS, ConstructionTracker } from './construction.js';
import { factionRoster, UNALIGNED_COLOR, type Faction } from './factions.js';

export interface WorldController { nudge(direction: number): void; destroy(): void; }

const DYNAMIC_FRAME_MS = 33;
const devicePixelRatio = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const CONSTRUCTION_DURATION = reducedMotion ? CONSTRUCTION_REDUCED_MS : CONSTRUCTION_MS;
const GROUND_RATIO = .72;

interface WorldLayers { skyLayer: any; terrainLayer: any; settlementLayer: any; atmosphereLayer: any; impulseLayer: any; }

interface WorldScene {
  civ: Civilization;
  snapshot: ReturnType<typeof worldSnapshot>;
  presentation: ReturnType<typeof worldPresentation>;
  settlements: Settlement[];
  structures: Structure[];
  plan: AgentPlan;
  species: SpeciesProfile;
  roster: Faction[];
}

function buildScene(civ: Civilization, width: number, height: number): WorldScene {
  const snapshot = worldSnapshot(civ, width);
  const presentation = worldPresentation(civ);
  const settlements = settlementLayout(civ, snapshot.worldWidth, height, snapshot);
  const structures = settlements.flatMap(settlement => settlement.structures);
  return { civ, snapshot, presentation, settlements, structures, plan: agentPlan(civ, snapshot, settlements), species: speciesProfile(civ), roster: factionRoster(civ) };
}

function factionColor(scene: WorldScene, settlement: Settlement): number {
  return settlement.factionIndex >= 0 ? (scene.roster[settlement.factionIndex]?.color ?? UNALIGNED_COLOR) : UNALIGNED_COLOR;
}
```

- [ ] **Step 3b: Rewrite the static draw functions against `DrawSurface`**

Replace `drawSky`, `drawTerrain` and `drawSettlement` with these. They take a `DrawSurface` instead of a Phaser layer, so the Canvas path calls exactly the same code.

```typescript
function drawSkyContent(surface: DrawSurface, scene: WorldScene, height: number): void {
  const { civ, snapshot, presentation } = scene;
  const worldWidth = snapshot.worldWidth;
  surface.fillStyle(presentation.colors.skyTop, 1).fillRect(0, 0, worldWidth, height * .48);
  surface.fillStyle(presentation.colors.skyBottom, 1).fillRect(0, height * .48, worldWidth, height * .52);
  for (let band = 0; band < 5; band++) {
    surface.fillStyle(presentation.colors.haze, .025 + presentation.attention * .018).fillRect(0, height * (.24 + band * .085), worldWidth, height * .08);
  }
  for (let i = 0; i < snapshot.particleCount; i++) {
    surface.fillStyle(i % 9 === 0 ? presentation.accent : 0xc9e1ff, .18 + hash01(i * 41) * (.38 + presentation.awareness * .22))
      .fillCircle(hash01(civ.seed + i * 17) * worldWidth, hash01(civ.seed + i * 31) * height * .58, .55 + hash01(i * 7) * 1.7);
  }
  if (civ.stats.attention >= 60) {
    const observerX = worldWidth * (.72 + hash01(civ.seed) * .12);
    surface.fillStyle(presentation.accent, .035 + presentation.attention * .05).fillCircle(observerX, height * .18, 78);
    surface.lineStyle(1.5, presentation.accent, .12 + presentation.attention * .16).strokeCircle(observerX, height * .18, 42);
  }
}

function drawTerrainContent(surface: DrawSurface, scene: WorldScene, height: number): void {
  const { civ, snapshot, presentation } = scene;
  const worldWidth = snapshot.worldWidth;
  const horizon = height * .69;
  for (let i = 0; i < Math.ceil(worldWidth / 160) + 1; i++) {
    const x = i * 160 - 80;
    surface.fillStyle(presentation.colors.farTerrain, .82).fillTriangle(x, horizon, x + 110, horizon - 60 - hash01(civ.seed * 3 + i * 29) * 100, x + 230, horizon);
  }
  surface.fillStyle(presentation.colors.nearTerrain, .82).fillRect(0, horizon, worldWidth, height - horizon);
}

function drawSettlementContent(surface: DrawSurface, scene: WorldScene, height: number): void {
  const { civ, snapshot, presentation, settlements } = scene;
  const worldWidth = snapshot.worldWidth;
  const stage = snapshot.stage;
  const ground = height * GROUND_RATIO;
  surface.fillStyle(presentation.colors.nearTerrain, 1).fillRect(0, ground, worldWidth, height - ground);

  // Roads connect settlement centers rather than banding the whole world.
  if (stage > 0) {
    for (let i = 0; i < settlements.length; i++) {
      const from = settlements[i]!;
      const to = settlements[i + 1] ?? null;
      const left = to ? from.centerX : from.centerX - from.radius;
      const right = to ? to.centerX : from.centerX + from.radius;
      surface.fillStyle(0x11191f, .98).fillRect(Math.min(left, right), ground + 4, Math.abs(right - left), 12 + stage * 3);
      for (let dash = 0; dash * 42 < Math.abs(right - left); dash++) {
        surface.fillStyle(presentation.colors.window, .18).fillRect(Math.min(left, right) + dash * 42 + 10, ground + 10 + stage, 18, 2);
      }
    }
    if (stage >= 2) surface.lineStyle(2, presentation.accent, .24).line(0, ground - 9, worldWidth, ground - 9);
    if (stage >= 4) surface.lineStyle(2, presentation.accent, .4).line(0, ground - 18, worldWidth, ground - 18);
  } else {
    surface.fillStyle(0x493821, .98).fillRect(0, ground + 4, worldWidth, 11);
  }

  for (const settlement of settlements) {
    for (const structure of settlement.structures) {
      drawStructure(surface, structure, ground, presentation.colors.settlement, presentation.accent, presentation.colors.window, civ.seed);
    }
    if (stage > 0) {
      const tallest = settlement.structures.reduce((max, structure) => Math.max(max, structure.height), 0);
      surface.lineStyle(1.6, mixColor(factionColor(scene, settlement), 0x000000, .45), .9)
        .line(settlement.centerX, ground - tallest - 34, settlement.centerX, ground - tallest);
    }
  }
}
```

- [ ] **Step 3c: Rewrite the dynamic draw function**

Replace `drawAtmosphere` with `drawDynamicContent`, which now also draws inhabitants, road/air traffic, launches, banners and construction. `drawPathMotif` keeps its body but takes a `DrawSurface` — change its signature to `(surface: DrawSurface, civ, worldWidth, height, ground, time, accent)` and replace every `layer.lineBetween(` with `surface.line(` and every other `layer.` with `surface.`. Nothing else in it changes.

```typescript
function drawDynamicContent(surface: DrawSurface, scene: WorldScene, width: number, height: number, time: number, tracker: ConstructionTracker): void {
  const { civ, snapshot, presentation, settlements, plan, species } = scene;
  const animationTime = reducedMotion ? 0 : time;
  const worldWidth = snapshot.worldWidth;
  const ground = height * GROUND_RATIO;

  for (let i = 0; i < snapshot.hazeBands; i++) {
    const drift = (animationTime * (.002 + i * .00035)) % (width * .6);
    const y = height * (.28 + i * .07) + Math.sin(animationTime * .0005 + i) * (reducedMotion ? 0 : 4);
    surface.fillStyle(presentation.colors.haze, .02 + presentation.sanityDistortion * .025).fillRect(drift - width * .3, y, worldWidth * .34, 22 + i * 4);
  }

  // Inhabitants.
  for (const pedestrian of plan.pedestrians) {
    const settlement = settlements[pedestrian.settlementIndex];
    if (!settlement) continue;
    const travel = reducedMotion ? pedestrian.offset : (pedestrian.offset + animationTime * .000045 * pedestrian.speed) % 1;
    const x = settlement.centerX - settlement.radius + travel * settlement.radius * 2;
    const phase = reducedMotion ? 0 : (animationTime % species.gaitPeriod) / species.gaitPeriod;
    drawCreature(surface, species, casteFor(settlement.settlementClass), x, ground + 2 + pedestrian.lane * 3, .8 + snapshot.stage * .12, phase, presentation.accent);
  }

  // Road traffic.
  for (const vehicle of plan.vehicles) {
    const travel = reducedMotion ? vehicle.phase : (vehicle.phase + animationTime * .00002 * vehicle.speed) % 1;
    const x = vehicle.fromX + (vehicle.toX - vehicle.fromX) * travel;
    const length = 5 + snapshot.stage * 1.5;
    const y = ground + 8 + vehicle.lane * 4;
    surface.fillStyle(vehicle.seed % 2 ? presentation.accent : presentation.colors.window, .72).fillRect(x, y, length, 2.5);
    if (civ.era >= 2) surface.fillStyle(presentation.accent, .22).fillRect(x - length * .5, y + .8, length * .5, 1);
  }

  // Air corridors.
  for (const aircraft of plan.aircraft) {
    const travel = reducedMotion ? aircraft.phase : (aircraft.phase + animationTime * .000008 * aircraft.speed * 40) % 1;
    const x = aircraft.fromX + (aircraft.toX - aircraft.fromX) * travel;
    const y = height * aircraft.altitude;
    surface.lineStyle(1.5, presentation.accent, .62).line(x - 10, y, x + 10, y);
    surface.fillStyle(0xffffff, .82).fillCircle(x, y, 1.5);
  }

  for (const orbital of plan.orbital) {
    const x = ((orbital.phase + animationTime * .000003 * (1 + orbital.speed)) % 1) * worldWidth;
    surface.lineStyle(1, presentation.accent, .44).strokeRect(x - 3, height * orbital.altitude - 2, 6, 4);
  }

  // Launches.
  for (const launch of plan.launches) {
    const cycle = ((animationTime + launch.offset) % launch.period) / launch.period;
    if (cycle > .42) continue;
    const rise = cycle / .42;
    const y = ground - rise * height * .78;
    surface.fillStyle(presentation.accent, .9).fillRect(launch.x - 1.6, y, 3.2, 9);
    surface.fillStyle(0xffd9a0, .5 * (1 - rise)).fillTriangle(launch.x - 3, y + 9, launch.x, y + 9 + 16 * (1 - rise), launch.x + 3, y + 9);
  }

  // Banners and construction.
  for (const settlement of settlements) {
    if (snapshot.stage === 0) continue;
    const tallest = settlement.structures.reduce((max, structure) => Math.max(max, structure.height), 0);
    const owner = settlement.factionIndex >= 0 ? scene.roster[settlement.factionIndex] : null;
    drawBanner(surface, settlement.centerX, ground - tallest - 34, 34, owner?.color ?? UNALIGNED_COLOR, owner?.sigil ?? 'node', reducedMotion ? 0 : (animationTime % 2600) / 2600);
    for (const structure of settlement.structures) {
      if (!tracker.isBuilding(structure.id, time)) continue;
      const progress = tracker.progress(structure.id, time);
      const top = ground - structure.height;
      const buildY = ground - structure.height * progress;
      surface.fillStyle(presentation.colors.skyBottom, .88).fillRect(structure.x - structure.width / 2 - 1, top, structure.width + 2, Math.max(0, buildY - top));
      surface.lineStyle(1.4, 0xf2cd7b, .7).line(structure.x - structure.width * .7, buildY, structure.x + structure.width * .7, buildY);
      surface.lineStyle(1, 0xf2cd7b, .34).line(structure.x - structure.width * .6, ground, structure.x - structure.width * .6, top);
      surface.lineStyle(1, 0xf2cd7b, .34).line(structure.x + structure.width * .6, ground, structure.x + structure.width * .6, top);
      for (let spark = 0; spark < 3; spark++) {
        surface.fillStyle(0xffd9a0, .6).fillCircle(structure.x + (hash01(spark * 31 + Math.trunc(time / 90)) - .5) * structure.width, buildY + hash01(spark * 17 + Math.trunc(time / 90)) * 6, 1.1);
      }
    }
  }

  for (let i = 0; i < snapshot.fractureCount; i++) {
    const x = worldWidth * hash01(civ.seed + i * 61);
    surface.lineStyle(1.4, 0xee6973, .24 + presentation.danger * .42).line(x, ground + 2, x + (hash01(i * 11) - .5) * 46, ground + 24 + hash01(i * 17) * 34);
  }
  for (let i = 0; i < snapshot.beaconCount; i++) {
    const x = worldWidth * (.08 + hash01(civ.seed + i * 97) * .84);
    const pulse = reducedMotion ? 1 : .7 + Math.sin(animationTime * .003 + i) * .3;
    surface.lineStyle(1, presentation.accent, .16 + presentation.awareness * .25 * pulse).strokeCircle(x, ground - 55 - (i % 3) * 28, 10 + pulse * 8);
  }
  if (presentation.sanityDistortion > .18) {
    for (let i = 0; i < 3; i++) {
      const wobble = reducedMotion ? 0 : Math.sin(animationTime * .0014 + i) * 9 * presentation.sanityDistortion;
      surface.lineStyle(1, 0xb68cff, .08 + presentation.sanityDistortion * .13).strokeCircle(worldWidth * (.22 + i * .29) + wobble, height * (.28 + i * .04), 35 + i * 17);
    }
  }
  drawPathMotif(surface, civ, worldWidth, height, ground, animationTime, presentation.accent);
}
```

- [ ] **Step 3d: Unify the decision impulse**

Delete `drawCanvasDecisionImpulse` entirely and change `drawDecisionImpulse` to take a `DrawSurface` as its first parameter. Replace every `layer.lineStyle(...).lineBetween(` with `surface.lineStyle(...).line(`, every `layer.fillStyle` with `surface.fillStyle`, every `layer.strokeCircle` / `layer.fillCircle` with the surface equivalent, and replace the `beginPath().arc(...).strokePath()` chain — there is none in this function — leaving the logic byte-for-byte identical otherwise. Both backends now call the single function.

- [ ] **Step 3e: Rewire `FallbackWorld`**

In `FallbackWorld`:
- Replace the `snapshot`/`buildings` fields with `private scene: WorldScene | null = null;` and `private tracker = new ConstructionTracker(CONSTRUCTION_DURATION);`.
- In `drawStatic`, build a surface once per parallax band and call the shared content functions:

```typescript
  private drawStatic(scene: WorldScene): void {
    const context = this.staticContext;
    const surface = canvasSurface(context, (value, alpha = 1) => this.color(value, alpha));
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    context.clearRect(0, 0, this.width, this.height);
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, -this.scroll * .1 * devicePixelRatio, 0);
    drawSkyContent(surface, scene, this.height);
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, -this.scroll * .52 * devicePixelRatio, 0);
    drawTerrainContent(surface, scene, this.height);
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, -this.scroll * devicePixelRatio, 0);
    drawSettlementContent(surface, scene, this.height);
    context.setTransform(1, 0, 0, 1, 0, 0);
  }
```

- Delete `drawFallbackPath` — `drawPathMotif` now serves both backends.
- Replace `drawDynamic` with:

```typescript
  private drawDynamic(time: number, scene: WorldScene): void {
    const context = this.dynamicContext;
    const surface = canvasSurface(context, (value, alpha = 1) => this.color(value, alpha));
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    context.clearRect(0, 0, this.width, this.height);
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, -this.scroll * devicePixelRatio, 0);
    drawDynamicContent(surface, scene, this.width, this.height, time, this.tracker);
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    const feedback = this.engine.worldImpulse;
    if (feedback && feedback.sequence !== this.feedbackSequence) { this.feedbackSequence = feedback.sequence; this.feedbackStartTime = time; }
    if (feedback && this.feedbackStartTime > 0) drawDecisionImpulse(surface, feedback, this.feedbackStartTime, time, this.width, this.height);
    context.setTransform(1, 0, 0, 1, 0, 0);
  }
```

- In `loop`, replace the snapshot/buildings block with:

```typescript
    const key = `${structuralWorldKey(civ, this.width)}|${Math.round(this.height / 40)}|${civ.traits.join(',')}`;
    if (key !== this.lastStructuralKey || this.scroll !== this.lastStaticScroll) {
      this.lastStructuralKey = key; this.lastStaticScroll = this.scroll;
      this.scene = buildScene(civ, rect.width, this.height);
      this.tracker.sync(this.scene.structures, time);
      this.drawStatic(this.scene);
    }
    if (!this.scene) return;
    this.tracker.prune(time);
    this.scroll = Math.max(0, Math.min(this.scene.snapshot.worldWidth - rect.width, this.scroll));
    this.drawDynamic(time, this.scene);
```

- In `destroy`, add `this.tracker.reset();`.

- [ ] **Step 3f: Rewire the Phaser scene**

In `startWorldRenderer`:
- Replace `cachedSnapshot`, `cachedPresentation`, `cachedBuildings` with `let scene_: WorldScene | null = null;` and `const tracker = new ConstructionTracker(CONSTRUCTION_DURATION);`.
- In `resetRenderState`, set `scene_ = null;` and call `tracker.reset();`.
- In `update`, replace the rebuild block with:

```typescript
          if (key !== lastStructuralKey) {
            lastStructuralKey = key;
            scene_ = buildScene(civ, width, height);
            tracker.sync(scene_.structures, time);
            drawSkyContent(phaserSurface(layers.skyLayer.clear()), scene_, height);
            drawTerrainContent(phaserSurface(layers.terrainLayer.clear()), scene_, height);
            drawSettlementContent(phaserSurface(layers.settlementLayer.clear()), scene_, height);
            this.cameras.main.setBounds(0, 0, scene_.snapshot.worldWidth, height);
            if (lastStage !== scene_.snapshot.stage) {
              lastStage = scene_.snapshot.stage;
              this.cameras.main.centerOn(scene_.snapshot.worldWidth * .5, height * .5);
            }
          }
          if (!scene_) return;
```

- Replace the dynamic block with:

```typescript
          if (time - lastDynamicFrame < (reducedMotion ? 180 : DYNAMIC_FRAME_MS)) return;
          lastDynamicFrame = time;
          tracker.prune(time);
          layers.atmosphereLayer.clear();
          drawDynamicContent(phaserSurface(layers.atmosphereLayer), scene_, width, height, time, tracker);
          layers.impulseLayer.clear();
          drawDecisionImpulse(phaserSurface(layers.impulseLayer), activeFeedback, feedbackStartTime, time, width, height);
```

Note `Graphics.clear()` returns the graphics object, so `phaserSurface(layer.clear())` is valid. `drawDecisionImpulse` must no longer call `layer.clear()` itself — remove that line from its body since the caller now clears.

- [ ] **Step 4: Run the full suite and check both renderers by hand**

Run: `npm test`
Expected: PASS, including the new source-shape test and every pre-existing test.

Run: `npm run lint` — expected: clean (note `public/game/**` is excluded from eslint, so this only covers the shell).
Run: `npm run typecheck` — expected: clean.

Then verify visually in both backends:

```bash
node public/game/server.mjs
```

Open the printed URL, start a civilization, and confirm: creatures walk in settlements, banners fly over settlement centers, structures differ by kind, and traffic runs between settlements. Then rename `public/game/vendor/phaser.min.js` to `phaser.min.js.off`, reload, and confirm the Canvas fallback shows the same content. Rename it back afterwards.

- [ ] **Step 5: Commit**

```bash
git add public/game/src/render/world.ts public/game/dist/render/world.js public/game/tests/presentation.test.mjs
git commit -m "feat(render): render species, factions, typed structures and construction in both backends"
```

---

### Task 12: Release wiring

**Files:**
- Modify: `public/sw.js:1`, `public/sw.js:10-14`
- Modify: `package.json:3`, `public/game/package.json:3`, `public/game/index.html:35`, `README.md:1`, `README.md:3`, `README.md:23`, `README.md:73`, `public/game/README.md:1`, `public/game/README.md:87`, `public/game/README.md:101`
- Modify: `CLAUDE.md:79`, `CLAUDE.md:100`

**Interfaces:**
- Consumes: the eight dist modules produced by Tasks 1–9.
- Produces: nothing consumed by other tasks. This is the last task.

The service worker precache is **hand-maintained** and serves cache-first with no revalidation. Skipping either half of this task means returning players never receive any of the new code.

- [ ] **Step 1: Write the failing test**

Append to `public/game/tests/presentation.test.mjs`:

```javascript
test('every render module is precached by the service worker', async () => {
  const source = await readFile(new URL('../../sw.js', import.meta.url), 'utf8');
  const modules = ['primitives', 'draw-surface', 'species', 'factions', 'settlements', 'structures', 'agents', 'construction', 'world', 'world-model', 'world-presentation'];
  for (const name of modules) {
    assert.ok(source.includes(`'/game/dist/render/${name}.js'`), `sw.js must precache render/${name}.js`);
  }
  assert.ok(!source.includes("'rce-app-v1.3.1'"), 'CACHE_NAME must be bumped for this release');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `sw.js must precache render/primitives.js`.

- [ ] **Step 3: Update the service worker and the version**

In `public/sw.js`, change line 1 to:

```javascript
const CACHE_NAME = 'rce-app-v1.4.0';
```

and replace the three existing render entries with all eleven:

```javascript
  '/game/dist/render/world.js',
  '/game/dist/render/world-model.js',
  '/game/dist/render/world-presentation.js',
  '/game/dist/render/primitives.js',
  '/game/dist/render/draw-surface.js',
  '/game/dist/render/species.js',
  '/game/dist/render/factions.js',
  '/game/dist/render/settlements.js',
  '/game/dist/render/structures.js',
  '/game/dist/render/agents.js',
  '/game/dist/render/construction.js',
```

Then bump `1.3.1` to `1.4.0` everywhere. Confirm the full list first:

```bash
grep -rn "1\.3\.1" --include=*.json --include=*.html --include=*.md --include=*.js . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=docs | grep -v package-lock
```

Expected hits to change: `package.json:3`, `public/game/package.json:3`, `public/game/index.html:35`, `public/sw.js:1`, `README.md` lines 1/3/23/73, `public/game/README.md` lines 1/87/101, `CLAUDE.md` lines 79/100. `tests/game-release.test.mjs` asserts the two `package.json` versions match, so they must be changed together.

In both READMEs, the `## v1.3.1 balance curve` heading describes balance that this release does not change — retitle it `## v1.4.0 balance curve` and add one line under it noting that the balance is unchanged from v1.3.1 and only the world renderer changed.

In `CLAUDE.md`, also update the "Design docs" paragraph so the newest dated document is this release's spec rather than the progression rebalance, and update the "Service worker" section to say the render module list is now eleven files.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS, including `tests/game-release.test.mjs`.

Run: `npm run lint` and `npm run typecheck` — expected: clean.

- [ ] **Step 5: Commit**

```bash
git add public/sw.js package.json public/game/package.json public/game/index.html README.md public/game/README.md CLAUDE.md public/game/tests/presentation.test.mjs
git commit -m "chore: release v1.4.0 with the expanded civilization renderer"
```

---

## Self-review

**Spec coverage.** Every spec section maps to a task: shared drawing surface → Task 2; species derivation and castes → Task 3; factions and signature → Task 4; agent budget → Task 5; settlements, classes, structure kinds → Tasks 6 and 7; traffic, air corridors, launches → Task 8; banners → Task 7 (drawing) and Task 11 (placement); construction animation → Tasks 9 and 11; structural key → Task 10; the `world.ts` migration → Task 11; the release checklist → Task 12. The spec's nine numbered test cases are covered by Tasks 1–10.

**Deviations recorded.** Two, both stated above: the eighth module `primitives.ts` (cycle break), and `settlementClassSignature` computing class counts from `settlementSizes` rather than from full geometry — cheaper, and the geometry does not affect the class.

**Type consistency.** `Snapshot = ReturnType<typeof worldSnapshot>` is used identically in Tasks 6 and 8. `Structure.id` is produced in Task 6 (`s<settlement>:<index>`) and consumed by `ConstructionTracker` in Task 9 and by `drawStructure` in Task 7. `casteFor` takes `string`, not `SettlementClass`, so Task 3 stays free of a `settlements.ts` import. `factionIndex` is `-1` for unaligned settlements in Task 6 and every read site in Task 11 guards on `>= 0`.
