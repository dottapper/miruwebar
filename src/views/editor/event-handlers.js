// src/views/editor/event-handlers.js - イベントハンドラー関連

import { resetAllUI, updateEditButtonState } from './ui-handlers.js';
import { getLoadingScreenTemplate } from '../../components/loading-screen-selector.js';

// DEBUG ログ制御
const IS_DEBUG = (typeof window !== 'undefined' && !!window.DEBUG);
const dlog = (...args) => { if (IS_DEBUG) console.log(...args); };

/**
 * タブ切り替え機能の設定
 */
export function setupTabSwitching() {
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

/**
 * スライダーとコントロールの設定
 */
export function setupSliderControls(arViewer) {
  // スケールスライダー
  const scaleSlider = document.getElementById('scale-slider');
  const scaleValue = document.getElementById('scale-value');
  if (scaleSlider && scaleValue) {
    scaleSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      scaleValue.textContent = value.toFixed(1);
      if (arViewer && arViewer.model) {
        arViewer.model.scale.setScalar(value);
      }
      // 変更を記録
      if (window.markAsChanged) window.markAsChanged();
    });
  }

  // 回転スライダー
  const rotationSlider = document.getElementById('rotation-slider');
  const rotationValue = document.getElementById('rotation-value');
  if (rotationSlider && rotationValue) {
    rotationSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      rotationValue.textContent = `${value}°`;
      if (arViewer && arViewer.model) {
        arViewer.model.rotation.y = value * Math.PI / 180;
      }
    });
  }

  // 位置制御スライダー
  const positionControls = [
    { id: 'position-x', valueId: 'position-x-value', axis: 'x' },
    { id: 'position-y', valueId: 'position-y-value', axis: 'y' },
    { id: 'position-z', valueId: 'position-z-value', axis: 'z' }
  ];

  positionControls.forEach(({ id, valueId, axis }) => {
    const slider = document.getElementById(id);
    const valueDisplay = document.getElementById(valueId);
    if (slider && valueDisplay) {
      slider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        valueDisplay.textContent = value.toFixed(1);
        if (arViewer && arViewer.model) {
          arViewer.model.position[axis] = value;
        }
      });
    }
  });

  // ARスケールスライダー
  const arScaleSlider = document.getElementById('ar-scale');
  const arScaleValue = document.getElementById('ar-scale-value');
  if (arScaleSlider && arScaleValue) {
    arScaleSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      arScaleValue.textContent = value.toFixed(1);
      // AR specific scaling logic would go here
    });
  }
}

/**
 * ボタン機能の設定
 */
export function setupButtonControls(arViewer) {
  // すべてリセットボタン
  const resetAllButton = document.getElementById('reset-all-button');
  if (resetAllButton) {
    resetAllButton.addEventListener('click', () => {
      resetAllUI();
      if (arViewer && arViewer.model) {
        arViewer.model.position.set(0, 0, 0);
        arViewer.model.rotation.set(0, 0, 0);
        arViewer.model.scale.set(1, 1, 1);
      }
      // スライダー値もリセット
      document.getElementById('scale-slider')?.setAttribute('value', '1');
      document.getElementById('rotation-slider')?.setAttribute('value', '0');
      document.getElementById('position-x')?.setAttribute('value', '0');
      document.getElementById('position-y')?.setAttribute('value', '0');
      document.getElementById('position-z')?.setAttribute('value', '0');
      document.getElementById('ar-scale')?.setAttribute('value', '1');
    });
  }

  // 正面ビューリセットボタン
  const resetFrontViewButton = document.getElementById('reset-front-view-button');
  if (resetFrontViewButton) {
    resetFrontViewButton.addEventListener('click', () => {
      if (arViewer && arViewer.resetView) {
        arViewer.resetView();
      }
    });
  }

  // アニメーション制御ボタン
  const playAnimationButton = document.getElementById('play-animation-button');
  const stopAnimationButton = document.getElementById('stop-animation-button');
  
  if (playAnimationButton) {
    playAnimationButton.addEventListener('click', () => {
      if (arViewer && arViewer.playAnimation) {
        arViewer.playAnimation();
      }
    });
  }

  if (stopAnimationButton) {
    stopAnimationButton.addEventListener('click', () => {
      if (arViewer && arViewer.stopAnimation) {
        arViewer.stopAnimation();
      }
    });
  }

  // Transform操作モードボタン
  const transformButtons = document.querySelectorAll('.transform-mode-btn');
  transformButtons.forEach(button => {
    button.addEventListener('click', () => {
      const mode = button.getAttribute('data-mode');
      
      // すべてのボタンからactiveクラスを削除
      transformButtons.forEach(btn => btn.classList.remove('active'));
      
      // クリックされたボタンにactiveクラスを追加
      button.classList.add('active');
      
      // ARViewer側のTransform制御モードを変更
      if (arViewer && arViewer.setTransformMode) {
        arViewer.setTransformMode(mode);
      }
    });
  });
}

/**
 * ローディング画面関連の設定
 */
export function setupLoadingScreenControls() {
  const loadingScreenSelect = document.getElementById('loading-screen-select');
  const editButton = document.getElementById('edit-loading-screen');
  
  if (loadingScreenSelect) {
    loadingScreenSelect.addEventListener('change', (event) => {
      const selectedValue = event.target.value;
      dlog('🔄 ローディング画面選択変更:', selectedValue);
      updateEditButtonState();
    });
  }

  if (editButton) {
    editButton.addEventListener('click', (e) => {
      e.preventDefault();
      const selectedTemplateId = loadingScreenSelect?.value;
      if (selectedTemplateId && selectedTemplateId !== 'none') {
        dlog('ローディング画面編集ボタンがクリックされました:', selectedTemplateId);
        window.location.hash = `#/loading-screen?template=${selectedTemplateId}`;
      } else {
        alert('編集するローディング画面を選択してください。');
      }
    });
  }
}

/**
 * ローディング画面一覧を読み込む
 */
export async function loadLoadingScreens() {
  try {
    const templates = await getLoadingScreenTemplate();
    const select = document.getElementById('loading-screen-select');
    
    if (select && templates) {
      // 既存のオプション（none以外）をクリア
      const noneOption = select.querySelector('option[value="none"]');
      select.innerHTML = '';
      if (noneOption) select.appendChild(noneOption);
      
      // テンプレートを追加
      templates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('ローディング画面テンプレート読み込みエラー:', error);
  }
}