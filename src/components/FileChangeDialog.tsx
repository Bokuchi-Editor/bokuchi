import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { Warning, Refresh, Cancel } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface FileChangeDialogProps {
  open: boolean;
  fileName: string;
  onReload: () => void;
  onCancel: () => void;
}

const FileChangeDialog: React.FC<FileChangeDialogProps> = ({
  open,
  fileName,
  onReload,
  onCancel,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Warning color="warning" />
        <Typography variant="h6" component="div">
          {t('dialogs.fileChanged.title')}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('dialogs.fileChanged.message', { fileName })}
          </Alert>

          <Typography variant="body1" sx={{ mb: 1 }}>
            {t('dialogs.fileChanged.question')}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            {t('dialogs.fileChanged.reloadDescription')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('dialogs.fileChanged.keepDescription')}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={onCancel}
          variant="outlined"
          startIcon={<Cancel />}
          sx={{ minWidth: 100 }}
        >
          {t('dialogs.fileChanged.no')}
        </Button>
        <Button
          onClick={onReload}
          variant="contained"
          startIcon={<Refresh />}
          sx={{ minWidth: 100 }}
        >
          {t('dialogs.fileChanged.yes')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FileChangeDialog;
