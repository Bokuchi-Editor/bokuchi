import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

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
    } catch (error: any) {
      console.error('Error opening file:', error);
      return { content: '', error: error.message || 'Failed to open file' };
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
        console.log('No save location selected');
        return { success: false, error: 'No save location selected' };
      }

      console.log('Saving file to:', selected);
      console.log('File path type:', typeof selected);
      console.log('File path length:', selected.length);

      await writeTextFile(selected, content);
      console.log('File saved successfully');
      return { success: true, filePath: selected };
    } catch (error: any) {
      console.error('Error saving file:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      return { success: false, error: error.message || 'Failed to save file' };
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
    } catch (error: any) {
      console.error('Error saving file as:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      return { success: false, error: error.message || 'Failed to save file' };
    }
  },

  // ファイルパスからファイルを読み込み
  async readFileByPath(filePath: string): Promise<FileResponse> {
    try {
      const content = await readTextFile(filePath);
      return { content, filePath };
    } catch (error: any) {
      console.error('Error reading file by path:', error);
      return { content: '', error: error.message || 'Failed to read file' };
    }
  },

  // ファイルパスに保存
  async saveFileToPath(filePath: string, content: string): Promise<SaveResponse> {
    try {
      await writeTextFile(filePath, content);
      return { success: true, filePath };
    } catch (error: any) {
      console.error('Error saving file to path:', error);
      return { success: false, error: error.message || 'Failed to save file' };
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
        } catch (error: any) {
          console.error(`Error reading file ${filePath}:`, error);
          results.push({ content: '', filePath, error: error.message });
        }
      }

      return results;
    } catch (error: any) {
      console.error('Error opening multiple files:', error);
      return [];
    }
  }
};
