import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock highlight.js
vi.mock('highlight.js', () => ({
  default: {
    getLanguage: vi.fn((lang: string) => lang === 'javascript' || lang === 'python' ? {} : null),
    highlight: vi.fn((text: string, { language }: { language: string }) => ({
      value: `<highlighted lang="${language}">${text}</highlighted>`,
    })),
    highlightAuto: vi.fn((text: string) => ({
      value: `<auto-highlighted>${text}</auto-highlighted>`,
    })),
  },
}));

// Mock katex
vi.mock('katex', () => ({
  default: {
    renderToString: vi.fn((tex: string, opts?: { displayMode?: boolean }) => {
      return `<span class="katex${opts?.displayMode ? ' katex-display' : ''}">${tex}</span>`;
    }),
  },
}));
vi.mock('katex/dist/katex.min.css', () => ({}));

// Mock mermaid
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

import {
  renderCode,
  contentHasKatex,
  contentHasMermaid,
  processKatex,
  processMermaidBlocks,
  reinitializeMermaid,
} from '../markdownRenderers';

import mermaid from 'mermaid';

const mockRender = vi.mocked(mermaid.render);

describe('renderCode', () => {
  it('returns escaped output for mermaid language', () => {
    const result = renderCode({ text: 'graph TD\nA-->B', lang: 'mermaid' });
    expect(result).toContain('class="language-mermaid"');
    expect(result).toContain('A--&gt;B');
    expect(result).not.toContain('hljs');
  });

  it('uses highlight.js for known languages', () => {
    const result = renderCode({ text: 'const a = 1;', lang: 'javascript' });
    expect(result).toContain('hljs');
    expect(result).toContain('language-javascript');
    expect(result).toContain('<highlighted');
  });

  it('does not auto-highlight unknown languages (escapes HTML and emits plain)', async () => {
    const hljs = (await import('highlight.js')).default;
    const autoSpy = vi.mocked(hljs.highlightAuto);
    autoSpy.mockClear();

    const result = renderCode({ text: 'a < b & c', lang: 'unknown-lang' });
    expect(result).toContain('hljs');
    expect(result).toContain('language-unknown-lang');
    expect(result).not.toContain('<auto-highlighted>');
    expect(result).toContain('a &lt; b &amp; c');
    expect(autoSpy).not.toHaveBeenCalled();
  });

  it('does not auto-highlight when no language specified (escapes HTML and emits plain)', async () => {
    const hljs = (await import('highlight.js')).default;
    const autoSpy = vi.mocked(hljs.highlightAuto);
    autoSpy.mockClear();

    const result = renderCode({ text: 'a < b & c' });
    expect(result).toContain('hljs');
    expect(result).not.toContain('language-');
    expect(result).not.toContain('<auto-highlighted>');
    expect(result).toContain('a &lt; b &amp; c');
    expect(autoSpy).not.toHaveBeenCalled();
  });
});

describe('contentHasKatex', () => {
  it('detects inline math', () => {
    expect(contentHasKatex('The value $x^2$ is positive')).toBe(true);
  });

  it('detects display math', () => {
    expect(contentHasKatex('$$E = mc^2$$')).toBe(true);
  });

  it('returns false for no math', () => {
    expect(contentHasKatex('Hello world')).toBe(false);
  });

  it('ignores math inside code blocks', () => {
    expect(contentHasKatex('```\n$x^2$\n```')).toBe(false);
  });

  it('ignores math inside inline code', () => {
    expect(contentHasKatex('Use `$x$` for inline math')).toBe(false);
  });
});

describe('contentHasMermaid', () => {
  it('detects mermaid blocks', () => {
    expect(contentHasMermaid('```mermaid\ngraph TD\nA-->B\n```')).toBe(true);
  });

  it('returns false for no mermaid', () => {
    expect(contentHasMermaid('```javascript\nconst a = 1;\n```')).toBe(false);
  });

  it('returns false for empty content', () => {
    expect(contentHasMermaid('')).toBe(false);
  });

  it('returns consistent results on repeated calls (no global regex lastIndex issue)', () => {
    const content = '```mermaid\ngraph TD\nA-->B\n```';
    // Call multiple times — must always return true
    expect(contentHasMermaid(content)).toBe(true);
    expect(contentHasMermaid(content)).toBe(true);
    expect(contentHasMermaid(content)).toBe(true);
  });
});

describe('contentHasKatex repeated calls', () => {
  it('returns consistent results on repeated calls', () => {
    const content = 'The value $x^2$ is positive';
    expect(contentHasKatex(content)).toBe(true);
    expect(contentHasKatex(content)).toBe(true);
    expect(contentHasKatex(content)).toBe(true);
  });
});

describe('processKatex', () => {
  // processKatex replaces math with placeholders and returns a restore() that
  // swaps the rendered HTML back in (intended to run on marked's output, #354).
  // For these unit tests we restore against the placeholder markdown directly.
  const render = async (input: string) => {
    const { markdown, restore } = await processKatex(input);
    return { markdown, html: restore(markdown) };
  };

  it('replaces math with an inert placeholder (no raw HTML before marked)', async () => {
    const { markdown } = await render('The value $x^2$ is positive');
    // marked must never see KaTeX output, only an alphanumeric placeholder.
    expect(markdown).not.toContain('<span');
    expect(markdown).not.toContain('$');
    expect(markdown).toMatch(/KaTeXmathPLACEHOLDER\d+END/);
  });

  it('renders display math', async () => {
    const { html } = await render('Before $$E = mc^2$$ After');
    expect(html).toContain('katex-display');
    expect(html).toContain('E = mc^2');
    expect(html).toContain('Before');
    expect(html).toContain('After');
  });

  it('renders inline math', async () => {
    const { html } = await render('The value $x^2$ is positive');
    expect(html).toContain('katex');
    expect(html).toContain('x^2');
    expect(html).not.toContain('katex-display');
  });

  it('does not process math inside code blocks', async () => {
    const input = '```\n$x^2$\n```';
    const { markdown, html } = await render(input);
    expect(markdown).toBe(input);
    expect(html).toBe(input);
  });

  it('does not process math inside inline code', async () => {
    const input = 'Use `$x$` for math';
    const { markdown, html } = await render(input);
    expect(markdown).toBe(input);
    expect(html).toBe(input);
  });

  it('handles both display and inline in the same content', async () => {
    const { html } = await render('Inline $a$ and display $$b$$');
    expect(html).toContain('<span class="katex">a</span>');
    expect(html).toContain('<span class="katex katex-display">b</span>');
  });

  it('strips newlines from KaTeX output to prevent table parsing issues', async () => {
    const katexMod = await import('katex');
    const mockRenderToString = vi.mocked(katexMod.default.renderToString);

    // Simulate KaTeX output with newlines (as real KaTeX SVG path data contains)
    mockRenderToString.mockReturnValueOnce(
      '<span class="katex"><svg>\n<path d="c-2.7,0,-7.17,-2.7\n-13.5,-8"/>\n</svg></span>'
    );

    const { html } = await render('$\\sqrt{1}$');
    expect(html).not.toContain('\n');
    expect(html).toContain('<svg><path d="c-2.7,0,-7.17,-2.7-13.5,-8"/></svg>');

    // Restore default mock behavior
    mockRenderToString.mockImplementation((tex: string, opts?: { displayMode?: boolean }) => {
      return `<span class="katex${opts?.displayMode ? ' katex-display' : ''}">${tex}</span>`;
    });
  });
});

describe('processMermaidBlocks', () => {
  beforeEach(() => {
    mockRender.mockReset();
  });

  it('renders mermaid blocks from HTML', async () => {
    mockRender.mockResolvedValue({ svg: '<svg>diagram</svg>', diagramType: 'flowchart' });
    const html = '<pre><code class="language-mermaid">graph TD\nA--&gt;B</code></pre>';
    const result = await processMermaidBlocks(html);
    expect(result).toContain('<div class="mermaid-diagram"><svg>diagram</svg></div>');
    expect(mockRender).toHaveBeenCalledWith(
      expect.stringContaining('mermaid-'),
      'graph TD\nA-->B',
    );
  });

  it('shows error on invalid mermaid', async () => {
    mockRender.mockRejectedValue(new Error('Parse error'));
    const html = '<pre><code class="language-mermaid">invalid</code></pre>';
    const result = await processMermaidBlocks(html);
    expect(result).toContain('mermaid-error');
    expect(result).toContain('Parse error');
  });

  it('returns html unchanged when no mermaid blocks', async () => {
    const html = '<pre><code class="language-javascript">const a = 1;</code></pre>';
    const result = await processMermaidBlocks(html);
    expect(result).toBe(html);
    expect(mockRender).not.toHaveBeenCalled();
  });

  it('decodes HTML entities in mermaid code', async () => {
    mockRender.mockResolvedValue({ svg: '<svg>ok</svg>', diagramType: 'flowchart' });
    const html = '<pre><code class="language-mermaid">A --&gt; B &amp; C</code></pre>';
    await processMermaidBlocks(html);
    expect(mockRender).toHaveBeenCalledWith(
      expect.any(String),
      'A --> B & C',
    );
  });
});

describe('reinitializeMermaid', () => {
  beforeEach(() => {
    vi.mocked(mermaid.initialize).mockClear();
    mockRender.mockReset();
  });

  it('calls initialize with dark theme when dark=true', async () => {
    // Trigger lazy-load so mermaidModule is populated
    mockRender.mockResolvedValue({ svg: '<svg></svg>', diagramType: 'flowchart' });
    await processMermaidBlocks('<pre><code class="language-mermaid">graph TD</code></pre>');

    reinitializeMermaid(true);
    expect(mermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'dark' }),
    );
  });

  it('calls initialize with default theme when dark=false', async () => {
    mockRender.mockResolvedValue({ svg: '<svg></svg>', diagramType: 'flowchart' });
    await processMermaidBlocks('<pre><code class="language-mermaid">graph TD</code></pre>');

    reinitializeMermaid(false);
    expect(mermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'default' }),
    );
  });
});

