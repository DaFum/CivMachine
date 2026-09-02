import type { Civilization, DramaPhase } from './types.js';
import { dramaPhaseLabel as localizedDramaPhase } from '../data/i18n.js';

// The narrative arc of a single run, which is a different axis from the Era the years put the
// civilization in. Two phases were named after Eras -- phase 0 "Emergence" against Era 0 EMERGENCE and
// phase 1 "Expansion" against Era 1 EXPANSION -- so one report could read "Expansion phase" at second
// 20 and "Entered EXPANSION" at second 90 about two unrelated systems. Only the labels moved:
// `name` is the catalog key and `id` is written into every trace sample, so both stay where they are.
const PHASES: ReadonlyArray<DramaPhase> = [
  { id: 0, name: 'emergence', label: 'Founding' },
  { id: 1, name: 'expansion', label: 'Growth' },
  { id: 2, name: 'division', label: 'Division' },
  { id: 3, name: 'transformation', label: 'Transformation' },
  { id: 4, name: 'crisis', label: 'Crisis' },
];

// `label` above is the canonical English; this is what a surface prints. The phase itself stays a
// plain constant because its `id` is written into every trace sample and its `name` is the catalog
// key -- only the label is copy.
export function dramaPhaseLabel(phase: DramaPhase): string {
  return localizedDramaPhase(phase.name) ?? phase.label;
}

export function civilizationDramaScore(civ: Civilization): number {
  return civ.development + civ.era * 120 + civ.institutions.length * 30 + civ.eventChoices * 6;
}

export function civilizationDramaPhase(civ: Civilization): DramaPhase {
  const score = civilizationDramaScore(civ);
  if (score < 70) return PHASES[0]!;
  if (score < 180) return PHASES[1]!;
  if (score < 340) return PHASES[2]!;
  if (score < 560) return PHASES[3]!;
  return PHASES[4]!;
}
