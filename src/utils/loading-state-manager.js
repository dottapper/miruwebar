// src/utils/loading-state-manager.js
// 統一ローディング状態管理（軽量スケルトン）

import { createLogger } from './logger.js';

const logger = createLogger('LoadingStateManager');

/**
 * ローディング状態の定義
 */
export const LoadingState = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

/**
 * 統一ローディング状態管理クラス
 * AR状態機械と連携してUI表示を統一
 */
export class LoadingStateManager {
  constructor(options = {}) {
    this.currentState = LoadingState.IDLE;
    this.currentMessage = '';
    this.currentType = 'info';
    this.startTime = null;

    // UI要素の参照
    this.statusElement = options.statusElement || null;
    this.messageElement = options.messageElement || null;
    this.progressElement = options.progressElement || null;

    // コールバック
    this.onStateChange = options.onStateChange || null;

    logger.debug('ローディング状態管理初期化', { currentState: this.currentState });
  }

  /**
   * 状態更新
   * @param {string} state - 新しい状態
   * @param {string} message - 表示メッセージ
   * @param {string} type - メッセージタイプ ('info', 'warning', 'error', 'success')
   */
  updateState(state, message = '', type = 'info') {
    const oldState = this.currentState;

    this.currentState = state;
    this.currentMessage = message;
    this.currentType = type;

    if (state === LoadingState.LOADING && !this.startTime) {
      this.startTime = Date.now();
    } else if (state !== LoadingState.LOADING) {
      this.startTime = null;
    }

    logger.debug('ローディング状態更新', {
      from: oldState,
      to: state,
      message,
      type
    });

    // UI更新
    this.updateUI();

    // コールバック通知
    if (this.onStateChange) {
      try {
        this.onStateChange(state, oldState, { message, type });
      } catch (error) {
        logger.warn('状態変更コールバックエラー', error);
      }
    }
  }

  /**
   * UI要素の更新
   * @private
   */
  updateUI() {
    // ステータス要素の更新
    if (this.statusElement) {
      this.statusElement.textContent = this.currentMessage;
      this.statusElement.className = `status ${this.currentType}`;
    }

    // メッセージ要素の更新
    if (this.messageElement) {
      this.messageElement.innerHTML = this.currentMessage;
    }

    // プログレス要素の表示制御
    if (this.progressElement) {
      if (this.currentState === LoadingState.LOADING) {
        this.progressElement.style.display = 'block';
      } else {
        this.progressElement.style.display = 'none';
      }
    }
  }

  /**
   * 読み込み開始
   * @param {string} message - 読み込みメッセージ
   */
  startLoading(message = '読み込み中...') {
    this.updateState(LoadingState.LOADING, message, 'warning');
  }

  /**
   * 読み込み成功
   * @param {string} message - 成功メッセージ
   */
  setSuccess(message = '完了') {
    this.updateState(LoadingState.SUCCESS, message, 'success');
  }

  /**
   * 読み込みエラー
   * @param {string} message - エラーメッセージ
   */
  setError(message = 'エラーが発生しました') {
    this.updateState(LoadingState.ERROR, message, 'error');
  }

  /**
   * アイドル状態に戻す
   * @param {string} message - アイドルメッセージ
   */
  setIdle(message = '準備完了') {
    this.updateState(LoadingState.IDLE, message, 'info');
  }

  /**
   * 現在の状態取得
   * @returns {Object} 状態情報
   */
  getState() {
    return {
      state: this.currentState,
      message: this.currentMessage,
      type: this.currentType,
      duration: this.startTime ? Date.now() - this.startTime : 0
    };
  }

  /**
   * 読み込み中かどうか
   * @returns {boolean}
   */
  isLoading() {
    return this.currentState === LoadingState.LOADING;
  }

  /**
   * エラー状態かどうか
   * @returns {boolean}
   */
  isError() {
    return this.currentState === LoadingState.ERROR;
  }

  /**
   * UI要素の再設定
   * @param {Object} elements - UI要素のオブジェクト
   */
  setElements(elements) {
    this.statusElement = elements.statusElement || this.statusElement;
    this.messageElement = elements.messageElement || this.messageElement;
    this.progressElement = elements.progressElement || this.progressElement;

    // 即座にUI更新
    this.updateUI();
  }

  /**
   * リセット
   */
  reset() {
    this.updateState(LoadingState.IDLE, '準備完了', 'info');
    logger.debug('ローディング状態管理リセット');
  }
}

/**
 * ファクトリー関数
 * @param {Object} options - オプション
 * @returns {LoadingStateManager} インスタンス
 */
export function createLoadingStateManager(options = {}) {
  return new LoadingStateManager(options);
}

export default LoadingStateManager;