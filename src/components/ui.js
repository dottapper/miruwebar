// src/components/ui.js

import { showMarkerUpload } from '../views/marker-upload.js';
import QRCode from 'qrcode';

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
   * @param {Function} onSave - 保存時のコールバック
   */
  export function showSaveProjectModal(options = {}, onSave) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    modalOverlay.innerHTML = `
        <div class="modal-content">
            <h2>${options.isEdit ? 'プロジェクトを更新' : '新規プロジェクトを保存'}</h2>
            <div class="form-group" style="margin-bottom: 1.5rem;">
                <label for="project-name" style="display: block; margin-bottom: 0.5rem;">プロジェクト名 *</label>
                <input type="text" 
                    id="project-name" 
                    class="form-input" 
                    value="${options.currentName || ''}" 
                    placeholder="プロジェクト名を入力"
                    style="width: 100%; padding: 0.8rem; border-radius: var(--border-radius-medium); border: 1px solid var(--color-border);"
                    required>
            </div>
            <div class="form-group" style="margin-bottom: 1.5rem;">
                <label for="project-description" style="display: block; margin-bottom: 0.5rem;">説明</label>
                <textarea 
                    id="project-description" 
                    class="form-input" 
                    rows="3"
                    placeholder="プロジェクトの説明を入力（任意）"
                    style="width: 100%; padding: 0.8rem; border-radius: var(--border-radius-medium); border: 1px solid var(--color-border);"
                >${options.currentDescription || ''}</textarea>
            </div>
            <div class="button-group" style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button id="save-project" class="primary-button" style="background: var(--gradient-primary); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: var(--border-radius-medium);">
                    ${options.isEdit ? '更新' : '保存'}
                </button>
                <button id="cancel-save" class="cancel-button" style="padding: 0.8rem 1.5rem; border-radius: var(--border-radius-medium);">
                    キャンセル
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalOverlay);

    // イベントハンドラ
    const handleSave = () => {
        const nameInput = document.getElementById('project-name');
        const descInput = document.getElementById('project-description');
        
        if (!nameInput.value.trim()) {
            nameInput.classList.add('error');
            nameInput.style.borderColor = 'var(--color-accent)';
            return;
        }

        const projectData = {
            name: nameInput.value.trim(),
            description: descInput.value.trim(),
            id: options.projectId || null,
            timestamp: Date.now()
        };

        if (onSave) onSave(projectData);
        document.body.removeChild(modalOverlay);
    };

    document.getElementById('save-project').addEventListener('click', handleSave);
    document.getElementById('cancel-save').addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
    });

    // エラー表示のクリア
    document.getElementById('project-name').addEventListener('input', (e) => {
        if (e.target.value.trim()) {
            e.target.classList.remove('error');
            e.target.style.borderColor = '';
        }
    });
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
    const arViewerUrl = `https://example.com/ar-viewer?id=${modelId}`;
    
    modalOverlay.innerHTML = `
        <div class="modal-content">
            <h2>ARをスマホで見る</h2>
            <div class="form-group" style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem;">AR表示URL</label>
                <div class="url-display" style="width: 100%; padding: 0.8rem; border-radius: var(--border-radius-medium); border: 1px solid var(--color-border); background-color: rgba(0,0,0,0.05); word-break: break-all;">
                    ${arViewerUrl}
                </div>
            </div>
            <div class="form-group" style="margin-bottom: 1.5rem; display: flex; flex-direction: column; align-items: center;">
                <label style="display: block; margin-bottom: 0.5rem;">QRコード</label>
                <div id="qrcode-container" style="background: white; padding: 1rem; margin-bottom: 1rem;">
                    <canvas id="qrcode-canvas" width="200" height="200"></canvas>
                </div>
                <button id="download-qrcode" class="secondary-button" style="padding: 0.5rem 1rem; border-radius: var(--border-radius-medium);">
                    QRコードをダウンロード
                </button>
            </div>
            <div class="button-group" style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button id="close-qrcode-modal" class="cancel-button" style="padding: 0.8rem 1.5rem; border-radius: var(--border-radius-medium);">
                    閉じる
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalOverlay);

    // QRコード生成
    const generateQRCode = async () => {
        try {
            const canvas = document.getElementById('qrcode-canvas');
            if (!canvas) {
                throw new Error('Canvas element not found');
            }

            await QRCode.toCanvas(canvas, arViewerUrl, {
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
                        <p style="font-size: 0.9em;">URL: ${arViewerUrl}</p>
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