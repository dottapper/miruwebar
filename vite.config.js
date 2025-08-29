// vite.config.js
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { networkInfoPlugin } from './vite/plugins/networkInfo.js';
import { projectsStaticPlugin } from './vite/plugins/projectsStatic.js';
import { projectsApiPlugin } from './vite/plugins/projectsApi.js';

export default defineConfig({
  // ★★★ HMR設定の改善 ★★★
  server: {
    host: true,
    port: 3000,
    strictPort: false,
    hmr: {
      overlay: true // エラーオーバーレイを有効化（ポートは自動）
    },
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  },
  plugins: [
    // 開発用の簡易HTTPSを有効化（スマホのカメラ許可要件を満たす）
    basicSsl(),
    networkInfoPlugin(),
    projectsStaticPlugin(),
    projectsApiPlugin()
  ],
  build: {
    // チャンクサイズの警告制限を調整（Three.jsを含むため）
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // ハッシュのみでキャッシュバスティング（再現性のため Date.now は使用しない）
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
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
    exclude: ['three'] // Three.js を事前バンドル対象から除外（必要時のみ再ビルド）
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
