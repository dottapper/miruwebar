// src/utils/performance-manager.js
// パフォーマンス最適化とメモリ管理システム

/**
 * パフォーマンス監視とメモリ管理クラス
 */
export class PerformanceManager {
  constructor() {
    this.memoryUsage = {
      threeObjects: new Set(),
      eventListeners: new Map(),
      domElements: new Set(),
      imageData: new Map()
    };
    this.renderQueue = [];
    this.isRendering = false;
    this.rafId = null;
  }

  /**
   * Three.jsオブジェクトを登録してメモリ管理
   * @param {Object} object - Three.jsオブジェクト
   * @param {string} type - オブジェクトタイプ
   */
  registerThreeObject(object, type = 'unknown') {
    if (object) {
      this.memoryUsage.threeObjects.add({ object, type, timestamp: Date.now() });
    }
  }

  /**
   * イベントリスナーを登録してメモリ管理
   * @param {Element} element - DOM要素
   * @param {string} event - イベントタイプ
   * @param {Function} handler - ハンドラー関数
   * @param {Object} options - オプション
   */
  registerEventListener(element, event, handler, options = {}) {
    if (element && handler) {
      const key = `${element.constructor.name}_${event}_${Date.now()}`;
      this.memoryUsage.eventListeners.set(key, {
        element,
        event,
        handler,
        options,
        timestamp: Date.now()
      });
      element.addEventListener(event, handler, options);
    }
  }

  /**
   * DOM要素を登録してメモリ管理
   * @param {Element} element - DOM要素
   * @param {string} type - 要素タイプ
   */
  registerDOMElement(element, type = 'unknown') {
    if (element) {
      this.memoryUsage.domElements.add({ element, type, timestamp: Date.now() });
    }
  }

  /**
   * 画像データを登録してメモリ管理
   * @param {string} key - 画像キー
   * @param {string} data - 画像データ
   * @param {number} size - データサイズ
   */
  registerImageData(key, data, size = 0) {
    if (key && data) {
      this.memoryUsage.imageData.set(key, {
        data,
        size,
        timestamp: Date.now()
      });
    }
  }

  /**
   * レンダリングキューに追加（バッチ処理）
   * @param {Function} renderFunction - レンダリング関数
   * @param {number} priority - 優先度（低いほど優先）
   */
  queueRender(renderFunction, priority = 0) {
    this.renderQueue.push({ renderFunction, priority, timestamp: Date.now() });
    this.renderQueue.sort((a, b) => a.priority - b.priority);
    
    if (!this.isRendering) {
      this.processRenderQueue();
    }
  }

  /**
   * レンダリングキューを処理
   */
  processRenderQueue() {
    if (this.isRendering || this.renderQueue.length === 0) {
      return;
    }

    if (import.meta.env.MODE === 'test' || typeof requestAnimationFrame !== 'function') {
      const renderItem = this.renderQueue.shift();
      if (renderItem) {
        try {
          renderItem.renderFunction();
        } catch (error) {
          console.error('レンダリングエラー:', error);
        }
      }
      if (this.renderQueue.length > 0) {
        this.processRenderQueue();
      }
      return;
    }

    this.isRendering = true;
    this.rafId = requestAnimationFrame(() => {
      const renderItem = this.renderQueue.shift();
      if (renderItem) {
        try {
          renderItem.renderFunction();
        } catch (error) {
          console.error('レンダリングエラー:', error);
        }
      }
      
      this.isRendering = false;
      
      if (this.renderQueue.length > 0) {
        this.processRenderQueue();
      }
    });
  }

  /**
   * メモリ使用量を取得
   * @returns {Object} メモリ使用量情報
   */
  getMemoryUsage() {
    const threeCount = this.memoryUsage.threeObjects.size;
    const eventCount = this.memoryUsage.eventListeners.size;
    const domCount = this.memoryUsage.domElements.size;
    const imageCount = this.memoryUsage.imageData.size;
    
    let totalImageSize = 0;
    for (const [, imageInfo] of this.memoryUsage.imageData) {
      totalImageSize += imageInfo.size;
    }

    return {
      threeObjects: threeCount,
      eventListeners: eventCount,
      domElements: domCount,
      imageData: {
        count: imageCount,
        totalSize: totalImageSize
      },
      timestamp: Date.now()
    };
  }

  /**
   * メモリクリーンアップを実行
   * @param {Object} options - クリーンアップオプション
   */
  cleanup(options = {}) {
    const {
      threeObjects = true,
      eventListeners = true,
      domElements = false,
      imageData = true,
      maxAge = 300000 // 5分
    } = options;

    const now = Date.now();
    let cleanedCount = 0;

    // Three.jsオブジェクトのクリーンアップ
    if (threeObjects) {
      for (const objInfo of this.memoryUsage.threeObjects) {
        if (now - objInfo.timestamp >= maxAge) {
          this.disposeThreeObject(objInfo.object);
          this.memoryUsage.threeObjects.delete(objInfo);
          cleanedCount++;
        }
      }
    }

    // イベントリスナーのクリーンアップ
    if (eventListeners) {
      for (const [key, listenerInfo] of this.memoryUsage.eventListeners) {
        if (now - listenerInfo.timestamp >= maxAge) {
          listenerInfo.element.removeEventListener(
            listenerInfo.event, 
            listenerInfo.handler, 
            listenerInfo.options
          );
          this.memoryUsage.eventListeners.delete(key);
          cleanedCount++;
        }
      }
    }

    // DOM要素のクリーンアップ
    if (domElements) {
      for (const domInfo of this.memoryUsage.domElements) {
        if (now - domInfo.timestamp >= maxAge) {
          if (domInfo.element.parentNode) {
            domInfo.element.parentNode.removeChild(domInfo.element);
          }
          this.memoryUsage.domElements.delete(domInfo);
          cleanedCount++;
        }
      }
    }

    // 画像データのクリーンアップ
    if (imageData) {
      for (const [key, imageInfo] of this.memoryUsage.imageData) {
        if (now - imageInfo.timestamp >= maxAge) {
          this.memoryUsage.imageData.delete(key);
          cleanedCount++;
        }
      }
    }

    console.log(`🧹 メモリクリーンアップ完了: ${cleanedCount}個のオブジェクトを削除`);
    return cleanedCount;
  }

  /**
   * Three.jsオブジェクトを適切に破棄
   * @param {Object} object - Three.jsオブジェクト
   */
  disposeThreeObject(object) {
    if (!object) return;

    try {
      // ジオメトリの破棄
      if (object.geometry) {
        object.geometry.dispose();
      }

      // マテリアルの破棄
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => this.disposeMaterial(material));
        } else {
          this.disposeMaterial(object.material);
        }
      }

      // テクスチャの破棄
      if (object.material) {
        const materials = Array.isArray(object.material) 
          ? object.material 
          : [object.material];

        materials.forEach(material => {
          if (material.map) material.map.dispose();
          if (material.normalMap) material.normalMap.dispose();
          if (material.roughnessMap) material.roughnessMap.dispose();
          if (material.metalnessMap) material.metalnessMap.dispose();
          if (material.emissiveMap) material.emissiveMap.dispose();
          if (material.aoMap) material.aoMap.dispose();
          if (material.displacementMap) material.displacementMap.dispose();
          if (material.bumpMap) material.bumpMap.dispose();
        });
      }

      // 子オブジェクトの再帰的破棄
      if (object.children) {
        object.children.forEach(child => this.disposeThreeObject(child));
      }

    } catch (error) {
      console.warn('Three.jsオブジェクトの破棄中にエラー:', error);
    }
  }

  /**
   * マテリアルを適切に破棄
   * @param {Object} material - Three.jsマテリアル
   */
  disposeMaterial(material) {
    if (!material) return;

    try {
      // マテリアルの破棄
      if (material.dispose) {
        material.dispose();
      }

      // テクスチャの破棄
      const textureKeys = [
        'map', 'normalMap', 'roughnessMap', 'metalnessMap',
        'emissiveMap', 'aoMap', 'displacementMap', 'bumpMap'
      ];

      textureKeys.forEach(key => {
        if (material[key] && material[key].dispose) {
          material[key].dispose();
        }
      });

    } catch (error) {
      console.warn('マテリアルの破棄中にエラー:', error);
    }
  }

  /**
   * 完全なクリーンアップを実行
   */
  fullCleanup() {
    console.log('🧹 完全なメモリクリーンアップを実行');

    // レンダリングループを停止
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // すべてのThree.jsオブジェクトを破棄
    for (const objInfo of this.memoryUsage.threeObjects) {
      this.disposeThreeObject(objInfo.object);
    }
    this.memoryUsage.threeObjects.clear();

    // すべてのイベントリスナーを削除
    for (const [key, listenerInfo] of this.memoryUsage.eventListeners) {
      listenerInfo.element.removeEventListener(
        listenerInfo.event, 
        listenerInfo.handler, 
        listenerInfo.options
      );
    }
    this.memoryUsage.eventListeners.clear();

    // 画像データをクリア
    this.memoryUsage.imageData.clear();

    // レンダリングキューをクリア
    this.renderQueue = [];
    this.isRendering = false;

    console.log('✅ 完全なメモリクリーンアップ完了');
  }
}

/**
 * DOM操作の最適化ヘルパー
 */
export class DOMOptimizer {
  constructor() {
    this.updateQueue = new Map();
    this.batchUpdateId = null;
  }

  /**
   * DOM更新をバッチ処理
   * @param {Element} element - DOM要素
   * @param {Function} updateFunction - 更新関数
   * @param {string} key - 一意のキー
   */
  batchUpdate(element, updateFunction, key) {
    if (!element || !updateFunction) return;

    if (import.meta.env.MODE === 'test' || typeof requestAnimationFrame !== 'function') {
      updateFunction(element);
      return;
    }

    this.updateQueue.set(key, { element, updateFunction });

    if (!this.batchUpdateId) {
      this.batchUpdateId = requestAnimationFrame(() => {
        this.processBatchUpdates();
      });
    }
  }

  /**
   * バッチ更新を処理
   */
  processBatchUpdates() {
    for (const [key, { element, updateFunction }] of this.updateQueue) {
      try {
        updateFunction(element);
      } catch (error) {
        console.error(`DOM更新エラー (${key}):`, error);
      }
    }

    this.updateQueue.clear();
    this.batchUpdateId = null;
  }

  /**
   * 要素の表示/非表示を最適化
   * @param {Element} element - DOM要素
   * @param {boolean} visible - 表示状態
   * @param {string} method - 表示方法 ('display', 'visibility', 'opacity')
   */
  setVisibility(element, visible, method = 'display') {
    if (!element) return;

    this.batchUpdate(element, (el) => {
      switch (method) {
        case 'display':
          el.style.display = visible ? 'block' : 'none';
          break;
        case 'visibility':
          el.style.visibility = visible ? 'visible' : 'hidden';
          break;
        case 'opacity':
          el.style.opacity = visible ? '1' : '0';
          break;
      }
    }, `visibility_${element.id || 'unknown'}`);
  }

  /**
   * スタイル更新を最適化
   * @param {Element} element - DOM要素
   * @param {Object} styles - スタイルオブジェクト
   */
  updateStyles(element, styles) {
    if (!element || !styles) return;

    this.batchUpdate(element, (el) => {
      Object.assign(el.style, styles);
    }, `styles_${element.id || 'unknown'}`);
  }
}

/**
 * グローバルパフォーマンスマネージャー
 */
export const globalPerformanceManager = new PerformanceManager();
export const globalDOMOptimizer = new DOMOptimizer();

/**
 * メモリ使用量を監視するヘルパー
 * @param {number} interval - 監視間隔（ミリ秒）
 */
export function startMemoryMonitoring(interval = 30000) {
  return setInterval(() => {
    const usage = globalPerformanceManager.getMemoryUsage();
    console.log('📊 メモリ使用量:', usage);
    
    // メモリ使用量が多すぎる場合は自動クリーンアップ
    if (usage.threeObjects > 100 || usage.eventListeners > 50) {
      globalPerformanceManager.cleanup();
    }
  }, interval);
}

/**
 * パフォーマンス測定ヘルパー
 * @param {string} name - 測定名
 * @param {Function} function - 測定する関数
 * @returns {Promise} 実行結果
 */
export async function measurePerformance(name, fn, timeoutMs = null) {
  const startTime = performance.now();
  const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
  
  try {
    const runPromise = fn();
    const result = timeoutMs
      ? await Promise.race([
          runPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Async test timeout')), timeoutMs)
          )
        ])
      : await runPromise;
    const endTime = performance.now();
    const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    
    console.log(`⏱️ ${name}: ${(endTime - startTime).toFixed(2)}ms, メモリ: ${((endMemory - startMemory) / 1024 / 1024).toFixed(2)}MB`);
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    console.error(`❌ ${name} エラー: ${(endTime - startTime).toFixed(2)}ms`, error);
    throw error;
  }
}
