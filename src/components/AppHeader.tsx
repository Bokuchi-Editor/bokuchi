import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Menu, MenuItem, ToggleButton, ToggleButtonGroup, SvgIcon } from '@mui/material';
import { FolderOpen, Save, SaveAlt, MoreVert, Add, Settings as SettingsIcon2, HelpOutline, Schedule, FormatListBulleted, AccountTree } from '@mui/icons-material';

const SplitViewIcon = () => (
  <SvgIcon viewBox="0 0 512 512">
    <path fill="currentColor" d="M415.19,18.64H96.81c-43.17,0-78.18,35-78.18,78.18v318.38c0,43.17,35,78.18,78.18,78.18h318.38c43.17,0,78.18-35,78.18-78.18V96.81c0-43.17-35-78.18-78.18-78.18ZM58.64,415.19V96.81c0-21.05,17.13-38.18,38.18-38.18h139.19v394.73H96.81c-21.05,0-38.18-17.13-38.18-38.18ZM453.36,415.19c0,21.05-17.13,38.18-38.18,38.18h-139.19V58.64h139.19c21.05,0,38.18,17.13,38.18,38.18v318.38Z" />
  </SvgIcon>
);

const EditViewIcon = () => (
  <SvgIcon viewBox="0 0 512 512">
    <rect fill="currentColor" x="135.25" y="167.42" width="268.72" height="156.26" transform="translate(-94.66 262.56) rotate(-45)" />
    <path fill="currentColor" d="M447.72,177.93l-110.49-110.49,44.13-44.13c10.34-10.34,27.12-10.34,37.46,0l73.03,73.03c10.34,10.34,10.34,27.12,0,37.46l-44.13,44.13Z" />
    <polygon fill="currentColor" points="36.56 478.6 90.95 313.72 201.44 424.21 36.56 478.6" />
  </SvgIcon>
);

const PreviewIcon = () => (
  <SvgIcon viewBox="0 0 512 512">
    <path fill="currentColor" d="M256,157.68c-26.26,0-50.95,10.23-69.52,28.8-18.57,18.57-28.8,43.26-28.8,69.52s10.23,50.95,28.8,69.52c18.57,18.57,43.26,28.8,69.52,28.8s50.95-10.23,69.52-28.8c18.57-18.57,28.8-43.26,28.8-69.52s-10.23-50.95-28.8-69.52c-18.57-18.57-43.26-28.8-69.52-28.8ZM240.03,204.14c-18.82,5.91-32.35,24.79-34.1,38.89-.68,5.48-5.35,9.5-10.74,9.5-.45,0-.9-.03-1.35-.08-5.94-.74-10.15-6.15-9.42-12.09,3.05-24.6,24.17-49.05,49.11-56.89,5.71-1.79,11.79,1.38,13.58,7.09,1.79,5.71-1.38,11.79-7.09,13.58Z" />
    <path fill="currentColor" d="M256,109.72C116.93,109.72,4.19,256,4.19,256c0,0,112.74,146.28,251.81,146.28s251.81-146.28,251.81-146.28c0,0-112.74-146.28-251.81-146.28ZM256,388.91c-73.4,0-132.91-59.51-132.91-132.91s59.51-132.91,132.91-132.91,132.91,59.51,132.91,132.91-59.51,132.91-132.91,132.91Z" />
  </SvgIcon>
);

// 臨 (Rin) focus mode icon. Calligraphy glyph filled via currentColor.
const RinIcon = () => (
  <SvgIcon viewBox="0 0 512 512">
    <path fill="currentColor" d="M46.9,466.47c-7.61-10.94-12.85-23.79-15.22-37.59-2.38-13.8-3.33-28.55-3.33-43.29l3.33-11.89c-1.9-14.27-3.81-28.07-5.23-41.87,3.33-33.3,4.76-67.08,3.81-99.91l-1.43-4.76,3.33-35.68-1.9-4.76c1.43-18.55,7.14-34.26,17.13-47.1,3.33-4.76,8.09-6.66,13.8-5.71l6.19,22.84-4.28,24.74-1.9,16.65,23.79-10.94c8.09-10.94,15.7-22.36,21.89-33.78,6.66-11.89,12.85-23.31,18.56-34.73l-27.12-15.7-11.89-16.18.95-4.28-1.9-13.32c20.46-9.99,42.82-15.7,68.04-16.65l7.61,1.43,4.76-1.43c13.8.95,26.17,6.18,37.59,15.7,8.56,15.7,13.8,32.83,15.22,51.86l-4.76,5.23-30.93,29.02v5.23l11.42,19.98,9.52,5.23,3.81,20.46c-6.19,20.93-17.6,39.96-33.3,57.09l1.43,11.89c-4.76,2.85-6.66,6.66-5.71,12.85,8.09,5.71,12.37,12.85,12.37,22.36l-8.56,22.84c-9.52,12.37-16.65,26.17-20.46,40.92l2.85,14.27-11.42,23.31c-9.04,2.38-17.6,6.18-25.22,10.47l-11.89,11.89c-9.52,1.9-18.56,5.23-26.17,10.94l-6.19,19.98-8.56.95-19.98,1.43ZM68.78,397.96c9.52-6.19,19.03-11.89,29.5-17.13,7.14-7.61,11.89-17.13,15.22-28.07-9.04-2.85-16.65-8.09-22.36-15.7h-11.89l-16.18,1.9c-5.71-7.61-8.09-17.13-7.14-28.07l4.76-5.71,9.99-4.28c19.98-4.28,37.11-14.75,51.38-30.45l9.99-9.04c12.37-18.55,22.84-38.06,31.88-58.04l-7.61-9.52h-19.03c-11.42,3.33-22.84,7.61-33.78,13.8l-6.18,7.14-7.14,3.81-9.99,11.42c-8.56,6.19-16.65,10.47-25.22,13.8-8.09,51.38-9.04,102.77-2.85,154.62h9.52l11.42-5.71-4.28,5.23ZM185.82,490.25l-12.37-9.99c1.9-30.45,1.9-61.37.48-91.82,2.38-18.08,7.14-35.68,13.8-52.81l9.04-8.09v-8.56l6.19,3.81,5.71.95,2.85,7.61,6.18,1.9c17.6-17.13,39.49-26.17,65.66-26.17,10.94.95,21.41,3.81,30.45,8.56l1.43-10.47-1.43-4.28,1.43-4.28-6.19-1.9-14.75,4.76c-16.65-1.9-30.92-9.04-43.77-20.93-4.76-8.09-7.14-16.65-8.09-25.22,3.33-17.13,9.04-33.78,16.18-50.43,6.66-16.18,14.75-31.88,23.79-47.1h-6.19l-21.41,12.37-8.09-7.61-3.81-2.85c-4.76-9.99-6.18-20.93-4.28-33.3,6.66-13.8,15.7-26.17,26.64-38.06,11.42-11.42,19.98-24.74,27.12-38.54l-9.99-9.52v-6.66c12.85-8.09,27.12-10.94,42.82-9.52l25.22,9.04,4.76-.95,9.04,5.71v20.93l-28.55,33.78,44.72-16.18,7.61-6.19,4.76,1.9,2.38-6.66,8.09,9.52,14.75,1.43,20.93,7.14c2.86,7.14,3.81,14.75,2.86,22.36l-10.47,9.99c-23.79,9.99-47.58,19.51-71.37,27.59-24.26,8.56-46.15,22.36-65.66,41.87l-1.43,4.76,2.85,16.18-16.18,20.46-3.33,16.18,6.66,9.52,17.6,4.76,9.99-12.37,4.76-1.9,35.68-38.54-4.76-4.28-24.74,4.28-15.22-4.28v-5.23c10.47-13.32,22.84-22.84,38.06-28.07l30.92-2.85,30.93,7.61,5.71,7.61,4.76,3.33c4.28,7.61,6.66,16.18,6.66,24.74l-4.76,8.09-13.32,8.09-9.99,9.99c-6.18.95-10.94,3.33-14.27,6.66l-1.9,7.14,8.56,14.75-11.42,11.89c-10.94.95-20.46,3.33-29.5,7.14,6.18,6.66,8.56,13.32,6.66,19.98l-3.33,13.32,4.28,1.9c13.8-7.61,28.55-13.8,42.82-18.55,14.27-5.23,30.45-7.14,48.05-5.23l15.22,4.28,5.71-1.43c13.32,20.46,19.51,43.29,19.51,68.03-4.28,14.27-11.89,26.17-21.89,36.63l-8.56,8.09-11.89,8.09-1.43,4.28,30.92,8.56c4.28,8.56,5.71,17.6,4.76,28.55-7.61,8.09-16.65,10.94-27.59,8.09l-35.21-.95-13.8.95c-10.47-3.81-20.93-8.56-31.88-14.75-5.71-5.23-8.56-11.42-8.56-19.51l11.42-19.51,34.26-32.35c5.23,0,9.51-2.85,12.37-8.09l12.37-11.42c2.85-11.42,5.23-22.36,7.14-33.78-3.81-5.71-9.52-8.56-16.65-8.09-15.22,10.94-31.88,17.13-50.43,17.6l-6.19-.95-4.28.95-6.19-2.86v7.14l1.9,4.28c-3.33,25.22-5.23,50.91-5.71,76.6,4.28,13.8,8.56,27.12,12.37,40.92,0,7.61-1.9,13.8-5.71,18.08l-13.32-4.76-4.76-7.14-9.52-4.76c-4.76-15.22-6.66-30.45-7.14-46.15-.48-16.18-.48-32.35-.48-49.48l1.43-15.22c-6.66,11.89-15.22,22.36-24.74,30.92l-9.52,4.76-5.23,13.32c7.61,2.86,15.7,6.66,23.79,11.42l6.18,23.79c-19.51,11.42-40.92,18.08-64.23,19.98l-17.6-6.18c-3.81-9.04-5.71-18.56-5.71-29.5,8.56-11.89,16.65-24.26,24.26-37.11,8.09-12.37,14.27-25.22,19.98-39.49l6.66-16.18h-5.23c-6.19,5.71-12.85,9.04-20.46,9.51-8.56,0-17.13-1.9-24.74-5.23-2.38,16.18-5.71,31.4-9.52,45.67l1.43,4.28-1.43,19.98c3.33,21.41,7.61,42.34,12.37,62.8l-4.28,7.61-9.04,1.9-30.45,17.6Z" />
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
  // Whether the outline is currently showing (drives the button's lit/dimmed state).
  outlineActive: boolean;
  folderTreePanelOpen: boolean;
  folderTreeDisplayMode: FolderTreeDisplayMode;
  rinActive: boolean;

  // Handlers
  onViewModeChange: (newViewMode: 'split' | 'editor' | 'preview') => void;
  onRinToggle: () => void;
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
  outlineActive,
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
  rinActive,
  onRinToggle,
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

        <Tooltip title={t('rin.tooltip')}>
          <IconButton
            color="inherit"
            onClick={onRinToggle}
            aria-label={t('rin.label')}
            sx={{ mr: 0.5, opacity: rinActive ? 1 : 0.5 }}
          >
            <RinIcon />
          </IconButton>
        </Tooltip>

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
              opacity: outlineActive ? 1 : 0.5,
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