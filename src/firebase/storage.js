// Firebase Storage utilities for miruwebAR
import { storage } from './config.js';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll
} from "firebase/storage";

/**
 * プロジェクトのモデル（GLB）をアップロード
 * @param {string} projectId - プロジェクトID
 * @param {string} fileName - ファイル名
 * @param {Blob|ArrayBuffer} data - モデルデータ
 * @returns {Promise<string>} ダウンロードURL
 */
export async function uploadModel(projectId, fileName, data) {
  const path = `projects/${projectId}/models/${fileName}`;
  const storageRef = ref(storage, path);

  // Blob/ArrayBufferをアップロード
  const blob = data instanceof Blob ? data : new Blob([data]);
  await uploadBytes(storageRef, blob, {
    contentType: 'model/gltf-binary'
  });

  // ダウンロードURLを取得
  const url = await getDownloadURL(storageRef);
  console.log(`Model uploaded: ${path}`);
  return url;
}

/**
 * プロジェクトのアセット（画像など）をアップロード
 * @param {string} projectId - プロジェクトID
 * @param {string} fileName - ファイル名
 * @param {Blob|string} data - 画像データ（BlobまたはBase64）
 * @param {string} contentType - MIMEタイプ
 * @returns {Promise<string>} ダウンロードURL
 */
export async function uploadAsset(projectId, fileName, data, contentType = 'image/png') {
  const path = `projects/${projectId}/assets/${fileName}`;
  const storageRef = ref(storage, path);

  let blob;
  if (typeof data === 'string' && data.startsWith('data:')) {
    // Base64をBlobに変換
    blob = await fetch(data).then(r => r.blob());
  } else if (data instanceof Blob) {
    blob = data;
  } else {
    blob = new Blob([data], { type: contentType });
  }

  await uploadBytes(storageRef, blob, { contentType });

  const url = await getDownloadURL(storageRef);
  console.log(`Asset uploaded: ${path}`);
  return url;
}

/**
 * プロジェクトのメタデータ（JSON）をアップロード
 * @param {string} projectId - プロジェクトID
 * @param {Object} projectData - プロジェクトデータ
 * @returns {Promise<string>} ダウンロードURL
 */
export async function uploadProjectJson(projectId, projectData) {
  const path = `projects/${projectId}/project.json`;
  const storageRef = ref(storage, path);

  const json = JSON.stringify(projectData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  await uploadBytes(storageRef, blob, {
    contentType: 'application/json'
  });

  const url = await getDownloadURL(storageRef);
  console.log(`Project JSON uploaded: ${path}`);
  return url;
}

/**
 * プロジェクト全体をFirebase Storageに公開
 * @param {Object} projectData - プロジェクトデータ（モデル情報含む）
 * @returns {Promise<{projectUrl: string, viewerUrl: string}>}
 */
export async function publishProjectToFirebase(projectData) {
  const projectId = projectData.id || `project_${Date.now()}`;
  const uploadedModels = [];

  // 1. モデルをアップロード（modelDataまたはmodelsから）
  const models = projectData.modelData || projectData.models || [];

  if (models.length > 0) {
    for (const model of models) {
      try {
        let blob = null;

        // blobが直接ある場合（loadProjectWithModelsから）
        if (model.blob) {
          blob = model.blob;
        }
        // Base64データがある場合
        else if (model.dataBase64) {
          const response = await fetch(model.dataBase64);
          blob = await response.blob();
        }
        // 既にURLがある場合はそのまま使用
        else if (model.url) {
          uploadedModels.push({
            fileName: model.fileName,
            url: model.url,
            transform: model.transform || { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }
          });
          continue;
        }

        if (blob) {
          const url = await uploadModel(projectId, model.fileName, blob);
          uploadedModels.push({
            fileName: model.fileName,
            url: url,
            transform: model.transform || { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }
          });
          console.log(`✅ Model uploaded: ${model.fileName}`);
        } else {
          console.warn(`⚠️ No data for model: ${model.fileName}`);
        }
      } catch (error) {
        console.error(`❌ Failed to upload model: ${model.fileName}`, error);
        throw new Error(`モデル「${model.fileName}」のアップロードに失敗しました: ${error.message}`);
      }
    }
  }

  // 2. ローディング画面のロゴをアップロード
  let loadingLogoUrl = null;
  if (projectData.loadingScreen?.logoImage) {
    const logoData = projectData.loadingScreen.logoImage;
    if (logoData.startsWith('data:')) {
      loadingLogoUrl = await uploadAsset(projectId, 'loading-logo.png', logoData);
    } else {
      loadingLogoUrl = logoData;
    }
  }

  // 3. project.jsonを作成してアップロード
  const publishedProject = {
    id: projectId,
    name: projectData.name || 'Untitled Project',
    models: uploadedModels,
    loadingScreen: projectData.loadingScreen ? {
      ...projectData.loadingScreen,
      logoImage: loadingLogoUrl
    } : null,
    startScreen: projectData.startScreen || null,
    arSettings: projectData.arSettings || {},
    publishedAt: new Date().toISOString()
  };

  const projectUrl = await uploadProjectJson(projectId, publishedProject);

  // 4. ビューアURLを生成
  const baseUrl = window.location.origin;
  const viewerUrl = `${baseUrl}/#/viewer?src=${encodeURIComponent(projectUrl)}`;

  return {
    projectId,
    projectUrl,
    viewerUrl
  };
}

/**
 * Firebase StorageからプロジェクトJSONを取得
 * @param {string} projectUrl - project.jsonのURL
 * @returns {Promise<Object>} プロジェクトデータ
 */
export async function fetchProjectFromFirebase(projectUrl) {
  const response = await fetch(projectUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch project: ${response.status}`);
  }
  return response.json();
}

/**
 * プロジェクトを削除
 * @param {string} projectId - プロジェクトID
 */
export async function deleteProject(projectId) {
  const projectRef = ref(storage, `projects/${projectId}`);
  const list = await listAll(projectRef);

  // すべてのファイルを削除
  for (const item of list.items) {
    await deleteObject(item);
  }

  // サブフォルダも削除
  for (const prefix of list.prefixes) {
    const subList = await listAll(prefix);
    for (const item of subList.items) {
      await deleteObject(item);
    }
  }

  console.log(`Project deleted: ${projectId}`);
}
