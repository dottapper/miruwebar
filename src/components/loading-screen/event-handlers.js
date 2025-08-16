/**
 * ローディング画面エディタのイベントハンドラー
 */

import { updatePreview, getCurrentSettingsFromDOM } from './preview.js';
import { createMainEditorTemplate } from './ui-templates.js';
import { settingsAPI, defaultSettings } from './settings.js';
import { 
  getTemplate,
  saveTemplate,
  deleteTemplate,
  getAllTemplates
} from './template-manager.js';
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
    console.warn('タブ要素が見つかりません');
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
  // ファイルタイプの検証
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    showLogoError(
      `❌ サポートされていないファイル形式です\n\nファイル名: ${file.name}\n検出された形式: ${file.type}\n対応形式: JPG, PNG, GIF, WebP`,
      'JPG, PNG, GIF, WebP形式のファイルを選択してください'
    );
    return;
  }

  // ファイルサイズの検証
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    showLogoError(
      `❌ ファイルサイズが大きすぎます\n\nファイル名: ${file.name}\n現在のサイズ: ${fileSizeMB}MB\n最大許可サイズ: 2MB`,
      '2MB以下のファイルを選択してください'
    );
    return;
  }

  // プレビュー表示
  const reader = new FileReader();
  reader.onload = (e) => {
    const dropZone = dropzone.querySelector('.loading-screen-editor__drop-zone');
    
    // dropZoneが存在しない場合のエラーハンドリング
    if (!dropZone) {
      console.error('❌ dropZoneが見つかりません:', dropzone.id);
      showNotification('ファイルアップロードエリアが見つかりません', 'error');
      return;
    }
    
    const imgElement = document.createElement('img');
    imgElement.src = e.target.result;
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
  let formats = 'JPG, PNG, WebP (最大2MB)';
  let acceptTypes = 'image/*';
  
  if (id === 'thumbnailDropzone') {
    defaultText = 'サムネイル画像をドロップ';
    icon = '🖼️';
  } else if (id === 'startLogoDropzone') {
    defaultText = 'ロゴ画像をドロップ';
    icon = '🖼️';
    formats = 'PNG, JPG, GIF, WebP (最大2MB)';
    acceptTypes = 'image/*,.gif';
  } else if (id === 'loadingLogoDropzone') {
    defaultText = 'ロゴをドロップ';
    icon = '🖼️';
    formats = 'PNG, JPG, WebP (最大2MB、透過PNG推奨)';
  } else if (id === 'surfaceGuideImageDropzone') {
    defaultText = 'マーカー画像をドロップ';
  } else if (id === 'worldGuideImageDropzone') {
    defaultText = 'ガイド画像をドロップ';
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
        // TODO: メディア一覧画面への遷移
        console.log('メディア一覧クリック（未実装）');
      });
    }
    
    // 分析メニュー
    const analyticsMenu = document.getElementById('analytics-menu-item');
    if (analyticsMenu) {
      analyticsMenu.addEventListener('click', () => {
        // TODO: 分析画面への遷移
        console.log('分析クリック（未実装）');
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

// テンプレート一覧を読み込み
function loadTemplateList() {
  const templateListContainer = document.getElementById('saved-templates-list');
  if (!templateListContainer) {
    console.warn('テンプレート一覧コンテナが見つかりません');
    return;
  }
  
  try {
    // 保存済みテンプレートを取得
    const templates = getStoredTemplates();
    const currentTemplateId = getCurrentActiveTemplateId();
    
    if (templates.length === 0) {
      templateListContainer.innerHTML = '<div class="no-templates">保存済みテンプレートはありません</div>';
      return;
    }
    
    // テンプレート一覧のHTMLを生成
    const templateListHTML = templates.map(template => `
      <div class="loading-screen-editor__template-item ${template.id === currentTemplateId ? 'loading-screen-editor__template-item--active' : ''}" 
           data-template-id="${template.id}">
        <div class="loading-screen-editor__template-name">${template.name}</div>
        <div class="loading-screen-editor__template-date">${template.createdAt}</div>
      </div>
    `).join('');
    
    templateListContainer.innerHTML = templateListHTML;
    
    // テンプレートアイテムのイベントリスナーを設定
    setupTemplateItemHandlers();
  } catch (error) {
    console.error('テンプレート一覧の読み込みに失敗しました:', error);
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
      // TODO: コンテキストメニュー（複製、削除など）を表示
      console.log('テンプレート右クリック:', templateId);
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
    
    // サムネイル画像
    if (settings.startScreen?.thumbnail) {
      const thumbnailDropzone = document.getElementById('thumbnailDropzone');
      if (thumbnailDropzone) {
        thumbnailDropzone.innerHTML = `
          <img src="${settings.startScreen.thumbnail}" alt="サムネイル" style="max-width: 100%; max-height: 100px;">
          <button class="loading-screen-editor__remove-button" onclick="removeFile(this.parentElement, this)">×</button>
        `;
      }
    }
    
    // スタート画面ロゴ
    if (settings.startScreen?.logo) {
      const startLogoDropzone = document.getElementById('startLogoDropzone');
      if (startLogoDropzone) {
        startLogoDropzone.innerHTML = `
          <img src="${settings.startScreen.logo}" alt="スタート画面ロゴ" style="max-width: 100%; max-height: 100px;">
          <button class="loading-screen-editor__remove-button" onclick="removeFile(this.parentElement, this)">×</button>
        `;
      }
    }
    
    // ローディング画面カスタムロゴ
    if (settings.loadingScreen?.logo) {
      const loadingLogoDropzone = document.getElementById('loadingLogoDropzone');
      if (loadingLogoDropzone) {
        loadingLogoDropzone.innerHTML = `
          <img src="${settings.loadingScreen.logo}" alt="ローディング画面ロゴ" style="max-width: 100%; max-height: 100px;">
          <button class="loading-screen-editor__remove-button" onclick="removeFile(this.parentElement, this)">×</button>
        `;
      }
    }
    
    // ガイド画面画像（平面検出用）
    if (settings.guideScreen?.surfaceDetection?.guideImage) {
      const surfaceGuideDropzone = document.getElementById('surfaceGuideImageDropzone');
      if (surfaceGuideDropzone) {
        surfaceGuideDropzone.innerHTML = `
          <img src="${settings.guideScreen.surfaceDetection.guideImage}" alt="平面検出ガイド画像" style="max-width: 100%; max-height: 100px;">
          <button class="loading-screen-editor__remove-button" onclick="removeFile(this.parentElement, this)">×</button>
        `;
      }
    }
    
    // ガイド画面画像（空間検出用）
    if (settings.guideScreen?.worldTracking?.guideImage) {
      const worldGuideDropzone = document.getElementById('worldGuideImageDropzone');
      if (worldGuideDropzone) {
        worldGuideDropzone.innerHTML = `
          <img src="${settings.guideScreen.worldTracking.guideImage}" alt="空間検出ガイド画像" style="max-width: 100%; max-height: 100px;">
          <button class="loading-screen-editor__remove-button" onclick="removeFile(this.parentElement, this)">×</button>
        `;
      }
    }
    
    console.log('🖼️ 画像データ読み込み処理完了');
    
    // 画像復元後にプレビューを更新
    setTimeout(() => {
      const currentScreenType = getCurrentActiveScreenType();
      updatePreview(currentScreenType);
    }, 100);
    
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

// 新しいテンプレートを作成
function createNewTemplate(templateName) {
  try {
    // 現在の設定を取得
    const currentSettings = getCurrentSettings();
    
    // 新しいテンプレートデータを作成
    const templateData = {
      name: templateName,
      settings: currentSettings
    };
    
    // テンプレートを保存
    const savedTemplate = saveLoadingScreenTemplate(templateData);
    
    // テンプレート一覧を更新
    loadTemplateList();
    
    // 作成したテンプレートを選択
    selectTemplate(savedTemplate.id);
    
    console.log('新しいテンプレートを作成しました:', savedTemplate.name);
    showNotification(`テンプレート「${savedTemplate.name}」を作成しました`, 'success');
  } catch (error) {
    console.error('テンプレート作成に失敗しました:', error);
    showNotification('テンプレートの作成に失敗しました', 'error');
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
          
          const savedTemplate = saveLoadingScreenTemplate(templateData);
          showNotification(`テンプレート「${savedTemplate.name}」を保存しました`, 'success');
          
          // 最後に使用したテンプレートIDを記録
          localStorage.setItem('lastUsedTemplateId', savedTemplate.id);
          
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
              const updatedTemplate = {
                ...template,
                settings: settings,
                updatedAt: new Date().toLocaleDateString('ja-JP')
              };
              
              // 既存のテンプレートを削除して新しいものを保存
              deleteLoadingScreenTemplate(templateId);
              const savedTemplate = saveLoadingScreenTemplate({
                name: template.name,
                settings: settings
              });
              
              showNotification(`テンプレート「${template.name}」を更新しました`, 'success');
              
              // 最後に使用したテンプレートIDを記録
              localStorage.setItem('lastUsedTemplateId', savedTemplate.id);
            } else {
              // テンプレートが見つからない場合は通常保存
              await settingsAPI.saveSettings(settings);
              showNotification('設定を保存しました', 'success');
            }
          } else {
            // 通常の設定保存
            await settingsAPI.saveSettings(settings);
            showNotification('設定を保存しました', 'success');
          }
        }
      } catch (error) {
        console.error('設定の保存に失敗しました:', error);
        
        // 容量制限エラーの場合の特別な処理
        if (error.message.includes('quota') || error.message.includes('容量') || error.message.includes('QuotaExceededError')) {
          showNotification('保存容量が不足しています。古いテンプレートを削除してから保存してください。', 'error');
        } else {
          showNotification(`設定の保存に失敗しました: ${error.message}`, 'error');
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

  // リセットボタン
  const resetButtons = document.querySelectorAll('[id*="reset"]');
  resetButtons.forEach(button => {
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
}

// 未保存の変更があるかチェックする関数
function checkForUnsavedChanges() {
  try {
    // 簡易版：フォーム要素の値をチェック
    const inputs = document.querySelectorAll('.loading-screen-editor__input, .loading-screen-editor__slider');
    
    for (const input of inputs) {
      try {
        if (input.value !== input.defaultValue) {
          return true;
        }
      } catch (inputError) {
        console.warn('入力要素チェック中にエラー:', input.id, inputError);
        // 個別の入力要素でエラーが発生しても継続
      }
    }
    
    return false;
  } catch (error) {
    console.error('未保存変更チェック中にエラー:', error);
    
    // エラー時は安全のため変更ありとみなす
    return false;
  }
}

// 通知を表示する関数
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `loading-screen-editor__notification loading-screen-editor__notification--${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }
  }, 3000);
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
    const stored = localStorage.getItem('loadingScreenTemplates');
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
      // 保存処理を実行
      console.log('💾 設定を保存中...');
      const saveButton = document.getElementById('save-button');
      if (saveButton) {
        saveButton.click(); // 既存の保存ボタンをクリックして保存処理を実行
        
        // 保存完了を待つ
        setTimeout(() => {
          console.log('💾 保存完了 - プロジェクト一覧に遷移');
          hideDialog();
          onNavigate();
        }, 500);
      } else {
        console.warn('⚠️ 保存ボタンが見つかりません');
        hideDialog();
        onNavigate();
      }
    } catch (error) {
      console.error('❌ 保存処理中にエラー:', error);
      hideDialog();
      onNavigate();
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
            <input type="file" class="loading-screen-editor__file-input" accept="image/*,.gif" style="display: none;">
            <div class="loading-screen-editor__drop-zone">
              <div class="loading-screen-editor__drop-zone-icon">🖼️</div>
              <div class="loading-screen-editor__drop-zone-text">ロゴ画像をドロップ</div>
              <div class="loading-screen-editor__drop-zone-subtext">またはクリックして選択</div>
              <div class="loading-screen-editor__supported-formats">
                PNG, JPG, GIF, WebP (最大2MB)
              </div>
            </div>
            <button class="loading-screen-editor__remove-button" style="display: none;">✕</button>
          `;
        } else if (dropzoneId === 'loadingLogoDropzone') {
          defaultHTML = `
            <input type="file" class="loading-screen-editor__file-input" accept="image/*" style="display: none;">
            <div class="loading-screen-editor__drop-zone">
              <div class="loading-screen-editor__drop-zone-icon">🖼️</div>
              <div class="loading-screen-editor__drop-zone-text">ロゴをドロップ</div>
              <div class="loading-screen-editor__drop-zone-subtext">またはクリックして選択</div>
              <div class="loading-screen-editor__supported-formats">
                PNG, JPG, WebP (最大2MB、透過PNG推奨)
              </div>
            </div>
            <button class="loading-screen-editor__remove-button" style="display: none;">✕</button>
          `;
        } else if (dropzoneId === 'surfaceGuideImageDropzone') {
          defaultHTML = `
            <input type="file" class="loading-screen-editor__file-input" accept="image/*" style="display: none;">
            <div class="loading-screen-editor__drop-zone">
              <div class="loading-screen-editor__drop-zone-icon">📁</div>
              <div class="loading-screen-editor__drop-zone-text">マーカー画像をドロップ</div>
              <div class="loading-screen-editor__drop-zone-subtext">またはクリックして選択</div>
              <div class="loading-screen-editor__supported-formats">
                JPG, PNG, WebP (最大2MB)
              </div>
            </div>
            <button class="loading-screen-editor__remove-button" style="display: none;">✕</button>
          `;
        } else if (dropzoneId === 'worldGuideImageDropzone') {
          defaultHTML = `
            <input type="file" class="loading-screen-editor__file-input" accept="image/*" style="display: none;">
            <div class="loading-screen-editor__drop-zone">
              <div class="loading-screen-editor__drop-zone-icon">📁</div>
              <div class="loading-screen-editor__drop-zone-text">ガイド画像をドロップ</div>
              <div class="loading-screen-editor__drop-zone-subtext">またはクリックして選択</div>
              <div class="loading-screen-editor__supported-formats">
                JPG, PNG, WebP (最大2MB)
              </div>
            </div>
            <button class="loading-screen-editor__remove-button" style="display: none;">✕</button>
          `;
        } else {
          // thumbnailDropzone やその他の場合のデフォルト
          defaultHTML = `
            <input type="file" class="loading-screen-editor__file-input" accept="image/*" style="display: none;">
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