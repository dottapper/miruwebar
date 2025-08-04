/**
 * ローディング画面選択モーダルの管理
 */

import { settingsAPI } from './loading-screen/settings.js';

let modalOverlay = null;
let isModalOpen = false;

/**
 * モーダルのHTML構造を生成
 */
function createModalHTML() {
  return `
    <div class="loading-screen-selector-overlay" id="loading-screen-selector-overlay">
      <div class="loading-screen-selector-modal">
        <div class="loading-screen-selector-header">
          <h2 class="loading-screen-selector-title">ローディング画面を選択</h2>
          <button class="loading-screen-selector-close" id="close-selector-modal">
            ×
          </button>
        </div>
        
        <div class="loading-screen-selector-content">
          <!-- 新規作成セクション -->
          <div class="new-template-section">
            <button class="new-template-button" id="create-new-template">
              <span class="new-template-icon">📝</span>
              <div class="new-template-text">
                <h3>新規作成</h3>
                <p>新しいローディング画面を作成します</p>
              </div>
            </button>
          </div>
          
          <!-- 保存済みテンプレートセクション -->
          <div class="saved-templates-section">
            <h3 class="saved-templates-title">保存済みテンプレート</h3>
            <div id="templates-list-container">
              <!-- テンプレート一覧がここに動的に挿入される -->
            </div>
          </div>
          
          <!-- アクションボタン -->
          <div class="modal-actions">
            <button class="modal-button modal-button--secondary" id="cancel-selection">
              キャンセル
            </button>
            <button class="modal-button modal-button--primary" id="confirm-selection" style="display: none;">
              選択
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 保存済みテンプレート一覧を生成
 */
function generateTemplatesList() {
  const templates = getStoredTemplates();
  
  if (templates.length === 0) {
    return `
      <div class="no-templates">
        保存済みテンプレートはありません
      </div>
    `;
  }
  
  // とりあえずドロップダウン形式で実装
  const options = templates.map(template => 
    `<option value="${template.id}">${template.name} (${template.createdAt})</option>`
  ).join('');
  
  return `
    <select class="template-dropdown" id="template-selector">
      <option value="">テンプレートを選択してください</option>
      ${options}
    </select>
  `;
}

/**
 * ローカルストレージから保存済みテンプレートを取得
 */
function getStoredTemplates() {
  try {
    const stored = localStorage.getItem('loadingScreenTemplates');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('テンプレート一覧の取得に失敗:', error);
    return [];
  }
}

/**
 * モーダルを表示
 */
export function showLoadingScreenSelector() {
  if (isModalOpen) return;
  
  console.log('ローディング画面選択モーダルを表示します');
  
  // モーダルのHTMLを作成
  const modalHTML = createModalHTML();
  
  // DOMに挿入
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  modalOverlay = document.getElementById('loading-screen-selector-overlay');
  
  // テンプレート一覧を更新
  updateTemplatesList();
  
  // イベントリスナーを設定
  setupModalEventListeners();
  
  // モーダルを表示
  setTimeout(() => {
    modalOverlay.classList.add('show');
    isModalOpen = true;
  }, 10);
}

/**
 * モーダルを非表示
 */
export function hideLoadingScreenSelector() {
  if (!isModalOpen || !modalOverlay) return;
  
  console.log('ローディング画面選択モーダルを非表示にします');
  
  modalOverlay.classList.remove('show');
  
  setTimeout(() => {
    if (modalOverlay && modalOverlay.parentNode) {
      modalOverlay.parentNode.removeChild(modalOverlay);
    }
    modalOverlay = null;
    isModalOpen = false;
  }, 300);
}

/**
 * テンプレート一覧を更新
 */
function updateTemplatesList() {
  const container = document.getElementById('templates-list-container');
  if (container) {
    container.innerHTML = generateTemplatesList();
  }
}

/**
 * モーダルのイベントリスナーを設定
 */
function setupModalEventListeners() {
  // 閉じるボタン
  const closeButton = document.getElementById('close-selector-modal');
  if (closeButton) {
    closeButton.addEventListener('click', hideLoadingScreenSelector);
  }
  
  // キャンセルボタン
  const cancelButton = document.getElementById('cancel-selection');
  if (cancelButton) {
    cancelButton.addEventListener('click', hideLoadingScreenSelector);
  }
  
  // 新規作成ボタン
  const newButton = document.getElementById('create-new-template');
  if (newButton) {
    newButton.addEventListener('click', handleNewTemplateCreation);
  }
  
  // テンプレート選択
  const templateSelector = document.getElementById('template-selector');
  if (templateSelector) {
    templateSelector.addEventListener('change', handleTemplateSelection);
  }
  
  // 選択ボタン
  const confirmButton = document.getElementById('confirm-selection');
  if (confirmButton) {
    confirmButton.addEventListener('click', handleConfirmSelection);
  }
  
  // オーバーレイクリックで閉じる
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      hideLoadingScreenSelector();
    }
  });
  
  // Escキーで閉じる
  document.addEventListener('keydown', handleKeyPress);
}

/**
 * 新規作成処理
 */
function handleNewTemplateCreation() {
  console.log('新規テンプレート作成が選択されました');
  hideLoadingScreenSelector();
  
  // ローディング画面エディタに遷移（新規作成モード）
  window.location.hash = '#/loading-screen?mode=new';
}

/**
 * テンプレート選択処理
 */
function handleTemplateSelection() {
  const selector = document.getElementById('template-selector');
  const confirmButton = document.getElementById('confirm-selection');
  
  if (selector && confirmButton) {
    if (selector.value) {
      confirmButton.style.display = 'block';
    } else {
      confirmButton.style.display = 'none';
    }
  }
}

/**
 * 選択確定処理
 */
function handleConfirmSelection() {
  const selector = document.getElementById('template-selector');
  
  if (selector && selector.value) {
    const templateId = selector.value;
    console.log('テンプレートが選択されました:', templateId);
    
    hideLoadingScreenSelector();
    
    // ローディング画面エディタに遷移（編集モード）
    window.location.hash = `#/loading-screen?template=${templateId}`;
  }
}

/**
 * キーボードイベント処理
 */
function handleKeyPress(e) {
  if (e.key === 'Escape' && isModalOpen) {
    hideLoadingScreenSelector();
  }
}

/**
 * テンプレートを保存（ローディング画面エディタから呼び出される）
 */
export function saveLoadingScreenTemplate(templateData) {
  try {
    const templates = getStoredTemplates();
    const newTemplate = {
      id: `template_${Date.now()}`,
      name: templateData.name || `テンプレート ${templates.length + 1}`,
      createdAt: new Date().toLocaleDateString('ja-JP'),
      updatedAt: new Date().toLocaleDateString('ja-JP'),
      settings: templateData.settings
    };
    
    templates.push(newTemplate);
    localStorage.setItem('loadingScreenTemplates', JSON.stringify(templates));
    
    console.log('テンプレートを保存しました:', newTemplate.name);
    return newTemplate;
  } catch (error) {
    console.error('テンプレートの保存に失敗:', error);
    throw error;
  }
}

/**
 * テンプレートを取得
 */
export function getLoadingScreenTemplate(templateId) {
  const templates = getStoredTemplates();
  return templates.find(template => template.id === templateId);
}