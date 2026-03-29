import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface RenameDialogProps {
  open: boolean;
  currentName: string;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}

const RenameDialog: React.FC<RenameDialogProps> = ({
  open,
  currentName,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [newName, setNewName] = useState(currentName);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setNewName(currentName);
      setError('');
    }
  }, [open, currentName]);

  const validate = useCallback((name: string): string => {
    if (!name.trim()) return t('folderTree.renameErrorEmpty');
    if (name.includes('/') || name.includes('\\')) return t('folderTree.renameErrorInvalidChar');
    return '';
  }, [t]);

  const handleConfirm = () => {
    const validationError = validate(newName);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (newName !== currentName) {
      onConfirm(newName);
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{t('folderTree.renameTitle')}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            setError('');
          }}
          onKeyDown={handleKeyDown}
          error={!!error}
          helperText={error}
          size="small"
          sx={{ mt: 1 }}
          onFocus={(e) => {
            // Select filename without extension
            const dotIndex = e.target.value.lastIndexOf('.');
            if (dotIndex > 0) {
              e.target.setSelectionRange(0, dotIndex);
            } else {
              e.target.select();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{t('buttons.cancel')}</Button>
        <Button onClick={handleConfirm} variant="contained">{t('folderTree.renameConfirm')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default RenameDialog;
