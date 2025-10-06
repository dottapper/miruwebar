# 🔍 診断パネル実行ガイド
**作成日**: 2025-10-05
**目的**: PCで「変化なし」が続く原因を特定する

---

## 📋 診断パネルとは

画面右下に表示される緑色のパネルで、以下の情報を自動収集・表示します：

- ✅ 現在のURL構造（href, search, hash）
- ✅ `src` パラメータの取得状況（raw/normalized）
- ✅ `project.json` の取得可否（HEAD/GET）
- ✅ JSONスキーマの検証結果
- ✅ CORS/同一オリジンの確認

---

## 🚀 実行手順

### ステップ1: キャッシュクリア（必須）

古いデータの影響を排除するため、以下の手順でキャッシュをクリアします。

#### Chrome / Edge の場合

1. **DevTools を開く**: `F12` または `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)

2. **Application タブを開く**

3. **Service Workers をクリア**:
   - 左メニュー → `Service Workers`
   - 表示されている Service Worker があれば `Unregister` をクリック

4. **Storage をクリア**:
   - 左メニュー → `Storage`
   - 右パネルで以下にチェック:
     - ✅ Cache storage
     - ✅ Local and session storage
     - ✅ IndexedDB
   - `Clear site data` ボタンをクリック

5. **ハードリロード**:
   - `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows)
   - または DevTools が開いた状態でリロードボタンを長押し → `ハードリロード` を選択

#### Firefox の場合

1. **開発ツールを開く**: `F12`
2. **ストレージタブを開く**
3. 各項目を右クリック → `すべて削除`
4. `Cmd+Shift+R` / `Ctrl+Shift+R` でハードリロード

---

### ステップ2: サーバー起動

```bash
# HTTPSモードで起動（推奨）
npm run preview -- --https

# または開発モード
npm run dev
```

**重要**: AR機能を使用する場合はHTTPSが必要です。

---

### ステップ3: プロジェクト作成とURL生成

1. **エディターでプロジェクトを作成**:
   - ブラウザで `http://localhost:3000` または `https://localhost:3000` を開く
   - プロジェクトを作成し、レイアウト/ローディング/ガイドを設定
   - 保存する

2. **「PCで開く」ボタンをクリック**:
   - QRコード画面で「PCで開く」ボタンをクリック
   - 生成されたURLをコピー

3. **URLの形式を確認**:
   ```
   ✅ OK: https://localhost:3000/?src=https://localhost:3000/projects/1234567890/project.json#/viewer

   ❌ NG: https://localhost:3000/#/viewer?src=https://localhost:3000/projects/1234567890/project.json
   ```

---

### ステップ4: 診断パネルの確認

1. **コピーしたURLをPCブラウザで開く**

2. **診断パネルが表示されることを確認**:
   - 画面右下に緑色の枠のパネルが表示される
   - `[diag] running...` と表示された後、診断結果が順次表示される

3. **パネルが表示されない場合**:
   - DevTools → Console タブを開く
   - `[diag]` で始まるログを確認
   - エラーが表示されている場合はスクリーンショットを撮る

---

### ステップ5: 診断ログの収集

診断パネルに表示される情報をすべてコピーします。

#### 期待される出力例

```
[diag] running...
href= https://192.168.1.100:3000/?src=https%3A%2F%2F192.168.1.100%3A3000%2Fprojects%2F1234567890%2Fproject.json#/viewer
search= ?src=https%3A%2F%2F192.168.1.100%3A3000%2Fprojects%2F1234567890%2Fproject.json
hash= #/viewer
param.src(raw)= https://192.168.1.100:3000/projects/1234567890/project.json
param.src(normalized)= https://192.168.1.100:3000/projects/1234567890/project.json
sameOrigin= true origin= https://192.168.1.100:3000 self= https://192.168.1.100:3000
HEAD status= 200 OK
GET status= 200 OK content-type= application/json
body(first 300)=
{
  "version": "1.0",
  "screens": {
    "loading": {...},
    "guide": {...}
  },
  ...
json.keys= ["version","screens","theme","start","type","mode","marker",...]
schema OK (required fields present)
```

#### 診断ログのコピー方法

**方法1: パネルから直接コピー**
- パネル内のテキストをマウスでドラッグして選択
- `Cmd+C` / `Ctrl+C` でコピー

**方法2: Consoleからコピー**
- DevTools → Console タブ
- `[diag]` で始まるログをすべて選択
- 右クリック → `Save as...` でファイルに保存

---

### ステップ6: Network タブの確認

DevTools の Network タブで `project.json` のリクエストを確認します。

1. **Network タブを開く**:
   - DevTools → `Network` タブ

2. **project.json を探す**:
   - フィルターに `project.json` と入力
   - 該当する行をクリック

3. **以下の情報を確認**:
   - **Status**: `200 OK` であることを確認
   - **Type**: `application/json` であることを確認
   - **Size**: ファイルサイズを確認
   - **Time**: レスポンス時間を確認

4. **Preview タブを開く**:
   - `project.json` の行をクリック
   - 右パネルの `Preview` タブを開く
   - JSONの内容を確認（先頭部分をコピー）

5. **Response タブも確認**:
   - 生のJSON文字列を確認
   - 文字化けやエラーメッセージがないか確認

---

### ステップ7: Console の確認

1. **Console タブを開く**

2. **赤いエラーを確認**:
   - エラーがある場合はすべてコピー
   - スクリーンショットも撮る

3. **警告（黄色）も確認**:
   - 関連する警告があればコピー

---

## 📤 提出物チェックリスト

診断結果として、以下の情報を収集してください：

- [ ] **診断ログ全文**（緑パネルの内容）
- [ ] **使用したURL**（完全なURL）
- [ ] **Network タブのスクリーンショット**
  - `project.json` の行が見える状態
  - Status, Type, Size が表示されている
- [ ] **project.json の Preview**（先頭100行程度）
- [ ] **Console のエラー**（赤いエラーがあれば全文）
- [ ] **画面のスクリーンショット**（診断パネルが表示されている状態）

---

## 🔍 診断結果の読み方

### ケース1: srcUrl が空

```
!! srcUrl が空。URL生成/ハッシュ位置を再確認
```

**原因**: URLのクエリパラメータが取得できていない

**対処**:
- URLの形式を確認（`?src=...#/viewer` の順序）
- `url-stabilizer.js` のURL生成を確認

---

### ケース2: sameOrigin が false

```
sameOrigin= false origin= https://example.com self= https://192.168.1.100:3000
```

**原因**: CORS制限により `project.json` が取得できない可能性

**対処**:
- URL生成を相対パス `/projects/<ID>/project.json` に変更
- または CORS ヘッダーを設定

---

### ケース3: HEAD/GET エラー

```
!! HEAD error= TypeError: Failed to fetch
!! GET error= TypeError: Failed to fetch
```

**原因**:
- ネットワークエラー
- CORS制限
- サーバーが起動していない

**対処**:
- サーバーが起動しているか確認
- ファイアウォールを確認
- ブラウザのセキュリティ設定を確認

---

### ケース4: スキーマ missing

```
!! schema missing= ["screens","theme"]
```

**原因**: `project.json` の必須フィールドが不足

**対処**:
- エディターで保存時のスキーマを確認
- データマイグレーションが必要か確認

---

### ケース5: JSON parse error

```
!! JSON parse error= SyntaxError: Unexpected token < in JSON at position 0
```

**原因**:
- `project.json` が HTML エラーページ（404/500）として返されている
- JSONが壊れている

**対処**:
- Network タブで実際のレスポンスを確認
- サーバーログを確認

---

## 🛠️ トラブルシューティング

### 診断パネルが表示されない

**症状**: 画面右下に緑のパネルが表示されない

**原因と対処**:

1. **ar-viewer.js が読み込まれていない**
   - Console で `[diag]` ログを検索
   - ログがなければ、ルーティングの問題

2. **JavaScript エラーで停止**
   - Console で赤いエラーを確認
   - エラーメッセージをコピーして報告

3. **URL のハッシュが `/viewer` でない**
   - URL を確認（`#/viewer` で終わっているか）
   - 他のページ（`#/editor` など）では診断パネルは表示されない

---

### パネルは表示されるが srcUrl が空

**症状**: `!! srcUrl が空` と表示される

**原因**: URL のクエリパラメータが取得できていない

**対処**:
1. URL の形式を確認:
   ```
   ✅ https://localhost:3000/?src=...#/viewer
   ❌ https://localhost:3000/#/viewer?src=...
   ```

2. `url-stabilizer.js` の修正を確認:
   - `viewerUrl` が `?src=...#/viewer` 形式で生成されているか

---

### project.json が 404

**症状**: `GET status= 404 Not Found`

**原因**: ファイルが存在しない、またはパスが間違っている

**対処**:
1. ファイルの存在確認:
   ```bash
   ls -la public/projects/<プロジェクトID>/project.json
   ```

2. パスの確認:
   - `src` パラメータのURLをブラウザで直接開いてみる

3. サーバー設定の確認:
   - `vite.config.js` や `server/app.js` のルーティング設定

---

## 📞 サポート

診断結果を報告する際は、以下のテンプレートを使用してください：

```markdown
## 診断結果レポート

### 環境
- OS: [macOS / Windows / Linux]
- ブラウザ: [Chrome 120 / Edge 120 / Firefox 121]
- サーバー起動コマンド: [npm run dev / npm run preview -- --https]

### 使用したURL
```
[完全なURLをコピペ]
```

### 診断ログ
```
[緑パネルの内容全文をコピペ]
```

### Network タブ
- Status: [200 / 404 / 500]
- Type: [application/json / text/html]
- Size: [12.3 KB]

### project.json Preview
```json
[先頭100行をコピペ]
```

### Console エラー
```
[赤いエラー全文をコピペ、なければ "なし"]
```

### スクリーンショット
[診断パネルとNetwork タブのスクリーンショットを添付]
```

---

**診断ガイド終了**
