# CivMachine v1.10.0 — Civilization Drama Arc Technical Specification

**Status:** Approved product design; binding implementation specification  
**Specification revision:** 1
**Date:** 2026-08-20  
**Baseline:** CivMachine / Reality Consumption Engine Browser v1.9.1  
**Release target:** v1.10.0  
**Scope:** The first approximately 15 minutes of a civilization run  
**Primary surfaces:** `public/game/src/game/**`, `public/game/src/render/**`, selected presentation metadata, tests, compiled `dist/`, service-worker precache  
**Save policy:** Backward-compatible optional presentation state only; `SAVE_VERSION` remains unchanged  
**Product language:** Existing convention remains unchanged: player-facing game copy is English, shell UI is German

---

## 1. Normative language

This document is the implementation contract for v1.10.0.

- **MUST / MUST NOT** are release-blocking requirements.
- **SHOULD / SHOULD NOT** are expected unless a measured technical reason is documented in the implementation plan.
- **MAY** denotes optional implementation freedom.

Where this specification conflicts with older visualization plans, this specification supersedes them only for the systems explicitly covered here. In particular, the earlier fixed render ceilings remain hard maxima, but v1.10.0 is allowed to reduce cosmetic work dynamically when frame time deteriorates.

---

## 2. Product intent

The first 15 minutes of CivMachine MUST feel like one developing civilization rather than a sequence of unrelated intervention cards.

The core player loop is:

> **Decision → immediate visible impact → short observation window → readable world-state change → next decision**

The existing simulation remains authoritative. v1.10.0 adds a drama-and-feedback layer that makes the existing state legible and memorable.

A successful run should be remembered as a causal story — for example, a civilization becoming machine-religious, militarized, surveilled, fractured, or stabilized — rather than only as a sequence of numerical values.

The release MUST combine three qualities:

1. **Strategic meaning:** earlier choices remain visible and later consequences feel connected to them.
2. **Living-world feedback:** the world visibly reacts to Stability, Sanity, Awareness, Attention, Entropy, Development, Paths, Institutions, Traits, interventions, and tactical actions.
3. **Roguelite progression readability:** surviving longer reveals later chapters of the same civilization arc; early weak runs end during early chapters, upgraded builds reach later chapters.

---

## 3. Baseline invariants that v1.10.0 MUST preserve

The following v1.9.1 behavior is out of bounds for this release unless explicitly stated otherwise.

### 3.1 Layout and interaction

v1.10.0 MUST NOT change:

- the current screen allocation between world, intervention, tactical rail, pressure/harvest rail, and supporting information;
- the existing choice prediction/consequence preview;
- the existing post-decision numerical feedback presentation;
- keyboard bindings for Stabilize, Accelerate, Probe, and Vent;
- the existing civilization-view ordering;
- the current panning/dragging model of the world surface.

The world becomes more expressive **inside its existing viewport**. It does not become a larger or differently positioned UI surface.

### 3.2 Balance and progression

v1.10.0 MUST NOT intentionally change:

- `entropyRate` or the containment curve;
- cascade timing or cascade decay;
- Cultivation Depth math;
- harvest grade thresholds;
- harvest reward math;
- tactical-action costs, cooldown/availability rules, or resource effects;
- upgrade prices or effects;
- first-run economy;
- the Great Convergence rules;
- the one-serving-per-intervention-per-run guarantee;
- event-delay windows.

The existing survival/economy regression tests are release gates. In particular, the currently pinned representative medians remain authoritative: approximately **182 s / 360 s / 972 s** for bare / four-module / full builds under the repository's existing harness, and the first-run economy remains at the currently asserted median of **two purchasable Machine levels**.

### 3.3 Interventions and cadence

v1.10.0 MUST NOT reduce the intervention catalog, hand-edit `data/content.generated.ts`, or introduce a new reflex/twitch cadence.

The current era delay windows remain unchanged:

| Era | Event delay window |
| --- | ---: |
| 0 | 10–14 s |
| 1 | 8–11 s |
| 2 | 7–10 s |
| 3 | 6–9 s |

The tension increase must come from consequence weight and world state, not from compressing the player into continuous clicking.

### 3.4 Architecture

The repository's one-directional layering remains mandatory:

`data/ → game/ → ui/ + render/`, wired by `main.ts`.

`GameEngine` remains the authoritative mutable state holder. Render code MUST NOT change gameplay values.

The Canvas 2D renderer remains the only renderer. No Phaser branch, WebGL replacement, sprite engine, remote art dependency, or second rendering stack is introduced.

### 3.5 Performance invariants

The existing render invariants remain release blockers:

1. No per-frame `localStorage` writes.
2. No per-frame rebuilding of interactive controls.
3. `civilizationRenderKey` and `structuralWorldKey` MUST ignore continuously ticking raw values.
4. Structural geometry MUST NOT be rebuilt every dynamic frame.
5. `public/game/dist/` remains committed output and MUST be regenerated for source changes.
6. Device-pixel density remains capped at the existing maximum of 2.
7. Dynamic rendering remains throttled around the existing 30 fps target (`DYNAMIC_FRAME_MS = 33`).

---

## 4. Explicit non-goals

The following are not part of v1.10.0:

- endless/deep-cultivation design beyond the normal ~15-minute target window;
- a second hidden civilization simulation;
- new strategic resources or bars such as Militarization, Pollution, Wealth, Urbanization, or Faith;
- changing the current HUD layout;
- rewriting all 185 interventions;
- giving every intervention a bespoke drawing routine;
- introducing external textures, image assets, sprite sheets, shaders, or audio dependencies;
- changing save version or wiping player progress;
- offline progression;
- changing the intervention consequence preview;
- changing the core balance solely to make visual effects easier to trigger;
- making important gameplay signals disappear under automatic quality reduction.

---

## 5. Civilization Drama Arc

### 5.1 Derived phase model

The Drama Arc is **state-derived, never clock-gated**.

`game/types.ts` MUST own the shared Drama Phase types so the type layer does not import back from `game/drama.ts`:

```ts
export type DramaPhaseId = 0 | 1 | 2 | 3 | 4;
export type DramaPhaseName = 'emergence' | 'expansion' | 'division' | 'transformation' | 'crisis';

export interface DramaPhase {
  id: DramaPhaseId;
  name: DramaPhaseName;
  label: string;
}
```

A new pure game-layer module, `game/drama.ts`, MUST expose:

```ts
export function civilizationDramaScore(civ: Civilization): number;
export function civilizationDramaPhase(civ: Civilization): DramaPhase;
```

`game/drama.ts` imports the `Civilization` and `DramaPhase` types from `game/types.ts`; `game/types.ts` MUST NOT import `game/drama.ts`.

`civilizationDramaScore` MUST preserve the exact v1.9.1 stage expression currently owned by `render/world-model.ts`:

```text
score = development
      + era * 120
      + institutions.length * 30
      + eventChoices * 6
```

The thresholds MUST remain exactly:

| Score | Phase | Existing stage equivalent |
| ---: | --- | ---: |
| `< 70` | Emergence | 0 |
| `70–179` | Expansion | 1 |
| `180–339` | Division | 2 |
| `340–559` | Transformation | 3 |
| `>= 560` | Crisis | 4 |

`render/world-model.ts::developmentStage()` MUST become a compatibility wrapper around this game-layer calculation or import the shared calculation without duplicating the formula.

No game rule may depend on wall-clock minutes to determine the phase.

### 5.2 Intended run experience

The phases are dramaturgical interpretation of existing progression:

- **Emergence:** sparse world, fragile identity, first direction-setting choices.
- **Expansion:** settlement growth, infrastructure, visible population/activity, first coherent faction signals.
- **Division:** competing paths and social pressure become visually legible; damage and unrest can leave persistent marks.
- **Transformation:** dominant identity, institutions, advanced infrastructure, and large path motifs shape the whole world.
- **Crisis:** the already-developed civilization visibly carries Entropy, Awareness, instability, and machine pressure; consequences interact with a world the player has built.

A weak early run may end in Emergence or Expansion. A developed machine may reach Transformation or Crisis. The game MUST NOT display failure as “missing content”; later phases are progression earned by survival.

### 5.3 Scheduler policy

v1.10.0 does **not** retune intervention selection weights. The existing scheduler's path-affinity rules, path phases, event-chain eligibility, and era weighting already provide causal content sequencing and are balance-sensitive.

Therefore:

- `PHASE_WEIGHTS` in `game/intervention-scheduler.ts` MUST remain numerically unchanged in v1.10.0.
- event eligibility MUST remain unchanged;
- event freshness/repeat behavior MUST remain unchanged;
- the Drama Arc affects presentation and consequence emphasis, not probability distribution.

Any future scheduler retune requires its own balance specification and measurement pass.

---

## 6. Decision significance model

Every completed intervention, tactical action, machine reserve intervention, and Entropy crisis already produces `DecisionFeedback`. v1.10.0 extends this object with semantic consequence metadata so the renderer does not infer narrative meaning from raw pixels or player-facing text.

### 6.1 New types

`game/types.ts` MUST add:

```ts
export type DecisionSignificance = 'routine' | 'major' | 'turning_point';

export type ConsequenceTag =
  | 'urban_growth'
  | 'technological_growth'
  | 'urban_decline'
  | 'militarization'
  | 'civil_unrest'
  | 'religious_shift'
  | 'ecological_damage'
  | 'reality_damage'
  | 'surveillance'
  | 'mass_casualty'
  | 'stabilization'
  | 'containment'
  | 'institution_growth'
  | 'path_shift'
  | 'apotheosis_contact';

export interface DecisionTransition {
  dramaPhase?: { from: DramaPhaseId; to: DramaPhaseId };
  era?: { from: number; to: number };
  dominantPath?: { from: string; to: string };
  endgameStateAdded?: string;
  entropyBand?: { from: number; to: number };
}

export interface DecisionConsequence {
  significance: DecisionSignificance;
  tags: ConsequenceTag[];
  transitions: DecisionTransition;
  signatureProfile: string;
}
```

`DecisionFeedback` MUST gain:

```ts
consequence: DecisionConsequence;
```

This field is runtime feedback. It is not separately persisted as a queue.

### 6.2 Snapshot extensions

`captureDecisionSnapshot` MUST capture only the extra derived values required to compare before/after state:

- drama phase id;
- era;
- dominant path;
- current endgame-state set;
- Entropy band, defined exactly as `min(4, floor(clamp(entropy, 0, 100) / 25))` so 0/25/50/75/100 map to bands 0/1/2/3/4.

The existing metric, affinity, trait, institution, flag, and path-flag capture remains intact.

### 6.3 Significance rules

The default is `routine`.

A decision MUST be classified `major` if it is not already a turning point and at least one of these is true:

- `abs(development delta) >= 15`;
- `abs(stability delta) >= 8`;
- `abs(sanity delta) >= 8`;
- `abs(awareness delta) >= 10`;
- `abs(attention delta) >= 10`;
- `abs(entropy delta) >= 5`;
- sum of absolute path-affinity deltas `>= 3`;
- a trait is added;
- an institution is added;
- an explicit signature profile marks the result as major.

A decision MUST be `turning_point` if any of these is true:

- drama phase changes;
- era changes as a direct result of that decision/action;
- the dominant path is established or changes;
- a new path endgame state is added;
- the event is one of `entropy_crisis_25`, `entropy_crisis_50`, or `entropy_crisis_75`;
- its explicit signature profile is marked as a turning point.

Turning-point status takes precedence over major/routine status.

### 6.4 Generic tag inference

A pure `game/decision-consequences.ts` MUST infer generic tags from structured state changes, not from the English event title/body.

At minimum:

| Condition | Tag |
| --- | --- |
| `development delta >= 10` | `urban_growth` |
| `development delta >= 18` and current phase `>= division` | also `technological_growth` |
| `development delta <= -10` | `urban_decline` |
| `stability delta <= -8` or `sanity delta <= -8` | `civil_unrest` |
| `entropy delta >= 3` | `reality_damage` |
| `entropy delta <= -6` | `containment` |
| `awareness delta >= 8` or `attention delta >= 8` | `surveillance` |
| `stability delta >= 8` | `stabilization` |
| institution addition | `institution_growth` |
| non-zero path-affinity change with absolute total `>= 2` | `path_shift` |
| new dominant Machine Faith path or matching explicit profile | `religious_shift` |

Explicit profiles MAY add tags such as `militarization`, `ecological_damage`, or `mass_casualty` when raw metric deltas are insufficient to infer the narrative meaning safely.

Tag lists MUST be deterministic and de-duplicated.

---

## 7. Signature consequence catalog

The generic system handles the whole catalog. v1.10.0 MUST additionally ship **28 signature profiles** for the highest-signal situations, keeping the agreed “20–30 bespoke situations” budget.

These profiles define semantic tags, significance overrides when needed, transient effect variant, persistent-memory domain, and optional scar domain. They do **not** contain drawing code.

The catalog MUST live outside `content.generated.ts` as `game/consequence-profiles.ts`. Keeping the typed profile catalog in the game layer avoids a forbidden `data/ → game/` reversal where a data module would need to import game-layer semantic types.


The profile data MUST conform to a semantic shape equivalent to:

```ts
export interface ConsequenceProfile {
  id: string;
  eventId: string;
  requiresAddition?: { kind: 'institution' | 'trait' | 'flag' | 'path_flag'; label: string };
  tags: ConsequenceTag[];
  significance?: DecisionSignificance;
  impactVariant: string;
  memory?: {
    domain: MemoryDomain;
    motif: string;
    strength: 1 | 2 | 3;
    repairable: boolean;
  };
  scar?: {
    domain: ScarDomain;
    motif: string;
    strength: 1 | 2 | 3;
  };
}
```

Profiles MUST be matched by structured event id plus optional structured addition requirement. They MUST NOT match against localized/player-facing title, body, prediction, or choice text. A profile may define no persistent memory when its signature is intended to be transient only.

### 7.1 Ten dominant-path consolidation profiles

The following ten events MUST have distinct path-specific signature profiles:

| Event id | Path |
| --- | --- |
| `synod_of_the_second_engine` | Machine Faith |
| `unanimous_afternoon` | Collective Mind |
| `sovereign_hour` | Temporal Dominion |
| `department_of_permitted_physics` | Reality Engineering |
| `pollinators_of_the_state` | Biological Transcendence |
| `blackout_doctrine` | Cosmic Resistance |
| `ministry_of_final_forms` | Bureaucratic Singularity |
| `immortal_electorate` | Post-Mortal Civilization |
| `embassy_at_the_edge` | Void Communion |
| `recursion_registry` | Recursive Simulation |

Each profile MUST reinforce the corresponding path identity and MUST be at least `major`.

### 7.2 Three Entropy-crisis profiles

- `entropy_crisis_25` — first containment fracture;
- `entropy_crisis_50` — history desynchronization;
- `entropy_crisis_75` — cultivator observation.

All three MUST be `turning_point` and use the `reality` scar domain, evolving the existing reality scar rather than creating unlimited additional fractures.

### 7.3 Three institution profiles

- `moon_resigns` → Lunar Ministry;
- `ministry_of_sanity` → Ministry Of Sanity;
- `planetary_mind` → Consensus Office.

The profile is applied only to the choice that actually adds the institution. Each institution MUST receive a recognizable civic landmark or district modifier.

### 7.4 Twelve Apotheosis profiles

All current Apotheosis events MUST have signature profiles:

- `apotheosis_ledger_of_the_cultivator`
- `apotheosis_the_yield_census`
- `apotheosis_observatory_of_the_hand`
- `apotheosis_terms_of_cultivation`
- `apotheosis_the_counteroffer`
- `apotheosis_arbitration_of_scales`
- `apotheosis_currency_of_unhappened`
- `apotheosis_debt_to_the_unborn`
- `apotheosis_futures_market_in_ruins`
- `apotheosis_maintenance_window`
- `apotheosis_the_replacement_part`
- `apotheosis_recursive_audit`

These profiles MUST use the existing world rather than replacing it with a separate scene. They MAY combine `apotheosis_contact`, `reality_damage`, `surveillance`, or path-related tags as appropriate.

---

## 8. Narrative world memory

### 8.1 Purpose

Some consequences must remain visible for the rest of the run, including after a page reload. Renderer-local memory alone is therefore insufficient.

v1.10.0 introduces a **small, presentation-only, optional** memory object on `Civilization`. No gameplay rule may read it.

### 8.2 Save-compatible type

`game/types.ts` MUST add:

```ts
export type MemoryDomain =
  | 'built_environment'
  | 'identity'
  | 'control'
  | 'social'
  | 'ecology'
  | 'reality';

export type ScarDomain = 'reality' | 'civilization' | 'identity';

export interface WorldMemoryMark {
  domain: MemoryDomain;
  motif: string;
  strength: 1 | 2 | 3;
  sourceEventId: string;
  createdAtSequence: number;
  anchor01: number;
  repairable: boolean;
  repaired?: boolean;
}

export interface WorldScar {
  domain: ScarDomain;
  motif: string;
  strength: 1 | 2 | 3;
  sourceEventId: string;
  createdAtSequence: number;
  anchor01: number;
  evolution: number;
}

export interface WorldMemoryState {
  version: 1;
  sequence: number;
  marks: WorldMemoryMark[];
  scars: WorldScar[];
}
```

`Civilization` gains:

```ts
visualMemory?: WorldMemoryState;
```

The field MUST be optional so existing v4 saves load without a `SAVE_VERSION` bump. Missing or malformed memory initializes/sanitizes to `{ version: 1, sequence: 0, marks: [], scars: [] }`. The reducer increments `sequence` once for every completed decision/action it evaluates, even when that consequence creates no persistent mark; this gives all decision sources a deterministic presentation sequence without relying on `eventChoices`.

No existing progression or harvest calculation may import or inspect `visualMemory`.

### 8.3 Deterministic placement

Memory placement MUST NOT use `Math.random()`.

`anchor01` MUST be derived deterministically from:

- civilization seed;
- consequence domain;
- source event id;
- the presentation-memory `sequence` value at creation.

The anchor is a normalized world coordinate in `[0, 1]`. The renderer maps it to the nearest sensible settlement/terrain location at draw time. This keeps a mark in the same conceptual region as world width and settlement count grow.

### 8.4 Persistent mark budget

`marks` MUST have a hard maximum of **6**.

Marks coalesce by `MemoryDomain` before consuming a new slot:

- a new mark in an existing domain transforms or strengthens that domain's current visible story where possible;
- a stronger mark replaces a weaker same-domain motif;
- a weaker same-domain mark does not downgrade the stored motif/strength and remains transient-only;
- equal-strength same-domain marks prefer the newer motif but preserve the existing anchor unless the signature profile explicitly requires relocation;
- if all six domains are occupied, a new mark updates its own domain rather than creating a seventh.

This implements the approved transformation principle, e.g. an industrial district can become militarized and later ruined rather than stacking three unrelated overlays.

### 8.5 Scar budget

`scars` MUST have a hard maximum of **3**, exactly one per `ScarDomain`:

- `reality` — containment fractures, reality failures, Apotheosis-scale breaches;
- `civilization` — catastrophic social/urban/ecological damage;
- `identity` — civilization-defining monument or irreversible ideological transformation.

A new scar in an occupied domain evolves the existing scar in place:

- `strength = max(old, new)`;
- `motif` becomes the new combined/evolved motif selected by the resolver;
- `evolution += 1`;
- the existing anchor remains unless the profile explicitly marks relocation as necessary.

A scar MUST NOT silently disappear because a fourth scar occurred. The three-domain model is the clutter control.

### 8.6 Restoration

`Stabilize` MUST produce a transient containment/restoration impact every successful use.

In addition, if a repairable persistent mark exists, the presentation-memory reducer MUST perform at most one repair operation per Stabilize use:

1. prefer the strongest non-scar `reality` mark;
2. then `social`;
3. then `built_environment` damage;
4. lower strength by one, or remove a strength-1 repairable mark;
5. set/retain `repaired` where a visible repaired variant exists.

Stabilize MUST NOT erase a `WorldScar`.

Vent reduces live Entropy visuals through the actual Entropy value and receives its own transient release effect; it does not directly repair memory scars or marks unless an explicit future profile says otherwise.

### 8.7 Lifetime

- **Transient impacts:** renderer-local, seconds only, never saved.
- **Persistent marks:** saved for the current civilization and may be repaired/transformed.
- **World scars:** saved for the current civilization and persist until harvest/end of civilization.

Starting the next civilization naturally discards the previous civilization's memory with the civilization object. No meta-progression is added.

---

## 9. Visual consequence resolver

### 9.1 Separation of meaning from drawing

The game layer decides **what happened**. The render layer decides **how that meaning is drawn**.

The following dependency direction is mandatory:

```text
Decision / action
  → DecisionFeedback + DecisionConsequence
  → WorldMemoryState reducer (semantic, presentation-only state)
  → render consequence resolver
  → existing DrawSurface / Canvas world modules
```

The renderer MUST NOT inspect English event titles, prediction text, or choice copy to infer effects.

### 9.2 Required render modules

The implementation SHOULD use focused modules with responsibilities equivalent to:

| Module | Responsibility |
| --- | --- |
| `render/consequence-presentation.ts` | maps semantic tags/significance/profile ids to draw-ready effect descriptors |
| `render/world-memory.ts` | resolves/draws persistent marks and scars at deterministic anchors |
| `render/identity.ts` | path/institution identity tiers and landmark modifiers |
| existing `world-presentation.ts` | continuous live state palette/signals and structural key |
| existing `world.ts` | lifecycle, canvas composition, input, frame loop, effect timing only |

Exact filenames MAY vary if the implementation plan finds a clearer boundary, but `world.ts` MUST NOT become the catalog of 28 event-specific branches.

### 9.3 Fallback behavior

Unknown consequence tags or profile ids MUST degrade to the existing generic decision impulse. A missing special motif MUST never throw, block a choice, corrupt a save, or end a run.

---

## 10. Three visual timescales

Every consequence is rendered at one or more of three timescales.

### 10.1 A — Immediate impact

A successful decision/action SHOULD produce a visible response within the next rendered frame.

Typical duration:

- standard motion: **900–1800 ms**;
- reduced motion: **250–400 ms**, with no looping/pulsing animation required.

Examples include:

- construction wave;
- localized explosion/flash;
- scan sweep;
- containment ring;
- time streak;
- protest/movement burst;
- grid distortion;
- power blackout/recovery;
- path sigil pulse.

`DecisionSignificance` controls intensity, not gameplay duration:

- `routine`: localized, low-amplitude impact;
- `major`: larger impact plus potential persistent mark;
- `turning_point`: signature impact plus stage/path/scar evolution where relevant.

The renderer MUST NOT pause the simulation or lock input merely to show an effect.

### 10.2 B — Continuous world state

The live simulation continuously changes the visual state. These signals are derived every dynamic frame from existing authoritative numbers and MUST remain bounded.

### 10.3 C — World memory

Persistent marks and scars change only when semantic memory changes. They belong to the cached structural scene unless a small animated accent is required.

---

## 11. Live-state visual mapping

v1.9.1 already maps the relevant stats into `worldPresentation` and `liveWorldSample`. v1.10.0 extends and clarifies those mappings rather than replacing them.

### 11.1 Channel ownership

To keep the world readable, each state owns a primary visual channel:

| State | Primary visual channel | Secondary channel |
| --- | --- | --- |
| Stability | structural steadiness / damage cues | lighting steadiness |
| Sanity | agent motion regularity / distortion | local social clustering |
| Awareness | sensors, antennas, beacons | institutional observation motifs |
| Attention | sky/observer/search-light pressure | haze and machine-presence emphasis |
| Entropy | reality fractures / geometric discontinuity | warm distortion and anomalous particles |
| Development | density, settlement class, structure complexity | traffic/activity |
| Paths | faction identity, sigils, landmark language | color accent and motifs |
| Institutions | unique civic landmark/overlay | localized activity pattern |

A stat SHOULD NOT simply make the whole screen more red. Multiple states must remain distinguishable at the same time.

### 11.2 Hard live budgets

At full quality the following ceilings remain mandatory:

- particles: **150**;
- haze bands: **9**;
- visible fracture primitives: **12**;
- awareness beacons: **10**;
- total planned animated agents: **120**;
- concurrent construction animations: **6**.

`liveWorldSample` MAY be refactored to expose named signals, but these maxima MUST be testable constants.

### 11.3 Stability

Low Stability MUST increase visible structural strain without changing structure geometry used by gameplay (there is none) or causing scene rebuilds every tick.

Permitted cues include:

- small dynamic lean/jitter accents;
- temporary debris particles;
- intermittent window loss;
- damage overlays on persistent marks;
- reduced motion regularity.

Structural damage tied only to live Stability belongs in the dynamic layer. Permanent damage requires memory.

### 11.4 Sanity

Low Sanity MUST primarily alter animated agent behavior and localized distortion, not cached settlement placement.

Examples:

- uneven pedestrian phase;
- clustering or brief dispersal;
- mild circular/echo geometry;
- irregular local lights.

Reduced-motion mode must replace oscillation with static alternate states.

### 11.5 Awareness

High Awareness MUST make the civilization appear to be looking outward/upward:

- more beacons;
- sensor crowns/antennas on eligible structures;
- localized scanning arcs;
- observation landmarks when a signature profile calls for one.

Awareness effects are civilization-owned. They are distinct from Attention, which represents pressure from the cultivator side.

### 11.6 Attention

High Attention MUST make the machine/cosmic observation pressure more apparent through sky and world-overhead motifs. Existing observer-circle logic may be expanded, but it MUST remain low-primitive and cull-aware.

### 11.7 Entropy

Entropy remains the primary reality-failure channel.

The existing 0/25/50/75/100 conceptual bands remain visually meaningful. Entropy MUST affect dynamic fractures continuously, while the three entropy-crisis interventions evolve the saved `reality` scar.

### 11.8 Development

Development continues to drive:

- world width;
- settlement count;
- building count;
- settlement class;
- agent budgets;
- advanced structure availability.

No second “urbanization” stat is introduced.

---

## 12. Civilization identity

### 12.1 Paths

All ten paths MUST retain distinct visual identity. v1.9.1 already has accents, faction sigils, and path motifs; v1.10.0 upgrades these into three identity tiers without adding new authoritative state.

#### Tier 1 — Emerging

A path with meaningful affinity but no dominance MAY affect the settlements controlled by its faction through minor sigils, local decoration, or one small motif.

#### Tier 2 — Dominant

The current `dominantPath` MUST provide:

- the primary path motif;
- a recognizable capital/major-settlement landmark treatment;
- stronger faction signage;
- a structure or crown modifier appropriate to the path.

#### Tier 3 — Entrenched / transformed

A dominant path that has completed its signature consolidation profile or has a path endgame state MUST gain an evolved landmark/motif state.

The identity must be visible in silhouette or geometry, not only by accent color.

### 12.2 Required path motifs

The ten paths SHOULD express the following visual vocabulary:

| Path | Required visual vocabulary |
| --- | --- |
| Machine Faith | engine shrines, luminous spires, ritual geometry |
| Collective Mind | linked nodes, neural bridges, synchronized clusters |
| Temporal Dominion | rings, chronal pylons, repeated/time-offset forms |
| Reality Engineering | lattice towers, constrained geometric frames |
| Biological Transcendence | organic growth, branching/chitinous structures |
| Cosmic Resistance | shields, blackout structures, defensive silhouettes |
| Bureaucratic Singularity | grids, administrative monoliths, ordered blocks |
| Post-Mortal Civilization | continuity beacons, mausoleum/data-vault forms |
| Void Communion | void wells, dark obelisks, absence/negative-space motifs |
| Recursive Simulation | nested frames, repeated miniatures, recursive towers |

The implementation is procedural and uses existing `DrawSurface` primitives.

### 12.3 Institutions

The current institution set MUST receive distinct landmarks:

- **Lunar Ministry:** lunar relay/observatory language, elevated or sky-oriented structure;
- **Ministry Of Sanity:** stabilizing civic dome/orderly institutional geometry;
- **Consensus Office:** administrative/network hall with linked-node visual language.

Institution visuals are derived from `civ.institutions`; no institution-specific gameplay state is added.

### 12.4 Traits/species

The existing `speciesProfile(civ)` and caste system remain authoritative for species appearance. v1.10.0 MAY add small consequence-responsive behavior, but MUST NOT replace the trait-derived archetype system or exceed the total agent budget.

---

## 13. Persistent visual transformation rules

The world SHOULD tell a story through transformation rather than accumulation.

Examples of allowed transformations:

```text
built_environment:
  growth → industrialized → militarized → damaged/ruined

identity:
  emerging motif → dominant landmark → entrenched monument

reality:
  anomaly → fracture → systemic breach

control:
  observation → surveillance → saturated monitoring

social:
  unrest → conflict → damaged civic space
```

These are presentation transformations. They MUST NOT create or modify hidden gameplay stats.

A persistent mark's motif may be selected from the current consequence, current dominant path, institution set, and Drama Phase. The reducer MUST be deterministic for identical seed + decision sequence.

---

## 14. Canvas-layer ownership

The existing three-canvas architecture remains mandatory.

### 14.1 `staticCanvas`

Owns:

- sky base;
- terrain/parallax base;
- low-frequency broad atmosphere that does not require frame animation.

It MUST remain cheap enough to repaint on scroll.

### 14.2 `sceneryCanvas`

Owns:

- settlements;
- structures;
- static faction markers;
- static path/institution landmarks;
- persistent memory marks;
- static base geometry for World Scars.

The copy-and-strip-redraw optimization MUST remain valid. Any new scenery primitive MUST respect culling and `SCENERY_SLACK` assumptions.

### 14.3 `dynamicCanvas`

Owns:

- agents;
- traffic/air/orbital movement;
- live particles, haze, fractures, beacons;
- construction animation;
- transient decision impacts;
- small animated accents for scars/identity;
- recovery/repair animation.

Persistent objects SHOULD NOT be redrawn as complex dynamic geometry when their base can live in scenery.

### 14.4 Structural key

`structuralWorldKey` MUST include signatures for:

- Drama Phase/stage;
- existing structural factors;
- path identity tier;
- institution signature;
- persistent world-memory signature;
- scar signature.

It MUST NOT include:

- raw current Stability;
- raw current Sanity;
- raw current Awareness;
- raw current Attention;
- raw current Entropy;
- raw elapsed time;
- animation time;
- transient decision-effect progress.

Live values continue to be represented only through bands or dynamic sampling.

---

## 15. Impact presentation by tactical action

The tactical actions keep their exact rules and costs. Their visual language becomes clearer.

### 15.1 Stabilize

MUST show:

- containment/restoration impulse;
- visible reduction in live fracture intensity as the real values improve;
- one memory repair animation when the reducer repairs a mark.

### 15.2 Accelerate

MUST show:

- front-loaded time/technology streak;
- a development/construction surge if the resulting state actually adds/grows structures;
- no fake permanent “damage” unless the real decision consequence creates qualifying tags.

### 15.3 Probe

MUST show:

- focused scan/sensor sweep;
- no permanent surveillance mark solely because Probe was pressed.

Any persistent observation imagery must derive from real Awareness/Attention state or a signature consequence.

### 15.4 Vent

MUST show:

- entropy discharge/release;
- immediate easing of dynamic Entropy visuals as the authoritative number falls;
- no repair of persistent scars by default.

---

## 16. Turning-point presentation

Turning points are the memorable peaks of a run.

A turning point MUST produce stronger feedback than a routine choice, but it MUST NOT change simulation timing or block input.

Possible presentation tools:

- stronger but bounded screen/world pulse;
- landmark transformation;
- brief local blackout/re-illumination;
- large sigil or geometric transition;
- scar evolution;
- phase-transition build wave.

The renderer MAY use a short presentation-only easing or freeze of its **own animation time**, but `GameEngine.tick` and input must continue normally.

A Drama Phase change caused passively by development rather than by a decision MUST still trigger a phase-transition visual. `CanvasWorld` may detect the structural stage change between scenes and start a renderer-local phase transition timer.

---

## 17. Adaptive visual quality

v1.10.0 adds a renderer-local quality reducer because Android Compatibility-class devices are a first-class target.

This system is allowed to **reduce** cosmetic work only. It never raises existing hard maxima and never changes gameplay.

### 17.1 Quality tiers

```ts
export type RenderQualityTier = 0 | 1 | 2 | 3;
```

- **Tier 0 — full:** current fixed budgets.
- **Tier 1 — light reduction:** ambient particles about -25%; distant cosmetic agents about -20%.
- **Tier 2 — medium reduction:** ambient particles about -45%; cosmetic pedestrian/vehicle draw density about -35%; secondary looping ambient motifs simplified.
- **Tier 3 — heavy reduction:** ambient particles about -60%; cosmetic agents about -50%; non-essential looping path ambience becomes static.

The exact integer caps SHOULD be constants and MUST remain deterministic within a tier.

### 17.2 Priority rule

Quality reduction MUST NOT hide or remove:

- current intervention/decision impact;
- Entropy fracture signal;
- Awareness beacons needed for state readability;
- a World Scar;
- dominant-path landmark identity;
- construction cue for a newly appearing major structure.

Cosmetic atmosphere is shed before gameplay-readable signals.

### 17.3 Frame-time policy

The quality controller MUST be renderer-local and unsaved.

Recommended binding thresholds:

- sample dynamic draw cost using a rolling window;
- degrade by one tier when average dynamic draw cost exceeds **24 ms** for at least **30 rendered frames**;
- recover by one tier only when average dynamic draw cost remains below **14 ms** for at least **180 rendered frames**;
- apply a minimum **5 s** cooldown between tier changes.

Tests may inject synthetic frame costs rather than relying on wall-clock performance.

The controller MUST never change simulation speed.

### 17.4 Reduced motion

`prefers-reduced-motion` remains a separate accessibility concern and takes precedence over animation richness.

Reduced motion MUST:

- eliminate continuous pulsing/flicker where feasible;
- shorten decision/turning-point animations;
- preserve static state cues;
- preserve all semantic information.

---

## 18. Determinism

For identical:

- civilization seed;
- decision/presentation-memory sequence;
- choices;
- authoritative civilization state;
- viewport dimensions and quality tier;

the structural world, memory anchors, landmark selection, and signature effect variants MUST be deterministic.

`Math.random()` MUST NOT be used anywhere in consequence selection, placement, world memory, or signature variants.

Animation phase may depend on time, but the underlying object plan and variant selection must not.

Determinism is required for:

- reproducible debugging;
- render tests;
- meaningful seed comparisons;
- stable reload behavior.

---

## 19. Error and corruption handling

The visual layer MUST fail soft.

### 19.1 Unknown profile/tag

Fallback: generic decision impact using existing tone/accent.

### 19.2 Invalid saved visual memory

Sanitize rather than reject the whole game save:

- unknown version → replace visual memory only with empty v1 state;
- non-array marks/scars → empty arrays;
- invalid domain/motif/strength/anchor/sequence → drop that record;
- invalid top-level `sequence` → reset it to 0;
- clamp anchors to `[0,1]`;
- enforce six-mark and three-scar caps;
- de-duplicate scar domains deterministically.

### 19.3 Missing anchor target

If no settlement is appropriate, draw against a terrain/world coordinate derived from `anchor01`.

### 19.4 Effect budget exhausted

Drop or simplify the least-important cosmetic transient. Never reject the gameplay action.

### 19.5 Render exception policy

No visual consequence code may throw through the engine decision path. Game-state mutation and save must not depend on a renderer callback succeeding.

---

## 20. Save compatibility

`visualMemory` is the only new persistent field allowed by this specification.

Rules:

1. It is optional on `Civilization`.
2. Existing saves with no field continue normally.
3. `SAVE_VERSION` MUST NOT be bumped for this release.
4. No migration is attempted for already-running old civilizations; their memory begins empty and builds from the next qualifying consequence.
5. Loading an existing save MUST NOT alter currencies, upgrades, progression, stats, intervention pool, or reward calculations.
6. Visual memory MUST be discarded naturally when the civilization ends.

---

## 21. Service worker and release coupling

New compiled modules under `public/game/dist/` MUST be included in the hand-maintained service-worker `APP_ASSETS` list when required by the existing release tests.

Because the service worker is cache-first with no revalidation, the v1.10.0 release MUST:

- update root `package.json` version to `1.10.0`;
- update `public/game/package.json`;
- update the version in `public/game/index.html`;
- update README title/release notes according to existing release conventions;
- bump `CACHE_NAME`;
- update the explicit version assertion in `tests/game-release.test.mjs`;
- regenerate and commit `public/game/dist/`.

These are release requirements, not gameplay changes.

---

## 22. Required file-level responsibilities

The final implementation plan may refine filenames, but the following responsibilities are binding.

### Game layer

**`game/drama.ts` — new**

- canonical Drama Score and Phase derivation;
- no renderer imports;
- pure and fully tested.

**`game/decision-feedback.ts` — extend**

- capture before/after transitions;
- produce `DecisionConsequence` through a pure helper;
- preserve existing numerical feedback exactly.

**`game/decision-consequences.ts` — new**

- generic semantic tag inference;
- significance classification;
- signature profile lookup/application;
- no drawing code.

**`game/world-memory.ts` — new**

- sanitize/init optional memory;
- apply major/turning-point consequence to marks/scars;
- apply Stabilize repair rule;
- deterministic anchors using a game-layer pure hash helper owned by this module or another game-layer utility; it MUST NOT import `render/primitives.ts`;
- hard budgets;
- no gameplay-rule imports except types/semantic consequence inputs.

**`game/types.ts` — extend**

- owns `DramaPhaseId`, `DramaPhaseName`, and `DramaPhase` shared types;
- consequence/memory types;
- optional `visualMemory`;
- MUST NOT import `game/drama.ts`.

**`game/engine.ts` — minimal wiring**

- after a decision feedback object is built, apply presentation-memory update before save/emit;
- tactical Stabilize invokes at most one memory repair through the reducer;
- no balance math moved into this feature.

**`game/consequence-profiles.ts` — new**

- exactly the required 28 initial signature profiles;
- typed semantic metadata only;
- no drawing code;
- no `content.generated.ts` changes.

### Data layer

v1.10.0 MUST NOT modify `data/content.generated.ts`. No new data-layer module is required for the Drama Arc.

### Render layer

**`render/world-model.ts` — refactor/extend**

- delegate stage to `game/drama.ts`;
- preserve existing counts/thresholds;
- expose fixed budget constants if moved for testability.

**`render/world-presentation.ts` — extend**

- retain current live state mapping;
- expose any additional bounded presentation signals;
- include memory/identity signatures in structural key, never raw live values.

**`render/identity.ts` — new or equivalent**

- path identity tier;
- institution landmark descriptors;
- no authoritative state.

**`render/world-memory.ts` — new or equivalent**

- map saved memory marks/scars onto current world geometry;
- draw static base in scenery;
- expose lightweight dynamic accent descriptors if needed.

**`render/consequence-presentation.ts` — new or equivalent**

- translate tags/significance/profile ids into procedural impact descriptors;
- share primitives across all 28 profiles rather than 28 bespoke draw functions.

**`render/world.ts` — orchestrate only**

- effect timing;
- phase-transition detection;
- quality controller;
- layer composition;
- no large event-id switch statement.

---

## 23. Testing requirements

No v1.10.0 work is complete until all existing tests and the new tests below pass.

### 23.1 Drama-phase unit tests

Must assert:

- exact score formula;
- exact boundaries 69/70, 179/180, 339/340, 559/560;
- `render/developmentStage` and `game/civilizationDramaPhase` cannot drift.

### 23.2 Consequence classification tests

Must cover:

- each generic tag threshold;
- no duplicate tags;
- routine/major/turning-point precedence;
- phase change;
- era change;
- dominance establishment and succession;
- endgame-state addition;
- all three entropy-crisis ids;
- all 28 signature profile ids present and resolvable.

### 23.3 World-memory tests

Must assert:

- missing old-save memory initializes cleanly;
- malformed memory sanitizes without touching other state;
- no more than six persistent domains;
- no more than three scars and no duplicate scar domain;
- same-domain marks transform rather than append indefinitely;
- same-domain scars evolve instead of disappearing;
- deterministic `anchor01` for identical seed/event/presentation-memory sequence;
- Stabilize repairs at most one eligible non-scar mark;
- Stabilize never deletes a scar;
- memory has no effect on harvest/reward/progression functions.

### 23.4 Presentation tests

Must assert:

- Stability, Sanity, Awareness, Attention, Entropy, Development, Paths, and Institutions each control at least one distinct presentation signal;
- all ten paths reach a distinct dominant identity descriptor;
- all three institutions reach distinct landmark descriptors;
- structural key changes for memory/path-tier/institution changes;
- structural key does not change for tiny live ticks inside the same bands;
- reduced-motion variants remain semantically present.

### 23.5 Renderer smoke tests

Must assert:

- persistent marks/scars render on the scenery layer or an equivalent cached layer;
- transient impacts render on the dynamic layer;
- a phase transition produces a renderer-local effect without writing gameplay state;
- strip redraw remains equivalent to a full redraw for the exposed slice;
- new world-memory scenery respects culling;
- quality tiers only reduce cosmetic primitives;
- critical signals survive Tier 3;
- renderer teardown clears quality/effect timing state and construction tracker state.

### 23.6 Balance regression

The existing balance harness and core tests MUST pass unchanged for:

- survival curve;
- first-run economy;
- Cultivation Depth;
- harvest rewards;
- tactical action math;
- event repeat guarantee;
- Convergence rules.

If these change, v1.10.0 has violated scope and MUST NOT ship until the behavior is restored or a separately approved balance spec supersedes this one.

### 23.7 Release tests

Must assert:

- all new required compiled modules are precached;
- version coupling is consistent;
- no source maps enter the precache;
- Canvas renderer remains the only renderer;
- DPR cap remains 2.

---

## 24. Performance acceptance criteria

The renderer is procedural Canvas intended to remain usable on lower-end Android/Compatibility-class hardware.

The release MUST satisfy all of the following architectural/performance acceptance criteria:

1. Dynamic frame target remains 30 fps / 33 ms scheduling.
2. Full-quality dynamic draw work should normally fit below the 24 ms degradation threshold on the repository's reference development machine.
3. Quality controller reduces cosmetic work before readable gameplay signals.
4. Agent plan never exceeds 120.
5. Particles never exceed 150 at Tier 0 and reduce at lower tiers.
6. Concurrent construction animations never exceed 6.
7. Persistent marks never exceed 6.
8. Scars never exceed 3.
9. Scene geometry is never reconstructed once per dynamic frame.
10. Dragging still uses the scenery blit + exposed-strip redraw path.
11. At the existing stage-4 1440×760, DPR-2, 12-px-drag reference case, scenery strip redraw SHOULD remain under **320 recorded world primitives per frame**. The prior measured implementation was roughly 242; the additional budget covers memory/identity scenery without allowing a return to full-scene repaint costs.
12. No network request is required to render any new visual.

If a signature effect cannot meet these budgets, it must be simplified rather than exempted.

---

## 25. Acceptance scenarios

The following scenarios are release-level examples and MUST be representable by the implementation.

### Scenario A — early fragile run

State:

- Emergence/Expansion;
- little or no path dominance;
- low Development;
- a few interventions;
- run ends after only several minutes.

Expected:

- sparse world;
- intervention impacts visibly land;
- one or two developing identity cues may appear;
- no expectation that Transformation/Crisis content is shown;
- failure feels like a civilization that did not mature, not a truncated UI.

### Scenario B — Machine Faith development

Sequence includes growing Machine Faith affinity and `synod_of_the_second_engine`.

Expected:

- early faction/sigil hints;
- dominant Machine Faith creates clear engine-shrine/spire language;
- signature consolidation produces a major transformation;
- identity memory remains visible later in the run;
- later Entropy damage affects that same developed world rather than painting an unrelated overlay.

### Scenario C — crisis and recovery

State:

- developed civilization;
- Entropy crisis has evolved reality scar;
- low Stability and visible social/reality damage;
- player successfully uses Stabilize.

Expected:

- immediate containment effect;
- live fractures reduce as real stats improve;
- one eligible persistent mark visibly repairs/downgrades;
- the major World Scar remains as history;
- numbers and visual state tell the same story.

### Scenario D — Awareness versus Attention

State:

- high civilization Awareness;
- separately high cultivator Attention.

Expected:

- civilization-owned sensors/beacons show Awareness;
- sky/observer pressure shows Attention;
- the two are visually distinguishable and may coexist.

### Scenario E — Android pressure

State:

- Transformation/Crisis world;
- many agents and ambient effects;
- synthetic frame-time input triggers Tier 3.

Expected:

- cosmetic density drops;
- dominant path landmark, scars, current decision impact, fractures, and beacons remain;
- simulation speed and game state are unchanged;
- quality can recover slowly after sustained low draw cost.

---

## 26. Definition of done

CivMachine v1.10.0 is done only when all of the following are true:

- [ ] Drama Phase is a canonical game-layer derived concept using the exact existing stage score/thresholds.
- [ ] No wall-clock phase gates exist.
- [ ] Existing event cadence and scheduler weights are unchanged.
- [ ] Existing layout and choice prediction UI are unchanged.
- [ ] Decision feedback emits deterministic semantic significance/tags/transitions.
- [ ] The required 28 signature profiles exist outside the frozen generated catalog.
- [ ] Every important decision produces an immediate procedural impact.
- [ ] Major consequences can create/transform persistent world memory.
- [ ] World memory is capped at six persistent domains and three evolving scar domains.
- [ ] Stabilize can visually repair one eligible non-scar mark without erasing scars.
- [ ] All ten paths have distinct dominant visual identity beyond color alone.
- [ ] All three current institutions have distinct landmarks.
- [ ] Stability, Sanity, Awareness, Attention, Entropy, and Development remain simultaneously readable through distinct channels.
- [ ] Persistent geometry lives on cached scenery where possible; transient effects stay dynamic.
- [ ] `structuralWorldKey` reacts to structural memory/identity changes but not raw tick values.
- [ ] All visual selection/placement is deterministic and uses no `Math.random()`.
- [ ] Reduced-motion behavior retains all semantic cues.
- [ ] Adaptive quality only removes cosmetic work and never changes simulation state.
- [ ] Existing balance/economy/harvest/tactical tests pass unchanged.
- [ ] Existing strip-redraw/culling/render invariants pass.
- [ ] New drama, consequence, memory, identity, quality, and render tests pass.
- [ ] `public/game/dist/` is rebuilt and committed.
- [ ] Service-worker precache and cache version are updated for all new shipped modules.
- [ ] Version coupling is consistently `1.10.0` across package, game package, HTML, cache, tests, and release notes.

---

## 27. Final design statement

v1.10.0 is not a new simulation and not a layout redesign. It is a causal presentation layer over CivMachine's existing rules.

The civilization must visibly remember what the player did. The same city that grew because of a choice must be able to become ideological, militarized, surveilled, fractured, damaged, or partially repaired later. Longer survival must expose later chapters of that same story without changing the intended survival curve.

The implementation succeeds when a player can look at the world during a run and understand not only **how developed it is**, but also **what kind of civilization it became, what has happened to it, and what pressure it is currently under** — while the underlying v1.9.1 gameplay math remains intact.
