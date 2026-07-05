/**
 * Color math shared by the custom-theme feature: hex normalization for the
 * swatch editor, WCAG contrast for readability warnings, and simple blends
 * for deriving secondary CSS-variable colors from the 7 user-picked tokens.
 */

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Normalize a user-typed hex color to canonical `#rrggbb` (lowercase).
 * Accepts an optional leading `#`, 3- or 6-digit form, any letter case.
 * Returns null when the input is not a valid hex color.
 */
export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return (
      '#' +
      raw
        .split('')
        .map((c) => c + c)
        .join('')
        .toLowerCase()
    );
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return '#' + raw.toLowerCase();
  }
  return null;
}

/** Parse a normalized (or normalizable) hex color into RGB. Null when invalid. */
export function hexToRgb(hex: string): RgbColor | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function toHexPair(value: number): string {
  return Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, '0');
}

/** Build an `rgba(r, g, b, a)` string from a hex color. Falls back to the hex itself when invalid. */
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * Blend `hexA` toward `hexB` by `ratio` (0 = pure A, 1 = pure B).
 * Used to derive e.g. border-light (divider faded toward the background)
 * and hover shades without asking the user for extra colors.
 */
export function blendHex(hexA: string, hexB: string, ratio: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return hexA;
  const t = Math.min(1, Math.max(0, ratio));
  return (
    '#' +
    toHexPair(a.r + (b.r - a.r) * t) +
    toHexPair(a.g + (b.g - a.g) * t) +
    toHexPair(a.b + (b.b - a.b) * t)
  );
}

/** WCAG relative luminance of a hex color (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const channel = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** WCAG contrast ratio between two hex colors (1..21). */
export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Threshold below which text over a background is flagged as hard to read.
 * 3:1 is the WCAG minimum for large text — treated here as a soft warning,
 * never a hard block (the user may want an extreme theme on purpose).
 */
export const CONTRAST_WARNING_THRESHOLD = 3;
