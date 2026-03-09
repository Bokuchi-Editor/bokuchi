import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlatform, formatKeyboardShortcut } from '../platform';

function mockUserAgent(ua: string, platform = '') {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: ua,
    configurable: true,
  });
  Object.defineProperty(window.navigator, 'platform', {
    value: platform,
    configurable: true,
  });
}

describe('getPlatform', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // T-PF-01
  it('detects macOS platform', () => {
    mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    expect(getPlatform()).toBe('mac');
  });

  // T-PF-02
  it('detects Windows platform', () => {
    mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    expect(getPlatform()).toBe('windows');
  });

  // T-PF-03
  it('detects Linux platform', () => {
    mockUserAgent('Mozilla/5.0 (X11; Linux x86_64)');
    expect(getPlatform()).toBe('linux');
  });

  // T-PF-04
  it('returns unknown for unrecognized', () => {
    mockUserAgent('', '');
    expect(getPlatform()).toBe('unknown');
  });
});

describe('formatKeyboardShortcut', () => {
  // T-PF-05
  it('returns ⌘+S on mac', () => {
    mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    expect(formatKeyboardShortcut('S')).toBe('⌘+S');
  });

  // T-PF-06
  it('returns Ctrl+S on windows', () => {
    mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    expect(formatKeyboardShortcut('S')).toBe('Ctrl+S');
  });

  // T-PF-07
  it('returns ⌘+⇧+S with shift on mac', () => {
    mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    expect(formatKeyboardShortcut('S', true)).toBe('⌘+⇧+S');
  });
});
