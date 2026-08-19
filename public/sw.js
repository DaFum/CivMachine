const CACHE_NAME = 'rce-app-v1.4.0';
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
  '/game/dist/render/world.js',
  '/game/dist/render/world-model.js',
  '/game/dist/render/world-presentation.js',
  '/game/dist/render/primitives.js',
  '/game/dist/render/draw-surface.js',
  '/game/dist/render/species.js',
  '/game/dist/render/factions.js',
  '/game/dist/render/settlements.js',
  '/game/dist/render/structures.js',
  '/game/dist/render/agents.js',
  '/game/dist/render/construction.js',
  '/game/dist/data/content.generated.js',
  '/game/dist/data/entropy-crises.js',
  '/game/dist/data/entropy-crises.js.map',
  '/game/dist/data/intervention-copy.js',
  '/game/dist/game/decision-feedback.js',
  '/game/dist/game/engine.js',
  '/game/dist/game/harvest-quality.js',
  '/game/dist/game/harvest-quality.js.map',
  '/game/dist/game/intervention-scheduler.js',
  '/game/dist/game/lore.js',
  '/game/dist/game/paths.js',
  '/game/dist/game/pressure.js',
  '/game/dist/game/pressure.js.map',
  '/game/dist/game/progression.js',
  '/game/dist/game/rules.js',
  '/game/dist/game/run-directives.js',
  '/game/dist/game/run-directives.js.map',
  '/game/dist/game/tactical-actions.js',
  '/game/dist/game/tactical-actions.js.map',
  '/game/dist/game/types.js',
  '/game/dist/game/upgrade-balance.js',
  '/game/dist/game/upgrade-balance.js.map',
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
