import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { AppSettings } from '../../types/settings';

// Mock child components to isolate AppDialogs testing
vi.mock('../Settings', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? <div data-testid="settings-dialog"><button onClick={onClose}>close-settings</button></div> : null,
}));

vi.mock('../Help', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? <div data-testid="help-dialog"><button onClick={onClose}>close-help</button></div> : null,
}));

vi.mock('../FileChangeDialog', () => ({
  default: ({ open, onReload, onCancel }: { open: boolean; onReload: () => void; onCancel: () => void }) =>
    open ? (
      <div data-testid="file-change-dialog">
        <button onClick={onReload}>reload</button>
        <button onClick={onCancel}>cancel-file-change</button>
      </div>
    ) : null,
}));

vi.mock('../SaveBeforeCloseDialog', () => ({
  default: ({
    open,
    onSave,
    onDontSave,
    onCancel,
  }: {
    open: boolean;
    onSave: () => void;
    onDontSave: () => void;
    onCancel: () => void;
  }) =>
    open ? (
      <div data-testid="save-before-close-dialog">
        <button onClick={onSave}>save</button>
        <button onClick={onDontSave}>dont-save</button>
        <button onClick={onCancel}>cancel-save</button>
      </div>
    ) : null,
}));

vi.mock('../WhatsNewDialog', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? <div data-testid="whats-new-dialog"><button onClick={onClose}>close-whats-new</button></div> : null,
}));

vi.mock('../UpdateDialog', () => ({
  default: ({
    open,
    onUpdate,
    onDismiss,
  }: {
    open: boolean;
    onUpdate: () => void;
    onDismiss: () => void;
  }) =>
    open ? (
      <div data-testid="update-dialog">
        <button onClick={onUpdate}>update</button>
        <button onClick={onDismiss}>dismiss</button>
      </div>
    ) : null,
}));

import AppDialogs from '../AppDialogs';
import type { AppDialogsProps } from '../AppDialogs';
import { asMock } from '../../test-utils';

describe('AppDialogs', () => {
  const createDefaultProps = (): AppDialogsProps => ({
    snackbar: { open: false, message: '', severity: 'success' as const },
    isAtLimit: false,
    currentZoom: 1.0,
    ZOOM_CONFIG: { maxZoom: 2.0, minZoom: 0.5 },
    settingsOpen: false,
    settings: {} as AppSettings,
    helpOpen: false,
    fileChangeDialog: {
      open: false,
      fileName: '',
      onReload: asMock<() => void>(vi.fn()),
      onCancel: asMock<() => void>(vi.fn()),
    },
    saveBeforeCloseDialog: {
      open: false,
      fileName: '',
      tabId: null,
    },
    whatsNewOpen: false,
    onWhatsNewClose: asMock<() => void>(vi.fn()),
    updateDialogOpen: false,
    updateDialogPhase: 'notify' as const,
    updateInfo: null,
    updateDownloadProgress: null,
    onCloseSnackbar: asMock<() => void>(vi.fn()),
    onSettingsClose: asMock<() => void>(vi.fn()),
    onSettingsChange: asMock<() => void>(vi.fn()),
    onHelpClose: asMock<() => void>(vi.fn()),
    onSaveBeforeClose: asMock<() => void>(vi.fn()),
    onDontSaveBeforeClose: asMock<() => void>(vi.fn()),
    onCancelBeforeClose: asMock<() => void>(vi.fn()),
    onUpdate: asMock<() => void>(vi.fn()),
    onDismissUpdate: asMock<() => void>(vi.fn()),
    t: (key: string) => key,
  });

  let props: ReturnType<typeof createDefaultProps>;

  beforeEach(() => {
    props = createDefaultProps();
  });

  // T-AD-01: snackbar shows when open
  it('T-AD-01: renders snackbar when open', () => {
    props.snackbar = { open: true, message: 'File saved!', severity: 'success' };
    render(<AppDialogs {...props} />);
    expect(screen.getByText('File saved!')).toBeInTheDocument();
  });

  // T-AD-02: snackbar hidden when closed
  it('T-AD-02: snackbar is not visible when closed', () => {
    render(<AppDialogs {...props} />);
    expect(screen.queryByText('File saved!')).not.toBeInTheDocument();
  });

  // T-AD-03: settings dialog opens
  it('T-AD-03: renders settings dialog when settingsOpen is true', () => {
    props.settingsOpen = true;
    render(<AppDialogs {...props} />);
    expect(screen.getByTestId('settings-dialog')).toBeInTheDocument();
  });

  // T-AD-04: help dialog opens
  it('T-AD-04: renders help dialog when helpOpen is true', () => {
    props.helpOpen = true;
    render(<AppDialogs {...props} />);
    expect(screen.getByTestId('help-dialog')).toBeInTheDocument();
  });

  // T-AD-05: file change dialog opens
  it('T-AD-05: renders file change dialog when open', () => {
    props.fileChangeDialog = {
      open: true,
      fileName: 'test.md',
      onReload: vi.fn(),
      onCancel: vi.fn(),
    };
    render(<AppDialogs {...props} />);
    expect(screen.getByTestId('file-change-dialog')).toBeInTheDocument();
  });

  // T-AD-06: save before close dialog opens
  it('T-AD-06: renders save before close dialog when open', () => {
    props.saveBeforeCloseDialog = {
      open: true,
      fileName: 'test.md',
      tabId: 'tab1',
    };
    render(<AppDialogs {...props} />);
    expect(screen.getByTestId('save-before-close-dialog')).toBeInTheDocument();
  });

  // T-AD-07: update dialog opens
  it('T-AD-07: renders update dialog when open', () => {
    props.updateDialogOpen = true;
    render(<AppDialogs {...props} />);
    expect(screen.getByTestId('update-dialog')).toBeInTheDocument();
  });

  // T-AD-08: save before close callbacks
  it('T-AD-08: save before close dialog callbacks work', () => {
    props.saveBeforeCloseDialog = { open: true, fileName: 'test.md', tabId: 'tab1' as string | null };
    render(<AppDialogs {...props} />);
    fireEvent.click(screen.getByText('save'));
    expect(props.onSaveBeforeClose).toHaveBeenCalledTimes(1);
  });

  // T-AD-09: zoom limit warning shows at max
  it('T-AD-09: shows zoom max limit warning', () => {
    props.isAtLimit = true;
    props.currentZoom = 2.0;
    render(<AppDialogs {...props} />);
    expect(screen.getByText('zoom.maxLimitReached')).toBeInTheDocument();
  });

  // T-AD-10: zoom limit warning shows at min
  it('T-AD-10: shows zoom min limit warning', () => {
    props.isAtLimit = true;
    props.currentZoom = 0.3;
    render(<AppDialogs {...props} />);
    expect(screen.getByText('zoom.minLimitReached')).toBeInTheDocument();
  });

  // T-AD-11: all dialogs hidden by default
  it('T-AD-11: no dialogs are visible by default', () => {
    render(<AppDialogs {...props} />);
    expect(screen.queryByTestId('settings-dialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('help-dialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('file-change-dialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('save-before-close-dialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('update-dialog')).not.toBeInTheDocument();
  });
});
