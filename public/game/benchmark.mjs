import { performance } from 'perf_hooks';

// Setup mock data
const N = 1000; // Total directives
const M = 100; // Offered directives

const directives = Array.from({ length: N }, (_, i) => ({ id: `directive_${i}` }));
const directiveOfferIds = Array.from({ length: M }, (_, i) => `directive_${Math.floor(Math.random() * N)}`);

const state = {
  machine: {
    runBuild: {
      directiveOfferIds
    }
  }
};

// Original implementation
function availableDirectivesOriginal() {
  return directives.filter((d) =>
    state.machine.runBuild.directiveOfferIds.includes(d.id)
  );
}

// Optimized implementation
function availableDirectivesOptimized() {
  const offerIds = new Set(state.machine.runBuild.directiveOfferIds);
  return directives.filter((d) => offerIds.has(d.id));
}

// Benchmark
const iterations = 10000;

const startOriginal = performance.now();
for (let i = 0; i < iterations; i++) {
  availableDirectivesOriginal();
}
const endOriginal = performance.now();
const originalTime = endOriginal - startOriginal;

const startOptimized = performance.now();
for (let i = 0; i < iterations; i++) {
  availableDirectivesOptimized();
}
const endOptimized = performance.now();
const optimizedTime = endOptimized - startOptimized;

console.log(`Original Time: ${originalTime.toFixed(2)} ms`);
console.log(`Optimized Time: ${optimizedTime.toFixed(2)} ms`);
console.log(`Improvement: ${((originalTime - optimizedTime) / originalTime * 100).toFixed(2)}% faster`);
