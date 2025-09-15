// src/utils/data-integrity-manager.js
// データ整合性管理システム

import { logger, LOG_LEVELS, LOG_CATEGORIES } from './unified-logger.js';
import { security } from './security-manager.js';

/**
 * データ整合性管理クラス
 */
class DataIntegrityManager {
  constructor() {
    this.schemas = new Map();
    this.validators = new Map();
    this.backups = new Map();
    this.version = '1.0.0';
    this.checksums = new Map();
  }

  /**
   * データスキーマを登録
   * @param {string} type - データタイプ
   * @param {Object} schema - スキーマ定義
   */
  registerSchema(type, schema) {
    this.schemas.set(type, schema);
    logger.debug(`データスキーマを登録しました: ${type}`, { schema });
  }

  /**
   * バリデーターを登録
   * @param {string} type - データタイプ
   * @param {Function} validator - バリデーター関数
   */
  registerValidator(type, validator) {
    this.validators.set(type, validator);
    logger.debug(`バリデーターを登録しました: ${type}`);
  }

  /**
   * データの整合性をチェック
   * @param {string} type - データタイプ
   * @param {any} data - チェックするデータ
   * @returns {Object} チェック結果
   */
  checkIntegrity(type, data) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      repaired: false,
      repairedData: null
    };

    try {
      // スキーマチェック
      const schema = this.schemas.get(type);
      if (schema) {
        const schemaResult = this.validateSchema(data, schema);
        if (!schemaResult.isValid) {
          result.isValid = false;
          result.errors.push(...schemaResult.errors);
        }
        result.warnings.push(...schemaResult.warnings);
      }

      // カスタムバリデーター
      const validator = this.validators.get(type);
      if (validator) {
        const validatorResult = validator(data);
        if (!validatorResult.isValid) {
          result.isValid = false;
          result.errors.push(...validatorResult.errors);
        }
        result.warnings.push(...validatorResult.warnings);
      }

      // データ修復を試行
      if (!result.isValid) {
        const repairResult = this.repairData(type, data);
        if (repairResult.success) {
          result.repaired = true;
          result.repairedData = repairResult.data;
          result.isValid = true;
          logger.info(`データを修復しました: ${type}`, { 
            originalErrors: result.errors,
            repairActions: repairResult.actions
          });
        }
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`整合性チェック中にエラーが発生しました: ${error.message}`);
      logger.error('データ整合性チェックエラー', { type, error: error.message });
    }

    return result;
  }

  /**
   * スキーマに基づいてデータを検証
   * @param {any} data - 検証するデータ
   * @param {Object} schema - スキーマ定義
   * @returns {Object} 検証結果
   */
  validateSchema(data, schema) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (typeof data !== 'object' || data === null) {
      result.isValid = false;
      result.errors.push('データはオブジェクトである必要があります');
      return result;
    }

    // 必須フィールドのチェック
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          result.isValid = false;
          result.errors.push(`必須フィールドが不足しています: ${field}`);
        }
      }
    }

    // フィールドの型チェック
    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        if (field in data) {
          const fieldResult = this.validateField(data[field], fieldSchema, field);
          if (!fieldResult.isValid) {
            result.isValid = false;
            result.errors.push(...fieldResult.errors);
          }
          result.warnings.push(...fieldResult.warnings);
        }
      }
    }

    return result;
  }

  /**
   * フィールドを検証
   * @param {any} value - 検証する値
   * @param {Object} fieldSchema - フィールドスキーマ
   * @param {string} fieldName - フィールド名
   * @returns {Object} 検証結果
   */
  validateField(value, fieldSchema, fieldName) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 型チェック
    if (fieldSchema.type) {
      const expectedType = fieldSchema.type;
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      
      if (expectedType !== actualType) {
        result.isValid = false;
        result.errors.push(`${fieldName}は${expectedType}型である必要があります（実際: ${actualType}）`);
      }
    }

    // 文字列の長さチェック
    if (fieldSchema.type === 'string') {
      if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
        result.isValid = false;
        result.errors.push(`${fieldName}は最低${fieldSchema.minLength}文字である必要があります`);
      }
      if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
        result.isValid = false;
        result.errors.push(`${fieldName}は最大${fieldSchema.maxLength}文字までです`);
      }
      if (fieldSchema.pattern && !fieldSchema.pattern.test(value)) {
        result.isValid = false;
        result.errors.push(`${fieldName}の形式が正しくありません`);
      }
    }

    // 数値の範囲チェック
    if (fieldSchema.type === 'number') {
      if (fieldSchema.minimum !== undefined && value < fieldSchema.minimum) {
        result.isValid = false;
        result.errors.push(`${fieldName}は${fieldSchema.minimum}以上である必要があります`);
      }
      if (fieldSchema.maximum !== undefined && value > fieldSchema.maximum) {
        result.isValid = false;
        result.errors.push(`${fieldName}は${fieldSchema.maximum}以下である必要があります`);
      }
    }

    // 配列の長さチェック
    if (fieldSchema.type === 'array') {
      if (fieldSchema.minItems && value.length < fieldSchema.minItems) {
        result.isValid = false;
        result.errors.push(`${fieldName}は最低${fieldSchema.minItems}個の要素が必要です`);
      }
      if (fieldSchema.maxItems && value.length > fieldSchema.maxItems) {
        result.isValid = false;
        result.errors.push(`${fieldName}は最大${fieldSchema.maxItems}個の要素までです`);
      }
    }

    // 列挙値チェック
    if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
      result.isValid = false;
      result.errors.push(`${fieldName}は以下の値のいずれかである必要があります: ${fieldSchema.enum.join(', ')}`);
    }

    return result;
  }

  /**
   * データを修復
   * @param {string} type - データタイプ
   * @param {any} data - 修復するデータ
   * @returns {Object} 修復結果
   */
  repairData(type, data) {
    const result = {
      success: false,
      data: null,
      actions: []
    };

    try {
      let repairedData = { ...data };
      const schema = this.schemas.get(type);

      if (!schema) {
        logger.warn(`修復用のスキーマが見つかりません: ${type}`);
        return result;
      }

      // 必須フィールドの追加
      if (schema.required) {
        for (const field of schema.required) {
          if (!(field in repairedData)) {
            repairedData[field] = this.getDefaultValue(field, schema.properties?.[field]);
            result.actions.push(`必須フィールドを追加: ${field}`);
          }
        }
      }

      // フィールドの修復
      if (schema.properties) {
        for (const [field, fieldSchema] of Object.entries(schema.properties)) {
          if (field in repairedData) {
            const fieldResult = this.repairField(repairedData[field], fieldSchema, field);
            if (fieldResult.repaired) {
              repairedData[field] = fieldResult.value;
              result.actions.push(`フィールドを修復: ${field}`);
            }
          }
        }
      }

      // データのサニタイズ
      repairedData = security.sanitizeData(repairedData);

      result.success = true;
      result.data = repairedData;

    } catch (error) {
      logger.error('データ修復中にエラーが発生しました', { type, error: error.message });
    }

    return result;
  }

  /**
   * フィールドを修復
   * @param {any} value - 修復する値
   * @param {Object} fieldSchema - フィールドスキーマ
   * @param {string} fieldName - フィールド名
   * @returns {Object} 修復結果
   */
  repairField(value, fieldSchema, fieldName) {
    const result = {
      repaired: false,
      value: value
    };

    try {
      // 型の修復
      if (fieldSchema.type) {
        const expectedType = fieldSchema.type;
        const actualType = Array.isArray(value) ? 'array' : typeof value;

        if (expectedType !== actualType) {
          switch (expectedType) {
            case 'string':
              result.value = String(value);
              result.repaired = true;
              break;
            case 'number':
              const num = Number(value);
              if (!isNaN(num)) {
                result.value = num;
                result.repaired = true;
              }
              break;
            case 'boolean':
              result.value = Boolean(value);
              result.repaired = true;
              break;
            case 'array':
              if (!Array.isArray(value)) {
                result.value = [value];
                result.repaired = true;
              }
              break;
          }
        }
      }

      // 文字列の修復
      if (fieldSchema.type === 'string' && typeof result.value === 'string') {
        // 長さの調整
        if (fieldSchema.maxLength && result.value.length > fieldSchema.maxLength) {
          result.value = result.value.substring(0, fieldSchema.maxLength);
          result.repaired = true;
        }
        if (fieldSchema.minLength && result.value.length < fieldSchema.minLength) {
          result.value = result.value.padEnd(fieldSchema.minLength, ' ');
          result.repaired = true;
        }
      }

      // 数値の修復
      if (fieldSchema.type === 'number' && typeof result.value === 'number') {
        if (fieldSchema.minimum !== undefined && result.value < fieldSchema.minimum) {
          result.value = fieldSchema.minimum;
          result.repaired = true;
        }
        if (fieldSchema.maximum !== undefined && result.value > fieldSchema.maximum) {
          result.value = fieldSchema.maximum;
          result.repaired = true;
        }
      }

      // 配列の修復
      if (fieldSchema.type === 'array' && Array.isArray(result.value)) {
        if (fieldSchema.maxItems && result.value.length > fieldSchema.maxItems) {
          result.value = result.value.slice(0, fieldSchema.maxItems);
          result.repaired = true;
        }
        if (fieldSchema.minItems && result.value.length < fieldSchema.minItems) {
          const defaultItem = this.getDefaultValue(fieldName, fieldSchema.items);
          while (result.value.length < fieldSchema.minItems) {
            result.value.push(defaultItem);
          }
          result.repaired = true;
        }
      }

    } catch (error) {
      logger.error('フィールド修復中にエラーが発生しました', { fieldName, error: error.message });
    }

    return result;
  }

  /**
   * デフォルト値を取得
   * @param {string} fieldName - フィールド名
   * @param {Object} fieldSchema - フィールドスキーマ
   * @returns {any} デフォルト値
   */
  getDefaultValue(fieldName, fieldSchema) {
    if (fieldSchema?.default !== undefined) {
      return fieldSchema.default;
    }

    if (fieldSchema?.type) {
      switch (fieldSchema.type) {
        case 'string':
          return '';
        case 'number':
          return 0;
        case 'boolean':
          return false;
        case 'array':
          return [];
        case 'object':
          return {};
        default:
          return null;
      }
    }

    return null;
  }

  /**
   * データのバックアップを作成
   * @param {string} key - バックアップキー
   * @param {any} data - バックアップするデータ
   * @param {Object} options - オプション
   */
  createBackup(key, data, options = {}) {
    const {
      maxBackups = 5,
      compress = false
    } = options;

    try {
      const backup = {
        data: compress ? this.compressData(data) : data,
        timestamp: Date.now(),
        version: this.version,
        checksum: this.calculateChecksum(data),
        compressed: compress
      };

      if (!this.backups.has(key)) {
        this.backups.set(key, []);
      }

      const backups = this.backups.get(key);
      backups.push(backup);

      // 最大バックアップ数を超えた場合は古いものを削除
      if (backups.length > maxBackups) {
        backups.shift();
      }

      logger.debug(`データのバックアップを作成しました: ${key}`, { 
        backupCount: backups.length,
        compressed: compress
      });

    } catch (error) {
      logger.error('バックアップ作成中にエラーが発生しました', { key, error: error.message });
    }
  }

  /**
   * データを復元
   * @param {string} key - バックアップキー
   * @param {number} index - 復元するバックアップのインデックス（-1で最新）
   * @returns {Object} 復元結果
   */
  restoreBackup(key, index = -1) {
    const result = {
      success: false,
      data: null,
      error: null
    };

    try {
      const backups = this.backups.get(key);
      if (!backups || backups.length === 0) {
        result.error = 'バックアップが見つかりません';
        return result;
      }

      const targetIndex = index === -1 ? backups.length - 1 : index;
      if (targetIndex < 0 || targetIndex >= backups.length) {
        result.error = '無効なバックアップインデックスです';
        return result;
      }

      const backup = backups[targetIndex];
      result.data = backup.compressed ? this.decompressData(backup.data) : backup.data;
      result.success = true;

      logger.info(`データを復元しました: ${key}`, { 
        backupIndex: targetIndex,
        timestamp: backup.timestamp
      });

    } catch (error) {
      result.error = error.message;
      logger.error('バックアップ復元中にエラーが発生しました', { key, error: error.message });
    }

    return result;
  }

  /**
   * チェックサムを計算
   * @param {any} data - データ
   * @returns {string} チェックサム
   */
  calculateChecksum(data) {
    const jsonString = JSON.stringify(data, null, 0);
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return hash.toString(16);
  }

  /**
   * データを圧縮（簡易版）
   * @param {any} data - 圧縮するデータ
   * @returns {string} 圧縮されたデータ
   */
  compressData(data) {
    // 簡易的な圧縮（実際の実装ではLZ4やGzipを使用）
    return JSON.stringify(data);
  }

  /**
   * データを展開
   * @param {string} compressedData - 圧縮されたデータ
   * @returns {any} 展開されたデータ
   */
  decompressData(compressedData) {
    return JSON.parse(compressedData);
  }

  /**
   * データの整合性を監視
   * @param {string} key - 監視キー
   * @param {any} data - 監視するデータ
   * @param {number} interval - 監視間隔（ミリ秒）
   */
  startMonitoring(key, data, interval = 60000) {
    const monitor = setInterval(() => {
      const checksum = this.calculateChecksum(data);
      const lastChecksum = this.checksums.get(key);
      
      if (lastChecksum && lastChecksum !== checksum) {
        logger.warn('データの整合性が変更されました', { key, lastChecksum, newChecksum: checksum });
      }
      
      this.checksums.set(key, checksum);
    }, interval);

    return monitor;
  }

  /**
   * 監視を停止
   * @param {number} monitorId - 監視ID
   */
  stopMonitoring(monitorId) {
    clearInterval(monitorId);
  }

  /**
   * データ整合性レポートを生成
   * @returns {Object} レポート
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      version: this.version,
      schemas: Array.from(this.schemas.keys()),
      validators: Array.from(this.validators.keys()),
      backups: {},
      checksums: Object.fromEntries(this.checksums)
    };

    // バックアップ情報
    for (const [key, backups] of this.backups.entries()) {
      report.backups[key] = {
        count: backups.length,
        latest: backups[backups.length - 1]?.timestamp,
        oldest: backups[0]?.timestamp
      };
    }

    return report;
  }
}

/**
 * グローバルデータ整合性管理インスタンス
 */
export const dataIntegrityManager = new DataIntegrityManager();

/**
 * デフォルトスキーマを登録
 */
dataIntegrityManager.registerSchema('project', {
  type: 'object',
  required: ['id', 'name', 'type', 'created', 'updated'],
  properties: {
    id: { type: 'string', minLength: 1, maxLength: 100 },
    name: { type: 'string', minLength: 1, maxLength: 200 },
    type: { type: 'string', enum: ['marker', 'markerless'] },
    created: { type: 'number', minimum: 0 },
    updated: { type: 'number', minimum: 0 },
    models: { type: 'array', maxItems: 50 },
    loadingScreen: { type: 'object' },
    startScreen: { type: 'object' },
    guideScreen: { type: 'object' }
  }
});

dataIntegrityManager.registerSchema('template', {
  type: 'object',
  required: ['id', 'name', 'created', 'updated', 'settings'],
  properties: {
    id: { type: 'string', minLength: 1, maxLength: 100 },
    name: { type: 'string', minLength: 1, maxLength: 200 },
    created: { type: 'number', minimum: 0 },
    updated: { type: 'number', minimum: 0 },
    settings: { type: 'object' }
  }
});

export default dataIntegrityManager;
