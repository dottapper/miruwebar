import './styles/style.css'
import './styles/editor.css'
import './styles/login.css';
import './styles/select-ar.css';
import './styles/marker-upload.css';
import './styles/version-info.css';
import './styles/loading-screen-editor.css'; // ローディング画面エディタ用のスタイルを追加
import './styles/loading-screen.css'; // ローディング画面のスタイルをインポート
import './styles/loading-screen-selector.css'; // ローディング画面選択モーダルのスタイル
import './styles/usage-guide.css'; // 使い方ガイドページのスタイル
import './styles/ar-viewer.css'; // ARビューアー用のスタイルをインポート

// QRCode ライブラリを遅延読み込みに変更
// import QRCode from 'qrcode'

// IndexedDB マイグレーション機能をインポート
import { initializeMigration } from './storage/migrate.js';

// デバッグモードの設定
const DEBUG_MODE = import.meta.env.DEV || window.location.search.includes('debug=true');

// デバッグ用ログ関数
function debugLog(message, ...args) {
  if (DEBUG_MODE) {
    console.log(message, ...args);
  }
}

// LocatorJS警告の抑制
if (typeof window !== 'undefined') {
  window.__LOCATOR_DEV__ = false;
}

// グローバルエラーハンドラーを設定
window.addEventListener('error', (event) => {
  // LocatorJS関連のエラーは無視
  if (event.message && event.message.includes('locatorjs')) {
    return;
  }
  
  console.error('❌ グローバルエラー:', event.error);
  console.error('エラー詳細:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  // LocatorJS関連のエラーは無視
  if (event.reason && event.reason.message && event.reason.message.includes('locatorjs')) {
    return;
  }
  
  console.error('❌ 未処理のPromise拒否:', event.reason);
});

// QRCodeライブラリの遅延読み込み
let QRCode = null;
async function loadQRCode() {
  if (!QRCode) {
    try {
      const qrcodeModule = await import('qrcode');
      QRCode = qrcodeModule.default;
    } catch (error) {
      console.error('❌ QRCodeライブラリ読み込みエラー:', error);
      QRCode = null;
    }
  }
  return QRCode;
}

// グローバルにQRCodeを設定（他のモジュールから使用可能）
window.loadQRCode = loadQRCode;

// アプリケーション初期化時にマイグレーションを実行
initializeMigration().catch((error) => {
  console.error('❌ マイグレーション初期化エラー:', error);
});

// 動的インポート用のビュー関数マッパー
const viewModules = {
  '#/login': () => import('./views/login.js'),
  '#/select-ar': () => import('./views/select-ar.js'),
  '#/projects': () => import('./views/projects.js'),
  '#/editor': () => import('./views/editor.js'),
  '#/qr-code': () => import('./views/qr-code.js'),
  '#/loading-screen': () => import('./views/loading-screen-editor.js'),
  '#/usage-guide': () => import('./views/usage-guide.js'),
  '#/viewer': () => import('./views/ar-viewer.js')
};

// アプリケーションのメインコンテナ
const app = document.getElementById('app');
if (!app) {
  console.error('❌ アプリケーションコンテナが見つかりません');
  // エラーを表示するためのフォールバック
  document.body.innerHTML = `
    <div style="
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #121212;
      color: white;
      font-family: Arial, sans-serif;
    ">
      <div style="text-align: center; padding: 2rem;">
        <h1 style="color: #FF5252;">❌ アプリケーションエラー</h1>
        <p>アプリケーションコンテナが見つかりません。</p>
        <p>ページをリフレッシュしてください。</p>
      </div>
    </div>
  `;
  throw new Error('アプリケーションコンテナが見つかりません');
}

debugLog('✅ アプリケーションコンテナ取得成功:', app);

// 現在のビューのクリーンアップ関数
let currentCleanup = null;

// ルーティング処理
async function render() {
  console.log('🔥 render関数開始');
  try {
    debugLog('🔄 ルーティング処理開始');
    
    // 現在のビューをクリーンアップ
    if (typeof currentCleanup === 'function') {
      debugLog('🧹 現在のビューをクリーンアップ');
      currentCleanup();
      currentCleanup = null;
    }

    // DOMをクリア
    while (app.firstChild) {
      app.removeChild(app.firstChild);
    }
    debugLog('🧹 DOMクリア完了');

    // 現在のハッシュを取得
    let hash = window.location.hash || '#/login';
    console.log('📍 現在のハッシュ:', hash);
    
    // デバッグ用：usage-guideルートの特別確認
    if (hash === '#/usage-guide') {
      console.log('🎯 usage-guideルートが検出されました！');
    }
    
    // ハッシュにクエリパラメータがある場合は分離
    const [baseHash] = hash.split('?');
    console.log('📍 ベースハッシュ:', baseHash);
    
    // 対応するビューモジュールを取得
    const viewModule = viewModules[baseHash];
    console.log('📍 対応するビューモジュール:', baseHash, !!viewModule);
    
    if (viewModule) {
      console.log(`✅ ルート "${baseHash}" のビューを動的読み込みします`);
      try {
        console.log('🔄 動的インポート開始...');
        // 動的インポートでビューを読み込み
        const module = await viewModule();
        console.log('🔍 読み込まれたモジュール:', module);
        console.log('🔍 module.default:', module.default);
        console.log('🔍 module.default の型:', typeof module.default);
        
        const view = module.default || module.showEditor || module;
        console.log('🔍 最終的なview:', view);
        console.log('🔍 view の型:', typeof view);
        
        if (typeof view === 'function') {
          console.log('🎯 ビュー関数を実行します');
          currentCleanup = view(app);
          console.log('✅ ビュー表示完了');
        } else {
          console.error('❌ ビュー関数が見つかりません。view:', view);
          throw new Error('ビュー関数が見つかりません');
        }
      } catch (viewError) {
        console.error('❌ ビュー表示中にエラー:', viewError);
        console.error('❌ エラースタック:', viewError.stack);
        console.error('❌ エラー詳細:', viewError.message);
        // エラー時のフォールバック表示
        app.innerHTML = `
          <div style="
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #121212;
            color: white;
            font-family: Arial, sans-serif;
          ">
            <div style="text-align: center; padding: 2rem;">
              <h1 style="color: #FF5252;">❌ ビュー表示エラー</h1>
              <p>ページの表示中にエラーが発生しました。</p>
              <p>エラー: ${viewError.message}</p>
              <button onclick="location.reload()" style="
                background: #7C4DFF;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                margin-top: 1rem;
              ">ページをリロード</button>
            </div>
          </div>
        `;
      }
    } else {
      console.warn(`⚠️ 未定義のルート: ${baseHash}`);
      console.log('📍 利用可能なルート:', Object.keys(viewModules));
      window.location.hash = '#/login';
    }
  } catch (error) {
    console.error('❌ ビューのレンダリング中にエラーが発生しました:', error);
    console.error('エラースタック:', error.stack);
    
    // エラー時のフォールバック表示
    app.innerHTML = `
      <div style="
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background-color: #121212;
        color: white;
        font-family: Arial, sans-serif;
      ">
        <div style="text-align: center; padding: 2rem;">
          <h1 style="color: #FF5252;">❌ アプリケーションエラー</h1>
          <p>アプリケーションの初期化中にエラーが発生しました。</p>
          <p>エラー: ${error.message}</p>
          <button onclick="location.reload()" style="
            background: #7C4DFF;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            margin-top: 1rem;
          ">ページをリロード</button>
        </div>
      </div>
    `;
  }
}

// ハッシュ変更時のルーティング
window.addEventListener('hashchange', () => {
  debugLog('🔄 ハッシュ変更検知');
  render().catch((error) => {
    console.error('❌ ハッシュ変更時のエラー:', error);
  });
});

// 初期表示
debugLog('🚀 初期表示開始');
render().then(() => {
  debugLog('✅ 初期表示完了');
}).catch((error) => {
  console.error('❌ 初期表示エラー:', error);
});