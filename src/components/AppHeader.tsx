import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Menu, MenuItem, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { FolderOpen, Save, SaveAlt, MoreVert, ViewColumn, Edit, Visibility, Add, Settings as SettingsIcon2, HelpOutline, Schedule } from '@mui/icons-material';
import { RecentFile } from '../types/recentFiles';
import { storeApi } from '../api/storeApi';
import { Tab } from '../types/tab';
import { formatKeyboardShortcut } from '../utils/platform';

interface AppHeaderProps {
  // State
  viewMode: 'split' | 'editor' | 'preview';
  fileMenuAnchor: HTMLElement | null;
  activeTab: Tab | null;

  // Handlers
  onViewModeChange: (newViewMode: 'split' | 'editor' | 'preview') => void;
  onFileMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  onFileMenuClose: () => void;
  onNewTab: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onSaveFileAs: () => void;
  onSaveWithVariables: () => void;
  onSettingsOpen: () => void;
  onHelpOpen: () => void;
  onRecentFileSelect: (filePath: string) => void;

  // Translation
  t: (key: string, options?: Record<string, string | number>) => string;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  viewMode,
  fileMenuAnchor,
  activeTab,
  onViewModeChange,
  onFileMenuOpen,
  onFileMenuClose,
  onNewTab,
  onOpenFile,
  onSaveFile,
  onSaveFileAs,
  onSaveWithVariables,
  onSettingsOpen,
  onHelpOpen,
  onRecentFileSelect,
  t,
}) => {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  // Recent Filesを読み込み
  useEffect(() => {
    const loadRecentFiles = async () => {
      try {
        const files = await storeApi.loadRecentFiles();
        setRecentFiles(files.slice(0, 10)); // メニューには最大10件表示
      } catch (error) {
        console.error('Failed to load recent files:', error);
      }
    };

    if (fileMenuAnchor) {
      loadRecentFiles();
    }
  }, [fileMenuAnchor]);

  const handleRecentFileSelect = (filePath: string) => {
    onRecentFileSelect(filePath);
    onFileMenuClose();
  };
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {t('app.title')}
        </Typography>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newViewMode) => {
            if (newViewMode !== null) {
              onViewModeChange(newViewMode);
            }
          }}
          size="small"
          sx={{ mr: 1 }}
        >
          <ToggleButton value="split" aria-label={t('buttons.splitView')}>
            <ViewColumn />
          </ToggleButton>
          <ToggleButton value="editor" aria-label={t('buttons.editorOnly')}>
            <Edit />
          </ToggleButton>
          <ToggleButton value="preview" aria-label={t('buttons.previewOnly')}>
            <Visibility />
          </ToggleButton>
        </ToggleButtonGroup>

        <IconButton
          color="inherit"
          onClick={onFileMenuOpen}
        >
          <MoreVert />
        </IconButton>
      </Toolbar>

      {/* File Menu */}
      <Menu
        anchorEl={fileMenuAnchor}
        open={Boolean(fileMenuAnchor)}
        onClose={onFileMenuClose}
      >
        <MenuItem onClick={() => { onNewTab(); onFileMenuClose(); }}>
          <Add sx={{ mr: 1 }} />
          <span>{t('buttons.newFile')}</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.7 }}>
            {formatKeyboardShortcut('N')}
          </span>
        </MenuItem>

        <MenuItem onClick={() => { onOpenFile(); onFileMenuClose(); }}>
          <FolderOpen sx={{ mr: 1 }} />
          <span>{t('buttons.openFile')}</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.7 }}>
            {formatKeyboardShortcut('O')}
          </span>
        </MenuItem>

        {/* Recent Files サブメニュー */}
        {recentFiles.length > 0 && (
          <MenuItem disabled>
            <Schedule sx={{ mr: 1 }} />
            <span>{t('recentFiles.title')}</span>
          </MenuItem>
        )}
        {recentFiles.map((file) => (
          <MenuItem
            key={file.id}
            onClick={() => handleRecentFileSelect(file.filePath)}
            sx={{
              pl: 4,
              '& .MuiMenuItem-root': {
                fontSize: '0.875rem',
                lineHeight: 1.2,
              }
            }}
          >
            <span style={{ fontSize: '0.875rem', lineHeight: 1.2 }}>
              {file.fileName}
            </span>
          </MenuItem>
        ))}

        <MenuItem
          onClick={() => { onSaveFile(); onFileMenuClose(); }}
          disabled={!activeTab}
        >
          <Save sx={{ mr: 1 }} />
          <span>{t('buttons.save')}</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.7 }}>
            {formatKeyboardShortcut('S')}
          </span>
        </MenuItem>

        <MenuItem
          onClick={() => { onSaveFileAs(); onFileMenuClose(); }}
          disabled={!activeTab}
        >
          <SaveAlt sx={{ mr: 1 }} />
          <span>{t('buttons.saveAs')}</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.7 }}>
            {formatKeyboardShortcut('S', true)}
          </span>
        </MenuItem>

        <MenuItem
          onClick={() => { onSaveWithVariables(); onFileMenuClose(); }}
          disabled={!activeTab}
        >
          <SaveAlt sx={{ mr: 1 }} />
          <span>{t('buttons.saveWithVariables')}</span>
        </MenuItem>

        <MenuItem onClick={() => { onSettingsOpen(); onFileMenuClose(); }}>
          <SettingsIcon2 sx={{ mr: 1 }} />
          {t('buttons.settings')}
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.7 }}>
            {formatKeyboardShortcut(',')}
          </span>
        </MenuItem>

        <MenuItem onClick={() => { onHelpOpen(); onFileMenuClose(); }}>
          <HelpOutline sx={{ mr: 1 }} />
          {t('help.title')}
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.7 }}>
            F1
          </span>
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default AppHeader;