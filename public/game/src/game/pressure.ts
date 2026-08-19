import type { Civilization, RuntimeBonuses } from './types.js';

export const ENTROPY_THRESHOLDS = [25, 50, 75] as const;

export const ENTROPY_CRISIS_IDS: Readonly<Record<number, string>> = {
  25: 'entropy_crisis_25',
  50: 'entropy_crisis_50',
  75: 'entropy_crisis_75',
};

export interface PressureAdvance {
  before: number;
  after: number;
  rate: number;
  queuedCrises: string[];
}

export function requiredContainment(era: number): number {
  return [0, 2, 4][Math.max(0, Math.min(2, Math.trunc(era)))] ?? 0;
}

export function entropyRate(era: number, rating: number, multiplier = 1): number {
  const index = Math.max(0, Math.min(2, Math.trunc(era)));
  const base = [0.32, 0.48, 0.72][index] ?? 0.72;
  const safeRating = Math.max(0, rating);
  const deficit = Math.max(0, requiredContainment(index) - safeRating);
  return base * (1 + 0.35 * deficit) / (1 + 0.35 * safeRating) * Math.max(0.1, multiplier);
}

export function advancePressure(
  civ: Civilization,
  bonuses: Pick<RuntimeBonuses, 'containmentRating' | 'entropyGainMult'>,
  deltaSeconds: number,
): PressureAdvance {
  const before = Math.max(0, Math.min(100, civ.tactical.entropy));
  const rate = entropyRate(civ.era, bonuses.containmentRating, bonuses.entropyGainMult);
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

export function cascadeDecay(entropy: number): number {
  return entropy >= 100 ? 7 : 0;
}
