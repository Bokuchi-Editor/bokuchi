import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { editor } from 'monaco-editor';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import {
  Close,
  KeyboardArrowUp,
  KeyboardArrowDown,
  ExpandMore,
  ChevronRight,
} from '@mui/icons-material';

interface MatchInfo {
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  text: string;
  lineContent: string;
}

interface SearchReplacePanelProps {
  editorRef: React.RefObject<editor.IStandaloneCodeEditor | null>;
  open: boolean;
  onClose: () => void;
  onChange: (content: string) => void;
}

const SearchReplacePanel: React.FC<SearchReplacePanelProps> = ({
  editorRef,
  open,
  onClose,
  onChange,
}) => {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [regex, setRegex] = useState(false);
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const decorationIdsRef = useRef<string[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Focus search input when panel opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    if (!open) {
      clearDecorations();
      setMatches([]);
      setCurrentMatchIndex(-1);
    }
  }, [open]);

  const clearDecorations = useCallback(() => {
    const ed = editorRef.current;
    if (ed && decorationIdsRef.current.length > 0) {
      ed.deltaDecorations(decorationIdsRef.current, []);
      decorationIdsRef.current = [];
    }
  }, [editorRef]);

  const performSearch = useCallback(() => {
    const ed = editorRef.current;
    if (!ed || !searchText) {
      clearDecorations();
      setMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const model = ed.getModel();
    if (!model) return;

    let searchRegex: RegExp;
    try {
      if (regex) {
        searchRegex = new RegExp(searchText, caseSensitive ? 'g' : 'gi');
      } else {
        const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
        searchRegex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
      }
    } catch {
      // Invalid regex
      clearDecorations();
      setMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const text = model.getValue();
    const foundMatches: MatchInfo[] = [];
    let match: RegExpExecArray | null;

    while ((match = searchRegex.exec(text)) !== null) {
      if (match[0].length === 0) {
        searchRegex.lastIndex++;
        continue;
      }
      const startPos = model.getPositionAt(match.index);
      const endPos = model.getPositionAt(match.index + match[0].length);
      const lineContent = model.getLineContent(startPos.lineNumber);

      foundMatches.push({
        range: {
          startLineNumber: startPos.lineNumber,
          startColumn: startPos.column,
          endLineNumber: endPos.lineNumber,
          endColumn: endPos.column,
        },
        text: match[0],
        lineContent,
      });
    }

    setMatches(foundMatches);

    // Try to keep current match near cursor position
    if (foundMatches.length > 0) {
      const cursorPos = ed.getPosition();
      let bestIndex = 0;
      if (cursorPos) {
        for (let i = 0; i < foundMatches.length; i++) {
          const r = foundMatches[i].range;
          if (
            r.startLineNumber > cursorPos.lineNumber ||
            (r.startLineNumber === cursorPos.lineNumber && r.startColumn >= cursorPos.column)
          ) {
            bestIndex = i;
            break;
          }
          bestIndex = i;
        }
      }
      setCurrentMatchIndex(bestIndex);
    } else {
      setCurrentMatchIndex(-1);
    }
  }, [editorRef, searchText, caseSensitive, wholeWord, regex, clearDecorations]);

  // Update decorations when matches or current index change
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;

    const newDecorations = matches.map((m, i) => ({
      range: {
        startLineNumber: m.range.startLineNumber,
        startColumn: m.range.startColumn,
        endLineNumber: m.range.endLineNumber,
        endColumn: m.range.endColumn,
      },
      options: {
        inlineClassName: i === currentMatchIndex ? 'search-current-highlight' : 'search-highlight',
      },
    }));

    decorationIdsRef.current = ed.deltaDecorations(decorationIdsRef.current, newDecorations);
  }, [editorRef, matches, currentMatchIndex]);

  // Debounced search on input change or panel reopen
  useEffect(() => {
    if (!open) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      performSearch();
    }, 150);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [performSearch, open]);

  // Re-search when editor content changes
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || !open) return;

    const disposable = ed.onDidChangeModelContent(() => {
      if (searchText) {
        performSearch();
      }
    });

    return () => disposable.dispose();
  }, [editorRef, open, searchText, performSearch]);

  const goToMatch = useCallback(
    (index: number) => {
      const ed = editorRef.current;
      if (!ed || matches.length === 0 || index < 0 || index >= matches.length) return;

      setCurrentMatchIndex(index);
      const m = matches[index];
      ed.revealLineInCenter(m.range.startLineNumber);
      ed.setSelection({
        startLineNumber: m.range.startLineNumber,
        startColumn: m.range.startColumn,
        endLineNumber: m.range.endLineNumber,
        endColumn: m.range.endColumn,
      });
    },
    [editorRef, matches],
  );

  const goToNextMatch = useCallback(() => {
    if (matches.length === 0) return;
    const next = (currentMatchIndex + 1) % matches.length;
    goToMatch(next);
  }, [currentMatchIndex, matches.length, goToMatch]);

  const goToPrevMatch = useCallback(() => {
    if (matches.length === 0) return;
    const prev = (currentMatchIndex - 1 + matches.length) % matches.length;
    goToMatch(prev);
  }, [currentMatchIndex, matches.length, goToMatch]);

  const handleReplace = useCallback(() => {
    const ed = editorRef.current;
    if (!ed || matches.length === 0 || currentMatchIndex < 0) return;

    const m = matches[currentMatchIndex];
    ed.executeEdits('search-replace', [
      {
        range: m.range,
        text: replaceText,
        forceMoveMarkers: true,
      },
    ]);

    const model = ed.getModel();
    if (model) {
      onChange(model.getValue());
    }
    // performSearch will be triggered by onDidChangeModelContent
  }, [editorRef, matches, currentMatchIndex, replaceText, onChange]);

  const handleReplaceAll = useCallback(() => {
    const ed = editorRef.current;
    if (!ed || matches.length === 0) return;

    // Apply replacements in reverse order to preserve offsets
    const edits = [...matches]
      .reverse()
      .map((m) => ({
        range: m.range,
        text: replaceText,
        forceMoveMarkers: true,
      }));

    ed.executeEdits('search-replace-all', edits);

    const model = ed.getModel();
    if (model) {
      onChange(model.getValue());
    }
    // performSearch will be triggered by onDidChangeModelContent
  }, [editorRef, matches, replaceText, onChange]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        goToPrevMatch();
      } else {
        goToNextMatch();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleReplaceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  const matchCountLabel = matches.length > 0
    ? `${currentMatchIndex + 1} of ${matches.length}`
    : searchText
      ? 'No results'
      : '';

  const optionButtonStyle = (active: boolean) => ({
    width: 28,
    height: 28,
    fontSize: '12px',
    fontWeight: active ? 700 : 400,
    borderRadius: '4px',
    border: active ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
    backgroundColor: active ? 'var(--color-primary)' : 'transparent',
    color: active ? '#fff' : 'var(--color-text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    lineHeight: 1,
  });

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 8,
        right: 20,
        zIndex: 100,
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        minWidth: 420,
        maxWidth: 520,
        overflow: 'hidden',
      }}
    >
      {/* Search row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5 }}>
        <IconButton
          size="small"
          onClick={() => setShowReplace(!showReplace)}
          sx={{ width: 24, height: 24, p: 0 }}
        >
          {showReplace ? (
            <ExpandMore sx={{ fontSize: 18, color: 'var(--color-text-secondary)' }} />
          ) : (
            <ChevronRight sx={{ fontSize: 18, color: 'var(--color-text-secondary)' }} />
          )}
        </IconButton>

        <input
          ref={searchInputRef}
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search"
          style={{
            flex: 1,
            height: 26,
            padding: '2px 8px',
            fontSize: '13px',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            backgroundColor: 'var(--color-background)',
            color: 'var(--color-text)',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />

        <Typography
          variant="caption"
          sx={{
            color: 'var(--color-text-secondary)',
            fontSize: '11px',
            minWidth: 60,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          {matchCountLabel}
        </Typography>

        <Tooltip title="Previous match (Shift+Enter)">
          <span>
            <IconButton
              size="small"
              onClick={goToPrevMatch}
              disabled={matches.length === 0}
              sx={{ width: 24, height: 24, p: 0 }}
            >
              <KeyboardArrowUp sx={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Next match (Enter)">
          <span>
            <IconButton
              size="small"
              onClick={goToNextMatch}
              disabled={matches.length === 0}
              sx={{ width: 24, height: 24, p: 0 }}
            >
              <KeyboardArrowDown sx={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Case Sensitive">
          <button
            onClick={() => setCaseSensitive(!caseSensitive)}
            style={optionButtonStyle(caseSensitive)}
          >
            Aa
          </button>
        </Tooltip>

        <Tooltip title="Whole Word">
          <button
            onClick={() => setWholeWord(!wholeWord)}
            style={optionButtonStyle(wholeWord)}
          >
            ab
          </button>
        </Tooltip>

        <Tooltip title="Regex">
          <button
            onClick={() => setRegex(!regex)}
            style={optionButtonStyle(regex)}
          >
            .*
          </button>
        </Tooltip>

        <Tooltip title="Close (Escape)">
          <IconButton size="small" onClick={onClose} sx={{ width: 24, height: 24, p: 0 }}>
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Replace row */}
      {showReplace && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, pb: 0.5 }}>
          <Box sx={{ width: 24 }} />

          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={handleReplaceKeyDown}
            placeholder="Replace"
            style={{
              flex: 1,
              height: 26,
              padding: '2px 8px',
              fontSize: '13px',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-text)',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />

          <Tooltip title="Replace">
            <span>
              <button
                onClick={handleReplace}
                disabled={matches.length === 0 || currentMatchIndex < 0}
                style={{
                  height: 26,
                  padding: '0 10px',
                  fontSize: '12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--color-background)',
                  color: matches.length === 0 ? 'var(--color-text-secondary)' : 'var(--color-text)',
                  cursor: matches.length === 0 ? 'default' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Replace
              </button>
            </span>
          </Tooltip>

          <Tooltip title="Replace All">
            <span>
              <button
                onClick={handleReplaceAll}
                disabled={matches.length === 0}
                style={{
                  height: 26,
                  padding: '0 10px',
                  fontSize: '12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  backgroundColor: matches.length === 0 ? 'var(--color-background)' : 'var(--color-primary)',
                  color: matches.length === 0 ? 'var(--color-text-secondary)' : '#fff',
                  cursor: matches.length === 0 ? 'default' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                All
              </button>
            </span>
          </Tooltip>
        </Box>
      )}

      {/* Match list */}
      {matches.length > 0 && (
        <Box
          sx={{
            borderTop: '1px solid var(--color-border)',
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {matches.map((m, i) => {
            // Highlight the matched text in context
            const col = m.range.startColumn - 1;
            const matchLen = m.text.length;
            const before = m.lineContent.substring(Math.max(0, col - 30), col);
            const matched = m.lineContent.substring(col, col + matchLen);
            const after = m.lineContent.substring(col + matchLen, col + matchLen + 40);

            return (
              <Box
                key={`${m.range.startLineNumber}-${m.range.startColumn}-${i}`}
                onClick={() => goToMatch(i)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 1,
                  py: 0.25,
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: "'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace",
                  backgroundColor:
                    i === currentMatchIndex
                      ? 'rgba(var(--color-primary-rgb, 3, 102, 214), 0.1)'
                      : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(128, 128, 128, 0.1)',
                  },
                  borderBottom: '1px solid var(--color-border-light)',
                  overflow: 'hidden',
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    color: 'var(--color-text-secondary)',
                    fontSize: '11px',
                    minWidth: 40,
                    textAlign: 'right',
                    mr: 1,
                    flexShrink: 0,
                    userSelect: 'none',
                  }}
                >
                  L{m.range.startLineNumber}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontSize: '12px',
                    color: 'var(--color-text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {before}
                  <span
                    style={{
                      backgroundColor: 'var(--color-search-highlight)',
                      color: 'var(--color-search-highlight-text)',
                      borderRadius: '2px',
                      padding: '0 1px',
                    }}
                  >
                    {matched}
                  </span>
                  {after}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default SearchReplacePanel;
