// src/views/editor.js
import { initARViewer } from '../components/arViewer.js';

export function showEditor(container) {
  container.innerHTML = `
    <div class="editor-container">
      <div class="editor-header">
        <h1>AR Editor</h1>
        <div class="toolbar">
          <button id="save-button">保存</button>
          <button id="share-button">共有</button>
        </div>
      </div>
      <div class="editor-content">
        <div id="ar-viewer" style="width: 100%; height: 500px;"></div>
        <div class="editor-controls">
          <div class="control-group">
            <label>スケール:</label>
            <input type="range" id="scale-slider" min="0.1" max="2" step="0.1" value="1">
          </div>
          <div class="control-group">
            <label>回転:</label>
            <input type="range" id="rotation-slider" min="0" max="360" step="1" value="0">
          </div>
        </div>
      </div>
    </div>
  `;

  // ARビューアーを初期化
  const arViewerInstance = initARViewer('ar-viewer');
  
  // イベントリスナー設定
  const saveButton = document.getElementById('save-button');
  if (saveButton) {
    saveButton.addEventListener('click', () => {
      console.log('プロジェクト保存');
      // 保存処理をここに実装
    });
  }
  
  const shareButton = document.getElementById('share-button');
  if (shareButton) {
    shareButton.addEventListener('click', () => {
      console.log('QRコード生成');
      window.location.hash = '#/qr-code';
    });
  }
  
  // クリーンアップ関数を返す
  return () => {
    if (arViewerInstance && arViewerInstance.dispose) {
      arViewerInstance.dispose();
    }
  };
}