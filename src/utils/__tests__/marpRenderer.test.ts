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

import { contentIsMarp, renderMarp, countSlides, buildSlideDocument } from '../marpRenderer';

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
  it('builds a complete HTML document with nth-child CSS for the given slide index', () => {
    const doc = buildSlideDocument('<div class="marpit">slides</div>', '.marpit{}', 2);
    expect(doc).toContain('<!DOCTYPE html>');
    expect(doc).toContain('.marpit{}');
    expect(doc).toContain('nth-child(3)');
    expect(doc).toContain('slides');
  });

  it('uses 1-based index in nth-child selector', () => {
    const doc = buildSlideDocument('html', 'css', 0);
    expect(doc).toContain('nth-child(1)');
  });
});
