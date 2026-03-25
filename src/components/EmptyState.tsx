import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { NoteAdd, FolderOpen, InsertDriveFileOutlined } from '@mui/icons-material';
import { RecentFile } from '../types/recentFiles';
import { storeApi } from '../api/storeApi';
import { formatKeyboardShortcut } from '../utils/platform';

interface EmptyStateProps {
  onNewTab: () => void;
  onOpenFile: () => void;
  onRecentFileSelect: (filePath: string) => void;
  t: (key: string, options?: Record<string, string | number>) => string;
}

const MAX_RECENT_FILES = 5;

const EmptyState: React.FC<EmptyStateProps> = ({
  onNewTab,
  onOpenFile,
  onRecentFileSelect,
  t,
}) => {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  useEffect(() => {
    const loadRecentFiles = async () => {
      try {
        const files = await storeApi.loadRecentFiles();
        setRecentFiles(files.slice(0, MAX_RECENT_FILES));
      } catch (error) {
        console.error('Failed to load recent files:', error);
      }
    };
    loadRecentFiles();
  }, []);

  const extractDir = (filePath: string): string => {
    const separator = filePath.includes('\\') ? '\\' : '/';
    const parts = filePath.split(separator);
    parts.pop();
    return parts.join(separator);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        gap: 3,
        px: 4,
        userSelect: 'none',
      }}
    >
      <Box
        component="img"
        src="/bokuchi-icon.png"
        alt="Bokuchi"
        sx={{ width: 72, height: 72 }}
      />

      {recentFiles.length > 0 && (
        <Box sx={{ width: '100%', maxWidth: 380 }}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 0.5, textAlign: 'center' }}
          >
            {t('emptyState.recentFiles')}
          </Typography>
          <List dense disablePadding>
            {recentFiles.map((file) => (
              <ListItemButton
                key={file.id}
                onClick={() => onRecentFileSelect(file.filePath)}
                sx={{
                  borderRadius: 1,
                  py: 0.5,
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <InsertDriveFileOutlined fontSize="small" color="action" />
                </ListItemIcon>
                <ListItemText
                  primary={file.fileName}
                  secondary={extractDir(file.filePath)}
                  primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                  secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="text"
          size="small"
          startIcon={<NoteAdd />}
          onClick={onNewTab}
          sx={{
            color: 'text.primary',
            bgcolor: 'action.hover',
            '&:hover': { bgcolor: 'action.selected' },
          }}
        >
          {t('emptyState.newFile')}
          <Typography
            component="span"
            variant="caption"
            color="text.secondary"
            sx={{ ml: 1 }}
          >
            {formatKeyboardShortcut('N')}
          </Typography>
        </Button>
        <Button
          variant="text"
          size="small"
          startIcon={<FolderOpen />}
          onClick={onOpenFile}
          sx={{
            color: 'text.primary',
            bgcolor: 'action.hover',
            '&:hover': { bgcolor: 'action.selected' },
          }}
        >
          {t('emptyState.openFile')}
          <Typography
            component="span"
            variant="caption"
            color="text.secondary"
            sx={{ ml: 1 }}
          >
            {formatKeyboardShortcut('O')}
          </Typography>
        </Button>
      </Box>
    </Box>
  );
};

export default EmptyState;
