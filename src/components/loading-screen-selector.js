/**
 * ローディング画面選択モーダルの管理
 */

// import { settingsAPI } from './loading-screen/settings.js'; // 現在未使用
import { TOTAL_IMAGES_MAX_BYTES } from './loading-screen/constants.js';

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
          <h2 class="loading-screen-selector-title">ローディング画面エディター</h2>
          <button class="loading-screen-selector-close" id="close-selector-modal">
            ×
          </button>
        </div>
        
        <div class="loading-screen-selector-content">
          <!-- 新規作成セクション -->
          <div class="new-template-section">
            <button class="new-template-button" id="create-new-template">
              <span class="new-template-icon">🏢</span>
              <div class="new-template-text">
                <h3>新規プロジェクト</h3>
                <p>新しいプロジェクト用のローディング画面を作成</p>
              </div>
            </button>
          </div>
          
          <!-- 既存プロジェクトセクション -->
          <div class="saved-templates-section">
            <h3 class="saved-templates-title">既存プロジェクト</h3>
            <div id="templates-list-container">
              <!-- プロジェクト一覧がここに動的に挿入される -->
            </div>
          </div>
          
          <!-- アクションボタン -->
          <div class="modal-actions">
            <button class="modal-button modal-button--secondary" id="cancel-selection">
              キャンセル
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
        既存プロジェクトはありません
      </div>
    `;
  }
  
  // リスト形式でプロジェクト一覧を表示
  const projectList = templates.map(template => 
    createProjectItemHTML(template)
  ).join('');
  
  return projectList;
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
  
  // テンプレートカードのイベントリスナーを設定
  setupTemplateCardListeners();
  
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
 * テンプレートカードのイベントリスナーを設定
 */
function setupTemplateCardListeners() {
  // 編集ボタン（旧選択ボタン）
  const editButtons = document.querySelectorAll('.project-edit-btn');
  editButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const templateId = button.dataset.templateId;
      handleTemplateSelection(templateId);
    });
  });
  
  // 削除ボタン
  const deleteButtons = document.querySelectorAll('.project-delete-btn');
  deleteButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const templateId = button.dataset.templateId;
      handleTemplateDelete(templateId);
    });
  });
  
  // テンプレートカード全体のクリック（プレビュー用）
  const templateCards = document.querySelectorAll('.template-card');
  templateCards.forEach(card => {
    card.addEventListener('click', (e) => {
      // ボタンクリック時は無視
      if (e.target.classList.contains('template-action-btn')) {
        return;
      }
      
      const templateId = card.dataset.templateId;
      // カードクリックでも選択（ダブルクリック防止）
      handleTemplateSelection(templateId);
    });
  });
}

/**
 * 新規作成処理
 */
function handleNewTemplateCreation() {
  console.log('新規テンプレート作成が選択されました');
  
  // 名前入力ダイアログを表示
  showTemplateNameDialog();
}

/**
 * テンプレート名前入力ダイアログを表示
 */
function showTemplateNameDialog() {
  // 既存のダイアログがある場合は削除
  const existingDialog = document.getElementById('template-name-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }
  
  const dialogHTML = `
    <div class="template-name-dialog-overlay" id="template-name-dialog">
      <div class="template-name-dialog">
        <div class="template-name-dialog-header">
          <h3>新しいローディング画面</h3>
          <button class="template-name-dialog-close" id="close-name-dialog">×</button>
        </div>
        <div class="template-name-dialog-content">
          <p>ローディング画面の名前を入力してください：</p>
          <input type="text" 
                 class="template-name-input" 
                 id="template-name-input" 
                 placeholder="例：企業ロゴ付きローディング画面"
                 maxlength="50">
          <div class="template-name-counter">
            <span id="char-counter">0</span>/50文字
          </div>
        </div>
        <div class="template-name-dialog-actions">
          <button class="template-name-button template-name-button--secondary" id="cancel-name-dialog">
            キャンセル
          </button>
          <button class="template-name-button template-name-button--primary" id="confirm-name-dialog">
            作成
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', dialogHTML);
  
  // イベントリスナーを設定
  setupNameDialogEventListeners();
  
  // ダイアログを表示
  const dialog = document.getElementById('template-name-dialog');
  setTimeout(() => {
    dialog.classList.add('show');
    // 入力フィールドにフォーカス
    document.getElementById('template-name-input').focus();
  }, 10);
}

/**
 * プロジェクトアイテムのHTMLを作成
 */
function createProjectItemHTML(template) {
  return `
    <div class="project-item" data-template-id="${template.id}">
      <div class="project-icon">🏢</div>
      <div class="project-info">
        <div class="project-name">${template.name}</div>
        <div class="project-details">
          <span class="project-date">${template.createdAt}</span>
        </div>
      </div>
      <div class="project-actions">
        <button class="project-action-btn project-edit-btn" data-template-id="${template.id}">
          編集
        </button>
        <button class="project-action-btn project-delete-btn" data-template-id="${template.id}">
          削除
        </button>
      </div>
    </div>
  `;
}

/**
 * 名前入力ダイアログのイベントリスナーを設定
 */
function setupNameDialogEventListeners() {
  const elements = {
    dialog: document.getElementById('template-name-dialog'),
    closeButton: document.getElementById('close-name-dialog'),
    cancelButton: document.getElementById('cancel-name-dialog'),
    confirmButton: document.getElementById('confirm-name-dialog'),
    nameInput: document.getElementById('template-name-input'),
    charCounter: document.getElementById('char-counter')
  };
  
  setupDialogEventListeners(elements);
}

/**
 * ダイアログのイベントリスナーを設定
 */
function setupDialogEventListeners(elements) {
  const { dialog, closeButton, cancelButton, confirmButton, nameInput, charCounter } = elements;
  
  // ボタンイベント
  closeButton?.addEventListener('click', hideTemplateNameDialog);
  cancelButton?.addEventListener('click', hideTemplateNameDialog);
  confirmButton?.addEventListener('click', handleNameConfirm);
  
  // 入力イベント
  nameInput?.addEventListener('input', (e) => updateCharacterCounter(e, charCounter));
  nameInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameConfirm();
    }
  });
  
  // ダイアログ閉じるイベント
  setupDialogCloseEvents(dialog);
}

/**
 * 文字数カウンターを更新
 */
function updateCharacterCounter(event, charCounter) {
  const length = event.target.value.length;
  charCounter.textContent = length;
  
  // 文字数制限の視覚的フィードバック
  const colors = { danger: '#ff6b6b', warning: '#ffa500', normal: '#666' };
  charCounter.style.color = length > 45 ? colors.danger : 
                           length > 35 ? colors.warning : 
                           colors.normal;
}

/**
 * ダイアログを閉じるイベントを設定
 */
function setupDialogCloseEvents(dialog) {
  // オーバーレイクリックで閉じる
  dialog?.addEventListener('click', (e) => {
    if (e.target === dialog) {
      hideTemplateNameDialog();
    }
  });
  
  // Escキーで閉じる
  const handleEscKey = (e) => {
    if (e.key === 'Escape') {
      hideTemplateNameDialog();
      document.removeEventListener('keydown', handleEscKey);
    }
  };
  document.addEventListener('keydown', handleEscKey);
}

/**
 * 名前入力ダイアログを非表示
 */
function hideTemplateNameDialog() {
  const dialog = document.getElementById('template-name-dialog');
  if (dialog) {
    dialog.classList.remove('show');
    setTimeout(() => {
      dialog.remove();
    }, 300);
  }
}

/**
 * 名前確定処理
 */
function handleNameConfirm() {
  const nameInput = document.getElementById('template-name-input');
  const templateName = nameInput?.value.trim();
  
  if (!templateName) {
    // 名前が空の場合の警告
    nameInput.classList.add('error');
    nameInput.placeholder = '名前を入力してください';
    nameInput.focus();
    return;
  }
  
  console.log('テンプレート名が確定されました:', templateName);
  
  // ダイアログを閉じる
  hideTemplateNameDialog();
  
  // セレクターモーダルも閉じる
  hideLoadingScreenSelector();
  
  // 名前をURLパラメータに含めてエディタに遷移
  const encodedName = encodeURIComponent(templateName);
  window.location.hash = `#/loading-screen?mode=new&name=${encodedName}`;
}

/**
 * テンプレート選択処理
 */
function handleTemplateSelection(templateId) {
  console.log('テンプレートが選択されました:', templateId);
  
  hideLoadingScreenSelector();
  
  // ローディング画面エディタに遷移（編集モード）
  window.location.hash = `#/loading-screen?template=${templateId}`;
}

/**
 * テンプレート削除処理
 */
function handleTemplateDelete(templateId) {
  const template = getLoadingScreenTemplate(templateId);
  
  if (!template) {
    console.error('削除対象のテンプレートが見つかりません:', templateId);
    return;
  }
  
  const confirmMessage = `テンプレート「${template.name}」を削除しますか？\n\nこの操作は取り消せません。`;
  
  if (confirm(confirmMessage)) {
    try {
      const result = deleteLoadingScreenTemplate(templateId);
      
      // 一覧を更新
      updateTemplatesList();
      
      // 通知を表示
      showDeleteNotification(`テンプレート「${template.name}」を削除しました`);
    } catch (error) {
      console.error('テンプレート削除に失敗:', error);
      alert('テンプレートの削除に失敗しました');
    }
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
    const settings = templateData.settings;
    const templates = getStoredTemplates();
    
    // 容量制限をチェック（3MB）
    const maxSize = TOTAL_IMAGES_MAX_BYTES;
    // 画像を含めるとlocalStorageの容量に達しやすいため、
    // テンプレート保存時は画像データを除去した軽量設定を保存する
    const sanitized = JSON.parse(JSON.stringify(settings));
    try {
      if (sanitized.startScreen) {
        delete sanitized.startScreen.logo;
        delete sanitized.startScreen.thumbnail;
      }
      if (sanitized.loadingScreen) {
        delete sanitized.loadingScreen.logo;
      }
      if (sanitized.guideScreen) {
        if (sanitized.guideScreen.surfaceDetection) delete sanitized.guideScreen.surfaceDetection.guideImage;
        if (sanitized.guideScreen.worldTracking) delete sanitized.guideScreen.worldTracking.guideImage;
      }
      // editorSettings が入っている場合も同様に画像を除去
      if (sanitized.loadingScreen?.editorSettings) {
        const le = sanitized.loadingScreen.editorSettings;
        if (le.startScreen) { delete le.startScreen.logo; delete le.startScreen.thumbnail; }
        if (le.loadingScreen) { delete le.loadingScreen.logo; }
        if (le.guideScreen) {
          if (le.guideScreen.surfaceDetection) delete le.guideScreen.surfaceDetection.guideImage;
          if (le.guideScreen.worldTracking) delete le.guideScreen.worldTracking.guideImage;
        }
      }
    } catch (_) {}

    const newTemplate = {
      id: `template_${Date.now()}`,
      name: templateData.name || `テンプレート ${templates.length + 1}`,
      createdAt: new Date().toLocaleDateString('ja-JP'),
      updatedAt: new Date().toLocaleDateString('ja-JP'),
      settings: sanitized
    };
    
    // 新しいテンプレートを追加
    templates.push(newTemplate);
    
    // 容量チェック（画像を含まないため、3MB以内に収まる想定）
    const templatesJson = JSON.stringify(templates);
    if (templatesJson.length > maxSize) {
      console.warn('⚠️ テンプレート容量制限に近づいています。古いテンプレートを削除します。');
      
      // 古いテンプレートを削除（最新の5個を保持）
      while (templates.length > 5 && templatesJson.length > maxSize) {
        const oldestTemplate = templates.shift(); // 最も古いテンプレートを削除
        console.log('🗑️ 古いテンプレートを削除:', oldestTemplate.name);
      }
      
      // 再度容量チェック
      const reducedTemplatesJson = JSON.stringify(templates);
      if (reducedTemplatesJson.length > maxSize) {
        throw new Error('テンプレートの容量が制限を超えています。画像を削除してから保存してください。');
      }
    }
    
    localStorage.setItem('loadingScreenTemplates', JSON.stringify(templates));
    
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

/**
 * テンプレートを削除
 */
export function deleteLoadingScreenTemplate(templateId) {
  try {
    const templates = getStoredTemplates();
    const filteredTemplates = templates.filter(template => template.id !== templateId);
    
    localStorage.setItem('loadingScreenTemplates', JSON.stringify(filteredTemplates));
    
    // 削除されたテンプレートがlastUsedTemplateIdの場合はクリア
    const lastUsedId = localStorage.getItem('lastUsedTemplateId');
    if (lastUsedId === templateId) {
      localStorage.removeItem('lastUsedTemplateId');
    }
    
    return true;
  } catch (error) {
    console.error('テンプレートの削除に失敗:', error);
    throw error;
  }
}

/**
 * 削除通知を表示
 */
function showDeleteNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'template-notification template-notification--success';
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">✓</span>
      <span class="notification-message">${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // フェードイン
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // 自動で削除
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}
