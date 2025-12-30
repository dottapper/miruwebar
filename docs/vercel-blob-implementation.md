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
