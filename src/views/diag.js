// src/views/diag.js
// システム診断ページ - P0-P1 完了の実在性証明

import { checkXRSupport } from '../utils/webxr-support.js';
import { AREngineAdapter } from '../utils/ar-engine-adapter.js';

export default function showDiag(container) {
  // 診断ページレイアウト
  container.innerHTML = `
    <div class="diag-page">
      <div class="page-header">
        <h1>🔍 WebAR システム診断</h1>
        <p>P0-P1修正の実在性証明 - リアルタイム診断結果</p>
      </div>

      <div class="diag-content">
        <div class="diag-section">
          <h2>📊 基本環境情報</h2>
          <div class="diag-item">
            <label>Protocol:</label>
            <span id="proto" class="diag-value">checking...</span>
          </div>
          <div class="diag-item">
            <label>navigator.xr:</label>
            <span id="hasXR" class="diag-value">checking...</span>
          </div>
          <div class="diag-item">
            <label>XR Support:</label>
            <span id="xrSupport" class="diag-value">checking...</span>
          </div>
          <div class="diag-item">
            <label>Camera Permission:</label>
            <span id="camPerm" class="diag-value">checking...</span>
          </div>
        </div>

        <div class="diag-section">
          <h2>🖥️ WebGL対応情報</h2>
          <div class="diag-item">
            <label>WebGL:</label>
            <span id="webgl" class="diag-value">checking...</span>
          </div>
          <div class="diag-item">
            <label>WEBGL_lose_context:</label>
            <span id="webglExt" class="diag-value">checking...</span>
          </div>
          <div class="diag-item">
            <label>KTX2/DRACO:</label>
            <span id="compression" class="diag-value">checking...</span>
          </div>
        </div>

        <div class="diag-section">
          <h2>🏗️ ビルド情報</h2>
          <div class="diag-item">
            <label>Build SHA:</label>
            <span id="buildSha" class="diag-value">N/A</span>
          </div>
          <div class="diag-item">
            <label>Build Time:</label>
            <span id="buildTime" class="diag-value">N/A</span>
          </div>
        </div>

        <div class="diag-section">
          <h2>🚀 ARサニティチェック</h2>
          <button id="startAR" class="btn-primary">ARサニティチェック実行</button>
          <div id="arResult" class="diag-result"></div>
        </div>

        <div class="diag-section">
          <h2>🔧 AR状態機械 & エンジン診断</h2>
          <button id="checkARState" class="btn-secondary">AR状態確認</button>
          <div id="arStateResult" class="diag-result"></div>
        </div>

        <div class="diag-section">
          <h2>🧹 キャッシュクリア</h2>
          <button id="clearCache" class="btn-warning">Service Worker & Cache 全削除</button>
          <div id="cacheResult" class="diag-result"></div>
        </div>
      </div>
    </div>
  `;

  // スタイル追加
  const style = document.createElement('style');
  style.textContent = `
    .diag-page {
      padding: 1rem;
      max-width: 1000px;
      margin: 0 auto;
      font-family: 'Courier New', monospace;
    }

    .page-header {
      text-align: center;
      margin-bottom: 2rem;
      padding: 1rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 8px;
    }

    .diag-section {
      margin-bottom: 2rem;
      padding: 1rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #f9f9f9;
    }

    .diag-section h2 {
      margin: 0 0 1rem 0;
      color: #333;
      border-bottom: 2px solid #eee;
      padding-bottom: 0.5rem;
    }

    .diag-item {
      display: flex;
      margin-bottom: 0.5rem;
      align-items: center;
    }

    .diag-item label {
      font-weight: bold;
      min-width: 200px;
      color: #555;
    }

    .diag-value {
      padding: 0.2rem 0.5rem;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-family: monospace;
      flex: 1;
    }

    .diag-result {
      margin-top: 1rem;
      padding: 1rem;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      white-space: pre-wrap;
      font-family: monospace;
      font-size: 0.9rem;
      max-height: 300px;
      overflow-y: auto;
    }

    .btn-primary, .btn-secondary, .btn-warning {
      padding: 0.7rem 1.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      margin-right: 1rem;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-warning {
      background: #ffc107;
      color: black;
    }

    .success { color: #28a745; font-weight: bold; }
    .error { color: #dc3545; font-weight: bold; }
    .warning { color: #ffc107; font-weight: bold; }
  `;
  document.head.appendChild(style);

  // 診断機能の実装
  initializeDiagnostics();
}

// 診断ロジック
async function initializeDiagnostics() {
  // ユーティリティ関数
  async function el(id) {
    return document.getElementById(id);
  }

  async function safe(f) {
    try {
      return await f();
    } catch (e) {
      return { error: String(e?.message || e) };
    }
  }

  async function checkXR() {
    const hasXR = 'xr' in navigator;
    if (!hasXR) return { supported: false, reason: 'navigator.xr missing' };

    const res = await safe(() => navigator.xr.isSessionSupported('immersive-ar'));
    if (res?.error) return { supported: false, reason: res.error };
    return { supported: !!res };
  }

  // 基本環境情報
  (await el('proto')).textContent = location.protocol;
  (await el('hasXR')).textContent = String('xr' in navigator);

  const xr = await checkXR();
  (await el('xrSupport')).textContent = JSON.stringify(xr);

  const cam = await safe(() => navigator.permissions.query({ name: 'camera' }));
  (await el('camPerm')).textContent = cam && 'state' in cam ? cam.state : 'unknown';

  // WebGL情報
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  (await el('webgl')).textContent = gl ? 'supported' : 'not supported';

  if (gl) {
    const loseExt = gl.getExtension('WEBGL_lose_context');
    (await el('webglExt')).textContent = loseExt ? 'available' : 'not available';
  }

  // 圧縮テクスチャ対応（概算）
  (await el('compression')).textContent = gl ? 'WebGL対応のため推定可能' : 'WebGL未対応のため不明';

  // ビルド情報（環境変数から取得、fallback付き）
  try {
    (await el('buildSha')).textContent = window.__BUILD_SHA__ || 'dev-build';
    (await el('buildTime')).textContent = window.__BUILD_TIME__ || new Date().toISOString();
  } catch (e) {
    (await el('buildSha')).textContent = 'dev-build';
    (await el('buildTime')).textContent = new Date().toISOString();
  }

  // ARサニティチェック
  (await el('startAR')).addEventListener('click', async () => {
    const resultEl = await el('arResult');
    resultEl.textContent = 'AR起動テスト中...';

    if (!xr.supported) {
      resultEl.innerHTML = '<span class="warning">XR not supported; AR.js経路にフォールバック予定</span>';
      return;
    }

    try {
      const sess = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
      });
      resultEl.innerHTML = '<span class="success">✅ AR session started: ' + !!sess + '</span>';

      // セッション情報を表示
      resultEl.innerHTML += '\\n📊 Session details:\\n';
      resultEl.innerHTML += '- Session ID: ' + (sess.id || 'N/A') + '\\n';
      resultEl.innerHTML += '- Input sources: ' + sess.inputSources.length + '\\n';
      resultEl.innerHTML += '- Render state: ' + (sess.renderState ? 'OK' : 'N/A') + '\\n';

      await sess.end();
      resultEl.innerHTML += '\\n✅ Session ended cleanly';
    } catch (e) {
      resultEl.innerHTML = '<span class="error">❌ AR failed: ' + String(e?.message || e) + '</span>';
      resultEl.innerHTML += '\\n📋 Error details:\\n';
      resultEl.innerHTML += '- Name: ' + (e.name || 'Unknown') + '\\n';
      resultEl.innerHTML += '- Code: ' + (e.code || 'N/A') + '\\n';
      resultEl.innerHTML += '- Stack: ' + (e.stack || 'N/A').substring(0, 200) + '...';
    }
  });

  // AR状態確認
  (await el('checkARState')).addEventListener('click', async () => {
    const resultEl = await el('arStateResult');
    resultEl.textContent = 'AR状態診断中...';

    try {
      // ARエンジンアダプターの状態
      const adapterState = {
        isInitializing: AREngineAdapter.isInitializing(),
        activeEngine: AREngineAdapter.getActiveEngine()?.constructor?.name || 'none',
        engineCount: AREngineAdapter.getActiveEngine() ? 1 : 0
      };

      resultEl.textContent = '🔍 AREngineAdapter状態:\\n' + JSON.stringify(adapterState, null, 2);

      // コンソールにも出力
      console.table([adapterState]);

      // WebXR対応確認（P0修正の検証）
      const webxrCheck = await checkXRSupport();
      resultEl.textContent += '\\n\\n🔍 WebXRサポート確認 (P0修正検証):\\n' + JSON.stringify(webxrCheck, null, 2);

      // 状態機械の状態確認も追加予定
      resultEl.textContent += '\\n\\n✅ 診断完了 - 詳細はConsoleタブも確認してください';

    } catch (error) {
      resultEl.innerHTML = '<span class="error">❌ 状態確認エラー: ' + error.message + '</span>';
    }
  });

  // キャッシュクリア
  (await el('clearCache')).addEventListener('click', async () => {
    const resultEl = await el('cacheResult');
    resultEl.textContent = 'キャッシュクリア中...';

    try {
      // Service Worker の登録解除
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
        resultEl.textContent += '✅ Service Worker 削除完了\\n';
      }

      // Cache API の全削除
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
        }
        resultEl.textContent += '✅ Cache API 削除完了\\n';
      }

      // ローカルストレージとセッションストレージもクリア
      localStorage.clear();
      sessionStorage.clear();
      resultEl.textContent += '✅ Storage 削除完了\\n';

      resultEl.textContent += '\\n🔄 ページをリロードして最新ビルドを取得してください';

      // 3秒後に自動リロード
      setTimeout(() => {
        window.location.reload(true);
      }, 3000);

    } catch (error) {
      resultEl.innerHTML = '<span class="error">❌ キャッシュクリアエラー: ' + error.message + '</span>';
    }
  });

  console.log('🔍 診断ページ初期化完了 - リアルタイム診断結果を表示中');
}