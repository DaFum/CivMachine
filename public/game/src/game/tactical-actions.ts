import { CivilizationPaths } from './paths.js';
import type { Civilization, RuntimeBonuses, TacticalActionId } from './types.js';

export const CONTROL_CAPACITY_MAX = 3;
export const VENT_ENTROPY_RELIEF = 18;
export const VENT_MIN_ENTROPY = 6;
export const VENT_STABILITY_COST = 10;
export const VENT_ATTENTION_COST = 4;

export interface TacticalActionDefinition {
  id: TacticalActionId;
  title: string;
  label: string;
  summary: string;
  risk: string;
  cost: number;
  shortcut: string;
}

export interface TacticalAvailability {
  enabled: boolean;
  reason: string;
  cost: number;
}

export interface TacticalActionOutcome {
  id: TacticalActionId;
  title: string;
  label: string;
}

export const TACTICAL_ACTIONS: Readonly<Record<TacticalActionId, TacticalActionDefinition>> = {
  stabilize: {
    id: 'stabilize',
    title: 'Stability Override',
    label: 'Stabilize the reality lattice',
    summary: '+14 Stability',
    risk: '+6 Attention · +8 Entropy',
    cost: 2,
    shortcut: '1',
  },
  accelerate: {
    id: 'accelerate',
    title: 'Temporal Injection',
    label: 'Accelerate historical throughput',
    summary: '+200 years · advance Development',
    risk: '-4 Stability · +5 Entropy',
    cost: 2,
    shortcut: '2',
  },
  probe: {
    id: 'probe',
    title: 'Prediction Probe',
    label: 'Probe the active intervention',
    summary: 'Reveal choice risk directions',
    risk: '+3 Awareness · +2 Entropy',
    cost: 1,
    shortcut: '3',
  },
  vent: {
    id: 'vent',
    title: 'Entropy Vent',
    label: 'Vent accumulated entropy into Paradox',
    summary: '-18 Entropy · yields Paradox at harvest',
    risk: '-10 Stability · +4 Attention',
    cost: 1,
    shortcut: '4',
  },
};

const ACTION_PATHS: Readonly<Record<TacticalActionId, readonly [string, string]>> = {
  stabilize: ['cosmic_resistance', 'bureaucratic_singularity'],
  accelerate: ['temporal_dominion', 'reality_engineering'],
  probe: ['recursive_simulation', 'machine_faith'],
  vent: ['void_communion', 'post_mortal_civilization'],
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export function tacticalAvailability(civ: Civilization, id: TacticalActionId): TacticalAvailability {
  const definition = TACTICAL_ACTIONS[id];
  if (civ.tactical.controlCapacity < definition.cost) {
    return { enabled: false, reason: `Requires ${definition.cost} Control.`, cost: definition.cost };
  }
  if (id === 'stabilize' && civ.stats.stability >= civ.stats.stabilityMax) {
    return { enabled: false, reason: 'Reality Stability is already at maximum.', cost: definition.cost };
  }
  if (id === 'accelerate' && civ.pendingEvent) {
    return { enabled: false, reason: 'Resolve the active intervention before accelerating.', cost: definition.cost };
  }
  if (id === 'probe' && !civ.pendingEvent) {
    return { enabled: false, reason: 'Probe requires an active intervention.', cost: definition.cost };
  }
  if (id === 'probe' && civ.tactical.probedEventId === civ.pendingEvent) {
    return { enabled: false, reason: 'This intervention has already been probed.', cost: definition.cost };
  }
  if (id === 'vent' && civ.tactical.entropy < VENT_MIN_ENTROPY) {
    return { enabled: false, reason: 'Entropy is too low to vent.', cost: definition.cost };
  }
  return { enabled: true, reason: '', cost: definition.cost };
}

export function applyTacticalAction(
  civ: Civilization,
  id: TacticalActionId,
  bonuses: RuntimeBonuses,
): TacticalActionOutcome | null {
  const availability = tacticalAvailability(civ, id);
  if (!availability.enabled) return null;

  if (id === 'stabilize') {
    civ.stats.stability = clamp(civ.stats.stability + 14, 0, civ.stats.stabilityMax);
    civ.stats.attention = clamp(civ.stats.attention + 6 * bonuses.attentionGainMult, 0, 100);
    civ.tactical.entropy = clamp(civ.tactical.entropy + 8, 0, 100);
  } else if (id === 'accelerate') {
    civ.years += bonuses.accelerateYears;
    civ.injectedYears = Math.max(0, Number(civ.injectedYears) || 0) + bonuses.accelerateYears;
    civ.development += 6 * Math.max(0.2, civ.developmentMultiplier) * (1 + civ.era * 0.2);
    civ.eventTimer = Math.max(0, civ.eventTimer - bonuses.accelerateTimer);
    civ.stats.stability = clamp(civ.stats.stability - 4, 0, civ.stats.stabilityMax);
    civ.tactical.entropy = clamp(civ.tactical.entropy + 5, 0, 100);
  } else if (id === 'vent') {
    const removed = Math.min(VENT_ENTROPY_RELIEF, civ.tactical.entropy);
    civ.tactical.entropy = clamp(civ.tactical.entropy - removed, 0, 100);
    civ.harvestBonus.paradox += removed * (0.4 + 0.2 * Math.max(0, Math.min(3, Math.trunc(civ.era))));
    civ.stats.stability = clamp(civ.stats.stability - VENT_STABILITY_COST, 0, civ.stats.stabilityMax);
    civ.stats.attention = clamp(civ.stats.attention + VENT_ATTENTION_COST * bonuses.attentionGainMult, 0, 100);
  } else {
    civ.stats.awareness = clamp(civ.stats.awareness + 3 * bonuses.awarenessGainMult, 0, 100);
    civ.tactical.entropy = clamp(civ.tactical.entropy + 2, 0, 100);
    civ.tactical.probedEventId = civ.pendingEvent;
  }

  civ.tactical.controlCapacity = clamp(civ.tactical.controlCapacity - availability.cost, 0, CONTROL_CAPACITY_MAX);
  civ.tactical.actionUsage[id] += 1;
  if (civ.tactical.actionUsage[id] % 3 === 0) {
    const pathState = CivilizationPaths.ensure(civ);
    for (const pathId of ACTION_PATHS[id]) pathState.affinity[pathId] = (pathState.affinity[pathId] ?? 0) + 1;
  }

  const definition = TACTICAL_ACTIONS[id];
  return { id, title: definition.title, label: definition.label };
}
