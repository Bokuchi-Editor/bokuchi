import React, { useState, useCallback, useEffect } from 'react';
import { Box, Typography, Drawer } from '@mui/material';
import Editor from './Editor';
import Preview from './Preview';
import TabBar from './TabBar';
import OutlinePanel from './OutlinePanel';
import { Tab } from '../types/tab';
import { OutlineDisplayMode } from '../types/outline';
import { useOutlineHeadings } from '../hooks/useOutlineHeadings';

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
  isInitialized: boolean;
  isSettingsLoaded: boolean;

  // Editor settings
  editorSettings?: {
    fontSize: number;
    showLineNumbers: boolean;
    tabSize: number;
    wordWrap: boolean;
    minimap: boolean;
    showWhitespace: boolean;
    tableConversion: 'auto' | 'confirm' | 'off';
  };

  // Outline
  outlineDisplayMode: OutlineDisplayMode;
  outlinePanelOpen: boolean;
  onOutlinePanelClose: () => void;

  // Handlers
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
  onTabReorder: (tabs: Tab[]) => void;
  onContentChange: (content: string) => void;
  onStatusChange: (status: { line: number; column: number; totalCharacters: number; selectedCharacters: number }) => void;
  onSnackbar: (message: string, severity: 'success' | 'error' | 'warning') => void;
  onTableConversionSettingChange?: (newSetting: 'auto' | 'confirm' | 'off') => void;
  focusRequestId?: number;

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
  isInitialized,
  isSettingsLoaded,
  editorSettings,
  outlineDisplayMode,
  outlinePanelOpen,
  onOutlinePanelClose,
  onTabChange,
  onTabClose,
  onNewTab,
  onTabReorder,
  onContentChange,
  onStatusChange,
  onSnackbar,
  onTableConversionSettingChange,
  focusRequestId,
  t,
}) => {
  const [scrollFraction, setScrollFraction] = useState(0);
  const [revealLineRequest, setRevealLineRequest] = useState<{ lineNumber: number; requestId: number }>({ lineNumber: 0, requestId: 0 });

  const headings = useOutlineHeadings(activeTab?.content);

  const handleEditorScrollChange = useCallback((fraction: number) => {
    setScrollFraction(fraction);
  }, []);

  const handleHeadingClick = useCallback((lineNumber: number) => {
    setRevealLineRequest(prev => ({ lineNumber, requestId: prev.requestId + 1 }));
  }, []);

  const showPersistentOutline = outlineDisplayMode === 'persistent' && outlinePanelOpen && activeTab;
  const showOverlayOutline = outlineDisplayMode === 'overlay' && activeTab;

  // Force Monaco Editor to recalculate layout when persistent outline panel toggles
  useEffect(() => {
    if (outlineDisplayMode === 'persistent') {
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [outlinePanelOpen, outlineDisplayMode]);

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
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
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
          {!isInitialized || !isSettingsLoaded ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <Typography variant="h6" color="text.secondary">
                {t('app.loading')}
              </Typography>
            </Box>
          ) : tabs.length === 0 ? (
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
                  <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', borderRight: 1, borderColor: 'divider', boxSizing: 'border-box' }}>
                    <Editor
                      content={activeTab.content}
                      onChange={onContentChange}
                      darkMode={theme === 'dark'}
                      theme={theme}
                      onStatusChange={onStatusChange}
                      zoomLevel={currentZoom}
                      focusRequestId={focusRequestId}
                      revealLineRequest={revealLineRequest.requestId > 0 ? revealLineRequest : undefined}
                      fontSize={editorSettings?.fontSize}
                      showLineNumbers={editorSettings?.showLineNumbers}
                      tabSize={editorSettings?.tabSize}
                      wordWrap={editorSettings?.wordWrap}
                      minimap={editorSettings?.minimap}
                      showWhitespace={editorSettings?.showWhitespace}
                      tableConversion={editorSettings?.tableConversion}
                      onSnackbar={onSnackbar}
                      onTableConversionSettingChange={onTableConversionSettingChange}
                      onScrollChange={handleEditorScrollChange}
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
                  <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', borderLeft: 1, borderColor: 'divider', boxSizing: 'border-box' }}>
                    <Preview
                      content={activeTab.content}
                      darkMode={theme === 'dark'}
                      theme={theme}
                      globalVariables={globalVariables}
                      zoomLevel={currentZoom}
                      onContentChange={onContentChange}
                      scrollFraction={scrollFraction}
                    />
                  </Box>
                </>
              )}
              {viewMode === 'editor' && (
                <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <Editor
                    content={activeTab.content}
                    onChange={onContentChange}
                    darkMode={theme === 'dark'}
                    theme={theme}
                    onStatusChange={onStatusChange}
                    zoomLevel={currentZoom}
                    focusRequestId={focusRequestId}
                    revealLineRequest={revealLineRequest.requestId > 0 ? revealLineRequest : undefined}
                    fontSize={editorSettings?.fontSize}
                    showLineNumbers={editorSettings?.showLineNumbers}
                    tabSize={editorSettings?.tabSize}
                    wordWrap={editorSettings?.wordWrap}
                    minimap={editorSettings?.minimap}
                    showWhitespace={editorSettings?.showWhitespace}
                    tableConversion={editorSettings?.tableConversion}
                    onSnackbar={onSnackbar}
                    onTableConversionSettingChange={onTableConversionSettingChange}
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
                <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <Preview
                    content={activeTab.content}
                    darkMode={theme === 'dark'}
                    theme={theme}
                    globalVariables={globalVariables}
                    zoomLevel={currentZoom}
                    onContentChange={onContentChange}
                  />
                </Box>
              )}

              {/* Persistent outline panel */}
              {showPersistentOutline && (
                <OutlinePanel
                  headings={headings}
                  onHeadingClick={handleHeadingClick}
                />
              )}

              {/* Overlay outline drawer */}
              {showOverlayOutline && (
                <Drawer
                  anchor="right"
                  variant="temporary"
                  open={outlinePanelOpen}
                  onClose={onOutlinePanelClose}
                  PaperProps={{ sx: { width: 280 } }}
                >
                  <OutlinePanel
                    headings={headings}
                    onHeadingClick={handleHeadingClick}
                    onClose={onOutlinePanelClose}
                    width={280}
                  />
                </Drawer>
              )}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default AppContent;
