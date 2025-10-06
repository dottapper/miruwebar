// src/utils/apply-project.spec.js
/**
 * applyProjectDesign() の簡易スモークテスト
 * JSDOM環境で実行可能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { applyProjectDesign } from './apply-project-design.js';

describe('applyProjectDesign', () => {
  beforeEach(() => {
    // DOM環境をセットアップ
    document.body.innerHTML = `
      <div id="ar-start-screen"></div>
      <div id="ar-loading-screen"></div>
      <div id="ar-guide-screen"></div>
    `;
  });

  it('スタート画面のタイトルを反映', () => {
    const project = {
      start: {
        title: 'テストタイトル'
      }
    };

    applyProjectDesign(project);

    const titleElement = document.querySelector('#ar-start-title');
    expect(titleElement).toBeTruthy();
    expect(titleElement.textContent).toBe('テストタイトル');
  });

  it('スタート画面のタイトル位置を反映', () => {
    const project = {
      start: {
        title: 'Test',
        titlePosition: 40
      }
    };

    applyProjectDesign(project);

    const titleElement = document.querySelector('#ar-start-title');
    expect(titleElement.style.top).toBe('40%');
  });

  it('スタート画面のタイトルサイズを反映', () => {
    const project = {
      start: {
        title: 'Test',
        titleSize: 1.5
      }
    };

    applyProjectDesign(project);

    const titleElement = document.querySelector('#ar-start-title');
    expect(titleElement.style.fontSize).toBe('48px'); // 32 * 1.5
  });

  it('ガイド画面のマーカー画像を反映', () => {
    const project = {
      guide: {
        marker: {
          src: 'https://example.com/marker.png'
        }
      }
    };

    applyProjectDesign(project);

    const markerImg = document.querySelector('#ar-guide-marker');
    expect(markerImg).toBeTruthy();
    expect(markerImg.src).toBe('https://example.com/marker.png');
  });

  it('ローディング画面のメッセージを反映', () => {
    const project = {
      loading: {
        message: '読み込み中…'
      }
    };

    applyProjectDesign(project);

    const msgElement = document.querySelector('#ar-loading-message');
    expect(msgElement).toBeTruthy();
    expect(msgElement.textContent).toBe('読み込み中…');
  });

  it('全画面の設定を同時に反映', () => {
    const project = {
      start: {
        title: 'AR体験を開始',
        titlePosition: 40,
        titleSize: 1,
        textColor: '#FFFFFF',
        backgroundColor: 'rgba(0,0,0,0.6)',
        backgroundImage: 'assets/start-bg.jpg'
      },
      loading: {
        message: '読み込み中…',
        image: 'assets/loading.png'
      },
      guide: {
        marker: { src: 'assets/marker.png' },
        message: 'マーカーをカメラに写してください'
      }
    };

    applyProjectDesign(project);

    // スタート画面
    const startScreen = document.getElementById('ar-start-screen');
    expect(startScreen.style.backgroundImage).toContain('assets/start-bg.jpg');
    expect(startScreen.style.backgroundColor).toBe('rgba(0, 0, 0, 0.6)');

    const titleElement = document.querySelector('#ar-start-title');
    expect(titleElement.textContent).toBe('AR体験を開始');
    expect(titleElement.style.top).toBe('40%');
    expect(titleElement.style.fontSize).toBe('32px'); // 32 * 1

    // ローディング画面
    const loadingImg = document.querySelector('#ar-loading-image');
    expect(loadingImg.src).toContain('assets/loading.png');

    const loadingMsg = document.querySelector('#ar-loading-message');
    expect(loadingMsg.textContent).toBe('読み込み中…');

    // ガイド画面
    const guideMarker = document.querySelector('#ar-guide-marker');
    expect(guideMarker.src).toContain('assets/marker.png');

    const guideMsg = document.querySelector('#ar-guide-message');
    expect(guideMsg.textContent).toBe('マーカーをカメラに写してください');
  });
});
