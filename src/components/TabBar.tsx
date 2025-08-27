import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import { Close, Add } from '@mui/icons-material';
import { Tab as TabType } from '../types/tab';

interface TabBarProps {
  tabs: TabType[];
  activeTabId: string | null;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
}

const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onNewTab,
}) => {
  const handleTabClick = (event: React.SyntheticEvent, tabId: string) => {
    onTabChange(tabId);
  };

  const handleTabClose = (event: React.MouseEvent, tabId: string) => {
    event.stopPropagation();
    onTabClose(tabId);
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
            <Tab
              key={tab.id}
              value={tab.id}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
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
                  <IconButton
                    size="small"
                    onClick={(e) => handleTabClose(e, tab.id)}
                    sx={{
                      ml: 0.5,
                      p: 0.5,
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              }
              sx={{
                '& .MuiTab-iconWrapper': {
                  display: 'none',
                },
              }}
            />
          ))}
        </Tabs>
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
