// src/utils/screen-manager.js
// AR画面管理の統一化 - 責任分離パターン

import { showViewerLoadingScreen, unifiedLoading } from './unified-loading-screen.js';

/**
 * AR画面管理クラス
 * Start/Guide/Loading画面の表示・非表示を統一的に管理
 */
export class ARScreenManager {
  constructor(container) {
    this.container = container;
    this.activeScreens = new Map();
    this.currentScreen = null;
  }

  /**
   * スタート画面表示
   * @param {Object} projectData - プロジェクトデータ
   * @param {Object} settings - スタート画面設定
   * @param {Object} options - 表示オプション
   * @param {Object} options.cta - CTAボタン設定
   * @returns {Promise<string>} 画面ID
   */
  async showStartScreen(projectData, settings = {}, options = {}) {
    try {
      console.log('🎬 ScreenManager: スタート画面表示開始', settings);
      
      const screenId = await showViewerLoadingScreen(projectData, {
        container: this.container,
        settings: {
          ...settings,
          template: 'simple',
          message: settings.title || 'AR体験を開始'
        },
        cta: options.cta
      });

      this.activeScreens.set(screenId, {
        type: 'start',
        element: document.getElementById(screenId),
        settings
      });
      
      this.currentScreen = screenId;
      console.log('✅ ScreenManager: スタート画面表示完了', screenId);
      
      // CTAの色適用（startScreenの色指定を反映）
      try {
        const screen = document.getElementById(screenId);
        const btn = screen?.querySelector('#ar-start-cta');
        if (btn) {
          const bg = settings.buttonColor || '#007bff';
          const fg = settings.buttonTextColor || '#ffffff';
          btn.style.background = bg;
          btn.style.color = fg;
        }
      } catch (_) {}
      return screenId;
      
    } catch (error) {
      console.error('❌ ScreenManager: スタート画面表示エラー', error);
      throw error;
    }
  }

  /**
   * ガイド画面表示
   * @param {Object} guideSettings - ガイド画面設定
   * @returns {Promise<string>} 画面ID
   */
  async showGuideScreen(guideSettings = {}) {
    try {
      console.log('🧭 ScreenManager: ガイド画面表示開始', guideSettings);
      
      // 既存のガイド画面要素を取得・表示
      const guideScreen = this.container.querySelector('#ar-guide-screen');
      if (guideScreen) {
        // ガイド画面設定を適用
        this.applyGuideSettings(guideScreen, guideSettings);
        guideScreen.style.display = 'flex';
        
        const screenId = 'guide-screen-' + Date.now();
        this.activeScreens.set(screenId, {
          type: 'guide',
          element: guideScreen,
          settings: guideSettings
        });
        
        this.currentScreen = screenId;
        console.log('✅ ScreenManager: ガイド画面表示完了', screenId);
        return screenId;
      } else {
        throw new Error('ガイド画面要素が見つかりません');
      }
      
    } catch (error) {
      console.error('❌ ScreenManager: ガイド画面表示エラー', error);
      throw error;
    }
  }

  /**
   * ローディング画面表示
   * @param {Object} loadingSettings - ローディング画面設定
   * @param {string} message - ローディングメッセージ
   * @param {number} progress - 進捗（0-100）
   * @returns {Promise<string>} 画面ID
   */
  async showLoadingScreen(loadingSettings = {}, message = 'Loading...', progress = 0) {
    try {
      console.log('⏳ ScreenManager: ローディング画面表示開始', { message, progress });
      
      const screenId = unifiedLoading.show({
        container: this.container,
        settings: loadingSettings,
        message,
        showProgress: loadingSettings.showProgress !== false
      });

      this.activeScreens.set(screenId, {
        type: 'loading',
        element: document.getElementById(screenId),
        settings: loadingSettings
      });
      
      this.currentScreen = screenId;
      
      // 初期進捗設定
      if (progress > 0) {
        this.updateProgress(screenId, progress, message);
      }
      
      console.log('✅ ScreenManager: ローディング画面表示完了', screenId);
      return screenId;
      
    } catch (error) {
      console.error('❌ ScreenManager: ローディング画面表示エラー', error);
      throw error;
    }
  }

  /**
   * 画面非表示
   * @param {string} screenId - 画面ID
   * @param {number} delay - 遅延時間（ミリ秒）
   */
  async hideScreen(screenId, delay = 0) {
    try {
      const screen = this.activeScreens.get(screenId);
      if (!screen) {
        console.warn('⚠️ ScreenManager: 非表示対象画面が見つかりません', screenId);
        return;
      }

      console.log('🔄 ScreenManager: 画面非表示開始', { screenId, type: screen.type });

      if (screen.type === 'start' || screen.type === 'loading') {
        // 統合ローディング画面システムで非表示
        unifiedLoading.hide(screenId, delay);
      } else if (screen.type === 'guide' && screen.element) {
        // ガイド画面の非表示
        if (delay > 0) {
          setTimeout(() => {
            screen.element.style.display = 'none';
          }, delay);
        } else {
          screen.element.style.display = 'none';
        }
      }

      this.activeScreens.delete(screenId);
      
      if (this.currentScreen === screenId) {
        this.currentScreen = null;
      }

      console.log('✅ ScreenManager: 画面非表示完了', screenId);
      
    } catch (error) {
      console.error('❌ ScreenManager: 画面非表示エラー', error);
    }
  }

  /**
   * 進捗更新
   * @param {string} screenId - 画面ID
   * @param {number} percent - 進捗パーセント
   * @param {string} message - メッセージ
   */
  updateProgress(screenId, percent, message) {
    try {
      const screen = this.activeScreens.get(screenId);
      if (screen && screen.type === 'loading') {
        unifiedLoading.updateProgress(screenId, percent, message);
        console.log('📊 ScreenManager: 進捗更新', { screenId, percent, message });
      }
    } catch (error) {
      console.error('❌ ScreenManager: 進捗更新エラー', error);
    }
  }

  /**
   * ガイド画面設定適用
   * @param {HTMLElement} guideElement - ガイド画面要素
   * @param {Object} settings - 設定
   */
  applyGuideSettings(guideElement, settings) {
    try {
      // 背景色（background/backgroundColor の両方を設定して確実に反映）
      if (settings.backgroundColor) {
        guideElement.style.setProperty('--guide-bg', settings.backgroundColor);
        guideElement.style.backgroundColor = settings.backgroundColor; // 互換
      }

      // タイトル・説明更新
      const guideTitle = guideElement.querySelector('#ar-guide-title');
      const guideDescription = guideElement.querySelector('#ar-guide-description');
      
      if (guideTitle && settings.title) {
        guideTitle.textContent = settings.title;
      }
      
      if (guideDescription && settings.description) {
        guideDescription.textContent = settings.description;
      }

      // ガイド画像設定
      const guideImage = guideElement.querySelector('#ar-guide-image');
      if (guideImage && settings.guideImage) {
        guideImage.src = settings.guideImage;
        guideImage.style.display = 'block';
      }

      console.log('🎨 ScreenManager: ガイド画面設定適用完了', settings);
      
    } catch (error) {
      console.error('❌ ScreenManager: ガイド画面設定適用エラー', error);
    }
  }

  /**
   * 全画面クリーンアップ
   */
  cleanup() {
    try {
      console.log('🧹 ScreenManager: クリーンアップ開始');
      
      this.activeScreens.forEach((screen, screenId) => {
        this.hideScreen(screenId);
      });
      
      this.activeScreens.clear();
      this.currentScreen = null;
      
      console.log('✅ ScreenManager: クリーンアップ完了');
      
    } catch (error) {
      console.error('❌ ScreenManager: クリーンアップエラー', error);
    }
  }

  /**
   * 現在の画面情報取得
   */
  getCurrentScreen() {
    if (this.currentScreen) {
      return this.activeScreens.get(this.currentScreen);
    }
    return null;
  }

  /**
   * アクティブ画面数取得
   */
  getActiveScreenCount() {
    return this.activeScreens.size;
  }
}

/**
 * デフォルトインスタンス作成用ファクトリ
 * @param {HTMLElement} container - コンテナ要素
 * @returns {ARScreenManager} ScreenManagerインスタンス
 */
export function createScreenManager(container) {
  return new ARScreenManager(container);
}

export default ARScreenManager;
