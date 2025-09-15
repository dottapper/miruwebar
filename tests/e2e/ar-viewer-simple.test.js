/**
 * シンプルなARビューアE2Eテスト
 * 基本的な動作確認
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { testHelpers } from '../utils/test-helpers.js';

describe('シンプルなARビューアE2Eテスト', () => {
  let container;

  beforeEach(() => {
    // DOM環境をセットアップ
    container = testHelpers.dom.setupDOM(`
      <div id="test-container">
        <div class="integrated-ar-viewer" id="ar-container">
          <!-- ARビューアは動的にDOMを生成するため、初期状態は空 -->
        </div>
      </div>
    `);
  });

  afterEach(() => {
    // DOM環境をクリーンアップ
    testHelpers.dom.cleanupDOM();
  });

  describe('ARビューアの初期化フロー', () => {
    it('プロジェクトデータなしでエラー画面を表示する', async () => {
      // URLパラメータなしでテスト
      global.window.location.hash = '#/viewer';
      
      // ARビューアをインポート
      const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
      
      // ARビューアを実行
      const cleanup = await showARViewer(container);
      
      // エラー画面が表示されることを確認
      const errorElement = container.querySelector('.viewer-error');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('プロジェクトが見つかりません');
      
      // 戻るボタンが存在することを確認
      const backButton = container.querySelector('#viewer-back-button');
      expect(backButton).toBeTruthy();
      
      // クリーンアップを実行
      cleanup();
    });

    it('プロジェクトデータありで正常に初期化する', async () => {
      // プロジェクトデータをモック
      const mockProjectData = {
        id: 'test-project',
        name: 'テストプロジェクト',
        models: []
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectData)
      });

      // URLパラメータありでテスト
      global.window.location.hash = '#/viewer?src=https://example.com/project.json';
      
      // ARビューアをインポート
      const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
      
      // ARビューアを実行
      const cleanup = await showARViewer(container);
      
      // プロジェクトデータが正しく取得されることを確認
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/project.json');
      
      // クリーンアップを実行
      cleanup();
    });
  });

  describe('エラーハンドリングのE2Eテスト', () => {
    it('ネットワークエラーが適切にハンドリングされる', async () => {
      // ネットワークエラーをモック
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      // URLパラメータありでテスト
      global.window.location.hash = '#/viewer?src=https://example.com/project.json';
      
      // ARビューアをインポート
      const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
      
      // ARビューアを実行
      const cleanup = await showARViewer(container);
      
      // エラー画面が表示されることを確認
      await new Promise(resolve => setTimeout(resolve, 500));
      const errorElement = container.querySelector('.viewer-error');
      expect(errorElement).toBeTruthy();
      
      // クリーンアップを実行
      cleanup();
    });

    it('無効なJSONレスポンスが適切にハンドリングされる', async () => {
      // 無効なJSONレスポンスをモック
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      // URLパラメータありでテスト
      global.window.location.hash = '#/viewer?src=https://example.com/project.json';
      
      // ARビューアをインポート
      const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
      
      // ARビューアを実行
      const cleanup = await showARViewer(container);
      
      // エラー画面が表示されることを確認
      await new Promise(resolve => setTimeout(resolve, 500));
      const errorElement = container.querySelector('.viewer-error');
      expect(errorElement).toBeTruthy();
      
      // クリーンアップを実行
      cleanup();
    });
  });

  describe('クリーンアップのE2Eテスト', () => {
    it('クリーンアップ関数が正しく動作する', async () => {
      // URLパラメータなしでテスト
      global.window.location.hash = '#/viewer';
      
      // ARビューアをインポート
      const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
      
      // ARビューアを実行
      const cleanup = await showARViewer(container);
      
      // クリーンアップ関数が存在することを確認
      expect(typeof cleanup).toBe('function');
      
      // クリーンアップを実行
      cleanup();
      
      // クリーンアップ後もコンテナが存在することを確認
      expect(container).toBeTruthy();
    });
  });
});
