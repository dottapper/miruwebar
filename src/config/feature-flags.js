// src/config/feature-flags.js
/**
 * 開発用機能フラグ
 * 開発時のみ有効化される強制表示オプション
 */

// Vite の import.meta.env.DEV は開発サーバー時に true、本番ビルド時に false
const isDev = typeof import.meta !== 'undefined' && import.meta.env ? !!import.meta.env.DEV : false;

/**
 * 開発時に全画面（スタート→ローディング→ガイド）を強制表示
 * 本番では false にする
 */
export const DEV_FORCE_SCREENS = isDev;

/**
 * 詳細な適用ログを出力
 */
export const DEV_VERBOSE_LOGS = isDev;

/**
 * デフォルトUIへのフォールバックを許可しない（エラーで停止）
 * true だとフェッチ失敗時に例外がスローされ全体が停止するため、
 * 本番では必ず false にする。
 */
export const DEV_STRICT_MODE = false;

/**
 * ビューア適用を強制（統合UIのレイアウト抑制を無効化）
 */
export const DEV_APPLY_OVERRIDE = isDev;

/**
 * 統合UI（takeover）を有効化するか（デフォルト無効）
 */
export const DEV_TAKEOVER_UI = false;

export default {
  DEV_FORCE_SCREENS,
  DEV_VERBOSE_LOGS,
  DEV_STRICT_MODE,
  DEV_APPLY_OVERRIDE,
  DEV_TAKEOVER_UI
};
