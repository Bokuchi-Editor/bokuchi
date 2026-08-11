import { describe, it, expect } from 'vitest';
import {
  buildFontFamilyCss,
  DEFAULT_PREVIEW_FONT_STACK,
  EDITOR_FONT_FALLBACK_STACK,
} from '../fontFamily';

describe('buildFontFamilyCss', () => {
  it('returns the fallback stack unchanged for empty/undefined ("Default")', () => {
    expect(buildFontFamilyCss('', DEFAULT_PREVIEW_FONT_STACK)).toBe(DEFAULT_PREVIEW_FONT_STACK);
    expect(buildFontFamilyCss(undefined, DEFAULT_PREVIEW_FONT_STACK)).toBe(
      DEFAULT_PREVIEW_FONT_STACK,
    );
    expect(buildFontFamilyCss('   ', EDITOR_FONT_FALLBACK_STACK)).toBe(EDITOR_FONT_FALLBACK_STACK);
  });

  it('quotes the chosen family and appends the fallback stack', () => {
    expect(buildFontFamilyCss('Cairo', DEFAULT_PREVIEW_FONT_STACK)).toBe(
      `"Cairo", ${DEFAULT_PREVIEW_FONT_STACK}`,
    );
    // Names with spaces work because the whole name is quoted.
    expect(buildFontFamilyCss('Noto Naskh Arabic', EDITOR_FONT_FALLBACK_STACK)).toBe(
      `"Noto Naskh Arabic", ${EDITOR_FONT_FALLBACK_STACK}`,
    );
  });

  it('trims surrounding whitespace and escapes embedded quotes', () => {
    expect(buildFontFamilyCss('  Menlo  ', EDITOR_FONT_FALLBACK_STACK)).toBe(
      `"Menlo", ${EDITOR_FONT_FALLBACK_STACK}`,
    );
    // A hostile stored value cannot break out of the quoted family name.
    expect(buildFontFamilyCss('Evil", sans-serif; color: red', EDITOR_FONT_FALLBACK_STACK)).toBe(
      `"Evil\\", sans-serif; color: red", ${EDITOR_FONT_FALLBACK_STACK}`,
    );
  });
});
