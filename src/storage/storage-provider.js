// src/storage/storage-provider.js
// 公開リリースのストレージ抽象層。
//
// publishRelease() を唯一の公開エントリポイントとし、内部でプロバイダを切り替える。
// - vercelBlob: 既定プロバイダ。/api/publish-project に POST して公開する。
//   （開発時は Vite プラグインが public/projects/ に書き出す。本番では
//    api/publish-project.js が動作する。永続化を Vercel Blob に切り替える場合は
//    サーバ側 api/publish-project.js を @vercel/blob 対応に更新する。）
// - firebase: 後方互換プロバイダ。既存の publishProjectToFirebase() を利用する。
//
// プロバイダは環境変数 VITE_STORAGE_PROVIDER で切り替え可能（既定は vercelBlob）。

import { createLogger } from '../utils/logger.js';

const logger = createLogger('StorageProvider');

export const DEFAULT_PROVIDER = 'vercelBlob';

/** Blob を data URL(base64) に変換する */
const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

/** transform を viewer 互換の [x,y,z] 配列に正規化する */
const toVec3 = (value, fallback) => {
  if (Array.isArray(value) && value.length >= 3) {
    return value.slice(0, 3).map((v, i) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback[i];
    });
  }
  if (value && typeof value === 'object') {
    const x = Number(value.x);
    const y = Number(value.y);
    const z = Number(value.z);
    return [
      Number.isFinite(x) ? x : fallback[0],
      Number.isFinite(y) ? y : fallback[1],
      Number.isFinite(z) ? z : fallback[2]
    ];
  }
  return [...fallback];
};

const normalizeTransform = (model) => {
  const transform = model?.transform || {};
  return {
    position: toVec3(model?.position || transform.position, [0, 0, 0]),
    rotation: toVec3(model?.rotation || transform.rotation, [0, 0, 0]),
    scale: toVec3(model?.scale || transform.scale, [1, 1, 1])
  };
};

/**
 * vercelBlob プロバイダ: /api/publish-project に POST して公開する。
 * @param {Object} projectData - 正規化済みプロジェクトデータ
 * @returns {Promise<{provider:string, viewerUrl:string, projectUrl:string}>}
 */
async function publishViaVercelBlob(projectData) {
  const models = [];
  for (const m of projectData.modelData || projectData.models || []) {
    if (!m || !m.blob) continue;
    const dataBase64 = await blobToBase64(m.blob);
    const { position, rotation, scale } = normalizeTransform(m);
    models.push({
      fileName: m.fileName || 'model.glb',
      dataBase64,
      position,
      rotation,
      scale
    });
  }

  const payload = {
    id: projectData.id,
    type: projectData.type || 'markerless',
    loadingScreen: projectData.loadingScreen || null,
    startScreen: projectData.startScreen || null,
    guideScreen: projectData.guideScreen || null,
    markerImage: projectData.markerImage || projectData.markerImageUrl || null,
    markerPattern: projectData.markerPattern || null,
    arSettings: projectData.arSettings || null,
    models
  };

  const resp = await fetch('/api/publish-project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    let message = `公開APIエラー (HTTP ${resp.status})`;
    try {
      const err = await resp.json();
      if (err && (err.message || err.error)) message = err.message || err.error;
    } catch (_) { /* JSON でないレスポンスは無視 */ }
    throw new Error(message);
  }

  const data = await resp.json();
  if (!data || !data.viewerUrl) {
    throw new Error('公開APIがビューアURLを返しませんでした');
  }

  return {
    // API が返す実プロバイダ（vercelBlob / localFs）を尊重する
    provider: data.provider || 'vercelBlob',
    viewerUrl: data.viewerUrl,
    projectUrl: data.projectUrl || '',
    releaseId: data.releaseId || ''
  };
}

/**
 * firebase プロバイダ（後方互換）: 既存の publishProjectToFirebase() を利用する。
 * @param {Object} projectData - 正規化済みプロジェクトデータ
 * @returns {Promise<{provider:string, viewerUrl:string, projectUrl:string}>}
 */
async function publishViaFirebase(projectData) {
  const { publishProjectToFirebase } = await import('../firebase/storage.js');
  const result = await publishProjectToFirebase({
    id: projectData.id,
    name: projectData.name || 'Untitled',
    type: projectData.type || 'markerless',
    modelData: projectData.modelData || projectData.models || [],
    loadingScreen: projectData.loadingScreen || null,
    startScreen: projectData.startScreen || null,
    guideScreen: projectData.guideScreen || null,
    theme: projectData.theme || null,
    markerImage: projectData.markerImage || projectData.markerImageUrl || null,
    markerPattern: projectData.markerPattern || null,
    arSettings: projectData.arSettings || {}
  });
  return {
    provider: 'firebase',
    viewerUrl: result.viewerUrl,
    projectUrl: result.projectUrl || ''
  };
}

const PROVIDERS = {
  vercelBlob: publishViaVercelBlob,
  firebase: publishViaFirebase
};

/**
 * 有効なプロバイダ名を返す（環境変数 > 既定）。
 * @returns {string}
 */
export function getActiveProviderName() {
  let configured = '';
  try {
    const env = import.meta.env || {};
    configured = String(env.VITE_STORAGE_PROVIDER || '').trim();
  } catch (_) { /* import.meta 非対応環境は無視 */ }
  if (configured && PROVIDERS[configured]) return configured;
  return DEFAULT_PROVIDER;
}

/**
 * 公開リリースを作成する。
 * @param {Object} projectData - プロジェクトデータ（modelData にモデルの blob を含む）
 * @param {Object} [options]
 * @param {string} [options.provider] - 明示的にプロバイダを指定する場合
 * @returns {Promise<{provider:string, viewerUrl:string, projectUrl:string}>}
 */
export async function publishRelease(projectData, options = {}) {
  if (!projectData || !projectData.id) {
    throw new Error('プロジェクトデータが不正です（id がありません）');
  }
  const providerName = options.provider || getActiveProviderName();
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(`未対応のストレージプロバイダ: ${providerName}`);
  }

  logger.info('公開リリース開始', { provider: providerName, projectId: projectData.id });
  const result = await provider(projectData);
  logger.info('公開リリース完了', result);
  return result;
}
