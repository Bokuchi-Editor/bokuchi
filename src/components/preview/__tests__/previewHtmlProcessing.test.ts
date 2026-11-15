import { describe, it, expect, vi } from 'vitest';

// previewHtmlProcessing imports the Tauri fs plugin at module level
// (auto-resolved from src/__mocks__).
vi.mock('@tauri-apps/plugin-fs');

import { marked } from 'marked';
import { injectCodeCopyButtons, transformCheckboxes, tagDetailsElements } from '../previewHtmlProcessing';
import { sanitizeUserHtml } from '../../../utils/sanitizeHtml';

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

  it('wraps a block that carries a language:filename label (#534)', () => {
    const html = '<pre><span class="code-filename">src/app.ts</span><code class="hljs language-typescript">x</code></pre>';
    const result = injectCodeCopyButtons(html);
    expect(result).toMatch(/^<div class="code-block-wrapper"><button /);
    expect(result).toContain(html);
    expect(result.endsWith('</pre></div>')).toBe(true);
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

// transformCheckboxes is exercised against the REAL marked output on purpose:
// the Preview-level tests mock marked with a flat one-<li>-per-line model,
// which is exactly how the nested-list regression slipped past T-PV-03c.
describe('transformCheckboxes', () => {
  const render = (md: string) => transformCheckboxes(marked.parse(md, { gfm: true }) as string);
  const dom = (html: string) => new DOMParser().parseFromString(html, 'text/html').body;

  // T-PHP-CB-01: the 3-level document from the bug report — every item,
  // parents included, becomes a clickable checkbox numbered in document order.
  it('T-PHP-CB-01: numbers nested task items in document order, parents included', () => {
    const md = '- [ ] aaaa\n  - [x] bbbbb\n    - [ ] ccccc\n- [ ] AAAAA\n  - [ ] BBBBB\n    - [ ] CCCCC\n';
    const body = dom(render(md));

    const inputs = Array.from(body.querySelectorAll('input[type="checkbox"]'));
    expect(inputs).toHaveLength(6);
    expect(inputs.every((i) => i.classList.contains('markdown-checkbox'))).toBe(true);
    expect(inputs.every((i) => !i.hasAttribute('disabled'))).toBe(true);
    expect(inputs.map((i) => i.getAttribute('data-checkbox-index'))).toEqual(['0', '1', '2', '3', '4', '5']);

    const labels = inputs.map((i) => i.closest('li')!.querySelector(':scope > .checkbox-text')!.firstChild!.textContent);
    expect(labels).toEqual(['aaaa', 'bbbbb', 'ccccc', 'AAAAA', 'BBBBB', 'CCCCC']);
    expect(inputs[1].hasAttribute('checked')).toBe(true);
    expect(inputs[1].closest('li')!.classList.contains('checked')).toBe(true);
    expect(inputs[5].closest('li')!.classList.contains('checked')).toBe(false);
  });

  // T-PHP-CB-02: the nested <ul> stays inside the parent's label block (so it
  // renders under the parent's text, not as a third flex column) and the
  // parent/child <li> nesting is preserved.
  it('T-PHP-CB-02: keeps the nested list inside the parent label block', () => {
    const body = dom(render('- [ ] parent\n  - [ ] child\n'));
    const parent = body.querySelector('li[data-checkbox-index="0"]')!;
    expect(parent.firstElementChild!.tagName).toBe('INPUT');
    const label = parent.querySelector(':scope > .checkbox-text')!;
    expect(label.querySelector('ul > li[data-checkbox-index="1"]')).not.toBeNull();
    expect(parent.children).toHaveLength(2); // input + label block only
  });

  // T-PHP-CB-03: loose lists wrap the item in <p>; the input is hoisted out of
  // the paragraph and the paragraph(s) + nested list become the label block.
  it('T-PHP-CB-03: handles loose task items (<li><p><input …>)', () => {
    const body = dom(render('- [ ] a\n\n  para\n  - [x] b\n\n- [ ] c\n'));
    const items = Array.from(body.querySelectorAll('li.checkbox-item'));
    expect(items.map((li) => li.getAttribute('data-checkbox-index'))).toEqual(['0', '1', '2']);
    const first = items[0];
    expect(first.firstElementChild!.tagName).toBe('INPUT');
    const label = first.querySelector(':scope > .checkbox-text')!;
    expect(label.querySelector('p')!.textContent!.trim()).toBe('a');
    expect(label.querySelectorAll('p')[1].textContent).toBe('para');
    expect(label.querySelector('li[data-checkbox-index="1"]')).not.toBeNull();
  });

  // T-PHP-CB-04: ordered / `+` bullets and blockquoted tasks are tasks too.
  it('T-PHP-CB-04: transforms ordered, plus-bullet and blockquoted task items', () => {
    const body = dom(render('1. [ ] one\n2. [X] two\n\n+ [ ] plus\n\n> - [ ] quoted\n'));
    const inputs = Array.from(body.querySelectorAll('input.markdown-checkbox'));
    expect(inputs.map((i) => i.getAttribute('data-checkbox-index'))).toEqual(['0', '1', '2', '3']);
    expect(inputs[1].hasAttribute('checked')).toBe(true);
    expect(body.querySelector('blockquote li.checkbox-item')).not.toBeNull();
  });

  // T-PHP-CB-05: non-task items, task-like text in code, and malformed task
  // lines are left alone — and they do not consume an index.
  it('T-PHP-CB-05: leaves non-task items untouched and does not number them', () => {
    const body = dom(render('- plain\n- [ ]nospace\n- [ ] real\n\n```\n- [ ] fenced\n```\n'));
    expect(body.querySelectorAll('li')).toHaveLength(3);
    expect(body.querySelectorAll('li.checkbox-item')).toHaveLength(1);
    expect(body.querySelector('li.checkbox-item')!.getAttribute('data-checkbox-index')).toBe('0');
    expect(body.querySelector('pre code')!.textContent).toContain('- [ ] fenced');
  });

  // T-PHP-CB-06: output without checkboxes is returned verbatim (no DOM
  // round-trip for the common case).
  it('T-PHP-CB-06: returns html unchanged when there is no checkbox', () => {
    const html = '<p>hello &amp; <code>x</code></p>\n';
    expect(transformCheckboxes(html)).toBe(html);
  });

  // T-PHP-CB-07: the pass runs BEFORE sanitizeUserHtml in the pipeline, so the
  // classes/data attributes it adds must survive DOMPurify.
  it('T-PHP-CB-07: markup survives sanitizeUserHtml', () => {
    const body = dom(sanitizeUserHtml(render('- [ ] a\n  - [x] b\n')));
    const inputs = Array.from(body.querySelectorAll('input.markdown-checkbox'));
    expect(inputs).toHaveLength(2);
    expect(inputs.map((i) => i.getAttribute('data-checkbox-index'))).toEqual(['0', '1']);
    expect(inputs[1].hasAttribute('checked')).toBe(true);
    expect(inputs.every((i) => !i.hasAttribute('disabled'))).toBe(true);
    expect(body.querySelectorAll('li.checkbox-item > .checkbox-text')).toHaveLength(2);
  });
});

describe('tagDetailsElements', () => {
  const dom = (html: string) => new DOMParser().parseFromString(html, 'text/html').body;

  it('numbers <details> elements in document order', () => {
    const html = '<details><summary>a</summary>one</details><p>mid</p><details><summary>b</summary>two</details>';
    const body = dom(tagDetailsElements(html));
    const els = Array.from(body.querySelectorAll('details'));
    expect(els.map((el) => el.getAttribute('data-bk-details-index'))).toEqual(['0', '1']);
  });

  it('numbers nested <details> in document order, parent before child', () => {
    const html = '<details><summary>outer</summary><details><summary>inner</summary>x</details></details>';
    const body = dom(tagDetailsElements(html));
    const els = Array.from(body.querySelectorAll('details'));
    expect(els.map((el) => el.getAttribute('data-bk-details-index'))).toEqual(['0', '1']);
  });

  it('returns html unchanged when there is no <details>', () => {
    const html = '<p>hello &amp; <code>x</code></p>\n';
    expect(tagDetailsElements(html)).toBe(html);
  });

  it('markup survives sanitizeUserHtml', () => {
    const body = dom(sanitizeUserHtml(tagDetailsElements('<details><summary>a</summary>one</details>')));
    const el = body.querySelector('details');
    expect(el?.getAttribute('data-bk-details-index')).toBe('0');
  });
});
