// src/views/editor/project-operations.js - プロジェクト関連の操作

import { saveProject, getProject, loadProjectWithModels } from '../../api/projects-new.js';
import { exportProjectBundleById } from '../../api/projects.js';
import { loadLoadingSettingsToUI, resetAllUI } from './ui-handlers.js';

// DEBUG ログ制御
const IS_DEBUG = (typeof window !== 'undefined' && !!window.DEBUG);
const dlog = (...args) => { if (IS_DEBUG) console.log(...args); };

/**
 * プロジェクトを読み込む
 */
export async function loadProject(projectId, arViewer, savedSelectedScreenId) {
  if (!projectId) return;

  try {
    dlog('📁 プロジェクトを読み込み中...', projectId);
    const project = await getProject(projectId);
    
    if (!project) {
      console.warn('プロジェクトが見つかりません:', projectId);
      return;
    }

    dlog('📁 プロジェクトデータ取得完了:', project);

    // モデルの読み込み（遅延実行で3Dモデルファイル本体も復元）
    if (project.models && project.models.length > 0) {
      dlog('🔄 プロジェクトからモデルを復元中...');
      const modelsWithData = await loadProjectWithModels(projectId);
      
      if (modelsWithData && modelsWithData.models) {
        dlog('✅ プロジェクトのモデルデータ復元完了:', modelsWithData.models.length, 'models');
        
        // UIのモデルセレクトに復元
        const modelSelect = document.getElementById('model-select');
        if (modelSelect) {
          // 既存のオプションをクリア
          modelSelect.innerHTML = '<option value="">モデルを選択</option>';
          
          // 復元されたモデルを追加
          modelsWithData.models.forEach((model, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = model.name || `Model ${index + 1}`;
            modelSelect.appendChild(option);
          });

          // 最初のモデルを選択状態にして読み込み
          if (modelsWithData.models.length > 0) {
            modelSelect.value = '0';
            const event = new Event('change');
            modelSelect.dispatchEvent(event);
          }
        }
      }
    }

    // Transform設定の復元
    if (project.transform) {
      dlog('🔄 Transform設定を復元中...', project.transform);
      
      const { position, rotation, scale } = project.transform;
      
      // ARViewerの3Dオブジェクトに適用
      if (arViewer && arViewer.model) {
        if (position) arViewer.model.position.set(position.x, position.y, position.z);
        if (rotation) arViewer.model.rotation.set(rotation.x, rotation.y, rotation.z);
        if (scale) arViewer.model.scale.set(scale.x, scale.y, scale.z);
      }
      
      // UIコントロールにも反映（次のupdateUIFromModel呼び出しで同期される）
      dlog('✅ Transform設定復元完了');
    }

    // ローディング設定をUIに反映
    if (project.loadingScreen) {
      loadLoadingSettingsToUI(project.loadingScreen, savedSelectedScreenId);
      
      // ローディング画面設定の復元（シンプル版）
      if (project.loadingScreen.selectedScreenId) {
        setTimeout(() => {
          const loadingScreenSelect = document.getElementById('loading-screen-select');
          if (loadingScreenSelect) {
            loadingScreenSelect.value = project.loadingScreen.selectedScreenId;
            savedSelectedScreenId = project.loadingScreen.selectedScreenId;
            dlog('✅ ローディング画面設定を復元:', project.loadingScreen.selectedScreenId);
          }
        }, 200);
      }
    }
      
  } catch (error) {
    console.error('プロジェクト読み込みエラー:', error);
  }
}

/**
 * プロジェクトを保存する
 */
export async function saveCurrentProject(projectId, arViewer, savedSelectedScreenId) {
  try {
    // プロジェクト保存前に最新のUI状態を同期
    const transformData = getCurrentTransformData();
    const modelsData = getCurrentModelsData();
    const loadingScreenData = getCurrentLoadingScreenData(savedSelectedScreenId);

    const projectData = {
      id: projectId,
      models: modelsData,
      transform: transformData,
      loadingScreen: loadingScreenData,
      lastModified: new Date().toISOString()
    };

    dlog('💾 プロジェクトを保存中...', projectData);
    
    const result = await saveProject(projectId, projectData);
    
    if (result.success) {
      dlog('✅ プロジェクト保存完了');
      
      // 保存完了メッセージを表示
      const saveButton = document.getElementById('save-button');
      if (saveButton) {
        const originalText = saveButton.textContent;
        saveButton.textContent = '保存完了！';
        saveButton.style.backgroundColor = '#4CAF50';
        
        setTimeout(() => {
          saveButton.textContent = originalText;
          saveButton.style.backgroundColor = '';
        }, 2000);
      }
      
      return true;
    } else {
      throw new Error(result.error || '保存に失敗しました');
    }
    
  } catch (error) {
    console.error('プロジェクト保存エラー:', error);
    alert('プロジェクトの保存に失敗しました: ' + error.message);
    return false;
  }
}

/**
 * 現在のTransformデータを取得
 */
function getCurrentTransformData() {
  return {
    position: {
      x: parseFloat(document.getElementById('pos-x')?.value || 0),
      y: parseFloat(document.getElementById('pos-y')?.value || 0),
      z: parseFloat(document.getElementById('pos-z')?.value || 0)
    },
    rotation: {
      x: parseFloat(document.getElementById('rot-x')?.value || 0) * Math.PI / 180,
      y: parseFloat(document.getElementById('rot-y')?.value || 0) * Math.PI / 180,
      z: parseFloat(document.getElementById('rot-z')?.value || 0) * Math.PI / 180
    },
    scale: {
      x: parseFloat(document.getElementById('scale-x')?.value || 1),
      y: parseFloat(document.getElementById('scale-y')?.value || 1),
      z: parseFloat(document.getElementById('scale-z')?.value || 1)
    }
  };
}

/**
 * 現在のモデルデータを取得
 */
function getCurrentModelsData() {
  // 現在読み込まれているモデルの情報を収集
  const modelSelect = document.getElementById('model-select');
  const models = [];
  
  if (modelSelect) {
    for (let i = 1; i < modelSelect.options.length; i++) {
      const option = modelSelect.options[i];
      models.push({
        name: option.textContent,
        index: option.value
      });
    }
  }
  
  return models;
}

/**
 * 現在のローディング画面データを取得
 */
function getCurrentLoadingScreenData(savedSelectedScreenId) {
  const loadingScreenSelect = document.getElementById('loading-screen-select');
  
  return {
    selectedScreenId: loadingScreenSelect?.value || savedSelectedScreenId || '',
    editorSettings: null // settingsAPIから取得する場合は別途実装
  };
}