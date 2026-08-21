1. **Understand:** The code in `public/game/src/game/engine.ts` currently uses `.find()` on `this.directives` and `this.matrices` arrays within `runtimeBonuses()` and other methods. `runtimeBonuses()` is called very frequently (e.g., inside game loops or tactical action evaluations), so iterating over these arrays inside a loop results in an O(N) lookup every time it runs. This adds up, especially when there are multiple items to search through, creating an N+1 query problem.

2. **Measure:** I've run a benchmark script creating dummy items and simulating 100,000 runs. It took ~1727.7ms to complete.

3. **Implement:** I will add `this.directivesMap = new Map()` and `this.matricesMap = new Map()` in `GameEngine`.
   - I will populate them in the `GameEngine` constructor:
     `this.directivesMap = new Map(this.directives.map((d) => [d.id, d]));`
     `this.matricesMap = new Map(this.matrices.map((m) => [m.id, m]));`
   - I'll replace `this.directives.find(x => x.id === id)` with `this.directivesMap.get(id)`
   - I'll replace `this.matrices.find(x => x.id === id)` with `this.matricesMap.get(id)`

4. **Verify:** Run the benchmark script again and check the improvement. Then run the test suite `npm run test` or similar. Add format and lint checks. Follow up with Pre-commit.

5. **Submit:** Commit code and submit PR.
