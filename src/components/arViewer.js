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
  camera.position.set(0, 1.5, 3);
  
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
  controls.minDistance = 1;
  controls.maxDistance = 10;
  
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
  
  // マーカー型ARの場合、マーカープレーン追加
  let markerPlane;
  if (config.markerMode) {
    const markerGeometry = new THREE.PlaneGeometry(1, 1);
    const markerMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    markerPlane = new THREE.Mesh(markerGeometry, markerMaterial);
    markerPlane.rotation.x = -Math.PI / 2; // 水平に配置
    markerPlane.position.y = -0.5;  // 少し下に配置
    markerPlane.receiveShadow = true;
    scene.add(markerPlane);
    
    // テクスチャをロードしてマーカーに適用する関数
    function setMarkerTexture(textureUrl) {
      if (!textureUrl) return;
      
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(
        textureUrl,
        (texture) => {
          // テクスチャの縦横比に合わせてジオメトリを調整
          const aspectRatio = texture.image.width / texture.image.height;
          
          // マーカープレーンを更新
          scene.remove(markerPlane);
          
          // 新しいジオメトリでマーカープレーンを作成
          const newGeometry = new THREE.PlaneGeometry(aspectRatio, 1);
          markerPlane.geometry.dispose();
          markerPlane.geometry = newGeometry;
          
          // テクスチャを適用
          markerMaterial.map = texture;
          markerMaterial.needsUpdate = true;
          markerMaterial.opacity = 1.0;
          
          scene.add(markerPlane);
        },
        undefined,
        (error) => {
          console.error('マーカーテクスチャの読み込みに失敗:', error);
        }
      );
    }
    
    // LocalStorageからマーカー画像を取得（マーカーモードの場合）
    const markerImageUrl = localStorage.getItem('markerImageUrl');
    if (markerImageUrl) {
      setMarkerTexture(markerImageUrl);
    }
  }
  
  // GLBモデルの読み込み
  const loader = new GLTFLoader();
  let model = null;
  
  // サンプルモデルを読み込み
  loadModel('/assets/sample.glb');
  
  // モデル読み込み関数
  function loadModel(modelPath) {
    loader.load(
      modelPath, 
      (gltf) => {
        // 既存モデルがあれば削除
        if (model) {
          scene.remove(model);
        }
        
        model = gltf.scene;
        
        // モデルのセットアップ
        model.scale.set(1, 1, 1);
        model.position.set(0, 0, 0);
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        scene.add(model);
        
        // モデルが読み込まれたら、カメラの位置を調整
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
        cameraZ *= 1.5; // 少し余裕を持たせる
        
        camera.position.set(center.x, center.y + size.y / 3, center.z + cameraZ);
        camera.near = cameraZ / 100;
        camera.far = cameraZ * 100;
        camera.updateProjectionMatrix();
        
        controls.target.copy(center);
        controls.update();
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% ロード完了');
      },
      (error) => {
        console.error('GLBモデル読み込みエラー:', error);
      }
    );
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
    // マーカー型AR用の追加機能
    setMarkerTexture: (textureUrl) => {
      if (config.markerMode && setMarkerTexture) {
        setMarkerTexture(textureUrl);
      }
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
            child.material.dispose();
          }
        });
      }
      
      if (gridHelper) {
        gridHelper.geometry.dispose();
        gridHelper.material.dispose();
      }
    },
    controls: modelControls
  };
}