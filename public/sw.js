const CACHE_NAME = 'rce-app-v1.27.0';
const APP_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/game/index.html',
  '/game/styles.css',
  '/game/mobile.css',
  '/game/dist/main.js',
  '/game/dist/ui/app.js',
  '/game/dist/ui/view-model.js',
  '/game/dist/ui/format.js',
  '/game/dist/ui/disclosure.js',
  '/game/dist/ui/guide-view.js',
  '/game/dist/ui/tutorial-view.js',
  '/game/dist/ui/report-view.js',
  '/game/dist/render/world.js',
  '/game/dist/render/world-model.js',
  '/game/dist/render/world-memory.js',
  '/game/dist/render/world-presentation.js',
  '/game/dist/render/primitives.js',
  '/game/dist/render/quality.js',
  '/game/dist/render/routes.js',
  '/game/dist/render/draw-surface.js',
  '/game/dist/render/species.js',
  '/game/dist/render/factions.js',
  '/game/dist/render/identity.js',
  '/game/dist/render/settlements.js',
  '/game/dist/render/structures.js',
  '/game/dist/render/substrate.js',
  '/game/dist/render/agents.js',
  '/game/dist/render/construction.js',
  '/game/dist/render/consequence-presentation.js',
  '/game/dist/data/content.generated.js',
  '/game/dist/data/localization.js',
  '/game/dist/data/i18n.js',
  '/game/dist/data/help-topics.js',
  '/game/dist/data/entropy-crises.js',
  '/game/dist/data/intervention-copy.js',
  '/game/dist/data/apotheosis-events.js',
  '/game/dist/data/event-chains.js',
  '/game/dist/data/expanded-interventions.js',
  '/game/dist/data/expanded-path-interventions.js',
  '/game/dist/game/consequence-profiles.js',
  '/game/dist/game/decision-consequences.js',
  '/game/dist/game/decision-feedback.js',
  '/game/dist/game/drama.js',
  '/game/dist/game/development.js',
  '/game/dist/game/engine.js',
  '/game/dist/game/effects.js',
  '/game/dist/game/guidance.js',
  '/game/dist/game/harvest-quality.js',
  '/game/dist/game/intervention-scheduler.js',
  '/game/dist/game/convergence.js',
  '/game/dist/game/lore.js',
  '/game/dist/game/milestones.js',
  '/game/dist/game/paths.js',
  '/game/dist/game/pressure.js',
  '/game/dist/game/progression.js',
  '/game/dist/game/stat-drift.js',
  '/game/dist/game/rules.js',
  '/game/dist/game/save-migration.js',
  '/game/dist/game/run-directives.js',
  '/game/dist/game/run-interventions.js',
  '/game/dist/game/run-report.js',
  '/game/dist/game/tutorial.js',
  '/game/dist/game/tactical-actions.js',
  '/game/dist/game/types.js',
  '/game/dist/game/upgrade-balance.js',
  '/game/dist/game/world-memory.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        return (await caches.match('/game/index.html')) || Response.error();
      }),
    );
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
