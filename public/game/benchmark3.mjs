import { performance } from 'perf_hooks';

// Setup mock data
const N = 100; // Total directives
const M = 10; // Offered directives

const directives = Array.from({ length: N }, (_, i) => ({ id: `directive_${i}` }));
const directiveOfferIds = Array.from({ length: M }, (_, i) => `directive_${Math.floor(Math.random() * N)}`);

const state = {
  machine: {
    runBuild: {
      directiveOfferIds
    }
  }
};

const directiveMap = new Map(directives.map(d => [d.id, d]));

// Original implementation
function availableDirectivesOriginal() {
  return directives.filter((d) =>
    state.machine.runBuild.directiveOfferIds.includes(d.id)
  );
}

// Optimized implementation (Set)
function availableDirectivesSet() {
  const offerIds = new Set(state.machine.runBuild.directiveOfferIds);
  return directives.filter((d) => offerIds.has(d.id));
}

// Optimized implementation (Map)
function availableDirectivesMap() {
  return state.machine.runBuild.directiveOfferIds.map(id => directiveMap.get(id)).filter(Boolean);
}

// Benchmark
const iterations = 100000;

console.log("Warming up...");
for (let i = 0; i < 10000; i++) {
  availableDirectivesOriginal();
  availableDirectivesSet();
  availableDirectivesMap();
}

console.log("Benchmarking...");
const startOriginal = performance.now();
for (let i = 0; i < iterations; i++) {
  availableDirectivesOriginal();
}
const endOriginal = performance.now();
const originalTime = endOriginal - startOriginal;

const startSet = performance.now();
for (let i = 0; i < iterations; i++) {
  availableDirectivesSet();
}
const endSet = performance.now();
const setTime = endSet - startSet;

const startMap = performance.now();
for (let i = 0; i < iterations; i++) {
  availableDirectivesMap();
}
const endMap = performance.now();
const mapTime = endMap - startMap;


console.log(`Original Time: ${originalTime.toFixed(2)} ms`);
console.log(`Set Time: ${setTime.toFixed(2)} ms`);
console.log(`Map Time: ${mapTime.toFixed(2)} ms`);
console.log(`Set Improvement: ${((originalTime - setTime) / originalTime * 100).toFixed(2)}% faster`);
console.log(`Map Improvement: ${((originalTime - mapTime) / originalTime * 100).toFixed(2)}% faster`);
