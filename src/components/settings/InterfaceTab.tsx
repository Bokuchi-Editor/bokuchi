import React from 'react';
import {
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { AppSettings } from '../../types/settings';
import { LANGUAGE_OPTIONS } from '../../constants/languages';
import {
  RadioSettingCard,
  SliderSettingCard,
  type RadioSettingOption,
  type SettingChangeHandler,
} from './SettingControls';

const ZOOM = { min: 0.5, max: 2.0, step: 0.1 } as const;

const toPercent = (value: number) => `${Math.round(value * 100)}%`;

interface InterfaceTabProps {
  settings: AppSettings;
  onSettingChange: SettingChangeHandler;
}

/** Interface settings: language, tab layout, zoom, outline / explorer / scroll-sync modes. */
const InterfaceTab: React.FC<InterfaceTabProps> = ({ settings, onSettingChange }) => {
  const { t } = useTranslation();
  const { interface: ui } = settings;

  const tabLayoutOptions: RadioSettingOption[] = [
    {
      value: 'horizontal',
      label: t('settings.tabLayout.horizontal'),
      description: t('settings.tabLayout.horizontalDescription'),
    },
    {
      value: 'vertical',
      label: t('settings.tabLayout.vertical'),
      description: t('settings.tabLayout.verticalDescription'),
    },
  ];

  const closeButtonOptions: RadioSettingOption[] = [
    {
      value: 'left',
      label: t('settings.tabLayout.closeButtonLeft'),
      description: t('settings.tabLayout.closeButtonLeftDescription'),
    },
    {
      value: 'right',
      label: t('settings.tabLayout.closeButtonRight'),
      description: t('settings.tabLayout.closeButtonRightDescription'),
    },
  ];

  const outlineOptions: RadioSettingOption[] = [
    {
      value: 'persistent',
      label: t('settings.interface.outlineDisplayModePersistent'),
      description: t('settings.interface.outlineDisplayModePersistentDescription'),
    },
    {
      value: 'overlay',
      label: t('settings.interface.outlineDisplayModeOverlay'),
      description: t('settings.interface.outlineDisplayModeOverlayDescription'),
    },
  ];

  const folderTreeOptions: RadioSettingOption[] = [
    {
      value: 'persistent',
      label: t('settings.interface.folderTreeDisplayModePersistent'),
      description: t('settings.interface.folderTreeDisplayModePersistentDescription'),
    },
    {
      value: 'overlay',
      label: t('settings.interface.folderTreeDisplayModeOverlay'),
      description: t('settings.interface.folderTreeDisplayModeOverlayDescription'),
    },
    {
      value: 'off',
      label: t('settings.interface.folderTreeDisplayModeOff'),
      description: t('settings.interface.folderTreeDisplayModeOffDescription'),
    },
  ];

  const fileFilterOptions: RadioSettingOption[] = [
    { value: 'markdown', label: t('settings.interface.folderTreeFileFilterMarkdown') },
    { value: 'all', label: t('settings.interface.folderTreeFileFilterAll') },
  ];

  const scrollSyncOptions: RadioSettingOption[] = [
    {
      value: 'editor-to-preview',
      label: t('settings.interface.scrollSyncModeEditorToPreview'),
      description: t('settings.interface.scrollSyncModeEditorToPreviewDescription'),
    },
    {
      value: 'bidirectional',
      label: t('settings.interface.scrollSyncModeBidirectional'),
      description: t('settings.interface.scrollSyncModeBidirectionalDescription'),
    },
    {
      value: 'off',
      label: t('settings.interface.scrollSyncModeOff'),
      description: t('settings.interface.scrollSyncModeOffDescription'),
    },
  ];

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>
        {t('settings.interface.title')}
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('settings.language.description')}
          </Typography>
          <FormControl fullWidth>
            <InputLabel>{t('settings.language.selectLanguage')}</InputLabel>
            <Select
              value={ui.language}
              onChange={(e) => onSettingChange('interface', 'language', e.target.value)}
              label={t('settings.language.selectLanguage')}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {t(option.translationKey)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      <RadioSettingCard
        sx={{ mb: 3 }}
        description={t('settings.tabLayout.description')}
        value={ui.tabLayout}
        onChange={(value) => onSettingChange('interface', 'tabLayout', value)}
        options={tabLayoutOptions}
      />

      <RadioSettingCard
        sx={{ mb: 3 }}
        title={t('settings.tabLayout.closeButtonPosition')}
        titleVariant="subtitle1"
        titleGutterBottom
        description={t('settings.tabLayout.closeButtonPositionDescription')}
        value={ui.tabCloseButtonPosition}
        onChange={(value) => onSettingChange('interface', 'tabCloseButtonPosition', value)}
        options={closeButtonOptions}
      />

      <SliderSettingCard
        sx={{ mb: 3 }}
        description={t('settings.interface.zoomLevelDescription')}
        label={`${t('settings.interface.zoomLevel')}: ${toPercent(ui.zoomLevel)}`}
        value={ui.zoomLevel}
        min={ZOOM.min}
        max={ZOOM.max}
        step={ZOOM.step}
        onChange={(value) => onSettingChange('interface', 'zoomLevel', value)}
        valueLabelFormat={toPercent}
      />

      <RadioSettingCard
        title={t('settings.interface.outlineDisplayMode')}
        titleSx={{ mb: 1 }}
        description={t('settings.interface.outlineDisplayModeDescription')}
        value={ui.outlineDisplayMode}
        onChange={(value) => onSettingChange('interface', 'outlineDisplayMode', value)}
        options={outlineOptions}
      />

      <RadioSettingCard
        sx={{ mt: 3 }}
        title={t('settings.interface.folderTreeDisplayMode')}
        titleSx={{ mb: 1 }}
        description={t('settings.interface.folderTreeDisplayModeDescription')}
        value={ui.folderTreeDisplayMode}
        onChange={(value) => onSettingChange('interface', 'folderTreeDisplayMode', value)}
        options={folderTreeOptions}
      />

      <RadioSettingCard
        sx={{ mt: 3 }}
        title={t('settings.interface.folderTreeFileFilter')}
        titleSx={{ mb: 1 }}
        description={t('settings.interface.folderTreeFileFilterDescription')}
        value={ui.folderTreeFileFilter}
        onChange={(value) => onSettingChange('interface', 'folderTreeFileFilter', value)}
        options={fileFilterOptions}
      />

      <RadioSettingCard
        sx={{ mt: 3 }}
        title={t('settings.interface.scrollSyncMode')}
        titleSx={{ mb: 1 }}
        description={t('settings.interface.scrollSyncModeDescription')}
        value={ui.scrollSyncMode}
        onChange={(value) => onSettingChange('interface', 'scrollSyncMode', value)}
        options={scrollSyncOptions}
      />
    </Box>
  );
};

export default InterfaceTab;
