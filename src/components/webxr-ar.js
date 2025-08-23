// WebXR AR支援モジュール
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * WebXR対応ARビューアの初期化
 */
export async function initWebXRAR(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container with id "${containerId}" not found`);
  }

  console.log('🚀 WebXR ARビューア初期化開始:', options);

  // AR対応チェック
  if (!('xr' in navigator)) {
    console.warn('⚠️ WebXR未対応ブラウザ - フォールバック表示');
    return createFallbackAR(container, options);
  }

  // WebXR ARセッションをサポートしているかチェック
  let arSupported = false;
  try {
    arSupported = await navigator.xr.isSessionSupported('immersive-ar');
    console.log('🔍 WebXR AR対応状況:', arSupported);
  } catch (error) {
    console.warn('⚠️ WebXR ARサポートチェック失敗:', error);
  }

  if (!arSupported) {
    console.log('📱 WebXR AR未対応 - カメラベースARにフォールバック');
    return createCameraBasedAR(container, options);
  }

  // WebXR ARセットアップ
  return createWebXRAR(container, options);
}

/**
 * WebXRベースのARビューア（対応デバイス用）
 */
async function createWebXRAR(container, options) {
  console.log('🌟 WebXR ARビューア作成中...');
  
  const scene = new THREE.Scene();
  
  const renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true 
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.xr.enabled = true;
  
  // ARボタンを追加
  const arButton = createARButton(renderer);
  container.appendChild(arButton);
  container.appendChild(renderer.domElement);
  
  // ライティング設定
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);
  
  // 3Dモデル格納用
  const models = [];
  
  // ARセッション開始時の処理
  renderer.xr.addEventListener('sessionstart', () => {
    console.log('✅ ARセッション開始');
    // タップで配置する仕組みを有効化
    enableHitTest(renderer, scene, models);
  });
  
  // アニメーションループ
  function animate() {
    renderer.setAnimationLoop(render);
  }
  
  function render() {
    renderer.render(scene, renderer.xr.getCamera());
  }
  
  animate();
  
  return {
    loadModel: (url) => loadModelForAR(scene, url, models),
    getScene: () => scene,
    getRenderer: () => renderer
  };
}

/**
 * カメラベースARビューア（一般的なスマホ用）
 */
async function createCameraBasedAR(container, options) {
  console.log('📱 カメラベースARビューア作成中...');
  
  // カメラストリーム取得
  const video = document.createElement('video');
  video.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 1;
  `;
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' }, // 背面カメラ
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
    
    video.srcObject = stream;
    video.play();
    container.appendChild(video);
    
    console.log('✅ カメラストリーム取得成功');
  } catch (error) {
    console.error('❌ カメラアクセスエラー:', error);
    return createFallbackAR(container, options);
  }
  
  // Three.jsレンダラーをカメラの上に重ね合わせ
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  
  const renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true 
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x000000, 0); // 透明背景
  renderer.domElement.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2;
    pointer-events: none;
  `;
  
  container.appendChild(renderer.domElement);
  
  // ライティング設定
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);
  
  // タップで配置するための仕組み
  const models = [];
  let placedModel = null;
  
  // タップ配置UI
  const instructions = document.createElement('div');
  instructions.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 20px;
    border-radius: 10px;
    text-align: center;
    z-index: 3;
    font-family: Arial, sans-serif;
  `;
  instructions.innerHTML = `
    <h3>🎯 AR体験を開始</h3>
    <p>画面をタップして3Dオブジェクトを配置してください</p>
    <button id="ar-start-btn" style="
      background: #4CAF50;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      font-size: 16px;
      cursor: pointer;
      margin-top: 10px;
    ">タップで配置</button>
  `;
  
  container.appendChild(instructions);
  
  // タップイベント
  let arActive = false;
  document.getElementById('ar-start-btn').addEventListener('click', () => {
    arActive = true;
    instructions.style.display = 'none';
    renderer.domElement.style.pointerEvents = 'auto';
    
    // 成功フィードバック
    showARFeedback('✅ タップして3Dオブジェクトを配置してください', container);
  });
  
  renderer.domElement.addEventListener('click', (event) => {
    if (!arActive) return;
    
    // 既存モデルを削除
    if (placedModel) {
      scene.remove(placedModel);
    }
    
    // 画面中央にモデルを配置（簡易版）
    if (models.length > 0) {
      placedModel = models[0].clone();
      placedModel.position.set(0, 0, -3); // カメラから3m前方
      placedModel.scale.set(0.5, 0.5, 0.5); // 適度なサイズ
      scene.add(placedModel);
      
      showARFeedback('🎉 3Dオブジェクトを配置しました！', container);
      console.log('✅ ARオブジェクト配置成功');
    }
  });
  
  // アニメーションループ
  function animate() {
    requestAnimationFrame(animate);
    
    // モデルを回転させる
    if (placedModel) {
      placedModel.rotation.y += 0.01;
    }
    
    renderer.render(scene, camera);
  }
  
  animate();
  
  return {
    loadModel: (url) => loadModelForCameraAR(scene, url, models),
    getScene: () => scene,
    getRenderer: () => renderer,
    getVideo: () => video
  };
}

/**
 * フォールバックAR（3Dビューア）
 */
async function createFallbackAR(container, options) {
  console.log('🔄 フォールバック3Dビューアに切り替え');
  
  // 既存のarViewer.jsを使用
  const { initARViewer } = await import('../components/arViewer.js');
  return initARViewer(container.id, options);
}

/**
 * ARボタン作成
 */
function createARButton(renderer) {
  const button = document.createElement('button');
  button.textContent = 'AR開始';
  button.style.cssText = `
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #4CAF50;
    color: white;
    border: none;
    padding: 15px 30px;
    font-size: 18px;
    border-radius: 25px;
    cursor: pointer;
    z-index: 10;
  `;
  
  button.addEventListener('click', async () => {
    if (button.textContent === 'AR開始') {
      button.textContent = 'AR終了';
      // ARセッション開始
    } else {
      button.textContent = 'AR開始';
      // ARセッション終了
    }
  });
  
  return button;
}

/**
 * モデル読み込み（WebXR用）
 */
async function loadModelForAR(scene, url, modelsArray) {
  const loader = new GLTFLoader();
  
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.5, 0.5, 0.5); // ARに適したサイズ
        
        modelsArray.push(model);
        console.log('✅ ARモデル読み込み成功:', url);
        resolve(model);
      },
      (progress) => {
        console.log('📥 モデル読み込み中:', Math.round((progress.loaded / progress.total) * 100) + '%');
      },
      (error) => {
        console.error('❌ ARモデル読み込みエラー:', error);
        reject(error);
      }
    );
  });
}

/**
 * モデル読み込み（カメラAR用）
 */
async function loadModelForCameraAR(scene, url, modelsArray) {
  return loadModelForAR(scene, url, modelsArray);
}

/**
 * ARフィードバック表示
 */
function showARFeedback(message, container) {
  const feedback = document.createElement('div');
  feedback.style.cssText = `
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 20px;
    z-index: 5;
    font-family: Arial, sans-serif;
  `;
  feedback.textContent = message;
  
  container.appendChild(feedback);
  
  setTimeout(() => {
    if (container.contains(feedback)) {
      container.removeChild(feedback);
    }
  }, 3000);
}

/**
 * Hit Test有効化（WebXR用）
 */
function enableHitTest(renderer, scene, models) {
  // WebXR hit testの実装
  console.log('🎯 Hit Test機能を有効化');
  // 実装は複雑なため、まずは基本的なタップ配置から始める
}