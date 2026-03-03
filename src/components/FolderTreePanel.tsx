import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Close,
  Refresh,
  Folder,
  FolderOpen,
  FolderOff,
  InsertDriveFile,
  ExpandMore,
  ChevronRight,
  CreateNewFolder,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { FolderTreeNode } from '../types/folderTree';

interface FolderTreePanelProps {
  rootFolderName: string | null;
  tree: FolderTreeNode[];
  isLoading: boolean;
  activeFilePath?: string;
  onFileClick: (filePath: string) => void;
  onToggleExpand: (nodePath: string) => void;
  onOpenFolder: () => void;
  onCloseFolder: () => void;
  onRefresh: () => void;
  onClose?: () => void;
  onHeaderClick?: () => void;
  collapsed?: boolean;
  width?: number;
}

interface TreeNodeProps {
  node: FolderTreeNode;
  depth: number;
  activeFilePath?: string;
  onFileClick: (filePath: string) => void;
  onToggleExpand: (nodePath: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  depth,
  activeFilePath,
  onFileClick,
  onToggleExpand,
}) => {
  const isActive = !node.isDirectory && activeFilePath && node.path === activeFilePath;

  const handleClick = () => {
    if (node.isDirectory) {
      onToggleExpand(node.path);
    } else {
      onFileClick(node.path);
    }
  };

  return (
    <>
      <ListItemButton
        onClick={handleClick}
        selected={!!isActive}
        sx={{
          pl: 1 + depth * 2,
          py: 0.25,
          minHeight: 28,
        }}
      >
        {node.isDirectory && (
          <ListItemIcon sx={{ minWidth: 20 }}>
            {node.isLoading ? (
              <CircularProgress size={14} />
            ) : node.isExpanded ? (
              <ExpandMore sx={{ fontSize: 16 }} />
            ) : (
              <ChevronRight sx={{ fontSize: 16 }} />
            )}
          </ListItemIcon>
        )}
        <ListItemIcon sx={{ minWidth: 24 }}>
          {node.isDirectory ? (
            node.isExpanded ? (
              <FolderOpen sx={{ fontSize: 18 }} color="primary" />
            ) : (
              <Folder sx={{ fontSize: 18 }} color="action" />
            )
          ) : (
            <InsertDriveFile sx={{ fontSize: 18 }} color="action" />
          )}
        </ListItemIcon>
        <ListItemText
          primary={node.name}
          primaryTypographyProps={{
            variant: 'body2',
            noWrap: true,
            sx: {
              fontSize: '0.8rem',
              fontWeight: isActive ? 600 : 400,
            },
          }}
        />
      </ListItemButton>
      {node.isDirectory && node.isExpanded && node.children && (
        <Collapse in={node.isExpanded} timeout="auto" unmountOnExit>
          <List dense disablePadding>
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                activeFilePath={activeFilePath}
                onFileClick={onFileClick}
                onToggleExpand={onToggleExpand}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
};

const FolderTreePanel: React.FC<FolderTreePanelProps> = ({
  rootFolderName,
  tree,
  isLoading,
  activeFilePath,
  onFileClick,
  onToggleExpand,
  onOpenFolder,
  onCloseFolder,
  onRefresh,
  onClose,
  onHeaderClick,
  collapsed = false,
  width = 280,
}) => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        width,
        minWidth: width,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRight: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1,
          borderBottom: collapsed ? 0 : 1,
          borderColor: 'divider',
          ...(onHeaderClick && {
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }),
        }}
        onClick={onHeaderClick}
      >
        {onHeaderClick && (
          <ExpandMore
            sx={{
              fontSize: 16,
              mr: 0.5,
              color: 'text.secondary',
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          />
        )}
        <Typography variant="subtitle2" color="text.secondary" noWrap sx={{ flex: 1 }}>
          {rootFolderName || t('folderTree.explorer')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
          {rootFolderName && !collapsed && (
            <>
              <IconButton size="small" onClick={onRefresh} title={t('folderTree.refresh')}>
                <Refresh fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={onCloseFolder} title={t('folderTree.closeFolder')}>
                <FolderOff fontSize="small" />
              </IconButton>
            </>
          )}
          {onClose && (
            <IconButton size="small" onClick={onClose}>
              <Close fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Body */}
      {!collapsed && <Box sx={{ flex: 1, overflow: 'auto' }}>
        {!rootFolderName ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3, gap: 2 }}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {t('folderTree.noFolderOpen')}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<CreateNewFolder />}
              onClick={onOpenFolder}
              size="small"
            >
              {t('folderTree.openFolder')}
            </Button>
          </Box>
        ) : isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : tree.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('folderTree.emptyFolder')}
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {tree.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                depth={0}
                activeFilePath={activeFilePath}
                onFileClick={onFileClick}
                onToggleExpand={onToggleExpand}
              />
            ))}
          </List>
        )}
      </Box>}
    </Box>
  );
};

export default FolderTreePanel;
