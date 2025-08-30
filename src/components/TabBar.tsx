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
  ListItemText,
  Divider,
} from '@mui/material';
import { Close, Add } from '@mui/icons-material';
import { Tab as TabType } from '../types/tab';

interface TabBarProps {
  tabs: TabType[];
  activeTabId: string | null;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
  layout?: 'horizontal' | 'vertical';
}

// カスタムタブラベルコンポーネント
const TabLabel: React.FC<{
  tab: TabType;
  onClose: (event: React.MouseEvent, tabId: string) => void;
}> = ({ tab, onClose }) => (
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
);

const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onNewTab,
  layout = 'horizontal',
}) => {
  const handleTabClick = (_event: React.SyntheticEvent, tabId: string) => {
    onTabChange(tabId);
  };

  const handleTabClose = (event: React.MouseEvent, tabId: string) => {
    event.stopPropagation();
    onTabClose(tabId);
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
              fullWidth
              sx={{
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Add />
            </IconButton>
          </Tooltip>
        </Box>
        <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
          {tabs.map((tab, index) => (
            <React.Fragment key={tab.id}>
              <ListItem disablePadding>
                <ListItemButton
                  selected={tab.id === activeTabId}
                  onClick={() => onTabChange(tab.id)}
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
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                    }
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => handleTabClose(e, tab.id)}
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
              {index < tabs.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Box>
    );
  }

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
              label={<TabLabel tab={tab} onClose={handleTabClose} />}
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
