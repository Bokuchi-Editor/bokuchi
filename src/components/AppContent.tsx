import React from 'react';
import { Box, Typography } from '@mui/material';
import Editor from './Editor';
import Preview from './Preview';
import TabBar from './TabBar';
import { Tab } from '../types/tab';

interface AppContentProps {
  // State
  tabLayout: 'horizontal' | 'vertical';
  viewMode: 'split' | 'editor' | 'preview';
  tabs: Tab[];
  activeTabId: string | null;
  activeTab: Tab | null;
  theme: string;
  globalVariables: Record<string, string>;
  currentZoom: number;

  // Handlers
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
  onTabReorder: (tabs: Tab[]) => void;
  onContentChange: (content: string) => void;
  onStatusChange: (status: { line: number; column: number; totalCharacters: number; selectedCharacters: number }) => void;

  // Translation
  t: (key: string, options?: Record<string, string | number>) => string;
}

const AppContent: React.FC<AppContentProps> = ({
  tabLayout,
  viewMode,
  tabs,
  activeTabId,
  activeTab,
  theme,
  globalVariables,
  currentZoom,
  onTabChange,
  onTabClose,
  onNewTab,
  onTabReorder,
  onContentChange,
  onStatusChange,
  t,
}) => {
  return (
    <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {tabLayout === 'vertical' && (
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabChange={onTabChange}
          onTabClose={onTabClose}
          onNewTab={onNewTab}
          onTabReorder={onTabReorder}
          layout={tabLayout}
        />
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {tabLayout === 'horizontal' && (
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={onTabChange}
            onTabClose={onTabClose}
            onNewTab={onNewTab}
            onTabReorder={onTabReorder}
            layout={tabLayout}
          />
        )}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {tabs.length === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <Typography variant="h6" color="text.secondary">
                {t('app.noTabsOpen')}
              </Typography>
            </Box>
          ) : !activeTab ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <Typography variant="h6" color="text.secondary">
                {t('app.loading')}
              </Typography>
            </Box>
          ) : (
            <>
              {viewMode === 'split' && (
                <>
                  <Box sx={{ flex: 1, borderRight: 1, borderColor: 'divider' }}>
                    <Editor
                      content={activeTab.content}
                      onChange={onContentChange}
                      darkMode={theme === 'dark'}
                      theme={theme}
                      onStatusChange={onStatusChange}
                      zoomLevel={currentZoom}
                      fileNotFound={
                        activeTab.isNew && activeTab.filePath
                          ? {
                              filePath: activeTab.filePath,
                              onClose: () => onTabClose(activeTab.id),
                            }
                          : undefined
                      }
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Preview
                      content={activeTab.content}
                      darkMode={theme === 'dark'}
                      theme={theme}
                      globalVariables={globalVariables}
                      zoomLevel={currentZoom}
                    />
                  </Box>
                </>
              )}
              {viewMode === 'editor' && (
                <Box sx={{ flex: 1 }}>
                  <Editor
                    content={activeTab.content}
                    onChange={onContentChange}
                    darkMode={theme === 'dark'}
                    theme={theme}
                    onStatusChange={onStatusChange}
                    zoomLevel={currentZoom}
                    fileNotFound={
                      activeTab.isNew && activeTab.filePath
                        ? {
                            filePath: activeTab.filePath,
                            onClose: () => onTabClose(activeTab.id),
                          }
                        : undefined
                    }
                  />
                </Box>
              )}
              {viewMode === 'preview' && (
                <Box sx={{ flex: 1 }}>
                  <Preview
                    content={activeTab.content}
                    darkMode={theme === 'dark'}
                    theme={theme}
                    globalVariables={globalVariables}
                    zoomLevel={currentZoom}
                  />
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default AppContent;