import type Marp from '@marp-team/marp-core';

// Lazy-loaded module cache
let marpModule: typeof import('@marp-team/marp-core') | null = null;

async function getMarp(): Promise<Marp> {
  if (!marpModule) {
    marpModule = await import('@marp-team/marp-core');
  }
  // Resolve the Marp constructor robustly across bundler interop shapes. marp-core
  // is CommonJS and exports BOTH `exports.Marp` and `exports.default` (same class).
  // Depending on the bundler's CJS→ESM interop the dynamic-import namespace can be:
  //  - { Marp: <class>, default: <class> }                    (Node / Vite 7)
  //  - { default: { Marp: <class>, default: <class> } }       (Vite 8 prebundle —
  //    `export default require_marp()`, no named `Marp` re-export)
  // The old `marpModule.default ?? marpModule.Marp` picked the exports *object* under
  // Vite 8, so `new` threw "Object is not a constructor". Unwrap one level if needed.
  const mod = marpModule as unknown as {
    Marp?: typeof Marp;
    default?: typeof Marp | { Marp?: typeof Marp; default?: typeof Marp };
  };
  const candidate = mod.Marp ?? mod.default;
  const MarpClass =
    typeof candidate === 'function'
      ? candidate
      : (candidate?.Marp ?? candidate?.default);
  if (typeof MarpClass !== 'function') {
    throw new Error('Could not resolve the Marp constructor from @marp-team/marp-core');
  }
  // Keep Marp fully offline (Bokuchi is an offline-first editor) and CSP-friendly.
  // Marp's defaults reach out to the jsDelivr CDN at render time; override them:
  //  - script.source 'inline' embeds Marp's auto-scaling/fitting browser script
  //    instead of loading browser.js from the CDN.
  //  - emoji as native Unicode (system font) instead of fetching Twemoji images.
  //  - katexFontPath false drops the CDN @font-face URLs; renderMarp() appends the
  //    locally-bundled, data-URL KaTeX CSS instead when a slide contains math.
  const marp = new MarpClass({
    script: { source: 'inline' },
    emoji: { shortcode: true, unicode: false },
    math: { katexFontPath: false },
  });
  // The built-in gaia theme additionally @imports its Lato / Roboto Mono
  // webfonts from the fonts.bunny.net CDN. Re-register it with the external
  // @import stripped (theme-name imports like `@import "gaia"` are untouched,
  // so custom themes extending gaia inherit the stripped copy); renderMarp()
  // appends the same faces from the local bundle instead.
  const gaia = marp.themeSet.get('gaia');
  if (gaia) {
    marp.themeSet.add(gaia.css.replace(EXTERNAL_CSS_IMPORT_RE, ''));
  }
  return marp;
}

// Matches `@import "https://…";` / `@import url("https://…");` — external
// stylesheet imports only. Marpit theme-name imports (`@import "gaia";`) must
// not match.
const EXTERNAL_CSS_IMPORT_RE = /@import\s+(?:url\()?["']https?:\/\/[^"']+["']\)?\s*;?/g;

// Font families of the gaia webfonts stripped above. Any rendered CSS that
// references them (gaia, a custom theme extending it, or a theme using the
// same families) gets the locally-bundled faces appended.
const GAIA_FONT_FAMILY_RE = /font-family:[^;{}]*(?:\bLato\b|Roboto Mono)/;

// YAML front-matter is delimited by `---` lines and must sit at the very start
// of the document. Anchoring the opening fence to position 0 prevents matches
// against `---` that appear inside fenced code blocks (e.g. a Marp tutorial
// that shows front-matter as an example).
export const MARP_FRONTMATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/**
 * Check whether the markdown content has a `marp: true` YAML front-matter.
 * Synchronous — no library load needed.
 */
export function contentIsMarp(content: string): boolean {
  const match = MARP_FRONTMATTER_RE.exec(content);
  if (!match) return false;
  return /^marp:\s*true\b/m.test(match[1]);
}

export interface MarpRenderResult {
  html: string;
  css: string;
  slideCount: number;
}

/**
 * Render markdown as Marp presentation HTML + CSS.
 * Lazy-loads @marp-team/marp-core on first call.
 *
 * `customThemeCss` is a list of theme CSS strings (from the user's configured
 * Marp theme folder). Each is registered so a slide's `theme:` directive can
 * select it. Files without a valid `@theme` header throw on registration and
 * are skipped, so one bad file never breaks the render.
 */
export async function renderMarp(
  markdown: string,
  customThemeCss: string[] = [],
): Promise<MarpRenderResult> {
  const marp = await getMarp();
  for (const themeCss of customThemeCss) {
    try {
      marp.themeSet.add(themeCss);
    } catch (err) {
      console.warn('[MarpPreview] Skipped invalid Marp theme CSS:', err);
    }
  }
  const { html, css } = marp.render(markdown);
  // With katexFontPath: false, Marp's math CSS no longer points at the CDN, so the
  // fonts must be supplied locally. Reuse the app's inlined (data-URL) KaTeX CSS —
  // lazy-loaded and appended last so its @font-face wins over Marp's relative one —
  // but only when the slides actually contain rendered math, to avoid shipping the
  // ~370 kB font payload to every render.
  let finalCss = css;
  if (html.includes('katex')) {
    const { KATEX_EXPORT_CSS } = await import('./katexExportCss');
    finalCss = `${css}\n${KATEX_EXPORT_CSS}`;
  }
  // Same deal for the gaia webfonts stripped in getMarp(): supply Lato /
  // Roboto Mono from the local bundle, only when this deck's CSS actually
  // references them (~220 kB of data-URL fonts otherwise skipped).
  if (GAIA_FONT_FAMILY_RE.test(css)) {
    const { GAIA_FONTS_CSS } = await import('./gaiaThemeFonts');
    finalCss = `${finalCss}\n${GAIA_FONTS_CSS}`;
  }
  const slideCount = countSlides(html);
  return { html, css: finalCss, slideCount };
}

/**
 * Count slides by counting top-level <svg data-marpit-svg> elements.
 */
export function countSlides(html: string): number {
  const matches = html.match(/<svg[^>]*data-marpit-svg/g);
  return matches ? matches.length : 1;
}

/**
 * JS snippet injected into every Marp iframe srcdoc.
 * Intercepts all link clicks (capture phase) and forwards external URLs to
 * the parent window via postMessage so the host can route them to the OS
 * browser. Without this, sandboxed iframes navigate internally and replace
 * the slide rendering with the linked website.
 *
 * Hosting code must listen for `{ type: 'openExternalUrl', url }` messages
 * and validate the URL again before opening it.
 */
export const LINK_INTERCEPTOR_SCRIPT = `
(function() {
  function handleClick(e) {
    var el = e.target;
    while (el && el.nodeType === 1 && el.tagName !== 'A') {
      el = el.parentNode;
    }
    if (!el || el.tagName !== 'A') return;
    var href = el.getAttribute('href');
    if (!href) return;
    e.preventDefault();
    e.stopPropagation();
    if (/^(https?:|mailto:)/i.test(href)) {
      try {
        window.parent.postMessage({ type: 'openExternalUrl', url: href }, '*');
      } catch (err) {}
    } else if (href.charAt(0) === '#') {
      try {
        var target = document.querySelector(href);
        if (target && target.scrollIntoView) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      } catch (err) {}
    }
    /* Other schemes (javascript:, file:, data:, etc.) are dropped. */
  }
  document.addEventListener('click', handleClick, true);
  document.addEventListener('auxclick', handleClick, true);

  // Forward keyboard navigation to the host. The iframe is sandboxed, so
  // keydown events fired inside it never bubble to the parent window. The
  // host listens for { type: 'marpKey', key } and routes to fullscreen exit /
  // slide navigation.
  function handleKey(e) {
    var k = e.key;
    if (k !== 'Escape' && k !== 'ArrowLeft' && k !== 'ArrowRight'
        && k !== 'ArrowUp' && k !== 'ArrowDown' && k !== ' ') return;
    e.preventDefault();
    try {
      window.parent.postMessage({ type: 'marpKey', key: k }, '*');
    } catch (err) {}
  }
  document.addEventListener('keydown', handleKey, true);
})();
`;

/**
 * Build a self-contained HTML document for iframe srcdoc.
 * All slides are loaded once; the visible slide is controlled via postMessage.
 * This avoids full document reloads on slide change, preventing CSS flicker.
 */
export function buildSlideDocument(html: string, css: string, slideIndex: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${css}

/* Hide all slides by default */
div.marpit > svg[data-marpit-svg] {
  display: none;
}
div.marpit > svg[data-marpit-svg].active-slide {
  display: block;
  width: 100%;
  height: auto;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
}

/* Center the slide vertically and horizontally, fit within viewport */
div.marpit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

/* Constrain by height when viewport is wider than 16:9 */
@media (min-aspect-ratio: 16/9) {
  div.marpit > svg[data-marpit-svg].active-slide {
    width: auto;
    height: 100%;
  }
}

/* Mermaid diagrams rendered inside slides */
.mermaid-diagram {
  display: flex;
  justify-content: center;
  margin: 0.5em 0;
  max-width: 100%;
}
.mermaid-diagram svg {
  max-width: 100%;
  max-height: 100%;
  height: auto;
}
.mermaid-error {
  margin: 0.5em 0;
}
</style>
</head>
<body>${html}
<script>
function showSlide(index) {
  var slides = document.querySelectorAll('div.marpit > svg[data-marpit-svg]');
  for (var i = 0; i < slides.length; i++) {
    if (i === index) {
      slides[i].classList.add('active-slide');
    } else {
      slides[i].classList.remove('active-slide');
    }
  }
}
showSlide(${slideIndex});
window.addEventListener('message', function(e) {
  if (e.data && typeof e.data.slideIndex === 'number') {
    showSlide(e.data.slideIndex);
  }
});
${LINK_INTERCEPTOR_SCRIPT}
</script>
</body>
</html>`;
}

/**
 * Build a thumbnail grid document for slide overview.
 * Each slide is rendered as a clickable thumbnail; clicking sends
 * { type: 'slideSelect', slideIndex: N } to the parent via postMessage.
 * The currently active slide is highlighted with a border.
 */
export function buildThumbnailDocument(html: string, css: string, activeSlide: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${css}

html, body {
  margin: 0;
  padding: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: #1a1a1a;
}

/* Hide the original Marp container — used only as a rendering source */
div.marpit {
  display: none !important;
}

#thumb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  padding: 12px;
  box-sizing: border-box;
}

.thumb-wrapper {
  position: relative;
  cursor: pointer;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  transition: box-shadow 0.15s, outline-color 0.15s;
  outline: 4px solid transparent;
  outline-offset: 0px;
}

.thumb-wrapper:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.6);
  outline-color: rgba(100,150,255,0.4);
}

.thumb-wrapper.active-thumb {
  outline-color: #4a9eff;
  box-shadow: 0 4px 16px rgba(74,158,255,0.3);
}

/* Each wrapper contains a full Marp container clone showing one slide */
.thumb-wrapper div.marpit {
  display: flex !important;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.thumb-wrapper div.marpit > svg[data-marpit-svg] {
  display: none;
}

.thumb-wrapper div.marpit > svg[data-marpit-svg].thumb-visible {
  display: block;
  width: 100%;
  height: auto;
}

/* Mermaid diagrams rendered inside slides */
.mermaid-diagram {
  display: flex;
  justify-content: center;
  margin: 0.5em 0;
  max-width: 100%;
}
.mermaid-diagram svg {
  max-width: 100%;
  max-height: 100%;
  height: auto;
}
.mermaid-error {
  margin: 0.5em 0;
}

.slide-number {
  position: absolute;
  bottom: 4px;
  right: 6px;
  background: rgba(0,0,0,0.6);
  color: #ccc;
  font-size: 11px;
  font-family: sans-serif;
  padding: 1px 5px;
  border-radius: 3px;
  pointer-events: none;
  z-index: 1;
}
</style>
</head>
<body>${html}
<script>
(function() {
  var marpit = document.querySelector('div.marpit');
  if (!marpit) return;
  var origSvgs = marpit.querySelectorAll(':scope > svg[data-marpit-svg]');
  var grid = document.createElement('div');
  grid.id = 'thumb-grid';

  for (var i = 0; i < origSvgs.length; i++) {
    var wrapper = document.createElement('div');
    wrapper.className = 'thumb-wrapper' + (i === ${activeSlide} ? ' active-thumb' : '');
    wrapper.setAttribute('data-index', String(i));

    // Clone the entire marpit container so Marp CSS applies correctly
    var clone = marpit.cloneNode(false);
    var svgClone = origSvgs[i].cloneNode(true);
    svgClone.classList.add('thumb-visible');
    clone.appendChild(svgClone);

    var label = document.createElement('span');
    label.className = 'slide-number';
    label.textContent = String(i + 1);

    wrapper.appendChild(clone);
    wrapper.appendChild(label);
    grid.appendChild(wrapper);
  }

  document.body.appendChild(grid);

  grid.addEventListener('click', function(e) {
    var wrapper = e.target.closest('.thumb-wrapper');
    if (!wrapper) return;
    var idx = parseInt(wrapper.getAttribute('data-index'), 10);
    window.parent.postMessage({ type: 'slideSelect', slideIndex: idx }, '*');
    setActive(idx);
  });

  function setActive(index) {
    var wrappers = grid.querySelectorAll('.thumb-wrapper');
    for (var j = 0; j < wrappers.length; j++) {
      if (j === index) {
        wrappers[j].classList.add('active-thumb');
      } else {
        wrappers[j].classList.remove('active-thumb');
      }
    }
  }

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'thumbActive' && typeof e.data.slideIndex === 'number') {
      setActive(e.data.slideIndex);
    }
  });
})();
${LINK_INTERCEPTOR_SCRIPT}
</script>
</body>
</html>`;
}

/**
 * Build a self-contained HTML document showing all slides stacked vertically.
 * Used in split/separate mode for overview while editing.
 */
const CONTINUOUS_WRAPPER_STYLES = `
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background: #1a1a1a;
}

div.marpit > svg[data-marpit-svg] {
  display: block;
  width: 100%;
  height: auto;
  margin: 16px auto;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  border-radius: 4px;
}

div.marpit {
  padding: 0 16px;
  box-sizing: border-box;
}

/* Mermaid diagrams rendered inside slides */
.mermaid-diagram {
  display: flex;
  justify-content: center;
  margin: 0.5em 0;
  max-width: 100%;
}
.mermaid-diagram svg {
  max-width: 100%;
  max-height: 100%;
  height: auto;
}
.mermaid-error {
  margin: 0.5em 0;
}`;

/**
 * Compose the full stylesheet text used inside the continuous-mode iframe.
 * Exposed so MarpPreview can patch the iframe's <style> element when marpCss
 * changes without reloading the iframe.
 */
export function buildContinuousStyleContent(css: string): string {
  return `${css}\n${CONTINUOUS_WRAPPER_STYLES}`;
}

/**
 * WebKit's *print* layout engine ignores `align-content` on block containers
 * (the screen engine supports it). marp-core v4 themes vertically center slide
 * content with exactly that pattern — `section { display: block;
 * place-content: … }` — so a natively-printed PDF comes out top-aligned while
 * the preview (screen layout) is centered.
 *
 * This script, run inside the print document before the native print fires,
 * converts only the affected sections to the equivalent flex layout: themes
 * keep a legacy `flex-flow: column nowrap` on section, under which
 * `justify-content` reproduces the block-axis alignment `align-content` asked
 * for. Sections that don't use block-axis alignment (and non-block layouts
 * like grid or themes that are flex already) are left untouched.
 *
 * Overflow guard: a `section` is a fixed-height box with `overflow: hidden`.
 * Switching it from block to flex stops vertical margins between its children
 * from collapsing, so a slide that just fits when block-laid-out can grow past
 * the slide height once it is flex — and `justify-content: center` then splits
 * the overflow so it clips *inside* the content (e.g. a table's lower rows are
 * cut off while the heading and trailing text survive). We therefore keep the
 * flex conversion only when it does not introduce overflow; otherwise the
 * section reverts to its original block layout (top-aligned, nothing clipped),
 * which is strictly better than a mid-content clip. Sparse slides
 * (title/chapter/…) still fit and stay centered.
 *
 * Chromium (Windows/WebView2) prints block `align-content` correctly — same
 * engine as Marp CLI — so the fix is gated to WebKit via navigator.vendor
 * (Apple on both macOS WKWebView and Linux webkit2gtk).
 */
const MARP_PRINT_CENTERING_FIX = `
(function () {
  if (navigator.vendor !== 'Apple Computer, Inc.') return;
  var sections = document.querySelectorAll('div.marpit > svg > foreignObject > section');
  for (var i = 0; i < sections.length; i++) {
    var s = sections[i];
    /* Marpit advanced-background layers ("background"/"pseudo") are section
       elements too, but they lay out bg figures, not slide content — forcing
       flex on them breaks split backgrounds. Only touch content layers. */
    var bgLayer = s.getAttribute('data-marpit-advanced-background');
    if (bgLayer === 'background' || bgLayer === 'pseudo') continue;
    var cs = getComputedStyle(s);
    var ac = cs.alignContent;
    if (cs.display !== 'block' || !ac || ac === 'normal' || ac === 'start' || ac === 'flex-start') continue;
    s.style.display = 'flex';
    s.style.flexFlow = 'column nowrap';
    /* Drop overflow-safety keywords: 'safe center' centers via justify-content
       in the flex fallback, matching what place-content resolves to. */
    s.style.justifyContent = ac.replace(/\\b(?:safe|unsafe)\\s+/g, '');
    /* Pin children at their natural size. Flex items default to flex-shrink:1,
       so an overflowing column *shrinks* them to fit the fixed-height section —
       the section's scrollHeight then equals its clientHeight (no overflow
       reported) even though the children's own content is clipped (a table's
       lower rows vanish). Pinning shrink to 0 makes the overflow real and
       measurable, so the guard below can detect it. */
    var kids = s.children;
    for (var k = 0; k < kids.length; k++) kids[k].style.flexShrink = '0';
    /* Revert if the flex layout overflows — a mid-content clip is worse than a
       top-aligned slide (see "Overflow guard" above). */
    if (s.scrollHeight > s.clientHeight + 1) {
      s.style.display = '';
      s.style.flexFlow = '';
      s.style.justifyContent = '';
      for (var r = 0; r < kids.length; r++) kids[r].style.flexShrink = '';
    }
  }
})();
`;

/**
 * Build a print-ready document for PDF export of Marp slides: one slide per
 * page. The page box is sized to the slide's own pixel dimensions (read from
 * the first slide's viewBox, default 1280×720 for 16:9) so each slide fills its
 * page with the correct aspect ratio and no surrounding margin.
 */
export function buildMarpPrintDocument(html: string, css: string): string {
  const vb = html.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  const slideWidth = vb ? vb[1] : '1280';
  const slideHeight = vb ? vb[2] : '720';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${css}

html, body { margin: 0; padding: 0; background: #fff; }
div.marpit { padding: 0; }
/* Render each slide SVG at its intrinsic pixel size (matching the page), so the
   scale factor is exactly 1. Scaling the SVG (width:100%) made WebKit reflow the
   slide's <foreignObject> contents during printing, which broke the vertical
   centering and image sizing. At scale 1 the slide prints exactly as previewed. */
div.marpit > svg[data-marpit-svg] {
  display: block;
  width: ${slideWidth}px;
  height: ${slideHeight}px;
  margin: 0;
  box-shadow: none;
  border-radius: 0;
  break-after: page;
}
div.marpit > svg[data-marpit-svg]:last-child { break-after: auto; }

/* Marpit's own print CSS puts page-break-before on every section (meant for
   its non-SVG output). Pagination here comes from the svg's break-after
   above, and in WebKit the section-level break rule corrupts print painting
   once sections are flex (the centering fix below): background figures of
   *later* slides with an explicit background-size silently disappear from
   the printed pages. Neutralize the section-level breaks. */
@media print {
  div.marpit > svg > foreignObject > section {
    page-break-before: auto !important;
    break-before: auto !important;
  }
}

/* Mermaid diagrams rendered inside slides */
.mermaid-diagram { display: flex; justify-content: center; margin: 0.5em 0; max-width: 100%; }
.mermaid-diagram svg { max-width: 100%; max-height: 100%; height: auto; }
.mermaid-error { margin: 0.5em 0; }

@media print {
  @page { size: ${slideWidth}px ${slideHeight}px; margin: 0; }
  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>${html}
<script>${MARP_PRINT_CENTERING_FIX}</script>
</body>
</html>`;
}

export function buildAllSlidesDocument(html: string, css: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${buildContinuousStyleContent(css)}
</style>
</head>
<body>${html}
<script>
${LINK_INTERCEPTOR_SCRIPT}
</script>
</body>
</html>`;
}
