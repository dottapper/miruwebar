// src/utils/ar-engine-adapter.js
// ARエンジンの統一アダプターパターン - 端末差異の分岐を封じ込め

import { createLogger } from './logger.js';
import { checkXRSupport } from './webxr-support.js';

const logger = createLogger('AREngineAdapter');

/**
 * AR エンジンの共通インターフェース
 * すべてのARエンジンが実装すべき基本メソッド
 */
export class AREngineInterface {
  constructor(options = {}) {
    this.container = options.container;
    this.debug = options.debug || false;
    this.isInitialized = false;
    this.isRunning = false;
  }

  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  async start(projectData) {
    throw new Error('start() must be implemented by subclass');
  }

  async stop() {
    throw new Error('stop() must be implemented by subclass');
  }

  async destroy() {
    throw new Error('destroy() must be implemented by subclass');
  }

  // デバイス互換性チェック
  static isSupported() {
    throw new Error('isSupported() must be implemented by subclass');
  }

  // エンジンタイプ識別
  static getEngineType() {
    throw new Error('getEngineType() must be implemented by subclass');
  }
}

/**
 * ARエンジンアダプター - ファクトリーパターン
 * 端末差異とエンジン選択ロジックを封じ込める
 */
export class AREngineAdapter {
  // グローバル初期化mutex（競合回避）
  static _initializationMutex = false;
  static _activeEngine = null;
  /**
   * 最適なARエンジンを自動選択して作成
   * @param {Object} options - 設定オプション
   * @param {HTMLElement} options.container - コンテナ要素
   * @param {string} options.preferredEngine - 優先エンジン ('marker', 'webxr', 'auto')
   * @param {boolean} options.debug - デバッグモード
   * @returns {Promise<AREngineInterface>} ARエンジンインスタンス
   */
  static async create(options = {}) {
    // 初期化mutex確認（競合防止）
    if (this._initializationMutex) {
      throw new Error('AR初期化が既に進行中です。他の初期化を待つか、前の処理を停止してください。');
    }

    // アクティブエンジンが既に存在する場合は警告
    if (this._activeEngine) {
      logger.warn('既存のARエンジンが存在します', {
        activeEngine: this._activeEngine.constructor.name
      });
    }

    const {
      container,
      preferredEngine = 'auto',
      debug = false,
      ...engineOptions // カスタムオプション（markerUrl等）を保持
    } = options;

    logger.info('ARエンジン作成開始', { preferredEngine });

    try {
      // mutex設定
      this._initializationMutex = true;

      // エンジンタイプ決定
      const engineType = await this.determineEngineType(preferredEngine);
      logger.info('選択されたARエンジンタイプ', { engineType });

      // エンジンインスタンス作成
      const engine = await this.createEngineInstance(engineType, {
        container,
        debug,
        ...engineOptions // カスタムオプションを渡す
      });

      // アクティブエンジン設定
      this._activeEngine = engine;

      logger.success('ARエンジン作成完了', {
        engineType,
        engineClass: engine.constructor.name
      });

      return engine;

    } catch (error) {
      logger.error('ARエンジン作成エラー', error);
      throw error;
    } finally {
      // mutex解放
      this._initializationMutex = false;
    }
  }

  /**
   * エンジンタイプ決定ロジック（端末差異を考慮）
   * @private
   * @param {string} preferredEngine - 優先エンジン
   * @returns {Promise<string>} 決定されたエンジンタイプ
   */
  static async determineEngineType(preferredEngine) {
    // 明示的指定がある場合
    if (preferredEngine !== 'auto') {
      const isSupported = await this.checkEngineSupport(preferredEngine);
      if (isSupported) {
        return preferredEngine;
      } else {
        logger.warn('指定されたエンジンがサポートされていません', { preferredEngine });
      }
    }

    // 自動選択ロジック（端末差異対応）
    return await this.autoSelectEngine();
  }

  /**
   * 自動エンジン選択（端末・ブラウザ差異を考慮）
   * @private
   * @returns {Promise<string>} 選択されたエンジンタイプ
   */
  static async autoSelectEngine() {
    const userAgent = navigator.userAgent;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);
    const isChrome = /Chrome/i.test(userAgent);

    logger.debug('端末情報', { 
      isMobile, isIOS, isAndroid, isSafari, isChrome, userAgent 
    });

    // WebXR優先度判定
    if (await this.checkWebXRSupport()) {
      // Android Chrome: WebXR最優先
      if (isAndroid && isChrome) {
        logger.info('Android Chrome検出: WebXR選択');
        return 'webxr';
      }
      
      // デスクトップ Chrome/Edge: WebXR
      if (!isMobile && isChrome) {
        logger.info('デスクトップ Chrome検出: WebXR選択');
        return 'webxr';
      }
    }

    // iOS Safari: マーカーベース
    if (isIOS && isSafari) {
      logger.info('iOS Safari検出: Marker選択');
      return 'marker';
    }

    // フォールバック: マーカーベース
    logger.info('フォールバック: Marker選択');
    return 'marker';
  }

  /**
   * WebXRサポート確認（標準APIユーティリティ使用）
   * @private
   * @returns {Promise<boolean>} WebXRサポート状況
   */
  static async checkWebXRSupport() {
    try {
      const support = await checkXRSupport();
      logger.debug('WebXRサポート確認', {
        supported: support.supported,
        reason: support.reason
      });

      return support.supported;
    } catch (error) {
      logger.debug('WebXRサポート確認エラー', error);
      return false;
    }
  }

  /**
   * 特定エンジンのサポート確認
   * @private
   * @param {string} engineType - エンジンタイプ
   * @returns {Promise<boolean>} サポート状況
   */
  static async checkEngineSupport(engineType) {
    try {
      const engineModule = await this.loadEngineModule(engineType);
      const supportMethod = engineModule.default?.isSupported;

      if (!supportMethod) {
        logger.warn('isSupported メソッドが存在しません', { engineType });
        return true; // フォールバック: 利用可能とみなす
      }

      // 同期・非同期両対応
      const result = supportMethod();
      const isSupported = result instanceof Promise ? await result : result;

      logger.debug('エンジンサポート確認完了', { engineType, isSupported });
      return !!isSupported;

    } catch (error) {
      logger.warn('エンジンサポート確認エラー', { engineType, error: error.message });
      return false;
    }
  }

  /**
   * エンジンインスタンス作成
   * @private
   * @param {string} engineType - エンジンタイプ
   * @param {Object} options - オプション
   * @returns {Promise<AREngineInterface>} エンジンインスタンス
   */
  static async createEngineInstance(engineType, options) {
    const engineModule = await this.loadEngineModule(engineType);
    const EngineClass = engineModule.default;

    if (!EngineClass) {
      throw new Error(`エンジンクラスが見つかりません: ${engineType}`);
    }

    const instance = new EngineClass(options);
    
    // インターフェース準拠確認
    if (!(instance instanceof AREngineInterface)) {
      logger.warn('エンジンがAREngineInterfaceを継承していません', { engineType });
    }

    return instance;
  }

  /**
   * エンジンモジュールの動的読み込み
   * @private
   * @param {string} engineType - エンジンタイプ
   * @returns {Promise<Object>} エンジンモジュール
   */
  static async loadEngineModule(engineType) {
    switch (engineType) {
      case 'marker':
        return await import('../components/ar/marker-ar.js');
      
      case 'webxr':
        return await import('../components/ar/webxr-ar.js');
      
      default:
        throw new Error(`未知のARエンジンタイプ: ${engineType}`);
    }
  }

  /**
   * 利用可能なエンジンタイプ一覧取得
   * @returns {Promise<string[]>} エンジンタイプ配列
   */
  static async getAvailableEngines() {
    const engines = ['marker', 'webxr'];
    const available = [];

    for (const engineType of engines) {
      const isSupported = await this.checkEngineSupport(engineType);
      if (isSupported) {
        available.push(engineType);
      }
    }

    logger.debug('利用可能なARエンジン', { available });
    return available;
  }

  /**
   * エンジン情報取得
   * @param {string} engineType - エンジンタイプ
   * @returns {Promise<Object>} エンジン情報
   */
  static async getEngineInfo(engineType) {
    try {
      const engineModule = await this.loadEngineModule(engineType);
      const EngineClass = engineModule.default;

      return {
        type: engineType,
        name: EngineClass.name,
        isSupported: await this.checkEngineSupport(engineType),
        engineType: EngineClass.getEngineType?.() || engineType
      };
    } catch (error) {
      logger.warn('エンジン情報取得エラー', { engineType, error });
      return {
        type: engineType,
        name: 'Unknown',
        isSupported: false,
        error: error.message
      };
    }
  }

  /**
   * アクティブエンジンの停止と解放
   * @returns {Promise<void>}
   */
  static async destroyActiveEngine() {
    if (this._activeEngine) {
      logger.info('アクティブエンジンを破棄中', {
        engineType: this._activeEngine.constructor.name
      });

      try {
        await this._activeEngine.destroy();
      } catch (error) {
        logger.warn('エンジン破棄中にエラー', error);
      }

      this._activeEngine = null;
      logger.debug('アクティブエンジン破棄完了');
    }
  }

  /**
   * アクティブエンジン取得
   * @returns {AREngineInterface|null}
   */
  static getActiveEngine() {
    return this._activeEngine;
  }

  /**
   * 初期化状態確認
   * @returns {boolean}
   */
  static isInitializing() {
    return this._initializationMutex;
  }

  /**
   * システム全体のリセット（デバッグ用）
   * @returns {Promise<void>}
   */
  static async reset() {
    logger.info('ARエンジンアダプターをリセット中');

    await this.destroyActiveEngine();
    this._initializationMutex = false;

    logger.info('ARエンジンアダプターリセット完了');
  }
}

/**
 * 便利関数: デフォルトARエンジン作成
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} options - オプション
 * @returns {Promise<AREngineInterface>} ARエンジンインスタンス
 */
export async function createAREngine(container, options = {}) {
  return await AREngineAdapter.create({
    container,
    ...options
  });
}

export default AREngineAdapter;