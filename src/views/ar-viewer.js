// src/views/ar-viewer.js
// 統合ARビューア - QRコードからプロジェクトデータを読み込んでAR表示
import { MarkerAR } from '../components/ar/marker-ar.js';

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
  console.log('🚀 統合ARビューア開始');
  
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

  console.log('📡 プロジェクトURL:', projectSrc);

  // 統合ARビューアのHTML構造
  container.innerHTML = `
    <div class="integrated-ar-viewer">
      <!-- ローディング画面 -->
      <div id="ar-loading-screen" class="ar-loading-screen">
        <div class="loading-content">
          <h2 id="ar-loading-title">ARプロジェクトを読み込み中...</h2>
          <div class="loading-progress">
            <div id="ar-loading-bar" class="loading-bar"></div>
          </div>
          <p id="ar-loading-message">システムを初期化しています...</p>
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
    }
    
    .loading-content h2 {
      color: #ffffff;
      margin-bottom: 1rem;
      font-size: 1.5rem;
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

  // ARビューア初期化
  initIntegratedARViewer(container, projectSrc);
}

// 統合ARビューアの初期化関数
async function initIntegratedARViewer(container, projectSrc) {
  const loadingScreen = container.querySelector('#ar-loading-screen');
  const loadingBar = container.querySelector('#ar-loading-bar');
  const loadingMessage = container.querySelector('#ar-loading-message');
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

  function updateStatus(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
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

    console.log('📁 読み込まれたプロジェクト:', currentProject);

    // ローディング画面のカスタマイズ
    if (currentProject.loadingScreen) {
      const ls = currentProject.loadingScreen;
      console.log('🎨 ローディング画面設定を適用:', ls);

      const loadingTitle = container.querySelector('#ar-loading-title');
      const loadingMessage = container.querySelector('#ar-loading-message');

      // メッセージ適用
      if (ls.loadingMessage && loadingTitle) {
        loadingTitle.textContent = ls.loadingMessage;
        console.log('📝 メッセージ適用:', ls.loadingMessage);
      } else if (ls.message && loadingTitle) {
        loadingTitle.textContent = ls.message;
        console.log('📝 メッセージ適用（旧形式）:', ls.message);
      }

      // 背景色適用
      if (ls.backgroundColor && loadingScreen) {
        loadingScreen.style.backgroundColor = ls.backgroundColor;
        loadingScreen.style.background = ls.backgroundColor;
        console.log('🎨 背景色適用:', ls.backgroundColor);
      }

      // テキスト色適用
      if (ls.textColor && loadingTitle) {
        loadingTitle.style.color = ls.textColor;
        if (loadingMessage) loadingMessage.style.color = ls.textColor;
        console.log('📝 テキスト色適用:', ls.textColor);
      }

      // プログレス色適用（accentColorもしくはprogressColor）
      const progressColor = ls.progressColor || ls.accentColor;
      if (progressColor && loadingBar) {
        loadingBar.style.backgroundColor = progressColor;
        loadingBar.style.background = progressColor;
        console.log('📊 プログレス色適用:', progressColor);
      }

      // プログレスバー表示制御
      if (ls.showProgress === false && loadingBar) {
        loadingBar.style.display = 'none';
        console.log('📊 プログレスバー非表示');
      }

      // ブランド名適用
      if (ls.brandName && loadingMessage) {
        loadingMessage.textContent = ls.brandName;
        console.log('🏢 ブランド名適用:', ls.brandName);
      } else if (ls.subTitle && loadingMessage) {
        loadingMessage.textContent = ls.subTitle;
        console.log('🏢 サブタイトル適用:', ls.subTitle);
      }

      // フォントスケール適用
      if (ls.fontScale && loadingTitle) {
        const scale = Math.max(0.5, Math.min(2.0, ls.fontScale));
        loadingTitle.style.fontSize = `${scale}em`;
        if (loadingMessage) loadingMessage.style.fontSize = `${scale * 0.8}em`;
        console.log('🔤 フォントスケール適用:', scale);
      }

      // ロゴ適用（将来の実装）
      if (ls.logo) {
        console.log('🏷️ ロゴ設定あり（将来実装）:', ls.logo);
      }
    } else {
      console.log('⚠️ ローディング画面設定が見つかりません');
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

    // ローディングは開始ボタン押下まで維持（ユーザー操作でカメラ起動）
    const safeName = escapeHTML(currentProject.name || 'ARプロジェクト');
    updateInstruction(`<strong>✅ ${safeName} 読み込み完了</strong><br>画面の「AR開始」を押して体験を始めてください`);
    startBtn.style.display = 'inline-block';

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
        const markerAR = new MarkerAR(arHost, markerOptions);
        await markerAR.init();

        // プロジェクトのモデルを順に読み込み
        if (Array.isArray(currentProject.models)) {
          for (const m of currentProject.models) {
            try { await markerAR.loadModel(m.url); } catch {};
          }
        }

        // ローディング非表示
        loadingScreen.style.display = 'none';
        updateInstruction('<strong>🎯 マーカーにかざしてください</strong>');
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
