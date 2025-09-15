/**
 * E2Eテスト: テンプレート編集からAR表示までの一連の流れ
 * テンプレート編集 → プロジェクト保存 → QR読み込み → AR表示
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

describe('テンプレート編集からAR表示までのE2Eフロー', () => {
  let browser;
  let page;
  let baseURL;

  beforeAll(async () => {
    // ブラウザ起動
    browser = await puppeteer.launch({
      headless: true, // 'new'を使用 
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        // カメラアクセスをモック
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        // HTTPS設定
        '--ignore-certificate-errors',
        '--allow-running-insecure-content'
      ]
    });

    // テストサーバーのURL（開発環境想定）
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
    
    // ビューポート設定
    await page.setViewport({ width: 1280, height: 720 });
    
    // コンソールログをキャプチャ
    page.on('console', (msg) => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`Browser ${type}: ${msg.text()}`);
      }
    });

    // エラーログをキャプチャ 
    page.on('pageerror', (error) => {
      console.error('Page error:', error.message);
    });

    // 失敗したリクエストをキャプチャ
    page.on('requestfailed', (request) => {
      console.error('Failed request:', request.url(), request.failure().errorText);
    });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('基本フロー', () => {
    it('テンプレート編集→プロジェクト保存→QR生成→AR表示の完全フロー', async () => {
      // ステップ1: プロジェクト一覧ページに移動
      await page.goto(`${baseURL}/#/projects`, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // ページが正しく読み込まれることを確認
      await page.waitForSelector('#project-list', { timeout: 20000 });
      
      // 新規プロジェクト作成
      const newProjectData = await createNewProject(page);
      expect(newProjectData).toBeDefined();
      expect(newProjectData.id).toBeTruthy();

      // ステップ2: エディターページに移動
      await page.goto(`${baseURL}/#/editor?project=${newProjectData.id}`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // エディターが読み込まれることを確認
      await page.waitForSelector('#loading-screen-select', { timeout: 20000 });

      // ステップ3: テンプレート編集
      const templateData = await editTemplate(page);
      expect(templateData.success).toBe(true);

      // ステップ4: プロジェクト保存
      const saveResult = await saveProject(page);
      expect(saveResult.success).toBe(true);

      // ステップ5: QR生成とプロパティ検証
      const qrData = await generateQRAndVerify(page, newProjectData.id);
      expect(qrData.success).toBe(true);
      expect(qrData.propertyConsistency).toBe(true);

      // ステップ6: AR表示テスト
      const arResult = await testARDisplay(page, qrData.qrURL);
      expect(arResult.success).toBe(true);
      expect(arResult.loadingScreenDisplayed).toBe(true);
      expect(arResult.templatePropertiesApplied).toBe(true);

    }, 120000);

    it('プロパティ不整合の検出と修復', async () => {
      // 意図的にプロパティ不整合を作成
      await page.goto(`${baseURL}/#/projects`, { waitUntil: 'networkidle0' });
      
      // LocalStorageに不整合データを注入
      await injectInconsistentData(page);

      // プロジェクト一覧を再読み込み
      await page.reload({ waitUntil: 'networkidle0' });

      // データマイグレーションが実行されることを確認
      const migrationResult = await verifyDataMigration(page);
      expect(migrationResult.migrationExecuted).toBe(true);
      expect(migrationResult.inconsistenciesFixed).toBeGreaterThan(0);

      // 修復後のデータ整合性を確認
      const consistencyCheck = await checkDataConsistency(page);
      expect(consistencyCheck.isConsistent).toBe(true);
    });

    it('エラー境界でのデータ復旧テスト', async () => {
      await page.goto(`${baseURL}/#/projects`, { waitUntil: 'networkidle0' });

      // 破損データを注入
      await injectCorruptedData(page);

      // ページリロード時のエラー復旧を確認
      await page.reload({ waitUntil: 'networkidle0' });

      // エラーバウンダリが作動することを確認
      const errorRecovery = await verifyErrorRecovery(page);
      expect(errorRecovery.recoveryAttempted).toBe(true);
      expect(errorRecovery.dataRestored).toBe(true);

      // アプリケーションが正常に動作することを確認
      await page.waitForSelector('#project-list', { timeout: 20000 });
      const functionalityTest = await testBasicFunctionality(page);
      expect(functionalityTest.success).toBe(true);
    });
  });

  describe('統一状態管理テスト', () => {
    it('テンプレート選択の即時同期', async () => {
      const projectData = await createNewProject(page);
      await page.goto(`${baseURL}/#/editor?project=${projectData.id}`, {
        waitUntil: 'networkidle0'
      });

      await page.waitForSelector('#loading-screen-select');

      // テンプレート選択変更
      await page.select('#loading-screen-select', 'default');

      // 即時同期の確認
      const syncResult = await verifySynchronization(page);
      expect(syncResult.domSynced).toBe(true);
      expect(syncResult.storageSynced).toBe(true);
      expect(syncResult.stateManagerSynced).toBe(true);
    });

    it('複数タブ間での状態同期', async () => {
      const projectData = await createNewProject(page);
      
      // 2つ目のタブを開く
      const page2 = await browser.newPage();
      await page2.setViewport({ width: 1280, height: 720 });

      try {
        // 両方のタブで同じプロジェクトを開く
        await page.goto(`${baseURL}/#/editor?project=${projectData.id}`);
        await page2.goto(`${baseURL}/#/editor?project=${projectData.id}`);

        await Promise.all([
          page.waitForSelector('#loading-screen-select'),
          page2.waitForSelector('#loading-screen-select')
        ]);

        // タブ1でテンプレート変更
        await page.select('#loading-screen-select', 'default');

        // タブ2での自動同期を確認
        await page2.waitForTimeout(1000); // 同期を待機
        
        const tab2Value = await page2.$eval('#loading-screen-select', el => el.value);
        expect(tab2Value).toBe('default');
      } finally {
        await page2.close();
      }
    });
  });

  describe('AR表示の詳細テスト', () => {
    it('ローディング画面のカスタマイズ反映', async () => {
      const projectData = await createNewProject(page);
      await page.goto(`${baseURL}/#/editor?project=${projectData.id}`);

      // カスタムローディング設定を適用
      const customSettings = {
        backgroundColor: '#ff0000',
        textColor: '#ffffff',
        loadingMessage: 'カスタムメッセージ',
        logoImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      };

      await applyCustomLoadingSettings(page, customSettings);
      
      // プロジェクト保存
      await saveProject(page);
      
      // AR表示でカスタマイズが反映されることを確認
      const qrData = await generateQRAndVerify(page, projectData.id);
      const arResult = await testARCustomLoadingScreen(page, qrData.qrURL, customSettings);
      
      expect(arResult.customSettingsApplied).toBe(true);
      expect(arResult.backgroundColorCorrect).toBe(true);
      expect(arResult.textColorCorrect).toBe(true);
      expect(arResult.messageCorrect).toBe(true);
    });

    it('ガイド画面の正確な表示', async () => {
      const projectData = await createNewProject(page);
      await page.goto(`${baseURL}/#/editor?project=${projectData.id}`);

      // ガイド画面設定
      const guideSettings = {
        mode: 'surface',
        title: 'カスタムガイドタイトル',
        description: 'カスタムガイド説明'
      };

      await applyGuideSettings(page, guideSettings);
      await saveProject(page);

      // AR表示でガイド画面をテスト
      const qrData = await generateQRAndVerify(page, projectData.id);
      const guideResult = await testARGuideScreen(page, qrData.qrURL, guideSettings);
      
      expect(guideResult.guideDisplayed).toBe(true);
      expect(guideResult.titleCorrect).toBe(true);
      expect(guideResult.descriptionCorrect).toBe(true);
    });
  });

  // ヘルパー関数

  async function createNewProject(page) {
    // 新規プロジェクト作成ボタンをクリック
    await page.click('#new-project-btn');
    
    // プロジェクト名入力
    const projectName = `Test Project ${Date.now()}`;
    await page.type('#project-name', projectName);
    
    // プロジェクト作成
    await page.click('#create-project-confirm');
    
    // 作成完了を待機
    await page.waitForSelector('.project-card', { timeout: 10000 });
    
    return {
      id: await page.$eval('.project-card:last-child', el => el.dataset.projectId),
      name: projectName
    };
  }

  async function editTemplate(page) {
    try {
      // ローディング画面エディターを開く
      await page.click('#edit-loading-screen');
      
      // エディターモーダルが開くのを待機
      await page.waitForSelector('.loading-screen-editor', { timeout: 15000 });
      
      // テンプレート設定を変更
      await page.type('#loading-message-input', 'Test Loading Message');
      await page.select('#background-color-select', '#1a1a1a');
      
      // 保存
      await page.click('#save-template');
      
      // モーダルが閉じるのを待機
      await page.waitForSelector('.loading-screen-editor', { hidden: true });
      
      return { success: true };
    } catch (error) {
      console.error('テンプレート編集エラー:', error);
      return { success: false, error: error.message };
    }
  }

  async function saveProject(page) {
    try {
      // プロジェクト保存ボタンをクリック
      await page.click('#save-project');
      
      // 保存完了の通知を待機
      await page.waitForSelector('.save-success-notification', { timeout: 10000 });
      
      return { success: true };
    } catch (error) {
      console.error('プロジェクト保存エラー:', error);
      return { success: false, error: error.message };
    }
  }

  async function generateQRAndVerify(page, projectId) {
    try {
      // QR生成ボタンをクリック
      await page.click('#generate-qr');
      
      // QRコードが生成されるのを待機
      await page.waitForSelector('#qr-code', { timeout: 15000 });
      
      // QR URLを取得
      const qrURL = await page.$eval('#qr-url', el => el.value);
      
      // プロパティ整合性チェック
      const propertyConsistency = await page.evaluate(async () => {
        // テンプレート状態管理システムの整合性チェック
        if (window.templateStateManager) {
          const consistencyResult = window.templateStateManager.checkConsistency();
          return consistencyResult.isConsistent;
        }
        return false;
      });
      
      return {
        success: true,
        qrURL,
        propertyConsistency
      };
    } catch (error) {
      console.error('QR生成エラー:', error);
      return { success: false, error: error.message };
    }
  }

  async function testARDisplay(page, qrURL) {
    try {
      // AR表示ページに移動
      await page.goto(qrURL, { waitUntil: 'networkidle0' });
      
      // ローディング画面が表示されることを確認
      await page.waitForSelector('.loading-screen', { timeout: 25000 });
      const loadingScreenDisplayed = await page.$('.loading-screen') !== null;
      
      // テンプレートプロパティが適用されていることを確認
      const templatePropertiesApplied = await page.evaluate(() => {
        const loadingScreen = document.querySelector('.loading-screen');
        if (!loadingScreen) return false;
        
        // 背景色やテキストなどの確認
        const styles = window.getComputedStyle(loadingScreen);
        return styles.backgroundColor !== 'rgba(0, 0, 0, 0)'; // デフォルト以外の背景色
      });
      
      // AR初期化を待機
      await page.waitForTimeout(3000);
      
      return {
        success: true,
        loadingScreenDisplayed,
        templatePropertiesApplied
      };
    } catch (error) {
      console.error('AR表示テストエラー:', error);
      return { success: false, error: error.message };
    }
  }

  async function injectInconsistentData(page) {
    await page.evaluate(() => {
      // 意図的に不整合データを作成
      const inconsistentProject = {
        id: 'test-inconsistent',
        name: 'Inconsistent Test Project',
        loadingScreen: {
          selectedScreenId: 'template1',
          template: 'template2', // 異なるテンプレートID
          enabled: true
        },
        selectedScreenId: 'template3' // さらに異なるテンプレートID
      };
      
      localStorage.setItem('miruwebAR_projects', JSON.stringify([inconsistentProject]));
    });
  }

  async function injectCorruptedData(page) {
    await page.evaluate(() => {
      // 破損したJSONデータを注入
      localStorage.setItem('miruwebAR_projects', '{"corrupted": json data}');
      localStorage.setItem('miruwebAR_loading_templates', '[{"id": "broken", "incomplete');
    });
  }

  async function verifyDataMigration(page) {
    return await page.evaluate(() => {
      // データマイグレーションの統計を確認 (簡易版)
      try {
        // LocalStorageからマイグレーション履歴をチェック
        const migrationHistory = JSON.parse(localStorage.getItem('miruwebAR_migration_log') || '[]');
        const recentMigrations = migrationHistory.filter(log => 
          Date.now() - log.timestamp < 60000 // 1分以内
        );
        
        return {
          migrationExecuted: recentMigrations.length > 0,
          inconsistenciesFixed: recentMigrations.length
        };
      } catch (error) {
        return { migrationExecuted: false, inconsistenciesFixed: 0 };
      }
    });
  }

  async function verifyErrorRecovery(page) {
    return await page.evaluate(() => {
      // エラー復旧の統計を確認 (簡易版)
      try {
        // コンソールエラーやLocalStorageから復旧履歴をチェック
        const errorLog = JSON.parse(localStorage.getItem('miruwebAR_error_log') || '[]');
        const recoveryLog = JSON.parse(localStorage.getItem('miruwebAR_recovery_log') || '[]');
        
        return {
          recoveryAttempted: recoveryLog.length > 0,
          dataRestored: errorLog.length > 0 && recoveryLog.length > 0
        };
      } catch (error) {
        return { recoveryAttempted: false, dataRestored: false };
      }
    });
  }

  async function checkDataConsistency(page) {
    return await page.evaluate(() => {
      // 統一状態管理システムの整合性チェック
      if (window.templateStateManager) {
        const result = window.templateStateManager.checkConsistency();
        return { isConsistent: result.isConsistent };
      }
      return { isConsistent: false };
    });
  }

  async function testBasicFunctionality(page) {
    try {
      // 基本機能のテスト
      await page.waitForSelector('#project-list');
      
      // プロジェクト作成ボタンが機能することを確認
      const createButtonVisible = await page.$('#new-project-btn') !== null;
      
      return { success: createButtonVisible };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async function verifySynchronization(page) {
    return await page.evaluate(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          // DOM同期確認
          const select = document.getElementById('loading-screen-select');
          const domSynced = select && select.value === 'default';
          
          // LocalStorage同期確認  
          const projects = JSON.parse(localStorage.getItem('miruwebAR_projects') || '[]');
          const storageSynced = projects.length > 0 && 
                               projects[0].loadingScreen?.template === 'default';
          
          // 状態管理システム同期確認
          const stateManagerSynced = window.templateStateManager && 
                                    window.templateStateManager.getCurrentTemplateId() === 'default';
          
          resolve({ domSynced, storageSynced, stateManagerSynced });
        }, 500);
      });
    });
  }

  async function applyCustomLoadingSettings(page, settings) {
    // カスタム設定の適用ロジック
    await page.click('#edit-loading-screen');
    await page.waitForSelector('.loading-screen-editor');
    
    if (settings.backgroundColor) {
      await page.type('#background-color-input', settings.backgroundColor);
    }
    
    if (settings.loadingMessage) {
      await page.type('#loading-message-input', settings.loadingMessage);
    }
    
    await page.click('#save-template');
    await page.waitForSelector('.loading-screen-editor', { hidden: true });
  }

  async function applyGuideSettings(page, settings) {
    // ガイド設定の適用ロジック
    await page.click('#edit-guide-screen');
    await page.waitForSelector('.guide-screen-editor');
    
    if (settings.title) {
      await page.type('#guide-title-input', settings.title);
    }
    
    if (settings.description) {
      await page.type('#guide-description-input', settings.description);
    }
    
    await page.click('#save-guide-settings');
    await page.waitForSelector('.guide-screen-editor', { hidden: true });
  }

  async function testARCustomLoadingScreen(page, qrURL, expectedSettings) {
    await page.goto(qrURL);
    
    const result = await page.evaluate((settings) => {
      const loadingScreen = document.querySelector('.loading-screen');
      if (!loadingScreen) return { customSettingsApplied: false };
      
      const styles = window.getComputedStyle(loadingScreen);
      const messageElement = loadingScreen.querySelector('.loading-message');
      
      return {
        customSettingsApplied: true,
        backgroundColorCorrect: styles.backgroundColor === settings.backgroundColor,
        textColorCorrect: styles.color === settings.textColor,
        messageCorrect: messageElement && messageElement.textContent === settings.loadingMessage
      };
    }, expectedSettings);
    
    return result;
  }

  async function testARGuideScreen(page, qrURL, expectedSettings) {
    await page.goto(qrURL);
    
    // ローディング画面完了まで待機
    await page.waitForTimeout(3000);
    
    const result = await page.evaluate((settings) => {
      const guideScreen = document.querySelector('.guide-screen');
      if (!guideScreen) return { guideDisplayed: false };
      
      const titleElement = guideScreen.querySelector('.guide-title');
      const descElement = guideScreen.querySelector('.guide-description');
      
      return {
        guideDisplayed: true,
        titleCorrect: titleElement && titleElement.textContent === settings.title,
        descriptionCorrect: descElement && descElement.textContent === settings.description
      };
    }, expectedSettings);
    
    return result;
  }
});