/**
 * ARViewerの使用例
 * このファイルは参考用であり、実際の実装ではviewsディレクトリなどに配置するコードとなります
 */

import { initARViewer } from '../components/arViewer.js';

/**
 * AR表示画面のサンプル実装
 * @param {HTMLElement} container - ARを表示するコンテナ要素
 */
export function setupARViewer(container) {
  // コンテナIDを設定
  const containerId = 'ar-viewer-container';
  
  // コンテナ要素を作成
  const viewerContainer = document.createElement('div');
  viewerContainer.id = containerId;
  viewerContainer.style.width = '100%';
  viewerContainer.style.height = '100%';
  container.appendChild(viewerContainer);
  
  // ARViewerを初期化
  const arViewer = initARViewer(containerId, {
    backgroundColor: 0x101010,
    markerMode: false
  });
  
  // URLからモデルパスとブランド情報を取得
  const urlParams = new URLSearchParams(window.location.search);
  const modelPath = urlParams.get('model') || 'default-model.glb'; // デフォルトのモデルパス
  
  // モデルを読み込む
  loadARModel(arViewer, modelPath);
  
  // コントロールボタンなどのUIを追加する例
  setupControls(container, arViewer);
  
  return arViewer;
}

/**
 * GLBモデルを読み込む
 * @param {Object} arViewer - ARViewerインスタンス
 * @param {string} modelPath - モデルファイルのパス
 */
async function loadARModel(arViewer, modelPath) {
  try {
    // モデルの読み込みを開始
    // ※ここでローディング画面は自動的に表示されます
    const modelIndex = await arViewer.loadModel(modelPath);
    
    // 読み込んだモデルをアクティブに設定
    arViewer.setActiveModel(modelIndex);
    
    // カメラ位置を調整
    arViewer.resetCameraToFrontView();
    
    console.log('モデルの読み込みが完了しました');
  } catch (error) {
    console.error('モデルの読み込みに失敗しました:', error);
    
    // エラー時にもローディング画面を非表示にする
    arViewer.hideLoadingScreen();
  }
}

/**
 * コントロールUI要素のセットアップ
 * @param {HTMLElement} container - 親コンテナ
 * @param {Object} arViewer - ARViewerインスタンス
 */
function setupControls(container, arViewer) {
  // UIコントロールのコンテナ
  const controlsContainer = document.createElement('div');
  controlsContainer.style.position = 'absolute';
  controlsContainer.style.bottom = '20px';
  controlsContainer.style.left = '0';
  controlsContainer.style.width = '100%';
  controlsContainer.style.display = 'flex';
  controlsContainer.style.justifyContent = 'center';
  controlsContainer.style.gap = '10px';
  controlsContainer.style.zIndex = '10';
  container.appendChild(controlsContainer);
  
  // リセットボタン
  const resetButton = document.createElement('button');
  resetButton.textContent = 'リセット';
  resetButton.onclick = () => arViewer.resetCameraToFrontView();
  controlsContainer.appendChild(resetButton);
  
  // その他のボタンやコントロールもここに追加できます
} 