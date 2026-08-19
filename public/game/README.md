# Reality Consumption Engine — App Edition v1.5.0

A complete browser port of the Godot/Android prototype. The game runs as a static web application with a deterministic Canvas civilization renderer and a responsive DOM management layer.

## Run locally

No `npm install` is required for the prebuilt release.

### Node.js

```bash
node server.mjs
```

Then open:

```text
http://localhost:8080
```

To use another port:

```bash
PORT=4173 node server.mjs
```

### Any static web server

You can also serve the extracted folder with any static web server. The precompiled JavaScript is already in `dist/`.

Do not rely on double-clicking `index.html`; ES modules are intended to be served over HTTP(S).

## Build from TypeScript source

The release includes all TypeScript sources in `src/`. If `tsc` is installed:

```bash
npm run build
```

Run the regression suite with:

```bash
npm test
```

## Browser architecture

- `src/game/` — deterministic simulation, progression, prestige, saves, intervention paths
- `src/render/` — deterministic Canvas civilization renderer
- `src/ui/` — responsive DOM HUD, panels, controls, intervention choices
- `src/data/` — generated content ported from the Godot catalogs
- `dist/` — precompiled browser JavaScript
- `tests/` — Node regression tests

## Ported game systems

- 78 production interventions, including three scheduled Entropy crises
- 163 individually written choice actions and consequence descriptions
- deterministic weighted scheduling with six-event repetition protection
- exact before/after decision feedback and state-reactive visual impulses
- shared Control Capacity with Stabilize, Accelerate, and Probe tactical actions
- keyboard shortcuts 1/2/3 plus touch-safe action controls
- escalating Entropy, Containment requirements, and collapse pressure
- deterministic per-Civilization Directive offers, objectives, and Trait previews
- Premature, Established, Transcendent, and Ascendant Harvest Grades
- Cultivation Credits with an 18-credit Universe consumption requirement
- 10 civilization paths with dominant and secondary tendencies
- 12 traits
- 12 Machine upgrades
- 8 Universe upgrades
- 6 Axiom upgrades
- 6 Directives
- 6 Breeding Matrices
- layered Machine Insight progression and resource unlocks
- Controlled and Chaotic Harvest
- Universe and Multiverse prestige
- layered parallax civilization world that grows from tent camps to arcology-scale cities
- cached structural scenery with throttled atmospheric and settlement animation
- path- and trait-reactive civilization visuals
- local browser saves through `localStorage`
- offline play after the first successful load through the app service worker
- touch-safe portrait and landscape layouts with safe-area support
- device-pixel-ratio cap of 2 for the Canvas renderer
- no offline progression

## v1.5.0 balance curve

v1.5.0 replaces binary survival with a continuous containment curve, replaces the capped harvest
grade with a continuous Cultivation Depth, and adds an Entropy Vent plus three mid-run machine
interventions. Measured medians over 24 seeds at 1x speed:

| Build | Containment | Median run |
| --- | ---: | ---: |
| No upgrades | 0 | 181 s |
| Four modules at level 1 | 4 | 360 s |
| Deep machine build | 14 | 654 s |
| Maximum with Stable Constants | 28 | 988 s |

- `entropyRate` is `0.48 * (1 + years / 6500) / (1 + 0.4 * containment)`, and containment sums
  upgrade **levels** across Reality Lattice, Awareness Scrubber, Sanity Protocol, Cosmic Muffling
  and the Universe upgrade Stable Constants. Every level is measurable; nothing is binary.
- Cascade decay is 7% of maximum Stability per second, so it lasts about 14 seconds for any build.
- Cultivation Depth is `development / 80 + 1.5` per completed path arc. Yield multiplier and credits
  scale off it, so staying deeper is the central roguelite decision. A chaotic harvest keeps 60% of
  its credits and 40% of its resources.
- Accelerate still costs 2 Control; only its Entropy surcharge dropped from 7 to 5. Entropy Vent
  costs 1 Control and 10 Stability, removes up to 18 Entropy and pays the removed amount into the
  harvest as Paradox.
- The three machine reserve interventions cost `base * 3^usesThisRun * (1 + depth / 4)`, capped at
  three uses each, which keeps them a net loss on resources.
- APOTHEOSIS is a fourth era from 14,000 years, reachable only by developed builds, with twelve new
  interventions and its own cadence.
- Universe residue scales with credits earned: 32 at 18 credits and a bank of 8,000, against 5
  before. Universe upgrade growth is capped at 1.75, bringing the full catalog to 567 residue.

## Renderer behavior

The production boot uses the built-in deterministic Canvas renderer. Structural scenery is cached and rebuilt only when meaningful state bands change; atmosphere, settlement lights, traffic, and decision impulses update independently. There is no second renderer and no game framework: the Civilization world is drawn entirely with Canvas 2D.

## Save data

Version 1.5.0 continues to use the existing v2 `localStorage` key without migration or reset. v1 browser saves and Godot saves remain unsupported. The game has no offline progression.
