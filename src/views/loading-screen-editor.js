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
  setupLogoTypeHandlers
} from '../components/loading-screen/event-handlers.js';
import { updatePreview, adjustPreviewScroll } from '../components/loading-screen/preview.js';

export default function showLoadingScreenEditor(container) {
  // 現在の設定を保持
  let currentSettings = JSON.parse(JSON.stringify(defaultSettings));

  // エディタの初期化
  function initializeEditor() {
    console.log('ローディング画面エディタを初期化中...');

    // メインテンプレートを作成してDOMに追加
    const editorContainer = document.createElement('div');
    editorContainer.innerHTML = createMainEditorTemplate();
    container.appendChild(editorContainer);
    
    console.log('エディタのDOM構造を追加しました');

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
          setTimeout(verifyLayout, 500);
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
      const editor = document.querySelector('.loading-screen-editor');
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
      const editor = document.querySelector('.loading-screen-editor');
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
    const editor = document.querySelector('.loading-screen-editor');
    const preview = document.querySelector('.loading-screen-editor__preview');
    const sidebar = document.querySelector('.loading-screen-editor__sidebar');

    if (!editor || !preview || !sidebar) {
      console.error('必要なレイアウト要素が見つかりません');
      return;
    }

    console.log('レイアウト検証完了');
    
    // プレビューの初期表示を更新（既に初期化時に実行済みなのでコメントアウト）
    // updatePreview('startScreen');
  }

  // クリーンアップ処理
  function cleanup() {
    console.log('ローディング画面エディタをクリーンアップしています...');
    
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