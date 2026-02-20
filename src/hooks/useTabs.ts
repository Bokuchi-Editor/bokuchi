import { useReducer, useCallback } from 'react';
import { tabReducer, initialTabState } from '../reducers/tabReducer';
import { Tab } from '../types/tab';

export const useTabs = () => {
  const [state, dispatch] = useReducer(tabReducer, initialTabState);

  const addTab = useCallback((tab: Omit<Tab, 'id'>) => {
    const newTab: Tab = {
      ...tab,
      id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    dispatch({ type: 'ADD_TAB', payload: newTab });
    return newTab.id;
  }, []);

  const removeTab = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TAB', payload: { id } });
  }, []);

  const setActiveTab = useCallback((id: string) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: { id } });
  }, []);

  const updateTabContent = useCallback((id: string, content: string) => {
    dispatch({ type: 'UPDATE_TAB_CONTENT', payload: { id, content } });
  }, []);

  const updateTabTitle = useCallback((id: string, title: string) => {
    dispatch({ type: 'UPDATE_TAB_TITLE', payload: { id, title } });
  }, []);

  const setTabModified = useCallback((id: string, isModified: boolean) => {
    dispatch({ type: 'SET_TAB_MODIFIED', payload: { id, isModified } });
  }, []);

  const setTabFilePath = useCallback((id: string, filePath: string) => {
    dispatch({ type: 'SET_TAB_FILE_PATH', payload: { id, filePath } });
  }, []);

  const openFile = useCallback(async (file: File) => {
    try {
      const content = await file.text();
      const fileName = file.name;

      const tabId = addTab({
        title: fileName,
        content: content,
        filePath: fileName,
        isModified: false,
        isNew: false,
      });

      return tabId;
    } catch (error) {
      console.error('Failed to open file:', error);
      throw error;
    }
  }, [addTab]);

  const saveTab = useCallback(async (id: string, fileName?: string) => {
    const tab = state.tabs.find(t => t.id === id);
    if (!tab) return false;

    try {
      // Save file as download
      const filePath = fileName || tab.filePath || 'untitled.md';
      const blob = new Blob([tab.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update tab info
      setTabFilePath(id, filePath);
      const displayName = filePath.split('/').pop() || filePath;
      updateTabTitle(id, displayName);
      setTabModified(id, false);
      return true;
    } catch (error) {
      console.error('Failed to save file:', error);
      return false;
    }
  }, [state.tabs, setTabModified, setTabFilePath, updateTabTitle]);

  const createNewTab = useCallback(() => {
    return addTab({
      title: 'Untitled',
      content: '# New Document\n\nStart typing here...',
      isModified: false,
      isNew: true,
    });
  }, [addTab]);

  const getActiveTab = useCallback(() => {
    return state.tabs.find(tab => tab.id === state.activeTabId) || null;
  }, [state.tabs, state.activeTabId]);

  return {
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    activeTab: getActiveTab(),
    addTab,
    removeTab,
    setActiveTab,
    updateTabContent,
    updateTabTitle,
    setTabModified,
    setTabFilePath,
    openFile,
    saveTab,
    createNewTab,
  };
};
