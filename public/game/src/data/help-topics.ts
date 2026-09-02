// The field manual. Every entry answers the same three questions in the same order -- what the thing
// is, where it is on screen, and why it decides anything -- because "I do not know what is happening"
// is almost always one of those three being missing rather than all of them.
//
// Pure content: no imports, no logic. `ui/guide-view.ts` renders it and `game/tutorial.ts` reuses the
// same vocabulary, so a term explained here is never explained differently there.

export interface HelpTopic {
  id: string;
  term: string;
  what: string;
  where: string;
  why: string;
}

export interface HelpSection {
  id: string;
  title: string;
  summary: string;
  topics: HelpTopic[];
}

export const HELP_SECTIONS: ReadonlyArray<HelpSection> = [
  {
    id: 'loop',
    title: 'The Loop',
    summary: 'You are the Machine. You grow a civilization, then you harvest it. Everything else is a knob on those two moves.',
    topics: [
      {
        id: 'run',
        term: 'Run (Civilization)',
        what: 'One cultivated civilization, from its first year until you harvest, abandon or lose it.',
        where: 'Started from START CIVILIZATION in the Machine view; played in the Civilization view.',
        why: 'A run is the only thing that produces resources. Nothing accumulates while you sit in the Machine view.',
      },
      {
        id: 'harvest',
        term: 'Harvest',
        what: 'Ending a run to convert it into the four resources plus Cultivation Credits.',
        where: 'CONTROLLED HARVEST and FORCE CHAOTIC HARVEST in the Pressure & Harvest rail.',
        why: 'A run has no value until it is harvested. Waiting increases the yield and the risk of losing it.',
      },
      {
        id: 'resources',
        term: 'Causal Mass · Cognition · Paradox · Existence',
        what: 'The four harvest resources. Causal Mass tracks lived years and Development, Cognition tracks Development and Awareness, Paradox tracks damage (lost Stability, lost Sanity, Attention), Existence tracks Development and Era.',
        where: 'The bar along the top; the per-resource breakdown sits under HARVEST YIELD DETAIL.',
        why: 'They buy Machine upgrades. Because Paradox is paid by damage, a wrecked civilization is not a wasted one.',
      },
      {
        id: 'credits',
        term: 'Cultivation Credits',
        what: 'A second currency paid only by a harvest of Established grade or better: floor(0.6 × Cultivation Depth), capped at 10.',
        where: 'The meta bar under the top bar, as Cultivation Credits x/18.',
        why: '18 of them consume the Universe, which is the first prestige step. The cap of 10 is deliberate: no single run can pay for a Universe, so a prestige is always at least two good Civilizations.',
      },
      {
        id: 'insight',
        term: 'Machine Insight',
        what: 'A progression score paid by milestones. It unlocks systems and the Machine Reserve.',
        where: 'The meta bar, and the MILESTONE REGISTER panel that lists what still pays.',
        why: 'It is the only thing that survives every prestige, so a run that pays a milestone is never wasted.',
      },
    ],
  },
  {
    id: 'metrics',
    title: 'Civilization Metrics',
    summary: 'Six numbers describe the crop. Four of them can end the run; two of them only cost you yield.',
    topics: [
      {
        id: 'stability',
        term: 'Stability (STB)',
        what: 'How intact reality around the civilization is. It decays continuously and choices move it in both directions.',
        where: 'The world strip over the canvas, and the first meter in STRATEGIC OVERVIEW.',
        why: 'At zero the run ends immediately in a forced chaotic harvest. It is the resource you actually spend to stay alive.',
      },
      {
        id: 'sanity',
        term: 'Collective Sanity (SAN)',
        what: 'How well the population tolerates what you are doing to it.',
        where: 'The world strip, and STRATEGIC OVERVIEW.',
        why: 'Low Sanity pulls darker interventions into the pool and raises the Paradox a harvest pays.',
      },
      {
        id: 'awareness',
        term: 'Machine Awareness (AWR)',
        what: 'How close the civilization is to understanding that it is being farmed.',
        where: 'The world strip, and STRATEGIC OVERVIEW.',
        why: 'Above 65 the civilization starts acting against the cultivation. It also raises the Cognition yield.',
      },
      {
        id: 'attention',
        term: 'Cosmic Attention (ATT)',
        what: 'How visible the cultivation is to whatever is outside it.',
        where: 'The world strip, and STRATEGIC OVERVIEW.',
        why: 'Above 65 external observers converge. It raises the Paradox yield, which is why it is worth spending.',
      },
      {
        id: 'development',
        term: 'Development (DEV)',
        what: 'The civilization’s accumulated capability. It grows every second at a rate the run’s state sets.',
        where: 'The world strip, and the Era/Year/Development line in STRATEGIC OVERVIEW.',
        why: 'Development divided by 80 is most of Cultivation Depth, so it is the number the whole harvest scales off.',
      },
      {
        id: 'era',
        term: 'Era (ERA) and Years',
        what: 'Emergence 0–2,499 years, Expansion 2,500–6,499, Transcendence 6,500–13,999, Apotheosis 14,000+. Years advance 25 per simulation second.',
        where: 'The world strip, STRATEGIC OVERVIEW, and the ERA PROGRESSION panel.',
        why: 'Each new Era grants +1 Control Capacity, unlocks later interventions, and adds a flat Existence and Paradox bonus at harvest.',
      },
    ],
  },
  {
    id: 'pressure',
    title: 'Pressure & Time',
    summary: 'A run does not end when you get bored. It ends when Entropy reaches 100 or Stability reaches 0.',
    topics: [
      {
        id: 'entropy',
        term: 'Entropy (ENT)',
        what: 'Accumulated containment pressure. It only ever rises on its own, faster the more years the civilization has lived.',
        where: 'The ENTROPY readout in the Pressure & Harvest rail, and ENT in the world strip.',
        why: 'At 25, 50 and 75 it forces a containment crisis intervention. At 100 the run cascades and a harvest loses about 40% of its credits.',
      },
      {
        id: 'cascade',
        term: 'CASCADE IN Xs',
        what: 'How many seconds until Entropy reaches 100 if you do nothing at all.',
        where: 'Under the Entropy meter, and in the mobile strip over the world.',
        why: 'It is the deadline every other decision is measured against. It deliberately assumes no further intervention, so it is a floor, not a forecast.',
      },
      {
        id: 'containment',
        term: 'Containment Rating',
        what: 'The sum of your containment upgrades. Each point divides the Entropy rate by a little more.',
        where: 'Next to the Entropy meter, as Containment N.',
        why: 'It is the only permanent way to make runs longer. Everything else buys seconds one at a time.',
      },
      {
        id: 'control',
        term: 'Control Capacity',
        what: 'Three charges that pay for tactical actions. It refills when the civilization enters a new Era, and with the Bureaucracy of Gods upgrade.',
        where: 'The pips at the top of the TACTICAL ACTIONS rail.',
        why: 'It is the hard budget on how much you can steer a run. Spending it on the wrong action is what usually ends a promising one.',
      },
    ],
  },
  {
    id: 'harvest',
    title: 'Harvest & Depth',
    summary: 'When to stop is the actual game. The rail computes the answer instead of hinting at it.',
    topics: [
      {
        id: 'depth',
        term: 'Cultivation Depth',
        what: 'Development / 80, plus 1.5 for every endgame state the civilization reached.',
        where: 'The large number in the HARVEST GRADE readout.',
        why: 'It sets both the grade and the yield multiplier, which rises steeply at first and then flattens — a run twice as deep is worth clearly more, but not twice as much.',
      },
      {
        id: 'grade',
        term: 'Harvest Grade',
        what: 'Premature below Depth 1.67, then Established, Transcendent at 5, Ascendant at 10, Singular at 16.67. A run is also Premature until it has resolved 3 interventions and left Emergence.',
        where: 'HARVEST GRADE // in the Pressure & Harvest rail.',
        why: 'Every boundary is a Cultivation Credit step — reaching a grade is the moment the credit is paid — so the loud signal and the valuable one are the same signal. Premature pays a flat 0.2 multiplier and zero Credits, which makes leaving it the first goal of every run.',
      },
      {
        id: 'call',
        term: 'The harvest call',
        what: 'BUILDING, CLOSING, HARVEST NOW, CASCADE or capped -- computed by comparing the seconds to the next Cultivation Credit against the seconds the run can still reach.',
        where: 'The highlighted line at the bottom of the HARVEST GRADE readout.',
        why: 'It answers stay-or-harvest with arithmetic. HARVEST NOW means the next credit provably does not fit in the run that is left.',
      },
      {
        id: 'chaotic',
        term: 'Chaotic harvest',
        what: 'Ending the run through collapse instead of control: Paradox ×1.5, every other resource cut to the Contingency retention, credits rounded to 60%. It also grants a Machine mutation.',
        where: 'FORCE CHAOTIC HARVEST, or automatically at zero Stability.',
        why: 'On a run that is already lost it is strictly better than abandoning, and a Premature collapse still returns a salvage floor of 8 Causal Mass.',
      },
      {
        id: 'objective',
        term: 'Directive Objective',
        what: 'A condition attached to the Directive you drafted for the run.',
        where: 'The DIRECTIVE OBJECTIVE panel during a run; previewed on the Directive cards before it.',
        why: 'Meeting it multiplies the whole harvest by 1.15 and adds one Cultivation Credit, which is often a whole depth band of value.',
      },
    ],
  },
  {
    id: 'actions',
    title: 'Tactical Actions',
    summary: 'Four moves, keys 1 to 4, paid out of Control Capacity. Each one buys something and charges Entropy for it.',
    topics: [
      {
        id: 'stabilize',
        term: 'Stabilize (1)',
        what: '+14 Stability for 2 Control, at +6 Attention and +8 Entropy.',
        where: 'First button in the TACTICAL ACTIONS rail.',
        why: 'Stability is what a long run runs out of first. This is the direct purchase of more of it.',
      },
      {
        id: 'accelerate',
        term: 'Accelerate (2)',
        what: '+200 years and Development for 2 Control, at -4 Stability and +3 Entropy plus 3 per Era.',
        where: 'Second button in the rail.',
        why: 'The injected years are excluded from the Entropy curve, so it is a one-off price rather than a permanent rate rise.',
      },
      {
        id: 'probe',
        term: 'Probe (3)',
        what: 'Reveals the risk directions of the current intervention’s choices for 1 Control.',
        where: 'Third button in the rail; the result appears inside the intervention card.',
        why: 'Without a Prediction Core this is the only way to see what a choice will do before taking it.',
      },
      {
        id: 'vent',
        term: 'Entropy Vent (4)',
        what: '-18 Entropy for 1 Control, paid with 10 Stability and 4 Attention.',
        where: 'Fourth button in the rail.',
        why: 'It is the only way to push the cascade back, which makes Stability the currency that actually buys run length.',
      },
      {
        id: 'reserve',
        term: 'Machine Reserve',
        what: 'Banked resources committed into the running civilization. Each use triples its own price, and the price rises with the Depth already reached.',
        where: 'The MACHINE RESERVE panel, once Machine Insight allows it.',
        why: 'It converts resources you already own into one more depth band on a run that is going well.',
      },
    ],
  },
  {
    id: 'machine',
    title: 'Machine & Progression',
    summary: 'Between runs you spend what the last one paid, and pick what the next one is allowed to be.',
    topics: [
      {
        id: 'upgrades',
        term: 'Machine Upgrades',
        what: 'Permanent-until-prestige purchases in the four resources.',
        where: 'MACHINE UPGRADES in the Machine view.',
        why: 'Containment, harvest multipliers and the Prediction Core all come from here. This is where a harvest becomes a better next run.',
      },
      {
        id: 'directive',
        term: 'Directive draft',
        what: 'Three deterministic offers per run; picking one locks it for that run and attaches its objective.',
        where: 'The NEXT CIVILIZATION panel.',
        why: 'The Directive changes the run’s multipliers, so it is chosen against the run you intend to play rather than at random.',
      },
      {
        id: 'traits',
        term: 'Starting traits',
        what: 'The traits the next civilization will be born with, previewed exactly because they are derived from its seed.',
        where: 'STARTING TRAITS // DETERMINISTIC PREVIEW in the NEXT CIVILIZATION panel.',
        why: 'They are visible before you commit, so the run can be planned instead of discovered.',
      },
      {
        id: 'prestige',
        term: 'Consume Universe / Collapse Multiverse',
        what: '18 Cultivation Credits consume the Universe for Universal Residue; 4 Universes collapse the Multiverse for Axioms.',
        where: 'The buttons at the bottom of the Machine view, once unlocked.',
        why: 'Each layer resets the one below it and pays a currency the reset cannot touch.',
      },
      {
        id: 'convergence',
        term: 'Great Convergence',
        what: 'A terminal run that starts in Apotheosis, pays no yield and runs at 1.6× Entropy. It is won by a controlled harvest at or beyond the target Depth.',
        where: 'The GREAT CONVERGENCE panel, after the first Multiverse.',
        why: 'It is the win condition, and each one grants permanent harvest yield and Containment. Failing costs nothing but the run.',
      },
    ],
  },
];

// The world strip is the densest surface in the game and it is all abbreviations. Explain mode and
// the strip's own tooltips read from here, so a new column cannot ship unexplained.
export const HELP_ABBREVIATIONS: Readonly<Record<string, string>> = {
  ERA: 'Era — Emergence, Expansion, Transcendence, Apotheosis',
  DEV: 'Development — the capability score Cultivation Depth is computed from',
  STB: 'Stability — reality integrity; the run ends at zero',
  SAN: 'Sanity — population tolerance',
  AWR: 'Awareness — how close the civilization is to noticing the farm',
  ATT: 'Attention — how visible the cultivation is from outside',
  ENT: 'Entropy — containment pressure; the run cascades at 100',
};

// Explain-mode notes, keyed by the panel they annotate. One sentence each: what the panel is for and
// what decision it is supposed to inform.
export const EXPLAIN_NOTES: Readonly<Record<string, string>> = {
  machine_hero: 'The Machine view is between runs. Nothing accumulates here — spend the last harvest, then start the next civilization.',
  run_preparation: 'What the next run will be: its seed-derived starting traits and, once unlocked, one of three drafted Directives. Both are visible before you commit.',
  machine_upgrades: 'Permanent purchases that change every following run. Containment buys length; the harvest modules buy yield.',
  milestones: 'Every milestone pays Machine Insight, which no prestige takes back. Read it as the list of things worth aiming a run at.',
  run_report: 'What the run just did, why it stopped and what it paid. The lessons are derived from this run’s own numbers.',
  field_manual: 'Every term in the game, with where it is on screen and what it decides.',
  situation: 'One sentence on what is happening right now, why, and the move it suggests. It is recomputed from the run’s live state, not scripted.',
  intervention: 'A decision the civilization is forcing on you. The run is paused on it — the clock only moves again once you choose.',
  decision_feedback: 'The exact before/after of the choice you just made, so a decision is never a mystery after the fact.',
  command_rail: 'What you can spend Control Capacity on. Every action buys something and charges Entropy for it.',
  pressure_rail: 'When the run should end. The Entropy readout is the deadline; the harvest readout is what stopping is worth right now.',
  harvest_readout: 'Grade, Depth and the next band, plus the computed stay-or-harvest call.',
  strategic_overview: 'The four metrics that can end the run or change what it pays, with the Era and Development line under them.',
  objective: 'The condition attached to the Directive you drafted. Meeting it is worth ×1.15 and one extra Cultivation Credit.',
  reserve: 'Banked resources spent into the live run. Each use triples its own price.',
  harvest_detail: 'The per-resource breakdown behind the grade, controlled against chaotic.',
  world: 'The civilization itself, drawn from its live state. Drag to explore; the strip over it is the same numbers as the panels below.',
};
