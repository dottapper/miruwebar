import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

// ローディング画面の管理クラス
class LoadingManager {
  constructor() {
    this.activeLoaders = new Map();
    this.loaderId = 0;
  }

  showLoadingScreen(options = {}) {
    const id = `loader-${++this.loaderId}`;
    const { message = 'モデルを読み込んでいます...', container = document.body } = options;
    
    // ローディング要素を作成
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading-screen';
    loadingElement.id = id;
    loadingElement.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      color: white;
      font-family: Arial, sans-serif;
    `;
    
    loadingElement.innerHTML = `
      <div class="loading-spinner" style="
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top: 4px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
      "></div>
      <div class="loading-message" style="font-size: 14px; text-align: center;">${message}</div>
      <div class="loading-progress" style="
        width: 200px;
        height: 4px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
        margin-top: 12px;
        overflow: hidden;
      ">
        <div class="progress-bar" style="
          width: 0%;
          height: 100%;
          background: #4CAF50;
          border-radius: 2px;
          transition: width 0.3s ease;
        "></div>
      </div>
    `;
    
    // スピン アニメーションのCSSを追加
    if (!document.getElementById('loading-styles')) {
      const style = document.createElement('style');
      style.id = 'loading-styles';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // コンテナに追加
    const targetContainer = typeof container === 'string' 
      ? document.getElementById(container) 
      : container;
    
    if (targetContainer) {
      targetContainer.style.position = targetContainer.style.position || 'relative';
      targetContainer.appendChild(loadingElement);
    }
    
    this.activeLoaders.set(id, {
      element: loadingElement,
      container: targetContainer
    });
    
    return id;
  }

  hideLoadingScreen(id, delay = 0) {
    const hideLoader = () => {
      const loader = this.activeLoaders.get(id);
      if (loader && loader.element && loader.element.parentNode) {
        loader.element.style.transition = 'opacity 0.3s ease';
        loader.element.style.opacity = '0';
        
        setTimeout(() => {
          if (loader.element && loader.element.parentNode) {
            loader.element.parentNode.removeChild(loader.element);
          }
          this.activeLoaders.delete(id);
        }, 300);
      }
    };
    
    if (delay > 0) {
      setTimeout(hideLoader, delay);
    } else {
      hideLoader();
    }
  }

  updateProgress(id, percent, message) {
    const loader = this.activeLoaders.get(id);
    if (!loader) return;
    
    const progressBar = loader.element.querySelector('.progress-bar');
    const messageElement = loader.element.querySelector('.loading-message');
    
    if (progressBar) {
      progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
    
    if (messageElement && message) {
      messageElement.textContent = message;
    }
  }

  cleanup() {
    this.activeLoaders.forEach((loader, id) => {
      this.hideLoadingScreen(id);
    });
    this.activeLoaders.clear();
  }

  getLoadingState() {
    return this.activeLoaders.size > 0 ? 'active' : 'hidden';
  }
}

// グローバルローディングマネージャーのインスタンス
const globalLoadingManager = new LoadingManager();

// エクスポートする関数
const showLoading = (options) => globalLoadingManager.showLoadingScreen(options);
const hideLoading = (id, delay) => globalLoadingManager.hideLoadingScreen(id, delay);
const updateLoadingProgress = (id, percent, message) => globalLoadingManager.updateProgress(id, percent, message);
const cleanupLoading = () => globalLoadingManager.cleanup();

export async function initARViewer(containerId, options = {}) {
  console.log('🎯 initARViewer開始:', { containerId, options });
  console.log('🔧 アニメーション機能を初期化中...');
  
  const container = document.getElementById(containerId);
  console.log('コンテナ要素:', container);
  
  if (!container) {
    console.error(`❌ ARViewer: コンテナID "${containerId}" が見つかりません`, {
      containerId,
      allElementsWithId: document.querySelectorAll(`#${containerId}`).length,
      documentReady: document.readyState,
      bodyChildren: document.body.children.length,
      availableContainers: Array.from(document.querySelectorAll('[id]')).map(el => el.id)
    });
    return null;
  }
  
  console.log('コンテナサイズ:', {
    clientWidth: container.clientWidth,
    clientHeight: container.clientHeight,
    offsetWidth: container.offsetWidth,
    offsetHeight: container.offsetHeight
  });
  
  const config = {
    showGrid: true,
    markerMode: false,
    backgroundColor: 0x222222,
    onModelLoaded: null,
    ...options
  };
  
  console.log('設定:', config);

  // ローディングマネージャーの初期化（コンテナIDを渡す）
  const loadingManager = {
    showLoadingScreen: (message) => showLoading({ message, container }),
    hideLoadingScreen: hideLoading,
    updateProgress: updateLoadingProgress,
    getLoadingState: () => globalLoadingManager.getLoadingState()
  };

  // Three.jsのローディングマネージャーを作成
  const threeLoadingManager = new THREE.LoadingManager(
    // onLoad
    () => {
      console.log('Loading complete - cleaning up loading screens');
      
      // 即時非表示のための強化処理
      if (loadingManager && typeof loadingManager.hideLoadingScreen === 'function') {
        loadingManager.hideLoadingScreen();
      }
      
      // 直接DOMからも削除する緊急対策
      const cleanupLoadingElements = () => {
        const selectors = [
          '.loading-screen',
          '.loading-screen-preview',
          '.app-loading-screen',
          '[class*="loading-"]',
          '[class*="miru-"]'
        ];
        
        selectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            if (el && el.parentNode) {
              // まず非表示にする
              el.style.transition = 'none';
              el.style.opacity = '0';
              el.style.visibility = 'hidden';
              el.style.display = 'none';
              el.style.pointerEvents = 'none';
              
              // 即時削除
              try {
                el.parentNode.removeChild(el);
                console.log(`Removed loading element: ${selector}`);
              } catch (e) {
                console.warn(`Failed to remove loading element ${selector}:`, e);
              }
            }
          });
        });
      };

      // 即時実行
      cleanupLoadingElements();
      
      // 100ms後に再度実行して確実に削除
      setTimeout(cleanupLoadingElements, 100);
    },
    // onProgress
    (url, itemsLoaded, itemsTotal) => {
      const progressPercent = (itemsLoaded / itemsTotal) * 100;
      console.log(`Loading file: ${url}. Loaded ${itemsLoaded}/${itemsTotal} files (${Math.floor(progressPercent)}%)`);
    },
    // onError
    (url) => {
      if (loadingManager && typeof loadingManager.hideLoadingScreen === 'function') {
        loadingManager.hideLoadingScreen();
      }
      console.error(`Error loading: ${url}`);
    }
  );

  // GLTFLoaderにThree.jsのローディングマネージャーを設定
  const loader = new GLTFLoader(threeLoadingManager);
  
  // File/Blob データを Base64 に変換するヘルパー関数
  async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Blob URL から File データを取得するヘルパー関数
  async function blobUrlToBase64(blobUrl) {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Blob URL to Base64 conversion failed:', error);
      return null;
    }
  }

  // シーン・カメラ・レンダラーの初期化
  console.log('Three.jsシーンの初期化を開始...');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(config.backgroundColor);
  console.log('シーン作成完了');

  const camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  
  // 統一したカメラ初期位置（マーカー・3Dモデル共通）
  const defaultCameraDistance = 3.5;  // より近い距離に統一
  camera.position.set(0, defaultCameraDistance * 0.3, defaultCameraDistance);  // 正面・ちょい引き・ちょい斜め上
  camera.lookAt(0, 0, 0);
  console.log('カメラ作成完了');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth || 800, container.clientHeight || 600);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  console.log('レンダラー作成完了');
  
  console.log('レンダラーをコンテナに追加...');
  container.appendChild(renderer.domElement);
  console.log('レンダラーをコンテナに追加完了');

  // OrbitControlsとTransformControlsの設定
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  
  // マーカー・3Dモデル共通の適切な距離設定
  controls.minDistance = 1.0;  // 最小距離を適度に設定
  controls.maxDistance = 20;   // 最大距離を適度に制限
  controls.target.set(0, 0, 0);

  // OrientationCube (方向キューブ) の追加
  // 小さなシーンとカメラを作成
  const cubeScene = new THREE.Scene();
  const cubeCamera = new THREE.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.1, 10);
  cubeCamera.position.set(0, 0, 5);
  cubeCamera.lookAt(0, 0, 0);

  // キューブの作成
  const cubeSize = 0.65;
  const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  
  // 各面のマテリアルを作成（6つの面、それぞれに異なる色を設定）
  const cubeMaterials = [
    new THREE.MeshBasicMaterial({ color: 0xff5555, transparent: true, opacity: 0.8 }), // 右面 (X+)
    new THREE.MeshBasicMaterial({ color: 0x5555ff, transparent: true, opacity: 0.8 }), // 左面 (X-)
    new THREE.MeshBasicMaterial({ color: 0x55ff55, transparent: true, opacity: 0.8 }), // 上面 (Y+)
    new THREE.MeshBasicMaterial({ color: 0xffff55, transparent: true, opacity: 0.8 }), // 下面 (Y-)
    new THREE.MeshBasicMaterial({ color: 0xff55ff, transparent: true, opacity: 0.8 }), // 前面 (Z+)
    new THREE.MeshBasicMaterial({ color: 0x55ffff, transparent: true, opacity: 0.8 })  // 後面 (Z-)
  ];
  
  // 軸の色を定義
  const axisColors = {
    x: 0xff5555, // 赤 (X軸)
    y: 0x55ff55, // 緑 (Y軸)
    z: 0x5555ff  // 青 (Z軸)
  };
  
  // キューブのエッジを強調表示するための線
  const edgeGeometry = new THREE.EdgesGeometry(cubeGeometry);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 });
  const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  
  // キューブを作成
  const orientationCube = new THREE.Mesh(cubeGeometry, cubeMaterials);
  orientationCube.add(edges);

  // テキストラベル（各軸の方向を示す）
  const addAxisLabel = (text, position, color) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = `rgb(${color.r * 255}, ${color.g * 255}, ${color.b * 255})`;
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(0.3, 0.3, 0.3);
    orientationCube.add(sprite);
  };
  
  const xColor = new THREE.Color(axisColors.x);
  const yColor = new THREE.Color(axisColors.y);
  const zColor = new THREE.Color(axisColors.z);
  
  addAxisLabel('X', new THREE.Vector3(cubeSize * 0.7, 0, 0), xColor);
  addAxisLabel('Y', new THREE.Vector3(0, cubeSize * 0.7, 0), yColor);
  addAxisLabel('Z', new THREE.Vector3(0, 0, cubeSize * 0.7), zColor);
  
  // キューブを追加
  cubeScene.add(orientationCube);
  
  // 軸のヘルパーを追加（オプション）
  const axisHelper = new THREE.AxesHelper(cubeSize * 0.9);
  orientationCube.add(axisHelper);
  
  // キューブ用のレンダラー（メインレンダラーから作成）
  const cubeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  cubeRenderer.setSize(80, 80); // キューブの表示サイズ
  cubeRenderer.setClearColor(0x000000, 0); // 透明な背景
  
  // キューブのDOMスタイル設定
  cubeRenderer.domElement.style.position = 'absolute';
  cubeRenderer.domElement.style.top = '10px';
  cubeRenderer.domElement.style.right = '10px';
  cubeRenderer.domElement.style.border = '1px solid rgba(255, 255, 255, 0.2)';
  cubeRenderer.domElement.style.borderRadius = '8px';
  cubeRenderer.domElement.style.zIndex = '1000';
  cubeRenderer.domElement.style.cursor = 'pointer';
  cubeRenderer.domElement.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
  cubeRenderer.domElement.title = 'クリックすると正面ビューに戻ります';
  
  // コンテナに追加
  container.appendChild(cubeRenderer.domElement);
  
  // クリックイベントを追加 - 正面ビュー（デフォルトカメラ位置）に戻る
  cubeRenderer.domElement.addEventListener('click', resetCameraToFrontView);

  const transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.addEventListener('dragging-changed', function (event) {
    controls.enabled = !event.value; // ドラッグ中は OrbitControls を無効化
  });
  transformControls.addEventListener('objectChange', () => {
    if (activeModelIndex < 0 || !modelList[activeModelIndex]) {
      console.warn("objectChange triggered but no active model found.");
      return;
    }
    const modelData = modelList[activeModelIndex];
    const model = modelData.model;
    modelData.position.copy(model.position);
    modelData.rotation.copy(model.rotation);
    modelData.scale.copy(model.scale);
    console.log('Model Scale:', model.scale.x, model.scale.y, model.scale.z); 
    const event = new CustomEvent('transformChanged', {
      detail: {
        index: activeModelIndex,
        position: { x: model.position.x, y: model.position.y, z: model.position.z },
        rotation: {
          x: THREE.MathUtils.radToDeg(model.rotation.x),
          y: THREE.MathUtils.radToDeg(model.rotation.y),
          z: THREE.MathUtils.radToDeg(model.rotation.z)
        },
        scale: { x: model.scale.x, y: model.scale.y, z: model.scale.z }
      }
    });
    container.dispatchEvent(event);
  });
  
  scene.add(transformControls);

  // ライトとグリッドヘルパー
  console.log('ライティングの設定を開始...');
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.1); // ← 0.6 から 2.1 に変更　全体のライトを調整
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3); // ← 0.8 から 0.3 に変更
  directionalLight.position.set(5, 10, 7.5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  const d = 5;
  directionalLight.shadow.camera.left = -d;
  directionalLight.shadow.camera.right = d;
  directionalLight.shadow.camera.top = d;
  directionalLight.shadow.camera.bottom = -d;
  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 20;
  directionalLight.shadow.bias = -0.001;
  scene.add(directionalLight);
  console.log('ライティング設定完了');

  // モデル管理用変数
  const modelList = [];
  let activeModelIndex = -1;
  let gridHelper = null; // グリッドヘルパーの参照を格納

  // グリッドヘルパー（設定で有効な場合のみ）
  console.log('グリッドの設定を開始...', { showGrid: config.showGrid });
  try {
    if (config.showGrid) {
      console.log('Creating GridHelper...');
      gridHelper = new THREE.GridHelper(10, 10, 0x777777, 0xbbbbbb);
      console.log('GridHelper created successfully');
      gridHelper.position.y = -0.01;
      scene.add(gridHelper);
      console.log('グリッドヘルパー追加完了');
    } else {
      console.log('グリッドは無効化されています');
    }
  } catch (error) {
    console.error('GridHelper creation failed:', error);
    console.log('Continuing without grid...');
  }

  // マーカー（ARマーカーモードの場合）
  let markerPlane, markerMaterial;
  if (config.markerMode) {
    const markerSize = 1;
    const markerGeometry = new THREE.PlaneGeometry(markerSize, markerSize);
    markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.FrontSide, // 表面のみ表示
      transparent: false, // 透明度を無効化
      opacity: 1.0,
      map: null,
      // テクスチャの品質を向上
      alphaTest: 0, // アルファテストを無効化
      depthWrite: true // 深度書き込みを有効化
    });
    markerPlane = new THREE.Mesh(markerGeometry, markerMaterial);
    markerPlane.rotation.x = -Math.PI / 2;
    markerPlane.position.y = 0;
    scene.add(markerPlane);
  }
  const objectUrls = new Map();
  
  // アニメーション制御関連
  const animationMixers = new Map(); // モデルごとのAnimationMixer
  const animationClips = new Map(); // モデルごとのAnimationClip配列
  const animationActions = new Map(); // モデルごとの再生中のAnimationAction
  const clock = new THREE.Clock(); // アニメーション用の時間管理
  // 選択オブジェクト表示用のBoxHelper
  let boundingBox = null;

  function createModelData(model, objectUrl, fileName, fileSize, animations = [], sourceFile = null) {
    const modelData = {
      model,
      objectUrl,
      fileName,
      fileSize,
      
      // IndexedDB対応：Blobベースの保存システム
      _sourceBlob: null,     // 保存用Blob（後で設定される）
      _sourceFile: sourceFile, // 元ファイル参照
      modelId: null,         // IndexedDBのキー（保存時に設定）
      
      // 変形設定
      position: model.position.clone(),
      rotation: model.rotation.clone(),
      scale: model.scale.clone(),
      
      // 初期状態を保存（リセット用）
      initialPosition: model.position.clone(),
      initialRotation: model.rotation.clone(),
      initialScale: model.scale.clone(),
      initialCameraPosition: null,
      initialCameraTarget: null,
      visible: true,
      
      // アニメーション情報
      animations: animations,
      hasAnimations: animations.length > 0,
      
      // IndexedDBメタデータ
      mimeType: sourceFile?.type || 'model/gltf-binary',
      lastModified: Date.now(),
      uploadedAt: Date.now()
    };
    
    return modelData;
  }

  function disposeModelResources(modelData) {
    if (!modelData || !modelData.model) {
      console.warn('disposeModelResources: 無効なmodelDataが渡されました');
      return;
    }

    try {
      // Object URLを解放
      if (modelData.objectUrl && modelData.objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(modelData.objectUrl);
        objectUrls.delete(modelData.model);
        console.log(`Object URL解放: ${modelData.objectUrl}`);
      }

      // モデルのリソースを再帰的に解放
      modelData.model.traverse(child => {
        if (child.isMesh) {
          // ジオメトリの解放
          if (child.geometry) {
            child.geometry.dispose();
          }

          // マテリアルの解放
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => {
                disposeMaterial(material);
              });
            } else {
              disposeMaterial(child.material);
            }
          }
        }
      });

      console.log(`モデルリソース解放完了: ${modelData.fileName || 'Unknown'}`);
    } catch (error) {
      console.error('disposeModelResources内でエラーが発生:', error);
    }
  }

  // マテリアルを安全に解放するヘルパー関数
  function disposeMaterial(material) {
    if (!material) return;

    try {
      // テクスチャを解放
      if (material.map) material.map.dispose();
      if (material.normalMap) material.normalMap.dispose();
      if (material.roughnessMap) material.roughnessMap.dispose();
      if (material.metalnessMap) material.metalnessMap.dispose();
      if (material.emissiveMap) material.emissiveMap.dispose();
      if (material.aoMap) material.aoMap.dispose();

      // マテリアル自体を解放
      material.dispose();
    } catch (error) {
      console.error('disposeMaterial内でエラーが発生:', error);
    }
  }

  // IndexedDB対応モデル読み込み関数
  async function loadModel(modelUrl, fileName = 'model.glb', fileSize = 0, sourceFile = null) {
    let createdObjectUrl = null;
    const loaderId = loadingManager.showLoadingScreen(`モデル "${fileName}" を読み込んでいます...`);
    
    try {
      let storedModelBlob = null;
      
      // モデルのURLを準備とBlob保存の準備
      if (modelUrl instanceof Blob || modelUrl instanceof File) {
        createdObjectUrl = URL.createObjectURL(modelUrl);
        
        // IndexedDB保存用にBlobを保持
        storedModelBlob = modelUrl;
        modelUrl = createdObjectUrl;
      } else if (typeof modelUrl === 'string' && modelUrl.startsWith('blob:')) {
        // Blob URLの場合はfetchでBlobを取得
        try {
          const response = await fetch(modelUrl);
          storedModelBlob = await response.blob();
        } catch (error) {
          console.warn('⚠️ Blob URL変換に失敗:', error);
          storedModelBlob = null;
        }
      } else {
        // 通常のURLの場合（外部URL等）
        storedModelBlob = null;
      }
      
      // モデルを読み込む
      loadingManager.updateProgress(loaderId, 20, 'モデルデータを解析中...');
      const gltf = await loader.loadAsync(modelUrl);
      const model = gltf.scene;
      
      // アニメーション情報を取得
      const animations = gltf.animations || [];
      
      let storedObjectUrl = null;
      if (modelUrl.startsWith('blob:')) {
        storedObjectUrl = modelUrl;
        objectUrls.set(model, storedObjectUrl);
      }
      
      // モデルの設定
      loadingManager.updateProgress(loaderId, 40, 'モデルを設定中...');
      model.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // バウンディングボックス計算とスケール・位置調整
      loadingManager.updateProgress(loaderId, 60, 'モデルのサイズを調整中...');
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      if (config.onModelLoaded) {
        config.onModelLoaded(size);
      }

      const maxSize = Math.max(size.x, size.y, size.z);
      let scale = 1.0;
      if (isFinite(maxSize) && maxSize > 1e-6) {
        const targetSize = config.markerMode ? 0.5 : 2.0;
        scale = targetSize / maxSize;
        scale = isFinite(scale) ? scale : 1.0;
      }
      
      scale = Math.max(0.01, Math.min(100, scale));
      model.scale.set(scale, scale, scale);

      // モデルの位置を調整
      box.setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      
      if (center && isFinite(center.x) && isFinite(center.y) && isFinite(center.z) &&
          box && box.min && isFinite(box.min.y)) {
        model.position.sub(center);
        model.position.y -= box.min.y;
      } else {
        model.position.set(0, 0, 0);
      }

      // IndexedDB対応createModelDataに正しいデータを渡す
      const modelData = createModelData(model, createdObjectUrl, fileName, fileSize, animations, sourceFile);
      
      // IndexedDB保存用のBlobを設定
      if (storedModelBlob) {
        modelData._sourceBlob = storedModelBlob;
      }
      
      
      
      modelData.position.copy(model.position);
      modelData.rotation.copy(model.rotation);
      modelData.scale.copy(model.scale);
      
      // アニメーションセットアップ
      console.log('🎭 アニメーションセットアップ開始:');
      console.log('- アニメーション数:', animations.length);
      if (animations.length > 0) {
        try {
          console.log('🔄 AnimationMixer作成開始...');
          const mixer = new THREE.AnimationMixer(model);
          
          console.log('🔄 アニメーションクリップ検証...');
          const validAnimations = animations.filter(clip => {
            if (!clip) {
              console.warn('⚠️ null/undefinedアニメーションクリップを除外');
              return false;
            }
            if (!clip.tracks || clip.tracks.length === 0) {
              console.warn('⚠️ トラックが空のアニメーションクリップを除外:', clip.name);
              return false;
            }
            return true;
          });
          
          if (validAnimations.length === 0) {
            console.warn('⚠️ 有効なアニメーションクリップが見つかりません');
          } else {
            animationMixers.set(model, mixer);
            animationClips.set(model, validAnimations);
            
            // 最初のアニメーションを準備（再生はしない）
            console.log('🔄 最初のアニメーションアクション作成...');
            const firstAction = mixer.clipAction(validAnimations[0]);
            animationActions.set(model, [firstAction]);
            
            console.log(`✅ アニメーションMixerを設定: ${validAnimations[0].name}`);
            console.log('- animationMixers.size:', animationMixers.size);
            console.log('- animationClips.size:', animationClips.size);
            console.log('- 有効なアニメーション数:', validAnimations.length);
          }
        } catch (error) {
          console.error('❌ アニメーションミキサー初期化エラー:', error);
          console.error('- エラー詳細:', error.message);
          console.error('- model:', model);
          console.error('- animations:', animations);
          // アニメーションエラーでもモデル読み込みは継続
        }
      } else {
        console.log('❌ アニメーションが見つかりませんでした');
      }
      
      // カメラを適切な位置に調整してからその位置を保存
      adjustCameraToModel(model);  
      modelData.initialCameraPosition = camera.position.clone();
      modelData.initialCameraTarget = controls.target.clone();
      
      modelList.push(modelData);

      loadingManager.updateProgress(loaderId, 80, 'モデルを配置中...');
      scene.add(model);
      
      // ローディング完了 - 即時非表示
      loadingManager.updateProgress(loaderId, 100, 'モデルの読み込みが完了しました');
      loadingManager.hideLoadingScreen(loaderId, 0); // 遅延なしで非表示
      
      return modelList.length - 1;
    } catch (error) {
      console.error('モデル読み込みエラー:', error);
      
      // エラー時のクリーンアップ
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
      
      // エラーメッセージを表示
      loadingManager.updateProgress(loaderId, 0, `エラーが発生しました: ${error.message}`);
      loadingManager.hideLoadingScreen(loaderId, 0); // エラー時も即時非表示
      
      throw error;
    }
  }

  // モデルの表示・非表示制御
  function _setModelVisibility(index, visible) {
    if (index >= 0 && index < modelList.length) {
      const modelData = modelList[index];
      modelData.visible = visible;
      const isInScene = modelData.model.parent === scene;
      if (visible && !isInScene) {
        scene.add(modelData.model);
      } else if (!visible && isInScene) {
        scene.remove(modelData.model);
      }
      return true;
    }
    return false;
  }

  // アクティブモデルの設定
  function setActiveModel(index) {
    console.log('🎯 setActiveModel() 呼び出し:');
    console.log('- 新しいインデックス:', index);
    console.log('- 現在のactiveModelIndex:', activeModelIndex);
    console.log('- modelList長さ:', modelList.length);
    if (index >= 0 && index < modelList.length) {
      const modelData = modelList[index];
      console.log('- 設定予定モデル:', modelData.fileName);
      console.log('- アニメーション有り:', modelData.hasAnimations);
      console.log('- アニメーション数:', modelData.animations?.length || 0);
    }
    
    if (index === activeModelIndex) return false;
    const previousActiveIndex = activeModelIndex;
    if (previousActiveIndex >= 0 && previousActiveIndex < modelList.length) {
      if (!modelList[previousActiveIndex].visible) {
        _setModelVisibility(previousActiveIndex, true);
      }
    }
    
    // 古いバウンディングボックスを削除
    if (boundingBox) {
      scene.remove(boundingBox);
      boundingBox = null;
    }
    
    if (index >= 0 && index < modelList.length) {
      _setModelVisibility(index, true);
      activeModelIndex = index;
      const activeModelData = modelList[activeModelIndex];
      applyModelTransform(activeModelData);
      
      // 新しいモデルに水色のバウンディングボックスを追加
      boundingBox = new THREE.BoxHelper(activeModelData.model, 0x00ffff);
      scene.add(boundingBox);
      
      // TransformControlsをアタッチ
      transformControls.detach();
      transformControls.attach(activeModelData.model);
      transformControls.visible = true;
    } else {
      activeModelIndex = -1;
      // TransformControlsを非表示に
      transformControls.detach();
      transformControls.visible = false;
    }
    const activeModelChangedEvent = new CustomEvent('activeModelChanged', {
      detail: { index: activeModelIndex, previousIndex: previousActiveIndex }
    });
    container.dispatchEvent(activeModelChangedEvent);
    return true;
  }

  // モデルのトランスフォーム適用
  function applyModelTransform(modelData) {
    if (!modelData || !modelData.model) return;
    modelData.model.position.copy(modelData.position);
    modelData.model.rotation.copy(modelData.rotation);
    modelData.model.scale.copy(modelData.scale);
  }

  // カメラ位置の調整（モデル中心に合わせる）
  function adjustCameraToModel(model) {
    if (!model) return;
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    
    let distance;
    if (config.markerMode) {
      // マーカーモードの場合は統一した固定距離を使用
      distance = defaultCameraDistance;
    } else {
      // 非マーカーモードの場合は、統一した固定距離をベースにしつつ、必要に応じて調整
      const fov = camera.fov * (Math.PI / 180);
      const calculatedDistance = (maxDim > 1e-6) ? (maxDim / (2 * Math.tan(fov / 2))) * 1.8 : defaultCameraDistance;
      // 統一した距離感を保つため、計算距離とデフォルト距離の中間値を使用
      distance = Math.max(defaultCameraDistance, Math.min(calculatedDistance, defaultCameraDistance * 1.5));
    }
    
    const modelWorldCenter = new THREE.Vector3();
    const worldBox = box.clone().applyMatrix4(model.matrixWorld);
    worldBox.getCenter(modelWorldCenter);
    
    // 統一した構図でカメラを配置（マーカーモードと同じ比率）
    const newCameraPos = new THREE.Vector3(
      modelWorldCenter.x,                    // X軸: 正面（中央）
      modelWorldCenter.y + distance * 0.3,  // Y軸: ちょい斜め上（統一した比率）
      modelWorldCenter.z + distance         // Z軸: 統一した距離感
    );
    
    camera.position.copy(newCameraPos);
    camera.near = Math.max(0.01, distance * 0.1);
    camera.far = distance * 10;
    camera.updateProjectionMatrix();
    controls.target.copy(modelWorldCenter); 
    
    // 統一した距離制限を設定
    controls.minDistance = 1.0;
    controls.maxDistance = 20;
    controls.update();
  }

  // マーカーモード用のカメラ調整
  function adjustCameraForMarker() {
    if (!config.markerMode) return;
    
    const targetDistance = defaultCameraDistance;  // 統一した距離を使用
    
    // マーカーの中心位置を取得（マーカーは原点に配置されている）
    const markerCenter = new THREE.Vector3(0, 0, 0);
    if (markerPlane) {
      markerCenter.copy(markerPlane.position);
    }
    
    // 統一した構図でカメラを配置（3Dモデルと同じ比率・同じ距離）
    const newCameraPos = new THREE.Vector3(
      markerCenter.x,                        // X軸: 正面（中央）
      markerCenter.y + targetDistance * 0.3, // Y軸: ちょい斜め上（統一した比率）
      markerCenter.z + targetDistance        // Z軸: 統一した距離感
    );
    
    camera.position.copy(newCameraPos);
    camera.near = Math.max(0.01, targetDistance * 0.1);
    camera.far = targetDistance * 10;
    camera.updateProjectionMatrix();
    controls.target.copy(markerCenter);
    
    // 統一した距離制限を設定（3Dモデルと同じ）
    controls.minDistance = 1.0;
    controls.maxDistance = 20;
    controls.update();
  }

  // マーカーテクスチャ設定
  function setMarkerTexture(textureUrl) {
    if (config.markerMode && markerMaterial) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(textureUrl, texture => {
        // テクスチャの品質設定
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.flipY = true; // 上下反転を修正
        texture.colorSpace = THREE.SRGBColorSpace; // 色空間を正しく設定
        
        // 画像の縦横比を取得
        const img = texture.image;
        const aspectRatio = img.width / img.height;
        
        // マーカー平面のジオメトリを縦横比に合わせて更新
        const markerSize = 1;
        let width, height;
        
        if (aspectRatio > 1) {
          // 横長画像
          width = markerSize;
          height = markerSize / aspectRatio;
        } else {
          // 縦長または正方形画像
          width = markerSize * aspectRatio;
          height = markerSize;
        }
        
        // 新しいジオメトリを作成
        const newGeometry = new THREE.PlaneGeometry(width, height);
        
        // 古いジオメトリを破棄
        if (markerPlane.geometry) {
          markerPlane.geometry.dispose();
        }
        
        // 新しいジオメトリを適用
        markerPlane.geometry = newGeometry;
        
        // マテリアルの設定を更新
        markerMaterial.map = texture;
        markerMaterial.transparent = false; // 透明度を無効化
        markerMaterial.opacity = 1.0;
        markerMaterial.alphaTest = 0; // アルファテストを無効化
        markerMaterial.needsUpdate = true;
        
        // マーカー設定時にカメラを調整（統一した視点にする）
        adjustCameraForMarker();
        
        console.log(`マーカーテクスチャ設定完了: ${img.width}x${img.height} (縦横比: ${aspectRatio.toFixed(2)}), カメラ調整済み`);
      }, undefined, error => {
        console.error('マーカーテクスチャの読み込みに失敗:', error);
        markerMaterial.map = null;
        markerMaterial.transparent = true;
        markerMaterial.opacity = 0.5;
        markerMaterial.needsUpdate = true;
      });
    }
  }

  if (config.markerMode) {
    // マーカーモード初期化時にカメラを調整
    adjustCameraForMarker();
    
    const markerImageUrl = localStorage.getItem('markerImageUrl');
    if (markerImageUrl) {
      setMarkerTexture(markerImageUrl);
    } else {
      setMarkerTexture('/assets/sample-marker.jpg');
    }
  }

  // ウィンドウリサイズ対応
  function onWindowResize() {
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.render(scene, camera);
  }
  window.addEventListener('resize', onWindowResize);

  // クリックイベントとRaycaster
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  renderer.domElement.addEventListener('click', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const selectableObjects = [];
    modelList.forEach(modelData => {
      if (modelData.visible) {
        modelData.model.traverse(child => {
          if (child.isMesh) selectableObjects.push(child);
        });
      }
    });
    const intersects = raycaster.intersectObjects(selectableObjects, true);
    if (intersects.length > 0) {
      const selectedMesh = intersects[0].object;
      let targetModel = null;
      let targetModelIndex = -1;
      selectedMesh.traverseAncestors(ancestor => {
        if (targetModel) return;
        const foundIndex = modelList.findIndex(data => data.model === ancestor);
        if (foundIndex !== -1) {
          targetModel = modelList[foundIndex].model;
          targetModelIndex = foundIndex;
        }
      });
      if (targetModel && targetModelIndex !== -1) {
        // モデルが見つかった場合は setActiveModel を呼び出す
        // setActiveModel でバウンディングボックスとTransformControlsを処理するようになった
        if (targetModelIndex !== activeModelIndex) {
          setActiveModel(targetModelIndex);
        }
      }
    } else {
      // 何も選択されていない場合は全て解除
      transformControls.detach();
      transformControls.visible = false;
      if (boundingBox) {
        scene.remove(boundingBox);
        boundingBox = null;
      }
      if (activeModelIndex >= 0) {
        activeModelIndex = -1;
        const activeModelChangedEvent = new CustomEvent('activeModelChanged', {
          detail: { index: -1, previousIndex: activeModelIndex }
        });
        container.dispatchEvent(activeModelChangedEvent);
      }
    }
  });

  // 正面ビューにカメラをリセットする関数
  function resetCameraToFrontView() {
    // アクティブなモデルがある場合はモデルを中心に
    if (activeModelIndex >= 0 && modelList[activeModelIndex] && modelList[activeModelIndex].model) {
      const model = modelList[activeModelIndex].model;
      adjustCameraToModel(model);
    } else if (config.markerMode) {
      // マーカーモードの場合は統一したマーカー用カメラ位置
      adjustCameraForMarker();
    } else {
      // モデルがない場合はデフォルト位置に（統一した距離感）
      camera.position.set(0, defaultCameraDistance * 0.3, defaultCameraDistance);
      controls.target.set(0, 0, 0);
      camera.updateProjectionMatrix();
      controls.update();
    }
    
    // ユーザーに視覚的なフィードバックを提供
    const feedback = document.createElement('div');
    feedback.textContent = '正面ビューに戻りました';
    feedback.style.position = 'absolute';
    feedback.style.top = '100px';
    feedback.style.right = '10px';
    feedback.style.padding = '8px 12px';
    feedback.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    feedback.style.color = 'white';
    feedback.style.borderRadius = '4px';
    feedback.style.fontSize = '12px';
    feedback.style.transition = 'opacity 1s';
    feedback.style.opacity = '1';
    feedback.style.zIndex = '1001';
    
    container.appendChild(feedback);
    
    // 2秒後にフィードバックを消す
    setTimeout(() => {
      feedback.style.opacity = '0';
      setTimeout(() => {
        container.removeChild(feedback);
      }, 1000);
    }, 2000);
  }

  // アニメーションループを修正して方向キューブも更新
  let animationFrameId = null;
  let lastWidth = container.clientWidth, lastHeight = container.clientHeight;
  function animate() {
    animationFrameId = requestAnimationFrame(animate);
    
    // AnimationMixerを更新
    const delta = clock.getDelta();
    animationMixers.forEach(mixer => {
      mixer.update(delta);
    });
    
    if (container && (lastWidth !== container.clientWidth || lastHeight !== container.clientHeight)) {
      lastWidth = container.clientWidth;
      lastHeight = container.clientHeight;
      onWindowResize();
    }
    controls.update();
    
    // バウンディングボックスを更新（選択されたオブジェクトの位置・回転・スケールに合わせる）
    if (boundingBox && activeModelIndex >= 0 && modelList[activeModelIndex]) {
      boundingBox.update();
    }
    
    // 方向キューブを更新
    if (orientationCube) {
      orientationCube.rotation.copy(camera.rotation);
      cubeRenderer.render(cubeScene, cubeCamera);
    }
    renderer.render(scene, camera);
  }
  
  console.log('アニメーションループを開始...');
  animate();
  console.log('アニメーションループ開始完了');

  function getActiveModelData() {
    if (activeModelIndex >= 0 && activeModelIndex < modelList.length) {
      return modelList[activeModelIndex];
    }
    return null;
  }

  // 外部から利用するモデルコントロール群
  const modelControls = {
    loadNewModel: async (modelSource, fileName, fileSize, sourceFile = null) => {
      try {
        console.log('🔄 loadNewModel [IndexedDB対応] 開始:', {
          modelSource: typeof modelSource,
          fileName,
          fileSize,
          hasSourceFile: !!sourceFile
        });
        loadingManager.showLoadingScreen();
        const index = await loadModel(modelSource, fileName, fileSize, sourceFile);
        setActiveModel(index);
        return index;
      } catch (error) {
        console.error("モデル読み込み失敗:", error);
        throw error;
      } finally {
        loadingManager.hideLoadingScreen();
      }
    },
    switchToModel: (index) => setActiveModel(index),
    getAllModels: () => {
      return modelList.map((data, index) => ({
        index,
        fileName: data.fileName,
        fileSize: data.fileSize,
        
        // IndexedDB対応：Blobデータを保存用に含める
        modelData: data._sourceBlob, // Blobデータ（Base64ではない）
        mimeType: data.mimeType,
        
        // その他の設定データ
        isActive: index === activeModelIndex,
        visible: data.visible,
        hasAnimations: data.hasAnimations || false,
        position: { x: data.position.x, y: data.position.y, z: data.position.z },
        rotation: {
          x: THREE.MathUtils.radToDeg(data.rotation.x),
          y: THREE.MathUtils.radToDeg(data.rotation.y),
          z: THREE.MathUtils.radToDeg(data.rotation.z)
        },
        scale: { x: data.scale.x, y: data.scale.y, z: data.scale.z }
      }));
    },
    getActiveModelIndex: () => activeModelIndex,
    setTransformMode: (mode) => {
      if (['translate', 'rotate', 'scale'].includes(mode)) {
        try {
          const currentObject = transformControls.object;
          transformControls.detach();
          transformControls.mode = mode;
          if (currentObject) {
            transformControls.attach(currentObject);
            transformControls.visible = true;
          } else if (activeModelIndex >= 0 && modelList[activeModelIndex]) {
            transformControls.attach(modelList[activeModelIndex].model);
            transformControls.visible = true;
          }
          return true;
        } catch (error) {
          return false;
        }
      }
      return false;
    },
    toggleTransformControls: (visible) => {
      transformControls.visible = visible;
      if (!visible) {
        transformControls.detach();
        // TransformControlsを非表示にする時はバウンディングボックスも非表示にするオプション
        // 必要に応じてコメントアウトを解除する
        // if (boundingBox) {
        //   scene.remove(boundingBox);
        //   boundingBox = null;
        // }
      } else if (activeModelIndex >= 0) {
        transformControls.attach(modelList[activeModelIndex].model);
        
        // TransformControlsを表示する時、バウンディングボックスも再表示
        if (!boundingBox && modelList[activeModelIndex]) {
          boundingBox = new THREE.BoxHelper(modelList[activeModelIndex].model, 0x00ffff);
          scene.add(boundingBox);
        }
      }
    },
    getActiveModelInfo: () => {
      const modelData = getActiveModelData();
      if (!modelData) return null;
      return {
        index: activeModelIndex,
        fileName: modelData.fileName,
        fileSize: modelData.fileSize,
        position: { x: modelData.position.x, y: modelData.position.y, z: modelData.position.z },
        rotation: {
          x: THREE.MathUtils.radToDeg(modelData.rotation.x),
          y: THREE.MathUtils.radToDeg(modelData.rotation.y),
          z: THREE.MathUtils.radToDeg(modelData.rotation.z)
        },
        scale: { x: modelData.scale.x, y: modelData.scale.y, z: modelData.scale.z }
      };
    },
    removeModel: (index) => {
      console.log(`removeModel呼び出し: インデックス=${index}, モデル数=${modelList.length}`);
      
      if (index < 0 || index >= modelList.length) {
        console.error(`無効なモデルインデックス: ${index} (有効範囲: 0-${modelList.length - 1})`);
        return false;
      }

      try {
        const removedModelData = modelList[index];
        console.log(`削除対象モデル: ${removedModelData.fileName || 'Unknown'}`);
        
        // Detach TransformControls if it's attached to the model being removed
        if (transformControls && transformControls.object === removedModelData.model) {
          transformControls.detach();
          transformControls.visible = false;
        }

        // Remove bounding box if it exists
        if (boundingBox) {
          scene.remove(boundingBox);
          boundingBox = null;
        }

        // Remove the model from the scene
        if (removedModelData.model && removedModelData.model.parent) {
          scene.remove(removedModelData.model);
        }
        
        // Dispose resources
        disposeModelResources(removedModelData);
        
        // Remove from model list
        modelList.splice(index, 1);
        
        // Update active model index
        let newActiveIndex = -1;
        if (modelList.length === 0) {
          activeModelIndex = -1;
          if (transformControls) {
            transformControls.detach();
            transformControls.visible = false;
          }
        } else if (activeModelIndex === index) {
          newActiveIndex = Math.min(0, modelList.length - 1);
        } else if (activeModelIndex > index) {
          newActiveIndex = activeModelIndex - 1;
        } else {
          newActiveIndex = activeModelIndex;
        }
        
        setActiveModel(newActiveIndex);
        
        // Dispatch model list changed event
        const modelListChangedEvent = new CustomEvent('modelListChanged', {
          detail: { models: modelControls.getAllModels(), activeModelIndex: newActiveIndex }
        });
        container.dispatchEvent(modelListChangedEvent);
        
        console.log(`モデル削除完了: インデックス=${index}, 新しいアクティブインデックス=${newActiveIndex}`);
        return true;
      } catch (error) {
        console.error('removeModel内でエラーが発生:', error);
        return false;
      }
    },
    setScale: (scale) => {
      const modelData = getActiveModelData();
      if (modelData) {
        const newScale = Math.max(0.001, scale);
        modelData.model.scale.set(newScale, newScale, newScale);
        modelData.scale.copy(modelData.model.scale);
      }
    },
    setRotationY: (angleInDegrees) => {
      const modelData = getActiveModelData();
      if (modelData) {
        const radians = THREE.MathUtils.degToRad(angleInDegrees);
        modelData.model.rotation.y = radians;
        modelData.rotation.y = radians;
      }
    },
    setPosition: (x, y, z) => {
      const modelData = getActiveModelData();
      if (modelData) {
        modelData.model.position.set(x, y, z);
        modelData.position.copy(modelData.model.position);
      }
    },
     // --- ↓↓↓ リセット機能を追加 ↓↓↓ ---
     resetScaleRatio: () => {
      const modelData = getActiveModelData(); // 現在アクティブなモデルのデータを取得
      if (modelData && modelData.model) {
        const model = modelData.model;
        const currentScale = model.scale;

        // リセット後のスケール値を計算 (ここではXYZの平均値を使う例)
        // もし「元の大きさ」を保持したいなら、X,Y,Zの中で最大値を基準にするなどの方法も考えられます
        const avgScale = (currentScale.x + currentScale.y + currentScale.z) / 3;

        // 非常に小さい値にならないように下限を設定 (例: 0.001)
        const newScaleValue = Math.max(0.001, avgScale);

        // モデルのスケールをXYZすべて同じ値に設定
        model.scale.set(newScaleValue, newScaleValue, newScaleValue);

        // 内部データも更新
        modelData.scale.copy(model.scale);

        // UIに変更を通知するために transformChanged イベントを発行
        // (これをしないと、XYZ表示や他のUIが更新されない)
        const event = new CustomEvent('transformChanged', {
          detail: {
            index: activeModelIndex,
            position: { x: model.position.x, y: model.position.y, z: model.position.z },
            rotation: {
              x: THREE.MathUtils.radToDeg(model.rotation.x),
              y: THREE.MathUtils.radToDeg(model.rotation.y),
              z: THREE.MathUtils.radToDeg(model.rotation.z)
            },
            // 更新されたスケール値を渡す
            scale: { x: model.scale.x, y: model.scale.y, z: model.scale.z }
          }
        });
        container.dispatchEvent(event);
        
        // scaleResetイベントも発行してUI更新を促す
        const scaleResetEvent = new CustomEvent('scaleReset', {
          detail: {
            index: activeModelIndex,
            scale: { x: model.scale.x, y: model.scale.y, z: model.scale.z }
          }
        });
        container.dispatchEvent(scaleResetEvent);

        console.log('Scale ratio reset to:', newScaleValue); // 動作確認ログ
      } else {
        console.warn('Cannot reset scale: No active model found.');
      }
    }, // ← カンマを確認
    // --- ↑↑↑ リセット機能を追加 ↑↑↑ ---

    resetCamera: () => {
      const modelData = getActiveModelData();
      if (modelData) {
        adjustCameraToModel(modelData.model);
      } else if (config.markerMode) {
        adjustCameraForMarker();
      } else {
        // 統一したデフォルト位置
        camera.position.set(0, defaultCameraDistance * 0.3, defaultCameraDistance);
        controls.target.set(0, 0, 0);
        controls.minDistance = 1.0;
        controls.maxDistance = 20;
        camera.near = 0.1;
        camera.far = 100;
        camera.updateProjectionMatrix();
        controls.update();
      }
    },
    setMarkerTexture: (textureUrl) => setMarkerTexture(textureUrl),
    getContainer: () => container,
    setModelVisibility: (index, visible) => {
      if (_setModelVisibility(index, visible)) {
        const visibilityChangedEvent = new CustomEvent('visibilityChanged', {
          detail: { index, visible }
        });
        container.dispatchEvent(visibilityChangedEvent);
      }
    },
    dispose: () => {
      window.removeEventListener('resize', onWindowResize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      modelList.forEach(disposeModelResources);
      modelList.length = 0;
      activeModelIndex = -1;
      objectUrls.clear();
      scene.remove(ambientLight);
      scene.remove(directionalLight);
      if (gridHelper) {
        scene.remove(gridHelper);
        gridHelper.geometry.dispose();
        gridHelper.material.dispose();
      }
      if (markerPlane) {
        scene.remove(markerPlane);
        markerPlane.geometry.dispose();
      }
      if (markerMaterial) {
        if (markerMaterial.map) markerMaterial.map.dispose();
        markerMaterial.dispose();
      }
      
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      
      // ローディング画面のクリーンアップを追加
      cleanupLoading();
    },
    // 正面ビューにリセットするメソッドを追加
    resetToFrontView: () => {
      resetCameraToFrontView();
    },
    // カメラを適切な位置に調整するメソッドを追加
    adjustCameraToActiveModel: () => {
      const modelData = getActiveModelData();
      if (modelData && modelData.model) {
        adjustCameraToModel(modelData.model);
      }
    },
    // 初期状態にリセットするメソッドを追加
    resetToInitialState: () => {
      const modelData = getActiveModelData();
      if (modelData && modelData.model) {
        const model = modelData.model;
        
        // 初期状態に戻す
        model.position.copy(modelData.initialPosition);
        model.rotation.copy(modelData.initialRotation);
        model.scale.copy(modelData.initialScale);
        
        // 内部データも更新
        modelData.position.copy(model.position);
        modelData.rotation.copy(model.rotation);
        modelData.scale.copy(model.scale);
        
        // カメラを初期位置に復元
        if (modelData.initialCameraPosition && modelData.initialCameraTarget) {
          camera.position.copy(modelData.initialCameraPosition);
          controls.target.copy(modelData.initialCameraTarget);
          controls.update();
        } else {
          // フォールバック：適切な位置に調整
          if (config.markerMode) {
            adjustCameraForMarker();
          } else {
            adjustCameraToModel(model);
          }
        }
        
        // UIに変更を通知
        const event = new CustomEvent('transformChanged', {
          detail: {
            index: activeModelIndex,
            position: { x: model.position.x, y: model.position.y, z: model.position.z },
            rotation: {
              x: THREE.MathUtils.radToDeg(model.rotation.x),
              y: THREE.MathUtils.radToDeg(model.rotation.y),
              z: THREE.MathUtils.radToDeg(model.rotation.z)
            },
            scale: { x: model.scale.x, y: model.scale.y, z: model.scale.z }
          }
        });
        container.dispatchEvent(event);
        
        console.log('Model reset to initial state');
        return true;
      } else {
        console.warn('Cannot reset: No active model found.');
        return false;
      }
    },
    // ローディング画面の手動制御用関数を追加
    showLoadingScreen: () => loadingManager.showLoadingScreen(),
    hideLoadingScreen: () => loadingManager.hideLoadingScreen(),
    updateLoadingProgress: (percent, message) => loadingManager.updateProgress(percent, message),
    // アクティブモデルデータ取得関数を追加
    getActiveModelData: getActiveModelData,
    
    // アニメーション制御関数を追加
    playAnimation: (animationIndex = 0) => {
      console.log('🎮 playAnimation() 開始');
      console.log('- animationIndex:', animationIndex);
      
      try {
        const modelData = getActiveModelData();
        if (!modelData) {
          console.warn('❌ アクティブなモデルデータがありません');
          return false;
        }
        
        console.log('- modelData.hasAnimations:', modelData.hasAnimations);
        console.log('- modelData.animations?.length:', modelData.animations?.length);
        
        if (!modelData.hasAnimations || !modelData.animations || modelData.animations.length === 0) {
          console.warn('❌ アクティブなモデルにアニメーションがありません');
          return false;
        }
        
        const model = modelData.model;
        const mixer = animationMixers.get(model);
        const clips = animationClips.get(model);
        
        console.log('- mixer存在:', !!mixer);
        console.log('- clips存在:', !!clips);
        console.log('- clips.length:', clips?.length);
        
        if (!mixer) {
          console.warn('❌ AnimationMixerが見つかりません');
          return false;
        }
        
        if (!clips || clips.length === 0) {
          console.warn('❌ アニメーションClipが見つかりません');
          return false;
        }
        
        // アニメーションインデックスの検証
        if (animationIndex < 0 || animationIndex >= clips.length) {
          console.warn(`❌ 無効なアニメーションインデックス: ${animationIndex} (0-${clips.length - 1})`);
          return false;
        }
        
        // 現在のアクションを停止
        const currentActions = animationActions.get(model) || [];
        currentActions.forEach(action => {
          try {
            action.stop();
          } catch (stopError) {
            console.warn('アニメーション停止エラー:', stopError);
          }
        });
        
        // 新しいアクションを開始
        const targetClip = clips[animationIndex];
        const newAction = mixer.clipAction(targetClip);
        newAction.reset();
        newAction.setLoop(THREE.LoopRepeat);
        newAction.play();
        
        animationActions.set(model, [newAction]);
        console.log(`✅ アニメーション "${targetClip.name}" を再生開始`);
        return true;
        
      } catch (error) {
        console.error('❌ playAnimation エラー:', error);
        console.error('- エラー詳細:', error.message);
        return false;
      }
    },
    
    stopAnimation: () => {
      try {
        const modelData = getActiveModelData();
        if (!modelData || !modelData.hasAnimations) {
          console.warn('❌ 停止するアニメーションがありません');
          return false;
        }
        
        const model = modelData.model;
        const currentActions = animationActions.get(model) || [];
        currentActions.forEach(action => {
          try {
            action.stop();
          } catch (stopError) {
            console.warn('アニメーション停止エラー:', stopError);
          }
        });
        
        console.log('✅ アニメーションを停止しました');
        return true;
      } catch (error) {
        console.error('❌ stopAnimation エラー:', error);
        return false;
      }
    },
    
    getAnimationList: () => {
      try {
        const modelData = getActiveModelData();
        if (!modelData || !modelData.hasAnimations) {
          return [];
        }
        
        if (!modelData.animations || !Array.isArray(modelData.animations)) {
          console.warn('⚠️ アニメーションデータが不正です');
          return [];
        }
        
        return modelData.animations.map((clip, index) => ({
          index,
          name: clip.name || `Animation ${index + 1}`,
          duration: clip.duration || 0
        }));
      } catch (error) {
        console.error('❌ getAnimationList エラー:', error);
        return [];
      }
    },
    
    hasAnimations: () => {
      try {
        const modelData = getActiveModelData();
        console.log('🔍 hasAnimations() チェック:');
        console.log('- activeModelIndex:', activeModelIndex);
        console.log('- modelList長さ:', modelList.length);
        console.log('- modelData存在:', !!modelData);
        if (modelData) {
          console.log('- modelData.fileName:', modelData.fileName);
          console.log('- modelData.hasAnimations:', modelData.hasAnimations);
          console.log('- modelData.animations型:', typeof modelData.animations);
          console.log('- modelData.animations長さ:', modelData.animations?.length);
        }
        const result = modelData && modelData.hasAnimations;
        console.log('🔍 hasAnimations() 結果:', result);
        return result;
      } catch (error) {
        console.error('❌ hasAnimations エラー:', error);
        return false;
      }
    }
  };

  console.log('ARビューアーの初期化完了、コントロールを返却します');
  return {
    dispose: modelControls.dispose,
    controls: modelControls,
    getContainer: modelControls.getContainer
  };
}
