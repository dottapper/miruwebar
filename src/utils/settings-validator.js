// src/utils/settings-validator.js
// 設定管理の統一化と検証機能

/**
 * 設定値の検証と正規化を行うクラス
 */
export class SettingsValidator {
  /**
   * 位置設定の検証と正規化
   * @param {number} value - 位置値
   * @param {number} min - 最小値
   * @param {number} max - 最大値
   * @param {number} defaultValue - デフォルト値
   * @returns {number} 正規化された位置値
   */
  static validatePosition(value, min = 5, max = 95, defaultValue = 50) {
    if (typeof value !== 'number' || isNaN(value)) {
      return defaultValue;
    }
    return Math.max(min, Math.min(max, value));
  }

  /**
   * サイズ設定の検証と正規化
   * @param {number} value - サイズ値
   * @param {number} min - 最小値
   * @param {number} max - 最大値
   * @param {number} defaultValue - デフォルト値
   * @returns {number} 正規化されたサイズ値
   */
  static validateSize(value, min = 0.5, max = 3.0, defaultValue = 1.0) {
    if (typeof value !== 'number' || isNaN(value)) {
      return defaultValue;
    }
    return Math.max(min, Math.min(max, value));
  }

  /**
   * 色設定の検証と正規化
   * @param {string} value - 色値
   * @param {string} defaultValue - デフォルト値
   * @returns {string} 正規化された色値
   */
  static validateColor(value, defaultValue = '#000000') {
    if (typeof value !== 'string' || !value.trim()) {
      return defaultValue;
    }
    // 基本的な色形式の検証
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$|^rgb\(|^rgba\(|^hsl\(|^hsla\(/;
    return colorRegex.test(value) ? value : defaultValue;
  }

  /**
   * 画像データの検証と正規化
   * @param {string} value - 画像データ
   * @param {string} defaultValue - デフォルト値
   * @returns {string} 正規化された画像データ
   */
  static validateImageData(value, defaultValue = '') {
    if (typeof value !== 'string' || !value.trim()) {
      return defaultValue;
    }
    // data:形式または有効なURL形式の検証
    const imageRegex = /^data:image\//;
    const urlRegex = /^https?:\/\/|^\/\//;
    return (imageRegex.test(value) || urlRegex.test(value)) ? value : defaultValue;
  }

  /**
   * ブール値の検証と正規化
   * @param {any} value - 値
   * @param {boolean} defaultValue - デフォルト値
   * @returns {boolean} 正規化されたブール値
   */
  static validateBoolean(value, defaultValue = false) {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return defaultValue;
  }

  /**
   * 文字列の検証と正規化
   * @param {any} value - 値
   * @param {string} defaultValue - デフォルト値
   * @param {number} maxLength - 最大長
   * @returns {string} 正規化された文字列
   */
  static validateString(value, defaultValue = '', maxLength = 1000) {
    if (typeof value !== 'string') {
      return defaultValue;
    }
    const trimmed = value.trim();
    return trimmed.length > maxLength ? trimmed.substring(0, maxLength) : trimmed;
  }
}

/**
 * 設定マージの統一化クラス
 */
export class SettingsMerger {
  /**
   * ローディング画面設定をマージ
   * @param {Object} projectSettings - プロジェクト設定
   * @param {Object} editorSettings - エディター設定
   * @param {Object} templateSettings - テンプレート設定
   * @returns {Object} マージされた設定
   */
  static mergeLoadingScreenSettings(projectSettings = {}, editorSettings = {}, templateSettings = {}) {
    const validator = SettingsValidator;
    
    // 互換: logo/logoImage を統一（logo を優先、なければ logoImage）
    const resolvedLogo = (
      projectSettings.logo || editorSettings.logo || templateSettings.logo ||
      projectSettings.logoImage || editorSettings.logoImage || templateSettings.logoImage || null
    );

    return {
      backgroundColor: validator.validateColor(
        projectSettings.backgroundColor || editorSettings.backgroundColor || templateSettings.backgroundColor,
        '#121212'
      ),
      textColor: validator.validateColor(
        projectSettings.textColor || editorSettings.textColor || templateSettings.textColor,
        '#ffffff'
      ),
      progressColor: validator.validateColor(
        projectSettings.progressColor || projectSettings.accentColor || 
        editorSettings.progressColor || editorSettings.accentColor || 
        templateSettings.progressColor || templateSettings.accentColor,
        '#4CAF50'
      ),
      // 互換: message は loadingMessage を許容
      message: validator.validateString(
        projectSettings.message || projectSettings.loadingMessage || 
        editorSettings.message || editorSettings.loadingMessage || 
        templateSettings.message || templateSettings.loadingMessage,
        '読み込み中...',
        500
      ),
      brandName: validator.validateString(
        projectSettings.brandName || editorSettings.brandName || templateSettings.brandName,
        '',
        100
      ),
      subTitle: validator.validateString(
        projectSettings.subTitle || editorSettings.subTitle || templateSettings.subTitle,
        '',
        200
      ),
      fontScale: validator.validateSize(
        projectSettings.fontScale || editorSettings.fontScale || templateSettings.fontScale,
        0.5, 3.0, 1.0
      ),
      showProgress: validator.validateBoolean(
        projectSettings.showProgress !== undefined ? projectSettings.showProgress : 
        (editorSettings.showProgress !== undefined ? editorSettings.showProgress : 
         (templateSettings.showProgress !== undefined ? templateSettings.showProgress : true))
      ),
      logoType: validator.validateString(
        projectSettings.logoType || editorSettings.logoType || templateSettings.logoType,
        'none',
        50
      ),
      // 新: logo を明示設定、旧互換として logoImage も残す
      logo: resolvedLogo ? validator.validateImageData(resolvedLogo, '') : '',
      logoImage: resolvedLogo ? validator.validateImageData(resolvedLogo, '') : '',
      logoPosition: validator.validatePosition(
        projectSettings.logoPosition !== undefined ? projectSettings.logoPosition : 
        (editorSettings.logoPosition !== undefined ? editorSettings.logoPosition : 
         (templateSettings.logoPosition !== undefined ? templateSettings.logoPosition : 20))
      ),
      logoSize: validator.validateSize(
        projectSettings.logoSize !== undefined ? projectSettings.logoSize : 
        (editorSettings.logoSize !== undefined ? editorSettings.logoSize : 
         (templateSettings.logoSize !== undefined ? templateSettings.logoSize : 1.0))
      ),
      textPosition: validator.validatePosition(
        projectSettings.textPosition !== undefined ? projectSettings.textPosition : 
        (editorSettings.textPosition !== undefined ? editorSettings.textPosition : 
         (templateSettings.textPosition !== undefined ? templateSettings.textPosition : 50))
      )
    };
  }

  /**
   * スタート画面設定をマージ
   * @param {Object} projectSettings - プロジェクト設定
   * @param {Object} editorSettings - エディター設定
   * @param {Object} templateSettings - テンプレート設定
   * @returns {Object} マージされた設定
   */
  static mergeStartScreenSettings(projectSettings = {}, editorSettings = {}, templateSettings = {}) {
    const validator = SettingsValidator;
    
    return {
      title: validator.validateString(
        projectSettings.title || editorSettings.title || templateSettings.title,
        'AR体験を開始',
        200
      ),
      backgroundColor: validator.validateColor(
        projectSettings.backgroundColor || editorSettings.backgroundColor || templateSettings.backgroundColor,
        '#ffffff'
      ),
      textColor: validator.validateColor(
        projectSettings.textColor || editorSettings.textColor || templateSettings.textColor,
        '#000000'
      ),
      buttonText: validator.validateString(
        projectSettings.buttonText || editorSettings.buttonText || templateSettings.buttonText,
        '開始',
        50
      ),
      buttonColor: validator.validateColor(
        projectSettings.buttonColor || editorSettings.buttonColor || templateSettings.buttonColor,
        '#007bff'
      ),
      buttonTextColor: validator.validateColor(
        projectSettings.buttonTextColor || editorSettings.buttonTextColor || templateSettings.buttonTextColor,
        '#ffffff'
      ),
      titlePosition: validator.validatePosition(
        projectSettings.titlePosition !== undefined ? projectSettings.titlePosition : 
        (editorSettings.titlePosition !== undefined ? editorSettings.titlePosition : 
         (templateSettings.titlePosition !== undefined ? templateSettings.titlePosition : 30))
      ),
      titleSize: validator.validateSize(
        projectSettings.titleSize !== undefined ? projectSettings.titleSize : 
        (editorSettings.titleSize !== undefined ? editorSettings.titleSize : 
         (templateSettings.titleSize !== undefined ? templateSettings.titleSize : 1.0))
      ),
      logoImage: validator.validateImageData(
        projectSettings.logoImage || projectSettings.logo || 
        editorSettings.logoImage || editorSettings.logo || 
        templateSettings.logoImage || templateSettings.logo
      ),
      logoPosition: validator.validatePosition(
        projectSettings.logoPosition !== undefined ? projectSettings.logoPosition : 
        (editorSettings.logoPosition !== undefined ? editorSettings.logoPosition : 
         (templateSettings.logoPosition !== undefined ? templateSettings.logoPosition : 20))
      ),
      logoSize: validator.validateSize(
        projectSettings.logoSize !== undefined ? projectSettings.logoSize : 
        (editorSettings.logoSize !== undefined ? editorSettings.logoSize : 
         (templateSettings.logoSize !== undefined ? templateSettings.logoSize : 1.0))
      ),
      buttonPosition: validator.validatePosition(
        projectSettings.buttonPosition !== undefined ? projectSettings.buttonPosition : 
        (editorSettings.buttonPosition !== undefined ? editorSettings.buttonPosition : 
         (templateSettings.buttonPosition !== undefined ? templateSettings.buttonPosition : 70))
      ),
      buttonSize: validator.validateSize(
        projectSettings.buttonSize !== undefined ? projectSettings.buttonSize : 
        (editorSettings.buttonSize !== undefined ? editorSettings.buttonSize : 
         (templateSettings.buttonSize !== undefined ? templateSettings.buttonSize : 1.0))
      )
    };
  }

  /**
   * ガイド画面設定をマージ
   * @param {Object} projectSettings - プロジェクト設定
   * @param {Object} editorSettings - エディター設定
   * @param {Object} templateSettings - テンプレート設定
   * @returns {Object} マージされた設定
   */
  static mergeGuideScreenSettings(projectSettings = {}, editorSettings = {}, templateSettings = {}) {
    const validator = SettingsValidator;
    
    return {
      title: validator.validateString(
        projectSettings.title || editorSettings.title || templateSettings.title,
        'AR体験の準備',
        200
      ),
      description: validator.validateString(
        projectSettings.description || editorSettings.description || templateSettings.description,
        'マーカーをカメラにかざしてください',
        500
      ),
      imageUrl: validator.validateImageData(
        projectSettings.imageUrl || projectSettings.image || 
        editorSettings.imageUrl || editorSettings.image || 
        templateSettings.imageUrl || templateSettings.image
      ),
      markerImageUrl: validator.validateImageData(
        projectSettings.markerImageUrl || projectSettings.markerImage || 
        editorSettings.markerImageUrl || editorSettings.markerImage || 
        templateSettings.markerImageUrl || templateSettings.markerImage
      )
    };
  }
}
