import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Popper,
  Typography,
} from '@mui/material';
import { Add, RestartAlt, WarningAmber } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import {
  createCustomThemeFrom,
  getThemeColorTokens,
  getThemeDisplayName,
  getVisibleThemes,
} from '../../themes';
import type { CustomTheme } from '../../themes/customTheme';
import { CONTRAST_WARNING_THRESHOLD, contrastRatio } from '../../utils/colorUtils';
import type { AppSettings } from '../../types/settings';
import type { SettingChangeHandler } from './SettingControls';
import ThemeCard, { ThemeGalleryEntry, ThemePaletteStrip } from './ThemeCard';
import ThemeMiniPreview from './ThemeMiniPreview';
import CustomThemeEditor from './CustomThemeEditor';
import ThemeBasePickerDialog from './ThemeBasePickerDialog';

/** Delay before the hover preview popover appears (PC-only app: hover is fine). */
const PREVIEW_POPOVER_DELAY_MS = 200;

const GALLERY_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
  gap: 1.5,
} as const;

interface AppearanceTabProps {
  settings: AppSettings;
  onSettingChange: SettingChangeHandler;
  as400Unlocked?: boolean;
  customThemes: CustomTheme[];
  onCustomThemesChange: (customThemes: CustomTheme[]) => void;
}

const hasLowContrast = (entry: { colors: CustomTheme['colors'] }): boolean =>
  contrastRatio(entry.colors.textPrimary, entry.colors.backgroundDefault) <
    CONTRAST_WARNING_THRESHOLD ||
  contrastRatio(entry.colors.textPrimary, entry.colors.backgroundPaper) <
    CONTRAST_WARNING_THRESHOLD;

/**
 * Appearance settings: theme gallery.
 *
 * Presets and custom themes render as compact cards (name + mode badge +
 * palette strip). Clicking a card applies the theme immediately — including
 * to this settings screen itself. Hovering shows a mini-preview popover.
 * Custom themes are created by duplicating any theme and edited in place;
 * edits to the applied theme recolor the whole app live.
 */
const AppearanceTab: React.FC<AppearanceTabProps> = ({
  settings,
  onSettingChange,
  as400Unlocked,
  customThemes,
  onCustomThemesChange,
}) => {
  const { t } = useTranslation();
  const activeTheme = settings.appearance.theme;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [basePickerOpen, setBasePickerOpen] = useState(false);
  const [popover, setPopover] = useState<{ anchor: HTMLElement; entry: ThemeGalleryEntry } | null>(
    null,
  );
  const popoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const presetEntries: ThemeGalleryEntry[] = useMemo(() => {
    const visibleThemes = getVisibleThemes(as400Unlocked ? ['as400'] : []);
    return visibleThemes.map((preset) => {
      const colors = getThemeColorTokens(preset.name);
      return {
        id: preset.name,
        label: t(`settings.appearance.themes.${preset.name}`, preset.displayName),
        mode: preset.theme.palette.mode,
        colors,
        isCustom: false,
        hasContrastWarning: false,
      };
    });
  }, [as400Unlocked, t]);

  const customEntries: ThemeGalleryEntry[] = useMemo(
    () =>
      customThemes.map((custom) => ({
        id: custom.id,
        label: custom.name,
        mode: custom.mode,
        colors: custom.colors,
        isCustom: true,
        hasContrastWarning: hasLowContrast(custom),
      })),
    [customThemes],
  );

  const allEntries = useMemo(
    () => [...presetEntries, ...customEntries],
    [presetEntries, customEntries],
  );

  // --- Hover preview popover -----------------------------------------------

  const clearPopoverTimer = () => {
    if (popoverTimer.current !== null) {
      clearTimeout(popoverTimer.current);
      popoverTimer.current = null;
    }
  };

  const handleHoverStart = useCallback(
    (element: HTMLElement, entry: ThemeGalleryEntry) => {
      clearPopoverTimer();
      // No popover over the card being edited — the editor below shows everything.
      if (entry.id === editingId) return;
      popoverTimer.current = setTimeout(() => {
        popoverTimer.current = null;
        setPopover({ anchor: element, entry });
      }, PREVIEW_POPOVER_DELAY_MS);
    },
    [editingId],
  );

  const handleHoverEnd = useCallback(() => {
    clearPopoverTimer();
    setPopover(null);
  }, []);

  // --- Theme operations -----------------------------------------------------

  const applyTheme = (id: string) => {
    handleHoverEnd();
    onSettingChange('appearance', 'theme', id);
  };

  /** "<source> Copy", then "<source> Copy (2)" … until unique. */
  const makeCopyName = (sourceLabel: string): string => {
    const base = t('settings.appearance.copyName', { name: sourceLabel });
    const existing = new Set(customThemes.map((c) => c.name));
    if (!existing.has(base)) return base;
    let counter = 2;
    while (existing.has(`${base} (${counter})`)) counter += 1;
    return `${base} (${counter})`;
  };

  const duplicateTheme = (sourceId: string) => {
    handleHoverEnd();
    const sourceEntry = allEntries.find((entry) => entry.id === sourceId);
    const newTheme = createCustomThemeFrom(sourceId, makeCopyName(sourceEntry?.label ?? 'Theme'));
    // Register the new theme BEFORE applying it: applyTheme resolves the id
    // through the custom-theme registry, which onCustomThemesChange updates
    // synchronously.
    onCustomThemesChange([...customThemes, newTheme]);
    applyTheme(newTheme.id);
    setEditingId(newTheme.id);
  };

  const updateCustomTheme = (updated: CustomTheme) => {
    // Names must stay unique — they identify themes in the gallery/status bar.
    const otherNames = new Set(
      customThemes.filter((c) => c.id !== updated.id).map((c) => c.name),
    );
    let name = updated.name;
    let counter = 2;
    while (otherNames.has(name)) {
      name = `${updated.name} (${counter})`;
      counter += 1;
    }
    onCustomThemesChange(
      customThemes.map((c) => (c.id === updated.id ? { ...updated, name } : c)),
    );
  };

  const resetToBase = (target: CustomTheme) => {
    updateCustomTheme({ ...target, colors: getThemeColorTokens(target.baseTheme) });
  };

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    if (editingId === deleteTargetId) setEditingId(null);
    // When the deleted theme is the applied one, useSettings falls back to Default.
    onCustomThemesChange(customThemes.filter((c) => c.id !== deleteTargetId));
    setDeleteTargetId(null);
  };

  const editingTheme = customThemes.find((c) => c.id === editingId) ?? null;
  const deleteTarget = customThemes.find((c) => c.id === deleteTargetId) ?? null;

  const baseLabelFor = (custom: CustomTheme): string =>
    t(`settings.appearance.themes.${custom.baseTheme}`, getThemeDisplayName(custom.baseTheme));

  const renderCard = (entry: ThemeGalleryEntry) => (
    <ThemeCard
      key={entry.id}
      entry={entry}
      selected={entry.id === activeTheme}
      onApply={applyTheme}
      onDuplicate={duplicateTheme}
      onEdit={entry.isCustom ? (id) => setEditingId(id) : undefined}
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
    />
  );

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>
        {t('settings.appearance.title')}
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              {t('settings.appearance.themeDescription')}
            </Typography>
            {/* Escape hatch: always reachable even when a custom theme made the UI unreadable */}
            <Button
              size="small"
              startIcon={<RestartAlt />}
              onClick={() => applyTheme('default')}
              disabled={activeTheme === 'default'}
              data-testid="back-to-default-theme"
              sx={{ flexShrink: 0 }}
            >
              {t('settings.appearance.backToDefault')}
            </Button>
          </Box>

          {/* Presets */}
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {t('settings.appearance.presetSection')}
          </Typography>
          <Box sx={{ ...GALLERY_GRID_SX, mb: 3 }}>{presetEntries.map(renderCard)}</Box>

          {/* Custom themes */}
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {t('settings.appearance.customSection')}
          </Typography>
          <Box sx={GALLERY_GRID_SX}>
            {customEntries.map((entry) => (
              <React.Fragment key={entry.id}>
                {renderCard(entry)}
                {editingTheme && editingTheme.id === entry.id && (
                  <CustomThemeEditor
                    theme={editingTheme}
                    baseLabel={baseLabelFor(editingTheme)}
                    onChange={updateCustomTheme}
                    onResetToBase={() => resetToBase(editingTheme)}
                    onDelete={() => setDeleteTargetId(editingTheme.id)}
                    onClose={() => setEditingId(null)}
                  />
                )}
              </React.Fragment>
            ))}

            {/* Add-new card */}
            <Box
              onClick={() => setBasePickerOpen(true)}
              data-testid="add-custom-theme"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                minHeight: 64,
                p: 1.25,
                borderRadius: 1,
                cursor: 'pointer',
                border: '1px dashed',
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
              }}
            >
              <Add sx={{ fontSize: 18 }} />
              <Typography variant="body2">{t('settings.appearance.newTheme')}</Typography>
            </Box>
          </Box>

          {customThemes.length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {t('settings.appearance.customEmptyGuide')}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Hover mini-preview popover */}
      <Popper
        open={popover !== null}
        anchorEl={popover?.anchor ?? null}
        placement="bottom-start"
        sx={{ zIndex: (muiTheme) => muiTheme.zIndex.tooltip, pointerEvents: 'none' }}
      >
        {popover && (
          <Paper elevation={4} sx={{ width: 340, p: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle2" sx={{ flex: 1 }} noWrap>
                {popover.entry.label}
              </Typography>
              {popover.entry.hasContrastWarning && (
                <WarningAmber color="warning" sx={{ fontSize: 15 }} />
              )}
              <Chip
                label={
                  popover.entry.mode === 'dark'
                    ? t('settings.appearance.editorModeDark')
                    : t('settings.appearance.editorModeLight')
                }
                size="small"
                variant="outlined"
                sx={{ height: 18, fontSize: '10px' }}
              />
            </Box>
            <ThemeMiniPreview colors={popover.entry.colors} mode={popover.entry.mode} />
            <Box sx={{ mt: 1 }}>
              <ThemePaletteStrip colors={popover.entry.colors} height={10} />
            </Box>
          </Paper>
        )}
      </Popper>

      {/* Base picker for "new theme" */}
      <ThemeBasePickerDialog
        open={basePickerOpen}
        entries={allEntries}
        onClose={() => setBasePickerOpen(false)}
        onSelect={(id) => {
          setBasePickerOpen(false);
          duplicateTheme(id);
        }}
      />

      {/* Delete confirmation */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTargetId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('settings.appearance.deleteConfirmTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('settings.appearance.deleteConfirmMessage', { name: deleteTarget?.name ?? '' })}
          </DialogContentText>
          {deleteTarget && deleteTarget.id === activeTheme && (
            <DialogContentText sx={{ mt: 1 }}>
              {t('settings.appearance.deleteConfirmActiveNote')}
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTargetId(null)}>{t('buttons.cancel')}</Button>
          <Button color="error" onClick={confirmDelete} data-testid="confirm-delete-theme">
            {t('buttons.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AppearanceTab;
