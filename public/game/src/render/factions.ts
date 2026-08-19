import type { Civilization } from '../game/types.js';
import { CivilizationPaths } from '../game/paths.js';
import { DEFAULT_ACCENT, FACTION_SIGILS, pathAccentFor, type FactionSigil } from './primitives.js';

export const UNALIGNED_COLOR = 0x71808f;

export interface Faction { pathId: string; label: string; color: number; share: number; sigil: FactionSigil; }

/**
 * Placeholder docstring for factionRoster.
 */
export function factionRoster(civ: Civilization): Faction[] {
  const state = CivilizationPaths.ensure(civ);
  const ranked = CivilizationPaths.ranked(civ, 10);
  if (!ranked.length) return [];
  const ordered = state.dominantPath && ranked.includes(state.dominantPath)
    ? [state.dominantPath, ...ranked.filter(id => id !== state.dominantPath)]
    : ranked;
  const total = ordered.reduce((sum, id) => sum + CivilizationPaths.affinity(civ, id), 0);
  return ordered.map(id => ({
    pathId: id,
    label: CivilizationPaths.displayName(id),
    color: pathAccentFor(id) || DEFAULT_ACCENT,
    share: total > 0 ? CivilizationPaths.affinity(civ, id) / total : 0,
    sigil: FACTION_SIGILS[id] ?? 'node',
  }));
}

/**
 * Placeholder docstring for factionSignature.
 */
export function factionSignature(civ: Civilization): string {
  const roster = factionRoster(civ);
  if (!roster.length) return 'unaligned';
  return roster.slice(0, 3).map(faction => `${faction.pathId}:${Math.trunc(faction.share * 4)}`).join('/');
}
