import { describe, it, expect, vi } from 'vitest';

// Regression test for the "Object is not a constructor" blank-preview bug.
//
// marp-core is CommonJS and exports BOTH `Marp` and `default` (the same class).
// Vite 8's dependency prebundle wraps it as `export default require_marp()`, so the
// dynamic-import namespace becomes { default: { Marp, default } } with NO top-level
// `Marp`. The previous resolver (`marpModule.default ?? marpModule.Marp`) then picked
// the exports *object* and `new` threw. Here we mock that exact namespace shape and
// assert renderMarp still resolves a real constructor and renders.

class FakeMarp {
  themeSet = { add: vi.fn(), get: () => undefined };
  render() {
    return { html: '<div class="marpit"><svg data-marpit-svg></svg></div>', css: '/* css */' };
  }
}

// Vite 8 shape: `default` is the CJS exports object (not a constructor) and there is
// no usable top-level `Marp`. (vitest requires every accessed named export to be
// declared on the mock, so `Marp` is declared as undefined — in a real ESM namespace
// the access simply yields undefined.)
vi.mock('@marp-team/marp-core', () => ({
  Marp: undefined,
  default: { Marp: FakeMarp, default: FakeMarp },
}));

vi.mock('../katexExportCss', () => ({ KATEX_EXPORT_CSS: '/*K*/' }));

import { renderMarp } from '../marpRenderer';

describe('renderMarp constructor resolution (bundler interop)', () => {
  it('resolves the Marp class when default is the CJS exports object (Vite 8 prebundle)', async () => {
    const { html, slideCount } = await renderMarp('---\nmarp: true\n---\n# Hi');
    expect(html).toContain('data-marpit-svg');
    expect(slideCount).toBeGreaterThan(0);
  });
});
