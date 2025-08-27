import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

export interface FileResponse {
  content: string;
  filePath?: string;
  error?: string;
}

export interface SaveResponse {
  success: boolean;
  error?: string;
}

export const desktopApi = {
  // ファイルを開く
  async openFile(): Promise<FileResponse> {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Markdown Files',
            extensions: ['md', 'txt']
          }
        ]
      });

      if (!selected || Array.isArray(selected)) {
        return { content: '', error: 'No file selected' };
      }

      const content = await readTextFile(selected);
      return { content, filePath: selected };
    } catch (error: any) {
      return { content: '', error: error.message || 'Failed to open file' };
    }
  },

  // ファイルを保存
  async saveFile(content: string, currentPath?: string): Promise<SaveResponse> {
    try {
      let filePath = currentPath;

      if (!filePath) {
        // 新しいファイルとして保存
        const selected = await save({
          filters: [
            {
              name: 'Markdown Files',
              extensions: ['md', 'txt']
            }
          ]
        });

        if (!selected) {
          return { success: false, error: 'No save location selected' };
        }

        filePath = selected;
      }

      await writeTextFile(filePath, content);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to save file' };
    }
  },

  // ファイルを別名で保存
  async saveFileAs(content: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const selected = await save({
        filters: [
          {
            name: 'Markdown Files',
            extensions: ['md', 'txt']
          }
        ]
      });

      if (!selected) {
        return { success: false, error: 'No save location selected' };
      }

      await writeTextFile(selected, content);
      return { success: true, filePath: selected };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to save file' };
    }
  },

  // ファイルパスからファイルを読み込み
  async readFileByPath(filePath: string): Promise<FileResponse> {
    try {
      const content = await readTextFile(filePath);
      return { content, filePath };
    } catch (error: any) {
      return { content: '', error: error.message || 'Failed to read file' };
    }
  },

  // ファイルパスに保存
  async saveFileToPath(filePath: string, content: string): Promise<SaveResponse> {
    try {
      await writeTextFile(filePath, content);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to save file' };
    }
  }
};
