// server/utils/logger.js
// サーバー側用の統一ログ機能

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const LOG_PREFIXES = {
  DEBUG: '🐛',
  INFO: 'ℹ️',
  WARN: '⚠️',
  ERROR: '❌',
  SUCCESS: '✅',
  LOADING: '🔄'
};

// 環境変数によるログレベル制御
const getLogLevelFromEnv = () => {
  const envLevel = process.env.LOG_LEVEL || process.env.NODE_ENV === 'production' ? 'WARN' : 'INFO';
  
  switch (envLevel?.toUpperCase()) {
    case 'DEBUG': return LOG_LEVELS.DEBUG;
    case 'INFO': return LOG_LEVELS.INFO;
    case 'WARN': return LOG_LEVELS.WARN;
    case 'ERROR': return LOG_LEVELS.ERROR;
    default: return LOG_LEVELS.INFO;
  }
};

// 本番環境でのログ制御
const isProduction = process.env.NODE_ENV === 'production';

class Logger {
  constructor(options = {}) {
    this.level = options.level || getLogLevelFromEnv();
    this.enableConsole = options.enableConsole !== false && (!isProduction || this.level <= LOG_LEVELS.WARN);
    this.enableStorage = options.enableStorage || false;
    this.maxLogs = options.maxLogs || 1000;
    this.logs = [];
    this.moduleName = options.moduleName || 'Server';
    
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
const logger = new Logger({
  level: getLogLevelFromEnv(),
  enableConsole: true,
  enableStorage: true,
  moduleName: 'Server'
});

// 本番環境用ロガーインスタンス
const productionLogger = new Logger({
  level: LOG_LEVELS.WARN,
  enableConsole: true,
  enableStorage: false,
  moduleName: 'Production'
});

// モジュール別ロガーを作成するファクトリ関数
function createLogger(moduleName, options = {}) {
  return new Logger({
    level: getLogLevelFromEnv(),
    enableConsole: true,
    enableStorage: false,
    moduleName,
    ...options
  });
}

export { 
  Logger, 
  LOG_LEVELS, 
  LOG_PREFIXES, 
  logger, 
  productionLogger, 
  createLogger 
};
