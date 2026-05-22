/**
 * ARビューアのE2Eテスト（jsdom）
 */

import '../mocks/ar-viewer-url-params.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { testHelpers } from '../utils/test-helpers.js';
import { globalMockSystem } from '../utils/mock-system.js';
import {
  resetARViewerGlobals,
  importARViewerFresh,
  importARViewerWithProject,
  clearViewerProjectUrl
} from '../helpers/ar-viewer-test-utils.js';

describe('ARビューア E2Eテスト', () => {
  let container;

  beforeEach(() => {
    globalMockSystem.setup();
    resetARViewerGlobals();
    clearViewerProjectUrl();

    container = testHelpers.dom.setupDOM(`
      <div id="test-container">
        <div class="integrated-ar-viewer" id="ar-container"></div>
      </div>
    `);
  });

  afterEach(() => {
    resetARViewerGlobals();
    testHelpers.dom.cleanupDOM();
    globalMockSystem.cleanup();
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

      cleanup();
    });

    it('プロジェクトデータありで統合UIを初期化する', async () => {
      const mockProjectData = {
        id: 'test-project',
        name: 'Test Project',
        type: 'markerless',
        models: [],
        loadingScreen: {
          backgroundColor: '#121212',
          textColor: '#ffffff',
          message: 'Loading...'
        },
        startScreen: {
          title: 'AR Experience',
          buttonText: 'Start'
        }
      };

      const { default: showARViewer } = await importARViewerWithProject(mockProjectData);
      showARViewer(container);

      expect(container.querySelector('#webar-ui')).toBeTruthy();
      expect(container.querySelector('#ar-loading-screen')).toBeTruthy();
      expect(container.querySelector('#ar-start-screen')).toBeTruthy();
    }, 15000);
  });

  describe('エラーハンドリングのE2Eテスト', () => {
    it('ネットワークエラー時は boot が完了しない', async () => {
      window.location.hash = '#/viewer?src=https://example.com/project.json';
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      await importARViewerFresh();
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(window.__bootFromQR_completed).not.toBe(true);
    });

    it('無効なJSONレスポンス時は boot が完了しない', async () => {
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
});
