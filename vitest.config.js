// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    // worktreeや過去のビルド成果物を拾わない（テスト失敗の原因切り分けを単純化する）
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '.claude/**',
      'test-results/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js',
        '**/*.config.mjs',
        'server/',
        'public/',
        'dist/',
        '**/*.html'
      ]
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
