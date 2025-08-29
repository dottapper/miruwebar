/**
 * ローディング画面エディタコンポーネント（リファクタリング済み）
 */

import '../styles/loading-screen-editor.css';
import { defaultSettings, settingsAPI, loadLastUsedTemplateId, syncLastUsedTemplateId } from '../components/loading-screen/settings.js';
import { createMainEditorTemplate } from '../components/loading-screen/ui-templates.js';
import { getLoadingScreenTemplate } from '../components/loading-screen-selector.js';
import { 
  setupTabHandlers, 
  setupColorInputs, 
  setupTextInputs, 
  setupFileDropzones, 
  initializeSliders, 
  setupButtons,
  setupLogoTypeHandlers,
  setupSidebarMenuHandlers,
  setupStorageUsageDisplay
} from '../components/loading-screen/event-handlers.js';
import { updatePreview } from '../components/loading-screen/preview.js';
// DEBUG ログ制御
const IS_DEBUG = (typeof window !== 'undefined' && !!window.DEBUG);
const dlog = (...args) => { if (IS_DEBUG) console.log(...args); };

export default function showLoadingScreenEditor(container) {
  dlog('🚨 showLoadingScreenEditor が呼び出されました', {
    currentHash: window.location.hash,
    timestamp: new Date().toISOString(),
    container: container
  });
  
  dlog('📋 デフォルト設定参照:', defaultSettings);

  // URLパラメータを確認
  const fullHash = window.location.hash;
  const hashParts = fullHash.split('?');
  const queryString = hashParts[1] || '';
  const urlParams = new URLSearchParams(queryString);
  const mode = urlParams.get('mode');
  const templateId = urlParams.get('template');
  const templateName = urlParams.get('name') ? decodeURIComponent(urlParams.get('name')) : null;
  
  dlog('🔍 URL解析詳細:', {
    fullHash: fullHash,
    hashParts: hashParts,
    queryString: queryString,
    urlParams: Array.from(urlParams.entries()),
    mode: mode,
    templateId: templateId,
    templateName: templateName,
    isNewMode: mode === 'new',
    isTemplateMode: !!templateId
  });

  // 現在の設定を保持
  let currentSettings;
  
  // モードに応じて設定を初期化
  if (mode === 'new') {
    // 新規作成モード: デフォルト設定を使用
    currentSettings = JSON.parse(JSON.stringify(defaultSettings));
    dlog('🆕 新規作成モード: デフォルト設定を使用');
    dlog('🆕 使用する設定:', currentSettings);
  } else if (templateId) {
    // テンプレート編集モード: 指定されたテンプレートを読み込み
    const template = getLoadingScreenTemplate(templateId);
    dlog('📄 テンプレート取得結果:', template);
    if (template && template.settings) {
      currentSettings = JSON.parse(JSON.stringify(template.settings));
      dlog('📄 テンプレート編集モード: テンプレートを読み込み', template.name);
      dlog('📄 テンプレート元データ:', template.settings);
      dlog('📄 コピー後の設定:', currentSettings);
      dlog('📄 アニメーション設定確認:', currentSettings.loadingScreen.animation);
      
      // 最後に使用したテンプレートIDを記録（IP間同期機能付き）
      localStorage.setItem('lastUsedTemplateId', templateId);
      syncLastUsedTemplateId(templateId);
      dlog('📄 最後に使用したテンプレートIDを記録:', templateId);
    } else {
      console.warn('⚠️ テンプレートが見つかりません。デフォルト設定を使用:', templateId);
      currentSettings = JSON.parse(JSON.stringify(defaultSettings));
      dlog('⚠️ デフォルト設定使用:', currentSettings);
    }
  } else {
    // 通常モード: 最後に使用したテンプレートまたは保存済み設定を読み込み
    try {
      // 最後に使用したテンプレートIDを確認（IP間同期機能付き）
      const lastTemplateId = loadLastUsedTemplateId();
      if (lastTemplateId) {
        dlog('💾 最後に使用したテンプレートを読み込み:', lastTemplateId);
        const template = getLoadingScreenTemplate(lastTemplateId);
        if (template && template.settings) {
          currentSettings = JSON.parse(JSON.stringify(template.settings));
          dlog('💾 テンプレートからの設定読み込み完了:', template.name);
          dlog('💾 使用する設定:', currentSettings);
        } else {
          // テンプレートが見つからない場合は通常の設定を読み込み
          currentSettings = settingsAPI.getSettings();
          dlog('💾 テンプレートが見つからないため通常設定を読み込み');
        }
      } else {
        // 最後のテンプレートIDがない場合は通常の設定を読み込み
        currentSettings = settingsAPI.getSettings();
        dlog('💾 通常モード: 保存済み設定を読み込み');
        dlog('💾 使用する設定:', currentSettings);
      }
    } catch (error) {
      console.error('設定の読み込みに失敗:', error);
      currentSettings = JSON.parse(JSON.stringify(defaultSettings));
      dlog('💾 エラー時デフォルト設定使用:', currentSettings);
    }
  }
  
  // 初期化時のアニメーション設定調整（無効なslideのみ修正）
  if (currentSettings.loadingScreen.animation === 'slide') {
    currentSettings.loadingScreen.animation = 'none';
    dlog('🔧 無効なスライドアニメーションを「なし」に修正');
  }
  
  // デフォルト値設定（未定義の場合のみ）
  if (!currentSettings.loadingScreen.animation) {
    currentSettings.loadingScreen.animation = 'none';
    dlog('🔧 未定義のアニメーション設定をデフォルト「なし」に設定');
  }
  
  // タイマーIDを保持するための変数
  let verifyLayoutTimeoutId = null;
  
  // 設定をフォームに適用する関数
  function applySettingsToForm(settings) {
    dlog('⚙️ 設定をフォームに適用開始:', settings);
    
    // 各画面タイプの設定を適用
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
            const valueDisplay = document.getElementById(`${inputId}-value`);
            if (valueDisplay) {
              const unit = input.id.includes('Position') ? '%' : 'x';
              valueDisplay.textContent = value + unit;
            }
          } else {
            input.value = value || '';
          }
          
          dlog(`⚙️ ${inputId} = ${value}`);
        }
      });
    });
    
    // ロゴタイプラジオボタンの設定
    if (settings.loadingScreen && settings.loadingScreen.logoType) {
      const logoTypeRadio = document.querySelector(`input[name="loadingLogoType"][value="${settings.loadingScreen.logoType}"]`);
      if (logoTypeRadio) {
        logoTypeRadio.checked = true;
        dlog(`⚙️ logoType = ${settings.loadingScreen.logoType}`);
        
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
    
    // 画像データの復元
    restoreImageData(settings);
    
    dlog('⚙️ 設定のフォーム適用完了');
  }
  
  // 画像データを復元する関数
  function restoreImageData(settings) {
    dlog('🖼️ 画像データ復元開始');
    dlog('🖼️ 復元する設定データ:', settings);
    
    // 少し遅延を入れてDropzone要素の準備を確実にする
    setTimeout(() => {
      // サムネイル画像
      if (settings.startScreen.thumbnail) {
        const thumbnailDropzone = document.getElementById('thumbnailDropzone');
        if (thumbnailDropzone) {
          const dropZone = thumbnailDropzone.querySelector('.loading-screen-editor__drop-zone');
          const removeButton = thumbnailDropzone.querySelector('.loading-screen-editor__remove-button');
          
          if (dropZone) {
            const imgElement = document.createElement('img');
            imgElement.src = settings.startScreen.thumbnail;
            imgElement.alt = 'サムネイル';
            imgElement.style.cssText = 'max-width: 100%; max-height: 100px; object-fit: contain;';
            
            const fileName = 'サムネイル画像';
            dropZone.innerHTML = `<div class="loading-screen-editor__file-name">${fileName}</div>`;
            dropZone.insertBefore(imgElement, dropZone.firstChild);
            
            if (removeButton) {
              removeButton.style.display = 'block';
            }
          }
          dlog('🖼️ サムネイル画像を復元');
        } else {
          console.warn('🖼️ サムネイルDropzoneが見つかりません');
        }
      }
    
      // スタート画面ロゴ
      if (settings.startScreen.logo) {
        const startLogoDropzone = document.getElementById('startLogoDropzone');
        if (startLogoDropzone) {
          const dropZone = startLogoDropzone.querySelector('.loading-screen-editor__drop-zone');
          const removeButton = startLogoDropzone.querySelector('.loading-screen-editor__remove-button');
          
          if (dropZone) {
            const imgElement = document.createElement('img');
            imgElement.src = settings.startScreen.logo;
            imgElement.alt = 'スタート画面ロゴ';
            imgElement.style.cssText = 'max-width: 100%; max-height: 100px; object-fit: contain;';
            
            const fileName = 'スタート画面ロゴ';
            dropZone.innerHTML = `<div class="loading-screen-editor__file-name">${fileName}</div>`;
            dropZone.insertBefore(imgElement, dropZone.firstChild);
            
            if (removeButton) {
              removeButton.style.display = 'block';
            }
          }
          dlog('🖼️ スタート画面ロゴを復元');
        } else {
          console.warn('🖼️ スタート画面ロゴDropzoneが見つかりません');
        }
      }
      
      // ローディング画面カスタムロゴ
      if (settings.loadingScreen.logo) {
        const loadingLogoDropzone = document.getElementById('loadingLogoDropzone');
        if (loadingLogoDropzone) {
          const dropZone = loadingLogoDropzone.querySelector('.loading-screen-editor__drop-zone');
          const removeButton = loadingLogoDropzone.querySelector('.loading-screen-editor__remove-button');
          
          if (dropZone) {
            const imgElement = document.createElement('img');
            imgElement.src = settings.loadingScreen.logo;
            imgElement.alt = 'ローディング画面ロゴ';
            imgElement.style.cssText = 'max-width: 100%; max-height: 100px; object-fit: contain;';
            
            const fileName = 'ローディング画面ロゴ';
            dropZone.innerHTML = `<div class="loading-screen-editor__file-name">${fileName}</div>`;
            dropZone.insertBefore(imgElement, dropZone.firstChild);
            
            if (removeButton) {
              removeButton.style.display = 'block';
            }
          }
          dlog('🖼️ ローディング画面ロゴを復元');
        } else {
          console.warn('🖼️ ローディング画面ロゴDropzoneが見つかりません');
        }
      }
      
      // ガイド画面画像（平面検出用）
      if (settings.guideScreen.surfaceDetection?.guideImage) {
        const surfaceGuideDropzone = document.getElementById('surfaceGuideImageDropzone');
        if (surfaceGuideDropzone) {
          surfaceGuideDropzone.innerHTML = `<img src="${settings.guideScreen.surfaceDetection.guideImage}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="平面検出ガイド画像">`;
          dlog('🖼️ 平面検出ガイド画像を復元');
        } else {
          console.warn('🖼️ 平面検出ガイドDropzoneが見つかりません');
        }
      }
      
      // ガイド画面画像（空間検出用）
      if (settings.guideScreen.worldTracking?.guideImage) {
        const worldGuideDropzone = document.getElementById('worldGuideImageDropzone');
        if (worldGuideDropzone) {
          worldGuideDropzone.innerHTML = `<img src="${settings.guideScreen.worldTracking.guideImage}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="空間検出ガイド画像">`;
          dlog('🖼️ 空間検出ガイド画像を復元');
        } else {
          console.warn('🖼️ 空間検出ガイドDropzoneが見つかりません');
        }
      }
      
      dlog('🖼️ 画像データ復元完了');
      
      // 画像復元後にファイルドロップゾーンのイベントリスナーを再設定
      setTimeout(() => {
        setupFileDropzones();
        dlog('🔄 画像復元後のイベントリスナーを再設定');
      }, 50);
      
      // 画像復元後にプレビューを更新
      setTimeout(() => {
        dlog('🔄 画像復元後にプレビューを更新');
        updatePreview('startScreen'); // デフォルトでスタート画面を表示
      }, 100);
    }, 200); // DOM準備のために200ms遅延
  }

  // エディタの初期化
  function initializeEditor() {
    dlog('ローディング画面エディタを初期化中...');

    // 現在の設定を使用してメインテンプレートを作成してDOMに追加
    const templateHTML = createMainEditorTemplate(currentSettings);
    dlog('HTMLテンプレート生成完了:', templateHTML.length, '文字');
    dlog('使用した設定:', currentSettings);
    
    const editorContainer = document.createElement('div');
    editorContainer.innerHTML = templateHTML;
    container.appendChild(editorContainer);
    
    dlog('エディタのDOM構造を追加しました');
    
    // DOMに追加されたかチェック
    setTimeout(() => {
      const addedEditor = document.querySelector('.app-layout');
      const addedSidebar = document.querySelector('.side-menu');
      const addedPreview = document.querySelector('.loading-screen-editor__preview-panel');
      
      dlog('DOM追加確認:', {
        editor: !!addedEditor,
        sidebar: !!addedSidebar,
        preview: !!addedPreview,
        containerChildren: container.children.length,
        containerHTML: container.innerHTML.substring(0, 200) + '...'
      });
      
      // DOM構造をさらに詳しく調査
      if (addedEditor) {
        dlog('エディタ要素のクラス:', addedEditor.className);
        const mainContentEl = addedEditor.querySelector('.main-content');
        if (mainContentEl) {
          dlog('メインコンテンツの子要素数:', mainContentEl.children.length);
          dlog('メインコンテンツの子要素:', Array.from(mainContentEl.children).map(el => el.className));
        }
        const settingsPanel = addedEditor.querySelector('.loading-screen-editor__settings-panel');
        if (settingsPanel) {
          dlog('設定パネルが見つかりました');
        }
      }
    }, 10);

    // DOM要素が確実に存在する状態でイベントリスナーを設定
    setTimeout(() => {
      try {
        dlog('イベントリスナーの設定を開始...');
        
        // イベントリスナーの設定
        setupTabHandlers();
        setupColorInputs();
        setupTextInputs();
        setupFileDropzones();
        initializeSliders();
        setupButtons();
        setupLogoTypeHandlers();
        setupSidebarMenuHandlers();
        setupStorageUsageDisplay();
        
        // ヘッダーにテンプレート名を表示
        updateEditorTitle(mode, templateName, templateId);
        
        dlog('全てのイベントリスナーを設定しました');

        // モードに応じた設定処理
        if (mode === 'new' || templateId) {
          dlog('🔧 新規作成またはテンプレートモード: loadSettings()をスキップ');
          dlog('🔧 使用する設定:', currentSettings);
          
          // フォーム要素に設定値を直接適用
          applySettingsToForm(currentSettings);
          
          // 初期タブの表示を強制
          const initialTab = document.querySelector('.loading-screen-editor__main-tab--active');
          if (initialTab) {
            initialTab.click();
          } else {
            // アクティブなタブがない場合は最初のタブをクリック
            const firstTab = document.querySelector('.loading-screen-editor__main-tab');
            if (firstTab) firstTab.click();
          }
        } else {
          // 通常モード: 保存済み設定を読み込み
          loadSettings().then(() => {
            dlog('設定の読み込みが完了しました');
            
            // 初期タブの表示を強制
            const initialTab = document.querySelector('.loading-screen-editor__main-tab--active');
            if (initialTab) {
              initialTab.click();
            } else {
              // アクティブなタブがない場合は最初のタブをクリック
              const firstTab = document.querySelector('.loading-screen-editor__main-tab');
              if (firstTab) firstTab.click();
            }
          });
        }
          
        // レイアウト検証を実行
        verifyLayoutTimeoutId = setTimeout(verifyLayout, 500);
      } catch (error) {
        console.error('初期化中にエラーが発生しました:', error);
      }
    }, 50);
  }

  // 設定の読み込み
  async function loadSettings() {
    try {
      // ローディング状態を表示
      const editor = document.querySelector('.app-layout');
      if (editor) {
        editor.classList.add('loading-screen-editor--loading');
      }
      
      // デフォルト値で初期化
      currentSettings = JSON.parse(JSON.stringify(defaultSettings));
      
      // 保存された設定を読み込んでマージ
      const savedSettings = await settingsAPI.getSettings();
      currentSettings = settingsAPI.mergeWithDefaults(savedSettings);
      
      // UIを更新
      updateFormValues();
      updatePreview('startScreen');
    } catch (error) {
      console.error('Failed to load settings:', error);
      // エラー時はデフォルト値を使用
      currentSettings = JSON.parse(JSON.stringify(defaultSettings));
    } finally {
      // ローディング状態を解除
      const editor = document.querySelector('.app-layout');
      if (editor) {
        editor.classList.remove('loading-screen-editor--loading');
      }
    }
  }

  // フォーム値の更新処理
  function updateFormValues() {
    // 各画面タイプの入力要素を更新
    ['startScreen', 'loadingScreen', 'guideScreen'].forEach(screenType => {
      const settings = currentSettings[screenType];
      if (!settings) return;
      
      // テキスト入力の更新
      Object.entries(settings).forEach(([key, value]) => {
        const input = document.getElementById(`${screenType}-${key}`);
        if (input) {
          if (input.type === 'color') {
            input.value = value || '';
            const textInput = document.getElementById(`${screenType}-${key}Text`);
            if (textInput) {
              textInput.value = value || '';
            }
          } else {
            input.value = value || '';
          }
        }
      });
    });

    // ロゴタイプラジオボタンの更新
    const logoType = currentSettings.loadingScreen.logoType || 'none';
    const logoTypeRadio = document.querySelector(`input[name="loadingLogoType"][value="${logoType}"]`);
    if (logoTypeRadio) {
      logoTypeRadio.checked = true;
      
      // UIの表示/非表示を更新
      const customLogoSection = document.getElementById('loading-custom-logo-section');
      const logoControls = document.getElementById('loading-logo-controls');
      const logoSizeControls = document.getElementById('loading-logo-size-controls');
      
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

  // レイアウト検証
  function verifyLayout() {
    // 現在のハッシュが loading-screen でない場合はスキップ
    const currentHash = window.location.hash || '';
    if (!currentHash.includes('loading-screen')) {
      dlog('ローディング画面エディタではないため、レイアウト検証をスキップします', {
        currentHash: currentHash,
        timestamp: new Date().toISOString()
      });
      return;
    }

    dlog('ローディング画面エディタのレイアウト検証を開始します', {
      currentHash: currentHash,
      timestamp: new Date().toISOString()
    });

    const editor = document.querySelector('.app-layout');
    const preview = document.querySelector('.loading-screen-editor__preview-panel');
    const sidebar = document.querySelector('.side-menu');
    const mainContent = document.querySelector('.main-content');
    const settingsPanel = document.querySelector('.loading-screen-editor__settings-panel');

    dlog('レイアウト要素の状態:', {
      editor: !!editor,
      preview: !!preview,
      sidebar: !!sidebar,
      mainContent: !!mainContent,
      settingsPanel: !!settingsPanel,
      currentHash: currentHash,
      timestamp: new Date().toISOString()
    });

    if (!editor || !preview || !sidebar || !mainContent) {
      console.error('❌ 必要なレイアウト要素が見つかりません:', {
        editor: !!editor,
        preview: !!preview,
        sidebar: !!sidebar,
        mainContent: !!mainContent,
        missingSelectors: {
          editor: !editor ? '.loading-screen-editor' : null,
          preview: !preview ? '.loading-screen-editor__preview' : null,
          sidebar: !sidebar ? '.loading-screen-editor__sidebar' : null,
          mainContent: !mainContent ? '.main-content' : null
        }
      });
      return;
    }

    dlog('✅ レイアウト検証完了');
    
    // プレビューの初期表示を更新（既に初期化時に実行済みなのでコメントアウト）
    // updatePreview('startScreen');
  }

  // クリーンアップ処理
  function cleanup() {
    try {
      dlog('🧹 ローディング画面エディタをクリーンアップしています...');
      
      // 実行中のタイマーをクリア
      if (verifyLayoutTimeoutId) {
        try {
          clearTimeout(verifyLayoutTimeoutId);
          verifyLayoutTimeoutId = null;
          dlog('✅ verifyLayout タイマーをクリアしました');
        } catch (timerError) {
          console.warn('⚠️ タイマークリア中にエラー:', timerError);
        }
      }
      
      // イベントリスナーのクリーンアップ
      try {
        // hashchange イベントリスナーを削除
        window.removeEventListener('hashchange', updateActiveMenuItem);
        dlog('✅ hashchange イベントリスナーを削除しました');
      } catch (eventError) {
        console.warn('⚠️ イベントリスナー削除中にエラー:', eventError);
      }
      
      // コンテナの内容をクリア
      if (container) {
        try {
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }
          dlog('✅ コンテナの内容をクリアしました');
        } catch (containerError) {
          console.warn('⚠️ コンテナクリア中にエラー:', containerError);
        }
      }
      
      dlog('🧹 クリーンアップ処理完了');
    } catch (error) {
      console.error('❌ クリーンアップ処理中にエラー:', error);
      console.error('エラースタック:', error.stack);
    }
  }

  // ヘッダーのタイトルを更新する関数
  function updateEditorTitle(mode, templateName, templateId) {
    const titleElement = document.getElementById('editor-title');
    const badgeElement = document.getElementById('template-name-badge');
    
    if (!titleElement || !badgeElement) {
      console.warn('タイトル要素が見つかりません');
      return;
    }
    
    // デフォルトのタイトル
    titleElement.textContent = 'ローディング画面エディタ';
    
    if (mode === 'new' && templateName) {
      // 新規作成モード
      badgeElement.textContent = templateName;
      badgeElement.className = 'template-name-badge new-template';
      badgeElement.style.display = 'inline-block';
      dlog('🏷️ 新規テンプレート名を表示:', templateName);
    } else if (templateId) {
      // 編集モード - テンプレート名を取得して表示
      const template = getLoadingScreenTemplate(templateId);
      if (template && template.name) {
        badgeElement.textContent = `${template.name} (編集中)`;
        badgeElement.className = 'template-name-badge editing-template';
        badgeElement.style.display = 'inline-block';
        dlog('🏷️ 編集中テンプレート名を表示:', template.name);
      }
    } else {
      // 通常モード - バッジを非表示
      badgeElement.style.display = 'none';
      dlog('🏷️ 通常モード - バッジを非表示');
    }
  }

  // エディタを初期化
  initializeEditor();

  // クリーンアップ関数を返す
  return cleanup;
}
