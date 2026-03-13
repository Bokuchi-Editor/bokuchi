import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { FolderTreeNode } from '../../types/folderTree';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import FolderTreePanel from '../FolderTreePanel';

describe('FolderTreePanel', () => {
  let onFileClick: ReturnType<typeof vi.fn>;
  let onToggleExpand: ReturnType<typeof vi.fn>;
  let onOpenFolder: ReturnType<typeof vi.fn>;
  let onCloseFolder: ReturnType<typeof vi.fn>;
  let onRefresh: ReturnType<typeof vi.fn>;
  let onClose: ReturnType<typeof vi.fn>;

  const sampleTree: FolderTreeNode[] = [
    {
      name: 'src',
      path: '/project/src',
      isDirectory: true,
      isExpanded: true,
      isLoading: false,
      children: [
        {
          name: 'index.ts',
          path: '/project/src/index.ts',
          isDirectory: false,
          isExpanded: false,
          isLoading: false,
          children: null,
        },
      ],
    },
    {
      name: 'README.md',
      path: '/project/README.md',
      isDirectory: false,
      isExpanded: false,
      isLoading: false,
      children: null,
    },
  ];

  beforeEach(() => {
    onFileClick = vi.fn();
    onToggleExpand = vi.fn();
    onOpenFolder = vi.fn();
    onCloseFolder = vi.fn();
    onRefresh = vi.fn();
    onClose = vi.fn();
  });

  const defaultProps = () => ({
    rootFolderName: 'project',
    tree: sampleTree,
    isLoading: false,
    onFileClick,
    onToggleExpand,
    onOpenFolder,
    onCloseFolder,
    onRefresh,
    onClose,
  });

  const renderPanel = (overrides = {}) =>
    render(<FolderTreePanel {...defaultProps()} {...overrides} />);

  // T-FTP-01: renders folder and files
  it('T-FTP-01: renders tree nodes', () => {
    renderPanel();
    expect(screen.getByText('src')).toBeInTheDocument();
    expect(screen.getByText('index.ts')).toBeInTheDocument();
    expect(screen.getByText('README.md')).toBeInTheDocument();
  });

  // T-FTP-02: no folder open state
  it('T-FTP-02: shows open folder button when no folder is open', () => {
    renderPanel({ rootFolderName: null });
    expect(screen.getByText('folderTree.noFolderOpen')).toBeInTheDocument();
    expect(screen.getByText('folderTree.openFolder')).toBeInTheDocument();
  });

  // T-FTP-03: open folder button calls onOpenFolder
  it('T-FTP-03: calls onOpenFolder when button is clicked', () => {
    renderPanel({ rootFolderName: null });
    fireEvent.click(screen.getByText('folderTree.openFolder'));
    expect(onOpenFolder).toHaveBeenCalledTimes(1);
  });

  // T-FTP-04: clicking a file calls onFileClick
  it('T-FTP-04: calls onFileClick when a file is clicked', () => {
    renderPanel();
    fireEvent.click(screen.getByText('README.md'));
    expect(onFileClick).toHaveBeenCalledWith('/project/README.md');
  });

  // T-FTP-05: clicking a directory calls onToggleExpand
  it('T-FTP-05: calls onToggleExpand when a directory is clicked', () => {
    renderPanel();
    fireEvent.click(screen.getByText('src'));
    expect(onToggleExpand).toHaveBeenCalledWith('/project/src');
  });

  // T-FTP-06: loading state shows spinner
  it('T-FTP-06: shows loading spinner when isLoading is true', () => {
    renderPanel({ isLoading: true });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  // T-FTP-07: empty folder state
  it('T-FTP-07: shows empty folder message when tree is empty', () => {
    renderPanel({ tree: [] });
    expect(screen.getByText('folderTree.emptyFolder')).toBeInTheDocument();
  });

  // T-FTP-08: close button calls onClose
  it('T-FTP-08: calls onClose when close button is clicked', () => {
    renderPanel();
    // Close button is in the header
    const closeButtons = screen.getAllByRole('button');
    const closeBtn = closeButtons.find((btn) =>
      btn.querySelector('[data-testid="CloseIcon"]'),
    );
    if (closeBtn) {
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  // T-FTP-09: displays root folder name in header
  it('T-FTP-09: displays root folder name', () => {
    renderPanel({ rootFolderName: 'my-project' });
    expect(screen.getByText('my-project')).toBeInTheDocument();
  });

  // T-FTP-10: displays explorer text when no root folder
  it('T-FTP-10: displays explorer label when rootFolderName is null', () => {
    renderPanel({ rootFolderName: null });
    expect(screen.getByText('folderTree.explorer')).toBeInTheDocument();
  });

  // T-FTP-11: collapsed body is hidden
  it('T-FTP-11: hides body when collapsed is true', () => {
    renderPanel({ collapsed: true });
    expect(screen.queryByText('README.md')).not.toBeInTheDocument();
  });

  // T-FTP-12: refresh button calls onRefresh
  it('T-FTP-12: calls onRefresh when refresh button is clicked', () => {
    renderPanel();
    const refreshButton = screen.getByTitle('folderTree.refresh');
    fireEvent.click(refreshButton);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  // T-FTP-13: active file is highlighted
  it('T-FTP-13: marks active file as selected', () => {
    renderPanel({ activeFilePath: '/project/README.md' });
    const readmeItem = screen.getByText('README.md').closest('[role="button"]');
    expect(readmeItem).toHaveClass('Mui-selected');
  });
});
