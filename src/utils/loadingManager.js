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
  customAnimation: null
};

// ローカルでのブランド設定のプリセット（データベース実装までの間の一時的なもの）
const brandPresets = {
  default: defaultSettings,
  mavon: {
    name: 'MAVON',
    subTitle: 'WebAR Experience',
    loadingMessage: 'Loading 3D model...',
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

// DOM要素
let loadingScreen;
let loadingLogo;
let loadingBrand;
let loadingSubtitle;
let loadingBar;
let loadingText;
let containerId = null;

/**
 * ローディング要素を動的に作成
 * @param {string} container - 要素を追加する親コンテナ
 */
function createLoadingElements(container) {
  // 既存の要素があれば削除（二重作成防止）
  const existingLoadingScreen = document.getElementById('loading-screen');
  if (existingLoadingScreen) {
    existingLoadingScreen.remove();
  }

  // ローディング画面のコンテナを作成
  loadingScreen = document.createElement('div');
  loadingScreen.id = 'loading-screen';
  loadingScreen.className = 'loading-screen hidden';

  // ロゴ要素
  loadingLogo = document.createElement('img');
  loadingLogo.id = 'loading-logo';
  loadingLogo.className = 'loading-logo';
  loadingLogo.alt = 'Loading Logo';

  // ブランド名要素
  loadingBrand = document.createElement('div');
  loadingBrand.id = 'loading-brand';
  loadingBrand.className = 'loading-brand';
  
  // サブタイトル要素
  loadingSubtitle = document.createElement('div');
  loadingSubtitle.id = 'loading-subtitle';
  loadingSubtitle.className = 'loading-subtitle';

  // プログレスバーコンテナ
  const loadingProgress = document.createElement('div');
  loadingProgress.id = 'loading-progress';
  loadingProgress.className = 'loading-progress';

  // プログレスバー
  loadingBar = document.createElement('div');
  loadingBar.id = 'loading-bar';
  loadingBar.className = 'loading-bar';
  loadingProgress.appendChild(loadingBar);

  // ローディングテキスト
  loadingText = document.createElement('div');
  loadingText.id = 'loading-text';
  loadingText.className = 'loading-text';

  // 要素を組み立て
  loadingScreen.appendChild(loadingLogo);
  loadingScreen.appendChild(loadingBrand);
  loadingScreen.appendChild(loadingSubtitle);
  loadingScreen.appendChild(loadingProgress);
  loadingScreen.appendChild(loadingText);

  // 親コンテナに追加
  container.appendChild(loadingScreen);
}

/**
 * ローディングマネージャーを初期化
 * @param {string} containerElementId - ローディング要素を追加する親コンテナのID
 * @returns {Object} ローディング管理用のメソッド群
 */
export async function initLoadingManager(containerElementId) {
  // コンテナIDを保存
  containerId = containerElementId;
  
  // 親コンテナを取得
  const container = document.getElementById(containerElementId);
  if (!container) {
    console.error(`コンテナID "${containerElementId}" が見つかりません`);
    return {
      showLoadingScreen: () => {},
      hideLoadingScreen: () => {},
      updateProgress: () => {}
    };
  }
  
  // ローディング要素を作成
  createLoadingElements(container);
  
  // URLからプロジェクトIDとユーザーIDを取得
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('project');
  
  try {
    let loadingSettings;
    
    // プロジェクトIDがある場合はプロジェクト固有の設定を取得
    if (projectId) {
      try {
        const response = await fetch(`/api/projects/${projectId}/loading-settings`);
        if (response.ok) {
          loadingSettings = await response.json();
        } else {
          console.warn('プロジェクト固有のローディング設定の取得に失敗しました。デフォルト設定を使用します。');
          // フォールバック: URLのbrandパラメータを使用
          const brandParam = urlParams.get('brand');
          loadingSettings = brandPresets[brandParam] || defaultSettings;
        }
      } catch (error) {
        console.error('ローディング設定の取得中にエラーが発生しました:', error);
        // フォールバック: URLのbrandパラメータを使用
        const brandParam = urlParams.get('brand');
        loadingSettings = brandPresets[brandParam] || defaultSettings;
      }
    } else {
      // プロジェクトIDがない場合はURLのbrandパラメータを使用
      const brandParam = urlParams.get('brand');
      loadingSettings = brandPresets[brandParam] || defaultSettings;
    }
    
    // 設定を適用
    applyLoadingSettings(loadingSettings);
    
  } catch (error) {
    console.error('ローディング設定の初期化に失敗しました:', error);
    // エラー時はデフォルト設定を適用
    applyLoadingSettings(defaultSettings);
  }
  
  return {
    showLoadingScreen,
    hideLoadingScreen,
    updateProgress
  };
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
    loadingLogo.src = settings.logo;
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
 * ローディング画面を表示
 */
export function showLoadingScreen() {
  if (!loadingScreen && containerId) {
    // 要素がない場合は再作成を試みる
    const container = document.getElementById(containerId);
    if (container) {
      createLoadingElements(container);
      applyLoadingSettings(defaultSettings);
    }
  }
  
  if (loadingScreen) {
    loadingScreen.classList.remove('hidden');
    
    // デフォルトのローディングメッセージを設定
    updateProgress(0, currentSettings?.loadingMessage || 'モデルを読み込んでいます...');
  }
}

/**
 * ローディング画面を非表示
 */
export function hideLoadingScreen() {
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
  }
}

/**
 * 進捗状況を更新
 * @param {number} percent - 進捗率（0-100）
 * @param {string} message - 表示メッセージ
 */
export function updateProgress(percent, message = null) {
  // 進捗バーを更新
  if (loadingBar) {
    loadingBar.style.width = `${percent}%`;
  }
  
  // メッセージがある場合は更新
  if (loadingText && message) {
    loadingText.textContent = message;
  }
}

// 現在の設定を保持する変数
let currentSettings = null;

// 設定を取得する関数
export function getLoadingSettings() {
  return currentSettings || defaultSettings;
} 