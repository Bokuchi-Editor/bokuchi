import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateInfo {
  available: boolean;
  version?: string;
  body?: string;
  date?: string;
}

export interface DownloadProgress {
  contentLength?: number;
  downloaded: number;
}

export const updaterApi = {
  async checkForUpdate(): Promise<{ info: UpdateInfo; update: Update | null }> {
    try {
      const update = await check();

      if (update) {
        return {
          info: {
            available: true,
            version: update.version,
            body: update.body ?? undefined,
            date: update.date ?? undefined,
          },
          update,
        };
      }

      return {
        info: { available: false },
        update: null,
      };
    } catch (error: unknown) {
      console.error('Error checking for update:', error);
      throw error;
    }
  },

  async downloadAndInstall(
    update: Update,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<void> {
    try {
      let downloaded = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            if (onProgress) {
              onProgress({
                contentLength: event.data.contentLength ?? undefined,
                downloaded: 0,
              });
            }
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (onProgress) {
              onProgress({
                downloaded,
              });
            }
            break;
          case 'Finished':
            break;
        }
      });

      await relaunch();
    } catch (error: unknown) {
      console.error('Error downloading/installing update:', error);
      throw error;
    }
  },
};
