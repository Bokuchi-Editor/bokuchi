import { useReducer, useCallback, useEffect, useState } from 'react';
import { tabReducer, initialTabState } from '../reducers/tabReducer';
import { Tab, AppState } from '../types/tab';
import { desktopApi } from '../api/desktopApi';
import { storeApi } from '../api/storeApi';
import { detectFileChange } from '../utils/fileChangeDetection';

// グローバルなタブ状態管理（重複チェック用）
let globalTabsState: Tab[] = [];

// グローバル状態を更新する関数
const updateGlobalTabsState = (tabs: Tab[]) => {
  globalTabsState = [...tabs];
};

// グローバル状態から重複チェックを行う関数
const checkDuplicateFile = (filePath: string): Tab | null => {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return globalTabsState.find(tab => {
    if (!tab.filePath) return false;
    const normalizedExistingPath = tab.filePath.replace(/\\/g, '/');
    return normalizedExistingPath === normalizedPath;
  }) || null;
};

export const useTabsDesktop = () => {
  const [state, dispatch] = useReducer(tabReducer, initialTabState);
  const [isInitialized, setIsInitialized] = useState(false);

  // 状態が更新されるたびにグローバル状態を更新
  useEffect(() => {
    updateGlobalTabsState(state.tabs);
  }, [state.tabs]);

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

    // ファイル変更検知はuseAppStateの定期的チェックに統一
    dispatch({ type: 'SET_ACTIVE_TAB', payload: { id } });
  }, [state.tabs]);

  const openFile = useCallback(async (filePath?: string) => {
    try {
      let result;
      if (filePath) {
        // ファイルパスが指定されている場合は、直接ファイルを読み込む
        const fileResult = await desktopApi.readFileByPath(filePath);
        if (fileResult.error) {
          throw new Error(fileResult.error);
        }
        result = {
          content: fileResult.content,
          filePath: fileResult.filePath || filePath,
          error: null
        };
      } else {
        // ファイルパスが指定されていない場合は、ファイル選択ダイアログを開く
        result = await desktopApi.openFile();
        if (result.error) {
          throw new Error(result.error);
        }
      }

      // 同じファイルが既に開かれているかチェック（グローバル状態を使用）
      if (result.filePath) {
        // パスを正規化（絶対パスに変換）
        const normalizedPath = result.filePath.replace(/\\/g, '/');
        console.log('🔍 Checking for existing file with normalized path:', normalizedPath);
        await desktopApi.logToRust(`🔍 Checking for existing file with normalized path: ${normalizedPath}`);

        // グローバル状態から重複チェック
        const existingTab = checkDuplicateFile(result.filePath);

        console.log('🔍 Global tabs count:', globalTabsState.length);
        await desktopApi.logToRust(`🔍 Global tabs count: ${globalTabsState.length}`);

        // 各タブの詳細をログ出力
        for (let index = 0; index < globalTabsState.length; index++) {
          const tab = globalTabsState[index];
          console.log(`🔍 Global Tab ${index}: ${tab.filePath} (id: ${tab.id})`);
          await desktopApi.logToRust(`🔍 Global Tab ${index}: ${tab.filePath} (id: ${tab.id})`);
        }

        if (existingTab) {
          console.log('📁 File already open, switching to existing tab:', result.filePath);
          await desktopApi.logToRust(`📁 File already open, switching to existing tab: ${result.filePath} (existing tab: ${existingTab.id})`);
          setActiveTab(existingTab.id);
          return existingTab.id;
        } else {
          console.log('📁 File not found in existing tabs, will create new tab');
          await desktopApi.logToRust(`📁 File not found in existing tabs, will create new tab: ${result.filePath}`);
        }
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

      // ファイルパスを正規化して保存
      const normalizedFilePath = result.filePath ? result.filePath.replace(/\\/g, '/') : undefined;
      console.log('📁 Creating new tab with normalized file path:', normalizedFilePath);
      await desktopApi.logToRust(`📁 Creating new tab with normalized file path: ${normalizedFilePath}`);

      const tabId = addTab({
        title: fileName,
        content: result.content,
        filePath: normalizedFilePath,
        isModified: false,
        isNew: false,
        fileHashInfo,
      });

      setActiveTab(tabId);

      // Recent Filesに追加
      try {
        await storeApi.addRecentFile(
          result.filePath || '',
          fileName,
          result.content,
          fileHashInfo?.file_size,
          fileHashInfo?.modified_time
        );
      } catch (error) {
        console.error('Failed to add to recent files:', error);
        // Recent Filesの追加に失敗してもファイルを開く処理は続行
      }

      return tabId;
    } catch (error) {
      console.error('Failed to open file:', error);
      throw error;
    }
  }, [addTab, setActiveTab, state.tabs]);

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
                // コンテンツを更新
                updateTabContent(id, newContent);
                setTabModified(id, false);

                // ファイルハッシュ情報を更新
                try {
                  const newHashInfo = await desktopApi.getFileHash(tab.filePath!);
                  updateTabFileHash(id, newHashInfo);
                } catch (error) {
                  console.warn('Failed to update file hash after reload before save:', error);
                }

                // 保存を実行
                desktopApi.saveFileToPath(tab.filePath!, newContent)
                  .then(result => {
                    if (result.success) {
                      setTabModified(id, false);
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
                    updateTabFileHash(id, newHashInfo);
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

              // Recent Filesに追加
              await storeApi.addRecentFile(
                tab.filePath,
                tab.title,
                tab.content,
                newHashInfo.file_size,
                newHashInfo.modified_time
              );
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

            // Recent Filesに追加
            await storeApi.addRecentFile(
              result.filePath,
              displayName,
              tab.content,
              newHashInfo.file_size,
              newHashInfo.modified_time
            );
          } catch (error) {
            console.warn('Failed to update file hash after save as:', error);
          }

          return true;
        } else {
          // ユーザーがキャンセルした場合はfalseを返す（エラーを投げない）
          return false;
        }
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      console.error('Error details:', error);
      return false;
    }
  }, [state.tabs, setTabModified, setTabFilePath, updateTabTitle, setTabNew, updateTabContent]);

  const saveTabAs = useCallback(async (id: string) => {
    const tab = state.tabs.find(t => t.id === id);

    if (!tab) {
      return false;
    }

    try {
      // Save Asは常にダイアログを開く（既存のファイルパスは無視）
      const result = await desktopApi.saveFileAs(tab.content);

      if (result.success && result.filePath) {
        setTabFilePath(id, result.filePath);
        const displayName = result.filePath.split('/').pop()?.split('\\').pop() || result.filePath;
        updateTabTitle(id, displayName);
        setTabModified(id, false);
        // Save Asでも新しいファイルとして保存されたので、isNewフラグをfalseに設定
        setTabNew(id, false);
        return true;
      } else {
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
    const foundTab = state.tabs.find(tab => tab.id === state.activeTabId);
    return foundTab || null;
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
      const savedState = await storeApi.loadState();
      if (savedState) {
        // 保存済みファイルの内容を再読み込み
        const restoredTabs = await Promise.all(
          savedState.tabs.map(async (tab) => {
            if (!tab.isNew && tab.filePath) {
              try {
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

        dispatch({ type: 'LOAD_STATE', payload: restoredState });
      } else {
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
