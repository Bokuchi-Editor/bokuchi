import React, { useRef, useEffect } from 'react';
import { Box, Typography, IconButton, Tooltip, Snackbar, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { Download, GridOn } from '@mui/icons-material';
import 'highlight.js/styles/github.css';
import 'highlight.js/styles/github-dark.css';
import { RenderingSettings, DEFAULT_RENDERING_SETTINGS, PreviewSettings, DEFAULT_PREVIEW_SETTINGS } from '../types/settings';
import InlineCellEditor from './InlineCellEditor';
import TableEditModal from './TableEditModal';
import { contentIsMarp } from '../utils/marpRenderer';
import MarpPreview from './MarpPreview';
import RenderingFeatureNotice from './RenderingFeatureNotice';
import { SettingsFocusTarget } from '../types/settingsFocus';
import { buildPreviewStyles } from './preview/previewStyles';
import { useProcessedMarkdown } from './preview/useProcessedMarkdown';
import { usePreviewScrollSync } from './preview/usePreviewScrollSync';
import { usePreviewLinkClicks } from './preview/usePreviewLinkClicks';
import { usePreviewCheckboxToggle } from './preview/usePreviewCheckboxToggle';
import { useTablePreviewEditing } from './preview/useTablePreviewEditing';
import { useHtmlExport } from './preview/useHtmlExport';

interface PreviewProps {
  content: string;
  darkMode: boolean;
  theme?: string;
  globalVariables?: Record<string, string>;
  zoomLevel?: number;
  onContentChange?: (newContent: string) => void;
  scrollFraction?: number;
  onScrollChange?: (fraction: number) => void;
  /**
   * Scroll the preview to the Nth heading. Used in preview-only mode where there
   * is no Monaco editor to drive the jump from an outline click (#376).
   */
  revealHeadingRequest?: { index: number; requestId: number };
  filePath?: string;
  renderingSettings?: RenderingSettings;
  previewSettings?: PreviewSettings;
  viewMode?: 'split' | 'editor' | 'preview';
  onOpenSettings?: (target?: SettingsFocusTarget) => void;
}

const BASE_PREVIEW_FONT_SIZE_PX = 16;
const BASE_PREVIEW_LINE_HEIGHT = 1.6;
const EXPORT_ERROR_AUTO_HIDE_MS = 6000;

const MarkdownPreview: React.FC<PreviewProps> = ({ content, darkMode, theme, globalVariables = {}, zoomLevel = 1.0, onContentChange, scrollFraction, onScrollChange, revealHeadingRequest, filePath, renderingSettings = DEFAULT_RENDERING_SETTINGS, previewSettings = DEFAULT_PREVIEW_SETTINGS, viewMode = 'split', onOpenSettings }) => {
  const muiTheme = useTheme();
  const { palette } = muiTheme;
  const { t } = useTranslation();
  const isMarp = renderingSettings.enableMarp && contentIsMarp(content);
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Always-current mirrors of the latest content/callback, so the event-driven
  // hooks (checkbox toggle, table editing) read fresh values without re-binding.
  const contentRef = useRef(content);
  const onContentChangeRef = useRef(onContentChange);
  contentRef.current = content;
  onContentChangeRef.current = onContentChange;

  const { processedContent, htmlContent, katexRestoreRef } = useProcessedMarkdown({
    content,
    globalVariables,
    filePath,
    renderingSettings,
    darkMode,
    theme,
  });

  const setScrollContainer = usePreviewScrollSync(scrollContainerRef, scrollFraction, onScrollChange);
  usePreviewLinkClicks(previewRef, isMarp);
  usePreviewCheckboxToggle({ previewRef, isMarp, contentRef, onContentChangeRef });

  const {
    editing,
    tableHover,
    editTable,
    cancelHoverHide,
    scheduleHoverHide,
    openTableEditor,
    handleCellCommit,
    handleCellCancel,
    handleTableApply,
    closeTableEditor,
  } = useTablePreviewEditing({
    previewRef,
    scrollContainerRef,
    contentRef,
    onContentChangeRef,
    htmlContent,
    isMarp,
  });

  const { exportError, clearExportError, handleExportHTML } = useHtmlExport({
    processedContent,
    katexRestoreRef,
    renderingSettings,
    darkMode,
    theme,
    tableLayout: previewSettings.tableLayout,
  });

  // Outline jump in preview-only mode: scroll to the clicked heading. The
  // outline's Nth item maps to the Nth rendered heading element (#376). Deps are
  // intentionally limited to requestId so editing content does not re-trigger a
  // jump; by the time the user clicks the outline the headings are rendered.
  useEffect(() => {
    if (!revealHeadingRequest || revealHeadingRequest.requestId === 0) return;
    const root = previewRef.current;
    if (!root) return;
    const headingEls = root.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const target = headingEls[revealHeadingRequest.index];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [revealHeadingRequest?.requestId]);

  // Delegate to MarpPreview for Marp presentations
  if (isMarp) {
    return <MarpPreview content={content} darkMode={darkMode} theme={theme} globalVariables={globalVariables} zoomLevel={zoomLevel} scrollFraction={scrollFraction} onScrollChange={onScrollChange} filePath={filePath} viewMode={viewMode} marpThemeFolder={renderingSettings.marpThemeFolder} />;
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" color="text.secondary">
          Preview
        </Typography>
        <Tooltip title="Export as HTML">
          <IconButton size="small" onClick={handleExportHTML}>
            <Download />
          </IconButton>
        </Tooltip>
      </Box>
      <RenderingFeatureNotice
        content={content}
        filePath={filePath}
        renderingSettings={renderingSettings}
        onOpenSettings={onOpenSettings}
      />
      <Box
        ref={setScrollContainer}
        sx={{
          flex: 1,
          p: 2,
          overflow: 'auto',
          position: 'relative',
          // New stacking context so no preview-internal z-index can paint over
          // the app chrome (defense-in-depth backing up sanitizeUserHtml, which
          // already strips overlay positioning from user style attributes).
          isolation: 'isolate',
          backgroundColor: palette.background.default,
          color: palette.text.primary,
          ...(theme === 'as400' ? {
            background: 'repeating-linear-gradient(0deg, #000000 0px, #000000 4px, rgba(0,255,0,0.2) 4px, rgba(0,255,0,0.2) 5px)',
          } : {}),
        }}
      >
        <div
          ref={previewRef}
          className={`markdown-preview ${darkMode ? 'hljs-dark' : 'hljs-light'}`}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
          style={{
            // `transform` makes this div the containing block for any
            // `position: fixed` descendant, so an injected overlay is confined to
            // the preview pane instead of covering the whole window. `scale(1)` is
            // a visual no-op. Defense-in-depth: sanitizeUserHtml already removes
            // overlay positioning, this is the second wall if anything slips past.
            transform: 'scale(1)',
            fontSize: `${Math.round(BASE_PREVIEW_FONT_SIZE_PX * zoomLevel)}px`,
            lineHeight: `${Math.round(BASE_PREVIEW_LINE_HEIGHT * zoomLevel)}`,
            fontFamily: theme === 'as400'
              ? '"IBM Plex Mono", "Courier New", Courier, monospace'
              : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            hyphens: 'auto',
            ...(theme === 'as400' ? { textShadow: '0 0 4px rgba(0,255,0,0.6)' } : {}),
          }}
        />
        {/* Theme-aware preview styles + easter-egg animations */}
        <style>{buildPreviewStyles(palette, previewSettings.tableLayout)}</style>

        {editing && (
          <InlineCellEditor
            cellKey={`${editing.ti}-${editing.row}-${editing.col}`}
            top={editing.top}
            left={editing.left}
            width={editing.width}
            height={editing.height}
            initialValue={editing.value}
            fontSize={Math.round(BASE_PREVIEW_FONT_SIZE_PX * zoomLevel)}
            background={palette.background.paper}
            color={palette.text.primary}
            onCommit={handleCellCommit}
            onCancel={handleCellCancel}
          />
        )}

        {tableHover && !editing && (
          <Tooltip title={t('tableEditor.editTableTooltip')}>
            <IconButton
              size="small"
              onMouseEnter={cancelHoverHide}
              onMouseLeave={scheduleHoverHide}
              onClick={() => openTableEditor(tableHover.ti)}
              sx={{
                position: 'absolute',
                top: tableHover.top,
                left: tableHover.left,
                zIndex: 4,
                p: 0.5,
                bgcolor: 'background.paper',
                boxShadow: 1,
                '&:hover': { bgcolor: 'background.paper' },
              }}
            >
              <GridOn fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {editTable && (
        <TableEditModal
          table={editTable.table}
          onApply={handleTableApply}
          onClose={closeTableEditor}
        />
      )}

      {/* Snackbar for error display */}
      <Snackbar
        open={!!exportError}
        autoHideDuration={EXPORT_ERROR_AUTO_HIDE_MS}
        onClose={clearExportError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={clearExportError} severity="error" sx={{ width: '100%' }}>
          {exportError}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MarkdownPreview;
