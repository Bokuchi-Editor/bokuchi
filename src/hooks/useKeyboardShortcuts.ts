import { useEffect, useCallback } from 'react';
import { Tab } from '../types/tab';
import { AppSettings } from '../types/settings';
import { getNextTabIndex } from '../utils/viewModeUtils';

interface UseKeyboardShortcutsParams {
  onNewTab: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onSaveFileAs: () => void;
  onRecentFilesOpen: () => void;
  onHelpOpen: () => void;
  onSettingsOpen: () => void;
  onRotateViewMode: () => void;
  onChangeViewMode: (mode: 'split' | 'editor' | 'preview') => void;
  tabs: Tab[];
  activeTabId: string | null;
  setActiveTab: (tabId: string) => void;
  appSettings: AppSettings;
  setOutlinePanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setFolderTreePanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useKeyboardShortcuts = ({
  onNewTab,
  onOpenFile,
  onSaveFile,
  onSaveFileAs,
  onRecentFilesOpen,
  onHelpOpen,
  onSettingsOpen,
  onRotateViewMode,
  onChangeViewMode,
  tabs,
  activeTabId,
  setActiveTab,
  appSettings,
  setOutlinePanelOpen,
  setFolderTreePanelOpen,
}: UseKeyboardShortcutsParams) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Command + N: New File
    if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
      event.preventDefault();
      onNewTab();
    }
    // Command + O: Open File
    else if ((event.metaKey || event.ctrlKey) && event.key === 'o') {
      event.preventDefault();
      onOpenFile();
    }
    // Command + S: Save
    else if ((event.metaKey || event.ctrlKey) && event.key === 's' && !event.shiftKey) {
      event.preventDefault();
      onSaveFile();
    }
    // Command + Shift + S: Save As
    else if ((event.metaKey || event.ctrlKey) && event.key === 'S' && event.shiftKey) {
      event.preventDefault();
      onSaveFileAs();
    }
    // Command + R: Recent Files
    else if ((event.metaKey || event.ctrlKey) && event.key === 'r') {
      event.preventDefault();
      onRecentFilesOpen();
    }
    // F1: Help
    else if (event.key === 'F1') {
      event.preventDefault();
      onHelpOpen();
    }
    // Command + ,: Settings
    else if ((event.metaKey || event.ctrlKey) && event.key === ',') {
      event.preventDefault();
      onSettingsOpen();
    }
    // Ctrl + Shift + V: Rotate View Mode
    else if (event.ctrlKey && event.shiftKey && event.key === 'V') {
      event.preventDefault();
      onRotateViewMode();
    }
    // Ctrl + Shift + 1: Split View
    else if (event.ctrlKey && event.shiftKey && (event.key === '1' || event.key === '!' || event.code === 'Digit1')) {
      event.preventDefault();
      onChangeViewMode('split');
    }
    // Ctrl + Shift + 2: Editor Only
    else if (event.ctrlKey && event.shiftKey && (event.key === '2' || event.key === '@' || event.code === 'Digit2')) {
      event.preventDefault();
      onChangeViewMode('editor');
    }
    // Ctrl + Shift + 3: Preview Only
    else if (event.ctrlKey && event.shiftKey && (event.key === '3' || event.key === '#' || event.code === 'Digit3')) {
      event.preventDefault();
      onChangeViewMode('preview');
    }
    // Ctrl + Shift + E: Toggle Folder Tree Panel
    else if (event.ctrlKey && event.shiftKey && (event.key === 'E' || event.key === 'e') && !event.metaKey) {
      event.preventDefault();
      if (appSettings.interface.folderTreeDisplayMode !== 'off') {
        setFolderTreePanelOpen(prev => !prev);
      }
    }
    // Ctrl + Shift + O: Toggle Outline Panel
    else if (event.ctrlKey && event.shiftKey && (event.key === 'O' || event.key === 'o') && !event.metaKey) {
      event.preventDefault();
      setOutlinePanelOpen(prev => !prev);
    }
    // Ctrl + Tab: Switch Tabs (Next)
    else if (event.ctrlKey && event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault();
      if (tabs.length > 1) {
        const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
        const nextIndex = getNextTabIndex(currentIndex, tabs.length, 'next');
        setActiveTab(tabs[nextIndex].id);
      }
    }
    // Ctrl + Shift + Tab: Switch Tabs (Previous)
    else if (event.ctrlKey && event.key === 'Tab' && event.shiftKey) {
      event.preventDefault();
      if (tabs.length > 1) {
        const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
        const prevIndex = getNextTabIndex(currentIndex, tabs.length, 'prev');
        setActiveTab(tabs[prevIndex].id);
      }
    }
  }, [
    onNewTab,
    onOpenFile,
    onSaveFile,
    onSaveFileAs,
    onRecentFilesOpen,
    onHelpOpen,
    onSettingsOpen,
    onRotateViewMode,
    onChangeViewMode,
    tabs,
    activeTabId,
    setActiveTab,
    appSettings.interface.folderTreeDisplayMode,
    setOutlinePanelOpen,
    setFolderTreePanelOpen,
  ]);

  // Set up keyboard shortcut event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return { handleKeyDown };
};
