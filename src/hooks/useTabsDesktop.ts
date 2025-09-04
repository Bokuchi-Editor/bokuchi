import { useReducer, useCallback, useEffect, useState } from 'react';
import { tabReducer, initialTabState } from '../reducers/tabReducer';
import { Tab, AppState } from '../types/tab';
import { desktopApi } from '../api/desktopApi';
import { storeApi } from '../api/storeApi';
import { detectFileChange } from '../utils/fileChangeDetection';

export const useTabsDesktop = () => {
  const [state, dispatch] = useReducer(tabReducer, initialTabState);
  const [isInitialized, setIsInitialized] = useState(false);

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

  const updateTabFileHash = useCallback((id: string, fileHashInfo: { hash: string; modified_time: number; file_size: number }) => {
    dispatch({ type: 'UPDATE_TAB_FILE_HASH', payload: { id, fileHashInfo } });
  }, []);

  const setActiveTab = useCallback(async (id: string) => {
    const tab = state.tabs.find(t => t.id === id);
    if (!tab) {
      dispatch({ type: 'SET_ACTIVE_TAB', payload: { id } });
      return;
    }

    // 新しいファイルでない場合、ファイル変更をチェック
    if (!tab.isNew && tab.filePath) {
      const hasChanged = await detectFileChange(tab);
      if (hasChanged) {
        // ファイル変更検出イベントを発火
        const event = new CustomEvent('fileChangeDetected', {
          detail: {
            fileName: tab.title,
            tabId: id,
            onReload: async (newContent: string) => {
              console.log('Reloading file with new content:', newContent.length, 'characters');
              // コンテンツを更新
              updateTabContent(id, newContent);
              setTabModified(id, false);

              // ファイルハッシュ情報を更新
              try {
                const newHashInfo = await desktopApi.getFileHash(tab.filePath!);
                updateTabFileHash(id, newHashInfo);
                console.log('File hash updated after reload:', newHashInfo);
              } catch (error) {
                console.warn('Failed to update file hash after reload:', error);
              }

              // タブをアクティブにする
              dispatch({ type: 'SET_ACTIVE_TAB', payload: { id } });
            },
            onCancel: () => {
              dispatch({ type: 'SET_ACTIVE_TAB', payload: { id } });
            },
          },
        });
        window.dispatchEvent(event);
        return;
      }
    }

    dispatch({ type: 'SET_ACTIVE_TAB', payload: { id } });
  }, [state.tabs, updateTabContent, setTabModified]);

  const openFile = useCallback(async () => {
    try {
      const result = await desktopApi.openFile();
      if (result.error) {
        throw new Error(result.error);
      }

      // ファイル名を取得（パスから）
      const fileName = result.filePath ? result.filePath.split('/').pop()?.split('\\').pop() || 'Untitled' : 'Untitled';

      // ファイルハッシュ情報を取得
      let fileHashInfo = undefined;
      if (result.filePath) {
        try {
          fileHashInfo = await desktopApi.getFileHash(result.filePath);
        } catch (error) {
          console.warn('Failed to get file hash, continuing without hash info:', error);
        }
      }

      const tabId = addTab({
        title: fileName,
        content: result.content,
        filePath: result.filePath,
        isModified: false,
        isNew: false,
        fileHashInfo,
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
        // 既存ファイルに上書き保存する前に、ファイル変更をチェック
        const hasChanged = await detectFileChange(tab);
        if (hasChanged) {
          // ファイル変更検出イベントを発火
          const event = new CustomEvent('fileChangeDetected', {
            detail: {
              fileName: tab.title,
              tabId: id,
              onReload: async (newContent: string) => {
                console.log('Reloading file before save with new content:', newContent.length, 'characters');
                // コンテンツを更新
                updateTabContent(id, newContent);
                setTabModified(id, false);

                // ファイルハッシュ情報を更新
                try {
                  const newHashInfo = await desktopApi.getFileHash(tab.filePath!);
                  updateTabFileHash(id, newHashInfo);
                  console.log('File hash updated after reload before save:', newHashInfo);
                } catch (error) {
                  console.warn('Failed to update file hash after reload before save:', error);
                }

                // 保存を実行
                desktopApi.saveFileToPath(tab.filePath!, newContent)
                  .then(result => {
                    if (result.success) {
                      setTabModified(id, false);
                      console.log('File saved successfully after reload');
                    } else {
                      throw new Error(result.error);
                    }
                  })
                  .catch(error => {
                    console.error('Failed to save after reload:', error);
                  });
              },
              onCancel: async () => {
                // 現在の内容で保存を実行
                const result = await desktopApi.saveFileToPath(tab.filePath!, tab.content);
                if (result.success) {
                  setTabModified(id, false);
                  // 保存後にファイルハッシュ情報を更新
                  try {
                    const newHashInfo = await desktopApi.getFileHash(tab.filePath!);
                    // ハッシュ情報を更新するアクションを追加する必要があります
                    console.log('File hash updated after save:', newHashInfo);
                  } catch (error) {
                    console.warn('Failed to update file hash after save:', error);
                  }
                } else {
                  throw new Error(result.error);
                }
              },
            },
          });
          window.dispatchEvent(event);
          return true;
        } else {
          // ファイル変更がない場合は通常の保存
          const result = await desktopApi.saveFileToPath(tab.filePath, tab.content);
          if (result.success) {
            setTabModified(id, false);
            // 保存後にファイルハッシュ情報を更新
            try {
              const newHashInfo = await desktopApi.getFileHash(tab.filePath);
              updateTabFileHash(id, newHashInfo);
              console.log('File hash updated after save:', newHashInfo);
            } catch (error) {
              console.warn('Failed to update file hash after save:', error);
            }
            return true;
          } else {
            throw new Error(result.error);
          }
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

          // 保存後にファイルハッシュ情報を更新
          try {
            const newHashInfo = await desktopApi.getFileHash(result.filePath);
            updateTabFileHash(id, newHashInfo);
            console.log('File hash updated after save as:', newHashInfo);
          } catch (error) {
            console.warn('Failed to update file hash after save as:', error);
          }

          return true;
        } else {
          throw new Error(result.error);
        }
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      return false;
    }
  }, [state.tabs, setTabModified, setTabFilePath, updateTabTitle, setTabNew, updateTabContent]);

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

  const reorderTabs = useCallback((reorderedTabs: Tab[]) => {
    dispatch({ type: 'REORDER_TABS', payload: { tabs: reorderedTabs } });
  }, []);

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

  // 状態を保存
  const saveState = useCallback(async () => {
    try {
      const appState: AppState = {
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        lastOpenedAt: Date.now(),
      };
      await storeApi.saveState(appState);
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }, [state.tabs, state.activeTabId]);

  // 状態を復元
  const restoreState = useCallback(async () => {
    try {
      console.log('Starting state restoration...');
      const savedState = await storeApi.loadState();
      if (savedState) {
        console.log('Found saved state, restoring...');
        // 保存済みファイルの内容を再読み込み
        const restoredTabs = await Promise.all(
          savedState.tabs.map(async (tab) => {
            if (!tab.isNew && tab.filePath) {
              try {
                console.log(`Loading file: ${tab.filePath}`);
                const content = await desktopApi.readFileFromPath(tab.filePath);

                // ファイルハッシュ情報も取得
                let fileHashInfo = undefined;
                try {
                  fileHashInfo = await desktopApi.getFileHash(tab.filePath);
                } catch (error) {
                  console.warn(`Failed to get file hash for ${tab.filePath}:`, error);
                }

                return { ...tab, content, fileHashInfo };
              } catch (error) {
                console.error(`Failed to load file: ${tab.filePath}`, error);
                return { ...tab, isNew: true, filePath: undefined };
              }
            }
            return tab;
          })
        );

        const restoredState: AppState = {
          ...savedState,
          tabs: restoredTabs,
        };

        console.log('Dispatching restored state:', restoredState);
        dispatch({ type: 'LOAD_STATE', payload: restoredState });
      } else {
        console.log('No saved state found, creating initial state');
        // 初回起動時は初期状態を作成
        const initialState = storeApi.createInitialState();
        dispatch({ type: 'LOAD_STATE', payload: initialState });
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
      // エラー時は初期状態を作成
      const initialState = storeApi.createInitialState();
      dispatch({ type: 'LOAD_STATE', payload: initialState });
    }
    setIsInitialized(true);
  }, []);

  // 初期化処理
  useEffect(() => {
    restoreState();
  }, [restoreState]);

  // 状態変更時に自動保存
  useEffect(() => {
    if (isInitialized) {
      console.log('Auto-saving state due to changes');
      saveState();
    }
  }, [state.tabs, state.activeTabId, isInitialized, saveState]);

  return {
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    activeTab: getActiveTab(),
    isInitialized,
    addTab,
    removeTab,
    setActiveTab,
    updateTabContent,
    updateTabTitle,
    setTabModified,
    setTabFilePath,
    setTabNew,
    updateTabFileHash,
    reorderTabs,
    openFile,
    saveTab,
    saveTabAs,
    createNewTab,
  };
};
