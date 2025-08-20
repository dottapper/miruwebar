// src/storage/project-store.js
// プロジェクト設定の localStorage 管理（軽量データのみ）

const STORAGE_KEY = 'miruwebAR_projects';
const PROJECT_SETTINGS_KEY = 'miruwebAR_project_settings';
const MAX_SETTINGS_SIZE_KB = 500; // 設定JSONの最大サイズ制限

/**
 * プロジェクト設定を localStorage に保存（軽量データのみ）
 * @param {Object} settings - プロジェクト設定
 * @returns {boolean} 保存成功の場合 true
 */
export function saveProjectSettings(settings) {
  try {
    console.log('🔄 プロジェクト設定保存開始:', settings);

    // 軽量化された設定データを作成（モデルデータを除外）
    const lightweightSettings = createLightweightSettings(settings);

    // サイズチェック
    const settingsJson = JSON.stringify(lightweightSettings);
    const sizeKB = Math.round(settingsJson.length / 1024);

    console.log('📊 設定データサイズ:', {
      characters: settingsJson.length,
      sizeKB,
      maxSizeKB: MAX_SETTINGS_SIZE_KB
    });

    if (sizeKB > MAX_SETTINGS_SIZE_KB) {
      console.error(`❌ 設定データが大きすぎます: ${sizeKB}KB (制限: ${MAX_SETTINGS_SIZE_KB}KB)`);
      throw new Error(`設定データが${MAX_SETTINGS_SIZE_KB}KBを超えています (現在: ${sizeKB}KB)`);
    }

    // localStorage に保存
    localStorage.setItem(PROJECT_SETTINGS_KEY, settingsJson);

    console.log('✅ プロジェクト設定保存完了:', {
      sizeKB,
      settingsCount: Object.keys(lightweightSettings).length
    });

    return true;
  } catch (error) {
    console.error('❌ プロジェクト設定保存エラー:', error);
    throw new Error(`設定の保存に失敗しました: ${error.message}`);
  }
}

/**
 * プロジェクト設定を localStorage から読み込み
 * @returns {Object|null} プロジェクト設定
 */
export function loadProjectSettings() {
  try {
    console.log('🔄 プロジェクト設定読み込み開始');

    const settingsJson = localStorage.getItem(PROJECT_SETTINGS_KEY);
    
    if (!settingsJson) {
      console.log('ℹ️ プロジェクト設定が見つかりません');
      return null;
    }

    const settings = JSON.parse(settingsJson);
    
    console.log('✅ プロジェクト設定読み込み完了:', {
      settingsCount: Object.keys(settings).length,
      sizeKB: Math.round(settingsJson.length / 1024)
    });

    return settings;
  } catch (error) {
    console.error('❌ プロジェクト設定読み込みエラー:', error);
    return null;
  }
}

/**
 * 軽量化された設定データを作成（Base64データを除外）
 * @param {Object} settings - 元の設定データ
 * @returns {Object} 軽量化された設定データ
 */
function createLightweightSettings(settings) {
  const lightweight = {};

  for (const [key, value] of Object.entries(settings)) {
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        // 配列の場合、各要素を軽量化
        lightweight[key] = value.map(item => createLightweightItem(item));
      } else {
        // オブジェクトの場合、再帰的に軽量化
        lightweight[key] = createLightweightSettings(value);
      }
    } else {
      // プリミティブ値はそのまま保持
      lightweight[key] = value;
    }
  }

  return lightweight;
}

/**
 * 個別アイテムの軽量化（Base64データを除外）
 * @param {Object} item - 元のアイテム
 * @returns {Object} 軽量化されたアイテム
 */
function createLightweightItem(item) {
  if (typeof item !== 'object' || item === null) {
    return item;
  }

  const lightweight = {};

  for (const [key, value] of Object.entries(item)) {
    // Base64データを除外
    if (key === 'modelData' && typeof value === 'string' && value.startsWith('data:')) {
      console.log(`⚠️ Base64データを除外: ${key} (サイズ: ${Math.round(value.length / 1024)}KB)`);
      continue; // Base64データは保存しない
    }

    // その他のデータは保持
    if (typeof value === 'object' && value !== null) {
      lightweight[key] = createLightweightSettings(value);
    } else {
      lightweight[key] = value;
    }
  }

  return lightweight;
}

/**
 * プロジェクト一覧を取得（従来の形式との互換性維持）
 * @returns {Array} プロジェクトの配列
 */
export function getProjects() {
  try {
    const projectsJson = localStorage.getItem(STORAGE_KEY);
    return projectsJson ? JSON.parse(projectsJson) : [];
  } catch (error) {
    console.error('❌ プロジェクト一覧取得エラー:', error);
    return [];
  }
}

/**
 * プロジェクトを保存（軽量データのみ、モデルIDを含む）
 * @param {Object} projectData - プロジェクトデータ
 * @returns {Object} 保存されたプロジェクトデータ
 */
export function saveProject(projectData) {
  try {
    console.log('🔄 プロジェクト保存開始:', projectData);

    const projects = getProjects();
    
    // 軽量化されたプロジェクトデータを作成
    const lightweightProject = createLightweightProject(projectData);

    // 既存プロジェクトの更新または新規追加
    const existingIndex = projects.findIndex(p => p.id === lightweightProject.id);
    
    if (existingIndex >= 0) {
      // 既存の作成日時を保持
      lightweightProject.created = projects[existingIndex].created;
      projects[existingIndex] = lightweightProject;
      console.log('✅ 既存プロジェクトを更新');
    } else {
      projects.push(lightweightProject);
      console.log('✅ 新規プロジェクトを追加');
    }

    // サイズチェック
    const projectsJson = JSON.stringify(projects);
    const sizeKB = Math.round(projectsJson.length / 1024);

    console.log('📊 プロジェクト一覧サイズ:', {
      projectCount: projects.length,
      sizeKB,
      maxSizeKB: MAX_SETTINGS_SIZE_KB
    });

    if (sizeKB > MAX_SETTINGS_SIZE_KB) {
      console.warn(`⚠️ プロジェクト一覧が大きすぎます: ${sizeKB}KB`);
      
      // 古いプロジェクトを削除して容量を確保
      const sortedProjects = projects.sort((a, b) => (b.updated || 0) - (a.updated || 0));
      const keepProjects = sortedProjects.slice(0, 10); // 最新10個のみ保持
      
      const reducedJson = JSON.stringify(keepProjects);
      const reducedSizeKB = Math.round(reducedJson.length / 1024);
      
      console.log(`🧹 古いプロジェクトを削除: ${projects.length} → ${keepProjects.length} (${sizeKB}KB → ${reducedSizeKB}KB)`);
      
      localStorage.setItem(STORAGE_KEY, reducedJson);
      return lightweightProject;
    }

    // localStorage に保存
    localStorage.setItem(STORAGE_KEY, projectsJson);

    console.log('✅ プロジェクト保存完了:', {
      id: lightweightProject.id,
      name: lightweightProject.name,
      modelCount: lightweightProject.modelCount || 0
    });

    return lightweightProject;
  } catch (error) {
    console.error('❌ プロジェクト保存エラー:', error);
    throw new Error(`プロジェクトの保存に失敗しました: ${error.message}`);
  }
}

/**
 * 軽量化されたプロジェクトデータを作成
 * @param {Object} projectData - 元のプロジェクトデータ
 * @returns {Object} 軽量化されたプロジェクトデータ
 */
function createLightweightProject(projectData) {
  return {
    id: projectData.id,
    name: String(projectData.name || 'Untitled').substring(0, 50),
    description: String(projectData.description || '').substring(0, 200),
    type: projectData.type || 'markerless',
    
    // モデル設定（Base64データを除外し、IDのみ保持）
    modelSettings: (projectData.modelSettings || []).map(model => createLightweightModelSettings(model)),
    modelCount: projectData.modelCount || (projectData.modelSettings?.length || 0),
    
    // 最小限の設定
    settings: {
      arScale: Math.round((projectData.settings?.arScale || 1) * 100) / 100,
      isPublic: Boolean(projectData.settings?.isPublic),
      showGrid: Boolean(projectData.settings?.showGrid),
      backgroundColor: projectData.settings?.backgroundColor || 0x222222
    },

    // ローディング画面（選択のみを軽量保存）
    loadingScreen: projectData.loadingScreen
      ? { selectedScreenId: projectData.loadingScreen.selectedScreenId || 'none' }
      : { selectedScreenId: 'none' },
    
    // マーカー画像データ（小さい場合のみ保存）
    markerImage: projectData.markerImage && projectData.markerImage.length < 100000 ? projectData.markerImage : null,
    
    // タイムスタンプ
    created: projectData.created || Date.now(),
    updated: Date.now(),
    
    // 統計情報
    stats: {
      views: projectData.stats?.views || 0,
      lastViewed: projectData.stats?.lastViewed
    }
  };
}

/**
 * 軽量化されたモデル設定を作成
 * @param {Object} model - 元のモデル設定
 * @returns {Object} 軽量化されたモデル設定
 */
function createLightweightModelSettings(model) {
  return {
    // ファイル情報
    fileName: String(model.fileName || 'model.glb').substring(0, 100),
    fileSize: model.fileSize || 0,
    
    // IndexedDB のモデル ID（新規追加）
    modelId: model.modelId || null,
    
    // 変換設定
    transform: {
      position: {
        x: Math.round((Number(model.transform?.position?.x || 0) || 0) * 100) / 100,
        y: Math.round((Number(model.transform?.position?.y || 0) || 0) * 100) / 100,
        z: Math.round((Number(model.transform?.position?.z || 0) || 0) * 100) / 100
      },
      rotation: {
        x: Math.round((Number(model.transform?.rotation?.x || 0) || 0) * 100) / 100,
        y: Math.round((Number(model.transform?.rotation?.y || 0) || 0) * 100) / 100,
        z: Math.round((Number(model.transform?.rotation?.z || 0) || 0) * 100) / 100
      },
      scale: {
        x: Math.round((Number(model.transform?.scale?.x || 1) || 1) * 100) / 100,
        y: Math.round((Number(model.transform?.scale?.y || 1) || 1) * 100) / 100,
        z: Math.round((Number(model.transform?.scale?.z || 1) || 1) * 100) / 100
      }
    },
    
    // その他の設定
    visible: Boolean(model.visible !== false),
    hasAnimations: Boolean(model.hasAnimations),
    order: model.order || 0,
    
    // メタデータ
    mimeType: model.mimeType || 'model/gltf-binary',
    lastModified: model.lastModified || Date.now()
  };
}

/**
 * プロジェクトを取得
 * @param {string} id - プロジェクトID
 * @returns {Object|null} プロジェクトデータ
 */
export function getProject(id) {
  const projects = getProjects();
  return projects.find(p => p.id === id) || null;
}

/**
 * プロジェクトを削除
 * @param {string} id - プロジェクトID
 * @returns {boolean} 削除成功の場合 true
 */
export function deleteProject(id) {
  try {
    const projects = getProjects();
    const filteredProjects = projects.filter(p => p.id !== id);
    
    // プロジェクト数が変わっていなければ削除失敗
    if (filteredProjects.length === projects.length) {
      return false;
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredProjects));
    
    console.log('✅ プロジェクト削除完了:', id);
    return true;
  } catch (error) {
    console.error('❌ プロジェクト削除エラー:', error);
    return false;
  }
}