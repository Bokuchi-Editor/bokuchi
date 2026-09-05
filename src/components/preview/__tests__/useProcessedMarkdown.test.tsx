import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProcessedMarkdown } from '../useProcessedMarkdown';
import { variableApi } from '../../../api/variableApi';
import type { RenderingSettings } from '../../../types/settings';

vi.mock('../../../api/variableApi', () => ({
  variableApi: {
    processMarkdown: vi.fn().mockImplementation(async (content: string) => ({
      processedContent: content,
    })),
  },
}));

// Mock highlight.js to avoid heavy initialisation in jsdom (imported at the
// top level by markdownRenderers even when no code block is rendered).
vi.mock('highlight.js', () => ({
  default: {
    getLanguage: vi.fn().mockReturnValue(null),
    highlightAuto: vi.fn().mockImplementation((text: string) => ({ value: text })),
    highlight: vi.fn().mockImplementation((text: string) => ({ value: text })),
  },
}));
vi.mock('highlight.js/styles/github.css', () => ({}));
vi.mock('highlight.js/styles/github-dark.css', () => ({}));

const renderingSettings: RenderingSettings = {
  enableKatex: false,
  enableMermaid: false,
  enableMarp: false,
  enableEmoji: false,
};

const baseParams = {
  globalVariables: {},
  filePath: undefined,
  renderingSettings,
  darkMode: false,
  theme: undefined,
};

function renderProcessedMarkdown(initialContent: string) {
  return renderHook(
    ({ content }) => useProcessedMarkdown({ ...baseParams, content }),
    { initialProps: { content: initialContent } },
  );
}

describe('useProcessedMarkdown', () => {
  beforeEach(() => {
    vi.mocked(variableApi.processMarkdown).mockClear();
  });

  it('renders markdown content to HTML', async () => {
    const { result } = renderProcessedMarkdown('# Hello');
    await waitFor(() => {
      expect(result.current.htmlContent).toContain('Hello');
    });
    expect(result.current.processedContent).toBe('# Hello');
  });

  it('clears the preview when content becomes empty', async () => {
    const { result, rerender } = renderProcessedMarkdown('# Hello');
    await waitFor(() => expect(result.current.htmlContent).toContain('Hello'));

    rerender({ content: '' });
    await waitFor(() => expect(result.current.htmlContent).toBe(''));
    expect(result.current.processedContent).toBe('');
  });

  // Regression: closing a tab blanks the preview (empty-content branch), but the
  // input cache ref was not reset. Returning to the original tab then matched the
  // stale cache key, the early-return guard fired, and setHtmlContent never ran —
  // leaving the preview permanently blank (#508).
  it('re-renders the same content after the preview was emptied (tab close round-trip)', async () => {
    const { result, rerender } = renderProcessedMarkdown('# Hello');
    await waitFor(() => expect(result.current.htmlContent).toContain('Hello'));

    // Close the tab: content goes empty, preview blanks.
    rerender({ content: '' });
    await waitFor(() => expect(result.current.htmlContent).toBe(''));

    // Switch back to the original tab: identical content must render again.
    rerender({ content: '# Hello' });
    await waitFor(() => {
      expect(result.current.htmlContent).toContain('Hello');
    });
  });

  // The cache guard itself: identical input arriving with new object identities
  // (as on auto-save) must NOT re-run the pipeline, or in-flight animations in
  // the preview would be interrupted.
  it('skips re-processing when the input is unchanged', async () => {
    const { result, rerender } = renderHook(
      ({ globalVariables }) =>
        useProcessedMarkdown({ ...baseParams, globalVariables, content: '# Hello' }),
      { initialProps: { globalVariables: {} as Record<string, string> } },
    );
    await waitFor(() => expect(result.current.htmlContent).toContain('Hello'));
    expect(variableApi.processMarkdown).toHaveBeenCalledTimes(1);

    // New object identity, same value → effect re-runs but the cache guard
    // must short-circuit before the pipeline.
    rerender({ globalVariables: {} });
    await waitFor(() => expect(result.current.htmlContent).toContain('Hello'));
    expect(variableApi.processMarkdown).toHaveBeenCalledTimes(1);
  });
});
