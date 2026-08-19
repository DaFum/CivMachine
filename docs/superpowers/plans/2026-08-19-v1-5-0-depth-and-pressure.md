# v1.5.0 Cultivation Depth and Continuous Pressure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace binary survival, a constant run length and a capped credit economy with a continuous containment curve, a continuous Cultivation Depth that carries a push-your-luck decision, an Entropy Vent, mid-run machine interventions, and enough intervention supply to sustain a fifteen-minute run.

**Architecture:** Every new rule lands in a pure module under `public/game/src/game/` or a data module under `public/game/src/data/`; `GameEngine` only composes them, and `ui/view-model.ts` only presents them. The generated catalog stays frozen: cost and description changes are layered through `game/upgrade-balance.ts`, era ceilings through `data/intervention-copy.ts`, and new events through a sibling of `data/entropy-crises.ts`.

**Tech Stack:** Framework-free TypeScript compiled by `tsc` to plain ESM, `node:test` with `node:assert/strict`, Canvas 2D renderer, no bundler.

## Global Constraints

- Spec of record: `docs/superpowers/specs/2026-08-19-v1-5-0-depth-and-pressure-design.md`. Every number in this plan is copied from it.
- Relative imports inside `public/game/src` **must** carry the `.js` extension, even from `.ts` files (`moduleResolution: Node16`, enforced as `TS2835`).
- Game code is deliberately dense: multiple statements per line, minimal whitespace. Match the surrounding file; never reformat it.
- Player-facing game copy is **English**. The Next shell stays German.
- `public/game/dist/` is committed and is what the browser loads. `tsc -p public/game/tsconfig.json` must run before any claim that a game change works; `npm test` does this for you.
- Never hand-edit `public/game/src/data/content.generated.ts`.
- Structural keys (`civilizationRenderKey`, `structuralWorldKey`) may contain bands and booleans only, never a continuously ticking number.
- Ticking must not write `localStorage` and must not rebuild interactive controls.
- `SAVE_VERSION` becomes 3. Existing v2 saves are discarded by the version gate; there is no migration.
- Version `1.5.0` must appear in `package.json`, `public/game/package.json`, the `public/game/index.html` footer, `CACHE_NAME` in `public/sw.js`, `README.md` and `public/game/README.md`.
- Every new `dist/` module must be added to `APP_ASSETS` in `public/sw.js`.
- Run the whole suite with `npm test` from the repository root. Run one game file with `node --test public/game/tests/core.test.mjs`.

---

## File Structure

**Created**

| File | Responsibility |
| --- | --- |
| `public/game/src/game/run-interventions.ts` | The three mid-run machine interventions: definitions, escalating cost, per-run use limits, effect application. |
| `public/game/src/data/apotheosis-events.ts` | Twelve hand-written Apotheosis interventions appended to the event pool. |
| `public/game/tests/balance-harness.mjs` | Headless run driver shared by the deterministic balance tests: policies, survival measurement, intervention logging. |

**Modified**

| File | Change |
| --- | --- |
| `public/game/src/game/pressure.ts` | Rewritten: continuous rate, closed-form cascade estimate, proportional cascade decay. `requiredContainment` and `entropyGainMult` removed. |
| `public/game/src/game/rules.ts` | `eraForYears`, four era thresholds, era clamp to 3, both prestige award formulas, `SAVE_VERSION` 3. |
| `public/game/src/game/harvest-quality.ts` | Cultivation Depth, five bands, continuous yield multiplier and credit curve, chaotic credit retention. |
| `public/game/src/game/tactical-actions.ts` | Vent action, `Accelerate` entropy 7 to 5. |
| `public/game/src/game/intervention-scheduler.ts` | Third pool stage, `exhausted` predicate, fourth phase-weight row, fourth delay window. |
| `public/game/src/game/paths.ts` | Path succession, `endgameStates`, `successions`. |
| `public/game/src/game/upgrade-balance.ts` | `reality_lattice` 60/1.55, repurposed Universe descriptions, universe growth floor 1.75. |
| `public/game/src/game/progression.ts` | `era_apotheosis` milestone, run-intervention insight gates helper. |
| `public/game/src/game/types.ts` | `vent` action id, `singular` grade, `runInterventionUses`, `successions`, `endgameStates`, `RuntimeBonuses` without `entropyGainMult`. |
| `public/game/src/game/engine.ts` | Composition: containment sum, era transitions, cascade call, depth in harvest, event pool assembly, `useRunIntervention`, `resetMachineLayer` inheritance, credit-based prestige. |
| `public/game/src/data/intervention-copy.ts` | `applyEraCeiling` layering function. |
| `public/game/src/ui/view-model.ts` | Pressure and depth readouts, machine reserve, vent availability, revised render key. |
| `public/game/src/ui/app.ts` | Vent control, reserve panel, cascade and depth readouts, key `4`. |
| `public/game/src/render/world-presentation.ts` | Depth band in `structuralWorldKey`. |
| `public/game/src/main.ts` | Key `4` binding. |
| `public/sw.js` | `CACHE_NAME` 1.5.0, new modules in `APP_ASSETS`. |
| `public/game/tests/core.test.mjs` | Legacy assertions replaced; new rule and balance tests. |
| `public/game/tests/presentation.test.mjs` | New view-model readouts and key assertions. |
| `tests/game-release.test.mjs` | Version 1.5.0. |

**Legacy tests that will fail and must be rewritten, not deleted**

- `core.test.mjs` `'containment deficit accelerates entropy while rating suppresses it'` — asserts `entropyRate(0, 0, 1) === 0.32` against the old three-argument signature.
- `core.test.mjs` `'qualified grades award two, three, or four Cultivation Credits'` — asserts the removed four-step grade object.
- `core.test.mjs` `'chaotic harvests lose exactly one qualified Cultivation Credit'` — asserts the superseded flat minus one.
- `core.test.mjs` `'Temporal Injector improves Accelerate while Stable Constants and Bureaucracy improve pressure control'` — asserts `entropyGainMult`.
- Any test constructing `advancePressure(civ, { containmentRating, entropyGainMult }, dt)` keeps working; the extra property is ignored. Do not chase those.

---

# Stage 1 — Continuous pressure

After this stage the game is playable: survival scales smoothly with containment levels and a no-upgrade run dies in about 160 seconds.

### Task 1: Era thresholds and a single era computation

The era rule is currently duplicated at `engine.ts:133` and `engine.ts:185`, which is why a fourth era would be easy to half-implement. Extract it first.

**Files:**
- Modify: `public/game/src/game/rules.ts`
- Modify: `public/game/src/game/engine.ts:16-17` (era constants), `:133`, `:185`
- Test: `public/game/tests/core.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `ERA_YEAR_THRESHOLDS: readonly [0, 2500, 6500, 14000]`, `eraForYears(years: number): number` from `game/rules.js`; `ERA_NAMES: string[]` from `game/engine.js` gains a fourth entry.

- [ ] **Step 1: Write the failing test**

Append to `public/game/tests/core.test.mjs`:

```js
test('eraForYears is the single source of truth for the four eras', () => {
  assert.equal(eraForYears(0), 0);
  assert.equal(eraForYears(2499), 0);
  assert.equal(eraForYears(2500), 1);
  assert.equal(eraForYears(6499), 1);
  assert.equal(eraForYears(6500), 2);
  assert.equal(eraForYears(13999), 2);
  assert.equal(eraForYears(14000), 3);
  assert.equal(eraForYears(999999), 3);
  assert.equal(eraForYears(-50), 0);
  assert.deepEqual([...ERA_YEAR_THRESHOLDS], [0, 2500, 6500, 14000]);
  assert.equal(ERA_NAMES.length, 4);
  assert.equal(ERA_NAMES[3], 'APOTHEOSIS');
});
```

Extend the import at the top of the file:

```js
import { createNewState, calculateHarvest, upgradeCost, eraForYears, ERA_YEAR_THRESHOLDS } from '../dist/game/rules.js';
import { GameEngine, ERA_NAMES } from '../dist/game/engine.js';
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL with `eraForYears is not a function`.

- [ ] **Step 3: Add the rule to `rules.ts`**

Insert after the `RESOURCE_KEYS` declaration:

```ts
export const ERA_YEAR_THRESHOLDS = [0, 2500, 6500, 14000] as const;

export function eraForYears(years: number): number {
  const safe = Math.max(0, Number(years) || 0);
  for (let era = ERA_YEAR_THRESHOLDS.length - 1; era > 0; era--) if (safe >= ERA_YEAR_THRESHOLDS[era]!) return era;
  return 0;
}
```

Change `SAVE_VERSION` in the same file:

```ts
export const SAVE_VERSION = 3;
```

- [ ] **Step 4: Use it in `engine.ts`**

Replace lines 16-17:

```ts
export const ERA_NAMES=['EMERGENCE','EXPANSION','TRANSCENDENCE','APOTHEOSIS'];
```

Delete the local `const ERA_YEARS=[0,2500,6500];` and add `ERA_YEAR_THRESHOLDS, eraForYears` to the existing `./rules.js` import. In `startCivilization` replace `civ.years=ERA_YEARS[era]!;` with `civ.years=ERA_YEAR_THRESHOLDS[era]!;`. Replace the duplicated era computation at both `:133` and `:185`:

```ts
const newEra=eraForYears(civ.years);
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add public/game/src/game/rules.ts public/game/src/game/engine.ts public/game/dist public/game/tests/core.test.mjs
git commit -m "refactor: derive the era from one rule and add the Apotheosis threshold"
```

---

### Task 2: The continuous pressure rate

**Files:**
- Modify: `public/game/src/game/pressure.ts` (rewrite)
- Test: `public/game/tests/core.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: from `game/pressure.js` — `entropyRate(years: number, containment: number): number`, `pressureMultiplier(years: number): number`, `secondsToCascade(years: number, entropy: number, containment: number): number`, `cascadeDecay(entropy: number, stabilityMax: number): number`, `advancePressure(civ, bonuses: { containmentRating: number }, deltaSeconds: number): PressureAdvance`, and the constants `PRESSURE_BASE = 0.48`, `PRESSURE_YEAR_SCALE = 6500`, `CONTAINMENT_RELIEF = 0.4`, `CASCADE_DECAY_FRACTION = 0.07`. `requiredContainment` and `entropyGainMult` no longer exist.

- [ ] **Step 1: Write the failing tests**

Replace the existing `'containment deficit accelerates entropy while rating suppresses it'` test with:

```js
test('the entropy rate rises with years and falls with containment levels', () => {
  assert.equal(Number(entropyRate(0, 0).toFixed(4)), 0.48);
  assert.equal(Number(entropyRate(6500, 0).toFixed(4)), 0.96);
  assert.equal(Number(entropyRate(0, 4).toFixed(4)), 0.1846);
  assert.equal(Number(entropyRate(6500, 28).toFixed(4)), 0.0787);
  assert.ok(entropyRate(20000, 28) < entropyRate(20000, 14));
  for (let containment = 0; containment < 28; containment++) {
    assert.ok(entropyRate(6500, containment + 1) < entropyRate(6500, containment), `level ${containment + 1} must matter`);
  }
});

test('secondsToCascade matches numeric integration of the rate', () => {
  for (const containment of [0, 1, 4, 8, 14, 20, 28]) {
    const closed = secondsToCascade(0, 0, containment);
    let entropy = 0;
    let years = 0;
    let elapsed = 0;
    const step = 0.05;
    while (entropy < 100 && elapsed < 4000) {
      entropy += entropyRate(years, containment) * step;
      years += 25 * step;
      elapsed += step;
    }
    assert.ok(Math.abs(closed - elapsed) / elapsed < 0.01, `containment ${containment}: closed ${closed} vs numeric ${elapsed}`);
  }
});

test('the survival curve hits the published targets', () => {
  const expected = [[0, 159], [1, 208], [2, 252], [4, 331], [8, 463], [14, 625], [20, 761], [28, 921]];
  for (const [containment, target] of expected) {
    const actual = secondsToCascade(0, 0, containment);
    assert.ok(Math.abs(actual - target) <= 2, `containment ${containment}: ${actual}s, expected ${target}s`);
  }
});

test('cascade decay is proportional to maximum Stability', () => {
  assert.equal(cascadeDecay(99.9, 100), 0);
  assert.equal(cascadeDecay(100, 100), 7);
  assert.equal(Number(cascadeDecay(100, 425).toFixed(2)), 29.75);
  assert.equal(100 / cascadeDecay(100, 100), 425 / cascadeDecay(100, 425));
});
```

Extend the pressure import:

```js
import { advancePressure, cascadeDecay, entropyRate, pressureMultiplier, secondsToCascade } from '../dist/game/pressure.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test public/game/tests/core.test.mjs`
Expected: FAIL — `secondsToCascade is not a function` and the rate assertions mismatch.

- [ ] **Step 3: Rewrite `pressure.ts`**

```ts
import type { Civilization } from './types.js';

export const ENTROPY_THRESHOLDS = [25, 50, 75] as const;

export const ENTROPY_CRISIS_IDS: Readonly<Record<number, string>> = {
  25: 'entropy_crisis_25',
  50: 'entropy_crisis_50',
  75: 'entropy_crisis_75',
};

export const PRESSURE_BASE = 0.48;
export const PRESSURE_YEAR_SCALE = 6500;
export const CONTAINMENT_RELIEF = 0.4;
export const CASCADE_DECAY_FRACTION = 0.07;
const YEARS_PER_SECOND = 25;

export interface PressureAdvance {
  before: number;
  after: number;
  rate: number;
  queuedCrises: string[];
}

export function pressureMultiplier(years: number): number {
  return 1 + Math.max(0, Number(years) || 0) / PRESSURE_YEAR_SCALE;
}

function relief(containment: number): number {
  return 1 + CONTAINMENT_RELIEF * Math.max(0, Number(containment) || 0);
}

export function entropyRate(years: number, containment: number): number {
  return PRESSURE_BASE * pressureMultiplier(years) / relief(containment);
}

export function secondsToCascade(years: number, entropy: number, containment: number): number {
  const remaining = Math.max(0, 100 - (Number(entropy) || 0));
  if (remaining <= 0) return 0;
  const b = pressureMultiplier(years);
  const c = relief(containment) * remaining / PRESSURE_BASE;
  const k = YEARS_PER_SECOND / (2 * PRESSURE_YEAR_SCALE);
  return (-b + Math.sqrt(b * b + 4 * k * c)) / (2 * k);
}

export function advancePressure(
  civ: Civilization,
  bonuses: { containmentRating: number },
  deltaSeconds: number,
): PressureAdvance {
  const before = Math.max(0, Math.min(100, civ.tactical.entropy));
  const rate = entropyRate(civ.years, bonuses.containmentRating);
  const after = Math.max(0, Math.min(100, before + rate * Math.max(0, deltaSeconds)));
  civ.tactical.entropy = after;
  const queuedCrises: string[] = [];
  for (const threshold of ENTROPY_THRESHOLDS) {
    if (after >= threshold && !civ.tactical.triggeredCrises.includes(threshold)) {
      civ.tactical.triggeredCrises.push(threshold);
      const crisisId = ENTROPY_CRISIS_IDS[threshold];
      if (crisisId) queuedCrises.push(crisisId);
    }
  }
  return { before, after, rate, queuedCrises };
}

export function cascadeDecay(entropy: number, stabilityMax: number): number {
  return entropy >= 100 ? CASCADE_DECAY_FRACTION * Math.max(1, Number(stabilityMax) || 1) : 0;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test public/game/tests/core.test.mjs`
Expected: the four new tests PASS. Compile errors in `engine.ts` and `view-model.ts` are expected and fixed in Task 3.

- [ ] **Step 5: Commit**

```bash
git add public/game/src/game/pressure.ts public/game/tests/core.test.mjs
git commit -m "feat(pressure): replace the stepped entropy rate with a continuous curve"
```

---

### Task 3: Containment sums levels, and the engine consumes the new pressure

**Files:**
- Modify: `public/game/src/game/types.ts` (`RuntimeBonuses`)
- Modify: `public/game/src/game/engine.ts` (`runtimeBonuses`, `baseBonuses`, `tick`, `resetMachineLayer`)
- Modify: `public/game/src/game/upgrade-balance.ts`
- Modify: `public/game/src/ui/view-model.ts` (drop `requiredContainment`)
- Test: `public/game/tests/core.test.mjs`

**Interfaces:**
- Consumes: `entropyRate`, `cascadeDecay` from Task 2.
- Produces: `RuntimeBonuses.containmentRating` now the level sum of `reality_lattice`, `awareness_scrubber`, `sanity_protocol`, `cosmic_muffling` and the Universe upgrade `stable_constants`; `RuntimeBonuses.entropyGainMult` removed.

- [ ] **Step 1: Write the failing test**

```js
test('containment sums upgrade levels across both layers', () => {
  const engine = freshEngine();
  assert.equal(engine.runtimeBonuses().containmentRating, 0);
  engine.state.machine.upgradeLevels.reality_lattice = 3;
  assert.equal(engine.runtimeBonuses().containmentRating, 3);
  engine.state.machine.upgradeLevels.awareness_scrubber = 2;
  engine.state.machine.upgradeLevels.sanity_protocol = 1;
  engine.state.machine.upgradeLevels.cosmic_muffling = 1;
  engine.state.meta.universeUpgradeLevels.stable_constants = 5;
  assert.equal(engine.runtimeBonuses().containmentRating, 12);
  assert.equal(engine.runtimeBonuses().entropyGainMult, undefined);
});

test('Reality Lattice is reachable from the first cascade harvest', () => {
  const engine = freshEngine();
  const lattice = engine.upgradeById('machine', 'reality_lattice');
  assert.equal(lattice.base_cost, 60);
  assert.equal(lattice.growth, 1.55);
  assert.deepEqual(
    [0, 1, 2, 3].map(level => upgradeCost(lattice.base_cost, lattice.growth, level)),
    [60, 93, 144, 223],
  );
});

test('Wide Lattice preserves Reality Lattice levels through Universe consumption', () => {
  const engine = freshEngine();
  engine.state.machine.upgradeLevels.reality_lattice = 5;
  engine.state.meta.universeUpgradeLevels.wide_lattice = 2;
  engine.state.meta.progression.unlockedSystems.push('universe_prestige');
  engine.state.machine.cultivationCreditsThisUniverse = 18;
  assert.equal(engine.consumeUniverse(), true);
  assert.equal(engine.state.machine.upgradeLevels.reality_lattice, 2);
  assert.equal(engine.state.machine.upgradeLevels.awareness_scrubber, undefined);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test public/game/tests/core.test.mjs`
Expected: FAIL — containment 1 instead of 3, base cost 90 instead of 60.

- [ ] **Step 3: Update `types.ts`**

In `RuntimeBonuses`, delete the `entropyGainMult: number;` line. Leave `containmentRating: number;` in place.

- [ ] **Step 4: Update `upgrade-balance.ts`**

Replace the `reality_lattice` override and the two Universe descriptions, and lower the growth floor:

```ts
  reality_lattice: { base_cost: 60, growth: 1.55, description: '+1 Containment per level, which slows Entropy across every era. +10 starting and maximum Reality Stability per level.' },
```

```ts
const UNIVERSE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  stable_constants: '+1 Containment per level, stacking with every machine containment module.',
  wide_lattice: 'Preserves this many Reality Lattice levels through Universe consumption.',
  bureaucracy_of_gods: 'Restores +1 additional Control after interventions; at level 3 it restores the full capacity.',
};
```

```ts
export function balancedUniverseUpgrades<T extends { id: string; growth: number; description: string }>(catalog: readonly T[]): T[] {
  return catalog.map(definition => ({
    ...definition,
    growth: Math.max(1.75, Number(definition.growth)),
    description: UNIVERSE_DESCRIPTIONS[definition.id] ?? definition.description,
  }));
}
```

Also update the three other containment module descriptions so the interface stops promising the removed mechanic:

```ts
  awareness_scrubber: { base_cost: 150, growth: 1.68, description: '+1 Containment per level. Reduces Machine Awareness gain by 8% per level.' },
  sanity_protocol: { base_cost: 165, growth: 1.70, description: '+1 Containment per level. Reduces Collective Sanity losses by 8% per level.' },
  cosmic_muffling: { base_cost: 150, growth: 1.70, description: '+1 Containment per level. Reduces Cosmic Attention gain by 8% per level.' },
```

- [ ] **Step 5: Update `engine.ts`**

In `runtimeBonuses`, replace the containment computation:

```ts
    const containmentRating=['reality_lattice','awareness_scrubber','sanity_protocol','cosmic_muffling'].reduce((sum,id)=>sum+l('machine',id),0)+l('universe','stable_constants');
```

Delete the `const stableLevel=l('universe','stable_constants');` line and remove `entropyGainMult:Math.max(.4,1-.12*stableLevel),` from the bonuses literal. Remove `entropyGainMult:1,` from `baseBonuses()`.

In `tick`, change the cascade call:

```ts
    decay+=cascadeDecay(civ.tactical.entropy,s.stabilityMax);
```

In `resetMachineLayer`, preserve the inherited levels. Replace `this.state.machine.upgradeLevels={};` with:

```ts
    const inherited=Math.min(this.upgradeLevel('machine','reality_lattice'),this.upgradeLevel('universe','wide_lattice'));
    this.state.machine.upgradeLevels=inherited>0?{reality_lattice:inherited}:{};
```

`resetMachineLayer` reads `upgradeLevel` before clearing, so compute `inherited` before the assignment.

- [ ] **Step 6: Update `view-model.ts`**

Remove the `requiredContainment` import and the `requiredContainment: requiredContainment(civ.era),` entry from the `tactical` block. Task 8 adds the replacement readouts.

- [ ] **Step 7: Run the tests**

Run: `npm test`
Expected: the three new tests PASS. The legacy `'Temporal Injector improves Accelerate while Stable Constants and Bureaucracy improve pressure control'` test FAILS on `entropyGainMult`; replace its Stable Constants assertion with:

```js
  engine.state.meta.universeUpgradeLevels.stable_constants = 3;
  assert.equal(engine.runtimeBonuses().containmentRating, 3);
```

Then re-run: `npm test` — Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add public/game/src public/game/dist public/game/tests
git commit -m "feat(pressure): sum containment from upgrade levels and inherit the lattice"
```

---

### Task 4: The deterministic survival curve

**Files:**
- Create: `public/game/tests/balance-harness.mjs`
- Test: `public/game/tests/core.test.mjs`

**Interfaces:**
- Consumes: the engine as built in Task 3.
- Produces: from `balance-harness.mjs` — `freshEngine()`, `safestChoiceIndex(event)`, `runCivilization(engine, options)` returning `{ elapsed, cascaded, interventions, eventIds, harvest }`, `withUpgrades(engine, machineLevels, universeLevels)`.

- [ ] **Step 1: Write the harness**

Create `public/game/tests/balance-harness.mjs`:

```js
import { GameEngine } from '../dist/game/engine.js';

export function freshEngine() {
  return new GameEngine({
    autosave: false,
    storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  });
}

export function safestChoiceIndex(event) {
  let best = 0;
  let bestScore = -Infinity;
  for (let index = 0; index < event.choices.length; index++) {
    const effects = event.choices[index].effects ?? {};
    const score = Number(effects.stability ?? 0) * 3
      + Number(effects.sanity ?? 0) * 2
      - Number(effects.awareness ?? 0) * 1.25
      - Number(effects.attention ?? 0) * 1.5
      - Number(effects.entropy ?? 0) * 2
      + Number(effects.development ?? 0) * 0.04;
    if (score > bestScore) { bestScore = score; best = index; }
  }
  return best;
}

export function withUpgrades(engine, machineLevels = {}, universeLevels = {}) {
  engine.state.meta.progression.machineInsight = 30;
  if (Object.keys(universeLevels).length && !engine.systemUnlocked('universe_upgrades')) {
    engine.state.meta.progression.unlockedSystems.push('universe_upgrades');
  }
  Object.assign(engine.state.machine.upgradeLevels, machineLevels);
  Object.assign(engine.state.meta.universeUpgradeLevels, universeLevels);
  return engine;
}

// policy: 'safe' resolves interventions only. 'vent', 'stabilize', 'accelerate' and
// 'reserve' additionally spend the named action at every opportunity.
export function runCivilization(engine, { seed = 0, policy = ['safe'], harvestAt = 'never', dt = 0.25, maxSeconds = 2400 } = {}) {
  const runBuild = engine.state.machine.runBuild;
  if (engine.systemUnlocked('directives') && runBuild.directiveOfferIds.length && !runBuild.selectedDirective) {
    engine.selectDirective(runBuild.directiveOfferIds[0]);
  }
  if (!engine.startCivilization(seed)) throw new Error(`startCivilization failed: ${engine.lastActionFailure}`);
  const eventIds = [];
  let elapsed = 0;
  let interventions = 0;
  while (engine.state.phase === 'civilization' && elapsed < maxSeconds) {
    const civ = engine.state.civilization;
    const event = engine.currentEvent();
    if (event) {
      eventIds.push(event.id);
      interventions++;
      engine.chooseEvent(safestChoiceIndex(event));
      continue;
    }
    if (policy.includes('vent')) engine.useTacticalAction('vent');
    if (policy.includes('stabilize')) engine.useTacticalAction('stabilize');
    if (policy.includes('accelerate')) engine.useTacticalAction('accelerate');
    if (policy.includes('reserve')) for (const definition of engine.runInterventions()) engine.useRunIntervention(definition.id);
    if (harvestAt === 'transcendent' && civ.era >= 2) { engine.harvest(false); break; }
    engine.tick(dt);
    elapsed += dt;
  }
  return {
    elapsed,
    cascaded: Boolean(engine.state.machine.lastHarvest?.chaotic),
    interventions,
    eventIds,
    harvest: { ...engine.state.machine.lastHarvest },
  };
}
```

`engine.runInterventions()` and `engine.useRunIntervention()` arrive in Task 11; the `reserve` policy is unused until then and the harness must not call them before that.

- [ ] **Step 2: Write the failing balance test**

Replace the legacy `'deterministic pressure keeps unupgraded runs short and rewards Containment builds'` test with:

```js
test('the survival curve separates no-upgrade runs from contained builds', () => {
  const seeds = Array.from({ length: 24 }, (_, index) => 10_000 + index * 97);
  const measure = (machineLevels, universeLevels) => percentile(
    seeds.map(seed => runCivilization(withUpgrades(freshEngine(), machineLevels, universeLevels), { seed }).elapsed),
    0.5,
  );
  const bare = measure({}, {});
  const four = measure({ reality_lattice: 1, awareness_scrubber: 1, sanity_protocol: 1, cosmic_muffling: 1 }, {});
  const full = measure(
    { reality_lattice: 8, awareness_scrubber: 5, sanity_protocol: 5, cosmic_muffling: 5 },
    { stable_constants: 5 },
  );
  assert.ok(bare >= 150 && bare <= 185, `no-upgrade median ${bare}s`);
  assert.ok(four >= 300 && four <= 360, `containment 4 median ${four}s`);
  assert.ok(full >= 870 && full <= 960, `containment 28 median ${full}s`);
});
```

Add the harness import to `core.test.mjs` and delete the now-duplicated local `freshEngine`, `safestChoiceIndex` and `simulatedSurvival` helpers, importing them instead:

```js
import { freshEngine, safestChoiceIndex, runCivilization, withUpgrades } from './balance-harness.mjs';
```

- [ ] **Step 3: Run the tests**

Run: `npm test`
Expected: PASS. If the full-containment median lands outside 870-960, do not adjust the assertion — the pressure constants in Task 2 are the contract and a mismatch means Task 3 mis-sums containment.

- [ ] **Step 4: Commit**

```bash
git add public/game/tests
git commit -m "test: assert the continuous survival curve across containment levels"
```

---

# Stage 2 — Cultivation Depth

After this stage a deep run is worth staying for and a cascade costs real yield.

### Task 5: Depth, bands and the credit curve

**Files:**
- Modify: `public/game/src/game/types.ts` (`HarvestGrade`)
- Modify: `public/game/src/game/harvest-quality.ts`
- Test: `public/game/tests/core.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: from `game/harvest-quality.js` — `cultivationDepth(civ): number`, `depthBand(depth): HarvestGrade`, `endgameStatesReached(civ): number`, `DEPTH_BANDS`, `DEPTH_DEVELOPMENT_SCALE = 80`, `DEPTH_ENDGAME_BONUS = 1.5`, `CHAOTIC_CREDIT_RETENTION = 0.6`; `HarvestQuality` gains `depth: number`; `HarvestGrade` gains `'singular'`.

- [ ] **Step 1: Write the failing tests**

Replace both legacy grade tests with:

```js
test('cultivation depth derives from development and completed path arcs', () => {
  const civ = GameEngine.createCivilizationForTest(82);
  civ.development = 80;
  assert.equal(cultivationDepth(civ), 1);
  civ.development = 400;
  assert.equal(cultivationDepth(civ), 5);
  civ.pathState.endgameStates = ['endgame_machine_faith', 'endgame_void_communion'];
  assert.equal(cultivationDepth(civ), 8);
});

test('depth bands cover the five grades at their published boundaries', () => {
  assert.equal(depthBand(0), 'premature');
  assert.equal(depthBand(1.49), 'premature');
  assert.equal(depthBand(1.5), 'established');
  assert.equal(depthBand(3.99), 'established');
  assert.equal(depthBand(4), 'transcendent');
  assert.equal(depthBand(8.99), 'transcendent');
  assert.equal(depthBand(9), 'ascendant');
  assert.equal(depthBand(15.99), 'ascendant');
  assert.equal(depthBand(16), 'singular');
  assert.equal(depthBand(40), 'singular');
});

test('harvest quality scales continuously with depth', () => {
  const civ = GameEngine.createCivilizationForTest(83);
  civ.eventChoices = 4;
  civ.era = 1;
  civ.development = 400;
  const quality = evaluateHarvestQuality(civ, false);
  assert.equal(quality.grade, 'transcendent');
  assert.equal(quality.depth, 5);
  assert.equal(Number(quality.multiplier.toFixed(4)), 1.35);
  assert.equal(quality.credits, 3);
  civ.development = 1920;
  const deep = evaluateHarvestQuality(civ, false);
  assert.equal(deep.grade, 'singular');
  assert.equal(deep.credits, 14);
  assert.equal(Number(deep.multiplier.toFixed(2)), 5.53);
});

test('the credit curve is capped at twenty', () => {
  const civ = GameEngine.createCivilizationForTest(84);
  civ.eventChoices = 9;
  civ.era = 3;
  civ.development = 100_000;
  assert.equal(evaluateHarvestQuality(civ, false).credits, 20);
});

test('a premature harvest stays premature at any depth', () => {
  const civ = GameEngine.createCivilizationForTest(85);
  civ.development = 4000;
  civ.era = 0;
  civ.eventChoices = 9;
  const zeroEra = evaluateHarvestQuality(civ, false);
  assert.equal(zeroEra.grade, 'premature');
  assert.equal(zeroEra.multiplier, 0.2);
  assert.equal(zeroEra.credits, 0);
  civ.era = 2;
  civ.eventChoices = 2;
  assert.equal(evaluateHarvestQuality(civ, false).grade, 'premature');
});

test('a chaotic harvest keeps sixty percent of its credits', () => {
  const quality = { grade: 'singular', multiplier: 5.53, credits: 14, depth: 24 };
  assert.equal(calculateCultivationCredits(quality, false, false), 14);
  assert.equal(calculateCultivationCredits(quality, true, false), 8);
  assert.equal(calculateCultivationCredits(quality, false, true), 15);
  assert.equal(calculateCultivationCredits(quality, true, true), 9);
  const premature = { grade: 'premature', multiplier: 0.2, credits: 0, depth: 0.4 };
  assert.equal(calculateCultivationCredits(premature, false, true), 0);
  const shallow = { grade: 'established', multiplier: 0.63, credits: 1, depth: 1.7 };
  assert.equal(calculateCultivationCredits(shallow, true, false), 0);
});
```

Extend the harvest-quality import:

```js
import { calculateCultivationCredits, cultivationDepth, depthBand, evaluateHarvestQuality, HARVEST_GRADE_LABELS } from '../dist/game/harvest-quality.js';
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test public/game/tests/core.test.mjs`
Expected: FAIL — `cultivationDepth is not a function`.

- [ ] **Step 3: Extend `types.ts`**

```ts
export type HarvestGrade = 'premature' | 'established' | 'transcendent' | 'ascendant' | 'singular';
```

- [ ] **Step 4: Rewrite the quality rules in `harvest-quality.ts`**

Replace `HARVEST_GRADE_LABELS`, `HarvestQuality` and `evaluateHarvestQuality`, and add the new exports:

```ts
export interface HarvestQuality {
  grade: HarvestGrade;
  multiplier: number;
  credits: number;
  depth: number;
}

export const HARVEST_GRADE_LABELS: Readonly<Record<HarvestGrade, string>> = {
  premature: 'Premature',
  established: 'Established',
  transcendent: 'Transcendent',
  ascendant: 'Ascendant',
  singular: 'Singular',
};

export const DEPTH_DEVELOPMENT_SCALE = 80;
export const DEPTH_ENDGAME_BONUS = 1.5;
export const DEPTH_CREDIT_RATE = 0.6;
export const DEPTH_CREDIT_CAP = 20;
export const DEPTH_YIELD_BASE = 0.25;
export const DEPTH_YIELD_RATE = 0.22;
export const PREMATURE_MULTIPLIER = 0.2;
export const CHAOTIC_CREDIT_RETENTION = 0.6;

export const DEPTH_BANDS: ReadonlyArray<{ grade: HarvestGrade; minDepth: number }> = [
  { grade: 'premature', minDepth: 0 },
  { grade: 'established', minDepth: 1.5 },
  { grade: 'transcendent', minDepth: 4 },
  { grade: 'ascendant', minDepth: 9 },
  { grade: 'singular', minDepth: 16 },
];

export function endgameStatesReached(civ: Civilization): number {
  const states = civ.pathState?.endgameStates;
  if (Array.isArray(states)) return states.length;
  return civ.pathState?.endgameState ? 1 : 0;
}

export function cultivationDepth(civ: Civilization): number {
  return Math.max(0, civ.development) / DEPTH_DEVELOPMENT_SCALE + DEPTH_ENDGAME_BONUS * endgameStatesReached(civ);
}

export function depthBand(depth: number): HarvestGrade {
  let grade: HarvestGrade = 'premature';
  for (const band of DEPTH_BANDS) if (depth >= band.minDepth) grade = band.grade;
  return grade;
}

export function evaluateHarvestQuality(civ: Civilization, _chaotic = false): HarvestQuality {
  const depth = cultivationDepth(civ);
  const grade = civ.eventChoices < 3 || civ.era <= 0 ? 'premature' : depthBand(depth);
  if (grade === 'premature') return { grade, multiplier: PREMATURE_MULTIPLIER, credits: 0, depth };
  return {
    grade,
    multiplier: DEPTH_YIELD_BASE + DEPTH_YIELD_RATE * depth,
    credits: Math.min(DEPTH_CREDIT_CAP, Math.floor(DEPTH_CREDIT_RATE * depth)),
    depth,
  };
}

export function calculateCultivationCredits(
  quality: HarvestQuality,
  chaotic = false,
  objectiveCompleted = false,
): number {
  if (quality.grade === 'premature') return 0;
  const base = quality.credits + (objectiveCompleted ? 1 : 0);
  return Math.max(0, chaotic ? Math.floor(base * CHAOTIC_CREDIT_RETENTION) : base);
}
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: the six new tests PASS.

- [ ] **Step 6: Commit**

```bash
git add public/game/src public/game/dist public/game/tests
git commit -m "feat(harvest): replace the four grade steps with a continuous cultivation depth"
```

---

### Task 6: Depth reaches the harvest record, the prestige and the keys

**Files:**
- Modify: `public/game/src/game/rules.ts` (prestige awards)
- Modify: `public/game/src/game/engine.ts` (`harvest`, `consumeUniverse`)
- Modify: `public/game/src/ui/view-model.ts` (grade labels, render key)
- Modify: `public/game/src/render/world-presentation.ts` (`structuralWorldKey`)
- Test: `public/game/tests/core.test.mjs`, `public/game/tests/presentation.test.mjs`

**Interfaces:**
- Consumes: `cultivationDepth`, `evaluateHarvestQuality` from Task 5.
- Produces: `universeResidueAward(credits, bank, multiplier)` — **the first parameter is now credits, not civilizations**; `multiverseAxiomAward(universes, universalLevels)` rescaled; `lastHarvest.depth` recorded; `civilizationRenderKey` contains the depth band.

- [ ] **Step 1: Write the failing tests**

```js
test('the residue award scales with credits earned, not civilization count', () => {
  assert.equal(universeResidueAward(18, 8000, 1), 32);
  assert.ok(universeResidueAward(36, 8000, 1) > universeResidueAward(18, 8000, 1));
  assert.equal(universeResidueAward(0, 0, 1), 1);
  assert.ok(universeResidueAward(18, 8000, 1.8) > universeResidueAward(18, 8000, 1));
});

test('the axiom award rewards universe investment', () => {
  assert.equal(multiverseAxiomAward(4, 24), 10);
  assert.ok(multiverseAxiomAward(4, 48) > multiverseAxiomAward(4, 24));
  assert.equal(multiverseAxiomAward(0, 0), 1);
});

test('the harvest record carries the depth that produced it', () => {
  const engine = withUpgrades(freshEngine(), { reality_lattice: 4 }, {});
  runCivilization(engine, { seed: 4242, harvestAt: 'transcendent' });
  const record = engine.state.machine.lastHarvest;
  assert.equal(typeof record.depth, 'number');
  assert.ok(record.depth > 0);
  assert.equal(record.grade, engine.state.machine.lastHarvest.grade);
  assert.ok(record.credits >= 1);
});
```

In `presentation.test.mjs`:

```js
test('the civilization render key tracks the depth band, never the depth', () => {
  const engine = freshEngine();
  engine.startCivilization(9001);
  const civ = engine.state.civilization;
  civ.eventChoices = 4;
  civ.era = 1;
  civ.development = 400;
  const before = civilizationRenderKey(buildViewModel(engine));
  civ.development = 401;
  assert.equal(civilizationRenderKey(buildViewModel(engine)), before, 'a ticking development must not change the key');
  civ.development = 1600;
  assert.notEqual(civilizationRenderKey(buildViewModel(engine)), before, 'crossing a band must change the key');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — `universeResidueAward(18, 8000, 1)` returns 5.

- [ ] **Step 3: Rewrite the awards in `rules.ts`**

```ts
export function universeResidueAward(credits: number, bank: number, multiplier: number): number {
  const creditTerm = Math.pow(Math.max(0, credits), 1.15) / 1.2;
  const bankTerm = Math.sqrt(Math.max(0, bank)) / 10;
  return Math.max(1, Math.floor((creditTerm + bankTerm) * Math.max(0.1, multiplier)));
}

export function multiverseAxiomAward(universes: number, universalLevels: number): number {
  return Math.max(1, Math.floor(Math.pow(Math.max(0, universes), 1.1) / 2 + Math.max(0, universalLevels) / 3));
}
```

Also widen the era clamp in `calculateHarvest`:

```ts
  const era = Math.max(0, Math.min(3, civ.era));
```

- [ ] **Step 4: Update `engine.ts`**

In `consumeUniverse`, pass the credits earned instead of the civilization count:

```ts
const award=universeResidueAward(this.state.machine.cultivationCreditsThisUniverse,bank,1+.2*this.upgradeLevel('universe','residue_refinery'));
```

In `harvest`, add `depth` to the record next to `grade`:

```ts
grade:details.grade,depth:details.depth,credits:details.credits,
```

`previewHarvestDetails` already spreads the quality object, so `depth` flows through it once Task 5 lands. Update its zero-state literal to include `depth:0`.

- [ ] **Step 5: Update `view-model.ts` and `world-presentation.ts`**

In `view-model.ts`, add the depth band to the render key. Inside `civilizationRenderKey`, replace the `vm.harvest?.controlled?.grade ?? ''` entry with:

```ts
    vm.harvest?.controlled?.grade ?? '',
    vm.harvest?.chaotic?.grade ?? '',
```

The grade **is** the band, so no continuous value enters the key. In `world-presentation.ts`, append the grade to `structuralWorldKey` the same way, taking it from the snapshot the function already receives; if the function has no access to harvest quality, pass `depthBand(cultivationDepth(civ))` from its existing `civ` argument and import both from `../game/harvest-quality.js`.

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add public/game/src public/game/dist public/game/tests
git commit -m "feat(economy): scale prestige with credits and record harvest depth"
```

---

# Stage 3 — Intervention supply

After this stage a fifteen-minute run has enough varied content to be worth playing.

### Task 7: The scheduler saturation stage

**Files:**
- Modify: `public/game/src/game/intervention-scheduler.ts`
- Modify: `public/game/src/game/engine.ts` (`eventEligible`, `selectEvent`)
- Test: `public/game/tests/core.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `SchedulerOptions` gains `exhausted(event: T, civilization: Civilization): boolean`; `buildInterventionPool` runs three stages. `GameEngine.eventEligible` no longer applies `max_count`.

- [ ] **Step 1: Write the failing test**

```js
test('the pool falls back to seen events before it falls back to one event', () => {
  const civ = GameEngine.createCivilizationForTest(310);
  const events = [
    { id: 'a', weight: 1 },
    { id: 'b', weight: 1 },
    { id: 'c', weight: 1 },
  ];
  const options = {
    pathMultiplier: () => 1,
    stateMultiplier: () => 1,
    exhausted: event => (civ.eventCounts[event.id] ?? 0) >= 1,
  };
  assert.equal(buildInterventionPool(events, civ, options).length, 3);
  civ.eventCounts = { a: 1, b: 1, c: 1 };
  const saturated = buildInterventionPool(events, civ, options);
  assert.equal(saturated.length, 3, 'every exhausted event must return once nothing fresh is left');
  recordRecentIntervention(civ, 'a');
  const withoutRecent = buildInterventionPool(events, civ, options);
  assert.deepEqual(withoutRecent.map(entry => entry.event.id).sort(), ['b', 'c'], 'the most recent event must stay excluded');
});

test('freshness spreads saturated repetition instead of concentrating it', () => {
  const civ = GameEngine.createCivilizationForTest(311);
  civ.eventCounts = { often: 6, rarely: 1 };
  const options = { pathMultiplier: () => 1, stateMultiplier: () => 1, exhausted: () => true };
  const pool = buildInterventionPool([{ id: 'often', weight: 1 }, { id: 'rarely', weight: 1 }], civ, options);
  const weights = new Map(pool.map(entry => [entry.event.id, entry.weight]));
  assert.ok(weights.get('rarely') > weights.get('often') * 2);
});

test('a long run never serves one intervention over and over', () => {
  const engine = withUpgrades(
    freshEngine(),
    { reality_lattice: 8, awareness_scrubber: 5, sanity_protocol: 5, cosmic_muffling: 5 },
    { stable_constants: 5 },
  );
  const result = runCivilization(engine, { seed: 7777 });
  const counts = new Map();
  for (const id of result.eventIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  const worst = Math.max(...counts.values());
  assert.ok(result.interventions >= 90, `only ${result.interventions} interventions`);
  assert.ok(counts.size >= 55, `only ${counts.size} distinct events`);
  assert.ok(worst <= 5, `one event appeared ${worst} times`);
  assert.ok((counts.get('routine_compliance_audit') ?? 0) <= 3, 'the fallback must stay exceptional');
  for (let index = 1; index < result.eventIds.length; index++) {
    assert.notEqual(result.eventIds[index], result.eventIds[index - 1], 'no intervention may repeat back to back');
  }
});
```

The last test needs Tasks 8 and 9 to reach 55 distinct events; expect it to fail on `counts.size` until Task 9 is complete, and keep it failing rather than weakening the threshold.

- [ ] **Step 2: Run to verify failure**

Run: `node --test public/game/tests/core.test.mjs`
Expected: FAIL — the saturated pool is empty.

- [ ] **Step 3: Add the third stage**

In `intervention-scheduler.ts`, extend the options interface and both pool functions:

```ts
export interface SchedulerOptions<T extends SchedulerEvent> {
  pathMultiplier(event: T, civilization: Civilization): number;
  stateMultiplier(event: T, civilization: Civilization): number;
  exhausted(event: T, civilization: Civilization): boolean;
}
```

```ts
function buildPool<T extends SchedulerEvent>(
  events: readonly T[],
  civ: Civilization,
  options: SchedulerOptions<T>,
  excludeRecent: boolean,
  allowExhausted: boolean,
): WeightedIntervention<T>[] {
  const recent = new Set(recentEventIds(civ));
  const pool: WeightedIntervention<T>[] = [];
  for (const event of events) {
    if (excludeRecent && recent.has(event.id)) continue;
    if (!allowExhausted && options.exhausted(event, civ)) continue;
    const base = Math.max(0.01, Number(event.weight ?? 1));
    const path = Math.max(0, options.pathMultiplier(event, civ));
    const state = Math.max(0, options.stateMultiplier(event, civ));
    if (path <= 0 || state <= 0) continue;
    const timesSeen = Math.max(0, Number(civ.eventCounts[event.id] ?? 0));
    const freshness = 1 / (1 + timesSeen * 0.55);
    const weight = base * path * state * phaseMultiplier(event, civ) * freshness;
    if (weight > 0) pool.push({ event, weight });
  }
  return pool;
}

export function buildInterventionPool<T extends SchedulerEvent>(
  events: readonly T[],
  civ: Civilization,
  options: SchedulerOptions<T>,
): WeightedIntervention<T>[] {
  const fresh = buildPool(events, civ, options, true, false);
  if (fresh.length) return fresh;
  const recentInclusive = buildPool(events, civ, options, false, false);
  if (recentInclusive.length) return recentInclusive;
  return buildPool(events, civ, options, true, true);
}
```

- [ ] **Step 4: Move the count rule into the scheduler call in `engine.ts`**

Delete this clause from `eventEligible`:

```ts
if((civ.eventCounts[e.id]??0)>=Number(e.max_count??2))return false;
```

Extend the `buildInterventionPool` call in `selectEvent`:

```ts
    const pool=buildInterventionPool(eligible,civ,{pathMultiplier:(event:any)=>CivilizationPaths.eventWeightMultiplier(event,civ),stateMultiplier,exhausted:(event:any)=>(civ.eventCounts[event.id]??0)>=Number(event.max_count??2)});
```

- [ ] **Step 5: Run the tests**

Run: `node --test public/game/tests/core.test.mjs`
Expected: the two scheduler unit tests PASS; `'a long run never serves one intervention over and over'` still fails on the distinct-event count.

- [ ] **Step 6: Commit**

```bash
git add public/game/src public/game/dist public/game/tests
git commit -m "feat(scheduler): add a saturation stage so a deep run never repeats one event"
```

---

### Task 8: Apotheosis cadence, era ceiling and new events

**Files:**
- Modify: `public/game/src/game/intervention-scheduler.ts` (`PHASE_WEIGHTS`, `eventDelayWindow`)
- Modify: `public/game/src/data/intervention-copy.ts` (`applyEraCeiling`)
- Create: `public/game/src/data/apotheosis-events.ts`
- Modify: `public/game/src/game/engine.ts` (event pool assembly), `progression.ts` (milestone)
- Test: `public/game/tests/core.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `applyEraCeiling<T>(events: readonly T[]): T[]` from `data/intervention-copy.js`; `APOTHEOSIS_EVENTS` from `data/apotheosis-events.js`; `PHASE_WEIGHTS` and `eventDelayWindow` gain a fourth entry indexed by `Math.min(3, era)`.

- [ ] **Step 1: Write the failing tests**

```js
test('Apotheosis has its own cadence and phase weighting', () => {
  const civ = GameEngine.createCivilizationForTest(320);
  civ.era = 3;
  assert.deepEqual(eventDelayWindow(civ), { min: 6, max: 9 });
  const endgame = { id: 'x', weight: 1, path_id: 'machine_faith', path_phase: 'endgame' };
  const impulse = { id: 'y', weight: 1, path_id: 'machine_faith', path_phase: 'impulse' };
  const options = { pathMultiplier: () => 1, stateMultiplier: () => 1, exhausted: () => false };
  const pool = new Map(buildInterventionPool([endgame, impulse], civ, options).map(e => [e.event.id, e.weight]));
  assert.ok(pool.get('x') > pool.get('y') * 5, 'Apotheosis must favour endgame phases');
});

test('the era ceiling keeps the catalog eligible in Apotheosis', () => {
  const raised = applyEraCeiling(CONTENT.events);
  assert.equal(raised.length, CONTENT.events.length);
  for (let index = 0; index < raised.length; index++) {
    const original = Number(CONTENT.events[index].max_era ?? 2);
    const expected = original === 2 ? 3 : original;
    assert.equal(Number(raised[index].max_era), expected, `${raised[index].id} ceiling`);
  }
  assert.ok(raised.some(event => Number(event.max_era) === 3));
});

test('a civilization in Apotheosis still has an eligible pool', () => {
  const engine = freshEngine();
  engine.startCivilization(321);
  const civ = engine.state.civilization;
  civ.era = 3;
  civ.years = 15000;
  civ.eventChoices = 12;
  civ.pendingEvent = '';
  civ.eventTimer = 0;
  engine.tick(0.25);
  assert.ok(civ.pendingEvent, 'an intervention must be presented in Apotheosis');
  assert.notEqual(civ.pendingEvent, 'routine_compliance_audit');
});

test('the Apotheosis event module meets its content contract', () => {
  assert.equal(APOTHEOSIS_EVENTS.length, 12);
  let entropyEffects = 0;
  let harvestEffects = 0;
  for (const event of APOTHEOSIS_EVENTS) {
    assert.equal(Number(event.min_era), 3, `${event.id} must be Apotheosis-only`);
    assert.ok(event.title && event.body, `${event.id} needs copy`);
    assert.ok(event.choices.length >= 2, `${event.id} needs at least two choices`);
    for (const choice of event.choices) {
      assert.ok(choice.label, `${event.id} choice needs a label`);
      assert.ok(choice.prediction, `${event.id} choice needs a prediction`);
      assert.ok(choice.effects && Object.keys(choice.effects).length, `${event.id} choice needs effects`);
    }
    if (event.choices.some(choice => 'entropy' in (choice.effects ?? {}))) entropyEffects++;
    if (event.choices.some(choice => Object.keys(choice.effects ?? {}).some(key => key.startsWith('harvest_mult_')))) harvestEffects++;
  }
  assert.ok(entropyEffects >= 4, `only ${entropyEffects} events touch Entropy`);
  assert.ok(harvestEffects >= 2, `only ${harvestEffects} events touch harvest multipliers`);
  const ids = new Set(APOTHEOSIS_EVENTS.map(event => event.id));
  assert.equal(ids.size, 12);
  for (const event of CONTENT.events) assert.ok(!ids.has(event.id), `${event.id} collides with the catalog`);
});
```

Add the imports:

```js
import { applyEraCeiling, applyInterventionCopy, INTERVENTION_COPY } from '../dist/data/intervention-copy.js';
import { APOTHEOSIS_EVENTS } from '../dist/data/apotheosis-events.js';
import { buildInterventionPool, chooseWeightedIntervention, eventDelayWindow, recordRecentIntervention } from '../dist/game/intervention-scheduler.js';
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test public/game/tests/core.test.mjs`
Expected: FAIL — `applyEraCeiling is not a function`.

- [ ] **Step 3: Extend the scheduler tables**

```ts
const PHASE_WEIGHTS: ReadonlyArray<Readonly<Record<string, number>>> = [
  { impulse: 1.5, reinforcement: 1.2, conflict: 0.75, consolidation: 0.5, endgame: 0.2 },
  { impulse: 0.75, reinforcement: 1, conflict: 1.4, consolidation: 1.25, endgame: 0.6 },
  { impulse: 0.5, reinforcement: 0.75, conflict: 1.1, consolidation: 1.35, endgame: 1.55 },
  { impulse: 0.3, reinforcement: 0.5, conflict: 0.9, consolidation: 1.3, endgame: 2 },
];
```

Change both clamps from `Math.min(2, civ.era)` to `Math.min(3, civ.era)`, and add the fourth delay window:

```ts
export function eventDelayWindow(civ: Civilization): { min: number; max: number } {
  return [
    { min: 10, max: 14 },
    { min: 8, max: 11 },
    { min: 7, max: 10 },
    { min: 6, max: 9 },
  ][Math.max(0, Math.min(3, civ.era))]!;
}
```

- [ ] **Step 4: Add the era ceiling to `intervention-copy.ts`**

```ts
export function applyEraCeiling<T extends { max_era?: number }>(events: readonly T[]): T[] {
  return events.map(event => (Number(event.max_era ?? 2) === 2 ? { ...event, max_era: 3 } : { ...event }));
}
```

- [ ] **Step 5: Write the twelve Apotheosis events**

Create `public/game/src/data/apotheosis-events.ts`. Follow the exact shape of `ENTROPY_CRISES` but with `min_era: 3`, `max_era: 3`, `max_count: 2` and **no** `scheduled_only` requirement, so they enter the weighted pool. Four themes, three events each: the civilization noticing the harvest, negotiating with the machine, post-causal economics, and the machine's own maintenance. Give each a `path_id` and `path_phase` drawn from `consolidation` or `endgame` so the Apotheosis phase weighting reaches them, and spread `path_affinity` across the ten paths so no single path monopolises the era. At least four events must carry an `entropy` effect on some choice, and at least two a `harvest_mult_*` effect. First entry, to fix the shape:

```ts
export const APOTHEOSIS_EVENTS = [
  {
    id: 'apotheosis_ledger_of_the_cultivator',
    title: 'The Ledger Is Read Aloud',
    body: 'A clerk in a forgotten bureau finds the harvest schedule filed under agriculture, and reads the yield column to a full assembly.',
    min_era: 3,
    max_era: 3,
    weight: 1.2,
    max_count: 2,
    path_id: 'bureaucratic_singularity',
    path_phase: 'consolidation',
    choices: [
      {
        label: 'Ratify the schedule as civic scripture',
        prediction: 'Stability holds as the civilization files its own consumption, though Awareness of the machine rises sharply.',
        effects: { stability: 12, awareness: 9, entropy: -4 },
        path_affinity: { bureaucratic_singularity: 2, machine_faith: 1 },
      },
      {
        label: 'Redact the yield column',
        prediction: 'Cosmic Attention falls and Entropy eases, but the forced omission costs Collective Sanity.',
        effects: { attention: -8, sanity: -7, entropy: -6 },
        path_affinity: { cosmic_resistance: 2 },
      },
      {
        label: 'Bill the cultivator for the harvest',
        prediction: 'A post-causal invoice raises the value of everything extracted, at the cost of Stability.',
        effects: { stability: -9, harvest_mult_causal_mass: 1.12, harvest_mult_existence: 1.08, entropy: 5 },
        path_affinity: { bureaucratic_singularity: 3, void_communion: 1 },
      },
    ],
  },
  // eleven more, same shape
] as const;
```

- [ ] **Step 6: Wire the pool in `engine.ts` and add the milestone**

Replace the events field initializer:

```ts
private events:any[]=[...applyEraCeiling(applyInterventionCopy(C.events)),...ENTROPY_CRISES,...APOTHEOSIS_EVENTS];
```

Add the imports for `applyEraCeiling` and `APOTHEOSIS_EVENTS`. In `progression.ts`, extend `recordCivilizationProgress`:

```ts
if(civ.era>=3)this.milestone(state,'era_apotheosis',2,out);
```

- [ ] **Step 7: Run the tests**

Run: `npm test`
Expected: the four new tests PASS.

- [ ] **Step 8: Commit**

```bash
git add public/game/src public/game/dist public/game/tests
git commit -m "feat(content): add the Apotheosis era, its cadence and twelve interventions"
```

---

### Task 9: Path succession

**Files:**
- Modify: `public/game/src/game/types.ts` (`PathState`)
- Modify: `public/game/src/game/paths.ts`
- Modify: `public/game/src/game/engine.ts` (`chooseEvent` history copy)
- Test: `public/game/tests/core.test.mjs`

**Interfaces:**
- Consumes: `endgameStatesReached` from Task 5 already reads `endgameStates`.
- Produces: `PathState` gains `successions: number`, `successionAtChoice: number`, `endgameStates: string[]`; `CivilizationPaths.resolveDominance(civ)` returns a successor id when the guards pass; `SUCCESSION_MIN_ERA = 2`, `SUCCESSION_INTERVAL = 4`, `SUCCESSION_MAX = 3` exported from `game/paths.js`.

- [ ] **Step 1: Write the failing tests**

```js
test('dominance succeeds only from Transcendence and only under its guards', () => {
  const civ = GameEngine.createCivilizationForTest(330);
  const paths = CivilizationPaths.ensure(civ);
  paths.affinity.machine_faith = 6;
  assert.equal(CivilizationPaths.resolveDominance(civ), 'machine_faith');
  assert.equal(paths.dominantPath, 'machine_faith');
  assert.equal(paths.successions, 0);

  paths.affinity.void_communion = 9;
  civ.era = 1;
  assert.equal(CivilizationPaths.resolveDominance(civ), '', 'no succession below Transcendence');

  civ.era = 2;
  civ.eventChoices = 2;
  assert.equal(CivilizationPaths.resolveDominance(civ), '', 'no succession inside the interval');

  civ.eventChoices = 8;
  assert.equal(CivilizationPaths.resolveDominance(civ), 'void_communion');
  assert.equal(paths.dominantPath, 'void_communion');
  assert.equal(paths.successions, 1);
});

test('succession stops after three changes', () => {
  const civ = GameEngine.createCivilizationForTest(331);
  const paths = CivilizationPaths.ensure(civ);
  civ.era = 2;
  const order = ['machine_faith', 'void_communion', 'temporal_dominion', 'reality_engineering', 'collective_mind'];
  order.forEach((id, index) => {
    paths.affinity[id] = 6 + index * 4;
    civ.eventChoices = index * 5;
    CivilizationPaths.resolveDominance(civ);
  });
  assert.equal(paths.successions, SUCCESSION_MAX);
  assert.equal(paths.dominantPath, order[SUCCESSION_MAX]);
});

test('every reached end-state is recorded and deepens the harvest', () => {
  const civ = GameEngine.createCivilizationForTest(332);
  const paths = CivilizationPaths.ensure(civ);
  paths.dominantPath = 'machine_faith';
  civ.development = 400;
  const before = cultivationDepth(civ);
  CivilizationPaths.applyChoice(
    civ,
    { id: 'e1', path_id: 'machine_faith', path_phase: 'endgame' },
    { label: 'finish', effects: {} },
  );
  assert.equal(paths.endgameStates.length, 1);
  assert.equal(cultivationDepth(civ), before + 1.5);
  CivilizationPaths.applyChoice(
    civ,
    { id: 'e1b', path_id: 'machine_faith', path_phase: 'endgame' },
    { label: 'finish again', effects: {} },
  );
  assert.equal(paths.endgameStates.length, 1, 'the same end-state must not count twice');
});
```

Add to the imports:

```js
import { CivilizationPaths, SUCCESSION_MAX } from '../dist/game/paths.js';
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test public/game/tests/core.test.mjs`
Expected: FAIL — `resolveDominance` returns `''` once a dominant path is set.

- [ ] **Step 3: Extend `types.ts`**

```ts
export interface PathState {
  affinity: Record<string, number>;
  dominantPath: string;
  completedEvents: string[];
  choiceFlags: string[];
  recentPaths: string[];
  recentDeltas: Record<string, number>;
  endgameState: string;
  endgameStates: string[];
  successions: number;
  successionAtChoice: number;
}
```

- [ ] **Step 4: Implement succession in `paths.ts`**

Add the constants below the existing dominance constants:

```ts
export const SUCCESSION_MIN_ERA = 2;
export const SUCCESSION_INTERVAL = 4;
export const SUCCESSION_MAX = 3;
```

Extend `newState` and `ensure`:

```ts
  static newState(): PathState {
    return { affinity: Object.fromEntries(PATH_IDS.map(id => [id, 0])), dominantPath: '', completedEvents: [], choiceFlags: [], recentPaths: [], recentDeltas: {}, endgameState: '', endgameStates: [], successions: 0, successionAtChoice: 0 };
  }
  static ensure(civ: Civilization): PathState {
    if (!civ.pathState) civ.pathState = this.newState();
    const ps = civ.pathState;
    for (const id of PATH_IDS) if (!(id in ps.affinity)) ps.affinity[id] = 0;
    if (!Array.isArray(ps.endgameStates)) ps.endgameStates = ps.endgameState ? [ps.endgameState] : [];
    if (typeof ps.successions !== 'number') ps.successions = 0;
    if (typeof ps.successionAtChoice !== 'number') ps.successionAtChoice = 0;
    return ps;
  }
```

Replace `resolveDominance`:

```ts
  static resolveDominance(civ: Civilization): string {
    const ps = this.ensure(civ);
    const ranked = this.ranked(civ, PATH_IDS.length);
    if (!ranked.length) return '';
    const leader = ranked[0]!;
    const score = this.affinity(civ, leader);
    const runner = ranked[1] ? this.affinity(civ, ranked[1]) : 0;
    if (score < DOMINANCE_MIN_AFFINITY || score - runner < DOMINANCE_MIN_LEAD) return '';
    if (!ps.dominantPath) { ps.dominantPath = leader; return leader; }
    if (leader === ps.dominantPath) return '';
    if (civ.era < SUCCESSION_MIN_ERA) return '';
    if (ps.successions >= SUCCESSION_MAX) return '';
    if (civ.eventChoices - ps.successionAtChoice < SUCCESSION_INTERVAL) return '';
    ps.dominantPath = leader;
    ps.successions += 1;
    ps.successionAtChoice = civ.eventChoices;
    return leader;
  }
```

In `applyChoice`, record every end-state:

```ts
    if (event.path_phase === 'endgame' && event.path_id === ps.dominantPath) {
      endgameState = String(DEFINITIONS[event.path_id]?.endgame ?? '');
      if (endgameState) {
        ps.endgameState = endgameState;
        if (!ps.endgameStates.includes(endgameState)) ps.endgameStates.push(endgameState);
        if (!civ.flags.includes(endgameState)) civ.flags.push(endgameState);
      }
    }
```

Extend `summary`:

```ts
  static summary(civ:Civilization){ const ps=this.ensure(civ); return { dominantId:ps.dominantPath, dominantName: ps.dominantPath?this.displayName(ps.dominantPath):'', tendencies:this.qualitativeTendencies(civ), endgameState:ps.endgameState, endgameStates:[...ps.endgameStates], successions:ps.successions }; }
```

- [ ] **Step 5: Announce the succession in `engine.ts`**

`chooseEvent` already posts on `pr.newDominantPath`. Change the message so a succession reads differently from a first dominance:

```ts
    if(pr.newDominantPath){
      this.applyEffects(civ,CivilizationPaths.dominanceEffects(pr.newDominantPath),false);
      const succession=CivilizationPaths.ensure(civ).successions>0;
      const label=CivilizationPaths.displayName(pr.newDominantPath);
      this.appendHistory(civ,`YEAR ${Math.trunc(civ.years)}: ${label} ${succession?'succeeded the previous dominant civilization path':'became the dominant civilization path'}.`);
      this.post(`${succession?'PATH SUCCESSION':'DOMINANT CIVILIZATION PATH'}: ${label.toUpperCase()}`);
    }
```

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: PASS, including `'a long run never serves one intervention over and over'` from Task 7. If the distinct-event count is still below 55, add the remaining Apotheosis events from Task 8 rather than lowering the threshold.

- [ ] **Step 7: Commit**

```bash
git add public/game/src public/game/dist public/game/tests
git commit -m "feat(paths): let dominance succeed in Transcendence and unlock the sealed path arcs"
```

---

# Stage 4 — Vent and reserve

After this stage the interval between interventions carries decisions and Paradox has a source.

### Task 10: The Entropy Vent

**Files:**
- Modify: `public/game/src/game/types.ts` (`TacticalActionId`, `TacticalState.actionUsage`)
- Modify: `public/game/src/game/tactical-actions.ts`
- Modify: `public/game/src/game/engine.ts` (`createCivilizationForTest`)
- Modify: `public/game/src/main.ts` (key `4`)
- Test: `public/game/tests/core.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `TACTICAL_ACTIONS.vent` with `cost: 1` and `shortcut: '4'`; `VENT_ENTROPY_RELIEF = 18`, `VENT_MIN_ENTROPY = 6`, `VENT_STABILITY_COST = 10` exported from `game/tactical-actions.js`.

- [ ] **Step 1: Write the failing tests**

```js
test('Vent trades Stability for Entropy relief and harvestable Paradox', () => {
  const engine = freshEngine();
  engine.startCivilization(410);
  const civ = engine.state.civilization;
  civ.tactical.entropy = 40;
  civ.era = 2;
  assert.equal(engine.useTacticalAction('vent'), true);
  assert.equal(civ.tactical.entropy, 22);
  assert.equal(civ.stats.stability, civ.stats.stabilityMax - 10);
  assert.equal(civ.stats.attention, 4);
  assert.equal(civ.tactical.controlCapacity, 2);
  assert.equal(Number(civ.harvestBonus.paradox.toFixed(2)), 14.4);
});

test('Vent removes only the Entropy that exists and pays out accordingly', () => {
  const engine = freshEngine();
  engine.startCivilization(411);
  const civ = engine.state.civilization;
  civ.tactical.entropy = 10;
  civ.era = 0;
  assert.equal(engine.useTacticalAction('vent'), true);
  assert.equal(civ.tactical.entropy, 0);
  assert.equal(Number(civ.harvestBonus.paradox.toFixed(2)), 4);
});

test('Vent is unavailable below the minimum Entropy and changes nothing', () => {
  const engine = freshEngine();
  engine.startCivilization(412);
  const civ = engine.state.civilization;
  civ.tactical.entropy = 5;
  const snapshot = JSON.stringify(civ);
  assert.equal(engine.useTacticalAction('vent'), false);
  assert.equal(engine.lastActionFailure, 'Entropy is too low to vent.');
  assert.equal(JSON.stringify(civ), snapshot);
});

test('Accelerate costs two Control and five Entropy', () => {
  assert.equal(TACTICAL_ACTIONS.accelerate.cost, 2);
  assert.equal(TACTICAL_ACTIONS.vent.cost, 1);
  assert.equal(TACTICAL_ACTIONS.vent.shortcut, '4');
  const engine = freshEngine();
  engine.startCivilization(413);
  const civ = engine.state.civilization;
  civ.eventTimer = 100;
  civ.pendingEvent = '';
  assert.equal(engine.useTacticalAction('accelerate'), true);
  assert.equal(civ.tactical.entropy, 5);
});

test('no tactical policy stretches a no-upgrade run past four minutes', () => {
  const policies = [['safe'], ['vent'], ['stabilize'], ['accelerate'], ['vent', 'stabilize'], ['vent', 'stabilize', 'accelerate']];
  for (const policy of policies) {
    const result = runCivilization(freshEngine(), { seed: 4321, policy });
    assert.ok(result.elapsed <= 240, `policy ${policy.join('+')} survived ${result.elapsed}s`);
  }
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test public/game/tests/core.test.mjs`
Expected: FAIL — `useTacticalAction('vent')` returns false with "Start a civilization first." because the id is unknown.

- [ ] **Step 3: Extend `types.ts`**

```ts
export type TacticalActionId = 'stabilize' | 'accelerate' | 'probe' | 'vent';
```

`TacticalState.actionUsage` is already `Record<TacticalActionId, number>` and needs no edit.

- [ ] **Step 4: Add the action in `tactical-actions.ts`**

Add the constants and the definition:

```ts
export const VENT_ENTROPY_RELIEF = 18;
export const VENT_MIN_ENTROPY = 6;
export const VENT_STABILITY_COST = 10;
export const VENT_ATTENTION_COST = 4;
```

```ts
  vent: {
    id: 'vent',
    title: 'Entropy Vent',
    label: 'Vent accumulated entropy into Paradox',
    summary: '−18 Entropy · yields Paradox at harvest',
    risk: '−10 Stability · +4 Attention',
    cost: 1,
    shortcut: '4',
  },
```

Extend `ACTION_PATHS`:

```ts
  vent: ['void_communion', 'post_mortal_civilization'],
```

Add the availability clause in `tacticalAvailability`, before the final return:

```ts
  if (id === 'vent' && civ.tactical.entropy < VENT_MIN_ENTROPY) {
    return { enabled: false, reason: 'Entropy is too low to vent.', cost: definition.cost };
  }
```

Add the branch in `applyTacticalAction`, and change the Accelerate surcharge from 7 to 5:

```ts
  } else if (id === 'vent') {
    const removed = Math.min(VENT_ENTROPY_RELIEF, civ.tactical.entropy);
    civ.tactical.entropy = clamp(civ.tactical.entropy - removed, 0, 100);
    civ.harvestBonus.paradox += removed * (0.4 + 0.2 * Math.max(0, Math.min(3, Math.trunc(civ.era))));
    civ.stats.stability = clamp(civ.stats.stability - VENT_STABILITY_COST, 0, civ.stats.stabilityMax);
    civ.stats.attention = clamp(civ.stats.attention + VENT_ATTENTION_COST * bonuses.attentionGainMult, 0, 100);
  } else {
```

The existing `else` branch is Probe; keep it last so `probe` remains the default.

- [ ] **Step 5: Seed the usage counter and bind the key**

In `engine.ts`, `createCivilizationForTest`, extend the literal:

```ts
actionUsage:{stabilize:0,accelerate:0,probe:0,vent:0}
```

In `main.ts`, extend the key map so `4` triggers `vent` exactly as `1`, `2` and `3` trigger their actions. Match the existing binding style in that file.

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: PASS. If `'no tactical policy stretches a no-upgrade run past four minutes'` fails, the vent economy is too generous — reduce `VENT_ENTROPY_RELIEF` before touching the assertion, and record the change in the spec.

- [ ] **Step 7: Commit**

```bash
git add public/game/src public/game/dist public/game/tests
git commit -m "feat(tactical): add the Entropy Vent and soften the Accelerate surcharge"
```

---

### Task 11: Mid-run machine interventions

**Files:**
- Create: `public/game/src/game/run-interventions.ts`
- Modify: `public/game/src/game/types.ts` (`Civilization.runInterventionUses`)
- Modify: `public/game/src/game/engine.ts` (`useRunIntervention`, `runInterventions`, `createCivilizationForTest`)
- Test: `public/game/tests/core.test.mjs`

**Interfaces:**
- Consumes: `cultivationDepth` from Task 5.
- Produces: from `game/run-interventions.js` — `RUN_INTERVENTIONS: readonly RunInterventionDefinition[]`, `runInterventionById(id): RunInterventionDefinition | null`, `runInterventionUses(civ, id): number`, `runInterventionCost(definition, uses, depth): number`, `applyRunIntervention(civ, definition): string`. From `game/engine.js` — `GameEngine.runInterventions(): RunInterventionView[]` where each entry is `{ ...definition, cost, uses, usesLeft, enabled, reason }`, and `GameEngine.useRunIntervention(id): boolean`.

- [ ] **Step 1: Write the failing tests**

```js
test('run intervention cost escalates with use and with depth', () => {
  const pulse = runInterventionById('containment_pulse');
  assert.equal(pulse.baseCost, 180);
  assert.equal(runInterventionCost(pulse, 0, 0), 180);
  assert.equal(runInterventionCost(pulse, 1, 0), 540);
  assert.equal(runInterventionCost(pulse, 2, 0), 1620);
  assert.equal(runInterventionCost(pulse, 0, 20), 1080);
  assert.equal(runInterventionCost(pulse, 1, 20), 3240);
  assert.equal(runInterventionCost(pulse, 2, 20), 9720);
});

test('a containment pulse removes Entropy and consumes a use', () => {
  const engine = freshEngine();
  engine.state.meta.progression.machineInsight = 30;
  engine.state.machine.currencies.causal_mass = 5000;
  engine.startCivilization(420);
  const civ = engine.state.civilization;
  civ.tactical.entropy = 60;
  assert.equal(engine.useRunIntervention('containment_pulse'), true);
  assert.equal(civ.tactical.entropy, 35);
  assert.equal(engine.state.machine.currencies.causal_mass, 5000 - 180);
  assert.equal(runInterventionUses(civ, 'containment_pulse'), 1);
});

test('run interventions stop at three uses per run', () => {
  const engine = freshEngine();
  engine.state.meta.progression.machineInsight = 30;
  engine.state.machine.currencies.causal_mass = 1_000_000;
  engine.startCivilization(421);
  const civ = engine.state.civilization;
  for (let index = 0; index < 3; index++) {
    civ.tactical.entropy = 90;
    assert.equal(engine.useRunIntervention('containment_pulse'), true);
  }
  civ.tactical.entropy = 90;
  assert.equal(engine.useRunIntervention('containment_pulse'), false);
  assert.equal(engine.lastActionFailure, 'Containment Pulse is exhausted for this civilization.');
  assert.equal(civ.tactical.entropy, 90);
});

test('an unaffordable run intervention changes nothing', () => {
  const engine = freshEngine();
  engine.state.meta.progression.machineInsight = 30;
  engine.state.machine.currencies.causal_mass = 10;
  engine.startCivilization(422);
  const civ = engine.state.civilization;
  civ.tactical.entropy = 60;
  const snapshot = JSON.stringify(civ);
  assert.equal(engine.useRunIntervention('containment_pulse'), false);
  assert.equal(JSON.stringify(civ), snapshot);
  assert.equal(engine.state.machine.currencies.causal_mass, 10);
});

test('run interventions stay locked behind their Insight gates', () => {
  const engine = freshEngine();
  engine.state.machine.currencies.causal_mass = 100_000;
  engine.state.machine.currencies.cognition = 100_000;
  engine.startCivilization(423);
  const views = new Map(engine.runInterventions().map(view => [view.id, view]));
  assert.equal(views.get('containment_pulse').enabled, false);
  assert.match(views.get('containment_pulse').reason, /Machine Insight 4/);
  engine.state.meta.progression.machineInsight = 4;
  assert.equal(engine.runInterventions().find(view => view.id === 'containment_pulse').enabled, true);
  assert.equal(engine.runInterventions().find(view => view.id === 'emergency_lattice').enabled, false);
});

test('spending every reserve intervention is a losing trade', () => {
  const build = () => withUpgrades(
    freshEngine(),
    { reality_lattice: 8, awareness_scrubber: 5, sanity_protocol: 5, cosmic_muffling: 5 },
    { stable_constants: 5 },
  );
  const bank = 200_000;
  const seed = 4242;
  const without = build();
  for (const key of ['causal_mass', 'cognition', 'existence']) without.state.machine.currencies[key] = bank;
  runCivilization(without, { seed });
  const withReserve = build();
  for (const key of ['causal_mass', 'cognition', 'existence']) withReserve.state.machine.currencies[key] = bank;
  runCivilization(withReserve, { seed, policy: ['safe', 'reserve'] });
  const total = engine => ['causal_mass', 'cognition', 'paradox', 'existence']
    .reduce((sum, key) => sum + engine.state.machine.currencies[key], 0);
  assert.ok(total(withReserve) < total(without), `reserve spending must not pay for itself: ${total(withReserve)} vs ${total(without)}`);
});

test('a no-upgrade run with full reserve spending stays under seven minutes', () => {
  const engine = freshEngine();
  engine.state.meta.progression.machineInsight = 30;
  for (const key of ['causal_mass', 'cognition', 'existence']) engine.state.machine.currencies[key] = 200_000;
  const result = runCivilization(engine, { seed: 4324, policy: ['safe', 'vent', 'reserve'] });
  assert.ok(result.elapsed <= 420, `survived ${result.elapsed}s`);
});
```

Add the import:

```js
import { runInterventionById, runInterventionCost, runInterventionUses, RUN_INTERVENTIONS } from '../dist/game/run-interventions.js';
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test public/game/tests/core.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `run-interventions.ts`**

```ts
import { cultivationDepth } from './harvest-quality.js';
import type { Civilization, ResourceKey } from './types.js';

export interface RunInterventionDefinition {
  id: string;
  title: string;
  label: string;
  summary: string;
  currency: ResourceKey;
  baseCost: number;
  maxUses: number;
  insight: number;
}

export const RUN_INTERVENTION_COST_GROWTH = 3;
export const RUN_INTERVENTION_DEPTH_SCALE = 4;

export const RUN_INTERVENTIONS: readonly RunInterventionDefinition[] = [
  { id: 'containment_pulse', title: 'Containment Pulse', label: 'Fire a containment pulse', summary: '−25 Entropy', currency: 'causal_mass', baseCost: 180, maxUses: 3, insight: 4 },
  { id: 'emergency_lattice', title: 'Emergency Lattice', label: 'Force the lattice back up', summary: 'Stability to 60% of maximum', currency: 'cognition', baseCost: 200, maxUses: 3, insight: 6 },
  { id: 'temporal_graft', title: 'Temporal Graft', label: 'Graft borrowed centuries', summary: '+600 years · +30 Development', currency: 'existence', baseCost: 220, maxUses: 3, insight: 9 },
];

export function runInterventionById(id: string): RunInterventionDefinition | null {
  return RUN_INTERVENTIONS.find(definition => definition.id === id) ?? null;
}

export function runInterventionUses(civ: Civilization, id: string): number {
  if (!civ.runInterventionUses) civ.runInterventionUses = {};
  return Math.max(0, Number(civ.runInterventionUses[id] ?? 0));
}

export function runInterventionCost(definition: RunInterventionDefinition, uses: number, depth: number): number {
  const escalation = Math.pow(RUN_INTERVENTION_COST_GROWTH, Math.max(0, uses));
  const depthFactor = 1 + Math.max(0, depth) / RUN_INTERVENTION_DEPTH_SCALE;
  return Math.round(definition.baseCost * escalation * depthFactor);
}

export function applyRunIntervention(civ: Civilization, definition: RunInterventionDefinition): string {
  if (definition.id === 'containment_pulse') {
    civ.tactical.entropy = Math.max(0, civ.tactical.entropy - 25);
  } else if (definition.id === 'emergency_lattice') {
    const floorValue = civ.stats.stabilityMax * 0.6;
    if (civ.stats.stability < floorValue) civ.stats.stability = floorValue;
  } else if (definition.id === 'temporal_graft') {
    civ.years += 600;
    civ.development += 30;
  }
  civ.runInterventionUses[definition.id] = runInterventionUses(civ, definition.id) + 1;
  return definition.label;
}

export function runInterventionDepth(civ: Civilization): number {
  return cultivationDepth(civ);
}
```

- [ ] **Step 4: Extend `types.ts`**

Add to `Civilization`:

```ts
  runInterventionUses: Record<string, number>;
```

- [ ] **Step 5: Wire the engine**

Add `runInterventionUses:{}` to the `createCivilizationForTest` literal. Add the two methods, matching the dense style of the surrounding code:

```ts
  runInterventions(){const civ=this.state.civilization;const depth=civ?cultivationDepth(civ):0;return RUN_INTERVENTIONS.map(definition=>{const uses=civ?runInterventionUses(civ,definition.id):0;const cost=runInterventionCost(definition,uses,depth);const usesLeft=Math.max(0,definition.maxUses-uses);let enabled=true,reason='';if(!civ){enabled=false;reason='Start a civilization first.';}else if(this.machineInsight()<definition.insight){enabled=false;reason=`Requires Machine Insight ${definition.insight}.`;}else if(usesLeft<=0){enabled=false;reason=`${definition.title} is exhausted for this civilization.`;}else if(this.currencyAmount(definition.currency)<cost){enabled=false;reason=`Requires ${cost} ${definition.currency.replaceAll('_',' ')}.`;}return {...definition,cost,uses,usesLeft,enabled,reason};});}
  useRunIntervention(id:string){
    const civ=this.state.civilization;
    const view=this.runInterventions().find(entry=>entry.id===id);
    if(!civ||!view){this.lastActionFailure='Unknown machine intervention.';this.emit();return false;}
    if(!view.enabled){this.lastActionFailure=view.reason;this.emit();return false;}
    const definition=runInterventionById(id)!;
    const before=captureDecisionSnapshot(civ);
    this.spendCurrency(definition.currency,view.cost);
    const label=applyRunIntervention(civ,definition);
    const newEra=eraForYears(civ.years);
    if(newEra!==civ.era)this.enterEra(civ,newEra);
    this.clampStats(civ);
    this.lastActionFailure='';
    this.decisionFeedback=buildDecisionFeedback(++this.feedbackSequence,{id:`reserve:${id}`,title:definition.title},{label},before,captureDecisionSnapshot(civ));
    this.worldImpulse=this.decisionFeedback;
    this.appendHistory(civ,`YEAR ${Math.trunc(civ.years)}: Machine reserve -> ${label}`);
    this.post(`MACHINE RESERVE COMMITTED: ${definition.title} for ${view.cost} ${definition.currency.replaceAll('_',' ')}.`);
    this.save();this.emit();return true;
  }
```

Import `RUN_INTERVENTIONS, applyRunIntervention, runInterventionById, runInterventionCost, runInterventionUses` from `./run-interventions.js` and `cultivationDepth` from `./harvest-quality.js`.

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: PASS. If `'spending every reserve intervention is a losing trade'` fails, raise `RUN_INTERVENTION_DEPTH_SCALE`'s effect by lowering the divisor from 4 to 3 and re-run; never weaken the assertion, because it is the invariant that keeps the reserve from becoming an infinite loop.

- [ ] **Step 7: Commit**

```bash
git add public/game/src public/game/dist public/game/tests
git commit -m "feat(reserve): let banked resources be spent inside a running civilization"
```

---

# Stage 5 — Interface and release

### Task 12: Pressure, depth and reserve readouts

**Files:**
- Modify: `public/game/src/ui/view-model.ts`
- Modify: `public/game/src/ui/app.ts`
- Test: `public/game/tests/presentation.test.mjs`

**Interfaces:**
- Consumes: `secondsToCascade`, `pressureMultiplier`, `entropyRate` from Task 2; `cultivationDepth`, `depthBand`, `DEPTH_BANDS`, `HARVEST_GRADE_LABELS` from Task 5; `GameEngine.runInterventions()` from Task 11.
- Produces: the view model gains `tactical.entropyRate`, `tactical.pressureMultiplier`, `tactical.secondsToCascade`, `harvest.depth`, `harvest.depthBand`, `harvest.nextBand: { grade, label, depthNeeded, secondsAway, yieldMultiplier } | null`, and `machineReserve: RunInterventionView[]`.

- [ ] **Step 1: Write the failing tests**

```js
test('the view model forecasts the cascade and the next depth band', () => {
  const engine = freshEngine();
  engine.state.machine.upgradeLevels.reality_lattice = 4;
  engine.startCivilization(510);
  const civ = engine.state.civilization;
  civ.eventChoices = 4;
  civ.era = 1;
  civ.development = 400;
  civ.tactical.entropy = 20;
  const vm = buildViewModel(engine);
  assert.equal(vm.tactical.containmentRating, 4);
  assert.ok(vm.tactical.entropyRate > 0);
  assert.ok(vm.tactical.secondsToCascade > 0);
  assert.equal(Number(vm.tactical.pressureMultiplier.toFixed(4)), Number((1 + civ.years / 6500).toFixed(4)));
  assert.equal(vm.harvest.depth, 5);
  assert.equal(vm.harvest.depthBand, 'transcendent');
  assert.equal(vm.harvest.nextBand.grade, 'ascendant');
  assert.equal(vm.harvest.nextBand.depthNeeded, 9);
  assert.ok(vm.harvest.nextBand.yieldMultiplier > vm.harvest.controlled.multiplier);
});

test('the deepest band reports no next band', () => {
  const engine = freshEngine();
  engine.startCivilization(511);
  const civ = engine.state.civilization;
  civ.eventChoices = 4;
  civ.era = 2;
  civ.development = 4000;
  assert.equal(buildViewModel(engine).harvest.nextBand, null);
});

test('the machine reserve is presented with its escalated cost and reason', () => {
  const engine = freshEngine();
  engine.startCivilization(512);
  const reserve = buildViewModel(engine).machineReserve;
  assert.equal(reserve.length, 3);
  assert.equal(reserve[0].id, 'containment_pulse');
  assert.equal(reserve[0].enabled, false);
  assert.ok(reserve[0].reason.length > 0);
  assert.equal(reserve[0].usesLeft, 3);
});

test('the render key tracks reserve affordability as a boolean, not a balance', () => {
  const engine = freshEngine();
  engine.state.meta.progression.machineInsight = 30;
  engine.state.machine.currencies.causal_mass = 5000;
  engine.startCivilization(513);
  const before = civilizationRenderKey(buildViewModel(engine));
  engine.state.machine.currencies.causal_mass = 5001;
  assert.equal(civilizationRenderKey(buildViewModel(engine)), before);
  engine.state.machine.currencies.causal_mass = 1;
  assert.notEqual(civilizationRenderKey(buildViewModel(engine)), before);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test public/game/tests/presentation.test.mjs`
Expected: FAIL — `vm.tactical.entropyRate` is undefined.

- [ ] **Step 3: Extend `view-model.ts`**

Add the imports:

```ts
import { entropyRate, pressureMultiplier, secondsToCascade } from '../game/pressure.js';
import { DEPTH_BANDS, DEPTH_YIELD_BASE, DEPTH_YIELD_RATE, HARVEST_GRADE_LABELS, cultivationDepth, depthBand } from '../game/harvest-quality.js';
```

Add a helper above `buildViewModel`:

```ts
function nextDepthBand(depth:number, containment:number, years:number, entropy:number){
  const upcoming=DEPTH_BANDS.find(band=>band.minDepth>depth);
  if(!upcoming)return null;
  const cascade=secondsToCascade(years,entropy,containment);
  return {
    grade:upcoming.grade,
    label:HARVEST_GRADE_LABELS[upcoming.grade],
    depthNeeded:upcoming.minDepth,
    secondsAway:cascade,
    yieldMultiplier:DEPTH_YIELD_BASE+DEPTH_YIELD_RATE*upcoming.minDepth,
  };
}
```

In the returned object, extend `tactical` and `harvest` and add `machineReserve`:

```ts
    tactical: civ ? {
      entropy: civ.tactical.entropy,
      entropyBand: entropyBand(civ.tactical.entropy),
      entropyRate: entropyRate(civ.years, bonuses.containmentRating),
      pressureMultiplier: pressureMultiplier(civ.years),
      secondsToCascade: secondsToCascade(civ.years, civ.tactical.entropy, bonuses.containmentRating),
      controlCapacity: civ.tactical.controlCapacity,
      controlMax: 3,
      containmentRating: bonuses.containmentRating,
      actions: (Object.keys(TACTICAL_ACTIONS) as Array<keyof typeof TACTICAL_ACTIONS>).map(id=>({
        ...TACTICAL_ACTIONS[id],
        ...engine.tacticalAvailability(id),
      })),
    } : null,
    harvest: civ ? {
      controlled: controlledHarvest,
      chaotic: chaoticHarvest,
      depth: cultivationDepth(civ),
      depthBand: depthBand(cultivationDepth(civ)),
      nextBand: nextDepthBand(cultivationDepth(civ), bonuses.containmentRating, civ.years, civ.tactical.entropy),
    } : null,
    machineReserve: civ ? engine.runInterventions() : [],
```

Extend `civilizationRenderKey` with bands and booleans only:

```ts
    vm.harvest?.depthBand ?? '',
    vm.machineReserve.map(entry => (entry.enabled ? '1' : '0')).join(''),
```

- [ ] **Step 4: Render it in `app.ts`**

Add the vent button to the existing tactical action list — it is generated from `vm.tactical.actions`, so it appears automatically once Task 10 lands; verify the `data-action="tactical" data-id="vent"` attribute is produced. Add a reserve card next to the tactical card, following the existing `card()` and `data-action` conventions:

```ts
      ${card('Machine Reserve', vm.machineReserve.map(entry=>`<button class="tactical" data-action="reserve" data-id="${esc(entry.id)}"${entry.enabled?'':' disabled'} data-tactical-reason="${esc(entry.reason)}"><b>${esc(entry.title)}</b><span>${esc(entry.summary)}</span><span>COST ${entry.cost} ${esc(entry.currency.replaceAll('_',' '))} · ${entry.usesLeft} LEFT</span></button>`).join(''))}
```

Extend `bindActions` with the new case:

```ts
case'reserve':engine.useRunIntervention(el.dataset.id!);break;
```

Add the continuous readouts through `data-live` elements so they never enter the render key:

```ts
    setText('[data-live="cascade-eta"]',`${vm.tactical.secondsToCascade.toFixed(0)}s`);
    setText('[data-live="entropy-rate"]',vm.tactical.entropyRate.toFixed(2));
    setText('[data-live="depth"]',vm.harvest.depth.toFixed(1));
```

Place the matching `<b data-live="...">` spans in the tactical and harvest cards, labelling the estimate as "AT CURRENT COURSE" so the forecast is not read as a promise.

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add public/game/src public/game/dist public/game/tests
git commit -m "feat(ui): forecast the cascade, the depth band and the machine reserve"
```

---

### Task 13: Release metadata

**Files:**
- Modify: `package.json`, `public/game/package.json`, `public/game/index.html`, `public/sw.js`, `README.md`, `public/game/README.md`
- Test: `tests/game-release.test.mjs`, `public/game/tests/presentation.test.mjs`

**Interfaces:**
- Consumes: every module created in Tasks 1-12.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing test**

In `tests/game-release.test.mjs` change the three `1.4.0` occurrences to `1.5.0`. In `presentation.test.mjs`, extend the service-worker assertion to cover the new game modules:

```js
test('the service worker precaches every new game module', () => {
  const source = readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');
  for (const name of ['run-interventions', 'pressure', 'harvest-quality', 'paths', 'rules', 'intervention-scheduler']) {
    assert.ok(source.includes(`'/game/dist/game/${name}.js'`), `sw.js must precache game/${name}.js`);
  }
  assert.ok(source.includes(`'/game/dist/data/apotheosis-events.js'`), 'sw.js must precache the Apotheosis events');
  assert.ok(source.includes("const CACHE_NAME = 'rce-app-v1.5.0'"), 'CACHE_NAME must be bumped');
});
```

Reuse the existing `readFileSync` import in that file rather than adding a second one.

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL on the version and the missing asset paths.

- [ ] **Step 3: Bump every coupled location**

Set `"version": "1.5.0"` in both `package.json` files. Change `CACHE_NAME` in `public/sw.js` to `'rce-app-v1.5.0'` and add to `APP_ASSETS`:

```js
  '/game/dist/game/run-interventions.js',
  '/game/dist/data/apotheosis-events.js',
```

Verify every other `dist/game/*.js` module is already listed and add any that is missing. Update the footer in `public/game/index.html` and the version line in both READMEs.

- [ ] **Step 4: Run the full verification**

```bash
npm test
```

```bash
npm run build
```

```bash
npm run lint && npm run typecheck
```

Expected: all three PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: release v1.5.0 with continuous pressure, cultivation depth and the Apotheosis era"
```

---

### Task 14: Browser verification

**Files:** none — this task produces evidence, not code.

- [ ] **Step 1: Start the preview**

Use the project's preview tooling to serve the app, then load the game frame.

- [ ] **Step 2: Verify the civilization phase**

Confirm, with a screenshot: the four tactical buttons including Vent with `COST 1`, the Machine Reserve card with escalated costs and remaining uses, the cascade estimate counting down, the depth readout and the next-band label, and the era readout reaching `APOTHEOSIS` on a long run.

- [ ] **Step 3: Verify the console and the layout**

Confirm no console errors, and that the reserve card and the fourth tactical button remain usable at a 375-pixel viewport width.

- [ ] **Step 4: Commit any fix the playtest surfaces**

```bash
git add -A
git commit -m "fix(ui): address the v1.5.0 playtest findings"
```

---

## Self-Review

**Spec coverage.** Continuous pressure and containment: Tasks 2 and 3. Cultivation Depth: Tasks 5 and 6. Entropy Vent: Task 10. Machine interventions during a run: Task 11. Prestige economy: Tasks 3 and 6. Intervention supply — scheduler saturation stage: Task 7; Apotheosis era: Tasks 1 and 8; deep content: Task 8; path succession: Task 9. Interface and feedback: Task 12. Save policy: Task 1 sets `SAVE_VERSION` 3, with the state-shape changes in Tasks 9, 10 and 11. Verification strategy: the focused rule tests are spread across Tasks 1-11 and the deterministic balance tests are in Tasks 4, 7, 10 and 11. Release verification: Tasks 13 and 14.

**Known deviations from the spec, to be recorded there when implemented.** The spec names `game/paths.ts` as the owner of succession and `game/rules.ts` as the owner of `eraForYears`; this plan follows that. The spec does not name the `balance-harness.mjs` test helper explicitly, which the verification section calls for as "committed as a test helper under `public/game/tests/`"; Task 4 creates it.

**Ordering risk.** `'a long run never serves one intervention over and over'` is written in Task 7 but only passes after Task 9. That is intentional — it is the regression test for the measured collapse and it must not be weakened to pass early. If the plan is executed by parallel subagents rather than in order, that test must be moved to Task 9.

**Type consistency.** `HarvestQuality.depth` is introduced in Task 5 and consumed in Tasks 6 and 12. `RunInterventionDefinition.currency` is a `ResourceKey`, which `GameEngine.currencyAmount` and `spendCurrency` already accept as a string. `universeResidueAward`'s first parameter changes meaning from civilizations to credits in Task 6, and the only caller is `consumeUniverse`, updated in the same task. `cascadeDecay` gains its second parameter in Task 2 and its only caller is updated in Task 3. `SchedulerOptions.exhausted` is required from Task 7 onward, so every call site — the engine and both scheduler tests — must supply it.
