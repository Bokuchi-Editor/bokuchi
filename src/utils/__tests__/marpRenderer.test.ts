import { describe, it, expect, vi } from 'vitest';

// Mock @marp-team/marp-core
vi.mock('@marp-team/marp-core', () => ({
  default: class MockMarp {
    render() {
      return {
        html: '<div class="marpit"><svg data-marpit-svg="" viewBox="0 0 1280 720"><foreignObject><section>Slide 1</section></foreignObject></svg><svg data-marpit-svg="" viewBox="0 0 1280 720"><foreignObject><section>Slide 2</section></foreignObject></svg></div>',
        css: '.marpit { color: red; }',
      };
    }
  },
}));

import { contentIsMarp, renderMarp, countSlides, buildSlideDocument, buildAllSlidesDocument } from '../marpRenderer';

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
});

describe('renderMarp', () => {
  it('returns html, css, and slideCount from marp-core render', async () => {
    const result = await renderMarp('---\nmarp: true\n---\n# Slide');
    expect(result.html).toContain('marpit');
    expect(result.css).toContain('.marpit');
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
