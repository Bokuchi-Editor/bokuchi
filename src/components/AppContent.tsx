import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Typography, Drawer } from '@mui/material';
import Editor from './Editor';
import Preview from './Preview';
import TabBar from './TabBar';
import OutlinePanel from './OutlinePanel';
import FolderTreePanel from './FolderTreePanel';
import EmptyState from './EmptyState';
import { Tab } from '../types/tab';
import { OutlineDisplayMode } from '../types/outline';
import { FolderTreeDisplayMode, FolderTreeNode } from '../types/folderTree';
import { RenderingSettings, PreviewSettings, ScrollSyncMode } from '../types/settings';
import type { SettingsFocusTarget } from '../types/settingsFocus';
import { useOutlineHeadings } from '../hooks/useOutlineHeadings';
import { useResizableSidebar } from '../hooks/useResizableSidebar';
import { DRAWER_WIDTH_PX, LAYOUT_SETTLE_DELAY_MS, SIDEBAR_DIVIDER_HEIGHT_PX, SIDEBAR_WIDTH_PX } from '../constants/layout';
import { isDarkTheme, ThemeName } from '../themes';

interface AppContentProps {
  // State
  tabLayout: 'horizontal' | 'vertical';
  viewMode: 'split' | 'editor' | 'preview';
  // Vertical-tab sidebar pinned (fixed) vs hover/auto-hide.
  tabSidebarPinned: boolean;
  onToggleSidebarPinned: () => void;
  // 臨 (Rin) focus mode active — hides all chrome.
  rinActive: boolean;
  // 臨 editor width: false = 1000px centered, true = full width (minus the button gutter).
  rinFullWidth: boolean;
  tabs: Tab[];
  activeTabId: string | null;
  activeTab: Tab | null;
  theme: string;
  globalVariables: Record<string, string>;
  currentZoom: number;
  isInitialized: boolean;
  isSettingsLoaded: boolean;

  // Rendering settings
  renderingSettings?: RenderingSettings;

  // Preview settings (table layout, etc.)
  previewSettings?: PreviewSettings;

  // Editor settings
  editorSettings?: {
    fontSize: number;
    showLineNumbers: boolean;
    tabSize: number;
    wordWrap: boolean;
    minimap: boolean;
    showFormattingBar: boolean;
    showWhitespace: boolean;
    tableConversion: 'auto' | 'confirm' | 'off';
  };

  // Scroll sync between editor and preview in split view
  scrollSyncMode: ScrollSyncMode;

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
  onRenameRequest?: (filePath: string) => void;
  onTabRename?: (tabId: string) => void;
  onToggleTabPinned?: (tabId: string) => void;
  onCopyFilePath?: (tabId: string) => void;
  onCopyFileName?: (tabId: string) => void;
  onCloseOtherTabs?: (tabId: string) => void;
  onCloseTabsToRight?: (tabId: string) => void;
  onCloseAllTabs?: () => void;
  tabCloseButtonPosition?: 'left' | 'right';
  tabNewButtonPosition?: 'top' | 'bottom';

  // Handlers
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
  onOpenFile: () => void;
  onRecentFileSelect: (filePath: string) => void;
  onTabReorder: (tabs: Tab[]) => void;
  onContentChange: (content: string) => void;
  onStatusChange: (status: { line: number; column: number; totalCharacters: number; selectedCharacters: number }) => void;
  onSnackbar: (message: string, severity: 'success' | 'error' | 'warning') => void;
  onTableConversionSettingChange?: (newSetting: 'auto' | 'confirm' | 'off') => void;
  onOpenSettings?: (target?: SettingsFocusTarget) => void;
  focusRequestId?: number;

  // Translation
  t: (key: string, options?: Record<string, string | number>) => string;
}

const AppContent: React.FC<AppContentProps> = ({
  tabLayout,
  viewMode,
  tabSidebarPinned,
  onToggleSidebarPinned,
  rinActive,
  rinFullWidth,
  tabs,
  activeTabId,
  activeTab,
  theme,
  globalVariables,
  currentZoom,
  isInitialized,
  isSettingsLoaded,
  renderingSettings,
  previewSettings,
  editorSettings,
  scrollSyncMode,
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
  onRenameRequest,
  onTabRename,
  onToggleTabPinned,
  onCopyFilePath,
  onCopyFileName,
  onCloseOtherTabs,
  onCloseTabsToRight,
  onCloseAllTabs,
  tabCloseButtonPosition,
  tabNewButtonPosition,
  onTabChange,
  onTabClose,
  onNewTab,
  onOpenFile,
  onRecentFileSelect,
  onTabReorder,
  onContentChange,
  onStatusChange,
  onSnackbar,
  onTableConversionSettingChange,
  onOpenSettings,
  focusRequestId,
  t,
}) => {
  const scrollFractionMap = useRef<Map<string, number>>(new Map());
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;
  // Track which side initiated the scroll so the originating side ignores its own update
  // (prevents bidirectional sync from feedback-looping).
  const [scrollState, setScrollState] = useState<{ fraction: number; source: 'editor' | 'preview' | 'restore' }>({ fraction: 0, source: 'restore' });
  const [revealLineRequest, setRevealLineRequest] = useState<{ lineNumber: number; requestId: number }>({ lineNumber: 0, requestId: 0 });
  // Whether the auto-hide vertical sidebar overlay is currently slid in (hover).
  const [sidebarOverlayOpen, setSidebarOverlayOpen] = useState(false);

  const headings = useOutlineHeadings(activeTab?.content);

  // Restore scroll position when switching tabs
  useEffect(() => {
    if (activeTabId) {
      setScrollState({ fraction: scrollFractionMap.current.get(activeTabId) ?? 0, source: 'restore' });
    }
  }, [activeTabId]);

  // Clean up scroll entries for closed tabs
  useEffect(() => {
    const currentTabIds = new Set(tabs.map(t => t.id));
    for (const key of scrollFractionMap.current.keys()) {
      if (!currentTabIds.has(key)) {
        scrollFractionMap.current.delete(key);
      }
    }
  }, [tabs]);

  // Use ref for activeTabId to avoid stale closure in Editor's scroll listener.
  // Editor.tsx registers onScrollChange once at mount, so the callback reference must be stable.
  const handleEditorScrollChange = useCallback((fraction: number) => {
    setScrollState({ fraction, source: 'editor' });
    const tabId = activeTabIdRef.current;
    if (tabId) {
      scrollFractionMap.current.set(tabId, fraction);
    }
  }, []);

  const handlePreviewScrollChange = useCallback((fraction: number) => {
    setScrollState({ fraction, source: 'preview' });
    const tabId = activeTabIdRef.current;
    if (tabId) {
      scrollFractionMap.current.set(tabId, fraction);
    }
  }, []);

  // Per-side scroll value for split view: undefined means "do not push update to this side".
  const editorScrollFraction = scrollSyncMode === 'bidirectional' && scrollState.source === 'preview'
    ? scrollState.fraction
    : undefined;
  const previewSplitScrollFraction = scrollSyncMode !== 'off' && scrollState.source !== 'preview'
    ? scrollState.fraction
    : undefined;

  const handleHeadingClick = useCallback((lineNumber: number) => {
    setRevealLineRequest(prev => ({ lineNumber, requestId: prev.requestId + 1 }));
  }, []);

  // 臨 (Rin) focus mode hides all chrome (tabs, outline, folder tree, etc.).
  const showPersistentOutline = outlineDisplayMode === 'persistent' && outlinePanelOpen && activeTab && !rinActive;
  const showOverlayOutline = outlineDisplayMode === 'overlay' && activeTab && !rinActive;

  const showPersistentFolderTree =
    folderTreeDisplayMode === 'persistent' &&
    folderTreePanelOpen &&
    !rinActive;
  const showOverlayFolderTree = folderTreeDisplayMode === 'overlay' && !rinActive;

  // When persistent folder tree is active with vertical tabs, the sidebar also hosts the folder tree.
  const sidebarHasFolderTree = showPersistentFolderTree && tabLayout === 'vertical';
  // Auto-hide (hover) mode applies to the whole vertical sidebar — with or without the folder
  // tree — so toggling the folder tree never changes the pin/hover behavior.
  const sidebarHoverMode = tabLayout === 'vertical' && !tabSidebarPinned && !rinActive;
  // Fixed merged sidebar (tabs + folder tree): vertical, has folder tree, pinned.
  const showMergedLeftSidebar = sidebarHasFolderTree && tabSidebarPinned;
  // Fixed standalone vertical tab bar: vertical, no folder tree, pinned.
  const showStandaloneVerticalTabs = tabLayout === 'vertical' && !sidebarHasFolderTree && tabSidebarPinned && !rinActive;

  // Resizable divider state for merged sidebar
  const {
    sidebarRef,
    topSectionHeight: tabSectionHeight,
    bottomCollapsed: explorerCollapsed,
    isDragging,
    toggleBottomCollapsed: handleExplorerHeaderClick,
    handleDividerMouseDown,
  } = useResizableSidebar();

  // Force Monaco Editor to recalculate layout when persistent panels toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, LAYOUT_SETTLE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [outlinePanelOpen, outlineDisplayMode, folderTreePanelOpen, folderTreeDisplayMode]);

  // Vertical sidebar body, shared by the fixed sidebar and the hover overlay so the
  // pin/hover behavior is identical whether or not the folder tree is merged in.
  // `inOverlay` makes selecting a tab/file also dismiss the overlay.
  const renderVerticalSidebarBody = (inOverlay: boolean) => {
    const afterSelect = inOverlay ? () => setSidebarOverlayOpen(false) : undefined;
    const handleTabChange = (tabId: string) => {
      onTabChange(tabId);
      afterSelect?.();
    };
    const tabBar = (
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={handleTabChange}
        onTabClose={onTabClose}
        onNewTab={onNewTab}
        onTabReorder={onTabReorder}
        onTabRename={onTabRename}
        onToggleTabPinned={onToggleTabPinned}
        onCopyFilePath={onCopyFilePath}
        onCopyFileName={onCopyFileName}
        onCloseOtherTabs={onCloseOtherTabs}
        onCloseTabsToRight={onCloseTabsToRight}
        onCloseAllTabs={onCloseAllTabs}
        closeButtonPosition={tabCloseButtonPosition}
        newButtonPosition={tabNewButtonPosition}
        layout="vertical"
        embedded
        tabSidebarPinned={tabSidebarPinned}
        onToggleSidebarPinned={onToggleSidebarPinned}
      />
    );
    if (!sidebarHasFolderTree) return tabBar;
    return (
      <>
        {/* Open Editors section (vertical tabs) */}
        <Box sx={{
          height: tabSectionHeight,
          minHeight: 0,
          overflow: 'hidden',
          transition: isDragging ? 'none' : 'height 0.2s ease',
        }}>
          {tabBar}
        </Box>
        {/* Draggable divider */}
        <Box
          onMouseDown={handleDividerMouseDown}
          sx={{
            height: SIDEBAR_DIVIDER_HEIGHT_PX,
            cursor: 'row-resize',
            flexShrink: 0,
            bgcolor: 'divider',
            '&:hover': { bgcolor: 'primary.main' },
            transition: 'background-color 0.15s',
          }}
        />
        {/* Explorer section */}
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <FolderTreePanel
            rootFolderName={folderTreeRootFolderName}
            tree={folderTree}
            isLoading={folderTreeIsLoading}
            activeFilePath={activeTab?.filePath}
            onFileClick={(filePath) => {
              onFolderTreeFileClick(filePath);
              afterSelect?.();
            }}
            onToggleExpand={onFolderTreeToggleExpand}
            onOpenFolder={onFolderTreeOpenFolder}
            onCloseFolder={onFolderTreeCloseFolder}
            onRefresh={onFolderTreeRefresh}
            onClose={onFolderTreePanelClose}
            onHeaderClick={handleExplorerHeaderClick}
            collapsed={explorerCollapsed}
            width={SIDEBAR_WIDTH_PX}
            onRenameRequest={onRenameRequest}
          />
        </Box>
      </>
    );
  };

  return (
    <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
      {/* Merged left sidebar (fixed): vertical tabs + folder tree */}
      {showMergedLeftSidebar && (
        <Box
          ref={sidebarRef}
          sx={{
            width: SIDEBAR_WIDTH_PX,
            minWidth: SIDEBAR_WIDTH_PX,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            borderRight: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          {renderVerticalSidebarBody(false)}
        </Box>
      )}

      {/* Standalone vertical tab bar (pinned/fixed) */}
      {showStandaloneVerticalTabs && (
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabChange={onTabChange}
          onTabClose={onTabClose}
          onNewTab={onNewTab}
          onTabReorder={onTabReorder}
          onTabRename={onTabRename}
          onToggleTabPinned={onToggleTabPinned}
          onCopyFilePath={onCopyFilePath}
          onCopyFileName={onCopyFileName}
          onCloseOtherTabs={onCloseOtherTabs}
          onCloseTabsToRight={onCloseTabsToRight}
          onCloseAllTabs={onCloseAllTabs}
          closeButtonPosition={tabCloseButtonPosition}
          newButtonPosition={tabNewButtonPosition}
          layout={tabLayout}
          tabSidebarPinned={tabSidebarPinned}
          onToggleSidebarPinned={onToggleSidebarPinned}
        />
      )}

      {/* Auto-hide (hover) vertical tab sidebar: left-edge zone + nub + sliding overlay */}
      {sidebarHoverMode && (
        <>
          <Box
            onMouseEnter={() => setSidebarOverlayOpen(true)}
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 12,
              zIndex: 1100,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {/* Discoverability nub */}
            <Box
              sx={{
                width: 8,
                height: 80,
                borderRadius: 1,
                bgcolor: 'primary.main',
                opacity: sidebarOverlayOpen ? 0 : 1,
                transition: 'opacity 0.2s',
              }}
            />
          </Box>
          <Box
            ref={sidebarHasFolderTree ? sidebarRef : undefined}
            onMouseLeave={() => setSidebarOverlayOpen(false)}
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: SIDEBAR_WIDTH_PX,
              zIndex: 1101,
              bgcolor: 'background.paper',
              borderRight: 1,
              borderColor: 'divider',
              boxShadow: 6,
              display: 'flex',
              flexDirection: 'column',
              transform: sidebarOverlayOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.2s ease',
            }}
          >
            {renderVerticalSidebarBody(true)}
          </Box>
        </>
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
          onRenameRequest={onRenameRequest}
        />
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {tabLayout === 'horizontal' && !rinActive && (
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={onTabChange}
            onTabClose={onTabClose}
            onNewTab={onNewTab}
            onTabReorder={onTabReorder}
            onTabRename={onTabRename}
            onToggleTabPinned={onToggleTabPinned}
            onCopyFilePath={onCopyFilePath}
            onCopyFileName={onCopyFileName}
            onCloseOtherTabs={onCloseOtherTabs}
            onCloseTabsToRight={onCloseTabsToRight}
            onCloseAllTabs={onCloseAllTabs}
            closeButtonPosition={tabCloseButtonPosition}
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
            <EmptyState
              onNewTab={onNewTab}
              onOpenFile={onOpenFile}
              onRecentFileSelect={onRecentFileSelect}
              t={t}
            />
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
                      darkMode={isDarkTheme(theme as ThemeName)}
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
                      showFormattingBar={editorSettings?.showFormattingBar}
                      showWhitespace={editorSettings?.showWhitespace}
                      tableConversion={editorSettings?.tableConversion}
                      onSnackbar={onSnackbar}
                      onTableConversionSettingChange={onTableConversionSettingChange}
                      onScrollChange={scrollSyncMode !== 'off' ? handleEditorScrollChange : undefined}
                      scrollFraction={editorScrollFraction}
                      tabs={tabs}
                      activeTabId={activeTabId}
                      onTabSwitch={onTabChange}
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
                      darkMode={isDarkTheme(theme as ThemeName)}
                      theme={theme}
                      globalVariables={globalVariables}
                      zoomLevel={currentZoom}
                      onContentChange={onContentChange}
                      scrollFraction={previewSplitScrollFraction}
                      onScrollChange={scrollSyncMode === 'bidirectional' ? handlePreviewScrollChange : undefined}
                      filePath={activeTab.filePath}
                      renderingSettings={renderingSettings}
                      previewSettings={previewSettings}
                      viewMode="split"
                      onOpenSettings={onOpenSettings}
                    />
                  </Box>
                </>
              )}
              {viewMode === 'editor' && (
                <Box sx={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  ...(rinActive && (rinFullWidth
                    // Full width, but keep a gutter on the right so text never sits under the 臨 buttons.
                    ? { width: '100%', pr: '64px' }
                    : { maxWidth: 1000, mx: 'auto', width: '100%' })),
                }}>
                  <Editor
                    content={activeTab.content}
                    onChange={onContentChange}
                    darkMode={isDarkTheme(theme as ThemeName)}
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
                    showFormattingBar={editorSettings?.showFormattingBar}
                    showWhitespace={editorSettings?.showWhitespace}
                    tableConversion={editorSettings?.tableConversion}
                    onSnackbar={onSnackbar}
                    onTableConversionSettingChange={onTableConversionSettingChange}
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onTabSwitch={onTabChange}
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
                    darkMode={isDarkTheme(theme as ThemeName)}
                    theme={theme}
                    globalVariables={globalVariables}
                    zoomLevel={currentZoom}
                    onContentChange={onContentChange}
                    filePath={activeTab.filePath}
                    renderingSettings={renderingSettings}
                    previewSettings={previewSettings}
                    scrollFraction={scrollState.source !== 'preview' ? scrollState.fraction : undefined}
                    onScrollChange={handlePreviewScrollChange}
                    viewMode="preview"
                    onOpenSettings={onOpenSettings}
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
                  PaperProps={{ sx: { width: DRAWER_WIDTH_PX } }}
                >
                  <OutlinePanel
                    headings={headings}
                    onHeadingClick={handleHeadingClick}
                    onClose={onOutlinePanelClose}
                    width={DRAWER_WIDTH_PX}
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
          PaperProps={{ sx: { width: DRAWER_WIDTH_PX } }}
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
            width={DRAWER_WIDTH_PX}
            onRenameRequest={onRenameRequest}
          />
        </Drawer>
      )}
    </Box>
  );
};

export default AppContent;
