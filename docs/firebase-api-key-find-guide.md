# Firebase APIキーの見つけ方ガイド

## 🔍 APIキーが見つからない場合の対処法

### 方法1: Firebase Consoleから直接確認（最も簡単）

1. **Firebase Consoleにアクセス**
   ```
   https://console.firebase.google.com/
   ```

2. **プロジェクトを選択**
   - プロジェクト「miruwebar」を選択

3. **プロジェクトの設定を開く**
   - 左メニューの「⚙️ プロジェクトの設定」（歯車アイコン）をクリック
   - または、画面上部のプロジェクト名の横にある「⚙️」アイコンをクリック

4. **全般タブで確認**
   - 「全般」タブが選択されていることを確認
   - ページを下にスクロール
   - 「マイアプリ」セクションまたは「SDKの設定とスニペット」セクションを探す

5. **Webアプリの設定を確認**
   - Webアプリ（</>アイコン）をクリック
   - または、「構成」ボタンをクリック
   - 表示される設定の中に `apiKey: "AIzaSy..."` が含まれています

6. **APIキーをコピー**
   - `apiKey` の値をコピー
   - 公開されたAPIキー（`AIzaSyCo3JPf7ohXf09fyLwwAXKfv-waV-GG3qE`）と一致するか確認

---

### 方法2: Google Cloud Consoleで検索

1. **Google Cloud Consoleにアクセス**
   ```
   https://console.cloud.google.com/
   ```

2. **プロジェクトを選択**
   - 画面上部のプロジェクト選択ドロップダウンをクリック
   - 「miruwebar」を選択
   - または、直接URLに含める：
   ```
   https://console.cloud.google.com/apis/credentials?project=miruwebar
   ```

3. **認証情報ページを開く**
   - 左メニューから「APIとサービス」→「認証情報」をクリック
   - または、上記の直接URLを使用

4. **APIキーを検索**
   - ページに「APIキー」というセクションがあることを確認
   - 検索ボックスに `AIzaSyCo3JPf7ohXf09fyLwwAXKfv-waV-GG3qE` の一部（例：`AIzaSyCo3JP`）を入力
   - または、すべてのAPIキーを表示して確認

5. **見つからない場合**
   - プロジェクトが正しく選択されているか確認
   - 別のGoogleアカウントでログインしていないか確認
   - 「すべての認証情報を表示」をクリック

---

### 方法3: ブラウザの開発者ツールで確認（一時的な方法）

もしFirebaseアプリが動作している場合：

1. **ブラウザの開発者ツールを開く**
   - Chrome/Edge: `F12` または `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Firefox: `F12` または `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)

2. **コンソールタブを開く**

3. **以下のコードを実行**
   ```javascript
   // Firebase設定を確認
   console.log(firebase.app().options);
   ```
   または
   ```javascript
   // 環境変数から確認（Viteの場合）
   console.log(import.meta.env.VITE_FIREBASE_API_KEY);
   ```

---

### 方法4: プロジェクトファイルから確認（開発環境）

ローカルの `.env` ファイルを確認：

1. **プロジェクトルートで `.env` ファイルを開く**
   ```bash
   cat .env | grep FIREBASE_API_KEY
   ```

2. **または、エディタで開く**
   - `.env` ファイルを開く
   - `VITE_FIREBASE_API_KEY=` の行を確認

**注意**: `.env` ファイルが存在しない場合は、`env.example` をコピーして作成してください。

---

## 🚨 それでも見つからない場合

### 確認事項

1. **正しいプロジェクトにアクセスしているか**
   - Firebase Consoleでプロジェクト一覧を確認
   - 「miruwebar」という名前のプロジェクトが存在するか確認

2. **正しいGoogleアカウントでログインしているか**
   - Firebase Consoleの右上でアカウントを確認
   - プロジェクトの所有者または編集者権限があるか確認

3. **プロジェクトが削除されていないか**
   - Firebase Consoleでプロジェクト一覧を確認
   - プロジェクトが存在しない場合は、新規作成が必要

4. **APIキーが既に削除されている可能性**
   - Google Cloud Consoleで「削除された認証情報」を確認
   - 削除されている場合は、新しいAPIキーを生成する必要があります

---

## 📝 新しいAPIキーを生成する方法

既存のAPIキーが見つからない、または削除された場合：

1. **Google Cloud Consoleにアクセス**
   ```
   https://console.cloud.google.com/apis/credentials?project=miruwebar
   ```

2. **認証情報を作成**
   - 「認証情報を作成」ボタンをクリック
   - 「APIキー」を選択

3. **新しいAPIキーが生成される**
   - 生成されたAPIキーをコピー

4. **すぐに制限を設定**
   - 生成されたAPIキーをクリック
   - 「アプリケーションの制限」と「APIの制限」を設定（詳細は `firebase-api-key-security.md` を参照）

5. **環境変数を更新**
   - `.env` ファイルの `VITE_FIREBASE_API_KEY` を新しいAPIキーに更新

---

## 🔗 参考リンク

- [Firebase Console](https://console.firebase.google.com/)
- [Google Cloud Console - 認証情報](https://console.cloud.google.com/apis/credentials)
- [Firebase プロジェクト設定](https://console.firebase.google.com/project/miruwebar/settings/general)

---

## 💡 ヒント

- Firebase Consoleの「プロジェクトの設定」→「全般」タブから、すべてのFirebase設定（APIキー、プロジェクトIDなど）を一度に確認できます
- Google Cloud ConsoleとFirebase Consoleは同じプロジェクトを参照していますが、UIが異なる場合があります
- APIキーは複数作成できます。古いAPIキーが見つからない場合は、新しいAPIキーを作成して使用することも可能です
