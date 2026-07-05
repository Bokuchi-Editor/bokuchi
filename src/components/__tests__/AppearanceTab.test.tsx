import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import AppearanceTab from '../settings/AppearanceTab';
import { DEFAULT_APP_SETTINGS } from '../../types/settings';
import type { AppSettings } from '../../types/settings';
import type { CustomTheme } from '../../themes/customTheme';
import { registerCustomThemes } from '../../themes';
import { asMock } from '../../test-utils';

const sampleCustomTheme = (overrides: Partial<CustomTheme> = {}): CustomTheme => ({
  id: 'custom:test-1',
  name: 'My Theme',
  baseTheme: 'dawn',
  mode: 'light',
  colors: {
    backgroundDefault: '#faf6f4',
    backgroundPaper: '#f4edea',
    textPrimary: '#39312d',
    textSecondary: '#796b64',
    primaryMain: '#785e4f',
    secondaryMain: '#977e71',
    divider: '#e6dad2',
  },
  ...overrides,
});

describe('AppearanceTab', () => {
  let onSettingChange: ReturnType<typeof vi.fn>;
  let onCustomThemesChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSettingChange = vi.fn();
    onCustomThemesChange = vi.fn();
  });

  afterEach(() => {
    registerCustomThemes([]);
  });

  const renderTab = ({
    customThemes = [] as CustomTheme[],
    theme = 'default',
    as400Unlocked = false,
  } = {}) => {
    registerCustomThemes(customThemes);
    const settings: AppSettings = {
      ...DEFAULT_APP_SETTINGS,
      appearance: { ...DEFAULT_APP_SETTINGS.appearance, theme },
    };
    return render(
      <AppearanceTab
        settings={settings}
        onSettingChange={asMock(onSettingChange)}
        as400Unlocked={as400Unlocked}
        customThemes={customThemes}
        onCustomThemesChange={asMock(onCustomThemesChange)}
      />,
    );
  };

  // T-AT-01: all 9 visible presets render as cards
  it('T-AT-01: renders 9 preset cards by default', () => {
    renderTab();
    const presets = ['default', 'dark', 'pastel', 'vivid', 'dawn', 'twilight', 'silk', 'ink', 'darcula'];
    for (const name of presets) {
      expect(screen.getByTestId(`theme-card-${name}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('theme-card-as400')).not.toBeInTheDocument();
  });

  // T-AT-02: unlocked secret theme appears in the gallery
  it('T-AT-02: shows as400 card when unlocked', () => {
    renderTab({ as400Unlocked: true });
    expect(screen.getByTestId('theme-card-as400')).toBeInTheDocument();
  });

  // T-AT-03: clicking a card applies the theme immediately
  it('T-AT-03: clicking a preset card applies it', () => {
    renderTab();
    fireEvent.click(screen.getByTestId('theme-card-dark'));
    expect(onSettingChange).toHaveBeenCalledWith('appearance', 'theme', 'dark');
  });

  // T-AT-04: duplicate creates a custom theme, applies it and opens the editor path
  it('T-AT-04: duplicating a preset creates and applies a custom theme', () => {
    renderTab();
    fireEvent.click(screen.getByTestId('theme-duplicate-dawn'));

    expect(onCustomThemesChange).toHaveBeenCalledTimes(1);
    const newList = onCustomThemesChange.mock.calls[0][0] as CustomTheme[];
    expect(newList).toHaveLength(1);
    const created = newList[0];
    expect(created.id).toMatch(/^custom:/);
    expect(created.baseTheme).toBe('dawn');
    expect(created.mode).toBe('light');
    expect(created.colors.backgroundDefault).toBe('#faf6f4');
    // The new theme is applied right away (registered before apply)
    expect(onSettingChange).toHaveBeenCalledWith('appearance', 'theme', created.id);
  });

  // T-AT-05: custom cards render with their name and can be edited in place
  it('T-AT-05: renders custom theme card and opens the in-place editor', () => {
    const custom = sampleCustomTheme();
    renderTab({ customThemes: [custom] });

    expect(screen.getByText('My Theme')).toBeInTheDocument();
    expect(screen.queryByTestId('custom-theme-editor')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId(`theme-edit-${custom.id}`));
    expect(screen.getByTestId('custom-theme-editor')).toBeInTheDocument();
  });

  // T-AT-06: committing a hex value updates the theme (normalized)
  it('T-AT-06: hex input commits normalized color', () => {
    const custom = sampleCustomTheme();
    renderTab({ customThemes: [custom] });
    fireEvent.click(screen.getByTestId(`theme-edit-${custom.id}`));

    const hexInput = screen.getByTestId('swatch-hex-primaryMain');
    fireEvent.change(hexInput, { target: { value: 'FF0000' } });

    expect(onCustomThemesChange).toHaveBeenCalled();
    const calls = onCustomThemesChange.mock.calls;
    const updated = (calls[calls.length - 1][0] as CustomTheme[])[0];
    expect(updated.colors.primaryMain).toBe('#ff0000');
  });

  // T-AT-07: invalid hex does not commit
  it('T-AT-07: invalid hex value is not committed', () => {
    const custom = sampleCustomTheme();
    renderTab({ customThemes: [custom] });
    fireEvent.click(screen.getByTestId(`theme-edit-${custom.id}`));

    fireEvent.change(screen.getByTestId('swatch-hex-primaryMain'), {
      target: { value: '#zzz' },
    });
    expect(onCustomThemesChange).not.toHaveBeenCalled();
  });

  // T-AT-08: delete flow asks for confirmation, then removes the theme
  it('T-AT-08: deleting a custom theme requires confirmation', () => {
    const custom = sampleCustomTheme();
    renderTab({ customThemes: [custom] });
    fireEvent.click(screen.getByTestId(`theme-edit-${custom.id}`));
    fireEvent.click(screen.getByTestId('delete-custom-theme'));

    // Nothing deleted until confirmed
    expect(onCustomThemesChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('confirm-delete-theme'));
    expect(onCustomThemesChange).toHaveBeenCalledWith([]);
  });

  // T-AT-09: mode toggle switches editor mode (Monaco skin selector)
  it('T-AT-09: editor mode toggle updates the theme mode', () => {
    const custom = sampleCustomTheme();
    renderTab({ customThemes: [custom] });
    fireEvent.click(screen.getByTestId(`theme-edit-${custom.id}`));
    fireEvent.click(screen.getByTestId('editor-mode-dark'));

    const calls = onCustomThemesChange.mock.calls;
    const updated = (calls[calls.length - 1][0] as CustomTheme[])[0];
    expect(updated.mode).toBe('dark');
  });

  // T-AT-10: reset-to-base restores the base preset's colors
  it('T-AT-10: reset to base restores preset colors', () => {
    const custom = sampleCustomTheme({
      colors: { ...sampleCustomTheme().colors, primaryMain: '#ff0000' },
    });
    renderTab({ customThemes: [custom] });
    fireEvent.click(screen.getByTestId(`theme-edit-${custom.id}`));
    fireEvent.click(screen.getByTestId('reset-to-base'));

    const calls = onCustomThemesChange.mock.calls;
    const updated = (calls[calls.length - 1][0] as CustomTheme[])[0];
    // dawn's primary
    expect(updated.colors.primaryMain).toBe('#785e4f');
  });

  // T-AT-11: escape hatch applies Default, disabled while already on Default
  it('T-AT-11: back-to-default button applies default theme', () => {
    const custom = sampleCustomTheme();
    renderTab({ customThemes: [custom], theme: custom.id });
    const button = screen.getByTestId('back-to-default-theme');
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(onSettingChange).toHaveBeenCalledWith('appearance', 'theme', 'default');
  });

  it('T-AT-12: back-to-default button is disabled on default theme', () => {
    renderTab({ theme: 'default' });
    expect(screen.getByTestId('back-to-default-theme')).toBeDisabled();
  });

  // T-AT-13: "new theme" opens the base picker; choosing a base duplicates it
  it('T-AT-13: add card opens base picker and duplicates the chosen base', () => {
    renderTab();
    fireEvent.click(screen.getByTestId('add-custom-theme'));
    fireEvent.click(screen.getByTestId('base-picker-ink'));

    const newList = onCustomThemesChange.mock.calls[0][0] as CustomTheme[];
    expect(newList[0].baseTheme).toBe('ink');
    expect(newList[0].mode).toBe('dark');
  });

  // T-AT-14: hover shows the mini-preview popover after the delay
  it('T-AT-14: hovering a card shows the preview popover after 200ms', () => {
    vi.useFakeTimers();
    try {
      renderTab();
      // The card itself shows the label once; the popover adds a second copy.
      expect(screen.getAllByText('Twilight')).toHaveLength(1);
      fireEvent.mouseEnter(screen.getByTestId('theme-card-twilight'));
      // Not yet — delay pending
      expect(screen.getAllByText('Twilight')).toHaveLength(1);
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(screen.getAllByText('Twilight')).toHaveLength(2);
      fireEvent.mouseLeave(screen.getByTestId('theme-card-twilight'));
      expect(screen.getAllByText('Twilight')).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
