import { invoke } from '@tauri-apps/api/core';

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
      await invoke('set_global_variable', { name, value });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.toString() };
    }
  },

  // グローバル変数を取得
  async getGlobalVariables(): Promise<Record<string, string>> {
    try {
      const variables = await invoke<Record<string, string>>('get_global_variables');
      return variables || {};
    } catch (error: any) {
      console.error('Failed to get variables:', error);
      return {};
    }
  },

  // YAMLから変数を読み込み
  async loadVariablesFromYAML(yamlContent: string): Promise<VariableResponse> {
    try {
      await invoke('load_variables_from_yaml', { yamlContent });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.toString() };
    }
  },

  // 変数をYAML形式でエクスポート
  async exportVariablesToYAML(): Promise<string> {
    try {
      const yamlContent = await invoke<string>('export_variables_to_yaml');
      return yamlContent || '';
    } catch (error: any) {
      console.error('Failed to export variables:', error);
      return '';
    }
  },

  // Markdownを処理（変数展開）
  async processMarkdown(content: string, globalVariables: Record<string, string> = {}): Promise<ProcessMarkdownResponse> {
    try {
      const processedContent = await invoke<string>('process_markdown', { content, globalVariables });
      return { processedContent };
    } catch (error: any) {
      return { processedContent: content, error: error.toString() };
    }
  },

  // 変数展開済みのMarkdownコンテンツを取得
  async getExpandedMarkdown(content: string, globalVariables: Record<string, string> = {}): Promise<string> {
    try {
      const expandedContent = await invoke<string>('get_expanded_markdown', { content, globalVariables });
      return expandedContent;
    } catch (error: any) {
      console.error('Failed to get expanded markdown:', error);
      throw error;
    }
  }
};
