/**
 * ローディング画面エディタコンポーネント
 */

import '../styles/loading-screen-editor.css';

export default function showLoadingScreenEditor(container) {
  // デフォルト設定の定義を改善
  const defaultSettings = {
    startScreen: {
      title: 'Start Experience',
      titlePosition: 25,
      buttonText: 'Start',
      buttonPosition: 75,
      buttonColor: '#6c5ce7',
      buttonTextColor: '#ffffff',
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
      description: 'Coming Soon',
      guideImage: null
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

  // 位置を取得するヘルパー関数を追加
  function getPositionValue(position) {
    // 文字列の場合はパーセントに変換
    if (typeof position === 'string') {
      switch(position) {
        case 'top': return 20;
        case 'center': return 50;
        case 'bottom': return 80;
        default: return 50;
      }
    }
    // 既に数値なら、そのまま返す
    return position || 50;
  }

  // テンプレート定義
  function createStartTabContent() {
    return `
      <div class="loading-screen-editor__content-section">
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">タイトル</label>
          <input type="text" class="loading-screen-editor__input" id="startScreen-title" value="${currentSettings.startScreen.title || ''}" placeholder="タイトルを入力">
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">タイトル位置 (上下)</label>
          <div class="slider-with-value">
            <input type="range" class="loading-screen-editor__input" id="startScreen-titlePosition" 
              min="0" max="100" step="5" value="${currentSettings.startScreen.titlePosition}">
            <span id="titlePosition-value">${currentSettings.startScreen.titlePosition}%</span>
          </div>
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">タイトル色</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="startScreen-textColor" value="${currentSettings.startScreen.textColor || '#ffffff'}">
            <input type="text" class="loading-screen-editor__input" id="startScreen-textColorText" value="${currentSettings.startScreen.textColor || '#ffffff'}">
          </div>
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ボタンテキスト</label>
          <input type="text" class="loading-screen-editor__input" id="startScreen-buttonText" value="${currentSettings.startScreen.buttonText || ''}" placeholder="ボタンのテキストを入力">
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ボタン位置 (上下)</label>
          <div class="slider-with-value">
            <input type="range" class="loading-screen-editor__input" id="startScreen-buttonPosition" 
              min="0" max="100" step="5" value="${currentSettings.startScreen.buttonPosition}">
            <span id="buttonPosition-value">${currentSettings.startScreen.buttonPosition}%</span>
          </div>
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ボタンの色</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="startScreen-buttonColor" value="${currentSettings.startScreen.buttonColor}">
            <input type="text" class="loading-screen-editor__input" id="startScreen-buttonColorText" value="${currentSettings.startScreen.buttonColor}">
          </div>
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ボタンのテキスト色</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="startScreen-buttonTextColor" value="${currentSettings.startScreen.buttonTextColor}">
            <input type="text" class="loading-screen-editor__input" id="startScreen-buttonTextColorText" value="${currentSettings.startScreen.buttonTextColor}">
          </div>
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">背景色</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="startScreen-backgroundColor" value="${currentSettings.startScreen.backgroundColor || '#121212'}">
            <input type="text" class="loading-screen-editor__input" id="startScreen-backgroundColorText" value="${currentSettings.startScreen.backgroundColor || '#121212'}">
          </div>
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">サムネイル画像</label>
          <div class="loading-screen-editor__file-preview" id="startScreen-thumbnail">
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
    `;
  }

  function createLoadingTabContent() {
    return `
      <div class="loading-screen-editor__content-section">
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ロゴ画像</label>
          <div class="loading-screen-editor__file-preview" id="loadingScreen-logo">
            <input type="file" class="loading-screen-editor__file-input" accept="image/*" style="display: none;">
            <div class="loading-screen-editor__drop-zone">
              <div class="loading-screen-editor__drop-zone-icon">📁</div>
              <div class="loading-screen-editor__drop-zone-text">ここにロゴをドロップ</div>
              <div class="loading-screen-editor__drop-zone-subtext">またはクリックして選択</div>
              <div class="loading-screen-editor__supported-formats">
                推奨サイズ: 400x400px以下<br>
                対応形式: PNG, JPG, WebP (最大: 2MB)
              </div>
            </div>
            <button class="loading-screen-editor__remove-button" style="display: none;">×</button>
          </div>
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ブランド名</label>
          <input type="text" class="loading-screen-editor__input" id="loadingScreen-brandName" value="${currentSettings.loadingScreen.brandName || ''}">
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">サブタイトル</label>
          <input type="text" class="loading-screen-editor__input" id="loadingScreen-subTitle" value="${currentSettings.loadingScreen.subTitle || ''}">
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ローディングメッセージ</label>
          <input type="text" class="loading-screen-editor__input" id="loadingScreen-loadingMessage" value="${currentSettings.loadingScreen.loadingMessage || ''}">
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">背景色</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="loadingScreen-backgroundColor" value="${currentSettings.loadingScreen.backgroundColor || '#121212'}">
            <input type="text" class="loading-screen-editor__input" id="loadingScreen-backgroundColorText" value="${currentSettings.loadingScreen.backgroundColor || '#121212'}">
          </div>
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">テキスト色</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="loadingScreen-textColor" value="${currentSettings.loadingScreen.textColor || '#ffffff'}">
            <input type="text" class="loading-screen-editor__input" id="loadingScreen-textColorText" value="${currentSettings.loadingScreen.textColor || '#ffffff'}">
          </div>
        </div>
      </div>
    `;
  }

  function createGuideTabContent() {
    return `
      <div class="loading-screen-editor__content-section">
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">ガイド画像</label>
          <div class="loading-screen-editor__file-preview" id="guideScreen-guideImage">
            <input type="file" class="loading-screen-editor__file-input" accept="image/*" style="display: none;">
            <div class="loading-screen-editor__drop-zone">
              <div class="loading-screen-editor__drop-zone-icon">📁</div>
              <div class="loading-screen-editor__drop-zone-text">ここにガイド画像をドロップ</div>
              <div class="loading-screen-editor__drop-zone-subtext">またはクリックして選択</div>
              <div class="loading-screen-editor__supported-formats">
                推奨サイズ: 1920x1080px以下<br>
                対応形式: PNG, JPG, WebP (最大: 2MB)
              </div>
            </div>
            <button class="loading-screen-editor__remove-button" style="display: none;">×</button>
          </div>
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">タイトル</label>
          <input type="text" class="loading-screen-editor__input" id="guideScreen-title" value="${currentSettings.guideScreen.title || ''}">
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">説明文</label>
          <input type="text" class="loading-screen-editor__input" id="guideScreen-description" value="${currentSettings.guideScreen.description || ''}">
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">背景色</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="guideScreen-backgroundColor" value="${currentSettings.guideScreen.backgroundColor || '#121212'}">
            <input type="text" class="loading-screen-editor__input" id="guideScreen-backgroundColorText" value="${currentSettings.guideScreen.backgroundColor || '#121212'}">
          </div>
        </div>
        
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">テキスト色</label>
          <div class="loading-screen-editor__color-input">
            <input type="color" class="loading-screen-editor__color-picker" id="guideScreen-textColor" value="${currentSettings.guideScreen.textColor || '#ffffff'}">
            <input type="text" class="loading-screen-editor__input" id="guideScreen-textColorText" value="${currentSettings.guideScreen.textColor || '#ffffff'}">
          </div>
        </div>
      </div>
    `;
  }

  function createTextTabContent() {
    return `
      <div class="loading-screen-editor__content-section">
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">フォントサイズ</label>
          <div class="slider-with-value">
            <input type="range" class="loading-screen-editor__input" id="loadingScreen-fontScale" 
              min="0.5" max="2" step="0.1" value="${currentSettings.loadingScreen.fontScale || 1}">
            <span id="fontScale-value">${currentSettings.loadingScreen.fontScale || 1}x</span>
          </div>
        </div>
      </div>
    `;
  }

  function createAnimationTabContent() {
    return `
      <div class="loading-screen-editor__content-section">
        <div class="loading-screen-editor__form-group">
          <label class="loading-screen-editor__label">アニメーションスタイル</label>
          <select class="loading-screen-editor__input" id="loadingScreen-animation">
            <option value="fade" ${currentSettings.loadingScreen.animation === 'fade' ? 'selected' : ''}>フェード</option>
            <option value="slide" ${currentSettings.loadingScreen.animation === 'slide' ? 'selected' : ''}>スライド</option>
            <option value="zoom" ${currentSettings.loadingScreen.animation === 'zoom' ? 'selected' : ''}>ズーム</option>
          </select>
        </div>
      </div>
    `;
  }

  // グローバルな初期化フラグ
  let isInitialized = false;

  function initializeEditor(container) {
    if (!container) {
      console.error('コンテナ要素が見つかりません');
      return;
    }

    console.log('エディタの初期化を開始');
    
    // コンテナの中身を完全にクリア
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    console.log('既存のエディタ要素をクリア');

    const editorHTML = `
      <div class="loading-screen-editor">
        <div class="loading-screen-editor__header">
          ローディング画面エディタ
        </div>
        <div class="loading-screen-editor__container">
          <div class="loading-screen-editor__settings-panel">
            <div class="loading-screen-editor__main-tabs">
              <button class="loading-screen-editor__main-tab loading-screen-editor__main-tab--active" data-tab="start">スタート画面</button>
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
                    ${createLoadingTabContent()}
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
                  <div id="preview-screen" class="loading-screen-editor__preview-screen">
                    <div id="preview-logo" class="loading-screen-editor__preview-logo"></div>
                    <div id="preview-title" class="loading-screen-editor__preview-title"></div>
                    <div id="preview-subtitle" class="loading-screen-editor__preview-subtitle"></div>
                    <button id="preview-button" class="loading-screen-editor__preview-button"></button>
                    <div id="preview-progress" class="loading-screen-editor__preview-progress">
                      <div id="preview-progress-bar" class="loading-screen-editor__preview-progress-bar"></div>
                    </div>
                    <div id="preview-message" class="loading-screen-editor__preview-message"></div>
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
    console.log('新しいエディタのDOM構造を追加しました');

    // 設定の読み込みと初期化処理
    loadSettings().then(() => {
      console.log('設定の読み込みが完了しました:', currentSettings);

      // イベントリスナーの初期化（設定読み込み後に実行）
      initializeEventListeners();

      // 初期タブの表示とプレビュー更新
      const initialTabType = 'start';
      const initialTab = document.querySelector(`.loading-screen-editor__main-tab[data-tab="${initialTabType}"]`);
      const initialContent = document.querySelector(`.loading-screen-editor__main-content[data-tab="${initialTabType}"]`);

      // 他のタブのアクティブ状態を解除
      document.querySelectorAll('.loading-screen-editor__main-tab--active')
        .forEach(t => t.classList.remove('loading-screen-editor__main-tab--active'));
      document.querySelectorAll('.loading-screen-editor__main-content--active')
        .forEach(c => c.classList.remove('loading-screen-editor__main-content--active'));

      if (initialTab && initialContent) {
        initialTab.classList.add('loading-screen-editor__main-tab--active');
        initialContent.classList.add('loading-screen-editor__main-content--active');
        console.log(`初期タブ (${initialTabType}) をアクティブ化`);

        // 初期プレビューを明示的に更新
        updatePreview(initialTabType);
        console.log(`初期プレビュー (${initialTabType}) を更新しました`);
      } else {
        console.error(`初期タブまたはコンテンツ (${initialTabType}) が見つかりません`);
        // フォールバック処理
        const firstTab = document.querySelector('.loading-screen-editor__main-tab');
        if (firstTab) {
          const firstTabType = firstTab.dataset.tab;
          const firstContent = document.querySelector(`.loading-screen-editor__main-content[data-tab="${firstTabType}"]`);
          if (firstContent) {
            firstTab.classList.add('loading-screen-editor__main-tab--active');
            firstContent.classList.add('loading-screen-editor__main-content--active');
            updatePreview(firstTabType);
            console.log(`フォールバック: ${firstTabType} タブを表示`);
          }
        }
      }

      // レイアウト検証
      setTimeout(verifyLayout, 500);

    }).catch(error => {
      console.error("設定の読み込みまたは初期化中にエラーが発生しました:", error);
      // エラー時のフォールバック処理
      currentSettings = JSON.parse(JSON.stringify(defaultSettings));
      initializeEventListeners();

      // デフォルトの初期タブ表示とプレビュー更新
      const initialTabType = 'start';
      const initialTab = document.querySelector(`.loading-screen-editor__main-tab[data-tab="${initialTabType}"]`);
      const initialContent = document.querySelector(`.loading-screen-editor__main-content[data-tab="${initialTabType}"]`);

      if (initialTab && initialContent) {
        initialTab.classList.add('loading-screen-editor__main-tab--active');
        initialContent.classList.add('loading-screen-editor__main-content--active');
        updatePreview(initialTabType);
        console.log(`エラー後のフォールバック: ${initialTabType} タブを表示`);
      }
    });
  }

  // イベントリスナーの初期化を一元化
  function initializeEventListeners() {
    console.log('イベントリスナーの初期化を開始');
    
    // 既存のイベントリスナーを削除（重複防止）
    removeExistingEventListeners();
    
    setupTabHandlers();
    setupOrientationToggle();
    setupButtons();
    setupColorInputs();
    setupTextInputs();
    setupFileDropzones();
    setupPositionControls();
  }

  // 既存のイベントリスナーを削除する関数を追加
  function removeExistingEventListeners() {
    // タブのイベントリスナーを削除
    const mainTabs = document.querySelectorAll('.loading-screen-editor__main-tab');
    const subTabs = document.querySelectorAll('.loading-screen-editor__sub-tab');
    
    mainTabs.forEach(tab => {
      const newTab = tab.cloneNode(true);
      tab.parentNode.replaceChild(newTab, tab);
    });
    
    subTabs.forEach(tab => {
      const newTab = tab.cloneNode(true);
      tab.parentNode.replaceChild(newTab, tab);
    });

    // その他の要素のイベントリスナーを削除
    const inputs = document.querySelectorAll('.loading-screen-editor__input');
    inputs.forEach(input => {
      const newInput = input.cloneNode(true);
      input.parentNode.replaceChild(newInput, input);
    });

    // ボタンのイベントリスナーを削除
    const buttons = document.querySelectorAll('.loading-screen-editor__button');
    buttons.forEach(button => {
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
    });
  }

  // 入力関連のハンドラーを一元化
  function initializeInputHandlers() {
    setupColorInputs();
    setupTextInputs();
    setupFileDropzones();
    setupPositionControls();
    setupOrientationToggle();
  }

  // カラー入力の設定
  function setupColorInputs() {
    const colorInputs = document.querySelectorAll('input[type="color"]');
    colorInputs.forEach(picker => {
      const textInput = document.getElementById(`${picker.id}Text`);
      if (!textInput) return;

      // 初期値の設定
      const [screenType, property] = picker.id.split('-');
      if (currentSettings[screenType] && currentSettings[screenType][property]) {
        const value = currentSettings[screenType][property];
        const validatedValue = validateAndFixColor(value);
        picker.value = validatedValue;
        textInput.value = validatedValue;
      }

      // カラーピッカーの変更イベント
      picker.addEventListener('input', (e) => {
        const value = validateAndFixColor(e.target.value);
        textInput.value = value;
        if (currentSettings[screenType]) {
          currentSettings[screenType][property] = value;
          updatePreview(screenType.replace('Screen', '').toLowerCase());
        }
      });

      // テキスト入力の変更イベント
      textInput.addEventListener('change', (e) => {
        let value = e.target.value;
        if (!value.startsWith('#')) {
          value = '#' + value;
        }
        const validatedValue = validateAndFixColor(value);
        picker.value = validatedValue;
        textInput.value = validatedValue;
        if (currentSettings[screenType]) {
          currentSettings[screenType][property] = validatedValue;
          updatePreview(screenType.replace('Screen', '').toLowerCase());
        }
      });
    });
  }

  // テキスト入力の設定
  function setupTextInputs() {
    const textInputs = document.querySelectorAll('input[type="text"]:not([id$="ColorText"])');
    textInputs.forEach(input => {
      const [screenType, property] = input.id.split('-');
      if (!screenType || !property) return;

      // 初期値の設定
      if (currentSettings[screenType] && currentSettings[screenType][property]) {
        input.value = currentSettings[screenType][property];
      }

      // 変更イベント
      input.addEventListener('input', (e) => {
        if (currentSettings[screenType]) {
          currentSettings[screenType][property] = e.target.value;
          updatePreview(screenType.replace('Screen', '').toLowerCase());
        }
      });
    });
  }

  // 位置コントロールの設定
  function setupPositionControls() {
    const positionInputs = document.querySelectorAll('input[type="range"]');
    positionInputs.forEach(input => {
      const valueDisplay = document.getElementById(`${input.id}-value`);
      if (!valueDisplay) return;

      const [screenType, property] = input.id.split('-');
      if (!screenType || !property) return;

      // 初期値の設定
      if (currentSettings[screenType] && currentSettings[screenType][property] !== undefined) {
        input.value = currentSettings[screenType][property];
        valueDisplay.textContent = `${input.value}%`;
      }

      // 変更イベント
      input.addEventListener('input', (e) => {
        const value = parseInt(e.target.value, 10);
        valueDisplay.textContent = `${value}%`;
        if (currentSettings[screenType]) {
          currentSettings[screenType][property] = value;
          updatePreview(screenType.replace('Screen', '').toLowerCase());
        }
      });
    });
  }

  // 向き切り替えの設定
  function setupOrientationToggle() {
    const buttons = document.querySelectorAll('.loading-screen-editor__orientation-button');
    const frame = document.querySelector('.loading-screen-editor__phone-frame');
    const previewScreen = document.getElementById('preview-screen');

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const isLandscape = button.dataset.orientation === 'landscape';
        
        // アクティブクラスの切り替え
        buttons.forEach(b => b.classList.remove('loading-screen-editor__orientation-button--active'));
        button.classList.add('loading-screen-editor__orientation-button--active');

        // フレームの向きを変更
        frame.style.width = isLandscape ? '580px' : '300px';
        frame.style.height = isLandscape ? '300px' : '580px';
        frame.classList.toggle('loading-screen-editor__phone-frame--landscape', isLandscape);

        // プレビュー画面のレイアウトを調整
        previewScreen.style.flexDirection = isLandscape ? 'row' : 'column';
        previewScreen.style.padding = isLandscape ? '32px' : '20px';
        previewScreen.style.gap = isLandscape ? '32px' : '16px';

        // 現在のタブのプレビューを更新
        const activeTab = document.querySelector('.loading-screen-editor__main-tab--active');
        if (activeTab) {
          updatePreview(activeTab.dataset.tab);
        }
      });
    });
  }

  // タブ切り替えの処理を改善
  function setupTabHandlers() {
    console.log('タブハンドラーの設定を開始');
    
    const mainTabs = document.querySelectorAll('.loading-screen-editor__main-tab');
    const mainContents = document.querySelectorAll('.loading-screen-editor__main-content');
    const subTabs = document.querySelectorAll('.loading-screen-editor__sub-tab');
    const subContents = document.querySelectorAll('.loading-screen-editor__sub-content');

    if (!mainTabs.length || !mainContents.length) {
      console.error('タブ要素が見つかりません');
      return;
    }

    // メインタブの切り替え
    mainTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        // アクティブクラスの切り替え
        mainTabs.forEach(t => t.classList.remove('loading-screen-editor__main-tab--active'));
        mainContents.forEach(c => c.classList.remove('loading-screen-editor__main-content--active'));
        
        tab.classList.add('loading-screen-editor__main-tab--active');
        document.querySelector(`.loading-screen-editor__main-content[data-tab="${targetTab}"]`)
          ?.classList.add('loading-screen-editor__main-content--active');

        // プレビューの更新
        updatePreview(targetTab);
      });
    });

    // サブタブの切り替え
    subTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetSubtab = tab.dataset.subtab;
        
        // アクティブクラスの切り替え
        subTabs.forEach(t => t.classList.remove('loading-screen-editor__sub-tab--active'));
        subContents.forEach(c => c.classList.remove('loading-screen-editor__sub-content--active'));
        
        tab.classList.add('loading-screen-editor__sub-tab--active');
        document.querySelector(`.loading-screen-editor__sub-content[data-subtab="${targetSubtab}"]`)
          ?.classList.add('loading-screen-editor__sub-content--active');

        // プレビューの更新
        updatePreview('loading');
      });
    });
  }

  // プレビューの更新処理を改善
  function updatePreview(screenType) {
    console.log(`プレビューの更新: ${screenType}`);
    
    const previewScreen = document.getElementById('preview-screen');
    if (!previewScreen) return;

    // プレビュー要素の取得
    const elements = {
      logo: document.getElementById('preview-logo'),
      title: document.getElementById('preview-title'),
      subtitle: document.getElementById('preview-subtitle'),
      progress: document.getElementById('preview-progress'),
      progressBar: document.getElementById('preview-progress-bar'),
      message: document.getElementById('preview-message')
    };

    // 現在の設定に基づいてプレビューを更新
    switch(screenType) {
      case 'start':
        updateStartScreenPreview(elements);
        break;
      case 'loading':
        updateLoadingScreenPreview(elements);
        break;
      case 'guide':
        updateGuideScreenPreview(elements);
        break;
    }
  }

  // スタイルリセット関数を追加
  function resetPreviewElementStyles(elements) {
    // プレビュー画面のリセット
    const previewScreen = document.getElementById('preview-screen');
    if (previewScreen) {
      previewScreen.style.backgroundImage = 'none';
      previewScreen.style.backgroundColor = '#000000';
      previewScreen.style.flexDirection = 'column';
      previewScreen.style.padding = '20px';
      previewScreen.style.gap = '16px';
    }

    // タイトルのリセット
    if (elements.title) {
      elements.title.style.position = 'static';
      elements.title.style.top = 'auto';
      elements.title.style.left = 'auto';
      elements.title.style.transform = 'none';
      elements.title.style.width = 'auto';
      elements.title.style.textAlign = 'left';
      elements.title.style.display = 'block';
      elements.title.style.fontSize = '24px';
    }

    // サブタイトルのリセット
    if (elements.subtitle) {
      elements.subtitle.style.position = 'static';
      elements.subtitle.style.top = 'auto';
      elements.subtitle.style.left = 'auto';
      elements.subtitle.style.transform = 'none';
      elements.subtitle.style.display = 'block';
      elements.subtitle.style.backgroundColor = 'transparent';
      elements.subtitle.style.fontSize = '16px';
    }

    // ボタンのリセット
    const button = document.getElementById('preview-button');
    if (button) {
      button.style.position = 'static';
      button.style.top = 'auto';
      button.style.left = 'auto';
      button.style.transform = 'none';
      button.style.display = 'none';
      button.style.padding = '12px 24px';
      button.style.border = 'none';
      button.style.borderRadius = '8px';
      button.style.fontSize = '16px';
      button.style.cursor = 'pointer';
    }

    // その他の要素のリセット
    if (elements.logo) {
      elements.logo.style.display = 'none';
      elements.logo.style.backgroundImage = 'none';
    }
    if (elements.progress) {
      elements.progress.style.display = 'none';
    }
    if (elements.message) {
      elements.message.style.display = 'none';
      elements.message.style.fontSize = '14px';
    }
  }

  // スタート画面のプレビュー更新を改善
  function updateStartScreenPreview(elements) {
    resetPreviewElementStyles(elements);
    const settings = currentSettings.startScreen;
    const {
      backgroundColor = '#121212',
      textColor = '#ffffff',
      buttonColor = '#6c5ce7',
      buttonTextColor = '#ffffff',
      title = 'Start Experience',
      buttonText = 'Start',
      titlePosition = 25,
      buttonPosition = 75,
      thumbnail = null
    } = settings;

    // 背景設定
    const previewScreen = document.getElementById('preview-screen');
    if (thumbnail) {
      previewScreen.style.backgroundImage = `url(${thumbnail})`;
      previewScreen.style.backgroundSize = 'cover';
      previewScreen.style.backgroundPosition = 'center';
    } else {
      previewScreen.style.backgroundImage = 'none';
      previewScreen.style.backgroundColor = backgroundColor;
    }

    // タイトル設定
    if (elements.title) {
      elements.title.textContent = title;
      elements.title.style.color = textColor;
      elements.title.style.position = 'absolute';
      elements.title.style.top = `${titlePosition}%`;
      elements.title.style.transform = 'translateY(-50%)';
      elements.title.style.width = '100%';
      elements.title.style.textAlign = 'center';
    }

    // ボタン設定
    const button = document.getElementById('preview-button');
    if (button) {
      button.textContent = buttonText;
      button.style.backgroundColor = buttonColor;
      button.style.color = buttonTextColor;
      button.style.position = 'absolute';
      button.style.top = `${buttonPosition}%`;
      button.style.left = '50%';
      button.style.transform = 'translate(-50%, -50%)';
      button.style.padding = '12px 24px';
      button.style.border = 'none';
      button.style.borderRadius = '8px';
      button.style.fontSize = '16px';
      button.style.cursor = 'pointer';
      button.style.display = 'block';
    }

    // 他の要素を非表示
    if (elements.logo) elements.logo.style.display = 'none';
    if (elements.subtitle) elements.subtitle.style.display = 'none';
    if (elements.progress) elements.progress.style.display = 'none';
    if (elements.message) elements.message.style.display = 'none';
  }

  // ローディング画面のプレビュー更新を改善
  function updateLoadingScreenPreview(elements) {
    resetPreviewElementStyles(elements);
    const settings = currentSettings.loadingScreen;
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

    // 背景設定
    const previewScreen = document.getElementById('preview-screen');
    previewScreen.style.backgroundImage = 'none';
    previewScreen.style.backgroundColor = backgroundColor;

    // ロゴ設定
    if (elements.logo) {
      if (logo) {
        elements.logo.style.display = 'block';
        elements.logo.style.backgroundImage = `url(${logo})`;
      } else {
        elements.logo.style.display = 'none';
      }
    }

    // テキスト設定
    if (elements.title) {
      elements.title.textContent = brandName;
      elements.title.style.color = textColor;
      elements.title.style.fontSize = `${24 * fontScale}px`;
    }

    if (elements.subtitle) {
      elements.subtitle.textContent = subTitle;
      elements.subtitle.style.color = textColor;
      elements.subtitle.style.fontSize = `${16 * fontScale}px`;
      elements.subtitle.style.display = 'block';
      elements.subtitle.style.backgroundColor = 'transparent';
    }

    // プログレスバー設定
    if (elements.progress) {
      elements.progress.style.display = 'block';
      if (elements.progressBar) {
        elements.progressBar.style.backgroundColor = accentColor;
      }
    }

    // メッセージ設定
    if (elements.message) {
      elements.message.textContent = loadingMessage;
      elements.message.style.color = textColor;
      elements.message.style.fontSize = `${14 * fontScale}px`;
      elements.message.style.display = 'block';
    }
  }

  // ガイド画面のプレビュー更新を改善
  function updateGuideScreenPreview(elements) {
    resetPreviewElementStyles(elements);
    const settings = currentSettings.guideScreen;
    const {
      backgroundColor = '#121212',
      textColor = '#ffffff',
      title = 'Guide Screen',
      description = 'Coming Soon',
      guideImage = null
    } = settings;

    // 背景設定
    const previewScreen = document.getElementById('preview-screen');
    if (guideImage) {
      previewScreen.style.backgroundImage = `url(${guideImage})`;
      previewScreen.style.backgroundSize = 'cover';
      previewScreen.style.backgroundPosition = 'center';
    } else {
      previewScreen.style.backgroundImage = 'none';
      previewScreen.style.backgroundColor = backgroundColor;
    }

    // タイトル設定
    if (elements.title) {
      elements.title.textContent = title;
      elements.title.style.color = textColor;
    }

    // 説明文設定
    if (elements.subtitle) {
      elements.subtitle.textContent = description;
      elements.subtitle.style.color = textColor;
      elements.subtitle.style.display = 'block';
      elements.subtitle.style.backgroundColor = 'transparent';
    }

    // 他の要素を非表示
    if (elements.logo) elements.logo.style.display = 'none';
    if (elements.progress) elements.progress.style.display = 'none';
    if (elements.message) elements.message.style.display = 'none';
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

  // エディタのクリーンアップ処理を改善
  function cleanup() {
    console.log('エディタのクリーンアップを開始');

    // タイマーのクリーンアップ
    const timers = window.setTimeout(() => {}, 0);
    for (let i = 0; i <= timers; i++) {
      window.clearTimeout(i);
    }

    // エディタ要素の取得
    const editor = document.querySelector('.loading-screen-editor');
    if (editor) {
      // ファイル入力のクリーンアップ
      const fileInputs = editor.querySelectorAll('input[type="file"]');
      fileInputs.forEach(input => {
        input.value = '';
      });

      // 画像URLの解放
      const imageElements = editor.querySelectorAll('[style*="background-image"]');
      imageElements.forEach(element => {
        const url = element.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
        if (url && url[1].startsWith('blob:')) {
          URL.revokeObjectURL(url[1]);
        }
        element.style.backgroundImage = 'none';
      });

      // エディタ要素の削除（これにより関連するイベントリスナーも自動的に解放される）
      editor.remove();
      console.log('エディタ要素を削除し、リソースを解放しました');
    }

    // 現在の設定をクリア
    currentSettings = JSON.parse(JSON.stringify(defaultSettings));
  }

  // ボタンの設定
  function setupButtons() {
    console.log('ボタンの設定を開始');
    
    const saveButton = document.getElementById('saveButton');
    const cancelButton = document.getElementById('cancelButton');

    if (saveButton) {
      saveButton.addEventListener('click', async () => {
        try {
          await mockAPI.saveSettings(currentSettings);
          console.log('設定を保存しました');
          // 保存成功時の処理をここに追加
        } catch (error) {
          console.error('設定の保存に失敗しました:', error);
          // エラー処理をここに追加
        }
      });
    }

    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        console.log('キャンセルボタンがクリックされました');
        // キャンセル時の処理をここに追加
        cleanup();
      });
    }
  }

  // 設定の読み込み
  async function loadSettings() {
    try {
      currentSettings = await mockAPI.getSettings();
      console.log('設定を読み込みました:', currentSettings);
      return currentSettings;
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
      return defaultSettings;
    }
  }

  // カラーコードを検証し、不正ならデフォルトを返す関数
  function validateAndFixColor(colorString, defaultColor = '#000000') {
    if (typeof colorString !== 'string') return defaultColor;
    // 簡単なHEX形式チェック (# + 3桁 or 6桁の16進数)
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(colorString)) {
      return colorString;
    }
    // CSSが解釈できる形式かチェック
    const s = new Option().style;
    s.color = colorString;
    if (s.color !== '') {
      try {
        return convertToHexColor(colorString);
      } catch (e) {
        console.warn(`Could not convert color '${colorString}' to hex.`);
        return s.color;
      }
    }
    return defaultColor;
  }

  // ファイルドロップゾーンの設定
  function setupFileDropzones() {
    const dropzones = document.querySelectorAll('.loading-screen-editor__file-preview');
    
    dropzones.forEach(dropzone => {
      const fileInput = dropzone.querySelector('.loading-screen-editor__file-input');
      const removeButton = dropzone.querySelector('.loading-screen-editor__remove-button');
      
      // ドロップゾーンのクリックでファイル選択を開く
      dropzone.addEventListener('click', (e) => {
        if (e.target === dropzone || e.target.closest('.loading-screen-editor__drop-zone')) {
          fileInput.click();
        }
      });

      // ファイル選択時の処理
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          handleFileUpload(file, dropzone);
        }
      });

      // ドラッグ&ドロップイベントの設定
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('loading-screen-editor__file-preview--dragover');
      });

      dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('loading-screen-editor__file-preview--dragover');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('loading-screen-editor__file-preview--dragover');
        
        const file = e.dataTransfer.files[0];
        if (file) {
          handleFileUpload(file, dropzone);
        }
      });

      // 削除ボタンの処理
      if (removeButton) {
        removeButton.addEventListener('click', (e) => {
          e.stopPropagation();
          removeImage(dropzone);
        });
      }
    });
  }

  // ファイルアップロードの処理
  function handleFileUpload(file, dropzone) {
    // ファイルタイプの検証
    if (!thumbnailLimits.allowedTypes.includes(file.type)) {
      showLogoError('対応していないファイル形式です', 'PNG, JPG, WebPのみ対応しています');
      return;
    }

    // ファイルサイズの検証
    if (file.size > thumbnailLimits.maxSize) {
      showLogoError('ファイルサイズが大きすぎます', '2MB以下のファイルを選択してください');
      return;
    }

    // 画像の読み込みと検証
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // 画像サイズの検証
        if (img.width > thumbnailLimits.maxWidth || img.height > thumbnailLimits.maxHeight) {
          showLogoError('画像サイズが大きすぎます', '1920x1080px以下の画像を選択してください');
          return;
        }
        
        // プレビューの表示と設定の更新
        displayImagePreview(dropzone, e.target.result);
        updateSettingsWithImage(dropzone.id, e.target.result);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // 画像プレビューの表示
  function displayImagePreview(dropzone, dataUrl) {
    dropzone.style.backgroundImage = `url(${dataUrl})`;
    dropzone.classList.add('has-image');
    
    const removeButton = dropzone.querySelector('.loading-screen-editor__remove-button');
    if (removeButton) {
      removeButton.style.display = 'block';
    }
  }

  // 画像の削除
  function removeImage(dropzone) {
    resetDropzoneState(dropzone);
    updateSettingsWithImage(dropzone.id, null);
  }

  // ドロップゾーンの状態をリセット
  function resetDropzoneState(dropzone) {
    dropzone.style.backgroundImage = 'none';
    dropzone.classList.remove('has-image');
    
    const removeButton = dropzone.querySelector('.loading-screen-editor__remove-button');
    if (removeButton) {
      removeButton.style.display = 'none';
    }
    
    const fileInput = dropzone.querySelector('.loading-screen-editor__file-input');
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // 設定の更新
  function updateSettingsWithImage(elementId, dataUrl) {
    const [screenType, property] = elementId.split('-');
    if (currentSettings[screenType]) {
      currentSettings[screenType][property] = dataUrl;
      updatePreview(screenType.replace('Screen', '').toLowerCase());
    }
  }

  // エディタの初期化
  initializeEditor(container);

  // クリーンアップ関数を返す
  return cleanup;
}
