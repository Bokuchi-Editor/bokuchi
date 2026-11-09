import { describe, it, expect } from 'vitest';
import { decodeCodeBlockEntities, escapeHtml, replaceFirst } from '../htmlText';

describe('escapeHtml', () => {
  it('escapes &, < and >', () => {
    expect(escapeHtml('a & <b> "c"')).toBe('a &amp; &lt;b&gt; "c"');
  });
});

describe('decodeCodeBlockEntities', () => {
  it('decodes the entities marked emits inside code blocks', () => {
    expect(decodeCodeBlockEntities('A --&gt; B &amp; C &quot;q&quot; &#39;s&#39; &lt;x&gt;')).toBe('A --> B & C "q" \'s\' <x>');
  });
});

describe('replaceFirst', () => {
  it('replaces only the first occurrence', () => {
    expect(replaceFirst('x-x-x', 'x', 'y')).toBe('y-x-x');
  });

  it('inserts the replacement literally, ignoring `$` patterns', () => {
    expect(replaceFirst('<p>a</p>NEEDLE<p>b</p>', 'NEEDLE', '$& $` $\' $$ $1')).toBe('<p>a</p>$& $` $\' $$ $1<p>b</p>');
  });

  it('returns the input unchanged when the needle is absent', () => {
    expect(replaceFirst('abc', 'z', 'y')).toBe('abc');
  });
});
