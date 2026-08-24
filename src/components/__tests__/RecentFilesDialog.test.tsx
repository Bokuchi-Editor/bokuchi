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
import { desktopApi } from '../../api/desktopApi';
import { asMock } from '../../test-utils';

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
    vi.mocked(storeApi.loadRecentFiles).mockClear().mockResolvedValue(sampleFiles);
    vi.mocked(storeApi.removeRecentFile).mockClear();
    vi.mocked(desktopApi.readFileByPath).mockResolvedValue({ content: 'hello' });
  });

  const renderDialog = (open = true) =>
    render(
      <RecentFilesDialog
        open={open}
        onClose={asMock<() => void>(onClose)}
        onFileSelect={asMock<(filePath: string) => void>(onFileSelect)}
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

  // T-RFD-09: clicking a file item opens it and closes the dialog
  it('T-RFD-09: calls onFileSelect and onClose when a readable file is clicked', async () => {
    renderDialog();
    await waitFor(() => {
      expect(screen.getByText('readme.md')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('readme.md'));

    await waitFor(() => {
      expect(onFileSelect).toHaveBeenCalledWith('/docs/readme.md');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(desktopApi.readFileByPath)).toHaveBeenCalledWith('/docs/readme.md');
  });

  // T-RFD-10: unreadable file shows an error, is removed from recents, and list is reloaded
  it('T-RFD-10: shows fileNotFound and removes entry when file cannot be read', async () => {
    vi.mocked(desktopApi.readFileByPath).mockResolvedValue({ content: '', error: 'File not found' });
    renderDialog();
    await waitFor(() => {
      expect(screen.getByText('readme.md')).toBeInTheDocument();
    });
    // Dialog-open effect already triggered one load
    expect(vi.mocked(storeApi.loadRecentFiles)).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('readme.md'));

    await waitFor(() => {
      expect(screen.getByText('recentFiles.fileNotFound')).toBeInTheDocument();
    });
    expect(vi.mocked(storeApi.removeRecentFile)).toHaveBeenCalledWith('/docs/readme.md');
    // List is reloaded after removal
    expect(vi.mocked(storeApi.loadRecentFiles)).toHaveBeenCalledTimes(2);
    expect(onFileSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  // Open the context menu on the readme.md list item and wait for it to appear
  const openContextMenuOnReadme = async () => {
    await waitFor(() => {
      expect(screen.getByText('readme.md')).toBeInTheDocument();
    });
    fireEvent.contextMenu(screen.getByText('readme.md'));
    await waitFor(() => {
      expect(screen.getByText('recentFiles.removeFromRecent')).toBeInTheDocument();
    });
  };

  // T-RFD-11: context menu "remove from recent" removes the right-clicked entry
  it('T-RFD-11: removes the file and reloads the list via context menu', async () => {
    renderDialog();
    await openContextMenuOnReadme();
    // Dialog-open effect already triggered exactly one load
    expect(vi.mocked(storeApi.loadRecentFiles)).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('recentFiles.removeFromRecent'));

    await waitFor(() => {
      // Success snackbar proves the remove path (not the error catch) ran
      expect(screen.getByText('recentFiles.removedFromRecent')).toBeInTheDocument();
    });
    // The path of the right-clicked item (not some other entry) is removed
    expect(vi.mocked(storeApi.removeRecentFile)).toHaveBeenCalledWith('/docs/readme.md');
    // List is reloaded after removal so the UI reflects the new store state
    expect(vi.mocked(storeApi.loadRecentFiles)).toHaveBeenCalledTimes(2);
    // Removing from recents must not open the file
    expect(onFileSelect).not.toHaveBeenCalled();
  });

  // T-RFD-12: context menu "copy path" writes the file path to the clipboard
  it('T-RFD-12: copies the file path to the clipboard via context menu', async () => {
    // jsdom has no navigator.clipboard; install a stub the component can call
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    renderDialog();
    await openContextMenuOnReadme();

    fireEvent.click(screen.getByText('recentFiles.copyPath'));

    await waitFor(() => {
      // Success snackbar proves the resolved-write branch ran
      expect(screen.getByText('recentFiles.pathCopied')).toBeInTheDocument();
    });
    // The full path of the right-clicked item is what lands on the clipboard
    expect(writeText).toHaveBeenCalledWith('/docs/readme.md');
    // Copying a path must not touch the recent-files store
    expect(vi.mocked(storeApi.removeRecentFile)).not.toHaveBeenCalled();
  });

  // T-RFD-13: clipboard write failure surfaces the error snackbar
  it('T-RFD-13: shows copyFailed when the clipboard write rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    renderDialog();
    await openContextMenuOnReadme();

    fireEvent.click(screen.getByText('recentFiles.copyPath'));

    await waitFor(() => {
      // The catch branch must report the failure instead of claiming success
      expect(screen.getByText('recentFiles.copyFailed')).toBeInTheDocument();
    });
    expect(screen.queryByText('recentFiles.pathCopied')).not.toBeInTheDocument();
  });
});
