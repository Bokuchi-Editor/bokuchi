import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { FontFamilySettingCard } from '../settings/SettingControls';
import type { SystemFontFamily } from '../../api/fontApi';

const FONTS: SystemFontFamily[] = [
  { name: 'Arial', monospaced: false },
  { name: 'Cairo', monospaced: false },
  { name: 'Consolas', monospaced: true },
  { name: 'Courier New', monospaced: true },
  { name: 'Menlo', monospaced: true },
  { name: 'Times New Roman', monospaced: false },
];

function renderCard(overrides: Partial<React.ComponentProps<typeof FontFamilySettingCard>> = {}) {
  const onChange = vi.fn();
  const result = render(
    <FontFamilySettingCard
      label="Editor Font"
      description="desc"
      value=""
      onChange={onChange}
      fonts={FONTS}
      defaultOptionLabel="Default"
      {...overrides}
    />,
  );
  return { onChange, result };
}

function openDropdown() {
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(screen.getByRole('combobox'));
  // MUI opens the listbox on ArrowDown reliably in jsdom.
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
  return screen.getByRole('listbox');
}

describe('FontFamilySettingCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T-FONT-01: shows the localized Default label for the empty value', () => {
    renderCard();
    expect(screen.getByRole('combobox')).toHaveValue('Default');
  });

  it('T-FONT-02: lists Default first, then all fonts, each rendered in its own font', () => {
    renderCard();
    const listbox = openDropdown();
    const options = within(listbox).getAllByRole('option');
    expect(options[0]).toHaveTextContent('Default');
    expect(options).toHaveLength(1 + FONTS.length);
    // The Cairo row previews itself in Cairo.
    const cairoOption = options.find((o) => o.textContent?.includes('Cairo'));
    expect(cairoOption?.querySelector('span')?.style.fontFamily).toBe('"Cairo"');
  });

  it('T-FONT-03: selecting a font fires onChange with the family name', () => {
    const { onChange } = renderCard();
    const listbox = openDropdown();
    fireEvent.click(within(listbox).getByText('Menlo'));
    expect(onChange).toHaveBeenCalledWith('Menlo');
  });

  it('T-FONT-04: selecting Default fires onChange with the empty sentinel', () => {
    const { onChange } = renderCard({ value: 'Menlo' });
    const listbox = openDropdown();
    fireEvent.click(within(listbox).getByText('Default'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('T-FONT-05: typing filters with prefix matches ranked before substring matches', () => {
    renderCard();
    openDropdown();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'me' } });
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    const names = options.map((o) => o.textContent ?? '');
    // "me" prefix-matches Menlo and substring-matches Times New Roman — prefix
    // wins the top spot, and the Default option is hidden during a font query.
    expect(names.some((n) => n.includes('Default'))).toBe(false);
    const menloIdx = names.findIndex((n) => n.includes('Menlo'));
    const timesIdx = names.findIndex((n) => n.includes('Times New Roman'));
    expect(menloIdx).toBe(0);
    expect(timesIdx).toBeGreaterThan(menloIdx);
  });

  it('T-FONT-06: monospace filter (default on) hides proportional fonts and can be toggled off', () => {
    renderCard({ monospaceFilterLabel: 'Monospace fonts only' });
    let listbox = openDropdown();
    let names = within(listbox)
      .getAllByRole('option')
      .map((o) => o.textContent ?? '');
    expect(names.some((n) => n.includes('Menlo'))).toBe(true);
    expect(names.some((n) => n.includes('Arial'))).toBe(false);

    fireEvent.click(screen.getByRole('checkbox'));
    listbox = openDropdown();
    names = within(listbox)
      .getAllByRole('option')
      .map((o) => o.textContent ?? '');
    expect(names.some((n) => n.includes('Arial'))).toBe(true);
  });

  it('T-FONT-07: a selected non-monospace font stays visible under the monospace filter', () => {
    renderCard({ value: 'Cairo', monospaceFilterLabel: 'Monospace fonts only' });
    const listbox = openDropdown();
    const names = within(listbox)
      .getAllByRole('option')
      .map((o) => o.textContent ?? '');
    expect(names.some((n) => n.includes('Cairo'))).toBe(true);
    expect(names.some((n) => n.includes('Arial'))).toBe(false);
  });

  it('T-FONT-08: offers only the Default option while fonts are still loading', () => {
    renderCard({ fonts: null });
    const listbox = openDropdown();
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Default');
  });
});
