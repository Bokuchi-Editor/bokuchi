import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist-desktop',
    rollupOptions: {
      input: {
        main: 'index-desktop.html'
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
