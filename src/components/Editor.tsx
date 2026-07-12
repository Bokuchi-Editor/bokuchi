import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { Search } from '@mui/icons-material';
import SearchReplacePanel from './SearchReplacePanel';
import { useTranslation } from 'react-i18next';
import { TableConversionDialog } from './TableConversionDialog';
import MarkdownToolbar from './MarkdownToolbar';
import { Tab } from '../types/tab';
import { findModelForTab, isModelSilentlyEditing } from '../utils/editorSync';
import { registerEditorActions } from '../utils/registerEditorActions';
import { classifyPaste } from '../utils/pasteClassifier';
import { computeEditorStatus } from '../utils/editorStatus';
import { desktopApi } from '../api/desktopApi';
import {
  IMAGE_SUBDIR,
  isImageFilePath,
  imageExtFromMime,
  generatePastedImageName,
  relativeImagePath,
  documentDir,
  buildImageMarkdown,
} from '../utils/imageInsertion';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  darkMode: boolean;
  theme?: string;
  /** Absolute path of the active document; used to resolve image links on paste/drop. */
  filePath?: string;
  fileNotFound?: {
    filePath: string;
    onClose: () => void;
  };
  onStatusChange?: (status: {
    line: number;
    column: number;
    totalCharacters: number;
    selectedCharacters: number;
    totalWords: number;
    selectedWords: number;
  }) => void;
  zoomLevel?: number;
  focusRequestId?: number;
  revealLineRequest?: { lineNumber: number; requestId: number };
  // New editor settings
  fontSize?: number;
  showLineNumbers?: boolean;
  tabSize?: number;
  wordWrap?: boolean;
  minimap?: boolean;
  showFormattingBar?: boolean;
  showWhitespace?: boolean;
  tableConversion?: 'auto' | 'confirm' | 'off';
  onSnackbar?: (message: string, severity: 'success' | 'error' | 'warning') => void;
  onTableConversionSettingChange?: (newSetting: 'auto' | 'confirm' | 'off') => void;
  onScrollChange?: (scrollFraction: number) => void;
  scrollFraction?: number;
  // Cross-tab search
  tabs?: Tab[];
  activeTabId?: string | null;
  onTabSwitch?: (tabId: string) => void;
}

/** Extract the first image file from clipboard data, or null if there is none. */
function getClipboardImageFile(dt: DataTransfer | null): File | null {
  if (!dt) return null;
  for (const f of dt.files ? Array.from(dt.files) : []) {
    if (f.type.startsWith('image/')) return f;
  }
  for (const item of dt.items ? Array.from(dt.items) : []) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const f = item.getAsFile();
      if (f) return f;
    }
  }
  return null;
}

const MarkdownEditor: React.FC<EditorProps> = ({
  content,
  onChange,
  darkMode,
  filePath,
  fileNotFound,
  onStatusChange,
  zoomLevel = 1.0,
  focusRequestId = 0,
  revealLineRequest,
  fontSize = 14,
  showLineNumbers = true,
  tabSize = 2,
  wordWrap = true,
  minimap = false,
  showFormattingBar = true,
  showWhitespace = false,
  tableConversion = 'confirm',
  onSnackbar,
  onTableConversionSettingChange,
  onScrollChange,
  scrollFraction,
  tabs,
  activeTabId,
  onTabSwitch,
}) => {
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchAllTabsDefault, setSearchAllTabsDefault] = useState(false);
  const [showReplaceDefault, setShowReplaceDefault] = useState(false);
  const [searchPanelHeight, setSearchPanelHeight] = useState(0);
  const [isImageDragOver, setIsImageDragOver] = useState(false);
  const [tableConversionDialog, setTableConversionDialog] = useState<{
    open: boolean;
    markdownTable: string;
    clipboardData: { plainText: string; htmlData: string } | null;
  }>({
    open: false,
    markdownTable: '',
    clipboardData: null,
  });

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const disposablesRef = useRef<import('monaco-editor').IDisposable[]>([]);
  const isProgrammaticScrollRef = useRef(false);
  // Keep the latest onScrollChange reachable from the mount-time scroll listener
  // so that changing scrollSyncMode at runtime (e.g. off -> bidirectional) takes
  // effect without remounting the editor.
  const onScrollChangeRef = useRef(onScrollChange);
  onScrollChangeRef.current = onScrollChange;

  // Dispose Monaco listeners on unmount
  useEffect(() => {
    return () => {
      disposablesRef.current.forEach(d => d.dispose());
      disposablesRef.current = [];
    };
  }, []);

  // Dispose Monaco models for closed tabs to prevent memory leaks.
  // keepCurrentModel={true} is set on the Editor component so that model
  // lifecycle is entirely managed here (the library won't dispose on unmount).
  const prevTabIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!tabs) return;
    const currentIds = new Set(tabs.map(tab => tab.id));
    for (const prevId of prevTabIdsRef.current) {
      if (!currentIds.has(prevId)) {
        findModelForTab(prevId)?.dispose();
      }
    }
    prevTabIdsRef.current = currentIds;
  }, [tabs]);

  // On unmount, dispose models for tabs that no longer exist.
  // Models for still-open tabs are kept alive so that undo history
  // survives view-mode switches (editor → preview → editor).
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  useEffect(() => {
    return () => {
      const liveIds = new Set((tabsRef.current ?? []).map(tab => tab.id));
      for (const trackedId of prevTabIdsRef.current) {
        if (!liveIds.has(trackedId)) {
          findModelForTab(trackedId)?.dispose();
        }
      }
    };
  }, []);

  const insertPlainText = useCallback((text: string) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const selection = editor.getSelection();

    if (selection) {
      editor.executeEdits('paste', [{
        range: selection,
        text: text,
        forceMoveMarkers: true
      }]);
    } else {
      // If no selection, insert at current cursor position
      const position = editor.getPosition();
      if (position) {
        editor.executeEdits('paste', [{
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          },
          text: text,
          forceMoveMarkers: true
        }]);
      }
    }
  }, []);

  const insertMarkdownTable = useCallback((markdownTable: string) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const selection = editor.getSelection();

    if (selection) {
      // If selection exists, replace
      editor.executeEdits('table-conversion', [{
        range: selection,
        text: markdownTable,
        forceMoveMarkers: true
      }]);
    } else {
      // If no selection, insert at current position
      const position = editor.getPosition();
      if (position) {
        editor.executeEdits('table-conversion', [{
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          },
          text: markdownTable,
          forceMoveMarkers: true
        }]);
      }
    }
  }, []);

  // Latest values reachable from listeners that are registered once (drag-drop).
  const filePathRef = useRef(filePath);
  filePathRef.current = filePath;
  const onSnackbarRef = useRef(onSnackbar);
  onSnackbarRef.current = onSnackbar;
  const tRef = useRef(t);
  tRef.current = t;

  // Insert text at an explicit editor position (or the current selection/caret
  // when omitted). Used by image paste/drop, which need to place the link where
  // the user dropped rather than always at the caret.
  const insertTextAt = useCallback((text: string, position?: { lineNumber: number; column: number }) => {
    const ed = editorRef.current;
    if (!ed) return;
    let range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
    if (position) {
      range = {
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      };
    } else {
      const sel = ed.getSelection();
      const pos = ed.getPosition();
      if (sel) {
        range = sel;
      } else if (pos) {
        range = { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column };
      } else {
        return;
      }
    }
    ed.executeEdits('image-insert', [{ range, text, forceMoveMarkers: true }]);
    ed.focus();
  }, []);

  // Paste path: write a clipboard bitmap (no source file) into the document's
  // images/ folder with a timestamped name, then insert the Markdown link.
  const insertImageFromClipboard = useCallback(async (file: File) => {
    const docPath = filePathRef.current;
    if (!docPath) {
      onSnackbarRef.current?.(tRef.current('imageInsert.saveFirst'), 'warning');
      return;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const ext = imageExtFromMime(file.type || 'image/png');
      const name = generatePastedImageName(new Date(), ext);
      const rel = await desktopApi.saveImageBytes(documentDir(docPath), IMAGE_SUBDIR, name, bytes);
      insertTextAt(buildImageMarkdown(rel));
      onSnackbarRef.current?.(tRef.current('imageInsert.inserted'), 'success');
    } catch (error) {
      console.error('Failed to insert pasted image:', error);
      onSnackbarRef.current?.(tRef.current('imageInsert.failed'), 'error');
    }
  }, [insertTextAt]);

  // Drop path: reference images already inside the document folder in place;
  // copy images from outside into images/. Insert all links at the drop point.
  const insertImagesFromPaths = useCallback(async (paths: string[], position?: { x: number; y: number }) => {
    const docPath = filePathRef.current;
    if (!docPath) {
      onSnackbarRef.current?.(tRef.current('imageInsert.saveFirst'), 'warning');
      return;
    }
    const dir = documentDir(docPath);
    try {
      const links: string[] = [];
      for (const p of paths) {
        const rel = relativeImagePath(dir, p) ?? (await desktopApi.copyImageAsset(p, dir, IMAGE_SUBDIR));
        links.push(buildImageMarkdown(rel));
      }
      // Map the physical drop coordinates to an editor position (fallback: caret).
      let pos: { lineNumber: number; column: number } | undefined;
      const ed = editorRef.current;
      if (ed && position) {
        const dpr = window.devicePixelRatio || 1;
        const target = ed.getTargetAtClientPoint(position.x / dpr, position.y / dpr);
        pos = target?.position ?? undefined;
      }
      insertTextAt(links.join('\n'), pos);
      const message =
        links.length > 1
          ? tRef.current('imageInsert.insertedMultiple', { count: links.length })
          : tRef.current('imageInsert.inserted');
      onSnackbarRef.current?.(message, 'success');
    } catch (error) {
      console.error('Failed to insert dropped image(s):', error);
      onSnackbarRef.current?.(tRef.current('imageInsert.failed'), 'error');
    }
  }, [insertTextAt]);

  const handlePasteWithData = useCallback(async (htmlData: string, plainText: string) => {

    try {
      // If table conversion is disabled, perform normal paste
      if (tableConversion === 'off') {
        insertPlainText(plainText);
        return;
      }

      const classification = classifyPaste(htmlData, plainText);
      if (classification.kind === 'plain') {
        insertPlainText(plainText);
        return;
      }
      const { markdownTable } = classification;

      // Process according to settings
      if (tableConversion === 'auto') {
        // Auto conversion
        insertMarkdownTable(markdownTable);
        onSnackbar?.(t('tableConversion.conversionSuccess'), 'success');
      } else if (tableConversion === 'confirm') {
        // Show confirmation dialog. Save the clipboard data (a copy, not the
        // event object) so it survives until the user decides.
        setTableConversionDialog({
          open: true,
          markdownTable,
          clipboardData: { plainText, htmlData },
        });
      }
    } catch (error) {
      console.error('Table conversion failed:', error);
      // Fallback: paste as plain text
      insertPlainText(plainText);
      onSnackbar?.(t('tableConversion.conversionFailed'), 'warning');
    }
  }, [tableConversion, insertPlainText, insertMarkdownTable, onSnackbar, t]);

  // Set up global paste event listener
  useEffect(() => {
    let isShiftPressed = false;

    // Track Shift key state with keyboard event listeners
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        isShiftPressed = true;
      }

      // Detect and handle Shift + Cmd/Ctrl + V combination directly.
      // Use e.code (physical key) instead of e.key, because e.key returns 'V'
      // (uppercase) on Windows when Shift is held, which would miss the match.
      if (e.code === 'KeyV' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Stop other event listeners as well

        // Get plain text from clipboard and paste it
        try {
          // Use Tauri clipboard API
          const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
          const clipboardText = await readText();
          insertPlainText(clipboardText);
        } catch (error) {
          console.error('Failed to read clipboard:', error);
          onSnackbar?.('Failed to paste plain text', 'error');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        isShiftPressed = false;
      }
    };

    const handleGlobalPaste = async (e: ClipboardEvent) => {

      // Check if editor is focused (compatible with Monaco Editor internal structure)
      const isEditorFocused = editorRef.current && (
        document.activeElement === editorRef.current.getDomNode() ||
        (document.activeElement && editorRef.current.getDomNode()?.contains(document.activeElement))
      );

      if (isEditorFocused) {

        // For Shift + Ctrl(Cmd) + V, paste as plain text
        if (isShiftPressed) {
          e.preventDefault();
          e.stopPropagation();

          if (e.clipboardData) {
            const plainText = e.clipboardData.getData('text/plain');
            insertPlainText(plainText);
          }
          return;
        }

        // Image paste: a screenshot / copied bitmap arrives as a file item on the
        // clipboard. Save it beside the document and insert a Markdown link.
        const imageFile = getClipboardImageFile(e.clipboardData);
        if (imageFile) {
          e.preventDefault();
          e.stopPropagation();
          await insertImageFromClipboard(imageFile);
          return;
        }

        // Normal paste processing
        // Prevent default paste processing
        e.preventDefault();
        e.stopPropagation();

        // Get clipboard data directly
        if (e.clipboardData) {
          const htmlData = e.clipboardData.getData('text/html');
          const plainText = e.clipboardData.getData('text/plain');


          await handlePasteWithData(htmlData, plainText);
        }
      }
    };

    document.addEventListener('paste', handleGlobalPaste, true); // capture phase
    document.addEventListener('keydown', handleKeyDown, true); // capture phase
    document.addEventListener('keyup', handleKeyUp, true); // capture phase

    // Cleanup
    return () => {
      document.removeEventListener('paste', handleGlobalPaste, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyUp, true);
      // (drag-drop listener is torn down in its own effect below)
    };
  }, [tableConversion, handlePasteWithData, insertPlainText, insertImageFromClipboard, onSnackbar]);

  // Drag & drop image insertion. Registered once (reads the latest doc path via
  // filePathRef). Only image files are handled here; App.tsx's window-level
  // listener still opens dropped .md/.txt documents, so the two coexist by
  // acting on disjoint file types.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    (async () => {
      const { getCurrentWebview } = await import('@tauri-apps/api/webview');
      if (disposed) return;
      unlisten = await getCurrentWebview().onDragDropEvent(async (event) => {
        const payload = event.payload;
        if (payload.type === 'enter') {
          // Show a drop hint while an image is being dragged in.
          setIsImageDragOver(payload.paths.some(isImageFilePath));
          return;
        }
        if (payload.type === 'leave') {
          setIsImageDragOver(false);
          return;
        }
        if (payload.type === 'drop') {
          setIsImageDragOver(false);
          if (!editorRef.current) return;
          const imagePaths = payload.paths.filter(isImageFilePath);
          if (imagePaths.length === 0) return; // documents are handled elsewhere
          await insertImagesFromPaths(imagePaths, payload.position);
        }
      });
    })();
    return () => {
      disposed = true;
      if (unlisten) unlisten();
    };
  }, [insertImagesFromPaths]);

  // Robust focus function with Tauri window focus + retry
  const focusEditor = useCallback(async (editorInstance?: editor.IStandaloneCodeEditor) => {
    const target = editorInstance || editorRef.current;
    if (!target) return;

    // Ensure the Tauri window has OS-level focus (critical for file association & menu interactions)
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().setFocus();
    } catch {
      // Non-fatal: webview may already be focused
    }

    // Retry focus with increasing delays, exit early on success
    const delays = [0, 50, 150];
    for (const delay of delays) {
      await new Promise<void>(resolve => {
        setTimeout(() => {
          try { target.focus(); } catch { /* editor may be disposed */ }
          resolve();
        }, delay);
      });
      if (typeof document === 'undefined') return;
      const dom = target.getDomNode();
      if (dom && dom.contains(document.activeElement)) return;
    }
  }, []);

  // Focus editor when focusRequestId changes
  useEffect(() => {
    if (focusRequestId > 0) {
      focusEditor();
    }
  }, [focusRequestId, focusEditor]);

  // Apply scroll position from parent (used in bidirectional sync mode)
  useEffect(() => {
    if (scrollFraction === undefined || !editorRef.current) return;
    const editor = editorRef.current;
    const maxScroll = editor.getScrollHeight() - editor.getLayoutInfo().height;
    if (maxScroll <= 0) return;
    const targetScroll = scrollFraction * maxScroll;
    if (Math.abs(editor.getScrollTop() - targetScroll) < 1) return;
    isProgrammaticScrollRef.current = true;
    editor.setScrollTop(targetScroll);
    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false;
    });
  }, [scrollFraction]);

  // Reveal line when revealLineRequest changes (outline panel heading click)
  useEffect(() => {
    if (!revealLineRequest || revealLineRequest.requestId === 0) return;
    const editor = editorRef.current;
    if (!editor) return;

    editor.revealLineInCenter(revealLineRequest.lineNumber);
    editor.setPosition({ lineNumber: revealLineRequest.lineNumber, column: 1 });
    editor.focus();
  }, [revealLineRequest?.requestId]);

  const handleEditorDidMount: OnMount = (editor, monacoNs) => {
    editorRef.current = editor;

    // Focus using the editor instance directly (avoids race condition with editorRef)
    focusEditor(editor);

    // Dispose listeners from any previous mount before registering new ones.
    // This MUST run before the table-context listeners are registered below,
    // otherwise they would be torn down immediately and the context key would
    // freeze at its initial value (breaking Tab/Enter table handling).
    disposablesRef.current.forEach(d => d.dispose());
    disposablesRef.current = [];

    // Register search shortcuts and smart table/list editing actions.
    try {
      // Prefer the monaco namespace from @monaco-editor/react's onMount
      // argument; it is always provided at runtime, which avoids the
      // load-order race that left these actions unregistered "sometimes" when
      // we read window.monaco. The global is only a fallback for callers that
      // invoke onMount without the argument (e.g. the test harness).
      const monaco = monacoNs || (window as { monaco?: typeof import('monaco-editor') }).monaco;
      if (monaco) {
        disposablesRef.current.push(
          ...registerEditorActions(editor, monaco, {
            openSearch: () => {
              setSearchAllTabsDefault(false);
              setShowReplaceDefault(false);
              setSearchOpen(true);
            },
            openReplace: () => {
              setSearchAllTabsDefault(false);
              setShowReplaceDefault(true);
              setSearchOpen(true);
            },
            openSearchAllTabs: () => {
              setSearchAllTabsDefault(true);
              setShowReplaceDefault(false);
              setSearchOpen(true);
            },
          }),
        );
      }
    } catch (error) {
      console.warn('Failed to set keyboard shortcuts:', error);
    }

    // Monitor cursor position and selection information changes
    if (onStatusChange) {
      const updateStatus = () => {
        const position = editor.getPosition();
        const selection = editor.getSelection();
        const model = editor.getModel();

        if (position && model) {
          const selectedText = selection ? model.getValueInRange(selection) : '';
          onStatusChange(computeEditorStatus(model.getValue(), selectedText, position));
        }
      };

      // Set initial state
      updateStatus();

      // Monitor cursor position changes
      disposablesRef.current.push(
        editor.onDidChangeCursorPosition(() => {
          updateStatus();
        })
      );

      // Monitor selection range changes
      disposablesRef.current.push(
        editor.onDidChangeCursorSelection(() => {
          updateStatus();
        })
      );

      // Monitor content changes
      disposablesRef.current.push(
        editor.onDidChangeModelContent(() => {
          updateStatus();
        })
      );
    }

    // Sync scroll: notify parent of scroll position.
    // Always register the listener and dispatch through onScrollChangeRef so that
    // toggling scrollSyncMode at runtime is honored without remounting the editor.
    disposablesRef.current.push(
      editor.onDidScrollChange(() => {
        const report = onScrollChangeRef.current;
        if (!report) return;
        // Skip events triggered by our own programmatic scroll to avoid feedback loops
        if (isProgrammaticScrollRef.current) return;
        const scrollTop = editor.getScrollTop();
        const maxScroll = editor.getScrollHeight() - editor.getLayoutInfo().height;
        if (maxScroll > 0) {
          report(scrollTop / maxScroll);
        }
      })
    );
  };

  const handleEditorChange = (value: string | undefined) => {
    // Silent reload: the model was rewritten by setModelContentSilently
    // (e.g. external file change reload). React state has already been
    // updated by reloadTabContent; firing onChange here would re-dispatch
    // UPDATE_TAB_CONTENT and set isModified=true, contradicting the reload.
    if (isModelSilentlyEditing(editorRef.current?.getModel() ?? null)) {
      return;
    }
    if (value !== undefined && value !== content) {
      onChange(value);
    }
  };

  const handleTableConversionConfirm = (convertWithoutAsking?: boolean) => {
    insertMarkdownTable(tableConversionDialog.markdownTable);
    onSnackbar?.(t('tableConversion.conversionSuccess'), 'success');

    // If user checked "convert without asking", change setting to 'auto'
    if (convertWithoutAsking && onTableConversionSettingChange) {
      onTableConversionSettingChange('auto');
    }
  };

  const handleTableConversionCancel = () => {

    // Paste as plain text
    // Get directly from saved data
    const savedData = tableConversionDialog.clipboardData;
    const plainText = savedData?.plainText || '';

    if (plainText) {
      insertPlainText(plainText);
    }
    setTableConversionDialog({ open: false, markdownTable: '', clipboardData: null });
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" color="text.secondary">
          Editor
        </Typography>
        <Box>
          <Tooltip title="Search (Ctrl+F / Ctrl+Shift+F)">
            <IconButton size="small" onClick={() => { setSearchAllTabsDefault(false); setSearchOpen(true); }}>
              <Search />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {showFormattingBar && <MarkdownToolbar editorRef={editorRef} />}

      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <SearchReplacePanel
          editorRef={editorRef}
          open={searchOpen}
          onClose={() => { setSearchOpen(false); focusEditor(); }}
          onChange={onChange}
          tabs={tabs}
          activeTabId={activeTabId}
          onTabSwitch={onTabSwitch}
          searchAllTabsDefault={searchAllTabsDefault}
          showReplaceDefault={showReplaceDefault}
          onHeightChange={setSearchPanelHeight}
        />
        {isImageDragOver && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 20,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed',
              borderColor: 'primary.main',
              backgroundColor: 'action.hover',
              boxSizing: 'border-box',
            }}
          >
            <Typography variant="h6" color="primary" sx={{ pointerEvents: 'none' }}>
              {t('imageInsert.dropHere')}
            </Typography>
          </Box>
        )}
        {fileNotFound ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 3,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" color="error" gutterBottom>
              {t('fileOperations.fileNotFound')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, wordBreak: 'break-all' }}>
              {fileNotFound.filePath}
            </Typography>
            <button
              onClick={fileNotFound.onClose}
              style={{
                padding: '8px 16px',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                color: 'var(--color-text)',
                cursor: 'pointer',
              }}
            >
              {t('fileOperations.closeTab')}
            </button>
          </Box>
        ) : (
          <Editor
            height="100%"
            defaultLanguage="markdown"
            path={activeTabId || 'default'}
            keepCurrentModel
            // Uncontrolled: defaultValue seeds the model on creation, then the
            // model is the source of truth. We do NOT pass `value` because the
            // library's value-prop sync re-applies the prop via executeEdits
            // on every render, which races with rapid keystrokes (slow IPC on
            // Windows) and ends up replacing the doc with a stale value —
            // moving the cursor to EOF via forceMoveMarkers.
            // External content updates (file reload etc.) push into the model
            // directly via setModelContentSilently in editorSync.ts.
            defaultValue={content}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            theme={darkMode ? 'vs-dark' : 'light'}
            options={{
              minimap: { enabled: minimap },
              fontSize: Math.round(fontSize * zoomLevel),
              wordWrap: wordWrap ? 'on' : 'off',
              lineNumbers: showLineNumbers ? 'on' : 'off',
              tabSize: tabSize,
              insertSpaces: true, // Convert tabs to spaces
              detectIndentation: false, // Disable auto-detection
              scrollBeyondLastLine: false,
              automaticLayout: true,
              renderWhitespace: showWhitespace ? 'all' : 'selection',
              folding: true,
              lineDecorationsWidth: 10,
              lineNumbersMinChars: 2,
              glyphMargin: true,
              contextmenu: true,
              quickSuggestions: false,
              suggestOnTriggerCharacters: false,
              acceptSuggestionOnEnter: 'off',
              tabCompletion: 'off',
              wordBasedSuggestions: "off",
              parameterHints: {
                enabled: false
              },
              hover: {
                enabled: true
              },
              links: true,
              colorDecorators: true,
              padding: {
                top: searchOpen ? searchPanelHeight + 16 : 0,
              },
            }}
          />
        )}
      </Box>

      {/* Table Conversion Dialog */}
      <TableConversionDialog
        open={tableConversionDialog.open}
        onClose={() => setTableConversionDialog(prev => ({ ...prev, open: false }))}
        onConfirm={handleTableConversionConfirm}
        onCancel={handleTableConversionCancel}
        markdownTable={tableConversionDialog.markdownTable}
      />
    </Box>
  );
};

export default MarkdownEditor;
