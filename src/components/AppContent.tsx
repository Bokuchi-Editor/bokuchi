import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Typography, Drawer } from '@mui/material';
import Editor from './Editor';
import Preview from './Preview';
import TabBar from './TabBar';
import OutlinePanel from './OutlinePanel';
import FolderTreePanel from './FolderTreePanel';
import { Tab } from '../types/tab';
import { OutlineDisplayMode } from '../types/outline';
import { FolderTreeDisplayMode, FolderTreeNode } from '../types/folderTree';
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

  // Folder tree
  folderTreeDisplayMode: FolderTreeDisplayMode;
  folderTreePanelOpen: boolean;
  folderTreeRootFolderName: string | null;
  folderTree: FolderTreeNode[];
  folderTreeIsLoading: boolean;
  onFolderTreeFileClick: (filePath: string) => void;
  onFolderTreeToggleExpand: (nodePath: string) => void;
  onFolderTreeOpenFolder: () => void;
  onFolderTreeCloseFolder: () => void;
  onFolderTreeRefresh: () => void;
  onFolderTreePanelClose: () => void;

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
  folderTreeDisplayMode,
  folderTreePanelOpen,
  folderTreeRootFolderName,
  folderTree,
  folderTreeIsLoading,
  onFolderTreeFileClick,
  onFolderTreeToggleExpand,
  onFolderTreeOpenFolder,
  onFolderTreeCloseFolder,
  onFolderTreeRefresh,
  onFolderTreePanelClose,
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

  const showPersistentFolderTree =
    folderTreeDisplayMode === 'persistent' &&
    folderTreePanelOpen;
  const showOverlayFolderTree = folderTreeDisplayMode === 'overlay';

  // When persistent folder tree is active with vertical tabs, they merge into one sidebar
  const showMergedLeftSidebar = showPersistentFolderTree && tabLayout === 'vertical';
  // Show standalone vertical tab bar only when folder tree is not persistent or panel is closed
  const showStandaloneVerticalTabs = tabLayout === 'vertical' && !showMergedLeftSidebar;

  // Resizable divider state for merged sidebar
  const [tabSectionHeight, setTabSectionHeight] = useState(200);
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const explorerHeightBeforeCollapse = useRef(0);
  const isDraggingRef = useRef(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleExplorerHeaderClick = useCallback(() => {
    if (explorerCollapsed) {
      // Restore previous height (or default)
      const restoreH = explorerHeightBeforeCollapse.current || 200;
      if (sidebarRef.current) {
        const maxH = sidebarRef.current.getBoundingClientRect().height - 120;
        setTabSectionHeight(Math.min(restoreH, maxH));
      } else {
        setTabSectionHeight(restoreH);
      }
      setExplorerCollapsed(false);
    } else {
      // Save current height then collapse explorer (body hidden, header stays)
      explorerHeightBeforeCollapse.current = tabSectionHeight;
      // Set tab section to fill, leaving room for explorer header + divider
      if (sidebarRef.current) {
        const totalH = sidebarRef.current.getBoundingClientRect().height;
        setTabSectionHeight(totalH - 48);
      }
      setExplorerCollapsed(true);
    }
  }, [explorerCollapsed, tabSectionHeight]);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current || !sidebarRef.current) return;
      const sidebarRect = sidebarRef.current.getBoundingClientRect();
      const newHeight = ev.clientY - sidebarRect.top;
      const minH = 80;
      // Explorer header (~40px) + divider (4px) = 44px must always remain
      const maxH = sidebarRect.height - 48;
      const clamped = Math.max(minH, Math.min(maxH, newHeight));
      setTabSectionHeight(clamped);
      // Un-collapse when user drags to give explorer more space
      setExplorerCollapsed(false);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  // Force Monaco Editor to recalculate layout when persistent panels toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
    return () => clearTimeout(timer);
  }, [outlinePanelOpen, outlineDisplayMode, folderTreePanelOpen, folderTreeDisplayMode]);

  return (
    <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Merged left sidebar: vertical tabs + folder tree */}
      {showMergedLeftSidebar && (
        <Box
          ref={sidebarRef}
          sx={{
            width: 280,
            minWidth: 280,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            borderRight: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          {/* Open Editors section (vertical tabs) */}
          <Box sx={{
            height: tabSectionHeight,
            minHeight: 0,
            overflow: 'hidden',
            transition: isDragging ? 'none' : 'height 0.2s ease',
          }}>
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onTabChange={onTabChange}
              onTabClose={onTabClose}
              onNewTab={onNewTab}
              onTabReorder={onTabReorder}
              layout="vertical"
              embedded
            />
          </Box>
          {/* Draggable divider */}
          <Box
            onMouseDown={handleDividerMouseDown}
            sx={{
              height: 4,
              cursor: 'row-resize',
              flexShrink: 0,
              bgcolor: 'divider',
              '&:hover': { bgcolor: 'primary.main' },
              transition: 'background-color 0.15s',
            }}
          />
          {/* Explorer section */}
          <Box sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}>
            <FolderTreePanel
              rootFolderName={folderTreeRootFolderName}
              tree={folderTree}
              isLoading={folderTreeIsLoading}
              activeFilePath={activeTab?.filePath}
              onFileClick={onFolderTreeFileClick}
              onToggleExpand={onFolderTreeToggleExpand}
              onOpenFolder={onFolderTreeOpenFolder}
              onCloseFolder={onFolderTreeCloseFolder}
              onRefresh={onFolderTreeRefresh}
              onClose={onFolderTreePanelClose}
              onHeaderClick={handleExplorerHeaderClick}
              collapsed={explorerCollapsed}
              width={280}
            />
          </Box>
        </Box>
      )}

      {/* Standalone vertical tab bar */}
      {showStandaloneVerticalTabs && (
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

      {/* Standalone persistent folder tree (horizontal tab mode) */}
      {showPersistentFolderTree && tabLayout === 'horizontal' && (
        <FolderTreePanel
          rootFolderName={folderTreeRootFolderName}
          tree={folderTree}
          isLoading={folderTreeIsLoading}
          activeFilePath={activeTab?.filePath}
          onFileClick={onFolderTreeFileClick}
          onToggleExpand={onFolderTreeToggleExpand}
          onOpenFolder={onFolderTreeOpenFolder}
          onCloseFolder={onFolderTreeCloseFolder}
          onRefresh={onFolderTreeRefresh}
          onClose={onFolderTreePanelClose}
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
                      darkMode={theme === 'dark' || theme === 'as400'}
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
                      darkMode={theme === 'dark' || theme === 'as400'}
                      theme={theme}
                      globalVariables={globalVariables}
                      zoomLevel={currentZoom}
                      onContentChange={onContentChange}
                      scrollFraction={scrollFraction}
                      filePath={activeTab.filePath}
                    />
                  </Box>
                </>
              )}
              {viewMode === 'editor' && (
                <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <Editor
                    content={activeTab.content}
                    onChange={onContentChange}
                    darkMode={theme === 'dark' || theme === 'as400'}
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
                    darkMode={theme === 'dark' || theme === 'as400'}
                    theme={theme}
                    globalVariables={globalVariables}
                    zoomLevel={currentZoom}
                    onContentChange={onContentChange}
                    filePath={activeTab.filePath}
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

      {/* Overlay folder tree drawer */}
      {showOverlayFolderTree && (
        <Drawer
          anchor="left"
          variant="temporary"
          open={folderTreePanelOpen}
          onClose={onFolderTreePanelClose}
          PaperProps={{ sx: { width: 280 } }}
        >
          <FolderTreePanel
            rootFolderName={folderTreeRootFolderName}
            tree={folderTree}
            isLoading={folderTreeIsLoading}
            activeFilePath={activeTab?.filePath}
            onFileClick={(filePath) => {
              onFolderTreeFileClick(filePath);
              onFolderTreePanelClose();
            }}
            onToggleExpand={onFolderTreeToggleExpand}
            onOpenFolder={onFolderTreeOpenFolder}
            onCloseFolder={onFolderTreeCloseFolder}
            onRefresh={onFolderTreeRefresh}
            onClose={onFolderTreePanelClose}
            width={280}
          />
        </Drawer>
      )}
    </Box>
  );
};

export default AppContent;
