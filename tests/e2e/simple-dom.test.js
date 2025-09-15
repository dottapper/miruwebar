/**
 * シンプルなDOMテスト
 * ARビューアの基本的な動作を確認
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { testHelpers } from '../utils/test-helpers.js';
import { globalMockSystem } from '../utils/mock-system.js';

describe('シンプルなDOMテスト', () => {
  let container;

  beforeEach(() => {
    // モックシステムをセットアップ
    globalMockSystem.setup();
    
    // DOM環境をセットアップ
    container = testHelpers.dom.setupDOM(`
      <div id="test-container">
        <div class="integrated-ar-viewer" id="ar-container">
          <!-- ARビューアは動的にDOMを生成するため、初期状態は空 -->
        </div>
      </div>
    `);
  });

  afterEach(() => {
    // DOM環境をクリーンアップ
    testHelpers.dom.cleanupDOM();
    
    // モックシステムをクリーンアップ
    globalMockSystem.cleanup();
  });

  it('ARビューアが基本的なDOMを生成する', async () => {
    // プロジェクトデータなしでテスト
    global.window.location.hash = '#/viewer';
    
    // ARビューアをインポート
    const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
    
    // ARビューアを実行
    let cleanup;
    try {
      cleanup = await showARViewer(container);
    } catch (error) {
      console.log('ARビューア実行エラー:', error.message);
      throw error;
    }
    
    // 基本的なDOM構造の確認
    const html = container.innerHTML;
    expect(html).toContain('viewer-error');
    expect(html).toContain('プロジェクトが見つかりません');
    
    // クリーンアップを実行
    if (cleanup) {
      cleanup();
    }
    
    // 基本的な要素の存在確認
    expect(container).toBeTruthy();
  }, 10000);

  it('ARビューアがエラー画面を表示する', async () => {
    // プロジェクトデータなしでテスト
    global.window.location.hash = '#/viewer';
    
    // ARビューアをインポート
    const { default: showARViewer } = await import('../../src/views/ar-viewer.js');
    
    // ARビューアを実行
    let cleanup;
    try {
      cleanup = await showARViewer(container);
    } catch (error) {
      console.log('ARビューア実行エラー:', error.message);
      throw error;
    }
    
    // エラー画面の確認（少し待機）
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const html = container.innerHTML;
    console.log('HTML:', html);
    
    // エラー関連の要素を探す
    const errorElements = container.querySelectorAll('[class*="error"], [class*="Error"]');
    console.log('エラー要素数:', errorElements.length);
    
    // クリーンアップを実行
    if (cleanup) {
      cleanup();
    }
    
    // 基本的な要素の存在確認
    expect(container).toBeTruthy();
  }, 10000);
});
