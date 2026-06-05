import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { NavigateBefore, NavigateNext, Fullscreen, FullscreenExit, GridView } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { openUrl } from '@tauri-apps/plugin-opener';
import { variableApi } from '../api/variableApi';
import { renderMarp, buildSlideDocument, buildAllSlidesDocument, buildThumbnailDocument, buildContinuousStyleContent } from '../utils/marpRenderer';
import { inlineMarpRelativeImages } from '../utils/marpImageInliner';
import { loadThemeSrcCss } from '../utils/marpThemeLoader';
import { computeSlideLineRanges, scrollFractionToSlidePosition } from '../utils/marpSlideRanges';
import { contentHasMermaid, processMermaidBlocks, reinitializeMermaid } from '../utils/markdownRenderers';

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
  darkMode,
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

      const isDark = darkMode;
      const inputKey = content + JSON.stringify(globalVariables) + (filePath || '') + String(isDark);
      if (inputKey === lastInputRef.current) return;

      const result = await variableApi.processMarkdown(content, globalVariables);
      if (stale) return;

      let { html, css, slideCount: count } = await renderMarp(result.processedContent);
      if (stale) return;

      // Render mermaid code blocks to inline SVG. marp-core has no built-in
      // mermaid support, so without this step ```mermaid fences emit raw
      // <pre><code> in the slide HTML (the bug we're fixing here).
      if (contentHasMermaid(result.processedContent)) {
        try {
          reinitializeMermaid(isDark);
          html = await processMermaidBlocks(html, isDark);
        } catch (err) {
          console.warn('[MarpPreview] Mermaid processing failed:', err);
        }
        if (stale) return;
      }

      // Inline relative images as data URLs so the iframe can display them
      if (filePath) {
        try {
          html = await inlineMarpRelativeImages(html, filePath);
        } catch (err) {
          console.error('[MarpPreview] inlineMarpRelativeImages failed:', err);
        }
        if (stale) return;

        // Append CSS referenced by the `theme-src` front-matter directive,
        // after the Marp-generated theme CSS so its rules win on equal
        // specificity (standard last-wins cascade).
        try {
          const extraCss = await loadThemeSrcCss(result.processedContent, filePath);
          if (extraCss) css = `${css}\n${extraCss}`;
        } catch (err) {
          console.error('[MarpPreview] loadThemeSrcCss failed:', err);
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
  }, [content, globalVariables, filePath, darkMode]);

  // Compute slide line ranges from source content (memoized)
  const slideRanges = React.useMemo(() => computeSlideLineRanges(content), [content]);

  const fractionToSlide = useCallback((fraction: number) => {
    const totalLines = content.split('\n').length;
    return scrollFractionToSlidePosition(fraction, totalLines, slideRanges);
  }, [content, slideRanges]);

  // Tracks the marpHtml / marpCss currently rendered inside the continuous-mode
  // iframe. Used to skip redundant DOM mutations and detect when an imperative
  // update is required.
  const appliedHtmlRef = useRef<string>('');
  const appliedCssRef = useRef<string>('');

  // Apply scrollFraction to the continuous-mode iframe by translating it into a
  // pixel scrollTop relative to the SVG slide elements. Reading layout here
  // (getBoundingClientRect) forces synchronous layout, so callers can rely on
  // the geometry being up to date — important right after a body.innerHTML swap.
  const applyContinuousScroll = useCallback(() => {
    if (!isContinuousMode || scrollFraction === undefined) return;
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;
    const slides = doc.querySelectorAll('div.marpit > svg[data-marpit-svg]');
    if (slides.length === 0) return;

    const { slideIndex, subFraction } = fractionToSlide(scrollFraction);
    const idx = Math.min(slideIndex, slides.length - 1);
    const slideElement = slides[idx];

    const docScrollTop = doc.documentElement.scrollTop;
    const rect = slideElement.getBoundingClientRect();
    const slideTop = rect.top + docScrollTop;
    const slideHeight = rect.height;

    const viewportHeight = doc.documentElement.clientHeight;
    const targetPos = slideTop + (subFraction * slideHeight);
    const scrollTarget = targetPos - (viewportHeight / 2);
    doc.documentElement.scrollTop = Math.max(0, scrollTarget);
  }, [isContinuousMode, scrollFraction, fractionToSlide]);

  // Continuous mode: update iframe content (and scroll) in place instead of
  // letting React swap srcDoc, which would reload the iframe and reset its
  // scrollTop to 0 — producing the "preview jumps to slide 1 on every
  // keystroke" bug. We run as a layout effect so the DOM swap + scroll restore
  // happens before the browser paints, eliminating any visible flicker.
  //
  // The link-interceptor script attaches its listeners to `document` on the
  // initial srcDoc load, so they survive the innerHTML replacement below.
  useLayoutEffect(() => {
    if (!isContinuousMode) return;
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc?.body) return;

    // Bail out if the iframe is still loading its initial srcDoc — the body
    // will be repopulated by that load, and onLoad triggers a scroll apply.
    const hasSlides = doc.querySelector('div.marpit > svg[data-marpit-svg]') !== null;
    if (!hasSlides) return;

    if (marpHtml && marpHtml !== appliedHtmlRef.current) {
      doc.body.innerHTML = marpHtml;
      appliedHtmlRef.current = marpHtml;
    }
    if (marpCss !== appliedCssRef.current) {
      const styleEl = doc.querySelector('style');
      if (styleEl) {
        styleEl.textContent = buildContinuousStyleContent(marpCss);
      }
      appliedCssRef.current = marpCss;
    }

    applyContinuousScroll();
  }, [marpHtml, marpCss, isContinuousMode, applyContinuousScroll]);

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
      // Esc must always exit fullscreen, even when focus is on Monaco's hidden
      // textarea (which happens after the OS window exits its own fullscreen).
      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        setIsFullscreen(false);
        return;
      }
      // Don't capture other keys when user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

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
  //   - marpKey: keyboard event forwarded from inside the sandboxed slide
  //     iframe. Sandboxed-iframe keydowns don't bubble to the parent window,
  //     so the host can never see Esc / arrow keys when the iframe has focus.
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
      if (e.data?.type === 'marpKey' && typeof e.data.key === 'string') {
        const key = e.data.key;
        if (key === 'Escape' && isFullscreen) {
          setIsFullscreen(false);
        } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
          goToPrev();
        } else if (key === 'ArrowRight' || key === 'ArrowDown' || key === ' ') {
          goToNext();
        }
        return;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isFullscreen, goToPrev, goToNext]);

  // Build iframe srcdoc — for slide mode, build once with initial slide index.
  // Subsequent slide changes are handled via postMessage (no full reload).
  const slideDocRef = useRef<string>('');
  const slideIframeRef = useRef<HTMLIFrameElement>(null);
  const fullscreenIframeRef = useRef<HTMLIFrameElement>(null);

  // Rebuild slide document only when html/css content changes, not on slide navigation.
  // For continuous mode the iframe is fed a separate, stable srcDoc captured once
  // per session (see continuousSrcdoc below); we deliberately do NOT include
  // continuous-mode content here, so React never reassigns the iframe's srcDoc
  // attribute and the iframe never reloads on edits.
  const srcdoc = React.useMemo(() => {
    if (!marpHtml || isContinuousMode) {
      slideDocRef.current = '';
      return '';
    }
    const doc = buildSlideDocument(marpHtml, marpCss, currentSlide);
    slideDocRef.current = doc;
    return doc;
  }, [marpHtml, marpCss, isContinuousMode]);

  // Continuous-mode iframe srcDoc: captured once when marpHtml first becomes
  // non-empty in this mode, then never changed. Subsequent content updates flow
  // through the imperative DOM mutation in the useLayoutEffect above. Reset on
  // mode exit so re-entry rebuilds from the latest marpHtml.
  const [continuousSrcdoc, setContinuousSrcdoc] = useState<string>('');
  useLayoutEffect(() => {
    if (!isContinuousMode || !marpHtml) {
      if (continuousSrcdoc) {
        setContinuousSrcdoc('');
        appliedHtmlRef.current = '';
        appliedCssRef.current = '';
      }
      return;
    }
    if (!continuousSrcdoc) {
      setContinuousSrcdoc(buildAllSlidesDocument(marpHtml, marpCss));
      appliedHtmlRef.current = marpHtml;
      appliedCssRef.current = marpCss;
    }
  }, [isContinuousMode, marpHtml, marpCss, continuousSrcdoc]);

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
          {continuousSrcdoc && (
            <iframe
              ref={iframeRef}
              srcDoc={continuousSrcdoc}
              sandbox="allow-scripts allow-same-origin"
              title="Marp Slides Overview"
              onLoad={() => {
                // Force WebKit to re-evaluate scrollbar visibility after the
                // iframe document finishes layout. On initial app startup the
                // scrollbar can otherwise stay hidden even when content overflows.
                iframeRef.current?.contentWindow?.dispatchEvent(new Event('resize'));
                // Apply the current scrollFraction now that the slide DOM exists.
                // The imperative useLayoutEffect bails while the iframe is still
                // loading, so this onLoad path is what restores the scroll
                // position on the first render of a session.
                applyContinuousScroll();
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
