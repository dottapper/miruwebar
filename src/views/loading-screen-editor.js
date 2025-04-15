/**
 * ローディング画面エディタコンポーネント
 */

import '../styles/loading-screen-editor.css';

export default function showLoadingScreenEditor(container) {
  // デフォルト設定の定義を改善
  const defaultSettings = {
    startScreen: {
      title: 'Start Experience',
      buttonText: 'Start',
      buttonColor: '#6c5ce7',
      thumbnail: null,
      backgroundColor: '#121212',
      textColor: '#ffffff',
      accentColor: '#6c5ce7'
    },
    loadingScreen: {
      backgroundColor: '#121212',
      textColor: '#ffffff',
      accentColor: '#6c5ce7',
      logo: null,
      brandName: 'Your Brand',
      subTitle: 'Experience AR',
      loadingMessage: 'Loading...',
      fontScale: 1,
      animation: 'fade'
    },
    guideScreen: {
      backgroundColor: '#121212',
      textColor: '#ffffff',
      accentColor: '#6c5ce7',
      title: 'Guide Screen',
      description: 'Coming Soon'
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
      <div class="loading-screen-editor__content-section">
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">Background Color</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="startScreen-backgroundColor" value="${currentSettings.startScreen.backgroundColor}">
            <input type="text" class="loading-screen-editor__input" id="startScreen-backgroundColorText" value="${currentSettings.startScreen.backgroundColor}">
          </div>
        </div>
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">Text Color</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="startScreen-textColor" value="${currentSettings.startScreen.textColor}">
            <input type="text" class="loading-screen-editor__input" id="startScreen-textColorText" value="${currentSettings.startScreen.textColor}">
          </div>
        </div>
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">Start Title</label>
          <input type="text" class="loading-screen-editor__input" id="startScreen-title" value="${currentSettings.startScreen.title || ''}">
        </div>
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">Button Text</label>
          <input type="text" class="loading-screen-editor__input" id="startScreen-buttonText" value="${currentSettings.startScreen.buttonText || ''}">
        </div>
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">Button Color</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="startScreen-buttonColor" value="${currentSettings.startScreen.buttonColor}">
            <input type="text" class="loading-screen-editor__input" id="startScreen-buttonColorText" value="${currentSettings.startScreen.buttonColor}">
          </div>
        </div>
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">Thumbnail Image</label>
          <div class="loading-screen-editor__file-preview" id="thumbnailDropzone">
            <input type="file" class="loading-screen-editor__file-input" accept="image/*" style="display: none;">
            <div class="loading-screen-editor__drop-zone">
              <div class="loading-screen-editor__drop-zone-icon">📁</div>
              <div class="loading-screen-editor__drop-zone-text">Drop your thumbnail here</div>
              <div class="loading-screen-editor__drop-zone-subtext">or click to select</div>
              <div class="loading-screen-editor__supported-formats">
                Supported: PNG, JPG, WebP (Max: 2MB)
              </div>
            </div>
            <button class="loading-screen-editor__remove-button" style="display: none;">Remove Image</button>
          </div>
        </div>
      </div>
    `;
  }

  function createGeneralTabContent() {
    return `
      <div class="loading-screen-editor__content-section">
        <div class="loading-screen-editor__reset-container">
          <button class="loading-screen-editor__button loading-screen-editor__button--outline" id="reset-loading-settings">
            Reset to Default
          </button>
        </div>
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">Background Color</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="loadingScreen-backgroundColor" value="${currentSettings.loadingScreen.backgroundColor}">
            <input type="text" class="loading-screen-editor__input" id="loadingScreen-backgroundColorText" value="${currentSettings.loadingScreen.backgroundColor}">
          </div>
        </div>
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">Text Color</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="loadingScreen-textColor" value="${currentSettings.loadingScreen.textColor}">
            <input type="text" class="loading-screen-editor__input" id="loadingScreen-textColorText" value="${currentSettings.loadingScreen.textColor}">
          </div>
        </div>
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">Logo</label>
          <div class="loading-screen-editor__file-preview" id="logoDropzone">
            <input type="file" class="loading-screen-editor__file-input" accept="image/*" style="display: none;">
            <div class="loading-screen-editor__drop-zone">
              <div class="loading-screen-editor__drop-zone-icon">📁</div>
              <div class="loading-screen-editor__drop-zone-text">Drop your logo here</div>
              <div class="loading-screen-editor__drop-zone-subtext">or click to select</div>
              <div class="loading-screen-editor__supported-formats">
                Supported: PNG, JPG, WebP (Max: 2MB)
              </div>
            </div>
            <button class="loading-screen-editor__remove-button" style="display: none;">Remove Image</button>
          </div>
        </div>
      </div>
    `;
  }

  function createTextTabContent() {
    return `
      <div class="loading-screen-editor__form-group">
        <label class="loading-screen-editor__label">Brand Name</label>
        <input type="text" class="loading-screen-editor__input" id="brandName" value="${currentSettings.brandName}">
                  </div>
      <div class="loading-screen-editor__form-group">
        <label class="loading-screen-editor__label">Subtitle</label>
        <input type="text" class="loading-screen-editor__input" id="subTitle" value="${currentSettings.subTitle}">
                  </div>
      <div class="loading-screen-editor__form-group">
        <label class="loading-screen-editor__label">Loading Message</label>
        <input type="text" class="loading-screen-editor__input" id="loadingMessage" value="${currentSettings.loadingMessage}">
                </div>
      <div class="loading-screen-editor__form-group">
        <label class="loading-screen-editor__label">Font Scale</label>
        <input type="range" class="loading-screen-editor__input" id="fontScale" min="0.5" max="2" step="0.1" value="${currentSettings.fontScale}">
        <span class="loading-screen-editor__range-value" id="fontScaleValue">${currentSettings.fontScale}x</span>
              </div>
    `;
  }

  function createAnimationTabContent() {
    return `
      <div class="loading-screen-editor__form-group">
        <label class="loading-screen-editor__label">Animation Style</label>
        <select class="loading-screen-editor__input" id="animation">
          <option value="fade" ${currentSettings.animation === 'fade' ? 'selected' : ''}>Fade</option>
          <option value="slide" ${currentSettings.animation === 'slide' ? 'selected' : ''}>Slide</option>
          <option value="zoom" ${currentSettings.animation === 'zoom' ? 'selected' : ''}>Zoom</option>
        </select>
            </div>
    `;
  }

  function createGuideTabContent() {
    return `
      <div class="loading-screen-editor__content-section">
        <div class="loading-screen-editor__reset-container">
          <button class="loading-screen-editor__button loading-screen-editor__button--outline" id="reset-guide-settings">
            Reset to Default
          </button>
        </div>
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">Background Color</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="guideScreen-backgroundColor" value="${currentSettings.guideScreen.backgroundColor}">
            <input type="text" class="loading-screen-editor__input" id="guideScreen-backgroundColorText" value="${currentSettings.guideScreen.backgroundColor}">
          </div>
        </div>
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">Text Color</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="guideScreen-textColor" value="${currentSettings.guideScreen.textColor}">
            <input type="text" class="loading-screen-editor__input" id="guideScreen-textColorText" value="${currentSettings.guideScreen.textColor}">
          </div>
        </div>
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">Accent Color</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="guideScreen-accentColor" value="${currentSettings.guideScreen.accentColor}">
            <input type="text" class="loading-screen-editor__input" id="guideScreen-accentColorText" value="${currentSettings.guideScreen.accentColor}">
          </div>
        </div>
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">Guide Screen Title</label>
          <input type="text" class="loading-screen-editor__input" id="guideScreenTitle" value="${currentSettings.guideScreen.title}">
        </div>
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">Guide Screen Description</label>
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
        Loading Screen Editor
      </div>
      <div class="loading-screen-editor__container">
        <div class="loading-screen-editor__settings-panel">
          <div class="loading-screen-editor__main-tabs">
            <button class="loading-screen-editor__main-tab loading-screen-editor__main-tab--active" data-tab="start">Start Screen</button>
            <button class="loading-screen-editor__main-tab" data-tab="loading">Loading Screen</button>
            <button class="loading-screen-editor__main-tab" data-tab="guide">Guide Screen</button>
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
                <button class="loading-screen-editor__sub-tab loading-screen-editor__sub-tab--active" data-subtab="loading-general">General</button>
                <button class="loading-screen-editor__sub-tab" data-subtab="loading-text">Text</button>
                <button class="loading-screen-editor__sub-tab" data-subtab="loading-animation">Animation</button>
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
            <div class="loading-screen-editor__preview-title">Preview</div>
            <div class="loading-screen-editor__orientation-toggle">
              <button class="loading-screen-editor__orientation-button loading-screen-editor__orientation-button--active" data-orientation="portrait">
                <span>📱</span> Portrait
              </button>
              <button class="loading-screen-editor__orientation-button" data-orientation="landscape">
                <span>📱</span> Landscape
              </button>
            </div>
          </div>
          <div class="loading-screen-editor__phone-container">
            <div class="loading-screen-editor__phone-frame">
              <div class="loading-screen-editor__phone-screen">
                <div class="loading-screen-editor__preview-screen">
                  <div class="loading-screen-editor__preview-logo"></div>
                  <div class="loading-screen-editor__preview-title"></div>
                  <div class="loading-screen-editor__preview-subtitle"></div>
                  <div class="loading-screen-editor__preview-progress">
                    <div class="loading-screen-editor__preview-progress-bar"></div>
                  </div>
                  <div class="loading-screen-editor__preview-message"></div>
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
    // メインタブの処理
    const mainTabs = document.querySelectorAll('.loading-screen-editor__main-tab');
    const mainContents = document.querySelectorAll('.loading-screen-editor__main-content');

    if (mainTabs.length === 0 || mainContents.length === 0) {
      console.error('タブ要素が見つかりません');
      return;
    }

    mainTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
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
          updatePreview(screenType);
        }
      });
    });

    // サブタブの処理
    const subTabs = document.querySelectorAll('.loading-screen-editor__sub-tab');
    const subContents = document.querySelectorAll('.loading-screen-editor__sub-content');

    if (subTabs.length > 0 && subContents.length > 0) {
      subTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
          e.stopPropagation();
          
          console.log('サブタブクリック:', tab.dataset.subtab);
          
          // アクティブ状態をリセット
          subTabs.forEach(t => t.classList.remove('loading-screen-editor__sub-tab--active'));
          subContents.forEach(c => {
            c.classList.remove('loading-screen-editor__sub-content--active');
            c.style.display = 'none';
          });

          // 新しいサブタブをアクティブに
          tab.classList.add('loading-screen-editor__sub-tab--active');
          const subtabName = tab.dataset.subtab;
          
          // サブタブコンテンツを探す
          const subContent = document.querySelector(`.loading-screen-editor__sub-content[data-subtab="${subtabName}"]`);
          
          if (subContent) {
            subContent.style.display = 'block';
            setTimeout(() => {
              subContent.classList.add('loading-screen-editor__sub-content--active');
            }, 10);
            
            // Loading Screen のプレビューを更新
            updatePreview('loadingScreen');
          }
        });
      });
    }
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
    const textInputs = ['brandName', 'subTitle', 'loadingMessage', 'startScreen-title', 'startScreen-buttonText'];

    textInputs.forEach(inputId => {
      const input = document.getElementById(inputId);
      input.addEventListener('input', (e) => {
        currentSettings[inputId] = e.target.value;
        updatePreview();
      });
    });

    // フォントスケールの処理
    const fontScale = document.getElementById('fontScale');
    const fontScaleValue = document.getElementById('fontScaleValue');

    fontScale.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      currentSettings.fontScale = value;
      fontScaleValue.textContent = `${value}x`;
      updatePreview();
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
    
    // 設定オブジェクトの存在確認と初期化
    if (!currentSettings || !currentSettings[screenType]) {
      console.warn(`Settings for ${screenType} not found, initializing...`);
      if (!currentSettings) {
        currentSettings = JSON.parse(JSON.stringify(defaultSettings));
      }
      if (!currentSettings[screenType]) {
        currentSettings[screenType] = { ...defaultSettings[screenType] };
      }
    }

    // プレビュー要素の取得
    const previewScreen = document.querySelector('.loading-screen-editor__preview-screen');
    const frame = document.querySelector('.loading-screen-editor__phone-frame');
    
    if (!previewScreen || !frame) {
      console.error('Preview elements not found');
      return;
    }

    // 現在のスクリーンタイプの設定を取得
    const settings = currentSettings[screenType];
    console.log('Current settings for preview:', settings);

    // プレビュー要素の取得
    const elements = {
      logo: previewScreen.querySelector('.loading-screen-editor__preview-logo'),
      title: previewScreen.querySelector('.loading-screen-editor__preview-title'),
      subtitle: previewScreen.querySelector('.loading-screen-editor__preview-subtitle'),
      message: previewScreen.querySelector('.loading-screen-editor__preview-message'),
      progress: previewScreen.querySelector('.loading-screen-editor__preview-progress')
    };

    // 基本スタイルの適用
    const backgroundColor = validateAndFixColor(settings.backgroundColor) || defaultSettings[screenType].backgroundColor;
    const textColor = validateAndFixColor(settings.textColor) || defaultSettings[screenType].textColor;

    previewScreen.style.backgroundColor = backgroundColor;
    previewScreen.style.color = textColor;

    const isLandscape = frame.classList.contains('loading-screen-editor__phone-frame--landscape');
    
    try {
      // スクリーンタイプに応じた更新処理
      switch (screenType) {
        case 'startScreen':
          updateStartPreview(previewScreen, isLandscape, settings, elements);
          break;
        case 'loadingScreen':
          updateLoadingPreview(previewScreen, isLandscape, settings, elements);
          break;
        case 'guideScreen':
          updateGuidePreview(previewScreen, isLandscape, settings, elements);
          break;
        default:
          console.warn(`Unknown screen type: ${screenType}`);
          updateStartPreview(previewScreen, isLandscape, defaultSettings.startScreen, elements);
      }
    } catch (error) {
      console.error('Error updating preview:', error);
      applyDefaultPreview(previewScreen, elements);
    }
  }

  // Start Screen プレビューの更新を改善
  function updateStartPreview(previewScreen, isLandscape, settings = {}, elements = {}) {
    const {
      backgroundColor = '#121212',
      textColor = '#ffffff',
      buttonColor = '#6c5ce7',
      title = 'Start Experience',
      buttonText = 'Start',
      thumbnail = null
    } = settings;

    // 要素の表示/非表示
    if (elements.logo) elements.logo.style.display = 'none';
    if (elements.progress) elements.progress.style.display = 'none';
    if (elements.message) elements.message.style.display = 'none';

    // タイトルの更新
    if (elements.title) {
      elements.title.textContent = title;
      elements.title.style.fontSize = '24px';
      elements.title.style.fontWeight = 'bold';
      elements.title.style.marginBottom = '20px';
      elements.title.style.textAlign = 'center';
      elements.title.style.color = textColor;
    }

    // サムネイル表示の処理
    if (thumbnail) {
      previewScreen.style.backgroundImage = `url(${thumbnail})`;
      previewScreen.style.backgroundSize = 'cover';
      previewScreen.style.backgroundPosition = 'center';
      
      // オーバーレイの追加
      const existingOverlay = previewScreen.querySelector('.preview-overlay');
      let overlay = existingOverlay;
      
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'preview-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '1';
        previewScreen.appendChild(overlay);
      }

      // コンテンツを前面に
      if (elements.title) {
        elements.title.style.position = 'relative';
        elements.title.style.zIndex = '2';
        elements.title.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.5)';
      }
    } else {
      previewScreen.style.backgroundImage = 'none';
      previewScreen.style.backgroundColor = backgroundColor;
      
      // オーバーレイを削除
      const overlay = previewScreen.querySelector('.preview-overlay');
      if (overlay) overlay.remove();
    }

    // ボタンの更新（subtitle要素をボタンとして使用）
    if (elements.subtitle) {
      const validButtonColor = validateAndFixColor(buttonColor) || '#6c5ce7';
      const darkerButtonColor = adjustColor(validButtonColor, -15);
      const lighterButtonColor = adjustColor(validButtonColor, 15);
      
      elements.subtitle.textContent = buttonText || 'Start';
      elements.subtitle.style.position = 'relative';
      elements.subtitle.style.zIndex = '2';
      elements.subtitle.style.display = 'inline-block';
      elements.subtitle.style.padding = '14px 28px';
      elements.subtitle.style.minWidth = '160px';
      elements.subtitle.style.background = `linear-gradient(to bottom, ${validButtonColor}, ${darkerButtonColor})`;
      elements.subtitle.style.color = textColor || '#ffffff';
      elements.subtitle.style.borderRadius = '8px';
      elements.subtitle.style.cursor = 'pointer';
      elements.subtitle.style.fontWeight = '600';
      elements.subtitle.style.fontSize = '16px';
      elements.subtitle.style.letterSpacing = '0.5px';
      elements.subtitle.style.textAlign = 'center';
      elements.subtitle.style.transition = 'all 0.2s ease';
      elements.subtitle.style.border = 'none';
      elements.subtitle.style.boxShadow = `0 4px 6px rgba(${hexToRgb(validButtonColor)}, 0.2), 0 1px 3px rgba(0, 0, 0, 0.1)`;
      elements.subtitle.style.transform = 'translateY(0)';
      elements.subtitle.style.textShadow = thumbnail ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none';
      elements.subtitle.style.marginTop = '20px';

      // ホバーエフェクトの追加
      elements.subtitle.onmouseenter = () => {
        elements.subtitle.style.transform = 'translateY(-2px)';
        elements.subtitle.style.boxShadow = `0 7px 14px rgba(${hexToRgb(validButtonColor)}, 0.25), 0 3px 6px rgba(0, 0, 0, 0.15)`;
        elements.subtitle.style.background = `linear-gradient(to bottom, ${lighterButtonColor}, ${validButtonColor})`;
      };

      elements.subtitle.onmouseleave = () => {
        elements.subtitle.style.transform = 'translateY(0)';
        elements.subtitle.style.boxShadow = `0 4px 6px rgba(${hexToRgb(validButtonColor)}, 0.2), 0 1px 3px rgba(0, 0, 0, 0.1)`;
        elements.subtitle.style.background = `linear-gradient(to bottom, ${validButtonColor}, ${darkerButtonColor})`;
      };

      // クリックエフェクトの追加
      elements.subtitle.onmousedown = () => {
        elements.subtitle.style.transform = 'translateY(1px)';
        elements.subtitle.style.boxShadow = `0 2px 4px rgba(${hexToRgb(validButtonColor)}, 0.2)`;
        elements.subtitle.style.background = `linear-gradient(to bottom, ${darkerButtonColor}, ${adjustColor(darkerButtonColor, -10)})`;
      };

      elements.subtitle.onmouseup = () => {
        elements.subtitle.style.transform = 'translateY(-2px)';
        elements.subtitle.style.boxShadow = `0 7px 14px rgba(${hexToRgb(validButtonColor)}, 0.25), 0 3px 6px rgba(0, 0, 0, 0.15)`;
        elements.subtitle.style.background = `linear-gradient(to bottom, ${lighterButtonColor}, ${validButtonColor})`;
      };
    }

    applyLayoutStyles(previewScreen, isLandscape, elements);
  }

  // Loading Screen プレビューの更新
  function updateLoadingPreview(previewScreen, isLandscape, settings = {}, elements = {}) {
    const {
      backgroundColor = '#121212',
      textColor = '#ffffff',
      accentColor = '#6c5ce7',
      logo = null,
      brandName = 'Your Brand',
      subTitle = 'Experience AR',
      loadingMessage = 'Loading...',
      fontScale = 1
    } = settings;

    // ロゴの処理
    if (elements.logo) {
      elements.logo.style.display = logo ? 'block' : 'none';
      if (logo) {
        elements.logo.style.backgroundImage = `url(${logo})`;
        elements.logo.style.backgroundSize = 'contain';
        elements.logo.style.backgroundPosition = 'center';
        elements.logo.style.backgroundRepeat = 'no-repeat';
      }
    }

    // プログレスバーの処理
    if (elements.progress) {
      elements.progress.style.display = 'block';
      const progressBar = elements.progress.querySelector('.loading-screen-editor__preview-progress-bar');
      if (progressBar) {
        progressBar.style.backgroundColor = validateAndFixColor(accentColor);
      }
    }

    // テキスト要素の更新
    if (elements.title) {
      elements.title.textContent = brandName;
      elements.title.style.fontSize = `${24 * fontScale}px`;
    }
    if (elements.subtitle) {
      elements.subtitle.textContent = subTitle;
      elements.subtitle.style.fontSize = `${16 * fontScale}px`;
    }
    if (elements.message) {
      elements.message.textContent = loadingMessage;
      elements.message.style.fontSize = `${14 * fontScale}px`;
    }

    applyLayoutStyles(previewScreen, isLandscape, elements);
  }

  // Guide Screen プレビューの更新
  function updateGuidePreview(previewScreen, isLandscape, settings = {}, elements = {}) {
    const {
      backgroundColor = '#121212',
      textColor = '#ffffff',
      title = 'Guide Screen',
      description = 'Coming Soon'
    } = settings;

    // 要素の表示/非表示
    if (elements.logo) elements.logo.style.display = 'none';
    if (elements.progress) elements.progress.style.display = 'none';
    if (elements.message) elements.message.style.display = 'none';

    // テキスト要素の更新
    if (elements.title) elements.title.textContent = title;
    if (elements.subtitle) elements.subtitle.textContent = description;

    applyLayoutStyles(previewScreen, isLandscape, elements);
  }

  // レイアウトスタイルの適用を共通化
  function applyLayoutStyles(previewScreen, isLandscape, elements) {
    if (isLandscape) {
      previewScreen.style.transform = 'none';
      previewScreen.style.display = 'flex';
      previewScreen.style.flexDirection = 'row';
      previewScreen.style.justifyContent = 'space-between';
      previewScreen.style.padding = '32px';
      previewScreen.style.alignItems = 'center';
      
      // 2カラムレイアウトの適用
      let leftColumn = previewScreen.querySelector('.preview-column-left');
      let rightColumn = previewScreen.querySelector('.preview-column-right');
      
      if (!leftColumn) {
        leftColumn = document.createElement('div');
        leftColumn.className = 'preview-column-left';
        rightColumn = document.createElement('div');
        rightColumn.className = 'preview-column-right';
        
        // 要素の再配置
        if (elements.logo) leftColumn.appendChild(elements.logo);
        if (elements.title) leftColumn.appendChild(elements.title);
        if (elements.subtitle) leftColumn.appendChild(elements.subtitle);
        if (elements.progress) rightColumn.appendChild(elements.progress);
        if (elements.message) rightColumn.appendChild(elements.message);
        
        previewScreen.innerHTML = '';
        previewScreen.appendChild(leftColumn);
        previewScreen.appendChild(rightColumn);
      }
    } else {
      previewScreen.style.transform = 'none';
      previewScreen.style.display = 'flex';
      previewScreen.style.flexDirection = 'column';
      previewScreen.style.justifyContent = 'center';
      previewScreen.style.padding = '20px';
      previewScreen.style.alignItems = 'center';
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