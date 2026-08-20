// Branching intervention chains: a root decision that schedules a different follow-up depending on
// which way it was resolved. Appended to the event pool in engine.ts like the other layered
// catalogs, so the generated content stays frozen.
//
// The mechanism is the `follow_up` field the frozen catalog already uses (`fracture_beneath_lab` ->
// `fracture_answers_back`): the engine pushes the named id onto civ.scheduledEvents, and a scheduled
// event is served next regardless of weight, era, or pool state. Each follow-up therefore declares
// `scheduled_only: true` -- it must never be drawn on its own -- and weight 100, which only matters
// if something else ever puts it in the pool.
//
// The follow-ups are single-choice on purpose. They are not decisions but consequences: the branch
// was chosen one intervention earlier, and this is the civilization finding out what it bought.
export const EVENT_CHAINS = [
    // --- Chain 1: the monetization of absence. Legal framework outpaces physics. ---
    {
        id: 'patent_on_nothing',
        title: "A Patent On 'Nothing'",
        body: 'A corporate entity successfully patents the conceptual absence of matter and begins charging rent for the use of empty space.',
        min_era: 1,
        max_era: 3,
        weight: 7,
        max_count: 1,
        requirements: {},
        choices: [
            {
                label: 'Enforce the patent',
                prediction: "The economy booms as 'nothing' is monetized, but living in cramped, unpatented quarters ruins Collective Sanity.",
                effects: { development: 18, sanity: -12, harvest_causal_mass: 14 },
                follow_up: 'evictions_from_the_void',
                path_affinity: { bureaucratic_singularity: 2 },
                path_history: "A Patent On 'Nothing' -> Enforce the patent",
            },
            {
                label: "Declare 'nothing' open-source",
                prediction: 'Reckless philosophical legislation costs Stability and pays out in Paradox.',
                effects: { stability: -10, development: 6, harvest_paradox: 15 },
                follow_up: 'bootleg_vacuums',
                path_affinity: { reality_engineering: 2 },
                path_history: "A Patent On 'Nothing' -> Declare 'nothing' open-source",
            },
        ],
    },
    {
        id: 'evictions_from_the_void',
        title: 'Evictions From The Void',
        body: 'Citizens who cannot afford the vacuum tax are legally barred from experiencing distance. Crowds overlap into the same physical coordinates.',
        min_era: 1,
        max_era: 3,
        weight: 100,
        max_count: 1,
        requirements: { scheduled_only: true },
        choices: [
            {
                label: 'Zone overlapping citizens as a single entity',
                prediction: 'Bureaucratic efficiency peaks and yields Cognition. Human individuality does not, and Collective Sanity pays for it.',
                effects: { sanity: -15, development: 22, harvest_cognition: 18 },
                path_affinity: { collective_mind: 1, bureaucratic_singularity: 1 },
                path_history: 'Evictions From The Void -> overlapping citizens zoned as one entity',
            },
        ],
    },
    {
        id: 'bootleg_vacuums',
        title: 'Bootleg Vacuums Expand',
        body: "With 'nothing' made open-source, hobbyists begin coding their own unverified pockets of empty space. Several of them delete local landmarks.",
        min_era: 1,
        max_era: 3,
        weight: 100,
        max_count: 1,
        requirements: { scheduled_only: true },
        choices: [
            {
                label: 'Harvest the deleted landmarks',
                prediction: 'The machine takes what the civilization carelessly erased: heavy Existence, at a cost to Stability and with Cosmic Attention rising.',
                effects: { stability: -8, attention: 6, harvest_existence: 25 },
                path_affinity: { void_communion: 1 },
                path_history: 'Bootleg Vacuums Expand -> the deleted landmarks were harvested',
            },
        ],
    },
    // --- Chain 2: chronological liver failure. Causality has everyday consequences. ---
    {
        id: 'echoes_of_next_week',
        title: 'Echoes Of Next Week',
        body: 'Citizens begin suffering from intense exhaustion and hangovers for parties they will not attend until next Tuesday.',
        min_era: 1,
        max_era: 3,
        weight: 6,
        max_count: 1,
        requirements: {},
        choices: [
            {
                label: "Preemptively ban next Tuesday's parties",
                prediction: 'A sober future restores Collective Sanity at the cost of Stability, and the severed timeline bleeds Paradox.',
                effects: { sanity: 8, stability: -6, harvest_paradox: 16 },
                follow_up: 'the_boring_vacuum',
                path_affinity: { temporal_dominion: 2 },
                path_history: "Echoes Of Next Week -> Preemptively ban next Tuesday's parties",
            },
            {
                label: 'Drink twice as much to confuse the timeline',
                prediction: 'Medical chaos costs Development and Collective Sanity, but the civilization starts realizing history is malleable.',
                effects: { awareness: 10, development: -5, sanity: -5, harvest_causal_mass: 12 },
                follow_up: 'chronological_organ_strike',
                path_affinity: { cosmic_resistance: 1 },
                path_history: 'Echoes Of Next Week -> Drink twice as much',
            },
        ],
    },
    {
        id: 'the_boring_vacuum',
        title: 'The Boring Vacuum',
        body: 'Next Tuesday arrives completely void of joy. The sheer density of boredom creates a localized temporal sinkhole.',
        min_era: 1,
        max_era: 3,
        weight: 100,
        max_count: 1,
        requirements: { scheduled_only: true },
        choices: [
            {
                label: 'Throw the canceled parties inside the sinkhole',
                prediction: 'History loops perfectly and Stability holds. The machine extracts endless Cognition from the trapped revelers, and Collective Sanity from everyone else.',
                effects: { stability: 5, sanity: -8, harvest_cognition: 28 },
                path_affinity: { recursive_simulation: 1, temporal_dominion: 1 },
                path_history: 'The Boring Vacuum -> the canceled parties were thrown into the sinkhole',
            },
        ],
    },
    {
        id: 'chronological_organ_strike',
        title: 'Chronological Organ Strike',
        body: "The civilization's collective liver files for chronological independence, refusing to process toxins until they are firmly in the past.",
        min_era: 1,
        max_era: 3,
        weight: 100,
        max_count: 1,
        requirements: { scheduled_only: true },
        choices: [
            {
                label: 'Outsource metabolism to a parallel universe',
                prediction: 'A brilliant, horrific solution: Development and Existence advance while Stability falls and Cosmic Attention rises.',
                effects: { development: 25, stability: -12, attention: 8, harvest_existence: 15 },
                path_affinity: { biological_transcendence: 1, reality_engineering: 1 },
                path_history: 'Chronological Organ Strike -> metabolism was outsourced to a parallel universe',
            },
        ],
    },
    // --- Chain 3: the lunar labor dispute. Only for a civilization whose moon is sentient. ---
    {
        id: 'lunar_backpay_demanded',
        title: 'The Moon Demands Backpay',
        body: 'The moon calculates three billion years of unpaid tidal labor and issues a formal invoice to the surface. It demands payment in raw causality.',
        min_era: 1,
        max_era: 3,
        weight: 8,
        max_count: 1,
        requirements: { requires_trait: 'sentient_moon' },
        choices: [
            {
                label: "Audit the moon's timesheets",
                prediction: 'Bureaucracy stalls the celestial body, preserving Stability at the cost of Collective Sanity and a little Development.',
                effects: { stability: 8, sanity: -10, development: -4 },
                follow_up: 'moon_hires_counsel',
                path_affinity: { bureaucratic_singularity: 2 },
                path_history: "The Moon Demands Backpay -> Audit the moon's timesheets",
            },
            {
                label: 'Pay the invoice using unlived futures',
                prediction: 'The moon accepts the impossible currency and pays out in Paradox, drawing the gaze of things much larger than moons.',
                effects: { attention: 14, stability: -6, harvest_paradox: 20 },
                follow_up: 'moon_spends_currency',
                path_affinity: { void_communion: 1, temporal_dominion: 1 },
                path_history: 'The Moon Demands Backpay -> Pay the invoice using unlived futures',
            },
        ],
    },
    {
        id: 'moon_hires_counsel',
        title: 'The Moon Retains Counsel',
        body: 'Frustrated by the audits, the moon hires an entity from outside the universe to represent its labor rights.',
        min_era: 1,
        max_era: 3,
        weight: 100,
        max_count: 1,
        requirements: { scheduled_only: true },
        choices: [
            {
                label: 'Settle out of court',
                prediction: 'The civilization surrenders Development to the void to keep the tides moving, and is noticed doing it.',
                effects: { attention: 12, development: -30, harvest_existence: 30 },
                path_affinity: { void_communion: 2 },
                path_history: 'The Moon Retains Counsel -> the labor dispute was settled out of court',
            },
        ],
    },
    {
        id: 'moon_spends_currency',
        title: 'The Moon Goes Shopping',
        body: 'Flush with unlived futures, the moon purchases a slightly thicker atmosphere and a better orbit from an unknown vendor.',
        min_era: 1,
        max_era: 3,
        weight: 100,
        max_count: 1,
        requirements: { scheduled_only: true },
        choices: [
            {
                label: 'Observe the transaction',
                prediction: 'Learning exactly how a moon buys geometry yields immense Cognition, raises Awareness and costs Collective Sanity.',
                effects: { awareness: 15, sanity: -6, harvest_cognition: 25 },
                path_affinity: { reality_engineering: 1, recursive_simulation: 1 },
                path_history: 'The Moon Goes Shopping -> the transaction was observed',
            },
        ],
    },
];
//# sourceMappingURL=event-chains.js.map