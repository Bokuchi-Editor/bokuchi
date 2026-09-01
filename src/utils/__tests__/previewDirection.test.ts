import { describe, it, expect } from 'vitest';
import { resolvePreviewDirection } from '../previewDirection';

// #499: preview text direction resolution. The stored setting always wins;
// only the "never set" state derives a default from the UI language so Arabic
// users get RTL out of the box while everyone else keeps 'auto'.
describe('resolvePreviewDirection', () => {
  it('defaults to auto when unset and the UI language is LTR', () => {
    expect(resolvePreviewDirection(undefined, 'en')).toBe('auto');
    expect(resolvePreviewDirection(undefined, 'ja')).toBe('auto');
    expect(resolvePreviewDirection(undefined, undefined)).toBe('auto');
  });

  it('defaults to rtl when unset and the UI language is Arabic', () => {
    expect(resolvePreviewDirection(undefined, 'ar')).toBe('rtl');
  });

  it('matches RTL languages by base tag, case-insensitively', () => {
    expect(resolvePreviewDirection(undefined, 'ar-SA')).toBe('rtl');
    expect(resolvePreviewDirection(undefined, 'AR')).toBe('rtl');
  });

  it('lets an explicit choice win over the language default', () => {
    expect(resolvePreviewDirection('auto', 'ar')).toBe('auto');
    expect(resolvePreviewDirection('ltr', 'ar')).toBe('ltr');
    expect(resolvePreviewDirection('rtl', 'en')).toBe('rtl');
  });
});
