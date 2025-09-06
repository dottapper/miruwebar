// src/components/ui.js

import { showMarkerUpload } from '../views/marker-upload.js';
import { getProject, loadProjectWithModels } from '../api/projects-new.js';
import { exportProjectBundleById } from '../api/projects.js';
import { settingsAPI } from './loading-screen/settings.js';
import { loadQRCode } from '../utils/qrcode-loader.js';
import { createLogger } from '../utils/logger.js';
import { normalizeProjectData, reportSizeReduction } from '../utils/project-data-normalizer.js';

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
        <p>${message}</p>
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
                    <input type="text" id="project-name" value="${currentName}" placeholder="プロジェクト名を入力" required>
                </div>
                
                <div class="form-group">
                    <label for="project-description">説明（任意）:</label>
                    <textarea id="project-description" placeholder="プロジェクトの説明を入力">${currentDescription}</textarea>
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
    modalOverlay.className = 'modal-overlay';
    
    // プロジェクトIDを正確に使用（modelNameにIDが来ている想定）
    const projectId = options.modelName ? decodeURIComponent(options.modelName) : 'sample';
    
    // ローカルネットワークIPを取得
    const localIP = await getLocalNetworkIP();
    const currentPort = window.location.port || '3000';
    const localHost = `${localIP}:${currentPort}`;
    const scheme = (window.location.protocol === 'https:') ? 'https' : 'http';
    
    uiLogger.log('🌐 ネットワーク情報:', {
      currentHost: window.location.host,
      detectedLocalIP: localIP,
      localHost: localHost,
      port: currentPort
    });
    
    // URL生成（ローカル公開の想定パス）
    let localUrl = `${scheme}://${localHost}/#/viewer?src=${scheme}://${localHost}/projects/${encodeURIComponent(projectId)}/project.json`;
    const appOrigin = window.location.origin;
    const webUrl = `${appOrigin}/#/viewer?src=https://your-domain.com/projects/${projectId}/project.json`;
    
    uiLogger.log('🔗 QRコード用URL生成:', {
      projectId,
      localHost,
      localUrl,
      webUrl,
      projectJsonUrl: `${scheme}://${localHost}/projects/${projectId}/project.json`
    });
    
    modalOverlay.innerHTML = `
        <div class="modal-content">
            <h2>ARをスマホで見る</h2>
            <p style="margin: 0 0 1.5rem 0; color: var(--color-text-secondary); font-size: 0.9rem; line-height: 1.4;">
                QRコードをスマホでスキャンしてAR体験を開始できます。まずは「📱 スマホでテスト」で同じWi-Fi内のスマホから確認し、
                問題なければ「🌐 公開用」でインターネット公開用のQRコードを生成してください。
            </p>
            
            <!-- 公開方法選択 -->
            <div class="publish-method" style="margin-bottom: 1.5rem;">
                <h3 style="margin: 0 0 1rem 0; font-size: 1.1rem;">公開方法を選択</h3>
                <div class="method-tabs" style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                    <button id="local-tab" class="method-tab active" style="flex: 1; padding: 0.8rem; border: 1px solid var(--color-border); background: var(--color-primary); color: white; border-radius: 6px; cursor: pointer;">
                        📱 スマホでテスト
                    </button>
                    <button id="web-tab" class="method-tab" style="flex: 1; padding: 0.8rem; border: 1px solid var(--color-border); background: transparent; color: var(--color-text-primary); border-radius: 6px; cursor: pointer;">
                        🌐 公開用
                    </button>
                </div>
                
                <!-- Local設定 -->
                <div id="local-settings" class="method-settings">
                    <p style="margin: 0 0 0.5rem 0; color: var(--color-text-secondary); font-size: 0.9rem;">
                        📱 同じWi-Fi内のスマホで即座にテスト可能（開発・確認用）
                    </p>
                    <div class="url-display" style="width: 100%; padding: 0.8rem; border-radius: var(--border-radius-medium); border: 1px solid var(--color-border); background-color: rgba(0,0,0,0.05); word-break: break-all; margin-bottom: 0.5rem;">
                        <span id="local-url">${localUrl}</span>
                    </div>
                    <button id="copy-local-url" class="secondary-button" style="padding: 0.5rem 1rem; border-radius: var(--border-radius-medium); margin-right: 0.5rem;">
                        URLをコピー
                    </button>
                    <button id="test-local-url" class="secondary-button" style="padding: 0.5rem 1rem; border-radius: var(--border-radius-medium); margin-right: 0.5rem;">
                        📱 プレビュー
                    </button>
                    <button id="open-local-url" class="secondary-button" style="padding: 0.5rem 1rem; border-radius: var(--border-radius-medium);">
                        🖥️ PC で開く
                    </button>
                </div>
                
                <!-- Web設定 -->
                <div id="web-settings" class="method-settings" style="display: none;">
                    <p style="margin: 0 0 0.5rem 0; color: var(--color-text-secondary); font-size: 0.9rem;">
                        🌐 インターネット経由で世界中の誰でもアクセス可能（本格公開用）
                    </p>
                    <div class="url-input-group" style="margin-bottom: 0.5rem;">
                        <label style="display: block; margin-bottom: 0.3rem; font-size: 0.9rem;">公開URL:</label>
                        <input type="text" id="web-url-input" placeholder="https://your-domain.com" value="https://your-domain.com" style="width: 100%; padding: 0.5rem; border-radius: var(--border-radius-medium); border: 1px solid var(--color-border); background-color: var(--color-surface); color: var(--color-text-primary);">
                    </div>
                    <div class="url-display" style="width: 100%; padding: 0.8rem; border-radius: var(--border-radius-medium); border: 1px solid var(--color-border); background-color: rgba(0,0,0,0.05); word-break: break-all; margin-bottom: 0.5rem;">
                        <span id="web-url">${webUrl}</span>
                    </div>
                    <button id="copy-web-url" class="secondary-button" style="padding: 0.5rem 1rem; border-radius: var(--border-radius-medium); margin-right: 0.5rem;">
                        公開URLをコピー
                    </button>
                    <button id="update-web-url" class="secondary-button" style="padding: 0.5rem 1rem; border-radius: var(--border-radius-medium);">
                        URL更新
                    </button>
                </div>
            </div>
            
            <div class="form-group" style="margin-bottom: 1.5rem; display: flex; flex-direction: column; align-items: center;">
                <label style="display: block; margin-bottom: 0.5rem;">QRコード</label>
                <div id="qrcode-container" style="background: white; padding: 1rem; margin-bottom: 1rem;">
                    <canvas id="qrcode-canvas" width="200" height="200"></canvas>
                </div>
                <div class="qr-actions" style="display: flex; gap: 0.5rem;">
                    <button id="download-qrcode" class="secondary-button" style="padding: 0.5rem 1rem; border-radius: var(--border-radius-medium);">
                        QRコードをダウンロード
                    </button>
                </div>
            </div>
            
            <!-- 使用方法の説明 -->
            <div class="usage-instructions" style="margin-bottom: 1.5rem; padding: 1rem; background-color: rgba(0,0,0,0.05); border-radius: var(--border-radius-medium); border-left: 4px solid var(--color-primary);">
                <h4 style="margin: 0 0 0.5rem 0; color: var(--color-text-primary);">📱 スマホでの確認方法</h4>
                <div style="font-size: 0.9rem; color: var(--color-text-secondary); line-height: 1.4;">
                    <p style="margin: 0 0 0.5rem 0;"><strong>📱 スマホでテスト:</strong></p>
                    <ul style="margin: 0 0 0.5rem 0; padding-left: 1.5rem;">
                        <li>PCとスマホが同じWi-Fiに接続されていることを確認</li>
                        <li>スマホのカメラアプリでQRコードをスキャン</li>
                        <li>ブラウザが開いてAR体験が開始されます</li>
                    </ul>
                    <p style="margin: 0 0 0.5rem 0;"><strong>🌐 公開用:</strong></p>
                    <ul style="margin: 0 0 0.5rem 0; padding-left: 1.5rem;">
                        <li>公開URLを設定してQRコードを生成</li>
                        <li>ZIPファイルをダウンロードしてホスティングサービスにアップロード</li>
                        <li>世界中の誰でもアクセス可能になります</li>
                    </ul>
                </div>
            </div>
            
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
    const localTab = modalOverlay.querySelector('#local-tab');
    const webTab = modalOverlay.querySelector('#web-tab');
    const localSettings = modalOverlay.querySelector('#local-settings');
    const webSettings = modalOverlay.querySelector('#web-settings');
    
    let currentMethod = options.defaultMethod || 'local';
    let currentUrl = localUrl;

    function switchTab(method) {
      currentMethod = method;
      
      // タブの見た目を切り替え
      localTab.classList.toggle('active', method === 'local');
      webTab.classList.toggle('active', method === 'web');
      
      // 設定の表示を切り替え
      localSettings.style.display = method === 'local' ? 'block' : 'none';
      webSettings.style.display = method === 'web' ? 'block' : 'none';
      
      // URLを更新
      if (method === 'local') {
        currentUrl = localUrl;
        modalOverlay.querySelector('#local-url').textContent = localUrl;
      } else {
        const webUrlInput = modalOverlay.querySelector('#web-url-input').value;
        const newWebUrl = `${webUrlInput}/#/viewer?src=${webUrlInput}/projects/${projectId}/project.json`;
        currentUrl = newWebUrl;
        modalOverlay.querySelector('#web-url').textContent = newWebUrl;
      }
      
      // QRコードを再生成（DOM更新を待つ）
      setTimeout(() => {
        generateQRCode();
      }, 100);
    }

    localTab.addEventListener('click', () => switchTab('local'));
    webTab.addEventListener('click', () => switchTab('web'));

    // 初期状態を設定
    setTimeout(() => {
      if (currentMethod === 'web') {
        switchTab('web');
      } else {
        switchTab('local');
      }
    }, 100);

    // URLコピー機能
    modalOverlay.querySelector('#copy-local-url').addEventListener('click', () => {
      navigator.clipboard.writeText(localUrl).then(() => {
        alert('ローカルURLをクリップボードにコピーしました');
      }).catch(() => {
        alert('URLのコピーに失敗しました');
      });
    });

    modalOverlay.querySelector('#copy-web-url').addEventListener('click', () => {
      const webUrl = modalOverlay.querySelector('#web-url').textContent;
      navigator.clipboard.writeText(webUrl).then(() => {
        alert('公開URLをクリップボードにコピーしました');
      }).catch(() => {
        alert('URLのコピーに失敗しました');
      });
    });

    // プレビュー機能（スマホ向けレスポンシブ表示）
    modalOverlay.querySelector('#test-local-url').addEventListener('click', () => {
      showARPreview(localUrl, projectId);
    });

    // PCブラウザで開く
    modalOverlay.querySelector('#open-local-url').addEventListener('click', () => {
      window.open(localUrl, '_blank', 'noopener,noreferrer');
    });

    // Web URL更新
    modalOverlay.querySelector('#update-web-url').addEventListener('click', () => {
      switchTab('web');
    });

    // Web URL入力時の自動更新
    modalOverlay.querySelector('#web-url-input').addEventListener('input', () => {
      if (currentMethod === 'web') {
        switchTab('web');
      }
    });

    // QRコード生成
    const generateQRCode = async () => {
        try {
            uiLogger.log('🔄 QRコード生成開始:', currentUrl);
            const canvas = document.getElementById('qrcode-canvas');
            if (!canvas) {
                throw new Error('Canvas element not found');
            }
            uiLogger.log('✅ Canvas要素を取得:', canvas);

            // QRCodeライブラリを取得
            const QRCode = await loadQRCode();
            uiLogger.log('✅ QRCodeライブラリを取得:', typeof QRCode, QRCode);

            if (!QRCode || typeof QRCode.toCanvas !== 'function') {
                console.error('❌ QRCodeライブラリが無効:', QRCode);
                throw new Error('QRCode library not available or toCanvas method missing');
            }

            uiLogger.log('🎯 QRCode生成開始:', { currentUrl, canvas });
            await QRCode.toCanvas(canvas, currentUrl, {
                width: 200,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            
            uiLogger.log('✅ QRコード生成完了:', {
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
                url: currentUrl,
                timestamp: new Date().toISOString()
            });

            // QRコードのダウンロード処理
            document.getElementById('download-qrcode').addEventListener('click', () => {
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

        } catch (error) {
            console.error('❌ QRコード生成エラー:', error);
            console.error('❌ エラー詳細:', {
                message: error.message,
                stack: error.stack,
                currentUrl,
                canvasExists: !!document.getElementById('qrcode-canvas')
            });
            
            const container = document.getElementById('qrcode-container');
            if (container) {
                container.innerHTML = `
                    <div style="color: red; text-align: center; padding: 1rem;">
                        <h3>❌ QRコード生成に失敗しました</h3>
                        <p><strong>エラー:</strong> ${error.message}</p>
                        <p style="font-size: 0.9em; word-break: break-all;"><strong>URL:</strong> ${currentUrl}</p>
                        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px;">
                            ページを再読み込み
                        </button>
                    </div>
                `;
            }
            
            // エラーが発生してもモーダルは閉じない
            return;
        }
    };

    // 補助: Blob→Base64
    const blobToBase64 = (blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // 開いたタイミングでローカル公開を試行（同一Wi-Fi前提）
    (async () => {
      try {
        if (!projectId || projectId === 'sample') throw new Error('プロジェクトID不明');

        const project = getProject(projectId);
        if (!project) throw new Error('プロジェクトデータが見つかりません');

        const withModels = await loadProjectWithModels(project);
        const modelPayload = [];
        for (const m of withModels.modelData || []) {
          if (m.blob) {
            const dataBase64 = await blobToBase64(m.blob);
            modelPayload.push({ fileName: m.fileName || 'model.glb', dataBase64 });
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
        
        if (editorSettings) {
          // ★★★ editorSettings内の入れ子になったeditorSettingsも削除 ★★★
          const cleanEditorSettings = { ...editorSettings };
          if (cleanEditorSettings.editorSettings) {
            console.warn('🔍 editorSettings内の重複editorSettingsを削除');
            delete cleanEditorSettings.editorSettings;
          }
          
          lsPayload.editorSettings = cleanEditorSettings;
          // ロゴがBase64で保持されている場合、API側でアセットとして書き出せるようにlogoImageに入れる
          const le = editorSettings.loadingScreen || {};
          if (typeof le.logo === 'string' && le.logo.startsWith('data:')) {
            lsPayload.logoImage = le.logo;
          }
        }

        // Start Screen をトップレベルに含める（Viewerが直接参照）
        const startScreenPayload = editorSettings?.startScreen || null;

        // ★★★ 最終正規化: 送信前にプロジェクトデータ全体を正規化 ★★★
        const originalProjectData = {
          id: projectId,
          type: project.type || 'markerless',
          loadingScreen: lsPayload,
          startScreen: startScreenPayload,
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
                localUrl = data.viewerUrl;
              }
            } catch (_) {}
            // 表示を更新
            const localUrlEl = modalOverlay.querySelector('#local-url');
            if (localUrlEl) localUrlEl.textContent = localUrl;
            // タブ状態がlocalならQR再生成
            if (currentMethod === 'local') {
              currentUrl = localUrl;
              generateQRCode();
            }
          }
        }
      } catch (e) {
        console.warn('ローカル公開に失敗（フォールバックでURLのみ表示）:', e);
        
        // ユーザーに分かりやすいエラーメッセージを表示
        const container = document.getElementById('qrcode-container');
        if (container) {
          container.innerHTML = `
            <div style="text-align: center; padding: 1rem; color: #666;">
              <p>⚠️ プロジェクトの公開準備中...</p>
              <p style="font-size: 0.9em;">QRコードを生成しています</p>
            </div>
          `;
        }
      } finally {
        // 初期QR生成（公開に成功していれば更新されたURLになる）
        setTimeout(() => generateQRCode(), 200);
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
