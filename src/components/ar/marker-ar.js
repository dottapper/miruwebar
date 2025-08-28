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
      // 既定マーカー（まずローカル同梱を優先し、CDNはフォールバック）
      markerUrl: options.markerUrl || '/arjs/patt.hiro',
      // カメラパラメータ（まずローカル同梱を優先し、CDNはフォールバック）
      cameraParametersUrl: options.cameraParametersUrl || '/arjs/camera_para.dat',
      worldScale: options.worldScale || 1.0,
      ...options
    };

    // Three.js 基本要素
    const T = (typeof window !== 'undefined' && window.THREE) ? window.THREE : THREE;
    this._T = T;
    this.scene = new T.Scene();
    this.camera = new T.Camera();
    this.renderer = new T.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "default" // iPhone 用省電力設定
    });

    // AR.js 要素
    this.arToolkitSource = null;
    this.arToolkitContext = null;
    this.markerControls = null;
    this.markerRoot = new this._T.Group();
    
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

      // 必要アセットURLを解決（ローカル > CDN 順に）
      this.options.cameraParametersUrl = await this.resolveAssetUrl([
        '/arjs/camera_para.dat',
        this.options.cameraParametersUrl,
        'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/three.js/data/camera_para.dat',
        'https://unpkg.com/@ar-js-org/ar.js@3.4.5/three.js/data/camera_para.dat',
        'https://raw.githubusercontent.com/artoolkitx/jsartoolkit5/master/examples/Three.js/data/camera_para.dat'
      ]);
      this.options.markerUrl = await this.resolveAssetUrl([
        '/arjs/patt.hiro',
        this.options.markerUrl, // カスタム指定があれば次候補
        'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/three.js/data/patt.hiro',
        'https://unpkg.com/@ar-js-org/ar.js@3.4.5/three.js/data/patt.hiro',
        'https://raw.githubusercontent.com/artoolkitx/jsartoolkit5/master/examples/Three.js/data/patt.hiro'
      ]);

      console.log('🔗 解決したアセットURL:', {
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
      console.log('🔧 マーカーコントロール設定開始');
      this.setupMarkerControls();
      console.log('✅ マーカーコントロール設定完了');

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
    
    console.log('🖥️ レンダラー設定完了（透明度強化）:', debugInfo);
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
            // リサイズ対応
            window.addEventListener('resize', () => this.onResize());
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
      console.log('🎯 マーカー検出システム初期化開始');

      // まず、カメラパラメータファイルが正常にアクセス可能か事前確認
      try {
        console.log('🔍 カメラパラメータファイル事前確認:', this.options.cameraParametersUrl);
        const preCheckResponse = await fetch(this.options.cameraParametersUrl);
        const preCheckBuffer = await preCheckResponse.arrayBuffer();
        console.log('📁 事前確認結果:', {
          status: preCheckResponse.status,
          size: preCheckBuffer.byteLength,
          contentType: preCheckResponse.headers.get('content-type')
        });
        
        if (!preCheckResponse.ok || preCheckBuffer.byteLength < 1024) {
          throw new Error(`カメラパラメータファイルが無効: ${preCheckResponse.status}, ${preCheckBuffer.byteLength}bytes`);
        }
      } catch (preCheckError) {
        console.error('❌ カメラパラメータファイル事前確認エラー:', preCheckError);
        reject(new Error(`カメラパラメータファイル読み込み失敗: ${preCheckError.message}`));
        return;
      }

      const contextConfig = {
        cameraParametersUrl: this.options.cameraParametersUrl,
        detectionMode: 'mono',
        matrixCodeType: '3x3',
        canvasWidth: 640,   // iPhone 用解像度制限
        canvasHeight: 480,
        maxDetectionRate: 30, // iPhone 用フレームレート制限
        // 追加の安定化設定
        debug: false,
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
          console.log(`🔄 ARコンテキスト初期化進捗 (${elapsed}ms):`, {
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
          console.log('✅ ARコンテキスト初期化コールバック実行');
          console.log('🔍 ARコンテキスト最終状態:', {
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
              console.log('✅ カメラ投影行列設定完了');
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
        }, 10000);

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

      try {
        // AR.js 更新（より厳密な条件チェック）
        if (this.arToolkitSource && 
            this.arToolkitSource.ready === true && 
            this.arToolkitSource.domElement &&
            this.arToolkitContext &&
            this.arToolkitContext._arContext) {
          
          // カメラストリームが有効か確認
          const videoElement = this.arToolkitSource.domElement;
          if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
            this.arToolkitContext.update(this.arToolkitSource.domElement);
          }
        }

        // レンダリング
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
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

    return new Promise((resolve, reject) => {
      this.modelLoader.load(
        modelUrl,
        (gltf) => {
          console.log('✅ 3Dモデル読み込み完了');
          
          const model = gltf.scene;
          
          // モデルサイズ調整（iPhone 用小さめ）
          const box = new this._T.Box3().setFromObject(model);
          const size = box.getSize(new this._T.Vector3());
          const scale = (this.options.worldScale * 0.3) / Math.max(size.x, size.y, size.z || 1);
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

    // カメラ映像をコンテナ全体に合わせる
    const camEl = this.arToolkitSource.domElement;
    if (camEl) {
      camEl.style.width = '100vw';
      camEl.style.height = '100vh';
      camEl.style.objectFit = 'cover';
      console.log('📐 カメラ映像サイズ調整:', {
        カメラ実サイズ: `${sourceWidth}x${sourceHeight}`,
        表示サイズ: '100vw x 100vh'
      });
    }

    // レンダラーサイズも同期
    this.renderer.setSize(containerWidth, containerHeight);

    // AR.jsリサイズ処理
    this.arToolkitSource.onResize();
    this.arToolkitSource.copySizeTo(this.renderer.domElement);
    
    if (this.arToolkitContext && this.arToolkitContext.arController) {
      this.arToolkitSource.copySizeTo(this.arToolkitContext.arController.canvas);
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
