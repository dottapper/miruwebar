// src/views/editor.js
import { initARViewer } from '../components/arViewer.js';
import { showMarkerUpload } from './marker-upload.js'; // 依存関係を確認
import { showSaveProjectModal, showQRCodeModal } from '../components/ui.js'; // 保存モーダルとQRコードモーダルをインポート
import { saveProject, getProject, loadProjectWithModels } from '../api/projects-new.js'; // 新しいIndexedDB 対応 API をインポート
import { exportProjectBundleById } from '../api/projects.js'; // エクスポート機能は従来版を使用
import { getLoadingScreenTemplate } from '../components/loading-screen-selector.js';
import { settingsAPI } from '../components/loading-screen/settings.js';

// CSSファイルのインポート
import '../styles/common.css';
import '../styles/editor.css';
// DEBUG ログ制御
const IS_DEBUG = (typeof window !== 'undefined' && !!window.DEBUG);
const dlog = (...args) => { if (IS_DEBUG) console.log(...args); };

/**
 * ファイルサイズを適切な単位でフォーマットする
 * @param {number} bytes - バイト単位のファイルサイズ
 * @returns {string} フォーマットされたファイルサイズ文字列
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function showEditor(container) {
  // URLパラメータからARタイプとプロジェクトIDを取得
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const arType = urlParams.get('type') || 'unknown';
  const projectId = urlParams.get('id') || null; // プロジェクトID取得
  const isMarkerMode = arType === 'marker';

  // ARタイプに応じたタイトルとヘルプテキストを設定
  let title = 'AR エディター';
  let helpText = 'ARモデルをカスタマイズできます。';

  switch (arType) {
    case 'marker':
      title = 'マーカー型AR エディター';
      helpText = 'マーカー画像の上に表示される3Dモデルを設定します。';
      break;
    case 'markerless':
      title = 'マーカーレスAR エディター';
      helpText = '平面に配置する3Dモデルを設定します。';
      break;
    case 'location':
      title = 'ロケーションベースAR エディター';
      helpText = 'GPS座標に配置する3Dモデルを設定します。';
      break;
    case 'object':
      title = '物体認識型AR エディター';
      helpText = '物体に合わせて表示される3Dモデルを設定します。';
      break;
    case 'face':
      title = 'フェイスタイプAR エディター';
      helpText = '顔に重ねて表示するARエフェクトを設定します。';
      break;
    // 必要に応じて他のARタイプも追加
  }

  // HTML構造を生成
  container.innerHTML = `
    <div class="editor-container">
      <div class="editor-header">
        <div class="header-left">
          <button id="back-to-projects" class="btn-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            戻る
          </button>
          <h1>${title}</h1>
        </div>
        <div class="toolbar">
          <button id="preview-button" class="btn-secondary">プレビュー</button>
          <button id="qrcode-button" class="btn-secondary">QRコードを発行</button>
          <button id="save-button" class="btn-primary">保存</button>
          <button id="share-button" class="btn-secondary">共有</button>
          <button id="export-button" class="btn-secondary">エクスポート</button>
        </div>
      </div>

      <div class="editor-info">
        <p>${helpText}</p>
      </div>
      <div class="editor-content">
        <div class="editor-grid-layout">
          <div class="upload-panel">
            <div class="panel-section">
              <h3>3Dモデル</h3>
              <div class="upload-area" id="model-upload-area">
                <div class="upload-placeholder">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <p>3Dモデル(.glb)をアップロード</p>
                  <button id="upload-model" class="btn-secondary">
                    ファイルを選択
                  </button>
                </div>
                <input type="file" id="model-file-input" accept=".glb" style="display:none;">
              </div>
            </div>

            <div class="panel-section">
              <h3>ファイル一覧</h3>
              <div class="file-list">
                <p class="empty-text">まだファイルがありません</p>
                </div>
              <p id="total-file-size">現在使用中：0MB / 50MB</p>
            </div>

            ${isMarkerMode ? `
            <div class="panel-section">
              <h3>マーカー画像（サムネイル）</h3>
              <div class="marker-thumbnail-container">
                <img id="marker-thumbnail" alt="マーカー画像" src="/assets/sample.png"> <button id="change-marker" class="btn-secondary">画像を変更</button>
              </div>
            </div>` : ''}
          </div>

          <div class="viewer-panel" style="height: calc(100vh - 250px);">
            <div id="ar-viewer"></div>
          </div>

          <div class="controls-panel">
            <!-- タブナビゲーション -->
            <div class="panel-tabs">
              <button class="panel-tab active" data-tab="model-controls">モデル調整</button>
              <button class="panel-tab" data-tab="loading-settings">ローディング設定</button>
            </div>

            <!-- モデル調整タブのコンテンツ -->
            <div id="model-controls-panel" class="panel-content active">
              <div class="panel-section">
                <h3>モデル調整</h3>
              <div class="control-group">
                <label>操作モード:</label>
                <div class="transform-mode-controls">
                  <div class="transform-mode-buttons">
                    <button class="transform-mode-btn active" data-mode="translate" title="移動">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                      <span class="transform-mode-btn-label">移動</span>
                    </button>
                    <button class="transform-mode-btn" data-mode="rotate" title="回転">
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8V3"></path><path d="M21 3v5h-5"></path></svg>
                      <span class="transform-mode-btn-label">回転</span>
                    </button>
                    <button class="transform-mode-btn" data-mode="scale" title="拡縮">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line></svg>
                      <span class="transform-mode-btn-label">拡縮</span>
                    </button>
                  </div>
                </div>
              </div>
              <div class="view-controls">
                <button id="reset-front-view-button" class="btn-secondary" title="正面ビューに戻す">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  正面ビューに戻す
                </button>
              </div>
              <div class="control-group">
                <label for="scale-slider">スケール:</label>
                <div class="slider-with-value">
                  <input type="range" id="scale-slider" min="0.1" max="2" step="0.1" value="1">
                  <span id="scale-value">1.0</span>
                </div>
                <div class="size-display"><span id="scale-size-label"></span></div>
              </div>
              <button id="reset-all-button" class="btn-secondary" style="width: 100%; margin-top: 10px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M3 21v-5h5"/>
                </svg>
                すべてリセット
              </button>
              
              <!-- アニメーション制御 -->
              <div id="animation-controls" class="control-group" style="margin-top: 15px; display: none;">
                <label>アニメーション:</label>
                <div class="animation-buttons" style="display: flex; gap: 5px; margin-top: 5px;">
                  <button id="play-animation-button" class="btn-secondary" style="flex: 1;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    再生
                  </button>
                  <button id="stop-animation-button" class="btn-secondary" style="flex: 1;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="6" y="4" width="4" height="16"></rect>
                      <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                    停止
                  </button>
                </div>
                <div id="animation-list" style="margin-top: 8px; font-size: 12px; color: #666;"></div>
              </div>
              <div class="control-group">
                <label for="rotation-slider">回転 (Y軸):</label>
                <div class="slider-with-value">
                  <input type="range" id="rotation-slider" min="0" max="360" step="1" value="0">
                  <span id="rotation-value">0°</span>
                </div>
              </div>
              <div class="control-group">
                <label>位置:</label>
                <div class="position-controls">
                  <div class="position-control"><span>X:</span><input type="range" id="position-x" min="-2" max="2" step="0.1" value="0"><span id="position-x-value">0.0</span></div>
                  <div class="position-control"><span>Y:</span><input type="range" id="position-y" min="-2" max="2" step="0.1" value="0"><span id="position-y-value">0.0</span></div>
                  <div class="position-control"><span>Z:</span><input type="range" id="position-z" min="-2" max="2" step="0.1" value="0"><span id="position-z-value">0.0</span></div>
                </div>
              </div>
            </div>
            <div class="panel-section">
              <h3>AR設定</h3>
              <div class="control-group">
                <label for="ar-scale">ARスケール倍率:</label>
                <div class="slider-with-value">
                  <input type="range" id="ar-scale" min="0.5" max="3" step="0.1" value="1">
                  <span id="ar-scale-value">1.0</span>
                </div>
              </div>
              ${isMarkerMode ? `
              <div class="control-group">
                <label for="marker-detection">マーカー検出:</label>
                <select id="marker-detection" class="form-select">
                  <option value="fast">高速（精度低）</option>
                  <option value="normal" selected>標準</option>
                  <option value="accurate">高精度（速度低）</option>
                </select>
              </div>` : ''}
            </div>
            </div>

            <!-- ローディング設定タブのコンテンツ -->
            <div id="loading-settings-panel" class="panel-content">
              <div class="panel-section">
                <h3>このプロジェクトのローディング画面</h3>
                
                <!-- ローディング画面選択 -->
                <div class="control-group">
                  <label for="loading-screen-select">ローディング画面を選択:</label>
                  <select id="loading-screen-select" class="control-select" style="width: 100%; margin-top: 5px;">
                    <option value="none">なし（ローディング画面を使用しない）</option>
                    <!-- 既存のローディング画面がここに動的に挿入される -->
                  </select>
                </div>
                
                <!-- アクションボタン -->
                <div class="control-group">
                  <div style="display: flex; gap: 8px;">
                    <button id="create-loading-screen" class="btn-secondary" style="flex: 1;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      新規作成
                    </button>
                    <button id="edit-loading-screen" class="btn-secondary" style="flex: 1;" disabled>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      編集
                    </button>
                  </div>
                </div>
                
                
                <!-- 説明 -->
                <div class="control-group">
                  <div class="info-box">
                    <p style="font-size: 0.9rem; color: var(--color-text-secondary); margin: 0;">
                      💡 このプロジェクト専用のローディング画面を作成・選択できます。
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>`;

  // --- DOM要素取得 (HTML生成後に行う) ---
  let modelFileInput = document.getElementById('model-file-input');
  let uploadButton = document.getElementById('upload-model');
  let uploadArea = document.getElementById('model-upload-area');
  let fileListContainer = document.querySelector('.file-list'); // ファイル一覧表示エリア
  let totalFileSizeElement = document.getElementById('total-file-size');
  let markerThumbnail = document.getElementById('marker-thumbnail'); // マーカーモード時のみ存在
  let changeMarkerButton = document.getElementById('change-marker'); // マーカーモード時のみ存在
  let backButton = document.getElementById('back-to-projects');
  let saveButton = document.getElementById('save-button');
  let qrcodeButton = document.getElementById('qrcode-button');
  let arViewerContainer = document.getElementById('ar-viewer'); // ARビューアのコンテナ
  let exportButton = document.getElementById('export-button');

  // 基本DOM要素の取得状況をログ出力
  dlog('基本DOM要素の取得状況:', {
    backButton: !!backButton,
    saveButton: !!saveButton,
    qrcodeButton: !!qrcodeButton,
    uploadArea: !!uploadArea,
    fileListContainer: !!fileListContainer,
    arViewerContainer: !!arViewerContainer
  });

  // 重要な要素が見つからない場合の警告
  if (!uploadArea) {
    console.error('❌ 重要なDOM要素が見つかりません: model-upload-area');
  }
  if (!fileListContainer) {
    console.error('❌ 重要なDOM要素が見つかりません: .file-list (クラス)');
  }
  if (!arViewerContainer) {
    console.error('❌ 重要なDOM要素が見つかりません: ar-viewer');
  }
  let scaleSlider = document.getElementById('scale-slider');
  let scaleValue = document.getElementById('scale-value');
  let scaleSizeLabel = document.getElementById('scale-size-label');
  let resetAllButton = document.getElementById('reset-all-button');
  let rotationSlider = document.getElementById('rotation-slider');
  let rotationValue = document.getElementById('rotation-value');
  let positionXSlider = document.getElementById('position-x');
  let positionYSlider = document.getElementById('position-y');
  let positionZSlider = document.getElementById('position-z');
  let positionXValue = document.getElementById('position-x-value');
  let positionYValue = document.getElementById('position-y-value');
  let positionZValue = document.getElementById('position-z-value');
  let arScaleSlider = document.getElementById('ar-scale');
  let arScaleValue = document.getElementById('ar-scale-value');
  let translateButton = document.querySelector('button[data-mode="translate"]');
  let rotateButton = document.querySelector('button[data-mode="rotate"]');
  let scaleButton = document.querySelector('button[data-mode="scale"]');
  
  // アニメーション制御用のDOM要素
  let animationControls = document.getElementById('animation-controls');
  let playAnimationButton = document.getElementById('play-animation-button');
  let stopAnimationButton = document.getElementById('stop-animation-button');
  let animationList = document.getElementById('animation-list');
  

  // --- 状態管理変数 ---
  let totalFileSize = 0;
  const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB
  let originalModelSize = { width: 0, height: 0, depth: 0 }; // モデルの元サイズ
  
  // --- 変更追跡用の状態管理 ---
  let hasUnsavedChanges = false;

  // --- ローディング設定関連の変数 ---
  let loadingEnabled, loadingTemplate, loadingMessage, loadingBgColor, loadingBgColorText,
      loadingTextColor, loadingTextColorText, loadingProgressColor, loadingProgressColorText,
      loadingLogoInput, loadingLogoButton, loadingLogoPreview, loadingLogoImg,
      loadingLogoRemove, loadingShowProgress, loadingPreviewButton;

  // --- 変更追跡用の関数 ---
  function markAsChanged() {
    hasUnsavedChanges = true;
    dlog('変更が検出されました - 未保存状態に設定');
  }

  function markAsSaved() {
    hasUnsavedChanges = false;
    dlog('保存完了 - 保存済み状態に設定');
  }

  function checkForUnsavedChanges() {
    return hasUnsavedChanges;
  }

  // 戻る前の保存確認ダイアログ
  function showUnsavedChangesDialog() {
    return new Promise((resolve) => {
      const message = "変更内容が保存されていません。\n\n保存してからプロジェクト一覧に戻りますか？";
      const result = confirm(message);
      
      if (result) {
        // 「OK」を選択 - 保存してから戻る
        dlog('ユーザーが保存を選択しました');
        handleSaveProject()
          .then(() => {
            dlog('保存完了 - プロジェクト一覧に戻ります');
            resolve(true);
          })
          .catch((error) => {
            console.error('保存に失敗しました:', error);
            alert('保存に失敗しました。もう一度お試しください。');
            resolve(false);
          });
      } else {
        // 「キャンセル」を選択 - 保存せずに戻る
        const confirmDiscard = confirm("変更内容を破棄してプロジェクト一覧に戻りますか？");
        dlog(confirmDiscard ? 'ユーザーが変更破棄を選択しました' : 'ユーザーが操作をキャンセルしました');
        resolve(confirmDiscard);
      }
    });
  }

  // --- ARビューアー初期化 ---
  let viewerInstance = null;
  let savedSelectedScreenId = 'none'; // ローディング画面選択の保持用（デフォルト値を設定）
  
  async function initialize() {
    try {
      dlog('🚀 エディタの初期化を開始... [修正版 v2.0]');
      dlog('🔧 デバッグモード: アニメーション機能付き');
      dlog('🔍 projectId:', projectId);
      dlog('🔍 arType:', arType);
      dlog('🔍 isMarkerMode:', isMarkerMode);
      
      // DOM要素の存在確認
      const arViewerElement = document.getElementById('ar-viewer');
      dlog('ar-viewer要素:', arViewerElement);
      if (!arViewerElement) {
        throw new Error('ar-viewer要素が見つかりません');
      }
      
      dlog('ar-viewer要素のサイズ:', {
        width: arViewerElement.clientWidth,
        height: arViewerElement.clientHeight,
        offsetWidth: arViewerElement.offsetWidth,
        offsetHeight: arViewerElement.offsetHeight
      });

      // 通知アニメーション用のCSSを追加
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);

      dlog('ARビューアーの初期化を開始...');
      // ARビューアの初期化
      viewerInstance = await initARViewer('ar-viewer', {
        markerMode: isMarkerMode,
        showGrid: true,
        backgroundColor: 0x222222,
        onModelLoaded: (size) => {
          dlog('モデルが読み込まれました:', size);
          originalModelSize = { width: size.x, height: size.y, depth: size.z };
          updateRealSizeDisplay(1.0);
        }
      });

      dlog('ARビューアーの初期化完了:', viewerInstance);

      if (!viewerInstance) {
        const arViewerElement = document.getElementById('ar-viewer');
        throw new Error(`ARビューアーの初期化に失敗しました: ${JSON.stringify({
          arViewerExists: !!arViewerElement,
          arViewerSize: arViewerElement ? {
            width: arViewerElement.clientWidth,
            height: arViewerElement.clientHeight
          } : null,
          containerId: 'ar-viewer',
          markerMode: isMarkerMode,
          projectId: projectId,
          arType: arType
        })}`);
      }

      // イベントリスナーの設定
      dlog('イベントリスナーの設定を開始...');
      setupEventListeners();

      // 既存プロジェクトの場合は読み込み
      if (projectId) {
        dlog('既存プロジェクトの読み込みを開始:', projectId);
        
        // デバッグ: プロジェクトデータを直接確認
        const debugProject = getProject(projectId);
        dlog('🔍 デバッグ: プロジェクトデータ直接確認:', {
          exists: !!debugProject,
          id: debugProject?.id,
          name: debugProject?.name,
          type: debugProject?.type,
          modelSettingsCount: debugProject?.modelSettings?.length || 0,
          hasMarkerImage: !!debugProject?.markerImage,
          markerImagePreview: debugProject?.markerImage?.substring(0, 50) || 'なし'
        });
        
        await loadExistingProject(projectId);
      }

      // ローディング設定の表示を更新
      setTimeout(() => {
        updateLoadingSettingsDisplay();
      }, 100);

      dlog('エディタの初期化が完了しました');
    } catch (error) {
      console.error('エディタの初期化に失敗しました:', error);
      alert('エディタの初期化に失敗しました。ページを再読み込みしてください。\n詳細: ' + error.message);
    }
  }

  // IndexedDB対応：既存プロジェクトの読み込み
  async function loadExistingProject(projectId) {
    try {
      // 基本プロジェクトデータを取得
      const basicProject = getProject(projectId);
      if (!basicProject) {
        console.error('❌ プロジェクトが見つかりません:', projectId);
        return;
      }
      
      // IndexedDB からモデルデータを読み込み
      let modelData = [];
      try {
        const projectWithModels = await loadProjectWithModels(basicProject);
        modelData = projectWithModels.modelData;
      } catch (loadError) {
        console.error('❌ IndexedDB モデル読み込みエラー:', loadError);
      }
      
      // プロジェクトデータにモデルデータを追加
      const project = {
        ...basicProject,
        modelData: modelData
      };
      
      

      // マーカー画像の復元（マーカーモードの場合）
      if (isMarkerMode) {
        let markerUrlToUse = null;
        
        if (project.markerImage && project.markerImage !== 'has_marker') {
          // プロジェクトに保存されたマーカー画像を使用
          markerUrlToUse = project.markerImage;
        } else {
          // 既存のlocalStorageからマーカー画像を取得
          const existingMarkerUrl = localStorage.getItem('markerImageUrl');
          
          if (existingMarkerUrl) {
            markerUrlToUse = existingMarkerUrl;
          } else {
            // デフォルト画像を使用
            markerUrlToUse = '/assets/sample.png';
          }
        }
        
        if (markerUrlToUse) {
          try {
            if (markerThumbnail) {
              markerThumbnail.src = markerUrlToUse;
            }
            if (viewerInstance?.controls?.setMarkerTexture) {
              viewerInstance.controls.setMarkerTexture(markerUrlToUse);
            }
          } catch (markerError) {
            console.error('❌ マーカー画像設定エラー:', markerError);
            // エラーの場合はデフォルト画像にフォールバック
            const fallbackUrl = '/assets/sample.png';
            if (markerThumbnail) {
              markerThumbnail.src = fallbackUrl;
            }
            if (viewerInstance?.controls?.setMarkerTexture) {
              viewerInstance.controls.setMarkerTexture(fallbackUrl);
            }
          }
        }
      }

      // 3Dモデルの復元 - IndexedDB から読み込まれたモデルデータを復元
      
      if (project.modelData && project.modelData.length > 0) {
        const emptyText = fileListContainer.querySelector('.empty-text');
        if (emptyText) {
          emptyText.remove();
        }

        let successCount = 0;
        let errorCount = 0;

        // IndexedDBから復元された各モデルを処理
        for (let index = 0; index < project.modelData.length; index++) {
          const modelData = project.modelData[index];
          
          try {
            let modelIndex = null;
            
            // loadProjectWithModels() は { objectUrl, blob, meta } を返す
            // 旧名 modelBlob ではなく blob を参照する
            if (modelData.objectUrl && modelData.blob) {
              try {
                // ARビューアにモデルを読み込み
                modelIndex = await viewerInstance.controls.loadNewModel(
                  modelData.objectUrl,
                  modelData.fileName,
                  modelData.blob.size
                );
                
                // ファイルリストにアイテムを追加
                const fileItem = createFileListItem(
                  {
                    name: modelData.fileName,
                    size: modelData.blob.size
                  }, 
                  modelData.objectUrl, 
                  modelIndex
                );
                fileListContainer.appendChild(fileItem);
                
                // 保存された変形設定を適用
                if (modelData.transform) {
                  setTimeout(() => {
                    if (viewerInstance?.controls?.setPosition && modelData.transform.position) {
                      viewerInstance.controls.setPosition(
                        modelData.transform.position.x,
                        modelData.transform.position.y,
                        modelData.transform.position.z
                      );
                    }
                    if (viewerInstance?.controls?.setRotationY && modelData.transform.rotation) {
                      viewerInstance.controls.setRotationY(modelData.transform.rotation.y);
                    }
                    if (viewerInstance?.controls?.setScale && modelData.transform.scale) {
                      viewerInstance.controls.setScale(modelData.transform.scale.x);
                    }
                  }, 500);
                }
                
                // 合計ファイルサイズを更新
                totalFileSize += modelData.blob.size;
                
                successCount++;
                
              } catch (loadError) {
                console.error('❌ IndexedDB モデル読み込み失敗:', loadError);
                throw loadError;
              }
            } else {
              // モデルデータがない場合（エラー処理）
              console.warn(`⚠️ モデル ${modelData.fileName} の復元データが不完全`);
              
              // 設定情報のみ表示
              const infoItem = createModelInfoItem(modelData, index);
              fileListContainer.appendChild(infoItem);
              errorCount++;
              continue;
            }
            
          } catch (error) {
            errorCount++;
            console.error(`❌ モデル "${modelData.fileName}" の復元に失敗:`, error);
            
            // エラーの場合は設定情報のみ表示
            const infoItem = createModelInfoItem(modelData, index);
            fileListContainer.appendChild(infoItem);
          }
        }
        
        // 総ファイルサイズ表示を更新
        updateTotalFileSizeDisplay();
        
        // アニメーション情報を更新
        setTimeout(() => {
          updateAnimationInfo();
        }, 1000);
        
        // 復元結果の通知
        const totalModels = project.modelData.length;
        if (successCount > 0) {
          showNotification(`${successCount}/${totalModels}個のモデルを復元しました`, 'success');
        }
        if (errorCount > 0) {
          showNotification(`${errorCount}個のモデルは再アップロードが必要です`, 'info');
        }
      }

      // ローディング設定をUIに反映
      if (project.loadingScreen) {
        loadLoadingSettingsToUI(project.loadingScreen);
        
        // プロジェクトにローディング画面エディターの詳細設定が含まれている場合は復元
        if (project.loadingScreen.editorSettings) {
          try {
            dlog('🔄 ローディング画面エディターの詳細設定を復元中...');
            await settingsAPI.saveSettings(project.loadingScreen.editorSettings);
            dlog('✅ ローディング画面エディターの詳細設定を復元完了');
          } catch (error) {
            console.warn('⚠️ ローディング画面エディターの詳細設定復元に失敗:', error);
          }
        }
        
        // セレクトボックスの復元が確実に行われるよう、少し遅延を入れて再度チェック
        setTimeout(() => {
          const loadingScreenSelect = document.getElementById('loading-screen-select');
          if (loadingScreenSelect && project.loadingScreen.selectedScreenId) {
            const currentValue = loadingScreenSelect.value;
            const expectedValue = project.loadingScreen.selectedScreenId;
            
            if (currentValue !== expectedValue) {
              dlog('🔄 ローディング画面選択の再復元:', {
                current: currentValue,
                expected: expectedValue
              });
              
              loadingScreenSelect.value = expectedValue;
              savedSelectedScreenId = expectedValue;
              updateEditButtonState();
            }
          }
        }, 100);
      }
      
      // ローディング画面設定の復元（シンプル版）
      if (project.loadingScreen && project.loadingScreen.selectedScreenId) {
        setTimeout(() => {
          const loadingScreenSelect = document.getElementById('loading-screen-select');
          if (loadingScreenSelect) {
            loadingScreenSelect.value = project.loadingScreen.selectedScreenId;
            savedSelectedScreenId = project.loadingScreen.selectedScreenId;
            dlog('✅ ローディング画面設定を復元:', project.loadingScreen.selectedScreenId);
          }
        }, 200);
      }
      
    } catch (error) {
      console.error('プロジェクト読み込みエラー:', error);
    }
  }

  // ローディング設定をUIに読み込む関数
  function loadLoadingSettingsToUI(settings) {
    try {
      if (loadingEnabled) loadingEnabled.checked = settings.enabled ?? true;
      if (loadingTemplate) loadingTemplate.value = settings.template ?? 'default';
      if (loadingMessage) loadingMessage.value = settings.message ?? 'ARコンテンツを準備中...';
      if (loadingBgColor) loadingBgColor.value = settings.backgroundColor ?? '#1a1a1a';
      if (loadingBgColorText) loadingBgColorText.value = settings.backgroundColor ?? '#1a1a1a';
      if (loadingTextColor) loadingTextColor.value = settings.textColor ?? '#ffffff';
      if (loadingTextColorText) loadingTextColorText.value = settings.textColor ?? '#ffffff';
      if (loadingProgressColor) loadingProgressColor.value = settings.progressColor ?? '#4CAF50';
      if (loadingProgressColorText) loadingProgressColorText.value = settings.progressColor ?? '#4CAF50';
      if (loadingShowProgress) loadingShowProgress.checked = settings.showProgress ?? true;
      
      // ローディング画面選択ドロップダウンの復元
      const loadingScreenSelect = document.getElementById('loading-screen-select');
      dlog('🔍 ローディング画面選択復元処理:', {
        selectElement: !!loadingScreenSelect,
        selectedScreenId: settings.selectedScreenId,
        selectCurrentValue: loadingScreenSelect?.value,
        settingsKeys: Object.keys(settings),
        allSettings: settings
      });
      
      if (loadingScreenSelect) {
        const screenIdToSet = settings.selectedScreenId || 'none';
        loadingScreenSelect.value = screenIdToSet;
        savedSelectedScreenId = screenIdToSet; // グローバル変数に保存
        dlog('🔄 ローディング画面選択を復元:', screenIdToSet, '→', loadingScreenSelect.value);
        dlog('💾 savedSelectedScreenId に保存:', savedSelectedScreenId);
        // 編集ボタンの状態も更新
        updateEditButtonState();
      }
      
      // ロゴ画像の復元
      if (settings.logoImage && loadingLogoImg && loadingLogoPreview) {
        loadingLogoImg.src = settings.logoImage;
        loadingLogoPreview.style.display = 'block';
      }
      
      dlog('✅ ローディング設定をUIに復元しました');
    } catch (error) {
      console.error('❌ ローディング設定の復元エラー:', error);
    }
  }

  // アップロードボタンのクリックハンドラ
  function handleUploadButtonClick() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.glb,.gltf';
    fileInput.style.display = 'none';
    
    fileInput.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        // ファイルサイズを取得（MB単位）
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        
        // モデルを読み込む
        const modelIndex = await viewerInstance.controls.loadNewModel(file, file.name, fileSizeMB);
        
        // ファイルリストに追加
        const objectUrl = URL.createObjectURL(file);
        const fileItem = createFileListItem(file, objectUrl, modelIndex);
        
        // 空のメッセージを削除
        const emptyText = fileListContainer.querySelector('.empty-text');
        if (emptyText) {
          emptyText.remove();
        }
        
        // ファイルリストに追加
        fileListContainer.appendChild(fileItem);
        
        // 合計ファイルサイズを更新
        totalFileSize += file.size;
        updateTotalFileSizeDisplay();
        
        // ファイルアップロードを変更として記録
        markAsChanged();
        
        // アニメーション情報を更新
        setTimeout(() => {
          updateAnimationInfo();
        }, 100);
        
        dlog(`モデル "${file.name}" (${fileSizeMB}MB) を読み込みました`);
      } catch (error) {
        console.error('モデルのアップロードに失敗しました:', error);
        alert('モデルのアップロードに失敗しました: ' + error.message);
      }
    };
    
    fileInput.click();
  }

  // タブ切り替え機能の設定
  function setupTabSwitching() {
    dlog('🔧 タブ切り替え機能を設定中...');
    
    const tabButtons = document.querySelectorAll('.panel-tab');
    const tabContents = document.querySelectorAll('.panel-content');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        
        // すべてのタブボタンからアクティブクラスを削除
        tabButtons.forEach(btn => btn.classList.remove('active'));
        
        // すべてのタブコンテンツを非表示
        tabContents.forEach(content => {
          content.classList.remove('active');
          content.style.display = 'none';
        });
        
        // クリックされたタブをアクティブに
        button.classList.add('active');
        
        // 対応するコンテンツを表示
        const targetContent = document.getElementById(`${targetTab}-panel`);
        if (targetContent) {
          targetContent.classList.add('active');
          targetContent.style.display = 'block';
          dlog(`✅ タブ "${targetTab}" に切り替えました`);
          
          // ローディング設定タブが表示された時にローディング画面一覧を読み込み
          if (targetTab === 'loading-settings') {
            loadLoadingScreens();
          }
        } else {
          console.warn(`⚠️ タブコンテンツ "${targetTab}-panel" が見つかりません`);
        }
      });
    });
    
    dlog('✅ タブ切り替え機能の設定が完了しました');
  }

  // イベントリスナーのセットアップを関数にまとめる
  function setupEventListeners() {
    dlog('イベントリスナーの設定を開始...');
    
    // タブ切り替え機能
    setupTabSwitching();
    
    // イベント委譲を使用した戻るボタンの設定（フォールバック）
    container.addEventListener('click', async (event) => {
      if (event.target.id === 'back-to-projects' || event.target.closest('#back-to-projects')) {
        dlog('戻るボタンがクリックされました（イベント委譲）');
        event.preventDefault();
        
        if (checkForUnsavedChanges()) {
          dlog('未保存の変更があります - 確認ダイアログを表示（イベント委譲）');
          const shouldProceed = await showUnsavedChangesDialog();
          if (shouldProceed) {
            dlog('プロジェクト一覧に遷移します（イベント委譲）');
            window.location.hash = '#/projects';
          } else {
            dlog('戻る操作がキャンセルされました（イベント委譲）');
          }
        } else {
          dlog('未保存の変更はありません - プロジェクト一覧に遷移します（イベント委譲）');
          window.location.hash = '#/projects';
        }
      }
    });
    dlog('イベント委譲による戻るボタンのイベントリスナーを設定しました');
    
    // マーカー画像設定 (マーカーモード時)
    if (isMarkerMode && markerThumbnail) {
      const markerImageUrl = localStorage.getItem('markerImageUrl');
      if (markerImageUrl) {
        markerThumbnail.src = markerImageUrl;
        // ビューアにも反映
        if (viewerInstance?.controls?.setMarkerTexture) {
           viewerInstance.controls.setMarkerTexture(markerImageUrl);
        }
      }
      // マーカー変更ボタンのリスナー設定
      if (changeMarkerButton) {
          changeMarkerButton.addEventListener('click', () => {
            showMarkerUpload();
            window.addEventListener('markerUploaded', handleMarkerUploaded, { once: true });
          });
      }
    }

    // GLBモデルアップロード (ファイル選択ボタン)
    if (uploadButton && modelFileInput) {
      uploadButton.addEventListener('click', handleUploadButtonClick);
    }

    // GLBモデルアップロード (ドラッグ＆ドロップ)
    if (uploadArea) {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, handleDragEvent);
      });
      uploadArea.addEventListener('dragenter', handleDragEnter);
      uploadArea.addEventListener('dragleave', handleDragLeave);
      uploadArea.addEventListener('drop', handleDrop);
    }

    // スケール・回転・位置スライダー
    if (scaleSlider) scaleSlider.addEventListener('input', (e) => {
      handleScaleChange(e);
      markAsChanged(); // 変更を記録
    });
    if (resetAllButton) {
      resetAllButton.addEventListener('click', handleResetAll);
    }
    if (rotationSlider) rotationSlider.addEventListener('input', (e) => {
      handleRotationChange(e);
      markAsChanged(); // 変更を記録
    });
    if (arScaleSlider) arScaleSlider.addEventListener('input', handleArScaleChange);
    if (positionXSlider) positionXSlider.addEventListener('input', updatePosition);
    if (positionYSlider) positionYSlider.addEventListener('input', updatePosition);
    if (positionZSlider) positionZSlider.addEventListener('input', updatePosition);

    // 変形モードボタン
    setupTransformControls();

    // 正面ビューリセットボタン
    const resetFrontViewButton = document.getElementById('reset-front-view-button');
    if (resetFrontViewButton) resetFrontViewButton.addEventListener('click', handleResetFrontView);

    // TransformControlsからの変更イベントを監視（ギズモ操作時のUI同期）
    if (arViewerContainer) {
      arViewerContainer.addEventListener('transformChanged', (event) => {
        handleTransformChanged(event);
        markAsChanged(); // 変更を記録
      });
      // handleScaleReset関数は不要なので削除
      arViewerContainer.addEventListener('modelListChanged', () => {
        markAsChanged(); // モデルリスト変更を記録
      });
    }

    // バックボタン
    if (backButton) {
      backButton.addEventListener('click', async (e) => {
        dlog('戻るボタンがクリックされました');
        e.preventDefault();
        
        if (checkForUnsavedChanges()) {
          dlog('未保存の変更があります - 確認ダイアログを表示');
          const shouldProceed = await showUnsavedChangesDialog();
          if (shouldProceed) {
            dlog('プロジェクト一覧に遷移します');
            window.location.hash = '#/projects';
          } else {
            dlog('戻る操作がキャンセルされました');
          }
        } else {
          dlog('未保存の変更はありません - プロジェクト一覧に遷移します');
          window.location.hash = '#/projects';
        }
      });
      dlog('戻るボタンのイベントリスナーが設定されました');
    } else {
      console.error('戻るボタンの要素が見つかりませんでした。再取得を試行します...');
      // 再取得を試行
      setTimeout(() => {
        const retryBackButton = document.getElementById('back-to-projects');
        if (retryBackButton) {
          retryBackButton.addEventListener('click', async (e) => {
            dlog('戻るボタンがクリックされました（再取得後）');
            e.preventDefault();
            
            if (checkForUnsavedChanges()) {
              dlog('未保存の変更があります - 確認ダイアログを表示（再取得後）');
              const shouldProceed = await showUnsavedChangesDialog();
              if (shouldProceed) {
                dlog('プロジェクト一覧に遷移します（再取得後）');
                window.location.hash = '#/projects';
              } else {
                dlog('戻る操作がキャンセルされました（再取得後）');
              }
            } else {
              dlog('未保存の変更はありません - プロジェクト一覧に遷移します（再取得後）');
              window.location.hash = '#/projects';
            }
          });
          dlog('戻るボタンのイベントリスナーが設定されました（再取得後）');
        } else {
          console.error('戻るボタンの再取得にも失敗しました');
        }
      }, 100);
    }

    // QRコードボタン
    if (qrcodeButton) qrcodeButton.addEventListener('click', handleQRCodeButtonClick);

    // 保存ボタン
    if (saveButton) {
      saveButton.addEventListener('click', () => {
        handleSaveProject();
      });
    }
    
    // アニメーション制御ボタン
    if (playAnimationButton) {
      playAnimationButton.addEventListener('click', handlePlayAnimation);
    }
    if (stopAnimationButton) {
      stopAnimationButton.addEventListener('click', handleStopAnimation);
    }
    
    // ローディング設定のイベントリスナー
    
    // ローディング画面選択のイベントリスナー
    const loadingScreenSelect = document.getElementById('loading-screen-select');
    if (loadingScreenSelect) {
      loadingScreenSelect.addEventListener('change', (event) => {
        savedSelectedScreenId = event.target.value; // グローバル変数を更新
        dlog('🔄 ローディング画面選択変更:', event.target.value);
        updateEditButtonState();
      });
    }
    
    // 新規作成ボタン
    const createLoadingScreenBtn = document.getElementById('create-loading-screen');
    if (createLoadingScreenBtn) {
      createLoadingScreenBtn.addEventListener('click', (e) => {
        e.preventDefault();
        dlog('新規ローディング画面作成ボタンがクリックされました');
        
        // 直接ローディング画面エディターを開く（新規作成モード）
        window.location.hash = '#/loading-screen?mode=new';
      });
    }
    
    // 編集ボタン
    const editLoadingScreenBtn = document.getElementById('edit-loading-screen');
    if (editLoadingScreenBtn) {
      editLoadingScreenBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const selectedTemplateId = loadingScreenSelect?.value;
        if (selectedTemplateId && selectedTemplateId !== 'none') {
          dlog('ローディング画面編集ボタンがクリックされました:', selectedTemplateId);
          
          // 現在のプロジェクトのローディング画面設定を取得
          const currentProjectId = new URLSearchParams(window.location.hash.split('?')[1] || '').get('id');
          if (currentProjectId) {
            try {
              const project = getProject(currentProjectId);
              if (project?.loadingScreen?.editorSettings) {
                // プロジェクトに詳細設定がある場合はローディング画面エディターに復元
                await settingsAPI.saveSettings(project.loadingScreen.editorSettings);
                dlog('✅ プロジェクトの詳細設定をローディング画面エディターに復元');
              }
            } catch (error) {
              console.warn('⚠️ プロジェクト設定のローディング画面エディター復元に失敗:', error);
            }
          }
          
          // 直接ローディング画面エディターを開く（編集モード）
          window.location.hash = `#/loading-screen?template=${selectedTemplateId}`;
        } else {
          alert('編集するローディング画面を選択してください。');
        }
      });
    }
    
    if (exportButton) {
      exportButton.addEventListener('click', async () => {
        try {
          const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
          const currentProjectId = urlParams.get('id');
          if (!currentProjectId) {
            alert('まずプロジェクトを保存してください（IDが必要です）。');
            return;
          }
          const blob = await exportProjectBundleById(currentProjectId);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${currentProjectId}.zip`;
          a.click();
          URL.revokeObjectURL(url);
        } catch (e) {
          console.error('エクスポートに失敗:', e);
          alert('エクスポートに失敗しました: ' + e.message);
        }
      });
    }
  }

  // --- 関数定義 ---

  // ローディング画面一覧を読み込む関数
  function loadLoadingScreens() {
    try {
      dlog('🔄 ローディング画面一覧を読み込み中...');
      
      // localStorageから保存済みのローディング画面を取得
      const stored = localStorage.getItem('loadingScreenTemplates');
      const templates = stored ? JSON.parse(stored) : [];
      
      dlog('📋 取得したローディング画面:', templates);
      
      // ドロップダウンを更新
      const selectElement = document.getElementById('loading-screen-select');
      if (selectElement) {
        // 現在の選択値を保持
        const currentValue = selectElement.value;
        dlog('🔍 現在の選択値を保持:', currentValue);
        
        // 既存のオプションをクリア（「なし」は残す）
        const noneOption = selectElement.querySelector('option[value="none"]');
        selectElement.innerHTML = '';
        if (noneOption) {
          selectElement.appendChild(noneOption);
        } else {
          selectElement.innerHTML = '<option value="none">なし（ローディング画面を使用しない）</option>';
        }
        
        // 既存のローディング画面をオプションとして追加
        templates.forEach(template => {
          const option = document.createElement('option');
          option.value = template.id;
          option.textContent = `${template.name} (${template.createdAt})`;
          selectElement.appendChild(option);
        });
        
        // 保存されていた選択値を復元（優先順位: グローバル変数 → 現在の選択値）
        const valueToRestore = savedSelectedScreenId || currentValue;
        
        if (valueToRestore && selectElement.querySelector(`option[value="${valueToRestore}"]`)) {
          selectElement.value = valueToRestore;
          dlog('🔄 選択値を復元:', valueToRestore, '(ソース:', savedSelectedScreenId ? 'プロジェクト' : 'UI', ')');
        } else if (valueToRestore) {
          console.warn('⚠️ 保存されていた選択値が見つかりません:', valueToRestore);
          selectElement.value = 'none'; // フォールバック
        }
        
        dlog(`✅ ローディング画面ドロップダウンを更新: ${templates.length}個`);
      }
      
      // 編集ボタンの状態を更新
      updateEditButtonState();
      
    } catch (error) {
      console.error('❌ ローディング画面の読み込みエラー:', error);
    }
  }

  // 編集ボタンの状態を更新する関数
  function updateEditButtonState() {
    const selectElement = document.getElementById('loading-screen-select');
    const editButton = document.getElementById('edit-loading-screen');
    
    if (selectElement && editButton) {
      const selectedValue = selectElement.value;
      editButton.disabled = selectedValue === 'none';
    }
  }



  // 現在のプロジェクトIDを取得する関数
  function getCurrentProjectId() {
    // URLからプロジェクトIDを取得
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('project') || localStorage.getItem('currentProjectId');
  }

  // ローディング設定の表示を更新する関数
  function updateLoadingSettingsDisplay() {
    dlog('🔄 ローディング設定の表示を更新中...');
    
    const currentTemplate = document.getElementById('current-template');
    const currentMessage = document.getElementById('current-message');
    const currentLogo = document.getElementById('current-logo');
    const loadingEnabled = document.getElementById('loading-enabled');
    
    // 現在のプロジェクトIDを取得
    const projectId = getCurrentProjectId();
    
    if (projectId) {
      // プロジェクト固有のローディング設定を取得
      fetch(`/api/projects/${projectId}/loading-settings`)
        .then(response => {
          if (response.ok) {
            return response.json();
          } else {
            // プロジェクト固有の設定がない場合はデフォルト設定を使用
            return getDefaultLoadingSettings();
          }
        })
        .then(settings => {
          // 設定を表示に反映
          if (currentTemplate) {
            currentTemplate.textContent = getTemplateDisplayName(settings.template || 'default');
          }
          if (currentMessage) {
            currentMessage.textContent = settings.message || 'モデルを読み込んでいます...';
          }
          if (currentLogo) {
            currentLogo.textContent = settings.logoImage ? 'あり' : 'なし';
          }
          if (loadingEnabled) {
            loadingEnabled.checked = settings.enabled !== false;
          }
          
          dlog('✅ ローディング設定の表示を更新しました');
        })
        .catch(error => {
          console.error('❌ ローディング設定の取得に失敗しました:', error);
          // エラーの場合はデフォルト設定を表示
          updateLoadingSettingsDisplayWithDefaults();
        });
    } else {
      // プロジェクトIDがない場合はデフォルト設定を表示
      updateLoadingSettingsDisplayWithDefaults();
    }
  }

  // デフォルト設定で表示を更新する関数
  function updateLoadingSettingsDisplayWithDefaults() {
    const currentTemplate = document.getElementById('current-template');
    const currentMessage = document.getElementById('current-message');
    const currentLogo = document.getElementById('current-logo');
    const loadingEnabled = document.getElementById('loading-enabled');
    
    if (currentTemplate) currentTemplate.textContent = 'デフォルト';
    if (currentMessage) currentMessage.textContent = 'モデルを読み込んでいます...';
    if (currentLogo) currentLogo.textContent = 'なし';
    if (loadingEnabled) loadingEnabled.checked = true;
  }

  // テンプレート名を表示用に変換する関数
  function getTemplateDisplayName(template) {
    const templateNames = {
      'default': 'デフォルト',
      'minimal': 'ミニマル',
      'modern': 'モダン'
    };
    return templateNames[template] || 'デフォルト';
  }

  // デフォルトのローディング設定を取得する関数
  function getDefaultLoadingSettings() {
    return {
      enabled: true,
      template: 'default',
      message: 'モデルを読み込んでいます...',
      backgroundColor: '#1a1a1a',
      textColor: '#ffffff',
      progressColor: '#4CAF50',
      showProgress: true,
      logoImage: null
    };
  }

  // ローディング設定関連のDOM要素を削除する関数
  function cleanupLoadingSettingsElements() {
    dlog('🧹 ローディング設定関連のDOM要素を削除中...');
    
    // ローディング設定関連の要素を削除
    const loadingElements = [
      'loading-enabled',
      'loading-template',
      'loading-message',
      'loading-bg-color',
      'loading-bg-color-text',
      'loading-text-color',
      'loading-text-color-text',
      'loading-progress-color',
      'loading-progress-color-text',
      'loading-logo-input',
      'loading-logo-button',
      'loading-logo-preview',
      'loading-logo-img',
      'loading-logo-remove',
      'loading-show-progress',
      'loading-preview-button'
    ];

    loadingElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        // イベントリスナーを削除
        const newElement = element.cloneNode(true);
        element.parentNode.replaceChild(newElement, element);
        dlog(`✅ ${id} のイベントリスナーを削除しました`);
      }
    });

    // ローディング設定タブの削除
    const loadingSettingsTab = document.querySelector('[data-tab="loading-settings"]');
    if (loadingSettingsTab) {
      loadingSettingsTab.remove();
      dlog('✅ ローディング設定タブを削除しました');
    }

    // ローディング設定パネルの削除
    const loadingSettingsPanel = document.querySelector('#loading-settings-panel');
    if (loadingSettingsPanel) {
      loadingSettingsPanel.remove();
      dlog('✅ ローディング設定パネルを削除しました');
    }

    // タブナビゲーションが空になった場合の処理
    const panelTabs = document.querySelector('.panel-tabs');
    if (panelTabs && panelTabs.children.length === 0) {
      panelTabs.remove();
      dlog('✅ 空になったタブナビゲーションを削除しました');
    }

    dlog('✅ ローディング設定関連のDOM要素の削除が完了しました');
  }

  // ローディング設定のイベントリスナーを削除する関数
  function removeLoadingSettingsEventListeners() {
    // この機能は現在使用されていないか、関連コードが削除されたため、
    // 処理をスキップしてエラーの発生を防ぎます。
    dlog('🔧 スキップ: ローディング設定のイベントリスナー削除');
  }

  // 合計ファイルサイズ表示更新
  function updateTotalFileSizeDisplay() {
    const totalFileSizeMB = (totalFileSize / (1024 * 1024)).toFixed(2);
    if (totalFileSizeElement) {
      totalFileSizeElement.textContent = `現在使用中：${totalFileSizeMB}MB / 50MB`;
    }
  }

  // アップロードエリアをリセットする関数
  function resetUploadArea() {
    if (uploadArea) {
      uploadArea.innerHTML = `
        <div class="upload-placeholder">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <p>3Dモデル(.glb)をアップロード</p>
          <button id="upload-model" class="btn-secondary">
            ファイルを選択
          </button>
        </div>
      `;
      // リセット後、再度ファイル選択ボタンにリスナーを設定する必要がある
      const newUploadButton = document.getElementById('upload-model');
      if (newUploadButton && modelFileInput) {
        newUploadButton.addEventListener('click', handleUploadButtonClick);
      }
    }
  }

  // ファイルアイテムのインデックスを更新する関数
  function updateFileItemIndices() {
    const fileItems = fileListContainer.querySelectorAll('.file-item');
    fileItems.forEach((item, index) => {
      item.dataset.modelIndex = index;
      dlog(`ファイルアイテム "${item.querySelector('.file-name').textContent}" のインデックスを ${index} に更新`);
    });
  }

  // 復元されたモデル用のファイルリストアイテムを作成
  function createRestoredFileListItem(modelSetting, modelIndex) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.modelIndex = modelIndex;

    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';
    fileInfo.innerHTML = `
      <span class="file-name">${modelSetting.fileName}</span>
      <span class="file-size">${modelSetting.fileSize}MB (復元済み)</span>
    `;

    const fileActions = document.createElement('div');
    fileActions.className = 'file-actions';
    fileActions.innerHTML = `
      <button class="btn-icon delete-model" title="モデルを削除">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;

    fileItem.appendChild(fileInfo);
    fileItem.appendChild(fileActions);

    // 削除ボタンのイベントリスナー
    const deleteButton = fileActions.querySelector('.delete-model');
    deleteButton.addEventListener('click', () => {
      try {
        if (!confirm('このモデルを削除してもよろしいですか？')) {
          return;
        }

        const currentModelIndex = parseInt(fileItem.dataset.modelIndex);
        
        if (viewerInstance?.controls?.removeModel) {
          const removeResult = viewerInstance.controls.removeModel(currentModelIndex);
          
          if (removeResult) {
            fileItem.remove();
            
            if (fileListContainer.children.length === 0) {
              fileListContainer.innerHTML = '<p class="empty-text">まだファイルがありません</p>';
            }

            updateFileItemIndices();
            markAsChanged();
            showNotification('モデルを削除しました', 'success');
          } else {
            throw new Error(`モデルインデックス ${currentModelIndex} の削除に失敗しました`);
          }
        } else {
          throw new Error('removeModel関数が利用できません');
        }
      } catch (error) {
        console.error('モデルの削除に失敗しました:', error);
        alert(`モデルの削除に失敗しました: ${error.message}`);
      }
    });

    return fileItem;
  }

  // モデル情報のみのアイテムを作成（再アップロード促進用）
  function createModelInfoItem(modelSetting, _index) {
    const infoItem = document.createElement('div');
    infoItem.className = 'file-item saved-model-info';
    infoItem.style.cssText = `
      background: #f5f5f5;
      border: 2px dashed #ccc;
      opacity: 0.7;
      position: relative;
    `;
    
    infoItem.innerHTML = `
      <div class="file-info">
        <div class="file-name" title="${modelSetting.fileName}">${modelSetting.fileName}</div>
        <div class="file-size">${modelSetting.fileSize}MB (要再アップロード)</div>
        <div class="file-status" style="color: #666; font-size: 12px;">
          📁 モデルファイルが必要です
        </div>
      </div>
      <div class="file-actions">
        <button class="btn-reupload" style="background: #2196F3; color: white; border: none; padding: 5px 10px; border-radius: 3px; font-size: 12px;">
          再アップロード
        </button>
      </div>
    `;

    // 再アップロードボタンのイベントリスナー
    const reuploadButton = infoItem.querySelector('.btn-reupload');
    reuploadButton.addEventListener('click', () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.glb,.gltf';
      fileInput.style.display = 'none';
      
      fileInput.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
          infoItem.remove();
          
          const modelIndex = await viewerInstance.controls.loadNewModel(file, file.name, file.size);
          const objectUrl = URL.createObjectURL(file);
          const fileItem = createFileListItem(file, objectUrl, modelIndex);
          
          fileListContainer.appendChild(fileItem);
          
          // 保存された設定を適用
          setTimeout(() => {
            if (viewerInstance?.controls?.setPosition && modelSetting.transform?.position) {
              viewerInstance.controls.setPosition(
                modelSetting.transform.position.x,
                modelSetting.transform.position.y,
                modelSetting.transform.position.z
              );
            }
            if (viewerInstance?.controls?.setRotationY && modelSetting.transform?.rotation) {
              viewerInstance.controls.setRotationY(modelSetting.transform.rotation.y);
            }
            if (viewerInstance?.controls?.setScale && modelSetting.transform?.scale) {
              viewerInstance.controls.setScale(modelSetting.transform.scale.x);
            }
            
            dlog('✅ 保存された設定を適用しました:', modelSetting.transform);
            markAsChanged();
            updateAnimationInfo();
          }, 500);
          
          totalFileSize += file.size;
          updateTotalFileSizeDisplay();
          
          showNotification(`モデル "${file.name}" を復元しました`, 'success');
          
        } catch (error) {
          console.error('モデルの再アップロードに失敗:', error);
          alert('モデルの再アップロードに失敗しました: ' + error.message);
        }
      };
      
      fileInput.click();
    });

    return infoItem;
  }

  // ファイル一覧アイテムを作成し、イベントリスナーを設定する関数
  function createFileListItem(file, objectUrl, modelIndex) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.modelIndex = modelIndex;

    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';
    fileInfo.innerHTML = `
      <span class="file-name">${file.name}</span>
      <span class="file-size">${formatFileSize(file.size)}</span>
    `;

    const fileActions = document.createElement('div');
    fileActions.className = 'file-actions';
    fileActions.innerHTML = `
      <button class="btn-icon delete-model" title="モデルを削除">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;

    fileItem.appendChild(fileInfo);
    fileItem.appendChild(fileActions);

    // 削除ボタンのイベントリスナー
    const deleteButton = fileActions.querySelector('.delete-model');
    deleteButton.addEventListener('click', () => {
      try {
        // ユーザーに確認を求める
        if (!confirm('このモデルを削除してもよろしいですか？')) {
          return;
        }

        // 現在のモデルインデックスを取得（DOM要素から）
        const currentModelIndex = parseInt(fileItem.dataset.modelIndex);

        // モデルの削除
        if (!viewerInstance?.controls?.removeModel) {
          throw new Error('removeModel関数が利用できません');
        }
        
        const removeResult = viewerInstance.controls.removeModel(currentModelIndex);
        
        if (!removeResult) {
          throw new Error(`モデルインデックス ${currentModelIndex} の削除に失敗しました`);
        }
        
        // ファイルサイズの更新
        totalFileSize -= file.size;
        updateTotalFileSizeDisplay();
        
        // ファイルリストから削除
        fileItem.remove();
        
        // オブジェクトURLの解放
        if (objectUrl && objectUrl.startsWith('blob:')) {
          URL.revokeObjectURL(objectUrl);
        }
        
        // ファイルリストが空になった場合の処理
        if (fileListContainer.children.length === 0) {
          fileListContainer.innerHTML = '<p class="empty-text">まだファイルがありません</p>';
          resetUploadArea();
        }

        // 残りのファイルアイテムのインデックスを更新
        updateFileItemIndices();
        
        // モデル削除を変更として記録
        markAsChanged();
      } catch (error) {
        console.error('モデルの削除に失敗しました:', error);
        alert(`モデルの削除に失敗しました: ${error.message}`);
      }
    });

    return fileItem;
  }

  // 実寸サイズ表示更新
  function updateRealSizeDisplay(scale) {
    if (scaleSizeLabel && originalModelSize.width > 0) {
      const width = (originalModelSize.width * scale * 100).toFixed(1);
      const height = (originalModelSize.height * scale * 100).toFixed(1);
      const depth = (originalModelSize.depth * scale * 100).toFixed(1);
      scaleSizeLabel.textContent = `（約${width}cm × ${height}cm × ${depth}cm）`;
    } else if (scaleSizeLabel) {
      scaleSizeLabel.textContent = ''; // サイズ不明時はクリア
    }
  }

  // 位置スライダー更新時の処理
  function updatePosition() {
    // スライダー要素やviewerInstanceの存在チェック
    if (!positionXSlider || !positionYSlider || !positionZSlider || !viewerInstance?.controls?.setPosition) {
         console.warn("位置調整に必要な要素または関数が見つかりません。");
         return;
    }

    const x = parseFloat(positionXSlider.value);
    const y = parseFloat(positionYSlider.value);
    const z = parseFloat(positionZSlider.value);

    viewerInstance.controls.setPosition(x, y, z);

    if (positionXValue) positionXValue.textContent = x.toFixed(1);
    if (positionYValue) positionYValue.textContent = y.toFixed(1);
    if (positionZValue) positionZValue.textContent = z.toFixed(1);
    
    // 位置変更を記録（TransformControlsとの重複を防ぐため、スライダー操作のみ記録）
    markAsChanged();
  }

  // TransformControls モード設定ボタンのセットアップ
  function setupTransformControls() {
    if (!translateButton || !rotateButton || !scaleButton || !viewerInstance?.controls?.setTransformMode) {
      console.error('TransformControls の設定に必要な要素または関数が見つかりません。');
      return;
    }

    const transformButtons = [translateButton, rotateButton, scaleButton];
    const setActiveButton = (activeButton) => {
      transformButtons.forEach(btn => btn.classList.remove('active'));
      if (activeButton) activeButton.classList.add('active');
    };

    // イベントハンドラー関数を保持する変数を定義
    const handleTranslateClick = () => {
      if (viewerInstance?.controls?.setTransformMode('translate')) {
        setActiveButton(translateButton);
        dlog('Transform mode set to: translate');
      }
    };

    const handleRotateClick = () => {
      if (viewerInstance?.controls?.setTransformMode('rotate')) {
        setActiveButton(rotateButton);
        dlog('Transform mode set to: rotate - ギズモで3軸回転が可能になりました');
      } else {
        console.warn('回転モードの設定に失敗しました。モデルが選択されているか確認してください。');
      }
    };

    const handleScaleClick = () => {
      if (viewerInstance?.controls?.setTransformMode('scale')) {
        setActiveButton(scaleButton);
        dlog('Transform mode set to: scale');
      }
    };

    // イベントリスナーを設定
    translateButton.addEventListener('click', handleTranslateClick);
    rotateButton.addEventListener('click', handleRotateClick);
    scaleButton.addEventListener('click', handleScaleClick);

    // クリーンアップ用に関数を保存
    translateButton._cleanup = handleTranslateClick;
    rotateButton._cleanup = handleRotateClick;
    scaleButton._cleanup = handleScaleClick;

    // 初期状態
    viewerInstance.controls.setTransformMode('translate');
    setActiveButton(translateButton);
  }

  // モデルファイル変更ハンドラ
  const handleModelFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // ファイルサイズチェック (50MB制限)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      alert(`❌ ファイルサイズが大きすぎます\n\nファイル名: ${file.name}\n現在のサイズ: ${fileSizeMB}MB\n最大許可サイズ: 50MB\n\n50MB以下のファイルを選択してください。`);
      resetUploadArea();
      return;
    }

    // ファイル形式チェック
    if (!file.name.toLowerCase().endsWith('.glb')) {
      const fileExtension = file.name.split('.').pop() || '不明';
      alert(`❌ サポートされていないファイル形式です\n\nファイル名: ${file.name}\n検出された形式: .${fileExtension}\n対応形式: .glb のみ\n\nGLB形式のファイルを選択してください。`);
      resetUploadArea();
      return;
    }

    try {
      // ローディング表示
      uploadArea.classList.add('loading');
      
      // ファイルをARビューワーに読み込む（元ファイルも渡す）
      dlog('🔄 新しいモデルファイル読み込み [IndexedDB対応]:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      
      const modelIndex = await viewerInstance.controls.loadNewModel(
        URL.createObjectURL(file), 
        file.name, 
        file.size,
        file // 元ファイルを渡して IndexedDB 保存用に使用
      );
      
      if (modelIndex !== undefined) {
        // ファイルリストに追加
        const objectUrl = URL.createObjectURL(file);
        const fileItem = createFileListItem(file, objectUrl, modelIndex);
        fileListContainer.appendChild(fileItem);
        
        // 合計ファイルサイズ表示を更新
        totalFileSize += file.size;
        updateTotalFileSizeDisplay();
        
        // ファイルアップロードを変更として記録
        markAsChanged();
        
        // アップロードエリアをリセット
        resetUploadArea();
        
        // 新しいファイルをアクティブに
        fileListContainer.querySelectorAll('.file-item.active').forEach(activeItem => {
          activeItem.classList.remove('active');
        });
        fileItem.classList.add('active');
      }
    } catch (error) {
      console.error('モデル読み込みエラー:', error);
      alert('モデルの読み込み中にエラーが発生しました。');
      resetUploadArea();
    } finally {
      // ローディング表示を解除
      uploadArea.classList.remove('loading');
      // 入力をリセット
      event.target.value = '';
    }
  };

  const handleDragEvent = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = () => uploadArea.classList.add('highlight');
  const handleDragLeave = () => uploadArea.classList.remove('highlight');

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const dropArea = event.currentTarget;
    dropArea.classList.remove('dragover');
    
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.name.endsWith('.glb')) {
        // ファイルサイズチェック
        if (totalFileSize + file.size > MAX_TOTAL_SIZE) {
          const currentSizeMB = (totalFileSize / (1024 * 1024)).toFixed(2);
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
          const totalSizeMB = ((totalFileSize + file.size) / (1024 * 1024)).toFixed(2);
          alert(`❌ 合計ファイルサイズが制限を超えています\n\nファイル名: ${file.name}\n現在の使用量: ${currentSizeMB}MB\n追加ファイル: ${fileSizeMB}MB\n合計予定サイズ: ${totalSizeMB}MB\n最大許可サイズ: 50MB\n\n既存ファイルを削除してから追加してください。`);
          return;
        }

        const objectUrl = URL.createObjectURL(file);
        let modelIndex = null;

        try {
          // ドロップ時のローディングインジケータを表示
          const loadingIndicator = document.createElement('div');
          loadingIndicator.className = 'loading-indicator';
          loadingIndicator.textContent = 'モデルを読み込んでいます...';
          fileListContainer.appendChild(loadingIndicator);

          modelIndex = await viewerInstance.controls.loadNewModel(objectUrl, file.name, file.size);
          dlog(`モデル "${file.name}" をインデックス ${modelIndex} でロードしました`);

          const emptyText = fileListContainer.querySelector('.empty-text');
          if (emptyText) {
            emptyText.remove();
          }

          const fileItem = createFileListItem(file, objectUrl, modelIndex);
          fileListContainer.appendChild(fileItem);

          totalFileSize += file.size;
          updateTotalFileSizeDisplay();

          // ファイルアップロードを変更として記録
          markAsChanged();

          resetUploadArea();

          fileListContainer.querySelectorAll('.file-item.active').forEach(activeItem => {
            activeItem.classList.remove('active');
          });
          fileItem.classList.add('active');

          // アニメーション情報を更新
          setTimeout(() => {
            updateAnimationInfo();
          }, 100);

        } catch (error) {
          console.error("モデルのロードまたはファイルリストへの追加中にエラー:", error);
          
          // エラーの種類に応じて異なるメッセージを表示
          let errorMessage = 'モデルの読み込みに失敗しました。';
          if (error.message.includes('format')) {
            errorMessage = 'ファイル形式が正しくないか、破損している可能性があります。';
          } else if (error.message.includes('memory')) {
            errorMessage = 'メモリ不足のため、モデルを読み込めませんでした。';
          }
          
          alert(`モデル「${file.name}」の読み込みに失敗しました。\n${errorMessage}\n詳細: ${error.message}`);
          
          // エラーが発生した場合のクリーンアップ
          if (modelIndex !== null && viewerInstance?.controls?.removeModel) {
            try {
              viewerInstance.controls.removeModel(modelIndex);
            } catch (cleanupError) {
              console.error("モデル削除中のエラー:", cleanupError);
            }
          }
          URL.revokeObjectURL(objectUrl);
        } finally {
          // ローディングインジケータを削除
          const loadingIndicator = fileListContainer.querySelector('.loading-indicator');
          if (loadingIndicator) {
            loadingIndicator.remove();
          }
        }
      } else {
        const fileExtension = file.name.split('.').pop() || '不明';
        alert(`❌ サポートされていないファイル形式です\n\nファイル名: ${file.name}\n検出された形式: .${fileExtension}\n対応形式: .glb のみ\n\nGLB形式のファイルをドロップしてください。`);
      }
    }
  };

  const handleScaleChange = () => {
    if (!viewerInstance?.controls?.setScale) return;
    const value = parseFloat(scaleSlider.value);
    if (scaleValue) scaleValue.textContent = value.toFixed(1);
    viewerInstance.controls.setScale(value);
    updateRealSizeDisplay(value);
  };

  const handleResetAll = () => {
    if (!viewerInstance?.controls) {
      alert('リセットするには、まずモデルを選択してください。');
      return;
    }
    
    // アクティブなモデルが存在するかチェック
    const activeModelIndex = viewerInstance.controls.getActiveModelIndex();
    if (activeModelIndex < 0) {
      alert('リセットするには、まずモデルを選択してください。');
      return;
    }
    
    // 確認ダイアログ
    if (!confirm('モデルを初期状態（アップロード時）にリセットしますか？')) {
      return;
    }
    
    // 初期状態にリセット（位置・回転・スケール・カメラを含む）
    if (viewerInstance.controls.resetToInitialState) {
      const success = viewerInstance.controls.resetToInitialState();
      if (success) {
        // 成功通知
        showNotification('モデルを初期状態にリセットしました', 'success');
        // UIの更新は transformChanged イベントで自動的に行われる
      } else {
        showNotification('リセットに失敗しました', 'error');
      }
    } else {
      // フォールバック：従来の方法
      console.warn('resetToInitialState not available, using fallback');
      
      // 固定値でリセット
      if (viewerInstance.controls.setPosition) {
        viewerInstance.controls.setPosition(0, 0, 0);
      }
      if (viewerInstance.controls.setRotationY) {
        viewerInstance.controls.setRotationY(0);
      }
      if (viewerInstance.controls.setScale) {
        viewerInstance.controls.setScale(1);
      }
      if (viewerInstance.controls.resetCamera) {
        viewerInstance.controls.resetCamera();
      }
      
      resetAllUI();
      showNotification('設定をリセットしました', 'success');
    }
  };
  
  // 全UIをリセットする関数
  function resetAllUI() {
    // 位置スライダーをリセット
    if (positionXSlider && positionXValue) {
      positionXSlider.value = 0;
      positionXValue.textContent = '0.0';
    }
    if (positionYSlider && positionYValue) {
      positionYSlider.value = 0;
      positionYValue.textContent = '0.0';
    }
    if (positionZSlider && positionZValue) {
      positionZSlider.value = 0;
      positionZValue.textContent = '0.0';
    }
    
    // 回転スライダーをリセット
    if (rotationSlider && rotationValue) {
      rotationSlider.value = 0;
      rotationValue.textContent = '0°';
    }
    
    // スケールスライダーをリセット
    if (scaleSlider && scaleValue) {
      scaleSlider.value = 1;
      scaleValue.textContent = '1.0';
      updateRealSizeDisplay(1);
    }

    // ローディング設定のクリーンアップ
    dlog('🧹 UIリセット時にローディング設定をクリーンアップ中...');
    
    // ローディング設定のイベントリスナーを削除
    removeLoadingSettingsEventListeners();
    
    // ローディング設定関連のDOM要素を削除
    cleanupLoadingSettingsElements();
    
    // ローディング設定の変数をリセット
    loadingEnabled = null;
    loadingTemplate = null;
    loadingMessage = null;
    loadingBgColor = null;
    loadingBgColorText = null;
    loadingTextColor = null;
    loadingTextColorText = null;
    loadingProgressColor = null;
    loadingProgressColorText = null;
    loadingLogoInput = null;
    loadingLogoButton = null;
    loadingLogoPreview = null;
    loadingLogoImg = null;
    loadingLogoRemove = null;
    loadingShowProgress = null;
    loadingPreviewButton = null;
    
    dlog('✅ UIリセット時のローディング設定クリーンアップが完了しました');
  }

  // 通知表示関数
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-size: 14px;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      ${type === 'success' ? 'background: #4CAF50;' : ''}
      ${type === 'error' ? 'background: #f44336;' : ''}
      ${type === 'info' ? 'background: #2196F3;' : ''}
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    // 3秒後に削除
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }
    }, 3000);
  }

  const handleRotationChange = () => {
    if (!viewerInstance?.controls?.setRotationY) return;
    const value = parseInt(rotationSlider.value, 10);
    if (rotationValue) rotationValue.textContent = `${value}°`;
    
    // スライダー操作時はギズモの同期を一時的に無効化しないで更新
    viewerInstance.controls.setRotationY(value);
  };

  const handleArScaleChange = () => {
    const value = parseFloat(arScaleSlider.value).toFixed(1);
    if (arScaleValue) arScaleValue.textContent = value;
    localStorage.setItem('arScale', value);
  };

  const handleResetFrontView = () => {
    if (viewerInstance?.controls?.resetToFrontView) {
      viewerInstance.controls.resetToFrontView();
    }
  };

  // TransformControlsでの変更をUIに反映する関数
  const handleTransformChanged = (event) => {
    const detail = event.detail;
    if (!detail) return;

    // 位置スライダーの更新
    if (detail.position) {
      if (positionXSlider && positionXValue) {
        positionXSlider.value = detail.position.x.toFixed(1);
        positionXValue.textContent = detail.position.x.toFixed(1);
      }
      if (positionYSlider && positionYValue) {
        positionYSlider.value = detail.position.y.toFixed(1);
        positionYValue.textContent = detail.position.y.toFixed(1);
      }
      if (positionZSlider && positionZValue) {
        positionZSlider.value = detail.position.z.toFixed(1);
        positionZValue.textContent = detail.position.z.toFixed(1);
      }
    }

    // 回転スライダーの更新（Y軸のみ表示しているため）
    if (detail.rotation && rotationSlider && rotationValue) {
      // 角度を0-360度の範囲に正規化
      let yRotation = Math.round(detail.rotation.y);
      while (yRotation < 0) yRotation += 360;
      while (yRotation >= 360) yRotation -= 360;
      
      rotationSlider.value = yRotation;
      rotationValue.textContent = `${yRotation}°`;
    }

    // スケールの更新
    if (detail.scale) {
      // メインスケールスライダー（統一スケール）
      if (scaleSlider && scaleValue) {
        const avgScale = (detail.scale.x + detail.scale.y + detail.scale.z) / 3;
        scaleSlider.value = avgScale.toFixed(1);
        scaleValue.textContent = avgScale.toFixed(1);
        updateRealSizeDisplay(avgScale);
      }
    }
  };

  const handleMarkerUploaded = (event) => {
    if (event.detail && event.detail.markerImageUrl) {
      const newMarkerUrl = event.detail.markerImageUrl;
      if (markerThumbnail) {
        markerThumbnail.src = newMarkerUrl;
      }
      if (viewerInstance?.controls?.setMarkerTexture) {
        viewerInstance.controls.setMarkerTexture(newMarkerUrl);
      }
      markAsChanged(); // マーカー変更を記録
    }
  };

  // アニメーション制御ハンドラー
  const handlePlayAnimation = () => {
    if (!viewerInstance?.controls?.playAnimation) {
      console.warn('❌ アニメーション再生機能が利用できません');
      return;
    }
    
    const success = viewerInstance.controls.playAnimation(0);
    if (success) {
      showNotification('アニメーションを再生中', 'info');
    } else {
      showNotification('アニメーションが見つかりません', 'error');
    }
  };

  const handleStopAnimation = () => {
    if (!viewerInstance?.controls?.stopAnimation) {
      console.warn('アニメーション停止機能が利用できません');
      return;
    }
    
    const success = viewerInstance.controls.stopAnimation();
    if (success) {
      showNotification('アニメーションを停止しました', 'info');
    }
  };

    // アニメーション情報を更新する関数
  const updateAnimationInfo = () => {
    if (!viewerInstance?.controls?.hasAnimations || !viewerInstance?.controls?.getAnimationList) {
      return;
    }
    
    const hasAnims = viewerInstance.controls.hasAnimations();
    
    if (animationControls) {
      animationControls.style.display = hasAnims ? 'block' : 'none';
    }
    
    if (hasAnims && animationList) {
      const animations = viewerInstance.controls.getAnimationList();
      animationList.innerHTML = animations.map(anim => 
        `${anim.name} (${anim.duration.toFixed(1)}s)`
      ).join('<br>');
       
      // アニメーション発見の通知
      showNotification(`アニメーション ${animations.length} 個を発見しました`, 'success');
    } else {
      // アニメーションがない場合の通知
      showNotification('このモデルにはアニメーションが含まれていません', 'info');
    }
  };

  // ローディング画面のロゴアップロード処理
  const handleLoadingLogoUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // ファイルサイズチェック (2MB制限)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      alert('ロゴ画像のサイズは2MB以下にしてください。');
      return;
    }

    // 画像ファイルかチェック
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください。');
      return;
    }

    // Base64に変換
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target.result;
      
      // プレビュー表示
      if (loadingLogoImg && loadingLogoPreview) {
        loadingLogoImg.src = base64Data;
        loadingLogoPreview.style.display = 'block';
      }
      
      markAsChanged();
      dlog('ローディングロゴをアップロードしました:', file.name);
    };
    
    reader.onerror = () => {
      alert('画像の読み込みに失敗しました。');
    };
    
    reader.readAsDataURL(file);
  };

  // ローディング画面のプレビュー機能
  const showLoadingPreview = async () => {
    if (!viewerInstance?.controls) {
      alert('ARビューアが初期化されていません。');
      return;
    }

    // 現在の設定を取得
    const settings = await getCurrentLoadingSettings();
    
    // プレビュー用のローディング画面を表示
    const previewId = viewerInstance.controls.showLoadingScreen();
    
    // 設定を適用（スタイルを動的に変更）
    setTimeout(() => {
      const loadingElement = document.getElementById(previewId);
      if (loadingElement) {
        loadingElement.style.backgroundColor = settings.backgroundColor;
        loadingElement.style.color = settings.textColor;
        
        const messageElement = loadingElement.querySelector('.loading-message');
        if (messageElement) {
          messageElement.textContent = settings.message;
        }
        
        const progressBar = loadingElement.querySelector('.progress-bar');
        if (progressBar) {
          progressBar.style.backgroundColor = settings.progressColor;
          progressBar.style.display = settings.showProgress ? 'block' : 'none';
        }
        
        // 3秒後に自動で閉じる
        setTimeout(() => {
          viewerInstance.controls.hideLoadingScreen(previewId);
        }, 3000);
      }
    }, 100);
    
    dlog('ローディング画面をプレビュー表示しました');
  };

  // 現在のローディング設定を取得（ローディング画面エディターの詳細設定含む）
  const getCurrentLoadingSettings = async () => {
    // ローディング画面選択ドロップダウンの値を取得
    const loadingScreenSelect = document.getElementById('loading-screen-select');
    
    // ローディング画面選択の優先順位: DOM要素 > savedSelectedScreenId > 'none'
    let selectedScreenId = 'none'; // デフォルト値
    
    if (loadingScreenSelect && loadingScreenSelect.value !== undefined && loadingScreenSelect.value !== '') {
      // DOM要素がある場合はその値を最優先
      selectedScreenId = loadingScreenSelect.value;
    } else if (savedSelectedScreenId && savedSelectedScreenId !== 'none') {
      // DOM要素が無効でも既存設定があれば使用
      selectedScreenId = savedSelectedScreenId;
    }
    
    // グローバル変数を同期更新
    if (savedSelectedScreenId !== selectedScreenId) {
      dlog('🔄 selectedScreenId同期更新:', savedSelectedScreenId, '->', selectedScreenId);
      savedSelectedScreenId = selectedScreenId;
    }
    
    // ローディング画面エディターで作成された詳細設定を取得
    let detailedLoadingSettings = null;
    try {
      // 分離された状態管理を使用
      const { getEditorLoadingScreenState } = await import('../utils/loading-screen-state.js');
      const editorState = getEditorLoadingScreenState();
      detailedLoadingSettings = editorState.getSettings();
      dlog('📋 ローディング画面エディターの詳細設定を取得:', detailedLoadingSettings);
    } catch (error) {
      console.warn('⚠️ ローディング画面エディターの設定取得に失敗:', error);
      // フォールバック: 従来のsettingsAPI
      try {
        detailedLoadingSettings = settingsAPI.getSettings();
      } catch (_) {}
    }
    
    // 基本設定とエディター詳細設定を統合
    const baseSettings = {
      enabled: loadingEnabled?.checked ?? true,
      selectedScreenId: selectedScreenId,
      template: loadingTemplate?.value ?? 'default',
      backgroundColor: loadingBgColor?.value ?? '#1a1a1a',
      textColor: loadingTextColor?.value ?? '#ffffff',
      progressColor: loadingProgressColor?.value ?? '#4CAF50',
      logoImage: loadingLogoImg?.src && loadingLogoImg.src.startsWith('data:') ? loadingLogoImg.src : null,
      message: loadingMessage?.value ?? 'ARコンテンツを準備中...',
      showProgress: loadingShowProgress?.checked ?? true
    };
    
    // 詳細設定がある場合は統合
    if (detailedLoadingSettings) {
      return {
        ...baseSettings,
        // ローディング画面エディターの全設定を含める
        editorSettings: detailedLoadingSettings,
        // 後方互換のため基本設定は維持しつつ、エディター設定で上書き
        backgroundColor: detailedLoadingSettings.loadingScreen?.backgroundColor || baseSettings.backgroundColor,
        textColor: detailedLoadingSettings.loadingScreen?.textColor || baseSettings.textColor,
        progressColor: detailedLoadingSettings.loadingScreen?.progressColor || 
                       detailedLoadingSettings.loadingScreen?.accentColor || 
                       baseSettings.progressColor,
        message: detailedLoadingSettings.loadingScreen?.loadingMessage || baseSettings.message,
        showProgress: detailedLoadingSettings.loadingScreen?.showProgress ?? baseSettings.showProgress
      };
    }
    
    dlog('🔄 現在のローディング設定を取得:', {
      selectedScreenId,
      hasDetailedSettings: !!detailedLoadingSettings,
      selectElementExists: !!loadingScreenSelect,
      selectValue: loadingScreenSelect?.value,
      savedSelectedScreenId,
      finalSelectedScreenId: selectedScreenId,
      enabled: baseSettings.enabled,
      template: baseSettings.template,
      syncDirection: 'DOM -> savedSelectedScreenId'
    });
    
    return baseSettings;
  };

  const handleQRCodeButtonClick = async () => {
    // URLパラメータから現在のプロジェクトIDを取得
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const currentProjectId = urlParams.get('id');
    
    dlog('🔄 QRコード発行:', { currentProjectId });
    
    if (!currentProjectId) {
      alert('プロジェクトを先に保存してください。\n保存後にQRコードを生成できます。');
      return;
    }
    
    // プロジェクトにモデルが含まれているかチェック
    try {
      const project = await getProject(currentProjectId);
      const hasModels = project?.modelSettings && project.modelSettings.length > 0;
      
      if (!hasModels) {
        const proceed = confirm('⚠️ このプロジェクトには3Dモデルが設定されていません。\n\nARコンテンツが表示されないQRコードが生成されますが、続行しますか？\n\n（推奨：先にモデルをアップロードしてから保存してください）');
        if (!proceed) {
          return;
        }
      }
      
      dlog('📊 プロジェクト情報:', {
        id: currentProjectId,
        name: project?.name,
        modelCount: project?.modelSettings?.length || 0,
        hasModels
      });
      
    } catch (error) {
      console.warn('⚠️ プロジェクト情報の取得に失敗:', error);
    }
    
    // QRコードモーダルをasyncで呼び出し
    (async () => {
      try {
        await showQRCodeModal({
          modelName: currentProjectId
        });
      } catch (error) {
        console.error('❌ QRコードモーダル表示エラー:', error);
        alert('QRコードの生成に失敗しました。');
      }
    })();
  };

  // IndexedDB対応プロジェクト保存処理
  const handleSaveProject = () => {
    return new Promise(async (resolve, reject) => {
      // ================== [デバッグコード開始] ==================
      try {
        const modelsForSaving = viewerInstance.controls.getAllModels();
        const loadingScreenValue = document.getElementById('loading-screen-select')?.value;
        dlog('【保存直前デバッグ】', {
          models: modelsForSaving,
          modelCount: modelsForSaving.length,
          firstModelDataExists: modelsForSaving.length > 0 ? !!modelsForSaving[0].modelData : 'N/A',
          loadingScreenSelectedId: loadingScreenValue,
          savedSelectedScreenId_before: savedSelectedScreenId
        });
      } catch (e) {
        console.error('デバッグコードでエラー', e);
      }
      // ================== [デバッグコード終了] ==================

      // URLパラメータから現在のプロジェクトIDを取得
      const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      const currentProjectId = urlParams.get('id');
      const isEdit = !!currentProjectId;
      
      // 既存プロジェクトの場合は現在の情報を取得
      let currentProject = null;
      if (isEdit) {
        dlog('🔄 プロジェクト取得開始:', currentProjectId);
        
        // まず全プロジェクト一覧を確認
        const allProjects = JSON.parse(localStorage.getItem('miruwebAR_projects') || '[]');
        dlog('📊 全プロジェクト一覧:', allProjects.map(p => ({ id: p.id, name: p.name })));
        
        try {
          currentProject = await getProject(currentProjectId);
          dlog('🔍 既存プロジェクト情報を取得:', {
            id: currentProject?.id,
            name: currentProject?.name,
            description: currentProject?.description,
            type: typeof currentProject,
            isObject: !!currentProject && typeof currentProject === 'object'
          });
        } catch (error) {
          console.error('❌ プロジェクト取得エラー:', error);
        }
      }

      // 保存確認モーダルを表示
      const modalData = {
        isEdit: isEdit,
        projectId: currentProjectId,
        currentName: currentProject?.name || '',
        currentDescription: currentProject?.description || ''
      };
      
      dlog('📝 保存モーダルに渡すデータ:', modalData);
      
      showSaveProjectModal(modalData, async (projectData) => {
      try {
        dlog('保存処理開始:', projectData);
        dlog('arType:', arType);
        dlog('isMarkerMode:', isMarkerMode);
        dlog('viewerInstance:', viewerInstance);
        
        // マーカー画像データを取得
        const markerImageData = isMarkerMode ? localStorage.getItem('markerImageUrl') : null;
        dlog('🔍 保存前のマーカー画像データ:', {
          exists: !!markerImageData,
          type: typeof markerImageData,
          length: markerImageData?.length || 0,
          preview: markerImageData?.substring(0, 50) || 'なし'
        });
        
        // プロジェクト保存前に最新のUI状態を同期
        const loadingScreenSelect = document.getElementById('loading-screen-select');
        if (loadingScreenSelect && loadingScreenSelect.value !== savedSelectedScreenId) {
          dlog('🔧 保存前にローディング画面選択を同期:', {
            oldValue: savedSelectedScreenId,
            newValue: loadingScreenSelect.value
          });
          savedSelectedScreenId = loadingScreenSelect.value;
        }
        
        // プロジェクトデータを構築
        const saveData = {
          id: projectData.id,
          name: projectData.name,
          description: projectData.description,
          type: arType,
          markerImage: markerImageData,
          // ローディング設定を保存（現在のUI設定を反映）
          loadingScreen: await getCurrentLoadingSettings()
        };

        // ローディング画面の選択テンプレートを反映（完全な設定を保存）
        try {
          const selectedId = saveData.loadingScreen?.selectedScreenId;
          if (selectedId && selectedId !== 'none') {
            const template = getLoadingScreenTemplate(selectedId);
            if (template?.settings?.loadingScreen) {
              const t = template.settings.loadingScreen;
              dlog('🎨 テンプレート設定を完全統合:', template.name, t);
              
              // 完全なテンプレート設定を保存データに統合
              saveData.loadingScreen = {
                ...saveData.loadingScreen,
                // 基本設定
                backgroundColor: t.backgroundColor ?? saveData.loadingScreen.backgroundColor,
                textColor: t.textColor ?? saveData.loadingScreen.textColor,
                progressColor: t.progressColor ?? t.accentColor ?? saveData.loadingScreen.progressColor,
                accentColor: t.accentColor ?? saveData.loadingScreen.accentColor,
                
                // メッセージ設定
                message: t.loadingMessage ?? t.message ?? saveData.loadingScreen.message,
                loadingMessage: t.loadingMessage ?? t.message ?? saveData.loadingScreen.loadingMessage,
                brandName: t.brandName ?? saveData.loadingScreen.brandName,
                subTitle: t.subTitle ?? saveData.loadingScreen.subTitle,
                
                // 表示設定
                showProgress: t.showProgress ?? saveData.loadingScreen.showProgress,
                fontScale: t.fontScale ?? saveData.loadingScreen.fontScale,
                
                // ロゴ設定
                logo: t.logo ?? saveData.loadingScreen.logo,
                logoType: t.logoType ?? saveData.loadingScreen.logoType,
                logoPosition: t.logoPosition ?? saveData.loadingScreen.logoPosition,
                logoSize: t.logoSize ?? saveData.loadingScreen.logoSize,
                
                // テンプレート情報も保持
                selectedScreenId: selectedId,
                templateName: template.name
              };
              
              dlog('✅ 完全統合されたローディング設定:', saveData.loadingScreen);
            }
          }
        } catch (e) {
          console.warn('⚠️ ローディングテンプレート適用に失敗しました（保存は継続）:', e);
        }
        
        dlog('💾 保存するローディング画面設定:', saveData.loadingScreen);
        dlog('🔍 保存データ詳細（保存前の完全なデータ）:', {
          id: saveData.id,
          name: saveData.name,
          description: saveData.description,
          type: saveData.type,
          loadingScreen: saveData.loadingScreen,
          hasMarkerImage: !!saveData.markerImage,
          markerImageSize: saveData.markerImage ? (saveData.markerImage.length / 1024).toFixed(2) + 'KB' : '0KB'
        });
        dlog('🔍 保存データ詳細:', {
          id: saveData.id,
          name: saveData.name,
          type: saveData.type,
          hasMarkerImage: !!saveData.markerImage,
          markerImageSize: saveData.markerImage?.length || 0
        });

        // プロジェクトを保存
        dlog('🚀 プロジェクト保存開始:', {
          dataKeys: Object.keys(saveData),
          nameLength: saveData.name?.length || 0,
          descriptionLength: saveData.description?.length || 0,
          hasMarkerImage: !!saveData.markerImage,
          markerImageSize: saveData.markerImage ? (saveData.markerImage.length / 1024).toFixed(2) + 'KB' : '0KB',
          loadingScreenKeys: saveData.loadingScreen ? Object.keys(saveData.loadingScreen) : []
        });
        
        let savedProject;
        try {
          savedProject = await saveProject(saveData, viewerInstance);
          dlog('✅ プロジェクト保存成功:', {
            id: savedProject.id,
            name: savedProject.name,
            selectedScreenId: savedProject.loadingScreen?.selectedScreenId,
            loadingScreenKeys: Object.keys(savedProject.loadingScreen || {})
          });

          // QRコード用のproject.jsonファイルをサーバーに生成
          try {
            dlog('🔄 QRコード用project.json生成開始:', savedProject.id);
            const serverResponse = await fetch(`/api/projects/${savedProject.id}/save`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                projectData: savedProject
              })
            });

            if (serverResponse.ok) {
              const serverResult = await serverResponse.json();
              dlog('✅ QRコード用project.json生成成功:', serverResult.url);
            } else {
              console.warn('⚠️ QRコード用project.json生成失敗:', serverResponse.statusText);
            }
          } catch (apiError) {
            console.warn('⚠️ QRコード用project.json API呼び出し失敗:', apiError.message);
            // QRコード用ファイル生成失敗は致命的ではないため、保存処理は継続
          }
        } catch (saveError) {
          console.error('❌ プロジェクト保存エラー:', saveError);
          console.error('❌ エラー詳細:', {
            message: saveError.message,
            name: saveError.name,
            stack: saveError.stack?.substring(0, 500)
          });
          throw saveError;
        }
        
        // 保存成功の通知
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #4CAF50;
          color: white;
          padding: 12px 20px;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          z-index: 10000;
          animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = `プロジェクト「${savedProject.name}」を保存しました`;
        document.body.appendChild(notification);

        // URLを更新してプロジェクトIDを含める（新規保存の場合のみ）
        const currentUrlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        if (!currentUrlParams.get('id') && savedProject.id) {
          dlog('📝 URLを更新:', savedProject.id);
          window.location.hash = `#/editor?id=${savedProject.id}`;
        }

        // 3秒後に通知を削除
        setTimeout(() => {
          if (document.body.contains(notification)) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
              if (document.body.contains(notification)) {
                document.body.removeChild(notification);
              }
            }, 300);
          }
        }, 3000);

        // 新規保存の場合はURLを更新（既存編集の場合は現在の画面を維持）
        if (!isEdit) {
          // 新規保存後は編集モードのURLに更新
          window.history.replaceState(null, '', `#/editor?id=${savedProject.id}&type=${arType}`);
        }

        dlog('プロジェクト保存完了:', savedProject);
        markAsSaved(); // 保存完了をマーク
        resolve(savedProject); // Promise解決
      } catch (error) {
        console.error('❌ プロジェクト保存エラー:', error);
        console.error('- エラーの詳細:', error.message);
        console.error('- エラースタック:', error.stack);
        console.error('- エラータイプ:', error.name);
        
        // 具体的なエラーメッセージを生成
        let errorMessage = 'プロジェクトの保存に失敗しました';
        if (error.message.includes('QuotaExceededError') || error.message.includes('容量制限')) {
          errorMessage = '容量制限エラー：古いプロジェクトを自動削除して再保存します';
        } else if (error.message.includes('IndexedDB')) {
          errorMessage = 'データベース保存エラー：ブラウザの設定を確認してください';
        } else if (error.message.includes('localStorage')) {
          errorMessage = 'ローカルストレージエラー：ブラウザの容量制限に達しています';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'ネットワークエラー：サーバーとの通信に失敗しました';
        } else {
          errorMessage = `保存エラー：${error.message.substring(0, 100)}`;
        }
          
        // 容量制限エラーの場合、ユーザーに容量クリア機能を提供
        if (error.message.includes('QuotaExceededError') || error.message.includes('容量制限')) {
          setTimeout(() => {
            if (confirm('ブラウザの保存容量が不足しています。\n\n古いプロジェクトを削除して再保存しますか？\n\n※「キャンセル」を選ぶと手動でlocalStorageをクリアできます。')) {
              // 再保存を試行
              dlog('🔄 容量制限エラー後の再保存を試行...');
              handleSaveProject();
            } else {
              // 手動でlocalStorageをクリア
              if (confirm('すべての保存されたプロジェクトを削除してよろしいですか？\n\n※この操作は取り消せません。')) {
                localStorage.removeItem('miruwebAR_projects');
                alert('保存データを削除しました。再度保存を試してください。');
                dlog('🧹 localStorage手動クリア完了');
              }
            }
          }, 100);
        }
        
        // エラー通知
        const errorNotification = document.createElement('div');
        errorNotification.className = 'notification error';
        errorNotification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #f44336;
          color: white;
          padding: 12px 20px;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          z-index: 10000;
        `;
        errorNotification.textContent = errorMessage;
        document.body.appendChild(errorNotification);

        setTimeout(() => {
          if (document.body.contains(errorNotification)) {
            document.body.removeChild(errorNotification);
          }
        }, 3000);
        
        reject(error); // Promise拒否
      }
    });
    });
  };

  // --- ページ離脱時の確認 ---
  window.addEventListener('beforeunload', (event) => {
    if (checkForUnsavedChanges()) {
      // 現代的なブラウザでは preventDefault() のみで十分
      event.preventDefault();
      // 古いブラウザ対応のため、空文字列を返す
      return '';
    }
  });

  // --- 初期化処理 ---
  updateTotalFileSizeDisplay(); // 初期ファイルサイズ表示 (0MBのはず)

  // 初期化を実行
  initialize();

  // --- クリーンアップ関数 ---
  // このビューが表示されなくなったときに呼ばれるべき関数を返す
  return () => {
    dlog("エディタービューのクリーンアップを実行します。");
    
    // ARビューアのリソースを解放
    if (viewerInstance && viewerInstance.dispose) {
      try {
        viewerInstance.dispose();
        dlog("ARビューアのリソースを解放しました。");
      } catch (error) {
        console.error("ARビューアのリソース解放中にエラー:", error);
      }
    }

    // ファイルリストの各アイテムのObjectURLを解放
    if (fileListContainer) {
      fileListContainer.querySelectorAll('.file-item').forEach(fileItem => {
        const objectUrl = fileItem.dataset.objectUrl;
        if (objectUrl && objectUrl.startsWith('blob:')) {
          URL.revokeObjectURL(objectUrl);
        }
      });
    }

    // イベントリスナーを解除
    if (uploadButton && modelFileInput) {
      uploadButton.removeEventListener('click', handleUploadButtonClick);
    }

    if (uploadArea) {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.removeEventListener(eventName, handleDragEvent);
      });
      uploadArea.removeEventListener('dragenter', handleDragEnter);
      uploadArea.removeEventListener('dragleave', handleDragLeave);
      uploadArea.removeEventListener('drop', handleDrop);
    }

    if (scaleSlider) {
      scaleSlider.removeEventListener('input', handleScaleChange);
    }

    if (resetAllButton) {
      resetAllButton.removeEventListener('click', handleResetAll);
    }

    if (rotationSlider) {
      rotationSlider.removeEventListener('input', handleRotationChange);
    }

    if (positionXSlider) positionXSlider.removeEventListener('input', updatePosition);
    if (positionYSlider) positionYSlider.removeEventListener('input', updatePosition);
    if (positionZSlider) positionZSlider.removeEventListener('input', updatePosition);

    if (arScaleSlider) {
      arScaleSlider.removeEventListener('input', handleArScaleChange);
    }

    const resetFrontViewButton = document.getElementById('reset-front-view-button');
    if (resetFrontViewButton) {
      resetFrontViewButton.removeEventListener('click', handleResetFrontView);
    }

    // TransformChangedイベントリスナーを解除
    if (arViewerContainer) {
      arViewerContainer.removeEventListener('transformChanged', handleTransformChanged);
    }

    // 変換モードボタンのイベントリスナーを正しく解除
    if (translateButton && translateButton._cleanup) {
      translateButton.removeEventListener('click', translateButton._cleanup);
    }
    if (rotateButton && rotateButton._cleanup) {
      rotateButton.removeEventListener('click', rotateButton._cleanup);
    }
    if (scaleButton && scaleButton._cleanup) {
      scaleButton.removeEventListener('click', scaleButton._cleanup);
    }

    // DOM要素の参照をクリア
    modelFileInput = null;
    uploadArea = null;
    fileListContainer = null;
    totalFileSizeElement = null;
    markerThumbnail = null;
    changeMarkerButton = null;
    backButton = null;
    saveButton = null;
    scaleSlider = null;
    scaleValue = null;
    scaleSizeLabel = null;
    resetAllButton = null;
    rotationSlider = null;
    rotationValue = null;
    positionXSlider = null;
    positionYSlider = null;
    positionZSlider = null;
    positionXValue = null;
    positionYValue = null;
    positionZValue = null;
    arScaleSlider = null;
    arScaleValue = null;
    translateButton = null;
    rotateButton = null;
    scaleButton = null;
    arViewerContainer = null;

    // ローディング設定のクリーンアップ
    dlog("🧹 ローディング設定のクリーンアップを実行中...");
    
    // ローディング設定のイベントリスナーを削除
    removeLoadingSettingsEventListeners();
    
    // ローディング設定関連のDOM要素を削除
    cleanupLoadingSettingsElements();
    
    // ローディング設定の変数をクリア
    loadingEnabled = null;
    loadingTemplate = null;
    loadingMessage = null;
    loadingBgColor = null;
    loadingBgColorText = null;
    loadingTextColor = null;
    loadingTextColorText = null;
    loadingProgressColor = null;
    loadingProgressColorText = null;
    loadingLogoInput = null;
    loadingLogoButton = null;
    loadingLogoPreview = null;
    loadingLogoImg = null;
    loadingLogoRemove = null;
    loadingShowProgress = null;
    loadingPreviewButton = null;
    
    dlog("✅ ローディング設定のクリーンアップが完了しました");

    dlog("エディタービューのクリーンアップが完了しました。");
  };
}
