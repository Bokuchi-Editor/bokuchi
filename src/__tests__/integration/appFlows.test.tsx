/**
 * Integration tests for core application flows.
 *
 * These tests verify the logic layer (reducers, utilities, pure functions)
 * rather than full component rendering, because AppContent has deep
 * dependencies on Monaco Editor and Tauri native APIs.
 *
 * Test IDs: E-INT-01 through E-INT-07
 */

import { describe, it, expect } from 'vitest';
import { tabReducer, initialTabState } from '../../reducers/tabReducer';
import { Tab, TabState } from '../../types/tab';
import { extractHeadings } from '../../utils/headingExtractor';
import { ZOOM_CONFIG } from '../../constants/zoom';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a Tab object with sensible defaults. */
function createTab(overrides: Partial<Tab> & { id: string }): Tab {
  return {
    title: 'Untitled',
    content: '',
    isModified: false,
    isNew: true,
    ...overrides,
  };
}

/**
 * Reproduce the checkbox toggle logic used in Preview.tsx.
 * Given markdown content, toggle the Nth checkbox (0-based).
 */
function toggleCheckbox(
  content: string,
  checkboxIndex: number,
  isChecked: boolean,
): string {
  const lines = content.split('\n');
  let currentIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(\s*)([-*]\s+)\[([ x])\]\s*(.*)$/);
    if (match) {
      if (currentIndex === checkboxIndex) {
        const [, indent, listMarker, , rest] = match;
        lines[i] = `${indent}${listMarker}[${isChecked ? 'x' : ' '}] ${rest}`;
        return lines.join('\n');
      }
      currentIndex++;
    }
  }
  return content;
}

/**
 * Clamp a zoom value to the configured bounds and round to one decimal place.
 * Mirrors the logic in useZoom (zoomIn / zoomOut / resetZoom).
 */
function clampZoom(zoom: number): number {
  return (
    Math.round(
      Math.max(ZOOM_CONFIG.minZoom, Math.min(ZOOM_CONFIG.maxZoom, zoom)) * 10,
    ) / 10
  );
}

// ---------------------------------------------------------------------------
// E-INT-01: New document flow
// ---------------------------------------------------------------------------

describe('E-INT-01: New document flow', () => {
  it('adds a tab with default content and activates it', () => {
    const defaultContent = '# Welcome\n\nStart writing...';
    const tab = createTab({ id: 'tab-1', content: defaultContent });

    const state = tabReducer(initialTabState, {
      type: 'ADD_TAB',
      payload: tab,
    });

    expect(state.tabs).toHaveLength(1);
    expect(state.activeTabId).toBe('tab-1');
    expect(state.tabs[0].content).toBe(defaultContent);
    expect(state.tabs[0].isNew).toBe(true);
    expect(state.tabs[0].isModified).toBe(false);
  });

  it('preserves content after UPDATE_TAB_CONTENT', () => {
    const tab = createTab({ id: 'tab-1', content: '' });
    let state = tabReducer(initialTabState, {
      type: 'ADD_TAB',
      payload: tab,
    });

    const newContent = '# Hello World';
    state = tabReducer(state, {
      type: 'UPDATE_TAB_CONTENT',
      payload: { id: 'tab-1', content: newContent },
    });

    expect(state.tabs[0].content).toBe(newContent);
    expect(state.tabs[0].isModified).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// E-INT-02: Tab creation
// ---------------------------------------------------------------------------

describe('E-INT-02: Tab creation', () => {
  it('creates a new tab and makes it active', () => {
    const tab1 = createTab({ id: 'tab-1', title: 'First' });
    const tab2 = createTab({ id: 'tab-2', title: 'Second' });

    let state = tabReducer(initialTabState, {
      type: 'ADD_TAB',
      payload: tab1,
    });
    state = tabReducer(state, { type: 'ADD_TAB', payload: tab2 });

    expect(state.tabs).toHaveLength(2);
    // The most recently added tab should be active
    expect(state.activeTabId).toBe('tab-2');
  });

  it('appends the new tab at the end of the list', () => {
    const tab1 = createTab({ id: 'tab-1', title: 'A' });
    const tab2 = createTab({ id: 'tab-2', title: 'B' });
    const tab3 = createTab({ id: 'tab-3', title: 'C' });

    let state = tabReducer(initialTabState, {
      type: 'ADD_TAB',
      payload: tab1,
    });
    state = tabReducer(state, { type: 'ADD_TAB', payload: tab2 });
    state = tabReducer(state, { type: 'ADD_TAB', payload: tab3 });

    expect(state.tabs.map((t) => t.id)).toEqual(['tab-1', 'tab-2', 'tab-3']);
  });
});

// ---------------------------------------------------------------------------
// E-INT-03: Tab switching
// ---------------------------------------------------------------------------

describe('E-INT-03: Tab switching preserves content', () => {
  function setupThreeTabs(): TabState {
    const tabs = [
      createTab({ id: 't1', content: 'Content A' }),
      createTab({ id: 't2', content: 'Content B' }),
      createTab({ id: 't3', content: 'Content C' }),
    ];
    let state = initialTabState;
    for (const tab of tabs) {
      state = tabReducer(state, { type: 'ADD_TAB', payload: tab });
    }
    return state;
  }

  it('switches to an existing tab without altering content', () => {
    let state = setupThreeTabs();

    state = tabReducer(state, {
      type: 'SET_ACTIVE_TAB',
      payload: { id: 't1' },
    });

    expect(state.activeTabId).toBe('t1');
    // All content is preserved
    expect(state.tabs.find((t) => t.id === 't1')?.content).toBe('Content A');
    expect(state.tabs.find((t) => t.id === 't2')?.content).toBe('Content B');
    expect(state.tabs.find((t) => t.id === 't3')?.content).toBe('Content C');
  });

  it('sets activeTabId to null for a non-existent tab', () => {
    let state = setupThreeTabs();

    state = tabReducer(state, {
      type: 'SET_ACTIVE_TAB',
      payload: { id: 'does-not-exist' },
    });

    expect(state.activeTabId).toBeNull();
  });

  it('preserves content after editing and switching back', () => {
    let state = setupThreeTabs();

    // Edit tab t1
    state = tabReducer(state, {
      type: 'UPDATE_TAB_CONTENT',
      payload: { id: 't1', content: 'Modified A' },
    });

    // Switch away
    state = tabReducer(state, {
      type: 'SET_ACTIVE_TAB',
      payload: { id: 't2' },
    });

    // Switch back
    state = tabReducer(state, {
      type: 'SET_ACTIVE_TAB',
      payload: { id: 't1' },
    });

    expect(state.tabs.find((t) => t.id === 't1')?.content).toBe('Modified A');
    expect(state.tabs.find((t) => t.id === 't1')?.isModified).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// E-INT-04: Tab close
// ---------------------------------------------------------------------------

describe('E-INT-04: Tab close activates adjacent tab', () => {
  it('activates the next tab when the active tab is closed', () => {
    const t1 = createTab({ id: 't1' });
    const t2 = createTab({ id: 't2' });
    const t3 = createTab({ id: 't3' });

    let state = initialTabState;
    state = tabReducer(state, { type: 'ADD_TAB', payload: t1 });
    state = tabReducer(state, { type: 'ADD_TAB', payload: t2 });
    state = tabReducer(state, { type: 'ADD_TAB', payload: t3 });

    // Activate t2, then close it
    state = tabReducer(state, {
      type: 'SET_ACTIVE_TAB',
      payload: { id: 't2' },
    });
    state = tabReducer(state, {
      type: 'REMOVE_TAB',
      payload: { id: 't2' },
    });

    expect(state.tabs).toHaveLength(2);
    // Next tab (t3) should be active because t2 was at index 1
    expect(state.activeTabId).toBe('t3');
  });

  it('activates the previous tab when the last tab is closed', () => {
    const t1 = createTab({ id: 't1' });
    const t2 = createTab({ id: 't2' });

    let state = initialTabState;
    state = tabReducer(state, { type: 'ADD_TAB', payload: t1 });
    state = tabReducer(state, { type: 'ADD_TAB', payload: t2 });

    // t2 is active (most recently added), close it
    state = tabReducer(state, {
      type: 'REMOVE_TAB',
      payload: { id: 't2' },
    });

    expect(state.tabs).toHaveLength(1);
    expect(state.activeTabId).toBe('t1');
  });

  it('sets activeTabId to null when the only tab is closed', () => {
    const t1 = createTab({ id: 't1' });
    let state = tabReducer(initialTabState, {
      type: 'ADD_TAB',
      payload: t1,
    });

    state = tabReducer(state, {
      type: 'REMOVE_TAB',
      payload: { id: 't1' },
    });

    expect(state.tabs).toHaveLength(0);
    expect(state.activeTabId).toBeNull();
  });

  it('does not change activeTabId when a non-active tab is closed', () => {
    const t1 = createTab({ id: 't1' });
    const t2 = createTab({ id: 't2' });
    const t3 = createTab({ id: 't3' });

    let state = initialTabState;
    state = tabReducer(state, { type: 'ADD_TAB', payload: t1 });
    state = tabReducer(state, { type: 'ADD_TAB', payload: t2 });
    state = tabReducer(state, { type: 'ADD_TAB', payload: t3 });

    // t3 is active, close t1
    state = tabReducer(state, {
      type: 'REMOVE_TAB',
      payload: { id: 't1' },
    });

    expect(state.activeTabId).toBe('t3');
    expect(state.tabs).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// E-INT-05: Checkbox toggle flow
// ---------------------------------------------------------------------------

describe('E-INT-05: Checkbox toggle flow', () => {
  const markdown = [
    '# Task List',
    '',
    '- [ ] First task',
    '- [x] Second task',
    '- [ ] Third task',
  ].join('\n');

  it('checks an unchecked checkbox by index', () => {
    const result = toggleCheckbox(markdown, 0, true);
    expect(result).toContain('- [x] First task');
    // Other checkboxes remain unchanged
    expect(result).toContain('- [x] Second task');
    expect(result).toContain('- [ ] Third task');
  });

  it('unchecks a checked checkbox by index', () => {
    const result = toggleCheckbox(markdown, 1, false);
    expect(result).toContain('- [ ] Second task');
    // Other checkboxes remain unchanged
    expect(result).toContain('- [ ] First task');
    expect(result).toContain('- [ ] Third task');
  });

  it('toggles the last checkbox', () => {
    const result = toggleCheckbox(markdown, 2, true);
    expect(result).toContain('- [x] Third task');
  });

  it('returns content unchanged when index is out of range', () => {
    const result = toggleCheckbox(markdown, 99, true);
    expect(result).toBe(markdown);
  });

  it('handles indented checkboxes (nested lists)', () => {
    const nested = [
      '- [ ] Parent',
      '  - [ ] Child 1',
      '  - [x] Child 2',
    ].join('\n');

    const result = toggleCheckbox(nested, 1, true);
    expect(result).toContain('  - [x] Child 1');
    // Parent and Child 2 unchanged
    expect(result).toContain('- [ ] Parent');
    expect(result).toContain('  - [x] Child 2');
  });

  it('handles asterisk list markers', () => {
    const asterisk = '* [ ] Asterisk item';
    const result = toggleCheckbox(asterisk, 0, true);
    expect(result).toBe('* [x] Asterisk item');
  });

  it('integrates with tabReducer: toggling checkbox updates tab content', () => {
    const tab = createTab({ id: 't1', content: markdown });
    let state = tabReducer(initialTabState, {
      type: 'ADD_TAB',
      payload: tab,
    });

    const newContent = toggleCheckbox(markdown, 0, true);
    state = tabReducer(state, {
      type: 'UPDATE_TAB_CONTENT',
      payload: { id: 't1', content: newContent },
    });

    expect(state.tabs[0].content).toContain('- [x] First task');
    expect(state.tabs[0].isModified).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// E-INT-06: Outline headings
// ---------------------------------------------------------------------------

describe('E-INT-06: Outline headings', () => {
  it('extracts headings with correct levels and text', () => {
    const md = [
      '# Title',
      '',
      '## Section 1',
      '',
      'Some paragraph text.',
      '',
      '### Subsection 1.1',
      '',
      '## Section 2',
    ].join('\n');

    const headings = extractHeadings(md);

    expect(headings).toEqual([
      { level: 1, text: 'Title', lineNumber: 1 },
      { level: 2, text: 'Section 1', lineNumber: 3 },
      { level: 3, text: 'Subsection 1.1', lineNumber: 7 },
      { level: 2, text: 'Section 2', lineNumber: 9 },
    ]);
  });

  it('ignores headings inside fenced code blocks (backticks)', () => {
    const md = [
      '# Real Heading',
      '',
      '```',
      '# Not a heading',
      '```',
      '',
      '## Another Heading',
    ].join('\n');

    const headings = extractHeadings(md);

    expect(headings).toHaveLength(2);
    expect(headings[0].text).toBe('Real Heading');
    expect(headings[1].text).toBe('Another Heading');
  });

  it('ignores headings inside fenced code blocks (tildes)', () => {
    const md = ['~~~', '# Inside tilde block', '~~~', '# Outside'].join('\n');

    const headings = extractHeadings(md);
    expect(headings).toHaveLength(1);
    expect(headings[0].text).toBe('Outside');
  });

  it('handles all heading levels (h1 through h6)', () => {
    const md = [
      '# H1',
      '## H2',
      '### H3',
      '#### H4',
      '##### H5',
      '###### H6',
    ].join('\n');

    const headings = extractHeadings(md);
    expect(headings).toHaveLength(6);
    expect(headings.map((h) => h.level)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('returns empty array for content with no headings', () => {
    const md = 'Just a plain paragraph.\n\nAnother paragraph.';
    expect(extractHeadings(md)).toEqual([]);
  });

  it('strips trailing ATX closing markers', () => {
    const md = '## Section ## ';
    const headings = extractHeadings(md);
    expect(headings).toHaveLength(1);
    expect(headings[0].text).toBe('Section');
  });
});

// ---------------------------------------------------------------------------
// E-INT-07: Zoom level change within bounds
// ---------------------------------------------------------------------------

describe('E-INT-07: Zoom level change within bounds', () => {
  it('clamps zoom at minimum bound', () => {
    expect(clampZoom(0.3)).toBe(ZOOM_CONFIG.minZoom);
    expect(clampZoom(0.0)).toBe(ZOOM_CONFIG.minZoom);
    expect(clampZoom(-1.0)).toBe(ZOOM_CONFIG.minZoom);
  });

  it('clamps zoom at maximum bound', () => {
    expect(clampZoom(5.0)).toBe(ZOOM_CONFIG.maxZoom);
    expect(clampZoom(10.0)).toBe(ZOOM_CONFIG.maxZoom);
  });

  it('allows values within bounds', () => {
    expect(clampZoom(1.0)).toBe(1.0);
    expect(clampZoom(1.5)).toBe(1.5);
    expect(clampZoom(0.5)).toBe(0.5);
    expect(clampZoom(ZOOM_CONFIG.maxZoom)).toBe(ZOOM_CONFIG.maxZoom);
  });

  it('rounds to one decimal place', () => {
    expect(clampZoom(1.15)).toBe(1.2);
    expect(clampZoom(1.24)).toBe(1.2);
    expect(clampZoom(0.55)).toBe(0.6);
  });

  it('zoom step increments stay within bounds', () => {
    let zoom = ZOOM_CONFIG.defaultZoom;

    // Zoom in repeatedly until max
    while (zoom < ZOOM_CONFIG.maxZoom) {
      zoom = clampZoom(zoom + ZOOM_CONFIG.zoomStep);
      expect(zoom).toBeLessThanOrEqual(ZOOM_CONFIG.maxZoom);
      expect(zoom).toBeGreaterThanOrEqual(ZOOM_CONFIG.minZoom);
    }

    expect(zoom).toBe(ZOOM_CONFIG.maxZoom);

    // Zoom out repeatedly until min
    while (zoom > ZOOM_CONFIG.minZoom) {
      zoom = clampZoom(zoom - ZOOM_CONFIG.zoomStep);
      expect(zoom).toBeLessThanOrEqual(ZOOM_CONFIG.maxZoom);
      expect(zoom).toBeGreaterThanOrEqual(ZOOM_CONFIG.minZoom);
    }

    expect(zoom).toBe(ZOOM_CONFIG.minZoom);
  });

  it('default zoom is within bounds', () => {
    expect(ZOOM_CONFIG.defaultZoom).toBeGreaterThanOrEqual(ZOOM_CONFIG.minZoom);
    expect(ZOOM_CONFIG.defaultZoom).toBeLessThanOrEqual(ZOOM_CONFIG.maxZoom);
  });
});
