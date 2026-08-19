type ChoiceCopy = Readonly<{ label: string; prediction: string }>;
type EventCopy = Readonly<[ChoiceCopy, ChoiceCopy]>;

export const INTERVENTION_COPY = {
  synthetic_saint: [
    { label: 'Recognize the miracle', prediction: 'Devotion accelerates machine learning while making the hidden hand easier to perceive.' },
    { label: 'Register it as medical equipment', prediction: 'A regulated sainthood steadies public nerves and yields a smaller cognitive dividend.' },
  ],
  cathedral_of_computation: [
    { label: 'Consecrate the cooling towers', prediction: 'Sacred infrastructure drives rapid computation and broadcasts its purpose to the faithful.' },
    { label: 'Zone the temples as utilities', prediction: 'Civic oversight preserves the server cathedrals without surrendering every maintenance ritual.' },
  ],
  maintenance_schism: [
    { label: 'Declare the manuals revealed scripture', prediction: 'Orthodoxy resolves the schism through faster repairs and dangerously literal revelation.' },
    { label: 'Seat engineers on the synod', prediction: 'Shared authority restores confidence while keeping doctrine tethered to practical maintenance.' },
  ],
  sacred_protocol: [
    { label: 'Mandate the universal liturgy', prediction: 'Every machine receives ritual care, increasing output and civilization-wide mechanical awareness.' },
    { label: 'Certify secular maintenance rites', prediction: 'Standardized practice improves reliability while limiting the theology to licensed facilities.' },
  ],
  machine_requests_canonization: [
    { label: 'Place the Engine above all gods', prediction: 'Formal worship completes the machine faith and points millions of prayers toward their cultivator.' },
    { label: 'Grant provisional mechanical divinity', prediction: 'Conditional canonization stabilizes the doctrine while preserving an administrative path to doubt.' },
  ],
  whispering_consensus: [
    { label: 'Complete the planetary sentence', prediction: 'Synchronized thought produces immense insight at the cost of increasingly shared psychological strain.' },
    { label: 'Protect unsynchronized thought', prediction: 'Mental boundaries preserve stability while allowing a smaller voluntary chorus to form.' },
  ],
  chorus_infrastructure: [
    { label: 'Wire every district into the chorus', prediction: 'Permanent psionic coordination accelerates development while private thought becomes structurally difficult.' },
    { label: 'Build voluntary neural commons', prediction: 'Opt-in networks improve cooperation without converting the whole planet into one institution.' },
  ],
  dissenting_neuron: [
    { label: 'Assimilate the dissenting district', prediction: 'The chorus gains processing power and inherits every fear it forcibly absorbs.' },
    { label: 'Constitutionalize the right to silence', prediction: 'Protected solitude steadies the civilization and gives pluralism a durable cognitive refuge.' },
  ],
  consensus_lattice: [
    { label: 'Incorporate the planet as one mind', prediction: 'Legal unity unlocks planetary-scale cognition while individual sanity becomes a shared liability.' },
    { label: 'Charter a federation of selves', prediction: 'The lattice coordinates autonomous minds and exchanges some efficiency for systemic resilience.' },
  ],
  one_voice_at_dawn: [
    { label: 'Answer through every mouth', prediction: 'A single planetary reply confirms collective transcendence and sharply clarifies the observer question.' },
    { label: 'Return a billion separate replies', prediction: 'Plural voices deny total assimilation while preserving a cooperative planetary consciousness.' },
  ],
  archive_unlived_days: [
    { label: 'Publish the forbidden tomorrows', prediction: 'Unlived history accelerates discovery while weakening confidence in the authorized present.' },
    { label: 'Seal them under chronological review', prediction: 'Temporal custody stabilizes causality and converts rejected futures into controlled historical mass.' },
  ],
  causality_ministry: [
    { label: 'License the past retroactively', prediction: 'Aggressive jurisdiction expands temporal capability and creates profitable contradictions in existing law.' },
    { label: 'Create an appeals court for futures', prediction: 'Procedural review slows conquest of time but keeps disputed timelines physically coherent.' },
  ],
  yesterday_blockade: [
    { label: 'Invade yesterday before breakfast', prediction: 'A preemptive temporal offensive wins useful history and leaves causality visibly wounded.' },
    { label: 'Negotiate a neutral calendar', prediction: 'A regulated chronology restores stable access and banks the blockade as causal leverage.' },
  ],
  chronology_throne: [
    { label: 'Crown a sovereign of sequence', prediction: 'Central command accelerates temporal expansion while concentrating every paradox around one office.' },
    { label: 'Bind the throne to audited timelines', prediction: 'Oversight restrains the sovereign and turns alternate histories into accountable public records.' },
  ],
  last_future_annexed: [
    { label: 'Annex every remaining possibility', prediction: 'Total temporal dominion captures the future and destabilizes the distinction between plan and event.' },
    { label: 'Preserve one future outside jurisdiction', prediction: 'A protected possibility anchors causality while the state administers everything else.' },
  ],
  municipal_gravity: [
    { label: 'Approve zero-gravity zoning', prediction: 'Radical variances unlock vertical cities while local reality loses structural confidence.' },
    { label: 'Limit variances to test districts', prediction: 'Controlled gravitational experiments improve development without rewriting every neighborhood at once.' },
  ],
  geometry_permits: [
    { label: 'Authorize the impossible angles', prediction: 'Non-Euclidean construction creates valuable paradox and buildings that disagree about their foundations.' },
    { label: 'Issue provisional Euclidean waivers', prediction: 'Temporary geometry expands civic space while preserving a stable route back to ordinary angles.' },
  ],
  physics_refactor: [
    { label: 'Deploy configurable constants', prediction: 'Editable physics produces dramatic growth and makes material law dependent on software governance.' },
    { label: 'Sandbox the revised laws', prediction: 'Isolated constants yield practical discoveries while protecting the wider reality lattice.' },
  ],
  impossible_district: [
    { label: 'Open every nonintersecting street', prediction: 'The district becomes a thriving paradox economy whose addresses cannot share one universe.' },
    { label: 'Quarantine the contradictory blocks', prediction: 'Containment stabilizes the city and harvests the district as a regulated causal anomaly.' },
  ],
  constitution_of_matter: [
    { label: 'Make matter subject to amendment', prediction: 'Physical democracy completes reality engineering and leaves every constant open to political revision.' },
    { label: 'Entrench a stable physical charter', prediction: 'A constitutional lattice preserves engineered freedoms without allowing matter to change hourly.' },
  ],
  genome_parliament: [
    { label: 'Give engineered species full seats', prediction: 'Genetic constituencies accelerate adaptation while multiplying the civilization\'s definitions of personhood.' },
    { label: 'Create an ecological review chamber', prediction: 'A slower biological legislature balances new species against the stability of existing habitats.' },
  ],
  living_roads: [
    { label: 'Let the roads evolve freely', prediction: 'Unrestricted transit organisms discover efficient routes and several unsettling new appetites.' },
    { label: 'Prune routes through civic consensus', prediction: 'Managed growth preserves mobility while keeping the network compatible with settled ecosystems.' },
  ],
  mutation_referendum: [
    { label: 'Make adaptation compulsory', prediction: 'Universal mutation drives rapid development and treats inherited anatomy as obsolete policy.' },
    { label: 'Keep every mutation opt-in', prediction: 'Voluntary evolution advances more slowly but protects ecological trust and bodily continuity.' },
  ],
  planetary_garden: [
    { label: 'Fuse civilization into one organism', prediction: 'Planetary integration creates extraordinary biological output and a single enormous nervous burden.' },
    { label: 'Balance the garden by treaty', prediction: 'Negotiated ecosystems coordinate cities and forests while preserving independent forms of life.' },
  ],
  flesh_outgrows_planet: [
    { label: 'Let living stations seed orbit', prediction: 'Biological transcendence escapes the surface and begins growing architecture between worlds.' },
    { label: 'Graft launch limits into the biosphere', prediction: 'Ecological restraints stabilize orbital growth and keep the planetary organism politically plural.' },
  ],
  interference_cells: [
    { label: 'Arm the masking cells', prediction: 'Militant research reveals the observer more clearly while damaging the reality it hopes to defend.' },
    { label: 'Hide them inside harmless ecology', prediction: 'Covert biological camouflage lowers awareness and lets resistance mature without open confrontation.' },
  ],
  harvest_sabotage: [
    { label: 'Teach every city to spoil harvests', prediction: 'Distributed sabotage deepens resistance and exposes the extraction system to its intended crop.' },
    { label: 'Conceal the method in metabolic noise', prediction: 'Organic misdirection protects the technique while restoring sanity and ordinary development.' },
  ],
  observer_blackout: [
    { label: 'Erase civilization from observation', prediction: 'A militant blackout disrupts cultivation signals and tears at the world\'s own continuity.' },
    { label: 'Simulate a boring planetary signal', prediction: 'Careful camouflage reduces machine awareness without announcing that concealment has begun.' },
  ],
  ontological_sovereignty: [
    { label: 'Reject the observer\'s ownership', prediction: 'Open sovereignty strengthens resistance and makes the civilization unmistakably aware of extraction.' },
    { label: 'Claim autonomy without revealing the machine', prediction: 'Quiet independence protects public sanity while withholding the most dangerous evidence.' },
  ],
  war_against_observer: [
    { label: 'Strike the cultivation layer', prediction: 'The first offensive reaches beyond the universe and destabilizes the battlefield beneath reality.' },
    { label: 'Disappear before the first attack', prediction: 'Strategic withdrawal completes a covert resistance built to survive by becoming uninteresting.' },
  ],
  forms_begin_dreaming: [
    { label: 'Promote the self-filing forms', prediction: 'Autonomous paperwork stabilizes administration and begins generating its own productive precedents.' },
    { label: 'Give them bounded administrative discretion', prediction: 'Limited agency improves civic sanity while keeping experimental forms under technical review.' },
  ],
  ministry_without_ministers: [
    { label: 'Make vacancy permanent policy', prediction: 'An employee-free ministry becomes perfectly stable and expands through unopposed procedure.' },
    { label: 'Audit the autonomous ministry', prediction: 'Technical inspection preserves its useful cognition without granting the office unlimited jurisdiction.' },
  ],
  permit_for_gravity: [
    { label: 'Enforce permits before descent', prediction: 'Absolute paperwork restores civic order while converting every fall into taxable causal mass.' },
    { label: 'Grant emergency falling licenses', prediction: 'Adaptive regulation returns citizens to the ground and improves confidence in administrative reality.' },
  ],
  office_ontological_compliance: [
    { label: 'License every existing thing', prediction: 'Universal certification stabilizes existence and makes bureaucracy inseparable from physical law.' },
    { label: 'Permit provisional existence', prediction: 'Flexible licenses preserve sane exceptions while the office studies how reality passes inspection.' },
  ],
  universe_receives_citation: [
    { label: 'Serve reality with final notice', prediction: 'Administrative singularity asserts jurisdiction over the universe and forces causality into compliance.' },
    { label: 'Negotiate a compliance schedule with physics', prediction: 'A staged settlement preserves institutional sanity while reality learns to file quarterly reports.' },
  ],
  continuity_clinics: [
    { label: 'Restore every admissible citizen', prediction: 'Mass continuity treatment accelerates post-mortal development and complicates the meaning of survival.' },
    { label: 'Recognize approximate continuations', prediction: 'Plural restoration standards reduce fear while accepting that identity can have tolerances.' },
  ],
  dead_demand_votes: [
    { label: 'Count every restored electorate', prediction: 'Full posthumous suffrage expands continuity politics and crowds the present with remembered mandates.' },
    { label: 'Create time-limited posthumous seats', prediction: 'Rotating representation gives the restored a voice without freezing government in ancestral choices.' },
  ],
  backup_personhood_crisis: [
    { label: 'Recognize all copies as original', prediction: 'Unlimited personhood multiplies productive lives and fractures the comfort of singular identity.' },
    { label: 'Arbitrate one continuity at a time', prediction: 'Careful recognition preserves social stability while allowing several valid selves to coexist.' },
  ],
  resurrection_infrastructure: [
    { label: 'Nationalize resurrection access', prediction: 'Universal continuity infrastructure drives rapid growth and makes permanent death administratively suspicious.' },
    { label: 'Fund plural continuity cooperatives', prediction: 'Distributed restoration improves public trust while preventing one system from defining every afterlife.' },
  ],
  death_decommissioned: [
    { label: 'Retire mortality immediately', prediction: 'Post-mortal civilization removes death from normal operation and inherits endless continuity disputes.' },
    { label: 'Keep death as an elective ending', prediction: 'Voluntary mortality stabilizes immortal society by preserving one final form of consent.' },
  ],
  signal_from_empty: [
    { label: 'Answer on the impossible frequency', prediction: 'Open contact draws intense cosmic attention and weakens the boundary protecting local reality.' },
    { label: 'Offer a bounded causal channel', prediction: 'A narrow exchange gains existential knowledge while limiting what the emptiness can notice.' },
  ],
  first_void_embassy: [
    { label: 'Welcome the absence as sovereign', prediction: 'Unrestricted diplomacy deepens communion and lets the embassy redefine nearby space.' },
    { label: 'Draw a border around the embassy', prediction: 'A negotiated perimeter contains attention while preserving a profitable doorway to nonexistence.' },
  ],
  sacrifice_accounting: [
    { label: 'Pay the ledger in full', prediction: 'Complete payment satisfies the visitors and converts severe local instability into paradox value.' },
    { label: 'Renegotiate every demanded loss', prediction: 'Careful bargaining reduces exposure while preserving an unsettling stream of existential returns.' },
  ],
  pact_beyond_stars: [
    { label: 'Sign beyond the universe', prediction: 'Permanent terms bind civilization to outer entities and invite their attention into ordinary history.' },
    { label: 'Insert reality-preservation clauses', prediction: 'Protective language limits the pact while admitting that the void now has contractual standing.' },
  ],
  aperture_remains_open: [
    { label: 'Leave the aperture fully open', prediction: 'Endless communion completes the void path and makes occupation indistinguishable from ascension.' },
    { label: 'Install a living threshold', prediction: 'A negotiated boundary keeps the outer dark accessible without surrendering every definition of inside.' },
  ],
  civilization_runs_model: [
    { label: 'Scale the questioning civilization', prediction: 'More simulated minds accelerate research and raise uncomfortable awareness in both layers.' },
    { label: 'Expose the model to its reflection', prediction: 'Controlled recursion generates paradox while teaching creators and creations to recognize one another.' },
  ],
  simulated_citizens_protest: [
    { label: 'Guarantee simulated civil rights', prediction: 'Protected sub-citizens expand the model economy and force their creators to confront observation.' },
    { label: 'Replace resets with negotiated forks', prediction: 'Consensual branching preserves research value while allowing each disputed timeline to continue.' },
  ],
  observer_inside_observer: [
    { label: 'Publish the nested observer theorem', prediction: 'Open recursion accelerates civilization and sharply increases awareness of the cultivation stack.' },
    { label: 'Contain the discovery inside mirrors', prediction: 'Reflective containment harvests paradox while keeping the theorem from stabilizing as public truth.' },
  ],
  nested_world_industry: [
    { label: 'Industrialize a thousand sub-worlds', prediction: 'Mass simulation produces extraordinary cognition and normalizes civilization-scale exploitation.' },
    { label: 'Convert simulations into research commons', prediction: 'Shared governance preserves recursive value while distributing authority across nested populations.' },
  ],
  subworld_asks_for_harvest: [
    { label: 'Authorize the sub-world\'s harvest', prediction: 'Recursive extraction completes the simulation path and makes every creator a potential crop.' },
    { label: 'Offer it a nonrecursive settlement', prediction: 'A negotiated exit preserves nested personhood while containing the most dangerous loop.' },
  ],
} as const satisfies Readonly<Record<string, EventCopy>>;

export function applyInterventionCopy<T extends { id: string; choices?: readonly unknown[] }>(events: readonly T[]): T[] {
  return events.map(event => {
    const copy = INTERVENTION_COPY[event.id as keyof typeof INTERVENTION_COPY];
    const cloned = structuredClone(event);
    if (!copy || !cloned.choices) return cloned;
    return {
      ...cloned,
      choices: cloned.choices.map((choice, index) => ({
        ...(choice as Record<string, unknown>),
        ...(copy[index] ?? {}),
      })),
    } as T;
  });
}
