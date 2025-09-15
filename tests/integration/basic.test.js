/**
 * 基本テスト - テスト環境の動作確認
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resetMocks } from '../setup.js';

describe('基本テスト環境', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('テスト環境の確認', () => {
    it('基本的なテストが動作する', () => {
      expect(1 + 1).toBe(2);
    });

    it('モック関数が動作する', () => {
      const mockFn = vi.fn();
      mockFn('test');
      expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('LocalStorageモックが動作する', () => {
      global.localStorage.setItem('test', 'value');
      expect(global.localStorage.setItem).toHaveBeenCalledWith('test', 'value');
    });

    it('非同期テストが動作する', async () => {
      const promise = Promise.resolve('async result');
      const result = await promise;
      expect(result).toBe('async result');
    });
  });
});