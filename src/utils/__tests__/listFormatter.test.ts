import { describe, it, expect } from 'vitest';
import {
  parseListItem,
  isListItem,
  isListItemEmpty,
  buildContinuationPrefix,
} from '../listFormatter';

describe('listFormatter', () => {
  describe('parseListItem', () => {
    it('T-LF-01: parses a dash bullet', () => {
      const info = parseListItem('- hello');
      expect(info).toMatchObject({ ordered: false, bullet: '-', content: 'hello', checkbox: false });
    });

    it('T-LF-02: parses * and + bullets', () => {
      expect(parseListItem('* a')?.bullet).toBe('*');
      expect(parseListItem('+ a')?.bullet).toBe('+');
    });

    it('T-LF-03: preserves leading indentation', () => {
      const info = parseListItem('    - nested');
      expect(info?.indent).toBe('    ');
      expect(info?.content).toBe('nested');
    });

    it('T-LF-04: parses an ordered item with . delimiter', () => {
      const info = parseListItem('3. third');
      expect(info).toMatchObject({ ordered: true, orderedNumber: 3, orderedDelim: '.', content: 'third' });
    });

    it('T-LF-05: parses an ordered item with ) delimiter', () => {
      expect(parseListItem('10) x')).toMatchObject({ ordered: true, orderedNumber: 10, orderedDelim: ')' });
    });

    it('T-LF-06: parses an unchecked task item', () => {
      const info = parseListItem('- [ ] todo');
      expect(info).toMatchObject({ checkbox: true, checkboxChecked: false, content: 'todo' });
    });

    it('T-LF-07: parses a checked task item (x and X)', () => {
      expect(parseListItem('- [x] done')?.checkboxChecked).toBe(true);
      expect(parseListItem('- [X] done')?.checkboxChecked).toBe(true);
    });

    it('T-LF-08: parses an ordered task item', () => {
      expect(parseListItem('1. [ ] step')).toMatchObject({ ordered: true, checkbox: true, content: 'step' });
    });

    it('T-LF-09: returns null for non-list lines', () => {
      expect(parseListItem('plain text')).toBeNull();
      expect(parseListItem('')).toBeNull();
      expect(parseListItem('#- not a list')).toBeNull();
      expect(parseListItem('-no space')).toBeNull();
    });

    it('T-LF-10: a bare marker parses as an empty item', () => {
      expect(parseListItem('- ')).toMatchObject({ content: '' });
      expect(parseListItem('1. ')).toMatchObject({ content: '' });
      expect(parseListItem('- [ ] ')).toMatchObject({ checkbox: true, content: '' });
    });
  });

  describe('isListItem', () => {
    it('T-LF-11: mirrors parseListItem null-ness', () => {
      expect(isListItem('- a')).toBe(true);
      expect(isListItem('nope')).toBe(false);
    });
  });

  describe('isListItemEmpty', () => {
    it('T-LF-12: true when content is blank', () => {
      expect(isListItemEmpty(parseListItem('- ')!)).toBe(true);
      expect(isListItemEmpty(parseListItem('- [ ] ')!)).toBe(true);
    });

    it('T-LF-13: false when content is present', () => {
      expect(isListItemEmpty(parseListItem('- a')!)).toBe(false);
    });
  });

  describe('buildContinuationPrefix', () => {
    it('T-LF-14: repeats the bullet with a single space', () => {
      expect(buildContinuationPrefix(parseListItem('- a')!)).toBe('- ');
      expect(buildContinuationPrefix(parseListItem('* a')!)).toBe('* ');
    });

    it('T-LF-15: increments the ordered number', () => {
      expect(buildContinuationPrefix(parseListItem('3. a')!)).toBe('4. ');
      expect(buildContinuationPrefix(parseListItem('10) a')!)).toBe('11) ');
    });

    it('T-LF-16: preserves indentation', () => {
      expect(buildContinuationPrefix(parseListItem('    - a')!)).toBe('    - ');
    });

    it('T-LF-17: starts a fresh unchecked checkbox for task items', () => {
      expect(buildContinuationPrefix(parseListItem('- [x] a')!)).toBe('- [ ] ');
      expect(buildContinuationPrefix(parseListItem('2. [ ] a')!)).toBe('3. [ ] ');
    });
  });
});
