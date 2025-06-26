/**
 * ローディング画面エディタの設定管理
 */

// デフォルト設定の定義
export const defaultSettings = {
  startScreen: {
    title: 'AR体験を開始',
    buttonText: '開始',
    buttonColor: '#6c5ce7',
    thumbnail: null,
    backgroundColor: '#121212',
    textColor: '#ffffff',
    accentColor: '#6c5ce7',
    titlePosition: 40,
    buttonPosition: 60,
    titleSize: 1.0,
    buttonSize: 1.0,
    buttonTextColor: '#ffffff',
    logo: null,
    logoPosition: 20,
    logoSize: 1.0
  },
  loadingScreen: {
    backgroundColor: '#121212',
    textColor: '#ffffff',
    accentColor: '#6c5ce7',
    logo: null,
    brandName: 'あなたのブランド',
    subTitle: 'AR体験',
    loadingMessage: '読み込み中...',
    fontScale: 1.0,
    animation: 'fade'
  },
  guideScreen: {
    backgroundColor: '#121212',
    textColor: '#ffffff',
    accentColor: '#6c5ce7',
    title: 'ガイド画面',
    description: '準備中',
    mode: 'surface', // 'surface' (平面検出) または 'world' (空間検出)
    surfaceDetection: {
      title: '画像の上にカメラを向けて合わせてください',
      description: 'マーカー画像を画面内に収めてください',
      instructionText: '画像を認識しています...',
      guideImage: null // ガイド用のマーカー画像
    },
    worldTracking: {
      title: '画面をタップしてください',
      description: '平らな面を見つけて画面をタップしてください',
      instructionText: '平面を検出中...',
      guideImage: null // ガイド用の平面検出画像
    }
  }
};

// サムネイル制限
export const thumbnailLimits = {
  maxSize: 2 * 1024 * 1024, // 2MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxWidth: 1920,
  maxHeight: 1080
};

// カラー値のバリデーションと修正を行う関数
export function validateAndFixColor(color) {
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

// モックAPI - ローカルストレージを使用
export const settingsAPI = {
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
        // 各プロパティを個別に確認してマージ
        Object.keys(merged[screenType]).forEach(key => {
          // 空文字列も有効な値として扱う
          if (settings[screenType][key] !== undefined) {
            merged[screenType][key] = settings[screenType][key];
          }
        });
        
        // カラー値の検証と修正
        ['backgroundColor', 'textColor', 'accentColor', 'buttonColor', 'buttonTextColor'].forEach(colorProp => {
          if (settings[screenType]?.[colorProp]) {
            merged[screenType][colorProp] = validateAndFixColor(settings[screenType][colorProp]);
          }
        });
      }
    });
    
    console.log('マージ後の設定:', merged);
    return merged;
  },

  resetSettings() {
    // ローカルストレージをクリア
    localStorage.removeItem('loadingScreenSettings');
    console.log('設定をリセットしました');
    return JSON.parse(JSON.stringify(defaultSettings));
  }
};

// ヘルパー関数
export function isValidColor(strColor) {
  const s = new Option().style;
  s.color = strColor;
  return s.color !== '';
}

export function convertToHexColor(color) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  return ctx.fillStyle;
} 