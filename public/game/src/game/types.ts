export type ResourceKey = 'causal_mass' | 'cognition' | 'paradox' | 'existence';
export type Layer = 'machine' | 'universe' | 'axiom';
export type Phase = 'machine' | 'civilization' | 'victory';
export type TacticalActionId = 'stabilize' | 'accelerate' | 'probe' | 'vent';
export type HarvestGrade = 'premature' | 'established' | 'transcendent' | 'ascendant' | 'singular';

export interface Stats {
  stability: number;
  stabilityMax: number;
  awareness: number;
  sanity: number;
  attention: number;
}

export interface PathState {
  affinity: Record<string, number>;
  dominantPath: string;
  completedEvents: string[];
  choiceFlags: string[];
  recentPaths: string[];
  recentDeltas: Record<string, number>;
  endgameState: string;
  endgameStates: string[];
  successions: number;
  successionAtChoice: number;
}

export interface DecisionMetricDelta {
  key: string;
  label: string;
  before: number;
  after: number;
  delta: number;
}

export interface DecisionAffinityDelta {
  pathId: string;
  label: string;
  delta: number;
}

export type DramaPhaseId = 0 | 1 | 2 | 3 | 4;
export type DramaPhaseName = 'emergence' | 'expansion' | 'division' | 'transformation' | 'crisis';

export interface DramaPhase {
  id: DramaPhaseId;
  name: DramaPhaseName;
  label: string;
}

export type DecisionSignificance = 'routine' | 'major' | 'turning_point';
export type ConsequenceTag =
  | 'urban_growth' | 'technological_growth' | 'urban_decline' | 'militarization' | 'civil_unrest'
  | 'religious_shift' | 'ecological_damage' | 'reality_damage' | 'surveillance' | 'mass_casualty'
  | 'stabilization' | 'containment' | 'institution_growth' | 'path_shift' | 'apotheosis_contact';

export interface DecisionTransition {
  dramaPhase?: { from: DramaPhaseId; to: DramaPhaseId };
  era?: { from: number; to: number };
  dominantPath?: { from: string; to: string };
  endgameStateAdded?: string;
  entropyBand?: { from: number; to: number };
}

export interface DecisionConsequence {
  significance: DecisionSignificance;
  tags: ConsequenceTag[];
  transitions: DecisionTransition;
  signatureProfile: string;
}

export type MemoryDomain = 'built_environment' | 'identity' | 'control' | 'social' | 'ecology' | 'reality';
export type ScarDomain = 'reality' | 'civilization' | 'identity';

export interface WorldMemoryMark {
  domain: MemoryDomain;
  motif: string;
  strength: 1 | 2 | 3;
  sourceEventId: string;
  createdAtSequence: number;
  anchor01: number;
  repairable: boolean;
  repaired?: boolean;
}

export interface WorldScar {
  domain: ScarDomain;
  motif: string;
  strength: 1 | 2 | 3;
  sourceEventId: string;
  createdAtSequence: number;
  anchor01: number;
  evolution: number;
}

export interface WorldMemoryState {
  version: 1;
  sequence: number;
  marks: WorldMemoryMark[];
  scars: WorldScar[];
}

export interface DecisionAddition {
  kind: 'trait' | 'institution' | 'flag' | 'path_flag';
  // The id is what the copy is resolved from; `kindLabel` and `label` are that resolution, carried so
  // the panel prints them side by side without humanizing an id itself. Both are re-resolved when the
  // feedback is read, so a locale switch reaches a card that is still on screen.
  id: string;
  kindLabel: string;
  label: string;
}

export interface DecisionFeedback {
  sequence: number;
  eventId: string;
  // Present only for a real intervention, where the choice is one of the event's own -- the synthetic
  // decisions resolve their label from the prefixed id instead.
  choiceIndex?: number;
  eventTitle: string;
  choiceLabel: string;
  tone: 'positive' | 'negative' | 'mixed';
  metrics: DecisionMetricDelta[];
  affinities: DecisionAffinityDelta[];
  additions: DecisionAddition[];
  consequence: DecisionConsequence;
}

export interface TacticalState {
  entropy: number;
  controlCapacity: number;
  triggeredCrises: number[];
  probedEventId: string;
  actionUsage: Record<TacticalActionId, number>;
}

export interface DirectiveObjectiveState {
  id: string;
  completed: boolean;
}

export interface Civilization {
  seed: number;
  rngState: number;
  elapsedSeconds: number;
  years: number;
  // Years injected by Accelerate rather than lived through. They advance Era and Development but are
  // excluded from the Entropy pressure curve, so Accelerate pays a one-off price instead of a
  // permanent rate surcharge. Optional and defaulted to 0 so v4 saves load unchanged: an in-progress
  // run from an older save simply keeps counting its injected years as pressure, exactly as before.
  injectedYears?: number;
  era: number;
  development: number;
  developmentMultiplier: number;
  eventTimer: number;
  pendingEvent: string;
  lastEvent: string;
  eventCounts: Record<string, number>;
  recentEventIds?: string[];
  eventChoices: number;
  traits: string[];
  institutions: string[];
  flags: string[];
  scheduledEvents: string[];
  history: string[];
  // Presentation-only narrative memory. Optional so v4 saves load unchanged, and deliberately never
  // read by progression, pressure, harvest, or scheduler rules -- only the renderer consumes it.
  visualMemory?: WorldMemoryState;
  // Presentation-only run trace: a bounded, self-downsampling curve of the run so the post-run
  // report can show how it developed rather than only how it ended. Same contract as visualMemory --
  // optional so v4 saves load unchanged, and no rule module may read it.
  trace?: RunTraceState;
  stats: Stats;
  harvestBonus: Record<ResourceKey, number>;
  harvestMult: Record<ResourceKey, number>;
  stabilityDecayMult: number;
  eventDelayBonus: number;
  predictionLevel: number;
  pathState: PathState;
  tactical: TacticalState;
  directiveId: string;
  directiveObjective: DirectiveObjectiveState;
  terminal: boolean;
  runInterventionUses: Record<string, number>;
}

export interface ProgressionState {
  machineInsight: number;
  unlockedSystems: string[];
  discoveredResources: string[];
  knownDirectives: string[];
  knownBreedingMatrices: string[];
  knownAxioms: string[];
  milestones: Record<string, boolean>;
  announcedUnlocks: string[];
  controlledHarvestsTotal: number;
  chaoticHarvestsTotal: number;
  seenDominantPaths: string[];
  bestDepth: number;
  bestGrade: HarvestGrade | '';
  maxDevelopment: number;
  maxEra: number;
  objectivesCompleted: number;
  longestRunSeconds: number;
  maxEndgamesInRun: number;
  simulationSpeedUnlocked?: number;
}

export interface VictoryRecord {
  convergence: number;
  seed: number;
  years: number;
  era: number;
  depth: number;
  development: number;
  dominantPath: string;
  endgameStates: string[];
}

export interface GameState {
  saveVersion: number;
  phase: Phase;
  simulationSpeed: number;
  machine: {
    currencies: Record<ResourceKey, number>;
    upgradeLevels: Record<string, number>;
    activeMutations: string[];
    civilizationsTotal: number;
    civilizationsThisUniverse: number;
    cultivationCreditsThisUniverse: number;
    lastHarvest: Record<string, unknown>;
    // The report shown after a run ends. Null when there is nothing to report yet or the player
    // dismissed it. Presentation-only, like `lastHarvest`, which stays the machine-readable record.
    lastRunReport: RunReport | null;
    runBuild: {
      selectedDirective: string;
      selectedBreedingMatrix: string;
      directiveLocked: boolean;
      matrixLocked: boolean;
      directiveOfferIds: string[];
      nextCivilizationSeed: number;
      previewTraitIds: string[];
    };
  };
  meta: {
    universalResidue: number;
    universeUpgradeLevels: Record<string, number>;
    universesTotal: number;
    universesThisMultiverse: number;
    axioms: number;
    axiomLevels: Record<string, number>;
    multiversesConsumed: number;
    convergences: number;
    victories: VictoryRecord[];
    progression: ProgressionState;
  };
  civilization: Civilization | null;
  tutorial: TutorialState;
  help: HelpState;
}

export interface RuntimeBonuses {
  stabilityMax: number;
  predictionLevel: number;
  developmentMult: number;
  causal_massMult: number;
  cognitionMult: number;
  paradoxMult: number;
  existenceMult: number;
  awarenessGainMult: number;
  sanityLossMult: number;
  attentionGainMult: number;
  stabilityLossMult: number;
  stabilityDecayMult: number;
  eventDelay: number;
  startingEra: number;
  extraTraits: number;
  allHarvestMult: number;
  chaoticRetention: number;
  containmentRating: number;
  controlRecharge: number;
  accelerateYears: number;
  accelerateDevelopment: number;
  accelerateTimer: number;
  gradeRewardMult: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// --- Onboarding, guidance and run reporting -------------------------------------------------
// Everything below is presentation state: it exists so the player can see what happened, where it
// happened and why. No progression, pressure, harvest or scheduler rule may read any of it.

export type TutorialStatus = 'pending' | 'active' | 'completed' | 'skipped';

// Monotonic facts the tutorial waits on. They are recorded when the player actually performs the
// action, so a step cannot strand the tutorial when the run that produced it is already over.
// Deliberately no fact for the decision feedback panel. `publishCompletedDecision` fires for a
// tactical action as well as for an intervention, so a step gated on it would be cleared by the wrong
// move -- and any step placed after the intervention step would already be satisfied when the cursor
// arrived, so it would never be shown at all. Reading that panel is an acknowledged step.
export type TutorialFact =
  | 'run_started' | 'intervention_resolved' | 'tactical_used' | 'harvest_completed';

export interface TutorialState {
  version: 1;
  status: TutorialStatus;
  stepId: string;
  acknowledged: string[];
  observed: TutorialFact[];
  collapsed: boolean;
}

export interface HelpState {
  version: 1;
  // Explain mode adds a "what / where / why" note to every panel that has one. It is a state band,
  // never a live value, so it may enter the structural render keys.
  explain: boolean;
}

export interface RunTraceSample {
  second: number;
  years: number;
  era: number;
  development: number;
  depth: number;
  entropy: number;
  stability: number;
  sanity: number;
  awareness: number;
  attention: number;
  choices: number;
  dramaPhase: DramaPhaseId;
}

export interface RunTraceState {
  version: 1;
  intervalSeconds: number;
  nextSampleAt: number;
  samples: RunTraceSample[];
}

export type RunEndReason =
  | 'controlled_harvest' | 'forced_chaotic_harvest' | 'stability_collapse'
  | 'abandoned' | 'convergence_won' | 'convergence_failed';

export interface RunReportResource {
  key: ResourceKey;
  label: string;
  amount: number;
  share: number;
}

export interface RunReportArcEntry {
  second: number;
  label: string;
  detail: string;
}

export interface RunReport {
  version: 1;
  seed: number;
  reason: RunEndReason;
  reasonTitle: string;
  reasonDetail: string;
  chaotic: boolean;
  terminal: boolean;
  elapsedSeconds: number;
  years: number;
  era: number;
  eraName: string;
  development: number;
  depth: number;
  grade: HarvestGrade;
  gradeLabel: string;
  credits: number;
  rewardMultiplier: number;
  objectiveTitle: string;
  objectiveCompleted: boolean;
  interventions: number;
  traits: string[];
  institutions: string[];
  dominantPath: string;
  endgameStates: string[];
  dramaPhase: string;
  entropy: number;
  stats: Stats;
  peakDevelopment: number;
  peakDepth: number;
  peakEntropy: number;
  resources: RunReportResource[];
  resourceTotal: number;
  arc: RunReportArcEntry[];
  timeline: string[];
  lessons: string[];
  trace: RunTraceSample[];
}
