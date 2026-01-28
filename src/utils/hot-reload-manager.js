// src/utils/hot-reload-manager.js
// ホットリロード時の状態管理

import { logger } from './unified-logger.js';

/**
 * ホットリロード管理クラス
 */
class HotReloadManager {
  constructor() {
    this.isHotReloading = false;
    this.stateBackup = new Map();
    this.reloadCallbacks = [];
    this.beforeReloadCallbacks = [];
    this.afterReloadCallbacks = [];
    this.setupHMR();
  }

  /**
   * HMR（Hot Module Replacement）をセットアップ
   */
  setupHMR() {
    if (typeof import.meta !== 'undefined' && import.meta.hot) {
      // ViteのHMR APIを使用
      import.meta.hot.on('vite:beforeUpdate', () => {
        this.handleBeforeReload();
      });

      import.meta.hot.on('vite:afterUpdate', () => {
        this.handleAfterReload();
      });

      import.meta.hot.on('vite:error', (error) => {
        this.handleReloadError(error);
      });
    } else if (typeof module !== 'undefined' && module.hot) {
      // WebpackのHMR APIを使用
      module.hot.accept();
      module.hot.addStatusHandler((status) => {
        if (status === 'prepare') {
          this.handleBeforeReload();
        } else if (status === 'ready') {
          this.handleAfterReload();
        } else if (status === 'abort' || status === 'fail') {
          this.handleReloadError(new Error('HMR failed'));
        }
      });
    } else {
      // フォールバック: ページリロードを監視
      this.setupPageReloadFallback();
    }
  }

  /**
   * ページリロードのフォールバック設定
   */
  setupPageReloadFallback() {
    // ページがアンロードされる前に状態を保存
    window.addEventListener('beforeunload', () => {
      this.handleBeforeReload();
    });

    // ページがロードされた後に状態を復元
    window.addEventListener('load', () => {
      this.handleAfterReload();
    });
  }

  /**
   * リロード前の処理
   */
  handleBeforeReload() {
    this.isHotReloading = true;
    logger.info('ホットリロード開始: 状態をバックアップ中...');

    // バックアップ前のコールバックを実行
    this.beforeReloadCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        logger.error('バックアップ前コールバックでエラーが発生しました', { error: error.message });
      }
    });

    // 状態をバックアップ
    this.backupState();
  }

  /**
   * リロード後の処理
   */
  handleAfterReload() {
    logger.info('ホットリロード完了: 状態を復元中...');

    // 状態を復元
    this.restoreState();

    // 復元後のコールバックを実行
    this.afterReloadCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        logger.error('復元後コールバックでエラーが発生しました', { error: error.message });
      }
    });

    this.isHotReloading = false;
    logger.info('ホットリロード完了');
  }

  /**
   * リロードエラーの処理
   */
  handleReloadError(error) {
    logger.error('ホットリロード中にエラーが発生しました', { error: error.message });
    this.isHotReloading = false;
  }

  /**
   * 状態をバックアップ
   */
  backupState() {
    try {
      // ローカルストレージの状態をバックアップ
      const localStorageState = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          localStorageState[key] = localStorage.getItem(key);
        }
      }
      this.stateBackup.set('localStorage', localStorageState);

      // セッションストレージの状態をバックアップ
      const sessionStorageState = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          sessionStorageState[key] = sessionStorage.getItem(key);
        }
      }
      this.stateBackup.set('sessionStorage', sessionStorageState);

      // グローバル変数の状態をバックアップ
      const globalState = {
        currentProject: window.currentProject,
        arInstance: window.arInstance
      };
      this.stateBackup.set('global', globalState);

      // DOM要素の状態をバックアップ
      this.backupDOMState();

      logger.debug('状態のバックアップが完了しました', {
        localStorage: Object.keys(localStorageState).length,
        sessionStorage: Object.keys(sessionStorageState).length,
        global: Object.keys(globalState).length
      });

    } catch (error) {
      logger.error('状態のバックアップ中にエラーが発生しました', { error: error.message });
    }
  }

  /**
   * DOM要素の状態をバックアップ
   */
  backupDOMState() {
    try {
      const domState = {};

      // フォーム要素の状態をバックアップ
      const forms = document.querySelectorAll('form');
      forms.forEach((form, index) => {
        const formData = new FormData(form);
        const formState = {};
        for (const [key, value] of formData.entries()) {
          formState[key] = value;
        }
        domState[`form_${index}`] = {
          id: form.id,
          className: form.className,
          data: formState
        };
      });

      // 入力要素の状態をバックアップ
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach((input, index) => {
        if (input.type !== 'password') { // パスワードは除外
          domState[`input_${index}`] = {
            id: input.id,
            name: input.name,
            type: input.type,
            value: input.value,
            checked: input.checked
          };
        }
      });

      this.stateBackup.set('dom', domState);

    } catch (error) {
      logger.error('DOM状態のバックアップ中にエラーが発生しました', { error: error.message });
    }
  }

  /**
   * 状態を復元
   */
  restoreState() {
    try {
      // ローカルストレージの状態を復元
      const localStorageState = this.stateBackup.get('localStorage');
      if (localStorageState) {
        Object.entries(localStorageState).forEach(([key, value]) => {
          try {
            localStorage.setItem(key, value);
          } catch (error) {
            logger.warn(`ローカルストレージの復元に失敗しました: ${key}`, { error: error.message });
          }
        });
      }

      // セッションストレージの状態を復元
      const sessionStorageState = this.stateBackup.get('sessionStorage');
      if (sessionStorageState) {
        Object.entries(sessionStorageState).forEach(([key, value]) => {
          try {
            sessionStorage.setItem(key, value);
          } catch (error) {
            logger.warn(`セッションストレージの復元に失敗しました: ${key}`, { error: error.message });
          }
        });
      }

      // グローバル変数の状態を復元
      const globalState = this.stateBackup.get('global');
      if (globalState) {
        Object.entries(globalState).forEach(([key, value]) => {
          if (value !== undefined) {
            window[key] = value;
          }
        });
      }

      // DOM要素の状態を復元
      this.restoreDOMState();

      logger.debug('状態の復元が完了しました');

    } catch (error) {
      logger.error('状態の復元中にエラーが発生しました', { error: error.message });
    }
  }

  /**
   * DOM要素の状態を復元
   */
  restoreDOMState() {
    try {
      const domState = this.stateBackup.get('dom');
      if (!domState) return;

      // 入力要素の状態を復元
      Object.entries(domState).forEach(([key, state]) => {
        if (key.startsWith('input_')) {
          const element = document.getElementById(state.id) || 
                         document.querySelector(`[name="${state.name}"]`);
          if (element) {
            if (state.type === 'checkbox' || state.type === 'radio') {
              element.checked = state.checked;
            } else {
              element.value = state.value;
            }
          }
        }
      });

    } catch (error) {
      logger.error('DOM状態の復元中にエラーが発生しました', { error: error.message });
    }
  }

  /**
   * バックアップ前のコールバックを追加
   * @param {Function} callback - コールバック関数
   */
  addBeforeReloadCallback(callback) {
    this.beforeReloadCallbacks.push(callback);
  }

  /**
   * 復元後のコールバックを追加
   * @param {Function} callback - コールバック関数
   */
  addAfterReloadCallback(callback) {
    this.afterReloadCallbacks.push(callback);
  }

  /**
   * リロード時のコールバックを追加
   * @param {Function} callback - コールバック関数
   */
  addReloadCallback(callback) {
    this.reloadCallbacks.push(callback);
  }

  /**
   * 状態を手動でバックアップ
   * @param {string} key - キー
   * @param {any} value - 値
   */
  backup(key, value) {
    this.stateBackup.set(key, value);
    logger.debug(`状態をバックアップしました: ${key}`);
  }

  /**
   * 状態を手動で復元
   * @param {string} key - キー
   * @returns {any} 復元された値
   */
  restore(key) {
    const value = this.stateBackup.get(key);
    if (value !== undefined) {
      logger.debug(`状態を復元しました: ${key}`);
    }
    return value;
  }

  /**
   * バックアップをクリア
   */
  clearBackup() {
    this.stateBackup.clear();
    logger.debug('バックアップをクリアしました');
  }

  /**
   * ホットリロード中かどうかを確認
   * @returns {boolean} ホットリロード中かどうか
   */
  isReloading() {
    return this.isHotReloading;
  }

  /**
   * 状態の整合性をチェック
   * @returns {Object} チェック結果
   */
  checkStateIntegrity() {
    const issues = [];

    try {
      // ローカルストレージの整合性をチェック
      const localStorageState = this.stateBackup.get('localStorage');
      if (localStorageState) {
        Object.entries(localStorageState).forEach(([key, expectedValue]) => {
          const actualValue = localStorage.getItem(key);
          if (actualValue !== expectedValue) {
            issues.push(`ローカルストレージの不整合: ${key}`);
          }
        });
      }

      // グローバル変数の整合性をチェック
      const globalState = this.stateBackup.get('global');
      if (globalState) {
        Object.entries(globalState).forEach(([key, expectedValue]) => {
          const actualValue = window[key];
          if (actualValue !== expectedValue) {
            issues.push(`グローバル変数の不整合: ${key}`);
          }
        });
      }

    } catch (error) {
      issues.push(`整合性チェック中にエラーが発生しました: ${error.message}`);
    }

    return {
      isIntegrity: issues.length === 0,
      issues
    };
  }
}

/**
 * グローバルホットリロード管理インスタンス
 */
export const hotReloadManager = new HotReloadManager();

/**
 * 開発環境での自動セットアップ
 */
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  // 開発環境では自動的にホットリロード管理を有効化
  logger.info('ホットリロード管理を有効化しました');
}

export default hotReloadManager;
