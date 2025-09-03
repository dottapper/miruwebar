// src/views/editor/ui-handlers.js - UI操作とイベントハンドラー

import { settingsAPI } from '../../components/loading-screen/settings.js';

// DEBUG ログ制御
const IS_DEBUG = (typeof window !== 'undefined' && !!window.DEBUG);
const dlog = (...args) => { if (IS_DEBUG) console.log(...args); };

/**
 * ファイルサイズを適切な単位でフォーマットする
 * @param {number} bytes - バイト単位のファイルサイズ
 * @returns {string} フォーマットされたファイルサイズ文字列
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * ローディング設定をUIに読み込む関数
 */
export function loadLoadingSettingsToUI(loadingScreen, savedSelectedScreenId) {
  if (!loadingScreen) return;

  // プロジェクトにローディング画面エディターの詳細設定が含まれている場合は復元
  if (loadingScreen.editorSettings) {
    try {
      dlog('🔄 ローディング画面エディターの詳細設定を復元中...');
      settingsAPI.saveSettings(loadingScreen.editorSettings);
      dlog('✅ ローディング画面エディターの詳細設定を復元完了');
    } catch (error) {
      console.warn('⚠️ ローディング画面エディターの詳細設定復元に失敗:', error);
    }
  }
  
  // セレクトボックスの復元が確実に行われるよう、少し遅延を入れて再度チェック
  setTimeout(() => {
    const loadingScreenSelect = document.getElementById('loading-screen-select');
    if (loadingScreenSelect && loadingScreen.selectedScreenId) {
      const currentValue = loadingScreenSelect.value;
      const expectedValue = loadingScreen.selectedScreenId;
      
      if (currentValue !== expectedValue) {
        dlog('🔄 ローディング画面選択の再復元:', {
          current: currentValue,
          expected: expectedValue
        });
        
        loadingScreenSelect.value = expectedValue;
        savedSelectedScreenId = expectedValue;
        updateEditButtonState();
      }
    }
  }, 100);
}

/**
 * 編集ボタンの状態を更新
 */
export function updateEditButtonState() {
  const editButton = document.getElementById('edit-loading-screen');
  const loadingScreenSelect = document.getElementById('loading-screen-select');
  
  if (editButton && loadingScreenSelect) {
    const selectedValue = loadingScreenSelect.value;
    editButton.disabled = !selectedValue || selectedValue === '';
  }
}

/**
 * 全UIをリセットする関数
 */
export function resetAllUI() {
  // Transform controls リセット
  const transformControls = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 }
  };

  // Position
  document.getElementById('pos-x').value = transformControls.position.x;
  document.getElementById('pos-y').value = transformControls.position.y;
  document.getElementById('pos-z').value = transformControls.position.z;

  // Rotation (度数に変換)
  document.getElementById('rot-x').value = (transformControls.rotation.x * 180 / Math.PI).toFixed(1);
  document.getElementById('rot-y').value = (transformControls.rotation.y * 180 / Math.PI).toFixed(1);
  document.getElementById('rot-z').value = (transformControls.rotation.z * 180 / Math.PI).toFixed(1);

  // Scale
  document.getElementById('scale-x').value = transformControls.scale.x;
  document.getElementById('scale-y').value = transformControls.scale.y;
  document.getElementById('scale-z').value = transformControls.scale.z;
  
  // その他のUI要素もリセット
  const modelSelect = document.getElementById('model-select');
  const animationSelect = document.getElementById('animation-select');
  
  if (modelSelect) modelSelect.value = '';
  if (animationSelect) {
    animationSelect.innerHTML = '<option value="">アニメーションを選択</option>';
    animationSelect.disabled = true;
  }
}