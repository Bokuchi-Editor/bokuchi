import { describe, it, expect } from 'vitest';
import { buildGaiaFontFaceCss, type GaiaFontFace } from '../gaiaThemeFonts';

/**
 * The pure builder is tested against fake faces — vitest doesn't reproduce
 * Vite's `?inline` woff2 transform, so the real GAIA_FONTS_CSS (with actual
 * data URIs) only exists in the production build. What must hold for the
 * offline gaia render to work is the @font-face shape: family/weight/range
 * verbatim, a single woff2 data-URI src, and `font-style:normal` (the CDN
 * served no italics — italic stays synthetic-oblique, as it was online).
 */
const FAKE_FACES: GaiaFontFace[] = [
  {
    family: 'Lato',
    weight: 900,
    unicodeRange: 'U+0000-00FF,U+2122',
    dataUri: 'data:font/woff2;base64,FAKE_LATO_900',
  },
  {
    family: 'Roboto Mono',
    weight: 400,
    unicodeRange: 'U+0370-0377',
    dataUri: 'data:font/woff2;base64,FAKE_RM_400',
  },
];

describe('buildGaiaFontFaceCss', () => {
  const css = buildGaiaFontFaceCss(FAKE_FACES);

  it('emits one @font-face per face', () => {
    expect(css.match(/@font-face/g)).toHaveLength(2);
  });

  it('declares family, weight, style, and unicode-range for each face', () => {
    expect(css).toContain(
      "@font-face{font-family:'Lato';font-style:normal;font-weight:900;" +
        "src:url(data:font/woff2;base64,FAKE_LATO_900) format('woff2');" +
        'unicode-range:U+0000-00FF,U+2122}',
    );
    expect(css).toContain(
      "@font-face{font-family:'Roboto Mono';font-style:normal;font-weight:400;" +
        "src:url(data:font/woff2;base64,FAKE_RM_400) format('woff2');" +
        'unicode-range:U+0370-0377}',
    );
  });

  it('references no remote URL', () => {
    expect(css).not.toMatch(/url\(\s*["']?https?:/);
  });
});
