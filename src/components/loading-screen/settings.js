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
    logoSize: 1.8
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
      markerSize: 1.0, // マーカー画像のサイズ倍率
      textPosition: 20, // テキストの上からの位置（%）
      textSize: 1.0, // テキストサイズの倍率
      footerPosition: 85 // フッターテキスト位置（上から%）
    },
    worldTracking: {
      title: '画面をタップしてください',
      description: '平らな面を見つけて画面をタップしてください',
      instructionText: '平面を検出中...',
      guideImage: null, // ガイド用の平面検出画像
      textPosition: 20, // テキストの上からの位置（%）
      textSize: 1.0, // テキストサイズの倍率
      footerPosition: 85 // フッターテキスト位置（上から%）
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
      
      // まず画像圧縮を試行
      const optimizedSettings = this.optimizeImageData(merged);
      const settingsJson = JSON.stringify(optimizedSettings);
      
      // localStorageの容量制限をチェック（画像データのみ2MB制限）
      const maxImageSize = 2 * 1024 * 1024; // 2MB
      
      // 画像データのみのサイズを計算
      const imageDataSize = this.calculateImageDataSize(optimizedSettings);
      
      console.log('画像データ容量チェック:', {
        imageSize: (imageDataSize / 1024).toFixed(2) + 'KB',
        maxSize: (maxImageSize / 1024 / 1024).toFixed(2) + 'MB',
        usagePercentage: ((imageDataSize / maxImageSize) * 100).toFixed(1) + '%'
      });
      
      if (imageDataSize > maxImageSize) {
        console.warn('画像データが大きすぎます:', {
          size: imageDataSize,
          maxSize: maxImageSize,
          sizeInMB: (imageDataSize / 1024 / 1024).toFixed(2)
        });
        
        // 画像データを削除して再試行
        const settingsWithoutImages = this.removeImageData(merged);
        const imageDataSizeWithoutImages = this.calculateImageDataSize(settingsWithoutImages);
        
        if (imageDataSizeWithoutImages > 0) {
          throw new Error(`画像データの容量が制限を超えています（${(imageDataSize / 1024 / 1024).toFixed(2)}MB）。\n\n画像データの制限: 2MB\n\n💡 解決方法:\n• 画像サイズを小さくする（推奨: 1MB以下）\n• 解像度を下げる（推奨: 1920x1080以下）\n• 不要な画像を削除する`);
        } else {
          console.log('⚠️ 画像データが大きすぎるため、画像なしで保存します');
          localStorage.setItem('loadingScreenSettings', JSON.stringify(settingsWithoutImages));
          
          // ユーザーに通知するためのカスタムエラーを投げる
          const warningError = new Error(`⚠️ 画像が大きすぎるため、画像なしで保存されました。\n\n📊 画像データの容量制限: 2MB\n💡 画像を圧縮してから再保存してください。`);
          warningError.type = 'warning';
          throw warningError;
        }
      }
      
      // 正常な保存処理
      try {
        localStorage.setItem('loadingScreenSettings', settingsJson);
        console.log('✅ 設定を正常に保存しました:', {
          size: (settingsJson.length / 1024).toFixed(2) + 'KB'
        });
      } catch (storageError) {
        // localStorageの容量不足の場合
        if (storageError.name === 'QuotaExceededError') {
          // 古いデータを削除して再試行
          this.cleanupOldData();
          try {
            localStorage.setItem('loadingScreenSettings', settingsJson);
            console.log('✅ データクリーンアップ後に保存成功');
          } catch (secondError) {
            throw new Error('ローカルストレージの容量が不足しています。\n\n他のサイトのデータを削除するか、ブラウザのキャッシュをクリアしてください。');
          }
        } else {
          throw storageError;
        }
      }
      
      return Promise.resolve(optimizedSettings);
    } catch (error) {
      console.error('設定保存エラー:', error);
      
      if (error.type === 'warning') {
        // 警告レベルのエラー（画像なしで保存成功）
        throw error;
      } else {
        // 完全な失敗
        throw new Error(`設定の保存に失敗しました: ${error.message}`);
      }
    }
  },
  
  // 設定をデフォルト値とマージする
  mergeWithDefaults(settings) {
    const merged = JSON.parse(JSON.stringify(defaultSettings)); // ディープコピー
    
    // 各画面タイプの設定をマージ
    ['startScreen', 'loadingScreen', 'guideScreen'].forEach(screenType => {
      if (settings[screenType]) {
        // 各プロパティを個別に確認してマージ
        Object.keys(settings[screenType]).forEach(key => {
          // 空文字列も有効な値として扱う（ユーザーの意図を尊重）
          if (settings[screenType][key] !== undefined) {
            merged[screenType][key] = settings[screenType][key];
          }
        });
        
        // ガイド画面の特別処理（ネストしたオブジェクト）
        if (screenType === 'guideScreen') {
          if (settings[screenType].surfaceDetection) {
            Object.keys(settings[screenType].surfaceDetection).forEach(key => {
              if (settings[screenType].surfaceDetection[key] !== undefined) {
                merged[screenType].surfaceDetection[key] = settings[screenType].surfaceDetection[key];
              }
            });
          }
          if (settings[screenType].worldTracking) {
            Object.keys(settings[screenType].worldTracking).forEach(key => {
              if (settings[screenType].worldTracking[key] !== undefined) {
                merged[screenType].worldTracking[key] = settings[screenType].worldTracking[key];
              }
            });
          }
        }
        
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

  // localStorageの使用量を取得
  getLocalStorageUsage() {
    let total = 0;
    let keys = [];
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const size = localStorage[key].length + key.length;
        total += size;
        keys.push({ key, size });
      }
    }
    
    return { total, keys };
  },
  
  // ローディング画面関連のストレージ使用量のみを取得
  getLoadingScreenStorageUsage() {
    let loadingScreenTotal = 0;
    const loadingScreenKeys = [];
    const maxSize = 2 * 1024 * 1024; // 2MB制限
    
    // ローディング画面関連のキーのみを対象
    const relevantKeys = [
      'loadingScreenSettings',
      'loadingScreenTemplates',
      'lastUsedTemplateId'
    ];
    
    for (const key of relevantKeys) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage[key];
        const size = value.length + key.length;
        loadingScreenTotal += size;
        loadingScreenKeys.push({ 
          key, 
          size,
          sizeKB: (size / 1024).toFixed(2),
          sizeMB: (size / 1024 / 1024).toFixed(2)
        });
      }
    }
    
    // 使用率を計算
    const usagePercentage = (loadingScreenTotal / maxSize) * 100;
    
    return {
      total: loadingScreenTotal,
      totalKB: (loadingScreenTotal / 1024).toFixed(2),
      totalMB: (loadingScreenTotal / 1024 / 1024).toFixed(2),
      maxSize,
      maxSizeMB: (maxSize / 1024 / 1024).toFixed(1),
      usagePercentage: usagePercentage.toFixed(1),
      keys: loadingScreenKeys,
      isNearLimit: usagePercentage > 80,
      isOverLimit: loadingScreenTotal > maxSize
    };
  },
  
  // 古いデータをクリーンアップ
  cleanupOldData() {
    try {
      // 古いテンプレートや一時データを削除
      const keysToClean = [];
      for (let key in localStorage) {
        if (key.startsWith('temp_') || 
            key.startsWith('old_') || 
            key.includes('backup_')) {
          keysToClean.push(key);
        }
      }
      
      keysToClean.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log('🧹 古いデータをクリーンアップしました:', keysToClean.length, 'items');
    } catch (error) {
      console.warn('クリーンアップ中にエラー:', error);
    }
  },
  
  // 画像データを最適化（圧縮）
  optimizeImageData(settings) {
    const optimized = JSON.parse(JSON.stringify(settings));
    
    // 各画面の画像データを最適化
    ['startScreen', 'loadingScreen', 'guideScreen'].forEach(screenType => {
      if (optimized[screenType]) {
        Object.keys(optimized[screenType]).forEach(key => {
          const value = optimized[screenType][key];
          if (typeof value === 'string' && value.startsWith('data:image/')) {
            // Base64画像データの場合、品質を調整して圧縮
            const compressedImage = this.compressBase64Image(value);
            if (compressedImage && compressedImage.length < value.length) {
              optimized[screenType][key] = compressedImage;
              console.log(`📦 ${screenType}.${key} を圧縮: ${(value.length / 1024).toFixed(2)}KB → ${(compressedImage.length / 1024).toFixed(2)}KB`);
            }
          }
        });
        
        // ガイド画面の入れ子オブジェクトも処理
        if (screenType === 'guideScreen') {
          ['surfaceDetection', 'worldTracking'].forEach(subType => {
            if (optimized[screenType][subType] && optimized[screenType][subType].guideImage) {
              const value = optimized[screenType][subType].guideImage;
              if (typeof value === 'string' && value.startsWith('data:image/')) {
                const compressedImage = this.compressBase64Image(value);
                if (compressedImage && compressedImage.length < value.length) {
                  optimized[screenType][subType].guideImage = compressedImage;
                  console.log(`📦 ${screenType}.${subType}.guideImage を圧縮`);
                }
              }
            }
          });
        }
      }
    });
    
    return optimized;
  },
  
  // Base64画像を圧縮
  compressBase64Image(base64String) {
    try {
      // この関数は簡易版 - 実際の圧縮は別途実装が必要
      // 現在は元のデータをそのまま返す
      return base64String;
    } catch (error) {
      console.warn('画像圧縮中にエラー:', error);
      return base64String;
    }
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
  },
  
  // 画像データのみの容量を計算する関数
  calculateImageDataSize(settingsObject) {
    let totalImageSize = 0;
    
    try {
      if (settingsObject) {
        // 設定オブジェクトから画像データサイズを計算
        const imagePaths = [
          settingsObject.startScreen?.thumbnail,
          settingsObject.startScreen?.logo,
          settingsObject.loadingScreen?.logo,
          settingsObject.guideScreen?.surfaceDetection?.guideImage,
          settingsObject.guideScreen?.worldTracking?.guideImage
        ];
        
        imagePaths.forEach(imageSrc => {
          if (imageSrc && typeof imageSrc === 'string' && imageSrc.startsWith('data:')) {
            const base64Data = imageSrc.split(',')[1];
            if (base64Data) {
              // Base64は元データの約1.33倍なので、元のサイズに近似
              totalImageSize += (base64Data.length * 0.75);
            }
          }
        });
      }
    } catch (error) {
      console.warn('画像データサイズ計算中にエラー:', error);
    }
    
    return Math.round(totalImageSize);
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