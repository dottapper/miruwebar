// src/views/editor/project-state.js - プロジェクト状態管理

import { saveCurrentProject } from './project-operations.js';
import { showSaveProjectModal } from '../../components/ui.js';

// DEBUG ログ制御

// プロジェクト状態管理
let hasUnsavedChanges = false;

/**
 * プロジェクト状態管理関数
 */
export function markAsChanged() {
  hasUnsavedChanges = true;
}

export function markAsSaved() {
  hasUnsavedChanges = false;
}

export function checkForUnsavedChanges() {
  return hasUnsavedChanges;
}

export function resetProjectState() {
  hasUnsavedChanges = false;
}

// 戻る前の保存確認ダイアログ
export function showUnsavedChangesDialog() {
  return new Promise((resolve) => {
    const message = "変更内容が保存されていません。\n\n保存してからプロジェクト一覧に戻りますか？";
    
    if (confirm(message)) {
      // 「OK」を選択 - 保存してから戻る
      
      // 保存処理を実行
      handleSaveProject().then(() => {
        resolve(true);
      }).catch(error => {
        console.error('保存に失敗しました:', error);
        alert('保存に失敗しました。もう一度お試しください。');
        resolve(false);
      });
    } else {
      // 「キャンセル」を選択 - 保存せずに戻る
      const confirmDiscard = confirm("変更内容を破棄してプロジェクト一覧に戻りますか？");
      resolve(confirmDiscard);
    }
  });
}

/**
 * プロジェクト保存処理
 */
export async function handleSaveProject() {
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const projectId = urlParams.get('id');
  
  if (projectId && window.arViewer) {
    const success = await saveCurrentProject(projectId, window.arViewer, '');
    if (success) {
      markAsSaved();
    }
    return success;
  } else {
    // 新規プロジェクトの場合は保存モーダルを表示
    showSaveProjectModal();
    return true;
  }
}