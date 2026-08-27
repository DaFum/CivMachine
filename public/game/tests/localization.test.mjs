import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEFAULT_LOCALE, LOCALIZATION, SUPPORTED_LOCALES } from '../dist/data/localization.js';

function kind(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function walkPairs(left, right, path = 'LOCALIZATION') {
  assert.equal(kind(right), kind(left), `${path} type differs between locales`);
  if (typeof left === 'string') return [[path, left, right]];
  if (Array.isArray(left)) {
    assert.equal(right.length, left.length, `${path} array length differs between locales`);
    return left.flatMap((value, index) => walkPairs(value, right[index], `${path}[${index}]`));
  }
  assert.ok(left && typeof left === 'object', `${path} must contain only strings, arrays, or objects`);
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  assert.deepEqual(rightKeys, leftKeys, `${path} keys differ between locales`);
  return leftKeys.flatMap(key => walkPairs(left[key], right[key], `${path}.${key}`));
}

function tokens(value) {
  return [...value.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(match => match[1]).sort();
}

test('localization metadata exposes English and German with English as the default', () => {
  assert.equal(DEFAULT_LOCALE, 'en');
  assert.deepEqual(SUPPORTED_LOCALES, [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
  ]);
  assert.deepEqual(Object.keys(LOCALIZATION).sort(), ['de', 'en']);
});

test('German has exactly the English catalog shape', () => {
  walkPairs(LOCALIZATION.en, LOCALIZATION.de);
});

test('German strings are populated wherever English has copy', () => {
  for (const [path, english, german] of walkPairs(LOCALIZATION.en, LOCALIZATION.de)) {
    assert.equal(typeof german, 'string', `${path} German value must be a string`);
    if (english === '') {
      assert.equal(german, '', `${path} is intentionally empty in English and must stay empty`);
      continue;
    }
    assert.ok(german.trim().length > 0, `${path} German value is empty`);
    assert.equal(/^\{[A-Za-z][A-Za-z0-9_]*\}$/.test(german.trim()), false, `${path} is only a placeholder`);
  }
});

test('named placeholders match exactly between English and German', () => {
  for (const [path, english, german] of walkPairs(LOCALIZATION.en, LOCALIZATION.de)) {
    assert.deepEqual(tokens(german), tokens(english), `${path} placeholder set differs`);
  }
});

import { EXPLAIN_NOTES, HELP_ABBREVIATIONS, HELP_SECTIONS } from '../dist/data/help-topics.js';
import { TUTORIAL_STEPS } from '../dist/game/tutorial.js';

const sorted = values => [...values].sort();

function assertExactKeys(actual, expected, label) {
  assert.deepEqual(sorted(Object.keys(actual)), sorted(expected), `${label} localization keys drifted`);
}

test('static browser shell and install metadata have localization entries', () => {
  const shell = LOCALIZATION.en.ui.shell;
  assert.equal(shell.documentTitle, 'Reality Consumption Engine — Browser Edition');
  assert.equal(shell.explainAria, 'Toggle explain mode: annotate every panel with what it is, where it is and why it matters');
  assert.equal(shell.worldVisualizationAria, 'Scrollable civilization visualization');
  assert.equal(shell.machineRecord, 'MACHINE RECORD');
  assert.equal(shell.pwaDescription, 'Cultivate civilizations, shape their histories, and harvest reality.');
  assert.ok(LOCALIZATION.de.ui.shell.pwaDescription.includes('Zivilisation'));
});

test('Help sections, topics, abbreviations, and explain notes are fully localized', () => {
  for (const locale of ['en', 'de']) {
    const help = LOCALIZATION[locale].help;
    assertExactKeys(help.sections, HELP_SECTIONS.map(section => section.id), `${locale}.help.sections`);
    for (const section of HELP_SECTIONS) {
      const localized = help.sections[section.id];
      assertExactKeys(localized.topics, section.topics.map(topic => topic.id), `${locale}.help.sections.${section.id}.topics`);
    }
    assertExactKeys(help.abbreviations, Object.keys(HELP_ABBREVIATIONS), `${locale}.help.abbreviations`);
    assertExactKeys(help.explainNotes, Object.keys(EXPLAIN_NOTES), `${locale}.help.explainNotes`);
  }
});

test('Tutorial steps are keyed by their stable tutorial IDs', () => {
  for (const locale of ['en', 'de']) {
    assertExactKeys(LOCALIZATION[locale].tutorial.steps, TUTORIAL_STEPS.map(step => step.id), `${locale}.tutorial.steps`);
  }
});

import { TACTICAL_ACTIONS } from '../dist/game/tactical-actions.js';
import { DIRECTIVE_OBJECTIVES } from '../dist/game/run-directives.js';
import { MILESTONE_CATALOG } from '../dist/game/milestones.js';
import { HARVEST_GRADE_LABELS } from '../dist/game/harvest-quality.js';

const GUIDANCE_IDS = [
  'cascade', 'collapse_imminent', 'decision_pending', 'convergence_ready', 'convergence_short',
  'entropy_critical', 'harvest_window', 'cosmic_attention', 'civilization_awareness', 'sanity_failing',
  'premature', 'credit_cap', 'closing', 'objective_open', 'building',
];
const MACHINE_GUIDANCE_IDS = [
  'pick_directive', 'collapse_multiverse', 'consume_universe', 'read_report',
  'spend_bank', 'first_run', 'start_run',
];

test('gameplay definition IDs all have localization entries', () => {
  for (const locale of ['en', 'de']) {
    assertExactKeys(LOCALIZATION[locale].tacticalActions.actions, Object.keys(TACTICAL_ACTIONS), `${locale}.tacticalActions.actions`);
    assertExactKeys(LOCALIZATION[locale].content.directives.objectives, Object.keys(DIRECTIVE_OBJECTIVES), `${locale}.content.directives.objectives`);
    assertExactKeys(LOCALIZATION[locale].content.milestones, MILESTONE_CATALOG.map(item => item.id), `${locale}.content.milestones`);
    assertExactKeys(LOCALIZATION[locale].reports.harvestGrades, Object.keys(HARVEST_GRADE_LABELS), `${locale}.reports.harvestGrades`);
    assertExactKeys(LOCALIZATION[locale].guidance.civilization, GUIDANCE_IDS, `${locale}.guidance.civilization`);
    assertExactKeys(LOCALIZATION[locale].guidance.machine, MACHINE_GUIDANCE_IDS, `${locale}.guidance.machine`);
  }
});

import { CONTENT } from '../dist/data/content.generated.js';

const UPGRADE_DEFINITIONS = [
  ...CONTENT.machine_upgrades,
  ...CONTENT.universe_upgrades,
  ...CONTENT.axiom_upgrades,
];

function assertEntityCoverage(localized, source, label) {
  assertExactKeys(localized, source.map(item => item.id), label);
}

test('generated named entities are represented by stable source IDs', () => {
  for (const locale of ['en', 'de']) {
    const content = LOCALIZATION[locale].content;
    assertEntityCoverage(content.traits, CONTENT.traits, `${locale}.content.traits`);
    assertEntityCoverage(content.upgrades, UPGRADE_DEFINITIONS, `${locale}.content.upgrades`);
    assertEntityCoverage(content.mutations, CONTENT.mutations, `${locale}.content.mutations`);
    assertEntityCoverage(content.directives.catalog, CONTENT.directives, `${locale}.content.directives.catalog`);
    assertEntityCoverage(content.breedingMatrices, CONTENT.breeding_matrices, `${locale}.content.breedingMatrices`);
    assertExactKeys(content.paths, Object.keys(CONTENT.path_definitions), `${locale}.content.paths`);
  }
});

test('English entity catalog mirrors current source copy and German preserves canonical names', () => {
  const groups = [
    ['traits', CONTENT.traits],
    ['mutations', CONTENT.mutations],
    ['breedingMatrices', CONTENT.breeding_matrices],
  ];
  for (const [key, source] of groups) {
    for (const item of source) {
      assert.equal(LOCALIZATION.en.content[key][item.id].name, item.name, `${key}.${item.id}.name English drift`);
      assert.equal(LOCALIZATION.de.content[key][item.id].name, item.name, `${key}.${item.id}.name must remain canonical English`);
      assert.equal(LOCALIZATION.en.content[key][item.id].description, item.description, `${key}.${item.id}.description English drift`);
    }
  }
  for (const item of UPGRADE_DEFINITIONS) {
    assert.equal(LOCALIZATION.en.content.upgrades[item.id].name, item.name, `upgrades.${item.id}.name English drift`);
    assert.equal(LOCALIZATION.de.content.upgrades[item.id].name, item.name, `upgrades.${item.id}.name must remain canonical English`);
  }
  for (const item of CONTENT.directives) {
    assert.equal(LOCALIZATION.en.content.directives.catalog[item.id].name, item.name, `directives.${item.id}.name English drift`);
    assert.equal(LOCALIZATION.de.content.directives.catalog[item.id].name, item.name, `directives.${item.id}.name must remain canonical English`);
    assert.equal(LOCALIZATION.en.content.directives.catalog[item.id].description, item.description, `directives.${item.id}.description English drift`);
  }
  for (const [id, definition] of Object.entries(CONTENT.path_definitions)) {
    assert.equal(LOCALIZATION.en.content.paths[id].name, definition.name, `paths.${id}.name English drift`);
    assert.equal(LOCALIZATION.de.content.paths[id].name, definition.name, `paths.${id}.name must remain canonical English`);
  }
});

test('generated lore naming components are fully represented and remain canonical', () => {
  assert.deepEqual(LOCALIZATION.en.content.lore, CONTENT.lore);
  assert.deepEqual(LOCALIZATION.de.content.lore, CONTENT.lore);
});

import { applyEraCeiling, applyInterventionCopy } from '../dist/data/intervention-copy.js';
import { APOTHEOSIS_EVENTS } from '../dist/data/apotheosis-events.js';
import { ENTROPY_CRISES } from '../dist/data/entropy-crises.js';
import { EVENT_CHAINS } from '../dist/data/event-chains.js';
import { EXPANDED_INTERVENTIONS } from '../dist/data/expanded-interventions.js';
import { EXPANDED_DOMINANT_INTERVENTIONS, EXPANDED_PATH_INTERVENTIONS } from '../dist/data/expanded-path-interventions.js';

const EFFECTIVE_EVENTS = [
  ...applyEraCeiling(applyInterventionCopy(CONTENT.events)),
  ...ENTROPY_CRISES,
  ...APOTHEOSIS_EVENTS,
  ...EXPANDED_INTERVENTIONS,
  ...EXPANDED_PATH_INTERVENTIONS,
  ...EXPANDED_DOMINANT_INTERVENTIONS,
  ...EVENT_CHAINS,
];

test('effective event IDs are unique and every event is localized', () => {
  const ids = EFFECTIVE_EVENTS.map(event => event.id);
  assert.equal(new Set(ids).size, ids.length, 'effective event IDs must be unique localization keys');
  for (const locale of ['en', 'de']) assertExactKeys(LOCALIZATION[locale].content.events, ids, `${locale}.content.events`);
});

test('event titles stay canonical and every positional choice remains aligned', () => {
  for (const event of EFFECTIVE_EVENTS) {
    const en = LOCALIZATION.en.content.events[event.id];
    const de = LOCALIZATION.de.content.events[event.id];
    assert.equal(en.title, event.title, `${event.id}.title English drift`);
    assert.equal(de.title, event.title, `${event.id}.title must remain canonical English`);
    assert.equal(en.body, event.body, `${event.id}.body English drift`);
    assert.equal(en.choices.length, event.choices.length, `${event.id} English choice count drift`);
    assert.equal(de.choices.length, event.choices.length, `${event.id} German choice count drift`);
    for (let index = 0; index < event.choices.length; index++) {
      const source = event.choices[index];
      assert.equal(en.choices[index].label, source.label, `${event.id}.choices[${index}].label English drift`);
      assert.equal(en.choices[index].prediction, source.prediction, `${event.id}.choices[${index}].prediction English drift`);
    }
  }
});

test('current event inventory remains the expected approved baseline', () => {
  assert.equal(EFFECTIVE_EVENTS.length, 185);
  assert.equal(EFFECTIVE_EVENTS.reduce((sum, event) => sum + event.choices.length, 0), 389);
});

import { RUN_INTERVENTIONS } from '../dist/game/run-interventions.js';
import { balancedMachineUpgrades, balancedUniverseUpgrades, balancedAxiomUpgrades } from '../dist/game/upgrade-balance.js';

const EFFECTIVE_UPGRADES = [
  ...balancedMachineUpgrades(CONTENT.machine_upgrades),
  ...balancedUniverseUpgrades(CONTENT.universe_upgrades),
  ...balancedAxiomUpgrades(CONTENT.axiom_upgrades),
];

test('runtime-visible upgrade descriptions mirror the balanced catalogs', () => {
  for (const definition of EFFECTIVE_UPGRADES) {
    assert.equal(LOCALIZATION.en.content.upgrades[definition.id].description, definition.description, `${definition.id}.description must match runtime-visible copy`);
  }
});

test('Machine Reserve interventions are fully localized by stable ID', () => {
  for (const locale of ['en', 'de']) {
    assertExactKeys(LOCALIZATION[locale].content.interventions, RUN_INTERVENTIONS.map(item => item.id), `${locale}.content.interventions`);
  }
  for (const definition of RUN_INTERVENTIONS) {
    const en = LOCALIZATION.en.content.interventions[definition.id];
    const de = LOCALIZATION.de.content.interventions[definition.id];
    assert.equal(en.title, definition.title);
    assert.equal(de.title, definition.title, `${definition.id}.title must remain canonical English`);
    assert.equal(en.label, definition.label);
    assert.equal(en.summary, definition.summary);
  }
});

test('event path-history copy is represented wherever the runtime can append it', () => {
  for (const event of EFFECTIVE_EVENTS) {
    const en = LOCALIZATION.en.content.events[event.id];
    const de = LOCALIZATION.de.content.events[event.id];
    for (let index = 0; index < event.choices.length; index++) {
      const sourceHistory = event.choices[index].path_history;
      if (!sourceHistory) {
        assert.equal('history' in en.choices[index], false, `${event.id}.choices[${index}] must not invent English path history`);
        assert.equal('history' in de.choices[index], false, `${event.id}.choices[${index}] must not invent German path history`);
        continue;
      }
      assert.equal(en.choices[index].history, sourceHistory, `${event.id}.choices[${index}].history English drift`);
      assert.ok(de.choices[index].history?.trim(), `${event.id}.choices[${index}].history German translation missing`);
    }
  }
});

test('choice flags surfaced by decision feedback have stable localized labels', () => {
  const pathFlags = new Set();
  const flags = new Set();
  for (const event of EFFECTIVE_EVENTS) {
    for (const choice of event.choices ?? []) {
      if (choice.path_flag_add) pathFlags.add(String(choice.path_flag_add));
      const flag = choice.effects?.flag_add;
      if (flag) flags.add(String(flag));
    }
  }
  for (const locale of ['en', 'de']) {
    assertExactKeys(LOCALIZATION[locale].content.pathFlags, [...pathFlags].sort(), locale + '.content.pathFlags');
    assertExactKeys(LOCALIZATION[locale].content.flags, [...flags].sort(), locale + '.content.flags');
  }
});

test('endgame state labels used by history and victory screens are localized', () => {
  const ids = [
    'endgame_biological_transcendence', 'endgame_bureaucratic_singularity', 'endgame_collective_mind',
    'endgame_cosmic_resistance', 'endgame_machine_faith', 'endgame_post_mortal',
    'endgame_reality_engineering', 'endgame_recursive_simulation', 'endgame_temporal_dominion', 'endgame_void_communion',
  ];
  for (const locale of ['en', 'de']) assertExactKeys(LOCALIZATION[locale].content.endgameStates, ids, locale + '.content.endgameStates');
});
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function tsFiles(root, prefix = '') {
  const entries = await readdir(root, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const rel = path.posix.join(prefix, entry.name);
    const abs = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...await tsFiles(abs, rel));
    else if (entry.isFile() && entry.name.endsWith('.ts')) result.push(rel);
  }
  return result.sort();
}

const AUDITED_SOURCE_FILES = [
  'data/apotheosis-events.ts', 'data/content.generated.ts', 'data/entropy-crises.ts', 'data/event-chains.ts',
  'data/expanded-interventions.ts', 'data/expanded-path-interventions.ts', 'data/help-topics.ts', 'data/i18n.ts',
  'data/intervention-copy.ts',
  'data/localization.ts',
  'game/consequence-profiles.ts', 'game/convergence.ts', 'game/decision-consequences.ts', 'game/decision-feedback.ts',
  'game/development.ts', 'game/drama.ts', 'game/effects.ts', 'game/engine.ts', 'game/guidance.ts', 'game/harvest-quality.ts',
  'game/intervention-scheduler.ts', 'game/lore.ts', 'game/milestones.ts', 'game/paths.ts', 'game/pressure.ts',
  'game/progression.ts', 'game/rules.ts', 'game/run-directives.ts', 'game/run-interventions.ts', 'game/run-report.ts',
  'game/save-migration.ts', 'game/stat-drift.ts', 'game/tactical-actions.ts', 'game/tutorial.ts', 'game/types.ts',
  'game/upgrade-balance.ts', 'game/world-memory.ts', 'main.ts', 'render/agents.ts', 'render/consequence-presentation.ts',
  'render/construction.ts', 'render/draw-surface.ts', 'render/factions.ts', 'render/identity.ts', 'render/primitives.ts',
  'render/quality.ts', 'render/settlements.ts', 'render/species.ts', 'render/structures.ts', 'render/world-memory.ts',
  'render/world-model.ts', 'render/world-presentation.ts', 'render/world.ts', 'ui/app.ts', 'ui/format.ts',
  'ui/guide-view.ts', 'ui/report-view.ts', 'ui/tutorial-view.ts', 'ui/view-model.ts',
];

test('every game TypeScript source file is included in the localization audit inventory', async () => {
  const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));
  assert.deepEqual(await tsFiles(sourceRoot), AUDITED_SOURCE_FILES);
});

// --- The runtime -------------------------------------------------------------------------------
// The catalog above is data. What follows pins the one mutable thing about it -- which locale is
// active -- and the rule that makes a switch honest: nothing captures a string at import time.
import { activeLocale, fill, isLocale, setActiveLocale, text } from '../dist/data/i18n.js';
import { GameEngine } from '../dist/game/engine.js';
import { buildViewModel, civilizationRenderKey } from '../dist/ui/view-model.js';

function withLocale(locale, body) {
  const previous = activeLocale();
  setActiveLocale(locale);
  try { return body(); } finally { setActiveLocale(previous); }
}

test('the active locale starts at the default and text() follows it', () => {
  assert.equal(activeLocale(), DEFAULT_LOCALE);
  assert.equal(text().ui.shell.brandName, LOCALIZATION.en.ui.shell.brandName);
  withLocale('de', () => assert.equal(text().ui.shell.footerTech, LOCALIZATION.de.ui.shell.footerTech));
  assert.equal(activeLocale(), DEFAULT_LOCALE);
});

test('setActiveLocale reports whether anything changed and refuses unknown codes', () => {
  assert.equal(isLocale('de'), true);
  assert.equal(isLocale('fr'), false);
  assert.equal(isLocale(null), false);
  withLocale('en', () => {
    assert.equal(setActiveLocale('en'), false, 're-picking the active locale is not a change');
    assert.equal(setActiveLocale('de'), true);
    assert.equal(activeLocale(), 'de');
  });
});

test('fill substitutes named placeholders and leaves an unknown token standing', () => {
  assert.equal(fill('COST {cost} {currency}', { cost: 12, currency: 'causal mass' }), 'COST 12 causal mass');
  // A visible `{depth}` is a bug someone reports; an empty gap is one that ships.
  assert.equal(fill('DEPTH {depth}', {}), 'DEPTH {depth}');
  assert.equal(fill('no tokens', { depth: 1 }), 'no tokens');
});

function memoryStorage(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    store,
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
  };
}
const LOCALE_KEY = 'reality_consumption_engine_locale';

test('the engine persists the chosen locale under its own key', () => {
  const storage = memoryStorage();
  const engine = new GameEngine({ storage });
  try {
    assert.equal(engine.locale(), DEFAULT_LOCALE);
    assert.equal(engine.setLocale('de'), true);
    assert.equal(storage.store.get(LOCALE_KEY), 'de');
    assert.equal(engine.setLocale('de'), false, 'the same locale twice is not a change');
    assert.equal(engine.setLocale('fr'), false, 'an unsupported locale is refused');
    assert.equal(engine.locale(), 'de');
  } finally { setActiveLocale(DEFAULT_LOCALE); }
});

test('engine initialization catches and ignores storage errors when restoring locale', () => {
  const storage = memoryStorage();
  const originalGetItem = storage.getItem;
  storage.getItem = (key) => {
    if (key === LOCALE_KEY) throw new Error('simulated storage error');
    return originalGetItem(key);
  };

  // A locale other than the default, so the assertion below distinguishes "the failed read left the
  // active locale alone" from "it reset the language to English".
  setActiveLocale('de');
  try {
    assert.doesNotThrow(() => {
      const engine = new GameEngine({ storage, autosave: false });
      assert.equal(engine.locale(), 'de');
    });
  } finally { setActiveLocale(DEFAULT_LOCALE); }
});

test('erasing the save keeps the language the player reads the game in', () => {
  const storage = memoryStorage();
  const engine = new GameEngine({ storage });
  try {
    engine.setLocale('de');
    engine.deleteSave();
    assert.equal(storage.store.get(LOCALE_KEY), 'de', 'the locale is a device preference, not run state');
    assert.equal(engine.locale(), 'de');
  } finally { setActiveLocale(DEFAULT_LOCALE); }
});

const SAVE_SLOT = 'reality_consumption_engine_browser_save_v2';

test('a stored locale is restored before the save is read, so a migration notice is localized', () => {
  // A real save marked as v1 forces the migrator to speak, and it speaks while the engine is still
  // being constructed -- which is the whole reason the locale is read from storage before the save.
  const seeded = memoryStorage();
  new GameEngine({ storage: seeded }).save();
  const stored = JSON.parse(seeded.store.get(SAVE_SLOT));
  const storage = memoryStorage({ [LOCALE_KEY]: 'de', [SAVE_SLOT]: JSON.stringify({ ...stored, saveVersion: 1 }) });
  const engine = new GameEngine({ storage });
  try {
    assert.equal(engine.locale(), 'de');
    const notice = buildViewModel(engine).messages.find(message => message.includes('v1'));
    assert.ok(notice, 'the migration must have been announced');
    assert.equal(notice, fill(LOCALIZATION.de.reports.saveMigration.migrated, { fromVersion: 1, toVersion: stored.saveVersion, runNote: '' }));
  } finally { setActiveLocale(DEFAULT_LOCALE); }
});

test('an engine that does not autosave does not write the locale preference either', () => {
  const storage = memoryStorage();
  const engine = new GameEngine({ storage, autosave: false });
  try {
    assert.equal(engine.setLocale('de'), true, 'the switch still applies in memory');
    assert.equal(storage.store.has(LOCALE_KEY), false);
  } finally { setActiveLocale(DEFAULT_LOCALE); }
});

test('the locale is a band in the structural render key, so a switch rebuilds the panel column', () => {
  const engine = new GameEngine({ storage: memoryStorage(), autosave: false });
  try {
    engine.startCivilization(4242);
    const before = civilizationRenderKey(buildViewModel(engine));
    engine.setLocale('de');
    const after = civilizationRenderKey(buildViewModel(engine));
    assert.notEqual(after, before, 'without this the column keeps the language the run started in');
    // And it is the only thing that moved: the rest of the key is unchanged state.
    assert.equal(before.replace(`|${DEFAULT_LOCALE}|`, '|de|'), after);
  } finally { setActiveLocale(DEFAULT_LOCALE); }
});

test('a locale switch reaches copy the engine composes, not just static labels', () => {
  const engine = new GameEngine({ storage: memoryStorage(), autosave: false });
  try {
    engine.startCivilization(4242);
    engine.forceEvent('mirror_delay');
    const english = buildViewModel(engine);
    engine.setLocale('de');
    const german = buildViewModel(engine);
    // Event bodies and choice labels are translated; the title is canonical in both, by design.
    assert.equal(german.event.title, english.event.title);
    assert.notEqual(german.event.body, english.event.body);
    assert.notEqual(german.event.choices[0].label, english.event.choices[0].label);
    assert.notEqual(german.situation.cause, english.situation.cause);
    assert.notEqual(german.tactical.actions[0].reason || 'x', 'x');
  } finally { setActiveLocale(DEFAULT_LOCALE); }
});

test('the static shell in index.html says exactly what the English catalog says', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const shell = LOCALIZATION.en.ui.shell;
  // index.html is the first paint, before any module runs, so its English must not drift from the
  // catalog `main.ts` replaces it with one frame later.
  assert.match(html, new RegExp(`<title>${shell.documentTitle}</title>`));
  assert.match(html, new RegExp(`<b>${shell.brandName}</b>`));
  assert.match(html, new RegExp(`<small>${shell.brandNode}</small>`));
  assert.match(html, new RegExp(`aria-label="${shell.explainAria}"`));
  assert.match(html, new RegExp(`aria-label="${shell.worldVisualizationAria}"`));
  assert.match(html, new RegExp(`>${shell.machineRecord}<`));
  assert.match(html, new RegExp(`aria-label="${shell.languageLabel}"`));
});

test('main.ts rewrites every shell string and hosts the locale switcher', async () => {
  const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  // Every `ui.shell` key except the three the web app manifest owns has to be applied by the shell
  // pass, or a locale switch leaves part of the chrome in the previous language.
  const applied = Object.keys(LOCALIZATION.en.ui.shell).filter(key => !key.startsWith('pwa'));
  for (const key of applied) assert.match(main, new RegExp(`shell\\.${key}\\b`), `main.ts must apply ui.shell.${key}`);
  assert.match(main, /#locale-select/);
  assert.match(main, /SUPPORTED_LOCALES/);
  assert.match(main, /engine\.setLocale\(/);
  assert.match(main, /applyShellText\(\)/);
});

// --- Nothing structural reaches a sentence, and nothing on screen keeps a stale language ---------
import { fmt } from '../dist/ui/format.js';
import { Progression } from '../dist/game/progression.js';

test('abbreviated numbers are written in the active number locale', () => {
  // The unabbreviated branch always went through `toLocaleString`; the K and M branches used
  // `toFixed`, which writes a decimal point whatever the locale says.
  assert.equal(LOCALIZATION.de.ui.format.numberLocale, 'de-DE');
  assert.deepEqual([999, 1500, 12345, 1500000].map(fmt), ['999', '1.5K', '12.3K', '1.50M']);
  withLocale('de', () => {
    assert.deepEqual([999, 1500, 12345, 1500000].map(fmt), ['999', '1,5K', '12,3K', '1,50M']);
  });
});

test('the running Directive objective is localized, not just the offers', () => {
  const engine = new GameEngine({ storage: memoryStorage(), autosave: false });
  try {
    engine.state.meta.progression.unlockedSystems.push('directives');
    engine.state.meta.progression.knownDirectives = CONTENT.directives.map(item => item.id);
    engine.prepareNextRun(777);
    const selected = engine.state.machine.runBuild.directiveOfferIds[0];
    assert.equal(engine.selectDirective(selected), true);
    engine.startCivilization(91);
    const english = buildViewModel(engine).directiveObjective;
    engine.setLocale('de');
    const german = buildViewModel(engine).directiveObjective;
    assert.equal(german.id, english.id);
    assert.equal(german.description, LOCALIZATION.de.content.directives.objectives[selected].description);
    assert.notEqual(german.description, english.description, 'the objective card followed the switch');
  } finally { setActiveLocale(DEFAULT_LOCALE); }
});

test('a decision feedback card still on screen follows a locale switch', () => {
  const engine = new GameEngine({ storage: memoryStorage(), autosave: false });
  try {
    engine.startCivilization(4242);
    engine.forceEvent('mirror_delay');
    engine.chooseEvent(0);
    const english = buildViewModel(engine).feedback;
    engine.setLocale('de');
    const german = buildViewModel(engine).feedback;
    // The heading is the event and the choice that was taken -- resolved again from the event id and
    // the choice index, because the card outlives the decision.
    assert.equal(german.eventTitle, english.eventTitle, 'event titles are canonical in both locales');
    assert.equal(german.choiceLabel, LOCALIZATION.de.content.events.mirror_delay.choices[0].label);
    assert.notEqual(german.choiceLabel, english.choiceLabel);
    for (const item of german.metrics) assert.equal(item.label, LOCALIZATION.de.reports.decisionFeedback.metrics[item.key]);
    for (const item of german.additions) assert.equal(item.kindLabel, LOCALIZATION.de.reports.decisionFeedback.additionKinds[item.kind]);
  } finally { setActiveLocale(DEFAULT_LOCALE); }
});

test('a synthetic decision names itself from the id the engine built it from', () => {
  const engine = new GameEngine({ storage: memoryStorage(), autosave: false });
  try {
    engine.startCivilization(4242);
    engine.state.civilization.stats.stability = 50;
    assert.equal(engine.useTacticalAction('stabilize'), true);
    const english = buildViewModel(engine).feedback;
    assert.equal(english.eventId, 'tactical:stabilize');
    assert.equal(english.choiceIndex, undefined, 'a tactical action is not one of an event’s choices');
    engine.setLocale('de');
    const german = buildViewModel(engine).feedback;
    assert.equal(german.choiceLabel, LOCALIZATION.de.tacticalActions.actions.stabilize.label);
    assert.notEqual(german.choiceLabel, english.choiceLabel);
  } finally { setActiveLocale(DEFAULT_LOCALE); }
});

test('currencies, grades and unlocked options are named, never spelled out from their id', () => {
  const engine = new GameEngine({ storage: memoryStorage(), autosave: false });
  engine.state.meta.progression.machineInsight = 25;
  engine.state.meta.progression.unlockedSystems = ['directives', 'breeding_matrices', 'axioms', 'universe_upgrades'];
  const announcements = [];
  Progression.refresh(engine.state, announcements);
  const options = announcements.filter(message => message.includes('OPTION'));
  // A matrix is not called "NEURAL BLOOM" and an axiom's name is a whole sentence; neither survives
  // being reconstructed from its key.
  assert.ok(options.some(message => message.endsWith(LOCALIZATION.en.content.breedingMatrices.neural_bloom.name)));
  assert.ok(options.some(message => message.endsWith(LOCALIZATION.en.content.upgrades.axiom_stability.name)));
  assert.equal(options.filter(message => /_/.test(message)).length, 0, 'no id may reach the log');

  // The reserve rail prices a commitment in a named resource, and the report grades a run by name.
  engine.startCivilization(4242);
  const reason = buildViewModel(engine).machineReserve.map(entry => entry.reason).join(' ');
  assert.equal(/causal mass|causal_mass/.test(reason), false, `a humanized key reached the rail: ${reason}`);
  engine.harvest(false);
  assert.match(engine.lastRunReport().reasonDetail, new RegExp(LOCALIZATION.en.reports.harvestGrades.premature));
});
