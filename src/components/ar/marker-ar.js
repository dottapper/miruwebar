// src/components/ar/marker-ar.js
// AR.js を使ったマーカーAR実装（iPhone Safari 対応）

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * AR.js を使用したマーカーベースAR
 * iPhone Safari でも動作する軽量実装
 */
export class MarkerAR {
  constructor(container, options = {}) {
    console.log('🎯 MarkerAR初期化開始 (iPhone対応)', options);
    
    this.container = container;
    this.options = {
      sourceType: 'webcam',
      markerUrl: options.markerUrl || 'https://ar-js-org.github.io/AR.js/data/patt.hiro',
      cameraParametersUrl: 'https://ar-js-org.github.io/AR.js/data/camera_para.dat',
      worldScale: options.worldScale || 1.0,
      ...options
    };

    // Three.js 基本要素
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "default" // iPhone 用省電力設定
    });

    // AR.js 要素
    this.arToolkitSource = null;
    this.arToolkitContext = null;
    this.markerControls = null;
    this.markerRoot = new THREE.Group();
    
    // モデル管理
    this.modelLoader = new GLTFLoader();
    this.loadedModel = null;
    this.placedModel = null;

    // 状態管理
    this.isMarkerVisible = false;
    this.isInitialized = false;

    // イベント
    this.onMarkerFound = null;
    this.onMarkerLost = null;
    this.onModelLoaded = null;

    // iPhone 用最適化設定
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // iPhone 用制限
    this.renderer.shadowMap.enabled = false; // iPhone でのパフォーマンス向上
  }

  /**
   * AR.js マーカーAR を初期化
   */
  async init() {
    console.log('🚀 MarkerAR初期化開始');

    try {
      // AR.js の動的読み込み
      console.log('📦 AR.js ライブラリ読み込み開始');
      await this.loadARjsLibrary();
      console.log('✅ AR.js ライブラリ読み込み完了');

      // レンダラー設定
      this.setupRenderer();

      // ARToolkitSource 初期化（カメラ）
      await this.initARToolkitSource();

      // ARToolkitContext 初期化（マーカー検出）
      await this.initARToolkitContext();

      // マーカーコントロール設定
      this.setupMarkerControls();

      // アニメーションループ開始
      this.startRenderLoop();

      this.isInitialized = true;
      console.log('✅ MarkerAR初期化完了');

      return true;

    } catch (error) {
      console.error('❌ MarkerAR初期化失敗:', error);
      throw new Error(`MarkerAR初期化エラー: ${error.message}`);
    }
  }

  /**
   * AR.js ライブラリを動的読み込み
   */
  async loadARjsLibrary() {
    // まず、AR.js が期待するグローバル THREE を用意
    try {
      if (!window.THREE || !window.THREE.REVISION || parseInt(window.THREE.REVISION) > 130) {
        // AR.js互換のthree r122をグローバルに読み込む
        console.log('🔧 グローバルTHREEを準備（r122）');
        await this.loadScript('https://cdn.jsdelivr.net/npm/three@0.122.0/build/three.min.js');
      }
    } catch (e) {
      console.warn('⚠️ グローバルTHREE準備に失敗（続行）:', e);
      // 最低限、現在のモジュール版THREEをグローバルに割り当て
      window.THREE = window.THREE || THREE;
    }

    // AR.js が既に読み込まれているかチェック
    if (window.THREEx && window.THREEx.ArToolkitSource) {
      console.log('📦 AR.js は既に読み込み済み');
      return;
    }

    try {
      // AR.js の CDN から読み込み（npm版との互換性問題対応）
      await this.loadScript('https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/three.js/build/ar-threex.js');
      
      // 読み込み確認
      if (!window.THREEx || !window.THREEx.ArToolkitSource) {
        throw new Error('AR.js ライブラリの読み込みに失敗しました');
      }

      console.log('✅ AR.js ライブラリ読み込み成功');
      
    } catch (error) {
      // フォールバック: 別のCDNを試行
      console.warn('⚠️ 主要CDNで失敗、フォールバックCDNを試行');
      await this.loadScript('https://unpkg.com/@ar-js-org/ar.js@3.4.5/three.js/build/ar-threex.js');
      
      if (!window.THREEx || !window.THREEx.ArToolkitSource) {
        throw new Error('フォールバックCDNでもAR.js読み込み失敗');
      }
    }
  }

  /**
   * スクリプトを動的読み込み
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`スクリプト読み込み失敗: ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * レンダラー設定
   */
  setupRenderer() {
    // コンテナサイズに合わせる
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0px';
    this.renderer.domElement.style.left = '0px';
    this.container.appendChild(this.renderer.domElement);

    console.log('🖥️ レンダラー設定完了:', { width, height });
  }

  /**
   * ARToolkitSource 初期化（カメラアクセス）
   * iPhone Safari 用に最適化
   */
  initARToolkitSource() {
    return new Promise((resolve, reject) => {
      console.log('📹 カメラアクセス初期化開始（iPhone Safari 最適化）');

      // iPhone Safari 用の制約を明示的に設定
      const sourceConfig = {
        sourceType: 'webcam',
        sourceWidth: 640,
        sourceHeight: 480,
        displayWidth: 640,
        displayHeight: 480,
        // iPhone Safari 用の追加設定
        deviceId: undefined, // 自動選択
        facingMode: 'environment' // 外側カメラ
      };

      console.log('📹 ArToolkitSource設定:', sourceConfig);
      this.arToolkitSource = new window.THREEx.ArToolkitSource(sourceConfig);

      // iPhone Safari では初期化前に少し待機
      setTimeout(() => {
        console.log('📹 ArToolkitSource.init() 実行開始');
        
        this.arToolkitSource.init(
          // 成功コールバック
          () => {
            console.log('✅ ArToolkitSource 初期化成功');
            console.log('📹 カメラ準備状況:', {
              ready: this.arToolkitSource.ready,
              domElement: !!this.arToolkitSource.domElement,
              videoWidth: this.arToolkitSource.domElement?.videoWidth,
              videoHeight: this.arToolkitSource.domElement?.videoHeight
            });
            
            // サイズ調整
            this.onResize();
            resolve();
          },
          // エラーコールバック
          (error) => {
            console.error('❌ ArToolkitSource 初期化失敗:', error);
            console.error('❌ エラー詳細:', {
              name: error?.name,
              message: error?.message,
              code: error?.code
            });
            
            let errorMessage = 'カメラアクセスに失敗しました: ';
            if (error?.name === 'NotAllowedError') {
              errorMessage += 'カメラ権限が拒否されました。Safari の設定でカメラアクセスを許可してください。';
            } else if (error?.name === 'NotFoundError') {
              errorMessage += 'カメラデバイスが見つかりません。';
            } else if (error?.name === 'NotSupportedError') {
              errorMessage += 'このブラウザはカメラアクセスに対応していません。';
            } else {
              errorMessage += error?.message || '不明なエラー';
            }
            
            reject(new Error(errorMessage));
          }
        );
      }, 100); // iPhone Safari 用の遅延
    });
  }

  /**
   * ARToolkitContext 初期化（マーカー検出）
   */
  initARToolkitContext() {
    return new Promise((resolve, reject) => {
      console.log('🎯 マーカー検出システム初期化');

      this.arToolkitContext = new window.THREEx.ArToolkitContext({
        cameraParametersUrl: this.options.cameraParametersUrl,
        detectionMode: 'mono',
        matrixCodeType: '3x3',
        canvasWidth: 640,   // iPhone 用解像度制限
        canvasHeight: 480,
        maxDetectionRate: 30 // iPhone 用フレームレート制限
      });

      this.arToolkitContext.init(() => {
        console.log('✅ マーカー検出システム初期化完了');
        
        // カメラの投影行列を設定
        this.camera.projectionMatrix.copy(this.arToolkitContext.getProjectionMatrix());
        resolve();
      });

      // エラータイムアウト
      setTimeout(() => {
        if (!this.arToolkitContext._arContext) {
          reject(new Error('マーカー検出システム初期化タイムアウト'));
        }
      }, 10000);
    });
  }

  /**
   * マーカーコントロール設定
   */
  setupMarkerControls() {
    console.log('🔧 マーカーコントロール設定');

    // マーカールートをシーンに追加
    this.scene.add(this.markerRoot);

    // マーカーコントロール作成
    this.markerControls = new window.THREEx.ArMarkerControls(
      this.arToolkitContext, 
      this.markerRoot, 
      {
        type: 'pattern',
        patternUrl: this.options.markerUrl,
        changeMatrixMode: 'cameraTransformMatrix'
      }
    );

    // マーカー検出イベント
    let wasVisible = false;
    let debugCounter = 0;
    
    const checkMarkerVisibility = () => {
      const isVisible = this.markerRoot.visible;
      
      // デバッグ出力（5秒に1回）
      debugCounter++;
      if (debugCounter % 50 === 0) {
        console.log('🔍 MarkerAR デバッグ:', {
          マーカー可視: isVisible,
          ARコンテキスト: !!this.arToolkitContext,
          カメラ準備完了: !!(this.arToolkitSource && this.arToolkitSource.ready),
          読み込み済みモデル: !!this.loadedModel,
          配置済みモデル: !!this.placedModel
        });
      }
      
      if (isVisible && !wasVisible) {
        // マーカー発見
        this.isMarkerVisible = true;
        console.log('🎯 マーカーを発見しました！');
        
        // 自動でモデル配置
        if (this.loadedModel && !this.placedModel) {
          console.log('📦 モデルを自動配置中...');
          this.placeModel();
        }
        
        if (this.onMarkerFound) this.onMarkerFound();
      } else if (!isVisible && wasVisible) {
        // マーカー消失
        this.isMarkerVisible = false;
        console.log('❌ マーカーを見失いました');
        if (this.onMarkerLost) this.onMarkerLost();
      }
      
      wasVisible = isVisible;
    };

    // 定期的にマーカー可視性をチェック
    setInterval(checkMarkerVisibility, 100);

    console.log('✅ マーカーコントロール設定完了');
  }

  /**
   * アニメーションループ開始
   */
  startRenderLoop() {
    console.log('🎬 アニメーションループ開始');

    const animate = () => {
      requestAnimationFrame(animate);

      // AR.js 更新
      if (this.arToolkitSource && this.arToolkitSource.ready !== false) {
        this.arToolkitContext.update(this.arToolkitSource.domElement);
      }

      // レンダリング
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  /**
   * 3Dモデルを読み込み
   */
  async loadModel(modelUrl) {
    console.log('📂 3Dモデル読み込み開始:', modelUrl);

    return new Promise((resolve, reject) => {
      this.modelLoader.load(
        modelUrl,
        (gltf) => {
          console.log('✅ 3Dモデル読み込み完了');
          
          const model = gltf.scene;
          
          // モデルサイズ調整（iPhone 用小さめ）
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const scale = (this.options.worldScale * 0.3) / Math.max(size.x, size.y, size.z);
          model.scale.setScalar(scale);

          // モデルを地面に配置
          box.setFromObject(model);
          model.position.y = -box.min.y * scale;

          // 保存
          this.loadedModel = model.clone();
          
          console.log('🎯 3Dモデル準備完了');
          if (this.onModelLoaded) this.onModelLoaded(model);
          
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
   * マーカー上にモデルを配置
   */
  placeModel() {
    if (!this.loadedModel) {
      console.warn('⚠️ 配置可能なモデルがありません');
      return null;
    }

    // 既存モデルを削除
    if (this.placedModel) {
      this.markerRoot.remove(this.placedModel);
    }

    // モデルを複製して配置
    this.placedModel = this.loadedModel.clone();
    this.markerRoot.add(this.placedModel);
    
    console.log('🎯 マーカー上にモデルを配置しました');
    return this.placedModel;
  }

  /**
   * 配置されたモデルを削除
   */
  removeModel() {
    if (this.placedModel) {
      this.markerRoot.remove(this.placedModel);
      this.placedModel = null;
      console.log('🗑️ 配置されたモデルを削除しました');
    }
  }

  /**
   * リサイズ対応
   */
  onResize() {
    if (!this.arToolkitSource) return;

    // アスペクト比を維持したリサイズ
    const sourceWidth = this.arToolkitSource.domElement.videoWidth || 640;
    const sourceHeight = this.arToolkitSource.domElement.videoHeight || 480;
    const containerWidth = this.container.clientWidth || window.innerWidth;
    const containerHeight = this.container.clientHeight || window.innerHeight;

    // コンテナに合わせてカメラ映像をリサイズ
    this.arToolkitSource.onResize();
    this.arToolkitSource.copySizeTo(this.renderer.domElement);
    
    if (this.arToolkitContext && this.arToolkitContext.arController) {
      this.arToolkitSource.copySizeTo(this.arToolkitContext.arController.canvas);
    }

    console.log('📐 リサイズ完了:', { containerWidth, containerHeight });
  }

  /**
   * クリーンアップ
   */
  dispose() {
    console.log('🧹 MarkerAR クリーンアップ開始');

    // モデル削除
    this.removeModel();
    
    // AR.js リソース解放
    if (this.arToolkitSource) {
      if (this.arToolkitSource.domElement && this.arToolkitSource.domElement.srcObject) {
        // カメラストリーム停止
        const stream = this.arToolkitSource.domElement.srcObject;
        if (stream && stream.getTracks) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    }

    // レンダラー削除
    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }

    console.log('✅ MarkerAR クリーンアップ完了');
  }

  /**
   * デバッグ情報取得
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      isMarkerVisible: this.isMarkerVisible,
      hasLoadedModel: !!this.loadedModel,
      hasPlacedModel: !!this.placedModel,
      arToolkitReady: !!(this.arToolkitSource && this.arToolkitSource.ready),
      cameraReady: !!(this.arToolkitSource && this.arToolkitSource.domElement)
    };
  }
}
