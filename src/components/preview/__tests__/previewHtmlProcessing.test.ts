import { describe, it, expect, vi } from 'vitest';

// previewHtmlProcessing imports the Tauri fs plugin at module level
// (auto-resolved from src/__mocks__).
vi.mock('@tauri-apps/plugin-fs');

import { injectCodeCopyButtons } from '../previewHtmlProcessing';

describe('injectCodeCopyButtons', () => {
  it('wraps a highlighted code block with a container and copy button', () => {
    const html = '<p>before</p><pre><code class="hljs language-js"><span class="hljs-keyword">const</span> a = 1;</code></pre><p>after</p>';
    const result = injectCodeCopyButtons(html);

    expect(result).toContain(
      '<div class="code-block-wrapper"><button type="button" class="code-copy-button"',
    );
    // The original block is preserved inside the wrapper, after the button.
    expect(result).toContain(
      '</button><pre><code class="hljs language-js"><span class="hljs-keyword">const</span> a = 1;</code></pre></div>',
    );
    // Surrounding content untouched.
    expect(result.startsWith('<p>before</p>')).toBe(true);
    expect(result.endsWith('<p>after</p>')).toBe(true);
  });

  it('wraps a plain (no-language) hljs block', () => {
    const html = '<pre><code class="hljs">plain text</code></pre>';
    const result = injectCodeCopyButtons(html);
    expect(result).toContain('code-copy-button');
    expect(result).toContain('<pre><code class="hljs">plain text</code></pre></div>');
  });

  it('wraps each of multiple code blocks independently', () => {
    const html =
      '<pre><code class="hljs language-js">one</code></pre>' +
      '<p>mid</p>' +
      '<pre><code class="hljs language-py">two</code></pre>';
    const result = injectCodeCopyButtons(html);
    expect(result.match(/code-copy-button/g)?.length).toBe(2);
    // The lazy match must not swallow the middle paragraph into one wrapper.
    expect(result).toContain('</div><p>mid</p><div class="code-block-wrapper">');
  });

  it('leaves mermaid blocks (no hljs class) untouched', () => {
    const html = '<pre><code class="language-mermaid">graph TD</code></pre>';
    expect(injectCodeCopyButtons(html)).toBe(html);
  });

  it('leaves inline code untouched', () => {
    const html = '<p>use <code>npm install</code> here</p>';
    expect(injectCodeCopyButtons(html)).toBe(html);
  });

  it('handles escaped closing tags inside the code content', () => {
    const html = '<pre><code class="hljs">&lt;/code&gt;&lt;/pre&gt;</code></pre>';
    const result = injectCodeCopyButtons(html);
    expect(result).toContain('<pre><code class="hljs">&lt;/code&gt;&lt;/pre&gt;</code></pre></div>');
    expect(result.match(/code-copy-button/g)?.length).toBe(1);
  });
});
