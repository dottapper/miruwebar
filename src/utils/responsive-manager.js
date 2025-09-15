// src/utils/responsive-manager.js
// レスポンシブ対応管理システム

import { logger, LOG_LEVELS, LOG_CATEGORIES } from './unified-logger.js';

// matchMedia 安全ラッパー（テスト/サーバー環境でも動作）
const safeMatchMedia = (query) => {
  try {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia(query);
    }
  } catch (_) {}
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; }
  };
};

/**
 * ブレークポイント定義
 */
export const BREAKPOINTS = {
  XS: 0,      // 超小画面（スマホ縦）
  SM: 576,    // 小画面（スマホ横）
  MD: 768,    // 中画面（タブレット）
  LG: 992,    // 大画面（デスクトップ）
  XL: 1200,   // 超大画面（大デスクトップ）
  XXL: 1400   // 超超大画面（4K等）
};

/**
 * デバイスタイプ
 */
export const DEVICE_TYPES = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
  LARGE_DESKTOP: 'large-desktop'
};

/**
 * 画面向き
 */
export const ORIENTATIONS = {
  PORTRAIT: 'portrait',
  LANDSCAPE: 'landscape'
};

/**
 * レスポンシブ管理クラス
 */
export class ResponsiveManager {
  constructor() {
    this.currentBreakpoint = this.getCurrentBreakpoint();
    this.currentDeviceType = this.getCurrentDeviceType();
    this.currentOrientation = this.getCurrentOrientation();
    this.listeners = new Map();
    this.mediaQueries = new Map();
    this.setupMediaQueries();
    this.setupResizeListener();
    this.setupOrientationListener();
  }

  /**
   * メディアクエリをセットアップ
   */
  setupMediaQueries() {
    const queries = {
      xs: `(max-width: ${BREAKPOINTS.SM - 1}px)`,
      sm: `(min-width: ${BREAKPOINTS.SM}px) and (max-width: ${BREAKPOINTS.MD - 1}px)`,
      md: `(min-width: ${BREAKPOINTS.MD}px) and (max-width: ${BREAKPOINTS.LG - 1}px)`,
      lg: `(min-width: ${BREAKPOINTS.LG}px) and (max-width: ${BREAKPOINTS.XL - 1}px)`,
      xl: `(min-width: ${BREAKPOINTS.XL}px) and (max-width: ${BREAKPOINTS.XXL - 1}px)`,
      xxl: `(min-width: ${BREAKPOINTS.XXL}px)`,
      mobile: `(max-width: ${BREAKPOINTS.MD - 1}px)`,
      tablet: `(min-width: ${BREAKPOINTS.MD}px) and (max-width: ${BREAKPOINTS.LG - 1}px)`,
      desktop: `(min-width: ${BREAKPOINTS.LG}px)`,
      portrait: '(orientation: portrait)',
      landscape: '(orientation: landscape)'
    };

    Object.entries(queries).forEach(([name, query]) => {
      const mediaQuery = safeMatchMedia(query);
      this.mediaQueries.set(name, mediaQuery);
    });
  }

  /**
   * リサイズリスナーをセットアップ
   */
  setupResizeListener() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.handleResize();
      }, 100); // デバウンス
    });
  }

  /**
   * 向き変更リスナーをセットアップ
   */
  setupOrientationListener() {
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.handleOrientationChange();
      }, 100);
    });
  }

  /**
   * リサイズ処理
   */
  handleResize() {
    const newBreakpoint = this.getCurrentBreakpoint();
    const newDeviceType = this.getCurrentDeviceType();
    const newOrientation = this.getCurrentOrientation();

    const breakpointChanged = newBreakpoint !== this.currentBreakpoint;
    const deviceTypeChanged = newDeviceType !== this.currentDeviceType;
    const orientationChanged = newOrientation !== this.currentOrientation;

    if (breakpointChanged || deviceTypeChanged || orientationChanged) {
      this.currentBreakpoint = newBreakpoint;
      this.currentDeviceType = newDeviceType;
      this.currentOrientation = newOrientation;

      this.notifyListeners('resize', {
        breakpoint: newBreakpoint,
        deviceType: newDeviceType,
        orientation: newOrientation,
        breakpointChanged,
        deviceTypeChanged,
        orientationChanged
      });

      logger.debug('画面サイズが変更されました', {
        breakpoint: newBreakpoint,
        deviceType: newDeviceType,
        orientation: newOrientation
      });
    }
  }

  /**
   * 向き変更処理
   */
  handleOrientationChange() {
    const newOrientation = this.getCurrentOrientation();
    if (newOrientation !== this.currentOrientation) {
      this.currentOrientation = newOrientation;
      
      this.notifyListeners('orientationchange', {
        orientation: newOrientation,
        breakpoint: this.currentBreakpoint,
        deviceType: this.currentDeviceType
      });

      logger.debug('画面向きが変更されました', { orientation: newOrientation });
    }
  }

  /**
   * 現在のブレークポイントを取得
   * @returns {string} ブレークポイント
   */
  getCurrentBreakpoint() {
    const width = window.innerWidth;
    
    if (width < BREAKPOINTS.SM) return 'xs';
    if (width < BREAKPOINTS.MD) return 'sm';
    if (width < BREAKPOINTS.LG) return 'md';
    if (width < BREAKPOINTS.XL) return 'lg';
    if (width < BREAKPOINTS.XXL) return 'xl';
    return 'xxl';
  }

  /**
   * 現在のデバイスタイプを取得
   * @returns {string} デバイスタイプ
   */
  getCurrentDeviceType() {
    const width = window.innerWidth;
    
    if (width < BREAKPOINTS.MD) return DEVICE_TYPES.MOBILE;
    if (width < BREAKPOINTS.LG) return DEVICE_TYPES.TABLET;
    if (width < BREAKPOINTS.XXL) return DEVICE_TYPES.DESKTOP;
    return DEVICE_TYPES.LARGE_DESKTOP;
  }

  /**
   * 現在の画面向きを取得
   * @returns {string} 画面向き
   */
  getCurrentOrientation() {
    return window.innerHeight > window.innerWidth ? 
      ORIENTATIONS.PORTRAIT : ORIENTATIONS.LANDSCAPE;
  }

  /**
   * メディアクエリがマッチするかチェック
   * @param {string} queryName - クエリ名
   * @returns {boolean} マッチするかどうか
   */
  matches(queryName) {
    const mediaQuery = this.mediaQueries.get(queryName);
    return mediaQuery ? mediaQuery.matches : false;
  }

  /**
   * ブレークポイントがマッチするかチェック
   * @param {string} breakpoint - ブレークポイント
   * @returns {boolean} マッチするかどうか
   */
  isBreakpoint(breakpoint) {
    return this.currentBreakpoint === breakpoint;
  }

  /**
   * デバイスタイプがマッチするかチェック
   * @param {string} deviceType - デバイスタイプ
   * @returns {boolean} マッチするかどうか
   */
  isDevice(deviceType) {
    return this.currentDeviceType === deviceType;
  }

  /**
   * 画面向きがマッチするかチェック
   * @param {string} orientation - 画面向き
   * @returns {boolean} マッチするかどうか
   */
  isOrientation(orientation) {
    return this.currentOrientation === orientation;
  }

  /**
   * モバイルデバイスかどうかチェック
   * @returns {boolean} モバイルデバイスかどうか
   */
  isMobile() {
    return this.isDevice(DEVICE_TYPES.MOBILE);
  }

  /**
   * タブレットデバイスかどうかチェック
   * @returns {boolean} タブレットデバイスかどうか
   */
  isTablet() {
    return this.isDevice(DEVICE_TYPES.TABLET);
  }

  /**
   * デスクトップデバイスかどうかチェック
   * @returns {boolean} デスクトップデバイスかどうか
   */
  isDesktop() {
    return this.isDevice(DEVICE_TYPES.DESKTOP) || 
           this.isDevice(DEVICE_TYPES.LARGE_DESKTOP);
  }

  /**
   * 縦向きかどうかチェック
   * @returns {boolean} 縦向きかどうか
   */
  isPortrait() {
    return this.isOrientation(ORIENTATIONS.PORTRAIT);
  }

  /**
   * 横向きかどうかチェック
   * @returns {boolean} 横向きかどうか
   */
  isLandscape() {
    return this.isOrientation(ORIENTATIONS.LANDSCAPE);
  }

  /**
   * リスナーを追加
   * @param {string} event - イベント名
   * @param {Function} callback - コールバック関数
   */
  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * リスナーを削除
   * @param {string} event - イベント名
   * @param {Function} callback - コールバック関数
   */
  removeListener(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * リスナーに通知
   * @param {string} event - イベント名
   * @param {any} data - データ
   */
  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error('レスポンシブリスナーでエラーが発生しました', { 
            event, 
            error: error.message 
          });
        }
      });
    }
  }

  /**
   * レスポンシブクラスを適用
   * @param {HTMLElement} element - 対象要素
   * @param {Object} options - オプション
   */
  applyResponsiveClasses(element, options = {}) {
    const {
      prefix = 'responsive',
      includeBreakpoint = true,
      includeDevice = true,
      includeOrientation = true
    } = options;

    // 既存のレスポンシブクラスを削除
    const classList = Array.from(element.classList);
    classList.forEach(className => {
      if (className.startsWith(`${prefix}-`)) {
        element.classList.remove(className);
      }
    });

    // 新しいクラスを追加
    if (includeBreakpoint) {
      element.classList.add(`${prefix}-${this.currentBreakpoint}`);
    }
    if (includeDevice) {
      element.classList.add(`${prefix}-${this.currentDeviceType}`);
    }
    if (includeOrientation) {
      element.classList.add(`${prefix}-${this.currentOrientation}`);
    }
  }

  /**
   * レスポンシブスタイルを適用
   * @param {HTMLElement} element - 対象要素
   * @param {Object} styles - スタイル定義
   */
  applyResponsiveStyles(element, styles) {
    const currentStyles = this.getResponsiveStyles(styles);
    
    Object.entries(currentStyles).forEach(([property, value]) => {
      element.style[property] = value;
    });
  }

  /**
   * 現在のデバイスに適したスタイルを取得
   * @param {Object} styles - スタイル定義
   * @returns {Object} 適用するスタイル
   */
  getResponsiveStyles(styles) {
    const currentStyles = {};

    // デバイスタイプ別スタイル
    if (styles[this.currentDeviceType]) {
      Object.assign(currentStyles, styles[this.currentDeviceType]);
    }

    // ブレークポイント別スタイル
    if (styles[this.currentBreakpoint]) {
      Object.assign(currentStyles, styles[this.currentBreakpoint]);
    }

    // 向き別スタイル
    if (styles[this.currentOrientation]) {
      Object.assign(currentStyles, styles[this.currentOrientation]);
    }

    // デフォルトスタイル
    if (styles.default) {
      Object.assign(currentStyles, styles.default);
    }

    return currentStyles;
  }

  /**
   * レスポンシブ画像を設定
   * @param {HTMLImageElement} img - 画像要素
   * @param {Object} sources - 画像ソース定義
   */
  setResponsiveImage(img, sources) {
    const currentSrc = this.getResponsiveImageSrc(sources);
    if (currentSrc) {
      img.src = currentSrc;
    }
  }

  /**
   * 現在のデバイスに適した画像ソースを取得
   * @param {Object} sources - 画像ソース定義
   * @returns {string} 画像ソース
   */
  getResponsiveImageSrc(sources) {
    // デバイスタイプ別ソース
    if (sources[this.currentDeviceType]) {
      return sources[this.currentDeviceType];
    }

    // ブレークポイント別ソース
    if (sources[this.currentBreakpoint]) {
      return sources[this.currentBreakpoint];
    }

    // 向き別ソース
    if (sources[this.currentOrientation]) {
      return sources[this.currentOrientation];
    }

    // デフォルトソース
    return sources.default || sources.src;
  }

  /**
   * レスポンシブレイアウトを調整
   * @param {HTMLElement} container - コンテナ要素
   * @param {Object} layout - レイアウト定義
   */
  adjustLayout(container, layout) {
    const currentLayout = this.getResponsiveLayout(layout);
    
    // グリッドレイアウト
    if (currentLayout.grid) {
      container.style.display = 'grid';
      container.style.gridTemplateColumns = currentLayout.grid.columns;
      container.style.gridTemplateRows = currentLayout.grid.rows;
      container.style.gap = currentLayout.grid.gap;
    }

    // フレックスレイアウト
    if (currentLayout.flex) {
      container.style.display = 'flex';
      container.style.flexDirection = currentLayout.flex.direction;
      container.style.flexWrap = currentLayout.flex.wrap;
      container.style.justifyContent = currentLayout.flex.justify;
      container.style.alignItems = currentLayout.flex.align;
    }

    // その他のスタイル
    if (currentLayout.styles) {
      Object.entries(currentLayout.styles).forEach(([property, value]) => {
        container.style[property] = value;
      });
    }
  }

  /**
   * 現在のデバイスに適したレイアウトを取得
   * @param {Object} layout - レイアウト定義
   * @returns {Object} 適用するレイアウト
   */
  getResponsiveLayout(layout) {
    const currentLayout = {};

    // デバイスタイプ別レイアウト
    if (layout[this.currentDeviceType]) {
      Object.assign(currentLayout, layout[this.currentDeviceType]);
    }

    // ブレークポイント別レイアウト
    if (layout[this.currentBreakpoint]) {
      Object.assign(currentLayout, layout[this.currentBreakpoint]);
    }

    // 向き別レイアウト
    if (layout[this.currentOrientation]) {
      Object.assign(currentLayout, layout[this.currentOrientation]);
    }

    // デフォルトレイアウト
    if (layout.default) {
      Object.assign(currentLayout, layout.default);
    }

    return currentLayout;
  }

  /**
   * 現在の状態を取得
   * @returns {Object} 現在の状態
   */
  getCurrentState() {
    return {
      breakpoint: this.currentBreakpoint,
      deviceType: this.currentDeviceType,
      orientation: this.currentOrientation,
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: this.isMobile(),
      isTablet: this.isTablet(),
      isDesktop: this.isDesktop(),
      isPortrait: this.isPortrait(),
      isLandscape: this.isLandscape()
    };
  }

  /**
   * レスポンシブ設定を取得
   * @returns {Object} レスポンシブ設定
   */
  getResponsiveConfig() {
    return {
      breakpoints: BREAKPOINTS,
      deviceTypes: DEVICE_TYPES,
      orientations: ORIENTATIONS,
      currentState: this.getCurrentState(),
      mediaQueries: Object.fromEntries(this.mediaQueries)
    };
  }
}

/**
 * グローバルレスポンシブ管理インスタンス
 */
export const responsiveManager = new ResponsiveManager();

export default responsiveManager;
