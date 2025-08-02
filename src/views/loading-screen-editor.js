/**
 * ローディング画面エディタコンポーネント（リファクタリング済み）
 */

import '../styles/loading-screen-editor.css';
import { defaultSettings, settingsAPI } from '../components/loading-screen/settings.js';
import { createMainEditorTemplate } from '../components/loading-screen/ui-templates.js';
import { 
  setupTabHandlers, 
  setupColorInputs, 
  setupTextInputs, 
  setupFileDropzones, 
  initializeSliders, 
  setupButtons,
  setupLogoTypeHandlers,
  setupSidebarMenuHandlers
} from '../components/loading-screen/event-handlers.js';
import { updatePreview } from '../components/loading-screen/preview.js';

export default function showLoadingScreenEditor(container) {
  console.log('🚨 showLoadingScreenEditor が呼び出されました', {
    currentHash: window.location.hash,
    timestamp: new Date().toISOString(),
    container: container
  });

  // 現在の設定を保持
  let currentSettings = JSON.parse(JSON.stringify(defaultSettings));
  
  // タイマーIDを保持するための変数
  let verifyLayoutTimeoutId = null;

  // エディタの初期化
  function initializeEditor() {
    console.log('ローディング画面エディタを初期化中...');

    // メインテンプレートを作成してDOMに追加
    const templateHTML = createMainEditorTemplate();
    console.log('HTMLテンプレート生成完了:', templateHTML.length, '文字');
    
    const editorContainer = document.createElement('div');
    editorContainer.innerHTML = templateHTML;
    container.appendChild(editorContainer);
    
    console.log('エディタのDOM構造を追加しました');
    
    // DOMに追加されたかチェック
    setTimeout(() => {
      const addedEditor = document.querySelector('.app-layout');
      const addedSidebar = document.querySelector('.side-menu');
      const addedPreview = document.querySelector('.loading-screen-editor__preview-panel');
      
      console.log('DOM追加確認:', {
        editor: !!addedEditor,
        sidebar: !!addedSidebar,
        preview: !!addedPreview,
        containerChildren: container.children.length,
        containerHTML: container.innerHTML.substring(0, 200) + '...'
      });
      
      // DOM構造をさらに詳しく調査
      if (addedEditor) {
        console.log('エディタ要素のクラス:', addedEditor.className);
        const mainContentEl = addedEditor.querySelector('.main-content');
        if (mainContentEl) {
          console.log('メインコンテンツの子要素数:', mainContentEl.children.length);
          console.log('メインコンテンツの子要素:', Array.from(mainContentEl.children).map(el => el.className));
        }
        const settingsPanel = addedEditor.querySelector('.loading-screen-editor__settings-panel');
        if (settingsPanel) {
          console.log('設定パネルが見つかりました');
        }
      }
    }, 10);

    // DOM要素が確実に存在する状態でイベントリスナーを設定
    setTimeout(() => {
      try {
        console.log('イベントリスナーの設定を開始...');
        
        // イベントリスナーの設定
        setupTabHandlers();
        setupColorInputs();
        setupTextInputs();
        setupFileDropzones();
        initializeSliders();
        setupButtons();
        setupLogoTypeHandlers();
        setupSidebarMenuHandlers();
        
        console.log('全てのイベントリスナーを設定しました');

        // 初期設定の読み込みとプレビューの更新
        loadSettings().then(() => {
          console.log('設定の読み込みが完了しました');
          
          // 初期タブの表示を強制
          const initialTab = document.querySelector('.loading-screen-editor__main-tab--active');
          if (initialTab) {
            initialTab.click();
          } else {
            // アクティブなタブがない場合は最初のタブをクリック
            const firstTab = document.querySelector('.loading-screen-editor__main-tab');
            if (firstTab) firstTab.click();
          }
          
          // レイアウト検証を実行
          verifyLayoutTimeoutId = setTimeout(verifyLayout, 500);
        }).catch((error) => {
          console.error('❌ 設定の読み込みに失敗しました:', error);
          // エラーが発生してもレイアウト検証は実行
          verifyLayoutTimeoutId = setTimeout(verifyLayout, 500);
        });
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
      console.log('ローディング画面エディタではないため、レイアウト検証をスキップします', {
        currentHash: currentHash,
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('ローディング画面エディタのレイアウト検証を開始します', {
      currentHash: currentHash,
      timestamp: new Date().toISOString()
    });

    const editor = document.querySelector('.app-layout');
    const preview = document.querySelector('.loading-screen-editor__preview-panel');
    const sidebar = document.querySelector('.side-menu');
    const mainContent = document.querySelector('.main-content');
    const settingsPanel = document.querySelector('.loading-screen-editor__settings-panel');

    console.log('レイアウト要素の状態:', {
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

    console.log('✅ レイアウト検証完了');
    
    // プレビューの初期表示を更新（既に初期化時に実行済みなのでコメントアウト）
    // updatePreview('startScreen');
  }

  // クリーンアップ処理
  function cleanup() {
    console.log('ローディング画面エディタをクリーンアップしています...');
    
    // 実行中のタイマーをクリア
    if (verifyLayoutTimeoutId) {
      clearTimeout(verifyLayoutTimeoutId);
      verifyLayoutTimeoutId = null;
      console.log('verifyLayout タイマーをクリアしました');
    }
    
    // コンテナの内容をクリア
    if (container) {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }
  }

  // エディタを初期化
  initializeEditor();

  // クリーンアップ関数を返す
  return cleanup;
}