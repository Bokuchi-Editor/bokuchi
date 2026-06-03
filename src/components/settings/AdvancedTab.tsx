import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import { Upload, Download, Refresh } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { AppSettings } from '../../types/settings';
import {
  SettingsFocusTarget,
  SETTINGS_FOCUS_ELEMENT_ID,
} from '../../types/settingsFocus';
import {
  RadioSettingCard,
  SwitchSettingCard,
  type RadioSettingOption,
  type SettingChangeHandler,
} from './SettingControls';

interface RenderingToggleRowProps {
  target: SettingsFocusTarget;
  highlighted: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
  sx?: SxProps<Theme>;
}

/**
 * A rendering-feature toggle that can be deep-linked to and briefly highlighted.
 * The wrapping element carries a stable id so the dialog can scroll it into view.
 */
const RenderingToggleRow: React.FC<RenderingToggleRowProps> = ({
  target,
  highlighted,
  checked,
  onChange,
  label,
  description,
  sx,
}) => (
  <Box
    id={SETTINGS_FOCUS_ELEMENT_ID[target]}
    sx={{
      p: 1,
      borderRadius: 1,
      transition: 'background-color 600ms ease',
      backgroundColor: highlighted ? 'action.selected' : 'transparent',
      ...sx,
    }}
  >
    <FormControlLabel
      control={<Switch checked={checked} onChange={(e) => onChange(e.target.checked)} />}
      label={label}
    />
    <Typography variant="body2" color="text.secondary">
      {description}
    </Typography>
  </Box>
);

interface AdvancedTabProps {
  settings: AppSettings;
  onSettingChange: SettingChangeHandler;
  highlightedTarget: SettingsFocusTarget | null;
  onExportSettings: () => void;
  onImportSettings: () => void;
  onResetClick: () => void;
}

/** Advanced settings: auto-save, whitespace, table behaviour, rendering toggles, import/export/reset. */
const AdvancedTab: React.FC<AdvancedTabProps> = ({
  settings,
  onSettingChange,
  highlightedTarget,
  onExportSettings,
  onImportSettings,
  onResetClick,
}) => {
  const { t } = useTranslation();

  const tableConversionOptions: RadioSettingOption[] = [
    { value: 'auto', label: t('settings.advanced.tableConversionAuto') },
    { value: 'confirm', label: t('settings.advanced.tableConversionConfirm') },
    { value: 'off', label: t('settings.advanced.tableConversionOff') },
  ];

  const tableLayoutOptions: RadioSettingOption[] = [
    {
      value: 'equal',
      label: t('settings.advanced.tableLayoutEqual'),
      description: t('settings.advanced.tableLayoutEqualDescription'),
    },
    {
      value: 'auto-wrap',
      label: t('settings.advanced.tableLayoutAutoWrap'),
      description: t('settings.advanced.tableLayoutAutoWrapDescription'),
    },
    {
      value: 'auto-scroll',
      label: t('settings.advanced.tableLayoutAutoScroll'),
      description: t('settings.advanced.tableLayoutAutoScrollDescription'),
    },
  ];

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>
        {t('settings.advanced.title')}
      </Typography>

      <SwitchSettingCard
        sx={{ mb: 3 }}
        checked={settings.advanced.autoSave}
        onChange={(checked) => onSettingChange('advanced', 'autoSave', checked)}
        label={t('settings.advanced.autoSave')}
        description={t('settings.advanced.autoSaveDescription')}
      />

      <SwitchSettingCard
        sx={{ mb: 3 }}
        checked={settings.advanced.showWhitespace}
        onChange={(checked) => onSettingChange('advanced', 'showWhitespace', checked)}
        label={t('settings.advanced.showWhitespace')}
        description={t('settings.advanced.showWhitespaceDescription')}
      />

      <RadioSettingCard
        sx={{ mb: 3 }}
        title={t('settings.advanced.tableConversion')}
        titleSx={{ mb: 2 }}
        description={t('settings.advanced.tableConversionDescription')}
        value={settings.advanced.tableConversion}
        onChange={(value) => onSettingChange('advanced', 'tableConversion', value)}
        options={tableConversionOptions}
      />

      <RadioSettingCard
        sx={{ mb: 3 }}
        title={t('settings.advanced.tableLayout')}
        titleSx={{ mb: 2 }}
        description={t('settings.advanced.tableLayoutDescription')}
        value={settings.preview?.tableLayout ?? 'auto-wrap'}
        onChange={(value) => onSettingChange('preview', 'tableLayout', value)}
        options={tableLayoutOptions}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('settings.advanced.rendering')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('settings.advanced.renderingDescription')}
          </Typography>
          <RenderingToggleRow
            target="rendering.enableKatex"
            highlighted={highlightedTarget === 'rendering.enableKatex'}
            checked={settings.rendering?.enableKatex ?? true}
            onChange={(checked) => onSettingChange('rendering', 'enableKatex', checked)}
            label={t('settings.advanced.enableKatex')}
            description={t('settings.advanced.enableKatexDescription')}
            sx={{ mb: 1 }}
          />
          <RenderingToggleRow
            target="rendering.enableMermaid"
            highlighted={highlightedTarget === 'rendering.enableMermaid'}
            checked={settings.rendering?.enableMermaid ?? false}
            onChange={(checked) => onSettingChange('rendering', 'enableMermaid', checked)}
            label={t('settings.advanced.enableMermaid')}
            description={t('settings.advanced.enableMermaidDescription')}
            sx={{ mb: 1 }}
          />
          <RenderingToggleRow
            target="rendering.enableMarp"
            highlighted={highlightedTarget === 'rendering.enableMarp'}
            checked={settings.rendering?.enableMarp ?? false}
            onChange={(checked) => onSettingChange('rendering', 'enableMarp', checked)}
            label={t('settings.advanced.enableMarp')}
            description={t('settings.advanced.enableMarpDescription')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('settings.advanced.importExport')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="outlined" startIcon={<Download />} onClick={onExportSettings}>
              {t('settings.advanced.exportSettings')}
            </Button>
            <Button variant="outlined" startIcon={<Upload />} onClick={onImportSettings}>
              {t('settings.advanced.importSettings')}
            </Button>
            <Button variant="outlined" color="error" startIcon={<Refresh />} onClick={onResetClick}>
              {t('settings.advanced.resetSettings')}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdvancedTab;
