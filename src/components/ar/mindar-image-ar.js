// src/components/ar/mindar-image-ar.js
// MindAR image target tracking（表紙・ポスター等の自然画像）

import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { AREngineInterface } from '../../utils/ar-engine-adapter.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('MindARImageAR');

export class MindARImageAR extends AREngineInterface {
  constructor(options = {}) {
    super(options);
    this.options = {
      imageTargetSrc: options.imageTargetSrc || null,
      worldScale: options.worldScale || 1.0,
      ...options
    };

    this._T = THREE;
    this.mindarThree = null;
    this.anchor = null;
    this.markerRoot = null;

    this.modelLoader = null;
    this.loadedModel = null;
    this.loadedModels = [];
    this.placedModel = null;
    this.placedGroup = null;

    this.isMarkerVisible = false;
    this.isInitialized = false;
    this.isRunning = false;
    this._animationLoopActive = false;

    this.onMarkerFound = null;
    this.onMarkerLost = null;
    this.autoPlaceOnMarkerFound = options.autoPlaceOnMarkerFound !== false;
  }

  static isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  static getEngineType() {
    return 'mindar';
  }

  async _initGLTFLoader() {
    if (this.modelLoader) return;
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    this.modelLoader = new GLTFLoader();
  }

  async init() {
    if (this.isInitialized) return;
    if (!this.options.imageTargetSrc) {
      throw new Error('image target targetUrl missing');
    }
    if (!this.container) {
      throw new Error('MindARImageAR: container is required');
    }

    log.info('MindAR 初期化開始', { imageTargetSrc: this.options.imageTargetSrc });

    this.mindarThree = new MindARThree({
      container: this.container,
      imageTargetSrc: this.options.imageTargetSrc,
      uiLoading: 'no',
      uiScanning: 'no',
      uiError: 'yes'
    });

    const { scene } = this.mindarThree;
    const ambient = new this._T.AmbientLight(0xffffff, 0.6);
    const dir = new this._T.DirectionalLight(0xffffff, 0.8);
    dir.position.set(1, 1, 1);
    scene.add(ambient);
    scene.add(dir);

    this.anchor = this.mindarThree.addAnchor(0);
    this.markerRoot = this.anchor.group;
    try { this.markerRoot.matrixAutoUpdate = false; } catch (_) { /* noop */ }

    this.anchor.onTargetFound = () => {
      this.isMarkerVisible = true;
      log.info('image target 検出');
      if (
        this.autoPlaceOnMarkerFound
        && (this.loadedModels?.length || 0) > 0
        && !this.placedModel
      ) {
        this.placeModel();
      }
      if (this.onMarkerFound) this.onMarkerFound();
    };

    this.anchor.onTargetLost = () => {
      this.isMarkerVisible = false;
      log.info('image target ロスト');
      if (this.onMarkerLost) this.onMarkerLost();
    };

    await this._initGLTFLoader();
    await this.mindarThree.start();
    this._ensureCameraVisible();
    this._startRenderLoop();
    this.isInitialized = true;
    log.info('MindAR 初期化完了');
  }

  /** カメラ映像がガイド背面で見えるよう video / canvas を整える */
  _ensureCameraVisible() {
    const host = this.container;
    if (!host) return;

    const videos = host.querySelectorAll('video');
    videos.forEach((vid) => {
      vid.setAttribute('playsinline', 'true');
      vid.setAttribute('muted', 'true');
      vid.setAttribute('autoplay', 'true');
      Object.assign(vid.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        zIndex: '0',
        display: 'block',
        visibility: 'visible',
        opacity: '1',
        pointerEvents: 'none',
        background: '#000'
      });
      if (vid.paused && typeof vid.play === 'function') {
        vid.play().catch(() => {});
      }
    });

    const renderer = this.mindarThree?.renderer;
    if (renderer) {
      try {
        if (renderer.setClearColor) renderer.setClearColor(0x000000, 0);
      } catch (_) { /* noop */ }
      const canvas = renderer.domElement;
      if (canvas) {
        Object.assign(canvas.style, {
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          zIndex: '1',
          pointerEvents: 'none',
          background: 'transparent'
        });
      }
    }
  }

  _startRenderLoop() {
    if (!this.mindarThree || this._animationLoopActive) return;
    this._animationLoopActive = true;
    const { renderer, scene, camera } = this.mindarThree;
    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });
  }

  async initialize() {
    return true;
  }

  async start(projectData) {
    this.isRunning = true;
    log.info('MindAR 開始', { models: projectData?.models?.length || 0 });
    await this.init();

    const baseHref = projectData?.__sourceUrl || (typeof location !== 'undefined' ? location.href : '');
    const absolutize = (u) => {
      try { return new URL(u, baseHref).href; } catch (_) { return u; }
    };

    const models = Array.isArray(projectData?.models) ? projectData.models : [];
    for (const m of models) {
      const url = absolutize(m.url || m.src || m.href);
      if (!url) continue;
      try {
        await this.loadModel(url);
      } catch (e) {
        log.warn('モデル読み込み失敗をスキップ', url, e?.message || e);
      }
    }

    if (
      this.autoPlaceOnMarkerFound
      && this.isMarkerVisible
      && (this.loadedModels?.length || 0) > 0
      && !this.placedModel
    ) {
      this.placeModel();
    } else if (
      !this.autoPlaceOnMarkerFound
      && this.isMarkerVisible
      && typeof this.onMarkerFound === 'function'
    ) {
      this.onMarkerFound();
    }
  }

  async loadModel(modelUrl) {
    await this._initGLTFLoader();
    if (!this.modelLoader) {
      throw new Error('GLTFLoader is not available');
    }

    return new Promise((resolve, reject) => {
      this.modelLoader.load(
        modelUrl,
        (gltf) => {
          const model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
          if (!model) {
            reject(new Error('Invalid GLTF content'));
            return;
          }
          const box = new this._T.Box3().setFromObject(model);
          const size = box.getSize(new this._T.Vector3());
          const targetEdge = (this.options.worldScale || 1) * 2.0;
          const scale = targetEdge / Math.max(size.x, size.y, size.z || 1);
          model.scale.setScalar(scale);
          box.setFromObject(model);
          model.position.y -= box.min.y;

          this.loadedModel = model.clone();
          this.loadedModels.push(model.clone());
          if (this.isMarkerVisible && !this.placedModel && this.autoPlaceOnMarkerFound) {
            this.placeModel();
          }
          resolve(model);
        },
        undefined,
        (error) => reject(error)
      );
    });
  }

  placeModel() {
    if (!this.markerRoot || !this.loadedModels?.length) {
      log.warn('配置可能なモデルがありません');
      return null;
    }
    if (this.placedGroup) {
      try { this.markerRoot.remove(this.placedGroup); } catch (_) { /* noop */ }
      this.placedGroup = null;
    }

    const group = new this._T.Group();
    let offsetX = 0;
    const gap = 0.2 * (this.options.worldScale || 1);

    for (const baseModel of this.loadedModels) {
      const m = baseModel.clone(true);
      const b = new this._T.Box3().setFromObject(m);
      m.position.y -= b.min.y;
      m.position.x = offsetX;
      group.add(m);
      const maxEdge = Math.max(
        Math.abs(b.max.x - b.min.x),
        Math.abs(b.max.y - b.min.y),
        Math.abs(b.max.z - b.min.z)
      );
      offsetX += maxEdge + gap;
    }

    this.markerRoot.add(group);
    this.placedGroup = group;
    this.placedModel = group;
    return group;
  }

  async stop() {
    this.isRunning = false;
  }

  cleanup() {
    try {
      if (this.mindarThree?.renderer) {
        this.mindarThree.renderer.setAnimationLoop(null);
      }
      this.mindarThree?.stop?.();
    } catch (e) {
      log.warn('MindAR stop 警告', e?.message || e);
    }

    const dom = this.mindarThree?.renderer?.domElement;
    if (dom?.parentNode) dom.parentNode.removeChild(dom);
    const cssDom = this.mindarThree?.cssRenderer?.domElement;
    if (cssDom?.parentNode) cssDom.parentNode.removeChild(cssDom);

    this.mindarThree = null;
    this.anchor = null;
    this.markerRoot = null;
    this.loadedModels = [];
    this.loadedModel = null;
    this.placedModel = null;
    this.placedGroup = null;
    this._animationLoopActive = false;
    this.isInitialized = false;
    this.isMarkerVisible = false;
  }

  async destroy() {
    await this.stop();
    this.cleanup();
    log.info('MindAR 破棄完了');
  }
}

export default MindARImageAR;
