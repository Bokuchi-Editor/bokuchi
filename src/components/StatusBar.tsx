import React, { useState } from 'react';
import { Box, Typography, Menu, MenuItem, IconButton, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ZoomIn, ZoomOut, RestartAlt } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { ThemeName, getVisibleThemes } from '../themes';

interface StatusBarProps {
  line: number;
  column: number;
  totalCharacters: number;
  selectedCharacters: number;
  darkMode?: boolean;
  theme?: string;
  onThemeChange?: (theme: ThemeName) => void;
  zoomPercentage: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  as400Unlocked?: boolean;
  isLateNight?: boolean;
  saveStatusMessage?: string | null;
}

const StatusBar: React.FC<StatusBarProps> = ({
  line,
  column,
  totalCharacters,
  selectedCharacters,
  theme,
  onThemeChange,
  zoomPercentage,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  canZoomIn,
  canZoomOut,
  as400Unlocked,
  isLateNight,
  saveStatusMessage
}) => {
  const { t } = useTranslation();
  const muiTheme = useTheme();
  const { palette } = muiTheme;
  const [themeMenuAnchor, setThemeMenuAnchor] = useState<null | HTMLElement>(null);
  const visibleThemes = getVisibleThemes(as400Unlocked ? ['as400'] : []);

  const handleThemeMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setThemeMenuAnchor(event.currentTarget);
  };

  const handleThemeMenuClose = () => {
    setThemeMenuAnchor(null);
  };

  const handleThemeSelect = (selectedTheme: ThemeName) => {
    if (onThemeChange) {
      onThemeChange(selectedTheme);
    }
    handleThemeMenuClose();
  };
  return (
    <Box
      className="status-bar"
      sx={{
        height: '24px',
        backgroundColor: palette.background.paper,
        borderTop: 1,
        borderColor: palette.divider,
        display: 'flex',
        alignItems: 'center',
        px: 2,
        fontSize: '12px',
        color: palette.text.secondary,
        fontFamily: 'monospace'
      }}
    >
      <Typography variant="caption" sx={{ mr: 2 }}>
        {t('statusBar.line')} {line}, {t('statusBar.column')} {column}
      </Typography>
      <Typography variant="caption" sx={{ mr: 2 }}>
        {selectedCharacters > 0
          ? `${selectedCharacters} ${t('statusBar.selected')}`
          : `${totalCharacters} ${t('statusBar.characters')}`
        }
      </Typography>

      {/* Late night message */}
      {isLateNight && (
        <Typography variant="caption" sx={{ mr: 2, opacity: 0.7, fontStyle: 'italic' }}>
          {t('easterEgg.lateNightMessage')}
        </Typography>
      )}

      {/* Zoom controls */}
      <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Tooltip title={t('tooltips.zoomOut')} placement="top">
          <IconButton
            size="small"
            onClick={onZoomOut}
            disabled={!canZoomOut}
            sx={{
              color: 'inherit',
              padding: '2px',
              minWidth: 'auto',
              opacity: canZoomOut ? 1 : 0.5,
              '&:hover': {
                backgroundColor: palette.action.hover,
              }
            }}
          >
            <ZoomOut sx={{ fontSize: '16px' }} />
          </IconButton>
        </Tooltip>

        <Typography
          variant="caption"
          sx={{
            fontFamily: 'monospace',
            minWidth: '40px',
            textAlign: 'center',
            cursor: 'default'
          }}
        >
          {zoomPercentage}%
        </Typography>

        <Tooltip title={t('tooltips.zoomIn')} placement="top">
          <IconButton
            size="small"
            onClick={onZoomIn}
            disabled={!canZoomIn}
            sx={{
              color: 'inherit',
              padding: '2px',
              minWidth: 'auto',
              opacity: canZoomIn ? 1 : 0.5,
              '&:hover': {
                backgroundColor: palette.action.hover,
              }
            }}
          >
            <ZoomIn sx={{ fontSize: '16px' }} />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('tooltips.resetZoom')} placement="top">
          <IconButton
            size="small"
            onClick={onResetZoom}
            sx={{
              color: 'inherit',
              padding: '2px',
              minWidth: 'auto',
              '&:hover': {
                backgroundColor: palette.action.hover,
              }
            }}
          >
            <RestartAlt sx={{ fontSize: '16px' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Save status message */}
      {saveStatusMessage && (
        <Typography
          variant="caption"
          sx={{
            ml: 'auto',
            mr: 1,
            fontFamily: 'monospace',
            opacity: 0.8,
          }}
        >
          {saveStatusMessage}
        </Typography>
      )}

      {/* Theme display and toggle - positioned at right end */}
      <Box sx={{ ml: saveStatusMessage ? 0 : 'auto', display: 'flex', alignItems: 'center' }}>
        <IconButton
          size="small"
          onClick={handleThemeMenuOpen}
          sx={{
            color: 'inherit',
            fontSize: '11px',
            padding: '2px 8px',
            minWidth: 'auto',
            '&:hover': {
              backgroundColor: palette.action.hover,
            }
          }}
        >
          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
            {theme ? t(`settings.appearance.themes.${theme}`, visibleThemes.find(tc => tc.name === theme)?.displayName || 'Default') : 'Default'}
          </Typography>
        </IconButton>

        <Menu
          anchorEl={themeMenuAnchor}
          open={Boolean(themeMenuAnchor)}
          onClose={handleThemeMenuClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: {
              backgroundColor: palette.background.paper,
              border: `1px solid ${palette.divider}`,
              minWidth: '120px',
            }
          }}
        >
          {visibleThemes.map((themeOption) => (
            <MenuItem
              key={themeOption.name}
              onClick={() => handleThemeSelect(themeOption.name)}
              sx={{
                color: palette.text.primary,
                fontSize: '12px',
                padding: '4px 12px',
                '&:hover': {
                  backgroundColor: palette.action.hover,
                },
                '&.Mui-selected': {
                  backgroundColor: palette.primary.main,
                  color: palette.primary.contrastText,
                  '&:hover': {
                    backgroundColor: palette.primary.dark,
                  }
                }
              }}
              selected={theme === themeOption.name}
            >
              {t(`settings.appearance.themes.${themeOption.name}`, themeOption.displayName)}
            </MenuItem>
          ))}
        </Menu>
      </Box>
    </Box>
  );
};

export default StatusBar;
