/**
 * 公開リリース（Vercel Blob / ローカル）の一覧・削除 API クライアント
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('BlobReleases');

export function formatStorageBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

/**
 * 今回の公開で送る見込みサイズ（モデル blob の合計）
 */
export function estimatePublishPayloadBytes(projectData) {
  const models = projectData?.modelData || projectData?.models || [];
  let total = 0;
  for (const m of models) {
    if (m?.blob?.size) total += m.blob.size;
    else if (m?.fileSize) total += Number(m.fileSize) || 0;
  }
  return total;
}

/**
 * @param {string} projectId
 */
export async function fetchProjectBlobReleases(projectId) {
  const resp = await fetch(`/api/blob-releases?projectId=${encodeURIComponent(projectId)}`);
  if (!resp.ok) {
    let message = `一覧取得失敗 (HTTP ${resp.status})`;
    try {
      const err = await resp.json();
      if (err?.message) message = err.message;
    } catch (_) { /* ignore */ }
    throw new Error(message);
  }
  return resp.json();
}

/**
 * @param {string} projectId
 * @param {string} releaseId
 */
export async function deleteProjectBlobRelease(projectId, releaseId) {
  const resp = await fetch('/api/blob-releases', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, releaseId })
  });
  if (!resp.ok) {
    let message = `削除失敗 (HTTP ${resp.status})`;
    try {
      const err = await resp.json();
      if (err?.message) message = err.message;
    } catch (_) { /* ignore */ }
    throw new Error(message);
  }
  return resp.json();
}

export async function fetchAccountBlobUsage() {
  try {
    const resp = await fetch('/api/blob-releases?scope=account');
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.account || null;
  } catch (error) {
    logger.warn('アカウント使用量取得失敗:', error);
    return null;
  }
}
