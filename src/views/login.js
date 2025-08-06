// src/views/login.js
export default function showLogin(container) {
  container.innerHTML = `
    <section class="gate">
      <h1>miru-webAR</h1>
      <p class="sub">あなたの3Dを現実へ</p>

      <div class="card">
        <h2>ログインは不要です</h2>
        <ul>
          <li>このツールはブラウザ内で動作します。</li>
          <li>メール・パスワードの収集は行いません。</li>
          <li>読み込んだGLB/画像は端末内で処理され、サーバー保存はしません。</li>
          <li>QRコードでARコンテンツを共有できます。</li>
          <li>外部URL読み込み時のCORS・著作権管理はご自身でご確認ください。</li>
          <li>サポートは <a href="/discord" target="_blank" rel="noopener">Discord</a> のみです。</li>
        </ul>
        <div class="actions">
          <a class="btn primary" href="#/projects">今すぐはじめる</a>
          <a class="btn" href="#/usage-guide">使い方を見る</a>
        </div>
        <p class="small">※ ベータ版のため予告なく仕様変更・停止することがあります。重要データは必ずバックアップしてください。</p>
      </div>
    </section>
  `;
}