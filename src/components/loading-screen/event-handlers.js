/**
 * ローディング画面エディタのイベントハンドラー
 */

import { settingsAPI, validateAndFixColor } from './settings.js';
import { updatePreview } from './preview.js';
import { 
  getAllTemplates, 
  getTemplate, 
  saveTemplate, 
  deleteTemplate, 
  duplicateTemplate,
  generateTemplateListHTML 
} from './template-manager.js';

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
  const mainContents = document.querySelectorAll('.loading-screen-editor__tab-content');

  console.log('タブ要素検索結果:', {
    mainTabs: mainTabs.length,
    mainContents: mainContents.length,
    containerExists: !!document.querySelector('.loading-screen-editor')
  });

  if (mainTabs.length === 0 || mainContents.length === 0) {
    console.error('❌ タブ要素が見つかりません:', {
      mainTabsFound: mainTabs.length,
      mainContentsFound: mainContents.length,
      expectedMainTabs: '.loading-screen-editor__main-tab',
      expectedMainContents: '.loading-screen-editor__tab-content'
    });
    return;
  }

  mainTabs.forEach(tab => {
    tab.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      console.log('メインタブクリック:', tab.dataset.tab);
      
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
          console.log('🖼️ スタート画面ロゴアップロード時にサイズを1.5xに設定');
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
          console.log('🖼️ ローディング画面ロゴアップロード時にサイズを1.5xに設定');
        }
      }
      
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
  console.log('🔄 スタート画面のロゴ設定をローディング画面に引き継ぎます');
  
  // スタート画面のロゴサイズを取得
  const startLogoSizeSlider = document.getElementById('startScreen-logoSize');
  const startLogoPositionSlider = document.getElementById('startScreen-logoPosition');
  
  // ローディング画面のロゴサイズスライダーを取得
  const loadingLogoSizeSlider = document.getElementById('loadingScreen-logoSize');
  const loadingLogoPositionSlider = document.getElementById('loadingScreen-logoPosition');
  
  console.log('📋 要素の存在確認:', {
    startLogoSizeSlider: !!startLogoSizeSlider,
    startLogoPositionSlider: !!startLogoPositionSlider,
    loadingLogoSizeSlider: !!loadingLogoSizeSlider,
    loadingLogoPositionSlider: !!loadingLogoPositionSlider
  });
  
  if (startLogoSizeSlider && loadingLogoSizeSlider) {
    const startSize = parseFloat(startLogoSizeSlider.value);
    console.log('📏 現在のスタート画面ロゴサイズ:', startSize);
    
    // スタート画面のロゴサイズをそのままローディング画面に適用
    // ただし、ローディング画面のスライダー範囲（0.5-2.0）に収まるように調整
    let adjustedSize = startSize;
    
    // スタート画面のロゴサイズをそのまま引き継ぐ
    // ただし、ローディング画面のスライダー範囲（0.5-2.0）に収まるように調整
    adjustedSize = startSize;
    
    // 範囲外の場合は調整
    if (startSize < 0.5) {
      adjustedSize = 0.5;
      console.log('⚠️ スタート画面のロゴサイズが小さすぎるため、0.5xに調整');
    } else if (startSize > 2.0) {
      adjustedSize = 2.0;
      console.log('⚠️ スタート画面のロゴサイズが大きすぎるため、2.0xに調整');
    } else {
      console.log('🔧 スタート画面のロゴサイズをそのまま引き継ぎ:', startSize);
    }
    
    console.log('🔧 調整後のサイズ:', adjustedSize);
    
    loadingLogoSizeSlider.value = adjustedSize;
    console.log('✅ ローディング画面スライダーに設定:', loadingLogoSizeSlider.value);
    
    // 値表示も更新
    const sizeValueDisplay = document.getElementById('loadingScreen-logoSize-value');
    console.log('🏷️ 値表示要素:', sizeValueDisplay);
    if (sizeValueDisplay) {
      sizeValueDisplay.textContent = adjustedSize.toFixed(1) + 'x';
      console.log('📝 値表示を更新:', sizeValueDisplay.textContent);
    } else {
      console.error('❌ 値表示要素が見つかりません: loadingScreen-logoSize-value');
    }
    
    // スライダーのinputイベントを発火させて、他の処理も連鎖実行
    loadingLogoSizeSlider.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('🔄 スライダーのinputイベントを発火');
    
    // プレビューの更新を強制実行
    setTimeout(() => {
      const currentScreenType = getCurrentActiveScreenType();
      updatePreview(currentScreenType);
      console.log('🔄 プレビューを更新しました:', currentScreenType);
    }, 100);
    
    console.log(`スタート画面のロゴサイズ (${startSize}x) をローディング画面に適用 (${adjustedSize}x)`);
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
      console.log('📝 ポジション値表示を更新:', positionValueDisplay.textContent);
    } else {
      console.error('❌ ポジション値表示要素が見つかりません: loadingScreen-logoPosition-value');
    }
    
    // スライダーのinputイベントを発火させて、他の処理も連鎖実行
    loadingLogoPositionSlider.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('🔄 ポジションスライダーのinputイベントを発火');
    
    console.log(`スタート画面のロゴ位置 (${startPosition}%) をローディング画面に適用 (${adjustedPosition}%)`);
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
    
    // ログアウトボタン
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('ログアウトしますか？')) {
          window.location.hash = '#/login';
        }
      });
    }
    
    console.log('サイドバーメニューの設定が完了しました');
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
    const currentTemplateId = getCurrentActiveTemplateId();
    const templateListHTML = generateTemplateListHTML(currentTemplateId);
    templateListContainer.innerHTML = templateListHTML;
    
    // テンプレートアイテムのイベントリスナーを設定
    setupTemplateItemHandlers();
    
    console.log('テンプレート一覧を読み込みました');
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
    const template = getTemplate(templateId);
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
    
    // プレビューを更新
    const currentScreenType = getCurrentActiveScreenType();
    updatePreview(currentScreenType);
    
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
    const newTemplate = {
      name: templateName,
      description: 'カスタムテンプレート',
      settings: currentSettings,
      isDefault: false
    };
    
    // テンプレートを保存
    const savedTemplate = saveTemplate(newTemplate);
    
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
  console.log('ボタンイベントの設定を開始...');
  
  // プロジェクト一覧に戻るボタン
  const backButton = document.getElementById('back-to-projects-button');
  if (backButton) {
    backButton.addEventListener('click', () => {
      // 変更があるかチェック（簡易版）
      const hasChanges = checkForUnsavedChanges();
      
      if (hasChanges) {
        if (confirm('変更内容が失われますが、プロジェクト一覧に戻りますか？')) {
          window.location.hash = '#/projects';
        }
      } else {
        window.location.hash = '#/projects';
      }
    });
    console.log('戻るボタンのイベントリスナーを設定しました');
  } else {
    console.warn('戻るボタンが見つかりません');
  }
  
  // 保存ボタン
  const saveButton = document.getElementById('save-button');
  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      try {
        console.log('設定を保存中...');
        const settings = getCurrentSettings();
        await settingsAPI.saveSettings(settings);
        
        // 保存成功の通知
        showNotification('設定を保存しました', 'success');
        console.log('設定を保存しました');
      } catch (error) {
        console.error('設定の保存に失敗しました:', error);
        showNotification('設定の保存に失敗しました', 'error');
      }
    });
    console.log('保存ボタンのイベントリスナーを設定しました');
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
      if (confirm('設定をリセットしますか？')) {
        settingsAPI.resetSettings();
        location.reload(); // ページをリロードして初期状態に戻す
      }
    });
  });
  console.log(`${resetButtons.length}個のリセットボタンのイベントリスナーを設定しました`);
}

// 未保存の変更があるかチェックする関数
function checkForUnsavedChanges() {
  // 簡易版：フォーム要素の値をチェック
  const inputs = document.querySelectorAll('.loading-screen-editor__input, .loading-screen-editor__slider');
  for (const input of inputs) {
    if (input.value !== input.defaultValue) {
      return true;
    }
  }
  return false;
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