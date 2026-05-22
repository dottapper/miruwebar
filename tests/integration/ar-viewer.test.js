/**
 * ARビューア統合テスト
 */

import '../mocks/ar-viewer-url-params.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { globalMockSystem, MockDataGenerator } from '../utils/mock-system.js';
import { testHelpers } from '../utils/test-helpers.js';
import {
  createMockFetchResponse,
  resetARViewerGlobals,
  importARViewerFresh,
  importARViewerWithProject,
  setViewerProjectUrl,
  clearViewerProjectUrl
} from '../helpers/ar-viewer-test-utils.js';

globalMockSystem.setup();

describe('ARビューア統合テスト', () => {
  let container;

  beforeEach(() => {
    resetARViewerGlobals();
    clearViewerProjectUrl();
    globalMockSystem.clearAllMocks();

    container = testHelpers.dom.setupDOM(`
      <div id="test-container">
        <div class="integrated-ar-viewer" id="ar-container"></div>
      </div>
    `);
  });

  afterEach(() => {
    resetARViewerGlobals();
    testHelpers.dom.cleanupDOM();
    vi.resetModules();
  });

  describe('ARビューアの初期化', () => {
    it('プロジェクトデータなしでエラーを表示する', async () => {
      clearViewerProjectUrl();
      window.location.hash = '#/viewer';

      const { default: showARViewer } = await importARViewerFresh();
      const cleanup = showARViewer(container);

      const errorElement = container.querySelector('.viewer-error');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('プロジェクトが見つかりません');
      expect(typeof cleanup).toBe('function');

      cleanup();
    });

    it('プロジェクトデータありで bootFromQR が完了する', async () => {
      const mockProjectData = MockDataGenerator.createProjectData();
      const { default: showARViewer } = await importARViewerWithProject(mockProjectData);
      showARViewer(container);

      expect(window.__project).toBeTruthy();
      expect(container.querySelector('#webar-ui')).toBeTruthy();
    }, 15000);

    it('プロジェクトデータの取得に失敗した場合は boot が完了しない', async () => {
      window.location.hash = '#/viewer?src=https://example.com/project.json';
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      await importARViewerFresh();
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(window.__bootFromQR_completed).not.toBe(true);
    });
  });

  describe('統合UIの構造', () => {
    it('主要な画面要素が生成される', async () => {
      const mockProjectData = MockDataGenerator.createProjectData();
      const { default: showARViewer } = await importARViewerWithProject(mockProjectData);
      setViewerProjectUrl();
      showARViewer(container);

      expect(container.querySelector('#webar-ui')).toBeTruthy();
      expect(container.querySelector('#ar-start-screen')).toBeTruthy();
      expect(container.querySelector('#ar-loading-screen')).toBeTruthy();
      expect(container.querySelector('#ar-guide-screen')).toBeTruthy();
      expect(container.querySelector('#ar-host')).toBeTruthy();
    }, 15000);
  });
});
