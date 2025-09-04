import { desktopApi } from '../api/desktopApi';
import { Tab } from '../types/tab';

/**
 * ファイルの変更を検出する（ハッシュ値比較）
 * @param tab チェック対象のタブ
 * @returns ファイルが変更されているかどうか
 */
export async function detectFileChange(tab: Tab): Promise<boolean> {
  // 新しいファイル（isNew: true）の場合は変更検出しない
  if (tab.isNew || !tab.filePath) {
    return false;
  }

  // ファイルハッシュ情報がない場合は変更なしとして扱う
  if (!tab.fileHashInfo) {
    console.warn('No file hash info available for tab:', tab.id);
    return false;
  }

  try {
    // 現在のファイルハッシュを取得
    const currentHashInfo = await desktopApi.getFileHash(tab.filePath);

    // 段階的チェック
    // 1. ファイルサイズチェック（高速）
    if (currentHashInfo.file_size !== tab.fileHashInfo.file_size) {
      console.log('File size changed:', tab.filePath);
      return true;
    }

    // 2. 最終更新時刻チェック（高速）
    if (currentHashInfo.modified_time !== tab.fileHashInfo.modified_time) {
      console.log('File modification time changed:', tab.filePath);
      return true;
    }

    // 3. ハッシュ値チェック（必要時のみ）
    if (currentHashInfo.hash !== tab.fileHashInfo.hash) {
      console.log('File hash changed:', tab.filePath);
      return true;
    }

    // 変更なし
    return false;
  } catch (error) {
    console.error('Failed to detect file change:', error);
    // エラーの場合は変更なしとして扱う
    return false;
  }
}

/**
 * ファイルの変更を検出し、必要に応じてユーザーに確認を求める
 * @param tab チェック対象のタブ
 * @param onReload 再読み込み時のコールバック
 * @param onCancel キャンセル時のコールバック
 * @returns 再読み込みが実行されたかどうか
 */
export async function checkFileChangeAndReload(
  tab: Tab,
  onReload: (newContent: string) => void,
  onCancel: () => void
): Promise<boolean> {
  const hasChanged = await detectFileChange(tab);

  if (!hasChanged) {
    return false;
  }

  // ファイルが変更されている場合、ユーザーに確認を求める
  const shouldReload = await showFileChangeDialog(tab.title || 'Untitled');

  if (shouldReload) {
    try {
      // ファイルを再読み込み
      const newContent = await desktopApi.readFileFromPath(tab.filePath!);
      onReload(newContent);
      return true;
    } catch (error) {
      console.error('Failed to reload file:', error);
      onCancel();
      return false;
    }
  } else {
    onCancel();
    return false;
  }
}

/**
 * ファイル変更確認ダイアログを表示する
 * @param fileName ファイル名
 * @returns 再読み込みするかどうか
 */
async function showFileChangeDialog(fileName: string): Promise<boolean> {
  return new Promise((resolve) => {
    // カスタムダイアログイベントを発火
    const event = new CustomEvent('fileChangeDetected', {
      detail: {
        fileName,
        onReload: () => resolve(true),
        onCancel: () => resolve(false),
      },
    });

    window.dispatchEvent(event);
  });
}

/**
 * 複数のタブのファイル変更を一括検出する
 * @param tabs チェック対象のタブ配列
 * @returns 変更されたタブのID配列
 */
export async function detectMultipleFileChanges(tabs: Tab[]): Promise<string[]> {
  const changedTabs: string[] = [];

  const promises = tabs.map(async (tab) => {
    if (await detectFileChange(tab)) {
      changedTabs.push(tab.id);
    }
  });

  await Promise.all(promises);
  return changedTabs;
}

