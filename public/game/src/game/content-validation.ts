import type {
  BreedingMatrixDefinition,
  DirectiveDefinition,
  MutationDefinition,
  PathEvent,
  Trait,
  UpgradeDefinition,
} from './types.js';

export interface GameContent {
  traits: Trait[];
  events: PathEvent[];
  machine_upgrades: UpgradeDefinition[];
  universe_upgrades: UpgradeDefinition[];
  axiom_upgrades: UpgradeDefinition[];
  directives: DirectiveDefinition[];
  breeding_matrices: BreedingMatrixDefinition[];
  mutations: MutationDefinition[];
  [key: string]: unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateGameContent(raw: unknown): GameContent {
  const obj = isPlainObject(raw) ? raw : {};
  return {
    ...obj,
    traits: Array.isArray(obj.traits) ? (obj.traits as Trait[]) : [],
    events: Array.isArray(obj.events) ? (obj.events as PathEvent[]) : [],
    machine_upgrades: Array.isArray(obj.machine_upgrades)
      ? (obj.machine_upgrades as UpgradeDefinition[])
      : [],
    universe_upgrades: Array.isArray(obj.universe_upgrades)
      ? (obj.universe_upgrades as UpgradeDefinition[])
      : [],
    axiom_upgrades: Array.isArray(obj.axiom_upgrades)
      ? (obj.axiom_upgrades as UpgradeDefinition[])
      : [],
    directives: Array.isArray(obj.directives)
      ? (obj.directives as DirectiveDefinition[])
      : [],
    breeding_matrices: Array.isArray(obj.breeding_matrices)
      ? (obj.breeding_matrices as BreedingMatrixDefinition[])
      : [],
    mutations: Array.isArray(obj.mutations)
      ? (obj.mutations as MutationDefinition[])
      : [],
  };
}
