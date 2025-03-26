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
    backgroundColor: 0xcccccc, // 背景色を少し明るめのグレーに変更
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

  // 初期カメラ位置を設定（後で調整される）
  camera.position.set(5, 5, 5);
  camera.lookAt(0, 0, 0);

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
  controls.minDistance = 1; // ズームインの制限を適切に設定
  controls.maxDistance = 100; // ズームアウトの制限を適切に設定

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
    gridHelper = new THREE.GridHelper(10, 10, 0x777777, 0xbbbbbb); // グリッドの色を調整
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
  // 関数内で初回読み込みフラグを管理
  let isFirstModelLoad = true;

  // loadModel関数を修正
  function loadModel(modelPath) {
    // モデルが読み込み中であることをユーザーに知らせるインジケータを追加するとよい

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
              } else if (child.material) {
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

        // 初期スケールを設定
        let initialScale = 1.0;
        if (isSampleModel) {
          initialScale = 0.1; // サンプルモデルの初期スケール
        } else if (config.markerMode) {
          initialScale = 0.5; // マーカーモードの初期スケール
        }
        model.scale.set(initialScale, initialScale, initialScale);

        // バウンディングボックスの計算
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);


        // モデルサイズの異常値チェックと調整
        const maxSize = Math.max(size.x, size.y, size.z);
        const targetSize = 5; // 理想的なモデルサイズ

        // モデルが大きすぎる、または小さすぎる場合にスケール調整
        if (maxSize > targetSize || maxSize < targetSize * 0.2) { // 調整: 閾値をtargetSizeの20%に変更
          const scaleFactor = targetSize / maxSize;
          const newScale = initialScale * scaleFactor;
          model.scale.set(newScale, newScale, newScale);

          // スケール変更後に再度バウンディングボックスとセンターを計算
          box.setFromObject(model);
          box.getSize(size);
          box.getCenter(center); // centerも再計算
          console.log("スケール調整後:", newScale, size);
        }

        // モデル位置を調整 - センタリング
        model.position.set(0, 0, 0);
        model.position.x -= center.x;
        model.position.z -= center.z;

        // マーカーモードの場合は床面に配置
        if (config.markerMode) {
          model.position.y -= box.min.y;
        } else {
          // 通常モードではY軸のセンタリングも行う
          model.position.y -= center.y;
        }

        // シーンに追加
        scene.add(model);

        // カメラ設定部分を修正（完全に置き換え）
        // モデルサイズに基づいてカメラ位置と視野を調整する関数
        const adjustCamera = () => {
          const maxDim = Math.max(size.x, size.y, size.z);
          const distance = maxDim * 2.5; // モデルの最大次元に基づいてカメラ距離を算出
          camera.position.set(distance, distance, distance);
          camera.lookAt(0, 0, 0);

          // クリッピングプレーンを調整
          camera.near = distance * 0.01;
          camera.far = distance * 20;
          camera.updateProjectionMatrix();

          // コントロールをリセット
          controls.reset();
          controls.target.set(0, 0, 0);
          controls.update();

          // ズーム制限を調整
          controls.minDistance = maxDim * 0.5;
          controls.maxDistance = maxDim * 5;
        };


        if (isFirstModelLoad) {
          // 初回読み込み時
          adjustCamera();
          isFirstModelLoad = false; // 初回フラグをオフに
        } else {
          // 2回目以降の読み込み時もカメラ位置を再調整
          adjustCamera();
        }


        console.log("モデル読み込み成功:", modelPath);
        console.log("スケール:", model.scale.x);
        console.log("サイズ:", size);
        console.log("カメラ位置:", camera.position);
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
    if (config.markerMode && markerMaterial) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(textureUrl, (texture) => {
        markerMaterial.map = texture;
        markerMaterial.needsUpdate = true;
      }, undefined, (error) => {
        console.error('マーカーテクスチャ読み込みエラー:', error);
      });
    }
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
    // マーカーテクスチャ設定用の関数
    setMarkerTexture: (textureUrl) => {
      setMarkerTexture(textureUrl);
    },
    // カメラをリセットする関数を追加
    resetCamera: () => {
      if (model) {
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);

        // adjustCamera関数を再利用
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2.5;
        camera.position.set(distance, distance, distance);
        camera.lookAt(0, 0, 0);

        camera.near = distance * 0.01;
        camera.far = distance * 20;
        camera.updateProjectionMatrix();

        controls.reset();
        controls.target.set(0, 0, 0);
        controls.update();

        controls.minDistance = maxDim * 0.5;
        controls.maxDistance = maxDim * 5;
      }
    }
  };

  // 破棄用関数と操作関数を返す
  return {
    dispose: () => {
      window.removeEventListener('resize', onWindowResize);

      // レンダラーの破棄
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();

      // モデルの破棄
      if (model) {
        model.traverse((child) => {
          if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else if (child.material) {
              child.material.dispose();
            }
          }
        });
        scene.remove(model);
      }

      // グリッドの破棄
      if (gridHelper) {
        scene.remove(gridHelper);
        if (gridHelper.geometry) gridHelper.geometry.dispose();
        if (gridHelper.material) {
          if (Array.isArray(gridHelper.material)) {
            gridHelper.material.forEach(material => material.dispose());
          } else {
            gridHelper.material.dispose();
          }
        }
      }

      // マーカープレーンの破棄
      if (markerPlane) {
        scene.remove(markerPlane);
        if (markerPlane.geometry) markerPlane.geometry.dispose();
      }

      if (markerMaterial) {
        if (markerMaterial.map) markerMaterial.map.dispose();
        markerMaterial.dispose();
      }

      isFirstModelLoad = true; // フラグをリセット
    },
    controls: modelControls,
    // シーンやカメラへのアクセスを提供（デバッグや拡張用）
    scene,
    camera
  };
}