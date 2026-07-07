import { describe, it, expect } from 'vitest';
import { countWords } from '../wordCount';

describe('countWords', () => {
  it('T-WC-01: returns 0 for empty or whitespace-only text', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n\t ')).toBe(0);
  });

  it('T-WC-02: counts Latin words split by whitespace', () => {
    expect(countWords('hello')).toBe(1);
    expect(countWords('hello world')).toBe(2);
    expect(countWords('hello   world\n\nfoo')).toBe(3);
  });

  it('T-WC-03: treats hyphenated/punctuated tokens as single words', () => {
    expect(countWords('GPT-4 is cool')).toBe(3);
    expect(countWords('a, b, c')).toBe(3);
  });

  it('T-WC-04: counts each CJK character as one word', () => {
    expect(countWords('こんにちは')).toBe(5); // 5 hiragana
    expect(countWords('世界')).toBe(2); // 2 kanji
    expect(countWords('カタカナ')).toBe(4); // 4 katakana
  });

  it('T-WC-05: handles mixed Japanese and Latin text', () => {
    expect(countWords('Hello 世界')).toBe(3); // 1 + 2
    expect(countWords('Reactは便利')).toBe(4); // "React" + は + 便 + 利
  });

  it('T-WC-06: counts Korean by spaces (not per character)', () => {
    expect(countWords('안녕하세요 세계')).toBe(2);
  });

  it('T-WC-07: counts halfwidth katakana per character', () => {
    expect(countWords('ｶﾀｶﾅ')).toBe(4);
  });

  // Regression: CJK punctuation must be a separator, not a word — otherwise the
  // status bar word count is inflated by one per 。、「」 etc.
  it('T-WC-08: does not count CJK punctuation as words', () => {
    expect(countWords('これはペンです。')).toBe(7); // 7 chars + 。 excluded
    expect(countWords('「引用」')).toBe(2); // brackets excluded
    expect(countWords('こんにちは、世界！')).toBe(7); // 、and ！ excluded
    expect(countWords('カタカナ・リスト')).toBe(7); // middle dot excluded
  });

  it('T-WC-09: treats fullwidth/halfwidth symbol forms as separators', () => {
    expect(countWords('ＡＢＣ！ＤＥＦ')).toBe(2); // fullwidth ！ splits tokens
    expect(countWords('ﾃｽﾄ｡')).toBe(3); // halfwidth ideographic full stop excluded
  });
});
