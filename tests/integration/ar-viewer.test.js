/**
 * ARビューア統合テスト
 * 新しいモックシステムを使用した統合テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { globalMockSystem, MockDataGenerator, TestAssertions } from '../utils/mock-system.js';
import { testHelpers } from '../utils/test-helpers.js';

// モックシステムをセットアップ
globalMockSystem.setup();

describe('ARビューア統合テスト', () => {
  let container;
  let mockProjectData;

  beforeEach(() => {
    // DOM環境をセットアップ
    container = testHelpers.dom.setupDOM(`
      <div id="test-container">
        <div class="integrated-ar-viewer" id="ar-container">
          <div class="unified-loading-screen">
            <div class="unified-loading-title">Loading...</div>
            <div class="unified-loading-message">Please wait...</div>
            <div class="unified-progress-bar"></div>
          </div>
        </div>
      </div>
    `);

    // テスト用のプロジェクトデータを生成
    mockProjectData = MockDataGenerator.createProjectData();

    // モック関数をリセット
    globalMockSystem.clearAllMocks();
  });

  afterEach(() => {
    // DOM環境をクリーンアップ
    testHelpers.dom.cleanupDOM();
  });

  describe('ARビューアの初期化', () => {
    it('プロジェクトデータなしでエラーを表示する', async () => {
      // URLパラメータなしでテスト
      global.window.location.hash = '#/viewer';
      
      // ARビューアをインポート
      const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
      
      // ARビューアを実行
      const cleanup = await showARViewer(container);
      
      // エラー表示を確認
      const errorElement = container.querySelector('.viewer-error');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('プロジェクトが見つかりません');
      
      // クリーンアップ関数が返されることを確認
      expect(typeof cleanup).toBe('function');
      
      // クリーンアップを実行
      cleanup();
    });

    it('プロジェクトデータありで正常に初期化する', async () => {
      // プロジェクトデータのモック
      const mockProjectData = MockDataGenerator.createProjectData();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectData)
      });

      // URLパラメータありでテスト
      global.window.location.hash = '#/viewer?src=https://example.com/project.json';
      
      // ARビューアをインポート
      const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
      
      // ARビューアを実行
      const cleanup = await showARViewer(container);
      
      // 統合ローディング画面が表示されることを確認
      const loadingScreen = container.querySelector('.unified-loading-screen');
      expect(loadingScreen).toBeTruthy();
      
      // クリーンアップ関数が返されることを確認
      expect(typeof cleanup).toBe('function');
      
      // クリーンアップを実行
      cleanup();
    });

    it('プロジェクトデータの取得に失敗した場合のエラーハンドリング', async () => {
      // ネットワークエラーのモック
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      // URLパラメータありでテスト
      global.window.location.hash = '#/viewer?src=https://example.com/project.json';
      
      // ARビューアをインポート
      const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
      
      // ARビューアを実行
      const cleanup = await showARViewer(container);
      
      // エラー表示を確認
      const errorElement = container.querySelector('.viewer-error');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('Network error');
      
      // クリーンアップを実行
      cleanup();
    });
  });

  describe('設定管理の統合テスト', () => {
    it('プロジェクト設定が正しく適用される', async () => {
      // カスタム設定を持つプロジェクトデータ
      const customProjectData = MockDataGenerator.createProjectData({
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
        }
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(customProjectData)
      });

      // URLパラメータありでテスト
      global.window.location.hash = '#/viewer?src=https://example.com/project.json';
      
      // ARビューアをインポート
      const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
      
      // ARビューアを実行
      const cleanup = await showARViewer(container);
      
      // 設定が正しく適用されることを確認
      const loadingScreen = container.querySelector('.unified-loading-screen');
      expect(loadingScreen).toBeTruthy();
      
      // クリーンアップを実行
      cleanup();
    });

    it('設定の検証が正しく動作する', async () => {
      // 無効な設定を持つプロジェクトデータ
      const invalidProjectData = MockDataGenerator.createProjectData({
        loadingScreen: {
          template: 'custom',
          backgroundColor: 'invalid-color',
          textColor: null,
          message: ''
        }
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidProjectData)
      });

      // URLパラメータありでテスト
      global.window.location.hash = '#/viewer?src=https://example.com/project.json';
      
      // ARビューアをインポート
      const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
      
      // ARビューアを実行
      const cleanup = await showARViewer(container);
      
      // 設定の検証が動作することを確認
      const settingsMerger = globalMockSystem.getMock('settingsMerger');
      expect(settingsMerger.mergeLoadingScreenSettings).toHaveBeenCalled();
      
      // クリーンアップを実行
      cleanup();
    });
  });

  describe('エラーハンドリングの統合テスト', () => {
    it('非同期処理のエラーが適切にハンドリングされる', async () => {
      // プロジェクトデータのモック
      const mockProjectData = MockDataGenerator.createProjectData();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectData)
      });

      // エラーハンドラーのモック
      const errorHandler = globalMockSystem.getMock('errorHandler');
      errorHandler.handleError.mockReturnValue({
        timestamp: new Date().toISOString(),
        level: 'high',
        category: 'system',
        message: 'Test error',
        stack: 'Error: Test error\n    at test (test.js:1:1)',
        context: { function: 'test' },
        userMessage: 'Mock user message for Test error',
        id: 'ERR_1234567890_abcdef123'
      });

      // URLパラメータありでテスト
      global.window.location.hash = '#/viewer?src=https://example.com/project.json';
      
      // ARビューアをインポート
      const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
      
      // ARビューアを実行
      const cleanup = await showARViewer(container);
      
      // エラーハンドラーが呼び出されることを確認
      expect(errorHandler.handleError).toHaveBeenCalled();
      
      // クリーンアップを実行
      cleanup();
    });

    it('Three.jsの初期化エラーが適切にハンドリングされる', async () => {
      // プロジェクトデータのモック
      const mockProjectData = MockDataGenerator.createProjectData();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectData)
      });

      // Three.jsのモックでエラーを投げる
      const threeMock = globalMockSystem.getMock('three');
      threeMock.Scene.mockImplementation(() => {
        throw new Error('Three.js initialization error');
      });

      // URLパラメータありでテスト
      global.window.location.hash = '#/viewer?src=https://example.com/project.json';
      
      // ARビューアをインポート
      const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
      
      // ARビューアを実行
      const cleanup = await showARViewer(container);
      
      // エラーハンドラーが呼び出されることを確認
      const errorHandler = globalMockSystem.getMock('errorHandler');
      expect(errorHandler.handleError).toHaveBeenCalled();
      
      // クリーンアップを実行
      cleanup();
    });
  });

  describe('パフォーマンス管理の統合テスト', () => {
    it('Three.jsオブジェクトが正しく登録される', async () => {
      // プロジェクトデータのモック
      const mockProjectData = MockDataGenerator.createProjectData();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectData)
      });

      // パフォーマンスマネージャーのモック
      const performanceManager = globalMockSystem.getMock('performanceManager');
      performanceManager.registerThreeObject.mockImplementation(() => {});

      // URLパラメータありでテスト
      global.window.location.hash = '#/viewer?src=https://example.com/project.json';
      
      // ARビューアをインポート
      const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
      
      // ARビューアを実行
      const cleanup = await showARViewer(container);
      
      // Three.jsオブジェクトが登録されることを確認
      expect(performanceManager.registerThreeObject).toHaveBeenCalled();
      
      // クリーンアップを実行
      cleanup();
    });

    it('DOM操作がバッチ処理される', async () => {
      // プロジェクトデータのモック
      const mockProjectData = MockDataGenerator.createProjectData();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectData)
      });

      // DOMオプティマイザーのモック
      const domOptimizer = globalMockSystem.getMock('domOptimizer');
      domOptimizer.batchUpdate.mockImplementation((element, fn, key) => {
        fn(element);
      });

      // URLパラメータありでテスト
      global.window.location.hash = '#/viewer?src=https://example.com/project.json';
      
      // ARビューアをインポート
      const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
      
      // ARビューアを実行
      const cleanup = await showARViewer(container);
      
      // DOM操作がバッチ処理されることを確認
      expect(domOptimizer.batchUpdate).toHaveBeenCalled();
      
      // クリーンアップを実行
      cleanup();
    });
  });

  describe('非同期処理の統合テスト', () => {
    it('モデル読み込みが正しく動作する', async () => {
      // プロジェクトデータのモック
      const mockProjectData = MockDataGenerator.createProjectData({
        models: [
          {
            fileName: 'test-model.glb',
            url: 'https://example.com/test-model.glb',
            size: 1024
          }
        ]
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectData)
      });

      // GLTFLoaderのモック
      const gltfLoaderMock = vi.fn().mockImplementation(() => ({
        load: vi.fn((url, onLoad, onProgress, onError) => {
          setTimeout(() => {
            onLoad({
              scene: {
                children: [],
                clone: vi.fn(() => ({ children: [] }))
              }
            });
          }, 100);
        })
      }));

      // Three.jsのモックでGLTFLoaderを設定
      const threeMock = globalMockSystem.getMock('three');
      threeMock.GLTFLoader = gltfLoaderMock;

      // URLパラメータありでテスト
      global.window.location.hash = '#/viewer?src=https://example.com/project.json';
      
      // ARビューアをインポート
      const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
      
      // ARビューアを実行
      const cleanup = await showARViewer(container);
      
      // モデル読み込みが動作することを確認
      expect(gltfLoaderMock).toHaveBeenCalled();
      
      // クリーンアップを実行
      cleanup();
    });

    it('非同期処理のエラーが適切にハンドリングされる', async () => {
      // プロジェクトデータのモック
      const mockProjectData = MockDataGenerator.createProjectData();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectData)
      });

      // GLTFLoaderのモックでエラーを投げる
      const gltfLoaderMock = vi.fn().mockImplementation(() => ({
        load: vi.fn((url, onLoad, onProgress, onError) => {
          setTimeout(() => {
            onError(new Error('Model loading error'));
          }, 100);
        })
      }));

      // Three.jsのモックでGLTFLoaderを設定
      const threeMock = globalMockSystem.getMock('three');
      threeMock.GLTFLoader = gltfLoaderMock;

      // URLパラメータありでテスト
      global.window.location.hash = '#/viewer?src=https://example.com/project.json';
      
      // ARビューアをインポート
      const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
      
      // ARビューアを実行
      const cleanup = await showARViewer(container);
      
      // エラーハンドラーが呼び出されることを確認
      const errorHandler = globalMockSystem.getMock('errorHandler');
      expect(errorHandler.handleError).toHaveBeenCalled();
      
      // クリーンアップを実行
      cleanup();
    });
  });

  describe('クリーンアップの統合テスト', () => {
    it('クリーンアップ関数が正しく動作する', async () => {
      // プロジェクトデータのモック
      const mockProjectData = MockDataGenerator.createProjectData();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectData)
      });

      // パフォーマンスマネージャーのモック
      const performanceManager = globalMockSystem.getMock('performanceManager');
      performanceManager.fullCleanup.mockImplementation(() => {});

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
      
      // パフォーマンスマネージャーのクリーンアップが呼び出されることを確認
      expect(performanceManager.fullCleanup).toHaveBeenCalled();
    });
  });
});
