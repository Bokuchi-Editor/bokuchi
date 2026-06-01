import { describe, it, expect, vi } from 'vitest';
// IMPORTANT: This file intentionally does NOT mock 'katex'. It exercises the
// REAL KaTeX library so it can catch version regressions. (markdownRenderers.test.ts
// mocks katex and therefore cannot detect bugs inside KaTeX itself.)
import katex from 'katex';
import { marked } from 'marked';
import { processKatex } from '../markdownRenderers';

// processKatex lazy-imports the KaTeX stylesheet; stub it so the real pipeline
// (real KaTeX + real marked) can run under vitest without a CSS loader.
vi.mock('katex/dist/katex.min.css', () => ({}));

/**
 * Regression test for issue #354.
 * https://github.com/Bokuchi-Editor/bokuchi/issues/354
 *
 * KaTeX 0.17.0 introduced a regression: an accent command (\tilde, \hat, \bar,
 * \vec, ...) whose argument contains a command that has its own htmlBuilder
 * (e.g. \mathbf, \mathrm, \mathbb) crashes during rendering with:
 *   TypeError: Cannot read properties of undefined (reading 'htmlBuilder')
 *
 * Crucially this is a TypeError, NOT a KaTeX ParseError, so `throwOnError: false`
 * does NOT suppress it — the exception escapes renderToString and breaks the
 * whole preview render. KaTeX 0.16.x renders the same input correctly.
 *
 * These tests FAIL on katex 0.17.0 and PASS on katex 0.16.x. They are the guard
 * that lets us safely bump katex again once KaTeX ships a fix (see CLAUDE.md
 * "Temporary Overrides" and .github/dependabot.yml).
 */
describe('KaTeX accent regression (issue #354)', () => {
  const accentWithCommand = [
    '\\tilde{\\mathbf{x}}',
    '\\hat{\\mathbf{x}}',
    '\\bar{\\mathbf{x}}',
    '\\vec{\\mathbf{x}}',
  ];

  it.each(accentWithCommand)(
    'renders %s without throwing (even with throwOnError:false)',
    (tex) => {
      expect(() =>
        katex.renderToString(tex, { displayMode: false, throwOnError: false }),
      ).not.toThrow();

      const html = katex.renderToString(tex, { displayMode: false, throwOnError: false });
      expect(html).toContain('class="katex"');
    },
  );

  it('renders the exact expression from the bug report without throwing', () => {
    const tex =
      '\\tilde{\\mathbf{x}} = \\mathbf{x} - \\bar{x}\\mathbf{1}';
    expect(() =>
      katex.renderToString(tex, { displayMode: false, throwOnError: false }),
    ).not.toThrow();
    expect(
      katex.renderToString(tex, { displayMode: false, throwOnError: false }),
    ).toContain('class="katex"');
  });

  it('still renders simple accents and plain math (sanity)', () => {
    for (const tex of ['\\tilde{x}', '\\mathbf{x}', '\\frac{a}{b}', 'x^2']) {
      expect(() =>
        katex.renderToString(tex, { displayMode: false, throwOnError: false }),
      ).not.toThrow();
    }
  });
});

/**
 * Second regression for issue #354: blank preview when two accent expressions
 * appear in the same document.
 *
 * KaTeX renders an accent as a literal tilde character (\tilde ->
 * `<span class="mord">~</span>`, present in both HTML and MathML output). If that
 * rendered HTML reaches marked's input, GFM strikethrough (`~...~`) pairs the
 * tildes from two separate expressions and injects unbalanced <del> tags INTO
 * the rendered KaTeX markup, corrupting the DOM so the whole preview renders
 * blank.
 *
 * The fix: processKatex replaces each expression with an inert placeholder and
 * returns restore() to swap the rendered HTML back in AFTER marked, so marked
 * never sees KaTeX output. This test runs the REAL pipeline (real processKatex +
 * real marked + restore, exactly as Preview.tsx does) end to end.
 */
describe('KaTeX + marked pipeline regression (issue #354 blank preview)', () => {
  const runPipeline = async (markdown: string) => {
    const { markdown: placeholderMd, restore } = await processKatex(markdown);
    const rendered = await marked(placeholderMd, { breaks: true, gfm: true });
    return { placeholderMd, html: restore(rendered) };
  };

  it('does not let GFM strikethrough corrupt two accent expressions', async () => {
    // Exact shape from the bug report: two inline accent expressions on one line.
    const { placeholderMd, html } = await runPipeline(
      String.raw`$\tilde{\mathbf{x}}$, $\tilde{\mathbf{y}}$`,
    );

    // marked must only ever see inert placeholders, never KaTeX output.
    expect(placeholderMd).not.toContain('<span');
    expect(placeholderMd).not.toContain('~');
    // So GFM strikethrough produced no <del> tags inside the math markup.
    expect(html).not.toContain('<del>');
    // And both expressions actually rendered.
    expect(html).toContain('<span class="katex"');
    // Sanity: <span> tags stay balanced (corruption would unbalance them).
    const open = (html.match(/<span/g) || []).length;
    const close = (html.match(/<\/span>/g) || []).length;
    expect(open).toBe(close);
  });

  it('renders the full bug-report expression through the pipeline', async () => {
    const { html } = await runPipeline(
      String.raw`$\tilde{\mathbf{x}} = \mathbf{x} - \bar{x}\mathbf{1}$, $\tilde{\mathbf{y}} = \mathbf{y} - \bar{y}\mathbf{1}$`,
    );

    expect(html).not.toContain('<del>');
    expect(html).not.toContain('katex-error');
    expect(html).toContain('<span class="katex"');
  });
});

/**
 * Regression for issue #358: a `$|x - y|$` absolute value inside a Markdown table.
 *
 * Same root cause / same fix as #354: the math placeholder contains no `|`, so
 * marked's (block-level) table parser counts the correct number of cells instead
 * of splitting the row on the bars inside the formula. The user can therefore
 * write a plain single-bar absolute value (not the LaTeX norm `\|`) and keep both
 * the table layout AND the correct notation. Guards the placeholder pipeline so a
 * future refactor that inlines KaTeX HTML before marked can't silently break it.
 */
describe('KaTeX + marked pipeline regression (issue #358 |…| in tables)', () => {
  const runPipeline = async (markdown: string) => {
    const { markdown: placeholderMd, restore } = await processKatex(markdown);
    const rendered = await marked(placeholderMd, { breaks: true, gfm: true });
    return { placeholderMd, html: restore(rendered) };
  };

  it('keeps the table intact for an unescaped absolute value in a cell', async () => {
    const md = [
      '| Formula | Description |',
      '| --- | --- |',
      '| $d(x, y) = |x - y|$ | Distance of |',
      '',
    ].join('\n');

    const { placeholderMd, html } = await runPipeline(md);

    // The bars are hidden inside the placeholder, so marked sees no extra `|`.
    expect(placeholderMd).not.toContain('|x - y|');
    // The two-column table survives (would be >2 cells if the row split on `|`).
    expect(html).toContain('<table>');
    expect((html.match(/<th[ >]/g) || []).length).toBe(2);
    expect((html.match(/<td[ >]/g) || []).length).toBe(2);
    // Formula renders, and its inner content does not leak into a bare cell.
    expect(html).toContain('<span class="katex"');
    expect(html).not.toMatch(/<td[^>]*>\s*x - y\s*<\/td>/);
  });

  it('renders a single-bar absolute value (not the norm \\|)', async () => {
    const { html } = await runPipeline('| f | d |\n| --- | --- |\n| $|x - y|$ | abs |\n');

    // KaTeX encodes the original TeX in the MathML annotation; a true absolute
    // value keeps single bars there, whereas a norm would be `\|x - y\|`.
    expect(html).toContain('application/x-tex">|x - y|</annotation>');
    expect(html).not.toContain(String.raw`\|x - y\|`);
  });
});
