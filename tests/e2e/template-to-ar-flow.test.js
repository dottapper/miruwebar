/**
 * E2Eテスト: テンプレート編集からAR表示まで（スモーク）
 * 現行UIに合わせた最小フロー検証
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
  setupPuppeteerE2E,
  teardownPuppeteerE2E,
  ensureAuthenticated
} from '../helpers/puppeteer-setup.js';

const hasAuthPassword = Boolean(process.env.AUTH_PASSWORD);

describe('テンプレート編集からAR表示までのE2Eフロー', () => {
  let browser;
  let page;
  let baseURL;
  let serverProc;

  beforeAll(async () => {
    const ctx = await setupPuppeteerE2E();
    browser = ctx.browser;
    baseURL = ctx.baseURL;
    serverProc = ctx.serverProc;
  }, 120000);

  afterAll(async () => {
    await teardownPuppeteerE2E({ browser, serverProc });
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    page.setDefaultTimeout(30000);
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  it('アプリケーションのトップが応答する', async () => {
    const response = await page.goto(`${baseURL}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    expect(response?.status()).toBeLessThan(400);
    await page.waitForSelector('#app', { timeout: 20000 });
  });

  it('ARビューアはsrc未指定時にエラーを表示する', async () => {
    await page.goto(`${baseURL}/#/viewer`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await page.waitForSelector('.viewer-error', { timeout: 30000 });
    const message = await page.$eval('.viewer-error', (el) => el.textContent || '');
    expect(message).toContain('プロジェクト');
  });

  describe.runIf(hasAuthPassword)('認証済みフロー', () => {
    beforeEach(async () => {
      await ensureAuthenticated(page, baseURL);
    });

    it('プロジェクト一覧に新規作成ボタンが表示される', async () => {
      await page.goto(`${baseURL}/#/projects`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('#project-list', { timeout: 20000 });
      expect(await page.$('#new-project-btn')).toBeTruthy();
    });

    it('新規プロジェクトを作成してエディターを開ける', async () => {
      await page.goto(`${baseURL}/#/projects`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('#new-project-btn', { timeout: 20000 });
      await page.click('#new-project-btn');

      const projectName = `E2E Project ${Date.now()}`;
      await page.waitForSelector('#project-name', { timeout: 10000 });
      await page.type('#project-name', projectName);
      await page.click('#create-project-confirm');

      await page.waitForSelector('.project-card', { timeout: 20000 });
      const projectId = await page.$eval('.project-card:last-child', (el) => el.dataset.projectId);
      expect(projectId).toBeTruthy();

      await page.goto(`${baseURL}/#/editor?project=${projectId}`, {
        waitUntil: 'networkidle0'
      });

      await page.waitForSelector('#app', { timeout: 20000 });
      const appText = await page.$eval('#app', (el) => el.textContent || '');
      expect(appText.length).toBeGreaterThan(0);
    });
  });
});
