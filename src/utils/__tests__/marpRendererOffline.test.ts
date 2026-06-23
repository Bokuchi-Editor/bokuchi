import { describe, it, expect, vi } from 'vitest';

// The real inlined KaTeX CSS relies on Vite's `?inline` font imports, which the
// production build embeds as data: URLs (the export feature already depends on
// this). vitest doesn't reproduce that transform, so mock it with a sentinel and
// assert the *wiring* — that renderMarp appends it only when math is present.
vi.mock('../katexExportCss', () => ({
  KATEX_EXPORT_CSS: '/* INLINED_KATEX_FONTS_SENTINEL */',
}));

// NOTE: intentionally does NOT mock @marp-team/marp-core — this exercises the real
// renderer to prove Marp output carries no runtime CDN dependency (offline-first).
import { renderMarp } from '../marpRenderer';

const MATH_DOC = [
  '---',
  'marp: true',
  'math: katex',
  '---',
  '',
  '# Heading :smile: ✅',
  '',
  'Inline math $x^2 + y^2 = z^2$ and a display block:',
  '',
  '$$\\int_0^1 x\\,dx$$',
].join('\n');

const PLAIN_DOC = ['---', 'marp: true', '---', '', '# Plain :smile: slide'].join('\n');

describe('renderMarp offline (no CDN)', () => {
  it('emits no jsDelivr / CDN references for script, emoji, or KaTeX fonts', async () => {
    const { html, css } = await renderMarp(MATH_DOC);
    expect(html).not.toContain('cdn.jsdelivr.net');
    expect(css).not.toContain('cdn.jsdelivr.net');
    // No external Twemoji images either (emoji render as native Unicode).
    expect(html).not.toContain('twemoji');
  });

  it('appends the locally-bundled KaTeX CSS when slides contain math', async () => {
    const { css } = await renderMarp(MATH_DOC);
    expect(css).toContain('INLINED_KATEX_FONTS_SENTINEL');
  });

  it('does not ship the KaTeX font payload when there is no math', async () => {
    const { css } = await renderMarp(PLAIN_DOC);
    expect(css).not.toContain('INLINED_KATEX_FONTS_SENTINEL');
  });
});
