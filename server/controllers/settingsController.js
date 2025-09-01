/**
 * 設定コントローラ
 * 
 * このファイルはサンプルコードです。実際の実装時には使用しているフレームワークやデータベース構成に合わせて調整してください。
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { createLogger } from '../utils/logger.js';

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const settingsLogger = createLogger('SettingsController');

// データベースモデルの動的インポート
let LoadingScreenSettings = null;
let User = null;
let Project = null;

// モデルの初期化（実際の実装時には有効化）
async function initializeModels() {
  try {
    // const models = await import('../models/index.js');
    // LoadingScreenSettings = models.LoadingScreenSettings;
    // User = models.User;
    // Project = models.Project;
    settingsLogger.info('データベースモデルの初期化完了');
  } catch (error) {
    settingsLogger.warn('データベースモデルの初期化に失敗しました（開発環境では正常）', error);
  }
}

// モデル初期化を実行
initializeModels();

/**
 * ユーザーごとのローディング画面設定を取得
 */
export const getLoadingScreenSettings = async (req, res) => {
  try {
    // モデルの存在チェック
    if (!LoadingScreenSettings) {
      return res.status(503).json({ error: 'データベースモデルが初期化されていません' });
    }
    
    // 認証済みのユーザーIDを取得
    const userId = req.user.id;
    
    // ユーザーの設定を取得
    let settings = await LoadingScreenSettings.findOne({
      where: { userId }
    });
    
    // 設定が存在しない場合は新規作成
    if (!settings) {
      settings = await LoadingScreenSettings.create({
        userId,
        // デフォルト値はモデルで定義済み
      });
    }
    
    // レスポンスを返す
    res.json({
      id: settings.id,
      name: settings.name,
      logo: settings.logoUrl,
      bgColor: settings.bgColor,
      textColor: settings.textColor,
      accentColor: settings.accentColor,
      animationType: settings.animationType
    });
  } catch (error) {
    settingsLogger.error('設定取得エラー:', error);
    res.status(500).json({ error: '設定の取得に失敗しました' });
  }
};

/**
 * ユーザーごとのローディング画面設定を保存
 */
export const saveLoadingScreenSettings = async (req, res) => {
  try {
    // モデルの存在チェック
    if (!LoadingScreenSettings) {
      return res.status(503).json({ error: 'データベースモデルが初期化されていません' });
    }
    
    // 認証済みのユーザーIDを取得
    const userId = req.user.id;
    
    // リクエストボディからデータを取得
    const { name, bgColor, textColor, accentColor, animationType } = req.body;
    
    // 更新データの準備
    const updateData = {
      name,
      bgColor,
      textColor,
      accentColor,
      animationType
    };
    
    // ロゴ画像がアップロードされた場合
    let logoUrl = null;
    if (req.file) {
      // アップロード先ディレクトリの作成
      const uploadDir = path.join(process.cwd(), 'public/uploads/logos');
      await mkdirAsync(uploadDir, { recursive: true });
      
      // ファイル名の生成（ユニークな名前にするため時間とユーザーIDを含める）
      const timestamp = Date.now();
      const filename = `logo_${userId}_${timestamp}${path.extname(req.file.originalname)}`;
      const filePath = path.join(uploadDir, filename);
      
      // ファイルの保存
      await writeFileAsync(filePath, req.file.buffer);
      
      // 公開URL
      logoUrl = `/uploads/logos/${filename}`;
      
      // 更新データにパスとURLを追加
      updateData.logoPath = filePath;
      updateData.logoUrl = logoUrl;
    }
    
    // 設定を取得または作成
    let settings = await LoadingScreenSettings.findOne({
      where: { userId }
    });
    
    if (settings) {
      // 既存の設定を更新
      await settings.update(updateData);
    } else {
      // 新規作成
      settings = await LoadingScreenSettings.create({
        userId,
        ...updateData
      });
    }
    
    // レスポンスを返す
    res.json({
      id: settings.id,
      name: settings.name,
      logo: settings.logoUrl,
      bgColor: settings.bgColor,
      textColor: settings.textColor,
      accentColor: settings.accentColor,
      animationType: settings.animationType
    });
  } catch (error) {
    settingsLogger.error('設定保存エラー:', error);
    res.status(500).json({ error: '設定の保存に失敗しました' });
  }
};

/**
 * プロジェクト固有のローディング設定を取得
 * プロジェクトのオーナーの設定を返す
 */
export const getProjectLoadingSettings = async (req, res) => {
  try {
    // モデルの存在チェック
    if (!Project || !User || !LoadingScreenSettings) {
      return res.status(503).json({ error: 'データベースモデルが初期化されていません' });
    }
    
    const { projectId } = req.params;
    
    // プロジェクトを取得（オーナー情報も含める）
    const project = await Project.findByPk(projectId, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id']
        }
      ]
    });
    
    if (!project) {
      return res.status(404).json({ error: 'プロジェクトが見つかりません' });
    }
    
    // プロジェクトオーナーのローディング設定を取得
    const ownerId = project.owner.id;
    let settings = await LoadingScreenSettings.findOne({
      where: { userId: ownerId }
    });
    
    // 設定が存在しない場合はデフォルト設定を返す
    if (!settings) {
      return res.json({
        name: 'miru-WebAR',
        logo: null,
        bgColor: 'rgba(0, 0, 0, 0.85)',
        textColor: 'white',
        accentColor: '#00a8ff',
        animationType: 'fade'
      });
    }
    
    // レスポンスを返す
    res.json({
      name: settings.name,
      logo: settings.logoUrl,
      bgColor: settings.bgColor,
      textColor: settings.textColor,
      accentColor: settings.accentColor,
      animationType: settings.animationType
    });
  } catch (error) {
    settingsLogger.error('プロジェクト設定取得エラー:', error);
    res.status(500).json({ error: '設定の取得に失敗しました' });
  }
}; 