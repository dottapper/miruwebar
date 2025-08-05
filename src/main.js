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

// デバッグ用の初期ログ
console.log('🎯 メインアプリケーション開始');
console.log('🔧 アニメーション機能デバッグモード有効');

// グローバルエラーハンドラーを設定
window.addEventListener('error', (event) => {
  console.error('❌ グローバルエラー:', event.error);
  console.error('エラー詳細:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ 未処理のPromise拒否:', event.reason);
});

// QRCodeライブラリの遅延読み込み
let QRCode = null;
async function loadQRCode() {
  if (!QRCode) {
    try {
      console.log('📦 QRCodeライブラリ読み込み中...');
      const qrcodeModule = await import('qrcode');
      QRCode = qrcodeModule.default;
      console.log('✅ QRCodeライブラリ読み込み完了');
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
initializeMigration().then((result) => {
  console.log('🔄 マイグレーション初期化完了:', result);
}).catch((error) => {
  console.error('❌ マイグレーション初期化エラー:', error);
});

// ページごとのJSファイルをインポート
import showLogin from './views/login.js';
import showSelectAR from './views/select-ar.js';
import showProjects from './views/projects.js';
import { showEditor } from './views/editor.js';  // named importに修正
import showQRCode from './views/qr-code.js';
import showLoadingScreenEditor from './views/loading-screen-editor.js';

console.log('📦 ビューファイルのインポート完了');

// ルートに対応する表示関数のマップ
const routes = {
  '#/login': showLogin,
  '#/select-ar': showSelectAR,
  '#/projects': showProjects,
  '#/editor': showEditor,
  '#/qr-code': showQRCode,
  '#/loading-screen': showLoadingScreenEditor  // パスを修正
};

console.log('🗺️ ルート設定完了:', Object.keys(routes));

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

console.log('✅ アプリケーションコンテナ取得成功:', app);

// 現在のビューのクリーンアップ関数
let currentCleanup = null;

// ルーティング処理
function render() {
  try {
    console.log('🔄 ルーティング処理開始');
    
    // 現在のビューをクリーンアップ
    if (typeof currentCleanup === 'function') {
      console.log('🧹 現在のビューをクリーンアップ');
      currentCleanup();
      currentCleanup = null;
    }

    // DOMをクリア
    while (app.firstChild) {
      app.removeChild(app.firstChild);
    }
    console.log('🧹 DOMクリア完了');

    // 現在のハッシュを取得
    let hash = window.location.hash || '#/login';
    console.log('📍 現在のハッシュ:', hash);
    
    // ハッシュにクエリパラメータがある場合は分離
    const [baseHash] = hash.split('?');
    console.log('📍 ベースハッシュ:', baseHash);
    
    // 対応するビュー関数を取得
    const view = routes[baseHash];
    
    if (view) {
      console.log(`✅ ルート "${baseHash}" のビューを表示します`);
      try {
        currentCleanup = view(app);
        console.log('✅ ビュー表示完了');
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
  console.log('🔄 ハッシュ変更検知');
  render();
});

// 初期表示
console.log('🚀 初期表示開始');
render();
console.log('✅ 初期表示完了');