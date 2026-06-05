import { describe, it, expect, vi, beforeEach } from 'vitest';

// Records every css string passed to themeSet.add across all MockMarp instances
// so tests can assert which custom themes were registered before render.
const themeAddSpy = vi.fn();

// Mock @marp-team/marp-core
vi.mock('@marp-team/marp-core', () => ({
  default: class MockMarp {
    themeSet = {
      add: (css: string) => {
        // Mirror marp-core: reject CSS without an @theme header.
        if (!/@theme\s+\S+/.test(css)) throw new Error('Marpit theme CSS requires @theme meta.');
        themeAddSpy(css);
      },
    };
    render() {
      return {
        html: '<div class="marpit"><svg data-marpit-svg="" viewBox="0 0 1280 720"><foreignObject><section>Slide 1</section></foreignObject></svg><svg data-marpit-svg="" viewBox="0 0 1280 720"><foreignObject><section>Slide 2</section></foreignObject></svg></div>',
        css: '.marpit { color: red; }',
      };
    }
  },
}));

import {
  contentIsMarp,
  renderMarp,
  countSlides,
  buildSlideDocument,
  buildAllSlidesDocument,
  buildThumbnailDocument,
  buildContinuousStyleContent,
  LINK_INTERCEPTOR_SCRIPT,
} from '../marpRenderer';

describe('contentIsMarp', () => {
  it('returns true for markdown with marp: true in frontmatter', () => {
    const content = `---
marp: true
theme: default
---

# Slide 1`;
    expect(contentIsMarp(content)).toBe(true);
  });

  it('returns true when marp: true appears among other frontmatter keys', () => {
    const content = `---
title: My Presentation
marp: true
paginate: true
---

# Hello`;
    expect(contentIsMarp(content)).toBe(true);
  });

  it('returns false for regular markdown without frontmatter', () => {
    expect(contentIsMarp('# Hello World\n\nSome content')).toBe(false);
  });

  it('returns false for frontmatter without marp: true', () => {
    const content = `---
title: Just a doc
---

# Not a presentation`;
    expect(contentIsMarp(content)).toBe(false);
  });

  it('returns false for marp: false in frontmatter', () => {
    const content = `---
marp: false
---

# Not Marp`;
    expect(contentIsMarp(content)).toBe(false);
  });

  it('returns false for marp: true outside of frontmatter', () => {
    const content = `# Title

marp: true

Some content`;
    expect(contentIsMarp(content)).toBe(false);
  });

  it('returns false for empty content', () => {
    expect(contentIsMarp('')).toBe(false);
  });

  // T-MR-02: frontmatter whitespace variations
  it('T-MR-02: detects marp: true with extra spaces', () => {
    const content = `---
marp:  true
---

# Slide`;
    expect(contentIsMarp(content)).toBe(true);
  });

  // T-MR-03: marp:true without space is still accepted (regex uses \s*)
  it('T-MR-03: accepts marp:true without space after colon', () => {
    const content = `---
marp:true
---

# Slide`;
    // The regex MARP_FRONTMATTER_RE uses \s* so space is optional
    expect(contentIsMarp(content)).toBe(true);
  });

  // T-MR-04: regression — a markdown article that demonstrates Marp syntax
  // inside a fenced code block must NOT be detected as Marp. Front-matter
  // only counts when it sits at the very start of the document.
  it('T-MR-04: returns false for marp: true inside a fenced code block', () => {
    const content = `# Article

Some intro text. The following is an *example* of Marp syntax:

\`\`\`markdown
---
marp: true
theme: default
---

# Title slide
\`\`\`

End of article.`;
    expect(contentIsMarp(content)).toBe(false);
  });

  // T-MR-05: a document whose body contains thematic breaks (\`---\`) and the
  // literal text \`marp: true\` must not be detected just because both tokens
  // happen to appear on their own lines.
  it('T-MR-05: returns false when --- and marp: true appear only in the body', () => {
    const content = `# Article

Intro.

---

marp: true is how you enable Marp.

---

End.`;
    expect(contentIsMarp(content)).toBe(false);
  });

  // T-MR-06: a real front-matter without marp: true must still return false
  // even if a fenced code block later in the document contains a marp: true
  // example.
  it('T-MR-06: ignores marp: true in code block when front-matter lacks it', () => {
    const content = `---
title: Marp Tutorial
author: Someone
---

# How to write Marp

\`\`\`markdown
---
marp: true
---
\`\`\``;
    expect(contentIsMarp(content)).toBe(false);
  });
});

describe('renderMarp', () => {
  beforeEach(() => themeAddSpy.mockReset());

  it('returns html, css, and slideCount from marp-core render', async () => {
    const result = await renderMarp('---\nmarp: true\n---\n# Slide');
    expect(result.html).toContain('marpit');
    expect(result.css).toContain('.marpit');
    expect(result.slideCount).toBe(2);
  });

  it('does not register any theme when no custom themes are passed', async () => {
    await renderMarp('---\nmarp: true\n---\n# Slide');
    expect(themeAddSpy).not.toHaveBeenCalled();
  });

  it('registers each custom theme CSS before rendering', async () => {
    await renderMarp('---\nmarp: true\n---\n# Slide', [
      '/* @theme a */ section{}',
      '/* @theme b */ section{}',
    ]);
    expect(themeAddSpy).toHaveBeenCalledTimes(2);
  });

  it('skips invalid theme CSS (no @theme) without throwing', async () => {
    const result = await renderMarp('---\nmarp: true\n---\n# Slide', [
      'section{}',                 // invalid — no @theme header
      '/* @theme ok */ section{}', // valid
    ]);
    expect(themeAddSpy).toHaveBeenCalledTimes(1);
    expect(themeAddSpy).toHaveBeenCalledWith('/* @theme ok */ section{}');
    expect(result.slideCount).toBe(2);
  });
});

describe('countSlides', () => {
  it('counts svg elements with data-marpit-svg attribute', () => {
    const html = '<div class="marpit"><svg data-marpit-svg="">a</svg><svg data-marpit-svg="">b</svg><svg data-marpit-svg="">c</svg></div>';
    expect(countSlides(html)).toBe(3);
  });

  it('returns 1 for html with no marpit svgs', () => {
    expect(countSlides('<div>no slides</div>')).toBe(1);
  });
});

describe('buildSlideDocument', () => {
  it('builds a complete HTML document with showSlide for the given index', () => {
    const doc = buildSlideDocument('<div class="marpit">slides</div>', '.marpit{}', 2);
    expect(doc).toContain('<!DOCTYPE html>');
    expect(doc).toContain('.marpit{}');
    expect(doc).toContain('showSlide(2)');
    expect(doc).toContain('slides');
  });

  it('uses 0-based slide index in showSlide call', () => {
    const doc = buildSlideDocument('html', 'css', 0);
    expect(doc).toContain('showSlide(0)');
  });

  // T-MR-01: large index still generates valid document
  it('T-MR-01: generates valid HTML even when index exceeds slide count', () => {
    const doc = buildSlideDocument('<div class="marpit">slides</div>', '.marpit{}', 999);
    expect(doc).toContain('<!DOCTYPE html>');
    expect(doc).toContain('showSlide(999)');
  });
});

describe('buildAllSlidesDocument', () => {
  it('builds a complete HTML document showing all slides', () => {
    const doc = buildAllSlidesDocument('<div class="marpit">all slides</div>', '.marpit{}');
    expect(doc).toContain('<!DOCTYPE html>');
    expect(doc).toContain('.marpit{}');
    expect(doc).toContain('all slides');
    expect(doc).toContain('overflow-y: auto');
  });

  it('does not contain nth-child visibility rules', () => {
    const doc = buildAllSlidesDocument('html', 'css');
    expect(doc).not.toContain('nth-child');
    expect(doc).not.toContain('display: none');
  });
});

// buildContinuousStyleContent is the single source of truth for the continuous-
// mode stylesheet text. MarpPreview patches the iframe's <style> in place when
// the user's Marp CSS changes (theme switch, etc.), so this helper must always
// produce the same content that buildAllSlidesDocument bakes into srcDoc on
// initial load — otherwise an imperative CSS swap would diverge from the
// initial render and break layout.
describe('buildContinuousStyleContent', () => {
  it('embeds the provided marp css ahead of the wrapper styles', () => {
    const result = buildContinuousStyleContent('.marpit { color: red; }');
    expect(result).toContain('.marpit { color: red; }');
    // Wrapper styles required for the scrollable continuous layout
    expect(result).toContain('overflow-y: auto');
    expect(result).toContain('div.marpit > svg[data-marpit-svg]');
    // Order matters: caller-supplied CSS must come first so wrapper rules can
    // override it where they intentionally do.
    const marpIdx = result.indexOf('.marpit { color: red; }');
    const wrapperIdx = result.indexOf('overflow-y: auto');
    expect(marpIdx).toBeLessThan(wrapperIdx);
  });

  it('handles empty marp css without injecting stray characters', () => {
    const result = buildContinuousStyleContent('');
    expect(result).toContain('overflow-y: auto');
    expect(result).not.toContain('undefined');
  });

  it('stays consistent with buildAllSlidesDocument output', () => {
    // Regression guard for the refactor: the document builder must embed
    // exactly what the standalone helper returns. If these diverge, an
    // imperative <style> patch in MarpPreview would no longer match what the
    // iframe was first loaded with.
    const css = '.theme { background: #fff; }';
    const styleContent = buildContinuousStyleContent(css);
    const doc = buildAllSlidesDocument('<div class="marpit">x</div>', css);
    expect(doc).toContain(styleContent);
  });
});

// T-MR-LINK: Link interception script must be embedded in every iframe srcdoc
// so that anchor clicks inside sandboxed Marp iframes are forwarded to the
// host instead of navigating the iframe to the linked website. This is a
// hard security requirement (see: open-link bug fix).
describe('link interceptor injection', () => {
  it('LINK_INTERCEPTOR_SCRIPT posts http(s)/mailto URLs to parent and drops other schemes', () => {
    expect(LINK_INTERCEPTOR_SCRIPT).toContain("postMessage");
    expect(LINK_INTERCEPTOR_SCRIPT).toContain("openExternalUrl");
    expect(LINK_INTERCEPTOR_SCRIPT).toContain("(https?:|mailto:)");
    expect(LINK_INTERCEPTOR_SCRIPT).toContain("preventDefault");
    expect(LINK_INTERCEPTOR_SCRIPT).toContain("stopPropagation");
    // Capture phase listener
    expect(LINK_INTERCEPTOR_SCRIPT).toMatch(/addEventListener\([^)]*'click'[^)]*true\s*\)/);
  });

  it('buildSlideDocument injects link interceptor', () => {
    const doc = buildSlideDocument('<div class="marpit">x</div>', 'css', 0);
    expect(doc).toContain(LINK_INTERCEPTOR_SCRIPT);
  });

  it('buildAllSlidesDocument injects link interceptor', () => {
    const doc = buildAllSlidesDocument('<div class="marpit">x</div>', 'css');
    expect(doc).toContain(LINK_INTERCEPTOR_SCRIPT);
  });

  it('buildThumbnailDocument injects link interceptor', () => {
    const doc = buildThumbnailDocument('<div class="marpit">x</div>', 'css', 0);
    expect(doc).toContain(LINK_INTERCEPTOR_SCRIPT);
  });

  // <base target="_blank"> was tried as belt-and-braces but caused Marp SVG
  // <use href="#defs"> to fail to resolve in some webview engines, blanking
  // the slide. The JS interceptor's preventDefault() makes the base element
  // unnecessary, so it must remain absent.
  it('does not include <base target="_blank"> (regression: blanks SVG slides)', () => {
    expect(buildSlideDocument('html', 'css', 0)).not.toContain('<base');
    expect(buildAllSlidesDocument('html', 'css')).not.toContain('<base');
    expect(buildThumbnailDocument('html', 'css', 0)).not.toContain('<base');
  });
});
