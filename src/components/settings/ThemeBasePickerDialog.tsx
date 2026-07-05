import React from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ThemePaletteStrip, ThemeGalleryEntry } from './ThemeCard';

interface ThemeBasePickerDialogProps {
  open: boolean;
  entries: ThemeGalleryEntry[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

/**
 * "New theme" flow: pick which existing theme (preset or custom) the new
 * custom theme starts from. Every row shows the palette strip so the choice
 * is visual, not name-based.
 */
const ThemeBasePickerDialog: React.FC<ThemeBasePickerDialogProps> = ({
  open,
  entries,
  onSelect,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('settings.appearance.basePickerTitle')}</DialogTitle>
      <DialogContent dividers sx={{ p: 1 }}>
        <List disablePadding>
          {entries.map((entry) => (
            <ListItemButton
              key={entry.id}
              onClick={() => onSelect(entry.id)}
              data-testid={`base-picker-${entry.id}`}
              sx={{ display: 'block', borderRadius: 1, mb: 0.5 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                  {entry.label}
                </Typography>
                <Chip
                  label={
                    entry.mode === 'dark'
                      ? t('settings.appearance.editorModeDark')
                      : t('settings.appearance.editorModeLight')
                  }
                  size="small"
                  variant="outlined"
                  sx={{ height: 18, fontSize: '10px' }}
                />
              </Box>
              <ThemePaletteStrip colors={entry.colors} height={10} />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('buttons.cancel')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ThemeBasePickerDialog;
