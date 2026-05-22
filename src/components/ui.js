// src/components/ui.js

import { showMarkerUpload } from '../views/marker-upload.js';
import { getProject, loadProjectWithModels, exportProjectBundleById } from '../api/projects.js';
import { settingsAPI } from './loading-screen/settings.js';
import { loadQRCode } from '../utils/qrcode-loader.js';
import { createLogger } from '../utils/logger.js';
import { createURLStabilizer, URLType } from '../utils/url-stabilizer.js';
import { normalizeProjectData, reportSizeReduction } from '../utils/project-data-normalizer.js';
import { publishRelease } from '../storage/storage-provider.js';
import { getTunnelBaseUrl, getStoredTunnelUrl, setStoredTunnelUrl, buildTunnelViewerUrl } from '../utils/tunnel-url.js';
import { updateProjectPublishInfo } from '../storage/project-store.js';
import { security } from '../utils/security-manager.js';

// UI専用ロガーを作成
const uiLogger = createLogger('UI');

/**
 * 新規プロジェクト作成用のモーダルポップアップを表示する
 */
export function showNewProjectModal() {
    // モーダルの背景（オーバーレイ）要素を作成
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    // モーダルのコンテンツを設定
    modalOverlay.innerHTML = `
  <div class="modal-content">
    <h2>新規プロジェクト作成</h2>
    
    <div class="ar-type-grid">
      <button class="ar-type-button" data-type="marker">
        マーカー型AR
      </button>
      <button class="ar-type-button" data-type="markerless">
        マーカーレスAR
      </button>
      <button class="ar-type-button" data-type="location">
        ロケーションベースAR
      </button>
      <button class="ar-type-button" data-type="object">
        物体認識型AR
      </button>
      <button class="ar-type-button" data-type="face">
        フェイスタイプAR
      </button>
      <button class="ar-type-button" data-type="faceswitch">
        FaceSwitch AR（ベータ）
      </button>
    </div>
    
    <button id="close-modal" class="cancel-button">キャンセル</button>
  </div>
`;
    
    // モーダルをDOMに追加
    document.body.appendChild(modalOverlay);
    
    // 各ARタイプボタンにイベントリスナーを設定
    const arTypeButtons = document.querySelectorAll('.ar-type-button');
    arTypeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const arType = button.dataset.type;
        
        // マーカー型ARの場合は、マーカーアップロード画面を表示
        if (arType === 'marker') {
          closeModal();
          showMarkerUpload();
        } else {
          // それ以外のARタイプは直接エディタ画面へ遷移
          window.location.hash = `#/editor?type=${arType}`;
          closeModal();
        }
      });
    });
    
    // キャンセルボタンにイベントリスナーを設定
    document.getElementById('close-modal').addEventListener('click', closeModal);
    
    // モーダル背景をクリックした時にも閉じるようにする
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
    
    // モーダルを閉じる関数
    function closeModal() {
      document.body.removeChild(modalOverlay);
    }
  }
  
  /**
   * 確認ダイアログを表示する汎用関数
   * @param {string} message - 表示するメッセージ
   * @param {Function} onConfirm - 確認時のコールバック
   * @param {Function} onCancel - キャンセル時のコールバック
   */
  export function showConfirmDialog(message, onConfirm, onCancel) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    modalOverlay.innerHTML = `
      <div class="modal-content confirm-dialog">
        <p>${security.escape(message)}</p>
        <div class="button-group">
          <button id="confirm-yes" class="primary-button">はい</button>
          <button id="confirm-no" class="cancel-button">いいえ</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modalOverlay);
    
    document.getElementById('confirm-yes').addEventListener('click', () => {
      if (onConfirm) onConfirm();
      document.body.removeChild(modalOverlay);
    });
    
    document.getElementById('confirm-no').addEventListener('click', () => {
      if (onCancel) onCancel();
      document.body.removeChild(modalOverlay);
    });
  }
  
  /**
   * プロジェクトの各種操作メニューを表示する
   * @param {Object} project - プロジェクトデータ
   * @param {HTMLElement} triggerElement - メニュー表示のトリガー要素
   */
  export function showProjectMenu(project, triggerElement) {
    // まず既存のメニューがあれば閉じる
    document.querySelectorAll('.project-menu').forEach(menu => {
      document.body.removeChild(menu);
    });
    
    // メニュー要素を作成
    const menu = document.createElement('div');
    menu.className = 'project-menu';
    
    // メニュー位置を設定
    const rect = triggerElement.getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY}px`;
    menu.style.left = `${rect.left + window.scrollX}px`;
    
    // メニュー項目を設定
    menu.innerHTML = `
      <div class="menu-item" data-action="edit">編集</div>
      <div class="menu-item" data-action="duplicate">複製</div>
      <div class="menu-item" data-action="export">エクスポート</div>
      <div class="menu-item" data-action="share">共有</div>
      <div class="menu-item danger" data-action="delete">削除</div>
    `;
    
    // メニューをDOMに追加
    document.body.appendChild(menu);
    
    // 各メニュー項目のイベントリスナーを設定
    menu.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        
        if (action === 'edit') {
          window.location.hash = `#/editor?id=${project.id}`;
        } else if (action === 'duplicate') {
          alert(`「${project.title}」を複製します`);
        } else if (action === 'export') {
          // プロジェクトエクスポート機能
          exportProject(project);
        } else if (action === 'share') {
          alert(`「${project.title}」を共有します`);
        } else if (action === 'delete') {
          showConfirmDialog(
            `「${project.title}」を削除してもよろしいですか？`,
            () => {
              alert(`「${project.title}」を削除しました`);
              // 実際には削除APIを呼び出し
            }
          );
        }
        
        // メニューを閉じる
        document.body.removeChild(menu);
      });
    });
    
    // メニュー外をクリックした時にメニューを閉じる
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target) && e.target !== triggerElement) {
        document.body.removeChild(menu);
        document.removeEventListener('click', closeMenu);
      }
    });
  }

  /**
   * プロジェクト保存用のモーダルを表示する
   * @param {Object} options - モーダルのオプション
   * @param {Function} callback - 保存時のコールバック
   */
  export function showSaveProjectModal(options = {}, callback) {
    const { isEdit = false, projectId = null, currentName = '', currentDescription = '' } = options;
    
    uiLogger.log('📝 showSaveProjectModal 呼び出し:', {
      isEdit,
      projectId,
      currentName,
      currentDescription,
      optionsType: typeof options
    });
    
    // モーダルの背景（オーバーレイ）要素を作成
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    // モーダルのコンテンツを設定
    modalOverlay.innerHTML = `
        <div class="modal-content">
            <h2>${isEdit ? 'プロジェクトを保存' : '新規プロジェクトとして保存'}</h2>
            
            <form id="save-project-form">
                <div class="form-group">
                    <label for="project-name">プロジェクト名:</label>
                    <input type="text" id="project-name" value="${security.escapeAttr(currentName)}" placeholder="プロジェクト名を入力" required>
                </div>
                
                <div class="form-group">
                    <label for="project-description">説明（任意）:</label>
                    <textarea id="project-description" placeholder="プロジェクトの説明を入力">${security.escape(currentDescription)}</textarea>
                </div>
                
                <div class="form-actions">
                    <button type="button" id="cancel-save" class="btn-secondary">キャンセル</button>
                    <button type="submit" id="confirm-save" class="btn-primary">保存</button>
                </div>
            </form>
        </div>
    `;
    
    uiLogger.log('🔍 生成されたHTML input value:', {
      nameInputHTML: `<input type="text" id="project-name" value="${currentName}" placeholder="プロジェクト名を入力" required>`,
      descriptionHTML: `<textarea id="project-description" placeholder="プロジェクトの説明を入力">${currentDescription}</textarea>`
    });
    
    // モーダルをDOMに追加
    document.body.appendChild(modalOverlay);
    
    // DOM追加後の実際の値を確認
    const nameInput = document.getElementById('project-name');
    const descriptionInput = document.getElementById('project-description');
    uiLogger.log('🔍 DOM追加後の実際の値:', {
      nameValue: nameInput?.value,
      descriptionValue: descriptionInput?.value
    });
    
    // フォーム送信処理
    const form = document.getElementById('save-project-form');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const projectName = nameInput.value.trim();
        if (!projectName) {
            alert('プロジェクト名を入力してください。');
            nameInput.focus();
            return;
        }
        
        // コールバック関数を呼び出し
        if (typeof callback === 'function') {
            callback({
                id: projectId || Date.now().toString(),
                name: projectName,
                description: descriptionInput.value.trim()
            });
        }
        
        // モーダルを閉じる
        document.body.removeChild(modalOverlay);
    });
    
    // キャンセルボタン処理
    document.getElementById('cancel-save').addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
    });
    
    // モーダル背景をクリックした時にも閉じる
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
    });
    
    // 初期フォーカス
    setTimeout(() => {
        nameInput.focus();
        nameInput.select();
    }, 100);
  }

  /**
   * QRコード表示用のモーダルを表示する
   * @param {Object} options - モーダルのオプション
   */
  /**
   * ローカルネットワークIP取得用関数（動的IP検出）
   */
  async function getLocalNetworkIP() {
    uiLogger.log('🔍 IP検出開始 - 動的ネットワークIP取得');
    
    // 現在のhostnameがlocalhostでない場合はそれを使用
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      uiLogger.log('🌐 現在のhostnameを使用:', window.location.hostname);
      return window.location.hostname;
    }
    
    // Method 1: WebRTCでIP検出を試行（改良版）
    const webrtcIP = await getWebRTCIP();
    if (webrtcIP) {
      uiLogger.log('✅ WebRTC IP検出成功:', webrtcIP);
      return webrtcIP;
    }
    
    // Method 2: Viteサーバー情報APIを試行
    const viteIP = await getViteNetworkIP();
    if (viteIP) {
      uiLogger.log('✅ Vite Network IP検出成功:', viteIP);
      return viteIP;
    }
    
    // Method 3: 一般的なネットワーク範囲をチェック
    const commonIP = await detectCommonNetworkIP();
    if (commonIP) {
      uiLogger.log('✅ 一般的なネットワークIP検出成功:', commonIP);
      return commonIP;
    }
    
    // フォールバック: window.location.hostnameを使用してlocalhostを避ける
    if (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      uiLogger.log('✅ window.location.hostnameを使用:', window.location.hostname);
      return window.location.hostname;
    }
    
    // 最後のフォールバック: localhost（スマホからアクセス不可だが、他に選択肢がない場合）
    console.warn('⚠️ IP自動検出に失敗、localhostを使用（スマホからアクセス不可）');
    return 'localhost';
  }

  /**
   * WebRTCを使用したIP検出（改良版）
   */
  async function getWebRTCIP() {
    return new Promise((resolve) => {
      const rtc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      let resolved = false;
      let detectedIPs = [];
      
      rtc.createDataChannel('');
      
      rtc.onicecandidate = (e) => {
        if (!e.candidate || resolved) return;
        
        const candidate = e.candidate.candidate;
        const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
        
        if (ipMatch) {
          const ip = ipMatch[1];
          // ローカルネットワークIPを優先（192.168.x.x, 10.x.x.x, 172.16-31.x.x）
          if (ip.startsWith('192.168.') || ip.startsWith('10.') || 
              (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31)) {
            if (!detectedIPs.includes(ip)) {
              detectedIPs.push(ip);
              uiLogger.log('🌐 WebRTC検出IP:', ip);
              
              // 最初のローカルIPで即座に解決
              resolved = true;
              rtc.close();
              resolve(ip);
            }
          }
        }
      };
      
      rtc.createOffer().then(offer => rtc.setLocalDescription(offer)).catch(() => {});
      
      // タイムアウト（3秒に延長）
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          rtc.close();
          resolve(null);
        }
      }, 3000);
    });
  }

  /**
   * Viteサーバーのネットワーク情報を取得
   */
  async function getViteNetworkIP() {
    try {
      // Viteの開発サーバー情報APIを試行
      const response = await fetch('/api/network-info', {
        method: 'GET',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.networkIP) {
          return data.networkIP;
        }
      }
    } catch (error) {
      uiLogger.warn('📡 Vite Network API未対応 - スキップ');
    }
    
    return null;
  }

  /**
   * 一般的なネットワーク範囲でのIP検出
   */
  async function detectCommonNetworkIP() {
    // よく利用されるプライベートネットワーク範囲の候補IP
    const candidateIPs = [
      // 192.168.1.x ネットワーク
      '192.168.1.2', '192.168.1.10', '192.168.1.100',
      // 192.168.0.x ネットワーク  
      '192.168.0.2', '192.168.0.10', '192.168.0.100',
      // 192.168.11.x ネットワーク (日本のルーターでよくある)
      '192.168.11.2', '192.168.11.10', '192.168.11.100',
      // 10.0.0.x ネットワーク
      '10.0.0.2', '10.0.0.10', '10.0.0.100',
      // 172.16.x.x ネットワーク
      '172.16.0.2', '172.16.0.10', '172.16.0.100'
    ];
    
    // 各IPアドレスへの到達可能性をテスト
    for (const ip of candidateIPs) {
      try {
        // fetch APIを使って到達可能性をテスト
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000); // 1秒でタイムアウト
        
        const response = await fetch(`http://${ip}:${window.location.port || 3000}/favicon.ico`, {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        
        // 200番台のレスポンスまたは404エラーでも到達可能と判断
        if (response.status >= 200 && response.status < 500) {
          uiLogger.log('✅ 到達可能なIP検出:', ip);
          return ip;
        }
      } catch (error) {
        // ネットワークエラーやタイムアウトは無視して次のIPを試行
        continue;
      }
    }
    
    // 全てのIPで到達不可能な場合はnullを返す
    uiLogger.warn('⚠️ 到達可能なIPが見つかりませんでした');
    return null;
  }

  /**
   * プロジェクトエクスポート機能
   * @param {Object} project - エクスポートするプロジェクト
   */
  async function exportProject(project) {
    try {
      uiLogger.log('📦 プロジェクトエクスポート開始:', project);
      
      // プロジェクトをZIPバンドルとしてエクスポート
      const zipBlob = await exportProjectBundleById(project.id);
      
      // ファイル名を生成（日本語文字をサニタイズ）
      const safeName = (project.name || project.title || 'project')
        .replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '_')
        .substring(0, 50);
      const fileName = `${safeName}_${new Date().toISOString().slice(0, 10)}.zip`;
      
      // ダウンロードリンクを作成
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      a.style.display = 'none';
      
      // ダウンロード実行
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // クリーンアップ
      URL.revokeObjectURL(downloadUrl);
      
      uiLogger.log('✅ プロジェクトエクスポート完了:', fileName);
      alert(`プロジェクト「${project.name || project.title}」をエクスポートしました。\n\nファイル名: ${fileName}\n\n※このZIPファイルにはローディング画面設定も含まれています。`);
      
    } catch (error) {
      console.error('❌ プロジェクトエクスポート失敗:', error);
      alert(`エクスポートに失敗しました: ${error.message}`);
    }
  }

export async function showQRCodeModal(options = {}) {
    uiLogger.log('🚀 QRコードモーダル開始:', {
      timestamp: new Date().toISOString(),
      options,
      existingModals: document.querySelectorAll('.modal-overlay').length,
      currentURL: window.location.href
    });
    
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay qr-modal-overlay';
    
    // プロジェクトIDを正確に使用（modelNameにIDが来ている想定）
    const projectId = options.modelName ? decodeURIComponent(options.modelName) : 'sample';

    let storedReleaseUrl = '';
    try {
      const project = await getProject(projectId);
      storedReleaseUrl = project?.publishInfo?.release?.viewerUrl
        || project?.publishInfo?.firebase?.viewerUrl || '';
    } catch (error) {
      uiLogger.warn('⚠️ 公開情報の取得に失敗:', error);
    }

    // 表示用にデフォルトポート（https:443 / http:80）を URL から取り除く
    const stripDefaultPort = (url) => {
      try {
        const u = new URL(url);
        if ((u.protocol === 'https:' && u.port === '443') ||
            (u.protocol === 'http:' && u.port === '80')) {
          u.port = '';
        }
        return u.toString();
      } catch (_) {
        return url;
      }
    };

    // ローカルネットワークIPを取得
    const localIP = await getLocalNetworkIP();
    const currentPort = window.location.port || '3000';
    const localHost = `${localIP}:${currentPort}`;
    // HTTPS優先（モバイルでのカメラ利用要件）。httpの場合は注意文表示。
    const isHttps = (window.location.protocol === 'https:');
    const scheme = isHttps ? 'https' : 'http';
    
    uiLogger.log('🌐 ネットワーク情報:', {
      currentHost: window.location.host,
      detectedLocalIP: localIP,
      localHost: localHost,
      port: currentPort
    });
    
    // URL生成（URLStabilizerを使用して ?src=...#/viewer 形式に統一）
    const stabilizer = createURLStabilizer();
    const localUrlInfo = await stabilizer.generateARViewerURL(projectId, URLType.LOCAL, { validateProject: false, skipValidation: true });
    let localUrl = stripDefaultPort(localUrlInfo.viewerUrl);
    // 公開リリースURLは実際に公開済みのものだけ表示する。未公開時に仮URLのQRを出さない。
    const webUrl = storedReleaseUrl;
    
    uiLogger.log('🔗 QRコード用URL生成:', {
      projectId,
      localHost,
      localUrl,
      webUrl,
      projectJsonUrl: `${scheme}://${localHost}/projects/${projectId}/project.json`
    });
    
    modalOverlay.innerHTML = `
        <div class="modal-content qr-code-modal">
            <h2>ARをスマホで見る</h2>
            ${!isHttps ? `<div style="margin: 0.5rem 0 1rem 0; padding: 0.6rem; border-radius: 6px; background: #FFF3CD; color: #664D03; border: 1px solid #FFECB5; font-size: 0.9rem;">
              ⚠️ 開発環境がHTTPのため、スマホではカメラが使えない場合があります。<br>
              HTTPSでの起動を推奨します（自己署名証明書でも可）。
            </div>` : ''}
            <style>
              .qr-code-modal { max-width: 420px; }
              .qr-code-modal h2 { margin: 0 0 1rem; }
              .qrm-tabs { display:flex; gap:4px; background:rgba(127,127,127,0.14); padding:4px; border-radius:10px; margin-bottom:1rem; }
              .qrm-tab { flex:1; padding:0.55rem 0.3rem; border:none; background:transparent; color:var(--color-text-secondary); border-radius:7px; cursor:pointer; font-size:0.82rem; font-weight:600; transition:background .15s,color .15s; }
              .qrm-tab.active { background:var(--color-primary); color:#fff; }
              .qrm-desc { margin:0 0 0.8rem; color:var(--color-text-secondary); font-size:0.85rem; line-height:1.5; text-align:center; }
              .qrm-input { width:100%; padding:0.65rem 0.75rem; border:1px solid var(--color-border); border-radius:8px; box-sizing:border-box; margin-bottom:0.5rem; font-size:0.9rem; }
              .qrm-status { margin-bottom:0.6rem; padding:0.5rem; border-radius:8px; text-align:center; font-size:0.83rem; }
              .qrm-stage { display:flex; flex-direction:column; align-items:center; margin-bottom:1rem; }
              .qrm-canvas-box { background:#fff; padding:14px; border-radius:14px; box-shadow:0 2px 14px rgba(0,0,0,0.15); line-height:0; }
              .qrm-hint { margin:0.7rem 0 0; font-size:0.82rem; color:var(--color-text-secondary); text-align:center; }
              .qrm-actions { display:flex; flex-direction:column; gap:0.45rem; margin-bottom:0.8rem; }
              .qrm-copy { width:100%; }
              .qrm-actions-row { display:flex; gap:0.4rem; }
              .qrm-actions-row button { flex:1; font-size:0.78rem; padding:0.55rem 0.25rem; }
              .qr-code-modal button:disabled { opacity:0.45; cursor:not-allowed; }
              .qr-code-modal details { margin-bottom:0.6rem; }
              .qr-code-modal summary { cursor:pointer; font-size:0.84rem; color:var(--color-text-secondary); padding:0.35rem 0; }
              .qrm-url-text { margin-top:0.4rem; font-size:0.76rem; color:var(--color-text-secondary); word-break:break-all; background:rgba(127,127,127,0.12); padding:0.6rem; border-radius:8px; }
              .qrm-usage { font-size:0.83rem; color:var(--color-text-secondary); line-height:1.5; }
              .qrm-usage p { margin:0.55rem 0 0.15rem; }
              .qrm-usage ul { margin:0; padding-left:1.3rem; }
            </style>

            <div class="qrm-tabs">
                <button id="lan-tab" class="qrm-tab active">📶 同一Wi-Fi</button>
                <button id="tunnel-tab" class="qrm-tab">📡 トンネル</button>
                <button id="release-tab" class="qrm-tab">🚀 公開リリース</button>
            </div>

            <div id="lan-settings" class="method-settings">
                <p class="qrm-desc">同じWi-Fiのスマホで、下のQRコードをカメラから読み取ってください。</p>
            </div>

            <div id="tunnel-settings" class="method-settings" style="display: none;">
                <p class="qrm-desc">ngrok / Cloudflare Tunnel の公開URLを貼ると、別のネットワークのスマホでも確認できます。</p>
                <input id="tunnel-url-input" class="qrm-input" type="url" placeholder="https://xxxx.ngrok-free.app" />
                <button id="save-tunnel-url" class="primary-button qrm-copy">URLを保存してQRに反映</button>
                <div id="tunnel-status" class="qrm-status" style="display: none;"></div>
            </div>

            <div id="release-settings" class="method-settings" style="display: none;">
                <p class="qrm-desc">アップロードして、誰でもアクセスできる公開URLを発行します。</p>
                <button id="publish-release" class="primary-button qrm-copy">🚀 公開リリースを作成</button>
                <div id="release-status" class="qrm-status" style="display: none;"></div>
            </div>
            
            <div class="qrm-stage">
                <div id="qrcode-container" class="qrm-canvas-box">
                    <canvas id="qrcode-canvas" width="240" height="240"></canvas>
                </div>
                <p id="qr-hint" class="qrm-hint">スマホのカメラでスキャン</p>
            </div>

            <div class="qrm-actions">
                <button id="copy-url" class="primary-button qrm-copy">🔗 URLをコピー</button>
                <div class="qrm-actions-row">
                    <button id="preview-url" class="secondary-button">📱 プレビュー</button>
                    <button id="open-url" class="secondary-button">🖥 PCで開く</button>
                    <button id="download-qrcode" class="secondary-button">💾 QRを保存</button>
                </div>
            </div>

            <details>
                <summary>🔗 リンクを表示</summary>
                <div id="current-url-text" class="qrm-url-text"></div>
            </details>
            
            <details>
                <summary>📱 使い方ガイド</summary>
                <div class="qrm-usage">
                    <p><strong>📶 同一Wi-Fi</strong></p>
                    <ul><li>PCとスマホを同じWi-Fiに接続し、QRをカメラで読み取る</li></ul>
                    <p><strong>📡 トンネル</strong></p>
                    <ul><li>ngrok等の公開URLを貼って保存 → 別ネットワークのスマホでも確認可</li></ul>
                    <p><strong>🚀 公開リリース</strong></p>
                    <ul><li>「公開リリースを作成」で本番公開。世界中からアクセス可能に</li></ul>
                </div>
            </details>
            
            <div class="button-group" style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button id="close-qrcode-modal" class="cancel-button" style="padding: 0.8rem 1.5rem; border-radius: var(--border-radius-medium);">
                    閉じる
                </button>
            </div>
        </div>
    `;
    
    uiLogger.log('📱 QRコードモーダルを表示:', {
      projectId,
      localUrl,
      webUrl,
      timestamp: new Date().toISOString()
    });
    
    document.body.appendChild(modalOverlay);

    // タブ切り替え機能
    const tunnelTab = modalOverlay.querySelector('#tunnel-tab');
    const lanTab = modalOverlay.querySelector('#lan-tab');
    const releaseTab = modalOverlay.querySelector('#release-tab');
    const tunnelSettings = modalOverlay.querySelector('#tunnel-settings');
    const lanSettings = modalOverlay.querySelector('#lan-settings');
    const releaseSettings = modalOverlay.querySelector('#release-settings');

    let currentMethod = options.defaultMethod || (getTunnelBaseUrl() ? 'tunnel' : 'lan');
    let currentUrl = localUrl;

    // 公開リリースのURL（公開後に設定される）
    let releasePublishedUrl = storedReleaseUrl;

    // トンネルURL入力欄に保存済みの値を反映
    const tunnelInput = modalOverlay.querySelector('#tunnel-url-input');
    if (tunnelInput) tunnelInput.value = getStoredTunnelUrl();

    // 出力エリア（QR・URLテキスト・ボタン状態・ヒント）をまとめて更新する
    function refreshOutputUI(emptyHint) {
      const hasUrl = !!currentUrl;
      ['#copy-url', '#preview-url', '#open-url'].forEach((sel) => {
        const btn = modalOverlay.querySelector(sel);
        if (btn) btn.disabled = !hasUrl;
      });
      const urlText = modalOverlay.querySelector('#current-url-text');
      if (urlText) urlText.textContent = currentUrl || '（まだURLがありません）';
      const hint = modalOverlay.querySelector('#qr-hint');
      if (hint) hint.textContent = hasUrl ? 'スマホのカメラでスキャン' : (emptyHint || '');
      // QRコードを再生成（DOM更新を確実に待つ）
      setTimeout(() => {
        const canvas = document.querySelector('#qrcode-canvas');
        if (canvas) {
          generateQRCode();
        } else {
          uiLogger.warn('⚠️ QR再生成: Canvas要素が見つかりません');
        }
      }, 120);
    }

    function switchTab(method) {
      currentMethod = method;

      // タブの見た目を切り替え（active クラスのみ。配色はCSSで制御）
      [[tunnelTab, 'tunnel'], [lanTab, 'lan'], [releaseTab, 'release']].forEach(([tab, m]) => {
        tab.classList.toggle('active', m === method);
      });

      // 設定の表示を切り替え
      tunnelSettings.style.display = method === 'tunnel' ? 'block' : 'none';
      lanSettings.style.display = method === 'lan' ? 'block' : 'none';
      releaseSettings.style.display = method === 'release' ? 'block' : 'none';

      // 現在のURLを決定
      let emptyHint = '';
      if (method === 'lan') {
        currentUrl = localUrl;
      } else if (method === 'tunnel') {
        currentUrl = buildTunnelViewerUrl(projectId) || '';
        emptyHint = '上の入力欄にトンネルURLを保存してください';
      } else {
        currentUrl = releasePublishedUrl || '';
        emptyHint = '「公開リリースを作成」を押してください';
      }
      refreshOutputUI(emptyHint);
    }

    tunnelTab.addEventListener('click', () => switchTab('tunnel'));
    lanTab.addEventListener('click', () => switchTab('lan'));
    releaseTab.addEventListener('click', () => switchTab('release'));

    // 初期状態を設定（DOM要素が完全に準備されてから実行）
    setTimeout(() => {
      // Canvas要素の存在を確認
      const canvas = document.querySelector('#qrcode-canvas');
      if (!canvas) {
        uiLogger.error('❌ 初期化時: Canvas要素が見つかりません');
        console.error('❌ QRコード生成に失敗しました\nエラー: Canvas element not found');
      }

      switchTab(currentMethod);
    }, 200);

    // URLをコピー（現在表示中のタブのURL）
    modalOverlay.querySelector('#copy-url').addEventListener('click', () => {
      if (!currentUrl) return;
      navigator.clipboard.writeText(currentUrl).then(() => {
        alert('URLをクリップボードにコピーしました');
      }).catch(() => {
        alert('URLのコピーに失敗しました');
      });
    });

    // プレビュー（スマホ向けレスポンシブ表示）
    modalOverlay.querySelector('#preview-url').addEventListener('click', () => {
      if (!currentUrl) return;
      showARPreview(currentUrl, projectId);
    });

    // PCブラウザで開く
    modalOverlay.querySelector('#open-url').addEventListener('click', () => {
      if (!currentUrl) return;
      window.open(currentUrl, '_blank', 'noopener,noreferrer');
    });

    // トンネルURLを保存してQRに反映
    modalOverlay.querySelector('#save-tunnel-url').addEventListener('click', () => {
      const input = modalOverlay.querySelector('#tunnel-url-input');
      const status = modalOverlay.querySelector('#tunnel-status');
      const saved = setStoredTunnelUrl(input.value);
      status.style.display = 'block';
      if (!saved) {
        status.textContent = '⚠️ 有効なURLを入力してください（例: https://xxxx.ngrok-free.app）';
        status.style.background = '#FFEBEE';
        status.style.color = '#C62828';
        return;
      }
      input.value = saved;
      status.textContent = '✅ トンネルURLを保存しました';
      status.style.background = '#E8F5E9';
      status.style.color = '#2E7D32';

      if (currentMethod === 'tunnel') {
        currentUrl = buildTunnelViewerUrl(projectId) || '';
        refreshOutputUI('上の入力欄にトンネルURLを保存してください');
      }
    });

    // 公開リリース作成ボタン
    modalOverlay.querySelector('#publish-release').addEventListener('click', async () => {
      const statusEl = modalOverlay.querySelector('#release-status');
      const publishBtn = modalOverlay.querySelector('#publish-release');

      try {
        // UI状態を更新
        statusEl.style.display = 'block';
        statusEl.textContent = '🔄 公開中...';
        statusEl.style.background = '#E3F2FD';
        statusEl.style.color = '#1565C0';
        publishBtn.disabled = true;
        publishBtn.textContent = '⏳ 公開中...';

        // プロジェクトデータを取得
        const project = await getProject(projectId);
        if (!project) {
          throw new Error('プロジェクトが見つかりません');
        }
        const projectData = await loadProjectWithModels(project);
        if (!projectData) {
          throw new Error('プロジェクトデータの取得に失敗しました');
        }

        uiLogger.log('🚀 公開リリース作成開始:', projectId);

        // ストレージプロバイダ抽象層経由で公開（vercelBlob優先、firebaseは後方互換）
        const result = await publishRelease({
          id: projectId,
          name: projectData.name || 'Untitled',
          type: projectData.type || 'markerless',
          modelData: projectData.modelData || [],
          loadingScreen: projectData.loadingScreen || null,
          startScreen: projectData.startScreen || null,
          guideScreen: projectData.guideScreen || null,
          theme: projectData.theme || null,
          markerImage: projectData.markerImage || projectData.markerImageUrl || null,
          markerPattern: projectData.markerPattern || null,
          arSettings: projectData.arSettings || {}
        });

        uiLogger.log('✅ 公開リリース作成完了:', result);

        // 成功
        releasePublishedUrl = result.viewerUrl;
        currentUrl = releasePublishedUrl;

        uiLogger.log('🔗 更新されたURL:', currentUrl);

        try {
          updateProjectPublishInfo(projectId, {
            release: {
              provider: result.provider,
              viewerUrl: result.viewerUrl,
              projectUrl: result.projectUrl,
              publishedAt: new Date().toISOString()
            }
          });
        } catch (updateError) {
          uiLogger.warn('⚠️ 公開情報の保存に失敗:', updateError);
        }

        statusEl.textContent = `✅ 公開完了！（${result.provider}）`;
        statusEl.style.background = '#E8F5E9';
        statusEl.style.color = '#2E7D32';

        publishBtn.textContent = '✅ 公開済み（再公開）';
        publishBtn.style.background = '#4CAF50';
        publishBtn.disabled = false; // 再公開可能にする

        // QR・URL表示・ボタン状態を更新
        refreshOutputUI();

      } catch (error) {
        console.error('公開リリース作成エラー:', error);
        let errorMessage = error.message;

        // Firebase設定エラーの場合、より分かりやすいメッセージを表示
        if (errorMessage && (errorMessage.includes('Firebase設定が完了していません') ||
            errorMessage.includes('Firebase設定'))) {
          errorMessage = 'Firebase設定が必要です。.envファイルにFirebase設定を追加してください。\n詳細は env.example を参照してください。';
        }

        statusEl.textContent = `❌ エラー: ${errorMessage}`;
        statusEl.style.background = '#FFEBEE';
        statusEl.style.color = '#C62828';
        publishBtn.disabled = false;
        publishBtn.textContent = '🚀 公開リリースを作成';

        // ユーザーに通知
        alert(`公開リリースの作成に失敗しました:\n\n${errorMessage}\n\n公開機能を使用しない場合は、エクスポート機能をご利用ください。`);
      }
    });

    // QRコード生成
    const generateQRCode = async () => {
        // DOM要素の存在を再確認（タブ切り替え時に要素が存在しない可能性があるため）
        const container = document.querySelector('#qrcode-container');
        const canvas = document.querySelector('#qrcode-canvas');

        try {
            // Canvas要素が存在しない場合は早期リターン
            if (!canvas) {
                uiLogger.warn('⚠️ QRコード生成スキップ: Canvas要素が見つかりません');
                console.error('❌ QRコード生成に失敗しました\nエラー: Canvas element not found');
                return;
            }

            if (!currentUrl) {
                uiLogger.warn('⚠️ QRコード生成スキップ: URLが空です');
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.font = '14px Arial';
                ctx.fillStyle = '#666';
                ctx.textAlign = 'center';
                ctx.fillText('ここにQRコードが表示されます', canvas.width/2, canvas.height/2);
                return;
            }

            uiLogger.log('🔄 QRコード生成開始:', currentUrl);

            // QRCodeライブラリを取得
            let QRCodeLib;
            try {
                QRCodeLib = await loadQRCode();
            } catch (e) {
                throw new Error(`QRCodeライブラリの読み込みに失敗: ${e.message}`);
            }

            uiLogger.log('✅ QRCodeライブラリ状態:', {
                type: typeof QRCodeLib,
                hasToCanvas: QRCodeLib && typeof QRCodeLib.toCanvas === 'function',
                keys: QRCodeLib ? Object.keys(QRCodeLib) : []
            });

            if (!QRCodeLib || typeof QRCodeLib.toCanvas !== 'function') {
                console.error('❌ QRCodeライブラリが無効:', QRCodeLib);
                throw new Error('QRCode library invalid: toCanvas method missing');
            }

            // キャンバスをクリア
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            uiLogger.log('🎯 QRCode描画実行:', { currentUrl });
            
            await QRCodeLib.toCanvas(canvas, currentUrl, {
                width: 240,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                errorCorrectionLevel: 'M'
            });
            
            uiLogger.log('✅ QRコード生成完了:', {
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
                urlLength: currentUrl.length
            });

            // QRコードのダウンロード処理を再設定（重複防止のため一度削除したいが、単純に追加）
            // 注: 毎回リスナーを追加すると重複するため、ボタンのcloneNodeでリセット推奨だが、
            // ここでは簡易的に既存リスナーを許容（実害は少ない）
            const dlBtn = document.getElementById('download-qrcode');
            if (dlBtn) {
                // 古いリスナーを削除するためにクローン
                const newBtn = dlBtn.cloneNode(true);
                dlBtn.parentNode.replaceChild(newBtn, dlBtn);
                
                newBtn.addEventListener('click', () => {
                    try {
                        const image = canvas.toDataURL('image/png');
                        const link = document.createElement('a');
                        link.href = image;
                        link.download = `${projectId}-qrcode.png`;
                        link.click();
                    } catch (error) {
                        console.error('QRコードのダウンロードに失敗しました:', error);
                        alert('QRコードのダウンロードに失敗しました。');
                    }
                });
            }

        } catch (error) {
            console.error('❌ QRコード生成エラー:', error);
            console.error('❌ エラー詳細:', {
                message: error.message,
                stack: error.stack,
                currentUrl
            });
            
            if (container) {
                container.innerHTML = `
                    <div style="color: #D32F2F; text-align: center; padding: 1rem; background: #FFEBEE; border-radius: 4px;">
                        <h3 style="margin: 0 0 0.5rem 0; font-size: 1rem;">QRコード生成失敗</h3>
                        <p style="margin: 0; font-size: 0.85rem;">${security.escape(error.message)}</p>
                        <button onclick="location.reload()" style="margin-top: 0.5rem; padding: 0.3rem 0.8rem; background: #D32F2F; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                            再読み込み
                        </button>
                    </div>
                `;
            }
        }
    };

    // 補助: Blob→Base64
    const blobToBase64 = (blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    
    // 補助: transformをviewer互換の配列形式に正規化
    const toVec3 = (value, fallback) => {
      if (Array.isArray(value) && value.length >= 3) {
        return value.slice(0, 3).map((v, i) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : fallback[i];
        });
      }
      if (value && typeof value === 'object') {
        const x = Number(value.x);
        const y = Number(value.y);
        const z = Number(value.z);
        return [
          Number.isFinite(x) ? x : fallback[0],
          Number.isFinite(y) ? y : fallback[1],
          Number.isFinite(z) ? z : fallback[2]
        ];
      }
      return [...fallback];
    };
    
    const normalizeTransform = (model) => {
      const transform = model?.transform || {};
      const position = toVec3(model?.position || transform.position, [0, 0, 0]);
      const rotation = toVec3(model?.rotation || transform.rotation, [0, 0, 0]);
      const scale = toVec3(model?.scale || transform.scale, [1, 1, 1]);
      return { position, rotation, scale };
    };

    // 開いたタイミングでローカル公開を試行（同一Wi-Fi前提）
    // 本番（デプロイ済み）では実行しない。同一Wi-Fiタブは開発時のみ意味があり、
    // 本番で実行すると QRモーダルを開くたびに不要な公開アップロードが走るため。
    (async () => {
      try {
        if (!import.meta.env.DEV) {
          uiLogger.log('ℹ️ 本番環境のため自動ローカル公開をスキップ（公開はリリース作成タブで実行）');
          return;
        }
        if (!projectId || projectId === 'sample') throw new Error('プロジェクトID不明');

        const project = getProject(projectId);
        if (!project) throw new Error('プロジェクトデータが見つかりません');

        const withModels = await loadProjectWithModels(project);
        const modelPayload = [];
        for (const m of withModels.modelData || []) {
          if (m.blob) {
            const dataBase64 = await blobToBase64(m.blob);
            const transform = normalizeTransform(m);
            modelPayload.push({
              fileName: m.fileName || 'model.glb',
              dataBase64,
              position: transform.position,
              rotation: transform.rotation,
              scale: transform.scale
            });
          }
        }

        // ローディング画面エディターの詳細設定を取得し、公開用データに含める
        let editorSettings = null;
        try {
          // 分離された状態管理を使用してエディターとビューアの結合を解除
          const { getLoadingSettingsForProject } = await import('../utils/loading-screen-state.js');
          editorSettings = getLoadingSettingsForProject();
        } catch (error) {
          console.warn('ローディング画面設定の取得に失敗:', error);
          // フォールバック: 従来のsettingsAPIを使用
          try {
            editorSettings = settingsAPI.getSettings();
          } catch (_) {}
        }

        // 送信するローディング画面設定
        const lsPayload = { ...(project.loadingScreen || {}) };
        
        // ★★★ 重複データ防止: 既存のeditorSettingsを削除してから新しいものを設定 ★★★
        if (lsPayload.editorSettings) {
          console.warn('🔍 既存のeditorSettingsを削除して重複を防止');
          delete lsPayload.editorSettings;
        }
        
        const linkedEditorSettings = project.loadingScreen?.editorSettings ||
          project.loadingScreen?.templateSettings ||
          editorSettings ||
          null;

        if (linkedEditorSettings) {
          // ★★★ editorSettings内の入れ子になったeditorSettingsも削除 ★★★
          const cleanEditorSettings = { ...linkedEditorSettings };
          if (cleanEditorSettings.editorSettings) {
            console.warn('🔍 editorSettings内の重複editorSettingsを削除');
            delete cleanEditorSettings.editorSettings;
          }
          
          lsPayload.editorSettings = cleanEditorSettings;
          // ロゴがBase64で保持されている場合、API側でアセットとして書き出せるようにlogoImageに入れる
          const le = linkedEditorSettings.loadingScreen || {};
          if (typeof le.logo === 'string' && le.logo.startsWith('data:')) {
            lsPayload.logoImage = le.logo;
          }
        }

        // Start Screen をトップレベルに含める（Viewerが直接参照）
        const startScreenPayload = project.startScreen || linkedEditorSettings?.startScreen || null;

        // ★★★ 最終正規化: 送信前にプロジェクトデータ全体を正規化 ★★★
        const originalProjectData = {
          id: projectId,
          type: project.type || 'markerless',
          loadingScreen: lsPayload,
          startScreen: startScreenPayload,
          guideScreen: project.guideScreen || linkedEditorSettings?.guideScreen || null,
          markerImage: editorSettings?.markerImage || project.markerImage || project.markerImageUrl || null,
          markerPattern: editorSettings?.markerPattern || project.markerPattern || null,
          models: modelPayload
        };
        
        const normalizedProjectData = normalizeProjectData(originalProjectData);
        reportSizeReduction(originalProjectData, normalizedProjectData);

        const resp = await fetch('/api/publish-project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalizedProjectData)
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.viewerUrl) {
            // APIがlocalhostを返す場合は上書きしない（スマホ不可）。IPが含まれている場合のみ採用
            try {
              const u = new URL(data.viewerUrl);
              const isLocalHost = (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
              if (!isLocalHost) {
                localUrl = stripDefaultPort(data.viewerUrl);
              }
            } catch (_) {}
            // 同一Wi-Fiタブを表示中なら出力エリアを更新
            if (currentMethod === 'lan') {
              currentUrl = localUrl;
              refreshOutputUI();
            }
          }
        }
      } catch (e) {
        console.warn('ローカル公開に失敗（フォールバックでURLのみ表示）:', e);
        // QRキャンバスは残す。ローカル公開に失敗しても、生成済みのURLでQR表示を継続する。
      } finally {
        // 初期QR生成（公開に成功していれば更新されたURLになる）
        // DOM要素の準備を確実に待つ
        setTimeout(() => {
          const canvas = document.querySelector('#qrcode-canvas');
          if (canvas) {
            generateQRCode();
          } else {
            uiLogger.warn('⚠️ 初期QR生成: Canvas要素またはURLが見つかりません', {
              hasCanvas: !!canvas,
              hasUrl: !!currentUrl
            });
          }
        }, 300);
      }
    })();

    // QRコードモーダルの強制クローズを検出するための監視
    let modalClosedByScript = false;
    const originalRemoveChild = document.body.removeChild.bind(document.body);
    document.body.removeChild = function(child) {
      if (child === modalOverlay && !modalClosedByScript) {
        console.error('⚠️ QRコードモーダルが予期せず削除されました!', {
          timestamp: new Date().toISOString(),
          stackTrace: new Error().stack,
          childElement: child,
          parentElement: this
        });
      }
      return originalRemoveChild(child);
    };

    // 閉じるボタンイベント
    document.getElementById('close-qrcode-modal').addEventListener('click', () => {
        uiLogger.log('🔄 QRコードモーダルを閉じる（閉じるボタン）');
        modalClosedByScript = true;
        document.body.removeChild = originalRemoveChild; // 元に戻す
        document.body.removeChild(modalOverlay);
    });
    
    // モーダル背景をクリックした時にも閉じる
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            uiLogger.log('🔄 QRコードモーダルを閉じる（背景クリック）');
            modalClosedByScript = true;
            document.body.removeChild = originalRemoveChild; // 元に戻す
            document.body.removeChild(modalOverlay);
        }
    });
  }

  /**
   * ARプレビュー機能 - スマホ向けレスポンシブ表示
   */
  function showARPreview(arUrl, modelId) {
    uiLogger.log('📱 ARプレビュー開始:', { arUrl, modelId });
    
    // プレビューモーダルを作成
    const previewOverlay = document.createElement('div');
    previewOverlay.className = 'modal-overlay';
    previewOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      z-index: 10001;
      display: flex;
      justify-content: center;
      align-items: center;
    `;
    
    previewOverlay.innerHTML = `
      <div class="preview-content" style="
        width: 90%;
        max-width: 400px;
        height: 80%;
        max-height: 600px;
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        display: flex;
        flex-direction: column;
      ">
        <div class="preview-header" style="
          padding: 1rem;
          background: #f5f5f5;
          border-bottom: 1px solid #ddd;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <h3 style="margin: 0; color: #333; font-size: 1.1rem;">📱 スマホプレビュー</h3>
          <button id="close-preview" style="
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
          ">✕</button>
        </div>
        
        <div class="preview-body" style="
          flex: 1;
          position: relative;
          overflow: hidden;
        ">
          <iframe 
            id="preview-iframe" 
            src="${arUrl}" 
            style="
              width: 100%;
              height: 100%;
              border: none;
              background: white;
            "
            sandbox="allow-scripts allow-same-origin allow-downloads allow-forms"
          ></iframe>
        </div>
        
        <div class="preview-footer" style="
          padding: 1rem;
          background: #f5f5f5;
          border-top: 1px solid #ddd;
          text-align: center;
        ">
          <div style="margin-bottom: 0.5rem; font-size: 0.9rem; color: #666;">
            📱 実際のスマホでテストするには、QRコードをスキャンしてください
          </div>
          <button id="open-in-new-tab" style="
            padding: 0.5rem 1rem;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
          ">新しいタブで開く</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(previewOverlay);
    
    // イベントリスナー
    previewOverlay.querySelector('#close-preview').addEventListener('click', () => {
      document.body.removeChild(previewOverlay);
    });
    
    previewOverlay.querySelector('#open-in-new-tab').addEventListener('click', () => {
      window.open(arUrl, '_blank', 'noopener,noreferrer');
    });
    
    // 背景クリックで閉じる
    previewOverlay.addEventListener('click', (e) => {
      if (e.target === previewOverlay) {
        document.body.removeChild(previewOverlay);
      }
    });
    
    // iframe読み込み完了ログ
    const iframe = previewOverlay.querySelector('#preview-iframe');
    iframe.addEventListener('load', () => {
      uiLogger.log('✅ ARプレビュー読み込み完了');
    });
    
    iframe.addEventListener('error', (e) => {
      console.error('❌ ARプレビュー読み込みエラー:', e);
    });
  }
