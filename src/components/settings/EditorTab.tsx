import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { AppSettings } from '../../types/settings';
import { fontApi, type SystemFontFamily } from '../../api/fontApi';
import {
  FontFamilySettingCard,
  RadioSettingCard,
  SliderSettingCard,
  SwitchSettingCard,
  type SettingChangeHandler,
} from './SettingControls';
import { resolvePreviewDirection } from '../../utils/previewDirection';

const FONT_SIZE = { min: 10, max: 24, step: 1 } as const;
const TAB_SIZE = { min: 2, max: 8, step: 1 } as const;

interface EditorTabProps {
  settings: AppSettings;
  onSettingChange: SettingChangeHandler;
}

/** Editor settings: fonts (editor + preview), font size, line numbers, tab size, wrapping, minimap, formatting bar. */
const EditorTab: React.FC<EditorTabProps> = ({ settings, onSettingChange }) => {
  const { t } = useTranslation();
  const { editor } = settings;

  // Installed fonts for the two pickers; null renders them in loading state.
  const [fonts, setFonts] = useState<SystemFontFamily[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fontApi.listSystemFonts().then((list) => {
      if (!cancelled) setFonts(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>
        {t('settings.editor.title')}
      </Typography>

      <SliderSettingCard
        sx={{ mb: 3 }}
        description={t('settings.editor.fontSizeDescription')}
        label={`${t('settings.editor.fontSize')}: ${editor.fontSize}px`}
        value={editor.fontSize}
        min={FONT_SIZE.min}
        max={FONT_SIZE.max}
        step={FONT_SIZE.step}
        onChange={(value) => onSettingChange('editor', 'fontSize', value)}
      />

      <FontFamilySettingCard
        sx={{ mb: 3 }}
        label={t('settings.editor.fontFamily')}
        description={t('settings.editor.fontFamilyDescription')}
        value={editor.fontFamily}
        onChange={(value) => onSettingChange('editor', 'fontFamily', value)}
        fonts={fonts}
        defaultOptionLabel={t('settings.editor.fontFamilyDefault')}
        monospaceFilterLabel={t('settings.editor.fontFamilyMonospaceOnly')}
      />

      <FontFamilySettingCard
        sx={{ mb: 3 }}
        label={t('settings.editor.previewFontFamily')}
        description={t('settings.editor.previewFontFamilyDescription')}
        value={settings.preview?.fontFamily ?? ''}
        onChange={(value) => onSettingChange('preview', 'fontFamily', value)}
        fonts={fonts}
        defaultOptionLabel={t('settings.editor.fontFamilyDefault')}
      />

      <RadioSettingCard
        sx={{ mb: 3 }}
        title={t('settings.editor.previewDirection')}
        titleSx={{ mb: 2 }}
        description={t('settings.editor.previewDirectionDescription')}
        value={resolvePreviewDirection(settings.preview?.direction, settings.interface.language)}
        onChange={(value) => onSettingChange('preview', 'direction', value)}
        options={[
          { value: 'auto', label: t('preview.directionAuto') },
          { value: 'ltr', label: t('preview.directionLtr') },
          { value: 'rtl', label: t('preview.directionRtl') },
        ]}
      />

      <SwitchSettingCard
        sx={{ mb: 3 }}
        checked={editor.showLineNumbers}
        onChange={(checked) => onSettingChange('editor', 'showLineNumbers', checked)}
        label={t('settings.editor.showLineNumbers')}
        description={t('settings.editor.showLineNumbersDescription')}
      />

      <SliderSettingCard
        sx={{ mb: 3 }}
        description={t('settings.editor.tabSizeDescription')}
        label={`${t('settings.editor.tabSize')}: ${editor.tabSize}`}
        value={editor.tabSize}
        min={TAB_SIZE.min}
        max={TAB_SIZE.max}
        step={TAB_SIZE.step}
        onChange={(value) => onSettingChange('editor', 'tabSize', value)}
      />

      <SwitchSettingCard
        checked={editor.wordWrap}
        onChange={(checked) => onSettingChange('editor', 'wordWrap', checked)}
        label={t('settings.editor.wordWrap')}
        description={t('settings.editor.wordWrapDescription')}
      />

      <SwitchSettingCard
        sx={{ mb: 3 }}
        checked={editor.minimap}
        onChange={(checked) => onSettingChange('editor', 'minimap', checked)}
        label={t('settings.editor.minimap')}
        description={t('settings.editor.minimapDescription')}
      />

      <SwitchSettingCard
        sx={{ mb: 3 }}
        checked={editor.showFormattingBar}
        onChange={(checked) => onSettingChange('editor', 'showFormattingBar', checked)}
        label={t('settings.editor.showFormattingBar')}
        description={t('settings.editor.showFormattingBarDescription')}
      />
    </Box>
  );
};

export default EditorTab;
