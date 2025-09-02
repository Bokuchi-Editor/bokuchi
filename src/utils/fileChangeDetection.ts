import { desktopApi } from '../api/desktopApi';
import { Tab } from '../types/tab';

/**
 * ファイルの変更を検出する
 * @param tab チェック対象のタブ
 * @returns ファイルが変更されているかどうか
 */
export async function detectFileChange(tab: Tab): Promise<boolean> {
  // 新しいファイル（isNew: true）の場合は変更検出しない
  if (tab.isNew || !tab.filePath) {
    return false;
  }

  try {
    // ファイルシステムから現在の内容を読み込み
    const currentFileContent = await desktopApi.readFileFromPath(tab.filePath);

    // エディターの内容と比較
    return currentFileContent !== tab.content;
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
