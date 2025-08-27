import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

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
      const response = await axios.post(`${API_BASE_URL}/api/file/read`, { path });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return { content: '', error: error.response.data.error || 'Failed to read file' };
      }
      return { content: '', error: 'Network error' };
    }
  },

  // ファイル保存
  async saveFile(path: string, content: string): Promise<SaveResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/file/save`, { path, content });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return { success: false, error: error.response.data.error || 'Failed to save file' };
      }
      return { success: false, error: 'Network error' };
    }
  },

  // ヘルスチェック
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.status === 200;
    } catch {
      return false;
    }
  }
};
