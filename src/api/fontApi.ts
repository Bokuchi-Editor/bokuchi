import { invoke } from '@tauri-apps/api/core';

/** One installed font family, as reported by the Rust `list_system_fonts` command. */
export interface SystemFontFamily {
  name: string;
  monospaced: boolean;
}

// The installed-font list is stable for the lifetime of the process, so one
// invoke per session is enough (fonts installed while the app runs appear
// after a restart). The promise itself is cached so concurrent callers share
// a single IPC round-trip.
let fontListPromise: Promise<SystemFontFamily[]> | null = null;

export const fontApi = {
  /** List installed font families, sorted case-insensitively. Cached per session. */
  async listSystemFonts(): Promise<SystemFontFamily[]> {
    if (!fontListPromise) {
      fontListPromise = invoke<SystemFontFamily[]>('list_system_fonts').catch((error) => {
        console.error('Failed to list system fonts:', error);
        // Drop the rejected promise so a later settings-dialog open can retry.
        fontListPromise = null;
        return [];
      });
    }
    return fontListPromise;
  },
};
