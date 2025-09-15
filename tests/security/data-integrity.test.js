// tests/security/data-integrity.test.js
// データ整合性管理システムのテスト

import { describe, it, expect, beforeEach } from 'vitest';
import { dataIntegrityManager } from '../../src/utils/data-integrity-manager.js';

describe('DataIntegrityManager', () => {
  let manager;

  beforeEach(() => {
    manager = new DataIntegrityManager();
  });

  describe('スキーマ登録', () => {
    it('スキーマが正しく登録される', () => {
      const schema = {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      };
      
      manager.registerSchema('test', schema);
      expect(manager.schemas.has('test')).toBe(true);
    });
  });

  describe('データ整合性チェック', () => {
    beforeEach(() => {
      // テスト用スキーマを登録
      manager.registerSchema('test', {
        type: 'object',
        required: ['id', 'name', 'value'],
        properties: {
          id: { type: 'string', minLength: 1, maxLength: 100 },
          name: { type: 'string', minLength: 1, maxLength: 200 },
          value: { type: 'number', minimum: 0, maximum: 1000 },
          optional: { type: 'string', maxLength: 50 }
        }
      });
    });

    it('有効なデータが正しく検証される', () => {
      const validData = {
        id: 'test-1',
        name: 'Test Item',
        value: 100,
        optional: 'optional value'
      };
      
      const result = manager.checkIntegrity('test', validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('必須フィールドの不足が検出される', () => {
      const invalidData = {
        id: 'test-1'
        // name と value が不足
      };
      
      const result = manager.checkIntegrity('test', invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('必須フィールドが不足しています: name');
      expect(result.errors).toContain('必須フィールドが不足しています: value');
    });

    it('型の不一致が検出される', () => {
      const invalidData = {
        id: 'test-1',
        name: 'Test Item',
        value: 'not-a-number' // 数値である必要がある
      };
      
      const result = manager.checkIntegrity('test', invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('valueはnumber型である必要があります（実際: string）');
    });

    it('文字列の長さ制限が検出される', () => {
      const invalidData = {
        id: 'test-1',
        name: 'a'.repeat(201), // 最大200文字
        value: 100
      };
      
      const result = manager.checkIntegrity('test', invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('nameは最大200文字までです');
    });

    it('数値の範囲制限が検出される', () => {
      const invalidData = {
        id: 'test-1',
        name: 'Test Item',
        value: 1500 // 最大1000
      };
      
      const result = manager.checkIntegrity('test', invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('valueは1000以下である必要があります');
    });
  });

  describe('データ修復', () => {
    beforeEach(() => {
      manager.registerSchema('test', {
        type: 'object',
        required: ['id', 'name', 'value'],
        properties: {
          id: { type: 'string', minLength: 1, maxLength: 100 },
          name: { type: 'string', minLength: 1, maxLength: 200 },
          value: { type: 'number', minimum: 0, maximum: 1000 },
          optional: { type: 'string', maxLength: 50 }
        }
      });
    });

    it('必須フィールドが追加される', () => {
      const incompleteData = {
        id: 'test-1'
        // name と value が不足
      };
      
      const result = manager.repairData('test', incompleteData);
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('');
      expect(result.data.value).toBe(0);
      expect(result.actions).toContain('必須フィールドを追加: name');
      expect(result.actions).toContain('必須フィールドを追加: value');
    });

    it('型の変換が行われる', () => {
      const invalidData = {
        id: 'test-1',
        name: 'Test Item',
        value: '100' // 文字列だが数値に変換可能
      };
      
      const result = manager.repairData('test', invalidData);
      expect(result.success).toBe(true);
      expect(typeof result.data.value).toBe('number');
      expect(result.data.value).toBe(100);
    });

    it('文字列の長さが調整される', () => {
      const invalidData = {
        id: 'test-1',
        name: 'a'.repeat(250), // 最大200文字を超過
        value: 100
      };
      
      const result = manager.repairData('test', invalidData);
      expect(result.success).toBe(true);
      expect(result.data.name.length).toBe(200);
    });

    it('数値の範囲が調整される', () => {
      const invalidData = {
        id: 'test-1',
        name: 'Test Item',
        value: 1500 // 最大1000を超過
      };
      
      const result = manager.repairData('test', invalidData);
      expect(result.success).toBe(true);
      expect(result.data.value).toBe(1000);
    });
  });

  describe('バックアップ機能', () => {
    it('バックアップが正しく作成される', () => {
      const testData = { id: 'test-1', name: 'Test Item' };
      
      manager.createBackup('test-key', testData);
      const backups = manager.backups.get('test-key');
      
      expect(backups).toHaveLength(1);
      expect(backups[0].data).toEqual(testData);
      expect(backups[0].timestamp).toBeTypeOf('number');
    });

    it('最大バックアップ数が制限される', () => {
      const testData = { id: 'test-1', name: 'Test Item' };
      
      // 6個のバックアップを作成（最大5個）
      for (let i = 0; i < 6; i++) {
        manager.createBackup('test-key', { ...testData, id: `test-${i}` });
      }
      
      const backups = manager.backups.get('test-key');
      expect(backups).toHaveLength(5);
      expect(backups[0].data.id).toBe('test-1'); // 最初のバックアップが残る
    });

    it('バックアップが正しく復元される', () => {
      const testData = { id: 'test-1', name: 'Test Item' };
      
      manager.createBackup('test-key', testData);
      const result = manager.restoreBackup('test-key');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
    });

    it('存在しないバックアップの復元が失敗する', () => {
      const result = manager.restoreBackup('non-existent-key');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('バックアップが見つかりません');
    });
  });

  describe('チェックサム計算', () => {
    it('同じデータのチェックサムが一致する', () => {
      const data = { id: 'test-1', name: 'Test Item' };
      const checksum1 = manager.calculateChecksum(data);
      const checksum2 = manager.calculateChecksum(data);
      
      expect(checksum1).toBe(checksum2);
    });

    it('異なるデータのチェックサムが異なる', () => {
      const data1 = { id: 'test-1', name: 'Test Item' };
      const data2 = { id: 'test-2', name: 'Test Item' };
      
      const checksum1 = manager.calculateChecksum(data1);
      const checksum2 = manager.calculateChecksum(data2);
      
      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe('監視機能', () => {
    it('データの変更が検出される', (done) => {
      const testData = { id: 'test-1', name: 'Test Item' };
      let changeDetected = false;
      
      // 監視を開始
      const monitorId = manager.startMonitoring('test-key', testData, 100);
      
      // データを変更
      setTimeout(() => {
        testData.name = 'Modified Item';
      }, 50);
      
      // 変更が検出されるまで待機
      setTimeout(() => {
        manager.stopMonitoring(monitorId);
        expect(changeDetected).toBe(true);
        done();
      }, 200);
    });
  });

  describe('レポート生成', () => {
    it('整合性レポートが正しく生成される', () => {
      // テストデータを設定
      manager.registerSchema('test', { type: 'object' });
      manager.createBackup('test-key', { id: 'test-1' });
      
      const report = manager.generateReport();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('version');
      expect(report.schemas).toContain('test');
      expect(report.backups).toHaveProperty('test-key');
    });
  });
});
