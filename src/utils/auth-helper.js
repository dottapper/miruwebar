// src/utils/auth-helper.js
// フロントエンド側の認証ヘルパー

import { createLogger } from './logger.js';

const logger = createLogger('AuthHelper');

/**
 * 認証状態をチェック
 * @returns {Promise<{authenticated: boolean, authRequired: boolean}>}
 */
export async function checkAuth() {
  try {
    const response = await fetch('/api/auth/check', {
      method: 'GET',
      credentials: 'same-origin',
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }

    // レスポンスがエラーの場合は未認証として扱う
    return { authenticated: false, authRequired: true };
  } catch (error) {
    logger.error('認証チェックエラー', error);
    // ネットワークエラーの場合は認証不要として扱う（開発便宜）
    return { authenticated: false, authRequired: false };
  }
}

/**
 * ログアウト処理
 * @returns {Promise<boolean>} ログアウト成功したかどうか
 */
export async function logout() {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    });

    if (response.ok) {
      logger.success('ログアウト成功');
      return true;
    }

    logger.warn('ログアウト失敗', response.status);
    return false;
  } catch (error) {
    logger.error('ログアウトエラー', error);
    return false;
  }
}

/**
 * 認証が必要なページで認証チェックを行い、未認証ならリダイレクト
 * @returns {Promise<boolean>} 認証済みかどうか
 */
export async function requireAuth() {
  const { authenticated, authRequired } = await checkAuth();

  if (!authRequired) {
    // 認証が不要な環境（AUTH_SECRET未設定）
    return true;
  }

  if (!authenticated) {
    logger.info('未認証のため認証ページへリダイレクト');
    window.location.hash = '#/login';
    return false;
  }

  return true;
}

/**
 * 認証済みの場合はメインページへリダイレクト（認証ページ用）
 * @returns {Promise<boolean>} 未認証かどうか（認証ページを表示すべきか）
 */
export async function redirectIfAuthenticated() {
  const { authenticated, authRequired } = await checkAuth();

  if (!authRequired) {
    // 認証が不要な環境 - ログインページを表示
    window.location.hash = '#/login';
    return false;
  }

  if (authenticated) {
    logger.info('認証済みのためメインページへリダイレクト');
    window.location.hash = '#/projects';
    return false;
  }

  return true;
}

export default {
  checkAuth,
  logout,
  requireAuth,
  redirectIfAuthenticated,
};
