import type { Civilization } from './types.js';

export interface SchedulerEvent {
  id: string;
  weight?: number;
  path_id?: string;
  path_phase?: string;
}

export interface WeightedIntervention<T extends SchedulerEvent> {
  event: T;
  weight: number;
}

export interface SchedulerOptions<T extends SchedulerEvent> {
  pathMultiplier(event: T, civilization: Civilization): number;
  stateMultiplier(event: T, civilization: Civilization): number;
  exhausted(event: T, civilization: Civilization): boolean;
}

const PHASE_WEIGHTS: ReadonlyArray<Readonly<Record<string, number>>> = [
  { impulse: 1.5, reinforcement: 1.2, conflict: 0.75, consolidation: 0.5, endgame: 0.2 },
  { impulse: 0.75, reinforcement: 1, conflict: 1.4, consolidation: 1.25, endgame: 0.6 },
  { impulse: 0.5, reinforcement: 0.75, conflict: 1.1, consolidation: 1.35, endgame: 1.55 },
  { impulse: 0.3, reinforcement: 0.5, conflict: 0.9, consolidation: 1.3, endgame: 2 },
];

// One catalog event declares max_count 999 as an always-available fallback. Left uncapped it keeps
// the fresh pool non-empty forever, so the saturation stage never activates and that one event
// dominates a long run -- measured 11 of 94 interventions. Cap the effective allowance instead.
export const MAX_COUNT_CEILING = 3;

/**
 * Placeholder docstring for interventionExhausted.
 */
export function interventionExhausted(
  event: SchedulerEvent & { max_count?: number },
  civ: Civilization,
): boolean {
  const allowance = Math.min(MAX_COUNT_CEILING, Math.max(1, Number(event.max_count ?? 2)));
  return Math.max(0, Number(civ.eventCounts[event.id] ?? 0)) >= allowance;
}

/**
 * Placeholder docstring for recentEventIds.
 */
export function recentEventIds(civ: Civilization): string[] {
  if (!Array.isArray(civ.recentEventIds)) civ.recentEventIds = [];
  return civ.recentEventIds;
}

/**
 * Placeholder docstring for recordRecentIntervention.
 */
export function recordRecentIntervention(civ: Civilization, id: string): void {
  const recent = recentEventIds(civ);
  const priorIndex = recent.indexOf(id);
  if (priorIndex >= 0) recent.splice(priorIndex, 1);
  recent.push(id);
  while (recent.length > 6) recent.shift();
}

function phaseMultiplier(event: SchedulerEvent, civ: Civilization): number {
  if (!event.path_phase) return 1;
  return PHASE_WEIGHTS[Math.max(0, Math.min(3, civ.era))]?.[event.path_phase] ?? 1;
}

function buildPool<T extends SchedulerEvent>(
  events: readonly T[],
  civ: Civilization,
  options: SchedulerOptions<T>,
  excludeRecent: boolean,
  allowExhausted: boolean,
): WeightedIntervention<T>[] {
  const recent = new Set(recentEventIds(civ));
  const pool: WeightedIntervention<T>[] = [];
  for (const event of events) {
    if (excludeRecent && recent.has(event.id)) continue;
    if (!allowExhausted && options.exhausted(event, civ)) continue;
    const base = Math.max(0.01, Number(event.weight ?? 1));
    const path = Math.max(0, options.pathMultiplier(event, civ));
    const state = Math.max(0, options.stateMultiplier(event, civ));
    if (path <= 0 || state <= 0) continue;
    const timesSeen = Math.max(0, Number(civ.eventCounts[event.id] ?? 0));
    const freshness = 1 / (1 + timesSeen * 0.55);
    const weight = base * path * state * phaseMultiplier(event, civ) * freshness;
    if (weight > 0) pool.push({ event, weight });
  }
  return pool;
}

// Three stages, tried in order. The third exists because the catalog holds only 96 finite draws:
// without it a run past roughly 48 interventions collapses onto the single unbounded fallback event.
export function buildInterventionPool<T extends SchedulerEvent>(
  events: readonly T[],
  civ: Civilization,
  options: SchedulerOptions<T>,
): WeightedIntervention<T>[] {
  const fresh = buildPool(events, civ, options, true, false);
  if (fresh.length) return fresh;
  const recentInclusive = buildPool(events, civ, options, false, false);
  if (recentInclusive.length) return recentInclusive;
  return buildPool(events, civ, options, true, true);
}

export function chooseWeightedIntervention<T extends SchedulerEvent>(
  pool: readonly WeightedIntervention<T>[],
  roll01: number,
): T | null {
  const total = pool.reduce((sum, item) => sum + item.weight, 0);
  if (!pool.length || total <= 0) return null;
  let cursor = Math.max(0, Math.min(0.999999999, roll01)) * total;
  for (const item of pool) {
    cursor -= item.weight;
    if (cursor <= 0) return item.event;
  }
  return pool[pool.length - 1]!.event;
}

/**
 * Placeholder docstring for eventDelayWindow.
 */
export function eventDelayWindow(civ: Civilization): { min: number; max: number } {
  return [
    { min: 10, max: 14 },
    { min: 8, max: 11 },
    { min: 7, max: 10 },
    { min: 6, max: 9 },
  ][Math.max(0, Math.min(3, civ.era))]!;
}
