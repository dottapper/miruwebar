// src/views/editor.js
import { initARViewer } from '../components/arViewer.js';

export function showEditor(container) {
  // URLパラメータからARタイプを取得
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const arType = urlParams.get('type') || 'unknown';
  
  // ARタイプに応じたタイトルとヘルプテキストを設定
  let title = 'AR エディター';
  let helpText = 'ARモデルをカスタマイズできます。';
  
  switch(arType) {
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
  }

  // マーカー型ARの場合の追加HTML
  const markerSection = arType === 'marker' ? `
    <div class="panel-section">
      <h3>マーカー画像</h3>
      <div class="marker-preview-container">
        <img id="marker-image" src="" alt="マーカー画像">
        <button id="change-marker" class="btn-secondary">画像を変更</button>
      </div>
    </div>
  ` : '';

  // マーカープレースホルダー
  const markerPlaceholder = arType === 'marker' ? `
    <div class="marker-placeholder-container">
      <div class="marker-placeholder"></div>
    </div>
  ` : '';

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
          <button id="save-button" class="btn-primary">保存</button>
          <button id="share-button" class="btn-secondary">共有</button>
        </div>
      </div>
      
      <div class="editor-info">
        <p>${helpText}</p>
      </div>
      
      <div class="editor-content">
        <div class="editor-layout">
          <!-- 左側：設定パネル -->
          <div class="settings-panel">
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
            
            <!-- マーカー型ARの場合のみ表示 -->
            ${markerSection}
            
            <div class="panel-section">
              <h3>モデル調整</h3>
              <div class="control-group">
                <label for="scale-slider">スケール:</label>
                <div class="slider-with-value">
                  <input type="range" id="scale-slider" min="0.1" max="2" step="0.1" value="1">
                  <span id="scale-value">1.0</span>
                </div>
              </div>
              
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
          </div>
          
          <!-- 右側：3Dビューア -->
          <div class="viewer-panel">
            <!-- マーカー型ARの場合、マーカーを中心に表示 -->
            ${markerPlaceholder}
            <div id="ar-viewer"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // 以下は変更なし
  // マーカー型ARの場合、アップロードした画像を表示
  if (arType === 'marker') {
    // LocalStorageからマーカー画像を取得（仮実装。実際にはAPIからの取得に置き換え）
    const markerImageUrl = localStorage.getItem('markerImageUrl');
    if (markerImageUrl) {
      const markerImage = document.getElementById('marker-image');
      markerImage.src = markerImageUrl;
    } else {
      // サンプル画像を表示（実際の実装では適切に処理）
      document.getElementById('marker-image').src = '/assets/sample-marker.jpg';
    }
  }

  // ARビューアーを初期化
  const viewerInstance = initARViewer('ar-viewer');
  
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
          // ファイルをオブジェクトURLに変換
          const objectUrl = URL.createObjectURL(file);
          
          // アップロードエリアの表示を更新
          uploadArea.innerHTML = `
            <div class="model-preview">
              <div class="model-info">
                <span class="model-name">${file.name}</span>
                <span class="model-size">${(file.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              <button id="change-model" class="btn-secondary">変更</button>
            </div>
          `;
          
          // モデル変更ボタンの処理
          document.getElementById('change-model').addEventListener('click', () => {
            modelFileInput.click();
          });
          
          // ARビューアーにモデルをロード
          viewerInstance.controls.loadNewModel(objectUrl);
        } else {
          alert('GLB形式のファイルを選択してください。');
        }
      }
    });
    
    // ドラッグ&ドロップ機能
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
  
  // イベントリスナー設定
  const backButton = document.getElementById('back-to-projects');
  if (backButton) {
    backButton.addEventListener('click', () => {
      window.location.hash = '#/projects';
    });
  }
  
  const saveButton = document.getElementById('save-button');
  if (saveButton) {
    saveButton.addEventListener('click', () => {
      console.log('プロジェクト保存');
      // 保存処理をここに実装
      alert('プロジェクトが保存されました');
    });
  }
  
  const shareButton = document.getElementById('share-button');
  if (shareButton) {
    shareButton.addEventListener('click', () => {
      console.log('QRコード生成');
      window.location.hash = '#/qr-code';
    });
  }
  
  const previewButton = document.getElementById('preview-button');
  if (previewButton) {
    previewButton.addEventListener('click', () => {
      alert('ARプレビュー画面が開きます（実装予定）');
    });
  }
  
  // スライダーの値を表示に反映
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
  
  // 位置スライダーの処理
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
  
  if (positionXSlider && viewerInstance.controls) {
    positionXSlider.addEventListener('input', updatePosition);
  }
  
  if (positionYSlider && viewerInstance.controls) {
    positionYSlider.addEventListener('input', updatePosition);
  }
  
  if (positionZSlider && viewerInstance.controls) {
    positionZSlider.addEventListener('input', updatePosition);
  }
  
  // マーカー画像変更処理（マーカー型ARの場合）
  if (arType === 'marker') {
    const changeMarkerButton = document.getElementById('change-marker');
    if (changeMarkerButton) {
      changeMarkerButton.addEventListener('click', () => {
        // 実際の実装ではマーカーアップロード画面を表示
        alert('マーカー画像を変更します。（実装予定）');
      });
    }
  }
  
  // クリーンアップ関数を返す
  return () => {
    if (viewerInstance && viewerInstance.dispose) {
      viewerInstance.dispose();
    }
  };
}