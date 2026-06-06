import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Tooltip,
  Typography,
} from '@mui/material';
import { FolderOpen, Refresh, Clear } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { desktopApi } from '../../api/desktopApi';
import { scanThemeFolder, type LoadedTheme } from '../../utils/marpThemeFolder';

interface MarpThemeFolderCardProps {
  /** Current folder path (rendering.marpThemeFolder). */
  folder: string;
  /** Persist a new folder path ('' clears it). */
  onChange: (folder: string) => void;
}

/**
 * Settings card for the custom Marp theme folder: pick a folder, then see which
 * `@theme` names were detected (so the user knows what to put in `theme:`).
 * Files without an `@theme` header are listed as ignored.
 */
const MarpThemeFolderCard: React.FC<MarpThemeFolderCardProps> = ({ folder, onChange }) => {
  const { t } = useTranslation();
  const [themes, setThemes] = useState<LoadedTheme[]>([]);
  const [scanning, setScanning] = useState(false);

  const rescan = useCallback(() => {
    if (!folder) {
      setThemes([]);
      return;
    }
    setScanning(true);
    scanThemeFolder(folder)
      .then(setThemes)
      .catch(() => setThemes([]))
      .finally(() => setScanning(false));
  }, [folder]);

  // Re-scan whenever the folder changes (and on mount).
  useEffect(() => { rescan(); }, [rescan]);

  const handleBrowse = useCallback(async () => {
    const selected = await desktopApi.openFolder();
    if (selected) onChange(selected);
  }, [onChange]);

  const named = themes.filter((th) => th.name !== null);
  const unnamed = themes.filter((th) => th.name === null);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {t('settings.advanced.marpThemeFolder', 'Marp Theme Folder')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t(
            'settings.advanced.marpThemeFolderDescription',
            'Register custom Marp themes from a folder of CSS files. Select one in a slide with the `theme:` directive.',
          )}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
          <Button variant="outlined" startIcon={<FolderOpen />} onClick={handleBrowse}>
            {t('settings.advanced.marpThemeFolderBrowse', 'Choose Folder…')}
          </Button>
          {folder && (
            <>
              <Tooltip title={t('settings.advanced.marpThemeFolderReload', 'Reload')}>
                <Button variant="text" startIcon={<Refresh />} onClick={rescan}>
                  {t('settings.advanced.marpThemeFolderReload', 'Reload')}
                </Button>
              </Tooltip>
              <Tooltip title={t('settings.advanced.marpThemeFolderClear', 'Clear')}>
                <Button variant="text" color="error" startIcon={<Clear />} onClick={() => onChange('')}>
                  {t('settings.advanced.marpThemeFolderClear', 'Clear')}
                </Button>
              </Tooltip>
            </>
          )}
        </Box>

        {folder ? (
          <>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1, fontFamily: 'monospace', wordBreak: 'break-all' }}
            >
              {folder}
            </Typography>

            {scanning ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  {t('settings.advanced.marpThemeFolderScanning', 'Scanning…')}
                </Typography>
              </Box>
            ) : named.length > 0 ? (
              <>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {t('settings.advanced.marpThemeFolderDetected', 'Detected themes')}:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {named.map((th) => (
                    <Chip key={th.file} label={th.name} size="small" />
                  ))}
                </Box>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('settings.advanced.marpThemeFolderEmpty', 'No themes with an @theme header were found.')}
              </Typography>
            )}

            {unnamed.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {t('settings.advanced.marpThemeFolderIgnored', 'Ignored (missing @theme header)')}: {unnamed.map((th) => th.file).join(', ')}
              </Typography>
            )}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t('settings.advanced.marpThemeFolderNone', 'No folder selected.')}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default MarpThemeFolderCard;
