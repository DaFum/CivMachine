# Civilization Pacing and Tactical Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the passive Civilization phase into a 2.5–4 minute no-upgrade / 5–8 minute upgraded tactical roguelite loop with Control actions, Entropy pressure, qualified harvest progression, per-run Directives, and deterministic visual feedback.

**Architecture:** Keep serializable gameplay state inside `GameEngine`, move pressure, tactical action, harvest grade, and run-offer formulas into focused pure modules, and expose them through the existing view-model boundary. Preserve the deterministic dual-Canvas renderer and DOM HUD; both consume state and feedback without owning simulation rules. This release intentionally starts a fresh v2 save and implements no v1 migration.

**Tech Stack:** TypeScript ES modules, Node test runner, DOM/CSS browser UI, deterministic Canvas 2D renderer, Vinext/Vite Sites shell, localStorage, Sites deployment.

---

## File map

**Create**

- `public/game/src/game/pressure.ts` — Entropy rate, Containment deficit, crisis thresholds, and cascade decay.
- `public/game/src/game/tactical-actions.ts` — action availability, Control costs, state effects, Probe state, and batched path influence.
- `public/game/src/game/harvest-quality.ts` — Harvest Grade, reward multiplier, Cultivation Credits, and salvage floor.
- `public/game/src/game/run-directives.ts` — deterministic Directive offers and objective definitions/evaluation.
- `public/game/src/game/upgrade-balance.ts` — runtime upgrade overrides, cost curves, Containment contribution, and tactical synergies.
- `public/game/src/data/entropy-crises.ts` — three scheduled crisis interventions with unique English copy.

**Modify**

- `public/game/src/game/types.ts` — v2 tactical, Directive, credit, grade, and bonus state.
- `public/game/src/game/rules.ts` — new save contract and v2 defaults.
- `public/game/src/game/engine.ts` — orchestration, pacing, actions, pressure, offers, objectives, credits, and fresh-save key.
- `public/game/src/game/decision-feedback.ts` — Entropy and Control deltas.
- `public/game/src/game/intervention-scheduler.ts` — faster era cadence.
- `public/game/src/game/progression.ts` — Universe unlock/copy aligned with credits.
- `public/game/src/ui/view-model.ts` — action, Entropy, Directive objective, preview, and grade data.
- `public/game/src/ui/app.ts` — action rail, Directive draft, trait preview, objective progress, and grade UI.
- `public/game/src/main.ts` — keyboard actions 1/2/3.
- `public/game/src/render/world-model.ts` — Entropy-reactive density/fractures.
- `public/game/src/render/world-presentation.ts` — Entropy bands and palette.
- `public/game/src/render/world.ts` — specialized action/crisis impulses in both Canvas paths.
- `public/game/styles.css` and `public/game/mobile.css` — responsive tactical UI and reduced-motion states.
- `public/game/tests/core.test.mjs` — gameplay, economy, deterministic, and balance tests.
- `public/game/tests/presentation.test.mjs` — Entropy visualization tests.
- `public/game/tests/browser-shell.test.mjs` — action UI, keyboard, and responsive surface tests.
- `tests/game-release.test.mjs` — release metadata, service-worker, and complete bundle checks.
- `public/game/dist/**` — compiler output committed for the browser runtime.
- `package.json`, `package-lock.json`, `public/game/package.json` — v1.3.0 release metadata.
- `public/game/index.html` — v1.3.0 footer.
- `public/sw.js` — v1.3.0 cache key and new compiled assets.
- `README.md`, `public/game/README.md` — new loop and controls.

## Task 1: Establish the fresh v2 state contract

**Files:**
- Modify: `public/game/tests/core.test.mjs`
- Modify: `public/game/src/game/types.ts`
- Modify: `public/game/src/game/rules.ts`
- Modify: `public/game/src/game/engine.ts`

- [ ] **Step 1: Write failing tests for a fresh v2 save**

Add tests that demand the complete new state and intentionally reject legacy storage:

```js
test('new saves initialize the tactical v2 civilization contract', () => {
  const state = createNewState();
  assert.equal(state.saveVersion, 2);
  assert.equal(state.machine.cultivationCreditsThisUniverse, 0);
  assert.deepEqual(state.machine.runBuild.directiveOfferIds, []);
  assert.equal(state.machine.runBuild.nextCivilizationSeed, 0);

  const civ = GameEngine.createCivilizationForTest(41);
  assert.deepEqual(civ.tactical, {
    entropy: 0,
    controlCapacity: 3,
    triggeredCrises: [],
    probedEventId: '',
    actionUsage: { stabilize: 0, accelerate: 0, probe: 0 },
  });
  assert.equal(civ.directiveId, '');
});

test('v2 intentionally ignores the legacy v1 save key', () => {
  const legacy = createNewState();
  legacy.saveVersion = 1;
  const storage = new Map([
    ['reality_consumption_engine_browser_save_v1', JSON.stringify(legacy)],
  ]);
  const engine = new GameEngine({ storage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  }});
  assert.equal(engine.state.saveVersion, 2);
  assert.equal(engine.state.machine.civilizationsTotal, 0);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
./node_modules/.bin/tsc -p public/game/tsconfig.json && node --test --test-name-pattern='tactical v2|legacy v1' public/game/tests/core.test.mjs
```

Expected: FAIL because `SAVE_VERSION` is 1 and the tactical/credit fields do not exist.

- [ ] **Step 3: Define the new serializable types**

Add the following contracts to `types.ts` and use them in `Civilization`, `GameState`, and `RuntimeBonuses`:

```ts
export type TacticalActionId = 'stabilize' | 'accelerate' | 'probe';
export type HarvestGrade = 'premature' | 'established' | 'transcendent' | 'ascendant';

export interface TacticalState {
  entropy: number;
  controlCapacity: number;
  triggeredCrises: number[];
  probedEventId: string;
  actionUsage: Record<TacticalActionId, number>;
}

export interface DirectiveObjectiveState {
  id: string;
  completed: boolean;
}
```

Add `tactical`, `directiveId`, and `directiveObjective` to `Civilization`; add `cultivationCreditsThisUniverse`, `directiveOfferIds`, `nextCivilizationSeed`, and `previewTraitIds` to machine state. Add `containmentRating`, `entropyGainMult`, `controlRecharge`, `accelerateYears`, and `accelerateTimer` to `RuntimeBonuses`.

- [ ] **Step 4: Initialize v2 defaults and use a v2 storage key**

Set `SAVE_VERSION = 2`, initialize every field in `createNewState()` and `createCivilizationForTest()`, and change the private engine key to:

```ts
const SAVE_KEY = 'reality_consumption_engine_browser_save_v2';
```

Do not read, normalize, or convert the v1 key.

- [ ] **Step 5: Compile and verify GREEN**

Run the focused command from Step 2.

Expected: both v2 tests PASS.

- [ ] **Step 6: Commit the state contract**

```bash
git add public/game/src/game/types.ts public/game/src/game/rules.ts public/game/src/game/engine.ts public/game/tests/core.test.mjs public/game/dist
git commit -m "Introduce fresh v2 tactical save state"
```

## Task 2: Implement Entropy, Containment, and deterministic crises

**Files:**
- Create: `public/game/src/game/pressure.ts`
- Create: `public/game/src/data/entropy-crises.ts`
- Modify: `public/game/src/game/engine.ts`
- Modify: `public/game/tests/core.test.mjs`

- [ ] **Step 1: Write failing pure pressure tests**

Import the wished-for API and add:

```js
test('containment deficit accelerates entropy while rating suppresses it', () => {
  assert.equal(entropyRate(0, 0, 1), 0.32);
  assert.ok(entropyRate(1, 0, 1) > 0.8);
  assert.ok(entropyRate(2, 4, 1) < 0.31);
});

test('pressure queues every crossed crisis exactly once', () => {
  const civ = GameEngine.createCivilizationForTest(52);
  civ.tactical.entropy = 24.9;
  const first = advancePressure(civ, { containmentRating: 0, entropyGainMult: 1 }, 1);
  const second = advancePressure(civ, { containmentRating: 0, entropyGainMult: 1 }, 1);
  assert.deepEqual(first.queuedCrises, ['entropy_crisis_25']);
  assert.deepEqual(second.queuedCrises, []);
  assert.deepEqual(civ.tactical.triggeredCrises, [25]);
});

test('entropy and control values remain bounded', () => {
  const civ = GameEngine.createCivilizationForTest(53);
  civ.tactical.entropy = 99.9;
  advancePressure(civ, { containmentRating: 0, entropyGainMult: 4 }, 10);
  assert.equal(civ.tactical.entropy, 100);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run the focused pressure pattern; expect module-not-found for `pressure.js`.

- [ ] **Step 3: Implement the pressure module**

Export constants and pure functions equivalent to:

```ts
export const ENTROPY_THRESHOLDS = [25, 50, 75] as const;
export const ENTROPY_CRISIS_IDS: Record<number, string> = {
  25: 'entropy_crisis_25',
  50: 'entropy_crisis_50',
  75: 'entropy_crisis_75',
};

export function requiredContainment(era: number): number {
  return [0, 2, 4][Math.max(0, Math.min(2, era))] ?? 0;
}

export function entropyRate(era: number, rating: number, multiplier = 1): number {
  const base = [0.32, 0.48, 0.72][Math.max(0, Math.min(2, era))] ?? 0.72;
  const safeRating = Math.max(0, rating);
  const deficit = Math.max(0, requiredContainment(era) - safeRating);
  return base * (1 + 0.35 * deficit) / (1 + 0.35 * safeRating) * Math.max(0.1, multiplier);
}
```

`advancePressure` clamps Entropy, records a threshold before returning its crisis id, and exposes `cascadeDecay(entropy)` with zero below 100 and a strong deterministic value at 100.

- [ ] **Step 4: Add three crisis interventions**

Create English events named `The First Containment Fracture`, `History Desynchronizes`, and `The Cultivator Is Seen`. Each event has two unique action labels, two unique prediction texts, `scheduled_only: true`, and effects that trade Stability/Sanity against Awareness/Attention/Entropy. Export them as `ENTROPY_CRISES` and append them after `applyInterventionCopy(C.events)` in the engine catalog.

- [ ] **Step 5: Integrate pressure into `tick()`**

Before Stability decay, call `advancePressure`; append returned crisis ids to `scheduledEvents` only when absent. Include Entropy in passive decay and add `cascadeDecay` at 100. Save only when a threshold queues a crisis; preserve the existing half-second UI emission cadence.

- [ ] **Step 6: Verify pressure tests GREEN and run all core tests**

Run:

```bash
./node_modules/.bin/tsc -p public/game/tsconfig.json && node --test public/game/tests/core.test.mjs
```

Expected: all core tests PASS.

- [ ] **Step 7: Commit pressure and crisis behavior**

```bash
git add public/game/src/game/pressure.ts public/game/src/data/entropy-crises.ts public/game/src/game/engine.ts public/game/tests/core.test.mjs public/game/dist
git commit -m "Add escalating Entropy pressure and crises"
```

## Task 3: Add shared-capacity tactical actions

**Files:**
- Create: `public/game/src/game/tactical-actions.ts`
- Modify: `public/game/src/game/decision-feedback.ts`
- Modify: `public/game/src/game/engine.ts`
- Modify: `public/game/tests/core.test.mjs`

- [ ] **Step 1: Write one failing test per tactical action**

Use a real engine and assert exact deltas:

```js
test('Stabilize spends two Control for Stability, Attention, and Entropy', () => {
  const engine = freshEngine();
  engine.startCivilization(61);
  const civ = engine.state.civilization;
  civ.stats.stability = 60;
  assert.equal(engine.useTacticalAction('stabilize'), true);
  assert.equal(civ.tactical.controlCapacity, 1);
  assert.equal(civ.stats.stability, 74);
  assert.equal(civ.stats.attention, 6);
  assert.equal(civ.tactical.entropy, 8);
});

test('Accelerate advances the run and cannot fire while an event is open', () => {
  const engine = freshEngine();
  engine.startCivilization(62);
  const civ = engine.state.civilization;
  const before = { years: civ.years, timer: civ.eventTimer };
  assert.equal(engine.useTacticalAction('accelerate'), true);
  assert.equal(civ.years, before.years + 200);
  assert.equal(civ.eventTimer, Math.max(0, before.timer - 8));
  engine.forceEvent('routine_compliance_audit');
  assert.equal(engine.useTacticalAction('accelerate'), false);
});

test('Probe charges once and reveals only the current event', () => {
  const engine = freshEngine();
  engine.startCivilization(63);
  engine.forceEvent('dreams_of_gears');
  assert.equal(engine.useTacticalAction('probe'), true);
  assert.equal(engine.state.civilization.tactical.probedEventId, 'dreams_of_gears');
  assert.equal(engine.useTacticalAction('probe'), false);
});
```

- [ ] **Step 2: Verify every action test fails for the missing API**

Run with `--test-name-pattern='Stabilize|Accelerate|Probe'` and confirm RED.

- [ ] **Step 3: Implement action availability and effects**

Export:

```ts
export interface TacticalAvailability { enabled: boolean; reason: string; cost: number; }
export interface TacticalActionOutcome { id: TacticalActionId; title: string; label: string; }

export function tacticalAvailability(civ: Civilization, id: TacticalActionId): TacticalAvailability;
export function applyTacticalAction(civ: Civilization, id: TacticalActionId, bonuses: RuntimeBonuses): TacticalActionOutcome | null;
```

Enforce shared Control costs, monitoring/event restrictions, Probe idempotence, clamping, and the approved exact base effects. Every third use of an action adds +1 affinity to each of its two associated paths.

- [ ] **Step 4: Expose `GameEngine.useTacticalAction()`**

Capture a snapshot, apply the action, refresh an era crossed by Accelerate, build feedback with pseudo event ids `tactical:stabilize`, `tactical:accelerate`, or `tactical:probe`, save, and emit. Failed calls set `lastActionFailure` without mutating Civilization state.

- [ ] **Step 5: Include Entropy and Control in exact feedback**

Extend the feedback metric definitions:

```ts
{ key: 'entropy', label: 'Entropy', inverse: true },
{ key: 'controlCapacity', label: 'Control Capacity' },
```

Capture both from `civ.tactical`.

- [ ] **Step 6: Restore Control after choices and era changes**

Clamp `controlCapacity + runtimeBonuses().controlRecharge` after every resolved intervention and add 1 on an era transition. Clear `probedEventId` when the event resolves or changes.

- [ ] **Step 7: Verify GREEN and commit**

Run the full core test file, then commit tactical action sources, tests, engine, feedback, and compiled output with message `Add shared-capacity tactical actions`.

## Task 4: Recalibrate era and intervention pacing with seed-sweep gates

**Files:**
- Modify: `public/game/src/game/engine.ts`
- Modify: `public/game/src/game/intervention-scheduler.ts`
- Modify: `public/game/tests/core.test.mjs`

- [ ] **Step 1: Write failing pacing tests**

Require the approved windows and first-event delay:

```js
test('new civilizations reach the first intervention after four seconds', () => {
  const engine = freshEngine();
  engine.startCivilization(71);
  assert.equal(engine.state.civilization.eventTimer, 4);
});

test('active cadence stays fast across eras', () => {
  const civ = GameEngine.createCivilizationForTest(72);
  assert.deepEqual(eventDelayWindow(civ), { min: 10, max: 14 });
  civ.era = 1;
  assert.deepEqual(eventDelayWindow(civ), { min: 8, max: 11 });
  civ.era = 2;
  assert.deepEqual(eventDelayWindow(civ), { min: 7, max: 10 });
});
```

- [ ] **Step 2: Verify RED, then implement the new cadence**

Set initial `eventTimer` to 4, replace scheduler base windows, keep a minimum of 5 seconds, and remove recovery logic that lengthens low-stat waits. Change history advancement to `25 * dt`.

- [ ] **Step 3: Add deterministic survival sweep helpers inside the test file**

Simulate 60 fixed seeds at 0.25-second steps, immediately resolving events with a safety utility based on Stability, Sanity, Awareness, Attention, and Entropy. Add two assertions:

```js
assert.ok(noUpgradeMedian >= 150 && noUpgradeMedian <= 240);
assert.ok(noUpgradeP95 < 300);
assert.ok(containmentBuildMedian >= 300 && containmentBuildMedian <= 480);
```

Configure the build sweep with four Containment points by directly setting upgrade levels in test state. Keep the loop capped at 600 simulated seconds so failures terminate.

- [ ] **Step 4: Run RED and tune only documented pressure constants**

The first sweep must fail before tuning. Adjust pressure/cascade constants, not test limits or seed selection, until both acceptance bands pass.

- [ ] **Step 5: Run the full core suite and commit**

Expected: pacing, balance, and all legacy core behaviors PASS. Commit with message `Rebalance Civilization run pacing`.

## Task 5: Replace arbitrary harvest counts with grade and credits

**Files:**
- Create: `public/game/src/game/harvest-quality.ts`
- Modify: `public/game/src/game/engine.ts`
- Modify: `public/game/src/game/rules.ts`
- Modify: `public/game/src/game/progression.ts`
- Modify: `public/game/src/ui/view-model.ts`
- Modify: `public/game/tests/core.test.mjs`

- [ ] **Step 1: Write failing grade and prestige tests**

```js
test('premature harvest gives reduced resources and zero credits', () => {
  const engine = freshEngine();
  engine.startCivilization(81);
  const normal = engine.previewHarvest(false);
  const result = engine.harvest(false);
  assert.equal(engine.state.machine.lastHarvest.grade, 'premature');
  assert.equal(engine.state.machine.lastHarvest.credits, 0);
  assert.equal(engine.state.machine.cultivationCreditsThisUniverse, 0);
  assert.ok(result.causal_mass <= normal.causal_mass);
});

test('qualified grades award two, three, or four Cultivation Credits', () => {
  const civ = GameEngine.createCivilizationForTest(82);
  civ.eventChoices = 4;
  civ.era = 1;
  assert.deepEqual(evaluateHarvestQuality(civ, false), { grade: 'established', multiplier: .75, credits: 2 });
  civ.era = 2;
  assert.equal(evaluateHarvestQuality(civ, false).credits, 3);
  civ.pathState.endgameState = 'endgame_machine_faith';
  assert.equal(evaluateHarvestQuality(civ, false).credits, 4);
});

test('Universe consumption requires eighteen Cultivation Credits', () => {
  const engine = freshEngine();
  engine.state.meta.progression.unlockedSystems.push('universe_prestige');
  engine.state.machine.cultivationCreditsThisUniverse = 17;
  assert.equal(engine.canConsumeUniverse(), false);
  engine.state.machine.cultivationCreditsThisUniverse = 18;
  assert.equal(engine.canConsumeUniverse(), true);
});
```

- [ ] **Step 2: Verify RED**

Expected: missing `evaluateHarvestQuality` and credit state behavior.

- [ ] **Step 3: Implement grade evaluation and salvage**

Return the approved four grades. `applyHarvestQuality` multiplies final rounded rewards and applies a deterministic minimum of 8 Causal Mass for a collapsed Premature run, without granting credits.

- [ ] **Step 4: Integrate grade into previews and harvest records**

Both `previewHarvest` and `harvest` use the same quality calculation. Persist `grade`, `credits`, `objective_completed`, and `reward_multiplier` in `lastHarvest`. Add credits before returning to Machine phase.

- [ ] **Step 5: Update Universe gating and view-model requirement**

Change the requirement from six Civilizations to 18 credits, expose `cultivationCreditsThisUniverse`, and keep lifetime `civilizationsTotal` for history/unlocks only.

- [ ] **Step 6: Verify the instant-harvest exploit is closed**

Add a six-run test that starts and harvests immediately each time; assert zero credits and `canConsumeUniverse() === false`.

- [ ] **Step 7: Run core tests and commit**

Commit with message `Gate Universe progress by harvest quality`.

## Task 6: Draft deterministic Directives and preview the next Civilization

**Files:**
- Create: `public/game/src/game/run-directives.ts`
- Modify: `public/game/src/game/engine.ts`
- Modify: `public/game/src/game/types.ts`
- Modify: `public/game/src/ui/view-model.ts`
- Modify: `public/game/tests/core.test.mjs`

- [ ] **Step 1: Write failing determinism and lifecycle tests**

Require identical offers for identical inputs, exactly three when at least three are known, a selected Directive copied into Civilization state, and a fresh offer after harvest.

```js
test('Directive offers are deterministic per prepared run', () => {
  const ids = CONTENT.directives.map(item => item.id);
  assert.deepEqual(buildDirectiveOffers(ids, 12345, 3), buildDirectiveOffers(ids, 12345, 3));
  assert.equal(new Set(buildDirectiveOffers(ids, 12345, 3)).size, 3);
});

test('a Directive locks only for one Civilization', () => {
  const engine = preparedDirectiveEngine();
  const selected = engine.state.machine.runBuild.directiveOfferIds[0];
  assert.equal(engine.selectDirective(selected), true);
  engine.startCivilization(91);
  assert.equal(engine.state.civilization.directiveId, selected);
  engine.harvest(false);
  assert.equal(engine.state.machine.runBuild.selectedDirective, '');
  assert.equal(engine.state.machine.runBuild.directiveLocked, false);
});
```

- [ ] **Step 2: Verify RED and implement deterministic sampling**

Use a local seeded PRNG in `run-directives.ts`; never call `Math.random()` while selecting offers. Export objective definitions for all six existing Directives with concrete completion predicates and English descriptions.

- [ ] **Step 3: Prepare and persist the next run**

Add `GameEngine.prepareNextRun(seed = 0)`. Generate and persist `nextCivilizationSeed`, up to three known Directive ids, and trait preview ids. Reloading Machine phase returns the same values.

- [ ] **Step 4: Start from the prepared seed and preview**

When no explicit test seed is supplied, `startCivilization()` consumes `nextCivilizationSeed` and the previewed trait selection. Once Directives are unlocked, starting requires a selected offered Directive. Before the system unlocks, starting without one remains valid.

- [ ] **Step 5: Evaluate Directive objectives at harvest**

Evaluate the active objective once. A completion adds 15% to all rewards and 1 Cultivation Credit; the bonus appears in `lastHarvest` and the exact harvest record.

- [ ] **Step 6: Verify run lifecycle, determinism, and commit**

Run the full core suite and commit with message `Add per-run Directive drafts and objectives`.

## Task 7: Rebalance upgrades around Containment and tactical utility

**Files:**
- Create: `public/game/src/game/upgrade-balance.ts`
- Modify: `public/game/src/game/engine.ts`
- Modify: `public/game/src/game/types.ts`
- Modify: `public/game/tests/core.test.mjs`

- [ ] **Step 1: Write failing upgrade override tests**

Assert the machine growth range, Containment contribution, Prediction/Probe synergy, Temporal acceleration values, and that Bureaucracy no longer lengthens intervention delays.

```js
test('machine upgrade overrides keep growth between 1.45 and 1.65', () => {
  for (const definition of balancedMachineUpgrades(CONTENT.machine_upgrades)) {
    assert.ok(definition.growth >= 1.45 && definition.growth <= 1.65);
  }
});

test('protective upgrades produce visible Containment Rating', () => {
  const engine = freshEngine();
  engine.state.machine.upgradeLevels = {
    reality_lattice: 1,
    awareness_scrubber: 1,
    sanity_protocol: 1,
    cosmic_muffling: 1,
  };
  assert.equal(engine.runtimeBonuses().containmentRating, 4);
});
```

- [ ] **Step 2: Verify RED, then implement non-generated overrides**

Do not hand-edit the generated Godot catalog. Clone definitions through `balancedMachineUpgrades()` and override base cost, growth, and English description by id. Keep ids, currencies, and max levels stable.

- [ ] **Step 3: Apply runtime tactical bonuses**

Calculate Containment Rating from protective levels. Prediction Core determines Probe precision. Temporal Injector keeps 2×/4× and increases `accelerateYears`/`accelerateTimer`. Stable Constants multiplies Entropy gain instead of creating slower, emptier runs. Bureaucracy of Gods improves Control recharge at its level breakpoint instead of adding event delay.

- [ ] **Step 4: Add level-3/max qualitative perks**

Implement perks only for existing upgrade ids: resource modules add a small grade multiplier at level 3; Contingency Vat keeps chaotic retention; protective modules gain their Containment points. Expose the perk in the overridden English description.

- [ ] **Step 5: Verify first-run affordability**

Extend the deterministic harvest simulation to assert that a median normal first run can buy at least one currently available machine upgrade.

- [ ] **Step 6: Run core tests and commit**

Commit with message `Rebalance upgrades for tactical survival`.

## Task 8: Build the tactical DOM interface and input map

**Files:**
- Modify: `public/game/src/ui/view-model.ts`
- Modify: `public/game/src/ui/app.ts`
- Modify: `public/game/src/main.ts`
- Modify: `public/game/styles.css`
- Modify: `public/game/mobile.css`
- Modify: `public/game/tests/browser-shell.test.mjs`

- [ ] **Step 1: Write failing source-level UI tests**

Require an Entropy live region, three tactical buttons, Control segments, disabled reasons, shortcuts 1/2/3, Directive offers, trait preview, objective copy, and Harvest Grade preview. Assert the action rail appears before secondary `<details>` panels.

- [ ] **Step 2: Verify RED**

Run:

```bash
./node_modules/.bin/tsc -p public/game/tsconfig.json && node --test public/game/tests/browser-shell.test.mjs
```

Expected: FAIL because tactical/action selectors and keyboard bindings are absent.

- [ ] **Step 3: Expose a complete tactical view model**

Return:

```ts
tactical: {
  entropy,
  entropyBand,
  controlCapacity,
  controlMax: 3,
  containmentRating,
  requiredContainment,
  actions: ['stabilize','accelerate','probe'].map(id => ({ id, ...engine.tacticalAvailability(id) })),
},
```

Also expose Directive offers, preview traits, objective status, current and projected Harvest Grade, credits, and the 18-credit requirement.

- [ ] **Step 4: Render Machine draft and Civilization action rail**

Machine phase shows up to three offered Directives and preview traits above `START CIVILIZATION`. Civilization phase places the Entropy/Control rail immediately below the world and before intervention/details. Buttons use `data-action="tactical"`, `data-id`, visible cost, risk copy, and `aria-describedby` disabled reasons.

- [ ] **Step 5: Bind pointer and keyboard actions once**

Extend `bindActions()` for tactical ids. Add a single `keydown` listener in `main.ts` mapping Digit1/2/3 and Numpad1/2/3, ignoring repeated keys, editable targets, Machine phase, and modifier chords.

- [ ] **Step 6: Style desktop, portrait, landscape, and reduced motion**

Use a three-column action rail on desktop and a compact stacked/grid layout on narrow screens. Keep 44px minimum touch targets, visible focus, non-color Entropy labels, safe-area padding, and static impulse alternatives under `prefers-reduced-motion`.

- [ ] **Step 7: Verify UI tests GREEN and commit**

Commit with message `Add tactical Civilization controls`.

## Task 9: Make the world react to Entropy and action type

**Files:**
- Modify: `public/game/src/render/world-model.ts`
- Modify: `public/game/src/render/world-presentation.ts`
- Modify: `public/game/src/render/world.ts`
- Modify: `public/game/tests/presentation.test.mjs`

- [ ] **Step 1: Write failing presentation tests**

Assert Entropy affects palette/bands, structural keys change only when Entropy crosses 25-point bands, and tactical feedback ids select distinct impulse kinds.

```js
test('Entropy changes presentation in stable structural bands', () => {
  const civ = GameEngine.createCivilizationForTest(101);
  const stable = worldPresentation(civ);
  civ.tactical.entropy = 76;
  const critical = worldPresentation(civ);
  assert.notEqual(stable.bands.entropy, critical.bands.entropy);
  assert.ok(critical.entropy > stable.entropy);
});
```

- [ ] **Step 2: Verify RED, then add Entropy presentation state**

Blend high Entropy toward amber/red, increase fractures/haze at thresholds, and include only the Entropy band in `structuralWorldKey`; tiny tick changes must not redraw static layers.

- [ ] **Step 3: Draw specialized impulses in both renderer paths**

Inspect `feedback.eventId` prefixes:

- `tactical:stabilize` draws a containment ring.
- `tactical:accelerate` draws horizontal time streaks.
- `tactical:probe` draws scan lines and reticles.
- `entropy_crisis_` draws a short fracture pulse.

Reuse the existing feedback sequence/start-time machinery. Reduced motion draws one static frame.

- [ ] **Step 4: Verify presentation and browser-shell suites, then commit**

Commit with message `Visualize Entropy and tactical action impulses`.

## Task 10: Mark v1.3.0 and update offline/release surfaces

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `public/game/package.json`
- Modify: `public/game/index.html`
- Modify: `public/sw.js`
- Modify: `README.md`
- Modify: `public/game/README.md`
- Modify: `tests/game-release.test.mjs`
- Modify: `public/game/tests/core.test.mjs`

- [ ] **Step 1: Write failing release tests**

Require package/footer version `1.3.0`, cache key `rce-app-v1.3.0`, all new compiled modules in the service-worker asset list, 78 total interventions, and globally unique labels/predictions including the six crisis choices.

- [ ] **Step 2: Verify RED**

Run release and core content tests; expect old v1.2.1 metadata and missing crisis asset/count failures.

- [ ] **Step 3: Update release metadata and service worker**

Set all app versions to 1.3.0, update the footer, bump the cache key, and add both the `.js` and `.js.map` artifacts for every newly compiled gameplay/data module needed by the browser runtime. Keep the deterministic Canvas renderer as the production renderer.

- [ ] **Step 4: Update English documentation**

Document Control Capacity, tactical actions, Entropy, Harvest Grade, Cultivation Credits, per-run Directives, keyboard controls, fresh-save policy, and lack of offline progression.

- [ ] **Step 5: Compile and run release tests GREEN**

Run:

```bash
./node_modules/.bin/tsc -p public/game/tsconfig.json && node --test tests/game-release.test.mjs public/game/tests/*.test.mjs
```

Expected: all tests PASS and compiled output includes every new module.

- [ ] **Step 6: Commit v1.3.0 metadata**

Commit with message `Prepare tactical roguelite release v1.3.0`.

## Task 11: Full verification, browser playtest, deployment, and ZIP

**Files:**
- Verify: entire checkout
- Create locally after the release commit: `/workspace/Reality_Consumption_Engine_Browser_v1.3.0.zip`

- [ ] **Step 1: Run the complete automated gate**

```bash
./node_modules/.bin/tsc -p public/game/tsconfig.json
node --test tests/game-release.test.mjs public/game/tests/*.test.mjs
npm run lint
git diff --check
```

Expected: TypeScript exit 0, every test passes with zero failures, lint exit 0, and no whitespace errors.

- [ ] **Step 2: Start the official agent preview**

Run `sites-preview start "$PWD"`. Open only `http://terminal.local:4173/` through the cloud browser.

- [ ] **Step 3: Playtest the complete loop**

Verify with screenshots and DOM state:

- new v2 save and English UI,
- deterministic Directive offer and visible trait preview,
- start is correctly gated after Directives unlock,
- first event timing,
- Stabilize/Accelerate/Probe costs and exact feedback,
- keyboard 1/2/3,
- Control recharge after a choice,
- Entropy threshold color/crisis behavior,
- premature Harvest Grade and zero credits,
- qualified grade and objective display,
- world action impulses,
- no app-origin console errors.

- [ ] **Step 4: Check responsive and accessibility states**

Inspect desktop, 390×844 portrait, and 844×390 landscape. Confirm the world remains dominant, action buttons meet touch sizing, no HUD overlap occurs, focus is visible, and reduced-motion state retains non-color feedback.

- [ ] **Step 5: Run the production checkpoint**

Use the existing Sites project checkout and checkpoint with message `Ship tactical Civilization loop v1.3.0`. If the launch is nonterminal, start exactly one immutable-id monitor; after terminal status, make the required direct main-agent deployment-status call and report only the verified production URL.

- [ ] **Step 6: Create the clean source ZIP from the deployed commit**

After deployment success and a clean synchronized branch:

```bash
git archive --format=zip --output=/workspace/Reality_Consumption_Engine_Browser_v1.3.0.zip HEAD
```

Verify the ZIP with:

```bash
unzip -t /workspace/Reality_Consumption_Engine_Browser_v1.3.0.zip
unzip -l /workspace/Reality_Consumption_Engine_Browser_v1.3.0.zip | rg 'public/game/dist/game/(pressure|tactical-actions|harvest-quality|run-directives|upgrade-balance)\.js'
```

Expected: archive test reports no errors and lists all new compiled modules.

- [ ] **Step 7: Save the ZIP as a new persistent user-facing file**

Create a new Library item named `Reality_Consumption_Engine_Browser_v1.3.0.zip`, preserve the returned file identity on the local ZIP, and provide the verified ZIP link together with the production Site URL.

## Spec coverage self-check

| Approved requirement | Implemented by |
| --- | --- |
| 2.5–4 minute no-upgrade / 5–8 minute build curve | Tasks 2, 4, 7 |
| Shared 3-point tactical capacity | Tasks 1, 3, 8 |
| Stabilize, Accelerate, Probe | Tasks 3, 8, 9 |
| Faster interventions and eras | Task 4 |
| Entropy thresholds and crises | Tasks 2, 9 |
| Upgrade necessity without hard gate | Tasks 2, 7 |
| Harvest Grade and 18 credits | Task 5 |
| Per-run deterministic Directive and objective | Task 6 |
| Trait preview and Universe-level Matrix | Task 6 |
| Exact feedback and responsive visual impulses | Tasks 3, 8, 9 |
| Fresh save with no migration | Task 1 |
| English v1.3.0 release | Task 10 |
| Site update and downloadable ZIP | Task 11 |
