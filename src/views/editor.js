// src/views/editor.js
import { initARViewer } from '../components/arViewer.js';
import { showMarkerUpload } from '../views/marker-upload.js'; // 依存関係を確認
import { showSaveProjectModal, showQRCodeModal } from '../components/ui.js'; // 保存モーダルとQRコードモーダルをインポート
import { saveProject, getProject } from '../api/projects.js'; // プロジェクト保存APIをインポート

/**
 * ファイルサイズを適切な単位でフォーマットする
 * @param {number} bytes - バイト単位のファイルサイズ
 * @returns {string} フォーマットされたファイルサイズ文字列
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

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
  let modelFileInput = document.getElementById('model-file-input');
  let uploadButton = document.getElementById('upload-model');
  let uploadArea = document.getElementById('model-upload-area');
  let fileListContainer = document.querySelector('.file-list'); // ファイル一覧表示エリア
  let totalFileSizeElement = document.getElementById('total-file-size');
  let markerThumbnail = document.getElementById('marker-thumbnail'); // マーカーモード時のみ存在
  let changeMarkerButton = document.getElementById('change-marker'); // マーカーモード時のみ存在
  let backButton = document.getElementById('back-to-projects');
  let saveButton = document.getElementById('save-button');
  let shareButton = document.getElementById('share-button');
  let previewButton = document.getElementById('preview-button');
  let qrcodeButton = document.getElementById('qrcode-button');
  let scaleSlider = document.getElementById('scale-slider');
  let scaleValue = document.getElementById('scale-value');
  let scaleSizeLabel = document.getElementById('scale-size-label');
  let resetScaleButton = document.getElementById('reset-scale-button');
  let rotationSlider = document.getElementById('rotation-slider');
  let rotationValue = document.getElementById('rotation-value');
  let positionXSlider = document.getElementById('position-x');
  let positionYSlider = document.getElementById('position-y');
  let positionZSlider = document.getElementById('position-z');
  let positionXValue = document.getElementById('position-x-value');
  let positionYValue = document.getElementById('position-y-value');
  let positionZValue = document.getElementById('position-z-value');
  let arScaleSlider = document.getElementById('ar-scale');
  let arScaleValue = document.getElementById('ar-scale-value');
  let translateButton = document.querySelector('button[data-mode="translate"]');
  let rotateButton = document.querySelector('button[data-mode="rotate"]');
  let scaleButton = document.querySelector('button[data-mode="scale"]');
  let arViewerContainer = document.getElementById('ar-viewer'); // ARビューアのコンテナ

  // --- 状態管理変数 ---
  let totalFileSize = 0;
  const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB
  let originalModelSize = { width: 0, height: 0, depth: 0 }; // モデルの元サイズ

  // --- ARビューアー初期化 ---
  let viewerInstance = null;
  
  (async () => {
    try {
      viewerInstance = await initARViewer('ar-viewer', {
        markerMode: isMarkerMode,
        showGrid: true,
        onModelLoaded: (size) => {
          originalModelSize = { width: size.x, height: size.y, depth: size.z };
          // モデルロード時に現在のスライダー値でサイズ表示を更新
          const currentScale = scaleSlider ? parseFloat(scaleSlider.value) : 1.0;
          updateRealSizeDisplay(currentScale);
        }
      });
  
      // ビューアーの初期化が完了したら、イベントリスナーを設定
      setupEventListeners();
    } catch (error) {
      console.error('ARビューアーの初期化に失敗しました:', error);
      const errorMessage = document.createElement('div');
      errorMessage.className = 'error-message';
      errorMessage.textContent = 'ARビューアーの初期化に失敗しました。ページを再読み込みしてください。';
      if (arViewerContainer) {
        arViewerContainer.appendChild(errorMessage);
      }
    }
  })();

  // アップロードボタンのクリックハンドラ
  function handleUploadButtonClick() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.glb,.gltf';
    fileInput.style.display = 'none';
    
    fileInput.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        // ファイルサイズを取得（MB単位）
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        
        // モデルを読み込む
        const modelIndex = await viewerInstance.controls.loadNewModel(file, file.name, fileSizeMB);
        
        // ファイルリストに追加
        const objectUrl = URL.createObjectURL(file);
        const fileItem = createFileListItem(file, objectUrl, modelIndex);
        
        // 空のメッセージを削除
        const emptyText = fileListContainer.querySelector('.empty-text');
        if (emptyText) {
          emptyText.remove();
        }
        
        // ファイルリストに追加
        fileListContainer.appendChild(fileItem);
        
        // 合計ファイルサイズを更新
        totalFileSize += file.size;
        updateTotalFileSizeDisplay();
        
        console.log(`モデル "${file.name}" (${fileSizeMB}MB) を読み込みました`);
      } catch (error) {
        console.error('モデルのアップロードに失敗しました:', error);
        alert('モデルのアップロードに失敗しました: ' + error.message);
      }
    };
    
    fileInput.click();
  }

  // イベントリスナーのセットアップを関数にまとめる
  function setupEventListeners() {
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
            showMarkerUpload();
            window.addEventListener('markerUploaded', handleMarkerUploaded, { once: true });
          });
      }
    }

    // GLBモデルアップロード (ファイル選択ボタン)
    if (uploadButton && modelFileInput) {
      uploadButton.addEventListener('click', handleUploadButtonClick);
    }

    // GLBモデルアップロード (ドラッグ＆ドロップ)
    if (uploadArea) {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, handleDragEvent);
      });
      uploadArea.addEventListener('dragenter', handleDragEnter);
      uploadArea.addEventListener('dragleave', handleDragLeave);
      uploadArea.addEventListener('drop', handleDrop);
    }

    // スケール・回転・位置スライダー
    if (scaleSlider) scaleSlider.addEventListener('input', handleScaleChange);
    if (resetScaleButton) resetScaleButton.addEventListener('click', handleScaleReset);
    if (rotationSlider) rotationSlider.addEventListener('input', handleRotationChange);
    if (arScaleSlider) arScaleSlider.addEventListener('input', handleArScaleChange);
    if (positionXSlider) positionXSlider.addEventListener('input', updatePosition);
    if (positionYSlider) positionYSlider.addEventListener('input', updatePosition);
    if (positionZSlider) positionZSlider.addEventListener('input', updatePosition);

    // 変形モードボタン
    setupTransformControls();

    // 正面ビューリセットボタン
    const resetFrontViewButton = document.getElementById('reset-front-view-button');
    if (resetFrontViewButton) resetFrontViewButton.addEventListener('click', handleResetFrontView);

    // バックボタン
    if (backButton) {
      backButton.addEventListener('click', () => {
        window.location.hash = '#/projects';
      });
    }

    // QRコードボタン
    if (qrcodeButton) qrcodeButton.addEventListener('click', handleQRCodeButtonClick);

    // 保存ボタン
    if (saveButton) {
      // ... existing code for save button ...
    }
  }

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
        newUploadButton.addEventListener('click', handleUploadButtonClick);
      }
    }
  }

  // ファイル一覧アイテムを作成し、イベントリスナーを設定する関数
  function createFileListItem(file, objectUrl, modelIndex) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.modelIndex = modelIndex;

    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';
    fileInfo.innerHTML = `
      <span class="file-name">${file.name}</span>
      <span class="file-size">${formatFileSize(file.size)}</span>
    `;

    const fileActions = document.createElement('div');
    fileActions.className = 'file-actions';
    fileActions.innerHTML = `
      <button class="btn-icon delete-model" title="モデルを削除">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;

    fileItem.appendChild(fileInfo);
    fileItem.appendChild(fileActions);

    // 削除ボタンのイベントリスナー
    const deleteButton = fileActions.querySelector('.delete-model');
    deleteButton.addEventListener('click', async () => {
      try {
        // ユーザーに確認を求める
        if (!confirm('このモデルを削除してもよろしいですか？')) {
          return;
        }

        // モデルの削除
        await viewerInstance.removeModel(modelIndex);
        
        // ファイルサイズの更新
        totalFileSize -= file.size;
        updateTotalFileSizeDisplay();
        
        // ファイルリストから削除
        fileItem.remove();
        
        // オブジェクトURLの解放
        URL.revokeObjectURL(objectUrl);
        
        // ファイルリストが空になった場合の処理
        if (fileListContainer.children.length === 0) {
          fileListContainer.innerHTML = '<p class="empty-text">まだファイルがありません</p>';
          resetUploadArea();
        }
      } catch (error) {
        console.error('モデルの削除に失敗しました:', error);
        alert('モデルの削除に失敗しました。もう一度お試しください。');
      }
    });

    return fileItem;
  }

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

    // イベントハンドラー関数を保持する変数を定義
    const handleTranslateClick = () => {
      if (viewerInstance?.controls?.setTransformMode('translate')) {
        setActiveButton(translateButton);
        console.log('Transform mode set to: translate');
      }
    };

    const handleRotateClick = () => {
      if (viewerInstance?.controls?.setTransformMode('rotate')) {
        setActiveButton(rotateButton);
        console.log('Transform mode set to: rotate');
      }
    };

    const handleScaleClick = () => {
      if (viewerInstance?.controls?.setTransformMode('scale')) {
        setActiveButton(scaleButton);
        console.log('Transform mode set to: scale');
      }
    };

    // イベントリスナーを設定
    translateButton.addEventListener('click', handleTranslateClick);
    rotateButton.addEventListener('click', handleRotateClick);
    scaleButton.addEventListener('click', handleScaleClick);

    // クリーンアップ用に関数を保存
    translateButton._cleanup = handleTranslateClick;
    rotateButton._cleanup = handleRotateClick;
    scaleButton._cleanup = handleScaleClick;

    // 初期状態
    viewerInstance.controls.setTransformMode('translate');
    setActiveButton(translateButton);
  }

  // モデルファイル変更ハンドラ
  const handleModelFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // ファイルサイズチェック (50MB制限)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      alert('ファイルサイズが大きすぎます。50MB以下のファイルを選択してください。');
      resetUploadArea();
      return;
    }

    // ファイル形式チェック
    if (!file.name.toLowerCase().endsWith('.glb')) {
      alert('GLB形式のファイルのみアップロード可能です。');
      resetUploadArea();
      return;
    }

    try {
      // ローディング表示
      uploadArea.classList.add('loading');
      
      // ファイルをARビューワーに読み込む
      const modelIndex = await viewerInstance.controls.loadNewModel(URL.createObjectURL(file), file.name, file.size);
      
      if (modelIndex !== undefined) {
        // ファイルリストに追加
        const objectUrl = URL.createObjectURL(file);
        const fileItem = createFileListItem(file, objectUrl, modelIndex);
        fileListContainer.appendChild(fileItem);
        
        // 合計ファイルサイズ表示を更新
        totalFileSize += file.size;
        updateTotalFileSizeDisplay();
        
        // アップロードエリアをリセット
        resetUploadArea();
        
        // 新しいファイルをアクティブに
        fileListContainer.querySelectorAll('.file-item.active').forEach(activeItem => {
          activeItem.classList.remove('active');
        });
        fileItem.classList.add('active');
      }
    } catch (error) {
      console.error('モデル読み込みエラー:', error);
      alert('モデルの読み込み中にエラーが発生しました。');
      resetUploadArea();
    } finally {
      // ローディング表示を解除
      uploadArea.classList.remove('loading');
      // 入力をリセット
      event.target.value = '';
    }
  };

  const handleDragEvent = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = () => uploadArea.classList.add('highlight');
  const handleDragLeave = () => uploadArea.classList.remove('highlight');

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const dropArea = event.currentTarget;
    dropArea.classList.remove('dragover');
    
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.name.endsWith('.glb')) {
        // ファイルサイズチェック
        if (totalFileSize + file.size > MAX_TOTAL_SIZE) {
          alert(`合計ファイルサイズが50MBを超えています。\n現在の使用量: ${(totalFileSize / (1024 * 1024)).toFixed(2)}MB\n追加しようとしたファイル: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
          return;
        }

        const objectUrl = URL.createObjectURL(file);
        let modelIndex = null;

        try {
          // ドロップ時のローディングインジケータを表示
          const loadingIndicator = document.createElement('div');
          loadingIndicator.className = 'loading-indicator';
          loadingIndicator.textContent = 'モデルを読み込んでいます...';
          fileListContainer.appendChild(loadingIndicator);

          modelIndex = await viewerInstance.controls.loadNewModel(objectUrl, file.name, file.size);
          console.log(`モデル "${file.name}" をインデックス ${modelIndex} でロードしました`);

          const emptyText = fileListContainer.querySelector('.empty-text');
          if (emptyText) {
            emptyText.remove();
          }

          const fileItem = createFileListItem(file, objectUrl, modelIndex);
          fileListContainer.appendChild(fileItem);

          totalFileSize += file.size;
          updateTotalFileSizeDisplay();

          resetUploadArea();

          fileListContainer.querySelectorAll('.file-item.active').forEach(activeItem => {
            activeItem.classList.remove('active');
          });
          fileItem.classList.add('active');

        } catch (error) {
          console.error("モデルのロードまたはファイルリストへの追加中にエラー:", error);
          
          // エラーの種類に応じて異なるメッセージを表示
          let errorMessage = 'モデルの読み込みに失敗しました。';
          if (error.message.includes('format')) {
            errorMessage = 'ファイル形式が正しくないか、破損している可能性があります。';
          } else if (error.message.includes('memory')) {
            errorMessage = 'メモリ不足のため、モデルを読み込めませんでした。';
          }
          
          alert(`モデル「${file.name}」の読み込みに失敗しました。\n${errorMessage}\n詳細: ${error.message}`);
          
          // エラーが発生した場合のクリーンアップ
          if (modelIndex !== null && viewerInstance?.controls?.removeModel) {
            try {
              viewerInstance.controls.removeModel(modelIndex);
            } catch (cleanupError) {
              console.error("モデル削除中のエラー:", cleanupError);
            }
          }
          URL.revokeObjectURL(objectUrl);
        } finally {
          // ローディングインジケータを削除
          const loadingIndicator = fileListContainer.querySelector('.loading-indicator');
          if (loadingIndicator) {
            loadingIndicator.remove();
          }
        }
      } else {
        alert('GLB形式のファイルをドロップしてください。\n現在のファイル形式: ' + file.name.split('.').pop());
      }
    }
  };

  const handleScaleChange = () => {
    if (!viewerInstance?.controls?.setScale) return;
    const value = parseFloat(scaleSlider.value);
    if (scaleValue) scaleValue.textContent = value.toFixed(1);
    viewerInstance.controls.setScale(value);
    updateRealSizeDisplay(value);
  };

  const handleScaleReset = () => {
    if (viewerInstance?.controls?.resetScaleRatio) {
      viewerInstance.controls.resetScaleRatio();
      console.log('スケール比率をリセットしました。');
    }
  };

  const handleRotationChange = () => {
    if (!viewerInstance?.controls?.setRotationY) return;
    const value = parseInt(rotationSlider.value, 10);
    if (rotationValue) rotationValue.textContent = `${value}°`;
    viewerInstance.controls.setRotationY(value);
  };

  const handleArScaleChange = () => {
    const value = parseFloat(arScaleSlider.value).toFixed(1);
    if (arScaleValue) arScaleValue.textContent = value;
    localStorage.setItem('arScale', value);
  };

  const handleResetFrontView = () => {
    if (viewerInstance?.controls?.resetToFrontView) {
      viewerInstance.controls.resetToFrontView();
    }
  };

  const handleMarkerUploaded = (event) => {
    if (event.detail && event.detail.markerImageUrl) {
      const newMarkerUrl = event.detail.markerImageUrl;
      if (markerThumbnail) {
        markerThumbnail.src = newMarkerUrl;
      }
      if (viewerInstance?.controls?.setMarkerTexture) {
        viewerInstance.controls.setMarkerTexture(newMarkerUrl);
      }
    }
  };

  const handleQRCodeButtonClick = () => {
    let selectedModelName = 'sample';
    if (viewerInstance?.controls?.getActiveModelInfo) {
      const activeModel = viewerInstance.controls.getActiveModelInfo();
      if (activeModel) {
        selectedModelName = activeModel.fileName || 'model';
      }
    }
    showQRCodeModal({ modelName: selectedModelName });
  };

  // --- 初期化処理 ---
  updateTotalFileSizeDisplay(); // 初期ファイルサイズ表示 (0MBのはず)

  // --- クリーンアップ関数 ---
  // このビューが表示されなくなったときに呼ばれるべき関数を返す
  return () => {
    console.log("エディタービューのクリーンアップを実行します。");
    
    // ARビューアのリソースを解放
    if (viewerInstance && viewerInstance.dispose) {
      try {
        viewerInstance.dispose();
        console.log("ARビューアのリソースを解放しました。");
      } catch (error) {
        console.error("ARビューアのリソース解放中にエラー:", error);
      }
    }

    // ファイルリストの各アイテムのObjectURLを解放
    if (fileListContainer) {
      fileListContainer.querySelectorAll('.file-item').forEach(fileItem => {
        const objectUrl = fileItem.dataset.objectUrl;
        if (objectUrl && objectUrl.startsWith('blob:')) {
          URL.revokeObjectURL(objectUrl);
        }
      });
    }

    // イベントリスナーを解除
    if (uploadButton && modelFileInput) {
      uploadButton.removeEventListener('click', handleUploadButtonClick);
    }

    if (uploadArea) {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.removeEventListener(eventName, handleDragEvent);
      });
      uploadArea.removeEventListener('dragenter', handleDragEnter);
      uploadArea.removeEventListener('dragleave', handleDragLeave);
      uploadArea.removeEventListener('drop', handleDrop);
    }

    if (scaleSlider) {
      scaleSlider.removeEventListener('input', handleScaleChange);
    }

    if (resetScaleButton) {
      resetScaleButton.removeEventListener('click', handleScaleReset);
    }

    if (rotationSlider) {
      rotationSlider.removeEventListener('input', handleRotationChange);
    }

    if (positionXSlider) positionXSlider.removeEventListener('input', updatePosition);
    if (positionYSlider) positionYSlider.removeEventListener('input', updatePosition);
    if (positionZSlider) positionZSlider.removeEventListener('input', updatePosition);

    if (arScaleSlider) {
      arScaleSlider.removeEventListener('input', handleArScaleChange);
    }

    const resetFrontViewButton = document.getElementById('reset-front-view-button');
    if (resetFrontViewButton) {
      resetFrontViewButton.removeEventListener('click', handleResetFrontView);
    }

    // 変換モードボタンのイベントリスナーを正しく解除
    if (translateButton && translateButton._cleanup) {
      translateButton.removeEventListener('click', translateButton._cleanup);
    }
    if (rotateButton && rotateButton._cleanup) {
      rotateButton.removeEventListener('click', rotateButton._cleanup);
    }
    if (scaleButton && scaleButton._cleanup) {
      scaleButton.removeEventListener('click', scaleButton._cleanup);
    }

    // DOM要素の参照をクリア
    modelFileInput = null;
    uploadArea = null;
    fileListContainer = null;
    totalFileSizeElement = null;
    markerThumbnail = null;
    changeMarkerButton = null;
    backButton = null;
    saveButton = null;
    shareButton = null;
    previewButton = null;
    scaleSlider = null;
    scaleValue = null;
    scaleSizeLabel = null;
    resetScaleButton = null;
    rotationSlider = null;
    rotationValue = null;
    positionXSlider = null;
    positionYSlider = null;
    positionZSlider = null;
    positionXValue = null;
    positionYValue = null;
    positionZValue = null;
    arScaleSlider = null;
    arScaleValue = null;
    translateButton = null;
    rotateButton = null;
    scaleButton = null;
    arViewerContainer = null;

    console.log("エディタービューのクリーンアップが完了しました。");
  };

} // export function showEditor の終わり
