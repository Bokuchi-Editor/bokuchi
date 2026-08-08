import { describe, it, expect } from 'vitest';
import { maskCodeRegions, stripCodeRegions } from '../codeRegions';

// Issue #468 repro: a bare ``` in prose gave the old pairing regex an odd
// fence count, so everything after it was mis-protected — prose got masked
// while actual code (with `$(...)`) was exposed to the KaTeX regexes.
const UNBALANCED_DOC = `コードブロックを開くには \`\`\` を入力します。

\`\`\`bash
echo "$(date)"
\`\`\`

\`\`\`bash
echo "$HOME"
\`\`\`
`;

describe('maskCodeRegions', () => {
  it('mask + restore is the identity for any document', () => {
    const { masked, restore } = maskCodeRegions(UNBALANCED_DOC);
    expect(restore(masked)).toBe(UNBALANCED_DOC);
  });

  it('masks the code blocks, not the prose, when prose contains a bare ``` (issue #468)', () => {
    const { masked } = maskCodeRegions(UNBALANCED_DOC);
    // Code content must be gone from the masked text…
    expect(masked).not.toContain('$(date)');
    expect(masked).not.toContain('$HOME');
    // …while the prose (including its inline-code ```) survives outside the masks.
    expect(masked).toContain('を入力します');
  });

  it('masks ~~~ fenced blocks', () => {
    const { masked } = maskCodeRegions('~~~\necho "$(date)"\n~~~\n');
    expect(masked).not.toContain('$(date)');
  });

  it('masks 4-backtick fenced blocks including embedded ``` fences', () => {
    const doc = '````markdown\n```bash\necho "$(date)"\n```\n````\n\nprose $stays$\n';
    const { masked } = maskCodeRegions(doc);
    expect(masked).not.toContain('$(date)');
    expect(masked).toContain('prose $stays$');
  });

  it('masks an unclosed trailing fence', () => {
    const { masked } = maskCodeRegions('prose\n\n```bash\necho "$(date)"\n');
    expect(masked).not.toContain('$(date)');
  });

  it('masks fenced code nested in a blockquote', () => {
    const doc = '> quote\n> ```bash\n> echo "$(date)"\n> ```\n';
    const { masked } = maskCodeRegions(doc);
    expect(masked).not.toContain('$(date)');
  });

  it('masks fenced code nested in a list item', () => {
    const doc = '- item\n\n  ```bash\n  echo "$(date)"\n  ```\n';
    const { masked } = maskCodeRegions(doc);
    expect(masked).not.toContain('$(date)');
  });

  it('masks inline code spans but not surrounding text', () => {
    const { masked, restore } = maskCodeRegions('Use `$x$` for math');
    expect(masked).not.toContain('$x$');
    expect(masked).toContain('Use ');
    expect(restore(masked)).toBe('Use `$x$` for math');
  });

  it('masks each occurrence of identical code spans at its own position', () => {
    const doc = 'a `$x$` b `$x$` c';
    const { masked, restore } = maskCodeRegions(doc);
    expect(masked).toBe('a %%CODEBLOCK_0%% b %%CODEBLOCK_1%% c');
    expect(restore(masked)).toBe(doc);
  });

  it('leaves a user-written literal %%CODEBLOCK_n%% token alone on restore', () => {
    const doc = 'literal %%CODEBLOCK_7%% in prose, no code at all';
    const { masked, restore } = maskCodeRegions(doc);
    expect(restore(masked)).toBe(doc);
  });
});

describe('stripCodeRegions', () => {
  it('removes code content but keeps prose', () => {
    const stripped = stripCodeRegions(UNBALANCED_DOC);
    expect(stripped).not.toContain('$(date)');
    expect(stripped).not.toContain('$HOME');
    expect(stripped).toContain('を入力します');
  });

  it('returns the input unchanged when there is no code', () => {
    expect(stripCodeRegions('plain prose with $x^2$ math')).toBe('plain prose with $x^2$ math');
  });
});
