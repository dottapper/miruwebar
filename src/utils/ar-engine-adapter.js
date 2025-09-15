// src/utils/ar-engine-adapter.js
// ARエンジンの統一アダプターパターン - 端末差異の分岐を封じ込め

import { createLogger } from './logger.js';

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
  /**
   * 最適なARエンジンを自動選択して作成
   * @param {Object} options - 設定オプション
   * @param {HTMLElement} options.container - コンテナ要素
   * @param {string} options.preferredEngine - 優先エンジン ('marker', 'webxr', 'auto')
   * @param {boolean} options.debug - デバッグモード
   * @returns {Promise<AREngineInterface>} ARエンジンインスタンス
   */
  static async create(options = {}) {
    const {
      container,
      preferredEngine = 'auto',
      debug = false
    } = options;

    logger.info('ARエンジン作成開始', { preferredEngine });

    try {
      // エンジンタイプ決定
      const engineType = await this.determineEngineType(preferredEngine);
      logger.info('選択されたARエンジンタイプ', { engineType });

      // エンジンインスタンス作成
      const engine = await this.createEngineInstance(engineType, {
        container,
        debug
      });

      logger.success('ARエンジン作成完了', { 
        engineType, 
        engineClass: engine.constructor.name 
      });

      return engine;

    } catch (error) {
      logger.error('ARエンジン作成エラー', error);
      throw error;
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
   * WebXRサポート確認
   * @private
   * @returns {Promise<boolean>} WebXRサポート状況
   */
  static async checkWebXRSupport() {
    try {
      if (!navigator.xr) {
        return false;
      }
      
      const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
      logger.debug('WebXRサポート確認', { isSupported });
      
      return isSupported;
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
      return engineModule.default?.isSupported?.() || true;
    } catch (error) {
      logger.warn('エンジンサポート確認エラー', { engineType, error });
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
        // WebXR実装はlegacyディレクトリに移動済み
        throw new Error('WebXR実装は現在サポートされていません');
      
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