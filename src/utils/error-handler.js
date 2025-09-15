// src/utils/error-handler.js
// エラーハンドリングの統一化システム

/**
 * エラーレベルの定義
 */
export const ERROR_LEVELS = {
  CRITICAL: 'critical',    // アプリケーション全体に影響
  HIGH: 'high',           // 主要機能に影響
  MEDIUM: 'medium',       // 一部機能に影響
  LOW: 'low'              // 軽微な影響
};

/**
 * エラーカテゴリの定義
 */
export const ERROR_CATEGORIES = {
  NETWORK: 'network',       // ネットワーク関連
  STORAGE: 'storage',       // ストレージ関連
  RENDERING: 'rendering',   // レンダリング関連
  USER_INPUT: 'user_input', // ユーザー入力関連
  SYSTEM: 'system'         // システム関連
};

/**
 * ユーザーフレンドリーなエラーメッセージマップ
 */
const USER_FRIENDLY_MESSAGES = {
  // ネットワーク関連
  'Failed to fetch': 'インターネット接続を確認してください',
  'NetworkError': 'ネットワークエラーが発生しました',
  'TimeoutError': '接続がタイムアウトしました',
  
  // ストレージ関連
  'QuotaExceededError': 'ストレージの容量が不足しています',
  'NotFoundError': 'データが見つかりません',
  
  // レンダリング関連
  'WebGL not supported': 'お使いのブラウザはWebGLに対応していません',
  'Camera not available': 'カメラにアクセスできません',
  
  // 一般的なエラー
  'ReferenceError': 'システムエラーが発生しました',
  'TypeError': 'データの形式が正しくありません',
  'SyntaxError': 'データの解析に失敗しました'
};

/**
 * エラーハンドリングの統一化クラス
 */
export class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
  }

  /**
   * エラーを処理し、適切なメッセージを返す
   * @param {Error} error - エラーオブジェクト
   * @param {Object} context - エラーが発生したコンテキスト
   * @param {string} level - エラーレベル
   * @param {string} category - エラーカテゴリ
   * @returns {Object} 処理されたエラー情報
   */
  handleError(error, context = {}, level = ERROR_LEVELS.MEDIUM, category = ERROR_CATEGORIES.SYSTEM) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message: error.message,
      stack: error.stack,
      context,
      userMessage: this.getUserFriendlyMessage(error),
      id: this.generateErrorId()
    };

    // エラーログに追加
    this.addToLog(errorInfo);

    // コンソールにログ出力（デバッグ用）
    this.logToConsole(errorInfo);

    return errorInfo;
  }

  /**
   * ユーザーフレンドリーなメッセージを取得
   * @param {Error} error - エラーオブジェクト
   * @returns {string} ユーザー向けメッセージ
   */
  getUserFriendlyMessage(error) {
    // 特定のエラーメッセージをチェック
    for (const [key, message] of Object.entries(USER_FRIENDLY_MESSAGES)) {
      if (error.message.includes(key)) {
        return message;
      }
    }

    // エラータイプに基づくメッセージ
    switch (error.constructor.name) {
      case 'ReferenceError':
        return 'システムエラーが発生しました。ページを再読み込みしてください。';
      case 'TypeError':
        return 'データの形式が正しくありません。';
      case 'SyntaxError':
        return 'データの解析に失敗しました。';
      case 'NetworkError':
        return 'ネットワークエラーが発生しました。接続を確認してください。';
      default:
        return '予期しないエラーが発生しました。しばらく時間をおいてから再試行してください。';
    }
  }

  /**
   * エラーIDを生成
   * @returns {string} エラーID
   */
  generateErrorId() {
    return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * エラーログに追加
   * @param {Object} errorInfo - エラー情報
   */
  addToLog(errorInfo) {
    this.errorLog.push(errorInfo);
    
    // ログサイズを制限
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
  }

  /**
   * コンソールにログ出力
   * @param {Object} errorInfo - エラー情報
   */
  logToConsole(errorInfo) {
    const { level, category, message, userMessage, id } = errorInfo;
    
    const emoji = this.getErrorEmoji(level);
    const prefix = `${emoji} [${level.toUpperCase()}] [${category}]`;
    
    console.group(`${prefix} ${userMessage}`);
    console.error('エラー詳細:', message);
    console.error('エラーID:', id);
    console.error('スタックトレース:', errorInfo.stack);
    console.groupEnd();
  }

  /**
   * エラーレベルに応じた絵文字を取得
   * @param {string} level - エラーレベル
   * @returns {string} 絵文字
   */
  getErrorEmoji(level) {
    switch (level) {
      case ERROR_LEVELS.CRITICAL: return '💥';
      case ERROR_LEVELS.HIGH: return '❌';
      case ERROR_LEVELS.MEDIUM: return '⚠️';
      case ERROR_LEVELS.LOW: return 'ℹ️';
      default: return '❓';
    }
  }

  /**
   * エラーログを取得
   * @returns {Array} エラーログ
   */
  getErrorLog() {
    return [...this.errorLog];
  }

  /**
   * エラーログをクリア
   */
  clearErrorLog() {
    this.errorLog = [];
  }
}

/**
 * 非同期処理のエラーハンドリングを統一化するデコレータ
 * @param {string} context - コンテキスト名
 * @param {string} level - エラーレベル
 * @param {string} category - エラーカテゴリ
 * @returns {Function} デコレータ関数
 */
export function withErrorHandling(context, level = ERROR_LEVELS.MEDIUM, category = ERROR_CATEGORIES.SYSTEM) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        const errorHandler = new ErrorHandler();
        const errorInfo = errorHandler.handleError(error, { context, method: propertyKey }, level, category);
        
        // エラーを再スロー（呼び出し元で処理）
        throw new Error(errorInfo.userMessage);
      }
    };
    
    return descriptor;
  };
}

/**
 * グローバルエラーハンドラのインスタンス
 */
export const globalErrorHandler = new ErrorHandler();

/**
 * 非同期処理のエラーハンドリングヘルパー
 * @param {Function} asyncFunction - 非同期関数
 * @param {string} context - コンテキスト名
 * @param {string} level - エラーレベル
 * @param {string} category - エラーカテゴリ
 * @returns {Promise} エラーハンドリング付きのPromise
 */
export async function safeAsync(asyncFunction, context, level = ERROR_LEVELS.MEDIUM, category = ERROR_CATEGORIES.SYSTEM) {
  try {
    return await asyncFunction();
  } catch (error) {
    const errorInfo = globalErrorHandler.handleError(error, { context }, level, category);
    throw new Error(errorInfo.userMessage);
  }
}

/**
 * エラー境界コンポーネント（React風の概念をJavaScriptで実装）
 * @param {Function} componentFunction - コンポーネント関数
 * @param {Function} fallbackFunction - フォールバック関数
 * @returns {Function} エラー境界付きのコンポーネント関数
 */
export function withErrorBoundary(componentFunction, fallbackFunction) {
  return async function(...args) {
    try {
      return await componentFunction(...args);
    } catch (error) {
      const errorInfo = globalErrorHandler.handleError(
        error, 
        { component: componentFunction.name }, 
        ERROR_LEVELS.HIGH, 
        ERROR_CATEGORIES.SYSTEM
      );
      
      console.error('エラー境界でキャッチされたエラー:', errorInfo);
      
      if (fallbackFunction) {
        return await fallbackFunction(errorInfo, ...args);
      }
      
      throw error;
    }
  };
}
