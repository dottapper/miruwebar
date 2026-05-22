// src/utils/loading-screen-state.js
// ローディング画面設定の状態管理を分離し、予期しない副作用を防ぐ

import {
  defaultSettings,
  settingsAPI,
  SETTINGS_STORAGE_KEY,
  EDITOR_SETTINGS_STORAGE_KEY
} from '../components/loading-screen/settings.js';

const cloneSettings = (settings) => JSON.parse(JSON.stringify(settings));

/**
 * ローディング画面設定の独立した状態管理
 * エディターとビューアで異なるインスタンスを使用して結合度を下げる
 */
class LoadingScreenStateManager {
  constructor(namespace = 'default') {
    this.namespace = namespace;
    this.settings = null;
    this.listeners = [];
  }

  /**
   * 設定を取得（キャッシュまたはストレージから）
   */
  getSettings() {
    if (this.settings && this.namespace !== 'editor') {
      return cloneSettings(this.settings);
    }

    try {
      const storageKey = `loadingScreenSettings_${this.namespace}`;
      const stored = this.namespace === 'editor'
        ? localStorage.getItem(SETTINGS_STORAGE_KEY) || localStorage.getItem(EDITOR_SETTINGS_STORAGE_KEY)
        : localStorage.getItem(storageKey);
      const parsed = stored ? JSON.parse(stored) : this.getDefaultSettings();
      this.settings = settingsAPI.mergeWithDefaults(parsed);
      return cloneSettings(this.settings);
    } catch (error) {
      console.warn('ローディング画面設定の読み込みに失敗:', error);
      this.settings = this.getDefaultSettings();
      return cloneSettings(this.settings);
    }
  }

  /**
   * 設定を保存（副作用を制御）
   */
  setSettings(newSettings, options = {}) {
    const { skipPersist = false, skipNotify = false } = options;
    
    this.settings = settingsAPI.mergeWithDefaults(newSettings || {});

    if (!skipPersist) {
      try {
        const storageKey = `loadingScreenSettings_${this.namespace}`;
        const settingsJson = JSON.stringify(this.settings);
        if (this.namespace === 'editor') {
          localStorage.setItem(SETTINGS_STORAGE_KEY, settingsJson);
          localStorage.removeItem(EDITOR_SETTINGS_STORAGE_KEY);
        } else {
          localStorage.setItem(storageKey, settingsJson);
        }
      } catch (error) {
        console.warn('ローディング画面設定の保存に失敗:', error);
      }
    }

    if (!skipNotify) {
      this.notifyListeners(this.settings);
    }

    return cloneSettings(this.settings);
  }

  /**
   * 設定の一部のみ更新
   */
  updateSettings(partialSettings, options = {}) {
    const current = this.getSettings();
    const merged = this.deepMerge(current, partialSettings);
    return this.setSettings(merged, options);
  }

  /**
   * デフォルト設定
   */
  getDefaultSettings() {
    return cloneSettings(defaultSettings);
  }

  /**
   * リスナーの追加（状態変更の監視）
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * 変更通知
   */
  notifyListeners(settings) {
    this.listeners.forEach(callback => {
      try {
        callback({ ...settings });
      } catch (error) {
        console.error('ローディング画面設定リスナーエラー:', error);
      }
    });
  }

  /**
   * 状態のリセット
   */
  reset() {
    this.settings = null;
    try {
      localStorage.removeItem(`loadingScreenSettings_${this.namespace}`);
      if (this.namespace === 'editor') {
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
        localStorage.removeItem(EDITOR_SETTINGS_STORAGE_KEY);
      }
    } catch (error) {
      console.warn('ローディング画面設定の削除に失敗:', error);
    }
  }

  /**
   * 深いマージ
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}

// インスタンス管理
const instances = new Map();

/**
 * 名前空間付きインスタンスを取得
 */
export function getLoadingScreenState(namespace = 'default') {
  if (!instances.has(namespace)) {
    instances.set(namespace, new LoadingScreenStateManager(namespace));
  }
  return instances.get(namespace);
}

/**
 * エディター専用インスタンス
 */
export function getEditorLoadingScreenState() {
  return getLoadingScreenState('editor');
}

/**
 * ビューア専用インスタンス
 */
export function getViewerLoadingScreenState() {
  return getLoadingScreenState('viewer');
}

/**
 * プロジェクト保存用設定の取得（エディターから）
 */
export function getLoadingSettingsForProject() {
  const editorState = getEditorLoadingScreenState();
  const settings = editorState.getSettings();
  
  // プロジェクト保存に必要な形式に変換
  return {
    loadingScreen: settings.loadingScreen,
    startScreen: settings.startScreen,
    guideScreen: settings.guideScreen,
    editorSettings: settings // 下位互換性のため
  };
}

/**
 * プロジェクト読み込み時の設定適用（ビューアで）
 */
export function applyProjectLoadingSettings(projectSettings) {
  const viewerState = getViewerLoadingScreenState();
  
  if (projectSettings) {
    // プロジェクトの設定を適用（エディター設定を優先）
    const settings = projectSettings.editorSettings || {
      loadingScreen: projectSettings.loadingScreen || {},
      startScreen: projectSettings.startScreen || {}
    };
    
    viewerState.setSettings(settings, { skipPersist: true }); // ビューア用は保存しない
    return viewerState.getSettings();
  }
  
  return viewerState.getDefaultSettings();
}

export default LoadingScreenStateManager;
