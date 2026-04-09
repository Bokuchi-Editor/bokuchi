import { describe, it, expect } from 'vitest';
import { tabReducer, initialTabState } from '../tabReducer';
import { Tab, TabState } from '../../types/tab';

function createTab(overrides: Partial<Tab> = {}): Tab {
  return {
    id: overrides.id ?? 'tab-1',
    title: overrides.title ?? 'Untitled',
    content: overrides.content ?? '',
    isModified: overrides.isModified ?? false,
    isNew: overrides.isNew ?? true,
    filePath: overrides.filePath,
    isPinned: overrides.isPinned,
    fileHashInfo: overrides.fileHashInfo,
  };
}

function stateWith(...tabs: Tab[]): TabState {
  return {
    tabs,
    activeTabId: tabs.length > 0 ? tabs[0].id : null,
  };
}

describe('tabReducer', () => {
  // T-TR-01
  it('ADD_TAB adds tab and sets active', () => {
    const tab = createTab({ id: 'new-tab' });
    const result = tabReducer(initialTabState, { type: 'ADD_TAB', payload: tab });
    expect(result.tabs).toHaveLength(1);
    expect(result.tabs[0]).toEqual(tab);
    expect(result.activeTabId).toBe('new-tab');
  });

  // T-TR-02
  it('REMOVE_TAB activates next tab', () => {
    const tab1 = createTab({ id: 't1' });
    const tab2 = createTab({ id: 't2' });
    const tab3 = createTab({ id: 't3' });
    const state: TabState = { tabs: [tab1, tab2, tab3], activeTabId: 't2' };

    const result = tabReducer(state, { type: 'REMOVE_TAB', payload: { id: 't2' } });
    expect(result.tabs).toHaveLength(2);
    expect(result.activeTabId).toBe('t3');
  });

  // T-TR-03
  it('REMOVE_TAB last tab leaves null', () => {
    const tab = createTab({ id: 't1' });
    const state: TabState = { tabs: [tab], activeTabId: 't1' };

    const result = tabReducer(state, { type: 'REMOVE_TAB', payload: { id: 't1' } });
    expect(result.tabs).toHaveLength(0);
    expect(result.activeTabId).toBeNull();
  });

  // T-TR-04
  it('REMOVE_TAB non-active tab preserves active', () => {
    const tab1 = createTab({ id: 't1' });
    const tab2 = createTab({ id: 't2' });
    const state: TabState = { tabs: [tab1, tab2], activeTabId: 't1' };

    const result = tabReducer(state, { type: 'REMOVE_TAB', payload: { id: 't2' } });
    expect(result.tabs).toHaveLength(1);
    expect(result.activeTabId).toBe('t1');
  });

  // T-TR-05
  it('SET_ACTIVE_TAB with valid ID', () => {
    const tab1 = createTab({ id: 't1' });
    const tab2 = createTab({ id: 't2' });
    const state: TabState = { tabs: [tab1, tab2], activeTabId: 't1' };

    const result = tabReducer(state, { type: 'SET_ACTIVE_TAB', payload: { id: 't2' } });
    expect(result.activeTabId).toBe('t2');
  });

  // T-TR-06
  it('SET_ACTIVE_TAB with non-existent ID sets null', () => {
    const tab1 = createTab({ id: 't1' });
    const state: TabState = { tabs: [tab1], activeTabId: 't1' };

    const result = tabReducer(state, { type: 'SET_ACTIVE_TAB', payload: { id: 'nonexistent' } });
    expect(result.activeTabId).toBeNull();
  });

  // T-TR-07
  it('UPDATE_TAB_CONTENT sets content and isModified, leaves other tabs unchanged', () => {
    const tab1 = createTab({ id: 't1', content: 'old', isModified: false });
    const tab2 = createTab({ id: 't2', content: 'keep', isModified: false });
    const state = stateWith(tab1, tab2);

    const result = tabReducer(state, {
      type: 'UPDATE_TAB_CONTENT',
      payload: { id: 't1', content: 'new content' },
    });
    expect(result.tabs[0].content).toBe('new content');
    expect(result.tabs[0].isModified).toBe(true);
    expect(result.tabs[1].content).toBe('keep');
    expect(result.tabs[1].isModified).toBe(false);
  });

  // T-TR-08
  it('UPDATE_TAB_TITLE updates title and leaves other tabs unchanged', () => {
    const tab1 = createTab({ id: 't1', title: 'Old Title' });
    const tab2 = createTab({ id: 't2', title: 'Other' });
    const state = stateWith(tab1, tab2);

    const result = tabReducer(state, {
      type: 'UPDATE_TAB_TITLE',
      payload: { id: 't1', title: 'New Title' },
    });
    expect(result.tabs[0].title).toBe('New Title');
    expect(result.tabs[1].title).toBe('Other');
  });

  // T-TR-09
  it('SET_TAB_MODIFIED toggles modified flag', () => {
    const tab = createTab({ id: 't1', isModified: false });
    const state = stateWith(tab);

    const result = tabReducer(state, {
      type: 'SET_TAB_MODIFIED',
      payload: { id: 't1', isModified: true },
    });
    expect(result.tabs[0].isModified).toBe(true);

    const result2 = tabReducer(result, {
      type: 'SET_TAB_MODIFIED',
      payload: { id: 't1', isModified: false },
    });
    expect(result2.tabs[0].isModified).toBe(false);
  });

  // T-TR-10
  it('SET_TAB_FILE_PATH sets path', () => {
    const tab = createTab({ id: 't1' });
    const state = stateWith(tab);

    const result = tabReducer(state, {
      type: 'SET_TAB_FILE_PATH',
      payload: { id: 't1', filePath: '/tmp/test.md' },
    });
    expect(result.tabs[0].filePath).toBe('/tmp/test.md');
  });

  // T-TR-11
  it('SET_TAB_NEW sets isNew flag', () => {
    const tab = createTab({ id: 't1', isNew: true });
    const state = stateWith(tab);

    const result = tabReducer(state, {
      type: 'SET_TAB_NEW',
      payload: { id: 't1', isNew: false },
    });
    expect(result.tabs[0].isNew).toBe(false);
  });

  // T-TR-12
  it('UPDATE_TAB_FILE_HASH updates hash info', () => {
    const tab = createTab({ id: 't1' });
    const state = stateWith(tab);
    const hashInfo = { hash: 'abc123', modified_time: 1000, file_size: 512 };

    const result = tabReducer(state, {
      type: 'UPDATE_TAB_FILE_HASH',
      payload: { id: 't1', fileHashInfo: hashInfo },
    });
    expect(result.tabs[0].fileHashInfo).toEqual(hashInfo);
  });

  // T-TR-13
  it('REORDER_TABS preserves activeTabId', () => {
    const tab1 = createTab({ id: 't1' });
    const tab2 = createTab({ id: 't2' });
    const state: TabState = { tabs: [tab1, tab2], activeTabId: 't2' };

    const result = tabReducer(state, {
      type: 'REORDER_TABS',
      payload: { tabs: [tab2, tab1] },
    });
    expect(result.tabs[0].id).toBe('t2');
    expect(result.tabs[1].id).toBe('t1');
    expect(result.activeTabId).toBe('t2');
  });

  // T-TR-14
  it('REORDER_TABS falls back to first tab if active removed', () => {
    const tab1 = createTab({ id: 't1' });
    const tab2 = createTab({ id: 't2' });
    const state: TabState = { tabs: [tab1, tab2], activeTabId: 't2' };

    // Reorder with only tab1 (tab2 removed)
    const result = tabReducer(state, {
      type: 'REORDER_TABS',
      payload: { tabs: [tab1] },
    });
    expect(result.activeTabId).toBe('t1');
  });

  // T-TR-15
  it('LOAD_STATE validates activeTabId', () => {
    const tab1 = createTab({ id: 't1' });
    const tab2 = createTab({ id: 't2' });

    const result = tabReducer(initialTabState, {
      type: 'LOAD_STATE',
      payload: {
        tabs: [tab1, tab2],
        activeTabId: 'nonexistent',
        lastOpenedAt: Date.now(),
      },
    });
    expect(result.activeTabId).toBe('t1');
  });

  it('REORDER_TABS with empty tabs sets activeTabId to null', () => {
    const tab1 = createTab({ id: 't1' });
    const state: TabState = { tabs: [tab1], activeTabId: 't1' };

    const result = tabReducer(state, {
      type: 'REORDER_TABS',
      payload: { tabs: [] },
    });
    expect(result.activeTabId).toBeNull();
  });

  it('LOAD_STATE with valid activeTabId preserves it', () => {
    const tab1 = createTab({ id: 't1' });
    const tab2 = createTab({ id: 't2' });

    const result = tabReducer(initialTabState, {
      type: 'LOAD_STATE',
      payload: {
        tabs: [tab1, tab2],
        activeTabId: 't2',
        lastOpenedAt: Date.now(),
      },
    });
    expect(result.activeTabId).toBe('t2');
  });

  it('LOAD_STATE with empty tabs sets activeTabId to null', () => {
    const result = tabReducer(initialTabState, {
      type: 'LOAD_STATE',
      payload: {
        tabs: [],
        activeTabId: null,
        lastOpenedAt: Date.now(),
      },
    });
    expect(result.activeTabId).toBeNull();
  });

  // T-TR-17
  it('TOGGLE_TAB_PINNED toggles isPinned from undefined to true', () => {
    const tab = createTab({ id: 't1' });
    const state = stateWith(tab);
    const result = tabReducer(state, { type: 'TOGGLE_TAB_PINNED', payload: { id: 't1' } });
    expect(result.tabs[0].isPinned).toBe(true);
  });

  // T-TR-18
  it('TOGGLE_TAB_PINNED toggles isPinned from true to false', () => {
    const tab = createTab({ id: 't1', isPinned: true });
    const state = stateWith(tab);
    const result = tabReducer(state, { type: 'TOGGLE_TAB_PINNED', payload: { id: 't1' } });
    expect(result.tabs[0].isPinned).toBe(false);
  });

  // T-TR-19
  it('REMOVE_TABS removes multiple tabs', () => {
    const tab1 = createTab({ id: 't1' });
    const tab2 = createTab({ id: 't2' });
    const tab3 = createTab({ id: 't3' });
    const state: TabState = { tabs: [tab1, tab2, tab3], activeTabId: 't1' };
    const result = tabReducer(state, { type: 'REMOVE_TABS', payload: { ids: ['t2', 't3'] } });
    expect(result.tabs).toHaveLength(1);
    expect(result.tabs[0].id).toBe('t1');
    expect(result.activeTabId).toBe('t1');
  });

  // T-TR-20
  it('REMOVE_TABS selects next active tab when active is removed', () => {
    const tab1 = createTab({ id: 't1' });
    const tab2 = createTab({ id: 't2' });
    const tab3 = createTab({ id: 't3' });
    const state: TabState = { tabs: [tab1, tab2, tab3], activeTabId: 't2' };
    const result = tabReducer(state, { type: 'REMOVE_TABS', payload: { ids: ['t2'] } });
    expect(result.tabs).toHaveLength(2);
    expect(result.activeTabId).toBe('t3');
  });

  // T-TR-21
  it('REMOVE_TABS with empty ids is no-op', () => {
    const tab1 = createTab({ id: 't1' });
    const state = stateWith(tab1);
    const result = tabReducer(state, { type: 'REMOVE_TABS', payload: { ids: [] } });
    expect(result.tabs).toHaveLength(1);
    expect(result.activeTabId).toBe('t1');
  });

  // T-TR-22
  it('REMOVE_TABS removing all tabs sets activeTabId to null', () => {
    const tab1 = createTab({ id: 't1' });
    const tab2 = createTab({ id: 't2' });
    const state: TabState = { tabs: [tab1, tab2], activeTabId: 't1' };
    const result = tabReducer(state, { type: 'REMOVE_TABS', payload: { ids: ['t1', 't2'] } });
    expect(result.tabs).toHaveLength(0);
    expect(result.activeTabId).toBeNull();
  });

  // T-TR-16
  it('unknown action returns same state', () => {
    const state = stateWith(createTab({ id: 't1' }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = tabReducer(state, { type: 'UNKNOWN_ACTION' } as any);
    expect(result).toBe(state);
  });
});
