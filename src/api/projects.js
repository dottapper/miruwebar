// src/api/projects.js
// IndexedDB対応のプロジェクト関連API機能

import { 
  saveModelToIDB, 
  loadModelBlob, 
  loadModelMeta, 
  removeModel as removeModelFromIDB,
  getStorageInfo,
  clearAllModels
} from '../storage/indexeddb-storage.js';

import { exportProjectBundle } from '../utils/publish.js';
import { createLogger } from '../utils/logger.js';

// プロジェクトAPI専用ロガーを作成
const projectLogger = createLogger('ProjectsAPI');

const PROJECTS_STORAGE_KEY = 'miruwebAR_projects';

// DEBUG ログ制御

/**
 * プロジェクトデータの構造を生成（IndexedDB対応）
 * @param {Object} data - 保存するプロジェクトのデータ
 * @param {Object} viewerInstance - ARビューアインスタンス
 * @returns {Object} - 構造化されたプロジェクトデータ
 */
async function createProjectData(data, viewerInstance, existingProject = null) {
    try {
        // 新規プロジェクト用のIDを生成
        const projectId = data.id || `project_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
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
                    
                    // 既存プロジェクトの場合、同じファイル名のモデルIDを再利用
                    let modelId;
                    if (existingProject && existingProject.modelSettings && existingProject.modelSettings[index]) {
                        const existingModel = existingProject.modelSettings[index];
                        if (existingModel.fileName === model.fileName && existingModel.fileSize === model.fileSize) {
                            // 同じファイル名・サイズの場合は既存IDを再利用
                            modelId = existingModel.modelId;

                        } else {
                            // ファイルが変更された場合のみ新しいID生成
                            modelId = `${projectId}_model_${index}_${Date.now()}`;

                        }
                    } else {
                        // 新規プロジェクトまたは新規モデルの場合
                        modelId = `${projectId}_model_${index}_${Date.now()}`;

                    }
                    
                    // モデルデータをIndexedDBに保存（既存モデル再利用の場合はスキップ）
                    const isExistingModel = existingProject && existingProject.modelSettings && 
                                          existingProject.modelSettings[index] && 
                                          existingProject.modelSettings[index].fileName === model.fileName &&
                                          existingProject.modelSettings[index].fileSize === model.fileSize;
                    
                    if (model.modelData && !isExistingModel) {
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
                            
                            projectLogger.info(`新しいモデルをIndexedDBに保存: ${modelId}`);
                            
                        } catch (saveError) {
                            console.error(`❌ モデル${index} IndexedDB保存エラー:`, saveError);
                            // エラーでも処理を継続
                        }
                    } else if (isExistingModel) {
                    }
                    
                    savedModelIds.push(modelId);
                    
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
            customCSS: null,
            selectedScreenId: 'none' // ローディング画面選択のデフォルト値
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
            loadingScreen: data.loadingScreen ? {
                ...defaultLoadingScreen,
                ...data.loadingScreen, // 既存データがあれば上書き
                // templateSettingsを確実に含める
                ...(data.loadingScreen.templateSettings ? { templateSettings: data.loadingScreen.templateSettings } : {})
            } : { ...defaultLoadingScreen },
            // スタート/ガイド画面（ビューアで直接反映できるよう保持）
            startScreen: data.startScreen || null,
            guideScreen: data.guideScreen || null,
            
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
            customCSS: null,
            selectedScreenId: 'none' // ローディング画面選択のデフォルト値
        };
        
        return projects.map(project => {
            if (!project.loadingScreen) {
                project.loadingScreen = { ...defaultLoadingScreen };
            }
            // selectedScreenIdの強制リセットを削除（ユーザーの設定を保持）
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
        
        // 既存プロジェクトの更新または新規追加
        const existingIndex = projects.findIndex(p => p.id === data.id);
        const existingProject = existingIndex >= 0 ? projects[existingIndex] : null;
        
        // 非同期でプロジェクトデータを作成（既存プロジェクト情報を渡す）
        const projectData = await createProjectData(data, viewerInstance, existingProject);

        if (existingIndex >= 0) {
            // 既存プロジェクトの古いモデルファイルをクリーンアップ（再利用されないモデルのみ）
            const oldProject = projects[existingIndex];
            if (oldProject.savedModelIds && Array.isArray(oldProject.savedModelIds)) {
                for (const oldModelId of oldProject.savedModelIds) {
                    // 新しいプロジェクトで再利用されていないモデルのみ削除
                    if (!projectData.savedModelIds.includes(oldModelId)) {
                        try {
                            await removeModelFromIDB(oldModelId);
                        } catch (cleanupError) {
                            console.warn('⚠️ 古いモデル削除失敗:', oldModelId);
                        }
                    } else {
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
            // ハイブリッド保存を適用してデータを最適化

            const optimizedProjectData = await saveProjectHybrid(projectData);

            // 最適化後のデータでプロジェクト一覧を更新
            if (existingIndex >= 0) {
                projects[existingIndex] = optimizedProjectData;
            } else {
                projects[projects.length - 1] = optimizedProjectData; // 最後に追加されたプロジェクトを置換
            }
            
            const dataToSave = JSON.stringify(projects);
            localStorage.setItem(PROJECTS_STORAGE_KEY, dataToSave);

            // サーバーサイドにproject.jsonファイルを保存
            try {

                const requestBody = { projectData: projectData };
                projectLogger.info('送信するボディ:', {
                    requestBodyType: typeof requestBody,
                    requestBodyKeys: Object.keys(requestBody),
                    projectDataInBody: requestBody.projectData,
                    jsonStringified: JSON.stringify(requestBody)
                });
                
                const response = await fetch(`/api/projects/${projectData.id}/save`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ projectData: projectData })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    projectLogger.success('project.jsonファイル保存成功:', result.url);
                } else {
                    console.warn('⚠️ project.jsonファイル保存失敗:', response.statusText);
                }
            } catch (apiError) {
                console.warn('⚠️ project.json API呼び出し失敗:', apiError.message);
                // APIエラーでも全体処理は継続
            }
            
        } catch (storageError) {
            console.error('❌ localStorage保存エラー:', storageError);
            
            // 容量制限エラーの場合は自動的に古いデータを削除して再試行
            if (storageError.name === 'QuotaExceededError') {
                projectLogger.warn('容量制限エラーのため古いデータを削除中...');
                
                // プロジェクトは削除せず、データを最適化
                projectLogger.info('プロジェクトデータを圧縮・最適化中...');
                await optimizeAllProjects();
                
                // 不要なlocalStorageデータのみ削除（プロジェクト以外）
                cleanupNonEssentialData();
                
                // 重複データの統合
                await deduplicateProjects();
                
                try {
                    // 再度保存を試行（ハイブリッド保存を再適用）
                    const reOptimizedProjectData = await saveProjectHybrid(projectData);
                    if (existingIndex >= 0) {
                        projects[existingIndex] = reOptimizedProjectData;
                    } else {
                        projects[projects.length - 1] = reOptimizedProjectData;
                    }
                    
                    const retryData = JSON.stringify(projects);
                    localStorage.setItem(PROJECTS_STORAGE_KEY, retryData);
                    projectLogger.success('クリーンアップ後の保存に成功しました');
                    
                    // サーバーAPIも再試行
                    try {
                        const response = await fetch(`/api/projects/${projectData.id}/save`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ projectData })
                        });
                        
                        if (response.ok) {
                            const result = await response.json();
                            projectLogger.success('project.jsonファイル保存成功（再試行）:', result.url);
                        }
                    } catch (apiError) {
                        console.warn('⚠️ project.json API呼び出し失敗（再試行）:', apiError.message);
                    }
                    
                } catch (retryError) {
                    console.error('❌ 再試行も失敗:', retryError);
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
                    throw new Error(`容量制限により保存できません。ブラウザの保存データを手動でクリアしてください。`);
                }
            } else {
                // その他のエラーの場合
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
 * @returns {Promise<Object|null>} - プロジェクトデータ
 */
export async function getProject(id) {
    try {
        const projects = getProjects();
        const project = projects.find(p => p.id === id) || null;
        
        if (!project) {
            return null;
        }
        
        // ハイブリッド保存されたデータの復元を試行
        let restoredProject;
        try {
            restoredProject = await loadProjectHybrid(project);
        } catch (hybridError) {
            console.warn('⚠️ ハイブリッドデータ復元失敗、元データを使用:', hybridError);
            restoredProject = project;
        }
        
        // 既存プロジェクトでローディング設定がない場合のみデフォルト値を追加
        if (!restoredProject.loadingScreen) {
            restoredProject.loadingScreen = {
                enabled: true,
                template: 'default',
                backgroundColor: '#1a1a1a',
                textColor: '#ffffff',
                progressColor: '#4CAF50',
                logoImage: null,
                message: 'ARコンテンツを準備中...',
                showProgress: true,
                customCSS: null,
                selectedScreenId: 'none' // ローディング画面選択のデフォルト値
            };
        }
        // selectedScreenIdの強制リセットを削除（ユーザーの設定を保持）
        
        return restoredProject;
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

        return true;
    } catch (error) {
        console.error('❌ ローディング設定更新エラー:', error);
        return false;
    }
}

/**
 * 全プロジェクトのデータを最適化してサイズを削減
 */
async function optimizeAllProjects() {
    try {
        const projects = getProjects();
        let totalSizeBefore = JSON.stringify(projects).length;

        const optimizedProjects = [];
        
        for (const project of projects) {
            const optimized = await optimizeProjectData(project);
            optimizedProjects.push(optimized);
        }
        
        // 最適化後のデータを保存
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(optimizedProjects));
        
        let totalSizeAfter = JSON.stringify(optimizedProjects).length;
        let savedSize = totalSizeBefore - totalSizeAfter;

    } catch (error) {
        console.error('❌ プロジェクト最適化エラー:', error);
    }
}

/**
 * 単一プロジェクトのデータを最適化
 */
async function optimizeProjectData(project) {
    const optimized = { ...project };
    
    // 1. 文字列データの最適化
    if (optimized.name) optimized.name = optimized.name.trim();
    if (optimized.description) optimized.description = optimized.description.trim();
    
    // 2. 不要なプロパティを削除
    delete optimized.tempData;
    delete optimized.cache;
    delete optimized.debug;
    
    // 3. ローディング設定の最適化
    if (optimized.loadingScreen) {
        // デフォルト値と同じ場合は削除
        const defaults = {
            enabled: true,
            backgroundColor: '#1a1a1a',
            textColor: '#ffffff',
            progressColor: '#4CAF50',
            showProgress: true
        };
        
        Object.keys(defaults).forEach(key => {
            if (optimized.loadingScreen[key] === defaults[key]) {
                delete optimized.loadingScreen[key];
            }
        });
    }
    
    // 4. モデル設定の最適化
    if (optimized.modelSettings && Array.isArray(optimized.modelSettings)) {
        optimized.modelSettings = optimized.modelSettings.map(model => {
            const optimizedModel = { ...model };
            
            // デフォルト値の削除
            if (optimizedModel.visible === true) delete optimizedModel.visible;
            if (optimizedModel.hasAnimations === false) delete optimizedModel.hasAnimations;
            
            // 変換データの最適化（小数点以下2桁に丸める）
            if (optimizedModel.transform) {
                ['position', 'rotation', 'scale'].forEach(transformType => {
                    if (optimizedModel.transform[transformType]) {
                        Object.keys(optimizedModel.transform[transformType]).forEach(axis => {
                            const value = optimizedModel.transform[transformType][axis];
                            optimizedModel.transform[transformType][axis] = Math.round(value * 100) / 100;
                        });
                    }
                });
            }
            
            return optimizedModel;
        });
    }
    
    return optimized;
}

/**
 * 重複プロジェクトの統合
 */
async function deduplicateProjects() {
    try {
        const projects = getProjects();
        const seen = new Map();
        const uniqueProjects = [];
        
        for (const project of projects) {
            // 名前とタイプが同じで、作成時刻が近い場合は重複とみなす
            const key = `${project.name}_${project.type}`;
            const existing = seen.get(key);
            
            if (existing && Math.abs(project.created - existing.created) < 60000) { // 1分以内
                // より新しい方を保持
                if (project.updated > existing.updated) {
                    // 既存のものを新しいもので置換
                    const index = uniqueProjects.findIndex(p => p.id === existing.id);
                    if (index >= 0) {
                        uniqueProjects[index] = project;
                        seen.set(key, project);
                    }
                }
                // 古い方は追加しない
            } else {
                uniqueProjects.push(project);
                seen.set(key, project);
            }
        }
        
        if (uniqueProjects.length < projects.length) {
            localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(uniqueProjects));
            projectLogger.info(`重複統合: ${projects.length - uniqueProjects.length}個の重複プロジェクトを統合`);
        }
        
    } catch (error) {
        console.error('❌ 重複統合エラー:', error);
    }
}

/**
 * 不要なlocalStorageデータを削除
 */
function cleanupNonEssentialData() {
    try {
        const keysToRemove = [];
        
        // 一時データやバックアップデータを削除
        for (let key in localStorage) {
            if (key.startsWith('temp_') || 
                key.startsWith('cache_') ||
                key.startsWith('backup_') ||
                key.includes('_old') ||
                key.includes('debug_')) {
                keysToRemove.push(key);
            }
        }
        
        // ローディング画面の古いバックアップも削除
        for (let key in localStorage) {
            if (key.startsWith('loadingScreenSettings_backup_')) {
                const timestamp = parseInt(key.split('_').pop());
                const daysSinceBackup = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
                if (daysSinceBackup > 7) { // 7日以上古いバックアップは削除
                    keysToRemove.push(key);
                }
            }
        }
        
        // 削除実行
        let totalSizeFreed = 0;
        keysToRemove.forEach(key => {
            const size = localStorage[key]?.length || 0;
            totalSizeFreed += size;
            localStorage.removeItem(key);
        });
        
        projectLogger.info(`不要データ削除完了: ${keysToRemove.length}個のアイテム、${(totalSizeFreed / 1024).toFixed(2)}KB解放`);
        
    } catch (error) {
        console.error('❌ 不要データクリーンアップエラー:', error);
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
 * プロジェクトデータをより効率的に保存（ハイブリッド方式）
 * 大きなデータはIndexedDB、軽量データはlocalStorageに保存
 */
async function saveProjectHybrid(projectData) {
    try {
        projectLogger.info('ハイブリッド保存開始:', projectData.id);
        
        // 大きなデータ（マーカー画像、ローディング画像など）をIndexedDBに保存
        const largeDataKeys = [];
        const lightweightProject = { ...projectData };
        
        // マーカー画像をIndexedDBに移動
        if (projectData.markerImage && projectData.markerImage.length > 50000) { // 50KB以上
            const markerKey = `marker_${projectData.id}`;
            await saveToIndexedDB(markerKey, projectData.markerImage);
            lightweightProject.markerImageRef = markerKey;
            delete lightweightProject.markerImage;
            largeDataKeys.push('markerImage');
        }
        
        // ローディング画面の大きな画像データをIndexedDBに移動
        if (projectData.loadingScreen) {
            const loadingScreen = { ...projectData.loadingScreen };
            if (loadingScreen.logoImage && loadingScreen.logoImage.length > 50000) {
                const logoKey = `loading_logo_${projectData.id}`;
                await saveToIndexedDB(logoKey, loadingScreen.logoImage);
                loadingScreen.logoImageRef = logoKey;
                delete loadingScreen.logoImage;
                largeDataKeys.push('loadingLogo');
            }
            lightweightProject.loadingScreen = loadingScreen;
        }

        // スタート画面の大きな画像データをIndexedDBに移動
        if (projectData.startScreen) {
            const startScreen = { ...projectData.startScreen };
            if (startScreen.logo && typeof startScreen.logo === 'string' && startScreen.logo.startsWith('data:image/') && startScreen.logo.length > 50000) {
                const logoKey = `start_logo_${projectData.id}`;
                await saveToIndexedDB(logoKey, startScreen.logo);
                startScreen.logoRef = logoKey;
                delete startScreen.logo;
                largeDataKeys.push('startLogo');
            }
            lightweightProject.startScreen = startScreen;
        }

        // ガイド画面の大きな画像データをIndexedDBに移動
        if (projectData.guideScreen) {
            const guideScreen = { ...projectData.guideScreen };
            const surface = guideScreen.surfaceDetection;
            const world = guideScreen.worldTracking;
            if (surface && typeof surface.guideImage === 'string' && surface.guideImage.startsWith('data:image/') && surface.guideImage.length > 50000) {
                const imageKey = `guide_surface_${projectData.id}`;
                await saveToIndexedDB(imageKey, surface.guideImage);
                guideScreen.surfaceDetection = { ...surface, guideImageRef: imageKey };
                delete guideScreen.surfaceDetection.guideImage;
                largeDataKeys.push('guideSurface');
            }
            if (world && typeof world.guideImage === 'string' && world.guideImage.startsWith('data:image/') && world.guideImage.length > 50000) {
                const imageKey = `guide_world_${projectData.id}`;
                await saveToIndexedDB(imageKey, world.guideImage);
                guideScreen.worldTracking = { ...world, guideImageRef: imageKey };
                delete guideScreen.worldTracking.guideImage;
                largeDataKeys.push('guideWorld');
            }
            lightweightProject.guideScreen = guideScreen;
        }
        
        // 軽量化されたプロジェクトデータのサイズをチェック
        const lightweightSize = JSON.stringify(lightweightProject).length;
        projectLogger.info(`軽量化後サイズ: ${(lightweightSize / 1024).toFixed(2)}KB (大きなデータ: ${largeDataKeys.join(', ')})`);
        
        return lightweightProject;
        
    } catch (error) {
        console.error('❌ ハイブリッド保存エラー:', error);
        return projectData; // フォールバック
    }
}

/**
 * IndexedDBにデータを保存する汎用関数
 */
async function saveToIndexedDB(key, data) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MiruWebAR_LargeData', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['largeData'], 'readwrite');
            const store = transaction.objectStore('largeData');
            
            const putRequest = store.put({ key, data, timestamp: Date.now() });
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('largeData')) {
                const store = db.createObjectStore('largeData', { keyPath: 'key' });
                store.createIndex('timestamp', 'timestamp');
            }
        };
    });
}

/**
 * IndexedDBからデータを取得する汎用関数
 */
async function loadFromIndexedDB(key) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MiruWebAR_LargeData', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['largeData'], 'readonly');
            const store = transaction.objectStore('largeData');
            
            const getRequest = store.get(key);
            getRequest.onsuccess = () => {
                const result = getRequest.result;
                resolve(result ? result.data : null);
            };
            getRequest.onerror = () => reject(getRequest.error);
        };
    });
}

/**
 * ハイブリッド保存されたプロジェクトデータを復元
 */
async function loadProjectHybrid(projectData) {
    try {
        const restored = { ...projectData };
        
        // マーカー画像の復元
        if (projectData.markerImageRef) {
            const markerImage = await loadFromIndexedDB(projectData.markerImageRef);
            if (markerImage) {
                restored.markerImage = markerImage;
                delete restored.markerImageRef;
            }
        }
        
        // ローディング画面ロゴの復元
        if (projectData.loadingScreen && projectData.loadingScreen.logoImageRef) {
            const logoImage = await loadFromIndexedDB(projectData.loadingScreen.logoImageRef);
            if (logoImage) {
                restored.loadingScreen.logoImage = logoImage;
                delete restored.loadingScreen.logoImageRef;
            }
        }
        
        return restored;
        
    } catch (error) {
        console.error('❌ ハイブリッドデータ復元エラー:', error);
        return projectData; // エラー時は元データを返す
    }
}

/**
 * 緊急時のlocalStorage手動クリーンアップ（開発者用）
 * @param {boolean} confirmDelete - 削除確認をスキップするかどうか
 */
export function emergencyCleanup(confirmDelete = false) {
    if (!confirmDelete && !confirm('⚠️ 全てのプロジェクトデータが削除されます。\n本当に実行しますか？')) {
        return;
    }
    
    try {
        const beforeSize = JSON.stringify(localStorage).length;
        
        // 重要でないデータを削除
        const keysToRemove = [];
        for (let key in localStorage) {
            // プロジェクトデータ以外を削除対象にする
            if (!key.startsWith('miruwebAR_projects') || 
                key.includes('backup_') || 
                key.includes('temp_') ||
                key.includes('cache_')) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        const afterSize = JSON.stringify(localStorage).length;
        const freedSize = beforeSize - afterSize;
        
        projectLogger.info('緊急クリーンアップ完了:', {
            削除項目数: keysToRemove.length,
            解放容量: (freedSize / 1024).toFixed(2) + 'KB',
            残り容量: (afterSize / 1024).toFixed(2) + 'KB'
        });
        
        alert(`クリーンアップ完了！\n${keysToRemove.length}個のアイテムを削除\n${(freedSize / 1024).toFixed(2)}KB の容量を解放しました`);
        
    } catch (error) {
        console.error('❌ 緊急クリーンアップエラー:', error);
        alert('クリーンアップに失敗しました。ブラウザの設定から手動でlocalStorageをクリアしてください。');
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
  
  // 1) ローディング/スタート/ガイドのテンプレ解決と不足補完
  let loadingScreen = project.loadingScreen || {};
  let startScreen = project.startScreen || null;
  let guideScreen = project.guideScreen || null;

  try {
    // selectedScreenIdからテンプレを解決
    if ((!loadingScreen.templateSettings || Object.keys(loadingScreen.templateSettings).length === 0) && loadingScreen.selectedScreenId && loadingScreen.selectedScreenId !== 'none') {
      const { TEMPLATES_STORAGE_KEY } = await import('../components/loading-screen/template-manager.js');
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (stored) {
        const templates = JSON.parse(stored);
        const tpl = templates.find(t => t.id === loadingScreen.selectedScreenId);
        if (tpl && tpl.settings) {
          // 軽量のtemplateSettingsを埋め込む
          const { startScreen: ts, loadingScreen: tl, guideScreen: tg } = tpl.settings;
          loadingScreen = { ...loadingScreen, templateSettings: {} };
          if (tl) loadingScreen.templateSettings.loadingScreen = tl;
          if (ts && !startScreen) startScreen = ts;
          if (tg && !guideScreen) guideScreen = tg;
        }
      }
    }
  } catch (_) {}

  // 2) project.jsonの組み立て（viewer用の十分な設定込み）
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

  // 同梱対象のアセットURL（ローカルのpublic/assetsから取得を想定）
  const assetUrls = (project.modelSettings || [])
    .filter(m => m.fileName)
    .map(m => `${window.location.origin}/assets/${m.fileName}`);

  return await exportProjectBundle({ project: projectJson, assetUrls });
}
