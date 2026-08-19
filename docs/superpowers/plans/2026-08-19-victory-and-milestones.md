# Victory and Milestones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the game an explicit, playable win condition (the Great Convergence), a visible 28-entry milestone register, and a repeatable endgame.

**Architecture:** Two new pure modules under `public/game/src/game/` — `milestones.ts` (declarative catalog + evaluator) and `convergence.ts` (gate, terminal-run setup, victory evaluation, stacking bonus). The engine calls them only at the points where it already calls `Progression.record*`. The UI gains two machine-view cards, a terminal-run banner and a new `victory` phase.

**Tech Stack:** Framework-free TypeScript compiled by `tsc` (no bundler), plain ESM, Node's built-in test runner, Canvas 2D renderer, service-worker precache.

## Global Constraints

- Source of truth is `public/game/src/**`; the browser loads the **committed** `public/game/dist/**`. Run `tsc -p public/game/tsconfig.json` before claiming any game change works. `npm test` does this for you.
- Relative imports must carry the `.js` extension even from `.ts` files (`moduleResolution: Node16`, error `TS2835`).
- Game code is deliberately dense: multiple statements per line, minimal whitespace. Match the surrounding file; do not reformat it.
- Player-facing game copy is **English**. All interpolated values go through `esc()`.
- `data/content.generated.ts` is a frozen catalog. Do not hand-edit it.
- Per-frame work must stay cheap: ticking must not write `localStorage` and must not rebuild interactive controls.
- `civilizationRenderKey` (ui) and `structuralWorldKey` (render) must change only on meaningful state bands, never on continuously ticking numbers.
- Adding a module under `public/game/dist/` requires adding its path to `APP_ASSETS` in `public/sw.js`; `public/game/tests/presentation.test.mjs` asserts this for `dist/render/*`.
- Any release bumps `CACHE_NAME` in `public/sw.js` and the version in `package.json`, `public/game/package.json`, the footer of `public/game/index.html`, and both READMEs. `tests/game-release.test.mjs` asserts the two `package.json` versions match.
- Target version for this work: **1.6.0**. Target `SAVE_VERSION`: **4**.
- Spec: `docs/superpowers/specs/2026-08-19-victory-and-milestones-design.md`.

---

### Task 1: State shape and save version

Adds every new field the later tasks read, and bumps the save version so old saves are discarded on load (approved trade — no migration code).

**Files:**
- Modify: `public/game/src/game/types.ts`
- Modify: `public/game/src/game/rules.ts` (`SAVE_VERSION`, `createNewState`)
- Modify: `public/game/src/game/engine.ts` (`createCivilizationForTest`)
- Test: `public/game/tests/core.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `Phase` including `'victory'`; `Civilization.terminal: boolean`; `ProgressionState` fields `seenDominantPaths: string[]`, `bestDepth: number`, `bestGrade: HarvestGrade | ''`, `maxDevelopment: number`, `maxEra: number`, `objectivesCompleted: number`, `longestRunSeconds: number`, `maxEndgamesInRun: number`; `GameState.meta.convergences: number`, `GameState.meta.victories: VictoryRecord[]`; `SAVE_VERSION === 4`.

- [ ] **Step 1: Write the failing test**

Append to `public/game/tests/core.test.mjs`:

```js
test('new state carries convergence and milestone statistics fields', () => {
  const state = createNewState();
  assert.equal(state.saveVersion, 4);
  assert.equal(state.meta.convergences, 0);
  assert.deepEqual(state.meta.victories, []);
  const p = state.meta.progression;
  assert.deepEqual(p.seenDominantPaths, []);
  assert.equal(p.bestDepth, 0);
  assert.equal(p.bestGrade, '');
  assert.equal(p.maxDevelopment, 0);
  assert.equal(p.maxEra, 0);
  assert.equal(p.objectivesCompleted, 0);
  assert.equal(p.longestRunSeconds, 0);
  assert.equal(p.maxEndgamesInRun, 0);
  assert.equal(GameEngine.createCivilizationForTest(7).terminal, false);
});

test('a save written under the previous version is discarded', () => {
  let stored = JSON.stringify({ ...createNewState(), saveVersion: 3 });
  const engine = new GameEngine({
    autosave: false,
    storage: { getItem: () => stored, setItem: () => {}, removeItem: () => {} },
  });
  assert.equal(engine.state.meta.convergences, 0);
  assert.equal(engine.state.saveVersion, 4);
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Expected values to be strictly equal: 3 !== 4`.

- [ ] **Step 3: Extend the types**

In `public/game/src/game/types.ts`, change the `Phase` union and add the new fields:

```ts
export type Phase = 'machine' | 'civilization' | 'victory';
```

Add to `interface Civilization`, after `directiveObjective`:

```ts
  terminal: boolean;
```

Add to `interface ProgressionState`, after `chaoticHarvestsTotal`:

```ts
  seenDominantPaths: string[];
  bestDepth: number;
  bestGrade: HarvestGrade | '';
  maxDevelopment: number;
  maxEra: number;
  objectivesCompleted: number;
  longestRunSeconds: number;
  maxEndgamesInRun: number;
```

Add a new interface above `GameState`:

```ts
export interface VictoryRecord {
  convergence: number;
  seed: number;
  years: number;
  era: number;
  depth: number;
  development: number;
  dominantPath: string;
  endgameStates: string[];
}
```

Add to `GameState.meta`, after `multiversesConsumed`:

```ts
    convergences: number;
    victories: VictoryRecord[];
```

- [ ] **Step 4: Bump the save version and the initial state**

In `public/game/src/game/rules.ts`, change:

```ts
export const SAVE_VERSION = 4;
```

In the same file, inside `createNewState()`, change the `meta` literal so it reads:

```ts
    meta: {
      universalResidue: 0, universeUpgradeLevels: {}, universesTotal: 0, universesThisMultiverse: 0,
      axioms: 0, axiomLevels: {}, multiversesConsumed: 0, convergences: 0, victories: [],
      progression: {
        machineInsight: 0,
        unlockedSystems: ['machine_upgrades', 'civilization', 'controlled_harvest'],
        discoveredResources: ['causal_mass'],
        knownDirectives: [], knownBreedingMatrices: [], knownAxioms: [], milestones: {}, announcedUnlocks: [],
        controlledHarvestsTotal: 0, chaoticHarvestsTotal: 0,
        seenDominantPaths: [], bestDepth: 0, bestGrade: '', maxDevelopment: 0, maxEra: 0,
        objectivesCompleted: 0, longestRunSeconds: 0, maxEndgamesInRun: 0
      }
    },
```

- [ ] **Step 5: Add `terminal` to the civilization factory**

In `public/game/src/game/engine.ts`, in `createCivilizationForTest`, add `terminal:false,` immediately before `runInterventionUses:{}`:

```ts
directiveObjective:{id:'',completed:false},terminal:false,runInterventionUses:{}};}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS, 99 tests.

- [ ] **Step 7: Commit**

```bash
git add public/game/src/game/types.ts public/game/src/game/rules.ts public/game/src/game/engine.ts public/game/dist public/game/tests/core.test.mjs
git commit -m "feat(state): add convergence and milestone fields, bump save version to 4"
```

---

### Task 2: The milestone catalog

A pure, declarative catalog with a snapshot-based evaluator. No engine dependency, so the whole thing is testable as a function.

**Files:**
- Create: `public/game/src/game/milestones.ts`
- Modify: `public/game/src/game/harvest-quality.ts` (grade ordering helper)
- Test: `public/game/tests/core.test.mjs`

**Interfaces:**
- Consumes: `ProgressionState` and `GameState` from Task 1.
- Produces:
  - `HARVEST_GRADE_ORDER: readonly HarvestGrade[]` and `gradeIndex(grade: HarvestGrade | ''): number` from `harvest-quality.js`
  - `MILESTONE_CATALOG: readonly MilestoneDefinition[]` (28 entries)
  - `milestoneSnapshot(state: GameState, convergenceUnlocked: boolean): MilestoneSnapshot`
  - `evaluateMilestones(state: GameState, convergenceUnlocked: boolean): { newlyCompleted: MilestoneDefinition[]; insightAwarded: number }`
  - `milestoneProgress(state: GameState, convergenceUnlocked: boolean): MilestoneView[]` where `MilestoneView = { id, title, description, group, insight, current, target, completed }`
  - `completedMilestoneCount(state: GameState): number`

- [ ] **Step 1: Write the failing test**

Add these imports at the top of `public/game/tests/core.test.mjs`:

```js
import { MILESTONE_CATALOG, completedMilestoneCount, evaluateMilestones, milestoneProgress, milestoneSnapshot } from '../dist/game/milestones.js';
import { gradeIndex, HARVEST_GRADE_ORDER } from '../dist/game/harvest-quality.js';
```

Append these tests:

```js
const MIGRATED_MILESTONE_AWARDS = {
  development_70: 1, development_180: 1, development_340: 2,
  era_expansion: 1, era_transcendence: 2, era_apotheosis: 2, awareness_50: 1,
  controlled_harvest_1: 2, controlled_harvest_2: 2,
  first_universe: 4, first_multiverse: 6,
};

// Awards above 1 must sit behind Apotheosis, a deep harvest or the prestige layers, or the
// existing unlock thresholds (directives at 3, axioms at 18-23) would move forward.
const ALLOWED_LARGE_AWARDS = new Set([
  ...Object.keys(MIGRATED_MILESTONE_AWARDS),
  'development_600', 'development_1000', 'endurance_900',
  'harvest_ascendant', 'harvest_singular',
  'paths_seen_10', 'endgames_in_run_4',
  'second_multiverse', 'axioms_all_level_1',
  'convergence_gate', 'first_convergence',
]);

test('the milestone catalog has 28 entries with unique ids', () => {
  assert.equal(MILESTONE_CATALOG.length, 28);
  assert.equal(new Set(MILESTONE_CATALOG.map(m => m.id)).size, 28);
  for (const milestone of MILESTONE_CATALOG) {
    assert.ok(milestone.target > 0, `${milestone.id} needs a positive target`);
    assert.ok(milestone.title.length > 0 && milestone.description.length > 0);
  }
});

test('migrated milestones keep their identifiers and award amounts', () => {
  for (const [id, insight] of Object.entries(MIGRATED_MILESTONE_AWARDS)) {
    const milestone = MILESTONE_CATALOG.find(m => m.id === id);
    assert.ok(milestone, `${id} is missing from the catalog`);
    assert.equal(milestone.insight, insight, `${id} award changed`);
  }
});

test('only late milestones award more than one Machine Insight', () => {
  for (const milestone of MILESTONE_CATALOG) {
    if (milestone.insight <= 1) continue;
    assert.ok(ALLOWED_LARGE_AWARDS.has(milestone.id), `${milestone.id} awards ${milestone.insight} too early`);
  }
});

test('harvest grades have a total order', () => {
  assert.deepEqual([...HARVEST_GRADE_ORDER], ['premature', 'established', 'transcendent', 'ascendant', 'singular']);
  assert.equal(gradeIndex(''), -1);
  assert.equal(gradeIndex('ascendant'), 3);
  assert.ok(gradeIndex('singular') > gradeIndex('ascendant'));
});

test('each milestone completes exactly once and pays its award once', () => {
  const state = createNewState();
  state.meta.progression.maxDevelopment = 2000;
  state.meta.progression.maxEra = 3;
  state.meta.progression.longestRunSeconds = 1200;
  state.meta.progression.maxEndgamesInRun = 4;
  state.meta.progression.controlledHarvestsTotal = 30;
  state.meta.progression.bestGrade = 'singular';
  state.meta.progression.objectivesCompleted = 9;
  state.meta.progression.seenDominantPaths = [
    'machine_faith', 'collective_mind', 'temporal_dominion', 'reality_engineering', 'biological_transcendence',
    'cosmic_resistance', 'bureaucratic_singularity', 'post_mortal_civilization', 'void_communion', 'recursive_simulation',
  ];
  state.meta.progression.discoveredResources = ['causal_mass', 'cognition', 'paradox', 'existence'];
  state.meta.universesTotal = 3;
  state.meta.multiversesConsumed = 2;
  state.meta.axiomLevels = {
    axiom_stability: 1, axiom_recursive_memory: 1, axiom_paradox_food: 1,
    axiom_compassionate_accounting: 1, axiom_impossible_birth: 1, axiom_multiple_choice: 1,
  };
  state.meta.convergences = 1;
  state.civilization = { ...GameEngine.createCivilizationForTest(3), development: 2000, era: 3, elapsedSeconds: 1200 };
  state.civilization.stats.awareness = 90;

  const first = evaluateMilestones(state, true);
  assert.equal(first.newlyCompleted.length, 28);
  const total = MILESTONE_CATALOG.reduce((sum, m) => sum + m.insight, 0);
  assert.equal(first.insightAwarded, total);
  assert.equal(completedMilestoneCount(state), 28);

  const second = evaluateMilestones(state, true);
  assert.equal(second.newlyCompleted.length, 0);
  assert.equal(second.insightAwarded, 0);
});

test('milestone progress reports current and target for open entries', () => {
  const state = createNewState();
  state.meta.progression.controlledHarvestsTotal = 4;
  const view = milestoneProgress(state, false).find(m => m.id === 'controlled_harvest_10');
  assert.equal(view.current, 4);
  assert.equal(view.target, 10);
  assert.equal(view.completed, false);
  assert.equal(view.group, 'HARVEST');
});

test('the snapshot takes the better of live and recorded values', () => {
  const state = createNewState();
  state.meta.progression.maxDevelopment = 500;
  state.civilization = { ...GameEngine.createCivilizationForTest(5), development: 120 };
  assert.equal(milestoneSnapshot(state, false).development, 500);
  state.civilization.development = 900;
  assert.equal(milestoneSnapshot(state, false).development, 900);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '.../dist/game/milestones.js'`.

- [ ] **Step 3: Add the grade ordering to `harvest-quality.ts`**

Append to `public/game/src/game/harvest-quality.ts`:

```ts
export const HARVEST_GRADE_ORDER: ReadonlyArray<HarvestGrade> = DEPTH_BANDS.map(band => band.grade);

export function gradeIndex(grade: HarvestGrade | ''): number {
  return grade ? HARVEST_GRADE_ORDER.indexOf(grade) : -1;
}
```

- [ ] **Step 4: Write the catalog module**

Create `public/game/src/game/milestones.ts`:

```ts
import { gradeIndex } from './harvest-quality.js';
import type { GameState } from './types.js';

export type MilestoneGroup = 'CULTIVATION' | 'HARVEST' | 'PATHS' | 'PRESTIGE' | 'CONVERGENCE';

export interface MilestoneSnapshot {
  development:number; era:number; awareness:number; runSeconds:number; endgamesInRun:number;
  controlledHarvests:number; bestGradeIndex:number; objectivesCompleted:number;
  seenPaths:number; universes:number; multiverses:number; resources:number; axiomsAtLevelOne:number;
  convergenceUnlocked:number; convergences:number;
}

export interface MilestoneDefinition {
  id:string; title:string; description:string; group:MilestoneGroup; insight:number; target:number;
  current(snapshot:MilestoneSnapshot):number;
}

export interface MilestoneView {
  id:string; title:string; description:string; group:MilestoneGroup; insight:number;
  current:number; target:number; completed:boolean;
}

const RESOURCE_IDS=['causal_mass','cognition','paradox','existence'];

export const MILESTONE_CATALOG:ReadonlyArray<MilestoneDefinition>=[
  {id:'development_70',title:'First Complexity',description:'Bring a civilization to Development 70.',group:'CULTIVATION',insight:1,target:70,current:s=>s.development},
  {id:'development_180',title:'Industrial Depth',description:'Bring a civilization to Development 180.',group:'CULTIVATION',insight:1,target:180,current:s=>s.development},
  {id:'development_340',title:'Post-Scarcity Yield',description:'Bring a civilization to Development 340.',group:'CULTIVATION',insight:2,target:340,current:s=>s.development},
  {id:'development_600',title:'Runaway Cultivation',description:'Bring a civilization to Development 600.',group:'CULTIVATION',insight:2,target:600,current:s=>s.development},
  {id:'development_1000',title:'Terminal Complexity',description:'Bring a civilization to Development 1000.',group:'CULTIVATION',insight:3,target:1000,current:s=>s.development},
  {id:'era_expansion',title:'Expansion Reached',description:'Carry a civilization into the Expansion era.',group:'CULTIVATION',insight:1,target:1,current:s=>s.era},
  {id:'era_transcendence',title:'Transcendence Reached',description:'Carry a civilization into the Transcendence era.',group:'CULTIVATION',insight:2,target:2,current:s=>s.era},
  {id:'era_apotheosis',title:'Apotheosis Reached',description:'Carry a civilization into the Apotheosis era.',group:'CULTIVATION',insight:2,target:3,current:s=>s.era},
  {id:'awareness_50',title:'The Crop Looks Up',description:'Let Machine Awareness reach 50 in a single run.',group:'CULTIVATION',insight:1,target:50,current:s=>s.awareness},
  {id:'endurance_900',title:'Held Together',description:'Keep one civilization alive for 900 seconds.',group:'CULTIVATION',insight:2,target:900,current:s=>s.runSeconds},
  {id:'controlled_harvest_1',title:'First Controlled Harvest',description:'Complete one controlled harvest.',group:'HARVEST',insight:2,target:1,current:s=>s.controlledHarvests},
  {id:'controlled_harvest_2',title:'Repeatable Yield',description:'Complete two controlled harvests.',group:'HARVEST',insight:2,target:2,current:s=>s.controlledHarvests},
  {id:'controlled_harvest_10',title:'Standing Practice',description:'Complete ten controlled harvests.',group:'HARVEST',insight:1,target:10,current:s=>s.controlledHarvests},
  {id:'harvest_transcendent',title:'Transcendent Harvest',description:'Record a Transcendent harvest grade.',group:'HARVEST',insight:1,target:2,current:s=>s.bestGradeIndex},
  {id:'harvest_ascendant',title:'Ascendant Harvest',description:'Record an Ascendant harvest grade.',group:'HARVEST',insight:2,target:3,current:s=>s.bestGradeIndex},
  {id:'harvest_singular',title:'Singular Harvest',description:'Record a Singular harvest grade.',group:'HARVEST',insight:4,target:4,current:s=>s.bestGradeIndex},
  {id:'directive_objectives_5',title:'Compliant Cultivator',description:'Complete five Directive objectives.',group:'HARVEST',insight:1,target:5,current:s=>s.objectivesCompleted},
  {id:'paths_seen_3',title:'Three Doctrines',description:'See three different civilization paths become dominant.',group:'PATHS',insight:1,target:3,current:s=>s.seenPaths},
  {id:'paths_seen_6',title:'Six Doctrines',description:'See six different civilization paths become dominant.',group:'PATHS',insight:1,target:6,current:s=>s.seenPaths},
  {id:'paths_seen_10',title:'Every Doctrine',description:'See all ten civilization paths become dominant.',group:'PATHS',insight:4,target:10,current:s=>s.seenPaths},
  {id:'endgames_in_run_4',title:'Fourfold End-State',description:'Reach four path end-states inside one run.',group:'PATHS',insight:3,target:4,current:s=>s.endgamesInRun},
  {id:'first_universe',title:'First Universe Consumed',description:'Consume a Universe.',group:'PRESTIGE',insight:4,target:1,current:s=>s.universes},
  {id:'first_multiverse',title:'First Multiverse Collapsed',description:'Collapse a Multiverse.',group:'PRESTIGE',insight:6,target:1,current:s=>s.multiverses},
  {id:'second_multiverse',title:'Second Multiverse Collapsed',description:'Collapse a second Multiverse.',group:'PRESTIGE',insight:3,target:2,current:s=>s.multiverses},
  {id:'all_resources',title:'Full Spectrum',description:'Identify all four harvest resources.',group:'PRESTIGE',insight:1,target:4,current:s=>s.resources},
  {id:'axioms_all_level_1',title:'Axiomatic Command',description:'Install every Axiom upgrade at least once.',group:'PRESTIGE',insight:3,target:6,current:s=>s.axiomsAtLevelOne},
  {id:'convergence_gate',title:'Convergence Authorized',description:'Meet every requirement of the Great Convergence.',group:'CONVERGENCE',insight:3,target:1,current:s=>s.convergenceUnlocked},
  {id:'first_convergence',title:'The Great Convergence',description:'Win the Great Convergence.',group:'CONVERGENCE',insight:5,target:1,current:s=>s.convergences},
];

export function milestoneSnapshot(state:GameState,convergenceUnlocked:boolean):MilestoneSnapshot{
  const p=state.meta.progression; const civ=state.civilization;
  const endgames=civ?.pathState?.endgameStates?.length??0;
  return {
    development:Math.max(p.maxDevelopment,civ?.development??0),
    era:Math.max(p.maxEra,civ?.era??0),
    awareness:civ?.stats.awareness??0,
    runSeconds:Math.max(p.longestRunSeconds,civ?.elapsedSeconds??0),
    endgamesInRun:Math.max(p.maxEndgamesInRun,endgames),
    controlledHarvests:p.controlledHarvestsTotal,
    bestGradeIndex:gradeIndex(p.bestGrade),
    objectivesCompleted:p.objectivesCompleted,
    seenPaths:p.seenDominantPaths.length,
    universes:state.meta.universesTotal,
    multiverses:state.meta.multiversesConsumed,
    resources:RESOURCE_IDS.filter(id=>p.discoveredResources.includes(id)).length,
    axiomsAtLevelOne:Object.values(state.meta.axiomLevels).filter(level=>Number(level)>=1).length,
    convergenceUnlocked:convergenceUnlocked?1:0,
    convergences:state.meta.convergences,
  };
}

// Called from the tick path, so it walks only the open milestones and allocates nothing until
// something actually completes.
export function evaluateMilestones(state:GameState,convergenceUnlocked:boolean):{newlyCompleted:MilestoneDefinition[];insightAwarded:number}{
  const done=state.meta.progression.milestones;
  let snapshot:MilestoneSnapshot|null=null;
  const newlyCompleted:MilestoneDefinition[]=[]; let insightAwarded=0;
  for(const milestone of MILESTONE_CATALOG){
    if(done[milestone.id])continue;
    if(!snapshot)snapshot=milestoneSnapshot(state,convergenceUnlocked);
    if(milestone.current(snapshot)<milestone.target)continue;
    done[milestone.id]=true; state.meta.progression.machineInsight+=milestone.insight;
    insightAwarded+=milestone.insight; newlyCompleted.push(milestone);
  }
  return {newlyCompleted,insightAwarded};
}

export function milestoneProgress(state:GameState,convergenceUnlocked:boolean):MilestoneView[]{
  const snapshot=milestoneSnapshot(state,convergenceUnlocked); const done=state.meta.progression.milestones;
  return MILESTONE_CATALOG.map(milestone=>{
    const completed=Boolean(done[milestone.id]);
    const current=Math.max(0,Math.min(milestone.target,Math.floor(completed?milestone.target:milestone.current(snapshot))));
    return {id:milestone.id,title:milestone.title,description:milestone.description,group:milestone.group,insight:milestone.insight,current,target:milestone.target,completed};
  });
}

export function completedMilestoneCount(state:GameState):number{
  const done=state.meta.progression.milestones;
  return MILESTONE_CATALOG.reduce((count,milestone)=>count+(done[milestone.id]?1:0),0);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS. If `each milestone completes exactly once` fails on a count, print `first.newlyCompleted.map(m => m.id)` and compare against the catalog to find the entry whose snapshot field is not satisfied by the fixture.

- [ ] **Step 6: Commit**

```bash
git add public/game/src/game/milestones.ts public/game/src/game/harvest-quality.ts public/game/dist public/game/tests/core.test.mjs
git commit -m "feat(milestones): add the 28-entry milestone catalog and evaluator"
```

---

### Task 3: Wire milestones into progression and the engine

Replaces the eleven hard-coded milestone checks with the catalog and starts recording the statistics the catalog reads.

**Files:**
- Modify: `public/game/src/game/progression.ts` (`recordCivilizationProgress`, `recordHarvest`, `recordUniverse`, `recordMultiverse`)
- Modify: `public/game/src/game/engine.ts` (`chooseEvent`, `harvest`)
- Test: `public/game/tests/core.test.mjs`

**Interfaces:**
- Consumes: `evaluateMilestones`, `completedMilestoneCount` from Task 2.
- Produces: `Progression.recordMilestones(state, convergenceUnlocked, out)` returning `string[]`; engine private `recordRunStatistics(civ, details)`; `engine.seenDominantPaths` growth on dominance changes.

- [ ] **Step 1: Write the failing test**

Append to `public/game/tests/core.test.mjs`:

```js
test('a controlled harvest records the statistics milestones read', () => {
  const engine = freshEngine();
  const civ = GameEngine.createCivilizationForTest(21);
  civ.development = 420; civ.era = 2; civ.eventChoices = 6; civ.elapsedSeconds = 310;
  civ.pathState.endgameStates = ['endgame_a', 'endgame_b'];
  engine.state.civilization = civ;
  engine.state.phase = 'civilization';
  engine.harvest(false);
  const p = engine.state.meta.progression;
  assert.equal(p.maxDevelopment >= 420, true);
  assert.equal(p.maxEra, 2);
  assert.equal(p.longestRunSeconds, 310);
  assert.equal(p.maxEndgamesInRun, 2);
  assert.equal(p.bestGrade, 'transcendent');
  assert.ok(p.bestDepth > 5);
  assert.equal(p.milestones.development_340, true);
  assert.equal(p.milestones.harvest_transcendent, true);
});

test('dominant paths are recorded once each across runs', () => {
  const engine = freshEngine();
  engine.recordDominantPath('machine_faith');
  engine.recordDominantPath('machine_faith');
  engine.recordDominantPath('void_communion');
  engine.recordDominantPath('');
  assert.deepEqual(engine.state.meta.progression.seenDominantPaths, ['machine_faith', 'void_communion']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `engine.recordDominantPath is not a function`.

- [ ] **Step 3: Delegate milestone evaluation in `progression.ts`**

Add the import at the top of `public/game/src/game/progression.ts`:

```ts
import { evaluateMilestones } from './milestones.js';
```

Replace the four `record*` methods and delete the now-unused private `milestone` helper. The four bodies become:

```ts
  static recordMilestones(state:GameState,convergenceUnlocked:boolean,out:string[]=[]){ const result=evaluateMilestones(state,convergenceUnlocked); for(const milestone of result.newlyCompleted) if(milestone.insight) out.push(`MACHINE INSIGHT +${milestone.insight}: ${milestone.title}`); return this.refresh(state,out); }
  static recordCivilizationProgress(state:GameState,civ:{development:number;era:number;stats:{awareness:number}}){ const out:string[]=[]; if(civ.development>=70)this.discover(state,'cognition','Cognition',out); return this.recordMilestones(state,false,out); }
  static recordHarvest(state:GameState,record:any){ const out:string[]=[]; if(record.chaotic) state.meta.progression.chaoticHarvestsTotal++; else {state.meta.progression.controlledHarvestsTotal++; if(state.meta.progression.controlledHarvestsTotal>=1)this.discover(state,'paradox','Paradox',out);} if(Number(record.development??0)>=180)this.discover(state,'paradox','Paradox',out); return this.recordMilestones(state,false,out); }
  static recordUniverse(state:GameState){const out:string[]=[];if(state.meta.universesTotal>1){state.meta.progression.machineInsight++;out.push('MACHINE INSIGHT +1: Repeated universe consumption');}this.discover(state,'existence','Existence',out);this.discover(state,'universal_residue','Universal Residue',out);return this.recordMilestones(state,false,out);}
  static recordMultiverse(state:GameState){const out:string[]=[];this.discover(state,'axioms','Axioms',out);return this.recordMilestones(state,false,out);}
```

The `+1 per repeated universe` rule and the resource discoveries stay here; only the eleven milestone awards move into the catalog. `recordMilestones` is called with `convergenceUnlocked=false` from these paths — the engine calls it separately with the real value once `convergence.ts` exists (Task 5).

- [ ] **Step 4: Record the statistics in the engine**

In `public/game/src/game/engine.ts`, add a public method next to `currentCivilization()`:

```ts
  recordDominantPath(pathId:string){const seen=this.state.meta.progression.seenDominantPaths;if(pathId&&!seen.includes(pathId))seen.push(pathId);}
```

In `chooseEvent`, inside the `if(pr.newDominantPath){` block, add as its first statement:

```ts
      this.recordDominantPath(pr.newDominantPath);
```

Add a private method directly above `harvest(`:

```ts
  private recordRunStatistics(civ:Civilization,details:{depth:number;grade:string;objectiveCompleted:boolean}){const p=this.state.meta.progression;p.maxDevelopment=Math.max(p.maxDevelopment,civ.development);p.maxEra=Math.max(p.maxEra,civ.era);p.longestRunSeconds=Math.max(p.longestRunSeconds,civ.elapsedSeconds);p.maxEndgamesInRun=Math.max(p.maxEndgamesInRun,civ.pathState.endgameStates.length);p.bestDepth=Math.max(p.bestDepth,details.depth);if(gradeIndex(details.grade as any)>gradeIndex(p.bestGrade))p.bestGrade=details.grade as any;if(details.objectiveCompleted)p.objectivesCompleted++;}
```

Add `gradeIndex` to the existing `harvest-quality.js` import at the top of `engine.ts`:

```ts
import { applyHarvestQuality, calculateCultivationCredits, cultivationDepth, evaluateHarvestQuality, gradeIndex } from './harvest-quality.js';
```

In `harvest(chaotic=false)`, immediately after `civ.directiveObjective.completed=details.objectiveCompleted;`, insert:

```ts
this.recordRunStatistics(civ,details);
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS. Two pre-existing tests are the real gate here and must stay green without modification: the progression tests that assert the migrated award amounts through `Progression`, and `simulation ticks do not write localStorage every animation frame` in `core.test.mjs`, which now also covers the milestone evaluator running inside `tick`.

- [ ] **Step 6: Commit**

```bash
git add public/game/src/game/progression.ts public/game/src/game/engine.ts public/game/dist public/game/tests/core.test.mjs
git commit -m "feat(progression): drive milestones from the catalog and record run statistics"
```

---

### Task 4: The convergence rules module

Pure gate, target and bonus arithmetic. No engine or catalog import, so there is no cycle with `milestones.ts`.

**Files:**
- Create: `public/game/src/game/convergence.ts`
- Modify: `public/game/src/game/pressure.ts` (terminal entropy multiplier)
- Test: `public/game/tests/core.test.mjs`

**Interfaces:**
- Consumes: `ERA_YEAR_THRESHOLDS` from `rules.js`.
- Produces:
  - `TERMINAL_ENTROPY_MULTIPLIER = 1.6` exported from `pressure.js`; `entropyRate(years, containment, terminal?)` and `secondsToCascade(years, entropy, containment, terminal?)` gain a trailing optional `terminal` flag
  - `convergenceTargets(convergences: number): { milestones: number; multiverses: number; axiomLevel: number; depth: number }`
  - `convergenceRequirements(input: ConvergenceInput): ConvergenceRequirement[]`
  - `convergenceUnlocked(input: ConvergenceInput): boolean`
  - `terminalCivilizationSetup(): { era: number; years: number; development: number }`
  - `evaluateConvergence(depth: number, chaotic: boolean, convergences: number): 'won' | 'failed'`
  - `convergenceBonuses(convergences: number): { allHarvestMult: number; containment: number }`

- [ ] **Step 1: Write the failing test**

Add the import to `public/game/tests/core.test.mjs`:

```js
import { convergenceBonuses, convergenceRequirements, convergenceTargets, convergenceUnlocked, evaluateConvergence, terminalCivilizationSetup, CONVERGENCE_ASCENDANT_INDEX } from '../dist/game/convergence.js';
import { TERMINAL_ENTROPY_MULTIPLIER } from '../dist/game/pressure.js';
```

Append:

```js
function convergenceInput(overrides = {}) {
  return {
    milestonesCompleted: 21,
    milestonesTotal: 28,
    multiverses: 2,
    axioms: [
      { id: 'axiom_stability', level: 1, maxLevel: 5 },
      { id: 'axiom_paradox_food', level: 1, maxLevel: 4 },
      { id: 'axiom_recursive_memory', level: 1, maxLevel: 5 },
      { id: 'axiom_impossible_birth', level: 1, maxLevel: 1 },
      { id: 'axiom_compassionate_accounting', level: 1, maxLevel: 4 },
      { id: 'axiom_multiple_choice', level: 1, maxLevel: 3 },
    ],
    bestGradeIndex: CONVERGENCE_ASCENDANT_INDEX,
    convergences: 0,
    ...overrides,
  };
}

test('the convergence gate opens only when all four requirements are met', () => {
  assert.equal(convergenceUnlocked(convergenceInput()), true);
  assert.equal(convergenceUnlocked(convergenceInput({ milestonesCompleted: 20 })), false);
  assert.equal(convergenceUnlocked(convergenceInput({ multiverses: 1 })), false);
  assert.equal(convergenceUnlocked(convergenceInput({ bestGradeIndex: 2 })), false);
  const shallowAxioms = convergenceInput().axioms.map((a, index) => (index === 0 ? { ...a, level: 0 } : a));
  assert.equal(convergenceUnlocked(convergenceInput({ axioms: shallowAxioms })), false);
});

test('requirements expose current and target for the UI', () => {
  const requirements = convergenceRequirements(convergenceInput({ milestonesCompleted: 19 }));
  assert.equal(requirements.length, 4);
  const milestones = requirements.find(r => r.id === 'milestones');
  assert.equal(milestones.current, 19);
  assert.equal(milestones.target, 21);
  assert.equal(milestones.met, false);
  assert.ok(milestones.label.length > 0);
});

test('convergence targets scale with each victory and clamp to the catalog', () => {
  assert.deepEqual(convergenceTargets(0), { milestones: 21, multiverses: 2, axiomLevel: 1, depth: 14 });
  assert.deepEqual(convergenceTargets(1), { milestones: 24, multiverses: 4, axiomLevel: 2, depth: 18 });
  assert.deepEqual(convergenceTargets(3), { milestones: 30, multiverses: 8, axiomLevel: 4, depth: 26 });
  const clamped = convergenceRequirements(convergenceInput({ convergences: 3, milestonesCompleted: 28 }));
  assert.equal(clamped.find(r => r.id === 'milestones').target, 28);
});

test('the axiom requirement clamps per upgrade at its own maximum level', () => {
  const axioms = convergenceInput().axioms.map(a => ({ ...a, level: 2 }));
  const requirements = convergenceRequirements(convergenceInput({ convergences: 1, axioms, multiverses: 4, milestonesCompleted: 24 }));
  assert.equal(requirements.find(r => r.id === 'axioms').met, true);
});

test('only a controlled harvest at target depth wins', () => {
  assert.equal(evaluateConvergence(14, false, 0), 'won');
  assert.equal(evaluateConvergence(13.9, false, 0), 'failed');
  assert.equal(evaluateConvergence(40, true, 0), 'failed');
  assert.equal(evaluateConvergence(14, false, 1), 'failed');
  assert.equal(evaluateConvergence(18, false, 1), 'won');
});

test('the terminal run starts in Apotheosis and convergence bonuses stack', () => {
  const setup = terminalCivilizationSetup();
  assert.equal(setup.era, 3);
  assert.equal(setup.years, ERA_YEAR_THRESHOLDS[3]);
  assert.equal(setup.development, 340);
  assert.equal(TERMINAL_ENTROPY_MULTIPLIER, 1.6);
  assert.deepEqual(convergenceBonuses(0), { allHarvestMult: 1, containment: 0 });
  assert.deepEqual(convergenceBonuses(2), { allHarvestMult: 1.5, containment: 4 });
});

test('the terminal entropy multiplier feeds the displayed rate', () => {
  const plain = entropyRate(14000, 0, false);
  assert.ok(Math.abs(entropyRate(14000, 0, true) - plain * 1.6) < 1e-9);
  assert.ok(secondsToCascade(14000, 0, 0, true) < secondsToCascade(14000, 0, 0, false));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '.../dist/game/convergence.js'`.

- [ ] **Step 3: Add the terminal multiplier to `pressure.ts`**

In `public/game/src/game/pressure.ts`, add the constant next to `CASCADE_DECAY_FRACTION`:

```ts
export const TERMINAL_ENTROPY_MULTIPLIER = 1.6;
```

Replace `entropyRate` and `secondsToCascade`:

```ts
export function entropyRate(years: number, containment: number, terminal = false): number {
  return PRESSURE_BASE * pressureMultiplier(years) / relief(containment) * (terminal ? TERMINAL_ENTROPY_MULTIPLIER : 1);
}

export function secondsToCascade(years: number, entropy: number, containment: number, terminal = false): number {
  const remaining = Math.max(0, 100 - (Number(entropy) || 0));
  if (remaining <= 0) return 0;
  const scale = terminal ? TERMINAL_ENTROPY_MULTIPLIER : 1;
  const b = pressureMultiplier(years);
  const c = relief(containment) * remaining / (PRESSURE_BASE * scale);
  const k = YEARS_PER_SECOND / (2 * PRESSURE_YEAR_SCALE);
  return (-b + Math.sqrt(b * b + 4 * k * c)) / (2 * k);
}
```

In `advancePressure`, replace the rate line:

```ts
  const rate = entropyRate(civ.years, bonuses.containmentRating, Boolean(civ.terminal));
```

- [ ] **Step 4: Write the convergence module**

Create `public/game/src/game/convergence.ts`:

```ts
import { ERA_YEAR_THRESHOLDS } from './rules.js';

export const CONVERGENCE_BASE_MILESTONES=21;
export const CONVERGENCE_MILESTONE_STEP=3;
export const CONVERGENCE_BASE_MULTIVERSES=2;
export const CONVERGENCE_MULTIVERSE_STEP=2;
export const CONVERGENCE_BASE_DEPTH=14;
export const CONVERGENCE_DEPTH_STEP=4;
export const CONVERGENCE_HARVEST_BONUS=.25;
export const CONVERGENCE_CONTAINMENT_BONUS=2;
export const TERMINAL_ERA=3;
export const TERMINAL_DEVELOPMENT=340;
// Index of 'ascendant' in HARVEST_GRADE_ORDER. Duplicated as a constant rather than imported so
// this module stays free of the harvest catalog and can be reasoned about on its own.
export const CONVERGENCE_ASCENDANT_INDEX=3;

export interface AxiomLevelInput { id:string; level:number; maxLevel:number; }
export interface ConvergenceInput {
  milestonesCompleted:number; milestonesTotal:number; multiverses:number;
  axioms:ReadonlyArray<AxiomLevelInput>; bestGradeIndex:number; convergences:number;
}
export interface ConvergenceRequirement { id:string; label:string; current:number; target:number; met:boolean; }

const count=(value:number)=>Math.max(0,Math.trunc(Number(value)||0));

export function convergenceTargets(convergences:number){
  const n=count(convergences);
  return {
    milestones:CONVERGENCE_BASE_MILESTONES+CONVERGENCE_MILESTONE_STEP*n,
    multiverses:CONVERGENCE_BASE_MULTIVERSES+CONVERGENCE_MULTIVERSE_STEP*n,
    axiomLevel:1+n,
    depth:CONVERGENCE_BASE_DEPTH+CONVERGENCE_DEPTH_STEP*n,
  };
}

export function convergenceRequirements(input:ConvergenceInput):ConvergenceRequirement[]{
  const targets=convergenceTargets(input.convergences);
  const milestoneTarget=Math.min(input.milestonesTotal,targets.milestones);
  const axiomsMet=input.axioms.filter(a=>a.level>=Math.min(a.maxLevel,targets.axiomLevel)).length;
  const entries:ConvergenceRequirement[]=[
    {id:'milestones',label:`Milestones completed`,current:count(input.milestonesCompleted),target:milestoneTarget,met:false},
    {id:'multiverses',label:'Multiverses collapsed',current:count(input.multiverses),target:targets.multiverses,met:false},
    {id:'axioms',label:`Axiom upgrades at level ${targets.axiomLevel}`,current:axiomsMet,target:input.axioms.length,met:false},
    {id:'grade',label:'Ascendant harvest recorded',current:Math.max(0,input.bestGradeIndex+1),target:CONVERGENCE_ASCENDANT_INDEX+1,met:false},
  ];
  for(const entry of entries)entry.met=entry.current>=entry.target;
  return entries;
}

export function convergenceUnlocked(input:ConvergenceInput):boolean{
  return convergenceRequirements(input).every(entry=>entry.met);
}

export function terminalCivilizationSetup(){
  return {era:TERMINAL_ERA,years:ERA_YEAR_THRESHOLDS[TERMINAL_ERA],development:TERMINAL_DEVELOPMENT};
}

export function evaluateConvergence(depth:number,chaotic:boolean,convergences:number):'won'|'failed'{
  if(chaotic)return 'failed';
  return (Number(depth)||0)>=convergenceTargets(convergences).depth?'won':'failed';
}

export function convergenceBonuses(convergences:number){
  const n=count(convergences);
  return {allHarvestMult:1+CONVERGENCE_HARVEST_BONUS*n,containment:CONVERGENCE_CONTAINMENT_BONUS*n};
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS. The existing pressure tests still pass because both new parameters default to `false`.

- [ ] **Step 6: Commit**

```bash
git add public/game/src/game/convergence.ts public/game/src/game/pressure.ts public/game/dist public/game/tests/core.test.mjs
git commit -m "feat(convergence): add the victory gate, terminal setup and stacking bonus"
```

---

### Task 5: Engine integration of the Great Convergence

Starts the terminal run, suppresses its payout, resolves victory or failure, applies the stacking bonus, and feeds the real unlock flag into milestone evaluation.

**Files:**
- Modify: `public/game/src/game/engine.ts`
- Test: `public/game/tests/core.test.mjs`

**Interfaces:**
- Consumes: everything from Tasks 2–4.
- Produces on `GameEngine`: `convergenceInput()`, `convergenceRequirements()`, `convergenceUnlocked()`, `convergenceTargetDepth()`, `startConvergenceRun(requestedSeed?)`, `acknowledgeVictory()`, `lastVictory()`.

- [ ] **Step 1: Write the failing test**

Append to `public/game/tests/core.test.mjs`:

```js
function unlockedConvergenceEngine() {
  const engine = freshEngine();
  const p = engine.state.meta.progression;
  for (const milestone of MILESTONE_CATALOG.slice(0, 21)) p.milestones[milestone.id] = true;
  p.bestGrade = 'ascendant';
  p.unlockedSystems.push('universe_prestige', 'universe_upgrades', 'multiverse_prestige', 'axioms');
  engine.state.meta.multiversesConsumed = 2;
  engine.state.meta.axiomLevels = {
    axiom_stability: 1, axiom_paradox_food: 1, axiom_recursive_memory: 1,
    axiom_impossible_birth: 1, axiom_compassionate_accounting: 1, axiom_multiple_choice: 1,
  };
  return engine;
}

test('the convergence run can only start once the gate is open', () => {
  const blocked = freshEngine();
  assert.equal(blocked.convergenceUnlocked(), false);
  assert.equal(blocked.startConvergenceRun(4), false);
  assert.equal(blocked.state.phase, 'machine');

  const engine = unlockedConvergenceEngine();
  assert.equal(engine.convergenceUnlocked(), true);
  assert.equal(engine.startConvergenceRun(4), true);
  assert.equal(engine.state.phase, 'civilization');
  const civ = engine.state.civilization;
  assert.equal(civ.terminal, true);
  assert.equal(civ.era, 3);
  assert.equal(civ.years, ERA_YEAR_THRESHOLDS[3]);
  assert.equal(civ.development, 340);
});

test('the terminal run pays no credits and no resources', () => {
  const engine = unlockedConvergenceEngine();
  engine.startConvergenceRun(5);
  engine.state.civilization.development = 400;
  const before = { ...engine.state.machine.currencies };
  engine.harvest(false);
  assert.deepEqual(engine.state.machine.currencies, before);
  assert.equal(engine.state.machine.cultivationCreditsThisUniverse, 0);
  assert.equal(engine.state.phase, 'machine');
  assert.equal(engine.state.meta.convergences, 0);
  assert.equal(engine.convergenceUnlocked(), true);
});

test('a deep controlled harvest in the terminal run wins and pays a stacking bonus', () => {
  const engine = unlockedConvergenceEngine();
  engine.startConvergenceRun(6);
  const civ = engine.state.civilization;
  civ.development = 1200;
  civ.eventChoices = 5;
  civ.pathState.dominantPath = 'machine_faith';
  civ.pathState.endgameStates = ['endgame_a', 'endgame_b'];
  const baseHarvestMult = engine.runtimeBonuses().allHarvestMult;
  engine.harvest(false);
  assert.equal(engine.state.phase, 'victory');
  assert.equal(engine.state.meta.convergences, 1);
  assert.equal(engine.state.meta.victories.length, 1);
  assert.equal(engine.lastVictory().dominantPath, 'machine_faith');
  assert.equal(engine.state.meta.progression.milestones.first_convergence, true);
  assert.ok(engine.runtimeBonuses().allHarvestMult > baseHarvestMult);
  assert.equal(engine.runtimeBonuses().containmentRating, 2);

  engine.acknowledgeVictory();
  assert.equal(engine.state.phase, 'machine');
  assert.equal(engine.convergenceTargetDepth(), 18);
});

test('a cascade in the terminal run fails without losing the unlock', () => {
  const engine = unlockedConvergenceEngine();
  engine.startConvergenceRun(7);
  engine.state.civilization.development = 1200;
  engine.state.civilization.stats.stability = 0;
  engine.harvest(true);
  assert.equal(engine.state.phase, 'machine');
  assert.equal(engine.state.meta.convergences, 0);
  assert.equal(engine.convergenceUnlocked(), true);
});

test('reaching the gate completes the convergence_gate milestone', () => {
  const engine = unlockedConvergenceEngine();
  engine.refreshConvergenceMilestones();
  assert.equal(engine.state.meta.progression.milestones.convergence_gate, true);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `blocked.convergenceUnlocked is not a function`.

- [ ] **Step 3: Add the imports**

At the top of `public/game/src/game/engine.ts`:

```ts
import { convergenceBonuses, convergenceRequirements, convergenceTargets, convergenceUnlocked, evaluateConvergence, terminalCivilizationSetup } from './convergence.js';
import { MILESTONE_CATALOG, completedMilestoneCount } from './milestones.js';
import type { ConvergenceInput, ConvergenceRequirement } from './convergence.js';
import type { VictoryRecord } from './types.js';
```

Add `VictoryRecord` only if it is not already covered by the existing `import type { ... } from './types.js'` line; if it is, extend that line instead of adding a second one.

- [ ] **Step 4: Add the convergence surface to the engine**

Insert these methods after `canConsumeMultiverse()`:

```ts
  convergenceInput():ConvergenceInput{const axioms=this.catalog('axiom').map((definition:any)=>({id:String(definition.id),level:this.upgradeLevel('axiom',String(definition.id)),maxLevel:Number(definition.max_level)}));return {milestonesCompleted:completedMilestoneCount(this.state),milestonesTotal:MILESTONE_CATALOG.length,multiverses:this.state.meta.multiversesConsumed,axioms,bestGradeIndex:gradeIndex(this.state.meta.progression.bestGrade),convergences:this.state.meta.convergences};}
  convergenceRequirements():ConvergenceRequirement[]{return convergenceRequirements(this.convergenceInput());}
  convergenceUnlocked(){return convergenceUnlocked(this.convergenceInput());}
  convergenceTargetDepth(){return convergenceTargets(this.state.meta.convergences).depth;}
  lastVictory():VictoryRecord|null{return this.state.meta.victories[0]??null;}
  refreshConvergenceMilestones(){for(const m of Progression.recordMilestones(this.state,this.convergenceUnlocked()))this.post(m);}
  startConvergenceRun(requestedSeed=0){if(this.state.phase!=='machine'||!this.convergenceUnlocked()){this.lastActionFailure='The Great Convergence is not authorized.';this.emit();return false;}if(!this.startCivilization(requestedSeed,true))return false;this.post('GREAT CONVERGENCE INITIATED. Terminal cultivation begins in APOTHEOSIS.');this.save();this.emit();return true;}
  acknowledgeVictory(){if(this.state.phase!=='victory')return false;this.state.phase='machine';this.prepareNextRun(mixSeed(this.state.meta.convergences*7919+13),false);this.save();this.emit();return true;}
```

- [ ] **Step 5: Let `startCivilization` build a terminal run**

Change the signature and the era/development block in `startCivilization`. Replace:

```ts
  startCivilization(requestedSeed=0){if(this.state.phase!=='machine')return false;const run=this.state.machine.runBuild;if(this.systemUnlocked('directives')&&run.directiveOfferIds.length&&!run.selectedDirective){
```

with:

```ts
  startCivilization(requestedSeed=0,terminal=false){if(this.state.phase!=='machine')return false;const run=this.state.machine.runBuild;if(!terminal&&this.systemUnlocked('directives')&&run.directiveOfferIds.length&&!run.selectedDirective){
```

Then replace the era/years/development assignments:

```ts
const era=Math.max(0,Math.min(2,Math.trunc(bonuses.startingEra)));const civ=GameEngine.createCivilizationForTest(seed);civ.rngState=selection.rngState;civ.years=ERA_YEAR_THRESHOLDS[era]!;civ.era=era;civ.development=1+era*80;
```

with:

```ts
const setup=terminal?terminalCivilizationSetup():null;const era=setup?setup.era:Math.max(0,Math.min(2,Math.trunc(bonuses.startingEra)));const civ=GameEngine.createCivilizationForTest(seed);civ.terminal=terminal;civ.rngState=selection.rngState;civ.years=setup?setup.years:ERA_YEAR_THRESHOLDS[era]!;civ.era=era;civ.development=setup?setup.development:1+era*80;
```

- [ ] **Step 6: Apply the convergence bonus in `runtimeBonuses`**

At the end of `runtimeBonuses()`, immediately before `return b;`, insert:

```ts
    const convergence=convergenceBonuses(this.state.meta.convergences);
    b.allHarvestMult*=convergence.allHarvestMult;
    b.containmentRating+=convergence.containment;
```

- [ ] **Step 7: Branch the harvest for terminal runs**

In `harvest(chaotic=false)`, insert immediately after `const details=this.previewHarvestDetails(chaotic);`:

```ts
if(civ.terminal)return this.finishTerminalRun(civ,chaotic,details);
```

Add the private method directly below `harvest`:

```ts
  private finishTerminalRun(civ:Civilization,chaotic:boolean,details:any){const zero={causal_mass:0,cognition:0,paradox:0,existence:0};this.recordRunStatistics(civ,details);this.state.machine.civilizationsTotal++;const outcome=evaluateConvergence(details.depth,chaotic,this.state.meta.convergences);this.state.machine.lastHarvest={chaotic,rewards:{...zero},terminal:true,seed:civ.seed,years:Math.trunc(civ.years),era:civ.era,development:civ.development,grade:details.grade,depth:details.depth,credits:0,reward_multiplier:0,outcome};
    if(outcome==='won'){const record:VictoryRecord={convergence:this.state.meta.convergences+1,seed:civ.seed,years:Math.trunc(civ.years),era:civ.era,depth:details.depth,development:civ.development,dominantPath:civ.pathState.dominantPath,endgameStates:[...civ.pathState.endgameStates]};this.state.meta.convergences++;this.state.meta.victories.unshift(record);this.state.meta.victories=this.state.meta.victories.slice(0,5);this.post(`GREAT CONVERGENCE ${record.convergence} ACHIEVED at Cultivation Depth ${details.depth.toFixed(1)}.`);}
    else this.post(`CONVERGENCE FAILED at Cultivation Depth ${details.depth.toFixed(1)}. Authorization retained.`);
    this.state.civilization=null;this.state.simulationSpeed=1;this.decisionFeedback=null;this.worldImpulse=null;
    this.state.phase=outcome==='won'?'victory':'machine';
    if(outcome!=='won')this.prepareNextRun(mixSeed(civ.seed+this.state.machine.civilizationsTotal),false);
    this.refreshConvergenceMilestones();this.save();this.emit();return zero;}
```

- [ ] **Step 8: Feed the real unlock flag into the tick path**

In `tick`, replace:

```ts
    for(const m of Progression.recordCivilizationProgress(this.state,civ))this.post(m);
```

with:

```ts
    for(const m of Progression.recordCivilizationProgress(this.state,civ))this.post(m);
    if(civ.terminal)this.refreshConvergenceMilestones();
```

The gate milestone is otherwise refreshed on the machine layer, where `refreshConvergenceMilestones` is called from `finishTerminalRun`, `consumeUniverse` and `consumeMultiverse`. Add the call to both prestige methods, immediately before their `this.save();this.emit();return true;` tail:

```ts
this.refreshConvergenceMilestones();
```

- [ ] **Step 9: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add public/game/src/game/engine.ts public/game/dist public/game/tests/core.test.mjs
git commit -m "feat(engine): run, resolve and reward the Great Convergence"
```

---

### Task 6: View model and structural keys

Exposes the register, the gate and the victory record to the UI without letting live numbers enter the structural keys.

**Files:**
- Modify: `public/game/src/ui/view-model.ts`
- Modify: `public/game/src/render/world-presentation.ts` (`structuralWorldKey`)
- Test: `public/game/tests/presentation.test.mjs`

**Interfaces:**
- Consumes: the engine surface from Task 5.
- Produces on the view model: `milestones: { entries: MilestoneView[]; completed: number; total: number }`, `convergence: { visible, unlocked, requirements, targetDepth, reason }`, `victory: { record, convergences } | null`, `civilization.terminal`, `harvest.convergenceReady`.

- [ ] **Step 1: Write the failing test**

Append to `public/game/tests/presentation.test.mjs`:

```js
test('the view model reports milestone progress and the convergence gate', () => {
  const engine = freshEngine();
  const vm = buildViewModel(engine);
  assert.equal(vm.milestones.total, 28);
  assert.equal(vm.milestones.completed, 0);
  assert.equal(vm.milestones.entries.length, 28);
  assert.equal(vm.convergence.visible, false);
  assert.equal(vm.convergence.unlocked, false);
  assert.equal(vm.convergence.requirements.length, 4);
  assert.equal(vm.convergence.targetDepth, 14);
  assert.ok(vm.convergence.reason.length > 0);
  assert.equal(vm.victory, null);
});

test('the convergence card becomes visible after the first multiverse', () => {
  const engine = freshEngine();
  engine.state.meta.multiversesConsumed = 1;
  assert.equal(buildViewModel(engine).convergence.visible, true);
});

test('the render key ignores live depth but tracks convergence readiness', () => {
  const engine = freshEngine();
  const civ = GameEngine.createCivilizationForTest(77);
  civ.terminal = true;
  civ.development = 400;
  engine.state.civilization = civ;
  engine.state.phase = 'civilization';
  const before = civilizationRenderKey(buildViewModel(engine));
  civ.development = 460;
  assert.equal(civilizationRenderKey(buildViewModel(engine)), before);
  civ.development = 2000;
  civ.pathState.endgameStates = ['a', 'b', 'c', 'd'];
  assert.notEqual(civilizationRenderKey(buildViewModel(engine)), before);
});

test('a terminal run gets its own cached world layer', () => {
  const plain = GameEngine.createCivilizationForTest(78);
  const terminal = { ...GameEngine.createCivilizationForTest(78), terminal: true };
  assert.notEqual(structuralWorldKey(terminal, 800), structuralWorldKey(plain, 800));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot read properties of undefined (reading 'total')`.

- [ ] **Step 3: Extend the view model**

In `public/game/src/ui/view-model.ts`, add the import:

```ts
import { milestoneProgress } from '../game/milestones.js';
```

Inside `buildViewModel`, add before the `return`:

```ts
  const convergenceUnlocked = engine.convergenceUnlocked();
  const convergenceRequirements = engine.convergenceRequirements();
  const convergenceTargetDepth = engine.convergenceTargetDepth();
  const milestoneEntries = milestoneProgress(state, convergenceUnlocked);
  const openRequirement = convergenceRequirements.find(entry => !entry.met);
```

Add these members to the returned object, next to `previews`:

```ts
    milestones: {
      entries: milestoneEntries,
      completed: milestoneEntries.filter(entry => entry.completed).length,
      total: milestoneEntries.length,
    },
    convergence: {
      visible: state.meta.multiversesConsumed >= 1,
      unlocked: convergenceUnlocked,
      requirements: convergenceRequirements,
      targetDepth: convergenceTargetDepth,
      convergences: state.meta.convergences,
      reason: openRequirement ? `${openRequirement.label}: ${openRequirement.current}/${openRequirement.target}` : 'All requirements met.',
    },
    victory: state.phase === 'victory' ? { record: engine.lastVictory(), convergences: state.meta.convergences } : null,
```

Add `convergenceReady` to the `harvest` block:

```ts
      convergenceReady: Boolean(civ?.terminal) && cultivationDepth(civ!) >= convergenceTargetDepth,
```

Add `terminal` to the `civilization` block, next to `seed`:

```ts
      terminal: civ.terminal,
```

- [ ] **Step 4: Extend the structural keys**

In `civilizationRenderKey`, add two entries to the array, after `civilization.seed`:

```ts
    civilization.terminal ? 'terminal' : 'normal',
    vm.harvest?.convergenceReady ? 'convergence-ready' : 'convergence-open',
```

In `public/game/src/render/world-presentation.ts`, inside `structuralWorldKey`, add one entry to the returned array immediately after `civ.seed,`:

```ts
    civ.terminal ? 'terminal' : 'normal',
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add public/game/src/ui/view-model.ts public/game/src/render/world-presentation.ts public/game/dist public/game/tests/presentation.test.mjs
git commit -m "feat(ui): expose milestones, the convergence gate and victory in the view model"
```

---

### Task 7: The user interface

Two machine-view cards, the terminal-run banner, the victory screen and the meta bar.

**Files:**
- Modify: `public/game/index.html` (victory section)
- Modify: `public/game/src/ui/app.ts`
- Modify: `public/game/styles.css`
- Test: `public/game/tests/presentation.test.mjs`

**Interfaces:**
- Consumes: the view-model members from Task 6.
- Produces: DOM ids `#victory-view`, classes `.milestone-register`, `.convergence-card`, `.terminal-banner`; actions `data-action="convergence"` and `data-action="acknowledge-victory"`.

- [ ] **Step 1: Write the failing test**

Append to `public/game/tests/presentation.test.mjs`:

```js
test('index.html hosts the victory view and the machine cards render', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('id="victory-view"'));
  const app = await readFile(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
  assert.ok(app.includes('MILESTONE REGISTER'));
  assert.ok(app.includes('GREAT CONVERGENCE'));
  assert.ok(app.includes('data-action="convergence"'));
  assert.ok(app.includes('data-action="acknowledge-victory"'));
  assert.ok(app.includes('TERMINAL CULTIVATION'));
  // Every interpolated player value stays escaped.
  assert.ok(!app.includes('${vm.convergence.reason}'));
  assert.ok(app.includes('esc(vm.convergence.reason)'));
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `The expression evaluated to a falsy value: assert.ok(html.includes('id="victory-view"'))`.

- [ ] **Step 3: Add the victory section to `index.html`**

In `public/game/index.html`, insert directly after the closing `</section>` of `#civilization-view` and before the machine-log section:

```html
      <section id="victory-view" class="phase-view is-hidden"></section>
```

- [ ] **Step 4: Render the two machine cards**

In `public/game/src/ui/app.ts`, add these builders above `function renderMachine(vm:any){`:

```ts
  const milestoneRegister=(vm:any)=>{const groups=['CULTIVATION','HARVEST','PATHS','PRESTIGE','CONVERGENCE'];const sections=groups.map(group=>{const entries=vm.milestones.entries.filter((entry:any)=>entry.group===group);if(!entries.length)return '';const open=entries.filter((entry:any)=>!entry.completed).map((entry:any)=>`<article class="milestone"><div><b>${esc(entry.title)}</b><p>${esc(entry.description)}</p></div><div class="milestone-progress"><div class="meter"><i style="width:${pct(entry.current,entry.target)}"></i></div><small>${fmt(entry.current)} / ${fmt(entry.target)} · INSIGHT +${entry.insight}</small></div></article>`).join('');const done=entries.filter((entry:any)=>entry.completed).map((entry:any)=>`<article class="milestone complete"><b>✓ ${esc(entry.title)}</b><small>INSIGHT +${entry.insight}</small></article>`).join('');return `<div class="milestone-group"><span class="panel-kicker">${esc(group)}</span>${open}${done}</div>`;}).join('');return card('Milestone Register',`<div class="milestone-register"><p class="register-summary">${vm.milestones.completed} of ${vm.milestones.total} milestones recorded. Each one pays Machine Insight.</p>${sections}</div>`,'milestone-card');};
  const convergenceCard=(vm:any)=>{if(!vm.convergence.visible)return '';const rows=vm.convergence.requirements.map((entry:any)=>`<li class="${entry.met?'met':'open'}"><span>${entry.met?'✓':'○'} ${esc(entry.label)}</span><b>${fmt(entry.current)} / ${fmt(entry.target)}</b></li>`).join('');return card('Great Convergence',`<div class="convergence-card"><p>Terminal cultivation begins in APOTHEOSIS with no yield and 1.6× Entropy. It is won by a controlled harvest at Cultivation Depth ${vm.convergence.targetDepth.toFixed(1)} or deeper. Failure costs nothing but the run.</p><ul class="convergence-requirements">${rows}</ul><button class="primary big" data-action="convergence" ${vm.convergence.unlocked?'':'disabled'}>INITIATE GREAT CONVERGENCE</button>${vm.convergence.unlocked?'':`<p class="start-reason" role="status">${esc(vm.convergence.reason)}</p>`}${vm.convergence.convergences?`<small>Convergences achieved: ${vm.convergence.convergences}</small>`:''}</div>`,'convergence-panel');};
```

In `renderMachine`, insert both cards into the template string immediately before the `${previews?card('Next Discoveries'...)}` line:

```ts
      ${convergenceCard(vm)}
      ${milestoneRegister(vm)}
```

- [ ] **Step 5: Render the terminal banner and the victory screen**

Add the victory renderer above `function bindActions(){`:

```ts
  function renderVictory(vm:any){const record=vm.victory?.record;if(!record){replaceIfChanged(victoryView,'');return;}const endgames=record.endgameStates.length?record.endgameStates.map((state:string)=>`<span>${esc(state.replace('endgame_','').replaceAll('_',' '))}</span>`).join(''):'<span>none recorded</span>';replaceIfChanged(victoryView,`<section class="panel victory-screen"><div class="panel-kicker">GREAT CONVERGENCE ${record.convergence}</div><h2>The Machine Closes Its Ledger</h2><p>A civilization was cultivated to the depth at which the harvest and the harvester stop being different operations.</p><div class="victory-stats"><article><span>SEED</span><b>${fmt(record.seed)}</b></article><article><span>YEARS</span><b>${fmt(record.years)}</b></article><article><span>ERA</span><b>${esc(ERA_NAMES[record.era])}</b></article><article><span>DEPTH</span><b>${record.depth.toFixed(1)}</b></article><article><span>DEVELOPMENT</span><b>${fmt(record.development)}</b></article><article><span>DOMINANT PATH</span><b>${esc(record.dominantPath||'unresolved')}</b></article></div><div class="victory-endgames">${endgames}</div><p class="victory-bonus">Permanent reward: ×${(1+.25*vm.victory.convergences).toFixed(2)} harvest yield and +${2*vm.victory.convergences} Containment.</p><button class="primary big" data-action="acknowledge-victory">CONTINUE</button></section>`);}
```

Add the element lookup next to the other `document.querySelector` calls in `createGameUI`:

```ts
  const victoryView=document.querySelector('#victory-view') as HTMLElement;
```

In `render()`, replace the two `classList.toggle` lines with three and add the victory branch:

```ts
    machine.classList.toggle('is-hidden',vm.phase!=='machine');
    civView.classList.toggle('is-hidden',vm.phase!=='civilization');
    victoryView.classList.toggle('is-hidden',vm.phase!=='victory');
    if(vm.phase==='victory')renderVictory(vm);
```

Update the meta bar line in `render()`:

```ts
    replaceIfChanged(metaBar,`<span>Machine Insight <b>${vm.machineInsight}</b></span><span>Cultivation Credits <b>${vm.cultivationCreditsThisUniverse}/${vm.universeRequirement}</b></span><span>Milestones <b>${vm.milestones.completed}/${vm.milestones.total}</b></span>${vm.systems.multiversePrestige?`<span>Multiverse <b>${vm.universesThisMultiverse}/${vm.multiverseRequirement}</b></span>`:''}${vm.convergence.convergences?`<span>Convergences <b>${vm.convergence.convergences}</b></span>`:''}`);
```

In `renderCivilization`, prepend the banner to the panels template — add this constant at the top of the function, after `const chaotic=vm.harvest.chaotic;`:

```ts
    const terminalBanner=c.terminal?`<section class="panel terminal-banner ${vm.harvest.convergenceReady?'ready':''}"><div class="panel-kicker">TERMINAL CULTIVATION</div><b>CONVERGENCE TARGET DEPTH ${vm.convergence.targetDepth.toFixed(1)}</b><span>CURRENT <b data-live="convergence-depth">${vm.harvest.depth.toFixed(1)}</b> · ${vm.harvest.convergenceReady?'CONVERGENCE READY':'INSUFFICIENT DEPTH'}</span></section>`:'';
```

Then change the `civPanels` write in the same function from:

```ts
    replaceIfChanged(civPanels,`${tacticalRail(vm)}${decisionFeedback(vm.feedback)}${eventCard}${objectiveCard}${reserveCard}
```

to:

```ts
    replaceIfChanged(civPanels,`${terminalBanner}${tacticalRail(vm)}${decisionFeedback(vm.feedback)}${eventCard}${objectiveCard}${reserveCard}
```

In `refreshCivilizationLive`, add next to the other `setText` calls:

```ts
    setText('[data-live="convergence-depth"]',vm.harvest.depth.toFixed(1));
```

- [ ] **Step 6: Bind the two new actions**

In `bindActions`, add two cases to the `switch`:

```ts
case'convergence':engine.startConvergenceRun();break;case'acknowledge-victory':engine.acknowledgeVictory();break;
```

- [ ] **Step 7: Add the styles**

Append to `public/game/styles.css`:

```css
.milestone-register{display:flex;flex-direction:column;gap:.9rem}
.register-summary{opacity:.75;margin:0}
.milestone-group{display:flex;flex-direction:column;gap:.35rem}
.milestone{display:flex;justify-content:space-between;gap:1rem;align-items:center;padding:.5rem .7rem;border:1px solid rgba(140,180,255,.18);border-radius:.4rem}
.milestone p{margin:.15rem 0 0;opacity:.7;font-size:.82em}
.milestone-progress{min-width:11rem;text-align:right}
.milestone.complete{opacity:.55;border-style:dashed}
.convergence-card{display:flex;flex-direction:column;gap:.7rem}
.convergence-requirements{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.3rem}
.convergence-requirements li{display:flex;justify-content:space-between;padding:.35rem .6rem;border-radius:.35rem;background:rgba(120,160,255,.08)}
.convergence-requirements li.met{background:rgba(120,255,190,.12)}
.terminal-banner{border-color:rgba(255,120,120,.5);display:flex;flex-direction:column;gap:.25rem}
.terminal-banner.ready{border-color:rgba(120,255,190,.6)}
.victory-screen{display:flex;flex-direction:column;gap:1rem;align-items:flex-start}
.victory-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(8rem,1fr));gap:.6rem;width:100%}
.victory-stats article{display:flex;flex-direction:column;padding:.5rem .7rem;border:1px solid rgba(140,180,255,.2);border-radius:.4rem}
.victory-endgames{display:flex;flex-wrap:wrap;gap:.4rem}
.victory-endgames span{padding:.2rem .5rem;border-radius:.3rem;background:rgba(140,180,255,.14);font-size:.82em}
.victory-bonus{margin:0;opacity:.8}
```

- [ ] **Step 8: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add public/game/index.html public/game/src/ui/app.ts public/game/styles.css public/game/dist public/game/tests/presentation.test.mjs
git commit -m "feat(ui): add the milestone register, convergence card and victory screen"
```

---

### Task 8: Release plumbing for v1.6.0

The two new `dist/` modules must be precached or returning players never receive them, and the cache name must change or they never receive anything.

**Files:**
- Modify: `public/sw.js`
- Modify: `package.json`, `public/game/package.json`
- Modify: `public/game/index.html` (footer)
- Modify: `README.md`, `public/game/README.md`
- Test: `public/game/tests/presentation.test.mjs`, `tests/game-release.test.mjs`

**Interfaces:**
- Consumes: the modules created in Tasks 2 and 4.
- Produces: nothing consumed by other tasks; this is the last task.

- [ ] **Step 1: Write the failing test**

Append to `public/game/tests/presentation.test.mjs`:

```js
test('the service worker precaches every game module and carries the new cache name', async () => {
  const sw = await readFile(new URL('../../sw.js', import.meta.url), 'utf8');
  for (const module of ['milestones', 'convergence']) {
    assert.ok(sw.includes(`/game/dist/game/${module}.js`), `${module}.js is missing from APP_ASSETS`);
  }
  assert.ok(sw.includes("CACHE_NAME = 'rce-app-v1.6.0'"));
});
```

Append to `tests/game-release.test.mjs`:

```js
test('the shipped version is 1.6.0 everywhere it is written down', async () => {
  const read = async (path) => readFile(new URL(path, import.meta.url), 'utf8');
  const shell = JSON.parse(await read('../package.json'));
  const game = JSON.parse(await read('../public/game/package.json'));
  assert.equal(shell.version, '1.6.0');
  assert.equal(game.version, '1.6.0');
  assert.ok((await read('../public/game/index.html')).includes('Browser v1.6.0'));
  assert.ok((await read('../README.md')).includes('v1.6.0'));
  assert.ok((await read('../public/game/README.md')).includes('v1.6.0'));
});
```

If `tests/game-release.test.mjs` does not already import `readFile` and `assert`, add:

```js
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `milestones.js is missing from APP_ASSETS`.

- [ ] **Step 3: Update the service worker**

In `public/sw.js`, change the first line:

```js
const CACHE_NAME = 'rce-app-v1.6.0';
```

Add these two entries to `APP_ASSETS`, keeping the alphabetical grouping of the `game/` block:

```js
  '/game/dist/game/convergence.js',
  '/game/dist/game/milestones.js',
```

- [ ] **Step 4: Bump the version everywhere**

Set `"version": "1.6.0"` in `package.json` and in `public/game/package.json`. In `public/game/index.html`, change the footer to `Reality Consumption Engine Browser v1.6.0` and the adjacent note to `v4 save · localStorage · No offline progression`.

In both `README.md` and `public/game/README.md`, change the title heading to `v1.6.0` and add this section after the "Included" list of the root README:

```markdown
## v1.6.0 victory and milestones

v1.6.0 gives the game an explicit win condition. Meta progress unlocks the **Great
Convergence**: a terminal cultivation that starts in APOTHEOSIS, runs at 1.6× Entropy, pays
no Cultivation Credits and no resources, and is won by a controlled harvest at Cultivation
Depth 14 or deeper. Failing it costs nothing but the run.

A 28-entry **Milestone Register** is now visible in the machine view. It contains the
eleven milestones that previously awarded Machine Insight invisibly, plus seventeen new
ones, each with its progress and its award.

Every convergence is permanent and stacks: ×1.25 harvest yield and +2 Containment per
victory, with the next convergence demanding three more milestones, two more multiverses,
one more level on every Axiom and four more Cultivation Depth.

**Saves from v1.5.0 and earlier are not carried over.** `SAVE_VERSION` is now 4 and older
saves are discarded on load.
```

Add the same section, without the leading `#` level change, to `public/game/README.md` after its "Ported game systems" list.

- [ ] **Step 5: Run the full suite**

```bash
npm test
```

Expected: PASS, all tests green.

- [ ] **Step 6: Verify the lint and typecheck gates**

```bash
npm run lint
```

Expected: PASS (`public/game/**` is excluded from eslint by design).

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add public/sw.js package.json public/game/package.json public/game/index.html README.md public/game/README.md public/game/dist public/game/tests/presentation.test.mjs tests/game-release.test.mjs
git commit -m "chore: release v1.6.0 with the Great Convergence and the milestone register"
```

---

## Balance verification (run after Task 8)

The victory depth of 14 is one constant in `public/game/src/game/convergence.ts`. Before
calling the balance final, measure it:

```bash
node --test --test-name-pattern="convergence" public/game/tests/core.test.mjs
```

Then measure achieved depth across seeds with the existing harness by adding a temporary
script that calls `runCivilization(engine, { seed, policy: ['safe', 'vent'], harvestAt: 'never' })`
for nine seeds on a deep machine build and prints `cultivationDepth(civ)` at cascade. If the
median terminal-run depth lands below 12 or above 20, adjust `CONVERGENCE_BASE_DEPTH` and
re-run the suite — the constant is deliberately isolated so this is a one-line change.
