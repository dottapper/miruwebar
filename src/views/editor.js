// src/views/editor.js
import { initARViewer } from '../components/arViewer.js';
import { showMarkerUpload } from '../views/marker-upload.js';

export function showEditor(container) {
  // URLパラメータからARタイプを取得
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const arType = urlParams.get('type') || 'unknown';
  const isMarkerMode = arType === 'marker';

  // ARタイプに応じたタイトル、ヘルプテキスト、ボタンの表示設定
  let title = 'AR エディター';
  let helpText = 'ARモデルをカスタマイズできます。';
  let previewButtonText = 'プレビュー';
  let showShareButton = true;

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
      previewButtonText = '配置を確認'; // 文言変更の例
      showShareButton = false; // ボタン非表示の例
      break;
    case 'object':
      title = '物体認識型AR エディター';
      helpText = '物体に合わせて表示される3Dモデルを設定します。';
      break;
    case 'face':
      title = 'フェイスタイプAR エディター';
      helpText = '顔に重ねて表示するARエフェクトを設定します。';
      break;
  }

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
          <button id="preview-button" class="btn-secondary">${previewButtonText}</button>
          <button id="save-button" class="btn-primary">保存</button>
          ${showShareButton ? '<button id="share-button" class="btn-secondary">共有</button>' : ''}
        </div>
      </div>
      
      <div class="editor-info">
        <p>${helpText}</p>
      </div>
      
      <div class="editor-content">
        <div class="editor-grid-layout">
          <!-- 左側：素材アップロードパネル -->
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
            
            <!-- マーカー型ARの場合のみ表示するマーカーサムネイル -->
            ${isMarkerMode ? `
            <div class="panel-section">
              <h3>マーカー画像（サムネイル）</h3>
              <div class="marker-thumbnail-container">
                <img id="marker-thumbnail" alt="マーカー画像">
                <button id="change-marker" class="btn-secondary">画像を変更</button>
              </div>
            </div>` : ''}

            <div class="panel-section">
              <h3>ファイル一覧</h3>
              <div class="file-list">
                <p class="empty-text">まだファイルがありません</p>
                <!-- 今後、ここにファイル一覧が表示されます -->
              </div>
             <div class="storage-usage">
  <p id="total-file-size">現在使用中：0MB / 50MB</p>
  <div class="progress-bar-container">
    <div id="storage-progress-bar" class="progress-bar" style="width: 0%"></div>
  </div>
</div>
</div> 
</div>
          
          <!-- 中央：3Dビューア -->
          <div class="viewer-panel">
            <div id="ar-viewer"></div>
          </div>
          
          <!-- 右側：モデル調整パネル -->
          <div class="controls-panel">
            <div class="panel-section">
              <h3>モデル調整</h3>
              <!-- スケールスライダー -->
              <div class="control-group">
                <label for="scale-slider">スケール:</label>
                <div class="slider-with-value">
                  <input type="range" id="scale-slider" min="0.1" max="2" step="0.1" value="1">
                  <span id="scale-value">1.0</span>
                </div>
              </div>
              
              <!-- 回転スライダー -->
              <div class="control-group">
                <label for="rotation-slider">回転 (Y軸):</label>
                <div class="slider-with-value">
                  <input type="range" id="rotation-slider" min="0" max="360" step="1" value="0">
                  <span id="rotation-value">0°</span>
                </div>
              </div>
              
              <!-- 位置調整 -->
              <div class="control-group">
                <label>位置:</label>
                <div class="position-controls">
                  <div class="position-control">
                    <span>X:</span>
                    <input type="range" id="position-x" min="-2" max="2" step="0.1" value="0">
                    <span id="position-x-value">0.0</span>
                  </div>
                  <div class="position-control">
                    <span>Y:</span>
                    <input type="range" id="position-y" min="-2" max="2" step="0.1" value="0">
                    <span id="position-y-value">0.0</span>
                  </div>
                  <div class="position-control">
                    <span>Z:</span>
                    <input type="range" id="position-z" min="-2" max="2" step="0.1" value="0">
                    <span id="position-z-value">0.0</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- ARオプション設定 -->
            <div class="panel-section">
              <h3>AR設定</h3>
              <div class="control-group">
                <label for="ar-scale">ARスケール倍率:</label>
                <div class="slider-with-value">
                  <input type="range" id="ar-scale" min="0.5" max="3" step="0.1" value="1">
                  <span id="ar-scale-value">1.0</span>
                </div>
              </div>
              
              <!-- マーカー型ARの場合のみ表示 -->
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
          </div>
        </div>
      </div>
    </div>
  `;

   // マーカー型ARの場合、アップロードした画像をサムネイルとして表示
  if (isMarkerMode) {
    const markerThumbnail = document.getElementById('marker-thumbnail');
    if (markerThumbnail) {
      const markerImageUrl = localStorage.getItem('markerImageUrl');
      if (markerImageUrl) {
        markerThumbnail.src = markerImageUrl;
      } else {
        // サンプル画像を表示
        markerThumbnail.src = '/assets/sample-marker.jpg';
      }
    }
  }

  // ARビューアーを初期化
  const viewerInstance = initARViewer('ar-viewer', {
    markerMode: isMarkerMode,
    showGrid: true
  });

  // ファイルサイズ計算と表示のための関数
  let totalFileSize = 0;
  const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

  function updateTotalFileSize(fileSize) {
    totalFileSize += fileSize;
    const totalFileSizeMB = (totalFileSize / (1024 * 1024)).toFixed(2);
    const usagePercentage = (totalFileSize / MAX_TOTAL_SIZE) * 100;
    
    document.getElementById('total-file-size').textContent = `現在使用中：${totalFileSizeMB}MB / 50MB`;
    
    // プログレスバーも更新
    const progressBar = document.getElementById('storage-progress-bar');
    if (progressBar) {
      progressBar.style.width = `${usagePercentage}%`;
      
      // 使用量に応じて色を変更
      if (usagePercentage > 90) {
        progressBar.style.backgroundColor = '#ff4d4d'; // 赤 (90%以上)
      } else if (usagePercentage > 70) {
        progressBar.style.backgroundColor = '#ffcc00'; // 黄色 (70%以上)
      }
    }
  }

  // GLBモデルアップロード機能
  const modelFileInput = document.getElementById('model-file-input');
  const uploadButton = document.getElementById('upload-model');
  const uploadArea = document.getElementById('model-upload-area');

  if (uploadButton && modelFileInput) {
    uploadButton.addEventListener('click', () => {
      modelFileInput.click();
    });

    modelFileInput.addEventListener('change', (event) => {
      if (event.target.files.length > 0) {
        const file = event.target.files[0];
        if (file.name.endsWith('.glb')) {
          // ファイルサイズチェック
          if (totalFileSize + file.size > MAX_TOTAL_SIZE) {
            alert('合計ファイルサイズが50MBを超えています。');
            return;
          }

          const objectUrl = URL.createObjectURL(file);

          uploadArea.innerHTML = `
            <div class="model-preview">
              <div class="model-info">
                <span class="model-name">${file.name}</span>
                <span class="model-size">${(file.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              <button id="change-model" class="btn-secondary">変更</button>
            </div>
          `;

          document.getElementById('change-model').addEventListener('click', () => {
            totalFileSize -= file.size;
            updateTotalFileSize(0);
            modelFileInput.click();
          });

          const fileList = document.querySelector('.file-list');
          if (fileList.querySelector('.empty-text')) {
            fileList.querySelector('.empty-text').remove();
          }
          const fileItem = document.createElement('div');
          fileItem.classList.add('file-item');
          fileItem.innerHTML = `<span>${file.name}</span> <span>${(file.size / (1024 * 1024)).toFixed(2)} MB</span>`;
          fileList.appendChild(fileItem);

          updateTotalFileSize(file.size);
          viewerInstance.controls.loadNewModel(objectUrl);
        } else {
          alert('GLB形式のファイルを選択してください。');
        }
      }
    });

    // ドラッグ&ドロップ
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
      uploadArea.addEventListener(eventName, () => {
        uploadArea.classList.add('highlight');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, () => {
        uploadArea.classList.remove('highlight');
      });
    });

    uploadArea.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.glb')) {
        modelFileInput.files = e.dataTransfer.files;
        const event = new Event('change');
        modelFileInput.dispatchEvent(event);
      } else {
        alert('GLB形式のファイルを選択してください。');
      }
    });
  }

  // マーカー画像変更処理（マーカー型AR）
  if (isMarkerMode) {
    const changeMarkerButton = document.getElementById('change-marker');
    if (changeMarkerButton) {
      changeMarkerButton.addEventListener('click', () => {
        showMarkerUpload();
      });
    }
  }

    // イベントリスナー（ダミー動作）
    const backButton = document.getElementById('back-to-projects');
    if (backButton) {
        backButton.addEventListener('click', () => {
            alert("プロジェクト一覧に戻ります（ダミー動作）"); // ダミー動作
            window.location.hash = '#/projects';
        });
    }

  const saveButton = document.getElementById('save-button');
  if (saveButton) {
    saveButton.addEventListener('click', () => {
      // ダミーの保存処理
      alert(`「${title}」の変更を保存しました（ダミー動作）`);
    });
  }

  const shareButton = document.getElementById('share-button');
    if (shareButton) {
        shareButton.addEventListener('click', () => {
            // ダミーの共有処理
            alert(`「${title}」を共有します（ダミー動作）\n共有URL: ... \nQRコード: ...`);
             window.location.hash = '#/qr-code';
        });
    }

  const previewButton = document.getElementById('preview-button');
    if (previewButton) {
        previewButton.addEventListener('click', () => {
            // ダミーのプレビュー処理
            alert(`「${title}」のプレビューを開始します（ダミー動作）`);
        });
    }


  // スライダー
  const scaleSlider = document.getElementById('scale-slider');
  const scaleValue = document.getElementById('scale-value');
  if (scaleSlider && scaleValue && viewerInstance.controls) {
    scaleSlider.addEventListener('input', () => {
      const value = parseFloat(scaleSlider.value).toFixed(1);
      scaleValue.textContent = value;
      viewerInstance.controls.setScale(parseFloat(value));
    });
  }

  const rotationSlider = document.getElementById('rotation-slider');
  const rotationValue = document.getElementById('rotation-value');
  if (rotationSlider && rotationValue && viewerInstance.controls) {
    rotationSlider.addEventListener('input', () => {
      rotationValue.textContent = `${rotationSlider.value}°`;
      viewerInstance.controls.setRotationY(parseInt(rotationSlider.value));
    });
  }

  // 位置スライダー
  const positionXSlider = document.getElementById('position-x');
  const positionYSlider = document.getElementById('position-y');
  const positionZSlider = document.getElementById('position-z');
  const positionXValue = document.getElementById('position-x-value');
  const positionYValue = document.getElementById('position-y-value');
  const positionZValue = document.getElementById('position-z-value');

  function updatePosition() {
    const x = parseFloat(positionXSlider.value);
    const y = parseFloat(positionYSlider.value);
    const z = parseFloat(positionZSlider.value);
    viewerInstance.controls.setPosition(x, y, z);
    positionXValue.textContent = x.toFixed(1);
    positionYValue.textContent = y.toFixed(1);
    positionZValue.textContent = z.toFixed(1);
  }

  if (positionXSlider) positionXSlider.addEventListener('input', updatePosition);
  if (positionYSlider) positionYSlider.addEventListener('input', updatePosition);
  if (positionZSlider) positionZSlider.addEventListener('input', updatePosition);

  // AR設定スライダー
  const arScaleSlider = document.getElementById('ar-scale');
  const arScaleValue = document.getElementById('ar-scale-value');
  if (arScaleSlider && arScaleValue) {
    arScaleSlider.addEventListener('input', () => {
      const value = parseFloat(arScaleSlider.value).toFixed(1);
      arScaleValue.textContent = value;
      localStorage.setItem('arScale', value);
    });
  }

  return () => {
    if (viewerInstance && viewerInstance.dispose) {
      viewerInstance.dispose();
    }
  };
}