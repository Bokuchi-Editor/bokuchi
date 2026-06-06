/**
 * Count "words" in mixed Japanese / Latin text for the status bar.
 *
 * CJK scripts don't separate words with spaces, so a plain whitespace split
 * under-counts them badly. We therefore count each CJK character (Hiragana,
 * Katakana — full & half width, Kanji incl. extensions, CJK compatibility) as
 * one word, and count the remaining (Latin/Cyrillic/Hangul/etc.) text as
 * whitespace-separated tokens. Hangul is intentionally NOT treated per-char
 * because Korean separates words with spaces.
 */
const CJK_CHAR =
  /[぀-ゟ゠-ヿ㐀-䶿一-鿿豈-﫿ｦ-ﾟ]/g;

export function countWords(text: string): number {
  if (!text) return 0;
  const cjkMatches = text.match(CJK_CHAR);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;
  // Replace CJK with spaces so the leftover tokens are purely space-delimited.
  const nonCjkTokens = text.replace(CJK_CHAR, ' ').split(/\s+/).filter(Boolean);
  return cjkCount + nonCjkTokens.length;
}
