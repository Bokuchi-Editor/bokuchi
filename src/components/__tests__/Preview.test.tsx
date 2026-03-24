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

import MarkdownPreview from '../Preview';
import { variableApi } from '../../api/variableApi';

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
