/**
 * Type declarations for `@plantuml/core` — the PlantUML engine compiled to
 * JavaScript with TeaVM (MIT, ≥ 1.2026.6). The package ships no types; the
 * public surface is the two functions exported from `plantuml.js` plus the
 * optional global loader hook below.
 *
 * Both calls are asynchronous: the engine starts lazily on the first call and
 * delivers its result through callbacks. It keeps shared internal state, so
 * renders MUST be serialized (see plantumlRenderer.ts).
 */
declare module '@plantuml/core' {
  export interface PlantUmlRenderOptions {
    /** Produce the dark-mode SVG palette. */
    dark?: boolean;
    /** Upper bound (px) on either SVG dimension; the engine's default applies when omitted. */
    maxSvgSize?: number;
  }

  /** Render into the DOM element with the given id (SVG is written later). */
  export function render(lines: string[], targetId: string, options?: PlantUmlRenderOptions): void;

  /**
   * Render and deliver the SVG markup as a string. Syntax errors and failed
   * `!include`s still succeed and yield PlantUML's own error diagram;
   * `onError` fires for engine-level failures (unsupported diagram type such
   * as ditaa, the emoji support script being unavailable, ...).
   */
  export function renderToString(
    lines: string[],
    onSuccess: (svg: string) => void,
    onError: (message: string) => void,
    options?: PlantUmlRenderOptions,
  ): void;
}

/**
 * Called by the engine before it loads a support script (`themes.js`, stdlib
 * bundles such as `c4.min.js`). Return `false` to fall back to the engine's
 * own `<script>`-tag loader; any other return value means the hook handled it
 * and will call `onLoad` or `onError`.
 */
declare var PLANTUML_STDLIB_LOADER:
  | ((name: string, onLoad: () => void, onError: (message?: string) => void) => boolean | void)
  | undefined;
