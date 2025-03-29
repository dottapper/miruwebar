// src/components/model-list-ui.js

// --- モデルリストUI ---
export function initModelListUI(uiContainerElement, modelControls) {
    if (!uiContainerElement) {
        console.error("ModelListUI: UI container element not provided.");
        return;
    }
    const arViewerContainer = modelControls.getContainer();
    if (!arViewerContainer) {
        console.error("ModelListUI: AR Viewer container not found.");
        return;
    }
  
    // モデルリスト表示用のDOM要素を検索または作成
    // editor.js で <div class="file-list" id="file-list-container"> が生成される前提
    let listItemsContainer = uiContainerElement.querySelector('.file-list'); // ★ IDではなくクラス名で検索

   // フォールバック処理の部分 (もし listItemsContainer が null だった場合)
if (!listItemsContainer) {
    console.warn("ModelListUI: '.file-list' not found within the provided container. Creating one.");
    const panelSection = uiContainerElement.querySelector('.panel-section:nth-child(3)'); // ★ ファイル一覧があるのは3番目の panel-section かもしれない
    if (panelSection) {
        listItemsContainer = document.createElement('div');
        listItemsContainer.className = 'file-list'; 
        const existingEmptyText = panelSection.querySelector('.file-list > .empty-text');
        if (existingEmptyText) existingEmptyText.parentElement.remove(); // <div class="file-list"> ごと削除
        panelSection.insertBefore(listItemsContainer, panelSection.querySelector('.storage-usage')); // ストレージ表示の前に挿入
        listItemsContainer.innerHTML = '<p class="empty-text">モデルがありません</p>'; // 初期テキスト追加
    } else {
        console.error("ModelListUI: Cannot find the correct '.panel-section' to insert file list.");
        return; // ここで処理中断
    }
}
  
    // イベントリスナー
const handleModelListChanged = (e) => {
    console.log('modelListChanged event received', e);
    // e.detail がない場合の対応を追加
    const models = e.detail?.models || modelControls.getAllModels();
    const activeIndex = e.detail?.activeModelIndex || modelControls.getActiveModelIndex();
    updateModelList(models, activeIndex);
  };
  const handleVisibilityChanged = (e) => {
    // リスト全体を再描画するのが簡単
    const models = modelControls.getAllModels();
    const activeIndex = modelControls.getActiveModelIndex();
    updateModelList(models, activeIndex);
  };
  
    arViewerContainer.addEventListener('modelListChanged', handleModelListChanged);
    arViewerContainer.addEventListener('activeModelChanged', handleActiveModelChanged);
    arViewerContainer.addEventListener('visibilityChanged', handleVisibilityChanged);
  
    // モデルリスト更新関数
    function updateModelList(models, activeIndex) {
      if (!listItemsContainer) return;
  
      if (models.length === 0) {
        listItemsContainer.innerHTML = '<p class="empty-text">モデルがありません</p>';
        return;
      }
  
      listItemsContainer.innerHTML = ''; // 中身をクリア
      models.forEach((model, index) => {
        const item = document.createElement('div');
        // ★ クラス名を file-item に変更
        item.className = `file-item ${index === activeIndex ? 'active' : ''}`;
        item.dataset.index = index;
  
        const isVisible = model.visible; // arViewer.js の getAllModels が visible を返す前提
  
        // ★ HTML構造を editor.js の想定に合わせる
        item.innerHTML = `
          <div class="file-item-info" title="${model.fileName || 'モデル ' + (index + 1)}"> <!-- クリック領域 -->
            <span>${model.fileName || 'モデル ' + (index + 1)}</span>
            <span>(${(model.fileSize / (1024 * 1024)).toFixed(2)}MB)</span>
          </div>
          <div class="file-item-actions">
            <button class="btn-icon model-toggle-btn" data-index="${index}" title="${isVisible ? '非表示' : '表示'}">
              ${isVisible ?
                `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>` :
                `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
              }
            </button>
            <button class="btn-icon model-delete-btn" data-index="${index}" title="削除">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        `;
  
        // モデル選択イベント (情報表示エリア全体をクリック)
        item.querySelector('.file-item-info').addEventListener('click', () => {
          modelControls.switchToModel(index);
        });
  
        // 削除ボタンイベント
        item.querySelector('.model-delete-btn').addEventListener('click', (e) => {
          e.stopPropagation(); // 親要素へのイベント伝播を阻止
          if (confirm(`「${model.fileName || 'モデル ' + (index + 1)}」を削除してもよろしいですか？`)) {
            modelControls.removeModel(index);
          }
        });
  
        // 表示/非表示トグルボタンイベント
        const toggleBtn = item.querySelector('.model-toggle-btn');
        if (toggleBtn) {
          toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const modelIndex = parseInt(toggleBtn.dataset.index);
            // isVisible は forEach ループのスコープから参照
            modelControls.setModelVisibility(modelIndex, !isVisible);
            // UIの更新は visibilityChanged イベントリスナーに任せる
          });
        }
  
        listItemsContainer.appendChild(item);
      });
    }
  
    // アクティブモデル更新関数 (クラスの付け替えのみ)
    function updateActiveModel(activeIndex) {
      if (!listItemsContainer) return;
      const items = listItemsContainer.querySelectorAll('.file-item'); // ★ クラス名を file-item に
      items.forEach((item) => {
          // dataset.index を使う方が安全
          if (parseInt(item.dataset.index) === activeIndex) {
              item.classList.add('active');
          } else {
              item.classList.remove('active');
          }
      });
    }
  
    // 初期表示
    const initialModels = modelControls.getAllModels();
    const activeIndex = modelControls.getActiveModelIndex();
    updateModelList(initialModels, activeIndex);

    if (initialModels.length > 0) {
        console.log('Triggering initial model list update');
        const event = new Event('modelListChanged');
        event.detail = { models: initialModels, activeIndex };
        arViewerContainer.dispatchEvent(event);
      }
  
    // クリーンアップ関数を返す (editor.js で呼ぶため)
    return () => {
        arViewerContainer.removeEventListener('modelListChanged', handleModelListChanged);
        arViewerContainer.removeEventListener('activeModelChanged', handleActiveModelChanged);
        arViewerContainer.removeEventListener('visibilityChanged', handleVisibilityChanged);
        // この関数内で追加した他のリスナーがあれば削除
        console.log("ModelListUI cleaned up.");
    };
  }
  
  // --- コントロールパネルUI ---
  export function initControlsPanelUI(uiContainerElement, modelControls) {
    if (!uiContainerElement) {
        console.error("ControlsPanelUI: UI container element not provided.");
        return;
    }
    const arViewerContainer = modelControls.getContainer();
    if (!arViewerContainer) {
        console.error("ControlsPanelUI: AR Viewer container not found.");
        return;
    }
  
    // DOM要素取得 (editor.jsで生成されている前提)
    const modelNameElement = uiContainerElement.querySelector('#current-model-name');
    const scaleSlider = uiContainerElement.querySelector('#scale-slider');
    const scaleValue = uiContainerElement.querySelector('#scale-value');
    const rotationSlider = uiContainerElement.querySelector('#rotation-slider');
    const rotationValue = uiContainerElement.querySelector('#rotation-value');
    const positionXSlider = uiContainerElement.querySelector('#position-x');
    const positionYSlider = uiContainerElement.querySelector('#position-y');
    const positionZSlider = uiContainerElement.querySelector('#position-z');
    const positionXValue = uiContainerElement.querySelector('#position-x-value');
    const positionYValue = uiContainerElement.querySelector('#position-y-value');
    const positionZValue = uiContainerElement.querySelector('#position-z-value');
    // 必要なら他のコントロール要素も取得 (例: resetPositionButton)
  
    // イベントリスナー
    const handleActiveModelChanged = (e) => {
      updateModelInfo(e.detail.index);
      updateControlsValues(); // スライダー等の値も更新
    };
    arViewerContainer.addEventListener('activeModelChanged', handleActiveModelChanged);
  
    // モデル情報更新関数
    function updateModelInfo(activeIndex) {
      if (!modelNameElement) return;
      const activeModel = modelControls.getActiveModelInfo();
      if (activeModel) {
        modelNameElement.textContent = activeModel.fileName || 'モデル ' + (activeIndex + 1);
      } else {
        modelNameElement.textContent = '選択されていません';
      }
    }
  
    // コントロールの値更新関数
    function updateControlsValues() {
        const modelInfo = modelControls.getActiveModelInfo();
        if (modelInfo) {
            if(scaleSlider) scaleSlider.value = modelInfo.scale.x;
            if(scaleValue) scaleValue.textContent = modelInfo.scale.x.toFixed(2);
  
            const rotationYDeg = modelInfo.rotation.y; // arViewerが度で返す前提
            if(rotationSlider) rotationSlider.value = Math.round(rotationYDeg + 360) % 360;
            if(rotationValue) rotationValue.textContent = `${Math.round(rotationYDeg)}°`;
  
            if(positionXSlider) positionXSlider.value = modelInfo.position.x;
            if(positionYSlider) positionYSlider.value = modelInfo.position.y;
            if(positionZSlider) positionZSlider.value = modelInfo.position.z;
            if(positionXValue) positionXValue.textContent = modelInfo.position.x.toFixed(2);
            if(positionYValue) positionYValue.textContent = modelInfo.position.y.toFixed(2);
            if(positionZValue) positionZValue.textContent = modelInfo.position.z.toFixed(2);
        } else {
            // アクティブモデルがない場合、コントロールをデフォルト値にリセット（オプション）
            if(scaleSlider) scaleSlider.value = 1;
            if(scaleValue) scaleValue.textContent = '1.00';
            if(rotationSlider) rotationSlider.value = 0;
            if(rotationValue) rotationValue.textContent = '0°';
            if(positionXSlider) positionXSlider.value = 0;
            if(positionYSlider) positionYSlider.value = 0;
            if(positionZSlider) positionZSlider.value = 0;
            if(positionXValue) positionXValue.textContent = '0.00';
            if(positionYValue) positionYValue.textContent = '0.00';
            if(positionZValue) positionZValue.textContent = '0.00';
        }
    }
  
    // イベントリスナー設定 (コントロール操作)
    if(scaleSlider) scaleSlider.addEventListener('input', () => {
      const value = parseFloat(scaleSlider.value);
      if(scaleValue) scaleValue.textContent = value.toFixed(2);
      modelControls.setScale(value);
    });
    if(rotationSlider) rotationSlider.addEventListener('input', () => {
      const value = parseInt(rotationSlider.value, 10);
      if(rotationValue) rotationValue.textContent = `${value}°`;
      modelControls.setRotationY(value);
    });
  
    const handlePositionInput = () => { // inputイベントハンドラを共通化
      const x = positionXSlider ? parseFloat(positionXSlider.value) : 0;
      const y = positionYSlider ? parseFloat(positionYSlider.value) : 0;
      const z = positionZSlider ? parseFloat(positionZSlider.value) : 0;
      modelControls.setPosition(x, y, z);
      if(positionXValue) positionXValue.textContent = x.toFixed(2);
      if(positionYValue) positionYValue.textContent = y.toFixed(2);
      if(positionZValue) positionZValue.textContent = z.toFixed(2);
    };
    if (positionXSlider) positionXSlider.addEventListener('input', handlePositionInput);
    if (positionYSlider) positionYSlider.addEventListener('input', handlePositionInput);
    if (positionZSlider) positionZSlider.addEventListener('input', handlePositionInput);
    // リセットボタンのリスナーなどもここに追加
  
    // 初期表示
    const activeIndex = modelControls.getActiveModelIndex();
    updateModelInfo(activeIndex);
    updateControlsValues();
  
    // クリーンアップ関数を返す
    return () => {
        arViewerContainer.removeEventListener('activeModelChanged', handleActiveModelChanged);
        // この関数内で追加したDOM要素のリスナーも削除 (input イベントなど)
        if (scaleSlider) scaleSlider.removeEventListener('input', null); // ハンドラを保持して指定する必要あり
        if (rotationSlider) rotationSlider.removeEventListener('input', null);
        if (positionXSlider) positionXSlider.removeEventListener('input', handlePositionInput);
        if (positionYSlider) positionYSlider.removeEventListener('input', handlePositionInput);
        if (positionZSlider) positionZSlider.removeEventListener('input', handlePositionInput);
        console.log("ControlsPanelUI cleaned up.");
    };
  }
  
  // --- ファイルアップロードUI ---
  export function initFileUploadUI(uiContainerElement, modelControls) {
    if (!uiContainerElement) {
      console.error("FileUploadUI: UI container element not provided.");
      return;
    }
  
    // DOM要素取得 (editor.jsで生成されている前提)
    const uploadArea = uiContainerElement.querySelector('#model-upload-area');
    const fileInput = uiContainerElement.querySelector('#model-file-input');
    const uploadButton = uiContainerElement.querySelector('#upload-model');
    const uploadStatus = uiContainerElement.querySelector('.upload-status'); // editor.jsのHTMLに追加済み
  
    if (!uploadArea || !fileInput || !uploadButton) {
        console.error("FileUploadUI: Required elements (#model-upload-area, #model-file-input, #upload-model) not found.");
        return;
    }
  
    // イベントリスナー設定
    const handleUploadButtonClick = () => fileInput.click();
    const handleFileInputChange = async (event) => {
      if (event.target.files.length > 0) {
        await handleFileUpload(event.target.files[0], modelControls, fileInput, uploadStatus, uploadButton);
      }
    };
    const preventDefaults = (e) => { e.preventDefault(); e.stopPropagation(); };
    const highlight = () => uploadArea.classList.add('highlight');
    const unhighlight = () => uploadArea.classList.remove('highlight');
    const handleDrop = async (e) => {
      unhighlight(); // ドロップ時にもハイライト解除
      const file = e.dataTransfer.files[0];
      await handleFileUpload(file, modelControls, fileInput, uploadStatus, uploadButton);
    };
  
    uploadButton.addEventListener('click', handleUploadButtonClick);
    fileInput.addEventListener('change', handleFileInputChange);
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, preventDefaults, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
      uploadArea.addEventListener(eventName, highlight);
    });
    ['dragleave', 'drop'].forEach(eventName => { // dragleaveでもハイライト解除
      uploadArea.addEventListener(eventName, unhighlight);
    });
    uploadArea.addEventListener('drop', handleDrop);
  
    // クリーンアップ関数を返す
    return () => {
        uploadButton.removeEventListener('click', handleUploadButtonClick);
        fileInput.removeEventListener('change', handleFileInputChange);
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.removeEventListener(eventName, preventDefaults, false);
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.removeEventListener(eventName, highlight);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.removeEventListener(eventName, unhighlight);
        });
        uploadArea.removeEventListener('drop', handleDrop);
        console.log("FileUploadUI cleaned up.");
    };
  }
  
  // ファイルアップロード処理の共通ヘルパー関数
  async function handleFileUpload(file, modelControls, fileInput, uploadStatus, uploadButton) {
    if (!file) return;
  
    if (!file.name.endsWith('.glb')) {
      if(uploadStatus) {
        uploadStatus.textContent = 'GLBファイルを選択してください。';
        uploadStatus.style.color = 'red';
        setTimeout(() => { if(uploadStatus) uploadStatus.textContent = ''; }, 3000);
      }
      return;
    }
  
    if(uploadStatus) {
      uploadStatus.textContent = '処理中...';
      uploadStatus.style.color = 'inherit';
    }
    if(uploadButton) uploadButton.disabled = true;
    if(fileInput) fileInput.disabled = true;
  
    try {
      // objectURLを生成
      const objectUrl = URL.createObjectURL(file);
      const index = await modelControls.loadNewModel(objectUrl, file.name, file.size);
      
      // モデルリスト変更イベントを手動で発火
      const viewerContainer = modelControls.getContainer();
      if (viewerContainer) {
        console.log('Manually triggering modelListChanged after upload');
        const models = modelControls.getAllModels();
// ★ CustomEvent を使って detail を正しく渡すように修正
const event = new CustomEvent('modelListChanged', {
    detail: {
      models: models,         // modelControls.getAllModels() で取得したモデルリスト
      activeModelIndex: index // loadNewModel から返された新しいモデルのインデックス
    },
    bubbles: true, // イベントがDOMを遡るようにする (オプションだが推奨)
    composed: true // Shadow DOM の境界を越えるようにする (オプションだが推奨)
  });
  viewerContainer.dispatchEvent(event);
      }
      
      if(uploadStatus) {
        uploadStatus.textContent = `${file.name} を追加`;
        setTimeout(() => { if(uploadStatus) uploadStatus.textContent = ''; }, 3000);
      }
    } catch (error) {
      console.error('モデル読み込み/追加エラー:', error);
      if(uploadStatus) {
        uploadStatus.textContent = '読込エラー';
        uploadStatus.style.color = 'red';
        setTimeout(() => { if(uploadStatus) uploadStatus.textContent = ''; }, 3000);
      }
    } finally {
      if(uploadButton) uploadButton.disabled = false;
      if(fileInput) {
        fileInput.disabled = false;
        fileInput.value = ''; // 選択解除
      }
    }
  }