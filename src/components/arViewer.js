// src/components/arViewer.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

export function initARViewer(containerId, options = {}) {
    console.log(`ARViewer: Initializing with container ID: ${containerId}`);
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('コンテナが見つかりません:', containerId);
      return null; // 失敗時は null を返す
    }
    
    console.log(`ARViewer: Container dimensions: ${container.clientWidth}x${container.clientHeight}`);


  // デフォルトオプションとマージ
  const config = {
    showGrid: true,
    markerMode: false,
    backgroundColor: 0xcccccc,
    onModelLoaded: null, // コールバックを追加
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
  camera.position.set(0, 5, 2); // 初期カメラ位置を真上寄り（X=0, Y=10, Z=2）に変更
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  // レンダラーのサイズ設定を遅延
  // 通常のサイズ設定は行っておく
  renderer.setSize(container.clientWidth || 800, container.clientHeight || 600);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // よりソフトな影
  container.appendChild(renderer.domElement);
  // arViewer.js の initARViewer 関数内、レンダラーの設定後に追加
  // Raycaster（クリック検出用）
  
  // OrbitControlsを追加
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1; // 少し滑らかに
  controls.screenSpacePanning = false;
  controls.minDistance = 0.1; // 最小距離を小さく
  controls.maxDistance = 500;
  controls.target.set(0, 0, 0); // ターゲットを明示的に設定

// TransformControlsを初期化
const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.size = 0.75; // コントロールのサイズを調整
transformControls.addEventListener('dragging-changed', (event) => {
    // ドラッグ中はOrbitControlsを無効化
  controls.enabled = !event.value;
});
transformControls.visible = false; // 初期状態では非表示
scene.add(transformControls);
transformControls.addEventListener('objectChange', () => {
    if (activeModelIndex >= 0) {
      const modelData = modelList[activeModelIndex];
      const model = modelData.model;
      
      // モデルデータに最新の位置・回転・スケールを保存
      modelData.position.copy(model.position);
      modelData.rotation.copy(model.rotation);
      modelData.scale.copy(model.scale);
      
      // カスタムイベント発火（UI更新用）
      const event = new CustomEvent('transformChanged', {
        detail: {
          index: activeModelIndex,
          position: {
            x: model.position.x,
            y: model.position.y,
            z: model.position.z
          },
          rotation: {
            x: THREE.MathUtils.radToDeg(model.rotation.x),
            y: THREE.MathUtils.radToDeg(model.rotation.y),
            z: THREE.MathUtils.radToDeg(model.rotation.z)
          },
          scale: {
            x: model.scale.x,
            y: model.scale.y,
            z: model.scale.z
          }
        }
      });
      container.dispatchEvent(event);
    }
  });


  // 光源の追加
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // 少し明るく
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // 少し弱く
  directionalLight.position.set(5, 10, 7.5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048; // 影の解像度を上げる
  directionalLight.shadow.mapSize.height = 2048;
  const d = 5; // シャドウカメラの範囲
  directionalLight.shadow.camera.left = - d;
  directionalLight.shadow.camera.right = d;
  directionalLight.shadow.camera.top = d;
  directionalLight.shadow.camera.bottom = - d;
  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 20;
  directionalLight.shadow.bias = -0.001; // シャドウアクネ対策
  scene.add(directionalLight);
  // scene.add(new THREE.CameraHelper(directionalLight.shadow.camera)); // デバッグ用

  // グリッドヘルパーの追加
  let gridHelper;
  
  gridHelper = new THREE.GridHelper(10, 10, 0x777777, 0xbbbbbb);
  gridHelper.position.y = -0.01; // 地面との重なりを防ぐ
  scene.add(gridHelper);
  

  // マーカー型ARの場合のマーカープレーン作成
  let markerPlane;
  let markerMaterial;
  if (config.markerMode) {
    const markerSize = 1; // マーカーサイズを1に (調整基準)
    const markerGeometry = new THREE.PlaneGeometry(markerSize, markerSize);
    markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5, // 初期は半透明（テクスチャ読み込み後に1にする）
      map: null // 初期はテクスチャなし
    });
    markerPlane = new THREE.Mesh(markerGeometry, markerMaterial);
    markerPlane.rotation.x = -Math.PI / 2;
    markerPlane.position.y = 0; // 地面レベル
    // markerPlane.receiveShadow = true; // BasicMaterialは影を受けない
    scene.add(markerPlane);
  }

  // モデル管理のための配列と変数
  const modelList = [];
  let activeModelIndex = -1;
  const loader = new GLTFLoader();
  const objectUrls = new Map(); // createObjectURLのURLを管理

  // モデルデータの構造
  function createModelData(model, objectUrl, fileName, fileSize) { // objectUrl を追加
    return {
      model: model,
      objectUrl: objectUrl, // URLを保持
      fileName: fileName,
      fileSize: fileSize,
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      scale: new THREE.Vector3(1, 1, 1),
      visible: true // 初期表示
    };
  }

  // リソース解放ヘルパー
  function disposeModelResources(modelData) {
      if (!modelData || !modelData.model) return;

      // ObjectURLの解放
      if (modelData.objectUrl && modelData.objectUrl.startsWith('blob:')) {
          URL.revokeObjectURL(modelData.objectUrl);
          console.log(`Revoked ObjectURL: ${modelData.objectUrl}`);
          objectUrls.delete(modelData.model); // Mapからも削除
      }

      // Three.jsリソースの解放
      modelData.model.traverse((child) => {
          if (child.isMesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                  if (Array.isArray(child.material)) {
                      child.material.forEach(material => {
                          if (material.map) material.map.dispose();
                          // 他のテクスチャマップも同様に解放
                          material.dispose();
                      });
                  } else {
                      if (child.material.map) child.material.map.dispose();
                      child.material.dispose();
                  }
              }
          }
      });
      console.log(`Disposed resources for model: ${modelData.fileName}`);
  }


  // loadModel 関数
  function loadModel(modelUrl, fileName = 'model.glb', fileSize = 0) {
    return new Promise((resolve, reject) => {
        let createdObjectUrl = null; // この関数内で生成したObjectURLを一時的に保持
        if (modelUrl instanceof Blob || modelUrl instanceof File) {
             // Blob/Fileが直接渡された場合はObjectURLを生成
            createdObjectUrl = URL.createObjectURL(modelUrl);
            modelUrl = createdObjectUrl; // loaderにはURLを渡す
        }

        // 渡されたURLが blob: かどうかをチェック
        const isBlobUrl = modelUrl.startsWith('blob:');

        loader.load(
            modelUrl,
            (gltf) => {
              try {
                const model = gltf.scene;
                let storedObjectUrl = null; // Mapに保存するURL

                if (isBlobUrl) {
                    // blob: URLの場合のみMapに保存
                    storedObjectUrl = modelUrl;
                    objectUrls.set(model, storedObjectUrl);
                }

                // モデルのセットアップ
                model.traverse((child) => {
                  if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                  }
                });

                // スケールと位置の初期調整
                const box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                box.getSize(size);
                const center = new THREE.Vector3();
                box.getCenter(center);
                // モデルのサイズを通知するコールバックがあれば呼び出し
if (config.onModelLoaded) {
    config.onModelLoaded(size);
  }

                const maxSize = Math.max(size.x, size.y, size.z);
                let scale = 1.0;

                if (maxSize > 1e-6) { // 非常に小さいモデルを除外
                    if (config.markerMode) {
                        const targetSize = 0.5; // マーカーサイズ(1.0)の半分
                        scale = targetSize / maxSize;
                    } else {
                        const targetSize = 2.0; // シーンサイズに合わせた目標サイズ
                        scale = targetSize / maxSize;
                    }
                }
                scale = Math.max(0.01, Math.min(100, scale)); // 極端なスケールを防ぐ
                model.scale.set(scale, scale, scale);

                // スケール適用後に再度バウンディングボックスを計算
                box.setFromObject(model);
                box.getCenter(center); // 新しい中心
                // size は使わないが、念のため再計算
                // box.getSize(size);

                // 位置調整: 中心を原点に、底面をY=0に
                model.position.sub(center); // 中心を原点へ
                model.position.y -= box.min.y; // 底面をY=0へ (min.yはローカル座標)

                // モデルデータを作成
                const modelData = createModelData(model, storedObjectUrl, fileName, fileSize);

                // 初期位置・回転・スケールをモデルデータに保存
                modelData.position.copy(model.position);
                modelData.rotation.copy(model.rotation);
                modelData.scale.copy(model.scale);

                modelList.push(modelData);
                resolve(modelList.length - 1);

              } catch (innerError) {
                console.error('モデル処理中のエラー:', innerError);
                // エラーが発生した場合、生成したObjectURLがあれば解放
                if (isBlobUrl) {
                    URL.revokeObjectURL(modelUrl);
                    objectUrls.delete(gltf.scene); // Mapからも削除（もし登録されていれば）
                }
                reject(innerError);
              }
            },
            (xhr) => {
              console.log(`${fileName}: ${(xhr.loaded / xhr.total * 100).toFixed(0)}% ロード完了`);
            },
            (error) => {
              console.error('GLBモデル読み込みエラー:', error);
              // エラーが発生した場合、生成したObjectURLがあれば解放
              if (isBlobUrl) {
                  URL.revokeObjectURL(modelUrl);
                  // Mapからの削除は model が存在しないため不要なことが多い
              }
              reject(error);
            }
      );
    });
  }

 // モデルの表示・非表示を切り替える内部関数
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
      return true; // 成功
    }
    return false; // 失敗
  }

  // アクティブなモデルを設定する
  function setActiveModel(index) {
    if (index === activeModelIndex) {
      return false;
    }

    const previousActiveIndex = activeModelIndex; // ★ previousActiveIndex を定義

    // 前のアクティブモデルを非表示に
    if (previousActiveIndex >= 0 && previousActiveIndex < modelList.length) {
        _setModelVisibility(previousActiveIndex, false);
    }

    // 新しいアクティブモデルを表示
    if (index >= 0 && index < modelList.length) {
      _setModelVisibility(index, true);
      activeModelIndex = index;

      const activeModelData = modelList[activeModelIndex];
      applyModelTransform(activeModelData);
     // adjustCameraToModel(activeModelData.model); // ← コメントアウトして呼び出しを抑制

    } else {
      activeModelIndex = -1;
      // 必要ならカメラをリセット
      // resetCamera();
    }

// activeModelChangedイベントを発火 (コンテナに対して)
const activeModelChangedEvent = new Event('activeModelChanged');
activeModelChangedEvent.detail = { 
    index: activeModelIndex, 
    previousIndex: previousActiveIndex 
};
container.dispatchEvent(activeModelChangedEvent); // container を使用
return true;
}  

  // モデルのトランスフォームを適用
  function applyModelTransform(modelData) {
    if (!modelData || !modelData.model) return;
    modelData.model.position.copy(modelData.position);
    modelData.model.rotation.copy(modelData.rotation);
    modelData.model.scale.copy(modelData.scale);
  }


  // モデルに基づいてカメラ位置を調整
  function adjustCameraToModel(model) {
    if (!model) return;

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    // カメラ距離の計算
    const fov = camera.fov * (Math.PI / 180);
    let distance = 10;
    if (maxDim > 1e-6) {
        distance = (maxDim / (2 * Math.tan(fov / 2))) * 2.2; // 3.0から2.2に変更
    }
    distance = Math.max(distance, maxDim * 1.8); // 2.0から1.5に変更


  // カメラの位置をモデルのワールド座標中心から計算
  const modelWorldCenter = new THREE.Vector3();
  const worldBox = box.clone().applyMatrix4(model.matrixWorld);
  worldBox.getCenter(modelWorldCenter);

// ここに以下のコードをまるまるコピペ（新しいカメラ位置の計算方法）

// カメラの位置を計算 (★YとZの計算式を変更)
const newCameraPos = new THREE.Vector3(
    modelWorldCenter.x,                         // X座標はモデルの中心
    modelWorldCenter.y + distance * 1.2,        // Y座標: さらに高く
    modelWorldCenter.z + distance * 0.2         // Z座標: 手前度合いを弱める
);

    // アニメーションさせる場合はTween.jsなどを使う
    // 即時反映
    camera.position.copy(newCameraPos);
   // controls.target.copy(modelWorldCenter); // カメラの注視点をモデル中心に

    // クリッピングプレーン調整
    camera.near = Math.max(0.01, distance * 0.1);
    camera.far = distance * 10;
    camera.updateProjectionMatrix();

    // コントロール更新
    controls.update();

    // ズーム制限
    controls.minDistance = maxDim * 0.2; // 少し近づけるように
    controls.maxDistance = Math.max(distance * 20, 50); // モデルサイズに応じて離れられる距離を増やし、最低でも50は離れられるようにする
  }

 
  // マーカーテクスチャを設定する関数
  function setMarkerTexture(textureUrl) {
    if (config.markerMode && markerMaterial) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(textureUrl, (texture) => {
        // texture.encoding = THREE.sRGBEncoding; // 必要に応じて色空間設定
        markerMaterial.map = texture;
        markerMaterial.opacity = 1; // 不透明にする
        markerMaterial.needsUpdate = true;
        console.log("マーカーテクスチャ設定完了:", textureUrl);
      }, undefined, (error) => {
        console.error('マーカーテクスチャ読み込みエラー:', error);
        markerMaterial.map = null;
        markerMaterial.opacity = 0.5; // 半透明に戻すなど
        markerMaterial.needsUpdate = true;
      });
    }
  }

  // LocalStorageからマーカー画像を取得（マーカーモードの場合）
  if (config.markerMode) {
    const markerImageUrl = localStorage.getItem('markerImageUrl');
    if (markerImageUrl) {
      setMarkerTexture(markerImageUrl);
    } else {
      // デフォルトマーカーがあれば設定
      setMarkerTexture('/assets/sample-marker.jpg'); // 仮のパス
    }
  }

  // ウィンドウリサイズ対応
  function onWindowResize() {
    if (!container) return; // コンテナがない場合は何もしない
    
    // 明示的にコンテナのサイズを再取得
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    
    // 強制的に1フレームレンダリング
    renderer.render(scene, camera);
  }
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('resize', onWindowResize);

  // Raycaster（クリック検出用）
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  // モデルクリック処理
  renderer.domElement.addEventListener('click', (event) => {
    // マウス座標の正規化
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // 検出対象はモデルリスト内のモデルのみ
    const selectableObjects = [];
    modelList.forEach(modelData => {
      if (modelData.visible) {
        modelData.model.traverse(child => {
          if (child.isMesh) {
            selectableObjects.push(child);
          }
        });
      }
    });
    
    const intersects = raycaster.intersectObjects(selectableObjects);
    
    if (intersects.length > 0) {
      // クリックされたメッシュから親のモデルを特定
      let selectedMesh = intersects[0].object;
      let modelIndex = -1;
      
      // モデルインデックスを特定
      modelList.forEach((modelData, index) => {
        let isParent = false;
        modelData.model.traverse(child => {
          if (child === selectedMesh) {
            isParent = true;
          }
        });
        if (isParent) {
          modelIndex = index;
        }
      });
      
// モデルクリック処理内の該当部分
if (modelIndex >= 0) {
    // モデルを選択状態に
    setActiveModel(modelIndex);
    
    // TransformControlsを確実に表示
    transformControls.attach(modelList[modelIndex].model);
    transformControls.visible = true;
    console.log("TransformControls attached to model:", modelIndex);
  }
    } else {
      // 空クリック時にTransformControlsを非表示に
      transformControls.detach();
      transformControls.visible = false;
    }
  });

  // アニメーションループ
  let animationFrameId = null; // この行を追加
  let lastWidth = container ? container.clientWidth : 0;
  let lastHeight = container ? container.clientHeight : 0;
  
  function animate(time) {
    animationFrameId = requestAnimationFrame(animate);
    // TWEEN.update(time); // Tween.jsを使う場合
    
    // コンテナのサイズ変更をチェック
    if (container && (lastWidth !== container.clientWidth || lastHeight !== container.clientHeight)) {
      lastWidth = container.clientWidth;
      lastHeight = container.clientHeight;
      onWindowResize();
    }
    
    controls.update(); // damping有効時は必須
    renderer.render(scene, camera);
  }
  animate();

  // アクティブモデルの取得（内部用）
  function getActiveModelData() {
    if (activeModelIndex >= 0 && activeModelIndex < modelList.length) {
      return modelList[activeModelIndex];
    }
    return null;
  }

  // --- 外部公開するコントロール ---
  const modelControls = {

    // モデル追加
    loadNewModel: async (modelSource, fileName, fileSize) => { // modelSource は URL文字列 or Blob/File
      try {
        const index = await loadModel(modelSource, fileName, fileSize);
        setActiveModel(index); // 新しいモデルをアクティブにする
        return index;
      } catch (error) {
        console.error("新しいモデルの読み込みまたはアクティブ化に失敗:", error);
        throw error; // エラーを再スロー
      }
    },

    // モデル切り替え
    switchToModel: (index) => {
      return setActiveModel(index);
    },

    // 全モデル一覧取得
    getAllModels: () => {
      return modelList.map((data, index) => ({
        index,
        fileName: data.fileName,
        fileSize: data.fileSize,
        isActive: index === activeModelIndex,
        visible: data.visible, // ★ visible プロパティを追加
        position: { x: data.position.x, y: data.position.y, z: data.position.z },
        // rotation は度数法で返す
        rotation: {
            x: THREE.MathUtils.radToDeg(data.rotation.x),
            y: THREE.MathUtils.radToDeg(data.rotation.y),
            z: THREE.MathUtils.radToDeg(data.rotation.z)
        },
        scale: { x: data.scale.x, y: data.scale.y, z: data.scale.z }
      }));
    },

    // アクティブモデルのインデックス取得
    getActiveModelIndex: () => {
      return activeModelIndex;
    },
    
    // TransformControlsのモード切り替え
    setTransformMode: (mode) => {
      if (['translate', 'rotate', 'scale'].includes(mode)) {
        transformControls.mode = mode;
        return true;
      }
      return false;
    },
    
    // TransformControlsの表示/非表示を切り替える
    toggleTransformControls: (visible) => {
      transformControls.visible = visible;
      if (!visible) {
        transformControls.detach();
      } else if (activeModelIndex >= 0) {
        transformControls.attach(modelList[activeModelIndex].model);
      }
    },

    // アクティブモデルの情報取得
    getActiveModelInfo: () => {
      const modelData = getActiveModelData();
      if (!modelData) return null;

      return {
        index: activeModelIndex,
        fileName: modelData.fileName,
        fileSize: modelData.fileSize,
        position: { x: modelData.position.x, y: modelData.position.y, z: modelData.position.z },
        // rotation は度数法で返す
        rotation: {
            x: THREE.MathUtils.radToDeg(modelData.rotation.x),
            y: THREE.MathUtils.radToDeg(modelData.rotation.y),
            z: THREE.MathUtils.radToDeg(modelData.rotation.z)
        },
        scale: { x: modelData.scale.x, y: modelData.scale.y, z: modelData.scale.z }
      };
    },

    // モデル削除
    removeModel: (index) => { // ★ 重複定義を削除し、こちらを採用
      if (index >= 0 && index < modelList.length) {
        const removedModelData = modelList[index];

        // シーンから削除
        if (removedModelData.model.parent) {
          scene.remove(removedModelData.model);
        }

        // リソース解放
        disposeModelResources(removedModelData); // ★ ヘルパー関数を使用

        // 配列から削除
        modelList.splice(index, 1);

        // アクティブインデックスの調整
        let newActiveIndex = -1;
        if (modelList.length === 0) {
            activeModelIndex = -1; // 早期リターンせずにインデックスを更新
        } else if (activeModelIndex === index) {
            newActiveIndex = 0; // 残っていれば最初のモデル
        } else if (activeModelIndex > index) {
            newActiveIndex = activeModelIndex - 1;
        } else {
            newActiveIndex = activeModelIndex; // 変わらない
        }

        // アクティブモデルを更新 (setActiveModel内でイベント発火)
        // 注意: setActiveModelは新しいインデックスが現在のindexと同じ場合falseを返すため、
        //       インデックスが変わらない場合でも強制的に更新したい場合があるかもしれない。
        //       ここでは setActiveModel をそのまま使う。
        const changed = setActiveModel(newActiveIndex);
        // もし setActiveModel が false を返した場合（つまりアクティブインデックスが変わらなかった場合）でも、
        // リスト自体は変更されたのでイベントを発火させる。
        // if (!changed) { // この条件分岐は setActiveModel の実装次第
            const modelListChangedEvent = new CustomEvent('modelListChanged', {
                detail: { models: modelControls.getAllModels(), activeModelIndex: activeModelIndex } // 更新後の状態
            });
            container.dispatchEvent(modelListChangedEvent); // ★ container を使用
        // }

        console.log(`Model removed at index: ${index}. New active index: ${activeModelIndex}`);
        return true;
      }
      return false;
    },

    // スケール設定
    setScale: (scale) => {
      const modelData = getActiveModelData();
      if (modelData) {
        const newScale = Math.max(0.001, scale); // 0以下のスケールを防ぐ
        modelData.model.scale.set(newScale, newScale, newScale);
        modelData.scale.copy(modelData.model.scale);
        // 必要に応じて位置再調整
        // const box = new THREE.Box3().setFromObject(modelData.model);
        // modelData.model.position.y = -box.min.y;
        // modelData.position.copy(modelData.model.position);
      }
    },

    // Y軸回転設定
    setRotationY: (angleInDegrees) => {
      const modelData = getActiveModelData();
      if (modelData) {
        const radians = THREE.MathUtils.degToRad(angleInDegrees);
        modelData.model.rotation.y = radians;
        modelData.rotation.y = radians;
      }
    },

    // 位置設定
    setPosition: (x, y, z) => {
      const modelData = getActiveModelData();
      if (modelData) {
        modelData.model.position.set(x, y, z);
        modelData.position.copy(modelData.model.position);
      }
    },

    // カメラリセット
    resetCamera: () => {
      const modelData = getActiveModelData();
      if (modelData) {
        adjustCameraToModel(modelData.model);
      } else {
        // デフォルトリセット
        camera.position.set(0, 5, 2); // ★ 初期位置を(0,10,2)に合わせる
        controls.target.set(0, 0, 0);
        controls.minDistance = 0.1;
        controls.maxDistance = 100;
        camera.near = 0.1;
        camera.far = 1000;
        camera.updateProjectionMatrix();
        controls.update();
      }
    },

    // マーカーテクスチャ設定
    setMarkerTexture: (textureUrl) => {
      setMarkerTexture(textureUrl);
    },

    // コンテナ要素取得
    getContainer: () => container, // ★ 追加

    // モデルの表示/非表示切り替え (外部インターフェース)
    setModelVisibility: (index, visible) => { // ★ 追加
        if (_setModelVisibility(index, visible)) { // 内部関数を呼ぶ
            // visibilityChanged イベントを発火
            const visibilityChangedEvent = new CustomEvent('visibilityChanged', {
                detail: { index: index, visible: visible }
            });
            container.dispatchEvent(visibilityChangedEvent);
        }
    },

    // リソース破棄
    dispose: () => {
      console.log("Disposing ARViewer...");
      if (!container) return; // すでに破棄されているか、初期化失敗

      window.removeEventListener('resize', onWindowResize);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId); // アニメーションループ停止
      }

      // モデルのリソース解放
      modelList.forEach(disposeModelResources); // ★ ヘルパー関数使用
      modelList.length = 0;
      activeModelIndex = -1;
      objectUrls.clear(); // ★ Mapクリア

      // シーン内のオブジェクトを削除・破棄
      // ライト
      scene.remove(ambientLight);
      scene.remove(directionalLight);
      // ヘルパー
      if (gridHelper) {
        scene.remove(gridHelper);
        if (gridHelper.geometry) gridHelper.geometry.dispose();
        if (gridHelper.material) gridHelper.material.dispose();
      }
      // マーカー
      if (markerPlane) {
        scene.remove(markerPlane);
        if (markerPlane.geometry) markerPlane.geometry.dispose();
      }
      if (markerMaterial) {
        if (markerMaterial.map) markerMaterial.map.dispose();
        markerMaterial.dispose();
      }
      // 他に scene に直接追加したオブジェクトがあればここで削除・破棄

      // OrbitControls の破棄
      controls.dispose();

      // レンダラーの破棄
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // コンテナ参照をクリア（念のため）
      // container = null; // const なので再代入不可、参照が残っていても問題ないことが多い

      console.log("ARViewer disposed.");
    }
  };

  // --- 最終的なインスタンス ---
  return {
    dispose: modelControls.dispose,
    controls: modelControls,
    getContainer: modelControls.getContainer // ★ 追加
  };
}