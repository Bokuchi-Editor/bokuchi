// Self-contained web fonts for Marp's built-in `gaia` theme.
//
// gaia's CSS opens with
//   @import "https://fonts.bunny.net/css?family=Lato:400,900|Roboto+Mono:400,700&display=swap";
// — a runtime CDN dependency Bokuchi's offline-first concept forbids. It also
// made the theme render inconsistently: the packaged app's CSP blocks the
// import (style-src 'self'), dev builds loaded it (dev/prod skew), and
// HTML/PDF exports fetched it only while online, so the same deck printed with
// different glyphs depending on connectivity.
//
// Fix mirrors katexExportCss.ts: marpRenderer strips the @import from the
// registered theme and appends this stylesheet instead — the same faces the
// CDN served, with every woff2 vendored under src/assets/fonts/gaia/ and
// inlined as a data URI by Vite's `?inline`. Per-subset `unicode-range` is
// preserved, so browsers decode only the subsets a slide actually uses.
//
// ~220 kB of base64 — marpRenderer lazy-loads this module only when the
// rendered CSS references these font families.
//
// Licenses: Lato and Roboto Mono are both SIL OFL 1.1 (texts live next to the
// woff2 files).
import latoLatin400 from '../assets/fonts/gaia/lato-latin-400-normal.woff2?inline';
import latoLatinExt400 from '../assets/fonts/gaia/lato-latin-ext-400-normal.woff2?inline';
import latoLatin900 from '../assets/fonts/gaia/lato-latin-900-normal.woff2?inline';
import latoLatinExt900 from '../assets/fonts/gaia/lato-latin-ext-900-normal.woff2?inline';
import robotoMonoCyrillic400 from '../assets/fonts/gaia/roboto-mono-cyrillic-400-normal.woff2?inline';
import robotoMonoCyrillicExt400 from '../assets/fonts/gaia/roboto-mono-cyrillic-ext-400-normal.woff2?inline';
import robotoMonoGreek400 from '../assets/fonts/gaia/roboto-mono-greek-400-normal.woff2?inline';
import robotoMonoLatin400 from '../assets/fonts/gaia/roboto-mono-latin-400-normal.woff2?inline';
import robotoMonoLatinExt400 from '../assets/fonts/gaia/roboto-mono-latin-ext-400-normal.woff2?inline';
import robotoMonoVietnamese400 from '../assets/fonts/gaia/roboto-mono-vietnamese-400-normal.woff2?inline';
import robotoMonoCyrillic700 from '../assets/fonts/gaia/roboto-mono-cyrillic-700-normal.woff2?inline';
import robotoMonoCyrillicExt700 from '../assets/fonts/gaia/roboto-mono-cyrillic-ext-700-normal.woff2?inline';
import robotoMonoGreek700 from '../assets/fonts/gaia/roboto-mono-greek-700-normal.woff2?inline';
import robotoMonoLatin700 from '../assets/fonts/gaia/roboto-mono-latin-700-normal.woff2?inline';
import robotoMonoLatinExt700 from '../assets/fonts/gaia/roboto-mono-latin-ext-700-normal.woff2?inline';
import robotoMonoVietnamese700 from '../assets/fonts/gaia/roboto-mono-vietnamese-700-normal.woff2?inline';

export interface GaiaFontFace {
  family: string;
  weight: number;
  unicodeRange: string;
  dataUri: string;
}

// prettier-ignore
const UNICODE_RANGES = {
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  latinExt: 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  cyrillic: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116',
  cyrillicExt: 'U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F',
  greek: 'U+0370-0377,U+037A-037F,U+0384-038A,U+038C,U+038E-03A1,U+03A3-03FF',
  vietnamese: 'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB',
} as const;

const GAIA_FONT_FACES: GaiaFontFace[] = [
  { family: 'Lato', weight: 400, unicodeRange: UNICODE_RANGES.latin, dataUri: latoLatin400 },
  { family: 'Lato', weight: 400, unicodeRange: UNICODE_RANGES.latinExt, dataUri: latoLatinExt400 },
  { family: 'Lato', weight: 900, unicodeRange: UNICODE_RANGES.latin, dataUri: latoLatin900 },
  { family: 'Lato', weight: 900, unicodeRange: UNICODE_RANGES.latinExt, dataUri: latoLatinExt900 },
  { family: 'Roboto Mono', weight: 400, unicodeRange: UNICODE_RANGES.latin, dataUri: robotoMonoLatin400 },
  { family: 'Roboto Mono', weight: 400, unicodeRange: UNICODE_RANGES.latinExt, dataUri: robotoMonoLatinExt400 },
  { family: 'Roboto Mono', weight: 400, unicodeRange: UNICODE_RANGES.cyrillic, dataUri: robotoMonoCyrillic400 },
  { family: 'Roboto Mono', weight: 400, unicodeRange: UNICODE_RANGES.cyrillicExt, dataUri: robotoMonoCyrillicExt400 },
  { family: 'Roboto Mono', weight: 400, unicodeRange: UNICODE_RANGES.greek, dataUri: robotoMonoGreek400 },
  { family: 'Roboto Mono', weight: 400, unicodeRange: UNICODE_RANGES.vietnamese, dataUri: robotoMonoVietnamese400 },
  { family: 'Roboto Mono', weight: 700, unicodeRange: UNICODE_RANGES.latin, dataUri: robotoMonoLatin700 },
  { family: 'Roboto Mono', weight: 700, unicodeRange: UNICODE_RANGES.latinExt, dataUri: robotoMonoLatinExt700 },
  { family: 'Roboto Mono', weight: 700, unicodeRange: UNICODE_RANGES.cyrillic, dataUri: robotoMonoCyrillic700 },
  { family: 'Roboto Mono', weight: 700, unicodeRange: UNICODE_RANGES.cyrillicExt, dataUri: robotoMonoCyrillicExt700 },
  { family: 'Roboto Mono', weight: 700, unicodeRange: UNICODE_RANGES.greek, dataUri: robotoMonoGreek700 },
  { family: 'Roboto Mono', weight: 700, unicodeRange: UNICODE_RANGES.vietnamese, dataUri: robotoMonoVietnamese700 },
];

/**
 * Build the @font-face stylesheet from a face list. Pure (no asset imports) so
 * it is unit testable without Vite's `?inline` loader.
 */
export function buildGaiaFontFaceCss(faces: GaiaFontFace[]): string {
  return faces
    .map(
      (f) =>
        `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};` +
        `src:url(${f.dataUri}) format('woff2');unicode-range:${f.unicodeRange}}`,
    )
    .join('\n');
}

/** Fully offline replacement for gaia's CDN font stylesheet. */
export const GAIA_FONTS_CSS = buildGaiaFontFaceCss(GAIA_FONT_FACES);
