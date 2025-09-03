// src/views/editor/transform-controls.js - Transform制御関連

// DEBUG ログ制御
const IS_DEBUG = (typeof window !== 'undefined' && !!window.DEBUG);
const dlog = (...args) => { if (IS_DEBUG) console.log(...args); };

/**
 * TransformControlsでの変更をUIに反映する関数
 */
export function updateUIFromTransformControls(arViewer) {
  if (!arViewer || !arViewer.model) return;

  const model = arViewer.model;
  
  // Position
  const posX = document.getElementById('pos-x');
  const posY = document.getElementById('pos-y');
  const posZ = document.getElementById('pos-z');
  
  if (posX) posX.value = model.position.x.toFixed(3);
  if (posY) posY.value = model.position.y.toFixed(3);
  if (posZ) posZ.value = model.position.z.toFixed(3);

  // Rotation (ラジアンから度数に変換)
  const rotX = document.getElementById('rot-x');
  const rotY = document.getElementById('rot-y');
  const rotZ = document.getElementById('rot-z');
  
  if (rotX) rotX.value = (model.rotation.x * 180 / Math.PI).toFixed(1);
  if (rotY) rotY.value = (model.rotation.y * 180 / Math.PI).toFixed(1);
  if (rotZ) rotZ.value = (model.rotation.z * 180 / Math.PI).toFixed(1);

  // Scale
  const scaleX = document.getElementById('scale-x');
  const scaleY = document.getElementById('scale-y');
  const scaleZ = document.getElementById('scale-z');
  
  if (scaleX) scaleX.value = model.scale.x.toFixed(3);
  if (scaleY) scaleY.value = model.scale.y.toFixed(3);
  if (scaleZ) scaleZ.value = model.scale.z.toFixed(3);
}

/**
 * UIからモデルのTransformを更新する関数
 */
export function updateModelFromUI(arViewer) {
  if (!arViewer || !arViewer.model) return;

  const model = arViewer.model;
  
  // Position
  const posX = parseFloat(document.getElementById('pos-x')?.value || 0);
  const posY = parseFloat(document.getElementById('pos-y')?.value || 0);
  const posZ = parseFloat(document.getElementById('pos-z')?.value || 0);
  
  model.position.set(posX, posY, posZ);

  // Rotation (度数からラジアンに変換)
  const rotX = (parseFloat(document.getElementById('rot-x')?.value || 0) * Math.PI / 180);
  const rotY = (parseFloat(document.getElementById('rot-y')?.value || 0) * Math.PI / 180);
  const rotZ = (parseFloat(document.getElementById('rot-z')?.value || 0) * Math.PI / 180);
  
  model.rotation.set(rotX, rotY, rotZ);

  // Scale
  const scaleX = parseFloat(document.getElementById('scale-x')?.value || 1);
  const scaleY = parseFloat(document.getElementById('scale-y')?.value || 1);
  const scaleZ = parseFloat(document.getElementById('scale-z')?.value || 1);
  
  model.scale.set(scaleX, scaleY, scaleZ);
  
  dlog('🎯 UIからモデルを更新:', {
    position: { x: posX, y: posY, z: posZ },
    rotation: { x: rotX, y: rotY, z: rotZ },
    scale: { x: scaleX, y: scaleY, z: scaleZ }
  });
}

/**
 * Transform制御のイベントリスナーを設定
 */
export function setupTransformControls(arViewer) {
  // Position controls
  ['pos-x', 'pos-y', 'pos-z'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', () => updateModelFromUI(arViewer));
    }
  });

  // Rotation controls
  ['rot-x', 'rot-y', 'rot-z'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', () => updateModelFromUI(arViewer));
    }
  });

  // Scale controls
  ['scale-x', 'scale-y', 'scale-z'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', () => updateModelFromUI(arViewer));
    }
  });

  // リセットボタン
  const resetButton = document.getElementById('reset-transform');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      resetTransform(arViewer);
    });
  }
}

/**
 * Transformをリセット
 */
function resetTransform(arViewer) {
  if (!arViewer || !arViewer.model) return;

  const model = arViewer.model;
  
  // モデルをリセット
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.scale.set(1, 1, 1);
  
  // UIを更新
  updateUIFromTransformControls(arViewer);
  
  dlog('🔄 Transform をリセットしました');
}