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

    case 'REMOVE_TAB': {
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
    }

    case 'SET_ACTIVE_TAB': {
      // 存在するタブIDのみを許可
      const tabExists = state.tabs.some(tab => tab.id === action.payload.id);
      return {
        ...state,
        activeTabId: tabExists ? action.payload.id : null,
      };
    }

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

    case 'UPDATE_TAB_FILE_HASH':
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.id
            ? { ...tab, fileHashInfo: action.payload.fileHashInfo }
            : tab
        ),
      };

    case 'REORDER_TABS': {
      // アクティブタブIDが存在するかチェック
      const validActiveTabId = state.activeTabId &&
        action.payload.tabs.some(tab => tab.id === state.activeTabId)
        ? state.activeTabId
        : (action.payload.tabs.length > 0 ? action.payload.tabs[0].id : null);

      return {
        ...state,
        tabs: action.payload.tabs,
        activeTabId: validActiveTabId,
      };
    }

    case 'LOAD_STATE': {
      // アクティブタブIDが存在するかチェック
      const validActiveTabId = action.payload.activeTabId &&
        action.payload.tabs.some(tab => tab.id === action.payload.activeTabId)
        ? action.payload.activeTabId
        : (action.payload.tabs.length > 0 ? action.payload.tabs[0].id : null);

      return {
        ...state,
        tabs: action.payload.tabs,
        activeTabId: validActiveTabId,
      };
    }

    default:
      return state;
  }
};
