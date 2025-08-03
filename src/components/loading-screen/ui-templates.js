/**
 * ローディング画面エディタのUIテンプレート生成
 */

import { defaultSettings } from './settings.js';

// テンプレート定義
export function createStartTabContent(currentSettings = defaultSettings) {
  return `
    <div class="loading-screen-editor__content-section">
      <div class="loading-screen-editor__reset-container">
        <button class="loading-screen-editor__button loading-screen-editor__button--outline" id="reset-start-settings">
          設定をリセット
        </button>
      </div>
      
      <!-- ロゴ設定 -->
      <div class="loading-screen-editor__section">
        <h3 class="loading-screen-editor__section-title">ロゴ設定</h3>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ロゴ画像</label>
          <div class="loading-screen-editor__file-preview" id="startLogoDropzone">
            <input type="file" class="loading-screen-editor__file-input" accept="image/*,.gif" style="display: none;">
            <div class="loading-screen-editor__drop-zone">
              <div class="loading-screen-editor__drop-zone-icon">🖼️</div>
              <div class="loading-screen-editor__drop-zone-text">ロゴ画像をドロップ</div>
              <div class="loading-screen-editor__drop-zone-subtext">またはクリックして選択</div>
              <div class="loading-screen-editor__supported-formats">
                PNG, JPG, GIF, WebP (最大2MB)
              </div>
            </div>
            <button class="loading-screen-editor__remove-button" style="display: none;">✕</button>
          </div>
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ロゴ位置（上から）</label>
          <div class="loading-screen-editor__slider-with-value">
            <input type="range" class="loading-screen-editor__slider" id="startScreen-logoPosition" min="5" max="50" step="1" value="${currentSettings.startScreen.logoPosition}">
            <span class="loading-screen-editor__value-display" id="startScreen-logoPosition-value">${currentSettings.startScreen.logoPosition}%</span>
          </div>
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ロゴサイズ</label>
          <div class="loading-screen-editor__slider-with-value">
            <input type="range" class="loading-screen-editor__slider" id="startScreen-logoSize" min="0.3" max="2.0" step="0.1" value="${currentSettings.startScreen.logoSize}">
            <span class="loading-screen-editor__value-display" id="startScreen-logoSize-value">${currentSettings.startScreen.logoSize}x</span>
          </div>
        </div>
      </div>
      
      <!-- テキスト設定 -->
      <div class="loading-screen-editor__section">
        <h3 class="loading-screen-editor__section-title">テキスト設定</h3>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">タイトル</label>
          <input type="text" class="loading-screen-editor__input" id="startScreen-title" value="${currentSettings.startScreen.title}" placeholder="AR体験を開始">
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">タイトル位置（上から）</label>
          <div class="loading-screen-editor__slider-with-value">
            <input type="range" class="loading-screen-editor__slider" id="startScreen-titlePosition" min="20" max="80" step="1" value="${currentSettings.startScreen.titlePosition}">
            <span class="loading-screen-editor__value-display" id="titlePosition-value">${currentSettings.startScreen.titlePosition}%</span>
          </div>
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">タイトルサイズ</label>
          <div class="loading-screen-editor__slider-with-value">
            <input type="range" class="loading-screen-editor__slider" id="startScreen-titleSize" min="0.5" max="2.0" step="0.1" value="${currentSettings.startScreen.titleSize}">
            <span class="loading-screen-editor__value-display" id="titleSize-value">${currentSettings.startScreen.titleSize}x</span>
          </div>
        </div>
      </div>
      
      <!-- ボタン設定 -->
      <div class="loading-screen-editor__section">
        <h3 class="loading-screen-editor__section-title">ボタン設定</h3>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ボタンテキスト</label>
          <input type="text" class="loading-screen-editor__input" id="startScreen-buttonText" value="${currentSettings.startScreen.buttonText}" placeholder="開始">
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ボタン位置（上から）</label>
          <div class="loading-screen-editor__slider-with-value">
            <input type="range" class="loading-screen-editor__slider" id="startScreen-buttonPosition" min="40" max="90" step="1" value="${currentSettings.startScreen.buttonPosition}">
            <span class="loading-screen-editor__value-display" id="buttonPosition-value">${currentSettings.startScreen.buttonPosition}%</span>
          </div>
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ボタンサイズ</label>
          <div class="loading-screen-editor__slider-with-value">
            <input type="range" class="loading-screen-editor__slider" id="startScreen-buttonSize" min="0.5" max="2.0" step="0.1" value="${currentSettings.startScreen.buttonSize}">
            <span class="loading-screen-editor__value-display" id="buttonSize-value">${currentSettings.startScreen.buttonSize}x</span>
          </div>
        </div>
      </div>
      
      <!-- 色設定 -->
      <div class="loading-screen-editor__section">
        <h3 class="loading-screen-editor__section-title">色設定</h3>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">背景色</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="startScreen-backgroundColor" value="${currentSettings.startScreen.backgroundColor}">
            <input type="text" class="loading-screen-editor__input" id="startScreen-backgroundColorText" value="${currentSettings.startScreen.backgroundColor}">
          </div>
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">テキスト色</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="startScreen-textColor" value="${currentSettings.startScreen.textColor}">
            <input type="text" class="loading-screen-editor__input" id="startScreen-textColorText" value="${currentSettings.startScreen.textColor}">
          </div>
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ボタン背景色</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="startScreen-buttonColor" value="${currentSettings.startScreen.buttonColor}">
            <input type="text" class="loading-screen-editor__input" id="startScreen-buttonColorText" value="${currentSettings.startScreen.buttonColor}">
          </div>
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ボタンテキスト色</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="startScreen-buttonTextColor" value="${currentSettings.startScreen.buttonTextColor}">
            <input type="text" class="loading-screen-editor__input" id="startScreen-buttonTextColorText" value="${currentSettings.startScreen.buttonTextColor}">
          </div>
        </div>
      </div>
    </div>
  `;
}

export function createGeneralTabContent(currentSettings = defaultSettings) {
  return `
    <div class="loading-screen-editor__content-section">
      <div class="loading-screen-editor__form-group">
        <label class="loading-screen-editor__label">背景色</label>
        <div class="loading-screen-editor__color-input">
          <input type="color" class="loading-screen-editor__color-picker" id="loadingScreen-backgroundColor" value="${currentSettings.loadingScreen.backgroundColor}">
          <input type="text" class="loading-screen-editor__input" id="loadingScreen-backgroundColorText" value="${currentSettings.loadingScreen.backgroundColor}">
        </div>
      </div>
      
      <div class="loading-screen-editor__form-group">
        <label class="loading-screen-editor__label">ロゴ設定</label>
        <div class="loading-screen-editor__radio-group">
          <label class="loading-screen-editor__radio-option">
            <input type="radio" name="loadingLogoType" value="none" ${currentSettings.loadingScreen.logoType === 'none' ? 'checked' : ''}>
            <span class="loading-screen-editor__radio-text">表示なし</span>
          </label>
          <label class="loading-screen-editor__radio-option">
            <input type="radio" name="loadingLogoType" value="useStartLogo" ${currentSettings.loadingScreen.logoType === 'useStartLogo' ? 'checked' : ''}>
            <span class="loading-screen-editor__radio-text">スタート画面のロゴを使用</span>
          </label>
          <label class="loading-screen-editor__radio-option">
            <input type="radio" name="loadingLogoType" value="custom" ${currentSettings.loadingScreen.logoType === 'custom' ? 'checked' : ''}>
            <span class="loading-screen-editor__radio-text">ローディング専用ロゴ</span>
          </label>
        </div>
      </div>
      
      <!-- カスタムロゴアップロード -->
      <div class="loading-screen-editor__form-group" id="loading-custom-logo-section" style="display: ${currentSettings.loadingScreen.logoType === 'custom' ? 'block' : 'none'};">
        <label class="loading-screen-editor__label">ローディング用ロゴ</label>
        <div class="loading-screen-editor__file-preview" id="loadingLogoDropzone">
          <input type="file" class="loading-screen-editor__file-input" accept="image/*" style="display: none;">
          <div class="loading-screen-editor__drop-zone">
            <div class="loading-screen-editor__drop-zone-icon">🖼️</div>
            <div class="loading-screen-editor__drop-zone-text">ロゴをドロップ</div>
            <div class="loading-screen-editor__drop-zone-subtext">またはクリックして選択</div>
            <div class="loading-screen-editor__supported-formats">
              PNG, JPG, WebP (最大2MB、透過PNG推奨)
            </div>
          </div>
          <button class="loading-screen-editor__remove-button" style="display: none;">✕</button>
        </div>
      </div>
      
      <!-- ロゴ位置とサイズ設定 -->
      <div class="loading-screen-editor__form-group" id="loading-logo-controls" style="display: ${currentSettings.loadingScreen.logoType !== 'none' ? 'block' : 'none'};">
        <label class="loading-screen-editor__label">ロゴ位置（上から）</label>
        <div class="loading-screen-editor__slider-with-value">
          <input type="range" class="loading-screen-editor__slider" id="loadingScreen-logoPosition" min="10" max="50" step="1" value="${currentSettings.loadingScreen.logoPosition}">
          <span class="loading-screen-editor__value-display" id="loadingScreen-logoPosition-value">${currentSettings.loadingScreen.logoPosition}%</span>
        </div>
      </div>
      
      <div class="loading-screen-editor__form-group" id="loading-logo-size-controls" style="display: ${currentSettings.loadingScreen.logoType !== 'none' ? 'block' : 'none'};">
        <label class="loading-screen-editor__label">ロゴサイズ</label>
        <div class="loading-screen-editor__slider-with-value">
          <input type="range" class="loading-screen-editor__slider" id="loadingScreen-logoSize" min="0.5" max="2.0" step="0.1" value="${currentSettings.loadingScreen.logoSize}">
          <span class="loading-screen-editor__value-display" id="loadingScreen-logoSize-value">${currentSettings.loadingScreen.logoSize}x</span>
        </div>
      </div>
    </div>
  `;
}

export function createTextTabContent(currentSettings = defaultSettings) {
  return `
    <div class="loading-screen-editor__content-section">
      <div class="loading-screen-editor__form-group">
        <label class="loading-screen-editor__label">ブランド名</label>
        <input type="text" class="loading-screen-editor__input" id="loadingScreen-brandName" value="${currentSettings.loadingScreen.brandName}" placeholder="あなたのブランド">
      </div>
      <div class="loading-screen-editor__form-group">
        <label class="loading-screen-editor__label">サブタイトル</label>
        <input type="text" class="loading-screen-editor__input" id="loadingScreen-subTitle" value="${currentSettings.loadingScreen.subTitle}" placeholder="AR体験">
      </div>
      <div class="loading-screen-editor__form-group">
        <label class="loading-screen-editor__label">ローディングメッセージ</label>
        <input type="text" class="loading-screen-editor__input" id="loadingScreen-loadingMessage" value="${currentSettings.loadingScreen.loadingMessage}" placeholder="読み込み中...">
      </div>
      <div class="loading-screen-editor__form-group">
        <label class="loading-screen-editor__label">フォントスケール</label>
        <div class="loading-screen-editor__slider-with-value">
          <input type="range" class="loading-screen-editor__slider" id="loadingScreen-fontScale" min="0.5" max="2.0" step="0.1" value="${currentSettings.loadingScreen.fontScale}">
          <span class="loading-screen-editor__value-display" id="fontScale-value">${currentSettings.loadingScreen.fontScale}x</span>
        </div>
      </div>
    </div>
  `;
}

export function createAnimationTabContent(currentSettings = defaultSettings) {
  return `
    <div class="loading-screen-editor__content-section">
      <div class="loading-screen-editor__form-group">
        <label class="loading-screen-editor__label">アニメーション</label>
        <select class="loading-screen-editor__input" id="loadingScreen-animation">
          <option value="fade" ${currentSettings.loadingScreen.animation === 'fade' ? 'selected' : ''}>フェード</option>
          <option value="slide" ${currentSettings.loadingScreen.animation === 'slide' ? 'selected' : ''}>スライド</option>
          <option value="zoom" ${currentSettings.loadingScreen.animation === 'zoom' ? 'selected' : ''}>ズーム</option>
        </select>
      </div>
    </div>
  `;
}

export function createGuideTabContent(currentSettings = defaultSettings) {
  return `
    <div class="loading-screen-editor__content-section">
      <div class="loading-screen-editor__reset-container">
        <button class="loading-screen-editor__button loading-screen-editor__button--outline" id="reset-guide-settings">
          設定をリセット
        </button>
      </div>
      
      <!-- モード選択 -->
      <div class="loading-screen-editor__form-group">
        <label class="loading-screen-editor__label">検出モード</label>
        <select class="loading-screen-editor__input" id="guideScreen-mode">
          <option value="surface" ${currentSettings.guideScreen.mode === 'surface' ? 'selected' : ''}>平面検出（マーカー画像）</option>
          <option value="world" ${currentSettings.guideScreen.mode === 'world' ? 'selected' : ''}>空間検出（画面タップ）</option>
        </select>
      </div>
      
      <div class="loading-screen-editor__form-group">
        <label class="loading-screen-editor__label">背景色</label>
        <div class="loading-screen-editor__color-input">
          <input type="color" class="loading-screen-editor__color-picker" id="guideScreen-backgroundColor" value="${currentSettings.guideScreen.backgroundColor}">
          <input type="text" class="loading-screen-editor__input" id="guideScreen-backgroundColorText" value="${currentSettings.guideScreen.backgroundColor}">
        </div>
      </div>
      
      <div class="loading-screen-editor__form-group">
        <label class="loading-screen-editor__label">テキスト色</label>
        <div class="loading-screen-editor__color-input">
          <input type="color" class="loading-screen-editor__color-picker" id="guideScreen-textColor" value="${currentSettings.guideScreen.textColor}">
          <input type="text" class="loading-screen-editor__input" id="guideScreen-textColorText" value="${currentSettings.guideScreen.textColor}">
        </div>
      </div>
      
      <!-- 平面検出用設定 -->
      <div class="loading-screen-editor__mode-section" id="surface-detection-section" style="${currentSettings.guideScreen.mode === 'surface' ? '' : 'display: none;'}">
        <h4 class="loading-screen-editor__section-title">平面検出設定</h4>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">タイトル</label>
          <input type="text" class="loading-screen-editor__input" id="guideScreen-surfaceTitle" value="${currentSettings.guideScreen.surfaceDetection?.title || '画像の上にカメラを向けて合わせてください'}" placeholder="平面検出のタイトル">
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">説明</label>
          <textarea class="loading-screen-editor__input" id="guideScreen-surfaceDescription" rows="3" placeholder="平面検出の説明を入力してください">${currentSettings.guideScreen.surfaceDetection?.description || 'マーカー画像を画面内に収めてください'}</textarea>
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">マーカー画像</label>
          <div class="loading-screen-editor__file-preview" id="surfaceGuideImageDropzone">
            <input type="file" class="loading-screen-editor__file-input" accept="image/*" style="display: none;">
            <div class="loading-screen-editor__drop-zone">
              <div class="loading-screen-editor__drop-zone-icon">📁</div>
              <div class="loading-screen-editor__drop-zone-text">マーカー画像をドロップ</div>
              <div class="loading-screen-editor__drop-zone-subtext">またはクリックして選択</div>
              <div class="loading-screen-editor__supported-formats">
                JPG, PNG, WebP (最大2MB)
              </div>
            </div>
            <button class="loading-screen-editor__remove-button" style="display: none;">✕</button>
          </div>
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">マーカーサイズ</label>
          <div class="loading-screen-editor__slider-with-value">
            <input type="range" class="loading-screen-editor__slider" id="guideScreen-markerSize" min="0.5" max="2.0" step="0.1" value="${currentSettings.guideScreen.surfaceDetection?.markerSize || 1.0}">
            <span class="loading-screen-editor__value-display" id="markerSize-value">${currentSettings.guideScreen.surfaceDetection?.markerSize || 1.0}x</span>
          </div>
        </div>
      </div>
      
      <!-- 空間検出用設定 -->
      <div class="loading-screen-editor__mode-section" id="world-tracking-section" style="${currentSettings.guideScreen.mode === 'world' ? '' : 'display: none;'}">
        <h4 class="loading-screen-editor__section-title">空間検出設定</h4>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">タイトル</label>
          <input type="text" class="loading-screen-editor__input" id="guideScreen-worldTitle" value="${currentSettings.guideScreen.worldTracking?.title || '画面をタップしてください'}" placeholder="空間検出のタイトル">
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">説明</label>
          <textarea class="loading-screen-editor__input" id="guideScreen-worldDescription" rows="3" placeholder="空間検出の説明を入力してください">${currentSettings.guideScreen.worldTracking?.description || '平らな面を見つけて画面をタップしてください'}</textarea>
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ガイド画像</label>
          <div class="loading-screen-editor__file-preview" id="worldGuideImageDropzone">
            <input type="file" class="loading-screen-editor__file-input" accept="image/*" style="display: none;">
            <div class="loading-screen-editor__drop-zone">
              <div class="loading-screen-editor__drop-zone-icon">📁</div>
              <div class="loading-screen-editor__drop-zone-text">ガイド画像をドロップ</div>
              <div class="loading-screen-editor__drop-zone-subtext">またはクリックして選択</div>
              <div class="loading-screen-editor__supported-formats">
                JPG, PNG, WebP (最大2MB)
              </div>
            </div>
            <button class="loading-screen-editor__remove-button" style="display: none;">✕</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// メインエディタのHTMLテンプレート - projectsと同じレイアウト
export function createMainEditorTemplate() {
  return `
    <div class="app-layout">
      <!-- サイドメニュー - projectsと同じ構造 -->
      <div class="side-menu">
        <div class="logo-container">
          <div class="logo">Miru WebAR</div>
        </div>
        
        <div class="menu-item" id="projects-menu-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          プロジェクト
        </div>
        
        <div class="menu-item" id="media-menu-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          メディア一覧
        </div>
        
        <div class="menu-item" id="analytics-menu-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 3v18h18"/>
            <path d="M18.4 9l-1.3 1.3"/>
            <path d="M8 9h.01"/>
            <path d="M18 20V9"/>
            <path d="M8 5v4"/>
            <path d="M12 5v14"/>
            <path d="M16 13v7"/>
          </svg>
          分析
        </div>
        
        <div class="menu-item active" id="loading-screen-menu">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
          </svg>
          ローディング画面
        </div>
        
        <div class="menu-spacer"></div>
        
        <div class="menu-item" id="logout-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          ログアウト
        </div>
      </div>
      
      <!-- メインコンテンツ -->
      <div class="main-content">
        <div class="content-header">
          <h1>ローディング画面エディタ</h1>
          <button class="loading-screen-editor__button loading-screen-editor__button--back" id="back-to-projects-button">
            ← プロジェクト一覧に戻る
          </button>
        </div>
        
        <div class="loading-screen-editor__editor-container">
          <!-- 設定パネル -->
          <div class="loading-screen-editor__settings-panel">
            <!-- メインタブ -->
            <div class="loading-screen-editor__main-tabs">
              <button class="loading-screen-editor__main-tab loading-screen-editor__main-tab--active" data-tab="start">
                スタート画面
              </button>
              <button class="loading-screen-editor__main-tab" data-tab="loading">
                ローディング画面
              </button>
              <button class="loading-screen-editor__main-tab" data-tab="guide">
                ガイド画面
              </button>
            </div>
            
            <!-- タブコンテンツ -->
            <div class="loading-screen-editor__content-container">
              <!-- スタート画面タブ -->
              <div class="loading-screen-editor__tab-content loading-screen-editor__tab-content--active" data-tab="start">
                ${createStartTabContent()}
              </div>
              
              <!-- ローディング画面タブ -->
              <div class="loading-screen-editor__tab-content" data-tab="loading" style="display: none;">
                <!-- ローディング画面のサブタブ -->
                <div class="loading-screen-editor__sub-tabs">
                  <button class="loading-screen-editor__sub-tab loading-screen-editor__sub-tab--active" data-subtab="general">
                    一般設定
                  </button>
                  <button class="loading-screen-editor__sub-tab" data-subtab="text">
                    テキスト
                  </button>
                  <button class="loading-screen-editor__sub-tab" data-subtab="animation">
                    アニメーション
                  </button>
                </div>
                
                <!-- サブタブコンテンツ -->
                <div class="loading-screen-editor__subcontent-container">
                  <div class="loading-screen-editor__sub-content loading-screen-editor__sub-content--active" data-subtab="general">
                    ${createGeneralTabContent()}
                  </div>
                  <div class="loading-screen-editor__sub-content" data-subtab="text" style="display: none;">
                    ${createTextTabContent()}
                  </div>
                  <div class="loading-screen-editor__sub-content" data-subtab="animation" style="display: none;">
                    ${createAnimationTabContent()}
                  </div>
                </div>
              </div>
              
              <!-- ガイド画面タブ -->
              <div class="loading-screen-editor__tab-content" data-tab="guide" style="display: none;">
                ${createGuideTabContent()}
              </div>
            </div>
            
            <!-- 保存ボタン -->
            <div class="loading-screen-editor__footer-actions">
              <button class="loading-screen-editor__button loading-screen-editor__button--secondary" id="cancel-button">
                キャンセル
              </button>
              <button class="loading-screen-editor__button loading-screen-editor__button--primary" id="save-button">
                保存
              </button>
            </div>
          </div>
          
          <!-- プレビューパネル -->
          <div class="loading-screen-editor__preview-panel">
            <!-- プレビューヘッダー -->
            <div class="loading-screen-editor__preview-header">
              <h3 class="loading-screen-editor__preview-title">プレビュー</h3>
              <div class="loading-screen-editor__orientation-toggle">
                <button class="loading-screen-editor__orientation-button loading-screen-editor__orientation-button--active" data-orientation="portrait">
                  📱 縦向き
                </button>
                <button class="loading-screen-editor__orientation-button" data-orientation="landscape">
                  📱 横向き
                </button>
              </div>
            </div>
            
            <!-- プレビューコンテナ -->
            <div class="loading-screen-editor__phone-container">
              <div class="loading-screen-editor__phone-frame" id="phone-frame">
                <div class="loading-screen-editor__phone-screen">
                  <div class="loading-screen-editor__preview-screen" id="preview-screen">
                    <!-- プレビューコンテンツがここに動的に挿入される -->
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
} 