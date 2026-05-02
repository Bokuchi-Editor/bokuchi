import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Tauri plugins (auto-resolved from src/__mocks__)
vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-opener');
vi.mock('@tauri-apps/plugin-fs');

vi.mock('../../api/variableApi', () => ({
  variableApi: {
    processMarkdown: vi.fn().mockImplementation(async (content: string) => ({
      processedContent: content,
    })),
  },
}));

vi.mock('../../api/desktopApi', () => ({
  desktopApi: {
    saveHtmlFile: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock highlight.js to avoid heavy initialisation in jsdom
vi.mock('highlight.js', () => ({
  default: {
    getLanguage: vi.fn().mockReturnValue(null),
    highlightAuto: vi.fn().mockImplementation((text: string) => ({ value: text })),
    highlight: vi.fn().mockImplementation((text: string) => ({ value: text })),
  },
}));
vi.mock('highlight.js/styles/github.css', () => ({}));
vi.mock('highlight.js/styles/github-dark.css', () => ({}));

// Mock marked with a lightweight synchronous implementation that produces
// the same checkbox HTML structure as the real marked library with GFM.
vi.mock('marked', () => {
  class Renderer {
    code: unknown;
  }

  function simpleMarked(src: string): string {
    const lines = src.split('\n');
    const items = lines.map((line) => {
      const unchecked = line.match(/^- \[ \] (.+)$/);
      if (unchecked) {
        return `<li><input disabled="" type="checkbox"> ${unchecked[1]}</li>`;
      }
      const checked = line.match(/^- \[x\] (.+)$/);
      if (checked) {
        return `<li><input checked="" disabled="" type="checkbox"> ${checked[1]}</li>`;
      }
      // Image link: [![alt](img-src)](href)
      const imageLink = line.match(/^\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)$/);
      if (imageLink) {
        return `<p><a href="${imageLink[3]}"><img src="${imageLink[2]}" alt="${imageLink[1]}"></a></p>`;
      }
      // Plain link: [text](href)
      const plainLink = line.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (plainLink) {
        return `<p><a href="${plainLink[2]}">${plainLink[1]}</a></p>`;
      }
      return `<p>${line}</p>`;
    });
    const hasListItems = items.some((i) => i.startsWith('<li>'));
    if (hasListItems) {
      return `<ul>\n${items.join('\n')}\n</ul>\n`;
    }
    return items.join('\n');
  }

  simpleMarked.Renderer = Renderer;
  simpleMarked.use = vi.fn();

  return { marked: simpleMarked };
});

// Mock markdownRenderers for verifying render pipeline calls
vi.mock('../../utils/markdownRenderers', () => ({
  renderCode: vi.fn(),
  processKatex: vi.fn().mockImplementation(async (md: string) => md.replace(/\$([^$]+)\$/g, '<span class="katex">$1</span>')),
  contentHasKatex: vi.fn().mockImplementation((content: string) => /\$/.test(content)),
  processMermaidBlocks: vi.fn().mockImplementation(async (html: string) => html.replace(/mermaid-placeholder/g, '<div class="mermaid-rendered">diagram</div>')),
  contentHasMermaid: vi.fn().mockImplementation((content: string) => /mermaid/.test(content)),
  reinitializeMermaid: vi.fn(),
}));

// Mock MarpPreview component
vi.mock('../MarpPreview', () => ({
  default: (props: Record<string, unknown>) => <div data-testid="marp-preview" data-content={props.content}>MarpPreview</div>,
}));

// Mock marpRenderer
vi.mock('../../utils/marpRenderer', () => ({
  contentIsMarp: vi.fn().mockReturnValue(false),
}));

import MarkdownPreview from '../Preview';
import { variableApi } from '../../api/variableApi';
import { openUrl } from '@tauri-apps/plugin-opener';
import { processKatex, contentHasKatex, processMermaidBlocks, contentHasMermaid } from '../../utils/markdownRenderers';
import { contentIsMarp } from '../../utils/marpRenderer';
import { DEFAULT_RENDERING_SETTINGS } from '../../types/settings';

/**
 * Helper: render the Preview component and wait until the async markdown
 * processing has completed (i.e. checkbox inputs appear in the DOM).
 */
async function renderPreview(props: {
  content: string;
  darkMode: boolean;
  onContentChange: (newContent: string) => void;
}) {
  const result = render(
    <MarkdownPreview
      content={props.content}
      darkMode={props.darkMode}
      onContentChange={props.onContentChange}
    />,
  );

  // The component runs processContent() inside a useEffect which is async.
  // We poll with waitFor until checkboxes appear in the rendered HTML.
  await waitFor(() => {
    expect(result.container.querySelector('input.markdown-checkbox')).not.toBeNull();
  });

  return result;
}

/**
 * Helper: render Preview and wait for content to appear (non-checkbox content).
 */
async function renderPreviewContent(
  props: Partial<React.ComponentProps<typeof MarkdownPreview>> & { content: string },
) {
  const result = render(
    <MarkdownPreview
      darkMode={false}
      {...props}
    />,
  );

  await waitFor(() => {
    const preview = result.container.querySelector('.markdown-preview');
    expect(preview?.innerHTML).not.toBe('');
  });

  return result;
}

describe('MarkdownPreview – checkbox toggle', () => {
  let onContentChange: (newContent: string) => void;

  beforeEach(() => {
    onContentChange = vi.fn<(newContent: string) => void>();
    vi.clearAllMocks();
  });

  // T-PV-01: clicking unchecked checkbox calls onContentChange with [x]
  it('T-PV-01: toggles unchecked checkbox to checked', async () => {
    const markdown = '- [ ] Buy milk';

    const { container } = await renderPreview({
      content: markdown,
      darkMode: false,
      onContentChange,
    });

    const checkbox = container.querySelector('input.markdown-checkbox') as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    expect(checkbox.checked).toBe(false);

    // Simulate checking the checkbox
    checkbox.checked = true;
    fireEvent.change(checkbox);

    expect(onContentChange).toHaveBeenCalledTimes(1);
    expect(onContentChange).toHaveBeenCalledWith('- [x] Buy milk');
  });

  // T-PV-02: clicking checked checkbox calls onContentChange with [ ]
  it('T-PV-02: toggles checked checkbox to unchecked', async () => {
    const markdown = '- [x] Buy milk';

    const { container } = await renderPreview({
      content: markdown,
      darkMode: false,
      onContentChange,
    });

    const checkbox = container.querySelector('input.markdown-checkbox') as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    expect(checkbox.checked).toBe(true);

    // Simulate unchecking the checkbox
    checkbox.checked = false;
    fireEvent.change(checkbox);

    expect(onContentChange).toHaveBeenCalledTimes(1);
    expect(onContentChange).toHaveBeenCalledWith('- [ ] Buy milk');
  });

  // T-PV-03: targets correct checkbox by index (two checkboxes, click second, only second toggled)
  it('T-PV-03: toggles only the second checkbox when two are present', async () => {
    const markdown = '- [ ] First item\n- [ ] Second item';

    const { container } = await renderPreview({
      content: markdown,
      darkMode: false,
      onContentChange,
    });

    const checkboxes = container.querySelectorAll('input.markdown-checkbox');
    expect(checkboxes.length).toBe(2);

    const secondCheckbox = checkboxes[1] as HTMLInputElement;

    // Simulate checking only the second checkbox
    secondCheckbox.checked = true;
    fireEvent.change(secondCheckbox);

    expect(onContentChange).toHaveBeenCalledTimes(1);
    expect(onContentChange).toHaveBeenCalledWith(
      '- [ ] First item\n- [x] Second item',
    );
  });

  // Malformed task lines (no space after `]`) are not rendered as checkboxes by
  // GFM, so they must also be skipped when mapping click index → editor line.
  // Otherwise the click toggles the wrong line.
  it('T-PV-03b: skips malformed task lines when mapping click to editor content', async () => {
    const markdown = '- [ ]NoSpaceTask\n- [ ] RealTask';

    const { container } = await renderPreview({
      content: markdown,
      darkMode: false,
      onContentChange,
    });

    const checkboxes = container.querySelectorAll('input.markdown-checkbox');
    expect(checkboxes.length).toBe(1);

    const checkbox = checkboxes[0] as HTMLInputElement;
    checkbox.checked = true;
    fireEvent.change(checkbox);

    expect(onContentChange).toHaveBeenCalledTimes(1);
    expect(onContentChange).toHaveBeenCalledWith(
      '- [ ]NoSpaceTask\n- [x] RealTask',
    );
  });
});

// =========================================================================
// Variable expansion
// =========================================================================

describe('MarkdownPreview – variable expansion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // T-PV-04: variables are passed to processMarkdown
  it('T-PV-04: passes globalVariables to variableApi.processMarkdown', async () => {
    const variables = { author: 'Alice', project: 'Bokuchi' };

    await renderPreviewContent({
      content: 'Hello {{author}}',
      globalVariables: variables,
    });

    expect(variableApi.processMarkdown).toHaveBeenCalledWith(
      'Hello {{author}}',
      variables,
    );
  });
});

// =========================================================================
// Markdown rendering
// =========================================================================

describe('MarkdownPreview – content rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // T-PV-05: renders paragraph text
  it('T-PV-05: renders plain text as paragraph', async () => {
    const { container } = await renderPreviewContent({
      content: 'Hello world',
    });

    const preview = container.querySelector('.markdown-preview');
    expect(preview?.textContent).toContain('Hello world');
  });

  // T-PV-06: empty content renders empty preview
  it('T-PV-06: empty content renders empty preview', async () => {
    const { container } = render(
      <MarkdownPreview content="" darkMode={false} />,
    );

    // Allow effect to run
    await waitFor(() => {
      const preview = container.querySelector('.markdown-preview');
      expect(preview?.innerHTML).toBe('');
    });
  });

  // T-PV-07: zoom level affects font size
  it('T-PV-07: zoomLevel scales preview font size', async () => {
    const { container } = await renderPreviewContent({
      content: 'Zoomed text',
      zoomLevel: 1.5,
    });

    const preview = container.querySelector('.markdown-preview') as HTMLElement;
    // Default base is 16px * 1.5 = 24px
    expect(preview.style.fontSize).toBe('24px');
  });

  // T-PV-08: default zoom level is 16px
  it('T-PV-08: default zoomLevel renders 16px font', async () => {
    const { container } = await renderPreviewContent({
      content: 'Normal text',
    });

    const preview = container.querySelector('.markdown-preview') as HTMLElement;
    expect(preview.style.fontSize).toBe('16px');
  });
});

// =========================================================================
// Scroll sync
// =========================================================================

describe('MarkdownPreview – scroll sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // T-PV-09: scrollFraction sets scrollTop
  it('T-PV-09: scrollFraction updates container scroll position', async () => {
    const { container, rerender } = await renderPreviewContent({
      content: 'Long content',
    });

    // Get the scroll container (the second Box child)
    const scrollContainer = container.querySelector('.markdown-preview')?.parentElement;
    expect(scrollContainer).not.toBeNull();

    // Mock scrollHeight and clientHeight
    Object.defineProperty(scrollContainer!, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(scrollContainer!, 'clientHeight', { value: 500, configurable: true });

    rerender(
      <MarkdownPreview content="Long content" darkMode={false} scrollFraction={0.5} />,
    );

    await waitFor(() => {
      // scrollTop = 0.5 * (1000 - 500) = 250
      expect(scrollContainer!.scrollTop).toBe(250);
    });
  });
});

// =========================================================================
// Theme handling
// =========================================================================

describe('MarkdownPreview – themes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // T-PV-10: dark mode applies hljs-dark class
  it('T-PV-10: dark mode adds hljs-dark class to preview', async () => {
    const { container } = await renderPreviewContent({
      content: 'Dark mode content',
      darkMode: true,
    });

    const preview = container.querySelector('.markdown-preview');
    expect(preview?.classList.contains('hljs-dark')).toBe(true);
  });

  // T-PV-11: light mode applies hljs-light class
  it('T-PV-11: light mode adds hljs-light class to preview', async () => {
    const { container } = await renderPreviewContent({
      content: 'Light mode content',
      darkMode: false,
    });

    const preview = container.querySelector('.markdown-preview');
    expect(preview?.classList.contains('hljs-light')).toBe(true);
  });

  // T-PV-12: darcula theme overrides to hljs-dark
  it('T-PV-12: darcula theme forces hljs-dark class', async () => {
    const { container } = await renderPreviewContent({
      content: 'Darcula content',
      darkMode: false,
      theme: 'darcula',
    });

    const preview = container.querySelector('.markdown-preview');
    expect(preview?.classList.contains('hljs-dark')).toBe(true);
  });

  // T-PV-13: as400 theme applies monospace font
  it('T-PV-13: as400 theme uses monospace font family', async () => {
    const { container } = await renderPreviewContent({
      content: 'Retro text',
      darkMode: false,
      theme: 'as400',
    });

    const preview = container.querySelector('.markdown-preview') as HTMLElement;
    expect(preview.style.fontFamily).toContain('IBM Plex Mono');
  });
});

// =========================================================================
// Link click handling
// =========================================================================

// =========================================================================
// KaTeX rendering
// =========================================================================

describe('MarkdownPreview – KaTeX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(contentIsMarp).mockReturnValue(false);
  });

  // T-PV-17: KaTeX enabled triggers processKatex
  it('T-PV-17: calls processKatex when enableKatex is true and content has math', async () => {
    await renderPreviewContent({
      content: 'Math: $E=mc^2$',
      renderingSettings: { enableKatex: true, enableMermaid: false, enableMarp: false },
    });

    expect(contentHasKatex).toHaveBeenCalled();
    expect(processKatex).toHaveBeenCalled();
  });

  // T-PV-18: KaTeX disabled does not call processKatex
  it('T-PV-18: does not call processKatex when enableKatex is false', async () => {
    await renderPreviewContent({
      content: 'Math: $E=mc^2$',
      renderingSettings: { enableKatex: false, enableMermaid: false, enableMarp: false },
    });

    expect(processKatex).not.toHaveBeenCalled();
  });
});

// =========================================================================
// Mermaid rendering
// =========================================================================

describe('MarkdownPreview – Mermaid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(contentIsMarp).mockReturnValue(false);
  });

  // T-PV-19: Mermaid enabled triggers processMermaidBlocks
  it('T-PV-19: calls processMermaidBlocks when enableMermaid is true and content has mermaid', async () => {
    await renderPreviewContent({
      content: '```mermaid\ngraph TD\n```',
      renderingSettings: { enableKatex: false, enableMermaid: true, enableMarp: false },
    });

    expect(contentHasMermaid).toHaveBeenCalled();
    expect(processMermaidBlocks).toHaveBeenCalled();
  });

  // T-PV-20: Mermaid disabled does not call processMermaidBlocks
  it('T-PV-20: does not call processMermaidBlocks when enableMermaid is false', async () => {
    await renderPreviewContent({
      content: '```mermaid\ngraph TD\n```',
      renderingSettings: { enableKatex: false, enableMermaid: false, enableMarp: false },
    });

    expect(processMermaidBlocks).not.toHaveBeenCalled();
  });
});

// =========================================================================
// Easter egg blocks
// =========================================================================

describe('MarkdownPreview – Easter egg blocks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(contentIsMarp).mockReturnValue(false);
  });

  // T-PV-21: :::rainbow block renders with ee-rainbow class
  it('T-PV-21: easter egg block renders with effect class', async () => {
    const { container } = await renderPreviewContent({
      content: ':::rainbow\nHello\n:::\n',
    });

    const eeBlock = container.querySelector('.ee-block.ee-rainbow');
    expect(eeBlock).not.toBeNull();
    expect(eeBlock?.getAttribute('data-effect')).toBe('rainbow');
  });
});

// =========================================================================
// Marp detection
// =========================================================================

describe('MarkdownPreview – Marp detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // T-PV-22: Marp content renders MarpPreview instead of normal preview
  it('T-PV-22: renders MarpPreview when content is marp and enableMarp is true', async () => {
    vi.mocked(contentIsMarp).mockReturnValue(true);

    const { getByTestId } = render(
      <MarkdownPreview
        content="---\nmarp: true\n---\n# Slide"
        darkMode={false}
        renderingSettings={{ enableKatex: false, enableMermaid: false, enableMarp: true }}
      />,
    );

    expect(getByTestId('marp-preview')).toBeInTheDocument();
  });

  // T-PV-23: Marp disabled renders normal preview even for marp content
  it('T-PV-23: renders normal preview when enableMarp is false', async () => {
    vi.mocked(contentIsMarp).mockReturnValue(false);

    const { container, queryByTestId } = await renderPreviewContent({
      content: '---\nmarp: true\n---\n# Slide',
      renderingSettings: { enableKatex: false, enableMermaid: false, enableMarp: false },
    });

    expect(queryByTestId('marp-preview')).toBeNull();
    expect(container.querySelector('.markdown-preview')).not.toBeNull();
  });
});

// =========================================================================
// Link click handling
// =========================================================================

describe('MarkdownPreview – link clicks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (openUrl as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  // T-PV-14: clicking a plain text link opens URL externally
  it('T-PV-14: plain text link opens URL via openUrl', async () => {
    const { container } = await renderPreviewContent({
      content: '[Google](https://google.com)',
    });

    const link = container.querySelector('a[href="https://google.com"]') as HTMLAnchorElement;
    expect(link).not.toBeNull();

    fireEvent.click(link);

    expect(openUrl).toHaveBeenCalledWith('https://google.com');
  });

  // T-PV-15: clicking an image inside a link opens URL externally (regression)
  it('T-PV-15: image link opens URL via openUrl when clicking the image', async () => {
    const { container } = await renderPreviewContent({
      content: '[![Google](https://img.sample.com/google.png)](https://google.com)',
    });

    const img = container.querySelector('a[href="https://google.com"] img') as HTMLImageElement;
    expect(img).not.toBeNull();

    fireEvent.click(img);

    expect(openUrl).toHaveBeenCalledWith('https://google.com');
  });

  // T-PV-16: clicking an image link does not trigger default navigation
  it('T-PV-16: image link click prevents default navigation', async () => {
    const { container } = await renderPreviewContent({
      content: '[![Google](https://img.sample.com/google.png)](https://google.com)',
    });

    const img = container.querySelector('a[href="https://google.com"] img') as HTMLImageElement;
    expect(img).not.toBeNull();

    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');

    img.dispatchEvent(clickEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(openUrl).toHaveBeenCalledWith('https://google.com');
  });

  // T-PV-17 / T-PV-18 (regression): both the link-click and checkbox-change
  // listeners must attach even after the component first mounts as a Marp
  // preview (which returns <MarpPreview/> early and leaves previewRef null)
  // and then switches to a non-Marp tab. Before the fix, both listeners'
  // useEffect had empty deps, so they ran once while previewRef was null and
  // never re-attached when the markdown div finally mounted — link clicks
  // fell through to native navigation (the app navigated inside Bokuchi
  // instead of opening the OS browser) and checkbox clicks did nothing.
  //
  // These tests are paired: if the early-return-for-Marp pattern at
  // Preview.tsx:358 is preserved AND either useEffect's deps drift back to
  // `[]`, one of these tests will fail.
  it('T-PV-17: link listener attaches after switching from Marp to non-Marp content', async () => {
    // Start as Marp: contentIsMarp -> true, so MarpPreview branch is taken
    // and the markdown <div ref={previewRef}> never mounts on first render.
    vi.mocked(contentIsMarp).mockReturnValue(true);
    const { rerender, container } = render(
      <MarkdownPreview
        content={'---\nmarp: true\n---\n# slide'}
        darkMode={false}
        renderingSettings={{ ...DEFAULT_RENDERING_SETTINGS, enableMarp: true }}
      />,
    );
    // Sanity: Marp branch active, markdown div absent.
    expect(container.querySelector('[data-testid="marp-preview"]')).not.toBeNull();
    expect(container.querySelector('.markdown-preview')).toBeNull();

    // Switch to a regular markdown document — the markdown div now mounts.
    vi.mocked(contentIsMarp).mockReturnValue(false);
    rerender(
      <MarkdownPreview
        content={'[Google](https://google.com)'}
        darkMode={false}
        renderingSettings={{ ...DEFAULT_RENDERING_SETTINGS, enableMarp: true }}
      />,
    );
    await waitFor(() => {
      const link = container.querySelector('a[href="https://google.com"]');
      expect(link).not.toBeNull();
    });

    const link = container.querySelector('a[href="https://google.com"]') as HTMLAnchorElement;
    fireEvent.click(link);

    expect(openUrl).toHaveBeenCalledWith('https://google.com');
  });

  it('T-PV-18: checkbox listener attaches after switching from Marp to non-Marp content', async () => {
    const onContentChange = vi.fn<(newContent: string) => void>();

    vi.mocked(contentIsMarp).mockReturnValue(true);
    const { rerender, container } = render(
      <MarkdownPreview
        content={'---\nmarp: true\n---\n# slide'}
        darkMode={false}
        onContentChange={onContentChange}
        renderingSettings={{ ...DEFAULT_RENDERING_SETTINGS, enableMarp: true }}
      />,
    );
    expect(container.querySelector('[data-testid="marp-preview"]')).not.toBeNull();
    expect(container.querySelector('.markdown-preview')).toBeNull();

    vi.mocked(contentIsMarp).mockReturnValue(false);
    rerender(
      <MarkdownPreview
        content={'- [ ] Buy milk'}
        darkMode={false}
        onContentChange={onContentChange}
        renderingSettings={{ ...DEFAULT_RENDERING_SETTINGS, enableMarp: true }}
      />,
    );
    await waitFor(() => {
      expect(container.querySelector('input.markdown-checkbox')).not.toBeNull();
    });

    const checkbox = container.querySelector('input.markdown-checkbox') as HTMLInputElement;
    checkbox.checked = true;
    fireEvent.change(checkbox);

    expect(onContentChange).toHaveBeenCalledWith('- [x] Buy milk');
  });
});
