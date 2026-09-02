import { clampStats } from './effects.js';
import { fill, text as catalog } from '../data/i18n.js';
import { SAVE_VERSION, createCivilizationTemplate, createNewState, eraForYears } from './rules.js';
import { validRunTrace } from './run-report.js';
// The speed rules live beside the other simulation-speed constants, not here: this module reads them
// to repair a stored save, it does not own them.
import { clampSimulationSpeed, simulationSpeedInsightFor } from './tactical-actions.js';
import { normalizeTutorialState } from './tutorial.js';
import type { Civilization, GameState, Phase, WorldMemoryState } from './types.js';

// The save loader. A stored payload is brought forward in two passes:
//
//   1. the version chain -- one declared step per version boundary, applied in order, each one
//      responsible only for the fields whose *meaning* changed at that boundary;
//   2. the structural pass -- the result is rebuilt field by field against `createNewState()` and
//      `createCivilizationTemplate()`, so a field added or dropped since the save was written gets
//      its current default instead of crashing the engine.
//
// Pass 2 is what makes a version bump cheap: a purely additive `GameState` change needs no step at
// all, because a missing field is already back-filled from the template. A step is only needed when
// an existing field has to be *reinterpreted* -- renamed, rescaled, split or merged.
export type RawSave = Record<string, unknown>;

export type SaveMigrationStatus =
  | 'empty'      // nothing stored
  | 'current'    // written by this version, loaded byte-for-byte
  | 'repaired'   // this version, but fields were missing or non-finite
  | 'migrated'   // an older version, brought forward
  | 'ahead'      // a newer version, loaded in compatibility mode
  | 'unreadable'; // not JSON, or not a game state at all

export interface SaveMigrationStep {
  from: number;
  to: number;
  id: string;
  apply(raw: RawSave): RawSave;
}

export interface SaveMigrationReport {
  status: SaveMigrationStatus;
  fromVersion: number;
  toVersion: number;
  steps: string[];
  repairs: string[];
  repairCount: number;
  runDropped: boolean;
  keepBackup: boolean;
  notice: string;
}

export interface SaveMigrationResult {
  state: GameState | null;
  report: SaveMigrationReport;
}

// One entry per version boundary, contiguous from the oldest supported save up to SAVE_VERSION --
// `save-migration.test.mjs` fails the build if the chain has a gap. v1 through v3 predate this
// repository's history, so no field reinterpretation for them can be reconstructed; their steps are
// declared to keep the chain walkable and let the structural pass carry whatever those saves hold.
//
// When bumping SAVE_VERSION, add the matching step here. Return the same object (mutated or rebuilt)
// -- it is a throwaway parse result, never the live state.
export const SAVE_MIGRATIONS: SaveMigrationStep[] = [
  { from: 1, to: 2, id: 'v1_to_v2_structural', apply: raw => raw },
  { from: 2, to: 3, id: 'v2_to_v3_structural', apply: raw => raw },
  { from: 3, to: 4, id: 'v3_to_v4_structural', apply: raw => raw },
  // v1.20.0 moved simulation speed off Temporal Injector and onto Machine Insight. The module is
  // still owned and still does something -- it buys a stronger Temporal Injection now -- but the
  // capability it used to sell is read from somewhere else, so a save written before the change has
  // to hand that capability over explicitly. Without this step a player who had bought 2x or 4x would
  // load into 1x and be told nothing, which is exactly the silent deletion of purchased value the
  // migration contract exists to prevent.
  { from: 4, to: 5, id: 'v4_to_v5_simulation_speed_from_insight', apply: raw => grandfatherSimulationSpeed(raw) },
];

export function legacySimulationSpeed(temporalInjectorLevel: number): number {
  const level = Math.max(0, Math.trunc(Number(temporalInjectorLevel) || 0));
  return level >= 3 ? 4 : level >= 1 ? 2 : 1;
}

function grandfatherSimulationSpeed(raw: RawSave): RawSave {
  const machine = isPlainObject(raw.machine) ? raw.machine : null;
  const levels = machine && isPlainObject(machine.upgradeLevels) ? machine.upgradeLevels : null;
  const earned = legacySimulationSpeed(Number(levels?.temporal_injector ?? 0));
  if (earned <= 1) return raw;
  const meta = isPlainObject(raw.meta) ? raw.meta : null;
  if (!meta) return raw;
  const progression = isPlainObject(meta.progression) ? meta.progression : null;
  if (!progression) return raw;
  // The stored value is as untrusted as the rest of the payload, and the engine reads this one as a
  // floor on simulation speed -- so it is clamped to the same 1..8 band `normalizeState` already
  // holds `simulationSpeed` to, rather than being trusted to be a speed at all.
  const stored = Number(progression.simulationSpeedUnlocked ?? 1);
  const previous = Number.isFinite(stored) ? Math.trunc(stored) : 1;
  const speed = clampSimulationSpeed(Math.max(earned, previous));
  progression.simulationSpeedUnlocked = speed;
  // A speed this save already owned is not news. `Progression.refresh` announces each speed step the
  // first time it becomes usable, and without this a returning player would be told about a
  // capability they had been playing with for a version.
  const announced = Array.isArray(progression.announcedUnlocks) ? progression.announcedUnlocks : (progression.announcedUnlocks = []);
  for (const step of [2, 4]) {
    if (speed < step || simulationSpeedInsightFor(step) === 0) continue;
    const id = `capability:simulation_speed_${step}`;
    if (!announced.includes(id)) announced.push(id);
  }
  return raw;
}

export const OLDEST_MIGRATABLE_SAVE_VERSION = SAVE_MIGRATIONS.length ? SAVE_MIGRATIONS[0]!.from : SAVE_VERSION;

// JSON.parse produces these as ordinary own properties, and assigning them would reach the
// prototype chain. Nothing in GameState is named this, so dropping them costs nothing.
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_UNKNOWN_DEPTH = 8;
// Beyond this a number stops behaving like one: `1e308` levels turn `upgradeCost` into Infinity, and
// two Infinities meeting in a harvest sum produce NaN, which then persists into the next save.
const MAX_MAGNITUDE = Number.MAX_SAFE_INTEGER;
const MAX_REPORTED_REPAIRS = 24;
const PHASES: Phase[] = ['machine', 'civilization', 'victory'];

function isPlainObject(value: unknown): value is RawSave {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampMagnitude(value: number): number {
  return Math.max(-MAX_MAGNITUDE, Math.min(MAX_MAGNITUDE, value));
}

export class RepairLog {
  paths: string[] = [];
  count = 0;
  // Returns the fallback so call sites read as `value ?? repair(...)` expressions.
  repair<T>(path: string, fallback: T): T {
    this.count++;
    if (this.paths.length < MAX_REPORTED_REPAIRS) this.paths.push(path);
    return fallback;
  }
}

// Values the template says nothing about: an unknown field of a save written by a newer build, or a
// per-key record such as `upgradeLevels`. Kept as-is when JSON-safe, so a save that round-trips
// through an older build keeps the fields that build does not understand yet.
function sanitizeUnknown(value: unknown, depth = 0): unknown {
  if (value === null) return null;
  const kind = typeof value;
  if (kind === 'string' || kind === 'boolean') return value;
  if (kind === 'number') return Number.isFinite(value as number) ? clampMagnitude(value as number) : undefined;
  if (depth >= MAX_UNKNOWN_DEPTH) return undefined;
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value) { const kept = sanitizeUnknown(item, depth + 1); if (kept !== undefined) out.push(kept); }
    return out;
  }
  if (isPlainObject(value)) {
    const out: RawSave = {};
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_KEYS.has(key)) continue;
      const kept = sanitizeUnknown(value[key], depth + 1);
      if (kept !== undefined) out[key] = kept;
    }
    return out;
  }
  return undefined;
}

// The structural pass. `template` is a live default from `createNewState()` /
// `createCivilizationTemplate()`, so its own shape decides the expected type of every field: a
// number stays a finite number, a typed array keeps only items of its element type, and an object
// keeps its declared keys plus any unknown ones the payload carries.
function coerce(template: unknown, value: unknown, path: string, log: RepairLog): unknown {
  if (typeof template === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return log.repair(path, template);
    const clamped = clampMagnitude(value);
    return clamped === value ? value : log.repair(path, clamped);
  }
  if (typeof template === 'string') return typeof value === 'string' ? value : log.repair(path, template);
  if (typeof template === 'boolean') return typeof value === 'boolean' ? value : log.repair(path, template);
  if (Array.isArray(template)) {
    if (!Array.isArray(value)) return log.repair(path, template);
    const sample = template[0];
    const out: unknown[] = [];
    for (let index = 0; index < value.length; index++) {
      if (sample === undefined) { const kept = sanitizeUnknown(value[index]); if (kept !== undefined) out.push(kept); else log.repair(`${path}[${index}]`, null); continue; }
      // A typed array drops what does not match rather than substituting a default: an invented
      // upgrade id or path id would be read as content the player owns.
      if (typeof sample === typeof value[index] && (typeof sample !== 'object' || isPlainObject(value[index]))) out.push(coerce(sample, value[index], `${path}[${index}]`, log));
      else log.repair(`${path}[${index}]`, null);
    }
    return out;
  }
  if (isPlainObject(template)) {
    if (!isPlainObject(value)) return log.repair(path, template);
    const out: RawSave = {};
    for (const key of Object.keys(template)) out[key] = coerce(template[key], value[key], `${path}.${key}`, log);
    for (const key of Object.keys(value)) {
      if (key in out || FORBIDDEN_KEYS.has(key)) continue;
      const kept = sanitizeUnknown(value[key]);
      if (kept !== undefined) out[key] = kept;
    }
    return out;
  }
  return sanitizeUnknown(value) ?? null;
}

// A record the template declares empty carries no element type, so the structural pass cannot check
// its values -- it sends them through `sanitizeUnknown`, which keeps any JSON-safe one. That is not
// good enough for the records the engine reads as arithmetic: `upgradeLevel` feeds them straight into
// `upgradeCost`, where a string becomes NaN and a fractional level prices an upgrade nobody can buy.
// Each such record is therefore checked by hand, and an unusable value drops its key rather than
// inventing a level the player never bought.
function normalizeCounterRecord(record: Record<string, unknown>, path: string, log: RepairLog): void {
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      const counted = Math.min(MAX_MAGNITUDE, Math.max(0, Math.floor(value)));
      if (counted !== value) record[key] = log.repair(`${path}.${key}`, counted);
      continue;
    }
    delete record[key];
    log.repair(`${path}.${key}`, null);
  }
}

// Signed and fractional values are legitimate here (an affinity delta runs both ways), so only the
// type is enforced.
function normalizeNumberRecord(record: Record<string, unknown>, path: string, log: RepairLog): void {
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      const clamped = clampMagnitude(value);
      if (clamped !== value) record[key] = log.repair(`${path}.${key}`, clamped);
      continue;
    }
    delete record[key];
    log.repair(`${path}.${key}`, null);
  }
}

function normalizeFlagRecord(record: Record<string, unknown>, path: string, log: RepairLog): void {
  for (const key of Object.keys(record)) {
    if (typeof record[key] === 'boolean') continue;
    delete record[key];
    log.repair(`${path}.${key}`, null);
  }
}

function validVisualMemory(value: unknown): value is WorldMemoryState {
  return isPlainObject(value) && value.version === 1 && typeof value.sequence === 'number' && Number.isFinite(value.sequence)
    && Array.isArray(value.marks) && Array.isArray(value.scars);
}

// A run is only restored when it can still be simulated: it needs the seed its whole event stream
// derives from. Anything less drops the run and keeps the Machine -- losing one civilization beats
// losing every unlock behind it.
export function normalizeCivilization(raw: unknown, log: RepairLog): Civilization | null {
  if (!isPlainObject(raw)) return null;
  const seed = typeof raw.seed === 'number' && Number.isFinite(raw.seed) ? Math.trunc(raw.seed) : null;
  if (seed === null) return null;
  const civ = coerce(createCivilizationTemplate(seed), raw, 'civilization', log) as Civilization;
  civ.seed = seed;
  civ.rngState = Number.isFinite(civ.rngState) && civ.rngState !== 0 ? civ.rngState : seed;
  civ.years = Math.max(0, civ.years);
  // Optional: absent stays absent, but a value that cannot be read is a discarded field and has to be
  // reported as one -- otherwise a save loses `injectedYears` while the loader still calls itself clean.
  if (typeof raw.injectedYears === 'number' && Number.isFinite(raw.injectedYears)) civ.injectedYears = clampMagnitude(Math.max(0, raw.injectedYears));
  else { delete civ.injectedYears; if ('injectedYears' in raw) log.repair('civilization.injectedYears', null); }
  normalizeCounterRecord(civ.eventCounts, 'civilization.eventCounts', log);
  normalizeCounterRecord(civ.runInterventionUses, 'civilization.runInterventionUses', log);
  normalizeCounterRecord(civ.tactical.actionUsage as unknown as Record<string, unknown>, 'civilization.tactical.actionUsage', log);
  normalizeNumberRecord(civ.pathState.affinity, 'civilization.pathState.affinity', log);
  normalizeNumberRecord(civ.pathState.recentDeltas, 'civilization.pathState.recentDeltas', log);
  civ.elapsedSeconds = Math.max(0, civ.elapsedSeconds);
  civ.development = Math.max(1, civ.development);
  civ.developmentMultiplier = Math.max(0, civ.developmentMultiplier);
  civ.era = Math.max(0, Math.min(3, Math.trunc(civ.era)));
  // Era and years must agree or the era-gated intervention pool and the harvest formula disagree
  // about what the run is. Years are the record; era is derived from them.
  const derivedEra = eraForYears(civ.years);
  if (civ.era < derivedEra) civ.era = log.repair('civilization.era', derivedEra);
  civ.stats.stabilityMax = Math.max(1, civ.stats.stabilityMax);
  clampStats(civ);
  civ.tactical.entropy = Math.max(0, civ.tactical.entropy);
  civ.tactical.controlCapacity = Math.max(0, civ.tactical.controlCapacity);
  // Presentation-only and optional: a malformed one is dropped rather than repaired, because the
  // renderer is its only reader and a fresh run's worth of scars is not progress.
  if ('visualMemory' in civ) {
    if (!validVisualMemory(civ.visualMemory)) { delete civ.visualMemory; if ('visualMemory' in raw) log.repair('civilization.visualMemory', null); }
  }
  // Same contract for the run trace: the post-run report is its only reader, so a malformed curve is
  // dropped rather than repaired into a shape that never happened.
  if ('trace' in civ) {
    if (!validRunTrace(civ.trace)) { delete civ.trace; if ('trace' in raw) log.repair('civilization.trace', null); }
  }
  return civ;
}

export function normalizeState(raw: RawSave, log: RepairLog): { state: GameState; runDropped: boolean } {
  const template = createNewState();
  const rawCiv = raw.civilization;
  const state = coerce({ ...template, civilization: undefined }, { ...raw, civilization: undefined }, 'state', log) as GameState;
  normalizeCounterRecord(state.machine.upgradeLevels, 'state.machine.upgradeLevels', log);
  normalizeCounterRecord(state.meta.universeUpgradeLevels, 'state.meta.universeUpgradeLevels', log);
  normalizeCounterRecord(state.meta.axiomLevels, 'state.meta.axiomLevels', log);
  normalizeFlagRecord(state.meta.progression.milestones, 'state.meta.progression.milestones', log);
  const civ = rawCiv === null || rawCiv === undefined ? null : normalizeCivilization(rawCiv, log);
  const runDropped = civ === null && isPlainObject(rawCiv);
  state.civilization = civ;
  if (!PHASES.includes(state.phase)) state.phase = log.repair('state.phase', 'machine');
  // A phase with nothing to show would leave the player on an empty screen with no way back.
  if (state.phase === 'civilization' && !state.civilization) state.phase = log.repair('state.phase', 'machine');
  state.simulationSpeed = clampSimulationSpeed(state.simulationSpeed);
  const unlocked = state.meta.progression.simulationSpeedUnlocked;
  if (unlocked !== undefined) {
    const repaired = clampSimulationSpeed(unlocked);
    if (repaired !== unlocked) log.repair('meta.progression.simulationSpeedUnlocked', repaired);
    state.meta.progression.simulationSpeedUnlocked = repaired;
  }
  // Onboarding state is rebuilt against this build's step list: an unknown status or a step id this
  // version no longer has would otherwise point the tutorial at nothing.
  state.tutorial = normalizeTutorialState(state.tutorial);
  state.help = { version: 1, explain: Boolean(state.help?.explain) };
  state.saveVersion = SAVE_VERSION;
  return { state, runDropped };
}

function emptyReport(status: SaveMigrationStatus, fromVersion: number, notice: string): SaveMigrationReport {
  return {
    status, fromVersion, toVersion: SAVE_VERSION, steps: [], repairs: [], repairCount: 0,
    runDropped: false, keepBackup: status === 'unreadable', notice
  };
}

export function migrateSaveState(input: unknown): SaveMigrationResult {
  if (input === null || input === undefined) return { state: null, report: emptyReport('empty', 0, '') };
  if (!isPlainObject(input) || !(isPlainObject(input.machine) || isPlainObject(input.meta))) {
    return { state: null, report: emptyReport('unreadable', 0, catalog().reports.saveMigration.unreadable) };
  }
  const declared = typeof input.saveVersion === 'number' && Number.isFinite(input.saveVersion) ? Math.trunc(input.saveVersion) : 0;
  // A payload that looks like a state but declares no version is treated as the oldest supported
  // one: walking the whole chain over it is harmless, and refusing it would discard real progress.
  const fromVersion = declared >= 1 ? declared : OLDEST_MIGRATABLE_SAVE_VERSION;
  const ahead = fromVersion > SAVE_VERSION;
  const steps: string[] = [];
  let raw = input;
  if (!ahead) {
    for (let version = fromVersion; version < SAVE_VERSION; version++) {
      const step = SAVE_MIGRATIONS.find(candidate => candidate.from === version);
      if (!step) break;
      const next = step.apply(raw);
      if (!isPlainObject(next)) break;
      raw = next;
      steps.push(step.id);
    }
  }
  const log = new RepairLog();
  const { state, runDropped } = normalizeState(raw, log);
  // A save from a newer build keeps its own version marker. Stamping it down to SAVE_VERSION would
  // label already-migrated data as older than it is, and the newer build would then re-run its own
  // steps over fields it had written in their new form -- the one way this loader could still lose
  // data. The unknown fields ride along, so the marker stays truthful about what the payload holds.
  if (ahead) state.saveVersion = fromVersion;
  const status: SaveMigrationStatus = ahead
    ? 'ahead'
    : fromVersion !== SAVE_VERSION || declared < 1
      ? 'migrated'
      : log.count > 0 || runDropped ? 'repaired' : 'current';
  const copy = catalog().reports.saveMigration;
  const runNote = runDropped ? copy.runDroppedSuffix : '';
  const notice = status === 'ahead'
    ? fill(copy.newerBuild, { fromVersion, runNote })
    : status === 'migrated'
      ? fill(copy.migrated, { fromVersion, toVersion: SAVE_VERSION, runNote })
      : status === 'repaired'
        ? fill(log.count === 1 ? copy.repairedOne : copy.repairedMany, { count: log.count, runNote })
        : '';
  return {
    state,
    report: {
      status, fromVersion, toVersion: SAVE_VERSION, steps, repairs: log.paths, repairCount: log.count,
      runDropped, keepBackup: status !== 'current', notice
    }
  };
}

// The one entry point the engine uses: a stored string in, a loadable state plus a report out. A
// payload that cannot become a state never throws and never silently disappears -- `keepBackup`
// tells the caller to preserve the original bytes before anything overwrites them.
export function parseSaveText(text: string | null | undefined): SaveMigrationResult {
  if (!text) return { state: null, report: emptyReport('empty', 0, '') };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { state: null, report: emptyReport('unreadable', 0, catalog().reports.saveMigration.unreadable) };
  }
  return migrateSaveState(parsed);
}
