// src/storage/migrate.js
// localStorage の Base64 データを IndexedDB に移行するマイグレーション機能
const IS_DEBUG = (typeof window !== 'undefined' && !!window.DEBUG);
const dlog = (...args) => { if (IS_DEBUG) console.log(...args); };

import { saveModelToIDB, getAllModelIds } from './indexeddb-storage.js';
import { getProjects, saveProject } from './project-store.js';

const MIGRATION_FLAG_KEY = 'miruwebAR_migration_completed';
const MIGRATION_VERSION = '1.0.0';

/**
 * Base64 文字列を Blob に変換
 * @param {string} base64String - Base64 データ文字列
 * @returns {Blob} 変換された Blob
 */
function base64ToBlob(base64String) {
  try {
    // Data URL から Base64 部分を抽出
    const base64Data = base64String.includes(',') 
      ? base64String.split(',')[1] 
      : base64String;
    
    // Base64 をバイナリデータに変換
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // MIME タイプを推測
    let mimeType = 'model/gltf-binary';
    if (base64String.includes('data:')) {
      const mimeMatch = base64String.match(/data:([^;]+)/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
    }
    
    return new Blob([bytes], { type: mimeType });
  } catch (error) {
    console.error('❌ Base64 to Blob 変換エラー:', error);
    throw new Error(`Base64 の変換に失敗しました: ${error.message}`);
  }
}

/**
 * 一意のモデル ID を生成
 * @param {string} fileName - ファイル名
 * @param {number} index - インデックス
 * @returns {string} モデル ID
 */
function generateModelId(fileName, index) {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substr(2, 8);
  const safeName = fileName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
  return `${safeName}_${index}_${timestamp}_${randomStr}`;
}

/**
 * 単一プロジェクトの Base64 データを IndexedDB に移行
 * @param {Object} project - プロジェクトデータ
 * @returns {Promise<Object>} 移行されたプロジェクトデータ
 */
async function migrateProjectModels(project) {
  try {
    dlog('🔄 プロジェクトモデル移行開始:', {
      projectId: project.id,
      projectName: project.name,
      modelCount: project.modelSettings?.length || 0
    });

    if (!project.modelSettings || project.modelSettings.length === 0) {
      dlog('ℹ️ 移行対象のモデルがありません:', project.id);
      return project;
    }

    const migratedModelSettings = [];
    let migratedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < project.modelSettings.length; i++) {
      const model = project.modelSettings[i];
      
        dlog(`🔍 モデル ${i + 1}/${project.modelSettings.length} 処理中:`, {
        fileName: model.fileName,
        hasModelData: !!model.modelData,
        modelDataSize: model.modelData ? model.modelData.length : 0
      });

      // Base64 データが存在するかチェック
      if (!model.modelData || typeof model.modelData !== 'string' || !model.modelData.startsWith('data:')) {
          dlog(`⏭️ Base64 データなし、スキップ: ${model.fileName}`);
        migratedModelSettings.push({
          ...model,
          modelId: null // IndexedDB にデータなし
        });
        skippedCount++;
        continue;
      }

      try {
        // Base64 を Blob に変換
        const blob = base64ToBlob(model.modelData);
        
        // モデル ID を生成
        const modelId = generateModelId(model.fileName || 'model.glb', i);
        
        // メタ情報を作成
        const meta = {
          fileName: model.fileName || 'migrated_model.glb',
          fileSize: blob.size,
          mimeType: blob.type,
          originalIndex: i,
          projectId: project.id,
          migratedAt: Date.now(),
          originalTransform: model.transform,
          hasAnimations: model.hasAnimations,
          visible: model.visible
        };

        // IndexedDB に保存
        await saveModelToIDB(modelId, blob, meta);

        // 軽量化されたモデル設定を作成
        const migratedModel = {
          ...model,
          modelId, // IndexedDB の参照を追加
          modelData: undefined, // Base64 データを削除
          modelUrl: undefined   // 古い URL も削除
        };

        // 不要なプロパティを削除
        delete migratedModel.modelData;
        delete migratedModel.modelUrl;

        migratedModelSettings.push(migratedModel);
        migratedCount++;

        dlog(`✅ モデル移行完了: ${model.fileName} → ${modelId}`);
      } catch (modelError) {
        console.error(`❌ モデル移行エラー: ${model.fileName}`, modelError);
        
        // エラーが発生したモデルはモデルIDなしで保持
        migratedModelSettings.push({
          ...model,
          modelId: null,
          modelData: undefined, // Base64 データは削除
          modelUrl: undefined,
          migrationError: modelError.message
        });
        skippedCount++;
      }
    }

    // 移行されたプロジェクトデータを作成
    const migratedProject = {
      ...project,
      modelSettings: migratedModelSettings,
      migrationInfo: {
        migratedAt: Date.now(),
        totalModels: project.modelSettings.length,
        migratedCount,
        skippedCount,
        version: MIGRATION_VERSION
      }
    };

    dlog('✅ プロジェクトモデル移行完了:', {
      projectId: project.id,
      totalModels: project.modelSettings.length,
      migratedCount,
      skippedCount
    });

    return migratedProject;
  } catch (error) {
    console.error('❌ プロジェクトモデル移行エラー:', error);
    throw new Error(`プロジェクト ${project.id} の移行に失敗しました: ${error.message}`);
  }
}

/**
 * すべての Legacy Base64 データを IndexedDB に移行
 * @returns {Promise<Object>} 移行結果
 */
export async function migrateLegacyBase64ToIDB() {
  try {
    dlog('🚀 Base64 → IndexedDB マイグレーション開始');

    // 既に移行済みかチェック
    const migrationFlag = localStorage.getItem(MIGRATION_FLAG_KEY);
    if (migrationFlag) {
      const migrationInfo = JSON.parse(migrationFlag);
      dlog('ℹ️ マイグレーション済み:', migrationInfo);
      return {
        alreadyMigrated: true,
        migrationInfo
      };
    }

    // 既存のプロジェクトを取得
    const projects = getProjects();
    
    if (projects.length === 0) {
      dlog('ℹ️ 移行対象のプロジェクトがありません');
      
      // 移行完了フラグを設定
      const migrationInfo = {
        migratedAt: Date.now(),
        version: MIGRATION_VERSION,
        totalProjects: 0,
        migratedProjects: 0,
        totalModels: 0,
        migratedModels: 0
      };
      
      localStorage.setItem(MIGRATION_FLAG_KEY, JSON.stringify(migrationInfo));
      
      return {
        alreadyMigrated: false,
        migrationInfo
      };
    }

    dlog(`📊 移行対象プロジェクト数: ${projects.length}`);

    // IndexedDB の既存データをチェック
    const existingModelIds = await getAllModelIds();
    dlog(`📊 既存 IndexedDB モデル数: ${existingModelIds.length}`);

    // 各プロジェクトを順次移行
    const migratedProjects = [];
    let totalMigratedModels = 0;
    let totalSkippedModels = 0;

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      
      dlog(`🔄 プロジェクト ${i + 1}/${projects.length} 移行中: ${project.name}`);
      
      try {
        const migratedProject = await migrateProjectModels(project);
        migratedProjects.push(migratedProject);
        
        if (migratedProject.migrationInfo) {
          totalMigratedModels += migratedProject.migrationInfo.migratedCount;
          totalSkippedModels += migratedProject.migrationInfo.skippedCount;
        }
      } catch (projectError) {
        console.error(`❌ プロジェクト移行エラー: ${project.name}`, projectError);
        
        // エラーが発生したプロジェクトは元のまま保持
        migratedProjects.push({
          ...project,
          migrationError: projectError.message
        });
      }
    }

    // 移行されたプロジェクトを localStorage に保存
    dlog('🔄 移行されたプロジェクトを保存中...');
    
    // 個別に保存（サイズ制限対応）
    for (const project of migratedProjects) {
      try {
        await saveProject(project);
      } catch (saveError) {
        console.error(`❌ プロジェクト保存エラー: ${project.name}`, saveError);
      }
    }

    // 移行完了フラグを設定
    const migrationInfo = {
      migratedAt: Date.now(),
      version: MIGRATION_VERSION,
      totalProjects: projects.length,
      migratedProjects: migratedProjects.length,
      totalModels: projects.reduce((sum, p) => sum + (p.modelSettings?.length || 0), 0),
      migratedModels: totalMigratedModels,
      skippedModels: totalSkippedModels
    };

    localStorage.setItem(MIGRATION_FLAG_KEY, JSON.stringify(migrationInfo));

    dlog('🎉 Base64 → IndexedDB マイグレーション完了:', migrationInfo);

    return {
      alreadyMigrated: false,
      migrationInfo
    };
  } catch (error) {
    console.error('❌ マイグレーション全体エラー:', error);
    throw new Error(`マイグレーションに失敗しました: ${error.message}`);
  }
}

/**
 * マイグレーション状態をリセット（テスト用）
 */
export function resetMigrationFlag() {
  try {
    localStorage.removeItem(MIGRATION_FLAG_KEY);
    dlog('✅ マイグレーションフラグをリセットしました');
    return true;
  } catch (error) {
    console.error('❌ マイグレーションフラグリセットエラー:', error);
    return false;
  }
}

/**
 * マイグレーション状態を取得
 * @returns {Object|null} マイグレーション情報
 */
export function getMigrationInfo() {
  try {
    const migrationFlag = localStorage.getItem(MIGRATION_FLAG_KEY);
    return migrationFlag ? JSON.parse(migrationFlag) : null;
  } catch (error) {
    console.error('❌ マイグレーション情報取得エラー:', error);
    return null;
  }
}

/**
 * アプリケーション初期化時のマイグレーション実行
 * @returns {Promise<void>}
 */
export async function initializeMigration() {
  try {
    dlog('🔄 アプリケーション初期化マイグレーション開始');
    
    const result = await migrateLegacyBase64ToIDB();
    
    if (result.alreadyMigrated) {
      dlog('ℹ️ マイグレーション済み、スキップ');
    } else {
      dlog('✅ 初期化マイグレーション完了:', result.migrationInfo);
    }
    
    return result;
  } catch (error) {
    console.error('❌ 初期化マイグレーションエラー:', error);
    // エラーが発生してもアプリケーションは続行
    return {
      error: error.message,
      alreadyMigrated: false
    };
  }
}
