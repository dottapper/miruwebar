/**
 * バージョン情報モーダルを表示する関数
 * 最新のバージョン情報と更新履歴を表示します
 */
export function showVersionInfoModal() {
  // 既存のモーダルがあれば削除
  const existingModal = document.querySelector('.version-modal-overlay');
  if (existingModal) {
    document.body.removeChild(existingModal);
  }

  // バージョン情報
  const versionInfo = {
    version: '0.9.6 beta',
    releaseDate: '2025/04/13',
    changes: [
      {
        title: 'IndexedDBストレージ機能の大幅改善',
        items: [
          'モデルデータの効率的な保存・読み込み機能の実装',
          'メタデータ管理機能の強化',
          'ストレージ容量の最適化',
          'エラーハンドリングとリカバリー機能の追加'
        ]
      },
      {
        title: 'ARエディター機能の強化',
        items: [
          'モデル管理機能の改善',
          'リアルタイムプレビュー機能の最適化',
          'ドラッグ&ドロップ機能の安定性向上',
          'エディターUIのレスポンシブ対応強化'
        ]
      },
      {
        title: 'ローディング画面エディターの改善',
        items: [
          'イベントハンドラーの最適化',
          'プレビュー機能の安定性向上',
          '設定保存機能の改善',
          'UI/UXの一貫性向上'
        ]
      },
      {
        title: 'プロジェクト管理機能の強化',
        items: [
          'プロジェクト一覧表示の改善',
          'プロジェクトカードUIの最適化',
          'データ永続化機能の安定性向上',
          'エラーハンドリングの強化'
        ]
      }
    ],
    nextFeatures: [
      'クラウド保存機能（Google Drive/Dropbox連携）',
      'プロジェクト共有機能の強化（QRコード経由）',
      'AR体験のカスタマイズオプション拡張（アニメーション設定）',
      'プロジェクトの一括管理機能（インポート/エクスポート）',
      'リアルタイムコラボレーション機能',
      '高度な3Dモデル編集機能'
    ]
  };

  // モーダルHTML構築
  const modalHTML = `
    <div class="version-modal-overlay">
      <div class="version-modal-content">
        <div class="version-modal-header">
          <h2>MiruWebAR バージョン情報</h2>
          <button class="version-modal-close-btn">×</button>
        </div>
        <div class="version-modal-body">
          <div class="version-summary">
            <div class="version-number">バージョン: ${versionInfo.version}</div>
            <div class="version-date">リリース日: ${versionInfo.releaseDate}</div>
          </div>
          
          <div class="version-details">
            <h3>更新内容</h3>
            ${versionInfo.changes.map(category => `
              <div class="change-category">
                <h4>${category.title}</h4>
                <ul>
                  ${category.items.map(item => `<li>${item}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
          
          <div class="next-features">
            <h3>次期リリース予定機能</h3>
            <ul>
              ${versionInfo.nextFeatures.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
          </div>
        </div>
        <div class="version-modal-footer">
          <button class="version-modal-ok-btn">閉じる</button>
        </div>
      </div>
    </div>
  `;

  // DOMに追加
  const modalElement = document.createElement('div');
  modalElement.innerHTML = modalHTML;
  
  // モーダル要素を追加
  const modalNode = modalElement.firstElementChild;
  document.body.appendChild(modalNode);

  // ボタンと要素の参照を取得（追加した要素から直接取得する）
  const closeBtn = modalNode.querySelector('.version-modal-close-btn');
  const okBtn = modalNode.querySelector('.version-modal-ok-btn');

  // 閉じるボタンクリック時
  const closeModal = () => {
    document.body.removeChild(modalNode);
  };

  // イベントリスナー設定
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (okBtn) okBtn.addEventListener('click', closeModal);

  // オーバーレイクリックでも閉じられるように
  modalNode.addEventListener('click', (e) => {
    if (e.target === modalNode) {
      closeModal();
    }
  });

  console.log('Version info modal opened');
} 