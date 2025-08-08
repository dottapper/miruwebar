// src/components/ui.js

import { showMarkerUpload } from '../views/marker-upload.js';
// QRCodeライブラリを遅延読み込みに変更
// import QRCode from 'qrcode';

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
    
    // モーダルをDOMに追加
    document.body.appendChild(modalOverlay);
    
    // フォーム送信処理
    const form = document.getElementById('save-project-form');
    const nameInput = document.getElementById('project-name');
    const descriptionInput = document.getElementById('project-description');
    
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
  export function showQRCodeModal(options = {}) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    // 選択中のモデル名をIDとして使用（本番環境では実際のIDを使用）
    const modelId = options.modelName ? encodeURIComponent(options.modelName) : 'sample';
    
    // 現在のホスト情報を取得
    const currentHost = window.location.host;
    const isLocalhost = currentHost.includes('localhost') || currentHost.includes('127.0.0.1');
    
    // URL生成
    const localUrl = `http://${currentHost}/#/viewer?src=http://${currentHost}/public/projects/${modelId}/project.json`;
    const appOrigin = window.location.origin;
    const webUrl = `${appOrigin}/#/viewer?src=https://your-domain.com/projects/${modelId}/project.json`;
    
    modalOverlay.innerHTML = `
        <div class="modal-content">
            <h2>ARをスマホで見る</h2>
            
            <!-- 公開方法選択 -->
            <div class="publish-method" style="margin-bottom: 1.5rem;">
                <h3 style="margin: 0 0 1rem 0; font-size: 1.1rem;">公開方法を選択</h3>
                <div class="method-tabs" style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                    <button id="local-tab" class="method-tab active" style="flex: 1; padding: 0.8rem; border: 1px solid var(--color-border); background: var(--color-primary); color: white; border-radius: 6px; cursor: pointer;">
                        Local (LAN)
                    </button>
                    <button id="web-tab" class="method-tab" style="flex: 1; padding: 0.8rem; border: 1px solid var(--color-border); background: transparent; color: var(--color-text-primary); border-radius: 6px; cursor: pointer;">
                        Web (公開URL)
                    </button>
                </div>
                
                <!-- Local設定 -->
                <div id="local-settings" class="method-settings">
                    <p style="margin: 0 0 0.5rem 0; color: var(--color-text-secondary); font-size: 0.9rem;">
                        📱 同一Wi-Fi内のスマホからアクセス可能
                    </p>
                    <div class="url-display" style="width: 100%; padding: 0.8rem; border-radius: var(--border-radius-medium); border: 1px solid var(--color-border); background-color: rgba(0,0,0,0.05); word-break: break-all; margin-bottom: 0.5rem;">
                        <span id="local-url">${localUrl}</span>
                    </div>
                    <button id="copy-local-url" class="secondary-button" style="padding: 0.5rem 1rem; border-radius: var(--border-radius-medium); margin-right: 0.5rem;">
                        ローカルURLをコピー
                    </button>
                    <button id="test-local-url" class="secondary-button" style="padding: 0.5rem 1rem; border-radius: var(--border-radius-medium);">
                        ブラウザで開く
                    </button>
                </div>
                
                <!-- Web設定 -->
                <div id="web-settings" class="method-settings" style="display: none;">
                    <p style="margin: 0 0 0.5rem 0; color: var(--color-text-secondary); font-size: 0.9rem;">
                        🌐 インターネット経由で誰でもアクセス可能
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
            
            <div class="button-group" style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button id="close-qrcode-modal" class="cancel-button" style="padding: 0.8rem 1.5rem; border-radius: var(--border-radius-medium);">
                    閉じる
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalOverlay);

    // タブ切り替え機能
    const localTab = modalOverlay.querySelector('#local-tab');
    const webTab = modalOverlay.querySelector('#web-tab');
    const localSettings = modalOverlay.querySelector('#local-settings');
    const webSettings = modalOverlay.querySelector('#web-settings');
    
    let currentMethod = 'local';
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
        const newWebUrl = `${webUrlInput}/viewer.html?src=${webUrlInput}/projects/${modelId}/project.json`;
        currentUrl = newWebUrl;
        modalOverlay.querySelector('#web-url').textContent = newWebUrl;
      }
      
      // QRコードを再生成
      generateQRCode();
    }

    localTab.addEventListener('click', () => switchTab('local'));
    webTab.addEventListener('click', () => switchTab('web'));

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

    // ブラウザで開く
    modalOverlay.querySelector('#test-local-url').addEventListener('click', () => {
      window.open(localUrl, '_blank');
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
            const canvas = document.getElementById('qrcode-canvas');
            if (!canvas) {
                throw new Error('Canvas element not found');
            }

            // QRCodeライブラリを遅延読み込み
            let QRCode = null;
            if (window.loadQRCode) {
                QRCode = await window.loadQRCode();
            } else {
                // フォールバック: 直接インポート
                const qrcodeModule = await import('qrcode');
                QRCode = qrcodeModule.default;
            }

            if (!QRCode) {
                throw new Error('QRCode library not available');
            }

            await QRCode.toCanvas(canvas, currentUrl, {
                width: 200,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            // QRコードのダウンロード処理
            document.getElementById('download-qrcode').addEventListener('click', () => {
                try {
                    const image = canvas.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.href = image;
                    link.download = `${modelId}-qrcode.png`;
                    link.click();
                } catch (error) {
                    console.error('QRコードのダウンロードに失敗しました:', error);
                    alert('QRコードのダウンロードに失敗しました。');
                }
            });

        } catch (error) {
            console.error('QRコード生成エラー:', error);
            const container = document.getElementById('qrcode-container');
            if (container) {
                container.innerHTML = `
                    <div style="color: red; text-align: center;">
                        <p>QRコードの生成に失敗しました。</p>
                        <p style="font-size: 0.9em;">URL: ${currentUrl}</p>
                    </div>
                `;
            }
        }
    };

    // QRコードを生成
    generateQRCode();

    // 閉じるボタンイベント
    document.getElementById('close-qrcode-modal').addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
    });
    
    // モーダル背景をクリックした時にも閉じる
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
    });
  }

