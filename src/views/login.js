// src/views/login.js
// パスワード認証ログインページ

import { createLogger } from '../utils/logger.js';

const logger = createLogger('Login');

export default async function showLogin(container) {
  logger.info('ログインページを表示');

  // まずログインフォームを表示（表示を確実にする）
  container.innerHTML = `
    <div class="login-container">
      <main class="login-hero">
        <div class="login-content">
          <div class="login-brand-mark">
            <img class="login-brand-logo" src="/assets/logo.png" alt="miru-webAR ロゴ" />
            <h1 class="login-brand-title">miru‑webAR</h1>
            <div class="login-brand-underline"></div>
          </div>

          <form class="login-form" id="login-form">
            <div class="login-input-group">
              <label for="login-password" class="login-label">パスワード</label>
              <div class="login-password-wrapper">
                <input 
                  type="password" 
                  id="login-password" 
                  name="password"
                  class="login-input login-input-password"
                  placeholder="パスワードを入力"
                  autocomplete="current-password"
                  required
                />
                <button type="button" class="login-password-toggle" id="login-password-toggle" aria-label="パスワードを表示">
                  <svg class="login-password-eye login-password-eye-show" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg class="login-password-eye login-password-eye-hide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display: none;">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
            </div>

            <div id="login-error" class="login-error" style="display: none;"></div>

            <button type="submit" class="login-btn-submit" id="login-btn-submit">
              <span class="login-btn-text">ログイン</span>
              <span class="login-btn-loading" style="display: none;">
                <svg class="login-spinner" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="30 70" />
                </svg>
              </span>
            </button>
          </form>

          <div class="login-footer">
            <p>このアプリは開発者専用です</p>
          </div>
        </div>
      </main>
    </div>
  `;

  const form = container.querySelector('#login-form');
  const passwordInput = container.querySelector('#login-password');
  const errorMessage = container.querySelector('#login-error');
  const loginButton = container.querySelector('#login-btn-submit');
  const buttonText = container.querySelector('.login-btn-text');
  const buttonLoading = container.querySelector('.login-btn-loading');

  // 認証設定をチェック（フォーム表示後に実行）
  try {
    const response = await fetch('/api/auth/check', {
      method: 'GET',
      credentials: 'same-origin',
    });

    if (response.ok) {
      const data = await response.json();
      
      // 認証が不要な環境（AUTH_SECRET未設定）または既に認証済みの場合
      if (!data.authRequired || data.authenticated) {
        logger.info('認証不要または認証済み - プロジェクトページへリダイレクト');
        window.location.hash = '#/projects';
        return () => {}; // クリーンアップ関数（空）
      }
    }
  } catch (error) {
    logger.warn('認証チェックエラー - ログインフォームを表示', error);
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    const password = passwordInput.value.trim();
    if (!password) {
      showError('パスワードを入力してください');
      return;
    }

    setLoading(true);
    hideError();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        logger.success('認証成功');
        window.location.hash = '#/projects';
      } else {
        logger.warn('認証失敗', data.error);
        showError(data.error || '認証に失敗しました');
      }
    } catch (error) {
      logger.error('認証エラー', error);
      showError('サーバーとの通信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const showError = (message) => {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
  };

  const hideError = () => {
    errorMessage.style.display = 'none';
  };

  const setLoading = (loading) => {
    loginButton.disabled = loading;
    buttonText.style.display = loading ? 'none' : 'inline';
    buttonLoading.style.display = loading ? 'inline-flex' : 'none';
  };

  // パスワード表示切替
  const passwordToggle = container.querySelector('#login-password-toggle');
  const eyeShow = container.querySelector('.login-password-eye-show');
  const eyeHide = container.querySelector('.login-password-eye-hide');

  const togglePasswordVisibility = () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    eyeShow.style.display = isPassword ? 'none' : 'block';
    eyeHide.style.display = isPassword ? 'block' : 'none';
    passwordToggle.setAttribute('aria-label', isPassword ? 'パスワードを隠す' : 'パスワードを表示');
  };

  passwordToggle.addEventListener('click', togglePasswordVisibility);

  form.addEventListener('submit', handleSubmit);
  passwordInput.addEventListener('input', hideError);

  return () => {
    passwordToggle.removeEventListener('click', togglePasswordVisibility);
    form.removeEventListener('submit', handleSubmit);
    passwordInput.removeEventListener('input', hideError);
  };
}
