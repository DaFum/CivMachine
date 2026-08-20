import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine, SAVE_BACKUP_KEY } from '../dist/game/engine.js';
import { SAVE_VERSION, createNewState, upgradeCost } from '../dist/game/rules.js';
import {
  OLDEST_MIGRATABLE_SAVE_VERSION, SAVE_MIGRATIONS, migrateSaveState, parseSaveText,
} from '../dist/game/save-migration.js';
import { freshEngine } from './balance-harness.mjs';

const SAVE_KEY = 'reality_consumption_engine_browser_save_v2';

function storageWith(entries = {}) {
  const map = new Map(Object.entries(entries));
  return {
    map,
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: key => map.delete(key),
  };
}

// A save that carries progress worth losing: unlocks, banked residue, upgrade levels and a run.
function progressedState() {
  const engine = freshEngine();
  engine.state.machine.currencies.causal_mass = 4200;
  engine.state.machine.upgradeLevels.harvest_yield = 6;
  engine.state.machine.civilizationsTotal = 17;
  engine.state.meta.universalResidue = 91;
  engine.state.meta.convergences = 2;
  engine.state.meta.progression.machineInsight = 23;
  engine.state.meta.progression.unlockedSystems.push('directives', 'universe_upgrades');
  engine.state.meta.progression.milestones.first_universe = true;
  engine.startCivilization(4711);
  engine.state.civilization.years = 3000;
  engine.state.civilization.era = 1;
  engine.state.civilization.development = 140;
  return structuredClone(engine.state);
}

function engineOn(storage) {
  return new GameEngine({ storage });
}

test('the migration chain is contiguous from the oldest supported save up to SAVE_VERSION', () => {
  assert.equal(OLDEST_MIGRATABLE_SAVE_VERSION, 1);
  assert.equal(SAVE_MIGRATIONS.at(-1).to, SAVE_VERSION);
  const ids = new Set();
  for (let index = 0; index < SAVE_MIGRATIONS.length; index++) {
    const step = SAVE_MIGRATIONS[index];
    assert.equal(step.from, OLDEST_MIGRATABLE_SAVE_VERSION + index, `step ${index} starts at the wrong version`);
    assert.equal(step.to, step.from + 1, 'a step must cross exactly one version boundary');
    assert.equal(ids.has(step.id), false, `duplicate step id ${step.id}`);
    ids.add(step.id);
  }
});

test('a save written by this version loads byte-for-byte and needs no backup', () => {
  const state = progressedState();
  const { state: loaded, report } = parseSaveText(JSON.stringify(state));
  assert.equal(report.status, 'current');
  assert.equal(report.repairCount, 0);
  assert.equal(report.keepBackup, false);
  assert.equal(report.notice, '');
  assert.deepEqual(loaded, state);
});

test('an older save is migrated instead of discarded, keeping every progress field', () => {
  const state = progressedState();
  const stored = { ...structuredClone(state), saveVersion: 3 };
  const { state: loaded, report } = parseSaveText(JSON.stringify(stored));
  assert.equal(report.status, 'migrated');
  assert.equal(report.fromVersion, 3);
  assert.equal(report.toVersion, SAVE_VERSION);
  assert.deepEqual(report.steps, ['v3_to_v4_structural']);
  assert.equal(loaded.saveVersion, SAVE_VERSION);
  assert.equal(loaded.machine.currencies.causal_mass, 4200);
  assert.equal(loaded.machine.upgradeLevels.harvest_yield, 6);
  assert.equal(loaded.machine.civilizationsTotal, 17);
  assert.equal(loaded.meta.universalResidue, 91);
  assert.equal(loaded.meta.convergences, 2);
  assert.equal(loaded.meta.progression.machineInsight, 23);
  assert.deepEqual(loaded.meta.progression.unlockedSystems, state.meta.progression.unlockedSystems);
  assert.equal(loaded.meta.progression.milestones.first_universe, true);
  assert.equal(loaded.civilization.seed, 4711);
  assert.equal(loaded.civilization.years, 3000);
});

test('a save from the oldest supported version walks every step of the chain', () => {
  const stored = { ...progressedState(), saveVersion: 1 };
  const { report } = parseSaveText(JSON.stringify(stored));
  assert.equal(report.status, 'migrated');
  assert.deepEqual(report.steps, SAVE_MIGRATIONS.map(step => step.id));
});

test('a save with no version at all is treated as the oldest one rather than thrown away', () => {
  const stored = progressedState();
  delete stored.saveVersion;
  const { state, report } = parseSaveText(JSON.stringify(stored));
  assert.equal(report.status, 'migrated');
  assert.equal(report.fromVersion, OLDEST_MIGRATABLE_SAVE_VERSION);
  assert.equal(state.meta.universalResidue, 91);
});

// The point of the structural pass: a version bump that only adds fields needs no step at all.
test('fields added since the save was written are back-filled from the current defaults', () => {
  const stored = structuredClone(progressedState());
  stored.saveVersion = 3;
  delete stored.meta.progression.maxEndgamesInRun;
  delete stored.meta.progression.longestRunSeconds;
  delete stored.machine.runBuild.previewTraitIds;
  delete stored.civilization.tactical.actionUsage;
  const fresh = createNewState();
  const { state, report } = parseSaveText(JSON.stringify(stored));
  assert.equal(report.status, 'migrated');
  assert.equal(state.meta.progression.maxEndgamesInRun, fresh.meta.progression.maxEndgamesInRun);
  assert.equal(state.meta.progression.longestRunSeconds, fresh.meta.progression.longestRunSeconds);
  assert.deepEqual(state.machine.runBuild.previewTraitIds, []);
  assert.deepEqual(state.civilization.tactical.actionUsage, { stabilize: 0, accelerate: 0, probe: 0, vent: 0 });
  assert.ok(report.repairs.includes('state.meta.progression.maxEndgamesInRun'));
  // Still the same save: back-filling a default is not permission to reset the numbers around it.
  assert.equal(state.meta.progression.machineInsight, 23);
});

test('fields the current version no longer knows ride along without touching the rest', () => {
  const stored = structuredClone(progressedState());
  stored.saveVersion = 2;
  stored.meta.progression.retired_counter = 5;
  stored.machine.retiredBank = { causal_mass: 12 };
  const { state } = parseSaveText(JSON.stringify(stored));
  // Unknown fields ride along rather than being deleted, so a build that still reads them keeps
  // working -- but nothing in the current shape is disturbed by their presence.
  assert.equal(state.meta.progression.retired_counter, 5);
  assert.deepEqual(state.machine.retiredBank, { causal_mass: 12 });
  assert.equal(state.meta.progression.machineInsight, 23);
  assert.equal(state.machine.currencies.causal_mass, 4200);
  assert.equal(state.saveVersion, SAVE_VERSION);
});

test('non-finite and wrongly typed values are repaired to defaults, not left to poison the run', () => {
  const stored = structuredClone(progressedState());
  stored.meta.universalResidue = 'lots';
  stored.simulationSpeed = 0;
  stored.phase = 'somewhere_else';
  stored.meta.progression.unlockedSystems = ['civilization', 42, 'directives'];
  const { state, report } = parseSaveText(JSON.stringify({ ...stored, machine: { ...stored.machine, currencies: { ...stored.machine.currencies, cognition: null } } }));
  assert.equal(report.status, 'repaired');
  assert.ok(report.repairCount >= 4);
  assert.equal(state.machine.currencies.cognition, 0);
  assert.equal(state.meta.universalResidue, 0);
  assert.equal(state.simulationSpeed, 1);
  assert.equal(state.phase, 'machine');
  assert.deepEqual(state.meta.progression.unlockedSystems, ['civilization', 'directives']);
  // The untouched fields are still exactly what the player earned.
  assert.equal(state.machine.currencies.causal_mass, 4200);
  assert.equal(state.meta.progression.machineInsight, 23);
});

test('a run that cannot be simulated is dropped while the Machine survives', () => {
  const stored = structuredClone(progressedState());
  delete stored.civilization.seed;
  const { state, report } = parseSaveText(JSON.stringify(stored));
  assert.equal(report.runDropped, true);
  assert.equal(report.status, 'repaired');
  assert.equal(state.civilization, null);
  assert.equal(state.phase, 'machine');
  assert.equal(state.meta.progression.machineInsight, 23);
  assert.match(report.notice, /in-progress civilization could not be restored/);
});

test('a phase without a civilization falls back to the Machine instead of an empty screen', () => {
  const stored = structuredClone(progressedState());
  stored.civilization = null;
  const { state, report } = parseSaveText(JSON.stringify(stored));
  assert.equal(state.phase, 'machine');
  assert.equal(report.runDropped, false);
});

test('era is raised to match the years the run actually lived', () => {
  const stored = structuredClone(progressedState());
  stored.civilization.years = 14000;
  stored.civilization.era = 0;
  const { state } = parseSaveText(JSON.stringify(stored));
  assert.equal(state.civilization.era, 3);
});

test('a save from a newer build loads in compatibility mode rather than being wiped', () => {
  const stored = { ...progressedState(), saveVersion: SAVE_VERSION + 3, futureField: { paradox_engine: 3 } };
  const { state, report } = parseSaveText(JSON.stringify(stored));
  assert.equal(report.status, 'ahead');
  assert.equal(report.fromVersion, SAVE_VERSION + 3);
  assert.deepEqual(report.steps, []);
  assert.equal(report.keepBackup, true);
  assert.equal(state.meta.progression.machineInsight, 23);
  // Unrecognised top-level state survives the round trip, so the newer build finds it again.
  assert.deepEqual(state.futureField, { paradox_engine: 3 });
  assert.match(report.notice, /newer build/);
});

test('a save from a newer build keeps its own version marker through a save cycle', () => {
  const stored = JSON.stringify({ ...progressedState(), saveVersion: SAVE_VERSION + 3, futureField: { paradox_engine: 3 } });
  const storage = storageWith({ [SAVE_KEY]: stored });
  const engine = engineOn(storage);
  assert.equal(engine.saveMigration.status, 'ahead');
  // Stamping the marker down to SAVE_VERSION would make the newer build re-run its own migration
  // steps over data it had already written in the newer shape.
  assert.equal(engine.state.saveVersion, SAVE_VERSION + 3);
  engine.save();
  const written = JSON.parse(storage.map.get(SAVE_KEY));
  assert.equal(written.saveVersion, SAVE_VERSION + 3);
  assert.deepEqual(written.futureField, { paradox_engine: 3 });
  assert.equal(storage.map.get(SAVE_BACKUP_KEY), stored);
  // A save at or below the current version is still stamped to it.
  const current = engineOn(storageWith({ [SAVE_KEY]: JSON.stringify({ ...progressedState(), saveVersion: 2 }) }));
  assert.equal(current.state.saveVersion, SAVE_VERSION);
});

test('autosave: false writes nothing at all, backup included', () => {
  const storage = storageWith({ [SAVE_KEY]: JSON.stringify({ ...progressedState(), saveVersion: 3 }) });
  const engine = new GameEngine({ storage, autosave: false });
  assert.equal(engine.saveMigration.status, 'migrated');
  assert.equal(engine.state.machine.currencies.causal_mass, 4200);
  assert.equal(storage.map.has(SAVE_BACKUP_KEY), false);
  assert.equal(JSON.parse(storage.map.get(SAVE_KEY)).saveVersion, 3);
});

// JSON cannot carry NaN or Infinity -- `JSON.stringify` writes null -- so the non-finite path is only
// reachable through the parsed-object entry point, which is also what a storage shim could hand over.
test('a non-finite number in a parsed payload is repaired and reported', () => {
  const stored = structuredClone(progressedState());
  stored.machine.currencies.cognition = Number.NaN;
  stored.civilization.stats.awareness = Number.POSITIVE_INFINITY;
  const { state, report } = migrateSaveState(stored);
  assert.equal(state.machine.currencies.cognition, 0);
  assert.equal(state.civilization.stats.awareness, 0);
  assert.ok(report.repairs.includes('state.machine.currencies.cognition'));
  assert.equal(report.status, 'repaired');
});

// Records the template declares empty: the structural pass has no element type to check them against,
// so each is validated by hand. `upgradeLevel` reads them straight into the cost formula.
test('per-key record values are typed, whole and non-negative before they reach a cost formula', () => {
  const stored = structuredClone(progressedState());
  stored.machine.upgradeLevels = { harvest_yield: 6, reality_lattice: 'six', prediction_core: 2.7, contingency_vat: -4 };
  stored.meta.universeUpgradeLevels = { wide_lattice: 1e308 };
  stored.meta.axiomLevels = { axiom_stability: null };
  stored.meta.progression.milestones = { first_universe: true, era_expansion: 'yes' };
  stored.civilization.eventCounts = { synthetic_saint: 2, ghost_grid: 'many' };
  stored.civilization.runInterventionUses = { audit: -1 };
  stored.civilization.pathState.recentDeltas = { machine_faith: -3.5, void_communion: 'up' };
  const { state, report } = migrateSaveState(stored);
  assert.equal(state.machine.upgradeLevels.harvest_yield, 6);
  assert.equal('reality_lattice' in state.machine.upgradeLevels, false, 'a string level must not survive');
  assert.equal(state.machine.upgradeLevels.prediction_core, 2);
  assert.equal(state.machine.upgradeLevels.contingency_vat, 0);
  assert.equal(state.meta.universeUpgradeLevels.wide_lattice, Number.MAX_SAFE_INTEGER);
  assert.equal('axiom_stability' in state.meta.axiomLevels, false);
  assert.deepEqual(state.meta.progression.milestones, { first_universe: true });
  assert.equal(state.civilization.eventCounts.synthetic_saint, 2);
  assert.equal('ghost_grid' in state.civilization.eventCounts, false);
  assert.equal(state.civilization.runInterventionUses.audit, 0);
  // A delta is legitimately signed and fractional, so only its type is enforced.
  assert.equal(state.civilization.pathState.recentDeltas.machine_faith, -3.5);
  assert.equal('void_communion' in state.civilization.pathState.recentDeltas, false);
  assert.ok(report.repairCount >= 8);
  // And the cost formula gets a usable number out of every one of them.
  for (const level of Object.values(state.machine.upgradeLevels)) assert.ok(Number.isFinite(upgradeCost(120, 1.6, level)), `level ${level} priced as non-finite`);
});

// An optional field that cannot be read is a discarded field, and the status has to say so.
test('a mistyped optional field is dropped and counted as a repair', () => {
  const stored = structuredClone(progressedState());
  stored.civilization.injectedYears = 'many';
  const { state, report } = migrateSaveState(stored);
  assert.equal('injectedYears' in state.civilization, false);
  assert.ok(report.repairs.includes('civilization.injectedYears'));
  assert.equal(report.status, 'repaired');
  // An absent one is not a repair: the field is optional by design.
  const absent = structuredClone(progressedState());
  delete absent.civilization.injectedYears;
  assert.equal(migrateSaveState(absent).report.status, 'current');
});

test('an unreadable payload is refused without pretending to be a state', () => {
  assert.equal(parseSaveText('{not json').report.status, 'unreadable');
  assert.equal(parseSaveText('{not json').state, null);
  assert.equal(parseSaveText('[1,2,3]').report.status, 'unreadable');
  assert.equal(parseSaveText('"just a string"').report.status, 'unreadable');
  assert.equal(parseSaveText('{"saveVersion":4}').report.status, 'unreadable');
  assert.equal(parseSaveText('').report.status, 'empty');
  assert.equal(parseSaveText(null).report.status, 'empty');
  assert.equal(migrateSaveState(undefined).report.status, 'empty');
});

test('a prototype-polluting payload cannot reach Object.prototype', () => {
  const stored = `{"saveVersion":4,"machine":{"currencies":{"causal_mass":5},"__proto__":{"polluted":true}},"meta":{},"phase":"machine"}`;
  const { state } = parseSaveText(stored);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(state.machine.currencies.causal_mass, 5);
});

test('the engine loads a v3 save and keeps the original bytes as a backup', () => {
  const stored = JSON.stringify({ ...progressedState(), saveVersion: 3 });
  const storage = storageWith({ [SAVE_KEY]: stored });
  const engine = engineOn(storage);
  assert.equal(engine.saveMigration.status, 'migrated');
  assert.equal(engine.state.meta.progression.machineInsight, 23);
  assert.equal(engine.state.machine.currencies.causal_mass, 4200);
  assert.equal(storage.map.get(SAVE_BACKUP_KEY), stored);
  // The brought-forward shape is written back at once, so the next load is a plain v4 load.
  assert.equal(JSON.parse(storage.map.get(SAVE_KEY)).saveVersion, SAVE_VERSION);
  assert.ok(engine.messages.some(message => /migrated from v3/.test(message)));
  const second = engineOn(storage);
  assert.equal(second.saveMigration.status, 'current');
  assert.equal(second.state.machine.currencies.causal_mass, 4200);
});

test('the engine starts fresh on a corrupt save but preserves it for inspection', () => {
  const storage = storageWith({ [SAVE_KEY]: '{"machine":' });
  const engine = engineOn(storage);
  assert.equal(engine.saveMigration.status, 'unreadable');
  assert.equal(engine.state.saveVersion, SAVE_VERSION);
  assert.equal(engine.state.machine.civilizationsTotal, 0);
  assert.equal(storage.map.get(SAVE_BACKUP_KEY), '{"machine":');
  assert.ok(engine.messages.some(message => /could not be read/.test(message)));
});

test('a clean load neither writes a backup nor rewrites the save', () => {
  const stored = JSON.stringify(progressedState());
  const storage = storageWith({ [SAVE_KEY]: stored });
  const writes = [];
  const engine = engineOn({
    getItem: key => storage.getItem(key),
    setItem: (key, value) => { writes.push(key); storage.setItem(key, value); },
    removeItem: key => storage.removeItem(key),
  });
  assert.equal(engine.saveMigration.status, 'current');
  assert.deepEqual(writes, []);
  assert.equal(storage.getItem(SAVE_BACKUP_KEY), null);
});

test('restoreBackup puts the preserved save back and reports when there is nothing to restore', () => {
  const original = progressedState();
  const storage = storageWith({ [SAVE_KEY]: JSON.stringify({ ...structuredClone(original), saveVersion: 3 }) });
  const engine = engineOn(storage);
  engine.state.machine.currencies.causal_mass = 1;
  engine.save();
  assert.equal(engine.restoreBackup(), true);
  assert.equal(engine.state.machine.currencies.causal_mass, 4200);
  assert.equal(engine.state.saveVersion, SAVE_VERSION);
  assert.equal(JSON.parse(storage.map.get(SAVE_KEY)).machine.currencies.causal_mass, 4200);
  // The restored payload is itself a v3 save, so the player is told what the loader did to it.
  assert.ok(engine.messages.some(message => /migrated from v3/.test(message)));
  assert.equal(engineOn(storageWith({})).restoreBackup(), false);
});

test('an erase a storage refuses to perform is reported instead of thrown', () => {
  const engine = new GameEngine({ storage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => { throw new Error('SecurityError'); },
  }});
  assert.doesNotThrow(() => engine.deleteSave());
  assert.ok(engine.messages.some(message => /Erase failed/.test(message)));
  assert.equal(engine.state.meta.progression.machineInsight, 0);
});

test('an explicit erase removes the backup too', () => {
  const storage = storageWith({ [SAVE_KEY]: JSON.stringify({ ...progressedState(), saveVersion: 3 }) });
  const engine = engineOn(storage);
  assert.ok(storage.map.has(SAVE_BACKUP_KEY));
  engine.deleteSave();
  assert.equal(storage.map.has(SAVE_BACKUP_KEY), false);
  assert.equal(engine.state.meta.progression.machineInsight, 0);
});

test('a storage that rejects writes says so once and keeps the game running', () => {
  let reads = 0;
  const engine = new GameEngine({
    storage: {
      getItem: () => { reads++; return null; },
      setItem: () => { throw new Error('QuotaExceededError'); },
      removeItem: () => {},
    },
  });
  assert.ok(reads > 0);
  engine.save();
  engine.save();
  engine.save();
  assert.equal(engine.saveFailed, true);
  assert.equal(engine.messages.filter(message => /Save failed/.test(message)).length, 1);
  assert.equal(engine.state.saveVersion, SAVE_VERSION);
});

test('an in-progress run keeps playing across a migrating load', () => {
  const stored = JSON.stringify({ ...progressedState(), saveVersion: 2 });
  const engine = engineOn(storageWith({ [SAVE_KEY]: stored }));
  assert.equal(engine.state.phase, 'civilization');
  const before = engine.state.civilization.years;
  engine.tick(1);
  assert.ok(engine.state.civilization.years > before);
  assert.equal(engine.state.civilization.seed, 4711);
});
