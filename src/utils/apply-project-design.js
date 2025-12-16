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
 * プロジェクトデザインをDOMに適用
 * @param {Object} project - 正規化済みのproject.json
 * @param {Object} options - 適用オプション
 * @param {string} options.screen - 特定の画面のみ適用（start/loading/guide）
 * @param {string} options.container - コンテナID（デフォルト: #webar-ui）
 */
export async function applyProjectDesign(project, options = {}) {
  if (!project) {
    console.warn('[APPLY] project is null/undefined');
    return;
  }

  const { screen, container = '#webar-ui' } = options;
  
  // コンテナの存在確認
  const containerElement = document.querySelector(container) || document.getElementById('webar-ui') || document.body;
  if (!containerElement) {
    console.warn('[APPLY] コンテナが見つかりません:', container);
    return;
  }

  // プロジェクトのスキーマ差異を吸収して正規化
  const { startScreen, loadingScreen, guideScreen } = extractDesign(project);
  
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
    await applyScreenDesign(screen, project, containerElement);
    return;
  }

  // 全画面適用
  if (startScreen) {
    await applyScreenDesign('start', project, containerElement);
  }

  if (loadingScreen) {
    await applyScreenDesign('loading', project, containerElement);
  }

  if (guideScreen) {
    await applyScreenDesign('guide', project, containerElement);
  }

  log('プロジェクトデザイン適用完了');
}

/**
 * 特定画面のデザインを適用
 * @param {string} screenType - 画面タイプ
 * @param {Object} project - プロジェクトデータ
 * @param {HTMLElement} container - コンテナ要素
 */
async function applyScreenDesign(screenType, project, container) {
  const screenElement = container.querySelector(`[data-screen="${screenType}"]`);
  if (!screenElement) {
    console.warn(`[APPLY] data-screen="${screenType}" が見つかりません`);
    return;
  }

  // 画面タイプに応じて適用
  switch (screenType) {
    case 'start':
      await applyStartScreen(project.ui?.start, screenElement);
      break;
    case 'loading':
      await applyLoadingScreen(project.ui?.loading, screenElement);
      break;
    case 'guide':
      await applyGuideScreen(project.ui?.guide, screenElement);
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
async function applyStartScreen(start, screenElement) {
  if (!start) {
    console.warn('[APPLY] start設定がありません');
    return;
  }

  log('スタート画面適用:', start);

  // 画像をプリロード
  if (start.background) {
    try {
      await preloadImage(start.background);
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
      try { await preloadImage(start.logo); } catch {}
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
async function applyLoadingScreen(loading, screenElement) {
  if (!loading) {
    console.warn('[APPLY] loading設定がありません');
    return;
  }

  log('ローディング画面適用:', loading);

  // 画像をプリロード
  if (loading.background) {
    try {
      await preloadImage(loading.background);
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

  // 画像（ロゴ/イメージ）
  const loadingImgSrc = loading.image || loading.logo;
  if (loadingImgSrc) {
    let imgElement = screenElement.querySelector('#ar-loading-image');
    if (!imgElement) {
      imgElement = document.createElement('img');
      imgElement.id = 'ar-loading-image';
      imgElement.style.maxWidth = '80%';
      imgElement.style.maxHeight = '200px';
      imgElement.style.marginBottom = '20px';
      screenElement.appendChild(imgElement);
    }
    try { await preloadImage(loadingImgSrc); } catch {}
    imgElement.src = loadingImgSrc;
    imgElement.style.setProperty('display', 'block', 'important');
    log('ローディング画像適用:', loadingImgSrc);
  }

  // メッセージ
  if (loading.message) {
    let msgElement = screenElement.querySelector('#ar-loading-message');
    if (!msgElement) {
      msgElement = document.createElement('p');
      msgElement.id = 'ar-loading-message';
      msgElement.style.fontSize = '18px';
      msgElement.style.color = '#ffffff';
      msgElement.style.margin = '10px 0';
      screenElement.appendChild(msgElement);
    }
    msgElement.textContent = loading.message;
    log('ローディングメッセージ適用:', loading.message);
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
async function applyGuideScreen(guide, screenElement) {
  if (!guide) {
    console.warn('[APPLY] guide設定がありません');
    return;
  }

  log('ガイド画面適用:', guide);

  // 画像をプリロード
  if (guide.background) {
    try {
      await preloadImage(guide.background);
    } catch (error) {
      console.warn('[APPLY] 背景画像プリロード失敗:', error);
    }
  }

  if (guide.markerImage) {
    try {
      await preloadImage(guide.markerImage);
    } catch (error) {
      console.warn('[APPLY] マーカー画像プリロード失敗:', error);
    }
  }

  // 背景画像
  if (guide.background) {
    screenElement.style.setProperty('background-image', `url("${guide.background}")`, 'important');
    screenElement.style.setProperty('background-size', 'cover', 'important');
    screenElement.style.setProperty('background-position', 'center', 'important');
    log('背景画像適用:', guide.background);
  }

  // マーカー画像
  const markerSrc = guide.markerImage || guide.marker?.src || guide.image;
  if (markerSrc) {
    let markerImg = screenElement.querySelector('#ar-guide-marker');
    if (!markerImg) {
      markerImg = document.createElement('img');
      markerImg.id = 'ar-guide-marker';
      markerImg.style.maxWidth = '60%';
      markerImg.style.maxHeight = '300px';
      markerImg.style.marginBottom = '20px';
      markerImg.style.border = '2px solid #ffffff';
      markerImg.style.borderRadius = '8px';
      screenElement.appendChild(markerImg);
    }
    try { await preloadImage(markerSrc); } catch {}
    markerImg.src = markerSrc;
    markerImg.style.setProperty('display', 'block', 'important');
    log('ガイドマーカー画像適用:', markerSrc);
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
  if (guide.backgroundColor) {
    screenElement.style.setProperty('background-color', guide.backgroundColor, 'important');
  }

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
