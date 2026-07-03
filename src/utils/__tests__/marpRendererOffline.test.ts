import { describe, it, expect, vi } from 'vitest';

// The real inlined KaTeX CSS relies on Vite's `?inline` font imports, which the
// production build embeds as data: URLs (the export feature already depends on
// this). vitest doesn't reproduce that transform, so mock it with a sentinel and
// assert the *wiring* — that renderMarp appends it only when math is present.
vi.mock('../katexExportCss', () => ({
  KATEX_EXPORT_CSS: '/* INLINED_KATEX_FONTS_SENTINEL */',
}));

// Same for the gaia webfonts (Lato / Roboto Mono data URIs).
vi.mock('../gaiaThemeFonts', () => ({
  GAIA_FONTS_CSS: '/* INLINED_GAIA_FONTS_SENTINEL */',
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

const GAIA_DOC = ['---', 'marp: true', 'theme: gaia', '---', '', '# Gaia slide'].join('\n');

// A user theme extending gaia via Marpit's theme-name import — must inherit
// the stripped (offline) copy, and the name-based @import itself must survive
// the external-import strip.
const EXTENDS_GAIA_THEME = '/* @theme extends-gaia */\n@import "gaia";\nsection { color: red; }';

describe('renderMarp gaia theme offline (no webfont CDN)', () => {
  it('strips the fonts.bunny.net @import from the built-in gaia theme', async () => {
    const { css } = await renderMarp(GAIA_DOC);
    expect(css).not.toContain('fonts.bunny.net');
    expect(css).not.toMatch(/@import\s+(?:url\()?["']https?:/);
    // The face declarations themselves must survive — gaia still asks for Lato.
    expect(css).toMatch(/font-family:[^;{}]*Lato/);
  });

  it('appends the locally-bundled Lato / Roboto Mono faces for gaia decks', async () => {
    const { css } = await renderMarp(GAIA_DOC);
    expect(css).toContain('INLINED_GAIA_FONTS_SENTINEL');
  });

  it('covers custom themes that extend gaia by name', async () => {
    const { css } = await renderMarp(
      ['---', 'marp: true', 'theme: extends-gaia', '---', '', '# Hi'].join('\n'),
      [EXTENDS_GAIA_THEME],
    );
    // Inheritance intact (gaia's styles resolved through the name import)…
    expect(css).toMatch(/font-family:[^;{}]*Lato/);
    expect(css).toContain('color:red');
    // …but fully offline, with the bundled faces appended.
    expect(css).not.toContain('fonts.bunny.net');
    expect(css).toContain('INLINED_GAIA_FONTS_SENTINEL');
  });

  it('does not ship the gaia font payload for other themes', async () => {
    const { css } = await renderMarp(PLAIN_DOC);
    expect(css).not.toContain('INLINED_GAIA_FONTS_SENTINEL');
  });
});
