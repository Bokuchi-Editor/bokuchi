import { describe, it, expect } from 'vitest';
import {
  computeSlideLineRanges,
  scrollFractionToSlidePosition,
} from '../marpSlideRanges';

describe('computeSlideLineRanges', () => {
  it('returns a single slide when content has no separators', () => {
    const content = 'line 1\nline 2\nline 3';
    const ranges = computeSlideLineRanges(content);
    expect(ranges).toEqual([{ startLine: 0, endLine: 2 }]);
  });

  it('treats frontmatter as part of the first slide', () => {
    const content = [
      '---',
      'marp: true',
      '---',
      '# Slide 1',
      '---',
      '# Slide 2',
    ].join('\n');

    const ranges = computeSlideLineRanges(content);
    expect(ranges.length).toBe(2);
    expect(ranges[0].startLine).toBe(3); // line after closing ---
    expect(ranges[1].startLine).toBe(5);
  });

  it('separates multiple slides', () => {
    const content = [
      '# A',
      '---',
      '# B',
      '---',
      '# C',
    ].join('\n');
    const ranges = computeSlideLineRanges(content);
    expect(ranges.length).toBe(3);
    expect(ranges[0].startLine).toBe(0);
    expect(ranges[1].startLine).toBe(2);
    expect(ranges[2].startLine).toBe(4);
  });
});

describe('scrollFractionToSlidePosition', () => {
  const ranges = [
    { startLine: 0, endLine: 1 },
    { startLine: 2, endLine: 3 },
    { startLine: 4, endLine: 5 },
  ];

  it('maps fraction 0 to the first slide', () => {
    expect(scrollFractionToSlidePosition(0, 6, ranges).slideIndex).toBe(0);
  });

  it('maps fraction 1 to the last slide', () => {
    const pos = scrollFractionToSlidePosition(1, 6, ranges);
    expect(pos.slideIndex).toBe(2);
  });

  it('clamps sub-fraction between 0 and 1', () => {
    const pos = scrollFractionToSlidePosition(0.5, 6, ranges);
    expect(pos.subFraction).toBeGreaterThanOrEqual(0);
    expect(pos.subFraction).toBeLessThanOrEqual(1);
  });

  it('returns zero position for empty ranges', () => {
    const pos = scrollFractionToSlidePosition(0.5, 6, []);
    expect(pos).toEqual({ slideIndex: 0, subFraction: 0 });
  });
});
