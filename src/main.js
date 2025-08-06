import './styles/style.css'
import './styles/editor.css'
import './styles/login.css';
import './styles/select-ar.css';
import './styles/marker-upload.css';
import './styles/version-info.css';
import './styles/loading-screen-editor.css'; // ローディング画面エディタ用のスタイルを追加
import './styles/loading-screen.css'; // ローディング画面のスタイルをインポート
import './styles/loading-screen-selector.css'; // ローディング画面選択モーダルのスタイル

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
  '#/loading-screen': () => import('./views/loading-screen-editor.js')
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
    debugLog('📍 現在のハッシュ:', hash);
    
    // ハッシュにクエリパラメータがある場合は分離
    const [baseHash] = hash.split('?');
    debugLog('📍 ベースハッシュ:', baseHash);
    
    // 対応するビューモジュールを取得
    const viewModule = viewModules[baseHash];
    
    if (viewModule) {
      debugLog(`✅ ルート "${baseHash}" のビューを動的読み込みします`);
      try {
        // 動的インポートでビューを読み込み
        const module = await viewModule();
        const view = module.default || module.showEditor || module;
        
        if (typeof view === 'function') {
          currentCleanup = view(app);
          debugLog('✅ ビュー表示完了');
        } else {
          throw new Error('ビュー関数が見つかりません');
        }
      } catch (viewError) {
        console.error('❌ ビュー表示中にエラー:', viewError);
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
  render();
});

// 初期表示
debugLog('🚀 初期表示開始');
render();
debugLog('✅ 初期表示完了');