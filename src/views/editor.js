import { initARViewer } from '../components/arViewer.js';

export default function showEditor(container) {
  // HTMLを追加
  container.innerHTML = `
    <h1>GLB Viewer</h1>
    <div id="viewer" style="width: 100%; height: 600px;"></div>
  `;
  
  // コンテナにHTMLを追加した後にARViewerを初期化
  setTimeout(() => {
    initARViewer('viewer');
  }, 0);
}
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app'); // index.html に id="app" があると仮定
  root.innerHTML = `
    <div id="viewer" style="width: 100%; height: 100vh;"></div>
  `;
});
initARViewer();