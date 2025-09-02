import React, { useState } from 'react';
import { Box, Typography, Menu, MenuItem, IconButton, Tooltip } from '@mui/material';
import { ZoomIn, ZoomOut, RestartAlt } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { ThemeName, themes } from '../themes';

interface StatusBarProps {
  line: number;
  column: number;
  totalCharacters: number;
  selectedCharacters: number;
  darkMode: boolean;
  theme?: string;
  onThemeChange?: (theme: ThemeName) => void;
  zoomPercentage: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

const StatusBar: React.FC<StatusBarProps> = ({
  line,
  column,
  totalCharacters,
  selectedCharacters,
  darkMode,
  theme,
  onThemeChange,
  zoomPercentage,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  canZoomIn,
  canZoomOut
}) => {
  const { t } = useTranslation();
  const [themeMenuAnchor, setThemeMenuAnchor] = useState<null | HTMLElement>(null);

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
        backgroundColor: theme === 'darcula' ? '#3C3F41' : (darkMode ? '#1e1e1e' : '#f3f3f3'),
        borderTop: 1,
        borderColor: theme === 'darcula' ? '#323232' : 'divider',
        display: 'flex',
        alignItems: 'center',
        px: 2,
        fontSize: '12px',
        color: theme === 'darcula' ? '#A9B7C6' : (darkMode ? '#cccccc' : '#666666'),
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

      {/* ズームコントロール */}
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
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            <RestartAlt sx={{ fontSize: '16px' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* テーマ表示と切り替え - 右端に配置 */}
      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
        <IconButton
          size="small"
          onClick={handleThemeMenuOpen}
          sx={{
            color: 'inherit',
            fontSize: '11px',
            padding: '2px 8px',
            minWidth: 'auto',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
            {theme ? themes.find(t => t.name === theme)?.displayName || 'Default' : 'Default'}
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
              backgroundColor: theme === 'darcula' ? '#3C3F41' : (darkMode ? '#1e1e1e' : '#ffffff'),
              border: theme === 'darcula' ? '1px solid #323232' : (darkMode ? '1px solid #404040' : '1px solid #e0e0e0'),
              minWidth: '120px',
            }
          }}
        >
          {themes.map((themeOption) => (
            <MenuItem
              key={themeOption.name}
              onClick={() => handleThemeSelect(themeOption.name)}
              sx={{
                color: theme === 'darcula' ? '#A9B7C6' : (darkMode ? '#cccccc' : '#333333'),
                fontSize: '12px',
                padding: '4px 12px',
                '&:hover': {
                  backgroundColor: theme === 'darcula' ? '#4C4F51' : (darkMode ? '#2d2d2d' : '#f5f5f5'),
                },
                '&.Mui-selected': {
                  backgroundColor: theme === 'darcula' ? '#CC7832' : (darkMode ? '#007acc' : '#e3f2fd'),
                  color: theme === 'darcula' ? '#2B2B2B' : (darkMode ? '#ffffff' : '#1976d2'),
                  '&:hover': {
                    backgroundColor: theme === 'darcula' ? '#D18F4A' : (darkMode ? '#005a9e' : '#bbdefb'),
                  }
                }
              }}
              selected={theme === themeOption.name}
            >
              {themeOption.displayName}
            </MenuItem>
          ))}
        </Menu>
      </Box>
    </Box>
  );
};

export default StatusBar;
