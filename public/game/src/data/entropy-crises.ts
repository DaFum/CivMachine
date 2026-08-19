export const ENTROPY_CRISES = [
  {
    id: 'entropy_crisis_25',
    title: 'The First Containment Fracture',
    body: 'A hairline contradiction crosses every observatory at once. The civilization mistakes the wound for a new constellation.',
    min_era: 0,
    max_era: 2,
    weight: 1,
    requirements: { scheduled_only: true },
    choices: [
      {
        label: 'Seal the splintering constants',
        prediction: 'Stability rises, but collective sanity absorbs the impossible repair while Entropy recedes.',
        effects: { stability: 10, sanity: -6, entropy: -2 },
      },
      {
        label: 'Map the widening fault',
        prediction: 'The breach yields knowledge, increasing Awareness and Cosmic Attention while only partially easing Entropy.',
        effects: { awareness: 7, attention: 5, entropy: 1 },
      },
    ],
  },
  {
    id: 'entropy_crisis_50',
    title: 'History Desynchronizes',
    body: 'Districts now remember incompatible centuries. Citizens meet descendants who insist the present happened differently.',
    min_era: 0,
    max_era: 2,
    weight: 1,
    requirements: { scheduled_only: true },
    choices: [
      {
        label: 'Synchronize every civic clock',
        prediction: 'A single timeline restores Sanity and reduces Entropy, but the forced correction damages Stability.',
        effects: { sanity: 10, stability: -8, entropy: -2 },
      },
      {
        label: 'Archive the contradictory decades',
        prediction: 'Development and Awareness advance through parallel records, though the unresolved histories attract attention.',
        effects: { development: 18, awareness: 5, attention: 6, entropy: 3 },
      },
    ],
  },
  {
    id: 'entropy_crisis_75',
    title: 'The Cultivator Is Seen',
    body: 'For one catastrophic instant, billions look beyond their sky and focus on the machinery holding their reality together.',
    min_era: 0,
    max_era: 2,
    weight: 1,
    requirements: { scheduled_only: true },
    choices: [
      {
        label: 'Blind the outer observers',
        prediction: 'Cosmic Attention and Entropy fall sharply, but the forced amnesia tears at Collective Sanity.',
        effects: { attention: -12, sanity: -8, entropy: -2 },
      },
      {
        label: 'Broadcast a counterfeit apocalypse',
        prediction: 'The spectacle reinforces Stability and masks the machine briefly, at the cost of Awareness and Attention.',
        effects: { stability: 12, awareness: 8, attention: 10, entropy: 4 },
      },
    ],
  },
] as const;
