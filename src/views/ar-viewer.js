// src/views/ar-viewer.js
// 統合ARビューア - QRコードからプロジェクトデータを読み込んでAR表示
import { showViewerLoadingScreen, unifiedLoading } from '../utils/unified-loading-screen.js';
import { createLogger } from '../utils/logger.js';
import { TEMPLATES_STORAGE_KEY } from '../components/loading-screen/template-manager.js';
// DEBUG ログ制御
const IS_DEBUG = (typeof window !== 'undefined' && !!window.DEBUG);
const dlog = (...args) => { if (IS_DEBUG) console.log(...args); };

const arViewerLogger = createLogger('ARViewer');

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
  dlog('🚀 統合ARビューア開始');
  
  // URLパラメータからproject.jsonのURLを取得（ハッシュ内のパラメータに対応）
  const hash = window.location.hash;
  const queryString = hash.includes('?') ? hash.split('?')[1] : '';
  const urlParams = new URLSearchParams(queryString);
  const projectSrc = urlParams.get('src');
  const enableLSFlag = (urlParams.get('ls') || '').toLowerCase() === 'on';
  // デバッグ用：cube=on で強制デバッグキューブを配置
  const forceDebugCube = ['on','1','true','yes'].includes((urlParams.get('cube')||'').toLowerCase());
  const forceNormalMaterial = ['normal','n','1','true','yes'].includes((urlParams.get('mat')||'').toLowerCase());
  
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

  dlog('📡 プロジェクトURL:', projectSrc);

  // 統合ARビューアのHTML構造
  container.innerHTML = `
    <div class="integrated-ar-viewer">
      <!-- スタート画面（開始→ローディング→ガイドの順） -->
      <div id="ar-start-screen" class="ar-start-screen" style="display: none;">
        <div class="start-content">
          <img id="ar-start-logo" alt="start logo" style="display:none;max-width:160px;max-height:80px;margin-bottom:12px;" />
          <h1 id="ar-start-title">AR体験を開始</h1>
          <button id="ar-start-cta" class="btn-primary" style="margin-top: 12px;">開始</button>
        </div>
      </div>
      <!-- ローディング画面 -->
      <div id="ar-loading-screen" class="ar-loading-screen">
        <div class="loading-content">
          <img id="ar-loading-logo" alt="brand logo" style="display:none;max-width:160px;max-height:80px;margin-bottom:12px;" />
          <div id="ar-loading-text-group" class="loading-text-group">
            <h2 id="ar-loading-title">ARプロジェクトを読み込み中...</h2>
            <p id="ar-loading-message">システムを初期化しています...</p>
          </div>
          <div class="loading-progress">
            <div id="ar-loading-bar" class="loading-bar"></div>
          </div>
        </div>
      </div>
      
      <!-- ガイド画面（マーカー検出/平面検出の説明） -->
      <div id="ar-guide-screen" class="ar-guide-screen" style="display: none;">
        <div class="guide-content">
          <img id="ar-guide-image" alt="guide image" style="display:none;max-width:240px;max-height:180px;margin-bottom:16px;" />
          <h2 id="ar-guide-title">画面をタップしてください</h2>
          <p id="ar-guide-description">平らな面を見つけて画面をタップしてください</p>
          <div id="ar-guide-marker" style="display:none;">
            <img id="ar-guide-marker-image" alt="marker" style="max-width:200px;max-height:150px;margin:16px 0;" />
          </div>
        </div>
      </div>
      
      <div id="ar-host" class="ar-host"></div>
      
      <!-- ARコントロール -->
      <div id="ar-controls" class="ar-controls">
        <div class="controls-content">
          <h3>📱 ARビューア</h3>
          <p id="ar-instruction">プロジェクトを読み込んでいます...</p>
          <button id="ar-start-btn" class="btn-primary" style="display: none;">🚀 AR開始</button>
          <button id="ar-detect-btn" class="btn-success" style="display: none;">🎯 マーカー検出</button>
          <button id="ar-back-btn" class="btn-secondary">← 戻る</button>
        </div>
      </div>
      
      <!-- ステータス表示 -->
      <div id="ar-status" class="ar-status">
        <div id="ar-status-text">初期化中...</div>
      </div>
      
      <!-- マーカーガイド -->
      <div id="ar-marker-guide" class="ar-marker-guide" style="display: none;"></div>
      <div id="marker-guide-tips" class="marker-guide-tips" style="display: none;">
        <strong>スキャンTips:</strong><br>
        • マーカーを枠内に収めてください<br>
        • 十分な明るさを確保してください<br>
        • ゆっくり動かさないように<br>
        • 距離を適度に保ってください
      </div>
    </div>
  `;

  // CSS スタイルを追加
  const style = document.createElement('style');
  style.textContent = `
    .integrated-ar-viewer {
      position: relative;
      width: 100vw;
      height: 100vh;
      background: #000;
      color: #fff;
      font-family: Arial, sans-serif;
      overflow: hidden;
    }

    .ar-host {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      overflow: hidden;
    }

    .ar-start-screen {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #121212;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1200;
    }
    .start-content { text-align: center; padding: 2rem; position: relative; }
    .start-content h1 { color: #fff; font-size: 1.6rem; margin: 0.5rem 0 0; }

    .ar-guide-screen {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #121212;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1100;
    }
    .guide-content { 
      text-align: center; 
      padding: 2rem; 
      position: relative;
      max-width: 90%;
    }
    .guide-content h2 { 
      color: #fff; 
      font-size: 1.4rem; 
      margin: 0.5rem 0 1rem; 
    }
    .guide-content p { 
      color: #ccc; 
      font-size: 1rem; 
      margin: 0.5rem 0 1rem; 
      line-height: 1.4;
    }

    .ar-loading-screen {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #1a1a1a;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .loading-content {
      text-align: center;
      padding: 2rem;
      position: relative;
    }
    
    .loading-content h2 {
      color: #ffffff;
      margin-bottom: 1rem;
      font-size: 1.5rem;
    }

    .loading-text-group {
      position: absolute;
      top: 40%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: calc(100% - 40px);
    }
    
    .loading-progress {
      width: 300px;
      height: 4px;
      background: rgba(255,255,255,0.2);
      border-radius: 2px;
      overflow: hidden;
      margin: 1rem auto;
    }
    
    .loading-bar {
      height: 100%;
      background: #6c5ce7;
      width: 0%;
      transition: width 0.3s ease;
    }
    
    .ar-controls {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.8);
      padding: 1rem;
      border-radius: 12px;
      text-align: center;
      z-index: 1100; /* ローディング画面(1000)より前面に表示 */
      max-width: 320px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    
    .ar-status {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(0,0,0,0.8);
      padding: 8px 12px;
      border-radius: 8px;
      z-index: 900;
      font-size: 12px;
      max-width: 300px;
      line-height: 1.3;
    }
    
    .ar-marker-guide {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 200px;
      height: 200px;
      border: 3px dashed #4CAF50;
      border-radius: 12px;
      z-index: 500;
      background: rgba(76, 175, 80, 0.1);
    }

    .ar-marker-guide::before {
      content: "📱 マーカーをここに";
      position: absolute;
      top: -35px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(76, 175, 80, 0.9);
      color: white;
      padding: 6px 12px;
      border-radius: 15px;
      font-size: 11px;
      white-space: nowrap;
    }

    .ar-marker-guide::after {
      content: "💡 十分な明るさを確保してください";
      position: absolute;
      bottom: -45px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 193, 7, 0.9);
      color: white;
      padding: 4px 8px;
      border-radius: 10px;
      font-size: 10px;
      white-space: nowrap;
    }

    .marker-guide-tips {
      position: absolute;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 15px;
      border-radius: 8px;
      font-size: 11px;
      text-align: center;
      z-index: 490;
      max-width: 280px;
      line-height: 1.4;
    }

    .marker-guide-tips strong {
      color: #4CAF50;
    }
    
    .btn-primary, .btn-success, .btn-secondary {
      padding: 10px 16px;
      border: none;
      border-radius: 6px;
      margin: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    
    .btn-primary { background: #007bff; color: white; }
    .btn-primary:hover { background: #0056b3; }
    
    .btn-success { background: #28a745; color: white; }
    .btn-success:hover { background: #1e7e34; }
    
    .btn-secondary { background: #6c757d; color: white; }
    .btn-secondary:hover { background: #545b62; }
    
    .success { color: #44ff44; }
    .error { color: #ff4444; }
    .warning { color: #ffaa44; }
    .info { color: #4488ff; }
  `;
  document.head.appendChild(style);

  // デバッグコンソール（スマホ用）
  const debugConsole = document.createElement('div');
  debugConsole.id = 'debug-console';
  debugConsole.style.cssText = `
    position: fixed; top: 10px; left: 10px; right: 10px; max-height: 200px;
    background: rgba(0,0,0,0.8); color: #00ff00; font-size: 12px;
    padding: 10px; border-radius: 5px; z-index: 9999; overflow-y: auto;
    font-family: monospace; display: none;
  `;
  document.body.appendChild(debugConsole);

  // コンソールログをキャプチャ
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  
  function addToDebugConsole(message, type = 'log') {
    const color = type === 'error' ? '#ff4444' : type === 'warn' ? '#ffaa44' : '#00ff00';
    debugConsole.innerHTML += `<div style="color:${color}">[${type.toUpperCase()}] ${message}</div>`;
    debugConsole.scrollTop = debugConsole.scrollHeight;
    if (debugConsole.children.length > 50) {
      debugConsole.removeChild(debugConsole.firstChild);
    }
  }

  console.log = (...args) => { originalLog(...args); addToDebugConsole(args.join(' '), 'log'); };
  console.warn = (...args) => { originalWarn(...args); addToDebugConsole(args.join(' '), 'warn'); };
  console.error = (...args) => { originalError(...args); addToDebugConsole(args.join(' '), 'error'); };

  // デバッグコンソール表示切替（画面タップ）
  let tapCount = 0;
  document.addEventListener('touchstart', () => {
    tapCount++;
    setTimeout(() => { tapCount = 0; }, 1000);
    if (tapCount === 3) {
      debugConsole.style.display = debugConsole.style.display === 'none' ? 'block' : 'none';
    }
  });

  // 5秒後に自動表示（デバッグ用）
  setTimeout(() => {
    debugConsole.style.display = 'block';
    addToDebugConsole('🚀 デバッグコンソール自動表示開始', 'log');
  }, 5000);

  // ARビューア初期化（機能フラグを渡す）
  initIntegratedARViewer(container, projectSrc, { enableLSFlag, forceDebugCube, forceNormalMaterial });
}

// 統合ARビューアの初期化関数
async function initIntegratedARViewer(container, projectSrc, options = {}) {
  arViewerLogger.info('ARビューア初期化開始:', { projectSrc, options });
  const { enableLSFlag = false, forceDebugCube = false, forceNormalMaterial = false } = options;
  const loadingScreen = container.querySelector('#ar-loading-screen');
  const loadingBar = container.querySelector('#ar-loading-bar');
  const loadingProgressWrap = container.querySelector('.loading-progress');
  const loadingMessage = container.querySelector('#ar-loading-message');
  const loadingLogo = container.querySelector('#ar-loading-logo');
  const loadingTextGroup = container.querySelector('#ar-loading-text-group');
  const startScreen = container.querySelector('#ar-start-screen');
  const startLogo = container.querySelector('#ar-start-logo');
  const startTitle = container.querySelector('#ar-start-title');
  const startCTA = container.querySelector('#ar-start-cta');
  const guideScreen = container.querySelector('#ar-guide-screen');
  const guideImage = container.querySelector('#ar-guide-image');
  const guideTitle = container.querySelector('#ar-guide-title');
  const guideDescription = container.querySelector('#ar-guide-description');
  const guideMarker = container.querySelector('#ar-guide-marker');
  const guideMarkerImage = container.querySelector('#ar-guide-marker-image');
  const arHost = container.querySelector('#ar-host');
  const statusText = container.querySelector('#ar-status-text');
  const instruction = container.querySelector('#ar-instruction');
  const startBtn = container.querySelector('#ar-start-btn');
  const detectBtn = container.querySelector('#ar-detect-btn');
  const backBtn = container.querySelector('#ar-back-btn');
  const markerGuide = container.querySelector('#ar-marker-guide');
  const markerGuideTips = container.querySelector('#marker-guide-tips');
  
  let camera, scene, renderer, video;
  let markerDetected = false;
  let currentProject = null;
  let arObjects = [];
  let loadedModels = [];

  // ローディング画面とスタート画面をデフォルト状態にリセットする関数
  function resetLoadingScreenStyles() {
    dlog('🔄 ローディング画面・スタート画面スタイルをリセット');
    
    // ローディング画面のリセット
    if (loadingScreen) {
      loadingScreen.style.backgroundColor = '';
      loadingScreen.style.background = '';
      loadingScreen.style.color = '';
      loadingScreen.style.display = 'flex';
    }
    
    // ローディング画面内の要素をリセット
    const loadingTitle = container.querySelector('#ar-loading-title');
    if (loadingTitle) {
      loadingTitle.style.color = '';
      loadingTitle.style.fontSize = '';
      loadingTitle.style.fontFamily = '';
      loadingTitle.textContent = 'ARプロジェクトを読み込み中...';
    }
    
    if (loadingMessage) {
      loadingMessage.style.color = '';
      loadingMessage.style.fontSize = '';
      loadingMessage.style.fontFamily = '';
      loadingMessage.textContent = 'システムを初期化しています...';
    }
    
    if (loadingLogo) {
      loadingLogo.style.display = 'none';
      loadingLogo.src = '';
      loadingLogo.style.width = '';
      loadingLogo.style.height = '';
      loadingLogo.style.maxWidth = '160px';
      loadingLogo.style.maxHeight = '80px';
      loadingLogo.style.position = '';
      loadingLogo.style.top = '';
      loadingLogo.style.left = '';
      loadingLogo.style.transform = '';
    }
    
    if (loadingTextGroup) {
      loadingTextGroup.style.fontSize = '';
      loadingTextGroup.style.position = '';
      loadingTextGroup.style.top = '';
      loadingTextGroup.style.left = '';
      loadingTextGroup.style.transform = '';
      loadingTextGroup.style.textAlign = '';
    }
    
    // プログレスバーのリセット
    if (loadingBar) {
      loadingBar.style.backgroundColor = '';
      loadingBar.style.background = '';
      loadingBar.style.width = '0%';
    }
    
    if (loadingProgressWrap) {
      loadingProgressWrap.style.display = '';
    }
    
    // スタート画面のリセット
    if (startScreen) {
      startScreen.style.backgroundColor = '';
      startScreen.style.background = '';
      startScreen.style.color = '';
      startScreen.style.display = 'none';
    }
    
    if (startTitle) {
      startTitle.style.color = '';
      startTitle.style.fontSize = '';
      startTitle.style.fontFamily = '';
      startTitle.textContent = 'AR体験を開始';
    }
    
    if (startLogo) {
      startLogo.style.display = 'none';
      startLogo.src = '';
      startLogo.style.width = '';
      startLogo.style.height = '';
      startLogo.style.maxWidth = '160px';
      startLogo.style.maxHeight = '80px';
      startLogo.style.position = '';
      startLogo.style.top = '';
      startLogo.style.left = '';
      startLogo.style.transform = '';
    }
    
    // ガイド画面のリセット
    if (guideScreen) {
      guideScreen.style.backgroundColor = '';
      guideScreen.style.background = '';
      guideScreen.style.color = '';
      guideScreen.style.display = 'none';
    }
    
    if (guideTitle) {
      guideTitle.style.color = '';
      guideTitle.style.fontSize = '';
      guideTitle.style.fontFamily = '';
      guideTitle.textContent = '画面をタップしてください';
    }
    
    if (guideDescription) {
      guideDescription.style.color = '';
      guideDescription.style.fontSize = '';
      guideDescription.style.fontFamily = '';
      guideDescription.textContent = '平らな面を見つけて画面をタップしてください';
    }
    
    if (guideImage) {
      guideImage.style.display = 'none';
      guideImage.src = '';
    }
    
    if (guideMarker) {
      guideMarker.style.display = 'none';
    }
    
    if (guideMarkerImage) {
      guideMarkerImage.src = '';
    }
    
    if (startCTA) {
      startCTA.style.backgroundColor = '';
      startCTA.style.background = '';
      startCTA.style.color = '';
      startCTA.textContent = '開始';
      startCTA.onclick = null;
    }
    
    dlog('✅ ローディング画面・スタート画面リセット完了');
  }

  function updateStatus(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    if (IS_DEBUG) console.log(`[${timestamp}] ${message}`);
    statusText.innerHTML = `<span class="${type}">[${timestamp}] ${message}</span>`;
  }

  function updateProgress(percent, message) {
    loadingBar.style.width = percent + '%';
    if (message) loadingMessage.textContent = message;
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function updateInstruction(text) {
    instruction.innerHTML = text;
  }

  // 戻るボタンイベント
  backBtn.addEventListener('click', navigateBackOrHome);

  // プロジェクト読み込み前に必ずスタイルをリセット
  resetLoadingScreenStyles();

  try {
    updateStatus('📡 プロジェクトデータ取得中', 'info');
    updateProgress(10, 'プロジェクトデータを読み込み中...');

    // プロジェクトデータ取得
    const response = await fetch(projectSrc);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    currentProject = await response.json();
    updateStatus('✅ プロジェクトデータ取得完了', 'success');
    updateProgress(30, 'プロジェクト設定を確認中...');

    dlog('📁 読み込まれたプロジェクト:', currentProject);
    dlog('🔍 プロジェクトのloadingScreen:', currentProject.loadingScreen);
    console.log('🔍 Project URL:', window.location.hash);
    console.log('🔍 Full currentProject:', JSON.stringify(currentProject, null, 2));

    // 画面設定（ローディング/スタート/ガイド）の取得
    let ls = currentProject.loadingScreen || {};
    let ss = currentProject.startScreen || {};
    let gs = currentProject.guideScreen || {};
    
    // project.jsonに埋め込まれたtemplateSettingsを最優先で適用
    console.log('🔍 ss direct check:', ss);
    console.log('🔍 ls.templateSettings check:', ls.templateSettings);
    
    // シンプルなアプローチ：直接startScreen設定を使用
    if (ls.templateSettings && ls.templateSettings.startScreen) {
      ss = ls.templateSettings.startScreen;
      console.log('🎯 直接templateSettings.startScreenを適用:', ss);
    }
    
    if (ls.templateSettings) {
      console.log('🎯 project.jsonに埋め込まれたtemplateSettingsを適用:', ls.templateSettings);
      dlog('🎯 project.jsonに埋め込まれたtemplateSettingsを適用:', ls.templateSettings);
      
      // templateSettingsから各画面設定を取得
      if (ls.templateSettings.loadingScreen) {
        ls = { ...ls.templateSettings.loadingScreen, ...ls };
      }
      if (ls.templateSettings.guideScreen) {
        gs = { ...ls.templateSettings.guideScreen, ...gs };
      }
      
      dlog('🎯 templateSettingsから設定を統合完了:', { ls, ss, gs });
    }
    
    // ビューア専用の状態管理を使用して設定を適用
    try {
      const { applyProjectLoadingSettings } = await import('../utils/loading-screen-state.js');
      const { mergeLoadingSettings } = await import('../utils/unified-loading-screen.js');
      
      const viewerSettings = applyProjectLoadingSettings(currentProject);
      const mergedSettings = mergeLoadingSettings(currentProject, viewerSettings);
      
      // templateSettingsが最優先、その後にマージされた設定を適用
      if (!ls.templateSettings) {
        ls = { ...mergedSettings.loadingScreen, ...ls };
      }
      if (!ss.title && !ls.templateSettings?.startScreen) {
        ss = { ...mergedSettings.startScreen, ...ss };
      }
      if (!gs.message && !ls.templateSettings?.guideScreen) {
        gs = { ...mergedSettings.guideScreen, ...gs };
      }
      
      dlog('🎨 統合システムでローディング画面設定を適用:', { ls, ss, gs, merged: mergedSettings });
    } catch (error) {
      console.warn('統合システムの適用に失敗、従来の方法を使用:', error);
      
      // フォールバック: エディター保存形式の処理
      const editorSettings = ls.editorSettings || null;
      if (!ss.title && !ls.templateSettings?.startScreen) {
        ss = currentProject.startScreen || (editorSettings?.startScreen || {});
      }
    }

    console.log('🎨 最終的な設定:', { ls, ss, gs });
    
    // editorSettings をスコープ外でも使用するため、ここで定義
    const editorSettings = ls.editorSettings || null;
    
    if (ls) {
      dlog('🎨 プロジェクトファイルからローディング画面設定を取得:', ls);
      
      // 設定が不完全な場合のみlocalStorageからの補完を試行（フォールバック）
      if (ls.selectedScreenId && (!ls.backgroundColor || !ls.textColor)) {
        dlog('🔍 設定が不完全のため、localStorageからの補完を試行:', ls.selectedScreenId);
        try {
          const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
          if (stored) {
            const templates = JSON.parse(stored);
            const template = templates.find(t => t.id === ls.selectedScreenId);
            if (template?.settings) {
              // ローディング画面設定を補完
              if (template.settings.loadingScreen) {
                ls = { ...template.settings.loadingScreen, ...ls };
                dlog('✅ ローディング画面設定をlocalStorageから補完:', template.name);
              }
              
              // スタート画面設定を補完
              if (template.settings.startScreen && !ss.backgroundColor && !ss.title) {
                ss = { ...template.settings.startScreen, ...ss };
                dlog('✅ スタート画面設定をlocalStorageから補完:', template.name);
              }
              
              // ガイド画面設定を補完
              if (template.settings.guideScreen) {
                currentProject.guideScreen = { ...template.settings.guideScreen, ...(currentProject.guideScreen || {}) };
                dlog('✅ ガイド画面設定をlocalStorageから補完:', template.name);
              }
            }
          }
        } catch (e) {
          console.warn('⚠️ localStorage補完失敗（プロジェクト設定を使用）:', e);
        }
      } else {
        dlog('✅ 完全な設定がプロジェクトファイルに含まれています');
      }
    }
    
    if (ls) {
      dlog('🎨 ローディング画面設定を適用:', ls);

      const loadingTitle = container.querySelector('#ar-loading-title');
      const loadingMessage = container.querySelector('#ar-loading-message');

      // editorSettings.loadingScreen から不足項目を補完
      try {
        if (editorSettings?.loadingScreen) {
          const le = editorSettings.loadingScreen;
          ls = {
            ...le,
            ...ls,
            // 優先順位: 明示的に指定された ls が勝つが、なければ le を使う
            backgroundColor: ls.backgroundColor || le.backgroundColor,
            textColor: ls.textColor || le.textColor,
            progressColor: ls.progressColor || ls.accentColor || le.progressColor || le.accentColor,
            accentColor: ls.accentColor || le.accentColor,
            loadingMessage: ls.loadingMessage || ls.message || le.loadingMessage || le.message,
            brandName: ls.brandName || le.brandName,
            subTitle: ls.subTitle || le.subTitle,
            fontScale: ls.fontScale || le.fontScale,
            showProgress: (ls.showProgress !== undefined) ? ls.showProgress : (le.showProgress !== undefined ? le.showProgress : true),
            logoType: ls.logoType || le.logoType,
            logoImage: ls.logoImage || ls.logo || le.logoImage || le.logo,
            logoPosition: (ls.logoPosition !== undefined) ? ls.logoPosition : le.logoPosition,
            logoSize: (ls.logoSize !== undefined) ? ls.logoSize : le.logoSize,
            textPosition: (ls.textPosition !== undefined) ? ls.textPosition : le.textPosition
          };
          dlog('🔄 editorSettings から不足項目を補完:', ls);
        }
      } catch (e) {
        console.warn('⚠️ editorSettings の補完に失敗（継続）:', e);
      }

      // メッセージ適用（小さめの説明文）
      if (ls.loadingMessage && loadingMessage) {
        loadingMessage.textContent = ls.loadingMessage;
        dlog('📝 メッセージ適用:', ls.loadingMessage);
      } else if (ls.message && loadingMessage) {
        loadingMessage.textContent = ls.message;
        dlog('📝 メッセージ適用（旧形式）:', ls.message);
      }

      // 背景色適用
      if (ls.backgroundColor && loadingScreen) {
        loadingScreen.style.backgroundColor = ls.backgroundColor;
        loadingScreen.style.background = ls.backgroundColor;
        dlog('🎨 背景色適用:', ls.backgroundColor);
      }

      // テキスト色適用
      if (ls.textColor) {
        if (loadingTitle) loadingTitle.style.color = ls.textColor;
        if (loadingMessage) loadingMessage.style.color = ls.textColor;
        dlog('📝 テキスト色適用:', ls.textColor);
      }

      // プログレス色適用（accentColorもしくはprogressColor）
      const progressColor = ls.progressColor || ls.accentColor;
      if (progressColor && loadingBar) {
        loadingBar.style.backgroundColor = progressColor;
        loadingBar.style.background = progressColor;
        dlog('📊 プログレス色適用:', progressColor);
      }

      // プログレスバー表示制御
      if (ls.showProgress === false && loadingBar) {
        loadingBar.style.display = 'none';
        dlog('📊 プログレスバー非表示');
        // 既存デザイン保護のため、ラッパー非表示はフラグ時のみ
        if (enableLSFlag && loadingProgressWrap) {
          loadingProgressWrap.style.display = 'none';
        }
      }

      // ブランド/サブタイトル適用（大きめの見出し）
      if (ls.brandName && loadingTitle) {
        loadingTitle.textContent = ls.brandName;
        dlog('🏢 ブランド名適用:', ls.brandName);
      } else if (ls.subTitle && loadingTitle) {
        loadingTitle.textContent = ls.subTitle;
        dlog('🏢 サブタイトル適用:', ls.subTitle);
      }

      // フォントスケール適用
      if (ls.fontScale && loadingTitle) {
        const scale = Math.max(0.5, Math.min(2.0, ls.fontScale));
        loadingTitle.style.fontSize = `${scale}em`;
        if (loadingMessage) loadingMessage.style.fontSize = `${scale * 0.8}em`;
        dlog('🔤 フォントスケール適用:', scale);
      }

      // ロゴ適用（logoTypeに応じて startScreen.logo または loadingScreen.logo を使用）
      try {
        let logoSrc = '';
        const logoType = ls.logoType || 'none';
        if (logoType === 'useStartLogo' && (ss.logo || ss.logoImage)) {
          logoSrc = ss.logo || ss.logoImage;
        } else if (logoType === 'custom' && (ls.logoImage || ls.logo)) {
          logoSrc = ls.logoImage || ls.logo;
        }
        if (logoSrc && loadingLogo) {
          loadingLogo.src = logoSrc;
          loadingLogo.style.display = 'inline-block';
          // 位置とサイズ（%/倍率ベース）
          const pos = (typeof ls.logoPosition === 'number') ? Math.max(5, Math.min(90, ls.logoPosition)) : 20;
          const px = (typeof ls.logoSize === 'number') ? Math.round(Math.max(0.5, Math.min(2.5, ls.logoSize)) * 80) : 120;
          loadingLogo.style.position = 'absolute';
          loadingLogo.style.left = '50%';
          loadingLogo.style.transform = 'translateX(-50%)';
          loadingLogo.style.top = `${pos}%`;
          loadingLogo.style.maxWidth = `${px}px`;
          loadingLogo.style.maxHeight = `${Math.round(px * 0.5)}px`;
          dlog('🏷️ ロゴ表示:', { logoType, pos, px });
        }
      } catch (e) {
        console.warn('⚠️ ロゴ適用失敗:', e);
      }

      // テキスト位置（上から%）
      try {
        const textPos = (typeof ls.textPosition === 'number') ? Math.max(5, Math.min(90, ls.textPosition)) : 40;
        if (loadingTextGroup) loadingTextGroup.style.top = `${textPos}%`;
      } catch (_) {}
    } else {
      dlog('ℹ️ ローディング画面設定が見つかりません - デフォルト状態を維持');
      // リセット関数により既にデフォルト状態が設定されているので、追加の処理は不要
    }

    // マーカー型はMarkerAR側でモデルを読むため、事前ロードを省略
    const isMarker = (currentProject.type || 'markerless') === 'marker';
    if (!isMarker) {
      updateProgress(50, '3Dモデルを読み込み中...');
      // ローディング画面をしばらく表示してカスタマイズを確認可能にする
      await new Promise(resolve => setTimeout(resolve, 800));
      if (currentProject.models && currentProject.models.length > 0) {
        await loadModels();
      }
    } else {
      updateProgress(60, 'カメラ起動の準備中...');
    }

    updateProgress(80, 'ARシステムを準備中...');
    await initAR();

    updateProgress(100, '読み込み完了');

    // スタート画面表示（保存されたStartScreen設定を反映）
    try {
      const safeName = escapeHTML(currentProject.name || 'ARプロジェクト');
      if (startScreen) startScreen.style.display = 'flex';
      // 背景
      if (ss.backgroundColor && startScreen) startScreen.style.background = ss.backgroundColor;
      // タイトル
      if (ss.title && startTitle) startTitle.textContent = ss.title; else if (startTitle) startTitle.textContent = safeName;
      if (ss.textColor && startTitle) startTitle.style.color = ss.textColor;
      // ロゴ
      if ((ss.logo || ss.logoImage) && startLogo) {
        startLogo.src = ss.logo || ss.logoImage;
        startLogo.style.display = 'inline-block';
        const pos = (typeof ss.logoPosition === 'number') ? Math.max(5, Math.min(90, ss.logoPosition)) : 20;
        const px = (typeof ss.logoSize === 'number') ? Math.round(Math.max(0.8, Math.min(2.5, ss.logoSize)) * 80) : 120;
        startLogo.style.position = 'absolute';
        startLogo.style.left = '50%';
        startLogo.style.transform = 'translateX(-50%)';
        startLogo.style.top = `${pos}%`;
        startLogo.style.maxWidth = `${px}px`;
        startLogo.style.maxHeight = `${Math.round(px * 0.5)}px`;
      }
      // CTA
      if (ss.buttonText && startCTA) startCTA.textContent = ss.buttonText;
      if (ss.buttonColor && startCTA) startCTA.style.background = ss.buttonColor;
      if (ss.buttonTextColor && startCTA) startCTA.style.color = ss.buttonTextColor;
      // ローディングは開始押下まで非表示
      if (loadingScreen) loadingScreen.style.display = 'none';
      // 既存の開始ボタンは隠す（CTAから委譲）
      startBtn.style.display = 'none';
      if (startCTA) startCTA.onclick = () => {
        if (startScreen) startScreen.style.display = 'none';
        if (loadingScreen) loadingScreen.style.display = 'flex';
        startBtn.click();
      };
      updateInstruction(`<strong>✅ ${safeName} 読み込み完了</strong><br>「開始」を押して体験を始めてください`);
    } catch (e) {
      // フォールバック（従来）
      const safeName = escapeHTML(currentProject.name || 'ARプロジェクト');
      updateInstruction(`<strong>✅ ${safeName} 読み込み完了</strong><br>画面の「AR開始」を押して体験を始めてください`);
      startBtn.style.display = 'inline-block';
    }

    // ガイド画面の設定を準備（AR開始時に表示）
    try {
      // ガイド画面の背景色設定
      if (gs.backgroundColor && guideScreen) {
        guideScreen.style.background = gs.backgroundColor;
      }
      
      // ガイド画面のモード判定（surface/world）
      const guideMode = gs.mode || (currentProject.type === 'marker' ? 'surface' : 'world');
      
      if (guideMode === 'surface' && gs.surfaceDetection) {
        // マーカー検出モード
        if (gs.surfaceDetection.title && guideTitle) {
          guideTitle.textContent = gs.surfaceDetection.title;
        }
        if (gs.surfaceDetection.description && guideDescription) {
          guideDescription.textContent = gs.surfaceDetection.description;
        }
        if (gs.surfaceDetection.guideImage && guideImage) {
          guideImage.src = gs.surfaceDetection.guideImage;
          guideImage.style.display = 'block';
        }
        // マーカー画像も表示
        if (currentProject.markerImage && guideMarkerImage) {
          guideMarkerImage.src = currentProject.markerImage;
          guideMarker.style.display = 'block';
        }
      } else if (guideMode === 'world' && gs.worldTracking) {
        // 平面検出モード
        if (gs.worldTracking.title && guideTitle) {
          guideTitle.textContent = gs.worldTracking.title;
        }
        if (gs.worldTracking.description && guideDescription) {
          guideDescription.textContent = gs.worldTracking.description;
        }
        if (gs.worldTracking.guideImage && guideImage) {
          guideImage.src = gs.worldTracking.guideImage;
          guideImage.style.display = 'block';
        }
        // マーカーは非表示
        if (guideMarker) {
          guideMarker.style.display = 'none';
        }
      }
      
      // テキスト色設定
      if (gs.textColor) {
        if (guideTitle) guideTitle.style.color = gs.textColor;
        if (guideDescription) guideDescription.style.color = gs.textColor;
      }
      
      dlog('🎯 ガイド画面設定完了:', { guideMode, gs });
    } catch (guideError) {
      console.warn('⚠️ ガイド画面設定エラー:', guideError);
    }

  } catch (error) {
    updateStatus(`❌ エラー: ${error.message}`, 'error');
    updateProgress(0, 'エラーが発生しました');
    updateInstruction('プロジェクトの読み込みに失敗しました');
  }

  // 3Dモデル読み込み
  async function loadModels() {
    updateStatus('📦 3Dモデル読み込み開始', 'info');
    
    // Three.jsの動的インポート
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    
    const loader = new GLTFLoader();
    loadedModels = [];

    for (let i = 0; i < currentProject.models.length; i++) {
      const modelInfo = currentProject.models[i];
      updateProgress(50 + (i / currentProject.models.length) * 20, `モデル読み込み中: ${modelInfo.fileName}`);

      try {
        const gltf = await new Promise((resolve, reject) => {
          loader.load(modelInfo.url, resolve, null, reject);
        });

        loadedModels.push({
          scene: gltf.scene,
          fileName: modelInfo.fileName,
          originalInfo: modelInfo
        });

        updateStatus(`✅ ${modelInfo.fileName} 読み込み完了`, 'success');
      } catch (error) {
        updateStatus(`⚠️ ${modelInfo.fileName} 読み込み失敗: ${error.message}`, 'warning');
      }
    }

    updateStatus(`📦 3Dモデル読み込み完了 (${loadedModels.length}個)`, 'success');
  }

  // AR初期化
  async function initAR() {
    updateStatus('🎨 ARシステム初期化中', 'info');
    
    // Three.jsの動的インポート
    const THREE = await import('three');

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      z-index: 2;
      pointer-events: none;
    `;

    container.appendChild(renderer.domElement);

    // ライティング
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    updateStatus('✅ ARシステム準備完了', 'success');
  }

  // AR開始
  startBtn.addEventListener('click', async () => {
    startBtn.style.display = 'none';
    
    // ローディング画面を隠してガイド画面を表示
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (guideScreen) guideScreen.style.display = 'flex';
    
    // 少し待ってからAR処理を開始（ガイド画面を見せる時間）
    setTimeout(async () => {
      if (guideScreen) guideScreen.style.display = 'none';
      
      try {
      const isMarker = (currentProject?.type || 'markerless') === 'marker';
      if (isMarker) {
        updateStatus('📹 カメラ起動中（マーカーAR）', 'warning');
        // 動的にMarkerARを読み込み
        const mod = await import('../components/ar/marker-ar.js');
        const MarkerAR = mod.MarkerAR;
        if (!arHost) throw new Error('ARホスト要素が見つかりません');

        // カスタムマーカーがあれば渡し、無ければMarkerAR側のローカル/CDN解決に委ねる
        const markerOptions = { worldScale: 1.0 };
        if (currentProject.markerUrl) {
          const badGh = /ar-js-org\.github\.io\/AR\.js\/data\//;
          if (!badGh.test(currentProject.markerUrl)) {
            markerOptions.markerUrl = currentProject.markerUrl;
          } else {
            console.warn('⚠️ 無効な旧GHパスのmarkerUrlを無視し、既定解決を使用します:', currentProject.markerUrl);
          }
        }
        const markerAR = new MarkerAR(arHost, { ...markerOptions, forceDebugCube, forceNormalMaterial });
        // 成功・喪失イベントでUIを更新（成功が一目で分かるように）
        markerAR.onMarkerFound = () => {
          updateStatus('🎯 マーカー検出成功！', 'success');
          updateInstruction('<strong>🎉 マーカーを認識しました。モデルを表示中…</strong>');
          if (markerGuide) markerGuide.style.display = 'none';
          if (markerGuideTips) markerGuideTips.style.display = 'none';
        };
        markerAR.onMarkerLost = () => {
          updateStatus('❌ マーカーを見失いました', 'warning');
          updateInstruction('<strong>📌 マーカー全体が入るように、距離と角度を調整してください</strong>');
          if (markerGuide) markerGuide.style.display = 'block';
          if (markerGuideTips) markerGuideTips.style.display = 'block';
        };
        await markerAR.init();

        // プロジェクトのモデルを順に読み込み
        arViewerLogger.info('プロジェクトモデル数:', currentProject.models?.length || 0);
        if (Array.isArray(currentProject.models)) {
          for (const m of currentProject.models) {
            arViewerLogger.debug('モデル読み込み試行:', m.url);
            try { 
              await markerAR.loadModel(m.url); 
              arViewerLogger.success('モデル読み込み成功:', m.url);
            } catch (e) {
              console.error('❌ モデル読み込み失敗:', m.url, e);
            };
          }
        }

        // ローディング非表示
        loadingScreen.style.display = 'none';
        updateInstruction('<strong>🎯 マーカーにかざしてください（Hiroでテスト可能）</strong>');
        updateStatus('✅ マーカーAR準備完了', 'success');
        // detectボタンは不要
        detectBtn.style.display = 'none';
        markerGuide.style.display = 'block';
        if (markerGuideTips) markerGuideTips.style.display = 'block';
        return;
      }

      // それ以外（従来のカメラ重畳デモ）
      updateStatus('📹 カメラ起動中', 'warning');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:1;`;
      container.appendChild(video);
      await video.play();
      loadingScreen.style.display = 'none';
      updateStatus('✅ カメラ起動成功', 'success');
      startRenderLoop();
      detectBtn.style.display = 'inline-block';
      updateInstruction('<strong>📱 画面の指示に従ってください</strong>');
    } catch (error) {
      console.error('❌ AR開始エラー:', error);
      updateStatus(`❌ AR開始失敗: ${error.message}`, 'error');

      // エラーの種類に応じたメッセージと再試行ボタンを表示
      let errorTitle = 'AR開始エラー';
      let errorMessage = '不明なエラーが発生しました。';
      let showRetryButton = true;

      if (error.message.includes('カメラ') || error.message.includes('permission') || error.name === 'NotAllowedError') {
        errorTitle = 'カメラ権限エラー';
        errorMessage = 'カメラへのアクセス権限がありません。ブラウザの設定でカメラアクセスを許可してください。';
      } else if (error.message.includes('HTTPS') || error.message.includes('secure')) {
        errorTitle = 'HTTPS必要エラー';
        errorMessage = 'AR機能を使用するにはHTTPS接続が必要です。';
        showRetryButton = false;
      } else if (error.message.includes('NotFoundError') || error.message.includes('カメラデバイスが見つかりません')) {
        errorTitle = 'カメラが見つかりません';
        errorMessage = 'カメラデバイスが見つかりません。カメラが接続されているか確認してください。';
      } else if (error.message.includes('アセット') || error.message.includes('marker') || error.message.includes('camera_para')) {
        errorTitle = 'アセット読み込みエラー';
        errorMessage = 'ARに必要なファイルの読み込みに失敗しました。インターネット接続を確認してください。';
      }

      // エラーUIを表示
      updateInstruction(`
        <div style="text-align: center; padding: 1rem;">
          <h3 style="color: #ff6b6b; margin-bottom: 0.5rem;">${errorTitle}</h3>
          <p style="margin-bottom: 1rem; font-size: 0.9em;">${errorMessage}</p>
          ${showRetryButton ? '<button id="retry-ar-btn" class="btn-primary" style="padding: 0.5rem 1rem; font-size: 0.9rem;">再試行</button>' : ''}
        </div>
      `);

      // 再試行ボタンのイベントリスナーを追加
      if (showRetryButton) {
        setTimeout(() => {
          const retryBtn = container.querySelector('#retry-ar-btn');
          if (retryBtn) {
            retryBtn.addEventListener('click', () => {
              updateInstruction('<strong>🔄 再試行中...</strong>');
              startBtn.style.display = 'inline-block';
              // ページをリロードして再試行
              window.location.reload();
            });
          }
        }, 100);
      }

      startBtn.style.display = showRetryButton ? 'inline-block' : 'none';
    }
    }, 2000); // ガイド画面表示時間: 2秒
  });

  // マーカー検出
  detectBtn.addEventListener('click', () => {
    if (markerDetected) {
      // マーカー消失
      markerDetected = false;
      arObjects.forEach(obj => scene.remove(obj));
      arObjects = [];
      markerGuide.style.display = 'block'; // マーカーを見失ったらガイドを再表示
      if (markerGuideTips) markerGuideTips.style.display = 'block'; // ヒントも再表示

      updateStatus('❌ マーカーを見失いました', 'warning');
      detectBtn.textContent = '🎯 マーカー検出';
      detectBtn.className = 'btn-success';

    } else {
      // マーカー検出
      markerDetected = true;
      createARScene();
      markerGuide.style.display = 'none'; // マーカー検出後はガイドを非表示
      if (markerGuideTips) markerGuideTips.style.display = 'none'; // ヒントも非表示

      updateStatus('🎯 マーカー検出成功！', 'success');
      updateInstruction(`
        <strong>🎉 ${currentProject.name || 'ARプロジェクト'} 表示中</strong><br>
        読み込まれた3Dモデル: ${loadedModels.length}個
      `);
      detectBtn.textContent = '❌ マーカー消失';
      detectBtn.className = 'btn-secondary';
    }
  });

  // ARシーン作成
  async function createARScene() {
    updateStatus('🎨 ARシーン構築中', 'info');
    
    const THREE = await import('three');

    if (loadedModels.length > 0) {
      // 読み込まれた3Dモデルを使用
      loadedModels.forEach((modelData, index) => {
        const model = modelData.scene.clone();

        // サイズ正規化
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z);
        const scale = 1.0 / maxSize;
        model.scale.setScalar(scale);

        // 位置調整
        model.position.set(index * 1.2 - (loadedModels.length - 1) * 0.6, 0, 0);

        scene.add(model);
        arObjects.push(model);
      });
    } else {
      // フォールバック: デフォルトオブジェクト
      const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);
      arObjects.push(cube);
    }

    updateStatus(`✅ ARオブジェクト配置完了 (${arObjects.length}個)`, 'success');
  }

  // アニメーションループ
  function startRenderLoop() {
    function animate() {
      requestAnimationFrame(animate);

      if (markerDetected && arObjects.length > 0) {
        arObjects.forEach((obj, index) => {
          obj.rotation.y += 0.01 + index * 0.005;
          obj.position.y = Math.sin(Date.now() * 0.001 + index) * 0.1;
        });
      }

      renderer.render(scene, camera);
    }

    animate();
  }
}
