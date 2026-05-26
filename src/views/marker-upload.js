// src/views/marker-upload.js
import { analyzeMarkerImage } from '../utils/marker-utils.js';
import { inferMarkerTypeFromDimensions } from '../utils/marker-engine-resolve.js';
import {
  formatMindTargetStatus,
  getStoredMindTarget,
  storeMindTargetFromFile
} from '../utils/mind-target-storage.js';

const MINDAR_COMPILER_URL = 'https://hiukim.github.io/mind-ar-js-doc/tools/compile';

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
            <div id="marker-preview-wrap" class="marker-preview-wrap" style="display:none;">
              <img id="marker-preview">
              <div id="marker-crop-overlay" class="marker-crop-overlay">
                <span class="marker-crop-label">認識範囲</span>
              </div>
            </div>
          </div>

          <input type="file" id="marker-file" accept="image/png, image/jpeg, image/jpg" style="display:none;">
          <button id="select-file-btn" class="btn-primary">ファイルを選択</button>
        </div>

        <!-- 長方形画像をアップした際の注意（中央正方形のみが認識対象） -->
        <div id="marker-rect-notice" class="marker-rect-notice" style="display:none;"></div>
        <div id="mind-upload-section" class="mind-upload-section" style="display:none;">
          <h3>表紙・ポスター用: .mind ファイルの登録</h3>
          <p>縦長・横長の画像は <strong>MindAR（imageTarget）</strong> が必要です。下の手順で同じ画像から .mind を作り、ここで登録してください。</p>
          <ol class="mind-upload-steps">
            <li><a href="${MINDAR_COMPILER_URL}" target="_blank" rel="noopener">MindAR Compiler</a> を開く</li>
            <li>上で選んだのと<strong>同じ画像</strong>をドロップ → <strong>Start</strong> → <strong>Download</strong></li>
            <li>ダウンロードした <code>targets.mind</code>（または .mind）を下のボタンで登録</li>
          </ol>
          <div class="mind-upload-actions">
            <input type="file" id="mind-file" accept=".mind,application/octet-stream" style="display:none;">
            <button type="button" id="select-mind-btn" class="btn-secondary">.mind ファイルを選択</button>
            <p id="mind-status" class="mind-status mind-status--missing">未登録</p>
          </div>
        </div>
        <!-- マーカー画像の品質チェック結果 -->
        <div id="marker-quality" class="marker-quality" style="display:none;"></div>

        <div class="upload-info">
          <p>サポートされているファイル形式: JPG, PNG</p>
          <p>推奨ファイルサイズ: 1〜2MB以下</p>
          <p>最適なマーカー: コントラストが高く、パターンが豊富な画像</p>
          <p>マーカー画像は中央を正方形に切り出して認識に使用します。</p>
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
    const previewWrap = document.getElementById('marker-preview-wrap');
    const cropOverlay = document.getElementById('marker-crop-overlay');
    const placeholder = document.querySelector('.upload-placeholder');
    const rectNotice = document.getElementById('marker-rect-notice');
    const mindUploadSection = document.getElementById('mind-upload-section');
    const mindFileInput = document.getElementById('mind-file');
    const selectMindBtn = document.getElementById('select-mind-btn');
    const mindStatus = document.getElementById('mind-status');
    const qualityBox = document.getElementById('marker-quality');

    // 直近の品質解析結果（アップロード時の確認に使用）
    let lastQuality = null;
    let pendingMarkerType = localStorage.getItem('markerType') || 'pattern';

    function renderMindStatus() {
      const status = formatMindTargetStatus(getStoredMindTarget());
      mindStatus.textContent = status.registered
        ? `${status.label}（${status.detail}）`
        : status.label;
      mindStatus.className = `mind-status ${status.registered ? 'mind-status--ok' : 'mind-status--missing'}`;
    }

    function showMindUploadSection(show) {
      mindUploadSection.style.display = show ? 'block' : 'none';
      if (show) renderMindStatus();
    }

    renderMindStatus();
    if (pendingMarkerType === 'imageTarget') {
      showMindUploadSection(true);
    }

    selectMindBtn.addEventListener('click', () => {
      mindFileInput.click();
    });

    mindFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const { fileName, size } = await storeMindTargetFromFile(file);
        renderMindStatus();
        alert(`.mind を登録しました: ${fileName}（${Math.round(size / 1024)} KB）`);
      } catch (error) {
        console.error('.mind 登録エラー:', error);
        alert(error.message || '.mind ファイルの登録に失敗しました。');
      } finally {
        mindFileInput.value = '';
      }
    });

    // 実際に .patt 化される正方形クロップ範囲をプレビュー上に表示する
    function updateCropOverlay() {
      const w = preview.clientWidth;
      const h = preview.clientHeight;
      if (!w || !h) return;
      const side = Math.min(w, h);
      cropOverlay.style.width = `${side}px`;
      cropOverlay.style.height = `${side}px`;
      cropOverlay.style.left = `${(w - side) / 2}px`;
      cropOverlay.style.top = `${(h - side) / 2}px`;
    }
    window.addEventListener('resize', updateCropOverlay);

    // 品質チェック結果を描画する
    function renderQuality(result) {
      const levelLabel = { good: '良好', warning: '注意', poor: '不向き' };
      const levelIcon = { good: '✓', warning: '⚠️', poor: '✕' };
      qualityBox.className = `marker-quality marker-quality--${result.level}`;
      let html = `<p class="marker-quality__title">${levelIcon[result.level]} マーカー品質: ${levelLabel[result.level]}</p>`;
      html += `<p class="marker-quality__metrics">コントラスト: ${result.contrast} ／ 特徴量: ${result.detail}</p>`;
      if (result.issues.length) {
        html += '<ul class="marker-quality__issues">'
          + result.issues.map((issue) => `<li>${issue}</li>`).join('')
          + '</ul>';
      } else {
        html += '<p class="marker-quality__ok">このまま安定して認識できる見込みです。</p>';
      }
      qualityBox.innerHTML = html;
      qualityBox.style.display = 'block';
    }

    // 選択画像を解析し、長方形通知と品質チェック結果を表示する
    async function analyzeAndDisplay(dataUrl) {
      rectNotice.style.display = 'none';
      qualityBox.className = 'marker-quality marker-quality--loading';
      qualityBox.textContent = 'マーカー画像を解析しています…';
      qualityBox.style.display = 'block';
      try {
        const result = await analyzeMarkerImage(dataUrl);
        lastQuality = result;

        // 長方形画像の場合は「中央の正方形だけが認識対象」と明示する
        pendingMarkerType = inferMarkerTypeFromDimensions(result.naturalWidth, result.naturalHeight);
        if (!result.isSquare) {
          rectNotice.innerHTML = '⚠️ 縦長・横長の画像です。表紙・ポスター全体を追跡するには <strong>MindAR（imageTarget）</strong> が必要です。'
            + '下の手順で .mind を作成・登録してから Cloud Release してください（従来の正方形パターン方式では中央の一部だけしか認識されません）。';
          rectNotice.style.display = 'block';
          showMindUploadSection(true);
        } else {
          showMindUploadSection(false);
        }

        renderQuality(result);
      } catch (error) {
        console.warn('マーカー品質解析に失敗:', error);
        lastQuality = null;
        qualityBox.style.display = 'none';
      }
    }

    selectFileBtn.addEventListener('click', () => {
      fileInput.click();
    });

    // ファイル選択時のプレビュー表示
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target.result;
          // 画像表示後にクロップ範囲オーバーレイを更新
          preview.onload = () => updateCropOverlay();
          preview.src = dataUrl;
          previewWrap.style.display = 'inline-block';
          placeholder.style.display = 'none';
          uploadBtn.disabled = false;
          // 長方形チェック・品質チェックを実行
          analyzeAndDisplay(dataUrl);
        };
        reader.readAsDataURL(file);
      }
    });

    // アップロードボタンのイベントリスナー
    uploadBtn.addEventListener('click', () => {
      const file = fileInput.files[0];
      if (file) {
        // 品質チェックで「不向き」と判定された場合は確認する
        if (lastQuality && lastQuality.level === 'poor') {
          const proceed = confirm('このマーカー画像は認識に適していない可能性があります（コントラストや模様が不足）。\nこのまま使用しますか？');
          if (!proceed) return;
        }
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
            const w = lastQuality?.naturalWidth;
            const h = lastQuality?.naturalHeight;
            const markerType = (w && h)
              ? inferMarkerTypeFromDimensions(w, h)
              : pendingMarkerType || 'pattern';
            localStorage.setItem('markerType', markerType);
            if (markerType === 'imageTarget' && !getStoredMindTarget()) {
              alert(
                '縦長・横長の表紙画像は MindAR 用の .mind ファイルが必要です。\n'
                + 'この画面の「.mind ファイルを選択」で登録してから、もう一度アップロードしてください。'
              );
              return;
            }

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
                const w2 = lastQuality?.naturalWidth;
                const h2 = lastQuality?.naturalHeight;
                localStorage.setItem(
                  'markerType',
                  (w2 && h2) ? inferMarkerTypeFromDimensions(w2, h2) : 'pattern'
                );
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
      window.removeEventListener('resize', updateCropOverlay);
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
