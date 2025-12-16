// ?__takeoverStartUI が付いたときだけ takeover を起動
(function () {
  const qs = new URLSearchParams(location.search);
  if (!qs.has('__takeoverStartUI')) return;

  console.info('[TAKEOVER] start UI takeover active');

  // CSSスイッチON
  document.documentElement.setAttribute('data-takeover-start', '1');

  // takeover用の Start 画面（テンプレ相当）
  const overlay = document.createElement('div');
  overlay.id = 'takeover-start-overlay';
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    // 背景はCSSで上書きするが、フォールバックとして半透明を設定
    'background:rgba(0,0,0,0.5)',
    'backdrop-filter:saturate(1.2) blur(2px)',
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

  // DOM 準備後に追加
  const ready = document.body
    ? Promise.resolve()
    : new Promise((resolve) => window.addEventListener('DOMContentLoaded', resolve, { once: true }));
  ready.then(() => document.body.appendChild(overlay));

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // 生成タイミングのズレに耐える z-index 補正
  function bumpZ(selectors, ttl = 1500) {
    const end = Date.now() + ttl;
    (function tick() {
      selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          el.style.zIndex = '2147483000';
        });
      });
      if (Date.now() < end) requestAnimationFrame(tick);
    })();
  }

  // 我々の START ボタン：onStart は呼ばず、Loading→800ms→Guide を直列に必ず表示
  document.addEventListener(
    'click',
    async (event) => {
      const btn = document.getElementById('takeover-start-btn');
      if (!btn || event.target !== btn) return;

      // Start 画面は閉じる（既存 onStart は呼ばない）
      overlay.remove();

      if (typeof window.__showLoadingUI === 'function') {
        window.__showLoadingUI();
        bumpZ(['#ar-loading-overlay', '.ar-loading-overlay', '[data-ar-layer="loading"]']);
      }

      await delay(800);

      if (typeof window.__showGuideUI === 'function') {
        window.__showGuideUI();
        bumpZ(['#ar-guide-overlay', '.ar-guide-overlay', '[data-ar-layer="guide"]']);
      }
    },
    { capture: true }
  );

  // 既存 Start UI へのクリックを丸ごと封じる（キャプチャ段階）
  document.addEventListener(
    'click',
    (event) => {
      if (document.documentElement.getAttribute('data-takeover-start') !== '1') return;

      const isOurBtn = Boolean(event.target.closest('#takeover-start-btn'));
      const inLegacyStart = Boolean(
        event.target.closest('[data-ar-layer="start"], .ar-start-overlay, #ar-start-overlay')
      );

      if (!isOurBtn && inLegacyStart) {
        event.stopImmediatePropagation();
        event.stopPropagation();
        event.preventDefault();
        console.info('[TAKEOVER] blocked original start click');
      }
    },
    true
  );

  // 後出しで湧く既存 Start 要素も即無力化
  const observer = new MutationObserver(() => {
    document
      .querySelectorAll('[data-ar-layer="start"], .ar-start-overlay, #ar-start-overlay')
      .forEach((el) => {
        if (el.id === 'takeover-start-overlay' || el.closest('#takeover-start-overlay')) return;
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '2147483000';
      });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
