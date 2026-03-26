import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { NavigateBefore, NavigateNext } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { readFile } from '@tauri-apps/plugin-fs';
import { variableApi } from '../api/variableApi';
import { renderMarp, buildSlideDocument } from '../utils/marpRenderer';

interface MarpPreviewProps {
  content: string;
  darkMode: boolean;
  theme?: string;
  globalVariables?: Record<string, string>;
  zoomLevel?: number;
  scrollFraction?: number;
  filePath?: string;
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

/**
 * Replace relative image src attributes in HTML with inline data URLs.
 * Needed because the iframe srcdoc cannot access local file paths or blob URLs.
 */
async function inlineRelativeImages(html: string, filePath: string): Promise<string> {
  const baseDir = filePath.substring(0, filePath.lastIndexOf('/'));
  const imgRegex = /<img\s+[^>]*?src="([^"]+)"[^>]*?>/g;
  const replacements = new Map<string, string>();

  const promises: Promise<void>[] = [];
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('blob:')) {
      continue;
    }
    if (replacements.has(src)) continue;
    // Reserve key to avoid duplicate reads
    replacements.set(src, src);

    const absolutePath = resolveRelativePath(baseDir, src);
    promises.push(
      readFile(absolutePath).then(data => {
        const ext = src.split('.').pop()?.toLowerCase() || '';
        const mime = MIME_MAP[ext] || 'application/octet-stream';
        // Convert Uint8Array to base64 data URL
        let binary = '';
        for (let i = 0; i < data.length; i++) {
          binary += String.fromCharCode(data[i]);
        }
        const base64 = btoa(binary);
        replacements.set(src, `data:${mime};base64,${base64}`);
      }).catch(err => {
        console.warn('Failed to load image:', absolutePath, err);
      })
    );
  }

  await Promise.all(promises);

  let result = html;
  for (const [original, dataUrl] of replacements) {
    if (dataUrl !== original) {
      result = result.split(`src="${original}"`).join(`src="${dataUrl}"`);
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
}) => {
  const { t } = useTranslation();
  const [marpHtml, setMarpHtml] = useState('');
  const [marpCss, setMarpCss] = useState('');
  const [slideCount, setSlideCount] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const lastInputRef = useRef<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

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
        html = await inlineRelativeImages(html, filePath);
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

  // Map scrollFraction to slide index
  useEffect(() => {
    if (scrollFraction !== undefined && slideCount > 0) {
      const index = Math.min(
        Math.floor(scrollFraction * slideCount),
        slideCount - 1,
      );
      setCurrentSlide(index);
    }
  }, [scrollFraction, slideCount]);

  const goToPrev = useCallback(() => {
    setCurrentSlide((prev) => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentSlide((prev) => Math.min(slideCount - 1, prev + 1));
  }, [slideCount]);

  // Keyboard navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goToNext();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext]);

  // Build the iframe srcdoc for the current slide
  const srcdoc = marpHtml ? buildSlideDocument(marpHtml, marpCss, currentSlide) : '';

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
        </Box>
      </Box>

      {/* Slide area — iframe renders Marp HTML/CSS in full isolation */}
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
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MarpPreview;
