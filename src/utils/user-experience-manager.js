// src/utils/user-experience-manager.js
// ユーザー体験管理システム

import { logger, LOG_LEVELS, LOG_CATEGORIES } from './unified-logger.js';
import { security } from './security-manager.js';

/**
 * エラータイプ
 */
export const ERROR_TYPES = {
  NETWORK: 'network',
  PERMISSION: 'permission',
  COMPATIBILITY: 'compatibility',
  DATA: 'data',
  RENDERING: 'rendering',
  UNKNOWN: 'unknown'
};

/**
 * エラーレベル
 */
export const ERROR_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * ユーザー体験管理クラス
 */
export class UserExperienceManager {
  constructor() {
    this.errorGuidance = new Map();
    this.recoverySteps = new Map();
    this.userPreferences = {
      showDetailedErrors: false,
      autoRetry: true,
      showRecoverySteps: true,
      language: 'ja'
    };
    this.errorHistory = [];
    this.maxErrorHistory = 50;
    this.setupDefaultGuidance();
  }

  /**
   * デフォルトのエラーガイダンスを設定
   */
  setupDefaultGuidance() {
    // ネットワークエラー
    this.errorGuidance.set(ERROR_TYPES.NETWORK, {
      title: 'ネットワーク接続エラー',
      message: 'インターネット接続を確認してください',
      icon: '🌐',
      recoverySteps: [
        'Wi-Fiまたはモバイルデータの接続を確認',
        'ページを再読み込み',
        'しばらく待ってから再試行'
      ],
      autoRetry: true,
      retryDelay: 3000
    });

    // 権限エラー
    this.errorGuidance.set(ERROR_TYPES.PERMISSION, {
      title: 'カメラアクセス権限エラー',
      message: 'カメラの使用許可が必要です',
      icon: '📷',
      recoverySteps: [
        'ブラウザの設定でカメラアクセスを許可',
        'サイトの権限設定を確認',
        'ブラウザを再起動して再試行'
      ],
      autoRetry: false,
      showSettings: true
    });

    // 互換性エラー
    this.errorGuidance.set(ERROR_TYPES.COMPATIBILITY, {
      title: 'ブラウザ互換性エラー',
      message: 'お使いのブラウザは対応していません',
      icon: '⚠️',
      recoverySteps: [
        'Chrome、Firefox、Safariの最新版を使用',
        'WebRTCが有効になっているか確認',
        'JavaScriptが有効になっているか確認'
      ],
      autoRetry: false,
      showBrowserCheck: true
    });

    // データエラー
    this.errorGuidance.set(ERROR_TYPES.DATA, {
      title: 'データ読み込みエラー',
      message: 'プロジェクトデータの読み込みに失敗しました',
      icon: '📁',
      recoverySteps: [
        'プロジェクトが正しく保存されているか確認',
        '別のプロジェクトを試す',
        'プロジェクトを再作成'
      ],
      autoRetry: true,
      retryDelay: 2000
    });

    // レンダリングエラー
    this.errorGuidance.set(ERROR_TYPES.RENDERING, {
      title: '3D表示エラー',
      message: '3Dモデルの表示に問題があります',
      icon: '🎨',
      recoverySteps: [
        'ページを再読み込み',
        '3Dモデルファイルを確認',
        '別のモデルを試す'
      ],
      autoRetry: true,
      retryDelay: 1000
    });

    // 不明なエラー
    this.errorGuidance.set(ERROR_TYPES.UNKNOWN, {
      title: '予期しないエラー',
      message: 'システムエラーが発生しました',
      icon: '❌',
      recoverySteps: [
        'ページを再読み込み',
        'ブラウザを再起動',
        'しばらく待ってから再試行'
      ],
      autoRetry: true,
      retryDelay: 5000
    });
  }

  /**
   * エラータイプを判定
   * @param {Error} error - エラーオブジェクト
   * @param {Object} context - コンテキスト情報
   * @returns {string} エラータイプ
   */
  determineErrorType(error, context = {}) {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // ネットワークエラー
    if (message.includes('network') || 
        message.includes('fetch') || 
        message.includes('connection') ||
        message.includes('timeout') ||
        stack.includes('network')) {
      return ERROR_TYPES.NETWORK;
    }

    // 権限エラー
    if (message.includes('permission') || 
        message.includes('camera') || 
        message.includes('notallowed') ||
        message.includes('denied') ||
        stack.includes('getusermedia')) {
      return ERROR_TYPES.PERMISSION;
    }

    // 互換性エラー
    if (message.includes('not supported') || 
        message.includes('not implemented') || 
        message.includes('webrtc') ||
        message.includes('webgl') ||
        stack.includes('webrtc') ||
        stack.includes('webgl')) {
      return ERROR_TYPES.COMPATIBILITY;
    }

    // データエラー
    if (message.includes('json') || 
        message.includes('parse') || 
        message.includes('data') ||
        message.includes('project') ||
        context.dataError) {
      return ERROR_TYPES.DATA;
    }

    // レンダリングエラー
    if (message.includes('render') || 
        message.includes('three') || 
        message.includes('webgl') ||
        message.includes('model') ||
        context.renderingError) {
      return ERROR_TYPES.RENDERING;
    }

    return ERROR_TYPES.UNKNOWN;
  }

  /**
   * エラーレベルを判定
   * @param {string} errorType - エラータイプ
   * @param {Object} context - コンテキスト情報
   * @returns {string} エラーレベル
   */
  determineErrorLevel(errorType, context = {}) {
    // 権限エラーと互換性エラーは高レベル
    if (errorType === ERROR_TYPES.PERMISSION || 
        errorType === ERROR_TYPES.COMPATIBILITY) {
      return ERROR_LEVELS.HIGH;
    }

    // ネットワークエラーは中レベル
    if (errorType === ERROR_TYPES.NETWORK) {
      return ERROR_LEVELS.MEDIUM;
    }

    // データエラーとレンダリングエラーは低〜中レベル
    if (errorType === ERROR_TYPES.DATA || 
        errorType === ERROR_TYPES.RENDERING) {
      return ERROR_LEVELS.LOW;
    }

    // 不明なエラーは中レベル
    return ERROR_LEVELS.MEDIUM;
  }

  /**
   * エラーガイダンスを取得
   * @param {Error} error - エラーオブジェクト
   * @param {Object} context - コンテキスト情報
   * @returns {Object} エラーガイダンス
   */
  getErrorGuidance(error, context = {}) {
    const errorType = this.determineErrorType(error, context);
    const errorLevel = this.determineErrorLevel(errorType, context);
    const guidance = this.errorGuidance.get(errorType) || this.errorGuidance.get(ERROR_TYPES.UNKNOWN);

    // エラーヒストリーに追加
    this.addToErrorHistory({
      type: errorType,
      level: errorLevel,
      message: error.message,
      timestamp: Date.now(),
      context
    });

    return {
      ...guidance,
      type: errorType,
      level: errorLevel,
      originalError: error.message,
      context
    };
  }

  /**
   * エラーヒストリーに追加
   * @param {Object} errorInfo - エラー情報
   */
  addToErrorHistory(errorInfo) {
    this.errorHistory.push(errorInfo);
    
    // 最大履歴数を超えた場合は古いものを削除
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory.shift();
    }
  }

  /**
   * エラー表示UIを作成
   * @param {Object} guidance - エラーガイダンス
   * @param {Function} onRetry - リトライコールバック
   * @param {Function} onClose - 閉じるコールバック
   * @returns {HTMLElement} エラー表示要素
   */
  createErrorDisplay(guidance, onRetry = null, onClose = null) {
    const errorContainer = security.createElement('div', { 
      class: 'error-display-container' 
    });

    const errorContent = security.createElement('div', { 
      class: 'error-content' 
    });

    // ヘッダー
    const header = security.createElement('div', { 
      class: 'error-header' 
    });
    
    const icon = security.createElement('span', { 
      class: 'error-icon' 
    }, guidance.icon);
    
    const title = security.createElement('h2', { 
      class: 'error-title' 
    }, guidance.title);
    
    header.appendChild(icon);
    header.appendChild(title);

    // メッセージ
    const message = security.createElement('p', { 
      class: 'error-message' 
    }, guidance.message);

    // 復旧手順
    const recoverySection = security.createElement('div', { 
      class: 'error-recovery' 
    });
    
    const recoveryTitle = security.createElement('h3', { 
      class: 'recovery-title' 
    }, '復旧手順:');
    
    const recoveryList = security.createElement('ol', { 
      class: 'recovery-steps' 
    });
    
    guidance.recoverySteps.forEach((step, index) => {
      const stepItem = security.createElement('li', { 
        class: 'recovery-step' 
      }, step);
      recoveryList.appendChild(stepItem);
    });
    
    recoverySection.appendChild(recoveryTitle);
    recoverySection.appendChild(recoveryList);

    // アクションボタン
    const actions = security.createElement('div', { 
      class: 'error-actions' 
    });

    if (guidance.autoRetry && onRetry) {
      const retryBtn = security.createElement('button', { 
        class: 'btn-primary retry-button' 
      }, '再試行');
      retryBtn.addEventListener('click', onRetry);
      actions.appendChild(retryBtn);
    }

    if (guidance.showSettings) {
      const settingsBtn = security.createElement('button', { 
        class: 'btn-secondary settings-button' 
      }, '設定を開く');
      settingsBtn.addEventListener('click', () => {
        this.showPermissionSettings();
      });
      actions.appendChild(settingsBtn);
    }

    if (guidance.showBrowserCheck) {
      const browserBtn = security.createElement('button', { 
        class: 'btn-secondary browser-button' 
      }, 'ブラウザ互換性をチェック');
      browserBtn.addEventListener('click', () => {
        this.showBrowserCompatibilityCheck();
      });
      actions.appendChild(browserBtn);
    }

    if (onClose) {
      const closeBtn = security.createElement('button', { 
        class: 'btn-secondary close-button' 
      }, '閉じる');
      closeBtn.addEventListener('click', onClose);
      actions.appendChild(closeBtn);
    }

    // 詳細エラー情報（デバッグモード）
    if (this.userPreferences.showDetailedErrors) {
      const details = security.createElement('details', { 
        class: 'error-details' 
      });
      
      const summary = security.createElement('summary', {}, '詳細情報');
      const pre = security.createElement('pre', { 
        class: 'error-stack' 
      }, guidance.originalError);
      
      details.appendChild(summary);
      details.appendChild(pre);
      errorContent.appendChild(details);
    }

    // 要素を組み立て
    errorContent.appendChild(header);
    errorContent.appendChild(message);
    errorContent.appendChild(recoverySection);
    errorContent.appendChild(actions);
    errorContainer.appendChild(errorContent);

    return errorContainer;
  }

  /**
   * 権限設定を表示
   */
  showPermissionSettings() {
    const modal = security.createElement('div', { 
      class: 'permission-settings-modal' 
    });
    
    const content = security.createElement('div', { 
      class: 'modal-content' 
    });
    
    const title = security.createElement('h2', {}, 'カメラアクセス権限の設定');
    const instructions = security.createElement('div', { 
      class: 'permission-instructions' 
    });
    
    const steps = [
      '1. ブラウザのアドレスバー左側のカメラアイコンをクリック',
      '2. 「カメラ」の設定を「許可」に変更',
      '3. ページを再読み込みしてください'
    ];
    
    steps.forEach(step => {
      const stepElement = security.createElement('p', {}, step);
      instructions.appendChild(stepElement);
    });
    
    const closeBtn = security.createElement('button', { 
      class: 'btn-primary' 
    }, '閉じる');
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });
    
    content.appendChild(title);
    content.appendChild(instructions);
    content.appendChild(closeBtn);
    modal.appendChild(content);
    
    document.body.appendChild(modal);
  }

  /**
   * ブラウザ互換性チェックを表示
   */
  showBrowserCompatibilityCheck() {
    const modal = security.createElement('div', { 
      class: 'browser-compatibility-modal' 
    });
    
    const content = security.createElement('div', { 
      class: 'modal-content' 
    });
    
    const title = security.createElement('h2', {}, 'ブラウザ互換性チェック');
    const checkResults = security.createElement('div', { 
      class: 'compatibility-results' 
    });
    
    const checks = [
      { name: 'WebRTC', supported: this.checkWebRTCSupport() },
      { name: 'WebGL', supported: this.checkWebGLSupport() },
      { name: 'Camera API', supported: this.checkCameraAPISupport() },
      { name: 'IndexedDB', supported: this.checkIndexedDBSupport() }
    ];
    
    checks.forEach(check => {
      const checkItem = security.createElement('div', { 
        class: `compatibility-check ${check.supported ? 'supported' : 'not-supported'}` 
      });
      
      const checkName = security.createElement('span', { 
        class: 'check-name' 
      }, check.name);
      
      const checkStatus = security.createElement('span', { 
        class: 'check-status' 
      }, check.supported ? '✅ 対応' : '❌ 非対応');
      
      checkItem.appendChild(checkName);
      checkItem.appendChild(checkStatus);
      checkResults.appendChild(checkItem);
    });
    
    const closeBtn = security.createElement('button', { 
      class: 'btn-primary' 
    }, '閉じる');
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });
    
    content.appendChild(title);
    content.appendChild(checkResults);
    content.appendChild(closeBtn);
    modal.appendChild(content);
    
    document.body.appendChild(modal);
  }

  /**
   * WebRTCサポートをチェック
   * @returns {boolean} サポート状況
   */
  checkWebRTCSupport() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * WebGLサポートをチェック
   * @returns {boolean} サポート状況
   */
  checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }

  /**
   * カメラAPIサポートをチェック
   * @returns {boolean} サポート状況
   */
  checkCameraAPISupport() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * IndexedDBサポートをチェック
   * @returns {boolean} サポート状況
   */
  checkIndexedDBSupport() {
    return !!window.indexedDB;
  }

  /**
   * 自動リトライを実行
   * @param {Function} retryFunction - リトライ関数
   * @param {Object} guidance - エラーガイダンス
   * @param {number} maxRetries - 最大リトライ回数
   */
  async executeAutoRetry(retryFunction, guidance, maxRetries = 3) {
    if (!guidance.autoRetry) return;

    let retryCount = 0;
    const retryDelay = guidance.retryDelay || 3000;

    while (retryCount < maxRetries) {
      try {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        await retryFunction();
        logger.info('自動リトライが成功しました', { retryCount: retryCount + 1 });
        return;
      } catch (error) {
        retryCount++;
        logger.warn('自動リトライが失敗しました', { 
          retryCount, 
          maxRetries, 
          error: error.message 
        });
      }
    }

    logger.error('自動リトライが最大回数に達しました', { maxRetries });
  }

  /**
   * ユーザー設定を更新
   * @param {Object} preferences - 新しい設定
   */
  updateUserPreferences(preferences) {
    this.userPreferences = { ...this.userPreferences, ...preferences };
    logger.debug('ユーザー設定を更新しました', { preferences });
  }

  /**
   * エラーヒストリーを取得
   * @param {Object} filters - フィルター条件
   * @returns {Array} エラーヒストリー
   */
  getErrorHistory(filters = {}) {
    let history = [...this.errorHistory];

    if (filters.type) {
      history = history.filter(error => error.type === filters.type);
    }

    if (filters.level) {
      history = history.filter(error => error.level === filters.level);
    }

    if (filters.since) {
      const sinceTime = new Date(filters.since).getTime();
      history = history.filter(error => error.timestamp >= sinceTime);
    }

    return history.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * エラーレポートを生成
   * @returns {Object} エラーレポート
   */
  generateErrorReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalErrors: this.errorHistory.length,
      errorsByType: {},
      errorsByLevel: {},
      recentErrors: this.getErrorHistory({ since: Date.now() - 24 * 60 * 60 * 1000 }),
      userPreferences: this.userPreferences
    };

    // タイプ別集計
    this.errorHistory.forEach(error => {
      report.errorsByType[error.type] = (report.errorsByType[error.type] || 0) + 1;
      report.errorsByLevel[error.level] = (report.errorsByLevel[error.level] || 0) + 1;
    });

    return report;
  }
}

/**
 * グローバルユーザー体験管理インスタンス
 */
export const userExperienceManager = new UserExperienceManager();

export default userExperienceManager;
