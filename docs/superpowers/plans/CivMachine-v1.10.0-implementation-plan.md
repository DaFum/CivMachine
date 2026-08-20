# Civilization Drama Arc v1.10.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic Civilization Drama Arc presentation layer that makes existing choices, paths, institutions, crises, and tactical actions visibly shape the civilization during the first approximately 15 minutes without changing v1.9.1 gameplay balance, layout, intervention cadence, or reward math.

**Architecture:** The game layer owns semantic consequence classification and a small optional per-civilization visual-memory reducer. The render layer consumes those semantics through focused identity, memory, consequence-presentation, and quality modules while preserving the existing three-canvas cache/strip-redraw architecture. `world.ts` remains orchestration only; generated content stays frozen; `visualMemory` is presentation-only and never read by progression, pressure, harvest, or scheduler rules.

**Tech Stack:** TypeScript 6.x with Node16 module resolution, deterministic procedural Canvas 2D, Next.js 16 shell, `node:test`/`node:assert`, committed `public/game/dist/`, cache-first service worker.

---

## Global constraints

- Relative TypeScript imports MUST keep the `.js` extension.
- `public/game/src/data/content.generated.ts` MUST NOT change.
- `SAVE_VERSION` MUST NOT change.
- `PHASE_WEIGHTS`, event eligibility, freshness rules, cadence windows, tactical costs/effects, pressure math, harvest math, and upgrade math MUST remain numerically unchanged.
- Existing screen layout and choice-prediction UI MUST remain unchanged.
- `visualMemory` is the only new persistent field and MUST remain optional on `Civilization`.
- No gameplay rule may import or inspect `visualMemory`.
- No semantic resolver may inspect player-facing title/body/prediction/copy text.
- No consequence selection, memory placement, landmark selection, or signature variant may use `Math.random()`.
- Hard full-quality ceilings remain: 150 particles, 9 haze bands, 12 fractures, 10 beacons, 120 planned animated agents, 6 concurrent construction animations, 6 memory marks, 3 scars.
- `staticCanvas`, `sceneryCanvas`, and `dynamicCanvas` remain separate. Persistent geometry belongs on scenery; transient impacts remain dynamic.
- Scenery scrolling MUST keep the existing copy-and-exposed-strip redraw path.
- Tests import from `public/game/dist/**`, not `src/**`.
- Run commands from the repository root.

## Known baseline issue before feature work

Fresh verification on 2026-08-20 produced 251 tests: 250 pass, 1 fail. The failure is pre-existing release metadata drift: root/package metadata is `1.9.1`, while `tests/game-release.test.mjs`, both README titles, and the game footer still identify `1.9.0`. Task 0 restores a green v1.9.1 baseline before TDD begins.

## File map

| File | Responsibility | Task |
| --- | --- | ---: |
| `tests/game-release.test.mjs` | Release-version coupling and precache assertions. | 0, 11 |
| `README.md` | Root release title/notes. | 0, 11 |
| `public/game/README.md` | Browser release title/notes. | 0, 11 |
| `public/game/index.html` | Browser version footer/module preloads. | 0, 11 |
| `public/game/src/game/types.ts` | Shared drama/consequence/memory types and optional `visualMemory`. | 1, 2 |
| `public/game/src/game/drama.ts` | Canonical drama score/phase derivation. | 1 |
| `public/game/src/game/consequence-profiles.ts` | Exactly 28 typed signature profiles. | 2 |
| `public/game/src/game/decision-consequences.ts` | Generic tags, transitions, significance, signature matching. | 2 |
| `public/game/src/game/decision-feedback.ts` | Before/after semantic snapshot and `DecisionConsequence` creation. | 2 |
| `public/game/src/game/world-memory.ts` | Sanitize/init/reduce/repair deterministic per-run visual memory. | 3 |
| `public/game/src/game/engine.ts` | Minimal feedback-to-memory wiring after completed decisions/actions. | 4 |
| `public/game/src/render/world-model.ts` | Stage wrapper plus testable live-budget constants/quality sampling. | 1, 8 |
| `public/game/src/render/identity.ts` | Path identity tiers and institution landmark descriptors. | 5 |
| `public/game/src/render/world-memory.ts` | Memory signatures, anchor resolution, scenery/dynamic memory drawing. | 6 |
| `public/game/src/render/consequence-presentation.ts` | Draw-ready transient descriptors from semantic feedback. | 7 |
| `public/game/src/render/quality.ts` | Renderer-local adaptive-quality controller. | 8 |
| `public/game/src/render/world-presentation.ts` | Distinct live-state channels and structural key signatures. | 5, 6, 8 |
| `public/game/src/render/world.ts` | Layer composition, effect timing, phase transitions, quality integration. | 6, 7, 8, 9 |
| `public/game/tests/core.test.mjs` | Drama, consequence, memory, engine, balance regressions. | 1-4 |
| `public/game/tests/presentation.test.mjs` | Identity, presentation, structural key, reduced-motion, quality tests. | 5, 7, 8 |
| `public/game/tests/render-smoke.test.mjs` | Scenery/dynamic layer, culling, strip redraw, teardown smoke tests. | 6-9 |
| `public/sw.js` | Cache name and full compiled module precache. | 11 |
| `package.json`, `package-lock.json` | Root version 1.10.0. | 11 |
| `public/game/package.json`, `public/game/package-lock.json` | Game package version 1.10.0. | 11 |
| `public/game/dist/**` | Compiled committed browser modules. | every code task, finalized in 11 |

---

### Task 0: Restore a green v1.9.1 release baseline

**Files:**
- Modify: `tests/game-release.test.mjs:138-163`
- Modify: `README.md:1-5`
- Modify: `public/game/README.md:1-5`
- Modify: `public/game/index.html:46`

- [ ] **Step 1: Change the release assertion to the package version that is already shipped**

Replace the release-test name and literal assertion with:

```javascript
test('release metadata identifies browser app v1.9.1', async () => {
  const rootPackage = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(rootPackage.version, '1.9.1');
  const version = rootPackage.version;
  const escaped = version.replaceAll('.', '\\\\.');
```

Keep the remainder of that existing test unchanged.

- [ ] **Step 2: Align the browser footer and both README release surfaces**

Change the footer to:

```html
<footer><span>Reality Consumption Engine Browser v1.9.1</span><span>v4 save · localStorage · No offline progression</span></footer>
```

Change each README title to `v1.9.1` and insert this release block immediately before the existing `v1.9.0` section:

```markdown
## v1.9.1 baseline synchronization

v1.9.1 is the current balance/content baseline used by the Civilization Drama Arc work. This
maintenance release keeps the v1.9.0 185-intervention catalog and measured survival curve intact;
the release surfaces are synchronized to the package/cache version before v1.10.0 feature work.
```

- [ ] **Step 3: Run the full baseline suite**

Run: `npm test`

Expected: `251` tests, `251` pass, `0` fail.

- [ ] **Step 4: Commit the baseline repair**

```bash
git add tests/game-release.test.mjs README.md public/game/README.md public/game/index.html
git commit -m "chore(release): align v1.9.1 metadata"
```

---

### Task 1: Make Drama Phase a canonical game-layer concept

**Files:**
- Modify: `public/game/src/game/types.ts`
- Create: `public/game/src/game/drama.ts`
- Modify: `public/game/src/render/world-model.ts:1-10`
- Modify: `public/game/tests/core.test.mjs`
- Modify: `public/game/tests/presentation.test.mjs`

- [ ] **Step 1: Write failing drama-boundary tests**

Add imports:

```javascript
import { civilizationDramaScore, civilizationDramaPhase } from '../dist/game/drama.js';
import { developmentStage } from '../dist/render/world-model.js';
```

Append to `public/game/tests/core.test.mjs`:

```javascript
test('Civilization Drama score preserves the v1.9.1 stage expression', () => {
  const civ = GameEngine.createCivilizationForTest(11001);
  civ.development = 123;
  civ.era = 2;
  civ.institutions.push('Consensus Office', 'Ministry Of Sanity');
  civ.eventChoices = 7;
  assert.equal(civilizationDramaScore(civ), 123 + 2 * 120 + 2 * 30 + 7 * 6);
});

test('Civilization Drama phase uses the exact legacy stage boundaries', () => {
  const civ = GameEngine.createCivilizationForTest(11002);
  const cases = [
    [69, 0, 'emergence'], [70, 1, 'expansion'],
    [179, 1, 'expansion'], [180, 2, 'division'],
    [339, 2, 'division'], [340, 3, 'transformation'],
    [559, 3, 'transformation'], [560, 4, 'crisis'],
  ];
  for (const [score, id, name] of cases) {
    civ.development = score;
    civ.era = 0;
    civ.institutions.length = 0;
    civ.eventChoices = 0;
    assert.equal(civilizationDramaPhase(civ).id, id);
    assert.equal(civilizationDramaPhase(civ).name, name);
    assert.equal(developmentStage(civ), id, `render stage drifted at score ${score}`);
  }
});
```

- [ ] **Step 2: Run the targeted tests and verify red**

Run: `npm test -- --test-name-pattern="Civilization Drama"`

Expected: FAIL because `dist/game/drama.js` does not exist.

- [ ] **Step 3: Add shared drama types**

Insert near the other top-level type aliases in `public/game/src/game/types.ts`:

```typescript
export type DramaPhaseId = 0 | 1 | 2 | 3 | 4;
export type DramaPhaseName = 'emergence' | 'expansion' | 'division' | 'transformation' | 'crisis';

export interface DramaPhase {
  id: DramaPhaseId;
  name: DramaPhaseName;
  label: string;
}
```

- [ ] **Step 4: Create the canonical drama module**

Create `public/game/src/game/drama.ts`:

```typescript
import type { Civilization, DramaPhase } from './types.js';

const PHASES: ReadonlyArray<DramaPhase> = [
  { id: 0, name: 'emergence', label: 'Emergence' },
  { id: 1, name: 'expansion', label: 'Expansion' },
  { id: 2, name: 'division', label: 'Division' },
  { id: 3, name: 'transformation', label: 'Transformation' },
  { id: 4, name: 'crisis', label: 'Crisis' },
];

export function civilizationDramaScore(civ: Civilization): number {
  return civ.development + civ.era * 120 + civ.institutions.length * 30 + civ.eventChoices * 6;
}

export function civilizationDramaPhase(civ: Civilization): DramaPhase {
  const score = civilizationDramaScore(civ);
  if (score < 70) return PHASES[0]!;
  if (score < 180) return PHASES[1]!;
  if (score < 340) return PHASES[2]!;
  if (score < 560) return PHASES[3]!;
  return PHASES[4]!;
}
```

- [ ] **Step 5: Replace the duplicated renderer formula**

At the top of `public/game/src/render/world-model.ts`, import the canonical helper and replace `developmentStage` with:

```typescript
import { civilizationDramaPhase } from '../game/drama.js';
import type { Civilization } from '../game/types.js';

export function developmentStage(civ: Civilization): number {
  return civilizationDramaPhase(civ).id;
}
```

Leave every count formula and threshold below it unchanged.

- [ ] **Step 6: Run drama tests and the whole suite**

Run: `npm test -- --test-name-pattern="Civilization Drama|stage boundaries"`

Expected: PASS.

Run: `npm test`

Expected: all tests pass; balance tests remain unchanged.

- [ ] **Step 7: Commit**

```bash
git add public/game/src/game/types.ts public/game/src/game/drama.ts public/game/src/render/world-model.ts public/game/tests/core.test.mjs public/game/dist/game/drama.js public/game/dist/game/types.js public/game/dist/render/world-model.js
git commit -m "feat(game): add canonical civilization drama phases"
```

---

### Task 2: Add semantic consequences and the 28 signature profiles

**Files:**
- Modify: `public/game/src/game/types.ts`
- Create: `public/game/src/game/consequence-profiles.ts`
- Create: `public/game/src/game/decision-consequences.ts`
- Modify: `public/game/src/game/decision-feedback.ts`
- Modify: `public/game/tests/core.test.mjs`

- [ ] **Step 1: Write failing classifier/profile tests**

Add imports:

```javascript
import { CONSEQUENCE_PROFILES, consequenceProfileFor } from '../dist/game/consequence-profiles.js';
import { buildDecisionConsequence } from '../dist/game/decision-consequences.js';
```

Append:

```javascript
test('the signature catalog contains exactly the required 28 profiles', () => {
  const ids = CONSEQUENCE_PROFILES.map(profile => profile.eventId);
  const required = [
    'synod_of_the_second_engine','unanimous_afternoon','sovereign_hour','department_of_permitted_physics',
    'pollinators_of_the_state','blackout_doctrine','ministry_of_final_forms','immortal_electorate',
    'embassy_at_the_edge','recursion_registry','entropy_crisis_25','entropy_crisis_50','entropy_crisis_75',
    'moon_resigns','ministry_of_sanity','planetary_mind',
    'apotheosis_ledger_of_the_cultivator','apotheosis_the_yield_census','apotheosis_observatory_of_the_hand',
    'apotheosis_terms_of_cultivation','apotheosis_the_counteroffer','apotheosis_arbitration_of_scales',
    'apotheosis_currency_of_unhappened','apotheosis_debt_to_the_unborn','apotheosis_futures_market_in_ruins',
    'apotheosis_maintenance_window','apotheosis_the_replacement_part','apotheosis_recursive_audit',
  ];
  assert.equal(CONSEQUENCE_PROFILES.length, 28);
  assert.deepEqual([...new Set(ids)].sort(), [...required].sort());
  assert.equal(consequenceProfileFor('moon_resigns', [{ kind: 'institution', label: 'Lunar Ministry' }])?.id, 'institution:lunar_ministry');
  assert.equal(consequenceProfileFor('moon_resigns', []) ?? null, null);
});

test('generic consequence thresholds are deterministic, deduplicated, and ordered by precedence', () => {
  const before = {
    metrics: { stability: 80, stabilityMax: 100, awareness: 10, sanity: 80, attention: 10, years: 0, development: 100, eventTimer: 5, entropy: 20, controlCapacity: 3 },
    affinities: { machine_faith: 0 }, traits: [], institutions: [], flags: [], pathFlags: [],
    dramaPhaseId: 1, era: 0, dominantPath: '', endgameStates: [], entropyBand: 0,
  };
  const after = structuredClone(before);
  after.metrics.development = 120;
  after.metrics.stability = 70;
  after.metrics.awareness = 20;
  after.metrics.entropy = 25;
  after.affinities.machine_faith = 3;
  after.dramaPhaseId = 2;
  after.entropyBand = 1;
  const result = buildDecisionConsequence('neutral_event', before, after, []);
  assert.equal(result.significance, 'turning_point');
  assert.deepEqual(result.tags, ['urban_growth','technological_growth','civil_unrest','reality_damage','surveillance','path_shift']);
  assert.deepEqual(result.transitions.dramaPhase, { from: 1, to: 2 });
  assert.deepEqual(result.transitions.entropyBand, { from: 0, to: 1 });
});

test('major and turning-point significance rules cover raw deltas and structural transitions', () => {
  const base = {
    metrics: { stability: 80, stabilityMax: 100, awareness: 10, sanity: 80, attention: 10, years: 0, development: 100, eventTimer: 5, entropy: 20, controlCapacity: 3 },
    affinities: { machine_faith: 0 }, traits: [], institutions: [], flags: [], pathFlags: [],
    dramaPhaseId: 1, era: 0, dominantPath: '', endgameStates: [], entropyBand: 0,
  };
  const major = structuredClone(base); major.metrics.stability = 72;
  assert.equal(buildDecisionConsequence('neutral_event', base, major, []).significance, 'major');
  const dominance = structuredClone(base); dominance.dominantPath = 'machine_faith';
  assert.equal(buildDecisionConsequence('neutral_event', base, dominance, []).significance, 'turning_point');
  const endgame = structuredClone(base); endgame.endgameStates = ['endgame_machine_faith'];
  assert.equal(buildDecisionConsequence('neutral_event', base, endgame, []).significance, 'turning_point');
  for (const id of ['entropy_crisis_25','entropy_crisis_50','entropy_crisis_75']) {
    assert.equal(buildDecisionConsequence(id, base, base, []).significance, 'turning_point');
  }
});
```

- [ ] **Step 2: Run targeted tests and verify red**

Run: `npm test -- --test-name-pattern="signature catalog|generic consequence|significance rules"`

Expected: FAIL because the new modules do not exist.

- [ ] **Step 3: Add consequence and visual-memory types**

Insert into `public/game/src/game/types.ts` after the drama types:

```typescript
export type DecisionSignificance = 'routine' | 'major' | 'turning_point';
export type ConsequenceTag =
  | 'urban_growth' | 'technological_growth' | 'urban_decline' | 'militarization' | 'civil_unrest'
  | 'religious_shift' | 'ecological_damage' | 'reality_damage' | 'surveillance' | 'mass_casualty'
  | 'stabilization' | 'containment' | 'institution_growth' | 'path_shift' | 'apotheosis_contact';

export interface DecisionTransition {
  dramaPhase?: { from: DramaPhaseId; to: DramaPhaseId };
  era?: { from: number; to: number };
  dominantPath?: { from: string; to: string };
  endgameStateAdded?: string;
  entropyBand?: { from: number; to: number };
}

export interface DecisionConsequence {
  significance: DecisionSignificance;
  tags: ConsequenceTag[];
  transitions: DecisionTransition;
  signatureProfile: string;
}

export type MemoryDomain = 'built_environment' | 'identity' | 'control' | 'social' | 'ecology' | 'reality';
export type ScarDomain = 'reality' | 'civilization' | 'identity';

export interface WorldMemoryMark {
  domain: MemoryDomain;
  motif: string;
  strength: 1 | 2 | 3;
  sourceEventId: string;
  createdAtSequence: number;
  anchor01: number;
  repairable: boolean;
  repaired?: boolean;
}

export interface WorldScar {
  domain: ScarDomain;
  motif: string;
  strength: 1 | 2 | 3;
  sourceEventId: string;
  createdAtSequence: number;
  anchor01: number;
  evolution: number;
}

export interface WorldMemoryState {
  version: 1;
  sequence: number;
  marks: WorldMemoryMark[];
  scars: WorldScar[];
}
```

Add `consequence: DecisionConsequence;` to `DecisionFeedback`, and add this optional field to `Civilization` immediately after `history`:

```typescript
visualMemory?: WorldMemoryState;
```

- [ ] **Step 4: Create the signature catalog**

Create `public/game/src/game/consequence-profiles.ts` with exactly this shape and catalog:

```typescript
import type { ConsequenceTag, DecisionAddition, DecisionSignificance, MemoryDomain, ScarDomain } from './types.js';

export interface ConsequenceProfile {
  id: string;
  eventId: string;
  requiresAddition?: { kind: DecisionAddition['kind']; label: string };
  tags: ConsequenceTag[];
  significance?: DecisionSignificance;
  impactVariant: string;
  memory?: { domain: MemoryDomain; motif: string; strength: 1 | 2 | 3; repairable: boolean };
  scar?: { domain: ScarDomain; motif: string; strength: 1 | 2 | 3 };
}

export const CONSEQUENCE_PROFILES: ReadonlyArray<ConsequenceProfile> = [
  { id:'path:machine_faith', eventId:'synod_of_the_second_engine', tags:['religious_shift','path_shift'], significance:'major', impactVariant:'engine-sigil', memory:{domain:'identity',motif:'engine_shrine',strength:3,repairable:false} },
  { id:'path:collective_mind', eventId:'unanimous_afternoon', tags:['path_shift'], significance:'major', impactVariant:'linked-nodes', memory:{domain:'identity',motif:'neural_bridge',strength:3,repairable:false} },
  { id:'path:temporal_dominion', eventId:'sovereign_hour', tags:['technological_growth','path_shift'], significance:'major', impactVariant:'chronal-rings', memory:{domain:'identity',motif:'chronal_pylon',strength:3,repairable:false} },
  { id:'path:reality_engineering', eventId:'department_of_permitted_physics', tags:['technological_growth','path_shift'], significance:'major', impactVariant:'lattice-frame', memory:{domain:'identity',motif:'lattice_tower',strength:3,repairable:false} },
  { id:'path:biological_transcendence', eventId:'pollinators_of_the_state', tags:['path_shift'], significance:'major', impactVariant:'organic-bloom', memory:{domain:'identity',motif:'organic_spires',strength:3,repairable:false} },
  { id:'path:cosmic_resistance', eventId:'blackout_doctrine', tags:['militarization','path_shift'], significance:'major', impactVariant:'defense-blackout', memory:{domain:'identity',motif:'shield_bastion',strength:3,repairable:false} },
  { id:'path:bureaucratic_singularity', eventId:'ministry_of_final_forms', tags:['path_shift'], significance:'major', impactVariant:'admin-grid', memory:{domain:'identity',motif:'administrative_monolith',strength:3,repairable:false} },
  { id:'path:post_mortal_civilization', eventId:'immortal_electorate', tags:['path_shift'], significance:'major', impactVariant:'continuity-halo', memory:{domain:'identity',motif:'continuity_vault',strength:3,repairable:false} },
  { id:'path:void_communion', eventId:'embassy_at_the_edge', tags:['path_shift','reality_damage'], significance:'major', impactVariant:'void-well', memory:{domain:'identity',motif:'dark_obelisk',strength:3,repairable:false} },
  { id:'path:recursive_simulation', eventId:'recursion_registry', tags:['technological_growth','path_shift'], significance:'major', impactVariant:'recursive-frame', memory:{domain:'identity',motif:'nested_tower',strength:3,repairable:false} },

  { id:'crisis:entropy_25', eventId:'entropy_crisis_25', tags:['reality_damage'], significance:'turning_point', impactVariant:'fracture-first', scar:{domain:'reality',motif:'containment_fracture',strength:1} },
  { id:'crisis:entropy_50', eventId:'entropy_crisis_50', tags:['reality_damage'], significance:'turning_point', impactVariant:'fracture-history', scar:{domain:'reality',motif:'history_desynchronization',strength:2} },
  { id:'crisis:entropy_75', eventId:'entropy_crisis_75', tags:['reality_damage','surveillance'], significance:'turning_point', impactVariant:'fracture-observer', scar:{domain:'reality',motif:'cultivator_observation',strength:3} },

  { id:'institution:lunar_ministry', eventId:'moon_resigns', requiresAddition:{kind:'institution',label:'Lunar Ministry'}, tags:['institution_growth'], significance:'major', impactVariant:'lunar-relay', memory:{domain:'built_environment',motif:'lunar_relay',strength:2,repairable:false} },
  { id:'institution:ministry_of_sanity', eventId:'ministry_of_sanity', requiresAddition:{kind:'institution',label:'Ministry Of Sanity'}, tags:['institution_growth','stabilization'], significance:'major', impactVariant:'sanity-dome', memory:{domain:'built_environment',motif:'sanity_dome',strength:2,repairable:false} },
  { id:'institution:consensus_office', eventId:'planetary_mind', requiresAddition:{kind:'institution',label:'Consensus Office'}, tags:['institution_growth'], significance:'major', impactVariant:'consensus-hall', memory:{domain:'built_environment',motif:'consensus_hall',strength:2,repairable:false} },

  { id:'apotheosis:ledger', eventId:'apotheosis_ledger_of_the_cultivator', tags:['apotheosis_contact','surveillance'], significance:'turning_point', impactVariant:'ledger-grid', memory:{domain:'control',motif:'cultivator_ledger',strength:2,repairable:false} },
  { id:'apotheosis:yield_census', eventId:'apotheosis_the_yield_census', tags:['apotheosis_contact','surveillance'], significance:'turning_point', impactVariant:'census-scan', memory:{domain:'control',motif:'yield_census',strength:2,repairable:false} },
  { id:'apotheosis:observatory', eventId:'apotheosis_observatory_of_the_hand', tags:['apotheosis_contact','surveillance'], significance:'turning_point', impactVariant:'observer-eye', scar:{domain:'identity',motif:'observatory_of_the_hand',strength:2} },
  { id:'apotheosis:terms', eventId:'apotheosis_terms_of_cultivation', tags:['apotheosis_contact','path_shift'], significance:'turning_point', impactVariant:'terms-frame', memory:{domain:'identity',motif:'cultivation_terms',strength:2,repairable:false} },
  { id:'apotheosis:counteroffer', eventId:'apotheosis_the_counteroffer', tags:['apotheosis_contact','civil_unrest'], significance:'turning_point', impactVariant:'counteroffer-pulse', memory:{domain:'social',motif:'counteroffer_unrest',strength:2,repairable:true} },
  { id:'apotheosis:arbitration', eventId:'apotheosis_arbitration_of_scales', tags:['apotheosis_contact','reality_damage'], significance:'turning_point', impactVariant:'scale-fracture', scar:{domain:'reality',motif:'arbitration_breach',strength:2} },
  { id:'apotheosis:currency', eventId:'apotheosis_currency_of_unhappened', tags:['apotheosis_contact','reality_damage'], significance:'turning_point', impactVariant:'unhappened-wave', memory:{domain:'reality',motif:'unhappened_echo',strength:2,repairable:true} },
  { id:'apotheosis:debt', eventId:'apotheosis_debt_to_the_unborn', tags:['apotheosis_contact','civil_unrest'], significance:'turning_point', impactVariant:'debt-shadow', scar:{domain:'civilization',motif:'unborn_debt',strength:2} },
  { id:'apotheosis:futures', eventId:'apotheosis_futures_market_in_ruins', tags:['apotheosis_contact','urban_decline','civil_unrest'], significance:'turning_point', impactVariant:'market-collapse', scar:{domain:'civilization',motif:'futures_ruins',strength:3} },
  { id:'apotheosis:maintenance', eventId:'apotheosis_maintenance_window', tags:['apotheosis_contact','containment'], significance:'turning_point', impactVariant:'maintenance-grid', memory:{domain:'reality',motif:'maintenance_seam',strength:2,repairable:true} },
  { id:'apotheosis:replacement', eventId:'apotheosis_the_replacement_part', tags:['apotheosis_contact','technological_growth'], significance:'turning_point', impactVariant:'replacement-surge', scar:{domain:'identity',motif:'replacement_monument',strength:3} },
  { id:'apotheosis:recursive_audit', eventId:'apotheosis_recursive_audit', tags:['apotheosis_contact','surveillance','reality_damage'], significance:'turning_point', impactVariant:'recursive-audit', scar:{domain:'reality',motif:'recursive_audit_breach',strength:3} },
];

export function consequenceProfileById(id: string): ConsequenceProfile | null {
  return CONSEQUENCE_PROFILES.find(profile => profile.id === id) ?? null;
}

export function consequenceProfileFor(eventId: string, additions: ReadonlyArray<DecisionAddition>): ConsequenceProfile | null {
  return CONSEQUENCE_PROFILES.find(profile => {
    if (profile.eventId !== eventId) return false;
    if (!profile.requiresAddition) return true;
    return additions.some(addition => addition.kind === profile.requiresAddition!.kind && addition.label === profile.requiresAddition!.label);
  }) ?? null;
}
```

- [ ] **Step 5: Create pure consequence classification**

Create `public/game/src/game/decision-consequences.ts`:

```typescript
import { consequenceProfileFor } from './consequence-profiles.js';
import type { ConsequenceTag, DecisionAddition, DecisionConsequence, DecisionSignificance, DecisionTransition } from './types.js';
import type { DecisionSnapshot } from './decision-feedback.js';

const metricDelta = (before: DecisionSnapshot, after: DecisionSnapshot, key: string): number => (after.metrics[key] ?? 0) - (before.metrics[key] ?? 0);
const addUnique = (tags: ConsequenceTag[], tag: ConsequenceTag): void => { if (!tags.includes(tag)) tags.push(tag); };

function transitions(before: DecisionSnapshot, after: DecisionSnapshot): DecisionTransition {
  const result: DecisionTransition = {};
  if (before.dramaPhaseId !== after.dramaPhaseId) result.dramaPhase = { from: before.dramaPhaseId, to: after.dramaPhaseId };
  if (before.era !== after.era) result.era = { from: before.era, to: after.era };
  if (before.dominantPath !== after.dominantPath) result.dominantPath = { from: before.dominantPath, to: after.dominantPath };
  const addedEndgame = after.endgameStates.find(id => !before.endgameStates.includes(id));
  if (addedEndgame) result.endgameStateAdded = addedEndgame;
  if (before.entropyBand !== after.entropyBand) result.entropyBand = { from: before.entropyBand, to: after.entropyBand };
  return result;
}

function genericTags(before: DecisionSnapshot, after: DecisionSnapshot, additions: ReadonlyArray<DecisionAddition>): ConsequenceTag[] {
  const tags: ConsequenceTag[] = [];
  const development = metricDelta(before, after, 'development');
  const stability = metricDelta(before, after, 'stability');
  const sanity = metricDelta(before, after, 'sanity');
  const awareness = metricDelta(before, after, 'awareness');
  const attention = metricDelta(before, after, 'attention');
  const entropy = metricDelta(before, after, 'entropy');
  const affinityTotal = [...new Set([...Object.keys(before.affinities), ...Object.keys(after.affinities)])]
    .reduce((sum, id) => sum + Math.abs((after.affinities[id] ?? 0) - (before.affinities[id] ?? 0)), 0);
  if (development >= 10) addUnique(tags, 'urban_growth');
  if (development >= 18 && after.dramaPhaseId >= 2) addUnique(tags, 'technological_growth');
  if (development <= -10) addUnique(tags, 'urban_decline');
  if (stability <= -8 || sanity <= -8) addUnique(tags, 'civil_unrest');
  if (entropy >= 3) addUnique(tags, 'reality_damage');
  if (entropy <= -6) addUnique(tags, 'containment');
  if (awareness >= 8 || attention >= 8) addUnique(tags, 'surveillance');
  if (stability >= 8) addUnique(tags, 'stabilization');
  if (additions.some(addition => addition.kind === 'institution')) addUnique(tags, 'institution_growth');
  if (affinityTotal >= 2) addUnique(tags, 'path_shift');
  if (after.dominantPath === 'machine_faith' && before.dominantPath !== 'machine_faith') addUnique(tags, 'religious_shift');
  return tags;
}

function significance(eventId: string, before: DecisionSnapshot, after: DecisionSnapshot, additions: ReadonlyArray<DecisionAddition>, explicit?: DecisionSignificance): DecisionSignificance {
  const t = transitions(before, after);
  if (explicit === 'turning_point' || t.dramaPhase || t.era || t.dominantPath || t.endgameStateAdded || ['entropy_crisis_25','entropy_crisis_50','entropy_crisis_75'].includes(eventId)) return 'turning_point';
  if (explicit === 'major') return 'major';
  const affinityTotal = [...new Set([...Object.keys(before.affinities), ...Object.keys(after.affinities)])]
    .reduce((sum, id) => sum + Math.abs((after.affinities[id] ?? 0) - (before.affinities[id] ?? 0)), 0);
  const isMajor = Math.abs(metricDelta(before, after, 'development')) >= 15
    || Math.abs(metricDelta(before, after, 'stability')) >= 8
    || Math.abs(metricDelta(before, after, 'sanity')) >= 8
    || Math.abs(metricDelta(before, after, 'awareness')) >= 10
    || Math.abs(metricDelta(before, after, 'attention')) >= 10
    || Math.abs(metricDelta(before, after, 'entropy')) >= 5
    || affinityTotal >= 3
    || additions.some(addition => addition.kind === 'trait' || addition.kind === 'institution');
  return isMajor ? 'major' : 'routine';
}

export function buildDecisionConsequence(eventId: string, before: DecisionSnapshot, after: DecisionSnapshot, additions: ReadonlyArray<DecisionAddition>): DecisionConsequence {
  const profile = consequenceProfileFor(eventId, additions);
  const tags = genericTags(before, after, additions);
  for (const tag of profile?.tags ?? []) addUnique(tags, tag);
  return {
    significance: significance(eventId, before, after, additions, profile?.significance),
    tags,
    transitions: transitions(before, after),
    signatureProfile: profile?.id ?? '',
  };
}
```

- [ ] **Step 6: Extend decision snapshots and feedback**

In `public/game/src/game/decision-feedback.ts`, import `civilizationDramaPhase` and `buildDecisionConsequence`, then extend `DecisionSnapshot` with:

```typescript
  dramaPhaseId: 0 | 1 | 2 | 3 | 4;
  era: number;
  dominantPath: string;
  endgameStates: string[];
  entropyBand: number;
```

Add these fields in `captureDecisionSnapshot`:

```typescript
    dramaPhaseId: civilizationDramaPhase(civ).id,
    era: civ.era,
    dominantPath: civ.pathState.dominantPath,
    endgameStates: [...(civ.pathState.endgameStates ?? [])],
    entropyBand: Math.min(4, Math.floor(Math.max(0, Math.min(100, civ.tactical.entropy)) / 25)),
```

Before returning from `buildDecisionFeedback`, compute:

```typescript
  const consequence = buildDecisionConsequence(event.id, before, after, additionsList);
```

and include `consequence` in the returned object. Preserve all existing metric/affinity/addition/tone logic unchanged.

- [ ] **Step 7: Run semantic tests and full regression**

Run: `npm test -- --test-name-pattern="signature catalog|generic consequence|significance rules|decision feedback"`

Expected: PASS.

Run: `npm test`

Expected: all tests pass; no balance test changes.

- [ ] **Step 8: Commit**

```bash
git add public/game/src/game/types.ts public/game/src/game/consequence-profiles.ts public/game/src/game/decision-consequences.ts public/game/src/game/decision-feedback.ts public/game/tests/core.test.mjs public/game/dist/game
git commit -m "feat(game): classify decision consequences"
```

### Task 3: Add deterministic, save-compatible narrative world memory

**Files:**
- Create: `public/game/src/game/world-memory.ts`
- Modify: `public/game/tests/core.test.mjs`

- [ ] **Step 1: Write failing world-memory tests**

Add:

```javascript
import { applyWorldMemory, emptyWorldMemory, sanitizeWorldMemory } from '../dist/game/world-memory.js';
```

Append:

```javascript
function feedbackForMemory({ sequence = 1, eventId = 'neutral', significance = 'major', tags = ['urban_growth'], signatureProfile = '' } = {}) {
  return {
    sequence, eventId, eventTitle: eventId, choiceLabel: 'Resolve', tone: 'mixed', metrics: [], affinities: [], additions: [],
    consequence: { significance, tags, transitions: {}, signatureProfile },
  };
}

test('old or malformed visual memory sanitizes without touching the civilization', () => {
  assert.deepEqual(sanitizeWorldMemory(undefined), emptyWorldMemory());
  const malformed = { version: 99, sequence: -4, marks: 'bad', scars: [{ domain: 'reality', motif: '', strength: 99 }] };
  assert.deepEqual(sanitizeWorldMemory(malformed), emptyWorldMemory());
  const civ = GameEngine.createCivilizationForTest(12001);
  civ.stats.stability = 73;
  const before = structuredClone(civ);
  civ.visualMemory = sanitizeWorldMemory({ version: 1, sequence: 3, marks: [{ domain:'social',motif:'unrest',strength:2,sourceEventId:'x',createdAtSequence:2,anchor01:1.7,repairable:true }], scars: [] });
  assert.equal(civ.stats.stability, before.stats.stability);
  assert.equal(civ.visualMemory.marks[0].anchor01, 1);
});

test('world memory coalesces six mark domains and three scar domains deterministically', () => {
  const seed = 12002;
  let memory = emptyWorldMemory();
  const cases = [
    ['urban_growth','built_environment'], ['religious_shift','identity'], ['surveillance','control'],
    ['civil_unrest','social'], ['ecological_damage','ecology'], ['reality_damage','reality'],
  ];
  for (const [tag, domain] of cases) {
    memory = applyWorldMemory(seed, memory, feedbackForMemory({ eventId:`event:${tag}`, tags:[tag] }));
    assert.ok(memory.marks.some(mark => mark.domain === domain));
  }
  assert.equal(memory.marks.length, 6);
  const anchor = memory.marks.find(mark => mark.domain === 'built_environment').anchor01;
  memory = applyWorldMemory(seed, memory, feedbackForMemory({ eventId:'event:growth-2', tags:['technological_growth'] }));
  assert.equal(memory.marks.length, 6);
  assert.equal(memory.marks.find(mark => mark.domain === 'built_environment').anchor01, anchor, 'same-domain transformations preserve their anchor');

  for (const [eventId, profile] of [
    ['entropy_crisis_25','crisis:entropy_25'],
    ['apotheosis_debt_to_the_unborn','apotheosis:debt'],
    ['apotheosis_the_replacement_part','apotheosis:replacement'],
  ]) memory = applyWorldMemory(seed, memory, feedbackForMemory({ eventId, significance:'turning_point', tags:['reality_damage'], signatureProfile:profile }));
  assert.equal(memory.scars.length, 3);
  assert.equal(new Set(memory.scars.map(scar => scar.domain)).size, 3);
});

test('same-domain scars evolve and Stabilize repairs at most one non-scar mark', () => {
  const seed = 12003;
  let memory = emptyWorldMemory();
  memory = applyWorldMemory(seed, memory, feedbackForMemory({ eventId:'entropy_crisis_25', significance:'turning_point', tags:['reality_damage'], signatureProfile:'crisis:entropy_25' }));
  const firstScar = structuredClone(memory.scars[0]);
  memory = applyWorldMemory(seed, memory, feedbackForMemory({ eventId:'entropy_crisis_50', significance:'turning_point', tags:['reality_damage'], signatureProfile:'crisis:entropy_50' }));
  assert.equal(memory.scars.length, 1);
  assert.equal(memory.scars[0].domain, 'reality');
  assert.equal(memory.scars[0].anchor01, firstScar.anchor01);
  assert.equal(memory.scars[0].evolution, firstScar.evolution + 1);

  memory = applyWorldMemory(seed, memory, feedbackForMemory({ eventId:'damage', tags:['civil_unrest'] }));
  const beforeMarks = memory.marks.length;
  const scarsBefore = structuredClone(memory.scars);
  memory = applyWorldMemory(seed, memory, feedbackForMemory({ eventId:'tactical:stabilize', tags:['stabilization','containment'] }), { repair: true });
  assert.ok(memory.marks.length >= beforeMarks - 1 && memory.marks.length <= beforeMarks);
  assert.deepEqual(memory.scars, scarsBefore, 'Stabilize must never erase or weaken scars');
});

test('visual memory cannot change harvest, depth, or progression calculations', () => {
  const civ = GameEngine.createCivilizationForTest(12004);
  civ.development = 420; civ.era = 2; civ.eventChoices = 8; civ.stats.stability = 64; civ.tactical.entropy = 43;
  const beforeHarvest = calculateHarvest(civ, false, GameEngine.baseBonuses());
  const beforeDepth = cultivationDepth(civ);
  civ.visualMemory = {
    version:1, sequence:99,
    marks:[{domain:'reality',motif:'fracture',strength:3,sourceEventId:'x',createdAtSequence:1,anchor01:.5,repairable:true}],
    scars:[{domain:'reality',motif:'breach',strength:3,sourceEventId:'y',createdAtSequence:2,anchor01:.7,evolution:4}],
  };
  assert.deepEqual(calculateHarvest(civ, false, GameEngine.baseBonuses()), beforeHarvest);
  assert.equal(cultivationDepth(civ), beforeDepth);
});
```

Use the existing `calculateHarvest` signature in the repository if its third argument differs; the assertion must compare the same authoritative function before/after setting only `visualMemory`.

- [ ] **Step 2: Run targeted tests and verify red**

Run: `npm test -- --test-name-pattern="visual memory|world memory|same-domain scars"`

Expected: FAIL because `world-memory.js` does not exist.

- [ ] **Step 3: Implement the reducer**

Create `public/game/src/game/world-memory.ts`:

```typescript
import { consequenceProfileById } from './consequence-profiles.js';
import type { ConsequenceTag, DecisionFeedback, MemoryDomain, ScarDomain, WorldMemoryMark, WorldMemoryState, WorldScar } from './types.js';

export const MAX_MEMORY_MARKS = 6;
export const MAX_WORLD_SCARS = 3;

const MEMORY_DOMAINS: ReadonlyArray<MemoryDomain> = ['built_environment','identity','control','social','ecology','reality'];
const SCAR_DOMAINS: ReadonlyArray<ScarDomain> = ['reality','civilization','identity'];

export function emptyWorldMemory(): WorldMemoryState {
  return { version: 1, sequence: 0, marks: [], scars: [] };
}

function strength(value: unknown): 1 | 2 | 3 | null {
  const n = Number(value);
  return n === 1 || n === 2 || n === 3 ? n : null;
}

function finiteSequence(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
}

function cleanMark(value: unknown): WorldMemoryMark | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (!MEMORY_DOMAINS.includes(raw.domain as MemoryDomain)) return null;
  const s = strength(raw.strength); const seq = finiteSequence(raw.createdAtSequence);
  if (!s || seq === null || typeof raw.motif !== 'string' || !raw.motif || typeof raw.sourceEventId !== 'string') return null;
  const anchor = Number(raw.anchor01); if (!Number.isFinite(anchor)) return null;
  return {
    domain: raw.domain as MemoryDomain, motif: raw.motif, strength: s, sourceEventId: raw.sourceEventId,
    createdAtSequence: seq, anchor01: Math.max(0, Math.min(1, anchor)), repairable: raw.repairable === true,
    ...(raw.repaired === true ? { repaired: true } : {}),
  };
}

function cleanScar(value: unknown): WorldScar | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (!SCAR_DOMAINS.includes(raw.domain as ScarDomain)) return null;
  const s = strength(raw.strength); const seq = finiteSequence(raw.createdAtSequence); const evolution = finiteSequence(raw.evolution);
  if (!s || seq === null || evolution === null || typeof raw.motif !== 'string' || !raw.motif || typeof raw.sourceEventId !== 'string') return null;
  const anchor = Number(raw.anchor01); if (!Number.isFinite(anchor)) return null;
  return { domain: raw.domain as ScarDomain, motif: raw.motif, strength: s, sourceEventId: raw.sourceEventId, createdAtSequence: seq, anchor01: Math.max(0, Math.min(1, anchor)), evolution };
}

export function sanitizeWorldMemory(value: unknown): WorldMemoryState {
  if (!value || typeof value !== 'object') return emptyWorldMemory();
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1) return emptyWorldMemory();
  const sequence = finiteSequence(raw.sequence); if (sequence === null) return emptyWorldMemory();
  const marks = Array.isArray(raw.marks) ? raw.marks.map(cleanMark).filter((item): item is WorldMemoryMark => !!item) : [];
  const scars = Array.isArray(raw.scars) ? raw.scars.map(cleanScar).filter((item): item is WorldScar => !!item) : [];
  const marksByDomain = new Map<MemoryDomain, WorldMemoryMark>();
  for (const mark of marks) {
    const current = marksByDomain.get(mark.domain);
    if (!current || mark.strength > current.strength || (mark.strength === current.strength && mark.createdAtSequence > current.createdAtSequence)) marksByDomain.set(mark.domain, mark);
  }
  const scarsByDomain = new Map<ScarDomain, WorldScar>();
  for (const scar of scars) {
    const current = scarsByDomain.get(scar.domain);
    if (!current || scar.evolution > current.evolution || (scar.evolution === current.evolution && scar.strength > current.strength)) scarsByDomain.set(scar.domain, scar);
  }
  return { version: 1, sequence, marks: [...marksByDomain.values()].slice(0, MAX_MEMORY_MARKS), scars: [...scarsByDomain.values()].slice(0, MAX_WORLD_SCARS) };
}

function hash32(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

export function memoryAnchor01(seed: number, domain: string, sourceEventId: string, sequence: number): number {
  return hash32(`${Math.trunc(seed)}|${domain}|${sourceEventId}|${Math.trunc(sequence)}`) / 0xffffffff;
}

function genericMemory(tags: ReadonlyArray<ConsequenceTag>): { domain: MemoryDomain; motif: string; strength: 1 | 2 | 3; repairable: boolean } | null {
  if (tags.includes('reality_damage')) return { domain:'reality', motif:'fracture', strength:2, repairable:true };
  if (tags.includes('mass_casualty')) return { domain:'social', motif:'civic_ruin', strength:3, repairable:true };
  if (tags.includes('civil_unrest')) return { domain:'social', motif:'unrest', strength:2, repairable:true };
  if (tags.includes('ecological_damage')) return { domain:'ecology', motif:'blight', strength:2, repairable:true };
  if (tags.includes('surveillance')) return { domain:'control', motif:'surveillance', strength:2, repairable:true };
  if (tags.includes('religious_shift') || tags.includes('path_shift')) return { domain:'identity', motif:'path_monument', strength:2, repairable:false };
  if (tags.includes('institution_growth')) return { domain:'built_environment', motif:'civic_landmark', strength:2, repairable:false };
  if (tags.includes('technological_growth')) return { domain:'built_environment', motif:'advanced_district', strength:2, repairable:false };
  if (tags.includes('urban_growth')) return { domain:'built_environment', motif:'growth_district', strength:1, repairable:false };
  if (tags.includes('urban_decline')) return { domain:'built_environment', motif:'damaged_district', strength:2, repairable:true };
  return null;
}

function upsertMark(memory: WorldMemoryState, seed: number, eventId: string, descriptor: { domain: MemoryDomain; motif: string; strength: 1 | 2 | 3; repairable: boolean }): void {
  const current = memory.marks.find(mark => mark.domain === descriptor.domain);
  if (!current) {
    memory.marks.push({ ...descriptor, sourceEventId:eventId, createdAtSequence:memory.sequence, anchor01:memoryAnchor01(seed, descriptor.domain, eventId, memory.sequence) });
    memory.marks = memory.marks.slice(0, MAX_MEMORY_MARKS);
    return;
  }
  if (descriptor.strength < current.strength) return;
  current.motif = descriptor.motif;
  current.strength = descriptor.strength;
  current.sourceEventId = eventId;
  current.createdAtSequence = memory.sequence;
  current.repairable = descriptor.repairable;
  delete current.repaired;
}

function upsertScar(memory: WorldMemoryState, seed: number, eventId: string, descriptor: { domain: ScarDomain; motif: string; strength: 1 | 2 | 3 }): void {
  const current = memory.scars.find(scar => scar.domain === descriptor.domain);
  if (!current) {
    memory.scars.push({ ...descriptor, sourceEventId:eventId, createdAtSequence:memory.sequence, anchor01:memoryAnchor01(seed, descriptor.domain, eventId, memory.sequence), evolution:0 });
    memory.scars = memory.scars.slice(0, MAX_WORLD_SCARS);
    return;
  }
  current.strength = Math.max(current.strength, descriptor.strength) as 1 | 2 | 3;
  current.motif = descriptor.motif;
  current.sourceEventId = eventId;
  current.createdAtSequence = memory.sequence;
  current.evolution += 1;
}

function repairOne(memory: WorldMemoryState): void {
  const domainOrder: ReadonlyArray<MemoryDomain> = ['reality','social','built_environment'];
  for (const domain of domainOrder) {
    const candidates = memory.marks.filter(mark => mark.domain === domain && mark.repairable).sort((a,b) => b.strength - a.strength || a.createdAtSequence - b.createdAtSequence);
    const mark = candidates[0]; if (!mark) continue;
    if (mark.strength === 1) memory.marks = memory.marks.filter(item => item !== mark);
    else { mark.strength = (mark.strength - 1) as 1 | 2; mark.repaired = true; }
    return;
  }
}

export function applyWorldMemory(seed: number, value: unknown, feedback: DecisionFeedback, options: { repair?: boolean } = {}): WorldMemoryState {
  const memory = sanitizeWorldMemory(value);
  memory.sequence += 1;
  const profile = consequenceProfileById(feedback.consequence.signatureProfile);
  if (feedback.consequence.significance !== 'routine') {
    const descriptor = profile?.memory ?? genericMemory(feedback.consequence.tags);
    if (descriptor) upsertMark(memory, seed, feedback.eventId, descriptor);
    if (profile?.scar) upsertScar(memory, seed, feedback.eventId, profile.scar);
  }
  if (options.repair) repairOne(memory);
  return memory;
}
```

- [ ] **Step 4: Run memory tests and the full suite**

Run: `npm test -- --test-name-pattern="visual memory|world memory|same-domain scars"`

Expected: PASS.

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/game/src/game/world-memory.ts public/game/tests/core.test.mjs public/game/dist/game/world-memory.js
git commit -m "feat(game): persist civilization visual memory"
```

---

### Task 4: Wire semantic memory into completed decisions without touching balance

**Files:**
- Modify: `public/game/src/game/engine.ts`
- Modify: `public/game/tests/core.test.mjs`

- [ ] **Step 1: Write failing engine-wiring tests**

Append:

```javascript
test('completed decisions advance visual-memory sequence while pressure-only feedback does not', () => {
  const engine = freshEngine();
  engine.startCivilization(13001);
  const civ = engine.state.civilization;
  assert.equal(civ.visualMemory, undefined);
  engine.forceEvent('synthetic_saint');
  engine.chooseEvent(0);
  assert.equal(civ.visualMemory.sequence, 1);
  const sequenceAfterChoice = civ.visualMemory.sequence;
  civ.tactical.entropy = 24.9;
  engine.tick(1);
  assert.equal(civ.visualMemory.sequence, sequenceAfterChoice, 'pressure threshold feedback is not a completed player decision');
});

test('reserve and tactical actions use the same visual-memory reducer, and Stabilize repairs one mark', () => {
  const engine = freshEngine();
  engine.startCivilization(13002);
  const civ = engine.state.civilization;
  civ.visualMemory = {
    version:1, sequence:4,
    marks:[{domain:'social',motif:'unrest',strength:2,sourceEventId:'damage',createdAtSequence:3,anchor01:.4,repairable:true}],
    scars:[{domain:'reality',motif:'breach',strength:2,sourceEventId:'crisis',createdAtSequence:2,anchor01:.6,evolution:1}],
  };
  civ.stats.stability = 60; civ.stats.attention = 30; civ.tactical.entropy = 30; civ.tactical.controlCapacity = 3;
  const scars = structuredClone(civ.visualMemory.scars);
  assert.equal(engine.useTacticalAction('stabilize'), true);
  assert.equal(civ.visualMemory.sequence, 5);
  assert.equal(civ.visualMemory.marks[0].strength, 1);
  assert.deepEqual(civ.visualMemory.scars, scars);
});

test('an old v4 save without visualMemory remains loadable and gains memory only after the next decision', () => {
  const seedEngine = freshEngine(); seedEngine.startCivilization(13003);
  const oldState = structuredClone(seedEngine.state); delete oldState.civilization.visualMemory;
  const storage = { value: JSON.stringify(oldState), getItem(){ return this.value; }, setItem(_k,v){ this.value=v; }, removeItem(){ this.value=''; } };
  const engine = new GameEngine({ storage, autosave: true });
  assert.equal(engine.state.civilization.visualMemory, undefined);
  engine.forceEvent('synthetic_saint'); engine.chooseEvent(0);
  assert.equal(engine.state.civilization.visualMemory.version, 1);
  assert.equal(engine.state.saveVersion, oldState.saveVersion);
});
```

- [ ] **Step 2: Run targeted tests and verify red**

Run: `npm test -- --test-name-pattern="visual-memory sequence|same visual-memory reducer|old v4 save"`

Expected: FAIL because the engine does not yet update memory.

- [ ] **Step 3: Add one engine helper and use it only after completed actions**

Import:

```typescript
import { applyWorldMemory } from './world-memory.js';
```

Add this private method beside `post`/`emit` helpers:

```typescript
  private publishCompletedDecision(civ: Civilization, feedback: DecisionFeedback, repair = false): void {
    this.decisionFeedback = feedback;
    this.worldImpulse = feedback;
    civ.visualMemory = applyWorldMemory(civ.seed, civ.visualMemory, feedback, { repair });
  }
```

In `useRunIntervention`, replace the two assignments to `decisionFeedback`/`worldImpulse` with:

```typescript
    const feedback = buildDecisionFeedback(
      ++this.feedbackSequence,
      { id: `reserve:${id}`, title: definition.title },
      { label },
      before,
      captureDecisionSnapshot(civ),
    );
    this.publishCompletedDecision(civ, feedback);
```

In `useTacticalAction`, replace the two assignments with:

```typescript
    const feedback = buildDecisionFeedback(
      ++this.feedbackSequence,
      { id: `tactical:${id}`, title: outcome.title },
      { label: outcome.label },
      before,
      captureDecisionSnapshot(civ),
    );
    this.publishCompletedDecision(civ, feedback, id === 'stabilize');
```

In `chooseEvent`, replace the two assignments with:

```typescript
    const feedback = buildDecisionFeedback(
      ++this.feedbackSequence,
      event,
      choice,
      before,
      captureDecisionSnapshot(civ),
    );
    this.publishCompletedDecision(civ, feedback);
```

Do NOT route the `tick()` Entropy-threshold `worldImpulse` through this helper. It is a queued pressure notification, not a completed decision; the resolved Entropy-crisis event will own the persistent scar.

- [ ] **Step 4: Verify wiring and no balance drift**

Run: `npm test -- --test-name-pattern="visual-memory sequence|same visual-memory reducer|old v4 save|Stabilize spends|survival curve|first-run"`

Expected: PASS.

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add public/game/src/game/engine.ts public/game/tests/core.test.mjs public/game/dist/game/engine.js
git commit -m "feat(game): wire consequences into world memory"
```

---

### Task 5: Derive path identity tiers and institution landmarks

**Files:**
- Create: `public/game/src/render/identity.ts`
- Modify: `public/game/src/render/world-presentation.ts`
- Modify: `public/game/tests/presentation.test.mjs`

- [ ] **Step 1: Write failing identity tests**

Add:

```javascript
import { institutionLandmarks, pathIdentity, identitySignature } from '../dist/render/identity.js';
```

Append:

```javascript
test('all ten paths expose distinct dominant silhouette identities', () => {
  const descriptors = new Set();
  for (const pathId of PATH_IDS) {
    const civ = GameEngine.createCivilizationForTest(14000 + descriptors.size);
    civ.pathState.affinity[pathId] = 8;
    civ.pathState.dominantPath = pathId;
    const identity = pathIdentity(civ);
    assert.equal(identity.pathId, pathId);
    assert.equal(identity.tier, 2);
    descriptors.add(`${identity.landmark}|${identity.motif}|${identity.crown}`);
  }
  assert.equal(descriptors.size, 10);
});

test('signature consolidation or endgame upgrades dominant identity to tier 3', () => {
  const civ = GameEngine.createCivilizationForTest(14011);
  civ.pathState.dominantPath = 'machine_faith'; civ.pathState.affinity.machine_faith = 8;
  assert.equal(pathIdentity(civ).tier, 2);
  civ.pathState.completedEvents.push('synod_of_the_second_engine');
  assert.equal(pathIdentity(civ).tier, 3);
});

test('the three current institutions expose distinct landmark descriptors', () => {
  const civ = GameEngine.createCivilizationForTest(14012);
  civ.institutions.push('Lunar Ministry','Ministry Of Sanity','Consensus Office');
  const landmarks = institutionLandmarks(civ);
  assert.equal(landmarks.length, 3);
  assert.equal(new Set(landmarks.map(item => item.kind)).size, 3);
});
```

- [ ] **Step 2: Run targeted tests and verify red**

Run: `npm test -- --test-name-pattern="silhouette identities|tier 3|institution.*landmark"`

Expected: FAIL because `identity.js` does not exist.

- [ ] **Step 3: Implement identity descriptors**

Create `public/game/src/render/identity.ts`:

```typescript
import type { Civilization } from '../game/types.js';
import { CivilizationPaths, PATH_IDS } from '../game/paths.js';

export type IdentityTier = 0 | 1 | 2 | 3;
export interface PathIdentityDescriptor { pathId: string; tier: IdentityTier; motif: string; landmark: string; crown: string; }
export interface InstitutionLandmarkDescriptor { institution: string; kind: 'lunar_relay' | 'sanity_dome' | 'consensus_hall'; }

const PATH_VISUALS: Record<string, Omit<PathIdentityDescriptor,'pathId'|'tier'>> = {
  machine_faith:{motif:'ritual_geometry',landmark:'engine_spire',crown:'luminous_core'},
  collective_mind:{motif:'linked_nodes',landmark:'neural_bridge',crown:'synchronized_cluster'},
  temporal_dominion:{motif:'chronal_rings',landmark:'chronal_pylon',crown:'offset_ring'},
  reality_engineering:{motif:'lattice_frame',landmark:'constraint_tower',crown:'geometric_frame'},
  biological_transcendence:{motif:'organic_branching',landmark:'chitin_spire',crown:'living_crown'},
  cosmic_resistance:{motif:'defense_chevrons',landmark:'shield_bastion',crown:'blackout_shield'},
  bureaucratic_singularity:{motif:'administrative_grid',landmark:'admin_monolith',crown:'ordered_block'},
  post_mortal_civilization:{motif:'continuity_halo',landmark:'data_mausoleum',crown:'continuity_beacon'},
  void_communion:{motif:'negative_space',landmark:'void_obelisk',crown:'absence_well'},
  recursive_simulation:{motif:'nested_frames',landmark:'recursive_tower',crown:'nested_crown'},
};

const CONSOLIDATION_EVENT: Record<string,string> = {
  machine_faith:'synod_of_the_second_engine', collective_mind:'unanimous_afternoon', temporal_dominion:'sovereign_hour',
  reality_engineering:'department_of_permitted_physics', biological_transcendence:'pollinators_of_the_state', cosmic_resistance:'blackout_doctrine',
  bureaucratic_singularity:'ministry_of_final_forms', post_mortal_civilization:'immortal_electorate', void_communion:'embassy_at_the_edge', recursive_simulation:'recursion_registry',
};

export function pathIdentity(civ: Civilization): PathIdentityDescriptor {
  const dominant = civ.pathState.dominantPath;
  let pathId = dominant;
  let tier: IdentityTier = dominant ? 2 : 0;
  if (!pathId) {
    pathId = [...PATH_IDS].sort((a,b) => CivilizationPaths.affinity(civ,b) - CivilizationPaths.affinity(civ,a))[0] ?? '';
    if (!pathId || CivilizationPaths.affinity(civ,pathId) < 2) return { pathId:'', tier:0, motif:'unaligned', landmark:'none', crown:'none' };
    tier = 1;
  }
  if (dominant && (civ.pathState.completedEvents.includes(CONSOLIDATION_EVENT[dominant] ?? '') || (civ.pathState.endgameStates ?? []).length > 0)) tier = 3;
  const visual = PATH_VISUALS[pathId] ?? { motif:'unaligned', landmark:'none', crown:'none' };
  return { pathId, tier, ...visual };
}

export function institutionLandmarks(civ: Civilization): InstitutionLandmarkDescriptor[] {
  const result: InstitutionLandmarkDescriptor[] = [];
  if (civ.institutions.includes('Lunar Ministry')) result.push({ institution:'Lunar Ministry', kind:'lunar_relay' });
  if (civ.institutions.includes('Ministry Of Sanity')) result.push({ institution:'Ministry Of Sanity', kind:'sanity_dome' });
  if (civ.institutions.includes('Consensus Office')) result.push({ institution:'Consensus Office', kind:'consensus_hall' });
  return result;
}

export function identitySignature(civ: Civilization): string {
  const identity = pathIdentity(civ);
  return `${identity.pathId || 'unaligned'}:${identity.tier}:${identity.landmark}|${institutionLandmarks(civ).map(item => item.kind).join(',')}`;
}
```

- [ ] **Step 4: Add identity to the structural key**

In `world-presentation.ts`, import `identitySignature` and replace the raw dominant/institution-count structural factors with the signature while preserving the other existing factors:

```typescript
    identitySignature(civ),
```

Do not add raw affinity values to the key.

- [ ] **Step 5: Verify identity and structural stability**

Add a test that changes a dominant path from tier 2 to tier 3 and asserts `structuralWorldKey` changes, then changes a live stat within the same 25-point band and asserts the key does not change.

Run: `npm test -- --test-name-pattern="silhouette identities|tier 3|institution.*landmark|structural key"`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add public/game/src/render/identity.ts public/game/src/render/world-presentation.ts public/game/tests/presentation.test.mjs public/game/dist/render
git commit -m "feat(render): derive civilization identity tiers"
```

---

### Task 6: Render persistent marks, scars, and landmarks on cached scenery

**Files:**
- Create: `public/game/src/render/world-memory.ts`
- Modify: `public/game/src/render/world-presentation.ts`
- Modify: `public/game/src/render/world.ts`
- Modify: `public/game/tests/presentation.test.mjs`
- Modify: `public/game/tests/render-smoke.test.mjs`

- [ ] **Step 1: Write failing memory-signature and scenery-layer tests**

Add imports to presentation tests:

```javascript
import { worldMemorySignature } from '../dist/render/world-memory.js';
```

Append:

```javascript
test('world memory signatures change only for saved structural memory', () => {
  const civ = developedCivilizationForPresentation(15001);
  const before = structuralWorldKey(civ, 800);
  civ.visualMemory = { version:1, sequence:1, marks:[{domain:'social',motif:'unrest',strength:2,sourceEventId:'x',createdAtSequence:1,anchor01:.3,repairable:true}], scars:[] };
  const after = structuralWorldKey(civ, 800);
  assert.notEqual(after, before);
  const signature = worldMemorySignature(civ.visualMemory);
  civ.visualMemory.sequence = 99;
  assert.equal(worldMemorySignature(civ.visualMemory), signature, 'sequence alone is not structural');
});
```

Add a render-smoke test using the existing three recording contexts: populate one mark and one scar, render one frame, and assert the scenery bucket gains primitives while the static bucket does not. Then pan and assert the existing strip/full equivalence test still passes with memory enabled.

- [ ] **Step 2: Run targeted tests and verify red**

Run: `npm test -- --test-name-pattern="world memory signatures|persistent marks|strip redraw"`

Expected: FAIL because render `world-memory.js` does not exist and scenery does not draw memory.

- [ ] **Step 3: Create the render-only world-memory module**

Create `public/game/src/render/world-memory.ts`:

```typescript
import type { Civilization, WorldMemoryMark, WorldMemoryState, WorldScar } from '../game/types.js';
import { sanitizeWorldMemory } from '../game/world-memory.js';
import type { DrawSurface } from './draw-surface.js';
import type { Settlement } from './settlements.js';

export interface MemoryViewBand { from: number; to: number }

export function worldMemorySignature(value: unknown): string {
  const memory = sanitizeWorldMemory(value);
  const marks = memory.marks.map(mark => `${mark.domain}:${mark.motif}:${mark.strength}:${mark.anchor01.toFixed(4)}:${mark.repaired ? 1 : 0}`).sort();
  const scars = memory.scars.map(scar => `${scar.domain}:${scar.motif}:${scar.strength}:${scar.anchor01.toFixed(4)}:${scar.evolution}`).sort();
  return `${marks.join(';')}|${scars.join(';')}`;
}

function anchorX(anchor01: number, worldWidth: number, settlements: ReadonlyArray<Settlement>): number {
  const target = Math.max(0, Math.min(worldWidth, anchor01 * worldWidth));
  if (!settlements.length) return target;
  return [...settlements].sort((a,b) => Math.abs(a.centerX - target) - Math.abs(b.centerX - target))[0]!.centerX;
}

function visible(x: number, view: MemoryViewBand, slack = 90): boolean { return x >= view.from - slack && x <= view.to + slack; }

function drawMark(surface: DrawSurface, mark: WorldMemoryMark, x: number, ground: number, accent: number): void {
  const s = mark.strength; const alpha = mark.repaired ? .35 : .62;
  if (mark.domain === 'built_environment') { surface.fillStyle(accent, alpha*.35).fillRect(x-8-s*4, ground-18-s*10, 16+s*8, 18+s*10); surface.lineStyle(1.2,accent,alpha).strokeRect(x-10-s*4,ground-20-s*10,20+s*8,20+s*10); }
  else if (mark.domain === 'identity') { for(let i=0;i<s+1;i++) surface.lineStyle(1.2,accent,alpha).strokeCircle(x,ground-22-s*10,8+i*7); }
  else if (mark.domain === 'control') { surface.lineStyle(1.2,accent,alpha).line(x,ground-8,x,ground-55-s*9); surface.strokeCircle(x,ground-60-s*9,7+s*3); }
  else if (mark.domain === 'social') { for(let i=0;i<3+s;i++) surface.fillStyle(0xee6973,alpha*.65).fillCircle(x-18+i*8,ground-4-(i%2)*3,2.2); }
  else if (mark.domain === 'ecology') { for(let i=0;i<2+s;i++) surface.lineStyle(1.1,0x8b7358,alpha).line(x+i*7-10,ground,x+i*9-16,ground-18-s*5); }
  else { surface.lineStyle(1.5,0xee6973,alpha).line(x-12,ground-50-s*9,x+4,ground-25); surface.line(x+4,ground-25,x-8,ground-6); }
}

function drawScar(surface: DrawSurface, scar: WorldScar, x: number, ground: number, accent: number): void {
  const s = scar.strength; const alpha = .55 + s*.1;
  if (scar.domain === 'reality') for(let i=0;i<3+s+Math.min(2,scar.evolution);i++) surface.lineStyle(1.4+(i%2),0xee6973,alpha).line(x-24+i*9,ground-86,x-12+i*7,ground-8);
  else if (scar.domain === 'civilization') { surface.fillStyle(0x161019,.92).fillRect(x-28-s*7,ground-12-s*8,56+s*14,12+s*8); surface.lineStyle(1.3,0xee6973,alpha).line(x-28-s*7,ground-12-s*8,x+28+s*7,ground); }
  else { surface.lineStyle(2,accent,alpha).strokeCircle(x,ground-45-s*10,16+s*7); surface.lineStyle(1,accent,alpha*.75).strokeRect(x-12-s*4,ground-57-s*12,24+s*8,24+s*8); }
}

export function drawWorldMemoryScenery(surface: DrawSurface, civ: Civilization, worldWidth: number, ground: number, settlements: ReadonlyArray<Settlement>, accent: number, view: MemoryViewBand): void {
  const memory: WorldMemoryState = sanitizeWorldMemory(civ.visualMemory);
  for (const mark of memory.marks) { const x = anchorX(mark.anchor01, worldWidth, settlements); if (visible(x,view)) drawMark(surface,mark,x,ground,accent); }
  for (const scar of memory.scars) { const x = anchorX(scar.anchor01, worldWidth, settlements); if (visible(x,view,120)) drawScar(surface,scar,x,ground,accent); }
}

export function drawWorldMemoryAccents(surface: DrawSurface, civ: Civilization, worldWidth: number, ground: number, settlements: ReadonlyArray<Settlement>, accent: number, view: MemoryViewBand, time: number, reducedMotion: boolean): void {
  const memory = sanitizeWorldMemory(civ.visualMemory);
  const pulse = reducedMotion ? 1 : .65 + Math.sin(time*.002)*.35;
  for (const scar of memory.scars) {
    const x = anchorX(scar.anchor01, worldWidth, settlements); if (!visible(x,view,120)) continue;
    if (scar.domain === 'reality') surface.lineStyle(1,0xee6973,.12+.12*pulse).strokeCircle(x,ground-42,22+scar.strength*8);
    if (scar.domain === 'identity') surface.lineStyle(1,accent,.1+.12*pulse).strokeCircle(x,ground-52,28+scar.strength*7);
  }
}
```

- [ ] **Step 4: Add structural memory signature**

Import `worldMemorySignature` in `world-presentation.ts` and add this structural component:

```typescript
    worldMemorySignature(civ.visualMemory),
```

Do not include `visualMemory.sequence` directly.

- [ ] **Step 5: Draw memory on the correct canvas**

Import `drawWorldMemoryScenery` and `drawWorldMemoryAccents` into `world.ts`.

At the end of `drawSettlementContent`, after normal structures/roads and before returning, call:

```typescript
  drawWorldMemoryScenery(surface, civ, worldWidth, ground, settlements, presentation.accent, view);
```

At the end of `drawDynamicContent`, after live anomalies and before transient feedback, call:

```typescript
  drawWorldMemoryAccents(surface, scene.civ, snapshot.worldWidth, ground, scene.settlements, presentation.accent, view, animationTime, reducedMotion);
```

- [ ] **Step 6: Verify culling and strip-redraw invariants**

Run: `npm test -- --test-name-pattern="world memory signatures|persistent marks|strip redraw|visible slice"`

Expected: PASS. Existing strip-redraw equivalence and culling tests remain green.

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add public/game/src/render/world-memory.ts public/game/src/render/world-presentation.ts public/game/src/render/world.ts public/game/tests/presentation.test.mjs public/game/tests/render-smoke.test.mjs public/game/dist/render
git commit -m "feat(render): draw persistent civilization memory"
```

---

### Task 7: Replace generic impulses with semantic, reduced-motion-safe consequence presentation

**Files:**
- Create: `public/game/src/render/consequence-presentation.ts`
- Modify: `public/game/src/render/world.ts`
- Modify: `public/game/src/render/world-presentation.ts`
- Modify: `public/game/tests/presentation.test.mjs`
- Modify: `public/game/tests/render-smoke.test.mjs`

- [ ] **Step 1: Write failing descriptor and layer tests**

Add:

```javascript
import { consequenceImpact } from '../dist/render/consequence-presentation.js';
```

Append:

```javascript
test('semantic consequence presentation distinguishes tactical actions and significance', () => {
  const base = {
    sequence:1, eventTitle:'', choiceLabel:'', tone:'mixed', metrics:[], affinities:[], additions:[],
    consequence:{ significance:'routine', tags:[], transitions:{}, signatureProfile:'' },
  };
  assert.equal(consequenceImpact({ ...base, eventId:'tactical:stabilize' }, false).kind, 'containment');
  assert.equal(consequenceImpact({ ...base, eventId:'tactical:accelerate' }, false).kind, 'time_streak');
  assert.equal(consequenceImpact({ ...base, eventId:'tactical:probe' }, false).kind, 'scan');
  assert.equal(consequenceImpact({ ...base, eventId:'tactical:vent' }, false).kind, 'vent');
  const major = consequenceImpact({ ...base, eventId:'x', consequence:{ significance:'major', tags:['civil_unrest'], transitions:{}, signatureProfile:'' } }, false);
  const turning = consequenceImpact({ ...base, eventId:'x', consequence:{ significance:'turning_point', tags:['civil_unrest'], transitions:{}, signatureProfile:'' } }, false);
  assert.equal(major.kind, 'unrest');
  assert.ok(turning.intensity > major.intensity);
});

test('reduced motion shortens impacts without deleting semantic information', () => {
  const feedback = {
    sequence:2, eventId:'entropy_crisis_50', eventTitle:'', choiceLabel:'', tone:'negative', metrics:[], affinities:[], additions:[],
    consequence:{ significance:'turning_point', tags:['reality_damage'], transitions:{}, signatureProfile:'crisis:entropy_50' },
  };
  const full = consequenceImpact(feedback, false);
  const reduced = consequenceImpact(feedback, true);
  assert.equal(reduced.kind, full.kind);
  assert.equal(reduced.variant, full.variant);
  assert.ok(reduced.durationMs >= 250 && reduced.durationMs <= 400);
  assert.ok(full.durationMs >= 900 && full.durationMs <= 1800);
  assert.equal(reduced.staticOnly, true);
});
```

Add a render smoke assertion that a non-null `worldImpulse` produces primitives only in the dynamic context and never forces a scenery redraw by itself.

- [ ] **Step 2: Run targeted tests and verify red**

Run: `npm test -- --test-name-pattern="semantic consequence presentation|reduced motion shortens|worldImpulse"`

Expected: FAIL because the consequence-presentation module does not exist.

- [ ] **Step 3: Create semantic impact descriptors and drawing**

Create `public/game/src/render/consequence-presentation.ts`:

```typescript
import { consequenceProfileById } from '../game/consequence-profiles.js';
import type { DecisionFeedback } from '../game/types.js';
import type { DrawSurface } from './draw-surface.js';
import { hash01 } from './primitives.js';

export type ImpactKind = 'containment' | 'time_streak' | 'scan' | 'vent' | 'fracture' | 'growth' | 'unrest' | 'surveillance' | 'identity' | 'generic';
export interface ConsequenceImpact { kind: ImpactKind; variant: string; intensity: number; durationMs: number; staticOnly: boolean; }

function inferredKind(feedback: DecisionFeedback): ImpactKind {
  if (feedback.eventId === 'tactical:stabilize') return 'containment';
  if (feedback.eventId === 'tactical:accelerate') return 'time_streak';
  if (feedback.eventId === 'tactical:probe') return 'scan';
  if (feedback.eventId === 'tactical:vent') return 'vent';
  const tags = feedback.consequence.tags;
  if (tags.includes('reality_damage') || feedback.eventId.startsWith('entropy_crisis_')) return 'fracture';
  if (tags.includes('civil_unrest') || tags.includes('mass_casualty')) return 'unrest';
  if (tags.includes('surveillance')) return 'surveillance';
  if (tags.includes('religious_shift') || tags.includes('path_shift') || tags.includes('institution_growth')) return 'identity';
  if (tags.includes('urban_growth') || tags.includes('technological_growth')) return 'growth';
  if (tags.includes('containment') || tags.includes('stabilization')) return 'containment';
  return 'generic';
}

export function consequenceImpact(feedback: DecisionFeedback, reducedMotion: boolean): ConsequenceImpact {
  const profile = consequenceProfileById(feedback.consequence.signatureProfile);
  const intensity = feedback.consequence.significance === 'turning_point' ? 1 : feedback.consequence.significance === 'major' ? .72 : .45;
  return {
    kind: inferredKind(feedback),
    variant: profile?.impactVariant ?? inferredKind(feedback),
    intensity,
    durationMs: reducedMotion ? 320 : feedback.consequence.significance === 'turning_point' ? 1800 : feedback.consequence.significance === 'major' ? 1350 : 950,
    staticOnly: reducedMotion,
  };
}

function roleColor(feedback: DecisionFeedback, kind: ImpactKind, accent: number): number {
  if (kind === 'containment') return 0x73e6bd;
  if (kind === 'time_streak') return 0xf2bd63;
  if (kind === 'scan' || kind === 'surveillance') return 0x6bdcf6;
  if (kind === 'vent') return 0x9ed7ff;
  if (kind === 'fracture' || kind === 'unrest') return 0xee6973;
  if (kind === 'identity' || kind === 'growth') return accent;
  return feedback.tone === 'positive' ? 0x73e6bd : feedback.tone === 'negative' ? 0xee6973 : 0xb68cff;
}

export function drawConsequenceImpact(surface: DrawSurface, feedback: DecisionFeedback | null, startTime: number, time: number, width: number, height: number, accent: number, reducedMotion: boolean): void {
  if (!feedback || startTime <= 0) return;
  const impact = consequenceImpact(feedback, reducedMotion);
  const elapsed = time - startTime; if (elapsed < 0 || elapsed >= impact.durationMs) return;
  const progress = impact.staticOnly ? 0 : Math.max(0, Math.min(1, elapsed / impact.durationMs));
  const fade = impact.staticOnly ? .48 : (1 - progress) * (.38 + impact.intensity * .34);
  const color = roleColor(feedback, impact.kind, accent);
  const radius = Math.min(width,height) * (.14 + impact.intensity*.12 + progress*.28);
  const cx = width*.5, cy = height*.54;
  if (impact.kind === 'containment') {
    for(let ring=0;ring<3;ring++) surface.lineStyle(3-ring*.6,color,fade*(1-ring*.16)).strokeCircle(cx,cy,radius*(.72+ring*.2));
  } else if (impact.kind === 'time_streak') {
    for(let i=0;i<7;i++){ const y=height*(.24+i*.085); const shift=impact.staticOnly?0:progress*width*.22; surface.lineStyle(1.2+(i%2),color,fade).line(width*.1+shift,y,width*.72+shift,y); }
  } else if (impact.kind === 'scan' || impact.kind === 'surveillance') {
    const y=impact.staticOnly?cy:height*(.18+progress*.64); surface.lineStyle(2,color,fade).line(width*.12,y,width*.88,y); surface.lineStyle(1,color,fade*.75).strokeCircle(cx,cy,radius*.65);
  } else if (impact.kind === 'vent') {
    for(let i=0;i<6;i++){ const angle=(i/6)*Math.PI*2; surface.lineStyle(1.6,color,fade).line(cx,cy,cx+Math.cos(angle)*radius,cy+Math.sin(angle)*radius); }
  } else if (impact.kind === 'fracture') {
    for(let i=0;i<8;i++){ const x=width*(.18+i*.085); const bend=(hash01(i*31+feedback.sequence)-.5)*width*.07; surface.lineStyle(1.2+(i%2),color,fade).line(x,height*.22,x+bend,height*.78); }
  } else if (impact.kind === 'unrest') {
    for(let i=0;i<12;i++){ const x=width*(.25+hash01(feedback.sequence+i*17)*.5); const y=height*(.48+hash01(feedback.sequence+i*29)*.22); surface.fillStyle(color,fade*.72).fillCircle(x,y,2+impact.intensity*2); }
  } else if (impact.kind === 'growth') {
    for(let i=0;i<6;i++){ const x=width*(.22+i*.11); const top=height*(.58-progress*.18)-i%2*12; surface.lineStyle(1.4,color,fade).line(x,height*.72,x,top); }
  } else if (impact.kind === 'identity') {
    surface.lineStyle(2.4,color,fade).strokeCircle(cx,cy,radius); surface.lineStyle(1.2,color,fade*.8).strokeRect(cx-radius*.42,cy-radius*.42,radius*.84,radius*.84);
  } else {
    surface.lineStyle(2,color,fade).strokeCircle(cx,cy,radius); surface.fillStyle(color,fade*.08).fillCircle(cx,cy,radius*.55);
  }
}
```

- [ ] **Step 4: Make `world.ts` orchestrate the new impact module**

Import `drawConsequenceImpact`. Delete the old `impulseColor` and `drawDecisionImpulse` implementations. Preserve the existing feedback sequence/start-time bookkeeping and replace the final draw call with:

```typescript
      drawConsequenceImpact(surface, feedback, this.feedbackStartTime, time, this.width, this.height, dynamicPresentation.accent, reducedMotion);
```

Keep `decisionImpulseKind`/`entropyThresholdColor` exported from `world-presentation.ts` only until existing compatibility tests are migrated; after those tests use `consequenceImpact`, remove the obsolete functions/imports in the same commit.

- [ ] **Step 5: Verify impact behavior and no input/simulation pause**

Run: `npm test -- --test-name-pattern="semantic consequence presentation|reduced motion shortens|dynamic layer|decision"`

Expected: PASS.

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add public/game/src/render/consequence-presentation.ts public/game/src/render/world.ts public/game/src/render/world-presentation.ts public/game/tests/presentation.test.mjs public/game/tests/render-smoke.test.mjs public/game/dist/render
git commit -m "feat(render): present semantic decision impacts"
```

---

### Task 8: Add renderer-local adaptive quality without hiding critical signals

**Files:**
- Create: `public/game/src/render/quality.ts`
- Modify: `public/game/src/render/world-model.ts`
- Modify: `public/game/src/render/world.ts`
- Modify: `public/game/tests/presentation.test.mjs`
- Modify: `public/game/tests/render-smoke.test.mjs`

- [ ] **Step 1: Write failing quality-controller and budget tests**

Add:

```javascript
import { RenderQualityController, qualityFactors } from '../dist/render/quality.js';
import { applyQualityToLiveSample, MAX_PARTICLES, MAX_HAZE_BANDS, MAX_FRACTURES, MAX_BEACONS } from '../dist/render/world-model.js';
```

Append:

```javascript
test('adaptive quality degrades after 30 hot frames and recovers only after 180 cool frames', () => {
  const controller = new RenderQualityController();
  let now = 6000;
  for (let i=0;i<29;i++) controller.update(25, now += 34);
  assert.equal(controller.tier, 0);
  controller.update(25, now += 34);
  assert.equal(controller.tier, 1);
  now += 5001;
  for (let i=0;i<180;i++) controller.update(10, now += 34);
  assert.equal(controller.tier, 0);
});

test('quality tiers reduce only cosmetic sample work and preserve fracture/beacon signals', () => {
  const sample = { particleCount:150, hazeBands:9, fractureCount:12, beaconCount:10, entropyBand:4 };
  const heavy = applyQualityToLiveSample(sample, 3);
  assert.ok(heavy.particleCount <= 60);
  assert.ok(heavy.hazeBands < 9);
  assert.equal(heavy.fractureCount, 12);
  assert.equal(heavy.beaconCount, 10);
  assert.equal(MAX_PARTICLES,150); assert.equal(MAX_HAZE_BANDS,9); assert.equal(MAX_FRACTURES,12); assert.equal(MAX_BEACONS,10);
  assert.equal(qualityFactors(3).agentFraction, .5);
});
```

- [ ] **Step 2: Run targeted tests and verify red**

Run: `npm test -- --test-name-pattern="adaptive quality|quality tiers"`

Expected: FAIL because `quality.js` and exported budget helpers do not exist.

- [ ] **Step 3: Create the quality controller**

Create `public/game/src/render/quality.ts`:

```typescript
export type RenderQualityTier = 0 | 1 | 2 | 3;
export interface QualityFactors { particleFraction:number; hazeFraction:number; agentFraction:number; ambientLoopFraction:number; }

const FACTORS: Readonly<Record<RenderQualityTier,QualityFactors>> = {
  0:{particleFraction:1,hazeFraction:1,agentFraction:1,ambientLoopFraction:1},
  1:{particleFraction:.75,hazeFraction:.9,agentFraction:.8,ambientLoopFraction:1},
  2:{particleFraction:.55,hazeFraction:.75,agentFraction:.65,ambientLoopFraction:.5},
  3:{particleFraction:.4,hazeFraction:.6,agentFraction:.5,ambientLoopFraction:0},
};

export function qualityFactors(tier: RenderQualityTier): QualityFactors { return FACTORS[tier]; }

function average(values: ReadonlyArray<number>): number { return values.length ? values.reduce((sum,value)=>sum+value,0)/values.length : 0; }

export class RenderQualityController {
  tier: RenderQualityTier = 0;
  private samples: number[] = [];
  private lastChangeMs = 0;

  update(drawCostMs: number, nowMs: number): RenderQualityTier {
    if (Number.isFinite(drawCostMs) && drawCostMs >= 0) { this.samples.push(drawCostMs); while(this.samples.length>180)this.samples.shift(); }
    if (nowMs - this.lastChangeMs < 5000) return this.tier;
    const hot = this.samples.slice(-30);
    if (this.tier < 3 && hot.length === 30 && average(hot) > 24) {
      this.tier = (this.tier + 1) as RenderQualityTier; this.lastChangeMs = nowMs; this.samples.length = 0; return this.tier;
    }
    const cool = this.samples.slice(-180);
    if (this.tier > 0 && cool.length === 180 && average(cool) < 14) {
      this.tier = (this.tier - 1) as RenderQualityTier; this.lastChangeMs = nowMs; this.samples.length = 0;
    }
    return this.tier;
  }

  reset(): void { this.tier = 0; this.samples.length = 0; this.lastChangeMs = 0; }
}
```

- [ ] **Step 4: Export hard budgets and quality-adjust only cosmetic live counts**

In `world-model.ts`, add:

```typescript
import { qualityFactors, type RenderQualityTier } from './quality.js';

export const MAX_PARTICLES = 150;
export const MAX_HAZE_BANDS = 9;
export const MAX_FRACTURES = 12;
export const MAX_BEACONS = 10;
```

Replace literal maxima in `liveWorldSample` with the constants and clamp fractures to `MAX_FRACTURES`. Add:

```typescript
export function applyQualityToLiveSample<T extends ReturnType<typeof liveWorldSample>>(sample: T, tier: RenderQualityTier): T {
  const factors = qualityFactors(tier);
  return {
    ...sample,
    particleCount: Math.max(4, Math.min(MAX_PARTICLES, Math.floor(sample.particleCount * factors.particleFraction))),
    hazeBands: Math.max(2, Math.min(MAX_HAZE_BANDS, Math.ceil(sample.hazeBands * factors.hazeFraction))),
    fractureCount: Math.min(MAX_FRACTURES, sample.fractureCount),
    beaconCount: Math.min(MAX_BEACONS, sample.beaconCount),
  };
}
```

- [ ] **Step 5: Integrate quality into the frame loop without changing simulation speed**

In `world.ts`:

```typescript
import { applyQualityToLiveSample } from './world-model.js';
import { qualityFactors, RenderQualityController, type RenderQualityTier } from './quality.js';
```

Add `qualityTier` to `RenderStats` and the fallback object returned by `startWorldRenderer().stats()`.

Add to `CanvasWorld`:

```typescript
  private quality = new RenderQualityController();
```

Pass `this.quality.tier` into `drawDynamic`. Inside `drawDynamic`, derive:

```typescript
    const dynamicSnapshot = applyQualityToLiveSample({ ...scene.snapshot, ...liveWorldSample(civ, scene.snapshot.stage) }, tier);
```

Pass `qualityFactors(tier).agentFraction` into inhabitant/traffic draw helpers. Limit each cosmetic agent array to `Math.ceil(array.length * agentFraction)`; never reduce construction, fractures, beacons, scars, landmarks, or the current decision impact.

Around the dynamic draw in `CanvasWorld.loop` measure render-only cost:

```typescript
    const drawStart = globalThis.performance?.now?.() ?? time;
    this.renderer.drawDynamic(time, this.scene, civ, scroll, this.tracker, this.engine, this.quality.tier);
    const drawEnd = globalThis.performance?.now?.() ?? drawStart;
    this.quality.update(Math.max(0, drawEnd - drawStart), time);
```

In `destroy()`, call:

```typescript
    this.quality.reset();
```

Do not write the tier to `GameState` and do not alter `engine.state.simulationSpeed`.

- [ ] **Step 6: Add Tier-3 render smoke coverage**

Extend render smoke stubs so a synthetic Tier-3 frame still records fracture/beacon/memory/identity/current-impact primitives while the total cosmetic primitive count is lower than Tier 0. Assert renderer teardown returns `qualityTier: 0` after recreation.

- [ ] **Step 7: Run quality, renderer, and full regressions**

Run: `npm test -- --test-name-pattern="adaptive quality|quality tiers|Tier 3|tears down"`

Expected: PASS.

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add public/game/src/render/quality.ts public/game/src/render/world-model.ts public/game/src/render/world.ts public/game/tests/presentation.test.mjs public/game/tests/render-smoke.test.mjs public/game/dist/render
git commit -m "feat(render): add adaptive visual quality"
```

---

### Task 9: Make all live states and civilization identities visually distinct

**Files:**
- Modify: `public/game/src/render/identity.ts`
- Modify: `public/game/src/render/world-presentation.ts`
- Modify: `public/game/src/render/world.ts`
- Modify: `public/game/tests/presentation.test.mjs`
- Modify: `public/game/tests/render-smoke.test.mjs`

- [ ] **Step 1: Write failing channel-ownership and landmark tests**

Append:

```javascript
test('live presentation exposes distinct primary signals for every authoritative visual state', () => {
  const civ = GameEngine.createCivilizationForTest(17001);
  civ.development = 120;
  const base = worldPresentation(civ).signals;
  const mutate = (fn) => { const copy = structuredClone(civ); fn(copy); return worldPresentation(copy).signals; };
  assert.notEqual(mutate(c=>c.stats.stability=35).structuralStrain, base.structuralStrain);
  assert.notEqual(mutate(c=>c.stats.sanity=35).motionIrregularity, base.motionIrregularity);
  assert.notEqual(mutate(c=>c.stats.awareness=70).outwardObservation, base.outwardObservation);
  assert.notEqual(mutate(c=>c.stats.attention=70).observerPressure, base.observerPressure);
  assert.notEqual(mutate(c=>c.tactical.entropy=70).realityFailure, base.realityFailure);
  assert.notEqual(mutate(c=>c.development=420).activity, base.activity);
});
```

Add a render-smoke test that a dominant Machine Faith capital plus all three institution landmarks adds scenery primitives, then switch to Void Communion and assert a different primitive signature rather than only a different color assignment.

- [ ] **Step 2: Run targeted tests and verify red**

Run: `npm test -- --test-name-pattern="distinct primary signals|Machine Faith capital"`

Expected: FAIL because the named signals/landmark geometry are not complete.

- [ ] **Step 3: Add bounded named live signals**

In `world-presentation.ts`, add this object to the return value:

```typescript
    signals: {
      structuralStrain: danger,
      motionIrregularity: sanityDistortion,
      outwardObservation: awareness,
      observerPressure: attention,
      realityFailure: entropy,
      activity: clamp01((developmentStage(civ) + Math.min(1, civ.development / 560)) / 5),
    },
```

Keep the existing palette and bands. Do not turn raw values into structural-key fields.

- [ ] **Step 4: Move path ambience out of `world.ts` and add tiered landmark geometry**

Move the existing `drawPathMotif` switch unchanged into `identity.ts` as `drawPathAmbience(...)`, then add these exported helpers:

```typescript
import type { DrawSurface } from './draw-surface.js';
import type { Settlement } from './settlements.js';

export function drawIdentityLandmarks(surface: DrawSurface, civ: Civilization, settlements: ReadonlyArray<Settlement>, ground: number, accent: number, view: {from:number;to:number}): void {
  const identity = pathIdentity(civ);
  const capital = [...settlements].sort((a,b)=>b.structures.length-a.structures.length)[0];
  if (capital && identity.tier >= 2 && capital.centerX >= view.from-100 && capital.centerX <= view.to+100) {
    const x = capital.centerX; const top = ground - 70 - identity.tier * 12;
    if (identity.pathId === 'machine_faith') { surface.lineStyle(2,accent,.8).line(x,ground-6,x,top); surface.fillStyle(accent,.65).fillCircle(x,top-7,6+identity.tier); }
    else if (identity.pathId === 'collective_mind') { for(let i=-2;i<=2;i++){surface.fillStyle(accent,.55).fillCircle(x+i*14,top+Math.abs(i)*6,4); if(i<2)surface.lineStyle(1.4,accent,.5).line(x+i*14,top+Math.abs(i)*6,x+(i+1)*14,top+Math.abs(i+1)*6);} }
    else if (identity.pathId === 'temporal_dominion') { for(let r=0;r<3;r++)surface.lineStyle(1.5,accent,.6).strokeCircle(x,top,10+r*8); }
    else if (identity.pathId === 'reality_engineering') { surface.lineStyle(1.8,accent,.65).strokeRect(x-22,top-20,44,44); surface.line(x-22,top+24,x+22,top-20); }
    else if (identity.pathId === 'biological_transcendence') { for(let i=-2;i<=2;i++)surface.lineStyle(2,accent,.55).line(x,ground-5,x+i*13,top+Math.abs(i)*6); }
    else if (identity.pathId === 'cosmic_resistance') { surface.fillStyle(accent,.38).fillTriangle(x-28,top+28,x,top-18,x+28,top+28); surface.lineStyle(2,accent,.7).line(x-34,top+34,x+34,top+34); }
    else if (identity.pathId === 'bureaucratic_singularity') { for(let row=0;row<3;row++)surface.lineStyle(1.4,accent,.55).strokeRect(x-24+row*5,top-18+row*8,48-row*10,20); }
    else if (identity.pathId === 'post_mortal_civilization') { surface.lineStyle(2,accent,.7).strokeCircle(x,top,24); surface.fillStyle(accent,.3).fillRect(x-12,top-34,24,68); }
    else if (identity.pathId === 'void_communion') { surface.fillStyle(0x03040a,.9).fillCircle(x,top,28); surface.lineStyle(2,accent,.65).strokeCircle(x,top,34); }
    else if (identity.pathId === 'recursive_simulation') { for(let r=0;r<4;r++)surface.lineStyle(1.2,accent,.5+.08*r).strokeRect(x-28+r*6,top-24+r*5,56-r*12,48-r*10); }
  }

  for (const landmark of institutionLandmarks(civ)) {
    const index = landmark.kind === 'lunar_relay' ? 0 : landmark.kind === 'sanity_dome' ? 1 : 2;
    const settlement = settlements[Math.min(index,Math.max(0,settlements.length-1))]; if (!settlement) continue;
    const x = settlement.centerX + 20 + index*10; if (x < view.from-80 || x > view.to+80) continue;
    if (landmark.kind === 'lunar_relay') { surface.lineStyle(1.5,accent,.6).line(x,ground-4,x,ground-68); surface.strokeCircle(x+8,ground-72,10); }
    else if (landmark.kind === 'sanity_dome') { surface.lineStyle(1.5,0xb68cff,.55).strokeCircle(x,ground-20,24); surface.fillStyle(0xb68cff,.08).fillCircle(x,ground-20,22); }
    else { for(let i=-2;i<=2;i++){surface.fillStyle(accent,.5).fillCircle(x+i*9,ground-34-Math.abs(i)*5,3); if(i<2)surface.lineStyle(1,accent,.45).line(x+i*9,ground-34-Math.abs(i)*5,x+(i+1)*9,ground-34-Math.abs(i+1)*5);} }
  }
}
```

Update the moved `drawPathAmbience` to accept `tier` and scale the number/alpha of ambient motifs: tier 1 uses roughly half the current marks, tier 2 uses the current count, tier 3 adds one additional ring/line/detail to each motif. Under Tier 3 adaptive quality, pass an `ambientLoopFraction` of `0` so the geometry remains static rather than disappearing.

- [ ] **Step 5: Use live Stability/Sanity channels without structural rebuilds**

In `drawInhabitants`, derive a small deterministic x offset from `presentation.signals.motionIrregularity`:

```typescript
    const irregular = (hash01(pedestrian.seed + Math.trunc(animationTime / 600)) - .5) * 12 * presentation.signals.motionIrregularity;
    const x = settlement.centerX - settlement.radius + travel * settlement.radius * 2 + (reducedMotion ? irregular * .35 : irregular);
```

In dynamic drawing, after lit windows and before inhabitants, add bounded structural-strain accents over at most 12 visible structures:

```typescript
  if (presentation.signals.structuralStrain > .18) {
    let drawn = 0;
    for (const structure of scene.structures) {
      if (drawn >= 12 || structure.x < view.from-20 || structure.x > view.to+20) continue;
      const top = ground - structure.height;
      surface.lineStyle(1,0xee6973,.08 + presentation.signals.structuralStrain*.18)
        .line(structure.x-structure.width*.18,top+structure.height*.25,structure.x+structure.width*.12,top+structure.height*.42);
      drawn++;
    }
  }
```

Awareness beacons, Attention observer pressure, Entropy fractures, and Development density remain the already-existing distinct channels; do not duplicate them with full-screen color washes.

- [ ] **Step 6: Wire landmarks to scenery and ambience to dynamic composition**

In `drawSettlementContent`, call `drawIdentityLandmarks(...)` after base structures and before world-memory scenery. In `drawDynamicContent`, replace the old `drawPathMotif` call with `drawPathAmbience(...)` from `identity.ts` and pass the quality ambient factor.

- [ ] **Step 7: Verify channels, identities, budgets, and reduced motion**

Run: `npm test -- --test-name-pattern="distinct primary signals|silhouette identities|institution.*landmark|reduced motion|agent plan"`

Expected: PASS.

Run: `npm test`

Expected: all tests pass and the 120-agent ceiling remains unchanged.

- [ ] **Step 8: Commit**

```bash
git add public/game/src/render/identity.ts public/game/src/render/world-presentation.ts public/game/src/render/world.ts public/game/tests/presentation.test.mjs public/game/tests/render-smoke.test.mjs public/game/dist/render
git commit -m "feat(render): make civilization state visually legible"
```

---

### Task 10: Add passive Drama Phase transitions and release-level acceptance scenarios

**Files:**
- Modify: `public/game/src/render/consequence-presentation.ts`
- Modify: `public/game/src/render/world.ts`
- Create: `public/game/tests/drama-acceptance.test.mjs`
- Modify: `public/game/tests/render-smoke.test.mjs`

- [ ] **Step 1: Write failing passive-transition smoke coverage**

In render smoke tests, start a renderer with an Emergence civilization, render once, mutate only `development` so the canonical phase becomes Expansion, render again, and assert:

```javascript
assert.equal(engine.state.civilization.visualMemory, undefined, 'renderer-local phase feedback must not write gameplay state');
assert.ok(dynamicCalls.length > baselineDynamicCalls, 'phase transition should add a bounded dynamic cue');
```

The test must not call a game decision; the transition is caused only by passive Development.

- [ ] **Step 2: Add a renderer-local phase transition drawing helper**

Append to `consequence-presentation.ts`:

```typescript
export function drawPhaseTransitionImpact(surface: DrawSurface, from: number, to: number, startTime: number, time: number, width: number, height: number, accent: number, reducedMotion: boolean): void {
  if (to === from || startTime <= 0) return;
  const duration = reducedMotion ? 320 : 1500;
  const elapsed = time - startTime; if (elapsed < 0 || elapsed >= duration) return;
  const progress = reducedMotion ? 0 : Math.max(0,Math.min(1,elapsed/duration));
  const alpha = reducedMotion ? .42 : (1-progress)*.48;
  const rows = Math.max(2,Math.min(6,to+2));
  for(let row=0;row<rows;row++){
    const y=height*(.3+row*.09);
    const span=width*(.22+.1*to);
    surface.lineStyle(1.4+(to-from)*.3,accent,alpha).line(width*.5-span*.5,y,width*.5+span*.5,y);
  }
  surface.lineStyle(2,accent,alpha).strokeCircle(width*.5,height*.54,Math.min(width,height)*(.14+to*.035+progress*.16));
}
```

- [ ] **Step 3: Track phase transitions only inside `CanvasWorld`**

Add fields:

```typescript
  private lastDramaPhaseId = -1;
  private phaseTransitionFrom = -1;
  private phaseTransitionTo = -1;
  private phaseTransitionStart = 0;
```

When a structural key rebuild resolves a new `scene.snapshot.stage`, before replacing the old scene state, update:

```typescript
      const nextPhase = this.scene?.snapshot.stage ?? civilizationDramaPhase(civ).id;
      if (this.lastDramaPhaseId >= 0 && nextPhase !== this.lastDramaPhaseId) {
        this.phaseTransitionFrom = this.lastDramaPhaseId;
        this.phaseTransitionTo = nextPhase;
        this.phaseTransitionStart = time;
      }
      this.lastDramaPhaseId = nextPhase;
```

Import `civilizationDramaPhase` and `drawPhaseTransitionImpact`. After normal dynamic world content and before the current decision impact, call:

```typescript
    drawPhaseTransitionImpact(surface, this.phaseTransitionFrom, this.phaseTransitionTo, this.phaseTransitionStart, time, this.renderer.width, this.renderer.height, dynamicPresentation.accent, reducedMotion);
```

Reset all four phase-transition fields in `destroy()`. Do not call any engine method from this presentation path.

- [ ] **Step 4: Add release-level acceptance scenarios as executable tests**

Create `public/game/tests/drama-acceptance.test.mjs`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../dist/game/engine.js';
import { civilizationDramaPhase } from '../dist/game/drama.js';
import { buildDecisionFeedback, captureDecisionSnapshot } from '../dist/game/decision-feedback.js';
import { applyWorldMemory } from '../dist/game/world-memory.js';
import { pathIdentity } from '../dist/render/identity.js';
import { worldPresentation } from '../dist/render/world-presentation.js';
import { RenderQualityController, qualityFactors } from '../dist/render/quality.js';

function civ(seed=18000){ return GameEngine.createCivilizationForTest(seed); }

test('acceptance A: a fragile early civilization is valid content, not a missing phase', () => {
  const early=civ(); early.development=65; early.eventChoices=0;
  assert.equal(civilizationDramaPhase(early).name,'emergence');
  early.development=90;
  assert.equal(civilizationDramaPhase(early).name,'expansion');
});

test('acceptance B: Machine Faith consolidation becomes an entrenched visible identity', () => {
  const world=civ(18001); world.pathState.affinity.machine_faith=8; world.pathState.dominantPath='machine_faith';
  world.pathState.completedEvents.push('synod_of_the_second_engine');
  assert.equal(pathIdentity(world).tier,3);
  const before=captureDecisionSnapshot(world); world.development+=16; const after=captureDecisionSnapshot(world);
  const feedback=buildDecisionFeedback(1,{id:'synod_of_the_second_engine',title:'Synod'},{label:'Consolidate'},before,after);
  world.visualMemory=applyWorldMemory(world.seed,world.visualMemory,feedback);
  assert.ok(world.visualMemory.marks.some(mark=>mark.domain==='identity' && mark.motif==='engine_shrine'));
});

test('acceptance C: crisis history can be repaired but its scar survives', () => {
  const world=civ(18002);
  const base={sequence:1,eventTitle:'',choiceLabel:'',tone:'negative',metrics:[],affinities:[],additions:[],consequence:{significance:'turning_point',tags:['reality_damage'],transitions:{},signatureProfile:'crisis:entropy_50'}};
  world.visualMemory=applyWorldMemory(world.seed,world.visualMemory,{...base,eventId:'entropy_crisis_50'});
  world.visualMemory=applyWorldMemory(world.seed,world.visualMemory,{...base,eventId:'damage',consequence:{...base.consequence,significance:'major',signatureProfile:'',tags:['civil_unrest']} });
  const scar=structuredClone(world.visualMemory.scars);
  world.visualMemory=applyWorldMemory(world.seed,world.visualMemory,{...base,eventId:'tactical:stabilize',consequence:{...base.consequence,significance:'major',signatureProfile:'',tags:['stabilization','containment']}},{repair:true});
  assert.deepEqual(world.visualMemory.scars,scar);
});

test('acceptance D: Awareness and Attention remain visually independent', () => {
  const world=civ(18003); world.stats.awareness=80; world.stats.attention=10;
  const aware=worldPresentation(world).signals;
  world.stats.awareness=10; world.stats.attention=80;
  const attention=worldPresentation(world).signals;
  assert.ok(aware.outwardObservation>attention.outwardObservation);
  assert.ok(attention.observerPressure>aware.observerPressure);
});

test('acceptance E: Tier 3 sheds cosmetics without changing game state', () => {
  const controller=new RenderQualityController(); const state={simulationSpeed:4,entropy:75};
  let now=6000; for(let tier=0;tier<3;tier++){ for(let i=0;i<30;i++)controller.update(30,now+=200); now+=5001; }
  assert.equal(controller.tier,3);
  assert.equal(qualityFactors(controller.tier).agentFraction,.5);
  assert.deepEqual(state,{simulationSpeed:4,entropy:75});
});
```

If the exact `buildDecisionFeedback` fixture needs a real state transition to match the profile, mutate the relevant structured state before capturing `after`; do not weaken the profile assertion or inspect English event text.

- [ ] **Step 5: Add the strip-redraw performance ceiling**

Extend the existing 1440x760/DPR-2 strip-redraw reference test with a developed civilization containing three scars and six marks. For a 12 px nudge, count recorded world primitives emitted by the scenery strip redraw and assert:

```javascript
assert.ok(stripPrimitiveCount <= 320, `memory/identity scenery regressed strip redraw to ${stripPrimitiveCount} primitives`);
```

Keep the existing full-redraw equivalence assertion in the same fixture.

- [ ] **Step 6: Run acceptance and renderer tests**

Run: `npm test -- --test-name-pattern="acceptance|phase transition|strip redraw"`

Expected: PASS.

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add public/game/src/render/consequence-presentation.ts public/game/src/render/world.ts public/game/tests/drama-acceptance.test.mjs public/game/tests/render-smoke.test.mjs public/game/dist/render
git commit -m "test(game): lock drama arc acceptance scenarios"
```

---

### Task 11: Couple and package the v1.10.0 release

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `public/game/package.json`
- Modify: `public/game/package-lock.json`
- Modify: `public/game/index.html`
- Modify: `README.md`
- Modify: `public/game/README.md`
- Modify: `public/sw.js`
- Modify: `tests/game-release.test.mjs`
- Regenerate: `public/game/dist/**`

- [ ] **Step 1: Write the release test first**

Change the explicit release assertion to:

```javascript
assert.equal(rootPackage.version, '1.10.0');
```

Rename the test to `release metadata identifies browser app v1.10.0`.

Extend the service-worker test with:

```javascript
for (const module of [
  'game/drama.js','game/consequence-profiles.js','game/decision-consequences.js','game/world-memory.js',
  'render/identity.js','render/world-memory.js','render/consequence-presentation.js','render/quality.js',
]) assert.match(worker, new RegExp(`['"]\\/game\\/dist\\/${module.replaceAll('.', '\\\\.')}['"]`));
```

Run: `npm test -- --test-name-pattern="release metadata|service worker precaches"`

Expected: FAIL because the shipped release metadata/cache is still 1.9.1 and the new modules are not all listed.

- [ ] **Step 2: Bump both package versions and lockfiles without creating tags**

Run:

```bash
npm version 1.10.0 --no-git-tag-version
npm --prefix public/game version 1.10.0 --no-git-tag-version
```

Expected: both package files and both lockfiles report `1.10.0`.

- [ ] **Step 3: Update the browser footer and release notes**

Change the footer to:

```html
<footer><span>Reality Consumption Engine Browser v1.10.0</span><span>v4 save · localStorage · No offline progression</span></footer>
```

Change both README titles to v1.10.0 and insert this release section immediately before v1.9.1:

```markdown
## v1.10.0 a civilization that remembers what you did

v1.10.0 adds the Civilization Drama Arc without moving the v1.9.1 balance curve. Emergence,
Expansion, Division, Transformation and Crisis are derived from the existing Development/era/
institution/choice stage score, so stronger machines reach later chapters by surviving longer rather
than by crossing a wall-clock gate.

Decisions now emit deterministic semantic consequence tags and one of 28 high-signal signature
profiles. Major consequences can transform up to six persistent world-memory domains and three
evolving scar domains. Dominant paths and the three current institutions gain distinct procedural
landmark language, while Stability, Sanity, Awareness, Attention, Entropy and Development retain
separate readable visual channels.

The world renderer still uses the same three Canvas layers and exposed-strip scenery redraw. A new
renderer-local quality controller sheds particles, haze and cosmetic agents before any gameplay
signal, preserves reduced-motion semantics, and never changes simulation speed, rewards, cadence or
save version.
```

- [ ] **Step 4: Bump the cache and add every new compiled module**

Set:

```javascript
const CACHE_NAME = 'rce-app-v1.10.0';
```

Add these entries to `APP_ASSETS` beside the existing game/render modules:

```javascript
  '/game/dist/game/drama.js',
  '/game/dist/game/consequence-profiles.js',
  '/game/dist/game/decision-consequences.js',
  '/game/dist/game/world-memory.js',
  '/game/dist/render/identity.js',
  '/game/dist/render/world-memory.js',
  '/game/dist/render/consequence-presentation.js',
  '/game/dist/render/quality.js',
```

Do not add source maps.

- [ ] **Step 5: Rebuild committed browser output**

Run:

```bash
npx tsc -p public/game/tsconfig.json
```

Expected: exit 0 and new `.js`/`.js.map` files under `public/game/dist/` for all eight new modules.

- [ ] **Step 6: Verify release coupling and precache completeness**

Run: `npm test -- --test-name-pattern="release metadata|service worker precaches|precache"`

Expected: PASS.

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 7: Commit the release package**

```bash
git add package.json package-lock.json public/game/package.json public/game/package-lock.json public/game/index.html README.md public/game/README.md public/sw.js tests/game-release.test.mjs public/game/dist
git commit -m "chore(release): package CivMachine v1.10.0"
```

---

### Task 12: Final scope, balance, performance, and artifact verification

**Files:**
- Verify only; do not change behavior unless a check fails.

- [ ] **Step 1: Verify the complete automated suite**

Run:

```bash
npm test
```

Expected: all tests pass, including the unchanged survival/economy/harvest/tactical/scheduler/convergence regressions and all new drama/consequence/memory/render/release tests.

- [ ] **Step 2: Verify root TypeScript/lint/build surfaces**

Run:

```bash
npm run typecheck
npm run lint
npm run build
```

Expected: all three commands exit 0.

- [ ] **Step 3: Verify the frozen/generated and balance-sensitive files were not modified**

Run:

```bash
git diff 04eccc9..HEAD -- public/game/src/data/content.generated.ts public/game/src/game/intervention-scheduler.ts public/game/src/game/pressure.ts public/game/src/game/tactical-actions.ts public/game/src/game/harvest-quality.ts public/game/src/game/upgrade-balance.ts
```

Expected: no unapproved numeric gameplay changes. `intervention-scheduler.ts` should be empty diff; any changes in the other balance-sensitive files require explicit review against the spec and must not alter math.

- [ ] **Step 4: Verify deterministic visual code contains no random selection**

Run:

```bash
rg -n "Math\\.random" public/game/src/game/drama.ts public/game/src/game/consequence-profiles.ts public/game/src/game/decision-consequences.ts public/game/src/game/world-memory.ts public/game/src/render/identity.ts public/game/src/render/world-memory.ts public/game/src/render/consequence-presentation.ts public/game/src/render/quality.ts
```

Expected: no matches.

- [ ] **Step 5: Verify save-version and persistent-field scope**

Run:

```bash
rg -n "SAVE_VERSION|visualMemory" public/game/src/game
```

Expected: `SAVE_VERSION` is unchanged; `visualMemory` appears only in the optional type, engine presentation-memory wiring, and world-memory reducer paths. No progression/harvest/pressure/scheduler module reads it.

- [ ] **Step 6: Verify renderer architecture and hard limits**

Run:

```bash
rg -n "MAX_PARTICLES|MAX_HAZE_BANDS|MAX_FRACTURES|MAX_BEACONS|MAX_CONCURRENT_BUILDS|agentPlanTotal|Math\\.min\\(2" public/game/src/render
```

Expected: the hard ceilings remain testable and DPR remains capped at 2.

Run the render-only tests:

```bash
node --test public/game/tests/render-smoke.test.mjs public/game/tests/presentation.test.mjs public/game/tests/drama-acceptance.test.mjs
```

Expected: PASS, including the <=320 strip-redraw reference ceiling.

- [ ] **Step 7: Verify release assets and clean repository**

Run:

```bash
git status --short
git log --oneline -15
```

Expected: clean working tree; implementation is represented by small task-oriented commits followed by the v1.10.0 release commit.

---

## Spec coverage checklist

- Drama phase formula and exact boundaries: Task 1.
- No wall-clock phase gates and unchanged scheduler/cadence: Tasks 1, 12.
- Decision significance, tags, transitions: Task 2.
- Exactly 28 signature profiles: Task 2.
- Save-compatible optional world memory, 6 marks, 3 scars, deterministic anchors: Task 3.
- Stabilize repairs one non-scar mark, scars survive: Tasks 3-4.
- Old v4 saves continue without `SAVE_VERSION` bump: Task 4.
- All 10 paths and 3 institutions have distinct identity geometry: Tasks 5, 9.
- Persistent memory/scars live on cached scenery: Task 6.
- Immediate semantic impacts and reduced motion: Task 7.
- Adaptive quality with 24 ms/30-frame degrade, 14 ms/180-frame recovery, 5 s cooldown: Task 8.
- Distinct Stability/Sanity/Awareness/Attention/Entropy/Development channels: Task 9.
- Passive phase-transition cue is renderer-local: Task 10.
- Acceptance scenarios A-E and <=320 strip reference: Task 10.
- v1.10.0 metadata, cache, compiled dist, precache: Task 11.
- Balance/generated-catalog/save-version/determinism final locks: Task 12.

## Implementation order rationale

Tasks 1-4 establish game-layer semantics and persistence before the renderer consumes them. Tasks 5-7 add structural identity, saved memory, and transient effects without performance adaptation. Task 8 then adds quality control against a stable visual workload. Task 9 completes legibility using the quality interface already in place. Task 10 locks passive phase transitions and acceptance behavior. Task 11 packages the release only after behavior is stable, and Task 12 verifies the spec against the final repository rather than trusting intermediate task results.

