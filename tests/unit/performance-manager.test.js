/**
 * パフォーマンスマネージャーのユニットテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceManager, DOMOptimizer, measurePerformance } from '../../src/utils/performance-manager.js';

describe('PerformanceManager', () => {
  let performanceManager;

  beforeEach(() => {
    performanceManager = new PerformanceManager();
  });

  afterEach(() => {
    performanceManager.fullCleanup();
  });

  describe('Three.jsオブジェクトの管理', () => {
    it('Three.jsオブジェクトを正しく登録する', () => {
      const mockObject = { type: 'scene' };
      performanceManager.registerThreeObject(mockObject, 'scene');
      
      const usage = performanceManager.getMemoryUsage();
      expect(usage.threeObjects).toBe(1);
    });

    it('複数のThree.jsオブジェクトを管理する', () => {
      const scene = { type: 'scene' };
      const camera = { type: 'camera' };
      const renderer = { type: 'renderer' };
      
      performanceManager.registerThreeObject(scene, 'scene');
      performanceManager.registerThreeObject(camera, 'camera');
      performanceManager.registerThreeObject(renderer, 'renderer');
      
      const usage = performanceManager.getMemoryUsage();
      expect(usage.threeObjects).toBe(3);
    });

    it('Three.jsオブジェクトを適切に破棄する', () => {
      const mockObject = {
        geometry: { dispose: vi.fn() },
        material: { dispose: vi.fn() },
        children: []
      };
      
      performanceManager.registerThreeObject(mockObject, 'mesh');
      performanceManager.disposeThreeObject(mockObject);
      
      expect(mockObject.geometry.dispose).toHaveBeenCalled();
      expect(mockObject.material.dispose).toHaveBeenCalled();
    });
  });

  describe('イベントリスナーの管理', () => {
    it('イベントリスナーを正しく登録する', () => {
      const element = document.createElement('div');
      const handler = vi.fn();
      
      performanceManager.registerEventListener(element, 'click', handler);
      
      const usage = performanceManager.getMemoryUsage();
      expect(usage.eventListeners).toBe(1);
    });

    it('イベントリスナーを適切に削除する', () => {
      const element = document.createElement('div');
      const handler = vi.fn();
      
      performanceManager.registerEventListener(element, 'click', handler);
      performanceManager.cleanup();
      
      const usage = performanceManager.getMemoryUsage();
      expect(usage.eventListeners).toBe(0);
    });
  });

  describe('画像データの管理', () => {
    it('画像データを正しく登録する', () => {
      const imageData = 'data:image/png;base64,test';
      performanceManager.registerImageData('test-image', imageData, 1024);
      
      const usage = performanceManager.getMemoryUsage();
      expect(usage.imageData.count).toBe(1);
      expect(usage.imageData.totalSize).toBe(1024);
    });

    it('複数の画像データを管理する', () => {
      performanceManager.registerImageData('image1', 'data1', 512);
      performanceManager.registerImageData('image2', 'data2', 1024);
      
      const usage = performanceManager.getMemoryUsage();
      expect(usage.imageData.count).toBe(2);
      expect(usage.imageData.totalSize).toBe(1536);
    });
  });

  describe('レンダリングキューの管理', () => {
    it('レンダリング関数をキューに追加する', () => {
      const renderFn = vi.fn();
      performanceManager.queueRender(renderFn, 1);
      
      expect(renderFn).toHaveBeenCalled();
    });

    it('優先度に基づいてレンダリング関数を実行する', () => {
      const highPriorityFn = vi.fn();
      const lowPriorityFn = vi.fn();
      
      performanceManager.queueRender(lowPriorityFn, 10);
      performanceManager.queueRender(highPriorityFn, 1);
      
      // 高優先度の関数が先に実行されることを確認
      expect(highPriorityFn).toHaveBeenCalledBefore(lowPriorityFn);
    });
  });

  describe('メモリクリーンアップ', () => {
    it('指定されたオプションでクリーンアップを実行する', () => {
      const mockObject = { dispose: vi.fn() };
      performanceManager.registerThreeObject(mockObject, 'test');
      
      performanceManager.cleanup({ threeObjects: true, maxAge: 0 });
      
      const usage = performanceManager.getMemoryUsage();
      expect(usage.threeObjects).toBe(0);
    });

    it('完全なクリーンアップを実行する', () => {
      const mockObject = { dispose: vi.fn() };
      performanceManager.registerThreeObject(mockObject, 'test');
      
      performanceManager.fullCleanup();
      
      const usage = performanceManager.getMemoryUsage();
      expect(usage.threeObjects).toBe(0);
      expect(usage.eventListeners).toBe(0);
      expect(usage.domElements).toBe(0);
      expect(usage.imageData.count).toBe(0);
    });
  });
});

describe('DOMOptimizer', () => {
  let domOptimizer;

  beforeEach(() => {
    domOptimizer = new DOMOptimizer();
  });

  describe('バッチ更新', () => {
    it('DOM更新をバッチ処理する', () => {
      const element = document.createElement('div');
      const updateFn = vi.fn();
      
      domOptimizer.batchUpdate(element, updateFn, 'test');
      
      expect(updateFn).toHaveBeenCalledWith(element);
    });

    it('複数のDOM更新をバッチ処理する', () => {
      const element1 = document.createElement('div');
      const element2 = document.createElement('div');
      const updateFn1 = vi.fn();
      const updateFn2 = vi.fn();
      
      domOptimizer.batchUpdate(element1, updateFn1, 'test1');
      domOptimizer.batchUpdate(element2, updateFn2, 'test2');
      
      expect(updateFn1).toHaveBeenCalledWith(element1);
      expect(updateFn2).toHaveBeenCalledWith(element2);
    });
  });

  describe('要素の表示制御', () => {
    it('要素の表示/非表示を制御する', () => {
      const element = document.createElement('div');
      element.style.display = 'block';
      
      domOptimizer.setVisibility(element, false, 'display');
      
      expect(element.style.display).toBe('none');
    });

    it('要素のスタイルを更新する', () => {
      const element = document.createElement('div');
      const styles = { color: 'red', fontSize: '16px' };
      
      domOptimizer.updateStyles(element, styles);
      
      expect(element.style.color).toBe('red');
      expect(element.style.fontSize).toBe('16px');
    });
  });
});

describe('measurePerformance', () => {
  it('パフォーマンスを測定する', async () => {
    const mockFn = vi.fn().mockResolvedValue('test result');
    
    const result = await measurePerformance('test', mockFn);
    
    expect(result).toBe('test result');
    expect(mockFn).toHaveBeenCalled();
  });

  it('エラー時のパフォーマンスを測定する', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('test error'));
    
    await expect(measurePerformance('test', mockFn)).rejects.toThrow('test error');
  });

  it('タイムアウト時のパフォーマンスを測定する', async () => {
    const mockFn = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 2000))
    );
    
    await expect(measurePerformance('test', mockFn, 1000)).rejects.toThrow('Async test timeout');
  });
});
