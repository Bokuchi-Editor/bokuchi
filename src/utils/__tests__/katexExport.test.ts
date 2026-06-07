import { describe, it, expect } from 'vitest';
import { inlineKatexFonts } from '../katexExportCss';
import { buildExportHTML } from '../exportStyles';

/**
 * Regression for the KaTeX HTML-export bug: exported documents shipped with NO
 * KaTeX stylesheet, so the rendered `.katex-html` collapsed into run-together
 * text while the browser natively rendered the (normally hidden) `.katex-mathml`,
 * producing a broken duplicate of every equation. The fix injects KaTeX's CSS —
 * with woff2 fonts inlined as data URIs — into the export so it renders offline.
 *
 * The pure `inlineKatexFonts` transform is tested against a fixture that mirrors
 * the real katex.min.css `@font-face` shape. (Vitest can't load the Vite
 * `?raw`/`?inline` asset imports the real KATEX_EXPORT_CSS uses; the production
 * build does the inlining for real, and the `not.toMatch(/url\(fonts\//)`
 * assertion below guards the regex that does it.)
 */
// Two @font-face blocks copied from katex.min.css's structure, plus an unrelated
// rule that must pass through untouched.
const FIXTURE_CSS =
  '@font-face{font-display:block;font-family:KaTeX_Main;font-style:normal;font-weight:400;' +
  'src:url(fonts/KaTeX_Main-Regular.woff2) format("woff2"),url(fonts/KaTeX_Main-Regular.woff) format("woff"),url(fonts/KaTeX_Main-Regular.ttf) format("truetype")}' +
  '@font-face{font-display:block;font-family:KaTeX_Math;font-style:italic;font-weight:400;' +
  'src:url(fonts/KaTeX_Math-Italic.woff2) format("woff2"),url(fonts/KaTeX_Math-Italic.woff) format("woff"),url(fonts/KaTeX_Math-Italic.ttf) format("truetype")}' +
  '.katex .katex-mathml{position:absolute;clip:rect(1px,1px,1px,1px);padding:0;border:0;height:1px;width:1px;overflow:hidden}';

const fontMap = {
  'KaTeX_Main-Regular': 'data:font/woff2;base64,FAKE_MAIN',
  'KaTeX_Math-Italic': 'data:font/woff2;base64,FAKE_MATH',
};

describe('inlineKatexFonts', () => {
  const inlined = inlineKatexFonts(FIXTURE_CSS, fontMap);

  it('replaces every relative woff2 url with its data URI', () => {
    // The whole point: a standalone file has no sibling fonts/ directory, so any
    // surviving `url(fonts/...)` would fail to load and break the render.
    expect(inlined).not.toMatch(/url\(fonts\//);
    expect(inlined).toContain('url(data:font/woff2;base64,FAKE_MAIN) format("woff2")');
    expect(inlined).toContain('url(data:font/woff2;base64,FAKE_MATH) format("woff2")');
  });

  it('drops the woff/ttf fallbacks (woff2-only payload)', () => {
    expect(inlined).not.toContain('format("woff")');
    expect(inlined).not.toContain('format("truetype")');
  });

  it('leaves non-@font-face rules untouched (e.g. the MathML-hiding rule)', () => {
    // `.katex-mathml` must stay present (and hidden); if it renders, the export
    // shows a garbled second copy of each equation next to the real one.
    expect(inlined).toContain('.katex .katex-mathml{position:absolute');
  });

  it('keeps a font whose data URI is missing as a (visible) dangling url', () => {
    // Defensive: an unmapped font keeps its original src rather than silently
    // vanishing, so a KaTeX font-list change is caught by the build, not hidden.
    const partial = inlineKatexFonts(FIXTURE_CSS, { 'KaTeX_Main-Regular': 'data:font/woff2;base64,X' });
    expect(partial).toContain('url(fonts/KaTeX_Math-Italic.woff2)');
  });
});

describe('buildExportHTML KaTeX injection', () => {
  it('embeds the supplied KaTeX stylesheet only when math CSS is passed', () => {
    const katexCss = '.katex{font-size:1.21em}';

    const withMath = buildExportHTML('<p>x</p>', false, 'default', 'equal', katexCss);
    expect(withMath).toContain(katexCss);

    const withoutMath = buildExportHTML('<p>x</p>', false, 'default', 'equal');
    expect(withoutMath).not.toContain(katexCss);
  });
});
