// src/utils/unified-loading-screen.js
// 統一されたローディング画面レンダリングシステム
// エディターとビューア共通で使用し、設定の一貫性を保証

/**
 * 統一されたローディング画面レンダリングクラス
 * インラインスタイルを除去し、設定ベースの動的レンダリングを実現
 */
class UnifiedLoadingScreen {
  constructor() {
    this.activeScreens = new Map();
    this.screenId = 0;
    this.cssInjected = false;
  }

  /**
   * 必要なCSSスタイルを挿入
   */
  injectCSS() {
    if (this.cssInjected) return;
    
    const style = document.createElement('style');
    style.id = 'unified-loading-styles';
    style.textContent = `
      .unified-loading-screen {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: opacity 0.3s ease;
      }
      
      .unified-loading-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 2rem;
        border-radius: 12px;
        max-width: 90%;
        width: auto;
      }
      
      .unified-loading-logo {
        max-width: 160px;
        max-height: 80px;
        margin-bottom: 1rem;
        object-fit: contain;
      }
      
      .unified-loading-title {
        font-size: 1.5rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        line-height: 1.2;
      }
      
      .unified-loading-message {
        font-size: 1rem;
        margin-bottom: 1.5rem;
        line-height: 1.4;
        opacity: 0.9;
      }
      
      .unified-loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top: 4px solid currentColor;
        border-radius: 50%;
        animation: unified-spin 1s linear infinite;
        margin-bottom: 1rem;
      }
      
      .unified-loading-progress {
        width: 200px;
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        overflow: hidden;
        margin-top: 0.5rem;
      }
      
      .unified-progress-bar {
        width: 0%;
        height: 100%;
        border-radius: 2px;
        transition: width 0.3s ease;
        background: currentColor;
      }
      
      @keyframes unified-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* テーマ別スタイル */
      .unified-loading-screen.theme-simple {
        background: rgba(0, 0, 0, 0.8);
        color: #ffffff;
      }
      
      .unified-loading-screen.theme-modern {
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(32, 32, 32, 0.9));
        color: #ffffff;
      }
      
      .unified-loading-screen.theme-brand {
        background: rgba(0, 123, 255, 0.9);
        color: #ffffff;
      }
      
      /* レスポンシブ対応 */
      @media (max-width: 768px) {
        .unified-loading-title {
          font-size: 1.25rem;
        }
        
        .unified-loading-message {
          font-size: 0.9rem;
        }
        
        .unified-loading-progress {
          width: 160px;
        }
      }
    `;
    
    document.head.appendChild(style);
    this.cssInjected = true;
  }

  /**
   * ローディング画面を表示
   * @param {Object} options - 表示オプション
   * @param {HTMLElement} options.container - 表示先コンテナ
   * @param {Object} options.settings - ローディング画面設定
   * @param {string} options.message - 表示メッセージ
   * @param {boolean} options.showProgress - プログレスバー表示
   * @returns {string} ローディング画面ID
   */
  show(options = {}) {
    const {
      container = document.body,
      settings = this.getDefaultSettings(),
      message = 'Loading...',
      showProgress = true
    } = options;

    this.injectCSS();
    
    const screenId = `unified-loading-${++this.screenId}`;
    
    // ローディング画面要素を作成
    const loadingElement = document.createElement('div');
    loadingElement.className = this.buildClassName(settings);
    loadingElement.id = screenId;
    
    // 設定に基づいてスタイルを適用
    this.applyDynamicStyles(loadingElement, settings);
    
    // コンテンツを構築
    loadingElement.innerHTML = this.buildContent(settings, message, showProgress);
    
    // コンテナに追加
    const targetContainer = typeof container === 'string' 
      ? document.getElementById(container) 
      : container;
    
    if (targetContainer) {
      targetContainer.style.position = targetContainer.style.position || 'relative';
      targetContainer.appendChild(loadingElement);
    }
    
    // 管理用に保存
    this.activeScreens.set(screenId, {
      element: loadingElement,
      container: targetContainer,
      settings
    });
    
    return screenId;
  }

  /**
   * ローディング画面を非表示
   * @param {string} screenId - 画面ID
   * @param {number} delay - 遅延時間（ミリ秒）
   */
  hide(screenId, delay = 0) {
    const hideScreen = () => {
      const screen = this.activeScreens.get(screenId);
      if (screen && screen.element && screen.element.parentNode) {
        screen.element.style.opacity = '0';
        
        setTimeout(() => {
          if (screen.element && screen.element.parentNode) {
            screen.element.parentNode.removeChild(screen.element);
          }
          this.activeScreens.delete(screenId);
        }, 300);
      }
    };
    
    if (delay > 0) {
      setTimeout(hideScreen, delay);
    } else {
      hideScreen();
    }
  }

  /**
   * プログレス更新
   * @param {string} screenId - 画面ID
   * @param {number} percent - 進捗パーセント
   * @param {string} message - メッセージ
   */
  updateProgress(screenId, percent, message) {
    const screen = this.activeScreens.get(screenId);
    if (!screen) return;
    
    const progressBar = screen.element.querySelector('.unified-progress-bar');
    const messageElement = screen.element.querySelector('.unified-loading-message');
    
    if (progressBar) {
      progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
    
    if (messageElement && message) {
      messageElement.textContent = message;
    }
  }

  /**
   * クラス名を構築
   * @param {Object} settings - 設定
   * @returns {string} クラス名
   */
  buildClassName(settings) {
    const classes = ['unified-loading-screen'];
    
    // テーマクラスを追加
    const template = settings.template || settings.selectedScreenId || 'simple';
    classes.push(`theme-${template}`);
    
    return classes.join(' ');
  }

  /**
   * 動的スタイルを適用
   * @param {HTMLElement} element - 要素
   * @param {Object} settings - 設定
   */
  applyDynamicStyles(element, settings) {
    const styles = [];
    
    // 背景色
    if (settings.backgroundColor) {
      styles.push(`background: ${settings.backgroundColor}`);
    }
    
    // テキスト色
    if (settings.textColor) {
      styles.push(`color: ${settings.textColor}`);
    }
    
    if (styles.length > 0) {
      element.style.cssText += styles.join('; ');
    }
  }

  /**
   * コンテンツHTML構築
   * @param {Object} settings - 設定
   * @param {string} message - メッセージ
   * @param {boolean} showProgress - プログレスバー表示
   * @returns {string} HTML文字列
   */
  buildContent(settings, message, showProgress) {
    const parts = ['<div class="unified-loading-content">'];
    
    // ロゴ
    if (settings.logo) {
      parts.push(`<img src="${settings.logo}" alt="Loading Logo" class="unified-loading-logo">`);
    }
    
    // タイトル
    if (settings.title) {
      parts.push(`<h2 class="unified-loading-title">${this.escapeHtml(settings.title)}</h2>`);
    }
    
    // メッセージ
    const displayMessage = settings.message || message;
    parts.push(`<div class="unified-loading-message">${this.escapeHtml(displayMessage)}</div>`);
    
    // スピナー
    parts.push('<div class="unified-loading-spinner"></div>');
    
    // プログレスバー
    if (showProgress && settings.showProgress !== false) {
      parts.push(`
        <div class="unified-loading-progress">
          <div class="unified-progress-bar" style="background: ${settings.progressColor || 'currentColor'}"></div>
        </div>
      `);
    }
    
    parts.push('</div>');
    
    return parts.join('');
  }

  /**
   * HTMLエスケープ
   * @param {string} text - テキスト
   * @returns {string} エスケープされたテキスト
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * デフォルト設定取得
   * @returns {Object} デフォルト設定
   */
  getDefaultSettings() {
    return {
      template: 'simple',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      textColor: '#ffffff',
      progressColor: '#007bff',
      message: 'Loading...',
      showProgress: true,
      logo: null,
      title: null
    };
  }

  /**
   * 全てのローディング画面をクリーンアップ
   */
  cleanup() {
    this.activeScreens.forEach((screen, screenId) => {
      this.hide(screenId);
    });
    this.activeScreens.clear();
  }

  /**
   * アクティブ状態取得
   * @returns {boolean} アクティブかどうか
   */
  isActive() {
    return this.activeScreens.size > 0;
  }
}

// グローバルインスタンス
const unifiedLoadingScreen = new UnifiedLoadingScreen();

/**
 * ローディング画面設定を統合する
 * エディター設定とプロジェクト設定をマージ
 * @param {Object} projectSettings - プロジェクト設定
 * @param {Object} editorSettings - エディター設定
 * @returns {Object} 統合設定
 */
export function mergeLoadingSettings(projectSettings = {}, editorSettings = {}) {
  // エディター設定を優先してマージ
  const loadingSettings = {
    ...unifiedLoadingScreen.getDefaultSettings(),
    ...projectSettings.loadingScreen,
    ...editorSettings.loadingScreen
  };

  // スタート画面設定も統合
  const startSettings = {
    title: 'AR体験を開始',
    buttonText: '開始',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    buttonColor: '#007bff',
    buttonTextColor: '#ffffff',
    logo: null,
    ...projectSettings.startScreen,
    ...editorSettings.startScreen
  };

  return {
    loadingScreen: loadingSettings,
    startScreen: startSettings,
    merged: true
  };
}

/**
 * エディター用ローディング画面表示
 * @param {Object} options - 表示オプション
 * @returns {Promise<string>} 画面ID
 */
export async function showEditorLoadingScreen(options = {}) {
  // エディター状態から設定を取得
  let settings = unifiedLoadingScreen.getDefaultSettings();
  
  try {
    const { getEditorLoadingScreenState } = await import('./loading-screen-state.js');
    const editorState = getEditorLoadingScreenState();
    const editorSettings = editorState.getSettings();
    settings = { ...settings, ...editorSettings.loadingScreen };
  } catch (error) {
    console.warn('エディター設定の取得に失敗、デフォルト設定を使用:', error);
  }

  return unifiedLoadingScreen.show({
    settings,
    ...options
  });
}

/**
 * ビューア用ローディング画面表示
 * @param {Object} projectData - プロジェクトデータ
 * @param {Object} options - 表示オプション
 * @returns {Promise<string>} 画面ID
 */
export async function showViewerLoadingScreen(projectData = {}, options = {}) {
  // プロジェクトデータとビューア状態から設定をマージ
  let settings = unifiedLoadingScreen.getDefaultSettings();
  
  try {
    const { applyProjectLoadingSettings } = await import('./loading-screen-state.js');
    const viewerSettings = applyProjectLoadingSettings(projectData);
    settings = { ...settings, ...viewerSettings.loadingScreen };
  } catch (error) {
    console.warn('ビューア設定の適用に失敗、プロジェクト設定を使用:', error);
    settings = mergeLoadingSettings(projectData, {}).loadingScreen;
  }

  return unifiedLoadingScreen.show({
    settings,
    ...options
  });
}

// 共通API
export const unifiedLoading = {
  show: (options) => unifiedLoadingScreen.show(options),
  hide: (screenId, delay) => unifiedLoadingScreen.hide(screenId, delay),
  updateProgress: (screenId, percent, message) => unifiedLoadingScreen.updateProgress(screenId, percent, message),
  cleanup: () => unifiedLoadingScreen.cleanup(),
  isActive: () => unifiedLoadingScreen.isActive()
};

export default unifiedLoadingScreen;

// グローバル公開（フォールバック表示用にビュー側から参照できるように）
if (typeof window !== 'undefined') {
  window.__unifiedLoading = { unifiedLoading };
}