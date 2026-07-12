# Web fonts for Marp's built-in `gaia` theme

marp-core's `gaia` theme requests **Lato 400/900** and **Roboto Mono 400/700**
from `fonts.bunny.net` via a CSS `@import`. Bokuchi is offline-first, so the
same faces are vendored here and inlined as data URIs at build time
(see `src/utils/gaiaThemeFonts.ts`; the CDN `@import` is stripped in
`src/utils/marpRenderer.ts`).

The woff2 files are the exact subset files served by
`https://fonts.bunny.net/css?family=Lato:400,900|Roboto+Mono:400,700&display=swap`
(fetched 2026-07-02), so the rendered output matches what the CDN used to
deliver, per-subset `unicode-range` included. The ranges live next to each
face in `gaiaThemeFonts.ts` — keep them in sync if these files are ever
refreshed.

## Licenses

- **Lato** — SIL Open Font License 1.1, see [LICENSE-Lato-OFL.txt](./LICENSE-Lato-OFL.txt)
- **Roboto Mono** — SIL Open Font License 1.1, see [LICENSE-RobotoMono-OFL.txt](./LICENSE-RobotoMono-OFL.txt)
