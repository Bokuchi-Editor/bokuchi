import { escapeHtml } from './htmlText';

/**
 * Plumbing shared by the diagram post-processors (Mermaid, PlantUML). Each
 * engine keeps its own lock instance; the helpers only remove the duplicated
 * boilerplate.
 */

/**
 * A promise-chain mutex. `run` waits for every earlier call to finish before
 * starting `task`, so an engine with shared internal state never sees two
 * renders in flight. The chain never rejects: a failing task releases the lock
 * in `finally` and its rejection propagates only to its own caller.
 */
export function createSerialLock(): { run<T>(task: () => Promise<T>): Promise<T> } {
  let tail: Promise<void> = Promise.resolve();
  return {
    async run<T>(task: () => Promise<T>): Promise<T> {
      const previous = tail;
      let release!: () => void;
      tail = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      try {
        return await task();
      } finally {
        release();
      }
    },
  };
}

/**
 * The red error box shown in place of a diagram that failed to render. The
 * message is escaped here because this HTML is spliced in AFTER DOMPurify and
 * engine messages echo user input.
 */
export function buildDiagramErrorHtml(className: string, label: string, err: unknown): string {
  const message = escapeHtml(err instanceof Error ? err.message : String(err));
  return `<div class="${className}" style="color:red;border:1px solid red;padding:8px;border-radius:4px;"><strong>${label}:</strong> ${message}</div>`;
}
