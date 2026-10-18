/**
 * Type declarations for `@plantuml/core` — the PlantUML engine compiled to
 * JavaScript with TeaVM (MIT, ≥ 1.2026.6). The package ships no types; the
 * public surface is the two functions exported from `plantuml.js`.
 *
 * Both calls are asynchronous: the engine starts lazily on the first call and
 * delivers its result through callbacks. It keeps shared internal state, so
 * renders MUST be serialized (see plantumlRenderer.ts).
 */
declare module '@plantuml/core' {
  export interface PlantUmlRenderOptions {
    /** Produce the dark-mode SVG palette. */
    dark?: boolean;
  }

  /** Render into the DOM element with the given id (SVG is written later). */
  export function render(lines: string[], targetId: string, options?: PlantUmlRenderOptions): void;

  /**
   * Render and deliver the SVG markup as a string. Syntax errors still succeed
   * and yield PlantUML's own error diagram; `onError` fires for engine-level
   * failures (unsupported diagram type, missing support script, ...).
   */
  export function renderToString(
    lines: string[],
    onSuccess: (svg: string) => void,
    onError: (message: string) => void,
    options?: PlantUmlRenderOptions,
  ): void;
}
