// tests/utils/test-helpers.js
// テスト用のユーティリティとヘルパー関数

import { vi } from 'vitest';

/**
 * DOM操作のテスト用ヘルパー
 */
export class DOMTestHelper {
  constructor() {
    this.container = null;
    this.originalDocument = global.document;
    this.originalWindow = global.window;
  }

  /**
   * テスト用のDOM環境をセットアップ
   * @param {string} html - 初期HTML
   */
  setupDOM(html = '') {
    // jsdom環境のセットアップ
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM(html, {
      url: 'http://localhost:3000',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    global.document = dom.window.document;
    global.window = dom.window;
    global.navigator = dom.window.navigator;

    // テスト用のコンテナを作成
    this.container = document.createElement('div');
    this.container.id = 'test-container';
    document.body.appendChild(this.container);

    return this.container;
  }

  /**
   * テスト用のDOM環境をクリーンアップ
   */
  cleanupDOM() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    global.document = this.originalDocument;
    global.window = this.originalWindow;
    this.container = null;
  }

  /**
   * テスト用の要素を作成
   * @param {string} tag - HTMLタグ
   * @param {Object} attributes - 属性
   * @param {string} content - 内容
   */
  createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'innerHTML') {
        element.innerHTML = value;
      } else {
        element.setAttribute(key, value);
      }
    });

    if (content) {
      element.textContent = content;
    }

    return element;
  }

  /**
   * テスト用のイベントを作成
   * @param {string} type - イベントタイプ
   * @param {Object} options - イベントオプション
   */
  createEvent(type, options = {}) {
    const event = new Event(type, {
      bubbles: true,
      cancelable: true,
      ...options
    });

    // カスタムプロパティを追加
    Object.entries(options).forEach(([key, value]) => {
      if (!['bubbles', 'cancelable'].includes(key)) {
        event[key] = value;
      }
    });

    return event;
  }

  /**
   * 要素にイベントリスナーを追加（テスト用）
   * @param {Element} element - 対象要素
   * @param {string} event - イベントタイプ
   * @param {Function} handler - ハンドラー関数
   * @param {Object} options - オプション
   */
  addEventListener(element, event, handler, options = {}) {
    element.addEventListener(event, handler, options);
    
    // テスト用のリスナー管理
    if (!element._testListeners) {
      element._testListeners = [];
    }
    element._testListeners.push({ event, handler, options });
  }

  /**
   * 要素のイベントリスナーをクリーンアップ
   * @param {Element} element - 対象要素
   */
  cleanupEventListeners(element) {
    if (element._testListeners) {
      element._testListeners.forEach(({ event, handler, options }) => {
        element.removeEventListener(event, handler, options);
      });
      element._testListeners = [];
    }
  }
}

/**
 * 非同期処理のテスト用ヘルパー
 */
export class AsyncTestHelper {
  /**
   * 非同期関数のテスト用ラッパー
   * @param {Function} asyncFn - 非同期関数
   * @param {number} timeout - タイムアウト時間
   */
  static async testAsync(asyncFn, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Async test timeout after ${timeout}ms`));
      }, timeout);

      asyncFn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 非同期関数のモックを作成
   * @param {any} returnValue - 戻り値
   * @param {number} delay - 遅延時間
   * @param {boolean} shouldReject - エラーを投げるかどうか
   */
  static createAsyncMock(returnValue = null, delay = 100, shouldReject = false) {
    return vi.fn().mockImplementation(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (shouldReject) {
            reject(new Error('Mock async error'));
          } else {
            resolve(returnValue);
          }
        }, delay);
      });
    });
  }

  /**
   * 非同期関数のチェーンをテスト
   * @param {Array} asyncFns - 非同期関数の配列
   * @param {number} timeout - タイムアウト時間
   */
  static async testAsyncChain(asyncFns, timeout = 5000) {
    const results = [];
    
    for (const fn of asyncFns) {
      const result = await this.testAsync(fn, timeout);
      results.push(result);
    }
    
    return results;
  }
}

/**
 * モック関数の管理ヘルパー
 */
export class MockHelper {
  constructor() {
    this.mocks = new Map();
  }

  /**
   * モック関数を作成
   * @param {string} name - モック名
   * @param {any} returnValue - 戻り値
   * @param {boolean} shouldThrow - エラーを投げるかどうか
   */
  createMock(name, returnValue = null, shouldThrow = false) {
    const mockFn = vi.fn().mockImplementation(() => {
      if (shouldThrow) {
        throw new Error(`Mock ${name} error`);
      }
      return returnValue;
    });

    this.mocks.set(name, mockFn);
    return mockFn;
  }

  /**
   * 非同期モック関数を作成
   * @param {string} name - モック名
   * @param {any} returnValue - 戻り値
   * @param {number} delay - 遅延時間
   * @param {boolean} shouldReject - エラーを投げるかどうか
   */
  createAsyncMock(name, returnValue = null, delay = 100, shouldReject = false) {
    const mockFn = vi.fn().mockImplementation(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (shouldReject) {
            reject(new Error(`Mock ${name} async error`));
          } else {
            resolve(returnValue);
          }
        }, delay);
      });
    });

    this.mocks.set(name, mockFn);
    return mockFn;
  }

  /**
   * モック関数を取得
   * @param {string} name - モック名
   */
  getMock(name) {
    return this.mocks.get(name);
  }

  /**
   * すべてのモック関数をクリア
   */
  clearAllMocks() {
    this.mocks.forEach(mock => {
      if (typeof mock.mockClear === 'function') {
        mock.mockClear();
      }
    });
    this.mocks.clear();
  }

  /**
   * モック関数の呼び出し回数を取得
   * @param {string} name - モック名
   */
  getCallCount(name) {
    const mock = this.mocks.get(name);
    return mock ? mock.mock.calls.length : 0;
  }

  /**
   * モック関数の引数を取得
   * @param {string} name - モック名
   * @param {number} callIndex - 呼び出しインデックス
   */
  getCallArgs(name, callIndex = 0) {
    const mock = this.mocks.get(name);
    return mock ? mock.mock.calls[callIndex] : null;
  }
}

/**
 * テスト用のデータ生成ヘルパー
 */
export class TestDataHelper {
  /**
   * テスト用のプロジェクトデータを生成
   * @param {Object} overrides - オーバーライドするプロパティ
   */
  static createProjectData(overrides = {}) {
    const defaultData = {
      id: 'test-project',
      name: 'Test Project',
      type: 'markerless',
      created: Date.now(),
      updated: Date.now(),
      models: [
        {
          fileName: 'test-model.glb',
          url: 'https://example.com/test-model.glb',
          size: 1024
        }
      ],
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

    return { ...defaultData, ...overrides };
  }

  /**
   * テスト用のテンプレートデータを生成
   * @param {Object} overrides - オーバーライドするプロパティ
   */
  static createTemplateData(overrides = {}) {
    const defaultData = {
      id: 'test-template',
      name: 'Test Template',
      created: Date.now(),
      updated: Date.now(),
      settings: {
        loadingScreen: {
          backgroundColor: '#121212',
          textColor: '#ffffff',
          message: 'Loading...'
        },
        startScreen: {
          title: 'AR Experience',
          backgroundColor: '#ffffff',
          textColor: '#000000'
        },
        guideScreen: {
          title: 'AR Guide',
          description: 'Point your camera at the marker'
        }
      }
    };

    return { ...defaultData, ...overrides };
  }

  /**
   * テスト用の設定データを生成
   * @param {Object} overrides - オーバーライドするプロパティ
   */
  static createSettingsData(overrides = {}) {
    const defaultData = {
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

    return { ...defaultData, ...overrides };
  }
}

/**
 * テスト用のアサーション拡張
 */
export class TestAssertions {
  /**
   * 非同期関数がエラーを投げることをテスト
   * @param {Function} asyncFn - 非同期関数
   * @param {string} expectedError - 期待するエラーメッセージ
   */
  static async expectAsyncError(asyncFn, expectedError = null) {
    try {
      await asyncFn();
      throw new Error('Expected function to throw an error');
    } catch (error) {
      if (expectedError) {
        expect(error.message).toContain(expectedError);
      }
      return error;
    }
  }

  /**
   * 非同期関数がタイムアウトすることをテスト
   * @param {Function} asyncFn - 非同期関数
   * @param {number} timeout - タイムアウト時間
   */
  static async expectAsyncTimeout(asyncFn, timeout = 1000) {
    const startTime = Date.now();
    
    try {
      await asyncFn();
      throw new Error('Expected function to timeout');
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeGreaterThanOrEqual(timeout);
      return error;
    }
  }

  /**
   * DOM要素の存在をテスト
   * @param {Element} element - DOM要素
   * @param {string} selector - セレクター
   */
  static expectElementExists(element, selector) {
    const foundElement = element.querySelector(selector);
    expect(foundElement).toBeTruthy();
    return foundElement;
  }

  /**
   * DOM要素の属性をテスト
   * @param {Element} element - DOM要素
   * @param {string} attribute - 属性名
   * @param {string} expectedValue - 期待する値
   */
  static expectElementAttribute(element, attribute, expectedValue) {
    const actualValue = element.getAttribute(attribute);
    expect(actualValue).toBe(expectedValue);
  }

  /**
   * DOM要素のクラスをテスト
   * @param {Element} element - DOM要素
   * @param {string} className - クラス名
   */
  static expectElementClass(element, className) {
    expect(element.classList.contains(className)).toBe(true);
  }
}

/**
 * テスト用のグローバルヘルパー
 */
export const testHelpers = {
  dom: new DOMTestHelper(),
  async: AsyncTestHelper,
  mock: new MockHelper(),
  data: TestDataHelper,
  assertions: TestAssertions
};

/**
 * テスト環境のセットアップ
 */
export function setupTestEnvironment() {
  // グローバルなテストヘルパーを設定
  global.testHelpers = testHelpers;
  
  // テスト用のコンソール出力を設定
  global.console = {
    ...console,
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  };

  // テスト用のパフォーマンスAPIを設定
  global.performance = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByType: vi.fn(() => []),
    getEntriesByName: vi.fn(() => [])
  };

  // テスト用のrequestAnimationFrameを設定
  global.requestAnimationFrame = vi.fn((callback) => {
    return setTimeout(callback, 16);
  });

  global.cancelAnimationFrame = vi.fn((id) => {
    clearTimeout(id);
  });
}

/**
 * テスト環境のクリーンアップ
 */
export function cleanupTestEnvironment() {
  // DOM環境をクリーンアップ
  testHelpers.dom.cleanupDOM();
  
  // モック関数をクリア
  testHelpers.mock.clearAllMocks();
  
  // グローバルなテストヘルパーをクリア
  delete global.testHelpers;
}
