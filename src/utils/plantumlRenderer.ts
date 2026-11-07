/**
 * PlantUML diagrams rendered in-process by `@plantuml/core` — the official
 * PlantUML engine compiled to JavaScript with TeaVM (MIT). It runs entirely
 * inside the webview: no Java, no server, no network access (issue #539).
 *
 * Only the engine itself (`plantuml.js`) is bundled. The engine would lazy-load
 * `themes.js`, `emoji.js` and the stdlib bundles (`!include <C4/...>`) through
 * its script loader; we install a loader hook (`PLANTUML_STDLIB_LOADER`) that
 * fails those requests immediately, so a `!theme` is ignored with a console
 * warning, a stdlib `!include` yields the engine's own error diagram and emoji
 * fail through `onError` (red error box) —
 * without the engine appending `<script>` tags to the document or hitting the
 * asset protocol. Nothing is ever fetched from a CDN.
 *
 * Constraints inherited from the engine:
 * - It builds the SVG through the DOM (`document.createElementNS`, canvas
 *   `measureText`), so it cannot run in a Web Worker; it runs on the main
 *   thread like Mermaid and yields to the event loop between steps.
 * - It keeps shared internal state across calls, so renders are serialized.
 * - A render cannot be cancelled once started. Rendered SVGs are therefore
 *   memoized per (source, dark) so re-rendering the preview after an edit only
 *   pays for the diagrams that actually changed.
 * - Graphviz-family diagrams (class, component, state, use case, ...) are laid
 *   out by the built-in Smetana engine; the WASM Graphviz bridge is not loaded.
 */

import { decodeCodeBlockEntities, replaceFirst } from './htmlText';
import { buildDiagramErrorHtml, createSerialLock } from './diagramCommon';

/** Fenced-code languages treated as PlantUML (issue #539). */
export const PLANTUML_LANGS = ['plantuml', 'puml', 'uml'] as const;

const LANG_ALTERNATION = PLANTUML_LANGS.join('|');

// Detection pattern (no 'g' flag — .test() on a global regex is stateful).
const PLANTUML_BLOCK_DETECT_RE = new RegExp('```(?:' + LANG_ALTERNATION + ')\\s*\\n');

// After marked, a ```plantuml block becomes <pre><code class="language-plantuml">.
// Marp emits <pre is="marp-pre" ...><code class="language-plantuml">, so allow
// attributes on <pre>. The language must be the whole class token.
const PLANTUML_HTML_RE = new RegExp(
  '<pre[^>]*><code class="(?:[^"]*\\s)?language-(?:' + LANG_ALTERNATION + ')(?:\\s[^"]*)?">([\\s\\S]*?)<\\/code><\\/pre>',
  'g',
);

// The engine prints internal timing traces ("[   12 ms] [PSystemBuilder2] ...")
// through console.log on every render — a dozen lines per diagram. They are
// filtered while a render is in flight (renders are serialized, so the window
// only ever covers our own call).
const ENGINE_TRACE_RE = /^\[\s*\d+ ms\] \[/;

// A render whose callbacks never fire would otherwise hold the lock forever.
export const RENDER_TIMEOUT_MS = 30_000;

// Memoized SVGs. Each entry is one diagram's output (a few KB to a few hundred
// KB); 50 entries comfortably covers a large document while bounding memory.
const SVG_CACHE_MAX_ENTRIES = 50;

/** Check whether content contains a PlantUML fenced block. */
export function contentHasPlantUml(content: string): boolean {
  return PLANTUML_BLOCK_DETECT_RE.test(content);
}

/**
 * Markdown-embedded PlantUML conventionally omits the `@startuml` / `@enduml`
 * envelope (GitLab, markdown-it-plantuml, ...). Add it when no `@start...`
 * directive is present; blocks that spell out `@startmindmap`, `@startgantt`
 * etc. are passed through unchanged.
 */
export function ensureStartDirective(source: string): string {
  if (/^\s*@start\w+/m.test(source)) return source;
  return `@startuml\n${source}\n@enduml`;
}

type PlantUmlEngine = typeof import('@plantuml/core');

/**
 * Hook the engine consults before loading a support script (`themes.js`, the
 * stdlib bundles). Those files are deliberately not shipped: failing here is
 * instant and side-effect free, whereas the engine's fallback would append a
 * `<script>` tag to <head> on every render and wait for its `onerror`.
 */
const stdlibLoader: NonNullable<typeof globalThis.PLANTUML_STDLIB_LOADER> = (name, _onLoad, onError) => {
  onError(`${name} is not bundled with Bokuchi`);
};

// Lazy-loaded engine (≈4 MB of JS); only documents that use PlantUML pay for it.
let engineModule: PlantUmlEngine | null = null;

async function getEngine(): Promise<PlantUmlEngine> {
  if (!engineModule) {
    globalThis.PLANTUML_STDLIB_LOADER = stdlibLoader;
    engineModule = await import('@plantuml/core');
  }
  return engineModule;
}

function renderSource(engine: PlantUmlEngine, source: string, dark: boolean): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const originalLog = console.log;
    const filteredLog = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && ENGINE_TRACE_RE.test(args[0])) return;
      originalLog.apply(console, args);
    };
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (console.log === filteredLog) console.log = originalLog;
      fn();
    };
    const timer = setTimeout(
      () => finish(() => reject(new Error(`PlantUML render timed out after ${RENDER_TIMEOUT_MS / 1000}s`))),
      RENDER_TIMEOUT_MS,
    );

    console.log = filteredLog;
    try {
      engine.renderToString(
        source.split(/\r\n|\r|\n/),
        (svg) => finish(() => resolve(svg)),
        (message) => finish(() => reject(new Error(message))),
        { dark },
      );
    } catch (err) {
      finish(() => reject(err instanceof Error ? err : new Error(String(err))));
    }
  });
}

// Serialize renders: the engine shares internal state between calls and
// silently overwrites an in-flight result when called concurrently.
const renderLock = createSerialLock();

// (source, dark) → SVG, in insertion order; re-inserted on hit so eviction is LRU.
const svgCache = new Map<string, string>();

function cachedRender(engine: PlantUmlEngine, source: string, dark: boolean): Promise<string> {
  const key = `${dark ? 'd' : 'l'}\0${source}`;
  const hit = svgCache.get(key);
  if (hit !== undefined) {
    svgCache.delete(key);
    svgCache.set(key, hit);
    return Promise.resolve(hit);
  }
  return renderSource(engine, source, dark).then((svg) => {
    svgCache.set(key, svg);
    if (svgCache.size > SVG_CACHE_MAX_ENTRIES) {
      svgCache.delete(svgCache.keys().next().value!);
    }
    return svg;
  });
}

/** Test hook: drop memoized SVGs. */
export function clearPlantUmlCache(): void {
  svgCache.clear();
}

export interface ProcessPlantUmlOptions {
  /**
   * Polled after the lock is acquired and before each diagram. When it returns
   * true the remaining blocks are left as-is and the (partially processed)
   * HTML is returned, so a preview run that is already superseded does not
   * keep the main thread busy rendering output nobody will see.
   */
  shouldAbort?: () => boolean;
}

/**
 * Process PlantUML code blocks in HTML (after marked parsing, after DOMPurify).
 * Replaces each block with the rendered inline SVG, or with an error box when
 * the engine fails. The engine's own syntax-error diagram counts as a
 * successful render and is shown as-is, mirroring PlantUML everywhere else.
 */
export function processPlantUmlBlocks(html: string, dark = false, options: ProcessPlantUmlOptions = {}): Promise<string> {
  return renderLock.run(() => processPlantUmlBlocksInternal(html, dark, options.shouldAbort));
}

async function processPlantUmlBlocksInternal(html: string, dark: boolean, shouldAbort?: () => boolean): Promise<string> {
  const matches: { full: string; code: string }[] = [];
  PLANTUML_HTML_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PLANTUML_HTML_RE.exec(html)) !== null) {
    matches.push({ full: match[0], code: match[1] });
  }
  if (matches.length === 0) return html;

  const engine = await getEngine();

  let result = html;
  for (const m of matches) {
    if (shouldAbort?.()) break;
    const source = ensureStartDirective(decodeCodeBlockEntities(m.code));
    try {
      const svg = await cachedRender(engine, source, dark);
      result = replaceFirst(result, m.full, `<div class="plantuml-diagram">${svg}</div>`);
    } catch (err) {
      result = replaceFirst(result, m.full, buildDiagramErrorHtml('plantuml-error', 'PlantUML Error', err));
    }
  }

  return result;
}
