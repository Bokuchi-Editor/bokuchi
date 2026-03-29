import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { editor } from 'monaco-editor';
import { Box, Checkbox, FormControlLabel, IconButton, Tooltip, Typography } from '@mui/material';
import {
  Close,
  KeyboardArrowUp,
  KeyboardArrowDown,
  ExpandMore,
  ChevronRight,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Tab } from '../types/tab';

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

interface CrossTabMatchInfo {
  tabId: string;
  tabTitle: string;
  lineNumber: number;
  column: number;
  text: string;
  lineContent: string;
}

interface SearchReplacePanelProps {
  editorRef: React.RefObject<editor.IStandaloneCodeEditor | null>;
  open: boolean;
  onClose: () => void;
  onChange: (content: string) => void;
  tabs?: Tab[];
  activeTabId?: string | null;
  onTabSwitch?: (tabId: string) => void;
  searchAllTabsDefault?: boolean;
}

const SearchReplacePanel: React.FC<SearchReplacePanelProps> = ({
  editorRef,
  open,
  onClose,
  onChange,
  tabs,
  activeTabId,
  onTabSwitch,
  searchAllTabsDefault = false,
}) => {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [regex, setRegex] = useState(false);
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [searchAllTabs, setSearchAllTabs] = useState(searchAllTabsDefault);
  const [crossTabMatches, setCrossTabMatches] = useState<CrossTabMatchInfo[]>([]);
  const [currentCrossTabIndex, setCurrentCrossTabIndex] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const decorationIdsRef = useRef<string[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync searchAllTabs with searchAllTabsDefault when panel opens
  useEffect(() => {
    if (open) {
      setSearchAllTabs(searchAllTabsDefault);
    }
  }, [open, searchAllTabsDefault]);

  // Focus search input when panel opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    if (!open) {
      clearDecorations();
      setMatches([]);
      setCurrentMatchIndex(-1);
      setCrossTabMatches([]);
      setCurrentCrossTabIndex(-1);
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

  // Cross-tab search
  const performCrossTabSearch = useCallback(() => {
    if (!tabs || !searchText) {
      setCrossTabMatches([]);
      setCurrentCrossTabIndex(-1);
      return;
    }

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
      setCrossTabMatches([]);
      setCurrentCrossTabIndex(-1);
      return;
    }

    const allMatches: CrossTabMatchInfo[] = [];

    for (const tab of tabs) {
      const lines = tab.content.split(/\r?\n/);
      // Reset regex for each tab
      searchRegex.lastIndex = 0;

      let match: RegExpExecArray | null;
      const tabContent = tab.content;
      searchRegex.lastIndex = 0;

      while ((match = searchRegex.exec(tabContent)) !== null) {
        if (match[0].length === 0) {
          searchRegex.lastIndex++;
          continue;
        }
        // Calculate line number and column
        const beforeMatch = tabContent.substring(0, match.index);
        const lineNumber = beforeMatch.split(/\r?\n/).length;
        const lastNewline = beforeMatch.lastIndexOf('\n');
        const column = match.index - lastNewline;

        allMatches.push({
          tabId: tab.id,
          tabTitle: tab.title,
          lineNumber,
          column,
          text: match[0],
          lineContent: lines[lineNumber - 1] || '',
        });
      }
    }

    setCrossTabMatches(allMatches);
    if (allMatches.length > 0) {
      // Try to start from active tab's first match
      const activeIdx = allMatches.findIndex(m => m.tabId === activeTabId);
      setCurrentCrossTabIndex(activeIdx >= 0 ? activeIdx : 0);
    } else {
      setCurrentCrossTabIndex(-1);
    }
  }, [tabs, searchText, caseSensitive, wholeWord, regex, activeTabId]);

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
      if (searchAllTabs) {
        performCrossTabSearch();
        // Also run local search for decorations in current editor
        performSearch();
      } else {
        performSearch();
        setCrossTabMatches([]);
        setCurrentCrossTabIndex(-1);
      }
    }, 150);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [performSearch, performCrossTabSearch, open, searchAllTabs]);

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

  const goToCrossTabMatch = useCallback((index: number) => {
    if (crossTabMatches.length === 0 || index < 0 || index >= crossTabMatches.length) return;
    setCurrentCrossTabIndex(index);
    const m = crossTabMatches[index];

    // Switch to the tab if not already active
    if (m.tabId !== activeTabId && onTabSwitch) {
      onTabSwitch(m.tabId);
      // After tab switch, we need to wait for the editor to mount, then reveal the line
      setTimeout(() => {
        const ed = editorRef.current;
        if (ed) {
          ed.revealLineInCenter(m.lineNumber);
          ed.setPosition({ lineNumber: m.lineNumber, column: m.column });
          ed.focus();
        }
      }, 200);
    } else {
      // Same tab - jump directly
      const ed = editorRef.current;
      if (ed) {
        ed.revealLineInCenter(m.lineNumber);
        ed.setSelection({
          startLineNumber: m.lineNumber,
          startColumn: m.column,
          endLineNumber: m.lineNumber,
          endColumn: m.column + m.text.length,
        });
        ed.focus();
      }
    }
  }, [crossTabMatches, activeTabId, onTabSwitch, editorRef]);

  const goToNextCrossTabMatch = useCallback(() => {
    if (crossTabMatches.length === 0) return;
    const next = (currentCrossTabIndex + 1) % crossTabMatches.length;
    goToCrossTabMatch(next);
  }, [currentCrossTabIndex, crossTabMatches.length, goToCrossTabMatch]);

  const goToPrevCrossTabMatch = useCallback(() => {
    if (crossTabMatches.length === 0) return;
    const prev = (currentCrossTabIndex - 1 + crossTabMatches.length) % crossTabMatches.length;
    goToCrossTabMatch(prev);
  }, [currentCrossTabIndex, crossTabMatches.length, goToCrossTabMatch]);

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
      if (searchAllTabs) {
        if (e.shiftKey) {
          goToPrevCrossTabMatch();
        } else {
          goToNextCrossTabMatch();
        }
      } else {
        if (e.shiftKey) {
          goToPrevMatch();
        } else {
          goToNextMatch();
        }
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

  const effectiveMatches = searchAllTabs ? crossTabMatches : matches;
  const effectiveIndex = searchAllTabs ? currentCrossTabIndex : currentMatchIndex;

  const matchCountLabel = effectiveMatches.length > 0
    ? `${effectiveIndex + 1} of ${effectiveMatches.length}`
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
        right: 8,
        zIndex: 100,
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        width: 'min(520px, calc(100% - 16px))',
        overflow: 'hidden',
      }}
    >
      {/* Search row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5 }}>
        {!searchAllTabs ? (
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
        ) : (
          <Box sx={{ width: 24 }} />
        )}

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
              onClick={searchAllTabs ? goToPrevCrossTabMatch : goToPrevMatch}
              disabled={effectiveMatches.length === 0}
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
              onClick={searchAllTabs ? goToNextCrossTabMatch : goToNextMatch}
              disabled={effectiveMatches.length === 0}
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

      {/* Search all tabs checkbox */}
      {tabs && tabs.length > 1 && (
        <Box sx={{ display: 'flex', alignItems: 'center', px: 1, pb: 0.25 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={searchAllTabs}
                onChange={(e) => setSearchAllTabs(e.target.checked)}
                size="small"
                sx={{ py: 0, '& .MuiSvgIcon-root': { fontSize: 16 } }}
              />
            }
            label={
              <Typography sx={{ fontSize: '12px', color: 'var(--color-text-secondary)', userSelect: 'none' }}>
                {t('search.searchAllTabs')}
              </Typography>
            }
            sx={{ m: 0, height: 24 }}
          />
        </Box>
      )}

      {/* Replace row - hidden in cross-tab mode */}
      {showReplace && !searchAllTabs && (
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

      {/* Match list - single tab mode */}
      {!searchAllTabs && matches.length > 0 && (
        <Box
          sx={{
            borderTop: '1px solid var(--color-border)',
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {matches.map((m, i) => {
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

      {/* Match list - cross-tab mode (grouped by tab) */}
      {searchAllTabs && crossTabMatches.length > 0 && (
        <Box
          sx={{
            borderTop: '1px solid var(--color-border)',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {(() => {
            // Group matches by tab
            const grouped: { tabId: string; tabTitle: string; matches: { match: CrossTabMatchInfo; globalIndex: number }[] }[] = [];
            crossTabMatches.forEach((m, i) => {
              const existing = grouped.find(g => g.tabId === m.tabId);
              if (existing) {
                existing.matches.push({ match: m, globalIndex: i });
              } else {
                grouped.push({ tabId: m.tabId, tabTitle: m.tabTitle, matches: [{ match: m, globalIndex: i }] });
              }
            });

            return grouped.map((group) => (
              <Box key={group.tabId}>
                {/* Tab header */}
                <Box
                  sx={{
                    px: 1,
                    py: 0.25,
                    backgroundColor: 'rgba(128, 128, 128, 0.08)',
                    borderBottom: '1px solid var(--color-border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: group.tabId === activeTabId ? 'var(--color-primary)' : 'var(--color-text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {group.tabTitle}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '10px',
                      color: 'var(--color-text-secondary)',
                      flexShrink: 0,
                    }}
                  >
                    ({group.matches.length})
                  </Typography>
                </Box>
                {/* Matches in this tab */}
                {group.matches.map(({ match: m, globalIndex }) => {
                  const col = m.column - 1;
                  const matchLen = m.text.length;
                  const before = m.lineContent.substring(Math.max(0, col - 30), col);
                  const matched = m.lineContent.substring(col, col + matchLen);
                  const after = m.lineContent.substring(col + matchLen, col + matchLen + 40);

                  return (
                    <Box
                      key={`${m.tabId}-${m.lineNumber}-${m.column}-${globalIndex}`}
                      onClick={() => goToCrossTabMatch(globalIndex)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        px: 1,
                        pl: 2,
                        py: 0.25,
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontFamily: "'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace",
                        backgroundColor:
                          globalIndex === currentCrossTabIndex
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
                        L{m.lineNumber}
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
            ));
          })()}
        </Box>
      )}
    </Box>
  );
};

export default SearchReplacePanel;
