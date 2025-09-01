import net from 'net';

/**
 * 利用可能なポートを取得する
 */
async function getAvailablePort() {
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.TAURI_DEV;

  if (isDevelopment) {
    // 開発時は従来通り1420を使用
    return 1420;
  } else {
    // 製品版は動的ポートを使用（30000番以降を優先）
    const preferredPorts = [30000, 30001, 30002, 30003, 30004, 30005, 30006, 30007, 30008, 30009];
    const fallbackPorts = [10000, 10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009];

    // ポートの利用可能性をチェックする関数
    const isPortAvailable = (port) => {
      return new Promise((resolve) => {
        const server = net.createServer();

        server.listen(port, () => {
          server.once('close', () => {
            resolve(true);
          });
          server.close();
        });

        server.on('error', () => {
          resolve(false);
        });
      });
    };

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
    const randomPort = Math.floor(Math.random() * (65535 - 30000 + 1)) + 30000;
    return randomPort;
  }
}

// ポートを取得して出力
getAvailablePort().then(port => {
  console.log(port);
}).catch(error => {
  console.error('ポート取得エラー:', error);
  process.exit(1);
});
