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
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    getLogs: vi.fn(() => []),
    clearLogs: vi.fn(),
    getErrors: vi.fn(() => []),
    findLogs: vi.fn(() => [])
  },
  testLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    getLogs: vi.fn(() => []),
    clearLogs: vi.fn(),
    getErrors: vi.fn(() => []),
    findLogs: vi.fn(() => [])
  },
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    getLogs: vi.fn(() => []),
    clearLogs: vi.fn(),
    getErrors: vi.fn(() => []),
    findLogs: vi.fn(() => [])
  })),
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

// URL.createObjectURLのモック
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn()
  },
  writable: true
});

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
