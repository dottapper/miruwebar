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
 * 注: 開発中は false にして重複を警告のみにする
 */
export const DEV_STRICT_MODE = true;

/**
 * ビューア適用を強制（統合UIのレイアウト抑制を無効化）
 */
export const DEV_APPLY_OVERRIDE = true;

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
