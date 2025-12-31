# Vercelデプロイ手順

このドキュメントでは、ミルウェブARプロジェクトをVercelにデプロイしてテストする方法を説明します。

## 📋 前提条件

- Vercelアカウント（無料で作成可能: https://vercel.com）
- Gitリポジトリ（GitHub、GitLab、Bitbucketなど）
- Node.js 18以上がインストールされていること

## 🚀 デプロイ手順

### 1. リポジトリをGitHubにプッシュ（未の場合）

```bash
git add .
git commit -m "Vercelデプロイ用の設定を追加"
git push origin main
```

### 2. Vercelにプロジェクトをインポート

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. 「Add New...」→「Project」をクリック
3. リポジトリを選択またはインポート
4. プロジェクト設定を確認：
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (プロジェクトルート)
   - **Build Command**: `npm run build` (自動検出されるはず)
   - **Output Directory**: `dist` (自動検出されるはず)
   - **Install Command**: `npm install` (自動検出されるはず)

### 3. 環境変数（必要な場合）

現在の実装では、特別な環境変数は不要です。将来的にVercel Blob Storageを使用する場合は、環境変数の設定が必要になります。

### 4. デプロイ実行

「Deploy」ボタンをクリックしてデプロイを開始します。数分で完了します。

## ⚠️ 現在の制限事項

### ファイル保存機能の制限

VercelのServerless Functionsでは、ファイルシステムへの永続的な書き込みができません。現在の実装では以下の制限があります：

1. **`/tmp`への一時保存のみ**
   - `/tmp`ディレクトリへの書き込みは可能ですが、**永続化されません**
   - 関数の実行が終わると、ファイルは削除される可能性があります
   - 実際のファイル配信はできません

2. **`public/projects/`配下のファイル**
   - ビルド時に存在するファイルのみ配信されます
   - デプロイ後にAPI経由で生成されたファイルは配信されません

### 影響を受ける機能

- ❌ **プロジェクト保存API** (`POST /api/projects/:id/save`)
  - ファイルは保存されますが、実際の配信はできません
  - テスト用として動作しますが、永続化されません

- ❌ **プロジェクト公開API** (`POST /api/publish-project`)
  - ファイルは保存されますが、実際の配信はできません
  - QRコード生成時に返されるURLは動作しません

- ✅ **ネットワーク情報API** (`GET /api/network-info`)
  - 正常に動作します（リクエストヘッダーから情報を取得）

### 動作する機能

- ✅ **クライアント側の保存機能**（IndexedDB / localStorage）
  - ブラウザ内での保存・読み込みは正常に動作します
  - プロジェクト一覧の表示・編集は問題なく動作します

- ✅ **ARビューア機能**
  - ARコンテンツの表示は正常に動作します
  - ローカルストレージからモデルを読み込む機能は動作します

## 🔧 改善案

### 推奨: Vercel Blob Storageを使用

より本格的なテストを行う場合は、Vercel Blob Storageを使用してファイルを永続的に保存できます。

1. **Vercel Blob Storageのセットアップ**
   ```bash
   npm install @vercel/blob
   ```

2. **環境変数の設定**
   - Vercel Dashboard → Project Settings → Environment Variables
   - `BLOB_READ_WRITE_TOKEN` を設定（Vercelが自動生成）

3. **Serverless Functionsの更新**
   - `api/projects/[id]/save.js` と `api/publish-project.js` を更新
   - `@vercel/blob` を使用してファイルを保存

詳細は [Vercel Blob Storage ドキュメント](https://vercel.com/docs/storage/vercel-blob) を参照してください。

### 代替案: クライアント側でBlob URLを生成

QRコード生成時に、プロジェクトデータをBlob URLとして生成し、クライアント側で保存する方法もあります。この場合、サーバー側のファイル保存は不要になります。

## 📝 ローカル開発との違い

| 機能 | ローカル開発 | Vercelデプロイ |
|------|------------|--------------|
| プロジェクト保存（IndexedDB） | ✅ 動作 | ✅ 動作 |
| プロジェクト保存（API経由） | ✅ 動作 | ⚠️ 一時保存のみ |
| プロジェクト公開（API経由） | ✅ 動作 | ⚠️ 一時保存のみ |
| ARビューア | ✅ 動作 | ✅ 動作 |
| ネットワーク情報取得 | ✅ 動作 | ✅ 動作（制限あり） |

## 🧪 テスト方法

### 1. 基本動作確認

1. Vercelにデプロイ後、提供されたURLにアクセス
2. プロジェクト一覧が表示されることを確認
3. プロジェクトを編集して、保存（IndexedDB）が動作することを確認

### 2. ARビューアの確認

1. プロジェクトを開く
2. ARビューアが正常に表示されることを確認
3. モデルが正しく読み込まれることを確認

### 3. API動作の確認（制限あり）

1. ブラウザの開発者ツールを開く
2. NetworkタブでAPIリクエストを確認
3. `/api/projects/:id/save` や `/api/publish-project` は成功レスポンスを返しますが、実際のファイル配信はできません

## 🐛 トラブルシューティング

### ビルドエラーが発生する場合

```bash
# ローカルでビルドをテスト
npm run build

# エラーが発生した場合は、エラーメッセージを確認
# 依存関係の問題の場合は、node_modulesを再インストール
rm -rf node_modules package-lock.json
npm install
```

### APIエンドポイントが404を返す場合

1. `api/`ディレクトリが正しく配置されていることを確認
2. `vercel.json`の設定を確認
3. Vercel Dashboardの「Functions」タブで、デプロイされた関数を確認

### CORSエラーが発生する場合

`vercel.json`のCORS設定を確認してください。現在の設定では、すべてのオリジンからのアクセスが許可されています。

## 📚 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)

## 🔄 ローカル開発に戻る場合

ローカル開発時には、Viteプラグインが使用されます。`api/`ディレクトリのServerless Functionsは、Vercel環境でのみ動作します。

ローカル開発を開始するには：

```bash
npm run dev
```

Viteプラグイン（`vite/plugins/`）が自動的にAPIエンドポイントを提供します。

