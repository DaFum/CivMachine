# Reality Consumption Engine App Design

## Context

This is the hosted, installable continuation of the approved Reality Consumption Engine browser port. The supplied v1.0.17 release is the authoritative gameplay baseline. Its complete catalog must remain intact: 75 interventions, 10 civilization paths, 12 traits, 12 Machine upgrades, 8 Universe upgrades, 6 Axiom upgrades, 6 Directives, 6 Breeding Matrices, layered Machine Insight, Controlled and Chaotic Harvest, and Universe/Multiverse prestige.

## Player fantasy and core loop

The player operates a hidden reality-harvesting machine. Each run grows a procedurally characterized civilization from a sparse settlement into an arcology-scale world. The player observes development, chooses interventions, shapes path affinities, manages awareness/stability/sanity/attention, then performs a controlled or chaotic harvest. Harvested resources buy persistent upgrades and unlock increasingly powerful machine, universe, and axiom systems.

The loop remains deterministic and state-driven. Rules, progression, saves, and event selection stay outside the renderer. The world layer visualizes current state and emits only input actions. The DOM layer owns dense text, upgrade choices, intervention cards, status bars, and responsive controls.

## App architecture

The existing static TypeScript release is retained as a self-contained game at `public/game/`. The Sites root presents it in a same-origin, full-viewport shell so the supplied engine and content can run without framework rewrites. A small client component owns install and fullscreen actions, service-worker registration, and standalone-mode detection. This keeps the game independent from the hosting framework while allowing an installable app experience.

The enhanced Phaser renderer is bundled locally. The built-in Canvas renderer remains the resilience fallback. No gameplay asset or runtime library depends on the network. The installed app uses `display: fullscreen`, supports both portrait and landscape, and enters browser fullscreen only after the player presses the fullscreen control.

## Persistence and offline behavior

Progress remains device-local in `localStorage`; no account or server database is introduced. Saves occur periodically, before unload, and on lifecycle transitions where the browser permits it. A versioned service worker precaches the root shell, game HTML/CSS, compiled modules, content catalog, local Phaser runtime, manifest, and icon. Runtime requests use a cache-first strategy for local static assets and a navigation fallback to the cached shell.

Offline progression remains disabled. Closing the app does not simulate elapsed time.

## Interface and accessibility

The existing cosmic-machine visual language is preserved: near-black space, cyan/amber/pink signals, scanline/noise texture, compact technical typography, and high-contrast status surfaces. The app shell adds only a small edge control cluster for installation and fullscreen, leaving the playfield and management panels unobstructed.

The layout supports touch, mouse, and keyboard. Safe-area insets, dynamic viewport units, scroll/zoom containment, large tap targets, portrait/landscape reflow, reduced-motion preferences, and a mobile device-pixel-ratio cap protect usability and performance. All icon-only controls retain accessible labels and focus-visible states.

## Failure handling

- If Phaser initialization fails, the local Canvas renderer takes over.
- If service-worker registration is unavailable, the online app still runs normally.
- If installation is unsupported or the app is already installed, the install control stays hidden.
- Corrupt or incompatible saves fall back to a new state without removing the explicit reset option.
- A failed quest or unstable civilization changes resources and world state; it does not create an unrelated hard Game Over.

## Verification

Automated checks cover the complete catalog, simulation/harvest/save flow, local renderer dependency, install manifest, service-worker precache, responsive shell, and production artifact. Browser playtesting covers boot, starting a civilization, intervention choice, world panning, speed changes, harvest, save reload, reset affordance, portrait/landscape layouts, keyboard/touch controls, offline reload, reduced motion, and renderer fallback.

