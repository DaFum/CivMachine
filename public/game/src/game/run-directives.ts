import type { Civilization } from './types.js';

export interface DirectiveObjectiveDefinition {
  id: string;
  directiveId: string;
  title: string;
  description: string;
  isComplete(civ: Civilization): boolean;
}

function nextRandom(state: number): { state: number; value: number } {
  let next = state >>> 0 || 0x6d2b79f5;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  next >>>= 0;
  return { state: next, value: next / 4294967296 };
}

export function buildDirectiveOffers(knownIds: readonly string[], seed: number, count = 3): string[] {
  const pool = [...new Set(knownIds.map(String))].sort();
  let state = seed >>> 0 || 0x52434531;
  for (let index = pool.length - 1; index > 0; index--) {
    const roll = nextRandom(state);
    state = roll.state;
    const swapIndex = Math.floor(roll.value * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex]!, pool[index]!];
  }
  return pool.slice(0, Math.max(0, Math.min(pool.length, Math.trunc(count))));
}

export const DIRECTIVE_OBJECTIVES: Readonly<Record<string, DirectiveObjectiveDefinition>> = {
  // The Directive multiplies Development by 1.25 and then asks for Development, which made it the one
  // early objective that substantially completed itself: measured on v1.19 it cleared on almost every
  // run that did not collapse. Requiring the Transcendence era as well makes the objective ask for the
  // thing the Directive does *not* give -- a run that survives long enough to get there -- so the
  // aggressive line has to actually be played rather than merely selected.
  accelerated_development: {
    id: 'objective_accelerated_development',
    directiveId: 'accelerated_development',
    title: 'Compressed Maturity',
    description: 'Reach Development 400 in the Transcendence era.',
    isComplete: civ => civ.development >= 400 && civ.era >= 2,
  },
  cognitive_extraction: {
    id: 'objective_cognitive_extraction',
    directiveId: 'cognitive_extraction',
    title: 'Lucid Yield',
    description: 'Reach Awareness 45 while keeping Sanity at 45 or higher.',
    isComplete: civ => civ.stats.awareness >= 45 && civ.stats.sanity >= 45,
  },
  stable_cultivation: {
    id: 'objective_stable_cultivation',
    directiveId: 'stable_cultivation',
    title: 'Untorn Harvest',
    description: 'Harvest with at least 80 Stability and less than 70 Entropy.',
    isComplete: civ => civ.stats.stability >= 80 && civ.tactical.entropy < 70,
  },
  paradox_prospecting: {
    id: 'objective_paradox_prospecting',
    directiveId: 'paradox_prospecting',
    title: 'Productive Contradiction',
    description: 'Reach 50 Entropy while keeping Stability above zero.',
    isComplete: civ => civ.tactical.entropy >= 50 && civ.stats.stability > 0,
  },
  quiet_machine: {
    id: 'objective_quiet_machine',
    directiveId: 'quiet_machine',
    title: 'Unobserved Transcendence',
    description: 'Reach Transcendence below 45 Awareness and 45 Cosmic Attention.',
    isComplete: civ => civ.era >= 2 && civ.stats.awareness < 45 && civ.stats.attention < 45,
  },
  temporal_pressure: {
    id: 'objective_temporal_pressure',
    directiveId: 'temporal_pressure',
    title: 'Deadline Civilization',
    description: 'Reach Transcendence within 300 seconds after resolving at least eight interventions.',
    isComplete: civ => civ.era >= 2 && civ.elapsedSeconds <= 300 && civ.eventChoices >= 8,
  },
};

export function objectiveForDirective(directiveId: string): DirectiveObjectiveDefinition | null {
  return DIRECTIVE_OBJECTIVES[directiveId] ?? null;
}

export function evaluateDirectiveObjective(civ: Civilization): boolean {
  const objective = objectiveForDirective(civ.directiveId);
  return Boolean(objective?.isComplete(civ));
}
