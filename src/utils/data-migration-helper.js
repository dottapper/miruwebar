/**
 * データマイグレーション・エラー耐性ヘルパー
 * 既存データの安全な変換と破損データ時のフォールバック機能
 */

import { createLogger } from './logger.js';
import { migrateProjectProperties, PROPERTY_MIGRATIONS } from '../components/loading-screen/template-manager.js';

const logger = createLogger('DataMigrationHelper');

/**
 * 旧プロパティ名から新プロパティ名へのマイグレーション定義
 */
const LEGACY_PROPERTY_MIGRATIONS = {
  // テンプレート関連の古いプロパティ
  template: {
    'logoImage': 'logo',
    'createdAt': 'created',
    'updatedAt': 'updated',
    'backgroundImage': 'backgroundColor',
    'textColor': 'color',
    'logoSrc': 'logo',
    'logoUrl': 'logo',
    'message': 'loadingMessage',
    'msg': 'loadingMessage',
    'text': 'loadingMessage'
  },
  // プロジェクト関連の古いプロパティ
  project: {
    'createdAt': 'created',
    'updatedAt': 'updated',
    'lastModified': 'updated',
    'createDate': 'created'
  },
  // 共通プロパティ
  common: {
    'timestamp': 'updated',
    'dateCreated': 'created',
    'dateUpdated': 'updated'
  }
};

/**
 * デフォルト値定義
 */
const DEFAULT_VALUES = {
  template: {
    id: null,
    name: 'Untitled Template',
    description: '説明なし',
    settings: {
      startScreen: {
        logoPosition: 25,
        logoSize: 1.0,
        title: 'AR体験を開始',
        titlePosition: 50,
        titleSize: 1.0,
        buttonText: '開始',
        buttonPosition: 75,
        buttonSize: 1.0,
        backgroundColor: '#1a1a1a',
        textColor: '#ffffff',
        buttonColor: '#6c5ce7',
        buttonTextColor: '#ffffff'
      },
      loadingScreen: {
        backgroundColor: '#1a1a1a',
        logoType: 'none',
        logoPosition: 25,
        logoSize: 1.0,
        brandName: 'Your Brand',
        subTitle: 'AR Experience',
        loadingMessage: '読み込み中...',
        fontScale: 1.0,
        animation: 'none'
      },
      guideScreen: {
        mode: 'surface',
        backgroundColor: '#1a1a1a',
        textColor: '#ffffff',
        surfaceDetection: {
          title: '画像の上にカメラを向けて合わせてください',
          description: 'マーカー画像を画面内に収めてください',
          markerSize: 1.0
        },
        worldTracking: {
          title: '画面をタップしてください',
          description: '平らな面を見つけて画面をタップしてください'
        }
      }
    },
    isDefault: false,
    created: Date.now(),
    updated: Date.now()
  },
  project: {
    id: null,
    name: 'New Project',
    description: '',
    loadingScreen: {
      enabled: true,
      template: 'default'
    },
    created: Date.now(),
    updated: Date.now()
  }
};

/**
 * データ修復・マイグレーションクラス
 */
class DataMigrationHelper {
  constructor() {
    this.migrationHistory = [];
    this.errorLog = [];
  }

  /**
   * テンプレートデータの安全な読み込みとマイグレーション
   * @param {string} templatesJson - JSON文字列
   * @returns {Object} 正規化されたテンプレートデータ
   */
  safeLoadTemplates(templatesJson) {
    const result = {
      templates: [],
      migrated: 0,
      errors: 0,
      created: 0
    };

    try {
      if (!templatesJson) {
        logger.info('テンプレートデータなし、デフォルトテンプレート作成');
        result.templates = [this.createDefaultTemplate()];
        result.created = 1;
        return result;
      }

      // 安全なJSON解析を使用
      const rawTemplates = this.safeJsonParse(templatesJson, [], { repair: true });
      
      if (rawTemplates === null) {
        logger.error('テンプレートJSON解析完全失敗');
        result.templates = [this.createDefaultTemplate()];
        result.created = 1;
        result.errors = 1;
        return result;
      }

      if (!Array.isArray(rawTemplates)) {
        logger.warn('テンプレートデータが配列ではありません、修復します');
        rawTemplates = [];
      }

      // 各テンプレートを安全に処理
      rawTemplates.forEach((template, index) => {
        try {
          const migratedTemplate = this.migrateTemplate(template, index);
          if (migratedTemplate) {
            result.templates.push(migratedTemplate);
            if (migratedTemplate._migrated) {
              result.migrated++;
            }
          } else {
            result.errors++;
          }
        } catch (error) {
          logger.error(`テンプレート ${index} の処理エラー:`, error);
          result.errors++;
          
          // 破損したテンプレートの代替作成を試みる
          const fallbackTemplate = this.createFallbackTemplate(template, index);
          if (fallbackTemplate) {
            result.templates.push(fallbackTemplate);
            result.created++;
          }
        }
      });

      // デフォルトテンプレートが存在しない場合は作成
      const hasDefault = result.templates.some(t => t.id === 'default');
      if (!hasDefault) {
        result.templates.unshift(this.createDefaultTemplate());
        result.created++;
      }

      logger.info('テンプレート読み込み完了:', result);
      return result;

    } catch (error) {
      logger.error('テンプレート読み込み重大エラー:', error);
      
      // 最終的なフォールバック
      result.templates = [this.createDefaultTemplate()];
      result.created = 1;
      result.errors = 1;
      return result;
    }
  }

  /**
   * プロジェクトデータの安全な読み込みとマイグレーション
   * @param {string} projectsJson - JSON文字列
   * @returns {Object} 正規化されたプロジェクトデータ
   */
  safeLoadProjects(projectsJson) {
    const result = {
      projects: [],
      migrated: 0,
      errors: 0,
      fixed: 0
    };

    try {
      if (!projectsJson) {
        logger.info('プロジェクトデータなし');
        return result;
      }

      // 安全なJSON解析を使用
      const rawProjects = this.safeJsonParse(projectsJson, [], { repair: true });
      
      if (rawProjects === null) {
        logger.error('プロジェクトJSON解析完全失敗');
        return result;
      }

      if (!Array.isArray(rawProjects)) {
        logger.warn('プロジェクトデータが配列ではありません');
        return result;
      }

      // 各プロジェクトを安全に処理
      rawProjects.forEach((project, index) => {
        try {
          const migratedProject = this.migrateProject(project, index);
          if (migratedProject) {
            result.projects.push(migratedProject);
            if (migratedProject._migrated) {
              result.migrated++;
            }
            if (migratedProject._fixed) {
              result.fixed++;
            }
          } else {
            result.errors++;
          }
        } catch (error) {
          logger.error(`プロジェクト ${index} の処理エラー:`, error);
          result.errors++;
        }
      });

      logger.info('プロジェクト読み込み完了:', result);
      return result;

    } catch (error) {
      logger.error('プロジェクト読み込み重大エラー:', error);
      result.errors = 1;
      return result;
    }
  }

  /**
   * テンプレートデータのマイグレーション
   * @param {Object} template - 元テンプレート
   * @param {number} index - インデックス
   * @returns {Object|null} マイグレーション後テンプレート
   */
  migrateTemplate(template, index = 0) {
    if (!template || typeof template !== 'object') {
      logger.warn(`テンプレート ${index} が無効:`, template);
      return null;
    }

    let migrated = { ...template };
    let needsMigration = false;

    try {
      // 必須プロパティの検証と修復
      if (!migrated.id) {
        migrated.id = `recovered_template_${Date.now()}_${index}`;
        needsMigration = true;
        logger.info(`テンプレート ${index} にIDを自動生成:`, migrated.id);
      }

      if (!migrated.name || typeof migrated.name !== 'string') {
        migrated.name = `Recovered Template ${index + 1}`;
        needsMigration = true;
      }

      if (!migrated.description) {
        migrated.description = '復元されたテンプレート';
        needsMigration = true;
      }

      // 旧プロパティのマイグレーション
      const legacyMigration = this.migrateLegacyProperties(migrated, 'template');
      if (legacyMigration.migrated) {
        migrated = legacyMigration.data;
        needsMigration = true;
      }

      // 設定データの検証と修復
      if (!migrated.settings || typeof migrated.settings !== 'object') {
        migrated.settings = JSON.parse(JSON.stringify(DEFAULT_VALUES.template.settings));
        needsMigration = true;
        logger.warn(`テンプレート ${migrated.name} の設定を復元`);
      } else {
        // 各セクションの検証
        const sectionsFixed = this.validateAndFixTemplateSettings(migrated.settings);
        if (sectionsFixed > 0) {
          needsMigration = true;
          logger.info(`テンプレート ${migrated.name} の${sectionsFixed}セクションを修復`);
        }
      }

      // プロパティマイグレーションの適用
      try {
        const propertyMigrated = migrateProjectProperties(migrated);
        if (JSON.stringify(propertyMigrated) !== JSON.stringify(migrated)) {
          migrated = propertyMigrated;
          needsMigration = true;
        }
      } catch (propError) {
        logger.warn('プロパティマイグレーションエラー:', propError);
      }

      // タイムスタンプの正規化
      migrated = this.normalizeTimestamps(migrated);

      // マイグレーション記録
      if (needsMigration) {
        migrated._migrated = true;
        this.migrationHistory.push({
          type: 'template',
          id: migrated.id,
          timestamp: Date.now(),
          changes: 'property_migration_and_validation'
        });
      }

      return migrated;

    } catch (error) {
      logger.error(`テンプレートマイグレーションエラー ${index}:`, error);
      return null;
    }
  }

  /**
   * プロジェクトデータのマイグレーション
   * @param {Object} project - 元プロジェクト
   * @param {number} index - インデックス
   * @returns {Object|null} マイグレーション後プロジェクト
   */
  migrateProject(project, index = 0) {
    if (!project || typeof project !== 'object' || Array.isArray(project)) {
      logger.warn(`プロジェクト ${index} が無効:`, project);
      return null;
    }

    let migrated = { ...project };
    let needsMigration = false;
    let needsFix = false;

    try {
      // 必須プロパティの検証と修復
      if (!migrated.id) {
        migrated.id = `recovered_project_${Date.now()}_${index}`;
        needsFix = true;
        logger.info(`プロジェクト ${index} にIDを自動生成:`, migrated.id);
      }

      if (!migrated.name || typeof migrated.name !== 'string') {
        migrated.name = `Recovered Project ${index + 1}`;
        needsFix = true;
      }

      // 旧プロパティのマイグレーション
      const legacyMigration = this.migrateLegacyProperties(migrated, 'project');
      if (legacyMigration.migrated) {
        migrated = legacyMigration.data;
        needsMigration = true;
      }

      // loadingScreen構造の検証と修復
      if (!migrated.loadingScreen) {
        migrated.loadingScreen = {
          enabled: true,
          template: 'default'
        };
        needsFix = true;
      } else {
        // loadingScreenの必須プロパティ検証
        if (migrated.loadingScreen.enabled === undefined) {
          migrated.loadingScreen.enabled = true;
          needsFix = true;
        }
        
        if (!migrated.loadingScreen.template) {
          migrated.loadingScreen.template = 'default';
          needsFix = true;
        }
      }

      // 旧プロパティ selectedScreenId を template に移行
      if (migrated.selectedScreenId) {
        if (!migrated.loadingScreen) {
          migrated.loadingScreen = { enabled: true };
        }
        if (!migrated.loadingScreen.template || migrated.loadingScreen.template === 'default') {
          migrated.loadingScreen.template = migrated.selectedScreenId;
          needsMigration = true;
        }
        // selectedScreenIdは常に削除（旧プロパティのため）
        delete migrated.selectedScreenId;
        // selectedScreenIdが存在した場合はマイグレーション実行済みとする
        if (!needsMigration) {
          needsMigration = true;
        }
      }

      // プロパティマイグレーションの適用
      try {
        const propertyMigrated = migrateProjectProperties(migrated);
        if (JSON.stringify(propertyMigrated) !== JSON.stringify(migrated)) {
          migrated = propertyMigrated;
          needsMigration = true;
        }
      } catch (propError) {
        logger.warn('プロジェクトプロパティマイグレーションエラー:', propError);
      }

      // タイムスタンプの正規化
      migrated = this.normalizeTimestamps(migrated);

      // マイグレーション記録
      if (needsMigration) {
        migrated._migrated = true;
      }
      if (needsFix) {
        migrated._fixed = true;
      }

      if (needsMigration || needsFix) {
        this.migrationHistory.push({
          type: 'project',
          id: migrated.id,
          timestamp: Date.now(),
          migrated: needsMigration,
          fixed: needsFix
        });
      }

      return migrated;

    } catch (error) {
      logger.error(`プロジェクトマイグレーションエラー ${index}:`, error);
      return null;
    }
  }

  /**
   * 旧プロパティのマイグレーション
   * @param {Object} data - データ
   * @param {string} type - データタイプ（template/project/common）
   * @returns {Object} マイグレーション結果
   */
  migrateLegacyProperties(data, type) {
    const result = {
      data: { ...data },
      migrated: false
    };

    const migrations = LEGACY_PROPERTY_MIGRATIONS[type] || {};
    const commonMigrations = LEGACY_PROPERTY_MIGRATIONS.common || {};
    const allMigrations = { ...migrations, ...commonMigrations };

    Object.entries(allMigrations).forEach(([oldProp, newProp]) => {
      if (result.data[oldProp] !== undefined && result.data[newProp] === undefined) {
        result.data[newProp] = result.data[oldProp];
        delete result.data[oldProp];
        result.migrated = true;
        
        logger.debug(`プロパティマイグレーション: ${oldProp} → ${newProp}`, {
          type,
          value: result.data[newProp]
        });
      }
    });

    return result;
  }

  /**
   * テンプレート設定の検証と修復
   * @param {Object} settings - 設定オブジェクト
   * @returns {number} 修復されたセクション数
   */
  validateAndFixTemplateSettings(settings) {
    let fixedSections = 0;
    const defaultSettings = DEFAULT_VALUES.template.settings;

    // 各セクションの検証
    ['startScreen', 'loadingScreen', 'guideScreen'].forEach(section => {
      if (!settings[section] || typeof settings[section] !== 'object') {
        settings[section] = JSON.parse(JSON.stringify(defaultSettings[section]));
        fixedSections++;
        logger.debug(`テンプレート設定セクション復元: ${section}`);
      } else {
        // セクション内の必須プロパティ検証
        const defaultSection = defaultSettings[section];
        Object.entries(defaultSection).forEach(([key, value]) => {
          if (settings[section][key] === undefined) {
            settings[section][key] = typeof value === 'object' ? 
              JSON.parse(JSON.stringify(value)) : value;
          }
        });
      }
    });

    return fixedSections;
  }

  /**
   * タイムスタンプの正規化
   * @param {Object} data - データオブジェクト
   * @returns {Object} 正規化されたデータ
   */
  normalizeTimestamps(data) {
    const normalized = { ...data };
    const now = Date.now();

    // created の正規化
    if (!normalized.created) {
      if (normalized.createdAt) {
        normalized.created = this.parseTimestamp(normalized.createdAt) || now;
        delete normalized.createdAt;
      } else if (normalized.createDate) {
        normalized.created = this.parseTimestamp(normalized.createDate) || now;
        delete normalized.createDate;
      } else {
        normalized.created = now;
      }
    }

    // updated の正規化
    if (!normalized.updated) {
      if (normalized.updatedAt) {
        normalized.updated = this.parseTimestamp(normalized.updatedAt) || now;
        delete normalized.updatedAt;
      } else if (normalized.lastModified) {
        normalized.updated = this.parseTimestamp(normalized.lastModified) || now;
        delete normalized.lastModified;
      } else {
        normalized.updated = normalized.created || now;
      }
    }

    return normalized;
  }

  /**
   * タイムスタンプ文字列をパース
   * @param {any} timestamp - タイムスタンプ
   * @returns {number|null} パースされたタイムスタンプ
   */
  parseTimestamp(timestamp) {
    if (typeof timestamp === 'number') {
      return timestamp;
    }
    if (typeof timestamp === 'string') {
      try {
        const parsed = new Date(timestamp).getTime();
        return isNaN(parsed) ? null : parsed;
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  /**
   * デフォルトテンプレート作成
   * @returns {Object} デフォルトテンプレート
   */
  createDefaultTemplate() {
    const template = JSON.parse(JSON.stringify(DEFAULT_VALUES.template));
    template.id = 'default';
    template.name = 'デフォルト';
    template.description = '標準テンプレート';
    template.isDefault = true;
    
    logger.info('デフォルトテンプレート作成');
    return template;
  }

  /**
   * フォールバックテンプレート作成
   * @param {Object} brokenTemplate - 破損したテンプレート
   * @param {number} index - インデックス
   * @returns {Object|null} フォールバックテンプレート
   */
  createFallbackTemplate(brokenTemplate, index) {
    try {
      const fallback = JSON.parse(JSON.stringify(DEFAULT_VALUES.template));
      
      // 回復可能なプロパティを保持
      if (brokenTemplate.name && typeof brokenTemplate.name === 'string') {
        fallback.name = `${brokenTemplate.name} (復元)`;
      } else {
        fallback.name = `Recovered Template ${index + 1}`;
      }
      
      fallback.id = `recovered_${Date.now()}_${index}`;
      fallback.description = '破損データから復元されたテンプレート';
      
      logger.info(`フォールバックテンプレート作成: ${fallback.name}`);
      return fallback;
    } catch (error) {
      logger.error('フォールバックテンプレート作成エラー:', error);
      return null;
    }
  }

  /**
   * マイグレーション履歴取得
   * @returns {Array} マイグレーション履歴
   */
  getMigrationHistory() {
    return [...this.migrationHistory];
  }

  /**
   * エラーログ取得
   * @returns {Array} エラーログ
   */
  getErrorLog() {
    return [...this.errorLog];
  }

  /**
   * 統計情報取得
   * @returns {Object} 統計情報
   */
  getStats() {
    const templateMigrations = this.migrationHistory.filter(h => h.type === 'template').length;
    const projectMigrations = this.migrationHistory.filter(h => h.type === 'project').length;
    
    return {
      totalMigrations: this.migrationHistory.length,
      templateMigrations,
      projectMigrations,
      totalErrors: this.errorLog.length,
      lastMigration: this.migrationHistory.length > 0 ? 
        this.migrationHistory[this.migrationHistory.length - 1].timestamp : null
    };
  }

  /**
   * 安全なJSON解析
   * @param {string} str - 解析するJSON文字列
   * @param {any} fallback - 解析失敗時のフォールバック値
   * @param {Object} options - オプション
   * @param {boolean} options.repair - 簡易修復を試行するかどうか
   * @returns {any} 解析結果またはフォールバック値
   */
  safeJsonParse(str, fallback = null, options = {}) {
    const { repair = false } = options;

    if (!str || typeof str !== 'string') {
      logger.warn('safeJsonParse: 無効な入力文字列', { str, type: typeof str });
      return repair ? {} : fallback;
    }

    try {
      // 通常のJSON解析を試行
      return JSON.parse(str);
    } catch (error) {
      logger.warn('safeJsonParse: JSON解析失敗', { 
        error: error.message, 
        strLength: str.length,
        repair 
      });

      // エラーログに記録
      this.errorLog.push({
        type: 'json_parse_error',
        message: error.message,
        timestamp: Date.now(),
        input: str.substring(0, 100) + (str.length > 100 ? '...' : ''),
        repair
      });

      // 修復を試行する場合
      if (repair) {
        try {
          const repaired = this.repairJsonString(str);
          if (repaired !== str) {
            logger.info('safeJsonParse: JSON修復成功', { 
              originalLength: str.length,
              repairedLength: repaired.length 
            });
            return JSON.parse(repaired);
          }
        } catch (repairError) {
          logger.warn('safeJsonParse: JSON修復失敗', { 
            repairError: repairError.message 
          });
        }
      }

      return fallback;
    }
  }

  /**
   * JSON文字列の簡易修復
   * @param {string} str - 修復するJSON文字列
   * @returns {string} 修復されたJSON文字列
   */
  repairJsonString(str) {
    let repaired = str.trim();

    // 1. 空の文字列の場合は空のオブジェクトに置換
    if (!repaired || repaired.trim() === '') {
      return '{}';
    }

    // 2. 先頭の不正な文字を削除（JSONの開始文字以外）
    const match = repaired.match(/^[^{[]*([{[].*)/);
    if (match) {
      repaired = match[1];
    }

    // 3. 末尾の不正な文字を削除（JSONの終了文字以外）
    const endMatch = repaired.match(/(.*[}\]])[^}\]]*$/);
    if (endMatch) {
      repaired = endMatch[1];
    }

    // 4. 空になった場合は空のオブジェクトに置換
    if (!repaired || repaired.trim() === '') {
      return '{}';
    }

    // 5. 不完全な配列を修復
    if (repaired.startsWith('[') && !repaired.endsWith(']')) {
      repaired += ']';
    }

    // 6. 不完全なオブジェクトを修復
    if (repaired.startsWith('{') && !repaired.endsWith('}')) {
      repaired += '}';
    }

    // 7. 末尾のカンマを削除（修復後に実行）
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

    // 8. 不正な文字列エスケープを修復
    repaired = repaired.replace(/\\"/g, '\\"');
    repaired = repaired.replace(/\\n/g, '\\n');
    repaired = repaired.replace(/\\t/g, '\\t');
    repaired = repaired.replace(/\\r/g, '\\r');

    return repaired;
  }

  /**
   * ヘルパーのリセット
   */
  reset() {
    this.migrationHistory = [];
    this.errorLog = [];
  }
}

// シングルトンインスタンス
const dataMigrationHelper = new DataMigrationHelper();

export { DataMigrationHelper };
export default dataMigrationHelper;
