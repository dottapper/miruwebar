// src/views/login.js
export default function showLogin(container) {
  container.innerHTML = `
    <div class="login-container">
      <main class="login-hero">
        <div class="login-content">
          <div class="login-brand-mark">
            <img class="login-brand-logo" src="/assets/logo.png" alt="miru-webAR ロゴ" />
            <h1 class="login-brand-title">miru‑webAR</h1>
            <div class="login-brand-underline"></div>
          </div>

          <p class="login-tagline">ブラウザだけでWebAR体験を作成・共有</p>

          <div class="login-cta">
            <a class="login-btn-primary" href="#/projects">今すぐはじめる</a>
            <a class="login-btn-secondary" href="#/usage-guide">使い方を見る</a>
          </div>

          <div class="login-features">
            <span class="login-feature-badge">ログイン不要</span>
            <span class="login-feature-badge">PC専用</span>
            <span class="login-feature-badge">無料</span>
          </div>
        </div>
      </main>
    </div>
  `;
}