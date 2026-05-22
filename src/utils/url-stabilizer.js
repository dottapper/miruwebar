// src/utils/url-stabilizer.js
// QRコード URL安定化ユーティリティ（スケルトン）

import { createLogger } from './logger.js';

const logger = createLogger('URLStabilizer');

/**
 * URL生成タイプ
 */
export const URLType = {
  LOCAL: 'local',      // 同一ネットワーク内のローカルアクセス
  PUBLIC: 'public',    // インターネット公開用
  LOCALHOST: 'localhost' // 開発用ローカルホスト
};

/**
 * URL安定化クラス
 * QRコード生成の信頼性とURL検証を提供
 */
export class URLStabilizer {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || window.location.origin;
    this.publicDomain = options.publicDomain || null;
    this.fallbackDomain = options.fallbackDomain || 'localhost:3000';

    // URL生成設定
    this.urlSettings = {
      useHttps: window.location.protocol === 'https:',
      preservePort: true,
      validateUrls: true,
      maxRetries: 3
    };

    logger.debug('URL安定化クラス初期化', {
      baseUrl: this.baseUrl,
      publicDomain: this.publicDomain,
      settings: this.urlSettings
    });
  }

  /**
   * プロジェクト用のAR表示URLを生成
   * @param {string} projectId - プロジェクトID
   * @param {string} type - URL生成タイプ
   * @param {Object} options - 追加オプション
   * @returns {Promise<Object>} URL情報オブジェクト
   */
  async generateARViewerURL(projectId, type = URLType.LOCAL, options = {}) {
    try {
      logger.info('AR表示URL生成開始', { projectId, type, options });

      // プロジェクト存在確認（オプション）
      if (this.urlSettings.validateUrls && options.validateProject !== false) {
        const projectExists = await this.validateProjectExists(projectId);
        if (!projectExists) {
          logger.warn('プロジェクトが見つかりません', { projectId });
        }
      }

      // URL生成
      const urlInfo = await this.generateURLByType(projectId, type, options);

      // URL検証（オプション）
      if (this.urlSettings.validateUrls && options.skipValidation !== true) {
        urlInfo.isValid = await this.validateURL(urlInfo.viewerUrl);
      } else {
        urlInfo.isValid = true; // 検証スキップ時はtrueと見なす
      }

      logger.info('AR表示URL生成完了', urlInfo);
      return urlInfo;

    } catch (error) {
      logger.error('AR表示URL生成エラー', error);
      throw new Error(`URL生成に失敗しました: ${error.message}`);
    }
  }

  /**
   * タイプ別URL生成
   * @private
   * @param {string} projectId - プロジェクトID
   * @param {string} type - URL生成タイプ
   * @param {Object} options - オプション
   * @returns {Promise<Object>} URL情報
   */
  async generateURLByType(projectId, type, options) {
    const encodedProjectId = encodeURIComponent(projectId);

    switch (type) {
      case URLType.LOCAL:
        return await this.generateLocalURL(encodedProjectId, options);

      case URLType.PUBLIC:
        return await this.generatePublicURL(encodedProjectId, options);

      case URLType.LOCALHOST:
        return await this.generateLocalhostURL(encodedProjectId, options);

      default:
        throw new Error(`未対応のURLタイプ: ${type}`);
    }
  }

  /**
   * ローカルネットワーク用URL生成
   * @private
   */
  async generateLocalURL(projectId, options) {
    const localIP = await this.getLocalNetworkIP();
    const port = this.extractPort() || '3000';
    const scheme = this.urlSettings.useHttps ? 'https' : 'http';

    const baseHost = `${localIP}:${port}`;
    // ★ 相対パスに統一（同一オリジン保証）
    const projectJsonPath = `/projects/${projectId}/project.json`;
    // ✅ クエリ前置: ?src=/projects/...#/viewer の形式（相対パス）
    const viewerUrl = `${scheme}://${baseHost}/?src=${encodeURIComponent(projectJsonPath)}#/viewer`;

    return {
      type: URLType.LOCAL,
      viewerUrl,
      projectJsonUrl: `${scheme}://${baseHost}${projectJsonPath}`, // 参照用の絶対URL
      baseHost,
      description: '同一Wi-Fi内のデバイスからアクセス可能',
      instructions: 'このQRコードをスマホでスキャンしてください（同じWi-Fi内限定）',
      requiresHTTPS: this.urlSettings.useHttps,
      localIP
    };
  }

  /**
   * 公開用URL生成
   * @private
   */
  async generatePublicURL(projectId, options) {
    if (!this.publicDomain) {
      throw new Error('公開用ドメインが設定されていません。options.publicDomainを指定してください。');
    }

    const scheme = 'https'; // 公開用は常にHTTPS
    // ★ 相対パスに統一（同一オリジン保証）
    const projectJsonPath = `/projects/${projectId}/project.json`;
    // ✅ クエリ前置: ?src=/projects/...#/viewer の形式（相対パス）
    const viewerUrl = `${scheme}://${this.publicDomain}/?src=${encodeURIComponent(projectJsonPath)}#/viewer`;

    return {
      type: URLType.PUBLIC,
      viewerUrl,
      projectJsonUrl: `${scheme}://${this.publicDomain}${projectJsonPath}`, // 参照用の絶対URL
      baseHost: this.publicDomain,
      description: 'インターネット経由でアクセス可能',
      instructions: 'このQRコードは世界中のどこからでもアクセス可能です',
      requiresHTTPS: true,
      publicDomain: this.publicDomain
    };
  }

  /**
   * ローカルホスト用URL生成
   * @private
   */
  async generateLocalhostURL(projectId, options) {
    const port = this.extractPort() || '3000';
    const scheme = this.urlSettings.useHttps ? 'https' : 'http';

    const baseHost = `localhost:${port}`;
    // ★ 相対パスに統一（同一オリジン保証）
    const projectJsonPath = `/projects/${projectId}/project.json`;
    // ✅ クエリ前置: ?src=/projects/...#/viewer の形式（相対パス）
    const viewerUrl = `${scheme}://${baseHost}/?src=${encodeURIComponent(projectJsonPath)}#/viewer`;

    return {
      type: URLType.LOCALHOST,
      viewerUrl,
      projectJsonUrl: `${scheme}://${baseHost}${projectJsonPath}`, // 参照用の絶対URL
      baseHost,
      description: '開発用ローカルホストアクセス',
      instructions: 'このQRコードは開発用です（localhost限定）',
      requiresHTTPS: this.urlSettings.useHttps,
      isDevOnly: true
    };
  }

  /**
   * ローカルネットワークIP取得
   *
   * スマホ実機テスト用QRに埋め込むため、開発機のLAN IPを確実に取得する。
   * 固定IPを推測するとアクセス不能なQRが生成されるため、検出失敗時は
   * localhost を返して問題が明示されるようにする。
   *
   * @private
   * @returns {Promise<string>} ローカルIP（取得不能時は 'localhost'）
   */
  async getLocalNetworkIP() {
    // 1) すでに LAN ホスト/IP でページを開いている場合はそれをそのまま使う
    const currentHost = window.location.hostname;
    if (currentHost && currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      logger.debug('現在のhostnameをローカルIPとして使用', { currentHost });
      return currentHost;
    }

    // 2) 開発サーバーの /api/network-info から実IPを取得（最も信頼できる）
    try {
      const response = await fetch('/api/network-info', { method: 'GET', cache: 'no-cache' });
      if (response.ok) {
        const data = await response.json();
        const ip = data && data.networkIP;
        if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
          logger.info('network-info API からローカルIPを取得', { ip });
          return ip;
        }
      }
    } catch (error) {
      logger.debug('network-info API が利用できません（WebRTCにフォールバック）', { error: error.message });
    }

    // 3) WebRTC でプライベートIPを検出（ベストエフォート）
    const webrtcIP = await this.detectIPViaWebRTC();
    if (webrtcIP) {
      logger.info('WebRTC でローカルIPを検出', { webrtcIP });
      return webrtcIP;
    }

    // 4) 検出失敗: 固定IPを推測せず localhost を返す（誤ったQRを避ける）
    logger.warn('ローカルIPの自動検出に失敗しました。localhost を使用します（スマホからはアクセスできません）');
    return 'localhost';
  }

  /**
   * WebRTC を用いてプライベートIPv4アドレスを検出する（ベストエフォート）
   * @private
   * @returns {Promise<string|null>} 検出したプライベートIP、失敗時は null
   */
  async detectIPViaWebRTC() {
    return new Promise((resolve) => {
      let rtc;
      try {
        rtc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
      } catch (error) {
        logger.debug('RTCPeerConnection の生成に失敗', { error: error.message });
        resolve(null);
        return;
      }

      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        try { rtc.close(); } catch (_) { /* noop */ }
        resolve(value);
      };

      // 172.16.0.0〜172.31.255.255 を含むプライベートIPv4判定
      const isPrivateIPv4 = (ip) => {
        if (ip.startsWith('192.168.') || ip.startsWith('10.')) return true;
        if (ip.startsWith('172.')) {
          const second = parseInt(ip.split('.')[1], 10);
          return second >= 16 && second <= 31;
        }
        return false;
      };

      rtc.onicecandidate = (event) => {
        if (!event.candidate) return;
        const match = event.candidate.candidate.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        if (match && isPrivateIPv4(match[1])) {
          finish(match[1]);
        }
      };

      rtc.createDataChannel('');
      rtc.createOffer()
        .then((offer) => rtc.setLocalDescription(offer))
        .catch(() => finish(null));

      // 3秒で打ち切り
      setTimeout(() => finish(null), 3000);
    });
  }

  /**
   * 現在のポート番号抽出
   * @private
   * @returns {string|null} ポート番号
   */
  extractPort() {
    return window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
  }

  /**
   * プロジェクト存在確認
   * @private
   * @param {string} projectId - プロジェクトID
   * @returns {Promise<boolean>} 存在するかどうか
   */
  async validateProjectExists(projectId) {
    try {
      // IndexedDBまたはローカルストレージでプロジェクト確認
      // 実装はプロジェクトストレージシステムに依存
      logger.debug('プロジェクト存在確認（スケルトン）', { projectId });
      return true; // スケルトン実装では常にtrueを返す
    } catch (error) {
      logger.warn('プロジェクト存在確認失敗', error);
      return false;
    }
  }

  /**
   * URL到達性確認
   * @private
   * @param {string} url - 確認するURL
   * @returns {Promise<boolean>} 到達可能かどうか
   */
  async validateURL(url) {
    try {
      // HEADリクエストでURL到達性を確認
      const response = await fetch(url, {
        method: 'HEAD',
        timeout: 5000,
        mode: 'no-cors' // CORS制約を回避
      });
      return response.ok || response.type === 'opaque';
    } catch (error) {
      logger.debug('URL検証失敗（継続）', { url, error: error.message });
      return false; // 到達不可でもエラーにはしない
    }
  }

  /**
   * 複数URL生成（フォールバック対応）
   * @param {string} projectId - プロジェクトID
   * @param {Object} options - オプション
   * @returns {Promise<Array>} URL情報配列
   */
  async generateMultipleURLs(projectId, options = {}) {
    const types = options.types || [URLType.LOCAL, URLType.LOCALHOST];
    const results = [];

    for (const type of types) {
      try {
        const urlInfo = await this.generateARViewerURL(projectId, type, {
          ...options,
          skipValidation: true // 複数生成時は検証スキップ
        });
        results.push(urlInfo);
      } catch (error) {
        logger.warn(`${type} URL生成失敗`, error);
      }
    }

    return results;
  }

  /**
   * 設定更新
   * @param {Object} newSettings - 新しい設定
   */
  updateSettings(newSettings) {
    this.urlSettings = { ...this.urlSettings, ...newSettings };
    logger.debug('URL設定更新', this.urlSettings);
  }
}

/**
 * ファクトリー関数
 * @param {Object} options - オプション
 * @returns {URLStabilizer} インスタンス
 */
export function createURLStabilizer(options = {}) {
  return new URLStabilizer(options);
}

export default URLStabilizer;