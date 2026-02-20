import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  InputAdornment,
  Typography,
  Box,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Search,
  FileOpen,
  Delete,
  ContentCopy,
  Schedule,
} from '@mui/icons-material';
import { RecentFile } from '../types/recentFiles';
import { storeApi } from '../api/storeApi';
import { desktopApi } from '../api/desktopApi';

interface RecentFilesDialogProps {
  open: boolean;
  onClose: () => void;
  onFileSelect: (filePath: string) => void;
  t: (key: string, options?: Record<string, string | number>) => string;
}

const RecentFilesDialog: React.FC<RecentFilesDialogProps> = ({
  open,
  onClose,
  onFileSelect,
  t,
}) => {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<RecentFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedFile, setSelectedFile] = useState<RecentFile | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Load recent files when dialog opens
  useEffect(() => {
    if (open) {
      loadRecentFiles();
    }
  }, [open]);

  // Filter files based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFiles(recentFiles);
    } else {
      const filtered = recentFiles.filter(file =>
        file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.filePath.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFiles(filtered);
    }
  }, [recentFiles, searchQuery]);

  const loadRecentFiles = async () => {
    try {
      const files = await storeApi.loadRecentFiles();
      setRecentFiles(files);
    } catch (error) {
      console.error('Failed to load recent files:', error);
      setSnackbar({
        open: true,
        message: t('recentFiles.loadFailed'),
        severity: 'error'
      });
    }
  };

  const handleFileSelect = async (file: RecentFile) => {
    try {
      // Check if file exists
      const result = await desktopApi.readFileByPath(file.filePath);
      if (result.error) {
        setSnackbar({
          open: true,
          message: t('recentFiles.fileNotFound'),
          severity: 'error'
        });
        // Remove non-existent files from recent files
        await storeApi.removeRecentFile(file.filePath);
        await loadRecentFiles();
        return;
      }

      onFileSelect(file.filePath);
      onClose();
    } catch (error) {
      console.error('Failed to open file:', error);
      setSnackbar({
        open: true,
        message: t('recentFiles.loadFailed'),
        severity: 'error'
      });
    }
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLElement>, file: RecentFile) => {
    event.preventDefault();
    setAnchorEl(event.currentTarget);
    setSelectedFile(file);
  };

  const handleContextMenuClose = () => {
    setAnchorEl(null);
    setSelectedFile(null);
  };

  const handleCopyPath = async () => {
    if (selectedFile) {
      try {
        await navigator.clipboard.writeText(selectedFile.filePath);
        setSnackbar({
          open: true,
          message: t('recentFiles.pathCopied'),
          severity: 'success'
        });
      } catch (error) {
        console.error('Failed to copy path:', error);
        setSnackbar({
          open: true,
          message: t('recentFiles.copyFailed'),
          severity: 'error'
        });
      }
    }
    handleContextMenuClose();
  };

  const handleRemoveFromRecent = async () => {
    if (selectedFile) {
      try {
        await storeApi.removeRecentFile(selectedFile.filePath);
        await loadRecentFiles();
        setSnackbar({
          open: true,
          message: t('recentFiles.removedFromRecent'),
          severity: 'success'
        });
      } catch (error) {
        console.error('Failed to remove from recent files:', error);
        setSnackbar({
          open: true,
          message: t('recentFiles.removeFailed'),
          severity: 'error'
        });
      }
    }
    handleContextMenuClose();
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'a few minutes ago';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hour${Math.floor(diffInHours) === 1 ? '' : 's'} ago`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)} day${Math.floor(diffInHours / 24) === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString('en-US');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: '70vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Schedule />
            <Typography variant="h6">{t('recentFiles.dialogTitle')}</Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <TextField
            fullWidth
            placeholder={t('recentFiles.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          {filteredFiles.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                {searchQuery ? t('recentFiles.noResults') : t('recentFiles.noFiles')}
              </Typography>
            </Box>
          ) : (
            <List>
              {filteredFiles.map((file) => (
                <ListItem
                  key={file.id}
                  onClick={() => handleFileSelect(file)}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" noWrap>
                          {file.fileName}
                        </Typography>
                        {file.openCount > 1 && (
                          <Chip
                            label={file.openCount}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {file.filePath}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(file.lastOpened)}
                          </Typography>
                          {file.fileSize && (
                            <>
                              <Typography variant="caption" color="text.secondary">
                                •
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatFileSize(file.fileSize)}
                              </Typography>
                            </>
                          )}
                        </Box>
                        {file.preview && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {file.preview}...
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Open file">
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileSelect(file);
                        }}
                      >
                        <FileOpen />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>
            {t('buttons.cancel')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleContextMenuClose}
      >
        <MenuItem onClick={handleCopyPath}>
          <ContentCopy sx={{ mr: 1 }} />
          {t('recentFiles.copyPath')}
        </MenuItem>
        <MenuItem onClick={handleRemoveFromRecent}>
          <Delete sx={{ mr: 1 }} />
          {t('recentFiles.removeFromRecent')}
        </MenuItem>
      </Menu>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default RecentFilesDialog;
