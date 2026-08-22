import { describe, it, expect } from 'vitest';
import {
  computeSlideLineRanges,
  scrollFractionToSlidePosition,
  slidePositionToScrollFraction,
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

  // Marp does not treat `---` inside a fenced code block as a slide break.
  // Counting it produced an extra phantom slide, shifting every later slide
  // index and drifting the editor<->preview scroll sync.
  it('does not split on --- inside a ``` fenced code block', () => {
    const content = [
      '# A',        // 0
      '```md',      // 1
      '---',        // 2 — literal text, not a ruler
      '```',        // 3
      '---',        // 4 — real break
      '# B',        // 5
    ].join('\n');
    const ranges = computeSlideLineRanges(content);
    expect(ranges.length).toBe(2);
    expect(ranges[0].startLine).toBe(0);
    expect(ranges[1].startLine).toBe(5);
  });

  it('does not split on --- inside a ~~~ fenced code block', () => {
    const content = [
      '# A',
      '~~~yaml',
      '---',
      'key: value',
      '---',
      '~~~',
      '---',
      '# B',
    ].join('\n');
    const ranges = computeSlideLineRanges(content);
    expect(ranges.length).toBe(2);
    expect(ranges[1].startLine).toBe(7);
  });

  it('treats everything after an unclosed fence as code (CommonMark: fence runs to EOF)', () => {
    const content = [
      '# A',
      '```',
      '---',
      '# looks like a slide but is code',
      '---',
    ].join('\n');
    const ranges = computeSlideLineRanges(content);
    expect(ranges).toEqual([{ startLine: 0, endLine: 4 }]);
  });

  it('requires the closing fence to match marker and length', () => {
    const content = [
      '# A',      // 0
      '````',     // 1 — 4-backtick fence
      '```',      // 2 — too short, does NOT close
      '---',      // 3 — still inside the fence
      '````',     // 4 — closes
      '---',      // 5 — real break
      '# B',      // 6
    ].join('\n');
    const ranges = computeSlideLineRanges(content);
    expect(ranges.length).toBe(2);
    expect(ranges[1].startLine).toBe(6);
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

  // Real computeSlideLineRanges output has a gap at each `---` separator line
  // (it belongs to no slide). A scroll line landing in that gap computes a raw
  // sub-fraction > 1 for the preceding slide; without the clamp the preview
  // overshoots past the slide. With the previous gap-less fixture the clamp
  // was never exercised (raw sub was already 0.5).
  it('clamps sub-fraction to 1 when the scroll line falls in a separator gap', () => {
    const gappedRanges = [
      { startLine: 0, endLine: 1 },
      { startLine: 3, endLine: 4 },
    ];
    // fraction 0.5 of 5 lines → line 2, the separator between the slides.
    // Raw sub for slide 0 is (2 - 0) / 1 = 2 → must clamp to exactly 1.
    const pos = scrollFractionToSlidePosition(0.5, 5, gappedRanges);
    expect(pos).toEqual({ slideIndex: 0, subFraction: 1 });
  });

  it('returns zero position for empty ranges', () => {
    const pos = scrollFractionToSlidePosition(0.5, 6, []);
    expect(pos).toEqual({ slideIndex: 0, subFraction: 0 });
  });
});

describe('slidePositionToScrollFraction', () => {
  const ranges = [
    { startLine: 0, endLine: 1 },
    { startLine: 2, endLine: 3 },
    { startLine: 4, endLine: 5 },
  ];
  const totalLines = 6;

  it('maps the first slide start to fraction 0', () => {
    expect(slidePositionToScrollFraction(0, 0, totalLines, ranges)).toBe(0);
  });

  it('maps the last slide end to fraction 1', () => {
    expect(slidePositionToScrollFraction(2, 1, totalLines, ranges)).toBe(1);
  });

  it('round-trips with scrollFractionToSlidePosition', () => {
    for (const fraction of [0, 0.2, 0.5, 0.8, 1]) {
      const pos = scrollFractionToSlidePosition(fraction, totalLines, ranges);
      const back = slidePositionToScrollFraction(pos.slideIndex, pos.subFraction, totalLines, ranges);
      expect(back).toBeCloseTo(fraction, 5);
    }
  });

  it('clamps out-of-range slide indices and sub-fractions', () => {
    expect(slidePositionToScrollFraction(99, 5, totalLines, ranges)).toBe(1);
    expect(slidePositionToScrollFraction(-1, -1, totalLines, ranges)).toBe(0);
  });

  it('returns 0 for empty ranges or single-line documents', () => {
    expect(slidePositionToScrollFraction(0, 0.5, 6, [])).toBe(0);
    expect(slidePositionToScrollFraction(0, 0.5, 1, ranges)).toBe(0);
  });
});
