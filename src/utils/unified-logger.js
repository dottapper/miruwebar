// src/utils/unified-logger.js
// 統一されたログシステム

/**
 * ログレベル
 */
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4
};

/**
 * ログカテゴリ
 */
export const LOG_CATEGORIES = {
  SYSTEM: 'system',
  USER: 'user',
  PERFORMANCE: 'performance',
  ERROR: 'error',
  DEBUG: 'debug',
  NETWORK: 'network',
  STORAGE: 'storage',
  RENDERING: 'rendering'
};

/**
 * ログエントリ
 */
class LogEntry {
  constructor(level, category, message, data = null, timestamp = null) {
    this.level = level;
    this.category = category;
    this.message = message;
    this.data = data;
    this.timestamp = timestamp || new Date().toISOString();
    this.id = this.generateId();
  }

  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      id: this.id,
      level: this.level,
      category: this.category,
      message: this.message,
      data: this.data,
      timestamp: this.timestamp
    };
  }
}

/**
 * 統一ロガークラス
 */
class UnifiedLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
    this.currentLevel = LOG_LEVELS.INFO;
    this.filters = new Set();
    this.listeners = new Map();
    this.isEnabled = true;
    this.performanceMarks = new Map();
  }

  /**
   * ログレベルを設定
   * @param {number} level - ログレベル
   */
  setLevel(level) {
    this.currentLevel = level;
  }

  /**
   * ログを有効/無効にする
   * @param {boolean} enabled - 有効フラグ
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * カテゴリフィルターを追加
   * @param {string} category - カテゴリ
   */
  addFilter(category) {
    this.filters.add(category);
  }

  /**
   * カテゴリフィルターを削除
   * @param {string} category - カテゴリ
   */
  removeFilter(category) {
    this.filters.delete(category);
  }

  /**
   * ログリスナーを追加
   * @param {string} event - イベント名
   * @param {Function} callback - コールバック関数
   */
  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * ログリスナーを削除
   * @param {string} event - イベント名
   * @param {Function} callback - コールバック関数
   */
  removeListener(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * イベントを発火
   * @param {string} event - イベント名
   * @param {any} data - データ
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('ログリスナーのエラー:', error);
        }
      });
    }
  }

  /**
   * ログエントリを作成
   * @param {number} level - ログレベル
   * @param {string} category - カテゴリ
   * @param {string} message - メッセージ
   * @param {any} data - データ
   * @returns {LogEntry} ログエントリ
   */
  createLogEntry(level, category, message, data = null) {
    return new LogEntry(level, category, message, data);
  }

  /**
   * ログを記録
   * @param {number} level - ログレベル
   * @param {string} category - カテゴリ
   * @param {string} message - メッセージ
   * @param {any} data - データ
   */
  log(level, category, message, data = null) {
    if (!this.isEnabled || level < this.currentLevel) {
      return;
    }

    // フィルターをチェック
    if (this.filters.has(category)) {
      return;
    }

    const logEntry = this.createLogEntry(level, category, message, data);
    
    // ログを配列に追加
    this.logs.push(logEntry);
    
    // 最大ログ数を超えた場合は古いログを削除
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // コンソールに出力
    this.outputToConsole(logEntry);

    // イベントを発火
    this.emit('log', logEntry);
  }

  /**
   * コンソールに出力
   * @param {LogEntry} logEntry - ログエントリ
   */
  outputToConsole(logEntry) {
    const { level, category, message, data, timestamp } = logEntry;
    const timeStr = new Date(timestamp).toLocaleTimeString();
    const prefix = this.getLogPrefix(level);
    const categoryStr = `[${category.toUpperCase()}]`;
    const timePrefix = `[${timeStr}]`;

    const logMessage = `${prefix} ${timePrefix} ${categoryStr} ${message}`;

    switch (level) {
      case LOG_LEVELS.DEBUG:
        console.debug(logMessage, data || '');
        break;
      case LOG_LEVELS.INFO:
        console.info(logMessage, data || '');
        break;
      case LOG_LEVELS.WARN:
        console.warn(logMessage, data || '');
        break;
      case LOG_LEVELS.ERROR:
        console.error(logMessage, data || '');
        break;
      case LOG_LEVELS.CRITICAL:
        console.error(`🚨 ${logMessage}`, data || '');
        break;
    }
  }

  /**
   * ログプレフィックスを取得
   * @param {number} level - ログレベル
   * @returns {string} プレフィックス
   */
  getLogPrefix(level) {
    const prefixes = {
      [LOG_LEVELS.DEBUG]: '🐛',
      [LOG_LEVELS.INFO]: 'ℹ️',
      [LOG_LEVELS.WARN]: '⚠️',
      [LOG_LEVELS.ERROR]: '❌',
      [LOG_LEVELS.CRITICAL]: '🚨'
    };
    return prefixes[level] || 'ℹ️';
  }

  /**
   * デバッグログ
   * @param {string} message - メッセージ
   * @param {any} data - データ
   */
  debug(message, data = null) {
    this.log(LOG_LEVELS.DEBUG, LOG_CATEGORIES.DEBUG, message, data);
  }

  /**
   * 情報ログ
   * @param {string} message - メッセージ
   * @param {any} data - データ
   */
  info(message, data = null) {
    this.log(LOG_LEVELS.INFO, LOG_CATEGORIES.SYSTEM, message, data);
  }

  /**
   * 警告ログ
   * @param {string} message - メッセージ
   * @param {any} data - データ
   */
  warn(message, data = null) {
    this.log(LOG_LEVELS.WARN, LOG_CATEGORIES.SYSTEM, message, data);
  }

  /**
   * エラーログ
   * @param {string} message - メッセージ
   * @param {any} data - データ
   */
  error(message, data = null) {
    this.log(LOG_LEVELS.ERROR, LOG_CATEGORIES.ERROR, message, data);
  }

  /**
   * クリティカルログ
   * @param {string} message - メッセージ
   * @param {any} data - データ
   */
  critical(message, data = null) {
    this.log(LOG_LEVELS.CRITICAL, LOG_CATEGORIES.ERROR, message, data);
  }

  /**
   * パフォーマンスログ
   * @param {string} message - メッセージ
   * @param {any} data - データ
   */
  performance(message, data = null) {
    this.log(LOG_LEVELS.INFO, LOG_CATEGORIES.PERFORMANCE, message, data);
  }

  /**
   * ネットワークログ
   * @param {string} message - メッセージ
   * @param {any} data - データ
   */
  network(message, data = null) {
    this.log(LOG_LEVELS.INFO, LOG_CATEGORIES.NETWORK, message, data);
  }

  /**
   * ストレージログ
   * @param {string} message - メッセージ
   * @param {any} data - データ
   */
  storage(message, data = null) {
    this.log(LOG_LEVELS.INFO, LOG_CATEGORIES.STORAGE, message, data);
  }

  /**
   * レンダリングログ
   * @param {string} message - メッセージ
   * @param {any} data - データ
   */
  rendering(message, data = null) {
    this.log(LOG_LEVELS.INFO, LOG_CATEGORIES.RENDERING, message, data);
  }

  /**
   * パフォーマンス測定を開始
   * @param {string} name - 測定名
   */
  startPerformanceMark(name) {
    const startTime = performance.now();
    this.performanceMarks.set(name, startTime);
    this.performance(`⏱️ ${name} 開始`, { name, startTime });
  }

  /**
   * パフォーマンス測定を終了
   * @param {string} name - 測定名
   * @param {any} data - 追加データ
   */
  endPerformanceMark(name, data = null) {
    const startTime = this.performanceMarks.get(name);
    if (startTime) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.performance(`⏱️ ${name} 完了`, { 
        name, 
        duration: `${duration.toFixed(2)}ms`,
        startTime,
        endTime,
        ...data
      });
      this.performanceMarks.delete(name);
    } else {
      this.warn(`パフォーマンス測定 "${name}" が見つかりません`);
    }
  }

  /**
   * ログを取得
   * @param {Object} options - オプション
   * @returns {Array} ログエントリの配列
   */
  getLogs(options = {}) {
    const {
      level = null,
      category = null,
      limit = null,
      since = null
    } = options;

    let filteredLogs = [...this.logs];

    // レベルでフィルター
    if (level !== null) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    // カテゴリでフィルター
    if (category !== null) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }

    // 時刻でフィルター
    if (since !== null) {
      const sinceTime = new Date(since).getTime();
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp).getTime() >= sinceTime
      );
    }

    // 制限を適用
    if (limit !== null) {
      filteredLogs = filteredLogs.slice(-limit);
    }

    return filteredLogs;
  }

  /**
   * エラーログを取得
   * @returns {Array} エラーログエントリの配列
   */
  getErrors() {
    return this.getLogs({ 
      level: LOG_LEVELS.ERROR 
    }).concat(this.getLogs({ 
      level: LOG_LEVELS.CRITICAL 
    }));
  }

  /**
   * ログをクリア
   */
  clearLogs() {
    this.logs = [];
    this.performanceMarks.clear();
  }

  /**
   * ログを検索
   * @param {string} query - 検索クエリ
   * @param {Object} options - オプション
   * @returns {Array} マッチしたログエントリの配列
   */
  searchLogs(query, options = {}) {
    const logs = this.getLogs(options);
    const lowerQuery = query.toLowerCase();
    
    return logs.filter(log => 
      log.message.toLowerCase().includes(lowerQuery) ||
      log.category.toLowerCase().includes(lowerQuery) ||
      (log.data && JSON.stringify(log.data).toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * ログ統計を取得
   * @returns {Object} ログ統計
   */
  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {},
      byCategory: {},
      errors: 0,
      warnings: 0
    };

    this.logs.forEach(log => {
      // レベル別統計
      const levelName = Object.keys(LOG_LEVELS).find(key => 
        LOG_LEVELS[key] === log.level
      );
      stats.byLevel[levelName] = (stats.byLevel[levelName] || 0) + 1;

      // カテゴリ別統計
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;

      // エラー・警告統計
      if (log.level >= LOG_LEVELS.ERROR) {
        stats.errors++;
      } else if (log.level === LOG_LEVELS.WARN) {
        stats.warnings++;
      }
    });

    return stats;
  }

  /**
   * ログをエクスポート
   * @param {Object} options - オプション
   * @returns {string} JSON文字列
   */
  exportLogs(options = {}) {
    const logs = this.getLogs(options);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * ログをインポート
   * @param {string} jsonString - JSON文字列
   */
  importLogs(jsonString) {
    try {
      const logs = JSON.parse(jsonString);
      if (Array.isArray(logs)) {
        this.logs = logs.map(log => new LogEntry(
          log.level,
          log.category,
          log.message,
          log.data,
          log.timestamp
        ));
      }
    } catch (error) {
      this.error('ログのインポートに失敗しました', { error: error.message });
    }
  }
}

/**
 * グローバルロガーインスタンス
 */
export const logger = new UnifiedLogger();

/**
 * 開発環境でのデバッグログを有効化
 */
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  logger.setLevel(LOG_LEVELS.DEBUG);
}

/**
 * ログレベルを環境変数から設定
 */
if (typeof process !== 'undefined' && process.env.VITE_LOG_LEVEL) {
  const envLevel = process.env.VITE_LOG_LEVEL.toUpperCase();
  if (LOG_LEVELS[envLevel] !== undefined) {
    logger.setLevel(LOG_LEVELS[envLevel]);
  }
}

export default logger;
