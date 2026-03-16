import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../themes', () => {
  const mockThemes = [
    { name: 'default', displayName: 'Default' },
    { name: 'dark', displayName: 'Dark' },
    { name: 'darcula', displayName: 'Darcula' },
  ];
  return {
    themes: mockThemes,
    getVisibleThemes: (unlockedSecretThemes: string[] = []) =>
      mockThemes.filter((t: { name: string; hidden?: boolean }) => !t.hidden || unlockedSecretThemes.includes(t.name)),
  };
});

import StatusBar from '../StatusBar';
import { asMock } from '../../test-utils';
import type { ThemeName } from '../../themes';

describe('StatusBar', () => {
  let onZoomIn: ReturnType<typeof vi.fn>;
  let onZoomOut: ReturnType<typeof vi.fn>;
  let onResetZoom: ReturnType<typeof vi.fn>;
  let onThemeChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onZoomIn = vi.fn();
    onZoomOut = vi.fn();
    onResetZoom = vi.fn();
    onThemeChange = vi.fn();
  });

  const defaultProps = () => ({
    line: 10,
    column: 5,
    totalCharacters: 1500,
    selectedCharacters: 0,
    darkMode: false,
    theme: 'default' as const,
    onThemeChange: asMock<(theme: ThemeName) => void>(onThemeChange),
    zoomPercentage: 100,
    onZoomIn: asMock<() => void>(onZoomIn),
    onZoomOut: asMock<() => void>(onZoomOut),
    onResetZoom: asMock<() => void>(onResetZoom),
    canZoomIn: true,
    canZoomOut: true,
  });

  const renderStatusBar = (overrides = {}) =>
    render(<StatusBar {...defaultProps()} {...overrides} />);

  // T-SB-01: displays line and column
  it('T-SB-01: displays line and column numbers', () => {
    renderStatusBar();
    // Line and column are rendered as "statusBar.line 10, statusBar.column 5"
    expect(screen.getByText(/statusBar\.line 10/)).toBeInTheDocument();
  });

  // T-SB-02: displays total characters
  it('T-SB-02: displays total character count', () => {
    renderStatusBar();
    expect(screen.getByText(/1500/)).toBeInTheDocument();
  });

  // T-SB-03: displays selected characters when > 0
  it('T-SB-03: displays selected character count when selection exists', () => {
    renderStatusBar({ selectedCharacters: 42 });
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  // T-SB-04: displays zoom percentage
  it('T-SB-04: displays zoom percentage', () => {
    renderStatusBar({ zoomPercentage: 125 });
    expect(screen.getByText('125%')).toBeInTheDocument();
  });

  // T-SB-05: zoom in button calls onZoomIn
  it('T-SB-05: calls onZoomIn when zoom in is clicked', () => {
    renderStatusBar();
    const buttons = screen.getAllByRole('button');
    // ZoomOut, ZoomIn, ResetZoom, ThemeButton - ZoomIn is second
    const zoomInButton = buttons[1];
    fireEvent.click(zoomInButton);
    expect(onZoomIn).toHaveBeenCalledTimes(1);
  });

  // T-SB-06: zoom out button calls onZoomOut
  it('T-SB-06: calls onZoomOut when zoom out is clicked', () => {
    renderStatusBar();
    const buttons = screen.getAllByRole('button');
    const zoomOutButton = buttons[0];
    fireEvent.click(zoomOutButton);
    expect(onZoomOut).toHaveBeenCalledTimes(1);
  });

  // T-SB-07: zoom in disabled when canZoomIn is false
  it('T-SB-07: zoom in button is disabled when canZoomIn is false', () => {
    renderStatusBar({ canZoomIn: false });
    const buttons = screen.getAllByRole('button');
    expect(buttons[1]).toBeDisabled();
  });

  // T-SB-08: zoom out disabled when canZoomOut is false
  it('T-SB-08: zoom out button is disabled when canZoomOut is false', () => {
    renderStatusBar({ canZoomOut: false });
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled();
  });

  // T-SB-09: reset zoom button calls onResetZoom
  it('T-SB-09: calls onResetZoom when reset button is clicked', () => {
    renderStatusBar();
    const buttons = screen.getAllByRole('button');
    const resetButton = buttons[2];
    fireEvent.click(resetButton);
    expect(onResetZoom).toHaveBeenCalledTimes(1);
  });

  // T-SB-10: theme menu opens and selects theme
  it('T-SB-10: opens theme menu and calls onThemeChange on selection', () => {
    renderStatusBar();
    // Click theme button (last button)
    const buttons = screen.getAllByRole('button');
    const themeButton = buttons[buttons.length - 1];
    fireEvent.click(themeButton);
    // Select "Dark" from menu
    fireEvent.click(screen.getByText('Dark'));
    expect(onThemeChange).toHaveBeenCalledWith('dark');
  });

  // T-SB-11: displays current theme name
  it('T-SB-11: displays current theme display name', () => {
    renderStatusBar({ theme: 'default' });
    expect(screen.getByText('Default')).toBeInTheDocument();
  });
});
