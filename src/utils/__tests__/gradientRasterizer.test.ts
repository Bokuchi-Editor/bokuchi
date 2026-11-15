import { describe, it, expect } from 'vitest';
import { parseCssGradient, isTransparentColor } from '../gradientRasterizer';

describe('parseCssGradient', () => {
  it('parses "to right" as a horizontal line across the box', () => {
    const result = parseCssGradient('linear-gradient(to right, red, blue)', 100, 50);
    expect(result).toEqual({
      kind: 'linear',
      x0: 0,
      y0: 25,
      x1: 100,
      y1: 25,
      stops: [
        { color: 'red', position: 0 },
        { color: 'blue', position: 1 },
      ],
    });
  });

  it('parses an explicit angle in degrees', () => {
    // 90deg === "to right" per the CSS angle convention (0deg = up, clockwise).
    const a = parseCssGradient('linear-gradient(90deg, red, blue)', 100, 50);
    const b = parseCssGradient('linear-gradient(to right, red, blue)', 100, 50);
    expect(a?.kind).toBe('linear');
    expect(b?.kind).toBe('linear');
    if (a?.kind !== 'linear' || b?.kind !== 'linear') return;
    expect(a.x0).toBeCloseTo(b.x0);
    expect(a.y0).toBeCloseTo(b.y0);
    expect(a.x1).toBeCloseTo(b.x1);
    expect(a.y1).toBeCloseTo(b.y1);
    expect(a.stops).toEqual(b.stops);
  });

  it('defaults to "to bottom" (180deg) when no direction is given', () => {
    const result = parseCssGradient('linear-gradient(red, blue)', 100, 50);
    expect(result).toEqual({
      kind: 'linear',
      x0: 50,
      y0: 0,
      x1: 50,
      y1: 50,
      stops: [
        { color: 'red', position: 0 },
        { color: 'blue', position: 1 },
      ],
    });
  });

  it('resolves "to bottom right" via the opposite-corner formula', () => {
    const result = parseCssGradient('linear-gradient(to bottom right, red, blue)', 100, 100);
    expect(result?.kind).toBe('linear');
    if (result?.kind !== 'linear') return;
    // Square box: the diagonal line runs corner-to-corner.
    expect(result.x0).toBeCloseTo(0);
    expect(result.y0).toBeCloseTo(0);
    expect(result.x1).toBeCloseTo(100);
    expect(result.y1).toBeCloseTo(100);
  });

  it('distributes stops without an explicit position evenly', () => {
    const result = parseCssGradient('linear-gradient(to right, red, green, blue)', 100, 10);
    expect(result?.stops.map((s) => s.position)).toEqual([0, 0.5, 1]);
  });

  it('honors an explicit percentage stop position', () => {
    const result = parseCssGradient('linear-gradient(to right, red, blue 30%, green)', 100, 10);
    expect(result?.stops.map((s) => Math.round(s.position * 100) / 100)).toEqual([0, 0.3, 1]);
  });

  it('expands a double-position stop into two stops of the same color', () => {
    const result = parseCssGradient('linear-gradient(to right, red, yellow 20% 40%, blue)', 100, 10);
    expect(result?.stops).toHaveLength(4);
    expect(result?.stops[1]).toEqual({ color: 'yellow', position: 0.2 });
    expect(result?.stops[2]).toEqual({ color: 'yellow', position: 0.4 });
  });

  it('parses a centered circle radial gradient (farthest-corner default)', () => {
    const result = parseCssGradient('radial-gradient(circle, red, blue)', 100, 100);
    expect(result?.kind).toBe('radial');
    if (result?.kind !== 'radial') return;
    expect(result.cx).toBe(50);
    expect(result.cy).toBe(50);
    // farthest-corner distance from center in a 100x100 box: hypot(50, 50).
    expect(result.rx).toBeCloseTo(Math.hypot(50, 50));
    expect(result.ry).toBeCloseTo(Math.hypot(50, 50));
  });

  it('parses an ellipse radial gradient positioned "at"', () => {
    const result = parseCssGradient('radial-gradient(ellipse at 20% 30%, red, blue)', 200, 100);
    expect(result?.kind).toBe('radial');
    if (result?.kind !== 'radial') return;
    expect(result.cx).toBe(40);
    expect(result.cy).toBe(30);
  });

  it('returns null for repeating-linear-gradient (unsupported)', () => {
    expect(parseCssGradient('repeating-linear-gradient(red, blue)', 100, 50)).toBeNull();
  });

  it('returns null for conic-gradient (unsupported)', () => {
    expect(parseCssGradient('conic-gradient(red, blue)', 100, 50)).toBeNull();
  });

  it('returns null for an empty/zero-size box', () => {
    expect(parseCssGradient('linear-gradient(red, blue)', 0, 50)).toBeNull();
  });

  it('returns null for an unparseable stop position unit', () => {
    expect(parseCssGradient('linear-gradient(to right, red, blue 10em)', 100, 50)).toBeNull();
  });

  it('returns null for calc() in a stop position', () => {
    expect(parseCssGradient('linear-gradient(to right, red, blue calc(10% + 5px))', 100, 50)).toBeNull();
  });

  it('returns null for a plain color (not a gradient function)', () => {
    expect(parseCssGradient('rgb(255, 0, 0)', 100, 50)).toBeNull();
  });
});

describe('isTransparentColor', () => {
  it('treats the literal "transparent" keyword as transparent', () => {
    expect(isTransparentColor('transparent')).toBe(true);
  });

  it('treats an alpha-0 rgba() as transparent (the getComputedStyle shape for a `background:` shorthand reset)', () => {
    expect(isTransparentColor('rgba(0, 0, 0, 0)')).toBe(true);
  });

  it('treats an opaque rgb()/rgba() as not transparent', () => {
    expect(isTransparentColor('rgb(255, 255, 255)')).toBe(false);
    expect(isTransparentColor('rgba(0, 200, 255, 0.9)')).toBe(false);
  });

  it('treats modern space-separated rgb(r g b / a) syntax the same way', () => {
    expect(isTransparentColor('rgba(0 0 0 / 0)')).toBe(true);
    expect(isTransparentColor('rgb(0 0 0 / 1)')).toBe(false);
  });
});
