import { useEffect, useRef, useState } from 'react';
import { isImageFilePath } from '../utils/imageInsertion';
import { isSupportedDocumentFile } from '../utils/fileDropFilters';

type SnackbarState = { open: boolean; message: string; severity: 'success' | 'error' | 'warning' };

/** Handlers the desktop event listeners invoke, always read via a live ref. */
export interface DesktopEventHandlers {
  handleNewTab: () => void;
  handleSaveFile: () => void;
  handleSaveFileAs: () => void;
  handleSaveWithVariables: () => void;
  handleHelpOpen: () => void;
  openFile: (filePath?: string) => Promise<string>;
  requestEditorFocus: () => void;
  setIsDragOver: (value: boolean) => void;
  setSnackbar: (snackbar: SnackbarState) => void;
  t: (key: string) => string;
}

/** Suppress duplicate native menu events fired in quick succession. */
const MENU_DEBOUNCE_MS = 100;
/** Suppress a repeat open-file event for the same path (macOS re-fires on drop). */
const FILE_OPEN_DEBOUNCE_MS = 2000;

/**
 * Register the Tauri menu, file-association, and drag-drop listeners once, and
 * report when they are all wired up. Handlers are read through a ref so the
 * listeners always call the latest closures without re-registering.
 *
 * @returns whether every listener has finished registering.
 */
export function useDesktopEventListeners(handlers: DesktopEventHandlers): boolean {
  const [listenersReady, setListenersReady] = useState(false);

  // Always hold the latest handlers, avoiding stale closures in event listeners.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    let cancelled = false;

    let unlistenMenu: (() => void) | undefined;
    let unlistenNewFile: (() => void) | undefined;
    let unlistenOpenFile: (() => void) | undefined;
    let unlistenSaveAs: (() => void) | undefined;
    let unlistenSaveWithVariables: (() => void) | undefined;
    let unlistenHelp: (() => void) | undefined;
    let unlistenFileOpen: (() => void) | undefined;
    let unlistenDragDrop: (() => void) | undefined;

    const setupMenuListeners = async () => {
      const { listen } = await import('@tauri-apps/api/event');

      // If effect was cleaned up during the async import, don't register listeners
      if (cancelled) return;

      // Shared debounce state for menu events (attached to window to survive re-renders)
      const globalDebounce = (window as unknown as {
        lastMenuEventTime?: number;
      });

      if (!globalDebounce.lastMenuEventTime) {
        globalDebounce.lastMenuEventTime = 0;
      }

      // Returns true if the event should be suppressed (within debounce window)
      const isMenuDebounced = (): boolean => {
        const now = Date.now();
        if (now - globalDebounce.lastMenuEventTime! < MENU_DEBOUNCE_MS) {
          return true;
        }
        globalDebounce.lastMenuEventTime = now;
        return false;
      };

      unlistenMenu = await listen('menu-save', () => {
        if (!isMenuDebounced()) handlersRef.current.handleSaveFile();
      });

      unlistenNewFile = await listen('menu-new-file', () => {
        if (!isMenuDebounced()) handlersRef.current.handleNewTab();
      });

      unlistenOpenFile = await listen('menu-open-file', async () => {
        if (isMenuDebounced()) return;
        try {
          await handlersRef.current.openFile();
        } catch (error) {
          console.error('Failed to open file from menu:', error);
        }
      });

      unlistenSaveAs = await listen('menu-save-as', () => {
        if (!isMenuDebounced()) handlersRef.current.handleSaveFileAs();
      });

      unlistenSaveWithVariables = await listen('menu-save-with-variables', () => {
        if (!isMenuDebounced()) handlersRef.current.handleSaveWithVariables();
      });

      unlistenHelp = await listen('menu-help', () => {
        if (!isMenuDebounced()) handlersRef.current.handleHelpOpen();
      });

      // File association event listener with debounce
      const fileOpenDebounce = (window as unknown as {
        lastFileOpenTime?: number;
        lastFilePath?: string;
      });

      if (!fileOpenDebounce.lastFileOpenTime) {
        fileOpenDebounce.lastFileOpenTime = 0;
      }
      if (!fileOpenDebounce.lastFilePath) {
        fileOpenDebounce.lastFilePath = '';
      }

      unlistenFileOpen = await listen('open-file', async (event: { payload: { file_path: string } }) => {
        const now = Date.now();
        const timeDiff = now - fileOpenDebounce.lastFileOpenTime!;
        const currentFilePath = event.payload.file_path;
        const isSameFile = currentFilePath === fileOpenDebounce.lastFilePath;

        // Debounce: same file within time limit
        if (isSameFile && timeDiff < FILE_OPEN_DEBOUNCE_MS) {
          return;
        }
        fileOpenDebounce.lastFileOpenTime = now;
        fileOpenDebounce.lastFilePath = currentFilePath;
        await handlersRef.current.openFile(currentFilePath);
        handlersRef.current.requestEditorFocus();
      });

      // Drag and drop event listener (uses Tauri API to get file paths)
      const { getCurrentWebview } = await import('@tauri-apps/api/webview');
      if (cancelled) return;

      unlistenDragDrop = await getCurrentWebview().onDragDropEvent(async (event) => {
        if (event.payload.type === 'enter') {
          const hasSupported = event.payload.paths.some(isSupportedDocumentFile);
          if (hasSupported) {
            handlersRef.current.setIsDragOver(true);
          }
        } else if (event.payload.type === 'leave') {
          handlersRef.current.setIsDragOver(false);
        } else if (event.payload.type === 'drop') {
          handlersRef.current.setIsDragOver(false);
          const supportedPaths = event.payload.paths.filter(isSupportedDocumentFile);
          if (supportedPaths.length === 0) {
            // Image drops are handled by the editor's own drag-drop listener
            // (inserted as Markdown links), so don't treat them as an error here.
            const hasImage = event.payload.paths.some(isImageFilePath);
            if (!hasImage) {
              handlersRef.current.setSnackbar({
                open: true,
                message: handlersRef.current.t('fileOperations.noMarkdownFiles'),
                severity: 'error',
              });
            }
            return;
          }

          // Mark in fileOpenDebounce so the subsequent RunEvent::Opened
          // (which macOS also fires for dropped files) is suppressed
          fileOpenDebounce.lastFileOpenTime = Date.now();
          fileOpenDebounce.lastFilePath = supportedPaths[0];

          try {
            await handlersRef.current.openFile(supportedPaths[0]);
            handlersRef.current.requestEditorFocus();
          } catch {
            handlersRef.current.setSnackbar({
              open: true,
              message: handlersRef.current.t('fileOperations.fileLoadFailed'),
              severity: 'error',
            });
          }
        }
      });

      // Signal that all listeners are registered
      setListenersReady(true);
    };

    setupMenuListeners();

    return () => {
      cancelled = true;
      if (unlistenMenu) unlistenMenu();
      if (unlistenNewFile) unlistenNewFile();
      if (unlistenOpenFile) unlistenOpenFile();
      if (unlistenSaveAs) unlistenSaveAs();
      if (unlistenSaveWithVariables) unlistenSaveWithVariables();
      if (unlistenHelp) unlistenHelp();
      if (unlistenFileOpen) unlistenFileOpen();
      if (unlistenDragDrop) unlistenDragDrop();
    };
  }, []); // Empty dependency array to run only once

  return listenersReady;
}
