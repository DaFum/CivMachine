import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { CONTENT } from '../public/game/dist/data/content.generated.js';
import { SAVE_VERSION } from '../public/game/dist/game/rules.js';
import { EXPANDED_INTERVENTIONS } from '../public/game/dist/data/expanded-interventions.js';
import { EXPANDED_DOMINANT_INTERVENTIONS, EXPANDED_PATH_INTERVENTIONS } from '../public/game/dist/data/expanded-path-interventions.js';
import { APOTHEOSIS_EVENTS } from '../public/game/dist/data/apotheosis-events.js';
import { ENTROPY_CRISES } from '../public/game/dist/data/entropy-crises.js';
import { EVENT_CHAINS } from '../public/game/dist/data/event-chains.js';

test('bundled game preserves the full release catalog', () => {
  assert.equal(CONTENT.events.length, 75);
  assert.equal(Object.keys(CONTENT.path_definitions).length, 10);
  assert.equal(CONTENT.traits.length, 12);
  assert.equal(CONTENT.machine_upgrades.length, 12);
  assert.equal(CONTENT.universe_upgrades.length, 8);
  assert.equal(CONTENT.axiom_upgrades.length, 6);
  assert.equal(CONTENT.directives.length, 6);
  assert.equal(CONTENT.breeding_matrices.length, 6);
  // The layered catalogs are the shipped content too, and the count is what keeps a run
  // repetition-free: 185 interventions, of which up to about 145 are eligible within a single run.
  assert.equal(ENTROPY_CRISES.length, 3);
  assert.equal(APOTHEOSIS_EVENTS.length, 12);
  assert.equal(EXPANDED_INTERVENTIONS.length, 36);
  assert.equal(EXPANDED_PATH_INTERVENTIONS.length, 40);
  assert.equal(EXPANDED_DOMINANT_INTERVENTIONS.length, 10);
  assert.equal(EVENT_CHAINS.length, 9);
  const total = CONTENT.events.length + ENTROPY_CRISES.length + APOTHEOSIS_EVENTS.length
    + EXPANDED_INTERVENTIONS.length + EXPANDED_PATH_INTERVENTIONS.length + EXPANDED_DOMINANT_INTERVENTIONS.length
    + EVENT_CHAINS.length;
  assert.equal(total, 185);
});

test('bundled game exposes the playable surfaces', async () => {
  const html = await readFile(
    new URL('../public/game/index.html', import.meta.url),
    'utf8',
  );

  assert.match(html, /id="machine-view"/);
  assert.match(html, /id="civilization-view"/);
  assert.match(html, /id="world-surface"/);
});

test('game boots without any bundled framework or remote runtime scripts', async () => {
  const html = await readFile(
    new URL('../public/game/index.html', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(html, /phaser/i);
  assert.doesNotMatch(html, /<script[^>]+src="https?:\/\//);
});

test('app manifest requests fullscreen without locking orientation', async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL('../public/manifest.webmanifest', import.meta.url),
      'utf8',
    ),
  );

  assert.equal(manifest.name, 'Reality Consumption Engine');
  assert.equal(manifest.display, 'fullscreen');
  assert.equal(manifest.start_url, '/');
  assert.equal('orientation' in manifest, false);
  // The browser reads the manifest itself, so this is the one player-facing surface a locale switch
  // cannot reach. It stays English -- and it stays the *same* English as the catalog's shell entries,
  // which is what this pins.
  const { LOCALIZATION } = await import('../public/game/dist/data/localization.js');
  const shell = LOCALIZATION.en.ui.shell;
  assert.equal(manifest.name, shell.pwaName);
  assert.equal(manifest.short_name, shell.pwaShortName);
  assert.equal(manifest.description, shell.pwaDescription);
});

test('shell registers offline support and requires user action for fullscreen', async () => {
  const shell = await readFile(
    new URL('../app/game-shell.tsx', import.meta.url),
    'utf8',
  );

  assert.match(shell, /serviceWorker\.register\('\/sw\.js'\)/);
  assert.match(shell, /requestFullscreen\(\)/);
  assert.match(shell, /beforeinstallprompt/);
  assert.match(shell, /src="\/game\/index\.html"/);
});

test('shell recovers from an early iframe load and a denied fullscreen request', async () => {
  const shell = await readFile(
    new URL('../app/game-shell.tsx', import.meta.url),
    'utf8',
  );

  assert.match(shell, /contentDocument\?\.readyState === 'complete'/);
  assert.match(shell, /try\s*{[\s\S]*requestFullscreen\(\)[\s\S]*}\s*catch/);
});

test('service worker precaches the shell, game, content and deterministic Canvas renderer', async () => {
  const worker = await readFile(
    new URL('../public/sw.js', import.meta.url),
    'utf8',
  );

  assert.match(worker, /['"]\/game\/index\.html['"]/);
  assert.match(worker, /['"]\/game\/dist\/data\/content\.generated\.js['"]/);
  assert.doesNotMatch(worker, /phaser/i);
  assert.match(worker, /['"]\/game\/dist\/data\/intervention-copy\.js['"]/);
  assert.match(worker, /['"]\/game\/dist\/game\/intervention-scheduler\.js['"]/);
  assert.match(worker, /['"]\/game\/dist\/game\/decision-feedback\.js['"]/);
  assert.match(worker, /['"]\/game\/dist\/data\/entropy-crises\.js['"]/);
  assert.match(worker, /['"]\/game\/dist\/data\/event-chains\.js['"]/);
  assert.match(worker, /['"]\/game\/dist\/data\/expanded-interventions\.js['"]/);
  assert.match(worker, /['"]\/game\/dist\/data\/expanded-path-interventions\.js['"]/);
  assert.match(worker, /['"]\/game\/dist\/game\/pressure\.js['"]/);
  assert.match(worker, /['"]\/game\/dist\/game\/tactical-actions\.js['"]/);
  assert.match(worker, /['"]\/game\/dist\/game\/harvest-quality\.js['"]/);
  assert.match(worker, /['"]\/game\/dist\/game\/run-directives\.js['"]/);
  assert.match(worker, /['"]\/game\/dist\/game\/upgrade-balance\.js['"]/);
  // The loader that keeps a returning player's save: without it the shell falls back to the cached
  // old modules and the migration never runs.
  assert.match(worker, /['"]\/game\/dist\/game\/save-migration\.js['"]/);
  // Source maps are a debugging aid, not a shipped asset: precaching them downloads dead weight on
  // every install, and the list only ever named six of the thirty-five maps anyway.
  assert.doesNotMatch(worker, /\.js\.map/, 'source maps must not be precached');
  assert.match(worker, /['"]\/game\/dist\/render\/world-presentation\.js['"]/);
  assert.match(worker, /['"]\/game\/dist\/game\/milestones\.js['"]/);
  assert.match(worker, /['"]\/game\/dist\/game\/convergence\.js['"]/);
  // Derived, not literal: the shipped version is asserted once, in the release-metadata test below.
  const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(worker, new RegExp(`rce-app-v${version.replaceAll('.', '\\.')}['"]`));
  assert.match(worker, /caches\.delete/);

  // Every listed path must resolve to a file. cache.addAll() rejects as a whole on a single 404, so
  // one mistyped entry costs the entire precache -- and the install failure only shows up in a
  // browser, long after this test could have caught it.
  const listed = worker
    .slice(worker.indexOf('APP_ASSETS'), worker.indexOf('];', worker.indexOf('APP_ASSETS')))
    .match(/'\/[^']*'/g)
    .map(entry => entry.slice(1, -1));
  assert.ok(listed.length >= 40, `only ${listed.length} precached paths parsed`);
  for (const path of listed) {
    // '/' is a route the shell renders, not a file on disk.
    if (path === '/') continue;
    await stat(new URL(`../public${path}`, import.meta.url));
  }
});

test('release metadata identifies browser app v1.20.0', async () => {
  const rootPackage = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  // One explicit assertion so an accidental bump is caught; everything below is derived from it, so
  // a deliberate bump is one edit here and one in package.json rather than six scattered literals.
  assert.equal(rootPackage.version, '1.20.0');
  const version = rootPackage.version;
  const escaped = version.replaceAll('.', '\\.');

  const gamePackage = JSON.parse(await readFile(new URL('../public/game/package.json', import.meta.url), 'utf8'));
  const html = await readFile(new URL('../public/game/index.html', import.meta.url), 'utf8');
  const rootReadme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  const gameReadme = await readFile(new URL('../public/game/README.md', import.meta.url), 'utf8');
  const worker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');

  assert.equal(gamePackage.version, version, 'the game package must ship the shell version');
  // `npm version` writes each package *and its lockfile*; a hand-edited bump writes neither, and the
  // lockfiles then identify a release that no longer exists. Both fields, because npm records the
  // root package's version twice.
  for (const lock of ['../package-lock.json', '../public/game/package-lock.json']) {
    const parsed = JSON.parse(await readFile(new URL(lock, import.meta.url), 'utf8'));
    assert.equal(parsed.version, version, `${lock} must ship the shell version`);
    assert.equal(parsed.packages[''].version, version, `${lock} packages[""] must ship the shell version`);
  }
  assert.match(html, new RegExp(`Browser v${escaped}`));
  // `main.ts` reads the footer's `data-version` and fills the localized footer string with it, so this
  // -- not the English text beside it -- is the version a booted game actually shows.
  assert.match(html, new RegExp(`data-version="${escaped}"`));
  // The save format the shell advertises before `main.ts` localizes the line.
  assert.match(html, new RegExp(`v${SAVE_VERSION} save`));
  // Both README titles, not merely a mention anywhere in the file: the release notes for older
  // versions stay in place, so a loose match would pass on a stale title.
  assert.match(rootReadme, new RegExp(`^# .*v${escaped}$`, 'm'));
  assert.match(gameReadme, new RegExp(`^# .*v${escaped}$`, 'm'));
  // The cache name is what actually delivers a release: without a bump, returning players keep the
  // old files forever, whatever the version numbers say.
  assert.match(worker, new RegExp(`const CACHE_NAME = 'rce-app-v${escaped}'`));
  // And each release should say what changed, under its own heading in both READMEs.
  assert.match(rootReadme, new RegExp(`^## v${escaped} `, 'm'));
  assert.match(gameReadme, new RegExp(`^## v${escaped} `, 'm'));

  // The Civilization Drama Arc modules are useless to a returning player unless the hand-maintained
  // precache list carries them, and the cache is never revalidated. The onboarding modules are in the
  // same position: a missing one leaves a returning player with no guided run, no report and no
  // manual, and the failure would only surface in a browser.
  for (const compiled of [
    'game/drama.js','game/consequence-profiles.js','game/decision-consequences.js','game/world-memory.js',
    'render/identity.js','render/world-memory.js','render/consequence-presentation.js','render/quality.js',
    'game/tutorial.js','game/run-report.js','game/guidance.js','data/help-topics.js',
    'ui/format.js','ui/guide-view.js','ui/tutorial-view.js','ui/report-view.js',
  ]) assert.match(worker, new RegExp(`['"]\\/game\\/dist\\/${compiled.replaceAll('.', '\\.')}['"]`));
});

test('game surface protects mobile safe areas and dynamic viewport height', async () => {
  const css = await readFile(
    new URL('../public/game/mobile.css', import.meta.url),
    'utf8',
  );

  assert.match(css, /100dvh/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-left\)/);
});

test('game saves when the document becomes hidden', async () => {
  const main = await readFile(
    new URL('../public/game/src/main.ts', import.meta.url),
    'utf8',
  );

  assert.match(main, /visibilitychange/);
  assert.match(main, /document\.hidden/);
  assert.match(main, /engine\.save\(\)/);
});

test('Canvas fallback caps rendering density at two device pixels', async () => {
  const world = await readFile(
    new URL('../public/game/src/render/world.ts', import.meta.url),
    'utf8',
  );

  assert.match(
    world,
    /Math\.min\(2,\s*Math\.max\(1,\s*globalThis\.devicePixelRatio/,
  );
});
