import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Box, Typography, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip } from '@mui/material';
import { Search, Replace, Close } from '@mui/icons-material';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  darkMode: boolean;
}

const MarkdownEditor: React.FC<EditorProps> = ({ content, onChange, darkMode }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [searchOptions, setSearchOptions] = useState({
    caseSensitive: false,
    wholeWord: false,
    regex: false,
  });
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;

    // 検索・置換のキーボードショートカットを設定
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      setSearchOpen(true);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => {
      setSearchOpen(true);
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  const handleSearch = () => {
    if (editorRef.current && searchText) {
      const model = editorRef.current.getModel();
      const searchRegex = searchOptions.regex
        ? new RegExp(searchText, searchOptions.caseSensitive ? 'g' : 'gi')
        : new RegExp(searchOptions.wholeWord ? `\\b${searchText}\\b` : searchText, searchOptions.caseSensitive ? 'g' : 'gi');

      const matches = [];
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
        range: new monaco.Range(
          match.range.startLineNumber,
          match.range.startColumn,
          match.range.endLineNumber,
          match.range.endColumn
        ),
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
        <Editor
          height="100%"
          defaultLanguage="markdown"
          value={content}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme={darkMode ? 'vs-dark' : 'light'}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            renderWhitespace: 'selection',
            folding: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            glyphMargin: true,
            contextmenu: true,
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            acceptSuggestionOnEnter: 'off',
            tabCompletion: 'off',
            wordBasedSuggestions: false,
            parameterHints: {
              enabled: false
            },
            hover: {
              enabled: true
            },
            links: true,
            colorDecorators: true,
            lightbulb: {
              enabled: false
            },
            codeActionsOnSave: {
              'source.fixAll': false
            }
          }}
        />
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
