// tests/utils/mock-system.js
// テスト用のモックシステム

import { vi } from 'vitest';

/**
 * 統合テスト用のモックシステム
 */
export class MockSystem {
  constructor() {
    this.mocks = new Map();
    this.originalFunctions = new Map();
    this.setupComplete = false;
  }

  /**
   * モックシステムをセットアップ
   */
  setup() {
    if (this.setupComplete) {
      return;
    }

    this.setupGlobalMocks();
    this.setupThreeJSMocks();
    this.setupARJSMocks();
    // Web/IndexedDB/localStorage/sessionStorage mocks
    this.setupWebStorageMocks();
    // Project storage module mocks
    this.setupProjectStorageMocks();
    // Settings validator/merger mocks used by integration tests
    this.setupSettingsMocks();
    // Unified loading screen and screen manager mocks
    this.setupUnifiedLoadingMocks();
    // Logger mocks
    this.setupLoggerMocks();
    this.setupPerformanceMocks();
    this.setupErrorHandlerMocks();

    this.setupComplete = true;
  }

  /**
   * グローバルなモックをセットアップ
   */
  setupGlobalMocks() {
    // コンソール出力のモック
    global.console = {
      ...console,
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      group: vi.fn(),
      groupEnd: vi.fn(),
      groupCollapsed: vi.fn()
    };

    // パフォーマンスAPIのモック
    global.performance = {
      now: vi.fn(() => Date.now()),
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByType: vi.fn(() => []),
      getEntriesByName: vi.fn(() => []),
      memory: {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsHeapSizeLimit: 5000000
      }
    };

    // アニメーションフレームのモック
    global.requestAnimationFrame = vi.fn((callback) => {
      return setTimeout(callback, 16);
    });

    global.cancelAnimationFrame = vi.fn((id) => {
      clearTimeout(id);
    });

    // URL APIのモック
    global.URL = {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn()
    };

    // fetch APIのモック
    global.fetch = vi.fn();

    // FileReaderのモック
    global.FileReader = class MockFileReader {
      constructor() {
        this.readAsArrayBuffer = vi.fn();
        this.readAsText = vi.fn();
        this.readAsDataURL = vi.fn();
        this.onload = null;
        this.onerror = null;
        this.result = null;
      }
    };

    // Blobのモック
    global.Blob = class MockBlob {
      constructor(content, options = {}) {
        this.content = content;
        this.options = options;
        this.size = content ? content.length : 0;
        this.type = options.type || 'application/octet-stream';
      }
      
      arrayBuffer() {
        return Promise.resolve(new ArrayBuffer(this.size));
      }
      
      text() {
        return Promise.resolve(this.content ? this.content.toString() : '');
      }
    };

    // Fileのモック
    global.File = class MockFile extends global.Blob {
      constructor(content, name, options = {}) {
        super(content, options);
        this.name = name;
        this.lastModified = Date.now();
      }
    };
  }

  /**
   * Three.jsのモックをセットアップ
   */
  setupThreeJSMocks() {
    // Three.jsの基本クラスのモック
    const mockThree = {
      Scene: vi.fn().mockImplementation(() => ({
        add: vi.fn(),
        remove: vi.fn(),
        traverse: vi.fn(),
        children: []
      })),
      
      PerspectiveCamera: vi.fn().mockImplementation(() => ({
        position: { set: vi.fn() },
        lookAt: vi.fn(),
        updateProjectionMatrix: vi.fn()
      })),
      
      WebGLRenderer: vi.fn().mockImplementation(() => ({
        setSize: vi.fn(),
        setClearColor: vi.fn(),
        render: vi.fn(),
        dispose: vi.fn(),
        domElement: {
          style: { cssText: '' }
        }
      })),
      
      AmbientLight: vi.fn().mockImplementation(() => ({
        position: { set: vi.fn() }
      })),
      
      DirectionalLight: vi.fn().mockImplementation(() => ({
        position: { set: vi.fn() }
      })),
      
      BoxGeometry: vi.fn().mockImplementation(() => ({
        dispose: vi.fn()
      })),
      
      MeshLambertMaterial: vi.fn().mockImplementation(() => ({
        dispose: vi.fn()
      })),
      
      Mesh: vi.fn().mockImplementation(() => ({
        position: { set: vi.fn(), setScalar: vi.fn() },
        scale: { setScalar: vi.fn() },
        children: []
      })),
      
      Box3: vi.fn().mockImplementation(() => ({
        setFromObject: vi.fn(),
        getSize: vi.fn(() => ({ x: 1, y: 1, z: 1 }))
      })),
      
      Vector3: vi.fn().mockImplementation(() => ({
        x: 0, y: 0, z: 0
      }))
    };

    // Three.jsのモックを設定
    this.mocks.set('three', mockThree);
    
    // 動的インポート用のモック
    vi.mock('three', () => mockThree);
    vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
      GLTFLoader: vi.fn().mockImplementation(() => ({
        load: vi.fn()
      }))
    }));
  }

  /**
   * AR.jsのモックをセットアップ
   */
  setupARJSMocks() {
    // AR.jsのモック
    const mockARJS = {
      MarkerAR: vi.fn().mockImplementation(() => ({
        onMarkerFound: null,
        onMarkerLost: null,
        loadModel: vi.fn(),
        dispose: vi.fn()
      }))
    };

    this.mocks.set('ar-js', mockARJS);
    
    // AR.jsのモックを設定
    vi.mock('../src/components/ar/marker-ar.js', () => mockARJS);
  }

  /**
   * ストレージ関連のモックをセットアップ
   */
  setupWebStorageMocks() {
    // IndexedDBのモック
    const mockIndexedDB = {
      open: vi.fn(),
      deleteDatabase: vi.fn()
    };

    // localStorageのモック
    const mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0
    };

    // sessionStorageのモック
    const mockSessionStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0
    };

    // ストレージのモックを設定
    Object.defineProperty(global, 'indexedDB', {
      value: mockIndexedDB,
      writable: true
    });

    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    Object.defineProperty(global, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true
    });

    this.mocks.set('indexedDB', mockIndexedDB);
    this.mocks.set('localStorage', mockLocalStorage);
    this.mocks.set('sessionStorage', mockSessionStorage);
  }

  /**
   * パフォーマンス関連のモックをセットアップ
   */
  setupPerformanceMocks() {
    // パフォーマンスマネージャーのモック
    const mockPerformanceManager = {
      registerThreeObject: vi.fn(),
      registerEventListener: vi.fn(),
      registerDOMElement: vi.fn(),
      registerImageData: vi.fn(),
      queueRender: vi.fn(),
      getMemoryUsage: vi.fn(() => ({
        threeObjects: 0,
        eventListeners: 0,
        domElements: 0,
        imageData: { count: 0, totalSize: 0 }
      })),
      cleanup: vi.fn(),
      fullCleanup: vi.fn()
    };

    // DOMオプティマイザーのモック
    const mockDOMOptimizer = {
      batchUpdate: vi.fn(),
      setVisibility: vi.fn(),
      updateStyles: vi.fn()
    };

    this.mocks.set('performanceManager', mockPerformanceManager);
    this.mocks.set('domOptimizer', mockDOMOptimizer);

    // パフォーマンス関連のモックを設定
    vi.mock('../src/utils/performance-manager.js', () => ({
      globalPerformanceManager: mockPerformanceManager,
      globalDOMOptimizer: mockDOMOptimizer,
      measurePerformance: vi.fn((name, fn) => fn()),
      startMemoryMonitoring: vi.fn(() => 12345)
    }));
  }

  /**
   * エラーハンドラーのモックをセットアップ
   */
  setupErrorHandlerMocks() {
    // エラーハンドラーのモック
    const mockErrorHandler = {
      handleError: vi.fn((error, context, level, category) => ({
        timestamp: new Date().toISOString(),
        level,
        category,
        message: error.message,
        stack: error.stack,
        context,
        userMessage: `Mock user message for ${error.message}`,
        id: `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }))
    };

    // エラーレベルのモック
    const mockErrorLevels = {
      CRITICAL: 'critical',
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low'
    };

    // エラーカテゴリのモック
    const mockErrorCategories = {
      NETWORK: 'network',
      STORAGE: 'storage',
      RENDERING: 'rendering',
      USER_INPUT: 'user_input',
      SYSTEM: 'system'
    };

    this.mocks.set('errorHandler', mockErrorHandler);
    this.mocks.set('errorLevels', mockErrorLevels);
    this.mocks.set('errorCategories', mockErrorCategories);

    // エラーハンドラーのモックを設定
    vi.mock('../src/utils/error-handler.js', () => ({
      globalErrorHandler: mockErrorHandler,
      safeAsync: vi.fn((fn, context, level, category) => fn()),
      withErrorBoundary: vi.fn((fn, fallback) => fn),
      ERROR_LEVELS: mockErrorLevels,
      ERROR_CATEGORIES: mockErrorCategories
    }));
  }

  /**
   * 設定関連のモックをセットアップ
   */
  setupSettingsMocks() {
    // 設定マージャーのモック
    const mockSettingsMerger = {
      mergeLoadingScreenSettings: vi.fn((project, editor, template) => ({
        backgroundColor: '#121212',
        textColor: '#ffffff',
        progressColor: '#4CAF50',
        message: 'Loading...'
      })),
      mergeStartScreenSettings: vi.fn((project, editor, template) => ({
        title: 'AR Experience',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        buttonText: 'Start'
      })),
      mergeGuideScreenSettings: vi.fn((project, editor, template) => ({
        title: 'AR Guide',
        description: 'Point your camera at the marker'
      }))
    };

    // 設定バリデーターのモック
    const mockSettingsValidator = {
      validatePosition: vi.fn((value, min, max, defaultValue) => value || defaultValue),
      validateSize: vi.fn((value, min, max, defaultValue) => value || defaultValue),
      validateColor: vi.fn((value, defaultValue) => value || defaultValue),
      validateImageData: vi.fn((value, defaultValue) => value || defaultValue),
      validateBoolean: vi.fn((value, defaultValue) => value !== undefined ? value : defaultValue),
      validateString: vi.fn((value, defaultValue, maxLength) => value || defaultValue)
    };

    this.mocks.set('settingsMerger', mockSettingsMerger);
    this.mocks.set('settingsValidator', mockSettingsValidator);

    // 設定関連のモックを設定
    vi.mock('../src/utils/settings-validator.js', () => ({
      SettingsValidator: vi.fn().mockImplementation(() => mockSettingsValidator),
      SettingsMerger: vi.fn().mockImplementation(() => mockSettingsMerger)
    }));

    // 設定マージャーの直接モックも設定
    vi.mock('../src/utils/settings-merger.js', () => ({
      SettingsMerger: vi.fn().mockImplementation(() => mockSettingsMerger)
    }));
  }

  /**
   * 統合ローディング画面のモックをセットアップ
   */
  setupUnifiedLoadingMocks() {
    // 統合ローディング画面のモック
    const mockUnifiedLoading = {
      show: vi.fn().mockImplementation((container) => {
        // DOM要素を追加するモック実装
        if (container && typeof container.appendChild === 'function') {
          const loadingElement = document.createElement('div');
          loadingElement.className = 'unified-loading-screen';
          loadingElement.innerHTML = '<div class="loading-content">Loading...</div>';
          container.appendChild(loadingElement);
        }
        return mockUnifiedLoading;
      }),
      hide: vi.fn(),
      updateProgress: vi.fn(),
      updateMessage: vi.fn()
    };

    // スクリーンマネージャーのモック
    const mockScreenManager = {
      showStartScreen: vi.fn(),
      showGuideScreen: vi.fn(),
      hideScreen: vi.fn(),
      showLoadingScreen: vi.fn()
    };

    this.mocks.set('unifiedLoading', mockUnifiedLoading);
    this.mocks.set('screenManager', mockScreenManager);

    // 統合ローディング画面のモックを設定
    vi.mock('../src/utils/unified-loading-screen.js', () => ({
      UnifiedLoadingScreen: vi.fn().mockImplementation(() => mockUnifiedLoading),
      showViewerLoadingScreen: vi.fn()
    }));

    // スクリーンマネージャーのモックを設定
    vi.mock('../src/utils/screen-manager.js', () => ({
      createScreenManager: vi.fn(() => mockScreenManager)
    }));
  }

  /**
   * プロジェクトストレージ関連のモックをセットアップ
   */
  setupProjectStorageMocks() {
    // プロジェクトストレージのモック
    const mockProjectStorage = {
      loadFromIndexedDB: vi.fn(),
      saveToIndexedDB: vi.fn(),
      deleteFromIndexedDB: vi.fn()
    };

    // プロジェクトストアのモック
    const mockProjectStore = {
      loadProject: vi.fn(),
      saveProject: vi.fn(),
      deleteProject: vi.fn(),
      listProjects: vi.fn()
    };

    this.mocks.set('projectStorage', mockProjectStorage);
    this.mocks.set('projectStore', mockProjectStore);

    // プロジェクトストレージ関連のモックを設定
    vi.mock('../src/storage/project-storage.js', () => mockProjectStorage);
    vi.mock('../src/storage/project-store.js', () => mockProjectStore);
  }

  /**
   * デバッグオーバーレイのモックをセットアップ
   */
  setupDebugOverlayMocks() {
    // デバッグオーバーレイのモック
    const mockDebugOverlay = {
      init: vi.fn(),
      toggle: vi.fn(),
      addToConsole: vi.fn()
    };

    this.mocks.set('debugOverlay', mockDebugOverlay);

    // デバッグオーバーレイのモックを設定
    vi.mock('../src/utils/debug-overlay.js', () => ({
      debugOverlay: mockDebugOverlay
    }));
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
  }

  /**
   * モックシステムをリセット
   */
  reset() {
    this.clearAllMocks();
    this.mocks.clear();
    this.setupComplete = false;
  }

  /**
   * ロガーのモックをセットアップ
   */
  setupLoggerMocks() {
    // testLoggerのモック
    const logs = [];
    const mockTestLogger = {
      logs: logs,
      info: vi.fn().mockImplementation((message, data) => {
        logs.push({ level: 'info', message, data, timestamp: Date.now() });
      }),
      warn: vi.fn().mockImplementation((message, data) => {
        logs.push({ level: 'warn', message, data, timestamp: Date.now() });
      }),
      error: vi.fn().mockImplementation((message, data) => {
        logs.push({ level: 'error', message, data, timestamp: Date.now() });
      }),
      debug: vi.fn().mockImplementation((message, data) => {
        logs.push({ level: 'debug', message, data, timestamp: Date.now() });
      }),
      success: vi.fn().mockImplementation((message, data) => {
        logs.push({ level: 'success', message, data, timestamp: Date.now() });
      }),
      getLogs: vi.fn().mockReturnValue(logs),
      clearLogs: vi.fn().mockImplementation(() => {
        logs.length = 0;
      })
    };

    this.mocks.set('testLogger', mockTestLogger);

    // logger.jsのモックを設定
    vi.mock('../src/utils/logger.js', () => ({
      createLogger: vi.fn().mockReturnValue(mockTestLogger),
      testLogger: mockTestLogger
    }));
  }

  /**
   * モックシステムをクリーンアップ
   */
  cleanup() {
    this.reset();
    vi.clearAllMocks();
  }
}

/**
 * グローバルなモックシステム
 */
export const globalMockSystem = new MockSystem();

/**
 * テスト用のモックデータ生成ヘルパー
 */
export class MockDataGenerator {
  /**
   * プロジェクトデータを生成
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
   * テンプレートデータを生成
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
   * 設定データを生成
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

  /**
   * エラーデータを生成
   * @param {string} message - エラーメッセージ
   * @param {string} type - エラータイプ
   */
  static createErrorData(message = 'Test error', type = 'Error') {
    return {
      name: type,
      message,
      stack: `Error: ${message}\n    at test (test.js:1:1)`,
      timestamp: new Date().toISOString()
    };
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
   * モック関数の呼び出し回数をテスト
   * @param {Function} mockFn - モック関数
   * @param {number} expectedCount - 期待する呼び出し回数
   */
  static expectMockCallCount(mockFn, expectedCount) {
    expect(mockFn.mock.calls.length).toBe(expectedCount);
  }

  /**
   * モック関数の引数をテスト
   * @param {Function} mockFn - モック関数
   * @param {number} callIndex - 呼び出しインデックス
   * @param {Array} expectedArgs - 期待する引数
   */
  static expectMockCallArgs(mockFn, callIndex = 0, expectedArgs = []) {
    const actualArgs = mockFn.mock.calls[callIndex];
    expect(actualArgs).toEqual(expectedArgs);
  }
}

/**
 * テスト用のユーティリティ関数
 */
export const testUtils = {
  mockSystem: globalMockSystem,
  dataGenerator: MockDataGenerator,
  assertions: TestAssertions
};
