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

/**
 * A crossed Entropy threshold, carrying the threshold itself rather than the Entropy that happened to
 * be on the clock when the crossing was noticed. A tick advances Entropy by `rate * dt`, so by the
 * time the crossing is seen the value has already moved past it -- reconstructing "25" from a
 * `Math.trunc` of the current Entropy printed 27, 29, 51 and 54 in the Machine Record for thresholds
 * that are 25 and 50. The threshold is known here and nowhere else, so it is returned from here.
 */
export interface QueuedCrisis {
  threshold: number;
  crisisId: string;
}

export interface PressureAdvance {
  before: number;
  after: number;
  rate: number;
  crises: QueuedCrisis[];
  /** The crisis ids alone -- what the scheduler queues. `crises` is what the record reports. */
  queuedCrises: string[];
}

export function pressureMultiplier(years: number): number {
  return 1 + Math.max(0, Number(years) || 0) / PRESSURE_YEAR_SCALE;
}

/**
 * The years the pressure curve is allowed to see: everything the Civilization actually lived
 * through, minus the years Accelerate injected. Measured across five seeds and three containment
 * levels, charging injected years to the curve made Accelerate strictly dominated at every level --
 * including the low-containment case the v1.5.0 spec expected it to be useful in -- because +200
 * years inflates the rate for the whole remaining run while granting only +6 Development.
 */
export function pressureYears(civ: Pick<Civilization, 'years'> & { injectedYears?: number }): number {
  return Math.max(0, (Number(civ.years) || 0) - Math.max(0, Number(civ.injectedYears) || 0));
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
  const rate = entropyRate(pressureYears(civ), bonuses.containmentRating, Boolean(civ.terminal));
  const after = Math.max(0, Math.min(100, before + rate * Math.max(0, deltaSeconds)));
  civ.tactical.entropy = after;
  const crises: QueuedCrisis[] = [];
  for (const threshold of ENTROPY_THRESHOLDS) {
    if (after >= threshold && !civ.tactical.triggeredCrises.includes(threshold)) {
      civ.tactical.triggeredCrises.push(threshold);
      const crisisId = ENTROPY_CRISIS_IDS[threshold];
      if (crisisId) crises.push({ threshold, crisisId });
    }
  }
  return { before, after, rate, crises, queuedCrises: crises.map(entry => entry.crisisId) };
}

export function cascadeDecay(entropy: number, stabilityMax: number): number {
  return entropy >= 100 ? CASCADE_DECAY_FRACTION * Math.max(1, Number(stabilityMax) || 1) : 0;
}
