import { invoke } from '@tauri-apps/api/core';

export interface FileResponse {
  content: string;
  error?: string;
}

export interface SaveResponse {
  success: boolean;
  error?: string;
}

export const fileApi = {
  // ファイル読み込み
  async readFile(path: string): Promise<FileResponse> {
    try {
      const content = await invoke<string>('read_file', { path });
      return { content };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : error?.toString() || 'Unknown error';
      return { content: '', error: errorMessage };
    }
  },

  // ファイル保存
  async saveFile(path: string, content: string): Promise<SaveResponse> {
    try {
      await invoke('save_file', { path, content });
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : error?.toString() || 'Unknown error';
      return { success: false, error: errorMessage };
    }
  },

  // ヘルスチェック（Tauriでは常にtrue）
  async healthCheck(): Promise<boolean> {
    return true;
  }
};
