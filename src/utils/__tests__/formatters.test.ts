import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDate, formatFileSize } from '../formatters';

describe('formatDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-12T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // T-FMT-01: less than 1 hour ago
  it('T-FMT-01: returns "a few minutes ago" for recent timestamps', () => {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    expect(formatDate(thirtyMinutesAgo)).toBe('a few minutes ago');
  });

  // T-FMT-02: hours ago
  it('T-FMT-02: returns hours ago for timestamps within 24 hours', () => {
    const fiveHoursAgo = Date.now() - 5 * 60 * 60 * 1000;
    expect(formatDate(fiveHoursAgo)).toBe('5 hours ago');
  });

  // T-FMT-03: singular hour
  it('T-FMT-03: returns "1 hour ago" for singular', () => {
    const oneHourAgo = Date.now() - 1.5 * 60 * 60 * 1000;
    expect(formatDate(oneHourAgo)).toBe('1 hour ago');
  });

  // T-FMT-04: days ago
  it('T-FMT-04: returns days ago for timestamps within a week', () => {
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    expect(formatDate(twoDaysAgo)).toBe('2 days ago');
  });

  // T-FMT-05: singular day
  it('T-FMT-05: returns "1 day ago" for singular', () => {
    const oneDayAgo = Date.now() - 1.5 * 24 * 60 * 60 * 1000;
    expect(formatDate(oneDayAgo)).toBe('1 day ago');
  });

  // T-FMT-06: older than a week
  it('T-FMT-06: returns formatted date for timestamps older than a week', () => {
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const result = formatDate(twoWeeksAgo);
    // Should be a locale date string
    expect(result).toMatch(/\d/);
  });
});

describe('formatFileSize', () => {
  // T-FMT-07: undefined returns empty string
  it('T-FMT-07: returns empty string for undefined', () => {
    expect(formatFileSize(undefined)).toBe('');
  });

  // T-FMT-08: zero returns empty string
  it('T-FMT-08: returns empty string for 0', () => {
    expect(formatFileSize(0)).toBe('');
  });

  // T-FMT-09: bytes
  it('T-FMT-09: formats bytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });

  // T-FMT-10: kilobytes
  it('T-FMT-10: formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });

  // T-FMT-11: megabytes
  it('T-FMT-11: formats megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1.0 MB');
  });

  // T-FMT-12: large megabytes
  it('T-FMT-12: formats large files', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});
