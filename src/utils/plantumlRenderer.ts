/**
 * PlantUML diagrams rendered in-process by `@plantuml/core` — the official
 * PlantUML engine compiled to JavaScript with TeaVM (MIT). It runs entirely
 * inside the webview: no Java, no server, no network access (issue #539).
 *
 * Only the engine itself (`plantuml.js`) is bundled. The engine would lazy-load
 * `themes.js`, `emoji.js` and the stdlib bundles (`!include <C4/...>`) via
 * relative `<script>` tags; those files are intentionally not shipped, so a
 * `!theme` is ignored with a console warning and stdlib includes / emoji fail
 * with the engine's error output. Nothing is ever fetched from a CDN.
 *
 * Constraints inherited from the engine:
 * - It builds the SVG through the DOM (`document.createElementNS`, canvas
 *   `measureText`), so it cannot run in a Web Worker; it runs on the main
 *   thread like Mermaid and yields to the event loop between steps.
 * - It keeps shared internal state across calls, so renders are serialized.
 * - Graphviz-family diagrams (class, component, state, use case, ...) are laid
 *   out by the built-in Smetana engine; the WASM Graphviz bridge is not loaded.
 */

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
const RENDER_TIMEOUT_MS = 30_000;

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

/**
 * Escape HTML-significant characters. The error branch echoes engine messages
 * that can quote user input, and this HTML is spliced in AFTER DOMPurify has
 * run, so it must never carry live markup.
 */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

type PlantUmlEngine = typeof import('@plantuml/core');

// Lazy-loaded engine (≈4 MB of JS); only documents that use PlantUML pay for it.
let engineModule: PlantUmlEngine | null = null;

async function getEngine(): Promise<PlantUmlEngine> {
  if (!engineModule) {
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
let renderLock: Promise<void> = Promise.resolve();

/**
 * Process PlantUML code blocks in HTML (after marked parsing, after DOMPurify).
 * Replaces each block with the rendered inline SVG, or with an error box when
 * the engine fails. The engine's own syntax-error diagram counts as a
 * successful render and is shown as-is, mirroring PlantUML everywhere else.
 */
export async function processPlantUmlBlocks(html: string, dark = false): Promise<string> {
  const previousLock = renderLock;
  let releaseLock!: () => void;
  renderLock = new Promise<void>((resolve) => { releaseLock = resolve; });
  await previousLock;

  try {
    return await processPlantUmlBlocksInternal(html, dark);
  } finally {
    releaseLock();
  }
}

async function processPlantUmlBlocksInternal(html: string, dark: boolean): Promise<string> {
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
    // Decode the entities marked (and Marp's markdown-it) introduced.
    const decoded = m.code
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    try {
      const svg = await renderSource(engine, ensureStartDirective(decoded), dark);
      result = result.replace(m.full, `<div class="plantuml-diagram">${svg}</div>`);
    } catch (err) {
      const errorMsg = escapeHtml(err instanceof Error ? err.message : String(err));
      result = result.replace(
        m.full,
        `<div class="plantuml-error" style="color:red;border:1px solid red;padding:8px;border-radius:4px;"><strong>PlantUML Error:</strong> ${errorMsg}</div>`,
      );
    }
  }

  return result;
}
