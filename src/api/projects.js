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

const PROJECTS_STORAGE_KEY = 'miruwebAR_projects';

/**
 * プロジェクトデータの構造を生成（IndexedDB対応）
 * @param {Object} data - 保存するプロジェクトのデータ
 * @param {Object} viewerInstance - ARビューアインスタンス
 * @returns {Object} - 構造化されたプロジェクトデータ
 */
async function createProjectData(data, viewerInstance) {
    try {
        console.log('🔄 IndexedDB対応 createProjectData開始');
        
        // 新規プロジェクト用のIDを生成
        const projectId = data.id || `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('✅ プロジェクトID:', projectId);
        
        // モデル設定を保存（実際のファイルはIndexedDBに）
        let modelSettings = [];
        let savedModelIds = [];
        
        console.log('🔍 viewerInstance チェック:', {
            hasViewerInstance: !!viewerInstance,
            hasControls: !!viewerInstance?.controls,
            hasGetAllModels: !!viewerInstance?.controls?.getAllModels
        });
        
        if (viewerInstance && viewerInstance.controls && viewerInstance.controls.getAllModels) {
            console.log('🔄 モデルデータ取得開始...');
            try {
                const allModels = viewerInstance.controls.getAllModels();
                console.log('✅ モデル数:', allModels.length);
                
                if (!Array.isArray(allModels)) {
                    console.error('❌ getAllModels()の戻り値が配列ではありません:', typeof allModels);
                    throw new Error('モデルデータの取得に失敗しました');
                }

                // 各モデルをIndexedDBに保存
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
                    
                    // モデルIDを生成
                    const modelId = `${projectId}_model_${index}_${Date.now()}`;
                    
                    // モデルデータをIndexedDBに保存
                    if (model.modelData) {
                        try {
                            // データ形式を判定してBlobに変換
                            let modelBlob;
                            
                            console.log(`🔍 モデル${index}データ形式チェック:`, {
                                type: typeof model.modelData,
                                isBlob: model.modelData instanceof Blob,
                                isString: typeof model.modelData === 'string',
                                size: model.modelData.size || model.modelData.length
                            });
                            
                            if (model.modelData instanceof Blob) {
                                // 既にBlobの場合はそのまま使用
                                modelBlob = model.modelData;
                                console.log(`✅ モデル${index} Blob直接使用:`, modelBlob.size, 'bytes');
                            } else if (typeof model.modelData === 'string' && model.modelData.startsWith('data:')) {
                                // Base64データの場合は変換
                                console.log(`🔄 モデル${index} Base64 -> Blob変換開始...`);
                                const response = await fetch(model.modelData);
                                modelBlob = await response.blob();
                                console.log(`✅ モデル${index} Base64変換完了:`, modelBlob.size, 'bytes');
                            } else {
                                console.warn(`⚠️ モデル${index} 不明なデータ形式:`, {
                                    type: typeof model.modelData,
                                    constructor: model.modelData?.constructor?.name,
                                    preview: model.modelData?.toString?.()?.substring(0, 50)
                                });
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
                            console.log(`✅ モデル${index} IndexedDB保存完了:`, modelId);
                            
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
                    console.log(`✅ モデル${index}の設定データ:`, {
                        fileName: modelSetting.fileName,
                        modelId: modelSetting.modelId
                    });
                }
                
                console.log('✅ 全モデル処理完了:', { 
                    modelCount: modelSettings.length,
                    savedToIndexedDB: savedModelIds.length
                });
                
            } catch (modelError) {
                console.error('❌ モデルデータ処理エラー:', modelError);
                throw new Error(`モデルデータの処理に失敗しました: ${modelError.message}`);
            }
        } else {
            console.log('ℹ️ モデルデータが利用できません（viewerInstanceまたはgetAllModelsが存在しない）');
        }
        
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
            
            // マーカー画像（Base64で保存、容量小）
            markerImage: data.markerImage || null,
            
            created: data.created || Date.now(),
            updated: Date.now()
        };
        
        const dataSize = JSON.stringify(lightweightProject).length;
        console.log('🔍 軽量化後のプロジェクトデータサイズ:', {
            characters: dataSize,
            KB: Math.round(dataSize / 1024),
            MB: Math.round(dataSize / 1024 / 1024 * 100) / 100
        });
        
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
        return projectsJson ? JSON.parse(projectsJson) : [];
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
        console.log('🔄 IndexedDB対応 saveProject開始:', {
            dataKeys: Object.keys(data || {}),
            hasViewerInstance: !!viewerInstance,
            viewerHasControls: !!viewerInstance?.controls
        });
        
        const projects = getProjects();
        console.log('✅ 既存プロジェクト数:', projects.length);
        
        // 非同期でプロジェクトデータを作成
        const projectData = await createProjectData(data, viewerInstance);
        console.log('✅ IndexedDB対応プロジェクトデータ作成完了:', {
            id: projectData.id,
            name: projectData.name,
            modelCount: projectData.modelSettings?.length || 0,
            indexedDBModels: projectData.savedModelIds?.length || 0
        });
        
        // 既存プロジェクトの更新または新規追加
        const existingIndex = projects.findIndex(p => p.id === projectData.id);
        console.log('既存プロジェクトインデックス:', existingIndex);
        
        if (existingIndex >= 0) {
            // 既存プロジェクトの古いモデルファイルをクリーンアップ
            const oldProject = projects[existingIndex];
            if (oldProject.savedModelIds && Array.isArray(oldProject.savedModelIds)) {
                console.log('🧹 古いモデルファイルをクリーンアップ中...');
                for (const oldModelId of oldProject.savedModelIds) {
                    try {
                        await removeModelFromIDB(oldModelId);
                        console.log('✅ 古いモデル削除:', oldModelId);
                    } catch (cleanupError) {
                        console.warn('⚠️ 古いモデル削除失敗:', oldModelId, cleanupError);
                    }
                }
            }
            
            // 既存の作成日時を保持
            projectData.created = projects[existingIndex].created;
            projects[existingIndex] = projectData;
            console.log('✅ 既存プロジェクトを更新');
        } else {
            projects.push(projectData);
            console.log('✅ 新規プロジェクトを追加');
        }
        
        // プロジェクト設定のみlocalStorageに保存（軽量）
        try {
            const dataToSave = JSON.stringify(projects);
            const dataSizeKB = Math.round(dataToSave.length / 1024);
            console.log(`📊 localStorage保存データサイズ: ${dataSizeKB}KB`);
            
            localStorage.setItem(PROJECTS_STORAGE_KEY, dataToSave);
            console.log('✅ localStorage保存成功（プロジェクト設定のみ）');
            
            // IndexedDBのストレージ情報を表示
            try {
                const storageInfo = await getStorageInfo();
                console.log('📊 IndexedDBストレージ情報:', storageInfo);
            } catch (infoError) {
                console.warn('⚠️ ストレージ情報取得失敗:', infoError);
            }
            
        } catch (storageError) {
            console.error('❌ localStorage保存エラー:', storageError);
            // IndexedDBに保存済みのモデルをクリーンアップ
            if (projectData.savedModelIds) {
                console.log('🧹 エラー後のクリーンアップ開始...');
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
        return projects.find(p => p.id === id) || null;
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
        console.log('🔄 IndexedDB対応プロジェクト削除開始:', id);
        
        const projects = getProjects();
        const projectIndex = projects.findIndex(p => p.id === id);
        
        if (projectIndex === -1) {
            console.warn('⚠️ 削除対象プロジェクトが見つかりません:', id);
            return false;
        }
        
        const project = projects[projectIndex];
        
        // IndexedDBからモデルファイルを削除
        if (project.savedModelIds && Array.isArray(project.savedModelIds)) {
            console.log('🧹 関連モデルファイルを削除中...');
            for (const modelId of project.savedModelIds) {
                try {
                    await removeModelFromIDB(modelId);
                    console.log('✅ モデルファイル削除:', modelId);
                } catch (modelDeleteError) {
                    console.warn('⚠️ モデルファイル削除失敗:', modelId, modelDeleteError);
                }
            }
        }
        
        // プロジェクト設定をlocalStorageから削除
        const filteredProjects = projects.filter(p => p.id !== id);
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(filteredProjects));
        
        console.log('✅ プロジェクト削除完了:', id);
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
        console.log('🔄 プロジェクトモデル復元開始:', projectId);
        
        const project = getProject(projectId);
        if (!project) {
            console.warn('⚠️ プロジェクトが見つかりません:', projectId);
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
                            
                            console.log('✅ モデル復元:', {
                                fileName: modelSetting.fileName,
                                modelId: modelSetting.modelId,
                                size: modelBlob.size
                            });
                        } else {
                            console.warn('⚠️ モデルBlobが見つかりません:', modelSetting.modelId);
                        }
                    } catch (modelLoadError) {
                        console.error('❌ モデル読み込みエラー:', modelSetting.modelId, modelLoadError);
                    }
                }
            }
        }
        
        console.log('✅ プロジェクトモデル復元完了:', {
            projectId,
            modelCount: models.length
        });
        
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
        console.log('🔄 全プロジェクト削除開始');
        
        // IndexedDBからすべてのモデルを削除
        await clearAllModels();
        console.log('✅ IndexedDB全モデル削除完了');
        
        // localStorageからプロジェクト設定を削除
        localStorage.removeItem(PROJECTS_STORAGE_KEY);
        console.log('✅ localStorage全プロジェクト削除完了');
        
        return true;
        
    } catch (error) {
        console.error('❌ 全プロジェクト削除エラー:', error);
        throw new Error(`全プロジェクトの削除に失敗しました: ${error.message}`);
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
