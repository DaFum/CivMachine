import test from 'node:test';
import assert from 'node:assert/strict';
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
  'data/expanded-interventions.ts', 'data/expanded-path-interventions.ts', 'data/help-topics.ts', 'data/intervention-copy.ts',
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
