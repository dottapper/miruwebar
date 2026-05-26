# Vercel Blob Storage実装ガイド

## 📋 概要

QRコード生成機能を正常に動作させるために、Vercel Blob Storageを使用してファイルを永続的に保存します。

## なぜVercel Blob Storageが必要か

1. **QRコードの動作要件**
   - QRコードには `?src=/projects/${id}/project.json#/viewer` のURLが含まれます
   - スマホでスキャンすると、ARビューアが `/projects/${id}/project.json` をfetchします
   - つまり、**ファイルにアクセスできる必要があります**

2. **現在の実装の制限**
   - `/tmp`への保存は一時的で、静的配信されません
   - QRコードをスキャンしても404エラーになります
   - テストができません

3. **Vercel Blob Storageの利点**
   - ✅ ファイルを永続的に保存できる
   - ✅ CDN経由で高速配信される
   - ✅ 無料プランでも使用可能（制限あり）
   - ✅ 実装が比較的簡単

## 🚀 実装手順

### 1. パッケージのインストール

```bash
npm install @vercel/blob
```

### 2. Vercel Dashboardで環境変数を設定

1. Vercel Dashboard → プロジェクト → Settings → Environment Variables
2. 新しい環境変数を追加：
   - **Name**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: （自動生成されるので、後で設定）
   - **Environment**: Production, Preview, Development すべてに適用

**注意**: トークンは後で自動生成されます。まずはダミー値を設定しておいても構いません。

### 3. Serverless Functionsの更新

#### `api/projects/[id]/save.js` の更新

```javascript
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  // ... 既存のコード ...

  try {
    const { id: rawId } = req.query;
    const id = sanitizeId(rawId);
    const projectData = parsed.projectData || parsed;

    // Vercel Blob Storageに保存
    const blob = await put(
      `projects/${id}/project.json`,
      JSON.stringify(projectData, null, 2),
      {
        access: 'public',
        contentType: 'application/json',
      }
    );

    return res.status(200).json({
      success: true,
      url: blob.url, // Blob StorageのURLを返す
    });
  } catch (error) {
    // ... エラーハンドリング ...
  }
}
```

#### `api/publish-project.js` の更新

```javascript
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  // ... 既存のコード ...

  try {
    // ... 既存のモデル処理 ...

    // project.jsonをBlob Storageに保存
    const projectJsonBlob = await put(
      `projects/${id}/project.json`,
      JSON.stringify(projectJson, null, 2),
      {
        access: 'public',
        contentType: 'application/json',
      }
    );

    // モデルファイルもBlob Storageに保存
    const modelBlobs = [];
    for (const m of models) {
      // ... 既存の処理 ...
      const blob = await put(
        `projects/${id}/${fileName}`,
        buf,
        {
          access: 'public',
          contentType: 'model/gltf-binary',
        }
      );
      modelBlobs.push({ url: blob.url, fileName, fileSize: buf.length });
    }

    // ロゴ画像も保存
    if (lsOut && lsOut.logoImage) {
      // ... 既存の処理 ...
      const logoBlob = await put(
        `projects/${id}/assets/${logoName}`,
        buf,
        {
          access: 'public',
          contentType: mime,
        }
      );
      lsOut.logo = logoBlob.url;
    }

    // URLの生成（Blob StorageのURLを使用）
    const baseUrl = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const scheme = req.headers['x-forwarded-proto'] || 'https';
    const viewerUrl = `${scheme}://${baseUrl}/#/viewer?src=${encodeURIComponent(projectJsonBlob.url)}`;

    return res.status(200).json({
      ok: true,
      viewerUrl,
      projectUrl: projectJsonBlob.url,
    });
  } catch (error) {
    // ... エラーハンドリング ...
  }
}
```

### 4. 静的ファイル配信の設定（オプション）

Blob StorageのURLはCDN経由で直接アクセス可能なので、特別な設定は不要です。ただし、クライアント側のコードで相対パス（`/projects/${id}/project.json`）を使用している場合は、Blob StorageのURLに変換する必要があります。

## 💰 無料プランの制限

Vercel Blob Storageの無料プランには以下の制限があります：

- **ストレージ容量**: 1GB
- **転送量**: 100GB/月
- **読み取り/書き込み**: 制限なし（レート制限あり）

**テスト用途であれば、十分に使えます。**

## 🔄 移行の考慮事項

### クライアント側のコード変更

現在、クライアント側のコードでは相対パス（`/projects/${id}/project.json`）を使用しています。Blob Storageを使用する場合、以下の選択肢があります：

1. **Blob StorageのURLを直接使用**（推奨）
   - APIレスポンスから返されるBlob StorageのURLをそのまま使用
   - クライアント側のコード変更が最小限

2. **プロキシ経由でアクセス**
   - Serverless Functionでプロキシを作成
   - 相対パスのまま使用可能
   - ただし、パフォーマンスが若干劣る

### ローカル開発時の対応

ローカル開発時には、Vercel Blob Storageは使用せず、既存のViteプラグインを使用します。環境変数で切り替えることができます：

```javascript
// api/projects/[id]/save.js
const useBlobStorage = process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN;

if (useBlobStorage) {
  // Blob Storageを使用
} else {
  // 既存の/tmp保存（ローカル開発時）
}
```

## 📚 参考リンク

- [Vercel Blob Storage Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Vercel Blob Storage Pricing](https://vercel.com/docs/storage/vercel-blob/pricing)

## 🎯 実装の優先順位

1. **まずは実装してみる**（推奨）
   - 無料プランで十分にテスト可能
   - 実装は比較的簡単
   - QRコードのテストができるようになる

2. **完成まで待つ**
   - QRコードのテストができない
   - スマホでの動作確認ができない
   - 開発効率が下がる

3. **他のレンタルサーバーを使用**
   - Render、Railway、Fly.ioなど
   - 設定が複雑になる可能性
   - Vercelの利点（CDN、自動デプロイなど）を失う

**結論: Vercel Blob Storageの実装を推奨します。**

## 📦 アップロードサイズ上限（現行）

`api/publish-project.js` で運用している上限。Vercel Serverless Functions のリクエストボディ上限と、Base64 化に伴う約 33% のオーバーヘッドから決定している。

| 区分 | 上限 | 定数 |
|---|---|---|
| 本番/Preview のリクエストボディ全体 | 4 MB | `MAX_VERCEL_BODY_BYTES` |
| 1 ファイル（GLB）あたり | 3 MB | `MAX_BLOB_MODEL_BYTES` |
| 1 リクエスト合計 | 3 MB | `MAX_BLOB_TOTAL_BYTES` |
| ローカル開発 (vercel dev) 1 ファイル | 50 MB | `MAX_LOCAL_MODEL_BYTES` |
| ローカル開発 1 リクエスト合計 | 100 MB | `MAX_LOCAL_TOTAL_BYTES` |

超過時は HTTP 413 を返す。クライアントには「現在の本番公開は小容量モデルのみ対応。大きい GLB は client upload 対応後に公開してください」というメッセージが表示される。

## ⏩ Direct upload への移行（次の作業）

クライアントワークで一般的な数 MB〜数十 MB の GLB を公開できるようにするには、`@vercel/blob/client` の direct upload に切り替える必要がある。サーバー経由の Base64 アップロードを完全に置き換えるのではなく、サイズに応じて経路を分けるのが現実解。

### 移行アウトライン

1. **クライアントワークの GLB 上限を決める**（例: 25 MB）。MindAR / マーカー検出での実用性とロード時間を元に確定する。
2. **判定ロジック**: クライアント側で blob のサイズを見て、上限を超えていれば direct upload、下回っていれば従来の `/api/publish-project` 経由。
3. **API 追加**: `api/blob-upload-token.js`（新設）が `handleUpload()` で署名済みトークンを発行する。
4. **クライアント実装**: `upload()` をクライアントから直接呼び、返却 URL を `publishRelease` のペイロードに含めて project.json に焼き込む。
5. **既存 `MAX_BLOB_MODEL_BYTES` の扱い**: direct upload 経由ではこの上限は使わない。サーバー API は project.json / 画像（数 MB 以下）専用に縮退させる。

公式ドキュメント: https://vercel.com/docs/storage/vercel-blob/client-upload

### 暫定運用

direct upload 実装までは、3 MB を超える GLB を含むプロジェクトは「公開」ボタンでエラー（HTTP 413）になる。`docs/single-operator-cloud-release-tasks.md` の Phase 3 にこの移行タスクが記載されている。

