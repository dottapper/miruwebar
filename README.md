# miru-WebAR

## ドキュメント運用

- 変更で UI/UX に影響がある場合は、必ず本 README も更新し、スクリーンショットを添付
- 仕様や方針の決定は `docs/` の ADR（簡易決定記録）に追記（テンプレは `docs/adr/TEMPLATE.md`）
- 新規ルートやページを追加した場合は、`docs/routes.md` に反映

## 通知ルール（重要）

- デザインに影響が波及する変更時は、PR で @dottapper にメンションし、ラベル `design-impact` を付与
- アラート送信は PR 作成時点で行い、承認が得られるまでマージ禁止
- クリティカル変更（スタート画面/共通スタイル/主要導線）は、事前に Issue を立てて合意を取る

## 開発

- 起動: `npm run dev`
- ビルド: `npm run build`
- プレビュー: `npm run preview`

詳細な貢献ルールは `CONTRIBUTING.md` を参照してください。

## トラブルシューティング

### ブランチ復旧手順（重要）

問題が発生して「一個前に戻したい！」と思った場合：

```bash
# 1. 現在のブランチを確認
git branch

# 2. indexeddb-storage-refactorブランチに戻る
git checkout indexeddb-storage-refactor

# 3. リモートの最新状態を取得
git pull origin indexeddb-storage-refactor

# 4. 動作確認
npm run dev
```

**注意**: mainブランチに戻るのではなく、必ず `indexeddb-storage-refactor` ブランチに戻ってください。mainブランチは古い状態のため、最新の機能が含まれていません。

### よくある問題

- **アプリが起動しない**: `indexeddb-storage-refactor` ブランチに戻る
- **機能が動作しない**: 依存関係を再インストール `npm install`
- **スタイルが崩れている**: ブラウザのキャッシュをクリア
