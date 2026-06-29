/**
 * Work around CommonMark emphasis "flanking" rules that prevent `**bold**` /
 * `*italic*` from rendering when a delimiter touches CJK text (issue #400).
 *
 * marked is strict CommonMark: a closing `**` only closes emphasis if it is a
 * "right-flanking delimiter run". When the `**` is preceded by CJK punctuation
 * (e.g. `」` `）` `。`) AND followed by a CJK letter (kana/kanji), it is neither
 * preceded-by-non-punctuation nor followed-by-whitespace/punctuation, so it
 * fails the rule and is emitted as literal `**`. This is extremely common in
 * Japanese prose such as `**「アシスタント」**へと` and surprises users because
 * the editor (Monaco's lenient grammar) shows it bold while the preview does not.
 *
 * Fix: insert an invisible Word Joiner (U+2060) at every CJK↔delimiter boundary
 * before handing the text to marked. The delimiter then sees the Word Joiner —
 * which counts as a regular, non-punctuation, non-whitespace character — as its
 * neighbour, satisfying the flanking rule so emphasis opens/closes as intended.
 * The marker is stripped from marked's HTML output via {@link stripCjkEmphasisMarker},
 * so the rendered DOM stays clean. Code spans/blocks are protected so literal
 * `**` inside them (and highlight.js tokenization) are left untouched.
 *
 * Scope: `*` and `**` only. `_`/`__` (CommonMark forbids intraword underscore
 * emphasis) and `~~` are intentionally not handled here.
 */

/** Invisible Word Joiner (U+2060): a non-punctuation, non-whitespace character. */
const EMPHASIS_MARKER = '⁠';

// CJK letters and CJK/full-width punctuation. Covers CJK Symbols & Punctuation
// (、。「」『』…), Hiragana/Katakana, CJK Unified Ideographs (+ Ext A),
// Compatibility Ideographs/Forms, and Half/Full-width Forms (full-width punctuation).
const CJK_RANGES =
  '\\u2E80-\\u2EFF\\u3000-\\u303F\\u3040-\\u30FF\\u3100-\\u312F\\u3190-\\u31FF' +
  '\\u3300-\\u33FF\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF\\uFE30-\\uFE4F\\uFF00-\\uFFEF';

const CJK_BEFORE_DELIM = new RegExp(`([${CJK_RANGES}])(\\*+)`, 'g');
const DELIM_BEFORE_CJK = new RegExp(`(\\*+)([${CJK_RANGES}])`, 'g');

// Match fenced code blocks and inline code spans so we never insert markers
// inside them. Mirrors the CODE_BLOCK_RE idiom used by processKatex.
const CODE_BLOCK_RE = /```[\s\S]*?```|`[^`\n]+`/g;

/**
 * Insert invisible Word Joiners at CJK↔`*`/`**` boundaries so CommonMark
 * emphasis renders for CJK prose. Code spans/blocks are left untouched. Pair
 * with {@link stripCjkEmphasisMarker} on marked's output.
 */
export function fixCjkEmphasis(markdown: string): string {
  // Protect code spans/blocks from marker insertion.
  const codeBlocks: string[] = [];
  let result = markdown.replace(CODE_BLOCK_RE, (match) => {
    codeBlocks.push(match);
    return `%%CJKCODEBLOCK_${codeBlocks.length - 1}%%`;
  });

  result = result
    .replace(CJK_BEFORE_DELIM, `$1${EMPHASIS_MARKER}$2`)
    .replace(DELIM_BEFORE_CJK, `$1${EMPHASIS_MARKER}$2`);

  // Restore code spans/blocks.
  result = result.replace(/%%CJKCODEBLOCK_(\d+)%%/g, (_match, index: string) => codeBlocks[parseInt(index)]);

  return result;
}

/** Remove the Word Joiner markers inserted by {@link fixCjkEmphasis} from HTML. */
export function stripCjkEmphasisMarker(html: string): string {
  return html.includes(EMPHASIS_MARKER) ? html.split(EMPHASIS_MARKER).join('') : html;
}
