// src/utils/normalize-project.js
/**
 * プロジェクトデータを正規化してUI設定を統一する
 * レガシー形式と新形式の両方に対応し、絶対URL化も行う
 */

/**
 * プロジェクトデータを正規化
 * @param {Object} project - プロジェクトデータ
 * @param {string} baseUrl - ベースURL（project.__sourceUrl）
 * @returns {Object} - 正規化されたプロジェクトデータ
 */
export function normalizeProject(project, baseUrl = '') {
  if (!project || typeof project !== 'object') {
    return project;
  }

  // ディープクローンを作成
  const normalized = JSON.parse(JSON.stringify(project));

  // UI設定を正規化
  normalized.ui = {
    start: normalizeScreenData(normalized, 'start', baseUrl),
    loading: normalizeScreenData(normalized, 'loading', baseUrl),
    guide: normalizeScreenData(normalized, 'guide', baseUrl)
  };

  console.log('[NORMALIZE] プロジェクト正規化完了:', {
    start: normalized.ui.start,
    loading: normalized.ui.loading,
    guide: normalized.ui.guide
  });

  return normalized;
}

/**
 * 画面データを正規化
 * @param {Object} project - プロジェクトデータ
 * @param {string} screenType - 画面タイプ（start/loading/guide）
 * @param {string} baseUrl - ベースURL
 * @returns {Object} - 正規化された画面データ
 */
function normalizeScreenData(project, screenType, baseUrl) {
  const defaults = getScreenDefaults(screenType);
  
  // レガシー形式と新形式の両方をチェック
  const legacyData = project[screenType + 'Screen'] || project[screenType];
  const newData = project.ui?.[screenType];
  
  // データをマージ（新形式を優先）
  const rawData = { ...legacyData, ...newData };
  
  // 正規化
  const normalized = {
    background: normalizeUrl(rawData.background || rawData.backgroundImage, baseUrl),
    backgroundColor: rawData.backgroundColor || defaults.backgroundColor,
    title: normalizeTitle(rawData.title || rawData.titleText),
    titleColor: rawData.titleColor || rawData.textColor || defaults.titleColor,
    titleSize: normalizeNumber(rawData.titleSize || rawData.fontSize, defaults.titleSize),
    titlePosition: normalizeNumber(rawData.titlePosition || rawData.titleY, defaults.titlePosition),
    message: rawData.message || rawData.messageText || defaults.message,
    textColor: rawData.textColor || defaults.textColor,
    buttonText: rawData.buttonText || rawData.cta?.text || defaults.buttonText,
    buttonColor: rawData.buttonColor || rawData.cta?.bg || defaults.buttonColor,
    buttonTextColor: rawData.buttonTextColor || rawData.cta?.color || defaults.buttonTextColor,
    buttonPosition: normalizePosition(rawData.buttonPosition || rawData.cta?.position, defaults.buttonPosition),
    markerImage: normalizeUrl(rawData.markerImage || rawData.marker?.src, baseUrl)
  };

  // 画面タイプ固有の処理
  if (screenType === 'start') {
    // スタート画面固有の処理
  } else if (screenType === 'loading') {
    // ローディング画面固有の処理
  } else if (screenType === 'guide') {
    // ガイド画面固有の処理
  }

  return normalized;
}

/**
 * 画面のデフォルト値を取得
 * @param {string} screenType - 画面タイプ
 * @returns {Object} - デフォルト値
 */
function getScreenDefaults(screenType) {
  const commonDefaults = {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    textColor: '#ffffff',
    titleColor: '#ffffff',
    titleSize: 1.0,
    titlePosition: 40,
    message: ''
  };

  switch (screenType) {
    case 'start':
      return {
        ...commonDefaults,
        title: 'AR体験を開始',
        buttonText: '開始',
        buttonColor: '#007bff',
        buttonTextColor: '#ffffff',
        buttonPosition: { x: 50, y: 70 }
      };
    case 'loading':
      return {
        ...commonDefaults,
        message: '読み込み中...'
      };
    case 'guide':
      return {
        ...commonDefaults,
        title: 'マーカーをカメラに写してください',
        message: 'マーカーをカメラに写してください'
      };
    default:
      return commonDefaults;
  }
}

/**
 * URLを絶対URLに正規化
 * @param {string} url - 相対または絶対URL
 * @param {string} baseUrl - ベースURL
 * @returns {string} - 絶対URL
 */
function normalizeUrl(url, baseUrl) {
  if (!url) return '';
  
  // 既に絶対URLの場合はそのまま返す
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // ベースURLがない場合はそのまま返す
  if (!baseUrl) return url;
  
  // ベースURLを正規化
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  // 相対URLを絶対URLに変換
  if (url.startsWith('/')) {
    // 絶対パス
    try {
      const baseUrlObj = new URL(base);
      return `${baseUrlObj.protocol}//${baseUrlObj.host}${url}`;
    } catch {
      return url;
    }
  } else {
    // 相対パス
    return `${base}/${url}`;
  }
}

/**
 * タイトルを正規化
 * @param {string|Object} title - タイトル
 * @returns {string} - 正規化されたタイトル文字列
 */
function normalizeTitle(title) {
  if (typeof title === 'string') return title;
  if (title && typeof title === 'object' && title.text) return title.text;
  return '';
}

/**
 * 数値を正規化
 * @param {number} value - 数値
 * @param {number} defaultValue - デフォルト値
 * @returns {number} - 正規化された数値
 */
function normalizeNumber(value, defaultValue) {
  if (typeof value === 'number' && !isNaN(value)) return value;
  return defaultValue;
}

/**
 * 位置を正規化
 * @param {Object|number} position - 位置
 * @param {Object} defaultPosition - デフォルト位置
 * @returns {Object} - 正規化された位置
 */
function normalizePosition(position, defaultPosition) {
  if (position && typeof position === 'object') {
    return {
      x: normalizeNumber(position.x, defaultPosition.x),
      y: normalizeNumber(position.y, defaultPosition.y)
    };
  }
  return defaultPosition;
}

/**
 * 画像をプリロード
 * @param {string} url - 画像URL
 * @returns {Promise} - プリロード完了のPromise
 */
export function preloadImage(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      console.log('[PRELOAD] 画像プリロード成功:', url);
      resolve(img);
    };
    img.onerror = (error) => {
      console.warn('[PRELOAD] 画像プリロード失敗:', url, error);
      reject(error);
    };
    img.src = url;
  });
}

/**
 * プロジェクトの画像を一括プリロード
 * @param {Object} project - 正規化済みプロジェクトデータ
 * @returns {Promise} - プリロード完了のPromise
 */
export async function preloadProjectImages(project) {
  if (!project?.ui) return;

  const images = [];
  
  // 各画面の画像を収集
  ['start', 'loading', 'guide'].forEach(screenType => {
    const screen = project.ui[screenType];
    if (screen?.background) images.push(screen.background);
    if (screen?.markerImage) images.push(screen.markerImage);
  });

  // プリロード実行
  const preloadPromises = images.map(url => preloadImage(url));
  
  try {
    await Promise.all(preloadPromises);
    console.log('[PRELOAD] 全画像プリロード完了');
  } catch (error) {
    console.warn('[PRELOAD] 一部画像のプリロードに失敗:', error);
  }
}

// デバッグ用にグローバルに公開
if (typeof window !== 'undefined') {
  window.__normalizeProject = normalizeProject;
  window.__preloadProjectImages = preloadProjectImages;
  console.log('[NORMALIZE] デバッグAPI初期化完了: window.__normalizeProject, window.__preloadProjectImages');
}
