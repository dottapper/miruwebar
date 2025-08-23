// src/views/ar-viewer.js
// QRコードからアクセスするARビューアーページ

import { initARViewer } from '../components/arViewer.js';
import { initWebXRAR } from '../components/webxr-ar.js';
import { initSimpleCameraAR } from '../components/simple-camera-ar.js';

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

    // ARエクスペリエンス用のフルスクリーンコンテナを作成
    container.innerHTML = `
      <div id="ar-experience" class="ar-experience-container">
        <!-- ローディング画面 -->
        <div id="ar-loading" class="ar-loading-screen">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <h2>${projectData.loadingScreen?.message || 'ARコンテンツを読み込んでいます...'}</h2>
            <div class="loading-progress">
              <div class="progress-bar" id="progress-bar"></div>
            </div>
            <p class="loading-tip">📱 カメラの使用許可が必要です</p>
          </div>
        </div>
        
        <!-- ARビューア（初期は非表示） -->
        <div id="ar-viewer" class="ar-viewer" style="display: none;"></div>
      </div>
    `;

    // ローディング画面のスタイル適用
    applyLoadingStyles();

    // プログレスバー更新
    function updateProgress(percent, message) {
      const progressBar = document.getElementById('progress-bar');
      const loadingMessage = container.querySelector('.loading-content h2');
      if (progressBar) progressBar.style.width = percent + '%';
      if (loadingMessage && message) loadingMessage.textContent = message;
    }

    updateProgress(20, 'プロジェクトデータを解析中...');

    // デバイス判定
    const isMotionDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    console.log('📱 デバイス判定:', { 
      isMotionDevice, 
      userAgent: navigator.userAgent,
      protocol: window.location.protocol,
      hostname: window.location.hostname
    });
    
    // 強制的にモバイルARモードを有効化（デバッグ用）
    const forceARMode = true;
    console.log('🔧 デバッグ: AR強制モード有効');

    updateProgress(40, '3Dモデルを準備中...');
    
    // 3Dモデルデータを準備（ARビューア初期化前）
    const modelData = [];
    if (projectData.models && Array.isArray(projectData.models) && projectData.models.length > 0) {
      for (let i = 0; i < projectData.models.length; i++) {
        const model = projectData.models[i];
        try {
          const modelUrl = new URL(model.url, projectSrc).href;
          modelData.push({
            url: modelUrl,
            fileName: model.fileName,
            fileSize: model.fileSize
          });
          
          updateProgress(60 + (i * 20), `3Dモデル準備中... ${i + 1}/${projectData.models.length}`);
          console.log('🔄 モデルURL準備完了:', modelUrl);
        } catch (modelError) {
          console.error('❌ モデルURL構築エラー:', modelError);
        }
      }
    }

    updateProgress(80, 'ARビューアを初期化中...');

    // ARビューアの初期化とローディング画面の遷移
    let viewerInstance = null;
    
    try {
      // セキュアコンテキスト判定（モバイルでのカメラ使用には基本HTTPSが必要）
      const isSecureContext = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

      // デバッグ用: 強制的にカメラARモードを試行（ただし非HTTPSのLANアクセス時はフォールバック）
      if ((isMotionDevice || forceARMode) && isSecureContext) {
        console.log('📱 ARモード - カメラARビューア初期化開始');
        console.log('🔧 初期化パラメータ:', { 
          containerId: 'ar-viewer', 
          viewerOptions 
        });
        updateProgress(90, 'カメラを準備中...');
        
        try {
          // シンプルカメラARを初期化
          viewerInstance = await initSimpleCameraAR('ar-viewer', viewerOptions);
          console.log('✅ カメラAR初期化成功:', viewerInstance);
          
        } catch (cameraARError) {
          console.error('❌ カメラAR初期化失敗 - 標準ビューアにフォールバック:', cameraARError);
          // フォールバック: 標準ARビューアを使用
          viewerInstance = await initARViewer('ar-viewer', viewerOptions);
          console.log('✅ 標準ARビューア（フォールバック）初期化成功');
        }
        
      } else {
        console.log('💻 デスクトップデバイス - 標準ARビューア初期化');
        viewerInstance = await initARViewer('ar-viewer', viewerOptions);

        if (!isSecureContext && (isMotionDevice || forceARMode)) {
          // 非HTTPS環境でモバイルアクセスの場合、ユーザーに案内を表示
          const loadingContent = container.querySelector('.loading-content');
          if (loadingContent) {
            const note = document.createElement('div');
            note.style.cssText = 'margin-top: 1rem; font-size: 0.9rem; opacity: 0.85;';
            note.innerHTML = '🔒 カメラARを利用するにはHTTPSでアクセスしてください。<br>開発時はHTTPS有効のQRを使用、または公開URLでお試しください。';
            loadingContent.appendChild(note);
          }
        }
      }

      updateProgress(95, 'モデルを読み込み中...');

          // モデルの読み込み
    for (const model of modelData) {
      try {
        console.log('🔄 ARビューアでモデル読み込み開始:', {
          url: model.url,
          fileName: model.fileName,
          fileSize: model.fileSize,
          viewerInstance: !!viewerInstance,
          hasLoadModel: !!viewerInstance?.loadModel,
          hasControls: !!viewerInstance?.controls
        });

        if (viewerInstance.loadModel) {
          console.log('📦 loadModel() メソッドを使用');
          await viewerInstance.loadModel(model.url);
        } else if (viewerInstance.controls) {
          console.log('📦 controls.loadNewModel() メソッドを使用');
          await viewerInstance.controls.loadNewModel(model.url, model.fileName, model.fileSize);
        }
        console.log('✅ モデル読み込み完了:', model.fileName);
      } catch (modelError) {
        console.error('❌ モデル読み込みエラー:', {
          error: modelError,
          message: modelError.message,
          stack: modelError.stack,
          modelUrl: model.url,
          fileName: model.fileName
        });
      }
    }

      updateProgress(100, 'AR体験を開始...');

      // ローディング画面を隠してARビューアを表示
      setTimeout(() => {
        const loadingScreen = document.getElementById('ar-loading');
        const arViewer = document.getElementById('ar-viewer');
        
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (arViewer) arViewer.style.display = 'block';
        
        console.log('✅ AR体験開始');
      }, 1000);

    } catch (error) {
      console.error('❌ ARビューア初期化エラー:', error);
      
      // エラー時の表示
      updateProgress(100, 'エラーが発生しました');
      setTimeout(() => {
        const loadingContent = container.querySelector('.loading-content');
        if (loadingContent) {
          loadingContent.innerHTML = `
            <h2 style="color: #ff6b6b;">📷 カメラアクセスエラー</h2>
            <p>ARコンテンツを表示するにはカメラのアクセス許可が必要です。</p>
            <p style="font-size: 0.9em; margin-top: 1rem;">
              ブラウザの設定でカメラ許可を有効にして、<br>
              ページをリロードしてください。
            </p>
            <button onclick="location.reload()" style="
              background: #4CAF50;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              margin-top: 1rem;
              cursor: pointer;
            ">再試行</button>
          `;
        }
      }, 2000);
      return;
    }

    if (modelData.length === 0) {
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
      /* 旧ローディング（エディター側プレビュー） */
      .viewer-loading {
        background-color: ${loadingSettings.backgroundColor || '#121212'} !important;
        color: ${loadingSettings.textColor || '#ffffff'} !important;
      }
      .viewer-loading .loading-content { text-align: center; padding: 2rem; }
      .viewer-loading .loading-spinner {
        width: 40px; height: 40px; border: 4px solid ${loadingSettings.accentColor || '#6c5ce7'};
        border-top: 4px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;
      }
      .viewer-loading h2 { color: ${loadingSettings.textColor || '#ffffff'}; margin-bottom: 0.5rem; font-size: 1.2rem; }
      .viewer-loading p { color: ${loadingSettings.textColor || '#ffffff'}; opacity: 0.8; font-size: 0.9rem; }

      /* ARビューア側ローディング */
      .ar-loading-screen { background-color: ${loadingSettings.backgroundColor || '#121212'} !important; }
      .ar-loading-screen .loading-content h2 { color: ${loadingSettings.textColor || '#ffffff'} !important; }
      .ar-loading-screen .loading-spinner {
        width: 60px; height: 60px; border: 4px solid rgba(255,255,255,0.1);
        border-top: 4px solid ${loadingSettings.accentColor || '#6c5ce7'}; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 2rem;
      }
      .ar-loading-screen .progress-bar { background: linear-gradient(90deg, ${loadingSettings.accentColor || '#6c5ce7'}, ${loadingSettings.accentColor || '#6c5ce7'}); }

      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
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

// ARローディング画面のスタイル適用
function applyLoadingStyles() {
  if (document.getElementById('ar-loading-styles')) return;

  const style = document.createElement('style');
  style.id = 'ar-loading-styles';
  style.textContent = `
    .ar-experience-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #000;
      z-index: 9999;
    }
    
    .ar-loading-screen {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      color: white;
      font-family: 'Arial', sans-serif;
    }
    
    .loading-content {
      text-align: center;
      max-width: 300px;
      padding: 2rem;
    }
    
    .loading-spinner {
      width: 60px;
      height: 60px;
      border: 4px solid rgba(255, 255, 255, 0.1);
      border-top: 4px solid #4CAF50;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 2rem;
    }
    
    .loading-content h2 {
      font-size: 1.2rem;
      margin: 0 0 1.5rem 0;
      font-weight: 300;
    }
    
    .loading-progress {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
      margin: 1rem 0;
    }
    
    .progress-bar {
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, #4CAF50, #45a049);
      border-radius: 2px;
      transition: width 0.5s ease;
    }
    
    .loading-tip {
      font-size: 0.9rem;
      opacity: 0.7;
      margin: 1rem 0 0 0;
    }
    
    .ar-viewer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  
  document.head.appendChild(style);
}
