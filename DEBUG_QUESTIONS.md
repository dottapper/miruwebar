# デバッグ用質問リスト

以下の情報をコピペして回答してください。

---

## 1. QR コードで生成される URL の全体構造

**質問**: QR コードをスキャンした時に生成される URL の全体を教えてください。

**確認方法**:

1. QR コード生成画面で生成された URL をコピー
2. または、QR コードをスキャンした時のブラウザのアドレスバーを確認

**回答例**:

```
https://example.com/#/viewer?src=https://example.com/projects/1234567890/project.json
```

**確認ポイント**:

- [ ] URL のドメイン部分
- [ ] `#/viewer` の部分
- [ ] `?src=` パラメータの値（相対パスか絶対 URL か）
- [ ] その他のパラメータ（`?engine=`, `?debug=` など）

**実際の URL**:

```
（ここに実際のURLを貼り付けてください）
```

---

## 2. その URL にアクセスした時のブラウザのコンソールログ

**質問**: その URL にアクセスした時に、ブラウザの開発者ツール（F12）の Console タブに表示されるログをすべてコピーしてください。

**確認方法**:

1. ブラウザで `F12` または `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows) を押す
2. 「Console」タブを開く
3. ページをリロード（`F5` または `Cmd+R`）
4. 表示されたログをすべてコピー

**特に確認したいエラー**:

- [ ] 赤いエラーメッセージ（`❌`, `ERROR`, `Error` など）
- [ ] `getProjectSrc` 関連のログ
- [ ] `[URL-PARAMS]` で始まるログ
- [ ] `[AR]` で始まるログ
- [ ] `[FLOW]` で始まるログ
- [ ] `fetch` や `CORS` 関連のエラー
- [ ] `404` や `500` などの HTTP エラー

**コンソールログ（すべて）**:

```
（ここにコンソールログを貼り付けてください）
```

---

## 3. ar-viewer.js の getProjectSrc()が返す値

**質問**: `getProjectSrc()` 関数が実際に返している値を確認してください。

**確認方法（ブラウザコンソールで実行）**:

```javascript
// 方法1: 直接関数を呼び出す
import { getProjectSrc } from "/src/utils/url-params.js";
console.log("getProjectSrc() =", getProjectSrc());

// 方法2: グローバル変数から確認（ar-viewer.jsが設定している場合）
console.log("window.__projectSrc =", window.__projectSrc);

// 方法3: sessionStorageから確認
console.log(
  "sessionStorage.project_src =",
  sessionStorage.getItem("project_src")
);

// 方法4: URLパラメータを直接確認
const url = new URL(window.location.href);
console.log('URL.searchParams.get("src") =', url.searchParams.get("src"));
console.log("URL.hash =", window.location.hash);
```

**回答例**:

```
getProjectSrc() = "https://example.com/projects/1234567890/project.json"
window.__projectSrc = "https://example.com/projects/1234567890/project.json"
sessionStorage.project_src = "https://example.com/projects/1234567890/project.json"
URL.searchParams.get("src") = "/projects/1234567890/project.json"
URL.hash = "#/viewer?src=/projects/1234567890/project.json"
```

**実際の値**:

```
getProjectSrc() = （ここに値を貼り付けてください）
window.__projectSrc = （ここに値を貼り付けてください）
sessionStorage.project_src = （ここに値を貼り付けてください）
URL.searchParams.get("src") = （ここに値を貼り付けてください）
URL.hash = （ここに値を貼り付けてください）
```

---

## 4. AR 表示モードの選択状態

**質問**: プロジェクトが「マーカーあり」か「マーカーなし」かを判定する情報がどこに保存されているか確認してください。

**確認方法**:

### 4-1. project.json ファイルの内容を確認

**確認ポイント**:

- [ ] `project.json` ファイルの `type` プロパティ
- [ ] `project.json` ファイルの `mode` プロパティ（存在する場合）
- [ ] `project.json` ファイルの `guide.mode` プロパティ（存在する場合）

**ブラウザコンソールで確認**:

```javascript
// project.jsonを取得して確認
const projectSrc = getProjectSrc(); // または実際のURL
fetch(projectSrc)
  .then((r) => r.json())
  .then((data) => {
    console.log("project.type =", data.type);
    console.log("project.mode =", data.mode);
    console.log("project.guide =", data.guide);
    console.log("project.guide?.mode =", data.guide?.mode);
    console.log("project.markerImageUrl =", data.markerImageUrl);
    console.log("project.markerPattern =", data.markerPattern);
    console.log("全体:", JSON.stringify(data, null, 2));
  });
```

**回答例**:

```json
{
  "version": "1.0.0",
  "type": "marker",
  "guide": {
    "mode": "marker"
  },
  "markerImageUrl": "/assets/marker.png",
  ...
}
```

**実際の project.json の内容**:

```json
（ここにproject.jsonの内容を貼り付けてください）
```

### 4-2. エディターで選択した状態を確認

**確認ポイント**:

- [ ] エディター画面で「マーカーあり」/「マーカーなし」のどちらが選択されているか
- [ ] その選択が `project.json` に正しく保存されているか

**確認方法**:

1. エディター画面（`#/editor`）を開く
2. AR タイプ選択ボタンの状態を確認
3. プロジェクトを保存
4. 保存後の `project.json` を確認

**エディターでの選択状態**:

```
（例: 「マーカーあり」が選択されている / 「マーカーなし」が選択されている）
```

---

## 5. 追加確認事項（オプション）

### 5-1. ネットワークタブでの確認

**質問**: 開発者ツールの「Network」タブで、`project.json` の取得状況を確認してください。

**確認方法**:

1. 開発者ツール（F12）を開く
2. 「Network」タブを開く
3. ページをリロード
4. `project.json` でフィルタリング
5. リクエストの詳細を確認

**確認ポイント**:

- [ ] `project.json` へのリクエストが送信されているか
- [ ] HTTP ステータスコード（200, 404, 500 など）
- [ ] レスポンスの内容
- [ ] CORS エラーが発生していないか

**Network タブの情報**:

```
（リクエストURL、ステータスコード、レスポンス内容を貼り付けてください）
```

### 5-2. 診断パネルの確認

**質問**: ページ下部に表示される診断パネル（`[diag]`）の内容を確認してください。

**確認方法**:

1. ページ下部に緑色のテキストボックスが表示されているか確認
2. その内容をコピー

**診断パネルの内容**:

```
（ここに診断パネルの内容を貼り付けてください）
```

### 5-3. デバッグモードでの確認

**質問**: URL に `?debug=diag` パラメータを追加してアクセスした時のログを確認してください。

**確認方法**:

1. URL の末尾に `?debug=diag` を追加
   - 例: `https://example.com/#/viewer?src=...&debug=diag`
2. ページをリロード
3. コンソールログと診断パネルの内容を確認

**デバッグモードでのログ**:

```
（ここにログを貼り付けてください）
```

---

## 回答テンプレート

以下のテンプレートに回答を記入してください：

```markdown
## 1. QR コードで生成される URL

（回答をここに記入）

## 2. ブラウザのコンソールログ

（回答をここに記入）

## 3. getProjectSrc()が返す値

（回答をここに記入）

## 4. AR 表示モードの選択状態

### 4-1. project.json の内容

（回答をここに記入）

### 4-2. エディターでの選択状態

（回答をここに記入）

## 5. 追加確認事項（該当する場合）

（回答をここに記入）
```

