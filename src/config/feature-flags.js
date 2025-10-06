// src/config/feature-flags.js
/**
 * 開発用機能フラグ
 * 開発時のみ有効化される強制表示オプション
 */

/**
 * 開発時に全画面（スタート→ローディング→ガイド）を強制表示
 * 本番では false にする
 */
export const DEV_FORCE_SCREENS = true;

/**
 * 詳細な適用ログを出力
 */
export const DEV_VERBOSE_LOGS = true;

/**
 * デフォルトUIへのフォールバックを許可しない（エラーで停止）
 */
export const DEV_STRICT_MODE = false;

export default {
  DEV_FORCE_SCREENS,
  DEV_VERBOSE_LOGS,
  DEV_STRICT_MODE
};
