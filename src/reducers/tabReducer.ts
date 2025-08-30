import { TabState, TabAction } from '../types/tab';

export const initialTabState: TabState = {
  tabs: [],
  activeTabId: null,
};

export const tabReducer = (state: TabState, action: TabAction): TabState => {
  switch (action.type) {
    case 'ADD_TAB':
      return {
        ...state,
        tabs: [...state.tabs, action.payload],
        activeTabId: action.payload.id,
      };

    case 'REMOVE_TAB':
      const remainingTabs = state.tabs.filter(tab => tab.id !== action.payload.id);
      let newActiveTabId = state.activeTabId;

      // 削除されたタブがアクティブだった場合、次のタブをアクティブにする
      if (state.activeTabId === action.payload.id) {
        const currentIndex = state.tabs.findIndex(tab => tab.id === action.payload.id);
        if (remainingTabs.length > 0) {
          // 次のタブを選択、なければ前のタブを選択
          newActiveTabId = remainingTabs[Math.min(currentIndex, remainingTabs.length - 1)]?.id || null;
        } else {
          newActiveTabId = null;
        }
      }

      return {
        ...state,
        tabs: remainingTabs,
        activeTabId: newActiveTabId,
      };

    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        activeTabId: action.payload.id,
      };

    case 'UPDATE_TAB_CONTENT':
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.id
            ? { ...tab, content: action.payload.content, isModified: true }
            : tab
        ),
      };

    case 'UPDATE_TAB_TITLE':
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.id
            ? { ...tab, title: action.payload.title }
            : tab
        ),
      };

    case 'SET_TAB_MODIFIED':
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.id
            ? { ...tab, isModified: action.payload.isModified }
            : tab
        ),
      };

    case 'SET_TAB_FILE_PATH':
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.id
            ? { ...tab, filePath: action.payload.filePath }
            : tab
        ),
      };

    case 'SET_TAB_NEW':
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.id
            ? { ...tab, isNew: action.payload.isNew }
            : tab
        ),
      };

    case 'LOAD_STATE':
      return {
        ...state,
        tabs: action.payload.tabs,
        activeTabId: action.payload.activeTabId,
      };

    default:
      return state;
  }
};
