/**
 * safeJsonParseメソッドのテスト
 * JSONエラー修復機能をテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataMigrationHelper } from '../../src/utils/data-migration-helper.js';
import { resetMocks } from '../setup.js';

describe('DataMigrationHelper - safeJsonParseテスト', () => {
  let migrationHelper;

  beforeEach(() => {
    resetMocks();
    migrationHelper = new DataMigrationHelper();
  });

  describe('基本的なJSON解析', () => {
    it('有効なJSON文字列を正しく解析する', () => {
      const validJson = '{"name": "test", "value": 123}';
      const result = migrationHelper.safeJsonParse(validJson);
      
      expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('有効な配列JSONを正しく解析する', () => {
      const validArray = '[1, 2, 3, "test"]';
      const result = migrationHelper.safeJsonParse(validArray);
      
      expect(result).toEqual([1, 2, 3, 'test']);
    });

    it('無効なJSON文字列はフォールバック値を返す', () => {
      const invalidJson = '{invalid: json}';
      const fallback = { error: true };
      const result = migrationHelper.safeJsonParse(invalidJson, fallback);
      
      expect(result).toBe(fallback);
    });

    it('空文字列はフォールバック値を返す', () => {
      const emptyString = '';
      const fallback = null;
      const result = migrationHelper.safeJsonParse(emptyString, fallback);
      
      expect(result).toBe(fallback);
    });

    it('nullやundefinedはフォールバック値を返す', () => {
      const fallback = 'default';
      
      expect(migrationHelper.safeJsonParse(null, fallback)).toBe(fallback);
      expect(migrationHelper.safeJsonParse(undefined, fallback)).toBe(fallback);
    });
  });

  describe('JSON修復機能', () => {
    it('末尾カンマを修復する', () => {
      const jsonWithTrailingComma = '{"name": "test", "value": 123,}';
      const result = migrationHelper.safeJsonParse(jsonWithTrailingComma, null, { repair: true });
      
      expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('配列の末尾カンマを修復する', () => {
      const arrayWithTrailingComma = '[1, 2, 3,]';
      const result = migrationHelper.safeJsonParse(arrayWithTrailingComma, null, { repair: true });
      
      expect(result).toEqual([1, 2, 3]);
    });

    it('不完全なオブジェクトを修復する', () => {
      const incompleteObject = '{"name": "test"';
      const result = migrationHelper.safeJsonParse(incompleteObject, null, { repair: true });
      
      expect(result).toEqual({ name: 'test' });
    });

    it('不完全な配列を修復する', () => {
      const incompleteArray = '[1, 2, 3';
      const result = migrationHelper.safeJsonParse(incompleteArray, null, { repair: true });
      
      expect(result).toEqual([1, 2, 3]);
    });

    it('先頭の不正な文字を削除する', () => {
      const jsonWithPrefix = 'invalid{"name": "test"}';
      const result = migrationHelper.safeJsonParse(jsonWithPrefix, null, { repair: true });
      
      expect(result).toEqual({ name: 'test' });
    });

    it('末尾の不正な文字を削除する', () => {
      const jsonWithSuffix = '{"name": "test"}invalid';
      const result = migrationHelper.safeJsonParse(jsonWithSuffix, null, { repair: true });
      
      expect(result).toEqual({ name: 'test' });
    });

    it('空文字列を空のオブジェクトに修復する', () => {
      const emptyString = '';
      const result = migrationHelper.safeJsonParse(emptyString, null, { repair: true });
      
      expect(result).toEqual({});
    });

    it('修復不可能なJSONはフォールバック値を返す', () => {
      const unfixableJson = 'completely invalid';
      const fallback = { error: true };
      const result = migrationHelper.safeJsonParse(unfixableJson, fallback, { repair: true });
      
      expect(result).toBe(fallback);
    });
  });

  describe('エラーログ機能', () => {
    it('JSON解析エラーがログに記録される', () => {
      const invalidJson = '{invalid: json}';
      migrationHelper.safeJsonParse(invalidJson, null);
      
      const errorLog = migrationHelper.getErrorLog();
      expect(errorLog).toHaveLength(1);
      expect(errorLog[0].type).toBe('json_parse_error');
      expect(errorLog[0].message).toContain('Expected property name');
    });

    it('修復試行時もエラーログに記録される', () => {
      const invalidJson = '{invalid: json}';
      migrationHelper.safeJsonParse(invalidJson, null, { repair: true });
      
      const errorLog = migrationHelper.getErrorLog();
      expect(errorLog).toHaveLength(1);
      expect(errorLog[0].repair).toBe(true);
    });
  });

  describe('実際の使用例', () => {
    it('破損したテンプレートデータを修復する', () => {
      const corruptedTemplates = '[{"id": "template1", "name": "Test",}, {"id": "template2"';
      const result = migrationHelper.safeJsonParse(corruptedTemplates, [], { repair: true });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('破損したプロジェクトデータを修復する', () => {
      const corruptedProjects = '{"projects": [{"id": "project1", "name": "Test",}]}';
      const result = migrationHelper.safeJsonParse(corruptedProjects, {}, { repair: true });
      
      expect(result).toHaveProperty('projects');
      expect(Array.isArray(result.projects)).toBe(true);
    });

    it('完全に破損したデータはフォールバックを使用する', () => {
      const completelyCorrupted = 'this is not json at all';
      const fallback = { templates: [], projects: [] };
      const result = migrationHelper.safeJsonParse(completelyCorrupted, fallback, { repair: true });
      
      expect(result).toBe(fallback);
    });
  });

  describe('repairJsonStringメソッドの単体テスト', () => {
    it('末尾カンマを正しく削除する', () => {
      const input = '{"a": 1, "b": 2,}';
      const result = migrationHelper.repairJsonString(input);
      expect(result).toBe('{"a": 1, "b": 2}');
    });

    it('複数の末尾カンマを削除する', () => {
      const input = '[1, 2, 3,], {"a": 1,}';
      const result = migrationHelper.repairJsonString(input);
      expect(result).toBe('[1, 2, 3], {"a": 1}]');
    });

    it('先頭の不正な文字を削除する', () => {
      const input = 'invalid{"a": 1}';
      const result = migrationHelper.repairJsonString(input);
      expect(result).toBe('{"a": 1}');
    });

    it('末尾の不正な文字を削除する', () => {
      const input = '{"a": 1}invalid';
      const result = migrationHelper.repairJsonString(input);
      expect(result).toBe('{"a": 1}');
    });

    it('空文字列を空のオブジェクトに変換する', () => {
      const input = '';
      const result = migrationHelper.repairJsonString(input);
      expect(result).toBe('{}');
    });

    it('不完全なオブジェクトを修復する', () => {
      const input = '{"a": 1';
      const result = migrationHelper.repairJsonString(input);
      expect(result).toBe('{"a": 1}');
    });

    it('不完全な配列を修復する', () => {
      const input = '[1, 2, 3';
      const result = migrationHelper.repairJsonString(input);
      expect(result).toBe('[1, 2, 3]');
    });
  });
});
