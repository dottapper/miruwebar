import { showQRCodeModal } from '../components/ui.js';

export default function showQRCode(container) {
  // URLパラメータを取得
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const modelName = urlParams.get('model') || projectId;
  
  // QRコード用のページレイアウト
  container.innerHTML = `
    <div class="qr-page">
      <div class="page-header">
        <h1>QRコード生成</h1>
        <p>ARプロジェクトをスマホで確認するためのQRコードを生成します</p>
      </div>
      
      <div class="qr-content">
        <div class="project-info">
          <h2>プロジェクト: ${modelName || 'サンプル'}</h2>
          <p>以下のボタンからQRコードを生成してください</p>
        </div>
        
        <div class="qr-buttons">
          <button id="generate-test-qr" class="btn-primary">
            📱 スマホでテスト
          </button>
          <button id="generate-public-qr" class="btn-secondary">
            🌐 公開用QRコード
          </button>
        </div>
        
        <div class="back-button-container">
          <button id="back-to-editor" class="btn-back">
            ← エディタに戻る
          </button>
        </div>
      </div>
    </div>
  `;

  // スタイルを追加
  const style = document.createElement('style');
  style.textContent = `
    .qr-page {
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .page-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    .page-header h1 {
      color: var(--color-primary);
      margin-bottom: 0.5rem;
    }
    
    .project-info {
      background: rgba(0,0,0,0.05);
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      text-align: center;
    }
    
    .qr-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-bottom: 2rem;
    }
    
    .qr-buttons button {
      padding: 1rem 2rem;
      font-size: 1.1rem;
      min-width: 200px;
    }
    
    .back-button-container {
      text-align: center;
    }
    
    .btn-back {
      background: transparent;
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border);
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .btn-back:hover {
      background: rgba(0,0,0,0.05);
    }
  `;
  document.head.appendChild(style);

  // ボタンイベント設定
  const testButton = container.querySelector('#generate-test-qr');
  const publicButton = container.querySelector('#generate-public-qr');
  const backButton = container.querySelector('#back-to-editor');

  testButton.addEventListener('click', async () => {
    try {
      await showQRCodeModal({
        modelName: modelName,
        defaultMethod: 'local'
      });
    } catch (error) {
      console.error('❌ QRコードモーダル表示エラー:', error);
      alert('QRコードの生成に失敗しました。');
    }
  });

  publicButton.addEventListener('click', async () => {
    try {
      await showQRCodeModal({
        modelName: modelName,
        defaultMethod: 'web'
      });
    } catch (error) {
      console.error('❌ QRコードモーダル表示エラー:', error);
      alert('QRコードの生成に失敗しました。');
    }
  });

  backButton.addEventListener('click', () => {
    if (projectId) {
      window.location.hash = `#/editor?id=${projectId}`;
    } else {
      window.history.back();
    }
  });
}
  