// src/views/marker-upload.js を修正
export function showMarkerUpload() {

  // モーダルの背景（オーバーレイ）要素を作成
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  
  // モーダルのコンテンツを設定
  modalOverlay.innerHTML = `
    <div class="modal-content">
      <h2>マーカーアップロード画面</h2>
      <p>マーカー型ARで使用する画像をアップロードしてください。</p>
      <p class="hint">写真、ポスター、名刺、ロゴ、イラストなどをご利用いただけます。</p>
      
      <div class="upload-area">
        <div class="upload-preview">
          <div class="upload-placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <p>ファイルを選択またはドラッグ&ドロップ</p>
          </div>
          <img id="marker-preview" style="display:none;">
        </div>
        
        <input type="file" id="marker-file" accept="image/png, image/jpeg, image/jpg" style="display:none;">
        <button id="select-file-btn" class="btn-primary">ファイルを選択</button>
      </div>
      
      <div class="upload-info">
        <p>サポートされているファイル形式: JPG, PNG</p>
        <p>推奨ファイルサイズ: 1〜2MB以下</p>
      </div>
      
      <div class="button-group">
        <button id="upload-marker" class="btn-primary" disabled>アップロード</button>
        <button id="cancel-upload" class="cancel-button">キャンセル</button>
      </div>
    </div>
  `;
  
  // モーダルをDOMに追加
  document.body.appendChild(modalOverlay);
  
  // ファイル選択ボタンのイベントリスナー
  const selectFileBtn = document.getElementById('select-file-btn');
  const fileInput = document.getElementById('marker-file');
  const uploadBtn = document.getElementById('upload-marker');
  const preview = document.getElementById('marker-preview');
  const placeholder = document.querySelector('.upload-placeholder');
  
  selectFileBtn.addEventListener('click', () => {
    fileInput.click();
  });
  
  // ファイル選択時のプレビュー表示
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.src = e.target.result;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
        uploadBtn.disabled = false;
      };
      reader.readAsDataURL(file);
    }
  });
  
  // アップロードボタンのイベントリスナー
  uploadBtn.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (file) {
      // 実際のアップロード処理はここに実装します（今回は省略）
      console.log('マーカー画像をアップロード:', file.name);
      
      // アップロード完了後、エディタ画面へ遷移
      window.location.hash = '#/editor?type=marker';
      closeModal();
    }
  });
  
  // キャンセルボタンのイベントリスナー
  document.getElementById('cancel-upload').addEventListener('click', closeModal);
  
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
  
  // ドラッグ&ドロップ機能の実装
  const dropArea = document.querySelector('.upload-area');
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
  });
  
  function highlight() {
    dropArea.classList.add('highlight');
  }
  
  function unhighlight() {
    dropArea.classList.remove('highlight');
  }
  
  dropArea.addEventListener('drop', handleDrop, false);
  
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      fileInput.files = dt.files;
      const event = new Event('change');
      fileInput.dispatchEvent(event);
    }
  }
}