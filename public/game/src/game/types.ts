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

export interface DecisionAddition {
  kind: 'trait' | 'institution' | 'flag' | 'path_flag';
  label: string;
}

export interface DecisionFeedback {
  sequence: number;
  eventId: string;
  eventTitle: string;
  choiceLabel: string;
  tone: 'positive' | 'negative' | 'mixed';
  metrics: DecisionMetricDelta[];
  affinities: DecisionAffinityDelta[];
  additions: DecisionAddition[];
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
  accelerateTimer: number;
  gradeRewardMult: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
