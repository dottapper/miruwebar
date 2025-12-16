// takeover-injector.js
(function bootstrapAllContexts() {
  const TOP = (function(){ try { return window.top; } catch { return window; } })();

  function hasParam(win) {
    try {
      const s1 = new URLSearchParams(win.location.search || '');
      const s2 = (TOP && TOP !== win) ? new URLSearchParams(TOP.location.search || '') : null;
      return s1.has('__takeoverStartUI') || (s2 && s2.has('__takeoverStartUI'));
    } catch {
      return false;
    }
  }

  // ---- Core takeover injected into any target window (top or same-origin iframe)
  function runTakeoverIn(win) {
    if (!hasParam(win)) return;
    const doc = win.document;

    // avoid double-run
    if (doc.documentElement.getAttribute('data-takeover-start') === '1') return;

    console.info('[TAKEOVER]', 'inject into', win.location.href);

    // mark & mount style (no external CSS needed)
    doc.documentElement.setAttribute('data-takeover-start', '1');
    const style = doc.createElement('style');
    style.setAttribute('data-takeover-style', '1');
    style.textContent = `
      /* 既存 Start を不可視＆クリック不可 */
      :root[data-takeover-start="1"] #ar-start-overlay:not(#takeover-start-overlay),
      :root[data-takeover-start="1"] .ar-start-overlay:not(#takeover-start-overlay),
      :root[data-takeover-start="1"] [data-ar-layer="start"]:not(#takeover-start-overlay),
      :root[data-takeover-start="1"] #ar-start-screen:not(#takeover-start-overlay),
      :root[data-takeover-start="1"] .ar-start-screen:not(#takeover-start-overlay) {
        visibility: hidden !important;
        pointer-events: none !important;
      }
      /* Loading / Guide / Takeover の z-index 統一 */
      :root[data-takeover-start="1"] #ar-loading-overlay,
      :root[data-takeover-start="1"] .ar-loading-overlay,
      :root[data-takeover-start="1"] [data-ar-layer="loading"],
      :root[data-takeover-start="1"] .unified-loading-screen,
      :root[data-takeover-start="1"] #__takeover_loading__,
      :root[data-takeover-start="1"] #ar-guide-overlay,
      :root[data-takeover-start="1"] .ar-guide-overlay,
      :root[data-takeover-start="1"] [data-ar-layer="guide"],
      :root[data-takeover-start="1"] #__takeover_guide__,
      :root[data-takeover-start="1"] #takeover-start-overlay {
        z-index: 2147483000 !important;
      }
      /* 透け防止：takeover 背景は不透明 */
      :root[data-takeover-start="1"] #takeover-start-overlay {
        background: var(--ar-start-bg, #000) !important;
      }
    `;
    (doc.head || doc.documentElement).appendChild(style);

    // build overlay
    const overlay = doc.createElement('div');
    overlay.id = 'takeover-start-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.style.cssText = [
      'position:fixed','inset:0','display:flex','align-items:center','justify-content:center',
      'background:rgba(0,0,0,0.5)','backdrop-filter:saturate(1.2) blur(2px)',
      'z-index:2147483000'
    ].join(';');
    overlay.innerHTML = `
      <div style="text-align:center;width:min(92vw,480px);">
        <h1 id="ar-start-title" style="color:#fff;margin:0 0 16px;font-weight:700;font-size:24px;">
          AR体験を開始
        </h1>
        <button id="takeover-start-btn" style="
          appearance:none;border:0;border-radius:12px;
          padding:14px 22px;font-size:16px;font-weight:700;cursor:pointer;">
          START
        </button>
      </div>
    `;

    // wait body & mount
    const ready = doc.body
      ? Promise.resolve()
      : new Promise(r => win.addEventListener('DOMContentLoaded', r, { once: true }));
    ready.then(() => doc.body.appendChild(overlay));

    // block clicks to legacy start (even if it appears later)
    doc.addEventListener('click', (ev) => {
      if (doc.documentElement.getAttribute('data-takeover-start') !== '1') return;
      const isOurBtn = !!ev.target.closest?.('#takeover-start-btn');
      const inLegacyStart = !!ev.target.closest?.('[data-ar-layer="start"], .ar-start-overlay, #ar-start-overlay, #ar-start-screen, .ar-start-screen, #ar-start-cta, #ar-start-btn, [data-role="start-button"]');
      if (!isOurBtn && inLegacyStart) {
        ev.stopImmediatePropagation(); ev.stopPropagation(); ev.preventDefault();
        console.info('[TAKEOVER] blocked original start click');
      }
    }, true);

    // mutation guard for late-coming legacy start
    const mo = new win.MutationObserver(() => {
      doc.querySelectorAll('[data-ar-layer="start"], .ar-start-overlay, #ar-start-overlay, #ar-start-screen, .ar-start-screen')
        .forEach(el => {
          if (el.id === 'takeover-start-overlay' || el.closest('#takeover-start-overlay')) return;
          el.style.visibility = 'hidden';
          el.style.pointerEvents = 'none';
          el.style.zIndex = '2147483000';
        });
    });
    mo.observe(doc.documentElement, { childList: true, subtree: true });

    // z-index helper
    function bumpZ(selectors, ttl = 1500) {
      const end = Date.now() + ttl;
      (function tick() {
        selectors.forEach(sel => doc.querySelectorAll(sel).forEach(el => el.style.zIndex = '2147483000'));
        if (Date.now() < end) win.requestAnimationFrame(tick);
      })();
    }

    // START button → Loading → 800ms → Guide（onStartは呼ばない）
    doc.addEventListener('click', async (ev) => {
      const btn = doc.getElementById('takeover-start-btn');
      if (!btn || ev.target !== btn) return;

      overlay.remove();

      if (typeof win.__showLoadingUI === 'function') {
        win.__showLoadingUI();
        bumpZ(['#ar-loading-overlay','.ar-loading-overlay','[data-ar-layer="loading"]','.unified-loading-screen','#__takeover_loading__']);
      }
      await new Promise(r => win.setTimeout(r, 800));
      if (typeof win.__showGuideUI === 'function') {
        win.__showGuideUI();
        bumpZ(['#ar-guide-overlay','.ar-guide-overlay','[data-ar-layer="guide"]','#__takeover_guide__']);
      }
    }, { capture: true });
  }

  // inject into current window
  try { runTakeoverIn(window); } catch (e) { console.warn('[TAKEOVER] self inject failed', e); }

  // also inject into same-origin iframes that appear within a short window
  function tryIframes(scopeWin) {
    const frames = scopeWin.document.querySelectorAll('iframe');
    frames.forEach((f) => {
      try {
        if (!f.contentWindow || !f.contentDocument) return;
        // same-origin check
        void f.contentDocument.body; // will throw on cross-origin
        runTakeoverIn(f.contentWindow);
        // also hook load to re-run once content is ready
        f.addEventListener('load', () => {
          try { runTakeoverIn(f.contentWindow); } catch {}
        }, { once: false });
      } catch { /* cross-origin or not ready; ignore */ }
    });
  }

  // poll for newly added iframes for 3s
  let polls = 0;
  const id = setInterval(() => {
    tryIframes(window);
    polls += 1;
    if (polls > 30) clearInterval(id); // ~3s
  }, 100);

  // observe DOM for dynamically added iframes (same-origin)
  const obs = new MutationObserver(() => tryIframes(window));
  try { obs.observe(document.documentElement, { childList: true, subtree: true }); } catch {}
})();
