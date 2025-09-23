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
    const projectJsonUrl = `${scheme}://${baseHost}/projects/${projectId}/project.json`;
    const viewerUrl = `${scheme}://${baseHost}/#/viewer?src=${encodeURIComponent(projectJsonUrl)}`;

    return {
      type: URLType.LOCAL,
      viewerUrl,
      projectJsonUrl,
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
    const projectJsonUrl = `${scheme}://${this.publicDomain}/projects/${projectId}/project.json`;
    const viewerUrl = `${scheme}://${this.publicDomain}/#/viewer?src=${encodeURIComponent(projectJsonUrl)}`;

    return {
      type: URLType.PUBLIC,
      viewerUrl,
      projectJsonUrl,
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
    const projectJsonUrl = `${scheme}://${baseHost}/projects/${projectId}/project.json`;
    const viewerUrl = `${scheme}://${baseHost}/#/viewer?src=${encodeURIComponent(projectJsonUrl)}`;

    return {
      type: URLType.LOCALHOST,
      viewerUrl,
      projectJsonUrl,
      baseHost,
      description: '開発用ローカルホストアクセス',
      instructions: 'このQRコードは開発用です（localhost限定）',
      requiresHTTPS: this.urlSettings.useHttps,
      isDevOnly: true
    };
  }

  /**
   * ローカルネットワークIP取得
   * @private
   * @returns {Promise<string>} ローカルIP
   */
  async getLocalNetworkIP() {
    try {
      // WebRTC接続を利用したIP取得（一般的な手法）
      const rtc = new RTCPeerConnection({ iceServers: [] });

      return new Promise((resolve) => {
        rtc.createDataChannel('');

        rtc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate;
            const ipMatch = candidate.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
            if (ipMatch && !ipMatch[1].startsWith('127.')) {
              resolve(ipMatch[1]);
              rtc.close();
            }
          }
        };

        rtc.createOffer().then(offer => rtc.setLocalDescription(offer));

        // フォールバック（3秒後）
        setTimeout(() => {
          resolve('192.168.1.100'); // デフォルトIP
          rtc.close();
        }, 3000);
      });

    } catch (error) {
      logger.warn('ローカルIP取得エラー、フォールバック使用', error);
      return '192.168.1.100'; // フォールバック
    }
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