# Firebase Storage セキュリティルール設定

## 問題

Firebase Storageに保存されたproject.jsonにアクセスすると、JSONではなくHTMLが返される。

```
❌ JSON解析エラー: SyntaxError: JSON Parse error: Unrecognized token '<'
レスポンス(先頭): <!doctype html>
```

これは、Firebase Storageのセキュリティルールが認証を要求しているため、認証なしでアクセスするとエラーページ（HTML）が返されることが原因です。

## 解決方法

Firebase Consoleで、Storageのセキュリティルールを公開読み取り可能に変更します。

### 1. Firebase Consoleにアクセス

https://console.firebase.google.com/project/miruwebar/storage/miruwebar.firebasestorage.app/rules

### 2. 「ルール」タブを選択

Storage画面の上部にある「ルール」タブをクリック

### 3. セキュリティルールを編集

現在のルール（デフォルト）:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

これを以下のように変更:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // projects フォルダは誰でも読み書き可能（開発環境用）
    match /projects/{allPaths=**} {
      allow read: if true;   // 誰でも読み取り可能
      allow write: if true;  // 誰でも書き込み可能（開発環境）
    }

    // その他のファイルは認証必須
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**注意**: `allow write: if true` は開発環境用の設定です。本番環境では以下のように制限することを推奨します:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // projects フォルダ
    match /projects/{allPaths=**} {
      allow read: if true;  // 誰でも読み取り可能
      allow write: if request.resource.size < 50 * 1024 * 1024  // 50MB以下
                   && (request.resource.contentType.matches('model/gltf-binary')
                       || request.resource.contentType.matches('image/.*')
                       || request.resource.contentType.matches('application/json')
                       || request.resource.contentType.matches('text/plain'));
    }
  }
}
```

### 4. 「公開」ボタンをクリック

ルールを保存して公開します。

## セキュリティルールの説明

- `allow read: if true` - 誰でも読み取り可能（認証不要）
- `allow write: if false` - 直接の書き込みは不可（アプリのSDK経由でのみ書き込み可能）
- `match /projects/{allPaths=**}` - projectsフォルダ配下のすべてのファイルに適用

## 動作確認

ルール公開後、スマホでARビューアにアクセスすると:
- ✅ HTTP 200 OK
- ✅ JSON解析成功
- ✅ スキーマ検証OK
- ✅ プロジェクト初期化完了

## より厳密なセキュリティ設定（オプション）

本番環境では、読み取り専用でもファイルタイプを制限することを推奨:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // projects フォルダは公開読み取り可能（JSONとモデルファイルのみ）
    match /projects/{projectId}/{allPaths=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

## トラブルシューティング

### ルールを変更してもエラーが続く場合

1. **キャッシュをクリア**: ブラウザのキャッシュとCookieを削除
2. **数分待つ**: ルールの反映には最大5分かかる場合があります
3. **URLを確認**: project.jsonのURLが正しいか確認
4. **ブラウザで直接アクセス**: project.jsonのURLをブラウザで開いて、JSONが表示されるか確認

### ルールのテスト

Firebase Consoleの「ルール」タブには「ルールのシミュレーター」があり、特定のパスへのアクセスをテストできます。

例:
- ファイルパス: `projects/project_123456/project.json`
- 操作: `read`
- 認証: なし

これが「許可」と表示されればOKです。
