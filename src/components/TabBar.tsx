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
  SvgIcon,
} from '@mui/material';
import type { SvgIconProps } from '@mui/material';
import { Close, Add, PushPin } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Tab as TabType } from '../types/tab';
import { getTabDisplayTitle, formatFilePathForDisplay } from '../utils/pathUtils';
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
import { SIDEBAR_WIDTH_PX } from '../constants/layout';

// Sidebar pin toggle icon (fixed vs hover). Colored via currentColor so it
// follows the theme. Distinct from the per-tab PushPin icon.
const PinIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon viewBox="0 0 512 512" {...props}>
    <rect
      x="26.49" y="26.49" width="459.01" height="459.01" rx="48.25" ry="48.25"
      fill="none" stroke="currentColor" strokeWidth={30} strokeLinecap="round" strokeLinejoin="round"
    />
    <rect x="68.53" y="71" width="187.47" height="370.01" rx="23.12" ry="23.12" fill="currentColor" />
  </SvgIcon>
);

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
  // Vertical-tab sidebar: where the new-tab (+) button sits ('top' header, or
  // 'bottom' following the list end / sticking to the bottom edge). Default 'top'.
  newButtonPosition?: 'top' | 'bottom';
  embedded?: boolean;
  // Vertical-tab sidebar pin (fixed) vs hover/auto-hide. When the toggle handler
  // is provided, the pin button is shown in the vertical sidebar header.
  tabSidebarPinned?: boolean;
  onToggleSidebarPinned?: () => void;
  // Vertical (non-embedded) sidebar width in px. Defaults to SIDEBAR_WIDTH_PX.
  width?: number;
}

// Custom pointer sensor with drag start threshold
const createThresholdPointerSensor = () => {
  return useSensor(PointerSensor, {
    activationConstraint: {
      // Use a distance-only constraint. Combining `distance` with `delay`
      // makes dnd-kit treat it as a press-and-hold (delay) constraint and
      // cancel the drag if the pointer moves beyond `tolerance` before the
      // delay elapses, so a quick grab-and-drag never starts. Distance alone
      // means: move beyond the threshold to start dragging, otherwise it's a click.
      distance: dragConfig.dragThreshold,
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

  // File path tooltip text — empty string disables the tooltip in MUI.
  // Unsaved/new tabs may have no real on-disk path even when filePath is set,
  // matching the same condition used by the "Copy file path" menu item.
  const filePathTooltip = tab.filePath && !tab.isNew
    ? formatFilePathForDisplay(tab.filePath)
    : '';

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
      <Tooltip title={filePathTooltip} followCursor placement="bottom-start" enterDelay={300}>
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
                {getTabDisplayTitle(tab)}
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
      </Tooltip>
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
    <Tooltip title={filePathTooltip} followCursor placement="bottom-start" enterDelay={300}>
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
                {getTabDisplayTitle(tab)}
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
    </Tooltip>
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
  newButtonPosition = 'top',
  embedded = false,
  tabSidebarPinned,
  onToggleSidebarPinned,
  width = SIDEBAR_WIDTH_PX,
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
    const newAtBottom = newButtonPosition === 'bottom';
    const newTabButton = (
      <Tooltip title="New Tab">
        <IconButton
          onClick={onNewTab}
          sx={{
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <Add />
        </IconButton>
      </Tooltip>
    );
    const pinButton = onToggleSidebarPinned && (
      <Tooltip title={tabSidebarPinned ? t('tabSidebar.unpin') : t('tabSidebar.pin')}>
        <IconButton
          onClick={onToggleSidebarPinned}
          color={tabSidebarPinned ? 'primary' : 'default'}
          size="small"
          sx={{
            opacity: tabSidebarPinned ? 1 : 0.6,
          }}
        >
          <PinIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );
    content = (
      <Box
        sx={{
          ...(!embedded && {
            width,
            borderRight: 1,
            borderColor: 'divider',
          }),
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          ...(embedded && { overflow: 'hidden', height: '100%' }),
        }}
      >
        {/* Header: pin toggle, plus the new-tab button when positioned at the top.
            With the button at the top the pin floats at the left and the button is
            centered (legacy layout); at the bottom the pin sits inline on the left. */}
        {(pinButton || !newAtBottom) && (
          <Box
            sx={{
              p: 1,
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              ...(newAtBottom
                ? {}
                : { position: 'relative', justifyContent: 'center' }),
            }}
          >
            {newAtBottom ? (
              pinButton
            ) : (
              <>
                {pinButton && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 1,
                    }}
                  >
                    {pinButton}
                  </Box>
                )}
                {newTabButton}
              </>
            )}
          </Box>
        )}
        {/* Tab list + (optional) bottom new-tab button. The scroll area sizes to its
            content (flex: 0 1 auto) so the bottom button sits directly below the last
            tab; once the tabs overflow, the area caps to the available height and the
            sticky button pins to the bottom edge so it stays reachable. */}
        <Box sx={{ flex: '0 1 auto', minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={tabs.map(tab => tab.id)}
              strategy={verticalListSortingStrategy}
            >
              <List sx={{ p: 0 }}>
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
          {newAtBottom && (
            <Box
              sx={{
                position: 'sticky',
                bottom: 0,
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'center',
                p: 1,
                borderTop: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              {newTabButton}
            </Box>
          )}
        </Box>
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
