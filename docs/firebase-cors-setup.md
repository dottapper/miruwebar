# Firebase Storage CORS設定

## 問題

Vercelにデプロイしたアプリから、Firebase Storageに保存されたプロジェクトファイルを読み込もうとすると、CORS（Cross-Origin Resource Sharing）エラーが発生します。

```
TypeError: Load failed
```

これは、Firebase StorageがデフォルトでCORS設定を持っていないためです。

## 解決方法

Google Cloud SDKを使用してFirebase StorageにCORS設定を適用します。

### 1. Google Cloud SDKのインストール

まだインストールしていない場合は、以下からインストールしてください：

https://cloud.google.com/sdk/docs/install

macOSの場合：
```bash
brew install google-cloud-sdk
```

### 2. Google Cloudにログイン

```bash
gcloud auth login
```

ブラウザが開くので、Firebaseプロジェクトで使用しているGoogleアカウントでログインしてください。

### 3. プロジェクトを設定

```bash
gcloud config set project miruwebar
```

### 4. CORS設定を適用

プロジェクトルートに `cors.json` ファイルがあることを確認してから、以下のコマンドを実行します：

```bash
gsutil cors set cors.json gs://miruwebar.firebasestorage.app
```

### 5. CORS設定を確認

設定が正しく適用されたか確認します：

```bash
gsutil cors get gs://miruwebar.firebasestorage.app
```

以下のような出力が表示されれば成功です：

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "maxAgeSeconds": 3600
  }
]
```

## cors.json の内容

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "maxAgeSeconds": 3600
  }
]
```

- `origin`: アクセスを許可するドメイン（`*`はすべてのドメインを許可）
- `method`: 許可するHTTPメソッド
- `maxAgeSeconds`: CORSプリフライトリクエストのキャッシュ時間

## セキュリティ強化（本番環境推奨）

本番環境では、特定のドメインのみを許可することを推奨します：

```json
[
  {
    "origin": [
      "https://miruwebar.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    "method": ["GET", "HEAD"],
    "maxAgeSeconds": 3600
  }
]
```

設定を変更した場合は、再度 `gsutil cors set` コマンドを実行してください。

## トラブルシューティング

### エラー: AccessDeniedException: 403

権限がない場合は、Firebase Consoleで自分がプロジェクトのオーナーまたは編集者になっているか確認してください。

### エラー: BucketNotFoundException

バケット名が正しいか確認してください。Firebase Storageのバケット名は通常 `[プロジェクトID].firebasestorage.app` です。

Firebase Consoleで確認：
https://console.firebase.google.com/project/miruwebar/storage
