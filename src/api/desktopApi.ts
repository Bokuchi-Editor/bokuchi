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
  // Get pending file paths from Rust backend
  async getPendingFilePaths(): Promise<string[]> {
    try {
      const paths = await invoke<string[]>('get_pending_file_paths_command');
      return paths;
    } catch (error: unknown) {
      console.error('Error getting pending file paths:', error);
      return [];
    }
  },

  // Log message to Rust console
  async logToRust(message: string): Promise<void> {
    try {
      await invoke('log_from_frontend', { message });
    } catch (error: unknown) {
      console.error('Error logging to Rust:', error);
    }
  },

  // Notify Rust that frontend is ready
  async setFrontendReady(): Promise<void> {
    try {
      await invoke('set_frontend_ready_command');
    } catch (error: unknown) {
      console.error('Error setting frontend ready:', error);
    }
  },
  // Open file
  async openFile(): Promise<FileResponse> {
    try {
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

      if (!selected || Array.isArray(selected)) {
        return { content: '', error: 'No file selected' };
      }

      const content = await readTextFile(selected);
      return { content, filePath: selected };
    } catch (error: unknown) {
      console.error('Error opening file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to open file';
      return { content: '', error: errorMessage };
    }
  },

  // Save file (always open dialog)
  async saveFile(content: string, currentPath?: string): Promise<SaveResponse> {
    try {

      // Always open dialog
      const selected = await save({
        defaultPath: currentPath, // Set existing path as default if available
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

      if (!selected) {
        return { success: false, error: 'Save cancelled by user' };
      }

      await writeTextFile(selected, content);
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

  // Save file as
  async saveFileAs(content: string): Promise<SaveResponse> {
    try {

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

      if (!selected) {
        return { success: false, error: 'No save location selected' };
      }

      await writeTextFile(selected, content);
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

  // Read file from file path (uses Rust command to bypass FS plugin scope restrictions)
  async readFileByPath(filePath: string): Promise<FileResponse> {
    try {
      const content = await invoke<string>('read_file', { path: filePath });
      return { content, filePath };
    } catch (error: unknown) {
      console.error('Error reading file by path:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: '', error: errorMessage };
    }
  },

  // Read file from file path (for restoration)
  async readFileFromPath(filePath: string): Promise<string> {
    try {
      const content = await readTextFile(filePath);
      return content;
    } catch (error: unknown) {
      console.error('Error reading file from path:', error);
      throw error;
    }
  },

  // Save to file path
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

  // Open multiple files
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

  // Get file hash
  async getFileHash(filePath: string): Promise<FileHashInfo> {
    try {
      const hashInfo = await invoke<FileHashInfo>('get_file_hash', { path: filePath });
      return hashInfo;
    } catch (error: unknown) {
      console.error('Error getting file hash:', error);
      throw error;
    }
  },

  // Save HTML file
  async saveHtmlFile(htmlContent: string): Promise<SaveResponse> {
    try {

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

      if (!selected) {
        return { success: false, error: 'Save cancelled by user' };
      }

      await writeTextFile(selected, htmlContent);
      return { success: true, filePath: selected };
    } catch (error: unknown) {
      console.error('Error saving HTML file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save HTML file';
      return { success: false, error: errorMessage };
    }
  },

  // Export settings file
  async exportSettingsFile(settingsJson: string): Promise<SaveResponse> {
    try {

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

      if (!selected) {
        return { success: false, error: 'Export cancelled by user' };
      }

      await writeTextFile(selected, settingsJson);
      return { success: true, filePath: selected };
    } catch (error: unknown) {
      console.error('Error saving settings file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings file';
      return { success: false, error: errorMessage };
    }
  },

  // Import settings file
  async importSettingsFile(): Promise<FileResponse> {
    try {

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

      if (!selected || Array.isArray(selected)) {
        return { content: '', error: 'No file selected' };
      }

      const content = await readTextFile(selected);
      return { content, filePath: selected };
    } catch (error: unknown) {
      console.error('Error importing settings file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to import settings file';
      return { content: '', error: errorMessage };
    }
  },

  // Save YAML file (with dialog)
  async saveYamlFile(content: string, defaultFileName?: string): Promise<SaveResponse> {
    try {

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

      if (!selected) {
        return { success: false, error: 'Save cancelled by user' };
      }

      await writeTextFile(selected, content);
      return { success: true, filePath: selected };
    } catch (error: unknown) {
      console.error('Error saving YAML file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save YAML file';
      return { success: false, error: errorMessage };
    }
  },

  // Open YAML file (with dialog)
  async openYamlFile(): Promise<FileResponse> {
    try {

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

      if (!selected) {
        return { content: '', error: 'File selection cancelled by user' };
      }

      const content = await readTextFile(selected);
      return { content, filePath: selected };
    } catch (error: unknown) {
      console.error('Error opening YAML file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to open YAML file';
      return { content: '', error: errorMessage };
    }
  }
};
