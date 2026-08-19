# v1.3.1 Progression Rebalance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved balanced Option A curve in v1.3.1 so Accelerate has a real Control opportunity cost, the first qualified run normally buys only one or two machine levels, chaotic collapse no longer outperforms controlled cultivation, and a normal Universe takes six to nine successful runs.

**Architecture:** Keep the existing v2 serializable simulation contract unchanged. Adjust authoritative constants in tactical actions, machine balance, progression gates, harvest rules, and engine runtime bonuses. Centralize Cultivation Credit calculation in a pure harvest-quality helper used by both preview and committed harvest paths. Validate the result with fixed-seed gameplay/economy simulations and the complete browser/release suite; presentation continues to derive values from the simulation definitions.

**Tech Stack:** TypeScript ES modules, Node test runner, deterministic simulation, DOM/CSS browser UI, Canvas 2D renderer, Vinext/Vite Sites shell, localStorage, Sites deployment.

---

## File map

**Create**

- `docs/superpowers/specs/2026-08-19-v1-3-1-progression-rebalance-design.md` — approved quantitative balance contract.
- `docs/superpowers/plans/2026-08-19-v1-3-1-progression-rebalance.md` — executable TDD/release plan.

**Modify**

- `public/game/tests/core.test.mjs` — tactical, economy, Credit, chaotic-yield, and seed-sweep regressions.
- `public/game/src/game/tactical-actions.ts` — authoritative Accelerate cost.
- `public/game/src/game/upgrade-balance.ts` — exact v1.3.1 machine price/growth catalog.
- `public/game/src/game/progression.ts` — Cognitive Extractor and Paradox Sieve gates.
- `public/game/src/game/harvest-quality.ts` — shared Cultivation Credit calculation.
- `public/game/src/game/rules.ts` — chaotic Paradox multiplier.
- `public/game/src/game/engine.ts` — chaotic retention base and shared credit helper integration.
- `public/game/dist/**` — compiled runtime generated from the TypeScript source.
- `tests/game-release.test.mjs` — v1.3.1 metadata and cache contract.
- `package.json`, `package-lock.json`, `public/game/package.json` — v1.3.1 package metadata.
- `public/game/index.html` — v1.3.1 footer.
- `public/sw.js` — v1.3.1 offline cache key.
- `README.md`, `public/game/README.md` — release notes and exact balance behavior.

## Task 1: Lock the tactical opportunity cost

**Files:**
- Modify: `public/game/tests/core.test.mjs`
- Modify: `public/game/src/game/tactical-actions.ts`
- Modify: `public/game/src/game/engine.ts` only if the no-Civilization fallback cost is not definition-driven

- [ ] **Step 1: Write failing Accelerate tests**

Import `TACTICAL_ACTIONS`. Assert `TACTICAL_ACTIONS.accelerate.cost === 2`. Start a seeded Civilization, spend Accelerate, resolve interventions with the existing safety policy, and assert the base-recharge sequence cannot successfully Accelerate after every resolved intervention. Also assert the disabled reason is `Requires 2 Control.` and that a failed attempt does not mutate years, Entropy, or Control.

- [ ] **Step 2: Compile and verify RED**

Run:

```bash
./node_modules/.bin/tsc -p public/game/tsconfig.json
node --test --test-name-pattern='Accelerate.*two Control|cannot self-fund' public/game/tests/core.test.mjs
```

Expected: FAIL because Accelerate still costs 1.

- [ ] **Step 3: Change the authoritative action cost**

Set `TACTICAL_ACTIONS.accelerate.cost` to `2`. Make the no-Civilization `GameEngine.tacticalAvailability()` fallback derive its cost from the same definition rather than duplicating a `1` literal.

- [ ] **Step 4: Compile and verify GREEN**

Run the focused command from Step 2. Confirm exact decision feedback still reports years, intervention timer, Stability, Entropy, and Control deltas.

- [ ] **Step 5: Commit**

```bash
git add public/game/src/game/tactical-actions.ts public/game/src/game/engine.ts public/game/tests/core.test.mjs public/game/dist
git commit -m "Make Accelerate consume tactical opportunity"
```

## Task 2: Rebalance machine prices and progression gates

**Files:**
- Modify: `public/game/tests/core.test.mjs`
- Modify: `public/game/src/game/upgrade-balance.ts`
- Modify: `public/game/src/game/progression.ts`

- [ ] **Step 1: Write failing exact-catalog tests**

Build the balanced catalog and assert every base cost/growth pair from the approved design table. Assert Cognitive Extractor requires Insight 4 and Paradox Sieve requires Insight 5 through `progressionRulesForLayer('machine')`. Keep a separate assertion that Universe/Axiom balance functions remain untouched.

- [ ] **Step 2: Compile and verify RED**

Run:

```bash
./node_modules/.bin/tsc -p public/game/tsconfig.json
node --test --test-name-pattern='v1.3.1 machine curve|delays early yield extractors' public/game/tests/core.test.mjs
```

Expected: FAIL on the v1.3.0 prices and Insight gates.

- [ ] **Step 3: Apply the exact v1.3.1 catalog**

Replace all 12 `MACHINE_OVERRIDES` cost/growth pairs with the design values. Do not change maximum levels, currencies, benefit formulas, Universe growth, or Axiom growth. Change only `cognitive_extractor` Insight 2→4 and `paradox_sieve` Insight 3→5.

- [ ] **Step 4: Compile and verify GREEN**

Run the focused command from Step 2 and the existing progression tests.

- [ ] **Step 5: Commit**

```bash
git add public/game/src/game/upgrade-balance.ts public/game/src/game/progression.ts public/game/tests/core.test.mjs public/game/dist
git commit -m "Rebalance early machine progression"
```

## Task 3: Separate controlled progression from chaotic salvage

**Files:**
- Modify: `public/game/tests/core.test.mjs`
- Modify: `public/game/src/game/harvest-quality.ts`
- Modify: `public/game/src/game/rules.ts`
- Modify: `public/game/src/game/engine.ts`

- [ ] **Step 1: Write failing Cultivation Credit matrix tests**

Import the wished-for `calculateCultivationCredits` helper. For Premature, Established, Transcendent, and Ascendant qualities, assert Controlled/Chaotic values `0/0`, `2/1`, `3/2`, and `4/3`. Repeat with objective completion and assert `0/0`, `3/2`, `4/3`, and `5/4`.

- [ ] **Step 2: Write failing resource-multiplier tests**

Use a fixed Civilization and neutral bonuses. Assert chaotic Causal Mass, Cognition, and Existence use 40% of the equivalent controlled raw values and chaotic Paradox uses 1.50×. Use values chosen to avoid rounding ambiguity or compare against `Math.round` explicitly. Assert `GameEngine.baseBonuses().chaoticRetention === 0.4`.

- [ ] **Step 3: Compile and verify RED**

Run:

```bash
./node_modules/.bin/tsc -p public/game/tsconfig.json
node --test --test-name-pattern='chaotic.*Credit|chaotic resource|retention' public/game/tests/core.test.mjs
```

Expected: FAIL because the helper is missing and current multipliers are 0.55/1.85.

- [ ] **Step 4: Implement one authoritative Credit formula**

Export `calculateCultivationCredits(quality, chaotic, objectiveCompleted)`. Return zero immediately for Premature. Otherwise return `Math.max(0, quality.credits + (objectiveCompleted ? 1 : 0) - (chaotic ? 1 : 0))`.

Use this helper in `GameEngine.previewHarvestDetails()`. Because committed harvests already consume the preview result, this keeps preview, record, credit bank, Machine Record, and button state aligned.

- [ ] **Step 5: Apply chaotic resource constants**

Set base `chaoticRetention` to `0.4` in both `baseBonuses()` and `runtimeBonuses()`. Keep the Contingency Vat/Axiom increments and 0.95 cap. Change the Paradox multiplier in `calculateHarvest()` from `1.85` to `1.50`.

- [ ] **Step 6: Compile and verify GREEN**

Run the focused command from Step 3 plus all harvest and Directive tests. Confirm Premature Directive harvests still grant zero.

- [ ] **Step 7: Commit**

```bash
git add public/game/src/game/harvest-quality.ts public/game/src/game/rules.ts public/game/src/game/engine.ts public/game/tests/core.test.mjs public/game/dist
git commit -m "Differentiate controlled and chaotic harvests"
```

## Task 4: Enforce the deterministic progression envelope

**Files:**
- Modify: `public/game/tests/core.test.mjs`

- [ ] **Step 1: Add reusable deterministic test helpers**

Add helpers that:

- run fixed seeds with the declared safety-choice policy;
- optionally use Accelerate whenever legally available;
- stop at earliest qualified Established harvest or at collapse;
- compute the maximum legal machine levels purchasable from the resulting currencies and post-run progression gates using a bounded exhaustive search per currency;
- report percentile values without randomness or wall-clock time.

- [ ] **Step 2: Add first-run purchase-envelope test**

Run 80 fixed seeds to earliest Controlled Established harvest. Assert median purchasable levels is between 1 and 2 inclusive and p90 is no greater than 3.

- [ ] **Step 3: Add Accelerate-frequency test**

For the same seed suite, use Accelerate whenever available. Assert every completed run has fewer successful Accelerates than resolved interventions and at least one attempt is blocked by the two-Control requirement. Record median elapsed time as a diagnostic in assertion messages without over-constraining harmless event-copy changes.

- [ ] **Step 4: Add chaotic-collapse purchase-envelope test**

Run 80 fixed no-upgrade seeds until forced collapse with legal Accelerate use. Assert median purchasable levels is no greater than 2 and p90 no greater than 3.

- [ ] **Step 5: Add Universe-run-count test**

Assert nine Controlled Established or six Controlled Transcendent harvests reach 18 Credits; six Controlled Established harvests and nine Chaotic Established harvests do not exceed the intended threshold boundary incorrectly. Derive the totals from `calculateCultivationCredits`, not literals copied from UI.

- [ ] **Step 6: Verify focused and full gameplay suites**

Run:

```bash
./node_modules/.bin/tsc -p public/game/tsconfig.json
node --test public/game/tests/core.test.mjs
```

If a bound fails, adjust only the approved price/growth constants within the design table after recording the observed median/p90; never weaken the assertion to fit an unintended curve.

- [ ] **Step 7: Commit**

```bash
git add public/game/tests/core.test.mjs
git commit -m "Guard the v1.3.1 progression curve"
```

## Task 5: Mark the v1.3.1 release

**Files:**
- Modify: `tests/game-release.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `public/game/package.json`
- Modify: `public/game/index.html`
- Modify: `public/sw.js`
- Modify: `README.md`
- Modify: `public/game/README.md`

- [ ] **Step 1: Write failing release assertions**

Require both package versions and the English footer to be `1.3.1`, and require service-worker cache key `rce-app-v1.3.1`.

- [ ] **Step 2: Run the release test and verify RED**

```bash
node --test --test-name-pattern='release metadata' tests/game-release.test.mjs
```

Expected: FAIL on v1.3.0.

- [ ] **Step 3: Update metadata and release copy**

Update only first-party version fields, the footer, and the service-worker cache key. Add concise README notes covering Accelerate cost 2, the revised machine curve, chaotic 40%/1.50× values, one-Credit penalty, six-to-nine-run target, and unchanged v2 save compatibility. Do not replace dependency versions containing `1.3.0`.

- [ ] **Step 4: Verify GREEN**

Run the focused release test.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json public/game/package.json public/game/index.html public/sw.js README.md public/game/README.md tests/game-release.test.mjs
git commit -m "Prepare progression rebalance release v1.3.1"
```

## Task 6: Complete technical and browser verification

**Files:**
- Verify all tracked source, generated runtime, tests, and documentation

- [ ] **Step 1: Run the repository verification suite**

```bash
npm test
npm run build
git diff --check
git status --short
```

Capture the exact pass count and build result. Confirm generated `public/game/dist` matches TypeScript source.

- [ ] **Step 2: Review the committed diff**

Inspect `git diff <v1.3.0-release-commit>..HEAD --stat` and the focused rule changes. Request an independent code review. Fix all Critical/Important findings test-first and rerun the relevant suites.

- [ ] **Step 3: Start a Sites preview and run the browser playtest**

Verify on desktop and mobile viewport:

- game loads with no console errors;
- game copy remains English;
- Accelerate displays `COST 2`;
- first Accelerate changes Control 3→1 with exact feedback;
- after one ordinary intervention Control is 2, a second Accelerate changes it 2→0;
- after the next intervention Accelerate remains disabled at Control 1 with `Requires 2 Control.`;
- harvest preview and Machine Record show the revised chaotic Credit values;
- tactical rail, world surface, and machine upgrade list remain responsive.

Stop the preview after QA.

- [ ] **Step 4: Rerun final verification**

Run the complete tests/build after every review or browser-fix commit. Do not claim completion from an earlier run.

## Task 7: Deploy and package the identical revision

**Files:**
- Create outside the repository: `/workspace/Reality_Consumption_Engine_Browser_v1.3.1.zip`

- [ ] **Step 1: Confirm release revision is clean**

Record `git rev-parse HEAD`, require a clean `git status --short`, and confirm all release surfaces say v1.3.1.

- [ ] **Step 2: Publish the Sites checkpoint**

Create a Sites checkpoint from that exact revision with message `Ship balanced progression curve v1.3.1`. If nonterminal, start exactly one immutable-ID deployment monitor. After terminal status, perform the required direct main-agent deployment-status verification and retain the verified production URL.

- [ ] **Step 3: Build and validate the source ZIP from the same commit**

```bash
git archive --format=zip --output=/workspace/Reality_Consumption_Engine_Browser_v1.3.1.zip HEAD
unzip -t /workspace/Reality_Consumption_Engine_Browser_v1.3.1.zip
unzip -p /workspace/Reality_Consumption_Engine_Browser_v1.3.1.zip package.json
```

Confirm the archive contains the v1.3.1 spec, plan, TypeScript source, compiled runtime, release tests, and Sites configuration.

- [ ] **Step 4: Make the ZIP durable and hand off**

Upload the ZIP to ChatGPT Library when the Library workflow is available, preserve its returned file identity on the local file, and provide both the clickable ZIP and verified production Site URL. Report exact deterministic curve metrics and test/build/browser evidence.

## Requirements traceability

| Approved requirement | Implemented by |
| --- | --- |
| Accelerate cannot be selected after every intervention | Tasks 1 and 4 |
| Balanced first-run purchase curve | Tasks 2 and 4 |
| Chaotic harvest cannot dominate Controlled | Tasks 3 and 4 |
| Six-to-nine successful runs per normal Universe | Tasks 3 and 4 |
| Preserve tactical pace and exact feedback | Tasks 1, 4, and 6 |
| English UI | Tasks 5 and 6 |
| No save migration | Architecture, Tasks 3 and 6 |
| v1.3.1 Site and matching ZIP | Tasks 5–7 |
