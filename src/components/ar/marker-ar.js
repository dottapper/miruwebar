// src/components/ar/marker-ar.js
// AR.js を使ったマーカーAR実装（iPhone Safari 対応）

import * as THREE from 'three';
import { AREngineInterface } from '../../utils/ar-engine-adapter.js';
import { generateMarkerPatternFromImage, createPatternBlob } from '../../utils/marker-utils.js';
import { createLogger } from '../../utils/logger.js';
// GLTFLoaderは動的インポートで統一バージョンを使用

const markerARLogger = createLogger('MarkerAR');

/**
 * AR.js を使用したマーカーベースAR
 * iPhone Safari でも動作する軽量実装
 */
export class MarkerAR extends AREngineInterface {
  constructor(options = {}) {
    super(options);
    this.IS_DEBUG = (typeof window !== 'undefined' && !!window.DEBUG);
    this.dlog = (...args) => { if (this.IS_DEBUG) markerARLogger.debug(...args); };
    markerARLogger.info('🎯 MarkerAR初期化開始 (iPhone対応)', options);
    markerARLogger.info('🔍 markerUrl受け取り確認:', {
      '渡されたmarkerUrl': options.markerUrl,
      'markerUrlの型': typeof options.markerUrl,
      'markerUrlが存在': !!options.markerUrl
    });
      this.options = {
      sourceType: 'webcam',
      // 既定マーカー（まずローカル同梱を優先し、CDNはフォールバック）
      // nullの場合は後でresolveAssetUrlで解決される
      markerUrl: options.markerUrl !== undefined ? options.markerUrl : null,
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
      markerARLogger.info('✅ Three.js 0.165統一: ESM版をwindow.THREEに設定完了');
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
      markerARLogger.info('🔄 GLTFLoader動的初期化開始（バージョン統一）');
      
      // ESM版GLTFLoaderを動的インポート
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      
      // 統一されたThree.jsインスタンスでGLTFLoader作成
      this.modelLoader = new GLTFLoader();
      
      markerARLogger.info('✅ GLTFLoader初期化成功（統一バージョン0.165）');
      markerARLogger.info('🔍 Three.js統一状況:', {
        esm: this._T.REVISION,
        window: typeof window !== 'undefined' && window.THREE ? window.THREE.REVISION : 'なし'
      });
      
    } catch (e) {
      markerARLogger.error('❌ GLTFLoader動的初期化失敗:', e);
      this.modelLoader = null;
    }
  }


  /**
   * AR.js マーカーAR を初期化
   */
  async init() {
    markerARLogger.info('🚀 MarkerAR初期化開始');

    // 既に初期化済みまたは初期化中の場合は処理をスキップ
    if (this.isInitialized || this.isInitializing) {
      markerARLogger.warn('⚠️ MarkerAR は既に初期化済みまたは初期化中です');
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
      markerARLogger.info('🔍 初期化デバッグ:', {
        container: !!this.container,
        _T: !!this._T,
        scene: !!this.scene,
        camera: !!this.camera,
        renderer: !!this.renderer,
        modelLoader: !!this.modelLoader
      });
      // AR.js の動的読み込み
      markerARLogger.info('📦 AR.js ライブラリ読み込み開始');
      await this.loadARjsLibrary();
      markerARLogger.info('✅ AR.js ライブラリ読み込み完了');

      // レンダラー設定
      markerARLogger.info('🖥️ レンダラー設定開始');
      this.setupRenderer();
      markerARLogger.info('✅ レンダラー設定完了');

      // 必要アセットURLを解決（ローカル > CDN 順に）
      markerARLogger.info('🔗 アセットURL解決開始');
      this.options.cameraParametersUrl = await this.resolveAssetUrl([
        '/arjs/camera_para.dat',
        this.options.cameraParametersUrl,
        'https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/camera_para.dat',
        'https://cdn.jsdelivr.net/npm/ar.js@2.2.2/data/camera_para.dat',
        'https://jeromeetienne.github.io/AR.js/data/camera_para.dat'
      ]);
      // マーカーURL解決（カスタムマーカー必須 - HIROマーカーへのフォールバック禁止）
      // ⚠️ 重要: docs/MARKER_POLICY.md を参照
      // ⚠️ AR.jsは.pattファイルを必要とするため、画像から変換が必要
      markerARLogger.info('🔍 マーカーURL処理開始:', {
        渡されたmarkerUrl: this.options.markerUrl,
        isBlobUrl: this.options.markerUrl?.startsWith?.('blob:')
      });

      let finalPatternUrl = null;

      // 既にBlob URL（.patt形式）が渡されている場合はそのまま使用
      if (this.options.markerUrl && this.options.markerUrl.startsWith('blob:')) {
        markerARLogger.info('✅ 既に.patt形式のBlob URLが渡されました');
        finalPatternUrl = this.options.markerUrl;
      } else {
        // 画像URLから.pattを生成する必要がある
        const markerImageCandidates = [];
        if (this.options.markerUrl) {
          markerImageCandidates.push(this.options.markerUrl);
        }
        // フォールバックはプロジェクト内のサンプル画像のみ（HIROマーカー禁止）
        markerImageCandidates.push(
          '/assets/sample.png',
          '/assets/logo.png'
        );

        // カスタムマーカーが設定されていない場合は警告を表示
        if (!this.options.markerUrl) {
          markerARLogger.warn('⚠️ カスタムマーカーが設定されていません。サンプル画像を使用します。');
          markerARLogger.warn('📌 プロジェクト設定でマーカー画像をアップロードしてください。');
        }

        // 画像URLを解決
        const resolvedImageUrl = await this.resolveAssetUrl(markerImageCandidates);
        markerARLogger.info('🔗 マーカー画像URL解決:', resolvedImageUrl);

        // 画像から.pattパターンを生成
        if (resolvedImageUrl) {
          try {
            markerARLogger.info('🔄 マーカーパターン生成開始...');
            const patternString = await generateMarkerPatternFromImage(resolvedImageUrl);
            if (patternString) {
              const pattBlob = createPatternBlob(patternString);
              finalPatternUrl = pattBlob.url;
              // クリーンアップ用に保存
              this._patternBlobRevoke = pattBlob.revoke;
              markerARLogger.info('✅ マーカーパターン生成成功:', {
                パターン長: patternString.length,
                BlobURL: finalPatternUrl
              });
            } else {
              markerARLogger.error('❌ マーカーパターン生成失敗: パターン文字列が空');
            }
          } catch (patternError) {
            markerARLogger.error('❌ マーカーパターン生成エラー:', patternError);
          }
        }
      }

      // 最終的なパターンURLを設定
      if (finalPatternUrl) {
        this.options.markerUrl = finalPatternUrl;
        markerARLogger.info('✅ マーカーパターンURL設定完了:', finalPatternUrl);
      } else {
        markerARLogger.error('❌ マーカーパターンの準備に失敗しました');
        throw new Error('マーカーパターンの準備に失敗しました。マーカー画像を確認してください。');
      }

      markerARLogger.info('✅ アセットURL解決完了');

      this.dlog('🔗 解決したアセットURL:', {
        cameraParametersUrl: this.options.cameraParametersUrl,
        markerUrl: this.options.markerUrl
      });

      // ARToolkitSource 初期化（カメラ）
      markerARLogger.info('📹 ARToolkitSource 初期化開始');
      await this.initARToolkitSource();
      markerARLogger.info('✅ ARToolkitSource 初期化完了');

      // ARToolkitContext 初期化（マーカー検出）
      markerARLogger.info('🎯 ARToolkitContext 初期化開始');
      await this.initARToolkitContext();
      markerARLogger.info('✅ ARToolkitContext 初期化完了');

      // マーカーコントロール設定
      this.dlog('🔧 マーカーコントロール設定開始');
      this.setupMarkerControls();
      markerARLogger.info('✅ マーカーコントロール設定完了');

      // アニメーションループ開始
      this.startRenderLoop();

      this.isInitialized = true;
      this.isInitializing = false;
      this.dlog('✅ MarkerAR初期化完了');

      return true;

    } catch (error) {
      markerARLogger.error('❌ MarkerAR初期化失敗:', {
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

        markerARLogger.info('🔍 アセット確認:', url, isLocalUrl ? '(ローカル)' : '(外部)');

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
                markerARLogger.warn('⚠️ アセット内容がエラーページの可能性のためスキップ:', url);
                continue;
              }
            } catch {}

            markerARLogger.info('✅ アセット到達・サイズOK:', url, size, 'bytes');
            return url;
          } else {
            markerARLogger.warn('⚠️ アセットサイズが小さすぎます。スキップ:', url, size, 'bytes');
          }
        } else {
          markerARLogger.warn('⚠️ アセット到達失敗:', url, res.status);
        }
      } catch (e) {
        markerARLogger.warn('⚠️ アセット到達エラー:', url, e?.message);
        // CORSエラーの場合はローカルURLを優先的に探す
        if (e.message.includes('CORS') && !url.startsWith('/')) {
          markerARLogger.info('🔄 CORSエラー検知、引き続きローカルURLを探索');
        }
      }
    }

    markerARLogger.info('📋 利用可能な候補:', candidates);
    // 最後の候補（失敗時はAR.js側でエラーになる）
    return candidates.find(Boolean);
  }

  /**
   * AR.js ライブラリを動的読み込み (Three.js 0.165統一版)
   */
  async loadARjsLibrary() {
    // Three.js 0.165統一: ESM版をwindow.THREEに設定
    markerARLogger.info('🔧 Three.js 0.165統一: ESM版をグローバルに設定');
    window.THREE = THREE;
    
    // 現代のThree.jsには removeFromParent が標準で存在するが、安全のためチェック
    try {
      const O3D = THREE.Object3D;
      if (O3D && !O3D.prototype.removeFromParent) {
        O3D.prototype.removeFromParent = function() {
          if (this.parent) this.parent.remove(this);
          return this;
        };
        markerARLogger.info('🧩 three.Object3D.removeFromParent ポリフィル適用');
      }
    } catch (_) {}
    
    markerARLogger.info('✅ Three.js統一完了:', {
      ESM_REVISION: THREE.REVISION,
      window_REVISION: window.THREE.REVISION
    });

    // AR.js が既に読み込まれているかチェック
    if (window.THREEx && window.THREEx.ArToolkitSource) {
      markerARLogger.info('📦 AR.js は既に読み込み済み (window.THREEx.ArToolkitSource available)');
      return;
    }

    // Three.js が確実に設定された後に ar-threex.js を動的に読み込む
    markerARLogger.info('📦 AR.js ライブラリを動的読み込み開始...');
    
    // window.THREE が確実に設定されていることを確認
    if (!window.THREE || !window.THREE.EventDispatcher) {
      throw new Error('Three.js が正しく設定されていません。window.THREE.EventDispatcher が見つかりません。');
    }

    try {
      // ar-threex.js を動的に読み込む
      await this.loadScript('/arjs/ar-threex.js');
      markerARLogger.info('✅ AR.js ライブラリ読み込み成功 (THREEx available)');
      
      // 読み込み後の確認
      if (!window.THREEx || !window.THREEx.ArToolkitSource) {
        throw new Error('AR.js ライブラリの読み込みは完了しましたが、THREEx.ArToolkitSource が見つかりません。');
      }
    } catch (error) {
      markerARLogger.error('❌ AR.js ライブラリの読み込みに失敗しました:', error);
      markerARLogger.error('📍 確認事項:');
      markerARLogger.error('  - /arjs/ar-threex.js ファイルが存在するか');
      markerARLogger.error('  - Three.js が正しく読み込まれているか');
      markerARLogger.error('  - ブラウザコンソールに読み込みエラーが出ていないか');
      throw new Error(`AR.js ライブラリの読み込みに失敗しました: ${error.message}`);
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
      markerARLogger.warn('⚠️ レンダラーサイズ/クリア設定で警告（続行）:', e?.message);
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
      markerARLogger.warn('⚠️ レンダラー詳細情報取得でエラー（続行）:', e.message);
    }
    
    this.dlog('🖥️ レンダラー設定完了（透明度強化）:', debugInfo);
  }

  /**
   * ARToolkitSource 初期化（カメラアクセス）
   * iPhone Safari 用に最適化
   */
  initARToolkitSource() {
    markerARLogger.info('🚨🚨🚨 initARToolkitSource() 関数呼び出し確認');
    return new Promise((resolve, reject) => {
      markerARLogger.info('📹 カメラアクセス初期化開始（iPhone Safari 最適化）');

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
        markerARLogger.info('📹 ArToolkitSource.init() 実行開始');
        
        this.arToolkitSource.init(
          // 成功コールバック
          () => {
            markerARLogger.info('✅ ArToolkitSource 初期化成功');
            markerARLogger.info('📹 カメラ準備状況:', {
              ready: this.arToolkitSource.ready,
              domElement: !!this.arToolkitSource.domElement,
              videoWidth: this.arToolkitSource.domElement?.videoWidth,
              videoHeight: this.arToolkitSource.domElement?.videoHeight
            });
            
            try {
              // カメラ映像（video/canvas）をDOMに追加して背面に表示
              const camEl = this.arToolkitSource.domElement;
              markerARLogger.info('🎥 カメラDOM要素詳細:', {
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
                markerARLogger.info('📺 カメラ映像をDOMに追加中...');
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
                camEl.style.backgroundColor = '#000'; // 背景を黒に（カメラが表示されるまでのフォールバック）
                camEl.style.pointerEvents = 'none'; // タッチイベントを透過
                
                // コンテナの最初の子要素として挿入（最背面）
                if (this.container.firstChild) {
                  this.container.insertBefore(camEl, this.container.firstChild);
                } else {
                  this.container.appendChild(camEl);
                }
                markerARLogger.info('✅ カメラ映像DOM追加完了');
              } else if (camEl?.parentNode) {
                markerARLogger.info('📺 カメラ映像は既にDOMに存在');
                // 既存要素のスタイルも修正
                camEl.style.zIndex = '0';
                camEl.style.display = 'block';
                camEl.style.visibility = 'visible';
                camEl.style.opacity = '1';
                camEl.style.position = 'absolute';
                camEl.style.top = '0';
                camEl.style.left = '0';
                camEl.style.width = '100%';
                camEl.style.height = '100%';
                camEl.style.objectFit = 'cover';
                camEl.style.backgroundColor = '#000';
                camEl.style.pointerEvents = 'none';
              } else {
                markerARLogger.error('❌ カメラDOM要素が存在しません');
              }
              // iOS/Safari での再生ガード（強化版）
              if (camEl && typeof camEl.play === 'function') {
                const tryPlay = async (retryCount = 0) => {
                  try {
                    if (camEl.paused) {
                      await camEl.play();
                      markerARLogger.info('✅ カメラ映像の再生成功');
                    } else {
                      markerARLogger.info('ℹ️ カメラ映像は既に再生中');
                    }
                  } catch (e) {
                    markerARLogger.warn(`⚠️ カメラ映像の再生に失敗（試行 ${retryCount + 1}/3）:`, e?.message);
                    if (retryCount < 2) {
                      setTimeout(() => tryPlay(retryCount + 1), 500);
                    } else {
                      markerARLogger.error('❌ カメラ映像の再生に3回失敗しました');
                    }
                  }
                };
                
                // 複数のイベントで再生を試行
                camEl.addEventListener('loadedmetadata', () => tryPlay(), { once: true });
                camEl.addEventListener('canplay', () => tryPlay(), { once: true });
                camEl.addEventListener('loadeddata', () => tryPlay(), { once: true });
                
                // すでにメタデータがあれば即再生
                if (camEl.readyState >= 2) {
                  tryPlay();
                } else {
                  // メタデータがまだない場合、少し待ってから再試行
                  setTimeout(() => tryPlay(), 100);
                }
              }
            } catch (e) {
              markerARLogger.warn('⚠️ カメラDOM要素の配置に失敗（続行）:', e);
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
            markerARLogger.error('❌ ArToolkitSource 初期化失敗:', error);
            markerARLogger.error('❌ エラー詳細:', {
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
    markerARLogger.info('🎯 initARToolkitContext() 開始');
    return new Promise((resolve, reject) => {
      this.dlog('🎯 マーカー検出システム初期化開始');

      // カメラパラメータ設定
      const contextConfig = {
        cameraParametersUrl: this.options.cameraParametersUrl,
        detectionMode: 'mono',
        matrixCodeType: '3x3',
        canvasWidth: 640,
        canvasHeight: 480,
        maxDetectionRate: 30,
        debug: !!this.IS_DEBUG,
        imageSmoothingEnabled: false
      };

      markerARLogger.info('🔧 ARコンテキスト設定:', contextConfig);
      this.arToolkitContext = new window.THREEx.ArToolkitContext(contextConfig);

      let callbackExecuted = false;
      const initStartTime = Date.now();

      // クリーンアップ用
      let checkInterval = null;
      let forceSuccessTimeoutId = null;
      let errorTimeoutId = null;

      const cleanup = () => {
        if (checkInterval) clearInterval(checkInterval);
        if (forceSuccessTimeoutId) clearTimeout(forceSuccessTimeoutId);
        if (errorTimeoutId) clearTimeout(errorTimeoutId);
      };

      // AR.js初期化の成功コールバック
      const onInitSuccess = () => {
        if (callbackExecuted) return; // 二重実行防止
        callbackExecuted = true;
        cleanup();

        this.arContextInitialized = true;
        markerARLogger.info('✅ ARコンテキスト初期化完了:', {
          初期化時間: `${Date.now() - initStartTime}ms`,
          arController: !!this.arToolkitContext.arController
        });

        // カメラの投影行列を設定
        try {
          const projMatrix = this.arToolkitContext.getProjectionMatrix();
          if (projMatrix && this.camera.projectionMatrix) {
            this.camera.projectionMatrix.copy(projMatrix);
            this.dlog('✅ カメラ投影行列設定完了');
          }
        } catch (projError) {
          markerARLogger.warn('⚠️ カメラ投影行列設定エラー（続行）:', projError.message);
        }

        resolve();
      };

      // 初期化状態の定期チェック（デバッグ用）
      if (this.IS_DEBUG) {
        checkInterval = setInterval(() => {
          const elapsed = Date.now() - initStartTime;
          markerARLogger.info(`🔄 AR初期化進捗 (${elapsed}ms):`, {
            arController: !!this.arToolkitContext?.arController,
            callbackExecuted
          });
        }, 2000);
      }

      // AR.js初期化実行
      try {
        this.arToolkitContext.init(onInitSuccess);
      } catch (initError) {
        markerARLogger.error('❌ ARコンテキスト init() 呼び出しエラー:', initError);
        cleanup();
        reject(new Error(`ARコンテキスト初期化エラー: ${initError.message}`));
        return;
      }

      // 3秒後: 内部状態をチェックして準備ができていれば強制完了
      forceSuccessTimeoutId = setTimeout(() => {
        if (!callbackExecuted) {
          markerARLogger.info('🔄 3秒経過、AR.js内部状態をチェック...');

          // AR.jsが内部的に初期化されているかチェック
          const hasArController = !!this.arToolkitContext?.arController;
          const hasArContext = !!this.arToolkitContext?._arContext;

          if (hasArController || hasArContext) {
            markerARLogger.info('✅ AR.jsは内部的に初期化済み、強制的に成功扱い');
            onInitSuccess();
          } else {
            markerARLogger.info('⏳ AR.jsはまだ初期化中、さらに待機...');
          }
        }
      }, 3000);

      // 10秒後: まだ完了していなければ強制的に成功扱い（AR.jsコールバック問題対策）
      errorTimeoutId = setTimeout(() => {
        if (!callbackExecuted) {
          markerARLogger.warn('⚠️ ARコンテキスト初期化が10秒経過、強制的に続行します');
          onInitSuccess();
        }
      }, 10000);
    });
  }

  /**
   * マーカーコントロール設定
   */
  setupMarkerControls() {
    markerARLogger.info('🔧 マーカーコントロール設定');
    markerARLogger.info('🎯 使用するマーカーURL:', this.options.markerUrl);
    markerARLogger.info('🎯 マーカーURL詳細:', {
      '完全なURL': this.options.markerUrl,
      'URLの長さ': this.options.markerUrl?.length,
      'Blobか': this.options.markerUrl?.startsWith?.('blob:')
    });

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
    let lastDebugTime = Date.now();

    const checkMarkerVisibility = () => {
      const isVisible = this.markerRoot.visible;

      // デバッグ出力（3秒に1回）
      debugCounter++;
      const now = Date.now();
      if (now - lastDebugTime > 3000) {
        lastDebugTime = now;
        markerARLogger.info('🔍 MarkerAR デバッグ:', {
          マーカー可視: isVisible,
          ARコンテキスト: !!this.arToolkitContext,
          ARコンテキスト初期化済: !!(this.arToolkitContext && this.arToolkitContext._arContext),
          カメラソース存在: !!this.arToolkitSource,
          カメラ準備完了: !!(this.arToolkitSource && this.arToolkitSource.ready === true),
          カメラDOM要素: !!(this.arToolkitSource && this.arToolkitSource.domElement),
          動画サイズ: this.arToolkitSource && this.arToolkitSource.domElement ?
            `${this.arToolkitSource.domElement.videoWidth}x${this.arToolkitSource.domElement.videoHeight}` : 'N/A',
          読み込み済みモデル数: this.loadedModels?.length || 0,
          配置済みモデル: !!this.placedModel,
          使用中のマーカーURL: this.options.markerUrl
        });
      }
      
      if (isVisible && !wasVisible) {
        // マーカー発見
        this.isMarkerVisible = true;
        markerARLogger.info('🎯 マーカーを発見しました！');
        
        // 自動でモデル/デバッグキューブを配置
        markerARLogger.info('🔍 モデル配置判定:', {
          forceDebugCube: this.options.forceDebugCube,
          loadedModel: !!this.loadedModel,
          loadedModelsCount: this.loadedModels?.length || 0,
          placedModel: !!this.placedModel
        });
        
        // sample.glbテスト用：モデルがあれば優先的に表示
        if ((this.loadedModel || this.loadedModels?.length > 0) && !this.placedModel) {
          markerARLogger.info('📦 保存モデルを自動配置中...');
          this.placeModel();
        } else if (this.options.forceDebugCube && !this.placedModel) {
          // テストフラグが立っている場合はキューブを出す
          markerARLogger.info('🧪 テスト: 強制デバッグキューブを配置');
          this.placeDebugCube();
        } else if (!this.loadedModel && (!this.loadedModels || this.loadedModels.length === 0) && !this.placedModel) {
          // モデルが全くない場合のフォールバック
          markerARLogger.info('🧪 フォールバック: デバッグ用キューブを配置');
          this.placeDebugCube();
        } else {
          markerARLogger.warn('⚠️ どの配置条件にも該当しませんでした', {
            loadedModel: !!this.loadedModel,
            loadedModelsCount: this.loadedModels?.length || 0,
            placedModel: !!this.placedModel
          });
        }
        
        if (this.onMarkerFound) this.onMarkerFound();
      } else if (!isVisible && wasVisible) {
        // マーカー消失
        this.isMarkerVisible = false;
        markerARLogger.info('❌ マーカーを見失いました');
        if (this.onMarkerLost) this.onMarkerLost();
      }
      
      wasVisible = isVisible;
    };

    // 定期的にマーカー可視性をチェック（dispose時に停止するためIDを保存）
    this.visibilityCheckInterval = setInterval(checkMarkerVisibility, 100);

    markerARLogger.info('✅ マーカーコントロール設定完了');
  }

  /**
   * アニメーションループ開始
   */
  startRenderLoop() {
    markerARLogger.info('🎬 アニメーションループ開始');

    const animate = () => {
      requestAnimationFrame(animate);

      try {
        // AR.js 更新
        if (this.arToolkitSource &&
            this.arToolkitSource.ready === true &&
            this.arToolkitSource.domElement &&
            this.arToolkitContext &&
            this.arContextInitialized) {
          // 入力映像が有効か確認
          const videoElement = this.arToolkitSource.domElement;
          const hasSize = (videoElement.videoWidth > 0 && videoElement.videoHeight > 0);
          const readyStateOk = (typeof videoElement.readyState === 'number' ? videoElement.readyState >= 2 : true);
          if (hasSize && readyStateOk) {
            // update()が存在する場合のみ呼び出し
            if (typeof this.arToolkitContext.update === 'function') {
              this.arToolkitContext.update(videoElement);
            }
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
              markerARLogger.info('🎬 レンダリング状態:', {
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
          markerARLogger.warn('⚠️ アニメーションループエラー:', error.message);
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
    markerARLogger.info('📂 3Dモデル読み込み開始:', modelUrl);
    markerARLogger.info('📂 現在のloadedModels:', this.loadedModels.length, '個');

    return new Promise((resolve, reject) => {
      // GLTFLoader 準備確認
      if (!this.modelLoader) {
        markerARLogger.warn('⚠️ GLTFLoader 未準備のためモデルを読めません');
        reject(new Error('GLTFLoader is not available'));
        return;
      }

      this.modelLoader.load(
        modelUrl,
        (gltf) => {
          markerARLogger.info('✅ 3Dモデル読み込み完了');
          
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
          
          markerARLogger.info('🔍 モデルサイズ調整:', {
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
          
          markerARLogger.info('🎯 3Dモデル準備完了');
          if (this.onModelLoaded) this.onModelLoaded(model);

          // マーカーが既に可視かつ未配置なら即時配置（初回検出が先だったケースを救済）
          try {
            if (this.isMarkerVisible && !this.placedModel) {
              markerARLogger.info('📌 マーカー可視中のためモデルを即時配置');
              this.placeModel();
            }
          } catch (_) {}
          
          resolve(model);
        },
        (progress) => {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          markerARLogger.info(`📊 モデル読み込み進捗: ${percent}%`);
        },
        (error) => {
          markerARLogger.error('❌ 3Dモデル読み込み失敗:', error);
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
      
      markerARLogger.info('🧊 デバッグ用キューブを配置しました', {
        サイズ: size,
        位置: cube.position.toArray(),
        スケール: cube.scale.toArray(),
        マーカールート子要素数: this.markerRoot.children.length
      });
      return cube;
    } catch (e) {
      markerARLogger.warn('⚠️ デバッグ用キューブ配置に失敗:', e?.message || e);
      return null;
    }
  }

  /**
   * マーカー上にモデルを配置
   */
  placeModel() {
    // forceDebugCubeが有効でもモデル表示を優先（sample.glbテスト用）
    markerARLogger.info('📦 placeModel() 実行開始');

    if (!this.loadedModels || this.loadedModels.length === 0) {
      markerARLogger.warn('⚠️ 配置可能なモデルがありません');
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
    
    markerARLogger.info('🎯 マーカー上にモデルを配置しました（', this.loadedModels.length, '個）', {
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
      markerARLogger.info('🗑️ 配置されたモデルを削除しました');
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
      markerARLogger.info('📐 カメラ映像サイズ調整:', {
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
      markerARLogger.warn('⚠️ リサイズ処理で警告（続行）:', e?.message || e);
    }

    markerARLogger.info('📐 リサイズ完了:', { 
      containerWidth, 
      containerHeight, 
      videoSize: `${sourceWidth}x${sourceHeight}` 
    });
  }

  /**
   * クリーンアップ
   */
  dispose() {
    markerARLogger.info('🧹 MarkerAR クリーンアップ開始');

    // インターバル・タイマーの停止
    if (this.visibilityCheckInterval) {
      clearInterval(this.visibilityCheckInterval);
      this.visibilityCheckInterval = null;
      markerARLogger.info('✅ マーカー可視性チェック インターバル停止');
    }

    // リサイズイベントリスナーの削除
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
      markerARLogger.info('✅ リサイズイベントリスナー削除');
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

    // パターンBlob URLのクリーンアップ
    if (this._patternBlobRevoke) {
      try {
        this._patternBlobRevoke();
        markerARLogger.info('✅ パターンBlob URL解放');
      } catch (e) {
        markerARLogger.warn('⚠️ パターンBlob URL解放エラー:', e);
      }
      this._patternBlobRevoke = null;
    }

    markerARLogger.info('✅ MarkerAR クリーンアップ完了');
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
    markerARLogger.info('🚀 MarkerAR初期化開始');
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
    markerARLogger.info('▶️ MarkerAR開始');
    markerARLogger.info('🔍 projectData受け取り確認:', {
      'projectDataが存在': !!projectData,
      'projectDataの型': typeof projectData,
      'モデル数': projectData?.models?.length || 0,
      'モデルURL一覧': (projectData?.models || []).map(m => m.url || m.src),
      '__sourceUrl': projectData?.__sourceUrl
    });

    // 1) 既存の初期化（AR.js起動・レンダリング・コントロール設定）
    await this.init();

    // 1.5) GLTFLoaderの初期化を確実に完了させる
    if (!this.modelLoader) {
      markerARLogger.info('🔄 GLTFLoader未初期化のため再初期化を実行');
      await this._initGLTFLoader();
      // 少し待機してローダーの準備を確認
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 2) プロジェクトのモデルを事前読み込み（URLは __sourceUrl を基準に絶対化）
    try {
      const baseHref = (projectData && (projectData.__sourceUrl || (typeof location !== 'undefined' ? location.href : ''))) || '';
      const absolutize = (u) => {
        try { return new URL(u, baseHref).href; } catch (_) { return u; }
      };

      const models = Array.isArray(projectData?.models) ? projectData.models : [];
      if (models.length > 0) {
        markerARLogger.info('📦 プロジェクトモデル読み込み開始:', models.length);
        for (const m of models) {
          const url = absolutize(m.url || m.src || m.href);
          if (!url) continue;
          try {
            // GLB/GLTF を読み込み、this.loadedModels に貯める
            const gltf = await this.loadModel(url);
            if (gltf) {
              // this.loadModel 内で this.loadedModels に追加する設計に合わせる
            }
          } catch (e) {
            markerARLogger.warn('⚠️ モデル読み込み失敗をスキップ:', url, e?.message || e);
          }
        }
        markerARLogger.info('✅ プロジェクトモデル読み込み完了:', this.loadedModels?.length || 0);
      } else {
        markerARLogger.info('ℹ️ プロジェクトにモデルがありません');
      }

      // 3) 既にマーカーが見えていれば配置を実行
      if (this.isMarkerVisible && (this.loadedModels?.length || 0) > 0) {
        markerARLogger.info('🎯 既にマーカー可視 → モデルを配置');
        this.placeModel();
      }
    } catch (e) {
      markerARLogger.warn('⚠️ モデル事前読み込み処理で警告:', e?.message || e);
    }
  }

  /**
   * AREngineInterface 実装: AR停止
   */
  async stop() {
    this.isRunning = false;
    markerARLogger.info('⏹️ MarkerAR停止');
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
    markerARLogger.info('🗑️ MarkerAR破棄完了');
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
