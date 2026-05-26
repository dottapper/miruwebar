// src/viewer-v2/index.js
// Viewer v2 — single-file AR viewer with one-way data flow
// project.json → parse → load assets → AR display

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { generateMarkerPatternFromImage, createPatternBlob } from '../utils/marker-utils.js';

// ---------------------------------------------------------------------------
// State: one plain object, mutated in place, read by UI helpers
// ---------------------------------------------------------------------------
const S = {
  phase: 'init', // init | loading | guide | ar | error
  project: null,
  projectSrc: null,
  error: null,
  arMode: null,   // 'marker' | 'webxr'
  engine: null,   // MarkerEngine | WebXREngine instance
  disposed: false,
};

// ---------------------------------------------------------------------------
// URL helpers (inline — no external dependency)
// ---------------------------------------------------------------------------
function getProjectSrc() {
  const u = new URL(location.href);
  const s1 = u.searchParams.get('src');
  if (s1) return new URL(s1, location.origin).toString();

  const h = location.hash || '';
  const qi = h.indexOf('?');
  if (qi >= 0) {
    const s2 = new URLSearchParams(h.slice(qi + 1)).get('src');
    if (s2) return new URL(s2, location.origin).toString();
  }

  const s3 = sessionStorage.getItem('project_src');
  if (s3) return s3;

  return null;
}

function resolveAssetUrl(relative, projectSrc) {
  if (!relative) return null;
  if (relative.startsWith('http://') || relative.startsWith('https://') || relative.startsWith('blob:') || relative.startsWith('data:')) {
    return relative;
  }
  const base = projectSrc.replace(/\/[^/]*$/, '/');
  return new URL(relative, base).toString();
}

// ---------------------------------------------------------------------------
// Project normalizer — extract what we need, ignore the rest
// ---------------------------------------------------------------------------
function normalizeProject(raw, projectSrc) {
  const models = [];
  const rawModels = raw.models || raw.screens?.[0]?.models || [];
  for (const m of rawModels) {
    const url = m.url || m.src;
    if (!url) continue;
    models.push({
      url: resolveAssetUrl(url, projectSrc),
      position: m.position ? [m.position.x ?? 0, m.position.y ?? 0, m.position.z ?? 0] : [0, 0, 0],
      rotation: m.rotation ? [m.rotation.x ?? 0, m.rotation.y ?? 0, m.rotation.z ?? 0] : [0, 0, 0],
      scale: m.scale ? [m.scale.x ?? 1, m.scale.y ?? 1, m.scale.z ?? 1] : [1, 1, 1],
    });
  }

  const type = raw.type || raw.mode || raw.screens?.[0]?.type || 'marker';
  const markerImage =
    raw.markerImage || raw.markerImageUrl ||
    raw.guide?.markerImage || raw.guide?.marker?.src ||
    raw.screens?.[0]?.marker?.src || null;

  return {
    id: raw.id || 'unknown',
    name: raw.name || raw.startScreen?.title || 'AR Project',
    type,
    models,
    markerImage: markerImage ? resolveAssetUrl(markerImage, projectSrc) : null,
    markerPattern: raw.markerPattern ? resolveAssetUrl(raw.markerPattern, projectSrc) : null,
    theme: raw.theme || {},
    guide: raw.guide || raw.guideScreen || {},
    loading: raw.loading || raw.loadingScreen || {},
    start: raw.start || raw.startScreen || {},
  };
}

// ---------------------------------------------------------------------------
// UI — all DOM in one place
// ---------------------------------------------------------------------------
function createUI(container) {
  container.innerHTML = '';
  const root = document.createElement('div');
  root.id = 'v2-root';
  root.innerHTML = `
    <style>
      #v2-root { position:fixed; inset:0; background:#000; color:#fff; font-family:system-ui,sans-serif; overflow:hidden; }
      #v2-root * { box-sizing:border-box; }
      .v2-screen { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; transition:opacity .3s; }
      .v2-screen[hidden] { display:none; }
      .v2-loading-bar { width:60%; max-width:240px; height:4px; background:#333; border-radius:2px; margin-top:16px; overflow:hidden; }
      .v2-loading-fill { height:100%; width:0%; background:#6c5ce7; transition:width .3s; }
      .v2-btn { padding:14px 32px; border:none; border-radius:12px; background:#6c5ce7; color:#fff; font-size:16px; font-weight:600; cursor:pointer; }
      .v2-btn:active { opacity:.8; }
      .v2-guide-img { max-width:200px; max-height:200px; border-radius:8px; margin-bottom:16px; border:2px solid rgba(255,255,255,.2); }
      .v2-error { color:#ff5252; text-align:center; padding:24px; }
      .v2-error h2 { margin-bottom:8px; }
      .v2-error pre { text-align:left; font-size:12px; background:#1a1a1a; padding:12px; border-radius:8px; max-height:200px; overflow:auto; margin-top:12px; }
      #v2-ar-host { position:absolute; inset:0; z-index:0; }
    </style>

    <div id="v2-loading" class="v2-screen">
      <p id="v2-loading-msg">読み込み中...</p>
      <div class="v2-loading-bar"><div id="v2-loading-fill" class="v2-loading-fill"></div></div>
    </div>

    <div id="v2-guide" class="v2-screen" hidden>
      <img id="v2-guide-img" class="v2-guide-img" hidden />
      <p id="v2-guide-msg">マーカーをカメラに写してください</p>
      <button id="v2-guide-btn" class="v2-btn" style="margin-top:20px;">ARを開始</button>
    </div>

    <div id="v2-ar" class="v2-screen" hidden>
      <div id="v2-ar-host"></div>
    </div>

    <div id="v2-error" class="v2-screen v2-error" hidden>
      <h2>エラー</h2>
      <p id="v2-error-msg"></p>
      <pre id="v2-error-detail" hidden></pre>
      <button class="v2-btn" style="margin-top:16px;" onclick="location.reload()">リロード</button>
    </div>
  `;
  container.appendChild(root);

  return {
    root,
    loading: root.querySelector('#v2-loading'),
    loadingMsg: root.querySelector('#v2-loading-msg'),
    loadingFill: root.querySelector('#v2-loading-fill'),
    guide: root.querySelector('#v2-guide'),
    guideImg: root.querySelector('#v2-guide-img'),
    guideMsg: root.querySelector('#v2-guide-msg'),
    guideBtn: root.querySelector('#v2-guide-btn'),
    ar: root.querySelector('#v2-ar'),
    arHost: root.querySelector('#v2-ar-host'),
    error: root.querySelector('#v2-error'),
    errorMsg: root.querySelector('#v2-error-msg'),
    errorDetail: root.querySelector('#v2-error-detail'),
  };
}

function showScreen(ui, name) {
  for (const s of ['loading', 'guide', 'ar', 'error']) {
    ui[s].hidden = (s !== name);
  }
}

function setProgress(ui, pct, msg) {
  ui.loadingFill.style.width = pct + '%';
  if (msg) ui.loadingMsg.textContent = msg;
}

function showError(ui, msg, detail) {
  ui.errorMsg.textContent = msg;
  if (detail) {
    ui.errorDetail.textContent = detail;
    ui.errorDetail.hidden = false;
  }
  showScreen(ui, 'error');
}

// ---------------------------------------------------------------------------
// Marker AR engine (AR.js + Three.js) — iPhone Safari
// ---------------------------------------------------------------------------
class MarkerEngine {
  constructor(hostEl) {
    this.host = hostEl;
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.scene.add(this.camera);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
    this.renderer.setClearColor(0x000000, 0);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(1, 1, 1);
    this.scene.add(dir);

    this.markerRoot = new THREE.Group();
    this.markerRoot.matrixAutoUpdate = false;
    this.scene.add(this.markerRoot);

    this.arToolkitSource = null;
    this.arToolkitContext = null;
    this._disposed = false;
    this._patternRevoke = null;
    this._resizeHandler = null;
    this._visibilityInterval = null;
  }

  async init(project) {
    window.THREE = THREE;

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    const w = this.host.clientWidth || window.innerWidth;
    const h = this.host.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:10;pointer-events:none;background:transparent;';
    this.host.appendChild(this.renderer.domElement);

    await this._loadARjs();
    const patternUrl = await this._preparePattern(project);
    const cameraParaUrl = await this._resolveCameraPara();
    await this._initSource();
    await this._initContext(cameraParaUrl);
    this._setupMarkerControls(patternUrl);
    await this._loadModels(project.models);
    this._startLoop();
  }

  async _loadARjs() {
    if (window.THREEx?.ArToolkitSource) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/arjs/ar-threex.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('AR.js の読み込みに失敗しました (/arjs/ar-threex.js)'));
      document.head.appendChild(s);
    });
    if (!window.THREEx?.ArToolkitSource) {
      throw new Error('AR.js ライブラリの初期化に失敗しました');
    }
  }

  async _preparePattern(project) {
    if (project.markerPattern?.startsWith('blob:')) return project.markerPattern;

    if (project.markerPattern) {
      try {
        const res = await fetch(project.markerPattern);
        if (res.ok) return project.markerPattern;
      } catch {}
    }

    if (project.markerImage) {
      const patternStr = await generateMarkerPatternFromImage(project.markerImage);
      if (patternStr) {
        const blob = createPatternBlob(patternStr);
        this._patternRevoke = blob.revoke;
        return blob.url;
      }
    }

    throw new Error('マーカーパターンを準備できませんでした。マーカー画像を確認してください。');
  }

  async _resolveCameraPara() {
    for (const url of ['/arjs/camera_para.dat', 'https://cdn.jsdelivr.net/npm/ar.js@2.2.2/data/camera_para.dat']) {
      try {
        const r = await fetch(url, { method: 'HEAD' });
        if (r.ok) return url;
      } catch {}
    }
    return '/arjs/camera_para.dat';
  }

  _initSource() {
    return new Promise((resolve, reject) => {
      this.arToolkitSource = new window.THREEx.ArToolkitSource({
        sourceType: 'webcam',
        sourceWidth: 640, sourceHeight: 480,
        displayWidth: 640, displayHeight: 480,
      });
      setTimeout(() => {
        this.arToolkitSource.init(() => {
          const vid = this.arToolkitSource.domElement;
          if (vid && !vid.parentNode) {
            vid.setAttribute('playsinline', 'true');
            vid.setAttribute('muted', 'true');
            vid.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;background:#000;pointer-events:none;';
            this.host.insertBefore(vid, this.host.firstChild);
          }
          if (vid?.paused && typeof vid.play === 'function') {
            vid.play().catch(() => {});
          }
          this._resizeHandler = () => this._onResize();
          window.addEventListener('resize', this._resizeHandler);
          this._onResize();
          resolve();
        }, (err) => {
          let msg = 'カメラアクセスに失敗しました';
          if (err?.name === 'NotAllowedError') msg = 'カメラ権限が拒否されました';
          else if (err?.name === 'NotFoundError') msg = 'カメラが見つかりません';
          reject(new Error(msg));
        });
      }, 100);
    });
  }

  _initContext(cameraParaUrl) {
    return new Promise((resolve, reject) => {
      this.arToolkitContext = new window.THREEx.ArToolkitContext({
        cameraParametersUrl: cameraParaUrl,
        detectionMode: 'mono',
        canvasWidth: 640, canvasHeight: 480,
        maxDetectionRate: 30,
      });

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        try {
          const proj = this.arToolkitContext.getProjectionMatrix();
          if (proj) this.camera.projectionMatrix.copy(proj);
        } catch {}
        resolve();
      };

      try { this.arToolkitContext.init(finish); } catch (e) { reject(e); return; }
      setTimeout(() => { if (!done) finish(); }, 8000);
    });
  }

  _setupMarkerControls(patternUrl) {
    new window.THREEx.ArMarkerControls(
      this.arToolkitContext, this.markerRoot,
      { type: 'pattern', patternUrl, changeMatrixMode: 'cameraTransformMatrix', patternRatio: 0.7, minConfidence: 0.5 }
    );

    let wasVisible = false;
    this._visibilityInterval = setInterval(() => {
      const vis = this.markerRoot.visible;
      if (vis && !wasVisible) console.log('[v2] marker found');
      if (!vis && wasVisible) console.log('[v2] marker lost');
      wasVisible = vis;
    }, 200);
  }

  async _loadModels(models) {
    if (!models.length) return;
    const loader = new GLTFLoader();
    loader.setCrossOrigin('anonymous');

    for (const cfg of models) {
      try {
        const gltf = await loader.loadAsync(cfg.url);
        const obj = gltf.scene || gltf.scenes?.[0];
        if (!obj) continue;

        obj.scale.set(...cfg.scale.map(v => Math.min(Math.max(v, 0.01), 100)));
        obj.position.set(...cfg.position);
        obj.rotation.set(...cfg.rotation);
        obj.traverse(n => { if (n.isMesh) n.frustumCulled = false; });
        this.markerRoot.add(obj);
      } catch (e) {
        console.warn('[v2] model load failed:', cfg.url, e.message);
      }
    }

    if (this.markerRoot.children.length === 0) {
      const g = new THREE.BoxGeometry(0.3, 0.3, 0.3);
      const m = new THREE.MeshNormalMaterial();
      this.markerRoot.add(new THREE.Mesh(g, m));
    }
  }

  _startLoop() {
    const tick = () => {
      if (this._disposed) return;
      requestAnimationFrame(tick);
      try {
        if (this.arToolkitSource?.ready && this.arToolkitContext) {
          const vid = this.arToolkitSource.domElement;
          if (vid?.videoWidth > 0 && vid?.readyState >= 2) {
            this.arToolkitContext.update(vid);
          }
        }
        this.renderer.render(this.scene, this.camera);
      } catch {}
    };
    requestAnimationFrame(tick);
  }

  _onResize() {
    if (this.arToolkitSource) {
      this.arToolkitSource.onResizeElement();
      this.arToolkitSource.copyElementSizeTo(this.renderer.domElement);
      if (this.arToolkitContext?.arController) {
        this.arToolkitSource.copyElementSizeTo(this.arToolkitContext.arController.canvas);
      }
    }
  }

  dispose() {
    this._disposed = true;
    if (this._visibilityInterval) clearInterval(this._visibilityInterval);
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
    if (this._patternRevoke) this._patternRevoke();

    try {
      const vid = this.arToolkitSource?.domElement;
      if (vid?.srcObject) {
        vid.srcObject.getTracks().forEach(t => t.stop());
        vid.srcObject = null;
      }
      vid?.remove();
    } catch {}

    try { this.renderer.dispose(); } catch {}
    try { this.renderer.domElement.remove(); } catch {}

    this.markerRoot.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
  }
}

// ---------------------------------------------------------------------------
// WebXR engine (Android Chrome) — markerless, tap-to-place
// ---------------------------------------------------------------------------
class WebXREngine {
  constructor(hostEl) {
    this.host = hostEl;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 20);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.xr.enabled = true;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(1, 1, 1);
    this.scene.add(dir);

    this.hitTestSource = null;
    this.reticle = null;
    this.pendingModels = [];
    this.placed = false;
    this._disposed = false;
  }

  async init(project) {
    this.host.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';

    await this._loadModels(project.models);
    this._buildReticle();

    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: this.host },
    });

    this.renderer.xr.setReferenceSpaceType('local');
    await this.renderer.xr.setSession(session);

    const refSpace = await session.requestReferenceSpace('viewer');
    this.hitTestSource = await session.requestHitTestSource({ space: refSpace });

    session.addEventListener('select', () => this._onSelect());

    this.renderer.setAnimationLoop((_, frame) => {
      if (this._disposed || !frame) return;
      if (this.hitTestSource && !this.placed) {
        const results = frame.getHitTestResults(this.hitTestSource);
        if (results.length > 0) {
          const hit = results[0];
          const pose = hit.getPose(this.renderer.xr.getReferenceSpace());
          if (pose) {
            this.reticle.visible = true;
            this.reticle.matrix.fromArray(pose.transform.matrix);
          }
        }
      }
      this.renderer.render(this.scene, this.camera);
    });
  }

  _buildReticle() {
    const ring = new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x6c5ce7 });
    this.reticle = new THREE.Mesh(ring, mat);
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);
  }

  async _loadModels(models) {
    if (!models.length) {
      const g = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const m = new THREE.MeshNormalMaterial();
      this.pendingModels.push(new THREE.Mesh(g, m));
      return;
    }

    const loader = new GLTFLoader();
    loader.setCrossOrigin('anonymous');

    for (const cfg of models) {
      try {
        const gltf = await loader.loadAsync(cfg.url);
        const obj = gltf.scene || gltf.scenes?.[0];
        if (!obj) continue;
        obj.scale.set(...cfg.scale.map(v => Math.min(Math.max(v, 0.01), 100)));
        obj.traverse(n => { if (n.isMesh) n.frustumCulled = false; });
        this.pendingModels.push(obj);
      } catch (e) {
        console.warn('[v2] model load failed:', cfg.url, e.message);
      }
    }
  }

  _onSelect() {
    if (this.placed || !this.reticle.visible) return;
    const pos = new THREE.Vector3();
    this.reticle.getWorldPosition(pos);

    for (const model of this.pendingModels) {
      model.position.copy(pos);
      this.scene.add(model);
    }
    this.placed = true;
    this.reticle.visible = false;
    console.log('[v2] model placed via WebXR');
  }

  dispose() {
    this._disposed = true;
    try { this.renderer.xr.getSession()?.end(); } catch {}
    try { this.renderer.dispose(); } catch {}
    try { this.renderer.domElement.remove(); } catch {}
  }
}

// ---------------------------------------------------------------------------
// Device detection
// ---------------------------------------------------------------------------
function detectARMode() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) return 'marker';
  if (navigator.xr) return 'webxr';
  return 'marker'; // fallback
}

// ---------------------------------------------------------------------------
// Boot sequence — the single entry point
// ---------------------------------------------------------------------------
export default async function showViewerV2(container) {
  const ui = createUI(container);
  let engine = null;

  try {
    // 1. Get project source URL
    setProgress(ui, 10, 'プロジェクトURLを確認中...');
    const projectSrc = getProjectSrc();
    if (!projectSrc) {
      showError(ui, 'プロジェクトが見つかりません', 'URLパラメータ ?src= が指定されていません。\nQRコードを再度読み取ってください。');
      return () => {};
    }
    S.projectSrc = projectSrc;

    // 2. Fetch project.json
    setProgress(ui, 30, 'プロジェクトを読み込み中...');
    const res = await fetch(projectSrc, { cache: 'no-store' });
    if (!res.ok) {
      showError(ui, 'プロジェクトの読み込みに失敗しました', `${res.status} ${res.statusText}\nURL: ${projectSrc}`);
      return () => {};
    }
    const raw = await res.json();

    // 3. Normalize
    setProgress(ui, 50, 'アセットを準備中...');
    const project = normalizeProject(raw, projectSrc);
    S.project = project;
    console.log('[v2] project:', project.id, project.type, project.models.length, 'models');

    // 4. Detect AR mode
    const arMode = detectARMode();
    const effectiveMode = (project.type === 'marker' || arMode === 'marker') ? 'marker' : 'webxr';
    S.arMode = effectiveMode;
    setProgress(ui, 70, effectiveMode === 'marker' ? 'マーカーARを準備中...' : 'WebXR ARを準備中...');
    console.log('[v2] mode:', effectiveMode);

    // 5. Show guide screen
    setProgress(ui, 100, '準備完了');
    await new Promise(r => setTimeout(r, 400));

    if (effectiveMode === 'marker' && project.markerImage) {
      ui.guideImg.src = project.markerImage;
      ui.guideImg.hidden = false;
      ui.guideMsg.textContent = project.guide?.message || 'このマーカーをカメラに写してください';
    } else if (effectiveMode === 'webxr') {
      ui.guideMsg.textContent = '平らな面を見つけて画面をタップしてください';
    }
    showScreen(ui, 'guide');

    // 6. Wait for user tap
    await new Promise(resolve => {
      ui.guideBtn.addEventListener('click', resolve, { once: true });
    });

    // 7. Start AR
    showScreen(ui, 'ar');

    if (effectiveMode === 'marker') {
      engine = new MarkerEngine(ui.arHost);
    } else {
      engine = new WebXREngine(ui.arHost);
    }
    S.engine = engine;
    await engine.init(project);
    S.phase = 'ar';
    console.log('[v2] AR started');

  } catch (err) {
    console.error('[v2] boot error:', err);
    showError(ui, err.message || 'ARの起動に失敗しました', err.stack);
  }

  // Cleanup function returned to the router
  return function cleanup() {
    S.disposed = true;
    if (engine) engine.dispose();
    ui.root.remove();
    console.log('[v2] disposed');
  };
}
