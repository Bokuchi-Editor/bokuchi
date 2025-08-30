import { useReducer, useCallback } from 'react';
import { tabReducer, initialTabState } from '../reducers/tabReducer';
import { Tab } from '../types/tab';
import { desktopApi } from '../api/desktopApi';

export const useTabsDesktop = () => {
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

  const setTabNew = useCallback((id: string, isNew: boolean) => {
    dispatch({ type: 'SET_TAB_NEW', payload: { id, isNew } });
  }, []);

  const openFile = useCallback(async () => {
    try {
      const result = await desktopApi.openFile();
      if (result.error) {
        throw new Error(result.error);
      }

      // ファイル名を取得（パスから）
      const fileName = result.filePath ? result.filePath.split('/').pop()?.split('\\').pop() || 'Untitled' : 'Untitled';

      const tabId = addTab({
        title: fileName,
        content: result.content,
        filePath: result.filePath,
        isModified: false,
        isNew: false,
      });

      setActiveTab(tabId);
      return tabId;
    } catch (error) {
      console.error('Failed to open file:', error);
      throw error;
    }
  }, [addTab, setActiveTab]);

  const saveTab = useCallback(async (id: string) => {
    const tab = state.tabs.find(t => t.id === id);
    if (!tab) return false;

    try {
      if (tab.filePath && !tab.isNew) {
        // 既存ファイルに上書き保存（ダイアログなし）
        const result = await desktopApi.saveFileToPath(tab.filePath, tab.content);
        if (result.success) {
          setTabModified(id, false);
          return true;
        } else {
          throw new Error(result.error);
        }
      } else {
        // 新しいファイルとして保存（ダイアログあり）
        const result = await desktopApi.saveFile(tab.content, tab.filePath);
        if (result.success && result.filePath) {
          setTabFilePath(id, result.filePath);
          const displayName = result.filePath.split('/').pop()?.split('\\').pop() || result.filePath;
          updateTabTitle(id, displayName);
          setTabModified(id, false);
          // 新しいファイルとして保存されたので、isNewフラグをfalseに設定
          setTabNew(id, false);
          return true;
        } else {
          throw new Error(result.error);
        }
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      return false;
    }
  }, [state.tabs, setTabModified, setTabFilePath, updateTabTitle]);

  const saveTabAs = useCallback(async (id: string) => {
    console.log('saveTabAs called with id:', id);
    console.log('Available tabs:', state.tabs.map(t => ({ id: t.id, title: t.title })));
    const tab = state.tabs.find(t => t.id === id);
    console.log('Found tab:', tab);

    if (!tab) {
      console.log('No tab found');
      return false;
    }

    try {
      console.log('Calling desktopApi.saveFileAs with content length:', tab.content.length);
      // Save Asは常にダイアログを開く（既存のファイルパスは無視）
      const result = await desktopApi.saveFileAs(tab.content);
      console.log('desktopApi.saveFileAs result:', result);

      if (result.success && result.filePath) {
        console.log('Save successful, updating tab');
        setTabFilePath(id, result.filePath);
        const displayName = result.filePath.split('/').pop()?.split('\\').pop() || result.filePath;
        updateTabTitle(id, displayName);
        setTabModified(id, false);
        // Save Asでも新しいファイルとして保存されたので、isNewフラグをfalseに設定
        setTabNew(id, false);
        return true;
      } else {
        console.log('Save failed with error:', result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to save file as:', error);
      console.error('Error details:', error);
      return false;
    }
  }, [state.tabs, setTabFilePath, updateTabTitle, setTabModified]);

  const createNewTab = useCallback(() => {
    const tabId = addTab({
      title: 'Untitled',
      content: '# New Document\n\nStart typing here...',
      isModified: false,
      isNew: true,
    });
    setActiveTab(tabId);
    return tabId;
  }, [addTab, setActiveTab]);

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
    setTabNew,
    openFile,
    saveTab,
    saveTabAs,
    createNewTab,
  };
};
