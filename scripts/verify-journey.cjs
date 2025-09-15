#!/usr/bin/env node
// scripts/verify-journey.js
// End-to-end verification for Start -> Loading -> Guide flow with project-only config

const http = require('http');
const https = require('https');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

(async () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3001';
  const publishURL = new URL('/api/publish-project', baseURL).toString();
  const projectId = 'verify-flow-project';

  const startScreen = {
    template: 'modern',
    backgroundColor: '#2c3e50',
    textColor: '#ffffff',
    title: '検証: スタート',
    buttonText: '開始',
    buttonColor: '#007bff',
    buttonTextColor: '#ffffff',
    logoImage: null
  };

  const loadingScreen = {
    backgroundColor: '#000000',
    textColor: '#ffffff',
    progressColor: '#007bff',
    message: '検証: 読み込み中...',
    template: 'simple',
    showProgress: true
  };

  const guideScreen = {
    mode: 'surface',
    title: '検証: ガイド',
    description: '画面の指示に従ってください',
    backgroundColor: '#2c3e50',
    textColor: '#ffffff'
  };

  // simple request helper
  function requestJSON(method, url, body) {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const isHttps = u.protocol === 'https:';
      const lib = isHttps ? https : http;
      const data = body ? JSON.stringify(body) : undefined;
      const req = lib.request(
        {
          method,
          hostname: u.hostname,
          port: u.port,
          path: u.pathname + (u.search || ''),
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': data ? Buffer.byteLength(data) : 0
          },
          rejectUnauthorized: false
        },
        (res) => {
          let buf = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => (buf += chunk));
          res.on('end', () => {
            try {
              const json = buf ? JSON.parse(buf) : {};
              resolve({ status: res.statusCode, json });
            } catch (e) {
              reject(e);
            }
          });
        }
      );
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }

  // 1) Publish project.json
  const publishBody = {
    id: projectId,
    type: 'markerless',
    loadingScreen,
    startScreen,
    guideScreen,
    models: []
  };
  const pub = await requestJSON('POST', publishURL, publishBody);
  if (pub.status !== 200) {
    console.error('❌ publish failed:', pub.status, pub.json);
    process.exit(1);
  }
  const projectUrl = new URL(`/projects/${projectId}/project.json`, baseURL).toString();
  console.log('✅ published:', projectUrl);

  // 2) Launch Puppeteer and verify
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--ignore-certificate-errors',
      '--allow-running-insecure-content'
    ]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const viewerUrl = `${baseURL}/#/viewer?src=${encodeURIComponent(projectUrl)}&cfg=project-only`;
  await page.goto(viewerUrl, { waitUntil: 'networkidle2', timeout: 60000 });

  // Wait for start screen
  await page.waitForSelector('.unified-loading-screen', { timeout: 20000 });

  // Verify background color
  const bgColor = await page.evaluate(() => {
    const el = document.querySelector('.unified-loading-screen');
    return window.getComputedStyle(el).backgroundColor;
  });
  console.log('BG:', bgColor);

  // Verify title and button text
  const titleText = await page.evaluate(() => {
    const t = document.querySelector('.start-title, .unified-loading-title');
    return t ? t.textContent : null;
  });
  const btnText = await page.evaluate(() => {
    const b = document.querySelector('#ar-start-cta, .start-button');
    return b ? b.textContent : null;
  });
  console.log('Title:', titleText, 'Button:', btnText);

  // Click CTA to move to guide
  await page.click('#ar-start-cta');
  await page.waitForSelector('#ar-guide-screen', { timeout: 20000 });

  // Verify guide bg color
  const guideBg = await page.evaluate(() => {
    const g = document.querySelector('#ar-guide-screen');
    return g ? window.getComputedStyle(g).backgroundColor : null;
  });
  console.log('Guide BG:', guideBg);

  // Basic assertions
  function toRGB(hex) {
    // very small helper for #rrggbb
    if (/^#([0-9a-f]{6})$/i.test(hex)) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgb(${r}, ${g}, ${b})`;
    }
    return hex;
  }

  const expectBg = toRGB(startScreen.backgroundColor);
  const expectGuide = toRGB(guideScreen.backgroundColor);

  if (bgColor !== expectBg) throw new Error(`Start BG mismatch: ${bgColor} != ${expectBg}`);
  if (!titleText || titleText.indexOf(startScreen.title) === -1) throw new Error(`Start title mismatch: ${titleText}`);
  if (!btnText || btnText.indexOf(startScreen.buttonText) === -1) throw new Error(`Start button mismatch: ${btnText}`);
  if (guideBg !== expectGuide) throw new Error(`Guide BG mismatch: ${guideBg} != ${expectGuide}`);

  console.log('✅ Verification passed');
  await browser.close();
  process.exit(0);
})().catch((e) => {
  console.error('❌ verify error:', e);
  process.exit(1);
});
