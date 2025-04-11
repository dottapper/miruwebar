// src/views/editor.js
import { initARViewer } from '../components/arViewer.js';
import { showMarkerUpload } from '../views/marker-upload.js'; // 依存関係を確認
import { showSaveProjectModal, showQRCodeModal } from '../components/ui.js'; // 保存モーダルとQRコードモーダルをインポート
import { saveProject, getProject } from '../api/projects.js'; // プロジェクト保存APIをインポート

export function showEditor(container) {
  // URLパラメータからARタイプを取得
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const arType = urlParams.get('type') || 'unknown';
  const isMarkerMode = arType === 'marker';

  // ARタイプに応じたタイトルとヘルプテキストを設定
  let title = 'AR エディター';
  let helpText = 'ARモデルをカスタマイズできます。';

  switch (arType) {
    case 'marker':
      title = 'マーカー型AR エディター';
      helpText = 'マーカー画像の上に表示される3Dモデルを設定します。';
      break;
    case 'markerless':
      title = 'マーカーレスAR エディター';
      helpText = '平面に配置する3Dモデルを設定します。';
      break;
    case 'location':
      title = 'ロケーションベースAR エディター';
      helpText = 'GPS座標に配置する3Dモデルを設定します。';
      break;
    case 'object':
      title = '物体認識型AR エディター';
      helpText = '物体に合わせて表示される3Dモデルを設定します。';
      break;
    case 'face':
      title = 'フェイスタイプAR エディター';
      helpText = '顔に重ねて表示するARエフェクトを設定します。';
      break;
    // 必要に応じて他のARタイプも追加
  }

  // HTML構造を生成
  container.innerHTML = `
    <div class="editor-container">
      <div class="editor-header">
        <div class="header-left">
          <button id="back-to-projects" class="btn-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            戻る
          </button>
          <h1>${title}</h1>
        </div>
        <div class="toolbar">
          <button id="preview-button" class="btn-secondary">プレビュー</button>
          <button id="qrcode-button" class="btn-secondary">QRコードを発行</button>
          <button id="save-button" class="btn-primary">保存</button>
          <button id="share-button" class="btn-secondary">共有</button>
        </div>
      </div>

      <div class="editor-info">
        <p>${helpText}</p>
      </div>
      <div class="editor-content">
        <div class="editor-grid-layout">
          <div class="upload-panel">
            <div class="panel-section">
              <h3>3Dモデル</h3>
              <div class="upload-area" id="model-upload-area">
                <div class="upload-placeholder">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <p>3Dモデル(.glb)をアップロード</p>
                  <button id="upload-model" class="btn-secondary">
                    ファイルを選択
                  </button>
                </div>
                <input type="file" id="model-file-input" accept=".glb" style="display:none;">
              </div>
            </div>

            <div class="panel-section">
              <h3>ファイル一覧</h3>
              <div class="file-list">
                <p class="empty-text">まだファイルがありません</p>
                </div>
              <p id="total-file-size">現在使用中：0MB / 50MB</p>
            </div>

            ${isMarkerMode ? `
            <div class="panel-section">
              <h3>マーカー画像（サムネイル）</h3>
              <div class="marker-thumbnail-container">
                <img id="marker-thumbnail" alt="マーカー画像" src="/assets/sample-marker.jpg"> <button id="change-marker" class="btn-secondary">画像を変更</button>
              </div>
            </div>` : ''}
          </div>

          <div class="viewer-panel" style="height: calc(100vh - 250px);">
            <div id="ar-viewer"></div>
          </div>

          <div class="controls-panel">
            <div class="panel-section">
              <h3>モデル調整</h3>
              <div class="control-group">
                <label>操作モード:</label>
                <div class="transform-mode-controls">
                  <div class="transform-mode-buttons">
                    <button class="transform-mode-btn active" data-mode="translate" title="移動">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                      <span class="transform-mode-btn-label">移動</span>
                    </button>
                    <button class="transform-mode-btn" data-mode="rotate" title="回転">
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8V3"></path><path d="M21 3v5h-5"></path></svg>
                      <span class="transform-mode-btn-label">回転</span>
                    </button>
                    <button class="transform-mode-btn" data-mode="scale" title="拡縮">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line></svg>
                      <span class="transform-mode-btn-label">拡縮</span>
                    </button>
                  </div>
                </div>
              </div>
              <div class="view-controls">
                <button id="reset-front-view-button" class="btn-secondary" title="正面ビューに戻す">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  正面ビューに戻す
                </button>
              </div>
              <div class="control-group">
                <label for="scale-slider">スケール:</label>
                <div class="slider-with-value">
                  <input type="range" id="scale-slider" min="0.1" max="2" step="0.1" value="1">
                  <span id="scale-value">1.0</span>
                </div>
                <div class="size-display"><span id="scale-size-label"></span></div>
              </div>
              <div class="scale-ratio-display">
                スケール値(XYZ):
                <span id="scale-x-value">1.00</span> |
                <span id="scale-y-value">1.00</span> |
                <span id="scale-z-value">1.00</span>
              </div>
              <button id="reset-scale-button">比率をリセット</button>
              <div class="control-group">
                <label for="rotation-slider">回転 (Y軸):</label>
                <div class="slider-with-value">
                  <input type="range" id="rotation-slider" min="0" max="360" step="1" value="0">
                  <span id="rotation-value">0°</span>
                </div>
              </div>
              <div class="control-group">
                <label>位置:</label>
                <div class="position-controls">
                  <div class="position-control"><span>X:</span><input type="range" id="position-x" min="-2" max="2" step="0.1" value="0"><span id="position-x-value">0.0</span></div>
                  <div class="position-control"><span>Y:</span><input type="range" id="position-y" min="-2" max="2" step="0.1" value="0"><span id="position-y-value">0.0</span></div>
                  <div class="position-control"><span>Z:</span><input type="range" id="position-z" min="-2" max="2" step="0.1" value="0"><span id="position-z-value">0.0</span></div>
                </div>
              </div>
            </div>
            <div class="panel-section">
              <h3>AR設定</h3>
              <div class="control-group">
                <label for="ar-scale">ARスケール倍率:</label>
                <div class="slider-with-value">
                  <input type="range" id="ar-scale" min="0.5" max="3" step="0.1" value="1">
                  <span id="ar-scale-value">1.0</span>
                </div>
              </div>
              ${isMarkerMode ? `
              <div class="control-group">
                <label for="marker-detection">マーカー検出:</label>
                <select id="marker-detection" class="form-select">
                  <option value="fast">高速（精度低）</option>
                  <option value="normal" selected>標準</option>
                  <option value="accurate">高精度（速度低）</option>
                </select>
              </div>` : ''}
            </div>
          </div></div></div></div>`;

  // --- DOM要素取得 (HTML生成後に行う) ---
  const modelFileInput = document.getElementById('model-file-input');
  const uploadButton = document.getElementById('upload-model');
  const uploadArea = document.getElementById('model-upload-area');
  const fileListContainer = document.querySelector('.file-list'); // ファイル一覧表示エリア
  const totalFileSizeElement = document.getElementById('total-file-size');
  const markerThumbnail = document.getElementById('marker-thumbnail'); // マーカーモード時のみ存在
  const changeMarkerButton = document.getElementById('change-marker'); // マーカーモード時のみ存在
  const backButton = document.getElementById('back-to-projects');
  const saveButton = document.getElementById('save-button');
  const shareButton = document.getElementById('share-button');
  const previewButton = document.getElementById('preview-button');
  const qrcodeButton = document.getElementById('qrcode-button');
  const scaleSlider = document.getElementById('scale-slider');
  const scaleValue = document.getElementById('scale-value');
  const scaleSizeLabel = document.getElementById('scale-size-label');
  const resetScaleButton = document.getElementById('reset-scale-button');
  const rotationSlider = document.getElementById('rotation-slider');
  const rotationValue = document.getElementById('rotation-value');
  const positionXSlider = document.getElementById('position-x');
  const positionYSlider = document.getElementById('position-y');
  const positionZSlider = document.getElementById('position-z');
  const positionXValue = document.getElementById('position-x-value');
  const positionYValue = document.getElementById('position-y-value');
  const positionZValue = document.getElementById('position-z-value');
  const arScaleSlider = document.getElementById('ar-scale');
  const arScaleValue = document.getElementById('ar-scale-value');
  const translateButton = document.querySelector('button[data-mode="translate"]');
  const rotateButton = document.querySelector('button[data-mode="rotate"]');
  const scaleButton = document.querySelector('button[data-mode="scale"]');
  const arViewerContainer = document.getElementById('ar-viewer'); // ARビューアのコンテナ

  // --- 状態管理変数 ---
  let totalFileSize = 0;
  const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB
  let originalModelSize = { width: 0, height: 0, depth: 0 }; // モデルの元サイズ

  // --- ARビューアー初期化 ---
  const viewerInstance = initARViewer('ar-viewer', {
    markerMode: isMarkerMode,
    showGrid: true,
    onModelLoaded: (size) => {
      originalModelSize = { width: size.x, height: size.y, depth: size.z };
      // モデルロード時に現在のスライダー値でサイズ表示を更新
      const currentScale = scaleSlider ? parseFloat(scaleSlider.value) : 1.0;
      updateRealSizeDisplay(currentScale);
    }
  });

  // --- 関数定義 ---

  // 合計ファイルサイズ表示更新
  function updateTotalFileSizeDisplay() {
    const totalFileSizeMB = (totalFileSize / (1024 * 1024)).toFixed(2);
    if (totalFileSizeElement) {
      totalFileSizeElement.textContent = `現在使用中：${totalFileSizeMB}MB / 50MB`;
    }
  }

  // アップロードエリアをリセットする関数
  function resetUploadArea() {
    if (uploadArea) {
      uploadArea.innerHTML = `
        <div class="upload-placeholder">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <p>3Dモデル(.glb)をアップロード</p>
          <button id="upload-model" class="btn-secondary">
            ファイルを選択
          </button>
        </div>
      `;
      // リセット後、再度ファイル選択ボタンにリスナーを設定する必要がある
      const newUploadButton = document.getElementById('upload-model');
      if (newUploadButton && modelFileInput) {
        newUploadButton.addEventListener('click', () => {
          modelFileInput.click();
        });
      }
    }
  }

  // ファイル一覧アイテムを作成し、イベントリスナーを設定する関数
  function createFileListItem(file, objectUrl, modelIndex) {
    const fileItem = document.createElement('div');
    fileItem.classList.add('file-item');
    // data属性に情報を格納
    fileItem.dataset.fileName = file.name;
    fileItem.dataset.fileSize = file.size;
    fileItem.dataset.objectUrl = objectUrl; // 必要であれば
    fileItem.dataset.modelIndex = modelIndex; // ★ モデルのインデックスを保存

    fileItem.innerHTML = `
      <div class="file-item-info">
        <span>${file.name}</span>
        <span>(${(file.size / (1024 * 1024)).toFixed(2)}MB)</span>
      </div>
      <div class="file-item-actions">
        <button class="btn-icon model-delete-btn" title="削除">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
    `;

    // --- ファイルアイテムクリック時の処理 (モデル選択) ---
    const fileInfoDiv = fileItem.querySelector('.file-item-info');
    if (fileInfoDiv) {
      fileInfoDiv.addEventListener('click', () => {
        // 他のアイテムのアクティブ状態を解除
        fileListContainer?.querySelectorAll('.file-item.active').forEach(activeItem => {
          activeItem.classList.remove('active');
        });
        // クリックされたアイテムをアクティブに
        fileItem.classList.add('active');

        // 対応するモデルをビューアでアクティブにする
        if (viewerInstance?.controls?.switchToModel) {
           const indexToSwitch = parseInt(fileItem.dataset.modelIndex, 10);
           if (!isNaN(indexToSwitch)) {
               viewerInstance.controls.switchToModel(indexToSwitch);
               console.log(`モデル ${indexToSwitch} に切り替えました。`);
               // TransformControls を表示状態にする（オプション）
               if (viewerInstance.controls.toggleTransformControls) {
                   viewerInstance.controls.toggleTransformControls(true);
               }
           } else {
               console.error("switchToModel に無効なインデックスが渡されました:", fileItem.dataset.modelIndex);
           }
        } else {
             console.error("viewerInstance または switchToModel が見つかりません。");
        }
      });
    }

    // --- 削除ボタンのイベントリスナー設定 ---
    const deleteButton = fileItem.querySelector('.model-delete-btn');
    if (deleteButton) {
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation(); // 親要素へのクリックイベント伝播を防ぐ

        const fileName = fileItem.dataset.fileName || 'このファイル';
        const fileSize = parseInt(fileItem.dataset.fileSize || '0', 10);

        if (confirm(`「${fileName}」を削除してもよろしいですか？`)) {

          // 1. ファイルサイズを減算
          if (!isNaN(fileSize) && fileSize > 0) {
            totalFileSize -= fileSize;
            updateTotalFileSizeDisplay(); // 表示を更新
          } else {
            console.warn('ファイルサイズが取得できなかったか0のため、合計サイズは更新されません。fileSize:', fileItem.dataset.fileSize);
          }

          // 2. ビューアからモデルを削除
          try {
            const modelIndexString = fileItem.dataset.modelIndex;
            if (modelIndexString !== undefined) {
              const modelIndex = parseInt(modelIndexString, 10);
              if (!isNaN(modelIndex) && viewerInstance?.controls?.removeModel) {
                console.log(`削除対象モデルのインデックス: ${modelIndex}`);
                viewerInstance.controls.removeModel(modelIndex);
                console.log(`モデル(インデックス: ${modelIndex})をビューアから削除しました`);
                // TransformControls も非表示に
                if (viewerInstance.controls.toggleTransformControls) {
                  viewerInstance.controls.toggleTransformControls(false);
                }
              } else {
                console.warn('モデルインデックスが無効か、removeModel関数が見つかりません。', modelIndexString, viewerInstance);
              }
            } else {
               console.warn('fileItemにdata-model-index属性が見つかりません。');
            }
          } catch (error) {
            console.error("モデル削除処理中にエラーが発生しました:", error);
          }

          // 3. ファイル一覧から項目を削除
          if (fileListContainer && fileItem.parentNode === fileListContainer) {
             fileListContainer.removeChild(fileItem);
             console.log(`ファイルアイテム「${fileName}」をリストから削除しました。`);
             // Object URL を解放 (もしあれば)
             if (fileItem.dataset.objectUrl && fileItem.dataset.objectUrl.startsWith('blob:')) {
                 URL.revokeObjectURL(fileItem.dataset.objectUrl);
                 console.log(`Object URL を解放: ${fileItem.dataset.objectUrl}`);
             }

          } else {
             console.warn("ファイルリストからアイテムを削除できませんでした。", fileListContainer, fileItem);
          }

          // 4. ファイル一覧が空になった場合の処理
          if (fileListContainer && fileListContainer.children.length === 0) {
            fileListContainer.innerHTML = '<p class="empty-text">モデルがありません</p>';
            console.log("ファイルリストが空になりました。");
            // ビューア内のメッセージ等もクリア
            const viewerPanel = document.querySelector('.viewer-panel');
            const emptyMsg = viewerPanel?.querySelector('.empty-scene-message');
            const uploadBtn = viewerPanel?.querySelector('.empty-scene-upload');
            if(emptyMsg && viewerPanel?.contains(emptyMsg)) viewerPanel.removeChild(emptyMsg);
            if(uploadBtn && viewerPanel?.contains(uploadBtn)) viewerPanel.removeChild(uploadBtn);
          }
        } // confirm の if文の終わり
      }); // deleteButton の addEventListener の終わり
    } // if (deleteButton) の終わり

    return fileItem;
  } // createFileListItem 関数の終わり

  // 実寸サイズ表示更新
  function updateRealSizeDisplay(scale) {
    if (scaleSizeLabel && originalModelSize.width > 0) {
      const width = (originalModelSize.width * scale * 100).toFixed(1);
      const height = (originalModelSize.height * scale * 100).toFixed(1);
      const depth = (originalModelSize.depth * scale * 100).toFixed(1);
      scaleSizeLabel.textContent = `（約${width}cm × ${height}cm × ${depth}cm）`;
    } else if (scaleSizeLabel) {
      scaleSizeLabel.textContent = ''; // サイズ不明時はクリア
    }
  }

  // 位置スライダー更新時の処理
  function updatePosition() {
    // スライダー要素やviewerInstanceの存在チェック
    if (!positionXSlider || !positionYSlider || !positionZSlider || !viewerInstance?.controls?.setPosition) {
         console.warn("位置調整に必要な要素または関数が見つかりません。");
         return;
    }

    const x = parseFloat(positionXSlider.value);
    const y = parseFloat(positionYSlider.value);
    const z = parseFloat(positionZSlider.value);

    viewerInstance.controls.setPosition(x, y, z);

    if (positionXValue) positionXValue.textContent = x.toFixed(1);
    if (positionYValue) positionYValue.textContent = y.toFixed(1);
    if (positionZValue) positionZValue.textContent = z.toFixed(1);
  }

  // TransformControls モード設定ボタンのセットアップ
  function setupTransformControls() {
    if (!translateButton || !rotateButton || !scaleButton || !viewerInstance?.controls?.setTransformMode) {
      console.error('TransformControls の設定に必要な要素または関数が見つかりません。');
      return;
    }

    const transformButtons = [translateButton, rotateButton, scaleButton];
    const setActiveButton = (activeButton) => {
      transformButtons.forEach(btn => btn.classList.remove('active'));
      if (activeButton) activeButton.classList.add('active');
    };

    transformButtons.forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.dataset.mode;
            if (mode && viewerInstance.controls.setTransformMode(mode)) {
                setActiveButton(button);
                console.log(`Transform mode set to: ${mode}`);
            }
        });
    });

    // 初期状態
    viewerInstance.controls.setTransformMode('translate');
    setActiveButton(translateButton);
  }

  // --- イベントリスナー設定 ---

  // マーカー画像設定 (マーカーモード時)
  if (isMarkerMode && markerThumbnail) {
    const markerImageUrl = localStorage.getItem('markerImageUrl');
    if (markerImageUrl) {
      markerThumbnail.src = markerImageUrl;
      // ビューアにも反映
      if (viewerInstance?.controls?.setMarkerTexture) {
         viewerInstance.controls.setMarkerTexture(markerImageUrl);
      }
    }
    // マーカー変更ボタンのリスナー設定
    if (changeMarkerButton) {
        changeMarkerButton.addEventListener('click', () => {
          showMarkerUpload(); // モーダル表示

          // マーカーがアップロードされたらサムネイルとビューアを更新するイベントリスナー
          // (showMarkerUpload側で 'markerUploaded' イベントを発火させる想定)
          window.addEventListener('markerUploaded', (event) => {
            if (event.detail && event.detail.markerImageUrl) {
                 const newMarkerUrl = event.detail.markerImageUrl;
                 if (markerThumbnail) {
                     markerThumbnail.src = newMarkerUrl;
                 }
                 if (viewerInstance?.controls?.setMarkerTexture) {
                     viewerInstance.controls.setMarkerTexture(newMarkerUrl);
                 }
                 // localStorageにも保存（オプション）
                 // localStorage.setItem('markerImageUrl', newMarkerUrl);
            }
          }, { once: true }); // 一度だけ実行
        });
    }
  }

  // GLBモデルアップロード (ファイル選択ボタン)
  if (uploadButton && modelFileInput) {
    uploadButton.addEventListener('click', () => {
      modelFileInput.click(); // input type="file" をクリックさせる
    });
  }

  // GLBモデルアップロード (ファイルが選択された時)
  if (modelFileInput && viewerInstance?.controls?.loadNewModel && fileListContainer) {
    modelFileInput.addEventListener('change', async (event) => { // asyncキーワードを追加
      if (event.target.files && event.target.files.length > 0) {
        const file = event.target.files[0];

        if (file.name.endsWith('.glb')) {
          // ファイルサイズチェック
          if (totalFileSize + file.size > MAX_TOTAL_SIZE) {
            alert('合計ファイルサイズが50MBを超えています。');
            modelFileInput.value = ''; // 選択をリセット
            return;
          }

          const objectUrl = URL.createObjectURL(file); // ファイルからURLを生成

          try {
             // ★★★ モデルを非同期でロードし、完了後にインデックスを取得 ★★★
             const modelIndex = await viewerInstance.controls.loadNewModel(objectUrl, file.name, file.size);
             console.log(`モデル "${file.name}" をインデックス ${modelIndex} でロードしました`);

             // ファイル一覧の既存の空テキストを削除 (あれば)
             const emptyText = fileListContainer.querySelector('.empty-text');
             if (emptyText) {
               emptyText.remove();
             }

             // ★★★ ファイル一覧アイテムを作成し、DOMに追加＆リスナー設定 ★★★
             const fileItem = createFileListItem(file, objectUrl, modelIndex);
             fileListContainer.appendChild(fileItem);

             // 合計ファイルサイズを更新して表示
             totalFileSize += file.size;
             updateTotalFileSizeDisplay();

             // アップロードエリアを初期状態に戻す
             resetUploadArea();

             // 他のアイテムのアクティブ状態を解除し、新しいアイテムをアクティブに
             fileListContainer.querySelectorAll('.file-item.active').forEach(activeItem => {
                 activeItem.classList.remove('active');
             });
             fileItem.classList.add('active'); // 新しく追加したものをアクティブに

             // ビューアのカメラを調整（オプション）
             // if (viewerInstance.controls.resetCamera) viewerInstance.controls.resetCamera();


          } catch (error) {
             // モデルロードやDOM操作中にエラーが発生した場合
             console.error("モデルのロードまたはファイルリストへの追加中にエラー:", error);
             alert(`モデル「${file.name}」の読み込みに失敗しました。`);
             URL.revokeObjectURL(objectUrl); // エラー時は生成したURLを解放
          } finally {
             // 処理後（成功・失敗問わず）inputの選択をリセット
             modelFileInput.value = '';
          }

        } else {
          // GLBファイル以外が選択された場合
          alert('GLB形式のファイルを選択してください。');
          modelFileInput.value = ''; // 選択をリセット
        }
      }
    }); // modelFileInput change listener の終わり
  } // if (modelFileInput...) の終わり


  // GLBモデルアップロード (ドラッグ＆ドロップ)
  if (uploadArea && modelFileInput) {
      // ドラッグイベントのデフォルト動作をキャンセル
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
        }, false);
      });
      // ドラッグ中に入ったらハイライト
      ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.add('highlight'));
      });
      // ドラッグが離れたらハイライト解除
      ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('highlight'));
      });
      // ドロップされた時の処理
      uploadArea.addEventListener('drop', (e) => {
        const file = e.dataTransfer?.files[0]; // ドロップされたファイルを取得
        if (file) {
          // ファイル選択時の処理を再利用
          try {
             // input要素にドロップされたファイルを設定
             const dataTransfer = new DataTransfer();
             dataTransfer.items.add(file);
             modelFileInput.files = dataTransfer.files;
             // changeイベントを手動で発火させる
             const changeEvent = new Event('change', { bubbles: true });
             modelFileInput.dispatchEvent(changeEvent);
          } catch (error) {
              console.error("ドラッグ&ドロップでのファイル処理中にエラー:", error);
              alert('ファイルの処理中にエラーが発生しました。');
          }
        } else {
            console.warn("ドロップされたファイルが見つかりません。");
        }
      });
  } // if (uploadArea...) の終わり


  // --- その他のイベントリスナー ---

  // ヘッダーのボタン
  if (backButton) {
    backButton.addEventListener('click', () => window.location.hash = '#/projects');
  }
  
  // QRコードボタン
  if (qrcodeButton) {
    qrcodeButton.addEventListener('click', () => {
      // 選択中のモデル名を取得
      let selectedModelName = 'sample';
      
      if (viewerInstance?.controls?.getActiveModelInfo) {
        const activeModel = viewerInstance.controls.getActiveModelInfo();
        if (activeModel) {
          selectedModelName = activeModel.fileName || 'model';
        }
      }
      
      // QRコードモーダルを表示
      showQRCodeModal({
        modelName: selectedModelName
      });
    });
  }
  
  if (saveButton) {
    saveButton.addEventListener('click', () => {
      // URLからプロジェクトIDを取得（編集モードかどうか判断するため）
      const projectId = urlParams.get('id');
      let currentProjectName = '';
      let currentProjectDesc = '';
      
      // 編集モードの場合、既存のプロジェクト情報を取得
      if (projectId) {
        const existingProject = getProject(projectId);
        if (existingProject) {
          currentProjectName = existingProject.name;
          currentProjectDesc = existingProject.description;
        }
      }
      
      // 保存モーダルを表示
      showSaveProjectModal({
        isEdit: !!projectId,
        projectId: projectId,
        currentName: currentProjectName,
        currentDescription: currentProjectDesc
      }, (projectData) => {
        try {
          // 現在のARタイプと設定を取得
          const arScale = arScaleSlider ? parseFloat(arScaleSlider.value) : 1.0;
          
          // マーカー画像情報（マーカーモードの場合のみ）
          const markerImage = isMarkerMode && markerThumbnail ? markerThumbnail.src : null;
          
          // 保存するデータを構築
          const saveData = {
            ...projectData,
            type: arType,
            arScale: arScale,
            markerImage: markerImage
          };
          
          // プロジェクトを保存
          const savedProject = saveProject(saveData, viewerInstance);
          
          // 保存成功通知を表示
          const notification = document.createElement('div');
          notification.className = 'notification success';
          notification.textContent = 'プロジェクトを保存しました';
          document.body.appendChild(notification);
          
          // 通知は自動的にアニメーションで消えるが、念のためタイマーでも削除
          setTimeout(() => {
            if (document.body.contains(notification)) {
              document.body.removeChild(notification);
            }
          }, 3000);
          
          // 保存後はプロジェクト一覧画面に遷移
          setTimeout(() => {
            window.location.hash = '#/projects';
          }, 1000);
          
        } catch (error) {
          console.error('プロジェクト保存エラー:', error);
          
          // エラー通知を表示
          const notification = document.createElement('div');
          notification.className = 'notification error';
          notification.textContent = 'プロジェクトの保存に失敗しました';
          document.body.appendChild(notification);
          
          setTimeout(() => {
            if (document.body.contains(notification)) {
              document.body.removeChild(notification);
            }
          }, 3000);
        }
      });
    });
  }
  if (shareButton) {
    shareButton.addEventListener('click', () => {
      // 選択中のモデル名を取得
      let selectedModelName = 'sample';
      
      if (viewerInstance?.controls?.getActiveModelInfo) {
        const activeModel = viewerInstance.controls.getActiveModelInfo();
        if (activeModel) {
          selectedModelName = activeModel.fileName || 'model';
        }
      }
      
      // QRコードモーダルを表示
      showQRCodeModal({
        modelName: selectedModelName
      });
    });
  }
  if (previewButton) {
    previewButton.addEventListener('click', () => {
        // プレビュー用のURLを生成して新しいタブで開くなどの処理
        alert('ARプレビュー機能（要実装）');
    });
  }

  // TransformControls (ビューア) からの変更イベントを購読
  if (arViewerContainer) {
    arViewerContainer.addEventListener('transformChanged', (e) => {
      if (!e.detail) return;
      const { position, rotation, scale } = e.detail; // ビューアから送られてくるデータ

      // スケール関連UI更新
      if (scaleSlider && scaleValue) {
        // スライダーには平均スケールなどを反映させるか、XYZ個別に持つか設計による
        const avgScale = (scale.x + scale.y + scale.z) / 3;
        scaleSlider.value = avgScale.toFixed(1);
        scaleValue.textContent = avgScale.toFixed(1);
        updateRealSizeDisplay(avgScale); // 実寸表示も更新
      }
      // XYZ個別表示の更新
      const scaleXVal = document.getElementById('scale-x-value');
      const scaleYVal = document.getElementById('scale-y-value');
      const scaleZVal = document.getElementById('scale-z-value');
      if(scaleXVal) scaleXVal.textContent = scale.x.toFixed(2);
      if(scaleYVal) scaleYVal.textContent = scale.y.toFixed(2);
      if(scaleZVal) scaleZVal.textContent = scale.z.toFixed(2);

      // 回転関連UI更新 (Y軸のみ)
      if (rotationSlider && rotationValue) {
        const yRotDeg = rotation.y; // arViewer.js が度(degree)で返す前提
        const normalizedRot = Math.round(yRotDeg + 360) % 360; // 0-359の範囲に正規化
        rotationSlider.value = normalizedRot;
        rotationValue.textContent = `${normalizedRot}°`;
      }

      // 位置関連UI更新
      if (positionXSlider && positionXValue) {
        positionXSlider.value = position.x.toFixed(1);
        positionXValue.textContent = position.x.toFixed(1);
      }
      if (positionYSlider && positionYValue) {
        positionYSlider.value = position.y.toFixed(1);
        positionYValue.textContent = position.y.toFixed(1);
      }
      if (positionZSlider && positionZValue) {
        positionZSlider.value = position.z.toFixed(1);
        positionZValue.textContent = position.z.toFixed(1);
      }
    });
  } // if (arViewerContainer) の終わり

  // --- モデル調整UIからのイベントリスナー ---

  // スケールスライダー
  if (scaleSlider) {
    scaleSlider.addEventListener('input', () => {
      if (!viewerInstance?.controls?.setScale) return;
      const value = parseFloat(scaleSlider.value);
      if (scaleValue) scaleValue.textContent = value.toFixed(1);
      viewerInstance.controls.setScale(value); // ビューアに変更を通知
      updateRealSizeDisplay(value); // 実寸表示も更新
    });
  }
  // スケールリセットボタン
  if (resetScaleButton) {
    resetScaleButton.addEventListener('click', () => {
      if (viewerInstance?.controls?.resetScaleRatio) {
        viewerInstance.controls.resetScaleRatio(); // ビューアにリセットを依頼
        console.log('スケール比率をリセットしました。');
        // transformChanged イベント経由でUIが更新されるはず
      }
    });
  }
  // 回転スライダー
  if (rotationSlider) {
    rotationSlider.addEventListener('input', () => {
      if (!viewerInstance?.controls?.setRotationY) return;
      const value = parseInt(rotationSlider.value, 10);
      if (rotationValue) rotationValue.textContent = `${value}°`;
      viewerInstance.controls.setRotationY(value); // ビューアに変更を通知
    });
  }
  // 位置スライダー (共通関数 updatePosition を使用)
  if (positionXSlider) positionXSlider.addEventListener('input', updatePosition);
  if (positionYSlider) positionYSlider.addEventListener('input', updatePosition);
  if (positionZSlider) positionZSlider.addEventListener('input', updatePosition);

  // AR設定スライダー
  if (arScaleSlider && arScaleValue) {
    arScaleSlider.addEventListener('input', () => {
      const value = parseFloat(arScaleSlider.value).toFixed(1);
      arScaleValue.textContent = value;
      localStorage.setItem('arScale', value); // プレビュー用にlocalStorageに保存
    });
    // 初期値をlocalStorageから読み込む（オプション）
    const savedArScale = localStorage.getItem('arScale');
    if (savedArScale) {
        arScaleSlider.value = savedArScale;
        arScaleValue.textContent = parseFloat(savedArScale).toFixed(1);
    }
  }

  // 正面ビューボタンのイベントリスナー
  if (document.getElementById('reset-front-view-button')) {
    document.getElementById('reset-front-view-button').addEventListener('click', () => {
      if (viewerInstance?.controls?.resetToFrontView) {
        viewerInstance.controls.resetToFrontView();
      }
    });
  }

  // --- 初期化処理 ---
  setupTransformControls(); // 操作モードボタンの初期設定
  updateTotalFileSizeDisplay(); // 初期ファイルサイズ表示 (0MBのはず)

  // --- クリーンアップ関数 ---
  // このビューが表示されなくなったときに呼ばれるべき関数を返す
  return () => {
    console.log("エディタービューのクリーンアップを実行します。");
    if (viewerInstance && viewerInstance.dispose) {
      viewerInstance.dispose(); // Three.js関連のリソースを解放
    }
    // ここで、この関数内で追加した他のイベントリスナーも解除することが望ましい
    // 例: window.removeEventListener('markerUploaded', ...);
    // 例: 各ボタンの removeEventListener など
    // (ただし、要素ごとDOMから削除されるなら不要な場合も多い)
  };

} // export function showEditor の終わり
