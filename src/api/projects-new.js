// src/api/projects-new.js
// 新しい IndexedDB + localStorage ストレージシステムを使ったプロジェクト API

import { saveModelToIDB, loadModelBlob, loadModelMeta, removeModel } from '../storage/indexeddb-storage.js';
import { saveProject as saveProjectToLocalList, getProjects, getProject, deleteProject as deleteProjectSettings } from '../storage/project-store.js';
import { loadGLBFromIDB, createTemporaryObjectURL, revokeModelObjectURL } from '../loader/loadGLBFromIDB.js';
import { exportProjectBundle } from '../utils/publish.js';

/**
 * モデルデータを IndexedDB に保存し、軽量化されたプロジェクトデータを作成
 * @param {Object} data - 保存するプロジェクトのデータ
 * @param {Object} viewerInstance - ARビューアインスタンス
 * @returns {Object} - 構造化されたプロジェクトデータ
 */
async function createProjectDataWithIDB(data, viewerInstance) {
  try {
    console.log('🔄 createProjectDataWithIDB開始 [IndexedDB版]');
    
    // プロジェクト ID を生成
    const projectId = data.id || `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('✅ プロジェクトID:', projectId);
    
    let modelSettings = [];
    
    console.log('🔍 viewerInstance チェック:', {
      hasViewerInstance: !!viewerInstance,
      hasControls: !!viewerInstance?.controls,
      hasGetAllModels: !!viewerInstance?.controls?.getAllModels
    });
    
    if (viewerInstance && viewerInstance.controls && viewerInstance.controls.getAllModels) {
      console.log('🔄 モデルデータ取得開始 [IndexedDB対応]...');
      
      try {
        const allModels = viewerInstance.controls.getAllModels();
        console.log('✅ モデル数:', allModels.length);
        console.log('🔍 取得したモデル一覧:');
        allModels.forEach((model, i) => {
          console.log(`  モデル${i}:`, {
            fileName: model.fileName,
            fileSize: model.fileSize,
            hasSourceFile: !!model._sourceFile,
            sourceFileType: model._sourceFile?.constructor?.name,
            hasModelData: !!model.modelData,
            hasModelUrl: !!model.modelUrl
          });
        });
        
        if (!Array.isArray(allModels)) {
          console.error('❌ getAllModels()の戻り値が配列ではありません:', typeof allModels);
          throw new Error('モデルデータの取得に失敗しました');
        }
        
        // 各モデルを IndexedDB に保存
        for (let index = 0; index < allModels.length; index++) {
          const model = allModels[index];
          
          console.log(`🔍 モデル${index}の処理:`, {
            fileName: model.fileName,
            hasPosition: !!model.position,
            hasRotation: !!model.rotation,
            hasScale: !!model.scale,
            hasAnimations: model.hasAnimations,
            hasModelData: !!model.modelData
          });
          
          let modelId = null;
          
          // モデルデータが存在する場合は IndexedDB に保存
          if (model._sourceFile || model.modelData) {
            try {
              // モデル ID を生成
              modelId = `${projectId}_model_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
              
              let modelBlob = null;
              
              // 元ファイルがある場合は優先的に使用
              if (model._sourceFile && model._sourceFile instanceof File) {
                console.log(`🔄 元ファイルを使用してIndexedDBに保存: ${model.fileName}`, {
                  fileName: model._sourceFile.name,
                  fileSize: model._sourceFile.size,
                  fileType: model._sourceFile.type
                });
                modelBlob = model._sourceFile;
              } else if (typeof model.modelData === 'string' && model.modelData.startsWith('data:')) {
                // Base64 データの場合
                console.log(`🔄 Base64データをBlobに変換: ${model.fileName}`);
                const base64Data = model.modelData.split(',')[1];
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                
                modelBlob = new Blob([bytes], { type: 'model/gltf-binary' });
              } else if (model.modelData instanceof Blob) {
                // 既に Blob の場合
                modelBlob = model.modelData;
              } else if (model.modelData instanceof ArrayBuffer) {
                // ArrayBuffer の場合
                modelBlob = new Blob([model.modelData], { type: 'model/gltf-binary' });
              } else {
                console.warn(`⚠️ 未対応のモデルデータ形式: ${typeof model.modelData}`);
              }
              
              if (modelBlob) {
                // メタ情報を作成
                const meta = {
                  fileName: model.fileName || `model_${index + 1}.glb`,
                  fileSize: modelBlob.size,
                  mimeType: modelBlob.type,
                  projectId,
                  modelIndex: index,
                  hasAnimations: Boolean(model.hasAnimations),
                  transform: {
                    position: model.position || { x: 0, y: 0, z: 0 },
                    rotation: model.rotation || { x: 0, y: 0, z: 0 },
                    scale: model.scale || { x: 1, y: 1, z: 1 }
                  },
                  visible: Boolean(model.visible !== false),
                  createdAt: Date.now()
                };
                
                // IndexedDB に保存
                await saveModelToIDB(modelId, modelBlob, meta);
                
                console.log(`✅ モデル IndexedDB 保存完了: ${model.fileName} → ${modelId}`);
              }
            } catch (modelSaveError) {
              console.error(`❌ モデル保存エラー: ${model.fileName}`, modelSaveError);
              modelId = null; // 保存に失敗した場合は null
            }
          }
          
          // 軽量化されたモデル設定を作成
          const lightweightModelSettings = {
            fileName: String(model.fileName || `model_${index + 1}.glb`).substring(0, 100),
            fileSize: model.fileSize || 0,
            modelId, // IndexedDB の参照
            transform: {
              position: {
                x: Math.round((Number(model.position?.x || 0) || 0) * 100) / 100,
                y: Math.round((Number(model.position?.y || 0) || 0) * 100) / 100,
                z: Math.round((Number(model.position?.z || 0) || 0) * 100) / 100
              },
              rotation: {
                x: Math.round((Number(model.rotation?.x || 0) || 0) * 100) / 100,
                y: Math.round((Number(model.rotation?.y || 0) || 0) * 100) / 100,
                z: Math.round((Number(model.rotation?.z || 0) || 0) * 100) / 100
              },
              scale: {
                x: Math.round((Number(model.scale?.x || 1) || 1) * 100) / 100,
                y: Math.round((Number(model.scale?.y || 1) || 1) * 100) / 100,
                z: Math.round((Number(model.scale?.z || 1) || 1) * 100) / 100
              }
            },
            visible: Boolean(model.visible !== false),
            hasAnimations: Boolean(model.hasAnimations),
            order: index,
            mimeType: 'model/gltf-binary',
            lastModified: Date.now()
          };
          
          modelSettings.push(lightweightModelSettings);
          
          console.log(`✅ モデル${index}の軽量設定作成完了:`, {
            fileName: lightweightModelSettings.fileName,
            hasModelId: !!lightweightModelSettings.modelId
          });
        }
        
        console.log('✅ 全モデル処理完了:', modelSettings.length);
      } catch (modelError) {
        console.error('❌ モデルデータ処理エラー:', modelError);
        throw new Error(`モデルデータの処理に失敗しました: ${modelError.message}`);
      }
    } else {
      console.log('ℹ️ モデルデータが利用できません（viewerInstanceまたはgetAllModelsが存在しない）');
    }
    
    // 軽量化プロジェクトデータを作成
    const lightweightProject = {
      id: projectId,
      name: String(data.name || 'Untitled').substring(0, 50),
      description: String(data.description || '').substring(0, 200),
      type: data.type || 'markerless',
      
      // モデル設定（IndexedDB 参照のみ）
      modelSettings: modelSettings,
      modelCount: modelSettings.length,
      
      // 基本設定
      settings: {
        arScale: Math.round((data.arScale || 1) * 100) / 100,
        isPublic: Boolean(data.isPublic),
        showGrid: Boolean(data.showGrid !== false),
        backgroundColor: data.backgroundColor || 0x222222
      },
      
      // マーカー画像とパターン
      markerImage: data.markerImage && data.markerImage.length < 1500000 ? data.markerImage : null,
      markerPattern: data.markerPattern || null,
      
      // ローディング画面設定
      loadingScreen: data.loadingScreen || null,
      // スタート/ガイド画面設定（ビューアで直接反映できるよう保持）
      startScreen: data.startScreen || null,
      guideScreen: data.guideScreen || null,
      
      created: data.created || Date.now(),
      updated: Date.now(),
      
      // 統計情報
      stats: {
        views: data.stats?.views || 0,
        lastViewed: data.stats?.lastViewed
      }
    };
    
    console.log('🔍 軽量化後のプロジェクトデータサイズ:', JSON.stringify(lightweightProject).length, 'characters');
    
    return lightweightProject;
  } catch (error) {
    console.error('❌ createProjectDataWithIDB エラー:', error);
    throw new Error(`プロジェクトデータの作成に失敗しました: ${error.message}`);
  }
}

/**
 * プロジェクトを保存（IndexedDB + localStorage）
 * @param {Object} data - 保存するプロジェクトのデータ
 * @param {Object} viewerInstance - ARビューアインスタンス
 * @returns {Object} - 保存されたプロジェクトデータ
 */
export async function saveProject(data, viewerInstance) {
  try {
    console.log('🔄 saveProject開始 [IndexedDB版]:', {
      dataKeys: Object.keys(data || {}),
      hasViewerInstance: !!viewerInstance,
      viewerHasControls: !!viewerInstance?.controls
    });
    
    // プロジェクトデータを作成（モデルを IndexedDB に保存）
    const projectData = await createProjectDataWithIDB(data, viewerInstance);
    
    console.log('✅ プロジェクトデータ作成完了:', {
      id: projectData.id,
      name: projectData.name,
      modelCount: projectData.modelSettings?.length || 0
    });
    
    // 軽量化されたプロジェクトデータを localStorage に保存（一覧に反映）
    const savedProject = saveProjectToLocalList(projectData);
    
    console.log('✅ プロジェクト保存完了 [IndexedDB版]:', {
      id: savedProject.id,
      name: savedProject.name,
      modelCount: savedProject.modelCount
    });
    
    return savedProject;
  } catch (error) {
    console.error('❌ プロジェクト保存処理でエラー [IndexedDB版]:', error);
    throw error;
  }
}

/**
 * プロジェクトのモデルデータを復元
 * @param {Object} project - プロジェクトデータ
 * @returns {Promise<Object>} - モデルデータが復元されたプロジェクト
 */
export async function loadProjectWithModels(project) {
  try {
    console.log('🔄 プロジェクトモデル復元開始:', {
      projectId: project.id,
      projectName: project.name,
      modelCount: project.modelSettings?.length || 0
    });
    
    if (!project.modelSettings || project.modelSettings.length === 0) {
      console.log('ℹ️ 復元対象のモデルがありません');
      return {
        ...project,
        modelData: []
      };
    }
    
    const restoredModels = [];
    
    for (let i = 0; i < project.modelSettings.length; i++) {
      const modelSettings = project.modelSettings[i];
      
      console.log(`🔍 モデル ${i + 1}/${project.modelSettings.length} 復元中:`, {
        fileName: modelSettings.fileName,
        hasModelId: !!modelSettings.modelId
      });
      
      if (!modelSettings.modelId) {
        console.log(`⚠️ モデル ID なし、スキップ: ${modelSettings.fileName}`);
        restoredModels.push({
          ...modelSettings,
          objectUrl: null,
          error: 'モデルデータが見つかりません'
        });
        continue;
      }
      
      try {
        // IndexedDB からモデルを読み込み
        const modelData = await loadGLBFromIDB(modelSettings.modelId);
        
        restoredModels.push({
          ...modelSettings,
          objectUrl: modelData.objectUrl,
          blob: modelData.blob,
          meta: modelData.meta
        });
        
        console.log(`✅ モデル復元完了: ${modelSettings.fileName}`);
      } catch (modelError) {
        console.error(`❌ モデル復元エラー: ${modelSettings.fileName}`, modelError);
        
        restoredModels.push({
          ...modelSettings,
          objectUrl: null,
          error: modelError.message
        });
      }
    }
    
    console.log('✅ プロジェクトモデル復元完了:', {
      projectId: project.id,
      totalModels: project.modelSettings.length,
      restoredModels: restoredModels.filter(m => m.objectUrl).length,
      failedModels: restoredModels.filter(m => m.error).length
    });
    
    return {
      ...project,
      modelData: restoredModels
    };
  } catch (error) {
    console.error('❌ プロジェクトモデル復元エラー:', error);
    throw new Error(`プロジェクトモデルの復元に失敗しました: ${error.message}`);
  }
}

/**
 * プロジェクトを削除（IndexedDB のモデルも削除）
 * @param {string} id - プロジェクトID
 * @returns {Promise<boolean>} - 削除成功の場合 true
 */
export async function deleteProject(id) {
  try {
    console.log('🔄 プロジェクト削除開始 [IndexedDB版]:', id);
    
    // プロジェクトデータを取得
    const project = getProject(id);
    
    if (!project) {
      console.warn('⚠️ 削除対象のプロジェクトが見つかりません:', id);
      return false;
    }
    
    // 関連するモデルを IndexedDB から削除
    if (project.modelSettings && project.modelSettings.length > 0) {
      console.log(`🔄 関連モデル削除開始: ${project.modelSettings.length}個`);
      
      for (const modelSettings of project.modelSettings) {
        if (modelSettings.modelId) {
          try {
            await removeModel(modelSettings.modelId);
            console.log(`✅ モデル削除完了: ${modelSettings.fileName}`);
          } catch (modelDeleteError) {
            console.error(`❌ モデル削除エラー: ${modelSettings.fileName}`, modelDeleteError);
          }
        }
      }
    }
    
    // localStorage からプロジェクト設定を削除
    const success = deleteProjectSettings(id);
    
    console.log('✅ プロジェクト削除完了 [IndexedDB版]:', {
      projectId: id,
      success
    });
    
    return success;
  } catch (error) {
    console.error('❌ プロジェクト削除エラー [IndexedDB版]:', error);
    return false;
  }
}

/**
 * プロジェクトの公開用ZIPを生成（project-store を参照し一貫したデータソースを使用）
 * @param {string} projectId
 * @returns {Promise<Blob>} ZIP Blob
 */
export async function exportProjectBundleById(projectId) {
  const project = getProject(projectId);
  if (!project) {
    throw new Error('プロジェクトが見つかりません');
  }

  let loadingScreen = project.loadingScreen || {};
  let startScreen = project.startScreen || null;
  let guideScreen = project.guideScreen || null;

  try {
    if ((!loadingScreen.templateSettings || Object.keys(loadingScreen.templateSettings || {}).length === 0) && loadingScreen.selectedScreenId && loadingScreen.selectedScreenId !== 'none') {
      const { TEMPLATES_STORAGE_KEY } = await import('../components/loading-screen/template-manager.js');
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (stored) {
        const templates = JSON.parse(stored);
        const tpl = templates.find(t => t.id === loadingScreen.selectedScreenId);
        if (tpl && tpl.settings) {
          const { startScreen: ts, loadingScreen: tl, guideScreen: tg } = tpl.settings;
          loadingScreen = { ...loadingScreen, templateSettings: {} };
          if (tl) loadingScreen.templateSettings.loadingScreen = tl;
          if (ts && !startScreen) startScreen = ts;
          if (tg && !guideScreen) guideScreen = tg;
        }
      }
    }
  } catch (_) {}

  const projectJson = {
    name: project.name,
    description: project.description,
    type: project.type,
    loadingScreen,
    startScreen,
    guideScreen,
    models: (project.modelSettings || []).map((m) => ({
      url: `/assets/${m.fileName}`,
      fileName: m.fileName,
      fileSize: m.fileSize
    }))
  };

  const assetUrls = (project.modelSettings || [])
    .filter(m => m.fileName)
    .map(m => `${window.location.origin}/assets/${m.fileName}`);

  return await exportProjectBundle({ project: projectJson, assetUrls });
}

// 既存 API との互換性のため、従来の関数をエクスポート
export { getProjects, getProject };
