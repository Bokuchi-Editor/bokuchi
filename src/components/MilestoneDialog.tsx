import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { milestoneContent } from '../milestone';

interface MilestoneDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Celebratory, one-time thank-you dialog for a milestone release.
 * Intentionally distinct from WhatsNewDialog (which is a change list) so the
 * gratitude message reads as its own moment rather than a changelog.
 */
const MilestoneDialog: React.FC<MilestoneDialogProps> = ({ open, onClose }) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogContent sx={{ pt: 4, pb: 3, px: 4, textAlign: 'center' }}>
        <Typography
          component="div"
          aria-hidden
          sx={{ fontSize: 56, lineHeight: 1, mb: 1 }}
        >
          🎉
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Chip
            label={`Bokuchi ${milestoneContent.versionLabel}`}
            color="primary"
            variant="outlined"
          />
        </Box>

        <Typography variant="h6" component="h2" sx={{ mb: 2.5 }}>
          {t(milestoneContent.titleKey)}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {milestoneContent.bodyKeys.map((key) => (
            <Typography
              key={key}
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.8 }}
            >
              {t(key)}
            </Typography>
          ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
        <Button onClick={onClose} variant="contained" sx={{ minWidth: 160 }}>
          {t('milestone.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MilestoneDialog;
