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
  // URLパラメータからproject.jsonのURLを取得（ハッシュ内のパラメータに対応）
  const hash = window.location.hash;
  const queryString = hash.includes('?') ? hash.split('?')[1] : '';
  const urlParams = new URLSearchParams(queryString);
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

    // ローディング画面設定がある場合は適用
    if (projectData.loadingScreen) {
      // プロパティ名の互換性を確保（message / loadingMessage, progressColor / accentColor）
      const ls = { ...projectData.loadingScreen };
      if (!ls.message && ls.loadingMessage) ls.message = ls.loadingMessage;
      if (!ls.accentColor && ls.progressColor) ls.accentColor = ls.progressColor;

      console.log('🎨 プロジェクト固有のローディング画面設定を適用:', ls);
      applyProjectLoadingScreen(ls);
    }

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
    if (projectData.models && Array.isArray(projectData.models) && projectData.models.length > 0) {
      for (const model of projectData.models) {
        try {
          // モデルURLを構築（相対パスを絶対パスに変換）
          const modelUrl = new URL(model.url, projectSrc).href;
          console.log('🔄 モデル読み込み中:', { fileName: model.fileName, url: modelUrl });
          await viewerInstance.controls.loadNewModel(modelUrl, model.fileName, model.fileSize);
        } catch (modelError) {
          console.error('❌ モデル読み込みエラー:', modelError);
        }
      }
    } else {
      // モデルがない場合のメッセージ表示
      console.warn('⚠️ このプロジェクトには3Dモデルが設定されていません');
      const viewerEl = container.querySelector('#ar-viewer');
      if (viewerEl) {
        viewerEl.innerHTML += `
          <div class="no-models-message" style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 2rem;
            border-radius: 8px;
            text-align: center;
            z-index: 1000;
          ">
            <h3>🎯 ARコンテンツがありません</h3>
            <p>このプロジェクトには3Dモデルが設定されていません。</p>
            <p>エディターでモデルを追加してからQRコードを生成してください。</p>
          </div>
        `;
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

// プロジェクト固有のローディング画面設定を適用する関数
function applyProjectLoadingScreen(loadingSettings) {
  try {
    console.log('🎨 ローディング画面設定を適用中:', loadingSettings);
    
    // ローディング画面のスタイルを動的に適用
    const style = document.createElement('style');
    style.id = 'project-loading-screen-styles';
    
    const css = `
      .viewer-loading {
        background-color: ${loadingSettings.backgroundColor || '#121212'} !important;
        color: ${loadingSettings.textColor || '#ffffff'} !important;
      }
      
      .viewer-loading .loading-content {
        text-align: center;
        padding: 2rem;
      }
      
      .viewer-loading .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid ${loadingSettings.accentColor || '#6c5ce7'};
        border-top: 4px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .viewer-loading h2 {
        color: ${loadingSettings.textColor || '#ffffff'};
        margin-bottom: 0.5rem;
        font-size: 1.2rem;
      }
      
      .viewer-loading p {
        color: ${loadingSettings.textColor || '#ffffff'};
        opacity: 0.8;
        font-size: 0.9rem;
      }
    `;
    
    style.textContent = css;
    document.head.appendChild(style);
    
    // ローディングメッセージを更新
    const loadingElement = document.querySelector('.viewer-loading');
    if (loadingElement) {
      const messageElement = loadingElement.querySelector('h2');
      if (messageElement && loadingSettings.loadingMessage) {
        messageElement.textContent = loadingSettings.loadingMessage;
      }
    }
    
    console.log('✅ ローディング画面設定を適用完了');
  } catch (error) {
    console.error('❌ ローディング画面設定の適用に失敗:', error);
  }
}
