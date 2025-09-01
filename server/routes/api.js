/**
 * APIルート設定
 * 
 * このファイルはサンプルコードです。実際の実装時には使用しているフレームワークに合わせて調整してください。
 */

import express from 'express';
import multer from 'multer';
import { createLogger } from '../utils/logger.js';
import { loadController, loadMiddleware, conditionalImport } from '../utils/module-loader.js';

const router = express.Router();
const apiLogger = createLogger('APIRoutes');

// 動的インポートの設定
let authMiddleware = null;
let projectController = null;
let userController = null;
let mediaController = null;
let settingsController = null;

// ファイルアップロード用の設定
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB制限
  },
  fileFilter: (req, file, cb) => {
    // 画像ファイルのみ許可
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('画像ファイルのみアップロードできます。'), false);
    }
  }
});

// ユーザー関連
// router.post('/auth/login', userController.login);
// router.post('/auth/register', userController.register);
// router.get('/auth/user', authMiddleware, userController.getUser);
// router.post('/auth/logout', authMiddleware, userController.logout);

// プロジェクト関連
// router.get('/projects', authMiddleware, projectController.getProjects);
// router.post('/projects', authMiddleware, projectController.createProject);
// router.get('/projects/:id', projectController.getProject);
// router.put('/projects/:id', authMiddleware, projectController.updateProject);
// router.delete('/projects/:id', authMiddleware, projectController.deleteProject);
// router.post('/projects/:id/duplicate', authMiddleware, projectController.duplicateProject);

// メディア関連
// router.get('/media', authMiddleware, mediaController.getMedia);
// router.post('/media', authMiddleware, upload.single('file'), mediaController.uploadMedia);
// router.delete('/media/:id', authMiddleware, mediaController.deleteMedia);

// ローディング画面設定関連（新規追加）
// router.get('/settings/loading-screen', authMiddleware, settingsController.getLoadingScreenSettings);
// router.post('/settings/loading-screen', authMiddleware, upload.single('logo'), settingsController.saveLoadingScreenSettings);
// router.get('/projects/:projectId/loading-settings', settingsController.getProjectLoadingSettings);

// 動的インポートの初期化
async function initializeModules() {
  try {
    apiLogger.info('APIモジュールの初期化を開始');
    
    // 条件付きでモジュールをインポート
    authMiddleware = await conditionalImport('../middleware/auth.js', false);
    projectController = await conditionalImport('../controllers/projectController.js', false);
    userController = await conditionalImport('../controllers/userController.js', false);
    mediaController = await conditionalImport('../controllers/mediaController.js', false);
    settingsController = await conditionalImport('../controllers/settingsController.js', false);
    
    apiLogger.success('APIモジュールの初期化完了');
  } catch (error) {
    apiLogger.warn('一部のモジュールの初期化に失敗しました（開発環境では正常）', error);
  }
}

// モジュール初期化を実行
initializeModules();

// ヘルスチェックエンドポイント
router.get('/health', (req, res) => {
  apiLogger.info('ヘルスチェック要求');
  res.json({ 
    status: 'ok', 
    message: 'API is running',
    modules: {
      auth: !!authMiddleware,
      project: !!projectController,
      user: !!userController,
      media: !!mediaController,
      settings: !!settingsController
    }
  });
});

// 条件付きでルートを設定
if (userController) {
  router.post('/auth/login', userController.login);
  router.post('/auth/register', userController.register);
  router.get('/auth/user', authMiddleware, userController.getUser);
  router.post('/auth/logout', authMiddleware, userController.logout);
}

if (projectController) {
  router.get('/projects', authMiddleware, projectController.getProjects);
  router.post('/projects', authMiddleware, projectController.createProject);
  router.get('/projects/:id', projectController.getProject);
  router.put('/projects/:id', authMiddleware, projectController.updateProject);
  router.delete('/projects/:id', authMiddleware, projectController.deleteProject);
  router.post('/projects/:id/duplicate', authMiddleware, projectController.duplicateProject);
}

if (mediaController) {
  router.get('/media', authMiddleware, mediaController.getMedia);
  router.post('/media', authMiddleware, upload.single('file'), mediaController.uploadMedia);
  router.delete('/media/:id', authMiddleware, mediaController.deleteMedia);
}

if (settingsController) {
  router.get('/settings/loading-screen', authMiddleware, settingsController.getLoadingScreenSettings);
  router.post('/settings/loading-screen', authMiddleware, upload.single('logo'), settingsController.saveLoadingScreenSettings);
  router.get('/projects/:projectId/loading-settings', settingsController.getProjectLoadingSettings);
}

export default router; 