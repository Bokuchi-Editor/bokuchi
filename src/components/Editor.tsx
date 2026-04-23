import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { Search } from '@mui/icons-material';
import SearchReplacePanel from './SearchReplacePanel';
import { useTranslation } from 'react-i18next';
import { TableConversionDialog } from './TableConversionDialog';
import { htmlTableToMarkdown, validateMarkdownTable, convertTsvCsvToMarkdown } from '../utils/tableConverter';
import MarkdownToolbar from './MarkdownToolbar';
import { Tab } from '../types/tab';
import { debugLog, summarize, shortStack } from '../utils/debugLog';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  darkMode: boolean;
  theme?: string;
  fileNotFound?: {
    filePath: string;
    onClose: () => void;
  };
  onStatusChange?: (status: {
    line: number;
    column: number;
    totalCharacters: number;
    selectedCharacters: number;
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

const MarkdownEditor: React.FC<EditorProps> = ({
  content,
  onChange,
  darkMode,
  theme,
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

  // === DEBUG: prop change tracking =========================================
  useEffect(() => {
    debugLog('[EDITOR] content-prop-changed', summarize(content));
  }, [content]);

  useEffect(() => {
    debugLog('[EDITOR] activeTabId-prop-changed', { activeTabId });
  }, [activeTabId]);

  useEffect(() => {
    debugLog('[EDITOR] focusRequestId-prop-changed', { focusRequestId });
  }, [focusRequestId]);

  useEffect(() => {
    debugLog('[EDITOR] revealLineRequest-prop-changed', revealLineRequest ?? { nil: true });
  }, [revealLineRequest]);

  useEffect(() => {
    debugLog('[EDITOR] scrollFraction-prop-changed', { scrollFraction });
  }, [scrollFraction]);
  // =========================================================================

  // Dispose Monaco listeners on unmount
  useEffect(() => {
    return () => {
      disposablesRef.current.forEach(d => d.dispose());
      disposablesRef.current = [];
    };
  }, []);

  // Dispose Monaco models for closed tabs to prevent memory leaks.
  // We use getModels() iteration instead of getModel(Uri.parse(...)) because
  // URI matching via Uri.parse may fail depending on the runtime environment.
  // keepCurrentModel={true} is set on the Editor component so that model
  // lifecycle is entirely managed here (the library won't dispose on unmount).
  const prevTabIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!tabs) return;
    const currentIds = new Set(tabs.map(tab => tab.id));
    const monaco = (window as { monaco?: typeof import('monaco-editor') }).monaco;
    if (monaco?.editor?.getModels) {
      const removedIds = new Set<string>();
      for (const prevId of prevTabIdsRef.current) {
        if (!currentIds.has(prevId)) {
          removedIds.add(prevId);
        }
      }
      if (removedIds.size > 0) {
        for (const model of monaco.editor.getModels()) {
          const uriStr = model.uri.toString();
          for (const id of removedIds) {
            if (uriStr === id || uriStr.endsWith('/' + id)) {
              model.dispose();
              break;
            }
          }
        }
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
      const monaco = (window as { monaco?: typeof import('monaco-editor') }).monaco;
      if (!monaco?.editor?.getModels) return;
      const liveIds = new Set((tabsRef.current ?? []).map(tab => tab.id));
      for (const model of monaco.editor.getModels()) {
        const uriStr = model.uri.toString();
        for (const trackedId of prevTabIdsRef.current) {
          if ((uriStr === trackedId || uriStr.endsWith('/' + trackedId)) && !liveIds.has(trackedId)) {
            model.dispose();
            break;
          }
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

  const handlePasteWithData = useCallback(async (htmlData: string, plainText: string) => {

    try {
      // If table conversion is disabled, perform normal paste
      if (tableConversion === 'off') {
        insertPlainText(plainText);
        return;
      }

      let markdownTable = '';

      // Step 1: Search and convert HTML tables
      if (htmlData && htmlData.includes('<table') && htmlData.includes('</table>')) {
        markdownTable = htmlTableToMarkdown(htmlData);
      }
      // Step 2: Search and convert TSV/CSV in plain text
      else if (plainText && (plainText.includes('\t') || plainText.includes(','))) {
        markdownTable = convertTsvCsvToMarkdown(plainText);
      }
      else {
        insertPlainText(plainText);
        return;
      }

      // Validate conversion result
      if (!validateMarkdownTable(markdownTable)) {
        insertPlainText(plainText);
        return;
      }


      // Process according to settings
      if (tableConversion === 'auto') {
        // Auto conversion
        insertMarkdownTable(markdownTable);
        onSnackbar?.(t('tableConversion.conversionSuccess'), 'success');
      } else if (tableConversion === 'confirm') {
        // Show confirmation dialog
        // Save clipboard data immediately (save data, not object)
        const savedData = {
          plainText: plainText,
          htmlData: htmlData
        };
        setTableConversionDialog({
          open: true,
          markdownTable,
          clipboardData: savedData,
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

      // Detect and handle Shift + Cmd/Ctrl + V combination directly
      if (e.key === 'v' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
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
    };
  }, [tableConversion, handlePasteWithData, insertPlainText, onSnackbar]);

  // Robust focus function with Tauri window focus + retry
  const focusEditor = useCallback(async (editorInstance?: editor.IStandaloneCodeEditor) => {
    const target = editorInstance || editorRef.current;
    if (!target) return;

    debugLog('[EDITOR] focusEditor start', { stack: shortStack() });

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
          try {
            debugLog('[EDITOR] focusEditor target.focus()', { delay });
            target.focus();
          } catch { /* editor may be disposed */ }
          resolve();
        }, delay);
      });
      const dom = target.getDomNode();
      if (dom && dom.contains(document.activeElement)) {
        debugLog('[EDITOR] focusEditor confirmed focus', { delay });
        return;
      }
    }
    debugLog('[EDITOR] focusEditor exhausted retries');
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
    debugLog('[EDITOR] setScrollTop (from scrollFraction prop)', {
      targetScroll,
      scrollFraction,
      maxScroll,
    });
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

    debugLog('[EDITOR] reveal-line-effect', revealLineRequest);
    editor.revealLineInCenter(revealLineRequest.lineNumber);
    editor.setPosition({ lineNumber: revealLineRequest.lineNumber, column: 1 });
    editor.focus();
  }, [revealLineRequest?.requestId]);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;

    debugLog('[EDITOR] mount', {
      activeTabId,
      contentSummary: summarize(content),
    });

    // Focus using the editor instance directly (avoids race condition with editorRef)
    focusEditor(editor);

    // Set up search and replace keyboard shortcuts
    try {
      // Use correct Monaco Editor key codes
      const monaco = (window as { monaco?: typeof import('monaco-editor') }).monaco;
      if (monaco) {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
          setSearchAllTabsDefault(false);
          setShowReplaceDefault(false);
          setSearchOpen(true);
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => {
          setSearchAllTabsDefault(false);
          setShowReplaceDefault(true);
          setSearchOpen(true);
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
          setSearchAllTabsDefault(true);
          setShowReplaceDefault(false);
          setSearchOpen(true);
        });

        // Completely disable default behavior of Shift + Cmd/Ctrl + V
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyV, () => {
          // Do nothing (completely disable default "Paste as Plain Text")
        });

        // Disable with a more powerful method
        editor.addAction({
          id: 'disable-shift-v',
          label: 'Disable Shift+V',
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyV],
          run: () => {
            // Do nothing
          }
        });
      }
    } catch (error) {
      console.warn('Failed to set keyboard shortcuts:', error);
    }

    // Dispose previous listeners before registering new ones
    disposablesRef.current.forEach(d => d.dispose());
    disposablesRef.current = [];

    // === DEBUG: Monaco lifecycle and caret-moving event subscribers ========
    // Must be set up AFTER the dispose block above, otherwise these get
    // cleared immediately. Kept distinct from the status/scroll subscriptions
    // below so reason/source metadata is preserved even when those handlers
    // are not attached.
    const subscribeToModelContent = (m: editor.ITextModel | null) => {
      if (!m) return;
      disposablesRef.current.push(
        m.onDidChangeContent((e) => {
          debugLog('[EDITOR] model-content-changed', {
            isFlush: e.isFlush,
            isUndoing: e.isUndoing,
            isRedoing: e.isRedoing,
            versionId: e.versionId,
            changeCount: e.changes.length,
            // Flush = whole-document replacement (model.setValue etc.).
            // This is the canonical "cursor jumps to (1,1)" trigger.
            firstChangeRange: e.changes[0]
              ? {
                  startLine: e.changes[0].range.startLineNumber,
                  startCol: e.changes[0].range.startColumn,
                  endLine: e.changes[0].range.endLineNumber,
                  endCol: e.changes[0].range.endColumn,
                  textLen: e.changes[0].text.length,
                }
              : null,
          });
        })
      );
    };

    // Track when @monaco-editor/react swaps the underlying model (path prop
    // change) — this resets the caret to (1,1) of the new model by default.
    disposablesRef.current.push(
      editor.onDidChangeModel((e) => {
        debugLog('[EDITOR] editor-model-changed', {
          oldUri: e.oldModelUrl?.toString() ?? null,
          newUri: e.newModelUrl?.toString() ?? null,
        });
        subscribeToModelContent(editor.getModel());
      })
    );

    subscribeToModelContent(editor.getModel());
    // =======================================================================

    // Monitor cursor position and selection information changes.
    // We always subscribe to cursor-position changes (even without
    // onStatusChange) so the debug log captures `reason` for every caret move
    // — this is how we identify ContentFlush / Explicit-triggered jumps.
    const hasStatusChange = !!onStatusChange;
    const updateStatus = hasStatusChange
      ? () => {
          const position = editor.getPosition();
          const selection = editor.getSelection();
          const model = editor.getModel();

          if (position && model) {
            const totalCharacters = model.getValue().length;
            let selectedCharacters = 0;

            if (selection) {
              const selectedText = model.getValueInRange(selection);
              selectedCharacters = selectedText.length;
            }

            onStatusChange!({
              line: position.lineNumber,
              column: position.column,
              totalCharacters,
              selectedCharacters
            });
          }
        }
      : null;

    if (updateStatus) {
      // Set initial state
      updateStatus();
    }

    // Monitor cursor position changes (always on, for debug log)
    disposablesRef.current.push(
      editor.onDidChangeCursorPosition((e) => {
        debugLog('[EDITOR] cursor-pos-changed', {
          line: e.position.lineNumber,
          col: e.position.column,
          reason: e.reason,
          source: e.source,
          secondaryCount: e.secondaryPositions.length,
        });
        if (updateStatus) updateStatus();
      })
    );

    if (updateStatus) {
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
    // Always subscribe (even when onScrollChange is undefined) so the debug log
    // captures Monaco's internal auto-scroll too; this helps correlate scroll
    // activity with cursor jumps regardless of scroll-sync mode.
    disposablesRef.current.push(
      editor.onDidScrollChange(() => {
        const scrollTop = editor.getScrollTop();
        const scrollHeight = editor.getScrollHeight();
        const clientHeight = editor.getLayoutInfo().height;
        const maxScroll = scrollHeight - clientHeight;
        debugLog('[EDITOR] scroll-changed', {
          scrollTop: Math.round(scrollTop),
          scrollHeight: Math.round(scrollHeight),
          clientHeight: Math.round(clientHeight),
          programmatic: isProgrammaticScrollRef.current,
        });
        // Skip events triggered by our own programmatic scroll to avoid feedback loops
        if (isProgrammaticScrollRef.current) return;
        if (!onScrollChange) return;
        if (maxScroll > 0) {
          onScrollChange(scrollTop / maxScroll);
        }
      })
    );

  };

  const handleEditorChange = (value: string | undefined) => {
    debugLog('[EDITOR] handleEditorChange', {
      incoming: summarize(value ?? ''),
      currentContent: summarize(content),
      equal: value === content,
    });
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

      <MarkdownToolbar editorRef={editorRef} />

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
        />
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
            value={content}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            theme={theme === 'darcula' ? 'vs-dark' : (darkMode ? 'vs-dark' : 'light')}
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
