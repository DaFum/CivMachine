# State-Reactive Evolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver deterministic path-aware interventions, 157 fully unique English choice labels and predictions, exact post-choice feedback, and a larger layered state-reactive world without regressing mobile performance or save compatibility.

**Architecture:** Keep simulation and selection deterministic in pure game modules, apply browser-authored copy through a typed overlay, expose transient decision feedback through the existing view model, and split world presentation into cached structural layers plus capped dynamic effects. The DOM remains responsible for readable controls and uses stable render keys to avoid replacing active touch targets.

**Tech Stack:** TypeScript, Phaser 3.90, Canvas 2D fallback, DOM/CSS, Node test runner, Vinext/React shell, Service Worker, Sites.

---

## File map

- Create `public/game/src/data/intervention-copy.ts`: complete browser-authored copy overlay and merge helper.
- Create `public/game/src/game/intervention-scheduler.ts`: pure pool construction, deterministic weighted pick, recent-event recording, and cadence windows.
- Create `public/game/src/game/decision-feedback.ts`: before/after snapshots and exact delta construction.
- Create `public/game/src/render/world-presentation.ts`: semantic palettes, state bands, atmosphere values, and structural render keys.
- Modify `public/game/src/game/types.ts`: optional scheduler save field and feedback types.
- Modify `public/game/src/game/engine.ts`: normalized saves, new scheduler, feedback lifecycle, and staged delay.
- Modify `public/game/src/ui/view-model.ts`: feedback projection and render-key integration.
- Modify `public/game/src/ui/app.ts`: compact feedback card, world impulse class, and conditional DOM replacement.
- Modify `public/game/src/render/world.ts`: cached Phaser layers, capped dynamic effects, and fallback parity.
- Modify `public/game/src/render/world-model.ts`: richer deterministic world snapshot values.
- Modify `public/game/styles.css` and `public/game/mobile.css`: larger playfield, feedback card, state/tone styling, and responsive rules.
- Modify `public/sw.js`, root/game package versions, and README files: v1.2.0 release metadata and precache.
- Modify `public/game/tests/*.test.mjs` and `tests/game-release.test.mjs`: behavioral, content, rendering-contract, and release tests.

### Task 1: Enforce complete unique intervention copy

**Files:**
- Create: `public/game/src/data/intervention-copy.ts`
- Modify: `public/game/src/game/engine.ts`
- Test: `public/game/tests/core.test.mjs`

- [ ] **Step 1: Add a failing uniqueness test**

Add this import and test to `public/game/tests/core.test.mjs`:

```js
import { applyInterventionCopy, INTERVENTION_COPY } from '../dist/data/intervention-copy.js';

test('all 157 intervention choices use unique action and consequence copy', () => {
  const events = applyInterventionCopy(CONTENT.events);
  const choices = events.flatMap(event => event.choices);
  const normalized = values => values.map(value => value.trim().toLowerCase());
  assert.equal(choices.length, 157);
  assert.equal(Object.keys(INTERVENTION_COPY).length, 50);
  assert.equal(new Set(normalized(choices.map(choice => choice.label))).size, 157);
  assert.equal(new Set(normalized(choices.map(choice => choice.prediction))).size, 157);
});
```

- [ ] **Step 2: Run the focused test and verify the missing module fails**

Run: `./node_modules/.bin/tsc -p public/game/tsconfig.json && node --test --test-name-pattern='all 157 intervention' public/game/tests/core.test.mjs`

Expected: compilation fails because `intervention-copy.ts` does not exist.

- [ ] **Step 3: Implement the copy overlay**

Create a typed `INTERVENTION_COPY` record with exactly the 50 path-event IDs in `CONTENT.events.slice(25)`. Each value contains two `{ label, prediction }` objects. Author every string from that event's title, body, path, phase, and existing effects; do not generate labels from shared templates. Export this complete merge helper:

```ts
type ChoiceCopy = Readonly<{ label: string; prediction: string }>;
type EventCopy = Readonly<[ChoiceCopy, ChoiceCopy]>;

export const INTERVENTION_COPY: Readonly<Record<string, EventCopy>> = {
  // Exactly one explicit entry for each of the 50 path-event IDs.
};

export function applyInterventionCopy<T extends { id: string; choices?: readonly unknown[] }>(events: readonly T[]): T[] {
  return events.map(event => {
    const copy = INTERVENTION_COPY[event.id];
    if (!copy || !event.choices) return structuredClone(event) as T;
    const choices = event.choices.map((choice, index) => ({
      ...(choice as Record<string, unknown>),
      ...(copy[index] ?? {}),
    }));
    return { ...structuredClone(event), choices } as T;
  });
}
```

- [ ] **Step 4: Apply the overlay once in the engine catalog initialization**

Import `applyInterventionCopy` in `engine.ts` and replace the direct event assignment with:

```ts
private events:any[] = applyInterventionCopy(C.events);
```

- [ ] **Step 5: Build and run the uniqueness test**

Run: `./node_modules/.bin/tsc -p public/game/tsconfig.json && node --test --test-name-pattern='all 157 intervention' public/game/tests/core.test.mjs`

Expected: 1 matching test passes with 157 unique labels and predictions.

### Task 2: Add deterministic weighted scheduling and staged cadence

**Files:**
- Create: `public/game/src/game/intervention-scheduler.ts`
- Modify: `public/game/src/game/types.ts`
- Modify: `public/game/src/game/engine.ts`
- Test: `public/game/tests/core.test.mjs`

- [ ] **Step 1: Add failing scheduler tests**

Add tests that construct seven eligible mock events, record six recent IDs, and assert the seventh is the only selectable item. Add a second test that calls the scheduler twice with identical civilization state and roll `0.42` and asserts the same ID. Add cadence assertions:

```js
assert.deepEqual(eventDelayWindow({ ...civ, era: 0, eventChoices: 0 }), { min: 22, max: 30 });
assert.deepEqual(eventDelayWindow({ ...civ, era: 1, eventChoices: 4 }), { min: 17, max: 24 });
assert.deepEqual(eventDelayWindow({ ...civ, era: 2, eventChoices: 10 }), { min: 11, max: 17 });
```

- [ ] **Step 2: Run the focused tests and verify missing exports fail**

Run: `./node_modules/.bin/tsc -p public/game/tsconfig.json && node --test --test-name-pattern='scheduler|cadence' public/game/tests/core.test.mjs`

Expected: compilation fails because the scheduler module does not exist.

- [ ] **Step 3: Implement pure scheduler boundaries**

Create and export:

```ts
export interface SchedulerEvent { id:string; weight?:number; path_id?:string; path_phase?:string; }
export interface WeightedIntervention<T extends SchedulerEvent> { event:T; weight:number; }

export function recentEventIds(civ:Civilization): string[] {
  return Array.isArray(civ.recentEventIds) ? civ.recentEventIds : [];
}

export function recordRecentIntervention(civ:Civilization, id:string): void {
  const recent = recentEventIds(civ);
  recent.push(id);
  while (recent.length > 6) recent.shift();
  civ.recentEventIds = recent;
}

export function chooseWeightedIntervention<T extends SchedulerEvent>(pool:WeightedIntervention<T>[], roll01:number):T|null {
  const total = pool.reduce((sum, item) => sum + item.weight, 0);
  if (!pool.length || total <= 0) return null;
  let cursor = Math.max(0, Math.min(.999999999, roll01)) * total;
  for (const item of pool) { cursor -= item.weight; if (cursor <= 0) return item.event; }
  return pool[pool.length - 1]!.event;
}
```

`buildInterventionPool` must apply base, path, phase, state, and freshness multipliers; exclude the latest six IDs on its first pass; and retry without that exclusion only if the first pool is empty.

- [ ] **Step 4: Add the optional save field and normalization**

Add `recentEventIds?: string[]` to `Civilization`, initialize it to `[]` in `createCivilizationForTest`, and normalize loaded civilizations with:

```ts
if (state.civilization && !Array.isArray(state.civilization.recentEventIds)) {
  state.civilization.recentEventIds = [];
}
```

- [ ] **Step 5: Replace engine selection and delay logic**

`selectEvent` filters through `eventEligible`, delegates weighting and selection, advances `rngState` exactly once, and records scheduled and weighted selections. `rollEventDelay` obtains `{min,max}` from `eventDelayWindow`, rolls with `SeededRng`, adds `eventDelayBonus`, and clamps the result to at least eight seconds.

- [ ] **Step 6: Run scheduler and existing engine tests**

Run: `./node_modules/.bin/tsc -p public/game/tsconfig.json && node --test public/game/tests/core.test.mjs`

Expected: all core tests pass, including deterministic selection, recent exclusion, cadence, and persistence.

### Task 3: Compute and expose exact decision feedback

**Files:**
- Create: `public/game/src/game/decision-feedback.ts`
- Modify: `public/game/src/game/types.ts`
- Modify: `public/game/src/game/engine.ts`
- Modify: `public/game/src/ui/view-model.ts`
- Test: `public/game/tests/core.test.mjs`
- Test: `public/game/tests/presentation.test.mjs`

- [ ] **Step 1: Add failing delta and view-model tests**

Force `routine_compliance_audit`, capture the chosen event, resolve choice zero, and assert that `engine.decisionFeedback` names the event and choice and includes at least one non-zero delta. Build the view model and assert `vm.feedback?.sequence === engine.decisionFeedback?.sequence`.

- [ ] **Step 2: Verify the tests fail on missing feedback state**

Run: `./node_modules/.bin/tsc -p public/game/tsconfig.json && node --test --test-name-pattern='decision feedback' public/game/tests/*.test.mjs`

Expected: TypeScript or assertion failure because feedback is not implemented.

- [ ] **Step 3: Add feedback types and pure snapshot/diff functions**

Define `DecisionMetricDelta`, `DecisionAddition`, and `DecisionFeedback` in `types.ts`. Implement `captureDecisionSnapshot(civ)` and `buildDecisionFeedback(sequence,event,choice,before,after)` in `decision-feedback.ts`. Metric deltas include Stability, Stability Max, Awareness, Sanity, Attention, and Development. Affinity deltas use path display names; additions contain new traits, institutions, and flags. Omit deltas whose absolute value is below `0.0001`.

- [ ] **Step 4: Integrate the feedback lifecycle**

Add public runtime state to `GameEngine`:

```ts
decisionFeedback: DecisionFeedback | null = null;
private feedbackSequence = 0;
```

Capture before `applyEffects`, build feedback after dominance/endgame resolution and clamping, and clear feedback when a new intervention is presented or a civilization ends.

- [ ] **Step 5: Project feedback through the view model and render key**

Expose a cloned feedback value as `feedback`. Include `feedback?.sequence ?? 0` in `civilizationRenderKey` so one structural DOM update occurs per resolved choice, while ordinary ticks remain live-only updates.

- [ ] **Step 6: Run focused and complete game tests**

Run: `./node_modules/.bin/tsc -p public/game/tsconfig.json && node --test public/game/tests/*.test.mjs`

Expected: all game tests pass.

### Task 4: Build state-reactive presentation values and cached renderer layers

**Files:**
- Create: `public/game/src/render/world-presentation.ts`
- Modify: `public/game/src/render/world-model.ts`
- Modify: `public/game/src/render/world.ts`
- Test: `public/game/tests/presentation.test.mjs`

- [ ] **Step 1: Add failing presentation-model tests**

Test that low Stability changes `danger`, low Sanity changes `sanity`, high Attention changes `attention`, high Awareness changes `awareness`, and a dominant path changes `accent`. Assert `structuralWorldKey` ignores a 0.1 Development tick within the same bucket but changes when era, stage, dominant path, or a state band changes.

- [ ] **Step 2: Run the focused test and verify missing exports fail**

Run: `./node_modules/.bin/tsc -p public/game/tsconfig.json && node --test --test-name-pattern='presentation palette|structural world key' public/game/tests/presentation.test.mjs`

Expected: compilation fails because `world-presentation.ts` does not exist.

- [ ] **Step 3: Implement pure semantic presentation helpers**

Export `worldPresentation(civ)`, `structuralWorldKey(civ,viewportWidth)`, and a readonly path-accent map. Quantize Stability, Sanity, Awareness, and Attention into four bands. Return numeric colors plus normalized intensities so Phaser and Canvas use the same meaning.

- [ ] **Step 4: Extend the deterministic snapshot**

Keep the existing counts and add deterministic haze, particle, fracture, beacon, and orbital-density values derived from state bands and development stage. Do not introduce random calls outside `hash01(seed)`-style deterministic generation.

- [ ] **Step 5: Split Phaser rendering into cached and dynamic layers**

Create separate Graphics objects for sky, terrain, settlement, atmosphere, and impulse. Cache the last structural key and snapshot. Redraw sky/terrain/settlement only when the key changes. Update atmosphere, traffic, window light, aircraft, satellites, and decision pulse no more often than every 33 milliseconds. Apply reduced-motion mode by freezing parallax and nonessential particles.

- [ ] **Step 6: Update Canvas fallback with the shared presentation model**

Reuse palette and intensity values, retain the DPR cap of 2, cache deterministic geometry, and animate only the lightest atmosphere/traffic pass.

- [ ] **Step 7: Build and run presentation tests**

Run: `./node_modules/.bin/tsc -p public/game/tsconfig.json && node --test public/game/tests/presentation.test.mjs`

Expected: all presentation tests pass.

### Task 5: Enlarge the world and add accessible feedback UI

**Files:**
- Modify: `public/game/src/ui/app.ts`
- Modify: `public/game/styles.css`
- Modify: `public/game/mobile.css`
- Modify: `public/game/tests/browser-shell.test.mjs`
- Modify: `tests/game-release.test.mjs`

- [ ] **Step 1: Add failing release-contract tests**

Assert CSS contains the new 760-pixel desktop ceiling, dynamic viewport sizing, `.decision-feedback`, `.decision-impact`, tone classes, and reduced-motion overrides. Assert `app.ts` exposes feedback deltas with `aria-live="polite"`.

- [ ] **Step 2: Verify the focused release tests fail**

Run: `node --test --test-name-pattern='larger state-reactive world|decision feedback UI' tests/game-release.test.mjs public/game/tests/browser-shell.test.mjs`

Expected: assertions fail on missing CSS and feedback markup.

- [ ] **Step 3: Render the compact feedback card**

Render the card above the monitoring panel. Show the choice label, every signed metric/affinity delta, additions, and `No measurable state change` when the delta list is empty. Use `aria-live="polite"` and never move focus after a choice.

- [ ] **Step 4: Trigger one short world impulse per feedback sequence**

Track the last rendered sequence, add the positive/negative/mixed tone class to `#world-shell`, and remove the animation class after 1.8 seconds. The feedback card remains until the next intervention.

- [ ] **Step 5: Enlarge and reflow the playfield**

Desktop `.world-shell` uses `height:clamp(520px,66vh,760px)`. Portrait mobile uses a bounded `62dvh`; landscape uses available dynamic height with a 360-pixel floor. Keep arrows, chips, and fullscreen control inside safe areas and ensure choice targets remain at least 44 pixels tall.

- [ ] **Step 6: Avoid unchanged DOM writes**

Introduce a small `replaceIfChanged(element,html)` helper for resource, meta, machine, and log regions. Continue using `refreshCivilizationLive` for meters and counters.

- [ ] **Step 7: Run UI and release tests**

Run: `./node_modules/.bin/tsc -p public/game/tsconfig.json && node --test tests/game-release.test.mjs public/game/tests/*.test.mjs`

Expected: all tests pass.

### Task 6: Finalize v1.2.0, verify, publish, and package

**Files:**
- Modify: `public/sw.js`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `public/game/package.json`
- Modify: `README.md`
- Modify: `public/game/README.md`
- Create: `Reality_Consumption_Engine_App_v1.2.0.zip`

- [ ] **Step 1: Update offline and release metadata**

Add the four new compiled modules to `APP_ASSETS`, change the service-worker cache to `rce-app-v1.2.0`, and update package/README version references to v1.2.0.

- [ ] **Step 2: Run fresh verification**

Run: `./node_modules/.bin/tsc -p public/game/tsconfig.json && node --test tests/game-release.test.mjs public/game/tests/*.test.mjs && npm run lint`

Expected: TypeScript succeeds, all tests pass, and lint exits 0.

- [ ] **Step 3: Run the agent browser playtest**

Verify boot, start, at least eight resolved interventions without direct repetition, exact feedback card contents, positive/negative/mixed pulse behavior, larger world panning, visible state colors, controlled harvest, reload persistence, desktop, 390×844 portrait, and 844×390 landscape. Capture and inspect representative machine, civilization, and feedback screenshots. Confirm no app-origin console errors.

- [ ] **Step 4: Create and verify the final Sites checkpoint**

Run the Sites checkpoint from `/workspace/sites/reality-consumption-engine`, monitor its immutable deployment to terminal status, and perform the required direct main-agent deployment-status verification.

- [ ] **Step 5: Create and validate the clean v1.2.0 ZIP**

Archive the committed checkout while excluding `node_modules`, `.git`, `.sites-runtime`, `.wrangler`, and logs. Run `unzip -t` and retain the verified archive size.

- [ ] **Step 6: Save the new ZIP and return both deliverables**

Create a new durable file named `Reality_Consumption_Engine_App_v1.2.0.zip`. Return the verified production URL and the downloadable archive link.
