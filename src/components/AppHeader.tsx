import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Menu, MenuItem, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { FolderOpen, Save, SaveAlt, MoreVert, ViewColumn, Edit, Visibility, Add, Settings as SettingsIcon2, HelpOutline } from '@mui/icons-material';
import { Tab } from '../types/tab';

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
  t,
}) => {
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
        </MenuItem>

        <MenuItem onClick={() => { onOpenFile(); onFileMenuClose(); }}>
          <FolderOpen sx={{ mr: 1 }} />
          <span>{t('buttons.openFile')}</span>
        </MenuItem>

        <MenuItem
          onClick={() => { onSaveFile(); onFileMenuClose(); }}
          disabled={!activeTab}
        >
          <Save sx={{ mr: 1 }} />
          <span>{t('buttons.save')}</span>
        </MenuItem>

        <MenuItem
          onClick={() => { onSaveFileAs(); onFileMenuClose(); }}
          disabled={!activeTab}
        >
          <SaveAlt sx={{ mr: 1 }} />
          <span>{t('buttons.saveAs')}</span>
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
        </MenuItem>

        <MenuItem onClick={() => { onHelpOpen(); onFileMenuClose(); }}>
          <HelpOutline sx={{ mr: 1 }} />
          {t('help.title')}
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default AppHeader;