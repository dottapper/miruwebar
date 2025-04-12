import './styles/style.css'
import './styles/editor.css'
import './styles/login.css';
import './styles/select-ar.css';
import './styles/marker-upload.css';
import './styles/version-info.css';
import './styles/loading-screen-editor.css'; // ローディング画面エディタ用のスタイルを追加
import './styles/loading-screen.css'; // ローディング画面のスタイルをインポート

// QRCode ライブラリを読み込み
import QRCode from 'qrcode'

// ページごとのJSファイルをインポート
import showLogin from './views/login.js';
import showSelectAR from './views/select-ar.js';
import showProjects from './views/projects.js';
import { showEditor } from './views/editor.js';  // named importに修正
import showQRCode from './views/qr-code.js';
import showLoadingScreenEditor from './views/loading-screen-editor.js';

// ルートに対応する表示関数のマップ
const routes = {
  '#/login': showLogin,
  '#/select-ar': showSelectAR,
  '#/projects': showProjects,
  '#/editor': showEditor,
  '#/qr-code': showQRCode,
  '#/loading-screen': showLoadingScreenEditor  // パスを修正
};

// アプリケーションのメインコンテナ
const app = document.getElementById('app');
if (!app) {
  console.error('アプリケーションコンテナが見つかりません');
  throw new Error('アプリケーションコンテナが見つかりません');
}

// 現在のビューのクリーンアップ関数
let currentCleanup = null;

// ルーティング処理
function render() {
  try {
    // 現在のビューをクリーンアップ
    if (typeof currentCleanup === 'function') {
      currentCleanup();
      currentCleanup = null;
    }

    // DOMをクリア
    while (app.firstChild) {
      app.removeChild(app.firstChild);
    }

    // 現在のハッシュを取得
    let hash = window.location.hash || '#/login';
    
    // ハッシュにクエリパラメータがある場合は分離
    const [baseHash] = hash.split('?');
    
    // 対応するビュー関数を取得
    const view = routes[baseHash];
    
    if (view) {
      console.log(`ルート "${baseHash}" のビューを表示します`);
      currentCleanup = view(app);
    } else {
      console.warn(`未定義のルート: ${baseHash}`);
      window.location.hash = '#/login';
    }
  } catch (error) {
    console.error('ビューのレンダリング中にエラーが発生しました:', error);
  }
}

// ハッシュ変更時のルーティング
window.addEventListener('hashchange', render);

// 初期表示
render();