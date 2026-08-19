import { cultivationDepth } from './harvest-quality.js';
import type { Civilization, ResourceKey } from './types.js';

export interface RunInterventionDefinition {
  id: string;
  title: string;
  label: string;
  summary: string;
  currency: ResourceKey;
  baseCost: number;
  maxUses: number;
  insight: number;
}

export const RUN_INTERVENTION_COST_GROWTH = 3;
export const RUN_INTERVENTION_DEPTH_SCALE = 4;
export const CONTAINMENT_PULSE_RELIEF = 25;
export const EMERGENCY_LATTICE_FLOOR = 0.6;
export const TEMPORAL_GRAFT_YEARS = 600;
export const TEMPORAL_GRAFT_DEVELOPMENT = 30;

export const RUN_INTERVENTIONS: readonly RunInterventionDefinition[] = [
  { id: 'containment_pulse', title: 'Containment Pulse', label: 'Fire a containment pulse', summary: '-25 Entropy', currency: 'causal_mass', baseCost: 180, maxUses: 3, insight: 4 },
  { id: 'emergency_lattice', title: 'Emergency Lattice', label: 'Force the lattice back up', summary: 'Stability to 60% of maximum', currency: 'cognition', baseCost: 200, maxUses: 3, insight: 6 },
  { id: 'temporal_graft', title: 'Temporal Graft', label: 'Graft borrowed centuries', summary: '+600 years and +30 Development', currency: 'existence', baseCost: 220, maxUses: 3, insight: 9 },
];

export function runInterventionById(id: string): RunInterventionDefinition | null {
  return RUN_INTERVENTIONS.find(definition => definition.id === id) ?? null;
}

export function runInterventionUses(civ: Civilization, id: string): number {
  if (!civ.runInterventionUses) civ.runInterventionUses = {};
  return Math.max(0, Number(civ.runInterventionUses[id] ?? 0));
}

// Spending banked resources to survive longer produces more resources, which is a positive feedback
// loop. Escalation alone does not close it, because yield grows quadratically with depth, so the
// price also rises with how deep the civilization already is.
export function runInterventionCost(definition: RunInterventionDefinition, uses: number, depth: number): number {
  const escalation = Math.pow(RUN_INTERVENTION_COST_GROWTH, Math.max(0, uses));
  const depthFactor = 1 + Math.max(0, depth) / RUN_INTERVENTION_DEPTH_SCALE;
  return Math.round(definition.baseCost * escalation * depthFactor);
}

export function applyRunIntervention(civ: Civilization, definition: RunInterventionDefinition): string {
  if (definition.id === 'containment_pulse') {
    civ.tactical.entropy = Math.max(0, civ.tactical.entropy - CONTAINMENT_PULSE_RELIEF);
  } else if (definition.id === 'emergency_lattice') {
    const floorValue = civ.stats.stabilityMax * EMERGENCY_LATTICE_FLOOR;
    if (civ.stats.stability < floorValue) civ.stats.stability = floorValue;
  } else if (definition.id === 'temporal_graft') {
    civ.years += TEMPORAL_GRAFT_YEARS;
    civ.development += TEMPORAL_GRAFT_DEVELOPMENT;
  }
  civ.runInterventionUses[definition.id] = runInterventionUses(civ, definition.id) + 1;
  return definition.label;
}

export function runInterventionDepth(civ: Civilization): number {
  return cultivationDepth(civ);
}
