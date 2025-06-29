/**
 * ローディング画面エディタのイベントハンドラー
 */

import { settingsAPI, validateAndFixColor } from './settings.js';
import { updatePreview } from './preview.js';

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
  console.log('タブハンドラーの設定を開始...');
  
  const mainTabs = document.querySelectorAll('.loading-screen-editor__main-tab');
  const mainContents = document.querySelectorAll('.loading-screen-editor__main-content');

  if (mainTabs.length === 0 || mainContents.length === 0) {
    console.error('タブ要素が見つかりません');
    return;
  }

  mainTabs.forEach(tab => {
    tab.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      console.log('メインタブクリック:', tab.dataset.tab);
      
      mainTabs.forEach(t => t.classList.remove('loading-screen-editor__main-tab--active'));
      mainContents.forEach(c => {
        c.classList.remove('loading-screen-editor__main-content--active');
        c.style.display = 'none';
      });

      tab.classList.add('loading-screen-editor__main-tab--active');
      const tabName = tab.dataset.tab;
      
      const mainContent = document.querySelector(`.loading-screen-editor__main-content[data-tab="${tabName}"]`);
      if (mainContent) {
        mainContent.style.display = 'block';
        setTimeout(() => {
          mainContent.classList.add('loading-screen-editor__main-content--active');
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
      
      console.log('サブタブクリック:', tab.dataset.subtab);
      
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
    console.log('ガイドモード変更:', selectedMode);
    
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
      
      const orientation = button.dataset.orientation;
      console.log('向き変更:', orientation);
      
      orientationButtons.forEach(b => b.classList.remove('loading-screen-editor__orientation-button--active'));
      button.classList.add('loading-screen-editor__orientation-button--active');
      
      if (orientation === 'landscape') {
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
}

// ファイルドロップゾーンの設定
export function setupFileDropzones() {
  const dropzones = document.querySelectorAll('.loading-screen-editor__file-preview');
  
  dropzones.forEach(dropzone => {
    const fileInput = dropzone.querySelector('.loading-screen-editor__file-input');
    const removeButton = dropzone.querySelector('.loading-screen-editor__remove-button');
    
    if (!fileInput) return;

    // クリックでファイル選択
    dropzone.addEventListener('click', () => {
      fileInput.click();
    });

    // ファイル選択時の処理
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileSelection(e.target.files[0], dropzone, removeButton);
      }
    });

    // ドラッグ&ドロップの処理
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    dropzone.addEventListener('dragenter', () => {
      dropzone.classList.add('drag-active');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-active');
    });

    dropzone.addEventListener('drop', (e) => {
      dropzone.classList.remove('drag-active');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelection(files[0], dropzone, removeButton);
      }
    });

    // 削除ボタンの処理
    if (removeButton) {
      removeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFile(dropzone, removeButton);
      });
    }
  });
}

// ファイル選択処理
function handleFileSelection(file, dropzone, removeButton) {
  // ファイルタイプの検証
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    showLogoError('サポートされていないファイル形式です', 'JPG, PNG, GIF, WebP形式のファイルを選択してください');
    return;
  }

  // ファイルサイズの検証
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    showLogoError('ファイルサイズが大きすぎます', '2MB以下のファイルを選択してください');
    return;
  }

  // プレビュー表示
  const reader = new FileReader();
  reader.onload = (e) => {
    const dropZone = dropzone.querySelector('.loading-screen-editor__drop-zone');
    const imgElement = document.createElement('img');
    imgElement.src = e.target.result;
    imgElement.alt = 'プレビュー';
    imgElement.style.cssText = 'max-width: 100%; max-height: 100px; object-fit: contain;';
    
    // 画像が読み込まれた後にプレビューを更新
    imgElement.onload = () => {
      const currentScreenType = getCurrentActiveScreenType();
      updatePreview(currentScreenType);
    };
    
    dropZone.innerHTML = `
      <div class="loading-screen-editor__file-name">${file.name}</div>
    `;
    dropZone.insertBefore(imgElement, dropZone.firstChild);
    
    if (removeButton) {
      removeButton.style.display = 'block';
    }
    
    // 初回のプレビュー更新（画像読み込み前）
    const currentScreenType = getCurrentActiveScreenType();
    updatePreview(currentScreenType);
  };
  
  reader.readAsDataURL(file);
}

// ファイル削除処理
function removeFile(dropzone, removeButton) {
  const dropZone = dropzone.querySelector('.loading-screen-editor__drop-zone');
  const id = dropzone.id;
  
  let defaultText = 'ファイルをドロップ';
  let icon = '📁';
  let formats = 'JPG, PNG, WebP (最大2MB)';
  
  if (id === 'thumbnailDropzone') {
    defaultText = 'サムネイル画像をドロップ';
  } else if (id === 'startLogoDropzone') {
    defaultText = 'ロゴ画像をドロップ';
    icon = '🖼️';
    formats = 'PNG, JPG, GIF, WebP (最大2MB)';
  } else if (id === 'loadingLogoDropzone') {
    defaultText = 'ロゴをドロップ';
    icon = '🖼️';
    formats = 'PNG, JPG, WebP (最大2MB、透過PNG推奨)';
  } else if (id === 'guideImageDropzone' || id === 'surfaceGuideImageDropzone' || id === 'worldGuideImageDropzone') {
    defaultText = 'ガイド画像をドロップ';
  }
  
  dropZone.innerHTML = `
    <div class="loading-screen-editor__drop-zone-icon">${icon}</div>
    <div class="loading-screen-editor__drop-zone-text">${defaultText}</div>
    <div class="loading-screen-editor__drop-zone-subtext">またはクリックして選択</div>
    <div class="loading-screen-editor__supported-formats">
      ${formats}
    </div>
  `;
  
  if (removeButton) {
    removeButton.style.display = 'none';
  }
  
  const currentScreenType = getCurrentActiveScreenType();
  updatePreview(currentScreenType);
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
      
      // プレビューを更新
      const currentScreenType = getCurrentActiveScreenType();
      updatePreview(currentScreenType);
    });
  });
}

// ボタンの設定
export function setupButtons() {
  // 保存ボタン
  const saveButton = document.getElementById('save-settings');
  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      try {
        const settings = getCurrentSettings();
        await settingsAPI.saveSettings(settings);
        console.log('設定を保存しました');
        // 成功メッセージを表示（必要に応じて）
      } catch (error) {
        console.error('設定の保存に失敗しました:', error);
      }
    });
  }

  // リセットボタン
  const resetButtons = document.querySelectorAll('[id*="reset"]');
  resetButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (confirm('設定をリセットしますか？')) {
        settingsAPI.resetSettings();
        location.reload(); // ページをリロードして初期状態に戻す
      }
    });
  });
}

// 現在の設定を取得
function getCurrentSettings() {
  const settings = {
    startScreen: {},
    loadingScreen: {},
    guideScreen: {}
  };

  // すべての入力要素から値を取得
  const inputs = document.querySelectorAll('.loading-screen-editor__input, .loading-screen-editor__slider, .loading-screen-editor__color-picker');
  
  inputs.forEach(input => {
    const id = input.id;
    if (!id) return;

    const [screenType, property] = id.split('-');
    if (settings[screenType] && property) {
      let value = input.value;
      
      // 数値の場合は変換
      if (input.type === 'range') {
        value = parseFloat(value);
      }
      
      settings[screenType][property] = value;
    }
  });

  // ロゴタイプラジオボタンの値を取得
  const logoTypeRadio = document.querySelector('input[name="loadingLogoType"]:checked');
  if (logoTypeRadio) {
    settings.loadingScreen.logoType = logoTypeRadio.value;
  }

  return settings;
} 