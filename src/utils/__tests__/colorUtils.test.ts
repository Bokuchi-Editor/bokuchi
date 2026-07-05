import { describe, it, expect } from 'vitest';
import {
  normalizeHex,
  hexToRgb,
  hexToRgba,
  blendHex,
  relativeLuminance,
  contrastRatio,
  CONTRAST_WARNING_THRESHOLD,
} from '../colorUtils';

describe('normalizeHex', () => {
  // T-CU-01: canonical 6-digit input passes through lowercased
  it('T-CU-01: normalizes 6-digit hex to lowercase with #', () => {
    expect(normalizeHex('#AABBCC')).toBe('#aabbcc');
    expect(normalizeHex('#aabbcc')).toBe('#aabbcc');
  });

  // T-CU-02: '#' is optional
  it('T-CU-02: accepts hex without leading #', () => {
    expect(normalizeHex('aabbcc')).toBe('#aabbcc');
    expect(normalizeHex('1976D2')).toBe('#1976d2');
  });

  // T-CU-03: 3-digit shorthand expands
  it('T-CU-03: expands 3-digit shorthand', () => {
    expect(normalizeHex('#abc')).toBe('#aabbcc');
    expect(normalizeHex('F0f')).toBe('#ff00ff');
  });

  // T-CU-04: surrounding whitespace is tolerated
  it('T-CU-04: trims whitespace', () => {
    expect(normalizeHex('  #aabbcc  ')).toBe('#aabbcc');
  });

  // T-CU-05: invalid inputs return null
  it('T-CU-05: returns null for invalid input', () => {
    expect(normalizeHex('')).toBeNull();
    expect(normalizeHex('#ab')).toBeNull();
    expect(normalizeHex('#abcd')).toBeNull();
    expect(normalizeHex('#gggggg')).toBeNull();
    expect(normalizeHex('red')).toBeNull();
    expect(normalizeHex('#aabbccdd')).toBeNull();
  });
});

describe('hexToRgb / hexToRgba', () => {
  // T-CU-06: parses channels
  it('T-CU-06: parses hex into RGB channels', () => {
    expect(hexToRgb('#ff8000')).toEqual({ r: 255, g: 128, b: 0 });
    expect(hexToRgb('invalid')).toBeNull();
  });

  // T-CU-07: builds rgba string
  it('T-CU-07: builds rgba() string with alpha', () => {
    expect(hexToRgba('#000000', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
    // Invalid input falls back to the raw value instead of throwing
    expect(hexToRgba('nope', 0.5)).toBe('nope');
  });
});

describe('blendHex', () => {
  // T-CU-08: endpoint ratios return the endpoints
  it('T-CU-08: ratio 0 returns first color, 1 returns second', () => {
    expect(blendHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(blendHex('#000000', '#ffffff', 1)).toBe('#ffffff');
  });

  // T-CU-09: midpoint blends channels
  it('T-CU-09: blends toward the second color', () => {
    expect(blendHex('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  // T-CU-10: ratio is clamped
  it('T-CU-10: clamps out-of-range ratios', () => {
    expect(blendHex('#000000', '#ffffff', -1)).toBe('#000000');
    expect(blendHex('#000000', '#ffffff', 2)).toBe('#ffffff');
  });
});

describe('contrastRatio', () => {
  // T-CU-11: black on white is the maximum 21:1
  it('T-CU-11: black/white contrast is 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  // T-CU-12: identical colors are 1:1
  it('T-CU-12: same color contrast is 1', () => {
    expect(contrastRatio('#808080', '#808080')).toBeCloseTo(1, 5);
  });

  // T-CU-13: symmetric in argument order
  it('T-CU-13: is order-independent', () => {
    expect(contrastRatio('#123456', '#fedcba')).toBeCloseTo(
      contrastRatio('#fedcba', '#123456'),
      10,
    );
  });

  // T-CU-14: preset themes never trip the warning threshold
  it('T-CU-14: default theme text/background is far above the warning threshold', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeGreaterThan(CONTRAST_WARNING_THRESHOLD);
    // Dark preset: white-ish text on #121212
    expect(contrastRatio('#ffffff', '#121212')).toBeGreaterThan(CONTRAST_WARNING_THRESHOLD);
  });

  // T-CU-15: near-identical colors trip the threshold
  it('T-CU-15: low-contrast pair falls below the warning threshold', () => {
    expect(contrastRatio('#888888', '#999999')).toBeLessThan(CONTRAST_WARNING_THRESHOLD);
  });
});

describe('relativeLuminance', () => {
  // T-CU-16: known endpoints
  it('T-CU-16: white is 1, black is 0', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
  });
});
