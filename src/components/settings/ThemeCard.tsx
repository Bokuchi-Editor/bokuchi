import React from 'react';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import { CheckCircle, ContentCopy, Edit, WarningAmber } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { CustomThemeColors } from '../../themes/customTheme';
import { CUSTOM_THEME_COLOR_KEYS } from '../../themes/customTheme';

/** Display-ready theme entry shared by the gallery card, popover and base picker. */
export interface ThemeGalleryEntry {
  id: string;
  label: string;
  mode: 'light' | 'dark';
  colors: CustomThemeColors;
  isCustom: boolean;
  hasContrastWarning: boolean;
}

/** Horizontal band of the 7 theme tokens — the at-a-glance palette. */
export const ThemePaletteStrip: React.FC<{ colors: CustomThemeColors; height?: number }> = ({
  colors,
  height = 14,
}) => (
  <Box
    sx={{
      display: 'flex',
      height,
      borderRadius: 0.5,
      overflow: 'hidden',
      border: '1px solid',
      borderColor: 'divider',
    }}
  >
    {CUSTOM_THEME_COLOR_KEYS.map((key) => (
      <Box key={key} sx={{ flex: 1, backgroundColor: colors[key] }} />
    ))}
  </Box>
);

interface ThemeCardProps {
  entry: ThemeGalleryEntry;
  /** True when this theme is the applied one (single-click apply semantics). */
  selected: boolean;
  onApply: (id: string) => void;
  onDuplicate: (id: string) => void;
  /** Only rendered for custom themes. */
  onEdit?: (id: string) => void;
  onHoverStart: (element: HTMLElement, entry: ThemeGalleryEntry) => void;
  onHoverEnd: () => void;
}

/**
 * Compact gallery card: name + mode badge + palette strip. Click applies the
 * theme immediately (same semantics as the old dropdown); hover shows the
 * mini-preview popover (managed by the parent); duplicate/edit actions fade
 * in on hover.
 */
const ThemeCard: React.FC<ThemeCardProps> = ({
  entry,
  selected,
  onApply,
  onDuplicate,
  onEdit,
  onHoverStart,
  onHoverEnd,
}) => {
  const { t } = useTranslation();

  return (
    <Box
      data-testid={`theme-card-${entry.id}`}
      onClick={() => onApply(entry.id)}
      onMouseEnter={(e) => onHoverStart(e.currentTarget, entry)}
      onMouseLeave={onHoverEnd}
      sx={{
        position: 'relative',
        p: 1.25,
        borderRadius: 1,
        cursor: 'pointer',
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        outline: selected ? '1px solid' : 'none',
        outlineColor: 'primary.main',
        backgroundColor: 'background.paper',
        transition: 'border-color 120ms ease',
        '&:hover': {
          borderColor: selected ? 'primary.main' : 'text.secondary',
        },
        '&:hover .theme-card-actions': {
          opacity: 1,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75, minHeight: 24 }}>
        {selected && (
          <CheckCircle
            color="primary"
            sx={{ fontSize: 16, flexShrink: 0 }}
            titleAccess={t('settings.appearance.applied')}
          />
        )}
        <Typography variant="subtitle2" noWrap sx={{ flex: 1, minWidth: 0 }}>
          {entry.label}
        </Typography>
        {entry.hasContrastWarning && (
          <Tooltip title={t('settings.appearance.contrastWarning')}>
            <WarningAmber color="warning" sx={{ fontSize: 15, flexShrink: 0 }} />
          </Tooltip>
        )}
        <Chip
          label={
            entry.mode === 'dark'
              ? t('settings.appearance.editorModeDark')
              : t('settings.appearance.editorModeLight')
          }
          size="small"
          variant="outlined"
          sx={{ height: 18, fontSize: '10px', flexShrink: 0 }}
        />
      </Box>

      <ThemePaletteStrip colors={entry.colors} />

      {/* Hover actions (duplicate / edit) */}
      <Box
        className="theme-card-actions"
        sx={{
          position: 'absolute',
          top: 2,
          right: 2,
          display: 'flex',
          gap: 0.25,
          opacity: 0,
          transition: 'opacity 120ms ease',
          backgroundColor: 'background.paper',
          borderRadius: 1,
        }}
      >
        <Tooltip title={t('settings.appearance.duplicate')}>
          <IconButton
            size="small"
            data-testid={`theme-duplicate-${entry.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(entry.id);
            }}
          >
            <ContentCopy sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        {entry.isCustom && onEdit && (
          <Tooltip title={t('settings.appearance.editTheme')}>
            <IconButton
              size="small"
              data-testid={`theme-edit-${entry.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(entry.id);
              }}
            >
              <Edit sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default ThemeCard;
