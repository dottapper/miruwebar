// src/utils/viewer-app.js
// AR Viewer アプリケーションクラス - ライフサイクル管理

import { createLogger } from './logger.js';
import { createScreenManager } from './screen-manager.js';

const logger = createLogger('ViewerApp');

/**
 * AR Viewer アプリケーションクラス
 * 初期化・実行・破棄の統一的なライフサイクル管理を提供
 */
export class ViewerApp {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      debug: false,
      engine: 'webxr', // デフォルトARエンジン
      ...options
    };
    
    this.screenManager = null;
    this.arEngine = null;
    this.projectData = null;
    this.currentScreen = null;
    this.isInitialized = false;
    this.isDestroyed = false;
    
    logger.info('ViewerApp インスタンス作成', { 
      container: container.id, 
      options: this.options 
    });
  }

  /**
   * アプリケーション初期化
   * @param {Object} projectData - プロジェクトデータ
   * @returns {Promise<void>}
   */
  async initialize(projectData) {
    if (this.isInitialized) {
      logger.warn('ViewerApp は既に初期化されています');
      return;
    }

    try {
      logger.info('ViewerApp 初期化開始', { projectId: projectData?.id });
      
      this.projectData = projectData;
      
      // ScreenManager の初期化
      this.screenManager = createScreenManager(this.container);
      logger.debug('ScreenManager 初期化完了');
      
      // ARエンジンの初期化（遅延読み込み）
      await this.initializeAREngine();
      
      this.isInitialized = true;
      logger.success('ViewerApp 初期化完了');
      
    } catch (error) {
      logger.error('ViewerApp 初期化エラー', error);
      throw error;
    }
  }

  /**
   * ARエンジンの初期化
   * @private
   */
  async initializeAREngine() {
    try {
      logger.debug('ARエンジン初期化開始', { engine: this.options.engine });
      
      // AREngineAdapter パターンで実装
      this.arEngine = await this.loadAREngine(this.options.engine);
      
      await this.arEngine.initialize();
      logger.success('ARエンジン初期化完了', { engine: this.options.engine });
      
    } catch (error) {
      logger.error('ARエンジン初期化エラー', error);
      throw error;
    }
  }

  /**
   * ARエンジンの動的読み込み（AREngineAdapterを使用）
   * @private
   * @param {string} engineType - エンジンタイプ
   * @returns {Promise<Object>} エンジンインスタンス
   */
  async loadAREngine(engineType) {
    const { AREngineAdapter } = await import('./ar-engine-adapter.js');
    
    return await AREngineAdapter.create({
      container: this.container,
      preferredEngine: engineType,
      debug: this.options.debug
    });
  }

  /**
   * スタート画面表示
   * @param {Object} settings - 画面設定
   * @returns {Promise<string>} 画面ID
   */
  async showStartScreen(settings = {}) {
    this.ensureInitialized();
    
    try {
      logger.info('スタート画面表示開始');
      
      const screenId = await this.screenManager.showStartScreen(
        this.projectData, 
        settings
      );
      
      this.currentScreen = screenId;
      logger.success('スタート画面表示完了', { screenId });
      
      return screenId;
      
    } catch (error) {
      logger.error('スタート画面表示エラー', error);
      throw error;
    }
  }

  /**
   * ガイド画面表示
   * @param {Object} settings - 画面設定
   * @returns {Promise<string>} 画面ID
   */
  async showGuideScreen(settings = {}) {
    this.ensureInitialized();
    
    try {
      logger.info('ガイド画面表示開始');
      
      const screenId = await this.screenManager.showGuideScreen(settings);
      this.currentScreen = screenId;
      
      logger.success('ガイド画面表示完了', { screenId });
      return screenId;
      
    } catch (error) {
      logger.error('ガイド画面表示エラー', error);
      throw error;
    }
  }

  /**
   * ローディング画面表示
   * @param {Object} settings - 画面設定
   * @param {string} message - メッセージ
   * @param {number} progress - 進捗
   * @returns {Promise<string>} 画面ID
   */
  async showLoadingScreen(settings = {}, message = 'Loading...', progress = 0) {
    this.ensureInitialized();
    
    try {
      logger.info('ローディング画面表示開始', { message, progress });
      
      const screenId = await this.screenManager.showLoadingScreen(
        settings, 
        message, 
        progress
      );
      
      this.currentScreen = screenId;
      logger.success('ローディング画面表示完了', { screenId });
      
      return screenId;
      
    } catch (error) {
      logger.error('ローディング画面表示エラー', error);
      throw error;
    }
  }

  /**
   * 画面非表示
   * @param {string} screenId - 画面ID
   * @param {number} delay - 遅延時間
   */
  async hideScreen(screenId, delay = 0) {
    this.ensureInitialized();
    
    try {
      await this.screenManager.hideScreen(screenId, delay);
      
      if (this.currentScreen === screenId) {
        this.currentScreen = null;
      }
      
      logger.info('画面非表示完了', { screenId });
      
    } catch (error) {
      logger.error('画面非表示エラー', error);
    }
  }

  /**
   * 進捗更新
   * @param {string} screenId - 画面ID
   * @param {number} percent - 進捗パーセント
   * @param {string} message - メッセージ
   */
  updateProgress(screenId, percent, message) {
    if (this.screenManager) {
      this.screenManager.updateProgress(screenId, percent, message);
    }
  }

  /**
   * AR体験開始
   * @returns {Promise<void>}
   */
  async startARExperience() {
    this.ensureInitialized();
    
    try {
      logger.info('AR体験開始');
      
      if (!this.arEngine) {
        throw new Error('ARエンジンが初期化されていません');
      }
      
      await this.arEngine.start(this.projectData);
      logger.success('AR体験開始完了');
      
    } catch (error) {
      logger.error('AR体験開始エラー', error);
      throw error;
    }
  }

  /**
   * AR体験停止
   * @returns {Promise<void>}
   */
  async stopARExperience() {
    if (this.arEngine) {
      try {
        await this.arEngine.stop();
        logger.info('AR体験停止完了');
      } catch (error) {
        logger.error('AR体験停止エラー', error);
      }
    }
  }

  /**
   * アプリケーション破棄
   * @returns {Promise<void>}
   */
  async destroy() {
    if (this.isDestroyed) {
      logger.warn('ViewerApp は既に破棄されています');
      return;
    }

    try {
      logger.info('ViewerApp 破棄開始');
      
      // AR体験停止
      await this.stopARExperience();
      
      // 画面管理クリーンアップ
      if (this.screenManager) {
        this.screenManager.cleanup();
        this.screenManager = null;
      }
      
      // ARエンジン破棄
      if (this.arEngine) {
        if (typeof this.arEngine.destroy === 'function') {
          await this.arEngine.destroy();
        }
        this.arEngine = null;
      }
      
      this.projectData = null;
      this.currentScreen = null;
      this.isInitialized = false;
      this.isDestroyed = true;
      
      logger.success('ViewerApp 破棄完了');
      
    } catch (error) {
      logger.error('ViewerApp 破棄エラー', error);
    }
  }

  /**
   * 初期化状態確認
   * @private
   */
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error('ViewerApp が初期化されていません');
    }
    
    if (this.isDestroyed) {
      throw new Error('ViewerApp は既に破棄されています');
    }
  }

  /**
   * 現在の状態取得
   * @returns {Object} 状態情報
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      isDestroyed: this.isDestroyed,
      currentScreen: this.currentScreen,
      projectId: this.projectData?.id,
      engineType: this.options.engine,
      screenCount: this.screenManager?.getActiveScreenCount() || 0
    };
  }
}

/**
 * ViewerApp ファクトリ関数
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} options - オプション
 * @returns {ViewerApp} ViewerApp インスタンス
 */
export function createViewerApp(container, options = {}) {
  return new ViewerApp(container, options);
}

export default ViewerApp;