import React, { useCallback, useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import { Box, Typography, IconButton, Tooltip, Snackbar, Alert } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { Download } from '@mui/icons-material';
import 'highlight.js/styles/github.css';
import 'highlight.js/styles/github-dark.css';
import { variableApi } from '../api/variableApi';
import { desktopApi } from '../api/desktopApi';
import { openUrl } from '@tauri-apps/plugin-opener';
import { readFile } from '@tauri-apps/plugin-fs';
import { RenderingSettings, DEFAULT_RENDERING_SETTINGS, PreviewSettings, DEFAULT_PREVIEW_SETTINGS } from '../types/settings';
import { renderCode, createTableRenderer, processKatex, contentHasKatex, processMermaidBlocks, contentHasMermaid, reinitializeMermaid } from '../utils/markdownRenderers';
import { getCellText, applyCellEdit, getTableDimensions, nextCell, type NavDir } from '../utils/tableFormatter';
import InlineCellEditor from './InlineCellEditor';
import { buildExportHTML, generateTableLayoutCSS } from '../utils/exportStyles';
import { contentIsMarp } from '../utils/marpRenderer';
import { dirnameOf, isAbsoluteUrl, mimeTypeFromPath, resolveRelativePath } from '../utils/imagePathResolver';
import MarpPreview from './MarpPreview';
import RenderingFeatureNotice from './RenderingFeatureNotice';
import { SettingsFocusTarget } from '../types/settingsFocus';

interface PreviewProps {
  content: string;
  darkMode: boolean;
  theme?: string;
  globalVariables?: Record<string, string>;
  zoomLevel?: number;
  onContentChange?: (newContent: string) => void;
  scrollFraction?: number;
  onScrollChange?: (fraction: number) => void;
  filePath?: string;
  renderingSettings?: RenderingSettings;
  previewSettings?: PreviewSettings;
  viewMode?: 'split' | 'editor' | 'preview';
  onOpenSettings?: (target?: SettingsFocusTarget) => void;
}

const BASE_PREVIEW_FONT_SIZE_PX = 16;
const BASE_PREVIEW_LINE_HEIGHT = 1.6;

const MarkdownPreview: React.FC<PreviewProps> = ({ content, darkMode, theme, globalVariables = {}, zoomLevel = 1.0, onContentChange, scrollFraction, onScrollChange, filePath, renderingSettings = DEFAULT_RENDERING_SETTINGS, previewSettings = DEFAULT_PREVIEW_SETTINGS, viewMode = 'split', onOpenSettings }) => {
  const muiTheme = useTheme();
  const { palette } = muiTheme;
  const isMarp = renderingSettings.enableMarp && contentIsMarp(content);
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);
  const [processedContent, setProcessedContent] = useState(content || '');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [exportError, setExportError] = useState<string | null>(null);
  // Inline table-cell editing (#1/#2). `editing` positions the overlay input;
  // `pendingFocusCellRef` carries the next cell to open after a re-render.
  const [editing, setEditing] = useState<{
    ti: number;
    row: number;
    col: number;
    top: number;
    left: number;
    width: number;
    height: number;
    value: string;
  } | null>(null);
  const pendingFocusCellRef = useRef<{ ti: number; row: number; col: number } | null>(null);
  const blobUrlsRef = useRef<string[]>([]);
  // Latest KaTeX placeholder->HTML restore fn for the current processedContent.
  // KaTeX renders to placeholders BEFORE marked and is restored AFTER, so both
  // the preview and the HTML export must run this on marked's output (#354).
  const katexRestoreRef = useRef<(html: string) => string>((html) => html);

  // Revoke all blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      for (const url of blobUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      blobUrlsRef.current = [];
    };
  }, []);

  const contentRef = useRef(content);
  const onContentChangeRef = useRef(onContentChange);
  const lastProcessedInputRef = useRef<string>('');
  contentRef.current = content;
  onContentChangeRef.current = onContentChange;

  useEffect(() => {
    let stale = false;

    // Set up custom renderer for syntax highlighting
    const renderer = new marked.Renderer();
    renderer.code = renderCode;
    // Tag table cells with their source coordinates for inline editing.
    renderer.table = createTableRenderer();

    // Add checkbox functionality (processed in postprocess)

    // Process easter egg fence blocks (:::effect ... :::)
    const processEasterEggBlocks = (markdown: string): string => {
      const easterEggPattern = /^:::(shake|rainbow|glow|bounce|blink)\s*\n([\s\S]*?)^:::\s*$/gm;
      return markdown.replace(easterEggPattern, (_match, effect: string, innerContent: string) => {
        // Convert inner content to simple HTML (escape HTML entities, preserve line breaks)
        const escapedContent = innerContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');
        return `<div class="ee-block ee-${effect}" data-effect="${effect}">${escapedContent}</div>`;
      });
    };

    // Expand variables and convert Markdown to HTML
    const processContent = async () => {
      if (content) {
        // Skip re-processing if input hasn't changed (prevents animation interruption on auto-save)
        const inputKey = content + JSON.stringify(globalVariables) + (filePath || '') + JSON.stringify(renderingSettings) + darkMode + (theme || '');
        if (inputKey === lastProcessedInputRef.current) return;

        const result = await variableApi.processMarkdown(content, globalVariables);
        if (stale) return;
        let processedMarkdown = processEasterEggBlocks(result.processedContent);

        // Process KaTeX math expressions before marked parsing (lazy-loaded).
        // Math is replaced with inert placeholders here and the rendered KaTeX
        // HTML is swapped back in AFTER marked, so marked never sees KaTeX output
        // (which can collide with markdown syntax — e.g. accent tildes; #354).
        let restoreKatex: (html: string) => string = (html) => html;
        if (renderingSettings.enableKatex && contentHasKatex(processedMarkdown)) {
          try {
            const processed = await processKatex(processedMarkdown);
            processedMarkdown = processed.markdown;
            restoreKatex = processed.restore;
          } catch (err) {
            console.warn('KaTeX processing failed, showing raw math syntax:', err);
          }
          if (stale) return;
        }
        katexRestoreRef.current = restoreKatex;

        // Convert Markdown to HTML
        const markedResult = marked(processedMarkdown, {
          breaks: true,
          gfm: true,
          renderer: renderer,
        });

        // Await if marked result is a Promise
        let processedHtml: string;
        if (typeof markedResult === 'string') {
          processedHtml = markedResult;
        } else {
          processedHtml = await markedResult;
        }

        // Swap rendered KaTeX HTML back in for its placeholders.
        processedHtml = restoreKatex(processedHtml);

        // Process Mermaid diagrams (lazy-loaded, after marked parsing)
        if (renderingSettings.enableMermaid && contentHasMermaid(processedMarkdown)) {
          try {
            reinitializeMermaid(darkMode);
            processedHtml = await processMermaidBlocks(processedHtml, darkMode);
          } catch (err) {
            console.warn('Mermaid processing failed, showing raw code blocks:', err);
          }
          if (stale) return;
        }

        // Process checkboxes generated by the marked library

        // Counter to track checkbox positions
        let checkboxIndex = 0;

        // Remove disabled attribute and make checkboxes clickable
        const checkboxPattern = /<li[^>]*>(\s*)<input\s+([^>]*?)(?:disabled="[^"]*")?\s*([^>]*?)type="checkbox"([^>]*?)>(\s*)(.*?)<\/li>/g;

        processedHtml = processedHtml.replace(checkboxPattern, (_match: string, indent: string, beforeType: string, between: string, afterType: string, _afterInput: string, text: string) => {

          // Check if checked attribute exists
          const isChecked = /checked(?:="[^"]*")?/.test(beforeType + between + afterType);
          const checkboxId = `checkbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          const result = `<li class="checkbox-item ${isChecked ? 'checked' : ''}" data-checkbox-id="${checkboxId}" data-checked="${isChecked}" data-indent="${indent.length}" data-checkbox-index="${checkboxIndex}">
            ${indent}<input type="checkbox" ${isChecked ? 'checked' : ''} class="markdown-checkbox" data-checkbox-id="${checkboxId}" data-checkbox-index="${checkboxIndex}">
            <span class="checkbox-text">${text}</span>
          </li>`;
          checkboxIndex++;
          return result;
        });


        // Resolve relative image paths to blob URLs
        if (filePath) {
          const baseDir = dirnameOf(filePath);
          const imgRegex = /<img\s+[^>]*?src="([^"]+)"[^>]*?>/g;
          let imgMatch;
          const replacements = new Map<string, string>();

          const imgPromises: Promise<void>[] = [];
          while ((imgMatch = imgRegex.exec(processedHtml)) !== null) {
            const src = imgMatch[1];
            if (!isAbsoluteUrl(src)) {
              const absolutePath = resolveRelativePath(baseDir, src);
              imgPromises.push(
                readFile(absolutePath).then(data => {
                  const blob = new Blob([data], { type: mimeTypeFromPath(src) });
                  const blobUrl = URL.createObjectURL(blob);
                  replacements.set(src, blobUrl);
                }).catch(err => {
                  console.warn('Failed to load image:', absolutePath, err);
                })
              );
            }
          }

          await Promise.all(imgPromises);
          if (stale) return;

          // Revoke previous blob URLs
          for (const url of blobUrlsRef.current) {
            URL.revokeObjectURL(url);
          }
          blobUrlsRef.current = Array.from(replacements.values());

          for (const [original, blobUrl] of replacements) {
            processedHtml = processedHtml.split(`src="${original}"`).join(`src="${blobUrl}"`);
          }
        }

        lastProcessedInputRef.current = inputKey;
        setProcessedContent(processedMarkdown);
        setHtmlContent(processedHtml);
      } else {
        setProcessedContent('');
        setHtmlContent('');
      }
    };

    processContent();
    return () => { stale = true; };
  }, [content, globalVariables, filePath, renderingSettings, darkMode, theme]);

  // Handle link clicks via event delegation on the container (capture phase).
  // Using delegation avoids the gap between DOM replacement and listener attachment,
  // and capturing ensures we intercept clicks on child elements (e.g. <img> inside <a>)
  // before the default navigation can occur.
  //
  // Depend on `isMarp` because the `<div ref={previewRef}>` is conditionally
  // rendered (the Marp branch returns <MarpPreview/> early). If a Marp tab is
  // active on first mount, previewRef.current is null when the effect runs;
  // toggling to a non-Marp tab later mounts the div, and we need the effect
  // to re-run so the listener actually attaches.
  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (!link || !container.contains(link)) return;

      e.preventDefault();
      e.stopPropagation();

      const href = link.getAttribute('href');
      if (href) {
        if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
          openUrl(href).catch(err => {
            console.error('Failed to open URL:', href, err);
          });
        } else if (href.startsWith('#')) {
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    };

    container.addEventListener('click', handler, true);
    return () => container.removeEventListener('click', handler, true);
  }, [isMarp]);

  // Handle checkbox toggle via event delegation on the container.
  // The container element itself persists across dangerouslySetInnerHTML updates,
  // so a single listener reliably catches events from dynamically replaced children.
  // See the link-click effect above for why we depend on `isMarp`.
  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    const handleCheckboxChange = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement) || !target.classList.contains('markdown-checkbox')) return;

      e.stopPropagation();
      const isChecked = target.checked;

      const checkboxItem = target.closest('.checkbox-item');
      if (checkboxItem) {
        checkboxItem.classList.toggle('checked', isChecked);
      }

      const currentOnContentChange = onContentChangeRef.current;
      if (!currentOnContentChange) return;

      const checkboxIndex = parseInt(target.getAttribute('data-checkbox-index') || '0');
      const lines = contentRef.current.split(/\r?\n/);
      let currentIndex = 0;

      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^(\s*)([-*]\s+)\[([ x])\]\s+(.*)$/);
        if (match) {
          if (currentIndex === checkboxIndex) {
            const [, indent, listMarker, , rest] = match;
            lines[i] = `${indent}${listMarker}[${isChecked ? 'x' : ' '}] ${rest}`;
            currentOnContentChange(lines.join('\n'));
            return;
          }
          currentIndex++;
        }
      }
    };

    container.addEventListener('change', handleCheckboxChange);
    return () => container.removeEventListener('change', handleCheckboxChange);
  }, [isMarp]);

  // --- Inline table-cell editing (#1) and cell navigation (#2) ---

  const editingRef = useRef(editing);
  editingRef.current = editing;

  // Open the overlay editor over a given preview cell, seeded with the raw
  // (unescaped) source cell text.
  const openEditorForCell = useCallback((cellEl: HTMLElement) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const ti = Number(cellEl.getAttribute('data-bk-table'));
    const row = Number(cellEl.getAttribute('data-bk-row'));
    const col = Number(cellEl.getAttribute('data-bk-col'));
    if (Number.isNaN(ti) || Number.isNaN(row) || Number.isNaN(col)) return;
    const value = getCellText(contentRef.current, ti, row, col) ?? '';
    const cRect = container.getBoundingClientRect();
    const r = cellEl.getBoundingClientRect();
    setEditing({
      ti,
      row,
      col,
      top: r.top - cRect.top + container.scrollTop,
      left: r.left - cRect.left + container.scrollLeft,
      width: r.width,
      height: r.height,
      value,
    });
  }, []);

  // Open the cell recorded in pendingFocusCellRef (after a re-render).
  const focusPendingCell = useCallback(() => {
    const pending = pendingFocusCellRef.current;
    if (!pending) return;
    pendingFocusCellRef.current = null;
    const cell = previewRef.current?.querySelector<HTMLElement>(
      `[data-bk-table="${pending.ti}"][data-bk-row="${pending.row}"][data-bk-col="${pending.col}"]`,
    );
    if (cell) openEditorForCell(cell);
  }, [openEditorForCell]);

  // Closing the overlay shifts focus back to the body; some engines scroll the
  // container as a result. Snapshot the scroll position and restore it next
  // frame so the preview never jumps when an edit ends.
  const preserveScrollAcrossClose = useCallback(() => {
    const c = scrollContainerRef.current;
    if (!c) return;
    const st = c.scrollTop;
    const sl = c.scrollLeft;
    const restore = () => {
      const c2 = scrollContainerRef.current;
      if (!c2) return;
      if (Math.abs(c2.scrollTop - st) > 1 || Math.abs(c2.scrollLeft - sl) > 1) {
        c2.scrollTop = st;
        c2.scrollLeft = sl;
      }
    };
    // Re-assert over a couple of frames: the blur-driven "scroll caret into
    // view" can run asynchronously after a single-frame restore.
    restore();
    requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
    });
  }, []);

  const handleCellCommit = useCallback((value: string, dir: NavDir | null) => {
    const cur = editingRef.current;
    if (!cur) return;
    const { ti, row, col } = cur;
    const baseContent = contentRef.current;
    // Only touch the source when the trimmed cell text actually changed. Pure
    // navigation (Tab/Enter without edits) must not rewrite the source — that
    // would change whitespace without changing the rendered HTML and stall the
    // re-render-driven navigation below.
    const original = getCellText(baseContent, ti, row, col) ?? '';
    const trimmed = value.trim();
    const updated = trimmed === original ? null : applyCellEdit(baseContent, ti, row, col, trimmed);
    const changed = updated !== null && updated !== baseContent;
    const effectiveContent = updated ?? baseContent;

    let target: { row: number; col: number } | null = null;
    if (dir) {
      const dims = getTableDimensions(effectiveContent, ti);
      if (dims) target = nextCell(row, col, dims.rows, dims.cols, dir);
    }

    if (changed) onContentChangeRef.current?.(updated!);

    if (target) {
      // Navigate to the adjacent cell. Keep the overlay MOUNTED (don't null it
      // out) so the input never re-focuses — only its position/value change,
      // which avoids the focus-driven scroll jump.
      pendingFocusCellRef.current = { ti, row: target.row, col: target.col };
      // No content change → no re-render to consume the pending focus, move now.
      if (!changed) requestAnimationFrame(() => focusPendingCell());
    } else {
      // Editing ends — guard against a focus-shift scroll jump, then close.
      preserveScrollAcrossClose();
      setEditing(null);
    }
  }, [focusPendingCell, preserveScrollAcrossClose]);

  const handleCellCancel = useCallback(() => {
    pendingFocusCellRef.current = null;
    preserveScrollAcrossClose();
    setEditing(null);
  }, [preserveScrollAcrossClose]);

  // Double-click a table cell to edit it in place.
  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;
    const handler = (e: Event) => {
      if (!onContentChangeRef.current) return;
      const target = e.target as HTMLElement;
      const cell = target.closest<HTMLElement>('[data-bk-table]');
      if (!cell || !container.contains(cell)) return;
      e.preventDefault();
      openEditorForCell(cell);
    };
    container.addEventListener('dblclick', handler);
    return () => container.removeEventListener('dblclick', handler);
  }, [isMarp, openEditorForCell]);

  // After a re-render caused by a committed edit, open the next cell (#2).
  useEffect(() => {
    if (pendingFocusCellRef.current) {
      requestAnimationFrame(() => focusPendingCell());
    }
  }, [htmlContent, focusPendingCell]);

  // Sync scroll from editor
  useEffect(() => {
    if (scrollFraction === undefined || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll <= 0) return;
    const targetScroll = scrollFraction * maxScroll;
    if (Math.abs(container.scrollTop - targetScroll) < 1) return;
    isProgrammaticScrollRef.current = true;
    container.scrollTop = targetScroll;
    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false;
    });
  }, [scrollFraction]);

  // Report scroll position back to parent
  useEffect(() => {
    if (!onScrollChange || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const handleScroll = () => {
      // Skip events triggered by our own programmatic scroll to avoid feedback loops
      if (isProgrammaticScrollRef.current) return;
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll > 0) {
        onScrollChange(container.scrollTop / maxScroll);
      }
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [onScrollChange]);

  const handleExportHTML = async () => {
    try {
      // Set up custom renderer for syntax highlighting
      const renderer = new marked.Renderer();
      renderer.code = renderCode;

      let exportHtml: string;
      const markedExportResult = marked(processedContent, {
        breaks: true,
        gfm: true,
        renderer: renderer,
      });
      if (typeof markedExportResult === 'string') {
        exportHtml = markedExportResult;
      } else {
        exportHtml = await markedExportResult;
      }

      // processedContent holds KaTeX placeholders; restore the rendered HTML
      // after marked (same as the preview path).
      exportHtml = katexRestoreRef.current(exportHtml);

      // Process Mermaid diagrams for export (renders as inline SVG)
      if (renderingSettings.enableMermaid && contentHasMermaid(processedContent)) {
        exportHtml = await processMermaidBlocks(exportHtml, darkMode);
      }

      const fullHTML = buildExportHTML(exportHtml, darkMode, theme, previewSettings.tableLayout);

      // Select save location via file dialog
      const result = await desktopApi.saveHtmlFile(fullHTML);

      if (!result.success) {
        setExportError(result.error || 'Failed to save HTML file');
      }
    } catch (error) {
      console.error('Error exporting HTML:', error);
      setExportError('Failed to export HTML file');
    }
  };

  // htmlContent is managed by useState, so removed here

  // Delegate to MarpPreview for Marp presentations
  if (isMarp) {
    return <MarpPreview content={content} darkMode={darkMode} theme={theme} globalVariables={globalVariables} zoomLevel={zoomLevel} scrollFraction={scrollFraction} filePath={filePath} viewMode={viewMode} />;
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
        ref={scrollContainerRef}
        sx={{
          flex: 1,
          p: 2,
          overflow: 'auto',
          position: 'relative',
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
        {/* CRT scanline + vignette overlay styles for AS/400 theme */}
        <style>
          {`
            .markdown-preview {
              word-break: break-word;
              overflow-wrap: break-word;
              hyphens: auto;
              max-width: 100%;
              overflow-x: hidden;
            }

            .markdown-preview * {
              word-break: break-word;
              overflow-wrap: break-word;
              max-width: 100%;
            }

            .markdown-preview img {
              max-width: 100%;
              height: auto;
              -webkit-user-drag: none;
              user-drag: none;
            }

            .markdown-preview h1:first-child,
            .markdown-preview h2:first-child,
            .markdown-preview h3:first-child,
            .markdown-preview h4:first-child,
            .markdown-preview h5:first-child,
            .markdown-preview h6:first-child {
              margin-top: 0 !important;
            }

            .markdown-preview h1,
            .markdown-preview h2,
            .markdown-preview h3,
            .markdown-preview h4,
            .markdown-preview h5,
            .markdown-preview h6 {
              margin-top: 1.5em;
              margin-bottom: 0.5em;
              font-weight: 600;
            }

            .markdown-preview h1 {
              font-size: 2em;
              border-bottom: 1px solid ${palette.divider};
              padding-bottom: 0.3em;
            }

            .markdown-preview h2 {
              font-size: 1.5em;
              border-bottom: 1px solid ${palette.divider};
              padding-bottom: 0.3em;
            }

            .markdown-preview p {
              margin-bottom: 1em;
            }

            .markdown-preview ul,
            .markdown-preview ol {
              margin-bottom: 1em;
              padding-left: 2em;
            }

            .markdown-preview li {
              margin-bottom: 0.25em;
            }

            .markdown-preview blockquote {
              border-left: 4px solid ${palette.divider};
              padding-left: 1em;
              margin: 1em 0;
              color: ${palette.text.secondary};
            }

            .markdown-preview code {
              background-color: ${alpha(palette.text.primary, 0.08)};
              padding: 0.2em 0.4em;
              border-radius: 3px;
              font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
              font-size: 85%;
              line-height: 1.2;
            }

                        .markdown-preview pre {
              background-color: var(--color-pre-background);
              border-radius: 3px;
              padding: 16px;
              overflow: auto;
              margin: 1em 0;
              line-height: 1.4;
              word-break: break-word;
              overflow-wrap: break-word;
              white-space: pre-wrap;
            }

            .markdown-preview pre code {
              background-color: transparent;
              padding: 0;
              line-height: 1.4;
              word-break: break-word;
              overflow-wrap: break-word;
              white-space: pre-wrap;
            }

            ${generateTableLayoutCSS(
              previewSettings.tableLayout,
              '.markdown-preview ',
              'var(--color-border)',
              'var(--color-pre-background)',
            )}

            .markdown-preview a {
              color: ${palette.primary.main};
              text-decoration: none;
            }

            .markdown-preview a:hover {
              text-decoration: underline;
            }

            /* Mermaid diagrams */
            .mermaid-diagram {
              display: flex;
              justify-content: center;
              margin: 1em 0;
              overflow-x: auto;
            }

            .mermaid-diagram svg {
              max-width: 100%;
              height: auto;
            }

            .mermaid-error {
              margin: 1em 0;
            }

            /* Easter egg blocks */
            .ee-block {
              padding: 1em;
              margin: 1em 0;
              border-radius: 4px;
            }

            /* :::shake */
            .ee-shake {
              animation: ee-shake 0.5s ease-in-out infinite;
              display: inline-block;
              border: 1px solid rgba(255,0,0,0.2);
              border-radius: 4px;
            }

            @keyframes ee-shake {
              0%, 100% { transform: translateX(0) }
              10% { transform: translateX(-2px) rotate(-0.5deg) }
              20% { transform: translateX(2px) rotate(0.5deg) }
              30% { transform: translateX(-2px) rotate(-0.5deg) }
              40% { transform: translateX(2px) rotate(0.5deg) }
              50% { transform: translateX(-1px) rotate(-0.3deg) }
              60% { transform: translateX(1px) rotate(0.3deg) }
              70% { transform: translateX(-1px) }
              80% { transform: translateX(1px) }
              90% { transform: translateX(0) }
            }

            /* :::rainbow */
            .ee-rainbow {
              background: linear-gradient(
                90deg,
                #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff, #ff0088, #ff0000
              );
              background-size: 400% 100%;
              -webkit-background-clip: text;
              background-clip: text;
              -webkit-text-fill-color: transparent;
              animation: ee-rainbow 4s linear infinite;
            }

            @keyframes ee-rainbow {
              0% { background-position: 0% 50% }
              100% { background-position: 400% 50% }
            }

            /* :::glow */
            .ee-glow {
              animation: ee-glow 2s ease-in-out infinite;
            }

            @keyframes ee-glow {
              0%, 100% {
                text-shadow:
                  0 0 4px currentColor,
                  0 0 8px currentColor;
              }
              50% {
                text-shadow:
                  0 0 8px currentColor,
                  0 0 20px currentColor,
                  0 0 40px currentColor;
              }
            }

            /* :::bounce */
            .ee-bounce {
              display: inline-block;
              animation: ee-bounce 1.5s ease-in-out infinite;
            }

            @keyframes ee-bounce {
              0%, 100% { transform: translateY(0) }
              25% { transform: translateY(-6px) }
              50% { transform: translateY(0) }
              75% { transform: translateY(-3px) }
            }

            /* :::blink */
            .ee-blink {
              animation: ee-blink 1s step-end infinite;
            }

            @keyframes ee-blink {
              0%, 100% { opacity: 1 }
              50% { opacity: 0 }
            }
          `}
        </style>

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
      </Box>

      {/* Snackbar for error display */}
      <Snackbar
        open={!!exportError}
        autoHideDuration={6000}
        onClose={() => setExportError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setExportError(null)} severity="error" sx={{ width: '100%' }}>
          {exportError}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MarkdownPreview;
