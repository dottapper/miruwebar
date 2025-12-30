/**
 * Vercel Serverless Function: プロジェクト公開API
 * POST /api/publish-project
 * 
 * 注意: Vercelではファイルシステムへの永続的な書き込みはできません。
 * テスト用として/tmpへの一時保存のみ対応しています。
 * 本番環境では、Vercel Blob Storageや外部ストレージサービスの使用を推奨します。
 */

import fs from 'fs/promises';
import path from 'path';

// セキュリティ: IDとファイル名の検証
const sanitizeId = (id) => String(id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'project';
const sanitizeFileName = (name) => {
  const base = (name || 'model.glb').toString();
  const just = base.split(/[\\/]/).pop();
  const safe = just.replace(/[^a-zA-Z0-9._-]/g, '_');
  return safe.slice(0, 100) || 'model.glb';
};
const isAllowedExt = (name) => /\.(glb|gltf)$/i.test(name);

const MAX_MODEL_BYTES = 50 * 1024 * 1024; // 50MB/1 file
const MAX_TOTAL_BYTES = 100 * 1024 * 1024; // 100MB/req
const MAX_BODY_BYTES = 150 * 1024 * 1024; // 上限（保護用）

export default async function handler(req, res) {
  // CORSヘッダー設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONSリクエストの処理
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POSTのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // リクエストボディの取得
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > MAX_BODY_BYTES) {
      return res.status(413).json({ error: 'payload too large' });
    }

    const body = await readRequestBody(req);
    const parsed = JSON.parse(body || '{}');
    const { id: rawId, type = 'markerless', loadingScreen = null, startScreen = null, models = [] } = parsed;
    const id = sanitizeId(rawId);

    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    // Vercelでは/tmpディレクトリへの書き込みのみ可能（一時的）
    const tmpDir = path.join('/tmp', 'projects', id);
    await fs.mkdir(tmpDir, { recursive: true });
    const assetsDir = path.join(tmpDir, 'assets');
    await fs.mkdir(assetsDir, { recursive: true });

    const modelEntries = [];
    let totalBytes = 0;

    // モデルファイルの処理
    for (const m of models) {
      try {
        let fileName = sanitizeFileName(m.fileName || 'model.glb');
        if (!isAllowedExt(fileName)) fileName = fileName + '.glb';
        const base64 = String(m.dataBase64 || '').split(',').pop();
        if (!base64) continue;
        const buf = Buffer.from(base64, 'base64');
        if (buf.length > MAX_MODEL_BYTES) {
          throw new Error(`file too large: ${fileName} (${buf.length} bytes)`);
        }
        totalBytes += buf.length;
        if (totalBytes > MAX_TOTAL_BYTES) {
          throw new Error(`total size exceeded (${totalBytes} bytes)`);
        }
        await fs.writeFile(path.join(tmpDir, fileName), buf);
        modelEntries.push({ url: `/projects/${id}/${fileName}`, fileName, fileSize: buf.length });
      } catch (e) {
        console.warn('⚠️ モデル書き込み失敗（継続）:', e.message);
      }
    }

    // loadingScreen のアセット処理（ロゴ）
    let lsOut = loadingScreen ? { ...loadingScreen } : null;
    try {
      if (lsOut && typeof lsOut.logoImage === 'string' && /^data:image\//.test(lsOut.logoImage)) {
        const mime = (lsOut.logoImage.split(';')[0] || '').replace('data:', '') || 'image/png';
        const ext = mime.includes('jpeg') ? 'jpg' : (mime.split('/')[1] || 'png');
        const base64 = lsOut.logoImage.split(',')[1] || '';
        const buf = Buffer.from(base64, 'base64');
        if (buf.length > 2 * 1024 * 1024) throw new Error('logo too large');
        const logoName = `loading-logo.${ext}`;
        const logoPath = path.join(assetsDir, logoName);
        await fs.writeFile(logoPath, buf);
        lsOut.logo = `/projects/${id}/assets/${logoName}`;
        delete lsOut.logoImage;
      }
    } catch (e) {
      console.warn('⚠️ ロゴ画像の書き出し失敗（継続）:', e.message);
    }

    // project.jsonの生成
    const projectJson = { id, type, startScreen: startScreen || null, loadingScreen: lsOut, models: modelEntries };
    await fs.writeFile(
      path.join(tmpDir, 'project.json'),
      JSON.stringify(projectJson, null, 2),
      'utf8'
    );

    // URLの生成（Vercelの環境変数から取得、またはリクエストヘッダーから推定）
    const scheme = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const baseUrl = `${scheme}://${host}`;

    const viewerUrl = `${baseUrl}/#/viewer?src=${baseUrl}/projects/${id}/project.json`;
    const projectUrl = `${baseUrl}/projects/${id}/project.json`;

    // 注意: /tmpへの保存は一時的なものです
    return res.status(200).json({
      ok: true,
      viewerUrl,
      projectUrl,
      message: '⚠️ テストモード: /tmpへの一時保存のみ（永続化されません）'
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

// リクエストボディを読み取る関数
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = '';
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Payload Too Large'), { status: 413 }));
        return;
      }
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}
