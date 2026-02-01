// src/views/auth-login.js
// シンプルなパスワード認証用ログインページ

import { createLogger } from '../utils/logger.js';

const logger = createLogger('AuthLogin');

/**
 * 認証用ログインページを表示
 * @param {HTMLElement} container - 表示先のコンテナ
 * @returns {Function|void} クリーンアップ関数
 */
export default function showAuthLogin(container) {
  logger.info('認証ログインページを表示');

  container.innerHTML = `
    <div class="auth-login-container">
      <div class="auth-login-card">
        <div class="auth-login-header">
          <img class="auth-login-logo" src="/assets/logo.png" alt="miru-webAR ロゴ" />
          <h1 class="auth-login-title">miru-webAR</h1>
          <p class="auth-login-subtitle">開発者認証</p>
        </div>

        <form class="auth-login-form" id="auth-login-form">
          <div class="auth-login-input-group">
            <label for="auth-password" class="auth-login-label">パスワード</label>
            <input 
              type="password" 
              id="auth-password" 
              name="password"
              class="auth-login-input"
              placeholder="パスワードを入力"
              autocomplete="current-password"
              required
            />
          </div>

          <div id="auth-error-message" class="auth-login-error" style="display: none;"></div>

          <button type="submit" class="auth-login-button" id="auth-login-button">
            <span class="auth-login-button-text">ログイン</span>
            <span class="auth-login-button-loading" style="display: none;">
              <svg class="auth-login-spinner" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="30 70" />
              </svg>
            </span>
          </button>
        </form>

        <div class="auth-login-footer">
          <p>このアプリは開発者専用です</p>
        </div>
      </div>
    </div>
  `;

  // フォームの送信ハンドラ
  const form = container.querySelector('#auth-login-form');
  const passwordInput = container.querySelector('#auth-password');
  const errorMessage = container.querySelector('#auth-error-message');
  const loginButton = container.querySelector('#auth-login-button');
  const buttonText = container.querySelector('.auth-login-button-text');
  const buttonLoading = container.querySelector('.auth-login-button-loading');

  const handleSubmit = async (event) => {
    event.preventDefault();

    const password = passwordInput.value.trim();
    if (!password) {
      showError('パスワードを入力してください');
      return;
    }

    // ローディング状態
    setLoading(true);
    hideError();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        logger.success('認証成功');
        // ログイン成功 - メインページへリダイレクト
        window.location.hash = '#/login';
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

  form.addEventListener('submit', handleSubmit);

  // パスワード入力時にエラーを非表示
  passwordInput.addEventListener('input', hideError);

  // クリーンアップ関数
  return () => {
    form.removeEventListener('submit', handleSubmit);
    passwordInput.removeEventListener('input', hideError);
  };
}
