// src/storage/migrate.js
// localStorage の Base64 データを IndexedDB に移行するマイグレーション機能

import { saveModelToIDB, getAllModelIds } from './indexeddb-storage.js';
import { getProjects, saveProject } from './project-store.js';
import { TEMPLATES_STORAGE_KEY } from '../components/loading-screen/template-manager.js';

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

    if (!project.modelSettings || project.modelSettings.length === 0) {
      return project;
    }

    const migratedModelSettings = [];
    let migratedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < project.modelSettings.length; i++) {
      const model = project.modelSettings[i];

      // Base64 データが存在するかチェック
      if (!model.modelData || typeof model.modelData !== 'string' || !model.modelData.startsWith('data:')) {
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

    // 既に移行済みかチェック
    const migrationFlag = localStorage.getItem(MIGRATION_FLAG_KEY);
    if (migrationFlag) {
      const migrationInfo = JSON.parse(migrationFlag);
      return {
        alreadyMigrated: true,
        migrationInfo
      };
    }

    // 既存のプロジェクトを取得
    const projects = getProjects();
    
    if (projects.length === 0) {
      
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


    // IndexedDB の既存データをチェック
    const existingModelIds = await getAllModelIds();

    // 各プロジェクトを順次移行
    const migratedProjects = [];
    let totalMigratedModels = 0;
    let totalSkippedModels = 0;

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      
      
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
 * ローディング画面テンプレートの localStorage キー統一移行とデータ正規化
 * @returns {Promise<void>}
 */
async function migrateTemplateStorageKeys() {
  try {
    
    const oldKey = 'loadingScreenTemplates';
    const newKey = TEMPLATES_STORAGE_KEY;
    
    let templates = [];
    let dataSource = 'new';
    
    // 新キーのデータを確認
    const newKeyData = localStorage.getItem(newKey);
    if (newKeyData) {
      try {
        templates = JSON.parse(newKeyData);
        dataSource = 'existing';
      } catch (parseError) {
        console.warn('⚠️ 新キーのデータが破損、初期化します:', parseError);
        templates = [];
        dataSource = 'reset';
      }
    } else {
      // 旧キーからデータを取得
      const oldData = localStorage.getItem(oldKey);
      if (oldData) {
        try {
          const parsedData = JSON.parse(oldData);
          if (Array.isArray(parsedData)) {
            templates = parsedData;
            dataSource = 'migrated';
            // 旧キーを削除
            localStorage.removeItem(oldKey);
          } else {
            templates = [];
            dataSource = 'invalid';
          }
        } catch (parseError) {
          console.warn('⚠️ 旧キーのデータが破損している可能性があります:', parseError);
          localStorage.removeItem(oldKey); // 破損データを削除
          templates = [];
          dataSource = 'corrupted';
        }
      } else {
        templates = [];
        dataSource = 'empty';
      }
    }
    
    // データの正規化（createdAt/updatedAt → created/updated）
    let normalizedCount = 0;
    const normalizedTemplates = templates.map(template => {
      let needsNormalization = false;
      const normalized = { ...template };
      
      // createdAt → created への変換
      if (template.createdAt && !template.created) {
        if (typeof template.createdAt === 'string') {
          // 日付文字列をタイムスタンプに変換
          try {
            normalized.created = new Date(template.createdAt).getTime();
          } catch (dateError) {
            normalized.created = Date.now();
          }
        } else {
          normalized.created = template.createdAt;
        }
        delete normalized.createdAt;
        needsNormalization = true;
      }
      
      // updatedAt → updated への変換
      if (template.updatedAt && !template.updated) {
        if (typeof template.updatedAt === 'string') {
          // 日付文字列をタイムスタンプに変換
          try {
            normalized.updated = new Date(template.updatedAt).getTime();
          } catch (dateError) {
            normalized.updated = Date.now();
          }
        } else {
          normalized.updated = template.updatedAt;
        }
        delete normalized.updatedAt;
        needsNormalization = true;
      }
      
      // デフォルト値の設定
      if (!normalized.created) {
        normalized.created = Date.now();
        needsNormalization = true;
      }
      if (!normalized.updated) {
        normalized.updated = normalized.created;
        needsNormalization = true;
      }
      
      if (needsNormalization) {
        normalizedCount++;
      }
      
      return normalized;
    });
    
    // 正規化されたデータを保存（変更があった場合のみ）
    if (normalizedCount > 0 || dataSource !== 'existing') {
      localStorage.setItem(newKey, JSON.stringify(normalizedTemplates));

    } else {
    }
    
  } catch (error) {
    console.warn('⚠️ テンプレートストレージキー移行中にエラー:', error);
  }
}

/**
 * プロジェクトのテンプレート参照を正規化
 * selectedScreenId から loadingScreen.template への移行処理
 * @returns {Promise<void>}
 */
async function migrateProjectTemplateReferences() {
  try {
    
    const projectsJson = localStorage.getItem('miruwebAR_projects');
    if (!projectsJson) {
      return;
    }
    
    let projects;
    try {
      projects = JSON.parse(projectsJson);
    } catch (parseError) {
      console.warn('⚠️ プロジェクトデータ解析エラー:', parseError);
      return;
    }
    
    if (!Array.isArray(projects)) {
      return;
    }
    
    let migratedCount = 0;
    const migratedProjects = projects.map(project => {
      const migrated = { ...project };
      let needsMigration = false;
      
      // loadingScreen が存在する場合
      if (project.loadingScreen) {
        // selectedScreenId から template への移行
        if (project.loadingScreen.selectedScreenId && 
            !project.loadingScreen.template && 
            project.loadingScreen.selectedScreenId !== 'none') {
          migrated.loadingScreen.template = project.loadingScreen.selectedScreenId;
          needsMigration = true;
        }
        
        // template が存在しない場合はデフォルト値を設定
        if (!migrated.loadingScreen.template) {
          migrated.loadingScreen.template = 'default';
          needsMigration = true;
        }
      } else if (project.selectedScreenId && project.selectedScreenId !== 'none') {
        // 古い形式: プロジェクト直下に selectedScreenId がある場合
        migrated.loadingScreen = {
          ...migrated.loadingScreen,
          template: project.selectedScreenId
        };
        needsMigration = true;
      }
      
      if (needsMigration) {
        migratedCount++;

      }
      
      return migrated;
    });
    
    // 変更があった場合のみ保存
    if (migratedCount > 0) {
      localStorage.setItem('miruwebAR_projects', JSON.stringify(migratedProjects));

    } else {
    }
    
  } catch (error) {
    console.warn('⚠️ プロジェクトテンプレート参照正規化中にエラー:', error);
  }
}

/**
 * ロゴプロパティ名の正規化（logoImage → logo）
 * プロジェクトデータとテンプレートデータのロゴプロパティを統一
 * @returns {Promise<void>}
 */
async function migrateLogoPropertyNames() {
  try {
    
    let migratedCount = 0;
    
    // プロジェクトデータの移行
    const projectsJson = localStorage.getItem('miruwebAR_projects');
    if (projectsJson) {
      try {
        const projects = JSON.parse(projectsJson);
        if (Array.isArray(projects)) {
          const migratedProjects = projects.map(project => {
            const migrated = { ...project };
            let needsMigration = false;
            
            // loadingScreen.logoImage → loadingScreen.logo
            if (migrated.loadingScreen?.logoImage && !migrated.loadingScreen?.logo) {
              migrated.loadingScreen.logo = migrated.loadingScreen.logoImage;
              delete migrated.loadingScreen.logoImage;
              needsMigration = true;
            }
            
            // startScreen.logoImage → startScreen.logo
            if (migrated.startScreen?.logoImage && !migrated.startScreen?.logo) {
              migrated.startScreen.logo = migrated.startScreen.logoImage;
              delete migrated.startScreen.logoImage;
              needsMigration = true;
            }
            
            if (needsMigration) {
              migratedCount++;
            }
            
            return migrated;
          });
          
          if (migratedCount > 0) {
            localStorage.setItem('miruwebAR_projects', JSON.stringify(migratedProjects));
          }
        }
      } catch (parseError) {
        console.warn('⚠️ プロジェクトデータ解析エラー:', parseError);
      }
    }
    
    // テンプレートデータの移行
    const templatesJson = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (templatesJson) {
      try {
        const templates = JSON.parse(templatesJson);
        if (Array.isArray(templates)) {
          const migratedTemplates = templates.map(template => {
            const migrated = { ...template };
            let needsMigration = false;
            
            // settings.loadingScreen.logoImage → settings.loadingScreen.logo
            if (migrated.settings?.loadingScreen?.logoImage && !migrated.settings?.loadingScreen?.logo) {
              migrated.settings.loadingScreen.logo = migrated.settings.loadingScreen.logoImage;
              delete migrated.settings.loadingScreen.logoImage;
              needsMigration = true;
            }
            
            // settings.startScreen.logoImage → settings.startScreen.logo
            if (migrated.settings?.startScreen?.logoImage && !migrated.settings?.startScreen?.logo) {
              migrated.settings.startScreen.logo = migrated.settings.startScreen.logoImage;
              delete migrated.settings.startScreen.logoImage;
              needsMigration = true;
            }
            
            if (needsMigration) {
              migratedCount++;
            }
            
            return migrated;
          });
          
          if (migratedCount > 0) {
            localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(migratedTemplates));
          }
        }
      } catch (parseError) {
        console.warn('⚠️ テンプレートデータ解析エラー:', parseError);
      }
    }
    
    if (migratedCount > 0) {
    } else {
    }
    
  } catch (error) {
    console.warn('⚠️ ロゴプロパティ名正規化中にエラー:', error);
  }
}

/**
 * アプリケーション初期化時のマイグレーション実行
 * @returns {Promise<void>}
 */
export async function initializeMigration() {
  try {
    
    // localStorage キー統一移行を最初に実行
    await migrateTemplateStorageKeys();
    
    // プロジェクトテンプレート参照の正規化
    await migrateProjectTemplateReferences();
    
    // ロゴプロパティ名の正規化
    await migrateLogoPropertyNames();
    
    // Base64 → IndexedDB 移行を実行
    const result = await migrateLegacyBase64ToIDB();
    
    if (result.alreadyMigrated) {
    } else {
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
