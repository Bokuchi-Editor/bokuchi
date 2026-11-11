/**
 * Flattens plain CSS `linear-gradient()`/`radial-gradient()` backgrounds to a
 * rasterized PNG before PDF export.
 *
 * Why: the native print-to-PDF path (NSPrintOperation/WKWebView on macOS,
 * ICoreWebView2 on Windows, webkit2gtk on Linux — see src-tauri/src/pdf_export.rs)
 * renders through each platform's own print backend rather than the on-screen
 * compositor. On macOS this is CGPDFContext, which has a long-standing,
 * unfixed bug dropping a CSS gradient's alpha/transition and painting an
 * opaque solid shape instead (WebKit bugs 19942 and 261255 — a WebKit
 * engineer attributes it to "a limitation of CGPDFContext"). `print-color-adjust`
 * does not help; it is already set and is unrelated to this bug.
 *
 * The fix: before handing the export HTML to the native print pipeline,
 * render each element's gradient background onto a 2D canvas ourselves (using
 * the browser's correct on-screen Canvas rendering, not the broken print
 * path) and swap it in as a plain raster `background-image`. A rasterized PNG
 * is just an embedded image to the print backend, which has no trouble with
 * those. Only single-layer `linear-gradient`/`radial-gradient` backgrounds are
 * handled; anything else (multiple background layers, `repeating-*`,
 * `conic-gradient`, `calc()`, unsupported units) is left untouched — a
 * same-shaped solid box is already today's behavior, so failing soft here
 * never makes an unsupported case worse.
 */

// ---------------------------------------------------------------------------
// Pure parsing/geometry — no DOM, Canvas or layout access. Exported for tests.
// ---------------------------------------------------------------------------

export interface GradientStop {
  /** A valid CSS color string (e.g. "rgba(0, 0, 0, 0.5)"), passed through as-is. */
  color: string;
  /** Fraction (0–1) along the gradient line (linear) or radius (radial). */
  position: number;
}

export type ParsedGradient =
  | { kind: 'linear'; x0: number; y0: number; x1: number; y1: number; stops: GradientStop[] }
  | { kind: 'radial'; cx: number; cy: number; rx: number; ry: number; stops: GradientStop[] };

/** Splits on `sep` at paren-depth 0, so `rgba(0, 0, 0, .5)` is never cut. */
function splitTopLevel(str: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === sep && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

/** Splits on whitespace runs at paren-depth 0 (keeps `rgb(0 0 0 / .5)` intact). */
function splitTopLevelWhitespace(str: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (current) parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/** `<percentage>` or `<length>` (px only) relative to `referencePx`; `null` if unsupported (em, calc(), …). */
function resolveLength(token: string, referencePx: number): number | null {
  if (token.endsWith('%')) {
    const n = parseFloat(token);
    return Number.isNaN(n) ? null : (n / 100) * referencePx;
  }
  if (token.endsWith('px')) {
    const n = parseFloat(token);
    return Number.isNaN(n) ? null : n;
  }
  if (token === '0') return 0;
  return null;
}

/** A stop position token (`%` or `px`) resolved to a 0–1 fraction of `totalLengthPx`. */
function resolveStopFraction(token: string, totalLengthPx: number): number | null {
  if (token.endsWith('%')) {
    const n = parseFloat(token);
    return Number.isNaN(n) ? null : n / 100;
  }
  if (totalLengthPx > 0) {
    const px = resolveLength(token, totalLengthPx);
    return px === null ? null : px / totalLengthPx;
  }
  return token === '0' ? 0 : null;
}

/**
 * CSS's color-stop fixup algorithm: an omitted first/last position defaults to
 * 0%/100%, an explicit position below the previous stop's is clamped up to it,
 * and a run of positionless stops between two positioned ones is spaced evenly.
 */
function fixupStopPositions(raw: { color: string; pos: number | null }[]): GradientStop[] {
  const n = raw.length;
  const pos: (number | null)[] = raw.map((r) => r.pos);
  if (pos[0] === null) pos[0] = 0;
  if (pos[n - 1] === null) pos[n - 1] = 1;
  for (let i = 1; i < n; i++) {
    if (pos[i] !== null && pos[i - 1] !== null && (pos[i] as number) < (pos[i - 1] as number)) {
      pos[i] = pos[i - 1];
    }
  }
  let i = 0;
  while (i < n) {
    if (pos[i] === null) {
      let j = i;
      while (pos[j] === null) j++;
      // pos[i..j-1] are the null run; pos[j] is already known and must not
      // be touched (gapCount excludes it, unlike the slice's own length).
      const start = pos[i - 1] as number;
      const end = pos[j] as number;
      const gapCount = j - i;
      for (let k = 0; k < gapCount; k++) {
        pos[i + k] = start + ((end - start) * (k + 1)) / (gapCount + 1);
      }
      i = j;
    } else {
      i++;
    }
  }
  return raw.map((r, idx) => ({ color: r.color, position: pos[idx] as number }));
}

/** Parses the comma-separated stop list (e.g. `"red", "blue 30%", "green 10% 20%"`). */
function parseStopList(entries: string[], totalLengthPx: number): GradientStop[] | null {
  if (entries.length === 0) return null;
  const raw: { color: string; pos: number | null }[] = [];
  for (const entry of entries) {
    const tokens = splitTopLevelWhitespace(entry);
    if (tokens.length === 0) return null;
    const color = tokens[0];
    const posTokens = tokens.slice(1);
    if (posTokens.length === 0) {
      raw.push({ color, pos: null });
    } else if (posTokens.length === 1 || posTokens.length === 2) {
      // A double-position stop ("red 10% 20%") is two stops of the same color.
      for (const pt of posTokens) {
        const frac = resolveStopFraction(pt, totalLengthPx);
        if (frac === null) return null;
        raw.push({ color, pos: frac });
      }
    } else {
      return null;
    }
  }
  return fixupStopPositions(raw);
}

const X_KEYWORDS: Record<string, number> = { left: 0, right: 1 };
const Y_KEYWORDS: Record<string, number> = { top: 0, bottom: 1 };

/** Resolves an `at <position>` clause to a 0–1 fraction of the box on each axis. */
function resolvePosition(tokens: string[], boxWidth: number, boxHeight: number): { x: number; y: number } | null {
  if (tokens.length === 0) return { x: 0.5, y: 0.5 };
  const lower = tokens.map((t) => t.toLowerCase());

  if (lower.length === 1) {
    const t = lower[0];
    if (t === 'center') return { x: 0.5, y: 0.5 };
    if (t in X_KEYWORDS) return { x: X_KEYWORDS[t], y: 0.5 };
    if (t in Y_KEYWORDS) return { x: 0.5, y: Y_KEYWORDS[t] };
    const px = resolveLength(t, boxWidth);
    return px === null ? null : { x: px / boxWidth, y: 0.5 };
  }

  if (lower.length === 2) {
    const [a, b] = lower;
    const isKeyword = (t: string) => t === 'center' || t in X_KEYWORDS || t in Y_KEYWORDS;
    if (isKeyword(a) && isKeyword(b)) {
      const xTok = a in X_KEYWORDS ? a : b in X_KEYWORDS ? b : 'center';
      const yTok = a in Y_KEYWORDS ? a : b in Y_KEYWORDS ? b : 'center';
      return {
        x: xTok === 'center' ? 0.5 : X_KEYWORDS[xTok],
        y: yTok === 'center' ? 0.5 : Y_KEYWORDS[yTok],
      };
    }
    // Lengths/percentages are positional: first = horizontal, second = vertical.
    const px = a === 'center' ? boxWidth / 2 : resolveLength(a, boxWidth);
    const py = b === 'center' ? boxHeight / 2 : resolveLength(b, boxHeight);
    if (px === null || py === null) return null;
    return { x: px / boxWidth, y: py / boxHeight };
  }

  return null;
}

/**
 * Direction vector for `to <side-or-corner>`, derived geometrically (the
 * gradient line runs from the opposite corner to the named corner) rather
 * than via an angle conversion — this formula also happens to reduce to the
 * plain side cases ("to right" → opposite corner's X midpoint cancels out).
 */
function resolveToDirection(tokens: string[], w: number, h: number): { ux: number; uy: number } | null {
  if (tokens.length === 0) return null;
  const right = tokens.includes('right');
  const left = tokens.includes('left');
  const bottom = tokens.includes('bottom');
  const top = tokens.includes('top');
  if (!right && !left && !bottom && !top) return null;

  const tx = right ? w : left ? 0 : w / 2;
  const ty = bottom ? h : top ? 0 : h / 2;
  const dx = tx - (w - tx);
  const dy = ty - (h - ty);
  const len = Math.hypot(dx, dy);
  if (len === 0) return null;
  return { ux: dx / len, uy: dy / len };
}

function parseLinearGradient(argsStr: string, w: number, h: number): ParsedGradient | null {
  const parts = splitTopLevel(argsStr, ',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  // CSS default when no direction is given: "to bottom" (180deg) → (ux, uy) = (0, 1).
  let ux = 0;
  let uy = 1;
  let rest = parts;

  const first = parts[0];
  const angleMatch = /^(-?[\d.]+)(deg|grad|rad|turn)$/i.exec(first);
  if (angleMatch) {
    const num = parseFloat(angleMatch[1]);
    const unit = angleMatch[2].toLowerCase();
    const rad = unit === 'deg' ? (num * Math.PI) / 180 : unit === 'grad' ? (num * Math.PI) / 200 : unit === 'turn' ? num * 2 * Math.PI : num;
    // CSS angle: 0deg points up, increasing clockwise. In canvas's y-down
    // space that is (sin θ, -cos θ): 0 → (0,-1) up, 90 → (1,0) right, etc.
    ux = Math.sin(rad);
    uy = -Math.cos(rad);
    rest = parts.slice(1);
  } else if (/^to\s+/i.test(first)) {
    const tokens = first
      .replace(/^to\s+/i, '')
      .toLowerCase()
      .split(/\s+/);
    const dir = resolveToDirection(tokens, w, h);
    if (!dir) return null;
    ux = dir.ux;
    uy = dir.uy;
    rest = parts.slice(1);
  }

  const length = Math.abs(w * ux) + Math.abs(h * uy);
  if (length === 0) return null;

  const stops = parseStopList(rest, length);
  if (!stops) return null;

  const half = length / 2;
  const cx = w / 2;
  const cy = h / 2;
  return {
    kind: 'linear',
    x0: cx - half * ux,
    y0: cy - half * uy,
    x1: cx + half * ux,
    y1: cy + half * uy,
    stops,
  };
}

const SIZE_KEYWORDS = new Set(['closest-side', 'closest-corner', 'farthest-side', 'farthest-corner']);

function parseRadialGradient(argsStr: string, w: number, h: number): ParsedGradient | null {
  const parts = splitTopLevel(argsStr, ',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  let shape: 'circle' | 'ellipse' = 'ellipse';
  let sizeKeyword: string = 'farthest-corner';
  let explicitSize: [number, number] | null = null;
  let posX = 0.5;
  let posY = 0.5;
  let rest = parts;

  const head = parts[0];
  const headLower = head.toLowerCase();
  const looksLikeHead = /^(circle|ellipse|closest-side|closest-corner|farthest-side|farthest-corner|at\b|[\d.]+(px|%))/.test(headLower);

  if (looksLikeHead) {
    let shapeSizePart = head;
    let posPart = '';
    const atIdx = headLower.indexOf(' at ');
    if (headLower.startsWith('at ')) {
      posPart = head.slice(3);
      shapeSizePart = '';
    } else if (atIdx >= 0) {
      shapeSizePart = head.slice(0, atIdx);
      posPart = head.slice(atIdx + 4);
    }

    const ssTokens = shapeSizePart.trim().split(/\s+/).filter(Boolean);
    const numericTokens: string[] = [];
    for (const tok of ssTokens) {
      const low = tok.toLowerCase();
      if (low === 'circle' || low === 'ellipse') {
        shape = low;
      } else if (SIZE_KEYWORDS.has(low)) {
        sizeKeyword = low;
      } else if (/^[\d.]+(px|%)$/i.test(tok)) {
        numericTokens.push(tok);
      } else if (tok !== '') {
        return null; // unrecognized token (e.g. calc())
      }
    }
    if (numericTokens.length === 1) {
      const r = resolveLength(numericTokens[0], (w + h) / 2);
      if (r === null) return null;
      explicitSize = [r, r];
      shape = 'circle';
    } else if (numericTokens.length === 2) {
      const rx = resolveLength(numericTokens[0], w);
      const ry = resolveLength(numericTokens[1], h);
      if (rx === null || ry === null) return null;
      explicitSize = [rx, ry];
      shape = 'ellipse';
    }

    if (posPart) {
      const resolved = resolvePosition(posPart.trim().split(/\s+/).filter(Boolean), w, h);
      if (!resolved) return null;
      posX = resolved.x;
      posY = resolved.y;
    }

    rest = parts.slice(1);
  }

  const cx = posX * w;
  const cy = posY * h;
  const dxFar = Math.max(cx, w - cx);
  const dyFar = Math.max(cy, h - cy);
  const dxNear = Math.min(cx, w - cx);
  const dyNear = Math.min(cy, h - cy);

  let rx: number;
  let ry: number;
  if (explicitSize) {
    [rx, ry] = explicitSize;
  } else if (shape === 'circle') {
    let r: number;
    switch (sizeKeyword) {
      case 'closest-side':
        r = Math.min(dxNear, dyNear);
        break;
      case 'farthest-side':
        r = Math.max(dxFar, dyFar);
        break;
      case 'closest-corner':
        r = Math.hypot(dxNear, dyNear);
        break;
      default:
        r = Math.hypot(dxFar, dyFar); // farthest-corner
    }
    rx = r;
    ry = r;
  } else {
    switch (sizeKeyword) {
      case 'closest-side':
        rx = dxNear;
        ry = dyNear;
        break;
      case 'farthest-side':
        rx = dxFar;
        ry = dyFar;
        break;
      case 'closest-corner':
        rx = dxNear * Math.SQRT2;
        ry = dyNear * Math.SQRT2;
        break;
      default:
        rx = dxFar * Math.SQRT2;
        ry = dyFar * Math.SQRT2; // farthest-corner
    }
  }

  if (!(rx > 0) || !(ry > 0)) return null;

  // Stop positions are fractions of "the radius"; for an ellipse this is only
  // exact for percentage stops (the common case) — px-specified stops (rare)
  // use the average of rx/ry as an approximate reference radius.
  const stops = parseStopList(rest, (rx + ry) / 2);
  if (!stops) return null;

  return { kind: 'radial', cx, cy, rx, ry, stops };
}

/**
 * Parses a single `linear-gradient()`/`radial-gradient()` CSS value (as
 * returned by `getComputedStyle(...).backgroundImage` for a single-layer
 * background) into ready-to-draw pixel geometry for a `boxWidth`×`boxHeight`
 * box. Returns `null` for anything unsupported: `repeating-*`, `conic-gradient`,
 * `calc()`, or a construct this parser doesn't recognize — callers should
 * leave the original CSS untouched in that case.
 */
export function parseCssGradient(value: string, boxWidth: number, boxHeight: number): ParsedGradient | null {
  if (boxWidth <= 0 || boxHeight <= 0) return null;
  const trimmed = value.trim();
  const m = /^(linear|radial)-gradient\((.*)\)$/is.exec(trimmed);
  if (!m) return null;
  return m[1].toLowerCase() === 'linear' ? parseLinearGradient(m[2], boxWidth, boxHeight) : parseRadialGradient(m[2], boxWidth, boxHeight);
}

// ---------------------------------------------------------------------------
// Canvas + DOM orchestration.
// ---------------------------------------------------------------------------

function paintGradientToCanvas(ctx: CanvasRenderingContext2D, gradient: ParsedGradient, w: number, h: number): void {
  if (gradient.kind === 'linear') {
    const g = ctx.createLinearGradient(gradient.x0, gradient.y0, gradient.x1, gradient.y1);
    for (const s of gradient.stops) g.addColorStop(Math.min(1, Math.max(0, s.position)), s.color);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    return;
  }

  // Ellipse via a non-uniform scale around a unit circle: addColorStop's 0–1
  // offsets then line up directly with the parsed stop fractions regardless
  // of rx/ry.
  ctx.save();
  ctx.translate(gradient.cx, gradient.cy);
  ctx.scale(gradient.rx, gradient.ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (const s of gradient.stops) g.addColorStop(Math.min(1, Math.max(0, s.position)), s.color);
  ctx.fillStyle = g;
  const left = -gradient.cx / gradient.rx;
  const top = -gradient.cy / gradient.ry;
  const right = (w - gradient.cx) / gradient.rx;
  const bottom = (h - gradient.cy) / gradient.ry;
  ctx.fillRect(left, top, right - left, bottom - top);
  ctx.restore();
}

/** Rasterizes one element's gradient background in place, if it has exactly one and it parses. */
function rasterizeElementGradient(win: Window, el: HTMLElement, scale: number): void {
  const bgImage = win.getComputedStyle(el).backgroundImage;
  if (!bgImage || bgImage === 'none') return;

  // Multiple background layers (e.g. a gradient + an image) are left alone —
  // flattening only one layer would lose the others.
  const layers = splitTopLevel(bgImage, ',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (layers.length !== 1 || !/^(linear|radial)-gradient\(/i.test(layers[0])) return;

  const rect = el.getBoundingClientRect();
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);
  if (w <= 0 || h <= 0) return;

  const parsed = parseCssGradient(layers[0], w, h);
  if (!parsed) return;

  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale, scale);
  paintGradientToCanvas(ctx, parsed, w, h);

  const dataUrl = canvas.toDataURL('image/png');
  // `!important` so this always wins, even over an `!important` theme rule.
  // background-clip / mask-image (if any) are left as-is: they clip whatever
  // background-image is present, raster or not.
  el.style.setProperty('background-image', `url(${dataUrl})`, 'important');
  el.style.setProperty('background-size', `${w}px ${h}px`, 'important');
  el.style.setProperty('background-repeat', 'no-repeat', 'important');
  el.style.setProperty('background-position', '0 0', 'important');
}

/**
 * Loads `html` into a hidden, laid-out iframe sized to `viewport`, rasterizes
 * every element with a single-layer CSS gradient background, and returns the
 * resulting HTML string. Falls back to the original `html` untouched on any
 * error (timeout, no canvas support, …) so a PDF export can never fail
 * because of this step.
 */
export async function rasterizeCssGradients(html: string, viewport: { widthPx: number; heightPx: number }, scale = 2): Promise<string> {
  if (typeof document === 'undefined') return html;
  // Cheap bail-out: the overwhelming majority of exports have no gradient at
  // all, and this is a plain text search, not a parse — skip the iframe
  // round-trip entirely rather than taxing every PDF export for a feature
  // most documents never use.
  if (!/(linear|radial)-gradient\(/i.test(html)) return html;

  let iframe: HTMLIFrameElement | null = null;
  try {
    iframe = document.createElement('iframe');
    iframe.style.cssText = `position:fixed; left:-99999px; top:0; width:${viewport.widthPx}px; height:${viewport.heightPx}px; border:0; visibility:hidden; pointer-events:none;`;
    document.body.appendChild(iframe);

    const loaded = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('iframe load timed out')), 5000);
      iframe!.addEventListener(
        'load',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
    iframe.srcdoc = html;
    await loaded;

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!win || !doc || !doc.body) return html;

    for (const el of Array.from(doc.body.querySelectorAll<HTMLElement>('*'))) {
      try {
        rasterizeElementGradient(win, el, scale);
      } catch (err) {
        console.warn('[gradientRasterizer] skipped an element:', err);
      }
    }

    return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
  } catch (err) {
    console.warn('[gradientRasterizer] falling back to the original HTML:', err);
    return html;
  } finally {
    iframe?.remove();
  }
}
