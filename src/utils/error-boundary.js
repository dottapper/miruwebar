/**
 * エラーバウンダリとエラー復旧機能
 * データ読み込み時のエラー耐性を向上させるグローバルエラーハンドラー
 */

import { createLogger } from './logger.js';

const logger = createLogger('ErrorBoundary');

/**
 * エラーバウンダリクラス
 * アプリケーション全体のエラーハンドリングとデータ復旧を管理
 */
class ErrorBoundary {
  constructor() {
    this.errorHistory = [];
    this.recoveryAttempts = new Map();
    this.maxRecoveryAttempts = 3;
    this.isInitialized = false;
  }

  /**
   * エラーバウンダリを初期化
   */
  initialize() {
    if (this.isInitialized) return;

    // グローバルエラーハンドラーを設定
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message
      });
    });

    // Promise拒否ハンドラーを設定
    window.addEventListener('unhandledrejection', (event) => {
      this.handlePromiseRejection(event.reason, {
        promise: event.promise,
        type: 'unhandledrejection'
      });
    });

    // LocalStorage操作のエラーハンドリング
    this.wrapLocalStorageOperations();

    this.isInitialized = true;
    logger.info('エラーバウンダリが初期化されました');
  }

  /**
   * グローバルエラーハンドリング
   * @param {Error} error - エラーオブジェクト
   * @param {Object} context - エラーコンテキスト
   */
  handleGlobalError(error, context = {}) {
    const errorInfo = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      timestamp: Date.now(),
      context,
      type: 'global_error'
    };

    this.logError(errorInfo);

    // データ関連エラーの場合は復旧を試行
    if (this.isDataError(error)) {
      this.attemptDataRecovery(error, context);
    }

    // クリティカルエラーの場合はユーザーに通知
    if (this.isCriticalError(error)) {
      this.notifyUser(error, 'クリティカルエラーが発生しました');
    }
  }

  /**
   * Promise拒否ハンドリング
   * @param {any} reason - 拒否理由
   * @param {Object} context - コンテキスト
   */
  handlePromiseRejection(reason, context = {}) {
    const errorInfo = {
      message: reason?.message || String(reason),
      stack: reason?.stack,
      timestamp: Date.now(),
      context,
      type: 'promise_rejection'
    };

    this.logError(errorInfo);

    // JSON解析エラーやLocalStorageエラーの場合
    if (this.isStorageError(reason)) {
      this.attemptStorageRecovery(reason);
    }
  }

  /**
   * 安全なLocalStorage操作ラッパー
   * @param {string} key - キー
   * @param {Function} operation - 操作関数
   * @param {any} fallback - フォールバック値
   * @returns {any} 結果またはフォールバック値
   */
  safeStorageOperation(key, operation, fallback = null) {
    try {
      return operation();
    } catch (error) {
      logger.warn(`LocalStorage操作エラー (${key}):`, error);

      const errorInfo = {
        message: error.message,
        key,
        operation: operation.name,
        timestamp: Date.now(),
        type: 'storage_error'
      };
      
      this.logError(errorInfo);

      // ストレージ容量エラーの場合はクリーンアップを試行
      if (error.name === 'QuotaExceededError') {
        this.attemptStorageCleanup();
      }

      return fallback;
    }
  }

  /**
   * 安全なJSON解析
   * @param {string} jsonString - JSON文字列
   * @param {any} fallback - フォールバック値
   * @returns {any} パース結果またはフォールバック値
   */
  safeJsonParse(jsonString, fallback = null) {
    if (!jsonString) return fallback;

    try {
      return JSON.parse(jsonString);
    } catch (error) {
      logger.warn('JSON解析エラー:', error);

      const errorInfo = {
        message: error.message,
        jsonString: jsonString.substring(0, 100) + '...',
        timestamp: Date.now(),
        type: 'json_parse_error'
      };

      this.logError(errorInfo);

      // JSON修復を試行
      const repaired = this.attemptJsonRepair(jsonString);
      if (repaired !== null) {
        logger.info('JSON修復成功');
        return repaired;
      }

      return fallback;
    }
  }

  /**
   * データエラーかどうかの判定
   * @param {Error} error - エラー
   * @returns {boolean} データエラーの場合true
   */
  isDataError(error) {
    const dataErrorPatterns = [
      /JSON\.parse/i,
      /localStorage/i,
      /sessionStorage/i,
      /indexeddb/i,
      /template.*not.*found/i,
      /project.*not.*found/i
    ];

    const errorMessage = error?.message || '';
    return dataErrorPatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * ストレージエラーかどうかの判定
   * @param {any} reason - エラー理由
   * @returns {boolean} ストレージエラーの場合true
   */
  isStorageError(reason) {
    const reasonStr = String(reason?.message || reason);
    return /storage|json|parse|quota/i.test(reasonStr);
  }

  /**
   * クリティカルエラーかどうかの判定
   * @param {Error} error - エラー
   * @returns {boolean} クリティカルエラーの場合true
   */
  isCriticalError(error) {
    const criticalPatterns = [
      /reference.*error/i,
      /type.*error/i,
      /cannot.*read.*property/i,
      /cannot.*access.*before.*initialization/i
    ];

    const errorMessage = error?.message || '';
    return criticalPatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * データ復旧を試行
   * @param {Error} error - エラー
   * @param {Object} context - コンテキスト
   */
  async attemptDataRecovery(error, context) {
    const recoveryKey = `${error.message}_${context.filename}`;
    const attempts = this.recoveryAttempts.get(recoveryKey) || 0;

    if (attempts >= this.maxRecoveryAttempts) {
      logger.warn('最大復旧試行回数に達しました:', recoveryKey);
      return false;
    }

    this.recoveryAttempts.set(recoveryKey, attempts + 1);

    try {
      logger.info(`データ復旧試行 ${attempts + 1}/${this.maxRecoveryAttempts}:`, recoveryKey);

      // テンプレートデータの復旧
      if (error.message.includes('template')) {
        await this.recoverTemplateData();
      }

      // プロジェクトデータの復旧
      if (error.message.includes('project')) {
        await this.recoverProjectData();
      }

      // 一般的なLocalStorageの復旧
      if (error.message.includes('localStorage')) {
        this.recoverLocalStorageData();
      }

      return true;
    } catch (recoveryError) {
      logger.error('データ復旧エラー:', recoveryError);
      return false;
    }
  }

  /**
   * ストレージ復旧を試行
   * @param {any} reason - エラー理由
   */
  attemptStorageRecovery(reason) {
    try {
      // ストレージクリーンアップ
      this.attemptStorageCleanup();

      // 破損データの修復
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('miruwebAR_')) {
          const value = localStorage.getItem(key);
          if (value && this.isCorruptedJson(value)) {
            logger.warn(`破損データ検出: ${key}`);
            const repaired = this.attemptJsonRepair(value);
            if (repaired !== null) {
              localStorage.setItem(key, JSON.stringify(repaired));
              logger.info(`データ修復完了: ${key}`);
            } else {
              // 修復不可能な場合は削除
              localStorage.removeItem(key);
              logger.warn(`修復不可能なデータを削除: ${key}`);
            }
          }
        }
      });
    } catch (error) {
      logger.error('ストレージ復旧エラー:', error);
    }
  }

  /**
   * テンプレートデータの復旧
   */
  async recoverTemplateData() {
    try {
      const { getAllTemplates } = await import('../components/loading-screen/template-manager.js');
      const templates = await getAllTemplates();
      
      if (templates.length === 0) {
        logger.warn('テンプレートデータが空です、デフォルトテンプレートを作成します');
        // データマイグレーションヘルパーのデフォルト作成機能を使用
        const { default: dataMigrationHelper } = await import('./data-migration-helper.js');
        const defaultTemplate = dataMigrationHelper.createDefaultTemplate();
        localStorage.setItem('miruwebAR_loading_templates', JSON.stringify([defaultTemplate]));
      }
      
      logger.info('テンプレートデータ復旧完了');
    } catch (error) {
      logger.error('テンプレートデータ復旧エラー:', error);
    }
  }

  /**
   * プロジェクトデータの復旧
   */
  async recoverProjectData() {
    try {
      const { getProjects } = await import('../api/projects.js');
      const projects = getProjects();
      
      // プロジェクトデータの基本構造チェック
      const repairedProjects = projects.map(project => {
        if (!project.id) project.id = `recovered_${Date.now()}`;
        if (!project.name) project.name = 'Recovered Project';
        if (!project.loadingScreen) {
          project.loadingScreen = {
            enabled: true,
            template: 'default'
          };
        }
        return project;
      });

      localStorage.setItem('miruwebAR_projects', JSON.stringify(repairedProjects));
      logger.info('プロジェクトデータ復旧完了');
    } catch (error) {
      logger.error('プロジェクトデータ復旧エラー:', error);
    }
  }

  /**
   * LocalStorageデータの復旧
   */
  recoverLocalStorageData() {
    try {
      const keys = Object.keys(localStorage);
      let repairedCount = 0;

      keys.forEach(key => {
        if (key.startsWith('miruwebAR_')) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              JSON.parse(value); // 解析テスト
            }
          } catch (parseError) {
            // 破損データの修復または削除
            const repaired = this.attemptJsonRepair(value);
            if (repaired !== null) {
              localStorage.setItem(key, JSON.stringify(repaired));
              repairedCount++;
            } else {
              localStorage.removeItem(key);
              logger.warn(`修復不可能なデータを削除: ${key}`);
            }
          }
        }
      });

      if (repairedCount > 0) {
        logger.info(`${repairedCount}個のデータを修復しました`);
      }
    } catch (error) {
      logger.error('LocalStorageデータ復旧エラー:', error);
    }
  }

  /**
   * JSON修復を試行
   * @param {string} jsonString - 破損したJSON文字列
   * @returns {any|null} 修復されたオブジェクトまたはnull
   */
  attemptJsonRepair(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') return null;

    try {
      // 一般的なJSON構文エラーの修復
      let repaired = jsonString;

      // 末尾カンマの除去
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

      // 未閉じ括弧の修復
      const openBraces = (repaired.match(/{/g) || []).length;
      const closeBraces = (repaired.match(/}/g) || []).length;
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/]/g) || []).length;

      // 不足している閉じ括弧を追加
      if (openBraces > closeBraces) {
        repaired += '}' .repeat(openBraces - closeBraces);
      }
      if (openBrackets > closeBrackets) {
        repaired += ']'.repeat(openBrackets - closeBrackets);
      }

      // 修復テスト
      return JSON.parse(repaired);
    } catch (repairError) {
      logger.debug('JSON修復失敗:', repairError);
      return null;
    }
  }

  /**
   * 破損JSONかどうかの判定
   * @param {string} jsonString - JSON文字列
   * @returns {boolean} 破損している場合true
   */
  isCorruptedJson(jsonString) {
    try {
      JSON.parse(jsonString);
      return false;
    } catch (error) {
      return true;
    }
  }

  /**
   * ストレージクリーンアップ
   */
  attemptStorageCleanup() {
    try {
      const keys = Object.keys(localStorage);
      let cleanedCount = 0;

      keys.forEach(key => {
        // 一時データやキャッシュの削除
        if (key.includes('temp_') || key.includes('cache_') || key.includes('_backup')) {
          localStorage.removeItem(key);
          cleanedCount++;
        }
      });

      if (cleanedCount > 0) {
        logger.info(`ストレージクリーンアップ: ${cleanedCount}個のアイテムを削除`);
      }
    } catch (error) {
      logger.error('ストレージクリーンアップエラー:', error);
    }
  }

  /**
   * LocalStorage操作をラップ
   */
  wrapLocalStorageOperations() {
    const originalSetItem = localStorage.setItem.bind(localStorage);
    const originalGetItem = localStorage.getItem.bind(localStorage);

    localStorage.setItem = (key, value) => {
      return this.safeStorageOperation(key, () => originalSetItem(key, value));
    };

    localStorage.getItem = (key) => {
      return this.safeStorageOperation(key, () => originalGetItem(key));
    };
  }

  /**
   * ユーザーへの通知
   * @param {Error} error - エラー
   * @param {string} message - メッセージ
   */
  notifyUser(error, message) {
    // 簡易的な通知（実際のUIに応じて調整）
    if (typeof window !== 'undefined' && window.console) {
      console.error(`🚨 ${message}:`, error);
    }

    // 今後の拡張: トーストやモーダルでの通知
    try {
      if (document.getElementById('error-notification')) {
        const notification = document.getElementById('error-notification');
        notification.textContent = message;
        notification.style.display = 'block';
        setTimeout(() => {
          notification.style.display = 'none';
        }, 5000);
      }
    } catch (notificationError) {
      logger.debug('通知エラー:', notificationError);
    }
  }

  /**
   * エラーログ記録
   * @param {Object} errorInfo - エラー情報
   */
  logError(errorInfo) {
    this.errorHistory.push(errorInfo);

    // 履歴サイズ制限
    if (this.errorHistory.length > 100) {
      this.errorHistory.shift();
    }

    logger.error('エラーをログに記録:', errorInfo);
  }

  /**
   * エラー統計取得
   * @returns {Object} エラー統計
   */
  getErrorStats() {
    const last24h = Date.now() - (24 * 60 * 60 * 1000);
    const recentErrors = this.errorHistory.filter(e => e.timestamp > last24h);

    return {
      totalErrors: this.errorHistory.length,
      recentErrors: recentErrors.length,
      recoveryAttempts: this.recoveryAttempts.size,
      errorTypes: this.groupErrorsByType(recentErrors)
    };
  }

  /**
   * エラータイプ別のグループ化
   * @param {Array} errors - エラー配列
   * @returns {Object} タイプ別エラー数
   */
  groupErrorsByType(errors) {
    return errors.reduce((groups, error) => {
      const type = error.type || 'unknown';
      groups[type] = (groups[type] || 0) + 1;
      return groups;
    }, {});
  }

  /**
   * エラー履歴クリア
   */
  clearErrorHistory() {
    this.errorHistory = [];
    this.recoveryAttempts.clear();
    logger.info('エラー履歴をクリアしました');
  }
}

// グローバルインスタンス
const errorBoundary = new ErrorBoundary();

// 自動初期化
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => errorBoundary.initialize());
  } else {
    errorBoundary.initialize();
  }
}

export { ErrorBoundary };
export default errorBoundary;