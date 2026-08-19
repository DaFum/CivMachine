# Civilization Pacing and Tactical Actions Design

**Status:** Approved for implementation on 2026-08-19  
**Release target:** Reality Consumption Engine Browser v1.3.0  
**Product language:** English  
**Save policy:** New v2 save; no migration from v1 saves

## Problem

The Civilization phase currently alternates between long passive waits and binary intervention choices. A safety-oriented no-upgrade simulation survives for a median of roughly 75 minutes, while six immediate harvests can unlock a Universe without meaningful Civilization play. Defensive upgrades mostly extend passive time, several cost curves outgrow their linear benefit, and a Universe repeats the same Directive across all of its Civilizations.

## Goals

- Make the Civilization phase continuously interactive without requiring reflex play.
- Target 2.5–4 minutes of survival without relevant upgrades at 1× speed.
- Target 5–8 minutes for an appropriately upgraded build at 1× speed.
- Make survival upgrades materially necessary without hard-locking eras.
- Prevent premature harvests from advancing Universe prestige.
- Give each Civilization its own deterministic run build while retaining a Universe-level identity.
- Preserve deterministic simulation, explicit state feedback, mobile usability, reduced-motion support, and dirty rendering.

## Non-goals

- No save migration. Existing v1 saves intentionally start a fresh v2 game.
- No offline progression.
- No reflex minigame, real-time failure timer while an intervention choice is open, or canvas-owned simulation state.
- No replacement of the deterministic dual-Canvas world renderer.

## Target pacing

At 1× simulation speed:

| Stage | Target elapsed time | Intervention cadence |
| --- | ---: | ---: |
| First intervention | 4 seconds | one-time |
| Emergence | 0–90 seconds | 10–14 seconds |
| Expansion | 90–230 seconds | 8–11 seconds |
| Transcendence | 230+ seconds | 7–10 seconds |

The displayed history clock advances at 25 years per simulation second, keeping the existing 2,500- and 6,500-year era thresholds meaningful. Intervention decisions continue to pause simulation.

## Shared Control Capacity

Every Civilization starts with 3 Control Capacity and has a maximum of 3. Resolving an intervention restores 1 point; entering a new era restores 1 point. Capacity never regenerates merely from waiting.

### Stabilize

- Cost: 2 Control Capacity
- Immediate effect: +14 Stability
- Trade-off: +6 Attention and +8 Entropy
- Availability: monitoring or intervention state, provided Stability is below its maximum
- Path tendency after repeated use: Cosmic Resistance and Bureaucratic Singularity

### Accelerate

- Cost: 1 Control Capacity
- Immediate effect: advance history by 200 years, add development equivalent to approximately eight simulation seconds, and reduce the intervention timer by 8 seconds
- Trade-off: −4 Stability and +7 Entropy
- Availability: monitoring state only
- Path tendency after repeated use: Temporal Dominion and Reality Engineering

### Probe

- Cost: 1 Control Capacity
- Immediate effect: reveal the affected metric directions for every choice in the current intervention
- Trade-off: +3 Awareness and +2 Entropy
- Availability: intervention state only, once per intervention
- Prediction Core synergy: converts directions into the existing written predictions at level 1 and increasingly precise numeric ranges at later levels
- Path tendency after repeated use: Recursive Simulation and Machine Faith

Every tactical action produces exact before/after deltas through the same feedback surface as intervention choices.

## Entropy Pressure and Containment

Entropy is a permanent per-run pressure meter clamped from 0 to 100. It begins at 0 and rises with simulation time, era, tactical actions, and selected intervention outcomes.

Base gain per simulation second:

- Emergence: 0.32
- Expansion: 0.48
- Transcendence: 0.72

Required Containment Rating is 0 in Emergence, 2 in Expansion, and 4 in Transcendence. The effective rate is:

`baseRate × (1 + 0.35 × containmentDeficit) ÷ (1 + 0.35 × containmentRating)`

where `containmentDeficit = max(0, requiredRating − containmentRating)`.

At 25, 50, and 75 Entropy, the engine schedules one unique deterministic crisis intervention. Each threshold fires at most once per Civilization. At 100 Entropy, an Entropy Cascade begins and applies rapidly escalating Stability loss; Entropy never becomes an instant-death button.

Passive Stability decay continues to react to era, Awareness, Attention, path, and upgrades, but Entropy becomes its primary escalation multiplier. This keeps cautious choices useful while ensuring that caution alone cannot sustain a no-upgrade run indefinitely.

## Upgrade redesign

Protective machine upgrades contribute to a visible Containment Rating:

- Reality Lattice: primary Containment and starting Stability
- Awareness Scrubber: Awareness mitigation and reduced Probe exposure
- Sanity Compliance Protocol: Sanity protection during crises
- Cosmic Muffling: Attention mitigation for Stabilize and risky choices

Other tactical synergies:

- Prediction Core improves Probe information.
- Temporal Injector retains 2×/4× speed unlocks and improves Accelerate at higher levels.
- Yield upgrades gain a qualitative level-3 or maximum-level perk rather than relying only on linear percentages.

Machine upgrade growth factors move into an approximate 1.45–1.65 range. Persistent Universe and Axiom layers retain steeper curves. A normal first run must afford at least one relevant machine upgrade, and almost every qualified later run should present a meaningful purchase.

## Harvest Grade and Cultivation Credits

Universe progress uses 18 Cultivation Credits instead of six arbitrary harvested Civilizations.

| Grade | Requirement | Reward multiplier | Credits |
| --- | --- | ---: | ---: |
| Premature | Era 0 or fewer than 3 resolved interventions | 0.20 | 0 |
| Established | Expansion reached | 0.75 | 2 |
| Transcendent | Transcendence reached | 1.00 | 3 |
| Ascendant | Dominant path end-state reached | 1.20 | 4 |

A completed Directive objective adds a 15% resource bonus and 1 Cultivation Credit. Chaotic harvest keeps its retention rules and mutation reward, but grade and objective are still evaluated. Premature collapse receives a small deterministic salvage floor so that a fresh player cannot become stuck.

## Roguelite run structure

- Breeding Matrix remains locked for the current Universe.
- Directive is selected anew for every Civilization from up to three deterministic offers.
- The next Civilization's starting traits are previewed before launch.
- A chaotic-harvest Mutation remains a one-run modifier.
- Directive offers and trait selection derive from stored seeds so reloads cannot reroll them.

Each Directive gains a measurable optional objective matching its identity, such as reaching an era quickly, controlling Attention, maintaining low Entropy, or producing a target resource. The objective and progress remain visible during the run.

Repeated tactical action use contributes small path affinities in batches rather than on every tap. Intervention choices remain the primary source of path identity.

## Interface and visual feedback

The tactical action rail sits directly beneath the world surface and ahead of secondary dossiers. It contains:

- three large action buttons with cost and immediate risk,
- a three-segment Control Capacity meter,
- an Entropy meter with cyan, yellow, orange, and red states,
- keyboard shortcuts 1, 2, and 3,
- touch targets suitable for phone layouts,
- disabled-state reasons exposed in text and accessibility labels.

World impulses:

- Stabilize: containment wave and briefly calmer palette
- Accelerate: time streaks and faster settlement motion
- Probe: scan lines and highlighted risk metrics
- Entropy thresholds: short fracture pulse matching the threshold color

Reduced-motion mode replaces movement-heavy impulses with static color and outline signals. Structural world layers remain cached; only changed HUD values, dynamic effects, and action feedback update.

## Architecture

Simulation remains independent of rendering. New focused modules own the new rules:

- `game/pressure.ts`: Entropy, Containment Rating, crisis thresholds, collapse pressure
- `game/tactical-actions.ts`: action availability, costs, effects, and path tendency batches
- `game/harvest-quality.ts`: grade, multipliers, credits, salvage, objective bonus
- `game/run-directives.ts`: deterministic offers, trait preview inputs, and objective evaluation
- `data/entropy-crises.ts`: three crisis interventions with unique English copy

`GameEngine` orchestrates those modules and emits serializable state. The DOM UI renders action controls and exact feedback. The Canvas renderer receives Entropy and action impulse state but never owns gameplay values.

## Save policy

The release uses save version 2 and a v2 storage key. Loading a v1 save is intentionally unsupported; the app starts a fresh v2 state. No migration, conversion, or legacy-field normalization is implemented.

## Failure handling

- Invalid or unavailable actions return a stable failure reason and do not mutate state.
- Control Capacity and Entropy are clamped after every operation.
- Each Entropy crisis threshold is recorded before queueing to prevent duplicates.
- Probe cannot charge twice for the same event.
- Premature harvest cannot grant Cultivation Credits.
- Long background gaps remain bounded by the existing tick delta cap.
- State is saved after tactical actions, interventions, harvests, upgrades, and phase transitions, never every animation frame.

## Acceptance criteria

- Safety-oriented no-upgrade seed sweep: median survival 150–240 seconds; 95th percentile below 300 seconds.
- Appropriate early Containment build: median survival 300–480 seconds.
- Immediate harvest grants zero Cultivation Credits.
- A normal first run affords at least one relevant machine upgrade.
- Control Capacity remains within 0–3 and crises never duplicate.
- Identical seeds produce identical Directive offers, starting traits, interventions, and crisis order.
- Tactical actions work by mouse, touch, and keyboard.
- Exact action deltas and disabled reasons are accessible.
- Desktop, portrait, landscape, and reduced-motion layouts keep the world and action rail readable.
- Existing dirty-rendering, capped device-pixel ratio, batched UI notification, and save-write performance guarantees remain passing.
