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

// HMRクライアントをインポート
import hmrClient from './utils/hmr-client.js';

// 統一されたロガーをインポート
import { logger, createLogger } from './utils/logger.js';

// IndexedDB マイグレーション機能をインポート
import { initializeMigration } from './storage/migrate.js';

// メインロガーを作成
const mainLogger = createLogger('Main');

// デバッグモードの設定
const DEBUG_MODE = import.meta.env.DEV || window.location.search.includes('debug=true');

// 他モジュールから参照できるように DEBUG フラグを公開（必要最小限）
if (typeof window !== 'undefined') {
  window.DEBUG = Boolean(DEBUG_MODE);
}

// HMRの設定
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    mainLogger.loading('HMR更新を検知しました');
    // ページをリロードしてHMRを確実に適用
    window.location.reload();
  });
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
  
  mainLogger.error('グローバルエラーが発生しました', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  // LocatorJS関連のエラーは無視
  if (event.reason && event.reason.message && event.reason.message.includes('locatorjs')) {
    return;
  }
  
  mainLogger.error('未処理のPromise拒否が発生しました', event.reason);
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

// QRCode専用モジュールを使用するため、グローバル公開は不要

// アプリケーション初期化時にマイグレーションを実行
initializeMigration().catch((error) => {
  mainLogger.error('マイグレーション初期化エラー', error);
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
  mainLogger.error('アプリケーションコンテナが見つかりません');
  // エラーを表示するためのフォールバック
  document.body.innerHTML = `
    <div style="
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100svh; /* iOS Safari対応 */
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

mainLogger.success('アプリケーションコンテナ取得成功', { appId: app.id });

// 現在のビューのクリーンアップ関数
let currentCleanup = null;

// ルーティング処理
async function render() {
  mainLogger.debug('render関数開始');
  try {
    mainLogger.debug('ルーティング処理開始');
    
    // 現在のビューをクリーンアップ
    if (typeof currentCleanup === 'function') {
      mainLogger.debug('現在のビューをクリーンアップ');
      currentCleanup();
      currentCleanup = null;
    }

    // DOMをクリア
    while (app.firstChild) {
      app.removeChild(app.firstChild);
    }
    mainLogger.debug('DOMクリア完了');

    // 現在のハッシュを取得
    let hash = window.location.hash || '#/login';
    mainLogger.debug('現在のハッシュ', { hash });
    
    // デバッグ用：usage-guideルートの特別確認
    if (hash === '#/usage-guide') {
      mainLogger.debug('usage-guideルートが検出されました');
    }
    
    // ハッシュにクエリパラメータがある場合は分離
    const [baseHash] = hash.split('?');
    mainLogger.debug('ベースハッシュ', { baseHash });
    
    // 対応するビューモジュールを取得
    const viewModule = viewModules[baseHash];
    mainLogger.debug('対応するビューモジュール', { baseHash, hasModule: !!viewModule });
    
    if (viewModule) {
      mainLogger.info(`ルート "${baseHash}" のビューを動的読み込みします`);
      try {
        mainLogger.debug('動的インポート開始');
        // 動的インポートでビューを読み込み
        const module = await viewModule();
        mainLogger.debug('読み込まれたモジュール', { 
          hasDefault: !!module.default,
          hasShowEditor: !!module.showEditor,
          moduleType: typeof module
        });
        
        const view = module.default || module.showEditor || module;
        mainLogger.debug('最終的なview', { 
          viewType: typeof view,
          isFunction: typeof view === 'function'
        });
        
        if (typeof view === 'function') {
          mainLogger.debug('ビュー関数を実行します');
          currentCleanup = view(app);
          mainLogger.success('ビュー表示完了');
        } else {
          mainLogger.error('ビュー関数が見つかりません', { view });
          throw new Error('ビュー関数が見つかりません');
        }
      } catch (viewError) {
        mainLogger.error('ビュー表示中にエラーが発生しました', {
          error: viewError.message,
          stack: viewError.stack
        });
        
        // エラー時のフォールバック表示
        app.innerHTML = `
          <div style="
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100svh; /* iOS Safari対応 */
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
      mainLogger.warn(`未定義のルート: ${baseHash}`);
      mainLogger.debug('利用可能なルート', { routes: Object.keys(viewModules) });
      window.location.hash = '#/login';
    }
  } catch (error) {
    mainLogger.error('ビューのレンダリング中にエラーが発生しました', {
      error: error.message,
      stack: error.stack
    });
    
    // エラー時のフォールバック表示
    app.innerHTML = `
      <div style="
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100svh; /* iOS Safari対応 */
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
  mainLogger.debug('ハッシュ変更検知');
  render().catch((error) => {
    mainLogger.error('ハッシュ変更時のエラー', error);
  });
});

// 初期表示
mainLogger.info('初期表示開始');
render().then(() => {
  mainLogger.success('初期表示完了');
}).catch((error) => {
  mainLogger.error('初期表示エラー', error);
});
