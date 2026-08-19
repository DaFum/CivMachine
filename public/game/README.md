# Reality Consumption Engine — App Edition v1.3.1

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
- `src/render/` — Phaser civilization renderer and Canvas fallback
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
- device-pixel-ratio cap of 2 for the Canvas fallback
- no offline progression

## v1.3.1 balance curve

- Accelerate costs 2 Control and therefore cannot self-fund from ordinary intervention recharge.
- Machine upgrades use a 90–220 early base-cost range and 1.60–1.75 growth; a first qualified run normally buys one or two levels.
- Cognitive Extractor unlocks at Machine Insight 4 and Paradox Sieve at Machine Insight 5.
- Chaotic harvest retains 40% of non-Paradox yield, grants 1.50× Paradox, and loses one qualified Cultivation Credit versus Controlled.
- The common Controlled route reaches a Universe in six Transcendent or nine Established runs before optional Directive bonuses.

## Renderer behavior

The production boot uses the built-in deterministic Canvas renderer. Structural scenery is cached and rebuilt only when meaningful state bands change; atmosphere, settlement lights, traffic, and decision impulses update independently. The runtime remains compatible with an optional Phaser host, but the game never depends on it to display the Civilization world.

## Save data

Version 1.3.1 continues to use the existing v2 `localStorage` key without migration or reset. v1 browser saves and Godot saves remain unsupported. The game has no offline progression.
