/**
 * Locate code regions (fenced/indented code blocks and inline code spans) in
 * markdown so pre-marked text transforms (KaTeX, CJK emphasis fix) never touch
 * code content.
 *
 * Detection is delegated to marked's own lexer, so "what counts as code" is by
 * definition what marked will render as code. The previous approach — a regex
 * that paired every ``` occurrence with the next one — silently mis-paired as
 * soon as a document contained an odd ``` (a bare ``` in prose, a fence shown
 * inside another fence, 4-backtick fences, `~~~`, …). From that point on the
 * fences and the prose were "protected" while the actual code was exposed, so
 * `$...$` spanning two shell snippets got rendered as KaTeX math and internal
 * `%%CODEBLOCK_n%%` placeholders leaked into the preview (issue #468).
 */

import { marked, type Token, type Tokens } from 'marked';

interface Range {
  start: number;
  end: number;
}

// Legacy pairing regex, kept ONLY as a fallback should the lexer ever throw.
const LEGACY_CODE_RE = /```[\s\S]*?```|`[^`\n]+`/g;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Collect the source ranges of all code/codespan tokens, in document order.
 *
 * Token raws are located with a cursor that only ever moves forward, so equal
 * snippets map to their own occurrence. Tokens nested in containers
 * (blockquote/list) have their `>` markers and indentation stripped from
 * `raw`; those are re-found with a prefix-tolerant match.
 */
function collectCodeRanges(src: string): Range[] {
  const ranges: Range[] = [];
  let cursor = 0;

  const locate = (raw: string) => {
    if (!raw) return;
    let start = src.indexOf(raw, cursor);
    let end: number;
    if (start !== -1) {
      end = start + raw.length;
    } else {
      const tolerant = new RegExp(raw.split('\n').map(escapeRegExp).join('\\n[ \\t>]*'));
      const m = tolerant.exec(src.slice(cursor));
      if (!m) return; // cannot map this token back — leave it unprotected
      start = cursor + m.index;
      end = start + m[0].length;
    }
    ranges.push({ start, end });
    cursor = end;
  };

  const visit = (tokens: Token[]) => {
    for (const token of tokens) {
      if (token.type === 'code' || token.type === 'codespan') {
        locate(token.raw);
        continue;
      }
      const t = token as Tokens.Generic;
      if (Array.isArray(t.tokens)) visit(t.tokens);
      if (Array.isArray(t.items)) visit(t.items as Token[]);
      if (Array.isArray(t.header)) {
        for (const cell of t.header as Tokens.TableCell[]) visit(cell.tokens ?? []);
      }
      if (Array.isArray(t.rows)) {
        for (const row of t.rows as Tokens.TableCell[][]) {
          for (const cell of row) visit(cell.tokens ?? []);
        }
      }
    }
  };

  visit(marked.lexer(src, { gfm: true, breaks: true }));
  return ranges;
}

function codeRanges(src: string): Range[] {
  try {
    return collectCodeRanges(src);
  } catch {
    // Fall back to the legacy pairing behavior rather than leaving code
    // unprotected (markers/math inside code would corrupt it).
    return [...src.matchAll(LEGACY_CODE_RE)].map((m) => ({
      start: m.index,
      end: m.index + m[0].length,
    }));
  }
}

export interface MaskedCodeRegions {
  /** Markdown with each code region replaced by an inert `%%CODEBLOCK_n%%` token. */
  masked: string;
  /** Swap the tokens back for the original code regions. */
  restore: (text: string) => string;
}

const CODE_TOKEN_RE = /%%CODEBLOCK_(\d+)%%/g;

/**
 * Replace every code region with an inert alphanumeric token (no `$`, backtick,
 * `*` or CJK characters, so neither the KaTeX regexes nor the CJK emphasis fix
 * can match inside it), and return a `restore()` that puts the code back.
 */
export function maskCodeRegions(markdown: string): MaskedCodeRegions {
  const snippets: string[] = [];
  let masked = '';
  let pos = 0;
  for (const range of codeRanges(markdown)) {
    masked += markdown.slice(pos, range.start) + `%%CODEBLOCK_${snippets.length}%%`;
    snippets.push(markdown.slice(range.start, range.end));
    pos = range.end;
  }
  masked += markdown.slice(pos);

  const restore = (text: string) =>
    text.replace(CODE_TOKEN_RE, (match, index: string) => snippets[Number(index)] ?? match);

  return { masked, restore };
}

/** Remove all code regions — for "does this content contain X?" detection gates. */
export function stripCodeRegions(markdown: string): string {
  let stripped = '';
  let pos = 0;
  for (const range of codeRanges(markdown)) {
    stripped += markdown.slice(pos, range.start);
    pos = range.end;
  }
  return stripped + markdown.slice(pos);
}
