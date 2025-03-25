// src/components/ui.js

import { showMarkerUpload } from '../views/marker-upload.js';

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