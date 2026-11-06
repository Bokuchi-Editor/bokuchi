/**
 * Integration test for the checkbox-toggle propagation chain.
 *
 * The chain has three independent layers, each of which has silently broken
 * at least once historically:
 *
 *   1. Preview.tsx   — must map a click on a rendered checkbox to the correct
 *                       editor line (regex must align with GFM rules).
 *   2. useTabsDesktop.updateTabContent — must mutate React state with the
 *                       new content.
 *   3. useTabsDesktop.updateTabContent — must ALSO push the new content into
 *                       Monaco's model, because the Editor is uncontrolled
 *                       (`defaultValue`) and ignores prop changes.
 *
 * Unit tests for any single layer can pass while the chain is broken end to
 * end, which is exactly how the recurring "preview click does nothing in
 * editor" regression has slipped past CI three times. This test exercises the
 * whole chain in one render so it fails the moment any layer drifts.
 *
 * Test IDs: E-INT-CBP-01 .. E-INT-CBP-05
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-fs');
vi.mock('@tauri-apps/plugin-opener');

vi.mock('../../api/desktopApi', () => ({
  desktopApi: {
    readFileFromPath: vi.fn(),
    writeFileToPath: vi.fn(),
    saveHtmlFile: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../../api/storeApi', () => ({
  storeApi: {
    loadState: vi.fn().mockResolvedValue(null),
    saveState: vi.fn().mockResolvedValue(undefined),
    createInitialState: vi
      .fn()
      .mockReturnValue({ tabs: [], activeTabId: null }),
  },
}));

vi.mock('../../api/variableApi', () => ({
  variableApi: {
    processMarkdown: vi.fn().mockImplementation(async (content: string) => ({
      processedContent: content,
    })),
  },
}));

vi.mock('../../utils/fileChangeDetection', () => ({
  detectFileChange: vi.fn(),
}));

// Spy on syncModelForTab — this is the layer that has been the recurring
// regression site. Default implementation is a no-op (we don't have a real
// Monaco model in jsdom anyway).
const syncModelForTabMock = vi.fn();
vi.mock('../../utils/editorSync', () => ({
  syncModelForTab: (...args: unknown[]) => syncModelForTabMock(...args),
  setModelContentSilently: vi.fn(),
  isModelSilentlyEditing: vi.fn().mockReturnValue(false),
  findModelForTab: vi.fn().mockReturnValue(null),
}));

vi.mock('highlight.js', () => ({
  default: {
    getLanguage: vi.fn().mockReturnValue(null),
    highlightAuto: vi
      .fn()
      .mockImplementation((text: string) => ({ value: text })),
    highlight: vi
      .fn()
      .mockImplementation((text: string) => ({ value: text })),
  },
}));
vi.mock('highlight.js/styles/github.css', () => ({}));
vi.mock('highlight.js/styles/github-dark.css', () => ({}));

// marked is deliberately NOT mocked here: the whole point of this test is to
// keep the preview's checkbox index aligned with what GFM really renders. A
// simplified mock that flattens nested lists is exactly how the nested-list
// regression (parents left as disabled inputs, leaves mis-numbered) got past
// the unit tests.

vi.mock('../../utils/markdownRenderers', () => ({
  renderCode: vi.fn(),
  createTableRenderer: vi.fn(() => () => ''),
  processKatex: vi.fn().mockImplementation(async (md: string) => md),
  contentHasKatex: vi.fn().mockReturnValue(false),
  processMermaidBlocks: vi.fn().mockImplementation(async (html: string) => html),
  contentHasMermaid: vi.fn().mockReturnValue(false),
  reinitializeMermaid: vi.fn(),
}));

vi.mock('../../components/MarpPreview', () => ({
  default: () => <div data-testid="marp-preview">MarpPreview</div>,
}));

vi.mock('../../utils/marpRenderer', () => ({
  contentIsMarp: vi.fn().mockReturnValue(false),
}));

import MarkdownPreview from '../../components/Preview';
import { useTabsDesktop } from '../../hooks/useTabsDesktop';

/**
 * Test harness: a Preview that renders the active tab's content and routes
 * its onContentChange through the real useTabsDesktop.updateTabContent.
 * This wires the two halves of the propagation chain we want to verify.
 */
const PreviewWiredToTabs: React.FC<{
  initialContent: string;
  onTabsReady?: (api: ReturnType<typeof useTabsDesktop>) => void;
}> = ({ initialContent, onTabsReady }) => {
  const tabs = useTabsDesktop();
  const [tabId, setTabId] = React.useState<string | null>(null);
  const addedRef = React.useRef(false);

  // useTabsDesktop dispatches LOAD_STATE asynchronously on mount (restoreState)
  // which would wipe out any tab added before initialization completes. Wait
  // until `isInitialized` flips before adding our test tab.
  React.useEffect(() => {
    if (!tabs.isInitialized || addedRef.current) return;
    addedRef.current = true;
    const id = tabs.addTab({
      title: 'Tasks',
      content: initialContent,
      isModified: false,
      isNew: true,
    });
    setTabId(id);
    onTabsReady?.(tabs);
  }, [tabs.isInitialized, tabs, initialContent, onTabsReady]);

  // Keep the api reference fresh for assertions made after re-renders.
  React.useEffect(() => {
    if (tabId) onTabsReady?.(tabs);
  }, [tabs, tabId, onTabsReady]);

  const activeTab = tabs.tabs.find((t) => t.id === tabId);
  if (!activeTab) return null;

  return (
    <MarkdownPreview
      content={activeTab.content}
      darkMode={false}
      onContentChange={(c) => tabs.updateTabContent(activeTab.id, c)}
    />
  );
};

async function setupHarness(initialContent: string) {
  let tabsApi: ReturnType<typeof useTabsDesktop> | undefined;
  const result = render(
    <PreviewWiredToTabs
      initialContent={initialContent}
      onTabsReady={(api) => {
        tabsApi = api;
      }}
    />,
  );

  await waitFor(() => {
    expect(
      result.container.querySelector('input.markdown-checkbox'),
    ).not.toBeNull();
  });

  return { result, getTabsApi: () => tabsApi! };
}

describe('E-INT-CBP: checkbox click propagates to React state and Monaco model', () => {
  beforeEach(() => {
    syncModelForTabMock.mockClear();
  });

  // E-INT-CBP-01: clicking a checkbox in Preview must (a) update the tab's
  // React-state content and (b) push the new content into the Monaco model
  // via syncModelForTab. Either half failing is the recurring "preview click
  // doesn't reflect in editor" bug.
  it('E-INT-CBP-01: click updates React state AND syncs Monaco model', async () => {
    const { result, getTabsApi } = await setupHarness('- [ ] Buy milk');

    const checkbox = result.container.querySelector(
      'input.markdown-checkbox',
    ) as HTMLInputElement;
    expect(checkbox).not.toBeNull();

    checkbox.checked = true;
    fireEvent.change(checkbox);

    await waitFor(() => {
      expect(getTabsApi().tabs[0].content).toBe('- [x] Buy milk');
    });

    // Monaco model must also have been told about the new content. If this
    // assertion fails, the editor view will show stale `[ ]` even though
    // React state has `[x]` — exactly the regression we are guarding against.
    expect(syncModelForTabMock).toHaveBeenCalledWith(
      expect.any(String),
      '- [x] Buy milk',
    );
  });

  // E-INT-CBP-02: when the source has a malformed task line (no space after
  // `]`, not a GFM task), the preview renders only the well-formed task as a
  // checkbox. Clicking that single checkbox must toggle the well-formed line,
  // not the malformed one. This guards Preview.tsx's editor-line regex
  // staying aligned with marked's GFM rendering.
  it('E-INT-CBP-02: click targets the correct editor line when malformed task lines coexist', async () => {
    const initial = '- [ ]NoSpaceTask\n- [ ] RealTask';
    const { result, getTabsApi } = await setupHarness(initial);

    const checkboxes = result.container.querySelectorAll(
      'input.markdown-checkbox',
    );
    expect(checkboxes).toHaveLength(1);

    const checkbox = checkboxes[0] as HTMLInputElement;
    checkbox.checked = true;
    fireEvent.change(checkbox);

    await waitFor(() => {
      expect(getTabsApi().tabs[0].content).toBe(
        '- [ ]NoSpaceTask\n- [x] RealTask',
      );
    });

    expect(syncModelForTabMock).toHaveBeenCalledWith(
      expect.any(String),
      '- [ ]NoSpaceTask\n- [x] RealTask',
    );
  });

  // E-INT-CBP-03: the model sync must carry the post-toggle content, not the
  // pre-toggle content. Off-by-one mistakes here would cause the editor to
  // show the previous state.
  it('E-INT-CBP-03: syncModelForTab receives the post-toggle content, not the pre-toggle one', async () => {
    const { result } = await setupHarness('- [x] Done');

    const checkbox = result.container.querySelector(
      'input.markdown-checkbox',
    ) as HTMLInputElement;
    checkbox.checked = false;
    fireEvent.change(checkbox);

    await waitFor(() => {
      const calls = syncModelForTabMock.mock.calls;
      expect(
        calls.some(([, content]) => content === '- [ ] Done'),
      ).toBe(true);
    });

    // And it must NOT have been called with stale pre-toggle content as the
    // last invocation (defensive — guards against a future "sync then
    // re-sync with old value" bug).
    const calls = syncModelForTabMock.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall?.[1]).toBe('- [ ] Done');
  });

  // E-INT-CBP-04: the nested document from the bug report. With real marked,
  // parent items hold their children inside the <li>; every level must render
  // as a clickable checkbox and clicking the deepest item must toggle ITS line
  // (it used to toggle line 2, because only leaves were numbered).
  it('E-INT-CBP-04: nested task lists toggle the clicked line at every level', async () => {
    const initial = '- [ ] aaaa\n  - [x] bbbbb\n    - [ ] ccccc\n- [ ] AAAAA\n  - [ ] BBBBB\n    - [ ] CCCCC';
    const { result, getTabsApi } = await setupHarness(initial);

    const checkboxes = result.container.querySelectorAll('input.markdown-checkbox');
    expect(checkboxes).toHaveLength(6);
    expect(result.container.querySelectorAll('input[type="checkbox"][disabled]')).toHaveLength(0);

    const last = checkboxes[5] as HTMLInputElement;
    last.checked = true;
    fireEvent.change(last);

    await waitFor(() => {
      expect(getTabsApi().tabs[0].content).toBe(
        '- [ ] aaaa\n  - [x] bbbbb\n    - [ ] ccccc\n- [ ] AAAAA\n  - [ ] BBBBB\n    - [x] CCCCC',
      );
    });

    // After the re-render, un-check the (now re-rendered) top-level parent.
    await waitFor(() => {
      const parent = result.container.querySelector('input.markdown-checkbox[data-checkbox-index="0"]');
      expect(parent).not.toBeNull();
    });
    const parent = result.container.querySelector(
      'input.markdown-checkbox[data-checkbox-index="0"]',
    ) as HTMLInputElement;
    parent.checked = true;
    fireEvent.change(parent);

    await waitFor(() => {
      expect(getTabsApi().tabs[0].content).toBe(
        '- [x] aaaa\n  - [x] bbbbb\n    - [ ] ccccc\n- [ ] AAAAA\n  - [ ] BBBBB\n    - [x] CCCCC',
      );
    });
    expect(syncModelForTabMock).toHaveBeenLastCalledWith(
      expect.any(String),
      '- [x] aaaa\n  - [x] bbbbb\n    - [ ] ccccc\n- [ ] AAAAA\n  - [ ] BBBBB\n    - [x] CCCCC',
    );
  });

  // E-INT-CBP-05: a task-looking line inside a code fence is not a checkbox
  // and must not shift the mapping of the real items after it.
  it('E-INT-CBP-05: task-like text in a code fence does not shift the mapping', async () => {
    const initial = '```\n- [ ] not a task\n```\n\n- [ ] first\n- [ ] second';
    const { result, getTabsApi } = await setupHarness(initial);

    const checkboxes = result.container.querySelectorAll('input.markdown-checkbox');
    expect(checkboxes).toHaveLength(2);

    const second = checkboxes[1] as HTMLInputElement;
    second.checked = true;
    fireEvent.change(second);

    await waitFor(() => {
      expect(getTabsApi().tabs[0].content).toBe(
        '```\n- [ ] not a task\n```\n\n- [ ] first\n- [x] second',
      );
    });
  });
});
