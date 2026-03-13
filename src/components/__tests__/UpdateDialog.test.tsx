import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { UpdateInfo, DownloadProgress } from '../../api/updaterApi';
import type { UpdateDialogPhase } from '../UpdateDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string | number>) => {
      if (key === 'dialogs.update.newVersion' && opts?.version) {
        return `New version ${opts.version} available`;
      }
      return key;
    },
  }),
}));

import UpdateDialog from '../UpdateDialog';

describe('UpdateDialog', () => {
  let onUpdate: ReturnType<typeof vi.fn>;
  let onDismiss: ReturnType<typeof vi.fn>;

  const mockUpdateInfo: UpdateInfo = {
    available: true,
    version: '2.0.0',
    body: 'Bug fixes and improvements',
    date: '2026-01-01',
  };

  beforeEach(() => {
    onUpdate = vi.fn();
    onDismiss = vi.fn();
  });

  const renderDialog = (
    phase: UpdateDialogPhase = 'notify',
    updateInfo: UpdateInfo | null = mockUpdateInfo,
    downloadProgress: DownloadProgress | null = null,
    open = true,
  ) =>
    render(
      <UpdateDialog
        open={open}
        phase={phase}
        updateInfo={updateInfo}
        downloadProgress={downloadProgress}
        onUpdate={onUpdate}
        onDismiss={onDismiss}
      />,
    );

  // T-UD-01: renders notify phase with version info
  it('T-UD-01: renders notify phase with version info', () => {
    renderDialog('notify');
    expect(screen.getByText('New version 2.0.0 available')).toBeInTheDocument();
    expect(screen.getByText('Bug fixes and improvements')).toBeInTheDocument();
  });

  // T-UD-02: hidden when open=false
  it('T-UD-02: does not render when open is false', () => {
    renderDialog('notify', mockUpdateInfo, null, false);
    expect(screen.queryByText('dialogs.update.title')).not.toBeInTheDocument();
  });

  // T-UD-03: Update Now button calls onUpdate
  it('T-UD-03: calls onUpdate when Update Now is clicked', () => {
    renderDialog('notify');
    fireEvent.click(screen.getByText('dialogs.update.updateNow'));
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  // T-UD-04: Later button calls onDismiss
  it('T-UD-04: calls onDismiss when Later is clicked', () => {
    renderDialog('notify');
    fireEvent.click(screen.getByText('dialogs.update.later'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  // T-UD-05: downloading phase shows progress
  it('T-UD-05: renders downloading phase with downloading text', () => {
    renderDialog('downloading');
    expect(screen.getByText('dialogs.update.downloading')).toBeInTheDocument();
  });

  // T-UD-06: downloading phase with progress percentage
  it('T-UD-06: shows progress percentage when contentLength is known', () => {
    renderDialog('downloading', mockUpdateInfo, {
      contentLength: 1000,
      downloaded: 500,
    });
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  // T-UD-07: installing phase
  it('T-UD-07: renders installing phase', () => {
    renderDialog('installing');
    expect(screen.getByText('dialogs.update.installing')).toBeInTheDocument();
  });

  // T-UD-08: no action buttons during downloading
  it('T-UD-08: does not show action buttons during downloading', () => {
    renderDialog('downloading');
    expect(screen.queryByText('dialogs.update.updateNow')).not.toBeInTheDocument();
    expect(screen.queryByText('dialogs.update.later')).not.toBeInTheDocument();
  });

  // T-UD-09: notify phase without release notes body
  it('T-UD-09: renders notify phase without body when body is undefined', () => {
    const infoNoBody: UpdateInfo = { available: true, version: '2.0.0' };
    renderDialog('notify', infoNoBody);
    expect(screen.getByText('New version 2.0.0 available')).toBeInTheDocument();
    expect(screen.queryByText('dialogs.update.releaseNotes')).not.toBeInTheDocument();
  });

  // T-UD-10: indeterminate progress when contentLength is 0
  it('T-UD-10: does not show percentage when contentLength is 0', () => {
    renderDialog('downloading', mockUpdateInfo, {
      contentLength: 0,
      downloaded: 100,
    });
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});
