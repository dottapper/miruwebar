// src/views/ar-viewer.js
// 統合ARビューア - QRコードからプロジェクトデータを読み込んでAR表示
import { showViewerLoadingScreen, unifiedLoading } from '../utils/unified-loading-screen.js';
// Takeover: viewer内で必ず読み込む（関数非依存で Start→Loading→Guide を直列制御）
import '../dev/takeover-viewer-standalone.js';
import { createLogger } from '../utils/logger.js';
import { TEMPLATES_STORAGE_KEY } from '../components/loading-screen/template-manager.js';
import { generateMarkerPatternFromImage, createPatternBlob } from '../utils/marker-utils.js';
import { AREngineAdapter } from '../utils/ar-engine-adapter.js';
import { checkXRSupport, getRecommendedFallback } from '../utils/webxr-support.js';
import { createARStateMachine, ARState } from '../utils/ar-state-machine.js';
import { createLoadingStateManager, LoadingState } from '../utils/loading-state-manager.js';
import { getParam, debugURL, getProjectSrc } from '../utils/url-params.js';
import { applyProjectDesign } from '../utils/apply-project-design.js';
import { DEV_FORCE_SCREENS, DEV_STRICT_MODE, DEV_VERBOSE_LOGS, DEV_TAKEOVER_UI } from '../config/feature-flags.js';
import { fetchOnce, reportFetchStats } from '../utils/monitored-fetch.js';
import { extractDesign } from '../utils/design-extractor.js';

// ============================================================
// 🔍 診断パネル（deepDiag）- PCで変化なし問題の原因特定
// ============================================================
(function deepDiag(){
  const box = document.createElement('pre');
  box.style.cssText = 'position:fixed;top:8px;left:8px;right:8px;z-index:99998;max-height:50vh;overflow:auto;background:rgba(0,0,0,.95);color:#0ff;padding:12px;font:13px/1.6 monospace;border:2px solid #0ff;border-radius:8px;box-shadow:0 4px 12px rgba(0,255,255,0.3)';
  box.textContent = '[🔍 診断パネル] 初期化中...\n\n';
  document.addEventListener('DOMContentLoaded', ()=>document.body.appendChild(box));
  const log=(...a)=>{
    console.log('[diag]',...a);
    const msg = a.map(v=>typeof v==='string'?v:JSON.stringify(v,null,2)).join(' ')+'\n';
    box.textContent += msg;
    box.scrollTop = box.scrollHeight; // 自動スクロール
  };

  try {
    const href = window.location.href;
    const search = new URL(href).search;
    const hash = window.location.hash;
    log('href=',href);
    log('search=',search || '(empty)');
    log('hash=',hash || '(empty)');

    function getParam(name){
      const u = new URL(window.location.href);
      const v1 = u.searchParams.get(name);
      if (v1) return v1;
      const h = window.location.hash||'';
      const qi = h.indexOf('?');
      if (qi>=0) {
        const qs = new URLSearchParams(h.slice(qi+1));
        const v2 = qs.get(name);
        if (v2) return v2;
      }
      return null;
    }
    const raw = getParam('src');
    log('param.src(raw)=', String(raw));

    let srcUrl = null;
    if (raw) {
      try { srcUrl = new URL(raw, window.location.origin).toString(); }
      catch(e) { log('!! new URL failed:', String(e)); }
    }
    log('param.src(normalized)=', String(srcUrl));

    if (srcUrl) {
      const so = (new URL(srcUrl)).origin === window.location.origin;
      log('sameOrigin=', String(so), 'origin=', (new URL(srcUrl)).origin, 'self=', window.location.origin);
    } else {
      log('!! srcUrl が空。URL生成/ハッシュ位置を再確認');
    }

    async function probe(u){
      if (!u) return;
      try {
        const h = await fetchOnce(u, {method:'HEAD', cache:'no-store'});
        log('HEAD status=', h.status, h.statusText);
      } catch(e) { log('!! HEAD error=', String(e)); }
      try {
        const r = await fetchOnce(u, {cache:'no-store'});
        log('GET status=', r.status, r.statusText, 'content-type=', r.headers.get('content-type'));
        const txt = await r.text();
        log('body(first 300)=\n' + txt.slice(0,300));
        try {
          const json = JSON.parse(txt);
          log('json.keys=', Object.keys(json).slice(0,20));
          const required = ['version','screens','theme','start'];
          const missing = required.filter(k=> !(k in json));
          if (missing.length) log('!! schema missing=', missing);
          else log('schema OK (required fields present)');
        } catch(e) { log('!! JSON parse error=', String(e)); }
      } catch(e) { log('!! GET error=', String(e)); }
    }
    // 診断プローブは常に実行（デバッグのため）
    log('🔍 プロジェクト読み込み開始...');
    if (srcUrl) {
      probe(srcUrl);
    }

    // bootFromQR完了を監視
    window.addEventListener('bootFromQRCompleted', (e) => {
      log('✅ bootFromQR完了:', e.detail);
    });

    // 初期化の進行状況を監視
    setInterval(() => {
      const status = {
        '__bootFromQR_completed': !!window.__bootFromQR_completed,
        '__project': !!window.__project,
        '__viewer_booted': !!window.__viewer_booted
      };
      if (Object.values(status).some(v => v)) {
        log('📊 初期化状態:', status);
      }
    }, 2000);

  } catch(e) {
    log('❌ 診断エラー:', String(e));
    console.error(e);
  }
})();
// ============================================================

// DEBUG ログ制御
const IS_DEBUG = (typeof window !== 'undefined' && !!window.DEBUG);
const dlog = (...args) => { if (IS_DEBUG) console.log(...args); };

const arViewerLogger = createLogger('ARViewer');
let __booted = false;

function navigateBackOrHome() {
  try {
    if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
      history.back();
      return;
    }
  } catch (_) {}
  window.location.hash = '#/projects';
}

// ★ 旧関数は削除し、getProjectSrc() を直接使用 ★
// function getProjectSrcFromHash() は url-params.js の getProjectSrc() に統合

// ★ スタートUI乗っ取り版（デザインを"本当に"表示させる）
function __takeoverStartUI(project){
  const p = project || window.__project || {};
  const start = p.start || {};
  const guideSrc = p?.guide?.marker?.src || '';

  // 既存があれば消す
  document.getElementById('__dev_applied_proof__')?.remove();
  document.getElementById('__takeover_start__')?.remove();

  // ルート
  const root = document.createElement('div');
  root.id = '__takeover_start__';
  root.style.cssText = [
    'position:fixed','inset:0','z-index:999998',
    'display:flex','justify-content:center','align-items:center',
    'flex-direction:column','pointer-events:auto',
    'font-family:system-ui, sans-serif'
  ].join(';');

  // 背景
  if (start.backgroundImage) {
    root.style.backgroundImage = `url(${start.backgroundImage})`;
    root.style.backgroundSize = 'cover';
    root.style.backgroundPosition = 'center';
  }
  if (start.backgroundColor) root.style.backgroundColor = start.backgroundColor;

  // タイトル
  const title = document.createElement('h1');
  title.textContent = start.title || 'AR体験を開始';
  title.style.cssText = [
    `color:${start.textColor || '#fff'}`,
    `font-size:${(start.titleSize ? 32*start.titleSize : 32)}px`,
    'font-weight:700','margin:0','text-shadow:0 2px 6px rgba(0,0,0,.4)'
  ].join(';');

  // 位置（%をvhで近似）
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:absolute;left:0;right:0;text-align:center;transform:translateY(-50%)';
  wrap.style.top = (typeof start.titlePosition === 'number' ? `${start.titlePosition}vh` : '40vh');
  wrap.appendChild(title);

  // 開始ボタン
  const btn = document.createElement('button');
  btn.textContent = '開始';
  btn.style.cssText = [
    'margin-top:24px','padding:12px 24px','border-radius:12px',
    'border:none','cursor:pointer','box-shadow:0 8px 24px rgba(0,0,0,.25)',
    'background:#6c63ff','color:#fff','font-size:16px','font-weight:600'
  ].join(';');
  btn.onclick = async (e)=>{
    e.stopPropagation();
    btn.disabled = true;

    // ローディング表示（プロジェクト値を反映）
    __showLoadingUI(p);

    // 既存の開始ハンドラがあれば呼ぶ
    try {
      if (typeof window.onStartClick === 'function') {
        await window.onStartClick();
      }
    } catch(_) {}

    // ガイドに切替（プロジェクト値を反映）
    __showGuideUI(p);

    // スタートUIを消す
    root.remove();
  };

  wrap.appendChild(btn);
  root.appendChild(wrap);

  // 右上の小タグ
  const tag = document.createElement('div');
  tag.textContent = '[TAKEOVER] start';
  tag.style.cssText = 'position:absolute;top:8px;right:8px;background:rgba(0,0,0,.6);color:#0f0;padding:6px 8px;border-radius:6px;font:12px/1 monospace';
  root.appendChild(tag);

  document.body.appendChild(root);
  console.info('[TAKEOVER] start UI mounted', {start, guideSrc});
}

function __showLoadingUI(project){
  const l = project?.loading || {};
  // 既存を消す
  document.getElementById('__takeover_loading__')?.remove();

  const box = document.createElement('div');
  box.id = '__takeover_loading__';
  box.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;justify-content:center;align-items:center;background:rgba(0,0,0,.55);backdrop-filter:blur(2px)';
  if (l.backgroundColor) box.style.background = l.backgroundColor;

  if (l.image){
    const img = document.createElement('img');
    img.src = l.image;
    img.alt = 'loading';
    img.style.cssText = 'width:120px;height:auto;filter:drop-shadow(0 6px 18px rgba(0,0,0,.35))';
    box.appendChild(img);
  }
  const msg = document.createElement('div');
  msg.textContent = l.message || '読み込み中…';
  msg.style.cssText = 'margin-top:12px;color:#fff;font-weight:600';
  box.appendChild(msg);

  document.body.appendChild(box);
  // 少なくとも一瞬は見えるようタイムアウト解除は別で
  setTimeout(()=>box.remove(), 800);
}

function __showGuideUI(project){
  const g = project?.guide || {};
  document.getElementById('__takeover_guide__')?.remove();

  const box = document.createElement('div');
  box.id = '__takeover_guide__';
  box.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;padding:12px;border-radius:12px;background:rgba(0,0,0,.6);color:#fff;display:flex;gap:12px;align-items:center';

  if (g?.marker?.src){
    const img = document.createElement('img');
    img.src = g.marker.src;
    img.alt = 'marker';
    img.style.cssText = 'width:72px;height:auto;border-radius:8px';
    box.appendChild(img);
  }
  const msg = document.createElement('div');
  msg.textContent = g.message || 'マーカーをカメラに写してください';
  msg.style.cssText = 'font-weight:600';
  box.appendChild(msg);

  document.body.appendChild(box);
}

// Expose minimal UI hooks for the takeover injector
try {
  if (typeof window !== 'undefined') {
    if (typeof window.__showLoadingUI !== 'function') window.__showLoadingUI = __showLoadingUI;
    if (typeof window.__showGuideUI !== 'function') window.__showGuideUI = __showGuideUI;
  }
} catch {}

async function loadProjectFromQR() {
  const projectSrc = getProjectSrc();
  if (!projectSrc) {
    console.error('[FLOW] no project src');
    if (DEV_STRICT_MODE) {
      throw new Error('STRICT MODE: No project src from URL. Built-in sample loading is disabled.');
    }
    return null;
  }

  // キャッシュチェック
  if (typeof window !== 'undefined' && window.__project && window.__projectSrc === projectSrc) {
    console.info('[FLOW] Using cached project');
    return window.__project;
  }

  try {
    console.info('[FLOW] Fetching project from:', projectSrc);
    const response = await fetchOnce(projectSrc, { cache: 'no-store' });

    if (!response.ok) {
      console.error('[FLOW] project fetch failed', { status: response.status, statusText: response.statusText });
      if (DEV_STRICT_MODE) {
        throw new Error(`STRICT MODE: Project fetch failed (${response.status}). No fallback allowed.`);
      }
      return null;
    }

    // Content-Typeを確認してHTMLレスポンスを検出
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      const text = await response.text();
      console.error('[FLOW] HTMLレスポンスが返されました:', {
        url: projectSrc,
        contentType,
        preview: text.substring(0, 200)
      });
      if (DEV_STRICT_MODE) {
        throw new Error(`STRICT MODE: HTML response received instead of JSON. URL may be incorrect: ${projectSrc}`);
      }
      return null;
    }

    const project = await response.json();

    if (!project || typeof project !== 'object') {
      console.error('[FLOW] Invalid project.json (not an object)');
      if (DEV_STRICT_MODE) {
        throw new Error('STRICT MODE: Invalid project.json. No fallback allowed.');
      }
      return null;
    }

    project.__sourceUrl = project.__sourceUrl || projectSrc || (typeof location !== 'undefined' ? location.href : '');

    if (typeof window !== 'undefined') {
      window.__project = project;
      window.__projectSrc = projectSrc;
    }

    // 初期セットアップでガイドモードを矯正
    forceGuideModeIfMarker(project);

    console.info('[FLOW] Project loaded successfully');
    return project;
  } catch (error) {
    console.error('[FLOW] project fetch error', error);
    if (DEV_STRICT_MODE) {
      throw error;
    }
    return null;
  }
}

async function bootFromQR() {
  // ★ 再入禁止ガード
  if (typeof window !== 'undefined' && window.__viewer_booted) {
    console.warn('[BOOT] ⚠️ Duplicate boot attempt blocked');
    return;
  }
  if (typeof window !== 'undefined') {
    window.__viewer_booted = true;
  }

  if (__booted) return;
  __booted = true;

  // ★ projectSrcの存在チェック（早期リターン）
  const projectSrc = getProjectSrc();
  if (!projectSrc) {
    console.info('[BOOT] projectSrc not found, skipping bootFromQR');
    return;
  }

  try {
    const project = await loadProjectFromQR();
    if (!project) {
      console.error('[FLOW] no project');
      if (DEV_STRICT_MODE) {
        throw new Error('STRICT MODE: Failed to load project. No fallback allowed.');
      }
      return;
    }

    if (typeof location !== 'undefined') {
      project.__sourceUrl = project.__sourceUrl || location.href;
    }

    if (typeof window !== 'undefined') {
      window.__project = project;
      window.__projectSrc = getProjectSrc();
    }

    console.info('[FLOW] project loaded', project);

    // ★ プロジェクトデザインを確実に適用
    await applyProjectDesign(project);
    console.info('[APPLY] Design applied on boot');

    // ★ スタートUI乗っ取り（統合UI）はデフォルト無効化
    try {
      if (DEV_TAKEOVER_UI === true) {
        const here = new URLSearchParams(location.search||'');
        let topHas = false; try { topHas = (window.top && window.top!==window) ? new URLSearchParams(window.top.location.search||'').has('__takeoverStartUI') : false; } catch {}
        const active = here.has('__takeoverStartUI') || topHas;
        if (!active && typeof __takeoverStartUI === 'function') {
          __takeoverStartUI(project);
        }
      } else {
        console.info('[FLOW] takeover UI disabled by flag');
      }
    } catch (e) {
      console.warn('[FLOW] takeover UI call skipped', e);
    }

    // ★ bootFromQR 完了後に initIntegratedARViewer を実行
    if (typeof window !== 'undefined') {
      window.__bootFromQR_completed = true;
      // カスタムイベントを発火して initIntegratedARViewer に通知
      window.dispatchEvent(new CustomEvent('bootFromQRCompleted', { detail: { project } }));
    }

    // ★ fetch統計を出力
    if (DEV_VERBOSE_LOGS) {
      setTimeout(reportFetchStats, 1000);
    }
  } catch (error) {
    console.error('[FLOW] project boot error', error);
    if (DEV_STRICT_MODE) {
      throw error;
    }
  }
}

function onReady(cb) {
  if (typeof document === 'undefined') return;
  if (document.readyState !== 'loading') {
    cb();
  } else {
    document.addEventListener('DOMContentLoaded', cb);
  }
}

onReady(bootFromQR);

// === 1) 初期セットアップで guide を marker に矯正 ===
function forceGuideModeIfMarker(project) {
  const t = project?.type || project?.mode;
  if (t === 'marker') {
    try {
      if (typeof setGuideMode === 'function') setGuideMode('marker');
      if (!project.guide) project.guide = {};
      project.guide.mode = 'marker';
      console.info('[FLOW] guideMode forced at setup -> marker');
    } catch (e) {
      console.warn('[FLOW] guideMode force at setup skipped', e);
    }
  }
}


function bindStartButtonOnce() {
  console.log('[FLOW] bindStartButtonOnce called');
  console.log('[FLOW] document ready state:', document.readyState);
  console.log('[FLOW] document body:', document.body);
  
  const btn =
    document.querySelector('[data-role="start-button"]') ||
    document.querySelector('#ar-start-cta') ||
    document.querySelector('#startButton') ||
    document.querySelector('button.start') ||
    document.querySelector('button');

  if (!btn) { 
    console.error('[FLOW] start button not found'); 
    console.log('Available buttons:', document.querySelectorAll('button'));
    console.log('Available elements with data-role:', document.querySelectorAll('[data-role]'));
    console.log('Available elements with id containing start:', document.querySelectorAll('[id*="start"]'));
    return; 
  }
  if (btn.__bound) {
    console.log('[FLOW] button already bound');
    return;
  }
  btn.__bound = true;
  btn.addEventListener('click', onStartClick, { once: true });
  console.log('[FLOW] start button bound successfully:', btn);
}

// === 2) marker画像URLの deep search ===
function deepFindMarkerImageUrl(obj, maxDepth = 5) {
  const urls = [];
  const seen = new WeakSet();
  const isObj = (v) => v && typeof v === 'object';

  function scan(node, depth, trail) {
    if (!isObj(node) || depth > maxDepth || seen.has(node)) return;
    seen.add(node);

    // 代表的な場所
    if (typeof node.markerImageUrl === 'string') urls.push({ url: node.markerImageUrl, trail: [...trail, 'markerImageUrl'] });
    if (isObj(node.marker) && typeof node.marker.imageUrl === 'string') urls.push({ url: node.marker.imageUrl, trail: [...trail, 'marker.imageUrl'] });
    if (isObj(node.marker) && typeof node.marker.url === 'string') urls.push({ url: node.marker.url, trail: [...trail, 'marker.url'] });
    if (isObj(node.markerImage) && typeof node.markerImage.url === 'string') urls.push({ url: node.markerImage.url, trail: [...trail, 'markerImage.url'] });
    if (isObj(node.markerGuide) && typeof node.markerGuide.imageUrl === 'string') urls.push({ url: node.markerGuide.imageUrl, trail: [...trail, 'markerGuide.imageUrl'] });
    if (isObj(node.markerSettings) && typeof node.markerSettings.imageUrl === 'string') urls.push({ url: node.markerSettings.imageUrl, trail: [...trail, 'markerSettings.imageUrl'] });

    // assets配列/辞書
    if (Array.isArray(node.assets)) {
      node.assets.forEach((a,i) => {
        if (a?.type === 'marker' && typeof a.url === 'string') urls.push({ url: a.url, trail: [...trail, `assets[${i}].url`] });
        if (a?.key?.toLowerCase?.() === 'marker' && typeof a.url === 'string') urls.push({ url: a.url, trail: [...trail, `assets[${i}].url`] });
      });
    }
    if (isObj(node.assets)) {
      const cand = node.assets.marker || node.assets.markerImage;
      if (typeof cand === 'string') urls.push({ url: cand, trail: [...trail, 'assets.marker'] });
      if (isObj(cand) && typeof cand.url === 'string') urls.push({ url: cand.url, trail: [...trail, 'assets.marker.url'] });
    }

    // 汎用：キー名から推測
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (typeof v === 'string') {
        const lk = k.toLowerCase();
        if (lk.includes('marker') && (lk.includes('image') || lk.includes('url'))) {
          urls.push({ url: v, trail: [...trail, k] });
        }
      }
    }

    // 再帰
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (isObj(v)) scan(v, depth+1, [...trail, k]);
    }
  }

  scan(obj, 0, []);
  // 重複除去＆画像拡張子優先
  const seenUrl = new Set();
  return urls
    .filter(({url}) => { if (seenUrl.has(url)) return false; seenUrl.add(url); return true; })
    .sort((a,b) => {
      const s = (x) => /\.(png|jpg|jpeg|gif|webp)$/i.test(x) ? 0 : 1;
      return s(a.url) - s(b.url);
    });
}

function absolutizeUrl(u, base) { try { return new URL(u, base).href; } catch { return null; } }

async function verifyReachable(url) {
  try {
    console.log('[AR] verifying URL:', url);
    const res = await fetchOnce(url, { method: 'GET', mode: 'cors' });
    if (!res.ok) {
      console.warn(`[AR] URL not reachable: ${res.status} ${res.statusText}`);
      return false;
    }
    const ct = res.headers.get('content-type') || '';
    const isImage = ct.includes('image') || /\.(png|jpg|jpeg|gif|webp)$/i.test(url);
    console.log(`[AR] content-type: ${ct}, isImage: ${isImage}`);
    return isImage;
  } catch (error) {
    console.warn('[AR] URL verification failed:', error);
    return false;
  }
}

// 任意のフォールバック（リポジトリに置いてある画像に合わせて）
const DEFAULT_MARKER_PATH = '/assets/sample.png';

// === 3) normalizeProject（差し替え） ===
async function normalizeProject(project, baseHref) {
  const base = new URL('.', baseHref || project.__sourceUrl || location.href);
  const abs = (u) => absolutizeUrl(u, base);

  // プロジェクトデータ全体で古いマーカーパスを置き換え
  const replaceOldMarkerPaths = (obj) => {
    if (typeof obj === 'string') {
      if (obj.includes('/assets/marker/default-marker.png') || obj.includes('default-marker.png')) {
        return DEFAULT_MARKER_PATH;
      }
    } else if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          obj[key] = replaceOldMarkerPaths(obj[key]);
        }
      }
    }
    return obj;
  };
  
  replaceOldMarkerPaths(project);

  // ★ type/mode自動推定（未設定時）
  if (!project.type && !project.mode) {
    console.warn('[FLOW] type/mode未設定、自動推定を試行');
    
    // マーカー画像の有無をチェック
    const markerCandidates = deepFindMarkerImageUrl(project);
    const hasMarkerImage = markerCandidates.length > 0 && markerCandidates[0]?.url;
    const hasMarkerPattern = !!(project.markerPattern || project.marker?.pattern);
    
    if (hasMarkerImage || hasMarkerPattern) {
      project.type = 'marker';
      console.info('[FLOW] type自動推定: marker（マーカー画像/パターンが存在）');
    } else {
      // デフォルト: markerless（WebXR）
      project.type = 'markerless';
      console.info('[FLOW] type自動推定: markerless（デフォルト）');
    }
  }

  // models の絶対化と検証
  project.models = (project.models || []).map((m, index) => {
    const absoluteUrl = abs(m.url);
    console.log(`🔍 モデル ${index + 1} URL検証:`, {
      original: m.url,
      absolute: absoluteUrl,
      valid: !!absoluteUrl
    });
    
    if (!absoluteUrl) {
      console.warn(`⚠️ モデル ${index + 1} のURLが無効です:`, m.url);
    }
    
    return { ...m, url: absoluteUrl };
  });

  // marker 探索
  const candidates = deepFindMarkerImageUrl(project);
  console.info('[FLOW] marker candidates', candidates);
  let picked = candidates[0]?.url || null;
  
  // 古いパスを新しいパスに置き換え
  if (picked && (picked.includes('/assets/marker/default-marker.png') || picked.includes('default-marker.png'))) {
    console.warn('[FLOW] 古いマーカーパスを検出、新しいパスに置き換え:', picked, '->', DEFAULT_MARKER_PATH);
    picked = DEFAULT_MARKER_PATH;
  }
  
  if (picked) picked = abs(picked);

  // typeがmarkerなら必須。見つからなければフォールバックを適用
  const t = project.type || project.mode;
  if (t === 'marker') {
    if (!picked) {
      const fb = abs(DEFAULT_MARKER_PATH);
      console.warn('[FLOW] markerImageUrl not found. fallback ->', fb);
      picked = fb;
    }
    
    // 到達性チェック（フォールバック画像も含めて）
    const ok = await verifyReachable(picked);
    if (!ok) {
      console.warn('[FLOW] primary marker not reachable, trying fallback');
      const fallback = abs(DEFAULT_MARKER_PATH);
      const fallbackOk = await verifyReachable(fallback);
      if (fallbackOk) {
        console.log('[FLOW] using fallback marker');
        picked = fallback;
      } else {
        throw new Error('marker image not reachable (CORS/404): ' + picked + ' (fallback also failed)');
      }
    }
  }

  project.markerImageUrl = picked || null;
  return project;
}

// ===== 1) pattern 生成 → 登録 =====
async function prepareMarkerPipeline(project) {
  console.time('[AR] pattern');

  try {
    // 画像取得
    console.log('[AR] fetching marker image:', project.markerImageUrl);
    const res = await fetchOnce(project.markerImageUrl, { mode: 'cors' });
    if (!res.ok) {
      throw new Error(`marker image fetch failed: ${res.status} ${res.statusText} - ${project.markerImageUrl}`);
    }
    
    const imgBlob = await res.blob();
    console.log('[AR] image blob size:', imgBlob.size, 'type:', imgBlob.type);

    // 画像形式の検証
    if (!imgBlob.type.startsWith('image/')) {
      console.warn(`[AR] unexpected content type: ${imgBlob.type}, trying fallback`);
      
      // HTMLページが返された場合（404エラーなど）はフォールバック画像を使用
      if (imgBlob.type === 'text/html') {
        console.log('[AR] HTML response detected, trying fallback markers');
        
        // 複数のフォールバック画像を試す
        const fallbackPaths = [
          DEFAULT_MARKER_PATH,
          '/assets/logo.png',
          '/assets/main-low.jpg'
        ];
        
        for (const fallbackPath of fallbackPaths) {
          try {
            const fallbackUrl = absolutizeUrl(fallbackPath, new URL('.', project.__sourceUrl || location.href));
            console.log('[AR] trying fallback:', fallbackUrl);
            
            const fallbackRes = await fetchOnce(fallbackUrl, { mode: 'cors' });
            if (fallbackRes.ok) {
              const fallbackBlob = await fallbackRes.blob();
              if (fallbackBlob.type.startsWith('image/')) {
                console.log('[AR] using fallback marker image:', fallbackPath);
                // フォールバック画像で処理を継続
                const img = await createImageBitmap(fallbackBlob, {
                  imageOrientation: 'none',
                  premultiplyAlpha: 'none'
                });
                await markerController.addImageMarker(img);
                console.timeEnd('[AR] pattern');
                console.info('[AR] marker registered (fallback)');
                return;
              }
            }
          } catch (fallbackError) {
            console.warn('[AR] fallback image failed:', fallbackPath, fallbackError);
          }
        }
        
        throw new Error('すべてのフォールバック画像の読み込みに失敗しました');
      }
      
      throw new Error(`invalid image type: ${imgBlob.type}. Expected image/* but got ${imgBlob.type}. URL may be incorrect or return an error page.`);
    }

    // 可能なら .patt へ（存在しない場合は imageBitmap で代替）
    let pattBlob = null;
    if (typeof imageUrlToPatternBlob === 'function') {
      try {
        pattBlob = await imageUrlToPatternBlob(project.markerImageUrl);
        console.info('[AR] patt blob size', pattBlob?.size);
      } catch (e) {
        console.warn('[AR] pattern encoder missing/fail, fallback to imageBitmap', e);
      }
    }

    // 登録：addPattern(pattBlob) or addImageMarker(imageBitmap) のどちらかに対応
    if (pattBlob && typeof markerController?.addPattern === 'function') {
      await markerController.addPattern(pattBlob);
    } else if (typeof markerController?.addImageMarker === 'function') {
      try {
        // より安全な画像デコード
        const img = await createImageBitmap(imgBlob, {
          imageOrientation: 'none',
          premultiplyAlpha: 'none'
        });
        await markerController.addImageMarker(img);
        console.log('[AR] image marker created successfully');
      } catch (decodeError) {
        console.error('[AR] image decode failed:', decodeError);
        // フォールバック: 画像URLを直接保存
        await markerController.addImageMarker(project.markerImageUrl);
        console.log('[AR] fallback: using image URL directly');
      }
    } else if (typeof markerController?.addPattern === 'function') {
      // ライブラリが .patt しか受けないのに encoder が無い場合は明示的に失敗
      throw new Error('pattern encoder not wired: addPattern requires .patt');
    } else {
      console.warn('[AR] markerController has no addPattern/addImageMarker');
      // 最低限の登録（URLのみ）
      if (typeof markerController?.addImageMarker === 'function') {
        await markerController.addImageMarker(project.markerImageUrl);
      }
    }

    console.timeEnd('[AR] pattern');
    console.info('[AR] marker registered');
    
  } catch (error) {
    console.timeEnd('[AR] pattern');
    console.error('[AR] prepareMarkerPipeline failed:', error);
    
    // より詳細なエラー情報を提供
    if (error.name === 'InvalidStateError') {
      throw new Error(`画像のデコードに失敗しました。画像形式を確認してください: ${project.markerImageUrl}`);
    } else if (error.message.includes('fetch failed')) {
      throw new Error(`画像の取得に失敗しました。URLとCORS設定を確認してください: ${project.markerImageUrl}`);
    } else {
      throw error;
    }
  }
}

// ===== 2) ローディング → ガイドへ（状態機械経路では不要） =====
async function loadingToMarkerGuide() {
  const project = window.__project;
  if (!project) return;
  if ((project.type || project.mode) !== 'marker') return;

  try {
    await prepareMarkerPipeline(project);
  } catch (e) {
    console.error('[AR] prepareMarkerPipeline failed', e);
    alert('マーカーの準備に失敗しました（patternエンコーダ or 画像URL/CORS を確認）');
    return;
  }

  // UI遷移
  try {
    if (typeof setGuideMode === 'function') setGuideMode('marker');
    showMarkerGuideScreen && showMarkerGuideScreen();
  } catch {}
  console.info('[FLOW] marker guide shown');
}

// マーカーガイド画面を表示（状態機械経路では不要）
function showMarkerGuideScreen() {
  console.log('[FLOW] showing marker guide screen');
  // 既存のガイド画面表示ロジックを使用
  if (typeof showScreen === 'function') {
    showScreen('guide');
  }
}

// === 4) onStartClick の先頭付近を差し替え ===
// ★ 再入禁止フラグ（グローバル）
let __onStartClickRunning = false;

async function onStartClick() {
  // ★ 再入禁止ガード
  if (__onStartClickRunning) {
    console.warn('[FLOW] onStartClick already running, ignoring duplicate call');
    return;
  }
  __onStartClickRunning = true;
  
  try {
    const project = window.__project;
    if (!project) {
      alert('プロジェクトが読み込まれていません');
      return;
    }
    
    // ★ type/mode自動推定済みであれば使用、未設定なら警告
    if (!project.type && !project.mode) {
      console.warn('[FLOW] type/mode未設定、normalizeProjectで自動推定されるはず');
    }

    // URL正規化＋marker特定（type自動推定含む）
    try {
      await normalizeProject(project, project.__sourceUrl || location.href);
      console.info('[FLOW] urls resolved', {
        type: project.type || project.mode,
        markerImageUrl: project.markerImageUrl,
        models: (project.models || []).map(m => m.url)
      });
    } catch (e) {
      console.error('[FLOW] normalize failed', e);
      alert('マーカー画像の特定/取得に失敗（URLやCORS設定を確認）');
      return;
    }

    // ここでも念のためガイドを marker に矯正
    forceGuideModeIfMarker(project);

    // ★ プロジェクトデザインをDOMに確実に反映
    if (typeof applyProjectDesign === 'function') {
      applyProjectDesign(project);
    }

    // カメラ許可→ローディング表示（既存ロジック）
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }});
      if (typeof attachStreamToVideo === 'function') attachStreamToVideo(stream);
    } catch (e) {
      console.error('[FLOW] camera error', e);
      alert('カメラ権限が必要です（HTTPSが必要な場合があります）');
      return;
    }

    if (typeof showLoadingScreen === 'function') showLoadingScreen(project.loadingScreen);
    console.info('[FLOW] loading ready');
  } finally {
    // ★ 処理完了後にフラグをリセット（次回呼び出しを許可）
    setTimeout(() => {
      __onStartClickRunning = false;
    }, 1000); // 1秒後にリセット（連打防止）
  }
  
  // マーカータイプの場合は追加処理を実行（新しい状態機械経路では不要）
  // if (project.type === 'marker') {
  //   setTimeout(loadingToMarkerGuide, 100); // ローディング画面表示後に実行
  // }
}


// onReady(bindStartButtonOnce); // HTML生成後に呼び出すため、ここでは呼び出さない

// ===== 3) 3D表示：GLB読み込み → アンカーに add → レンダー更新 =====
let __renderer, __scene, __camera, __anchor, __raf;
let __loader = null;

async function ensureRenderer() {
  if (!__renderer) {
    const THREE = await import('three');
    __renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas: document.querySelector('canvas') || undefined });
    __renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
async function ensureBasics() {
  if (!__scene) {
    const THREE = await import('three');
    __scene = new THREE.Scene();
  }
  if (!__camera) {
    const THREE = await import('three');
    __camera = new THREE.Camera();
  }
  if (!__anchor) { 
    const THREE = await import('three');
    __anchor = new THREE.Group(); 
    __scene.add(__anchor); 
  }
}
async function ensureLights() {
  if (__scene.__lit) return;
  const THREE = await import('three');
  __scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
  const d = new THREE.DirectionalLight(0xffffff, 0.8); d.position.set(1,1,1);
  __scene.add(d); __scene.__lit = true;
}
async function loadGLB(cfg) {
  if (!__loader) {
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    __loader = new GLTFLoader();
    __loader.setCrossOrigin('anonymous');
  }
  
  try {
    console.log('🔄 3Dモデル読み込み開始:', cfg.url);
    
    // まず実際のファイルを取得してHTMLかどうかをチェック
    const response = await fetchOnce(cfg.url, {
      method: 'GET',
      headers: {
        'Accept': 'model/gltf-binary,model/gltf+json,application/octet-stream,*/*'
      }
    });
    
    if (!response.ok) {
      throw new Error(`モデルファイルが見つかりません: ${response.status} ${response.statusText}`);
    }
    
    // レスポンスの内容をチェック
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    
    console.log('📄 レスポンス情報:', {
      contentType,
      contentLength,
      status: response.status
    });
    
    // HTMLレスポンスを検出
    if (contentType && contentType.includes('text/html')) {
      const text = await response.text();
      console.error('❌ HTMLレスポンスが返されました:', {
        url: cfg.url,
        contentType,
        preview: text.substring(0, 200)
      });
      throw new Error(`モデルファイルの代わりにHTMLページが返されました。URLが正しくない可能性があります: ${cfg.url}`);
    }
    
    // 小さなファイルサイズの場合はHTMLの可能性が高い
    if (contentLength && parseInt(contentLength) < 1000) {
      console.warn('⚠️ ファイルサイズが小さすぎます（HTMLの可能性）:', contentLength, 'bytes');
    }
    
    // GLTFLoaderで読み込み
    const gltf = await __loader.loadAsync(cfg.url);
    const obj = gltf.scene || gltf.scenes?.[0];
    
    if (!obj) {
      throw new Error('GLTFファイルにシーンが見つかりません');
    }
    
    const s = (cfg.scale || [1,1,1]).map(v => Math.min(Math.max(v,0.01),10));
    obj.scale.set(...s);
    obj.position.set(...(cfg.position || [0,0,0]));
    obj.rotation.set(...(cfg.rotation || [0,0,0]));
    obj.traverse(n => { if (n.isMesh) n.frustumCulled = false; });
    
    console.log('✅ 3Dモデル読み込み完了:', cfg.url);
    return obj;
  } catch (error) {
    console.error('❌ 3Dモデル読み込み失敗:', {
      url: cfg.url,
      error: error.message,
      type: error.constructor.name,
      stack: error.stack
    });
    
    // HTMLレスポンスが返された場合の詳細エラー
    if (error.message.includes('Unexpected token') || error.message.includes('<!doctype')) {
      throw new Error(`モデルファイルの形式が正しくありません。HTMLページが返されました。URLが正しくないか、ファイルが存在しません: ${cfg.url}`);
    }
    
    // ネットワークエラーの場合
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error(`ネットワークエラー: モデルファイルにアクセスできません: ${cfg.url}`);
    }
    
    throw error;
  }
}
async function addDebugCube() {
  const THREE = await import('three');
  const g = new THREE.BoxGeometry(0.1,0.1,0.1);
  const m = new THREE.MeshBasicMaterial({ wireframe:true });
  __anchor.add(new THREE.Mesh(g,m));
}
function startRenderLoop(tick) {
  cancelAnimationFrame(__raf);
  const loop = () => {
    tick && tick();
    __renderer.render(__scene, __camera);
    __raf = requestAnimationFrame(loop);
  };
  __raf = requestAnimationFrame(loop);
}

async function runMarkerShowtime(project) {
  await ensureRenderer(); 
  await ensureBasics(); 
  await ensureLights();

  console.time('[AR] models');
  
  // モデル読み込みを個別に処理し、失敗したモデルがあっても他のモデルは読み込む
  const modelPromises = (project.models || []).map(async (modelCfg, index) => {
    try {
      console.log(`🔄 モデル ${index + 1}/${project.models.length} 読み込み開始:`, modelCfg.url);
      const obj = await loadGLB(modelCfg);
      console.log(`✅ モデル ${index + 1} 読み込み完了`);
      return { success: true, obj, index };
    } catch (error) {
      console.error(`❌ モデル ${index + 1} 読み込み失敗:`, {
        url: modelCfg.url,
        error: error.message,
        index
      });
      return { success: false, error, index, url: modelCfg.url };
    }
  });
  
  const results = await Promise.all(modelPromises);
  const successfulModels = results.filter(r => r.success).map(r => r.obj);
  const failedModels = results.filter(r => !r.success);
  
  if (failedModels.length > 0) {
    console.warn(`⚠️ ${failedModels.length}個のモデル読み込みに失敗しました:`, failedModels.map(f => f.url));
    
    // 失敗したモデルの詳細情報を表示
    failedModels.forEach(failed => {
      console.error(`❌ 失敗したモデル ${failed.index + 1}:`, {
        url: failed.url,
        error: failed.error.message
      });
    });
  }
  
  if (successfulModels.length === 0) {
    console.warn('⚠️ すべてのモデル読み込みに失敗、デバッグキューブを追加');
    await addDebugCube();
  } else {
    successfulModels.forEach(o => __anchor.add(o));
  }
  
  console.timeEnd('[AR] models');
  console.info('[AR] models attached', {
    successful: successfulModels.length,
    failed: failedModels.length,
    total: project.models?.length || 0
  });

  // 毎フレーム、検出更新
  startRenderLoop(() => {
    if (typeof markerController?.update === 'function') markerController.update();
  });
}

// マーカーコントローラーの簡易実装
const markerController = {
  patterns: new Map(),
  
  async addPattern(patternBlob) {
    const patternId = `marker_${Date.now()}`;
    this.patterns.set(patternId, {
      type: 'pattern',
      data: patternBlob,
      timestamp: Date.now()
    });
    console.log(`[AR] pattern added: ${patternId}, size: ${patternBlob.size} bytes`);
    return patternId;
  },
  
  async addImageMarker(imageData) {
    const markerId = `image_${Date.now()}`;
    this.patterns.set(markerId, {
      type: typeof imageData === 'string' ? 'url' : 'bitmap',
      data: imageData,
      timestamp: Date.now()
    });
    
    if (typeof imageData === 'string') {
      console.log(`[AR] image marker (URL) added: ${markerId}, url: ${imageData}`);
    } else {
      console.log(`[AR] image marker (bitmap) added: ${markerId}, size: ${imageData.width}x${imageData.height}`);
    }
    return markerId;
  },
  
  update() {
    // マーカー検出の更新処理
    // 実際のARライブラリに応じて実装
    // 現在は何もしない（プレースホルダー）
  },
  
  getPattern(patternId) {
    const pattern = this.patterns.get(patternId);
    return pattern ? pattern.data : null;
  },
  
  getPatternInfo(patternId) {
    return this.patterns.get(patternId);
  },
  
  removePattern(patternId) {
    return this.patterns.delete(patternId);
  },
  
  // デバッグ用：登録済みパターン一覧
  listPatterns() {
    const list = [];
    for (const [id, info] of this.patterns) {
      list.push({ id, type: info.type, timestamp: info.timestamp });
    }
    return list;
  }
};

// ガイドの「開始」押下で 3D 表示開始
function bindGuideStartButton() {
  const guideStartButton = document.querySelector('[data-role="guide-start"]') || 
                          document.querySelector('#guideStartButton') || 
                          document.querySelector('button.guide-start');
  
  if (guideStartButton && !guideStartButton.__bound) {
    guideStartButton.__bound = true;
    guideStartButton.addEventListener('click', () => {
      // 実エンジン（AREngineAdapter）の状態機械経路を使用
      const startBtn = document.querySelector('#ar-start-btn');
      if (startBtn) startBtn.click();
    }, { once: true });
    console.log('[FLOW] guide start button bound');
  }
}

// ガイド画面表示後にボタンをバインド
setTimeout(bindGuideStartButton, 500);

export default function showARViewer(container) {
  dlog('🚀 統合ARビューア開始');

  // ★ URLパラメータから project.json のURLを取得（統一された取得ロジックを使用）
  const projectSrc = getProjectSrc();

  // 追加パラメータの取得（ハッシュ内パラメータもサポート）
  const hash = window.location.hash;
  const hashQuery = hash.includes('?') ? hash.split('?')[1] : '';
  const normalQuery = window.location.search.slice(1);
  const urlParams = new URLSearchParams(normalQuery || hashQuery);

  // エンジン強制切替: engine=marker|webxr|simple（simpleは将来拡張）
  const engineOverrideRaw = (urlParams.get('engine') || urlParams.get('type') || '').toLowerCase();
  const engineOverride = ['marker', 'webxr', 'simple'].includes(engineOverrideRaw) ? engineOverrideRaw : null;
  const enableLSFlag = (urlParams.get('ls') || '').toLowerCase() === 'on';
  // デバッグ用：cube=on で強制デバッグキューブを配置
  const forceDebugCube = ['on','1','true','yes'].includes((urlParams.get('cube')||'').toLowerCase());
  const forceNormalMaterial = ['normal','n','1','true','yes'].includes((urlParams.get('mat')||'').toLowerCase());

  console.info('[showARViewer] projectSrc:', projectSrc);
  console.info('[showARViewer] URL check:', {
    'window.location.href': window.location.href,
    'window.location.search': window.location.search,
    'window.location.hash': window.location.hash,
    'sessionStorage.project_src': sessionStorage.getItem('project_src')
  });

  if (!projectSrc) {
    const isHttps = window.location.protocol === 'https:';
    const currentUrl = window.location.href;
    const hasQuerySrc = new URL(currentUrl).searchParams.has('src');
    const hasHashSrc = window.location.hash.includes('?src=');
    
    container.innerHTML = `
      <div class="viewer-error">
        <div class="error-content">
          <h1>❌ プロジェクトが見つかりません</h1>
          <p style="margin-bottom: 1rem;">URLパラメータ 'src' が指定されていません。</p>
          
          <div style="background: rgba(255,235,59,0.1); border-left: 4px solid #FFC107; padding: 1rem; margin: 1rem 0; text-align: left;">
            <h3 style="margin: 0 0 0.5rem 0; font-size: 1rem;">📋 診断情報</h3>
            <ul style="margin: 0; padding-left: 1.5rem; font-size: 0.9rem; line-height: 1.6;">
              <li>プロトコル: ${isHttps ? '✅ HTTPS（推奨）' : '⚠️ HTTP（カメラ制限あり）'}</li>
              <li>通常クエリ(?src=): ${hasQuerySrc ? '✅ あり' : '❌ なし'}</li>
              <li>ハッシュクエリ(#/viewer?src=): ${hasHashSrc ? '✅ あり' : '❌ なし'}</li>
              <li>SessionStorage: ${sessionStorage.getItem('project_src') ? '✅ あり' : '❌ なし'}</li>
            </ul>
          </div>
          
          ${!isHttps ? `
          <div style="background: rgba(255,87,34,0.1); border-left: 4px solid #FF5722; padding: 1rem; margin: 1rem 0; text-align: left;">
            <h3 style="margin: 0 0 0.5rem 0; font-size: 1rem;">⚠️ HTTPS要件</h3>
            <p style="margin: 0; font-size: 0.9rem; line-height: 1.6;">
              スマホのカメラを使うにはHTTPSが必要です。<br>
              開発環境でHTTPSを有効化するか、Ngrok/Cloudflare Tunnelをご利用ください。
            </p>
          </div>
          ` : ''}
          
          <div style="background: rgba(33,150,243,0.1); border-left: 4px solid #2196F3; padding: 1rem; margin: 1rem 0; text-align: left;">
            <h3 style="margin: 0 0 0.5rem 0; font-size: 1rem;">✅ 正しいURL形式</h3>
            <code style="display: block; background: rgba(0,0,0,0.05); padding: 0.5rem; border-radius: 4px; font-size: 0.85rem; word-break: break-all; margin: 0.5rem 0;">
              https://your-host/?src=/projects/&lt;id&gt;/project.json#/viewer
            </code>
            <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: #666;">
              または（旧形式も対応）
            </p>
            <code style="display: block; background: rgba(0,0,0,0.05); padding: 0.5rem; border-radius: 4px; font-size: 0.85rem; word-break: break-all; margin: 0.5rem 0;">
              https://your-host/#/viewer?src=https://your-host/projects/&lt;id&gt;/project.json
            </code>
          </div>
          
          <div style="margin-top: 1.5rem;">
            <button id="viewer-back-button" class="btn-primary" style="margin-right: 0.5rem;">← プロジェクト一覧に戻る</button>
            <button id="viewer-reload-button" class="btn-secondary">🔄 ページ再読み込み</button>
          </div>
          
          <details style="margin-top: 1rem; text-align: left; font-size: 0.85rem;">
            <summary style="cursor: pointer; color: #666;">🔍 詳細デバッグ情報</summary>
            <pre style="background: #f5f5f5; padding: 0.5rem; border-radius: 4px; overflow-x: auto; margin-top: 0.5rem; font-size: 0.75rem;">${JSON.stringify({
              href: currentUrl,
              search: window.location.search,
              hash: window.location.hash,
              protocol: window.location.protocol,
              host: window.location.host
            }, null, 2)}</pre>
          </details>
        </div>
      </div>
    `;
    const backBtn = container.querySelector('#viewer-back-button');
    if (backBtn) backBtn.addEventListener('click', navigateBackOrHome);
    const reloadBtn = container.querySelector('#viewer-reload-button');
    if (reloadBtn) reloadBtn.addEventListener('click', () => window.location.reload());
    return function cleanup() {
      console.log('🧹 早期リターン: クリーンアップ不要');
    };
  }

  dlog('📡 プロジェクトURL:', projectSrc);

  // 統合ARビューアのHTML構造
  container.innerHTML = `
    <div id="webar-ui" class="integrated-ar-viewer">
      <!-- スタート画面（開始→ローディング→ガイドの順） -->
      <div id="ar-start-screen" class="ar-start-screen" data-screen="start" style="display: none;">
        <div class="start-content">
          <img id="ar-start-logo" alt="start logo" style="display:none;max-width:160px;max-height:80px;margin-bottom:12px;" />
          <h1 id="ar-start-title">AR体験を開始</h1>
          <button id="ar-start-cta" class="btn-primary" style="margin-top: 12px;" data-role="start-button">開始</button>
        </div>
      </div>
      <!-- ローディング画面 -->
      <div id="ar-loading-screen" class="ar-loading-screen" data-screen="loading" style="display: none;">
        <div class="ar-loading-content">
          <img id="ar-loading-logo" alt="brand logo" style="display:none;max-width:160px;max-height:80px;margin-bottom:12px;" />
          <div id="ar-loading-text-group" class="loading-text-group">
            <h2 id="ar-loading-title">ARプロジェクトを読み込み中...</h2>
            <p id="ar-loading-message">システムを初期化しています...</p>
          </div>
          <div class="ar-loading-progress">
            <div id="ar-loading-bar" class="ar-loading-bar"></div>
          </div>
        </div>
      </div>
      
      <!-- ガイド画面（マーカー検出/平面検出の説明） -->
      <div id="ar-guide-screen" class="ar-guide-screen" data-screen="guide" style="display: none;">
        <div class="guide-content">
          <img id="ar-guide-image" alt="guide image" style="display:none;max-width:240px;max-height:180px;margin-bottom:16px;" />
          <h2 id="ar-guide-title">画面をタップしてください</h2>
          <p id="ar-guide-description">平らな面を見つけて画面をタップしてください</p>
          <div id="ar-guide-marker" style="display:none;">
            <img id="ar-guide-marker-image" alt="marker" style="max-width:200px;max-height:150px;margin:16px 0;" />
          </div>
        </div>
      </div>
      
      <div id="ar-host" class="ar-host"></div>
      
      <!-- ARコントロール -->
      <div id="ar-controls" class="ar-controls">
        <div class="controls-content">
          <h3>📱 ARビューア</h3>
          <p id="ar-instruction">プロジェクトを読み込んでいます...</p>
          <button id="ar-start-btn" class="btn-primary" style="display: none;">🚀 AR開始</button>
          <button id="ar-detect-btn" class="btn-success" style="display: none;">🎯 マーカー検出</button>
          <button id="ar-back-btn" class="btn-secondary">← 戻る</button>
        </div>
      </div>
      
      <!-- ステータス表示 -->
      <div id="ar-status" class="ar-status">
        <div id="ar-status-text">初期化中...</div>
      </div>
      
      <!-- マーカーガイド -->
      <div id="ar-marker-guide" class="ar-marker-guide" style="display: none;"></div>
      <div id="marker-guide-tips" class="marker-guide-tips" style="display: none;">
        <strong>スキャンTips:</strong><br>
        • マーカーを枠内に収めてください<br>
        • 十分な明るさを確保してください<br>
        • ゆっくり動かさないように<br>
        • 距離を適度に保ってください
      </div>
    </div>
  `;

  // CSS スタイルを追加
  const style = document.createElement('style');
  style.textContent = `
    .integrated-ar-viewer {
      position: relative;
      width: 100vw;
      height: 100svh; /* iOS Safari対応: アドレスバー変動を考慮した安定した高さ */
      background: #000;
      color: #fff;
      font-family: Arial, sans-serif;
      overflow: hidden;
    }

    .ar-host {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      overflow: hidden;
      background: #000; /* カメラが表示されるまでのフォールバック */
    }
    
    /* カメラ映像のスタイルを確実に適用 */
    .ar-host video,
    .ar-host canvas {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      z-index: 0 !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      background: #000 !important;
    }

    .ar-start-screen {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      /* 背景はproject.jsonまたはテンプレ設定を適用 */
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1200;
    }
    /* Start content should not establish a new positioning context.
       This allows absolutely positioned children (logo/title/button)
       to be placed relative to the full-screen overlay container. */
    .start-content { text-align: center; padding: 2rem; position: static; }
    .start-content h1 { color: #fff; font-size: 1.6rem; margin: 0.5rem 0 0; }

    .ar-guide-screen {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1100;
    }
    .guide-content { 
      text-align: center; 
      padding: 2rem; 
      position: relative;
      max-width: 90%;
    }
    .guide-content h2 { 
      color: #fff; 
      font-size: 1.4rem; 
      margin: 0.5rem 0 1rem; 
    }
    .guide-content p { 
      color: #ccc; 
      font-size: 1rem; 
      margin: 0.5rem 0 1rem; 
      line-height: 1.4;
    }

    .ar-loading-screen {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #1a1a1a;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .ar-loading-content {
      text-align: center;
      padding: 2rem;
      position: relative;
    }
    
    .ar-loading-content h2 {
      color: #ffffff;
      margin-bottom: 1rem;
      font-size: 1.5rem;
    }

    .loading-text-group {
      position: absolute;
      top: 40svh; /* iOS Safari対応: 40% → 40svh でアドレスバー変動に対応 */
      left: 50%;
      transform: translate(-50%, -50%);
      width: calc(100% - 40px);
    }
    
    .ar-loading-progress {
      width: 300px;
      height: 4px;
      background: rgba(255,255,255,0.2);
      border-radius: 2px;
      overflow: hidden;
      margin: 1rem auto;
    }
    
    .ar-loading-bar {
      height: 100%;
      background: #6c5ce7;
      width: 0%;
      transition: width 0.3s ease;
    }
    
    .ar-controls {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.8);
      padding: 1rem;
      border-radius: 12px;
      text-align: center;
      z-index: 1100; /* ローディング画面(1000)より前面に表示 */
      max-width: 320px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    
    .ar-status {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(0,0,0,0.8);
      padding: 8px 12px;
      border-radius: 8px;
      z-index: 900;
      font-size: 12px;
      max-width: 300px;
      line-height: 1.3;
    }
    
    .ar-marker-guide {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 200px;
      height: 200px;
      border: 3px dashed #4CAF50;
      border-radius: 12px;
      z-index: 500;
      background: rgba(76, 175, 80, 0.1);
    }

    .ar-marker-guide::before {
      content: "📱 マーカーをここに";
      position: absolute;
      top: -35px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(76, 175, 80, 0.9);
      color: white;
      padding: 6px 12px;
      border-radius: 15px;
      font-size: 11px;
      white-space: nowrap;
    }

    .ar-marker-guide::after {
      content: "💡 十分な明るさを確保してください";
      position: absolute;
      bottom: -45px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 193, 7, 0.9);
      color: white;
      padding: 4px 8px;
      border-radius: 10px;
      font-size: 10px;
      white-space: nowrap;
    }

    .marker-guide-tips {
      position: absolute;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 15px;
      border-radius: 8px;
      font-size: 11px;
      text-align: center;
      z-index: 490;
      max-width: 280px;
      line-height: 1.4;
    }

    .marker-guide-tips strong {
      color: #4CAF50;
    }
    
    .btn-primary, .btn-success, .btn-secondary {
      padding: 10px 16px;
      border: none;
      border-radius: 6px;
      margin: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    
    .btn-primary { background: #007bff; color: white; }
    .btn-primary:hover { background: #0056b3; }
    
    .btn-success { background: #28a745; color: white; }
    .btn-success:hover { background: #1e7e34; }
    
    .btn-secondary { background: #6c757d; color: white; }
    .btn-secondary:hover { background: #545b62; }
    
    .success { color: #44ff44; }
    .error { color: #ff4444; }
    .warning { color: #ffaa44; }
    .info { color: #4488ff; }
  `;
  document.head.appendChild(style);

  // デバッグコンソール（スマホ用）: 本番では無効
  if (IS_DEBUG) {
    const debugConsole = document.createElement('div');
    debugConsole.id = 'debug-console';
    debugConsole.style.cssText = `
      position: fixed; top: 10px; left: 10px; right: 10px; max-height: 200px;
      background: rgba(0,0,0,0.8); color: #00ff00; font-size: 12px;
      padding: 10px; border-radius: 5px; z-index: 9999; overflow-y: auto;
      font-family: monospace; display: none;
    `;
    document.body.appendChild(debugConsole);

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    function addToDebugConsole(message, type = 'log') {
      const color = type === 'error' ? '#ff4444' : type === 'warn' ? '#ffaa44' : '#00ff00';
      const div = document.createElement('div');
      div.style.color = color;
      div.textContent = `[${type.toUpperCase()}] ${message}`;
      debugConsole.appendChild(div);
      debugConsole.scrollTop = debugConsole.scrollHeight;
      if (debugConsole.children.length > 50) {
        debugConsole.removeChild(debugConsole.firstChild);
      }
    }
    console.log = (...args) => { originalLog(...args); addToDebugConsole(args.join(' '), 'log'); };
    console.warn = (...args) => { originalWarn(...args); addToDebugConsole(args.join(' '), 'warn'); };
    console.error = (...args) => { originalError(...args); addToDebugConsole(args.join(' '), 'error'); };
    let tapCount = 0;
    document.addEventListener('touchstart', () => {
      tapCount++;
      setTimeout(() => { tapCount = 0; }, 1000);
      if (tapCount === 3) {
        debugConsole.style.display = debugConsole.style.display === 'none' ? 'block' : 'none';
      }
    });
    setTimeout(() => {
      debugConsole.style.display = 'block';
      addToDebugConsole('🚀 デバッグコンソール自動表示開始', 'log');
    }, 5000);
  }

  // ★ 統一されたボタンバインド処理（二重バインド防止・再入禁止）
  const bindStartButtonOnce = () => {
    // 複数セレクタでボタンを検索（優先順）
    const startCTA = container.querySelector('#ar-start-cta') || 
                     container.querySelector('[data-role="start-button"]') ||
                     container.querySelector('#ar-start-button');
    
    if (!startCTA) {
      console.warn('[FLOW] start button not found yet');
      return false; // 未発見
    }
    
    if (startCTA.__bound) {
      console.log('[FLOW] start button already bound, skipping');
      return true; // 既にバインド済み
    }
    
    // バインド実行
    startCTA.addEventListener('click', () => {
      console.log('[FLOW] #ar-start-cta clicked, forwarding to #ar-start-btn');
      const sb = container.querySelector('#ar-start-btn');
      if (sb) {
        sb.click();
      } else {
        console.warn('[FLOW] #ar-start-btn not found');
      }
    }, { once: true });
    
    startCTA.__bound = true;
    console.log('[FLOW] start button bound successfully:', startCTA.id || startCTA.getAttribute('data-role'));
    return true; // バインド成功
  };

  // ARビューア初期化（機能フラグを渡す）
  // ★ bootFromQR 完了を待ってから実行
  const initARViewerWhenReady = () => {
    if (window.__bootFromQR_completed && window.__project) {
      initIntegratedARViewer(container, projectSrc, { enableLSFlag, forceDebugCube, forceNormalMaterial, engineOverride });
    } else {
      // bootFromQR がまだ完了していない場合、イベントを待つ
      window.addEventListener('bootFromQRCompleted', initARViewerWhenReady, { once: true });
    }
  };
  
  initARViewerWhenReady();
  
  // HTML生成直後にボタンのバインドを試行（1回目）
  setTimeout(() => {
    if (!bindStartButtonOnce()) {
      console.log('[FLOW] early binding failed, will retry via observer');
    }
  }, 50);
  
  // MutationObserverでボタンの出現を監視（2回目以降）
  const observer = new MutationObserver(() => {
    if (bindStartButtonOnce()) {
      observer.disconnect(); // バインド成功したら監視停止
    }
  });
  
  observer.observe(container, { childList: true, subtree: true });

  // ★ DOM変更時のデザイン再適用用MutationObserver（削除）
  // シンプルな実装のため、画面表示時の再適用のみに限定
}

// 統合ARビューアの初期化関数
async function initIntegratedARViewer(container, projectSrc, options = {}) {
  console.log('[🚀 initIntegratedARViewer] 開始:', { projectSrc, options });
  arViewerLogger.info('ARビューア初期化開始:', { projectSrc, options });
  const { enableLSFlag = false, forceDebugCube = false, forceNormalMaterial = false, engineOverride = null } = options;
  const loadingScreen = container.querySelector('#ar-loading-screen');
  const loadingBar = container.querySelector('#ar-loading-bar');
  const loadingProgressWrap = container.querySelector('.ar-loading-progress');
  const loadingMessage = container.querySelector('#ar-loading-message');
  const loadingLogo = container.querySelector('#ar-loading-logo');
  const loadingTextGroup = container.querySelector('#ar-loading-text-group');
  const startScreen = container.querySelector('#ar-start-screen');
  const startLogo = container.querySelector('#ar-start-logo');
  const startTitle = container.querySelector('#ar-start-title');
  const startCTA = container.querySelector('#ar-start-cta');
  const guideScreen = container.querySelector('#ar-guide-screen');
  const guideImage = container.querySelector('#ar-guide-image');
  const guideTitle = container.querySelector('#ar-guide-title');
  const guideDescription = container.querySelector('#ar-guide-description');
  const guideMarker = container.querySelector('#ar-guide-marker');
  const guideMarkerImage = container.querySelector('#ar-guide-marker-image');
  const arHost = container.querySelector('#ar-host');
  const statusText = container.querySelector('#ar-status-text');
  const instruction = container.querySelector('#ar-instruction');
  const startBtn = container.querySelector('#ar-start-btn');
  const detectBtn = container.querySelector('#ar-detect-btn');

  // ★★★ スタート画面レイアウト処理を関数化 ★★★
  let layoutStartScreenHandler = null;
  const backBtn = container.querySelector('#ar-back-btn');
  const markerGuide = container.querySelector('#ar-marker-guide');
  const markerGuideTips = container.querySelector('#marker-guide-tips');

  // 画面表示状態の統一管理
  const screenStates = {
    START: 'start',
    LOADING: 'loading',
    GUIDE: 'guide',
    AR: 'ar',
    ERROR: 'error'
  };

  let currentScreenState = null;
  // カスタムマーカーガイド有無（プロジェクト保存のガイド画像/テキストがあるか）
  let hasCustomMarkerGuide = false;

  async function showScreen(state, options = {}) {
    if (currentScreenState === state && !options.force) {
      console.log(`⚠️ 画面状態は既に ${state} です`);
      return;
    }

    console.log(`🔄 画面状態を ${currentScreenState || 'null'} から ${state || 'null'} に変更`);
    console.log(`🔍 showScreen呼び出し詳細:`, {
      要求状態: state,
      現在状態: currentScreenState,
      オプション: options,
      要素存在確認: {
        startScreen: !!startScreen,
        loadingScreen: !!loadingScreen,
        guideScreen: !!guideScreen,
        markerGuide: !!markerGuide,
        markerGuideTips: !!markerGuideTips
      }
    });
    currentScreenState = state;

    // 全ての画面を初期化（非表示）
    if (startScreen) startScreen.style.display = 'none';
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (guideScreen) guideScreen.style.display = 'none';
    if (markerGuide) markerGuide.style.display = 'none';
    if (markerGuideTips) markerGuideTips.style.display = 'none';

    // unifiedLoadingも閉じる
    try {
      if (overlayLoadingId && unifiedLoading) {
        unifiedLoading.hide(overlayLoadingId);
        overlayLoadingId = null;
      }
    } catch (_) {}

    // 指定された画面のみ表示
    switch (state) {
      case screenStates.START:
        if (startScreen) {
          // 1) 表示直前に適用
          if (window.__project) {
            try { 
              await applyProjectDesign(window.__project, { screen: 'start' }); 
              console.info('[APPLY] screen=start applied');
            } catch (e) { 
              console.error('[APPLY] start pre-apply error', e); 
            }
            // 2) 描画確定後にもう一度適用
            requestAnimationFrame(() => {
              try { 
                applyProjectDesign(window.__project, { screen: 'start' }); 
                console.info('[APPLY] screen=start rAF applied');
              } catch (e) { 
                console.error('[APPLY] start rAF-apply error', e); 
              }
            });
          }
          startScreen.style.display = 'flex';
          console.log('✅ スタート画面を表示');
          console.log('🔍 表示後の確認:', {
            display: startScreen.style.display,
            computedDisplay: window.getComputedStyle(startScreen).display,
            visibility: window.getComputedStyle(startScreen).visibility
          });
        } else {
          console.error('❌ startScreen要素が見つかりません');
        }
        break;

      case screenStates.LOADING:
        if (loadingScreen) {
          if (window.__project) {
            try { 
              await applyProjectDesign(window.__project, { screen: 'loading' }); 
              console.info('[APPLY] screen=loading applied');
            } catch (e) { 
              console.error('[APPLY] loading pre-apply error', e); 
            }
            requestAnimationFrame(() => {
              try { 
                applyProjectDesign(window.__project, { screen: 'loading' }); 
                console.info('[APPLY] screen=loading rAF applied');
              } catch (e) { 
                console.error('[APPLY] loading rAF-apply error', e); 
              }
            });
          }
          loadingScreen.style.display = 'flex';
          loadingScreen.style.setProperty('position', 'fixed', 'important');
          loadingScreen.style.setProperty('top', '0', 'important');
          loadingScreen.style.setProperty('left', '0', 'important');
          loadingScreen.style.setProperty('width', '100vw', 'important');
          loadingScreen.style.setProperty('height', '100vh', 'important');
          loadingScreen.style.setProperty('z-index', '9999', 'important');
          console.log('✅ ローディング画面を表示');
          console.log('🔍 表示後の確認:', {
            display: loadingScreen.style.display,
            computedDisplay: window.getComputedStyle(loadingScreen).display,
            zIndex: window.getComputedStyle(loadingScreen).zIndex
          });
        } else {
          console.error('❌ loadingScreen要素が見つかりません');
        }
        break;

      case screenStates.GUIDE:
        if (guideScreen) {
          if (window.__project) {
            try { 
              await applyProjectDesign(window.__project, { screen: 'guide' }); 
              console.info('[APPLY] screen=guide applied');
            } catch (e) { 
              console.error('[APPLY] guide pre-apply error', e); 
            }
            requestAnimationFrame(() => {
              try { 
                applyProjectDesign(window.__project, { screen: 'guide' }); 
                console.info('[APPLY] screen=guide rAF applied');
              } catch (e) { 
                console.error('[APPLY] guide rAF-apply error', e); 
              }
            });
          }
          guideScreen.style.display = 'flex';
          console.log('✅ ガイド画面を表示');
          console.log('🔍 表示後の確認:', {
            display: guideScreen.style.display,
            computedDisplay: window.getComputedStyle(guideScreen).display,
            visibility: window.getComputedStyle(guideScreen).visibility
          });
        } else {
          console.error('❌ guideScreen要素が見つかりません');
        }
        break;

      case screenStates.AR:
        // AR画面 - 他の画面を確実に非表示にして、ARコンテンツを表示
        // スタート画面、ローディング画面、ガイド画面を非表示
        if (startScreen) startScreen.style.display = 'none';
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (guideScreen) guideScreen.style.display = 'none';
        
        // ARホストコンテナを確実に表示
        if (arHost) {
          arHost.style.display = 'block';
          arHost.style.zIndex = '1';
          arHost.style.visibility = 'visible';
        }
        
        // マーカーガイドの表示
        if (hasCustomMarkerGuide) {
          // プロジェクトのカスタムガイドを優先表示
          if (guideScreen) guideScreen.style.display = 'flex';
          if (markerGuide) markerGuide.style.display = 'none';
          if (markerGuideTips) markerGuideTips.style.display = 'none';
          console.log('✅ カスタムガイドを表示（AR実行中の案内として使用）');
        } else {
          // 既定の正方形枠ガイド
          let arDisplayed = false;
          if (markerGuide) { markerGuide.style.display = 'block'; arDisplayed = true; }
          if (markerGuideTips) { markerGuideTips.style.display = 'block'; arDisplayed = true; }
          if (arDisplayed) {
            console.log('✅ 既定ガイドを表示');
          } else {
            console.warn('⚠️ AR画面要素が見つかりません');
          }
        }
        console.log('✅ AR画面を表示（他の画面を非表示）');
        break;

      case screenStates.ERROR:
        if (guideScreen) {
          guideScreen.style.display = 'flex';
          console.log('✅ エラー時ガイド画面を表示');
        } else {
          console.error('❌ エラー時にguideScreen要素が見つかりません');
        }
        break;

      case null:
        // 全画面非表示（ARコンテンツ表示時）
        console.log('✅ 全画面を非表示（ARコンテンツ表示）');
        break;

      default:
        console.warn(`⚠️ 不明な画面状態: ${state}`);
        break;
    }
  }

  function showLoadingScreenOverlay(settings) {
    showScreen(screenStates.LOADING, { force: true });
    if (!settings) return;
    try {
      if (settings.backgroundColor && loadingScreen) {
        loadingScreen.style.background = settings.backgroundColor;
      }
      if (settings.textColor) {
        const loadingTitle = container.querySelector('#ar-loading-title');
        const loadingMessageEl = container.querySelector('#ar-loading-message');
        if (loadingTitle) loadingTitle.style.color = settings.textColor;
        if (loadingMessageEl) loadingMessageEl.style.color = settings.textColor;
      }
      if (settings.loadingMessage) {
        const loadingMessageEl = container.querySelector('#ar-loading-message');
        if (loadingMessageEl) loadingMessageEl.textContent = settings.loadingMessage;
      }
    } catch (error) {
      console.warn('⚠️ ローディング画面適用中の警告:', error);
    }
  }

  if (typeof window !== 'undefined') {
    window.attachStreamToVideo = attachStreamToVideo;
    window.showLoadingScreen = showLoadingScreenOverlay;
  }
  
  let camera, scene, renderer, video;
  let overlayLoadingId = null; // unified-loading のID（フォールバック表示用）
  let markerDetected = false;
  let currentProject = null;
  let arObjects = [];
  let markerPatternCleanup = null;
  let loadedModels = [];
  let cameraVideoElement = null;

  function attachStreamToVideo(stream) {
    if (!stream) return;
    if (!cameraVideoElement) {
      cameraVideoElement = document.querySelector('video#ar-camera') || document.createElement('video');
      if (!cameraVideoElement.id) cameraVideoElement.id = 'ar-camera';
      cameraVideoElement.playsInline = true;
      cameraVideoElement.muted = true;
      cameraVideoElement.autoplay = true;
      cameraVideoElement.style.position = 'fixed';
      cameraVideoElement.style.inset = '0';
      cameraVideoElement.style.opacity = '0';
      cameraVideoElement.style.pointerEvents = 'none';
      if (!cameraVideoElement.parentNode) {
        document.body.appendChild(cameraVideoElement);
      }
    }
    cameraVideoElement.srcObject = stream;
    const playPromise = cameraVideoElement.play?.();
    if (playPromise?.catch) {
      playPromise.catch(() => {});
    }
  }

  // ローディング画面とスタート画面をデフォルト状態にリセットする関数
  function resetLoadingScreenStyles() {
    dlog('🔄 ローディング画面・スタート画面スタイルをリセット');
    
    // ローディング画面のリセット
    if (loadingScreen) {
      loadingScreen.style.backgroundColor = '';
      loadingScreen.style.background = '';
      loadingScreen.style.color = '';
      loadingScreen.style.display = 'flex';
    }
    
    // ローディング画面内の要素をリセット
    const loadingTitle = container.querySelector('#ar-loading-title');
    if (loadingTitle) {
      loadingTitle.style.color = '';
      loadingTitle.style.fontSize = '';
      loadingTitle.style.fontFamily = '';
      loadingTitle.textContent = 'ARプロジェクトを読み込み中...';
    }
    
    if (loadingMessage) {
      loadingMessage.style.color = '';
      loadingMessage.style.fontSize = '';
      loadingMessage.style.fontFamily = '';
      loadingMessage.textContent = 'システムを初期化しています...';
    }
    
    if (loadingLogo) {
      loadingLogo.style.display = 'none';
      loadingLogo.src = '';
      loadingLogo.style.width = '';
      loadingLogo.style.height = '';
      loadingLogo.style.maxWidth = '160px';
      loadingLogo.style.maxHeight = '80px';
      loadingLogo.style.position = '';
      loadingLogo.style.top = '';
      loadingLogo.style.left = '';
      loadingLogo.style.transform = '';
    }
    
    if (loadingTextGroup) {
      loadingTextGroup.style.fontSize = '';
      loadingTextGroup.style.position = '';
      loadingTextGroup.style.top = '';
      loadingTextGroup.style.left = '';
      loadingTextGroup.style.transform = '';
      loadingTextGroup.style.textAlign = '';
    }
    
    // プログレスバーのリセット
    if (loadingBar) {
      loadingBar.style.backgroundColor = '';
      loadingBar.style.background = '';
      loadingBar.style.width = '0%';
    }
    
    if (loadingProgressWrap) {
      loadingProgressWrap.style.display = '';
    }
    
    // スタート画面のリセット
    if (startScreen) {
      startScreen.style.backgroundColor = '';
      startScreen.style.background = '';
      startScreen.style.color = '';
      startScreen.style.display = 'none';
    }
    
    if (startTitle) {
      startTitle.style.color = '';
      startTitle.style.fontSize = '';
      startTitle.style.fontFamily = '';
      startTitle.textContent = 'AR体験を開始';
    }
    
    if (startLogo) {
      startLogo.style.display = 'none';
      startLogo.src = '';
      startLogo.style.width = '';
      startLogo.style.height = '';
      startLogo.style.maxWidth = '160px';
      startLogo.style.maxHeight = '80px';
      startLogo.style.position = '';
      startLogo.style.top = '';
      startLogo.style.left = '';
      startLogo.style.transform = '';
    }
    
    // ガイド画面のリセット
    if (guideScreen) {
      guideScreen.style.backgroundColor = '';
      guideScreen.style.background = '';
      guideScreen.style.color = '';
      guideScreen.style.display = 'none';
    }
    
    if (guideTitle) {
      guideTitle.style.color = '';
      guideTitle.style.fontSize = '';
      guideTitle.style.fontFamily = '';
      guideTitle.textContent = '画面をタップしてください';
    }
    
    if (guideDescription) {
      guideDescription.style.color = '';
      guideDescription.style.fontSize = '';
      guideDescription.style.fontFamily = '';
      guideDescription.textContent = '平らな面を見つけて画面をタップしてください';
    }
    
    if (guideImage) {
      guideImage.style.display = 'none';
      guideImage.src = '';
    }
    
    if (guideMarker) {
      guideMarker.style.display = 'none';
    }
    
    if (guideMarkerImage) {
      guideMarkerImage.src = '';
    }

    if (startCTA) {
      startCTA.style.backgroundColor = '';
      startCTA.style.background = '';
      startCTA.style.color = '';
      startCTA.textContent = '開始';
      startCTA.onclick = null;
    }

    dlog('✅ ローディング画面・スタート画面リセット完了');
  }

  function updateStatus(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    if (IS_DEBUG) console.log(`[${timestamp}] ${message}`);
    
    // ★★★ セキュリティ強化: DOM要素作成でXSS防止 ★★★
    statusText.textContent = ''; // クリア
    const span = document.createElement('span');
    span.className = type;
    span.textContent = `[${timestamp}] ${message}`;
    statusText.appendChild(span);
  }

  function updateProgress(percent, message) {
    loadingBar.style.width = percent + '%';
    if (message) loadingMessage.textContent = message;
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function updateInstruction(text) {
    // ★★★ セキュリティ強化: innerHTML → textContent で XSS 防止 ★★★
    instruction.textContent = text;
  }

  // 戻るボタンイベント
  backBtn.addEventListener('click', navigateBackOrHome);

  // プロジェクト読み込み前に必ずスタイルをリセット
  resetLoadingScreenStyles();

  try {
    updateStatus('📡 プロジェクトデータ取得中', 'info');
    updateProgress(10, 'プロジェクトデータを読み込み中...');

    // プロジェクトデータは bootFromQR で既に取得済み（window.__project に保存）
    if (typeof window !== 'undefined' && window.__project) {
      currentProject = window.__project;
      console.log('🗂️ bootFromQR で取得済みのプロジェクトを使用');
    } else {
      console.error('[FLOW] ❌ プロジェクトが bootFromQR で読み込まれていません');
      throw new Error('Project not loaded by bootFromQR. Check initialization flow.');
    }
    
    
    if (currentProject && typeof currentProject === 'object') {
      currentProject.__sourceUrl = currentProject.__sourceUrl || projectSrc || (typeof location !== 'undefined' ? location.href : '');
    }
    updateStatus('✅ プロジェクトデータ取得完了', 'success');
    updateProgress(30, 'プロジェクト設定を確認中...');

    dlog('📁 読み込まれたプロジェクト:', currentProject);
    dlog('🔍 プロジェクトのloadingScreen:', currentProject.loadingScreen);
    console.log('🔍 Project URL:', window.location.hash);
    console.log('🔍 Full currentProject:', JSON.stringify(currentProject, null, 2));

    // 画面設定（ローディング/スタート/ガイド）の取得
    let ls = currentProject.loadingScreen || {};
    let ss = currentProject.startScreen || {};
    let gs = currentProject.guideScreen || {};

    // 正規化されたデザインを先に取り出し、初期値として採用
    try {
      const { startScreen, loadingScreen, guideScreen } = extractDesign(currentProject);
      ss = { ...ss, ...(startScreen || {}) };
      ls = { ...ls, ...(loadingScreen || {}) };
      gs = { ...gs, ...(guideScreen || {}) };
      console.log('🎯 normalized design extracted for viewer');
    } catch (e) {
      console.warn('⚠️ extractDesign failed (fallback to raw project blocks):', e?.message || e);
    }

    // 追加補完: エディター保存のローカル設定（同一オリジンでの即時反映用）
    try {
      // ローカル補完は ?ls=on のときのみ有効
      const lsEnabled = enableLSFlag === true;
      const editorLocal = lsEnabled ? localStorage.getItem('loadingScreenSettings') : null;
      if (lsEnabled && editorLocal) {
        const editorSettings = JSON.parse(editorLocal);
        if (editorSettings.startScreen) {
          ss = { ...editorSettings.startScreen, ...ss };
          console.log('🔄 editor local startScreen を補完適用');
        }
        if (editorSettings.loadingScreen) {
          ls = { ...editorSettings.loadingScreen, ...ls };
          console.log('🔄 editor local loadingScreen を補完適用');
        }
        if (editorSettings.guideScreen) {
          // ネストを意識して浅い上書き
          gs = { ...editorSettings.guideScreen, ...gs };
          if (editorSettings.guideScreen.surfaceDetection) {
            gs.surfaceDetection = { ...(editorSettings.guideScreen.surfaceDetection || {}), ...(gs.surfaceDetection || {}) };
          }
          if (editorSettings.guideScreen.worldTracking) {
            gs.worldTracking = { ...(editorSettings.guideScreen.worldTracking || {}), ...(gs.worldTracking || {}) };
          }
          console.log('🔄 editor local guideScreen を補完適用');
        }
      }
    } catch (e) {
      console.warn('⚠️ editor local settings の適用に失敗:', e);
    }
    
    // project.jsonに埋め込まれた設定を最優先で適用
    console.log('🔍 ss direct check:', ss);
    console.log('🔍 ls.templateSettings check:', ls.templateSettings);
    console.log('🔍 ls.editorSettings check:', ls.editorSettings);
    console.log('🔍 FULL currentProject check:', JSON.stringify(currentProject, null, 2));
    
    // 1. templateSettingsから設定を適用（最高優先度）
    if (ls.templateSettings) {
      console.log('🎯 project.jsonに埋め込まれたtemplateSettingsを適用:', ls.templateSettings);
      
      if (ls.templateSettings.startScreen) {
        console.log('🎯 templateSettings.startScreen があります:', ls.templateSettings.startScreen);
        console.log('🎯 適用前のss:', ss);
        
        // 完全に上書きではなく、既存の設定に追加する形でマージ
        const templateStartScreen = ls.templateSettings.startScreen;
        ss = { 
          ...ss, 
          ...templateStartScreen,
          // 位置とサイズの設定を明示的に適用
          titlePosition: templateStartScreen.titlePosition ?? ss.titlePosition,
          buttonPosition: templateStartScreen.buttonPosition ?? ss.buttonPosition,
          logoPosition: templateStartScreen.logoPosition ?? ss.logoPosition,
          titleSize: templateStartScreen.titleSize ?? ss.titleSize,
          buttonSize: templateStartScreen.buttonSize ?? ss.buttonSize,
          logoSize: templateStartScreen.logoSize ?? ss.logoSize
        };
        console.log('🎯 templateSettings.startScreenを適用（位置・サイズ設定含む）:', ss);
        console.log('🎯 適用後の背景色 backgroundColor:', ss.backgroundColor);
        console.log('🎯 適用後のボタンテキスト buttonText:', ss.buttonText);
      } else {
        console.log('❌ templateSettings.startScreen がありません');
      }
      if (ls.templateSettings.loadingScreen) {
        // templateSettingsのloadingScreenを最優先でマージ
        ls = { ...ls, ...ls.templateSettings.loadingScreen };
        console.log('🎯 templateSettings.loadingScreenを適用:', ls);
      }
      if (ls.templateSettings.guideScreen) {
        gs = { ...gs, ...ls.templateSettings.guideScreen };
        console.log('🎯 templateSettings.guideScreenを適用:', gs);
      }
    }
    
    // 1.5 プロジェクト直下の画面設定を反映（テンプレの次に優先）
    try {
      if (currentProject?.startScreen) {
        // プロジェクト直下の値は不足補完として扱い、テンプレで上書きされた内容を壊さない
        ss = { ...currentProject.startScreen, ...ss };
        console.log('📝 project.startScreen を適用 (不足補完優先):', currentProject.startScreen);
      }
      if (currentProject?.guideScreen) {
        gs = { ...currentProject.guideScreen, ...gs };
        console.log('📝 project.guideScreen を適用 (不足補完優先):', currentProject.guideScreen);
      }
      if (currentProject?.loadingScreen) {
        // 既に ls は currentProject.loadingScreen を基にしている想定だが、念のため浅く統合
        ls = { ...currentProject.loadingScreen, ...ls };
        console.log('📝 project.loadingScreen を再統合:', currentProject.loadingScreen);
      }
    } catch (_) {}
    
    // 2. editorSettingsから不足している設定を補完
    if (ls.editorSettings) {
      console.log('🔄 editorSettingsから不足設定を補完:', ls.editorSettings);
      
      // startScreen設定: 不足のみ補完（プロジェクト/テンプレ優先）
      if (ls.editorSettings.startScreen) {
        const es = ls.editorSettings.startScreen || {};
        ss = { ...es, ...ss };
        console.log('🔄 editorSettings.startScreenで不足のみ補完:', ss);
      }
      
      // guideScreen設定: 不足のみ補完（ネストもfallback）
      if (ls.editorSettings.guideScreen) {
        const eg = ls.editorSettings.guideScreen || {};
        const mergedGs = { ...eg, ...gs };
        if (eg.surfaceDetection || gs.surfaceDetection) {
          mergedGs.surfaceDetection = { ...(eg.surfaceDetection || {}), ...(gs.surfaceDetection || {}) };
        }
        if (eg.worldTracking || gs.worldTracking) {
          mergedGs.worldTracking = { ...(eg.worldTracking || {}), ...(gs.worldTracking || {}) };
        }
        gs = mergedGs;
        console.log('🔄 editorSettings.guideScreenで不足のみ補完:', gs);
      }
      
      // loadingScreen設定: 不足のみ補完（プロジェクト/テンプレ優先）
      if (ls.editorSettings.loadingScreen) {
        const el = ls.editorSettings.loadingScreen || {};
        ls = { ...el, ...ls };
        console.log('🔄 editorSettings.loadingScreenで不足のみ補完:', ls);
      }
    }
    
    // 3. デフォルト設定でフォールバック（真っ白画面を防ぐ）
    console.log('🔍 スタート画面設定チェック開始');
    console.log('🔍 現在のss:', JSON.stringify(ss, null, 2));
    console.log('🔍 ss.title:', ss.title);
    console.log('🔍 ss.backgroundColor:', ss.backgroundColor);
    
    // 強制的にデフォルト設定を適用（設定が不完全な場合）
    console.log('🚨 強制的にデフォルト設定を適用');
    const defaultSettings = {
      title: 'AR体験を開始',
      buttonText: '開始',
      backgroundColor: '#121212',
      textColor: '#ffffff',
      buttonColor: '#007bff',
      buttonTextColor: '#ffffff',
      titleSize: 1.5,
      buttonSize: 1.0,
      logoSize: 1.0,
      titlePosition: 40,
      buttonPosition: 60,
      logoPosition: 20
    };
    ss = { ...defaultSettings, ...ss };
    console.log('✅ 強制適用後のss:', JSON.stringify(ss, null, 2));
    
    if (!ls.backgroundColor && !ls.textColor) {
      console.log('🔄 ローディング画面デフォルト設定でフォールバック');
      ls = {
        backgroundColor: '#1a1a1a',
        textColor: '#ffffff',
        progressColor: '#4CAF50',
        message: 'ARコンテンツを準備中...',
        showProgress: true,
        ...ls
      };
    }
    
    console.log('🎯 最終的なstartScreen設定:', ss);
    console.log('XXXXX このログが見えますか？ XXXXX');
    
    // 🚨 緊急修正: templateSettingsを強制的に適用
    console.log('🔍 緊急修正の条件チェック:');
    console.log('  - currentProject.loadingScreen:', !!currentProject.loadingScreen);
    console.log('  - templateSettings:', !!currentProject.loadingScreen?.templateSettings);
    console.log('  - startScreen:', !!currentProject.loadingScreen?.templateSettings?.startScreen);
    
    if (currentProject.loadingScreen?.templateSettings?.startScreen) {
      console.log('🚨 緊急修正: templateSettingsを強制適用');
      const forceTemplate = currentProject.loadingScreen.templateSettings.startScreen;
      console.log('🚨 強制適用するデータ:', forceTemplate);
      ss = { ...ss, ...forceTemplate };
      console.log('🚨 強制適用後のss:', ss);
    } else {
      console.log('❌ 緊急修正の条件が満たされません');
      // 直接的なパスも試してみる
      if (currentProject.loadingScreen && currentProject.loadingScreen.templateSettings) {
        console.log('🔄 別のパスを試します...');
        const ts = currentProject.loadingScreen.templateSettings;
        if (ts.startScreen) {
          console.log('✅ 別のパスで発見! 適用します:', ts.startScreen);
          ss = { ...ss, ...ts.startScreen };
          console.log('✅ 別パス適用後のss:', ss);
        }
      }
    }
    console.log('🔍 詳細分析 - どの設定が実際に使われているか:');
    console.log('  - currentProject.startScreen:', JSON.stringify(currentProject.startScreen, null, 2));
    console.log('  - ls.templateSettings?.startScreen:', JSON.stringify(ls.templateSettings?.startScreen, null, 2));
    console.log('  - ls.editorSettings?.startScreen:', JSON.stringify(ls.editorSettings?.startScreen, null, 2));
    console.log('  - 最終的なss:', JSON.stringify(ss, null, 2));
    console.log('🔍 ローディング画面設定の詳細分析:');
    console.log('  - ls.templateSettings?.loadingScreen:', JSON.stringify(ls.templateSettings?.loadingScreen, null, 2));
    console.log('  - 最終的なls:', JSON.stringify({ 
      backgroundColor: ls.backgroundColor, 
      textColor: ls.textColor, 
      progressColor: ls.progressColor,
      message: ls.message || ls.loadingMessage,
      hasTemplateSettings: !!ls.templateSettings 
    }, null, 2));
    
    // ビューア専用の状態管理を使用して設定を適用
    try {
      const { applyProjectLoadingSettings } = await import('../utils/loading-screen-state.js');
      const { mergeLoadingSettings } = await import('../utils/unified-loading-screen.js');
      
      const viewerSettings = applyProjectLoadingSettings(currentProject);
      const mergedSettings = mergeLoadingSettings(currentProject, viewerSettings);
      
      // templateSettingsが最優先、不足項目のみマージで補完
      if (!ls.templateSettings?.loadingScreen) {
        // templateSettingsにローディング設定がない場合のみマージ
        ls = { ...mergedSettings.loadingScreen, ...ls };
        console.log('🔄 統合システムでローディング画面設定を補完:', ls);
      }
      if (!ss.title && !ls.templateSettings?.startScreen) {
        // スタート画面のタイトルがなく、templateSettingsにも設定がない場合のみマージ  
        ss = { ...mergedSettings.startScreen, ...ss };
        console.log('🔄 統合システムでスタート画面設定を補完:', ss);
      }
      if (!gs.message && !ls.templateSettings?.guideScreen) {
        // ガイド画面にメッセージがなく、templateSettingsにも設定がない場合のみマージ
        gs = { ...mergedSettings.guideScreen, ...gs };
        console.log('🔄 統合システムでガイド画面設定を補完:', gs);
      }
      
      dlog('🎨 統合システムでローディング画面設定を適用:', { ls, ss, gs, merged: mergedSettings });
    } catch (error) {
      console.warn('統合システムの適用に失敗、従来の方法を使用:', error);
      
      // フォールバック: templateSettingsを最優先にして、エディター保存形式も処理
      const editorSettings = ls.editorSettings || null;
      
      // templateSettingsが存在する場合は、それを最優先で適用
      if (ls.templateSettings) {
        console.log('🎯 フォールバック中でもtemplateSettingsを最優先適用');
        if (ls.templateSettings.loadingScreen && !ls.backgroundColor) {
          ls = { ...ls, ...ls.templateSettings.loadingScreen };
        }
        if (ls.templateSettings.startScreen && !ss.title) {
          ss = { ...ss, ...ls.templateSettings.startScreen };
        }
      }
      
      // その後でeditorSettingsから不足項目を補完
      if (!ss.title && !ls.templateSettings?.startScreen) {
        ss = currentProject.startScreen || (editorSettings?.startScreen || {});
      }
    }

    console.log('🎨 最終的な設定:', { ls, ss, gs });
    
    // editorSettings をスコープ外でも使用するため、ここで定義
    const editorSettings = ls.editorSettings || null;
    
    if (ls) {
      dlog('🎨 プロジェクトファイルからローディング画面設定を取得:', ls);
      
      // templateSettingsが存在しない場合はlocalStorageからの補完を常に試行（色があっても詳細が欠けている可能性があるため）
      if (ls.selectedScreenId && !ls.templateSettings) {
        dlog('🔍 templateSettingsが存在せず設定が不完全のため、localStorageからの補完を試行:', ls.selectedScreenId);
        try {
          const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
          if (stored) {
            const templates = JSON.parse(stored);
            const template = templates.find(t => t.id === ls.selectedScreenId);
            if (template?.settings) {
              // ローディング画面設定を補完
              if (template.settings.loadingScreen) {
                ls = { ...template.settings.loadingScreen, ...ls };
                dlog('✅ ローディング画面設定をlocalStorageから補完:', template.name);
              }
              
              // スタート画面設定を補完
              if (template.settings.startScreen) {
                ss = { ...template.settings.startScreen, ...ss };
                dlog('✅ スタート画面設定をlocalStorageから補完:', template.name);
              }
              
              // ガイド画面設定を補完
              if (template.settings.guideScreen) {
                currentProject.guideScreen = { ...template.settings.guideScreen, ...(currentProject.guideScreen || {}) };
                dlog('✅ ガイド画面設定をlocalStorageから補完:', template.name);
              }
            }
          }
        } catch (e) {
          console.warn('⚠️ localStorage補完失敗（プロジェクト設定を使用）:', e);
        }
      } else {
        dlog('✅ 完全な設定がプロジェクトファイルに含まれています');
      }
    }
    
    if (ls) {
      dlog('🎨 ローディング画面設定を適用:', ls);

      const loadingTitle = container.querySelector('#ar-loading-title');
      const loadingMessage = container.querySelector('#ar-loading-message');

      // editorSettings.loadingScreen から不足項目を補完
      try {
        if (editorSettings?.loadingScreen) {
          const le = editorSettings.loadingScreen;
          ls = {
            ...le,
            ...ls,
            // 優先順位: 明示的に指定された ls が勝つが、なければ le を使う
            backgroundColor: ls.backgroundColor || le.backgroundColor,
            textColor: ls.textColor || le.textColor,
            progressColor: ls.progressColor || ls.accentColor || le.progressColor || le.accentColor,
            accentColor: ls.accentColor || le.accentColor,
            loadingMessage: ls.loadingMessage || ls.message || le.loadingMessage || le.message,
            brandName: ls.brandName || le.brandName,
            subTitle: ls.subTitle || le.subTitle,
            fontScale: ls.fontScale || le.fontScale,
            showProgress: (ls.showProgress !== undefined) ? ls.showProgress : (le.showProgress !== undefined ? le.showProgress : true),
            logoType: ls.logoType || le.logoType,
            logoImage: ls.logoImage || ls.logo || le.logoImage || le.logo,
            logoPosition: (ls.logoPosition !== undefined) ? ls.logoPosition : le.logoPosition,
            logoSize: (ls.logoSize !== undefined) ? ls.logoSize : le.logoSize,
            textPosition: (ls.textPosition !== undefined) ? ls.textPosition : le.textPosition
          };
          dlog('🔄 editorSettings から不足項目を補完:', ls);
        }
      } catch (e) {
        console.warn('⚠️ editorSettings の補完に失敗（継続）:', e);
      }

      // メッセージ適用（小さめの説明文）
      if (ls.loadingMessage && loadingMessage) {
        loadingMessage.textContent = ls.loadingMessage;
        dlog('📝 メッセージ適用:', ls.loadingMessage);
      } else if (ls.message && loadingMessage) {
        loadingMessage.textContent = ls.message;
        dlog('📝 メッセージ適用（旧形式）:', ls.message);
      }

      // 背景色適用
      if (ls.backgroundColor && loadingScreen) {
        loadingScreen.style.backgroundColor = ls.backgroundColor;
        loadingScreen.style.background = ls.backgroundColor;
        dlog('🎨 背景色適用:', ls.backgroundColor);
      }

      // テキスト色適用
      if (ls.textColor) {
        if (loadingTitle) loadingTitle.style.color = ls.textColor;
        if (loadingMessage) loadingMessage.style.color = ls.textColor;
        dlog('📝 テキスト色適用:', ls.textColor);
      }

      // プログレス色適用（accentColorもしくはprogressColor）
      const progressColor = ls.progressColor || ls.accentColor;
      if (progressColor && loadingBar) {
        loadingBar.style.backgroundColor = progressColor;
        loadingBar.style.background = progressColor;
        dlog('📊 プログレス色適用:', progressColor);
      }

      // プログレスバー表示制御
      if (ls.showProgress === false && loadingBar) {
        loadingBar.style.display = 'none';
        dlog('📊 プログレスバー非表示');
        // 既存デザイン保護のため、ラッパー非表示はフラグ時のみ
        if (enableLSFlag && loadingProgressWrap) {
          loadingProgressWrap.style.display = 'none';
        }
      }

      // ブランド/サブタイトル適用（大きめの見出し）
      if (ls.brandName && loadingTitle) {
        loadingTitle.textContent = ls.brandName;
        dlog('🏢 ブランド名適用:', ls.brandName);
      } else if (ls.subTitle && loadingTitle) {
        loadingTitle.textContent = ls.subTitle;
        dlog('🏢 サブタイトル適用:', ls.subTitle);
      }

      // フォントスケール適用
      if (ls.fontScale && loadingTitle) {
        const scale = Math.max(0.5, Math.min(2.0, ls.fontScale));
        loadingTitle.style.fontSize = `${scale}em`;
        if (loadingMessage) loadingMessage.style.fontSize = `${scale * 0.8}em`;
        dlog('🔤 フォントスケール適用:', scale);
      }

      // ロゴ適用（logoTypeに応じて startScreen.logo または loadingScreen.logo を使用）
      try {
        let logoSrc = '';
        const logoType = ls.logoType || 'none';
        if (logoType === 'useStartLogo' && (ss.logo || ss.logoImage)) {
          logoSrc = ss.logo || ss.logoImage;
        } else if (logoType === 'custom' && (ls.logoImage || ls.logo)) {
          logoSrc = ls.logoImage || ls.logo;
        }
        if (logoSrc && loadingLogo) {
          loadingLogo.src = logoSrc;
          loadingLogo.style.display = 'inline-block';
          // 位置とサイズ（%/倍率ベース）
          const pos = (typeof ls.logoPosition === 'number') ? Math.max(5, Math.min(90, ls.logoPosition)) : 20;
          const px = (typeof ls.logoSize === 'number') ? Math.round(Math.max(0.5, Math.min(2.5, ls.logoSize)) * 80) : 120;
          loadingLogo.style.position = 'absolute';
          loadingLogo.style.left = '50%';
          loadingLogo.style.transform = 'translateX(-50%)';
          loadingLogo.style.top = `${pos}%`;
          loadingLogo.style.maxWidth = `${px}px`;
          loadingLogo.style.maxHeight = `${Math.round(px * 0.5)}px`;
          dlog('🏷️ ロゴ表示:', { logoType, pos, px });
        }
      } catch (e) {
        console.warn('⚠️ ロゴ適用失敗:', e);
      }

      // テキスト位置（上から%）
      try {
        const textPos = (typeof ls.textPosition === 'number') ? Math.max(5, Math.min(90, ls.textPosition)) : 40;
        if (loadingTextGroup) loadingTextGroup.style.top = `${textPos}%`;
      } catch (_) {}
    } else {
      dlog('ℹ️ ローディング画面設定が見つかりません - デフォルト状態を維持');
      // リセット関数により既にデフォルト状態が設定されているので、追加の処理は不要
    }

    // マーカー型はMarkerAR側でモデルを読むため、事前ロードを省略
    const isMarker = (currentProject.type || 'markerless') === 'marker';
    if (!isMarker) {
      updateProgress(50, '3Dモデルを読み込み中...');
      // ローディング画面をしばらく表示してカスタマイズを確認可能にする
      await new Promise(resolve => setTimeout(resolve, 800));
      if (currentProject.models && currentProject.models.length > 0) {
        await loadModels();
      }
    } else {
      updateProgress(60, 'カメラ起動の準備中...');
    }

    updateProgress(80, 'ARシステムを準備中...');
    // 実エンジン（AREngineAdapter）がレンダラー等を構築するため、ここでの独自Three初期化は行わない

    updateProgress(100, '読み込み完了');

    // スタート画面表示（保存されたStartScreen設定を反映）
    try {
      const safeName = escapeHTML(currentProject.name || 'ARプロジェクト');
      
      // ★★★ スタート画面レイアウト関数を定義 ★★★
      function layoutStartScreen() {
        if (!startScreen || !ss) {
          console.log('❌ スタート画面レイアウトスキップ - startScreen:', !!startScreen, 'ss:', !!ss);
          return;
        }
        
        console.log('🔄 スタート画面レイアウト実行');
        console.log('🔍 適用する設定:', ss);
        
        // スタート画面を表示
        showScreen(screenStates.START);
        
        // 背景
        console.log('🎨 背景色適用チェック:', ss.backgroundColor, 'startScreen要素:', !!startScreen);
        if (ss.backgroundColor && startScreen) {
          startScreen.style.setProperty('background', ss.backgroundColor, 'important');
          console.log('🎨 背景色適用実行:', ss.backgroundColor);
          console.log('🔍 適用後の背景色:', window.getComputedStyle(startScreen).backgroundColor);
        } else {
          console.log('❌ 背景色適用スキップ - backgroundColor:', ss.backgroundColor, 'startScreen:', !!startScreen);
        }
      // タイトル
      if (startTitle) {
        const titleText = (typeof ss.title === 'string' && ss.title.length) ? ss.title : safeName;
        startTitle.textContent = titleText;
        const titleColor = ss.textColor || '#ffffff';
        startTitle.style.color = titleColor;
      }
      // タイトルの位置/サイズ（エディタと同じ計算・座標系に合わせる）
      if (startTitle) {
        // 位置（% → コンテナ高さに対する割合。プレビューと同じ仕様）
        if (typeof ss.titlePosition === 'number') {
          const tpos = Math.max(5, Math.min(90, ss.titlePosition));
          startTitle.style.setProperty('position', 'absolute', 'important');
          startTitle.style.setProperty('left', '50%', 'important');
          // プレビューと同じく垂直方向のセンタリングは行わず、要素のトップを基準に配置
          startTitle.style.setProperty('transform', 'translateX(-50%)', 'important');
          startTitle.style.setProperty('top', `${tpos}%`, 'important');
          startTitle.style.setProperty('width', '90%', 'important');
          startTitle.style.setProperty('text-align', 'center', 'important');
          startTitle.style.setProperty('z-index', '9999', 'important');
          console.log('🎨 タイトル位置適用 (コンテナ基準%):', `${tpos}%`, 'titlePosition:', ss.titlePosition);
        } else {
          // デフォルトは中央揃え（flexセンター）
          startTitle.style.position = '';
          startTitle.style.left = '';
          startTitle.style.transform = '';
          startTitle.style.top = '';
          startTitle.style.width = '';
          startTitle.style.textAlign = '';
          startTitle.style.zIndex = '';
        }
        // タイトルサイズをエディター設定と同じ計算で適用
        if (typeof ss.titleSize === 'number') {
          const ts = Math.max(0.5, Math.min(3.0, ss.titleSize));
          // エディターと同じ基準フォントサイズ(24px)を使用
          const baseFontSize = 24;
          const computedSize = baseFontSize * ts;
          startTitle.style.setProperty('font-size', `${computedSize}px`, 'important');
          startTitle.style.setProperty('font-weight', 'bold', 'important');
          // プレビューに合わせて不要な影は付けない
          startTitle.style.setProperty('text-shadow', 'none', 'important');
          startTitle.style.setProperty('margin', '0', 'important');
          console.log('🎨 タイトルフォントサイズ適用 (!important):', `${computedSize}px`, 'titleSize:', ts);
          console.log('🔍 startTitle要素:', startTitle, 'computed style:', window.getComputedStyle(startTitle).fontSize);
        } else {
          console.log('❌ タイトルサイズ適用スキップ - titleSize:', ss.titleSize, 'type:', typeof ss.titleSize);
        }
      }
      // ロゴ
      if ((ss.logo || ss.logoImage) && startLogo) {
        startLogo.src = ss.logo || ss.logoImage;
        startLogo.style.display = 'inline-block';
        const pos = (typeof ss.logoPosition === 'number') ? Math.max(5, Math.min(90, ss.logoPosition)) : 20;
        
        // ロゴサイズをエディター設定と完全に同一の計算で適用
        let logoWidth = 80; // エディターのデフォルト基準
        if (typeof ss.logoSize === 'number') {
          // エディターと完全に同じ計算式: logoSize * 80px
          logoWidth = Math.round(ss.logoSize * 80);
        }
        
        startLogo.style.position = 'absolute';
        startLogo.style.left = '50%';
        startLogo.style.transform = 'translateX(-50%)';
        // プレビューと同じく、コンテナに対する%を使用
        startLogo.style.top = `${pos}%`;
        // 画像そのものに幅・高さを設定し、object-fitで比率維持（プレビューのボックス挙動に寄せる）
        startLogo.style.width = `${logoWidth}px`;
        startLogo.style.height = `${logoWidth}px`;
        startLogo.style.objectFit = 'contain';
        startLogo.style.zIndex = '1202';
        console.log('🎨 ロゴサイズ適用:', `${logoWidth}px`, 'logoSize:', ss.logoSize);
        console.log('🔍 ロゴ要素:', startLogo, 'computed maxWidth:', window.getComputedStyle(startLogo).maxWidth);
      }
      // CTA
      if (startCTA) {
        startCTA.textContent = ss.buttonText || '開始';
        startCTA.style.background = ss.buttonColor || '#007bff';
        startCTA.style.color = ss.buttonTextColor || '#ffffff';
      }
      // ボタンの位置/サイズ（エディタと同じ計算・座標系に合わせる）
      if (startCTA) {
        if (typeof ss.buttonPosition === 'number') {
          const bpos = Math.max(5, Math.min(95, ss.buttonPosition));
          startCTA.style.setProperty('position', 'absolute', 'important');
          startCTA.style.setProperty('left', '50%', 'important');
          // プレビューと同様にX方向のみの平行移動（Y方向は行わない）
          startCTA.style.setProperty('transform', 'translateX(-50%)', 'important');
          startCTA.style.setProperty('top', `${bpos}%`, 'important');
          startCTA.style.setProperty('z-index', '9999', 'important');
          console.log('🎨 ボタン位置適用 (コンテナ基準%):', `${bpos}%`, 'buttonPosition:', ss.buttonPosition);
        } else {
          startCTA.style.position = '';
          startCTA.style.left = '';
          startCTA.style.transform = '';
          startCTA.style.top = '';
          startCTA.style.zIndex = '';
        }
        // ボタンサイズをエディター設定と完全に同一の計算で適用
        if (typeof ss.buttonSize === 'number') {
          // エディターと完全に同じ計算式
          const fontSize = ss.buttonSize * 16; // buttonSize * 16px
          const padY = ss.buttonSize * 12;     // buttonSize * 12px  
          const padX = ss.buttonSize * 24;     // buttonSize * 24px
          
          startCTA.style.setProperty('font-size', `${fontSize}px`, 'important');
          startCTA.style.setProperty('padding', `${padY}px ${padX}px`, 'important');
          startCTA.style.setProperty('border-radius', '8px', 'important');
          startCTA.style.setProperty('box-shadow', '0 2px 8px rgba(0,0,0,0.2)', 'important');
          
          console.log('🎨 ボタンサイズ適用（エディター準拠）:', `${fontSize}px`, 'buttonSize:', ss.buttonSize, 'padding:', `${padY}px ${padX}px`);
          console.log('🔍 ボタン要素:', startCTA, 'computed fontSize:', window.getComputedStyle(startCTA).fontSize, 'computed padding:', window.getComputedStyle(startCTA).padding);
        } else {
          console.log('❌ ボタンサイズ適用スキップ - buttonSize:', ss.buttonSize, 'type:', typeof ss.buttonSize);
        }
      }
      
      // ★★★ レイアウト関数終了とイベント設定 ★★★
      }
      
      // 最終補正: エディターのローカル設定を再適用（テンプレ/デフォルトよりも最優先）
      let editorLocalSettings = null;
      try {
        const editorLocal = localStorage.getItem('loadingScreenSettings');
        if (enableLSFlag && editorLocal) {
          editorLocalSettings = JSON.parse(editorLocal);
          if (editorLocalSettings.startScreen) {
            const els = editorLocalSettings.startScreen || {};
            ss = { ...els, ...ss };
            console.log('🔧 最終補完(ls=on): editor startScreen を不足のみ適用');
          }
          if (editorLocalSettings.loadingScreen) {
            const ell = editorLocalSettings.loadingScreen || {};
            ls = { ...ell, ...ls };
            console.log('🔧 最終補完(ls=on): editor loadingScreen を不足のみ適用');
          }
        }
      } catch (_) {}

      // 背景の強制上書きは行わない。プロジェクト/テンプレの設定のみを使用

      // 🔒 最終確定: テンプレ設定の主要プロパティを明示反映（上書き事故防止）
      try {
        const ts = currentProject?.loadingScreen?.templateSettings || null;
        if (ts) {
          // StartScreen: 配置・サイズ・色・文言の主要キー
          if (ts.startScreen) {
            const tss = ts.startScreen;
            ss = {
              ...ss,
              ...(tss.backgroundColor !== undefined ? { backgroundColor: tss.backgroundColor } : {}),
              ...(tss.textColor !== undefined ? { textColor: tss.textColor } : {}),
              ...(tss.buttonColor !== undefined ? { buttonColor: tss.buttonColor } : {}),
              ...(tss.buttonTextColor !== undefined ? { buttonTextColor: tss.buttonTextColor } : {}),
              ...(tss.title !== undefined ? { title: tss.title } : {}),
              ...(tss.buttonText !== undefined ? { buttonText: tss.buttonText } : {}),
              ...(typeof tss.titlePosition === 'number' ? { titlePosition: tss.titlePosition } : {}),
              ...(typeof tss.buttonPosition === 'number' ? { buttonPosition: tss.buttonPosition } : {}),
              ...(typeof tss.logoPosition === 'number' ? { logoPosition: tss.logoPosition } : {}),
              ...(typeof tss.titleSize === 'number' ? { titleSize: tss.titleSize } : {}),
              ...(typeof tss.buttonSize === 'number' ? { buttonSize: tss.buttonSize } : {}),
              ...(typeof tss.logoSize === 'number' ? { logoSize: tss.logoSize } : {}),
            };
          }
          // LoadingScreen: 色・文言・ロゴ位置/サイズ等
          if (ts.loadingScreen) {
            const tls = ts.loadingScreen;
            ls = {
              ...ls,
              ...(tls.backgroundColor !== undefined ? { backgroundColor: tls.backgroundColor } : {}),
              ...(tls.textColor !== undefined ? { textColor: tls.textColor } : {}),
              ...(tls.progressColor !== undefined ? { progressColor: tls.progressColor } : {}),
              ...(tls.accentColor !== undefined ? { accentColor: tls.accentColor } : {}),
              ...(tls.loadingMessage !== undefined ? { loadingMessage: tls.loadingMessage } : {}),
              ...(tls.message !== undefined ? { message: tls.message } : {}),
              ...(tls.brandName !== undefined ? { brandName: tls.brandName } : {}),
              ...(tls.subTitle !== undefined ? { subTitle: tls.subTitle } : {}),
              ...(typeof tls.fontScale === 'number' ? { fontScale: tls.fontScale } : {}),
              ...(typeof tls.showProgress === 'boolean' ? { showProgress: tls.showProgress } : {}),
              ...(tls.logoType !== undefined ? { logoType: tls.logoType } : {}),
              ...(tls.logo !== undefined ? { logo: tls.logo } : {}),
              ...(typeof tls.logoPosition === 'number' ? { logoPosition: tls.logoPosition } : {}),
              ...(typeof tls.logoSize === 'number' ? { logoSize: tls.logoSize } : {}),
              ...(typeof tls.textPosition === 'number' ? { textPosition: tls.textPosition } : {})
            };
          }
          // GuideScreen: 色・文言・モード/各セクション
          if (ts.guideScreen) {
            const tgs = ts.guideScreen;
            gs = {
              ...gs,
              ...(tgs.backgroundColor !== undefined ? { backgroundColor: tgs.backgroundColor } : {}),
              ...(tgs.textColor !== undefined ? { textColor: tgs.textColor } : {}),
              ...(tgs.accentColor !== undefined ? { accentColor: tgs.accentColor } : {}),
              ...(tgs.mode !== undefined ? { mode: tgs.mode } : {}),
              ...(tgs.title !== undefined ? { title: tgs.title } : {}),
              ...(tgs.description !== undefined ? { description: tgs.description } : {}),
              ...(typeof tgs.surfaceTextPosition === 'number' ? { surfaceTextPosition: tgs.surfaceTextPosition } : {}),
              ...(typeof tgs.surfaceFooterPosition === 'number' ? { surfaceFooterPosition: tgs.surfaceFooterPosition } : {}),
              ...(typeof tgs.worldTextPosition === 'number' ? { worldTextPosition: tgs.worldTextPosition } : {}),
              ...(typeof tgs.worldFooterPosition === 'number' ? { worldFooterPosition: tgs.worldFooterPosition } : {}),
            };
            if (tgs.surfaceDetection) {
              gs.surfaceDetection = { ...(gs.surfaceDetection || {}), ...tgs.surfaceDetection };
            }
            if (tgs.worldTracking) {
              gs.worldTracking = { ...(gs.worldTracking || {}), ...tgs.worldTracking };
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ 最終確定の適用に失敗（継続）:', e);
      }

      // 初回レイアウト実行
      layoutStartScreen();
      
      // resize イベントリスナーを追加（画面回転やiOS UI変化に対応）
      layoutStartScreenHandler = () => {
        if (startScreen && startScreen.style.display !== 'none') {
          layoutStartScreen();
        }
      };
      window.addEventListener('resize', layoutStartScreenHandler);
      
      // ローディングは開始押下まで非表示
      if (loadingScreen) {
        loadingScreen.style.display = 'none';
        console.log('🔍 ローディング画面を初期状態で非表示に設定');
      }
      if (startBtn) {
        startBtn.style.display = 'none';
      }
      if (startCTA) {
        startCTA.setAttribute('data-role', 'start-button');
      }
      // HTML生成後にスタートボタンのイベントをバインド
      setTimeout(() => {
        const startCTA = container.querySelector('#ar-start-cta');
        if (startCTA) {
          startCTA.addEventListener('click', onStartClick, { once: true });
          console.log('[FLOW] start button bound directly:', startCTA);
        } else {
          bindStartButtonOnce();
        }
      }, 100); // DOM更新を待つ
      updateInstruction(`<strong>✅ ${safeName} 読み込み完了</strong><br>「開始」を押して体験を始めてください`);
    } catch (e) {
      // フォールバック（従来）
      const safeName = escapeHTML(currentProject.name || 'ARプロジェクト');
      updateInstruction(`<strong>✅ ${safeName} 読み込み完了</strong><br>画面の「AR開始」を押して体験を始めてください`);
      startBtn.style.display = 'inline-block';
      // フォールバックでもボタンのバインドを試行
      setTimeout(() => {
        const startBtn = container.querySelector('#ar-start-btn');
        if (startBtn) {
          startBtn.addEventListener('click', onStartClick, { once: true });
          console.log('[FLOW] fallback button bound directly:', startBtn);
        } else {
          bindStartButtonOnce();
        }
      }, 100);
    }

      // ガイド画面の設定を準備（AR開始時に表示）
    try {
      // ガイド画面の背景色設定
      if (gs.backgroundColor && guideScreen) {
        guideScreen.style.background = gs.backgroundColor;
      }
      
      // ガイド画面のモード判定（surface/world）
      const guideMode = gs.mode || (currentProject.type === 'marker' ? 'marker' : 'world');
      const abs = (u) => { try { return new URL(u, currentProject.__sourceUrl || (typeof location!== 'undefined' ? location.href : undefined)).href; } catch { return u; } };
      
      if (guideMode === 'marker') {
        // マーカー用ガイド（プロジェクト保存デザインを優先）
        const markerGuide = gs.markerGuide || gs.surfaceDetection || {};
        if (markerGuide.title && guideTitle) guideTitle.textContent = markerGuide.title;
        if (markerGuide.description && guideDescription) guideDescription.textContent = markerGuide.description;

        const guideImgUrl = markerGuide.guideImage || markerGuide.imageUrl || markerGuide.url;
        if (guideImgUrl && guideImage) {
          guideImage.src = abs(guideImgUrl);
          guideImage.style.display = 'block';
          // カスタムガイドがある場合は既定の枠ガイドを隠す
          hasCustomMarkerGuide = true;
          if (guideMarker) guideMarker.style.display = 'none';
          if (markerGuideTips) markerGuideTips.style.display = 'none';
        }

        // 実マーカー画像（あればプレビュー表示）
        const markerPreview = currentProject.markerGuide?.previewImage || currentProject.markerImage || currentProject.markerImageUrl;
        if (markerPreview && guideMarkerImage) {
          guideMarkerImage.src = abs(markerPreview);
          guideMarker.style.display = 'block';
        }
      } else if (guideMode === 'world' && gs.worldTracking) {
        // 平面検出モード
        if (gs.worldTracking.title && guideTitle) {
          guideTitle.textContent = gs.worldTracking.title;
        }
        if (gs.worldTracking.description && guideDescription) {
          guideDescription.textContent = gs.worldTracking.description;
        }
        if (gs.worldTracking.guideImage && guideImage) {
          guideImage.src = abs(gs.worldTracking.guideImage);
          guideImage.style.display = 'block';
        }
        // マーカーは非表示
        if (guideMarker) {
          guideMarker.style.display = 'none';
        }
      }
      
      // テキスト色設定
      if (gs.textColor) {
        if (guideTitle) guideTitle.style.color = gs.textColor;
        if (guideDescription) guideDescription.style.color = gs.textColor;
      }
      
      dlog('🎯 ガイド画面設定完了:', { guideMode, gs, hasCustomMarkerGuide });
    } catch (guideError) {
      console.warn('⚠️ ガイド画面設定エラー:', guideError);
    }

  } catch (error) {
    updateStatus(`❌ エラー: ${error.message}`, 'error');
    updateProgress(0, 'エラーが発生しました');
    updateInstruction('プロジェクトの読み込みに失敗しました');
  }

  // 3Dモデル読み込み（WebXRのみ使用。マーカーはMarkerAR側で処理）
  async function loadModels() {
    updateStatus('📦 3Dモデル読み込み開始', 'info');
    
    // Three.jsの動的インポート
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    
    const loader = new GLTFLoader();
    loadedModels = [];

    for (let i = 0; i < currentProject.models.length; i++) {
      const modelInfo = currentProject.models[i];
      updateProgress(50 + (i / currentProject.models.length) * 20, `モデル読み込み中: ${modelInfo.fileName}`);

      try {
        const gltf = await new Promise((resolve, reject) => {
          loader.load(modelInfo.url, resolve, null, reject);
        });

        loadedModels.push({
          scene: gltf.scene,
          fileName: modelInfo.fileName,
          originalInfo: modelInfo
        });

        updateStatus(`✅ ${modelInfo.fileName} 読み込み完了`, 'success');
      } catch (error) {
        updateStatus(`⚠️ ${modelInfo.fileName} 読み込み失敗: ${error.message}`, 'warning');
      }
    }

    updateStatus(`📦 3Dモデル読み込み完了 (${loadedModels.length}個)`, 'success');
  }

  // AR初期化はAREngineAdapter側に委譲（ここでは何もしない）
  async function initAR() {}

  // AR状態機械の初期化
  let arStateMachine = null;
  let currentAREngine = null;
  let loadingStateManager = null;

  // AR状態機械の初期化
  function initializeARStateMachine() {
    if (arStateMachine) {
      return; // 既に初期化済み
    }

    // ローディング状態管理の初期化
    if (!loadingStateManager) {
      loadingStateManager = createLoadingStateManager({
        onStateChange: (newState, oldState, data) => {
          console.log(`📊 ローディング状態: ${oldState} → ${newState}`, data);
          // updateStatus関数との互換性のため、直接UI更新
          updateStatus(data.message, data.type);
        }
      });
    }

    arStateMachine = createARStateMachine({
      onStateChange: async (newState, oldState, data) => {
        console.log(`🔄 AR状態変更: ${oldState} → ${newState}`, data);
        await handleARStateChange(newState, oldState, data);
      },
      onError: async (error, previousState, data) => {
        console.error('❌ AR状態機械エラー:', error, { previousState, data });
        handleARError(error, previousState, data);
      },
      defaultTimeout: 30000
    });
  }

  // AR開始（ユーザー操作起点・状態機械制御）
  startBtn.addEventListener('click', async () => {
    console.log('🚀 AR開始ボタンが押されました');

    // 状態機械初期化
    initializeARStateMachine();

    // 現在の状態確認
    const currentState = arStateMachine.getState();
    console.log('📊 現在のAR状態:', currentState);

    // IDLE状態でない場合は重複起動防止
    if (currentState !== ARState.IDLE) {
      console.log('⚠️ AR処理が既に進行中です:', currentState);
      return;
    }

    // AR起動要求の状態遷移
    try {
      await arStateMachine.transition(ARState.LAUNCH_REQUESTED, {
        timestamp: Date.now(),
        userInitiated: true,
        engineOverride: engineOverride || null
      });
    } catch (error) {
      console.error('❌ AR起動要求エラー:', error);
      handleARError(error, ARState.IDLE, {});
    }
  });

  // AR状態変更ハンドラー
  async function handleARStateChange(newState, oldState, data) {
    switch (newState) {
      case ARState.LAUNCH_REQUESTED:
        startBtn.style.display = 'none';
        loadingStateManager.startLoading('🔍 デバイス対応確認中...');
        await handleLaunchRequested(data);
        break;

      case ARState.PERMISSION_PROMPT:
        loadingStateManager.startLoading('📱 権限確認中...');
        await handlePermissionPrompt(data);
        break;

      case ARState.CAMERA_STARTING:
        loadingStateManager.startLoading('📷 カメラ起動中...');
        updateGuideScreen(data.fallbackInfo, 'marker');
        showScreen(screenStates.GUIDE);
        await handleCameraStarting(data);
        break;

      case ARState.XR_STARTING:
        loadingStateManager.startLoading('🥽 WebXR起動中...');
        updateGuideScreen(data.fallbackInfo, 'webxr');
        showScreen(screenStates.GUIDE);
        await handleXRStarting(data);
        break;

      case ARState.LOADING_ASSETS:
        loadingStateManager.startLoading('📦 アセット読み込み中...');
        await handleLoadingAssets(data);
        break;

      case ARState.PLACING:
        loadingStateManager.setSuccess('🎯 配置モード');
        showScreen(screenStates.AR);
        await handlePlacing(data);
        break;

      case ARState.RUNNING:
        loadingStateManager.setSuccess('✅ AR実行中');
        showScreen(screenStates.AR);
        await handleRunning(data);
        break;

      case ARState.ERROR:
        loadingStateManager.setError(data.error?.message || 'AR起動エラー');
        handleARError(data.error, oldState, data);
        break;

      case ARState.DISPOSED:
        loadingStateManager.setIdle('準備完了');
        await handleDisposed(data);
        break;
    }
  }

  // AR起動要求処理
  async function handleLaunchRequested(data) {
    try {
      console.log('🔍 WebXRサポート判定開始...');

      const xrSupport = await checkXRSupport();
      const fallbackInfo = getRecommendedFallback(xrSupport);

      console.log('🔍 WebXRサポート結果:', {
        supported: xrSupport.supported,
        reason: xrSupport.reason,
        recommendation: fallbackInfo.type
      });

      // AR経路確定（WebXR or AR.js）
      const useWebXR = xrSupport.supported && !data.engineOverride;
      const arPath = useWebXR ? 'webxr' : 'marker';

      console.log(`🎯 AR経路確定: ${arPath}${data.engineOverride ? ' (URL強制指定)' : ' (自動判定)'}`, {
        webxrSupported: xrSupport.supported,
        engineOverride: data.engineOverride,
        finalPath: arPath
      });

      // 次の状態へ遷移（権限プロンプトを経由）
      await arStateMachine.transition(ARState.PERMISSION_PROMPT, {
        arPath,
        xrSupport,
        fallbackInfo,
        engineOverride: data.engineOverride
      });

    } catch (error) {
      console.error('❌ AR起動要求処理エラー:', error);
      throw error;
    }
  }

  // 権限プロンプト処理
  async function handlePermissionPrompt(data) {
    console.log('📱 権限プロンプト処理開始');
    
    // 権限要求処理（カメラアクセス）
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      console.log('✅ カメラ権限取得完了');
      
      // ストリームを停止（ARエンジン側で再取得）
      stream.getTracks().forEach(track => track.stop());
      
      // 次の状態へ遷移
      const nextState = data.arPath === 'webxr' ? ARState.XR_STARTING : ARState.CAMERA_STARTING;
      await arStateMachine.transition(nextState, data);
      
    } catch (error) {
      console.error('❌ カメラ権限取得失敗:', error);
      await arStateMachine.transition(ARState.ERROR, { 
        error: new Error(`カメラ権限が必要です: ${error.message}`) 
      });
    }
  }

  // カメラ起動処理
  async function handleCameraStarting(data) {
    try {
      console.log('📷 AR.jsカメラ起動開始...');
      console.log('🔍 currentProject確認:', {
        'projectが存在': !!currentProject,
        'markerPattern': currentProject?.markerPattern ? '存在' : 'なし',
        'markerImage': currentProject?.markerImage || 'なし',
        'markerImageUrl': currentProject?.markerImageUrl || 'なし',
        'marker.url': currentProject?.marker?.url || 'なし',
        '__sourceUrl': currentProject?.__sourceUrl
      });

      // プロジェクトのカスタムマーカーを優先して .patt を用意
      let markerUrlOption = null;
      try {
        // 1) 既に .patt 文字列が保存されている場合
        if (currentProject?.markerPattern && typeof currentProject.markerPattern === 'string') {
          console.log('✅ markerPattern が存在します（文字列長:', currentProject.markerPattern.length, '）');
          const patt = createPatternBlob(currentProject.markerPattern);
          markerUrlOption = patt.url;
          markerPatternCleanup = patt.revoke;
          console.log('📌 プロジェクト保存済みの .patt を使用:', markerUrlOption);
        } else {
          console.log('ℹ️ markerPattern が存在しないため、マーカー画像から生成を試みます');
          // 2) マーカー画像から .patt を生成
          // 複数の場所からマーカー画像URLを探す
          const rawUrl = currentProject?.markerImage
            || currentProject?.markerImageUrl
            || currentProject?.marker?.url
            || currentProject?.marker?.src
            || currentProject?.guide?.marker?.src
            || currentProject?.guide?.markerImage
            || currentProject?.screens?.[0]?.marker?.src
            || null;
          console.log('🔍 マーカー画像URL:', rawUrl);

          if (rawUrl) {
            // 絶対URL化（プロジェクトの__sourceUrlを基準に）
            const baseUrl = currentProject.__sourceUrl || location.href;
            let absUrl;
            try {
              // 相対パス（assets/marker.png等）を絶対URLに変換
              if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('blob:') || rawUrl.startsWith('data:')) {
                absUrl = rawUrl;
              } else if (rawUrl.startsWith('/')) {
                absUrl = new URL(rawUrl, location.origin).href;
              } else {
                // プロジェクトフォルダからの相対パス
                const projectFolder = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
                absUrl = new URL(rawUrl, projectFolder).href;
              }
            } catch {
              absUrl = rawUrl;
            }
            console.log('🔗 絶対URL化されたマーカー画像:', absUrl);
            console.log('🔄 マーカーパターン生成開始...');
            const patternString = await generateMarkerPatternFromImage(absUrl).catch((err) => {
              console.error('❌ マーカーパターン生成エラー:', err);
              return null;
            });
            if (patternString) {
              console.log('✅ マーカーパターン生成成功（文字列長:', patternString.length, '）');
              const patt = createPatternBlob(patternString);
              markerUrlOption = patt.url;
              markerPatternCleanup = patt.revoke;
              console.log('📌 マーカー画像から生成した .patt を使用:', markerUrlOption);
            } else {
              console.warn('⚠️ マーカーパターン生成に失敗しました');
            }
          } else {
            console.warn('⚠️ マーカー画像URLが見つかりません - フォールバック画像を使用します');
            // フォールバック: サンプル画像からパターンを生成
            try {
              const fallbackUrl = '/assets/sample.png';
              console.log('🔄 フォールバック画像からマーカーパターン生成:', fallbackUrl);
              const patternString = await generateMarkerPatternFromImage(fallbackUrl);
              if (patternString) {
                const patt = createPatternBlob(patternString);
                markerUrlOption = patt.url;
                markerPatternCleanup = patt.revoke;
                console.log('✅ フォールバック画像からマーカーパターン生成成功');
              }
            } catch (fallbackErr) {
              console.error('❌ フォールバック画像からのパターン生成も失敗:', fallbackErr);
            }
          }
        }
      } catch (genErr) {
        console.error('❌ マーカーパターン準備エラー:', genErr);
        console.warn('⚠️ マーカーパターン準備で警告（フォールバック継続）:', genErr?.message || genErr);
      }

      console.log('🎯 最終的なmarkerUrlOption:', markerUrlOption);

      // ⚠️ 重要: HIROマーカーへのフォールバック禁止 (docs/MARKER_POLICY.md 参照)
      // カスタムマーカーが設定されていない場合は警告を表示
      if (!markerUrlOption) {
        console.warn('⚠️ カスタムマーカーが設定されていません');
        console.warn('📌 プロジェクト設定でマーカー画像をアップロードしてください');
      }
      
      const finalMarkerUrl = markerUrlOption || null;
      console.log('🎯 AREngineAdapter.create()に渡すmarkerUrl:', finalMarkerUrl);

      const arEngine = await AREngineAdapter.create({
        container: arHost,
        preferredEngine: 'marker',
        // MarkerAR にカスタムマーカーを渡す（nullならサンプル画像にフォールバック）
        markerUrl: finalMarkerUrl
      });

      currentAREngine = arEngine;
      await arEngine.initialize();

      // アセット読み込みへ遷移
      await arStateMachine.transition(ARState.LOADING_ASSETS, {
        ...data,
        arEngine
      });

    } catch (error) {
      console.error('❌ カメラ起動エラー:', error);
      throw error;
    }
  }

  // WebXR起動処理
  async function handleXRStarting(data) {
    try {
      console.log('🥽 WebXR起動開始...');

      const arEngine = await AREngineAdapter.create({
        container: arHost,
        preferredEngine: 'webxr'
      });

      currentAREngine = arEngine;
      await arEngine.initialize();

      // アセット読み込みへ遷移
      await arStateMachine.transition(ARState.LOADING_ASSETS, {
        ...data,
        arEngine
      });

    } catch (error) {
      console.error('❌ WebXR起動エラー:', error);
      throw error;
    }
  }

  // アセット読み込み処理
  async function handleLoadingAssets(data) {
    try {
      console.log('📦 アセット読み込み開始...');

      // プロジェクト開始
      await currentAREngine.start(currentProject);

      // 配置モードまたは実行モードへ遷移
      const nextState = data.arPath === 'webxr' ? ARState.PLACING : ARState.RUNNING;
      await arStateMachine.transition(nextState, data);

    } catch (error) {
      console.error('❌ アセット読み込みエラー:', error);
      throw error;
    }
  }

  // 配置モード処理
  async function handlePlacing(data) {
    console.log('🎯 配置モード開始');

    if (data.arPath === 'webxr') {
      updateInstruction('<strong>🎯 空間をスキャンしてARオブジェクトを配置してください</strong>');
    }

    // WebXRの場合、タップで配置完了後にRUNNING状態へ遷移
    // この遷移は実際のタップイベントで実行される
  }

  // AR実行処理
  async function handleRunning(data) {
    console.log('▶️ AR実行開始');

    // RUNNING状態のタイムアウトをクリア（実行中は無期限）
    if (arStateMachine) {
      arStateMachine.clearStateTimeout(ARState.RUNNING);
    }

    if (data.arPath === 'marker') {
      updateInstruction('<strong>📌 マーカーをカメラにかざしてください</strong>');
    } else if (data.arPath === 'webxr') {
      updateInstruction('<strong>🎉 ARオブジェクトを楽しんでください</strong>');
    }
  }

  // 破棄処理
  async function handleDisposed(data) {
    console.log('🗑️ AR破棄処理');

    // ARエンジンアダプターの完全破棄
    await AREngineAdapter.destroyActiveEngine();
    currentAREngine = null;

    arStateMachine = null;
  }

  // ARエラーハンドリング
  function handleARError(error, previousState, data) {
    console.error('❌ AR状態機械エラー:', error, { previousState, data });

    updateStatus(`❌ AR起動失敗: ${error.message}`, 'error');
    showRetryButton(error.message);
  }

  // ガイド画面更新
  function updateGuideScreen(fallbackInfo, arPath) {
    const guideTitle = container.querySelector('#ar-guide-title');
    const guideDescription = container.querySelector('#ar-guide-description');

    if (arPath === 'webxr') {
      if (guideTitle) guideTitle.textContent = '平面をスキャンしてください';
      if (guideDescription) guideDescription.textContent = '床や机の表面を見つけて、画面をタップして配置してください';
    } else {
      if (guideTitle) guideTitle.textContent = 'マーカーをスキャンしてください';
      if (guideDescription) guideDescription.textContent = 'マーカー画像をカメラにかざしてください';
    }

    // 画面状態遷移を強制（ガイドを可視化）
    try { showScreen(screenStates.GUIDE, { force: true }); } catch(_) {}
  }


  // 再試行ボタン表示
  function showRetryButton(errorMessage) {
    const retryButton = document.createElement('button');
    retryButton.textContent = '再試行';
    retryButton.className = 'btn-primary';
    retryButton.style.marginTop = '1rem';

    retryButton.onclick = async () => {
      // 状態機械リセット
      if (arStateMachine) {
        await arStateMachine.reset();
      }

      // ARエンジンアダプターの完全リセット
      await AREngineAdapter.reset();
      currentAREngine = null;

      // ローディング状態もリセット
      if (loadingStateManager) {
        loadingStateManager.setIdle('準備完了');
      }

      startBtn.style.display = 'inline-block';
      retryButton.remove();
    };

    const errorContainer = container.querySelector('.ar-loading-content') || container;
    errorContainer.appendChild(retryButton);
  }


  // マーカー検出
  detectBtn.addEventListener('click', () => {
    if (markerDetected) {
      // マーカー消失
      markerDetected = false;
      arObjects.forEach(obj => scene.remove(obj));
      arObjects = [];
      // マーカーを見失ったらAR画面（マーカーガイド）を再表示
      showScreen(screenStates.AR);

      updateStatus('❌ マーカーを見失いました', 'warning');
      detectBtn.textContent = '🎯 マーカー検出';
      detectBtn.className = 'btn-success';

    } else {
      // マーカー検出
      markerDetected = true;
      createARScene();
      // マーカー検出後はAR画面のガイドを非表示（ARコンテンツ表示）
      showScreen(null);

      updateStatus('🎯 マーカー検出成功！', 'success');
      updateInstruction(`
        <strong>🎉 ${currentProject.name || 'ARプロジェクト'} 表示中</strong><br>
        読み込まれた3Dモデル: ${loadedModels.length}個
      `);
      detectBtn.textContent = '❌ マーカー消失';
      detectBtn.className = 'btn-secondary';
    }
  });

  // ARシーン作成
  async function createARScene() {
    updateStatus('🎨 ARシーン構築中', 'info');
    
    const THREE = await import('three');

    if (loadedModels.length > 0) {
      // 読み込まれた3Dモデルを使用
      loadedModels.forEach((modelData, index) => {
        const model = modelData.scene.clone();

        // サイズ正規化
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z);
        const scale = 1.0 / maxSize;
        model.scale.setScalar(scale);

        // 位置調整
        model.position.set(index * 1.2 - (loadedModels.length - 1) * 0.6, 0, 0);

        scene.add(model);
        arObjects.push(model);
      });
    } else {
      // フォールバック: デフォルトオブジェクト
      const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);
      arObjects.push(cube);
    }

    updateStatus(`✅ ARオブジェクト配置完了 (${arObjects.length}個)`, 'success');
  }

  // アニメーションループ
  function startRenderLoop() {
    window.stopARAnimation = false;
    
    function animate() {
      // クリーンアップ時のアニメーション停止チェック
      if (window.stopARAnimation) {
        console.log('🛑 ARアニメーションループ停止');
        return;
      }
      
      requestAnimationFrame(animate);

      if (markerDetected && arObjects.length > 0) {
        arObjects.forEach((obj, index) => {
          obj.rotation.y += 0.01 + index * 0.005;
          obj.position.y = Math.sin(Date.now() * 0.001 + index) * 0.1;
        });
      }

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    }

    animate();
  }
  
  // ★★★ ARビューア統合クリーンアップ関数を返す ★★★
  return function cleanup() {
    console.log('🧹 ARビューア 統合クリーンアップ実行');
    
    // 1. イベントリスナー解除
    if (layoutStartScreenHandler) {
      window.removeEventListener('resize', layoutStartScreenHandler);
      layoutStartScreenHandler = null;
      console.log('✅ resize イベントリスナーを解除');
    }
    
    // 2. AR関連リソース解除
    if (typeof window.arInstance !== 'undefined' && window.arInstance) {
      try {
        window.arInstance.dispose();
        window.arInstance = null;
        console.log('✅ ARインスタンスを破棄');
      } catch(e) { console.warn('⚠️ ARインスタンス破棄エラー:', e); }
    }
    
    // 3. カメラストリーム停止
    if (video && video.srcObject) {
      try {
        const stream = video.srcObject;
        if (stream && stream.getTracks) {
          stream.getTracks().forEach(track => {
            track.stop();
            console.log('✅ カメラトラック停止:', track.kind);
          });
        }
        video.srcObject = null;
      } catch(e) { console.warn('⚠️ カメラストリーム停止エラー:', e); }
    }
    
    // 4. Three.js リソース解除
    if (renderer) {
      try {
        renderer.dispose();
        console.log('✅ Three.jsレンダラーを破棄');
      } catch(e) { console.warn('⚠️ Three.jsレンダラー破棄エラー:', e); }
    }
    
    // 5. DOM要素解除
    if (video && video.parentNode) {
      video.parentNode.removeChild(video);
      console.log('✅ videoエレメントをDOM削除');
    }
    
    // 6. グローバル変数リセット
    video = null;
    scene = null;
    camera = null;
    renderer = null;
    markerDetected = false;
    currentProject = null;

    if (typeof markerPatternCleanup === 'function') {
      try { markerPatternCleanup(); } catch (_) {}
      markerPatternCleanup = null;
    }
    
    // 7. アニメーションループ停止のためのフラグ設定
    if (typeof window.stopARAnimation !== 'undefined') {
      window.stopARAnimation = true;
    }
    
    console.log('✅ ARビューア クリーンアップ完了');
  };
}
