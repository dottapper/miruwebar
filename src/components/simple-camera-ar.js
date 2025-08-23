// シンプルなカメラベースARの実装
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * シンプルなカメラAR初期化
 */
export async function initSimpleCameraAR(containerId, options = {}) {
  console.log('🚀 initSimpleCameraAR 呼び出し開始:', { containerId, options });
  
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('❌ コンテナが見つかりません:', containerId);
    throw new Error(`Container with id "${containerId}" not found`);
  }

  console.log('📱 シンプルカメラAR初期化開始:', { 
    options, 
    containerSize: { width: container.clientWidth, height: container.clientHeight }
  });

  // コンテナをクリア
  container.innerHTML = '';
  
  // カメラストリーム取得
  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  video.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 1;
    transform: scaleX(-1); /* 前面カメラの場合は反転 */
  `;

  console.log('📹 カメラストリーム取得を開始...');
  console.log('🌐 現在の環境情報:', {
    hostname: location.hostname,
    protocol: location.protocol,
    isHTTPS: location.protocol === 'https:',
    userAgent: navigator.userAgent
  });
  
  try {
    // HTTP環境での開発時は制限を緩和
    const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname.includes('192.168');
    
    const constraints = {
      video: {
        facingMode: isLocalhost ? 'user' : { ideal: 'environment' }, // 開発時は前面カメラ
        width: { ideal: 1280, min: 320 },
        height: { ideal: 720, min: 240 }
      },
      audio: false
    };

    console.log('📷 カメラ許可を要求中...', {
      constraints,
      isLocalhost,
      protocol: location.protocol,
      hostname: location.hostname,
      mediaDevicesSupported: !!navigator.mediaDevices,
      getUserMediaSupported: !!navigator.mediaDevices?.getUserMedia
    });
    
    // HTTP環境でのフォールバック対応
    const stream = await navigator.mediaDevices.getUserMedia(constraints).catch(async (error) => {
      console.warn('⚠️ 初期カメラアクセス失敗、フォールバック試行:', error);
      
      // よりシンプルな制約で再試行
      return await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
    });
    
    video.srcObject = stream;
    await video.play();
    
    container.appendChild(video);
    console.log('✅ カメラストリーム取得成功');
    
    // カメラが背面か前面かを確認
    const videoTrack = stream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();
    console.log('📱 カメラ設定:', settings);
    
    if (settings.facingMode === 'user') {
      console.log('🤳 前面カメラが使用されています');
    } else {
      console.log('📷 背面カメラが使用されています');
      video.style.transform = 'scaleX(1)'; // 背面カメラは反転しない
    }
    
  } catch (error) {
    console.error('❌ カメラアクセスエラー:', error);
    
    // エラーメッセージを表示
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 0, 0, 0.8);
      color: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      z-index: 10;
      font-family: Arial, sans-serif;
    `;
    
    errorDiv.innerHTML = `
      <h3>📷 カメラアクセスエラー</h3>
      <p>${error.message}</p>
      <p>ブラウザの設定でカメラ許可を確認してください</p>
      <button onclick="location.reload()" style="
        background: white;
        color: red;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        margin-top: 10px;
        cursor: pointer;
      ">再試行</button>
    `;
    
    container.appendChild(errorDiv);
    throw error;
  }

  // Three.jsレンダラーをカメラの上に重ね合わせ
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75, 
    container.clientWidth / container.clientHeight, 
    0.1, 
    1000
  );
  
  // カメラの初期位置を調整（より近くに）
  camera.position.set(0, 0, 2);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true,
    premultipliedAlpha: false
  });
  
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x000000, 0); // 完全透明背景
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
  let arActive = false;

  // ARコントロールUI
  const controlsDiv = document.createElement('div');
  controlsDiv.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 30px;
    border-radius: 15px;
    text-align: center;
    z-index: 5;
    font-family: Arial, sans-serif;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;

  controlsDiv.innerHTML = `
    <h3 style="margin: 0 0 15px 0; font-size: 18px;">🎯 AR体験を開始</h3>
    <p style="margin: 0 0 20px 0; font-size: 14px; opacity: 0.9;">
      カメラが起動しました！<br>
      画面をタップして3Dオブジェクトを配置してください
    </p>
    <button id="ar-start-btn" style="
      background: linear-gradient(45deg, #4CAF50, #45a049);
      color: white;
      border: none;
      padding: 15px 25px;
      border-radius: 25px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(76, 175, 80, 0.3);
      transition: transform 0.2s;
    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
      🚀 AR開始
    </button>
  `;

  container.appendChild(controlsDiv);

  // AR開始ボタンのイベント
  document.getElementById('ar-start-btn').addEventListener('click', () => {
    arActive = true;
    controlsDiv.style.display = 'none';
    renderer.domElement.style.pointerEvents = 'auto';

    // 成功フィードバック
    showARFeedback('✨ 画面をタップして3Dオブジェクトを配置！', container);

    // 自動配置（最初の1体を中央に表示）
    try {
      console.log('🎯 自動配置処理開始:', {
        hasPlacedModel: !!placedModel,
        modelsLength: models.length,
        arActive
      });
      
      if (!placedModel && models.length > 0) {
        console.log('📦 モデルを自動配置中...');
        placedModel = models[0].clone();
        // より近い位置に配置（カメラから1.5m前方）
        placedModel.position.set(0, 0, -1.5);
        scene.add(placedModel);
        console.log('✅ モデル自動配置完了:', {
          position: placedModel.position,
          scale: placedModel.scale,
          inScene: scene.children.includes(placedModel)
        });
        showARFeedback('👋 モデルを仮配置しました（タップで再配置できます）', container);
      } else {
        console.log('⚠️ 自動配置スキップ:', {
          reason: placedModel ? 'already placed' : 'no models',
          modelsCount: models.length
        });
      }
    } catch (error) {
      console.error('❌ 自動配置エラー:', error);
    }
  });

      // タップイベント
    renderer.domElement.addEventListener('click', (event) => {
      if (!arActive) return;

      console.log('👆 画面タップ - ARオブジェクト配置');

      // 既存モデルを削除
      if (placedModel) {
        scene.remove(placedModel);
      }

      // 画面中央よりちょっと手前にモデルを配置
      if (models.length > 0) {
        placedModel = models[0].clone();
        
        // タップ位置を計算（画面座標から3D空間へ）
        const rect = renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // 3D空間での位置（カメラからより近い距離）
        placedModel.position.set(x * 1, y * 1, -1.5);
        // スケールを大きくして見やすく
        placedModel.scale.set(0.5, 0.5, 0.5);
        
        scene.add(placedModel);

        showARFeedback('🎉 ARオブジェクトを配置しました！', container);
        console.log('✅ ARオブジェクト配置成功', placedModel.position);
      }
    });

  // リサイズ対応
  function handleResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  
  window.addEventListener('resize', handleResize);

  // アニメーションループ
  let animationId;
  function animate() {
    animationId = requestAnimationFrame(animate);

    // モデルを回転させる（AR感を演出）
    if (placedModel) {
      placedModel.rotation.y += 0.02;
    }

    renderer.render(scene, camera);
  }

  animate();

  // 戻り値としてコントロールを返す
  return {
    loadModel: async (url) => {
      console.log('📦 3Dモデル読み込み開始:', {
        url,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      const loader = new GLTFLoader();
      
      return new Promise((resolve, reject) => {
        loader.load(
          url,
          (gltf) => {
            console.log('✅ GLTF読み込み成功:', {
              url,
              scene: !!gltf.scene,
              animations: gltf.animations?.length || 0,
              asset: gltf.asset
            });
            const model = gltf.scene;

            // 可視化安定化: サイズ正規化と中心・底面合わせ
            try {
              const box = new THREE.Box3().setFromObject(model);
              const size = new THREE.Vector3();
              box.getSize(size);
              const maxSize = Math.max(size.x, size.y, size.z) || 1;
              const targetSize = 1.0; // 1m程度（より大きく）
              const scale = Math.max(0.1, Math.min(5, targetSize / maxSize));
              model.scale.set(scale, scale, scale);

              // 再計算して中心・底面合わせ
              const box2 = new THREE.Box3().setFromObject(model);
              const center = new THREE.Vector3();
              box2.getCenter(center);
              model.position.sub(center);
              if (isFinite(box2.min.y)) {
                model.position.y -= box2.min.y;
              }
              
              console.log('📏 モデルサイズ調整完了:', {
                originalSize: size,
                targetSize,
                finalScale: scale,
                finalPosition: model.position
              });
            } catch (e) {
              console.warn('サイズ正規化に失敗しましたが続行します:', e);
              model.scale.set(0.5, 0.5, 0.5);
            }

            models.push(model);
            console.log('✅ ARモデル読み込み完了');
            resolve(model);
          },
          (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            console.log('📥 モデル読み込み中:', percent + '%');
          },
          (error) => {
            console.error('❌ ARモデル読み込みエラー:', error);
            reject(error);
          }
        );
      });
    },
    
    getScene: () => scene,
    getRenderer: () => renderer,
    getVideo: () => video,
    
    destroy: () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
      }
      window.removeEventListener('resize', handleResize);
    }
  };
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
    padding: 12px 20px;
    border-radius: 25px;
    z-index: 6;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    animation: fadeInOut 3s ease-in-out;
  `;
  
  feedback.textContent = message;
  container.appendChild(feedback);

  // CSS アニメーション追加
  if (!document.getElementById('ar-feedback-styles')) {
    const style = document.createElement('style');
    style.id = 'ar-feedback-styles';
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        15% { opacity: 1; transform: translateX(-50%) translateY(0px); }
        85% { opacity: 1; transform: translateX(-50%) translateY(0px); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => {
    if (container.contains(feedback)) {
      container.removeChild(feedback);
    }
  }, 3000);
}