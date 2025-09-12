import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  Divider,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface TableConversionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  markdownTable: string;
}

export const TableConversionDialog: React.FC<TableConversionDialogProps> = ({
  open,
  onClose,
  onConfirm,
  onCancel,
  markdownTable,
}) => {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.default',
        },
      }}
    >
      <DialogTitle>
        {t('tableConversion.dialogTitle')}
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {t('tableConversion.dialogMessage')}
        </Typography>

        <Typography variant="h6" sx={{ mb: 1 }}>
          {t('tableConversion.previewTitle')}
        </Typography>

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            bgcolor: 'background.paper',
            maxHeight: 300,
            overflow: 'auto',
          }}
        >
          <Box
            component="pre"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {markdownTable}
          </Box>
        </Paper>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" color="text.secondary">
          {t('tableConversion.dialogNote')}
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCancel}>
          {t('tableConversion.cancel')}
        </Button>
        <Button onClick={handleConfirm} variant="contained">
          {t('tableConversion.convert')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
