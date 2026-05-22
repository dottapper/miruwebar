// src/utils/tunnel-url.js
// トンネルURL（ngrok / Cloudflare Tunnel など）の管理ユーティリティ。
//
// 設計方針: トンネルURLは自動取得しない。取得方法がツールごとに異なり、
// ブラウザから安全に共通取得する手段がないため、「設定値として渡す」のが確実。
// 優先順位は localStorage（QRモーダルの入力欄） > 環境変数。

import { createLogger } from './logger.js';

const logger = createLogger('TunnelURL');

const STORAGE_KEY = 'miruwebar:tunnelBaseUrl';

/**
 * URL文字列を origin（scheme + host）に正規化する。
 * パス・クエリ・ハッシュ・末尾スラッシュは除去する。
 * @param {string} url
 * @returns {string} 正規化済みのベースURL。不正な場合は空文字。
 */
export function normalizeBaseUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let s = url.trim();
  if (!s) return '';
  // scheme 省略時は https を補う
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return `${u.protocol}//${u.host}`;
  } catch (_) {
    return '';
  }
}

/**
 * localStorage に保存済みのトンネルURLを取得する。
 * @returns {string}
 */
export function getStoredTunnelUrl() {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch (_) {
    return '';
  }
}

/**
 * トンネルURLを localStorage に保存する。
 * @param {string} url - 入力されたURL
 * @returns {string} 正規化して保存したURL（不正な場合は空文字）
 */
export function setStoredTunnelUrl(url) {
  const base = normalizeBaseUrl(url);
  try {
    if (base) {
      localStorage.setItem(STORAGE_KEY, base);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    logger.warn('トンネルURLの保存に失敗', { error: e.message });
  }
  return base;
}

/**
 * 環境変数からトンネルURLを取得する。
 * Vite ではクライアントに公開されるのは VITE_ プレフィックス付きのみ。
 * @returns {string}
 */
export function getEnvTunnelUrl() {
  try {
    const env = import.meta.env || {};
    return normalizeBaseUrl(env.VITE_PUBLIC_TUNNEL_URL || env.PUBLIC_TUNNEL_URL || '');
  } catch (_) {
    return '';
  }
}

/**
 * 有効なトンネルのベースURLを取得する（保存値 > 環境変数）。
 * @returns {string} ベースURL。未設定なら空文字。
 */
export function getTunnelBaseUrl() {
  return getStoredTunnelUrl() || getEnvTunnelUrl() || '';
}

/**
 * トンネルURL経由のARビューアURLを組み立てる。
 * @param {string} projectId
 * @returns {string} ビューアURL。トンネル未設定なら空文字。
 */
export function buildTunnelViewerUrl(projectId) {
  const base = getTunnelBaseUrl();
  if (!base || !projectId) return '';
  const projectJsonUrl = `${base}/projects/${encodeURIComponent(projectId)}/project.json`;
  return `${base}/#/viewer?src=${encodeURIComponent(projectJsonUrl)}`;
}
