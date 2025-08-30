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
    } catch (error: any) {
      return { content: '', error: error.toString() };
    }
  },

  // ファイル保存
  async saveFile(path: string, content: string): Promise<SaveResponse> {
    try {
      await invoke('save_file', { path, content });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.toString() };
    }
  },

  // ヘルスチェック（Tauriでは常にtrue）
  async healthCheck(): Promise<boolean> {
    return true;
  }
};
