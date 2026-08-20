# game/ — Agent Instructions

`engine.ts` is the single source of truth: it holds all mutable `state` and delegates every rule to a
small pure module beside it. Put new rules in such a module rather than in the engine — the pure
modules are what the tests target.

`Civilization.visualMemory` is presentation-only. No progression, pressure, harvest or scheduler rule
may read it; `engine.publishCompletedDecision` is its only writer, and the `tick()` Entropy-threshold
impulse deliberately bypasses it because a queued warning is not a completed decision. It stays
optional so v4 saves load without a `SAVE_VERSION` bump.

Nothing here may import from `render/` or `ui/`.
