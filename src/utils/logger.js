// src/utils/logger.js
// 統一されたログ機能

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4  // unified-logger互換
};

const LOG_PREFIXES = {
  DEBUG: '🐛',
  INFO: 'ℹ️',
  WARN: '⚠️',
  ERROR: '❌',
  SUCCESS: '✅',
  LOADING: '🔄',
  CRITICAL: '🚨'
};

/**
 * ログカテゴリ（unified-logger互換）
 */
const LOG_CATEGORIES = {
  SYSTEM: 'system',
  USER: 'user',
  PERFORMANCE: 'performance',
  ERROR: 'error',
  DEBUG: 'debug',
  NETWORK: 'network',
  STORAGE: 'storage',
  RENDERING: 'rendering'
};

// 環境変数によるログレベル制御
const getLogLevelFromEnv = () => {
  const envLevel = import.meta.env.VITE_LOG_LEVEL || 
                  (typeof window !== 'undefined' && window.VITE_LOG_LEVEL);
  
  switch (envLevel?.toUpperCase()) {
    case 'DEBUG': return LOG_LEVELS.DEBUG;
    case 'INFO': return LOG_LEVELS.INFO;
    case 'WARN': return LOG_LEVELS.WARN;
    case 'ERROR': return LOG_LEVELS.ERROR;
    default: return LOG_LEVELS.INFO;
  }
};

// デバッグモードの設定
const DEBUG_MODE = import.meta.env.DEV || 
                  (typeof window !== 'undefined' && window.location.search.includes('debug=true'));

// 本番環境でのログ制御
const isProduction = import.meta.env.PROD || 
                    (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'));

class Logger {
  constructor(options = {}) {
    this.level = options.level || getLogLevelFromEnv();
    this.enableConsole = options.enableConsole !== false && (!isProduction || this.level <= LOG_LEVELS.WARN);
    this.enableStorage = options.enableStorage || false;
    this.maxLogs = options.maxLogs || 1000;
    this.logs = [];
    this.moduleName = options.moduleName || 'App';
    
    // 本番環境ではデバッグログを無効化
    if (isProduction && this.level === LOG_LEVELS.DEBUG) {
      this.level = LOG_LEVELS.INFO;
    }
  }

  log(level, message, data = null) {
    if (LOG_LEVELS[level] < this.level) return;

    const timestamp = new Date().toISOString();
    const prefix = LOG_PREFIXES[level] || 'ℹ️';
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      prefix,
      module: this.moduleName
    };

    // コンソール出力（本番環境では制限）
    if (this.enableConsole) {
      const logMessage = `${prefix} [${this.moduleName}] ${message}`;
      
      switch (level) {
        case 'DEBUG':
          if (!isProduction) {
            console.debug(logMessage, data || '');
          }
          break;
        case 'INFO':
          console.info(logMessage, data || '');
          break;
        case 'WARN':
          console.warn(logMessage, data || '');
          break;
        case 'ERROR':
          console.error(logMessage, data || '');
          break;
        default:
          console.log(logMessage, data || '');
      }
    }

    // 内部ストレージ
    if (this.enableStorage) {
      this.logs.push(logEntry);
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
    }

    return logEntry;
  }

  debug(message, data = null) {
    return this.log('DEBUG', message, data);
  }

  info(message, data = null) {
    return this.log('INFO', message, data);
  }

  warn(message, data = null) {
    return this.log('WARN', message, data);
  }

  error(message, data = null) {
    return this.log('ERROR', message, data);
  }

  success(message, data = null) {
    return this.log('SUCCESS', message, data);
  }

  loading(message, data = null) {
    return this.log('LOADING', message, data);
  }

  critical(message, data = null) {
    return this.log('CRITICAL', message, data);
  }

  // カテゴリ付きログ（unified-logger互換）
  logWithCategory(level, category, message, data = null) {
    const categoryPrefix = `[${category.toUpperCase()}]`;
    return this.log(level, `${categoryPrefix} ${message}`, data);
  }

  performance(message, data = null) {
    return this.logWithCategory('INFO', LOG_CATEGORIES.PERFORMANCE, message, data);
  }

  network(message, data = null) {
    return this.logWithCategory('INFO', LOG_CATEGORIES.NETWORK, message, data);
  }

  storage(message, data = null) {
    return this.logWithCategory('INFO', LOG_CATEGORIES.STORAGE, message, data);
  }

  rendering(message, data = null) {
    return this.logWithCategory('INFO', LOG_CATEGORIES.RENDERING, message, data);
  }

  // テスト用メソッド
  getLogs(level = null) {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  // エラーログの取得（テスト用）
  getErrors() {
    return this.getLogs('ERROR');
  }

  // 特定のメッセージを含むログの検索（テスト用）
  findLogs(messagePattern) {
    return this.logs.filter(log => 
      log.message.includes(messagePattern)
    );
  }

  // モジュール名を設定
  setModuleName(name) {
    this.moduleName = name;
  }
}

// デフォルトロガーインスタンス
export const logger = new Logger({
  level: getLogLevelFromEnv(),
  enableConsole: true,
  enableStorage: true,
  moduleName: 'App'
});

// テスト用ロガーインスタンス
export const testLogger = new Logger({
  level: LOG_LEVELS.DEBUG,
  enableConsole: false,
  enableStorage: true,
  moduleName: 'Test'
});

// 本番環境用ロガーインスタンス
export const productionLogger = new Logger({
  level: LOG_LEVELS.WARN,
  enableConsole: true,
  enableStorage: false,
  moduleName: 'Production'
});

// モジュール別ロガーを作成するファクトリ関数
export function createLogger(moduleName, options = {}) {
  if (import.meta.env.MODE === 'test' || (typeof process !== 'undefined' && process.env?.VITEST)) {
    testLogger.setModuleName(moduleName);
    return testLogger;
  }

  return new Logger({
    level: getLogLevelFromEnv(),
    enableConsole: true,
    enableStorage: false,
    moduleName,
    ...options
  });
}

export { Logger, LOG_LEVELS, LOG_PREFIXES, LOG_CATEGORIES };
