import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { Download } from '@mui/icons-material';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import 'highlight.js/styles/github-dark.css';
import { variableApi } from '../api/variableApi';

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

  const handleExportHTML = () => {
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
            background-color: ${darkMode ? '#1a1a1a' : '#ffffff'};
            color: ${darkMode ? '#e0e0e0' : '#333333'};
        }

        h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            font-weight: 600;
        }

        h1 { font-size: 2em; border-bottom: 1px solid ${darkMode ? '#404040' : '#eaecef'}; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; border-bottom: 1px solid ${darkMode ? '#404040' : '#eaecef'}; padding-bottom: 0.3em; }

        p { margin-bottom: 1em; }

        ul, ol { margin-bottom: 1em; padding-left: 2em; }
        li { margin-bottom: 0.25em; }

        blockquote {
            border-left: 4px solid ${darkMode ? '#404040' : '#dfe2e5'};
            padding-left: 1em;
            margin: 1em 0;
            color: ${darkMode ? '#a0a0a0' : '#6a737d'};
        }

        code {
            background-color: ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(27,31,35,0.05)'};
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 85%;
        }

        pre {
            background-color: ${darkMode ? '#2d2d2d' : '#f6f8fa'};
            border-radius: 3px;
            padding: 16px;
            overflow: auto;
            margin: 1em 0;
        }

        pre code {
            background-color: transparent;
            padding: 0;
        }

        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }

        th, td {
            border: 1px solid ${darkMode ? '#404040' : '#dfe2e5'};
            padding: 6px 13px;
        }

        th {
            background-color: ${darkMode ? '#2d2d2d' : '#f6f8fa'};
            font-weight: 600;
        }

        a {
            color: ${darkMode ? '#58a6ff' : '#0366d6'};
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        .hljs {
            background: ${darkMode ? '#2d2d2d' : '#f6f8fa'} !important;
        }
    </style>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css">
</head>
<body>
    ${htmlContent}
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"></script>
    <script>hljs.highlightAll();</script>
</body>
</html>`;

    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'markdown-export.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
          }}
        />
      </Box>
    </Box>
  );
};

export default MarkdownPreview;
