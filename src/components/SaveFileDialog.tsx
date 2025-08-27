import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
} from '@mui/material';

interface SaveFileDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (fileName: string, extension: string) => void;
  defaultFileName?: string;
}

const SaveFileDialog: React.FC<SaveFileDialogProps> = ({
  open,
  onClose,
  onSave,
  defaultFileName = 'untitled',
}) => {
  const [fileName, setFileName] = useState(defaultFileName);
  const [extension, setExtension] = useState('.md');

  const handleSave = () => {
    if (fileName.trim()) {
      const fullFileName = fileName.endsWith(extension) ? fileName : `${fileName}${extension}`;
      onSave(fullFileName, extension);
      onClose();
    }
  };

  const handleClose = () => {
    setFileName(defaultFileName);
    setExtension('.md');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Save File As</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            The file will be downloaded to your browser's default download folder.
          </Typography>
        </Alert>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', mt: 1 }}>
          <TextField
            label="File Name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            fullWidth
            autoFocus
            placeholder="Enter file name"
          />
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Extension</InputLabel>
            <Select
              value={extension}
              label="Extension"
              onChange={(e) => setExtension(e.target.value)}
            >
              <MenuItem value=".md">.md</MenuItem>
              <MenuItem value=".txt">.txt</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!fileName.trim()}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveFileDialog;
