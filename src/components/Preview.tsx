import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import { Box, Typography, IconButton, Tooltip, Snackbar, Alert } from '@mui/material';
import { Download } from '@mui/icons-material';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import 'highlight.js/styles/github-dark.css';
import { variableApi } from '../api/variableApi';
import { desktopApi } from '../api/desktopApi';

interface PreviewProps {
  content: string;
  darkMode: boolean;
  theme?: string;
  globalVariables?: Record<string, string>;
  zoomLevel?: number;
}

const MarkdownPreview: React.FC<PreviewProps> = ({ content, darkMode, theme, globalVariables = {}, zoomLevel = 1.0 }) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const [processedContent, setProcessedContent] = useState(content || '');
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    // シンタックスハイライト用のカスタムレンダラーを設定
    const renderer = new marked.Renderer();

    renderer.code = function({ text, lang }: { text: string; lang?: string; escaped?: boolean }) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          const highlighted = hljs.highlight(text, { language: lang }).value;
          return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
        } catch (err) {
          console.warn('Highlight.js error:', err);
        }
      }
      const highlighted = hljs.highlightAuto(text).value;
      return `<pre><code class="hljs">${highlighted}</code></pre>`;
    };

    // markedの設定
    marked.setOptions({
      breaks: true,
      gfm: true,
      renderer: renderer,
    });

    // 変数を展開
    const processContent = async () => {
      if (content) {
        const result = await variableApi.processMarkdown(content, globalVariables);
        setProcessedContent(result.processedContent);
      } else {
        setProcessedContent('');
      }
    };

    processContent();
  }, [content, globalVariables]);

  useEffect(() => {
    // リンクのクリックイベントを処理
    if (previewRef.current) {
      const links = previewRef.current.querySelectorAll('a');
      links.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const href = link.getAttribute('href');
          if (href) {
            // 外部リンクの場合は新しいタブで開く
            if (href.startsWith('http://') || href.startsWith('https://')) {
              window.open(href, '_blank', 'noopener,noreferrer');
            } else if (href.startsWith('mailto:')) {
              window.location.href = href;
            } else if (href.startsWith('#')) {
              // アンカーリンク
              const target = document.querySelector(href);
              if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
              }
            }
          }
        });
      });
    }
  }, [processedContent]);

  const handleExportHTML = async () => {
    try {
      // シンタックスハイライト用のカスタムレンダラーを設定
      const renderer = new marked.Renderer();

      renderer.code = function({ text, lang }: { text: string; lang?: string; escaped?: boolean }) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            const highlighted = hljs.highlight(text, { language: lang }).value;
            return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
          } catch (err) {
            console.warn('Highlight.js error:', err);
          }
        }
        const highlighted = hljs.highlightAuto(text).value;
        return `<pre><code class="hljs">${highlighted}</code></pre>`;
      };

      const htmlContent = marked(processedContent, {
        breaks: true,
        gfm: true,
        renderer: renderer,
      });

      // テーマに応じた色を決定
      const isDarkTheme = darkMode || theme === 'darcula';
      const backgroundColor = theme === 'darcula' ? '#2B2B2B' : (isDarkTheme ? '#1a1a1a' : '#ffffff');
      const textColor = theme === 'darcula' ? '#A9B7C6' : (isDarkTheme ? '#e0e0e0' : '#333333');
      const codeBackground = theme === 'darcula' ? '#2d2d2d' : (isDarkTheme ? '#2d2d2d' : '#f6f8fa');
      const borderColor = theme === 'darcula' ? '#404040' : (isDarkTheme ? '#404040' : '#eaecef');
      const linkColor = theme === 'darcula' ? '#58a6ff' : (isDarkTheme ? '#58a6ff' : '#0366d6');

      // ローカルのhighlight.jsスタイルを埋め込み（CDNを使用しない）
      const highlightStyle = isDarkTheme ?
        'data:text/css;base64,' + btoa(`
          .hljs{display:block;overflow-x:auto;padding:0.5em;color:#e6edf3;background:#0d1117}.hljs-comment,.hljs-quote{color:#7d8590;font-style:italic}.hljs-addition,.hljs-keyword,.hljs-selector-tag{color:#ff7b72}.hljs-doctag,.hljs-literal,.hljs-meta,.hljs-number,.hljs-regexp,.hljs-string{color:#a5d6ff}.hljs-name,.hljs-section,.hljs-selector-class,.hljs-selector-id,.hljs-title{color:#d2a8ff;font-weight:700}.hljs-attr,.hljs-attribute,.hljs-class .hljs-title,.hljs-template-variable,.hljs-type,.hljs-variable{color:#79c0ff}.hljs-bullet,.hljs-link,.hljs-meta .hljs-keyword,.hljs-selector-attr,.hljs-selector-pseudo,.hljs-symbol,.hljs-title.class_{color:#f2cc60}.hljs-built_in,.hljs-deletion,.hljs-formula,.hljs-function .hljs-title,.hljs-title.function_{color:#d2a8ff}.hljs-emphasis{font-style:italic}.hljs-strong{font-weight:700}.hljs-link{text-decoration:underline}
        `) :
        'data:text/css;base64,' + btoa(`
          .hljs{display:block;overflow-x:auto;padding:0.5em;color:#24292f;background:#f6f8fa}.hljs-doctag,.hljs-keyword,.hljs-meta .hljs-keyword,.hljs-template-tag,.hljs-template-variable,.hljs-type,.hljs-variable.language_{color:#d73a49}.hljs-title,.hljs-title.class_,.hljs-title.class_.inherited__,.hljs-title.function_{color:#6f42c1}.hljs-attr,.hljs-attribute,.hljs-literal,.hljs-meta,.hljs-number,.hljs-operator,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-id,.hljs-variable{color:#005cc5}.hljs-meta .hljs-string,.hljs-regexp,.hljs-string{color:#032f62}.hljs-built_in,.hljs-symbol{color:#e36209}.hljs-code,.hljs-comment,.hljs-formula{color:#6a737d}.hljs-name,.hljs-quote,.hljs-selector-pseudo,.hljs-selector-tag{color:#22863a}.hljs-subst{color:#24292f}.hljs-section{color:#005cc5;font-weight:700}.hljs-bullet{color:#735c0f}.hljs-emphasis{color:#24292f;font-style:italic}.hljs-strong{color:#24292f;font-weight:700}.hljs-addition{color:#22863a;background-color:#f0fff4}.hljs-deletion{color:#b31d28;background-color:#ffeef0}
        `);

      const fullHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Export</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: ${backgroundColor};
            color: ${textColor};
            word-break: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
        }

        h1:first-child,
        h2:first-child,
        h3:first-child,
        h4:first-child,
        h5:first-child,
        h6:first-child {
            margin-top: 0 !important;
        }

        h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            font-weight: 600;
        }

        h1 { font-size: 2em; border-bottom: 1px solid ${borderColor}; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; border-bottom: 1px solid ${borderColor}; padding-bottom: 0.3em; }

        p { margin-bottom: 1em; }

        ul, ol { margin-bottom: 1em; padding-left: 2em; }
        li { margin-bottom: 0.25em; }

        blockquote {
            border-left: 4px solid ${borderColor};
            padding-left: 1em;
            margin: 1em 0;
            color: ${theme === 'darcula' ? '#a0a0a0' : (isDarkTheme ? '#a0a0a0' : '#6a737d')};
        }

        code {
            background-color: ${theme === 'darcula' ? 'rgba(255,255,255,0.1)' : (isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(27,31,35,0.05)')};
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 85%;
            line-height: 1.2;
        }

        pre {
            background-color: ${codeBackground};
            border-radius: 3px;
            padding: 16px;
            overflow: auto;
            margin: 1em 0;
            word-break: break-word;
            overflow-wrap: break-word;
            white-space: pre-wrap;
            line-height: 1.4;
        }

        pre code {
            background-color: transparent;
            padding: 0;
            word-break: break-word;
            overflow-wrap: break-word;
            white-space: pre-wrap;
            line-height: 1.4;
        }

        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
            table-layout: fixed;
            word-break: break-word;
            overflow-wrap: break-word;
        }

        th, td {
            border: 1px solid ${borderColor};
            padding: 6px 13px;
            word-break: break-word;
            overflow-wrap: break-word;
            max-width: 0;
        }

        th {
            background-color: ${codeBackground};
            font-weight: 600;
        }

        a {
            color: ${linkColor};
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        .hljs {
            background: ${codeBackground} !important;
        }
    </style>
    <link rel="stylesheet" href="${highlightStyle}">
</head>
<body>
    ${htmlContent}
    <script>
      // highlight.jsのコア機能を埋め込み（CDNを使用しない）
      (function(){
        var hljs = {
          highlightAll: function() {
            var blocks = document.querySelectorAll('pre code');
            blocks.forEach(function(block) {
              if (block.className.indexOf('hljs') === -1) {
                block.className += ' hljs';
              }
            });
          }
        };
        hljs.highlightAll();
      })();
    </script>
</body>
</html>`;

      // ファイルダイアログで保存場所を選択
      const result = await desktopApi.saveHtmlFile(fullHTML);

      if (!result.success) {
        setExportError(result.error || 'Failed to save HTML file');
      }
    } catch (error) {
      console.error('Error exporting HTML:', error);
      setExportError('Failed to export HTML file');
    }
  };

  // MarkdownをHTMLに変換
  const htmlContent = marked(processedContent || '', {
    breaks: true,
    gfm: true,
  });

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
      <Box
        sx={{
          flex: 1,
          p: 2,
          overflow: 'auto',
          backgroundColor: theme === 'darcula' ? '#2B2B2B' : (darkMode ? 'grey.900' : 'grey.50'),
          color: theme === 'darcula' ? '#A9B7C6' : (darkMode ? 'grey.100' : 'text.primary'),
        }}
      >
        <div
          ref={previewRef}
          className={`markdown-preview ${theme === 'darcula' ? 'hljs-dark' : (darkMode ? 'hljs-dark' : 'hljs-light')}`}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
          style={{
            fontSize: `${Math.round(16 * zoomLevel)}px`,
            lineHeight: `${Math.round(1.6 * zoomLevel)}`,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            hyphens: 'auto',
          }}
        />
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
              border-bottom: 1px solid ${theme === 'darcula' ? '#404040' : (darkMode ? '#404040' : '#eaecef')};
              padding-bottom: 0.3em;
            }

            .markdown-preview h2 {
              font-size: 1.5em;
              border-bottom: 1px solid ${theme === 'darcula' ? '#404040' : (darkMode ? '#404040' : '#eaecef')};
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
              border-left: 4px solid ${theme === 'darcula' ? '#404040' : (darkMode ? '#404040' : '#dfe2e5')};
              padding-left: 1em;
              margin: 1em 0;
              color: ${theme === 'darcula' ? '#a0a0a0' : (darkMode ? '#a0a0a0' : '#6a737d')};
            }

            .markdown-preview code {
              background-color: ${theme === 'darcula' ? 'rgba(255,255,255,0.1)' : (darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(27,31,35,0.05)')};
              padding: 0.2em 0.4em;
              border-radius: 3px;
              font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
              font-size: 85%;
              line-height: 1.2;
            }

                        .markdown-preview pre {
              background-color: ${theme === 'darcula' ? '#2d2d2d' : (darkMode ? '#2d2d2d' : '#f6f8fa')};
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

            .markdown-preview table {
              border-collapse: collapse;
              width: 100%;
              margin: 1em 0;
              table-layout: fixed;
              word-break: break-word;
              overflow-wrap: break-word;
            }

            .markdown-preview th,
            .markdown-preview td {
              border: 1px solid ${theme === 'darcula' ? '#404040' : (darkMode ? '#404040' : '#dfe2e5')};
              padding: 6px 13px;
              word-break: break-word;
              overflow-wrap: break-word;
              max-width: 0;
            }

            .markdown-preview th {
              background-color: ${theme === 'darcula' ? '#2d2d2d' : (darkMode ? '#2d2d2d' : '#f6f8fa')};
              font-weight: 600;
            }

            .markdown-preview a {
              color: ${theme === 'darcula' ? '#58a6ff' : (darkMode ? '#58a6ff' : '#0366d6')};
              text-decoration: none;
            }

            .markdown-preview a:hover {
              text-decoration: underline;
            }
          `}
        </style>
      </Box>

      {/* エラー表示用のSnackbar */}
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
