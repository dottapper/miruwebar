// src/utils/webxr-support.js
// WebXR対応判定の標準API準拠ユーティリティ

import { createLogger } from './logger.js';

const logger = createLogger('WebXRSupport');

/**
 * @typedef {Object} XRSupport
 * @property {boolean} supported - WebXR対応状況
 * @property {string} [reason] - 非対応の理由
 */

/**
 * セッション中のWebXRサポート結果をメモ化
 * 毎フレーム呼び出しを避けるためのキャッシュ
 */
let cachedSupport = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30秒間キャッシュ

/**
 * WebXRサポート状況を標準APIで確認（メモ化付き）
 * @returns {Promise<XRSupport>} サポート状況
 */
export async function checkXRSupport() {
  const now = Date.now();

  // キャッシュが有効な場合は即座に返す
  if (cachedSupport && (now - cacheTimestamp) < CACHE_DURATION) {
    logger.debug('WebXRサポート確認: キャッシュヒット', cachedSupport);
    return cachedSupport;
  }

  logger.debug('WebXRサポート確認開始');

  try {
    // Step 1: navigator.xr の存在確認
    if (!('xr' in navigator)) {
      const result = {
        supported: false,
        reason: 'navigator.xr not present (非対応ブラウザ)'
      };
      return cacheResult(result);
    }

    // Step 2: セキュアコンテキスト確認
    if (!window.isSecureContext) {
      const result = {
        supported: false,
        reason: 'HTTPS required for WebXR (HTTPSが必要)'
      };
      return cacheResult(result);
    }

    // Step 3: immersive-ar セッション対応確認
    const xr = navigator.xr;
    const isSupported = await xr.isSessionSupported('immersive-ar');

    const result = {
      supported: !!isSupported,
      reason: isSupported ? undefined : 'immersive-ar セッション非対応'
    };

    logger.info('WebXRサポート確認完了', result);
    return cacheResult(result);

  } catch (error) {
    const result = {
      supported: false,
      reason: `WebXR判定エラー: ${error.message}`
    };

    logger.warn('WebXRサポート確認失敗', { error: error.message, stack: error.stack });
    return cacheResult(result);
  }
}

/**
 * 結果をキャッシュして返す
 * @private
 */
function cacheResult(result) {
  cachedSupport = result;
  cacheTimestamp = Date.now();
  return result;
}

/**
 * キャッシュをクリア（テスト用）
 */
export function clearXRSupportCache() {
  cachedSupport = null;
  cacheTimestamp = 0;
  logger.debug('WebXRサポートキャッシュクリア');
}

/**
 * WebXRサポート状況の詳細情報を取得
 * @returns {Promise<Object>} 詳細情報
 */
export async function getXRSupportDetails() {
  const support = await checkXRSupport();

  const details = {
    ...support,
    userAgent: navigator.userAgent,
    isSecureContext: window.isSecureContext,
    hasNavigatorXR: 'xr' in navigator,
    timestamp: new Date().toISOString()
  };

  // WebXR が利用可能な場合、追加情報を取得
  if (support.supported && navigator.xr) {
    try {
      // 利用可能なセッションモードを確認
      const sessionModes = ['inline', 'immersive-vr', 'immersive-ar'];
      const supportedModes = [];

      for (const mode of sessionModes) {
        try {
          const isSupported = await navigator.xr.isSessionSupported(mode);
          if (isSupported) {
            supportedModes.push(mode);
          }
        } catch (e) {
          // 個別モードのエラーは無視
        }
      }

      details.supportedSessionModes = supportedModes;
    } catch (e) {
      logger.debug('セッションモード詳細取得エラー', e);
    }
  }

  return details;
}

/**
 * WebXR非対応時のフォールバック推奨を取得
 * @param {XRSupport} support - サポート状況
 * @returns {Object} フォールバック情報
 */
export function getRecommendedFallback(support) {
  if (support.supported) {
    return {
      type: 'webxr',
      message: 'WebXRマーカーレスARが利用可能です',
      action: 'WebXRセッションを開始'
    };
  }

  // ユーザーエージェント判定によるフォールバック推奨
  const userAgent = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isChrome = /Chrome/i.test(userAgent);

  if (isIOS && isSafari) {
    return {
      type: 'marker',
      message: 'iPhone SafariではマーカーARが利用可能です',
      action: 'マーカーARでスキャン開始',
      detail: 'Hiroマーカーをカメラにかざしてください'
    };
  }

  if (isAndroid && isChrome) {
    return {
      type: 'webxr-fallback',
      message: 'Chrome for AndroidでWebXRが利用できません',
      action: 'マーカーARまたは簡易ビューを選択',
      detail: 'Chrome設定でARサポートを確認してください'
    };
  }

  // デスクトップまたは不明なブラウザ
  return {
    type: 'camera-3d',
    message: 'カメラ背景の3D表示が利用可能です',
    action: '簡易ARビューで開始',
    detail: 'マーカーまたは空間認識なしの3D表示'
  };
}

export default {
  checkXRSupport,
  clearXRSupportCache,
  getXRSupportDetails,
  getRecommendedFallback
};