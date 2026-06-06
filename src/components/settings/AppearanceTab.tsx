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
import { getVisibleThemes } from '../../themes';
import type { AppSettings } from '../../types/settings';
import type { SettingChangeHandler } from './SettingControls';

interface AppearanceTabProps {
  settings: AppSettings;
  onSettingChange: SettingChangeHandler;
  as400Unlocked?: boolean;
}

/** Appearance settings: theme selection. */
const AppearanceTab: React.FC<AppearanceTabProps> = ({
  settings,
  onSettingChange,
  as400Unlocked,
}) => {
  const { t } = useTranslation();
  const visibleThemes = getVisibleThemes(as400Unlocked ? ['as400'] : []);

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>
        {t('settings.appearance.title')}
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('settings.appearance.themeDescription')}
          </Typography>
          <FormControl fullWidth>
            <InputLabel id="theme-select-label">{t('settings.appearance.theme')}</InputLabel>
            <Select
              labelId="theme-select-label"
              value={settings.appearance.theme}
              label={t('settings.appearance.theme')}
              onChange={(e) => onSettingChange('appearance', 'theme', e.target.value)}
            >
              {visibleThemes.map((themeOption) => (
                <MenuItem key={themeOption.name} value={themeOption.name}>
                  {t(`settings.appearance.themes.${themeOption.name}`, themeOption.displayName)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AppearanceTab;
