import React from 'react';
import { Box } from '@mui/material';
import type { CustomThemeColors } from '../../themes/customTheme';

/**
 * Monaco's built-in skins. The editor pane of the preview is deliberately
 * painted with these fixed colors — NOT the theme tokens — because the real
 * editor only switches between `vs` and `vs-dark` and ignores theme colors.
 * Seeing that in the preview is what makes the "editor mode" toggle tangible.
 */
const MONACO_SKIN = {
  light: { background: '#fffffe', text: '#000000', label: 'vs' },
  dark: { background: '#1e1e1e', text: '#d4d4d4', label: 'vs-dark' },
} as const;

interface ThemeMiniPreviewProps {
  colors: CustomThemeColors;
  mode: 'light' | 'dark';
}

/**
 * Miniature mock of the app (app bar / tab strip / editor + preview panes /
 * status bar) painted with a theme's 7 tokens. Purely visual — no
 * interaction. Used inside the hover popover of the theme gallery.
 */
const ThemeMiniPreview: React.FC<ThemeMiniPreviewProps> = ({ colors, mode }) => {
  const monaco = MONACO_SKIN[mode];
  const border = `1px solid ${colors.divider}`;

  return (
    <Box
      sx={{
        border,
        borderRadius: 1,
        overflow: 'hidden',
        userSelect: 'none',
        pointerEvents: 'none',
        fontSize: '10px',
        lineHeight: 1.5,
        backgroundColor: colors.backgroundDefault,
      }}
    >
      {/* App bar */}
      <Box
        sx={{
          px: 1,
          py: 0.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: colors.backgroundPaper,
          color: colors.textPrimary,
          borderBottom: border,
          fontWeight: 600,
        }}
      >
        <span>Bokuchi — sample.md</span>
        <Box
          component="span"
          sx={{
            px: 0.75,
            py: 0.1,
            borderRadius: 0.5,
            backgroundColor: colors.primaryMain,
            color: colors.backgroundDefault,
            fontSize: '9px',
            fontWeight: 600,
          }}
        >
          Save
        </Box>
      </Box>

      {/* Tab strip */}
      <Box
        sx={{
          px: 0.75,
          py: 0.4,
          display: 'flex',
          gap: 0.5,
          borderBottom: border,
          backgroundColor: colors.backgroundDefault,
        }}
      >
        <Box
          component="span"
          sx={{
            px: 0.75,
            borderRadius: 0.5,
            backgroundColor: colors.backgroundPaper,
            color: colors.textPrimary,
            fontWeight: 600,
          }}
        >
          sample.md
        </Box>
        <Box component="span" sx={{ px: 0.75, color: colors.textSecondary }}>
          notes.txt
        </Box>
      </Box>

      {/* Editor + rendered preview panes */}
      <Box sx={{ display: 'flex', minHeight: 84 }}>
        <Box
          sx={{
            flex: 1,
            p: 0.75,
            fontFamily: 'monospace',
            fontSize: '9px',
            whiteSpace: 'pre-wrap',
            backgroundColor: monaco.background,
            color: monaco.text,
            borderRight: border,
            position: 'relative',
          }}
        >
          {'# Sample\n\n- **bold**\n- `code`'}
          <Box
            component="span"
            sx={{
              position: 'absolute',
              right: 3,
              bottom: 2,
              fontSize: '8px',
              opacity: 0.55,
            }}
          >
            {monaco.label}
          </Box>
        </Box>
        <Box sx={{ flex: 1, p: 0.75, backgroundColor: colors.backgroundPaper, color: colors.textPrimary }}>
          <Box sx={{ fontWeight: 700, fontSize: '11px', mb: 0.25 }}>Sample</Box>
          <Box>
            <b>bold</b>{' / '}
            <Box
              component="span"
              sx={{
                fontFamily: 'monospace',
                fontSize: '8.5px',
                px: 0.4,
                borderRadius: 0.5,
                backgroundColor: colors.backgroundDefault,
                color: colors.primaryMain,
                border,
              }}
            >
              code
            </Box>
          </Box>
          <Box component="span" sx={{ color: colors.primaryMain, textDecoration: 'underline' }}>
            link
          </Box>
          <Box component="span" sx={{ color: colors.secondaryMain, ml: 0.75 }}>
            accent
          </Box>
        </Box>
      </Box>

      {/* Status bar */}
      <Box
        sx={{
          px: 1,
          py: 0.25,
          display: 'flex',
          justifyContent: 'space-between',
          backgroundColor: colors.backgroundPaper,
          color: colors.textSecondary,
          borderTop: border,
          fontSize: '8.5px',
          fontFamily: 'monospace',
        }}
      >
        <span>Markdown · UTF-8</span>
        <span>Ln 4, Col 12</span>
      </Box>
    </Box>
  );
};

export default ThemeMiniPreview;
