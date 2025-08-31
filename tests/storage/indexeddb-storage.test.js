// tests/storage/indexeddb-storage.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  saveModelToIDB, 
  loadModelBlob, 
  loadModelMeta, 
  removeModel,
  getStorageInfo,
  clearAllModels,
  MODEL_KEY_PREFIX 
} from '../../src/storage/indexeddb-storage.js';
import { testLogger } from '../../src/utils/logger.js';
import { createMockFile, createMockBlob, resetMocks } from '../setup.js';

// idb-keyvalのモック
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn()
}));

import { get, set, del, keys } from 'idb-keyval';

describe('IndexedDB Storage', () => {
  beforeEach(() => {
    resetMocks();
    testLogger.clearLogs();
    vi.clearAllMocks();
  });

  describe('saveModelToIDB', () => {
    it('should save model data successfully', async () => {
      const modelId = 'test-model-123';
      const mockData = createMockFile('test.glb', 'mock-model-data');
      const meta = { fileName: 'test.glb', fileSize: 1024 };

      set.mockResolvedValue(undefined);

      const result = await saveModelToIDB(modelId, mockData, meta);

      expect(result).toBe(modelId);
      expect(set).toHaveBeenCalledTimes(2);
      expect(set).toHaveBeenCalledWith(`${MODEL_KEY_PREFIX}${modelId}`, expect.any(Blob));
      expect(set).toHaveBeenCalledWith(`meta:${modelId}`, expect.objectContaining({
        modelId,
        fileName: 'test.glb',
        fileSize: 1024,
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number)
      }));
    });

    it('should handle ArrayBuffer data', async () => {
      const modelId = 'test-model-arraybuffer';
      const arrayBuffer = new ArrayBuffer(8);
      const meta = { fileName: 'test.glb' };

      set.mockResolvedValue(undefined);

      const result = await saveModelToIDB(modelId, arrayBuffer, meta);

      expect(result).toBe(modelId);
      expect(set).toHaveBeenCalledWith(`${MODEL_KEY_PREFIX}${modelId}`, expect.any(Blob));
    });

    it('should throw error on save failure', async () => {
      const modelId = 'test-model-error';
      const mockData = createMockFile('test.glb', 'mock-data');
      
      set.mockRejectedValue(new Error('IndexedDB error'));

      await expect(saveModelToIDB(modelId, mockData)).rejects.toThrow('モデルの保存に失敗しました');
    });
  });

  describe('loadModelBlob', () => {
    it('should load model blob successfully', async () => {
      const modelId = 'test-model-load';
      const mockBlob = createMockBlob('mock-model-data');
      
      get.mockResolvedValue(mockBlob);

      const result = await loadModelBlob(modelId);

      expect(result).toBe(mockBlob);
      expect(get).toHaveBeenCalledWith(`${MODEL_KEY_PREFIX}${modelId}`);
    });

    it('should return null when model not found', async () => {
      const modelId = 'non-existent-model';
      
      get.mockResolvedValue(null);

      const result = await loadModelBlob(modelId);

      expect(result).toBeNull();
      expect(get).toHaveBeenCalledWith(`${MODEL_KEY_PREFIX}${modelId}`);
    });

    it('should throw error on load failure', async () => {
      const modelId = 'test-model-load-error';
      
      get.mockRejectedValue(new Error('IndexedDB error'));

      await expect(loadModelBlob(modelId)).rejects.toThrow('モデルの取得に失敗しました');
    });
  });

  describe('loadModelMeta', () => {
    it('should load model metadata successfully', async () => {
      const modelId = 'test-model-meta';
      const mockMeta = {
        modelId,
        fileName: 'test.glb',
        fileSize: 1024,
        createdAt: Date.now()
      };
      
      get.mockResolvedValue(mockMeta);

      const result = await loadModelMeta(modelId);

      expect(result).toEqual(mockMeta);
      expect(get).toHaveBeenCalledWith(`meta:${modelId}`);
    });

    it('should return null when metadata not found', async () => {
      const modelId = 'non-existent-meta';
      
      get.mockResolvedValue(null);

      const result = await loadModelMeta(modelId);

      expect(result).toBeNull();
    });
  });

  describe('removeModel', () => {
    it('should remove model and metadata successfully', async () => {
      const modelId = 'test-model-remove';
      
      del.mockResolvedValue(undefined);

      await removeModel(modelId);

      expect(del).toHaveBeenCalledTimes(2);
      expect(del).toHaveBeenCalledWith(`${MODEL_KEY_PREFIX}${modelId}`);
      expect(del).toHaveBeenCalledWith(`meta:${modelId}`);
    });

    it('should handle removal errors gracefully', async () => {
      const modelId = 'test-model-remove-error';
      
      del.mockRejectedValue(new Error('IndexedDB error'));

      await expect(removeModel(modelId)).rejects.toThrow('モデルの削除に失敗しました');
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage information', async () => {
      const mockKeys = [
        `${MODEL_KEY_PREFIX}model1`,
        `${MODEL_KEY_PREFIX}model2`,
        'meta:model1',
        'meta:model2',
        'other:key'
      ];
      
      keys.mockResolvedValue(mockKeys);

      const result = await getStorageInfo();

      expect(result).toEqual({
        modelCount: 2,
        totalSize: 0,
        totalSizeKB: 0,
        totalSizeMB: 0,
        modelSizes: {}
      });
    });

    it('should handle empty storage', async () => {
      keys.mockResolvedValue([]);

      const result = await getStorageInfo();

      expect(result).toEqual({
        modelCount: 0,
        totalSize: 0,
        totalSizeKB: 0,
        totalSizeMB: 0,
        modelSizes: {}
      });
    });
  });

  describe('clearAllModels', () => {
    it('should clear all models and metadata', async () => {
      const mockKeys = [
        `${MODEL_KEY_PREFIX}model1`,
        `${MODEL_KEY_PREFIX}model2`,
        'meta:model1',
        'meta:model2'
      ];
      
      keys.mockResolvedValue(mockKeys);
      del.mockResolvedValue(undefined);

      await clearAllModels();

      expect(del).toHaveBeenCalledTimes(4);
      expect(del).toHaveBeenCalledWith(`${MODEL_KEY_PREFIX}model1`);
      expect(del).toHaveBeenCalledWith(`${MODEL_KEY_PREFIX}model2`);
      expect(del).toHaveBeenCalledWith('meta:model1');
      expect(del).toHaveBeenCalledWith('meta:model2');
    });
  });

  describe('Logger Integration', () => {
    it('should log operations using testLogger', async () => {
      const modelId = 'test-model-logging';
      const mockData = createMockFile('test.glb', 'mock-data');
      
      set.mockResolvedValue(undefined);

      await saveModelToIDB(modelId, mockData);

      const logs = testLogger.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      
      const successLogs = testLogger.getLogs('SUCCESS');
      expect(successLogs.length).toBeGreaterThan(0);
      expect(successLogs[0].message).toContain('IndexedDB モデル保存完了');
    });
  });
});
