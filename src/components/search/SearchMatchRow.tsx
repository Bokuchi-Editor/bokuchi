import React from 'react';
import { Box, Typography } from '@mui/material';
import type { SnippetParts } from '../../utils/searchMatches';

interface SearchMatchRowProps {
  lineNumber: number;
  snippet: SnippetParts;
  active: boolean;
  /** Adds extra left padding for matches nested under a cross-tab group header. */
  indented?: boolean;
  onClick: () => void;
}

/**
 * A single clickable row in the search result list. Renders the line number and
 * the match context with the matched text highlighted. Shared by the single-tab
 * and cross-tab result lists so their markup stays in sync.
 */
const SearchMatchRow: React.FC<SearchMatchRowProps> = ({
  lineNumber,
  snippet,
  active,
  indented = false,
  onClick,
}) => (
  <Box
    onClick={onClick}
    sx={{
      display: 'flex',
      alignItems: 'center',
      px: 1,
      ...(indented ? { pl: 2 } : {}),
      py: 0.25,
      cursor: 'pointer',
      fontSize: '12px',
      fontFamily: "'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace",
      backgroundColor: active
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
      L{lineNumber}
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
      {snippet.before}
      <span
        style={{
          backgroundColor: 'var(--color-search-highlight)',
          color: 'var(--color-search-highlight-text)',
          borderRadius: '2px',
          padding: '0 1px',
        }}
      >
        {snippet.matched}
      </span>
      {snippet.after}
    </Typography>
  </Box>
);

export default SearchMatchRow;
