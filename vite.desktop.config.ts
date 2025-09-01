import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { checker } from 'vite-plugin-checker'

// 動的ポート取得関数
async function getPort(): Promise<number> {
  // 環境変数からポートが指定されている場合はそれを使用
  if (process.env.PORT) {
    return parseInt(process.env.PORT, 10);
  }

  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.TAURI_DEV;

  if (isDevelopment) {
    // 開発時は従来通り1420を使用
    return 1420;
  } else {
    // 製品版は動的ポートを使用（30000番以降を優先）
    const preferredPorts = [30000, 30001, 30002, 30003, 30004, 30005, 30006, 30007, 30008, 30009];
    const fallbackPorts = [10000, 10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009];

    // ポートの利用可能性をチェックする関数
    const isPortAvailable = async (port: number): Promise<boolean> => {
      const net = await import('net');
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

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const port = await getPort();

  return {
    plugins: [
      react(),
      checker({
        typescript: true,
        eslint: {
          lintCommand: 'eslint . --ext ts,tsx --max-warnings 1',
        },
      }),
    ],
    root: '.',
    build: {
      outDir: 'dist-desktop',
      rollupOptions: {
        input: {
          main: 'index.html'
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      }
    },
    server: {
      port: port,
      strictPort: false, // ポートが使用中の場合は別のポートを試す
    },
    clearScreen: false,
    envPrefix: ['VITE_', 'TAURI_'],
    publicDir: 'public',
    appType: 'spa',
    // 開発サーバーでもデスクトップ版のHTMLファイルを使用
    optimizeDeps: {
      include: ['react', 'react-dom']
    }
  };
})
