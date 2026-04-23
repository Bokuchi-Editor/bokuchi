import { useState, useEffect, useCallback } from 'react';
import { Tab } from '../types/tab';
import { desktopApi } from '../api/desktopApi';
import { detectFileChange } from '../utils/fileChangeDetection';
import { debugLog, summarize, shortStack } from '../utils/debugLog';

interface UseFileChangeDetectionParams {
  tabs: Tab[];
  activeTab: Tab | null;
  isInitialized: boolean;
  reloadTabContent: (tabId: string, content: string) => void;
  updateTabFileHash: (tabId: string, hashInfo: { hash: string; modified_time: number; file_size: number }) => void;
  setTabModified: (tabId: string, isModified: boolean) => void;
  setActiveTab: (tabId: string) => void;
}

export const useFileChangeDetection = ({
  tabs,
  activeTab,
  isInitialized,
  reloadTabContent,
  updateTabFileHash,
  setTabModified,
  setActiveTab,
}: UseFileChangeDetectionParams) => {
  const [fileChangeDialog, setFileChangeDialog] = useState<{
    open: boolean;
    fileName: string;
    onReload: () => void;
    onCancel: () => void;
  }>({
    open: false,
    fileName: '',
    onReload: () => {},
    onCancel: () => {},
  });

  // File change detection event listener
  useEffect(() => {
    const handleFileChangeDetected = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { fileName, onCancel, tabId } = customEvent.detail;
      setFileChangeDialog({
        open: true,
        fileName,
        onReload: async () => {
          try {
            const currentTabs = tabs;
            const tab = currentTabs.find(t => t.id === tabId);

            if (tab && tab.filePath && !tab.isNew) {
              debugLog('[FC] dialog-reload readFileByPath', { tabId, filePath: tab.filePath });
              // Use readFileByPath (custom Tauri command) instead of readFileFromPath
              // (FS plugin) to avoid scope/path issues on Windows
              const fileResult = await desktopApi.readFileByPath(tab.filePath);
              if (fileResult.error) {
                console.error('Failed to read file for reload:', fileResult.error);
                debugLog('[FC] dialog-reload read-failed', { tabId, error: fileResult.error });
              } else {
                reloadTabContent(tabId, fileResult.content);
                debugLog('[FC] dialog-reload reloadTabContent', {
                  tabId,
                  contentSummary: summarize(fileResult.content),
                });

                // Sync Monaco model directly (it may be out of sync if Editor is
                // unmounted, e.g. in preview mode with keepCurrentModel)
                const monaco = (window as { monaco?: typeof import('monaco-editor') }).monaco;
                if (monaco?.editor?.getModels) {
                  for (const model of monaco.editor.getModels()) {
                    const uriStr = model.uri.toString();
                    if (uriStr === tabId || uriStr.endsWith('/' + tabId)) {
                      if (model.getValue() !== fileResult.content) {
                        debugLog('[FC] dialog-reload model.setValue', {
                          tabId,
                          modelUri: uriStr,
                          stack: shortStack(),
                        });
                        model.setValue(fileResult.content);
                      }
                      break;
                    }
                  }
                }

                try {
                  const newHashInfo = await desktopApi.getFileHash(tab.filePath);
                  updateTabFileHash(tabId, newHashInfo);
                } catch (error) {
                  console.warn('Failed to update file hash after reload:', error);
                }
              }
            }
            setActiveTab(tabId);
          } catch (error) {
            console.error('Failed to reload file:', error);
          }
          setFileChangeDialog(prev => ({ ...prev, open: false }));
        },
        onCancel: async () => {
          try {
            await onCancel();
          } catch (error) {
            console.error('Failed to execute cancel handler:', error);
          }
          setFileChangeDialog(prev => ({ ...prev, open: false }));
        },
      });
    };

    window.addEventListener('fileChangeDetected', handleFileChangeDetected);
    return () => {
      window.removeEventListener('fileChangeDetected', handleFileChangeDetected);
    };
  }, [tabs, reloadTabContent, updateTabFileHash, setActiveTab, isInitialized]);

  // Common file change detection handler
  const checkFileChange = useCallback(async (tab: Tab, source: string) => {
    if (!tab || tab.isNew || !tab.filePath) {
      debugLog('[FC] checkFileChange skipped', {
        source,
        reason: !tab ? 'no-tab' : tab.isNew ? 'isNew' : 'no-filePath',
        tabId: tab?.id ?? null,
      });
      return;
    }

    try {
      const hasChanged = await detectFileChange(tab);
      debugLog('[FC] checkFileChange detect', {
        source,
        tabId: tab.id,
        filePath: tab.filePath,
        hasChanged,
        storedHash: tab.fileHashInfo?.hash ?? null,
        storedSize: tab.fileHashInfo?.file_size ?? null,
      });
      if (hasChanged) {
        const event = new CustomEvent('fileChangeDetected', {
          detail: {
            fileName: tab.title,
            tabId: tab.id,
            onReload: async () => {
              try {
                const fileResult = await desktopApi.readFileByPath(tab.filePath!);
                if (!fileResult.error) {
                  reloadTabContent(tab.id, fileResult.content);
                  const newHashInfo = await desktopApi.getFileHash(tab.filePath!);
                  updateTabFileHash(tab.id, newHashInfo);
                }
                setActiveTab(tab.id);
              } catch (error) {
                console.error('Failed to reload file:', error);
              }
            },
            onCancel: async () => {
              setTabModified(tab.id, true);
              try {
                const newHashInfo = await desktopApi.getFileHash(tab.filePath!);
                updateTabFileHash(tab.id, newHashInfo);
              } catch (error) {
                console.warn('Failed to update file hash after cancel:', error);
              }
              setActiveTab(tab.id);
            },
          },
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.warn(`Failed to check file change during ${source}:`, error);
    }
  }, [reloadTabContent, updateTabFileHash, setTabModified, setActiveTab]);

  // Periodic file change check (every 5 seconds)
  // Stop polling while the file change dialog is open to prevent re-triggering
  useEffect(() => {
    if (!isInitialized || fileChangeDialog.open) {
      debugLog('[FC] periodic-check setup skipped', {
        isInitialized,
        dialogOpen: fileChangeDialog.open,
      });
      return;
    }
    debugLog('[FC] periodic-check setup', {
      activeTabId: activeTab?.id ?? null,
      activeTabIsNew: activeTab?.isNew ?? null,
      activeTabFilePath: activeTab?.filePath ?? null,
    });

    const interval = setInterval(async () => {
      if (activeTab && !activeTab.isNew && activeTab.filePath) {
        await checkFileChange(activeTab, 'periodic check');
      } else {
        debugLog('[FC] periodic-check tick skipped', {
          hasActiveTab: !!activeTab,
          isNew: activeTab?.isNew ?? null,
          filePath: activeTab?.filePath ?? null,
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isInitialized, activeTab, checkFileChange, fileChangeDialog.open]);

  return {
    fileChangeDialog,
    setFileChangeDialog,
  };
};
