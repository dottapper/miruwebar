// src/views/usage-guide.js
export default function showUsageGuide(container) {
  console.log('🆕 新しいusage-guide.jsが実行されています！');
  
  // 完全にクリア
  container.innerHTML = '';
  
  // bodyとappのスタイルを強制リセット
  document.body.style.display = 'block';
  document.body.style.justifyContent = 'initial';
  document.body.style.alignItems = 'initial';
  container.style.display = 'block';
  container.style.justifyContent = 'initial';
  container.style.alignItems = 'initial';
  
  // 美しいステップバイステップガイド
  container.innerHTML = `
    <div class="usage-guide-wrapper">
      <div class="usage-guide-container">
        <div class="usage-guide-hero">
          <div class="usage-guide-brand">
            <img class="usage-guide-logo" src="/assets/logo.png" alt="miru-webAR" />
            <h1 class="usage-guide-title">使い方ガイド</h1>
            <p class="usage-guide-subtitle">7分でマスター！WebAR作成の完全ガイド</p>
          </div>
          
          <div class="usage-guide-overview">
            <div class="overview-card">
              <div class="overview-icon">🚀</div>
              <div class="overview-text">
                <h3>簡単3ステップ</h3>
                <p>モデルアップロード → カスタマイズ → 公開</p>
              </div>
            </div>
            <div class="overview-card">
              <div class="overview-icon">📱</div>
              <div class="overview-text">
                <h3>スマホで体験</h3>
                <p>QRコードでARをすぐに確認</p>
              </div>
            </div>
            <div class="overview-card">
              <div class="overview-icon">🌐</div>
              <div class="overview-text">
                <h3>無料で公開</h3>
                <p>Vercel・Cloudflare Pagesで配信</p>
              </div>
            </div>
          </div>
        </div>

        <!-- STEP 1: プロジェクト開始 -->
        <section class="usage-guide-step">
          <div class="step-header">
            <div class="step-number">1</div>
            <div class="step-info">
              <h2 class="step-title">プロジェクト開始</h2>
              <p class="step-time">約1分</p>
            </div>
          </div>
          
          <div class="step-content">
            <div class="step-visual">
              <div class="visual-placeholder">
                <div class="placeholder-icon">🎯</div>
                <p>ARタイプ選択画面</p>
                <small>動画準備中...</small>
              </div>
            </div>
            
            <div class="step-details">
              <h3>ARタイプを選択</h3>
              <div class="detail-list">
                <div class="detail-item">
                  <div class="detail-icon">📷</div>
                  <div class="detail-text">
                    <strong>マーカー型AR</strong>
                    <p>画像マーカーを使用。名刺やポスターにARを重ねる</p>
                  </div>
                </div>
                <div class="detail-item">
                  <div class="detail-icon">🌍</div>
                  <div class="detail-text">
                    <strong>マーカーレス型AR</strong>
                    <p>平面検出を使用。床や机の上にARを配置</p>
                  </div>
                </div>
              </div>
              
              <div class="step-action">
                <a href="#/select-ar" class="action-button primary">今すぐ始める</a>
              </div>
            </div>
          </div>
        </section>

        <!-- STEP 2: 3Dコンテンツ追加 -->
        <section class="usage-guide-step">
          <div class="step-header">
            <div class="step-number">2</div>
            <div class="step-info">
              <h2 class="step-title">3Dコンテンツ追加</h2>
              <p class="step-time">約2分</p>
            </div>
          </div>
          
          <div class="step-content">
            <div class="step-visual">
              <div class="visual-placeholder">
                <div class="placeholder-icon">📦</div>
                <p>3Dモデルアップロード</p>
                <small>ドラッグ&ドロップ対応</small>
              </div>
            </div>
            
            <div class="step-details">
              <h3>GLBファイルをアップロード</h3>
              <div class="detail-list">
                <div class="detail-item">
                  <div class="detail-icon">⬆️</div>
                  <div class="detail-text">
                    <strong>ドラッグ&ドロップ</strong>
                    <p>GLBファイルを編集画面にドラッグするだけ</p>
                  </div>
                </div>
                <div class="detail-item">
                  <div class="detail-icon">🎨</div>
                  <div class="detail-text">
                    <strong>位置・サイズ調整</strong>
                    <p>マウス操作で直感的に調整可能</p>
                  </div>
                </div>
                <div class="detail-item">
                  <div class="detail-icon">🎬</div>
                  <div class="detail-text">
                    <strong>アニメーション対応</strong>
                    <p>Three.js対応のアニメーション付きモデル</p>
                  </div>
                </div>
              </div>
              
              <div class="pro-tip">
                <div class="tip-icon">💡</div>
                <div class="tip-content">
                  <strong>Pro Tip:</strong> Blender・Maya・3ds MaxでGLB形式にエクスポート。推奨サイズは50MB以下。
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- STEP 3: 見た目のカスタマイズ -->
        <section class="usage-guide-step">
          <div class="step-header">
            <div class="step-number">3</div>
            <div class="step-info">
              <h2 class="step-title">見た目のカスタマイズ</h2>
              <p class="step-time">約2分</p>
            </div>
          </div>
          
          <div class="step-content">
            <div class="step-visual">
              <div class="visual-placeholder">
                <div class="placeholder-icon">🎨</div>
                <p>ローディング画面エディタ</p>
                <small>リアルタイムプレビュー</small>
              </div>
            </div>
            
            <div class="step-details">
              <h3>ローディング画面をカスタマイズ</h3>
              <div class="detail-list">
                <div class="detail-item">
                  <div class="detail-icon">🎨</div>
                  <div class="detail-text">
                    <strong>色とデザイン</strong>
                    <p>背景色・テキスト色・プログレスバーを変更</p>
                  </div>
                </div>
                <div class="detail-item">
                  <div class="detail-icon">🖼️</div>
                  <div class="detail-text">
                    <strong>ロゴ追加</strong>
                    <p>会社ロゴやブランドイメージをアップロード</p>
                  </div>
                </div>
                <div class="detail-item">
                  <div class="detail-icon">📝</div>
                  <div class="detail-text">
                    <strong>メッセージ編集</strong>
                    <p>「読み込み中...」などのテキストを自由に変更</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- STEP 4: プレビュー & 共有 -->
        <section class="usage-guide-step">
          <div class="step-header">
            <div class="step-number">4</div>
            <div class="step-info">
              <h2 class="step-title">プレビュー & 共有</h2>
              <p class="step-time">約2分</p>
            </div>
          </div>
          
          <div class="step-content">
            <div class="step-visual">
              <div class="visual-placeholder">
                <div class="placeholder-icon">📱</div>
                <p>QRコード生成</p>
                <small>すぐにスマホでテスト</small>
              </div>
            </div>
            
            <div class="step-details">
              <h3>スマホでテスト・共有</h3>
              <div class="detail-list">
                <div class="detail-item">
                  <div class="detail-icon">📡</div>
                  <div class="detail-text">
                    <strong>LANプレビュー</strong>
                    <p>同じWi-Fi内でスマホから即座に確認</p>
                  </div>
                </div>
                <div class="detail-item">
                  <div class="detail-icon">📸</div>
                  <div class="detail-text">
                    <strong>QRコード生成</strong>
                    <p>PNG画像でダウンロード・印刷・SNS共有</p>
                  </div>
                </div>
                <div class="detail-item">
                  <div class="detail-icon">📤</div>
                  <div class="detail-text">
                    <strong>エクスポート</strong>
                    <p>ZIP形式で公開用ファイル一式を取得</p>
                  </div>
                </div>
              </div>
              
              <div class="compatibility-info">
                <h4>📱 対応デバイス</h4>
                <div class="device-list">
                  <div class="device-item">
                    <strong>iOS:</strong> Safari（ARKit対応）
                  </div>
                  <div class="device-item">
                    <strong>Android:</strong> Chrome（ARCore対応）
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- STEP 5: 公開方法（詳細版） -->
        <section class="usage-guide-step advanced">
          <div class="step-header">
            <div class="step-number">5</div>
            <div class="step-info">
              <h2 class="step-title">Web公開（詳細版）</h2>
              <p class="step-time">約3分</p>
            </div>
          </div>
          
          <div class="step-content">
            <div class="step-visual">
              <div class="visual-placeholder">
                <div class="placeholder-icon">🌐</div>
                <p>静的ホスティング</p>
                <small>Vercel・Cloudflare Pages</small>
              </div>
            </div>
            
            <div class="step-details">
              <h3>無料で世界中に公開</h3>
              <div class="hosting-options">
                <div class="hosting-card">
                  <div class="hosting-icon">⚡</div>
                  <div class="hosting-info">
                    <h4>Vercel</h4>
                    <p>ZIPをドラッグ&ドロップで即公開</p>
                    <a href="https://vercel.com" target="_blank" class="hosting-link">vercel.com →</a>
                  </div>
                </div>
                <div class="hosting-card">
                  <div class="hosting-icon">☁️</div>
                  <div class="hosting-info">
                    <h4>Cloudflare Pages</h4>
                    <p>高速CDN・無制限帯域幅</p>
                    <a href="https://pages.cloudflare.com" target="_blank" class="hosting-link">pages.cloudflare.com →</a>
                  </div>
                </div>
                <div class="hosting-card">
                  <div class="hosting-icon">🐙</div>
                  <div class="hosting-info">
                    <h4>GitHub Pages</h4>
                    <p>GitHubリポジトリから自動デプロイ</p>
                    <a href="https://pages.github.com" target="_blank" class="hosting-link">pages.github.com →</a>
                  </div>
                </div>
              </div>
              
              <div class="important-notes">
                <h4>⚠️ 重要な注意点</h4>
                <div class="note-list">
                  <div class="note-item">
                    <strong>CORS設定:</strong> 公開先でAccess-Control-Allow-Origin: * の設定が必要
                  </div>
                  <div class="note-item">
                    <strong>ファイルサイズ:</strong> 大容量GLBファイルはCDN配信を推奨
                  </div>
                  <div class="note-item">
                    <strong>著作権:</strong> 使用する3Dモデル・画像の著作権を確認
                  </div>
                  <div class="note-item">
                    <strong>バックアップ:</strong> Export ZIPファイルを定期的に保存
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- FAQ セクション -->
        <section class="usage-guide-faq">
          <div class="faq-header">
            <h2>よくある質問</h2>
            <p>困ったときはこちらをチェック</p>
          </div>
          
          <div class="faq-list">
            <div class="faq-item">
              <div class="faq-question">Q: どのような3Dファイルが使えますか？</div>
              <div class="faq-answer">A: GLB形式のファイルに対応しています。Blender、Maya、3ds Maxなどで作成したモデルをGLB形式でエクスポートしてご利用ください。アニメーション付きモデルも対応しています。</div>
            </div>
            
            <div class="faq-item">
              <div class="faq-question">Q: データはどこに保存されますか？</div>
              <div class="faq-answer">A: すべてのデータはお使いのブラウザ内（IndexedDB）に保存されます。サーバーには一切送信されないため安全です。ただし、ブラウザのデータを削除すると消去されるため、重要なプロジェクトは Export ZIP でバックアップを取ってください。</div>
            </div>
            
            <div class="faq-item">
              <div class="faq-question">Q: ファイルサイズの制限はありますか？</div>
              <div class="faq-answer">A: 技術的な制限はありませんが、推奨サイズは50MB以下です。大きなファイルは読み込み時間が長くなり、ユーザー体験が悪化する可能性があります。</div>
            </div>
            
            <div class="faq-item">
              <div class="faq-question">Q: スマートフォンでARが表示されません</div>
              <div class="faq-answer">A: 以下をご確認ください：1) ARKit（iOS）またはARCore（Android）対応デバイスか 2) Safari（iOS）またはChrome（Android）を使用しているか 3) カメラアクセス許可がされているか 4) HTTPSでアクセスしているか</div>
            </div>
            
            <div class="faq-item">
              <div class="faq-question">Q: 商用利用は可能ですか？</div>
              <div class="faq-answer">A: miru-webAR自体は無料で商用利用可能です。ただし、使用する3Dモデルや画像の著作権・ライセンスは各自でご確認ください。また、公開先のホスティングサービスの利用規約も併せてご確認ください。</div>
            </div>
          </div>
        </section>

        <!-- フッター -->
        <footer class="usage-guide-footer">
          <div class="footer-actions">
            <a href="#/projects" class="footer-btn primary">今すぐ作成を始める</a>
            <a href="#/login" class="footer-btn secondary">トップページに戻る</a>
          </div>
          
          <div class="footer-support">
            <p>サポートが必要な場合は<a href="mailto:support@miruwebar.com">お問い合わせ</a>ください</p>
            <p class="footer-note">miru-webARはログイン不要・PC専用・ブラウザのみで動作します</p>
          </div>
        </footer>
      </div>
    </div>
  `;
  
  // スクロールをトップに
  window.scrollTo(0, 0);
  
  return function cleanup() {
    console.log('Usage guide cleanup');
  };
}