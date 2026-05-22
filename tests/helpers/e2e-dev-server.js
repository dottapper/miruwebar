/**
 * Puppeteer E2E 用の開発サーバー起動ヘルパー
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

/**
 * サーバー応答を待機
 * @param {string} url
 * @param {number} timeoutMs
 */
function probeServer(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const request = client.request(
      url,
      { method: 'GET', timeout: timeoutMs, rejectUnauthorized: false },
      (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve(response.statusCode);
        } else {
          reject(new Error(`Unexpected status: ${response.statusCode}`));
        }
      }
    );

    request.on('timeout', () => {
      request.destroy();
      reject(new Error('timeout'));
    });
    request.on('error', reject);
    request.end();
  });
}

export async function waitForServer(url, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      await probeServer(url, 5000);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error(`サーバーが ${timeoutMs}ms 以内に起動しませんでした: ${url}`);
}

/**
 * Vite 開発サーバーを起動（未起動の場合のみ）
 * @returns {Promise<{ baseURL: string, proc: import('node:child_process').ChildProcess | null }>}
 */
export async function ensureDevServer() {
  const baseURL = process.env.TEST_BASE_URL || 'https://localhost:3000';

  try {
    await waitForServer(baseURL, 15000);
    return { baseURL, proc: null };
  } catch {
    // 未起動なら vite を起動
  }

  const proc = spawn('npm', ['run', 'dev'], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      NODE_TLS_REJECT_UNAUTHORIZED: '0'
    }
  });

  proc.stdout?.on('data', (chunk) => {
    const text = chunk.toString();
    if (text.includes('error') || text.includes('Error')) {
      console.error('[e2e-dev-server]', text.trim());
    }
  });

  proc.stderr?.on('data', (chunk) => {
    console.error('[e2e-dev-server]', chunk.toString().trim());
  });

  try {
    await waitForServer(baseURL, 90000);
    return { baseURL, proc };
  } catch (spawnError) {
    proc.kill('SIGTERM');

    // ポート競合などで起動に失敗しても、既存サーバーがあれば続行
    try {
      await waitForServer(baseURL, 15000);
      return { baseURL, proc: null };
    } catch {
      throw spawnError;
    }
  }
}

/**
 * 開発サーバープロセスを停止
 * @param {import('node:child_process').ChildProcess | null} proc
 */
export function stopDevServer(proc) {
  if (proc && !proc.killed) {
    proc.kill('SIGTERM');
  }
}
