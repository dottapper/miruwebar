// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  // ★★★ optimizeDeps の設定を追加 ★★★
  optimizeDeps: {
    exclude: ['three'] // Three.js を事前バンドル対象から除外
  },
  // ★★★ ここまで追加 ★★★
  esbuild: {
    loader: {
      '.js': 'js'
    }
  }
});