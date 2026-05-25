// src/utils/apply-project-design.js
/**
 * project.jsonのデザイン設定を確実にDOMに反映する
 * start/loading/guideの値を直接適用し、デフォルトUIへのフォールバックを防ぐ
 */

import { DEV_VERBOSE_LOGS, DEV_APPLY_OVERRIDE } from '../config/feature-flags.js';
import { extractDesign } from './design-extractor.js';

const log = (...args) => {
  if (DEV_VERBOSE_LOGS) {
    console.info('[APPLY]', ...args);
  }
};

// 適用済みログの重複防止用Set
const appliedScreens = new Set();

/**
 * 画像をプリロード
 * @param {string} url - 画像URL
 * @returns {Promise} - プリロード完了のPromise
 */
function preloadImage(url) {
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
 * 相対パスを絶対パスに変換
 * @param {string} url - URL
 * @param {string} baseUrl - ベースURL
 * @returns {string} - 絶対URL
 */
function resolveUrl(url, baseUrl) {
  if (!url) return url;
  // 既に絶対URLまたはdata/blob URLの場合はそのまま
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  // ルートからの相対パス
  if (url.startsWith('/')) {
    return new URL(url, location.origin).href;
  }
  // プロジェクトフォルダからの相対パス
  if (baseUrl) {
    try {
      const projectFolder = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
      return new URL(url, projectFolder).href;
    } catch {
      return url;
    }
  }
  return url;
}

/**
 * プロジェクトデザインをDOMに適用
 * @param {Object} project - 正規化済みのproject.json
 * @param {Object} options - 適用オプション
 * @param {string} options.screen - 特定の画面のみ適用（start/loading/guide）
 * @param {string} options.container - コンテナID（デフォルト: #webar-ui）
 */
export function applyProjectDesign(project, options = {}) {
  if (!project) {
    console.warn('[APPLY] project is null/undefined');
    return;
  }

  const { screen, container = '#webar-ui' } = options;
  const baseUrl = project.__sourceUrl || location.href;

  // コンテナの存在確認
  const containerElement = document.querySelector(container) || document.getElementById('webar-ui') || document.body;
  if (!containerElement) {
    console.warn('[APPLY] コンテナが見つかりません:', container);
    return;
  }

  // プロジェクトのスキーマ差異を吸収して正規化
  const { startScreen, loadingScreen, guideScreen } = extractDesign(project);

  // 画像URLを絶対パスに解決
  if (startScreen) {
    if (startScreen.backgroundImage) startScreen.backgroundImage = resolveUrl(startScreen.backgroundImage, baseUrl);
    if (startScreen.background) startScreen.background = resolveUrl(startScreen.background, baseUrl);
    if (startScreen.logo) startScreen.logo = resolveUrl(startScreen.logo, baseUrl);
  }
  if (loadingScreen) {
    if (loadingScreen.background) loadingScreen.background = resolveUrl(loadingScreen.background, baseUrl);
    if (loadingScreen.logo) loadingScreen.logo = resolveUrl(loadingScreen.logo, baseUrl);
    if (loadingScreen.image) loadingScreen.image = resolveUrl(loadingScreen.image, baseUrl);
  }
  if (guideScreen) {
    if (guideScreen.background) guideScreen.background = resolveUrl(guideScreen.background, baseUrl);
    if (guideScreen.markerImage) guideScreen.markerImage = resolveUrl(guideScreen.markerImage, baseUrl);
    if (guideScreen.marker?.src) guideScreen.marker.src = resolveUrl(guideScreen.marker.src, baseUrl);
  }
  
  // プロジェクトに正規化されたUIデータを追加
  if (!project.ui) {
    project.ui = {
      start: startScreen,
      loading: loadingScreen,
      guide: guideScreen
    };
  }

  log('プロジェクトデザイン適用開始', {
    screen,
    container,
    start: startScreen,
    loading: loadingScreen,
    guide: guideScreen
  });

  // 特定画面のみ適用
  if (screen) {
    applyScreenDesign(screen, project, containerElement);
    return;
  }

  // 全画面適用
  if (startScreen) {
    applyScreenDesign('start', project, containerElement);
  }

  if (loadingScreen) {
    applyScreenDesign('loading', project, containerElement);
  }

  if (guideScreen) {
    applyScreenDesign('guide', project, containerElement);
  }

  log('プロジェクトデザイン適用完了');
}

/**
 * 特定画面のデザインを適用
 * @param {string} screenType - 画面タイプ
 * @param {Object} project - プロジェクトデータ
 * @param {HTMLElement} container - コンテナ要素
 */
function applyScreenDesign(screenType, project, container) {
  const legacyIdMap = {
    start: 'ar-start-screen',
    loading: 'ar-loading-screen',
    guide: 'ar-guide-screen'
  };
  const screenElement =
    container.querySelector(`[data-screen="${screenType}"]`) ||
    container.querySelector(`#${legacyIdMap[screenType]}`) ||
    document.getElementById(legacyIdMap[screenType]);
  if (!screenElement) {
    console.warn(`[APPLY] data-screen="${screenType}" が見つかりません`);
    return;
  }

  // 画面タイプに応じて適用
  switch (screenType) {
    case 'start':
      applyStartScreen(project.ui?.start, screenElement);
      break;
    case 'loading':
      applyLoadingScreen(project.ui?.loading, screenElement);
      break;
    case 'guide':
      applyGuideScreen(project.ui?.guide, screenElement);
      break;
  }

  // 適用済み管理（ログはshowScreen側に集約）
  if (!appliedScreens.has(screenType)) {
    appliedScreens.add(screenType);
  }
}

/**
 * スタート画面の適用
 */
function applyStartScreen(start, screenElement) {
  if (!start) {
    console.warn('[APPLY] start設定がありません');
    return;
  }

  log('スタート画面適用:', start);

  // 画像をプリロード
  if (start.background) {
    try {
      preloadImage(start.background);
    } catch (error) {
      console.warn('[APPLY] 背景画像プリロード失敗:', error);
    }
  }

  // 統合ビューア存在チェック（重複UI防止）
  // - 統合ビューアでは #ar-start-cta（既存CTA）を使用し、
  //   追加のボタンは生成しない。
  const hasIntegratedMarkup =
    !!document.querySelector('.integrated-ar-viewer') ||
    !!screenElement.querySelector('#ar-start-cta') ||
    !!screenElement.querySelector('[data-role="start-button"]') ||
    !!screenElement.querySelector('#ar-start-btn');

  // 背景画像（スコープ: #webar-ui [data-screen="start"]）
  const startBg = start.background || start.backgroundImage;
  if (startBg) {
    screenElement.style.setProperty('background-image', `url("${startBg}")`, 'important');
    screenElement.style.setProperty('background-size', 'cover', 'important');
    screenElement.style.setProperty('background-position', 'center', 'important');
    log('背景画像適用:', startBg);
  }

  // 背景色
  if (start.backgroundColor) {
    screenElement.style.setProperty('background-color', start.backgroundColor, 'important');
    log('背景色適用:', start.backgroundColor);
  }

  // タイトル
  let titleElement = screenElement.querySelector('#ar-start-title');
  if (!titleElement) {
    // なければ作成
    titleElement = document.createElement('h1');
    titleElement.id = 'ar-start-title';
    titleElement.style.position = 'absolute';
    titleElement.style.width = '100%';
    titleElement.style.textAlign = 'center';
    titleElement.style.margin = '0';
    titleElement.style.padding = '0 20px';
    titleElement.style.zIndex = '10';
    screenElement.appendChild(titleElement);
  }

  if (start.title) {
    titleElement.textContent = start.title;
    log('タイトル適用:', start.title);
  }

  // タイトル位置（%）
  // 統合ビューアが存在する場合は、レイアウトはビューア側の
  // layoutStartScreen() に委譲し、ここでは位置変更を行わない。
  if ((DEV_APPLY_OVERRIDE || !hasIntegratedMarkup) && typeof start.titlePosition === 'number') {
    const pos = Math.max(5, Math.min(90, start.titlePosition));
    titleElement.style.setProperty('top', `${pos}%`, 'important');
    titleElement.style.setProperty('transform', 'translateY(-50%)', 'important');
    log('タイトル位置適用:', `${pos}%`);
  }

  // タイトルサイズ（倍率）
  if ((DEV_APPLY_OVERRIDE || !hasIntegratedMarkup) && typeof start.titleSize === 'number') {
    const size = Math.max(0.5, Math.min(3.0, start.titleSize));
    const baseSize = 32; // ベースフォントサイズ（px）
    const computedSize = baseSize * size;
    titleElement.style.setProperty('font-size', `${computedSize}px`, 'important');
    log('タイトルサイズ適用:', `${computedSize}px (倍率: ${size})`);
  }

  // タイトル色
  const titleColor = start.titleColor || start.textColor;
  if (titleColor) {
    titleElement.style.setProperty('color', titleColor, 'important');
    log('タイトル色適用:', titleColor);
  }

  // ボタン（開始ボタン）
  // 優先度:
  //   1) 統合ビューアの #ar-start-cta / data-role="start-button" / #ar-start-btn を使用
  //   2) 既存の #ar-start-button（レガシー）
  //   3) 何も無ければ #ar-start-button を新規作成（レガシー互換）
  let buttonElement =
    screenElement.querySelector('#ar-start-cta') ||
    screenElement.querySelector('[data-role="start-button"]') ||
    screenElement.querySelector('#ar-start-btn') ||
    screenElement.querySelector('#ar-start-button');
  if (!buttonElement) {
    buttonElement = document.createElement('button');
    buttonElement.id = 'ar-start-button';
    buttonElement.style.position = 'absolute';
    buttonElement.style.left = '50%';
    buttonElement.style.transform = 'translateX(-50%)';
    buttonElement.style.padding = '16px 48px';
    buttonElement.style.fontSize = '18px';
    buttonElement.style.border = 'none';
    buttonElement.style.borderRadius = '8px';
    buttonElement.style.cursor = 'pointer';
    buttonElement.style.zIndex = '10';
    screenElement.appendChild(buttonElement);
    log('開始ボタンを新規作成: #ar-start-button');
  } else {
    log('既存の開始ボタンを使用:', `#${buttonElement.id || buttonElement.getAttribute('id') || 'unknown'}`);
  }

  if (start.buttonText) {
    buttonElement.textContent = start.buttonText;
  }

  if (start.buttonColor) {
    buttonElement.style.setProperty('background-color', start.buttonColor, 'important');
  }

  if (start.buttonTextColor) {
    buttonElement.style.setProperty('color', start.buttonTextColor, 'important');
  }

  // ボタン位置（%またはpx）
  if (start.buttonPosition && (DEV_APPLY_OVERRIDE || !hasIntegratedMarkup)) {
    const { x, y } = start.buttonPosition;
    if (typeof x === 'number') {
      const leftVal = x <= 1 ? `${x * 100}%` : `${x}${x < 10 ? '%' : 'px'}`;
      buttonElement.style.setProperty('left', leftVal, 'important');
      buttonElement.style.setProperty('transform', 'translateX(-50%)', 'important');
    }
    if (typeof y === 'number') {
      const topVal = y <= 1 ? `${y * 100}%` : `${y}${y < 10 ? '%' : 'px'}`;
      buttonElement.style.setProperty('top', topVal, 'important');
      buttonElement.style.setProperty('position', 'absolute', 'important');
    }
  }

  // ロゴ
  const startLogo = screenElement.querySelector('#ar-start-logo');
  if (startLogo) {
        if (start.logo) {
      try { preloadImage(start.logo); } catch {}
      startLogo.src = start.logo;
      startLogo.style.setProperty('display', 'block', 'important');
      if (typeof start.logoPosition === 'number') {
        const lp = Math.max(0, Math.min(100, start.logoPosition));
        startLogo.style.setProperty('position', 'absolute', 'important');
        startLogo.style.setProperty('top', `${lp}%`, 'important');
        startLogo.style.setProperty('left', '50%', 'important');
        startLogo.style.setProperty('transform', 'translate(-50%,-50%)', 'important');
      }
      if (typeof start.logoSize === 'number') {
        const scale = Math.max(0.25, Math.min(3, start.logoSize));
        startLogo.style.setProperty('transform', `translate(-50%,-50%) scale(${scale})`, 'important');
        startLogo.style.setProperty('transform-origin', 'center', 'important');
      }
    } else {
      startLogo.style.setProperty('display', 'none', 'important');
    }
  }

  // 位置やサイズは統合ビューアが制御するため、ここでは触らない
  // （JSDOM等で統合ビューアが無い場合は既存のレガシー挙動を維持）
}

/**
 * ローディング画面の適用
 */
function applyLoadingScreen(loading, screenElement) {
  if (!loading) {
    console.warn('[APPLY] loading設定がありません');
    return;
  }

  log('ローディング画面適用:', loading);

  // 画像をプリロード
  if (loading.background) {
    try {
      preloadImage(loading.background);
    } catch (error) {
      console.warn('[APPLY] 背景画像プリロード失敗:', error);
    }
  }

  // 背景画像
  if (loading.background) {
    screenElement.style.setProperty('background-image', `url("${loading.background}")`, 'important');
    screenElement.style.setProperty('background-size', 'cover', 'important');
    screenElement.style.setProperty('background-position', 'center', 'important');
    log('背景画像適用:', loading.background);
  }

  // 画像（ロゴ/イメージ）。logoType が 'none' の場合は logo/image 自体が
  // 空になるため、ここでの明示的な抑制は不要。
  const loadingImgSrc = loading.image || loading.logo;
  if (loadingImgSrc) {
    // 統合ビューアの既存ロゴ要素を優先し、無ければ生成する
    let imgElement =
      screenElement.querySelector('#ar-loading-logo') ||
      screenElement.querySelector('#ar-loading-image');
    if (!imgElement) {
      imgElement = document.createElement('img');
      imgElement.id = 'ar-loading-image';
      imgElement.style.maxWidth = '80%';
      imgElement.style.maxHeight = '200px';
      imgElement.style.marginBottom = '20px';
      screenElement.appendChild(imgElement);
    }
    try { preloadImage(loadingImgSrc); } catch {}
    imgElement.src = loadingImgSrc;
    imgElement.style.setProperty('display', 'block', 'important');
    log('ローディング画像適用:', loadingImgSrc);
  }

  // 見出し（ブランド名 / サブタイトル）
  const heading = loading.brandName || loading.subTitle;
  if (heading) {
    const titleElement = screenElement.querySelector('#ar-loading-title');
    if (titleElement) {
      titleElement.textContent = heading;
      log('ローディング見出し適用:', heading);
    }
  }

  // メッセージ（loadingMessage / message のどちらでも反映）
  const loadingMsg = loading.message || loading.loadingMessage;
  if (loadingMsg) {
    let msgElement = screenElement.querySelector('#ar-loading-message');
    if (!msgElement) {
      msgElement = document.createElement('p');
      msgElement.id = 'ar-loading-message';
      msgElement.style.fontSize = '18px';
      msgElement.style.color = '#ffffff';
      msgElement.style.margin = '10px 0';
      screenElement.appendChild(msgElement);
    }
    msgElement.textContent = loadingMsg;
    log('ローディングメッセージ適用:', loadingMsg);
  }

  // 背景色
  if (loading.backgroundColor) {
    screenElement.style.setProperty('background-color', loading.backgroundColor, 'important');
  }

  // テキスト色
  if (loading.textColor) {
    screenElement.style.setProperty('color', loading.textColor, 'important');
  }
}

/**
 * ガイド画面の適用
 */
function applyGuideScreen(guide, screenElement) {
  if (!guide) {
    console.warn('[APPLY] guide設定がありません');
    return;
  }

  log('ガイド画面適用:', guide);

  // 画像をプリロード
  if (guide.background) {
    try {
      preloadImage(guide.background);
    } catch (error) {
      console.warn('[APPLY] 背景画像プリロード失敗:', error);
    }
  }

  if (guide.markerImage) {
    try {
      preloadImage(guide.markerImage);
    } catch (error) {
      console.warn('[APPLY] マーカー画像プリロード失敗:', error);
    }
  }

  // 背景画像
  // 注意: ガイド画面はカメラ映像の上に重ねるオーバーレイ。
  // 背景画像で覆うとカメラが見えなくなり AR スキャンができないため、ここでは適用しない。
  // 必要なら個別UI要素（マーカー枠など）の意匠で表現する。

  // ガイド画像（プロジェクト編集画面でアップロードしたマーカー画像）
  // 統合ビューアでは #ar-guide-image が実体の <img> 要素。
  // #ar-guide-marker は <div> ラッパー（中に #ar-guide-marker-image）なので
  // ここに .src を設定しても表示されない。必ず <img> 要素にセットすること。
  const markerSrc = guide.markerImage || guide.marker?.src || guide.image;
  if (markerSrc) {
    try { preloadImage(markerSrc); } catch {}
    const guideImg = screenElement.querySelector('#ar-guide-image');
    if (guideImg) {
      guideImg.src = markerSrc;
      guideImg.style.setProperty('display', 'block', 'important');
      log('ガイド画像適用 (#ar-guide-image):', markerSrc);
    } else {
      // 統合ビューア以外のレイアウト用フォールバック: <img>を生成
      let fallbackImg = screenElement.querySelector('#ar-guide-fallback-image');
      if (!fallbackImg) {
        fallbackImg = document.createElement('img');
        fallbackImg.id = 'ar-guide-fallback-image';
        fallbackImg.style.maxWidth = '60%';
        fallbackImg.style.maxHeight = '300px';
        fallbackImg.style.marginBottom = '20px';
        fallbackImg.style.border = '2px solid #ffffff';
        fallbackImg.style.borderRadius = '8px';
        screenElement.appendChild(fallbackImg);
      }
      fallbackImg.src = markerSrc;
      fallbackImg.style.setProperty('display', 'block', 'important');
      log('ガイド画像適用 (fallback):', markerSrc);
    }
  }

  // タイトル/説明/メッセージ
  if (guide.title) {
    let t = screenElement.querySelector('#ar-guide-title');
    if (t) t.textContent = guide.title;
  }
  if (guide.description) {
    let d = screenElement.querySelector('#ar-guide-description');
    if (d) d.textContent = guide.description;
  }
  if (guide.message) {
    let msgElement = screenElement.querySelector('#ar-guide-message');
    if (!msgElement) {
      msgElement = document.createElement('p');
      msgElement.id = 'ar-guide-message';
      msgElement.style.fontSize = '18px';
      msgElement.style.color = '#ffffff';
      msgElement.style.margin = '10px 0';
      msgElement.style.textAlign = 'center';
      screenElement.appendChild(msgElement);
    }
    msgElement.textContent = guide.message;
    log('ガイドメッセージ適用:', guide.message);
  }

  // 背景色
  // 注意: ガイド画面はカメラ映像の上に重ねるオーバーレイ。
  // 背景色で覆うとカメラが見えなくなり AR スキャンができないため、ここでは適用しない。

  // テキスト色
  if (guide.textColor) {
    screenElement.style.setProperty('color', guide.textColor, 'important');
  }
}

/**
 * 適用統計情報を取得
 * @returns {Object} - 適用統計情報
 */
export function getApplyStats() {
  return {
    appliedScreens: Array.from(appliedScreens),
    timestamp: Date.now()
  };
}

// デバッグ用にグローバルに公開（即座に実行）
if (typeof window !== 'undefined') {
  window.__applyStats = getApplyStats;
  console.log('[APPLY] デバッグAPI初期化完了: window.__applyStats');
}

export default applyProjectDesign;
