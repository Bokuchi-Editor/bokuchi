import React, { useState, useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { Box, Typography, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip } from '@mui/material';
import { Search, Close } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { TableConversionDialog } from './TableConversionDialog';
import { htmlTableToMarkdown, validateMarkdownTable, convertTsvCsvToMarkdown } from '../utils/tableConverter';

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
  // New editor settings
  fontSize?: number;
  showLineNumbers?: boolean;
  tabSize?: number;
  wordWrap?: boolean;
  minimap?: boolean;
  showWhitespace?: boolean;
  tableConversion?: 'auto' | 'confirm' | 'off';
  onSnackbar?: (message: string, severity: 'success' | 'error' | 'warning') => void;
}

const MarkdownEditor: React.FC<EditorProps> = ({
  content,
  onChange,
  darkMode,
  theme,
  fileNotFound,
  onStatusChange,
  zoomLevel = 1.0,
  fontSize = 14,
  showLineNumbers = true,
  tabSize = 2,
  wordWrap = true,
  minimap = false,
  showWhitespace = false,
  tableConversion = 'confirm',
  onSnackbar,
}) => {
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
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
      console.log('Key down:', e.key, 'isShiftPressed:', isShiftPressed);
      if (e.key === 'Shift') {
        isShiftPressed = true;
        console.log('Shift key pressed, isShiftPressed set to true');
      }

      // Detect and handle Shift + Cmd/Ctrl + V combination directly
      if (e.key === 'v' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        console.log('Shift + Cmd/Ctrl + V combination detected in keydown');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Stop other event listeners as well

        // Get plain text from clipboard and paste it
        try {
          // Use Tauri clipboard API
          const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
          const clipboardText = await readText();
          console.log('Clipboard text for Shift+V:', clipboardText.substring(0, 200) + '...');
          insertPlainText(clipboardText);
        } catch (error) {
          console.error('Failed to read clipboard:', error);
          onSnackbar?.('Failed to paste plain text', 'error');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      console.log('Key up:', e.key, 'isShiftPressed:', isShiftPressed);
      if (e.key === 'Shift') {
        isShiftPressed = false;
        console.log('Shift key released, isShiftPressed set to false');
      }
    };

    const handleGlobalPaste = async (e: ClipboardEvent) => {
      console.log('Global paste event caught');
      console.log('editorRef.current:', !!editorRef.current);
      console.log('document.activeElement:', document.activeElement);
      console.log('e.clipboardData:', e.clipboardData);
      console.log('e.clipboardData.types:', e.clipboardData?.types);
      console.log('editorRef.current?.getDomNode():', editorRef.current?.getDomNode());

      // Check if editor is focused (compatible with Monaco Editor internal structure)
      const isEditorFocused = editorRef.current && (
        document.activeElement === editorRef.current.getDomNode() ||
        (document.activeElement && editorRef.current.getDomNode()?.contains(document.activeElement))
      );

      if (isEditorFocused) {
        console.log('Editor is focused, processing paste');
        console.log('isShiftPressed:', isShiftPressed);

        // For Shift + Ctrl(Cmd) + V, paste as plain text
        if (isShiftPressed) {
          console.log('Shift + Ctrl/Cmd + V detected, pasting as plain text');
          e.preventDefault();
          e.stopPropagation();

          if (e.clipboardData) {
            const plainText = e.clipboardData.getData('text/plain');
            console.log('Plain text from paste event:', plainText.substring(0, 200) + '...');
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

          console.log('HTML data from paste event:', htmlData.substring(0, 200) + '...');
          console.log('Plain text from paste event:', plainText.substring(0, 200) + '...');

          await handlePasteWithData(htmlData, plainText);
        }
      } else {
        console.log('Editor is not focused, skipping paste processing');
        console.log('Active element:', document.activeElement?.tagName, document.activeElement?.className);
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

  const [searchOptions, setSearchOptions] = useState({
    caseSensitive: false,
    wholeWord: false,
    regex: false,
  });
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  // Window resize detection and Monaco Editor re-initialization
  useEffect(() => {
    let resizeTimeout: number;

    const handleResize = () => {
      // Wait for resize completion (debounce)
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Re-initialize Monaco Editor
        setEditorKey(prev => prev + 1);
      }, 150);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;


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
          console.log('Monaco Editor Shift+V command disabled');
          // Do nothing (completely disable default "Paste as Plain Text")
        });

        // Disable with a more powerful method
        editor.addAction({
          id: 'disable-shift-v',
          label: 'Disable Shift+V',
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyV],
          run: () => {
            console.log('Monaco Editor Shift+V action disabled');
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

  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  const handlePasteWithData = async (htmlData: string, plainText: string) => {
    console.log('handlePasteWithData called, tableConversion:', tableConversion);

    try {
      // If table conversion is disabled, perform normal paste
      if (tableConversion === 'off') {
        console.log('Table conversion is off, performing normal paste');
        insertPlainText(plainText);
        return;
      }

      let markdownTable = '';

      // Step 1: Search and convert HTML tables
      if (htmlData && htmlData.includes('<table') && htmlData.includes('</table>')) {
        console.log('HTML table detected, converting...');
        markdownTable = htmlTableToMarkdown(htmlData);
        console.log('Converted HTML table to markdown:', markdownTable);
      }
      // Step 2: Search and convert TSV/CSV in plain text
      else if (plainText && (plainText.includes('\t') || plainText.includes(','))) {
        console.log('TSV/CSV detected in plain text, converting...');
        markdownTable = convertTsvCsvToMarkdown(plainText);
        console.log('Converted TSV/CSV to markdown:', markdownTable);
      }
      else {
        console.log('No table data found, performing normal paste');
        insertPlainText(plainText);
        return;
      }

      // Validate conversion result
      if (!validateMarkdownTable(markdownTable)) {
        console.log('Markdown table validation failed, performing normal paste');
        insertPlainText(plainText);
        return;
      }

      console.log('Table conversion successful');

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

  const handleTableConversionConfirm = () => {
    insertMarkdownTable(tableConversionDialog.markdownTable);
    onSnackbar?.(t('tableConversion.conversionSuccess'), 'success');
  };

  const handleTableConversionCancel = () => {
    console.log('Table conversion cancelled');
    console.log('clipboardData:', tableConversionDialog.clipboardData);

    // Paste as plain text
    // Get directly from saved data
    const savedData = tableConversionDialog.clipboardData;
    const plainText = savedData?.plainText || '';
    console.log('Plain text from saved data:', plainText.substring(0, 200) + '...');

    if (plainText) {
      console.log('Inserting plain text');
      insertPlainText(plainText);
    } else {
      console.log('No plain text found, cannot paste');
    }
    setTableConversionDialog({ open: false, markdownTable: '', clipboardData: null });
  };

  const handleSearch = () => {
    if (editorRef.current && searchText) {
      const model = editorRef.current.getModel();
      if (!model) return;

      const searchRegex = searchOptions.regex
        ? new RegExp(searchText, searchOptions.caseSensitive ? 'g' : 'gi')
        : new RegExp(searchOptions.wholeWord ? `\\b${searchText}\\b` : searchText, searchOptions.caseSensitive ? 'g' : 'gi');

      const matches: Array<{
        range: {
          startLineNumber: number;
          startColumn: number;
          endLineNumber: number;
          endColumn: number;
        };
        text: string;
      }> = [];
      const text = model.getValue();
      let match;

      while ((match = searchRegex.exec(text)) !== null) {
        matches.push({
          range: {
            startLineNumber: text.substring(0, match.index).split('\n').length,
            startColumn: match.index - text.lastIndexOf('\n', match.index - 1),
            endLineNumber: text.substring(0, match.index + match[0].length).split('\n').length,
            endColumn: match.index + match[0].length - text.lastIndexOf('\n', match.index + match[0].length - 1),
          },
          text: match[0]
        });
      }

      // Highlight search results
      editorRef.current.deltaDecorations([], matches.map(match => ({
        range: {
          startLineNumber: match.range.startLineNumber,
          startColumn: match.range.startColumn,
          endLineNumber: match.range.endLineNumber,
          endColumn: match.range.endColumn
        },
        options: {
          inlineClassName: 'search-highlight',
          hoverMessage: { value: `Found: ${match.text}` }
        }
      })));
    }
  };

  const handleReplace = () => {
    if (editorRef.current && searchText && replaceText) {
      const model = editorRef.current.getModel();
      if (!model) return;

      const searchRegex = searchOptions.regex
        ? new RegExp(searchText, searchOptions.caseSensitive ? 'g' : 'gi')
        : new RegExp(searchOptions.wholeWord ? `\\b${searchText}\\b` : searchText, searchOptions.caseSensitive ? 'g' : 'gi');

      const text = model.getValue();
      const newText = text.replace(searchRegex, replaceText);
      model.setValue(newText);
      onChange(newText);
    }
  };

  const handleReplaceAll = () => {
    if (editorRef.current && searchText && replaceText) {
      const model = editorRef.current.getModel();
      if (!model) return;

      const searchRegex = searchOptions.regex
        ? new RegExp(searchText, searchOptions.caseSensitive ? 'g' : 'gi')
        : new RegExp(searchOptions.wholeWord ? `\\b${searchText}\\b` : searchText, searchOptions.caseSensitive ? 'g' : 'gi');

      const text = model.getValue();
      const newText = text.replace(searchRegex, replaceText);
      model.setValue(newText);
      onChange(newText);
      setSearchOpen(false);
    }
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

      <Box sx={{ flex: 1, position: 'relative' }}>
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
            <Button
              variant="outlined"
              color="error"
              onClick={fileNotFound.onClose}
            >
              {t('fileOperations.closeTab')}
            </Button>
          </Box>
        ) : (
          <Editor
            key={editorKey}
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
              // lightbulb: {
              //   enabled: false
              // },
              // codeActionsOnSave: {
              //   'source.fixAll': false
              // }
            }}
          />
        )}
      </Box>

      {/* Search and Replace Dialog */}
      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Search and Replace
          <IconButton
            aria-label="close"
            onClick={() => setSearchOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Replace"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSearchOptions({ ...searchOptions, caseSensitive: !searchOptions.caseSensitive })}
                sx={{ fontSize: '0.75rem' }}
              >
                {searchOptions.caseSensitive ? 'Aa' : 'Aa'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSearchOptions({ ...searchOptions, wholeWord: !searchOptions.wholeWord })}
                sx={{ fontSize: '0.75rem' }}
              >
                Word
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSearchOptions({ ...searchOptions, regex: !searchOptions.regex })}
                sx={{ fontSize: '0.75rem' }}
              >
                .*
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSearch}>Search</Button>
          <Button onClick={handleReplace}>Replace</Button>
          <Button onClick={handleReplaceAll} variant="contained">Replace All</Button>
        </DialogActions>
      </Dialog>

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
