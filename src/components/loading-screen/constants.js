/**
 * ローディング画面エディターの定数定義
 */

// ===== 容量制限 =====
export const INDIVIDUAL_IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 2MB - 個別画像の最大サイズ
export const TOTAL_IMAGES_MAX_BYTES = 3 * 1024 * 1024;     // 3MB - 全画像の合計最大サイズ

// UI表示用の単位変換（MB）
export const INDIVIDUAL_IMAGE_MAX_MB = INDIVIDUAL_IMAGE_MAX_BYTES / (1024 * 1024);
export const TOTAL_IMAGES_MAX_MB = TOTAL_IMAGES_MAX_BYTES / (1024 * 1024);

// UI表示用ラベル
export const UI_MAX_SIZE_LABEL_INDIVIDUAL = `最大${INDIVIDUAL_IMAGE_MAX_MB}MB`;
export const UI_MAX_SIZE_LABEL_TOTAL = `最大${TOTAL_IMAGES_MAX_MB}MB`;

// ===== 許可されるMIMEタイプ =====
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif'
];

// ===== 画像形式表示テキスト =====
export const IMAGE_FORMAT_LABELS = {
  // 一般的な画像形式
  default: `JPG, PNG, WebP (${UI_MAX_SIZE_LABEL_INDIVIDUAL})`,
  
  // ガイド画面用（より多くの形式をサポート）
  guide: `PNG, JPG, GIF, WebP (${UI_MAX_SIZE_LABEL_INDIVIDUAL})`,
  
  // ロゴ用（透過PNG推奨）
  logo: `PNG, JPG, WebP (${UI_MAX_SIZE_LABEL_INDIVIDUAL}、透過PNG推奨)`,
  
  // サムネイル用
  thumbnail: `JPG, PNG, WebP (${UI_MAX_SIZE_LABEL_INDIVIDUAL})`
};

// ===== 圧縮設定 =====
export const COMPRESSION_SETTINGS = {
  // 通常圧縮
  default: {
    quality: 0.8,
    maxWidth: 1280,
    maxHeight: 720
  },
  
  // 強い圧縮（容量超過時）
  aggressive: {
    quality: 0.6,
    maxWidth: 1024,
    maxHeight: 576
  }
};

// ===== エラーメッセージテンプレート =====
export const ERROR_MESSAGES = {
  // 個別ファイルサイズ超過
  individualSizeExceeded: (actualMB) => 
    `ファイルサイズが大きすぎます（${actualMB}MB）\n\n${UI_MAX_SIZE_LABEL_INDIVIDUAL}以下のファイルを選択してください。`,
  
  // 合計サイズ超過
  totalSizeExceeded: (currentMB, newMB, totalMB) =>
    `画像の合計サイズが制限を超えます\n\n現在の使用量: ${currentMB}MB\n追加ファイル: ${newMB}MB\n合計予定: ${totalMB}MB\n制限: ${TOTAL_IMAGES_MAX_MB}MB\n\n既存の画像を削除してから追加してください。`,
  
  // 容量超過（保存時）
  saveCapacityExceeded: (sizeMB) =>
    `画像データが大きすぎます（${sizeMB}MB）\n\n画像なしで保存されました。\n\n📊 制限: ${TOTAL_IMAGES_MAX_MB}MB（全画像合計）\n\n💡 解決方法:\n• 画像を個別にアップロードし直す\n• より小さい画像を使用する（推奨: 各500KB以下）\n• 解像度を下げる（推奨: 1280x720以下）`,
  
  // 圧縮警告
  compressionWarning: (beforeMB, afterMB) =>
    `画像を圧縮して保存しました\n\n📊 圧縮前: ${beforeMB}MB\n📊 圧縮後: ${afterMB}MB\n💡 画質が少し低下した可能性があります`
};

// ===== 許可されるファイル拡張子 =====
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// ===== エラータイプ分類 =====
export const ERROR_TYPES = {
  // 画像容量系エラー（個別ファイルサイズ、合計サイズ超過）
  IMAGE_CAPACITY: 'image_capacity',
  
  // ブラウザストレージクォータ系エラー
  STORAGE_QUOTA: 'storage_quota',
  
  // 警告レベル（処理は成功したが注意が必要）
  WARNING: 'warning',
  
  // その他の一般的なエラー
  GENERAL: 'general'
};

// ===== デバッグフラグ =====
export const DEBUG = {
  compressionLogs: true,    // 圧縮ログの表示
  capacityLogs: true,       // 容量計算ログの表示
  storageUsageLogs: true    // ストレージ使用量ログの表示
};