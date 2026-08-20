# app/ — Agent Instructions

A deliberately thin Next.js App Router shell: it registers the service worker, offers PWA install,
toggles fullscreen, and embeds the game in an `<iframe src="/game/index.html">`.

Keep it that way — no game logic here, and nothing from `public/game/src/` may be imported into the
Next build graph. UI strings in this tier are **German** (`lang="de"`), unlike the game's
player-facing copy, which is English.
