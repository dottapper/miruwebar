// src/utils/ar-state-machine.js
// AR初期化状態機械 - 競合状態とエラー回復を管理

import { createLogger } from './logger.js';

const logger = createLogger('ARStateMachine');

/**
 * AR初期化の状態定義
 */
export const ARState = {
  IDLE: 'idle',
  LAUNCH_REQUESTED: 'launch_requested',
  PERMISSION_PROMPT: 'permission_prompt',
  CAMERA_STARTING: 'camera_starting',
  XR_STARTING: 'xr_starting',
  LOADING_ASSETS: 'loading_assets',
  PLACING: 'placing',
  RUNNING: 'running',
  ERROR: 'error',
  DISPOSED: 'disposed'
};

/**
 * 状態遷移の定義（許可された遷移のみ）
 */
const ALLOWED_TRANSITIONS = {
  [ARState.IDLE]: [ARState.LAUNCH_REQUESTED, ARState.ERROR],
  [ARState.LAUNCH_REQUESTED]: [ARState.PERMISSION_PROMPT, ARState.ERROR, ARState.IDLE],
  [ARState.PERMISSION_PROMPT]: [ARState.CAMERA_STARTING, ARState.XR_STARTING, ARState.ERROR, ARState.IDLE],
  [ARState.CAMERA_STARTING]: [ARState.LOADING_ASSETS, ARState.ERROR, ARState.IDLE],
  [ARState.XR_STARTING]: [ARState.LOADING_ASSETS, ARState.ERROR, ARState.IDLE],
  [ARState.LOADING_ASSETS]: [ARState.PLACING, ARState.RUNNING, ARState.ERROR, ARState.IDLE],
  [ARState.PLACING]: [ARState.RUNNING, ARState.ERROR, ARState.IDLE],
  [ARState.RUNNING]: [ARState.ERROR, ARState.IDLE, ARState.DISPOSED],
  [ARState.ERROR]: [ARState.IDLE, ARState.DISPOSED],
  [ARState.DISPOSED]: [] // 終端状態
};

/**
 * AR状態機械クラス
 * 非同期処理の競合と状態不整合を防ぐ
 */
export class ARStateMachine {
  constructor(options = {}) {
    this.currentState = ARState.IDLE;
    this.previousState = null;
    this.startTime = Date.now();
    this.stateHistory = [];
    this.maxHistorySize = options.maxHistorySize || 20;

    // 状態変更コールバック
    this.onStateChange = options.onStateChange || null;
    this.onError = options.onError || null;

    // タイムアウト管理
    this.timeouts = new Map();
    this.defaultTimeout = options.defaultTimeout || 30000; // 30秒

    // 進行中の処理追跡
    this.currentOperation = null;
    this.operationData = {};

    logger.debug('AR状態機械初期化完了', { initialState: this.currentState });
  }

  /**
   * 現在の状態を取得
   */
  getState() {
    return this.currentState;
  }

  /**
   * 状態履歴を取得
   */
  getHistory() {
    return [...this.stateHistory];
  }

  /**
   * 状態遷移実行
   * @param {string} newState - 新しい状態
   * @param {Object} data - 状態データ
   * @param {number} timeout - タイムアウト時間（ms）
   */
  async transition(newState, data = {}, timeout = null) {
    // 重複遷移防止
    if (this.currentState === newState) {
      logger.debug('状態遷移スキップ（同一状態）', { state: newState });
      return;
    }

    // 遷移可能性チェック
    const allowedTransitions = ALLOWED_TRANSITIONS[this.currentState] || [];
    if (!allowedTransitions.includes(newState)) {
      const error = new Error(
        `不正な状態遷移: ${this.currentState} -> ${newState}. 許可された遷移: ${allowedTransitions.join(', ')}`
      );
      logger.error('状態遷移エラー', error);
      await this.handleTransitionError(error, newState, data);
      return;
    }

    const oldState = this.currentState;
    const timestamp = Date.now();

    logger.info('状態遷移開始', {
      from: oldState,
      to: newState,
      data: Object.keys(data),
      timeout: timeout || this.defaultTimeout
    });

    try {
      // 前状態のクリーンアップ
      await this.exitState(oldState);

      // 状態更新
      this.previousState = oldState;
      this.currentState = newState;
      this.operationData = { ...data };

      // 履歴追加
      this.addToHistory({
        from: oldState,
        to: newState,
        timestamp,
        data: { ...data }
      });

      // タイムアウト設定
      if (timeout !== null || this.defaultTimeout > 0) {
        this.setStateTimeout(newState, timeout || this.defaultTimeout);
      }

      // 新状態の初期化
      await this.enterState(newState, data);

      // コールバック通知
      if (this.onStateChange) {
        try {
          await this.onStateChange(newState, oldState, data);
        } catch (callbackError) {
          logger.warn('状態変更コールバックエラー', callbackError);
        }
      }

      logger.debug('状態遷移完了', {
        from: oldState,
        to: newState,
        duration: Date.now() - timestamp
      });

    } catch (error) {
      logger.error('状態遷移失敗', { from: oldState, to: newState, error });
      await this.handleTransitionError(error, newState, data);
    }
  }

  /**
   * 状態進入処理
   * @private
   */
  async enterState(state, data) {
    switch (state) {
      case ARState.LAUNCH_REQUESTED:
        await this.handleLaunchRequested(data);
        break;

      case ARState.PERMISSION_PROMPT:
        await this.handlePermissionPrompt(data);
        break;

      case ARState.CAMERA_STARTING:
        await this.handleCameraStarting(data);
        break;

      case ARState.XR_STARTING:
        await this.handleXRStarting(data);
        break;

      case ARState.LOADING_ASSETS:
        await this.handleLoadingAssets(data);
        break;

      case ARState.PLACING:
        await this.handlePlacing(data);
        break;

      case ARState.RUNNING:
        await this.handleRunning(data);
        break;

      case ARState.ERROR:
        await this.handleError(data);
        break;

      case ARState.DISPOSED:
        await this.handleDisposed(data);
        break;
    }
  }

  /**
   * 状態退出処理
   * @private
   */
  async exitState(state) {
    // タイムアウトクリア
    this.clearStateTimeout(state);

    // 現在の操作をキャンセル
    if (this.currentOperation) {
      try {
        if (typeof this.currentOperation.cancel === 'function') {
          await this.currentOperation.cancel();
        }
      } catch (error) {
        logger.debug('操作キャンセルエラー', error);
      }
      this.currentOperation = null;
    }
  }

  /**
   * 各状態の処理ハンドラー
   * 基本実装 - 実際の処理は外部ハンドラーで実行
   */
  async handleLaunchRequested(data) {
    logger.debug('AR起動要求処理', data);
    // 実際の処理は外部コールバックで実行される
    // ここでは状態維持のみ
  }

  async handlePermissionPrompt(data) {
    logger.debug('権限プロンプト処理', data);
    // カメラ・センサー権限の要求処理
    // 実際の処理は外部コールバックで実行される
  }

  async handleCameraStarting(data) {
    logger.debug('カメラ起動処理', data);
    // AR.js カメラ初期化
    // 実際の処理は外部コールバックで実行される
  }

  async handleXRStarting(data) {
    logger.debug('WebXR起動処理', data);
    // navigator.xr.requestSession
    // 実際の処理は外部コールバックで実行される
  }

  async handleLoadingAssets(data) {
    logger.debug('アセット読み込み処理', data);
    // 3Dモデル・テクスチャの読み込み
    // 実際の処理は外部コールバックで実行される
  }

  async handlePlacing(data) {
    logger.debug('配置モード処理', data);
    // マーカー検出待機 or 平面タップ待機
    // 実際の処理は外部コールバックで実行される
  }

  async handleRunning(data) {
    logger.debug('AR実行処理', data);
    // アニメーションループ・インタラクション処理
    // 実際の処理は外部コールバックで実行される
  }

  async handleError(data) {
    logger.error('ARエラー処理', data);
    const error = data.error || new Error('Unknown AR error');

    if (this.onError) {
      try {
        await this.onError(error, this.previousState, data);
      } catch (callbackError) {
        logger.error('エラーコールバック失敗', callbackError);
      }
    }
  }

  async handleDisposed(data) {
    logger.debug('AR破棄処理', data);
    // 全リソースのクリーンアップ
    this.clearAllTimeouts();
  }

  /**
   * 遷移エラーハンドリング
   * @private
   */
  async handleTransitionError(error, targetState, data) {
    // エラー状態に強制遷移（遷移チェックをスキップ）
    this.currentState = ARState.ERROR;
    this.operationData = { error, targetState, originalData: data };

    await this.handleError({ error, targetState, originalData: data });
  }

  /**
   * タイムアウト設定
   * @private
   */
  setStateTimeout(state, timeout) {
    this.clearStateTimeout(state);

    const timeoutId = setTimeout(async () => {
      logger.warn('状態タイムアウト', { state, timeout });
      const timeoutError = new Error(`状態 "${state}" がタイムアウトしました (${timeout}ms)`);
      await this.transition(ARState.ERROR, { error: timeoutError });
    }, timeout);

    this.timeouts.set(state, timeoutId);
  }

  /**
   * タイムアウトクリア
   * @private
   */
  clearStateTimeout(state) {
    const timeoutId = this.timeouts.get(state);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(state);
    }
  }

  /**
   * 全タイムアウトクリア
   * @private
   */
  clearAllTimeouts() {
    for (const [state, timeoutId] of this.timeouts) {
      clearTimeout(timeoutId);
    }
    this.timeouts.clear();
  }

  /**
   * 履歴に追加
   * @private
   */
  addToHistory(entry) {
    this.stateHistory.push(entry);

    // 履歴サイズ制限
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
  }

  /**
   * 状態機械リセット
   */
  async reset() {
    logger.info('AR状態機械リセット');

    await this.exitState(this.currentState);
    this.currentState = ARState.IDLE;
    this.previousState = null;
    this.operationData = {};
    this.currentOperation = null;
    this.clearAllTimeouts();
  }

  /**
   * 状態機械破棄
   */
  async dispose() {
    logger.info('AR状態機械破棄');

    await this.transition(ARState.DISPOSED);
    this.onStateChange = null;
    this.onError = null;
  }

  /**
   * デバッグ情報取得
   */
  getDebugInfo() {
    return {
      currentState: this.currentState,
      previousState: this.previousState,
      operationData: this.operationData,
      activeTimeouts: Array.from(this.timeouts.keys()),
      historyLength: this.stateHistory.length,
      uptime: Date.now() - this.startTime
    };
  }
}

/**
 * AR状態機械ファクトリー
 */
export function createARStateMachine(options = {}) {
  return new ARStateMachine(options);
}

export default ARStateMachine;