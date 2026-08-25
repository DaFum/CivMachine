# data/ — Agent Instructions

`localization.ts` holds every player-facing string in every locale, keyed by the ids the files here
declare — so adding content here means adding its copy there, and `tests/localization.test.mjs` fails
the build when the two disagree. `i18n.ts` is the reader; the root `AGENTS.md` has its three rules.

`content.generated.ts` is a frozen machine-generated catalog and its generator is gone. Never
hand-edit it. Layer changes through the sibling files here and `game/upgrade-balance.ts`, which the
engine composes over it.

**A run must never repeat an intervention.** `interventionExhausted` allows one draw per intervention
per run and ignores the catalog's `max_count`; that only holds while the catalog stays large enough,
so adding content here is how the guarantee is maintained.

New content must use the frozen catalog's numeric scale — the survival-curve and first-run-economy
tests pin exact medians and will fail on an off-scale reward. A layered file must also declare
`max_era: 3` itself to survive into APOTHEOSIS; `applyEraCeiling` only raises the generated catalog.
