import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';
import { Save, Close, Cancel } from '@mui/icons-material';
import { Trans, useTranslation } from 'react-i18next';

interface SaveBeforeCloseDialogProps {
  open: boolean;
  fileName: string;
  onSave: () => void;
  onDontSave: () => void;
  onCancel: () => void;
}

const SaveBeforeCloseDialog: React.FC<SaveBeforeCloseDialogProps> = ({
  open,
  fileName,
  onSave,
  onDontSave,
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
      <DialogTitle>
        <Typography variant="h6" component="div">
          {t('dialogs.saveChanges')}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          <Trans
            i18nKey="dialogs.saveChangesMessage"
            values={{ fileName }}
            components={{ bold: <Box component="span" sx={{ fontWeight: 'bold' }} /> }}
          />
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={onCancel}
          startIcon={<Cancel />}
          variant="outlined"
          color="inherit"
        >
          {t('buttons.cancel')}
        </Button>
        <Button
          onClick={onDontSave}
          startIcon={<Close />}
          variant="outlined"
          color="warning"
        >
          {t('buttons.dontSave')}
        </Button>
        <Button
          onClick={onSave}
          startIcon={<Save />}
          variant="contained"
          color="primary"
          autoFocus
        >
          {t('buttons.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveBeforeCloseDialog;
