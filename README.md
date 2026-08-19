# Reality Consumption Engine — App Edition v1.5.0

An installable, offline-capable browser incremental roguelite. Version 1.5.0
puts a continuous containment curve under survival, a continuous Cultivation Depth
under the harvest, and cost-bearing decisions into every gap between interventions.

## Included

- 90 production interventions and 10 Civilization paths
- 192 individually written English action labels and consequence texts
- deterministic weighted scheduling with six-event repetition protection
- Stabilize, Accelerate, Probe, and Entropy Vent actions on keys 1, 2, 3, and 4
- shared Control Capacity, Containment Rating, Entropy crises, and cascade pressure
- exact before/after feedback and action-specific world impulses
- deterministic Directive drafts, objective bonuses, and starting-trait previews
- four Harvest Grades and an 18-Cultivation-Credit Universe requirement
- 12 Traits, 12 Machine, 8 Universe, and 6 Axiom upgrades
- state-reactive parallax world with cached scenery and throttled animation
- touch-safe portrait and landscape layouts
- PWA installation, offline cache, and user-triggered fullscreen
- local browser saves without offline progression

## v1.5.0 balance curve

v1.5.0 replaces binary survival with a continuous containment curve, replaces the capped harvest
grade with a continuous Cultivation Depth, and adds an Entropy Vent plus three mid-run machine
interventions. Median of nine seeds under the safety choice policy at 1x speed:

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
  scale off it, so staying deeper is the central roguelite decision. The four harvest grades become
  display bands over depth, joined by a fifth, **Singular**, from depth 16. A chaotic harvest keeps
  60% of its credits and 40% of its resources.
- Accelerate still costs 2 Control; only its Entropy surcharge dropped from 7 to 5. Entropy Vent
  costs 1 Control and 10 Stability, removes up to 18 Entropy and pays the removed amount into the
  harvest as Paradox.
- The three machine reserve interventions cost `base * 3^usesThisRun * (1 + depth / 4)`, capped at
  three uses each, which keeps them a net loss on resources.
- APOTHEOSIS is a fourth era from 14,000 years, reachable only by developed builds, with twelve new
  interventions and its own cadence.
- Universe residue scales with credits earned: 32 at 18 credits and a bank of 8,000, against 5
  before. Universe upgrade growth is capped at 1.75, bringing the full catalog to 567 residue.

## Run locally

```bash
npm install
npm run dev
```

Open the displayed local URL. For a production build:

```bash
npm run build
```

## Tests

```bash
npm test
```

This compiles the game's TypeScript sources and runs both regression suites.
`npm run lint` and `npm run typecheck` cover the Next.js shell.

The standalone game release lives in `public/game/` and can be served without
installing dependencies through `node public/game/server.mjs`.

## Deployment

The project is a standard Next.js App Router application and deploys to Vercel
without extra configuration: import the repository, keep the detected Next.js
preset, and Vercel runs `npm install` and `npm run build`. The game itself is
static content under `public/game/`, so it is served straight from the CDN.

## Project structure

- `app/` — installable shell and fullscreen/install controls
- `public/game/` — complete game, source, compiled release, and regression tests
- `public/sw.js` — offline service worker
- `tests/` — integrity and release tests
- `docs/superpowers/` — design and implementation documentation

## Save policy

Version 1.5.0 introduces the v3 browser save. Existing v2 saves are discarded by the
version gate; there is no migration path, and earlier v1 saves remain ignored. Saves use `localStorage`; no offline progress is
simulated while the app is closed.
