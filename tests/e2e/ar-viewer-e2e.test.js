/**
 * ARビューアのE2Eテスト
 * 実際のブラウザ環境でのテスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { testHelpers } from '../utils/test-helpers.js';
import { globalMockSystem } from '../utils/mock-system.js';

describe('ARビューア E2Eテスト', () => {
  let container;

  beforeEach(() => {
    // モックシステムをセットアップ
    globalMockSystem.setup();
    
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
    
    // モックシステムをクリーンアップ
    globalMockSystem.cleanup();
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
      // プロジェクトデータのモック
      const mockProjectData = {
        id: 'test-project',
        name: 'Test Project',
        type: 'markerless',
        created: Date.now(),
        updated: Date.now(),
        models: [],
        loadingScreen: {
          template: 'default',
          backgroundColor: '#121212',
          textColor: '#ffffff',
          message: 'Loading...'
        },
        startScreen: {
          title: 'AR Experience',
          backgroundColor: '#ffffff',
          textColor: '#000000',
          buttonText: 'Start'
        },
        guideScreen: {
          title: 'AR Guide',
          description: 'Point your camera at the marker'
        }
      };

      // fetch APIのモック
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
      
      // 統合ローディング画面が表示されることを確認（非同期で生成されるため待機）
      await new Promise(resolve => setTimeout(resolve, 1000));
      const loadingScreen = container.querySelector('.unified-loading-screen');
      expect(loadingScreen).toBeTruthy();
      
      // プロジェクトデータが正しく取得されることを確認
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/project.json');
      
      // クリーンアップを実行
      cleanup();
    });
  });

  describe('設定管理のE2Eテスト', () => {
    it('カスタム設定が正しく適用される', async () => {
      // カスタム設定を持つプロジェクトデータ
      const customProjectData = {
        id: 'custom-project',
        name: 'Custom Project',
        type: 'markerless',
        created: Date.now(),
        updated: Date.now(),
        models: [],
        loadingScreen: {
          template: 'custom',
          backgroundColor: '#000000',
          textColor: '#ffffff',
          message: 'Custom loading message'
        },
        startScreen: {
          title: 'Custom AR Experience',
          backgroundColor: '#ffffff',
          textColor: '#000000',
          buttonText: 'Begin'
        },
        guideScreen: {
          title: 'Custom AR Guide',
          description: 'Custom guide description'
        }
      };

      // fetch APIのモック
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(customProjectData)
      });

      // URLパラメータありでテスト
      global.window.location.hash = '#/viewer?src=https://example.com/custom-project.json';
      
      // ARビューアをインポート
      const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
      
      // ARビューアを実行
      const cleanup = await showARViewer(container);
      
      // 統合ローディング画面が表示されることを確認（非同期で生成されるため待機）
      await new Promise(resolve => setTimeout(resolve, 1000));
      const loadingScreen = container.querySelector('.unified-loading-screen');
      expect(loadingScreen).toBeTruthy();
      
      // カスタム設定が適用されることを確認
      expect(loadingScreen.style.backgroundColor).toBe('rgb(0, 0, 0)');
      expect(loadingScreen.style.color).toBe('rgb(255, 255, 255)');
      
      // クリーンアップを実行
      cleanup();
    });
  });

  describe('エラーハンドリングのE2Eテスト', () => {
    it('ネットワークエラーが適切にハンドリングされる', async () => {
      // ネットワークエラーのモック
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      // URLパラメータありでテスト
      global.window.location.hash = '#/viewer?src=https://example.com/project.json';
      
      // ARビューアをインポート
      const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
      
      // ARビューアを実行
      const cleanup = await showARViewer(container);
      
      // エラー画面が表示されることを確認（非同期で生成されるため待機）
      await new Promise(resolve => setTimeout(resolve, 1000));
      const errorElement = container.querySelector('.viewer-error');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('Network error');
      
      // クリーンアップを実行
      cleanup();
    });

    it('無効なJSONレスポンスが適切にハンドリングされる', async () => {
      // 無効なJSONレスポンスのモック
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      // URLパラメータありでテスト
      global.window.location.hash = '#/viewer?src=https://example.com/invalid.json';
      
      // ARビューアをインポート
      const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
      
      // ARビューアを実行
      const cleanup = await showARViewer(container);
      
      // エラー画面が表示されることを確認（非同期で生成されるため待機）
      await new Promise(resolve => setTimeout(resolve, 1000));
      const errorElement = container.querySelector('.viewer-error');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('Invalid JSON');
      
      // クリーンアップを実行
      cleanup();
    });
  });

  describe('パフォーマンスのE2Eテスト', () => {
    it('大量のプロジェクトデータが効率的に処理される', async () => {
      // 大量のモデルデータを持つプロジェクト
      const largeProjectData = {
        id: 'large-project',
        name: 'Large Project',
        type: 'markerless',
        created: Date.now(),
        updated: Date.now(),
        models: Array.from({ length: 100 }, (_, i) => ({
          fileName: `model-${i}.glb`,
          url: `https://example.com/model-${i}.glb`,
          size: 1024 * (i + 1)
        })),
        loadingScreen: {
          template: 'default',
          backgroundColor: '#121212',
          textColor: '#ffffff',
          message: 'Loading...'
        },
        startScreen: {
          title: 'Large AR Experience',
          backgroundColor: '#ffffff',
          textColor: '#000000',
          buttonText: 'Start'
        },
        guideScreen: {
          title: 'Large AR Guide',
          description: 'Point your camera at the marker'
        }
      };

      // fetch APIのモック
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(largeProjectData)
      });

      // URLパラメータありでテスト
      global.window.location.hash = '#/viewer?src=https://example.com/large-project.json';
      
      // ARビューアをインポート
      const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
      
      // パフォーマンス測定
      const startTime = performance.now();
      
      // ARビューアを実行
      const cleanup = await showARViewer(container);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 処理時間が1秒以内であることを確認
      expect(duration).toBeLessThan(1000);
      
      // 統合ローディング画面が表示されることを確認（非同期で生成されるため待機）
      await new Promise(resolve => setTimeout(resolve, 1000));
      const loadingScreen = container.querySelector('.unified-loading-screen');
      expect(loadingScreen).toBeTruthy();
      
      // クリーンアップを実行
      cleanup();
    });
  });

  describe('クリーンアップのE2Eテスト', () => {
    it('クリーンアップ関数が正しく動作する', async () => {
      // プロジェクトデータのモック
      const mockProjectData = {
        id: 'test-project',
        name: 'Test Project',
        type: 'markerless',
        created: Date.now(),
        updated: Date.now(),
        models: [],
        loadingScreen: {
          template: 'default',
          backgroundColor: '#121212',
          textColor: '#ffffff',
          message: 'Loading...'
        },
        startScreen: {
          title: 'AR Experience',
          backgroundColor: '#ffffff',
          textColor: '#000000',
          buttonText: 'Start'
        },
        guideScreen: {
          title: 'AR Guide',
          description: 'Point your camera at the marker'
        }
      };

      // fetch APIのモック
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
      
      // クリーンアップ関数が返されることを確認
      expect(typeof cleanup).toBe('function');
      
      // クリーンアップを実行
      cleanup();
      
      // クリーンアップ後にエラーが発生しないことを確認
      expect(() => cleanup()).not.toThrow();
    });
  });
});
