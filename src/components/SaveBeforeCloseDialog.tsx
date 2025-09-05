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
          変更を保存しますか？
        </Typography>
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          <Box component="span" sx={{ fontWeight: 'bold' }}>
            {fileName}
          </Box>
          に変更が加えられています。変更を保存しますか？
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={onCancel}
          startIcon={<Cancel />}
          variant="outlined"
          color="inherit"
        >
          キャンセル
        </Button>
        <Button
          onClick={onDontSave}
          startIcon={<Close />}
          variant="outlined"
          color="warning"
        >
          保存しない
        </Button>
        <Button
          onClick={onSave}
          startIcon={<Save />}
          variant="contained"
          color="primary"
          autoFocus
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveBeforeCloseDialog;
