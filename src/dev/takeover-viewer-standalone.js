// viewer内・関数非依存 版
(function(){
  function hasParamIn(win){
    try {
      const s = new URLSearchParams(win.location.search||'');
      if (s.has('__takeoverStartUI')) return true;
      const h = String(win.location.hash||'');
      const qi = h.indexOf('?');
      if (qi>=0) {
        const hs = new URLSearchParams(h.slice(qi+1));
        if (hs.has('__takeoverStartUI')) return true;
      }
    } catch {}
    return false;
  }
  const hasHere = hasParamIn(window);
  let hasTop = false; try { hasTop = (window.top && window.top!==window) ? hasParamIn(window.top) : false; } catch {}
  if (!(hasHere || hasTop)) return;

  const DOC = document;
  const Z = 2147483000;
  let phase = "idle"; // idle -> started -> loading -> guide
  let mounted = { start:false, loading:false, guide:false };

  // 汎用ユーティリティ
  const $ = (sel) => DOC.querySelector(sel);
  const show = (el) => {
    if(!el) return;
    el.removeAttribute('hidden');
    el.setAttribute('aria-hidden','false');
    // display 推定: loading系は flex、それ以外は block
    const id = el.id || '';
    const cls = el.className || '';
    const isLoadingLike = id.includes('loading') || /ar-loading|unified-loading-screen/.test(cls) || el.getAttribute('data-ar-layer')==='loading';
    el.style.display = isLoadingLike ? 'flex' : 'block';
    el.style.visibility='visible';
    try { el.style.setProperty('z-index', String(Z), 'important'); }
    catch { el.style.zIndex = String(Z); }
  };
  const hide = (el) => { if(!el) return; el.setAttribute('aria-hidden','true'); el.style.display='none'; };
  const ensureStyle = () => {
    if (DOC.querySelector('style[data-takeover-style="1"]')) return;
    const s = DOC.createElement('style');
    s.setAttribute('data-takeover-style','1');
    s.textContent = `
      :root[data-takeover-start="1"] #takeover-start-overlay { background:#000 !important; }
      :root[data-takeover-start="1"] #takeover-start-overlay,
      :root[data-takeover-start="1"] #ar-loading-screen,
      :root[data-takeover-start="1"] #ar-loading-overlay,
      :root[data-takeover-start="1"] .ar-loading-overlay,
      :root[data-takeover-start="1"] [data-ar-layer="loading"],
      :root[data-takeover-start="1"] .unified-loading-screen,
      :root[data-takeover-start="1"] #__takeover_loading__,
      :root[data-takeover-start="1"] #ar-guide-screen,
      :root[data-takeover-start="1"] #ar-guide-overlay,
      :root[data-takeover-start="1"] .ar-guide-overlay,
      :root[data-takeover-start="1"] [data-ar-layer="guide"],
      :root[data-takeover-start="1"] #__takeover_guide__ { z-index:${Z} !important; }
      /* 既存 Start を徹底的に不可視＆不可クリック */
      :root[data-takeover-start="1"] #ar-start-overlay:not(#takeover-start-overlay),
      :root[data-takeover-start="1"] .ar-start-overlay:not(#takeover-start-overlay),
      :root[data-takeover-start="1"] [data-ar-layer="start"]:not(#takeover-start-overlay),
      :root[data-takeover-start="1"] #ar-start-screen:not(#takeover-start-overlay),
      :root[data-takeover-start="1"] .ar-start-screen:not(#takeover-start-overlay) {
        visibility:hidden !important; pointer-events:none !important;
      }
    `;
    (DOC.head||DOC.documentElement).appendChild(s);
  };

  // 既存の Loading/Guide を探す
  function findLoadingEl(){
    return (
      $('#ar-loading-screen') ||
      $('#ar-loading-overlay') ||
      $('.ar-loading-overlay') ||
      $('[data-ar-layer="loading"]') ||
      $('.unified-loading-screen') ||
      $('#__takeover_loading__')
    );
  }
  function findGuideEl(){
    return $('#ar-guide-screen') || $('#ar-guide-overlay') || $('.ar-guide-overlay') || $('[data-ar-layer="guide"]') || $('#__takeover_guide__');
  }

  // フォールバックUI（存在しない場合だけ生成）
  function buildFallbackLoading(){
    if ($('#takeover-fallback-loading')) return $('#takeover-fallback-loading');
    const el = DOC.createElement('div');
    el.id = 'takeover-fallback-loading';
    el.style.cssText = `position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);z-index:${Z}`;
    el.innerHTML = `<div style="color:#fff;font-weight:700;font-size:18px;">Loading...</div>`;
    (DOC.body||DOC.documentElement).appendChild(el);
    return el;
  }
  function buildFallbackGuide(){
    if ($('#takeover-fallback-guide')) return $('#takeover-fallback-guide');
    const el = DOC.createElement('div');
    el.id = 'takeover-fallback-guide';
    el.style.cssText = `position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,0.92);z-index:${Z};text-align:center;`;
    // 既存 guide の画像がDOM上にあれば拝借（追加リクエストを避ける）
    let imgHTML = '';
    try {
      const g = findGuideEl();
      const cand = g ? g.querySelector('img') : null;
      if (cand && cand.src) imgHTML = `<img src="${cand.src}" alt="" style="max-width:min(80vw,480px);width:100%;height:auto;display:block;margin:0 auto 16px;"/>`;
    } catch {}
    el.innerHTML = `
      <div style="max-width:min(90vw,560px);">
        ${imgHTML}
        <div style="color:#fff;font-weight:700;font-size:20px;margin-bottom:8px;">マーカーをかざしてください</div>
        <div style="color:#ddd;font-size:14px;line-height:1.6;">
          カメラをマーカーに向けると体験が始まります。明るい場所で、マーカー全体が入るように調整してください。
        </div>
      </div>
    `;
    (DOC.body||DOC.documentElement).appendChild(el);
    return el;
  }

  // Start オーバーレイ（自前）
  function mountStart(){
    if (mounted.start || $('#takeover-start-overlay')) return;
    DOC.documentElement.setAttribute('data-takeover-start','1');
    ensureStyle();

    const overlay = DOC.createElement('div');
    overlay.id = 'takeover-start-overlay';
    overlay.style.cssText = `position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.92);z-index:${Z}`;
    overlay.innerHTML = `
      <div style="text-align:center;width:min(92vw,480px);">
        <h1 id="ar-start-title" style="color:#fff;margin:0 0 16px;font-weight:700;font-size:24px;">AR体験を開始</h1>
        <button id="takeover-start-btn" style="appearance:none;border:0;border-radius:12px;padding:14px 22px;font-size:16px;font-weight:700;cursor:pointer;">
          START
        </button>
      </div>
    `;
    (DOC.body ? Promise.resolve() : new Promise(r=>addEventListener('DOMContentLoaded', r, {once:true})))
      .then(()=> DOC.body.appendChild(overlay));

    mounted.start = true;
  }

  // 既存 start への誤クリックを封じる
  DOC.addEventListener('click',(ev)=>{
    const isOurBtn = !!ev.target.closest?.('#takeover-start-btn');
    const inLegacyStart = !!ev.target.closest?.('[data-ar-layer="start"], .ar-start-overlay, #ar-start-overlay, #ar-start-screen, .ar-start-screen, #ar-start-cta, #ar-start-btn, [data-role="start-button"]');
    if (!isOurBtn && inLegacyStart) {
      ev.stopImmediatePropagation(); ev.stopPropagation(); ev.preventDefault();
      console.info('[TAKEOVER] blocked legacy start click');
    }
  }, true);

  // 自前シーケンス：関数呼び出しは行わず DOM を直接制御
  DOC.addEventListener('click', async (ev)=>{
    const btn = $('#takeover-start-btn');
    if (!btn || ev.target !== btn) return;
    if (phase !== 'idle') return;
    phase = 'started';

    // Start を閉じる
    $('#takeover-start-overlay')?.remove();

    // Loading を出す（既存があればそれを表示、無ければフォールバック）
    let loading = findLoadingEl();
    if (loading) {
      show(loading);
    } else {
      loading = buildFallbackLoading();
      show(loading);
    }
    mounted.loading = true;
    console.info('[TAKEOVER] show loading');

    // 800ms 待つ
    await new Promise(r=>setTimeout(r, 800));

    // Loading を隠す
    hide(loading);

    // Guide を出す（既存があればそれを表示、無ければフォールバック）
    let guide = findGuideEl();
    if (guide) {
      show(guide);
    } else {
      guide = buildFallbackGuide();
      show(guide);
    }
    mounted.guide = true;
    phase = 'guide';
    console.info('[TAKEOVER] show guide');
  }, { capture:true });

  // SPAでDOMが差し替わっても復活
  (function persist(){
    // style & start が消されていたら復帰
    ensureStyle();
    if (phase === 'idle') mountStart();

    // 既存の Loading/Guide が投入された/差し替えられた場合に z-index を維持
    const l = findLoadingEl(); if (l) l.style.zIndex = String(Z);
    const g = findGuideEl(); if (g) g.style.zIndex = String(Z);

    requestAnimationFrame(persist);
  })();

  // ルート変更にも追随
  (function hookHistory(){
    const H = history;
    ['pushState','replaceState'].forEach(k=>{
      const orig = H[k];
      H[k] = function(){ const r = orig.apply(this, arguments); setTimeout(mountStart,0); return r; };
    });
    addEventListener('popstate',()=> setTimeout(mountStart,0));
  })();

  console.info('[TAKEOVER] standalone active (no API)');
})();
