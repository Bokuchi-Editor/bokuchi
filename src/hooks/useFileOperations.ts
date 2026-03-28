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
  }>({
    open: false,
    fileName: '',
    tabId: null,
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

  const handleTabClose = (tabId: string) => {
    const tab = tabs.find(entry => entry.id === tabId);
    if (!tab) return;

    if (tab.isModified) {
      setSaveBeforeCloseDialog({
        open: true,
        fileName: tab.title,
        tabId: tabId,
      });
    } else {
      removeTab(tabId);
    }
  };

  const handleSaveBeforeClose = async () => {
    if (!saveBeforeCloseDialog.tabId) return;

    try {
      const success = await saveTab(saveBeforeCloseDialog.tabId);
      if (success) {
        removeTab(saveBeforeCloseDialog.tabId);
        showSaveStatus(t('statusBar.saved'));
      }
    } catch (error) {
      console.error('Failed to save file before closing:', error);
      setSnackbar({ open: true, message: t('fileOperations.fileSaveFailed'), severity: 'error' });
    } finally {
      setSaveBeforeCloseDialog({ open: false, fileName: '', tabId: null });
    }
  };

  const handleDontSaveBeforeClose = () => {
    if (saveBeforeCloseDialog.tabId) {
      removeTab(saveBeforeCloseDialog.tabId);
    }
    setSaveBeforeCloseDialog({ open: false, fileName: '', tabId: null });
  };

  const handleCancelBeforeClose = () => {
    setSaveBeforeCloseDialog({ open: false, fileName: '', tabId: null });
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
  };
};
