import { CivilizationPaths } from './paths.js';
import { cascadeDecay } from './pressure.js';
import type { Civilization, RuntimeBonuses } from './types.js';

/**
 * How fast the four civilization stats move per second of cultivation, before the frame's delta is
 * applied. The engine's tick used to hold this arithmetic inline, which put the rule the player feels
 * most directly -- how quickly a civilization slips out of the Machine's hands -- in the one place the
 * tests could not address. Every other rule lives in a module like this one; so does this one now.
 */
export interface StatDrift {
  stabilityDecay: number;
  awarenessGain: number;
  attentionGain: number;
  sanityLoss: number;
}

const BASE_STABILITY_DECAY = .018;
const BASE_AWARENESS_GAIN = .006;
const BASE_ATTENTION_GAIN = .004;
const BASE_SANITY_LOSS = .003;

/** The per-second stability decay, including the cascade the current Entropy adds on top. */
export function stabilityDecayPerSecond(civ: Civilization): number {
  const stats = civ.stats;
  let decay = BASE_STABILITY_DECAY * (1 + .55 * civ.era) * (1 + stats.attention / 140) * (1 + stats.awareness / 180) * civ.stabilityDecayMult;
  // An impossible tax is cheaper to administer than to resist; open resistance is the reverse.
  if (civ.flags.includes('impossible_tax')) decay *= .95;
  if (civ.flags.includes('resistance')) decay *= 1.2;
  decay *= CivilizationPaths.simulationModifier(civ, 'stability');
  return decay + cascadeDecay(civ.tactical.entropy, stats.stabilityMax);
}

export function awarenessGainPerSecond(civ: Civilization, bonuses: RuntimeBonuses): number {
  let awareness = BASE_AWARENESS_GAIN * civ.era;
  if (civ.flags.includes('machine_cult')) awareness *= 1.35;
  if (civ.flags.includes('planetary_mind')) awareness *= 1.2;
  return awareness * CivilizationPaths.simulationModifier(civ, 'awareness') * bonuses.awarenessGainMult;
}

export function attentionGainPerSecond(civ: Civilization, bonuses: RuntimeBonuses): number {
  return BASE_ATTENTION_GAIN * civ.era * bonuses.attentionGainMult * CivilizationPaths.simulationModifier(civ, 'attention');
}

export function sanityLossPerSecond(civ: Civilization, bonuses: RuntimeBonuses): number {
  let sanity = BASE_SANITY_LOSS * civ.era * (1 + civ.stats.attention / 60);
  if (civ.institutions.includes('Ministry Of Sanity')) sanity *= .72;
  return sanity * CivilizationPaths.simulationModifier(civ, 'sanity') * bonuses.sanityLossMult;
}

export function statDrift(civ: Civilization, bonuses: RuntimeBonuses): StatDrift {
  return {
    stabilityDecay: stabilityDecayPerSecond(civ),
    awarenessGain: awarenessGainPerSecond(civ, bonuses),
    attentionGain: attentionGainPerSecond(civ, bonuses),
    sanityLoss: sanityLossPerSecond(civ, bonuses),
  };
}
