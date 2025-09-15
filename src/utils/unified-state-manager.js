// src/utils/unified-state-manager.js
// 統一状態管理システム - 既存コードとの段階的統合設計

import { createLogger } from './logger.js';

const logger = createLogger('UnifiedStateManager');

/**
 * 統一状態管理システム
 * 既存の localStorage、IndexedDB、メモリ変数を段階的に統合
 */
export class UnifiedStateManager {
  constructor() {
    this.state = new Map(); // メモリ状態
    this.subscribers = new Map(); // 状態変更の購読者
    this.storageAdapters = new Map(); // ストレージアダプター
    this.isInitialized = false;
    
    logger.info('統一状態管理システム初期化開始');
    
    // デフォルトストレージアダプターを登録
    this.registerStorageAdapter('memory', new MemoryStorageAdapter());
    this.registerStorageAdapter('localStorage', new LocalStorageAdapter());
    this.registerStorageAdapter('indexedDB', new IndexedDBAdapter());
    
    // 既存システムとの互換性保持
    this.legacyCompatibility = new LegacyCompatibilityLayer(this);
  }

  /**
   * システム初期化
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      logger.info('統一状態管理システム初期化中...');
      
      // ストレージアダプターを初期化
      for (const [name, adapter] of this.storageAdapters) {
        await adapter.initialize();
        logger.debug(`${name} ストレージアダプター初期化完了`);
      }
      
      // 既存データの移行チェック
      await this.migrateExistingData();
      
      this.isInitialized = true;
      logger.success('統一状態管理システム初期化完了');
      
    } catch (error) {
      logger.error('統一状態管理システム初期化失敗:', error);
      throw error;
    }
  }

  /**
   * 状態取得（優先順位ベースのマージ）
   */
  async getState(key, options = {}) {
    const {
      namespace = 'default',
      storageTypes = ['memory', 'localStorage', 'indexedDB'],
      mergePriority = ['templateSettings', 'editorSettings', 'projectData']
    } = options;
    
    const fullKey = `${namespace}:${key}`;
    
    try {
      // 複数ストレージからデータを収集
      const values = {};
      for (const storageType of storageTypes) {
        const adapter = this.storageAdapters.get(storageType);
        if (adapter) {
          const value = await adapter.get(fullKey);
          if (value !== undefined) {
            values[storageType] = value;
          }
        }
      }
      
      // 優先順位に基づいてマージ
      return this.mergeWithPriority(values, mergePriority);
      
    } catch (error) {
      logger.error(`状態取得エラー [${fullKey}]:`, error);
      return undefined;
    }
  }

  /**
   * 状態設定（複数ストレージに自動振り分け）
   */
  async setState(key, value, options = {}) {
    const {
      namespace = 'default',
      storageType = 'auto',
      broadcast = true
    } = options;
    
    const fullKey = `${namespace}:${key}`;
    
    try {
      // 自動ストレージ選択
      const targetStorage = storageType === 'auto' 
        ? this.selectOptimalStorage(value) 
        : storageType;
      
      // ストレージに保存
      const adapter = this.storageAdapters.get(targetStorage);
      if (!adapter) {
        throw new Error(`未知のストレージタイプ: ${targetStorage}`);
      }
      
      await adapter.set(fullKey, value);
      
      // メモリキャッシュも更新
      this.state.set(fullKey, { value, timestamp: Date.now(), storageType: targetStorage });
      
      // 購読者に変更通知
      if (broadcast) {
        this.notifySubscribers(fullKey, value);
      }
      
      logger.debug(`状態更新 [${fullKey}] -> ${targetStorage}`);
      
    } catch (error) {
      logger.error(`状態設定エラー [${fullKey}]:`, error);
      throw error;
    }
  }

  /**
   * 状態変更の購読
   */
  subscribe(key, callback, options = {}) {
    const { namespace = 'default' } = options;
    const fullKey = `${namespace}:${key}`;
    
    if (!this.subscribers.has(fullKey)) {
      this.subscribers.set(fullKey, new Set());
    }
    
    this.subscribers.get(fullKey).add(callback);
    
    // 購読解除用関数を返す
    return () => {
      const subscribers = this.subscribers.get(fullKey);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(fullKey);
        }
      }
    };
  }

  /**
   * ストレージアダプター登録
   */
  registerStorageAdapter(name, adapter) {
    this.storageAdapters.set(name, adapter);
    logger.debug(`ストレージアダプター登録: ${name}`);
  }

  /**
   * 優先順位に基づく設定マージ
   */
  mergeWithPriority(values, priority) {
    if (!values || Object.keys(values).length === 0) return undefined;
    
    // 単一の値の場合はそのまま返す
    if (Object.keys(values).length === 1) {
      return Object.values(values)[0];
    }
    
    // 複数の値をマージ
    let merged = {};
    
    // 逆順（低優先度から高優先度）で適用
    const reversePriority = [...priority].reverse();
    
    for (const storageType of Object.keys(values)) {
      const value = values[storageType];
      if (typeof value === 'object' && value !== null) {
        merged = { ...merged, ...value };
      } else {
        merged = value;
      }
    }
    
    return merged;
  }

  /**
   * 最適なストレージタイプの選択
   */
  selectOptimalStorage(value) {
    try {
      const serialized = JSON.stringify(value);
      const sizeKB = serialized.length / 1024;
      
      // サイズに基づく自動選択
      if (sizeKB > 100) {
        return 'indexedDB'; // 大容量データ
      } else if (sizeKB > 10) {
        return 'localStorage'; // 中容量データ
      } else {
        return 'memory'; // 小容量データ
      }
    } catch (error) {
      return 'memory'; // デフォルト
    }
  }

  /**
   * 購読者への変更通知
   */
  notifySubscribers(key, value) {
    const subscribers = this.subscribers.get(key);
    if (subscribers && subscribers.size > 0) {
      for (const callback of subscribers) {
        try {
          callback(value, key);
        } catch (error) {
          logger.error(`購読者コールバックエラー [${key}]:`, error);
        }
      }
    }
  }

  /**
   * 既存データの移行
   */
  async migrateExistingData() {
    logger.info('既存データの移行チェック開始...');
    
    // 既存のlocalStorageキーをチェック
    const existingKeys = [
      'miruwebAR_projects',
      'miruwebAR_project_settings', 
      'miruwebAR_cross_ip_sync'
    ];
    
    let migrated = 0;
    
    for (const key of existingKeys) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          const parsed = JSON.parse(value);
          await this.setState(key.replace('miruwebAR_', ''), parsed, {
            namespace: 'migrated',
            storageType: 'localStorage'
          });
          migrated++;
        }
      } catch (error) {
        logger.warn(`データ移行失敗 [${key}]:`, error);
      }
    }
    
    if (migrated > 0) {
      logger.success(`既存データ移行完了: ${migrated}件`);
    }
  }

  /**
   * デバッグ情報取得
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      stateCount: this.state.size,
      subscriberCount: Array.from(this.subscribers.values())
        .reduce((sum, set) => sum + set.size, 0),
      storageAdapters: Array.from(this.storageAdapters.keys()),
      memoryUsageKB: Math.round(
        JSON.stringify(Array.from(this.state.entries())).length / 1024
      )
    };
  }

  /**
   * クリーンアップ
   */
  async destroy() {
    logger.info('統一状態管理システム終了...');
    
    // 購読者をクリア
    this.subscribers.clear();
    
    // ストレージアダプターを終了
    for (const [name, adapter] of this.storageAdapters) {
      try {
        if (typeof adapter.destroy === 'function') {
          await adapter.destroy();
        }
      } catch (error) {
        logger.warn(`${name} アダプター終了エラー:`, error);
      }
    }
    
    // メモリをクリア
    this.state.clear();
    this.storageAdapters.clear();
    this.isInitialized = false;
    
    logger.success('統一状態管理システム終了完了');
  }
}

/**
 * メモリストレージアダプター
 */
class MemoryStorageAdapter {
  constructor() {
    this.data = new Map();
  }

  async initialize() {
    // メモリアダプターは初期化不要
  }

  async get(key) {
    return this.data.get(key);
  }

  async set(key, value) {
    this.data.set(key, value);
  }

  async delete(key) {
    return this.data.delete(key);
  }

  async keys() {
    return Array.from(this.data.keys());
  }
}

/**
 * LocalStorageアダプター
 */
class LocalStorageAdapter {
  async initialize() {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available');
    }
  }

  async get(key) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : undefined;
    } catch (error) {
      logger.warn(`localStorage取得エラー [${key}]:`, error);
      return undefined;
    }
  }

  async set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logger.error(`localStorage設定エラー [${key}]:`, error);
      throw error;
    }
  }

  async delete(key) {
    localStorage.removeItem(key);
    return true;
  }

  async keys() {
    return Object.keys(localStorage);
  }
}

/**
 * IndexedDBアダプター
 */
class IndexedDBAdapter {
  constructor() {
    this.dbName = 'miruwebAR_unified';
    this.version = 1;
    this.db = null;
  }

  async initialize() {
    // IndexedDBの初期化は既存のidb-keyvalを使用
    // 実装は簡略化
  }

  async get(key) {
    // 既存のidb-keyval実装を使用
    const { get } = await import('idb-keyval');
    return await get(key);
  }

  async set(key, value) {
    const { set } = await import('idb-keyval');
    return await set(key, value);
  }

  async delete(key) {
    const { del } = await import('idb-keyval');
    return await del(key);
  }

  async keys() {
    const { keys } = await import('idb-keyval');
    return await keys();
  }
}

/**
 * 既存システムとの互換性レイヤー
 */
class LegacyCompatibilityLayer {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.setupLegacyInterceptors();
  }

  /**
   * 既存のlocalStorage/IndexedDB呼び出しをインターセプト
   */
  setupLegacyInterceptors() {
    // localStorage.setItem のラッパー
    if (typeof window !== 'undefined' && window.localStorage) {
      const originalSetItem = window.localStorage.setItem;
      window.localStorage.setItem = (key, value) => {
        // 統一状態管理システムにも反映
        this.stateManager.setState(`legacy:${key}`, value, {
          namespace: 'localStorage',
          storageType: 'localStorage',
          broadcast: false // 既存の動作を妨げない
        });
        
        // 元の動作を実行
        return originalSetItem.call(window.localStorage, key, value);
      };
    }
  }
}

// グローバルインスタンス
const globalUnifiedStateManager = new UnifiedStateManager();

// デバッグ用にwindowに露出
if (typeof window !== 'undefined') {
  window.unifiedStateManager = globalUnifiedStateManager;
}

export { globalUnifiedStateManager as unifiedStateManager };
export default UnifiedStateManager;