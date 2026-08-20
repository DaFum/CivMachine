import { clampStats } from './effects.js';
import { SAVE_VERSION, createCivilizationTemplate, createNewState, eraForYears } from './rules.js';
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
];

export const OLDEST_MIGRATABLE_SAVE_VERSION = SAVE_MIGRATIONS.length ? SAVE_MIGRATIONS[0]!.from : SAVE_VERSION;

// JSON.parse produces these as ordinary own properties, and assigning them would reach the
// prototype chain. Nothing in GameState is named this, so dropping them costs nothing.
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_UNKNOWN_DEPTH = 8;
const MAX_REPORTED_REPAIRS = 24;
const PHASES: Phase[] = ['machine', 'civilization', 'victory'];

function isPlainObject(value: unknown): value is RawSave {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
  if (kind === 'number') return Number.isFinite(value as number) ? value : undefined;
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
  if (typeof template === 'number') return typeof value === 'number' && Number.isFinite(value) ? value : log.repair(path, template);
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
  civ.injectedYears = typeof raw.injectedYears === 'number' && Number.isFinite(raw.injectedYears) ? Math.max(0, raw.injectedYears) : undefined;
  if (civ.injectedYears === undefined) delete civ.injectedYears;
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
  return civ;
}

export function normalizeState(raw: RawSave, log: RepairLog): { state: GameState; runDropped: boolean } {
  const template = createNewState();
  const rawCiv = raw.civilization;
  const state = coerce({ ...template, civilization: undefined }, { ...raw, civilization: undefined }, 'state', log) as GameState;
  const civ = rawCiv === null || rawCiv === undefined ? null : normalizeCivilization(rawCiv, log);
  const runDropped = civ === null && isPlainObject(rawCiv);
  state.civilization = civ;
  if (!PHASES.includes(state.phase)) state.phase = log.repair('state.phase', 'machine');
  // A phase with nothing to show would leave the player on an empty screen with no way back.
  if (state.phase === 'civilization' && !state.civilization) state.phase = log.repair('state.phase', 'machine');
  state.simulationSpeed = Math.max(1, Math.min(8, Math.trunc(state.simulationSpeed) || 1));
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
    return { state: null, report: emptyReport('unreadable', 0, 'Save could not be read. The original was kept as a backup and a new Machine was started.') };
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
  const runNote = runDropped ? ' The in-progress civilization could not be restored.' : '';
  const notice = status === 'ahead'
    ? `Save was written by a newer build (v${fromVersion}). Loaded in compatibility mode; the original is kept as a backup.${runNote}`
    : status === 'migrated'
      ? `Save migrated from v${fromVersion} to v${SAVE_VERSION}. Progress preserved.${runNote}`
      : status === 'repaired'
        ? `Save repaired: ${log.count} field${log.count === 1 ? '' : 's'} restored to defaults.${runNote}`
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
    return { state: null, report: emptyReport('unreadable', 0, 'Save could not be read. The original was kept as a backup and a new Machine was started.') };
  }
  return migrateSaveState(parsed);
}
