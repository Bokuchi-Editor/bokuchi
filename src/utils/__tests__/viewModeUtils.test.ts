import { describe, it, expect } from 'vitest';
import { rotateViewMode, getNextTabIndex, calculateScrollFraction } from '../viewModeUtils';

describe('rotateViewMode', () => {
  // T-VMU-01
  it('T-VMU-01: split → editor', () => {
    expect(rotateViewMode('split')).toBe('editor');
  });

  // T-VMU-02
  it('T-VMU-02: editor → preview', () => {
    expect(rotateViewMode('editor')).toBe('preview');
  });

  // T-VMU-03
  it('T-VMU-03: preview → split (wraps around)', () => {
    expect(rotateViewMode('preview')).toBe('split');
  });
});

describe('getNextTabIndex', () => {
  // T-VMU-04
  it('T-VMU-04: next wraps around', () => {
    expect(getNextTabIndex(2, 3, 'next')).toBe(0);
  });

  // T-VMU-05
  it('T-VMU-05: next increments normally', () => {
    expect(getNextTabIndex(0, 3, 'next')).toBe(1);
  });

  // T-VMU-06
  it('T-VMU-06: prev wraps around', () => {
    expect(getNextTabIndex(0, 3, 'prev')).toBe(2);
  });

  // T-VMU-07
  it('T-VMU-07: prev decrements normally', () => {
    expect(getNextTabIndex(2, 3, 'prev')).toBe(1);
  });

  // T-VMU-08
  it('T-VMU-08: returns -1 for empty tabs', () => {
    expect(getNextTabIndex(0, 0)).toBe(-1);
  });
});

describe('calculateScrollFraction', () => {
  // T-VMU-09
  it('T-VMU-09: returns 0 when scrollTop is 0', () => {
    expect(calculateScrollFraction(0, 1000, 500)).toBe(0);
  });

  // T-VMU-10
  it('T-VMU-10: returns 1 at bottom of scroll', () => {
    expect(calculateScrollFraction(500, 1000, 500)).toBe(1);
  });

  // T-VMU-11
  it('T-VMU-11: returns 0.5 at midpoint', () => {
    expect(calculateScrollFraction(250, 1000, 500)).toBe(0.5);
  });

  // T-VMU-12
  it('T-VMU-12: returns 0 when content fits (no scrollbar)', () => {
    expect(calculateScrollFraction(0, 500, 500)).toBe(0);
  });

  // T-VMU-13
  it('T-VMU-13: returns 0 when scrollHeight < clientHeight', () => {
    expect(calculateScrollFraction(0, 300, 500)).toBe(0);
  });
});
