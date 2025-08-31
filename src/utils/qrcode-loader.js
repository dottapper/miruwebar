// src/utils/qrcode-loader.js
// QRCodeライブラリの遅延読み込みと管理

import { logger } from './logger.js';

// QRCodeライブラリの遅延読み込み
let QRCode = null;
let isLoading = false;
let loadPromise = null;

/**
 * QRCodeライブラリを遅延読み込み
 * @returns {Promise<Object>} QRCodeライブラリ
 */
export async function loadQRCode() {
  // 既に読み込み済みの場合は即座に返す
  if (QRCode) {
    return QRCode;
  }

  // 読み込み中の場合は既存のPromiseを返す
  if (isLoading && loadPromise) {
    return loadPromise;
  }

  // 読み込み開始
  isLoading = true;
  loadPromise = (async () => {
    try {
      logger.loading('QRCodeライブラリを読み込み中...');
      
      const qrcodeModule = await import('qrcode');
      QRCode = qrcodeModule.default;
      
      logger.success('QRCodeライブラリの読み込みが完了しました');
      return QRCode;
    } catch (error) {
      logger.error('QRCodeライブラリの読み込みに失敗しました', error);
      QRCode = null;
      throw new Error(`QRCodeライブラリの読み込みに失敗しました: ${error.message}`);
    } finally {
      isLoading = false;
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/**
 * QRCodeライブラリが読み込み済みかどうかを確認
 * @returns {boolean} 読み込み済みの場合true
 */
export function isQRCodeLoaded() {
  return QRCode !== null;
}

/**
 * QRCodeライブラリをリセット（テスト用）
 */
export function resetQRCode() {
  QRCode = null;
  isLoading = false;
  loadPromise = null;
}
