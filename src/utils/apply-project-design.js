// src/utils/apply-project-design.js
/**
 * project.jsonのデザイン設定を確実にDOMに反映する
 * start/loading/guideの値を直接適用し、デフォルトUIへのフォールバックを防ぐ
 */

import { DEV_VERBOSE_LOGS } from '../config/feature-flags.js';

const log = (...args) => {
  if (DEV_VERBOSE_LOGS) {
    console.info('[APPLY]', ...args);
  }
};

/**
 * プロジェクトデザインをDOMに適用
 * @param {Object} project - 正規化済みのproject.json
 */
export function applyProjectDesign(project) {
  if (!project) {
    console.warn('[APPLY] project is null/undefined');
    return;
  }

  log('プロジェクトデザイン適用開始', {
    start: project.start,
    loading: project.loading,
    guide: project.guide
  });

  // スタート画面の適用
  if (project.start) {
    applyStartScreen(project.start);
  }

  // ローディング画面の適用
  if (project.loading) {
    applyLoadingScreen(project.loading);
  }

  // ガイド画面の適用
  if (project.guide) {
    applyGuideScreen(project.guide);
  }

  log('プロジェクトデザイン適用完了');
}

/**
 * スタート画面の適用
 */
function applyStartScreen(start) {
  const startScreen = document.getElementById('ar-start-screen');
  if (!startScreen) {
    console.warn('[APPLY] #ar-start-screen が見つかりません');
    return;
  }

  log('スタート画面適用:', start);

  // 背景画像
  if (start.backgroundImage) {
    startScreen.style.setProperty('background-image', `url(${start.backgroundImage})`, 'important');
    startScreen.style.setProperty('background-size', 'cover', 'important');
    startScreen.style.setProperty('background-position', 'center', 'important');
    log('背景画像適用:', start.backgroundImage);
  }

  // 背景色
  if (start.backgroundColor) {
    startScreen.style.setProperty('background-color', start.backgroundColor, 'important');
    log('背景色適用:', start.backgroundColor);
  }

  // タイトル
  let titleElement = startScreen.querySelector('#ar-start-title');
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
    startScreen.appendChild(titleElement);
  }

  if (start.title) {
    titleElement.textContent = start.title;
    log('タイトル適用:', start.title);
  }

  // タイトル位置（%）
  if (typeof start.titlePosition === 'number') {
    const pos = Math.max(5, Math.min(90, start.titlePosition));
    titleElement.style.setProperty('top', `${pos}%`, 'important');
    titleElement.style.setProperty('transform', 'translateY(-50%)', 'important');
    log('タイトル位置適用:', `${pos}%`);
  }

  // タイトルサイズ（倍率）
  if (typeof start.titleSize === 'number') {
    const size = Math.max(0.5, Math.min(3.0, start.titleSize));
    const baseSize = 32; // ベースフォントサイズ（px）
    const computedSize = baseSize * size;
    titleElement.style.setProperty('font-size', `${computedSize}px`, 'important');
    log('タイトルサイズ適用:', `${computedSize}px (倍率: ${size})`);
  }

  // タイトル色
  if (start.textColor) {
    titleElement.style.setProperty('color', start.textColor, 'important');
    log('タイトル色適用:', start.textColor);
  }

  // ボタン（開始ボタン）
  let buttonElement = startScreen.querySelector('#ar-start-button');
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
    startScreen.appendChild(buttonElement);
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
}

/**
 * ローディング画面の適用
 */
function applyLoadingScreen(loading) {
  const loadingScreen = document.getElementById('ar-loading-screen');
  if (!loadingScreen) {
    console.warn('[APPLY] #ar-loading-screen が見つかりません');
    return;
  }

  log('ローディング画面適用:', loading);

  // 画像
  if (loading.image) {
    let imgElement = loadingScreen.querySelector('#ar-loading-image');
    if (!imgElement) {
      imgElement = document.createElement('img');
      imgElement.id = 'ar-loading-image';
      imgElement.style.maxWidth = '80%';
      imgElement.style.maxHeight = '200px';
      imgElement.style.marginBottom = '20px';
      loadingScreen.appendChild(imgElement);
    }
    imgElement.src = loading.image;
    log('ローディング画像適用:', loading.image);
  }

  // メッセージ
  if (loading.message) {
    let msgElement = loadingScreen.querySelector('#ar-loading-message');
    if (!msgElement) {
      msgElement = document.createElement('p');
      msgElement.id = 'ar-loading-message';
      msgElement.style.fontSize = '18px';
      msgElement.style.color = '#ffffff';
      msgElement.style.margin = '10px 0';
      loadingScreen.appendChild(msgElement);
    }
    msgElement.textContent = loading.message;
    log('ローディングメッセージ適用:', loading.message);
  }

  // 背景色
  if (loading.backgroundColor) {
    loadingScreen.style.setProperty('background-color', loading.backgroundColor, 'important');
  }

  // テキスト色
  if (loading.textColor) {
    loadingScreen.style.setProperty('color', loading.textColor, 'important');
  }
}

/**
 * ガイド画面の適用
 */
function applyGuideScreen(guide) {
  const guideScreen = document.getElementById('ar-guide-screen');
  if (!guideScreen) {
    console.warn('[APPLY] #ar-guide-screen が見つかりません');
    return;
  }

  log('ガイド画面適用:', guide);

  // マーカー画像
  if (guide.marker?.src) {
    let markerImg = guideScreen.querySelector('#ar-guide-marker');
    if (!markerImg) {
      markerImg = document.createElement('img');
      markerImg.id = 'ar-guide-marker';
      markerImg.style.maxWidth = '60%';
      markerImg.style.maxHeight = '300px';
      markerImg.style.marginBottom = '20px';
      markerImg.style.border = '2px solid #ffffff';
      markerImg.style.borderRadius = '8px';
      guideScreen.appendChild(markerImg);
    }
    markerImg.src = guide.marker.src;
    log('ガイドマーカー画像適用:', guide.marker.src);
  }

  // メッセージ
  if (guide.message) {
    let msgElement = guideScreen.querySelector('#ar-guide-message');
    if (!msgElement) {
      msgElement = document.createElement('p');
      msgElement.id = 'ar-guide-message';
      msgElement.style.fontSize = '18px';
      msgElement.style.color = '#ffffff';
      msgElement.style.margin = '10px 0';
      msgElement.style.textAlign = 'center';
      guideScreen.appendChild(msgElement);
    }
    msgElement.textContent = guide.message;
    log('ガイドメッセージ適用:', guide.message);
  }

  // 背景色
  if (guide.backgroundColor) {
    guideScreen.style.setProperty('background-color', guide.backgroundColor, 'important');
  }

  // テキスト色
  if (guide.textColor) {
    guideScreen.style.setProperty('color', guide.textColor, 'important');
  }
}

export default applyProjectDesign;
