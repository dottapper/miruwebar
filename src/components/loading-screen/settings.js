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
    logoSize: 1.5
  },
  loadingScreen: {
    backgroundColor: '#121212',
    textColor: '#ffffff',
    accentColor: '#6c5ce7',
    logoType: 'none', // 'none', 'useStartLogo', 'custom'
    logo: null, // カスタムロゴのファイルデータ
    logoPosition: 20,
    logoSize: 1.5,
    brandName: 'あなたのブランド',
    subTitle: 'AR体験',
    loadingMessage: '読み込み中...',
    fontScale: 1.0,
    animation: 'none'
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
      guideImage: null, // ガイド用のマーカー画像
      markerSize: 1.0 // マーカー画像のサイズ倍率
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
    try {
      const merged = this.mergeWithDefaults(settings);
      const settingsJson = JSON.stringify(merged);
      
      // localStorageの容量制限をチェック（約5MB）
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (settingsJson.length > maxSize) {
        console.error('設定データが大きすぎます:', {
          size: settingsJson.length,
          maxSize: maxSize,
          sizeInMB: (settingsJson.length / 1024 / 1024).toFixed(2)
        });
        
        // 画像データを削除して再試行
        const settingsWithoutImages = this.removeImageData(merged);
        const settingsWithoutImagesJson = JSON.stringify(settingsWithoutImages);
        
        if (settingsWithoutImagesJson.length > maxSize) {
          throw new Error(`設定データが大きすぎます（${(settingsJson.length / 1024 / 1024).toFixed(2)}MB）。画像を削除してから保存してください。`);
        } else {
          console.log('画像データを削除して保存します');
          localStorage.setItem('loadingScreenSettings', settingsWithoutImagesJson);
          return Promise.resolve(settingsWithoutImages);
        }
      }
      
      localStorage.setItem('loadingScreenSettings', settingsJson);
      
      return Promise.resolve(merged);
    } catch (error) {
      console.error('設定保存エラー:', error);
      throw new Error(`設定の保存に失敗しました: ${error.message}`);
    }
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
  },

  // 画像データを削除するヘルパー関数
  removeImageData(settings) {
    const cleanedSettings = JSON.parse(JSON.stringify(settings));
    
    // スタート画面の画像データを削除
    if (cleanedSettings.startScreen) {
      delete cleanedSettings.startScreen.logo;
      delete cleanedSettings.startScreen.thumbnail;
    }
    
    // ローディング画面の画像データを削除
    if (cleanedSettings.loadingScreen) {
      delete cleanedSettings.loadingScreen.logo;
    }
    
    // ガイド画面の画像データを削除
    if (cleanedSettings.guideScreen) {
      if (cleanedSettings.guideScreen.surfaceDetection) {
        delete cleanedSettings.guideScreen.surfaceDetection.guideImage;
      }
      if (cleanedSettings.guideScreen.worldTracking) {
        delete cleanedSettings.guideScreen.worldTracking.guideImage;
      }
    }
    
    console.log('🧹 画像データを削除しました');
    return cleanedSettings;
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