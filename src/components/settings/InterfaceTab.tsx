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
import type { OutlineDisplayMode } from '../../types/outline';
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
  /** Used by the outline radio, which updates two interface fields atomically. */
  onSettingsChange: (settings: AppSettings) => void;
}

/** Interface settings: language, tab layout, zoom, outline / explorer / scroll-sync modes. */
const InterfaceTab: React.FC<InterfaceTabProps> = ({ settings, onSettingChange, onSettingsChange }) => {
  const { t } = useTranslation();
  const { interface: ui } = settings;

  // The outline radio presents three choices but is backed by two persisted fields:
  // `outlineDisplayMode` (the style — persistent/overlay) and `outlineEnabled` (on/off).
  // Selecting "off" only flips `outlineEnabled`, preserving the style so the header
  // button can later restore it. Both fields must change together when picking a style
  // (handleSettingChange rebuilds from `settings` each call, so a single merged update
  // is required instead of two sequential calls).
  const outlineSelectedValue = ui.outlineEnabled ? ui.outlineDisplayMode : 'off';
  const handleOutlineChange = (value: string) => {
    if (value === 'off') {
      onSettingsChange({
        ...settings,
        interface: { ...settings.interface, outlineEnabled: false },
      });
    } else {
      onSettingsChange({
        ...settings,
        interface: {
          ...settings.interface,
          outlineDisplayMode: value as OutlineDisplayMode,
          outlineEnabled: true,
        },
      });
    }
  };

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

  const newButtonOptions: RadioSettingOption[] = [
    {
      value: 'top',
      label: t('settings.tabLayout.newButtonTop'),
      description: t('settings.tabLayout.newButtonTopDescription'),
    },
    {
      value: 'bottom',
      label: t('settings.tabLayout.newButtonBottom'),
      description: t('settings.tabLayout.newButtonBottomDescription'),
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
    {
      value: 'off',
      label: t('settings.interface.outlineDisplayModeOff'),
      description: t('settings.interface.outlineDisplayModeOffDescription'),
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

      {ui.tabLayout === 'vertical' && (
        <RadioSettingCard
          sx={{ mb: 3 }}
          title={t('settings.tabLayout.newButtonPosition')}
          titleVariant="subtitle1"
          titleGutterBottom
          description={t('settings.tabLayout.newButtonPositionDescription')}
          value={ui.tabNewButtonPosition}
          onChange={(value) => onSettingChange('interface', 'tabNewButtonPosition', value)}
          options={newButtonOptions}
        />
      )}

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
        value={outlineSelectedValue}
        onChange={handleOutlineChange}
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
