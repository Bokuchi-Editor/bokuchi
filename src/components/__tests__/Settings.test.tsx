import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../api/storeApi', () => ({
  storeApi: {
    exportAppSettings: vi.fn().mockResolvedValue('{}'),
    importAppSettings: vi.fn().mockResolvedValue(undefined),
    loadAppSettings: vi.fn().mockResolvedValue({}),
    resetAppSettings: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../api/desktopApi', () => ({
  desktopApi: {
    exportSettingsFile: vi.fn().mockResolvedValue({ success: true }),
    importSettingsFile: vi.fn().mockResolvedValue({ content: '{}', error: null }),
    saveYamlFile: vi.fn().mockResolvedValue({ success: true }),
    openYamlFile: vi.fn().mockResolvedValue({ content: '', error: null }),
  },
}));

vi.mock('../../api/variableApi', () => ({
  variableApi: {
    exportVariablesToYAML: vi.fn().mockResolvedValue(''),
    loadVariablesFromYAML: vi.fn().mockResolvedValue({ success: true }),
    getGlobalVariables: vi.fn().mockResolvedValue({}),
  },
}));

import Settings from '../Settings';
import { DEFAULT_APP_SETTINGS } from '../../types/settings';
import type { AppSettings } from '../../types/settings';
import { asMock } from '../../test-utils';
import { storeApi } from '../../api/storeApi';
import { desktopApi } from '../../api/desktopApi';

describe('Settings', () => {
  let onClose: ReturnType<typeof vi.fn>;
  let onSettingsChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClose = vi.fn();
    onSettingsChange = vi.fn();
  });

  const defaultProps = () => ({
    open: true,
    onClose: asMock<() => void>(onClose),
    settings: { ...DEFAULT_APP_SETTINGS },
    onSettingsChange: asMock<(settings: AppSettings) => void>(onSettingsChange),
  });

  // T-SET-01: renders when open
  it('T-SET-01: renders settings dialog when open', () => {
    render(<Settings {...defaultProps()} />);
    expect(screen.getByText('settings.title')).toBeInTheDocument();
  });

  // T-SET-02: does not render when closed
  it('T-SET-02: does not render when open is false', () => {
    render(<Settings {...defaultProps()} open={false} />);
    expect(screen.queryByText('settings.title')).not.toBeInTheDocument();
  });

  // T-SET-03: shows appearance tab by default
  it('T-SET-03: shows appearance tab content by default', () => {
    render(<Settings {...defaultProps()} />);
    expect(screen.getByText('settings.appearance.themeDescription')).toBeInTheDocument();
  });

  // T-SET-04: switch to editor tab
  it('T-SET-04: switches to editor tab', () => {
    render(<Settings {...defaultProps()} />);
    fireEvent.click(screen.getByText('settings.editor.title'));
    expect(screen.getByText('settings.editor.fontSizeDescription')).toBeInTheDocument();
  });

  // T-SET-05: switch to interface tab
  it('T-SET-05: switches to interface tab', () => {
    render(<Settings {...defaultProps()} />);
    fireEvent.click(screen.getByText('settings.interface.title'));
    expect(screen.getByText('settings.language.description')).toBeInTheDocument();
  });

  // T-SET-06: switch to variables tab
  it('T-SET-06: switches to variables tab', () => {
    render(<Settings {...defaultProps()} />);
    fireEvent.click(screen.getByText('settings.globalVariables.title'));
    expect(screen.getByText('settings.globalVariables.description')).toBeInTheDocument();
  });

  // T-SET-07: switch to advanced tab
  it('T-SET-07: switches to advanced tab', () => {
    render(<Settings {...defaultProps()} />);
    fireEvent.click(screen.getByText('settings.advanced.title'));
    expect(screen.getByText('settings.advanced.tableConversion')).toBeInTheDocument();
  });

  // T-SET-08: close button calls onClose
  it('T-SET-08: close button calls onClose', () => {
    render(<Settings {...defaultProps()} />);
    const closeButton = screen.getByTestId('CloseIcon').closest('button');
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  // T-SET-09: add variable validation - empty name
  it('T-SET-09: shows error for empty variable name', () => {
    render(<Settings {...defaultProps()} />);
    fireEvent.click(screen.getByText('settings.globalVariables.title'));
    fireEvent.click(screen.getByText('buttons.add'));
    expect(screen.getByText('settings.globalVariables.errors.nameRequired')).toBeInTheDocument();
  });

  // T-SET-10: add variable validation - name with spaces
  it('T-SET-10: shows error for variable name with spaces', () => {
    render(<Settings {...defaultProps()} />);
    fireEvent.click(screen.getByText('settings.globalVariables.title'));
    const nameInput = screen.getByLabelText('settings.globalVariables.variableName');
    fireEvent.change(nameInput, { target: { value: 'has space' } });
    fireEvent.click(screen.getByText('buttons.add'));
    expect(screen.getByText('settings.globalVariables.errors.noSpaces')).toBeInTheDocument();
  });

  // T-SET-11: add variable success
  it('T-SET-11: adds variable and calls onSettingsChange', () => {
    render(<Settings {...defaultProps()} />);
    fireEvent.click(screen.getByText('settings.globalVariables.title'));
    const nameInput = screen.getByLabelText('settings.globalVariables.variableName');
    const valueInput = screen.getByLabelText('settings.globalVariables.value');
    fireEvent.change(nameInput, { target: { value: 'myVar' } });
    fireEvent.change(valueInput, { target: { value: 'myValue' } });
    fireEvent.click(screen.getByText('buttons.add'));
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        globalVariables: { myVar: 'myValue' },
      })
    );
  });

  // T-SET-12: shows no variables message when empty
  it('T-SET-12: shows no variables message', () => {
    render(<Settings {...defaultProps()} />);
    fireEvent.click(screen.getByText('settings.globalVariables.title'));
    expect(screen.getByText('settings.globalVariables.noVariables')).toBeInTheDocument();
  });

  // T-SET-13: displays existing variables
  it('T-SET-13: displays existing variables', () => {
    const settings = { ...DEFAULT_APP_SETTINGS, globalVariables: { author: 'John' } };
    render(<Settings {...defaultProps()} settings={settings} />);
    fireEvent.click(screen.getByText('settings.globalVariables.title'));
    expect(screen.getByText('author')).toBeInTheDocument();
  });

  // T-SET-14: rendering extensions section is visible in advanced tab
  it('T-SET-14: shows rendering extensions in advanced tab', () => {
    render(<Settings {...defaultProps()} />);
    fireEvent.click(screen.getByText('settings.advanced.title'));
    expect(screen.getByText('settings.advanced.rendering')).toBeInTheDocument();
    expect(screen.getByText('settings.advanced.enableKatex')).toBeInTheDocument();
    expect(screen.getByText('settings.advanced.enableMermaid')).toBeInTheDocument();
  });

  // T-SET-15: KaTeX toggle defaults to enabled
  it('T-SET-15: KaTeX toggle is checked by default', () => {
    render(<Settings {...defaultProps()} />);
    fireEvent.click(screen.getByText('settings.advanced.title'));
    const katexLabel = screen.getByText('settings.advanced.enableKatex');
    const katexSwitch = katexLabel.closest('label')?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(katexSwitch.checked).toBe(true);
  });

  // T-SET-16: Mermaid toggle defaults to disabled
  it('T-SET-16: Mermaid toggle is unchecked by default', () => {
    render(<Settings {...defaultProps()} />);
    fireEvent.click(screen.getByText('settings.advanced.title'));
    const mermaidLabel = screen.getByText('settings.advanced.enableMermaid');
    const mermaidSwitch = mermaidLabel.closest('label')?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(mermaidSwitch.checked).toBe(false);
  });

  // T-SET-17: toggling Mermaid calls onSettingsChange
  it('T-SET-17: toggling Mermaid on calls onSettingsChange', () => {
    render(<Settings {...defaultProps()} />);
    fireEvent.click(screen.getByText('settings.advanced.title'));
    const mermaidLabel = screen.getByText('settings.advanced.enableMermaid');
    const mermaidSwitch = mermaidLabel.closest('label')?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(mermaidSwitch);
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        rendering: expect.objectContaining({ enableMermaid: true }),
      })
    );
  });

  // T-SET-18: toggling KaTeX off calls onSettingsChange
  it('T-SET-18: toggling KaTeX off calls onSettingsChange', () => {
    render(<Settings {...defaultProps()} />);
    fireEvent.click(screen.getByText('settings.advanced.title'));
    const katexLabel = screen.getByText('settings.advanced.enableKatex');
    const katexSwitch = katexLabel.closest('label')?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(katexSwitch);
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        rendering: expect.objectContaining({ enableKatex: false }),
      })
    );
  });

  // T-SET-19: reset button opens confirmation dialog
  it('T-SET-19: reset button shows confirmation dialog', () => {
    render(<Settings {...defaultProps()} />);
    fireEvent.click(screen.getByText('settings.advanced.title'));
    fireEvent.click(screen.getByText('settings.advanced.resetSettings'));
    // Confirmation dialog appears
    expect(screen.getByText('settings.advanced.resetConfirm')).toBeInTheDocument();
  });

  // T-SET-20: confirming reset calls storeApi.resetAppSettings and onSettingsChange
  it('T-SET-20: confirming reset calls resetAppSettings', async () => {
    // loadAppSettings is called after reset to get fresh defaults
    vi.mocked(storeApi.loadAppSettings).mockResolvedValueOnce(DEFAULT_APP_SETTINGS);

    render(<Settings {...defaultProps()} />);
    fireEvent.click(screen.getByText('settings.advanced.title'));
    // Click reset button to open confirmation
    fireEvent.click(screen.getByText('settings.advanced.resetSettings'));
    // Confirm dialog has two buttons with same text; the confirm one is the contained variant
    const confirmButtons = screen.getAllByText('settings.advanced.resetSettings');
    const confirmButton = confirmButtons.find(btn =>
      btn.closest('button')?.classList.contains('MuiButton-containedError')
    );
    expect(confirmButton).toBeDefined();
    fireEvent.click(confirmButton!);

    // Wait for async handler
    await vi.waitFor(() => {
      expect(storeApi.resetAppSettings).toHaveBeenCalled();
      expect(onSettingsChange).toHaveBeenCalled();
    });
  });

  // T-SET-21: export button calls desktopApi.exportSettingsFile
  it('T-SET-21: export settings calls exportSettingsFile', async () => {
    render(<Settings {...defaultProps()} />);
    fireEvent.click(screen.getByText('settings.advanced.title'));
    fireEvent.click(screen.getByText('settings.advanced.exportSettings'));

    await vi.waitFor(() => {
      expect(storeApi.exportAppSettings).toHaveBeenCalled();
      expect(desktopApi.exportSettingsFile).toHaveBeenCalled();
    });
  });

  // T-SET-22: import button calls desktopApi.importSettingsFile
  it('T-SET-22: import settings calls importSettingsFile', async () => {
    render(<Settings {...defaultProps()} />);
    fireEvent.click(screen.getByText('settings.advanced.title'));
    fireEvent.click(screen.getByText('settings.advanced.importSettings'));

    await vi.waitFor(() => {
      expect(desktopApi.importSettingsFile).toHaveBeenCalled();
    });
  });
});
