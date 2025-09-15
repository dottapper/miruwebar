// src/utils/debug-overlay.js
// デバッグオーバーレイの分離 - 責務の明確化とz-index競合の回避

/**
 * デバッグオーバーレイ管理クラス
 * ARビューアから分離して独立したデバッグ機能を提供
 */
export class DebugOverlay {
  constructor(options = {}) {
    this.enabled = options.enabled || false;
    this.container = options.container || document.body;
    this.debugConsole = null;
    this.originalLog = null;
    this.originalWarn = null;
    this.originalError = null;
    this.isInitialized = false;
  }

  /**
   * デバッグオーバーレイを初期化
   */
  init() {
    if (this.isInitialized) return;
    
    this.createDebugConsole();
    this.setupConsoleCapture();
    this.isInitialized = true;
    
    console.log('🐛 デバッグオーバーレイ初期化完了');
  }

  /**
   * デバッグコンソール要素を作成
   */
  createDebugConsole() {
    this.debugConsole = document.createElement('div');
    this.debugConsole.id = 'debug-console';
    this.debugConsole.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      right: 10px;
      max-height: 200px;
      background: rgba(0,0,0,0.8);
      color: #00ff00;
      font-size: 12px;
      padding: 10px;
      border-radius: 5px;
      z-index: 10000;
      overflow-y: auto;
      font-family: monospace;
      display: none;
      pointer-events: none;
    `;
    
    this.container.appendChild(this.debugConsole);
  }

  /**
   * コンソールログをキャプチャ
   */
  setupConsoleCapture() {
    this.originalLog = console.log;
    this.originalWarn = console.warn;
    this.originalError = console.error;
    
    const self = this;
    
    console.log = function(...args) {
      self.originalLog.apply(console, args);
      if (self.enabled) {
        self.addToDebugConsole(args.join(' '), 'log');
      }
    };
    
    console.warn = function(...args) {
      self.originalWarn.apply(console, args);
      if (self.enabled) {
        self.addToDebugConsole(args.join(' '), 'warn');
      }
    };
    
    console.error = function(...args) {
      self.originalError.apply(console, args);
      if (self.enabled) {
        self.addToDebugConsole(args.join(' '), 'error');
      }
    };
  }

  /**
   * デバッグコンソールにメッセージを追加
   * @param {string} message - メッセージ
   * @param {string} type - ログタイプ
   */
  addToDebugConsole(message, type = 'log') {
    if (!this.debugConsole) return;
    
    const color = type === 'error' ? '#ff4444' : type === 'warn' ? '#ffaa44' : '#00ff00';
    
    // セキュリティ強化: DOM要素作成でXSS防止
    const div = document.createElement('div');
    div.style.color = color;
    div.textContent = `[${type.toUpperCase()}] ${message}`;
    this.debugConsole.appendChild(div);
    
    // スクロールを最下部に
    this.debugConsole.scrollTop = this.debugConsole.scrollHeight;
    
    // 最大100行まで保持
    while (this.debugConsole.children.length > 100) {
      this.debugConsole.removeChild(this.debugConsole.firstChild);
    }
  }

  /**
   * デバッグオーバーレイを表示/非表示
   * @param {boolean} show - 表示するかどうか
   */
  toggle(show = null) {
    if (!this.debugConsole) return;
    
    if (show === null) {
      this.enabled = !this.enabled;
    } else {
      this.enabled = show;
    }
    
    this.debugConsole.style.display = this.enabled ? 'block' : 'none';
  }

  /**
   * デバッグコンソールをクリア
   */
  clear() {
    if (this.debugConsole) {
      this.debugConsole.innerHTML = '';
    }
  }

  /**
   * デバッグオーバーレイを破棄
   */
  destroy() {
    if (this.originalLog) {
      console.log = this.originalLog;
    }
    if (this.originalWarn) {
      console.warn = this.originalWarn;
    }
    if (this.originalError) {
      console.error = this.originalError;
    }
    
    if (this.debugConsole && this.debugConsole.parentNode) {
      this.debugConsole.parentNode.removeChild(this.debugConsole);
    }
    
    this.isInitialized = false;
    console.log('🐛 デバッグオーバーレイ破棄完了');
  }
}

// デフォルトインスタンス
export const debugOverlay = new DebugOverlay();

// グローバルアクセス用（開発時のみ）
if (typeof window !== 'undefined') {
  window.debugOverlay = debugOverlay;
}

export default debugOverlay;
