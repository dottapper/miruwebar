// src/storage/indexeddb-storage.js
// IndexedDB を使った 3D モデルデータの保存・取得
import { get, set, del, keys } from 'idb-keyval';

export const MODEL_KEY_PREFIX = 'model:';
const META_KEY_PREFIX = 'meta:';

/**
 * 3D モデルデータを IndexedDB に保存
 * @param {string} modelId - モデルの一意識別子
 * @param {Blob|ArrayBuffer|File} data - モデルデータ（Blob または ArrayBuffer）
 * @param {Object} meta - メタ情報（ファイル名、サイズ、アニメーション情報など）
 * @returns {Promise<string>} 保存されたモデルのID
 */
export async function saveModelToIDB(modelId, data, meta = {}) {
  try {
    console.log('🔄 IndexedDB へモデル保存開始:', {
      modelId,
      dataType: data?.constructor?.name,
      dataSize: data?.size || data?.byteLength || 0,
      meta
    });

    // データを Blob に変換（ArrayBuffer の場合）
    let blobData = data;
    if (data instanceof ArrayBuffer) {
      blobData = new Blob([data], { type: meta.mimeType || 'model/gltf-binary' });
    } else if (data instanceof File) {
      blobData = new Blob([data], { type: data.type || 'model/gltf-binary' });
    }

    // メタ情報にタイムスタンプを追加
    const enhancedMeta = {
      ...meta,
      modelId,
      size: blobData.size,
      mimeType: blobData.type,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // IndexedDB に保存
    await Promise.all([
      set(`${MODEL_KEY_PREFIX}${modelId}`, blobData),
      set(`${META_KEY_PREFIX}${modelId}`, enhancedMeta)
    ]);

    console.log('✅ IndexedDB モデル保存完了:', {
      modelId,
      size: blobData.size,
      sizeKB: Math.round(blobData.size / 1024),
      sizeMB: Math.round(blobData.size / 1024 / 1024 * 100) / 100
    });

    return modelId;
  } catch (error) {
    console.error('❌ IndexedDB モデル保存エラー:', error);
    throw new Error(`モデルの保存に失敗しました: ${error.message}`);
  }
}

/**
 * IndexedDB からモデル Blob を取得
 * @param {string} modelId - モデルID
 * @returns {Promise<Blob|null>} モデルデータ（Blob形式）
 */
export async function loadModelBlob(modelId) {
  try {
    console.log('🔄 IndexedDB からモデル Blob 取得:', modelId);
    
    const blob = await get(`${MODEL_KEY_PREFIX}${modelId}`);
    
    if (!blob) {
      console.warn('⚠️ モデル Blob が見つかりません:', {
        modelId,
        searchKey: `${MODEL_KEY_PREFIX}${modelId}`,
        timestamp: new Date().toISOString()
      });
      return null;
    }

    console.log('✅ モデル Blob 取得完了:', {
      modelId,
      size: blob.size,
      type: blob.type
    });

    return blob;
  } catch (error) {
    console.error('❌ モデル Blob 取得エラー:', {
      modelId,
      searchKey: `${MODEL_KEY_PREFIX}${modelId}`,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw new Error(`モデルの取得に失敗しました: ${error.message} (modelId: ${modelId})`);
  }
}

/**
 * IndexedDB からモデルのメタ情報を取得
 * @param {string} modelId - モデルID
 * @returns {Promise<Object|null>} メタ情報
 */
export async function loadModelMeta(modelId) {
  try {
    console.log('🔄 IndexedDB からモデルメタ情報取得:', modelId);
    
    const meta = await get(`${META_KEY_PREFIX}${modelId}`);
    
    if (!meta) {
      console.warn('⚠️ モデルメタ情報が見つかりません:', modelId);
      return null;
    }

    console.log('✅ モデルメタ情報取得完了:', meta);
    return meta;
  } catch (error) {
    console.error('❌ モデルメタ情報取得エラー:', error);
    throw new Error(`モデルメタ情報の取得に失敗しました: ${error.message}`);
  }
}

/**
 * IndexedDB からモデルを削除
 * @param {string} modelId - モデルID
 * @returns {Promise<boolean>} 削除成功の場合 true
 */
export async function removeModel(modelId) {
  try {
    console.log('🔄 IndexedDB からモデル削除:', modelId);
    
    await Promise.all([
      del(`${MODEL_KEY_PREFIX}${modelId}`),
      del(`${META_KEY_PREFIX}${modelId}`)
    ]);

    console.log('✅ モデル削除完了:', modelId);
    return true;
  } catch (error) {
    console.error('❌ モデル削除エラー:', error);
    throw new Error(`モデルの削除に失敗しました: ${error.message}`);
  }
}

/**
 * IndexedDB に保存されているすべてのモデル ID を取得
 * @returns {Promise<string[]>} モデル ID の配列
 */
export async function getAllModelIds() {
  try {
    console.log('🔄 すべてのモデル ID 取得開始');
    
    const allKeys = await keys();
    const modelIds = allKeys
      .filter(key => typeof key === 'string' && key.startsWith(MODEL_KEY_PREFIX))
      .map(key => key.replace(MODEL_KEY_PREFIX, ''));

    console.log('✅ モデル ID 取得完了:', {
      count: modelIds.length,
      ids: modelIds
    });

    return modelIds;
  } catch (error) {
    console.error('❌ モデル ID 取得エラー:', error);
    throw new Error(`モデル ID の取得に失敗しました: ${error.message}`);
  }
}

/**
 * IndexedDB のストレージ使用量を取得（概算）
 * @returns {Promise<Object>} ストレージ情報
 */
export async function getStorageInfo() {
  try {
    console.log('🔄 ストレージ情報取得開始');
    
    const modelIds = await getAllModelIds();
    let totalSize = 0;
    const modelSizes = {};

    for (const modelId of modelIds) {
      const meta = await loadModelMeta(modelId);
      if (meta && meta.size) {
        totalSize += meta.size;
        modelSizes[modelId] = meta.size;
      }
    }

    const storageInfo = {
      modelCount: modelIds.length,
      totalSize,
      totalSizeKB: Math.round(totalSize / 1024),
      totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
      modelSizes
    };

    console.log('✅ ストレージ情報取得完了:', storageInfo);
    return storageInfo;
  } catch (error) {
    console.error('❌ ストレージ情報取得エラー:', error);
    throw new Error(`ストレージ情報の取得に失敗しました: ${error.message}`);
  }
}

/**
 * IndexedDB をクリア（すべてのモデルを削除）
 * @returns {Promise<boolean>} 成功の場合 true
 */
export async function clearAllModels() {
  try {
    console.log('🔄 すべてのモデル削除開始');
    
    const modelIds = await getAllModelIds();
    
    for (const modelId of modelIds) {
      await removeModel(modelId);
    }

    console.log('✅ すべてのモデル削除完了:', {
      deletedCount: modelIds.length
    });

    return true;
  } catch (error) {
    console.error('❌ モデル全削除エラー:', error);
    throw new Error(`モデルの全削除に失敗しました: ${error.message}`);
  }
}