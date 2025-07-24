// src/loader/loadGLBFromIDB.js
// IndexedDB から GLB モデルを読み込んで Three.js で使用可能な形式に変換

import { loadModelBlob, loadModelMeta } from '../storage/indexeddb-storage.js';

/**
 * IndexedDB からモデルを読み込み、Three.js の GLTFLoader で使用可能な URL を生成
 * @param {string} modelId - IndexedDB に保存されているモデルID
 * @returns {Promise<Object>} モデル情報オブジェクト
 */
export async function loadGLBFromIDB(modelId) {
  try {
    console.log('🔄 IndexedDB からモデル読み込み開始:', modelId);

    // モデル Blob とメタ情報を並行取得
    const [blob, meta] = await Promise.all([
      loadModelBlob(modelId),
      loadModelMeta(modelId)
    ]);

    if (!blob) {
      throw new Error(`モデル Blob が見つかりません: ${modelId}`);
    }

    if (!meta) {
      console.warn('⚠️ モデルメタ情報が見つかりません、デフォルト値を使用');
    }

    // Blob から Object URL を作成
    const objectUrl = URL.createObjectURL(blob);

    console.log('✅ モデル読み込み完了:', {
      modelId,
      fileName: meta?.fileName || 'unknown.glb',
      size: blob.size,
      sizeKB: Math.round(blob.size / 1024),
      sizeMB: Math.round(blob.size / 1024 / 1024 * 100) / 100,
      mimeType: blob.type,
      objectUrl
    });

    return {
      modelId,
      objectUrl,
      blob,
      meta: meta || {
        fileName: 'unknown.glb',
        size: blob.size,
        mimeType: blob.type,
        createdAt: Date.now()
      }
    };
  } catch (error) {
    console.error('❌ IndexedDB モデル読み込みエラー:', error);
    throw new Error(`モデルの読み込みに失敗しました: ${error.message}`);
  }
}

/**
 * 複数のモデルを一括で読み込み
 * @param {string[]} modelIds - モデルID の配列
 * @returns {Promise<Object[]>} モデル情報オブジェクトの配列
 */
export async function loadMultipleGLBFromIDB(modelIds) {
  try {
    console.log('🔄 複数モデル一括読み込み開始:', {
      count: modelIds.length,
      modelIds
    });

    const results = await Promise.allSettled(
      modelIds.map(modelId => loadGLBFromIDB(modelId))
    );

    const successfulModels = [];
    const failedModels = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulModels.push(result.value);
      } else {
        failedModels.push({
          modelId: modelIds[index],
          error: result.reason.message
        });
      }
    });

    console.log('✅ 複数モデル読み込み完了:', {
      total: modelIds.length,
      successful: successfulModels.length,
      failed: failedModels.length,
      failedModels
    });

    if (failedModels.length > 0) {
      console.warn('⚠️ 一部のモデル読み込みに失敗:', failedModels);
    }

    return successfulModels;
  } catch (error) {
    console.error('❌ 複数モデル読み込みエラー:', error);
    throw new Error(`複数モデルの読み込みに失敗しました: ${error.message}`);
  }
}

/**
 * モデルの Object URL を解放
 * @param {string|Object} modelOrUrl - Object URL 文字列またはモデルオブジェクト
 */
export function revokeModelObjectURL(modelOrUrl) {
  try {
    const objectUrl = typeof modelOrUrl === 'string' ? modelOrUrl : modelOrUrl?.objectUrl;
    
    if (objectUrl && objectUrl.startsWith('blob:')) {
      URL.revokeObjectURL(objectUrl);
      console.log('✅ Object URL 解放完了:', objectUrl);
    }
  } catch (error) {
    console.error('❌ Object URL 解放エラー:', error);
  }
}

/**
 * 複数のモデル Object URL を一括解放
 * @param {Array} models - モデルオブジェクトまたは URL の配列
 */
export function revokeMultipleModelObjectURLs(models) {
  try {
    console.log('🔄 複数 Object URL 解放開始:', models.length);
    
    models.forEach(model => revokeModelObjectURL(model));
    
    console.log('✅ 複数 Object URL 解放完了');
  } catch (error) {
    console.error('❌ 複数 Object URL 解放エラー:', error);
  }
}

/**
 * File オブジェクトから一時的な Object URL を作成（IndexedDB 保存前のプレビュー用）
 * @param {File} file - ファイルオブジェクト
 * @returns {string} Object URL
 */
export function createTemporaryObjectURL(file) {
  try {
    console.log('🔄 一時 Object URL 作成:', {
      fileName: file.name,
      size: file.size,
      type: file.type
    });

    const objectUrl = URL.createObjectURL(file);
    
    console.log('✅ 一時 Object URL 作成完了:', objectUrl);
    return objectUrl;
  } catch (error) {
    console.error('❌ 一時 Object URL 作成エラー:', error);
    throw new Error(`一時 Object URL の作成に失敗しました: ${error.message}`);
  }
}

/**
 * モデルデータの妥当性チェック
 * @param {Blob} blob - モデル Blob
 * @returns {Promise<Object>} 妥当性チェック結果
 */
export async function validateModelBlob(blob) {
  try {
    console.log('🔄 モデル Blob 妥当性チェック開始:', {
      size: blob.size,
      type: blob.type
    });

    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // サイズチェック（最大 100MB）
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (blob.size > maxSize) {
      validation.errors.push(`ファイルサイズが大きすぎます: ${Math.round(blob.size / 1024 / 1024)}MB (最大: 100MB)`);
      validation.isValid = false;
    }

    // 最小サイズチェック
    if (blob.size < 100) {
      validation.errors.push('ファイルサイズが小さすぎます');
      validation.isValid = false;
    }

    // MIME タイプチェック
    const validMimeTypes = [
      'model/gltf-binary',
      'application/octet-stream',
      ''  // 空の場合もあり得る
    ];
    
    if (blob.type && !validMimeTypes.includes(blob.type)) {
      validation.warnings.push(`未知の MIME タイプです: ${blob.type}`);
    }

    // GLB ヘッダーチェック（最初の4バイトが 'glTF' であるかチェック）
    try {
      const headerBuffer = await blob.slice(0, 4).arrayBuffer();
      const headerView = new Uint8Array(headerBuffer);
      const magic = String.fromCharCode(...headerView);
      
      if (magic !== 'glTF') {
        validation.warnings.push('GLB ファイルのマジックナンバーが正しくありません');
      }
    } catch (headerError) {
      validation.warnings.push('GLB ヘッダーの読み取りに失敗しました');
    }

    console.log('✅ モデル Blob 妥当性チェック完了:', validation);
    return validation;
  } catch (error) {
    console.error('❌ モデル Blob 妥当性チェックエラー:', error);
    return {
      isValid: false,
      errors: [`妥当性チェックに失敗しました: ${error.message}`],
      warnings: []
    };
  }
}