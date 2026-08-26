import { performance } from 'perf_hooks';
import { CivilizationPaths } from './dist/game/paths.js';

// Setup mock civ
const civ = {
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
    dominantPath: '',
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
  effects: {
    population: 100,
    resources: 50,
    science: 10,
    culture: 5
  },
  secondary_effects: {
    temporal_dominion: {
      science: 5,
      culture: 2
    }
  }
};

const ITERATIONS = 100000;

function runBenchmark() {
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    CivilizationPaths.mergedChoiceEffects(civ, choice);
  }
  const end = performance.now();
  return end - start;
}

// Warmup
for (let i = 0; i < 10000; i++) {
  CivilizationPaths.mergedChoiceEffects(civ, choice);
}

const time = runBenchmark();
console.log(`Time for ${ITERATIONS} iterations: ${time.toFixed(2)} ms`);
