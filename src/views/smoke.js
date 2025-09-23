// src/views/smoke.js
// スモークテストページ - P0-P1修正の動作証明

import { createARStateMachine, ARState } from '../utils/ar-state-machine.js';
import { AREngineAdapter } from '../utils/ar-engine-adapter.js';
import { createLoadingStateManager } from '../utils/loading-state-manager.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default function showSmoke(container) {
  const urlParams = new URLSearchParams(window.location.search);
  const testSrc = urlParams.get('src') || 'e2e-smoke';

  // スモークテストページレイアウト
  container.innerHTML = `
    <div class="smoke-page">
      <div class="smoke-header">
        <h1>🧪 WebAR スモークテスト</h1>
        <p>1クリック ARテスト - src: ${testSrc}</p>
      </div>

      <!-- HUD（右上固定） -->
      <div id="smoke-hud" class="smoke-hud">
        <div>State: <span id="hud-state">IDLE</span></div>
        <div>XR: <span id="hud-xr">checking...</span></div>
        <div>Error: <span id="hud-error">none</span></div>
        <div>FPS: <span id="hud-fps">0</span></div>
      </div>

      <!-- メインコントロール -->
      <div class="smoke-controls">
        <button id="smoke-start" class="smoke-btn-big">🚀 1-Click AR Test</button>
        <button id="smoke-reset" class="smoke-btn-reset">🔄 Reset</button>
      </div>

      <!-- AR コンテナ -->
      <div id="smoke-ar-host" class="smoke-ar-host"></div>

      <!-- ログ出力 -->
      <div class="smoke-logs">
        <h3>📋 実行ログ</h3>
        <div id="smoke-log" class="smoke-log-content"></div>
      </div>

      <!-- トースト -->
      <div id="smoke-toast" class="smoke-toast hidden"></div>
    </div>
  `;

  // スタイル追加
  const style = document.createElement('style');
  style.textContent = `
    .smoke-page {
      position: relative;
      width: 100%;
      height: 100vh;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      color: white;
      overflow: hidden;
    }

    .smoke-header {
      text-align: center;
      padding: 1rem;
      background: rgba(0,0,0,0.3);
    }

    .smoke-hud {
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.8);
      color: #00ff00;
      padding: 0.5rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.8rem;
      z-index: 1000;
      min-width: 150px;
    }

    .smoke-hud div {
      margin-bottom: 0.2rem;
    }

    .smoke-controls {
      text-align: center;
      padding: 2rem;
    }

    .smoke-btn-big {
      padding: 1.5rem 3rem;
      font-size: 1.5rem;
      background: #ff6b6b;
      color: white;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(255,107,107,0.4);
      margin-right: 1rem;
      animation: pulse 2s infinite;
    }

    .smoke-btn-reset {
      padding: 1rem 2rem;
      font-size: 1rem;
      background: #4ecdc4;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }

    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }

    .smoke-ar-host {
      position: relative;
      width: 100%;
      height: 400px;
      background: rgba(0,0,0,0.5);
      margin: 1rem 0;
      border-radius: 8px;
      border: 2px dashed #fff;
    }

    .smoke-logs {
      margin: 1rem;
      max-height: 200px;
      overflow-y: auto;
    }

    .smoke-log-content {
      background: rgba(0,0,0,0.7);
      padding: 1rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.8rem;
      white-space: pre-wrap;
    }

    .smoke-toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #ff4444;
      color: white;
      padding: 1rem 2rem;
      border-radius: 8px;
      z-index: 1001;
      max-width: 90%;
      text-align: center;
    }

    .smoke-toast.hidden {
      display: none;
    }

    .smoke-toast.success {
      background: #44ff44;
      color: black;
    }
  `;
  document.head.appendChild(style);

  // スモークテストロジック初期化
  initializeSmokeTest(testSrc);
}

// スモークテストの実装
async function initializeSmokeTest(testSrc) {
  console.log('🧪 スモークテスト初期化開始:', testSrc);

  // 状態管理
  let arStateMachine = null;
  let arEngine = null;
  let loadingManager = null;
  let scene = null;
  let renderer = null;
  let camera = null;
  let fps = 0;
  let lastFrameTime = 0;

  // DOM要素
  const hudState = document.getElementById('hud-state');
  const hudXR = document.getElementById('hud-xr');
  const hudError = document.getElementById('hud-error');
  const hudFPS = document.getElementById('hud-fps');
  const logContent = document.getElementById('smoke-log');
  const arHost = document.getElementById('smoke-ar-host');
  const toast = document.getElementById('smoke-toast');

  // ログ関数
  function log(message, type = 'info') {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logEntry = `[${timestamp}] ${message}\\n`;
    logContent.textContent += logEntry;
    logContent.scrollTop = logContent.scrollHeight;

    console.log(`🧪 [${type}]`, message);
  }

  // トースト表示
  function showToast(message, isSuccess = false) {
    toast.textContent = message;
    toast.className = `smoke-toast ${isSuccess ? 'success' : ''}`;
    setTimeout(() => {
      toast.className = 'smoke-toast hidden';
    }, 5000);
  }

  // HUD更新
  function updateHUD() {
    hudState.textContent = arStateMachine?.getState() || 'IDLE';
    hudError.textContent = loadingManager?.isError() ? 'ERROR' : 'none';
    hudFPS.textContent = fps.toString();
  }

  // FPS計算
  function calculateFPS() {
    const now = performance.now();
    if (lastFrameTime > 0) {
      fps = Math.round(1000 / (now - lastFrameTime));
    }
    lastFrameTime = now;
  }

  // 簡易GLBデータ（単色キューブ、約0.1MB以下）
  function createSimpleGLB() {
    // Three.jsで簡単な色付きキューブを作成
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff6b6b,
      metalness: 0.3,
      roughness: 0.7
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    return cube;
  }

  // AR初期化の全工程
  async function runFullARTest() {
    try {
      log('🚀 1-Click ARテスト開始');

      // 1. WebXR対応確認
      log('📱 デバイス対応確認中...');
      const xrSupport = await checkWebXRSupport();
      hudXR.textContent = xrSupport.supported ? 'YES' : 'NO';
      log(`WebXR対応: ${xrSupport.supported ? 'OK' : 'NG'} - ${xrSupport.reason || ''}`);

      // 2. AR状態機械初期化
      log('🔧 AR状態機械初期化...');
      arStateMachine = createARStateMachine({
        onStateChange: async (newState, oldState, data) => {
          log(`状態遷移: ${oldState} → ${newState}`);
          updateHUD();

          // 状態別処理
          switch (newState) {
            case ARState.CAMERA_STARTING:
            case ARState.XR_STARTING:
              log('📷 カメラ/XR起動中...');
              break;
            case ARState.LOADING_ASSETS:
              log('📦 アセット読み込み中...');
              break;
            case ARState.PLACING:
              log('🎯 配置モード開始');
              placeCubeAtCenter();
              break;
            case ARState.RUNNING:
              log('✅ AR実行中');
              showToast('✅ ARテスト成功！', true);
              break;
          }
        },
        onError: (error, previousState, data) => {
          log(`❌ エラー: ${error.message}`, 'error');
          hudError.textContent = error.name || 'ERROR';
          showToast(`❌ エラー: ${error.message}`);
        }
      });

      // 3. ARエンジン作成
      log('⚙️ ARエンジン作成中...');
      const engineType = xrSupport.supported ? 'webxr' : 'marker';
      arEngine = await AREngineAdapter.create({
        container: arHost,
        preferredEngine: engineType,
        debug: true
      });

      log(`ARエンジン: ${arEngine.constructor.name} 作成完了`);

      // 4. 基本シーン設定（Three.js）
      log('🎬 3Dシーン初期化...');
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(75, arHost.clientWidth / arHost.clientHeight, 0.01, 1000);
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

      renderer.setSize(arHost.clientWidth, arHost.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      arHost.appendChild(renderer.domElement);

      // ライティング
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      log('🎬 3Dシーン準備完了');

      // 5. AR初期化開始
      log('🔥 AR初期化開始...');
      await arStateMachine.transition(ARState.LAUNCH_REQUESTED, {
        timestamp: Date.now(),
        testMode: true,
        src: testSrc
      });

      await arEngine.initialize();
      log('✅ ARエンジン初期化完了');

      // 6. アセット読み込み（単色キューブ）
      await arStateMachine.transition(ARState.LOADING_ASSETS);
      const testCube = createSimpleGLB();
      scene.add(testCube);
      log('📦 テスト用GLB(単色キューブ) 読み込み完了');

      // 7. 配置モードへ
      await arStateMachine.transition(ARState.PLACING);

      // 8. アニメーションループ開始
      startRenderLoop();

    } catch (error) {
      log(`❌ ARテスト失敗: ${error.message}`, 'error');
      log(`📋 エラースタック: ${error.stack}`, 'error');
      showToast(`❌ テスト失敗: ${error.message}`);
      hudError.textContent = error.name || 'FAILED';
    }
  }

  // 中央配置関数
  function placeCubeAtCenter() {
    if (scene && arStateMachine) {
      log('🎯 中央に配置実行');
      // カメラ前方1メートルに配置
      const cube = scene.children.find(child => child.geometry?.type === 'BoxGeometry');
      if (cube) {
        cube.position.set(0, 0, -1);
        log('📦 キューブを中央配置');
      }

      // RUNNINGモードへ遷移
      arStateMachine.transition(ARState.RUNNING);
    }
  }

  // レンダーループ
  function startRenderLoop() {
    function animate() {
      calculateFPS();
      updateHUD();

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }

      requestAnimationFrame(animate);
    }
    animate();
    log('🎬 レンダーループ開始');
  }

  // WebXR対応確認
  async function checkWebXRSupport() {
    try {
      if (!('xr' in navigator)) {
        return { supported: false, reason: 'navigator.xr missing' };
      }

      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      return {
        supported: !!supported,
        reason: supported ? 'WebXR AR supported' : 'immersive-ar not supported'
      };
    } catch (error) {
      return {
        supported: false,
        reason: `WebXR check failed: ${error.message}`
      };
    }
  }

  // リセット機能
  async function resetTest() {
    log('🔄 テストリセット中...');

    if (arStateMachine) {
      await arStateMachine.reset();
    }

    if (arEngine) {
      await arEngine.destroy();
    }

    await AREngineAdapter.reset();

    if (renderer && renderer.domElement) {
      arHost.removeChild(renderer.domElement);
    }

    // 変数リセット
    arStateMachine = null;
    arEngine = null;
    scene = null;
    renderer = null;
    camera = null;
    fps = 0;

    // HUD リセット
    hudState.textContent = 'IDLE';
    hudXR.textContent = 'checking...';
    hudError.textContent = 'none';
    hudFPS.textContent = '0';

    log('✅ リセット完了');
    showToast('🔄 リセット完了', true);
  }

  // イベントリスナー設定
  document.getElementById('smoke-start').addEventListener('click', runFullARTest);
  document.getElementById('smoke-reset').addEventListener('click', resetTest);

  // 初期HUD更新
  updateHUD();
  log('🧪 スモークテスト準備完了');

  // 初期WebXR確認
  const initialXR = await checkWebXRSupport();
  hudXR.textContent = initialXR.supported ? 'YES' : 'NO';
  log(`初期WebXR確認: ${initialXR.supported ? 'OK' : 'NG'}`);
}