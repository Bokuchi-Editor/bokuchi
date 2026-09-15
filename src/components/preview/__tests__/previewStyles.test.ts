import { describe, it, expect } from 'vitest';
import { buildPreviewStyles } from '../previewStyles';
import { getThemeByName, getPreviewTableHeaderStyle } from '../../../themes';

describe('buildPreviewStyles', () => {
  it('paints table headers with the text-derived tint, not the code-block background (Vivid contrast bug)', () => {
    const css = buildPreviewStyles(getThemeByName('vivid').palette, 'equal');
    const headerRule = css.match(/\.markdown-preview th \{[^}]*\}/)?.[0] ?? '';
    expect(headerRule).toContain('background-color: rgba(45, 55, 72, 0.06)');
    expect(headerRule).not.toContain('--color-pre-background');
  });

  it('uses the accent header when the theme opts in (Vivid = AppBar gradient + white text)', () => {
    const css = buildPreviewStyles(getThemeByName('vivid').palette, 'equal', getPreviewTableHeaderStyle('vivid'));
    const headerRule = css.match(/\.markdown-preview th \{[^}]*\}/)?.[0] ?? '';
    expect(headerRule).toContain('background: linear-gradient(45deg, #ff6b35 30%, #f7931e 90%)');
    expect(headerRule).toContain('color: #ffffff');
  });

  it('styles the language:filename label inside pre (#534)', () => {
    const css = buildPreviewStyles(getThemeByName('vivid').palette, 'equal');
    expect(css).toMatch(/\.markdown-preview pre \.code-filename \{[^}]*margin: -16px 0 12px -16px/);
  });

  it('keeps the code-block background on the theme variable', () => {
    const css = buildPreviewStyles(getThemeByName('vivid').palette, 'equal');
    expect(css).toMatch(/\.markdown-preview pre \{[^}]*var\(--color-pre-background\)/);
  });
});
