// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  // ★★★ キャッシュ無効化設定（緊急対策） ★★★
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  },
  build: {
    // チャンクサイズの警告制限を調整（Three.jsを含むため）
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // ファイル名にタイムスタンプを強制追加
        entryFileNames: `assets/[name]-${Date.now()}.[hash].js`,
        chunkFileNames: `assets/[name]-${Date.now()}.[hash].js`,
        assetFileNames: `assets/[name]-${Date.now()}.[hash].[ext]`,
        // 手動チャンク分割の設定
        manualChunks: {
          // Three.jsを別チャンクに分離
          'three': ['three'],
          // QRCodeライブラリを別チャンクに分離
          'qrcode': ['qrcode'],
          // ベンダーライブラリを分離
          'vendor': ['uuid', 'idb-keyval']
        }
      }
    }
  },
  // ★★★ optimizeDeps の設定 ★★★
  optimizeDeps: {
    exclude: ['three'], // Three.js を事前バンドル対象から除外
    force: true // 依存関係を強制的に再ビルド
  },
  // ★★★ キャッシュ無効化 ★★★
  esbuild: {
    loader: {
      '.js': 'js'
    }
  },
  // ★★★ LocatorJS警告の抑制 ★★★
  define: {
    __LOCATOR_DEV__: false
  }
});