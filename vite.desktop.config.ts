import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { checker } from 'vite-plugin-checker'

// https://vitejs.dev/config/
export default defineConfig({
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
    port: 1420,
    strictPort: true,
  },
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
  publicDir: 'public',
  appType: 'spa',
  // 開発サーバーでもデスクトップ版のHTMLファイルを使用
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
})
