/**
 * HMR（Hot Module Replacement）クライアントの実装
 * WebSocket接続の管理と再接続ロジックを提供
 */

import { createLogger } from './logger.js';

const hmrLogger = createLogger('HMRClient');

class HMRClient {
  constructor() {
    this.wsReconnectTimer = null;
    this.MAX_RECONNECT_ATTEMPTS = 3;
    this.reconnectAttempts = 0;
    this.isConnected = false;
    this.listeners = new Set();
    
    // 開発環境でのみ初期化
    if (import.meta.env.DEV) {
      this.initialize();
    }
  }

  initialize() {
    if (import.meta.hot) {
      this.setupHMRHandlers();
    }
  }

  setupHMRHandlers() {
    // 更新前のハンドラー
    import.meta.hot.on('vite:beforeUpdate', (data) => {
      hmrLogger.debug('HMR更新を準備中...', data);
      this.notifyListeners('beforeUpdate', data);
    });

    // 更新後のハンドラー
    import.meta.hot.on('vite:afterUpdate', (data) => {
      hmrLogger.success('HMR更新が完了しました', data);
      this.notifyListeners('afterUpdate', data);
    });

    // エラーハンドラー
    import.meta.hot.on('error', (error) => {
      hmrLogger.warn('HMRエラーが発生しました:', error);
      this.handleConnectionError(error);
    });

    // 接続が切断された場合のハンドラー
    window.addEventListener('offline', () => {
      hmrLogger.warn('ネットワーク接続が切断されました');
      this.handleConnectionError(new Error('Network disconnected'));
    });

    // 接続が復帰した場合のハンドラー
    window.addEventListener('online', () => {
      hmrLogger.info('ネットワーク接続が復帰しました');
      this.attemptReconnect();
    });
  }

  handleConnectionError(error) {
    // 既存の再接続タイマーをクリア
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }

    // 接続状態を更新
    this.isConnected = false;
    this.notifyListeners('connectionError', error);

    // 再接続を試行
    this.attemptReconnect();
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      hmrLogger.error('WebSocket接続の再試行回数上限に達しました');
      this.notifyListeners('reconnectFailed');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);

    hmrLogger.warn(`WebSocket再接続を試みます (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);
    this.notifyListeners('reconnecting', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.MAX_RECONNECT_ATTEMPTS,
      delay
    });

    this.wsReconnectTimer = setTimeout(() => {
      if (document.hidden) {
        // タブが非アクティブな場合は再接続を延期
        hmrLogger.debug('タブが非アクティブです。再接続を延期します');
        return;
      }

      // 開発サーバーに再接続
      this.reloadPage();
    }, delay);
  }

  reloadPage() {
    // ページをリロードする前にローカルストレージに状態を保存
    try {
      localStorage.setItem('hmr_reconnect_attempt', this.reconnectAttempts.toString());
      localStorage.setItem('hmr_last_reconnect', Date.now().toString());
    } catch (e) {
      hmrLogger.warn('ローカルストレージへの保存に失敗しました:', e);
    }

    // ページをリロード
    window.location.reload();
  }

  // イベントリスナーの管理
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        hmrLogger.error('リスナーの実行中にエラーが発生しました:', error);
      }
    });
  }

  // 接続状態の確認
  isWebSocketConnected() {
    return this.isConnected;
  }

  // インスタンスのクリーンアップ
  dispose() {
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
    }
    this.listeners.clear();
  }
}

// シングルトンインスタンスを作成
const hmrClient = new HMRClient();

export default hmrClient; 