# tests/ — Agent Instructions

Tests import from `../dist/**`, never from `../src/**`, so a source edit is invisible here until
`tsc -p public/game/tsconfig.json` runs. `npm test` compiles first; `node --test` alone does not.

`balance-harness.mjs` holds the shared engine fixtures (`freshEngine`, `runCivilization`) — reuse
them rather than constructing engines by hand. The survival-curve and first-run-economy medians in
`core.test.mjs` are derived from the design docs, so treat a failure there as a balance regression
rather than a number to update.

`campaign-harness.mjs` is the layer above it: `runCampaign` plays a whole save forward — many
Civilizations, Machine purchases, Universes, Multiverses and Axioms — under a named strategy, and
`campaign.test.mjs` asserts the resulting curve. Every band there is a *range* the design asks for, so
a failure means a balance constant moved, not that the range is too tight. `npm run balance` prints
the same measurements without asserting them, which is the right first move when one of them fails.
