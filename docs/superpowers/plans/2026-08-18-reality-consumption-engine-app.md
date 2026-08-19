# Reality Consumption Engine App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete Reality Consumption Engine v1.0.17 as a responsive, installable, offline-capable Sites app without removing any gameplay content.

**Architecture:** Preserve the supplied deterministic TypeScript game as a self-contained static module under `public/game/`. Host it inside a same-origin full-viewport React shell that handles installation, fullscreen, and service-worker registration while the game keeps ownership of simulation, rendering, UI, and local saves.

**Tech Stack:** TypeScript, Vinext/React, Phaser 3.90, Canvas fallback, DOM HUD, Web App Manifest, Service Worker, Node test runner, Sites.

---

### Task 1: Import and protect the complete game release

**Files:**
- Create: `public/game/index.html`
- Create: `public/game/styles.css`
- Create: `public/game/dist/**/*.js`
- Create: `public/game/src/**/*.ts`
- Create: `tests/game-release.test.mjs`

- [ ] **Step 1: Write the failing catalog and shell test**

```js
test('bundled game preserves the full release catalog', async () => {
  const content = await readFile(new URL('../public/game/src/data/content.generated.json', import.meta.url), 'utf8');
  const parsed = JSON.parse(content);
  assert.equal(parsed.events.length, 75);
  assert.equal(Object.keys(parsed.path_definitions).length, 10);
});

test('bundled game exposes the playable surfaces', async () => {
  const html = await readFile(new URL('../public/game/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="machine-view"/);
  assert.match(html, /id="civilization-view"/);
  assert.match(html, /id="phaser-world"/);
});
```

- [ ] **Step 2: Run the test and verify it fails because the game has not been imported**

Run: `node --test tests/game-release.test.mjs`

Expected: FAIL with `ENOENT` for `public/game`.

- [ ] **Step 3: Copy the supplied v1.0.17 release into `public/game/` without removing source, tests, or generated content**

- [ ] **Step 4: Run the test and verify both assertions pass**

Run: `node --test tests/game-release.test.mjs`

Expected: 2 tests pass, 0 fail.

### Task 2: Make the renderer fully local

**Files:**
- Create: `public/game/vendor/phaser.min.js`
- Modify: `public/game/index.html`
- Modify: `public/game/README.md`
- Test: `tests/game-release.test.mjs`

- [ ] **Step 1: Add a failing test for the local Phaser runtime**

```js
test('game loads Phaser locally and has no remote runtime script', async () => {
  const html = await readFile(new URL('../public/game/index.html', import.meta.url), 'utf8');
  const phaser = await stat(new URL('../public/game/vendor/phaser.min.js', import.meta.url));
  assert.ok(phaser.size > 500_000);
  assert.match(html, /\.\/vendor\/phaser\.min\.js/);
  assert.doesNotMatch(html, /cdnjs|https?:\/\//);
});
```

- [ ] **Step 2: Run the test and verify the missing local runtime causes failure**

Run: `node --test tests/game-release.test.mjs`

Expected: FAIL with missing `vendor/phaser.min.js`.

- [ ] **Step 3: Install Phaser 3.90.0, copy its minified browser build into `public/game/vendor/`, and point `index.html` to the local script**

- [ ] **Step 4: Run the test and verify the renderer is network-independent**

Run: `node --test tests/game-release.test.mjs`

Expected: 3 tests pass, 0 fail.

### Task 3: Build the installable fullscreen shell

**Files:**
- Create: `app/game-shell.tsx`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Create: `public/manifest.webmanifest`
- Create: `public/sw.js`
- Modify: `public/favicon.svg`
- Test: `tests/game-release.test.mjs`

- [ ] **Step 1: Add failing manifest, service-worker, and shell tests**

```js
test('app manifest requests fullscreen without locking orientation', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.display, 'fullscreen');
  assert.equal(manifest.start_url, '/');
  assert.equal('orientation' in manifest, false);
});

test('shell registers offline support and requires user action for fullscreen', async () => {
  const shell = await readFile(new URL('../app/game-shell.tsx', import.meta.url), 'utf8');
  assert.match(shell, /serviceWorker\.register\('\/sw\.js'\)/);
  assert.match(shell, /requestFullscreen\(\)/);
  assert.match(shell, /beforeinstallprompt/);
});
```

- [ ] **Step 2: Run the test and verify it fails on the missing app files**

Run: `node --test tests/game-release.test.mjs`

Expected: FAIL with missing manifest or shell.

- [ ] **Step 3: Implement the client shell, authoritative metadata, manifest, service worker, and compact install/fullscreen controls**

- [ ] **Step 4: Run the test and verify the PWA contract passes**

Run: `node --test tests/game-release.test.mjs`

Expected: all tests pass.

### Task 4: Finish mobile, accessibility, and lifecycle behavior

**Files:**
- Modify: `app/globals.css`
- Modify: `public/game/styles.css`
- Modify: `public/game/src/main.ts`
- Modify: `public/game/dist/main.js`
- Test: `tests/game-release.test.mjs`

- [ ] **Step 1: Add failing tests for dynamic viewport, safe areas, reduced motion, and lifecycle saves**

```js
test('mobile shell protects safe areas and reduced motion', async () => {
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(css, /100dvh/);
  assert.match(css, /env\(safe-area-inset-/);
  assert.match(css, /prefers-reduced-motion/);
});

test('game saves when the document becomes hidden', async () => {
  const main = await readFile(new URL('../public/game/src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /visibilitychange/);
  assert.match(main, /document\.hidden/);
});
```

- [ ] **Step 2: Run the test and verify the missing mobile/lifecycle behavior causes failure**

Run: `node --test tests/game-release.test.mjs`

Expected: FAIL on the new assertions.

- [ ] **Step 3: Add the responsive/safe-area rules and save-on-hidden listener, then rebuild the supplied TypeScript game**

- [ ] **Step 4: Run all imported-game and shell tests**

Run: `node --test tests/game-release.test.mjs public/game/tests/*.test.mjs`

Expected: all tests pass.

### Task 5: Validate the complete player journey

**Files:**
- Modify only if a failing automated or visual check identifies a defect.

- [ ] **Step 1: Run the production lint and test suites**

Run: `npm run lint && npm test`

Expected: exit 0 with no test failures.

- [ ] **Step 2: Start the agent preview and verify boot, civilization start, intervention choice, panning, speed, harvest, reload persistence, and reset affordance**

- [ ] **Step 3: Repeat viewport checks at desktop, narrow portrait, and landscape mobile sizes; inspect screenshots for overlap and unreadable controls**

- [ ] **Step 4: Test Canvas fallback and an offline reload after the service worker has installed**

### Task 6: Publish and package

**Files:**
- Create: `Reality_Consumption_Engine_App_v1.1.0.zip`

- [ ] **Step 1: Create a Sites checkpoint after the complete playable experience passes agent preview**

- [ ] **Step 2: Verify the checkpoint deployment reaches `succeeded` through the required direct status call**

- [ ] **Step 3: Create a clean source ZIP that excludes dependency caches and build-temporary files**

- [ ] **Step 4: Save the ZIP as a new reusable file and provide both the verified app URL and download link**

