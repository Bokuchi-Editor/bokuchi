import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { NavigateBefore, NavigateNext, Fullscreen, FullscreenExit, GridView } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { openUrl } from '@tauri-apps/plugin-opener';
import { variableApi } from '../api/variableApi';
import { renderMarp, buildSlideDocument, buildAllSlidesDocument, buildThumbnailDocument } from '../utils/marpRenderer';
import { inlineMarpRelativeImages } from '../utils/marpImageInliner';
import { computeSlideLineRanges, scrollFractionToSlidePosition } from '../utils/marpSlideRanges';

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

const FULLSCREEN_Z_INDEX = 9999;
const FULLSCREEN_BUTTON_OFFSET_PX = 16;
const SLIDE_COUNTER_MIN_WIDTH_PX = 60;

const MarpPreview: React.FC<MarpPreviewProps> = ({
  content,
  globalVariables = {},
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
  const [isThumbnailMode, setIsThumbnailMode] = useState(false);
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
          html = await inlineMarpRelativeImages(html, filePath);
        } catch (err) {
          console.error('[MarpPreview] inlineMarpRelativeImages failed:', err);
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

  // Compute slide line ranges from source content (memoized)
  const slideRanges = React.useMemo(() => computeSlideLineRanges(content), [content]);

  const fractionToSlide = useCallback((fraction: number) => {
    const totalLines = content.split('\n').length;
    return scrollFractionToSlidePosition(fraction, totalLines, slideRanges);
  }, [content, slideRanges]);

  // Scroll sync for continuous mode — directly manipulate iframe DOM
  useEffect(() => {
    if (!isContinuousMode || scrollFraction === undefined) return;
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;

    const doc = iframe.contentDocument;
    const slides = doc.querySelectorAll('div.marpit > svg[data-marpit-svg]');
    if (slides.length === 0) return;

    const { slideIndex, subFraction } = fractionToSlide(scrollFraction);
    const idx = Math.min(slideIndex, slides.length - 1);
    const slideElement = slides[idx];

    // SVG elements don't have offsetTop/offsetHeight — use getBoundingClientRect
    // relative to the document's current scroll position
    const docScrollTop = doc.documentElement.scrollTop;
    const rect = slideElement.getBoundingClientRect();
    const slideTop = rect.top + docScrollTop;
    const slideHeight = rect.height;

    // Center the current position in the preview viewport
    const viewportHeight = doc.documentElement.clientHeight;
    const targetPos = slideTop + (subFraction * slideHeight);
    const scrollTarget = targetPos - (viewportHeight / 2);
    doc.documentElement.scrollTop = Math.max(0, scrollTarget);
  }, [scrollFraction, isContinuousMode, marpHtml, fractionToSlide]);

  // Map scrollFraction to slide index for slide mode (preview)
  useEffect(() => {
    if (!isSlideMode || scrollFraction === undefined || slideCount === 0) return;
    const { slideIndex } = fractionToSlide(scrollFraction);
    setCurrentSlide(Math.min(slideIndex, slideCount - 1));
  }, [scrollFraction, slideCount, isSlideMode, fractionToSlide]);

  const goToPrev = useCallback(() => {
    setCurrentSlide((prev) => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentSlide((prev) => Math.min(slideCount - 1, prev + 1));
  }, [slideCount]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
    setIsThumbnailMode(false);
  }, []);

  const toggleThumbnailMode = useCallback(() => {
    setIsThumbnailMode(prev => !prev);
  }, []);

  // Keyboard navigation (slide mode / fullscreen)
  // Uses window-level listener so arrow keys work regardless of focus target
  useEffect(() => {
    if (!isSlideMode && !isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext, isSlideMode, isFullscreen]);

  // Exit fullscreen/thumbnail when switching away from preview mode
  useEffect(() => {
    if (!isSlideMode) {
      setIsFullscreen(false);
      setIsThumbnailMode(false);
    }
  }, [isSlideMode]);

  // Listen for postMessage from iframes:
  //   - slideSelect: thumbnail click (changes current slide)
  //   - openExternalUrl: link click inside any slide iframe — must be routed
  //     through the OS browser via the Tauri opener plugin. Direct iframe
  //     navigation would render the linked page inside the slide region.
  const thumbnailIframeRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'slideSelect' && typeof e.data.slideIndex === 'number') {
        setCurrentSlide(e.data.slideIndex);
        setIsThumbnailMode(false);
        return;
      }
      if (e.data?.type === 'openExternalUrl' && typeof e.data.url === 'string') {
        // Re-validate the scheme on the host side — never trust the iframe alone.
        const url = e.data.url;
        if (/^(https?:|mailto:)/i.test(url)) {
          openUrl(url).catch((err) => {
            console.error('[MarpPreview] Failed to open URL:', url, err);
          });
        }
        return;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Build iframe srcdoc — for slide mode, build once with initial slide index.
  // Subsequent slide changes are handled via postMessage (no full reload).
  const slideDocRef = useRef<string>('');
  const slideIframeRef = useRef<HTMLIFrameElement>(null);
  const fullscreenIframeRef = useRef<HTMLIFrameElement>(null);

  // Rebuild slide document only when html/css content changes, not on slide navigation
  const srcdoc = React.useMemo(() => {
    if (!marpHtml) {
      slideDocRef.current = '';
      return '';
    }
    if (isContinuousMode) {
      return buildAllSlidesDocument(marpHtml, marpCss);
    }
    const doc = buildSlideDocument(marpHtml, marpCss, currentSlide);
    slideDocRef.current = doc;
    return doc;
  }, [marpHtml, marpCss, isContinuousMode]);

  // Build thumbnail document
  const thumbnailSrcdoc = React.useMemo(() => {
    if (!marpHtml || !isThumbnailMode) return '';
    return buildThumbnailDocument(marpHtml, marpCss, currentSlide);
  }, [marpHtml, marpCss, isThumbnailMode]);

  // Send postMessage to iframe(s) when slide changes (slide mode only)
  useEffect(() => {
    if (isContinuousMode || !marpHtml) return;
    const msg = { slideIndex: currentSlide };
    slideIframeRef.current?.contentWindow?.postMessage(msg, '*');
    fullscreenIframeRef.current?.contentWindow?.postMessage(msg, '*');
    // Update active highlight in thumbnail iframe
    thumbnailIframeRef.current?.contentWindow?.postMessage(
      { type: 'thumbActive', slideIndex: currentSlide }, '*'
    );
  }, [currentSlide, isContinuousMode, marpHtml]);

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
          zIndex: FULLSCREEN_Z_INDEX,
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
              ref={fullscreenIframeRef}
              srcDoc={srcdoc}
              sandbox="allow-scripts"
              title="Marp Slide Fullscreen"
              onLoad={() => {
                fullscreenIframeRef.current?.contentWindow?.postMessage(
                  { slideIndex: currentSlide }, '*'
                );
              }}
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
              top: FULLSCREEN_BUTTON_OFFSET_PX,
              right: FULLSCREEN_BUTTON_OFFSET_PX,
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
            bottom: FULLSCREEN_BUTTON_OFFSET_PX,
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
              sandbox="allow-scripts allow-same-origin"
              title="Marp Slides Overview"
              onLoad={() => {
                // Force WebKit to re-evaluate scrollbar visibility after the
                // iframe document finishes layout. On initial app startup the
                // scrollbar can otherwise stay hidden even when content overflows.
                iframeRef.current?.contentWindow?.dispatchEvent(new Event('resize'));
              }}
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
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: SLIDE_COUNTER_MIN_WIDTH_PX, textAlign: 'center' }}>
            {slideCount > 0 ? `${currentSlide + 1} / ${slideCount}` : '—'}
          </Typography>
          <Tooltip title={t('preview.nextSlide', 'Next Slide')}>
            <span>
              <IconButton size="small" onClick={goToNext} disabled={currentSlide >= slideCount - 1}>
                <NavigateNext />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('preview.thumbnails', 'Slide Overview')}>
            <IconButton
              size="small"
              onClick={toggleThumbnailMode}
              color={isThumbnailMode ? 'primary' : 'default'}
            >
              <GridView />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('preview.fullscreen', 'Fullscreen')}>
            <IconButton size="small" onClick={toggleFullscreen}>
              <Fullscreen />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Thumbnail grid overlay */}
      {isThumbnailMode && thumbnailSrcdoc && (
        <Box
          sx={{
            flex: 1,
            overflow: 'hidden',
            backgroundColor: '#1a1a1a',
          }}
        >
          <iframe
            ref={thumbnailIframeRef}
            srcDoc={thumbnailSrcdoc}
            sandbox="allow-scripts"
            title="Marp Slide Thumbnails"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        </Box>
      )}

      {/* Slide area — always mounted, hidden when thumbnail mode is active */}
      <Box
        sx={{
          flex: isThumbnailMode ? 0 : 1,
          overflow: 'hidden',
          backgroundColor: '#000',
          display: isThumbnailMode ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {srcdoc && (
          <iframe
            ref={slideIframeRef}
            srcDoc={srcdoc}
            sandbox="allow-scripts"
            title="Marp Slide Preview"
            onLoad={() => {
              slideIframeRef.current?.contentWindow?.postMessage(
                { slideIndex: currentSlide }, '*'
              );
            }}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        )}
      </Box>
    </Box>
  );
};

export default MarpPreview;
