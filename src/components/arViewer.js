import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
// ★★★ TransformControls インポート確認ログ ★★★
console.log('[arViewer Import Check] Imported TransformControls:', TransformControls);
// ★★★ ここまで ★★★
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
  // ★★★ TransformControls インスタンス化前ログ ★★★
  console.log('[arViewer Instance Check] Before new TransformControls. Camera:', camera, 'Renderer DOM:', renderer.domElement);
  // ★★★ ここまで ★★★
  const transformControls = new TransformControls(camera, renderer.domElement);
  // ★★★ TransformControls インスタンス化後ログ ★★★
  console.log('[arViewer Instance Check] After new TransformControls. Instance:', transformControls);
    if (transformControls instanceof THREE.Object3D) {
        console.log('  - Instance IS an Object3D.');
    } else {
        console.error('  - ERROR: Instance is NOT an Object3D immediately after creation!');
    }
    // ★★★ ここまで ★★★
    // ★★★ プロトタイプチェーンを確認 ★★★
        console.log('  - transformControls prototype:', Object.getPrototypeOf(transformControls));
        console.log('  - transformControls constructor:', transformControls.constructor);
        console.log('  - Expected Object3D:', THREE.Object3D);
        console.log('  - Is prototype Object3D.prototype?', Object.getPrototypeOf(transformControls) === THREE.Object3D.prototype);
        console.log('  - Is constructor Object3D?', transformControls.constructor === THREE.Object3D);
    // ★★★ ここまで追加 ★★★
    
transformControls.size = 0.75; // コントロールのサイズを調整
transformControls.addEventListener('dragging-changed', (event) => {
    // ドラッグ中はOrbitControlsを無効化
  controls.enabled = !event.value;
});
transformControls.visible = false; // 初期状態では非表示
        // ★★★ TransformControls の scene.add を安全に行う ★★★
        if (transformControls instanceof THREE.Object3D) {
          console.log('[arViewer Init] transformControls is an instance of THREE.Object3D. Adding to scene.');
          try {
              scene.add(transformControls);
              console.log('[arViewer Init] Successfully added transformControls to scene.');
          } catch (addError) {
              console.error('[arViewer Init] Error adding transformControls to scene:', addError);
              console.error('  - transformControls object:', transformControls);
          }
      } else {
          console.error('[arViewer Init] ERROR: transformControls is NOT an instance of THREE.Object3D!');
          console.error('  - transformControls object:', transformControls);
          // エラーの場合、追加しない
      }
      // ★★★ ここまで ★★★
// 明示的にモードを設定
transformControls.mode = 'translate';
transformControls.addEventListener('objectChange', () => {
  if (activeModelIndex < 0 || !modelList[activeModelIndex]) {
    console.warn("objectChange triggered but no active model found.");
    return; // アクティブモデルがなければ何もしない
}
      const modelData = modelList[activeModelIndex];
      const model = modelData.model;


    // --- 値のチェックを追加 ---
    const pos = model.position;
    const rot = model.rotation;
    const scl = model.scale;

       // ★★★ この if 文を追加 ★★★
       if (
        isNaN(pos.x) || isNaN(pos.y) || isNaN(pos.z) || !isFinite(pos.x) || !isFinite(pos.y) || !isFinite(pos.z) ||
        isNaN(rot.x) || isNaN(rot.y) || isNaN(rot.z) || !isFinite(rot.x) || !isFinite(rot.y) || !isFinite(rot.z) ||
        isNaN(scl.x) || isNaN(scl.y) || isNaN(scl.z) || !isFinite(scl.x) || !isFinite(scl.y) || !isFinite(scl.z) ||
        scl.x < 0.001 || scl.y < 0.001 || scl.z < 0.001 // 極端に小さいスケールを不正とする
    ) {

      console.warn('不正な Transform 値が検出されました。更新をスキップします。', { pos, rot, scl });

      // ★★★ この3行のコメントを外す ★★★
      model.position.copy(modelData.position);
      model.rotation.copy(modelData.rotation);
      model.scale.copy(modelData.scale);
      // ★★★ ここまで ★★★
      
      console.warn('不正な Transform 値が検出されました。元の値に戻します。', { pos, rot, scl });

      // 元の値に戻す
      console.log('元の値:', { 
          position: modelData.position.toArray(),
          rotation: modelData.rotation.toArray(),
          scale: modelData.scale.toArray() 
      });
      
      model.position.copy(modelData.position);
      model.rotation.copy(modelData.rotation);
      model.scale.copy(modelData.scale);
      
      console.log('戻した後の値:', { 
          position: model.position.toArray(),
          rotation: model.rotation.toArray(),
          scale: model.scale.toArray() 
      });

      return; // 不正な値ならここで処理を中断
  }

      console.log('objectChange - Position:', model.position.x.toFixed(3), model.position.y.toFixed(3), model.position.z.toFixed(3));
      console.log('objectChange - Rotation:', THREE.MathUtils.radToDeg(model.rotation.x).toFixed(1), THREE.MathUtils.radToDeg(model.rotation.y).toFixed(1), THREE.MathUtils.radToDeg(model.rotation.z).toFixed(1));
      console.log('objectChange - Scale:', model.scale.x.toFixed(3), model.scale.y.toFixed(3), model.scale.z.toFixed(3));
      
      // モデルデータに最新の位置・回転・スケールを保存
      modelData.position.copy(pos); // model.position の代わりに変数 pos を使う
      modelData.rotation.copy(rot); // model.rotation の代わりに変数 rot を使う
      modelData.scale.copy(scl);    // model.scale の代わりに変数 scl を使う

      
      // カスタムイベント発火（UI更新用）
      const event = new CustomEvent('transformChanged', {
        detail: {
          index: activeModelIndex,
          position: {
            x: pos.x, // model.position.x -> pos.x
            y: pos.y, // model.position.y -> pos.y
            z: pos.z  // model.position.z -> pos.z
          },
          rotation: {
            x: THREE.MathUtils.radToDeg(rot.x), // model.rotation.x -> rot.x
            y: THREE.MathUtils.radToDeg(rot.y), // model.rotation.y -> rot.y
            z: THREE.MathUtils.radToDeg(rot.z)  // model.rotation.z -> rot.z
          },
          scale: {
            x: scl.x, // model.scale.x -> scl.x
            y: scl.y, // model.scale.y -> scl.y
            z: scl.z  // model.scale.z -> scl.z
          }
        }
      });
      container.dispatchEvent(event);
    
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
              console.log('[arViewer Load Callback] GLTF loaded successfully. Entering try block...'); // ★★★ この行を追加 ★★★
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
            // ★★★ バウンディングボックス計算のデバッグを追加 ★★★
            let box, size, center; // 変数をletで宣言
            let calculationSuccess = false; // 計算成功フラグ

            try {
                console.log('[arViewer BBox Debug] Calculating bounding box for model:', model);
                box = new THREE.Box3().setFromObject(model);
                console.log('  - Calculated box:', box);

                // box.min と box.max が有効かチェック
                if (!box || !isFinite(box.min.x) || !isFinite(box.min.y) || !isFinite(box.min.z) ||
                    !isFinite(box.max.x) || !isFinite(box.max.y) || !isFinite(box.max.z)) {
                    throw new Error(`Bounding box calculation failed (min/max invalid): ${JSON.stringify(box)}`);
                }

                size = new THREE.Vector3();
                box.getSize(size);
                console.log('  - Calculated size:', size);

                // size が有効かチェック (マイナスやNaNは異常)
                if (!size || !isFinite(size.x) || !isFinite(size.y) || !isFinite(size.z) || size.x < 0 || size.y < 0 || size.z < 0) {
                     throw new Error(`Bounding box size calculation failed (size invalid): ${JSON.stringify(size)}`);
                }

                center = new THREE.Vector3();
                box.getCenter(center);
                console.log('  - Calculated center:', center);

                // center が有効かチェック
                if (!center || !isFinite(center.x) || !isFinite(center.y) || !isFinite(center.z)) {
                     throw new Error(`Bounding box center calculation failed (center invalid): ${JSON.stringify(center)}`);
                }

                calculationSuccess = true; // ここまで来たら成功

            } catch (bboxError) {
                const modelNameInfo = fileName ? ` for model ${fileName}` : '';
                console.error(`[arViewer BBox Debug] Error during bounding box calculation${modelNameInfo}:`, bboxError);
                // 計算失敗時の代替値を設定
                box = new THREE.Box3(new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 1, 0.5)); // 仮のボックス (1x1x1)
                size = new THREE.Vector3(1, 1, 1);
                center = new THREE.Vector3(0, 0.5, 0);
                console.warn('[arViewer BBox Debug] Using fallback bounding box values.');
                calculationSuccess = false; // 失敗フラグ
            }
            // ★★★ ここまで ★★★
                // モデルのサイズを通知するコールバックがあれば呼び出し
if (config.onModelLoaded) {
    config.onModelLoaded(size);
  }

                const maxSize = Math.max(size.x, size.y, size.z);
                let scale = 1.0;

                        // ★★★ ここから変更 ★★★
            // maxSize が有効な数値か、かつゼロより大きいかチェック
            if (isFinite(maxSize) && maxSize > 1e-6) {
              let targetSize;
              if (config.markerMode) {
                  targetSize = 0.5; // マーカーサイズ(1.0)の半分
              } else {
                  targetSize = 2.0; // シーンサイズに合わせた目標サイズ
              }
              // ゼロ除算を防ぐため、ここでも maxSize をチェック（念のため）
              if (maxSize > 1e-9) { // より厳しいチェック
                  scale = targetSize / maxSize;
              } else {
                  console.warn(`[arViewer] maxSize is too small (${maxSize}) to calculate scale safely. Resetting scale to 1.0.`);
                  scale = 1.0;
              }


              // 計算結果のスケールが有効な数値かチェック
              if (!isFinite(scale)) {
                  console.warn(`[arViewer] Calculated scale is not finite (${scale}). Resetting to 1.0. maxSize: ${maxSize}, targetSize: ${targetSize}`);
                  scale = 1.0; // 不正な場合はデフォルト値に戻す
              }

          } else {
              // エラーメッセージにファイル名を追加
              const modelNameInfo = fileName ? ` for model ${fileName}` : '';
              console.warn(`[arViewer] Invalid maxSize (${maxSize}) calculated${modelNameInfo}. Using default scale 1.0.`);
              scale = 1.0; // maxSize が不正な場合はデフォルトスケールを使用
          }
          // ★★★ ここまで変更 ★★★

                      // 最終的なスケールが有効か再確認（念のため）
                      if (!isFinite(scale) || scale <= 0) {
                        console.warn(`[arViewer] Final scale is invalid (${scale}) before setting. Resetting to 1.0.`);
                        scale = 1.0;
                    }
                scale = Math.max(0.01, Math.min(100, scale)); // 極端なスケールを防ぐ
                model.scale.set(scale, scale, scale);

                // スケール適用後に再度バウンディングボックスを計算
                box.setFromObject(model);
                box.getCenter(center); // 新しい中心
                // size は使わないが、念のため再計算
                // box.getSize(size);

                // 位置調整: 中心を原点に、底面をY=0に
               // model.position.sub(center); // 中心を原点へ
               // model.position.y -= box.min.y; // 底面をY=0へ (min.yはローカル座標)
                           // ★★★ 位置調整の安全対策を追加 ★★★
            const centerIsValid = center && isFinite(center.x) && isFinite(center.y) && isFinite(center.z);
            const minYIsValid = box && box.min && isFinite(box.min.y);

            if (centerIsValid && minYIsValid) {
                // center と min.y が有効な場合のみ位置調整を実行
                model.position.sub(center);
                model.position.y -= box.min.y;

                // さらに、調整後の位置もチェック (念のため)
                const finalPos = model.position;
                if (!isFinite(finalPos.x) || !isFinite(finalPos.y) || !isFinite(finalPos.z)) {
                    console.warn(`[arViewer] Position became invalid after adjustment. Resetting position. Original center:`, center, `Original box.min.y:`, box.min.y);
                    // 問題が発生したら、元の位置（スケール適用直後）に戻すか、(0,0,0) にする
                    // ここでは一旦 (0,0,0) にリセットしてみます
                    model.position.set(0, 0, 0);
                }

            } else {
                // エラーメッセージにファイル名を追加
                const modelNameInfo = fileName ? ` for model ${fileName}` : '';
                console.warn(`[arViewer] Invalid center or box.min.y detected${modelNameInfo}. Skipping position adjustment.`);
                console.warn('  - Center:', center, ' (Valid:', centerIsValid, ')');
                console.warn('  - Box Min Y:', box && box.min ? box.min.y : 'N/A', ' (Valid:', minYIsValid, ')');
                // 位置調整ができない場合、モデルは原点 (0,0,0) に配置される（サブトラクション前なので）
                // または、明示的に (0,0,0) をセットしても良い
                model.position.set(0, 0, 0); // 安全のため原点に配置
            }
            // ★★★ ここまで ★★★

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
  
    const previousActiveIndex = activeModelIndex;
  
    // 前のアクティブモデルを非表示にする代わりに表示したままにする
    if (previousActiveIndex >= 0 && previousActiveIndex < modelList.length) {
      console.log(`About to hide previous model: ${previousActiveIndex}`);
      console.log(`Previous model visible before: ${modelList[previousActiveIndex].visible}`);
    // _setModelVisibility(previousActiveIndex, false);
      console.log(`Previous model visible after: ${modelList[previousActiveIndex].visible}`);
      
      // モデルが表示されていない場合のみ表示する
      if (!modelList[previousActiveIndex].visible) {
        _setModelVisibility(previousActiveIndex, true);
      }
    }
  
   // 新しいモデルを確実に表示し、TransformControlsをアタッチする
if (index >= 0 && index < modelList.length) {
  _setModelVisibility(index, true);
  activeModelIndex = index;
  
  const activeModelData = modelList[activeModelIndex];
  applyModelTransform(activeModelData);
  
  // TransformControlsを確実にアタッチし直す
  if (transformControls) {
    transformControls.detach();
    // モデルが有効なObject3Dかどうかチェック
if (activeModelData.model instanceof THREE.Object3D) {
  transformControls.attach(activeModelData.model);
  transformControls.visible = true;
  console.log('[arViewer] Attached TransformControls to model:', activeModelData.model);
} else {
  console.error('[arViewer] Cannot attach TransformControls - model is not a valid Object3D:', activeModelData.model);
  // 子オブジェクトがあれば最初の子にアタッチしてみる
  if (activeModelData.model.children && activeModelData.model.children.length > 0) {
    const firstChild = activeModelData.model.children[0];
    if (firstChild instanceof THREE.Object3D) {
      transformControls.attach(firstChild);
      transformControls.visible = true;
      console.log('[arViewer] Attached TransformControls to model child:', firstChild);
    }
  }
}
    transformControls.visible = true;
  }
} else {
  activeModelIndex = -1;
}
  
    // activeModelChangedイベントを発火
    const activeModelChangedEvent = new Event('activeModelChanged');
    activeModelChangedEvent.detail = { 
      index: activeModelIndex, 
      previousIndex: previousActiveIndex 
    };
    container.dispatchEvent(activeModelChangedEvent);
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
  

  // Raycaster（クリック検出用）
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let boundingBox = null;
  
  // モデルクリック処理
  renderer.domElement.addEventListener('click', (event) => {
    console.log("Click event triggered");
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
console.log(`Selectable objects count: ${selectableObjects.length}`);
        // ★★★ Raycaster デバッグ用ログを追加 ★★★
        console.log('[Raycaster Debug] Checking intersections with these objects:');
        selectableObjects.forEach((obj, i) => {
            console.log(`  [${i}] Type: ${obj.type}, Visible: ${obj.visible}, Parent Type: ${obj.parent ? obj.parent.type : 'null'}, Position:`, obj.position);
        });
        console.log('[Raycaster Debug] Raycaster details:', raycaster);
        const intersects = raycaster.intersectObjects(selectableObjects, true); // 第2引数 true を追加
        // ★★★ ここまで ★★★
            // ★★★ Raycaster デバッグ用ログを追加 ★★★
    console.log(`[Raycaster Debug] Intersects found: ${intersects.length}`);
    if (intersects.length > 0) {
        console.log('[Raycaster Debug] First intersected object:', intersects[0].object);
        console.log('  - Distance:', intersects[0].distance);
        console.log('  - Point:', intersects[0].point);
    }
    // ★★★ ここまで ★★★
   
    if (intersects.length > 0) {
      // クリックされた一番手前のメッシュを取得
      const selectedMesh = intersects[0].object;

      // クリックされたメッシュがどのモデルに属するか特定
      let targetModel = null;
      let targetModelIndex = -1;

      // selectedMesh の祖先を辿って、modelList に含まれるモデルを探す
      selectedMesh.traverseAncestors((ancestor) => {
        // 既に targetModel が見つかっていれば探索を終了
        if (targetModel) return;

        // modelList 内のモデルと比較
        const foundIndex = modelList.findIndex(data => data.model === ancestor);
        if (foundIndex !== -1) {
          targetModel = modelList[foundIndex].model;
          targetModelIndex = foundIndex;
        }
      });

      // クリックされたオブジェクトが管理下のモデルに属していた場合
      if (targetModel && targetModelIndex !== -1) {
        console.log(`Clicked model found: Index=${targetModelIndex}, Name=${modelList[targetModelIndex].fileName}`);
        console.log(`Model visible: ${modelList[targetModelIndex].visible}`);
        console.log(`Model in scene: ${modelList[targetModelIndex].model.parent === scene}`);

        console.log('[arViewer] Attaching to targetModel:', targetModel);
        console.log('[arViewer] targetModel type:', targetModel.type); // Type (Group, Mesh, etc.)
        console.log('[arViewer] targetModel children count:', targetModel.children.length); // 子オブジェクトの数
        // --- バウンディングボックスの処理 ---
        const actualObjectToControl = targetModel.children[0] || targetModel;
        // 既存のバウンディングボックスがあれば削除
        if (boundingBox) scene.remove(boundingBox); // 先に削除しておく
        boundingBox = new THREE.BoxHelper(actualObjectToControl, 0x00ffff); // 修正: actualObjectToControl を使う
        scene.add(boundingBox);

// TransformControlsを対象モデルにアタッチする前に有効なObject3Dかチェック
if (actualObjectToControl instanceof THREE.Object3D) {
  try {
    // 一度デタッチしてからアタッチする
    transformControls.detach();
    
    // モード設定を明示的に行う（デフォルトはtranslate）
    if (!transformControls.mode || transformControls.mode === '') {
      transformControls.mode = 'translate';
    }
                // ★★★ デバッグ用ログを追加 ★★★
            console.log('[arViewer Debug] Attempting to attach TransformControls to:', actualObjectToControl);
            if (actualObjectToControl instanceof THREE.Object3D) {
                console.log('  - Type:', actualObjectToControl.type);
                console.log('  - Visible:', actualObjectToControl.visible);
                console.log('  - Parent:', actualObjectToControl.parent ? actualObjectToControl.parent.type : 'null');
                console.log('  - Position:', actualObjectToControl.position.x, actualObjectToControl.position.y, actualObjectToControl.position.z);
                console.log('  - Scale:', actualObjectToControl.scale.x, actualObjectToControl.scale.y, actualObjectToControl.scale.z);
                // バウンディングボックス/スフィアの計算を試みる（エラーが出るか確認）
                try {
                    const testBox = new THREE.Box3().setFromObject(actualObjectToControl);
                    const testSphere = new THREE.Sphere();
                    testBox.getBoundingSphere(testSphere);
                    console.log('  - BoundingSphere Radius:', testSphere.radius);
                    if (isNaN(testSphere.radius)) {
                        console.error('  - WARNING: BoundingSphere radius is NaN!');
                    }
                } catch (e) {
                    console.error('  - Error calculating bounding box/sphere:', e);
                }
            } else {
                console.error('  - ERROR: actualObjectToControl is NOT an instance of THREE.Object3D!');
            }
            // ★★★ デバッグ用ログここまで ★★★
    // アタッチして表示
transformControls.attach(actualObjectToControl);
transformControls.visible = true;
    
    console.log("Successfully attached TransformControls to model");
    console.log('TransformControls mode:', transformControls.mode);
    console.log('TransformControls visible:', transformControls.visible);
    
    // 明示的にシーンに追加（既に追加されていても問題ない）
    if (transformControls.parent !== scene) {
      scene.add(transformControls);
    }
    
    // モデルの情報をログ出力
    console.log('Model transform after attach:',
      'Visible:', targetModel.visible,
      'Position:', targetModel.position.x, targetModel.position.y, targetModel.position.z,
      'Scale:', targetModel.scale.x, targetModel.scale.y, targetModel.scale.z,
      'Parent:', targetModel.parent ? targetModel.parent.type : 'null'
    );
// ★★★ デバッグ用: 何にアタッチしたかログ追加 ★★★
console.log('[arViewer] Successfully attached TransformControls to:', actualObjectToControl);
  } catch (error) {
    console.error("Error attaching TransformControls:", error);
    transformControls.visible = false;
  }
} else {
  console.error("Target model is not a valid THREE.Object3D instance");
  transformControls.visible = false;
}
        // --- アクティブモデルの切り替え処理 ---
        // クリックされたモデルが現在のアクティブモデルと違う場合のみ切り替える
        if (targetModelIndex !== activeModelIndex) {
          console.log(`Switching active model from ${activeModelIndex} to ${targetModelIndex}`);
          console.log('Before calling setActiveModel. Model visible:', targetModel.visible, 'Parent:', targetModel.parent?.type);
          setActiveModel(targetModelIndex); // ※ setActiveModel は内部で以前のモデルを非表示にする
          const currentModelData = modelList[activeModelIndex];
        console.log('After calling setActiveModel. Model visible:', currentModelData?.model.visible, 'Parent:', currentModelData?.model.parent?.type);
        } else {
          console.log(`Model ${targetModelIndex} is already active.`);
          // 既にアクティブなモデルをクリックした場合でも、
          // バウンディングボックスとTransformControlsは上記で再表示（またはアタッチし直し）される
          const currentModelData = modelList[activeModelIndex];
         console.log('Clicked already active model. Model visible:', currentModelData?.model.visible, 'Parent:', currentModelData?.model.parent?.type);
        }

      } else {
        // 管理外のオブジェクトがクリックされた場合（通常はあまりないはず）
        console.log('Clicked object is not part of a managed model or model not found in list.');
        // 必要であれば、管理外オブジェクト用の選択解除処理をここに追加
        // 例: TransformControls をデタッチするなど
        transformControls.detach();
        transformControls.visible = false;
        if (boundingBox) {
            scene.remove(boundingBox);
            boundingBox = null;
        }
      }

    } else {
      // --- 空クリック時の処理 (変更なし) ---
      // 選択解除処理
      try {
        transformControls.detach();
      } catch (error) {
        console.error("Error detaching TransformControls:", error);
      }
      transformControls.visible = false;
      // バウンディングボックスがあれば削除
      if (boundingBox) {
        scene.remove(boundingBox);
        boundingBox = null;
      }
      console.log('Clicked on empty space. Deselecting.');
      // 必要ならアクティブモデルインデックスもリセット
      // setActiveModel(-1); // ← 必要に応じてコメント解除
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
        console.log(`[arViewer] setTransformMode called with mode: ${mode}`);
        if (['translate', 'rotate', 'scale'].includes(mode)) {
          try {
            // 現在アタッチされているオブジェクトを保存
            const currentObject = transformControls.object;
            
            // 一度デタッチ
            transformControls.detach();
            
            // モードを設定
            transformControls.mode = mode;
            console.log(`[arViewer] transformControls.mode is now: ${transformControls.mode}`);
            
            // 元のオブジェクトが存在する場合は再アタッチ
            if (currentObject) {
              transformControls.attach(currentObject);
              transformControls.visible = true;
              console.log('[arViewer] Re-attached to object after mode change');
            } else if (activeModelIndex >= 0 && modelList[activeModelIndex]) {
              // アクティブモデルがある場合はそれをアタッチ
              transformControls.attach(modelList[activeModelIndex].model);
              transformControls.visible = true;
              console.log('[arViewer] Attached to active model after mode change');
            }
            
            return true;
          } catch (error) {
            console.error('[arViewer] Error setting transformControls.mode:', error);
            return false;
          }
        }
        console.log(`[arViewer] Invalid mode provided: ${mode}`);
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