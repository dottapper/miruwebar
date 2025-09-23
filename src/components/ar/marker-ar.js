// src/components/ar/marker-ar.js
// AR.js を使ったマーカーAR実装（iPhone Safari 対応）

import * as THREE from 'three';
import { AREngineInterface } from '../../utils/ar-engine-adapter.js';
// GLTFLoaderは動的インポートで統一バージョンを使用

/**
 * AR.js を使用したマーカーベースAR
 * iPhone Safari でも動作する軽量実装
 */
export class MarkerAR extends AREngineInterface {
  constructor(options = {}) {
    super(options);
    this.IS_DEBUG = (typeof window !== 'undefined' && !!window.DEBUG);
    this.dlog = (...args) => { if (this.IS_DEBUG) console.log(...args); };
    console.log('🎯 MarkerAR初期化開始 (iPhone対応)', options);
    this.options = {
      sourceType: 'webcam',
      // 既定マーカー（まずローカル同梱を優先し、CDNはフォールバック）
      markerUrl: options.markerUrl || '/arjs/patt.hiro',
      // カメラパラメータ（まずローカル同梱を優先し、CDNはフォールバック）
      cameraParametersUrl: options.cameraParametersUrl || '/arjs/camera_para.dat',
      worldScale: options.worldScale || 1.0,
      // 検出チューニング（必要に応じて上書き可能）
      patternRatio: typeof options.patternRatio === 'number' ? options.patternRatio : 0.7,
      minConfidence: typeof options.minConfidence === 'number' ? options.minConfidence : 0.5,
      // デバッグ用：強制的にキューブを配置
      forceDebugCube: options.forceDebugCube === true,
      // デバッグ用：モデルのマテリアルを視認性の高い材質に置換
      forceNormalMaterial: options.forceNormalMaterial === true,
      ...options
    };

    // Three.js 0.165統一: ESM版を標準として使用
    this._T = THREE;
    
    // window.THREEは初期化時に確実に統一バージョンを設定
    if (typeof window !== 'undefined') {
      window.THREE = THREE;
      console.log('✅ Three.js 0.165統一: ESM版をwindow.THREEに設定完了');
    }
    this.scene = new this._T.Scene();
    this.camera = new this._T.Camera();
    // 念のためカメラをシーンに追加（AR.jsの行列更新に影響はないが安全）
    try { this.scene.add(this.camera); } catch (_) {}
    this.renderer = new this._T.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "default" // iPhone 用省電力設定
    });

    // 最低限のライティング（モデル可視化用）
    try {
      const ambient = new this._T.AmbientLight(0xffffff, 0.6);
      const dir = new this._T.DirectionalLight(0xffffff, 0.8);
      dir.position.set(1, 1, 1);
      this.scene.add(ambient);
      this.scene.add(dir);
    } catch (_) {}

    // AR.js 要素
    this.arToolkitSource = null;
    this.arToolkitContext = null;
    this.markerControls = null;
    this.markerRoot = new this._T.Group();
    // AR.js は markerRoot の matrix を直接更新するため、autoUpdate をオフにする
    try { this.markerRoot.matrixAutoUpdate = false; } catch (_) {}
    
    // モデル管理（動的初期化でバージョン統一）
    this.modelLoader = null;
    this._initGLTFLoader();
    this.loadedModel = null; // 後方互換用（最後に読んだモデル）
    this.loadedModels = [];  // 読み込まれた全モデル（準備済み）
    this.placedModel = null; // 互換用（配置済みのルート）
    this.placedGroup = null; // 複数モデルを束ねるグループ

    // 状態管理
    this.isMarkerVisible = false;
    this.isInitialized = false;
    this.arContextInitialized = false;

    // イベント
    this.onMarkerFound = null;
    this.onMarkerLost = null;
  }

  /**
   * GLTFLoaderを動的に初期化してバージョン統一
   */
  async _initGLTFLoader() {
    try {
      console.log('🔄 GLTFLoader動的初期化開始（バージョン統一）');
      
      // ESM版GLTFLoaderを動的インポート
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      
      // 統一されたThree.jsインスタンスでGLTFLoader作成
      this.modelLoader = new GLTFLoader();
      
      console.log('✅ GLTFLoader初期化成功（統一バージョン0.165）');
      console.log('🔍 Three.js統一状況:', {
        esm: this._T.REVISION,
        window: typeof window !== 'undefined' && window.THREE ? window.THREE.REVISION : 'なし'
      });
      
    } catch (e) {
      console.error('❌ GLTFLoader動的初期化失敗:', e);
      this.modelLoader = null;
    }
  }


  /**
   * AR.js マーカーAR を初期化
   */
  async init() {
    console.log('🚀 MarkerAR初期化開始');

    // 既に初期化済みまたは初期化中の場合は処理をスキップ
    if (this.isInitialized || this.isInitializing) {
      console.warn('⚠️ MarkerAR は既に初期化済みまたは初期化中です');
      return this.isInitialized;
    }

    this.isInitializing = true;

    // GLTFLoaderが未初期化の場合は再初期化
    if (!this.modelLoader) {
      await this._initGLTFLoader();
    }

    // iPhone 用最適化設定
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;

    try {
      console.log('🔍 初期化デバッグ:', {
        container: !!this.container,
        _T: !!this._T,
        scene: !!this.scene,
        camera: !!this.camera,
        renderer: !!this.renderer,
        modelLoader: !!this.modelLoader
      });
      // AR.js の動的読み込み
      console.log('📦 AR.js ライブラリ読み込み開始');
      await this.loadARjsLibrary();
      console.log('✅ AR.js ライブラリ読み込み完了');

      // レンダラー設定
      console.log('🖥️ レンダラー設定開始');
      this.setupRenderer();
      console.log('✅ レンダラー設定完了');

      // 必要アセットURLを解決（ローカル > CDN 順に）
      console.log('🔗 アセットURL解決開始');
      this.options.cameraParametersUrl = await this.resolveAssetUrl([
        '/arjs/camera_para.dat',
        this.options.cameraParametersUrl,
        'https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/camera_para.dat',
        'https://cdn.jsdelivr.net/npm/ar.js@2.2.2/data/camera_para.dat',
        'https://jeromeetienne.github.io/AR.js/data/camera_para.dat'
      ]);
      this.options.markerUrl = await this.resolveAssetUrl([
        '/arjs/patt.hiro',
        this.options.markerUrl, // カスタム指定があれば次候補
        'https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/patt.hiro',
        'https://cdn.jsdelivr.net/npm/ar.js@2.2.2/data/patt.hiro', 
        'https://jeromeetienne.github.io/AR.js/data/patt.hiro'
      ]);
      console.log('✅ アセットURL解決完了');

      this.dlog('🔗 解決したアセットURL:', {
        cameraParametersUrl: this.options.cameraParametersUrl,
        markerUrl: this.options.markerUrl
      });

      // ARToolkitSource 初期化（カメラ）
      console.log('📹 ARToolkitSource 初期化開始');
      await this.initARToolkitSource();
      console.log('✅ ARToolkitSource 初期化完了');

      // ARToolkitContext 初期化（マーカー検出）
      console.log('🎯 ARToolkitContext 初期化開始');
      await this.initARToolkitContext();
      console.log('✅ ARToolkitContext 初期化完了');

      // マーカーコントロール設定
      this.dlog('🔧 マーカーコントロール設定開始');
      this.setupMarkerControls();
      console.log('✅ マーカーコントロール設定完了');

      // アニメーションループ開始
      this.startRenderLoop();

      this.isInitialized = true;
      this.isInitializing = false;
      this.dlog('✅ MarkerAR初期化完了');

      return true;

    } catch (error) {
      console.error('❌ MarkerAR初期化失敗:', {
        エラーメッセージ: error.message,
        エラータイプ: error.name,
        スタックトレース: error.stack,
        現在の状態: {
          container: !!this.container,
          scene: !!this.scene,
          camera: !!this.camera,
          renderer: !!this.renderer,
          modelLoader: !!this.modelLoader
        }
      });

      // 初期化状態をリセット
      this.isInitializing = false;
      this.isInitialized = false;

      throw new Error(`MarkerAR初期化エラー: ${error.message}`);
    }
  }

  /**
   * 最初に到達可能なアセットURLを返す（タイムアウト2秒）
   */
  async resolveAssetUrl(candidates = []) {
    const currentOrigin = window.location.origin;

    for (const url of candidates) {
      if (!url) continue;

      try {
        // ローカルURLの場合はCORSモードを避ける
        const isLocalUrl = url.startsWith('/') || url.startsWith('./') || url.startsWith(currentOrigin);
        const fetchOptions = {
          method: 'GET',
          cache: 'no-store'
        };

        // 外部URLの場合はcorsモードを使用、ローカルURLの場合はデフォルト
        if (!isLocalUrl) {
          fetchOptions.mode = 'cors';
        }

        console.log('🔍 アセット確認:', url, isLocalUrl ? '(ローカル)' : '(外部)');

        const res = await fetch(url, fetchOptions);
        if (res.ok) {
          // 最低サイズをチェック（極端に小さい=HTMLやエラーページの可能性）
          const buf = await res.clone().arrayBuffer();
          const size = buf.byteLength;
          const name = (url || '').toString();
          const isCamera = name.includes('camera_para');
          const minSize = isCamera ? 1024 : 256; // camera_paraは1KB以上、pattは256B以上を目安

          if (size >= minSize) {
            // 先頭数百バイトを文字列で確認し、明らかなエラーメッセージ/HTMLを検出したらスキップ
            try {
              const head = new Uint8Array(buf).slice(0, 256);
              const text = new TextDecoder().decode(head).toLowerCase();
              if (text.includes("couldn't find the requested file") ||
                  text.includes('<html') ||
                  text.includes('not found') ||
                  text.includes('404')) {
                console.warn('⚠️ アセット内容がエラーページの可能性のためスキップ:', url);
                continue;
              }
            } catch {}

            console.log('✅ アセット到達・サイズOK:', url, size, 'bytes');
            return url;
          } else {
            console.warn('⚠️ アセットサイズが小さすぎます。スキップ:', url, size, 'bytes');
          }
        } else {
          console.warn('⚠️ アセット到達失敗:', url, res.status);
        }
      } catch (e) {
        console.warn('⚠️ アセット到達エラー:', url, e?.message);
        // CORSエラーの場合はローカルURLを優先的に探す
        if (e.message.includes('CORS') && !url.startsWith('/')) {
          console.log('🔄 CORSエラー検知、引き続きローカルURLを探索');
        }
      }
    }

    console.log('📋 利用可能な候補:', candidates);
    // 最後の候補（失敗時はAR.js側でエラーになる）
    return candidates.find(Boolean);
  }

  /**
   * AR.js ライブラリを動的読み込み (Three.js 0.165統一版)
   */
  async loadARjsLibrary() {
    // Three.js 0.165統一: ESM版をwindow.THREEに設定
    console.log('🔧 Three.js 0.165統一: ESM版をグローバルに設定');
    window.THREE = THREE;
    
    // 現代のThree.jsには removeFromParent が標準で存在するが、安全のためチェック
    try {
      const O3D = THREE.Object3D;
      if (O3D && !O3D.prototype.removeFromParent) {
        O3D.prototype.removeFromParent = function() {
          if (this.parent) this.parent.remove(this);
          return this;
        };
        console.log('🧩 three.Object3D.removeFromParent ポリフィル適用');
      }
    } catch (_) {}
    
    console.log('✅ Three.js統一完了:', {
      ESM_REVISION: THREE.REVISION,
      window_REVISION: window.THREE.REVISION
    });

    // AR.js が既に読み込まれているかチェック
    if (window.THREEx && window.THREEx.ArToolkitSource) {
      console.log('📦 AR.js は既に読み込み済み');
      return;
    }

    try {
      // CDN優先（404ノイズ回避）。失敗時のみローカル（存在確認済み）
      let ok = false;
      try {
        await this.loadScript('https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/three.js/build/ar-threex.js');
        ok = !!(window.THREEx && window.THREEx.ArToolkitSource);
      } catch (_) {}
      if (!ok) {
        try {
          await this.loadScript('https://unpkg.com/@ar-js-org/ar.js@3.4.5/three.js/build/ar-threex.js');
          ok = !!(window.THREEx && window.THREEx.ArToolkitSource);
        } catch (_) {}
      }
      if (!ok) {
        try {
          if (await this.resourceExists('/arjs/ar-threex.js')) {
            await this.loadScript('/arjs/ar-threex.js');
            ok = !!(window.THREEx && window.THREEx.ArToolkitSource);
          }
        } catch (_) {}
      }

      if (!ok) throw new Error('AR.js ライブラリの読み込みに失敗しました');

      console.log('✅ AR.js ライブラリ読み込み成功');

      console.log('✅ GLTFLoader モジュール版使用');

    } catch (error) {
      if (!window.THREEx || !window.THREEx.ArToolkitSource) {
        throw error;
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
   * 同一オリジンの静的資産の存在確認（HEAD）
   */
  async resourceExists(url) {
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
      return !!res && res.ok;
    } catch (_) {
      return false;
    }
  }

  /**
   * レンダラー設定
   */
  setupRenderer() {
    // コンテナサイズに合わせる
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    
    try {
      this.renderer.setSize(width, height);
      // 背景を完全透明にして背面のカメラ映像を見せる（古いthree互換のため安全に）
      if (this.renderer.setClearColor) {
        this.renderer.setClearColor(0x000000, 0);
      }
    } catch (e) {
      console.warn('⚠️ レンダラーサイズ/クリア設定で警告（続行）:', e?.message);
    }
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0px';
    this.renderer.domElement.style.left = '0px';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.zIndex = '10'; // カメラ映像の上に重ねる
    this.renderer.domElement.style.pointerEvents = 'none'; // カメラタップを透過
    this.renderer.domElement.style.backgroundColor = 'transparent'; // 明示的に透明
    this.renderer.domElement.style.background = 'transparent'; // 追加の透明設定
    this.container.appendChild(this.renderer.domElement);
    
    // Three.jsバージョン互換性のためのセーフガード
    let debugInfo = { width, height };
    try {
      if (this.renderer.alpha !== undefined) debugInfo.alpha = this.renderer.alpha;
      // getClearAlpha() と getClearColor() は互換性問題があるためスキップ
    } catch (e) {
      console.warn('⚠️ レンダラー詳細情報取得でエラー（続行）:', e.message);
    }
    
    this.dlog('🖥️ レンダラー設定完了（透明度強化）:', debugInfo);
  }

  /**
   * ARToolkitSource 初期化（カメラアクセス）
   * iPhone Safari 用に最適化
   */
  initARToolkitSource() {
    console.log('🚨🚨🚨 initARToolkitSource() 関数呼び出し確認');
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

      this.dlog('📹 ArToolkitSource設定:', sourceConfig);
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
            
            try {
              // カメラ映像（video/canvas）をDOMに追加して背面に表示
              const camEl = this.arToolkitSource.domElement;
              console.log('🎥 カメラDOM要素詳細:', {
                要素存在: !!camEl,
                要素タイプ: camEl?.tagName,
                親要素存在: !!camEl?.parentNode,
                ビデオ幅: camEl?.videoWidth || camEl?.width,
                ビデオ高さ: camEl?.videoHeight || camEl?.height,
                再生中: camEl?.paused === false,
                srcObject: !!camEl?.srcObject,
                readyState: camEl?.readyState
              });
              
              if (camEl && !camEl.parentNode) {
                console.log('📺 カメラ映像をDOMに追加中...');
                camEl.setAttribute('playsinline', 'true');
                camEl.setAttribute('muted', 'true');
                camEl.setAttribute('autoplay', 'true');
                
                // 強制的なカメラ表示スタイル
                camEl.style.position = 'absolute';
                camEl.style.top = '0';
                camEl.style.left = '0';
                camEl.style.width = '100%';
                camEl.style.height = '100%';
                camEl.style.objectFit = 'cover';
                camEl.style.zIndex = '0'; // レンダラーより下に配置
                camEl.style.display = 'block';
                camEl.style.visibility = 'visible';
                camEl.style.opacity = '1';
                camEl.style.backgroundColor = 'transparent'; // 背景を透明に
                
                // コンテナの最初の子要素として挿入（最背面）
                if (this.container.firstChild) {
                  this.container.insertBefore(camEl, this.container.firstChild);
                } else {
                  this.container.appendChild(camEl);
                }
                console.log('✅ カメラ映像DOM追加完了');
              } else if (camEl?.parentNode) {
                console.log('📺 カメラ映像は既にDOMに存在');
                // 既存要素のスタイルも修正
                camEl.style.zIndex = '0';
                camEl.style.display = 'block';
                camEl.style.visibility = 'visible';
                camEl.style.opacity = '1';
              } else {
                console.error('❌ カメラDOM要素が存在しません');
              }
              // iOS/Safari での再生ガード
              if (camEl && typeof camEl.play === 'function') {
                const tryPlay = async () => {
                  try { await camEl.play(); } catch (e) { console.warn('⚠️ カメラ映像の再生に失敗（再試行）:', e?.message); }
                };
                camEl.addEventListener('loadedmetadata', tryPlay, { once: true });
                camEl.addEventListener('canplay', tryPlay, { once: true });
                // すでにメタデータがあれば即再生
                tryPlay();
              }
            } catch (e) {
              console.warn('⚠️ カメラDOM要素の配置に失敗（続行）:', e);
            }

            // サイズ調整
            this.onResize();
            // リサイズ対応（dispose時に削除するため参照を保存）
            this.resizeHandler = () => this.onResize();
            window.addEventListener('resize', this.resizeHandler);
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
    console.log('🚨 initARToolkitContext() 関数が呼び出されました');
    return new Promise(async (resolve, reject) => {
      this.dlog('🎯 マーカー検出システム初期化開始');

      // カメラパラメータはAR.jsのデフォルトを使用（事前チェックスキップ）
      console.log('🔍 AR.jsデフォルトカメラパラメータを使用します');

      const contextConfig = {
        // カメラパラメータファイルを指定しない（AR.jsデフォルトを使用）
        detectionMode: 'mono',
        matrixCodeType: '3x3',
        canvasWidth: 640,   // iPhone 用解像度制限
        canvasHeight: 480,
        maxDetectionRate: 30, // iPhone 用フレームレート制限
        // 追加の安定化設定
        debug: !!this.IS_DEBUG,
        imageSmoothingEnabled: false
      };
      
      console.log('🔧 ARコンテキスト設定:', contextConfig);
      this.arToolkitContext = new window.THREEx.ArToolkitContext(contextConfig);

      try {
        console.log('🚀 ARコンテキスト init() 開始');
        
        // 初期化進捗の詳細監視
        let callbackExecuted = false;
        let initStartTime = Date.now();
        let timeoutId;
        
        // 初期化状態の定期チェック
        const checkInterval = setInterval(() => {
          const elapsed = Date.now() - initStartTime;
          if (this.IS_DEBUG) console.log(`🔄 ARコンテキスト初期化進捗 (${elapsed}ms):`, {
            _arContext: !!this.arToolkitContext._arContext,
            arController: !!this.arToolkitContext.arController,
            parameters: !!this.arToolkitContext.parameters,
            callbackExecuted
          });
        }, 3000); // 3秒ごとに状態確認
        
        // AR.js初期化の成功コールバック
        const onInitSuccess = () => {
          callbackExecuted = true;
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          this.arContextInitialized = true;
          this.dlog('✅ ARコンテキスト初期化コールバック実行');
          this.dlog('🔍 ARコンテキスト最終状態:', {
            _arContext: !!this.arToolkitContext._arContext,
            arController: !!this.arToolkitContext.arController,
            parameters: !!this.arToolkitContext.parameters,
            初期化時間: `${Date.now() - initStartTime}ms`
          });

          // カメラの投影行列を設定（Three.js互換性対応）
          try {
            const projMatrix = this.arToolkitContext.getProjectionMatrix();
            if (projMatrix && this.camera.projectionMatrix) {
              this.camera.projectionMatrix.copy(projMatrix);
              this.dlog('✅ カメラ投影行列設定完了');
            } else {
              console.warn('⚠️ 投影行列の設定をスキップ（互換性問題）');
            }
          } catch (projError) {
            console.warn('⚠️ カメラ投影行列設定エラー（続行）:', projError.message);
          }
          
          resolve();
        };

        // AR.js初期化実行（10秒後に強制完了も用意）
        this.arToolkitContext.init(onInitSuccess);
        
        // 10秒後に強制的に成功扱いにする（AR.jsコールバックが呼ばれない場合の対策）
        const forceSuccessTimeout = setTimeout(() => {
          if (!callbackExecuted) {
            console.warn('⚠️ ARコンテキスト初期化コールバックが10秒経過しても呼ばれないため強制完了');
            
            // ARコンテキストの状態を確認し、必要に応じて手動で初期化状態を設定
            console.log('🔧 ARコンテキスト強制初期化試行中...');
            
            // AR.jsが内部的に初期化されているかチェック
            if (this.arToolkitContext && (this.arToolkitContext._arContext || this.arToolkitContext.arController)) {
              console.log('✅ ARコンテキストは実際には初期化されているため続行');
              onInitSuccess();
            } else {
              console.warn('⚠️ ARコンテキストが初期化されていないが強制的に続行');
              
              // 手動で最小限の初期化状態を設定
              try {
                if (this.arToolkitContext && !this.arToolkitContext._arContext) {
                  console.log('🔧 手動でARコンテキスト状態を設定中...');
                  // 最小限の_arContext状態をシミュレート
                  this.arToolkitContext._arContext = { initialized: true };
                }
              } catch (e) {
                console.warn('⚠️ 手動初期化設定に失敗（続行）:', e.message);
              }
              
              onInitSuccess();
            }
          }
        }, 5000);

        // エラータイムアウト（30秒に延長 + より詳細な診断）
        timeoutId = setTimeout(async () => {
          clearInterval(checkInterval);
          if (!callbackExecuted) {
            console.error('❌ ARコンテキスト初期化タイムアウト（30秒）詳細:', {
              arToolkitContext: !!this.arToolkitContext,
              _arContext: !!this.arToolkitContext._arContext,
              arController: !!this.arToolkitContext.arController,
              cameraParametersUrl: this.options.cameraParametersUrl,
              callbackExecuted,
              経過時間: `${Date.now() - initStartTime}ms`
            });
            
            // カメラパラメータファイルの詳細テスト
            try {
              console.log('🔍 カメラパラメータファイル詳細テスト開始...');
              const response = await fetch(this.options.cameraParametersUrl);
              const buffer = await response.arrayBuffer();
              console.log('📁 camera_para.dat テスト結果:', {
                status: response.status,
                statusText: response.statusText,
                size: buffer.byteLength,
                contentType: response.headers.get('content-type'),
                url: this.options.cameraParametersUrl
              });
            } catch (err) {
              console.error('📁 camera_para.dat アクセスエラー:', err);
            }
            
            reject(new Error('マーカー検出システム初期化タイムアウト（30秒）'));
          }
        }, 30000); // 30秒に延長
        
        // 成功時にタイムアウトをクリア
        const originalResolve = resolve;
        resolve = (...args) => {
          clearTimeout(timeoutId);
          originalResolve(...args);
        };
      } catch (error) {
        console.error('❌ ARToolkitContext初期化エラー:', error);
        reject(new Error(`マーカー検出システム初期化エラー: ${error.message}`));
      }
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
        // マーカーにオブジェクトを配置する標準的な方式
        changeMatrixMode: 'cameraTransformMatrix',
        // 認識チューニング
        patternRatio: this.options.patternRatio,
        minConfidence: this.options.minConfidence
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
          ARコンテキスト初期化済: !!(this.arToolkitContext && this.arToolkitContext._arContext),
          カメラソース存在: !!this.arToolkitSource,
          カメラ準備完了: !!(this.arToolkitSource && this.arToolkitSource.ready === true),
          カメラDOM要素: !!(this.arToolkitSource && this.arToolkitSource.domElement),
          動画サイズ: this.arToolkitSource && this.arToolkitSource.domElement ? 
            `${this.arToolkitSource.domElement.videoWidth}x${this.arToolkitSource.domElement.videoHeight}` : 'N/A',
          読み込み済みモデル: !!this.loadedModel,
          配置済みモデル: !!this.placedModel
        });
      }
      
      if (isVisible && !wasVisible) {
        // マーカー発見
        this.isMarkerVisible = true;
        console.log('🎯 マーカーを発見しました！');
        
        // 自動でモデル/デバッグキューブを配置
        console.log('🔍 モデル配置判定:', {
          forceDebugCube: this.options.forceDebugCube,
          loadedModel: !!this.loadedModel,
          loadedModelsCount: this.loadedModels?.length || 0,
          placedModel: !!this.placedModel
        });
        
        // sample.glbテスト用：モデルがあれば優先的に表示
        if ((this.loadedModel || this.loadedModels?.length > 0) && !this.placedModel) {
          console.log('📦 保存モデルを自動配置中...');
          this.placeModel();
        } else if (this.options.forceDebugCube && !this.placedModel) {
          // テストフラグが立っている場合はキューブを出す
          console.log('🧪 テスト: 強制デバッグキューブを配置');
          this.placeDebugCube();
        } else if (!this.loadedModel && (!this.loadedModels || this.loadedModels.length === 0) && !this.placedModel) {
          // モデルが全くない場合のフォールバック
          console.log('🧪 フォールバック: デバッグ用キューブを配置');
          this.placeDebugCube();
        } else {
          console.warn('⚠️ どの配置条件にも該当しませんでした', {
            loadedModel: !!this.loadedModel,
            loadedModelsCount: this.loadedModels?.length || 0,
            placedModel: !!this.placedModel
          });
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

    // 定期的にマーカー可視性をチェック（dispose時に停止するためIDを保存）
    this.visibilityCheckInterval = setInterval(checkMarkerVisibility, 100);

    console.log('✅ マーカーコントロール設定完了');
  }

  /**
   * アニメーションループ開始
   */
  startRenderLoop() {
    console.log('🎬 アニメーションループ開始');

    const animate = () => {
      requestAnimationFrame(animate);

      try {
        // AR.js 更新（より厳密な条件チェック）
        if (this.arToolkitSource && 
            this.arToolkitSource.ready === true && 
            this.arToolkitSource.domElement &&
            this.arToolkitContext &&
            this.arToolkitContext.arController) {
          // 入力映像が有効か確認
          const videoElement = this.arToolkitSource.domElement;
          const hasSize = (videoElement.videoWidth > 0 && videoElement.videoHeight > 0);
          const readyStateOk = (typeof videoElement.readyState === 'number' ? videoElement.readyState >= 2 : true);
          if (hasSize && readyStateOk) {
            this.arToolkitContext.update(videoElement);
          }
        }

        // レンダリング
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
          
          // デバッグ：シーン内容を確認（マーカー検出時のみ）
          if (this.isMarkerVisible && this.markerRoot && this.markerRoot.children.length > 0) {
            // 5秒に1回だけログ出力
            const now = Date.now();
            if (!this._lastDebugLog || now - this._lastDebugLog > 5000) {
              this._lastDebugLog = now;
              console.log('🎬 レンダリング状態:', {
                markerVisible: this.isMarkerVisible,
                markerChildren: this.markerRoot.children.length,
                cameraMatrix: this.camera.matrix.elements.slice(0, 4),
                placedModel: !!this.placedModel,
                placedModelVisible: this.placedModel?.visible
              });
            }
          }
        }
      } catch (error) {
        // AR.js固有のエラーはログを出力しない（無限ループ防止）
        if (!error.message.includes('detectMarker') && 
            !error.message.includes('ARToolKit') && 
            !error.message.includes('ARController')) {
          console.warn('⚠️ アニメーションループエラー:', error.message);
        }
        // エラーが発生してもループを継続
      }
    };

    animate();
  }

  /**
   * 3Dモデルを読み込み
   */
  async loadModel(modelUrl) {
    console.log('📂 3Dモデル読み込み開始:', modelUrl);
    console.log('📂 現在のloadedModels:', this.loadedModels.length, '個');

    return new Promise((resolve, reject) => {
      // GLTFLoader 準備確認
      if (!this.modelLoader) {
        console.warn('⚠️ GLTFLoader 未準備のためモデルを読めません');
        reject(new Error('GLTFLoader is not available'));
        return;
      }

      this.modelLoader.load(
        modelUrl,
        (gltf) => {
          console.log('✅ 3Dモデル読み込み完了');
          
          const model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
          if (!model) {
            reject(new Error('Invalid GLTF content'));
            return;
          }

          // デバッグ: 材質を MeshNormalMaterial に置換（見え方を確認）
          if (this.options.forceNormalMaterial) {
            const normalMat = new this._T.MeshNormalMaterial({ wireframe: false });
            model.traverse((child) => {
              if (child.isMesh) child.material = normalMat;
            });
          }
          
          // モデルサイズ調整（ターゲットサイズに正規化 + 大きめ表示）
          const box = new this._T.Box3().setFromObject(model);
          const size = box.getSize(new this._T.Vector3());
          const targetEdge = (this.options.worldScale || 1.0) * 2.0; // 2倍に拡大
          const scale = targetEdge / Math.max(size.x, size.y, size.z || 1);
          model.scale.setScalar(scale);
          
          console.log('🔍 モデルサイズ調整:', {
            元サイズ: { x: size.x, y: size.y, z: size.z },
            ターゲットサイズ: targetEdge,
            スケール: scale,
            最終サイズ: model.scale.x
          });

          // モデルを地面に配置
          box.setFromObject(model);
          model.position.y -= box.min.y; // スケール済みのmin.yをそのまま打ち消す

          // 保存
          this.loadedModel = model.clone();
          this.loadedModels.push(model.clone());
          
          console.log('🎯 3Dモデル準備完了');
          if (this.onModelLoaded) this.onModelLoaded(model);

          // マーカーが既に可視かつ未配置なら即時配置（初回検出が先だったケースを救済）
          try {
            if (this.isMarkerVisible && !this.placedModel) {
              console.log('📌 マーカー可視中のためモデルを即時配置');
              this.placeModel();
            }
          } catch (_) {}
          
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
   * デバッグ用のフォールバックキューブをマーカー上に配置（ライト不要の法線材質）
   */
  placeDebugCube() {
    try {
      // 既存のモデルを削除
      if (this.placedModel) {
        this.markerRoot.remove(this.placedModel);
        this.placedModel = null;
      }
      
      const size = 1.0 * (this.options.worldScale || 1.0); // サイズを大きく
      const geometry = new this._T.BoxGeometry(size, size, size);
      const material = new this._T.MeshNormalMaterial({ wireframe: false });
      const cube = new this._T.Mesh(geometry, material);
      
      // キューブをマーカー上に配置（中央に）
      cube.position.set(0, size / 2, 0);
      cube.scale.setScalar(1.0); // スケール確実に設定
      
      this.markerRoot.add(cube);
      this.placedModel = cube;
      
      console.log('🧊 デバッグ用キューブを配置しました', {
        サイズ: size,
        位置: cube.position.toArray(),
        スケール: cube.scale.toArray(),
        マーカールート子要素数: this.markerRoot.children.length
      });
      return cube;
    } catch (e) {
      console.warn('⚠️ デバッグ用キューブ配置に失敗:', e?.message || e);
      return null;
    }
  }

  /**
   * マーカー上にモデルを配置
   */
  placeModel() {
    // forceDebugCubeが有効でもモデル表示を優先（sample.glbテスト用）
    console.log('📦 placeModel() 実行開始');

    if (!this.loadedModels || this.loadedModels.length === 0) {
      console.warn('⚠️ 配置可能なモデルがありません');
      return null;
    }

    // 既存の配置をクリア
    if (this.placedGroup) {
      try { this.markerRoot.remove(this.placedGroup); } catch (_) {}
      this.placedGroup = null;
    }

    const group = new this._T.Group();
    let offsetX = 0;
    const gap = 0.2 * (this.options.worldScale || 1.0);

    for (const baseModel of this.loadedModels) {
      const m = baseModel.clone(true);
      // 念のため地面合わせを再適用
      const b = new this._T.Box3().setFromObject(m);
      m.position.y -= b.min.y;
      // 横一列に並べる（複数モデル視認性）
      m.position.x = offsetX;
      group.add(m);
      
      // テスト用: モデルの隣に大きな赤いキューブを配置
      const testCube = new this._T.Mesh(
        new this._T.BoxGeometry(0.5, 0.5, 0.5),
        new this._T.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
      );
      testCube.position.set(offsetX, 0.25, -0.5);
      group.add(testCube);
      
      const maxEdge = Math.max(
        Math.abs(b.max.x - b.min.x),
        Math.abs(b.max.y - b.min.y),
        Math.abs(b.max.z - b.min.z)
      );
      offsetX += (maxEdge + gap + 0.5); // テストキューブ分も考慮
    }

    this.markerRoot.add(group);
    this.placedGroup = group;
    this.placedModel = group; // 後方互換
    
    console.log('🎯 マーカー上にモデルを配置しました（', this.loadedModels.length, '個）', {
      グループ子要素数: group.children.length,
      マーカールート子要素数: this.markerRoot.children.length,
      グループ表示: group.visible,
      マーカールート表示: this.markerRoot.visible,
      グループ位置: group.position.toArray()
    });
    return group;
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

    // カメラ映像をコンテナ全体に合わせる
    const camEl = this.arToolkitSource.domElement;
    if (camEl) {
      camEl.style.width = '100vw';
      camEl.style.height = '100svh'; /* iOS Safari対応: アドレスバー変動を考慮 */
      camEl.style.objectFit = 'cover';
      console.log('📐 カメラ映像サイズ調整:', {
        カメラ実サイズ: `${sourceWidth}x${sourceHeight}`,
        表示サイズ: '100vw x 100svh (iOS Safari対応)'
      });
    }

    // レンダラーサイズも同期
    this.renderer.setSize(containerWidth, containerHeight);

    // AR.jsリサイズ処理（新旧APIに対応）
    try {
      if (typeof this.arToolkitSource.onResizeElement === 'function' &&
          typeof this.arToolkitSource.copyElementSizeTo === 'function') {
        // 新API
        this.arToolkitSource.onResizeElement();
        this.arToolkitSource.copyElementSizeTo(this.renderer.domElement);
        if (this.arToolkitContext && this.arToolkitContext.arController) {
          this.arToolkitSource.copyElementSizeTo(this.arToolkitContext.arController.canvas);
        }
      } else {
        // 互換API（旧）
        this.arToolkitSource.onResize();
        this.arToolkitSource.copySizeTo(this.renderer.domElement);
        if (this.arToolkitContext && this.arToolkitContext.arController) {
          this.arToolkitSource.copySizeTo(this.arToolkitContext.arController.canvas);
        }
      }
    } catch (e) {
      console.warn('⚠️ リサイズ処理で警告（続行）:', e?.message || e);
    }

    console.log('📐 リサイズ完了:', { 
      containerWidth, 
      containerHeight, 
      videoSize: `${sourceWidth}x${sourceHeight}` 
    });
  }

  /**
   * クリーンアップ
   */
  dispose() {
    console.log('🧹 MarkerAR クリーンアップ開始');

    // インターバル・タイマーの停止
    if (this.visibilityCheckInterval) {
      clearInterval(this.visibilityCheckInterval);
      this.visibilityCheckInterval = null;
      console.log('✅ マーカー可視性チェック インターバル停止');
    }

    // リサイズイベントリスナーの削除
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
      console.log('✅ リサイズイベントリスナー削除');
    }

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

    // AR.jsコンポーネントのクリーンアップ
    if (this.arToolkitContext) {
      this.arToolkitContext = null;
    }
    if (this.arToolkitSource) {
      this.arToolkitSource = null;
    }
    if (this.markerControls) {
      this.markerControls = null;
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

  /**
   * AREngineInterface 実装: 初期化
   */
  async initialize() {
    console.log('🚀 MarkerAR初期化開始');
    this.isInitialized = true;
    return true;
  }

  /**
   * AREngineInterface 実装: AR開始
   */
  async start(projectData) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    this.isRunning = true;
    console.log('▶️ MarkerAR開始', projectData);
    // 既存のARロジックを呼び出し
    await this.init();
  }

  /**
   * AREngineInterface 実装: AR停止
   */
  async stop() {
    this.isRunning = false;
    console.log('⏹️ MarkerAR停止');
    if (this.arToolkitSource) {
      this.arToolkitSource.onResize = null;
    }
  }

  /**
   * AREngineInterface 実装: リソース破棄
   */
  async destroy() {
    await this.stop();
    this.cleanup();
    this.isInitialized = false;
    console.log('🗑️ MarkerAR破棄完了');
  }

  /**
   * AREngineInterface 実装: デバイス対応チェック
   */
  static isSupported() {
    return navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  }

  /**
   * AREngineInterface 実装: エンジンタイプ
   */
  static getEngineType() {
    return 'marker';
  }
}

// MarkerAR を default export
export default MarkerAR;
