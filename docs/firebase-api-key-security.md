# Firebase APIキー セキュリティ設定ガイド

## 🔒 公開されたAPIキーの対応方法

GitHubに公開されてしまったFirebase APIキー（`AIzaSyCo3JPf7ohXf09fyLwwAXKfv-waV-GG3qE`）のセキュリティ対策手順です。

## 方法1: APIキーに制限を設定（推奨）

APIキーを無効化せずに、使用を制限する方法です。既存のアプリケーションへの影響を最小限に抑えられます。

### 手順

#### ステップ1: Firebase ConsoleからAPIキーを確認

1. **Firebase Consoleにアクセス**
   - https://console.firebase.google.com/ にアクセス
   - プロジェクト「miruwebar」を選択

2. **プロジェクトの設定を開く**
   - 左メニューの「⚙️ プロジェクトの設定」（歯車アイコン）をクリック
   - または、プロジェクト名の横にある「⚙️」アイコンをクリック

3. **全般タブでAPIキーを確認**
   - 「全般」タブが開いていることを確認
   - 下にスクロールして「マイアプリ」セクションを探す
   - Webアプリ（</>アイコン）をクリック
   - または、「SDKの設定とスニペット」セクションで「構成」を選択
   - ここにAPIキー（`apiKey`）が表示されます

#### ステップ2: Google Cloud ConsoleでAPIキーを編集

4. **Google Cloud Consoleに移動**
   - Firebase Consoleの「プロジェクトの設定」ページで、「Google Cloud Consoleで開く」リンクをクリック
   - または直接 https://console.cloud.google.com/apis/credentials?project=miruwebar にアクセス
   - プロジェクトが「miruwebar」に設定されていることを確認（上部のプロジェクト選択で確認）

5. **APIキーを検索**
   - 「認証情報」ページで、検索ボックスに公開されたAPIキー（`AIzaSyCo3JPf7ohXf09fyLwwAXKfv-waV-GG3qE`）の一部を入力
   - または、「APIキー」のセクションを確認
   - 該当するAPIキーをクリックして編集画面を開く

   **見つからない場合の対処法:**
   - プロジェクトが正しく選択されているか確認
   - 「APIキー」のセクションを展開して確認
   - すべての認証情報を表示する（フィルターを解除）

4. **アプリケーションの制限を設定**
   - 「アプリケーションの制限」セクションで「HTTPリファラー（ウェブサイト）」を選択
   - 「ウェブサイトの制限」に許可するドメインを追加：
     ```
     localhost:*
     127.0.0.1:*
     your-production-domain.com/*
     ```
   - または「なし」のままにしておく（開発環境での使用を許可）

5. **APIの制限を設定**
   - 「APIの制限」セクションで「キーを制限」を選択
   - 使用するAPIのみを選択：
     - Firebase Storage API
     - Firebase Realtime Database API（使用している場合）
     - その他、実際に使用しているFirebase APIのみ

6. **保存**
   - 「保存」ボタンをクリック
   - 変更が反映されるまで数分かかる場合があります

### メリット
- ✅ 既存のアプリケーションが引き続き動作
- ✅ 不正な使用を制限できる
- ✅ APIキーを無効化する必要がない

### デメリット
- ⚠️ 完全な無効化ではないため、制限を回避される可能性がある

---

## 方法2: APIキーを無効化（最も安全）

APIキーを完全に無効化し、新しいAPIキーを生成する方法です。最も安全ですが、既存のアプリケーションに影響があります。

### 手順

1. **Firebase Consoleにアクセス**
   - https://console.firebase.google.com/ にアクセス
   - プロジェクト「miruwebar」を選択

2. **Google Cloud Consoleに移動**
   - Firebase Consoleの左メニューから「⚙️ プロジェクトの設定」をクリック
   - または直接 https://console.cloud.google.com/apis/credentials?project=miruwebar にアクセス

3. **APIキーを無効化**
   - 「認証情報」ページで、公開されたAPIキー（`AIzaSyCo3JPf7ohXf09fyLwwAXKfv-waV-GG3qE`）を探す
   - 該当するAPIキーをクリック
   - 「キーを削除」または「キーを無効にする」をクリック
   - 確認ダイアログで「削除」または「無効化」を確認

4. **新しいAPIキーを生成（必要に応じて）**
   - 「認証情報を作成」→「APIキー」をクリック
   - 新しいAPIキーが生成される
   - すぐに制限を設定する（方法1の手順4-5を参照）

5. **環境変数を更新**
   - `.env`ファイルの`VITE_FIREBASE_API_KEY`を新しいAPIキーに更新
   - アプリケーションを再起動

### メリット
- ✅ 最も安全（完全に無効化）
- ✅ 悪用される可能性がゼロ

### デメリット
- ⚠️ 既存のアプリケーションが動作しなくなる
- ⚠️ 新しいAPIキーの設定が必要

---

## 方法3: Firebase Storageのセキュリティルールを強化

APIキーが漏洩しても、Firebase Storageのセキュリティルールで保護できます。

### 手順

1. **Firebase Consoleにアクセス**
   - https://console.firebase.google.com/ にアクセス
   - プロジェクト「miruwebar」を選択

2. **Storageのセキュリティルールを開く**
   - 左メニューから「Storage」を選択
   - 「ルール」タブをクリック

3. **セキュリティルールを確認・更新**
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       // 認証が必要な場合
       match /{allPaths=**} {
         allow read, write: if request.auth != null;
       }
       
       // または、特定のパスのみ許可
       match /projects/{projectId}/{allPaths=**} {
         allow read: if true; // 読み取りは許可
         allow write: if request.auth != null; // 書き込みは認証必須
       }
     }
   }
   ```

4. **ルールを公開**
   - 「公開」ボタンをクリック

### メリット
- ✅ APIキーが漏洩しても、データへの不正アクセスを防げる
- ✅ 細かいアクセス制御が可能

### デメリット
- ⚠️ APIキーの無効化や制限の代替にはならない
- ⚠️ 認証が必要な場合、アプリケーションの変更が必要

---

## 推奨される対応手順

### 即座に実施すべきこと（優先度：高）

1. ✅ **APIキーに制限を設定**（方法1）
   - HTTPリファラー制限を設定
   - APIの制限を設定
   - これにより、悪用される可能性を大幅に減らせます

2. ✅ **Firebase Storageのセキュリティルールを確認**
   - 現在のルールが適切か確認
   - 必要に応じて強化

### 中期的に実施すべきこと（優先度：中）

3. ⏳ **新しいAPIキーを生成して移行**（方法2）
   - 開発環境で新しいAPIキーをテスト
   - 本番環境に段階的に移行
   - 古いAPIキーを無効化

### 長期的に実施すべきこと（優先度：低）

4. 📋 **定期的なセキュリティ監査**
   - 定期的にAPIキーの使用状況を確認
   - 不要なAPIキーを削除
   - セキュリティルールを見直し

---

## 確認事項

### APIキーの使用状況を確認

1. Google Cloud Consoleで「APIとサービス」→「ダッシュボード」を開く
2. 各APIの使用状況を確認
3. 異常な使用がないか確認

### セキュリティログを確認

1. Google Cloud Consoleで「ログ」を開く
2. Firebase Storageのアクセスログを確認
3. 不正なアクセスがないか確認

---

## 参考リンク

- [Firebase Console](https://console.firebase.google.com/)
- [Google Cloud Console - 認証情報](https://console.cloud.google.com/apis/credentials)
- [Firebase Storage セキュリティルール](https://firebase.google.com/docs/storage/security)
- [APIキーの制限設定](https://cloud.google.com/docs/authentication/api-keys#restricting_apis)

---

## 注意事項

⚠️ **重要**: APIキーが公開された場合、以下のリスクがあります：

1. **不正な使用**: 悪意のあるユーザーがAPIキーを使用してFirebaseサービスにアクセス
2. **コスト増加**: 不正な使用により、Firebaseの使用量が増加し、コストが発生する可能性
3. **データ漏洩**: セキュリティルールが不適切な場合、データが漏洩する可能性

**必ず上記の対策を実施してください。**
