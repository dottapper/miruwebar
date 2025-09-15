// src/utils/debug-tools.js
// デバッグツールと状態可視化

import { logger, LOG_LEVELS, LOG_CATEGORIES } from './unified-logger.js';

/**
 * デバッグツールクラス
 */
class DebugTools {
  constructor() {
    this.isEnabled = false;
    this.overlay = null;
    this.stats = {
      performance: {},
      memory: {},
      errors: [],
      warnings: []
    };
    this.watchers = new Map();
    this.intervalId = null;
  }

  /**
   * デバッグツールを有効化
   */
  enable() {
    if (this.isEnabled) return;

    this.isEnabled = true;
    this.createOverlay();
    this.startMonitoring();
    logger.info('デバッグツールを有効化しました');
  }

  /**
   * デバッグツールを無効化
   */
  disable() {
    if (!this.isEnabled) return;

    this.isEnabled = false;
    this.removeOverlay();
    this.stopMonitoring();
    logger.info('デバッグツールを無効化しました');
  }

  /**
   * デバッグオーバーレイを作成
   */
  createOverlay() {
    if (this.overlay) return;

    this.overlay = document.createElement('div');
    this.overlay.id = 'debug-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 300px;
      max-height: 80vh;
      background: rgba(0, 0, 0, 0.9);
      color: #fff;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 5px;
      z-index: 10000;
      overflow-y: auto;
      border: 1px solid #333;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    `;

    this.updateOverlay();
    document.body.appendChild(this.overlay);

    // ドラッグ可能にする
    this.makeDraggable(this.overlay);
  }

  /**
   * デバッグオーバーレイを削除
   */
  removeOverlay() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
      this.overlay = null;
    }
  }

  /**
   * オーバーレイを更新
   */
  updateOverlay() {
    if (!this.overlay) return;

    const content = this.generateOverlayContent();
    this.overlay.innerHTML = content;
  }

  /**
   * オーバーレイの内容を生成
   */
  generateOverlayContent() {
    const stats = this.getStats();
    const errors = logger.getErrors();
    const warnings = logger.getLogs({ level: LOG_LEVELS.WARN });

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;">
        <h3 style="margin: 0; color: #4CAF50;">🐛 Debug Tools</h3>
        <button id="debug-close" style="background: #f44336; color: white; border: none; border-radius: 3px; padding: 2px 6px; cursor: pointer;">×</button>
      </div>
      
      <div style="margin-bottom: 10px;">
        <h4 style="margin: 0 0 5px 0; color: #2196F3;">📊 Performance</h4>
        <div style="font-size: 11px; line-height: 1.4;">
          <div>FPS: <span style="color: #4CAF50;">${stats.fps || 'N/A'}</span></div>
          <div>Memory: <span style="color: #FF9800;">${stats.memory.used || 'N/A'}</span></div>
          <div>Load Time: <span style="color: #9C27B0;">${stats.loadTime || 'N/A'}</span></div>
        </div>
      </div>

      <div style="margin-bottom: 10px;">
        <h4 style="margin: 0 0 5px 0; color: #FF5722;">❌ Errors (${errors.length})</h4>
        <div style="max-height: 100px; overflow-y: auto; font-size: 10px;">
          ${errors.slice(-5).map(error => `
            <div style="margin-bottom: 2px; padding: 2px; background: rgba(244, 67, 54, 0.2); border-radius: 2px;">
              ${error.message}
            </div>
          `).join('')}
        </div>
      </div>

      <div style="margin-bottom: 10px;">
        <h4 style="margin: 0 0 5px 0; color: #FF9800;">⚠️ Warnings (${warnings.length})</h4>
        <div style="max-height: 100px; overflow-y: auto; font-size: 10px;">
          ${warnings.slice(-5).map(warning => `
            <div style="margin-bottom: 2px; padding: 2px; background: rgba(255, 152, 0, 0.2); border-radius: 2px;">
              ${warning.message}
            </div>
          `).join('')}
        </div>
      </div>

      <div style="margin-bottom: 10px;">
        <h4 style="margin: 0 0 5px 0; color: #607D8B;">🔧 Actions</h4>
        <div style="display: flex; gap: 5px; flex-wrap: wrap;">
          <button id="debug-clear-logs" style="background: #607D8B; color: white; border: none; border-radius: 3px; padding: 2px 6px; cursor: pointer; font-size: 10px;">Clear Logs</button>
          <button id="debug-export-logs" style="background: #4CAF50; color: white; border: none; border-radius: 3px; padding: 2px 6px; cursor: pointer; font-size: 10px;">Export</button>
          <button id="debug-refresh" style="background: #2196F3; color: white; border: none; border-radius: 3px; padding: 2px 6px; cursor: pointer; font-size: 10px;">Refresh</button>
        </div>
      </div>

      <div style="font-size: 10px; color: #888; text-align: center;">
        Press 'D' to toggle | Drag to move
      </div>
    `;

    // イベントリスナーを追加
    this.addOverlayEventListeners();
  }

  /**
   * オーバーレイのイベントリスナーを追加
   */
  addOverlayEventListeners() {
    if (!this.overlay) return;

    // 閉じるボタン
    const closeBtn = this.overlay.querySelector('#debug-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.disable());
    }

    // ログクリアボタン
    const clearBtn = this.overlay.querySelector('#debug-clear-logs');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        logger.clearLogs();
        this.updateOverlay();
      });
    }

    // ログエクスポートボタン
    const exportBtn = this.overlay.querySelector('#debug-export-logs');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportLogs();
      });
    }

    // リフレッシュボタン
    const refreshBtn = this.overlay.querySelector('#debug-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.updateOverlay();
      });
    }
  }

  /**
   * 要素をドラッグ可能にする
   * @param {HTMLElement} element - 要素
   */
  makeDraggable(element) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    element.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(element.style.left) || 0;
      startTop = parseInt(element.style.top) || 0;
      
      element.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      element.style.left = (startLeft + deltaX) + 'px';
      element.style.top = (startTop + deltaY) + 'px';
      element.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        element.style.cursor = 'default';
      }
    });
  }

  /**
   * 監視を開始
   */
  startMonitoring() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.updateStats();
      this.updateOverlay();
    }, 1000);
  }

  /**
   * 監視を停止
   */
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 統計を更新
   */
  updateStats() {
    // メモリ使用量
    if (performance.memory) {
      this.stats.memory = {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
      };
    }

    // FPS計算
    this.calculateFPS();

    // ロード時間
    if (performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      this.stats.loadTime = loadTime + 'ms';
    }
  }

  /**
   * FPSを計算
   */
  calculateFPS() {
    if (!this.lastFrameTime) {
      this.lastFrameTime = performance.now();
      this.frameCount = 0;
      return;
    }

    this.frameCount++;
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;

    if (deltaTime >= 1000) {
      this.stats.fps = Math.round((this.frameCount * 1000) / deltaTime);
      this.frameCount = 0;
      this.lastFrameTime = currentTime;
    }
  }

  /**
   * 統計を取得
   * @returns {Object} 統計データ
   */
  getStats() {
    return {
      ...this.stats,
      logs: logger.getStats()
    };
  }

  /**
   * ログをエクスポート
   */
  exportLogs() {
    const logs = logger.exportLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    logger.info('デバッグログをエクスポートしました');
  }

  /**
   * 変数を監視
   * @param {string} name - 変数名
   * @param {Function} getter - 値を取得する関数
   * @param {number} interval - 監視間隔（ミリ秒）
   */
  watchVariable(name, getter, interval = 1000) {
    this.watchers.set(name, {
      getter,
      interval,
      lastValue: null,
      intervalId: setInterval(() => {
        try {
          const value = getter();
          if (value !== this.watchers.get(name).lastValue) {
            this.watchers.get(name).lastValue = value;
            logger.debug(`変数 ${name} が変更されました`, { name, value });
          }
        } catch (error) {
          logger.error(`変数 ${name} の監視中にエラーが発生しました`, { name, error: error.message });
        }
      }, interval)
    });
  }

  /**
   * 変数の監視を停止
   * @param {string} name - 変数名
   */
  unwatchVariable(name) {
    const watcher = this.watchers.get(name);
    if (watcher) {
      clearInterval(watcher.intervalId);
      this.watchers.delete(name);
    }
  }

  /**
   * すべての監視を停止
   */
  stopAllWatching() {
    this.watchers.forEach(watcher => {
      clearInterval(watcher.intervalId);
    });
    this.watchers.clear();
  }

  /**
   * パフォーマンス測定を開始
   * @param {string} name - 測定名
   */
  startPerformanceMeasurement(name) {
    logger.startPerformanceMark(name);
  }

  /**
   * パフォーマンス測定を終了
   * @param {string} name - 測定名
   * @param {any} data - 追加データ
   */
  endPerformanceMeasurement(name, data = null) {
    logger.endPerformanceMark(name, data);
  }

  /**
   * メモリ使用量を記録
   * @param {string} context - コンテキスト
   */
  recordMemoryUsage(context) {
    if (performance.memory) {
      const usage = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        context
      };
      logger.performance(`メモリ使用量を記録しました`, usage);
    }
  }

  /**
   * エラーを記録
   * @param {Error} error - エラー
   * @param {string} context - コンテキスト
   */
  recordError(error, context = '') {
    logger.error(`エラーが発生しました: ${error.message}`, {
      context,
      stack: error.stack,
      name: error.name
    });
  }

  /**
   * 警告を記録
   * @param {string} message - メッセージ
   * @param {any} data - データ
   */
  recordWarning(message, data = null) {
    logger.warn(message, data);
  }
}

/**
 * グローバルデバッグツールインスタンス
 */
export const debugTools = new DebugTools();

/**
 * キーボードショートカットを設定
 */
document.addEventListener('keydown', (e) => {
  // Ctrl+Shift+D または D キーでデバッグツールを切り替え
  if ((e.ctrlKey && e.shiftKey && e.key === 'D') || e.key === 'd') {
    e.preventDefault();
    if (debugTools.isEnabled) {
      debugTools.disable();
    } else {
      debugTools.enable();
    }
  }
});

/**
 * 開発環境での自動有効化
 */
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  // 開発環境では自動的にデバッグツールを有効化
  setTimeout(() => {
    debugTools.enable();
  }, 1000);
}

export default debugTools;
