import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../api/storeApi', () => ({
  storeApi: {
    loadRecentFiles: vi.fn().mockResolvedValue([]),
    removeRecentFile: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../api/desktopApi', () => ({
  desktopApi: {
    readFileByPath: vi.fn().mockResolvedValue({ content: 'hello', error: null }),
  },
}));

import RecentFilesDialog from '../RecentFilesDialog';
import { storeApi } from '../../api/storeApi';

const sampleFiles = [
  {
    id: 'r1',
    filePath: '/docs/readme.md',
    fileName: 'readme.md',
    lastOpened: Date.now() - 60000,
    openCount: 3,
    fileSize: 2048,
    preview: 'Hello world',
  },
  {
    id: 'r2',
    filePath: '/docs/notes.md',
    fileName: 'notes.md',
    lastOpened: Date.now() - 3600000,
    openCount: 1,
    fileSize: 512,
  },
];

describe('RecentFilesDialog', () => {
  let onClose: ReturnType<typeof vi.fn>;
  let onFileSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClose = vi.fn();
    onFileSelect = vi.fn();
    vi.mocked(storeApi.loadRecentFiles).mockResolvedValue(sampleFiles);
  });

  const renderDialog = (open = true) =>
    render(
      <RecentFilesDialog
        open={open}
        onClose={onClose}
        onFileSelect={onFileSelect}
        t={(key: string) => key}
      />,
    );

  // T-RFD-01: renders dialog
  it('T-RFD-01: renders dialog when open', async () => {
    renderDialog();
    await waitFor(() => {
      expect(screen.getByText('recentFiles.dialogTitle')).toBeInTheDocument();
    });
  });

  // T-RFD-02: hidden when closed
  it('T-RFD-02: does not render when open is false', () => {
    renderDialog(false);
    expect(screen.queryByText('recentFiles.dialogTitle')).not.toBeInTheDocument();
  });

  // T-RFD-03: displays recent files
  it('T-RFD-03: displays loaded recent files', async () => {
    renderDialog();
    await waitFor(() => {
      expect(screen.getByText('readme.md')).toBeInTheDocument();
      expect(screen.getByText('notes.md')).toBeInTheDocument();
    });
  });

  // T-RFD-04: search filters files
  it('T-RFD-04: filters files based on search query', async () => {
    renderDialog();
    await waitFor(() => {
      expect(screen.getByText('readme.md')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('recentFiles.searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: 'readme' } });

    await waitFor(() => {
      expect(screen.getByText('readme.md')).toBeInTheDocument();
      expect(screen.queryByText('notes.md')).not.toBeInTheDocument();
    });
  });

  // T-RFD-05: no results message
  it('T-RFD-05: shows no results message when search has no matches', async () => {
    renderDialog();
    await waitFor(() => {
      expect(screen.getByText('readme.md')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('recentFiles.searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('recentFiles.noResults')).toBeInTheDocument();
    });
  });

  // T-RFD-06: cancel button calls onClose
  it('T-RFD-06: calls onClose when cancel button is clicked', async () => {
    renderDialog();
    await waitFor(() => {
      expect(screen.getByText('buttons.cancel')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('buttons.cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // T-RFD-07: empty state when no recent files
  it('T-RFD-07: shows no files message when list is empty', async () => {
    vi.mocked(storeApi.loadRecentFiles).mockResolvedValue([]);
    renderDialog();
    await waitFor(() => {
      expect(screen.getByText('recentFiles.noFiles')).toBeInTheDocument();
    });
  });

  // T-RFD-08: displays open count badge
  it('T-RFD-08: shows open count chip for files opened more than once', async () => {
    renderDialog();
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument(); // openCount for readme.md
    });
  });
});
