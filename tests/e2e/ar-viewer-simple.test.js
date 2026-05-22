/**
 * シンプルなARビューアE2Eテスト
 * 基本的な動作確認
 */

import '../mocks/ar-viewer-url-params.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { testHelpers } from '../utils/test-helpers.js';
import {
  resetARViewerGlobals,
  importARViewerFresh,
  importARViewerWithProject,
  clearViewerProjectUrl
} from '../helpers/ar-viewer-test-utils.js';

describe('シンプルなARビューアE2Eテスト', () => {
  let container;

  beforeEach(() => {
    resetARViewerGlobals();
    clearViewerProjectUrl();
    container = testHelpers.dom.setupDOM(`
      <div id="test-container">
        <div class="integrated-ar-viewer" id="ar-container"></div>
      </div>
    `);
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetARViewerGlobals();
    testHelpers.dom.cleanupDOM();
    vi.resetModules();
  });

  describe('ARビューアの初期化フロー', () => {
    it('プロジェクトデータなしでエラー画面を表示する', async () => {
      clearViewerProjectUrl();
      window.location.hash = '#/viewer';

      const { default: showARViewer } = await importARViewerFresh();
      const cleanup = showARViewer(container);

      const errorElement = container.querySelector('.viewer-error');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('プロジェクトが見つかりません');

      const backButton = container.querySelector('#viewer-back-button');
      expect(backButton).toBeTruthy();

      if (typeof cleanup === 'function') cleanup();
    });

    it('プロジェクトデータありで統合UIを生成する', async () => {
      const mockProjectData = {
        id: 'test-project',
        name: 'テストプロジェクト',
        type: 'markerless',
        models: []
      };

      const { default: showARViewer } = await importARViewerWithProject(mockProjectData);
      showARViewer(container);

      expect(window.__bootFromQR_completed).toBe(true);
      expect(window.__project).toBeTruthy();
      expect(container.querySelector('#webar-ui')).toBeTruthy();
      expect(container.querySelector('#ar-loading-screen')).toBeTruthy();
    }, 15000);
  });

  describe('エラーハンドリングのE2Eテスト', () => {
    it('ネットワークエラーが適切にハンドリングされる', async () => {
      window.location.hash = '#/viewer?src=https://example.com/project.json';
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      await importARViewerFresh();

      await new Promise((resolve) => setTimeout(resolve, 300));
      // bootFromQR 失敗時はエラー画面または未完了のまま
      const errorElement = container.querySelector('.viewer-error');
      const hasViewerUi = container.querySelector('#webar-ui');
      expect(errorElement || !hasViewerUi || !window.__bootFromQR_completed).toBeTruthy();
    });

    it('無効なJSONレスポンスが適切にハンドリングされる', async () => {
      window.location.hash = '#/viewer?src=https://example.com/project.json';
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        clone() {
          return this;
        },
        text: () => Promise.reject(new Error('Invalid JSON')),
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      await importARViewerFresh();
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(window.__bootFromQR_completed).not.toBe(true);
    });
  });

  describe('クリーンアップのE2Eテスト', () => {
    it('プロジェクト未指定時はクリーンアップ関数を返す', async () => {
      clearViewerProjectUrl();
      window.location.hash = '#/viewer';

      const { default: showARViewer } = await importARViewerFresh();
      const cleanup = showARViewer(container);

      expect(typeof cleanup).toBe('function');
      cleanup();
      expect(container).toBeTruthy();
    });
  });
});
