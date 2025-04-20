/**
 * ローディング画面を管理するユーティリティ
 */

// デフォルト設定
const defaultSettings = {
  name: 'miru-WebAR',
  subTitle: 'WebARエクスペリエンス',
  loadingMessage: 'モデルを読み込んでいます...',
  logo: '/path/to/default-logo.png',
  bgColor: 'rgba(0, 0, 0, 0.85)',
  textColor: 'white',
  accentColor: '#00a8ff',
  animationType: 'fade',
  animationSpeed: 'normal',
  fontScale: 1.0,
  fontFamily: 'Arial, sans-serif',
  customAnimation: null,
  showLogo: true,
  showBrand: true,
  showSubtitle: true,
  showProgressBar: true
};

// ローカルでのブランド設定のプリセット（データベース実装までの間の一時的なもの）
const brandPresets = {
  default: defaultSettings,
  mavon: {
    name: 'MAVON',
    subTitle: 'WebARエクスペリエンス',
    loadingMessage: '3Dモデルを読み込んでいます...',
    logo: '/path/to/mavon-logo.png',
    bgColor: 'rgba(25, 25, 35, 0.9)',
    textColor: 'white',
    accentColor: '#ff5500',
    animationType: 'fade',
    animationSpeed: 'normal',
    fontScale: 1.0
  },
  // 他のブランドを追加可能
};

// ローディング状態の定数
const LoadingState = {
  HIDDEN: 'hidden',
  SHOWING: 'showing',
  HIDING: 'hiding'
};

// グローバル変数として保存されたローディング要素の参照
let activeLoadingScreens = [];
let loadingScreen = null;
let loadingScreenPreview = null;
let loadingTimeout = null;
let containerId = null;
let currentState = LoadingState.HIDDEN;
let currentSettings = null;
// ローディング要素の参照を追加
let loadingLogo = null;
let loadingBrand = null;
let loadingSubtitle = null;
let loadingBar = null;
let loadingText = null;

// プライベート変数（モジュール内でのみアクセス可能）
let _activeLoaders = new Map();
let _counter = 0;

/**
 * 非常にシンプルなローディング画面を表示
 * @param {Object} options 設定オプション
 * @returns {string} ローダーID
 */
function showLoading(options = {}) {
  const id = options.id || `simple-loader-${_counter++}`;
  const message = options.message || 'Loading...';
  
  // 既存のローダーをクリーンアップ
  if (_activeLoaders.has(id)) {
    hideLoading(id);
  }
  
  // 新しいローダー要素を作成
  const loader = document.createElement('div');
  loader.id = id;
  loader.setAttribute('data-component-type', 'simple-app-loader');
  
  // インラインスタイルを使用（CSSクラス競合を避ける）
  Object.assign(loader.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '9999',
    fontFamily: 'Arial, sans-serif',
    transition: 'opacity 0.1s ease-out'
  });
  
  // シンプルなHTMLコンテンツ
  loader.innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:24px;margin-bottom:10px;">Loading</div>
      <div style="width:200px;height:4px;background:rgba(255,255,255,0.2);border-radius:2px;margin:10px auto;">
        <div class="progress-bar" style="width:0%;height:100%;background:#00a8ff;transition:width 0.3s;"></div>
      </div>
      <div class="message" style="font-size:14px;margin-top:10px;">${message}</div>
    </div>
  `;
  
  // DOMに追加
  document.body.appendChild(loader);
  
  // 活性ローダーとして登録
  _activeLoaders.set(id, loader);
  
  console.log(`[SimpleLoader] ローダー "${id}" を表示しました`);
  return id;
}

/**
 * ローディング画面を非表示
 * @param {string} id ローダーID
 * @param {number} delay ミリ秒単位の遅延（デフォルト：0ms）
 */
function hideLoading(id, delay = 0) {
  if (!id && _activeLoaders.size > 0) {
    // IDが指定されていない場合は最後に作成されたローダーを使用
    id = Array.from(_activeLoaders.keys()).pop();
  }
  
  if (!_activeLoaders.has(id)) return;
  
  const loader = _activeLoaders.get(id);
  
  const hide = () => {
    // フェードアウト
    loader.style.opacity = '0';
    
    // 完全に削除（短い遅延後）
    setTimeout(() => {
      if (loader.parentNode) {
        loader.parentNode.removeChild(loader);
        console.log(`[SimpleLoader] ローダー "${id}" を削除しました`);
      }
      _activeLoaders.delete(id);
    }, 100); // 短い遅延（トランジション終了を待つ）
  };
  
  if (delay > 0) {
    setTimeout(hide, delay);
  } else {
    hide();
  }
}

/**
 * ローディング進捗を更新
 * @param {string} id ローダーID
 * @param {number} percent 進捗率（0-100）
 * @param {string} message 表示メッセージ
 */
function updateLoadingProgress(id, percent, message) {
  if (!_activeLoaders.has(id)) return;
  
  const loader = _activeLoaders.get(id);
  const progressBar = loader.querySelector('.progress-bar');
  const messageEl = loader.querySelector('.message');
  
  if (progressBar) {
    progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  }
  
  if (messageEl && message) {
    messageEl.textContent = message;
  }
}

/**
 * すべてのローディング画面をクリーンアップ
 */
function cleanupAllLoaders() {
  console.log(`[SimpleLoader] ${_activeLoaders.size}個のローダーをクリーンアップします`);
  
  _activeLoaders.forEach((loader, id) => {
    if (loader.parentNode) {
      loader.parentNode.removeChild(loader);
    }
  });
  
  _activeLoaders.clear();
  
  // さらに、念のため属性セレクタで検索
  const remainingLoaders = document.querySelectorAll('[data-component-type="simple-app-loader"]');
  remainingLoaders.forEach(el => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });
}

// 互換性のための旧インターフェース
const loadingManager = {
  show: showLoading,
  hide: hideLoading,
  updateProgress: updateLoadingProgress,
  cleanup: cleanupAllLoaders
};

// ページ遷移時などのクリーンアップ
window.addEventListener('beforeunload', () => {
  try {
    cleanupAllLoaders();
  } catch (error) {
    console.error('Cleanup error during unload:', error);
  }
});

/**
 * ローディング要素を動的に作成
 * @param {string} container - 要素を追加する親コンテナ
 */
function createLoadingElements(container) {
  // 既存の要素を完全にクリーンアップ
  cleanupAllLoaders();
  
  // ローディング画面のコンテナを作成
  loadingScreen = document.createElement('div');
  loadingScreen.id = 'app-loading-screen';
  loadingScreen.className = 'app-loading-screen hidden';
  loadingScreen.setAttribute('data-loading-id', container.id);
  loadingScreen.style.display = 'none';

  // ロゴ要素
  loadingLogo = document.createElement('div');
  loadingLogo.className = 'app-loading-logo';
  loadingScreen.appendChild(loadingLogo);

  // ブランド要素
  loadingBrand = document.createElement('div');
  loadingBrand.className = 'app-loading-brand';
  loadingScreen.appendChild(loadingBrand);

  // サブタイトル要素
  loadingSubtitle = document.createElement('div');
  loadingSubtitle.className = 'app-loading-subtitle';
  loadingScreen.appendChild(loadingSubtitle);

  // プログレスバー要素
  loadingBar = document.createElement('div');
  loadingBar.className = 'app-loading-progress';
  loadingScreen.appendChild(loadingBar);

  // テキスト要素
  loadingText = document.createElement('div');
  loadingText.className = 'app-loading-text';
  loadingScreen.appendChild(loadingText);

  // 親コンテナに追加
  container.appendChild(loadingScreen);
  containerId = container.id;
  activeLoadingScreens.push(loadingScreen);
}

/**
 * ローディング要素のクリーンアップを実行する関数
 * @returns {Promise<void>}
 */
async function cleanupLoadingElements() {
  console.log('ローディング要素のクリーンアップを実行');
  const selectors = [
    '.loading-screen',
    '.loading-screen-preview',
    '.app-loading-screen',
    '[class*="loading-"]'
  ];
  
  const cleanupPromises = selectors.map(selector => {
    return new Promise((resolve) => {
      document.querySelectorAll(selector).forEach(el => {
        if (el && el.parentNode) {
          try {
            el.style.transition = 'none';
            el.style.opacity = '0';
            el.style.visibility = 'hidden';
            el.parentNode.removeChild(el);
            console.log(`要素を削除しました: ${selector}`);
          } catch (e) {
            console.warn(`要素削除エラー(${selector}):`, e);
          }
        }
      });
      resolve();
    });
  });

  await Promise.all(cleanupPromises);
}

/**
 * ローディングマネージャーのクリーンアップ
 * @returns {Promise<void>}
 */
async function cleanupLoadingManager() {
  try {
    console.log('ローディングマネージャーのクリーンアップを開始します');
    
    // タイムアウトをクリア
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      loadingTimeout = null;
    }

    // アクティブなローディング画面を非表示にして削除
    const cleanupPromises = activeLoadingScreens.map(screen => {
      return new Promise((resolve) => {
        if (screen && screen.parentNode) {
          screen.style.opacity = '0';
          screen.style.visibility = 'hidden';
          
          setTimeout(() => {
            if (screen && screen.parentNode) {
              screen.parentNode.removeChild(screen);
              console.log('ローディング画面を削除しました');
            }
            resolve();
          }, 300);
        } else {
          resolve();
        }
      });
    });

    // すべてのクリーンアップ処理を実行
    await Promise.all([
      ...cleanupPromises,
      cleanupLoadingElements()
    ]);

    // 参照をクリア
    activeLoadingScreens = [];
    loadingScreen = null;
    loadingScreenPreview = null;
    currentState = LoadingState.HIDDEN;
    
    console.log('ローディングマネージャーのクリーンアップが完了しました');
  } catch (error) {
    console.error('ローディングマネージャーのクリーンアップ中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * ローディングマネージャーを初期化
 * @param {string} containerElementId - ローディング画面を表示するコンテナのID
 * @returns {Promise<Object>} ローディング画面の制御オブジェクト
 */
async function initLoadingManager(containerElementId) {
  try {
    // クリーンアップ処理を登録
    window.addEventListener('unload', () => {
      cleanupLoadingManager().catch(error => {
        console.error('Cleanup error during unload:', error);
      });
    });

    // WebSocket接続の監視を追加
    window.addEventListener('online', () => {
      console.log('ネットワーク接続が復帰しました。WebSocket再接続を試みます...');
      if (typeof import.meta.hot !== 'undefined') {
        import.meta.hot.send('vite:reconnect');
      }
    });

    window.addEventListener('offline', () => {
      console.warn('ネットワーク接続が切断されました。');
    });

    containerId = containerElementId;

    // URLからプロジェクトIDとユーザーIDを取得
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project');
    
    let loadingSettings;
    
    // プロジェクトIDがある場合はプロジェクト固有の設定を取得
    if (projectId) {
      try {
        const response = await fetch(`/api/projects/${projectId}/loading-settings`);
        if (response.ok) {
          loadingSettings = await response.json();
        } else {
          console.warn('プロジェクト固有のローディング設定の取得に失敗しました。デフォルト設定を使用します。');
          const brandParam = urlParams.get('brand');
          loadingSettings = brandPresets[brandParam] || defaultSettings;
        }
      } catch (error) {
        console.error('ローディング設定の取得中にエラーが発生しました:', error);
        const brandParam = urlParams.get('brand');
        loadingSettings = brandPresets[brandParam] || defaultSettings;
      }
    } else {
      const brandParam = urlParams.get('brand');
      loadingSettings = brandPresets[brandParam] || defaultSettings;
    }
    
    // 設定を適用
    applyLoadingSettings(loadingSettings);
    
    // 現在の設定を保存
    currentSettings = loadingSettings;

    return {
      showLoadingScreen,
      hideLoadingScreen,
      updateProgress,
      getLoadingState,
      cleanup: cleanupLoadingManager
    };
  } catch (error) {
    console.error('ローディングマネージャーの初期化に失敗しました:', error);
    applyLoadingSettings(defaultSettings);
    currentSettings = defaultSettings;
    throw error;
  }
}

/**
 * ローディング画面を表示
 */
function showLoadingScreen() {
  // 進行中のタイマーをクリア
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
    loadingTimeout = null;
  }

  // 既に表示中の場合は何もしない
  if (currentState === LoadingState.SHOWING) {
    return;
  }

  if (!loadingScreen) {
    if (containerId) {
      const container = document.getElementById(containerId);
      if (container) {
        createLoadingElements(container);
        applyLoadingSettings(currentSettings || defaultSettings);
      }
    }
  }
  
  if (loadingScreen) {
    currentState = LoadingState.SHOWING;
    loadingScreen.style.display = 'flex';
    loadingScreen.style.opacity = '1';
    loadingScreen.style.pointerEvents = 'auto';
    loadingScreen.classList.remove('hidden');
    
    // デフォルトのローディングメッセージを設定
    if (currentSettings && currentSettings.loadingMessage) {
      updateProgress(0, currentSettings.loadingMessage);
    } else {
      updateProgress(0, 'モデルを読み込んでいます...');
    }
  }
}

/**
 * ローディング画面を非表示
 */
function hideLoadingScreen() {
  if (!loadingScreen || currentState === LoadingState.HIDDEN) return;
  
  // 進行中のタイマーをクリア
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
  }
  
  currentState = LoadingState.HIDING;
  loadingScreen.style.opacity = '0';
  loadingScreen.style.pointerEvents = 'none';
  loadingScreen.classList.add('hidden');
  
  loadingTimeout = setTimeout(() => {
    if (loadingScreen && currentState === LoadingState.HIDING) {
      // ローディング画面を完全に削除
      if (loadingScreen.parentNode) {
        loadingScreen.parentNode.removeChild(loadingScreen);
        loadingScreen = null;
      }
      currentState = LoadingState.HIDDEN;
    }
    loadingTimeout = null;
  }, 300);
}

/**
 * 進捗状況を更新
 * @param {number} percent - 進捗率（0-100）
 * @param {string} message - 表示メッセージ
 */
function updateProgress(percent, message = null) {
  if (loadingBar) {
    loadingBar.style.width = `${percent}%`;
  }
  if (loadingText && message) {
    loadingText.textContent = message;
  }
}

/**
 * ローディング設定を適用
 * @param {Object} settings - ローディング画面の設定
 */
function applyLoadingSettings(settings) {
  if (!settings) {
    settings = defaultSettings;
  }
  
  // ロゴと名前を設定
  if (loadingLogo && settings.logo) {
    loadingLogo.style.display = 'block';
  } else if (loadingLogo) {
    loadingLogo.style.display = 'none';
  }
  
  if (loadingBrand && settings.name) {
    loadingBrand.textContent = settings.name;
  }
  
  if (loadingSubtitle && settings.subTitle) {
    loadingSubtitle.textContent = settings.subTitle;
    loadingSubtitle.style.display = 'block';
  } else if (loadingSubtitle) {
    loadingSubtitle.style.display = 'none';
  }
  
  // スタイルを適用
  if (loadingScreen) {
    loadingScreen.style.backgroundColor = settings.bgColor || defaultSettings.bgColor;
  }
  
  if (loadingBrand) {
    loadingBrand.style.color = settings.textColor || defaultSettings.textColor;
  }
  
  if (loadingSubtitle) {
    loadingSubtitle.style.color = settings.textColor || defaultSettings.textColor;
  }
  
  if (loadingText) {
    loadingText.style.color = settings.textColor || defaultSettings.textColor;
  }
  
  if (loadingBar) {
    loadingBar.style.backgroundColor = settings.accentColor || defaultSettings.accentColor;
  }
  
  // フォントスケールを適用
  const fontScale = settings.fontScale || 1.0;
  if (loadingBrand) {
    loadingBrand.style.fontSize = `${24 * fontScale}px`;
  }
  
  if (loadingSubtitle) {
    loadingSubtitle.style.fontSize = `${16 * fontScale}px`;
  }
  
  if (loadingText) {
    loadingText.style.fontSize = `${14 * fontScale}px`;
  }
  
  // フォントファミリーを適用
  const fontFamily = settings.fontFamily || defaultSettings.fontFamily;
  if (loadingBrand) {
    loadingBrand.style.fontFamily = fontFamily;
  }
  if (loadingSubtitle) {
    loadingSubtitle.style.fontFamily = fontFamily;
  }
  if (loadingText) {
    loadingText.style.fontFamily = fontFamily;
  }
  
  // アニメーション速度を適用
  if (loadingScreen) {
    loadingScreen.classList.remove('animation-slow', 'animation-normal', 'animation-fast');
    loadingScreen.classList.add(`animation-${settings.animationSpeed || 'normal'}`);
  }
  
  // アニメーションタイプを適用
  if (loadingScreen) {
    // 既存のアニメーションクラスを削除
    loadingScreen.classList.remove(
      'fade-animation', 
      'slide-animation', 
      'zoom-animation',
      'pulse-animation',
      'bounce-animation',
      'spin-animation',
      'wave-animation',
      'custom-animation'
    );
    
    // 新しいアニメーションクラスを追加
    const animationType = settings.animationType || 'fade';
    
    // カスタムアニメーションの場合
    if (animationType === 'custom' && settings.customAnimation) {
      loadingScreen.classList.add('custom-animation');
      
      // カスタムアニメーションの種類に応じた処理
      const fileType = typeof settings.customAnimation === 'string' 
        ? settings.customAnimation.split('.').pop().toLowerCase() 
        : null;
        
      if (fileType === 'json') {
        // Lottieアニメーションの処理（シンプルな例として、背景に適用）
        console.log('Lottieアニメーションは将来的に実装予定');
      } else if (fileType === 'gif' || fileType === 'svg') {
        // 画像ベースのアニメーション - 将来的に実装
        console.log('GIF/SVGアニメーションは将来的に実装予定');
      }
    } else {
      // プリセットアニメーション
      loadingScreen.classList.add(`${animationType}-animation`);
    }
  }
}

/**
 * 現在のローディング状態を取得
 */
function getLoadingState() {
  return currentState;
}

const cleanup = () => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Starting loading manager cleanup...');
      
      // タイムアウトをクリア
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
      }
      
      // アクティブなローディング画面を削除
      if (activeLoadingScreens.size > 0) {
        activeLoadingScreens.forEach((screen, id) => {
          if (screen && screen.parentNode) {
            screen.style.transition = 'none';
            screen.style.opacity = '0';
            screen.style.visibility = 'hidden';
            screen.parentNode.removeChild(screen);
            console.log(`Removed loading screen: ${id}`);
          }
        });
        activeLoadingScreens.clear();
      }
      
      // 追加のローディング要素を削除
      const selectors = [
        '.loading-screen',
        '.loading-screen-preview',
        '.app-loading-screen',
        '[class*="loading-"]'
      ];
      
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          if (el && el.parentNode) {
            el.style.transition = 'none';
            el.style.opacity = '0';
            el.style.visibility = 'hidden';
            el.parentNode.removeChild(el);
            console.log(`Removed element with selector: ${selector}`);
          }
        });
      });
      
      // 状態をリセット
      currentState = 'idle';
      loadingProgress = 0;
      
      console.log('Loading manager cleanup completed');
      resolve();
    } catch (error) {
      console.error('Error during loading manager cleanup:', error);
      reject(error);
    }
  });
};

// 外部に公開する関数
export {
  showLoading,
  hideLoading,
  updateLoadingProgress,
  cleanupAllLoaders,
  loadingManager,
  cleanupLoadingManager,
  initLoadingManager,
  showLoadingScreen,
  hideLoadingScreen,
  cleanup,
  getLoadingState
}; 