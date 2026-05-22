/**
 * Puppeteer E2E 共通セットアップ
 */
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import { ensureDevServer, stopDevServer } from './e2e-dev-server.js';

dotenv.config();

export const PUPPETEER_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',
  '--use-fake-ui-for-media-stream',
  '--use-fake-device-for-media-stream',
  '--ignore-certificate-errors',
  '--allow-running-insecure-content',
  '--disable-web-security'
];

/**
 * Puppeteer + 開発サーバーをセットアップ
 * @returns {Promise<{ browser: import('puppeteer').Browser, baseURL: string, serverProc: import('node:child_process').ChildProcess | null }>}
 */
export async function setupPuppeteerE2E() {
  const { baseURL, proc } = await ensureDevServer();
  const browser = await puppeteer.launch({
    headless: true,
    args: PUPPETEER_LAUNCH_ARGS
  });

  return { browser, baseURL, serverProc: proc };
}

/**
 * Puppeteer E2E の後片付け
 * @param {{ browser?: import('puppeteer').Browser, serverProc?: import('node:child_process').ChildProcess | null }} ctx
 */
export async function teardownPuppeteerE2E(ctx) {
  if (ctx.browser) {
    await ctx.browser.close();
  }
  stopDevServer(ctx.serverProc);
}

/**
 * 開発サーバー認証を通過（AUTH_SECRET 未設定時はスキップ）
 * @param {import('puppeteer').Page} page
 * @param {string} baseURL
 */
export async function ensureAuthenticated(page, baseURL) {
  await page.goto(`${baseURL}/#/projects`, {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  const projectsReady = await page.$('#new-project-btn');
  if (projectsReady) {
    return;
  }

  const password = process.env.AUTH_PASSWORD;
  if (!password) {
    throw new Error('E2E認証には AUTH_PASSWORD 環境変数（.env）が必要です');
  }

  await page.waitForSelector('#login-password', { timeout: 15000 });
  await page.type('#login-password', password, { delay: 20 });
  await page.click('#login-btn-submit');

  await page.waitForSelector('#new-project-btn', { timeout: 20000 });
}
