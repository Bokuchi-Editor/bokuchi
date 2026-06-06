import { alpha } from '@mui/material/styles';
import type { Palette } from '@mui/material/styles';
import { generateTableLayoutCSS } from '../../utils/exportStyles';
import type { TableLayoutMode } from '../../types/settings';

/**
 * Builds the scoped CSS injected into the in-app markdown preview. The rules
 * are theme-aware (they read MUI palette colours) and include the table-layout
 * rules plus the easter-egg animation keyframes.
 *
 * Kept out of the component body because it is a large, purely derived string
 * that only depends on the palette and the table-layout mode.
 */
export function buildPreviewStyles(palette: Palette, tableLayout: TableLayoutMode): string {
  return `
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
              tableLayout,
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
          `;
}
