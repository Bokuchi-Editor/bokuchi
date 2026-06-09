// Bundle Monaco locally instead of letting @monaco-editor/react fetch it from
// the jsDelivr CDN at runtime (the loader's default `vs` path).
//
// Why this matters:
//  - Bokuchi is an offline-first editor; a runtime CDN dependency breaks the
//    core concept (no editor without a network connection).
//  - It is also a security issue: the editor — running with the app's IPC and
//    filesystem privileges — would execute third-party code fetched at launch,
//    and it blocks adopting a strict Content-Security-Policy (`script-src 'self'`).
//
// Importing the package and handing the instance to `loader.config({ monaco })`
// makes Vite bundle Monaco into the app, so it is served from `'self'` and works
// fully offline.
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
// Vite bundles this worker locally (no CDN). Markdown / plain-text editing only
// needs the base editor worker — we intentionally don't ship the ts/json/css/html
// language workers.
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

(self as unknown as { MonacoEnvironment: monaco.Environment }).MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};

// The AMD/CDN loader used to expose Monaco as `window.monaco`; editorSync and the
// Editor onMount fallback still read that global, so preserve the contract.
(window as unknown as { monaco: typeof monaco }).monaco = monaco;

// Point @monaco-editor/react at the bundled instance so it never calls the CDN.
loader.config({ monaco });
