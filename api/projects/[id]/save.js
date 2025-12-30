/**
 * Vercel Serverless Function: プロジェクト保存API
 * POST /api/projects/:id/save
 * 
 * 注意: Vercelではファイルシステムへの永続的な書き込みはできません。
 * テスト用として/tmpへの一時保存のみ対応しています。
 * 本番環境では、Vercel Blob Storageや外部ストレージサービスの使用を推奨します。
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// セキュリティ: IDの検証
const sanitizeId = (id) => String(id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'project';

// 最大リクエストサイズ（150MB）
const MAX_BODY_BYTES = 150 * 1024 * 1024;

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
    const { id: rawId } = req.query;
    const id = sanitizeId(rawId);

    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    // リクエストボディの取得
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > MAX_BODY_BYTES) {
      return res.status(413).json({ error: 'payload too large' });
    }

    const body = await readRequestBody(req);
    const parsed = JSON.parse(body || '{}');
    const projectData = parsed.projectData || parsed;

    // Vercelでは/tmpディレクトリへの書き込みのみ可能（一時的）
    // 本番環境では、このファイルはビルド時にpublic/projectsにコピーするか、
    // Vercel Blob Storageを使用することを推奨します
    const tmpDir = path.join('/tmp', 'projects', id);
    await fs.mkdir(tmpDir, { recursive: true });

    const projectJsonPath = path.join(tmpDir, 'project.json');
    await fs.writeFile(projectJsonPath, JSON.stringify(projectData, null, 2), 'utf8');

    // 注意: /tmpへの保存は一時的なもので、関数の実行が終わると削除される可能性があります
    // テスト用として、成功レスポンスを返しますが、実際のファイル配信は別の方法が必要です
    return res.status(200).json({
      success: true,
      url: `/projects/${id}/project.json`,
      message: '⚠️ テストモード: /tmpへの一時保存のみ（永続化されません）'
    });
  } catch (error) {
    console.error('❌ /api/projects/:id/save 失敗:', error);
    return res.status(500).json({
      error: 'save failed',
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
