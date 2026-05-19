import { useState, useCallback } from 'react';
import { Tab } from '../types/tab';
import { desktopApi } from '../api/desktopApi';
import { variableApi } from '../api/variableApi';

export interface UseFileOperationsParams {
  activeTab: Tab | null;
  tabs: Tab[];
  globalVariables: Record<string, string>;
  openFile: (filePath?: string) => Promise<string>;
  saveTab: (tabId: string) => Promise<boolean>;
  saveTabAs: (tabId: string) => Promise<boolean>;
  removeTab: (tabId: string) => void;
  requestEditorFocus: () => void;
  setSnackbar: (snackbar: { open: boolean; message: string; severity: 'success' | 'error' | 'warning' }) => void;
  showSaveStatus: (message: string) => void;
  t: (key: string) => string;
}

export const useFileOperations = ({
  activeTab,
  tabs,
  globalVariables,
  openFile,
  saveTab,
  saveTabAs,
  removeTab,
  requestEditorFocus,
  setSnackbar,
  showSaveStatus,
  t,
}: UseFileOperationsParams) => {
  const [saveBeforeCloseDialog, setSaveBeforeCloseDialog] = useState<{
    open: boolean;
    fileName: string;
    tabId: string | null;
    queue: Array<{ tabId: string; fileName: string }>;
  }>({
    open: false,
    fileName: '',
    tabId: null,
    queue: [],
  });
  const [isDragOver, setIsDragOver] = useState(false);

  const handleOpenFile = async () => {
    try {
      await openFile();
      setSnackbar({ open: true, message: t('fileOperations.fileLoaded'), severity: 'success' });
      requestEditorFocus();
    } catch {
      setSnackbar({ open: true, message: t('fileOperations.fileLoadFailed'), severity: 'error' });
    }
  };

  const handleSaveFile = async () => {
    if (activeTab) {
      try {
        const success = await saveTab(activeTab.id);
        if (success) {
          showSaveStatus(t('statusBar.saved'));
        } else {
          setSnackbar({ open: true, message: t('fileOperations.fileSaveFailed'), severity: 'error' });
        }
      } catch {
        setSnackbar({ open: true, message: t('fileOperations.fileSaveFailed'), severity: 'error' });
      }
    }
  };

  const handleSaveFileAs = useCallback(async () => {
    if (activeTab) {
      try {
        const success = await saveTabAs(activeTab.id);
        if (success) {
          showSaveStatus(t('statusBar.saved'));
        } else {
          setSnackbar({ open: true, message: t('fileOperations.fileSaveFailed'), severity: 'error' });
        }
      } catch (error) {
        console.error('Error in handleSaveFileAs:', error);
        setSnackbar({ open: true, message: t('fileOperations.fileSaveFailed'), severity: 'error' });
      }
    } else {
      setSnackbar({
        open: true,
        message: t('fileOperations.noActiveTab') || 'No active tab to save',
        severity: 'error'
      });
    }
  }, [activeTab, saveTabAs, setSnackbar, showSaveStatus, t]);

  const handleSaveWithVariables = useCallback(async () => {
    if (!activeTab) {
      setSnackbar({
        open: true,
        message: t('fileOperations.noActiveTab') || 'No active tab to save',
        severity: 'error'
      });
      return;
    }

    try {
      const expandedContent = await variableApi.getExpandedMarkdown(activeTab.content, globalVariables);
      const result = await desktopApi.saveFileAs(expandedContent);
      if (result.success) {
        showSaveStatus(t('statusBar.saved'));
      } else {
        setSnackbar({ open: true, message: t('fileOperations.fileSaveFailed'), severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to save file with variables:', error);
      setSnackbar({ open: true, message: t('fileOperations.fileSaveFailed'), severity: 'error' });
    }
  }, [activeTab, globalVariables, setSnackbar, showSaveStatus, t]);

  const advanceCloseQueue = useCallback(() => {
    setSaveBeforeCloseDialog(prev => {
      if (prev.queue.length === 0) {
        return { open: false, fileName: '', tabId: null, queue: [] };
      }
      const [next, ...rest] = prev.queue;
      return {
        open: true,
        fileName: next.fileName,
        tabId: next.tabId,
        queue: rest,
      };
    });
  }, []);

  const startCloseQueue = useCallback((tabIds: string[]) => {
    const items = tabIds
      .map(id => {
        const tab = tabs.find(entry => entry.id === id);
        return tab ? { tabId: id, fileName: tab.title } : null;
      })
      .filter((item): item is { tabId: string; fileName: string } => item !== null);
    if (items.length === 0) return;
    const [first, ...rest] = items;
    setSaveBeforeCloseDialog({
      open: true,
      fileName: first.fileName,
      tabId: first.tabId,
      queue: rest,
    });
  }, [tabs]);

  const handleTabClose = (tabId: string) => {
    const tab = tabs.find(entry => entry.id === tabId);
    if (!tab) return;

    if (tab.isModified) {
      setSaveBeforeCloseDialog({
        open: true,
        fileName: tab.title,
        tabId: tabId,
        queue: [],
      });
    } else {
      removeTab(tabId);
    }
  };

  const handleSaveBeforeClose = async () => {
    if (!saveBeforeCloseDialog.tabId) return;
    const targetTabId = saveBeforeCloseDialog.tabId;

    try {
      const success = await saveTab(targetTabId);
      if (success) {
        removeTab(targetTabId);
        showSaveStatus(t('statusBar.saved'));
      }
    } catch (error) {
      console.error('Failed to save file before closing:', error);
      setSnackbar({ open: true, message: t('fileOperations.fileSaveFailed'), severity: 'error' });
    } finally {
      advanceCloseQueue();
    }
  };

  const handleDontSaveBeforeClose = () => {
    if (saveBeforeCloseDialog.tabId) {
      removeTab(saveBeforeCloseDialog.tabId);
    }
    advanceCloseQueue();
  };

  const handleCancelBeforeClose = () => {
    advanceCloseQueue();
  };

  return {
    saveBeforeCloseDialog,
    setSaveBeforeCloseDialog,
    isDragOver,
    setIsDragOver,
    handleOpenFile,
    handleSaveFile,
    handleSaveFileAs,
    handleSaveWithVariables,
    handleTabClose,
    handleSaveBeforeClose,
    handleDontSaveBeforeClose,
    handleCancelBeforeClose,
    startCloseQueue,
  };
};
