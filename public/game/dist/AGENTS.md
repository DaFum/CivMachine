# dist/ — Agent Instructions

**Do not edit anything here.** Every `.js` and `.js.map` in this directory is generated from
`../src/` by `tsc -p public/game/tsconfig.json`.

It is committed to git because the browser loads it directly and no bundler touches it. Edit
`../src/**` and recompile — `npm test` does that for you. A new module also has to be added to
`APP_ASSETS` in `public/sw.js`, or returning players never receive it.
