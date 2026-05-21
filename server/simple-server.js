import http from 'http';
import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { createLogger } from './utils/logger.js';

// 環境変数の読み込み
dotenv.config();

// ES Modules対応
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001; // 本番サーバー用ポート（開発のViteと分離）
const USE_HTTPS = process.env.USE_HTTPS === 'true' || false; // HTTPS有効化フラグ

// データストレージ
const dataDir = path.join(__dirname, '../data');
const uploadsDir = path.join(__dirname, '../uploads');
const publicDir = path.join(__dirname, '../public');

// ディレクトリの作成（非同期）
async function ensureDirectories() {
  const directories = [
    dataDir, 
    uploadsDir, 
    path.join(uploadsDir, 'models'),
    path.join(uploadsDir, 'markers'),
    path.join(uploadsDir, 'logos')
  ];
  
  for (const dir of directories) {
    try {
      await fs.access(dir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(dir, { recursive: true });
        simpleServerLogger.info(`ディレクトリを作成しました: ${dir}`);
      } else {
        throw error;
      }
    }
  }
}

// プロジェクトデータファイル
const projectsFile = path.join(dataDir, 'projects.json');

// プロジェクトデータの読み込み/保存（非同期）
async function loadProjects() {
  try {
    const data = await fs.readFile(projectsFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // ファイルが存在しない場合は空配列を返す
      return [];
    }
    throw error;
  }
}

async function saveProjects(projects) {
  try {
    await fs.writeFile(projectsFile, JSON.stringify(projects, null, 2));
    simpleServerLogger.debug('プロジェクトデータを保存しました');
  } catch (error) {
    simpleServerLogger.error('プロジェクトデータの保存に失敗しました', error);
    throw error;
  }
}

// ファイル存在確認（非同期）
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

// MIMEタイプの設定
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json'
};

// ファイルを読み込む関数（非同期）
async function readFile(filePath) {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    simpleServerLogger.error(`ファイル読み込みエラー: ${filePath}`, error);
    throw error;
  }
}

// POSTデータを解析する関数（サイズ上限あり）
function parsePostData(req) {
  const MAX_BODY_BYTES = 150 * 1024 * 1024; // 150MB 安全上限
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = '';
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        const err = new Error('Payload Too Large');
        err.status = 413;
        reject(err);
        req.destroy();
        return;
      }
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Cookie文字列をパースしてオブジェクトに変換
function parseCookies(cookieString) {
  const cookies = {};
  if (!cookieString) return cookies;

  cookieString.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    const value = rest.join('=');
    if (name && value) {
      cookies[name.trim()] = decodeURIComponent(value.trim());
    }
  });

  return cookies;
}

// ファイルアップロード処理（簡易版）
function parseMultipartData(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      // 簡易的なマルチパート解析（実際のプロダクションではmulterなどを使用）
      resolve({ buffer, contentType: req.headers['content-type'] });
    });
  });
}

// ベースディレクトリ内に収まるよう安全に結合
function safeJoin(base, target) {
  const sanitized = String(target || '').replace(/^\/+/, '');
  const resolved = path.resolve(base, sanitized);
  const baseResolved = path.resolve(base);
  if (!resolved.startsWith(baseResolved)) {
    const err = new Error('Invalid path');
    err.status = 400;
    throw err;
  }
  return resolved;
}

// サーバーを作成
const simpleServerLogger = createLogger('SimpleServer');

// SSL証明書の設定（開発用自己署名証明書）
async function getSSLConfig() {
  if (!USE_HTTPS) return null;
  
  try {
    // Viteのbasic-sslプラグインと同様の自己署名証明書を使用
    const certPath = path.join(__dirname, '../.vite/ssl/cert.pem');
    const keyPath = path.join(__dirname, '../.vite/ssl/key.pem');
    
    // 証明書ファイルが存在するかチェック
    await fs.access(certPath);
    await fs.access(keyPath);
    
    const [cert, key] = await Promise.all([
      fs.readFile(certPath, 'utf8'),
      fs.readFile(keyPath, 'utf8')
    ]);
    
    return { cert, key };
  } catch (error) {
    simpleServerLogger.warn('SSL証明書が見つからないため、HTTPで起動します');
    simpleServerLogger.debug('証明書エラー:', error.message);
    return null;
  }
}

// リクエストハンドラー関数
async function requestHandler(req, res) {
  simpleServerLogger.debug(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // CORS設定（本番環境では制限）
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['*']; // 開発環境のデフォルト
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins.includes('*') ? '*' : origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;
    
    // APIルート
    if (pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }));
      return;
    }

    // ========== 認証API ==========
    
    // 認証状態チェック: GET /api/auth/check
    if (pathname === '/api/auth/check' && req.method === 'GET') {
      const cookies = parseCookies(req.headers.cookie || '');
      const authToken = cookies['app-auth'];
      const authSecret = process.env.AUTH_SECRET;

      // AUTH_SECRETが設定されていない場合は認証不要
      if (!authSecret) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ authenticated: true, authRequired: false }));
        return;
      }

      const authenticated = authToken === authSecret;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ authenticated, authRequired: true }));
      return;
    }

    // ログイン: POST /api/auth/login
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      try {
        const body = await parsePostData(req);
        const { password } = body;
        const authPassword = process.env.AUTH_PASSWORD;
        const authSecret = process.env.AUTH_SECRET;

        if (!authPassword || !authSecret) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '認証設定が不完全です' }));
          return;
        }

        if (password === authPassword) {
          // 認証成功
          const maxAge = 7 * 24 * 60 * 60; // 7日間
          res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Set-Cookie': `app-auth=${authSecret}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Path=/`
          });
          res.end(JSON.stringify({ success: true }));
          simpleServerLogger.success('認証成功');
        } else {
          // 認証失敗
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'パスワードが間違っています' }));
          simpleServerLogger.warn('認証失敗: パスワードが一致しません');
        }
      } catch (error) {
        simpleServerLogger.error('ログインエラー', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'リクエストの解析に失敗しました' }));
      }
      return;
    }

    // ログアウト: POST /api/auth/logout
    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Set-Cookie': 'app-auth=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/'
      });
      res.end(JSON.stringify({ success: true }));
      simpleServerLogger.info('ログアウト');
      return;
    }

    // ========== 認証API ここまで ==========
    
    // プロジェクト一覧取得
    if (pathname === '/api/projects' && req.method === 'GET') {
      try {
        const projects = await loadProjects();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(projects));
      } catch (error) {
        simpleServerLogger.error('プロジェクト一覧取得エラー', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'プロジェクト一覧の取得に失敗しました' }));
      }
      return;
    }
    
    // プロジェクト保存
    if (pathname === '/api/projects' && req.method === 'POST') {
      try {
        let projectData;
        try {
          projectData = await parsePostData(req);
        } catch (e) {
          if (e && e.status === 413) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'payload too large' }));
            return;
          }
          throw e;
        }
        
        const projects = await loadProjects();
        
        // プロジェクトIDの生成
        if (!projectData.id) {
          projectData.id = uuidv4();
        }
        
        // タイムスタンプの追加
        const now = new Date().toISOString();
        if (!projectData.created) {
          projectData.created = now;
        }
        projectData.updated = now;
        
        // 既存プロジェクトの更新または新規追加
        const existingIndex = projects.findIndex(p => p.id === projectData.id);
        if (existingIndex >= 0) {
          projects[existingIndex] = { ...projects[existingIndex], ...projectData };
        } else {
          projects.push(projectData);
        }
        
        await saveProjects(projects);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(projectData));
      } catch (error) {
        simpleServerLogger.error('プロジェクト保存エラー', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'プロジェクトの保存に失敗しました' }));
      }
      return;
    }
    
    // プロジェクト取得
    if (pathname.startsWith('/api/projects/') && req.method === 'GET') {
      try {
        const projectId = pathname.split('/')[3];
        const projects = await loadProjects();
        const project = projects.find(p => p.id === projectId);
        
        if (project) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(project));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'プロジェクトが見つかりません' }));
        }
      } catch (error) {
        simpleServerLogger.error('プロジェクト取得エラー', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'プロジェクトの取得に失敗しました' }));
      }
      return;
    }
    
    // プロジェクト削除
    if (pathname.startsWith('/api/projects/') && req.method === 'DELETE') {
      try {
        const projectId = pathname.split('/')[3];
        const projects = await loadProjects();
        const filteredProjects = projects.filter(p => p.id !== projectId);
        
        if (filteredProjects.length < projects.length) {
          await saveProjects(filteredProjects);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'プロジェクトが見つかりません' }));
        }
      } catch (error) {
        simpleServerLogger.error('プロジェクト削除エラー', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'プロジェクトの削除に失敗しました' }));
      }
      return;
    }

    // ローカル公開用API: /api/publish-project
    if (pathname === '/api/publish-project' && req.method === 'POST') {
      try {
        const body = await parsePostData(req);
        const {
          id: rawId,
          type,
          loadingScreen,
          startScreen,
          guideScreen,
          markerImage,
          markerPattern,
          arSettings,
          models
        } = body || {};
        const sanitizeId = (x) => String(x || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'project';
        const sanitizeFileName = (name) => {
          const just = String(name || 'model.glb').split(/[\\/]/).pop();
          return just.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) || 'model.glb';
        };
        const isAllowedExt = (n) => /\.(glb|gltf)$/i.test(n);
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
        const MAX_MODEL_BYTES = 50 * 1024 * 1024;
        const MAX_TOTAL_BYTES = 100 * 1024 * 1024;

        const id = sanitizeId(rawId);
        if (!id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'id is required' }));
          return;
        }

        // 保存先: uploads/projects/<id>
        const projectDir = path.join(uploadsDir, 'projects', id);
        await fs.mkdir(projectDir, { recursive: true });

        const modelEntries = [];
        let totalBytes = 0;
        if (Array.isArray(models)) {
          for (const m of models) {
            try {
              let fileName = sanitizeFileName(m.fileName || 'model.glb');
              if (!isAllowedExt(fileName)) fileName = fileName + '.glb';
              const base64 = (m.dataBase64 || '').split(',').pop();
              if (!base64) continue;
              const buffer = Buffer.from(base64, 'base64');
              if (buffer.length > MAX_MODEL_BYTES) throw new Error(`file too large: ${fileName}`);
              totalBytes += buffer.length;
              if (totalBytes > MAX_TOTAL_BYTES) throw new Error('total size exceeded');
              const filePath = path.join(projectDir, fileName);
              await fs.writeFile(filePath, buffer);
              const transform = m.transform || {};
              const position = normalizeVec3(m.position || transform.position, [0, 0, 0]);
              const rotation = normalizeVec3(m.rotation || transform.rotation, [0, 0, 0]);
              const scale = normalizeVec3(m.scale || transform.scale, [1, 1, 1]);
              modelEntries.push({
                url: `/projects/${id}/${fileName}`,
                fileName,
                fileSize: buffer.length,
                position,
                rotation,
                scale
              });
              simpleServerLogger.debug(`モデルファイルを保存しました: ${fileName}`);
            } catch (e) {
              simpleServerLogger.warn('モデル保存に失敗:', e);
            }
          }
        }

        // project.json を生成
        const projectJson = {
          id,
          type: type || 'markerless',
          startScreen: startScreen || null,
          guideScreen: guideScreen || null,
          loadingScreen: loadingScreen || null,
          markerImage: markerImage || null,
          markerPattern: markerPattern || null,
          arSettings: arSettings || null,
          models: modelEntries
        };
        await fs.writeFile(path.join(projectDir, 'project.json'), JSON.stringify(projectJson, null, 2));

        const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
        const scheme = (req.headers['x-forwarded-proto'] || 'http');
        const viewerUrl = `${scheme}://${host}/#/viewer?src=${scheme}://${host}/projects/${id}/project.json`;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, viewerUrl, projectUrl: `${scheme}://${host}/projects/${id}/project.json` }));
      } catch (e) {
        if (e && e.status === 413) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'payload too large' }));
          return;
        }
        simpleServerLogger.error('publish-project エラー:', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'publish failed', message: e.message }));
      }
      return;
    }

    // AR表示用ページ
    if (pathname.startsWith('/ar/')) {
      const projectId = pathname.split('/')[2];
      const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AR表示 - ${projectId}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #000;
      color: #fff;
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .container {
      text-align: center;
      padding: 20px;
    }
    .status {
      font-size: 18px;
      margin-bottom: 20px;
    }
    .project-id {
      font-size: 14px;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="status">AR表示準備中...</div>
    <div class="project-id">プロジェクトID: ${projectId}</div>
    <p>※ AR機能は次のステップで実装します</p>
  </div>
</body>
</html>`;
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      return;
    }

    // アップロードファイルの配信
    if (pathname.startsWith('/uploads/')) {
      try {
        let filePath;
        try {
          filePath = safeJoin(uploadsDir, pathname.replace('/uploads/', ''));
        } catch (e) {
          res.writeHead(e.status || 400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid path' }));
          return;
        }
        
        if (await fileExists(filePath)) {
          const ext = path.extname(filePath);
          const contentType = mimeTypes[ext] || 'application/octet-stream';
          const data = await readFile(filePath);
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
          return;
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File not found' }));
          return;
        }
      } catch (error) {
        simpleServerLogger.error('アップロードファイル配信エラー', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File read error' }));
        return;
      }
    }

    // /projects 配下の静的配信（uploads/projects を優先、なければ public/projects にフォールバック・一本化）
    if (pathname.startsWith('/projects/')) {
      try {
        const relativePath = pathname.replace(/^\/projects\/?/, '');
        let filePath;
        try {
          filePath = safeJoin(path.join(uploadsDir, 'projects'), relativePath);
        } catch (e) {
          res.writeHead(e.status || 400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid path' }));
          return;
        }
        if (await fileExists(filePath)) {
          const ext = path.extname(filePath);
          const contentType = mimeTypes[ext] || 'application/octet-stream';
          const data = await readFile(filePath);
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
          return;
        }
        try {
          const fallbackPath = safeJoin(path.join(publicDir, 'projects'), relativePath);
          if (await fileExists(fallbackPath)) {
            const ext = path.extname(fallbackPath);
            const contentType = mimeTypes[ext] || 'application/octet-stream';
            const data = await readFile(fallbackPath);
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
            return;
          }
        } catch (_) {
          // フォールバックパスが無効な場合は 404 のまま
        }
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      } catch (error) {
        simpleServerLogger.error('プロジェクトファイル配信エラー', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File read error' }));
        return;
      }
    }
    
    // 静的ファイルの配信
    try {
      let filePath;
      
      // ルートディレクトリから直接ファイルを配信（開発用）
      if (pathname === '/') {
        filePath = path.join(__dirname, '../index.html');
      } else {
        // まずルートディレクトリから探す
        filePath = path.join(__dirname, '..', pathname);
        
        // ファイルが存在しない場合はdistから探す
        if (!(await fileExists(filePath))) {
          filePath = path.join(__dirname, '../dist', pathname);
        }
        
        // それでも存在しない場合はindex.htmlを返す（SPA対応）
        if (!(await fileExists(filePath))) {
          filePath = path.join(__dirname, '../index.html');
          if (!(await fileExists(filePath))) {
            filePath = path.join(__dirname, '../dist/index.html');
          }
        }
      }
      
      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      const data = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    } catch (error) {
      simpleServerLogger.error('静的ファイル配信エラー', error);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File Not Found');
    }
    
  } catch (error) {
    simpleServerLogger.error('サーバーエラー:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
}

// サーバー作成と起動
async function startServer() {
  try {
    // ディレクトリの初期化
    await ensureDirectories();
    
    // SSL設定の取得
    const sslConfig = await getSSLConfig();
    
    // サーバー作成
    const server = sslConfig 
      ? https.createServer(sslConfig, requestHandler)
      : http.createServer(requestHandler);
    
    // サーバー起動
    server.listen(PORT, '0.0.0.0', () => {
      const protocol = sslConfig ? 'https' : 'http';
      simpleServerLogger.success('サーバーが起動しました');
      simpleServerLogger.info(`ローカル: ${protocol}://localhost:${PORT}`);
      simpleServerLogger.info(`ネットワーク: ${protocol}://0.0.0.0:${PORT}`);
      simpleServerLogger.info(`開発環境: development`);
      simpleServerLogger.info(`データ保存先: ${dataDir}`);
      simpleServerLogger.info(`アップロード先: ${uploadsDir}`);
      if (sslConfig) {
        simpleServerLogger.info('🔒 HTTPS対応 (モバイルカメラアクセス可能)');
      }
    });
    
  } catch (error) {
    simpleServerLogger.error('サーバー初期化エラー:', error);
    process.exit(1);
  }
}

// サーバー開始
startServer();
