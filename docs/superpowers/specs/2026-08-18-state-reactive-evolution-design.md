# State-Reactive Evolution Design

## Status

Approved for direct implementation on 2026-08-18. The existing v1.1.0 Sites app remains the gameplay and compatibility baseline.

## Goal

Improve the civilization loop without turning it into a harsher game. Event selection should feel deliberate, varied, path-aware, and well paced. Every intervention choice must use unique English copy. The world should occupy more screen space, visibly express the civilization's state, and provide immediate, exact feedback after a decision while remaining efficient on mobile hardware.

## Non-goals

- Do not remove or replace any of the 75 interventions, 10 paths, upgrades, directives, matrices, prestige systems, or harvest modes.
- Do not add server persistence, accounts, offline progression, a new renderer dependency, or orientation locking.
- Do not change the established resource economy or make unstable civilizations fail with a separate Game Over state.
- Do not translate the game. Intervention copy remains English.

## Intervention scheduling

Event eligibility remains authoritative in `GameEngine.eventEligible`. A new pure scheduler receives only eligible events and calculates a pool using:

1. authored base weight;
2. the existing civilization-path multiplier;
3. an era/phase multiplier that favors impulse and reinforcement events early, conflict and consolidation events during Expansion, and consolidation/endgame events during Transcendence;
4. existing state urgency signals for low Stability/Sanity and high Awareness/Attention;
5. a freshness multiplier based on prior event count;
6. a hard exclusion for the six most recently presented event IDs.

If hard exclusion empties the pool, the scheduler rebuilds it without the recent-ID filter. Scheduled follow-ups remain first priority, but they are recorded in the recent list. Weighted selection uses the civilization RNG state and is therefore reproducible for the same save state and seed.

The recent event list is stored on each civilization as an optional save field. Old v1.1.0 saves normalize a missing field to an empty list rather than being rejected.

## Temporal staging

The event delay window changes by era and run maturity:

| Era | Base window | Intent |
| --- | --- | --- |
| Emergence | 22–30 seconds | Let a new civilization become legible before frequent intervention. |
| Expansion | 17–24 seconds | Sustain the central decision rhythm. |
| Transcendence | 13–19 seconds | Increase momentum as systems and risks converge. |

After eight resolved events, both ends shorten by up to two seconds. A civilization below 30 Stability or Sanity receives two additional recovery seconds. Existing event-delay bonuses are added afterward, and the final value never drops below eight seconds.

## Unique intervention copy

The 25 authored base interventions already provide 57 unique action labels and 57 unique predictions because seven of them expose a third option. The 50 path interventions currently reuse two labels and two predictions. A dedicated copy catalog supplies two event-specific choices for every path intervention, creating 157 unique labels and 157 unique predictions across the complete catalog.

Each replacement must:

- reference the concrete event premise rather than a generic path action;
- preserve the meaning of the existing effects and affinity direction;
- use a concise action label and a single consequence sentence;
- remain consistent with the game's dry cosmic-bureaucratic voice;
- be unique after trimming and case folding.

The generated baseline content remains intact. A typed copy overlay is applied once when the engine initializes, which makes the authored browser enhancement explicit and avoids hand-editing generated Godot-port data.

## Exact decision feedback

Immediately before applying a choice, the engine captures a compact snapshot. After normal effects, path effects, dominance effects, clamping, and end-state resolution, it compares the final state with that snapshot.

Feedback includes non-zero changes to Stability, maximum Stability, Awareness, Sanity, Attention, Development, and path affinities, plus newly added traits, institutions, and flags. Values are rounded only for presentation; the simulation retains full precision. The result is runtime UI state and is not persisted.

The feedback card stays visible during the following monitoring window and is cleared when the next intervention appears. A 1.8-second world impulse uses a positive, negative, or mixed tone derived from the actual deltas. Prediction Core still controls information shown before the choice; exact results are always available after the choice.

## Larger state-reactive world

The world surface grows from the existing 340–520 pixel band to an adaptive 520–760 pixel desktop band. Portrait mobile uses approximately 58–64 dynamic viewport height with a bounded minimum and maximum. Landscape mobile uses available height while keeping the header and fullscreen control unobstructed. Management panels remain below the world and scroll normally.

The Phaser renderer is divided into five responsibilities:

1. a seeded sky layer with parallax star fields and distant celestial haze;
2. an atmosphere layer for Attention, Awareness, and Sanity-reactive color and particles;
3. terrain and infrastructure layers keyed to era and development stage;
4. settlement detail with deterministic buildings, animated windows, traffic, aircraft, satellites, and path-specific accents;
5. a short decision-impulse layer driven by the latest feedback sequence and tone.

State colors are semantic:

- low Stability introduces fracture lines and warm danger light;
- low Sanity desaturates the ground and produces irregular atmospheric motion;
- high Awareness adds violet scanning structures and stronger machine-like alignment;
- high Attention adds crimson/coral celestial activity;
- the dominant path supplies an accent hue and selected architectural motifs.

The Canvas fallback uses the same presentation model and a simplified version of the same state cues.

## Performance model

Pure presentation helpers calculate a structural render key from seed, viewport bucket, era, development stage, building-count bucket, dominant path, institution count, and coarse state bands. Sky, terrain, and settlement geometry redraw only when that key changes. Dynamic atmosphere, traffic, window glow, and decision impulses update at a capped 30 frames per second.

The existing device-pixel-ratio cap of 2 remains. Reduced-motion mode freezes nonessential parallax and particles while retaining state colors and decision feedback. DOM regions are replaced only when their serialized content changes; live counters and meters continue to update in place.

## Compatibility and resilience

- Save version remains compatible; missing `recentEventIds` is normalized.
- Empty weighted pools fall back to the existing compliance event.
- Missing copy entries retain their generated label and prediction, while tests prevent an incomplete release.
- Phaser failure still activates Canvas fallback.
- Feedback with no measurable delta renders an explicit `No measurable state change` result rather than a blank card.
- All new local modules are included in the service-worker precache before the cache version is bumped to v1.2.0.

## Verification

Automated tests cover deterministic selection, six-event exclusion, path relevance, cadence ranges, old-save normalization, 157 unique labels, 157 unique predictions, decision delta accuracy, feedback exposure, state-reactive palette/key changes, enlarged responsive world rules, precache completeness, and the existing full regression suite.

Browser playtesting covers civilization start, multiple interventions, visible exact deltas, event variety, world pulse, panning, larger desktop and mobile world surfaces, portrait and landscape layout, harvest, reload persistence, and app-origin console errors. Screenshots are reviewed for playfield depth, HUD obstruction, readable choices, and state-color clarity.
