import { clampStats } from './effects.js';
import { fill, text as catalog } from '../data/i18n.js';
import { SAVE_VERSION, createCivilizationTemplate, createNewState, eraForYears } from './rules.js';
import { validRunTrace } from './run-report.js';
import { normalizeTutorialState } from './tutorial.js';
// One entry per version boundary, contiguous from the oldest supported save up to SAVE_VERSION --
// `save-migration.test.mjs` fails the build if the chain has a gap. v1 through v3 predate this
// repository's history, so no field reinterpretation for them can be reconstructed; their steps are
// declared to keep the chain walkable and let the structural pass carry whatever those saves hold.
//
// When bumping SAVE_VERSION, add the matching step here. Return the same object (mutated or rebuilt)
// -- it is a throwaway parse result, never the live state.
export const SAVE_MIGRATIONS = [
    { from: 1, to: 2, id: 'v1_to_v2_structural', apply: raw => raw },
    { from: 2, to: 3, id: 'v2_to_v3_structural', apply: raw => raw },
    { from: 3, to: 4, id: 'v3_to_v4_structural', apply: raw => raw },
];
export const OLDEST_MIGRATABLE_SAVE_VERSION = SAVE_MIGRATIONS.length ? SAVE_MIGRATIONS[0].from : SAVE_VERSION;
// JSON.parse produces these as ordinary own properties, and assigning them would reach the
// prototype chain. Nothing in GameState is named this, so dropping them costs nothing.
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_UNKNOWN_DEPTH = 8;
// Beyond this a number stops behaving like one: `1e308` levels turn `upgradeCost` into Infinity, and
// two Infinities meeting in a harvest sum produce NaN, which then persists into the next save.
const MAX_MAGNITUDE = Number.MAX_SAFE_INTEGER;
const MAX_REPORTED_REPAIRS = 24;
const PHASES = ['machine', 'civilization', 'victory'];
function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function clampMagnitude(value) {
    return Math.max(-MAX_MAGNITUDE, Math.min(MAX_MAGNITUDE, value));
}
export class RepairLog {
    constructor() {
        this.paths = [];
        this.count = 0;
    }
    // Returns the fallback so call sites read as `value ?? repair(...)` expressions.
    repair(path, fallback) {
        this.count++;
        if (this.paths.length < MAX_REPORTED_REPAIRS)
            this.paths.push(path);
        return fallback;
    }
}
// Values the template says nothing about: an unknown field of a save written by a newer build, or a
// per-key record such as `upgradeLevels`. Kept as-is when JSON-safe, so a save that round-trips
// through an older build keeps the fields that build does not understand yet.
function sanitizeUnknown(value, depth = 0) {
    if (value === null)
        return null;
    const kind = typeof value;
    if (kind === 'string' || kind === 'boolean')
        return value;
    if (kind === 'number')
        return Number.isFinite(value) ? clampMagnitude(value) : undefined;
    if (depth >= MAX_UNKNOWN_DEPTH)
        return undefined;
    if (Array.isArray(value)) {
        const out = [];
        for (const item of value) {
            const kept = sanitizeUnknown(item, depth + 1);
            if (kept !== undefined)
                out.push(kept);
        }
        return out;
    }
    if (isPlainObject(value)) {
        const out = {};
        for (const key of Object.keys(value)) {
            if (FORBIDDEN_KEYS.has(key))
                continue;
            const kept = sanitizeUnknown(value[key], depth + 1);
            if (kept !== undefined)
                out[key] = kept;
        }
        return out;
    }
    return undefined;
}
// The structural pass. `template` is a live default from `createNewState()` /
// `createCivilizationTemplate()`, so its own shape decides the expected type of every field: a
// number stays a finite number, a typed array keeps only items of its element type, and an object
// keeps its declared keys plus any unknown ones the payload carries.
function coerce(template, value, path, log) {
    if (typeof template === 'number') {
        if (typeof value !== 'number' || !Number.isFinite(value))
            return log.repair(path, template);
        const clamped = clampMagnitude(value);
        return clamped === value ? value : log.repair(path, clamped);
    }
    if (typeof template === 'string')
        return typeof value === 'string' ? value : log.repair(path, template);
    if (typeof template === 'boolean')
        return typeof value === 'boolean' ? value : log.repair(path, template);
    if (Array.isArray(template)) {
        if (!Array.isArray(value))
            return log.repair(path, template);
        const sample = template[0];
        const out = [];
        for (let index = 0; index < value.length; index++) {
            if (sample === undefined) {
                const kept = sanitizeUnknown(value[index]);
                if (kept !== undefined)
                    out.push(kept);
                else
                    log.repair(`${path}[${index}]`, null);
                continue;
            }
            // A typed array drops what does not match rather than substituting a default: an invented
            // upgrade id or path id would be read as content the player owns.
            if (typeof sample === typeof value[index] && (typeof sample !== 'object' || isPlainObject(value[index])))
                out.push(coerce(sample, value[index], `${path}[${index}]`, log));
            else
                log.repair(`${path}[${index}]`, null);
        }
        return out;
    }
    if (isPlainObject(template)) {
        if (!isPlainObject(value))
            return log.repair(path, template);
        const out = {};
        for (const key of Object.keys(template))
            out[key] = coerce(template[key], value[key], `${path}.${key}`, log);
        for (const key of Object.keys(value)) {
            if (key in out || FORBIDDEN_KEYS.has(key))
                continue;
            const kept = sanitizeUnknown(value[key]);
            if (kept !== undefined)
                out[key] = kept;
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
function normalizeCounterRecord(record, path, log) {
    for (const key of Object.keys(record)) {
        const value = record[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
            const counted = Math.min(MAX_MAGNITUDE, Math.max(0, Math.floor(value)));
            if (counted !== value)
                record[key] = log.repair(`${path}.${key}`, counted);
            continue;
        }
        delete record[key];
        log.repair(`${path}.${key}`, null);
    }
}
// Signed and fractional values are legitimate here (an affinity delta runs both ways), so only the
// type is enforced.
function normalizeNumberRecord(record, path, log) {
    for (const key of Object.keys(record)) {
        const value = record[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
            const clamped = clampMagnitude(value);
            if (clamped !== value)
                record[key] = log.repair(`${path}.${key}`, clamped);
            continue;
        }
        delete record[key];
        log.repair(`${path}.${key}`, null);
    }
}
function normalizeFlagRecord(record, path, log) {
    for (const key of Object.keys(record)) {
        if (typeof record[key] === 'boolean')
            continue;
        delete record[key];
        log.repair(`${path}.${key}`, null);
    }
}
function validVisualMemory(value) {
    return isPlainObject(value) && value.version === 1 && typeof value.sequence === 'number' && Number.isFinite(value.sequence)
        && Array.isArray(value.marks) && Array.isArray(value.scars);
}
// A run is only restored when it can still be simulated: it needs the seed its whole event stream
// derives from. Anything less drops the run and keeps the Machine -- losing one civilization beats
// losing every unlock behind it.
export function normalizeCivilization(raw, log) {
    if (!isPlainObject(raw))
        return null;
    const seed = typeof raw.seed === 'number' && Number.isFinite(raw.seed) ? Math.trunc(raw.seed) : null;
    if (seed === null)
        return null;
    const civ = coerce(createCivilizationTemplate(seed), raw, 'civilization', log);
    civ.seed = seed;
    civ.rngState = Number.isFinite(civ.rngState) && civ.rngState !== 0 ? civ.rngState : seed;
    civ.years = Math.max(0, civ.years);
    // Optional: absent stays absent, but a value that cannot be read is a discarded field and has to be
    // reported as one -- otherwise a save loses `injectedYears` while the loader still calls itself clean.
    if (typeof raw.injectedYears === 'number' && Number.isFinite(raw.injectedYears))
        civ.injectedYears = clampMagnitude(Math.max(0, raw.injectedYears));
    else {
        delete civ.injectedYears;
        if ('injectedYears' in raw)
            log.repair('civilization.injectedYears', null);
    }
    normalizeCounterRecord(civ.eventCounts, 'civilization.eventCounts', log);
    normalizeCounterRecord(civ.runInterventionUses, 'civilization.runInterventionUses', log);
    normalizeCounterRecord(civ.tactical.actionUsage, 'civilization.tactical.actionUsage', log);
    normalizeNumberRecord(civ.pathState.affinity, 'civilization.pathState.affinity', log);
    normalizeNumberRecord(civ.pathState.recentDeltas, 'civilization.pathState.recentDeltas', log);
    civ.elapsedSeconds = Math.max(0, civ.elapsedSeconds);
    civ.development = Math.max(1, civ.development);
    civ.developmentMultiplier = Math.max(0, civ.developmentMultiplier);
    civ.era = Math.max(0, Math.min(3, Math.trunc(civ.era)));
    // Era and years must agree or the era-gated intervention pool and the harvest formula disagree
    // about what the run is. Years are the record; era is derived from them.
    const derivedEra = eraForYears(civ.years);
    if (civ.era < derivedEra)
        civ.era = log.repair('civilization.era', derivedEra);
    civ.stats.stabilityMax = Math.max(1, civ.stats.stabilityMax);
    clampStats(civ);
    civ.tactical.entropy = Math.max(0, civ.tactical.entropy);
    civ.tactical.controlCapacity = Math.max(0, civ.tactical.controlCapacity);
    // Presentation-only and optional: a malformed one is dropped rather than repaired, because the
    // renderer is its only reader and a fresh run's worth of scars is not progress.
    if ('visualMemory' in civ) {
        if (!validVisualMemory(civ.visualMemory)) {
            delete civ.visualMemory;
            if ('visualMemory' in raw)
                log.repair('civilization.visualMemory', null);
        }
    }
    // Same contract for the run trace: the post-run report is its only reader, so a malformed curve is
    // dropped rather than repaired into a shape that never happened.
    if ('trace' in civ) {
        if (!validRunTrace(civ.trace)) {
            delete civ.trace;
            if ('trace' in raw)
                log.repair('civilization.trace', null);
        }
    }
    return civ;
}
export function normalizeState(raw, log) {
    const template = createNewState();
    const rawCiv = raw.civilization;
    const state = coerce({ ...template, civilization: undefined }, { ...raw, civilization: undefined }, 'state', log);
    normalizeCounterRecord(state.machine.upgradeLevels, 'state.machine.upgradeLevels', log);
    normalizeCounterRecord(state.meta.universeUpgradeLevels, 'state.meta.universeUpgradeLevels', log);
    normalizeCounterRecord(state.meta.axiomLevels, 'state.meta.axiomLevels', log);
    normalizeFlagRecord(state.meta.progression.milestones, 'state.meta.progression.milestones', log);
    const civ = rawCiv === null || rawCiv === undefined ? null : normalizeCivilization(rawCiv, log);
    const runDropped = civ === null && isPlainObject(rawCiv);
    state.civilization = civ;
    if (!PHASES.includes(state.phase))
        state.phase = log.repair('state.phase', 'machine');
    // A phase with nothing to show would leave the player on an empty screen with no way back.
    if (state.phase === 'civilization' && !state.civilization)
        state.phase = log.repair('state.phase', 'machine');
    state.simulationSpeed = Math.max(1, Math.min(8, Math.trunc(state.simulationSpeed) || 1));
    // Onboarding state is rebuilt against this build's step list: an unknown status or a step id this
    // version no longer has would otherwise point the tutorial at nothing.
    state.tutorial = normalizeTutorialState(state.tutorial);
    state.help = { version: 1, explain: Boolean(state.help?.explain) };
    state.saveVersion = SAVE_VERSION;
    return { state, runDropped };
}
function emptyReport(status, fromVersion, notice) {
    return {
        status, fromVersion, toVersion: SAVE_VERSION, steps: [], repairs: [], repairCount: 0,
        runDropped: false, keepBackup: status === 'unreadable', notice
    };
}
export function migrateSaveState(input) {
    if (input === null || input === undefined)
        return { state: null, report: emptyReport('empty', 0, '') };
    if (!isPlainObject(input) || !(isPlainObject(input.machine) || isPlainObject(input.meta))) {
        return { state: null, report: emptyReport('unreadable', 0, catalog().reports.saveMigration.unreadable) };
    }
    const declared = typeof input.saveVersion === 'number' && Number.isFinite(input.saveVersion) ? Math.trunc(input.saveVersion) : 0;
    // A payload that looks like a state but declares no version is treated as the oldest supported
    // one: walking the whole chain over it is harmless, and refusing it would discard real progress.
    const fromVersion = declared >= 1 ? declared : OLDEST_MIGRATABLE_SAVE_VERSION;
    const ahead = fromVersion > SAVE_VERSION;
    const steps = [];
    let raw = input;
    if (!ahead) {
        for (let version = fromVersion; version < SAVE_VERSION; version++) {
            const step = SAVE_MIGRATIONS.find(candidate => candidate.from === version);
            if (!step)
                break;
            const next = step.apply(raw);
            if (!isPlainObject(next))
                break;
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
    if (ahead)
        state.saveVersion = fromVersion;
    const status = ahead
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
export function parseSaveText(text) {
    if (!text)
        return { state: null, report: emptyReport('empty', 0, '') };
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch {
        return { state: null, report: emptyReport('unreadable', 0, catalog().reports.saveMigration.unreadable) };
    }
    return migrateSaveState(parsed);
}
//# sourceMappingURL=save-migration.js.map