// src/api/projects.js
// IndexedDB対応のプロジェクト関連API機能

import { 
  saveModelToIDB, 
  loadModelBlob, 
  loadModelMeta, 
  removeModel as removeModelFromIDB,
  getAllModelIds,
  getStorageInfo,
  clearAllModels
} from '../storage/indexeddb-storage.js';

import { exportProjectBundle } from '../utils/publish.js';

const PROJECTS_STORAGE_KEY = 'miruwebAR_projects';

/**
 * プロジェクトデータの構造を生成（IndexedDB対応）
 * @param {Object} data - 保存するプロジェクトのデータ
 * @param {Object} viewerInstance - ARビューアインスタンス
 * @returns {Object} - 構造化されたプロジェクトデータ
 */
async function createProjectData(data, viewerInstance) {
    try {
        // 新規プロジェクト用のIDを生成
        const projectId = data.id || `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // モデル設定を保存（実際のファイルはIndexedDBに）
        let modelSettings = [];
        let savedModelIds = [];
        
        if (viewerInstance && viewerInstance.controls && viewerInstance.controls.getAllModels) {
            try {
                const allModels = viewerInstance.controls.getAllModels();
                
                if (!Array.isArray(allModels)) {
                    throw new Error('モデルデータの取得に失敗しました');
                }

                // 各モデルをIndexedDBに保存
                for (let index = 0; index < allModels.length; index++) {
                    const model = allModels[index];
                    
                    // モデルIDを生成
                    const modelId = `${projectId}_model_${index}_${Date.now()}`;
                    
                    // モデルデータをIndexedDBに保存
                    if (model.modelData) {
                        try {
                            // データ形式を判定してBlobに変換
                            let modelBlob;
                            
                            if (model.modelData instanceof Blob) {
                                // 既にBlobの場合はそのまま使用
                                modelBlob = model.modelData;
                            } else if (typeof model.modelData === 'string' && model.modelData.startsWith('data:')) {
                                // Base64データの場合は変換
                                const response = await fetch(model.modelData);
                                modelBlob = await response.blob();
                            } else {
                                console.warn(`⚠️ モデル${index} 不明なデータ形式をスキップ`);
                                continue;
                            }
                            
                            // IndexedDBに保存
                            await saveModelToIDB(modelId, modelBlob, {
                                fileName: model.fileName,
                                fileSize: model.fileSize,
                                projectId: projectId,
                                modelIndex: index,
                                hasAnimations: model.hasAnimations || false,
                                createdAt: Date.now()
                            });
                            
                            savedModelIds.push(modelId);
                            
                        } catch (saveError) {
                            console.error(`❌ モデル${index} IndexedDB保存エラー:`, saveError);
                            // エラーでも処理を継続
                        }
                    }
                    
                    // 設定データのみを保存（軽量化）
                    const modelSetting = {
                        // ファイル情報
                        fileName: String(model.fileName || `model_${index + 1}`).substring(0, 50),
                        fileSize: String(model.fileSize || 0).substring(0, 10),
                        modelId: modelId, // IndexedDBの参照ID
                        
                        // 変換設定
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
                        order: index
                    };
                    
                    modelSettings.push(modelSetting);
                }
                
            } catch (modelError) {
                console.error('❌ モデルデータ処理エラー:', modelError);
                throw new Error(`モデルデータの処理に失敗しました: ${modelError.message}`);
            }
        }
        
        // デフォルトローディング設定を作成
        const defaultLoadingScreen = {
            enabled: true,
            template: 'default',
            backgroundColor: '#1a1a1a',
            textColor: '#ffffff',
            progressColor: '#4CAF50',
            logoImage: null, // Base64画像データまたはnull
            message: 'ARコンテンツを準備中...',
            showProgress: true,
            customCSS: null
        };

        // 軽量プロジェクトデータ（設定のみ、ファイルはIndexedDB）
        const lightweightProject = {
            id: projectId,
            name: String(data.name || 'Untitled').substring(0, 50),
            description: String(data.description || '').substring(0, 200),
            type: data.type || 'markerless',
            
            // モデル設定（IndexedDB参照IDを含む）
            modelSettings: modelSettings,
            modelCount: modelSettings.length,
            savedModelIds: savedModelIds, // IndexedDBに保存されたモデルID一覧
            
            // 基本設定
            settings: {
                arScale: Math.round((data.arScale || 1) * 100) / 100,
                isPublic: Boolean(data.isPublic)
            },
            
            // ローディング画面設定（新規追加）
            loadingScreen: {
                ...defaultLoadingScreen,
                ...data.loadingScreen // 既存データがあれば上書き
            },
            
            // マーカー画像（Base64で保存、容量小）
            markerImage: data.markerImage || null,
            
            created: data.created || Date.now(),
            updated: Date.now()
        };
        
        return lightweightProject;
        
    } catch (error) {
        console.error('❌ createProjectData エラー:', error);
        throw new Error(`プロジェクトデータの作成に失敗しました: ${error.message}`);
    }
}

/**
 * プロジェクト一覧を取得
 * @returns {Array} - プロジェクトの配列
 */
export function getProjects() {
    try {
        const projectsJson = localStorage.getItem(PROJECTS_STORAGE_KEY);
        const projects = projectsJson ? JSON.parse(projectsJson) : [];
        
        // 既存プロジェクトでローディング設定がない場合はデフォルト値を追加
        const defaultLoadingScreen = {
            enabled: true,
            template: 'default',
            backgroundColor: '#1a1a1a',
            textColor: '#ffffff',
            progressColor: '#4CAF50',
            logoImage: null,
            message: 'ARコンテンツを準備中...',
            showProgress: true,
            customCSS: null
        };
        
        return projects.map(project => {
            if (!project.loadingScreen) {
                project.loadingScreen = { ...defaultLoadingScreen };
            }
            return project;
        });
    } catch (error) {
        console.error('❌ プロジェクト一覧取得エラー:', error);
        return [];
    }
}

/**
 * IndexedDB対応プロジェクト保存
 * @param {Object} data - 保存するプロジェクトのデータ
 * @param {Object} viewerInstance - ARビューアインスタンス
 * @returns {Object} - 保存されたプロジェクトデータ
 */
export async function saveProject(data, viewerInstance) {
    try {
        const projects = getProjects();
        
        // 非同期でプロジェクトデータを作成
        const projectData = await createProjectData(data, viewerInstance);
        
        // 既存プロジェクトの更新または新規追加
        const existingIndex = projects.findIndex(p => p.id === projectData.id);
        
        if (existingIndex >= 0) {
            // 既存プロジェクトの古いモデルファイルをクリーンアップ
            const oldProject = projects[existingIndex];
            if (oldProject.savedModelIds && Array.isArray(oldProject.savedModelIds)) {
                for (const oldModelId of oldProject.savedModelIds) {
                    try {
                        await removeModelFromIDB(oldModelId);
                    } catch (cleanupError) {
                        console.warn('⚠️ 古いモデル削除失敗:', oldModelId);
                    }
                }
            }
            
            // 既存の作成日時を保持
            projectData.created = projects[existingIndex].created;
            projects[existingIndex] = projectData;
        } else {
            projects.push(projectData);
        }
        
        // プロジェクト設定のみlocalStorageに保存（軽量）
        try {
            const dataToSave = JSON.stringify(projects);
            localStorage.setItem(PROJECTS_STORAGE_KEY, dataToSave);
            
        } catch (storageError) {
            console.error('❌ localStorage保存エラー:', storageError);
            // IndexedDBに保存済みのモデルをクリーンアップ
            if (projectData.savedModelIds) {
                for (const modelId of projectData.savedModelIds) {
                    try {
                        await removeModelFromIDB(modelId);
                    } catch (cleanupError) {
                        console.warn('⚠️ クリーンアップ失敗:', modelId);
                    }
                }
            }
            throw new Error(`プロジェクト設定の保存に失敗しました: ${storageError.message}`);
        }
        
        return projectData;
        
    } catch (error) {
        console.error('❌ IndexedDB対応プロジェクト保存エラー:', error);
        throw error;
    }
}

/**
 * プロジェクトを取得
 * @param {string} id - プロジェクトID
 * @returns {Object|null} - プロジェクトデータ
 */
export function getProject(id) {
    try {
        const projects = getProjects();
        const project = projects.find(p => p.id === id) || null;
        
        // 既存プロジェクトでローディング設定がない場合はデフォルト値を追加
        if (project && !project.loadingScreen) {
            project.loadingScreen = {
                enabled: true,
                template: 'default',
                backgroundColor: '#1a1a1a',
                textColor: '#ffffff',
                progressColor: '#4CAF50',
                logoImage: null,
                message: 'ARコンテンツを準備中...',
                showProgress: true,
                customCSS: null
            };
        }
        
        return project;
    } catch (error) {
        console.error('❌ プロジェクト取得エラー:', error);
        return null;
    }
}

/**
 * IndexedDB対応プロジェクト削除
 * @param {string} id - プロジェクトID
 * @returns {boolean} - 削除成功の場合true
 */
export async function deleteProject(id) {
    try {
        const projects = getProjects();
        const projectIndex = projects.findIndex(p => p.id === id);
        
        if (projectIndex === -1) {
            return false;
        }
        
        const project = projects[projectIndex];
        
        // IndexedDBからモデルファイルを削除
        if (project.savedModelIds && Array.isArray(project.savedModelIds)) {
            for (const modelId of project.savedModelIds) {
                try {
                    await removeModelFromIDB(modelId);
                } catch (modelDeleteError) {
                    console.warn('⚠️ モデルファイル削除失敗:', modelId);
                }
            }
        }
        
        // プロジェクト設定をlocalStorageから削除
        const filteredProjects = projects.filter(p => p.id !== id);
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(filteredProjects));
        
        return true;
        
    } catch (error) {
        console.error('❌ プロジェクト削除エラー:', error);
        return false;
    }
}

/**
 * プロジェクトのモデルデータを復元
 * @param {string} projectId - プロジェクトID
 * @returns {Promise<Array>} - モデルデータの配列
 */
export async function loadProjectModels(projectId) {
    try {
        const project = getProject(projectId);
        if (!project) {
            return [];
        }
        
        const models = [];
        
        if (project.modelSettings && Array.isArray(project.modelSettings)) {
            for (const modelSetting of project.modelSettings) {
                if (modelSetting.modelId) {
                    try {
                        // IndexedDBからモデルBlobを取得
                        const modelBlob = await loadModelBlob(modelSetting.modelId);
                        const modelMeta = await loadModelMeta(modelSetting.modelId);
                        
                        if (modelBlob) {
                            // Object URLを生成
                            const objectUrl = URL.createObjectURL(modelBlob);
                            
                            models.push({
                                ...modelSetting,
                                modelBlob: modelBlob,
                                objectUrl: objectUrl,
                                meta: modelMeta
                            });
                        }
                    } catch (modelLoadError) {
                        console.error('❌ モデル読み込みエラー:', modelSetting.modelId);
                    }
                }
            }
        }
        
        return models;
        
    } catch (error) {
        console.error('❌ プロジェクトモデル復元エラー:', error);
        throw new Error(`プロジェクトモデルの復元に失敗しました: ${error.message}`);
    }
}

/**
 * 全プロジェクトを削除（IndexedDB含む）
 * @returns {Promise<boolean>} - 削除成功の場合true
 */
export async function clearAllProjects() {
    try {
        // IndexedDBからすべてのモデルを削除
        await clearAllModels();
        
        // localStorageからプロジェクト設定を削除
        localStorage.removeItem(PROJECTS_STORAGE_KEY);
        
        return true;
        
    } catch (error) {
        console.error('❌ 全プロジェクト削除エラー:', error);
        throw new Error(`全プロジェクトの削除に失敗しました: ${error.message}`);
    }
}

/**
 * プロジェクトのローディング画面設定を更新
 * @param {string} projectId - プロジェクトID
 * @param {Object} loadingSettings - ローディング設定
 * @returns {boolean} - 更新成功の場合true
 */
export function updateLoadingScreenSettings(projectId, loadingSettings) {
    try {
        const projects = getProjects();
        const projectIndex = projects.findIndex(p => p.id === projectId);
        
        if (projectIndex === -1) {
            console.error('❌ プロジェクトが見つかりません:', projectId);
            return false;
        }
        
        // ローディング設定を更新
        projects[projectIndex].loadingScreen = {
            ...projects[projectIndex].loadingScreen,
            ...loadingSettings
        };
        
        // 更新日時を更新
        projects[projectIndex].updated = Date.now();
        
        // localStorageに保存
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
        
        console.log('✅ ローディング設定を更新しました:', {
            projectId,
            settings: loadingSettings
        });
        
        return true;
    } catch (error) {
        console.error('❌ ローディング設定更新エラー:', error);
        return false;
    }
}

/**
 * ストレージ使用状況を取得
 * @returns {Promise<Object>} - ストレージ情報
 */
export async function getProjectStorageInfo() {
    try {
        const projects = getProjects();
        const localStorageSize = JSON.stringify(projects).length;
        
        const indexedDBInfo = await getStorageInfo();
        
        return {
            localStorage: {
                projectCount: projects.length,
                size: localStorageSize,
                sizeKB: Math.round(localStorageSize / 1024),
                sizeMB: Math.round(localStorageSize / 1024 / 1024 * 100) / 100
            },
            indexedDB: indexedDBInfo,
            total: {
                size: localStorageSize + indexedDBInfo.totalSize,
                sizeKB: Math.round((localStorageSize + indexedDBInfo.totalSize) / 1024),
                sizeMB: Math.round((localStorageSize + indexedDBInfo.totalSize) / 1024 / 1024 * 100) / 100
            }
        };
    } catch (error) {
        console.error('❌ ストレージ情報取得エラー:', error);
        throw new Error(`ストレージ情報の取得に失敗しました: ${error.message}`);
    }
}

/**
 * プロジェクトの公開用ZIPを生成
 * @param {string} projectId
 * @returns {Promise<Blob>} ZIP Blob
 */
export async function exportProjectBundleById(projectId) {
  const project = getProject(projectId);
  if (!project) {
    throw new Error('プロジェクトが見つかりません');
  }
  
  // project.jsonの組み立て（viewer用の簡易形式）
  const projectJson = {
    name: project.name,
    description: project.description,
    type: project.type,
    loadingScreen: project.loadingScreen,
    // viewer側ではURLで読み込むため、assets配列を生成（IndexedDBは同梱対象外）
    models: (project.modelSettings || []).map((m) => ({
      url: `/assets/${m.fileName}`,
      fileName: m.fileName,
      fileSize: m.fileSize
    }))
  };

  // 同梱対象のアセットURL（ローカルのpublic/assetsから取得を想定）
  const assetUrls = (project.modelSettings || [])
    .filter(m => m.fileName)
    .map(m => `${window.location.origin}/assets/${m.fileName}`);

  return await exportProjectBundle({ project: projectJson, assetUrls });
}
