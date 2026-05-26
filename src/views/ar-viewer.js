// src/views/ar-viewer.js
// 統合ARビューア - QRコードからプロジェクトデータを読み込んでAR表示
import { showViewerLoadingScreen, unifiedLoading } from '../utils/unified-loading-screen.js';
// Takeover: viewer内で必ず読み込む（関数非依存で Start→Loading→Guide を直列制御）
import '../dev/takeover-viewer-standalone.js';
import { createLogger } from '../utils/logger.js';
import { TEMPLATES_STORAGE_KEY, defaultTemplateSettings } from '../components/loading-screen/template-manager.js';
import { createPatternBlob } from '../utils/marker-utils.js';
import { AREngineAdapter } from '../utils/ar-engine-adapter.js';
import { checkXRSupport, getRecommendedFallback } from '../utils/webxr-support.js';
import { createARStateMachine, ARState } from '../utils/ar-state-machine.js';
import { createLoadingStateManager, LoadingState } from '../utils/loading-state-manager.js';
import { getParam, getProjectSrc } from '../utils/url-params.js';
import { applyProjectDesign } from '../utils/apply-project-design.js';
import { DEV_FORCE_SCREENS, DEV_STRICT_MODE, DEV_VERBOSE_LOGS, DEV_TAKEOVER_UI } from '../config/feature-flags.js';
import { fetchOnce, reportFetchStats } from '../utils/monitored-fetch.js';
import { extractDesign } from '../utils/design-extractor.js';

const arViewerLogger = createLogger('ARViewer');

let __booted = false;
let __projectLoadPromise = null;
let __projectLoadPromiseSrc = null;

function navigateBackOrHome() {
  try {
    if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
      history.back();
      return;
    }
  } catch (_) {}
  window.location.hash = '#/projects';
}

function isMeaningfulValue(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isCustomLoadingConfig(config = {}) {
  if (!config || typeof config !== 'object') return false;

  const defaults = defaultTemplateSettings.loadingScreen || {};

  // ユーザーがエディタを開いて何か設定を保存していれば、それだけで「設定済み」とみなす。
  // これは loadingScreen.editorSettings / templateSettings の存在で判定する。
  if (config.editorSettings?.loadingScreen && Object.keys(config.editorSettings.loadingScreen).length > 0) return true;
  if (config.templateSettings?.loadingScreen && Object.keys(config.templateSettings.loadingScreen).length > 0) return true;
  if (config.loadingScreen?.editorSettings) return true;
  if (config.loadingScreen?.templateSettings) return true;

  const candidates = [
    config,
    config.loadingScreen,
    config.editorSettings?.loadingScreen,
    config.templateSettings?.loadingScreen
  ].filter(Boolean);

  return candidates.some((item) => {
    if (item.template && item.template !== 'none' && item.template !== 'default') return true;
    if (item.selectedScreenId && item.selectedScreenId !== 'none' && item.selectedScreenId !== 'default') return true;
    if (isMeaningfulValue(item.logo) || isMeaningfulValue(item.logoImage) || isMeaningfulValue(item.image) || isMeaningfulValue(item.background) || isMeaningfulValue(item.backgroundImage)) return true;
    if (item.logoType && item.logoType !== 'none') return true;
    if (isMeaningfulValue(item.brandName) && ![defaults.brandName, 'あなたのブランド'].includes(item.brandName)) return true;
    if (isMeaningfulValue(item.subTitle) && ![defaults.subTitle, 'AR体験'].includes(item.subTitle)) return true;
    if (isMeaningfulValue(item.loadingMessage) && item.loadingMessage !== defaults.loadingMessage) return true;
    if (isMeaningfulValue(item.message) && item.message !== defaults.loadingMessage && item.message !== '読み込み中...') return true;
    if (isMeaningfulValue(item.backgroundColor) && !['#1a1a1a', '#121212'].includes(item.backgroundColor.toLowerCase())) return true;
    if (isMeaningfulValue(item.textColor) && item.textColor.toLowerCase() !== '#ffffff') return true;
    if (isMeaningfulValue(item.progressColor) && !['#4caf50', '#6c5ce7'].includes(item.progressColor.toLowerCase())) return true;
    if (isMeaningfulValue(item.accentColor) && item.accentColor.toLowerCase() !== '#6c5ce7') return true;
    return false;
  });
}

function hasCustomLoadingScreen(project = {}) {
  return isCustomLoadingConfig(project.loadingScreen) || isCustomLoadingConfig(project.loading);
}

function hasCustomGuideScreen(project = {}) {
  // マーカーモードで markerImage が設定されていれば、ガイド画面に表示すべき内容がある。
  const isMarker = (project.type || project.mode) === 'marker';
  if (isMarker && (isMeaningfulValue(project.markerImage) || isMeaningfulValue(project.markerImageUrl))) {
    return true;
  }

  const candidates = [project.guideScreen, project.guide].filter((v) => v && typeof v === 'object');
  const defaultTitles = new Set(['ガイド画面', 'マーカーをカメラに写してください', '画像の上にカメラを向けて合わせてください', '画面をタップしてください']);
  const defaultDescriptions = new Set(['準備中', 'マーカー画像を画面内に収めてください', '平らな面を見つけて画面をタップしてください']);

  return candidates.some((guide) => {
    if (isMeaningfulValue(guide.background) || isMeaningfulValue(guide.backgroundImage)) return true;
    // モード別ネスト設定: title / description / instructionText のいずれかがデフォルト以外なら設定済み
    if (guide.surfaceDetection) {
      const s = guide.surfaceDetection;
      if (isMeaningfulValue(s.instructionText)) return true;
      if (isMeaningfulValue(s.title) && !defaultTitles.has(s.title)) return true;
      if (isMeaningfulValue(s.description) && !defaultDescriptions.has(s.description)) return true;
    }
    if (guide.worldTracking) {
      const w = guide.worldTracking;
      if (isMeaningfulValue(w.instructionText)) return true;
      if (isMeaningfulValue(w.title) && !defaultTitles.has(w.title)) return true;
      if (isMeaningfulValue(w.description) && !defaultDescriptions.has(w.description)) return true;
    }
    if (isMeaningfulValue(guide.title) && !defaultTitles.has(guide.title)) return true;
    if (isMeaningfulValue(guide.description) && !defaultDescriptions.has(guide.description)) return true;
    return false;
  });
}

// ★ 旧関数は削除し、getProjectSrc() を直接使用 ★
// function getProjectSrcFromHash() は url-params.js の getProjectSrc() に統合

// ★ スタートUI乗っ取り版（デザインを"本当に"表示させる）
function __takeoverStartUI(project){

  const p = project || window.__project || {};

  // extractDesignで正規化されたデータを使用
  const { startScreen } = extractDesign(p);

  // 旧形式との互換性のため、両方のパスをチェック
  const start = p.start || p.startScreen || {};

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

  // 背景画像
  const bgImage = startScreen?.backgroundImage || startScreen?.background || start?.backgroundImage || start?.background;
  if (bgImage) {
    root.style.backgroundImage = `url(${bgImage})`;
    root.style.backgroundSize = 'cover';
    root.style.backgroundPosition = 'center';
  }

  // 背景色
  const bgColor = startScreen?.backgroundColor || start?.backgroundColor;
  if (bgColor) {
    root.style.backgroundColor = bgColor;
  }

  // タイトル
  const title = document.createElement('h1');
  title.textContent = startScreen?.title || start?.title || 'AR体験を開始';
  const titleColor = startScreen?.textColor || startScreen?.titleColor || start?.textColor || '#fff';
  const titleSize = startScreen?.titleSize || start?.titleSize || 1;
  title.style.cssText = [
    `color:${titleColor}`,
    `font-size:${32 * titleSize}px`,
    'font-weight:700','margin:0','text-shadow:0 2px 6px rgba(0,0,0,.4)'
  ].join(';');

  // 位置（%をvhで近似）
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:absolute;left:0;right:0;text-align:center;transform:translateY(-50%)';
  const titlePos = startScreen?.titlePosition || start?.titlePosition || 40;
  wrap.style.top = `${titlePos}vh`;
  wrap.appendChild(title);

  // 開始ボタン
  const btn = document.createElement('button');
  btn.textContent = startScreen?.buttonText || start?.buttonText || '開始';
  const buttonColor = startScreen?.buttonColor || start?.buttonColor || '#6c63ff';
  const buttonTextColor = startScreen?.buttonTextColor || start?.buttonTextColor || '#fff';
  btn.style.cssText = [
    'margin-top:24px','padding:12px 24px','border-radius:12px',
    'border:none','cursor:pointer','box-shadow:0 8px 24px rgba(0,0,0,.25)',
    `background:${buttonColor}`,`color:${buttonTextColor}`,'font-size:16px','font-weight:600'
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
  arViewerLogger.info('[TAKEOVER] start UI mounted');
}

function __showLoadingUI(project){
  arViewerLogger.info('🔍 __showLoadingUI 呼び出し:', { project });

  // extractDesignで正規化されたデータを使用
  const { loadingScreen } = extractDesign(project);
  arViewerLogger.info('🔍 正規化されたloadingScreen:', loadingScreen);

  // 旧形式との互換性のため、両方のパスをチェック
  const l = project?.loading || project?.loadingScreen || {};
  arViewerLogger.info('🔍 生のloading設定:', l);

  // 既存を消す
  document.getElementById('__takeover_loading__')?.remove();

  const box = document.createElement('div');
  box.id = '__takeover_loading__';
  box.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;justify-content:center;align-items:center;background:rgba(0,0,0,.55);backdrop-filter:blur(2px)';

  // 背景色を適用
  const bgColor = loadingScreen?.backgroundColor || l?.backgroundColor;
  if (bgColor) {
    box.style.background = bgColor;
  }

  // ロゴ/画像を表示
  const logoSrc = loadingScreen?.logo || loadingScreen?.image || l?.image || l?.logo;
  arViewerLogger.info('🔍 ローディング画像URL:', logoSrc);

  if (logoSrc){
    const img = document.createElement('img');
    img.src = logoSrc;
    img.alt = 'loading';
    img.style.cssText = 'width:120px;height:auto;filter:drop-shadow(0 6px 18px rgba(0,0,0,.35))';
    box.appendChild(img);
    arViewerLogger.info('✅ ローディング画像を追加:', logoSrc);
  }

  const msg = document.createElement('div');
  msg.textContent = loadingScreen?.message || l?.message || '読み込み中…';
  msg.style.cssText = 'margin-top:12px;color:#fff;font-weight:600';

  // テキスト色を適用
  const textColor = loadingScreen?.textColor || l?.textColor;
  if (textColor) {
    msg.style.color = textColor;
  }

  box.appendChild(msg);

  document.body.appendChild(box);
  arViewerLogger.info('✅ __takeover_loading__ を表示');
  // 少なくとも一瞬は見えるようタイムアウト解除は別で
  setTimeout(()=>box.remove(), 800);
}

function __showGuideUI(project){
  arViewerLogger.info('🔍 __showGuideUI 呼び出し:', { project });

  // extractDesignで正規化されたデータを使用
  const { guideScreen } = extractDesign(project);
  arViewerLogger.info('🔍 正規化されたguideScreen:', guideScreen);

  // 旧形式との互換性のため、両方のパスをチェック
  const g = project?.guide || project?.guideScreen || {};
  arViewerLogger.info('🔍 生のguide設定:', g);

  document.getElementById('__takeover_guide__')?.remove();

  const box = document.createElement('div');
  box.id = '__takeover_guide__';
  box.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;padding:12px;border-radius:12px;background:rgba(0,0,0,.6);color:#fff;display:flex;gap:12px;align-items:center';

  // 背景色を適用
  if (guideScreen?.backgroundColor || g?.backgroundColor) {
    box.style.backgroundColor = guideScreen?.backgroundColor || g?.backgroundColor;
  }

  // マーカー画像を表示（複数のパスをチェック）
  const markerSrc =
    guideScreen?.marker?.src ||
    guideScreen?.markerImage ||
    g?.marker?.src ||
    g?.markerImage ||
    g?.marker?.image;

  arViewerLogger.info('🔍 マーカー画像URL:', markerSrc);

  if (markerSrc){
    const img = document.createElement('img');
    img.src = markerSrc;
    img.alt = 'marker';
    img.style.cssText = 'width:72px;height:auto;border-radius:8px';
    box.appendChild(img);
    arViewerLogger.info('✅ マーカー画像を追加:', markerSrc);
  } else {
    arViewerLogger.warn('⚠️ マーカー画像が見つかりません');
  }

  const msg = document.createElement('div');
  msg.textContent = guideScreen?.message || g?.message || 'マーカーをカメラに写してください';
  msg.style.cssText = 'font-weight:600';

  // テキスト色を適用
  if (guideScreen?.textColor || g?.textColor) {
    msg.style.color = guideScreen?.textColor || g?.textColor;
  }

  box.appendChild(msg);

  document.body.appendChild(box);
  arViewerLogger.info('✅ __takeover_guide__ を表示');
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
    arViewerLogger.error('[FLOW] no project src');
    if (DEV_STRICT_MODE) {
      throw new Error('STRICT MODE: No project src from URL. Built-in sample loading is disabled.');
    }
    return null;
  }

  // キャッシュチェック
  if (typeof window !== 'undefined' && window.__project && window.__projectSrc === projectSrc) {
    arViewerLogger.info('[FLOW] Using cached project');
    return window.__project;
  }

  if (__projectLoadPromise && __projectLoadPromiseSrc === projectSrc) {
    arViewerLogger.info('[FLOW] Reusing in-flight project fetch:', projectSrc);
    return __projectLoadPromise;
  }

  __projectLoadPromiseSrc = projectSrc;
  __projectLoadPromise = (async () => {
    try {
      arViewerLogger.info('[FLOW] Fetching project from:', projectSrc);
      const response = await fetchOnce(projectSrc, { cache: 'no-store' });

      if (!response.ok) {
        arViewerLogger.error('[FLOW] project fetch failed', { status: response.status, statusText: response.statusText });
        if (typeof window !== 'undefined') {
          window.__projectLoadError = {
            status: response.status,
            statusText: response.statusText,
            url: projectSrc
          };
        }
        if (DEV_STRICT_MODE) {
          throw new Error(`STRICT MODE: Project fetch failed (${response.status}). No fallback allowed.`);
        }
        return null;
      }

      // Content-Typeを確認してHTMLレスポンスを検出
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        const text = await response.text();
        arViewerLogger.error('[FLOW] HTMLレスポンスが返されました:', {
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
        arViewerLogger.error('[FLOW] Invalid project.json (not an object)');
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

      arViewerLogger.info('[FLOW] Project loaded successfully');
      return project;
    } catch (error) {
      arViewerLogger.error('[FLOW] project fetch error', error);
      if (DEV_STRICT_MODE) {
        throw error;
      }
      return null;
    } finally {
      __projectLoadPromise = null;
      __projectLoadPromiseSrc = null;
    }
  })();

  return __projectLoadPromise;
}

async function bootFromQR() {
  // ★ 再入禁止ガード
  if (typeof window !== 'undefined' && window.__viewer_booted) {
    arViewerLogger.warn('[BOOT] ⚠️ Duplicate boot attempt blocked');
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
    arViewerLogger.info('[BOOT] projectSrc not found, skipping bootFromQR');
    return;
  }

  try {
    const project = await loadProjectFromQR();
    if (!project) {
      arViewerLogger.error('[FLOW] no project');
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

    arViewerLogger.info('[FLOW] project loaded', project);

    // デザイン適用は initIntegratedARViewer() 内で DOM 生成後に行う。
    // bootFromQR 時点では #webar-ui が未生成のため、ここでの適用はスキップする。
    arViewerLogger.info('[APPLY] Design application deferred to initIntegratedARViewer (DOM not ready yet)');

    // ★ スタートUI乗っ取り（統合UI）はデフォルト無効化
    try {
      if (DEV_TAKEOVER_UI === true) {
        const here = new URLSearchParams(location.search||'');
        let topHas = false; try { topHas = (window.top && window.top!==window) ? new URLSearchParams(window.top.location.search||'').has('__takeoverStartUI') : false; } catch {}
        const active = here.has('__takeoverStartUI') || topHas;
        if (active && typeof __takeoverStartUI === 'function') {
          __takeoverStartUI(project);
        }
      } else {
        arViewerLogger.info('[FLOW] takeover UI disabled by flag');
      }
    } catch (e) {
      arViewerLogger.warn('[FLOW] takeover UI call skipped', e);
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
    arViewerLogger.error('[FLOW] project boot error', error);
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
      arViewerLogger.info('[FLOW] guideMode forced at setup -> marker');
    } catch (e) {
      arViewerLogger.warn('[FLOW] guideMode force at setup skipped', e);
    }
  }
}


function bindStartButtonOnce() {
  arViewerLogger.info('[FLOW] bindStartButtonOnce called');
  arViewerLogger.info('[FLOW] document ready state:', document.readyState);
  arViewerLogger.info('[FLOW] document body:', document.body);
  
  const btn =
    document.querySelector('[data-role="start-button"]') ||
    document.querySelector('#ar-start-cta') ||
    document.querySelector('#startButton') ||
    document.querySelector('button.start') ||
    document.querySelector('button');

  if (!btn) { 
    arViewerLogger.error('[FLOW] start button not found'); 
    arViewerLogger.info('Available buttons:', document.querySelectorAll('button'));
    arViewerLogger.info('Available elements with data-role:', document.querySelectorAll('[data-role]'));
    arViewerLogger.info('Available elements with id containing start:', document.querySelectorAll('[id*="start"]'));
    return; 
  }
  if (btn.__bound) {
    arViewerLogger.info('[FLOW] button already bound');
    return;
  }
  btn.__bound = true;
  btn.addEventListener('click', onStartClick, { once: true });
  arViewerLogger.info('[FLOW] start button bound successfully:', btn);
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
    arViewerLogger.info('[AR] verifying URL:', url);
    const res = await fetchOnce(url, { method: 'GET', mode: 'cors' });
    if (!res.ok) {
      arViewerLogger.warn(`[AR] URL not reachable: ${res.status} ${res.statusText}`);
      return false;
    }
    const ct = res.headers.get('content-type') || '';
    const isImage = ct.includes('image') || /\.(png|jpg|jpeg|gif|webp)$/i.test(url);
    arViewerLogger.info(`[AR] content-type: ${ct}, isImage: ${isImage}`);
    return isImage;
  } catch (error) {
    arViewerLogger.warn('[AR] URL verification failed:', error);
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
    arViewerLogger.warn('[FLOW] type/mode未設定、自動推定を試行');
    
    // マーカー画像の有無をチェック
    const markerCandidates = deepFindMarkerImageUrl(project);
    const hasMarkerImage = markerCandidates.length > 0 && markerCandidates[0]?.url;
    const hasMarkerPattern = !!(project.markerPattern || project.marker?.pattern);
    
    if (hasMarkerImage || hasMarkerPattern) {
      project.type = 'marker';
      arViewerLogger.info('[FLOW] type自動推定: marker（マーカー画像/パターンが存在）');
    } else {
      // デフォルト: markerless（WebXR）
      project.type = 'markerless';
      arViewerLogger.info('[FLOW] type自動推定: markerless（デフォルト）');
    }
  }

  // models の解決: 複数のデータ形式に対応（フォールバック付き）
  if (!project.models || project.models.length === 0) {
    // v2 公開形式 (docs/product-spec.md §7) からフォールバック
    if (project.assets?.models?.length) {
      arViewerLogger.info('[FLOW] project.models が空のため assets.models (v2) を使用');
      project.models = project.assets.models.map((m) => ({
        url: m.url,
        fileName: m.fileName || (m.url ? m.url.split('/').pop() : null),
        transform: m.transform,
        position: m.transform?.position,
        rotation: m.transform?.rotation,
        scale: m.transform?.scale
      }));
    }
    // screens[0].models（Firebase公開形式）からフォールバック
    else if (project.screens?.[0]?.models?.length) {
      arViewerLogger.info('[FLOW] project.models が空のため screens[0].models を使用');
      project.models = project.screens[0].models;
    }
    // modelSettings（エディタ保存形式）からフォールバック
    else if (project.modelSettings?.length) {
      arViewerLogger.info('[FLOW] project.models が空のため modelSettings から構築');
      project.models = project.modelSettings
        .filter(m => m.fileName)
        .map(m => ({
          url: m.fileName,
          fileName: m.fileName,
          transform: m.transform
        }));
    }
  }

  // markerImage / markerPattern も v2 (project.assets.marker.*) からフォールバック
  if (!project.markerImage && project.assets?.marker?.url) {
    project.markerImage = project.assets.marker.url;
  }
  if (!project.markerPattern && project.assets?.marker?.patternUrl) {
    project.markerPattern = project.assets.marker.patternUrl;
  }

  // models の絶対化と検証
  project.models = (project.models || []).map((m, index) => {
    const absoluteUrl = abs(m.url);
    arViewerLogger.info(`🔍 モデル ${index + 1} URL検証:`, {
      original: m.url,
      absolute: absoluteUrl,
      valid: !!absoluteUrl
    });

    if (!absoluteUrl) {
      arViewerLogger.warn(`⚠️ モデル ${index + 1} のURLが無効です:`, m.url);
    }

    return { ...m, url: absoluteUrl };
  });

  // marker 探索
  const candidates = deepFindMarkerImageUrl(project);
  arViewerLogger.info('[FLOW] marker candidates', candidates);
  let picked = candidates[0]?.url || null;
  
  // 古いパスを新しいパスに置き換え
  if (picked && (picked.includes('/assets/marker/default-marker.png') || picked.includes('default-marker.png'))) {
    arViewerLogger.warn('[FLOW] 古いマーカーパスを検出、新しいパスに置き換え:', picked, '->', DEFAULT_MARKER_PATH);
    picked = DEFAULT_MARKER_PATH;
  }
  
  if (picked) picked = abs(picked);

  // typeがmarkerなら必須。見つからなければフォールバックを適用
  const t = project.type || project.mode;
  if (t === 'marker') {
    if (!picked) {
      const fb = abs(DEFAULT_MARKER_PATH);
      arViewerLogger.warn('[FLOW] markerImageUrl not found. fallback ->', fb);
      picked = fb;
    }
    
    // 到達性チェック（フォールバック画像も含めて）
    const ok = await verifyReachable(picked);
    if (!ok) {
      arViewerLogger.warn('[FLOW] primary marker not reachable, trying fallback');
      const fallback = abs(DEFAULT_MARKER_PATH);
      const fallbackOk = await verifyReachable(fallback);
      if (fallbackOk) {
        arViewerLogger.info('[FLOW] using fallback marker');
        picked = fallback;
      } else {
        throw new Error('marker image not reachable (CORS/404): ' + picked + ' (fallback also failed)');
      }
    }
  }

  project.markerImageUrl = picked || null;
  return project;
}

// === 4) onStartClick の先頭付近を差し替え ===
// ★ 再入禁止フラグ（グローバル）
let __onStartClickRunning = false;

async function onStartClick() {
  // ★ 再入禁止ガード
  if (__onStartClickRunning) {
    arViewerLogger.warn('[FLOW] onStartClick already running, ignoring duplicate call');
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
      arViewerLogger.warn('[FLOW] type/mode未設定、normalizeProjectで自動推定されるはず');
    }

    // URL正規化＋marker特定（type自動推定含む）
    try {
      await normalizeProject(project, project.__sourceUrl || location.href);
      arViewerLogger.info('[FLOW] urls resolved', {
        type: project.type || project.mode,
        markerImageUrl: project.markerImageUrl,
        models: (project.models || []).map(m => m.url)
      });
    } catch (e) {
      arViewerLogger.error('[FLOW] normalize failed', e);
      alert('マーカー画像の特定/取得に失敗（URLやCORS設定を確認）');
      return;
    }

    // ここでも念のためガイドを marker に矯正
    forceGuideModeIfMarker(project);

    // デザイン適用とカメラ取得は状態機械パス (handleARStateChange) で行われる。
    // onStartClick は normalizeProject のみ実行し、UI制御は状態機械に委譲する。
    arViewerLogger.info('[FLOW] normalizeProject complete, state machine will handle the rest');
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
    arViewerLogger.info('🔄 3Dモデル読み込み開始:', cfg.url);
    
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
    
    arViewerLogger.info('📄 レスポンス情報:', {
      contentType,
      contentLength,
      status: response.status
    });
    
    // HTMLレスポンスを検出
    if (contentType && contentType.includes('text/html')) {
      const text = await response.text();
      arViewerLogger.error('❌ HTMLレスポンスが返されました:', {
        url: cfg.url,
        contentType,
        preview: text.substring(0, 200)
      });
      throw new Error(`モデルファイルの代わりにHTMLページが返されました。URLが正しくない可能性があります: ${cfg.url}`);
    }
    
    // 小さなファイルサイズの場合はHTMLの可能性が高い
    if (contentLength && parseInt(contentLength) < 1000) {
      arViewerLogger.warn('⚠️ ファイルサイズが小さすぎます（HTMLの可能性）:', contentLength, 'bytes');
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
    
    arViewerLogger.info('✅ 3Dモデル読み込み完了:', cfg.url);
    return obj;
  } catch (error) {
    arViewerLogger.error('❌ 3Dモデル読み込み失敗:', {
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

  // モデル読み込みを個別に処理し、失敗したモデルがあっても他のモデルは読み込む
  const modelPromises = (project.models || []).map(async (modelCfg, index) => {
    try {
      arViewerLogger.info(`🔄 モデル ${index + 1}/${project.models.length} 読み込み開始:`, modelCfg.url);
      const obj = await loadGLB(modelCfg);
      arViewerLogger.info(`✅ モデル ${index + 1} 読み込み完了`);
      return { success: true, obj, index };
    } catch (error) {
      arViewerLogger.error(`❌ モデル ${index + 1} 読み込み失敗:`, {
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
    arViewerLogger.warn(`⚠️ ${failedModels.length}個のモデル読み込みに失敗しました:`, failedModels.map(f => f.url));
    
    // 失敗したモデルの詳細情報を表示
    failedModels.forEach(failed => {
      arViewerLogger.error(`❌ 失敗したモデル ${failed.index + 1}:`, {
        url: failed.url,
        error: failed.error.message
      });
    });
  }
  
  if (successfulModels.length === 0) {
    arViewerLogger.warn('⚠️ すべてのモデル読み込みに失敗、デバッグキューブを追加');
    await addDebugCube();
  } else {
    successfulModels.forEach(o => __anchor.add(o));
  }

  arViewerLogger.info('[AR] models attached', {
    successful: successfulModels.length,
    failed: failedModels.length,
    total: project.models?.length || 0
  });

  // 毎フレーム、検出更新
  startRenderLoop(() => {
    // ARエンジンの更新はARエンジン内部で処理される
  });
}

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
    arViewerLogger.info('[FLOW] guide start button bound');
  }
}

// ガイド画面表示後にボタンをバインド
setTimeout(bindGuideStartButton, 500);

export default function showARViewer(container) {

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
  const forceNormalMaterial = ['normal','n','1','true','yes'].includes((urlParams.get('mat')||'').toLowerCase());

  arViewerLogger.info('[showARViewer] projectSrc:', projectSrc);
  arViewerLogger.info('[showARViewer] URL check:', {
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
      arViewerLogger.info('🧹 早期リターン: クリーンアップ不要');
    };
  }


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
        <div class="guide-header" id="ar-guide-header">
          <div class="guide-title" id="ar-guide-title">読み込み中...</div>
          <div class="guide-description" id="ar-guide-description"></div>
        </div>

        <div class="guide-center-area" id="ar-guide-center">
          <div class="marker-image-container" id="ar-guide-marker-container">
            <img id="ar-guide-image" alt="marker image" style="display:none;" />
            <div class="marker-placeholder-icon" id="ar-guide-marker-placeholder">📷</div>
          </div>
          <div class="marker-label" id="ar-guide-marker-label">マーカー画像</div>
        </div>

        <div class="guide-footer" id="ar-guide-footer">
          <div class="guide-status" id="ar-guide-status">画像を認識しています...</div>
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
      <div id="ar-marker-guide" class="ar-marker-guide" style="display: none;">
        <img id="ar-marker-guide-preview" alt="marker preview" />
      </div>
      <div id="marker-guide-tips" class="marker-guide-tips" style="display: none;">
        マーカー全体が枠に入るように、明るい場所でゆっくり合わせてください
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

    .integrated-ar-viewer.is-ar-active .ar-status {
      display: none;
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
      /* カメラ映像を見せるため背景は完全透明。文字の可読性は各テキストに付ける text-shadow で確保 */
      background: transparent;
      color: #fff;
      padding: 20px;
      box-sizing: border-box;
      z-index: 1100;
      pointer-events: none; /* タップ/ジェスチャはカメラ層に通す */
      --guide-accent: #6c5ce7;
      --guide-text-size: 1;
      --guide-marker-size: 1;
      --guide-text-position: 20%;
      --guide-footer-position: 85%;
    }
    .ar-guide-screen .guide-header,
    .ar-guide-screen .guide-center-area,
    .ar-guide-screen .guide-footer {
      pointer-events: auto;
    }
    .ar-guide-screen .guide-header {
      position: absolute;
      top: var(--guide-text-position);
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
      z-index: 10;
      width: 90%;
    }
    .ar-guide-screen .guide-title {
      font-size: calc(16px * var(--guide-text-size));
      font-weight: bold;
      margin-bottom: 8px;
      text-align: center;
      line-height: 1.3;
      text-shadow: 0 1px 3px rgba(0,0,0,0.5);
      color: inherit;
    }
    .ar-guide-screen .guide-description {
      font-size: calc(12px * var(--guide-text-size));
      line-height: 1.4;
      text-align: center;
      opacity: 0.9;
      text-shadow: 0 1px 3px rgba(0,0,0,0.5);
      color: inherit;
    }
    .ar-guide-screen .guide-center-area {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      z-index: 5;
    }
    .ar-guide-screen .marker-image-container {
      width: calc(var(--guide-marker-width, 180px) * var(--guide-marker-size));
      height: calc(var(--guide-marker-height, 135px) * var(--guide-marker-size));
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px dashed var(--guide-accent);
      border-radius: 12px;
      background: rgba(0,0,0,0.25);
      animation: ar-marker-glow 2s infinite;
      box-sizing: border-box;
    }
    .ar-guide-screen .marker-image-container.has-image {
      border-style: solid;
      background: rgba(255,255,255,0.06);
      backdrop-filter: blur(5px);
      padding: 4px;
    }
    .ar-guide-screen .marker-image-container img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));
      border-radius: 6px;
    }
    .ar-guide-screen .marker-placeholder-icon {
      font-size: calc(48px * var(--guide-marker-size));
      opacity: 0.6;
    }
    .ar-guide-screen .marker-image-container.has-image .marker-placeholder-icon {
      display: none;
    }
    .ar-guide-screen .marker-label {
      margin-top: 8px;
      font-size: 10px;
      opacity: 0.9;
      text-align: center;
      color: inherit;
      text-shadow: 0 1px 3px rgba(0,0,0,0.8);
      animation: ar-status-pulse 3s ease-in-out infinite;
    }
    .ar-guide-screen .guide-footer {
      position: absolute;
      top: var(--guide-footer-position);
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
      z-index: 10;
    }
    .ar-guide-screen .guide-status {
      font-size: 12px;
      opacity: 0.9;
      text-align: center;
      color: inherit;
      text-shadow: 0 1px 3px rgba(0,0,0,0.8);
      animation: ar-status-pulse 3s ease-in-out infinite;
    }
    @keyframes ar-marker-glow {
      0%, 100% {
        border-color: var(--guide-accent);
        box-shadow: 0 0 10px rgba(108, 92, 231, 0.3);
      }
      50% {
        border-color: rgba(108, 92, 231, 0.8);
        box-shadow: 0 0 20px rgba(108, 92, 231, 0.6);
      }
    }
    @keyframes ar-status-pulse {
      0%, 100% { opacity: 0.9; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.98); }
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

    .integrated-ar-viewer.is-ar-active .ar-controls {
      bottom: calc(12px + env(safe-area-inset-bottom, 0px));
      width: min(92vw, 360px);
      max-width: 360px;
      padding: 0.65rem 0.75rem;
      background: rgba(0,0,0,0.55);
      border: 1px solid rgba(255,255,255,0.14);
      backdrop-filter: blur(10px);
      border-radius: 10px;
      box-shadow: none;
    }

    .integrated-ar-viewer.is-ar-active .ar-controls h3 {
      display: none;
    }

    .integrated-ar-viewer.is-ar-active #ar-instruction {
      margin: 0 0 0.45rem;
      font-size: 13px;
      line-height: 1.35;
    }

    .integrated-ar-viewer.is-ar-active #ar-start-btn,
    .integrated-ar-viewer.is-ar-active #ar-detect-btn {
      display: none !important;
    }

    /* ガイド画面/AR中: 戻るボタンを小さく目立たない見た目に */
    .integrated-ar-viewer.is-ar-active #ar-back-btn,
    .ar-guide-screen ~ #ar-controls #ar-back-btn {
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 500;
      margin: 0;
      background: rgba(255,255,255,0.12);
      color: rgba(255,255,255,0.85);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 999px;
      box-shadow: none;
      min-width: 0;
    }
    .integrated-ar-viewer.is-ar-active #ar-back-btn:hover {
      background: rgba(255,255,255,0.2);
    }
    /* ガイド画面表示中: controls パネル自体も最小化 */
    .integrated-ar-viewer:not(.is-ar-active) #ar-controls:has(#ar-instruction[style*="display: none"]) {
      padding: 6px 10px;
      background: rgba(0,0,0,0.45);
      max-width: none;
      width: auto;
      box-shadow: none;
      border: 1px solid rgba(255,255,255,0.14);
      backdrop-filter: blur(8px);
      bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    }
    .integrated-ar-viewer:not(.is-ar-active) #ar-controls:has(#ar-instruction[style*="display: none"]) h3 {
      display: none;
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
      width: min(74vw, 340px);
      height: auto;
      aspect-ratio: var(--marker-guide-aspect, 1 / 1);
      border: 2px solid rgba(255,255,255,0.9);
      outline: 1px solid rgba(0,0,0,0.45);
      border-radius: 10px;
      z-index: 500;
      background: rgba(0,0,0,0.08);
      box-shadow: 0 0 0 999px rgba(0,0,0,0.16), 0 8px 28px rgba(0,0,0,0.18);
      overflow: hidden;
    }

    .ar-marker-guide::before {
      content: "";
      position: absolute;
      inset: 10px;
      border: 1px dashed rgba(255,255,255,0.55);
      border-radius: 7px;
      pointer-events: none;
    }

    .ar-marker-guide::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      box-shadow: inset 0 0 0 1px rgba(0,0,0,0.35);
      pointer-events: none;
    }

    #ar-marker-guide-preview {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: none;
      opacity: 0.32;
      filter: saturate(0.85) contrast(1.05);
    }

    .ar-marker-guide.has-preview #ar-marker-guide-preview {
      display: block;
    }

    .marker-guide-tips {
      position: absolute;
      bottom: calc(92px + env(safe-area-inset-bottom, 0px));
      left: 50%;
      transform: translateX(-50%);
      width: min(88vw, 360px);
      box-sizing: border-box;
      background: rgba(0, 0, 0, 0.58);
      color: white;
      padding: 9px 12px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.12);
      font-size: 12px;
      text-align: center;
      z-index: 490;
      line-height: 1.45;
      backdrop-filter: blur(10px);
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


  // ★ 統一されたボタンバインド処理（二重バインド防止・再入禁止）
  const bindStartButtonOnce = () => {
    // 複数セレクタでボタンを検索（優先順）
    const startCTA = container.querySelector('#ar-start-cta') || 
                     container.querySelector('[data-role="start-button"]') ||
                     container.querySelector('#ar-start-button');
    
    if (!startCTA) {
      arViewerLogger.warn('[FLOW] start button not found yet');
      return false; // 未発見
    }
    
    if (startCTA.__bound) {
      arViewerLogger.info('[FLOW] start button already bound, skipping');
      return true; // 既にバインド済み
    }
    
    // バインド実行
    startCTA.addEventListener('click', () => {
      arViewerLogger.info('[FLOW] #ar-start-cta clicked, forwarding to #ar-start-btn');
      const sb = container.querySelector('#ar-start-btn');
      if (sb) {
        sb.click();
      } else {
        arViewerLogger.warn('[FLOW] #ar-start-btn not found');
      }
    }, { once: true });
    
    startCTA.__bound = true;
    arViewerLogger.info('[FLOW] start button bound successfully:', startCTA.id || startCTA.getAttribute('data-role'));
    return true; // バインド成功
  };

  const showBootError = (message, detail = {}) => {
    const status = container.querySelector('#ar-status-text');
    if (status) {
      status.textContent = `エラー: ${message}`;
      status.className = 'error';
    }

    const instruction = container.querySelector('#ar-instruction');
    if (instruction) {
      instruction.textContent = 'project.json を読み込めませんでした。公開URL、Blob公開、またはモデル容量を確認してください。';
    }

    const controls = container.querySelector('.controls-content');
    if (controls && !container.querySelector('#viewer-boot-error-details')) {
      const details = document.createElement('details');
      details.id = 'viewer-boot-error-details';
      details.style.cssText = 'margin-top:8px;text-align:left;font-size:11px;color:#ddd;';

      const summary = document.createElement('summary');
      summary.textContent = '診断情報';
      summary.style.cursor = 'pointer';

      const pre = document.createElement('pre');
      pre.style.cssText = 'white-space:pre-wrap;word-break:break-word;background:rgba(255,255,255,.08);padding:8px;border-radius:6px;';
      pre.textContent = JSON.stringify({
        projectSrc,
        href: window.location.href,
        message,
        ...detail
      }, null, 2);

      details.appendChild(summary);
      details.appendChild(pre);
      controls.appendChild(details);
    }
  };

  let viewerInitStarted = false;

  // ARビューア初期化（機能フラグを渡す）
  // bootFromQR が失敗しても黒画面で止めず、このビュー側で再取得して診断を出す。
  const initARViewerWhenReady = async (event) => {
    if (viewerInitStarted) return;
    viewerInitStarted = true;

    if (event?.detail?.project && typeof window !== 'undefined') {
      window.__project = event.detail.project;
      window.__projectSrc = getProjectSrc();
      window.__bootFromQR_completed = true;
    }

    if (!window.__project) {
      try {
        const project = await loadProjectFromQR();
        if (project && typeof window !== 'undefined') {
          window.__project = project;
          window.__projectSrc = getProjectSrc();
          window.__bootFromQR_completed = true;
        }
      } catch (error) {
        arViewerLogger.error('[FLOW] viewer self boot failed', error);
        showBootError(error.message || 'project.json の取得に失敗しました', { stack: error.stack });
        viewerInitStarted = false;
        return;
      }
    }

    if (!window.__project) {
      const loadError = typeof window !== 'undefined' ? window.__projectLoadError : null;
      const detail = loadError
        ? { fetchStatus: loadError.status, fetchUrl: loadError.url }
        : {};
      const message = loadError?.status === 404
        ? 'project.json が見つかりません（404）。PCでQRモーダルを開き直すか、保存後にもう一度お試しください。'
        : 'project.json を読み込めませんでした';
      showBootError(message, detail);
      viewerInitStarted = false;
      return;
    }

    container.querySelector('#viewer-boot-error-details')?.remove();
    initIntegratedARViewer(container, projectSrc, { enableLSFlag, forceNormalMaterial, engineOverride });
  };

  window.addEventListener('bootFromQRCompleted', initARViewerWhenReady, { once: true });
  initARViewerWhenReady();
  
  // HTML生成直後にボタンのバインドを試行（1回目）
  setTimeout(() => {
    if (!bindStartButtonOnce()) {
      arViewerLogger.info('[FLOW] early binding failed, will retry via observer');
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
  arViewerLogger.info('[🚀 initIntegratedARViewer] 開始:', { projectSrc, options });
  arViewerLogger.info('ARビューア初期化開始:', { projectSrc, options });
  const { enableLSFlag = false, forceNormalMaterial = false, engineOverride = null } = options;
  const loadingScreen = container.querySelector('#ar-loading-screen');
  const loadingBar = container.querySelector('#ar-loading-bar');
  const loadingProgressWrap = container.querySelector('.ar-loading-progress');
  const loadingMessage = container.querySelector('#ar-loading-message');
  const loadingLogo = container.querySelector('#ar-loading-logo');
  const loadingTextGroup = container.querySelector('#ar-loading-text-group');
  const viewerRoot = container.querySelector('#webar-ui');
  const startScreen = container.querySelector('#ar-start-screen');
  const startLogo = container.querySelector('#ar-start-logo');
  const startTitle = container.querySelector('#ar-start-title');
  const startCTA = container.querySelector('#ar-start-cta');
  const guideScreen = container.querySelector('#ar-guide-screen');
  const guideImage = container.querySelector('#ar-guide-image');
  const guideTitle = container.querySelector('#ar-guide-title');
  const guideDescription = container.querySelector('#ar-guide-description');
  const guideMarkerContainer = container.querySelector('#ar-guide-marker-container');
  const guideMarkerLabel = container.querySelector('#ar-guide-marker-label');
  const guideStatus = container.querySelector('#ar-guide-status');
  const guideCenterArea = container.querySelector('#ar-guide-center');
  const arHost = container.querySelector('#ar-host');
  const statusText = container.querySelector('#ar-status-text');
  const instruction = container.querySelector('#ar-instruction');
  const startBtn = container.querySelector('#ar-start-btn');
  const detectBtn = container.querySelector('#ar-detect-btn');

  // ★★★ スタート画面レイアウト処理を関数化 ★★★
  let layoutStartScreenHandler = null;
  const backBtn = container.querySelector('#ar-back-btn');
  const markerGuide = container.querySelector('#ar-marker-guide');
  const markerGuidePreview = container.querySelector('#ar-marker-guide-preview');
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
  let hasConfiguredLoadingScreen = false;
  let hasConfiguredGuideScreen = false;

  function resolveViewerAssetUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    try {
      if (/^(https?:|blob:|data:)/i.test(rawUrl)) return rawUrl;
      if (rawUrl.startsWith('/')) return new URL(rawUrl, location.origin).href;
      const baseUrl = currentProject?.__sourceUrl || location.href;
      const projectFolder = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
      return new URL(rawUrl, projectFolder).href;
    } catch (_) {
      return rawUrl;
    }
  }

  function getMarkerPreviewUrl(project = {}) {
    const { guideScreen } = extractDesign(project);
    return guideScreen?.marker?.src
      || guideScreen?.markerImage
      || project.markerImageUrl
      || project.markerImage
      || project.marker?.src
      || project.marker?.url
      || project.guide?.marker?.src
      || project.guide?.markerImage
      || project.guideScreen?.marker?.src
      || project.guideScreen?.markerImage
      || null;
  }

  function configureDefaultMarkerGuide(project = {}) {
    if (!markerGuide || !markerGuidePreview) return;

    const markerUrl = resolveViewerAssetUrl(getMarkerPreviewUrl(project));
    markerGuide.classList.remove('has-preview');
    markerGuide.style.removeProperty('--marker-guide-aspect');
    markerGuidePreview.removeAttribute('src');

    if (!markerUrl) return;

    markerGuidePreview.onload = () => {
      const w = markerGuidePreview.naturalWidth || 1;
      const h = markerGuidePreview.naturalHeight || 1;
      markerGuide.style.setProperty('--marker-guide-aspect', `${w} / ${h}`);
      markerGuide.classList.add('has-preview');
    };
    markerGuidePreview.onerror = () => {
      markerGuide.classList.remove('has-preview');
      markerGuide.style.removeProperty('--marker-guide-aspect');
    };
    markerGuidePreview.src = markerUrl;
  }

  async function showScreen(state, options = {}) {
    if (currentScreenState === state && !options.force) {
      arViewerLogger.info(`⚠️ 画面状態は既に ${state} です`);
      return;
    }

    arViewerLogger.info(`🔄 画面状態を ${currentScreenState || 'null'} から ${state || 'null'} に変更`);
    arViewerLogger.info(`🔍 showScreen呼び出し詳細:`, {
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
    if (viewerRoot) {
      const active = state === screenStates.AR || state === null;
      viewerRoot.classList.toggle('is-ar-active', active);
      viewerRoot.classList.toggle('is-viewer-error', state === screenStates.ERROR);
    }

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
              arViewerLogger.info('[APPLY] screen=start applied');
            } catch (e) { 
              arViewerLogger.error('[APPLY] start pre-apply error', e); 
            }
            // 2) 描画確定後にもう一度適用
            requestAnimationFrame(() => {
              try { 
                applyProjectDesign(window.__project, { screen: 'start' }); 
                arViewerLogger.info('[APPLY] screen=start rAF applied');
              } catch (e) { 
                arViewerLogger.error('[APPLY] start rAF-apply error', e); 
              }
            });
          }
          startScreen.style.display = 'flex';
          arViewerLogger.info('✅ スタート画面を表示');
          arViewerLogger.info('🔍 表示後の確認:', {
            display: startScreen.style.display,
            computedDisplay: window.getComputedStyle(startScreen).display,
            visibility: window.getComputedStyle(startScreen).visibility
          });
        } else {
          arViewerLogger.error('❌ startScreen要素が見つかりません');
        }
        break;

      case screenStates.LOADING:
        if (!hasConfiguredLoadingScreen && !isCustomLoadingConfig(options.settings)) {
          arViewerLogger.info('ℹ️ ローディング画面未設定のため全画面ローディングをスキップ');
          break;
        }
        if (loadingScreen) {
          if (window.__project) {
            try { 
              await applyProjectDesign(window.__project, { screen: 'loading' }); 
              arViewerLogger.info('[APPLY] screen=loading applied');
            } catch (e) { 
              arViewerLogger.error('[APPLY] loading pre-apply error', e); 
            }
            requestAnimationFrame(() => {
              try { 
                applyProjectDesign(window.__project, { screen: 'loading' }); 
                arViewerLogger.info('[APPLY] screen=loading rAF applied');
              } catch (e) { 
                arViewerLogger.error('[APPLY] loading rAF-apply error', e); 
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
          arViewerLogger.info('✅ ローディング画面を表示');
          arViewerLogger.info('🔍 表示後の確認:', {
            display: loadingScreen.style.display,
            computedDisplay: window.getComputedStyle(loadingScreen).display,
            zIndex: window.getComputedStyle(loadingScreen).zIndex
          });
        } else {
          arViewerLogger.error('❌ loadingScreen要素が見つかりません');
        }
        break;

      case screenStates.GUIDE:
        if ((currentProject?.type || currentProject?.mode) === 'marker' && !hasConfiguredGuideScreen) {
          arViewerLogger.info('ℹ️ ガイド画面未設定のため全画面ガイドをスキップ');
          break;
        }
        if (guideScreen) {
          if (window.__project) {
            try { 
              await applyProjectDesign(window.__project, { screen: 'guide' }); 
              arViewerLogger.info('[APPLY] screen=guide applied');
            } catch (e) { 
              arViewerLogger.error('[APPLY] guide pre-apply error', e); 
            }
            requestAnimationFrame(() => {
              try { 
                applyProjectDesign(window.__project, { screen: 'guide' }); 
                arViewerLogger.info('[APPLY] screen=guide rAF applied');
              } catch (e) { 
                arViewerLogger.error('[APPLY] guide rAF-apply error', e); 
              }
            });
          }
          guideScreen.style.display = 'flex';
          // ガイド画面の status footer がスキャン案内を担うため、下部 controls の指示文は隠す。
          // 戻るボタンは残す。
          if (instruction) instruction.style.display = 'none';
          // GUIDE 状態でもカメラ層 (#ar-host) は明示的に表示しておく
          // （AR.js がカメラ映像を arHost に挿入するため、ガイドの背面で見えている必要がある）
          if (arHost) {
            arHost.style.display = 'block';
            arHost.style.visibility = 'visible';
            arHost.style.zIndex = '1';
          }
          arViewerLogger.info('✅ ガイド画面を表示');
          arViewerLogger.info('🔍 表示後の確認:', {
            display: guideScreen.style.display,
            computedDisplay: window.getComputedStyle(guideScreen).display,
            visibility: window.getComputedStyle(guideScreen).visibility
          });
        } else {
          arViewerLogger.error('❌ guideScreen要素が見つかりません');
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
          // カスタムガイドが status footer で案内を担うので、controls 指示文は隠す
          if (instruction) instruction.style.display = 'none';
          arViewerLogger.info('✅ カスタムガイドを表示（AR実行中の案内として使用）');
        } else {
          // 既定ガイド。マーカー画像があれば縦横比に合わせる。
          configureDefaultMarkerGuide(currentProject);
          let arDisplayed = false;
          if (markerGuide) { markerGuide.style.display = 'block'; arDisplayed = true; }
          if (markerGuideTips) { markerGuideTips.style.display = 'block'; arDisplayed = true; }
          if (instruction) instruction.style.display = '';
          if (arDisplayed) {
            arViewerLogger.info('✅ 既定ガイドを表示');
          } else {
            arViewerLogger.warn('⚠️ AR画面要素が見つかりません');
          }
        }
        arViewerLogger.info('✅ AR画面を表示（他の画面を非表示）');
        break;

      case screenStates.ERROR:
        if (guideScreen) {
          guideScreen.style.display = 'flex';
          arViewerLogger.info('✅ エラー時ガイド画面を表示');
        } else {
          arViewerLogger.error('❌ エラー時にguideScreen要素が見つかりません');
        }
        break;

      case null:
        // 全画面非表示（ARコンテンツ表示時）
        arViewerLogger.info('✅ 全画面を非表示（ARコンテンツ表示）');
        break;

      default:
        arViewerLogger.warn(`⚠️ 不明な画面状態: ${state}`);
        break;
    }
  }

  function showLoadingScreenOverlay(settings) {
    showScreen(screenStates.LOADING, { force: true, settings });
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
      arViewerLogger.warn('⚠️ ローディング画面適用中の警告:', error);
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
    
    // ローディング画面のリセット
    if (loadingScreen) {
      loadingScreen.style.backgroundColor = '';
      loadingScreen.style.background = '';
      loadingScreen.style.color = '';
      loadingScreen.style.display = 'none';
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

    if (guideMarkerContainer) {
      guideMarkerContainer.classList.remove('has-image');
    }

    if (startCTA) {
      startCTA.style.backgroundColor = '';
      startCTA.style.background = '';
      startCTA.style.color = '';
      startCTA.textContent = '開始';
      startCTA.onclick = null;
    }

  }

  function updateStatus(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    
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
    // HTMLは描画せず、既存呼び出しの <strong>/<br> だけ読みやすいテキストに落とす。
    instruction.style.whiteSpace = 'pre-line';
    instruction.textContent = String(text || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?strong>/gi, '')
      .replace(/<[^>]*>/g, '');
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
      arViewerLogger.info('🗂️ bootFromQR で取得済みのプロジェクトを使用');
    } else {
      arViewerLogger.error('[FLOW] ❌ プロジェクトが bootFromQR で読み込まれていません');
      throw new Error('Project not loaded by bootFromQR. Check initialization flow.');
    }
    
    
    if (currentProject && typeof currentProject === 'object') {
      currentProject.__sourceUrl = currentProject.__sourceUrl || projectSrc || (typeof location !== 'undefined' ? location.href : '');
      try {
        currentProject = await normalizeProject(currentProject, currentProject.__sourceUrl || projectSrc || location.href);
        forceGuideModeIfMarker(currentProject);
        if (typeof window !== 'undefined') {
          window.__project = currentProject;
          window.__projectSrc = projectSrc || getProjectSrc();
        }
        arViewerLogger.info('[FLOW] project normalized before viewer setup', {
          type: currentProject.type || currentProject.mode,
          markerImageUrl: currentProject.markerImageUrl,
          models: (currentProject.models || []).map(m => m.url)
        });
      } catch (normalizeError) {
        arViewerLogger.error('[FLOW] project normalize failed before viewer setup', normalizeError);
        throw normalizeError;
      }
    }
    hasConfiguredLoadingScreen = hasCustomLoadingScreen(currentProject);
    hasConfiguredGuideScreen = hasCustomGuideScreen(currentProject);
    configureDefaultMarkerGuide(currentProject);
    arViewerLogger.info('🔍 画面設定有無:', {
      loading: hasConfiguredLoadingScreen,
      guide: hasConfiguredGuideScreen
    });
    updateStatus('✅ プロジェクトデータ取得完了', 'success');
    updateProgress(30, 'プロジェクト設定を確認中...');


    // =====================================================
    // 画面設定の構築
    // 優先順位（高→低）:
    //   1. editorSettings（ユーザーがエディタで明示的に変更した値）
    //   2. templateSettings（選択されたテンプレートの設定）
    //   3. extractDesign（正規化されたプロジェクトデザイン）
    //   4. プロジェクト直下の生データ（startScreen/loadingScreen/guideScreen）
    //   5. デフォルト値（真っ白画面の防止）
    // 全レイヤーで { ...低優先, ...高優先 } の一貫したパターンを使用。
    // =====================================================

    // --- Layer 0: デフォルト値 ---
    const defaultStartScreen = {
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
    const defaultLoadingScreen = {
      backgroundColor: '#1a1a1a',
      textColor: '#ffffff',
      progressColor: '#4CAF50',
      message: 'ARコンテンツを準備中...',
      showProgress: true
    };

    // --- Layer 1: プロジェクト直下の生データ ---
    let ss = { ...defaultStartScreen, ...(currentProject.startScreen || {}) };
    let ls = { ...defaultLoadingScreen, ...(currentProject.loadingScreen || {}) };
    let gs = { ...(currentProject.guideScreen || {}) };

    // --- Layer 2: extractDesign による正規化 ---
    try {
      const design = extractDesign(currentProject);
      if (design.startScreen)  ss = { ...ss, ...design.startScreen };
      if (design.loadingScreen) ls = { ...ls, ...design.loadingScreen };
      if (design.guideScreen)  gs = { ...gs, ...design.guideScreen };

    } catch (e) {
      arViewerLogger.warn('⚠️ extractDesign failed (fallback to raw project blocks):', e?.message || e);
    }

    // --- Layer 3: templateSettings（テンプレート選択による設定）---
    const templateSettings = ls.templateSettings || null;
    if (templateSettings) {
      if (templateSettings.startScreen)  ss = { ...ss, ...templateSettings.startScreen };
      if (templateSettings.loadingScreen) ls = { ...ls, ...templateSettings.loadingScreen };
      if (templateSettings.guideScreen) {
        const tgs = templateSettings.guideScreen;
        gs = { ...gs, ...tgs };
        if (tgs.surfaceDetection) gs.surfaceDetection = { ...(gs.surfaceDetection || {}), ...tgs.surfaceDetection };
        if (tgs.worldTracking)    gs.worldTracking = { ...(gs.worldTracking || {}), ...tgs.worldTracking };
      }

    }

    // --- Layer 4: editorSettings（ユーザー明示設定 - 最高優先度）---
    const editorSettings = ls.editorSettings || null;
    if (editorSettings) {
      if (editorSettings.startScreen)  ss = { ...ss, ...editorSettings.startScreen };
      if (editorSettings.loadingScreen) ls = { ...ls, ...editorSettings.loadingScreen };
      if (editorSettings.guideScreen) {
        const eg = editorSettings.guideScreen;
        gs = { ...gs, ...eg };
        if (eg.surfaceDetection) gs.surfaceDetection = { ...(gs.surfaceDetection || {}), ...eg.surfaceDetection };
        if (eg.worldTracking)    gs.worldTracking = { ...(gs.worldTracking || {}), ...eg.worldTracking };
      }

    }

    // --- Layer 5: localStorage補完（?ls=on のときのみ、不足分を補完）---
    try {
      if (enableLSFlag === true) {
        const editorLocal = localStorage.getItem('loadingScreenSettings');
        if (editorLocal) {
          const localSettings = JSON.parse(editorLocal);
          // { ...localStorage, ...既存 } で既存値を壊さず不足分のみ補完
          if (localSettings.startScreen)  ss = { ...localSettings.startScreen, ...ss };
          if (localSettings.loadingScreen) ls = { ...localSettings.loadingScreen, ...ls };
          if (localSettings.guideScreen)  gs = { ...localSettings.guideScreen, ...gs };

        }
      }
    } catch (e) {
      arViewerLogger.warn('⚠️ editor local settings の適用に失敗:', e);
    }

    // --- 統合システムによる不足分補完（オプショナル）---
    try {
      const { applyProjectLoadingSettings } = await import('../utils/loading-screen-state.js');
      const { mergeLoadingSettings } = await import('../utils/unified-loading-screen.js');
      const viewerSettings = applyProjectLoadingSettings(currentProject);
      const mergedSettings = mergeLoadingSettings(currentProject, viewerSettings);
      // 不足分のみ補完: { ...unified, ...既存 }
      if (mergedSettings.loadingScreen) ls = { ...mergedSettings.loadingScreen, ...ls };
      if (mergedSettings.startScreen)   ss = { ...mergedSettings.startScreen, ...ss };
      if (mergedSettings.guideScreen)   gs = { ...mergedSettings.guideScreen, ...gs };
    } catch (error) {
      arViewerLogger.warn('統合システムの適用に失敗（継続）:', error);
    }
    
    // editorSettings は Layer 4 で既に定義済み

    if (ls) {
      
      // templateSettingsが存在しない場合はlocalStorageからの補完を常に試行（色があっても詳細が欠けている可能性があるため）
      if (ls.selectedScreenId && !ls.templateSettings) {
        try {
          const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
          if (stored) {
            const templates = JSON.parse(stored);
            const template = templates.find(t => t.id === ls.selectedScreenId);
            if (template?.settings) {
              // ローディング画面設定を補完
              if (template.settings.loadingScreen) {
                ls = { ...template.settings.loadingScreen, ...ls };
              }
              
              // スタート画面設定を補完
              if (template.settings.startScreen) {
                ss = { ...template.settings.startScreen, ...ss };
              }
              
              // ガイド画面設定を補完
              if (template.settings.guideScreen) {
                currentProject.guideScreen = { ...template.settings.guideScreen, ...(currentProject.guideScreen || {}) };
              }
            }
          }
        } catch (e) {
          arViewerLogger.warn('⚠️ localStorage補完失敗（プロジェクト設定を使用）:', e);
        }
      } else {
      }
    }
    
    if (ls) {

      const loadingTitle = container.querySelector('#ar-loading-title');
      const loadingMessage = container.querySelector('#ar-loading-message');

      // editorSettings の補完は Layer 4 で完了済み

      // メッセージ適用（小さめの説明文）
      if (ls.loadingMessage && loadingMessage) {
        loadingMessage.textContent = ls.loadingMessage;
      } else if (ls.message && loadingMessage) {
        loadingMessage.textContent = ls.message;
      }

      // 背景色適用
      if (ls.backgroundColor && loadingScreen) {
        loadingScreen.style.backgroundColor = ls.backgroundColor;
        loadingScreen.style.background = ls.backgroundColor;
      }

      // テキスト色適用
      if (ls.textColor) {
        if (loadingTitle) loadingTitle.style.color = ls.textColor;
        if (loadingMessage) loadingMessage.style.color = ls.textColor;
      }

      // プログレス色適用（accentColorもしくはprogressColor）
      const progressColor = ls.progressColor || ls.accentColor;
      if (progressColor && loadingBar) {
        loadingBar.style.backgroundColor = progressColor;
        loadingBar.style.background = progressColor;
      }

      // プログレスバー表示制御
      if (ls.showProgress === false && loadingBar) {
        loadingBar.style.display = 'none';
        // 既存デザイン保護のため、ラッパー非表示はフラグ時のみ
        if (enableLSFlag && loadingProgressWrap) {
          loadingProgressWrap.style.display = 'none';
        }
      }

      // ブランド/サブタイトル適用（大きめの見出し）
      if (ls.brandName && loadingTitle) {
        loadingTitle.textContent = ls.brandName;
      } else if (ls.subTitle && loadingTitle) {
        loadingTitle.textContent = ls.subTitle;
      }

      // フォントスケール適用
      if (ls.fontScale && loadingTitle) {
        const scale = Math.max(0.5, Math.min(2.0, ls.fontScale));
        loadingTitle.style.fontSize = `${scale}em`;
        if (loadingMessage) loadingMessage.style.fontSize = `${scale * 0.8}em`;
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
        }
      } catch (e) {
        arViewerLogger.warn('⚠️ ロゴ適用失敗:', e);
      }

      // テキスト位置（上から%）
      try {
        const textPos = (typeof ls.textPosition === 'number') ? Math.max(5, Math.min(90, ls.textPosition)) : 40;
        if (loadingTextGroup) loadingTextGroup.style.top = `${textPos}%`;
      } catch (_) {}
    } else {
      // リセット関数により既にデフォルト状態が設定されているので、追加の処理は不要
    }

    // マーカー型はMarkerAR側でモデルを読むため、事前ロードを省略
    const isMarker = (currentProject.type || 'markerless') === 'marker';
    if (!isMarker) {
      updateProgress(50, '3Dモデルを読み込み中...');
      // ローディング画面をしばらく表示してカスタマイズを確認可能にする
      await new Promise(resolve => setTimeout(resolve, 800));
      if (currentProject.models && currentProject.models.length > 0) {
        try {
          // タイムアウト付きでモデル読み込み（最大30秒）
          await Promise.race([
            loadModels(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('モデル読み込みタイムアウト')), 30000))
          ]);
        } catch (e) {
          arViewerLogger.error('❌ モデル読み込みエラー（続行します）:', e);
          updateStatus('⚠️ モデルの読み込みに時間がかかっていますが、続行します', 'warning');
          // エラーでも続行させる
        }
      }
    } else {
      updateProgress(60, 'カメラ起動の準備中...');
      // マーカーモードもローディング画面のカスタマイズを確認できるよう最低表示時間を確保
      await new Promise(resolve => setTimeout(resolve, 800));
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
          return;
        }


        // スタート画面を表示
        showScreen(screenStates.START);

        // 背景
        if (ss.backgroundColor && startScreen) {
          startScreen.style.setProperty('background', ss.backgroundColor, 'important');

        } else {
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


        } else {
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

        } else {
        }
      }
      
      // ★★★ レイアウト関数終了とイベント設定 ★★★
      }
      
      // 設定マージは初期構築セクション（Layer 0-5）で一貫した優先順位で完了済み。
      // 重複する再マージは削除（旧「最終補正」「最終確定」ブロック）。

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
        arViewerLogger.info('🔍 ローディング画面を初期状態で非表示に設定');
      }
      if (startBtn) {
        startBtn.style.display = 'none';
      }
      if (startCTA) {
        startCTA.setAttribute('data-role', 'start-button');
      }
      // HTML生成後にスタートボタンのイベントをバインド
      // 注意: onStartClick（旧パス）は状態機械と競合するため使用しない。
      // bindStartButtonOnce() が #ar-start-cta → #ar-start-btn への転送を担当し、
      // #ar-start-btn のクリックで状態機械が起動する。
      setTimeout(() => {
        bindStartButtonOnce();
      }, 100); // DOM更新を待つ
      updateInstruction(`<strong>✅ ${safeName} 読み込み完了</strong><br>「開始」を押して体験を始めてください`);
    } catch (e) {
      // フォールバック（従来）
      const safeName = escapeHTML(currentProject.name || 'ARプロジェクト');
      updateInstruction(`<strong>✅ ${safeName} 読み込み完了</strong><br>画面の「AR開始」を押して体験を始めてください`);
      startBtn.style.display = 'inline-block';
      // フォールバック: 状態機械パスを使用（onStartClick は競合するため不使用）
      setTimeout(() => {
        bindStartButtonOnce();
      }, 100);
    }

      // ガイド画面の設定を準備（AR開始時に表示）
    try {
      // 文字色 / アクセントカラー
      // 注意: backgroundColor はカメラ映像を覆い隠してしまうため、ガイド画面では適用しない。
      // 背景は CSS 側の半透明 radial-gradient（中央透過）で表現する。
      if (guideScreen) {
        if (gs.textColor) guideScreen.style.color = gs.textColor;
        if (gs.accentColor) guideScreen.style.setProperty('--guide-accent', gs.accentColor);
      }

      // ガイド画面のモード判定（surface/world）
      const guideMode = gs.mode || (currentProject.type === 'marker' ? 'marker' : 'world');
      const abs = (u) => { try { return new URL(u, currentProject.__sourceUrl || (typeof location!== 'undefined' ? location.href : undefined)).href; } catch { return u; } };

      // ガイド画面に表示する画像は、プロジェクト編集画面（ARエディタ）で
      // アップロードした markerImage を唯一のソースとする。
      const projectMarkerImage = currentProject.markerImage || currentProject.markerImageUrl || null;

      // モード別の設定（surfaceDetection / worldTracking）
      const surface = gs.surfaceDetection || gs.markerGuide || {};
      const world = gs.worldTracking || {};
      const modeSettings = guideMode === 'marker' ? surface : world;

      // テキスト位置・サイズ・フッター位置を CSS変数経由で反映
      if (guideScreen) {
        const textPos = modeSettings.textPosition ?? 20;
        const textSize = modeSettings.textSize ?? 1.0;
        const footerPos = modeSettings.footerPosition ?? 85;
        guideScreen.style.setProperty('--guide-text-position', `${textPos}%`);
        guideScreen.style.setProperty('--guide-text-size', String(textSize));
        guideScreen.style.setProperty('--guide-footer-position', `${footerPos}%`);
      }

      if (guideMode === 'marker') {
        // マーカー用ガイド: タイトル/説明はエディタが編集する surfaceDetection を最優先。
        const guideTitleText = surface.title || gs.title || 'マーカーをカメラに写してください';
        const guideDescText = surface.description || gs.description || 'マーカー画像を画面内に収めてください';
        if (guideTitle) guideTitle.textContent = guideTitleText;
        if (guideDescription) guideDescription.textContent = guideDescText;

        // マーカーサイズ
        if (guideScreen) {
          guideScreen.style.setProperty('--guide-marker-size', String(surface.markerSize ?? 1.0));
        }

        // マーカー画像の縦横比に合わせてコンテナサイズを動的調整。
        // エディタープレビュー (preview.js) と同様のロジックを移植し、
        // 一流の WebAR アプリらしい存在感のあるサイズ（最大280px）にする。
        const applyMarkerContainerSize = (naturalW, naturalH) => {
          if (!guideMarkerContainer) return;
          const maxSize = 280;
          const minSize = 140;
          let w, h;
          if (!naturalW || !naturalH) {
            w = 220; h = 165;
          } else {
            const ratio = naturalW / naturalH;
            if (ratio > 1.5) {
              w = maxSize; h = Math.max(minSize, maxSize / ratio);
            } else if (ratio < 0.7) {
              h = maxSize; w = Math.max(minSize, maxSize * ratio);
            } else {
              const base = 220;
              if (ratio >= 1) { w = base; h = base / ratio; }
              else { h = base; w = base * ratio; }
            }
          }
          guideMarkerContainer.style.setProperty('--guide-marker-width', `${Math.round(w)}px`);
          guideMarkerContainer.style.setProperty('--guide-marker-height', `${Math.round(h)}px`);
        };

        // マーカー画像 or プレースホルダー
        if (projectMarkerImage && guideImage && guideMarkerContainer) {
          // 画像セット前に既存onloadを解除
          guideImage.onload = null;
          guideImage.onerror = null;
          guideImage.style.display = 'block';
          guideMarkerContainer.classList.add('has-image');
          hasCustomMarkerGuide = true;
          if (markerGuideTips) markerGuideTips.style.display = 'none';

          // 既にキャッシュ済みで naturalWidth が取れるなら即適用、なければ onload で
          guideImage.onload = () => applyMarkerContainerSize(guideImage.naturalWidth, guideImage.naturalHeight);
          guideImage.onerror = () => applyMarkerContainerSize(0, 0);
          guideImage.src = abs(projectMarkerImage);
          if (guideImage.complete && guideImage.naturalWidth) {
            applyMarkerContainerSize(guideImage.naturalWidth, guideImage.naturalHeight);
          }
        } else if (guideImage && guideMarkerContainer) {
          guideImage.style.display = 'none';
          guideMarkerContainer.classList.remove('has-image');
          // プレースホルダー時は正方形気味
          applyMarkerContainerSize(0, 0);
        }

        // フッター（"画像を認識しています..."）
        if (guideStatus) {
          guideStatus.textContent = surface.instructionText || '画像を認識しています...';
        }

        // マーカーラベル・中央エリアを表示
        if (guideCenterArea) guideCenterArea.style.display = 'flex';
        if (guideMarkerLabel) guideMarkerLabel.style.display = '';
      } else if (guideMode === 'world') {
        // 空間検出モード: タイトル/説明はエディタの worldTracking を最優先。
        if (guideTitle) guideTitle.textContent = world.title || gs.title || '画面をタップしてください';
        if (guideDescription) guideDescription.textContent = world.description || gs.description || '平らな面を見つけて画面をタップしてください';

        // 空間検出にはマーカー画像不要。中央エリアとマーカーラベルを非表示。
        if (guideCenterArea) guideCenterArea.style.display = 'none';

        // フッター（"平面を検出中..."）
        if (guideStatus) {
          guideStatus.textContent = world.instructionText || '平面を検出中...';
        }
      }

    } catch (guideError) {
      arViewerLogger.warn('⚠️ ガイド画面設定エラー:', guideError);
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
  let effectsRuntime = null;
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
          arViewerLogger.info(`📊 ローディング状態: ${oldState} → ${newState}`, data);
          // updateStatus関数との互換性のため、直接UI更新
          updateStatus(data.message, data.type);
        }
      });
    }

    arStateMachine = createARStateMachine({
      onStateChange: async (newState, oldState, data) => {
        arViewerLogger.info(`🔄 AR状態変更: ${oldState} → ${newState}`, data);
        await handleARStateChange(newState, oldState, data);
      },
      onError: async (error, previousState, data) => {
        arViewerLogger.error('❌ AR状態機械エラー:', error, { previousState, data });
        handleARError(error, previousState, data);
      },
      defaultTimeout: 30000
    });
  }

  // AR開始（ユーザー操作起点・状態機械制御）
  startBtn.addEventListener('click', async () => {
    arViewerLogger.info('🚀 AR開始ボタンが押されました');

    // 状態機械初期化
    initializeARStateMachine();

    // 現在の状態確認
    const currentState = arStateMachine.getState();
    arViewerLogger.info('📊 現在のAR状態:', currentState);

    // IDLE状態でない場合は重複起動防止
    if (currentState !== ARState.IDLE) {
      arViewerLogger.info('⚠️ AR処理が既に進行中です:', currentState);
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
      arViewerLogger.error('❌ AR起動要求エラー:', error);
      handleARError(error, ARState.IDLE, {});
    }
  });

  // AR状態ごとのUI設定マップ
  const AR_STATE_CONFIG = {
    [ARState.LAUNCH_REQUESTED]: {
      loadingMessage: '🔍 デバイス対応確認中...',
      loadingType: 'loading',
      hideStartButton: true
    },
    [ARState.PERMISSION_PROMPT]: {
      loadingMessage: '📱 権限確認中...',
      loadingType: 'loading'
    },
    [ARState.CAMERA_STARTING]: {
      loadingMessage: '📷 カメラ起動中...',
      loadingType: 'loading',
      screen: screenStates.GUIDE,
      updateGuide: { type: 'marker' }
    },
    [ARState.XR_STARTING]: {
      loadingMessage: '🥽 WebXR起動中...',
      loadingType: 'loading',
      screen: screenStates.GUIDE,
      updateGuide: { type: 'webxr' }
    },
    [ARState.LOADING_ASSETS]: {
      loadingMessage: '📦 アセット読み込み中...',
      loadingType: 'loading'
    },
    [ARState.PLACING]: {
      loadingMessage: '🎯 配置モード',
      loadingType: 'success',
      screen: screenStates.AR
    },
    [ARState.RUNNING]: {
      loadingMessage: '✅ AR実行中',
      loadingType: 'success',
      screen: screenStates.AR
    },
    [ARState.ERROR]: {
      loadingType: 'error'
    },
    [ARState.DISPOSED]: {
      loadingMessage: '準備完了',
      loadingType: 'idle'
    }
  };

  // AR状態変更ハンドラー（UI更新と状態処理の一元管理）
  async function handleARStateChange(newState, oldState, data) {
    // UI設定の適用
    const config = AR_STATE_CONFIG[newState];
    if (config) {
      // ローディング状態更新
      if (config.loadingMessage || config.loadingType) {
        switch (config.loadingType) {
          case 'loading':
            loadingStateManager.startLoading(config.loadingMessage);
            break;
          case 'success':
            loadingStateManager.setSuccess(config.loadingMessage);
            break;
          case 'error':
            loadingStateManager.setError(data.error?.message || 'AR起動エラー');
            break;
          case 'idle':
            loadingStateManager.setIdle(config.loadingMessage);
            break;
        }
      }

      // スタートボタン非表示
      if (config.hideStartButton) {
        startBtn.style.display = 'none';
      }

      // 画面切り替え
      if (config.screen) {
        showScreen(config.screen);
      }

      // ガイド画面更新
      if (config.updateGuide && data.fallbackInfo) {
        updateGuideScreen(data.fallbackInfo, config.updateGuide.type);
      }
    }

    // 状態ごとの処理実行と次状態の取得
    let nextStateResult = null;
    try {
      switch (newState) {
        case ARState.LAUNCH_REQUESTED:
          nextStateResult = await handleLaunchRequested(data);
          break;

        case ARState.PERMISSION_PROMPT:
          nextStateResult = await handlePermissionPrompt(data);
          break;

        case ARState.CAMERA_STARTING:
          nextStateResult = await handleCameraStarting(data);
          break;

        case ARState.XR_STARTING:
          nextStateResult = await handleXRStarting(data);
          break;

        case ARState.LOADING_ASSETS:
          nextStateResult = await handleLoadingAssets(data);
          break;

        case ARState.PLACING:
          nextStateResult = await handlePlacing(data);
          break;

        case ARState.RUNNING:
          nextStateResult = await handleRunning(data);
          break;

        case ARState.ERROR:
          handleARError(data.error, oldState, data);
          break;

        case ARState.DISPOSED:
          nextStateResult = await handleDisposed(data);
          break;
      }

      // 次の状態への遷移（handle関数が次状態を返した場合）
      if (nextStateResult && nextStateResult.nextState) {
        await arStateMachine.transition(nextStateResult.nextState, {
          ...data,
          ...nextStateResult.data
        });
      }
    } catch (error) {
      // エラー処理：ERROR状態に遷移
      arViewerLogger.error('❌ AR状態処理エラー:', error);
      if (newState !== ARState.ERROR) {
        await arStateMachine.transition(ARState.ERROR, { error });
      }
    }
  }

  // AR起動要求処理
  async function handleLaunchRequested(data) {
    arViewerLogger.info('🔍 WebXRサポート判定開始...');

    const xrSupport = await checkXRSupport();
    const fallbackInfo = getRecommendedFallback(xrSupport);

    arViewerLogger.info('🔍 WebXRサポート結果:', {
      supported: xrSupport.supported,
      reason: xrSupport.reason,
      recommendation: fallbackInfo.type
    });

    // AR経路確定（プロジェクト種別を優先。marker案件でWebXRへ逸れないようにする）
    const projectWantsMarker = (currentProject?.type || currentProject?.mode) === 'marker';
    const useWebXR = xrSupport.supported && !data.engineOverride && !projectWantsMarker;
    const arPath = data.engineOverride || (useWebXR ? 'webxr' : 'marker');

    arViewerLogger.info(`🎯 AR経路確定: ${arPath}${data.engineOverride ? ' (URL強制指定)' : ' (自動判定)'}`, {
      webxrSupported: xrSupport.supported,
      projectType: currentProject?.type || currentProject?.mode,
      engineOverride: data.engineOverride,
      finalPath: arPath
    });

    // 次の状態とデータを返す
    return {
      nextState: ARState.PERMISSION_PROMPT,
      data: {
        arPath,
        xrSupport,
        fallbackInfo,
        engineOverride: data.engineOverride
      }
    };
  }

  // 権限プロンプト処理
  async function handlePermissionPrompt(data) {
    arViewerLogger.info('📱 権限プロンプト処理開始');

    // mediaDevices そのものが未対応の場合（古いブラウザ / 安全でないコンテキスト）
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw cameraError(
        'camera_unsupported',
        'このブラウザはカメラに対応していません。HTTPS で開いているか、最新のブラウザかをご確認ください。'
      );
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
    } catch (error) {
      throw translateCameraError(error);
    }
    arViewerLogger.info('✅ カメラ権限取得完了');

    // ストリームを停止（ARエンジン側で再取得）
    stream.getTracks().forEach(track => track.stop());

    // 次の状態を返す
    const nextState = data.arPath === 'webxr' ? ARState.XR_STARTING : ARState.CAMERA_STARTING;
    return {
      nextState,
      data: {} // 既存のdataを引き継ぐ
    };
  }

  function cameraError(code, message) {
    const err = new Error(message);
    err.code = code;
    return err;
  }

  // getUserMedia の英語エラー名を、ユーザが読めるメッセージへ翻訳する。
  // 詳細: https://developer.mozilla.org/docs/Web/API/MediaDevices/getUserMedia#exceptions
  function translateCameraError(error) {
    const name = error?.name || '';
    switch (name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return cameraError(
          'camera_permission_denied',
          'カメラの使用が許可されていません。ブラウザのアドレスバー横のアイコンからカメラ権限を「許可」に変更し、ページを再読み込みしてください。'
        );
      case 'NotFoundError':
      case 'OverconstrainedError':
        return cameraError(
          'camera_not_found',
          '背面カメラが見つかりませんでした。端末にカメラが接続されているか、別のアプリで使用中でないかをご確認ください。'
        );
      case 'NotReadableError':
      case 'AbortError':
        return cameraError(
          'camera_in_use',
          'カメラを起動できませんでした。他のアプリ（ZoomやSafariの別タブ等）がカメラを使用中の可能性があります。'
        );
      case 'TypeError':
        return cameraError(
          'camera_insecure_context',
          'HTTPS でない接続ではカメラを使えません。HTTPS のURLで開き直してください。'
        );
      default:
        return cameraError('camera_unknown', `カメラ起動に失敗しました: ${error?.message || name || '不明なエラー'}`);
    }
  }

  // カメラ起動処理
  async function handleCameraStarting(data) {
    try {
      arViewerLogger.info('📷 AR.jsカメラ起動開始...');
      arViewerLogger.info('🔍 currentProject確認:', {
        'projectが存在': !!currentProject,
        'markerPattern': currentProject?.markerPattern ? '存在' : 'なし',
        'markerImage': currentProject?.markerImage || 'なし',
        'markerImageUrl': currentProject?.markerImageUrl || 'なし',
        'marker.url': currentProject?.marker?.url || 'なし',
        '__sourceUrl': currentProject?.__sourceUrl
      });

      // プロジェクトのカスタムマーカーを優先する。
      // 画像URLは MarkerAR 側へ渡し、AR.js 読み込み後に .patt 化する。
      // AR.js 読み込み前の自前生成は、Pattern Data read error の原因になる。
      let markerUrlOption = null;
      try {
        // 1) 既に .patt 文字列が保存されている場合
        if (currentProject?.markerPattern && typeof currentProject.markerPattern === 'string') {
          arViewerLogger.info('✅ markerPattern が存在します（文字列長:', currentProject.markerPattern.length, '）');
          try {
            const patt = createPatternBlob(currentProject.markerPattern);
            markerUrlOption = patt.url;
            markerPatternCleanup = patt.revoke;
            arViewerLogger.info('📌 プロジェクト保存済みの .patt を使用:', markerUrlOption);
          } catch (patternError) {
            arViewerLogger.warn('⚠️ 保存済み markerPattern が不正なためマーカー画像から再生成します:', patternError?.message || patternError);
          }
        }

        if (!markerUrlOption) {
          arViewerLogger.info('ℹ️ マーカー画像URLを MarkerAR に渡します');
          // extractDesignで正規化されたマーカー画像URLを取得
          const { guideScreen } = extractDesign(currentProject);
          const normalizedMarkerUrl = guideScreen?.marker?.src || guideScreen?.markerImage;
          arViewerLogger.info('🔍 正規化されたマーカー画像URL:', normalizedMarkerUrl);

          // 2) マーカー画像から .patt を生成
          // 複数の場所からマーカー画像URLを探す（正規化されたURLを最優先）
          const rawUrl = normalizedMarkerUrl
            || currentProject?.markerImage
            || currentProject?.markerImageUrl
            || currentProject?.marker?.url
            || currentProject?.marker?.src
            || currentProject?.guide?.marker?.src
            || currentProject?.guide?.markerImage
            || currentProject?.guideScreen?.marker?.src
            || currentProject?.guideScreen?.markerImage
            || currentProject?.screens?.[0]?.marker?.src
            || null;
          arViewerLogger.info('🔍 マーカー画像URL:', rawUrl);

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
            arViewerLogger.info('🔗 絶対URL化されたマーカー画像:', absUrl);
            markerUrlOption = absUrl;
            arViewerLogger.info('📌 MarkerAR へマーカー画像URLを渡します:', markerUrlOption);
          } else {
            arViewerLogger.warn('⚠️ マーカー画像URLが見つかりません');
          }
        }
      } catch (genErr) {
        arViewerLogger.error('❌ マーカーパターン準備エラー:', genErr);
        arViewerLogger.warn('⚠️ マーカーパターン準備で警告（フォールバック継続）:', genErr?.message || genErr);
      }

      arViewerLogger.info('🎯 最終的なmarkerUrlOption:', markerUrlOption);

      // ⚠️ 重要: HIROマーカーへのフォールバック禁止 (docs/MARKER_POLICY.md 参照)
      // カスタムマーカーが設定されていない場合は警告を表示
      if (!markerUrlOption) {
        arViewerLogger.warn('⚠️ カスタムマーカーが設定されていません');
        arViewerLogger.warn('📌 プロジェクト設定でマーカー画像をアップロードしてください');
      }
      
      const finalMarkerUrl = markerUrlOption || null;
      arViewerLogger.info('🎯 AREngineAdapter.create()に渡すmarkerUrl:', finalMarkerUrl);

      const arEngine = await AREngineAdapter.create({
        container: arHost,
        preferredEngine: 'marker',
        // MarkerAR にカスタムマーカーを渡す（nullならサンプル画像にフォールバック）
        markerUrl: finalMarkerUrl
      });

      currentAREngine = arEngine;
      await arEngine.initialize();

      // 次の状態を返す
      return {
        nextState: ARState.LOADING_ASSETS,
        data: { arEngine }
      };

    } catch (error) {
      arViewerLogger.error('❌ カメラ起動エラー:', error);
      throw error;
    }
  }

  // WebXR起動処理
  async function handleXRStarting(data) {
    arViewerLogger.info('🥽 WebXR起動開始...');

    const arEngine = await AREngineAdapter.create({
      container: arHost,
      preferredEngine: 'webxr'
    });

    currentAREngine = arEngine;
    await arEngine.initialize();

    // 次の状態を返す
    return {
      nextState: ARState.LOADING_ASSETS,
      data: { arEngine }
    };
  }

  // アセット読み込み処理
  async function handleLoadingAssets(data) {
    arViewerLogger.info('📦 アセット読み込み開始...');

    // marker モード: start() より前に effects を接続（自動配置の遅延を効かせる）
    if (data.arPath === 'marker' && currentProject?.effects?.length) {
      try {
        const { attachEffectsRuntime } = await import('../effects/effects-runtime.js');
        effectsRuntime?.detach?.();
        effectsRuntime = attachEffectsRuntime(currentAREngine, currentProject);
        if (effectsRuntime) {
          arViewerLogger.info('✨ EffectsRuntime 接続完了', {
            count: currentProject.effects.length
          });
        }
      } catch (effectsErr) {
        arViewerLogger.warn('⚠️ EffectsRuntime 接続をスキップ:', effectsErr?.message || effectsErr);
      }
    }

    await currentAREngine.start(currentProject);

    // 次の状態を返す（配置モードまたは実行モード）
    const nextState = data.arPath === 'webxr' ? ARState.PLACING : ARState.RUNNING;
    return {
      nextState,
      data: {}
    };
  }

  // 配置モード処理
  async function handlePlacing(data) {
    arViewerLogger.info('🎯 配置モード開始');

    if (data.arPath === 'webxr') {
      updateInstruction('<strong>🎯 空間をスキャンしてARオブジェクトを配置してください</strong>');
    }

    // WebXRの場合、タップで配置完了後にRUNNING状態へ遷移
    // この遷移は実際のタップイベントで実行される
    // 戻り値なし（タップイベントで遷移）
  }

  // AR実行処理
  async function handleRunning(data) {
    arViewerLogger.info('▶️ AR実行開始');

    // RUNNING状態のタイムアウトをクリア（実行中は無期限）
    if (arStateMachine) {
      arStateMachine.clearStateTimeout(ARState.RUNNING);
    }

    if (data.arPath === 'marker') {
      updateInstruction('<strong>📌 マーカーをカメラにかざしてください</strong>');
    } else if (data.arPath === 'webxr') {
      updateInstruction('<strong>🎉 ARオブジェクトを楽しんでください</strong>');
    }

    // 終了状態なので次状態なし
  }

  // 破棄処理
  async function handleDisposed(data) {
    arViewerLogger.info('🗑️ AR破棄処理');

    effectsRuntime?.detach?.();
    effectsRuntime = null;

    // ARエンジンアダプターの完全破棄
    await AREngineAdapter.destroyActiveEngine();
    currentAREngine = null;

    arStateMachine = null;
  }

  // ARエラーハンドリング
  function handleARError(error, previousState, data) {
    arViewerLogger.error('❌ AR状態機械エラー:', error, { previousState, data });

    const { headline, hint } = classifyARError(error, previousState);
    updateStatus(`❌ ${headline}`, 'error');

    const errorContainer = container.querySelector('.ar-loading-content') || container;
    let detailsEl = container.querySelector('#ar-error-detail');
    if (!detailsEl) {
      detailsEl = document.createElement('p');
      detailsEl.id = 'ar-error-detail';
      detailsEl.style.cssText = 'margin:0.5rem 0;color:#fff;font-size:0.95rem;line-height:1.45;text-align:center;';
      errorContainer.appendChild(detailsEl);
    }
    detailsEl.textContent = hint;

    showRetryButton(headline);
  }

  // エラーオブジェクトと直前の状態から、ユーザに見せるエラー見出しと対処ヒントを決定する。
  function classifyARError(error, previousState) {
    const code = error?.code || '';
    const message = error?.message || 'AR起動エラー';

    // カメラ系（handlePermissionPrompt の translateCameraError で付与済み）
    if (code.startsWith('camera_')) {
      return { headline: 'カメラを使えませんでした', hint: message };
    }

    // アセット欠落系（marker / model の読み込み失敗）
    if (/marker image not reachable|marker.*404|CORS/.test(message)) {
      return {
        headline: 'マーカー画像を読み込めませんでした',
        hint: 'マーカー画像のURLが正しいか、公開ストレージに存在するかをご確認ください。詳細: ' + message
      };
    }
    if (/glb|model|gltf/i.test(message) && previousState === ARState.LOADING_ASSETS) {
      return {
        headline: '3Dモデルを読み込めませんでした',
        hint: 'モデル(.glb)のURLが正しいか、ファイルが破損していないかをご確認ください。詳細: ' + message
      };
    }

    // JSON 系（boot 側で拾われるはずだが、後段で起きた場合のフォールバック）
    if (/project\.json|JSON/i.test(message)) {
      return {
        headline: 'プロジェクト設定の読み込みに失敗しました',
        hint: '公開URL (?src=...) が正しいか、project.json が有効なJSONかをご確認ください。詳細: ' + message
      };
    }

    return { headline: 'AR起動に失敗しました', hint: message };
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

      effectsRuntime?.detach?.();
      effectsRuntime = null;

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
        arViewerLogger.info('🛑 ARアニメーションループ停止');
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
    arViewerLogger.info('🧹 ARビューア 統合クリーンアップ実行');
    
    // 1. イベントリスナー解除
    if (layoutStartScreenHandler) {
      window.removeEventListener('resize', layoutStartScreenHandler);
      layoutStartScreenHandler = null;
      arViewerLogger.info('✅ resize イベントリスナーを解除');
    }
    
    // 2. AR関連リソース解除
    if (typeof window.arInstance !== 'undefined' && window.arInstance) {
      try {
        window.arInstance.dispose();
        window.arInstance = null;
        arViewerLogger.info('✅ ARインスタンスを破棄');
      } catch(e) { arViewerLogger.warn('⚠️ ARインスタンス破棄エラー:', e); }
    }
    
    // 3. カメラストリーム停止
    if (video && video.srcObject) {
      try {
        const stream = video.srcObject;
        if (stream && stream.getTracks) {
          stream.getTracks().forEach(track => {
            track.stop();
            arViewerLogger.info('✅ カメラトラック停止:', track.kind);
          });
        }
        video.srcObject = null;
      } catch(e) { arViewerLogger.warn('⚠️ カメラストリーム停止エラー:', e); }
    }
    
    // 4. Three.js リソース解除
    if (renderer) {
      try {
        renderer.dispose();
        arViewerLogger.info('✅ Three.jsレンダラーを破棄');
      } catch(e) { arViewerLogger.warn('⚠️ Three.jsレンダラー破棄エラー:', e); }
    }
    
    // 5. DOM要素解除
    if (video && video.parentNode) {
      video.parentNode.removeChild(video);
      arViewerLogger.info('✅ videoエレメントをDOM削除');
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
    
    arViewerLogger.info('✅ ARビューア クリーンアップ完了');
  };
}
