// src/views/marker-upload.js
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
          <p>最適なマーカー: コントラストが高く、パターンが豊富な画像</p>
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
        // 実際の実装では、ここでAPIにファイルをアップロードし、
        // 成功時にmarkerIdなどのデータを取得します
        
        // 画像を圧縮してからローカルストレージに保存
        const compressImage = (file, maxWidth = 800, quality = 0.8) => {
          return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
              // アスペクト比を維持しながらリサイズ
              const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
              canvas.width = img.width * ratio;
              canvas.height = img.height * ratio;
              
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL('image/jpeg', quality));
            };
            
            const reader = new FileReader();
            reader.onload = (e) => { img.src = e.target.result; };
            reader.readAsDataURL(file);
          });
        };
        
        // 画像を圧縮してから保存
        compressImage(file).then((compressedDataURL) => {
          try {
            const dataURL = compressedDataURL;
            // LocalStorage使用量を確認
            const currentSize = JSON.stringify(localStorage).length;
            const newDataSize = dataURL.length;
            const totalSize = currentSize + newDataSize;
            
            console.log(`LocalStorage使用量: ${Math.round(currentSize/1024)}KB, 新しい画像: ${Math.round(newDataSize/1024)}KB, 合計: ${Math.round(totalSize/1024)}KB`);
            
            // LocalStorage制限を回避：合計サイズが4MB以上の場合は警告
            if (totalSize > 4 * 1024 * 1024) {
              if (confirm(`ストレージ使用量が制限に近づいています（${Math.round(totalSize/1024)}KB）。既存データをクリアして続行しますか？`)) {
                // 重要なデータ以外をクリア
                const importantKeys = ['projects', 'settings'];
                const backup = {};
                importantKeys.forEach(key => {
                  if (localStorage.getItem(key)) {
                    backup[key] = localStorage.getItem(key);
                  }
                });
                localStorage.clear();
                Object.entries(backup).forEach(([key, value]) => {
                  localStorage.setItem(key, value);
                });
              } else {
                alert('画像アップロードをキャンセルしました。');
                return;
              }
            }
            
            // 実際の実装ではAPIにアップロードしたマーカーIDやURLを取得します
            // 仮実装としてローカルストレージに保存
            localStorage.setItem('markerImageUrl', dataURL);
            
            // アップロード完了後、エディタ画面へ遷移
            window.location.hash = '#/editor?type=marker';
            closeModal();
          } catch (error) {
            if (error.name === 'QuotaExceededError') {
              alert('ストレージ容量が不足しています。ブラウザのデータをクリアするか、小さな画像を使用してください。');
              // LocalStorageをクリアしてからもう一度試す
              if (confirm('ローカルデータをクリアして再試行しますか？')) {
                localStorage.clear();
                localStorage.setItem('markerImageUrl', dataURL);
                window.location.hash = '#/editor?type=marker';
                closeModal();
              }
            } else {
              console.error('マーカー画像保存エラー:', error);
              alert('画像の保存に失敗しました。');
            }
          }
        }).catch((error) => {
          console.error('画像圧縮エラー:', error);
          alert('画像の圧縮に失敗しました。');
        });
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