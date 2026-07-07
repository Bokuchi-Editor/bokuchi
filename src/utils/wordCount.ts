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
// Hiragana, Katakana, CJK Ext A, CJK Unified Ideographs, CJK Compatibility
// Ideographs, halfwidth Katakana.
const CJK_CHAR =
  /[぀-ゟ゠-ヿ㐀-䶿一-鿿豈-﫿ｦ-ﾟ]/g;

// CJK punctuation / symbols are word separators, not words. Without this,
// 、。「」etc. survive the CJK replacement as leftover tokens and each counts
// as one extra "word". Covers: CJK Symbols and Punctuation (U+3000-303F:
// 、。「」etc.), the Katakana middle dot ・ (U+30FB — but NOT the prolonged
// sound mark ー, which is part of a word), the symbol sub-ranges of Halfwidth
// and Fullwidth Forms (！-／, ：-＠, ［-｀, ｛-･ incl. halfwidth ｡｢｣､･), and
// fullwidth signs (￠-￦). Fullwidth alphanumerics (ＡＢＣ１２３) stay tokens.
const CJK_PUNCT =
  /[\u3000-〿・！-／：-＠［-｀｛-･￠-￦]/g;

export function countWords(text: string): number {
  if (!text) return 0;
  // Neutralize CJK punctuation first so it neither matches CJK_CHAR nor
  // survives as a standalone token.
  const cleaned = text.replace(CJK_PUNCT, ' ');
  const cjkMatches = cleaned.match(CJK_CHAR);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;
  // Replace CJK with spaces so the leftover tokens are purely space-delimited.
  const nonCjkTokens = cleaned.replace(CJK_CHAR, ' ').split(/\s+/).filter(Boolean);
  return cjkCount + nonCjkTokens.length;
}
