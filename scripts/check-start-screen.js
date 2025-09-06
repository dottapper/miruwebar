#!/usr/bin/env node
// Simple headless verification of the AR viewer start screen layout.
// 1) Build app
// 2) Run `vite preview`
// 3) Open viewer route with Puppeteer
// 4) Assert logo/title/button do not overlap and screenshot the result

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import fs from 'node:fs';
import path from 'node:path';

const PORT = process.env.PREVIEW_PORT || 4173; // vite.config.jsのpreview portに合わせる
const PROJECT_ID = process.env.PROJECT_ID || '1756795802459';
const URL = `http://localhost:${PORT}/#/viewer?src=/projects/${PROJECT_ID}/project.json`;

function run(cmd, args, opts={}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: false, ...opts });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve(); else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return;
    } catch (_) {}
    await delay(300);
  }
  throw new Error(`Server did not respond at ${url} within ${timeoutMs}ms`);
}

async function main() {
  console.log('🔧 Building app...');
  await run('npm', ['run', 'build']);

  console.log(`🚀 Starting vite preview on :${PORT} ...`);
  const preview = spawn('npx', ['vite', 'preview', '--strictPort', '--port', String(PORT)], {
    stdio: 'inherit'
  });

  try {
    await waitForServer(`http://localhost:${PORT}/`);
    console.log('✅ Preview server ready');
  } catch (e) {
    preview.kill('SIGKILL');
    throw e;
  }

  // Ensure output dir exists
  const outDir = path.resolve('tests');
  fs.mkdirSync(outDir, { recursive: true });

  console.log('🧭 Launching headless browser to verify start screen...');
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 }); // iPhone 12-ish

  await page.goto(URL, { waitUntil: 'networkidle2' });

  // Wait for the viewer shell and start screen to appear
  await page.waitForSelector('#ar-start-screen', { visible: true, timeout: 20000 });

  // Give styles a tiny moment to settle
  await delay(500);

  // Grab bounding boxes
  const boxes = await page.evaluate(() => {
    function rect(sel) {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);
      return { sel, top: r.top, bottom: r.bottom, left: r.left, right: r.right, display: styles.display, position: styles.position };
    }
    return {
      start: rect('#ar-start-screen'),
      logo: rect('#ar-start-logo'),
      title: rect('#ar-start-title'),
      cta: rect('#ar-start-cta')
    };
  });

  console.log('📐 Element boxes:', boxes);

  // Basic non-overlap checks (allow small tolerance)
  const tol = 2;
  const ok1 = !boxes.logo || (boxes.logo.bottom + tol <= boxes.title.top);
  const ok2 = boxes.title.bottom + tol <= boxes.cta.top;

  const shotPath = path.join(outDir, 'start-screen-after-fix.png');
  await page.screenshot({ path: shotPath, fullPage: true });
  console.log(`🖼️ Saved screenshot: ${shotPath}`);

  await browser.close();
  preview.kill('SIGINT');

  if (!ok2 || !ok1) {
    throw new Error('Start screen elements overlap. See screenshot for details.');
  }

  console.log('✅ Start screen layout verified: no overlap and elements visible.');
}

main().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});

