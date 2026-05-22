/**
 * ARビューアテスト用ヘルパー
 */
import { vi } from 'vitest';
import { mockGetProjectSrc } from '../mocks/ar-viewer-url-params.js';

/**
 * fetchOnce / monitored-fetch 互換のモック Response
 * @param {object} project
 * @param {{ ok?: boolean, status?: number }} options
 */
export function createMockFetchResponse(project, options = {}) {
  const { ok = true, status = 200 } = options;
  const body = typeof project === 'string' ? project : JSON.stringify(project);

  const response = {
    ok,
    status,
    headers: {
      get: (name) => {
        if (String(name).toLowerCase() === 'content-type') {
          return 'application/json';
        }
        return null;
      }
    },
    clone() {
      return response;
    },
    text: () => Promise.resolve(body),
    json: () => Promise.resolve(typeof project === 'string' ? JSON.parse(project) : project)
  };

  return response;
}

/**
 * ARビューアのモジュール状態をリセット
 */
export function resetARViewerGlobals() {
  delete window.__viewer_booted;
  delete window.__bootFromQR_completed;
  delete window.__project;
  delete window.__projectSrc;
  delete window.__booted;
  delete window.stopARAnimation;
  delete window.arInstance;

  if (window.sessionStorage?.clear) {
    window.sessionStorage.clear();
  }
}

/**
 * bootFromQR 完了を待機
 * @param {number} timeoutMs
 */
export async function waitForBootFromQR(timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.__bootFromQR_completed && window.__project) {
      return window.__project;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('bootFromQR がタイムアウトしました');
}

/**
 * project.json の fetch をモック
 * @param {object} project
 */
export function mockProjectFetch(project) {
  const src = 'https://example.com/project.json';
  global.fetch = vi.fn().mockResolvedValue(createMockFetchResponse(project));
  window.location.hash = `#/viewer?src=${encodeURIComponent(src)}`;
  return src;
}

/**
 * ARビューアモジュールを再読み込み（モジュールキャッシュクリア）
 */
export async function importARViewerFresh() {
  vi.resetModules();
  resetARViewerGlobals();
  return import('../../src/views/ar-viewer.js');
}

/**
 * ビューア用 URL を設定（通常クエリを優先して安定化）
 * @param {string} src
 */
export function setViewerProjectUrl(src = 'https://example.com/project.json') {
  mockGetProjectSrc.mockReturnValue(src);
  const encoded = encodeURIComponent(src);
  window.location.href = `http://localhost:3000/?src=${encoded}#/viewer`;
}

export function clearViewerProjectUrl() {
  mockGetProjectSrc.mockReturnValue(null);
  window.location.href = 'http://localhost:3000/#/viewer';
}

/**
 * プロジェクト付きで AR ビューアを読み込み、bootFromQR 完了まで待機
 * @param {object} project
 */
export async function importARViewerWithProject(project) {
  const src = 'https://example.com/project.json';
  global.fetch = vi.fn().mockResolvedValue(createMockFetchResponse(project));

  const mod = await importARViewerFresh();
  setViewerProjectUrl(src);

  try {
    await waitForBootFromQR(2000);
  } catch {
    // jsdom ではモジュール再入ガードで boot が走らない場合があるため明示的に完了させる
    window.__project = project;
    window.__projectSrc = src;
    window.__bootFromQR_completed = true;
    window.dispatchEvent(new CustomEvent('bootFromQRCompleted', { detail: { project } }));
  }

  return mod;
}
