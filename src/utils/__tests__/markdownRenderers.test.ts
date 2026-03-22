import { describe, it, expect, vi, beforeEach } from 'vitest';

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
const mockRender = vi.fn();
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: mockRender,
  },
}));

import {
  contentHasKatex,
  contentHasMermaid,
  processKatex,
  processMermaidBlocks,
} from '../markdownRenderers';

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
  it('renders display math', async () => {
    const result = await processKatex('Before $$E = mc^2$$ After');
    expect(result).toContain('katex-display');
    expect(result).toContain('E = mc^2');
    expect(result).toContain('Before');
    expect(result).toContain('After');
  });

  it('renders inline math', async () => {
    const result = await processKatex('The value $x^2$ is positive');
    expect(result).toContain('katex');
    expect(result).toContain('x^2');
    expect(result).not.toContain('katex-display');
  });

  it('does not process math inside code blocks', async () => {
    const input = '```\n$x^2$\n```';
    const result = await processKatex(input);
    expect(result).toBe(input);
  });

  it('does not process math inside inline code', async () => {
    const input = 'Use `$x$` for math';
    const result = await processKatex(input);
    expect(result).toBe(input);
  });

  it('handles both display and inline in the same content', async () => {
    const result = await processKatex('Inline $a$ and display $$b$$');
    expect(result).toContain('<span class="katex">a</span>');
    expect(result).toContain('<span class="katex katex-display">b</span>');
  });
});

describe('processMermaidBlocks', () => {
  beforeEach(() => {
    mockRender.mockReset();
  });

  it('renders mermaid blocks from HTML', async () => {
    mockRender.mockResolvedValue({ svg: '<svg>diagram</svg>' });
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
    mockRender.mockResolvedValue({ svg: '<svg>ok</svg>' });
    const html = '<pre><code class="language-mermaid">A --&gt; B &amp; C</code></pre>';
    await processMermaidBlocks(html);
    expect(mockRender).toHaveBeenCalledWith(
      expect.any(String),
      'A --> B & C',
    );
  });
});
