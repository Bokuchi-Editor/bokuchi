import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

// Capture onScrollChange from Editor so tests can simulate scroll events
let capturedOnScrollChange: ((fraction: number) => void) | undefined;

// Mock heavy child components
vi.mock('../Editor', () => ({
  default: ({ onScrollChange }: { onScrollChange?: (fraction: number) => void }) => {
    capturedOnScrollChange = onScrollChange;
    return <div data-testid="editor">Editor</div>;
  },
}));

vi.mock('../Preview', () => ({
  default: ({ scrollFraction }: { scrollFraction?: number }) => (
    <div data-testid="preview" data-scroll-fraction={scrollFraction ?? ''}>Preview</div>
  ),
}));

vi.mock('../TabBar', () => ({
  default: ({ tabs }: { tabs: { id: string; title: string }[] }) => (
    <div data-testid="tab-bar">
      {tabs.map((t) => <span key={t.id}>{t.title}</span>)}
    </div>
  ),
}));

vi.mock('../OutlinePanel', () => ({
  default: () => <div data-testid="outline-panel">Outline</div>,
}));

vi.mock('../FolderTreePanel', () => ({
  default: () => <div data-testid="folder-tree-panel">FolderTree</div>,
}));

vi.mock('../EmptyState', () => ({
  default: () => <div data-testid="empty-state">EmptyState</div>,
}));

vi.mock('../../hooks/useOutlineHeadings', () => ({
  useOutlineHeadings: () => [],
}));

import AppContent from '../AppContent';

const createDefaultProps = () => ({
  tabLayout: 'horizontal' as const,
  viewMode: 'split' as const,
  tabs: [
    { id: 'tab1', title: 'test.md', content: '# Hello', isModified: false, isNew: false },
  ],
  activeTabId: 'tab1',
  activeTab: { id: 'tab1', title: 'test.md', content: '# Hello', isModified: false, isNew: false },
  theme: 'default',
  globalVariables: {},
  currentZoom: 1.0,
  isInitialized: true,
  isSettingsLoaded: true,
  outlineDisplayMode: 'persistent' as const,
  outlinePanelOpen: false,
  onOutlinePanelClose: vi.fn(),
  folderTreeDisplayMode: 'off' as const,
  folderTreePanelOpen: false,
  folderTreeRootFolderName: null,
  folderTree: [],
  folderTreeIsLoading: false,
  onFolderTreeFileClick: vi.fn(),
  onFolderTreeToggleExpand: vi.fn(),
  onFolderTreeOpenFolder: vi.fn(),
  onFolderTreeCloseFolder: vi.fn(),
  onFolderTreeRefresh: vi.fn(),
  onFolderTreePanelClose: vi.fn(),
  onTabChange: vi.fn(),
  onTabClose: vi.fn(),
  onNewTab: vi.fn(),
  onOpenFile: vi.fn(),
  onRecentFileSelect: vi.fn(),
  onTabReorder: vi.fn(),
  onContentChange: vi.fn(),
  onStatusChange: vi.fn(),
  onSnackbar: vi.fn(),
  t: (key: string) => key,
});

describe('AppContent', () => {
  // T-AC-01: renders split view with editor and preview
  it('T-AC-01: renders editor and preview in split view', () => {
    render(<AppContent {...createDefaultProps()} />);
    expect(screen.getByTestId('editor')).toBeInTheDocument();
    expect(screen.getByTestId('preview')).toBeInTheDocument();
  });

  // T-AC-02: editor only mode
  it('T-AC-02: renders only editor in editor mode', () => {
    render(<AppContent {...createDefaultProps()} viewMode="editor" />);
    expect(screen.getByTestId('editor')).toBeInTheDocument();
    expect(screen.queryByTestId('preview')).not.toBeInTheDocument();
  });

  // T-AC-03: preview only mode
  it('T-AC-03: renders only preview in preview mode', () => {
    render(<AppContent {...createDefaultProps()} viewMode="preview" />);
    expect(screen.queryByTestId('editor')).not.toBeInTheDocument();
    expect(screen.getByTestId('preview')).toBeInTheDocument();
  });

  // T-AC-04: loading state
  it('T-AC-04: shows loading when not initialized', () => {
    render(<AppContent {...createDefaultProps()} isInitialized={false} />);
    expect(screen.getByText('app.loading')).toBeInTheDocument();
  });

  // T-AC-05: empty state shown when tabs is empty
  it('T-AC-05: shows empty state when tabs is empty', () => {
    render(<AppContent {...createDefaultProps()} tabs={[]} activeTab={null} activeTabId={null} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  // T-AC-06: horizontal tab bar rendered
  it('T-AC-06: renders tab bar', () => {
    render(<AppContent {...createDefaultProps()} />);
    expect(screen.getByTestId('tab-bar')).toBeInTheDocument();
  });

  // T-AC-07: outline panel shown when persistent and open
  it('T-AC-07: renders outline panel when persistent and open', () => {
    render(<AppContent {...createDefaultProps()} outlinePanelOpen={true} />);
    expect(screen.getByTestId('outline-panel')).toBeInTheDocument();
  });

  // T-AC-08: outline panel hidden when not open
  it('T-AC-08: hides outline panel when not open', () => {
    render(<AppContent {...createDefaultProps()} outlinePanelOpen={false} />);
    expect(screen.queryByTestId('outline-panel')).not.toBeInTheDocument();
  });

  // T-AC-09: folder tree panel shown when persistent and open
  it('T-AC-09: renders folder tree panel when persistent and open', () => {
    render(
      <AppContent
        {...createDefaultProps()}
        folderTreeDisplayMode="persistent"
        folderTreePanelOpen={true}
        folderTreeRootFolderName="project"
      />,
    );
    expect(screen.getByTestId('folder-tree-panel')).toBeInTheDocument();
  });

  // T-AC-10: settings not loaded shows loading
  it('T-AC-10: shows loading when settings not loaded', () => {
    render(<AppContent {...createDefaultProps()} isSettingsLoaded={false} />);
    expect(screen.getByText('app.loading')).toBeInTheDocument();
  });

  // T-AC-11: new tab starts with scrollFraction 0
  it('T-AC-11: new tab starts with scrollFraction 0', () => {
    const tab = { id: 'new-tab', title: 'Untitled', content: '', isModified: false, isNew: true };
    render(
      <AppContent
        {...createDefaultProps()}
        tabs={[tab]}
        activeTabId="new-tab"
        activeTab={tab}
      />,
    );
    const preview = screen.getByTestId('preview');
    expect(preview.getAttribute('data-scroll-fraction')).toBe('0');
  });

  // T-AC-12: scroll position is preserved per tab when switching
  it('T-AC-12: scroll position preserved per tab on switch', () => {
    const tab1 = { id: 'tab1', title: 'a.md', content: '# A', isModified: false, isNew: false };
    const tab2 = { id: 'tab2', title: 'b.md', content: '# B', isModified: false, isNew: false };
    const allTabs = [tab1, tab2];

    // Render with tab1 active
    const { rerender } = render(
      <AppContent {...createDefaultProps()} tabs={allTabs} activeTabId="tab1" activeTab={tab1} />,
    );

    // Simulate scrolling tab1 to 0.7
    act(() => { capturedOnScrollChange?.(0.7); });

    // Switch to tab2
    rerender(
      <AppContent {...createDefaultProps()} tabs={allTabs} activeTabId="tab2" activeTab={tab2} />,
    );
    // tab2 should have scrollFraction 0 (never scrolled)
    expect(screen.getByTestId('preview').getAttribute('data-scroll-fraction')).toBe('0');

    // Simulate scrolling tab2 to 0.3
    act(() => { capturedOnScrollChange?.(0.3); });

    // Switch back to tab1
    rerender(
      <AppContent {...createDefaultProps()} tabs={allTabs} activeTabId="tab1" activeTab={tab1} />,
    );
    // tab1 should restore to 0.7
    expect(screen.getByTestId('preview').getAttribute('data-scroll-fraction')).toBe('0.7');

    // Switch back to tab2
    rerender(
      <AppContent {...createDefaultProps()} tabs={allTabs} activeTabId="tab2" activeTab={tab2} />,
    );
    // tab2 should restore to 0.3
    expect(screen.getByTestId('preview').getAttribute('data-scroll-fraction')).toBe('0.3');
  });
});
