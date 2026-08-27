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

const BASE_AFFINITY = { ...civ.pathState.affinity };

// Every iteration has to start from the same state, or the benchmark stops measuring one call:
// `applyChoice` accumulates affinity, appends to `completedEvents` / `choiceFlags` / `endgameStates`
// and can set `dominantPath`, so an unreset run would time a civilization with a million-point
// affinity score instead of a fresh one. Replacing the two arrays (rather than emptying them) is
// deliberate: `paths.ts` keys its lookup sets on array identity, so a new array is also the
// cold-cache setup each timed call needs.
function resetState() {
  const ps = civ.pathState;
  ps.affinity = { ...BASE_AFFINITY };
  ps.recentDeltas = {};
  ps.choiceFlags = [];
  ps.completedEvents = [];
  ps.recentPaths = [];
  ps.dominantPath = 'temporal_dominion';
  ps.endgameState = '';
  ps.endgameStates = [];
  ps.successions = 0;
  ps.successionAtChoice = 0;
  civ.flags = [];
}

function runBenchmark() {
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    resetState();
    CivilizationPaths.applyChoice(civ, event, choice);
  }
  const end = performance.now();
  return end - start;
}

// Warmup
for (let i = 0; i < 10000; i++) {
  resetState();
  CivilizationPaths.applyChoice(civ, event, choice);
}

const time = runBenchmark();
console.log(`Time for ${ITERATIONS} iterations: ${time.toFixed(2)} ms`);
