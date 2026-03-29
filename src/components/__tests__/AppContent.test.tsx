import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

// Mock heavy child components
vi.mock('../Editor', () => ({
  default: () => <div data-testid="editor">Editor</div>,
}));

vi.mock('../Preview', () => ({
  default: () => <div data-testid="preview">Preview</div>,
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
});
