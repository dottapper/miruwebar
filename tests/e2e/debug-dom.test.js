/**
 * DOM構造デバッグテスト
 * ARビューアが実際に生成するDOM構造を確認
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { testHelpers } from '../utils/test-helpers.js';
import { globalMockSystem } from '../utils/mock-system.js';

describe('DOM構造デバッグテスト', () => {
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

  it('ARビューアのDOM生成をデバッグする', async () => {
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
    
    // DOM構造をデバッグ出力
    const html = container.innerHTML;
    
    // デバッグ情報をファイルに出力
    const debugInfo = {
      html: html,
      allElements: Array.from(container.querySelectorAll('*')).map((el, index) => ({
        index,
        tagName: el.tagName,
        className: el.className,
        id: el.id
      })),
      loadingScreens: container.querySelectorAll('.unified-loading-screen').length,
      errorElements: container.querySelectorAll('.viewer-error').length
    };
    
    // 期待される要素の存在確認
    expect(html.length).toBeGreaterThan(0);
    expect(debugInfo.allElements.length).toBeGreaterThan(0);
    
    // デバッグ情報をテスト結果として出力
    console.log('DEBUG INFO:', JSON.stringify(debugInfo, null, 2));
    
    // クリーンアップを実行
    cleanup();
    
    // 基本的な要素の存在確認
    expect(container).toBeTruthy();
  }, 10000);
});
