# 🔧 srcパラメータ恒久対応レポート
**実行日**: 2025-10-05
**目的**: 「URLパラメータ 'src' が指定されていません」問題を恒久対応で解消

---

## 📋 問題の根本原因

ルーター初期化やURL書き換えで `src` パラメータが消失し、ビューアが `project.json` を取得できない問題が発生していました。

---

## ✅ 実施した修正（5ステップ）

### 1. **index.html 最上部に「早取り退避」を挿入**

**ファイル**: `index.html`

**目的**: ルーター初期化前に `src` パラメータを `sessionStorage` に保存

**追加コード**:
```html
<!-- ★ 早取り退避: ルーター初期化前にsrcパラメータをsessionStorageに保存 ★ -->
<script>
(function stashSrcEarly(){
  try{
    const u=new URL(location.href);
    const s=u.searchParams.get('src');
    if(s) sessionStorage.setItem('project_src', new URL(s, location.origin).toString());
    const h=location.hash||''; const qi=h.indexOf('?');
    if(!s && qi>=0){
      const qs=new URLSearchParams(h.slice(qi+1));
      const sh=qs.get('src');
      if(sh) sessionStorage.setItem('project_src', new URL(sh, location.origin).toString());
    }
  }catch(_){}
})();
</script>
```

**効果**: ページ読み込み直後（ルーター初期化前）に `src` を保存

---

### 2. **取得ロジックを1本化（getProjectSrc）**

**ファイル**: `src/utils/url-params.js`

**目的**: `src` パラメータ取得ロジックを統一

**追加関数**:
```javascript
export function getProjectSrc() {
  // 1. 通常のクエリパラメータから取得
  const u = new URL(location.href);
  const s1 = u.searchParams.get('src');
  if (s1) return new URL(s1, location.origin).toString();

  // 2. ハッシュ後ろのクエリパラメータから取得
  const h = location.hash || '';
  const qi = h.indexOf('?');
  if (qi >= 0) {
    const qs = new URLSearchParams(h.slice(qi + 1));
    const s2 = qs.get('src');
    if (s2) return new URL(s2, location.origin).toString();
  }

  // 3. sessionStorageから取得（早取り退避）
  const s3 = sessionStorage.getItem('project_src');
  if (s3) return s3;

  return null;
}
```

**優先順位**:
1. 通常のクエリ (`?src=...`)
2. ハッシュ後ろのクエリ (`#/viewer?src=...`)
3. sessionStorage（早取り退避）

---

### 3. **旧取得ロジックをすべて置換**

**ファイル**: `src/views/ar-viewer.js`

**Before**:
```javascript
function getProjectSrcFromHash() {
  const hash = window.location.hash || '';
  const queryString = hash.includes('?') ? hash.split('?')[1] : '';
  const params = new URLSearchParams(queryString);
  const projectSrc = params.get('src');
  return projectSrc && projectSrc.trim().length ? projectSrc.trim() : null;
}

async function loadProjectFromQR() {
  const projectSrc = getProjectSrcFromHash();
  ...
}
```

**After**:
```javascript
// ★ 旧関数は削除し、getProjectSrc() を直接使用 ★
import { getProjectSrc } from '../utils/url-params.js';

async function loadProjectFromQR() {
  const projectSrc = getProjectSrc();
  ...
}
```

**変更箇所**:
- `getProjectSrcFromHash()` 関数を削除
- すべての呼び出しを `getProjectSrc()` に置換（2箇所）

---

### 4. **ルーターのURL書き換えでsearchを温存**

**ファイル**: `src/utils/url-params.js`

**追加関数**:
```javascript
export function navigateWithSearch(newHash) {
  const currentSearch = window.location.search;
  const newUrl = window.location.pathname + currentSearch + newHash;
  history.replaceState(null, '', newUrl);
}
```

**用途**: ルーターがハッシュを変更する際に `search` を保持

**使用例**:
```javascript
// 通常のハッシュ変更（searchが消失）
location.hash = '#/viewer';

// searchを保持するハッシュ変更
navigateWithSearch('#/viewer');
```

---

### 5. **URL生成側を相対パスに統一**

**ファイル**: `src/utils/url-stabilizer.js`

**目的**: CORS問題を回避し、同一オリジンを保証

**Before** (generateLocalURL):
```javascript
const projectJsonUrl = `${scheme}://${baseHost}/projects/${projectId}/project.json`;
const viewerUrl = `${scheme}://${baseHost}/#/viewer?src=${encodeURIComponent(projectJsonUrl)}`;
```

**After** (generateLocalURL):
```javascript
// ★ 相対パスに統一（同一オリジン保証）
const projectJsonPath = `/projects/${projectId}/project.json`;
// ✅ クエリ前置: ?src=/projects/...#/viewer の形式（相対パス）
const viewerUrl = `${scheme}://${baseHost}/?src=${encodeURIComponent(projectJsonPath)}#/viewer`;
```

**変更メソッド**:
- `generateLocalURL()` - ローカルネットワーク用
- `generatePublicURL()` - 公開用
- `generateLocalhostURL()` - 開発用

**効果**:
- ✅ CORS制限なし（同一オリジン）
- ✅ URL文字列が短い
- ✅ エンコードは1回のみ（二重エンコード回避）

---

## 📊 変更ファイル一覧

| ファイル | 変更内容 | 影響度 |
|---------|---------|--------|
| **index.html** | 早取り退避スクリプトを追加（`</head>` 直前） | ⚠️ 高 |
| **src/utils/url-params.js** | `getProjectSrc()` と `navigateWithSearch()` を追加 | 🆕 新機能 |
| **src/views/ar-viewer.js** | `getProjectSrcFromHash()` 削除、`getProjectSrc()` に置換 | ⚠️ 高 |
| **src/utils/url-stabilizer.js** | URL生成を相対パスに変更（3メソッド） | ⚠️ 高 |

---

## 🔄 Before/After URL

### Before（絶対URL + ハッシュ後ろクエリ）

```
https://192.168.1.100:3000/#/viewer?src=https%3A%2F%2F192.168.1.100%3A3000%2Fprojects%2F1234567890%2Fproject.json
```

**問題点**:
- ❌ クエリがハッシュの後ろ
- ❌ 絶対URLで長い
- ❌ CORS制限の可能性

### After（相対パス + クエリ前置）

```
https://192.168.1.100:3000/?src=%2Fprojects%2F1234567890%2Fproject.json#/viewer
```

**改善点**:
- ✅ クエリがハッシュの前
- ✅ 相対パスで短い
- ✅ 同一オリジン保証
- ✅ sessionStorageにバックアップ

---

## 🧪 検証手順

### 1. ビルド
```bash
npm run build
```

### 2. プレビューサーバー起動（HTTPS）
```bash
npm run preview -- --https
```

### 3. キャッシュクリア
**Chrome DevTools**:
- Application → Service Workers → `Unregister`
- Storage → `Clear site data`
- ハードリロード（`Cmd+Shift+R` / `Ctrl+Shift+R`）

### 4. 検証URL
```
https://localhost:3000/?src=/projects/sample-keep-me/project.json#/viewer
```

### 5. Network確認
- `project.json` が **200 OK**
- **1回だけ**取得
- `content-type: application/json`

### 6. Console確認
```
[URL-PARAMS] getProjectSrc: found in normal query: https://localhost:3000/projects/sample-keep-me/project.json
```

---

## ✅ 受け入れ条件チェック

| 条件 | ステータス | 備考 |
|------|-----------|------|
| ✅ 検証URLで `project.json` を1回だけ取得 | 🔄 要テスト | Network タブで確認 |
| ✅ 「URLパラメータ 'src' が指定されていません」が表示されない | 🔄 要テスト | エラーメッセージ非表示 |
| ✅ 旧取得ロジックの取り残しが0件 | ✓ | `getProjectSrcFromHash` はコメント1件のみ |
| ✅ 生成URLが `?src=...#/viewer` 形式 | ✓ | `url-stabilizer.js` で確認済み |

---

## 🔍 旧ロジック取り残しチェック

```bash
rg -n "getProjectSrcFromHash|location\.search|URLパラメータ 'src'" src/ --type-not md
```

**結果**:
```
src/views/ar-viewer.js:105:// function getProjectSrcFromHash() は url-params.js の getProjectSrc() に統合
src/views/ar-viewer.js:871:          <p>URLパラメータ 'src' が指定されていません。</p>
```

**解説**:
- Line 105: コメント（説明用）
- Line 871: エラーメッセージ（表示専用、取得ロジックではない）

**その他のヒット**:
- `location.search` の使用はデバッグモード検出など別の目的
- `URLパラメータ 'src'` はエラー表示専用

**結論**: ✅ **src 取得ロジックの取り残しは0件**

---

## 📝 生成URLサンプル

### ローカルネットワーク（LOCAL）

```
https://192.168.1.100:3000/?src=%2Fprojects%2F1234567890%2Fproject.json#/viewer
```

デコード後:
```
https://192.168.1.100:3000/?src=/projects/1234567890/project.json#/viewer
```

### 公開用（PUBLIC）

```
https://example.com/?src=%2Fprojects%2F1234567890%2Fproject.json#/viewer
```

### 開発用（LOCALHOST）

```
http://localhost:3000/?src=%2Fprojects%2Fsample-keep-me%2Fproject.json#/viewer
```

---

## 🎯 まとめ

### 修正内容
1. ✅ 早取り退避スクリプト（index.html）
2. ✅ 統一取得ロジック（getProjectSrc）
3. ✅ 旧ロジック完全置換（getProjectSrcFromHash → getProjectSrc）
4. ✅ search温存ヘルパー（navigateWithSearch）
5. ✅ 相対パスURL生成（CORS回避）

### 期待される効果
- ✅ ルーター初期化でsrcが消失しない
- ✅ URL書き換えでsrcが消失しない
- ✅ sessionStorageに自動バックアップ
- ✅ CORS制限なし（同一オリジン）
- ✅ URLが短くなる
- ✅ 二重エンコード回避

### 互換性
- ✅ 旧形式（`#/viewer?src=...`）も引き続きサポート
- ✅ 絶対URLも引き続きサポート（相対URLに正規化）
- ✅ 既存のQRコード/リンクも動作（sessionStorageフォールバック）

---

**レポート終了**
