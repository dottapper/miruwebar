/**
 * Vercel Blob / ローカル公開リリースの一覧・削除ユーティリティ
 */

import fs from 'fs/promises';
import path from 'path';
import { list, del } from '@vercel/blob';

/** Hobby 無料枠（全 Blob ストア合計）。Pro は 5GB 込み＋従量 */
export const BLOB_QUOTA = {
  hobby: { bytes: 1 * 1024 * 1024 * 1024, label: 'Hobby 無料枠 1GB/月（アカウント内の全 Blob ストア合計）' },
  pro: { bytes: 5 * 1024 * 1024 * 1024, label: 'Pro 込み 5GB/月（超過分は従量課金）' }
};

const RELEASE_PATH_RE = /^projects\/([^/]+)\/releases\/([^/]+)\//;

export function sanitizeProjectId(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || '';
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function getQuotaInfo() {
  const tier = String(process.env.BLOB_QUOTA_TIER || 'hobby').toLowerCase();
  const q = BLOB_QUOTA[tier] || BLOB_QUOTA.hobby;
  return { tier, quotaBytes: q.bytes, quotaLabel: q.label };
}

/**
 * Blob ストア全体の使用量（アカウント内・全プロジェクト合算）
 */
export async function getAccountBlobUsage(token) {
  let cursor;
  let totalBytes = 0;
  let blobCount = 0;

  do {
    const result = await list({
      token,
      cursor,
      limit: 1000,
      prefix: 'projects/'
    });
    for (const blob of result.blobs) {
      totalBytes += blob.size || 0;
      blobCount += 1;
    }
    cursor = result.cursor;
  } while (cursor);

  const quota = getQuotaInfo();
  return {
    provider: 'vercelBlob',
    totalBytes,
    totalFormatted: formatBytes(totalBytes),
    blobCount,
    ...quota,
    usagePercent: quota.quotaBytes > 0
      ? Math.min(100, (totalBytes / quota.quotaBytes) * 100)
      : 0
  };
}

/**
 * プロジェクト単位の公開リリース一覧（Blob）
 */
export async function listProjectReleasesFromBlob(projectId, token) {
  const id = sanitizeProjectId(projectId);
  if (!id) return { releases: [], projectTotalBytes: 0 };

  const prefix = `projects/${id}/releases/`;
  const releaseMap = new Map();
  let cursor;

  do {
    const result = await list({
      token,
      cursor,
      limit: 1000,
      prefix
    });

    for (const blob of result.blobs) {
      const match = blob.pathname.match(RELEASE_PATH_RE);
      if (!match) continue;
      const releaseId = match[2];
      if (!releaseMap.has(releaseId)) {
        releaseMap.set(releaseId, {
          releaseId,
          totalBytes: 0,
          fileCount: 0,
          urls: [],
          projectUrl: null,
          publishedAt: null
        });
      }
      const entry = releaseMap.get(releaseId);
      entry.totalBytes += blob.size || 0;
      entry.fileCount += 1;
      entry.urls.push(blob.url);
      if (blob.pathname.endsWith('/project.json')) {
        entry.projectUrl = blob.url;
        entry.publishedAt = blob.uploadedAt || null;
      }
    }
    cursor = result.cursor;
  } while (cursor);

  const releases = Array.from(releaseMap.values())
    .map((r) => ({
      ...r,
      totalFormatted: formatBytes(r.totalBytes),
      urls: undefined
    }))
    .sort((a, b) => {
      const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return tb - ta;
    });

  const projectTotalBytes = releases.reduce((sum, r) => sum + r.totalBytes, 0);
  return { releases, projectTotalBytes, projectTotalFormatted: formatBytes(projectTotalBytes) };
}

/**
 * リリース配下の Blob を一括削除
 */
export async function deleteReleaseFromBlob(projectId, releaseId, token) {
  const id = sanitizeProjectId(projectId);
  const safeRelease = String(releaseId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  if (!id || !safeRelease) {
    throw Object.assign(new Error('projectId と releaseId が必要です'), { status: 400 });
  }

  const prefix = `projects/${id}/releases/${safeRelease}/`;
  const blobs = [];
  let cursor;

  do {
    const result = await list({ token, cursor, limit: 1000, prefix });
    blobs.push(...result.blobs);
    cursor = result.cursor;
  } while (cursor);

  if (blobs.length === 0) {
    return { deletedCount: 0, freedBytes: 0, freedFormatted: '0 B' };
  }

  const freedBytes = blobs.reduce((s, b) => s + (b.size || 0), 0);
  const urls = blobs.map((b) => b.url);
  const BATCH = 100;
  for (let i = 0; i < urls.length; i += BATCH) {
    await del(urls.slice(i, i + BATCH), { token });
  }

  return {
    deletedCount: urls.length,
    freedBytes,
    freedFormatted: formatBytes(freedBytes)
  };
}

async function dirSizeRecursive(dirPath) {
  let total = 0;
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const ent of entries) {
    const full = path.join(dirPath, ent.name);
    if (ent.isDirectory()) {
      total += await dirSizeRecursive(full);
    } else if (ent.isFile()) {
      const stat = await fs.stat(full);
      total += stat.size;
    }
  }
  return total;
}

/**
 * ローカル public/projects の公開一覧
 */
export async function listProjectReleasesFromLocalFs(projectId, rootDir = process.cwd()) {
  const id = sanitizeProjectId(projectId);
  if (!id) return { releases: [], projectTotalBytes: 0 };

  const projectDir = path.join(rootDir, 'public', 'projects', id);
  const releasesDir = path.join(projectDir, 'releases');
  const releases = [];

  try {
    const releaseEntries = await fs.readdir(releasesDir, { withFileTypes: true });
    for (const ent of releaseEntries) {
      if (!ent.isDirectory()) continue;
      const releaseId = ent.name;
      const size = await dirSizeRecursive(path.join(releasesDir, releaseId));
      let publishedAt = null;
      try {
        const stat = await fs.stat(path.join(releasesDir, releaseId, 'project.json'));
        publishedAt = stat.mtime.toISOString();
      } catch { /* project.json なし */ }
      releases.push({
        releaseId,
        totalBytes: size,
        totalFormatted: formatBytes(size),
        fileCount: 0,
        projectUrl: `/projects/${id}/releases/${releaseId}/project.json`,
        publishedAt
      });
    }
  } catch {
    /* releases フォルダなし → レガシー単一公開 */
  }

  try {
    const stat = await fs.stat(path.join(projectDir, 'project.json'));
    const legacySize = await dirSizeRecursive(projectDir);
    const hasLegacy = releases.length === 0 || legacySize > 0;
    if (hasLegacy && !(releases.length === 1 && releases[0].releaseId === 'local-latest')) {
      const alreadyLegacy = releases.some((r) => r.releaseId === 'local-latest');
      if (!alreadyLegacy) {
        releases.push({
          releaseId: 'local-latest',
          totalBytes: legacySize,
          totalFormatted: formatBytes(legacySize),
          fileCount: 0,
          projectUrl: `/projects/${id}/project.json`,
          publishedAt: stat.mtime.toISOString()
        });
      }
    }
  } catch { /* 未公開 */ }

  releases.sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });

  const projectTotalBytes = releases.reduce((sum, r) => sum + r.totalBytes, 0);
  return {
    releases,
    projectTotalBytes,
    projectTotalFormatted: formatBytes(projectTotalBytes)
  };
}

export async function deleteReleaseFromLocalFs(projectId, releaseId, rootDir = process.cwd()) {
  const id = sanitizeProjectId(projectId);
  const safeRelease = String(releaseId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  if (!id || !safeRelease) {
    throw Object.assign(new Error('projectId と releaseId が必要です'), { status: 400 });
  }

  if (safeRelease === 'local-latest') {
    const projectDir = path.join(rootDir, 'public', 'projects', id);
    const size = await dirSizeRecursive(projectDir);
    await fs.rm(projectDir, { recursive: true, force: true });
    return {
      deletedCount: 1,
      freedBytes: size,
      freedFormatted: formatBytes(size)
    };
  }

  const releaseDir = path.join(rootDir, 'public', 'projects', id, 'releases', safeRelease);
  const size = await dirSizeRecursive(releaseDir);
  await fs.rm(releaseDir, { recursive: true, force: true });
  return {
    deletedCount: 1,
    freedBytes: size,
    freedFormatted: formatBytes(size)
  };
}

export async function getLocalProjectsTotalBytes(rootDir = process.cwd()) {
  const projectsRoot = path.join(rootDir, 'public', 'projects');
  let total = 0;
  try {
    const ids = await fs.readdir(projectsRoot, { withFileTypes: true });
    for (const ent of ids) {
      if (ent.isDirectory()) {
        total += await dirSizeRecursive(path.join(projectsRoot, ent.name));
      }
    }
  } catch { /* 未作成 */ }
  return total;
}

export { formatBytes, getQuotaInfo };
