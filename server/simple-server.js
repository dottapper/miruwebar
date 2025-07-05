import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// ES Modules対応
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// データストレージ
const dataDir = path.join(__dirname, '../data');
const uploadsDir = path.join(__dirname, '../uploads');

// ディレクトリの作成
[dataDir, uploadsDir, 
 path.join(uploadsDir, 'models'),
 path.join(uploadsDir, 'markers'),
 path.join(uploadsDir, 'logos')
].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// プロジェクトデータファイル
const projectsFile = path.join(dataDir, 'projects.json');

// プロジェクトデータの読み込み/保存
function loadProjects() {
  if (fs.existsSync(projectsFile)) {
    return JSON.parse(fs.readFileSync(projectsFile, 'utf8'));
  }
  return [];
}

function saveProjects(projects) {
  fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 2));
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

// ファイルを読み込む関数
function readFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

// POSTデータを解析する関数
function parsePostData(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
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

// サーバーを作成
const server = http.createServer(async (req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
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
    
    // プロジェクト一覧取得
    if (pathname === '/api/projects' && req.method === 'GET') {
      const projects = loadProjects();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(projects));
      return;
    }
    
    // プロジェクト保存
    if (pathname === '/api/projects' && req.method === 'POST') {
      const projectData = await parsePostData(req);
      const projects = loadProjects();
      
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
      
      saveProjects(projects);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(projectData));
      return;
    }
    
    // プロジェクト取得
    if (pathname.startsWith('/api/projects/') && req.method === 'GET') {
      const projectId = pathname.split('/')[3];
      const projects = loadProjects();
      const project = projects.find(p => p.id === projectId);
      
      if (project) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(project));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'プロジェクトが見つかりません' }));
      }
      return;
    }
    
    // プロジェクト削除
    if (pathname.startsWith('/api/projects/') && req.method === 'DELETE') {
      const projectId = pathname.split('/')[3];
      const projects = loadProjects();
      const filteredProjects = projects.filter(p => p.id !== projectId);
      
      if (filteredProjects.length < projects.length) {
        saveProjects(filteredProjects);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'プロジェクトが見つかりません' }));
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
      const filePath = path.join(uploadsDir, pathname.replace('/uploads/', ''));
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        const data = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
        return;
      }
    }
    
    // 静的ファイルの配信
    let filePath = path.join(__dirname, '../dist', pathname === '/' ? 'index.html' : pathname);
    
    // ファイルが存在しない場合はindex.htmlを返す（SPA対応）
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, '../dist/index.html');
    }
    
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
    
  } catch (error) {
    console.error('エラー:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

// サーバーを起動
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 サーバーが起動しました`);
  console.log(`📱 ローカル: http://localhost:${PORT}`);
  console.log(`🌐 ネットワーク: http://0.0.0.0:${PORT}`);
  console.log(`💻 開発環境: development`);
  console.log(`📁 データ保存先: ${dataDir}`);
  console.log(`📂 アップロード先: ${uploadsDir}`);
}); 