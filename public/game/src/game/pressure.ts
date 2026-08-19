import type { Civilization } from './types.js';

export const ENTROPY_THRESHOLDS = [25, 50, 75] as const;

export const ENTROPY_CRISIS_IDS: Readonly<Record<number, string>> = {
  25: 'entropy_crisis_25',
  50: 'entropy_crisis_50',
  75: 'entropy_crisis_75',
};

export const PRESSURE_BASE = 0.48;
export const PRESSURE_YEAR_SCALE = 6500;
export const CONTAINMENT_RELIEF = 0.4;
export const CASCADE_DECAY_FRACTION = 0.07;
export const TERMINAL_ENTROPY_MULTIPLIER = 1.6;
const YEARS_PER_SECOND = 25;

export interface PressureAdvance {
  before: number;
  after: number;
  rate: number;
  queuedCrises: string[];
}

export function pressureMultiplier(years: number): number {
  return 1 + Math.max(0, Number(years) || 0) / PRESSURE_YEAR_SCALE;
}

function relief(containment: number): number {
  return 1 + CONTAINMENT_RELIEF * Math.max(0, Number(containment) || 0);
}

export function entropyRate(years: number, containment: number, terminal = false): number {
  return PRESSURE_BASE * pressureMultiplier(years) / relief(containment) * (terminal ? TERMINAL_ENTROPY_MULTIPLIER : 1);
}

export function secondsToCascade(years: number, entropy: number, containment: number, terminal = false): number {
  const remaining = Math.max(0, 100 - (Number(entropy) || 0));
  if (remaining <= 0) return 0;
  const scale = terminal ? TERMINAL_ENTROPY_MULTIPLIER : 1;
  const b = pressureMultiplier(years);
  const c = relief(containment) * remaining / (PRESSURE_BASE * scale);
  const k = YEARS_PER_SECOND / (2 * PRESSURE_YEAR_SCALE);
  return (-b + Math.sqrt(b * b + 4 * k * c)) / (2 * k);
}

export function advancePressure(
  civ: Civilization,
  bonuses: { containmentRating: number },
  deltaSeconds: number,
): PressureAdvance {
  const before = Math.max(0, Math.min(100, civ.tactical.entropy));
  const rate = entropyRate(civ.years, bonuses.containmentRating, Boolean(civ.terminal));
  const after = Math.max(0, Math.min(100, before + rate * Math.max(0, deltaSeconds)));
  civ.tactical.entropy = after;
  const queuedCrises: string[] = [];
  for (const threshold of ENTROPY_THRESHOLDS) {
    if (after >= threshold && !civ.tactical.triggeredCrises.includes(threshold)) {
      civ.tactical.triggeredCrises.push(threshold);
      const crisisId = ENTROPY_CRISIS_IDS[threshold];
      if (crisisId) queuedCrises.push(crisisId);
    }
  }
  return { before, after, rate, queuedCrises };
}

export function cascadeDecay(entropy: number, stabilityMax: number): number {
  return entropy >= 100 ? CASCADE_DECAY_FRACTION * Math.max(1, Number(stabilityMax) || 1) : 0;
}
