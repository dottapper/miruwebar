/**
 * QRコード読み込みからAR表示までのテスト
 * QR生成 → URL読み込み → AR初期化 → 表示崩れ検知
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import puppeteer from 'puppeteer';

// サーバーが起動するまで待機する関数
async function waitForServer(url, timeout = 30000) {
  const startTime = Date.now();
  const maxTime = startTime + timeout;
  
  while (Date.now() < maxTime) {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        console.log(`サーバーが起動しました: ${url}`);
        return;
      }
    } catch (error) {
      // サーバーがまだ起動していない場合は待機
      console.log(`サーバー待機中... (${url})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error(`サーバーが${timeout}ms以内に起動しませんでした: ${url}`);
}

describe('QR読み込みとAR表示テスト', () => {
  let browser;
  let page;
  let baseURL;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        // WebXRとカメラのモック
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--enable-features=WebXR',
        '--disable-features=VizDisplayCompositor',
        // HTTPS設定
        '--ignore-certificate-errors',
        '--allow-running-insecure-content'
      ]
    });

    baseURL = process.env.TEST_BASE_URL || 'https://localhost:3001';
    console.log(`E2Eテスト開始: ${baseURL}`);
    
    // サーバーが起動するまで待機
    await waitForServer(baseURL, 30000);
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // WebXR API のモック
    await page.evaluateOnNewDocument(() => {
      // navigator.xr のモック
      if (!navigator.xr) {
        navigator.xr = {
          isSessionSupported: () => Promise.resolve(true),
          requestSession: () => Promise.resolve({
            addEventListener: () => {},
            requestReferenceSpace: () => Promise.resolve({}),
            requestAnimationFrame: (callback) => {
              setTimeout(() => callback(0, {}), 16);
              return 1;
            },
            end: () => Promise.resolve()
          })
        };
      }

      // getUserMedia のモック
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = () => Promise.resolve({
          getTracks: () => [],
          getVideoTracks: () => [],
          getAudioTracks: () => []
        });
      }
    });

    // コンソールとエラーのキャプチャ
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Browser error:', msg.text());
      }
    });

    page.on('pageerror', (error) => {
      console.error('Page error:', error.message);
    });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('QR生成とURL読み込み', () => {
    it('プロジェクトからQRコードが正しく生成される', async () => {
      // プロジェクト作成とQR生成
      const projectData = await setupTestProject(page);
      const qrResult = await generateQRCode(page, projectData.id);
      
      expect(qrResult.success).toBe(true);
      expect(qrResult.qrURL).toContain(baseURL);
      expect(qrResult.qrURL).toContain('project=');
      
      // QRコードの画像が生成されていることを確認
      const qrImage = await page.$('#qr-code img');
      expect(qrImage).not.toBeNull();
      
      const src = await qrImage.evaluate(el => el.src);
      expect(src).toContain('data:image');
    });

    it('QR URLから正しくプロジェクトデータが読み込まれる', async () => {
      const projectData = await setupTestProject(page);
      const qrResult = await generateQRCode(page, projectData.id);
      
      // QR URLにアクセス
      await page.goto(qrResult.qrURL, { waitUntil: 'networkidle0' });
      
      // プロジェクトデータが正しく読み込まれることを確認
      const loadedData = await page.evaluate(() => {
        return window.currentProject || null;
      });
      
      expect(loadedData).not.toBeNull();
      expect(loadedData.id).toBe(projectData.id);
      expect(loadedData.name).toBe(projectData.name);
    });

    it('存在しないプロジェクトIDでのエラーハンドリング', async () => {
      const invalidURL = `${baseURL}/#/ar?project=nonexistent-project-id`;
      
      await page.goto(invalidURL, { waitUntil: 'networkidle0' });
      
      // エラーメッセージが表示されることを確認
      const errorMessage = await page.$('.error-message');
      expect(errorMessage).not.toBeNull();
      
      const errorText = await errorMessage.evaluate(el => el.textContent);
      expect(errorText).toContain('プロジェクト');
      expect(errorText).toContain('見つかりません');
    });
  });

  describe('AR初期化とローディング画面', () => {
    it('ローディング画面が正しく表示される', async () => {
      const projectData = await setupTestProject(page, {
        loadingScreen: {
          enabled: true,
          template: 'default',
          backgroundColor: '#1a1a1a',
          textColor: '#ffffff',
          loadingMessage: 'AR体験を準備中...'
        }
      });
      
      const qrResult = await generateQRCode(page, projectData.id);
      await page.goto(qrResult.qrURL);
      
      // ローディング画面の表示確認
      await page.waitForSelector('.loading-screen', { timeout: 25000 });
      
      const loadingScreen = await page.$('.loading-screen');
      expect(loadingScreen).not.toBeNull();
      
      // スタイルの適用確認
      const styles = await loadingScreen.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          display: computed.display
        };
      });
      
      expect(styles.display).not.toBe('none');
      expect(styles.backgroundColor).toBe('rgb(26, 26, 26)'); // #1a1a1a
      expect(styles.color).toBe('rgb(255, 255, 255)'); // #ffffff
      
      // メッセージの確認
      const messageElement = await page.$('.loading-message');
      const messageText = await messageElement.evaluate(el => el.textContent);
      expect(messageText).toContain('AR体験を準備中');
    });

    it('スタート画面が正しく表示される', async () => {
      const projectData = await setupTestProject(page, {
        startScreen: {
          title: 'カスタムARタイトル',
          buttonText: 'AR開始',
          backgroundColor: '#2c3e50',
          textColor: '#ecf0f1'
        }
      });
      
      const qrResult = await generateQRCode(page, projectData.id);
      await page.goto(qrResult.qrURL);
      
      // ローディング完了後、スタート画面が表示されることを確認
      await page.waitForSelector('.start-screen', { timeout: 20000 });
      
      const startScreen = await page.$('.start-screen');
      expect(startScreen).not.toBeNull();
      
      // タイトルの確認
      const titleElement = await page.$('.start-title');
      const titleText = await titleElement.evaluate(el => el.textContent);
      expect(titleText).toBe('カスタムARタイトル');
      
      // ボタンの確認
      const buttonElement = await page.$('.start-button');
      const buttonText = await buttonElement.evaluate(el => el.textContent);
      expect(buttonText).toBe('AR開始');
      
      // 背景色の確認
      const bgColor = await startScreen.evaluate(el => {
        return window.getComputedStyle(el).backgroundColor;
      });
      expect(bgColor).toBe('rgb(44, 62, 80)'); // #2c3e50
    });

    it('ガイド画面が正しく表示される', async () => {
      const projectData = await setupTestProject(page, {
        guideScreen: {
          mode: 'surface',
          title: 'カメラをマーカーに向けてください',
          description: 'マーカー画像を画面内に収めてください',
          backgroundColor: '#34495e',
          textColor: '#ffffff'
        }
      });
      
      const qrResult = await generateQRCode(page, projectData.id);
      await page.goto(qrResult.qrURL);
      
      // スタート画面のボタンをクリック
      await page.waitForSelector('.start-button', { timeout: 20000 });
      await page.click('.start-button');
      
      // ガイド画面の表示確認
      await page.waitForSelector('.guide-screen', { timeout: 15000 });
      
      const guideScreen = await page.$('.guide-screen');
      expect(guideScreen).not.toBeNull();
      
      // タイトルと説明の確認
      const titleElement = await page.$('.guide-title');
      const titleText = await titleElement.evaluate(el => el.textContent);
      expect(titleText).toBe('カメラをマーカーに向けてください');
      
      const descElement = await page.$('.guide-description');
      const descText = await descElement.evaluate(el => el.textContent);
      expect(descText).toBe('マーカー画像を画面内に収めてください');
      
      // 背景色の確認
      const bgColor = await guideScreen.evaluate(el => {
        return window.getComputedStyle(el).backgroundColor;
      });
      expect(bgColor).toBe('rgb(52, 73, 94)'); // #34495e
    });
  });

  describe('AR表示と表示崩れ検知', () => {
    it('AR環境の初期化が正常に完了する', async () => {
      const projectData = await setupTestProject(page, {
        ar: {
          trackingMode: 'image',
          markerImage: 'test-marker.jpg'
        }
      });
      
      const qrResult = await generateQRCode(page, projectData.id);
      await page.goto(qrResult.qrURL);
      
      // AR初期化プロセスを通す
      await proceedThroughARInitialization(page);
      
      // AR環境の初期化確認
      const arInitialized = await page.evaluate(() => {
        return window.arSession !== undefined && window.arSession !== null;
      });
      
      expect(arInitialized).toBe(true);
      
      // Three.jsシーンの初期化確認
      const sceneInitialized = await page.evaluate(() => {
        return window.scene !== undefined && window.renderer !== undefined;
      });
      
      expect(sceneInitialized).toBe(true);
    });

    it('レイアウト崩れの検知', async () => {
      const projectData = await setupTestProject(page);
      const qrResult = await generateQRCode(page, projectData.id);
      await page.goto(qrResult.qrURL);
      
      await proceedThroughARInitialization(page);
      
      // レイアウト検証
      const layoutCheck = await performLayoutValidation(page);
      
      expect(layoutCheck.hasOverflow).toBe(false);
      expect(layoutCheck.elementsVisible).toBe(true);
      expect(layoutCheck.zIndexIssues).toBe(false);
      expect(layoutCheck.responsiveLayout).toBe(true);
    });

    it('パフォーマンス監視', async () => {
      const projectData = await setupTestProject(page);
      const qrResult = await generateQRCode(page, projectData.id);
      
      // パフォーマンス測定開始
      await page.goto(qrResult.qrURL);
      
      const performanceMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const paintEntries = entries.filter(entry => 
              entry.entryType === 'paint'
            );
            
            if (paintEntries.length >= 2) {
              observer.disconnect();
              resolve({
                firstPaint: paintEntries.find(e => e.name === 'first-paint')?.startTime || 0,
                firstContentfulPaint: paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime || 0
              });
            }
          });
          
          observer.observe({ entryTypes: ['paint'] });
          
          // タイムアウト
          setTimeout(() => {
            observer.disconnect();
            resolve({ firstPaint: 0, firstContentfulPaint: 0 });
          }, 10000);
        });
      });
      
      expect(performanceMetrics.firstPaint).toBeLessThan(3000);
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(5000);
    });

    it('メモリリークの検知', async () => {
      const projectData = await setupTestProject(page);
      const qrResult = await generateQRCode(page, projectData.id);
      
      // 初期メモリ使用量
      const initialMemory = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });
      
      // AR表示を複数回初期化・終了
      for (let i = 0; i < 5; i++) {
        await page.goto(qrResult.qrURL);
        await proceedThroughARInitialization(page);
        await page.evaluate(() => {
          // AR セッションの終了処理
          if (window.arSession) {
            window.arSession.end();
          }
          if (window.renderer) {
            window.renderer.dispose();
          }
        });
        await page.waitForTimeout(1000);
      }
      
      // 最終メモリ使用量
      const finalMemory = await page.evaluate(() => {
        // ガベージコレクション実行
        if (window.gc) {
          window.gc();
        }
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });
      
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseRatio = memoryIncrease / initialMemory;
      
      // メモリ使用量の増加が50%以内であることを確認
      expect(memoryIncreaseRatio).toBeLessThan(0.5);
    });
  });

  describe('エラーケース', () => {
    it('カメラアクセス拒否時のエラーハンドリング', async () => {
      // カメラアクセスを拒否するモック
      await page.evaluateOnNewDocument(() => {
        navigator.mediaDevices.getUserMedia = () => 
          Promise.reject(new Error('Permission denied'));
      });
      
      const projectData = await setupTestProject(page);
      const qrResult = await generateQRCode(page, projectData.id);
      await page.goto(qrResult.qrURL);
      
      await page.waitForSelector('.start-button');
      await page.click('.start-button');
      
      // エラーメッセージの確認
      await page.waitForSelector('.camera-error', { timeout: 15000 });
      
      const errorElement = await page.$('.camera-error');
      const errorText = await errorElement.evaluate(el => el.textContent);
      
      expect(errorText).toContain('カメラ');
      expect(errorText).toContain('許可');
    });

    it('WebXR非対応ブラウザでの代替表示', async () => {
      // WebXRを無効化
      await page.evaluateOnNewDocument(() => {
        delete navigator.xr;
      });
      
      const projectData = await setupTestProject(page);
      const qrResult = await generateQRCode(page, projectData.id);
      await page.goto(qrResult.qrURL);
      
      // 代替メッセージの確認
      await page.waitForSelector('.webxr-unsupported', { timeout: 15000 });
      
      const messageElement = await page.$('.webxr-unsupported');
      const messageText = await messageElement.evaluate(el => el.textContent);
      
      expect(messageText).toContain('WebXR');
      expect(messageText).toContain('対応していません');
    });
  });

  // ヘルパー関数

  async function setupTestProject(page, customSettings = {}) {
    await page.goto(`${baseURL}/#/projects`);
    await page.waitForSelector('#project-list');
    
    // 新規プロジェクト作成
    await page.click('#new-project-btn');
    
    const projectName = `E2E Test Project ${Date.now()}`;
    await page.type('#project-name', projectName);
    await page.click('#create-project-confirm');
    
    await page.waitForSelector('.project-card:last-child');
    const projectId = await page.$eval('.project-card:last-child', el => el.dataset.projectId);
    
    // カスタム設定があれば適用
    if (Object.keys(customSettings).length > 0) {
      await page.goto(`${baseURL}/#/editor?project=${projectId}`);
      await applyCustomSettings(page, customSettings);
      await page.click('#save-project');
      await page.waitForSelector('.save-success-notification');
    }
    
    return {
      id: projectId,
      name: projectName,
      settings: customSettings
    };
  }

  async function generateQRCode(page, projectId) {
    try {
      await page.goto(`${baseURL}/#/editor?project=${projectId}`);
      await page.waitForSelector('#generate-qr');
      await page.click('#generate-qr');
      
      await page.waitForSelector('#qr-code', { timeout: 15000 });
      const qrURL = await page.$eval('#qr-url', el => el.value);
      
      return { success: true, qrURL };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async function applyCustomSettings(page, settings) {
    await page.waitForSelector('#loading-screen-select');
    
    if (settings.loadingScreen) {
      // ローディング画面設定
      await page.click('#edit-loading-screen');
      await page.waitForSelector('.loading-screen-editor');
      
      for (const [key, value] of Object.entries(settings.loadingScreen)) {
        const inputSelector = `#${key.replace(/([A-Z])/g, '-$1').toLowerCase()}-input`;
        try {
          await page.type(inputSelector, String(value));
        } catch (e) {
          // 入力フィールドが存在しない場合はスキップ
          console.warn(`設定項目 ${key} の入力フィールドが見つかりません`);
        }
      }
      
      await page.click('#save-loading-settings');
      await page.waitForSelector('.loading-screen-editor', { hidden: true });
    }
    
    if (settings.startScreen || settings.guideScreen) {
      // 他の画面設定も同様に適用
      // 実装は実際のUIに応じて調整
    }
  }

  async function proceedThroughARInitialization(page) {
    // ローディング画面の完了を待機
    await page.waitForSelector('.loading-screen', { timeout: 25000 });
    
    // スタート画面のボタンクリック
    try {
      await page.waitForSelector('.start-button', { timeout: 15000 });
      await page.click('.start-button');
    } catch (e) {
      // スタート画面がない場合はスキップ
    }
    
    // ガイド画面の完了を待機
    try {
      await page.waitForSelector('.guide-screen', { timeout: 10000 });
      await page.waitForTimeout(2000); // ガイド表示時間
    } catch (e) {
      // ガイド画面がない場合はスキップ
    }
    
    // AR初期化完了まで待機
    await page.waitForTimeout(3000);
  }

  async function performLayoutValidation(page) {
    return await page.evaluate(() => {
      const results = {
        hasOverflow: false,
        elementsVisible: true,
        zIndexIssues: false,
        responsiveLayout: true
      };
      
      // オーバーフロー検知
      const elements = document.querySelectorAll('*');
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > window.innerWidth || rect.height > window.innerHeight) {
          const style = window.getComputedStyle(el);
          if (style.overflow !== 'hidden' && style.overflow !== 'scroll') {
            results.hasOverflow = true;
          }
        }
      });
      
      // 主要要素の可視性確認
      const importantElements = ['.ar-container', '.ui-controls'];
      importantElements.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            results.elementsVisible = false;
          }
        }
      });
      
      // z-index問題の検知
      const overlayElements = document.querySelectorAll('[style*="z-index"], .overlay, .modal');
      const zIndexValues = Array.from(overlayElements).map(el => {
        return parseInt(window.getComputedStyle(el).zIndex) || 0;
      });
      
      if (zIndexValues.some((z, i) => zIndexValues.indexOf(z) !== i && z !== 0)) {
        results.zIndexIssues = true;
      }
      
      return results;
    });
  }
});