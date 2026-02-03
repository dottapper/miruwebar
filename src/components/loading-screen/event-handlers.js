/**
 * ローディング画面エディタのイベントハンドラー
 */

import { updatePreview, getCurrentSettingsFromDOM } from './preview.js';

// 未保存チェック用の初期状態を保存
let initialSettings = null;
import {
  INDIVIDUAL_IMAGE_MAX_BYTES,
  INDIVIDUAL_IMAGE_MAX_MB,
  TOTAL_IMAGES_MAX_BYTES,
  TOTAL_IMAGES_MAX_MB,
  ALLOWED_MIME_TYPES,
  COMPRESSION_SETTINGS,
  ERROR_MESSAGES,
  IMAGE_FORMAT_LABELS,
  ERROR_TYPES,
  CAPACITY_UTILS,
  ACCEPT_ATTRIBUTES
} from './constants.js';
import { settingsAPI, defaultSettings, validateAndFixColor, syncLastUsedTemplateId, importExportAPI } from './settings.js';
import { TEMPLATES_STORAGE_KEY } from './template-manager.js';
import { 
  saveLoadingScreenTemplate, 
  getLoadingScreenTemplate, 
  deleteLoadingScreenTemplate,
  showLoadingScreenSelector
} from '../loading-screen-selector.js';

// タブ名を画面タイプに変換する関数
function convertTabNameToScreenType(tabName) {
  switch (tabName) {
    case 'start':
      return 'startScreen';
    case 'loading':
      return 'loadingScreen';
    case 'guide':
      return 'guideScreen';
    default:
      return 'startScreen';
  }
}

// 現在のアクティブタブから画面タイプを取得する関数
function getCurrentActiveScreenType() {
  const activeTab = document.querySelector('.loading-screen-editor__main-tab--active');
  if (activeTab) {
    const tabName = activeTab.dataset.tab;
    return convertTabNameToScreenType(tabName);
  }
  return 'startScreen';
}

// エラー表示関数
export function showLogoError(message, detail = '') {
  console.error('Logo Error:', message, detail);
  
  const existingError = document.querySelector('.loading-screen-editor__error-container');
  if (existingError) {
    existingError.remove();
  }
  
  const activeDropzone = document.querySelector('.loading-screen-editor__file-preview--error');
  if (!activeDropzone) {
    const dropzones = document.querySelectorAll('.loading-screen-editor__file-preview');
    if (dropzones.length > 0) {
      dropzones[0].classList.add('loading-screen-editor__file-preview--error');
      setTimeout(() => {
        dropzones[0].classList.remove('loading-screen-editor__file-preview--error');
      }, 2000);
    }
    return;
  }
  
  const errorContainer = document.createElement('div');
  errorContainer.className = 'loading-screen-editor__error-container';
  errorContainer.innerHTML = `
    <div class="loading-screen-editor__error-icon">⚠️</div>
    <div>
      <div class="loading-screen-editor__error-message">${message}</div>
      ${detail ? `<div class="loading-screen-editor__error-detail">${detail}</div>` : ''}
    </div>
  `;
  
  activeDropzone.after(errorContainer);
  
  setTimeout(() => {
    errorContainer.style.opacity = '0';
    setTimeout(() => {
      if (errorContainer.parentNode) {
        errorContainer.remove();
      }
    }, 300);
  }, 5000);
}

// タブ切り替えの処理
export function setupTabHandlers() {
  const mainTabs = document.querySelectorAll('.loading-screen-editor__main-tab');
  const mainContents = document.querySelectorAll('.loading-screen-editor__tab-content');

  if (mainTabs.length === 0 || mainContents.length === 0) {
    console.error('タブ要素が見つかりません');
    return;
  }

  mainTabs.forEach(tab => {
    tab.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      mainTabs.forEach(t => t.classList.remove('loading-screen-editor__main-tab--active'));
      mainContents.forEach(c => {
        c.classList.remove('loading-screen-editor__tab-content--active');
        c.style.display = 'none';
      });

      tab.classList.add('loading-screen-editor__main-tab--active');
      const tabName = tab.dataset.tab;
      
      const mainContent = document.querySelector(`.loading-screen-editor__tab-content[data-tab="${tabName}"]`);
      if (mainContent) {
        mainContent.style.display = 'block';
        setTimeout(() => {
          mainContent.classList.add('loading-screen-editor__tab-content--active');
        }, 10);
        
        // ローディング画面タブの場合はサブタブを設定
        if (tabName === 'loading') {
          setupSubTabHandlers();
        }
        
        // ガイド画面タブの場合はモード切り替えを設定
        if (tabName === 'guide') {
          setupGuideModeHandlers();
        }
        
        // タブ名を画面タイプに変換してプレビューを更新
        const screenType = convertTabNameToScreenType(tabName);
        updatePreview(screenType);
      }
    });
  });

  // 向きボタンの設定
  setupOrientationButtons();
}

// サブタブ切り替えの処理
function setupSubTabHandlers() {
  const subTabs = document.querySelectorAll('.loading-screen-editor__sub-tab');
  const subContents = document.querySelectorAll('.loading-screen-editor__sub-content');

  if (subTabs.length === 0 || subContents.length === 0) {
    console.log('サブタブ要素が見つかりません');
    return;
  }

  subTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      
      subTabs.forEach(t => t.classList.remove('loading-screen-editor__sub-tab--active'));
      subContents.forEach(c => {
        c.classList.remove('loading-screen-editor__sub-content--active');
        c.style.display = 'none';
      });

      tab.classList.add('loading-screen-editor__sub-tab--active');
      const subtabName = tab.dataset.subtab;
      
      const subContent = document.querySelector(`.loading-screen-editor__sub-content[data-subtab="${subtabName}"]`);
      if (subContent) {
        subContent.style.display = 'block';
        setTimeout(() => {
          subContent.classList.add('loading-screen-editor__sub-content--active');
        }, 10);
        
        // ローディング画面のプレビューを更新
        updatePreview('loadingScreen');
      }
    });
  });
}

// ガイド画面のモード切り替え処理
function setupGuideModeHandlers() {
  const modeSelect = document.getElementById('guideScreen-mode');
  const surfaceSection = document.getElementById('surface-detection-section');
  const worldSection = document.getElementById('world-tracking-section');

  if (!modeSelect || !surfaceSection || !worldSection) {
    console.log('ガイドモード要素が見つかりません');
    return;
  }

  modeSelect.addEventListener('change', (e) => {
    const selectedMode = e.target.value;
    
    if (selectedMode === 'surface') {
      surfaceSection.style.display = 'block';
      worldSection.style.display = 'none';
    } else {
      surfaceSection.style.display = 'none';
      worldSection.style.display = 'block';
    }
    
    const currentScreenType = getCurrentActiveScreenType();
    updatePreview(currentScreenType);
  });
}

// 向きボタンの設定
function setupOrientationButtons() {
  const orientationButtons = document.querySelectorAll('.loading-screen-editor__orientation-button');
  const phoneFrame = document.getElementById('phone-frame');

  if (orientationButtons.length === 0 || !phoneFrame) {
    console.log('向きボタンまたはフレームが見つかりません');
    return;
  }

  orientationButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      
      orientationButtons.forEach(b => b.classList.remove('loading-screen-editor__orientation-button--active'));
      button.classList.add('loading-screen-editor__orientation-button--active');
      
      if (button.dataset.orientation === 'landscape') {
        phoneFrame.classList.add('loading-screen-editor__phone-frame--landscape');
      } else {
        phoneFrame.classList.remove('loading-screen-editor__phone-frame--landscape');
      }
    });
  });
}

// カラー入力の設定
export function setupColorInputs() {
  const colorPickers = document.querySelectorAll('.loading-screen-editor__color-picker');
  const colorTextInputs = document.querySelectorAll('.loading-screen-editor__input[id$="ColorText"]');

  colorPickers.forEach(picker => {
    // リアルタイム色変更のためinputイベントを使用
    picker.addEventListener('input', (e) => {
      const color = e.target.value;
      const textInputId = e.target.id + 'Text';
      const textInput = document.getElementById(textInputId);
      
      if (textInput) {
        textInput.value = color;
      }
      
      const currentScreenType = getCurrentActiveScreenType();
      updatePreview(currentScreenType);
    });
    
    // 互換性のためchangeイベントも残しておく
    picker.addEventListener('change', (e) => {
      const color = e.target.value;
      const textInputId = e.target.id + 'Text';
      const textInput = document.getElementById(textInputId);
      
      if (textInput) {
        textInput.value = color;
      }
      
      const currentScreenType = getCurrentActiveScreenType();
      updatePreview(currentScreenType);
    });
  });

  colorTextInputs.forEach(textInput => {
    textInput.addEventListener('input', (e) => {
      const color = validateAndFixColor(e.target.value);
      if (color) {
        const pickerId = e.target.id.replace('Text', '');
        const picker = document.getElementById(pickerId);
        
        if (picker) {
          picker.value = color;
        }
        
        const currentScreenType = getCurrentActiveScreenType();
        updatePreview(currentScreenType);
      }
    });
  });
}

// テキスト入力の設定
export function setupTextInputs() {
  const textInputs = document.querySelectorAll('.loading-screen-editor__input[type="text"], .loading-screen-editor__input:not([type])');
  
  textInputs.forEach(input => {
    input.addEventListener('input', () => {
      const currentScreenType = getCurrentActiveScreenType();
      updatePreview(currentScreenType);
    });
  });
  
  // すべてのselectボックスに対する処理
  const selectInputs = document.querySelectorAll('select.loading-screen-editor__input');
  selectInputs.forEach(select => {
    select.addEventListener('change', () => {
      const currentScreenType = getCurrentActiveScreenType();
      updatePreview(currentScreenType);
    });
  });
  
  // テキストエリアに対する処理
  const textAreas = document.querySelectorAll('textarea.loading-screen-editor__input');
  textAreas.forEach(textarea => {
    textarea.addEventListener('input', () => {
      const currentScreenType = getCurrentActiveScreenType();
      updatePreview(currentScreenType);
    });
  });
}

// ファイルドロップゾーンの設定
// 単一のドロップゾーンのイベントリスナーを設定
function setupSingleDropzone(dropzone) {
  const fileInput = dropzone.querySelector('.loading-screen-editor__file-input');
  const removeButton = dropzone.querySelector('.loading-screen-editor__remove-button');
  
  if (!fileInput) return;

  // 既存のイベントリスナーをクリア（重複を防ぐ）
  const newDropzone = dropzone.cloneNode(true);
  dropzone.parentNode.replaceChild(newDropzone, dropzone);
  
  // 新しい要素の参照を取得
  const newFileInput = newDropzone.querySelector('.loading-screen-editor__file-input');
  const newRemoveButton = newDropzone.querySelector('.loading-screen-editor__remove-button');

  // クリックでファイル選択
  newDropzone.addEventListener('click', () => {
    newFileInput.click();
  });

  // ファイル選択時の処理
  newFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelection(e.target.files[0], newDropzone, newRemoveButton);
    }
  });

  // ドラッグ&ドロップの処理
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    newDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  newDropzone.addEventListener('dragenter', () => {
    newDropzone.classList.add('drag-active');
  });

  newDropzone.addEventListener('dragleave', () => {
    newDropzone.classList.remove('drag-active');
  });

  newDropzone.addEventListener('drop', (e) => {
    newDropzone.classList.remove('drag-active');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0], newDropzone, newRemoveButton);
    }
  });

  // 削除ボタンの処理
  if (newRemoveButton) {
    newRemoveButton.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFile(newDropzone, newRemoveButton);
    });
  }
  
  return newDropzone;
}

export function setupFileDropzones() {
  const dropzones = document.querySelectorAll('.loading-screen-editor__file-preview');
  
  dropzones.forEach(dropzone => {
    setupSingleDropzone(dropzone);
  });
}

// ファイル選択処理
function handleFileSelection(file, dropzone, removeButton) {
  // 基本的な入力検証
  if (!file) {
    console.warn('ファイルが選択されていません');
    return;
  }
  
  if (!dropzone) {
    console.error('ドロップゾーンが見つかりません');
    return;
  }
  
  // ファイルサイズの事前チェック（空ファイルや異常に大きなファイルを除外）
  if (file.size === 0) {
    showLogoError('❌ 空のファイルです', 'サイズが0バイトのファイルは選択できません');
    return;
  }
  
  if (file.size > 50 * 1024 * 1024) { // 50MB制限
    showLogoError('❌ ファイルが大きすぎます', '50MB以下のファイルを選択してください');
    return;
  }
  
  // ファイルタイプの検証
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    showLogoError(
      `❌ サポートされていないファイル形式です\n\nファイル名: ${file.name}\n検出された形式: ${file.type}\n対応形式: JPG, PNG, GIF, WebP`,
      'JPG, PNG, GIF, WebP形式のファイルを選択してください'
    );
    return;
  }

  // 個別ファイルサイズの検証
  if (file.size > INDIVIDUAL_IMAGE_MAX_BYTES) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    showLogoError(
      ERROR_MESSAGES.individualSizeExceeded(fileSizeMB),
      `各画像ファイルは${INDIVIDUAL_IMAGE_MAX_MB}MB以下にしてください`
    );
    return;
  }

  // 既存画像との合計容量チェック
  const currentSettings = getCurrentSettingsFromDOM();
  const currentTotalSize = calculateImageDataSize(currentSettings);
  const newFileSize = file.size;
  if (currentTotalSize + newFileSize > TOTAL_IMAGES_MAX_BYTES) {
    const currentSizeMB = (currentTotalSize / (1024 * 1024)).toFixed(2);
    const newFileSizeMB = (newFileSize / (1024 * 1024)).toFixed(2);
    const totalSizeMB = ((currentTotalSize + newFileSize) / (1024 * 1024)).toFixed(2);
    
    showLogoError(
      ERROR_MESSAGES.totalSizeExceeded(currentSizeMB, newFileSizeMB, totalSizeMB),
      '他の画像を削除してから追加してください'
    );
    return;
  }

  // プレビュー表示
  const reader = new FileReader();
  reader.onload = async (e) => {
    let imageSrc = e.target.result;
    
    // 画像をアップロード時に圧縮
    const originalSize = imageSrc.length;
    const originalSizeMB = (originalSize / 1024 / 1024).toFixed(2);
    
    try {
      const { quality, maxWidth, maxHeight } = COMPRESSION_SETTINGS.default;
      const compressedImage = await settingsAPI.compressBase64Image(imageSrc, quality, maxWidth, maxHeight);
      if (compressedImage && compressedImage.length < imageSrc.length) {
        const compressedSize = compressedImage.length;
        const compressedSizeMB = (compressedSize / 1024 / 1024).toFixed(2);
        const compressionRatio = (((originalSize - compressedSize) / originalSize) * 100).toFixed(1);
        
        console.log('📦 アップロード時画像圧縮詳細:', {
          元サイズ: `${originalSizeMB}MB (${originalSize} bytes)`,
          圧縮後: `${compressedSizeMB}MB (${compressedSize} bytes)`,
          圧縮率: `${compressionRatio}%`,
          ファイル: file.name,
          圧縮設定: `quality: ${quality}, maxSize: ${maxWidth}x${maxHeight}`
        });
        
        imageSrc = compressedImage;
      } else {
        console.log('📦 圧縮不要または失敗:', {
          元サイズ: `${originalSizeMB}MB`,
          理由: compressedImage ? '圧縮効果なし' : '圧縮失敗'
        });
      }
    } catch (error) {
      console.warn('アップロード時の画像圧縮に失敗:', error);
    }
    
    const dropZone = dropzone.querySelector('.loading-screen-editor__drop-zone');
    
    // dropZoneが存在しない場合のエラーハンドリング
    if (!dropZone) {
      console.error('❌ dropZoneが見つかりません:', dropzone.id);
      showNotification('ファイルアップロードエリアが見つかりません', 'error');
      return;
    }
    
    const imgElement = document.createElement('img');
    imgElement.src = imageSrc; // 圧縮済みの画像を使用
    imgElement.alt = 'プレビュー';
    imgElement.style.cssText = 'max-width: 100%; max-height: 100px; object-fit: contain;';
    
    // 画像が読み込まれた後にプレビューを更新
    imgElement.onload = () => {
      
      // ロゴアップロード時に適切なサイズを設定
      if (dropzone.id === 'startLogoDropzone') {
        const logoSizeSlider = document.getElementById('startScreen-logoSize');
        if (logoSizeSlider && logoSizeSlider.value === '1.0') {
          // デフォルト値の場合は適切なサイズに設定
          logoSizeSlider.value = '1.5';
          const sizeValueDisplay = document.getElementById('startScreen-logoSize-value');
          if (sizeValueDisplay) {
            sizeValueDisplay.textContent = '1.5x';
          }
          logoSizeSlider.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } else if (dropzone.id === 'loadingLogoDropzone') {
        const logoSizeSlider = document.getElementById('loadingScreen-logoSize');
        if (logoSizeSlider && logoSizeSlider.value === '1.0') {
          // デフォルト値の場合は適切なサイズに設定
          logoSizeSlider.value = '1.5';
          const sizeValueDisplay = document.getElementById('loadingScreen-logoSize-value');
          if (sizeValueDisplay) {
            sizeValueDisplay.textContent = '1.5x';
          }
          logoSizeSlider.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      
      // DOMに画像を挿入
      dropZone.innerHTML = `
        <div class="loading-screen-editor__file-name">${file.name}</div>
      `;
      dropZone.insertBefore(imgElement, dropZone.firstChild);
      
      if (removeButton) {
        removeButton.style.display = 'block';
      }
      
      // 画像がDOMに挿入された後にプレビューを更新
      setTimeout(() => {
        const currentScreenType = getCurrentActiveScreenType();
        updatePreview(currentScreenType);
        // ストレージ使用量も更新
        updateStorageUsageDisplay();
      }, 50);
    };
    
    // 画像読み込みエラー時の処理
    imgElement.onerror = () => {
      console.error('❌ 画像読み込みエラー:', file.name);
      showNotification('画像の読み込みに失敗しました', 'error');
    };
  };
  
  reader.readAsDataURL(file);
}

// ファイル削除処理
function removeFile(dropzone, removeButton) {
  const id = dropzone.id;
  
  let defaultText = 'ファイルをドロップ';
  let icon = '📁';
  let formats = IMAGE_FORMAT_LABELS.default;
  let acceptTypes = ACCEPT_ATTRIBUTES.default;
  
  if (id === 'thumbnailDropzone') {
    defaultText = 'サムネイル画像をドロップ';
    icon = '🖼️';
    formats = IMAGE_FORMAT_LABELS.thumbnail;
    acceptTypes = ACCEPT_ATTRIBUTES.otherImages;
  } else if (id === 'startLogoDropzone') {
    defaultText = 'ロゴ画像をドロップ';
    icon = '🖼️';
    formats = IMAGE_FORMAT_LABELS.default;
    acceptTypes = ACCEPT_ATTRIBUTES.startLogo;
  } else if (id === 'loadingLogoDropzone') {
    defaultText = 'ロゴをドロップ';
    icon = '🖼️';
    formats = IMAGE_FORMAT_LABELS.logo;
    acceptTypes = ACCEPT_ATTRIBUTES.otherImages;
  } else if (id === 'surfaceGuideImageDropzone') {
    defaultText = 'マーカー画像をドロップ';
    formats = IMAGE_FORMAT_LABELS.default;
    acceptTypes = ACCEPT_ATTRIBUTES.otherImages;
  } else if (id === 'worldGuideImageDropzone') {
    defaultText = 'ガイド画像をドロップ';
    formats = IMAGE_FORMAT_LABELS.default;
    acceptTypes = ACCEPT_ATTRIBUTES.otherImages;
  }
  
  // 完全なドロップゾーン構造を再作成
  dropzone.innerHTML = `
    <input type="file" class="loading-screen-editor__file-input" accept="${acceptTypes}" style="display: none;">
    <div class="loading-screen-editor__drop-zone">
      <div class="loading-screen-editor__drop-zone-icon">${icon}</div>
      <div class="loading-screen-editor__drop-zone-text">${defaultText}</div>
      <div class="loading-screen-editor__drop-zone-subtext">またはクリックして選択</div>
      <div class="loading-screen-editor__supported-formats">
        ${formats}
      </div>
    </div>
    <button class="loading-screen-editor__remove-button" style="display: none;">✕</button>
  `;
  
  // イベントリスナーを再設定（少し遅延させて確実に）
  setTimeout(() => {
    const updatedDropzone = document.getElementById(id);
    if (updatedDropzone) {
      setupSingleDropzone(updatedDropzone);
      console.log(`🔄 ${id} のイベントリスナーを再設定`);
    }
  }, 10);
  
  const currentScreenType = getCurrentActiveScreenType();
  updatePreview(currentScreenType);
  // ストレージ使用量も更新
  updateStorageUsageDisplay();
}

// スライダーの設定
export function initializeSliders() {
  const sliders = document.querySelectorAll('.loading-screen-editor__slider');
  
  sliders.forEach(slider => {
    const valueDisplay = slider.parentElement.querySelector('.loading-screen-editor__value-display');
    
    const updateValue = () => {
      const value = parseFloat(slider.value);
      const unit = slider.id.includes('Position') ? '%' : 'x';
      
      if (valueDisplay) {
        valueDisplay.textContent = value + unit;
      }
      
      const currentScreenType = getCurrentActiveScreenType();
      updatePreview(currentScreenType);
    };
    
    slider.addEventListener('input', updateValue);
    updateValue(); // 初期値を設定
  });
  
  // マーカーサイズスライダーの特別な処理
  const markerSizeSlider = document.getElementById('guideScreen-markerSize');
  if (markerSizeSlider) {
    const markerValueDisplay = document.getElementById('markerSize-value');
    
    const updateMarkerSize = () => {
      const value = parseFloat(markerSizeSlider.value);
      if (markerValueDisplay) {
        markerValueDisplay.textContent = value + 'x';
      }
      updatePreview('guideScreen');
    };
    
    markerSizeSlider.addEventListener('input', updateMarkerSize);
    updateMarkerSize(); // 初期値を設定
  }
}

// ロゴタイプラジオボタンの設定
export function setupLogoTypeHandlers() {
  const radioButtons = document.querySelectorAll('input[name="loadingLogoType"]');
  
  radioButtons.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const logoType = e.target.value;
      const customLogoSection = document.getElementById('loading-custom-logo-section');
      const logoControls = document.getElementById('loading-logo-controls');
      const logoSizeControls = document.getElementById('loading-logo-size-controls');
      
      // カスタムロゴアップロードセクションの表示/非表示
      if (customLogoSection) {
        customLogoSection.style.display = logoType === 'custom' ? 'block' : 'none';
      }
      
      // ロゴ位置・サイズコントロールの表示/非表示
      if (logoControls) {
        logoControls.style.display = logoType !== 'none' ? 'block' : 'none';
      }
      if (logoSizeControls) {
        logoSizeControls.style.display = logoType !== 'none' ? 'block' : 'none';
      }
      
      // 「スタート画面のロゴを使用」が選択された場合、スタート画面の設定を引き継ぐ
      if (logoType === 'useStartLogo') {
        inheritStartScreenLogoSettings();
      }
      
      // プレビューを更新
      const currentScreenType = getCurrentActiveScreenType();
      updatePreview(currentScreenType);
    });
  });
}

// スタート画面のロゴ設定をローディング画面に引き継ぐ関数
function inheritStartScreenLogoSettings() {
  // スタート画面のロゴサイズを取得
  const startLogoSizeSlider = document.getElementById('startScreen-logoSize');
  const startLogoPositionSlider = document.getElementById('startScreen-logoPosition');
  
  // ローディング画面のロゴサイズスライダーを取得
  const loadingLogoSizeSlider = document.getElementById('loadingScreen-logoSize');
  const loadingLogoPositionSlider = document.getElementById('loadingScreen-logoPosition');
  
  if (startLogoSizeSlider && loadingLogoSizeSlider) {
    const startSize = parseFloat(startLogoSizeSlider.value);
    
    // スタート画面のロゴサイズをそのままローディング画面に適用
    // ただし、ローディング画面のスライダー範囲（0.5-2.0）に収まるように調整
    let adjustedSize = startSize;
    
    // 範囲外の場合は調整
    if (startSize < 0.5) {
      adjustedSize = 0.5;
    } else if (startSize > 2.0) {
      adjustedSize = 2.0;
    }
    
    loadingLogoSizeSlider.value = adjustedSize;
    
    // 値表示も更新
    const sizeValueDisplay = document.getElementById('loadingScreen-logoSize-value');
    if (sizeValueDisplay) {
      sizeValueDisplay.textContent = adjustedSize.toFixed(1) + 'x';
    }
    
    // スライダーのinputイベントを発火させて、他の処理も連鎖実行
    loadingLogoSizeSlider.dispatchEvent(new Event('input', { bubbles: true }));
    
    // プレビューの更新を強制実行
    setTimeout(() => {
      const currentScreenType = getCurrentActiveScreenType();
      updatePreview(currentScreenType);
    }, 100);
  }
  
  if (startLogoPositionSlider && loadingLogoPositionSlider) {
    const startPosition = parseFloat(startLogoPositionSlider.value);
    
    // ローディング画面のポジション範囲（10-50）に収まるように調整
    const adjustedPosition = Math.max(10, Math.min(50, startPosition));
    
    loadingLogoPositionSlider.value = adjustedPosition;
    
    // 値表示も更新
    const positionValueDisplay = document.getElementById('loadingScreen-logoPosition-value');
    if (positionValueDisplay) {
      positionValueDisplay.textContent = adjustedPosition + '%';
    }
    
    // スライダーのinputイベントを発火させて、他の処理も連鎖実行
    loadingLogoPositionSlider.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// サイドバーメニューの設定
export function setupSidebarMenuHandlers() {
  console.log('サイドバーメニューの設定を開始...');
  
  try {
    // プロジェクト一覧メニュー
    const projectsMenu = document.getElementById('projects-menu-item');
    if (projectsMenu) {
      projectsMenu.addEventListener('click', () => {
        window.location.hash = '#/projects';
      });
    }
    
    // メディア一覧メニュー
    const mediaMenu = document.getElementById('media-menu-item');
    if (mediaMenu) {
      mediaMenu.addEventListener('click', () => {
        console.log('メディア一覧機能は現在開発中です');
        showNotification('メディア一覧機能は近日公開予定です', 'info');
      });
    }
    
    // 分析メニュー
    const analyticsMenu = document.getElementById('analytics-menu-item');
    if (analyticsMenu) {
      analyticsMenu.addEventListener('click', () => {
        console.log('分析機能は現在開発中です');
        showNotification('分析機能は近日公開予定です', 'info');
      });
    }
    
    // ローディング画面一覧メニュー
    const loadingScreenMenu = document.getElementById('loading-screen-menu');
    if (loadingScreenMenu) {
      loadingScreenMenu.addEventListener('click', () => {
        try {
          showLoadingScreenSelector();
        } catch (error) {
          console.error('ローディング画面セレクターの表示エラー:', error);
        }
      });
    }
    
    // ホームに戻るボタン
    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        window.location.hash = '#/login';
      });
    }
  } catch (error) {
    console.error('サイドバーメニューの設定中にエラーが発生しました:', error);
  }
}


// テンプレートアイテムのイベントハンドラー設定
function setupTemplateItemHandlers() {
  const templateItems = document.querySelectorAll('.loading-screen-editor__template-item[data-template-id]');
  
  templateItems.forEach(item => {
    const templateId = item.dataset.templateId;
    
    // クリックでテンプレートを選択
    item.addEventListener('click', () => {
      selectTemplate(templateId);
    });
    
    // 右クリックでコンテキストメニュー（将来的に実装）
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      // 右クリックメニューは現在無効
      console.log('テンプレート右クリック（メニュー無効）:', templateId);
    });
  });
}

// テンプレートを選択
function selectTemplate(templateId) {
  try {
    const template = getLoadingScreenTemplate(templateId);
    if (!template) {
      console.error('テンプレートが見つかりません:', templateId);
      return;
    }
    
    // 現在の設定をテンプレートの設定で上書き
    if (template.settings) {
      loadTemplateSettings(template.settings);
    }
    
    // アクティブなテンプレートを更新
    updateActiveTemplate(templateId);
    
    // プレビュー更新は loadTemplateSettings 内で実行されるため、ここではコメントアウト
    // const currentScreenType = getCurrentActiveScreenType();
    // updatePreview(currentScreenType);
    
    console.log('テンプレートを選択しました:', template.name);
  } catch (error) {
    console.error('テンプレート選択に失敗しました:', error);
  }
}

// テンプレート設定をフォームに読み込み
function loadTemplateSettings(settings) {
  try {
    // 各画面タイプの設定を読み込み
    ['startScreen', 'loadingScreen', 'guideScreen'].forEach(screenType => {
      const screenSettings = settings[screenType];
      if (!screenSettings) return;
      
      // 各プロパティをフォーム要素に設定
      Object.entries(screenSettings).forEach(([key, value]) => {
        const inputId = `${screenType}-${key}`;
        const input = document.getElementById(inputId);
        
        if (input) {
          if (input.type === 'color') {
            input.value = value || '';
            // カラーテキスト入力も更新
            const textInput = document.getElementById(`${inputId}Text`);
            if (textInput) {
              textInput.value = value || '';
            }
          } else if (input.type === 'range') {
            input.value = value || input.min;
            // スライダーの値表示も更新
            const valueDisplay = input.parentElement.querySelector('.loading-screen-editor__value-display');
            if (valueDisplay) {
              const unit = input.id.includes('Position') ? '%' : 'x';
              valueDisplay.textContent = value + unit;
            }
          } else {
            input.value = value || '';
          }
        }
      });
    });
    
    // ロゴタイプラジオボタンの設定
    if (settings.loadingScreen && settings.loadingScreen.logoType) {
      const logoTypeRadio = document.querySelector(`input[name="loadingLogoType"][value="${settings.loadingScreen.logoType}"]`);
      if (logoTypeRadio) {
        logoTypeRadio.checked = true;
        
        // UI表示の更新
        const customLogoSection = document.getElementById('loading-custom-logo-section');
        const logoControls = document.getElementById('loading-logo-controls');
        const logoSizeControls = document.getElementById('loading-logo-size-controls');
        
        const logoType = settings.loadingScreen.logoType;
        if (customLogoSection) {
          customLogoSection.style.display = logoType === 'custom' ? 'block' : 'none';
        }
        if (logoControls) {
          logoControls.style.display = logoType !== 'none' ? 'block' : 'none';
        }
        if (logoSizeControls) {
          logoSizeControls.style.display = logoType !== 'none' ? 'block' : 'none';
        }
      }
    }
    
    // 画像データの読み込み
    console.log('🖼️ 画像データ読み込み処理開始');
    
    // 画像復元用のヘルパー関数
    const restoreImage = (dropzoneId, imageSrc, altText) => {
      const dropzone = document.getElementById(dropzoneId);
      if (dropzone && imageSrc) {
        const fileName = `復元された${altText}`;
        const dropZone = dropzone.querySelector('.loading-screen-editor__drop-zone');
        const removeButton = dropzone.querySelector('.loading-screen-editor__remove-button');
        
        if (dropZone) {
          // 既存の内容をクリアして画像と名前を設定
          dropZone.innerHTML = `
            <img src="${imageSrc}" alt="${altText}" data-original-src="${imageSrc}" style="max-width: 100%; max-height: 100px; object-fit: contain;">
            <div class="loading-screen-editor__file-name">${fileName}</div>
          `;
          
          // 削除ボタンを表示
          if (removeButton) {
            removeButton.style.display = 'block';
          }
        }
      }
    };

    // サムネイル画像
    restoreImage('thumbnailDropzone', settings.startScreen?.thumbnail, 'サムネイル');
    
    // スタート画面ロゴ
    restoreImage('startLogoDropzone', settings.startScreen?.logo, 'スタート画面ロゴ');
    
    // ローディング画面カスタムロゴ
    restoreImage('loadingLogoDropzone', settings.loadingScreen?.logo, 'ローディング画面ロゴ');
    
    // ガイド画面画像（平面検出用）
    restoreImage('surfaceGuideImageDropzone', settings.guideScreen?.surfaceDetection?.guideImage, '平面検出ガイド画像');
    
    // ガイド画面画像（空間検出用）
    restoreImage('worldGuideImageDropzone', settings.guideScreen?.worldTracking?.guideImage, '空間検出ガイド画像');
    
    console.log('🖼️ 画像データ読み込み処理完了');
    
    // 画像復元後にイベントリスナーを再設定
    setTimeout(() => {
      setupFileDropzones();
      console.log('🔄 画像復元後のイベントリスナーを再設定');
    }, 50);
    
    // 画像復元後にプレビューを更新
    setTimeout(() => {
      const currentScreenType = getCurrentActiveScreenType();
      updatePreview(currentScreenType);
    }, 100);
    
    // 初期状態を保存（画像含む）
    setTimeout(() => {
      initialSettings = getCurrentSettingsFromDOM();
    }, 150);
    
  } catch (error) {
    console.error('テンプレート設定の読み込みに失敗しました:', error);
  }
}

// アクティブなテンプレートを更新
function updateActiveTemplate(templateId) {
  // 全てのテンプレートアイテムからアクティブクラスを削除
  document.querySelectorAll('.loading-screen-editor__template-item').forEach(item => {
    item.classList.remove('loading-screen-editor__template-item--active');
  });
  
  // 選択されたテンプレートにアクティブクラスを追加
  const selectedItem = document.querySelector(`.loading-screen-editor__template-item[data-template-id="${templateId}"]`);
  if (selectedItem) {
    selectedItem.classList.add('loading-screen-editor__template-item--active');
  }
  
  // 現在のテンプレートIDをストレージに保存（オプション）
  try {
    sessionStorage.setItem('miruwebAR_current_template', templateId);
  } catch (error) {
    console.warn('現在のテンプレートID保存に失敗:', error);
  }
}

// 現在のアクティブテンプレートIDを取得
function getCurrentActiveTemplateId() {
  try {
    // セッションストレージから取得を試みる
    const stored = sessionStorage.getItem('miruwebAR_current_template');
    if (stored) {
      return stored;
    }
    
    // アクティブなDOM要素から取得を試みる
    const activeItem = document.querySelector('.loading-screen-editor__template-item--active');
    if (activeItem && activeItem.dataset.templateId) {
      return activeItem.dataset.templateId;
    }
    
    // デフォルトを返す
    return 'default';
  } catch (error) {
    console.error('現在のテンプレートID取得に失敗:', error);
    return 'default';
  }
}


// ボタンの設定
export function setupButtons() {
  // プロジェクト一覧に戻るボタン
  const backButton = document.getElementById('back-to-projects-button');
  if (backButton) {
    backButton.addEventListener('click', () => {
      try {
        // 変更があるかチェック（簡易版）
        let hasChanges = false;
        try {
          hasChanges = checkForUnsavedChanges();
        } catch (changeCheckError) {
          console.warn('変更チェック中にエラー:', changeCheckError);
          hasChanges = false; // エラー時は変更なしとみなす
        }
        
        if (hasChanges) {
          showSaveConfirmDialog(() => {
            // プロジェクト一覧に戻る
            window.location.hash = '#/projects';
          });
        } else {
          window.location.hash = '#/projects';
        }
      } catch (error) {
        console.error('戻るボタンクリック処理中にエラー:', error);
        
        // エラー発生時でも戻れるように
        window.location.hash = '#/projects';
      }
    });
  } else {
    console.warn('戻るボタンが見つかりません');
  }
  
  // 保存ボタン
  const saveButton = document.getElementById('save-button');
  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      try {
        // 現在の設定を取得
        const settings = getCurrentSettingsFromDOM();
        
        // URLパラメータから新規作成モードと名前を確認
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const mode = urlParams.get('mode');
        const templateName = urlParams.get('name') ? decodeURIComponent(urlParams.get('name')) : null;
        
        if (mode === 'new' && templateName) {
          // 新規作成モード：テンプレートとして保存
          const templateData = {
            name: templateName,
            settings: settings
          };
          
          const savedTemplate = await saveLoadingScreenTemplate(templateData);
          showNotification('保存されました', 'success');
          // ストレージ使用量を更新
          updateStorageUsageDisplay();
          
          // 最後に使用したテンプレートIDを記録
          localStorage.setItem('lastUsedTemplateId', savedTemplate.id);
        syncLastUsedTemplateId(savedTemplate.id);
          syncLastUsedTemplateId(savedTemplate.id);
          
          // URLを更新して編集モードに切り替え
          window.location.hash = `#/loading-screen?template=${savedTemplate.id}`;
          
          // タイトルも更新
          setTimeout(() => {
            updateEditorTitleFromUrl();
          }, 100);
        } else {
          // 既存テンプレートの更新または通常の設定保存
          const templateId = urlParams.get('template');
          if (templateId) {
            // テンプレート編集モード：既存テンプレートを更新
            const template = getLoadingScreenTemplate(templateId);
            if (template) {
              // 既存のテンプレートを削除して新しいものを保存
              deleteLoadingScreenTemplate(templateId);
              const savedTemplate = await saveLoadingScreenTemplate({
                name: template.name,
                settings: settings
              });
              
              showNotification('保存されました', 'success');
              // ストレージ使用量を更新
              updateStorageUsageDisplay();
              
              // 最後に使用したテンプレートIDを記録
              localStorage.setItem('lastUsedTemplateId', savedTemplate.id);
              syncLastUsedTemplateId(savedTemplate.id);
              
              // URLを新しいテンプレートIDに更新
              window.location.hash = `#/loading-screen?template=${savedTemplate.id}`;
              
              // タイトル表示を再同期
              setTimeout(() => {
                updateEditorTitleFromUrl();
              }, 100);
            } else {
              // テンプレートが見つからない場合は通常保存
              await settingsAPI.saveSettings(settings);
              showNotification('保存されました', 'success');
              // ストレージ使用量を更新
              updateStorageUsageDisplay();
            }
          } else {
            // 通常の設定保存
            await settingsAPI.saveSettings(settings);
            showNotification('保存されました', 'success');
            // ストレージ使用量を更新
            updateStorageUsageDisplay();
          }
        }
      } catch (error) {
        console.error('設定の保存に失敗しました:', error);
        
        // エラータイプに応じた処理（優先度順：画像容量系 → ストレージクォータ系 → その他）
        if (error.type === ERROR_TYPES.IMAGE_CAPACITY) {
          // 画像容量制限エラー（個別ファイルサイズ、合計サイズ超過）
          showNotification(error.message, 'warning');
        } else if (error.type === ERROR_TYPES.WARNING) {
          // 警告レベル（画像圧縮など、処理は成功したが注意が必要）
          showNotification(error.message, 'warning');
        } else if (error.type === ERROR_TYPES.STORAGE_QUOTA || error.message.includes('QuotaExceededError') || error.name === 'QuotaExceededError') {
          // ブラウザストレージクォータ制限エラー
          showNotification('💾 ストレージ容量が不足しています。\n\n📁 ブラウザの設定からサイトデータを削除するか、\n🗂️ 不要なテンプレートを削除してください。', 'error');
        } else if (error.message.includes('画像')) {
          // 画像関連エラー（レガシー対応）
          showNotification(error.message, 'warning');
        } else {
          // その他の一般的なエラー
          showNotification(`❌ 設定の保存に失敗しました\n\n${error.message}`, 'error');
        }
      }
    });
  } else {
    console.warn('保存ボタンが見つかりません');
  }
  
  // キャンセルボタン
  const cancelButton = document.getElementById('cancel-button');
  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      if (confirm('変更内容が失われますが、よろしいですか？')) {
        window.location.reload();
      }
    });
    console.log('キャンセルボタンのイベントリスナーを設定しました');
  } else {
    console.warn('キャンセルボタンが見つかりません');
  }

  // リセットボタン（全体リセット）
  const fullResetButtons = document.querySelectorAll('#reset-start-settings, #reset-guide-settings');
  fullResetButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (confirm('設定をリセットしますか？\n\nすべての設定とアップロードした画像がデフォルト状態に戻ります。')) {
        try {
          // 設定をリセット
          settingsAPI.resetSettings();
          
          // テンプレート関連のIDをクリア
          localStorage.removeItem('lastUsedTemplateId');
          
          // DOMをクリア（画像のアップロードデータなどを削除）
          resetDOMElements();
          
          // 成功通知を表示
          showNotification('設定をリセットしました', 'success');
          
        } catch (error) {
          console.error('リセット処理中にエラー:', error);
          showNotification('リセット処理中にエラーが発生しました', 'error');
        }
      }
    });
  });
  
  // ローディング画面一般設定リセットボタン
  const loadingGeneralResetButton = document.getElementById('reset-loading-general-settings');
  if (loadingGeneralResetButton) {
    loadingGeneralResetButton.addEventListener('click', () => {
      if (confirm('ローディング画面の一般設定をリセットしますか？')) {
        try {
          resetLoadingGeneralSettings();
          showNotification('ローディング画面の一般設定をリセットしました', 'success');
        } catch (error) {
          console.error('一般設定リセット中にエラー:', error);
          showNotification('一般設定のリセット中にエラーが発生しました', 'error');
        }
      }
    });
  }
  
  // ローディング画面テキスト設定リセットボタン
  const loadingTextResetButton = document.getElementById('reset-loading-text-settings');
  if (loadingTextResetButton) {
    loadingTextResetButton.addEventListener('click', () => {
      if (confirm('ローディング画面のテキスト設定をリセットしますか？')) {
        try {
          resetLoadingTextSettings();
          showNotification('ローディング画面のテキスト設定をリセットしました', 'success');
        } catch (error) {
          console.error('テキスト設定リセット中にエラー:', error);
          showNotification('テキスト設定のリセット中にエラーが発生しました', 'error');
        }
      }
    });
  }
}

// ネストされたオブジェクトから値を取得するヘルパー関数
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((current, key) => current && current[key], obj);
}

// 未保存の変更があるかチェックする関数（画像変更含む）
function checkForUnsavedChanges() {
  try {
    // 各ドロップゾーンの画像変更をチェック
    const dropzoneIds = [
      'thumbnailDropzone',
      'startLogoDropzone', 
      'loadingLogoDropzone',
      'surfaceGuideImageDropzone',
      'worldGuideImageDropzone'
    ];
    
    for (const dropzoneId of dropzoneIds) {
      const dropzone = document.getElementById(dropzoneId);
      const img = dropzone?.querySelector('img');
      
      if (img) {
        const currentSrc = img.src || '';
        const originalSrc = img.getAttribute('data-original-src') || '';
        
        // 画像が変更されている場合
        if (currentSrc !== originalSrc) {
          console.log(`🔍 画像変更を検出: ${dropzoneId}`, { 
            current: currentSrc.substring(0, 50) + '...', 
            original: originalSrc.substring(0, 50) + '...' 
          });
          return true;
        }
      }
    }
    
    // フォームフィールドの変更もチェック
    if (initialSettings) {
      const currentSettings = getCurrentSettingsFromDOM();
      const hasFormChanges = JSON.stringify(currentSettings) !== JSON.stringify(initialSettings);
      
      if (hasFormChanges) {
        console.log('🔍 フォーム設定変更を検出');
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('未保存変更チェック中にエラー:', error);
    return false;
  }
}

// 通知を表示する関数
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `loading-screen-editor__notification loading-screen-editor__notification--${type}`;
  
  // マルチライン対応
  if (message.includes('\n')) {
    notification.innerHTML = message.replace(/\n/g, '<br>');
  } else {
    notification.textContent = message;
  }
  
  document.body.appendChild(notification);
  
  // タイプに応じて表示時間を調整
  const displayTime = type === 'warning' ? 6000 : (type === 'error' ? 8000 : 3000);
  
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }
  }, displayTime);
}


// URLパラメータからタイトルを更新する関数
function updateEditorTitleFromUrl() {
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const mode = urlParams.get('mode');
  const templateName = urlParams.get('name') ? decodeURIComponent(urlParams.get('name')) : null;
  const templateId = urlParams.get('template');
  
  const titleElement = document.getElementById('editor-title');
  const badgeElement = document.getElementById('template-name-badge');
  
  if (!titleElement || !badgeElement) {
    return;
  }
  
  // デフォルトのタイトル
  titleElement.textContent = 'ローディング画面エディタ';
  
  if (mode === 'new' && templateName) {
    // 新規作成モード
    badgeElement.textContent = templateName;
    badgeElement.className = 'template-name-badge new-template';
    badgeElement.style.display = 'inline-block';
  } else if (templateId) {
    // 編集モード - テンプレート名を取得して表示
    const template = getStoredTemplates().find(t => t.id === templateId);
    if (template && template.name) {
      badgeElement.textContent = `${template.name} (編集中)`;
      badgeElement.className = 'template-name-badge editing-template';
      badgeElement.style.display = 'inline-block';
    }
  } else {
    // 通常モード - バッジを非表示
    badgeElement.style.display = 'none';
  }
}

/**
 * 保存済みテンプレートを取得
 */
function getStoredTemplates() {
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('テンプレート一覧の取得に失敗:', error);
    return [];
  }
}

/**
 * 保存確認ダイアログを表示
 */
function showSaveConfirmDialog(onNavigate) {
  // 既存のダイアログがある場合は削除
  const existingDialog = document.getElementById('save-confirm-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }

  // ダイアログのHTMLを作成
  const dialogHTML = `
    <div class="save-confirm-dialog-overlay" id="save-confirm-dialog">
      <div class="save-confirm-dialog">
        <div class="save-confirm-dialog-header">
          <h3>変更を保存しますか？</h3>
        </div>
        <div class="save-confirm-dialog-content">
          <p>変更が保存されていません。プロジェクト一覧に戻る前に保存しますか？</p>
        </div>
        <div class="save-confirm-dialog-actions">
          <button class="save-confirm-button save-confirm-button--secondary" id="cancel-save-dialog">
            キャンセル
          </button>
          <button class="save-confirm-button save-confirm-button--danger" id="discard-changes">
            保存せずに戻る
          </button>
          <button class="save-confirm-button save-confirm-button--primary" id="save-and-navigate">
            保存して戻る
          </button>
        </div>
      </div>
    </div>
  `;

  // DOMに追加
  document.body.insertAdjacentHTML('beforeend', dialogHTML);

  // ダイアログ要素を取得
  const dialog = document.getElementById('save-confirm-dialog');
  const cancelBtn = document.getElementById('cancel-save-dialog');
  const discardBtn = document.getElementById('discard-changes');
  const saveBtn = document.getElementById('save-and-navigate');

  // ダイアログを表示
  setTimeout(() => {
    dialog.classList.add('show');
  }, 10);

  // キャンセルボタン
  cancelBtn.addEventListener('click', () => {
    console.log('👤 ユーザーがキャンセルを選択');
    hideDialog();
  });

  // 保存せずに戻るボタン
  discardBtn.addEventListener('click', () => {
    console.log('👤 ユーザーが「保存せずに戻る」を選択');
    hideDialog();
    onNavigate();
  });

  // 保存して戻るボタン
  saveBtn.addEventListener('click', async () => {
    console.log('👤 ユーザーが「保存して戻る」を選択');
    
    try {
      // 保存処理を直接実行（ボタンクリックではなく）
      console.log('💾 設定を保存中...');
      
      // 現在の設定を取得
      const settings = getCurrentSettingsFromDOM();
      
      // URLパラメータから新規作成モードと名前を確認
      const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      const mode = urlParams.get('mode');
      const templateName = urlParams.get('name') ? decodeURIComponent(urlParams.get('name')) : null;
      
      if (mode === 'new' && templateName) {
        // 新規作成モード：テンプレートとして保存
        const templateData = {
          name: templateName,
          settings: settings
        };
        
        const savedTemplate = await saveLoadingScreenTemplate(templateData);
        console.log('💾 新規テンプレートを保存しました:', savedTemplate.name);
        
        // 最後に使用したテンプレートIDを記録
        localStorage.setItem('lastUsedTemplateId', savedTemplate.id);
        syncLastUsedTemplateId(savedTemplate.id);
      } else {
        // 既存テンプレートの更新または通常の設定保存
        const templateId = urlParams.get('template');
        if (templateId) {
          // テンプレート編集モード：既存テンプレートを更新
          const template = getLoadingScreenTemplate(templateId);
          if (template) {
            // 既存のテンプレートを削除して新しいものを保存
            deleteLoadingScreenTemplate(templateId);
            const savedTemplate = await saveLoadingScreenTemplate({
              name: template.name,
              settings: settings
            });
            
            console.log('💾 テンプレートを更新しました:', template.name);
            localStorage.setItem('lastUsedTemplateId', savedTemplate.id);
        syncLastUsedTemplateId(savedTemplate.id);
          syncLastUsedTemplateId(savedTemplate.id);
          } else {
            // テンプレートが見つからない場合は通常保存
            await settingsAPI.saveSettings(settings);
            console.log('💾 設定を保存しました');
          }
        } else {
          // 通常の設定保存
          await settingsAPI.saveSettings(settings);
          console.log('💾 設定を保存しました');
        }
      }
      
      // 保存完了の通知を表示してから遷移
      console.log('💾 保存完了 - プロジェクト一覧に遷移');
      hideDialog();
      showNotification('保存されました', 'success');
      onNavigate();
      
    } catch (error) {
      console.error('❌ 保存処理中にエラー:', error);
      
      // エラーの種類に応じて処理（優先度順：画像容量系 → ストレージクォータ系 → その他）
      if (error.type === ERROR_TYPES.WARNING || error.type === ERROR_TYPES.IMAGE_CAPACITY) {
        // 警告レベル（画像圧縮や画像なしで保存成功）
        console.log('⚠️ 警告付きで保存完了 - プロジェクト一覧に遷移');
        hideDialog();
        onNavigate();
      } else {
        // 完全な失敗 - ダイアログを閉じてエラーを表示
        hideDialog();
        alert(`保存に失敗しました:\n${error.message}`);
      }
    }
  });

  // ダイアログを非表示にする関数
  function hideDialog() {
    dialog.classList.remove('show');
    setTimeout(() => {
      if (dialog.parentNode) {
        dialog.parentNode.removeChild(dialog);
      }
    }, 300);
  }

  // Escキーで閉じる
  const handleEscKey = (e) => {
    if (e.key === 'Escape') {
      hideDialog();
      document.removeEventListener('keydown', handleEscKey);
    }
  };
  document.addEventListener('keydown', handleEscKey);

  // オーバーレイクリックで閉じる
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      hideDialog();
    }
  });
}

// 画像データのみの容量を計算する関数
function calculateImageDataSize(settingsObject = null) {
  let totalImageSize = 0;
  
  try {
    if (settingsObject) {
      // 設定オブジェクトから画像データサイズを計算
      const imagePaths = [
        settingsObject.startScreen?.thumbnail,
        settingsObject.startScreen?.logo,
        settingsObject.loadingScreen?.logo,
        settingsObject.guideScreen?.surfaceDetection?.guideImage,
        settingsObject.guideScreen?.worldTracking?.guideImage
      ];
      
      imagePaths.forEach(imageSrc => {
        if (imageSrc && typeof imageSrc === 'string' && imageSrc.startsWith('data:')) {
          const base64Data = imageSrc.split(',')[1];
          if (base64Data) {
            // Base64から元のバイナリサイズに変換（パディング考慮）
            const originalSize = CAPACITY_UTILS.calculateBinarySize(base64Data);
            totalImageSize += originalSize;
          }
        }
      });
    } else {
      // DOMから画像データサイズを計算（従来の方法）
      const imageElements = [
        { id: 'thumbnailDropzone' },
        { id: 'startLogoDropzone' },
        { id: 'loadingLogoDropzone' },
        { id: 'surfaceGuideImageDropzone' },
        { id: 'worldGuideImageDropzone' }
      ];
      
      imageElements.forEach(({ id }) => {
        const dropzone = document.getElementById(id);
        const img = dropzone?.querySelector('img');
        if (img && img.src && img.src.startsWith('data:')) {
          // data:image/jpeg;base64, の部分を除いてBase64データのサイズを計算
          const base64Data = img.src.split(',')[1];
          if (base64Data && base64Data.length > 0) {
            // Base64から元のバイナリサイズに変換（パディング考慮）
            const originalSize = CAPACITY_UTILS.calculateBinarySize(base64Data);
            totalImageSize += originalSize;
            console.log(`📊 画像データサイズ (${id}):`, {
              base64SizeKB: (base64Data.length / 1024).toFixed(2) + 'KB',
              originalSizeKB: (originalSize / 1024).toFixed(2) + 'KB',
              originalSizeMB: (originalSize / 1024 / 1024).toFixed(2) + 'MB'
            });
          }
        }
      });
    }
    
  } catch (error) {
    console.warn('画像データサイズ計算中にエラー:', error);
  }
  
  console.log('📊 DOM合計画像データサイズ:', {
    totalKB: (totalImageSize / 1024).toFixed(2) + 'KB',
    totalMB: (totalImageSize / 1024 / 1024).toFixed(2) + 'MB'
  });
  
  return Math.round(totalImageSize);
}

// ストレージ使用量表示を更新する関数
export function updateStorageUsageDisplay() {
  try {
    // DOMから現在の設定を取得して画像データサイズを正確に計算
    const currentSettings = getCurrentSettingsFromDOM();
    console.log('📊 ストレージ使用量計算用の設定データ:', {
      startScreen: {
        thumbnail: currentSettings.startScreen?.thumbnail ? 'あり' : 'なし',
        logo: currentSettings.startScreen?.logo ? 'あり' : 'なし'
      },
      loadingScreen: {
        logo: currentSettings.loadingScreen?.logo ? 'あり' : 'なし'
      },
      guideScreen: {
        surfaceGuideImage: currentSettings.guideScreen?.surfaceDetection?.guideImage ? 'あり' : 'なし',
        worldGuideImage: currentSettings.guideScreen?.worldTracking?.guideImage ? 'あり' : 'なし'
      }
    });
    
    const imageDataSize = calculateImageDataSize(currentSettings);
    const maxSize = TOTAL_IMAGES_MAX_BYTES; // 全画像の合計制限
    
    const usageInfo = {
      total: imageDataSize,
      totalKB: (imageDataSize / 1024).toFixed(2),
      totalMB: (imageDataSize / 1024 / 1024).toFixed(2),
      maxSize,
      maxSizeMB: TOTAL_IMAGES_MAX_MB.toFixed(2), // 小数点2桁で統一
      usagePercentage: ((imageDataSize / maxSize) * 100).toFixed(1),
      isNearLimit: (imageDataSize / maxSize) > 0.8,
      isOverLimit: imageDataSize > maxSize
    };
    
    const fillElement = document.getElementById('storage-usage-fill');
    const textElement = document.getElementById('storage-usage-text');
    
    if (!fillElement || !textElement) {
      console.warn('ストレージ使用量表示要素が見つかりません');
      return;
    }
    
    // プログレスバーの幅を設定
    fillElement.style.width = `${Math.min(usageInfo.usagePercentage, 100)}%`;
    
    // 使用量に応じてスタイルクラスを設定
    fillElement.classList.remove('warning', 'danger');
    textElement.classList.remove('warning', 'danger');
    
    if (usageInfo.isOverLimit) {
      fillElement.classList.add('danger');
      textElement.classList.add('danger');
    } else if (usageInfo.isNearLimit) {
      fillElement.classList.add('warning');
      textElement.classList.add('warning');
    }
    
    // テキストを更新（MB表記で統一）
    if (usageInfo.total === 0) {
      textElement.textContent = `画像: 0.00MB / ${usageInfo.maxSizeMB}MB（全画像合計・圧縮済み）`;
    } else {
      textElement.textContent = `画像: ${usageInfo.totalMB}MB / ${usageInfo.maxSizeMB}MB（全画像合計・圧縮済み） (${usageInfo.usagePercentage}%)`;
    }
    
    console.log('📊 画像データ使用量を更新:', {
      usage: usageInfo.totalKB + 'KB',
      percentage: usageInfo.usagePercentage + '%',
      isWarning: usageInfo.isNearLimit,
      isDanger: usageInfo.isOverLimit
    });
    
  } catch (error) {
    console.error('ストレージ使用量表示の更新に失敗:', error);
  }
}

// 初期化時にストレージ使用量表示をセットアップ
export function setupStorageUsageDisplay() {
  // 初回表示
  setTimeout(() => {
    updateStorageUsageDisplay();
  }, 500);
  
  // 定期的に更新（5秒間隔）
  setInterval(updateStorageUsageDisplay, 5000);
}

// グローバルスコープで removeFile 関数を利用可能にする
window.removeFile = removeFile;

/**
 * DOM要素をデフォルト状態にリセット
 */
function resetDOMElements() {
  try {
    console.log('🧹 DOM要素リセット開始');
    
    // すべての入力要素をデフォルト値にリセット
    const inputs = document.querySelectorAll('.loading-screen-editor__input, .loading-screen-editor__slider, .loading-screen-editor__color-picker');
    inputs.forEach(input => {
      const id = input.id;
      if (!id) return;
      
      const [screenType, property] = id.split('-');
      if (defaultSettings[screenType] && defaultSettings[screenType][property] !== undefined) {
        const defaultValue = defaultSettings[screenType][property];
        
        if (input.type === 'range') {
          input.value = defaultValue;
          // スライダーの値表示も更新
          const valueDisplay = input.parentElement?.querySelector('.loading-screen-editor__value-display');
          if (valueDisplay) {
            const unit = input.id.includes('Position') ? '%' : 'x';
            valueDisplay.textContent = defaultValue + unit;
          }
        } else if (input.type === 'color') {
          input.value = defaultValue;
          // カラーテキスト入力も更新
          const textInput = document.getElementById(`${id}Text`);
          if (textInput) {
            textInput.value = defaultValue;
          }
        } else {
          input.value = defaultValue;
        }
        
      }
    });
    
    // ロゴタイプラジオボタンをリセット
    const logoTypeRadio = document.querySelector('input[name="loadingLogoType"][value="none"]');
    if (logoTypeRadio) {
      logoTypeRadio.checked = true;
      
      // UI表示の更新
      const customLogoSection = document.getElementById('loading-custom-logo-section');
      const logoControls = document.getElementById('loading-logo-controls');
      const logoSizeControls = document.getElementById('loading-logo-size-controls');
      
      if (customLogoSection) {
        customLogoSection.style.display = 'none';
      }
      if (logoControls) {
        logoControls.style.display = 'none';
      }
      if (logoSizeControls) {
        logoSizeControls.style.display = 'none';
      }
    }
    
    // 画像アップロードエリアをリセット
    const dropzones = [
      'thumbnailDropzone',
      'startLogoDropzone', 
      'loadingLogoDropzone',
      'surfaceGuideImageDropzone',
      'worldGuideImageDropzone'
    ];
    
    dropzones.forEach(dropzoneId => {
      const dropzone = document.getElementById(dropzoneId);
      if (dropzone) {
        // デフォルトのドロップゾーンHTMLに戻す（各ドロップゾーンに適したテキストで）
        let defaultHTML;
        
        if (dropzoneId === 'startLogoDropzone') {
          defaultHTML = `
            <input type="file" class="loading-screen-editor__file-input" accept="${ACCEPT_ATTRIBUTES.startLogo}" style="display: none;">
            <div class="loading-screen-editor__drop-zone">
              <div class="loading-screen-editor__drop-zone-icon">🖼️</div>
              <div class="loading-screen-editor__drop-zone-text">ロゴ画像をドロップ</div>
              <div class="loading-screen-editor__drop-zone-subtext">またはクリックして選択</div>
              <div class="loading-screen-editor__supported-formats">
${IMAGE_FORMAT_LABELS.default}
              </div>
            </div>
            <button class="loading-screen-editor__remove-button" style="display: none;">✕</button>
          `;
        } else if (dropzoneId === 'loadingLogoDropzone') {
          defaultHTML = `
            <input type="file" class="loading-screen-editor__file-input" accept="${ACCEPT_ATTRIBUTES.otherImages}" style="display: none;">
            <div class="loading-screen-editor__drop-zone">
              <div class="loading-screen-editor__drop-zone-icon">🖼️</div>
              <div class="loading-screen-editor__drop-zone-text">ロゴをドロップ</div>
              <div class="loading-screen-editor__drop-zone-subtext">またはクリックして選択</div>
              <div class="loading-screen-editor__supported-formats">
${IMAGE_FORMAT_LABELS.logo}
              </div>
            </div>
            <button class="loading-screen-editor__remove-button" style="display: none;">✕</button>
          `;
        } else if (dropzoneId === 'surfaceGuideImageDropzone') {
          defaultHTML = `
            <input type="file" class="loading-screen-editor__file-input" accept="${ACCEPT_ATTRIBUTES.otherImages}" style="display: none;">
            <div class="loading-screen-editor__drop-zone">
              <div class="loading-screen-editor__drop-zone-icon">📁</div>
              <div class="loading-screen-editor__drop-zone-text">マーカー画像をドロップ</div>
              <div class="loading-screen-editor__drop-zone-subtext">またはクリックして選択</div>
              <div class="loading-screen-editor__supported-formats">
${IMAGE_FORMAT_LABELS.default}
              </div>
            </div>
            <button class="loading-screen-editor__remove-button" style="display: none;">✕</button>
          `;
        } else if (dropzoneId === 'worldGuideImageDropzone') {
          defaultHTML = `
            <input type="file" class="loading-screen-editor__file-input" accept="${ACCEPT_ATTRIBUTES.otherImages}" style="display: none;">
            <div class="loading-screen-editor__drop-zone">
              <div class="loading-screen-editor__drop-zone-icon">📁</div>
              <div class="loading-screen-editor__drop-zone-text">ガイド画像をドロップ</div>
              <div class="loading-screen-editor__drop-zone-subtext">またはクリックして選択</div>
              <div class="loading-screen-editor__supported-formats">
${IMAGE_FORMAT_LABELS.default}
              </div>
            </div>
            <button class="loading-screen-editor__remove-button" style="display: none;">✕</button>
          `;
        } else {
          // thumbnailDropzone やその他の場合のデフォルト
          defaultHTML = `
            <input type="file" class="loading-screen-editor__file-input" accept="${ACCEPT_ATTRIBUTES.otherImages}" style="display: none;">
            <div class="loading-screen-editor__drop-zone">
              <div class="loading-screen-editor__drop-zone-icon">🖼️</div>
              <div class="loading-screen-editor__drop-zone-text">画像をドラッグ&ドロップ</div>
              <div class="loading-screen-editor__drop-zone-subtext">またはクリックして選択</div>
              <div class="loading-screen-editor__supported-formats">対応形式: PNG, JPG, GIF</div>
            </div>
            <button class="loading-screen-editor__remove-button" style="display: none;">✕</button>
          `;
        }
        
        dropzone.innerHTML = defaultHTML;
      }
    });
    
    // ガイド画面のモード選択をリセット
    const guideModeSelect = document.getElementById('guideScreen-mode');
    if (guideModeSelect) {
      guideModeSelect.value = 'surface';
    }
    
    // ガイド画面の特別な設定をリセット（surfaceDetection, worldTracking）
    // 平面検出設定のリセット
    const surfaceTitle = document.getElementById('guideScreen-surfaceTitle');
    const surfaceDescription = document.getElementById('guideScreen-surfaceDescription');
    const surfaceTextPosition = document.getElementById('guideScreen-surfaceTextPosition');
    const surfaceTextSize = document.getElementById('guideScreen-surfaceTextSize');
    const markerSize = document.getElementById('guideScreen-markerSize');
    
    if (surfaceTitle) {
      surfaceTitle.value = defaultSettings.guideScreen.surfaceDetection.title;
    }
    if (surfaceDescription) {
      surfaceDescription.value = defaultSettings.guideScreen.surfaceDetection.description;
    }
    if (surfaceTextPosition) {
      surfaceTextPosition.value = defaultSettings.guideScreen.surfaceDetection.textPosition;
      const valueDisplay = document.getElementById('guideScreen-surfaceTextPosition-value');
      if (valueDisplay) {
        valueDisplay.textContent = defaultSettings.guideScreen.surfaceDetection.textPosition + '%';
      }
    }
    if (surfaceTextSize) {
      surfaceTextSize.value = defaultSettings.guideScreen.surfaceDetection.textSize;
      const valueDisplay = document.getElementById('guideScreen-surfaceTextSize-value');
      if (valueDisplay) {
        valueDisplay.textContent = defaultSettings.guideScreen.surfaceDetection.textSize + 'x';
      }
    }
    if (markerSize) {
      markerSize.value = defaultSettings.guideScreen.surfaceDetection.markerSize;
      const valueDisplay = document.getElementById('markerSize-value');
      if (valueDisplay) {
        valueDisplay.textContent = defaultSettings.guideScreen.surfaceDetection.markerSize + 'x';
      }
    }
    
    // 空間検出設定のリセット
    const worldTitle = document.getElementById('guideScreen-worldTitle');
    const worldDescription = document.getElementById('guideScreen-worldDescription');
    const worldTextPosition = document.getElementById('guideScreen-worldTextPosition');
    const worldTextSize = document.getElementById('guideScreen-worldTextSize');
    
    if (worldTitle) {
      worldTitle.value = defaultSettings.guideScreen.worldTracking.title;
    }
    if (worldDescription) {
      worldDescription.value = defaultSettings.guideScreen.worldTracking.description;
    }
    if (worldTextPosition) {
      worldTextPosition.value = defaultSettings.guideScreen.worldTracking.textPosition;
      const valueDisplay = document.getElementById('guideScreen-worldTextPosition-value');
      if (valueDisplay) {
        valueDisplay.textContent = defaultSettings.guideScreen.worldTracking.textPosition + '%';
      }
    }
    if (worldTextSize) {
      worldTextSize.value = defaultSettings.guideScreen.worldTracking.textSize;
      const valueDisplay = document.getElementById('guideScreen-worldTextSize-value');
      if (valueDisplay) {
        valueDisplay.textContent = defaultSettings.guideScreen.worldTracking.textSize + 'x';
      }
    }
    
    // フッター位置をリセット
    const surfaceFooterPosition = document.getElementById('guideScreen-surfaceFooterPosition');
    const worldFooterPosition = document.getElementById('guideScreen-worldFooterPosition');
    
    if (surfaceFooterPosition) {
      surfaceFooterPosition.value = defaultSettings.guideScreen.surfaceDetection.footerPosition;
      const valueDisplay = document.getElementById('guideScreen-surfaceFooterPosition-value');
      if (valueDisplay) {
        valueDisplay.textContent = defaultSettings.guideScreen.surfaceDetection.footerPosition + '%';
      }
    }
    if (worldFooterPosition) {
      worldFooterPosition.value = defaultSettings.guideScreen.worldTracking.footerPosition;
      const valueDisplay = document.getElementById('guideScreen-worldFooterPosition-value');
      if (valueDisplay) {
        valueDisplay.textContent = defaultSettings.guideScreen.worldTracking.footerPosition + '%';
      }
    }
    
    console.log('🧹 DOM要素リセット完了');
    
    // ファイルドロップゾーンのイベントリスナーを再設定
    setTimeout(() => {
      setupFileDropzones();
      console.log('🔄 ファイルドロップゾーンのイベントリスナーを再設定');
    }, 50);
    
    // プレビューを更新
    setTimeout(() => {
      const currentScreenType = getCurrentActiveScreenType();
      updatePreview(currentScreenType);
      console.log('🔄 リセット後のプレビューを更新');
    }, 100);
    
  } catch (error) {
    console.error('❌ DOM要素リセット中にエラー:', error);
    throw error;
  }
}

/**
 * ローディング画面の一般設定をリセット
 */
function resetLoadingGeneralSettings() {
  try {
    console.log('🧹 ローディング画面一般設定リセット開始');
    
    // 背景色をリセット
    const backgroundColorPicker = document.getElementById('loadingScreen-backgroundColor');
    const backgroundColorText = document.getElementById('loadingScreen-backgroundColorText');
    if (backgroundColorPicker) {
      backgroundColorPicker.value = defaultSettings.loadingScreen.backgroundColor;
    }
    if (backgroundColorText) {
      backgroundColorText.value = defaultSettings.loadingScreen.backgroundColor;
    }
    
    // テキスト色をリセット
    const textColorPicker = document.getElementById('loadingScreen-textColor');
    const textColorText = document.getElementById('loadingScreen-textColorText');
    if (textColorPicker) {
      textColorPicker.value = defaultSettings.loadingScreen.textColor;
    }
    if (textColorText) {
      textColorText.value = defaultSettings.loadingScreen.textColor;
    }
    
    // アクセントカラー（進捗バー色）をリセット
    const accentColorPicker = document.getElementById('loadingScreen-accentColor');
    const accentColorText = document.getElementById('loadingScreen-accentColorText');
    if (accentColorPicker) {
      accentColorPicker.value = defaultSettings.loadingScreen.accentColor;
    }
    if (accentColorText) {
      accentColorText.value = defaultSettings.loadingScreen.accentColor;
    }
    
    // ロゴタイプをリセット
    const logoTypeRadio = document.querySelector('input[name="loadingLogoType"][value="none"]');
    if (logoTypeRadio) {
      logoTypeRadio.checked = true;
      
      // UI表示の更新
      const customLogoSection = document.getElementById('loading-custom-logo-section');
      const logoControls = document.getElementById('loading-logo-controls');
      const logoSizeControls = document.getElementById('loading-logo-size-controls');
      
      if (customLogoSection) {
        customLogoSection.style.display = 'none';
      }
      if (logoControls) {
        logoControls.style.display = 'none';
      }
      if (logoSizeControls) {
        logoSizeControls.style.display = 'none';
      }
    }
    
    // ロゴ位置とサイズをリセット
    const logoPositionSlider = document.getElementById('loadingScreen-logoPosition');
    if (logoPositionSlider) {
      logoPositionSlider.value = defaultSettings.loadingScreen.logoPosition;
      const valueDisplay = document.getElementById('loadingScreen-logoPosition-value');
      if (valueDisplay) {
        valueDisplay.textContent = defaultSettings.loadingScreen.logoPosition + '%';
      }
    }
    
    const logoSizeSlider = document.getElementById('loadingScreen-logoSize');
    if (logoSizeSlider) {
      logoSizeSlider.value = defaultSettings.loadingScreen.logoSize;
      const valueDisplay = document.getElementById('loadingScreen-logoSize-value');
      if (valueDisplay) {
        valueDisplay.textContent = defaultSettings.loadingScreen.logoSize + 'x';
      }
    }
    
    // ローディング画面のカスタムロゴを削除
    const loadingLogoDropzone = document.getElementById('loadingLogoDropzone');
    if (loadingLogoDropzone) {
      loadingLogoDropzone.innerHTML = `
        <input type="file" class="loading-screen-editor__file-input" accept="${ACCEPT_ATTRIBUTES.otherImages}" style="display: none;">
        <div class="loading-screen-editor__drop-zone">
          <div class="loading-screen-editor__drop-zone-icon">🖼️</div>
          <div class="loading-screen-editor__drop-zone-text">ロゴをドロップ</div>
          <div class="loading-screen-editor__drop-zone-subtext">またはクリックして選択</div>
          <div class="loading-screen-editor__supported-formats">
${IMAGE_FORMAT_LABELS.logo}
          </div>
        </div>
        <button class="loading-screen-editor__remove-button" style="display: none;">✕</button>
      `;
    }
    
    console.log('🧹 ローディング画面一般設定リセット完了');
    
    // ファイルドロップゾーンのイベントリスナーを再設定
    setTimeout(() => {
      setupFileDropzones();
    }, 50);
    
    // プレビューを更新
    setTimeout(() => {
      updatePreview('loadingScreen');
    }, 100);
    
  } catch (error) {
    console.error('❌ ローディング画面一般設定リセット中にエラー:', error);
    throw error;
  }
}

/**
 * ローディング画面のテキスト設定をリセット
 */
function resetLoadingTextSettings() {
  try {
    console.log('🧹 ローディング画面テキスト設定リセット開始');
    
    // ブランド名をリセット
    const brandNameInput = document.getElementById('loadingScreen-brandName');
    if (brandNameInput) {
      brandNameInput.value = defaultSettings.loadingScreen.brandName;
    }
    
    // サブタイトルをリセット
    const subTitleInput = document.getElementById('loadingScreen-subTitle');
    if (subTitleInput) {
      subTitleInput.value = defaultSettings.loadingScreen.subTitle;
    }
    
    // ローディングメッセージをリセット
    const loadingMessageInput = document.getElementById('loadingScreen-loadingMessage');
    if (loadingMessageInput) {
      loadingMessageInput.value = defaultSettings.loadingScreen.loadingMessage;
    }
    
    // フォントスケールをリセット
    const fontScaleSlider = document.getElementById('loadingScreen-fontScale');
    if (fontScaleSlider) {
      fontScaleSlider.value = defaultSettings.loadingScreen.fontScale;
      const valueDisplay = document.getElementById('fontScale-value');
      if (valueDisplay) {
        valueDisplay.textContent = defaultSettings.loadingScreen.fontScale + 'x';
      }
    }

    // テキスト位置（上から）をリセット
    const textPositionSlider = document.getElementById('loadingScreen-textPosition');
    if (textPositionSlider) {
      textPositionSlider.value = defaultSettings.loadingScreen.textPosition;
      const valueDisplay = document.getElementById('loadingScreen-textPosition-value');
      if (valueDisplay) {
        valueDisplay.textContent = defaultSettings.loadingScreen.textPosition + '%';
      }
    }
    
    console.log('🧹 ローディング画面テキスト設定リセット完了');
    
    // プレビューを更新
    setTimeout(() => {
      updatePreview('loadingScreen');
    }, 100);
    
  } catch (error) {
    console.error('❌ ローディング画面テキスト設定リセット中にエラー:', error);
    throw error;
  }
}

/**
 * エクスポート/インポートボタンのイベントハンドラーを設定
 */
export function setupImportExportHandlers() {
  try {
    console.log('🔄 エクスポート/インポートハンドラーを設定中...');
    
    // エクスポートボタンのイベントリスナー
    const exportButton = document.getElementById('export-settings-button');
    if (exportButton) {
      exportButton.addEventListener('click', async () => {
        try {
          console.log('📤 エクスポートボタンがクリックされました');
          
          // 現在の設定を取得
          const currentSettings = getCurrentSettingsFromDOM();
          console.log('📋 エクスポート対象の設定:', currentSettings);
          
          // エクスポート実行
          importExportAPI.exportSettings(currentSettings);
          
          // 成功メッセージ（簡潔に）
          console.log('✅ エクスポートが完了しました');
          
        } catch (error) {
          console.error('❌ エクスポートエラー:', error);
          alert(`エクスポートに失敗しました: ${error.message}`);
        }
      });
      console.log('✅ エクスポートボタンのイベントリスナーを設定');
    } else {
      console.warn('⚠️ エクスポートボタンが見つかりません');
    }
    
    // インポートボタンのイベントリスナー
    const importButton = document.getElementById('import-settings-button');
    const importInput = document.getElementById('import-settings-input');
    
    if (importButton && importInput) {
      // インポートボタンをクリックした時にファイル選択を開く
      importButton.addEventListener('click', () => {
        console.log('📥 インポートボタンがクリックされました');
        importInput.click();
      });
      
      // ファイルが選択された時の処理
      importInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) {
          console.log('ℹ️ ファイルが選択されていません');
          return;
        }
        
        try {
          console.log('📥 インポート処理を開始:', file.name);
          
          // ファイルを読み込み
          const importResult = await importExportAPI.importSettings(file);
          console.log('📋 インポートしたデータ:', importResult);
          
          // 確認ダイアログ
          const confirmMessage = `以下の設定をインポートしますか？\n\n` +
            `ファイル: ${file.name}\n` +
            `エクスポート日時: ${importResult.metadata.exportedAt ? new Date(importResult.metadata.exportedAt).toLocaleString() : '不明'}\n` +
            `バージョン: ${importResult.metadata.version || '不明'}\n\n` +
            `※現在の設定は上書きされます`;
          
          if (!confirm(confirmMessage)) {
            console.log('ℹ️ ユーザーがインポートをキャンセルしました');
            // input値をクリア
            importInput.value = '';
            return;
          }
          
          // 設定を適用
          await importExportAPI.applyImportedSettings(importResult);
          
          // 成功メッセージ
          alert('設定をインポートしました。ページをリロードして設定を反映します。');
          
          // UIに反映（ページをリロードして確実に反映）
          console.log('🔄 設定を反映するためページをリロードします');
          window.location.reload();
          
        } catch (error) {
          console.error('❌ インポートエラー:', error);
          alert(`インポートに失敗しました: ${error.message}`);
        } finally {
          // input値をクリア
          importInput.value = '';
        }
      });
      
      console.log('✅ インポートボタンのイベントリスナーを設定');
    } else {
      console.warn('⚠️ インポートボタンまたは入力要素が見つかりません');
    }
    
    console.log('✅ エクスポート/インポートハンドラー設定完了');
  } catch (error) {
    console.error('❌ エクスポート/インポートハンドラー設定エラー:', error);
  }
} 
