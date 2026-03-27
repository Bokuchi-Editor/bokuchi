import type Marp from '@marp-team/marp-core';

// Lazy-loaded module cache
let marpModule: typeof import('@marp-team/marp-core') | null = null;

async function getMarp(): Promise<Marp> {
  if (!marpModule) {
    marpModule = await import('@marp-team/marp-core');
  }
  const MarpClass = marpModule.default ?? marpModule.Marp;
  return new MarpClass();
}

/** YAML front-matter detection for marp: true */
const MARP_FRONTMATTER_RE = /^---\s*\n[\s\S]*?^marp:\s*true\b[\s\S]*?^---\s*$/m;

/**
 * Check whether the markdown content has a `marp: true` YAML front-matter.
 * Synchronous — no library load needed.
 */
export function contentIsMarp(content: string): boolean {
  return MARP_FRONTMATTER_RE.test(content);
}

export interface MarpRenderResult {
  html: string;
  css: string;
  slideCount: number;
}

/**
 * Render markdown as Marp presentation HTML + CSS.
 * Lazy-loads @marp-team/marp-core on first call.
 */
export async function renderMarp(markdown: string): Promise<MarpRenderResult> {
  const marp = await getMarp();
  const { html, css } = marp.render(markdown);
  const slideCount = countSlides(html);
  return { html, css, slideCount };
}

/**
 * Count slides by counting top-level <svg data-marpit-svg> elements.
 */
export function countSlides(html: string): number {
  const matches = html.match(/<svg[^>]*data-marpit-svg/g);
  return matches ? matches.length : 1;
}

/**
 * Build a self-contained HTML document for iframe srcdoc.
 * All slides are loaded once; the visible slide is controlled via postMessage.
 * This avoids full document reloads on slide change, preventing CSS flicker.
 */
export function buildSlideDocument(html: string, css: string, slideIndex: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${css}

/* Hide all slides by default */
div.marpit > svg[data-marpit-svg] {
  display: none;
}
div.marpit > svg[data-marpit-svg].active-slide {
  display: block;
  width: 100%;
  height: auto;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
}

/* Center the slide vertically and horizontally, fit within viewport */
div.marpit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

/* Constrain by height when viewport is wider than 16:9 */
@media (min-aspect-ratio: 16/9) {
  div.marpit > svg[data-marpit-svg].active-slide {
    width: auto;
    height: 100%;
  }
}
</style>
</head>
<body>${html}
<script>
function showSlide(index) {
  var slides = document.querySelectorAll('div.marpit > svg[data-marpit-svg]');
  for (var i = 0; i < slides.length; i++) {
    if (i === index) {
      slides[i].classList.add('active-slide');
    } else {
      slides[i].classList.remove('active-slide');
    }
  }
}
showSlide(${slideIndex});
window.addEventListener('message', function(e) {
  if (e.data && typeof e.data.slideIndex === 'number') {
    showSlide(e.data.slideIndex);
  }
});
</script>
</body>
</html>`;
}

/**
 * Build a thumbnail grid document for slide overview.
 * Each slide is rendered as a clickable thumbnail; clicking sends
 * { type: 'slideSelect', slideIndex: N } to the parent via postMessage.
 * The currently active slide is highlighted with a border.
 */
export function buildThumbnailDocument(html: string, css: string, activeSlide: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${css}

html, body {
  margin: 0;
  padding: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: #1a1a1a;
}

/* Hide the original Marp container — used only as a rendering source */
div.marpit {
  display: none !important;
}

#thumb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  padding: 12px;
  box-sizing: border-box;
}

.thumb-wrapper {
  position: relative;
  cursor: pointer;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  transition: box-shadow 0.15s, outline-color 0.15s;
  outline: 4px solid transparent;
  outline-offset: 0px;
}

.thumb-wrapper:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.6);
  outline-color: rgba(100,150,255,0.4);
}

.thumb-wrapper.active-thumb {
  outline-color: #4a9eff;
  box-shadow: 0 4px 16px rgba(74,158,255,0.3);
}

/* Each wrapper contains a full Marp container clone showing one slide */
.thumb-wrapper div.marpit {
  display: flex !important;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.thumb-wrapper div.marpit > svg[data-marpit-svg] {
  display: none;
}

.thumb-wrapper div.marpit > svg[data-marpit-svg].thumb-visible {
  display: block;
  width: 100%;
  height: auto;
}

.slide-number {
  position: absolute;
  bottom: 4px;
  right: 6px;
  background: rgba(0,0,0,0.6);
  color: #ccc;
  font-size: 11px;
  font-family: sans-serif;
  padding: 1px 5px;
  border-radius: 3px;
  pointer-events: none;
  z-index: 1;
}
</style>
</head>
<body>${html}
<script>
(function() {
  var marpit = document.querySelector('div.marpit');
  if (!marpit) return;
  var origSvgs = marpit.querySelectorAll(':scope > svg[data-marpit-svg]');
  var grid = document.createElement('div');
  grid.id = 'thumb-grid';

  for (var i = 0; i < origSvgs.length; i++) {
    var wrapper = document.createElement('div');
    wrapper.className = 'thumb-wrapper' + (i === ${activeSlide} ? ' active-thumb' : '');
    wrapper.setAttribute('data-index', String(i));

    // Clone the entire marpit container so Marp CSS applies correctly
    var clone = marpit.cloneNode(false);
    var svgClone = origSvgs[i].cloneNode(true);
    svgClone.classList.add('thumb-visible');
    clone.appendChild(svgClone);

    var label = document.createElement('span');
    label.className = 'slide-number';
    label.textContent = String(i + 1);

    wrapper.appendChild(clone);
    wrapper.appendChild(label);
    grid.appendChild(wrapper);
  }

  document.body.appendChild(grid);

  grid.addEventListener('click', function(e) {
    var wrapper = e.target.closest('.thumb-wrapper');
    if (!wrapper) return;
    var idx = parseInt(wrapper.getAttribute('data-index'), 10);
    window.parent.postMessage({ type: 'slideSelect', slideIndex: idx }, '*');
    setActive(idx);
  });

  function setActive(index) {
    var wrappers = grid.querySelectorAll('.thumb-wrapper');
    for (var j = 0; j < wrappers.length; j++) {
      if (j === index) {
        wrappers[j].classList.add('active-thumb');
      } else {
        wrappers[j].classList.remove('active-thumb');
      }
    }
  }

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'thumbActive' && typeof e.data.slideIndex === 'number') {
      setActive(e.data.slideIndex);
    }
  });
})();
</script>
</body>
</html>`;
}

/**
 * Build a self-contained HTML document showing all slides stacked vertically.
 * Used in split/separate mode for overview while editing.
 */
export function buildAllSlidesDocument(html: string, css: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${css}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background: #1a1a1a;
}

div.marpit > svg[data-marpit-svg] {
  display: block;
  width: 100%;
  height: auto;
  margin: 16px auto;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  border-radius: 4px;
}

div.marpit {
  padding: 0 16px;
  box-sizing: border-box;
}
</style>
</head>
<body>${html}</body>
</html>`;
}
