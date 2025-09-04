import React from 'react';
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
} from '@mui/material';
import { Close, Add } from '@mui/icons-material';
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

interface TabBarProps {
  tabs: TabType[];
  activeTabId: string | null;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
  onTabReorder: (tabs: TabType[]) => void;
  layout?: 'horizontal' | 'vertical';
}

// SortableTabコンポーネント
const SortableTab: React.FC<{
  tab: TabType;
  isActive: boolean;
  onClose: (event: React.MouseEvent, tabId: string) => void;
  onClick: (tabId: string) => void;
  layout: 'horizontal' | 'vertical';
}> = ({ tab, isActive, onClose, onClick, layout }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (layout === 'vertical') {
    return (
      <ListItem
        ref={setNodeRef}
        style={style}
        disablePadding
        sx={{
          opacity: isDragging ? 0.5 : 1,
        }}
      >
        <ListItemButton
          selected={isActive}
          onClick={() => onClick(tab.id)}
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
          <Box
            {...attributes}
            {...listeners}
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              cursor: 'grab',
              '&:active': {
                cursor: 'grabbing',
              },
            }}
          >
            <Box
              sx={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '0.875rem',
              }}
            >
              {tab.title}
            </Box>
            <Badge
              color="error"
              variant="dot"
              invisible={!tab.isModified}
              sx={{ ml: 1 }}
            />
          </Box>
          <IconButton
            size="small"
            onClick={(e) => onClose(e, tab.id)}
            sx={{
              ml: 1,
              opacity: 0.7,
              '&:hover': {
                opacity: 1,
                bgcolor: 'action.hover',
              },
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </ListItemButton>
      </ListItem>
    );
  }

  return (
    <Tab
      ref={setNodeRef}
      style={style}
      value={tab.id}
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Box
            {...attributes}
            {...listeners}
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              cursor: 'grab',
              '&:active': {
                cursor: 'grabbing',
              },
            }}
          >
            <Box
              sx={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.title}
            </Box>
            <Badge
              color="error"
              variant="dot"
              invisible={!tab.isModified}
              sx={{ ml: 1 }}
            />
          </Box>
          <Box
            component="span"
            onClick={(e) => onClose(e, tab.id)}
            sx={{
              ml: 0.5,
              p: 0.5,
              cursor: 'pointer',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <Close fontSize="small" />
          </Box>
        </Box>
      }
      sx={{
        '& .MuiTab-iconWrapper': {
          display: 'none',
        },
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
  layout = 'horizontal',
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleTabClick = (_event: React.SyntheticEvent, tabId: string) => {
    onTabChange(tabId);
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

  if (layout === 'vertical') {
    return (
      <Box
        sx={{
          width: 250,
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
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
  }

  return (
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
              value={activeTabId || false}
              onChange={handleTabClick}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                flex: 1,
                '& .MuiTabs-indicator': {
                  backgroundColor: 'primary.main',
                },
                '& .MuiTab-root': {
                  minHeight: 48,
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  minWidth: 120,
                  maxWidth: 200,
                  '&.Mui-selected': {
                    fontWeight: 'bold',
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
};

export default TabBar;
