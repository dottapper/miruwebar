/**
 * モデルデータマッピング層
 * ARモデルの処理、変換、IndexedDB保存を専門的に扱う
 */

import { saveModelToIDB } from '../storage/indexeddb-storage.js';

/**
 * モデルIDを生成
 * @param {string} projectId - プロジェクトID
 * @param {number} index - モデルのインデックス
 * @returns {string} 生成されたモデルID
 */
export function generateModelId(projectId, index) {
    return `${projectId}_model_${index}_${Date.now()}`;
}

/**
 * 既存モデルとの比較によりIDを決定
 * @param {Object} model - 新しいモデルデータ
 * @param {Object} existingProject - 既存プロジェクトデータ
 * @param {number} index - モデルのインデックス
 * @param {string} projectId - プロジェクトID
 * @returns {Object} { modelId, isExisting }
 */
export function resolveModelId(model, existingProject, index, projectId) {
    if (existingProject && existingProject.modelSettings && existingProject.modelSettings[index]) {
        const existingModel = existingProject.modelSettings[index];
        if (existingModel.fileName === model.fileName && existingModel.fileSize === model.fileSize) {
            // 同じファイル名・サイズの場合は既存IDを再利用
            return { 
                modelId: existingModel.modelId, 
                isExisting: true 
            };
        }
    }
    
    // 新規モデルまたはファイルが変更された場合は新しいID生成
    return { 
        modelId: generateModelId(projectId, index), 
        isExisting: false 
    };
}

/**
 * モデルデータをBlobに変換
 * @param {any} modelData - 変換するモデルデータ
 * @returns {Promise<Blob|null>} 変換されたBlobまたはnull
 */
export async function convertModelDataToBlob(modelData) {
    if (!modelData) {
        return null;
    }
    
    if (modelData instanceof Blob) {
        // 既にBlobの場合はそのまま使用
        return modelData;
    } else if (typeof modelData === 'string' && modelData.startsWith('data:')) {
        // Base64データの場合は変換
        try {
            const response = await fetch(modelData);
            return await response.blob();
        } catch (error) {
            console.warn('⚠️ Base64データからBlobへの変換に失敗:', error);
            return null;
        }
    } else {
        console.warn('⚠️ 不明なデータ形式をスキップ:', typeof modelData);
        return null;
    }
}

/**
 * モデルデータをIndexedDBに保存
 * @param {string} modelId - モデルID
 * @param {Blob} modelBlob - モデルBlobデータ
 * @param {Object} model - モデル情報
 * @param {string} projectId - プロジェクトID
 * @param {number} index - モデルのインデックス
 * @returns {Promise<boolean>} 保存成功の場合true
 */
export async function saveModelToStorage(modelId, modelBlob, model, projectId, index) {
    try {
        await saveModelToIDB(modelId, modelBlob, {
            fileName: model.fileName,
            fileSize: model.fileSize,
            projectId: projectId,
            modelIndex: index,
            hasAnimations: model.hasAnimations || false,
            createdAt: Date.now()
        });
        return true;
    } catch (error) {
        console.error(`❌ モデル${index} IndexedDB保存エラー:`, error);
        return false;
    }
}

/**
 * 数値を小数点2桁で丸める
 * @param {any} value - 丸める値
 * @param {number} defaultValue - デフォルト値
 * @returns {number} 丸められた数値
 */
function roundToTwo(value, defaultValue = 0) {
    const num = Number(value) || defaultValue;
    return Math.round(num * 100) / 100;
}

/**
 * モデル設定データを正規化
 * @param {Object} model - 元のモデルデータ
 * @param {string} modelId - モデルID
 * @param {number} index - モデルのインデックス
 * @returns {Object} 正規化されたモデル設定
 */
export function normalizeModelSettings(model, modelId, index) {
    return {
        // ファイル情報
        fileName: String(model.fileName || `model_${index + 1}`).substring(0, 50),
        fileSize: String(model.fileSize || 0).substring(0, 10),
        modelId: modelId, // IndexedDBの参照ID
        
        // 変換設定
        transform: {
            position: {
                x: roundToTwo(model.position?.x, 0),
                y: roundToTwo(model.position?.y, 0),
                z: roundToTwo(model.position?.z, 0)
            },
            rotation: {
                x: roundToTwo(model.rotation?.x, 0),
                y: roundToTwo(model.rotation?.y, 0),
                z: roundToTwo(model.rotation?.z, 0)
            },
            scale: {
                x: roundToTwo(model.scale?.x, 1),
                y: roundToTwo(model.scale?.y, 1),
                z: roundToTwo(model.scale?.z, 1)
            }
        },
        visible: Boolean(model.visible !== false),
        hasAnimations: Boolean(model.hasAnimations),
        order: index
    };
}

/**
 * ARViewerからモデル配列を安全に取得
 * @param {Object} viewerInstance - ARビューアインスタンス
 * @returns {Array} モデル配列（取得失敗時は空配列）
 */
export function extractModelsFromViewer(viewerInstance) {
    if (!viewerInstance || !viewerInstance.controls || !viewerInstance.controls.getAllModels) {
        return [];
    }
    
    try {
        const allModels = viewerInstance.controls.getAllModels();
        
        if (!Array.isArray(allModels)) {
            throw new Error('モデルデータの取得に失敗しました');
        }
        
        return allModels;
    } catch (error) {
        console.error('❌ ARViewerからのモデル取得エラー:', error);
        return [];
    }
}

/**
 * モデル配列を処理してIndexedDBに保存し、設定配列を生成
 * @param {Array} models - モデル配列
 * @param {string} projectId - プロジェクトID
 * @param {Object} existingProject - 既存プロジェクトデータ
 * @returns {Promise<Object>} { modelSettings, savedModelIds }
 */
export async function processModelsArray(models, projectId, existingProject = null) {
    const modelSettings = [];
    const savedModelIds = [];
    
    for (let index = 0; index < models.length; index++) {
        const model = models[index];
        
        // モデルIDの解決
        const { modelId, isExisting } = resolveModelId(model, existingProject, index, projectId);
        
        // モデルデータの保存（既存モデル再利用の場合はスキップ）
        if (model.modelData && !isExisting) {
            const modelBlob = await convertModelDataToBlob(model.modelData);
            if (modelBlob) {
                const saveSuccess = await saveModelToStorage(modelId, modelBlob, model, projectId, index);
                if (saveSuccess) {
                    console.log(`新しいモデルをIndexedDBに保存: ${modelId}`);
                }
            }
        } else if (isExisting) {
            console.log(`⏭️ 既存モデルのため保存スキップ: ${modelId}`);
        }
        
        savedModelIds.push(modelId);
        
        // 設定データの正規化
        const modelSetting = normalizeModelSettings(model, modelId, index);
        modelSettings.push(modelSetting);
    }
    
    return { modelSettings, savedModelIds };
}