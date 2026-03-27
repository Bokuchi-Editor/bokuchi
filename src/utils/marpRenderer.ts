import type Marp from '@marp-team/marp-core';

// Lazy-loaded module cache
let marpModule: typeof import('@marp-team/marp-core') | null = null;

async function getMarp(): Promise<Marp> {
  if (!marpModule) {
    marpModule = await import('@marp-team/marp-core');
  }
  const MarpClass = marpModule.default ?? marpModule.Marp;
  return new MarpClass();
}

/** YAML front-matter detection for marp: true */
const MARP_FRONTMATTER_RE = /^---\s*\n[\s\S]*?^marp:\s*true\b[\s\S]*?^---\s*$/m;

/**
 * Check whether the markdown content has a `marp: true` YAML front-matter.
 * Synchronous — no library load needed.
 */
export function contentIsMarp(content: string): boolean {
  return MARP_FRONTMATTER_RE.test(content);
}

export interface MarpRenderResult {
  html: string;
  css: string;
  slideCount: number;
}

/**
 * Render markdown as Marp presentation HTML + CSS.
 * Lazy-loads @marp-team/marp-core on first call.
 */
export async function renderMarp(markdown: string): Promise<MarpRenderResult> {
  const marp = await getMarp();
  const { html, css } = marp.render(markdown);
  const slideCount = countSlides(html);
  return { html, css, slideCount };
}

/**
 * Count slides by counting top-level <svg data-marpit-svg> elements.
 */
export function countSlides(html: string): number {
  const matches = html.match(/<svg[^>]*data-marpit-svg/g);
  return matches ? matches.length : 1;
}

/**
 * Build a self-contained HTML document for iframe srcdoc.
 * Shows only the slide at `slideIndex` (0-based).
 */
export function buildSlideDocument(html: string, css: string, slideIndex: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${css}

/* Show only the current slide */
div.marpit > svg[data-marpit-svg] {
  display: none;
}
div.marpit > svg[data-marpit-svg]:nth-child(${slideIndex + 1}) {
  display: block;
  width: 100%;
  height: 100%;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
</head>
<body>${html}</body>
</html>`;
}

/**
 * Build a self-contained HTML document showing all slides stacked vertically.
 * Used in split/separate mode for overview while editing.
 */
export function buildAllSlidesDocument(html: string, css: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${css}

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
</style>
</head>
<body>${html}
<script>
window.addEventListener('message', function(e) {
  if (e.data && typeof e.data.scrollFraction === 'number') {
    var maxScroll = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (maxScroll > 0) {
      document.documentElement.scrollTop = e.data.scrollFraction * maxScroll;
    }
  }
});
</script>
</body>
</html>`;
}
