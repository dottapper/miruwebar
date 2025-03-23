import { initARViewer } from '../components/arViewer.js';

// showEditor関数を追加して、main.jsでインポートできるようにする
export function showEditor(container) {
  container.innerHTML = `
    <div id="viewer" style="width: 100%; height: 100vh;"></div>
  `;

  // HTMLが描画されたあとに Three.js を初期化！
  initARViewer();
}

// 元のDOM読み込みイベントリスナーは不要になるため削除
// DOMContentLoadedはルーティングシステムで処理されるため