import { useState, useEffect, useCallback } from 'react';
import { Tab } from '../types/tab';
import { desktopApi } from '../api/desktopApi';
import { detectFileChange } from '../utils/fileChangeDetection';

interface UseFileChangeDetectionParams {
  tabs: Tab[];
  activeTab: Tab | null;
  isInitialized: boolean;
  updateTabContent: (tabId: string, content: string) => void;
  updateTabFileHash: (tabId: string, hashInfo: { hash: string; modified_time: number; file_size: number }) => void;
  setActiveTab: (tabId: string) => void;
}

export const useFileChangeDetection = ({
  tabs,
  activeTab,
  isInitialized,
  updateTabContent,
  updateTabFileHash,
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
              const fileContent = await desktopApi.readFileFromPath(tab.filePath);
              updateTabContent(tabId, fileContent);

              try {
                const newHashInfo = await desktopApi.getFileHash(tab.filePath);
                updateTabFileHash(tabId, newHashInfo);
              } catch (error) {
                console.warn('Failed to update file hash after reload:', error);
              }
            }
            setActiveTab(tabId);
          } catch (error) {
            console.error('Failed to reload file:', error);
          }
          setFileChangeDialog(prev => ({ ...prev, open: false }));
        },
        onCancel: async () => {
          onCancel();
          try {
            const currentTabs = tabs;
            const tab = currentTabs.find(t => t.id === tabId);
            if (tab && tab.filePath && !tab.isNew) {
              const newHashInfo = await desktopApi.getFileHash(tab.filePath);
              updateTabFileHash(tabId, newHashInfo);
            }
          } catch (error) {
            console.warn('Failed to update file hash after cancel:', error);
          }
          setActiveTab(tabId);
          setFileChangeDialog(prev => ({ ...prev, open: false }));
        },
      });
    };

    window.addEventListener('fileChangeDetected', handleFileChangeDetected);
    return () => {
      window.removeEventListener('fileChangeDetected', handleFileChangeDetected);
    };
  }, [tabs, updateTabContent, updateTabFileHash, setActiveTab, isInitialized]);

  // Common file change detection handler
  const checkFileChange = useCallback(async (tab: Tab, source: string) => {
    if (!tab || tab.isNew || !tab.filePath) return;

    try {
      const hasChanged = await detectFileChange(tab);
      if (hasChanged) {
        const event = new CustomEvent('fileChangeDetected', {
          detail: {
            fileName: tab.title,
            tabId: tab.id,
            onReload: async () => {
              try {
                const fileContent = await desktopApi.readFileFromPath(tab.filePath!);
                updateTabContent(tab.id, fileContent);
                const newHashInfo = await desktopApi.getFileHash(tab.filePath!);
                updateTabFileHash(tab.id, newHashInfo);
                setActiveTab(tab.id);
              } catch (error) {
                console.error('Failed to reload file:', error);
              }
            },
            onCancel: async () => {
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
  }, [updateTabContent, updateTabFileHash, setActiveTab]);

  // Periodic file change check (every 5 seconds)
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(async () => {
      if (activeTab && !activeTab.isNew && activeTab.filePath) {
        await checkFileChange(activeTab, 'periodic check');
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isInitialized, activeTab, checkFileChange]);

  return {
    fileChangeDialog,
    setFileChangeDialog,
  };
};
