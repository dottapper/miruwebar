/**
 * ローディング画面エディタコンポーネント
 */

import '../styles/loading-screen-editor.css';

export default function showLoadingScreenEditor(container) {
  // デフォルト設定の定義を改善
  const defaultSettings = {
    startScreen: {
      title: 'AR体験を開始',
      buttonText: '開始',
      buttonColor: '#6c5ce7',
      thumbnail: null,
      backgroundColor: '#121212',
      textColor: '#ffffff',
      accentColor: '#6c5ce7',
      titlePosition: 30,
      buttonPosition: 70,
      titleSize: 1.0,
      buttonSize: 1.0,
      textStyle: 'basic',
      buttonTextColor: '#ffffff'
    },
    loadingScreen: {
      backgroundColor: '#121212',
      textColor: '#ffffff',
      accentColor: '#6c5ce7',
      logo: null,
      brandName: 'あなたのブランド',
      subTitle: 'AR体験',
      loadingMessage: '読み込み中...',
      fontScale: 1,
      animation: 'fade'
    },
    guideScreen: {
      backgroundColor: '#121212',
      textColor: '#ffffff',
      accentColor: '#6c5ce7',
      title: 'ガイド画面',
      description: '準備中'
    }
  };

  // サムネイル制限
  const thumbnailLimits = {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxWidth: 1920,
    maxHeight: 1080
  };

  // モックAPI - ローカルストレージを使用
  const mockAPI = {
    getSettings() {
      try {
        const stored = localStorage.getItem('loadingScreenSettings');
        if (!stored) return this.mergeWithDefaults({});
        
        const parsed = JSON.parse(stored);
        return this.mergeWithDefaults(parsed);
      } catch (error) {
        console.warn('Failed to load settings from storage:', error);
        return this.mergeWithDefaults({});
      }
    },
    
    saveSettings(settings) {
      const merged = this.mergeWithDefaults(settings);
      localStorage.setItem('loadingScreenSettings', JSON.stringify(merged));
      return Promise.resolve(merged);
    },
    
    // 設定をデフォルト値とマージする
    mergeWithDefaults(settings) {
      const merged = JSON.parse(JSON.stringify(defaultSettings)); // ディープコピー
      
      // 各画面タイプの設定をマージ
      ['startScreen', 'loadingScreen', 'guideScreen'].forEach(screenType => {
        if (settings[screenType]) {
          merged[screenType] = {
            ...merged[screenType],
            ...settings[screenType]
          };
          
          // カラー値の検証と修正
          ['backgroundColor', 'textColor', 'accentColor'].forEach(colorProp => {
            if (settings[screenType]?.[colorProp]) {
              merged[screenType][colorProp] = validateAndFixColor(settings[screenType][colorProp]);
            }
          });
        }
      });
      
      return merged;
    }
  };

  // 現在の設定を保持（デフォルト値で初期化）
  let currentSettings = JSON.parse(JSON.stringify(defaultSettings));

  // ヘルパー関数
  function isValidColor(strColor) {
    const s = new Option().style;
    s.color = strColor;
    return s.color !== '';
  }

  function convertToHexColor(color) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    return ctx.fillStyle;
  }

  function showLogoError(message, detail = '') {
    console.error('Logo Error:', message, detail);
    
    // 既存のエラーメッセージを削除
    const existingError = document.querySelector('.loading-screen-editor__error-container');
    if (existingError) {
      existingError.remove();
    }
    
    // ドロップゾーンの参照を取得
    const activeDropzone = document.querySelector('.loading-screen-editor__file-preview--error');
    if (!activeDropzone) {
      // エラー状態のドロップゾーンが見つからない場合、最初のドロップゾーンを使用
      const dropzones = document.querySelectorAll('.loading-screen-editor__file-preview');
      if (dropzones.length > 0) {
        dropzones[0].classList.add('loading-screen-editor__file-preview--error');
        setTimeout(() => {
          dropzones[0].classList.remove('loading-screen-editor__file-preview--error');
        }, 2000);
      }
      return;
    }
    
    // 新しいエラーメッセージを作成
    const errorContainer = document.createElement('div');
    errorContainer.className = 'loading-screen-editor__error-container';
    errorContainer.innerHTML = `
      <div class="loading-screen-editor__error-icon">⚠️</div>
      <div>
        <div class="loading-screen-editor__error-message">${message}</div>
        ${detail ? `<div class="loading-screen-editor__error-detail">${detail}</div>` : ''}
      </div>
    `;
    
    // エラーメッセージを挿入
    activeDropzone.after(errorContainer);
    
    // 5秒後に自動的に消える
    setTimeout(() => {
      errorContainer.style.opacity = '0';
      setTimeout(() => {
        if (errorContainer.parentNode) {
          errorContainer.remove();
        }
      }, 300);
    }, 5000);
  }

  function adjustPreviewScroll() {
    const phoneContainer = document.querySelector('.loading-screen-editor__phone-container');
    if (phoneContainer) {
      setTimeout(() => {
        phoneContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }

  // テンプレート定義
  function createStartTabContent() {
    return `
      <!-- テキスト設定セクション -->
      <div class="loading-screen-editor__section">
        <h3 class="loading-screen-editor__section-title">テキスト設定</h3>
        
        <!-- タイトル設定 -->
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">タイトル</label>
          <input type="text" class="loading-screen-editor__input" id="startScreen-title" value="${currentSettings.startScreen.title}" placeholder="AR体験を開始">
        </div>
        
        <!-- ボタンテキスト設定 -->
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ボタンテキスト</label>
          <input type="text" class="loading-screen-editor__input" id="startScreen-buttonText" value="${currentSettings.startScreen.buttonText}" placeholder="開始">
        </div>

        <!-- テキストスタイル選択 -->
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">テキストスタイル</label>
          <div class="loading-screen-editor__style-selector">
            <button class="loading-screen-editor__style-option ${currentSettings.startScreen.textStyle === 'basic' ? 'active' : ''}" data-style="basic">
              <span class="style-preview basic">Aa</span>
              <span class="style-name">ベーシック</span>
            </button>
            <button class="loading-screen-editor__style-option ${currentSettings.startScreen.textStyle === 'modern' ? 'active' : ''}" data-style="modern">
              <span class="style-preview modern">Aa</span>
              <span class="style-name">モダン</span>
            </button>
            <button class="loading-screen-editor__style-option ${currentSettings.startScreen.textStyle === 'creative' ? 'active' : ''}" data-style="creative">
              <span class="style-preview creative">Aa</span>
              <span class="style-name">クリエイティブ</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 位置とサイズセクション -->
      <div class="loading-screen-editor__section">
        <h3 class="loading-screen-editor__section-title">位置とサイズ</h3>
        
        <!-- タイトル位置 -->
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">タイトル位置（上下）</label>
          <div class="loading-screen-editor__slider-with-value">
            <input type="range" class="loading-screen-editor__slider" id="startScreen-titlePosition" 
              min="0" max="100" step="5" value="${currentSettings.startScreen.titlePosition}">
            <span class="loading-screen-editor__value-display" id="titlePosition-value">${currentSettings.startScreen.titlePosition}%</span>
          </div>
        </div>
        
        <!-- タイトルサイズ -->
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">タイトルサイズ</label>
          <div class="loading-screen-editor__slider-with-value">
            <input type="range" class="loading-screen-editor__slider" id="startScreen-titleSize" 
              min="0.5" max="2.0" step="0.1" value="${currentSettings.startScreen.titleSize}">
            <span class="loading-screen-editor__value-display" id="titleSize-value">${currentSettings.startScreen.titleSize}x</span>
          </div>
        </div>
        
        <!-- ボタン位置 -->
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ボタン位置（上下）</label>
          <div class="loading-screen-editor__slider-with-value">
            <input type="range" class="loading-screen-editor__slider" id="startScreen-buttonPosition" 
              min="0" max="100" step="5" value="${currentSettings.startScreen.buttonPosition}">
            <span class="loading-screen-editor__value-display" id="buttonPosition-value">${currentSettings.startScreen.buttonPosition}%</span>
          </div>
        </div>
        
        <!-- ボタンサイズ -->
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ボタンサイズ</label>
          <div class="loading-screen-editor__slider-with-value">
            <input type="range" class="loading-screen-editor__slider" id="startScreen-buttonSize" 
              min="0.5" max="2.0" step="0.1" value="${currentSettings.startScreen.buttonSize}">
            <span class="loading-screen-editor__value-display" id="buttonSize-value">${currentSettings.startScreen.buttonSize}x</span>
          </div>
        </div>
      </div>

      <!-- カラー設定セクション -->
      <div class="loading-screen-editor__section">
        <h3 class="loading-screen-editor__section-title">カラー設定</h3>
        
        <!-- 背景色 -->
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">背景色</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="startScreen-backgroundColor" value="${currentSettings.startScreen.backgroundColor}">
            <input type="text" class="loading-screen-editor__input" id="startScreen-backgroundColorText" value="${currentSettings.startScreen.backgroundColor}">
          </div>
        </div>
        
        <!-- テキスト色 -->
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">テキスト色</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="startScreen-textColor" value="${currentSettings.startScreen.textColor}">
            <input type="text" class="loading-screen-editor__input" id="startScreen-textColorText" value="${currentSettings.startScreen.textColor}">
          </div>
        </div>
        
        <!-- ボタン色 -->
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ボタン色</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="startScreen-buttonColor" value="${currentSettings.startScreen.buttonColor}">
            <input type="text" class="loading-screen-editor__input" id="startScreen-buttonColorText" value="${currentSettings.startScreen.buttonColor}">
          </div>
        </div>
        
        <!-- ボタンテキスト色 -->
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ボタンテキスト色</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="startScreen-buttonTextColor" value="${currentSettings.startScreen.buttonTextColor}">
            <input type="text" class="loading-screen-editor__input" id="startScreen-buttonTextColorText" value="${currentSettings.startScreen.buttonTextColor}">
          </div>
        </div>
      </div>

      <!-- サムネイル設定セクション -->
      <div class="loading-screen-editor__section">
        <h3 class="loading-screen-editor__section-title">サムネイル画像</h3>
        <div class="loading-screen-editor__form-group">
          <div class="loading-screen-editor__file-preview" id="thumbnailDropzone">
            <input type="file" class="loading-screen-editor__file-input" accept="image/*" style="display: none;">
            <div class="loading-screen-editor__drop-zone">
              <div class="loading-screen-editor__drop-zone-icon">📁</div>
              <div class="loading-screen-editor__drop-zone-text">ここにサムネイルをドロップ</div>
              <div class="loading-screen-editor__drop-zone-subtext">またはクリックして選択</div>
              <div class="loading-screen-editor__supported-formats">
                推奨サイズ: 1920x1080px以下<br>
                対応形式: PNG, JPG, WebP (最大: 2MB)
              </div>
            </div>
            <button class="loading-screen-editor__remove-button" style="display: none;">×</button>
          </div>
        </div>
      </div>

      <!-- リセットボタン -->
      <div class="loading-screen-editor__form-group loading-screen-editor__reset-container">
        <button id="reset-settings-button" class="loading-screen-editor__reset-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 2v6h6"></path>
            <path d="M3 8L10 15"></path>
            <path d="M21 12A9 9 0 0 0 12 3"></path>
            <path d="M21 22v-6h-6"></path>
            <path d="M21 16L14 9"></path>
            <path d="M3 12a9 9 0 0 0 9 9"></path>
          </svg>
          すべての設定をリセット
        </button>
      </div>
    `;
  }

  function createGeneralTabContent() {
    return `
      <div class="loading-screen-editor__content-section">
        <div class="loading-screen-editor__reset-container">
          <button class="loading-screen-editor__button loading-screen-editor__button--outline" id="reset-loading-settings">
            デフォルトに戻す
          </button>
        </div>
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">背景色</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="loadingScreen-backgroundColor" value="${currentSettings.loadingScreen.backgroundColor}">
            <input type="text" class="loading-screen-editor__input" id="loadingScreen-backgroundColorText" value="${currentSettings.loadingScreen.backgroundColor}">
          </div>
        </div>
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">テキスト色</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="loadingScreen-textColor" value="${currentSettings.loadingScreen.textColor}">
            <input type="text" class="loading-screen-editor__input" id="loadingScreen-textColorText" value="${currentSettings.loadingScreen.textColor}">
          </div>
        </div>
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ロゴ</label>
          <div class="loading-screen-editor__file-preview" id="logoDropzone">
            <input type="file" class="loading-screen-editor__file-input" accept="image/*" style="display: none;">
            <div class="loading-screen-editor__drop-zone">
              <div class="loading-screen-editor__drop-zone-icon">📁</div>
              <div class="loading-screen-editor__drop-zone-text">ロゴをドロップ</div>
              <div class="loading-screen-editor__drop-zone-subtext">またはクリックして選択</div>
              <div class="loading-screen-editor__supported-formats">
                対応形式: PNG, JPG, WebP (最大: 2MB)
              </div>
            </div>
            <button class="loading-screen-editor__remove-button" style="display: none;">画像を削除</button>
          </div>
        </div>
      </div>
    `;
  }

  function createTextTabContent() {
    return `
      <div class="loading-screen-editor__form-group">
        <label class="loading-screen-editor__label">ブランド名</label>
        <input type="text" class="loading-screen-editor__input" id="brandName" value="${currentSettings.brandName}">
      </div>
      <div class="loading-screen-editor__form-group">
        <label class="loading-screen-editor__label">サブタイトル</label>
        <input type="text" class="loading-screen-editor__input" id="subTitle" value="${currentSettings.subTitle}">
      </div>
      <div class="loading-screen-editor__form-group">
        <label class="loading-screen-editor__label">ローディングメッセージ</label>
        <input type="text" class="loading-screen-editor__input" id="loadingMessage" value="${currentSettings.loadingMessage}">
      </div>
      <div class="loading-screen-editor__form-group">
        <label class="loading-screen-editor__label">フォントサイズ</label>
        <input type="range" class="loading-screen-editor__input" id="fontScale" min="0.5" max="2" step="0.1" value="${currentSettings.fontScale}">
        <span class="loading-screen-editor__range-value" id="fontScaleValue">${currentSettings.fontScale}x</span>
      </div>
    `;
  }

  function createAnimationTabContent() {
    return `
      <div class="loading-screen-editor__form-group">
        <label class="loading-screen-editor__label">アニメーションスタイル</label>
        <select class="loading-screen-editor__input" id="animation">
          <option value="fade" ${currentSettings.animation === 'fade' ? 'selected' : ''}>フェード</option>
          <option value="slide" ${currentSettings.animation === 'slide' ? 'selected' : ''}>スライド</option>
          <option value="zoom" ${currentSettings.animation === 'zoom' ? 'selected' : ''}>ズーム</option>
        </select>
      </div>
    `;
  }

  function createGuideTabContent() {
    return `
      <div class="loading-screen-editor__content-section">
        <div class="loading-screen-editor__reset-container">
          <button class="loading-screen-editor__button loading-screen-editor__button--outline" id="reset-guide-settings">
            デフォルトに戻す
          </button>
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
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">アクセントカラー</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="guideScreen-accentColor" value="${currentSettings.guideScreen.accentColor}">
            <input type="text" class="loading-screen-editor__input" id="guideScreen-accentColorText" value="${currentSettings.guideScreen.accentColor}">
          </div>
        </div>
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ガイド画面タイトル</label>
          <input type="text" class="loading-screen-editor__input" id="guideScreenTitle" value="${currentSettings.guideScreen.title}">
        </div>
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ガイド画面の説明</label>
          <input type="text" class="loading-screen-editor__input" id="guideScreenDescription" value="${currentSettings.guideScreen.description}">
        </div>
      </div>
    `;
  }

  // エディタの初期化
  function initializeEditor() {
    console.log('エディタの初期化を開始...');
    
    // エディタのHTML構造を作成
    const editorHTML = `
    <div class="loading-screen-editor">
      <div class="loading-screen-editor__header">
        ローディング画面エディタ
      </div>
      <div class="loading-screen-editor__container">
        <div class="loading-screen-editor__settings-panel">
          <div class="loading-screen-editor__main-tabs">
            <button class="loading-screen-editor__main-tab loading-screen-editor__main-tab--active" data-tab="start">開始画面</button>
            <button class="loading-screen-editor__main-tab" data-tab="loading">ローディング画面</button>
            <button class="loading-screen-editor__main-tab" data-tab="guide">ガイド画面</button>
          </div>
          
          <!-- メインコンテンツコンテナ -->
          <div class="loading-screen-editor__content-container">
            <!-- Start Screen Content -->
            <div class="loading-screen-editor__main-content loading-screen-editor__main-content--active" data-tab="start">
              ${createStartTabContent()}
            </div>

            <!-- Loading Screen Content -->
            <div class="loading-screen-editor__main-content" data-tab="loading">
              <div class="loading-screen-editor__sub-tabs">
                <button class="loading-screen-editor__sub-tab loading-screen-editor__sub-tab--active" data-subtab="loading-general">一般</button>
                <button class="loading-screen-editor__sub-tab" data-subtab="loading-text">テキスト</button>
                <button class="loading-screen-editor__sub-tab" data-subtab="loading-animation">アニメーション</button>
              </div>

              <div class="loading-screen-editor__subcontent-container">
                <!-- Loading Screen - General Settings -->
                <div class="loading-screen-editor__sub-content loading-screen-editor__sub-content--active" data-subtab="loading-general">
                  ${createGeneralTabContent()}
                </div>

                <!-- Loading Screen - Text Settings -->
                <div class="loading-screen-editor__sub-content" data-subtab="loading-text">
                  ${createTextTabContent()}
                </div>

                <!-- Loading Screen - Animation Settings -->
                <div class="loading-screen-editor__sub-content" data-subtab="loading-animation">
                  ${createAnimationTabContent()}
                </div>
              </div>
            </div>
            
            <!-- Guide Screen Content -->
            <div class="loading-screen-editor__main-content" data-tab="guide">
              ${createGuideTabContent()}
            </div>
          </div>
        </div>
        
        <div class="loading-screen-editor__preview-panel">
          <div class="loading-screen-editor__preview-header">
            <div class="loading-screen-editor__preview-title">プレビュー</div>
            <div class="loading-screen-editor__orientation-toggle">
              <button class="loading-screen-editor__orientation-button loading-screen-editor__orientation-button--active" data-orientation="portrait">
                <span>📱</span> 縦向き
              </button>
              <button class="loading-screen-editor__orientation-button" data-orientation="landscape">
                <span>📱</span> 横向き
              </button>
            </div>
          </div>
          <div class="loading-screen-editor__phone-container">
            <div class="loading-screen-editor__phone-frame">
              <div class="loading-screen-editor__phone-screen">
                <div class="loading-screen-editor__preview-screen">
                  <!-- スタート画面用の要素 -->
                  <div class="loading-screen-editor__preview-start-screen">
                    <div class="loading-screen-editor__preview-background"></div>
                    <div class="loading-screen-editor__preview-title"></div>
                    <div class="loading-screen-editor__preview-button"></div>
                  </div>
                  
                  <!-- ローディング画面用の要素 -->
                  <div class="loading-screen-editor__preview-loading-screen" style="display: none;">
                    <div class="loading-screen-editor__preview-logo"></div>
                    <div class="loading-screen-editor__preview-title"></div>
                    <div class="loading-screen-editor__preview-subtitle"></div>
                    <div class="loading-screen-editor__preview-progress">
                      <div class="loading-screen-editor__preview-progress-bar"></div>
                    </div>
                    <div class="loading-screen-editor__preview-message"></div>
                  </div>
                  
                  <!-- ガイド画面用の要素 -->
                  <div class="loading-screen-editor__preview-guide-screen" style="display: none;">
                    <div class="loading-screen-editor__preview-title"></div>
                    <div class="loading-screen-editor__preview-subtitle"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="loading-screen-editor__fixed-footer">
        <button class="loading-screen-editor__button loading-screen-editor__button--secondary" id="cancelButton">キャンセル</button>
        <button class="loading-screen-editor__button loading-screen-editor__button--primary" id="saveButton">保存</button>
      </div>
    </div>
  `;

    // エディタをDOMに追加
    const editorContainer = document.createElement('div');
    editorContainer.innerHTML = editorHTML;
    container.appendChild(editorContainer);
    console.log('エディタのDOM構造を追加しました');

    // DOM要素が確実に存在する状態でイベントリスナーを設定するため、setTimeout を使用
    setTimeout(() => {
      try {
        console.log('イベントリスナーの設定を開始...');
        // イベントリスナーの設定
        setupTabHandlers();
        setupColorInputs();
        setupTextInputs();
        setupFileDropzones();
        setupOrientationToggle();
        setupButtons();
        console.log('全てのイベントリスナーを設定しました');

        // 初期設定の読み込みとプレビューの更新
        loadSettings().then(() => {
          console.log('設定の読み込みが完了しました');
          // 初期タブの表示を強制
          const initialTab = document.querySelector('.loading-screen-editor__main-tab--active');
          if (initialTab) {
            initialTab.click();
          } else {
            // アクティブなタブがない場合は最初のタブをクリック
            const firstTab = document.querySelector('.loading-screen-editor__main-tab');
            if (firstTab) firstTab.click();
          }
          
          // レイアウト検証を実行
          setTimeout(verifyLayout, 500);
        });
      } catch (error) {
        console.error('初期化中にエラーが発生しました:', error);
      }
    }, 50);
  }

  // タブ切り替えの処理 - 改良版
  function setupTabHandlers() {
    console.log('タブハンドラーの設定を開始...');
    
    // メインタブの処理
    const mainTabs = document.querySelectorAll('.loading-screen-editor__main-tab');
    const mainContents = document.querySelectorAll('.loading-screen-editor__main-content');

    if (mainTabs.length === 0 || mainContents.length === 0) {
      console.error('タブ要素が見つかりません');
      return;
    }

    mainTabs.forEach(tab => {
      tab.addEventListener('click', async (e) => {
        // クリックイベントの伝播を停止（レイアウト崩れを防止）
        e.stopPropagation();
        
        console.log('メインタブクリック:', tab.dataset.tab);
        
        // アクティブ状態をリセット
        mainTabs.forEach(t => t.classList.remove('loading-screen-editor__main-tab--active'));
        mainContents.forEach(c => {
          c.classList.remove('loading-screen-editor__main-content--active');
          c.style.display = 'none'; // 一旦非表示に
        });

        // 新しいタブをアクティブに
        tab.classList.add('loading-screen-editor__main-tab--active');
        const tabName = tab.dataset.tab;
        
        // タブコンテンツを探す
        const mainContent = document.querySelector(`.loading-screen-editor__main-content[data-tab="${tabName}"]`);
        
        if (mainContent) {
          // 徐々に表示（スムーズな切り替え）
          mainContent.style.display = 'block';
          setTimeout(() => {
            mainContent.classList.add('loading-screen-editor__main-content--active');
          }, 10);
          
          // Loading Screen タブが選択された場合、サブタブの処理
          if (tabName === 'loading') {
            const firstSubTab = mainContent.querySelector('.loading-screen-editor__sub-tab');
            if (firstSubTab) {
              console.log('サブタブを自動選択:', firstSubTab.dataset.subtab);
              setTimeout(() => firstSubTab.click(), 50);
            }
          }

          // プレビューの更新（スクリーンタイプに基づく）
          let screenType;
          switch (tabName) {
            case 'start':
              screenType = 'startScreen';
              break;
            case 'loading':
              screenType = 'loadingScreen';
              break;
            case 'guide':
              screenType = 'guideScreen';
              break;
            default:
              screenType = 'startScreen';
          }
          
          console.log('プレビュー更新:', screenType);
          try {
            await updatePreview(screenType);
          } catch (error) {
            console.error('プレビュー更新中にエラーが発生しました:', error);
          }
        }
      });
    });
  }

  // カラー値のバリデーションと修正を行う関数を改善
  function validateAndFixColor(color) {
    if (!color) return null;

    // 16進数カラーコードのバリデーション
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexColorRegex.test(color)) {
      return color;
    }

    // 3桁のカラーコードを6桁に変換
    if (hexColorRegex.test('#' + color)) {
      return '#' + color;
    }

    try {
      // カラー名をHEXに変換
      const s = new Option().style;
      s.color = color;
      if (s.color) {
        // canvas を使用してHEX形式に変換
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        return ctx.fillStyle;
      }
    } catch (e) {
      console.warn('Invalid color value:', color);
    }

    return null;
  }

  // カラー入力の処理を改善
  function setupColorInputs() {
    const colorConfigs = [
      {
        screenType: 'startScreen',
        properties: [
          { inputId: 'startScreen-backgroundColor', settingKey: 'backgroundColor' },
          { inputId: 'startScreen-textColor', settingKey: 'textColor' },
          { inputId: 'startScreen-buttonColor', settingKey: 'buttonColor' }
        ]
      },
      {
        screenType: 'loadingScreen',
        properties: [
          { inputId: 'loadingScreen-backgroundColor', settingKey: 'backgroundColor' },
          { inputId: 'loadingScreen-textColor', settingKey: 'textColor' }
        ]
      },
      {
        screenType: 'guideScreen',
        properties: [
          { inputId: 'guideScreen-backgroundColor', settingKey: 'backgroundColor' },
          { inputId: 'guideScreen-textColor', settingKey: 'textColor' }
        ]
      }
    ];

    colorConfigs.forEach(config => {
      config.properties.forEach(prop => {
        const picker = document.getElementById(prop.inputId);
        const text = document.getElementById(`${prop.inputId}Text`);

        if (!picker || !text) {
          console.warn(`Color input elements not found: ${prop.inputId}`);
          return;
        }

        // 初期値の設定
        const currentValue = currentSettings[config.screenType]?.[prop.settingKey];
        if (currentValue) {
          picker.value = currentValue;
          text.value = currentValue;
        }

        // カラーピッカーの変更イベント
        picker.addEventListener('input', (e) => {
          const value = e.target.value;
          text.value = value;
          if (currentSettings[config.screenType]) {
            currentSettings[config.screenType][prop.settingKey] = value;
            updatePreview(config.screenType);
          }
        });

        // テキスト入力の変更イベント
        text.addEventListener('input', (e) => {
          let value = e.target.value;
          if (!value.startsWith('#')) {
            value = '#' + value;
          }
          picker.value = value;
          if (currentSettings[config.screenType]) {
            currentSettings[config.screenType][prop.settingKey] = value;
            updatePreview(config.screenType);
          }
        });
      });
    });
  }

  // テキスト入力の処理
  function setupTextInputs() {
    console.log('テキスト入力の設定を開始...');
    
    // スタート画面のテキスト入力
    const startScreenInputs = {
      title: document.getElementById('startScreen-title'),
      buttonText: document.getElementById('startScreen-buttonText')
    };

    // 各入力フィールドにイベントリスナーを設定
    Object.entries(startScreenInputs).forEach(([key, input]) => {
      if (!input) {
        console.error(`入力フィールドが見つかりません: ${key}`);
        return;
      }

      // 入力イベントのリスナーを設定
      input.addEventListener('input', (e) => {
        console.log(`${key}の値が変更されました:`, e.target.value);
        
        // currentSettingsを更新
        if (!currentSettings.startScreen) {
          currentSettings.startScreen = {};
        }
        currentSettings.startScreen[key] = e.target.value;
        
        // プレビューを更新
        updatePreview('startScreen');
        
        // 設定を保存
        mockAPI.saveSettings(currentSettings).catch(error => {
          console.error('設定の保存に失敗しました:', error);
        });
      });
    });

    // ローディング画面のテキスト入力
    const loadingScreenInputs = {
      brandName: document.getElementById('loadingScreen-brandName'),
      subTitle: document.getElementById('loadingScreen-subTitle'),
      loadingMessage: document.getElementById('loadingScreen-loadingMessage')
    };

    Object.entries(loadingScreenInputs).forEach(([key, input]) => {
      if (input) {
        input.addEventListener('input', (e) => {
          currentSettings.loadingScreen[key] = e.target.value;
          updatePreview('loadingScreen');
          mockAPI.saveSettings(currentSettings).catch(error => {
            console.error('設定の保存に失敗しました:', error);
          });
        });
      }
    });

    // ガイド画面のテキスト入力
    const guideScreenInputs = {
      title: document.getElementById('guideScreen-title'),
      description: document.getElementById('guideScreen-description')
    };

    Object.entries(guideScreenInputs).forEach(([key, input]) => {
      if (input) {
        input.addEventListener('input', (e) => {
          currentSettings.guideScreen[key] = e.target.value;
          updatePreview('guideScreen');
          mockAPI.saveSettings(currentSettings).catch(error => {
            console.error('設定の保存に失敗しました:', error);
          });
        });
      }
    });
  }

  // ファイルドロップゾーンの処理
  function setupFileDropzones() {
    const dropzones = document.querySelectorAll('.loading-screen-editor__file-preview');
    
    dropzones.forEach(dropzone => {
      const fileInput = dropzone.querySelector('.loading-screen-editor__file-input');
      const dropZoneElement = dropzone.querySelector('.loading-screen-editor__drop-zone');
      const removeButton = dropzone.querySelector('.loading-screen-editor__remove-button');
      const screenType = dropzone.id === 'thumbnailDropzone' ? 'startScreen' : 'loadingScreen';
      const imageType = dropzone.id === 'thumbnailDropzone' ? 'thumbnail' : 'logo';

      if (!fileInput || !dropZoneElement || !removeButton) {
        console.warn(`Missing required elements in dropzone: ${imageType}`);
        return;
      }

      // クリックでファイル選択を開く
      dropZoneElement.addEventListener('click', () => {
        fileInput.click();
      });

      // ファイル選択時の処理
      fileInput.addEventListener('change', (e) => {
        handleFileSelection(e.target.files[0], screenType, imageType, dropZoneElement, removeButton);
      });

      // ドラッグ&ドロップイベントの設定
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZoneElement.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        dropZoneElement.addEventListener(eventName, () => {
          dropZoneElement.classList.add('loading-screen-editor__drop-zone--dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropZoneElement.addEventListener(eventName, () => {
          dropZoneElement.classList.remove('loading-screen-editor__drop-zone--dragover');
        });
      });

      // ドロップ時の処理
      dropZoneElement.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        handleFileSelection(file, screenType, imageType, dropZoneElement, removeButton);
      });

      // 削除ボタンの処理
      removeButton.addEventListener('click', () => {
        fileInput.value = '';
        dropZoneElement.style.backgroundImage = 'none';
        removeButton.style.display = 'none';
        currentSettings[screenType][imageType] = null;
        updatePreview(screenType);
      });
    });
  }

  // ファイル選択の処理を共通化
  function handleFileSelection(file, screenType, imageType, dropZoneElement, removeButton) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください。');
      return;
    }

    if (file.size > thumbnailLimits.maxSize) {
      alert(`ファイルサイズは${thumbnailLimits.maxSize / 1024 / 1024}MB以下にしてください。`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target.result;
      dropZoneElement.style.backgroundImage = `url(${imageUrl})`;
      dropZoneElement.style.backgroundSize = 'cover';
      dropZoneElement.style.backgroundPosition = 'center';
      removeButton.style.display = 'block';
      
      currentSettings[screenType][imageType] = imageUrl;
      updatePreview(screenType);
    };
    reader.readAsDataURL(file);
  }

  // 向き切り替えの処理 - 修正版
  function setupOrientationToggle() {
    const buttons = document.querySelectorAll('.loading-screen-editor__orientation-button');
    const frame = document.querySelector('.loading-screen-editor__phone-frame');
    const container = document.querySelector('.loading-screen-editor__phone-container');
    const previewScreen = document.querySelector('.loading-screen-editor__preview-screen');

    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // 他のボタンからアクティブクラスを削除
        buttons.forEach(b => b.classList.remove('loading-screen-editor__orientation-button--active'));
        button.classList.add('loading-screen-editor__orientation-button--active');

        const isLandscape = button.dataset.orientation === 'landscape';
        
        // 現在のスクロール位置を保存
        const scrollTop = window.scrollY;
        
        // コンテンツを一時的に非表示
        previewScreen.style.opacity = '0';
        
        // コンテナの高さを固定して画面ジャンプを防止
        container.style.height = `${container.offsetHeight}px`;

        if (isLandscape) {
          frame.classList.add('loading-screen-editor__phone-frame--landscape');
          
          // 横向きレイアウトの構築
          setTimeout(() => {
            // 既存のコンテンツを非表示
            const elements = previewScreen.children;
            Array.from(elements).forEach(el => {
              el.style.display = 'none';
            });

            // 2カラムレイアウトの作成
            const leftColumn = document.createElement('div');
            leftColumn.className = 'loading-screen-editor__preview-column loading-screen-editor__preview-column--left';
            
            const rightColumn = document.createElement('div');
            rightColumn.className = 'loading-screen-editor__preview-column loading-screen-editor__preview-column--right';

            // 要素の再配置
            const logo = previewScreen.querySelector('.loading-screen-editor__preview-logo');
            const title = previewScreen.querySelector('.loading-screen-editor__preview-title');
            const subtitle = previewScreen.querySelector('.loading-screen-editor__preview-subtitle');
            const progress = previewScreen.querySelector('.loading-screen-editor__preview-progress');
            const message = previewScreen.querySelector('.loading-screen-editor__preview-message');

            if (logo) leftColumn.appendChild(logo.cloneNode(true));
            if (title) leftColumn.appendChild(title.cloneNode(true));
            if (subtitle) leftColumn.appendChild(subtitle.cloneNode(true));
            if (progress) rightColumn.appendChild(progress.cloneNode(true));
            if (message) rightColumn.appendChild(message.cloneNode(true));

            previewScreen.appendChild(leftColumn);
            previewScreen.appendChild(rightColumn);

            // スタイルの適用
            previewScreen.style.flexDirection = 'row';
            previewScreen.style.justifyContent = 'space-between';
            previewScreen.style.padding = '32px';
            previewScreen.style.gap = '32px';
            previewScreen.style.opacity = '1';

            // スクロール位置を復元
            window.scrollTo(0, scrollTop);
            
            // コンテナの高さ制限を解除
            setTimeout(() => {
              container.style.height = '';
            }, 300);
          }, 300);
        } else {
          frame.classList.remove('loading-screen-editor__phone-frame--landscape');
          
          // 縦向きレイアウトの復元
          setTimeout(() => {
            // カラムの削除
            const columns = previewScreen.querySelectorAll('.loading-screen-editor__preview-column');
            columns.forEach(col => col.remove());

            // 元の要素を表示
            const elements = previewScreen.children;
            Array.from(elements).forEach(el => {
              el.style.display = '';
            });

            // スタイルの適用
            previewScreen.style.flexDirection = 'column';
            previewScreen.style.justifyContent = 'center';
            previewScreen.style.padding = '20px';
            previewScreen.style.gap = '16px';
            previewScreen.style.opacity = '1';

            // スクロール位置を復元
            window.scrollTo(0, scrollTop);
            
            // コンテナの高さ制限を解除
            setTimeout(() => {
              container.style.height = '';
            }, 300);
          }, 300);
        }
      });
    });

    // 初期状態でPortraitボタンをアクティブに
    const portraitButton = document.querySelector('.loading-screen-editor__orientation-button[data-orientation="portrait"]');
    if (portraitButton) {
      portraitButton.classList.add('loading-screen-editor__orientation-button--active');
    }
  }

  // ボタンの処理
  function setupButtons() {
    const cancelButton = document.getElementById('cancelButton');
    const saveButton = document.getElementById('saveButton');

    cancelButton.addEventListener('click', () => {
      if (confirm('変更を破棄してエディタを閉じますか？')) {
        cleanup();
      }
    });

    saveButton.addEventListener('click', async () => {
      try {
        await mockAPI.saveSettings(currentSettings);
        alert('設定を保存しました');
        cleanup();
      } catch (error) {
        console.error('Failed to save settings:', error);
        alert('設定の保存に失敗しました');
      }
    });

    // リセットボタンのイベントリスナー設定
    const resetButtons = {
      'reset-start-settings': 'startScreen',
      'reset-loading-settings': 'loadingScreen',
      'reset-guide-settings': 'guideScreen'
    };

    Object.entries(resetButtons).forEach(([buttonId, screenType]) => {
      const button = document.getElementById(buttonId);
      if (button) {
        button.addEventListener('click', () => {
          if (confirm('Are you sure you want to reset the settings to default?')) {
            currentSettings[screenType] = { ...defaultSettings[screenType] };
            updateFormValues();
            updatePreviewPanel();
          }
        });
      }
    });
  }

  // プレビューの更新 - 修正版
  function updatePreview(screenType = 'startScreen') {
    console.log('プレビュー更新開始:', screenType);
    
    // プレビュー画面の要素を取得
    const previewScreen = document.querySelector('.loading-screen-editor__preview-screen');
    if (!previewScreen) {
      console.error('プレビュー画面が見つかりません');
      return;
    }

    // 全てのプレビュー画面を非表示
    const allScreens = [
      '.loading-screen-editor__preview-start-screen',
      '.loading-screen-editor__preview-loading-screen',
      '.loading-screen-editor__preview-guide-screen'
    ];
    
    allScreens.forEach(selector => {
      const screen = previewScreen.querySelector(selector);
      if (screen) {
        screen.style.display = 'none';
      }
    });

    // 対応する画面を表示
    let targetScreen;
    switch (screenType) {
      case 'startScreen':
        targetScreen = previewScreen.querySelector('.loading-screen-editor__preview-start-screen');
        if (targetScreen) {
          targetScreen.style.display = 'flex';
          updateStartPreview(targetScreen, currentSettings.startScreen);
        }
        break;
      case 'loadingScreen':
        targetScreen = previewScreen.querySelector('.loading-screen-editor__preview-loading-screen');
        if (targetScreen) {
          targetScreen.style.display = 'flex';
          updateLoadingPreview(targetScreen, currentSettings.loadingScreen);
        }
        break;
      case 'guideScreen':
        targetScreen = previewScreen.querySelector('.loading-screen-editor__preview-guide-screen');
        if (targetScreen) {
          targetScreen.style.display = 'flex';
          updateGuidePreview(targetScreen, currentSettings.guideScreen);
        }
        break;
    }
  }

  function updateStartPreview(screen, settings = {}) {
    console.log('スタート画面の更新:', settings);
    
    const elements = {
      background: screen.querySelector('.loading-screen-editor__preview-background'),
      title: screen.querySelector('.loading-screen-editor__preview-title'),
      button: screen.querySelector('.loading-screen-editor__preview-button')
    };

    // 要素の存在確認とスタイル適用
    if (elements.background) {
      elements.background.style.backgroundColor = settings.backgroundColor || defaultSettings.startScreen.backgroundColor;
    }

    if (elements.title) {
      elements.title.textContent = settings.title || defaultSettings.startScreen.title;
      elements.title.style.color = settings.textColor || defaultSettings.startScreen.textColor;
    }

    if (elements.button) {
      elements.button.textContent = settings.buttonText || defaultSettings.startScreen.buttonText;
      elements.button.style.backgroundColor = settings.buttonColor || defaultSettings.startScreen.buttonColor;
      elements.button.style.color = settings.textColor || defaultSettings.startScreen.textColor;
    }
  }

  function updateLoadingPreview(screen, settings = {}) {
    console.log('ローディング画面の更新:', settings);
    
    const elements = {
      logo: screen.querySelector('.loading-screen-editor__preview-logo'),
      title: screen.querySelector('.loading-screen-editor__preview-title'),
      subtitle: screen.querySelector('.loading-screen-editor__preview-subtitle'),
      message: screen.querySelector('.loading-screen-editor__preview-message'),
      progress: screen.querySelector('.loading-screen-editor__preview-progress')
    };

    // 要素の存在確認とスタイル適用
    if (elements.logo) {
      elements.logo.style.display = settings.logo ? 'block' : 'none';
      if (settings.logo) {
        elements.logo.style.backgroundImage = `url(${settings.logo})`;
        elements.logo.style.backgroundSize = 'contain';
        elements.logo.style.backgroundPosition = 'center';
        elements.logo.style.backgroundRepeat = 'no-repeat';
      }
    }

    if (elements.progress) {
      elements.progress.style.display = 'block';
      const progressBar = elements.progress.querySelector('.loading-screen-editor__preview-progress-bar');
      if (progressBar) {
        progressBar.style.backgroundColor = validateAndFixColor(settings.accentColor);
      }
    }

    if (elements.title) {
      elements.title.textContent = settings.brandName || defaultSettings.loadingScreen.brandName;
    }
    if (elements.subtitle) {
      elements.subtitle.textContent = settings.subTitle || defaultSettings.loadingScreen.subTitle;
    }
    if (elements.message) {
      elements.message.textContent = settings.loadingMessage || defaultSettings.loadingScreen.loadingMessage;
    }
  }

  function updateGuidePreview(screen, settings = {}) {
    console.log('ガイド画面の更新:', settings);
    
    const elements = {
      title: screen.querySelector('.loading-screen-editor__preview-title'),
      subtitle: screen.querySelector('.loading-screen-editor__preview-subtitle')
    };

    // 要素の存在確認とスタイル適用
    if (elements.title) {
      elements.title.textContent = settings.title || defaultSettings.guideScreen.title;
    }
    if (elements.subtitle) {
      elements.subtitle.textContent = settings.description || defaultSettings.guideScreen.description;
    }
  }

  // デフォルトプレビュー表示
  function applyDefaultPreview(previewScreen, elements) {
    if (elements.title) elements.title.textContent = 'Preview';
    if (elements.subtitle) elements.subtitle.textContent = 'Loading...';
    if (elements.message) elements.message.style.display = 'none';
    if (elements.progress) elements.progress.style.display = 'none';
    if (elements.logo) elements.logo.style.display = 'none';
    
    previewScreen.style.backgroundColor = '#121212';
    previewScreen.style.color = '#ffffff';
  }

  // 設定の読み込みを改善
  async function loadSettings() {
    try {
      // ローディング状態を表示
      const editor = document.querySelector('.loading-screen-editor');
      if (editor) {
        editor.classList.add('loading-screen-editor--loading');
      }
      
      // デフォルト値で初期化
      currentSettings = JSON.parse(JSON.stringify(defaultSettings));
      
      // 保存された設定を読み込んでマージ
      const savedSettings = await mockAPI.getSettings();
      currentSettings = mockAPI.mergeWithDefaults(savedSettings);
      
      // UIを更新
      updateFormValues();
      updatePreview();
    } catch (error) {
      console.error('Failed to load settings:', error);
      // エラー時はデフォルト値を使用
      currentSettings = JSON.parse(JSON.stringify(defaultSettings));
    } finally {
      // ローディング状態を解除
      const editor = document.querySelector('.loading-screen-editor');
      if (editor) {
        editor.classList.remove('loading-screen-editor--loading');
      }
    }
  }

  // フォーム値の更新処理を追加
  function updateFormValues() {
    // 各画面タイプの入力要素を更新
    ['startScreen', 'loadingScreen', 'guideScreen'].forEach(screenType => {
      const settings = currentSettings[screenType];
      if (!settings) return;
      
      // テキスト入力の更新
      Object.entries(settings).forEach(([key, value]) => {
        const input = document.getElementById(key);
        if (input) {
          if (input.type === 'color') {
            input.value = validateAndFixColor(value);
            const textInput = document.getElementById(`${key}Text`);
            if (textInput) {
              textInput.value = validateAndFixColor(value);
            }
          } else {
            input.value = value || '';
          }
        }
      });
    });
  }

  // クリーンアップ
  function cleanup() {
    const editor = document.querySelector('.loading-screen-editor');
    if (editor) {
      editor.remove();
    }
  }

  // レイアウト検証関数の追加
  function verifyLayout() {
    console.log('レイアウト検証を開始...');
    
    // 主要な要素の存在チェック
    const elements = [
      '.loading-screen-editor',
      '.loading-screen-editor__main-tabs',
      '.loading-screen-editor__main-tab',
      '.loading-screen-editor__main-content',
      '.loading-screen-editor__preview-panel',
      '.loading-screen-editor__phone-frame'
    ];
    
    elements.forEach(selector => {
      const element = document.querySelector(selector);
      console.log(`要素 ${selector}: ${element ? '存在します' : '見つかりません'}`);
      if (element) {
        console.log(` - サイズ: ${element.offsetWidth}x${element.offsetHeight}`);
        console.log(` - 表示状態: ${window.getComputedStyle(element).display}`);
      }
    });
    
    // アクティブタブの確認
    const activeTab = document.querySelector('.loading-screen-editor__main-tab--active');
    if (activeTab) {
      console.log('アクティブなタブ:', activeTab.dataset.tab);
      // 対応するコンテンツが表示されているか確認
      const activeContent = document.querySelector('.loading-screen-editor__main-content--active');
      console.log('アクティブなコンテンツ:', activeContent ? activeContent.dataset.tab : 'なし');
    }
  }

  // エディタの初期化
  initializeEditor();

  // クリーンアップ関数を返す
  return cleanup;
}

// カラー調整ヘルパー関数
function adjustColor(hex, percent) {
  let r = parseInt(hex.substring(1,3), 16);
  let g = parseInt(hex.substring(3,5), 16);
  let b = parseInt(hex.substring(5,7), 16);

  r = Math.max(0, Math.min(255, r + (r * percent / 100)));
  g = Math.max(0, Math.min(255, g + (g * percent / 100)));
  b = Math.max(0, Math.min(255, b + (b * percent / 100)));

  const rr = Math.round(r).toString(16).padStart(2, '0');
  const gg = Math.round(g).toString(16).padStart(2, '0');
  const bb = Math.round(b).toString(16).padStart(2, '0');

  return `#${rr}${gg}${bb}`;
}

// HEX to RGB変換ヘルパー関数
function hexToRgb(hex) {
  const r = parseInt(hex.substring(1,3), 16);
  const g = parseInt(hex.substring(3,5), 16);
  const b = parseInt(hex.substring(5,7), 16);
  return `${r}, ${g}, ${b}`;
}

// スライダーコンポーネントの初期化
function initializeSliders() {
  const sliders = document.querySelectorAll('.loading-screen-editor__slider');
  sliders.forEach(slider => {
    const valueDisplay = slider.nextElementSibling;
    const updateValue = () => {
      valueDisplay.textContent = `${slider.value}${slider.dataset.unit || ''}`;
      updatePreview(slider.dataset.target);
    };

    slider.addEventListener('input', updateValue);
    slider.addEventListener('change', () => {
      updateValue();
      saveSettings();
    });

    // 初期値を設定
    updateValue();
  });
}

// テキストスタイル選択の初期化
function initializeStyleSelector() {
  const styleOptions = document.querySelectorAll('.loading-screen-editor__style-option');
  styleOptions.forEach(option => {
    option.addEventListener('click', () => {
      // アクティブなスタイルを更新
      styleOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');

      // 設定を更新
      const styleType = option.dataset.style;
      currentSettings.textStyle = styleType;
      updatePreview('text');
      saveSettings();
    });
  });
}

// カラーピッカーの初期化
function initializeColorPickers() {
  const colorPickers = document.querySelectorAll('.loading-screen-editor__color-picker');
  colorPickers.forEach(picker => {
    picker.addEventListener('input', () => {
      const target = picker.dataset.target;
      currentSettings[target] = picker.value;
      updatePreview(target);
    });

    picker.addEventListener('change', () => {
      saveSettings();
    });
  });
}

// サムネイル画像のドラッグ&ドロップ処理
function initializeThumbnailUpload() {
  const dropZone = document.querySelector('.loading-screen-editor__drop-zone');
  const fileInput = document.querySelector('.loading-screen-editor__file-input');

  // ドラッグ&ドロップイベントの設定
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // ドラッグ中のスタイル変更
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('drag-active');
    });
  });

  // ファイルドロップ時の処理
  dropZone.addEventListener('drop', handleDrop);
  fileInput.addEventListener('change', handleFileSelect);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
  }

  function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
  }

  function handleFiles(files) {
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          currentSettings.thumbnailImage = e.target.result;
          updateThumbnailPreview();
          saveSettings();
        };
        reader.readAsDataURL(file);
      } else {
        showError('画像ファイルのみアップロード可能です。');
      }
    }
  }
}

// サムネイル画像のプレビュー更新
function updateThumbnailPreview() {
  const preview = document.querySelector('.loading-screen-editor__file-preview');
  if (currentSettings.thumbnailImage) {
    preview.innerHTML = `
      <img src="${currentSettings.thumbnailImage}" alt="サムネイル" style="width: 100%; height: 100%; object-fit: cover;">
      <button class="loading-screen-editor__remove-button" onclick="removeThumbnail()">×</button>
    `;
  } else {
    preview.innerHTML = createDropZoneContent();
  }
}

// サムネイル画像の削除
function removeThumbnail() {
  currentSettings.thumbnailImage = null;
  updateThumbnailPreview();
  saveSettings();
}

// リセットボタンの処理
function initializeResetButton() {
  const resetButton = document.querySelector('.loading-screen-editor__reset-button');
  resetButton.addEventListener('click', () => {
    if (confirm('全ての設定を初期値に戻しますか？')) {
      currentSettings = { ...defaultSettings };
      updateAllPreviews();
      saveSettings();
    }
  });
}

// エラーメッセージの表示
function showError(message) {
  const errorContainer = document.createElement('div');
  errorContainer.className = 'loading-screen-editor__error';
  errorContainer.textContent = message;
  document.body.appendChild(errorContainer);

  setTimeout(() => {
    errorContainer.remove();
  }, 3000);
}

// 全てのプレビューの更新
function updateAllPreviews() {
  updatePreview('text');
  updatePreview('color');
  updatePreview('size');
  updateThumbnailPreview();
}

// 初期化関数
function initializeEditor() {
  initializeSliders();
  initializeStyleSelector();
  initializeColorPickers();
  initializeThumbnailUpload();
  initializeResetButton();
  loadSettings();
  updateAllPreviews();
}

// DOMの読み込み完了時に初期化を実行
document.addEventListener('DOMContentLoaded', initializeEditor);