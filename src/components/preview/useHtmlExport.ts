import { useState, type MutableRefObject } from 'react';
import { marked } from 'marked';
import { desktopApi } from '../../api/desktopApi';
import type { RenderingSettings, TableLayoutMode } from '../../types/settings';
import { renderCode, contentHasMermaid, processMermaidBlocks } from '../../utils/markdownRenderers';
import { buildExportHTML } from '../../utils/exportStyles';
import { sanitizeUserHtml } from '../../utils/sanitizeHtml';
import { fixCjkEmphasis, stripCjkEmphasisMarker } from '../../utils/cjkEmphasis';

// A4 page geometry in inches (210×297mm). Margins are applied via the CSS
// @page box (WebKit honours those for the page margin), so the native margin
// is kept at 0 to avoid doubling them.
const A4_PAGE = { widthInch: 8.27, heightInch: 11.69, marginInch: 0 };

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
  handleExportPDF: () => Promise<void>;
}

/** Renders the current document to standalone HTML, for either file export or PDF printing. */
export function useHtmlExport({
  processedContent,
  katexRestoreRef,
  renderingSettings,
  darkMode,
  theme,
  tableLayout,
}: UseHtmlExportParams): UseHtmlExport {
  const [exportError, setExportError] = useState<string | null>(null);

  // Render the markdown body to HTML (syntax highlighting, KaTeX, Mermaid) and
  // resolve the KaTeX stylesheet lazily. Shared by both the HTML and PDF paths
  // so they always produce the same document.
  // `mermaidDark` controls the Mermaid color theme: the HTML export follows the
  // app's dark mode, but the PDF export forces light (Default theme) so the
  // diagram colors match the rest of the white-background PDF.
  const buildBody = async (mermaidDark: boolean): Promise<{ html: string; katexCss?: string }> => {
    const renderer = new marked.Renderer();
    renderer.code = renderCode;

    // fixCjkEmphasis matches the preview path so emphasis renders for CJK
    // prose (#400); the invisible markers are stripped right after marked.
    const markedResult = marked(fixCjkEmphasis(processedContent), {
      breaks: true,
      gfm: true,
      renderer: renderer,
    });
    let html = typeof markedResult === 'string' ? markedResult : await markedResult;
    html = stripCjkEmphasisMarker(html);

    // Sanitize the user HTML before splicing in trusted KaTeX/Mermaid output
    // (see sanitizeUserHtml / the preview path for why ordering matters).
    html = sanitizeUserHtml(html);

    // processedContent holds KaTeX placeholders; restore the rendered HTML
    // after marked (same as the preview path).
    html = katexRestoreRef.current(html);

    // Process Mermaid diagrams for export (renders as inline SVG)
    if (renderingSettings.enableMermaid && contentHasMermaid(processedContent)) {
      html = await processMermaidBlocks(html, mermaidDark);
    }

    // Inline KaTeX's CSS + fonts only when the output actually contains a
    // rendered equation, so math-free exports don't carry the font payload.
    let katexCss: string | undefined;
    if (html.includes('class="katex')) {
      katexCss = (await import('../../utils/katexExportCss')).KATEX_EXPORT_CSS;
    }

    return { html, katexCss };
  };

  const handleExportHTML = async () => {
    try {
      const { html, katexCss } = await buildBody(darkMode);
      const fullHTML = buildExportHTML(html, darkMode, theme, tableLayout, katexCss);

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

  const handleExportPDF = async () => {
    try {
      // Force the Default (light) theme for PDF: render Mermaid light, and
      // buildExportHTML (forPrint) maps colors/syntax to the Default theme.
      const { html, katexCss } = await buildBody(false);
      const fullHTML = buildExportHTML(html, darkMode, theme, tableLayout, katexCss, {
        forPrint: true,
      });
      // Render + print to PDF natively (Rust side); the page is saved to the
      // location chosen in the file dialog.
      const result = await desktopApi.exportPdfFile(fullHTML, A4_PAGE);
      if (!result.success && result.error !== 'Save cancelled by user') {
        setExportError(result.error || 'Failed to export PDF file');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setExportError('Failed to export PDF file');
    }
  };

  return {
    exportError,
    clearExportError: () => setExportError(null),
    handleExportHTML,
    handleExportPDF,
  };
}
