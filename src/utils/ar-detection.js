// src/utils/ar-detection.js
// AR対応判定とブラウザサポート確認

import { createLogger } from './logger.js';

const arDetectionLogger = createLogger('ARDetection');

/**
 * デバイス・ブラウザのAR対応状況を詳細チェック
 * @returns {Promise<Object>} AR対応情報
 */
export async function checkARSupport() {
  arDetectionLogger.info('🔍 AR対応判定開始');
  
  const support = {
    webxr: false,
    arjs: false,
    camera: false,
    https: false,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    recommended: 'fallback',
    errors: [],
    deviceInfo: {
      mobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      ios: /iPad|iPhone|iPod/.test(navigator.userAgent),
      android: /Android/.test(navigator.userAgent),
      chrome: /Chrome/.test(navigator.userAgent),
      safari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
    }
  };

  // HTTPS確認
  support.https = location.protocol === 'https:';
  if (!support.https) {
    support.errors.push('HTTPS接続が必要です');
  }

  // カメラアクセス確認
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    support.camera = true;
    arDetectionLogger.info('✅ カメラアクセス: 対応');
  } else {
    support.camera = false;
    support.errors.push('カメラアクセスに対応していません');
    arDetectionLogger.warn('❌ カメラアクセス: 未対応');
  }

  // WebXR対応確認
  if (navigator.xr) {
    try {
      // immersive-ar セッション対応確認
      support.webxr = await navigator.xr.isSessionSupported('immersive-ar');
      if (support.webxr) {
        arDetectionLogger.info('✅ WebXR: 対応 (immersive-ar)');
      } else {
        arDetectionLogger.warn('❌ WebXR: セッションサポート未対応');
        support.errors.push('WebXR AR セッションに対応していません');
      }
    } catch (error) {
      arDetectionLogger.error('❌ WebXR: エラー発生', error.message);
      support.webxr = false;
      support.errors.push(`WebXR エラー: ${error.message}`);
    }
  } else {
    arDetectionLogger.warn('❌ WebXR: 未対応ブラウザ');
    support.webxr = false;
    support.errors.push('WebXRに対応していないブラウザです');
  }

  // AR.js対応確認（カメラ + HTTPS があれば基本対応）
  support.arjs = support.camera && support.https;
  if (support.arjs) {
    arDetectionLogger.info('✅ AR.js: 対応');
  } else {
    arDetectionLogger.warn('❌ AR.js: 未対応');
    if (!support.camera) support.errors.push('AR.jsにはカメラアクセスが必要です');
    if (!support.https) support.errors.push('AR.jsにはHTTPS接続が必要です');
  }

  // 推奨モード決定
  if (support.webxr && support.deviceInfo.android && support.deviceInfo.chrome) {
    support.recommended = 'webxr';
    arDetectionLogger.info('🌟 推奨モード: WebXR (マーカーレスAR)');
  } else if (support.arjs) {
    support.recommended = 'marker';
    arDetectionLogger.info('🎯 推奨モード: AR.js (マーカーAR)');
  } else {
    support.recommended = 'fallback';
    arDetectionLogger.info('🖥️ 推奨モード: 3Dビューア (フォールバック)');
  }

  // デバイス別の詳細情報
  const deviceDetail = getDeviceDetails(support.deviceInfo);
  support.deviceDetail = deviceDetail;

  arDetectionLogger.info('🔍 AR対応判定完了:', {
    webxr: support.webxr,
    arjs: support.arjs,
    recommended: support.recommended,
    device: deviceDetail.name,
    errors: support.errors.length
  });

  return support;
}

/**
 * デバイス詳細情報を取得
 * @param {Object} deviceInfo 基本デバイス情報
 * @returns {Object} 詳細デバイス情報
 */
function getDeviceDetails(deviceInfo) {
  let name = 'Unknown';
  let arCapability = 'basic';

  if (deviceInfo.ios) {
    if (navigator.userAgent.includes('iPhone')) {
      name = 'iPhone';
      // iPhone 12以降はARCore相当機能あり
      const version = getIOSVersion();
      arCapability = version >= 14 ? 'advanced' : 'basic';
    } else if (navigator.userAgent.includes('iPad')) {
      name = 'iPad';
      arCapability = 'advanced';
    }
  } else if (deviceInfo.android) {
    name = 'Android';
    // Android 7.0以降でARCore対応可能性
    arCapability = 'advanced';
  } else {
    name = 'Desktop';
    arCapability = 'emulator'; // WebXR Emulator使用想定
  }

  return {
    name,
    arCapability,
    mobile: deviceInfo.mobile,
    recommendedFallback: arCapability === 'basic' ? '3d' : 'ar'
  };
}

/**
 * iOSバージョンを取得
 * @returns {number} iOSメジャーバージョン
 */
function getIOSVersion() {
  const match = navigator.userAgent.match(/OS (\d+)_/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * AR機能の利用可能性をテスト
 * @param {string} arType 'webxr' | 'marker'
 * @returns {Promise<Object>} テスト結果
 */
export async function testARCapability(arType) {
  arDetectionLogger.info(`🧪 AR機能テスト開始: ${arType}`);
  
  const result = {
    success: false,
    error: null,
    duration: 0
  };

  const startTime = Date.now();

  try {
    if (arType === 'webxr') {
      // WebXRテスト
      if (!navigator.xr) {
        throw new Error('WebXR未対応');
      }
      
      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!supported) {
        throw new Error('immersive-ar セッション未対応');
      }

      result.success = true;
      arDetectionLogger.info('✅ WebXRテスト成功');
      
    } else if (arType === 'marker') {
      // カメラアクセステスト
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('カメラアクセス未対応');
      }

      // 実際のカメラアクセスはせず、APIの存在確認のみ
      result.success = true;
      arDetectionLogger.info('✅ AR.jsテスト成功');
    }

  } catch (error) {
    result.error = error.message;
    arDetectionLogger.error(`❌ ${arType}テスト失敗:`, error.message);
  }

  result.duration = Date.now() - startTime;
  arDetectionLogger.info(`🧪 ${arType}テスト完了: ${result.duration}ms`);

  return result;
}

/**
 * ユーザーフレンドリーなエラーメッセージを生成
 * @param {Object} support AR対応情報
 * @returns {Object} エラーメッセージ情報
 */
export function getARErrorMessages(support) {
  const messages = {
    primary: '',
    secondary: '',
    suggestions: []
  };

  if (!support.https) {
    messages.primary = 'HTTPS接続が必要です';
    messages.secondary = 'AR機能を使用するにはセキュアな接続が必要です';
    messages.suggestions.push('ブラウザのアドレスバーに「https://」が表示されているか確認してください');
  } else if (!support.camera) {
    messages.primary = 'カメラアクセスが利用できません';
    messages.secondary = 'このデバイスまたはブラウザではカメラ機能が制限されています';
    messages.suggestions.push('別のブラウザ（Chrome、Safari等）をお試しください');
    messages.suggestions.push('カメラのプライバシー設定を確認してください');
  } else if (!support.webxr && !support.arjs) {
    messages.primary = 'AR機能に対応していません';
    messages.secondary = 'このデバイス・ブラウザの組み合わせではAR機能を利用できません';
    messages.suggestions.push('3Dビューアモードで3Dモデルをご覧いただけます');
  } else {
    messages.primary = 'AR機能が利用可能です';
    messages.secondary = `推奨モード: ${support.recommended === 'webxr' ? 'マーカーレスAR' : 'マーカーAR'}`;
  }

  return messages;
}

// デバッグ用: 対応状況をコンソールに詳細出力
export async function logARSupportDetails() {
  arDetectionLogger.info('📋 =====  AR対応詳細情報  =====');
  
  const support = await checkARSupport();
  
  arDetectionLogger.info('🌐 ブラウザ情報:');
  arDetectionLogger.info(`   User Agent: ${support.userAgent}`);
  arDetectionLogger.info(`   Platform: ${support.platform}`);
  arDetectionLogger.info(`   Device: ${support.deviceDetail.name}`);
  
  arDetectionLogger.info('🔧 AR機能対応:');
  arDetectionLogger.info(`   WebXR: ${support.webxr ? '✅' : '❌'}`);
  arDetectionLogger.info(`   AR.js: ${support.arjs ? '✅' : '❌'}`);
  arDetectionLogger.info(`   Camera: ${support.camera ? '✅' : '❌'}`);
  arDetectionLogger.info(`   HTTPS: ${support.https ? '✅' : '❌'}`);
  
  arDetectionLogger.info('💡 推奨設定:');
  arDetectionLogger.info(`   推奨モード: ${support.recommended}`);
  arDetectionLogger.info(`   デバイス能力: ${support.deviceDetail.arCapability}`);
  
  if (support.errors.length > 0) {
    arDetectionLogger.warn('制限事項:');
    support.errors.forEach(error => arDetectionLogger.warn(`   - ${error}`));
  }
  
  arDetectionLogger.info('📋 ===========================');
  
  return support;
}