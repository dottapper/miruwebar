// tests/setup.js
// テスト環境のセットアップ

// グローバルモックの設定
global.console = {
  ...console,
  // テスト中のコンソール出力を抑制（必要に応じて）
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
};

// ロガーのモック
vi.mock('../src/utils/logger.js', () => ({
  logger: (() => {
    const logs = [];
    const push = (level, message, data = null) => logs.push({ level, message, data });
    return {
      debug: vi.fn((message, data) => push('DEBUG', message, data)),
      info: vi.fn((message, data) => push('INFO', message, data)),
      warn: vi.fn((message, data) => push('WARN', message, data)),
      error: vi.fn((message, data) => push('ERROR', message, data)),
      success: vi.fn((message, data) => push('SUCCESS', message, data)),
      loading: vi.fn((message, data) => push('LOADING', message, data)),
      getLogs: vi.fn((level = null) => level ? logs.filter((log) => log.level === level) : [...logs]),
      clearLogs: vi.fn(() => { logs.length = 0; }),
      getErrors: vi.fn(() => logs.filter((log) => log.level === 'ERROR')),
      findLogs: vi.fn((pattern) => logs.filter((log) => log.message?.includes(pattern)))
    };
  })(),
  testLogger: (() => {
    const logs = [];
    const push = (level, message, data = null) => logs.push({ level, message, data });
    return {
      debug: vi.fn((message, data) => push('DEBUG', message, data)),
      info: vi.fn((message, data) => push('INFO', message, data)),
      warn: vi.fn((message, data) => push('WARN', message, data)),
      error: vi.fn((message, data) => push('ERROR', message, data)),
      success: vi.fn((message, data) => push('SUCCESS', message, data)),
      loading: vi.fn((message, data) => push('LOADING', message, data)),
      getLogs: vi.fn((level = null) => level ? logs.filter((log) => log.level === level) : [...logs]),
      clearLogs: vi.fn(() => { logs.length = 0; }),
      getErrors: vi.fn(() => logs.filter((log) => log.level === 'ERROR')),
      findLogs: vi.fn((pattern) => logs.filter((log) => log.message?.includes(pattern)))
    };
  })(),
  createLogger: vi.fn(() => {
    const logs = [];
    const push = (level, message, data = null) => logs.push({ level, message, data });
    return {
      debug: vi.fn((message, data) => push('DEBUG', message, data)),
      info: vi.fn((message, data) => push('INFO', message, data)),
      warn: vi.fn((message, data) => push('WARN', message, data)),
      error: vi.fn((message, data) => push('ERROR', message, data)),
      success: vi.fn((message, data) => push('SUCCESS', message, data)),
      loading: vi.fn((message, data) => push('LOADING', message, data)),
      getLogs: vi.fn((level = null) => level ? logs.filter((log) => log.level === level) : [...logs]),
      clearLogs: vi.fn(() => { logs.length = 0; }),
      getErrors: vi.fn(() => logs.filter((log) => log.level === 'ERROR')),
      findLogs: vi.fn((pattern) => logs.filter((log) => log.message?.includes(pattern)))
    };
  }),
  Logger: vi.fn(),
  LOG_LEVELS: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 },
  LOG_PREFIXES: { DEBUG: '🐛', INFO: 'ℹ️', WARN: '⚠️', ERROR: '❌', SUCCESS: '✅', LOADING: '🔄' }
}));

// IndexedDBのモック
const indexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn()
};

// localStorageのモック
const localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
};

// sessionStorageのモック
const sessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
};

// ブラウザAPIのモック
Object.defineProperty(window, 'indexedDB', {
  value: indexedDB,
  writable: true
});

Object.defineProperty(window, 'localStorage', {
  value: localStorage,
  writable: true
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorage,
  writable: true
});

// URL コンストラクタを維持しつつ createObjectURL/revokeObjectURL のみモック
const OriginalURL = globalThis.URL;
if (OriginalURL) {
  OriginalURL.createObjectURL = vi.fn(() => 'blob:mock-url');
  OriginalURL.revokeObjectURL = vi.fn();
  Object.defineProperty(window, 'URL', { value: OriginalURL, writable: true });
  if (typeof global !== 'undefined') Object.defineProperty(global, 'URL', { value: OriginalURL, writable: true });
  if (globalThis !== window) Object.defineProperty(globalThis, 'URL', { value: OriginalURL, writable: true });
}

// fetchのモック
global.fetch = vi.fn();

// FileReaderのモック
global.FileReader = class {
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
global.Blob = class {
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
global.File = class extends Blob {
  constructor(content, name, options = {}) {
    super(content, options);
    this.name = name;
    this.lastModified = Date.now();
  }
};

// テスト用のユーティリティ関数
export const createMockFile = (name, content, type = 'model/gltf-binary') => {
  return new File([content], name, { type });
};

export const createMockBlob = (content, type = 'model/gltf-binary') => {
  return new Blob([content], { type });
};

export const resetMocks = () => {
  vi.clearAllMocks();
  localStorage.getItem.mockClear();
  localStorage.setItem.mockClear();
  localStorage.removeItem.mockClear();
  localStorage.clear.mockClear();
  sessionStorage.getItem.mockClear();
  sessionStorage.setItem.mockClear();
  sessionStorage.removeItem.mockClear();
  sessionStorage.clear.mockClear();
  indexedDB.open.mockClear();
  indexedDB.deleteDatabase.mockClear();
  fetch.mockClear();
};
