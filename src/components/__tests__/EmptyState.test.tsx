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

import EmptyState from '../EmptyState';
import { storeApi } from '../../api/storeApi';

const createProps = () => ({
  onNewTab: vi.fn(),
  onOpenFile: vi.fn(),
  onRecentFileSelect: vi.fn(),
  t: (key: string) => key,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EmptyState', () => {
  // T-ES-01: renders app icon
  it('T-ES-01: renders app icon', () => {
    render(<EmptyState {...createProps()} />);
    const icon = screen.getByAltText('Bokuchi');
    expect(icon).toBeInTheDocument();
  });

  // T-ES-02: renders new file and open file buttons
  it('T-ES-02: renders action buttons', () => {
    render(<EmptyState {...createProps()} />);
    expect(screen.getByText('emptyState.newFile')).toBeInTheDocument();
    expect(screen.getByText('emptyState.openFile')).toBeInTheDocument();
  });

  // T-ES-03: renders keyboard shortcuts
  it('T-ES-03: renders keyboard shortcuts', () => {
    render(<EmptyState {...createProps()} />);
    expect(screen.getByText('Ctrl+N')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+O')).toBeInTheDocument();
  });

  // T-ES-04: new file button calls onNewTab
  it('T-ES-04: new file button calls onNewTab', () => {
    const props = createProps();
    render(<EmptyState {...props} />);
    fireEvent.click(screen.getByText('emptyState.newFile'));
    expect(props.onNewTab).toHaveBeenCalledOnce();
  });

  // T-ES-05: open file button calls onOpenFile
  it('T-ES-05: open file button calls onOpenFile', () => {
    const props = createProps();
    render(<EmptyState {...props} />);
    fireEvent.click(screen.getByText('emptyState.openFile'));
    expect(props.onOpenFile).toHaveBeenCalledOnce();
  });

  // T-ES-06: hides recent files section when no files
  it('T-ES-06: hides recent files section when no files', () => {
    render(<EmptyState {...createProps()} />);
    expect(screen.queryByText('emptyState.recentFiles')).not.toBeInTheDocument();
  });

  // T-ES-07: shows recent files when available
  it('T-ES-07: shows recent files when available', async () => {
    const mockFiles = [
      { id: '1', filePath: '/home/user/docs/readme.md', fileName: 'readme.md', lastOpened: Date.now(), openCount: 1 },
      { id: '2', filePath: '/home/user/notes.md', fileName: 'notes.md', lastOpened: Date.now(), openCount: 2 },
    ];
    vi.mocked(storeApi.loadRecentFiles).mockResolvedValue(mockFiles);

    render(<EmptyState {...createProps()} />);

    await waitFor(() => {
      expect(screen.getByText('readme.md')).toBeInTheDocument();
      expect(screen.getByText('notes.md')).toBeInTheDocument();
    });
    expect(screen.getByText('emptyState.recentFiles')).toBeInTheDocument();
  });

  // T-ES-08: limits recent files to 5
  it('T-ES-08: limits recent files to 5', async () => {
    const mockFiles = Array.from({ length: 8 }, (_, i) => ({
      id: String(i),
      filePath: `/path/file${i}.md`,
      fileName: `file${i}.md`,
      lastOpened: Date.now(),
      openCount: 1,
    }));
    vi.mocked(storeApi.loadRecentFiles).mockResolvedValue(mockFiles);

    render(<EmptyState {...createProps()} />);

    await waitFor(() => {
      expect(screen.getByText('file0.md')).toBeInTheDocument();
      expect(screen.getByText('file4.md')).toBeInTheDocument();
    });
    expect(screen.queryByText('file5.md')).not.toBeInTheDocument();
  });

  // T-ES-09: clicking recent file calls onRecentFileSelect with path
  it('T-ES-09: clicking recent file calls onRecentFileSelect', async () => {
    const mockFiles = [
      { id: '1', filePath: '/home/user/docs/readme.md', fileName: 'readme.md', lastOpened: Date.now(), openCount: 1 },
    ];
    vi.mocked(storeApi.loadRecentFiles).mockResolvedValue(mockFiles);

    const props = createProps();
    render(<EmptyState {...props} />);

    await waitFor(() => {
      expect(screen.getByText('readme.md')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('readme.md'));
    expect(props.onRecentFileSelect).toHaveBeenCalledWith('/home/user/docs/readme.md');
  });

  // T-ES-10: shows directory path for recent files
  it('T-ES-10: shows directory path for recent files', async () => {
    const mockFiles = [
      { id: '1', filePath: '/home/user/docs/readme.md', fileName: 'readme.md', lastOpened: Date.now(), openCount: 1 },
    ];
    vi.mocked(storeApi.loadRecentFiles).mockResolvedValue(mockFiles);

    render(<EmptyState {...createProps()} />);

    await waitFor(() => {
      expect(screen.getByText('/home/user/docs')).toBeInTheDocument();
    });
  });

  // T-ES-11: handles loadRecentFiles failure gracefully
  it('T-ES-11: handles loadRecentFiles failure gracefully', async () => {
    vi.mocked(storeApi.loadRecentFiles).mockRejectedValue(new Error('fail'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<EmptyState {...createProps()} />);

    // Should still render buttons without crashing
    await waitFor(() => {
      expect(screen.getByText('emptyState.newFile')).toBeInTheDocument();
    });
    expect(screen.queryByText('emptyState.recentFiles')).not.toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
