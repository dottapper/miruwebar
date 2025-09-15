// src/components/ar/webxr-ar.js
// WebXRベースのマーカーレスAR実装

import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AREngineInterface } from '../../utils/ar-engine-adapter.js';

/**
 * WebXRマーカーレスARクラス
 * 空間の平面検出とタッチによる3Dオブジェクト配置を実装
 */
export class WebXRAR extends AREngineInterface {
  constructor(options = {}) {
    super(options);
    console.log('🌟 WebXRAR初期化開始', options);
    this.options = {
      backgroundColor: 0x000000,
      enableHitTest: true,
      planeDetection: 'horizontal',
      worldScale: 1.0,
      maxObjects: 5,
      ...options
    };

    // Three.js基本要素
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 20);
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance" // AR用パフォーマンス最適化
    });

    // AR関連要素
    this.reticle = null;
    this.hitTestSource = null;
    this.hitTestSourceRequested = false;
    this.placedObjects = [];
    this.modelLoader = new GLTFLoader();

    // イベント管理
    this.onObjectPlaced = null;
    this.onSessionStart = null;
    this.onSessionEnd = null;

    // WebXR設定
    this.renderer.xr.enabled = true;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ライティング設定
    this.setupLighting();
  }

  /**
   * AR環境のライティングを設定
   */
  setupLighting() {
    // 環境光（AR環境では控えめに）
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // 指向性ライト（太陽光のような）
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    console.log('💡 ARライティング設定完了');
  }

  /**
   * AREngineInterface 実装: initialize
   */
  async initialize() {
    return await this.init();
  }

  /**
   * AREngineInterface 実装: start
   */
  async start(projectData) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    this.isRunning = true;
    return true;
  }

  /**
   * AREngineInterface 実装: stop
   */
  async stop() {
    this.isRunning = false;
    return true;
  }

  /**
   * AREngineInterface 実装: destroy
   */
  async destroy() {
    this.cleanup();
    return true;
  }

  /**
   * AREngineInterface 実装: 静的メソッド
   */
  static isSupported() {
    return !!(navigator.xr);
  }

  static getEngineType() {
    return 'webxr';
  }

  /**
   * WebXR AR を初期化
   */
  async init() {
    console.log('🚀 WebXRAR初期化開始');

    try {
      // レンダラーサイズ設定
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.container.appendChild(this.renderer.domElement);

      // ARButtonを作成
      const arButton = ARButton.createButton(this.renderer, {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
      });

      // ARボタンのスタイリング
      arButton.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        z-index: 1000;
      `;

      this.container.appendChild(arButton);

      // Hit test用レチクル（照準）を作成
      this.createReticle();

      // セッションイベントリスナー
      this.renderer.xr.addEventListener('sessionstart', () => {
        console.log('🎯 WebXRセッション開始');
        if (this.onSessionStart) this.onSessionStart();
      });

      this.renderer.xr.addEventListener('sessionend', () => {
        console.log('🔚 WebXRセッション終了');
        this.cleanup();
        if (this.onSessionEnd) this.onSessionEnd();
      });

      // タッチイベントでオブジェクト配置
      this.renderer.domElement.addEventListener('touchstart', (event) => {
        if (this.renderer.xr.isPresenting && this.reticle.visible) {
          event.preventDefault();
          this.placeObjectAtReticle();
        }
      });

      // アニメーションループ開始
      this.renderer.setAnimationLoop((timestamp, frame) => {
        this.render(timestamp, frame);
      });

      console.log('✅ WebXRAR初期化完了');
      return true;

    } catch (error) {
      console.error('❌ WebXRAR初期化失敗:', error);
      throw new Error(`WebXR初期化エラー: ${error.message}`);
    }
  }

  /**
   * Hit test用のレチクル（照準）を作成
   */
  createReticle() {
    console.log('🎯 レチクル作成開始');

    // リング形状のレチクル
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });

    this.reticle = new THREE.Mesh(geometry, material);
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);

    // 中心点ドット
    const dotGeometry = new THREE.CircleGeometry(0.05, 16).rotateX(-Math.PI / 2);
    const dotMaterial = new THREE.MeshBasicMaterial({ color: 0x007bff });
    const dot = new THREE.Mesh(dotGeometry, dotMaterial);
    this.reticle.add(dot);

    console.log('✅ レチクル作成完了');
  }

  /**
   * メインレンダリングループ
   */
  render(timestamp, frame) {
    if (frame && this.renderer.xr.isPresenting) {
      this.handleHitTest(frame);
    }
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Hit test処理（平面検出）
   */
  handleHitTest(frame) {
    const referenceSpace = this.renderer.xr.getReferenceSpace();
    const session = this.renderer.xr.getSession();

    // Hit test sourceの初期化
    if (this.hitTestSourceRequested === false) {
      session.requestHitTestSource({ space: this.camera }).then((source) => {
        this.hitTestSource = source;
        console.log('🎯 Hit test source準備完了');
      }).catch((error) => {
        console.error('❌ Hit test source作成失敗:', error);
      });
      
      this.hitTestSourceRequested = true;
    }

    // Hit test実行
    if (this.hitTestSource) {
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);
      
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(referenceSpace);
        
        if (pose) {
          this.reticle.visible = true;
          this.reticle.matrix.fromArray(pose.transform.matrix);
        }
      } else {
        this.reticle.visible = false;
      }
    }
  }

  /**
   * レチクル位置にオブジェクトを配置
   */
  placeObjectAtReticle() {
    if (!this.reticle.visible) {
      console.warn('⚠️ レチクルが表示されていません');
      return;
    }

    // 配置数制限チェック
    if (this.placedObjects.length >= this.options.maxObjects) {
      console.warn(`⚠️ 最大配置数(${this.options.maxObjects})に達しました`);
      // 最初のオブジェクトを削除
      this.removeObject(this.placedObjects[0]);
    }

    // サンプルオブジェクト配置（後でloadModelから呼び出される）
    this.placeTestCube();
  }

  /**
   * テスト用キューブを配置
   */
  placeTestCube() {
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const material = new THREE.MeshStandardMaterial({ 
      color: Math.random() * 0xffffff,
      metalness: 0.3,
      roughness: 0.7
    });
    
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    
    // レチクル位置に配置
    cube.matrix.copy(this.reticle.matrix);
    cube.matrixAutoUpdate = false;
    
    this.scene.add(cube);
    this.placedObjects.push(cube);
    
    console.log('📦 テストキューブを配置:', this.placedObjects.length);
    
    if (this.onObjectPlaced) {
      this.onObjectPlaced(cube);
    }
  }

  /**
   * GLTFモデルを読み込んで配置
   */
  async loadModel(modelUrl) {
    console.log('📂 3Dモデル読み込み開始:', modelUrl);

    return new Promise((resolve, reject) => {
      this.modelLoader.load(
        modelUrl,
        (gltf) => {
          console.log('✅ 3Dモデル読み込み完了');
          
          const model = gltf.scene;
          
          // モデルサイズ正規化
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const scale = this.options.worldScale / Math.max(size.x, size.y, size.z);
          model.scale.setScalar(scale);

          // シャドウ設定
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // 次回配置時に使用するモデルとして保存
          this.loadedModel = model.clone();
          
          console.log('🎯 モデル配置準備完了');
          resolve(model);
        },
        (progress) => {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          console.log(`📊 モデル読み込み進捗: ${percent}%`);
        },
        (error) => {
          console.error('❌ 3Dモデル読み込み失敗:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * 読み込み済みモデルをレチクル位置に配置
   */
  placeLoadedModel() {
    if (!this.loadedModel) {
      console.warn('⚠️ 配置可能なモデルがありません');
      return null;
    }

    if (!this.reticle.visible) {
      console.warn('⚠️ レチクルが表示されていません');
      return null;
    }

    // 配置数制限チェック
    if (this.placedObjects.length >= this.options.maxObjects) {
      this.removeObject(this.placedObjects[0]);
    }

    // モデルを複製して配置
    const model = this.loadedModel.clone();
    model.matrix.copy(this.reticle.matrix);
    model.matrixAutoUpdate = false;
    
    this.scene.add(model);
    this.placedObjects.push(model);
    
    console.log('🎯 3Dモデルを配置:', this.placedObjects.length);
    
    if (this.onObjectPlaced) {
      this.onObjectPlaced(model);
    }

    return model;
  }

  /**
   * 配置されたオブジェクトを削除
   */
  removeObject(object) {
    const index = this.placedObjects.indexOf(object);
    if (index > -1) {
      this.scene.remove(object);
      this.placedObjects.splice(index, 1);
      
      // メモリ解放
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
      
      console.log('🗑️ オブジェクト削除完了');
    }
  }

  /**
   * 全配置オブジェクトをクリア
   */
  clearAllObjects() {
    console.log('🧹 全オブジェクトをクリア');
    while (this.placedObjects.length > 0) {
      this.removeObject(this.placedObjects[0]);
    }
  }

  /**
   * リソース解放とクリーンアップ
   */
  cleanup() {
    console.log('🧹 WebXRARクリーンアップ開始');
    
    // Hit test source解放
    if (this.hitTestSource) {
      this.hitTestSource = null;
      this.hitTestSourceRequested = false;
    }

    // 配置オブジェクト全削除
    this.clearAllObjects();

    // レチクル削除
    if (this.reticle) {
      this.scene.remove(this.reticle);
      this.reticle.geometry.dispose();
      this.reticle.material.dispose();
    }

    console.log('✅ WebXRARクリーンアップ完了');
  }

  /**
   * リサイズ対応
   */
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * デバッグ情報を出力
   */
  getDebugInfo() {
    return {
      isPresenting: this.renderer.xr.isPresenting,
      placedObjects: this.placedObjects.length,
      reticleVisible: this.reticle?.visible || false,
      hitTestActive: !!this.hitTestSource,
      loadedModel: !!this.loadedModel
    };
  }
}

// レチクル位置にオブジェクトを配置するときはloadedModelを使用するよう修正
WebXRAR.prototype.placeObjectAtReticle = function() {
  if (!this.reticle.visible) {
    console.warn('⚠️ レチクルが表示されていません');
    return;
  }

  // 配置数制限チェック
  if (this.placedObjects.length >= this.options.maxObjects) {
    console.warn(`⚠️ 最大配置数(${this.options.maxObjects})に達しました`);
    this.removeObject(this.placedObjects[0]);
  }

  // 読み込み済みモデルがある場合はそれを使用、なければテストキューブ
  if (this.loadedModel) {
    this.placeLoadedModel();
  } else {
    this.placeTestCube();
  }
};

export default WebXRAR;