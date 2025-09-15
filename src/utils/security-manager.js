// src/utils/security-manager.js
// セキュリティ管理システム

import { logger, LOG_LEVELS, LOG_CATEGORIES } from './unified-logger.js';

/**
 * セキュリティ管理クラス
 */
class SecurityManager {
  constructor() {
    this.allowedTags = new Set([
      'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'em', 'b', 'i', 'u', 'br', 'hr', 'ul', 'ol', 'li',
      'a', 'img', 'button', 'input', 'textarea', 'select', 'option',
      'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot'
    ]);
    
    this.allowedAttributes = new Set([
      'class', 'id', 'style', 'title', 'alt', 'src', 'href', 'target',
      'type', 'value', 'placeholder', 'disabled', 'readonly', 'checked',
      'selected', 'colspan', 'rowspan', 'width', 'height'
    ]);
    
    this.dangerousPatterns = [
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<script/gi,
      /<\/script>/gi,
      /<iframe/gi,
      /<\/iframe>/gi,
      /<object/gi,
      /<\/object>/gi,
      /<embed/gi,
      /<\/embed>/gi,
      /<link/gi,
      /<\/link>/gi,
      /<meta/gi,
      /<\/meta>/gi,
      /<style/gi,
      /<\/style>/gi
    ];
  }

  /**
   * HTMLエスケープ
   * @param {string} text - エスケープするテキスト
   * @returns {string} エスケープされたテキスト
   */
  escapeHTML(text) {
    if (typeof text !== 'string') {
      return String(text);
    }
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * 属性値をエスケープ
   * @param {string} value - エスケープする属性値
   * @returns {string} エスケープされた属性値
   */
  escapeAttribute(value) {
    if (typeof value !== 'string') {
      return String(value);
    }
    
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * URLをサニタイズ
   * @param {string} url - サニタイズするURL
   * @returns {string} サニタイズされたURL
   */
  sanitizeURL(url) {
    if (typeof url !== 'string') {
      return '';
    }
    
    // 危険なプロトコルをチェック
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    const lowerUrl = url.toLowerCase().trim();
    
    for (const protocol of dangerousProtocols) {
      if (lowerUrl.startsWith(protocol)) {
        logger.warn('危険なURLプロトコルが検出されました', { url, protocol });
        return '';
      }
    }
    
    // 相対URLまたは安全なプロトコルのみ許可
    if (lowerUrl.startsWith('http://') || 
        lowerUrl.startsWith('https://') || 
        lowerUrl.startsWith('/') || 
        lowerUrl.startsWith('./') || 
        lowerUrl.startsWith('../') ||
        lowerUrl.startsWith('#') ||
        lowerUrl.startsWith('?')) {
      return url;
    }
    
    // その他の場合は空文字を返す
    logger.warn('許可されていないURL形式が検出されました', { url });
    return '';
  }

  /**
   * HTMLをサニタイズ
   * @param {string} html - サニタイズするHTML
   * @param {Object} options - オプション
   * @returns {string} サニタイズされたHTML
   */
  sanitizeHTML(html, options = {}) {
    if (typeof html !== 'string') {
      return '';
    }

    const {
      allowedTags = this.allowedTags,
      allowedAttributes = this.allowedAttributes,
      stripTags = false
    } = options;

    // 危険なパターンをチェック
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(html)) {
        logger.warn('危険なHTMLパターンが検出されました', { 
          html: html.substring(0, 100), 
          pattern: pattern.toString() 
        });
        return this.escapeHTML(html);
      }
    }

    if (stripTags) {
      // タグを完全に除去
      return html.replace(/<[^>]*>/g, '');
    }

    // 基本的なサニタイズ（より高度なサニタイズが必要な場合はDOMPurifyなどを使用）
    let sanitized = html;
    
    // 許可されていないタグを除去
    sanitized = sanitized.replace(/<\/?([^>\s]+)[^>]*>/g, (match, tagName) => {
      const lowerTagName = tagName.toLowerCase();
      if (allowedTags.has(lowerTagName)) {
        return match;
      }
      return '';
    });

    // 許可されていない属性を除去
    sanitized = sanitized.replace(/(\w+)\s*=\s*["'][^"']*["']/g, (match, attrName) => {
      if (allowedAttributes.has(attrName.toLowerCase())) {
        return match;
      }
      return '';
    });

    return sanitized;
  }

  /**
   * ユーザー入力を検証
   * @param {string} input - 検証する入力
   * @param {Object} options - 検証オプション
   * @returns {Object} 検証結果
   */
  validateInput(input, options = {}) {
    const {
      type = 'text',
      maxLength = 1000,
      minLength = 0,
      pattern = null,
      required = false
    } = options;

    const result = {
      isValid: true,
      errors: [],
      sanitized: input
    };

    // 必須チェック
    if (required && (!input || input.trim().length === 0)) {
      result.isValid = false;
      result.errors.push('必須項目です');
      return result;
    }

    // 文字列型チェック
    if (typeof input !== 'string') {
      result.isValid = false;
      result.errors.push('文字列である必要があります');
      return result;
    }

    // 長さチェック
    if (input.length > maxLength) {
      result.isValid = false;
      result.errors.push(`最大${maxLength}文字まで入力可能です`);
    }

    if (input.length < minLength) {
      result.isValid = false;
      result.errors.push(`最低${minLength}文字以上入力してください`);
    }

    // パターンチェック
    if (pattern && !pattern.test(input)) {
      result.isValid = false;
      result.errors.push('入力形式が正しくありません');
    }

    // タイプ別検証
    switch (type) {
      case 'email':
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(input)) {
          result.isValid = false;
          result.errors.push('有効なメールアドレスを入力してください');
        }
        break;
      
      case 'url':
        try {
          new URL(input);
        } catch {
          result.isValid = false;
          result.errors.push('有効なURLを入力してください');
        }
        break;
      
      case 'number':
        if (isNaN(Number(input))) {
          result.isValid = false;
          result.errors.push('数値を入力してください');
        }
        break;
      
      case 'color':
        const colorPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!colorPattern.test(input)) {
          result.isValid = false;
          result.errors.push('有効なカラーコードを入力してください（例: #FF0000）');
        }
        break;
    }

    // サニタイズ
    result.sanitized = this.escapeHTML(input);

    return result;
  }

  /**
   * 安全なDOM要素を作成
   * @param {string} tagName - タグ名
   * @param {Object} attributes - 属性
   * @param {string} content - 内容
   * @returns {HTMLElement} 作成された要素
   */
  createSafeElement(tagName, attributes = {}, content = '') {
    const element = document.createElement(tagName);
    
    // 属性を設定
    Object.entries(attributes).forEach(([key, value]) => {
      if (this.allowedAttributes.has(key.toLowerCase())) {
        const sanitizedValue = this.escapeAttribute(String(value));
        element.setAttribute(key, sanitizedValue);
      }
    });
    
    // 内容を設定
    if (content) {
      if (this.allowedTags.has(tagName.toLowerCase())) {
        element.textContent = content; // textContentを使用してXSSを防止
      }
    }
    
    return element;
  }

  /**
   * 安全なinnerHTMLの代替
   * @param {HTMLElement} element - 対象要素
   * @param {string} content - 内容
   * @param {Object} options - オプション
   */
  setSafeContent(element, content, options = {}) {
    if (!element) return;
    
    const {
      sanitize = true,
      escape = true
    } = options;
    
    let processedContent = content;
    
    if (escape) {
      processedContent = this.escapeHTML(processedContent);
    }
    
    if (sanitize) {
      processedContent = this.sanitizeHTML(processedContent);
    }
    
    element.innerHTML = processedContent;
  }

  /**
   * ファイル名をサニタイズ
   * @param {string} filename - サニタイズするファイル名
   * @returns {string} サニタイズされたファイル名
   */
  sanitizeFilename(filename) {
    if (typeof filename !== 'string') {
      return 'unknown';
    }
    
    // 危険な文字を除去
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\.\./g, '_')
      .replace(/^\./, '_')
      .replace(/\.$/, '_')
      .substring(0, 255); // ファイル名の長さ制限
  }

  /**
   * データをサニタイズ
   * @param {any} data - サニタイズするデータ
   * @param {Object} options - オプション
   * @returns {any} サニタイズされたデータ
   */
  sanitizeData(data, options = {}) {
    const {
      deep = true,
      maxDepth = 10
    } = options;
    
    if (!deep || maxDepth <= 0) {
      return data;
    }
    
    if (typeof data === 'string') {
      return this.escapeHTML(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item, { ...options, maxDepth: maxDepth - 1 }));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        const sanitizedKey = this.escapeHTML(key);
        const sanitizedValue = this.sanitizeData(value, { ...options, maxDepth: maxDepth - 1 });
        sanitized[sanitizedKey] = sanitizedValue;
      }
      return sanitized;
    }
    
    return data;
  }

  /**
   * セキュリティイベントをログ
   * @param {string} event - イベント名
   * @param {Object} details - 詳細情報
   */
  logSecurityEvent(event, details = {}) {
    logger.warn(`セキュリティイベント: ${event}`, {
      event,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...details
    });
  }

  /**
   * セキュリティ設定を取得
   * @returns {Object} セキュリティ設定
   */
  getSecurityConfig() {
    return {
      allowedTags: Array.from(this.allowedTags),
      allowedAttributes: Array.from(this.allowedAttributes),
      dangerousPatterns: this.dangerousPatterns.map(p => p.toString())
    };
  }

  /**
   * セキュリティ設定を更新
   * @param {Object} config - 新しい設定
   */
  updateSecurityConfig(config) {
    if (config.allowedTags) {
      this.allowedTags = new Set(config.allowedTags);
    }
    if (config.allowedAttributes) {
      this.allowedAttributes = new Set(config.allowedAttributes);
    }
    if (config.dangerousPatterns) {
      this.dangerousPatterns = config.dangerousPatterns.map(p => new RegExp(p, 'gi'));
    }
  }
}

/**
 * グローバルセキュリティ管理インスタンス
 */
export const securityManager = new SecurityManager();

/**
 * セキュリティヘルパー関数
 */
export const security = {
  /**
   * HTMLエスケープ
   * @param {string} text - エスケープするテキスト
   * @returns {string} エスケープされたテキスト
   */
  escape: (text) => securityManager.escapeHTML(text),
  
  /**
   * 属性エスケープ
   * @param {string} value - エスケープする属性値
   * @returns {string} エスケープされた属性値
   */
  escapeAttr: (value) => securityManager.escapeAttribute(value),
  
  /**
   * URLサニタイズ
   * @param {string} url - サニタイズするURL
   * @returns {string} サニタイズされたURL
   */
  sanitizeURL: (url) => securityManager.sanitizeURL(url),
  
  /**
   * HTMLサニタイズ
   * @param {string} html - サニタイズするHTML
   * @param {Object} options - オプション
   * @returns {string} サニタイズされたHTML
   */
  sanitizeHTML: (html, options) => securityManager.sanitizeHTML(html, options),
  
  /**
   * 入力検証
   * @param {string} input - 検証する入力
   * @param {Object} options - 検証オプション
   * @returns {Object} 検証結果
   */
  validate: (input, options) => securityManager.validateInput(input, options),
  
  /**
   * 安全な要素作成
   * @param {string} tagName - タグ名
   * @param {Object} attributes - 属性
   * @param {string} content - 内容
   * @returns {HTMLElement} 作成された要素
   */
  createElement: (tagName, attributes, content) => 
    securityManager.createSafeElement(tagName, attributes, content),
  
  /**
   * 安全なコンテンツ設定
   * @param {HTMLElement} element - 対象要素
   * @param {string} content - 内容
   * @param {Object} options - オプション
   */
  setContent: (element, content, options) => 
    securityManager.setSafeContent(element, content, options),
  
  /**
   * ファイル名サニタイズ
   * @param {string} filename - サニタイズするファイル名
   * @returns {string} サニタイズされたファイル名
   */
  sanitizeFilename: (filename) => securityManager.sanitizeFilename(filename),
  
  /**
   * データサニタイズ
   * @param {any} data - サニタイズするデータ
   * @param {Object} options - オプション
   * @returns {any} サニタイズされたデータ
   */
  sanitizeData: (data, options) => securityManager.sanitizeData(data, options)
};

export default securityManager;
