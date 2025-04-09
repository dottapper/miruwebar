import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';


export function initARViewer(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('コンテナが見つかりません:', containerId);
    return null;
  }
  
  const config = {
    showGrid: true,
    markerMode: false,
    backgroundColor: 0xcccccc,
    onModelLoaded: null,
    ...options
  };

  // シーン・カメラ・レンダラーの初期化
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(config.backgroundColor);

  const camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 5, 2);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth || 800, container.clientHeight || 600);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // OrbitControlsとTransformControlsの設定
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.minDistance = 0.1;
  controls.maxDistance = 500;
  //controls.target.set(0, 0, 0);

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

  const gridHelper = new THREE.GridHelper(10, 10, 0x777777, 0xbbbbbb);
  gridHelper.position.y = -0.01;
  scene.add(gridHelper);

  // マーカー（ARマーカーモードの場合）
  let markerPlane, markerMaterial;
  if (config.markerMode) {
    const markerSize = 1;
    const markerGeometry = new THREE.PlaneGeometry(markerSize, markerSize);
    markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
      map: null
    });
    markerPlane = new THREE.Mesh(markerGeometry, markerMaterial);
    markerPlane.rotation.x = -Math.PI / 2;
    markerPlane.position.y = 0;
    scene.add(markerPlane);
  }

  // モデル管理用変数
  const modelList = [];
  let activeModelIndex = -1;
  const loader = new GLTFLoader();
  const objectUrls = new Map();

  function createModelData(model, objectUrl, fileName, fileSize) {
    return {
      model,
      objectUrl,
      fileName,
      fileSize,
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      scale: new THREE.Vector3(1, 1, 1),
      visible: true
    };
  }

  function disposeModelResources(modelData) {
    if (!modelData || !modelData.model) return;
    if (modelData.objectUrl && modelData.objectUrl.startsWith('blob:')) {
      URL.revokeObjectURL(modelData.objectUrl);
      objectUrls.delete(modelData.model);
    }
    modelData.model.traverse(child => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => {
              if (material.map) material.map.dispose();
              material.dispose();
            });
          } else {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        }
      }
    });
  }

  // モデル読み込み関数
  function loadModel(modelUrl, fileName = 'model.glb', fileSize = 0) {
    return new Promise((resolve, reject) => {
      let createdObjectUrl = null;
      if (modelUrl instanceof Blob || modelUrl instanceof File) {
        createdObjectUrl = URL.createObjectURL(modelUrl);
        modelUrl = createdObjectUrl;
      }
      const isBlobUrl = modelUrl.startsWith('blob:');
      loader.load(modelUrl, gltf => {
        try {
          const model = gltf.scene;
          let storedObjectUrl = null;
          if (isBlobUrl) {
            storedObjectUrl = modelUrl;
            objectUrls.set(model, storedObjectUrl);
          }
          model.traverse(child => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          // バウンディングボックス計算とスケール・位置調整
          let box = new THREE.Box3().setFromObject(model);
          let size = new THREE.Vector3();
          box.getSize(size);
          let center = new THREE.Vector3();
          box.getCenter(center);
          if (config.onModelLoaded) config.onModelLoaded(size);
          const maxSize = Math.max(size.x, size.y, size.z);
          let scale = 1.0;
          if (isFinite(maxSize) && maxSize > 1e-6) {
            let targetSize = config.markerMode ? 0.5 : 2.0;
            scale = targetSize / maxSize;
            if (!isFinite(scale)) scale = 1.0;
          } else {
            scale = 1.0;
          }
          scale = Math.max(0.01, Math.min(100, scale));
          model.scale.set(scale, scale, scale);
          box.setFromObject(model);
          box.getCenter(center);
          if (center && isFinite(center.x) && isFinite(center.y) && isFinite(center.z) &&
              box && box.min && isFinite(box.min.y)) {
            model.position.sub(center);
            model.position.y -= box.min.y;
          } else {
            model.position.set(0, 0, 0);
          }
          const modelData = createModelData(model, storedObjectUrl, fileName, fileSize);
          modelData.position.copy(model.position);
          modelData.rotation.copy(model.rotation);
          modelData.scale.copy(model.scale);
          modelList.push(modelData);
          resolve(modelList.length - 1);
        } catch (innerError) {
          if (isBlobUrl) {
            URL.revokeObjectURL(modelUrl);
            objectUrls.delete(gltf.scene);
          }
          reject(innerError);
        }
      }, xhr => {
        console.log(`${fileName}: ${(xhr.loaded / xhr.total * 100).toFixed(0)}% ロード完了`);
      }, error => {
        if (isBlobUrl) URL.revokeObjectURL(modelUrl);
        reject(error);
      });
    });
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
    if (index === activeModelIndex) return false;
    const previousActiveIndex = activeModelIndex;
    if (previousActiveIndex >= 0 && previousActiveIndex < modelList.length) {
      if (!modelList[previousActiveIndex].visible) {
        _setModelVisibility(previousActiveIndex, true);
      }
    }
    if (index >= 0 && index < modelList.length) {
      _setModelVisibility(index, true);
      activeModelIndex = index;
      const activeModelData = modelList[activeModelIndex];
      applyModelTransform(activeModelData);
    } else {
      activeModelIndex = -1;
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
    const fov = camera.fov * (Math.PI / 180);
    let distance = (maxDim > 1e-6) ? (maxDim / (2 * Math.tan(fov / 2))) * 2.2 : 10;
    distance = Math.max(distance, maxDim * 1.8);
    const modelWorldCenter = new THREE.Vector3();
    const worldBox = box.clone().applyMatrix4(model.matrixWorld);
    worldBox.getCenter(modelWorldCenter);
    const newCameraPos = new THREE.Vector3(
      modelWorldCenter.x,
      modelWorldCenter.y + distance * 1.2,
      modelWorldCenter.z + distance * 0.2
    );
    camera.position.copy(newCameraPos);
    camera.near = Math.max(0.01, distance * 0.1);
    camera.far = distance * 10;
    camera.updateProjectionMatrix();
    controls.update();
    controls.target.copy(modelWorldCenter); 
    controls.minDistance = maxDim * 0.2;
    controls.maxDistance = Math.max(distance * 20, 50);
  }

  // マーカーテクスチャ設定
  function setMarkerTexture(textureUrl) {
    if (config.markerMode && markerMaterial) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(textureUrl, texture => {
        markerMaterial.map = texture;
        markerMaterial.opacity = 1;
        markerMaterial.needsUpdate = true;
      }, undefined, error => {
        markerMaterial.map = null;
        markerMaterial.opacity = 0.5;
        markerMaterial.needsUpdate = true;
      });
    }
  }

  if (config.markerMode) {
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
  let boundingBox = null;
  
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
     // --- バウンディングボックスの処理 ---
// 常に targetModel を対象にするように修正
const actualObjectToControl = targetModel;
if (boundingBox) scene.remove(boundingBox);
boundingBox = new THREE.BoxHelper(actualObjectToControl, 0x00ffff);
scene.add(boundingBox);

        try {
          transformControls.detach();
          if (!transformControls.mode) transformControls.mode = 'translate';
          
          if (!(actualObjectToControl instanceof THREE.Object3D)) { // ★型チェック追加
              
          }
          transformControls.attach(actualObjectToControl); // 元の attach 処理
          
          transformControls.visible = true;
        } catch (error) {
          transformControls.visible = false;
        }
        if (targetModelIndex !== activeModelIndex) {
          setActiveModel(targetModelIndex);
        }
      } else {
        transformControls.detach();
        transformControls.visible = false;
        if (boundingBox) {
          scene.remove(boundingBox);
          boundingBox = null;
        }
      }
    } else {
      if (boundingBox) {
        scene.remove(boundingBox);
        boundingBox = null;
      }
    }
  });

  // 正面ビューにカメラをリセットする関数
  function resetCameraToFrontView() {
    // アクティブなモデルがある場合はモデルを中心に
    if (activeModelIndex >= 0 && modelList[activeModelIndex] && modelList[activeModelIndex].model) {
      const model = modelList[activeModelIndex].model;
      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;
      
      // 新しいカメラ位置 (モデルの正面から見る)
      camera.position.set(center.x, center.y + maxDim * 0.5, center.z + cameraZ);
      controls.target.copy(center);
    } else {
      // モデルがない場合はデフォルト位置に
      camera.position.set(0, 5, 2);
      controls.target.set(0, 0, 0);
    }
    
    // アニメーションなしで即座に更新
    camera.updateProjectionMatrix();
    controls.update();
    
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
  function animate(time) {
    animationFrameId = requestAnimationFrame(animate);
    if (container && (lastWidth !== container.clientWidth || lastHeight !== container.clientHeight)) {
      lastWidth = container.clientWidth;
      lastHeight = container.clientHeight;
      onWindowResize();
    }
    controls.update();
    
    // メインシーンのレンダリング
    renderer.render(scene, camera);
    
    // 方向キューブの更新とレンダリング
    // カメラの回転に合わせてキューブも回転させる
    if (orientationCube) {
      orientationCube.rotation.copy(camera.rotation);
      // キューブのZ軸を180度回転させてカメラと同じ向きを示すようにする
      orientationCube.rotation.z += Math.PI;
      cubeRenderer.render(cubeScene, cubeCamera);
    }
  }
  animate();

  function getActiveModelData() {
    if (activeModelIndex >= 0 && activeModelIndex < modelList.length) {
      return modelList[activeModelIndex];
    }
    return null;
  }

  // 外部から利用するモデルコントロール群
  const modelControls = {
    loadNewModel: async (modelSource, fileName, fileSize) => {
      try {
        const index = await loadModel(modelSource, fileName, fileSize);
        setActiveModel(index);
        return index;
      } catch (error) {
        throw error;
      }
    },
    switchToModel: (index) => setActiveModel(index),
    getAllModels: () => modelList.map((data, index) => ({
      index,
      fileName: data.fileName,
      fileSize: data.fileSize,
      isActive: index === activeModelIndex,
      visible: data.visible,
      position: { x: data.position.x, y: data.position.y, z: data.position.z },
      rotation: {
        x: THREE.MathUtils.radToDeg(data.rotation.x),
        y: THREE.MathUtils.radToDeg(data.rotation.y),
        z: THREE.MathUtils.radToDeg(data.rotation.z)
      },
      scale: { x: data.scale.x, y: data.scale.y, z: data.scale.z }
    })),
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
      } else if (activeModelIndex >= 0) {
        transformControls.attach(modelList[activeModelIndex].model);
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
      if (index >= 0 && index < modelList.length) {
        const removedModelData = modelList[index];
        
        // Detach TransformControls if it's attached to the model being removed
        if (transformControls.object === removedModelData.model) {
          transformControls.detach();
          transformControls.visible = false;
        }

        // Remove bounding box if it exists
        if (boundingBox) {
          scene.remove(boundingBox);
          boundingBox = null;
        }

        if (removedModelData.model.parent) {
          scene.remove(removedModelData.model);
        }
        disposeModelResources(removedModelData);
        modelList.splice(index, 1);
        
        let newActiveIndex = -1;
        if (modelList.length === 0) {
          activeModelIndex = -1;
          transformControls.detach();
          transformControls.visible = false;
        } else if (activeModelIndex === index) {
          newActiveIndex = 0;
        } else if (activeModelIndex > index) {
          newActiveIndex = activeModelIndex - 1;
        } else {
          newActiveIndex = activeModelIndex;
        }
        
        setActiveModel(newActiveIndex);
        
        const modelListChangedEvent = new CustomEvent('modelListChanged', {
          detail: { models: modelControls.getAllModels(), activeModelIndex }
        });
        container.dispatchEvent(modelListChangedEvent);
        return true;
      }
      return false;
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
      } else {
        camera.position.set(0, 5, 2);
        controls.target.set(0, 0, 0);
        controls.minDistance = 0.1;
        controls.maxDistance = 100;
        camera.near = 0.1;
        camera.far = 1000;
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
    },
    // 正面ビューにリセットするメソッドを追加
    resetToFrontView: () => {
      resetCameraToFrontView();
    },
  };

  return {
    dispose: modelControls.dispose,
    controls: modelControls,
    getContainer: modelControls.getContainer
  };
}
