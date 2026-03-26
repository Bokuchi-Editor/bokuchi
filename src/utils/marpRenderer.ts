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
