import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { Delete, Done, RestartAlt, WarningAmber } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { CustomTheme, CustomThemeColors } from '../../themes/customTheme';
import { CUSTOM_THEME_COLOR_KEYS } from '../../themes/customTheme';
import { CONTRAST_WARNING_THRESHOLD, contrastRatio, normalizeHex } from '../../utils/colorUtils';

/**
 * One swatch row: color chip (native picker) + tolerant hex field.
 * The hex field keeps a local draft so partially-typed values don't reset;
 * a valid value commits immediately (live full-app reflection when the theme
 * is applied), an invalid one shows an error and reverts on blur.
 */
const SwatchField: React.FC<{
  colorKey: keyof CustomThemeColors;
  label: string;
  value: string;
  warning: boolean;
  onCommit: (key: keyof CustomThemeColors, value: string) => void;
}> = ({ colorKey, label, value, warning, onCommit }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);

  // External change (picker drag, reset-to-base) refreshes the draft.
  useEffect(() => {
    setDraft(value);
    setInvalid(false);
  }, [value]);

  const handleHexChange = (raw: string) => {
    setDraft(raw);
    const normalized = normalizeHex(raw);
    if (normalized) {
      setInvalid(false);
      if (normalized !== value) onCommit(colorKey, normalized);
    } else {
      setInvalid(true);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        component="label"
        sx={{
          position: 'relative',
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: 0.75,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: value,
          cursor: 'pointer',
          display: 'block',
        }}
      >
        <Box
          component="input"
          type="color"
          value={value}
          data-testid={`swatch-picker-${colorKey}`}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onCommit(colorKey, e.target.value)}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
          }}
        />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" noWrap>
            {label}
          </Typography>
          {warning && (
            <Tooltip title={t('settings.appearance.contrastWarning')}>
              <WarningAmber color="warning" sx={{ fontSize: 14 }} />
            </Tooltip>
          )}
        </Box>
        <TextField
          value={draft}
          error={invalid}
          size="small"
          variant="standard"
          inputProps={{
            'data-testid': `swatch-hex-${colorKey}`,
            style: { fontFamily: 'monospace', fontSize: 12 },
            spellCheck: false,
          }}
          onChange={(e) => handleHexChange(e.target.value)}
          onBlur={() => {
            // Abandon an invalid draft: fall back to the last committed color.
            setDraft(value);
            setInvalid(false);
          }}
          sx={{ width: 96 }}
        />
      </Box>
    </Box>
  );
};

interface CustomThemeEditorProps {
  theme: CustomTheme;
  /** Localized display name of the base preset ("reset colors to base" target). */
  baseLabel: string;
  onChange: (updated: CustomTheme) => void;
  onResetToBase: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * In-place editor for a custom theme, rendered as a full-width row inside the
 * gallery grid. All changes commit immediately — when the edited theme is the
 * applied one, the entire app (including this settings screen) recolors live.
 */
const CustomThemeEditor: React.FC<CustomThemeEditorProps> = ({
  theme,
  baseLabel,
  onChange,
  onResetToBase,
  onDelete,
  onClose,
}) => {
  const { t } = useTranslation();
  const [nameDraft, setNameDraft] = useState(theme.name);

  useEffect(() => {
    setNameDraft(theme.name);
  }, [theme.name]);

  const commitName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed === '') {
      // Empty name is not allowed: restore the current one.
      setNameDraft(theme.name);
      return;
    }
    if (trimmed !== theme.name) {
      onChange({ ...theme, name: trimmed });
    }
  };

  const handleColorCommit = (key: keyof CustomThemeColors, value: string) => {
    onChange({ ...theme, colors: { ...theme.colors, [key]: value } });
  };

  // Readability warnings: text.primary against both backgrounds. Soft warning
  // only — extreme themes are allowed on purpose.
  const lowContrastOnBackground =
    contrastRatio(theme.colors.textPrimary, theme.colors.backgroundDefault) <
    CONTRAST_WARNING_THRESHOLD;
  const lowContrastOnPaper =
    contrastRatio(theme.colors.textPrimary, theme.colors.backgroundPaper) <
    CONTRAST_WARNING_THRESHOLD;
  const warningKeys = new Set<keyof CustomThemeColors>();
  if (lowContrastOnBackground) {
    warningKeys.add('textPrimary');
    warningKeys.add('backgroundDefault');
  }
  if (lowContrastOnPaper) {
    warningKeys.add('textPrimary');
    warningKeys.add('backgroundPaper');
  }

  return (
    <Paper
      variant="outlined"
      data-testid="custom-theme-editor"
      sx={{ gridColumn: '1 / -1', p: 2 }}
    >
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start', mb: 2 }}>
        <TextField
          label={t('settings.appearance.themeName')}
          value={nameDraft}
          size="small"
          inputProps={{ 'data-testid': 'custom-theme-name' }}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitName();
          }}
          sx={{ minWidth: 220 }}
        />
        <Box>
          <ToggleButtonGroup
            value={theme.mode}
            exclusive
            size="small"
            onChange={(_, mode: 'light' | 'dark' | null) => {
              if (mode) onChange({ ...theme, mode });
            }}
          >
            <ToggleButton value="light" data-testid="editor-mode-light">
              {t('settings.appearance.editorModeLight')}
            </ToggleButton>
            <ToggleButton value="dark" data-testid="editor-mode-dark">
              {t('settings.appearance.editorModeDark')}
            </ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, maxWidth: 360 }}>
            {t('settings.appearance.editorModeDescription')}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
          gap: 1.5,
          mb: 2,
        }}
      >
        {CUSTOM_THEME_COLOR_KEYS.map((key) => (
          <SwatchField
            key={key}
            colorKey={key}
            label={t(`settings.appearance.colors.${key}`)}
            value={theme.colors[key]}
            warning={warningKeys.has(key)}
            onCommit={handleColorCommit}
          />
        ))}
      </Box>

      {(lowContrastOnBackground || lowContrastOnPaper) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 2 }}>
          <WarningAmber color="warning" sx={{ fontSize: 18 }} />
          <Typography variant="body2" color="text.secondary">
            {t('settings.appearance.contrastWarning')}
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RestartAlt />}
          onClick={onResetToBase}
          data-testid="reset-to-base"
        >
          {t('settings.appearance.resetToBase', { name: baseLabel })}
        </Button>
        <Button
          variant="outlined"
          size="small"
          color="error"
          startIcon={<Delete />}
          onClick={onDelete}
          data-testid="delete-custom-theme"
        >
          {t('settings.appearance.deleteTheme')}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          size="small"
          startIcon={<Done />}
          onClick={onClose}
          data-testid="close-theme-editor"
        >
          {t('settings.appearance.doneEditing')}
        </Button>
      </Box>
    </Paper>
  );
};

export default CustomThemeEditor;
