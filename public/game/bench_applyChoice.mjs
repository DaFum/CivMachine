import { performance } from 'perf_hooks';
import { CivilizationPaths } from './dist/game/paths.js';

// Setup mock civ
const civ = {
  era: 3,
  eventChoices: 10,
  flags: [],
  pathState: {
    affinity: {
      machine_faith: 0,
      collective_mind: 0,
      temporal_dominion: 5,
      reality_engineering: 0,
      biological_transcendence: 0,
      cosmic_resistance: 0,
      bureaucratic_singularity: 0,
      post_mortal_civilization: 0,
      void_communion: 0,
      recursive_simulation: 0
    },
    dominantPath: 'temporal_dominion',
    completedEvents: [],
    choiceFlags: [],
    recentPaths: [],
    recentDeltas: {},
    endgameState: '',
    endgameStates: [],
    successions: 0,
    successionAtChoice: 0
  }
};

const choice = {
  path_affinity: {
    machine_faith: 1,
    temporal_dominion: 2,
    invalid_path: 5,
    another_invalid: 3
  },
  path_flag_add: 'test_flag',
  path_history: 'Some history'
};

const event = {
  id: 'test_event',
  path_phase: 'endgame',
  path_id: 'temporal_dominion'
};

const ITERATIONS = 1000000;

function runBenchmark() {
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    // Reset mutated properties to keep object sizes from growing endlessly
    civ.pathState.recentDeltas = {};
    civ.pathState.choiceFlags = [];
    civ.pathState._choiceFlagsVersion = 0;
    if (civ.pathState._choiceFlagsSet) civ.pathState._choiceFlagsSet.clear();
    civ.pathState.completedEvents = [];
    civ.pathState._completedEventsVersion = 0;
    if (civ.pathState._completedEventsSet) civ.pathState._completedEventsSet.clear();

    CivilizationPaths.applyChoice(civ, event, choice);
  }
  const end = performance.now();
  return end - start;
}

// Warmup
for (let i = 0; i < 10000; i++) {
  CivilizationPaths.applyChoice(civ, event, choice);
}

const time = runBenchmark();
console.log(`Time for ${ITERATIONS} iterations: ${time.toFixed(2)} ms`);
