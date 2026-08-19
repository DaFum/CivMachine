# Reality Consumption Engine — App Edition v1.4.0

An installable, offline-capable browser incremental roguelite. Version 1.4.0
balances the active Civilization loop around meaningful tactical Control,
multi-run machine progression, and distinct Controlled/Chaotic harvest roles.

## Included

- 78 production interventions and 10 Civilization paths
- 163 individually written English action labels and consequence texts
- deterministic weighted scheduling with six-event repetition protection
- Stabilize, Accelerate, and Probe actions on keys 1, 2, and 3
- shared Control Capacity, Containment Rating, Entropy crises, and cascade pressure
- exact before/after feedback and action-specific world impulses
- deterministic Directive drafts, objective bonuses, and starting-trait previews
- four Harvest Grades and an 18-Cultivation-Credit Universe requirement
- 12 Traits, 12 Machine, 8 Universe, and 6 Axiom upgrades
- state-reactive parallax world with cached scenery and throttled animation
- touch-safe portrait and landscape layouts
- PWA installation, offline cache, and user-triggered fullscreen
- local browser saves without offline progression

## v1.4.0 balance curve

Balance is unchanged from v1.3.1; v1.4.0 only rebuilds the Civilization world renderer.

- Accelerate costs 2 Control, so base intervention recharge cannot fund it after every decision.
- The first qualified run normally funds one or two machine levels; early prices now start at 90–220 with 1.60–1.75 growth.
- Cognitive Extractor and Paradox Sieve require Machine Insight 4 and 5 respectively.
- Chaotic harvest retains 40% of non-Paradox rewards, multiplies Paradox by 1.50, and grants one fewer qualified Cultivation Credit than Controlled.
- Six Transcendent or nine Established Controlled harvests reach the 18-credit Universe threshold before optional Directive bonuses.

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

Version 1.4.0 continues the existing v2 browser save without migration or reset.
Earlier v1 saves remain ignored. Saves use `localStorage`; no offline progress is
simulated while the app is closed.
