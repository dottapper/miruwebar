// src/utils/monitored-fetch.js
/**
 * fetch を監視し、多重ロードを検出・防止
 * project.json の取得回数を厳格に管理
 */

import { DEV_STRICT_MODE, DEV_VERBOSE_LOGS } from '../config/feature-flags.js';

const fetchCount = new Map(); // url -> count
const fetchLog = []; // { url, status, size, timestamp }

/**
 * 監視付きfetch（1回のみ許可）
 * @param {string} url - 取得URL
 * @param {Object} options - fetchオプション
 * @returns {Promise<Response>}
 */
export async function fetchOnce(url, options = {}) {
  const count = fetchCount.get(url) || 0;
  fetchCount.set(url, count + 1);

  if (count > 0) {
    console.warn(`[FETCH] DUPLICATE detected: ${url} (count: ${count + 1})`);
    if (DEV_STRICT_MODE && url.includes('project.json')) {
      throw new Error(`STRICT MODE: Duplicate project.json fetch blocked: ${url}`);
    }
  }

  const startTime = performance.now();
  const response = await fetch(url, options);
  const endTime = performance.now();

  // レスポンスボディのサイズを取得（cloneして読む）
  const clone = response.clone();
  const text = await clone.text();
  const size = text.length;

  const logEntry = {
    url,
    status: response.status,
    size,
    duration: Math.round(endTime - startTime),
    timestamp: new Date().toISOString()
  };

  fetchLog.push(logEntry);

  if (DEV_VERBOSE_LOGS) {
    console.info('[FETCH]', {
      url,
      status: response.status,
      size: `${(size / 1024).toFixed(2)} KB`,
      duration: `${logEntry.duration}ms`,
      count: count + 1
    });
  }

  // 大きなproject.jsonを検出（内蔵サンプルの可能性）
  // 閾値を500KBに調整（Base64エンコードされた画像データを含むプロジェクトに対応）
  if (url.includes('project.json') && size > 500000) {
    console.warn(`[FETCH] ⚠️ LARGE PROJECT.JSON: ${url} (${(size / 1024).toFixed(2)} KB)`);
    console.warn('[FETCH] This may contain embedded assets (images, etc.)');

    if (DEV_STRICT_MODE) {
      throw new Error(`STRICT MODE: Large project.json blocked (${size} bytes). Expected < 500KB.`);
    }
  }

  // 元のレスポンスボディを新しいResponseオブジェクトで返す
  return new Response(text, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

/**
 * fetch統計を取得
 * @returns {Array} [[url, count], ...]
 */
export function getFetchStats() {
  return Array.from(fetchCount.entries());
}

/**
 * fetchログを取得
 * @returns {Array} ログエントリの配列
 */
export function getFetchLog() {
  return [...fetchLog];
}

/**
 * 統計をリセット（テスト用）
 */
export function resetFetchStats() {
  fetchCount.clear();
  fetchLog.length = 0;
}

/**
 * 統計レポートをコンソールに出力
 */
export function reportFetchStats() {
  console.group('[FETCH] Statistics Report');

  console.log('Total unique URLs:', fetchCount.size);
  console.log('Total requests:', fetchLog.length);

  console.table(
    Array.from(fetchCount.entries()).map(([url, count]) => ({
      url: url.length > 60 ? '...' + url.slice(-60) : url,
      count,
      totalSize: fetchLog
        .filter(log => log.url === url)
        .reduce((sum, log) => sum + log.size, 0)
    }))
  );

  // project.json の取得回数を強調
  const projectJsonEntries = Array.from(fetchCount.entries())
    .filter(([url]) => url.includes('project.json'));

  if (projectJsonEntries.length > 0) {
    console.group('project.json fetches:');
    projectJsonEntries.forEach(([url, count]) => {
      const logs = fetchLog.filter(log => log.url === url);
      const totalSize = logs.reduce((sum, log) => sum + log.size, 0);
      console.log(`${url}:`);
      console.log(`  Count: ${count}`);
      console.log(`  Total Size: ${(totalSize / 1024).toFixed(2)} KB`);
      if (count > 1) {
        console.warn(`  ⚠️ MULTIPLE FETCHES DETECTED`);
      }
      if (totalSize > 500000) {
        console.warn(`  ⚠️ LARGE PROJECT.JSON (may contain embedded assets)`);
      }
    });
    console.groupEnd();
  }

  console.groupEnd();
}

// デバッグ用にwindowに露出
if (typeof window !== 'undefined') {
  window.__fetchStats = getFetchStats;
  window.__fetchLog = getFetchLog;
  window.__fetchReport = reportFetchStats;
}

export default {
  fetchOnce,
  getFetchStats,
  getFetchLog,
  resetFetchStats,
  reportFetchStats
};
