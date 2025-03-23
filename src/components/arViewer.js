// src/components/arViewer.js
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

export function initARViewer(containerId) {
  const container = document.getElementById(containerId)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000)
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  container.appendChild(renderer.domElement)

  const light = new THREE.HemisphereLight(0xffffff, 0x444444)
  scene.add(light)

  const loader = new GLTFLoader()
  loader.load('/assets/kocoran-w-parts.glb', (gltf) => {
    const model = gltf.scene
    model.scale.set(1, 1, 1)
    scene.add(model)
    animate()
  }, undefined, (error) => {
    console.error('GLB読み込みエラー:', error)
  })

  camera.position.z = 2

  function animate() {
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
  }
}
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export function initARViewer() {
  const container = document.getElementById('viewer');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const light = new THREE.HemisphereLight(0xffffff, 0x444444);
  scene.add(light);

  const loader = new GLTFLoader();
  loader.load('/assets/sample.glb', (gltf) => {
    scene.add(gltf.scene);
    animate();
  }, undefined, (error) => {
    console.error('GLB読み込みエラー:', error);
  });

  camera.position.set(0, 1, 3);

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
}
