import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';

export interface FileResponse {
  content: string;
  filePath?: string;
  error?: string;
}

export interface SaveResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface FileHashInfo {
  hash: string;
  modified_time: number;
  file_size: number;
}

export const desktopApi = {
  // ファイルを開く
  async openFile(): Promise<FileResponse> {
    try {
      console.log('Opening file dialog...');
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Markdown Files',
            extensions: ['md', 'txt']
          },
          {
            name: 'All Files',
            extensions: ['*']
          }
        ]
      });

      console.log('File dialog result:', selected);

      if (!selected || Array.isArray(selected)) {
        console.log('No file selected');
        return { content: '', error: 'No file selected' };
      }

      console.log('Reading file:', selected);
      const content = await readTextFile(selected);
      console.log('File content length:', content.length);
      return { content, filePath: selected };
    } catch (error: unknown) {
      console.error('Error opening file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to open file';
      return { content: '', error: errorMessage };
    }
  },

  // ファイルを保存（常にダイアログを開く）
  async saveFile(content: string, currentPath?: string): Promise<SaveResponse> {
    try {
      console.log('Opening save dialog...');
      console.log('Content length:', content.length);
      console.log('Current path:', currentPath);

      // 常にダイアログを開く
      const selected = await save({
        defaultPath: currentPath, // 既存のパスがある場合はデフォルトとして設定
        filters: [
          {
            name: 'Markdown Files',
            extensions: ['md']
          },
          {
            name: 'Text Files',
            extensions: ['txt']
          },
          {
            name: 'All Files',
            extensions: ['*']
          }
        ]
      });

      console.log('Save dialog result:', selected);

      if (!selected) {
        console.log('Save dialog cancelled by user');
        return { success: false, error: 'Save cancelled by user' };
      }

      console.log('Saving file to:', selected);
      console.log('File path type:', typeof selected);
      console.log('File path length:', selected.length);

      await writeTextFile(selected, content);
      console.log('File saved successfully');
      return { success: true, filePath: selected };
    } catch (error: unknown) {
      console.error('Error saving file:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to save file';
      return { success: false, error: errorMessage };
    }
  },

  // ファイルを別名で保存
  async saveFileAs(content: string): Promise<SaveResponse> {
    try {
      console.log('Opening save as dialog...');
      console.log('Content length:', content.length);

      const selected = await save({
        filters: [
          {
            name: 'Markdown Files',
            extensions: ['md']
          },
          {
            name: 'Text Files',
            extensions: ['txt']
          },
          {
            name: 'All Files',
            extensions: ['*']
          }
        ]
      });

      console.log('Save as dialog result:', selected);

      if (!selected) {
        console.log('No save location selected for save as');
        return { success: false, error: 'No save location selected' };
      }

      console.log('Saving file as to:', selected);
      console.log('File path type:', typeof selected);
      console.log('File path length:', selected.length);

      await writeTextFile(selected, content);
      console.log('File saved as successfully');
      return { success: true, filePath: selected };
    } catch (error: unknown) {
      console.error('Error saving file as:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to save file';
      return { success: false, error: errorMessage };
    }
  },

  // ファイルパスからファイルを読み込み
  async readFileByPath(filePath: string): Promise<FileResponse> {
    try {
      const content = await readTextFile(filePath);
      return { content, filePath };
    } catch (error: unknown) {
      console.error('Error reading file by path:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to read file';
      return { content: '', error: errorMessage };
    }
  },

  // ファイルパスからファイルを読み込み（復元用）
  async readFileFromPath(filePath: string): Promise<string> {
    try {
      const content = await readTextFile(filePath);
      return content;
    } catch (error: unknown) {
      console.error('Error reading file from path:', error);
      throw error;
    }
  },

  // ファイルパスに保存
  async saveFileToPath(filePath: string, content: string): Promise<SaveResponse> {
    try {
      await writeTextFile(filePath, content);
      return { success: true, filePath };
    } catch (error: unknown) {
      console.error('Error saving file to path:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save file';
      return { success: false, error: errorMessage };
    }
  },

  // 複数ファイルを開く
  async openMultipleFiles(): Promise<FileResponse[]> {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'Markdown Files',
            extensions: ['md', 'txt']
          },
          {
            name: 'All Files',
            extensions: ['*']
          }
        ]
      });

      if (!selected || !Array.isArray(selected)) {
        return [];
      }

      const results: FileResponse[] = [];
      for (const filePath of selected) {
        try {
          const content = await readTextFile(filePath);
          results.push({ content, filePath });
        } catch (error: unknown) {
          console.error(`Error reading file ${filePath}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({ content: '', filePath, error: errorMessage });
        }
      }

      return results;
    } catch (error: unknown) {
      console.error('Error opening multiple files:', error);
      return [];
    }
  },

  // ファイルハッシュを取得
  async getFileHash(filePath: string): Promise<FileHashInfo> {
    try {
      const hashInfo = await invoke<FileHashInfo>('get_file_hash', { path: filePath });
      return hashInfo;
    } catch (error: unknown) {
      console.error('Error getting file hash:', error);
      throw error;
    }
  },

  // HTMLファイルを保存
  async saveHtmlFile(htmlContent: string): Promise<SaveResponse> {
    try {
      console.log('Opening HTML save dialog...');
      console.log('HTML content length:', htmlContent.length);

      const selected = await save({
        defaultPath: 'markdown-export.html',
        filters: [
          {
            name: 'HTML Files',
            extensions: ['html', 'htm']
          },
          {
            name: 'All Files',
            extensions: ['*']
          }
        ]
      });

      console.log('HTML save dialog result:', selected);

      if (!selected) {
        console.log('HTML save dialog cancelled by user');
        return { success: false, error: 'Save cancelled by user' };
      }

      console.log('Saving HTML file to:', selected);
      await writeTextFile(selected, htmlContent);
      console.log('HTML file saved successfully');
      return { success: true, filePath: selected };
    } catch (error: unknown) {
      console.error('Error saving HTML file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save HTML file';
      return { success: false, error: errorMessage };
    }
  },

  // 設定ファイルをエクスポート
  async exportSettingsFile(settingsJson: string): Promise<SaveResponse> {
    try {
      console.log('Opening settings export dialog...');

      const selected = await save({
        defaultPath: 'bokuchi-settings.json',
        filters: [
          {
            name: 'JSON Files',
            extensions: ['json']
          },
          {
            name: 'All Files',
            extensions: ['*']
          }
        ]
      });

      console.log('Settings export dialog result:', selected);

      if (!selected) {
        console.log('Settings export dialog cancelled by user');
        return { success: false, error: 'Export cancelled by user' };
      }

      console.log('Saving settings file to:', selected);
      await writeTextFile(selected, settingsJson);
      console.log('Settings file saved successfully');
      return { success: true, filePath: selected };
    } catch (error: unknown) {
      console.error('Error saving settings file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings file';
      return { success: false, error: errorMessage };
    }
  },

  // 設定ファイルをインポート
  async importSettingsFile(): Promise<FileResponse> {
    try {
      console.log('Opening settings import dialog...');

      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'JSON Files',
            extensions: ['json']
          },
          {
            name: 'All Files',
            extensions: ['*']
          }
        ]
      });

      console.log('Settings import dialog result:', selected);

      if (!selected || Array.isArray(selected)) {
        console.log('No settings file selected');
        return { content: '', error: 'No file selected' };
      }

      console.log('Reading settings file:', selected);
      const content = await readTextFile(selected);
      console.log('Settings file content length:', content.length);
      return { content, filePath: selected };
    } catch (error: unknown) {
      console.error('Error importing settings file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to import settings file';
      return { content: '', error: errorMessage };
    }
  },

  // YAMLファイルを保存（ダイアログ付き）
  async saveYamlFile(content: string, defaultFileName?: string): Promise<SaveResponse> {
    try {
      console.log('Opening YAML save dialog...');
      console.log('Content length:', content.length);
      console.log('Default filename:', defaultFileName);

      const selected = await save({
        defaultPath: defaultFileName || 'variables.yaml',
        filters: [
          {
            name: 'YAML Files',
            extensions: ['yaml', 'yml']
          },
          {
            name: 'All Files',
            extensions: ['*']
          }
        ]
      });

      console.log('YAML save dialog result:', selected);

      if (!selected) {
        console.log('YAML save dialog cancelled by user');
        return { success: false, error: 'Save cancelled by user' };
      }

      console.log('Saving YAML file to:', selected);
      await writeTextFile(selected, content);
      console.log('YAML file saved successfully');
      return { success: true, filePath: selected };
    } catch (error: unknown) {
      console.error('Error saving YAML file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save YAML file';
      return { success: false, error: errorMessage };
    }
  },

  // YAMLファイルを開く（ダイアログ付き）
  async openYamlFile(): Promise<FileResponse> {
    try {
      console.log('Opening YAML file dialog...');

      const selected = await open({
        filters: [
          {
            name: 'YAML Files',
            extensions: ['yaml', 'yml']
          },
          {
            name: 'All Files',
            extensions: ['*']
          }
        ]
      });

      console.log('YAML file dialog result:', selected);

      if (!selected) {
        console.log('YAML file dialog cancelled by user');
        return { content: '', error: 'File selection cancelled by user' };
      }

      console.log('Reading YAML file:', selected);
      const content = await readTextFile(selected);
      console.log('YAML file content length:', content.length);
      return { content, filePath: selected };
    } catch (error: unknown) {
      console.error('Error opening YAML file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to open YAML file';
      return { content: '', error: errorMessage };
    }
  }
};
