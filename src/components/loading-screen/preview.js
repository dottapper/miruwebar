/**
 * ローディング画面エディタのプレビュー機能
 */

import { defaultSettings } from './settings.js';

// プレビュー更新のメイン関数
export function updatePreview(screenType = 'startScreen') {
  const previewScreen = document.getElementById('preview-screen');
  if (!previewScreen) return;

  // プレビューヘッダーのタイトルを更新
  updatePreviewTitle(screenType);

  const settings = getCurrentSettingsFromDOM();
  
  switch (screenType) {
    case 'startScreen':
      updateStartPreview(previewScreen, settings);
      break;
    case 'loadingScreen':
      updateLoadingPreview(previewScreen, settings);
      break;
    case 'guideScreen':
      updateGuidePreview(previewScreen, settings);
      break;
    default:
      updateStartPreview(previewScreen, settings);
  }
}

// プレビューヘッダーのタイトルを更新
function updatePreviewTitle(screenType) {
  const previewTitle = document.querySelector('.loading-screen-editor__preview-title');
  if (!previewTitle) return;

  const titleMap = {
    'startScreen': 'プレビュー - スタート画面',
    'loadingScreen': 'プレビュー - ローディング画面',
    'guideScreen': 'プレビュー - ガイド画面'
  };

  previewTitle.textContent = titleMap[screenType] || 'プレビュー';
}

// スタート画面のプレビュー更新
function updateStartPreview(previewScreen, settings) {
  const screen = settings.startScreen;
  
  // サムネイル画像の取得
  const thumbnailDropzone = document.getElementById('thumbnailDropzone');
  const thumbnailImg = thumbnailDropzone?.querySelector('img');
  const thumbnailSrc = thumbnailImg?.src || '';
  
  // ロゴ画像の取得
  const logoDropzone = document.getElementById('startLogoDropzone');
  const logoImg = logoDropzone?.querySelector('img');
  const logoSrc = logoImg?.src || '';
  
  // ロゴの表示条件をより厳密にチェック
  const shouldShowLogo = isValidImageSrc(logoSrc);
  
  previewScreen.innerHTML = `
    <style>
      .preview-start-button:hover {
        opacity: 0.9 !important;
        transform: translateY(-1px) !important;
      }
    </style>
    <div class="start-screen-preview" style="
      background-color: ${screen.backgroundColor || defaultSettings.startScreen.backgroundColor};
      color: ${screen.textColor || defaultSettings.startScreen.textColor};
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      padding: 20px;
      box-sizing: border-box;
    ">
      ${shouldShowLogo ? `
        <div class="logo-container" style="
          position: absolute;
          top: ${screen.logoPosition || defaultSettings.startScreen.logoPosition}%;
          left: 50%;
          transform: translateX(-50%);
          width: ${(screen.logoSize || defaultSettings.startScreen.logoSize) * 80}px;
          height: ${(screen.logoSize || defaultSettings.startScreen.logoSize) * 80}px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        ">
          <img src="${logoSrc}" style="
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
          " alt="ロゴ">
        </div>
      ` : ''}
      
      ${thumbnailSrc ? `
        <div class="thumbnail-container" style="
          position: absolute;
          top: 20px;
          right: 20px;
          width: 60px;
          height: 60px;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <img src="${thumbnailSrc}" style="
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));
          " alt="サムネイル">
        </div>
      ` : ''}
      
      <div class="title-container" style="
        position: absolute;
        top: ${screen.titlePosition || defaultSettings.startScreen.titlePosition}%;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        width: 90%;
      ">
        <h1 style="
          font-size: ${(screen.titleSize || defaultSettings.startScreen.titleSize) * 24}px;
          margin: 0;
          font-weight: bold;
          line-height: 1.2;
          color: ${screen.textColor || defaultSettings.startScreen.textColor};
        ">${screen.title !== undefined ? screen.title : defaultSettings.startScreen.title}</h1>
      </div>
      
      <div class="button-container" style="
        position: absolute;
        top: ${screen.buttonPosition || defaultSettings.startScreen.buttonPosition}%;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
      ">
        <button style="
          background-color: ${screen.buttonColor || defaultSettings.startScreen.buttonColor};
          color: ${screen.buttonTextColor || defaultSettings.startScreen.buttonTextColor};
          border: none;
          padding: ${(screen.buttonSize || defaultSettings.startScreen.buttonSize) * 12}px ${(screen.buttonSize || defaultSettings.startScreen.buttonSize) * 24}px;
          border-radius: 8px;
          font-size: ${(screen.buttonSize || defaultSettings.startScreen.buttonSize) * 16}px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        " class="preview-start-button"">
          ${screen.buttonText !== undefined ? screen.buttonText : defaultSettings.startScreen.buttonText}
        </button>
      </div>
    </div>
  `;
}

// ローディング画面のプレビュー更新
function updateLoadingPreview(previewScreen, settings) {
  const screen = settings.loadingScreen;
  
  // アニメーションタイプの取得
  const animationSelect = document.getElementById('loadingScreen-animation');
  const animationType = animationSelect?.value || screen.animation || 'none';
  
  // ロゴタイプの取得
  const logoTypeRadio = document.querySelector('input[name="loadingLogoType"]:checked');
  const logoType = logoTypeRadio?.value || screen.logoType || 'none';
  
  // ロゴ画像の取得
  let logoSrc = '';
  if (logoType === 'useStartLogo') {
    // スタート画面のロゴを使用
    const startLogoDropzone = document.getElementById('startLogoDropzone');
    const startLogoImg = startLogoDropzone?.querySelector('img');
    logoSrc = startLogoImg?.src || '';
  } else if (logoType === 'custom') {
    // ローディング専用ロゴを使用
    const loadingLogoDropzone = document.getElementById('loadingLogoDropzone');
    const loadingLogoImg = loadingLogoDropzone?.querySelector('img');
    logoSrc = loadingLogoImg?.src || '';
  }

  // テキスト位置（ブランド名/サブタイトル）の取得（スライダー優先）
  const textPositionSlider = document.getElementById('loadingScreen-textPosition');
  const textPosition = textPositionSlider?.value || screen.textPosition || defaultSettings.loadingScreen.textPosition;

  previewScreen.innerHTML = `
    <div class="loading-screen-preview ${animationType !== 'none' ? `loading-animation-${animationType}` : ''}" style="
      background-color: ${screen.backgroundColor || defaultSettings.loadingScreen.backgroundColor};
      color: ${screen.textColor || defaultSettings.loadingScreen.textColor};
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      padding: 20px;
      box-sizing: border-box;
    ">
      ${logoType !== 'none' && logoSrc ? `
        <div class="logo-container" style="
          position: absolute;
          top: ${logoType === 'useStartLogo' ? (settings.startScreen.logoPosition || defaultSettings.startScreen.logoPosition) : (screen.logoPosition || defaultSettings.loadingScreen.logoPosition)}%;
          left: 50%;
          width: ${logoType === 'useStartLogo' ? ((settings.startScreen.logoSize || defaultSettings.startScreen.logoSize) * 80) : ((screen.logoSize || defaultSettings.loadingScreen.logoSize) * 80)}px;
          height: ${logoType === 'useStartLogo' ? ((settings.startScreen.logoSize || defaultSettings.startScreen.logoSize) * 80) : ((screen.logoSize || defaultSettings.loadingScreen.logoSize) * 80)}px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <img src="${logoSrc}" style="
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          " alt="ロゴ">
        </div>
      ` : ''}
      <div class="text-group" style="
        position: absolute;
        top: ${textPosition}%;
        left: 50%;
        transform: translateX(-50%);
        width: calc(100% - 40px);
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      ">
        <div class="brand-name" style="
          font-size: ${(screen.fontScale || defaultSettings.loadingScreen.fontScale) * 20}px;
          font-weight: bold;
          margin-bottom: 8px;
        ">
          ${screen.brandName !== undefined ? screen.brandName : defaultSettings.loadingScreen.brandName}
        </div>
        <div class="sub-title" style="
          font-size: ${(screen.fontScale || defaultSettings.loadingScreen.fontScale) * 14}px;
          margin-bottom: 30px;
          opacity: 0.8;
        ">
          ${screen.subTitle !== undefined ? screen.subTitle : defaultSettings.loadingScreen.subTitle}
        </div>
      </div>
      
      <div class="progress-container" style="
        width: 80%;
        max-width: 200px;
        margin-bottom: 15px;
      ">
        <div class="progress-bar" style="
          width: 100%;
          height: 4px;
          background: rgba(255,255,255,0.2);
          border-radius: 2px;
          overflow: hidden;
        ">
          <div class="progress-fill" style="
            width: 60%;
            height: 100%;
            background: ${screen.accentColor || defaultSettings.loadingScreen.accentColor};
            transition: width 0.3s ease;
            animation: loading-pulse 2s infinite;
          "></div>
        </div>
      </div>
      
      <div class="loading-message" style="
        font-size: ${(screen.fontScale || defaultSettings.loadingScreen.fontScale) * 12}px;
        opacity: 0.9;
        text-align: center;
      ">
        ${screen.loadingMessage !== undefined ? screen.loadingMessage : defaultSettings.loadingScreen.loadingMessage}
      </div>
    </div>
    
    <style>
      @keyframes loading-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      
      /* CSS-only アニメーション */
      .loading-screen-preview .logo-container {
        transform: translateX(-50%); /* デフォルトの中央配置 */
      }
      
      /* フェードアニメーション - 全体に適用 */
      .loading-animation-fade .logo-container,
      .loading-animation-fade .brand-name,
      .loading-animation-fade .sub-title,
      .loading-animation-fade .progress-container,
      .loading-animation-fade .loading-message {
        animation: fadeInAnimation 2s ease-in-out infinite alternate;
      }
      
      
      /* ズームアニメーション */
      .loading-animation-zoom .logo-container {
        animation: zoomPulseAnimation 2s ease-in-out infinite alternate;
      }
      
      @keyframes fadeInAnimation {
        0% { opacity: 0.6; }
        100% { opacity: 1; }
      }
      
      
      @keyframes zoomPulseAnimation {
        0% { transform: translateX(-50%) scale(0.95); opacity: 0.8; }
        100% { transform: translateX(-50%) scale(1.05); opacity: 1; }
      }
    </style>
  `;
}

// ガイド画面のプレビュー更新
function updateGuidePreview(previewScreen, settings) {
  const screen = settings.guideScreen;
  const mode = screen.mode || 'surface';
  
  // モードに応じてガイド画像を取得
  let guideImageDropzone, guideImg, guideSrc;
  if (mode === 'surface') {
    guideImageDropzone = document.getElementById('surfaceGuideImageDropzone');
  } else {
    guideImageDropzone = document.getElementById('worldGuideImageDropzone');
  }
  
  guideImg = guideImageDropzone?.querySelector('img');
  guideSrc = guideImg?.src || '';
  
  // マーカーサイズを取得
  const markerSizeSlider = document.getElementById('guideScreen-markerSize');
  const markerSize = markerSizeSlider?.value || screen.surfaceDetection?.markerSize || 1.0;
  
  // 画像の縦横比を計算（画像がある場合）
  let containerWidth = 120;
  let containerHeight = 90;
  
  if (guideImg && guideImg.naturalWidth && guideImg.naturalHeight) {
    const imageAspectRatio = guideImg.naturalWidth / guideImg.naturalHeight;
    const maxSize = 140; // 最大サイズを少し大きく
    const minSize = 80;  // 最小サイズを設定
    
    if (imageAspectRatio > 1.5) {
      // 横長画像（16:9など）
      containerWidth = maxSize;
      containerHeight = Math.max(minSize, maxSize / imageAspectRatio);
    } else if (imageAspectRatio < 0.7) {
      // 縦長画像（9:16など）
      containerHeight = maxSize;
      containerWidth = Math.max(minSize, maxSize * imageAspectRatio);
    } else {
      // 正方形に近い画像
      const baseSize = 120;
      containerWidth = baseSize;
      containerHeight = baseSize / imageAspectRatio;
    }
  }
  
  // モードに応じたタイトル、説明、テキスト位置、テキストサイズ、フッター位置を取得
  let title, description, textPosition, textSize, footerPosition;
  if (mode === 'surface') {
    const surfaceTitleInput = document.getElementById('guideScreen-surfaceTitle')?.value;
    title = surfaceTitleInput !== undefined ? surfaceTitleInput : 
            (screen.surfaceDetection?.title !== undefined ? screen.surfaceDetection.title : 
            '画像の上にカメラを向けて合わせてください');
    const surfaceDescInput = document.getElementById('guideScreen-surfaceDescription')?.value;
    description = surfaceDescInput !== undefined ? surfaceDescInput : 
                  (screen.surfaceDetection?.description !== undefined ? screen.surfaceDetection.description : 
                  'マーカー画像を画面内に収めてください');
    const textPositionSlider = document.getElementById('guideScreen-surfaceTextPosition');
    textPosition = textPositionSlider?.value || screen.surfaceDetection?.textPosition || defaultSettings.guideScreen.surfaceDetection.textPosition;
    const textSizeSlider = document.getElementById('guideScreen-surfaceTextSize');
    textSize = textSizeSlider?.value || screen.surfaceDetection?.textSize || defaultSettings.guideScreen.surfaceDetection.textSize;
    const footerPositionSlider = document.getElementById('guideScreen-surfaceFooterPosition');
    footerPosition = footerPositionSlider?.value || screen.surfaceDetection?.footerPosition || defaultSettings.guideScreen.surfaceDetection.footerPosition;
  } else {
    const worldTitleInput = document.getElementById('guideScreen-worldTitle')?.value;
    title = worldTitleInput !== undefined ? worldTitleInput : 
            (screen.worldTracking?.title !== undefined ? screen.worldTracking.title : 
            '画面をタップしてください');
    const worldDescInput = document.getElementById('guideScreen-worldDescription')?.value;
    description = worldDescInput !== undefined ? worldDescInput : 
                  (screen.worldTracking?.description !== undefined ? screen.worldTracking.description : 
                  '平らな面を見つけて画面をタップしてください');
    const textPositionSlider = document.getElementById('guideScreen-worldTextPosition');
    textPosition = textPositionSlider?.value || screen.worldTracking?.textPosition || defaultSettings.guideScreen.worldTracking.textPosition;
    const textSizeSlider = document.getElementById('guideScreen-worldTextSize');
    textSize = textSizeSlider?.value || screen.worldTracking?.textSize || defaultSettings.guideScreen.worldTracking.textSize;
    const footerPositionSlider = document.getElementById('guideScreen-worldFooterPosition');
    footerPosition = footerPositionSlider?.value || screen.worldTracking?.footerPosition || defaultSettings.guideScreen.worldTracking.footerPosition;
  }

  previewScreen.innerHTML = `
    <div class="guide-screen-preview" style="
      background-color: ${screen.backgroundColor || defaultSettings.guideScreen.backgroundColor};
      color: ${screen.textColor || defaultSettings.guideScreen.textColor};
      width: 100%;
      height: 100%;
      position: relative;
      padding: 20px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    ">
      <div class="guide-header" style="
        position: absolute;
        top: ${textPosition}%;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        z-index: 10;
        width: 90%;
      ">
        <div class="guide-title" style="
          font-size: ${16 * textSize}px;
          font-weight: bold;
          margin-bottom: 8px;
          text-align: center;
          line-height: 1.3;
          text-shadow: 0 1px 3px rgba(0,0,0,0.5);
        ">
          ${title}
        </div>
        
        <div class="guide-description" style="
          font-size: ${12 * textSize}px;
          line-height: 1.4;
          text-align: center;
          opacity: 0.9;
          text-shadow: 0 1px 3px rgba(0,0,0,0.5);
        ">
          ${description}
        </div>
      </div>

      ${mode === 'surface' ? `
        <div class="marker-center-area" style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 5;
        ">
          ${guideSrc ? `
            <div class="marker-image-container" style="
              width: ${containerWidth * markerSize}px;
              height: ${containerHeight * markerSize}px;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid ${screen.accentColor || defaultSettings.guideScreen.accentColor};
              border-radius: 8px;
              background: rgba(255,255,255,0.1);
              backdrop-filter: blur(5px);
              animation: marker-glow 2s infinite;
            ">
              <img src="${guideSrc}" style="
                max-width: 90%;
                max-height: 90%;
                object-fit: contain;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
              " alt="マーカー画像">
            </div>
          ` : `
            <div class="marker-placeholder" style="
              width: ${containerWidth * markerSize}px;
              height: ${containerHeight * markerSize}px;
              border: 2px dashed ${screen.accentColor || defaultSettings.guideScreen.accentColor};
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(255,255,255,0.05);
              animation: marker-glow 2s infinite;
            ">
              <div style="
                font-size: ${Math.min(containerWidth, containerHeight) * markerSize * 0.2}px;
                opacity: 0.6;
              ">📷</div>
            </div>
          `}
          
          <div class="marker-label" style="
            margin-top: 8px;
            font-size: 10px;
            opacity: 0.9;
            text-align: center;
            color: ${screen.textColor || defaultSettings.guideScreen.textColor};
            text-shadow: 0 1px 3px rgba(0,0,0,0.8);
            animation: status-pulse 3s ease-in-out infinite;
          ">
            マーカー画像
          </div>
        </div>
      ` : `
        <div class="world-center-area" style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 5;
        ">
          ${guideSrc ? `
            <div class="guide-image-container" style="
              width: 100px;
              height: 100px;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <img src="${guideSrc}" style="
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
              " alt="ガイド画像">
            </div>
          ` : `
            <div class="guide-icon-container" style="
              width: 80px;
              height: 80px;
              margin-bottom: 20px;
              border-radius: 50%;
              background: rgba(255,255,255,0.1);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 32px;
            ">
              👆
            </div>
          `}
          
          <div class="tap-indicator" style="
            width: 60px;
            height: 60px;
            border: 3px solid ${screen.accentColor || defaultSettings.guideScreen.accentColor};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: tap-pulse 1.5s infinite;
          ">
            <div style="
              width: 20px;
              height: 20px;
              background: ${screen.accentColor || defaultSettings.guideScreen.accentColor};
              border-radius: 50%;
            "></div>
          </div>
        </div>
      `}
      
      <div class="guide-footer" style="
        position: absolute;
        top: ${footerPosition}%;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        z-index: 10;
      ">
        <div class="guide-status" style="
          font-size: 12px;
          opacity: 0.9;
          text-align: center;
          color: ${screen.textColor || defaultSettings.guideScreen.textColor};
          text-shadow: 0 1px 3px rgba(0,0,0,0.8);
          animation: status-pulse 3s ease-in-out infinite;
        ">
          ${mode === 'surface' ? '画像を認識しています...' : '平面を検出中...'}
        </div>
      </div>
    </div>
    
    <style>
      @keyframes marker-glow {
        0%, 100% { 
          border-color: ${screen.accentColor || defaultSettings.guideScreen.accentColor}; 
          box-shadow: 0 0 10px rgba(108, 92, 231, 0.3);
        }
        50% { 
          border-color: rgba(108, 92, 231, 0.8); 
          box-shadow: 0 0 20px rgba(108, 92, 231, 0.6);
        }
      }
      
      @keyframes tap-pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.7; }
      }
      
      @keyframes status-pulse {
        0%, 100% { 
          opacity: 0.9; 
          transform: scale(1);
        }
        50% { 
          opacity: 0.6; 
          transform: scale(0.98);
        }
      }
    </style>
  `;
}

// DOMから現在の設定を取得
export function getCurrentSettingsFromDOM() {
  const settings = {
    startScreen: { ...defaultSettings.startScreen },
    loadingScreen: { ...defaultSettings.loadingScreen },
    guideScreen: { 
      ...defaultSettings.guideScreen,
      surfaceDetection: { ...defaultSettings.guideScreen.surfaceDetection },
      worldTracking: { ...defaultSettings.guideScreen.worldTracking }
    }
  };

  // すべての入力要素から値を取得
  const inputs = document.querySelectorAll('.loading-screen-editor__input, .loading-screen-editor__slider, .loading-screen-editor__color-picker, select');
  
  inputs.forEach(input => {
    const id = input.id;
    if (!id) return;

    const [screenType, property] = id.split('-');
    if (settings[screenType] && property) {
      // カラーピッカーのテキスト入力（例：backgroundColorText）は除外
      if (property.endsWith('ColorText')) {
        return;
      }
      
      let value = input.value;
      
      // 数値の場合は変換
      if (input.type === 'range') {
        value = parseFloat(value);
      }
      
      // 空文字列もユーザーの意図として尊重
      
      settings[screenType][property] = value;
    }
  });
  
  // ガイド画面の特別な処理
  const guideModeSelect = document.getElementById('guideScreen-mode');
  if (guideModeSelect) {
    settings.guideScreen.mode = guideModeSelect.value;
  }
  
  // 平面検出設定
  const surfaceSettings = [
    { id: 'guideScreen-surfaceTitle', property: 'title', transform: null },
    { id: 'guideScreen-surfaceDescription', property: 'description', transform: null },
    { id: 'guideScreen-markerSize', property: 'markerSize', transform: parseFloat },
    { id: 'guideScreen-surfaceTextPosition', property: 'textPosition', transform: parseFloat },
    { id: 'guideScreen-surfaceTextSize', property: 'textSize', transform: parseFloat }
  ];
  
  surfaceSettings.forEach(({ id, property, transform }) => {
    const element = document.getElementById(id);
    if (element) {
      settings.guideScreen.surfaceDetection[property] = transform ? transform(element.value) : element.value;
    }
  });
  
  // 空間検出設定
  const worldSettings = [
    { id: 'guideScreen-worldTitle', property: 'title', transform: null },
    { id: 'guideScreen-worldDescription', property: 'description', transform: null },
    { id: 'guideScreen-worldTextPosition', property: 'textPosition', transform: parseFloat },
    { id: 'guideScreen-worldTextSize', property: 'textSize', transform: parseFloat }
  ];
  
  worldSettings.forEach(({ id, property, transform }) => {
    const element = document.getElementById(id);
    if (element) {
      settings.guideScreen.worldTracking[property] = transform ? transform(element.value) : element.value;
    }
  });
  
  // フッター位置の設定を取得
  const footerSettings = [
    { id: 'guideScreen-surfaceFooterPosition', target: settings.guideScreen.surfaceDetection },
    { id: 'guideScreen-worldFooterPosition', target: settings.guideScreen.worldTracking }
  ];
  
  footerSettings.forEach(({ id, target }) => {
    const element = document.getElementById(id);
    if (element) {
      target.footerPosition = parseFloat(element.value);
    }
  });
  
  // ロゴタイプラジオボタンの値を取得
  const logoTypeRadio = document.querySelector('input[name="loadingLogoType"]:checked');
  if (logoTypeRadio) {
    settings.loadingScreen.logoType = logoTypeRadio.value;
  }

  // 画像データを取得
  const imageSettings = [
    { dropzoneId: 'thumbnailDropzone', target: settings.startScreen, property: 'thumbnail' },
    { dropzoneId: 'startLogoDropzone', target: settings.startScreen, property: 'logo' },
    { dropzoneId: 'loadingLogoDropzone', target: settings.loadingScreen, property: 'logo' },
    { dropzoneId: 'surfaceGuideImageDropzone', target: settings.guideScreen.surfaceDetection, property: 'guideImage' },
    { dropzoneId: 'worldGuideImageDropzone', target: settings.guideScreen.worldTracking, property: 'guideImage' }
  ];
  
  imageSettings.forEach(({ dropzoneId, target, property }) => {
    const dropzone = document.getElementById(dropzoneId);
    const img = dropzone?.querySelector('img');
    if (img && img.src) {
      target[property] = img.src;
    }
  });

  return settings;
}

// ヘルパー関数：有効な画像ソースかチェック
function isValidImageSrc(src) {
  return src && (src.startsWith('data:') || src.startsWith('blob:')) && src.length > 50;
}

// プレビューのスクロール調整
export function adjustPreviewScroll() {
  const phoneContainer = document.querySelector('.loading-screen-editor__phone-container');
  if (phoneContainer) {
    setTimeout(() => {
      phoneContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
} 
