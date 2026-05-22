/**
 * GET  /api/blob-releases?projectId=xxx  — プロジェクトの公開リリース一覧＋容量
 * GET  /api/blob-releases?scope=account   — アカウント（Blobストア）全体の使用量
 * DELETE /api/blob-releases  body: { projectId, releaseId }
 */

import {
  sanitizeProjectId,
  getAccountBlobUsage,
  listProjectReleasesFromBlob,
  deleteReleaseFromBlob,
  listProjectReleasesFromLocalFs,
  deleteReleaseFromLocalFs,
  getLocalProjectsTotalBytes,
  getQuotaInfo,
  formatBytes
} from './blob-release-utils.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN || '';
  const vercelEnv = process.env.VERCEL_ENV || '';
  const isProdLike = vercelEnv === 'production' || vercelEnv === 'preview';

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const scope = url.searchParams.get('scope');
      const projectId = url.searchParams.get('projectId');

      if (scope === 'account') {
        if (token) {
          const account = await getAccountBlobUsage(token);
          return res.status(200).json({ ok: true, account });
        }
        const localTotal = await getLocalProjectsTotalBytes();
        const quota = getQuotaInfo();
        return res.status(200).json({
          ok: true,
          account: {
            provider: 'localFs',
            totalBytes: localTotal,
            totalFormatted: formatBytes(localTotal),
            blobCount: null,
            tier: 'local',
            quotaBytes: null,
            quotaLabel: 'ローカル開発（public/projects/）。Vercel Blob の課金枠とは別です。',
            usagePercent: 0
          }
        });
      }

      const id = sanitizeProjectId(projectId);
      if (!id) {
        return res.status(400).json({ error: 'projectId is required' });
      }

      if (token) {
        const project = await listProjectReleasesFromBlob(id, token);
        let account = null;
        try {
          account = await getAccountBlobUsage(token);
        } catch (e) {
          console.warn('⚠️ アカウント使用量取得スキップ:', e.message);
        }
        return res.status(200).json({
          ok: true,
          provider: 'vercelBlob',
          projectId: id,
          ...project,
          account
        });
      }

      const project = await listProjectReleasesFromLocalFs(id);
      const localTotal = await getLocalProjectsTotalBytes();
      return res.status(200).json({
        ok: true,
        provider: 'localFs',
        projectId: id,
        ...project,
        account: {
          provider: 'localFs',
          totalBytes: localTotal,
          totalFormatted: formatBytes(localTotal),
          quotaLabel: 'ローカル public/projects/ の合計（開発用）'
        },
        message: isProdLike
          ? 'BLOB_READ_WRITE_TOKEN 未設定のためローカル一覧のみ'
          : undefined
      });
    }

    if (req.method === 'DELETE') {
      const body = await readJsonBody(req);
      const projectId = sanitizeProjectId(body.projectId);
      const releaseId = body.releaseId;

      if (!projectId || !releaseId) {
        return res.status(400).json({ error: 'projectId and releaseId are required' });
      }

      if (token) {
        const result = await deleteReleaseFromBlob(projectId, releaseId, token);
        return res.status(200).json({ ok: true, provider: 'vercelBlob', ...result });
      }

      const result = await deleteReleaseFromLocalFs(projectId, releaseId);
      return res.status(200).json({ ok: true, provider: 'localFs', ...result });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('❌ /api/blob-releases 失敗:', error);
    const status = error.status || 500;
    return res.status(status).json({
      error: 'blob-releases failed',
      message: error.message
    });
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}
