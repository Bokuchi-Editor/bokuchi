import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { NavigateBefore, NavigateNext, Fullscreen, FullscreenExit } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { readFile } from '@tauri-apps/plugin-fs';
import { variableApi } from '../api/variableApi';
import { renderMarp, buildSlideDocument, buildAllSlidesDocument } from '../utils/marpRenderer';

interface MarpPreviewProps {
  content: string;
  darkMode: boolean;
  theme?: string;
  globalVariables?: Record<string, string>;
  zoomLevel?: number;
  scrollFraction?: number;
  filePath?: string;
  viewMode?: 'split' | 'editor' | 'preview';
}

/** Resolve a relative path against a base directory path */
function resolveRelativePath(baseDirPath: string, relativePath: string): string {
  const parts = (baseDirPath + '/' + relativePath).split('/').filter(Boolean);
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }
  return '/' + resolved.join('/');
}

const MIME_MAP: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
  bmp: 'image/bmp', ico: 'image/x-icon', avif: 'image/avif',
};

/** Check if a URL is absolute (http, https, data, blob) */
function isAbsoluteUrl(src: string): boolean {
  return src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('blob:');
}

/** Read a local file and return its data URL */
async function readAsDataUrl(absolutePath: string, src: string): Promise<string> {
  const data = await readFile(absolutePath);
  const ext = src.split('.').pop()?.toLowerCase() || '';
  const mime = MIME_MAP[ext] || 'application/octet-stream';
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

/**
 * Replace relative image references in HTML with inline data URLs.
 * Handles:
 * - <img src="..."> tags (regular images)
 * - CSS url("...") patterns (Marp background images)
 * - <image href="..."> / <image xlink:href="..."> SVG elements
 */
async function inlineRelativeImages(html: string, filePath: string): Promise<string> {
  const baseDir = filePath.substring(0, filePath.lastIndexOf('/'));
  const replacements = new Map<string, string>();
  const promises: Promise<void>[] = [];

  /** Collect a src for replacement if it's a relative path */
  function collectSrc(src: string) {
    if (isAbsoluteUrl(src) || replacements.has(src)) return;
    replacements.set(src, src); // reserve
    const absolutePath = resolveRelativePath(baseDir, src);
    promises.push(
      readAsDataUrl(absolutePath, src)
        .then(dataUrl => { replacements.set(src, dataUrl); })
        .catch(err => { console.error('[MarpPreview] Failed to inline image:', absolutePath, err); })
    );
  }

  // 1. <img src="...">
  const imgRegex = /<img\s+[^>]*?src="([^"]+)"[^>]*?>/g;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    collectSrc(match[1]);
  }

  // 2. CSS url(&quot;...&quot;) — Marp encodes quotes as HTML entities in inline styles
  const urlEntityRegex = /url\(&quot;([^&]+)&quot;\)/g;
  while ((match = urlEntityRegex.exec(html)) !== null) {
    collectSrc(match[1]);
  }

  // 3. CSS url("...") — fallback for unencoded quotes
  const urlRegex = /url\("([^"]+)"\)/g;
  while ((match = urlRegex.exec(html)) !== null) {
    collectSrc(match[1]);
  }

  // 4. SVG <image href="..."> or <image xlink:href="...">
  const imageHrefRegex = /<image\s+[^>]*?(?:xlink:)?href="([^"]+)"[^>]*?>/g;
  while ((match = imageHrefRegex.exec(html)) !== null) {
    collectSrc(match[1]);
  }

  await Promise.all(promises);

  let result = html;
  for (const [original, dataUrl] of replacements) {
    if (dataUrl !== original) {
      result = result.split(`src="${original}"`).join(`src="${dataUrl}"`);
      result = result.split(`url(&quot;${original}&quot;)`).join(`url(&quot;${dataUrl}&quot;)`);
      result = result.split(`url("${original}")`).join(`url("${dataUrl}")`);
      result = result.split(`href="${original}"`).join(`href="${dataUrl}"`);
    }
  }
  return result;
}

const MarpPreview: React.FC<MarpPreviewProps> = ({
  content,
  globalVariables = {},
  zoomLevel = 1.0,
  scrollFraction,
  filePath,
  viewMode = 'split',
}) => {
  const { t } = useTranslation();
  const [marpHtml, setMarpHtml] = useState('');
  const [marpCss, setMarpCss] = useState('');
  const [slideCount, setSlideCount] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastInputRef = useRef<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isSlideMode = viewMode === 'preview';
  const isContinuousMode = viewMode === 'split';

  // Render Marp slides
  useEffect(() => {
    let stale = false;

    const process = async () => {
      if (!content) {
        setMarpHtml('');
        setMarpCss('');
        setSlideCount(0);
        return;
      }

      const inputKey = content + JSON.stringify(globalVariables) + (filePath || '');
      if (inputKey === lastInputRef.current) return;

      const result = await variableApi.processMarkdown(content, globalVariables);
      if (stale) return;

      let { html, css, slideCount: count } = await renderMarp(result.processedContent);
      if (stale) return;

      // Inline relative images as data URLs so the iframe can display them
      if (filePath) {
        try {
          html = await inlineRelativeImages(html, filePath);
        } catch (err) {
          console.error('[MarpPreview] inlineRelativeImages failed:', err);
        }
        if (stale) return;
      }

      lastInputRef.current = inputKey;
      setMarpHtml(html);
      setMarpCss(css);
      setSlideCount(count);
      setCurrentSlide((prev) => (prev >= count ? 0 : prev));
    };

    process();
    return () => { stale = true; };
  }, [content, globalVariables, filePath]);

  // Scroll sync for continuous mode — send scrollFraction to iframe via postMessage
  useEffect(() => {
    if (!isContinuousMode || scrollFraction === undefined) return;
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({ scrollFraction }, '*');
  }, [scrollFraction, isContinuousMode, marpHtml]);

  // Map scrollFraction to slide index for slide mode
  useEffect(() => {
    if (!isSlideMode) return;
    if (scrollFraction !== undefined && slideCount > 0) {
      const index = Math.min(
        Math.floor(scrollFraction * slideCount),
        slideCount - 1,
      );
      setCurrentSlide(index);
    }
  }, [scrollFraction, slideCount, isSlideMode]);

  const goToPrev = useCallback(() => {
    setCurrentSlide((prev) => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentSlide((prev) => Math.min(slideCount - 1, prev + 1));
  }, [slideCount]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Keyboard navigation (slide mode)
  useEffect(() => {
    if (!isSlideMode && !isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        setIsFullscreen(false);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        goToNext();
      }
    };

    // Use window-level listener in fullscreen for reliable key capture
    if (isFullscreen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }

    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext, isSlideMode, isFullscreen]);

  // Exit fullscreen when switching away from preview mode
  useEffect(() => {
    if (!isSlideMode) setIsFullscreen(false);
  }, [isSlideMode]);

  // Build iframe srcdoc
  const srcdoc = marpHtml
    ? (isContinuousMode
        ? buildAllSlidesDocument(marpHtml, marpCss)
        : buildSlideDocument(marpHtml, marpCss, currentSlide))
    : '';

  // Fullscreen overlay
  if (isFullscreen && srcdoc) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          backgroundColor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Slide area */}
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxHeight: '100%',
              aspectRatio: '16 / 9',
              maxWidth: 'calc(100vh * 16 / 9)',
            }}
          >
            <iframe
              srcDoc={srcdoc}
              sandbox="allow-scripts"
              title="Marp Slide Fullscreen"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          </Box>
        </Box>

        {/* Exit fullscreen button — top right, semi-transparent */}
        <Tooltip title={t('preview.exitFullscreen', 'Exit Fullscreen (Esc)')}>
          <IconButton
            onClick={toggleFullscreen}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              color: 'rgba(255,255,255,0.5)',
              '&:hover': { color: 'rgba(255,255,255,0.9)', backgroundColor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <FullscreenExit />
          </IconButton>
        </Tooltip>

        {/* Slide counter — bottom center */}
        <Typography
          variant="body2"
          sx={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.5)',
            userSelect: 'none',
          }}
        >
          {slideCount > 0 ? `${currentSlide + 1} / ${slideCount}` : ''}
        </Typography>
      </Box>
    );
  }

  // Continuous mode (split view) — all slides stacked vertically
  if (isContinuousMode) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', outline: 'none' }}>
        <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">
            {t('preview.presentation', 'Presentation')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {slideCount > 0 ? `${slideCount} ${t('preview.slides', 'slides')}` : ''}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {srcdoc && (
            <iframe
              ref={iframeRef}
              srcDoc={srcdoc}
              sandbox="allow-scripts"
              title="Marp Slides Overview"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          )}
        </Box>
      </Box>
    );
  }

  // Slide mode (preview view) — single slide with navigation
  return (
    <Box
      ref={containerRef}
      tabIndex={0}
      sx={{ height: '100%', display: 'flex', flexDirection: 'column', outline: 'none' }}
    >
      {/* Header */}
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" color="text.secondary">
          {t('preview.presentation', 'Presentation')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={t('preview.previousSlide', 'Previous Slide')}>
            <span>
              <IconButton size="small" onClick={goToPrev} disabled={currentSlide === 0}>
                <NavigateBefore />
              </IconButton>
            </span>
          </Tooltip>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60, textAlign: 'center' }}>
            {slideCount > 0 ? `${currentSlide + 1} / ${slideCount}` : '—'}
          </Typography>
          <Tooltip title={t('preview.nextSlide', 'Next Slide')}>
            <span>
              <IconButton size="small" onClick={goToNext} disabled={currentSlide >= slideCount - 1}>
                <NavigateNext />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('preview.fullscreen', 'Fullscreen')}>
            <IconButton size="small" onClick={toggleFullscreen}>
              <Fullscreen />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Slide area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: '#000',
          p: 2,
        }}
      >
        {srcdoc && (
          <Box
            sx={{
              width: '100%',
              maxWidth: 960,
              aspectRatio: '16 / 9',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 3,
              borderRadius: 1,
              transform: zoomLevel !== 1.0 ? `scale(${zoomLevel})` : undefined,
              transformOrigin: 'center center',
            }}
          >
            <iframe
              srcDoc={srcdoc}
              sandbox="allow-scripts"
              title="Marp Slide Preview"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MarpPreview;
