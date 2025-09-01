import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import dotenv from 'dotenv';
import { createLogger } from './utils/logger.js';

// ES Modules対応
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数の読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const serverLogger = createLogger('ServerApp');

// 基本的なミドルウェア
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// アップロードディレクトリの作成
const uploadsDir = path.join(__dirname, '../uploads');
fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(path.join(uploadsDir, 'models'));
fs.ensureDirSync(path.join(uploadsDir, 'markers'));
fs.ensureDirSync(path.join(uploadsDir, 'logos'));

// プロジェクトディレクトリの作成
const projectsDir = path.join(__dirname, '../public/projects');
fs.ensureDirSync(projectsDir);

// アップロードファイルの配信
app.use('/uploads', express.static(uploadsDir));

// プロジェクトファイルの配信（QRコード用）
app.use('/projects', express.static(projectsDir));

// 静的ファイルの配信（フロントエンド）
app.use(express.static(path.join(__dirname, '../dist')));

// publicディレクトリの配信（アセット用）
app.use('/assets', express.static(path.join(__dirname, '../public/assets')));

// 基本的なAPIルート
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// プロジェクト一覧取得（仮実装）
app.get('/api/projects', (req, res) => {
  res.json([
    {
      id: 'sample-project',
      name: 'サンプルプロジェクト',
      type: 'marker',
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    }
  ]);
});

// プロジェクトのproject.jsonファイル保存API
app.post('/api/projects/:projectId/save', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { projectData } = req.body;
    
    if (!projectData) {
      return res.status(400).json({ error: 'プロジェクトデータが必要です' });
    }
    
    // プロジェクト用ディレクトリを作成
    const projectDir = path.join(projectsDir, projectId);
    await fs.ensureDir(projectDir);
    
    // viewer用の簡易project.jsonを生成
    const viewerProject = {
      name: projectData.name,
      description: projectData.description,
      type: projectData.type,
      loadingScreen: projectData.loadingScreen,
      // 実際のモデルファイルは別途管理されるため、参照のみ
      models: (projectData.modelSettings || []).map((m) => ({
        url: `/assets/${m.fileName}`,
        fileName: m.fileName,
        fileSize: m.fileSize
      }))
    };
    
    // project.jsonファイルを保存
    const projectFilePath = path.join(projectDir, 'project.json');
    await fs.writeJson(projectFilePath, viewerProject, { spaces: 2 });
    
    serverLogger.success(`プロジェクトファイル保存完了: ${projectFilePath}`);
    serverLogger.info(`プロジェクトディレクトリ: ${projectDir}`);
    serverLogger.info(`アクセスURL: http://localhost:3000/projects/${projectId}/project.json`);
    
    res.json({ 
      success: true, 
      projectId,
      filePath: projectFilePath,
      url: `/projects/${projectId}/project.json`
    });
    
  } catch (error) {
    console.error('❌ プロジェクト保存エラー:', error);
    res.status(500).json({ 
      error: 'プロジェクト保存に失敗しました',
      message: error.message 
    });
  }
});

// AR表示用エンドポイント
app.get('/ar/:projectId', (req, res) => {
  const projectId = req.params.projectId;
  
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
  
  res.send(html);
});

// フロントエンドのルーティング対応（SPA）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: '内部サーバーエラー',
    message: process.env.NODE_ENV === 'development' ? err.message : 'サーバーエラーが発生しました'
  });
});

// サーバー起動
app.listen(PORT, '0.0.0.0', () => {
  serverLogger.success('サーバーが起動しました');
  serverLogger.info(`ローカル: http://localhost:${PORT}`);
  serverLogger.info(`ネットワーク: http://0.0.0.0:${PORT}`);
  serverLogger.info(`開発環境: ${process.env.NODE_ENV || 'development'}`);
}); 
