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
}) => {
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [tableConversionDialog, setTableConversionDialog] = useState<{
    open: boolean;
    markdownTable: string;
    clipboardData: { plainText: string; htmlData: string } | null;
  }>({
    open: false,
    markdownTable: '',
    clipboardData: null,
  });

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
  }, [tableConversion]);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

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

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;

    // Focus using the editor instance directly (avoids race condition with editorRef)
    focusEditor(editor);

    // Set up search and replace keyboard shortcuts
    try {
      // Use correct Monaco Editor key codes
      const monaco = (window as { monaco?: typeof import('monaco-editor') }).monaco;
      if (monaco) {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
          setSearchOpen(true);
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => {
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

    // Monitor cursor position and selection information changes
    if (onStatusChange) {
      const updateStatus = () => {
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

          onStatusChange({
            line: position.lineNumber,
            column: position.column,
            totalCharacters,
            selectedCharacters
          });
        }
      };

      // Set initial state
      updateStatus();

      // Monitor cursor position changes
      editor.onDidChangeCursorPosition(() => {
        updateStatus();
      });

      // Monitor selection range changes
      editor.onDidChangeCursorSelection(() => {
        updateStatus();
      });

      // Monitor content changes
      editor.onDidChangeModelContent(() => {
        updateStatus();
      });
    }

    // Sync scroll: notify parent of scroll position
    if (onScrollChange) {
      editor.onDidScrollChange(() => {
        const scrollTop = editor.getScrollTop();
        const scrollHeight = editor.getScrollHeight();
        const clientHeight = editor.getLayoutInfo().height;
        const maxScroll = scrollHeight - clientHeight;
        if (maxScroll > 0) {
          onScrollChange(scrollTop / maxScroll);
        }
      });
    }

  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  const handlePasteWithData = async (htmlData: string, plainText: string) => {

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
  };


  const insertPlainText = (text: string) => {
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
  };

  const insertMarkdownTable = (markdownTable: string) => {
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
          <Tooltip title="Search (Ctrl+F)">
            <IconButton size="small" onClick={() => setSearchOpen(true)}>
              <Search />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <MarkdownToolbar editorRef={editorRef} />

      <Box sx={{ flex: 1, position: 'relative' }}>
        <SearchReplacePanel
          editorRef={editorRef}
          open={searchOpen}
          onClose={() => { setSearchOpen(false); focusEditor(); }}
          onChange={onChange}
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
