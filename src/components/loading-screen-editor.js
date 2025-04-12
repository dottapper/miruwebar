// プレビュー画面の更新
function updatePreview() {
  previewScreen.innerHTML = `
    <div class="editor-preview-loading">
      <div class="editor-loading-content">
        <div class="editor-loading-logo"></div>
        <div class="editor-loading-title">miru-WebAR</div>
        <div class="editor-loading-subtitle">WebARエクスペリエンス</div>
        <div class="editor-loading-progress-bar">
          <div class="editor-loading-progress-inner"></div>
        </div>
        <div class="editor-loading-message">プレビュー中...</div>
      </div>
    </div>
  `;
}

// スタイルの適用
function applyStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .editor-preview-loading {
      position: relative;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    
    .editor-loading-content {
      text-align: center;
    }
    
    .editor-loading-logo {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      background-image: url('/assets/logo.png');
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
    }
    
    .editor-loading-title {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    .editor-loading-subtitle {
      font-size: 16px;
      margin-bottom: 20px;
      opacity: 0.8;
    }
    
    .editor-loading-progress-bar {
      width: 200px;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      overflow: hidden;
      margin: 0 auto 15px;
    }
    
    .editor-loading-progress-inner {
      height: 100%;
      background: #00a8ff;
      transition: width 0.3s ease;
      width: 0%;
    }
    
    .editor-loading-message {
      font-size: 14px;
      opacity: 0.9;
    }
  `;
  document.head.appendChild(styleElement);
} 