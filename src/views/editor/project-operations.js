// src/views/editor/project-operations.js - プロジェクト関連の操作

import { saveProject, getProject, loadProjectWithModels } from '../../api/projects-new.js';
import { exportProjectBundleById } from '../../maintenance/project-maintenance.js';
import { loadLoadingSettingsToUI, resetAllUI } from './ui-handlers.js';
import { settingsAPI } from '../../components/loading-screen/settings.js';

// DEBUG ログ制御

/**
 * プロジェクトを読み込む
 */
export async function loadProject(projectId, arViewer, savedSelectedScreenId) {
  if (!projectId) return;

  try {
    const project = await getProject(projectId);
    
    if (!project) {
      console.warn('プロジェクトが見つかりません:', projectId);
      return;
    }


    // モデルの読み込み（遅延実行で3Dモデルファイル本体も復元）
    if (project.models && project.models.length > 0) {
      const modelsWithData = await loadProjectWithModels(projectId);
      
      if (modelsWithData && modelsWithData.models) {
        
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
      
      const { position, rotation, scale } = project.transform;
      
      // ARViewerの3Dオブジェクトに適用
      if (arViewer && arViewer.model) {
        if (position) arViewer.model.position.set(position.x, position.y, position.z);
        if (rotation) arViewer.model.rotation.set(rotation.x, rotation.y, rotation.z);
        if (scale) arViewer.model.scale.set(scale.x, scale.y, scale.z);
      }
      
      // UIコントロールにも反映（次のupdateUIFromModel呼び出しで同期される）
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

    // エディター設定を取得（軽量化してプロジェクトへ反映）
    let editorSettingsSafe = null;
    try {
      const s = settingsAPI.getSettings();
      // 画像を含む巨大なエディター全体設定はプロジェクトに埋め込まない
      // ビューア表示に必要な screen 単位の設定のみプロジェクト直下へ保存
      editorSettingsSafe = s;
    } catch (_) {
      editorSettingsSafe = null;
    }

    // 紐づけテンプレート設定を取得（viewerで直接反映できるよう project.json に埋め込む）
    let templateSettings = null;
    try {
      const templatesJson = localStorage.getItem('miruwebAR_loading_templates');
      if (templatesJson) {
        const all = JSON.parse(templatesJson);
        const tid = loadingScreenData?.selectedScreenId || savedSelectedScreenId || '';
        if (tid && tid !== 'none') {
          const match = all.find(t => t.id === tid);
          if (match && match.settings) {
            templateSettings = { ...match.settings };
          }
        }
      }
    } catch (e) {
      console.warn('テンプレート設定の取得に失敗（継続）:', e);
    }

    // テンプレート未選択時は何も注入しない（既存プロジェクトの設定を尊重）
    // → viewer側で既存project.jsonのstartScreen/guideScreenまたはテンプレ由来を優先適用

    const projectData = {
      id: projectId,
      models: modelsData,
      transform: transformData,
      // ローディング画面: 選択状態に加え、必要最小限の見栄え設定を併記
      loadingScreen: {
        ...loadingScreenData,
        // エディターの現在値から主要プロパティを反映（画像などはsettings側で圧縮管理）
        ...(editorSettingsSafe?.loadingScreen ? editorSettingsSafe.loadingScreen : {}),
        // 紐づけテンプレートをそのまま埋め込み（start/loading/guide を包含）
        ...(templateSettings ? { templateSettings } : {})
      },
      // スタート画面/ガイド画面: ビューアで直接反映できるよう直下に保存
      startScreen: editorSettingsSafe?.startScreen || (templateSettings?.startScreen || {
        title: 'AR体験を開始',
        buttonText: '開始',
        backgroundColor: '#121212',
        textColor: '#ffffff',
        buttonColor: '#007bff',
        buttonTextColor: '#ffffff',
        titleSize: 1.5,
        buttonSize: 1.0,
        logoSize: 1.0,
        titlePosition: 40,
        buttonPosition: 60,
        logoPosition: 20
      }),
      guideScreen: editorSettingsSafe?.guideScreen || (templateSettings?.guideScreen || null),
      lastModified: new Date().toISOString()
    };

    
    // ARViewerインスタンスを取得して渡す
    const arViewerInstance = window.arViewer;
    
    const result = await saveProject(projectData, arViewerInstance);
    
    if (result.success) {
      
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
  // ARViewerから実際のモデルデータを取得
  const arViewer = window.arViewer;
  const models = [];

  if (arViewer && arViewer.controls && arViewer.controls.getAllModels) {
    try {
      const allModels = arViewer.controls.getAllModels();
      
      allModels.forEach((model, index) => {
        models.push({
          name: model.fileName || `Model ${index + 1}`,
          fileName: model.fileName,
          fileSize: model.fileSize || 0,
          index: index,
          position: model.position || { x: 0, y: 0, z: 0 },
          rotation: model.rotation || { x: 0, y: 0, z: 0 },
          scale: model.scale || { x: 1, y: 1, z: 1 },
          visible: model.visible !== false,
          hasAnimations: Boolean(model.hasAnimations),
          // モデルデータのBlobも含める
          modelData: model.modelData
        });
      });
      
    } catch (error) {
      console.error('❌ ARViewerからモデルデータ取得エラー:', error);
    }
  } else {
    // フォールバック: UIの選択肢から取得
    const modelSelect = document.getElementById('model-select');
    if (modelSelect) {
      for (let i = 1; i < modelSelect.options.length; i++) {
        const option = modelSelect.options[i];
        models.push({
          name: option.textContent,
          index: option.value
        });
      }
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
    // editorSettings は巨大化しやすいためプロジェクト直下には保存しない
    // ビューア反映に必要な値は saveCurrentProject 側で各画面へ分配
  };
}