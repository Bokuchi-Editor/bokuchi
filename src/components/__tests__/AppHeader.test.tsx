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
import type { Tab } from '../../types/tab';
import type { FolderTreeDisplayMode } from '../../types/folderTree';

describe('AppHeader', () => {
  const createDefaultProps = () => ({
    viewMode: 'split' as const,
    fileMenuAnchor: null as HTMLElement | null,
    activeTab: { id: '1', title: 'test.md', content: '', isModified: false, isNew: false } as Tab | null,
    outlineActive: false,
    folderTreePanelOpen: false,
    folderTreeDisplayMode: 'persistent' as FolderTreeDisplayMode,
    rinActive: false,
    onViewModeChange: vi.fn(),
    onRinToggle: vi.fn(),
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
    // Locate the outline button via its icon's test id (no aria-label on the button)
    const outlineBtn = screen.getByTestId('FormatListBulletedIcon').closest('button');
    expect(outlineBtn).not.toBeNull();
    fireEvent.click(outlineBtn!);
    expect(props.onOutlineToggle).toHaveBeenCalledTimes(1);
  });

  // T-AH-08: save-related menu items are disabled when there is no active tab
  it('T-AH-08: disables Save / Save As / Save with Variables when activeTab is null', async () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    props.fileMenuAnchor = anchor;
    props.activeTab = null;

    render(<AppHeader {...props} />);

    await waitFor(() => {
      expect(screen.getByText('buttons.save')).toBeInTheDocument();
    });

    expect(screen.getByText('buttons.save').closest('li')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('buttons.saveAs').closest('li')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('buttons.saveWithVariables').closest('li')).toHaveAttribute('aria-disabled', 'true');
    // Non-save items remain enabled
    expect(screen.getByText('buttons.newFile').closest('li')).not.toHaveAttribute('aria-disabled');

    document.body.removeChild(anchor);
  });

  // T-AH-09: view mode toggle button fires onViewModeChange with the new mode
  it('T-AH-09: calls onViewModeChange with the selected mode on toggle click', () => {
    render(<AppHeader {...props} />);
    fireEvent.click(screen.getByLabelText('buttons.editorOnly'));
    expect(props.onViewModeChange).toHaveBeenCalledWith('editor');

    fireEvent.click(screen.getByLabelText('buttons.previewOnly'));
    expect(props.onViewModeChange).toHaveBeenCalledWith('preview');
  });

  // T-AH-10: folder tree button toggles the panel when display mode is not 'off'
  it("T-AH-10: calls onFolderTreeToggle when folderTreeDisplayMode is not 'off'", () => {
    render(<AppHeader {...props} />);
    const folderBtn = screen.getByTestId('AccountTreeIcon').closest('button');
    expect(folderBtn).not.toBeNull();
    fireEvent.click(folderBtn!);
    expect(props.onFolderTreeToggle).toHaveBeenCalledTimes(1);
    expect(props.onOpenFolder).not.toHaveBeenCalled();
  });

  // T-AH-11: folder tree button opens a folder when display mode is 'off'
  it("T-AH-11: calls onOpenFolder when folderTreeDisplayMode is 'off'", () => {
    props.folderTreeDisplayMode = 'off';
    render(<AppHeader {...props} />);
    const folderBtn = screen.getByTestId('AccountTreeIcon').closest('button');
    expect(folderBtn).not.toBeNull();
    fireEvent.click(folderBtn!);
    expect(props.onOpenFolder).toHaveBeenCalledTimes(1);
    expect(props.onFolderTreeToggle).not.toHaveBeenCalled();
  });
});
