# miru-WebAR

あなただけの 3D 世界を現実に。エディタで制作 → 保存 → QR 配布 → 実機 AR 表示までを、ローカル開発で一気通貫に体験できます。

## ドキュメント運用（統一ルール）

- 仕様/方針の決定: `docs/adr/` に ADR を追加（テンプレ: `docs/adr/TEMPLATE.md`）
- ルート追加/変更: `docs/routes.md` を更新（ハッシュルート名と画面概要）
- UI/UX 影響: 本 README を更新し、必要であればスクリーンショットを添付
- PR 運用/承認: `CONTRIBUTING.md`（必読）と `CODEOWNERS` に従うこと

## クイックスタート

- 開発サーバー（Vite + 内蔵API）: `npm run dev`
- 本番ビルド: `npm run build`
- ビルドプレビュー: `npm run preview`
- シンプル静的サーバー（ビルド→配信）: `npm run start`

推奨の開発フローは Vite です。Vite の開発サーバーが API を提供するため、別サーバーの起動は不要です（下記参照）。

## サーバー構成（一本化の方針）

- 開発時は Vite のプラグインが API を提供します。
  - `GET /api/network-info`: 端末 IP 検出（`vite/plugins/networkInfo.js`）
  - `GET /projects/:id/project.json`: 公開済み `project.json` 配信（`vite/plugins/projectsStatic.js`）
  - `POST /api/projects/:id/save`: `project.json` 保存（`vite/plugins/projectsApi.js`）
  - `POST /api/publish-project`: モデル(GLB)と `project.json` を `public/projects/<id>/` に保存
- `server/simple-server.js` と `server/app.js` はレガシー/検証用です。通常は使用しません。
  - どうしても単体 Node で配信したい場合のみ `npm run start` を使用（`dist/` を配信）。

注意: モバイルのカメラ権限は原則 HTTPS が必要です。Vite は `@vitejs/plugin-basic-ssl` により自己署名証明書で HTTPS を提供します。スマホ初回アクセス時は証明書の許可が必要です。

## 制作から実機表示まで（標準手順）

1) `npm run dev` を起動。端末 IP は `GET /api/network-info` で検出され、UI からも表示されます。
2) エディタでプロジェクト作成 → 保存。
3) QR 表示から「公開」すると、`/api/publish-project` で `public/projects/<id>/` に `project.json` と GLB が書き出されます。
4) スマホで QR を読み取り、`#/viewer?src=.../projects/<id>/project.json` を開くと表示できます。

ヒント（ネットワーク/HTTPS）:
- `network-info` が `localhost` の場合は「同一端末のみ」アクセス可能です。実機では PC とスマホを同一ネットワークに接続してください。
- iOS/Safari は HTTP ページでカメラが使えないため、HTTPS でアクセスしてください。

## ブランチ運用（重要）

- メインブランチ: `indexeddb-storage-refactor`（最新の機能を含む）
- 直コミット禁止。feature ブランチ → PR → 承認後にマージ。

ブランチ復旧の手順:

```bash
# 現在のブランチを確認
git branch

# 最新ブランチへ戻る
git checkout indexeddb-storage-refactor
git pull origin indexeddb-storage-refactor

# 起動
npm run dev
```

## Vite 開発サーバーの構成（要点）

- `vite.config.js`: サーバー設定とプラグイン読み込み
- `vite/plugins/networkInfo.js`: `GET /api/network-info`
- `vite/plugins/projectsStatic.js`: `GET /projects/:id/project.json`
- `vite/plugins/projectsApi.js`: `POST /api/projects/:id/save`, `POST /api/publish-project`
- `vite/utils/network.js`: ネットワーク IP 検出

## トラブルシューティング

- アプリが起動しない: `indexeddb-storage-refactor` ブランチに戻る
- 機能が動作しない: `npm install` で依存を再取得
- スタイル崩れ: ブラウザキャッシュをクリア
- 実機でカメラが起動しない: HTTPS でアクセスしているか確認（自己署名証明書の許可が必要）

詳細な貢献ルールは `CONTRIBUTING.md` を参照してください。

