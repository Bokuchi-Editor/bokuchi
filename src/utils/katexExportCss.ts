// Self-contained KaTeX stylesheet for HTML export.
//
// The exported HTML file must render math correctly on its own — no CDN, no
// sibling font files. The in-app preview gets KaTeX's CSS + fonts from the Vite
// bundle (`import 'katex/dist/katex.min.css'`), but a standalone export has none
// of that, so without this the rendered `.katex-html` spans collapse into
// unstyled run-together text while the browser falls back to natively rendering
// the (normally hidden) `.katex-mathml`, producing a broken duplicate of every
// equation (issue: KaTeX export showed garbled inline math next to the render).
//
// Fix: take KaTeX's stylesheet and inline its woff2 fonts as data URIs, dropping
// the woff/ttf fallbacks (every browser we target supports woff2). The result is
// one large but fully offline CSS string injected into the export `<head>`.
//
// The font set is tied to the pinned KaTeX version (see CLAUDE.md — katex is
// pinned to ^0.16.x). If KaTeX changes its font list this map must be updated;
// any @font-face whose woff2 isn't mapped here simply keeps its original
// (now-dangling) relative url() and that glyph family won't render.
import katexCssRaw from 'katex/dist/katex.min.css?raw';

import KaTeX_AMS_Regular from 'katex/dist/fonts/KaTeX_AMS-Regular.woff2?inline';
import KaTeX_Caligraphic_Bold from 'katex/dist/fonts/KaTeX_Caligraphic-Bold.woff2?inline';
import KaTeX_Caligraphic_Regular from 'katex/dist/fonts/KaTeX_Caligraphic-Regular.woff2?inline';
import KaTeX_Fraktur_Bold from 'katex/dist/fonts/KaTeX_Fraktur-Bold.woff2?inline';
import KaTeX_Fraktur_Regular from 'katex/dist/fonts/KaTeX_Fraktur-Regular.woff2?inline';
import KaTeX_Main_Bold from 'katex/dist/fonts/KaTeX_Main-Bold.woff2?inline';
import KaTeX_Main_BoldItalic from 'katex/dist/fonts/KaTeX_Main-BoldItalic.woff2?inline';
import KaTeX_Main_Italic from 'katex/dist/fonts/KaTeX_Main-Italic.woff2?inline';
import KaTeX_Main_Regular from 'katex/dist/fonts/KaTeX_Main-Regular.woff2?inline';
import KaTeX_Math_BoldItalic from 'katex/dist/fonts/KaTeX_Math-BoldItalic.woff2?inline';
import KaTeX_Math_Italic from 'katex/dist/fonts/KaTeX_Math-Italic.woff2?inline';
import KaTeX_SansSerif_Bold from 'katex/dist/fonts/KaTeX_SansSerif-Bold.woff2?inline';
import KaTeX_SansSerif_Italic from 'katex/dist/fonts/KaTeX_SansSerif-Italic.woff2?inline';
import KaTeX_SansSerif_Regular from 'katex/dist/fonts/KaTeX_SansSerif-Regular.woff2?inline';
import KaTeX_Script_Regular from 'katex/dist/fonts/KaTeX_Script-Regular.woff2?inline';
import KaTeX_Size1_Regular from 'katex/dist/fonts/KaTeX_Size1-Regular.woff2?inline';
import KaTeX_Size2_Regular from 'katex/dist/fonts/KaTeX_Size2-Regular.woff2?inline';
import KaTeX_Size3_Regular from 'katex/dist/fonts/KaTeX_Size3-Regular.woff2?inline';
import KaTeX_Size4_Regular from 'katex/dist/fonts/KaTeX_Size4-Regular.woff2?inline';
import KaTeX_Typewriter_Regular from 'katex/dist/fonts/KaTeX_Typewriter-Regular.woff2?inline';

// Keyed by the font basename as it appears in katex.min.css `url(fonts/<name>.woff2)`.
const FONT_DATA_URIS: Record<string, string> = {
  'KaTeX_AMS-Regular': KaTeX_AMS_Regular,
  'KaTeX_Caligraphic-Bold': KaTeX_Caligraphic_Bold,
  'KaTeX_Caligraphic-Regular': KaTeX_Caligraphic_Regular,
  'KaTeX_Fraktur-Bold': KaTeX_Fraktur_Bold,
  'KaTeX_Fraktur-Regular': KaTeX_Fraktur_Regular,
  'KaTeX_Main-Bold': KaTeX_Main_Bold,
  'KaTeX_Main-BoldItalic': KaTeX_Main_BoldItalic,
  'KaTeX_Main-Italic': KaTeX_Main_Italic,
  'KaTeX_Main-Regular': KaTeX_Main_Regular,
  'KaTeX_Math-BoldItalic': KaTeX_Math_BoldItalic,
  'KaTeX_Math-Italic': KaTeX_Math_Italic,
  'KaTeX_SansSerif-Bold': KaTeX_SansSerif_Bold,
  'KaTeX_SansSerif-Italic': KaTeX_SansSerif_Italic,
  'KaTeX_SansSerif-Regular': KaTeX_SansSerif_Regular,
  'KaTeX_Script-Regular': KaTeX_Script_Regular,
  'KaTeX_Size1-Regular': KaTeX_Size1_Regular,
  'KaTeX_Size2-Regular': KaTeX_Size2_Regular,
  'KaTeX_Size3-Regular': KaTeX_Size3_Regular,
  'KaTeX_Size4-Regular': KaTeX_Size4_Regular,
  'KaTeX_Typewriter-Regular': KaTeX_Typewriter_Regular,
};

// Each @font-face `src` looks like:
//   url(fonts/X.woff2) format("woff2"),url(fonts/X.woff) format("woff"),url(fonts/X.ttf) format("truetype")
// Replace the whole list with just the inlined woff2 data URI.
const FONT_SRC_RE =
  /url\(fonts\/([A-Za-z0-9_-]+)\.woff2\)\s*format\("woff2"\)(?:,\s*url\(fonts\/\1\.woff\)\s*format\("woff"\))?(?:,\s*url\(fonts\/\1\.ttf\)\s*format\("truetype"\))?/g;

/**
 * Rewrite each @font-face `src` in KaTeX's CSS to use only the inlined woff2 data
 * URI, dropping the woff/ttf fallbacks. Pure (no asset imports) so it is unit
 * testable against the real stylesheet without Vite's `?raw`/`?inline` loaders.
 */
export function inlineKatexFonts(rawCss: string, fontDataUris: Record<string, string>): string {
  return rawCss.replace(FONT_SRC_RE, (match, name: string) => {
    const uri = fontDataUris[name];
    return uri ? `url(${uri}) format("woff2")` : match;
  });
}

/** KaTeX CSS with all woff2 fonts inlined as data URIs, for standalone HTML export. */
export const KATEX_EXPORT_CSS = inlineKatexFonts(katexCssRaw, FONT_DATA_URIS);
