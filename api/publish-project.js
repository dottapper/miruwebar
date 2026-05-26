/**
 * Vercel Serverless Function: プロジェクト公開API
 * POST /api/publish-project
 *
 * 公開リリースを Vercel Blob に保存する。
 * - BLOB_READ_WRITE_TOKEN がある場合: Vercel Blob にアップロード（本番/Preview用）
 * - トークンが無く本番/Previewの場合: エラーを返す（/tmp 保存で「成功」と偽らない）
 * - トークンが無くローカル開発（vercel dev）の場合: public/projects/ にファイル書き出し
 *
 * 注意: 通常のローカル開発（npm run dev）は Vite プラグイン
 * （vite/plugins/projectsApi.js）が同じパスを処理するため、このファイルは
 * Vercel 環境（デプロイ / vercel dev）でのみ実行される。
 */

import fs from 'fs/promises';
import path from 'path';
import { put } from '@vercel/blob';

// セキュリティ: IDとファイル名の検証
const sanitizeId = (id) => String(id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'project';
const sanitizeFileName = (name) => {
  const base = (name || 'model.glb').toString();
  const just = base.split(/[\\/]/).pop();
  const safe = just.replace(/[^a-zA-Z0-9._-]/g, '_');
  return safe.slice(0, 100) || 'model.glb';
};
const isAllowedExt = (name) => /\.(glb|gltf)$/i.test(name);

const MAX_LOCAL_MODEL_BYTES = 50 * 1024 * 1024; // 50MB/1 file（ローカル開発用）
const MAX_LOCAL_TOTAL_BYTES = 100 * 1024 * 1024; // 100MB/req（ローカル開発用）
// Vercel Functions の server upload はリクエストサイズに制限がある。
// Base64化で約33%増えるため、Blob本番公開では小さめに制限し、
// 大容量対応は @vercel/blob/client の直接アップロードへ移行する。
const MAX_VERCEL_BODY_BYTES = 4 * 1024 * 1024;
const MAX_BLOB_MODEL_BYTES = 3 * 1024 * 1024;
const MAX_BLOB_TOTAL_BYTES = 3 * 1024 * 1024;

/** [x,y,z] 配列に正規化 */
const normalizeVec3 = (value, fallback) => {
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

/** data URL から { buffer, contentType } を取り出す。data URL でなければ null */
const decodeDataUrl = (value) => {
  if (typeof value !== 'string' || !value.startsWith('data:')) return null;
  const match = value.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (!match) return null;
  const contentType = match[1] || 'application/octet-stream';
  const base64 = (match[3] || '').split(',').pop();
  return { buffer: Buffer.from(base64, 'base64'), contentType };
};

export default async function handler(req, res) {
  // CORSヘッダー設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 公開先の決定
    const token = process.env.BLOB_READ_WRITE_TOKEN || '';
    const vercelEnv = process.env.VERCEL_ENV || '';
    const isProdLike = vercelEnv === 'production' || vercelEnv === 'preview';
    const requestLimit = token || isProdLike ? MAX_VERCEL_BODY_BYTES : 150 * 1024 * 1024;

    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > requestLimit) {
      return res.status(413).json({
        error: 'payload too large',
        message: token || isProdLike
          ? '公開リリースのデータが大きすぎます。現在の本番公開は小容量モデルのみ対応しています。大きいGLBはclient upload対応後に公開してください。'
          : 'payload too large'
      });
    }

    const body = await readRequestBody(req, requestLimit);
    const parsed = JSON.parse(body || '{}');
    const {
      id: rawId,
      type = 'markerless',
      loadingScreen = null,
      startScreen = null,
      guideScreen = null,
      markerImage = null,
      markerPattern = null,
      arSettings = null,
      effects = [],
      models = []
    } = parsed;
    const normalizedEffects = Array.isArray(effects) ? effects : [];
    const id = sanitizeId(rawId);
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    // リリースIDを発行（毎回ユニーク。過去のリリースを上書きしない）
    const releaseId = `rel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    if (!token && isProdLike) {
      // 本番/Preview でトークンが無い場合は「成功」と偽らずエラーにする
      return res.status(500).json({
        error: 'blob token missing',
        message: 'BLOB_READ_WRITE_TOKEN が設定されていません。Vercel の環境変数に Blob トークンを追加してください。'
      });
    }

    const scheme = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const appOrigin = `${scheme}://${host}`;

    if (token) {
      // ===== Vercel Blob にアップロード =====
      const result = await publishToBlob({
        id, releaseId, type, token,
        loadingScreen, startScreen, guideScreen, markerImage, markerPattern, arSettings, effects: normalizedEffects, models
      });
      const viewerUrl = `${appOrigin}/#/viewer?src=${encodeURIComponent(result.projectUrl)}`;
      return res.status(200).json({
        ok: true,
        provider: 'vercelBlob',
        projectUrl: result.projectUrl,
        viewerUrl,
        releaseId
      });
    }

    // ===== ローカル開発フォールバック（vercel dev）: public/projects/ に書き出し =====
    await publishToLocalFs({
      id, type, loadingScreen, startScreen, guideScreen, markerImage, markerPattern, arSettings, effects: normalizedEffects, models
    });
    const projectUrl = `${appOrigin}/projects/${id}/project.json`;
    const viewerUrl = `${appOrigin}/#/viewer?src=${encodeURIComponent(projectUrl)}`;
    return res.status(200).json({
      ok: true,
      provider: 'localFs',
      projectUrl,
      viewerUrl,
      releaseId,
      message: '⚠️ ローカル開発モード: public/projects/ に書き出しました（Blob未使用）'
    });
  } catch (error) {
    if (error && error.status === 413) {
      return res.status(413).json({ error: 'payload too large' });
    }
    console.error('❌ /api/publish-project 失敗:', error);
    return res.status(500).json({
      error: 'publish failed',
      message: error.message
    });
  }
}

/**
 * Vercel Blob にプロジェクト一式をアップロードする。
 * モデル/画像を先にアップロードし、返却された絶対URLで project.json を構築する。
 */
async function publishToBlob(input) {
  const { id, releaseId, type, token, loadingScreen, startScreen, guideScreen, markerImage, markerPattern, arSettings, effects = [], models } = input;
  const base = `projects/${id}/releases/${releaseId}`;
  // addRandomSuffix: true → ファイル名にランダム文字列が付与され URL が推測不能になる。
  // project.json 内のURLや viewerUrl は put() が返す blob.url を使うため透過的に動作する。
  const putOpts = { access: 'public', token, addRandomSuffix: true };

  // 1. モデル（GLB）をアップロード
  const modelEntries = [];
  let totalBytes = 0;
  for (const m of models) {
    let fileName = sanitizeFileName(m.fileName || 'model.glb');
    if (!isAllowedExt(fileName)) fileName = `${fileName}.glb`;
    const base64 = String(m.dataBase64 || '').split(',').pop();
    if (!base64) continue;
    const buf = Buffer.from(base64, 'base64');
    if (buf.length > MAX_BLOB_MODEL_BYTES) {
      throw new Error(`file too large: ${fileName} (${buf.length} bytes)`);
    }
    totalBytes += buf.length;
    if (totalBytes > MAX_BLOB_TOTAL_BYTES) {
      throw new Error(`total size exceeded (${totalBytes} bytes)`);
    }
    const blob = await put(`${base}/assets/${fileName}`, buf, {
      ...putOpts,
      contentType: 'model/gltf-binary'
    });
    modelEntries.push({
      url: blob.url,
      fileName,
      fileSize: buf.length,
      position: normalizeVec3(m.position || (m.transform || {}).position, [0, 0, 0]),
      rotation: normalizeVec3(m.rotation || (m.transform || {}).rotation, [0, 0, 0]),
      scale: normalizeVec3(m.scale || (m.transform || {}).scale, [1, 1, 1])
    });
  }

  // 2. ローディング画面のロゴをアップロード
  const lsOut = loadingScreen ? { ...loadingScreen } : null;
  if (lsOut) {
    const decoded = decodeDataUrl(lsOut.logoImage || lsOut.logo);
    if (decoded) {
      if (decoded.buffer.length > 2 * 1024 * 1024) throw new Error('logo too large');
      const ext = decoded.contentType.includes('jpeg') ? 'jpg' : (decoded.contentType.split('/')[1] || 'png');
      const blob = await put(`${base}/assets/loading-logo.${ext}`, decoded.buffer, {
        ...putOpts,
        contentType: decoded.contentType
      });
      lsOut.logo = blob.url;
      delete lsOut.logoImage;
    }
  }

  // 3. マーカー画像をアップロード（data URL の場合のみ。既にURLならそのまま）
  let markerImageUrl = markerImage;
  const decodedMarker = decodeDataUrl(markerImage);
  if (decodedMarker) {
    if (decodedMarker.buffer.length > 4 * 1024 * 1024) throw new Error('marker image too large');
    const ext = decodedMarker.contentType.includes('jpeg') ? 'jpg' : (decodedMarker.contentType.split('/')[1] || 'png');
    const blob = await put(`${base}/assets/marker.${ext}`, decodedMarker.buffer, {
      ...putOpts,
      contentType: decodedMarker.contentType
    });
    markerImageUrl = blob.url;
  }

  // 4. project.json を構築（すべて絶対URL）してアップロード
  //    形式は docs/product-spec.md §7 の v2 を唯一の現行スキーマとする。
  const projectJson = {
    schemaVersion: 2,
    id,
    releaseId,
    type,
    publishedAt: new Date().toISOString(),
    assets: {
      marker: markerImageUrl
        ? { type: 'pattern', url: markerImageUrl, patternUrl: null }
        : null,
      models: modelEntries.map((m, index) => ({
        id: `model-${index}`,
        url: m.url,
        transform: { position: m.position, rotation: m.rotation, scale: m.scale }
      })),
      audio: []
    },
    experience: {
      startScreen: startScreen || null,
      loadingScreen: lsOut || null,
      guideScreen: guideScreen || null
    },
    effects: Array.isArray(effects) ? effects : [],

    // Transitional legacy fields (旧形式互換)。
    // Viewer が v2 (assets.* / experience.*) を全面で読めるようになったら削除予定。
    startScreen: startScreen || null,
    guideScreen: guideScreen || null,
    loadingScreen: lsOut,
    markerImage: markerImageUrl || null,
    markerPattern: markerPattern || null,
    arSettings: arSettings || null,
    models: modelEntries
  };
  const projectBlob = await put(`${base}/project.json`, JSON.stringify(projectJson, null, 2), {
    ...putOpts,
    addRandomSuffix: false,
    contentType: 'application/json'
  });

  return { projectUrl: projectBlob.url };
}

/**
 * ローカル開発（vercel dev）用フォールバック: public/projects/ にファイル書き出し。
 */
async function publishToLocalFs(input) {
  const { id, type, loadingScreen, startScreen, guideScreen, markerImage, markerPattern, arSettings, effects = [], models } = input;
  const dir = path.join(process.cwd(), 'public', 'projects', id);
  const assetsDir = path.join(dir, 'assets');
  await fs.mkdir(assetsDir, { recursive: true });

  const modelEntries = [];
  let totalBytes = 0;
  for (const m of models) {
    let fileName = sanitizeFileName(m.fileName || 'model.glb');
    if (!isAllowedExt(fileName)) fileName = `${fileName}.glb`;
    const base64 = String(m.dataBase64 || '').split(',').pop();
    if (!base64) continue;
    const buf = Buffer.from(base64, 'base64');
    if (buf.length > MAX_LOCAL_MODEL_BYTES) {
      throw new Error(`file too large: ${fileName} (${buf.length} bytes)`);
    }
    totalBytes += buf.length;
    if (totalBytes > MAX_LOCAL_TOTAL_BYTES) {
      throw new Error(`total size exceeded (${totalBytes} bytes)`);
    }
    await fs.writeFile(path.join(dir, fileName), buf);
    modelEntries.push({
      url: `/projects/${id}/${fileName}`,
      fileName,
      fileSize: buf.length,
      position: normalizeVec3(m.position || (m.transform || {}).position, [0, 0, 0]),
      rotation: normalizeVec3(m.rotation || (m.transform || {}).rotation, [0, 0, 0]),
      scale: normalizeVec3(m.scale || (m.transform || {}).scale, [1, 1, 1])
    });
  }

  const lsOut = loadingScreen ? { ...loadingScreen } : null;
  if (lsOut) {
    const decoded = decodeDataUrl(lsOut.logoImage || lsOut.logo);
    if (decoded && decoded.buffer.length <= 2 * 1024 * 1024) {
      const ext = decoded.contentType.includes('jpeg') ? 'jpg' : (decoded.contentType.split('/')[1] || 'png');
      const logoName = `loading-logo.${ext}`;
      await fs.writeFile(path.join(assetsDir, logoName), decoded.buffer);
      lsOut.logo = `/projects/${id}/assets/${logoName}`;
      delete lsOut.logoImage;
    }
  }

  let markerImageUrl = markerImage;
  const decodedMarker = decodeDataUrl(markerImage);
  if (decodedMarker && decodedMarker.buffer.length <= 4 * 1024 * 1024) {
    const ext = decodedMarker.contentType.includes('jpeg') ? 'jpg' : (decodedMarker.contentType.split('/')[1] || 'png');
    const markerName = `marker.${ext}`;
    await fs.writeFile(path.join(assetsDir, markerName), decodedMarker.buffer);
    markerImageUrl = `/projects/${id}/assets/${markerName}`;
  }

  // ローカルFS書き出しも v2 で揃える（docs/product-spec.md §7）。
  const projectJson = {
    schemaVersion: 2,
    id,
    type,
    publishedAt: new Date().toISOString(),
    assets: {
      marker: markerImageUrl
        ? { type: 'pattern', url: markerImageUrl, patternUrl: null }
        : null,
      models: modelEntries.map((m, index) => ({
        id: `model-${index}`,
        url: m.url,
        transform: { position: m.position, rotation: m.rotation, scale: m.scale }
      })),
      audio: []
    },
    experience: {
      startScreen: startScreen || null,
      loadingScreen: lsOut || null,
      guideScreen: guideScreen || null
    },
    effects: Array.isArray(effects) ? effects : [],

    // Transitional legacy fields。Viewer の v2 全面対応後に削除予定。
    startScreen: startScreen || null,
    guideScreen: guideScreen || null,
    loadingScreen: lsOut,
    markerImage: markerImageUrl || null,
    markerPattern: markerPattern || null,
    arSettings: arSettings || null,
    models: modelEntries
  };
  await fs.writeFile(path.join(dir, 'project.json'), JSON.stringify(projectJson, null, 2), 'utf8');
  return { ok: true };
}

// リクエストボディを読み取る関数
function readRequestBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = '';
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error('Payload Too Large'), { status: 413 }));
        return;
      }
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}
