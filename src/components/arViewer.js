// src/components/arViewer.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function initARViewer(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('コンテナが見つかりません:', containerId);
    return;
  }

  // デフォルトオプションとマージ
  const config = {
    showGrid: true,
    markerMode: false,
    backgroundColor: 0x2a2a2a,
    ...options
  };

  // シーン、カメラ、レンダラーのセットアップ
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(config.backgroundColor);

  const camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  // 初期位置を削除 (後でモデルに基づいて設定)

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  // OrbitControlsを追加
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.screenSpacePanning = false;
  controls.maxPolarAngle = Math.PI / 1.5;
  controls.minDistance = 0.1; // ズームインの制限を緩和
  controls.maxDistance = 100; // ズームアウトの制限を緩和


  // 光源の追加
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 7.5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  scene.add(directionalLight);

  // グリッドヘルパーの追加（オプションに基づく）
  let gridHelper;
  if (config.showGrid) {
    gridHelper = new THREE.GridHelper(10, 10, 0x555555, 0x333333);
    scene.add(gridHelper);
  }

  // マーカー型ARの場合のマーカープレーン作成
  let markerPlane;
  let markerMaterial;
  if (config.markerMode) {
    const markerSize = 2; // マーカーのサイズ
    const markerGeometry = new THREE.PlaneGeometry(markerSize, markerSize);
    markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    });
    markerPlane = new THREE.Mesh(markerGeometry, markerMaterial);
    markerPlane.rotation.x = -Math.PI / 2; // 水平に配置（床面として）
    markerPlane.position.y = -0.01; // わずかに下げて、モデルとのZ-fightingを防止
    markerPlane.receiveShadow = true;
    scene.add(markerPlane);
  }

  // GLBモデルの読み込み
  const loader = new GLTFLoader();
  let model = null;


  // loadModel関数を修正
  function loadModel(modelPath) {
    loader.load(
      modelPath,
      (gltf) => {
        // 古いモデルの削除と破棄
        if (model) {
          scene.remove(model);
          model.traverse((child) => {
            if (child.isMesh) {
              child.geometry.dispose();
              if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          });
        }

        model = gltf.scene;

        // サンプルモデルかどうかを判定（特殊処理用）
        const isSampleModel = modelPath.includes('sample.glb');

        // モデルのセットアップ
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // 初期スケールを設定（サンプルモデルの場合は極小に）
        const initialScale = isSampleModel ? 0.01 :
          (config.markerMode ? 0.5 : 1.0);
        model.scale.set(initialScale, initialScale, initialScale);

        // バウンディングボックスの計算
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // モデルサイズの異常値チェックと調整
        const maxSize = Math.max(size.x, size.y, size.z);
        if (maxSize > 10) {
          // サイズが大きすぎる場合は追加でスケール調整
          const adjustedScale = initialScale * (10 / maxSize);
          model.scale.set(adjustedScale, adjustedScale, adjustedScale);

          // スケール変更後に再度バウンディングボックス計算
          box.setFromObject(model);
          center.copy(box.getCenter(new THREE.Vector3()));
          size.copy(box.getSize(new THREE.Vector3()));
        }

        // モデル位置を調整
        model.position.set(0, 0, 0);
        model.position.sub(center);

        // マーカーモードの場合は床面に配置
        if (config.markerMode) {
          const bottomY = box.min.y;
          model.position.y -= bottomY;
        }

        // シーンに追加
        scene.add(model);

        // カメラ設定（フォールバック方式）
        let cameraDistance;

        // 計算による距離
        const maxDimension = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        const calculatedDistance = (maxDimension / (2 * Math.tan(fov / 2))) * 2.0;

        // フォールバック値
        const fallbackDistance = isSampleModel ? 5 : 10;

        // 計算値が妥当な範囲内なら採用、そうでなければフォールバック値を使用
        cameraDistance = (calculatedDistance > 0.1 && calculatedDistance < 100) ?
          calculatedDistance : fallbackDistance;

        // カメラ位置を設定（高さを少し調整）
        const cameraHeight = cameraDistance * 0.4;
        camera.position.set(0, cameraHeight, cameraDistance);
        camera.lookAt(0, 0, 0);

        // near/farクリッピングプレーン調整
        camera.near = Math.max(0.1, cameraDistance / 100);
        camera.far = cameraDistance * 100;
        camera.updateProjectionMatrix();

        // OrbitControlsをリセット
        controls.reset();
        controls.target.set(0, 0, 0);
        controls.update();

        console.log("モデル:", modelPath);
        console.log("スケール:", model.scale.x);
        console.log("サイズ:", size);
        console.log("カメラ距離:", cameraDistance);
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% ロード完了');
      },
      (error) => {
        console.error('GLBモデル読み込みエラー:', error);
      }
    );
  }
  // サンプルモデルを読み込み (初期表示)
  loadModel('/assets/sample.glb');



  // マーカーテクスチャを設定する関数
  function setMarkerTexture(textureUrl) {
    if (!config.markerMode || !textureUrl || !markerPlane) return;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      textureUrl,
      (texture) => {
        // テクスチャの縦横比に合わせてジオメトリを調整
        const aspectRatio = texture.image.width / texture.image.height;

        // マーカープレーンを更新
        scene.remove(markerPlane);

        // 新しいジオメトリでマーカープレーンを作成
        const markerSize = 2; // 基本サイズ
        const newGeometry = new THREE.PlaneGeometry(
          aspectRatio > 1 ? markerSize : markerSize * aspectRatio,
          aspectRatio > 1 ? markerSize / aspectRatio : markerSize
        );

        markerPlane.geometry.dispose();
        markerPlane.geometry = newGeometry;

        // テクスチャを適用
        if (markerMaterial) {
          markerMaterial.map = texture;
          markerMaterial.needsUpdate = true;
        }

        scene.add(markerPlane);
      },
      undefined,
      (error) => {
        console.error('マーカーテクスチャの読み込みに失敗:', error);
      }
    );
  }

  // LocalStorageからマーカー画像を取得（マーカーモードの場合）
  if (config.markerMode) {
    const markerImageUrl = localStorage.getItem('markerImageUrl');
    if (markerImageUrl) {
      setMarkerTexture(markerImageUrl);
    }
  }

  // ウィンドウリサイズ対応
  function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  window.addEventListener('resize', onWindowResize);

  // アニメーションループ
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  // モデル操作関数を外部に公開
  const modelControls = {
    setScale: (scale) => {
      if (model) {
        model.scale.set(scale, scale, scale);
      }
    },
    setRotationY: (angleInDegrees) => {
      if (model) {
        model.rotation.y = (angleInDegrees * Math.PI) / 180;
      }
    },
    setPosition: (x, y, z) => {
      if (model) {
        model.position.set(x, y, z);
      }
    },
    loadNewModel: (modelPath) => {
      loadModel(modelPath);
    },
    // マーカーテクスチャ設定用の関数も公開
    setMarkerTexture: (textureUrl) => {
      setMarkerTexture(textureUrl);
    }
  };

  // 破棄用関数と操作関数を返す
  return {
    dispose: () => {
      window.removeEventListener('resize', onWindowResize);
      container.removeChild(renderer.domElement);
      renderer.dispose();

      if (model) {
        model.traverse((child) => {
          if (child.isMesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
              } else {
                child.material.dispose();
              }
          }
        });
      }

      if (gridHelper) {
        gridHelper.geometry.dispose();
        gridHelper.material.dispose();
      }

      if (markerPlane) {
        markerPlane.geometry.dispose();
        if (markerMaterial) markerMaterial.dispose();
      }
    },
    controls: modelControls
  };
}