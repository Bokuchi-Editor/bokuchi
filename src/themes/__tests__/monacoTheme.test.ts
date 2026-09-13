import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildMonacoThemeData, applyMonacoTheme, MONACO_THEME_NAME } from '../monacoTheme';
import { registerCustomThemes, themes } from '../index';
import type { CustomTheme } from '../customTheme';

const customDark: CustomTheme = {
  id: 'custom:test-dark',
  name: 'Test Dark',
  baseTheme: 'dark',
  mode: 'dark',
  colors: {
    backgroundDefault: '#102030',
    backgroundPaper: '#182838',
    textPrimary: '#e0e8f0',
    textSecondary: '#90a0b0',
    primaryMain: '#4da3ff',
    secondaryMain: '#ff7ab6',
    divider: '#304050',
  },
};

describe('buildMonacoThemeData', () => {
  beforeEach(() => registerCustomThemes([customDark]));

  it('uses the vs base for light presets and the vs-dark base for dark presets', () => {
    expect(buildMonacoThemeData('default').base).toBe('vs');
    expect(buildMonacoThemeData('pastel').base).toBe('vs');
    expect(buildMonacoThemeData('dark').base).toBe('vs-dark');
    expect(buildMonacoThemeData('ink').base).toBe('vs-dark');
    expect(buildMonacoThemeData('default').inherit).toBe(true);
  });

  it('maps the theme background / text tokens onto the editor surface', () => {
    const data = buildMonacoThemeData('dawn');
    expect(data.colors['editor.background']).toBe('#faf6f4');
    expect(data.colors['editorGutter.background']).toBe('#faf6f4');
    expect(data.colors['minimap.background']).toBe('#faf6f4');
    expect(data.colors['editor.foreground']).toBeTruthy();
  });

  it('resolves custom themes through the registry', () => {
    const data = buildMonacoThemeData(customDark.id);
    expect(data.base).toBe('vs-dark');
    expect(data.colors['editor.background']).toBe('#102030');
    expect(data.colors['editor.foreground']).toBe('#e0e8f0');
    expect(data.colors['editorLineNumber.foreground']).toBe('#90a0b0');
    expect(data.colors['editorWidget.background']).toBe('#182838');
    expect(data.colors['editorWidget.border']).toBe('#304050');
  });

  it('emits only 6-digit hex colors (Monaco rejects rgba strings)', () => {
    for (const id of [...themes.map(t => t.name), customDark.id]) {
      for (const [key, value] of Object.entries(buildMonacoThemeData(id).colors)) {
        expect(value, `${id} ${key}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});

describe('applyMonacoTheme', () => {
  it('defines the theme under the fixed name and activates it', () => {
    const editor = { defineTheme: vi.fn(), setTheme: vi.fn() };
    applyMonacoTheme({ editor }, 'twilight');
    expect(editor.defineTheme).toHaveBeenCalledWith(
      MONACO_THEME_NAME,
      expect.objectContaining({ base: 'vs-dark', colors: expect.objectContaining({ 'editor.background': '#25231d' }) }),
    );
    expect(editor.setTheme).toHaveBeenCalledWith(MONACO_THEME_NAME);
  });
});
