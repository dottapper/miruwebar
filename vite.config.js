// vite.config.js
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { networkInfoPlugin } from './vite/plugins/networkInfo.js';
import { projectsStaticPlugin } from './vite/plugins/projectsStatic.js';
import { projectsApiPlugin } from './vite/plugins/projectsApi.js';
import { execSync } from 'child_process';

// 開発環境かどうかを判定（Vercelのビルド環境では本番として扱う）
const isDev = process.env.NODE_ENV !== 'production' && !process.env.VERCEL;

export default defineConfig({
  // ★★★ HMR設定の改善 ★★★
  server: {
    host: true,
    port: 3000,
    strictPort: true, // 開発サーバー専用ポート（競合時はエラーを出して明確化）
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
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
    // HTTPS対応（開発環境のみ、basic-sslプラグインを使用）
    https: isDev
  },
  plugins: [
    // 開発用の簡易HTTPSを有効化（スマホのカメラ許可要件を満たす）
    // Vercelのビルド時には無効化
    ...(isDev ? [basicSsl()] : []),
    // 開発サーバー専用プラグイン（Vercelのビルド時には無効化）
    ...(isDev ? [
      networkInfoPlugin(),
      projectsStaticPlugin(),
      projectsApiPlugin()
    ] : [])
  ],
  build: {
    // チャンクサイズの警告制限を調整（Three.jsを含むため）
    chunkSizeWarningLimit: 1000,
    // ビルドの決定性を向上させる設定
    target: 'es2020',
    minify: 'esbuild', // terserの代わりにesbuildを使用
    // ソースマップの生成（開発時のみ）
    sourcemap: false,
    // アセットの最適化
    assetsInlineLimit: 4096, // 4KB以下のアセットはインライン化
    rollupOptions: {
      output: {
        // 決定性のあるファイル名生成（ハッシュのみ使用）
        entryFileNames: 'assets/[name].[hash:8].js',
        chunkFileNames: 'assets/[name].[hash:8].js',
        assetFileNames: 'assets/[name].[hash:8].[ext]',
        // 手動チャンク分割の設定（決定性を保つため固定）
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
    exclude: ['three'], // Three.js を事前バンドル対象から除外（必要時のみ再ビルド）
    // 依存関係の決定性を向上
    include: [
      'uuid',
      'idb-keyval',
      'qrcode'
    ]
  },
  // ★★★ キャッシュ設定の最適化 ★★★
  cacheDir: '.vite',
  // ★★★ esbuild設定 ★★★
  esbuild: {
    loader: {
      '.js': 'js'
    },
    // 決定性のある出力を保証
    target: 'es2020'
  },
  // ★★★ LocatorJS警告の抑制 & ビルド情報注入 ★★★
  define: {
    __LOCATOR_DEV__: false,
    __BUILD_SHA__: JSON.stringify(
      process.env.BUILD_SHA ||
      process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) ||
      (() => {
        // Vercelのビルド環境ではgitコマンドを実行しない
        if (process.env.VERCEL) {
          return 'vercel-build';
        }
        try {
          return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
        } catch (e) {
          return 'dev-build';
        }
      })()
    ),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
});
