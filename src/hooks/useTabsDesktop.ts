import { useReducer, useCallback, useEffect, useState } from 'react';
import { tabReducer, initialTabState } from '../reducers/tabReducer';
import { Tab, AppState } from '../types/tab';
import { desktopApi } from '../api/desktopApi';
import { storeApi } from '../api/storeApi';
import { detectFileChange } from '../utils/fileChangeDetection';

// Global tab state management (for duplicate checking)
let globalTabsState: Tab[] = [];

// Update global tabs state
const updateGlobalTabsState = (tabs: Tab[]) => {
  globalTabsState = [...tabs];
};

// Check for duplicate files using global state
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

  // Update global state whenever state changes
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

  const setActiveTab = useCallback((id: string) => {
    // Validation is handled by the reducer (SET_ACTIVE_TAB)
    dispatch({ type: 'SET_ACTIVE_TAB', payload: { id } });
  }, []);

  const openFile = useCallback(async (filePath?: string) => {
    try {
      let result;
      if (filePath) {
        // If file path is provided, read the file directly
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
        // If no file path is provided, open the file selection dialog
        result = await desktopApi.openFile();
        if (result.error) {
          throw new Error(result.error);
        }
      }

      // Check if the same file is already open (using global state)
      if (result.filePath) {
        // Check for duplicates from global state
        const existingTab = checkDuplicateFile(result.filePath);

        if (existingTab) {
          setActiveTab(existingTab.id);
          return existingTab.id;
        }
      }

      // Extract file name from path
      const fileName = result.filePath ? result.filePath.split('/').pop()?.split('\\').pop() || 'Untitled' : 'Untitled';

      // Get file hash info
      let fileHashInfo = undefined;
      if (result.filePath) {
        try {
          fileHashInfo = await desktopApi.getFileHash(result.filePath);
        } catch (error) {
          console.warn('Failed to get file hash, continuing without hash info:', error);
        }
      }

      // Normalize and store file path
      const normalizedFilePath = result.filePath ? result.filePath.replace(/\\/g, '/') : undefined;

      const tabId = addTab({
        title: fileName,
        content: result.content,
        filePath: normalizedFilePath,
        isModified: false,
        isNew: false,
        fileHashInfo,
      });

      // No need for setActiveTab since ADD_TAB reducer sets activeTabId automatically

      // Add to recent files
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
        // Continue opening the file even if adding to recent files fails
      }

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
        // Check for file changes before overwriting existing file
        const hasChanged = await detectFileChange(tab);
        if (hasChanged) {
          // Fire file change detection event
          const event = new CustomEvent('fileChangeDetected', {
            detail: {
              fileName: tab.title,
              tabId: id,
              onReload: async (newContent: string) => {
                // Update content
                updateTabContent(id, newContent);
                setTabModified(id, false);

                // Update file hash info
                try {
                  const newHashInfo = await desktopApi.getFileHash(tab.filePath!);
                  updateTabFileHash(id, newHashInfo);
                } catch (error) {
                  console.warn('Failed to update file hash after reload before save:', error);
                }

                // Execute save
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
                // Save with current content
                const result = await desktopApi.saveFileToPath(tab.filePath!, tab.content);
                if (result.success) {
                  setTabModified(id, false);
                  // Update file hash info after save
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
          // Normal save if no file changes detected
          const result = await desktopApi.saveFileToPath(tab.filePath, tab.content);
          if (result.success) {
            setTabModified(id, false);
            // Update file hash info after save
            try {
              const newHashInfo = await desktopApi.getFileHash(tab.filePath);
              updateTabFileHash(id, newHashInfo);

              // Add to recent files
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
        // Save as new file (with dialog)
        const result = await desktopApi.saveFile(tab.content, tab.filePath);
        if (result.success && result.filePath) {
          setTabFilePath(id, result.filePath);
          const displayName = result.filePath.split('/').pop()?.split('\\').pop() || result.filePath;
          updateTabTitle(id, displayName);
          setTabModified(id, false);
          // Set isNew flag to false since file was saved as new
          setTabNew(id, false);

          // Update file hash info after save
          try {
            const newHashInfo = await desktopApi.getFileHash(result.filePath);
            updateTabFileHash(id, newHashInfo);

            // Add to recent files
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
          // Return false if user cancelled (don't throw error)
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
      // Save As always opens a dialog (ignores existing file path)
      const result = await desktopApi.saveFileAs(tab.content);

      if (result.success && result.filePath) {
        setTabFilePath(id, result.filePath);
        const displayName = result.filePath.split('/').pop()?.split('\\').pop() || result.filePath;
        updateTabTitle(id, displayName);
        setTabModified(id, false);
        // Set isNew flag to false since file was saved via Save As
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
    // No need for setActiveTab since ADD_TAB reducer sets activeTabId automatically
    return tabId;
  }, [addTab]);

  const getActiveTab = useCallback(() => {
    const foundTab = state.tabs.find(tab => tab.id === state.activeTabId);
    return foundTab || null;
  }, [state.tabs, state.activeTabId]);

  // Save state
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

  // Restore state
  const restoreState = useCallback(async () => {
    try {
      const savedState = await storeApi.loadState();
      if (savedState) {
        // Reload content of saved files
        const restoredTabs = await Promise.all(
          savedState.tabs.map(async (tab) => {
            if (!tab.isNew && tab.filePath) {
              try {
                const content = await desktopApi.readFileFromPath(tab.filePath);

                // Also get file hash info
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
        // Create initial state on first launch
        const initialState = storeApi.createInitialState();
        dispatch({ type: 'LOAD_STATE', payload: initialState });
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
      // Create initial state on error
      const initialState = storeApi.createInitialState();
      dispatch({ type: 'LOAD_STATE', payload: initialState });
    }
    setIsInitialized(true);
  }, []);

  // Initialization
  useEffect(() => {
    restoreState();
  }, [restoreState]);

  // Auto-save on state changes
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
