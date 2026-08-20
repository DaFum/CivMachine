# game/ — Agent Instructions

`engine.ts` is the single source of truth: it holds all mutable `state` and delegates every rule to a
small pure module beside it. Put new rules in such a module rather than in the engine — the pure
modules are what the tests target.

`Civilization.visualMemory` is presentation-only. No progression, pressure, harvest or scheduler rule
may read it; `engine.publishCompletedDecision` is its only writer, and the `tick()` Entropy-threshold
impulse deliberately bypasses it because a queued warning is not a completed decision. It stays
optional so v4 saves load without a `SAVE_VERSION` bump.

`save-migration.ts` is the only reader of a stored payload: `engine.load()` hands it the raw string
and gets a loadable `GameState` plus a report back. It must keep treating the payload as untrusted —
it is the one input to the engine that no code of ours wrote — and it must never invent content the
player did not earn (a mistyped array item is dropped, not replaced by a default). Root `AGENTS.md`
has the rule for changing `GameState`'s shape.

Nothing here may import from `render/` or `ui/`.
