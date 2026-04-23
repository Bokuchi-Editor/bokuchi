import { invoke } from '@tauri-apps/api/core';

/**
 * Lightweight string hash used to fingerprint editor content without logging
 * the content itself. Not cryptographic — collision is fine for debugging.
 */
export const shortHash = (value: string): string => {
  let h = 5381;
  for (let i = 0; i < value.length; i++) {
    h = ((h << 5) + h + value.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
};

/**
 * Summarize a potentially-long string for logs: length + short hash + a few
 * leading/trailing characters, with newlines escaped.
 */
export const summarize = (value: string | undefined | null): Record<string, unknown> => {
  if (value == null) return { nil: true };
  const head = value.slice(0, 20).replace(/\r/g, '\\r').replace(/\n/g, '\\n');
  const tail = value.slice(Math.max(0, value.length - 10)).replace(/\r/g, '\\r').replace(/\n/g, '\\n');
  return {
    len: value.length,
    hash: shortHash(value),
    head,
    tail,
    hasCRLF: value.includes('\r\n'),
  };
};

/**
 * Fire-and-forget logger. Writes a timestamped line to the Rust-managed
 * debug.log file (in the app log dir) and also emits a console entry for
 * dev builds.
 *
 * Safe to call from anywhere — never throws, never awaits.
 */
export const debugLog = (tag: string, data?: unknown): void => {
  let payload: string;
  try {
    payload = data === undefined ? '' : JSON.stringify(data, jsonSafeReplacer);
  } catch {
    payload = '[unserializable]';
  }
  const line = payload ? `${tag} ${payload}` : tag;

  try {
    // Console first so dev devtools show it immediately.
    console.log('[DEBUG]', tag, data);
  } catch {
    /* ignore */
  }

  // Best-effort forward to Rust. Do not await — callers may be on the hot path.
  try {
    const p = invoke('append_debug_log', { line });
    if (p && typeof (p as Promise<unknown>).catch === 'function') {
      (p as Promise<unknown>).catch(() => {
        /* swallow — don't let logging break the app */
      });
    }
  } catch {
    /* swallow synchronous errors too */
  }
};

/**
 * Log an error-shaped object with message + stack.
 */
export const debugLogError = (tag: string, error: unknown, extra?: Record<string, unknown>): void => {
  const err = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : { raw: String(error) };
  debugLog(tag, { ...err, ...(extra ?? {}) });
};

/**
 * Capture a short stack trace without actually throwing. Used to attribute
 * cursor-moving Monaco calls to their triggering source.
 */
export const shortStack = (skip = 2): string => {
  const err = new Error('stack');
  const raw = (err.stack ?? '').split('\n');
  // Drop the "Error" header + `shortStack` frame + `skip` extra user frames.
  return raw.slice(1 + skip, 1 + skip + 6).join(' <- ').trim();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jsonSafeReplacer = (_key: string, value: any): any => {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (typeof value === 'function') {
    return '[function]';
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
};
