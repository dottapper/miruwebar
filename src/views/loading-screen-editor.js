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
    return Promise.resolve({...defaultSettings});
  },
  
  // 設定保存API
  async saveSettings(data) {
    console.log('Mock API - データ保存:', data);
    return Promise.resolve({...data, id: 1});
  }
};

/**
 * ローディング画面エディタを表示する関数
 * @param {HTMLElement} container - 表示先のコンテナ要素
 */
export default function showLoadingScreenEditor(container) {
  // 認証チェックは削除 - サイトのルーティングシステムが自動的に処理するため
  // このビューは認証済みユーザーのみがアクセスできるようになっている前提

  // HTML構造を作成
  container.innerHTML = `
    <div class="loading-screen-editor">
      <div class="editor-header">
        <h1>ローディング画面設定</h1>
      </div>
      
      <div class="editor-container">
        <!-- 設定パネル -->
        <div class="settings-panel">
          <form id="loading-settings-form">
            <!-- タブナビゲーション -->
            <div class="settings-tabs">
              <button type="button" class="tab-button active" data-tab="general">一般設定</button>
              <button type="button" class="tab-button" data-tab="text">テキスト設定</button>
              <button type="button" class="tab-button" data-tab="animation">アニメーション設定</button>
            </div>
            
            <!-- 一般設定タブ -->
            <div class="tab-content active" data-tab="general">
              <!-- ロゴ画像アップロード -->
              <div class="form-group">
                <label for="logo-upload">ロゴ画像</label>
                <div class="file-input-container">
                  <div class="file-preview" id="logo-preview">
                    <span>ロゴ画像をアップロード</span>
                    <small>ここにファイルをドラッグ＆ドロップするか、下のボタンをクリック</small>
                  </div>
                  <label for="logo-upload" class="file-input-button">ファイルを選択</label>
                  <input type="file" id="logo-upload" name="logo" accept="image/*">
                </div>
              </div>
              
              <!-- 背景色設定 -->
              <div class="form-group">
                <label for="bg-color">背景色</label>
                <div class="color-picker-container">
                  <input type="color" id="bg-color-picker" value="#000000">
                  <input type="text" id="bg-color" name="bgColor" placeholder="rgba(0, 0, 0, 0.85)">
                </div>
              </div>
              
              <!-- テキスト色設定 -->
              <div class="form-group">
                <label for="text-color">テキスト色</label>
                <div class="color-picker-container">
                  <input type="color" id="text-color-picker" value="#ffffff">
                  <input type="text" id="text-color" name="textColor" placeholder="white">
                </div>
              </div>
              
              <!-- アクセントカラー設定 -->
              <div class="form-group">
                <label for="accent-color">アクセントカラー（プログレスバー）</label>
                <div class="color-picker-container">
                  <input type="color" id="accent-color-picker" value="#00a8ff">
                  <input type="text" id="accent-color" name="accentColor" placeholder="#00a8ff">
                </div>
              </div>
              
              <!-- プリセットテーマ選択 -->
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
            <div class="tab-content" data-tab="text">
              <!-- ブランド名設定 -->
              <div class="form-group">
                <label for="brand-name">ブランド名</label>
                <input type="text" id="brand-name" name="name" placeholder="表示するブランド名">
              </div>
              
              <!-- サブタイトル設定 -->
              <div class="form-group">
                <label for="sub-title">サブタイトル</label>
                <input type="text" id="sub-title" name="subTitle" placeholder="サブタイトルテキスト">
              </div>
              
              <!-- ローディングメッセージ設定 -->
              <div class="form-group">
                <label for="loading-message">ローディングメッセージ</label>
                <input type="text" id="loading-message" name="loadingMessage" placeholder="ローディング中に表示するメッセージ">
              </div>
              
              <!-- フォントスケール設定 -->
              <div class="form-group">
                <label for="font-scale">フォントサイズ調整 <span id="font-scale-value" class="font-size-value">100%</span></label>
                <input type="range" id="font-scale" name="fontScale" min="0.5" max="1.5" step="0.1" value="1.0">
                <div class="font-size-presets">
                  <span data-scale="0.7">小</span>
                  <span data-scale="1.0">中</span>
                  <span data-scale="1.3">大</span>
                </div>
              </div>
            </div>
            
            <!-- アニメーション設定タブ -->
            <div class="tab-content" data-tab="animation">
              <!-- アニメーションタイプ設定 -->
              <div class="form-group">
                <label for="animation-type">アニメーションタイプ</label>
                <select id="animation-type" name="animationType">
                  <option value="fade">フェード</option>
                  <option value="slide">スライド</option>
                  <option value="zoom">ズーム</option>
                  <option value="pulse">パルス</option>
                  <option value="bounce">バウンス</option>
                  <option value="spin">スピン</option>
                  <option value="wave">ウェーブ</option>
                </select>
              </div>
              
              <!-- アニメーション速度設定 -->
              <div class="form-group">
                <label for="animation-speed">アニメーション速度</label>
                <select id="animation-speed" name="animationSpeed">
                  <option value="slow">遅い</option>
                  <option value="normal">普通</option>
                  <option value="fast">速い</option>
                </select>
              </div>
              
              <!-- カスタムアニメーション -->
              <div class="form-group">
                <label for="custom-animation">カスタムアニメーション</label>
                <div class="file-input-container">
                  <div class="file-preview" id="animation-preview">
                    <span>アニメーションファイルをアップロード</span>
                    <small>対応形式: JSON (Lottie), GIF, SVG</small>
                    <small>ここにファイルをドラッグ＆ドロップするか、下のボタンをクリック</small>
                  </div>
                  <label for="custom-animation" class="file-input-button">ファイルを選択</label>
                  <input type="file" id="custom-animation" name="customAnimation" accept=".json,.gif,.svg">
                </div>
              </div>
            </div>
            
            <!-- 固定フッター -->
            <div class="fixed-footer">
              <button type="button" class="reset-button" id="reset-button">リセット</button>
              <button type="button" class="preview-button" id="preview-animation-button">アニメーションをプレビュー</button>
              <button type="button" class="cancel-button" id="cancel-button">キャンセル</button>
              <button type="button" class="save-button" id="save-button">保存</button>
            </div>
          </form>
        </div>
        
        <!-- プレビューパネル -->
        <div class="preview-panel">
          <h2>プレビュー</h2>
          
          <!-- 画面向き切替 -->
          <div class="preview-orientation">
            <label>画面向き: </label>
            <div class="orientation-toggle">
              <button type="button" class="orientation-button active" data-orientation="portrait">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12" y2="18.01" />
                </svg>
                縦向き
              </button>
              <button type="button" class="orientation-button" data-orientation="landscape">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
                  <line x1="18" y1="12" x2="18.01" y2="12" />
                </svg>
                横向き
              </button>
            </div>
          </div>
          
          <div class="preview-container">
            <div class="smartphone-frame portrait" id="preview-frame">
              <div class="smartphone-screen">
                <div class="loading-screen-preview" id="preview-screen">
                  <img id="preview-logo" class="preview-logo" src="/path/to/default-logo.png" alt="ロゴ">
                  <div id="preview-brand" class="preview-brand">miru-WebAR</div>
                  <div id="preview-subtitle" class="preview-subtitle">WebARエクスペリエンス</div>
                  <div class="preview-progress">
                    <div id="preview-bar" class="preview-bar"></div>
                  </div>
                  <div id="preview-text" class="preview-text">モデルを読み込んでいます...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // フォーム要素を取得
  const form = document.getElementById('loading-settings-form');
  const brandNameInput = document.getElementById('brand-name');
  const subTitleInput = document.getElementById('sub-title');
  const loadingMessageInput = document.getElementById('loading-message');
  const logoUpload = document.getElementById('logo-upload');
  const logoPreview = document.getElementById('logo-preview');
  const bgColorInput = document.getElementById('bg-color');
  const bgColorPicker = document.getElementById('bg-color-picker');
  const textColorInput = document.getElementById('text-color');
  const textColorPicker = document.getElementById('text-color-picker');
  const accentColorInput = document.getElementById('accent-color');
  const accentColorPicker = document.getElementById('accent-color-picker');
  const animationTypeSelect = document.getElementById('animation-type');
  const animationSpeedSelect = document.getElementById('animation-speed');
  const fontScaleSlider = document.getElementById('font-scale');
  const fontScaleValue = document.getElementById('font-scale-value');
  const customAnimationUpload = document.getElementById('custom-animation');
  const animationPreview = document.getElementById('animation-preview');
  
  // プレビュー要素を取得
  const previewFrame = document.getElementById('preview-frame');
  const previewScreen = document.getElementById('preview-screen');
  const previewLogo = document.getElementById('preview-logo');
  const previewBrand = document.getElementById('preview-brand');
  const previewSubtitle = document.getElementById('preview-subtitle');
  const previewText = document.getElementById('preview-text');
  const previewBar = document.getElementById('preview-bar');
  const previewAnimationButton = document.getElementById('preview-animation-button');
  
  // タブ切り替え要素を取得
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // 画面向き切り替え要素を取得
  const orientationButtons = document.querySelectorAll('.orientation-button');
  
  // テーマオプションを取得
  const themeOptions = document.querySelectorAll('.theme-option');
  
  // アクションボタンを取得
  const saveButton = document.getElementById('save-button');
  const cancelButton = document.getElementById('cancel-button');
  const resetButton = document.getElementById('reset-button');
  
  // 編集中の設定を保持する変数
  let currentSettings = { ...defaultSettings };
  let logoFile = null;
  let customAnimationFile = null;
  
  // 初期設定をロード
  loadSettings();

  // イベントリスナーを設定
  setupEventListeners();
  
  // ドラッグ&ドロップ機能を設定
  setupDragAndDrop();

  /**
   * 保存済みの設定を読み込む
   */
  async function loadSettings() {
    try {
      // API接続に失敗した場合はモックデータを使用
      console.log('モックAPIを使用します');
      const mockSettings = await mockAPI.getSettings();
      currentSettings = { ...defaultSettings, ...mockSettings };
    } catch (error) {
      console.error('設定の読み込み中にエラーが発生しました:', error);
      currentSettings = { ...defaultSettings };
    }
    
    // フォームに値を設定
    updateFormValues();
    
    // プレビューを更新
    updatePreview();
  }
  
  /**
   * フォームの値を更新する
   */
  function updateFormValues() {
    brandNameInput.value = currentSettings.name || '';
    subTitleInput.value = currentSettings.subTitle || '';
    loadingMessageInput.value = currentSettings.loadingMessage || '';
    bgColorInput.value = currentSettings.bgColor || '';
    textColorInput.value = currentSettings.textColor || '';
    accentColorInput.value = currentSettings.accentColor || '';
    animationTypeSelect.value = currentSettings.animationType || 'fade';
    animationSpeedSelect.value = currentSettings.animationSpeed || 'normal';
    fontScaleSlider.value = currentSettings.fontScale || 1.0;
    fontScaleValue.textContent = `${Math.round(currentSettings.fontScale * 100)}%`;
    
    // カラーピッカーの値を更新（可能な場合）
    try {
      // 色変換関数を使用
      bgColorPicker.value = convertToHexColor(currentSettings.bgColor || '#000000');
      textColorPicker.value = convertToHexColor(currentSettings.textColor || '#ffffff');
      accentColorPicker.value = convertToHexColor(currentSettings.accentColor || '#00a8ff');
    } catch (e) {
      console.warn('カラーピッカーの値設定に失敗しました:', e);
    }
    
    // ロゴプレビューを更新
    if (currentSettings.logo) {
      logoPreview.innerHTML = `<img src="${currentSettings.logo}" alt="ロゴ">`;
      logoPreview.classList.remove('empty');
    } else {
      logoPreview.innerHTML = `<span>ロゴ画像をアップロード</span><small>ここにファイルをドラッグ＆ドロップするか、下のボタンをクリック</small>`;
      logoPreview.classList.add('empty');
    }
    
    // カスタムアニメーションプレビューを更新
    if (currentSettings.customAnimation) {
      const fileExt = currentSettings.customAnimation.split('.').pop().toLowerCase();
      if (fileExt === 'json') {
        animationPreview.innerHTML = `<span>Lottieアニメーション</span>`;
      } else if (fileExt === 'gif') {
        animationPreview.innerHTML = `<img src="${currentSettings.customAnimation}" alt="アニメーション">`;
      } else if (fileExt === 'svg') {
        animationPreview.innerHTML = `<img src="${currentSettings.customAnimation}" alt="アニメーション">`;
      }
      animationPreview.classList.remove('empty');
    } else {
      animationPreview.innerHTML = `<span>アニメーションファイルをアップロード</span><small>対応形式: JSON (Lottie), GIF, SVG</small>`;
      animationPreview.classList.add('empty');
    }
  }
  
  /**
   * 色を16進数形式(#rrggbb)に変換する
   * @param {string} color - 変換する色（名前、RGB、RGBA、16進数）
   * @returns {string} 16進数形式の色
   */
  function convertToHexColor(color) {
    // nullやundefinedの場合
    if (!color) return '#000000';
    
    // すでに16進数形式なら変換不要
    if (color.match(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/)) {
      // 3桁の16進数の場合は6桁に拡張
      if (color.length === 4) {
        return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
      }
      return color;
    }
    
    // 色名の場合は対応する16進数を返す
    if (typeof color === 'string' && color.toLowerCase() in colorNameToHex) {
      return colorNameToHex[color.toLowerCase()];
    }
    
    // rgb()形式の場合
    const rgbMatch = color.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
    if (rgbMatch) {
      return `#${parseInt(rgbMatch[1]).toString(16).padStart(2, '0')}${parseInt(rgbMatch[2]).toString(16).padStart(2, '0')}${parseInt(rgbMatch[3]).toString(16).padStart(2, '0')}`;
    }
    
    // rgba()形式の場合（透明度は無視して16進数に）
    const rgbaMatch = color.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)$/);
    if (rgbaMatch) {
      return `#${parseInt(rgbaMatch[1]).toString(16).padStart(2, '0')}${parseInt(rgbaMatch[2]).toString(16).padStart(2, '0')}${parseInt(rgbaMatch[3]).toString(16).padStart(2, '0')}`;
    }
    
    // 変換できない場合はデフォルトの黒を返す
    console.warn('変換できない色形式:', color);
    return '#000000';
  }
  
  /**
   * プレビューを更新する
   */
  function updatePreview() {
    // ブランド名を更新
    previewBrand.textContent = currentSettings.name || 'miru-WebAR';
    
    // サブタイトルを更新
    previewSubtitle.textContent = currentSettings.subTitle || 'WebARエクスペリエンス';
    
    // ローディングテキストを更新
    previewText.textContent = currentSettings.loadingMessage || 'モデルを読み込んでいます...';
    
    // ロゴを更新
    if (currentSettings.logo) {
      previewLogo.src = currentSettings.logo;
      previewLogo.style.display = 'block';
    } else {
      previewLogo.style.display = 'none';
    }
    
    // スタイルを更新
    previewScreen.style.backgroundColor = currentSettings.bgColor || 'rgba(0, 0, 0, 0.85)';
    previewBrand.style.color = currentSettings.textColor || '#ffffff';
    previewSubtitle.style.color = currentSettings.textColor || '#ffffff';
    previewText.style.color = currentSettings.textColor || '#ffffff';
    previewBar.style.backgroundColor = currentSettings.accentColor || '#00a8ff';
    
    // フォントスケールを適用
    const fontScale = currentSettings.fontScale || 1.0;
    previewBrand.style.fontSize = `${24 * fontScale}px`;
    previewSubtitle.style.fontSize = `${16 * fontScale}px`;
    previewText.style.fontSize = `${14 * fontScale}px`;
    
    // テキストの中央揃えを強制
    previewBrand.style.textAlign = 'center';
    previewBrand.style.width = '100%';
    previewSubtitle.style.textAlign = 'center';
    previewSubtitle.style.width = '100%';
    previewText.style.textAlign = 'center';
    previewText.style.width = '100%';

    // プレビュー要素の中央配置を強化
    previewScreen.style.display = 'flex';
    previewScreen.style.flexDirection = 'column';
    previewScreen.style.justifyContent = 'center';
    previewScreen.style.alignItems = 'center';
    
    // アニメーション速度クラスを適用
    previewScreen.classList.remove('animation-slow', 'animation-normal', 'animation-fast');
    previewScreen.classList.add(`animation-${currentSettings.animationSpeed || 'normal'}`);
  }
  
  // フォームでのドラッグアンドドロップ処理を設定
  function setupDragAndDrop() {
    // ロゴ画像エリア
    const logoPreview = document.getElementById('logo-preview');
    
    // ドラッグ&ドロップイベント (ロゴ)
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      logoPreview.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
      logoPreview.addEventListener(eventName, () => {
        logoPreview.classList.add('highlight');
      }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      logoPreview.addEventListener(eventName, () => {
        logoPreview.classList.remove('highlight');
      }, false);
    });
    
    logoPreview.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const file = dt.files[0];
      if (file && file.type.match('image.*')) {
        handleLogoFile(file);
        
        // 視覚的フィードバック
        logoPreview.classList.add('success');
        setTimeout(() => {
          logoPreview.classList.remove('success');
        }, 1000);
      } else {
        // エラーフィードバック
        logoPreview.classList.add('error');
        setTimeout(() => {
          logoPreview.classList.remove('error');
        }, 1000);
      }
    });
    
    // アニメーションファイルエリア
    const animationPreview = document.getElementById('animation-preview');
    
    // ドラッグ&ドロップイベント (アニメーション)
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      animationPreview.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
      animationPreview.addEventListener(eventName, () => {
        animationPreview.classList.add('highlight');
      }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      animationPreview.addEventListener(eventName, () => {
        animationPreview.classList.remove('highlight');
      }, false);
    });
    
    animationPreview.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const file = dt.files[0];
      if (file) {
        const fileExt = file.name.split('.').pop().toLowerCase();
        if (fileExt === 'json' || fileExt === 'gif' || fileExt === 'svg') {
          handleAnimationFile(file);
        }
      }
    });
  }
  
  // ロゴファイル処理関数
  function handleLogoFile(file) {
    logoFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      logoPreview.innerHTML = `<img src="${e.target.result}" alt="ロゴ">`;
      logoPreview.classList.remove('empty');
      
      // プレビューも更新
      previewLogo.src = e.target.result;
      previewLogo.style.display = 'block';
      
      // 設定も更新
      currentSettings.logo = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  // アニメーションファイル処理関数
  function handleAnimationFile(file) {
    customAnimationFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileExt = file.name.split('.').pop().toLowerCase();
      
      if (fileExt === 'json') {
        animationPreview.innerHTML = `<span>Lottieアニメーション: ${file.name}</span>`;
      } else if (fileExt === 'gif' || fileExt === 'svg') {
        animationPreview.innerHTML = `<img src="${e.target.result}" alt="アニメーション">`;
      }
      
      animationPreview.classList.remove('empty');
      
      // 設定も更新
      currentSettings.customAnimation = e.target.result;
      currentSettings.animationType = 'custom';
      
      // アニメーションタイプを「カスタム」に設定
      if (!animationTypeSelect.querySelector('option[value="custom"]')) {
        const customOption = document.createElement('option');
        customOption.value = 'custom';
        customOption.textContent = 'カスタム';
        animationTypeSelect.appendChild(customOption);
      }
      animationTypeSelect.value = 'custom';
    };
    reader.readAsDataURL(file);
  }

  /**
   * イベントリスナーを設定する
   */
  function setupEventListeners() {
    // タブ切り替え
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tab = button.getAttribute('data-tab');
        
        // アクティブクラスを全てのタブから削除
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // クリックされたタブにアクティブクラスを追加
        button.classList.add('active');
        document.querySelector(`.tab-content[data-tab="${tab}"]`).classList.add('active');
      });
    });
    
    // 画面向き切り替え
    orientationButtons.forEach(button => {
      button.addEventListener('click', () => {
        const orientation = button.getAttribute('data-orientation');
        
        // アクティブクラスを全てのボタンから削除
        orientationButtons.forEach(btn => btn.classList.remove('active'));
        
        // クリックされたボタンにアクティブクラスを追加
        button.classList.add('active');
        
        // プレビューフレームのクラスを変更
        previewFrame.classList.remove('portrait', 'landscape');
        previewFrame.classList.add(orientation);
      });
    });
    
    // フォントサイズプリセット
    document.querySelectorAll('.font-size-presets span').forEach(preset => {
      preset.addEventListener('click', () => {
        const scale = parseFloat(preset.getAttribute('data-scale'));
        fontScaleSlider.value = scale;
        currentSettings.fontScale = scale;
        fontScaleValue.textContent = `${Math.round(scale * 100)}%`;
        updatePreview();
      });
    });
    
    // テーマプリセット選択
    themeOptions.forEach(option => {
      option.addEventListener('click', () => {
        const theme = option.getAttribute('data-theme');
        
        // アクティブクラスを全てのオプションから削除
        themeOptions.forEach(opt => opt.classList.remove('active'));
        
        // クリックされたオプションにアクティブクラスを追加
        option.classList.add('active');
        
        // テーマに応じた設定を適用
        applyThemePreset(theme);
      });
    });
    
    // 保存ボタンのイベント
    saveButton.addEventListener('click', async () => {
      saveSettings();
    });
    
    // フォーム送信時の処理
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      saveSettings();
    });
    
    // キャンセルボタンのイベント
    cancelButton.addEventListener('click', () => {
      window.location.hash = '#/projects';
    });
    
    // リセットボタンのイベント
    resetButton.addEventListener('click', () => {
      if (confirm('設定をデフォルトに戻しますか？')) {
        currentSettings = { ...defaultSettings };
        updateFormValues();
        updatePreview();
      }
    });
    
    // ロゴ画像アップロード時の処理
    logoUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleLogoFile(file);
      }
    });
    
    // カスタムアニメーションアップロード時の処理
    customAnimationUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleAnimationFile(file);
      }
    });
    
    // カラーピッカーと入力フィールドの連動
    bgColorPicker.addEventListener('input', (e) => {
      const color = e.target.value;
      bgColorInput.value = color;
      currentSettings.bgColor = color;
      updatePreview();
    });
    
    bgColorInput.addEventListener('input', (e) => {
      const color = e.target.value;
      currentSettings.bgColor = color;
      try {
        if (color.startsWith('#') || colorNameToHex[color.toLowerCase()]) {
          bgColorPicker.value = convertToHexColor(color);
        }
      } catch (e) {}
      updatePreview();
    });
    
    textColorPicker.addEventListener('input', (e) => {
      const color = e.target.value;
      textColorInput.value = color;
      currentSettings.textColor = color;
      updatePreview();
    });
    
    textColorInput.addEventListener('input', (e) => {
      const color = e.target.value;
      currentSettings.textColor = color;
      try {
        if (color.startsWith('#') || colorNameToHex[color.toLowerCase()]) {
          textColorPicker.value = convertToHexColor(color);
        }
      } catch (e) {}
      updatePreview();
    });
    
    accentColorPicker.addEventListener('input', (e) => {
      const color = e.target.value;
      accentColorInput.value = color;
      currentSettings.accentColor = color;
      updatePreview();
    });
    
    accentColorInput.addEventListener('input', (e) => {
      const color = e.target.value;
      currentSettings.accentColor = color;
      try {
        if (color.startsWith('#') || colorNameToHex[color.toLowerCase()]) {
          accentColorPicker.value = convertToHexColor(color);
        }
      } catch (e) {}
      updatePreview();
    });
    
    // ブランド名変更時の処理
    brandNameInput.addEventListener('input', (e) => {
      const name = e.target.value;
      currentSettings.name = name;
      updatePreview();
    });
    
    // サブタイトル変更時の処理
    subTitleInput.addEventListener('input', (e) => {
      const subTitle = e.target.value;
      currentSettings.subTitle = subTitle;
      updatePreview();
    });
    
    // ローディングメッセージ変更時の処理
    loadingMessageInput.addEventListener('input', (e) => {
      const message = e.target.value;
      currentSettings.loadingMessage = message;
      updatePreview();
    });
    
    // フォントスケール変更時の処理
    fontScaleSlider.addEventListener('input', (e) => {
      const scale = parseFloat(e.target.value);
      currentSettings.fontScale = scale;
      fontScaleValue.textContent = `${Math.round(scale * 100)}%`;
      updatePreview();
    });
    
    // アニメーションタイプ変更時の処理
    animationTypeSelect.addEventListener('change', (e) => {
      const animationType = e.target.value;
      currentSettings.animationType = animationType;
    });
    
    // アニメーション速度変更時の処理
    animationSpeedSelect.addEventListener('change', (e) => {
      const animationSpeed = e.target.value;
      currentSettings.animationSpeed = animationSpeed;
      updatePreview();
    });
    
    // アニメーションプレビューボタンのイベント
    previewAnimationButton.addEventListener('click', () => {
      // 現在のアニメーションクラスをすべて削除
      const allAnimationClasses = [
        'fade-animation', 
        'slide-animation', 
        'zoom-animation', 
        'pulse-animation', 
        'bounce-animation', 
        'spin-animation',
        'wave-animation',
        'custom-animation'
      ];
      
      previewScreen.classList.remove(...allAnimationClasses);
      
      // アニメーションを一時停止してから再適用するためのトリック
      void previewScreen.offsetWidth; // リフロー強制
      
      // アニメーションを適用
      const animationType = animationTypeSelect.value;
      if (animationType === 'custom' && currentSettings.customAnimation) {
        // カスタムアニメーションの場合
        previewScreen.classList.add('custom-animation');
        
        // カスタムアニメーションの種類に応じた処理
        const fileExt = currentSettings.customAnimation.split(';')[0].split('/').pop();
        if (fileExt === 'json') {
          // Lottieアニメーションの処理（実装が必要）
          alert('Lottieアニメーションのプレビューは実装中です');
        }
      } else if (animationPresets[animationType]) {
        // プリセットアニメーションの場合
        previewScreen.classList.add(`${animationType}-animation`);
        
        // スピンアニメーションの場合、ロゴも回転させる
        if (animationType === 'spin') {
          previewLogo.style.animation = `spinAnimation ${currentSettings.animationSpeed || 'normal'} infinite linear`;
        } else {
          previewLogo.style.animation = '';
        }
      }
      
      // アニメーションボタンに視覚的フィードバック
      previewAnimationButton.classList.add('active');
      previewAnimationButton.textContent = 'アニメーション再生中...';
      
      // 少し時間をおいてボタンを元に戻す
      setTimeout(() => {
        previewAnimationButton.classList.remove('active');
        previewAnimationButton.textContent = 'アニメーションをプレビュー';
      }, 2000);
    });
  }
  
  /**
   * テーマプリセットを適用する
   * @param {string} theme - テーマ名
   */
  function applyThemePreset(theme) {
    switch(theme) {
      case 'dark':
        bgColorInput.value = 'rgba(0, 0, 0, 0.9)';
        textColorInput.value = '#ffffff';
        accentColorInput.value = '#00a8ff';
        break;
      case 'light':
        bgColorInput.value = 'rgba(255, 255, 255, 0.9)';
        textColorInput.value = '#333333';
        accentColorInput.value = '#0066cc';
        break;
      case 'blue':
        bgColorInput.value = 'rgba(10, 30, 60, 0.9)';
        textColorInput.value = '#ffffff';
        accentColorInput.value = '#00ffcc';
        break;
      case 'vibrant':
        bgColorInput.value = 'rgba(120, 20, 180, 0.9)';
        textColorInput.value = '#ffffff';
        accentColorInput.value = '#ff9500';
        break;
    }
    
    // カラーピッカーの値も更新
    try {
      bgColorPicker.value = convertToHexColor(bgColorInput.value);
      textColorPicker.value = convertToHexColor(textColorInput.value);
      accentColorPicker.value = convertToHexColor(accentColorInput.value);
    } catch (e) {}
    
    // 設定を更新
    currentSettings.bgColor = bgColorInput.value;
    currentSettings.textColor = textColorInput.value;
    currentSettings.accentColor = accentColorInput.value;
    
    // プレビューを更新
    updatePreview();
  }
  
  /**
   * 設定を保存する
   */
  async function saveSettings() {
    // 保存中の表示
    saveButton.textContent = '保存中...';
    saveButton.disabled = true;
    
    try {
      // フォームデータをオブジェクトに変換（色を適切に変換）
      const formData = new FormData(form);
      
      // ロゴ画像を追加（存在する場合）
      if (logoFile) {
        formData.set('logo', logoFile);
      }
      
      // カスタムアニメーションを追加（存在する場合）
      if (customAnimationFile) {
        formData.set('customAnimation', customAnimationFile);
      }
      
      const formDataObj = {};
      
      formData.forEach((value, key) => {
        if (value instanceof File) {
          // ファイル以外の値を保存
          return;
        }
        
        // 色の場合は16進数形式に変換
        if (key === 'textColor' || key === 'bgColor' || key === 'accentColor') {
          formDataObj[key] = value;
        } else if (key === 'fontScale') {
          formDataObj[key] = parseFloat(value);
        } else {
          formDataObj[key] = value;
        }
      });
      
      let savedSettings;
      
      // API接続に失敗した場合はモックAPIを使用
      console.log('モックAPIを使用して保存します', formDataObj);
      savedSettings = await mockAPI.saveSettings(formDataObj);
      
      // ロゴ画像がある場合はDataURLを使用（モック用）
      if (logoFile) {
        try {
          const reader = new FileReader();
          const dataUrl = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(logoFile);
          });
          
          savedSettings.logo = dataUrl;
        } catch (e) {
          console.error('画像の読み込みエラー:', e);
        }
      }
      
      // カスタムアニメーションがある場合はDataURLを使用（モック用）
      if (customAnimationFile) {
        try {
          const reader = new FileReader();
          const dataUrl = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(customAnimationFile);
          });
          
          savedSettings.customAnimation = dataUrl;
        } catch (e) {
          console.error('アニメーション読み込みエラー:', e);
        }
      }
      
      // 保存した設定を反映
      currentSettings = { ...currentSettings, ...savedSettings };
      
      // 成功メッセージを表示
      alert('設定を保存しました。');
      
      // フォームに値を再設定
      updateFormValues();
      
      // プレビューを更新
      updatePreview();
    } catch (error) {
      console.error('設定の保存中にエラーが発生しました:', error);
      alert('設定の保存中にエラーが発生しました。');
    } finally {
      // ボタンを元に戻す
      saveButton.textContent = '保存';
      saveButton.disabled = false;
    }
  }
} 