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

          <div class="login-cta">
            <a class="login-btn-primary" href="#/projects">今すぐはじめる</a>
          </div>
        </div>
      </main>
    </div>
  `;
}