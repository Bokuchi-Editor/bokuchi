import React, { useState, useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { Box, Typography, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip } from '@mui/material';
import { Search, Close } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

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
}

const MarkdownEditor: React.FC<EditorProps> = ({ content, onChange, darkMode, theme, fileNotFound, onStatusChange, zoomLevel = 1.0 }) => {
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [searchOptions, setSearchOptions] = useState({
    caseSensitive: false,
    wholeWord: false,
    regex: false,
  });
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  // ウィンドウリサイズ検知とMonaco Editor再初期化
  useEffect(() => {
    let resizeTimeout: number;

    const handleResize = () => {
      // リサイズ完了を待つ（デバウンス）
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Monaco Editorを再初期化
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

    // 検索・置換のキーボードショートカットを設定
    try {
      // Monaco Editorの正しいキーコードを使用
      const monaco = (window as { monaco?: typeof import('monaco-editor') }).monaco;
      if (monaco) {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
          setSearchOpen(true);
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => {
          setSearchOpen(true);
        });
      }
    } catch (error) {
      console.warn('Failed to set keyboard shortcuts:', error);
    }

    // カーソル位置と選択情報の変更を監視
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

      // 初期状態を設定
      updateStatus();

      // カーソル位置の変更を監視
      editor.onDidChangeCursorPosition(() => {
        updateStatus();
      });

      // 選択範囲の変更を監視
      editor.onDidChangeCursorSelection(() => {
        updateStatus();
      });

      // コンテンツの変更を監視
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

      // 検索結果をハイライト
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
              minimap: { enabled: false },
              fontSize: Math.round(14 * zoomLevel),
              wordWrap: 'on',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              renderWhitespace: 'selection',
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

      {/* 検索・置換ダイアログ */}
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
    </Box>
  );
};

export default MarkdownEditor;
