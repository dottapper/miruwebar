/**
 * APIルート設定
 * 
 * このファイルはサンプルコードです。実際の実装時には使用しているフレームワークに合わせて調整してください。
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');

// ミドルウェア
const authMiddleware = require('../middleware/auth');

// コントローラ
const projectController = require('../controllers/projectController');
const userController = require('../controllers/userController');
const mediaController = require('../controllers/mediaController');
const settingsController = require('../controllers/settingsController');

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
router.post('/auth/login', userController.login);
router.post('/auth/register', userController.register);
router.get('/auth/user', authMiddleware, userController.getUser);
router.post('/auth/logout', authMiddleware, userController.logout);

// プロジェクト関連
router.get('/projects', authMiddleware, projectController.getProjects);
router.post('/projects', authMiddleware, projectController.createProject);
router.get('/projects/:id', projectController.getProject);
router.put('/projects/:id', authMiddleware, projectController.updateProject);
router.delete('/projects/:id', authMiddleware, projectController.deleteProject);
router.post('/projects/:id/duplicate', authMiddleware, projectController.duplicateProject);

// メディア関連
router.get('/media', authMiddleware, mediaController.getMedia);
router.post('/media', authMiddleware, upload.single('file'), mediaController.uploadMedia);
router.delete('/media/:id', authMiddleware, mediaController.deleteMedia);

// ローディング画面設定関連（新規追加）
router.get('/settings/loading-screen', authMiddleware, settingsController.getLoadingScreenSettings);
router.post('/settings/loading-screen', authMiddleware, upload.single('logo'), settingsController.saveLoadingScreenSettings);
router.get('/projects/:projectId/loading-settings', settingsController.getProjectLoadingSettings);

module.exports = router; 