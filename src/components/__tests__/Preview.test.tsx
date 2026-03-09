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

  function simpleMarked(src: string, _options?: unknown): string {
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

/**
 * Helper: render the Preview component and wait until the async markdown
 * processing has completed (i.e. checkbox inputs appear in the DOM).
 */
async function renderPreview(props: {
  content: string;
  darkMode: boolean;
  onContentChange: ReturnType<typeof vi.fn>;
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

describe('MarkdownPreview – checkbox toggle', () => {
  let onContentChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onContentChange = vi.fn();
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
