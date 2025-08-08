// src/views/ar-viewer.js
// QRコードからアクセスするARビューアーページ

import { initARViewer } from '../components/arViewer.js';

function navigateBackOrHome() {
  try {
    if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
      history.back();
      return;
    }
  } catch (_) {}
  window.location.hash = '#/projects';
}

export default function showARViewer(container) {
  // URLパラメータからproject.jsonのURLを取得
  const urlParams = new URLSearchParams(window.location.search);
  const projectSrc = urlParams.get('src');
  
  if (!projectSrc) {
    container.innerHTML = `
      <div class="viewer-error">
        <div class="error-content">
          <h1>❌ プロジェクトが見つかりません</h1>
          <p>URLパラメータ 'src' が指定されていません。</p>
          <p>正しいQRコードまたはURLを使用してください。</p>
          <button id="viewer-back-button" class="btn-primary">戻る</button>
        </div>
      </div>
    `;
    const backBtn = container.querySelector('#viewer-back-button');
    if (backBtn) backBtn.addEventListener('click', navigateBackOrHome);
    return;
  }

  // ローディング表示
  container.innerHTML = `
    <div class="viewer-loading">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <h2>ARコンテンツを読み込んでいます...</h2>
        <p>${projectSrc}</p>
      </div>
    </div>
  `;

  // project.jsonをfetchしてARビューアーを初期化
  loadAndDisplayProject(projectSrc, container);
}

async function loadAndDisplayProject(projectSrc, container) {
  try {
    console.log('🔄 プロジェクト読み込み開始:', projectSrc);
    
    // project.jsonをfetch
    const response = await fetch(projectSrc);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const projectData = await response.json();
    console.log('✅ プロジェクトデータ取得成功:', projectData);

    // ARビューアーを初期化
    const viewerOptions = {
      arType: projectData.type || 'markerless',
      markerImage: projectData.markerImage || null,
      loadingScreen: projectData.loadingScreen || null
    };

    // ビューアーコンテナを作成
    container.innerHTML = `
      <div class="ar-viewer-container">
        <div class="viewer-header">
          <h1>${projectData.name || 'AR Experience'}</h1>
          ${projectData.description ? `<p>${projectData.description}</p>` : ''}
        </div>
        <div id="ar-viewer" class="ar-viewer"></div>
        <div class="viewer-footer">
          <p>Powered by miru-webAR</p>
        </div>
      </div>
    `;

    // ARビューアーを初期化
    const viewerInstance = await initARViewer('ar-viewer', viewerOptions);
    
    // プロジェクトのモデルを読み込み
    if (projectData.models && Array.isArray(projectData.models)) {
      for (const model of projectData.models) {
        try {
          // モデルURLを構築（相対パスを絶対パスに変換）
          const modelUrl = new URL(model.url, projectSrc).href;
          await viewerInstance.controls.loadNewModel(modelUrl, model.fileName, model.fileSize);
        } catch (modelError) {
          console.error('❌ モデル読み込みエラー:', modelError);
        }
      }
    }

    console.log('✅ ARビューアー初期化完了');
    
  } catch (error) {
    console.error('❌ プロジェクト読み込みエラー:', error);
    container.innerHTML = `
      <div class="viewer-error">
        <div class="error-content">
          <h1>❌ プロジェクトの読み込みに失敗しました</h1>
          <p>エラー: ${error.message}</p>
          <p>URL: ${projectSrc}</p>
          <button id="viewer-back-button" class="btn-primary">戻る</button>
        </div>
      </div>
    `;
    const backBtn = container.querySelector('#viewer-back-button');
    if (backBtn) backBtn.addEventListener('click', navigateBackOrHome);
  }
}
