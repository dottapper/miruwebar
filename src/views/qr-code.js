import { showQRCodeModal } from '../components/ui.js';
import { getProject } from '../storage/project-store.js';

/**
 * QRコード生成ページ。
 *
 * 設計指針 (docs/single-operator-cloud-release-tasks.md Phase 4):
 *   - 「公開Release URL」(クライアント納品用) と「開発用URL」(LAN/トンネル)
 *     を画面上で明確に分け、混同しないようにする。
 *   - 公開Release URLは releaseId と publishedAt を必ず併記する。
 *   - 未公開のプロジェクトでは「公開Release URL」セクションは「未公開」を明示し、
 *     その状態でQRを発行できないようにする。
 */
export default function showQRCode(container) {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const modelName = urlParams.get('model') || projectId;

  container.innerHTML = `
    <div class="qr-page">
      <div class="page-header">
        <h1>QRコード</h1>
        <p>クライアントに渡すQRは「公開Release URL」のみ。開発用URLは社内テスト用です。</p>
      </div>

      <section class="qr-section qr-release">
        <h2>🚀 公開Release URL（クライアント納品用）</h2>
        <div id="release-info" class="qr-release-info">読み込み中…</div>
        <button id="open-release-qr" class="btn-primary" disabled>
          公開Release URL のQRを表示
        </button>
      </section>

      <section class="qr-section qr-dev">
        <h2>🔧 開発用URL（社内テスト）</h2>
        <p class="qr-dev-note">同一Wi-Fiまたはトンネル経由で、下書き状態を実機確認するためのものです。クライアントには渡さないでください。</p>
        <button id="open-dev-qr" class="btn-secondary">
          開発用URLのQRを表示
        </button>
      </section>

      <div class="back-button-container">
        <button id="back-to-editor" class="btn-back">← エディタに戻る</button>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .qr-page { padding: 2rem; max-width: 720px; margin: 0 auto; }
    .page-header { text-align: center; margin-bottom: 2rem; }
    .page-header h1 { color: var(--color-primary); margin-bottom: 0.5rem; }
    .qr-section {
      background: rgba(0,0,0,0.05);
      border: 1px solid var(--color-border, rgba(0,0,0,0.1));
      padding: 1.25rem 1.5rem;
      border-radius: 10px;
      margin-bottom: 1.5rem;
    }
    .qr-section h2 { margin: 0 0 0.75rem; font-size: 1.1rem; }
    .qr-release { border-left: 4px solid var(--color-primary, #7C4DFF); }
    .qr-dev { border-left: 4px solid #888; }
    .qr-dev-note { font-size: 0.85rem; color: var(--color-text-secondary); margin: 0 0 0.75rem; }
    .qr-release-info { margin: 0 0 0.75rem; font-size: 0.9rem; line-height: 1.5; }
    .qr-release-info.unpublished { color: var(--color-text-secondary); }
    .qr-release-info dl { display: grid; grid-template-columns: 8em 1fr; gap: 0.3rem 0.6rem; margin: 0; }
    .qr-release-info dt { color: var(--color-text-secondary); font-size: 0.82rem; }
    .qr-release-info dd { margin: 0; font-family: monospace; font-size: 0.82rem; word-break: break-all; }
    .qr-section button { padding: 0.65rem 1.2rem; font-size: 0.95rem; }
    .back-button-container { text-align: center; margin-top: 1rem; }
    .btn-back {
      background: transparent;
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border);
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
    }
    .btn-back:hover { background: rgba(0,0,0,0.05); }
  `;
  document.head.appendChild(style);

  const releaseInfoEl = container.querySelector('#release-info');
  const releaseButton = container.querySelector('#open-release-qr');
  const devButton = container.querySelector('#open-dev-qr');
  const backButton = container.querySelector('#back-to-editor');

  renderReleaseInfo(projectId, releaseInfoEl, releaseButton);

  releaseButton.addEventListener('click', async () => {
    try {
      await showQRCodeModal({ modelName, defaultMethod: 'release' });
    } catch (error) {
      console.error('❌ QRコードモーダル表示エラー:', error);
      alert('QRコードの生成に失敗しました。');
    }
  });

  devButton.addEventListener('click', async () => {
    try {
      await showQRCodeModal({ modelName, defaultMethod: 'lan' });
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

function renderReleaseInfo(projectId, infoEl, buttonEl) {
  if (!projectId) {
    infoEl.className = 'qr-release-info unpublished';
    infoEl.textContent = 'プロジェクトが指定されていません（URL に ?id=... が必要）。';
    return;
  }

  const project = getProject(projectId);
  const release = project?.publishInfo?.release;

  if (!release?.viewerUrl) {
    infoEl.className = 'qr-release-info unpublished';
    infoEl.textContent = '未公開です。エディタで「公開リリースを作成」してから戻ってきてください。';
    return;
  }

  const publishedAt = release.publishedAt
    ? new Date(release.publishedAt).toLocaleString()
    : '不明';

  infoEl.className = 'qr-release-info';
  infoEl.innerHTML = `
    <dl>
      <dt>Release ID</dt><dd>${escapeText(release.releaseId || '(none)')}</dd>
      <dt>公開日時</dt><dd>${escapeText(publishedAt)}</dd>
      <dt>Viewer URL</dt><dd>${escapeText(release.viewerUrl)}</dd>
    </dl>
  `;
  buttonEl.disabled = false;
}

function escapeText(value) {
  const s = String(value ?? '');
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
