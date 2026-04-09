import React, { useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Badge,
  List,
  ListItem,
  ListItemButton,
  Divider,
  Menu,
  MenuItem,
} from '@mui/material';
import { Close, Add, PushPin } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Tab as TabType } from '../types/tab';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { dragConfig } from '../config/dragConfig';

interface TabBarProps {
  tabs: TabType[];
  activeTabId: string | null;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
  onTabReorder: (tabs: TabType[]) => void;
  onTabRename?: (tabId: string) => void;
  onToggleTabPinned?: (tabId: string) => void;
  onCopyFilePath?: (tabId: string) => void;
  onCopyFileName?: (tabId: string) => void;
  onCloseOtherTabs?: (tabId: string) => void;
  onCloseTabsToRight?: (tabId: string) => void;
  onCloseAllTabs?: () => void;
  closeButtonPosition?: 'left' | 'right';
  layout?: 'horizontal' | 'vertical';
  embedded?: boolean;
}

// Custom pointer sensor with drag start threshold
const createThresholdPointerSensor = () => {
  return useSensor(PointerSensor, {
    activationConstraint: {
      distance: dragConfig.dragThreshold,
      delay: dragConfig.dragDelay,
      tolerance: 3,
    },
  });
};

// SortableTab component
const SortableTab: React.FC<{
  tab: TabType;
  isActive: boolean;
  onClose: (event: React.MouseEvent, tabId: string) => void;
  onClick: (tabId: string) => void;
  onContextMenu?: (event: React.MouseEvent, tabId: string) => void;
  onDoubleClick?: (tabId: string) => void;
  closeButtonPosition?: 'left' | 'right';
  layout: 'horizontal' | 'vertical';
}> = ({ tab, isActive, onClose, onClick, onContextMenu, onDoubleClick, closeButtonPosition = 'right', layout }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const localRef = useRef<HTMLLIElement>(null);
  const mergedRef = useCallback((node: HTMLLIElement | null) => {
    setNodeRef(node);
    (localRef as React.MutableRefObject<HTMLLIElement | null>).current = node;
  }, [setNodeRef]);

  useEffect(() => {
    if (isActive && layout === 'vertical' && localRef.current) {
      localRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isActive, layout]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isLeft = closeButtonPosition === 'left';

  // Close/Pin button element for vertical layout
  const verticalActionButton = tab.isPinned ? (
    <PushPin fontSize="small" sx={{ [isLeft ? 'mr' : 'ml']: 1, flexShrink: 0, opacity: 0.7, color: isActive ? 'inherit' : 'primary.main' }} />
  ) : (
    <IconButton
      size="small"
      onClick={(e) => onClose(e, tab.id)}
      sx={{
        [isLeft ? 'mr' : 'ml']: 1,
        opacity: 0.7,
        flexShrink: 0,
        '&:hover': {
          opacity: 1,
          bgcolor: 'action.hover',
        },
      }}
    >
      <Close fontSize="small" />
    </IconButton>
  );

  if (layout === 'vertical') {
    return (
      <ListItem
        ref={mergedRef}
        style={style}
        disablePadding
        sx={{
          opacity: isDragging ? 0.5 : 1,
        }}
      >
        <ListItemButton
          selected={isActive}
          onClick={() => onClick(tab.id)}
          onDoubleClick={() => onDoubleClick?.(tab.id)}
          onContextMenu={(e) => onContextMenu?.(e, tab.id)}
          sx={{
            py: 1,
            px: 2,
            '&.Mui-selected': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            },
          }}
        >
          {isLeft && verticalActionButton}
          <Box
            {...attributes}
            {...listeners}
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              cursor: 'grab',
              minWidth: 0,
              '&:active': {
                cursor: 'grabbing',
              },
            }}
          >
            <Box
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '0.875rem',
                minWidth: 0,
              }}
            >
              {tab.title}
            </Box>
            <Badge
              color="error"
              variant="dot"
              invisible={!tab.isModified}
              sx={{ ml: 1, flexShrink: 0 }}
            />
          </Box>
          {!isLeft && verticalActionButton}
        </ListItemButton>
      </ListItem>
    );
  }

  // Close/Pin button element for horizontal layout
  const horizontalActionButton = tab.isPinned ? (
    <Box
      component="span"
      sx={{
        [isLeft ? 'mr' : 'ml']: 0.5,
        p: 0.5,
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <PushPin fontSize="small" sx={{ color: isActive ? 'inherit' : 'primary.main' }} />
    </Box>
  ) : (
    <Box
      component="span"
      onClick={(e) => onClose(e, tab.id)}
      sx={{
        [isLeft ? 'mr' : 'ml']: 0.5,
        p: 0.5,
        cursor: 'pointer',
        borderRadius: 1,
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      <Close fontSize="small" />
    </Box>
  );

  return (
    <Tab
      ref={setNodeRef}
      style={style}
      value={tab.id}
      onClick={() => onClick(tab.id)}
      onDoubleClick={() => onDoubleClick?.(tab.id)}
      onContextMenu={(e) => onContextMenu?.(e, tab.id)}
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', minWidth: 0 }}>
          {isLeft && horizontalActionButton}
          <Box
            {...attributes}
            {...listeners}
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              cursor: 'grab',
              minWidth: 0,
              '&:active': {
                cursor: 'grabbing',
              },
            }}
          >
            <Box
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
            >
              {tab.title}
            </Box>
            <Badge
              color="error"
              variant="dot"
              invisible={!tab.isModified}
              sx={{ ml: 1, flexShrink: 0 }}
            />
          </Box>
          {!isLeft && horizontalActionButton}
        </Box>
      }
      sx={{
        '& .MuiTab-iconWrapper': {
          display: 'none',
        },
        borderTop: '3px solid',
        borderTopColor: tab.isPinned && !isActive ? 'primary.main' : 'transparent',
        ...(isActive && {
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '&:hover': {
            bgcolor: 'primary.dark',
          },
        }),
        ...(!isActive && {
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }),
      }}
    />
  );
};



const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onNewTab,
  onTabReorder,
  onTabRename,
  onToggleTabPinned,
  onCopyFilePath,
  onCopyFileName,
  onCloseOtherTabs,
  onCloseTabsToRight,
  onCloseAllTabs,
  closeButtonPosition = 'right',
  layout = 'horizontal',
  embedded = false,
}) => {
  const { t } = useTranslation();
  const sensors = useSensors(
    createThresholdPointerSensor(),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Context menu state
  const [contextMenu, setContextMenu] = React.useState<{ mouseX: number; mouseY: number; tabId: string } | null>(null);

  const handleContextMenu = useCallback((event: React.MouseEvent, tabId: string) => {
    event.preventDefault();
    setContextMenu({ mouseX: event.clientX, mouseY: event.clientY, tabId });
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleRenameClick = useCallback(() => {
    if (contextMenu && onTabRename) {
      onTabRename(contextMenu.tabId);
    }
    setContextMenu(null);
  }, [contextMenu, onTabRename]);

  const handleCopyFilePathClick = useCallback(() => {
    if (contextMenu) onCopyFilePath?.(contextMenu.tabId);
    setContextMenu(null);
  }, [contextMenu, onCopyFilePath]);

  const handleCopyFileNameClick = useCallback(() => {
    if (contextMenu) onCopyFileName?.(contextMenu.tabId);
    setContextMenu(null);
  }, [contextMenu, onCopyFileName]);

  const handleTogglePinClick = useCallback(() => {
    if (contextMenu) onToggleTabPinned?.(contextMenu.tabId);
    setContextMenu(null);
  }, [contextMenu, onToggleTabPinned]);

  const handleCloseTabClick = useCallback(() => {
    if (contextMenu) onTabClose(contextMenu.tabId);
    setContextMenu(null);
  }, [contextMenu, onTabClose]);

  const handleCloseOtherTabsClick = useCallback(() => {
    if (contextMenu) onCloseOtherTabs?.(contextMenu.tabId);
    setContextMenu(null);
  }, [contextMenu, onCloseOtherTabs]);

  const handleCloseTabsToRightClick = useCallback(() => {
    if (contextMenu) onCloseTabsToRight?.(contextMenu.tabId);
    setContextMenu(null);
  }, [contextMenu, onCloseTabsToRight]);

  const handleCloseAllTabsClick = useCallback(() => {
    onCloseAllTabs?.();
    setContextMenu(null);
  }, [onCloseAllTabs]);

  const handleDoubleClick = useCallback((tabId: string) => {
    onToggleTabPinned?.(tabId);
  }, [onToggleTabPinned]);

  const contextTab = contextMenu ? tabs.find(t => t.id === contextMenu.tabId) : null;

  const handleTabClick = (_event: React.SyntheticEvent, tabIndex: number) => {
    const tab = tabs[tabIndex];
    if (tab) {
      onTabChange(tab.id);
    }
  };

  const handleTabClose = (event: React.MouseEvent, tabId: string) => {
    event.stopPropagation();
    onTabClose(tabId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((tab) => tab.id === active.id);
      const newIndex = tabs.findIndex((tab) => tab.id === over.id);

      const reorderedTabs = arrayMove(tabs, oldIndex, newIndex);
      onTabReorder(reorderedTabs);
    }
  };

  let content: React.ReactNode;

  if (layout === 'vertical') {
    content = (
      <Box
        sx={{
          ...(!embedded && {
            width: 280,
            borderRight: 1,
            borderColor: 'divider',
          }),
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          ...(embedded && { overflow: 'hidden', height: '100%' }),
        }}
      >
        <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Tooltip title="New Tab">
            <IconButton
              onClick={onNewTab}
              sx={{
                width: '100%',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Add />
            </IconButton>
          </Tooltip>
        </Box>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tabs.map(tab => tab.id)}
            strategy={verticalListSortingStrategy}
          >
            <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
              {tabs.map((tab, index) => (
                <React.Fragment key={tab.id}>
                  <SortableTab
                    tab={tab}
                    isActive={tab.id === activeTabId}
                    onClose={handleTabClose}
                    onClick={onTabChange}
                    onContextMenu={handleContextMenu}
                    onDoubleClick={handleDoubleClick}
                    closeButtonPosition={closeButtonPosition}
                    layout="vertical"
                  />
                  {index < tabs.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </SortableContext>
        </DndContext>
      </Box>
    );
  } else {
    content = (
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tabs.map(tab => tab.id)}
            strategy={horizontalListSortingStrategy}
          >
            <Tabs
              value={(() => {
                if (!activeTabId) return false;
                const tabIndex = tabs.findIndex(t => t.id === activeTabId);
                if (tabIndex === -1) {
                  console.warn('Invalid activeTabId:', activeTabId, 'Available tabs:', tabs.map(t => t.id));
                  return false;
                }
                return tabIndex;
              })()}
              onChange={handleTabClick}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                flex: 1,
                '& .MuiTabs-indicator': {
                  display: 'none', // Hidden to use custom styling
                },
                '& .MuiTab-root': {
                  minHeight: 48,
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  minWidth: 120,
                  maxWidth: 250,
                  borderRight: '1px solid',
                  borderRightColor: 'divider',
                  '&:last-child': {
                    borderRight: 'none',
                  },
                },
              }}
            >
              {tabs.map((tab) => (
                <SortableTab
                  key={tab.id}
                  tab={tab}
                  isActive={tab.id === activeTabId}
                  onClose={handleTabClose}
                  onClick={onTabChange}
                  onContextMenu={handleContextMenu}
                  onDoubleClick={handleDoubleClick}
                  closeButtonPosition={closeButtonPosition}
                  layout="horizontal"
                />
              ))}
            </Tabs>
          </SortableContext>
        </DndContext>
        <Tooltip title="New Tab">
          <IconButton
            onClick={onNewTab}
            sx={{
              mx: 1,
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <Add />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
    );
  }

  return (
    <>
      {content}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        {onTabRename && (
          <MenuItem onClick={handleRenameClick}>{t('folderTree.rename')}</MenuItem>
        )}
        <MenuItem
          onClick={handleCopyFilePathClick}
          disabled={!contextTab?.filePath || contextTab?.isNew}
        >
          {t('tabs.copyFilePath')}
        </MenuItem>
        <MenuItem onClick={handleCopyFileNameClick}>
          {t('tabs.copyFileName')}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleTogglePinClick}>
          {contextTab?.isPinned ? t('tabs.unpinTab') : t('tabs.pinTab')}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleCloseTabClick}>
          {t('tabs.closeTab')}
        </MenuItem>
        <MenuItem onClick={handleCloseOtherTabsClick}>
          {t('tabs.closeOtherTabs')}
        </MenuItem>
        <MenuItem onClick={handleCloseTabsToRightClick}>
          {layout === 'horizontal' ? t('tabs.closeTabsToRight') : t('tabs.closeTabsBelow')}
        </MenuItem>
        <MenuItem onClick={handleCloseAllTabsClick}>
          {t('tabs.closeAllTabs')}
        </MenuItem>
      </Menu>
    </>
  );
};

export default TabBar;
