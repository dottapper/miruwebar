/**
 * ローディング画面エディタコンポーネント
 */

// デフォルト設定（モックデータとしても使用）
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

// フォントサイズのプリセット
let fontSizePresets = {
  small: 0.8,
  medium: 1.0,
  large: 1.2
};

/**
 * 色名を16進数に変換するマッピング
 */
const colorNameToHex = {
  aliceblue: '#f0f8ff',
  antiquewhite: '#faebd7',
  aqua: '#00ffff',
  aquamarine: '#7fffd4',
  azure: '#f0ffff',
  beige: '#f5f5dc',
  bisque: '#ffe4c4',
  black: '#000000',
  blanchedalmond: '#ffebcd',
  blue: '#0000ff',
  blueviolet: '#8a2be2',
  brown: '#a52a2a',
  burlywood: '#deb887',
  cadetblue: '#5f9ea0',
  chartreuse: '#7fff00',
  chocolate: '#d2691e',
  coral: '#ff7f50',
  cornflowerblue: '#6495ed',
  cornsilk: '#fff8dc',
  crimson: '#dc143c',
  cyan: '#00ffff',
  darkblue: '#00008b',
  darkcyan: '#008b8b',
  darkgoldenrod: '#b8860b',
  darkgray: '#a9a9a9',
  darkgreen: '#006400',
  darkkhaki: '#bdb76b',
  darkmagenta: '#8b008b',
  darkolivegreen: '#556b2f',
  darkorange: '#ff8c00',
  darkorchid: '#9932cc',
  darkred: '#8b0000',
  darksalmon: '#e9967a',
  darkseagreen: '#8fbc8f',
  darkslateblue: '#483d8b',
  darkslategray: '#2f4f4f',
  darkturquoise: '#00ced1',
  darkviolet: '#9400d3',
  deeppink: '#ff1493',
  deepskyblue: '#00bfff',
  dimgray: '#696969',
  dodgerblue: '#1e90ff',
  firebrick: '#b22222',
  floralwhite: '#fffaf0',
  forestgreen: '#228b22',
  fuchsia: '#ff00ff',
  gainsboro: '#dcdcdc',
  ghostwhite: '#f8f8ff',
  gold: '#ffd700',
  goldenrod: '#daa520',
  gray: '#808080',
  green: '#008000',
  greenyellow: '#adff2f',
  honeydew: '#f0fff0',
  hotpink: '#ff69b4',
  indianred: '#cd5c5c',
  indigo: '#4b0082',
  ivory: '#fffff0',
  khaki: '#f0e68c',
  lavender: '#e6e6fa',
  lavenderblush: '#fff0f5',
  lawngreen: '#7cfc00',
  lemonchiffon: '#fffacd',
  lightblue: '#add8e6',
  lightcoral: '#f08080',
  lightcyan: '#e0ffff',
  lightgoldenrodyellow: '#fafad2',
  lightgray: '#d3d3d3',
  lightgreen: '#90ee90',
  lightpink: '#ffb6c1',
  lightsalmon: '#ffa07a',
  lightseagreen: '#20b2aa',
  lightskyblue: '#87cefa',
  lightslategray: '#778899',
  lightsteelblue: '#b0c4de',
  lightyellow: '#ffffe0',
  lime: '#00ff00',
  limegreen: '#32cd32',
  linen: '#faf0e6',
  magenta: '#ff00ff',
  maroon: '#800000',
  mediumaquamarine: '#66cdaa',
  mediumblue: '#0000cd',
  mediumorchid: '#ba55d3',
  mediumpurple: '#9370db',
  mediumseagreen: '#3cb371',
  mediumslateblue: '#7b68ee',
  mediumspringgreen: '#00fa9a',
  mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585',
  midnightblue: '#191970',
  mintcream: '#f5fffa',
  mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5',
  navajowhite: '#ffdead',
  navy: '#000080',
  oldlace: '#fdf5e6',
  olive: '#808000',
  olivedrab: '#6b8e23',
  orange: '#ffa500',
  orangered: '#ff4500',
  orchid: '#da70d6',
  palegoldenrod: '#eee8aa',
  palegreen: '#98fb98',
  paleturquoise: '#afeeee',
  palevioletred: '#db7093',
  papayawhip: '#ffefd5',
  peachpuff: '#ffdab9',
  peru: '#cd853f',
  pink: '#ffc0cb',
  plum: '#dda0dd',
  powderblue: '#b0e0e6',
  purple: '#800080',
  rebeccapurple: '#663399',
  red: '#ff0000',
  rosybrown: '#bc8f8f',
  royalblue: '#4169e1',
  saddlebrown: '#8b4513',
  salmon: '#fa8072',
  sandybrown: '#f4a460',
  seagreen: '#2e8b57',
  seashell: '#fff5ee',
  sienna: '#a0522d',
  silver: '#c0c0c0',
  skyblue: '#87ceeb',
  slateblue: '#6a5acd',
  slategray: '#708090',
  snow: '#fffafa',
  springgreen: '#00ff7f',
  steelblue: '#4682b4',
  tan: '#d2b48c',
  teal: '#008080',
  thistle: '#d8bfd8',
  tomato: '#ff6347',
  turquoise: '#40e0d0',
  violet: '#ee82ee',
  wheat: '#f5deb3',
  white: '#ffffff',
  whitesmoke: '#f5f5f5',
  yellow: '#ffff00',
  yellowgreen: '#9acd32'
};

/**
 * アニメーションプリセット
 */
const animationPresets = {
  fade: 'フェード',
  slide: 'スライド',
  zoom: 'ズーム',
  pulse: 'パルス',
  bounce: 'バウンス',
  spin: 'スピン',
  wave: 'ウェーブ'
};

/**
 * 開発用モックAPI（本番環境のAPIが実装されるまで使用）
 */
const mockAPI = {
  // 設定取得API
  async getSettings() {
    // localStorageから読み込み試行
    const storedSettings = localStorage.getItem('loadingScreenSettings');
    if (storedSettings) {
      try {
        console.log('ローカルストレージから設定を読み込みました');
        return Promise.resolve(JSON.parse(storedSettings));
      } catch (e) {
        console.error('ローカルストレージのデータのパースに失敗:', e);
        // エラーの場合はデフォルトを返す
      }
    }
    console.log('デフォルト設定を使用します');
    return Promise.resolve({...defaultSettings});
  },
  
  // 設定保存API
  async saveSettings(data) {
    console.log('Mock API - データ保存:', data);
    // localStorageに保存
    try {
        localStorage.setItem('loadingScreenSettings', JSON.stringify(data));
        console.log('設定をローカルストレージに保存しました');
    } catch (e) {
        console.error('ローカルストレージへの保存に失敗:', e);
    }
    return Promise.resolve({...data, id: 1}); // モックIDを返す
  }
};

/**
 * ローディング画面エディタを表示する関数
 * @param {HTMLElement} container - 表示先のコンテナ要素
 */
export default function showLoadingScreenEditor(container) {
  // ★★★ 最初に currentSettings を初期化 ★★★
  let currentSettings = { ...defaultSettings };
  let logoFile = null;
  let customAnimationFile = null;
  const registeredListeners = [];
  let loadingManager = null;

  // ドラッグ&ドロップ関連のユーティリティ関数を追加
  const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const highlight = (element) => (e) => {
    preventDefaults(e);
    element.classList.add('dragover');
  };

  const unhighlight = (element) => (e) => {
    preventDefaults(e);
    element.classList.remove('dragover');
  };

  const handleLogoDrop = (e) => {
    preventDefaults(e);
    logoPreview.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleLogoFile(files[0]);
    }
  };

  const handleAnimationDrop = (e) => {
    preventDefaults(e);
    animationPreview.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleAnimationFile(files[0]);
    }
  };

  // イベントハンドラ関数の定義
  const eventHandlers = {
    handleTabClick: (e) => {
      e.preventDefault();
      const button = e.currentTarget;
      const targetTab = button.getAttribute('data-tab');
      if (!targetTab) return;

      // 全てのタブとコンテンツから active クラスを削除
      const tabButtons = container.querySelectorAll('.tab-button');
      tabButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      });

      const tabContents = container.querySelectorAll('.tab-content');
      tabContents.forEach(content => {
        content.classList.remove('active');
        content.setAttribute('aria-hidden', 'true');
      });

      // クリックされたタブとそれに対応するコンテンツを active に
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');

      const targetContent = container.querySelector(`.tab-content[data-tab="${targetTab}"]`);
      if (targetContent) {
        targetContent.classList.add('active');
        targetContent.setAttribute('aria-hidden', 'false');
      }

      // タブ切替後にプレビュー位置を維持
      const previewFrame = document.querySelector('.smartphone-frame');
      if (previewFrame) {
        const currentPosition = previewFrame.getBoundingClientRect();
        requestAnimationFrame(() => {
          previewFrame.style.position = 'relative';
          previewFrame.style.top = '0';
        });
      }

      // 背景の高さを調整
      setTimeout(fixPreviewBackground, 100);
    },

    handleOrientationClick(e) {
      const orientationButton = e.target.closest('.orientation-button');
      if (!orientationButton) return;

      const orientation = orientationButton.dataset.orientation;
      const frame = document.querySelector('.smartphone-frame');
      if (!frame) return;

      // アクティブなボタンを更新
      document.querySelectorAll('.orientation-button').forEach(btn => btn.classList.remove('active'));
      orientationButton.classList.add('active');

      // フレームのオリエンテーションを更新
      frame.className = `smartphone-frame ${orientation}`;
    },

    handleThemeOptionClick(e) {
      const theme = e.target.getAttribute('data-theme');
      if (!theme) return;
      
      themeOptions.forEach(option => option.classList.remove('active'));
      e.target.classList.add('active');
      
      applyThemePreset(theme);
    },

    handleResetClick() {
      if (confirm('設定をデフォルトに戻しますか？')) {
        currentSettings = {...defaultSettings};
        updateFormValues();
        updatePreview();
      }
    },

    handleSaveClick: async (e) => {
      e.preventDefault();
      await saveSettings();
    },

    handleCancelClick: () => {
      if (confirm('編集をキャンセルして前の画面に戻りますか？')) {
        console.log("前の画面に戻ります");
        
        try {
          // ハッシュ変更による画面遷移を実行
          window.location.hash = '#/projects';
          
          // クリーンアップ処理は一旦コメントアウト
          // 遷移が確実に実行されることを優先
          /*
          setTimeout(() => {
            try {
              if (registeredListeners && registeredListeners.length) {
                registeredListeners.forEach(({element, eventName, handler, options}) => {
                  if (element) element.removeEventListener(eventName, handler, options);
                });
                registeredListeners.length = 0;
              }
            } catch (e) {
              console.warn("クリーンアップ中にエラーが発生:", e);
            }
          }, 100);
          */
        } catch (error) {
          console.error("戻る処理中にエラーが発生:", error);
          // 最終手段としてプロジェクト一覧URLへ直接遷移
          window.location.href = '/projects.html';
        }
      }
    },

    handleFormSubmit: (e) => {
      e.preventDefault();
    },

    // その他のイベントハンドラ...
  };

  // HTML構造を作成
  container.innerHTML = `
    <div class="loading-screen-editor">
      <div class="editor-header">
        <h1>ローディング画面設定</h1>
      </div>
      
      <div class="editor-container">
        <div class="settings-panel">
          <div class="settings-tabs" role="tablist">
            <button class="tab-button active" data-tab="general" role="tab" aria-selected="true" aria-controls="general-content">一般設定</button>
            <button class="tab-button" data-tab="text" role="tab" aria-selected="false" aria-controls="text-content">テキスト設定</button>
            <button class="tab-button" data-tab="animation" role="tab" aria-selected="false" aria-controls="animation-content">アニメーション設定</button>
          </div>
          
          <form id="loading-screen-form">
            <!-- 一般設定タブ -->
            <div class="tab-content active" id="general-content" data-tab="general" role="tabpanel" aria-labelledby="tab-general">
              <div class="form-group">
                <label>背景色</label>
                <div class="color-picker-container">
                  <input type="color" id="bg-color-picker" name="bgColor">
                  <input type="text" id="bg-color-text" placeholder="rgba(0, 0, 0, 0.85)">
                </div>
              </div>
              <div class="form-group">
                <label>テキスト色</label>
                <div class="color-picker-container">
                  <input type="color" id="text-color-picker" name="textColor">
                  <input type="text" id="text-color-text" placeholder="white">
                </div>
              </div>
              <div class="form-group">
                <label>アクセントカラー（プログレスバー）</label>
                <div class="color-picker-container">
                  <input type="color" id="progress-color-picker" name="accentColor">
                  <input type="text" id="progress-color-text" placeholder="#00a8ff">
                </div>
              </div>
              <div class="form-group">
                <label>プリセットテーマ</label>
                <div class="preset-themes">
                  <div class="theme-option" data-theme="dark">
                    <div class="theme-preview dark"></div>
                    <span>ダーク</span>
                  </div>
                  <div class="theme-option" data-theme="light">
                    <div class="theme-preview light"></div>
                    <span>ライト</span>
                  </div>
                  <div class="theme-option" data-theme="blue">
                    <div class="theme-preview blue"></div>
                    <span>ブルー</span>
                  </div>
                  <div class="theme-option" data-theme="vibrant">
                    <div class="theme-preview vibrant"></div>
                    <span>ビビッド</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- テキスト設定タブ -->
            <div class="tab-content" id="text-content" data-tab="text" role="tabpanel" aria-labelledby="tab-text">
              <div class="form-group">
                <label>ロゴ画像</label>
                <div class="file-input-container">
                  <div class="file-preview" id="logo-preview">
                    <img src="/path/to/default-logo.png" alt="ロゴ">
                  </div>
                  <button type="button" class="file-input-button" id="logo-upload-trigger">
                    ファイルを選択
                  </button>
                  <input type="file" id="logo-upload" accept="image/*" style="display: none;">
                </div>
              </div>
              <div class="form-group">
                <label>ブランド名</label>
                <input type="text" id="brand-name" name="name" placeholder="miru-WebAR">
              </div>
              <div class="form-group">
                <label>サブタイトル</label>
                <input type="text" id="sub-title" name="subTitle" placeholder="WebARエクスペリエンス">
              </div>
              <div class="form-group">
                <label>進捗テキスト</label>
                <input type="text" id="loading-message" name="loadingMessage" placeholder="モデルを読み込んでいます...">
              </div>
              <div class="form-group">
                <label>フォントサイズ倍率</label>
                <input type="range" id="font-scale" name="fontScale" min="0.5" max="2" step="0.1" value="1.0">
                <div class="font-size-value">1.0x</div>
                <div class="font-size-presets">
                  <span data-scale="0.8">S</span>
                  <span data-scale="1.0" class="active">M</span>
                  <span data-scale="1.2">L</span>
                </div>
              </div>
            </div>
            
            <!-- アニメーション設定タブ -->
            <div class="tab-content" id="animation-content" data-tab="animation" role="tabpanel" aria-labelledby="tab-animation">
              <div class="form-group">
                <p>アニメーション設定は近日公開予定です。</p>
              </div>
            </div>
          </form>
        </div>
        
        <!-- プレビューパネル -->
        <div class="preview-panel">
          <div class="preview-header">
            <h2>プレビュー</h2>
            <div class="preview-orientation">
              <div class="orientation-toggle">
                <button class="orientation-button active" data-orientation="portrait">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                    <line x1="12" y1="18" x2="12" y2="18"></line>
                  </svg>
                  縦向き
                </button>
                <button class="orientation-button" data-orientation="landscape">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="18" y1="12" x2="18" y2="12"></line>
                  </svg>
                  横向き
                </button>
              </div>
            </div>
          </div>
          
          <div class="preview-container">
            <div class="smartphone-frame portrait" id="preview-frame">
              <div class="smartphone-screen" id="preview-screen">
                <div class="loading-screen-preview">
                  <img src="/path/to/default-logo.png" alt="ロゴ" class="preview-logo" id="preview-logo" style="display: none;">
                  <div class="preview-brand" id="preview-brand">miru-WebAR</div>
                  <div class="preview-subtitle" id="preview-subtitle">WebARエクスペリエンス</div>
                  <div class="preview-progress"><div class="preview-bar" id="preview-bar"></div></div>
                  <div class="preview-text" id="preview-text">モデルを読み込んでいます...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="fixed-footer">
        <button id="loading-reset-button" class="reset-button">リセット</button>
        <button id="loading-cancel-button" class="cancel-button">戻る</button>
        <button id="loading-save-button" class="save-button">保存</button>
      </div>
    </div>
  `;

  // フォーム要素を取得
  let form = document.getElementById('loading-screen-form');
  let brandNameInput = document.getElementById('brand-name');
  let subTitleInput = document.getElementById('sub-title');
  let loadingMessageInput = document.getElementById('loading-message');
  let logoUploadInput = document.getElementById('logo-upload');
  let logoUploadTrigger = document.getElementById('logo-upload-trigger');
  let logoPreview = document.getElementById('logo-preview');
  let bgColorTextInput = document.getElementById('bg-color-text');
  let bgColorPicker = document.getElementById('bg-color-picker');
  let textColorTextInput = document.getElementById('text-color-text');
  let textColorPicker = document.getElementById('text-color-picker');
  let progressColorTextInput = document.getElementById('progress-color-text');
  let progressColorPicker = document.getElementById('progress-color-picker');
  let animationTypeSelect = document.getElementById('loading-animation-type');
  let animationSpeedSelect = document.getElementById('loading-animation-speed');
  let fontScaleSlider = document.getElementById('font-scale');
  let fontScaleValue = document.getElementById('font-scale-value');
  let customAnimationInput = document.getElementById('custom-animation');
  let customAnimationTrigger = document.getElementById('custom-animation-trigger');
  let animationPreview = document.getElementById('animation-preview');
  
  // プレビュー要素を取得
  let previewFrame = document.getElementById('preview-frame');
  let previewScreen = document.getElementById('preview-screen');
  let previewLogo = document.getElementById('preview-logo');
  let previewBrand = document.getElementById('preview-brand');
  let previewSubtitle = document.getElementById('preview-subtitle');
  let previewText = document.getElementById('preview-text');
  let previewBar = document.getElementById('preview-bar');
  let previewAnimationButton = document.getElementById('preview-animation-button');
  
  // タブ切り替え要素を取得
  let tabButtons = document.querySelectorAll('.tab-button');
  let tabContents = document.querySelectorAll('.tab-content');
  
  // 画面向き切り替え要素を取得
  let orientationButtons = document.querySelectorAll('.orientation-button');
  
  // テーマオプションを取得
  let themeOptions = document.querySelectorAll('.theme-option');
  
  // アクションボタンを取得
  let saveButton = document.getElementById('loading-save-button');
  let cancelButton = document.getElementById('loading-cancel-button');
  let resetButton = document.getElementById('loading-reset-button');
  
  // ローディングマネージャーの初期化
  const initializeLoadingManager = async () => {
    try {
      const { initLoadingManager } = await import('../utils/loadingManager.js');
      loadingManager = await initLoadingManager('loading-screen-editor-container');
      console.log('Loading manager initialized for editor');
    } catch (error) {
      console.error('Failed to initialize loading manager:', error);
    }
  };

  // 初期設定をロード
  loadSettings();

  // イベントリスナーを設定
  setupEventListeners();
  
  // ドラッグ&ドロップ機能を設定
  setupDragAndDrop();

  // CSSスタイルの更新も必要なので、style要素を追加
  const style = document.createElement('style');
  style.textContent = `
    .smartphone-frame.landscape {
      transform: rotate(90deg);
      margin: 140px 0;
    }

    .loading-screen-editor .fixed-footer .cancel-button {
      background-color: var(--background-color-light, #2a2a2a);
      color: var(--text-color, #fff);
      transition: all 0.2s;
    }

    .loading-screen-editor .fixed-footer .cancel-button:hover {
      background-color: var(--background-color-lighter, #3a3a3a);
    }
  `;
  document.head.appendChild(style);

  /**
   * 保存済みの設定を読み込む
   */
  async function loadSettings() {
    try {
      console.log('ローカルストレージから設定を読み込みます');
      const mockSettings = await mockAPI.getSettings();
      currentSettings = { ...defaultSettings, ...mockSettings };
      console.log('設定を読み込みました:', currentSettings);
    } catch (error) {
      console.error('設定の読み込み中にエラーが発生しました:', error);
      currentSettings = { ...defaultSettings };
    }
    
    updateFormValues();
    updatePreviewStyles(); // 設定読み込み後にプレビューを更新
  }
  
  /**
   * フォームの値を更新する
   */
  function updateFormValues() {
    // 各要素が存在するか確認してから値を設定
    if(brandNameInput) brandNameInput.value = currentSettings.name || '';
    if(subTitleInput) subTitleInput.value = currentSettings.subTitle || '';
    if(loadingMessageInput) loadingMessageInput.value = currentSettings.loadingMessage || '';
    if(bgColorTextInput) bgColorTextInput.value = currentSettings.bgColor || '';
    if(textColorTextInput) textColorTextInput.value = currentSettings.textColor || '';
    if(progressColorTextInput) progressColorTextInput.value = currentSettings.accentColor || '';
    if(animationTypeSelect) animationTypeSelect.value = currentSettings.animationType || 'none'; // Default to none if not set
    if(animationSpeedSelect) animationSpeedSelect.value = currentSettings.animationSpeed || 'normal';
    if(fontScaleSlider) fontScaleSlider.value = currentSettings.fontScale || 1.0;
    if(fontScaleValue) fontScaleValue.textContent = `${Math.round((currentSettings.fontScale || 1.0) * 100)}%`;

    try {
      // Pickerにも値を反映 (Hex形式に変換)
      if(bgColorPicker) bgColorPicker.value = convertToHexColor(currentSettings.bgColor || '#000000');
      if(textColorPicker) textColorPicker.value = convertToHexColor(currentSettings.textColor || '#ffffff');
      if(progressColorPicker) progressColorPicker.value = convertToHexColor(currentSettings.accentColor || '#00a8ff');
    } catch (e) {
      console.warn('カラーピッカーの値設定に失敗しました:', e);
    }
    
    // ロゴプレビューを更新
    if (logoPreview) {
      if (currentSettings.logo) {
        // Check if it's a Data URL or a path (basic check)
        if (currentSettings.logo.startsWith('data:image')) {
          logoPreview.innerHTML = `<img src="${currentSettings.logo}" alt="ロゴプレビュー">`;
        } else {
          // Assume it's a path - might need adjustments based on actual storage
          logoPreview.innerHTML = `<img src="${currentSettings.logo}" alt="ロゴプレビュー">`;
          // Consider adding error handling for image paths: img.onerror = ...
        }
        logoPreview.classList.remove('empty');
      } else {
        logoPreview.innerHTML = `<span>ロゴ画像をアップロード</span><small>ここにファイルをドラッグ＆ドロップするか、下のボタンをクリック</small>`;
        logoPreview.classList.add('empty');
      }
    }
    
    // カスタムアニメーションプレビューを更新
    if (animationPreview && animationTypeSelect) {
        let hasCustomAnim = false;
        let customAnimDisplay = '';

        if (currentSettings.customAnimation) {
            hasCustomAnim = true;
            // Determine display based on stored data type (Data URL or path)
            if (currentSettings.customAnimation.startsWith('data:')) {
                 const mimeType = currentSettings.customAnimation.split(';')[0].split(':')[1];
                 if (mimeType === 'application/json') customAnimDisplay = `<span>Lottie アニメーション (読み込み済)</span>`;
                 else if (mimeType === 'image/gif' || mimeType === 'image/svg+xml') customAnimDisplay = `<img src="${currentSettings.customAnimation}" alt="カスタムアニメーションプレビュー">`;
                 else customAnimDisplay = `<span>カスタムアニメーション (不明なData URL)</span>`;
            } else {
                // Assume it's a path
                const fileExt = currentSettings.customAnimation.split('.').pop().toLowerCase();
                if (fileExt === 'json') customAnimDisplay = `<span>Lottie: ${currentSettings.customAnimation}</span>`;
                else if (fileExt === 'gif' || fileExt === 'svg') customAnimDisplay = `<img src="${currentSettings.customAnimation}" alt="カスタムアニメーションプレビュー">`;
                else customAnimDisplay = `<span>カスタムアニメーション: ${currentSettings.customAnimation}</span>`;
                 // Add error handling for image path if needed
            }
        }

        if (hasCustomAnim) {
            animationPreview.innerHTML = customAnimDisplay;
            animationPreview.classList.remove('empty');
            // Ensure 'custom' option exists and is selected
            let customOption = animationTypeSelect.querySelector('option[value="custom"]');
            if (!customOption) {
                customOption = document.createElement('option');
                customOption.value = 'custom';
                customOption.textContent = 'カスタム';
                animationTypeSelect.appendChild(customOption);
            }
            // Only select 'custom' if the *saved* type is also custom
            if (currentSettings.animationType === 'custom') {
                 animationTypeSelect.value = 'custom';
            }
        } else {
            animationPreview.innerHTML = `<span>アニメーションファイルをアップロード</span><small>対応形式: JSON (Lottie), GIF, SVG</small>`;
            animationPreview.classList.add('empty');
            // Remove 'custom' option if it exists
            const customOption = animationTypeSelect.querySelector('option[value="custom"]');
            if (customOption) customOption.remove();
            // If the current type was 'custom' but there's no file, switch to 'none'
            if (currentSettings.animationType === 'custom') {
                animationTypeSelect.value = 'none';
                currentSettings.animationType = 'none'; // Update state
            }
        }
    }
  }
  
  /**
   * 色を16進数形式(#rrggbb)に変換する
   * @param {string} color - 変換する色（名前、RGB、RGBA、16進数）
   * @returns {string} 16進数形式の色
   */
  function convertToHexColor(color) {
    if (!color) return '#000000'; // Default to black if color is null/undefined

    // Create a temporary element to leverage the browser's color parsing
    const tempElem = document.createElement('div');
    tempElem.style.color = color;
    document.body.appendChild(tempElem); // Append to body to compute style

    // Get the computed style (which should be in rgb or rgba format)
    const computedColor = window.getComputedStyle(tempElem).color;
    document.body.removeChild(tempElem); // Clean up the temporary element

    // Parse the computed RGB(A) string
    const match = computedColor.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/);

    if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    } else {
        console.warn('convertToHexColor: Failed to parse color:', color, 'Computed:', computedColor);
        return '#000000'; // Fallback to black if parsing fails
    }
  }
  
  /**
   * プレビューを更新する
   * @param {number} progress - 進捗率（0-100）
   * @param {string|null} message - 表示するメッセージ（nullの場合はデフォルトメッセージを使用）
   */
  function updatePreview(progress = 0, message = null) {
    console.log('プレビュー更新開始:', currentSettings);
    
    // プレビュー要素
    const previewScreen = document.querySelector('.smartphone-screen');
    const previewBrand = document.getElementById('preview-brand');
    const previewSubtitle = document.getElementById('preview-subtitle');
    const previewText = document.querySelector('.preview-text');
    const previewBar = document.querySelector('.preview-bar');
    
    // デバッグ: 各要素の存在確認
    console.log('プレビュー要素:', {
      screen: !!previewScreen,
      brand: !!previewBrand,
      subtitle: !!previewSubtitle,
      text: !!previewText,
      bar: !!previewBar
    });
    
    // 背景色を設定
    if (previewScreen) {
      previewScreen.style.backgroundColor = currentSettings.bgColor || 'rgba(0, 0, 0, 0.85)';
      console.log('背景色を設定:', currentSettings.bgColor);
    }
    
    // テキスト色を設定
    if (previewBrand) {
      previewBrand.style.color = currentSettings.textColor || 'white';
      previewBrand.textContent = currentSettings.name || 'miru-WebAR';
    }
    
    if (previewSubtitle) {
      previewSubtitle.style.color = currentSettings.textColor || 'white';
      previewSubtitle.textContent = currentSettings.subTitle || 'WebARエクスペリエンス';
    }
    
    if (previewText) {
      previewText.style.color = currentSettings.textColor || 'white';
      const loadingMsg = message || currentSettings.loadingMessage || 'モデルを読み込んでいます...';
      previewText.textContent = `${loadingMsg} (${progress}%)`;
    }
    
    // プログレスバーの色と幅を設定
    if (previewBar) {
      previewBar.style.backgroundColor = currentSettings.accentColor || '#00a8ff';
      previewBar.style.width = `${progress}%`;
    }
    
    console.log('プレビュー更新完了');
  }

  // プログレスバーのテスト用関数
  function simulateLoading() {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 100) {
        progress = 100;
        clearInterval(interval);
      }
      updatePreview(progress);
    }, 500);
  }

  // プレビューボタンクリック時の処理を更新
  document.querySelector('.preview-button')?.addEventListener('click', () => {
    simulateLoading();
  });

  // フォームでのドラッグアンドドロップ処理を設定
  function setupDragAndDrop() {
    // Logo Drag & Drop Listeners
    addListener(logoPreview, 'dragenter', preventDefaults, false);
    addListener(logoPreview, 'dragover', preventDefaults, false);
    addListener(logoPreview, 'dragleave', preventDefaults, false);
    addListener(logoPreview, 'drop', preventDefaults, false);
    addListener(logoPreview, 'dragenter', highlight(logoPreview), false);
    addListener(logoPreview, 'dragover', highlight(logoPreview), false);
    addListener(logoPreview, 'dragleave', unhighlight(logoPreview), false);
    // Drop event implicitly unhighlights via handleLogoDrop calling unhighlight
    addListener(logoPreview, 'drop', handleLogoDrop);

    // Animation Drag & Drop Listeners
    addListener(animationPreview, 'dragenter', preventDefaults, false);
    addListener(animationPreview, 'dragover', preventDefaults, false);
    addListener(animationPreview, 'dragleave', preventDefaults, false);
    addListener(animationPreview, 'drop', preventDefaults, false);
    addListener(animationPreview, 'dragenter', highlight(animationPreview), false);
    addListener(animationPreview, 'dragover', highlight(animationPreview), false);
    addListener(animationPreview, 'dragleave', unhighlight(animationPreview), false);
    // Drop event implicitly unhighlights via handleAnimationDrop calling unhighlight
    addListener(animationPreview, 'drop', handleAnimationDrop);
  }
  
  // ロゴファイル処理関数
  function handleLogoFile(file) {
    logoFile = file; // Store the File object for potential upload
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (logoPreview) {
        logoPreview.innerHTML = `<img src="${dataUrl}" alt="ロゴプレビュー">`;
        logoPreview.classList.remove('empty');
      }
      // Update setting immediately with Data URL for preview
      currentSettings.logo = dataUrl;
      updatePreview(); // Refresh preview to show the new logo
    };
    reader.onerror = (e) => {
         console.error("FileReader error reading logo:", e);
         if (logoPreview) {
             logoPreview.innerHTML = '<span>ロゴ読込エラー</span>';
             logoPreview.classList.add('error');
         }
    };
    reader.readAsDataURL(file);
  }
  
  // アニメーションファイル処理関数
  function handleAnimationFile(file) {
    customAnimationFile = file; // Store File object
    const reader = new FileReader();
    const fileExt = file.name.split('.').pop().toLowerCase();

    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (animationPreview) {
        if (fileExt === 'json') {
          animationPreview.innerHTML = `<span>Lottie: ${file.name}</span>`;
        } else if (fileExt === 'gif' || fileExt === 'svg') {
          animationPreview.innerHTML = `<img src="${dataUrl}" alt="${file.name}">`;
        } else {
            animationPreview.innerHTML = `<span>ファイル: ${file.name}</span>`; // Fallback
        }
        animationPreview.classList.remove('empty');
      }

      // Update setting with Data URL for preview/state
      currentSettings.customAnimation = dataUrl;
      currentSettings.animationType = 'custom';

      // Update the animation type dropdown
      if (animationTypeSelect) {
         let customOption = animationTypeSelect.querySelector('option[value="custom"]');
         if (!customOption) {
            customOption = document.createElement('option');
            customOption.value = 'custom';
            customOption.textContent = 'カスタム';
            animationTypeSelect.appendChild(customOption);
         }
         animationTypeSelect.value = 'custom';
      }
       updatePreview(); // Update preview (might affect animation classes)
    };
     reader.onerror = (e) => {
         console.error("FileReader error reading animation:", e);
         if (animationPreview) {
             animationPreview.innerHTML = '<span>ファイル読込エラー</span>';
             animationPreview.classList.add('error');
         }
    };
    reader.readAsDataURL(file);
  }

  // イベントリスナー登録用のヘルパー関数
  function addListener(element, eventName, handler, options = false) {
    if (!element) {
      console.warn(`addListener: 要素が存在しません (${eventName})`);
      return;
    }
    
    // 直接 addEventListener を使用
    element.addEventListener(eventName, handler, options);
    
    // registeredListeners 配列が存在していれば登録情報を追加
    if (typeof registeredListeners !== 'undefined' && Array.isArray(registeredListeners)) {
      registeredListeners.push({ element, eventName, handler, options });
    } else {
      console.warn('registeredListeners が存在しないか、配列ではありません');
    }
  }

  // グローバルに関数を公開
  window.addListener = addListener;

  /**
   * イベントリスナーを設定する
   */
  function setupEventListeners() {
    // タブ切り替えイベント
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', eventHandlers.handleTabClick);
    });

    // 画面向き切り替えの処理
    const orientationButtons = document.querySelectorAll('.orientation-button');
    orientationButtons.forEach(button => {
      button.addEventListener('click', eventHandlers.handleOrientationClick);
    });

    // テーマオプションの処理
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
      option.addEventListener('click', eventHandlers.handleThemeOptionClick);
    });

    // フォーム関連
    const form = document.querySelector('#loading-screen-form');
    const saveButton = document.querySelector('#loading-save-button');
    const cancelButton = document.querySelector('#loading-cancel-button');
    const resetButton = document.querySelector('#loading-reset-button');

    if (form) form.addEventListener('submit', eventHandlers.handleFormSubmit);
    if (saveButton) saveButton.addEventListener('click', eventHandlers.handleSaveClick);
    if (cancelButton) cancelButton.addEventListener('click', eventHandlers.handleCancelClick);
    if (resetButton) resetButton.addEventListener('click', eventHandlers.handleResetClick);

    // 最初のタブをアクティブにする
    const firstTab = document.querySelector('.tab-button');
    if (firstTab) {
      firstTab.click();
    }
    
    // 設定値変更の監視
    setupColorInputs();
  }

  /**
   * 色設定の入力イベントを処理する
   */
  function setupColorInputs() {
    const colorInputs = [
      {
        picker: document.querySelector('#bg-color-picker'),
        text: document.querySelector('#bg-color-text'),
        setting: 'bgColor',
        defaultColor: 'rgba(0, 0, 0, 0.85)'
      },
      {
        picker: document.querySelector('#text-color-picker'),
        text: document.querySelector('#text-color-text'),
        setting: 'textColor',
        defaultColor: 'white'
      },
      {
        picker: document.querySelector('#progress-color-picker'),
        text: document.querySelector('#progress-color-text'),
        setting: 'accentColor',
        defaultColor: '#00a8ff'
      }
    ];

    colorInputs.forEach(({ picker, text, setting, defaultColor }) => {
      if (picker) {
        picker.addEventListener('input', function() {
          const newColor = this.value;
          console.log(`Color picker changed for ${setting}:`, newColor);
          
          if (text) text.value = newColor;
          currentSettings[setting] = newColor;
          updatePreviewStyles();
        });
      }

      if (text) {
        text.addEventListener('input', function() {
          const newColor = this.value;
          console.log(`Text input changed for ${setting}:`, newColor);
          
          if (isValidColor(newColor)) {
            try {
              const hexColor = convertToHexColor(newColor);
              if (picker) picker.value = hexColor;
              currentSettings[setting] = newColor;
              updatePreviewStyles();
            } catch (err) {
              console.warn(`Failed to convert color for ${setting}:`, err);
              currentSettings[setting] = defaultColor;
              updatePreviewStyles();
            }
          }
        });

        // 初期値を設定
        text.value = currentSettings[setting] || defaultColor;
        if (picker) {
          try {
            picker.value = convertToHexColor(currentSettings[setting] || defaultColor);
          } catch (err) {
            console.warn(`Failed to set initial picker value for ${setting}:`, err);
          }
        }
      }
    });

    console.log('Color input handlers have been set up');
  }

  /**
   * プレビューのスタイルを更新する関数
   */
  function updatePreviewStyles() {
    // currentSettings の存在チェック
    if (typeof currentSettings === 'undefined' || !currentSettings) {
      console.error("updatePreviewStyles Error: currentSettings is not accessible!");
      return;
    }
    console.log('プレビュースタイルを更新:', currentSettings); // デバッグ用ログ

    const previewContainer = document.querySelector('.loading-screen-preview');
    const previewBrandEl = document.getElementById('preview-brand');
    const previewSubtitleEl = document.getElementById('preview-subtitle');
    const previewTextEl = document.getElementById('preview-text');
    const previewBarEl = document.querySelector('.preview-bar');

    // 背景色 (loading-screen-preview に適用)
    if (previewContainer) {
      previewContainer.style.backgroundColor = currentSettings.bgColor || 'rgba(0,0,0,0.85)';
    }

    // テキスト要素の色 (個別に指定)
    [previewBrandEl, previewSubtitleEl, previewTextEl].forEach(el => {
      if (el) {
        el.style.color = currentSettings.textColor || 'white';
        console.log(`Applied text color to ${el.id}:`, el.style.color);
      }
    });

    // アクセントカラー (プログレスバーに適用)
    if (previewBarEl) {
      previewBarEl.style.backgroundColor = currentSettings.accentColor || '#00a8ff';
      console.log('Applied accent color to progress bar:', previewBarEl.style.backgroundColor);
    }

    // フォントスケールの適用
    const rootFontSize = 16;
    const scale = currentSettings.fontScale || 1.0;
    if (previewBrandEl) previewBrandEl.style.fontSize = `clamp(18px, 4vw, ${rootFontSize * 1.5 * scale}px)`;
    if (previewSubtitleEl) previewSubtitleEl.style.fontSize = `clamp(14px, 3vw, ${rootFontSize * 1.0 * scale}px)`;
    if (previewTextEl) previewTextEl.style.fontSize = `${rootFontSize * 0.875 * scale}px`;
  }

  /**
   * テーマプリセットを適用する
   */
  function applyThemePreset(theme) {
    console.log('Applying theme preset:', theme);
    
    let bg, text, accent;
    
    switch(theme) {
      case 'dark':
        bg = 'rgba(0, 0, 0, 0.85)';
        text = '#ffffff';
        accent = '#00a8ff';
        break;
      case 'light':
        bg = 'rgba(255, 255, 255, 0.9)';
        text = '#000000';
        accent = '#0066cc';
        break;
      case 'blue':
        bg = 'rgba(0, 32, 96, 0.9)';
        text = '#ffffff';
        accent = '#00a8ff';
        break;
      case 'vibrant':
        bg = 'rgba(128, 0, 128, 0.85)';
        text = '#ffffff';
        accent = '#00ff00';
        break;
      default:
        console.warn('Unknown theme:', theme);
        return;
    }

    // 設定を更新
    currentSettings.bgColor = bg;
    currentSettings.textColor = text;
    currentSettings.accentColor = accent;

    console.log('Theme colors set:', { bg, text, accent });

    // フォームの値を更新
    updateFormValues();
    
    // プレビューを更新
    updatePreviewStyles();
  }

  // --- クリーンアップ関数 ---
  const cleanup = async () => {
    try {
      console.log("ローディング画面エディタのクリーンアップを実行します。");

      // ★★★ 登録されたすべてのイベントリスナーを解除 ★★★
      registeredListeners.forEach(({ element, eventName, handler, options }) => {
        if (element) {
          try {
              element.removeEventListener(eventName, handler, options);
          } catch (e) {
              // Log error but continue cleanup
              console.warn(`Error removing listener for ${eventName} on`, element, e);
          }
        }
      });
      registeredListeners.length = 0; // 配列をクリアしてメモリ解放

      // 不要なDOM削除コードは削除済み

      // DOM要素の参照をクリア (ガベージコレクションを助けるため)
      form = null;
      brandNameInput = null;
      subTitleInput = null;
      loadingMessageInput = null;
      logoUploadInput = null;
      logoUploadTrigger = null;
      logoPreview = null;
      bgColorTextInput = null;
      bgColorPicker = null;
      textColorTextInput = null;
      textColorPicker = null;
      progressColorTextInput = null;
      progressColorPicker = null;
      animationTypeSelect = null;
      animationSpeedSelect = null;
      fontScaleSlider = null;
      fontScaleValue = null;
      customAnimationInput = null;
      customAnimationTrigger = null;
      animationPreview = null;
      previewFrame = null;
      previewScreen = null;
      previewLogo = null;
      previewBrand = null;
      previewSubtitle = null;
      previewText = null;
      previewBar = null;
      previewAnimationButton = null;
      tabButtons = null; // NodeList もクリア
      tabContents = null; // NodeList もクリア
      orientationButtons = null; // NodeList もクリア
      themeOptions = null; // NodeList もクリア
      fontSizePresets = null; // NodeList もクリア
      saveButton = null;
      cancelButton = null;
      resetButton = null;
      currentSettings = null; // 設定オブジェクトへの参照もクリア
      logoFile = null; // ファイル参照もクリア
      customAnimationFile = null; // ファイル参照もクリア
      container = null; // コンテナ要素への参照もクリア

      // ローディングマネージャーのクリーンアップ
      if (loadingManager && typeof loadingManager.cleanup === 'function') {
        await loadingManager.cleanup();
      }

      // DOM要素のクリーンアップ
      const cleanupElements = () => {
        const selectors = [
          '.loading-screen',
          '.loading-screen-preview',
          '.loading-screen-editor',
          '[class*="loading-"]'
        ];
        
        selectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            if (el && el.parentNode) {
              el.style.transition = 'none';
              el.style.opacity = '0';
              el.style.visibility = 'hidden';
              
              try {
                el.parentNode.removeChild(el);
                console.log(`Removed editor element: ${selector}`);
              } catch (e) {
                console.warn(`Failed to remove editor element ${selector}:`, e);
              }
            }
          });
        });
      };

      // 即時実行とタイムアウトでの再実行
      cleanupElements();
      setTimeout(cleanupElements, 100);

      loadingManager = null;
      console.log("ローディング画面エディタのクリーンアップが完了しました。");
    } catch (error) {
      console.error('Error during editor cleanup:', error);
    }
  };

  // --- 初期化 ---
  async function initializeEditor() {
    try {
      await initializeLoadingManager();
      console.log('ローディングマネージャーの初期化が完了しました');

      // DOM要素の取得と検証
      const requiredElements = {
        form: 'loading-screen-form',
        brandName: 'brand-name',
        subTitle: 'sub-title',
        loadingMessage: 'loading-message',
        logoUpload: 'logo-upload',
        logoUploadTrigger: 'logo-upload-trigger',
        logoPreview: 'logo-preview',
        bgColorText: 'bg-color-text',
        bgColorPicker: 'bg-color-picker',
        textColorText: 'text-color-text',
        textColorPicker: 'text-color-picker',
        progressColorText: 'progress-color-text',
        progressColorPicker: 'progress-color-picker',
        fontScale: 'font-scale',
        fontScaleValue: '.font-size-value',
        saveButton: 'loading-save-button',
        cancelButton: 'loading-cancel-button',
        resetButton: 'loading-reset-button'
      };

      // 必須要素の存在チェック
      const missingElements = [];
      const elements = {};

      for (const [key, id] of Object.entries(requiredElements)) {
        const element = id.startsWith('.') 
          ? document.querySelector(id)
          : document.getElementById(id);
        
        if (!element) {
          missingElements.push(id);
        }
        elements[key] = element;
      }

      if (missingElements.length > 0) {
        throw new Error(`必須要素が見つかりません: ${missingElements.join(', ')}`);
      }

      // グローバル変数に代入
      form = elements.form;
      brandNameInput = elements.brandName;
      subTitleInput = elements.subTitle;
      loadingMessageInput = elements.loadingMessage;
      logoUploadInput = elements.logoUpload;
      logoUploadTrigger = elements.logoUploadTrigger;
      logoPreview = elements.logoPreview;
      bgColorTextInput = elements.bgColorText;
      bgColorPicker = elements.bgColorPicker;
      textColorTextInput = elements.textColorText;
      textColorPicker = elements.textColorPicker;
      progressColorTextInput = elements.progressColorText;
      progressColorPicker = elements.progressColorPicker;
      fontScaleSlider = elements.fontScale;
      fontScaleValue = elements.fontScaleValue;
      saveButton = elements.saveButton;
      cancelButton = elements.cancelButton;
      resetButton = elements.resetButton;

      // コンテナ要素から要素を取得
      if (!container) throw new Error('コンテナ要素が見つかりません');
      
      // NodeListの取得
      tabButtons = container.querySelectorAll('.tab-button');
      tabContents = container.querySelectorAll('.tab-content');
      orientationButtons = container.querySelectorAll('.orientation-button');
      themeOptions = container.querySelectorAll('.theme-option');

      // フォントサイズプリセットの初期化
      const fontSizePresetElements = container.querySelectorAll('.font-size-presets span');
      if (fontSizePresetElements.length > 0) {
        fontSizePresets = Array.from(fontSizePresetElements).reduce((acc, el) => {
          const scale = parseFloat(el.dataset.scale);
          if (!isNaN(scale)) {
            acc[el.textContent.toLowerCase()] = scale;
          }
          return acc;
        }, {});
      }

      console.log('DOM要素の初期化が完了しました');

      // 保存済み設定の読み込みと初期化
      await loadSettings();
      console.log('設定の読み込みが完了しました');

      // 明示的な初期プレビュー更新
      console.log('初期プレビューを更新します');
      updatePreview(0);

      // イベントリスナーの設定
      setupEventListeners();
      setupDragAndDrop();

      // プレビューを明示的に更新
      updatePreviewStyles();

    } catch (error) {
      console.error('エディタの初期化中にエラーが発生しました:', error);
      
      // エラーメッセージの表示
      if (container) {
        container.innerHTML = `
          <div class="error-message">
            <h3>エディタの初期化に失敗しました</h3>
            <p>${error.message}</p>
            <button onclick="location.reload()">再読み込み</button>
          </div>
        `;
      }

      // エラー発生時のクリーンアップ
      try {
        if (typeof cleanup === 'function') {
          await cleanup();
        }
      } catch (cleanupError) {
        console.error('クリーンアップ中にエラーが発生しました:', cleanupError);
      }
    }
  }

  // 初期化の実行
  initializeEditor().catch(error => {
    console.error('エディタの初期化に致命的なエラーが発生しました:', error);
  });

  return cleanup; // クリーンアップ関数を返す
} 

// 向き切り替えの処理を改善
function handleOrientationChange(isLandscape) {
  const smartphoneFrame = document.querySelector('.smartphone-frame');
  const previewContent = document.querySelector('.loading-screen-preview');
  
  if (!smartphoneFrame || !previewContent) return;
  
  // 向きに応じてクラスを切り替え
  smartphoneFrame.classList.remove('portrait', 'landscape');
  smartphoneFrame.classList.add(isLandscape ? 'landscape' : 'portrait');
  
  // フレームのサイズと位置を調整
  requestAnimationFrame(() => {
    initializePreview();
  });
}

// 向き切り替えボタンのイベントハンドラ
function setupOrientationToggle() {
  const portraitButton = document.querySelector('.orientation-button[data-orientation="portrait"]');
  const landscapeButton = document.querySelector('.orientation-button[data-orientation="landscape"]');

  if (portraitButton && landscapeButton) {
    portraitButton.addEventListener('click', () => {
      portraitButton.classList.add('active');
      landscapeButton.classList.remove('active');
      handleOrientationChange(false);
    });

    landscapeButton.addEventListener('click', () => {
      landscapeButton.classList.add('active');
      portraitButton.classList.remove('active');
      handleOrientationChange(true);
    });

    // デフォルトで縦向きを選択
    portraitButton.classList.add('active');
    handleOrientationChange(false);
  }
}

// プレビュー要素の作成を改善
function createPreviewElements() {
  const previewContainer = document.createElement('div');
  previewContainer.className = 'preview-container';

  const smartphoneFrame = document.createElement('div');
  smartphoneFrame.className = 'smartphone-frame portrait';

  const smartphoneScreen = document.createElement('div');
  smartphoneScreen.className = 'smartphone-screen';

  const previewContentWrapper = document.createElement('div');
  previewContentWrapper.className = 'preview-content-wrapper';

  const previewContent = document.createElement('div');
  previewContent.className = 'loading-screen-preview';

  // プレビューコンテンツの構造を設定
  previewContent.innerHTML = `
    <img class="preview-logo" src="${currentSettings.logo || ''}" ${currentSettings.showLogo ? '' : 'style="display:none;"'}>
    <div class="preview-brand" ${currentSettings.showBrand ? '' : 'style="display:none;"'}>${currentSettings.name || 'My App'}</div>
    <div class="preview-subtitle" ${currentSettings.showSubtitle ? '' : 'style="display:none;"'}>${currentSettings.subTitle || 'Loading...'}</div>
    <div class="preview-progress" ${currentSettings.showProgressBar ? '' : 'style="display:none;"'}><div class="preview-bar"></div></div>
    <div class="preview-text">${currentSettings.loadingMessage || 'Please wait...'}</div>
  `;

  // 要素を組み立て
  previewContentWrapper.appendChild(previewContent);
  smartphoneScreen.appendChild(previewContentWrapper);
  smartphoneFrame.appendChild(smartphoneScreen);
  previewContainer.appendChild(smartphoneFrame);

  return previewContainer;
}

// 初期化時にプレビュー要素をセットアップ
function initializePreview() {
  const previewPanel = document.querySelector('.preview-panel');
  if (!previewPanel) return;
  
  // 向き切り替えボタンの強制表示
  const orientationToggle = previewPanel.querySelector('.preview-orientation');
  if (orientationToggle) {
    orientationToggle.style.display = 'flex';
  }
  
  // スマホフレームの位置調整
  const previewContainer = previewPanel.querySelector('.preview-container');
  const smartphoneFrame = previewPanel.querySelector('.smartphone-frame');
  
  if (previewContainer && smartphoneFrame) {
    // コンテナ内でフレームが中央に表示されるように調整
    requestAnimationFrame(() => {
      const containerHeight = previewContainer.clientHeight;
      const frameHeight = smartphoneFrame.clientHeight;
      
      if (frameHeight > containerHeight) {
        // フレームサイズを縮小して収める
        const scale = Math.min(0.9, (containerHeight / frameHeight));
        smartphoneFrame.style.transform = `scale(${scale})`;
      } else {
        // 中央寄せ
        smartphoneFrame.style.margin = 'auto';
      }
    });
  }
  
  // スマホフレームの位置安定化を追加
  stabilizePhonePosition();
}

// ウィンドウサイズ変更時にもプレビュー表示を調整
window.addEventListener('resize', () => {
  initializePreview();
  updatePreviewScale();
});

// タブ切替時にも調整
document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    setTimeout(initializePreview, 100);
  });
});

/**
 * プレビューパネルの背景を固定
 */
const fixPreviewBackground = () => {
  const previewPanel = document.querySelector('.preview-panel');
  const settingsPanel = document.querySelector('.settings-panel');
  
  if (previewPanel && settingsPanel) {
    const height = Math.max(settingsPanel.offsetHeight, window.innerHeight * 0.7);
    previewPanel.style.minHeight = `${height}px`;
  }
};

// ページ読み込み直後にスマホフレームを安定した位置に配置
function stabilizePhonePosition() {
  const smartphoneFrame = document.querySelector('.smartphone-frame');
  if (!smartphoneFrame) return;
  
  // 初期位置を即座に固定（アニメーションなし）
  smartphoneFrame.style.transition = 'none';
  
  // 向きに応じた適切な位置を設定
  if (smartphoneFrame.classList.contains('portrait')) {
    smartphoneFrame.style.transform = 'scale(0.9)';
  } else {
    smartphoneFrame.style.transform = 'rotate(0deg) scale(0.9)';
  }
  
  // トランジションを元に戻す（少し遅延させる）
  setTimeout(() => {
    smartphoneFrame.style.transition = 'transform 0.3s ease, width 0.3s ease, height 0.3s ease';
  }, 300);
}

// DOM読み込み完了時に実行
document.addEventListener('DOMContentLoaded', () => {
  // 初期表示時の位置を安定化
  stabilizePhonePosition();
});

// 色形式バリデーション関数
function isValidColor(strColor) {
  const s = new Option().style;
  s.color = strColor;
  return s.color !== '';
}