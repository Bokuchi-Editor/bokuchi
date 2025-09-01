/**
 * 動的に利用可能なポートを取得する
 * 30000番以降のポートを優先的に使用し、競合時はフォールバックする
 */
export async function getAvailablePort(): Promise<number> {
  // 優先ポート範囲: 30000-65535
  const preferredPorts = [30000, 30001, 30002, 30003, 30004, 30005, 30006, 30007, 30008, 30009];

  // フォールバックポート範囲: 10000-29999
  const fallbackPorts = [10000, 10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009];

  // まず優先ポートを試す
  for (const port of preferredPorts) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  // 優先ポートが使えない場合はフォールバックポートを試す
  for (const port of fallbackPorts) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  // それでも見つからない場合はランダムなポートを生成
  return await findRandomAvailablePort();
}

/**
 * 指定されたポートが利用可能かどうかをチェックする
 * fetch APIを使用してポートの利用可能性をチェック
 */
async function isPortAvailable(port: number): Promise<boolean> {
  try {
    // 短いタイムアウトでポートに接続を試行
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 100);

    await fetch(`http://localhost:${port}`, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // レスポンスが返ってきた場合はポートが使用中
    return false;
  } catch (error) {
    // エラーが発生した場合はポートが利用可能
    return true;
  }
}

/**
 * ランダムな利用可能なポートを見つける
 */
async function findRandomAvailablePort(): Promise<number> {
  const maxAttempts = 100;

  for (let i = 0; i < maxAttempts; i++) {
    // 30000-65535の範囲でランダムなポートを生成
    const port = Math.floor(Math.random() * (65535 - 30000 + 1)) + 30000;

    if (await isPortAvailable(port)) {
      return port;
    }
  }

  // 最後の手段として1420を返す（開発時のフォールバック）
  console.warn('利用可能なポートが見つかりません。デフォルトポート1420を使用します。');
  return 1420;
}

/**
 * 環境に応じてポートを取得する
 * 開発時は1420、製品版は動的ポートを使用
 */
export async function getPortForEnvironment(): Promise<number> {
  // 環境変数で開発モードかどうかを判定
  const isDevelopment = import.meta.env.DEV;

  if (isDevelopment) {
    // 開発時は従来通り1420を使用
    return 1420;
  } else {
    // 製品版は動的ポートを使用
    return await getAvailablePort();
  }
}
