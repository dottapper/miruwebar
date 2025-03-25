// src/components/arViewer.js
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export function initARViewer(containerId) {
  const container = document.getElementById(containerId)
  if (!container) {
    console.error('コンテナが見つかりません:', containerId)
    return
  }

  // シーン、カメラ、レンダラーのセットアップ
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f0f0)
  
  const camera = new THREE.PerspectiveCamera(
    75, 
    container.clientWidth / container.clientHeight, 
    0.1, 
    1000
  )
  camera.position.set(0, 1, 3)
  
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.shadowMap.enabled = true
  container.appendChild(renderer.domElement)
  
  // OrbitControlsを追加
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.25
  
  // 光源の追加
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(5, 10, 7.5)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.width = 1024
  directionalLight.shadow.mapSize.height = 1024
  scene.add(directionalLight)
  
  // グリッドヘルパーの追加
  const gridHelper = new THREE.GridHelper(10, 10)
  scene.add(gridHelper)
  
  // GLBモデルの読み込み
  const loader = new GLTFLoader()
  let model = null
  
  loader.load('/assets/kocoran-w-parts.glb', 
    (gltf) => {
      model = gltf.scene
      
      // モデルのセットアップ
      model.scale.set(1, 1, 1)
      model.position.set(0, 0, 0)
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      
      scene.add(model)
      
      // モデルが読み込まれたら、カメラの位置を調整
      const box = new THREE.Box3().setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      
      const maxDim = Math.max(size.x, size.y, size.z)
      const fov = camera.fov * (Math.PI / 180)
      let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)))
      cameraZ *= 1.5 // 少し余裕を持たせる
      
      camera.position.set(center.x, center.y, center.z + cameraZ)
      camera.near = cameraZ / 100
      camera.far = cameraZ * 100
      camera.updateProjectionMatrix()
      
      controls.target.copy(center)
      controls.update()
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total * 100) + '% ロード完了')
    },
    (error) => {
      console.error('GLBモデル読み込みエラー:', error)
    }
  )
  
  // ウィンドウリサイズ対応
  function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.clientWidth, container.clientHeight)
  }
  
  window.addEventListener('resize', onWindowResize)
  
  // アニメーションループ
  function animate() {
    requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  
  animate()
  
  // 破棄用関数を返す（必要に応じて）
  return {
    dispose: () => {
      window.removeEventListener('resize', onWindowResize)
      container.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }
}