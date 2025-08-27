import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

export interface Variable {
  name: string;
  value: string;
}

export interface VariableResponse {
  success: boolean;
  error?: string;
}

export interface ProcessMarkdownResponse {
  processedContent: string;
  error?: string;
}

export const variableApi = {
  // グローバル変数を設定
  async setGlobalVariable(name: string, value: string): Promise<VariableResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/variables/set`, { name, value });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return { success: false, error: error.response.data.error || 'Failed to set variable' };
      }
      return { success: false, error: 'Network error' };
    }
  },

  // グローバル変数を取得
  async getGlobalVariables(): Promise<Record<string, string>> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/variables/get`);
      return response.data.variables || {};
    } catch (error: any) {
      console.error('Failed to get variables:', error);
      return {};
    }
  },

  // YAMLから変数を読み込み
  async loadVariablesFromYAML(yamlContent: string): Promise<VariableResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/variables/load`, { yamlContent });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return { success: false, error: error.response.data.error || 'Failed to load variables' };
      }
      return { success: false, error: 'Network error' };
    }
  },

  // 変数をYAML形式でエクスポート
  async exportVariablesToYAML(): Promise<string> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/variables/export`);
      return response.data.yamlContent || '';
    } catch (error: any) {
      console.error('Failed to export variables:', error);
      return '';
    }
  },

  // Markdownを処理（変数展開）
  async processMarkdown(content: string): Promise<ProcessMarkdownResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/markdown/process`, { content });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return { processedContent: content, error: error.response.data.error || 'Failed to process markdown' };
      }
      return { processedContent: content, error: 'Network error' };
    }
  }
};
