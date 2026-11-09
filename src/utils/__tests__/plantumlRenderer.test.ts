import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the TeaVM-compiled engine: it is ~4 MB, DOM-bound and callback-based.
vi.mock('@plantuml/core', () => ({
  render: vi.fn(),
  renderToString: vi.fn(),
}));

import { renderToString } from '@plantuml/core';
import {
  PLANTUML_LANGS,
  RENDER_TIMEOUT_MS,
  clearPlantUmlCache,
  contentHasPlantUml,
  ensureStartDirective,
  processPlantUmlBlocks,
} from '../plantumlRenderer';

const mockRenderToString = vi.mocked(renderToString);

/** Make the mock succeed with `svg` for every call (asynchronously, like the engine). */
function succeedWith(svg: string) {
  mockRenderToString.mockImplementation((_lines, onSuccess) => {
    setTimeout(() => onSuccess(svg), 0);
  });
}

/** Make the mock fail with `message` for every call. */
function failWith(message: string) {
  mockRenderToString.mockImplementation((_lines, _onSuccess, onError) => {
    setTimeout(() => onError(message), 0);
  });
}

describe('contentHasPlantUml', () => {
  it.each(PLANTUML_LANGS)('detects ```%s blocks', (lang) => {
    expect(contentHasPlantUml('```' + lang + '\nA -> B\n```')).toBe(true);
  });

  it('returns false for other languages and empty content', () => {
    expect(contentHasPlantUml('```mermaid\ngraph TD\n```')).toBe(false);
    expect(contentHasPlantUml('```javascript\nconst a = 1;\n```')).toBe(false);
    expect(contentHasPlantUml('')).toBe(false);
  });

  it('is stateless across repeated calls (no global-regex lastIndex drift)', () => {
    const content = '```plantuml\nA -> B\n```';
    expect(contentHasPlantUml(content)).toBe(true);
    expect(contentHasPlantUml(content)).toBe(true);
    expect(contentHasPlantUml(content)).toBe(true);
  });
});

describe('ensureStartDirective', () => {
  it('wraps a bare body in @startuml / @enduml', () => {
    expect(ensureStartDirective('A -> B : hi')).toBe('@startuml\nA -> B : hi\n@enduml');
  });

  it('leaves explicit envelopes untouched, including non-uml diagram kinds', () => {
    const uml = '@startuml\nA -> B\n@enduml';
    expect(ensureStartDirective(uml)).toBe(uml);
    const mindmap = '@startmindmap\n* root\n@endmindmap';
    expect(ensureStartDirective(mindmap)).toBe(mindmap);
  });

  it('accepts a directive that is not on the first line (preamble comments)', () => {
    const src = "' comment\n@startuml\nA -> B\n@enduml";
    expect(ensureStartDirective(src)).toBe(src);
  });
});

describe('processPlantUmlBlocks', () => {
  beforeEach(() => {
    mockRenderToString.mockReset();
    clearPlantUmlCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('replaces a ```plantuml block with the rendered SVG', async () => {
    succeedWith('<svg>diagram</svg>');
    const html = '<p>before</p><pre><code class="language-plantuml">A -&gt; B : hi</code></pre><p>after</p>';
    const result = await processPlantUmlBlocks(html);
    expect(result).toBe('<p>before</p><div class="plantuml-diagram"><svg>diagram</svg></div><p>after</p>');
  });

  it('decodes entities, adds the envelope and splits into lines for the engine', async () => {
    succeedWith('<svg/>');
    const html = '<pre><code class="language-puml">A --&gt; B &amp; C : &quot;q&quot; &#39;s&#39;</code></pre>';
    await processPlantUmlBlocks(html);
    expect(mockRenderToString).toHaveBeenCalledTimes(1);
    const [lines, , , options] = mockRenderToString.mock.calls[0];
    expect(lines).toEqual(['@startuml', 'A --> B & C : "q" \'s\'', '@enduml']);
    expect(options).toEqual({ dark: false });
  });

  it('passes the dark flag through to the engine', async () => {
    succeedWith('<svg/>');
    await processPlantUmlBlocks('<pre><code class="language-uml">A -&gt; B</code></pre>', true);
    expect(mockRenderToString.mock.calls[0][3]).toEqual({ dark: true });
  });

  it('keeps an explicit @startmindmap envelope as written', async () => {
    succeedWith('<svg/>');
    await processPlantUmlBlocks('<pre><code class="language-plantuml">@startmindmap\n* a\n@endmindmap</code></pre>');
    expect(mockRenderToString.mock.calls[0][0]).toEqual(['@startmindmap', '* a', '@endmindmap']);
  });

  it('renders an escaped error box when the engine reports a failure', async () => {
    // Engine messages can quote user input, and this HTML is spliced in AFTER
    // DOMPurify, so markup in the message must never go live.
    failWith('Unsupported diagram type <img src=x onerror=alert(1)>');
    const result = await processPlantUmlBlocks('<pre><code class="language-plantuml">@startditaa\n@endditaa</code></pre>');
    expect(result).toContain('class="plantuml-error"');
    expect(result).toContain('PlantUML Error:');
    expect(result).not.toContain('<img src=x onerror');
    expect(result).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('processes blocks inside Marp <pre is="marp-pre"> output', async () => {
    succeedWith('<svg>slide</svg>');
    const html = '<pre is="marp-pre" data-auto-scaling="downscale-only"><code class="language-plantuml">A -&gt; B</code></pre>';
    const result = await processPlantUmlBlocks(html);
    expect(result).toBe('<div class="plantuml-diagram"><svg>slide</svg></div>');
  });

  it('ignores highlighted code blocks and other languages', async () => {
    const html =
      '<pre><code class="hljs language-javascript">const a = 1;</code></pre>' +
      '<pre><code class="language-mermaid">graph TD</code></pre>' +
      '<pre><code class="language-umlx">not plantuml</code></pre>';
    const result = await processPlantUmlBlocks(html);
    expect(result).toBe(html);
    expect(mockRenderToString).not.toHaveBeenCalled();
  });

  it('renders multiple blocks one after another (engine state is shared)', async () => {
    const order: string[] = [];
    mockRenderToString.mockImplementation((lines, onSuccess) => {
      order.push(`start:${lines[1]}`);
      setTimeout(() => {
        order.push(`end:${lines[1]}`);
        onSuccess(`<svg>${lines[1]}</svg>`);
      }, 0);
    });
    const html =
      '<pre><code class="language-plantuml">one</code></pre>' +
      '<pre><code class="language-plantuml">two</code></pre>';
    const result = await processPlantUmlBlocks(html);
    expect(result).toBe('<div class="plantuml-diagram"><svg>one</svg></div><div class="plantuml-diagram"><svg>two</svg></div>');
    expect(order).toEqual(['start:one', 'end:one', 'start:two', 'end:two']);
  });

  it('serializes concurrent calls so the engine never sees overlapping renders', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    mockRenderToString.mockImplementation((lines, onSuccess) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      setTimeout(() => {
        inFlight--;
        onSuccess(`<svg>${lines[1]}</svg>`);
      }, 5);
    });
    const [a, b] = await Promise.all([
      processPlantUmlBlocks('<pre><code class="language-plantuml">a</code></pre>'),
      processPlantUmlBlocks('<pre><code class="language-plantuml">b</code></pre>'),
    ]);
    expect(a).toContain('<svg>a</svg>');
    expect(b).toContain('<svg>b</svg>');
    expect(maxInFlight).toBe(1);
  });

  it('drops the engine timing traces from console.log during a render only', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockRenderToString.mockImplementation((_lines, onSuccess) => {
      console.log('[    12 ms] [PSystemBuilder2] createDiagram start');
      console.log('app log during render');
      setTimeout(() => onSuccess('<svg/>'), 0);
    });
    await processPlantUmlBlocks('<pre><code class="language-plantuml">a</code></pre>');
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('app log during render');
    // Restored afterwards: the trace pattern reaches console.log again.
    console.log('[     1 ms] [after]');
    expect(logSpy).toHaveBeenCalledTimes(2);
    logSpy.mockRestore();
  });

  it('restores console.log when the engine reports an error', async () => {
    const before = console.log;
    failWith('boom');
    await processPlantUmlBlocks('<pre><code class="language-plantuml">a</code></pre>');
    expect(console.log).toBe(before);
  });

  it('splices SVG and error text literally even when they contain `$` patterns', async () => {
    // String.prototype.replace expands `$&` / `$'` / `` $` `` in a string
    // replacement; a label like "cost $& fee" must not duplicate the document.
    succeedWith('<svg>cost $& fee $\' $` $$</svg>');
    const html = '<p>before</p><pre><code class="language-plantuml">A -&gt; B</code></pre><p>after</p>';
    const result = await processPlantUmlBlocks(html);
    expect(result).toBe('<p>before</p><div class="plantuml-diagram"><svg>cost $& fee $\' $` $$</svg></div><p>after</p>');

    clearPlantUmlCache();
    failWith('bad $& token');
    const errResult = await processPlantUmlBlocks(html);
    expect(errResult).toContain('PlantUML Error:</strong> bad $&amp; token');
    expect(errResult).not.toContain('language-plantuml');
  });

  it('renders duplicate identical blocks in order', async () => {
    succeedWith('<svg>same</svg>');
    const block = '<pre><code class="language-plantuml">A -&gt; B</code></pre>';
    const result = await processPlantUmlBlocks(`${block}<p>mid</p>${block}`);
    expect(result).toBe('<div class="plantuml-diagram"><svg>same</svg></div><p>mid</p><div class="plantuml-diagram"><svg>same</svg></div>');
  });

  it('memoizes rendered SVGs per source and dark flag', async () => {
    succeedWith('<svg>cached</svg>');
    const html = '<pre><code class="language-plantuml">A -&gt; B</code></pre>';
    await processPlantUmlBlocks(html);
    await processPlantUmlBlocks(html);
    expect(mockRenderToString).toHaveBeenCalledTimes(1);
    // Different palette → separate entry.
    await processPlantUmlBlocks(html, true);
    expect(mockRenderToString).toHaveBeenCalledTimes(2);
    // Failures are not cached: the next attempt renders again.
    clearPlantUmlCache();
    failWith('nope');
    await processPlantUmlBlocks(html);
    succeedWith('<svg>ok</svg>');
    const result = await processPlantUmlBlocks(html);
    expect(result).toContain('<svg>ok</svg>');
    expect(mockRenderToString).toHaveBeenCalledTimes(4);
  });

  it('stops rendering the remaining blocks when shouldAbort returns true', async () => {
    succeedWith('<svg>one</svg>');
    let aborted = false;
    mockRenderToString.mockImplementation((lines, onSuccess) => {
      aborted = true; // the run is superseded while the first diagram renders
      setTimeout(() => onSuccess(`<svg>${lines[1]}</svg>`), 0);
    });
    const html =
      '<pre><code class="language-plantuml">one</code></pre>' +
      '<pre><code class="language-plantuml">two</code></pre>';
    const result = await processPlantUmlBlocks(html, false, { shouldAbort: () => aborted });
    expect(mockRenderToString).toHaveBeenCalledTimes(1);
    expect(result).toBe('<div class="plantuml-diagram"><svg>one</svg></div><pre><code class="language-plantuml">two</code></pre>');
  });

  it('fails a render whose callbacks never fire after the timeout, then releases the lock', async () => {
    vi.useFakeTimers();
    const before = console.log;
    mockRenderToString.mockImplementation(() => { /* never calls back */ });
    const pending = processPlantUmlBlocks('<pre><code class="language-plantuml">hang</code></pre>');
    await vi.advanceTimersByTimeAsync(RENDER_TIMEOUT_MS);
    const result = await pending;
    expect(result).toContain('PlantUML Error:');
    expect(result).toContain(`timed out after ${RENDER_TIMEOUT_MS / 1000}s`);
    expect(console.log).toBe(before);

    // The lock is free again: a following render goes through immediately.
    succeedWith('<svg>next</svg>');
    const next = processPlantUmlBlocks('<pre><code class="language-plantuml">next</code></pre>');
    await vi.advanceTimersByTimeAsync(1);
    expect(await next).toContain('<svg>next</svg>');
  });

  it('installs a stdlib loader hook that fails fast instead of injecting <script> tags', async () => {
    succeedWith('<svg/>');
    await processPlantUmlBlocks('<pre><code class="language-plantuml">a</code></pre>');
    const loader = globalThis.PLANTUML_STDLIB_LOADER;
    expect(typeof loader).toBe('function');
    const onLoad = vi.fn();
    const onError = vi.fn();
    const handled = loader!('themes.js', onLoad, onError);
    expect(handled).not.toBe(false);
    expect(onLoad).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('themes.js'));
  });
});
