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

  // 2. アセットをアップロード
  // 2.1 ローディング画面のロゴをアップロード
  let loadingLogoUrl = null;
  if (projectData.loadingScreen?.logoImage) {
    const logoData = projectData.loadingScreen.logoImage;
    if (logoData.startsWith('data:')) {
      loadingLogoUrl = await uploadAsset(projectId, 'loading-logo.png', logoData);
    } else {
      loadingLogoUrl = logoData;
    }
  }

  // 2.2 スタート画面の背景画像をアップロード
  let startBgUrl = null;
  if (projectData.startScreen?.backgroundImage) {
    const bgData = projectData.startScreen.backgroundImage;
    if (bgData.startsWith('data:')) {
      startBgUrl = await uploadAsset(projectId, 'start-bg.jpg', bgData, 'image/jpeg');
    } else {
      startBgUrl = bgData;
    }
  }

  // 2.3 マーカー画像をアップロード
  let markerImageUrl = null;
  if (projectData.markerImage) {
    const markerData = projectData.markerImage;
    if (markerData.startsWith('data:')) {
      markerImageUrl = await uploadAsset(projectId, 'marker.png', markerData);
    } else {
      markerImageUrl = markerData;
    }
  } else if (projectData.markerImageUrl) {
    markerImageUrl = projectData.markerImageUrl;
  }

  // 2.4 マーカーパターンをアップロード
  let markerPatternUrl = null;
  if (projectData.markerPattern) {
    // パターンデータをBlobに変換
    const patternBlob = new Blob([projectData.markerPattern], { type: 'text/plain' });
    markerPatternUrl = await uploadAsset(projectId, 'marker.patt', patternBlob, 'text/plain');
  }

  // 3. project.jsonを作成してアップロード（AR viewerが期待する完全なスキーマ）
  const publishedProject = {
    id: projectId,
    version: '1',
    name: projectData.name || 'Untitled Project',

    // スタート画面
    start: projectData.startScreen ? {
      title: projectData.startScreen.title || 'AR体験を開始',
      titlePosition: projectData.startScreen.titlePosition || 40,
      titleSize: projectData.startScreen.titleSize || 1,
      textColor: projectData.startScreen.textColor || '#FFFFFF',
      backgroundColor: projectData.startScreen.backgroundColor || '#1a1a2e',
      backgroundImage: startBgUrl || projectData.startScreen.backgroundImage || null,
      buttonText: projectData.startScreen.buttonText || 'スタート',
      buttonColor: projectData.startScreen.buttonColor || '#6c5ce7',
      buttonTextColor: projectData.startScreen.buttonTextColor || '#FFFFFF',
      buttonPosition: projectData.startScreen.buttonPosition || 75,
      buttonSize: projectData.startScreen.buttonSize || 1
    } : {
      title: 'AR体験を開始',
      titlePosition: 40,
      titleSize: 1,
      textColor: '#FFFFFF',
      backgroundColor: '#1a1a2e',
      buttonText: 'スタート',
      buttonColor: '#6c5ce7',
      buttonTextColor: '#FFFFFF',
      buttonPosition: 75,
      buttonSize: 1
    },

    // ローディング画面
    loading: projectData.loadingScreen ? {
      message: projectData.loadingScreen.message || '読み込み中…',
      backgroundColor: projectData.loadingScreen.backgroundColor || '#1a1a2e',
      textColor: projectData.loadingScreen.textColor || '#FFFFFF',
      progressColor: projectData.loadingScreen.progressColor || '#6c5ce7',
      logo: loadingLogoUrl || projectData.loadingScreen.logo || null
    } : {
      message: '読み込み中…',
      backgroundColor: '#1a1a2e',
      textColor: '#FFFFFF',
      progressColor: '#6c5ce7'
    },

    // ガイド画面
    guide: projectData.guideScreen ? {
      marker: markerPatternUrl ? { src: markerPatternUrl } : null,
      markerImage: markerImageUrl || projectData.guideScreen.markerImage || null,
      message: projectData.guideScreen.message || 'マーカーをカメラに写してください',
      title: projectData.guideScreen.title || 'マーカーを読み取ってください',
      description: projectData.guideScreen.description || '下の画像をカメラに写してください',
      backgroundColor: projectData.guideScreen.backgroundColor || '#1a1a2e',
      textColor: projectData.guideScreen.textColor || '#FFFFFF'
    } : {
      marker: markerPatternUrl ? { src: markerPatternUrl } : null,
      markerImage: markerImageUrl,
      message: 'マーカーをカメラに写してください',
      title: 'マーカーを読み取ってください',
      description: '下の画像をカメラに写してください',
      backgroundColor: '#1a1a2e',
      textColor: '#FFFFFF'
    },

    // テーマ
    theme: projectData.theme || {
      primary: '#6c5ce7',
      accent: '#00cec9',
      text: '#FFFFFF'
    },

    // マーカー画像
    markerImage: markerImageUrl,

    // スクリーン配列（ARコンテンツ）
    screens: [{
      type: projectData.type || 'marker',
      marker: markerPatternUrl ? { src: markerPatternUrl } : null,
      models: uploadedModels.map(m => ({
        id: m.fileName.replace(/\.[^/.]+$/, ''),
        name: m.fileName,
        url: m.url,
        position: {
          x: m.transform?.position?.[0] || 0,
          y: m.transform?.position?.[1] || 0,
          z: m.transform?.position?.[2] || 0
        },
        rotation: {
          x: m.transform?.rotation?.[0] || 0,
          y: m.transform?.rotation?.[1] || 0,
          z: m.transform?.rotation?.[2] || 0
        },
        scale: {
          x: m.transform?.scale?.[0] || 1,
          y: m.transform?.scale?.[1] || 1,
          z: m.transform?.scale?.[2] || 1
        }
      }))
    }],

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
