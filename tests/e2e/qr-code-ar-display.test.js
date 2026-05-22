/**
 * QRコード / AR表示 E2E（スモーク）
 * 現行のビューアルート（#/viewer）中心の検証
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
  setupPuppeteerE2E,
  teardownPuppeteerE2E,
  ensureAuthenticated
} from '../helpers/puppeteer-setup.js';

const hasAuthPassword = Boolean(process.env.AUTH_PASSWORD);

describe('QR読み込みとAR表示テスト', () => {
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

    await page.evaluateOnNewDocument(() => {
      if (!navigator.mediaDevices) {
        navigator.mediaDevices = {};
      }
      navigator.mediaDevices.getUserMedia = () =>
        Promise.resolve({
          getTracks: () => [],
          getVideoTracks: () => [],
          getAudioTracks: () => []
        });
    });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  it('ビューアは無効なproject.json URLでも画面を初期化する', async () => {
    const invalidSrc = encodeURIComponent('https://example.com/missing/project.json');
    await page.goto(`${baseURL}/?src=${invalidSrc}#/viewer`, {
      waitUntil: 'networkidle0'
    });

    await page.waitForSelector('#webar-ui, .viewer-error', { timeout: 30000 });
    const hasViewerUi = await page.$('#webar-ui');
    const hasError = await page.$('.viewer-error');
    expect(hasViewerUi || hasError).toBeTruthy();
  });

  it('統合AR UIのDOM骨格が存在する（src未指定）', async () => {
    await page.goto(`${baseURL}/#/viewer`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.viewer-error', { timeout: 30000 });
    const backButton = await page.$('#viewer-back-button');
    expect(backButton).toBeTruthy();
  });

  describe.runIf(hasAuthPassword)('認証済みフロー', () => {
    beforeEach(async () => {
      await ensureAuthenticated(page, baseURL);
    });

    it('エディター画面へ遷移できる', async () => {
      await page.goto(`${baseURL}/#/projects`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('#new-project-btn', { timeout: 20000 });
      await page.click('#new-project-btn');

      const projectName = `QR E2E ${Date.now()}`;
      await page.waitForSelector('#project-name');
      await page.type('#project-name', projectName);
      await page.click('#create-project-confirm');
      await page.waitForSelector('.project-card', { timeout: 20000 });

      const projectId = await page.$eval('.project-card:last-child', (el) => el.dataset.projectId);
      await page.goto(`${baseURL}/#/editor?project=${projectId}`, {
        waitUntil: 'networkidle0'
      });

      await page.waitForSelector('#app', { timeout: 20000 });
      expect(await page.$('#app')).toBeTruthy();
    });
  });
});
