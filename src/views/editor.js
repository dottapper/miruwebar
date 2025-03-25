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
          <button id="save-button" class="btn-primary">保存</button>
          <button id="share-button" class="btn-secondary">共有</button>
        </div>
      </div>
      
      <div class="editor-info">
        <p>${helpText}</p>
      </div>
      
      <div class="editor-content">
        <div class="model-section">
          <h3>3Dモデル</h3>
          <button id="upload-model" class="btn-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            GLBモデルをアップロード
          </button>
          
          <div id="ar-viewer" style="width: 100%; height: 400px; margin-top: 20px; background-color: #2a2a2a; border-radius: 8px;"></div>
        </div>
        
        <div class="editor-controls">
          <div class="control-group">
            <label for="scale-slider">スケール:</label>
            <input type="range" id="scale-slider" min="0.1" max="2" step="0.1" value="1">
            <span id="scale-value">1.0</span>
          </div>
          
          <div class="control-group">
            <label for="rotation-slider">回転 (Y軸):</label>
            <input type="range" id="rotation-slider" min="0" max="360" step="1" value="0">
            <span id="rotation-value">0°</span>
          </div>
          
          <div class="control-group">
            <label for="position-x">X座標:</label>
            <input type="range" id="position-x" min="-2" max="2" step="0.1" value="0">
            <span id="position-x-value">0.0</span>
          </div>
          
          <div class="control-group">
            <label for="position-y">Y座標:</label>
            <input type="range" id="position-y" min="-2" max="2" step="0.1" value="0">
            <span id="position-y-value">0.0</span>
          </div>
          
          <div class="control-group">
            <label for="position-z">Z座標:</label>
            <input type="range" id="position-z" min="-2" max="2" step="0.1" value="0">
            <span id="position-z-value">0.0</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // ARビューアーを初期化
  const viewerInstance = initARViewer('ar-viewer');
  
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
  
  // GLBモデルアップロードボタンのイベントリスナー
  const uploadModelButton = document.getElementById('upload-model');
  if (uploadModelButton) {
    uploadModelButton.addEventListener('click', () => {
      // ファイル選択ダイアログを表示（実際のファイル選択は今回は省略）
      console.log('GLBモデルアップロード処理');
      alert('※ここでファイル選択ダイアログが表示される予定です');
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
  
  // クリーンアップ関数を返す
  return () => {
    if (viewerInstance && viewerInstance.dispose) {
      viewerInstance.dispose();
    }
  };
}