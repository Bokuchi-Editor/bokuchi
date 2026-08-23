import { Lexer } from 'marked';
import type { MarkedExtension, MarkedOptions, Token, Tokens } from 'marked';

/**
 * GitHub Alerts (callouts) extension for marked (#488).
 *
 * Renders `> [!NOTE]` / `[!TIP]` / `[!IMPORTANT]` / `[!WARNING]` / `[!CAUTION]`
 * blockquotes as GitHub-style alert boxes. The exact behavioral contract was
 * pinned against github.com's own renderer (Markdown REST API, mode=gfm):
 *
 * - The marker must be the ENTIRE first line of a top-level blockquote
 *   (trailing whitespace allowed). `> [!NOTE] extra` stays a plain blockquote.
 * - Type matching is case-insensitive (`[!note]` works).
 * - The alert must have body content after the marker line; a marker-only
 *   blockquote stays a plain blockquote.
 * - Only TOP-LEVEL blockquotes become alerts: `> > [!NOTE]` and a blockquote
 *   inside a list item render as plain blockquotes, and an alert marker inside
 *   an alert body is NOT re-processed (matches GitHub).
 * - Unknown types (`[!FOO]`) stay plain blockquotes.
 *
 * Output mirrors GitHub's markup (minus GitHub-internal attributes) so the
 * familiar `.markdown-alert` / `.markdown-alert-title` class contract applies:
 *
 *   <div class="markdown-alert markdown-alert-note">
 *     <p class="markdown-alert-title"><svg …>…</svg>Note</p>
 *     …body…
 *   </div>
 *
 * Titles are intentionally English-only, exactly like github.com.
 *
 * The emitted SVG icons are generated BEFORE sanitizeUserHtml runs, so they
 * must survive DOMPurify's default profile (they do: svg/path/viewBox/class
 * are all allowlisted; pinned by tests).
 */

export type GithubAlertVariant = 'note' | 'tip' | 'important' | 'warning' | 'caution';

interface GithubAlertToken extends Tokens.Generic {
  type: 'githubAlert';
  variant: GithubAlertVariant;
  tokens: Token[];
}

// Leading whitespace is allowed (`>   [!NOTE]` is an alert on GitHub). Four or
// more spaces never reach this check — marked lexes that as an indented code
// block inside the blockquote, so the first token is not a paragraph (which
// also matches GitHub, where `>     [!NOTE]` stays a plain quote).
const ALERT_MARKER_RE = /^[ \t]*\[!(note|tip|important|warning|caution)\][ \t]*$/i;

const ALERT_TITLES: Record<GithubAlertVariant, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
};

// Octicon paths copied verbatim from GitHub's rendered alert markup
// (octicon-info / light-bulb / report / alert / stop, 16px variants, MIT).
const OCTICON_PATHS: Record<GithubAlertVariant, { name: string; path: string }> = {
  note: {
    name: 'info',
    path: 'M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z',
  },
  tip: {
    name: 'light-bulb',
    path: 'M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z',
  },
  important: {
    name: 'report',
    path: 'M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z',
  },
  warning: {
    name: 'alert',
    path: 'M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z',
  },
  caution: {
    name: 'stop',
    path: 'M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z',
  },
};

function alertIconSvg(variant: GithubAlertVariant): string {
  const { name, path } = OCTICON_PATHS[variant];
  return (
    `<svg class="octicon octicon-${name}" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">` +
    `<path d="${path}"></path></svg>`
  );
}

/**
 * If the blockquote qualifies as a GitHub alert, return its variant and the
 * body source (inner blockquote content minus the marker line); otherwise null.
 *
 * The body source is reconstructed from the child tokens' `raw` (which marked
 * lexed from the `>`-stripped content), so blank lines between paragraphs are
 * preserved exactly.
 */
function matchAlert(bq: Tokens.Blockquote): { variant: GithubAlertVariant; bodySrc: string } | null {
  // Skip leading blank lines (`>` alone before the marker) — GitHub still
  // treats the following `[!NOTE]` line as the alert marker.
  let start = 0;
  while (bq.tokens[start]?.type === 'space') start++;
  const first = bq.tokens[start];
  if (!first || first.type !== 'paragraph') return null;

  const firstRaw: string = (first as Tokens.Paragraph).raw;
  const newlineAt = firstRaw.indexOf('\n');
  const markerLine = newlineAt === -1 ? firstRaw : firstRaw.slice(0, newlineAt);
  const match = ALERT_MARKER_RE.exec(markerLine);
  if (!match) return null;

  const restOfParagraph = newlineAt === -1 ? '' : firstRaw.slice(newlineAt + 1);
  const bodySrc = restOfParagraph + bq.tokens.slice(start + 1).map((t) => t.raw).join('');
  // GitHub only upgrades the blockquote when there is body content.
  if (!bodySrc.trim()) return null;

  return { variant: match[1].toLowerCase() as GithubAlertVariant, bodySrc };
}

/**
 * Build the marked extension. Detection runs in the `processAllTokens` hook so
 * it only ever sees TOP-LEVEL tokens — nested blockquotes and blockquotes
 * inside lists are naturally left alone (GitHub behavior). The alert body is
 * re-lexed with the run's own options (`this.options`), so other registered
 * extensions (e.g. emoji shortcodes) keep working inside alert bodies.
 *
 * Known trade-off of re-lexing: reference-style links whose definitions live
 * OUTSIDE the alert don't resolve inside it. GitHub does resolve those, but the
 * combination is rare and the re-lex keeps marker removal robust against
 * marked's internal token shapes.
 */
export function githubAlertsExtension(): MarkedExtension {
  return {
    hooks: {
      processAllTokens(this: { options?: MarkedOptions }, tokens: Token[]): Token[] {
        // Runtime options of the current parse (marked assigns hooks.options);
        // fall back to the app's fixed parse options defensively.
        const options: MarkedOptions = this?.options ?? { gfm: true, breaks: true };

        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          if (token.type !== 'blockquote') continue;
          const matched = matchAlert(token as Tokens.Blockquote);
          if (!matched) continue;

          // One FRESH Lexer per alert: Lexer.lex() appends into the instance's
          // own `tokens` array and returns that same array, so reusing a lexer
          // would make every alert share the accumulated bodies of all alerts.
          const alertToken: GithubAlertToken = {
            type: 'githubAlert',
            raw: token.raw,
            variant: matched.variant,
            tokens: new Lexer(options).lex(matched.bodySrc),
          };
          tokens[i] = alertToken;
        }
        return tokens;
      },
    },
    extensions: [
      {
        name: 'githubAlert',
        level: 'block',
        renderer(token) {
          const { variant, tokens } = token as GithubAlertToken;
          const body = this.parser.parse(tokens);
          return (
            `<div class="markdown-alert markdown-alert-${variant}">` +
            `<p class="markdown-alert-title">${alertIconSvg(variant)}${ALERT_TITLES[variant]}</p>\n` +
            `${body}</div>\n`
          );
        },
      },
    ],
  };
}
