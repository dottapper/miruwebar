/**
 * ローディング画面エディタの設定管理
 */

import {
  INDIVIDUAL_IMAGE_MAX_BYTES,
  TOTAL_IMAGES_MAX_BYTES,
  TOTAL_IMAGES_MAX_MB,
  ALLOWED_MIME_TYPES,
  COMPRESSION_SETTINGS,
  ERROR_MESSAGES,
  ERROR_TYPES,
  CAPACITY_UTILS
} from './constants.js';
import { TEMPLATES_STORAGE_KEY } from './template-manager.js';

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
    // ローディング画面のテキスト（ブランド名/サブタイトル）ブロックの縦位置（%）
    textPosition: 40,
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
  maxSize: INDIVIDUAL_IMAGE_MAX_BYTES,
  allowedTypes: ALLOWED_MIME_TYPES,
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

export const SETTINGS_STORAGE_KEY = 'loadingScreenSettings';
export const EDITOR_SETTINGS_STORAGE_KEY = 'loadingScreenSettings_editor';

function getStoredSettingsJson() {
  return localStorage.getItem(SETTINGS_STORAGE_KEY) || localStorage.getItem(EDITOR_SETTINGS_STORAGE_KEY);
}

function persistSettingsJson(settingsJson) {
  // 旧状態管理キーは3D編集側の stale data 原因になるため、正の保存先に統一する。
  localStorage.removeItem(EDITOR_SETTINGS_STORAGE_KEY);
  localStorage.setItem(SETTINGS_STORAGE_KEY, settingsJson);
}

function persistSettingsObject(settings) {
  persistSettingsJson(JSON.stringify(settings));
}

function clearPersistedSettings() {
  localStorage.removeItem(SETTINGS_STORAGE_KEY);
  localStorage.removeItem(EDITOR_SETTINGS_STORAGE_KEY);
}

// IP間データ同期用
const CROSS_IP_SYNC_KEY = 'loadingScreenSettings_cross_ip_sync';

// IP間データ同期：現在のIPアドレス情報を含めてデータを保存
function saveCrossIPSync(data) {
  try {
    const currentHost = window.location.hostname;
    const currentPort = window.location.port;
    const syncData = {
      timestamp: Date.now(),
      host: currentHost,
      port: currentPort,
      origin: window.location.origin,
      data: data
    };
    
    // 複数IPからのデータを履歴として保存
    const existingSync = JSON.parse(localStorage.getItem(CROSS_IP_SYNC_KEY) || '[]');
    existingSync.unshift(syncData);
    
    // 最新5件のみ保持
    const recentSync = existingSync.slice(0, 5);
    localStorage.setItem(CROSS_IP_SYNC_KEY, JSON.stringify(recentSync));
    
    if (typeof window !== 'undefined' && window.DEBUG) {
      console.log('🌐 ローディング画面設定IP間同期データ保存:', { host: currentHost, port: currentPort });
    }
  } catch (error) {
    console.warn('⚠️ ローディング画面設定IP間同期データ保存エラー:', error);
  }
}

// IP間データ同期：他のIPからのデータを復元
function loadCrossIPSync() {
  try {
    const syncHistory = JSON.parse(localStorage.getItem(CROSS_IP_SYNC_KEY) || '[]');
    if (syncHistory.length === 0) return null;
    
    const currentOrigin = window.location.origin;
    
    // 現在のオリジン以外から最新のデータを探す
    const externalData = syncHistory.find(sync => sync.origin !== currentOrigin);
    
    if (externalData) {
      console.log('🌐 ローディング画面設定IP間同期データ復元:', {
        from: externalData.origin,
        timestamp: new Date(externalData.timestamp).toLocaleString()
      });
      return externalData.data;
    }
    
    return null;
  } catch (error) {
    console.warn('⚠️ ローディング画面設定IP間同期データ復元エラー:', error);
    return null;
  }
}

// 最後に使用したテンプレートIDのIP間同期
function syncLastUsedTemplateId(templateId) {
  try {
    const syncKey = 'lastUsedTemplateId_cross_ip_sync';
    const currentHost = window.location.hostname;
    const currentPort = window.location.port;
    const syncData = {
      timestamp: Date.now(),
      host: currentHost,
      port: currentPort,
      origin: window.location.origin,
      templateId: templateId
    };
    
    const existingSync = JSON.parse(localStorage.getItem(syncKey) || '[]');
    existingSync.unshift(syncData);
    
    // 最新5件のみ保持
    const recentSync = existingSync.slice(0, 5);
    localStorage.setItem(syncKey, JSON.stringify(recentSync));
    
    if (typeof window !== 'undefined' && window.DEBUG) {
      console.log('🌐 最後使用テンプレートID IP間同期保存:', { templateId, host: currentHost, port: currentPort });
    }
  } catch (error) {
    console.warn('⚠️ 最後使用テンプレートID IP間同期保存エラー:', error);
  }
}

// 最後に使用したテンプレートIDのIP間復元
function loadLastUsedTemplateId() {
  try {
    const syncKey = 'lastUsedTemplateId_cross_ip_sync';
    
    // まず現在のIPでのローカルデータをチェック
    const localTemplateId = localStorage.getItem('lastUsedTemplateId');
    if (localTemplateId) {
      return localTemplateId;
    }
    
    // 同期データから復元を試行
    const syncHistory = JSON.parse(localStorage.getItem(syncKey) || '[]');
    if (syncHistory.length === 0) return null;
    
    const currentOrigin = window.location.origin;
    
    // 現在のオリジン以外から最新のデータを探す
    const externalData = syncHistory.find(sync => sync.origin !== currentOrigin);
    
    if (externalData && externalData.templateId) {
      console.log('🌐 最後使用テンプレートID IP間同期復元:', {
        templateId: externalData.templateId,
        from: externalData.origin,
        timestamp: new Date(externalData.timestamp).toLocaleString()
      });
      
      // 復元したテンプレートIDをローカルにも保存
      localStorage.setItem('lastUsedTemplateId', externalData.templateId);
      return externalData.templateId;
    }
    
    return null;
  } catch (error) {
    console.warn('⚠️ 最後使用テンプレートID IP間同期復元エラー:', error);
    return null;
  }
}

// モックAPI - ローカルストレージを使用
export const settingsAPI = {
  getSettings() {
    try {
      const stored = getStoredSettingsJson();
      const shouldMigrateEditorKey = !localStorage.getItem(SETTINGS_STORAGE_KEY) &&
        Boolean(localStorage.getItem(EDITOR_SETTINGS_STORAGE_KEY));
      console.log('🔍 設定読み込み試行:', {
        hasData: !!stored,
        dataSize: stored ? (stored.length / 1024).toFixed(2) + 'KB' : '0KB',
        timestamp: new Date().toISOString()
      });
      
      if (!stored) {
        console.log('📝 保存された設定が見つかりません。IP間同期から復旧を試行します');
        
        // IP間同期データから復元を試行
        const syncedSettings = loadCrossIPSync();
        if (syncedSettings) {
          console.log('🌐 IP間同期から設定を復元しました');
          // 復元したデータをローカルにも保存
          try {
            persistSettingsObject(syncedSettings);
          } catch (saveError) {
            console.warn('⚠️ 復元データの保存に失敗:', saveError);
          }
          return this.mergeWithDefaults(syncedSettings);
        }
        
        // 通常のバックアップからの復旧も試行
        const recoveredSettings = this.recoverFromBackup();
        if (recoveredSettings) {
          return recoveredSettings;
        }
        
        console.log('📝 バックアップも見つかりません。デフォルト設定を使用します');
        return this.mergeWithDefaults({});
      }
      
      const parsed = JSON.parse(stored);
      if (shouldMigrateEditorKey) {
        try {
          persistSettingsJson(stored);
        } catch (migrationError) {
          console.warn('⚠️ 旧エディター設定キーの移行に失敗:', migrationError);
        }
      }
      console.log('✅ 設定を正常に読み込みました:', {
        screens: Object.keys(parsed),
        hasImages: this.calculateImageDataSize(parsed) > 0
      });
      
      return this.mergeWithDefaults(parsed);
    } catch (error) {
      console.warn('❌ 設定読み込みエラー:', error);
      console.log('🔄 デフォルト設定にフォールバックします');
      return this.mergeWithDefaults({});
    }
  },
  
  async saveSettings(settings) {
    try {
      const merged = this.mergeWithDefaults(settings);
      
      // IP間同期用にデータをコピー
      saveCrossIPSync(merged);
      
      // 古いバックアップをクリーンアップしてから新しいバックアップを作成
      this.cleanupBackups();
      
      // 保存前のバックアップを作成（容量制限付き・より厳格に）
      const currentSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (currentSettings) {
        try {
          const backupKey = `loadingScreenSettings_backup_${Date.now()}`;
          // バックアップサイズが300KB以下の場合のみ保存（容量圧迫を防止）
          if (currentSettings.length <= 300 * 1024) {
            localStorage.setItem(backupKey, currentSettings);
            console.log('🔄 保存前バックアップを作成:', backupKey);
          } else {
            console.warn('⚠️ バックアップサイズが大きすぎるためスキップ:', (currentSettings.length / 1024).toFixed(2) + 'KB');
          }
        } catch (backupError) {
          console.warn('⚠️ バックアップ作成に失敗（継続）:', backupError.message);
        }
      }
      
      // まず画像圧縮を試行
      const optimizedSettings = await this.optimizeImageData(merged);
      const settingsJson = JSON.stringify(optimizedSettings);
      
      // localStorageの容量制限をチェック（個別画像2MB制限、全体で3MB制限）
      const maxTotalImageSize = TOTAL_IMAGES_MAX_BYTES;
      
      // 画像データのみのサイズを計算
      const imageDataSize = this.calculateImageDataSize(optimizedSettings);
      
      console.log('画像データ容量チェック:', {
        imageSize: (imageDataSize / 1024).toFixed(2) + 'KB',
        maxSize: (maxTotalImageSize / 1024 / 1024).toFixed(2) + 'MB',
        usagePercentage: ((imageDataSize / maxTotalImageSize) * 100).toFixed(1) + '%'
      });
      
      if (imageDataSize > maxTotalImageSize) {
        console.error('画像データが大きすぎます:', {
          size: imageDataSize,
          maxSize: maxTotalImageSize,
          sizeInMB: (imageDataSize / 1024 / 1024).toFixed(2)
        });
        
        // 画像データを削除して再試行
        // 段階的に容量を削減して保存を試行
        console.log('⚠️ 容量制限を超過。段階的に対処します...');
        
        // 1. より強い圧縮を試行
        console.log('🔄 より強い圧縮を試行...');
        const { quality, maxWidth, maxHeight } = COMPRESSION_SETTINGS.aggressive;
        const moreCompressedSettings = await this.optimizeImageData(merged, quality, maxWidth, maxHeight);
        const moreCompressedSize = this.calculateImageDataSize(moreCompressedSettings);
        
        if (moreCompressedSize <= maxTotalImageSize) {
          console.log('✅ 強い圧縮で容量制限内に収まりました');
          persistSettingsObject(moreCompressedSettings);
          
          const beforeMB = (imageDataSize / 1024 / 1024).toFixed(2);
          const afterMB = (moreCompressedSize / 1024 / 1024).toFixed(2);
          const warningError = new Error(ERROR_MESSAGES.compressionWarning(beforeMB, afterMB));
          warningError.type = ERROR_TYPES.WARNING;
          throw warningError;
        }
        
        // 2. 画像なしで保存
        console.log('⚠️ 圧縮でも容量制限を超過。画像なしで保存します');
        const settingsWithoutImages = this.removeImageData(merged);
        persistSettingsObject(settingsWithoutImages);
        
        const sizeMB = (imageDataSize / 1024 / 1024).toFixed(2);
        const errorMessage = new Error(ERROR_MESSAGES.saveCapacityExceeded(sizeMB));
        errorMessage.type = ERROR_TYPES.IMAGE_CAPACITY;
        throw errorMessage;
      }
      
      // 正常な保存処理
      try {
        persistSettingsJson(settingsJson);
        console.log('✅ 設定を正常に保存しました:', {
          size: (settingsJson.length / 1024).toFixed(2) + 'KB',
          timestamp: new Date().toISOString(),
          imageDataSize: (imageDataSize / 1024).toFixed(2) + 'KB',
          screens: Object.keys(optimizedSettings),
          compressionApplied: true
        });
        
        // 保存直後の確認
        const verification = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (verification) {
          console.log('✅ 保存確認OK: データが正常に保存されています');
        } else {
          console.error('❌ 保存確認NG: データが保存されていません');
        }
        
        // 成功したのでバックアップをクリーンアップ（最新5個を保持）
        this.cleanupBackups();
      } catch (storageError) {
        // localStorageの容量不足の場合
        if (storageError.name === 'QuotaExceededError') {
          console.log('🚨 容量エラー発生、段階的クリーンアップを実行');
          
          // 段階的クリーンアップ
          // 1. 通常のクリーンアップ
          this.cleanupOldData();
          
          try {
            persistSettingsJson(settingsJson);
            console.log('✅ 通常クリーンアップ後に保存成功');
          } catch (secondError) {
            // 2. 緊急クリーンアップ
            console.log('🚨 通常クリーンアップでも失敗、緊急クリーンアップを実行');
            const cleanedCount = this.emergencyCleanup();
            
            try {
              persistSettingsJson(settingsJson);
              console.log('✅ 緊急クリーンアップ後に保存成功');
              
              // ユーザーに警告通知
              const warningMessage = new Error(`ストレージ容量が不足したため、${cleanedCount}個の古いデータを削除しました。`);
              warningMessage.type = ERROR_TYPES.WARNING;
              throw warningMessage;
            } catch (thirdError) {
              const storageError = new Error('ローカルストレージの容量が不足しています。\n\n他のサイトのデータを削除するか、ブラウザのキャッシュをクリアしてください。');
              storageError.type = ERROR_TYPES.STORAGE_QUOTA;
              throw storageError;
            }
          }
        } else {
          throw storageError;
        }
      }
      
      return Promise.resolve(optimizedSettings);
    } catch (error) {
      console.error('設定保存エラー:', error);
      
      if (error.type === ERROR_TYPES.WARNING || error.type === ERROR_TYPES.IMAGE_CAPACITY) {
        // 警告レベルのエラー（画像なしで保存成功）または画像容量エラー
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
        Object.entries(settings[screenType]).forEach(([key, value]) => {
          // 空文字列も有効な値として扱う（ユーザーの意図を尊重）
          if (value !== undefined) {
            merged[screenType][key] = value;
          }
        });
        
        // ガイド画面の特別処理（ネストしたオブジェクト）
        if (screenType === 'guideScreen') {
          ['surfaceDetection', 'worldTracking'].forEach(subType => {
            if (settings[screenType][subType]) {
              Object.entries(settings[screenType][subType]).forEach(([key, value]) => {
                if (value !== undefined) {
                  merged[screenType][subType][key] = value;
                }
              });
            }
          });
        }
        
        // カラー値の検証と修正
        const colorProps = ['backgroundColor', 'textColor', 'accentColor', 'buttonColor', 'buttonTextColor'];
        colorProps.forEach(colorProp => {
          const colorValue = settings[screenType]?.[colorProp];
          if (colorValue) {
            merged[screenType][colorProp] = validateAndFixColor(colorValue);
          }
        });
      }
    });
    
    console.log('マージ後の設定:', merged);
    return merged;
  },

  resetSettings() {
    // ローカルストレージをクリア
    clearPersistedSettings();
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
    const maxSize = TOTAL_IMAGES_MAX_BYTES;
    
    // ローディング画面関連のキーのみを対象
    const relevantKeys = [
      SETTINGS_STORAGE_KEY,
      EDITOR_SETTINGS_STORAGE_KEY,
      TEMPLATES_STORAGE_KEY,
      'lastUsedTemplateId'
    ];
    
    relevantKeys.forEach(key => {
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
    });
    
    // 使用率を計算
    const usagePercentage = (loadingScreenTotal / maxSize) * 100;
    
    return {
      total: loadingScreenTotal,
      totalKB: (loadingScreenTotal / 1024).toFixed(2),
      totalMB: (loadingScreenTotal / 1024 / 1024).toFixed(2),
      maxSize,
      maxSizeMB: TOTAL_IMAGES_MAX_MB.toFixed(2), // 小数点2桁で統一
      usagePercentage: usagePercentage.toFixed(1),
      keys: loadingScreenKeys,
      isNearLimit: usagePercentage > 80,
      isOverLimit: loadingScreenTotal > maxSize
    };
  },

  // バックアップをクリーンアップ（最新5個を保持）
  cleanupBackups() {
    try {
      const backupKeys = [];
      for (let key in localStorage) {
        if (key.startsWith('loadingScreenSettings_backup_')) {
          backupKeys.push({
            key: key,
            timestamp: parseInt(key.split('_').pop())
          });
        }
      }
      
      // タイムスタンプでソート（新しい順）
      backupKeys.sort((a, b) => b.timestamp - a.timestamp);
      
      // 5個を超える古いバックアップを削除
      if (backupKeys.length > 5) {
        const toDelete = backupKeys.slice(5);
        toDelete.forEach(backup => {
          localStorage.removeItem(backup.key);
          console.log('🧹 古いバックアップを削除:', backup.key);
        });
      }
    } catch (error) {
      console.warn('バックアップクリーンアップ中にエラー:', error);
    }
  },

  // バックアップから復旧
  recoverFromBackup() {
    try {
      const backupKeys = [];
      for (let key in localStorage) {
        if (key.startsWith('loadingScreenSettings_backup_')) {
          backupKeys.push({
            key: key,
            timestamp: parseInt(key.split('_').pop())
          });
        }
      }
      
      if (backupKeys.length === 0) {
        return null;
      }
      
      // 最新のバックアップを使用
      backupKeys.sort((a, b) => b.timestamp - a.timestamp);
      const latestBackup = backupKeys[0];
      const backupData = localStorage.getItem(latestBackup.key);
      
      if (backupData) {
        console.log('🔄 バックアップから設定を復旧しました:', latestBackup.key);
        const recovered = JSON.parse(backupData);
        
        // 復旧した設定をメインに保存
        persistSettingsJson(backupData);
        console.log('✅ 復旧した設定をメインストレージに保存しました');
        
        return this.mergeWithDefaults(recovered);
      }
    } catch (error) {
      console.warn('バックアップからの復旧中にエラー:', error);
    }
    
    return null;
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

  // 緊急時の強制クリーンアップ（容量エラー時に使用）
  emergencyCleanup() {
    try {
      let cleanedCount = 0;
      
      // 1. すべてのバックアップを削除
      const backupKeys = [];
      for (let key in localStorage) {
        if (key.includes('backup_') || key.includes('_backup')) {
          backupKeys.push(key);
        }
      }
      backupKeys.forEach(key => {
        localStorage.removeItem(key);
        cleanedCount++;
      });
      
      // 2. 古いテンプレートを削除（最新5個以外）
      const templateKeys = [];
      for (let key in localStorage) {
        if (key.startsWith('loadingScreenTemplate_')) {
          templateKeys.push({
            key: key,
            timestamp: parseInt(key.split('_').pop()) || 0
          });
        }
      }
      
      // タイムスタンプでソートして古いものを削除
      templateKeys.sort((a, b) => b.timestamp - a.timestamp);
      if (templateKeys.length > 5) {
        templateKeys.slice(5).forEach(template => {
          localStorage.removeItem(template.key);
          cleanedCount++;
        });
      }
      
      // 3. IP間同期データも古いものを削除
      const syncKeys = [];
      for (let key in localStorage) {
        if (key.includes('_cross_ip_sync') && !key.includes('loadingScreenSettings_cross_ip_sync')) {
          syncKeys.push(key);
        }
      }
      syncKeys.forEach(key => {
        localStorage.removeItem(key);
        cleanedCount++;
      });
      
      console.log('🚨 緊急クリーンアップ完了:', cleanedCount, 'items削除');
      return cleanedCount;
    } catch (error) {
      console.error('緊急クリーンアップ中にエラー:', error);
      return 0;
    }
  },
  
  // 画像データを最適化（圧縮）- 非同期版
  async optimizeImageData(settings, quality = COMPRESSION_SETTINGS.default.quality, maxWidth = COMPRESSION_SETTINGS.default.maxWidth, maxHeight = COMPRESSION_SETTINGS.default.maxHeight) {
    const optimized = JSON.parse(JSON.stringify(settings));
    const compressionPromises = [];
    
    // 各画面の画像データを最適化
    ['startScreen', 'loadingScreen', 'guideScreen'].forEach(screenType => {
      if (optimized[screenType]) {
        Object.keys(optimized[screenType]).forEach(key => {
          const value = optimized[screenType][key];
          if (typeof value === 'string' && value.startsWith('data:image/')) {
            // Base64画像データの場合、品質を調整して圧縮
            const promise = this.compressBase64Image(value, quality, maxWidth, maxHeight).then(compressedImage => {
              if (compressedImage && compressedImage.length < value.length) {
                optimized[screenType][key] = compressedImage;
                console.log(`📦 ${screenType}.${key} を圧縮: ${(value.length / 1024).toFixed(2)}KB → ${(compressedImage.length / 1024).toFixed(2)}KB`);
              }
            });
            compressionPromises.push(promise);
          }
        });
        
        // ガイド画面の入れ子オブジェクトも処理
        if (screenType === 'guideScreen') {
          ['surfaceDetection', 'worldTracking'].forEach(subType => {
            if (optimized[screenType][subType] && optimized[screenType][subType].guideImage) {
              const value = optimized[screenType][subType].guideImage;
              if (typeof value === 'string' && value.startsWith('data:image/')) {
                const promise = this.compressBase64Image(value, quality, maxWidth, maxHeight).then(compressedImage => {
                  if (compressedImage && compressedImage.length < value.length) {
                    optimized[screenType][subType].guideImage = compressedImage;
                    console.log(`📦 ${screenType}.${subType}.guideImage を圧縮`);
                  }
                });
                compressionPromises.push(promise);
              }
            }
          });
        }
      }
    });
    
    // すべての圧縮処理を待機
    await Promise.all(compressionPromises);
    
    return optimized;
  },
  
  // Base64画像を圧縮
  compressBase64Image(base64String, quality = COMPRESSION_SETTINGS.default.quality, maxWidth = COMPRESSION_SETTINGS.default.maxWidth, maxHeight = COMPRESSION_SETTINGS.default.maxHeight) {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        
        // 画像読み込みタイムアウトを設定（10秒）
        const timeoutId = setTimeout(() => {
          console.warn('画像圧縮タイムアウト: 10秒以内に読み込みが完了しませんでした');
          resolve(base64String);
        }, 10000);
        
        img.onload = () => {
          clearTimeout(timeoutId); // タイムアウトをクリア
          
          // キャンバスを作成
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // リサイズ計算
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const aspectRatio = width / height;
            if (width > height) {
              width = maxWidth;
              height = maxWidth / aspectRatio;
            } else {
              height = maxHeight;
              width = maxHeight * aspectRatio;
            }
          }
          
          // キャンバスサイズを設定
          canvas.width = width;
          canvas.height = height;
          
          // 透過PNG対応：背景をクリア（完全透明で初期化）
          ctx.clearRect(0, 0, width, height);
          
          // 高品質な画像補間を設定
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // 画像を描画
          ctx.drawImage(img, 0, 0, width, height);
          
          // 画像形式の判定と保存処理
          let compressedBase64;
          const isPNG = base64String.startsWith('data:image/png');
          const isWebP = base64String.startsWith('data:image/webp');
          const supportsTransparency = isPNG || isWebP;
          const hasTransparency = this.checkImageTransparency(ctx, width, height);
          
          // PNG入力の場合は必ずPNG保存（透過検知失敗を避けるため）
          if (isPNG) {
            compressedBase64 = canvas.toDataURL('image/png');
            console.log('🎨 PNG入力→PNG固定保存', {
              元形式: 'PNG',
              透明度: hasTransparency ? 'あり' : 'なし'
            });
          } else if (supportsTransparency || hasTransparency) {
            // WebP形式または透過ありの場合はPNGで保存
            compressedBase64 = canvas.toDataURL('image/png');
            console.log('🎨 透過対応PNG画像として保存', {
              元形式: isWebP ? 'WebP' : '不明',
              透明度: hasTransparency ? 'あり' : 'なし'
            });
          } else {
            // 透過なしの場合のみJPEGで圧縮
            compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            console.log('📦 JPEG画像として圧縮');
          }
          
          
          resolve(compressedBase64);
        };
        
        img.onerror = (error) => {
          clearTimeout(timeoutId); // タイムアウトをクリア
          console.warn('画像圧縮中にエラー: 画像の読み込みに失敗', error);
          resolve(base64String);
        };
        
        img.src = base64String;
      } catch (error) {
        console.warn('画像圧縮中にエラー:', error);
        resolve(base64String);
      }
    });
  },

  // 画像に透明度があるかチェック
  checkImageTransparency(ctx, width, height) {
    try {
      // キャンバスの画像データを取得
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      let transparentPixels = 0;
      const totalPixels = width * height;
      
      // アルファチャンネル（4番目の値）をチェック
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
          transparentPixels++;
          // 少しでも透明度があればtrueを返す（早期終了）
          if (transparentPixels > 0) {
            console.log('🔍 透明度検出:', {
              透明ピクセル数: transparentPixels,
              全ピクセル数: totalPixels,
              透明度: '検出'
            });
            return true;
          }
        }
      }
      
      console.log('🔍 透明度チェック結果:', {
        透明ピクセル数: transparentPixels,
        全ピクセル数: totalPixels,
        透明度: 'なし'
      });
      
      return false; // 透明度なし
    } catch (error) {
      console.warn('❌ 透明度チェック中にエラー:', error);
      // エラー時はPNG形式であれば透明度ありとして扱う
      return true;
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
        
        imagePaths.forEach((imageSrc, index) => {
          if (imageSrc && typeof imageSrc === 'string' && imageSrc.startsWith('data:')) {
            const base64Data = imageSrc.split(',')[1];
            if (base64Data && base64Data.length > 0) {
              // Base64から元のバイナリサイズに変換（パディング考慮）
              const originalSize = CAPACITY_UTILS.calculateBinarySize(base64Data);
              totalImageSize += originalSize;
            }
          }
        });
      }
    } catch (error) {
      console.warn('画像データサイズ計算中にエラー:', error);
    }
    
    
    return Math.round(totalImageSize);
  },
  
  // ヘルパー関数: Base64画像かどうかチェック
  isBase64Image(value) {
    return typeof value === 'string' && value.startsWith('data:image/');
  },
  
  // ヘルパー関数: Base64データのサイズを計算
  calculateBase64Size(imageSrc) {
    if (!imageSrc || typeof imageSrc !== 'string' || !imageSrc.startsWith('data:')) {
      return 0;
    }
    
    const base64Data = imageSrc.split(',')[1];
    if (!base64Data || base64Data.length === 0) {
      return 0;
    }
    
    // Base64から元のバイナリサイズに変換（パディング考慮）
    return CAPACITY_UTILS.calculateBinarySize(base64Data);
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

// エクスポート/インポート機能
export const importExportAPI = {
  // 設定をJSONファイルとしてエクスポート
  exportSettings(settings, filename = null) {
    try {
      const exportData = {
        version: '1.0',
        timestamp: Date.now(),
        exportedAt: new Date().toISOString(),
        source: 'miruwebAR-loading-screen-editor',
        settings: settings || settingsAPI.getSettings()
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const defaultFilename = `loading-screen-settings-${new Date().toISOString().split('T')[0]}.json`;
      const finalFilename = filename || defaultFilename;
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = finalFilename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // メモリリークを防ぐためURLを解放
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      console.log('✅ ローディング画面設定をエクスポートしました:', finalFilename);
      return true;
    } catch (error) {
      console.error('❌ エクスポートエラー:', error);
      throw new Error(`設定のエクスポートに失敗しました: ${error.message}`);
    }
  },
  
  // JSONファイルから設定をインポート
  importSettings(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('ファイルが選択されていません'));
        return;
      }
      
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        reject(new Error('JSONファイルを選択してください'));
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const jsonStr = e.target.result;
          const importData = JSON.parse(jsonStr);
          
          // バリデーション
          if (!importData.settings) {
            reject(new Error('無効なファイル形式です。設定データが見つかりません。'));
            return;
          }
          
          if (importData.source && importData.source !== 'miruwebAR-loading-screen-editor') {
            console.warn('⚠️ 異なるソースからの設定ファイルです:', importData.source);
          }
          
          // 設定をマージしてデフォルト値で補完
          const mergedSettings = settingsAPI.mergeWithDefaults(importData.settings);
          
          console.log('📥 設定をインポートしました:', {
            version: importData.version,
            exportedAt: importData.exportedAt,
            screens: Object.keys(mergedSettings)
          });
          
          resolve({
            settings: mergedSettings,
            metadata: {
              version: importData.version,
              timestamp: importData.timestamp,
              exportedAt: importData.exportedAt,
              source: importData.source
            }
          });
        } catch (error) {
          console.error('❌ インポートエラー:', error);
          reject(new Error(`設定の読み込みに失敗しました: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('ファイルの読み込みに失敗しました'));
      };
      
      reader.readAsText(file);
    });
  },
  
  // インポートした設定を適用（UI更新含む）
  async applyImportedSettings(importResult) {
    try {
      const { settings } = importResult;
      
      // 設定を保存
      await settingsAPI.saveSettings(settings);
      
      console.log('✅ インポートした設定を適用しました');
      return settings;
    } catch (error) {
      console.error('❌ 設定適用エラー:', error);
      throw new Error(`設定の適用に失敗しました: ${error.message}`);
    }
  }
};

// IP間同期関数をエクスポート
export { loadLastUsedTemplateId, syncLastUsedTemplateId }; 
