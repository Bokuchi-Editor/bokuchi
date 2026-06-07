import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { variableApi } from '../../api/variableApi';
import type { RenderingSettings } from '../../types/settings';
import {
  renderCode,
  createTableRenderer,
  processKatex,
  contentHasKatex,
  processMermaidBlocks,
  contentHasMermaid,
  reinitializeMermaid,
} from '../../utils/markdownRenderers';
import { processEasterEggBlocks, transformCheckboxes, resolveImagePaths } from './previewHtmlProcessing';

interface UseProcessedMarkdownParams {
  content: string;
  globalVariables: Record<string, string>;
  filePath?: string;
  renderingSettings: RenderingSettings;
  darkMode: boolean;
  theme?: string;
}

interface UseProcessedMarkdownResult {
  /** Markdown after variable/easter-egg/KaTeX-placeholder processing (input to marked / export). */
  processedContent: string;
  /** Final HTML rendered into the preview. */
  htmlContent: string;
  /** Restores rendered KaTeX HTML into placeholders; must run on marked output (preview & export). */
  katexRestoreRef: MutableRefObject<(html: string) => string>;
}

/**
 * Runs the full markdown → HTML pipeline (variable expansion, easter-egg blocks,
 * KaTeX placeholders, marked, KaTeX restore, Mermaid, checkbox rewrite, relative
 * image resolution) and exposes the processed markdown and rendered HTML.
 */
export function useProcessedMarkdown({
  content,
  globalVariables,
  filePath,
  renderingSettings,
  darkMode,
  theme,
}: UseProcessedMarkdownParams): UseProcessedMarkdownResult {
  const [processedContent, setProcessedContent] = useState(content || '');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const blobUrlsRef = useRef<string[]>([]);
  const lastProcessedInputRef = useRef<string>('');
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

  useEffect(() => {
    let stale = false;

    // Set up custom renderer for syntax highlighting
    const renderer = new marked.Renderer();
    renderer.code = renderCode;
    // Tag table cells with their source coordinates for inline editing.
    renderer.table = createTableRenderer();

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

        // XSS sanitize marked output BEFORE KaTeX/Mermaid add their trusted HTML.
        // Mermaid SVGs contain <style> elements that DOMPurify strips, and KaTeX
        // output includes inline styles — sanitizing first avoids breaking them.
        processedHtml = DOMPurify.sanitize(processedHtml, { ADD_ATTR: ['style', 'target'] });

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

        // Make checkboxes clickable and index them for source mapping.
        processedHtml = transformCheckboxes(processedHtml);

        // Resolve relative image paths to blob URLs
        if (filePath) {
          const resolved = await resolveImagePaths(processedHtml, filePath);
          if (stale) return;

          // Revoke previous blob URLs
          for (const url of blobUrlsRef.current) {
            URL.revokeObjectURL(url);
          }
          blobUrlsRef.current = resolved.blobUrls;
          processedHtml = resolved.html;
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

  return { processedContent, htmlContent, katexRestoreRef };
}
