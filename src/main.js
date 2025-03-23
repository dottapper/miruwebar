import './styles/style.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.js'

document.querySelector('#app').innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank">
      <img src="${javascriptLogo}" class="logo vanilla" alt="JavaScript logo" />
    </a>
    <h1>Hello Vite!</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite logo to learn more
    </p>
  </div>
`

setupCounter(document.querySelector('#counter'))

// ページごとのJSファイルをインポート
import showLogin from './views/login.js';
import showSelectAR from './views/select-ar.js';
import showProjects from './views/projects.js';
import showEditor from './views/editor.js';
import showQRCode from './views/qr-code.js';

// ルートに対応する表示関数のマップ
const routes = {
  '#/login': showLogin,
  '#/select-ar': showSelectAR,
  '#/projects': showProjects,
  '#/editor': showEditor,
  '#/qr-code': showQRCode,
};

// アプリ表示エリア
const app = document.querySelector('#app');

// 表示切り替え
function render() {
  const route = window.location.hash || '#/login';
  const renderFunc = routes[route] || showLogin;
  app.innerHTML = ''; // 表示を初期化
  renderFunc(app);     // 選ばれた関数にappを渡して表示
}

// イベントリスナー
window.addEventListener('hashchange', render);
window.addEventListener('load', render);

