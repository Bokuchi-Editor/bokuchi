import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Menu, MenuItem, ToggleButton, ToggleButtonGroup, SvgIcon } from '@mui/material';
import { FolderOpen, Save, SaveAlt, MoreVert, Add, Settings as SettingsIcon2, HelpOutline, Schedule, FormatListBulleted, AccountTree } from '@mui/icons-material';

const SplitViewIcon = () => (
  <SvgIcon viewBox="0 0 512 512">
    <path d="M413.4,18.64H98.6c-44.16,0-79.96,35.8-79.96,79.96v314.81c0,44.16,35.8,79.96,79.96,79.96h314.81c44.16,0,79.96-35.8,79.96-79.96V98.6c0-44.16-35.8-79.96-79.96-79.96ZM42.64,413.4V98.6c0-30.86,25.1-55.96,55.96-55.96h145.4v426.73H98.6c-30.86,0-55.96-25.1-55.96-55.96ZM469.36,413.4c0,30.86-25.1,55.96-55.96,55.96h-145.4V42.64h145.4c30.86,0,55.96,25.1,55.96,55.96v314.81Z" />
  </SvgIcon>
);

const EditViewIcon = () => (
  <SvgIcon viewBox="0 0 512 512">
    <rect x="110.55" y="167.42" width="318.13" height="156.26" transform="translate(-94.66 262.56) rotate(-45)" />
    <path d="M447.72,177.93l-110.49-110.49,44.13-44.13c10.34-10.34,27.12-10.34,37.46,0l73.03,73.03c10.34,10.34,10.34,27.12,0,37.46l-44.13,44.13Z" />
    <polygon points="36.56 478.6 90.95 313.72 201.44 424.21 36.56 478.6" />
  </SvgIcon>
);

const PreviewIcon = () => (
  <SvgIcon viewBox="0 0 512 512">
    <path d="M256,147.09c-29.09,0-56.44,11.33-77.01,31.9-20.57,20.57-31.9,47.92-31.9,77.01s11.33,56.44,31.9,77.01,47.92,31.9,77.01,31.9,56.44-11.33,77.01-31.9c20.57-20.57,31.9-47.92,31.9-77.01s-11.33-56.44-31.9-77.01c-20.57-20.57-47.92-31.9-77.01-31.9ZM238.31,198.56c-20.84,6.55-35.84,27.46-37.78,43.08-.75,6.07-5.93,10.52-11.89,10.52-.49,0-.99-.03-1.49-.09-6.58-.82-11.25-6.81-10.43-13.39,3.38-27.25,26.77-54.34,54.4-63.02,6.32-1.99,13.06,1.53,15.04,7.85,1.99,6.32-1.53,13.06-7.85,15.04Z" />
    <path d="M256,109.72C116.93,109.72,4.19,256,4.19,256c0,0,112.74,146.28,251.81,146.28s251.81-146.28,251.81-146.28c0,0-112.74-146.28-251.81-146.28ZM256,388.91c-73.4,0-132.91-59.51-132.91-132.91s59.51-132.91,132.91-132.91,132.91,59.51,132.91,132.91-59.51,132.91-132.91,132.91Z" />
  </SvgIcon>
);

import { RecentFile } from '../types/recentFiles';
import { storeApi } from '../api/storeApi';
import { Tab } from '../types/tab';
import { FolderTreeDisplayMode } from '../types/folderTree';
import { formatKeyboardShortcut } from '../utils/platform';
import { Tooltip } from '@mui/material';

interface AppHeaderProps {
  // State
  viewMode: 'split' | 'editor' | 'preview';
  fileMenuAnchor: HTMLElement | null;
  activeTab: Tab | null;
  outlinePanelOpen: boolean;
  folderTreePanelOpen: boolean;
  folderTreeDisplayMode: FolderTreeDisplayMode;

  // Handlers
  onViewModeChange: (newViewMode: 'split' | 'editor' | 'preview') => void;
  onFileMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  onFileMenuClose: () => void;
  onNewTab: () => void;
  onOpenFile: () => void;
  onOpenFolder: () => void;
  onSaveFile: () => void;
  onSaveFileAs: () => void;
  onSaveWithVariables: () => void;
  onSettingsOpen: () => void;
  onHelpOpen: () => void;
  onRecentFileSelect: (filePath: string) => void;
  onOutlineToggle: () => void;
  onFolderTreeToggle: () => void;

  // Translation
  t: (key: string, options?: Record<string, string | number>) => string;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  viewMode,
  fileMenuAnchor,
  activeTab,
  outlinePanelOpen,
  folderTreePanelOpen,
  folderTreeDisplayMode,
  onViewModeChange,
  onFileMenuOpen,
  onFileMenuClose,
  onNewTab,
  onOpenFile,
  onOpenFolder,
  onSaveFile,
  onSaveFileAs,
  onSaveWithVariables,
  onSettingsOpen,
  onHelpOpen,
  onRecentFileSelect,
  onOutlineToggle,
  onFolderTreeToggle,
  t,
}) => {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  // Load recent files
  useEffect(() => {
    const loadRecentFiles = async () => {
      try {
        const files = await storeApi.loadRecentFiles();
        setRecentFiles(files.slice(0, 10)); // Show max 10 items in menu
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
          sx={{
            mr: 1,
            '& .MuiToggleButton-root': {
              color: 'inherit',
              opacity: 0.5,
              '&.Mui-selected': {
                opacity: 1,
                color: 'inherit',
              },
            },
          }}
        >
          <ToggleButton value="split" aria-label={t('buttons.splitView')}>
            <SplitViewIcon />
          </ToggleButton>
          <ToggleButton value="editor" aria-label={t('buttons.editorOnly')}>
            <EditViewIcon />
          </ToggleButton>
          <ToggleButton value="preview" aria-label={t('buttons.previewOnly')}>
            <PreviewIcon />
          </ToggleButton>
        </ToggleButtonGroup>

        <Tooltip title={folderTreeDisplayMode === 'off' ? t('folderTree.openFolder') : t('folderTree.toggleExplorer')}>
          <IconButton
            color="inherit"
            onClick={folderTreeDisplayMode === 'off' ? onOpenFolder : onFolderTreeToggle}
            sx={{
              mr: 0.5,
              opacity: folderTreeDisplayMode === 'off' ? 0.5 : folderTreePanelOpen ? 1 : 0.5,
            }}
          >
            <AccountTree />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('outline.toggleOutline')}>
          <IconButton
            color="inherit"
            onClick={onOutlineToggle}
            sx={{
              mr: 0.5,
              opacity: outlinePanelOpen ? 1 : 0.5,
            }}
          >
            <FormatListBulleted />
          </IconButton>
        </Tooltip>

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

        <MenuItem onClick={() => { onOpenFolder(); onFileMenuClose(); }}>
          <AccountTree sx={{ mr: 1 }} />
          <span>{t('folderTree.openFolder')}</span>
        </MenuItem>

        {/* Recent files submenu */}
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