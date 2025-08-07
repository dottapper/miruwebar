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
  
  // 本来の使い方ガイドデザイン（ヘッダーが隠れない設計）
  container.innerHTML = `
    <div style="
      width: 100%;
      min-height: 100vh;
      background-color: #121212;
      color: #ffffff;
      font-family: 'Inter', Arial, sans-serif;
      padding: 6rem 2rem 2rem 2rem;
      box-sizing: border-box;
    ">
      <div style="
        max-width: 1000px;
        margin: 0 auto;
      ">
        <!-- ヘッダー -->
        <header style="
          text-align: center;
          margin-bottom: 4rem;
          padding-top: 2rem;
        ">
          <h1 style="
            font-size: 3.5rem;
            font-weight: 700;
            margin: 0 0 1rem 0;
            background: linear-gradient(135deg, #7C4DFF, #00BCD4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            color: transparent;
          ">使い方ガイド</h1>
          <p style="
            font-size: 1.2rem;
            color: #B0B0B0;
            margin: 0;
            font-weight: 300;
          ">miru-webARの基本的な使い方をご紹介します</p>
        </header>

        <!-- セクション1: ARコンテンツの作成 -->
        <section style="
          background: rgba(36, 36, 36, 0.8);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 3rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        ">
          <h2 style="
            font-size: 1.8rem;
            font-weight: 600;
            color: #ffffff;
            margin: 0 0 2rem 0;
            display: flex;
            align-items: center;
            gap: 1rem;
          ">
            <span style="
              width: 4px;
              height: 2rem;
              background: linear-gradient(135deg, #7C4DFF, #00BCD4);
              border-radius: 2px;
            "></span>
            1. ARコンテンツの作成
          </h2>
          
          <div style="
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            align-items: start;
          ">
            <div style="
              background: rgba(18, 18, 18, 0.7);
              border: 2px dashed #444444;
              border-radius: 8px;
              padding: 3rem 2rem;
              text-align: center;
              min-height: 200px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 1rem;
            ">
              <div style="font-size: 3rem; opacity: 0.6;">📹</div>
              <p style="color: #B0B0B0; margin: 0;">動画を準備中...</p>
              <a href="https://youtu.be/xxxxx" target="_blank" style="
                color: #7C4DFF;
                text-decoration: none;
                font-weight: 500;
                padding: 0.5rem 1rem;
                border: 1px solid #7C4DFF;
                border-radius: 4px;
                transition: all 0.2s ease;
              ">YouTubeで見る →</a>
            </div>
            
            <div>
              <h3 style="
                font-size: 1.2rem;
                font-weight: 600;
                color: #ffffff;
                margin: 0 0 0.8rem 0;
              ">ステップ1: ARタイプの選択</h3>
              <ul style="
                list-style: none;
                padding: 0;
                margin: 0 0 1.5rem 0;
              ">
                <li style="
                  position: relative;
                  padding: 0.4rem 0 0.4rem 1.5rem;
                  color: #B0B0B0;
                  line-height: 1.6;
                ">
                  <span style="
                    position: absolute;
                    left: 0;
                    color: #7C4DFF;
                    font-weight: bold;
                  ">→</span>
                  マーカー型AR: 画像マーカーを使用
                </li>
                <li style="
                  position: relative;
                  padding: 0.4rem 0 0.4rem 1.5rem;
                  color: #B0B0B0;
                  line-height: 1.6;
                ">
                  <span style="
                    position: absolute;
                    left: 0;
                    color: #7C4DFF;
                    font-weight: bold;
                  ">→</span>
                  マーカーレス型AR: 平面検出を使用
                </li>
              </ul>
              
              <h3 style="
                font-size: 1.2rem;
                font-weight: 600;
                color: #ffffff;
                margin: 0 0 0.8rem 0;
              ">ステップ2: 3Dモデルのアップロード</h3>
              <ul style="
                list-style: none;
                padding: 0;
                margin: 0 0 1.5rem 0;
              ">
                <li style="
                  position: relative;
                  padding: 0.4rem 0 0.4rem 1.5rem;
                  color: #B0B0B0;
                  line-height: 1.6;
                ">
                  <span style="
                    position: absolute;
                    left: 0;
                    color: #7C4DFF;
                    font-weight: bold;
                  ">→</span>
                  GLBファイルをドラッグ&ドロップ
                </li>
                <li style="
                  position: relative;
                  padding: 0.4rem 0 0.4rem 1.5rem;
                  color: #B0B0B0;
                  line-height: 1.6;
                ">
                  <span style="
                    position: absolute;
                    left: 0;
                    color: #7C4DFF;
                    font-weight: bold;
                  ">→</span>
                  またはファイル選択ボタンでアップロード
                </li>
                <li style="
                  position: relative;
                  padding: 0.4rem 0 0.4rem 1.5rem;
                  color: #B0B0B0;
                  line-height: 1.6;
                ">
                  <span style="
                    position: absolute;
                    left: 0;
                    color: #7C4DFF;
                    font-weight: bold;
                  ">→</span>
                  アニメーション付きモデルも対応
                </li>
              </ul>

              <h3 style="
                font-size: 1.2rem;
                font-weight: 600;
                color: #ffffff;
                margin: 0 0 0.8rem 0;
              ">ステップ3: 位置とサイズの調整</h3>
              <ul style="
                list-style: none;
                padding: 0;
                margin: 0;
              ">
                <li style="
                  position: relative;
                  padding: 0.4rem 0 0.4rem 1.5rem;
                  color: #B0B0B0;
                  line-height: 1.6;
                ">
                  <span style="
                    position: absolute;
                    left: 0;
                    color: #7C4DFF;
                    font-weight: bold;
                  ">→</span>
                  マウスでドラッグして位置を調整
                </li>
                <li style="
                  position: relative;
                  padding: 0.4rem 0 0.4rem 1.5rem;
                  color: #B0B0B0;
                  line-height: 1.6;
                ">
                  <span style="
                    position: absolute;
                    left: 0;
                    color: #7C4DFF;
                    font-weight: bold;
                  ">→</span>
                  スケールスライダーでサイズを変更
                </li>
                <li style="
                  position: relative;
                  padding: 0.4rem 0 0.4rem 1.5rem;
                  color: #B0B0B0;
                  line-height: 1.6;
                ">
                  <span style="
                    position: absolute;
                    left: 0;
                    color: #7C4DFF;
                    font-weight: bold;
                  ">→</span>
                  回転ツールで向きを調整
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- セクション2: ローディング画面のカスタマイズ -->
        <section style="
          background: rgba(36, 36, 36, 0.8);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 3rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        ">
          <h2 style="
            font-size: 1.8rem;
            font-weight: 600;
            color: #ffffff;
            margin: 0 0 2rem 0;
            display: flex;
            align-items: center;
            gap: 1rem;
          ">
            <span style="
              width: 4px;
              height: 2rem;
              background: linear-gradient(135deg, #7C4DFF, #00BCD4);
              border-radius: 2px;
            "></span>
            2. ローディング画面のカスタマイズ
          </h2>
          
          <div style="
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            align-items: start;
          ">
            <div style="
              background: rgba(18, 18, 18, 0.7);
              border: 2px dashed #444444;
              border-radius: 8px;
              padding: 3rem 2rem;
              text-align: center;
              min-height: 200px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 1rem;
            ">
              <div style="font-size: 3rem; opacity: 0.6;">📹</div>
              <p style="color: #B0B0B0; margin: 0;">動画を準備中...</p>
            </div>
            
            <div>
              <h3 style="
                font-size: 1.2rem;
                font-weight: 600;
                color: #ffffff;
                margin: 0 0 0.8rem 0;
              ">カスタマイズ可能な項目</h3>
              <ul style="
                list-style: none;
                padding: 0;
                margin: 0;
              ">
                <li style="
                  position: relative;
                  padding: 0.4rem 0 0.4rem 1.5rem;
                  color: #B0B0B0;
                  line-height: 1.6;
                ">
                  <span style="
                    position: absolute;
                    left: 0;
                    color: #7C4DFF;
                    font-weight: bold;
                  ">→</span>
                  背景色とテキスト色
                </li>
                <li style="
                  position: relative;
                  padding: 0.4rem 0 0.4rem 1.5rem;
                  color: #B0B0B0;
                  line-height: 1.6;
                ">
                  <span style="
                    position: absolute;
                    left: 0;
                    color: #7C4DFF;
                    font-weight: bold;
                  ">→</span>
                  ロゴ画像のアップロード
                </li>
                <li style="
                  position: relative;
                  padding: 0.4rem 0 0.4rem 1.5rem;
                  color: #B0B0B0;
                  line-height: 1.6;
                ">
                  <span style="
                    position: absolute;
                    left: 0;
                    color: #7C4DFF;
                    font-weight: bold;
                  ">→</span>
                  メッセージテキストの変更
                </li>
                <li style="
                  position: relative;
                  padding: 0.4rem 0 0.4rem 1.5rem;
                  color: #B0B0B0;
                  line-height: 1.6;
                ">
                  <span style="
                    position: absolute;
                    left: 0;
                    color: #7C4DFF;
                    font-weight: bold;
                  ">→</span>
                  プログレスバーの表示/非表示
                </li>
                <li style="
                  position: relative;
                  padding: 0.4rem 0 0.4rem 1.5rem;
                  color: #B0B0B0;
                  line-height: 1.6;
                ">
                  <span style="
                    position: absolute;
                    left: 0;
                    color: #7C4DFF;
                    font-weight: bold;
                  ">→</span>
                  テンプレートの保存と管理
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- セクション3: QRコードでの共有 -->
        <section style="
          background: rgba(36, 36, 36, 0.8);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 3rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        ">
          <h2 style="
            font-size: 1.8rem;
            font-weight: 600;
            color: #ffffff;
            margin: 0 0 2rem 0;
            display: flex;
            align-items: center;
            gap: 1rem;
          ">
            <span style="
              width: 4px;
              height: 2rem;
              background: linear-gradient(135deg, #7C4DFF, #00BCD4);
              border-radius: 2px;
            "></span>
            3. QRコードでの共有
          </h2>
          
          <div style="
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            align-items: start;
          ">
            <div style="
              background: rgba(18, 18, 18, 0.7);
              border: 2px dashed #444444;
              border-radius: 8px;
              padding: 3rem 2rem;
              text-align: center;
              min-height: 200px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 1rem;
            ">
              <div style="font-size: 3rem; opacity: 0.6;">📹</div>
              <p style="color: #B0B0B0; margin: 0;">動画を準備中...</p>
            </div>
            
            <div>
              <h3 style="
                font-size: 1.2rem;
                font-weight: 600;
                color: #ffffff;
                margin: 0 0 0.8rem 0;
              ">共有の手順</h3>
              <ul style="
                list-style: none;
                padding: 0;
                margin: 0 0 1.5rem 0;
              ">
                <li style="
                  position: relative;
                  padding: 0.4rem 0 0.4rem 1.5rem;
                  color: #B0B0B0;
                  line-height: 1.6;
                ">
                  <span style="
                    position: absolute;
                    left: 0;
                    color: #7C4DFF;
                    font-weight: bold;
                  ">→</span>
                  プロジェクトを保存
                </li>
                <li style="
                  position: relative;
                  padding: 0.4rem 0 0.4rem 1.5rem;
                  color: #B0B0B0;
                  line-height: 1.6;
                ">
                  <span style="
                    position: absolute;
                    left: 0;
                    color: #7C4DFF;
                    font-weight: bold;
                  ">→</span>
                  QRコードを生成
                </li>
                <li style="
                  position: relative;
                  padding: 0.4rem 0 0.4rem 1.5rem;
                  color: #B0B0B0;
                  line-height: 1.6;
                ">
                  <span style="
                    position: absolute;
                    left: 0;
                    color: #7C4DFF;
                    font-weight: bold;
                  ">→</span>
                  PNG画像としてダウンロード
                </li>
                <li style="
                  position: relative;
                  padding: 0.4rem 0 0.4rem 1.5rem;
                  color: #B0B0B0;
                  line-height: 1.6;
                ">
                  <span style="
                    position: absolute;
                    left: 0;
                    color: #7C4DFF;
                    font-weight: bold;
                  ">→</span>
                  スマートフォンでスキャンしてAR体験
                </li>
              </ul>
              
              <h3 style="
                font-size: 1.2rem;
                font-weight: 600;
                color: #ffffff;
                margin: 0 0 0.8rem 0;
              ">対応デバイス</h3>
              <ul style="
                list-style: none;
                padding: 0;
                margin: 0;
              ">
                <li style="
                  position: relative;
                  padding: 0.4rem 0 0.4rem 1.5rem;
                  color: #B0B0B0;
                  line-height: 1.6;
                ">
                  <span style="
                    position: absolute;
                    left: 0;
                    color: #7C4DFF;
                    font-weight: bold;
                  ">→</span>
                  iOS: Safari（ARKit対応）
                </li>
                <li style="
                  position: relative;
                  padding: 0.4rem 0 0.4rem 1.5rem;
                  color: #B0B0B0;
                  line-height: 1.6;
                ">
                  <span style="
                    position: absolute;
                    left: 0;
                    color: #7C4DFF;
                    font-weight: bold;
                  ">→</span>
                  Android: Chrome（ARCore対応）
                </li>
                <li style="
                  position: relative;
                  padding: 0.4rem 0 0.4rem 1.5rem;
                  color: #B0B0B0;
                  line-height: 1.6;
                ">
                  <span style="
                    position: absolute;
                    left: 0;
                    color: #7C4DFF;
                    font-weight: bold;
                  ">→</span>
                  その他: WebAR対応ブラウザ
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- セクション4: よくある質問 -->
        <section style="
          background: rgba(36, 36, 36, 0.8);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 3rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        ">
          <h2 style="
            font-size: 1.8rem;
            font-weight: 600;
            color: #ffffff;
            margin: 0 0 2rem 0;
            display: flex;
            align-items: center;
            gap: 1rem;
          ">
            <span style="
              width: 4px;
              height: 2rem;
              background: linear-gradient(135deg, #7C4DFF, #00BCD4);
              border-radius: 2px;
            "></span>
            4. よくある質問
          </h2>
          
          <div style="
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          ">
            <div style="
              background: rgba(18, 18, 18, 0.5);
              border-radius: 8px;
              padding: 1.5rem;
              border-left: 4px solid #7C4DFF;
            ">
              <h3 style="
                font-size: 1.1rem;
                font-weight: 600;
                color: #ffffff;
                margin: 0 0 0.8rem 0;
              ">Q: どのような3Dファイルが使えますか？</h3>
              <p style="
                color: #B0B0B0;
                line-height: 1.6;
                margin: 0;
              ">A: GLB形式のファイルに対応しています。Blender、Maya、3ds Maxなどで作成したモデルをGLB形式でエクスポートしてご利用ください。</p>
            </div>
            
            <div style="
              background: rgba(18, 18, 18, 0.5);
              border-radius: 8px;
              padding: 1.5rem;
              border-left: 4px solid #7C4DFF;
            ">
              <h3 style="
                font-size: 1.1rem;
                font-weight: 600;
                color: #ffffff;
                margin: 0 0 0.8rem 0;
              ">Q: ファイルサイズの制限はありますか？</h3>
              <p style="
                color: #B0B0B0;
                line-height: 1.6;
                margin: 0;
              ">A: ブラウザの容量制限により、大きなファイルは処理に時間がかかる場合があります。推奨サイズは50MB以下です。</p>
            </div>
            
            <div style="
              background: rgba(18, 18, 18, 0.5);
              border-radius: 8px;
              padding: 1.5rem;
              border-left: 4px solid #7C4DFF;
            ">
              <h3 style="
                font-size: 1.1rem;
                font-weight: 600;
                color: #ffffff;
                margin: 0 0 0.8rem 0;
              ">Q: データはどこに保存されますか？</h3>
              <p style="
                color: #B0B0B0;
                line-height: 1.6;
                margin: 0;
              ">A: すべてのデータはお使いのブラウザ内（IndexedDB）に保存されます。サーバーには一切送信されません。</p>
            </div>
            
            <div style="
              background: rgba(18, 18, 18, 0.5);
              border-radius: 8px;
              padding: 1.5rem;
              border-left: 4px solid #7C4DFF;
            ">
              <h3 style="
                font-size: 1.1rem;
                font-weight: 600;
                color: #ffffff;
                margin: 0 0 0.8rem 0;
              ">Q: スマートフォンでAR体験するには？</h3>
              <p style="
                color: #B0B0B0;
                line-height: 1.6;
                margin: 0;
              ">A: 生成されたQRコードをスマートフォンのカメラでスキャンするか、QRコードリーダーアプリを使用してください。</p>
            </div>
          </div>
        </section>

        <!-- フッター -->
        <footer style="
          margin-top: 4rem;
          padding-top: 2rem;
          border-top: 1px solid #444444;
          text-align: center;
        ">
          <div style="
            display: flex;
            gap: 1rem;
            justify-content: center;
            margin-bottom: 1.5rem;
            flex-wrap: wrap;
          ">
            <button onclick="window.location.hash='#/select-ar'" style="
              padding: 1rem 2rem;
              border-radius: 8px;
              font-size: 1rem;
              font-weight: 600;
              border: none;
              cursor: pointer;
              background: linear-gradient(135deg, #7C4DFF, #4A148C);
              color: white;
              min-width: 150px;
              transition: all 0.3s ease;
            ">今すぐ試す</button>
            <button onclick="window.location.hash='#/login'" style="
              padding: 1rem 2rem;
              border-radius: 8px;
              font-size: 1rem;
              font-weight: 600;
              border: 2px solid #444444;
              cursor: pointer;
              background: transparent;
              color: #ffffff;
              min-width: 150px;
              transition: all 0.3s ease;
            ">トップに戻る</button>
          </div>
          <p style="
            color: #B0B0B0;
            font-size: 0.9rem;
            margin: 0;
            line-height: 1.5;
          ">
            サポートが必要な場合は <a href="/discord" target="_blank" style="color: #7C4DFF; text-decoration: none;">Discord</a> でお気軽にお声がけください。
          </p>
        </footer>
      </div>
    </div>

    <!-- モバイル対応のCSS -->
    <style>
      @media (max-width: 768px) {
        /* モバイル用のレスポンシブ調整 */
        .usage-guide-grid {
          grid-template-columns: 1fr !important;
          gap: 1.5rem !important;
        }
      }
    </style>
  `;
  
  // グリッド要素にクラスを追加（モバイル対応）
  const grids = container.querySelectorAll('div[style*="grid-template-columns: 1fr 1fr"]');
  grids.forEach(grid => {
    grid.className = 'usage-guide-grid';
  });
  
  // スクロールをトップに
  window.scrollTo(0, 0);
  
  return function cleanup() {
    console.log('Usage guide cleanup');
  };
}// Force update #午後
