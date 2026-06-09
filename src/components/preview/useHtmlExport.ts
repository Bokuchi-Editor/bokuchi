import { useState, type MutableRefObject } from 'react';
import { marked } from 'marked';
import { desktopApi } from '../../api/desktopApi';
import type { RenderingSettings, TableLayoutMode } from '../../types/settings';
import { renderCode, contentHasMermaid, processMermaidBlocks } from '../../utils/markdownRenderers';
import { buildExportHTML } from '../../utils/exportStyles';
import { sanitizeUserHtml } from '../../utils/sanitizeHtml';

interface UseHtmlExportParams {
  /** Processed markdown (with KaTeX placeholders) — same input the preview rendered. */
  processedContent: string;
  katexRestoreRef: MutableRefObject<(html: string) => string>;
  renderingSettings: RenderingSettings;
  darkMode: boolean;
  theme?: string;
  tableLayout: TableLayoutMode;
}

interface UseHtmlExport {
  exportError: string | null;
  clearExportError: () => void;
  handleExportHTML: () => Promise<void>;
}

/** Renders the current document to a standalone HTML file and saves it via a file dialog. */
export function useHtmlExport({
  processedContent,
  katexRestoreRef,
  renderingSettings,
  darkMode,
  theme,
  tableLayout,
}: UseHtmlExportParams): UseHtmlExport {
  const [exportError, setExportError] = useState<string | null>(null);

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

      // Sanitize the user HTML before splicing in trusted KaTeX/Mermaid output
      // (see sanitizeUserHtml / the preview path for why ordering matters).
      exportHtml = sanitizeUserHtml(exportHtml);

      // processedContent holds KaTeX placeholders; restore the rendered HTML
      // after marked (same as the preview path).
      exportHtml = katexRestoreRef.current(exportHtml);

      // Process Mermaid diagrams for export (renders as inline SVG)
      if (renderingSettings.enableMermaid && contentHasMermaid(processedContent)) {
        exportHtml = await processMermaidBlocks(exportHtml, darkMode);
      }

      // Inline KaTeX's CSS + fonts only when the output actually contains a
      // rendered equation, so math-free exports don't carry the font payload.
      // Without this the export has no KaTeX styles and math renders broken.
      let katexCss: string | undefined;
      if (exportHtml.includes('class="katex')) {
        katexCss = (await import('../../utils/katexExportCss')).KATEX_EXPORT_CSS;
      }

      const fullHTML = buildExportHTML(exportHtml, darkMode, theme, tableLayout, katexCss);

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

  return {
    exportError,
    clearExportError: () => setExportError(null),
    handleExportHTML,
  };
}
