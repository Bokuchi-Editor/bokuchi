import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../api/storeApi', () => ({
  storeApi: {
    loadRecentFiles: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../utils/platform', () => ({
  formatKeyboardShortcut: (key: string, withShift?: boolean) =>
    withShift ? `Ctrl+Shift+${key}` : `Ctrl+${key}`,
}));

import AppHeader from '../AppHeader';
import { storeApi } from '../../api/storeApi';

describe('AppHeader', () => {
  const createDefaultProps = () => ({
    viewMode: 'split' as const,
    fileMenuAnchor: null as HTMLElement | null,
    activeTab: { id: '1', title: 'test.md', content: '', isModified: false, isNew: false },
    outlinePanelOpen: false,
    folderTreePanelOpen: false,
    folderTreeDisplayMode: 'persistent' as const,
    onViewModeChange: vi.fn(),
    onFileMenuOpen: vi.fn(),
    onFileMenuClose: vi.fn(),
    onNewTab: vi.fn(),
    onOpenFile: vi.fn(),
    onOpenFolder: vi.fn(),
    onSaveFile: vi.fn(),
    onSaveFileAs: vi.fn(),
    onSaveWithVariables: vi.fn(),
    onSettingsOpen: vi.fn(),
    onHelpOpen: vi.fn(),
    onRecentFileSelect: vi.fn(),
    onOutlineToggle: vi.fn(),
    onFolderTreeToggle: vi.fn(),
    t: (key: string) => key,
  });

  let props: ReturnType<typeof createDefaultProps>;

  beforeEach(() => {
    props = createDefaultProps();
    vi.mocked(storeApi.loadRecentFiles).mockResolvedValue([]);
  });

  // T-AH-01: renders app title
  it('T-AH-01: renders app title', () => {
    render(<AppHeader {...props} />);
    expect(screen.getByText('app.title')).toBeInTheDocument();
  });

  // T-AH-02: renders view mode toggle buttons
  it('T-AH-02: renders view mode toggle buttons', () => {
    render(<AppHeader {...props} />);
    expect(screen.getByLabelText('buttons.splitView')).toBeInTheDocument();
    expect(screen.getByLabelText('buttons.editorOnly')).toBeInTheDocument();
    expect(screen.getByLabelText('buttons.previewOnly')).toBeInTheDocument();
  });

  // T-AH-03: menu button calls onFileMenuOpen
  it('T-AH-03: calls onFileMenuOpen when menu button clicked', () => {
    render(<AppHeader {...props} />);
    const menuButtons = screen.getAllByRole('button');
    // MoreVert button is the last icon button
    const moreVertBtn = menuButtons[menuButtons.length - 1];
    fireEvent.click(moreVertBtn);
    expect(props.onFileMenuOpen).toHaveBeenCalled();
  });

  // T-AH-04: file menu shows menu items when anchor is set
  it('T-AH-04: renders file menu items when fileMenuAnchor is set', async () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    props.fileMenuAnchor = anchor;

    render(<AppHeader {...props} />);

    await waitFor(() => {
      expect(screen.getByText('buttons.newFile')).toBeInTheDocument();
      expect(screen.getByText('buttons.openFile')).toBeInTheDocument();
      expect(screen.getByText('buttons.save')).toBeInTheDocument();
      expect(screen.getByText('buttons.saveAs')).toBeInTheDocument();
    });

    document.body.removeChild(anchor);
  });

  // T-AH-05: new file menu item calls onNewTab
  it('T-AH-05: calls onNewTab when New File is clicked', async () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    props.fileMenuAnchor = anchor;

    render(<AppHeader {...props} />);

    await waitFor(() => {
      expect(screen.getByText('buttons.newFile')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('buttons.newFile'));
    expect(props.onNewTab).toHaveBeenCalledTimes(1);
    expect(props.onFileMenuClose).toHaveBeenCalled();

    document.body.removeChild(anchor);
  });

  // T-AH-06: loads recent files when menu opens
  it('T-AH-06: loads recent files when menu opens', async () => {
    const recentFiles = [
      { id: 'r1', filePath: '/test.md', fileName: 'test.md', lastOpened: 1000, openCount: 1 },
    ];
    vi.mocked(storeApi.loadRecentFiles).mockResolvedValue(recentFiles);

    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    props.fileMenuAnchor = anchor;

    render(<AppHeader {...props} />);

    await waitFor(() => {
      expect(screen.getByText('test.md')).toBeInTheDocument();
    });

    document.body.removeChild(anchor);
  });

  // T-AH-07: outline toggle button calls onOutlineToggle
  it('T-AH-07: calls onOutlineToggle when outline button clicked', () => {
    render(<AppHeader {...props} />);
    const buttons = screen.getAllByRole('button');
    // Find outline button (FormatListBulleted)
    const outlineBtn = buttons.find(btn =>
      btn.querySelector('[data-testid="FormatListBulletedIcon"]'),
    );
    if (outlineBtn) {
      fireEvent.click(outlineBtn);
      expect(props.onOutlineToggle).toHaveBeenCalledTimes(1);
    }
  });
});
