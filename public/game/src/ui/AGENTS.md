# ui/ — Agent Instructions

`app.ts` is the DOM application root: it mounts the shell, drives render updates on engine events,
binds event listeners, and manages live resource/cost refreshes. Pure view transformation lives in
`view-model.ts`.

## Structural Keys vs. Live Refreshes

DOM panels rebuild only when `civilizationRenderKey` in `view-model.ts` changes. This key tracks
structural state changes — era shifts, path selections, intervention choices, directives, and active locale.
**It must never include continuously changing numbers** (e.g. ticks, exact resource balances, reserve costs,
or harvest yields) to avoid tearing down and rebuilding the DOM on every tick. Continuously changing text
and meters are written through direct DOM queries in `updateLiveRefreshes` in `app.ts`.

## Disclosure State

Collapsible sections and tabs manage open/closed states through `disclosure.ts` using `[data-disclosure]`
attributes. `openDisclosures` tracks open panel IDs so that structural DOM rebuilds preserve the player's
expanded/collapsed UI state seamlessly.

## Presentation and Explanation

`guide-view.ts`, `tutorial-view.ts`, and `report-view.ts` render the field manual, onboarding overlay,
and post-run reports respectively. UI presentation reads state (`state.tutorial`, `state.help`,
`machine.lastRunReport`) strictly one-directionally — UI views never mutate engine progression logic.

## Localization

All player-facing UI text reads from `data/i18n.ts` via `text()`. UI components must read localized copy
at render time rather than caching localized strings in module-level constants, ensuring seamless language switching.
